require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  try {
    console.log('⏳ Leyendo el documento de arquitectura schema.sql...');
    const schema = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    
    console.log('⏳ Volcando y construyendo todas las tablas en su VPS...');
    await pool.query(schema);
    
    console.log('⏳ Sembrando la "Academia Demo" base para registrar su usuario...');
    await pool.query(`
      INSERT INTO academias (id_academia, nombre, slug, brand_primary_color)
      VALUES ('ACAD-PRUEBA', 'Academia Demo', 'acad-prueba', '#38bdf8')
      ON CONFLICT (id_academia) DO NOTHING;
    `);
    
    console.log('✅ ¡Construcción Exitosa! El terreno PostgreSQL ya tiene las tablas.');
  } catch (err) {
    console.error('❌ Error construyendo las tablas en el remoto:', err.stack);
  } finally {
    pool.end();
  }
}
run();
