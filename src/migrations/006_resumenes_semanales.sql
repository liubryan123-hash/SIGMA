-- Migración 006: Resúmenes semanales para alumnos
-- Ejecutar: psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db -f 006_resumenes_semanales.sql

CREATE TABLE IF NOT EXISTS resumenes_semanales (
  id_resumen     SERIAL PRIMARY KEY,
  id_usuario     VARCHAR(100) NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_academia    VARCHAR(50)  NOT NULL REFERENCES academias(id_academia) ON DELETE CASCADE,
  semana_inicio  DATE NOT NULL,
  semana_fin     DATE NOT NULL,
  examenes_semana   INTEGER NOT NULL DEFAULT 0,
  promedio_semana   NUMERIC(5,2),
  asistencias       INTEGER NOT NULL DEFAULT 0,
  ausencias         INTEGER NOT NULL DEFAULT 0,
  posicion_salon    INTEGER,
  total_salon       INTEGER,
  mensaje           TEXT,
  generado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(id_usuario, semana_inicio)
);

CREATE INDEX IF NOT EXISTS idx_resumenes_usuario ON resumenes_semanales(id_usuario, semana_inicio DESC);
