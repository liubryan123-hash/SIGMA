"""
Motor OMR real — OpenCV.

Algoritmo:
  1. Cargar y normalizar orientación (maneja fotos de celular en portrait/landscape).
  2. Detectar los 4 marcadores de esquina (círculos negros rellenos).
  3. Corregir perspectiva → imagen canónica de tamaño fijo.
  4. Binarizar con threshold adaptativo (tolerante a iluminación desigual).
  5. Muestrear cada burbuja en posición conocida (de omr_constants).
  6. Determinar respuesta y nivel de confianza (Verde / Amarillo / Rojo).
  7. Leer el código/DNI del panel izquierdo.
"""

import cv2
import numpy as np
import json
import logging

from omr_constants import (
    PAGE_W,
    MARKER_R,
    MARKER_TL, MARKER_TR, MARKER_BL, MARKER_BR,
    GRID_X1, GRID_Y1, N_QUESTIONS, N_ROWS, N_OPTIONS,
    COL_W, ROW_H, BUBBLE_FIRST_X, BUBBLE_SPACING, BUBBLE_R,
    INFO_X1, CODE_DIGITS, CODE_Y1, CODE_DIGIT_W, CODE_BUBBLE_R, CODE_ROW_H,
    SCALE, CANON_W, CANON_H,
)

logger = logging.getLogger("OMR_Engine")

# Umbral de relleno para considerar una burbuja marcada
FILL_HIGH = 0.40   # > 40 % relleno → marcada con alta confianza (Verde)
FILL_LOW  = 0.25   # 25-40 % → marcada pero con duda (Amarillo)
# < 25 % → no marcada


# ─────────────────────────────────────────────────────────────────────
# Punto de entrada público
# ─────────────────────────────────────────────────────────────────────

def process_omr_image(image_path: str, template_config: str = "{}") -> dict:
    """
    Procesa una imagen de ficha OMR y retorna las respuestas detectadas.

    Returns dict con claves:
        respuestas_detectadas   — {"1": "A", "2": "C", ...}
        confianza_por_pregunta  — {"1": "Verde", "2": "Amarillo", ...}
        codigo_leido            — "20231042" (o parcial con "_" si falla algún dígito)
    """
    try:
        config = json.loads(template_config)
    except Exception:
        config = {}
    n_questions = int(config.get("n_questions", N_QUESTIONS))
    n_questions = max(1, min(n_questions, N_QUESTIONS))

    # 1. Cargar
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"No se pudo cargar la imagen: {image_path}")

    # 2. Reducir si es muy grande (fotos de 12 MP tardan demasiado)
    img = _downscale(img, max_dim=2800)

    # 3. Normalizar orientación (portrait → landscape)
    img = _ensure_landscape(img)

    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 4. Detectar marcadores de esquina
    corners = _find_corner_markers(img_gray)
    if corners is None:
        raise ValueError(
            "No se detectaron los 4 marcadores de esquina. "
            "Asegúrese de que la hoja esté completamente visible, "
            "bien iluminada y sin doblar."
        )

    # 5. Corrección de perspectiva
    img_canon = _perspective_correct(img_gray, corners)

    # 6. Binarizar
    img_bin = _binarize(img_canon)

    # 7. Detectar respuestas
    respuestas, confianza = _detect_answers(img_bin, n_questions)

    # 8. Leer código/DNI
    codigo = _detect_code(img_bin)

    logger.info(
        f"OMR OK — {len(respuestas)} preguntas procesadas, código='{codigo}'"
    )
    return {
        "respuestas_detectadas":  respuestas,
        "confianza_por_pregunta": confianza,
        "codigo_leido":           codigo,
    }


# ─────────────────────────────────────────────────────────────────────
# Preprocesamiento de imagen
# ─────────────────────────────────────────────────────────────────────

def _downscale(img: np.ndarray, max_dim: int) -> np.ndarray:
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    factor = max_dim / max(h, w)
    return cv2.resize(img, (int(w * factor), int(h * factor)),
                      interpolation=cv2.INTER_AREA)


def _ensure_landscape(img: np.ndarray) -> np.ndarray:
    """Si la imagen es más alta que ancha (portrait), rotar 90° CW."""
    h, w = img.shape[:2]
    if h > w:
        # Rotar 90° sentido horario
        return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    return img


# ─────────────────────────────────────────────────────────────────────
# Detección de marcadores de esquina
# ─────────────────────────────────────────────────────────────────────

def _find_corner_markers(img_gray: np.ndarray):
    """
    Detecta los 4 círculos negros rellenos de las esquinas.

    Retorna [(x_TL, y_TL), (x_TR, y_TR), (x_BL, y_BL), (x_BR, y_BR)]
    en píxeles de la imagen original, o None si falla.
    """
    h, w = img_gray.shape

    # Escala estimada de la imagen vs tamaño real de la hoja
    scale_est = w / PAGE_W   # px/mm
    r_px      = MARKER_R * scale_est
    area_min  = np.pi * (r_px * 0.40) ** 2
    area_max  = np.pi * (r_px * 2.20) ** 2

    blurred = cv2.GaussianBlur(img_gray, (5, 5), 0)

    # Intentar con Otsu primero, luego con threshold adaptativo si no alcanza
    candidates = _detect_blobs(blurred, area_min, area_max, method="otsu")
    if len(candidates) < 4:
        candidates = _detect_blobs(blurred, area_min, area_max, method="adaptive")

    if len(candidates) < 4:
        logger.warning(
            f"Solo {len(candidates)} marcador(es) detectado(s). "
            "Verifique iluminación y encuadre."
        )
        return None

    # Tomar los 4 contornos más grandes (probablemente son los marcadores)
    candidates.sort(key=lambda x: x[2], reverse=True)
    top4 = [(x, y) for x, y, _ in candidates[:4]]

    return _assign_corners(top4)


def _detect_blobs(blurred, area_min, area_max, method: str):
    """Binariza y encuentra contornos circulares del tamaño esperado."""
    if method == "otsu":
        _, binary = cv2.threshold(blurred, 0, 255,
                                  cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    else:
        binary = cv2.adaptiveThreshold(
            blurred, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV,
            31, 8
        )
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.dilate(binary, kernel, iterations=1)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL,
                                   cv2.CHAIN_APPROX_SIMPLE)
    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if not (area_min < area < area_max):
            continue
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter ** 2)
        if circularity < 0.55:
            continue
        M = cv2.moments(cnt)
        if M["m00"] == 0:
            continue
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        candidates.append((cx, cy, area))
    return candidates


def _assign_corners(points):
    """
    Dados 4 puntos, asigna TL / TR / BL / BR ordenando por Y (arriba/abajo)
    y luego por X (izquierda/derecha).
    """
    points_sorted = sorted(points, key=lambda p: p[1])
    top = sorted(points_sorted[:2], key=lambda p: p[0])
    bot = sorted(points_sorted[2:], key=lambda p: p[0])
    tl, tr = top
    bl, br = bot
    logger.info(f"Marcadores — TL:{tl} TR:{tr} BL:{bl} BR:{br}")
    return [tl, tr, bl, br]


# ─────────────────────────────────────────────────────────────────────
# Corrección de perspectiva
# ─────────────────────────────────────────────────────────────────────

def _perspective_correct(img_gray: np.ndarray, corners) -> np.ndarray:
    """
    Transforma la imagen a la vista canónica (CANON_W × CANON_H px)
    usando los 4 centros de marcadores como puntos de control.
    """
    tl, tr, bl, br = corners
    src = np.float32([tl, tr, bl, br])
    dst = np.float32([
        [MARKER_TL[0] * SCALE, MARKER_TL[1] * SCALE],
        [MARKER_TR[0] * SCALE, MARKER_TR[1] * SCALE],
        [MARKER_BL[0] * SCALE, MARKER_BL[1] * SCALE],
        [MARKER_BR[0] * SCALE, MARKER_BR[1] * SCALE],
    ])
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img_gray, M, (CANON_W, CANON_H),
                               flags=cv2.INTER_LINEAR)


# ─────────────────────────────────────────────────────────────────────
# Binarización
# ─────────────────────────────────────────────────────────────────────

def _binarize(img_gray: np.ndarray) -> np.ndarray:
    """
    Threshold adaptativo: robusto ante iluminación desigual de fotos de celular.
    Resultado: 255 = tinta/oscuro, 0 = papel/blanco.
    Tamaño de bloque ≈ 4 mm (suficiente para detectar burbujas de ~5 mm diámetro).
    """
    blurred = cv2.GaussianBlur(img_gray, (5, 5), 0)
    block_size = int(round(4.0 * SCALE))
    if block_size % 2 == 0:
        block_size += 1   # debe ser impar
    binary = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        block_size, 8
    )
    return binary


# ─────────────────────────────────────────────────────────────────────
# Muestreo de burbujas
# ─────────────────────────────────────────────────────────────────────

def _sample_bubble(img_bin: np.ndarray, cx_mm: float, cy_mm: float,
                   bubble_r_mm: float = BUBBLE_R) -> float:
    """
    Devuelve la fracción [0.0, 1.0] de píxeles oscuros dentro del círculo.
    Usa el 80 % del radio para evitar el borde impreso.
    """
    cx_px = int(round(cx_mm * SCALE))
    cy_px = int(round(cy_mm * SCALE))
    r_px  = int(round(bubble_r_mm * SCALE * 0.80))

    h, w = img_bin.shape
    if r_px < 1:
        return 0.0
    if cx_px - r_px < 0 or cy_px - r_px < 0 or \
       cx_px + r_px >= w or cy_px + r_px >= h:
        return 0.0

    # Máscara circular
    mask = np.zeros((2 * r_px + 1, 2 * r_px + 1), dtype=np.uint8)
    cv2.circle(mask, (r_px, r_px), r_px, 255, -1)

    roi = img_bin[cy_px - r_px: cy_px + r_px + 1,
                  cx_px - r_px: cx_px + r_px + 1]

    if roi.shape != mask.shape:
        return 0.0

    dark   = np.count_nonzero(cv2.bitwise_and(roi, mask))
    total  = np.count_nonzero(mask)
    return dark / total if total > 0 else 0.0


# ─────────────────────────────────────────────────────────────────────
# Detección de respuestas
# ─────────────────────────────────────────────────────────────────────

_OPTIONS = ['A', 'B', 'C', 'D', 'E']


def _detect_answers(img_bin: np.ndarray, n_questions: int):
    respuestas = {}
    confianza  = {}

    for q in range(1, n_questions + 1):
        col_idx  = (q - 1) // N_ROWS
        row_idx  = (q - 1) % N_ROWS
        col_x_mm = GRID_X1 + col_idx * COL_W
        row_cy   = GRID_Y1 + row_idx * ROW_H + ROW_H / 2

        ratios = [
            _sample_bubble(img_bin,
                           col_x_mm + BUBBLE_FIRST_X + i * BUBBLE_SPACING,
                           row_cy)
            for i in range(N_OPTIONS)
        ]

        marked = [i for i, r in enumerate(ratios) if r >= FILL_LOW]

        if len(marked) == 0:
            respuestas[str(q)] = ""
            # Si el máximo está muy bajo, probablemente en blanco deliberado
            confianza[str(q)] = "Rojo" if max(ratios) < 0.10 else "Amarillo"

        elif len(marked) == 1:
            idx = marked[0]
            respuestas[str(q)] = _OPTIONS[idx]
            confianza[str(q)]  = "Verde" if ratios[idx] >= FILL_HIGH else "Amarillo"

        else:
            # Múltiple marcado — devolver todas las marcadas separadas por coma
            respuestas[str(q)] = ",".join(_OPTIONS[i] for i in marked)
            confianza[str(q)]  = "Rojo"

    return respuestas, confianza


# ─────────────────────────────────────────────────────────────────────
# Detección de código / DNI
# ─────────────────────────────────────────────────────────────────────

def _detect_code(img_bin: np.ndarray) -> str:
    code = []
    for d in range(CODE_DIGITS):
        cx_mm     = INFO_X1 + d * CODE_DIGIT_W + CODE_DIGIT_W / 2
        best_digit = None
        best_ratio = 0.0

        for digit in range(10):
            cy_mm = CODE_Y1 + digit * CODE_ROW_H + CODE_ROW_H / 2
            ratio = _sample_bubble(img_bin, cx_mm, cy_mm,
                                   bubble_r_mm=CODE_BUBBLE_R)
            if ratio > best_ratio:
                best_ratio = ratio
                best_digit = digit

        if best_ratio >= FILL_LOW and best_digit is not None:
            code.append(str(best_digit))
        else:
            code.append("_")   # dígito no detectado

    result = "".join(code)
    if "_" in result:
        logger.warning(f"Código parcialmente detectado: {result}")
    return result
