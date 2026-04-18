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
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.lib import colors

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


def _y(y_mm: float, page_h_pt: float) -> float:
    """Convierte Y en mm (desde arriba) a puntos desde abajo (sistema reportlab)."""
    return page_h_pt - y_mm * mm


def generate_template_pdf(
    academy_name: str = "ACADEMIA",
    exam_title: str = "HOJA DE RESPUESTAS",
    n_questions: int = N_QUESTIONS,
) -> bytes:
    """
    Genera el PDF de la ficha OMR estándar SIGMA.

    Args:
        academy_name: Nombre de la academia (aparece en cabecera derecha).
        exam_title:   Título del examen (aparece en cabecera derecha).
        n_questions:  Número de preguntas activas (1-100).

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
    _draw_logo_area(c, y, academy_name, exam_title)
    _draw_answer_grid(c, y, n_questions)

    c.save()
    buf.seek(0)
    return buf.read()


# ─────────────────────────────────────────────────────────────────────
# Marcadores de esquina
# ─────────────────────────────────────────────────────────────────────

def _draw_corner_markers(c, y):
    """4 círculos negros rellenos — usados por OpenCV para corrección de perspectiva."""
    c.setFillColor(colors.black)
    for mx, my in [MARKER_TL, MARKER_TR, MARKER_BL, MARKER_BR]:
        c.circle(mx * mm, y(my), MARKER_R * mm, fill=1, stroke=0)


# ─────────────────────────────────────────────────────────────────────
# Separador
# ─────────────────────────────────────────────────────────────────────

def _draw_separator(c, y):
    c.setStrokeColor(colors.Color(0.72, 0.72, 0.72))
    c.setLineWidth(0.4)
    c.line(SEPARATOR_X * mm, y(6), SEPARATOR_X * mm, y(204))


# ─────────────────────────────────────────────────────────────────────
# Panel izquierdo — Información del alumno
# ─────────────────────────────────────────────────────────────────────

def _draw_info_panel(c, y):
    # ── Título del panel ──────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.black)
    c.drawString(INFO_X1 * mm, y(9.5), "DATOS DEL ALUMNO")

    c.setStrokeColor(colors.black)
    c.setLineWidth(0.7)
    c.line(INFO_X1 * mm, y(11.5), INFO_X2 * mm, y(11.5))

    # ── Campos de texto ───────────────────────────────────────────────
    fields = [
        ("Nombre:",              15.0),
        ("Apellidos:",           22.0),
        ("Carrera a Postular:",  29.0),
        ("Universidad:",         36.0),
        ("Fecha:",               43.0),
    ]
    c.setLineWidth(0.35)
    for label, y_mm in fields:
        c.setFont("Helvetica", 5.8)
        c.setFillColor(colors.Color(0.25, 0.25, 0.25))
        c.drawString(INFO_X1 * mm, y(y_mm) + 1.5, label)
        c.setStrokeColor(colors.Color(0.55, 0.55, 0.55))
        c.line((INFO_X1 + 0.5) * mm, y(y_mm + 4.8),
               INFO_X2 * mm,         y(y_mm + 4.8))

    # ── Etiqueta código ───────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(colors.black)
    c.drawString(INFO_X1 * mm, y(CODE_LABEL_Y) + 1, "CÓDIGO / DNI")

    # Instrucción pequeña
    c.setFont("Helvetica-Oblique", 4.8)
    c.setFillColor(colors.Color(0.45, 0.45, 0.45))
    c.drawString(INFO_X1 * mm, y(CODE_LABEL_Y + 4.5) + 1,
                 "Rellene un círculo por columna")

    # ── Encabezado de columnas (posición 1..8) ────────────────────────
    c.setFont("Helvetica-Bold", 4.8)
    c.setFillColor(colors.Color(0.3, 0.3, 0.3))
    for d in range(CODE_DIGITS):
        cx = (INFO_X1 + d * CODE_DIGIT_W + CODE_DIGIT_W / 2) * mm
        c.drawCentredString(cx, y(CODE_Y1 - 1.5), str(d + 1))

    # ── Grilla de burbujas del código (10 filas × 8 columnas) ─────────
    c.setLineWidth(0.35)
    for d in range(CODE_DIGITS):
        cx_mm = INFO_X1 + d * CODE_DIGIT_W + CODE_DIGIT_W / 2
        for digit in range(10):
            cy_mm = CODE_Y1 + digit * CODE_ROW_H + CODE_ROW_H / 2
            # Fondo alternado
            if digit % 2 == 0:
                c.setFillColor(colors.Color(0.95, 0.95, 0.95))
                c.setStrokeColor(colors.Color(0.95, 0.95, 0.95))
                c.rect((INFO_X1 + d * CODE_DIGIT_W) * mm, y(CODE_Y1 + digit * CODE_ROW_H + CODE_ROW_H),
                       CODE_DIGIT_W * mm, CODE_ROW_H * mm, fill=1, stroke=0)

            # Burbuja
            c.setFillColor(colors.white)
            c.setStrokeColor(colors.Color(0.45, 0.45, 0.45))
            c.circle(cx_mm * mm, y(cy_mm), CODE_BUBBLE_R * mm, fill=1, stroke=1)

            # Dígito dentro de la burbuja
            c.setFont("Helvetica", 4.2)
            c.setFillColor(colors.Color(0.4, 0.4, 0.4))
            c.drawCentredString(cx_mm * mm, y(cy_mm) - 1.4, str(digit))

    # Marco exterior de la grilla de código
    c.setStrokeColor(colors.Color(0.55, 0.55, 0.55))
    c.setLineWidth(0.4)
    code_grid_h = 10 * CODE_ROW_H
    c.rect(INFO_X1 * mm, y(CODE_Y1 + code_grid_h),
           (INFO_X2 - INFO_X1) * mm, code_grid_h * mm, fill=0, stroke=1)

    # ── Área de observaciones ─────────────────────────────────────────
    obs_y_start = CODE_Y1 + code_grid_h + 6   # 120 mm aprox.

    c.setFont("Helvetica-Bold", 5.5)
    c.setFillColor(colors.Color(0.2, 0.2, 0.2))
    c.drawString(INFO_X1 * mm, y(obs_y_start) + 1, "Observaciones:")

    c.setStrokeColor(colors.Color(0.65, 0.65, 0.65))
    c.setLineWidth(0.3)
    for i in range(4):
        ly = obs_y_start + 6 + i * 7
        c.line(INFO_X1 * mm, y(ly), INFO_X2 * mm, y(ly))

    # Firma del docente
    sig_y = obs_y_start + 38
    c.setLineWidth(0.4)
    c.setStrokeColor(colors.Color(0.4, 0.4, 0.4))
    c.line(INFO_X1 * mm, y(sig_y), INFO_X2 * mm, y(sig_y))
    c.setFont("Helvetica", 5)
    c.setFillColor(colors.Color(0.45, 0.45, 0.45))
    c.drawCentredString(((INFO_X1 + INFO_X2) / 2) * mm, y(sig_y + 3.5), "Firma del docente")


# ─────────────────────────────────────────────────────────────────────
# Panel derecho — Logo / cabecera de academia
# ─────────────────────────────────────────────────────────────────────

def _draw_logo_area(c, y, academy_name: str, exam_title: str):
    panel_w = (RIGHT_X2 - RIGHT_X1) * mm
    panel_h = (LOGO_Y2 - LOGO_Y1) * mm

    # Fondo gris claro
    c.setFillColor(colors.Color(0.96, 0.96, 0.96))
    c.setStrokeColor(colors.Color(0.78, 0.78, 0.78))
    c.setLineWidth(0.5)
    c.rect(RIGHT_X1 * mm, y(LOGO_Y2), panel_w, panel_h, fill=1, stroke=1)

    # Caja reservada para logo (izquierda del header)
    logo_box_w = 24.0
    logo_box_h = LOGO_Y2 - LOGO_Y1 - 6
    c.setFillColor(colors.white)
    c.setStrokeColor(colors.Color(0.70, 0.70, 0.70))
    c.setLineWidth(0.4)
    c.rect((RIGHT_X1 + 2) * mm, y(LOGO_Y2 - 3),
           logo_box_w * mm, logo_box_h * mm, fill=1, stroke=1)

    c.setFont("Helvetica", 5)
    c.setFillColor(colors.Color(0.62, 0.62, 0.62))
    c.drawCentredString((RIGHT_X1 + 2 + logo_box_w / 2) * mm,
                         y((LOGO_Y1 + LOGO_Y2) / 2) - 1.5, "LOGO")

    # Nombre de la academia
    text_x = (RIGHT_X1 + 2 + logo_box_w + 3) * mm
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.Color(0.10, 0.10, 0.10))
    c.drawString(text_x, y(LOGO_Y1 + 10), academy_name.upper())

    # Título del examen
    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.Color(0.35, 0.35, 0.35))
    c.drawString(text_x, y(LOGO_Y1 + 18), exam_title)

    # Texto "SIGMA OMR" pequeño a la derecha
    c.setFont("Helvetica-Oblique", 5.5)
    c.setFillColor(colors.Color(0.60, 0.60, 0.60))
    c.drawRightString(RIGHT_X2 * mm, y(LOGO_Y2 - 3), "SIGMA OMR v1.0")

    # Línea inferior del header
    c.setStrokeColor(colors.Color(0.25, 0.25, 0.25))
    c.setLineWidth(0.9)
    c.line(RIGHT_X1 * mm, y(LOGO_Y2 + 0.3), RIGHT_X2 * mm, y(LOGO_Y2 + 0.3))


# ─────────────────────────────────────────────────────────────────────
# Panel derecho — Grilla de respuestas
# ─────────────────────────────────────────────────────────────────────

def _draw_answer_grid(c, y, n_questions: int):
    # ── Encabezados de columna ────────────────────────────────────────
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(colors.Color(0.2, 0.2, 0.2))
    for ci in range(N_COLS):
        col_x_mm = GRID_X1 + ci * COL_W
        start_q  = ci * N_ROWS + 1
        end_q    = min((ci + 1) * N_ROWS, n_questions)
        if start_q > n_questions:
            break
        label = f"{start_q} – {end_q}"
        c.drawCentredString((col_x_mm + COL_W / 2) * mm, y(GRID_Y1 - 1.5), label)

    # ── Filas de preguntas ────────────────────────────────────────────
    c.setLineWidth(0.35)

    for q in range(1, n_questions + 1):
        col_idx  = (q - 1) // N_ROWS
        row_idx  = (q - 1) % N_ROWS
        col_x_mm = GRID_X1 + col_idx * COL_W
        row_cy   = GRID_Y1 + row_idx * ROW_H + ROW_H / 2   # centro Y de la fila

        # Fondo alternado
        if row_idx % 2 == 0:
            c.setFillColor(colors.Color(0.955, 0.955, 0.955))
            c.setStrokeColor(colors.Color(0.955, 0.955, 0.955))
            c.rect(col_x_mm * mm,
                   y(GRID_Y1 + (row_idx + 1) * ROW_H),
                   COL_W * mm, ROW_H * mm, fill=1, stroke=0)

        # Número de pregunta (alineado a la derecha)
        c.setFont("Helvetica", 5.3)
        c.setFillColor(colors.Color(0.2, 0.2, 0.2))
        c.drawRightString((col_x_mm + Q_NUM_RIGHT_X) * mm, y(row_cy) - 1.8, str(q))

        # Burbujas A-E
        c.setStrokeColor(colors.Color(0.42, 0.42, 0.42))
        for opt_idx in range(N_OPTIONS):
            bx_mm = col_x_mm + BUBBLE_FIRST_X + opt_idx * BUBBLE_SPACING
            c.setFillColor(colors.white)
            c.circle(bx_mm * mm, y(row_cy), BUBBLE_R * mm, fill=1, stroke=1)

            # Letra dentro de la burbuja
            c.setFont("Helvetica", 4.2)
            c.setFillColor(colors.Color(0.50, 0.50, 0.50))
            c.drawCentredString(bx_mm * mm, y(row_cy) - 1.4, OPTIONS[opt_idx])

    # ── Separadores verticales entre columnas ─────────────────────────
    c.setStrokeColor(colors.Color(0.75, 0.75, 0.75))
    c.setLineWidth(0.3)
    for ci in range(1, N_COLS):
        sep_x = (GRID_X1 + ci * COL_W) * mm
        c.line(sep_x, y(GRID_Y1), sep_x, y(GRID_Y2))

    # ── Marco exterior de la grilla ───────────────────────────────────
    c.setStrokeColor(colors.Color(0.45, 0.45, 0.45))
    c.setLineWidth(0.55)
    c.rect(GRID_X1 * mm, y(GRID_Y2),
           (GRID_X2 - GRID_X1) * mm, (GRID_Y2 - GRID_Y1) * mm,
           fill=0, stroke=1)

    # ── Instrucción ───────────────────────────────────────────────────
    c.setFont("Helvetica-Oblique", 4.8)
    c.setFillColor(colors.Color(0.50, 0.50, 0.50))
    c.drawString(GRID_X1 * mm, y(GRID_Y2 + 3.5),
                 "Rellene completamente el círculo de su respuesta con lápiz o lapicero negro/azul.")
