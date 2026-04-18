require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function execPatch() {
  try {
    console.log('⏳ Alterando motor Postgres...');
    await pool.query(`ALTER TABLE examenes_plantillas ADD COLUMN IF NOT EXISTS id_salon INTEGER REFERENCES salones(id_salon);`);
    await pool.query(`ALTER TABLE examenes_plantillas ADD COLUMN IF NOT EXISTS tipo_calificacion VARCHAR(20) DEFAULT 'unmsm';`);
    await pool.query(`ALTER TABLE examenes_plantillas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'cerrado';`);
    await pool.query(`ALTER TABLE examenes_plantillas ADD COLUMN IF NOT EXISTS fecha_apertura TIMESTAMP;`);
    await pool.query(`ALTER TABLE examenes_plantillas ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMP;`);
    console.log('✅ Base de datos reconfigurada con éxito.');
  } catch(e) {
    console.error('❌ Error fatal BD', e.message);
  } finally {
    pool.end();
  }
}
execPatch();
