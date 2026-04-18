-- Migración 016: Exámenes pendientes de asignación
-- Fecha: 23 de marzo de 2026

-- Tabla para guardar exámenes que no se pudieron procesar completamente
CREATE TABLE IF NOT EXISTS examenes_pendientes (
    id_pendiente SERIAL PRIMARY KEY,
    codigo_examen VARCHAR(50),
    codigo_postulante_lectura VARCHAR(50),
    id_usuario_asignado VARCHAR(50),
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    id_salon INTEGER REFERENCES salones(id_salon),
    nota_total NUMERIC(7,3),
    respuestas_alumno JSONB,
    puntaje_por_cursos JSONB,
    url_imagen_scan TEXT,
    observaciones JSONB,
    estado VARCHAR(30) DEFAULT 'pendiente_asignacion', -- pendiente_asignacion, pendiente_validacion, procesado, descartado
    motivo_pendiente TEXT, -- Por qué no se pudo procesar automáticamente
    creado_por VARCHAR(50) REFERENCES usuarios(id_usuario),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    procesado_en TIMESTAMP,
    procesado_por VARCHAR(50) REFERENCES usuarios(id_usuario)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_examenes_pendientes_estado ON examenes_pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_examenes_pendientes_academia ON examenes_pendientes(id_academia);
CREATE INDEX IF NOT EXISTS idx_examenes_pendientes_salon ON examenes_pendientes(id_salon);
CREATE INDEX IF NOT EXISTS idx_examenes_pendientes_codigo ON examenes_pendientes(codigo_examen);

-- Comentario
COMMENT ON TABLE examenes_pendientes IS 'Exámenes OMR que no se pudieron procesar automáticamente y requieren asignación manual del profesor';
COMMENT ON COLUMN examenes_pendientes.estado IS 'pendiente_asignacion: espera que profesor asigne alumno | pendiente_validacion: profesor ya asignó, espera confirmación | procesado: ya se guardó en resultados | descartado: no válido';
