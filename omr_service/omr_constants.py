"""
Estándar de ficha SIGMA OMR — v1.0
Hoja A4 apaisada (landscape 297 x 210 mm).

Este archivo es la fuente única de verdad del layout.
Lo usan tanto el generador de PDF como el motor OpenCV.
Todas las medidas en milímetros, origen en esquina superior-izquierda.
"""

# ── Página ────────────────────────────────────────────────────────────
PAGE_W = 297.0   # mm  (A4 landscape ancho)
PAGE_H = 210.0   # mm  (A4 landscape alto)

# ── Marcadores de esquina (círculos rellenos negros) ──────────────────
# El motor los usa para corregir perspectiva y escala.
MARKER_R      = 6.0    # radio (mm)
MARKER_MARGIN = 12.0   # distancia del centro al borde más cercano

MARKER_TL = (MARKER_MARGIN,            MARKER_MARGIN)           # top-left
MARKER_TR = (PAGE_W - MARKER_MARGIN,   MARKER_MARGIN)           # top-right
MARKER_BL = (MARKER_MARGIN,            PAGE_H - MARKER_MARGIN)  # bottom-left
MARKER_BR = (PAGE_W - MARKER_MARGIN,   PAGE_H - MARKER_MARGIN)  # bottom-right

# ── Panel izquierdo — Información del alumno ──────────────────────────
INFO_X1 = 22.0   # inicio (después del marcador + margen)
INFO_X2 = 80.0   # fin    (ancho efectivo ≈ 58 mm)

# ── Separador vertical entre paneles ──────────────────────────────────
SEPARATOR_X = 83.0

# ── Panel derecho — Logo + Respuestas ─────────────────────────────────
RIGHT_X1 =  86.0
RIGHT_X2 = 278.0   # deja ~7 mm de margen desde el marcador TR

# Logo / cabecera de academia  (arriba del panel derecho)
LOGO_Y1 =  8.0
LOGO_Y2 = 36.0    # 28 mm de altura

# ── Grilla de respuestas ──────────────────────────────────────────────
GRID_X1 = RIGHT_X1
GRID_X2 = RIGHT_X2
GRID_Y1 = 39.0
GRID_Y2 = 203.0

N_QUESTIONS = 100
N_COLS      = 4     # columnas en la grilla
N_ROWS      = 25    # preguntas por columna  (100 / 4)
N_OPTIONS   = 5     # A, B, C, D, E

COL_W = (GRID_X2 - GRID_X1) / N_COLS   # 48.0 mm por columna
ROW_H = (GRID_Y2 - GRID_Y1) / N_ROWS   # 6.56 mm por fila

# Burbujas dentro de cada columna (offsets relativos al inicio de columna)
BUBBLE_R          = 2.4    # radio de burbuja (mm)
BUBBLE_SPACING    = 7.5    # distancia centro-a-centro entre opciones (mm)
Q_NUM_RIGHT_X     = 9.0    # edge derecho del número de pregunta (mm desde col_x)
BUBBLE_FIRST_X    = 13.0   # centro de la burbuja A (mm desde col_x)

# Verificación de que las burbujas caben dentro de COL_W:
# Centro burbuja E = BUBBLE_FIRST_X + 4 * BUBBLE_SPACING = 43.0 mm
# Borde derecho E  = 43.0 + BUBBLE_R = 45.4 mm  <  COL_W = 48.0 mm  ✓
# Borde derecho col 3 en página = GRID_X1 + 4*COL_W = 278 mm = GRID_X2  ✓

# ── Código / DNI del alumno (burbujas en panel izquierdo) ─────────────
CODE_DIGITS    = 8      # posiciones del código (compatible con DNI peruano)
CODE_LABEL_Y   = 52.0   # Y del título "CÓDIGO / DNI"
CODE_Y1        = 59.0   # Y donde empieza la grilla de burbujas
CODE_DIGIT_W   = (INFO_X2 - INFO_X1) / CODE_DIGITS  # 7.25 mm por dígito
CODE_BUBBLE_R  = 2.0    # radio de burbuja del código
CODE_ROW_H     = 5.5    # altura por fila (dígito 0-9 = 10 filas → 55 mm total)
# Grilla termina en: CODE_Y1 + 10 * CODE_ROW_H = 59 + 55 = 114 mm

# ── Resolución canónica para el motor OpenCV ──────────────────────────
DPI    = 300
SCALE  = DPI / 25.4          # px por mm ≈ 11.811
CANON_W = int(round(PAGE_W * SCALE))   # 3508 px
CANON_H = int(round(PAGE_H * SCALE))   # 2480 px
