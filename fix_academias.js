const { Pool } = require('pg');
const pool = new Pool({
  host: '172.19.0.1',
  user: 'edusaas_admin',
  password: 'SaaS2026',
  database: 'edusaas_db',
  port: 5432
});

async function run() {
  try {
    await pool.query("INSERT INTO academias (id_academia, nombre, slug) VALUES (1, 'Academia Demo', 'demo') ON CONFLICT DO NOTHING");
    await pool.query("INSERT INTO usuarios (id_usuario, nombre_completo, email, password_hash, rol, id_academia) VALUES (1, 'Admin', 'admin@demo.com', '123', 'admin', 1) ON CONFLICT DO NOTHING");
    console.log('OK');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
