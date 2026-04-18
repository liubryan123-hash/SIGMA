-- Migración 012: Columna JSONB para permisos de módulos por rol por academia
-- El superadmin puede habilitar/deshabilitar módulos específicos para cada rol en cada academia
-- Formato: {"director": ["crm","marketing"], "secretaria": ["pagos","alumnos"], ...}
-- Si el rol no aparece en el JSON, se usan los módulos por defecto del sistema.

ALTER TABLE academias
  ADD COLUMN IF NOT EXISTS permisos_roles JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN academias.permisos_roles IS
  'Mapa de módulos habilitados por rol. Vacío = usa configuración global por defecto.';
