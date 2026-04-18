-- Migración 004: Control de documentos por alumno
-- Ejecutar: psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db -f 004_documentos_alumno.sql

CREATE TABLE IF NOT EXISTS documentos_alumno (
  id_documento   SERIAL PRIMARY KEY,
  id_alumno      VARCHAR(100) NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_academia    VARCHAR(50)  NOT NULL REFERENCES academias(id_academia) ON DELETE CASCADE,
  tipo_documento VARCHAR(100) NOT NULL,  -- 'DNI', 'Voucher de pago', 'Ficha de matrícula', etc.
  estado         VARCHAR(20)  NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'entregado'
  observacion    TEXT,
  fecha_entrega  DATE,
  registrado_por VARCHAR(100) REFERENCES usuarios(id_usuario),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_alumno ON documentos_alumno(id_alumno);
CREATE INDEX IF NOT EXISTS idx_docs_academia ON documentos_alumno(id_academia, estado);
