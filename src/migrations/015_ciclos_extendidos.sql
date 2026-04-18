-- Migración 015: Campos extendidos para ciclos (preparación/turno)
-- Fecha: 23 de marzo de 2026

-- Agregar campos de preparación y turno a la tabla ciclos
ALTER TABLE ciclos 
ADD COLUMN IF NOT EXISTS preparacion VARCHAR(100),
ADD COLUMN IF NOT EXISTS turno VARCHAR(50);

-- Comentario
COMMENT ON COLUMN ciclos.preparacion IS 'Tipo de preparación: San Marcos, UNI, Ciclo Básico, Repaso, etc.';
COMMENT ON COLUMN ciclos.turno IS 'Turno: Mañana, Tarde, Noche, Fin de Semana';

-- Índice para búsquedas por preparación
CREATE INDEX IF NOT EXISTS idx_ciclos_preparacion ON ciclos(preparacion) WHERE preparacion IS NOT NULL;

-- Índice para búsquedas por turno
CREATE INDEX IF NOT EXISTS idx_ciclos_turno ON ciclos(turno) WHERE turno IS NOT NULL;
