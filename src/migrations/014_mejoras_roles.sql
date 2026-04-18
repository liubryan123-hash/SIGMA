-- Migración 014: Mejoras por rol (Secretaria, Profesor, Alumno)
-- Fecha: 23 de marzo de 2026

-- Tabla para simulador de ingreso de alumnos (carreras objetivo)
CREATE TABLE IF NOT EXISTS carreras_objetivo (
    id_carrera SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    nombre_carrera VARCHAR(150) NOT NULL,
    universidad VARCHAR(100),
    puntaje_minimo INTEGER,
    puntaje_maximo INTEGER,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para log de rachas de alumnos (gamificación)
CREATE TABLE IF NOT EXISTS rachas_alumno (
    id_racha SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    tipo_racha VARCHAR(50) NOT NULL, -- 'login', 'asistencia', 'estudio', 'examen'
    racha_actual INTEGER DEFAULT 0,
    racha_maxima INTEGER DEFAULT 0,
    ultimo_registro DATE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_usuario, tipo_racha)
);

-- Tabla para badges/logros de alumnos
CREATE TABLE IF NOT EXISTS alumnos_badges (
    id_badge SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    codigo_badge VARCHAR(50) NOT NULL, -- 'primer_examen', 'asistencia_perfecta', 'top_10', etc.
    nombre_badge VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(10) DEFAULT '🏆',
    ganado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_usuario, codigo_badge)
);

-- Índice para búsquedas rápidas de rachas
CREATE INDEX IF NOT EXISTS idx_rachas_usuario ON rachas_alumno(id_usuario, tipo_racha);

-- Índice para badges
CREATE INDEX IF NOT EXISTS idx_badges_usuario ON alumnos_badges(id_usuario);

-- Comentario
COMMENT ON TABLE carreras_objetivo IS 'Carreras universitarias objetivo para simulador de ingreso de alumnos';
COMMENT ON TABLE rachas_alumno IS 'Seguimiento de rachas de alumnos (gamificación)';
COMMENT ON TABLE alumnos_badges IS 'Badges/logros desbloqueados por alumnos';
