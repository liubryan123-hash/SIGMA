const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken } = require('../middleware/authMiddleware');
const config = require('../config');

const pool = new Pool(config.database);

router.use(verificarToken);

// GET /api/notificaciones — últimas 30, no leídas primero
router.get('/', async (req, res) => {
  const { id_usuario } = req.usuario;
  try {
    const { rows } = await pool.query(
      `SELECT id_notif, tipo, titulo, mensaje, leida, accion_tab, creada_en
       FROM notificaciones
       WHERE id_usuario = $1
       ORDER BY leida ASC, creada_en DESC
       LIMIT 30`,
      [id_usuario]
    );
    res.json({ notificaciones: rows, no_leidas: rows.filter(n => !n.leida).length });
  } catch (err) {
    if (err.code === '42P01') return res.json({ notificaciones: [], no_leidas: 0 });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notificaciones/leer-todas — antes que /:id/leer para evitar conflicto de rutas
router.put('/leer-todas', async (req, res) => {
  const { id_usuario } = req.usuario;
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE id_usuario = $1 AND leida = false',
      [id_usuario]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notificaciones/:id/leer
router.put('/:id/leer', async (req, res) => {
  const { id_usuario } = req.usuario;
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE id_notif = $1 AND id_usuario = $2',
      [req.params.id, id_usuario]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
