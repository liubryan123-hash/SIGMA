#!/usr/bin/env python3
"""
Prueba sintética del motor OMR SIGMA.

Genera una imagen de ficha con respuestas conocidas y la pasa por el
pipeline completo (detección de marcadores → perspectiva → binarización →
muestreo de burbujas). No requiere impresora ni celular.

Uso:
    python omr_test_synthetic.py              # limpia + rotada 2°
    python omr_test_synthetic.py --warp 4     # rotación personalizada (grados)
    python omr_test_synthetic.py --save       # guarda las imágenes generadas
    python omr_test_synthetic.py --only clean # solo test limpio
    python omr_test_synthetic.py --only warp  # solo test rotado
"""

import sys
import os
import argparse
import tempfile

import numpy as np
import cv2

sys.path.insert(0, os.path.dirname(__file__))

from omr_constants import (
    CANON_W, CANON_H, SCALE,
    MARKER_R, MARKER_TL, MARKER_TR, MARKER_BL, MARKER_BR,
    GRID_X1, GRID_Y1, N_QUESTIONS, N_ROWS, N_OPTIONS,
    COL_W, ROW_H, BUBBLE_FIRST_X, BUBBLE_SPACING, BUBBLE_R,
    INFO_X1, CODE_DIGITS, CODE_Y1, CODE_DIGIT_W, CODE_BUBBLE_R, CODE_ROW_H,
)
from omr_engine import process_omr_image

OPTIONS = ['A', 'B', 'C', 'D', 'E']

# ── Patrón de respuestas conocidas ────────────────────────────────────────────
# Cíclico: 1→A, 2→B, 3→C, 4→D, 5→E, 6→A, …
EXPECTED_ANSWERS = {str(q): OPTIONS[(q - 1) % 5] for q in range(1, N_QUESTIONS + 1)}
TEST_CODE        = "12345678"


# ── Helpers ───────────────────────────────────────────────────────────────────

def px(mm: float) -> int:
    return int(round(mm * SCALE))


# ── Generación de imagen sintética ───────────────────────────────────────────

def build_synthetic_image() -> np.ndarray:
    """
    Crea la imagen canónica (CANON_W × CANON_H) con:
      - Fondo blanco
      - 4 marcadores de esquina negros rellenos
      - Burbujas de respuesta rellenas según EXPECTED_ANSWERS
      - Dígitos del código DNI rellenos según TEST_CODE
    """
    img = np.full((CANON_H, CANON_W), 255, dtype=np.uint8)

    # Marcadores de esquina
    r_marker = px(MARKER_R)
    for (mx, my) in [MARKER_TL, MARKER_TR, MARKER_BL, MARKER_BR]:
        cv2.circle(img, (px(mx), px(my)), r_marker, 0, -1)

    # Burbujas de respuesta
    r_bubble = px(BUBBLE_R)
    for q in range(1, N_QUESTIONS + 1):
        col_idx  = (q - 1) // N_ROWS
        row_idx  = (q - 1) % N_ROWS
        col_x_mm = GRID_X1 + col_idx * COL_W
        row_cy   = GRID_Y1 + row_idx * ROW_H + ROW_H / 2
        opt_idx  = OPTIONS.index(EXPECTED_ANSWERS[str(q)])
        bx_mm    = col_x_mm + BUBBLE_FIRST_X + opt_idx * BUBBLE_SPACING
        cv2.circle(img, (px(bx_mm), px(row_cy)), r_bubble, 0, -1)

    # Dígitos del código DNI
    r_code = px(CODE_BUBBLE_R)
    for d, digit_char in enumerate(TEST_CODE):
        digit  = int(digit_char)
        cx_mm  = INFO_X1 + d * CODE_DIGIT_W + CODE_DIGIT_W / 2
        cy_mm  = CODE_Y1 + digit * CODE_ROW_H + CODE_ROW_H / 2
        cv2.circle(img, (px(cx_mm), px(cy_mm)), r_code, 0, -1)

    return img


def rotate_image(img: np.ndarray, angle_deg: float) -> np.ndarray:
    """Rotación rígida alrededor del centro — simula foto tomada con leve tilt."""
    h, w   = img.shape
    center = (w // 2, h // 2)
    M      = cv2.getRotationMatrix2D(center, angle_deg, 1.0)
    return cv2.warpAffine(img, M, (w, h), borderValue=255)


# ── Lógica del test ───────────────────────────────────────────────────────────

def run_test(label: str, img: np.ndarray, save: bool = False,
             min_accuracy: float = 0.98) -> bool:

    if save:
        fname = f"test_omr_{label.replace(' ', '_').lower()}.png"
        cv2.imwrite(fname, img)
        print(f"  >> imagen guardada como {fname}")

    # Guardar en archivo temporal y procesar con el motor real
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
        tmp = f.name
    cv2.imwrite(tmp, img)

    try:
        result = process_omr_image(tmp)
    except Exception as e:
        print(f"\n{'='*58}")
        print(f"  TEST {label}")
        print(f"{'='*58}")
        print(f"  [ERROR] EXCEPCION: {e}")
        return False
    finally:
        os.unlink(tmp)

    detected  = result['respuestas_detectadas']
    confianza = result['confianza_por_pregunta']
    codigo    = result['codigo_leido']

    # ── Comparar respuestas ──────────────────────────────────────────────────
    correct   = 0
    wrong_log = []

    for q in range(1, N_QUESTIONS + 1):
        qs  = str(q)
        exp = EXPECTED_ANSWERS[qs]
        det = detected.get(qs, '')
        if det == exp:
            correct += 1
        else:
            conf = confianza.get(qs, '?')
            wrong_log.append(
                f"    P{q:3d}  esperado={exp}  detectado={'?' if not det else det}"
                f"  confianza={conf}"
            )

    accuracy = correct / N_QUESTIONS
    code_ok  = (codigo == TEST_CODE)

    verde    = sum(1 for v in confianza.values() if v == 'Verde')
    amarillo = sum(1 for v in confianza.values() if v == 'Amarillo')
    rojo     = sum(1 for v in confianza.values() if v == 'Rojo')

    print(f"\n{'='*58}")
    print(f"  TEST {label}")
    print(f"{'='*58}")
    print(f"  Precision respuestas : {correct}/{N_QUESTIONS}  ({accuracy*100:.1f}%)  "
          f"[umbral {min_accuracy*100:.0f}%]")
    print(f"  Codigo DNI detectado : {codigo}  "
          f"{'OK' if code_ok else f'FALLO  esperado={TEST_CODE}'}")
    print(f"  Confianza burbujas   : [V] {verde}  [A] {amarillo}  [R] {rojo}")

    if wrong_log:
        print(f"\n  Fallos ({len(wrong_log)}):")  # noqa: 'Fallos' is ASCII-safe
        for line in wrong_log[:15]:
            print(line)
        if len(wrong_log) > 15:
            print(f"    ... y {len(wrong_log) - 15} mas")

    passed = (accuracy >= min_accuracy) and code_ok
    print(f"\n  {'PASO' if passed else 'FALLO'}")
    return passed


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Test sintético motor OMR SIGMA')
    parser.add_argument('--warp',  type=float, default=2.0,
                        metavar='DEG', help='Ángulo de rotación para el test "deformado" (default 2°)')
    parser.add_argument('--save',  action='store_true',
                        help='Guarda las imágenes de prueba en disco')
    parser.add_argument('--only',  choices=['clean', 'warp'],
                        help='Ejecuta solo uno de los dos tests')
    args = parser.parse_args()

    print("=" * 58)
    print("  SIGMA OMR - Prueba Sintetica")
    print(f"  MARKER_R={MARKER_R}mm  BUBBLE_R={BUBBLE_R}mm  N_QUESTIONS={N_QUESTIONS}")
    print("=" * 58)

    base_img = build_synthetic_image()

    results = []

    if args.only in (None, 'clean'):
        ok = run_test(
            label      = "LIMPIO (sin rotación)",
            img        = base_img.copy(),
            save       = args.save,
            min_accuracy = 0.99,   # prácticamente perfecto en imagen limpia
        )
        results.append(('Limpio', ok))

    if args.only in (None, 'warp'):
        warp_deg = args.warp
        ok = run_test(
            label        = f"ROTADO {warp_deg:.1f}°",
            img          = rotate_image(base_img.copy(), warp_deg),
            save         = args.save,
            min_accuracy = 0.95,
        )
        results.append((f'Rotado {warp_deg}°', ok))

    # ── Resumen final ────────────────────────────────────────────────────────
    print(f"\n{'='*58}")
    print("  RESUMEN FINAL")
    print(f"{'='*58}")
    all_ok = True
    for name, ok in results:
        print(f"  {name:<20} {'PASO' if ok else 'FALLO'}")
        if not ok:
            all_ok = False
    print(f"{'='*58}\n")

    sys.exit(0 if all_ok else 1)


if __name__ == '__main__':
    main()
