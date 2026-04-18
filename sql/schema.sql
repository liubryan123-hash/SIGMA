-- SaaS 3.0 Schema Completo (Multi-Tenancy Avanzado con CRM y Hub Social)

CREATE TABLE academias (
    id_academia VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    plan_activo VARCHAR(20) DEFAULT 'basico',
    brand_primary_color VARCHAR(7) DEFAULT '#ef4444',
    brand_secondary_color VARCHAR(7) DEFAULT '#0f172a',
    brand_accent_color VARCHAR(7) DEFAULT '#38bdf8',
    dark_mode_enabled BOOLEAN DEFAULT FALSE,
    theme_variant VARCHAR(50) DEFAULT 'default',
    logo_url TEXT,
    background_url TEXT,
    soporte_habilitado BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ciclos (
    id_ciclo SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    nombre_ciclo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE salones (
    id_salon SERIAL PRIMARY KEY,
    id_ciclo INTEGER REFERENCES ciclos(id_ciclo),
    nombre_salon VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE usuarios (
    id_usuario VARCHAR(50) PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    id_salon INTEGER REFERENCES salones(id_salon),
    rol VARCHAR(20) NOT NULL, -- admin, teacher, student
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255), 
    activo BOOLEAN DEFAULT true
);

CREATE TABLE examenes_plantillas (
    codigo_examen VARCHAR(50) PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    id_creador VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_salon INTEGER REFERENCES salones(id_salon),
    nombre_simulacro VARCHAR(100) NOT NULL,
    tipo_calificacion VARCHAR(20) DEFAULT 'unmsm',
    estado VARCHAR(20) DEFAULT 'cerrado',
    fecha_apertura TIMESTAMP,
    fecha_cierre TIMESTAMP,
    claves_correctas JSONB NOT NULL,
    configuracion_cursos JSONB
);

CREATE TABLE resultados (
    id_resultado SERIAL PRIMARY KEY,
    codigo_examen VARCHAR(50) REFERENCES examenes_plantillas(codigo_examen),
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    nota_total NUMERIC(7,3) NOT NULL,
    respuestas_alumno JSONB,
    puntaje_por_cursos JSONB,
    url_imagen_scan TEXT, -- Enlace hacia la JPG física en el Disco Duro (1TB)
    observaciones JSONB, -- Logs de advertencias y penalizaciones (Borrones)
    fecha_procesamiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asistencias (
    id_asistencia SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_salon INTEGER REFERENCES salones(id_salon),
    fecha DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(20) NOT NULL, -- presente, ausente, tardanza
    validado_por VARCHAR(50) REFERENCES usuarios(id_usuario),
    fecha_validacion TIMESTAMP
);

CREATE TABLE foro_temas (
    id_tema SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    id_salon INTEGER REFERENCES salones(id_salon),
    id_autor VARCHAR(50) REFERENCES usuarios(id_usuario),
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT,
    adjuntos_urls JSONB,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE foro_respuestas (
    id_respuesta SERIAL PRIMARY KEY,
    id_tema INTEGER REFERENCES foro_temas(id_tema),
    id_autor VARCHAR(50) REFERENCES usuarios(id_usuario),
    contenido TEXT NOT NULL,
    adjuntos_urls JSONB,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pagos_crm (
    id_pago SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    monto NUMERIC(7,2) NOT NULL,
    concepto VARCHAR(100) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_pago TIMESTAMP
);

CREATE TABLE alumnos_expedientes (
    id_expediente SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    tipo_documento VARCHAR(50),
    url_archivo TEXT,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reportes_alumnos (
    id_reporte SERIAL PRIMARY KEY,
    id_alumno VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_profesor VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    motivo TEXT NOT NULL,
    solicita_bloqueo BOOLEAN DEFAULT FALSE,
    estado_revision VARCHAR(20) DEFAULT 'pendiente',
    fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE catalogo_servicios (
    id_servicio SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_base NUMERIC(10,2),
    categoria VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE solicitudes_marketing (
    id_solicitud SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    id_solicitante VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_servicio_ref INTEGER REFERENCES catalogo_servicios(id_servicio),
    titulo VARCHAR(150),
    detalles TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, en_proceso, completado
    presupuesto_acordado NUMERIC(10,2),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sugerencias_buzon (
    id_sugerencia SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    mensaje TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'sugerencia', -- sugerencia, queja, felicitacion
    leido BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_didactico (
    id_material SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    id_salon INTEGER REFERENCES salones(id_salon),
    id_autor VARCHAR(50) REFERENCES usuarios(id_usuario),
    titulo VARCHAR(150) NOT NULL,
    tipo_material VARCHAR(20) NOT NULL, -- pdf, link, video
    url_recurso TEXT NOT NULL,
    materia VARCHAR(50),
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla CRM: Prospectos
CREATE TABLE IF NOT EXISTS crm_prospectos (
    id_prospecto SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    nombre_completo VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    email VARCHAR(255),
    interes_ciclo VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'nuevo', -- 'nuevo', 'contactado', 'convertido', 'perdido'
    fuente VARCHAR(100), -- 'WhatsApp', 'Facebook', 'Referido'
    observaciones TEXT,
    id_usuario_convertido VARCHAR(50) REFERENCES usuarios(id_usuario),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Auditoría: Acciones Críticas
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id_log SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_academia VARCHAR(50) REFERENCES academias(id_academia),
    accion VARCHAR(100) NOT NULL, -- 'BLOQUEO_ALUMNO', 'ELIMINACION_ALUMNO', 'CAMBIO_NOTA'
    detalles TEXT,
    ip_address VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academia_modulos (
    id_modulo SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) NOT NULL REFERENCES academias(id_academia) ON DELETE CASCADE,
    codigo_modulo VARCHAR(50) NOT NULL,
    nombre_visible VARCHAR(100) NOT NULL,
    habilitado BOOLEAN DEFAULT TRUE,
    configurable BOOLEAN DEFAULT TRUE,
    requiere_aprobacion BOOLEAN DEFAULT FALSE,
    precio_referencial TEXT,
    configuracion JSONB DEFAULT '{}'::jsonb,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_academia, codigo_modulo)
);

CREATE TABLE IF NOT EXISTS solicitudes_operativas (
    id_solicitud SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia) ON DELETE CASCADE,
    id_creador VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    categoria VARCHAR(50) NOT NULL,
    subtipo VARCHAR(50),
    titulo VARCHAR(160) NOT NULL,
    descripcion TEXT,
    prioridad VARCHAR(20) DEFAULT 'media',
    estado VARCHAR(30) DEFAULT 'pendiente_aprobacion',
    destino_equipo VARCHAR(30) DEFAULT 'soporte',
    asignado_a VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    aprobada_por VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_aprobacion TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS solicitud_mensajes (
    id_mensaje SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL REFERENCES solicitudes_operativas(id_solicitud) ON DELETE CASCADE,
    id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    mensaje TEXT NOT NULL,
    adjuntos_urls JSONB DEFAULT '[]'::jsonb,
    es_interno BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comunidad_publicaciones (
    id_publicacion SERIAL PRIMARY KEY,
    id_academia VARCHAR(50) REFERENCES academias(id_academia) ON DELETE CASCADE,
    scope_comunidad VARCHAR(20) DEFAULT 'academia',
    id_autor VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    tipo_publicacion VARCHAR(20) DEFAULT 'texto',
    titulo VARCHAR(180),
    contenido TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]'::jsonb,
    visible BOOLEAN DEFAULT TRUE,
    fijado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
