-- =====================================================
-- MIGRACIÓN 008 — Ciclo de vida del alumno + Rachas
-- =====================================================

-- 1. Ciclo de vida del alumno en tabla usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS estado_alumno VARCHAR(20) NOT NULL DEFAULT 'activo';

-- Constraint válido solo para registros alumno (otros roles pueden ignorarlo)
ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS chk_estado_alumno;
ALTER TABLE usuarios
  ADD CONSTRAINT chk_estado_alumno
    CHECK (estado_alumno IN ('activo', 'inactivo', 'graduado', 'retirado'));

-- Índice para filtros frecuentes en padrón
CREATE INDEX IF NOT EXISTS idx_usuarios_estado_alumno
  ON usuarios(id_academia, estado_alumno)
  WHERE rol = 'alumno';

-- 2. Rachas de login (gamificación básica)
CREATE TABLE IF NOT EXISTS rachas_login (
  id_usuario    VARCHAR(100) PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  racha_actual  INTEGER      NOT NULL DEFAULT 1,
  racha_maxima  INTEGER      NOT NULL DEFAULT 1,
  ultimo_login  DATE         NOT NULL DEFAULT CURRENT_DATE,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rachas_login IS 'Racha de días consecutivos con login por usuario';
COMMENT ON COLUMN rachas_login.racha_actual IS 'Días consecutivos activos actualmente';
COMMENT ON COLUMN rachas_login.racha_maxima IS 'Record histórico de racha más larga';
