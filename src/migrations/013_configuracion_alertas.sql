-- Migración 013: Configuración de alertas por academia
-- Permite que cada director configure umbrales personalizados para alertas

ALTER TABLE academias 
ADD COLUMN IF NOT EXISTS configuracion_alertas JSONB DEFAULT '{"asistencia_minima": 70, "nota_minima": 500, "dias_vencimiento_alerta": 7}'::jsonb;

COMMENT ON COLUMN academias.configuracion_alertas IS 'Configuración de umbrales para alertas automáticas (asistencia, notas, vencimientos)';
