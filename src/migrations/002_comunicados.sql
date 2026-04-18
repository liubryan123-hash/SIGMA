-- Migración 002: Tabla de comunicados masivos
-- Ejecutar en el VPS: psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db -f 002_comunicados.sql

CREATE TABLE IF NOT EXISTS comunicados (
  id_comunicado  SERIAL PRIMARY KEY,
  id_academia    VARCHAR(50) NOT NULL REFERENCES academias(id_academia) ON DELETE CASCADE,
  id_autor       VARCHAR(100) NOT NULL,
  titulo         TEXT NOT NULL,
  cuerpo         TEXT NOT NULL,
  destinatarios  VARCHAR(100) NOT NULL DEFAULT 'academia',
  -- 'academia' = todos | 'salon:123' = salón específico | 'rol:alumno' = por rol
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comunicados_academia ON comunicados(id_academia, fecha_creacion DESC);
