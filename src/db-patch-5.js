const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function runPatch() {
  const client = await pool.connect();
  try {
    console.log('Iniciando Parche 5: Modulo de Marketing y Expansion de Roles...');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS catalogo_servicios (
        id_servicio SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        precio_base NUMERIC(10,2) DEFAULT 0,
        categoria VARCHAR(50),
        activo BOOLEAN DEFAULT TRUE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS solicitudes_marketing (
        id_solicitud SERIAL PRIMARY KEY,
        id_academia VARCHAR(50) REFERENCES academias(id_academia),
        id_solicitante VARCHAR(50) REFERENCES usuarios(id_usuario),
        id_servicio_ref INTEGER REFERENCES catalogo_servicios(id_servicio),
        titulo VARCHAR(200),
        detalles TEXT,
        estado VARCHAR(20) DEFAULT 'pendiente',
        presupuesto_acordado NUMERIC(10,2),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS alumnos_expedientes (
        id_expediente SERIAL PRIMARY KEY,
        id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
        tipo_documento VARCHAR(50),
        url_archivo TEXT,
        fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      INSERT INTO catalogo_servicios (nombre, descripcion, precio_base, categoria)
      SELECT * FROM (
        VALUES
          ('Campana Facebook/IG Ads', 'Gestion de pauta publicitaria para captacion de nuevos alumnos.', 150.00, 'ads'),
          ('Diseno de Brochure', 'Creacion de material digital/fisico para los ciclos academicos.', 80.00, 'diseno'),
          ('Video Promocional', 'Edicion de video testimonial o informativo de la academia.', 120.00, 'video')
      ) AS nuevos(nombre, descripcion, precio_base, categoria)
      WHERE NOT EXISTS (
        SELECT 1 FROM catalogo_servicios c WHERE c.nombre = nuevos.nombre
      );
    `);

    await client.query('COMMIT');
    console.log('Parche 5 aplicado con exito.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error en Parche 5:', e);
  } finally {
    client.release();
    process.exit();
  }
}

runPatch();
