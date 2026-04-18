const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken } = require('../middleware/authMiddleware');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

// Función utilitaria para registrar log
// Se puede exportar para usar en otras rutas
const registrarLog = async (id_usuario, id_academia, accion, detalles, ip) => {
  try {
    await pool.query(
      'INSERT INTO logs_auditoria (id_usuario, id_academia, accion, detalles, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [id_usuario, id_academia, accion, detalles, ip]
    );
  } catch (err) {
    console.error('Error al registrar log:', err);
  }
};

// Obtener logs (Solo SuperAdmin para ver todo, o Director para su academia)
router.get('/', verificarToken, async (req, res) => {
  const { rol, id_academia } = req.usuario;
  try {
    let query = 'SELECT l.*, u.nombre_completo, a.nombre as academia_nombre FROM logs_auditoria l JOIN usuarios u ON l.id_usuario = u.id_usuario LEFT JOIN academias a ON l.id_academia = a.id_academia';
    let params = [];
    
    if (rol !== 'superadmin') {
      query += ' WHERE l.id_academia = $1';
      params.push(id_academia);
    }
    
    query += ' ORDER BY l.fecha_creacion DESC LIMIT 100';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener logs.' });
  }
});

module.exports = { router, registrarLog };
