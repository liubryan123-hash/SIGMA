-- Migración 009: Módulo Tutor
-- Agrega referencia de tutor por alumno y tabla de vinculación

-- Columna id_tutor en usuarios (FK al mismo tutor de la academia)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS id_tutor VARCHAR(100);

-- Índice para buscar rápido todos los alumnos de un tutor
CREATE INDEX IF NOT EXISTS idx_usuarios_id_tutor
  ON usuarios(id_tutor)
  WHERE id_tutor IS NOT NULL;

-- Restricción FK (solt: sin CASCADE para no borrar alumnos si se elimina el tutor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_tutor'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT fk_usuarios_tutor
      FOREIGN KEY (id_tutor) REFERENCES usuarios(id_usuario)
      ON DELETE SET NULL;
  END IF;
END $$;
