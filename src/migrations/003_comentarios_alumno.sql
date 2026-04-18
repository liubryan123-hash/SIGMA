-- Migración 003: Comentarios privados del profesor en expediente del alumno
-- Ejecutar en el VPS: psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db -f 003_comentarios_alumno.sql

CREATE TABLE IF NOT EXISTS comentarios_alumno (
  id_comentario  SERIAL PRIMARY KEY,
  id_alumno      VARCHAR(100) NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_autor       VARCHAR(100) NOT NULL REFERENCES usuarios(id_usuario),
  id_academia    VARCHAR(50)  NOT NULL REFERENCES academias(id_academia) ON DELETE CASCADE,
  texto          TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_alumno ON comentarios_alumno(id_alumno, fecha_creacion DESC);
