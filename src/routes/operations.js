const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');
const { ensureFoundationSchema } = require('../db/foundation');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

router.use(verificarToken);

const canAccessTicket = async (usuario, idSolicitud) => {
  if (['superadmin', 'admin', 'admin_soporte'].includes(usuario.rol)) return true;

  const { rows } = await pool.query(
    `
      SELECT 1
      FROM solicitudes_operativas
      WHERE id_solicitud = $1
        AND (
          id_creador = $2
          OR id_academia = $3
        )
      LIMIT 1
    `,
    [idSolicitud, usuario.id_usuario, usuario.id_academia]
  );

  return rows.length > 0;
};

router.post('/tickets', async (req, res) => {
  const {
    categoria,
    subtipo,
    titulo,
    descripcion,
    prioridad,
    destino_equipo,
    metadata,
  } = req.body;

  if (!categoria || !titulo) {
    return res.status(400).json({ error: 'categoria y titulo son obligatorios.' });
  }

  try {
    await ensureFoundationSchema(pool);

    const initialState = ['superadmin', 'admin', 'admin_soporte'].includes(req.usuario.rol)
      ? 'en_revision'
      : 'pendiente_aprobacion';

    const { rows } = await pool.query(
      `
        INSERT INTO solicitudes_operativas (
          id_academia,
          id_creador,
          categoria,
          subtipo,
          titulo,
          descripcion,
          prioridad,
          estado,
          destino_equipo,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        req.usuario.id_academia || null,
        req.usuario.id_usuario,
        categoria,
        subtipo || null,
        titulo,
        descripcion || null,
        prioridad || 'media',
        initialState,
        destino_equipo || 'soporte',
        metadata ? JSON.stringify(metadata) : '{}',
      ]
    );

    await pool.query(
      `
        INSERT INTO solicitud_mensajes (id_solicitud, id_usuario, mensaje, es_interno)
        VALUES ($1, $2, $3, $4)
      `,
      [
        rows[0].id_solicitud,
        req.usuario.id_usuario,
        descripcion || titulo,
        false,
      ]
    );

    res.status(201).json({
      mensaje: 'Solicitud registrada correctamente.',
      ticket: rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: `Error creando solicitud: ${error.message}` });
  }
});

router.get('/tickets/mios', async (req, res) => {
  try {
    await ensureFoundationSchema(pool);

    let query = `
      SELECT
        so.*,
        a.nombre AS academia_nombre,
        u.nombre_completo AS creador_nombre
      FROM solicitudes_operativas so
      LEFT JOIN academias a ON a.id_academia = so.id_academia
      LEFT JOIN usuarios u ON u.id_usuario = so.id_creador
    `;
    const values = [];

    if (['superadmin', 'admin', 'admin_soporte'].includes(req.usuario.rol)) {
      query += ' ORDER BY so.fecha_creacion DESC';
    } else {
      values.push(req.usuario.id_academia, req.usuario.id_usuario);
      query += `
        WHERE so.id_academia = $1 OR so.id_creador = $2
        ORDER BY so.fecha_creacion DESC
      `;
    }

    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: `Error cargando tickets: ${error.message}` });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    await ensureFoundationSchema(pool);

    const allowed = await canAccessTicket(req.usuario, req.params.id);
    if (!allowed) {
      return res.status(403).json({ error: 'No tienes acceso a esta solicitud.' });
    }

    const ticketRes = await pool.query(
      `
        SELECT
          so.*,
          a.nombre AS academia_nombre,
          u.nombre_completo AS creador_nombre,
          asignado.nombre_completo AS asignado_nombre,
          aprobador.nombre_completo AS aprobador_nombre
        FROM solicitudes_operativas so
        LEFT JOIN academias a ON a.id_academia = so.id_academia
        LEFT JOIN usuarios u ON u.id_usuario = so.id_creador
        LEFT JOIN usuarios asignado ON asignado.id_usuario = so.asignado_a
        LEFT JOIN usuarios aprobador ON aprobador.id_usuario = so.aprobada_por
        WHERE so.id_solicitud = $1
      `,
      [req.params.id]
    );

    const messagesRes = await pool.query(
      `
        SELECT
          sm.*,
          u.nombre_completo,
          u.rol
        FROM solicitud_mensajes sm
        LEFT JOIN usuarios u ON u.id_usuario = sm.id_usuario
        WHERE sm.id_solicitud = $1
        ORDER BY sm.fecha_creacion ASC
      `,
      [req.params.id]
    );

    if (!ticketRes.rows.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    res.json({
      ticket: ticketRes.rows[0],
      mensajes: messagesRes.rows,
    });
  } catch (error) {
    res.status(500).json({ error: `Error cargando solicitud: ${error.message}` });
  }
});

router.post('/tickets/:id/mensajes', async (req, res) => {
  const { mensaje, adjuntos_urls, es_interno } = req.body;
  if (!mensaje) {
    return res.status(400).json({ error: 'El mensaje es obligatorio.' });
  }

  try {
    await ensureFoundationSchema(pool);

    const allowed = await canAccessTicket(req.usuario, req.params.id);
    if (!allowed) {
      return res.status(403).json({ error: 'No tienes acceso a esta solicitud.' });
    }

    const internalAllowed = ['superadmin', 'admin', 'admin_soporte'].includes(req.usuario.rol);

    const { rows } = await pool.query(
      `
        INSERT INTO solicitud_mensajes (id_solicitud, id_usuario, mensaje, adjuntos_urls, es_interno)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        req.params.id,
        req.usuario.id_usuario,
        mensaje,
        JSON.stringify(adjuntos_urls || []),
        internalAllowed ? Boolean(es_interno) : false,
      ]
    );

    await pool.query(
      'UPDATE solicitudes_operativas SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_solicitud = $1',
      [req.params.id]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: `Error agregando mensaje: ${error.message}` });
  }
});

router.put('/tickets/:id/estado', verificarRoles('superadmin', 'admin', 'admin_soporte'), async (req, res) => {
  const { estado, asignado_a, aprobado } = req.body;

  try {
    await ensureFoundationSchema(pool);

    const { rows } = await pool.query(
      `
        UPDATE solicitudes_operativas
        SET
          estado = COALESCE($1, estado),
          asignado_a = COALESCE($2, asignado_a),
          aprobada_por = CASE WHEN $3 = true THEN $4 ELSE aprobada_por END,
          fecha_aprobacion = CASE WHEN $3 = true THEN CURRENT_TIMESTAMP ELSE fecha_aprobacion END,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_solicitud = $5
        RETURNING *
      `,
      [estado, asignado_a, aprobado, req.usuario.id_usuario, req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: `Error actualizando estado: ${error.message}` });
  }
});

module.exports = router;
