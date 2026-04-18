const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false,
});

async function patch() {
  try {
    console.log('Aplicando patch: columna codigo_examen en tabla resultados...');
    await pool.query(`
      ALTER TABLE resultados 
      ADD COLUMN IF NOT EXISTS codigo_examen VARCHAR(100)
    `);
    console.log('✅ Columna codigo_examen agregada exitosamente.');
    
    // Verificar columnas actuales de resultados
    const { rows } = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'resultados' ORDER BY ordinal_position
    `);
    console.log('Columnas actuales de la tabla resultados:', rows.map(r => r.column_name).join(', '));
  } catch(e) {
    console.error('Error en patch:', e.message);
  } finally {
    await pool.end();
  }
}

patch();
