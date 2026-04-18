-- ============================================================
-- MIGRACIÓN 001: Campos OMR de dos colas en tabla resultados
-- Ejecutar UNA vez en la BD antes de usar la nueva ruta /api/omr
-- ============================================================

ALTER TABLE resultados
  ADD COLUMN IF NOT EXISTS omr_estado VARCHAR(30) DEFAULT 'confirmado',
  ADD COLUMN IF NOT EXISTS omr_intentos INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS omr_ultimo_intento TIMESTAMP,
  ADD COLUMN IF NOT EXISTS omr_error_detalle TEXT,
  ADD COLUMN IF NOT EXISTS omr_confianza JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS respuestas_detectadas JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS id_profesor INT,
  ADD COLUMN IF NOT EXISTS codigo_leido_ia VARCHAR(30);

-- Índice para buscar la bandeja del profesor rápido
CREATE INDEX IF NOT EXISTS idx_resultados_omr_estado ON resultados(omr_estado);
CREATE INDEX IF NOT EXISTS idx_resultados_id_profesor ON resultados(id_profesor);

-- Los registros antiguos ya están confirmados, el DEFAULT 'confirmado' los cubre.
-- Para los nuevos registros vía /api/omr/subir, omr_estado empieza en 'en_cola'.
