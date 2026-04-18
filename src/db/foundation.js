async function ensureFoundationSchema(pool) {
  await pool.query(`
    ALTER TABLE academias
    ADD COLUMN IF NOT EXISTS brand_secondary_color VARCHAR(7) DEFAULT '#0f172a',
    ADD COLUMN IF NOT EXISTS brand_accent_color VARCHAR(7) DEFAULT '#38bdf8',
    ADD COLUMN IF NOT EXISTS theme_variant VARCHAR(50) DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS soporte_habilitado BOOLEAN DEFAULT TRUE;
  `);

  await pool.query(`
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
  `);

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS solicitud_mensajes (
      id_mensaje SERIAL PRIMARY KEY,
      id_solicitud INTEGER NOT NULL REFERENCES solicitudes_operativas(id_solicitud) ON DELETE CASCADE,
      id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      mensaje TEXT NOT NULL,
      adjuntos_urls JSONB DEFAULT '[]'::jsonb,
      es_interno BOOLEAN DEFAULT FALSE,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS material_didactico (
      id_material SERIAL PRIMARY KEY,
      id_academia VARCHAR(50) REFERENCES academias(id_academia) ON DELETE CASCADE,
      id_salon INTEGER REFERENCES salones(id_salon) ON DELETE CASCADE,
      id_autor VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      titulo VARCHAR(180) NOT NULL,
      tipo_material VARCHAR(20) DEFAULT 'pdf',
      url_recurso TEXT NOT NULL,
      materia VARCHAR(80),
      descripcion TEXT,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comunidad_comentarios (
      id_comentario SERIAL PRIMARY KEY,
      id_publicacion INTEGER REFERENCES comunidad_publicaciones(id_publicacion) ON DELETE CASCADE,
      id_autor VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      contenido TEXT NOT NULL,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comunidad_reacciones (
      id_publicacion INTEGER REFERENCES comunidad_publicaciones(id_publicacion) ON DELETE CASCADE,
      id_autor VARCHAR(50) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      tipo_reaccion VARCHAR(20) DEFAULT 'like',
      PRIMARY KEY (id_publicacion, id_autor)
    );
  `);
}

const DEFAULT_MODULES = [
  { codigo_modulo: 'examenes', nombre_visible: 'Revision de examenes', configurable: true },
  { codigo_modulo: 'portal_alumno', nombre_visible: 'Portal del alumno', configurable: true },
  { codigo_modulo: 'portal_profesor', nombre_visible: 'Portal del profesor', configurable: true },
  { codigo_modulo: 'crm', nombre_visible: 'CRM de academia', configurable: true },
  { codigo_modulo: 'comunidad', nombre_visible: 'Comunidad interna', configurable: true },
  { codigo_modulo: 'finanzas', nombre_visible: 'Finanzas y recibos', configurable: true },
  { codigo_modulo: 'asistencia', nombre_visible: 'Control de asistencia', configurable: true },
  { codigo_modulo: 'branding_personalizado', nombre_visible: 'Branding personalizado', configurable: true, requiere_aprobacion: true },
];

async function seedAcademyModules(pool, idAcademia) {
  await ensureFoundationSchema(pool);

  for (const modulo of DEFAULT_MODULES) {
    await pool.query(
      `
        INSERT INTO academia_modulos (
          id_academia, codigo_modulo, nombre_visible, configurable, requiere_aprobacion
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id_academia, codigo_modulo) DO NOTHING
      `,
      [
        idAcademia,
        modulo.codigo_modulo,
        modulo.nombre_visible,
        modulo.configurable ?? true,
        modulo.requiere_aprobacion ?? false,
      ]
    );
  }
}

module.exports = {
  ensureFoundationSchema,
  seedAcademyModules,
  DEFAULT_MODULES,
};
