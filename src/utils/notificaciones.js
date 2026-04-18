const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.database);

/**
 * Crea una notificación para un usuario.
 * Silencia errores para no interrumpir el flujo principal si la tabla no existe aún.
 */
async function crearNotificacion(id_usuario, id_academia, tipo, titulo, mensaje, accion_tab = null) {
  try {
    await pool.query(
      `INSERT INTO notificaciones (id_usuario, id_academia, tipo, titulo, mensaje, accion_tab)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id_usuario, id_academia, tipo, titulo, mensaje, accion_tab]
    );
  } catch (err) {
    if (err.code !== '42P01') console.error('Error creando notificación:', err.message);
  }
}

module.exports = { crearNotificacion };
