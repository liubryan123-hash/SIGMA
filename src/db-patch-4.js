const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: false,
});

async function patch() {
  try {
    console.log('Aplicando patch: tabla sugerencias_buzon...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sugerencias_buzon (
        id_sugerencia SERIAL PRIMARY KEY,
        id_usuario VARCHAR(50) REFERENCES usuarios(id_usuario),
        id_academia VARCHAR(50) REFERENCES academias(id_academia),
        tipo VARCHAR(20) DEFAULT 'sugerencia',
        mensaje TEXT NOT NULL,
        leido BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla sugerencias_buzon lista.');

    const count = await pool.query('SELECT count(*) FROM sugerencias_buzon');
    if (count.rows[0].count === '0') {
      console.log('Insertando sugerencias de prueba...');
      const users = await pool.query(
        "SELECT id_usuario, id_academia FROM usuarios WHERE rol != 'superadmin' LIMIT 2"
      );

      if (users.rows.length > 0) {
        await pool.query(
          `
            INSERT INTO sugerencias_buzon (id_usuario, id_academia, tipo, mensaje)
            VALUES
              ($1, $2, 'sugerencia', 'Me gustaria que el scanner reconozca tambien codigos de 8 digitos.'),
              ($1, $2, 'error', 'El boton de reportes a veces demora en cargar el PDF.')
          `,
          [users.rows[0].id_usuario, users.rows[0].id_academia]
        );
      }
    }
  } catch (e) {
    console.error('Error en patch:', e.message);
  } finally {
    await pool.end();
  }
}

patch();
