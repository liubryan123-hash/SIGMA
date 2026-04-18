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
    console.log('⏳ Parcheando la Base de Datos PostgreSQL de Hostinger en caliente...');
    await pool.query(`ALTER TABLE resultados ADD COLUMN IF NOT EXISTS url_imagen_scan TEXT;`);
    await pool.query(`ALTER TABLE resultados ADD COLUMN IF NOT EXISTS observaciones JSONB;`);
    console.log('✅ Archivo alterado. PostgreSQL soportará urls imagenes y observaciones en JSON.');
  } catch(e) {
    console.error('❌ Falló parche SQL', e.message);
  } finally {
    pool.end();
  }
}
execPatch();
