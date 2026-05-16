"""
Generador del PDF estándar de ficha SIGMA OMR.

Produce un PDF A4 apaisado listo para imprimir.
Las academias pueden personalizar nombre y título; el layout es fijo
para que el motor OpenCV siempre sepa dónde están los marcadores y burbujas.

Uso:
    from template_generator import generate_template_pdf
    pdf_bytes = generate_template_pdf(academy_name="Jireh", exam_title="Simulacro #3")
    with open("ficha.pdf", "wb") as f:
        f.write(pdf_bytes)
"""

import io
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader

from omr_constants import (
    PAGE_H, PAGE_W,
    MARKER_R, MARKER_TL, MARKER_TR, MARKER_BL, MARKER_BR,
    INFO_X1, INFO_X2, SEPARATOR_X,
    RIGHT_X1, RIGHT_X2, LOGO_Y1, LOGO_Y2,
    GRID_X1, GRID_X2, GRID_Y1, GRID_Y2,
    N_QUESTIONS, N_COLS, N_ROWS, N_OPTIONS, COL_W, ROW_H,
    BUBBLE_R, BUBBLE_SPACING, Q_NUM_RIGHT_X, BUBBLE_FIRST_X,
    CODE_DIGITS, CODE_LABEL_Y, CODE_Y1, CODE_DIGIT_W, CODE_BUBBLE_R, CODE_ROW_H,
)

OPTIONS = ['A', 'B', 'C', 'D', 'E']

# ── Paleta ────────────────────────────────────────────────────────────────────
BLUE      = colors.Color(0.102, 0.420, 0.820)   # azul primario
BLUE_MID  = colors.Color(0.549, 0.733, 0.949)   # azul medio (bordes, letras burbuja)
BLUE_PALE = colors.Color(0.902, 0.941, 1.000)   # azul muy claro (fondos alternos)
GRAY_MID  = colors.Color(0.380, 0.380, 0.380)   # gris para texto secundario
GRAY_LITE = colors.Color(0.650, 0.650, 0.650)   # gris claro para líneas


def _y(y_mm: float, page_h_pt: float) -> float:
    """Convierte Y en mm (desde arriba) a puntos desde abajo (sistema reportlab)."""
    return page_h_pt - y_mm * mm


def generate_template_pdf(
    academy_name: str = "ACADEMIA",
    exam_title: str = "HOJA DE RESPUESTAS",
    n_questions: int = N_QUESTIONS,
    logo_path: str = None,
) -> bytes:
    """
    Genera el PDF de la ficha OMR estándar SIGMA.

    Args:
        academy_name: Nombre de la academia (aparece en cabecera derecha).
        exam_title:   Título del examen (aparece en cabecera derecha).
        n_questions:  Número de preguntas activas (1-100).
        logo_path:    Ruta a la imagen del logo (PNG/JPG). Opcional.

    Returns:
        Bytes del PDF generado.
    """
    n_questions = max(1, min(n_questions, N_QUESTIONS))

    buf = io.BytesIO()
    PW, PH = landscape(A4)   # 841.89 x 595.28 puntos
    c = canvas.Canvas(buf, pagesize=(PW, PH))

    def y(y_mm):
        return _y(y_mm, PH)

    _draw_corner_markers(c, y)
    _draw_separator(c, y)
    _draw_info_panel(c, y)
    _draw_logo_area(c, y, academy_name, exam_title, logo_path)
    _draw_answer_grid(c, y, n_questions)

    c.save()
    buf.seek(0)
    return buf.read()


# ─────────────────────────────────────────────────────────────────────────────
# Marcadores de esquina
# ─────────────────────────────────────────────────────────────────────────────

def _draw_corner_markers(c, y):
    """4 círculos negros rellenos — usados por OpenCV para corrección de perspectiva."""
    c.setFillColor(colors.black)
    for mx, my in [MARKER_TL, MARKER_TR, MARKER_BL, MARKER_BR]:
        c.circle(mx * mm, y(my), MARKER_R * mm, fill=1, stroke=0)


# ─────────────────────────────────────────────────────────────────────────────
# Separador vertical entre paneles
# ─────────────────────────────────────────────────────────────────────────────

def _draw_separator(c, y):
    c.setStrokeColor(BLUE_MID)
    c.setLineWidth(0.6)
    c.line(SEPARATOR_X * mm, y(6), SEPARATOR_X * mm, y(204))


# ─────────────────────────────────────────────────────────────────────────────
# Panel izquierdo — Datos del alumno
# ─────────────────────────────────────────────────────────────────────────────

def _draw_info_panel(c, y):
    # Título del panel
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(BLUE)
    c.drawString(INFO_X1 * mm, y(9.5), "DATOS DEL ALUMNO")
    c.setStrokeColor(BLUE)
    c.setLineWidth(0.7)
    c.line(INFO_X1 * mm, y(11.5), INFO_X2 * mm, y(11.5))

    # Campos de texto
    fields = [
        ("Nombre:",             15.0),
        ("Apellidos:",          22.0),
        ("Carrera a Postular:", 29.0),
        ("Universidad:",        36.0),
        ("Fecha:",              43.0),
    ]
    for label, y_mm in fields:
        c.setFont("Helvetica", 5.8)
        c.setFillColor(GRAY_MID)
        c.drawString(INFO_X1 * mm, y(y_mm) + 1.5, label)
        c.setStrokeColor(GRAY_LITE)
        c.setLineWidth(0.35)
        c.line((INFO_X1 + 0.5) * mm, y(y_mm + 4.8), INFO_X2 * mm, y(y_mm + 4.8))

    # Sección CÓDIGO / DNI
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(BLUE)
    c.drawString(INFO_X1 * mm, y(CODE_LABEL_Y) + 1, "CÓDIGO / DNI")

    c.setFont("Helvetica-Oblique", 4.8)
    c.setFillColor(GRAY_MID)
    c.drawString(INFO_X1 * mm, y(CODE_LABEL_Y + 4.5) + 1,
                 "Rellene un círculo por columna")

    # Encabezado de columnas (1..8)
    c.setFont("Helvetica-Bold", 4.8)
    c.setFillColor(BLUE)
    for d in range(CODE_DIGITS):
        cx = (INFO_X1 + d * CODE_DIGIT_W + CODE_DIGIT_W / 2) * mm
        c.drawCentredString(cx, y(CODE_Y1 - 1.5), str(d + 1))

    # Grilla de burbujas del código (10 filas × 8 columnas)
    for d in range(CODE_DIGITS):
        cx_mm = INFO_X1 + d * CODE_DIGIT_W + CODE_DIGIT_W / 2
        for digit in range(10):
            cy_mm = CODE_Y1 + digit * CODE_ROW_H + CODE_ROW_H / 2
            if digit % 2 == 0:
                c.setFillColor(BLUE_PALE)
                c.setStrokeColor(BLUE_PALE)
                c.rect(
                    (INFO_X1 + d * CODE_DIGIT_W) * mm,
                    y(CODE_Y1 + digit * CODE_ROW_H + CODE_ROW_H),
                    CODE_DIGIT_W * mm, CODE_ROW_H * mm,
                    fill=1, stroke=0,
                )
            c.setFillColor(colors.white)
            c.setStrokeColor(BLUE_MID)
            c.setLineWidth(0.35)
            c.circle(cx_mm * mm, y(cy_mm), CODE_BUBBLE_R * mm, fill=1, stroke=1)
            c.setFont("Helvetica", 4.2)
            c.setFillColor(GRAY_MID)
            c.drawCentredString(cx_mm * mm, y(cy_mm) - 1.4, str(digit))

    # Marco exterior de la grilla de código
    code_grid_h = 10 * CODE_ROW_H
    c.setStrokeColor(BLUE_MID)
    c.setLineWidth(0.5)
    c.rect(INFO_X1 * mm, y(CODE_Y1 + code_grid_h),
           (INFO_X2 - INFO_X1) * mm, code_grid_h * mm, fill=0, stroke=1)

    # Observaciones
    obs_y = CODE_Y1 + code_grid_h + 6
    c.setFont("Helvetica-Bold", 5.5)
    c.setFillColor(BLUE)
    c.drawString(INFO_X1 * mm, y(obs_y) + 1, "Observaciones:")
    c.setStrokeColor(GRAY_LITE)
    c.setLineWidth(0.3)
    for i in range(4):
        ly = obs_y + 6 + i * 7
        c.line(INFO_X1 * mm, y(ly), INFO_X2 * mm, y(ly))

    # Firma del docente
    sig_y = obs_y + 38
    c.setStrokeColor(GRAY_MID)
    c.setLineWidth(0.4)
    c.line(INFO_X1 * mm, y(sig_y), INFO_X2 * mm, y(sig_y))
    c.setFont("Helvetica", 5)
    c.setFillColor(GRAY_MID)
    c.drawCentredString(((INFO_X1 + INFO_X2) / 2) * mm, y(sig_y + 3.5), "Firma del docente")


# ─────────────────────────────────────────────────────────────────────────────
# Panel derecho — Cabecera (logo + nombre academia)
# ─────────────────────────────────────────────────────────────────────────────

def _draw_logo_area(c, y, academy_name: str, exam_title: str, logo_path: str = None):
    panel_w  = (RIGHT_X2 - RIGHT_X1) * mm
    panel_h  = (LOGO_Y2 - LOGO_Y1) * mm
    stripe_h = 4.0   # mm — franja azul sólida en la parte superior

    # Franja azul superior
    c.setFillColor(BLUE)
    c.rect(RIGHT_X1 * mm, y(LOGO_Y1 + stripe_h),
           panel_w, stripe_h * mm, fill=1, stroke=0)

    # Fondo blanco del área de contenido
    rest_h = (LOGO_Y2 - LOGO_Y1 - stripe_h) * mm
    c.setFillColor(colors.white)
    c.rect(RIGHT_X1 * mm, y(LOGO_Y2), panel_w, rest_h, fill=1, stroke=0)

    # Borde exterior azul
    c.setStrokeColor(BLUE)
    c.setLineWidth(0.7)
    c.rect(RIGHT_X1 * mm, y(LOGO_Y2), panel_w, panel_h, fill=0, stroke=1)

    # Caja reservada para logo
    logo_box_x = RIGHT_X1 + 2
    logo_box_y = LOGO_Y1 + stripe_h + 2   # borde superior de la caja (mm desde arriba)
    logo_box_w = 24.0
    logo_box_h = LOGO_Y2 - logo_box_y - 2

    box_x_pt = logo_box_x * mm
    box_y_pt = y(logo_box_y + logo_box_h)   # bottom-left en puntos ReportLab
    box_w_pt = logo_box_w * mm
    box_h_pt = logo_box_h * mm

    logo_drawn = False
    if logo_path and os.path.isfile(logo_path):
        try:
            img = ImageReader(logo_path)
            iw, ih = img.getSize()
            scale   = min(box_w_pt / iw, box_h_pt / ih)
            draw_w  = iw * scale
            draw_h  = ih * scale
            draw_x  = box_x_pt + (box_w_pt - draw_w) / 2
            draw_y  = box_y_pt + (box_h_pt - draw_h) / 2
            c.drawImage(logo_path, draw_x, draw_y, draw_w, draw_h, mask='auto')
            logo_drawn = True
        except Exception:
            pass

    if not logo_drawn:
        c.setFillColor(colors.Color(0.97, 0.97, 0.97))
        c.setStrokeColor(BLUE_MID)
        c.setLineWidth(0.5)
        c.rect(box_x_pt, box_y_pt, box_w_pt, box_h_pt, fill=1, stroke=1)
        c.setFont("Helvetica", 5)
        c.setFillColor(BLUE_MID)
        c.drawCentredString(
            box_x_pt + box_w_pt / 2,
            box_y_pt + box_h_pt / 2 - 1.5,
            "LOGO",
        )

    # Nombre de la academia
    text_x = (logo_box_x + logo_box_w + 3) * mm
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(BLUE)
    c.drawString(text_x, y(LOGO_Y1 + stripe_h + 10), academy_name.upper())

    # Título del examen
    c.setFont("Helvetica", 8.5)
    c.setFillColor(GRAY_MID)
    c.drawString(text_x, y(LOGO_Y1 + stripe_h + 20), exam_title)

    # "SIGMA OMR v1.0" esquina inferior-derecha
    c.setFont("Helvetica-Oblique", 5.5)
    c.setFillColor(BLUE_MID)
    c.drawRightString(RIGHT_X2 * mm, y(LOGO_Y2 - 3), "SIGMA OMR v1.0")


# ─────────────────────────────────────────────────────────────────────────────
# Panel derecho — Grilla de respuestas
# ─────────────────────────────────────────────────────────────────────────────

def _draw_answer_grid(c, y, n_questions: int):
    # Barra azul de encabezados de columna (ocupa el espacio entre header y grid)
    c.setFillColor(BLUE)
    c.rect(GRID_X1 * mm, y(GRID_Y1),
           (GRID_X2 - GRID_X1) * mm, 3.0 * mm, fill=1, stroke=0)

    # Separadores de columna dentro de la barra de cabecera
    c.setStrokeColor(colors.Color(0.70, 0.84, 0.97))
    c.setLineWidth(0.3)
    for ci in range(1, N_COLS):
        sep_x = (GRID_X1 + ci * COL_W) * mm
        c.line(sep_x, y(GRID_Y1), sep_x, y(GRID_Y1 - 3.0))

    # Etiquetas de rango en blanco
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(colors.white)
    for ci in range(N_COLS):
        col_x_mm = GRID_X1 + ci * COL_W
        start_q  = ci * N_ROWS + 1
        end_q    = min((ci + 1) * N_ROWS, n_questions)
        if start_q > n_questions:
            break
        c.drawCentredString(
            (col_x_mm + COL_W / 2) * mm, y(GRID_Y1 - 1.5),
            f"{start_q} – {end_q}",
        )

    # Filas de preguntas
    for q in range(1, n_questions + 1):
        col_idx  = (q - 1) // N_ROWS
        row_idx  = (q - 1) % N_ROWS
        col_x_mm = GRID_X1 + col_idx * COL_W
        row_cy   = GRID_Y1 + row_idx * ROW_H + ROW_H / 2

        # Fondo alternado azul pálido
        if row_idx % 2 == 0:
            c.setFillColor(BLUE_PALE)
            c.setStrokeColor(BLUE_PALE)
            c.rect(col_x_mm * mm,
                   y(GRID_Y1 + (row_idx + 1) * ROW_H),
                   COL_W * mm, ROW_H * mm, fill=1, stroke=0)

        # Número de pregunta
        c.setFont("Helvetica", 5.3)
        c.setFillColor(GRAY_MID)
        c.drawRightString((col_x_mm + Q_NUM_RIGHT_X) * mm, y(row_cy) - 1.8, str(q))

        # Burbujas A-E
        c.setStrokeColor(BLUE_MID)
        c.setLineWidth(0.35)
        for opt_idx in range(N_OPTIONS):
            bx_mm = col_x_mm + BUBBLE_FIRST_X + opt_idx * BUBBLE_SPACING
            c.setFillColor(colors.white)
            c.circle(bx_mm * mm, y(row_cy), BUBBLE_R * mm, fill=1, stroke=1)
            c.setFont("Helvetica", 4.2)
            c.setFillColor(BLUE_MID)
            c.drawCentredString(bx_mm * mm, y(row_cy) - 1.4, OPTIONS[opt_idx])

    # Separadores verticales entre columnas
    c.setStrokeColor(BLUE_MID)
    c.setLineWidth(0.3)
    for ci in range(1, N_COLS):
        sep_x = (GRID_X1 + ci * COL_W) * mm
        c.line(sep_x, y(GRID_Y1), sep_x, y(GRID_Y2))

    # Marco exterior de la grilla
    c.setStrokeColor(BLUE)
    c.setLineWidth(0.7)
    c.rect(GRID_X1 * mm, y(GRID_Y2),
           (GRID_X2 - GRID_X1) * mm, (GRID_Y2 - GRID_Y1) * mm,
           fill=0, stroke=1)

    # Instrucción debajo de la grilla
    c.setFont("Helvetica-Oblique", 4.8)
    c.setFillColor(GRAY_MID)
    c.drawString(GRID_X1 * mm, y(GRID_Y2 + 3.5),
                 "Rellene completamente el círculo de su respuesta con lápiz o lapicero negro/azul.")
