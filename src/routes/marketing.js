const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken, verificarSuperAdmin, verificarRoles } = require('../middleware/authMiddleware');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

// 1. Ver catalogo de servicios disponibles
router.get('/catalogo', verificarToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM catalogo_servicios WHERE activo = TRUE ORDER BY id_servicio ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el catalogo de servicios.' });
  }
});

// 2. Solicitar un servicio de marketing
router.post('/solicitar', verificarToken, async (req, res) => {
  const { id_servicio_ref, id_servicio, titulo, detalles } = req.body;
  const id_solicitante = req.usuario.id_usuario;
  const id_academia = req.usuario.id_academia;
  const servicioRef = id_servicio_ref || id_servicio;

  if (!id_academia) {
    return res.status(403).json({ error: 'Solo directores de academia pueden solicitar servicios.' });
  }

  if (!servicioRef || !titulo) {
    return res.status(400).json({ error: 'Servicio y titulo son obligatorios.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO solicitudes_marketing (id_academia, id_solicitante, id_servicio_ref, titulo, detalles) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id_academia, id_solicitante, servicioRef, titulo, detalles]
    );
    res.json({ mensaje: 'Solicitud enviada con exito. El equipo de Antigravity la revisara pronto.', solicitud: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar la solicitud de marketing.' });
  }
});

// 3. Ver mis solicitudes enviadas
const listarSolicitudesAcademia = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, c.nombre as servicio_nombre FROM solicitudes_marketing s LEFT JOIN catalogo_servicios c ON s.id_servicio_ref = c.id_servicio WHERE s.id_academia = $1 ORDER BY s.fecha_creacion DESC',
      [req.usuario.id_academia]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus solicitudes.' });
  }
};

router.get('/mis-solicitudes', verificarToken, listarSolicitudesAcademia);
router.get('/solicitudes', verificarToken, listarSolicitudesAcademia);

// 4. Ver todas las solicitudes del sistema
router.get('/admin/solicitudes', verificarToken, verificarRoles('superadmin', 'admin_soporte'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT s.*, a.nombre as academia_nombre, u.nombre_completo as solicitante_nombre FROM solicitudes_marketing s JOIN academias a ON s.id_academia = a.id_academia JOIN usuarios u ON s.id_solicitante = u.id_usuario ORDER BY s.fecha_creacion DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener solicitudes globales.' });
  }
});

// 5. Gestionar catalogo
router.post('/admin/servicios', verificarToken, verificarSuperAdmin, async (req, res) => {
  const { nombre, descripcion, precio_base, categoria } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO catalogo_servicios (nombre, descripcion, precio_base, categoria) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, descripcion, precio_base, categoria]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear servicio en catalogo.' });
  }
});

// 6. Actualizar estado de solicitud y presupuesto
router.put('/admin/solicitudes/:id', verificarToken, verificarRoles('superadmin', 'admin_soporte'), async (req, res) => {
  const { id } = req.params;
  const { estado, presupuesto_acordado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE solicitudes_marketing SET estado = $1, presupuesto_acordado = $2 WHERE id_solicitud = $3 RETURNING *',
      [estado, presupuesto_acordado, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la solicitud.' });
  }
});

module.exports = router;
