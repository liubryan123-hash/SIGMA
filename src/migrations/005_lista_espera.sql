-- Migración 005: Lista de espera de alumnos
-- Ejecutar: psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db -f 005_lista_espera.sql

CREATE TABLE IF NOT EXISTS lista_espera (
  id_espera      SERIAL PRIMARY KEY,
  id_academia    VARCHAR(50) NOT NULL REFERENCES academias(id_academia) ON DELETE CASCADE,
  id_salon       INTEGER     REFERENCES salones(id_salon),
  nombre_completo VARCHAR(200) NOT NULL,
  telefono       VARCHAR(30),
  email          VARCHAR(200),
  notas          TEXT,
  estado         VARCHAR(20) NOT NULL DEFAULT 'en_espera', -- 'en_espera' | 'promovido' | 'descartado'
  posicion       INTEGER NOT NULL DEFAULT 0,
  registrado_por VARCHAR(100) REFERENCES usuarios(id_usuario),
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_espera_academia ON lista_espera(id_academia, estado, posicion ASC);
