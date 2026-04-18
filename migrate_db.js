const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const sql = `
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
    id_usuario_convertido VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Auditoría
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id_log SERIAL PRIMARY KEY,
    id_usuario VARCHAR(50),
    id_academia VARCHAR(50),
    accion VARCHAR(100) NOT NULL,
    detalles TEXT,
    ip_address VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function migrate() {
  try {
    console.log('Iniciando migración de tablas faltantes...');
    await pool.query(sql);
    console.log('✅ Tablas creadas/verificadas exitosamente.');
  } catch (e) {
    console.error('❌ Error en migración:', e.message);
  } finally {
    await pool.end();
  }
}

migrate();
function getH() { return { 'Authorization': 'Bearer ' + localStorage.getItem('edusaas_token'), 'Content-Type': 'application/json' }; }
