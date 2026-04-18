-- Migración 010: Setup fee en academias + rol padre

-- Setup fee en academias
ALTER TABLE academias ADD COLUMN IF NOT EXISTS setup_fee_pagado  BOOLEAN    NOT NULL DEFAULT FALSE;
ALTER TABLE academias ADD COLUMN IF NOT EXISTS setup_fee_fecha   TIMESTAMPTZ;
ALTER TABLE academias ADD COLUMN IF NOT EXISTS setup_fee_monto   NUMERIC(10,2);

-- Columna padre en usuarios (apoderado/padre vinculado a un alumno)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS id_padre VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_usuarios_id_padre
  ON usuarios(id_padre)
  WHERE id_padre IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_padre'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT fk_usuarios_padre
      FOREIGN KEY (id_padre) REFERENCES usuarios(id_usuario)
      ON DELETE SET NULL;
  END IF;
END $$;
