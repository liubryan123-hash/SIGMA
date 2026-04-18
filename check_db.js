const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('--- TABLAS DETECTADAS ---');
    res.rows.forEach(r => console.log('- ' + r.table_name));
    console.log('-------------------------');
    
    // Verificar crm_prospectos específicamente
    const hasCrm = res.rows.some(r => r.table_name === 'crm_prospectos');
    if (!hasCrm) {
        console.log('⚠️ ALERTA: La tabla crm_prospectos NO existe.');
    } else {
        console.log('✅ La tabla crm_prospectos existe.');
    }
  } catch (e) {
    console.error('Error al conectar a DB:', e.message);
  } finally {
    await pool.end();
  }
}

checkTables();
