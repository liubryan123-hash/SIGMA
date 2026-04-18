const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { verificarToken, verificarSuperAdmin, verificarRoles } = require('../middleware/authMiddleware');
const { registrarLog } = require('./audit');
const { ensureFoundationSchema, seedAcademyModules } = require('../db/foundation');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

router.use(verificarToken);

// Middlewares locales para segmentar acceso al panel maestro
const soloSuperAdmin = verificarSuperAdmin;
const equipoMesa = verificarRoles('superadmin', 'admin_soporte', 'soporte_comercial', 'agencia_marketing');

// ==== MODULOS CRITICOS (Solo Creador del SaaS) ====
router.use('/academias', soloSuperAdmin);
router.use('/usuarios', soloSuperAdmin);
router.use('/planes', soloSuperAdmin);
router.use('/stats', equipoMesa);

// ==== MODULOS OPERATIVOS (Gestión de Cliente) ====
router.use('/sugerencias', equipoMesa);
router.use('/inbox', equipoMesa);

router.get('/academias', async (req, res) => {
  try {
    await ensureFoundationSchema(pool);

    const { rows } = await pool.query(`
      SELECT
        a.*,
        COUNT(u.id_usuario) FILTER (WHERE u.rol = 'alumno' AND u.activo) AS total_alumnos,
        COUNT(u.id_usuario) FILTER (WHERE u.rol = 'profesor' AND u.activo) AS total_profesores,
        COUNT(u.id_usuario) FILTER (WHERE u.rol = 'secretaria' AND u.activo) AS total_secretarias,
        COUNT(u.id_usuario) FILTER (WHERE u.rol = 'director' AND u.activo) AS total_directores
      FROM academias a
      LEFT JOIN usuarios u ON u.id_academia = a.id_academia
      GROUP BY a.id_academia
      ORDER BY a.fecha_creacion DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: `Error listando academias: ${error.message}` });
  }
});

router.post('/academias', async (req, res) => {
  const {
    id_academia,
    nombre,
    slug,
    brand_primary_color,
    brand_secondary_color,
    brand_accent_color,
    plan_activo,
  } = req.body;

  if (!id_academia || !nombre || !slug) {
    return res.status(400).json({ error: 'ID, nombre y slug son obligatorios.' });
  }

  try {
    await ensureFoundationSchema(pool);

    const { rows } = await pool.query(
      `
        INSERT INTO academias (
          id_academia, nombre, slug, brand_primary_color, brand_secondary_color, brand_accent_color, plan_activo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        id_academia,
        nombre,
        slug,
        brand_primary_color || '#3b82f6',
        brand_secondary_color || '#0f172a',
        brand_accent_color || '#38bdf8',
        plan_activo || 'basico',
      ]
    );

    await seedAcademyModules(pool, id_academia);
    await registrarLog(req.usuario.id_usuario, id_academia, 'CREACION_ACADEMIA', `Se creo la academia ${nombre}`, req.ip);

    res.status(201).json({
      mensaje: 'Academia creada exitosamente.',
      academia: rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una academia con ese ID o slug.' });
    }
    res.status(500).json({ error: `Error creando academia: ${error.message}` });
  }
});

router.put('/academias/:id_academia', async (req, res) => {
  const {
    nombre,
    slug,
    brand_primary_color,
    brand_secondary_color,
    brand_accent_color,
    plan_activo,
    activo,
    logo_url,
    background_url,
    theme_variant,
    soporte_habilitado,
  } = req.body;

  try {
    await ensureFoundationSchema(pool);

    const { rows } = await pool.query(
      `
        UPDATE academias
        SET
          nombre = COALESCE($1, nombre),
          slug = COALESCE($2, slug),
          brand_primary_color = COALESCE($3, brand_primary_color),
          brand_secondary_color = COALESCE($4, brand_secondary_color),
          brand_accent_color = COALESCE($5, brand_accent_color),
          plan_activo = COALESCE($6, plan_activo),
          activo = COALESCE($7, activo),
          logo_url = COALESCE($8, logo_url),
          background_url = COALESCE($9, background_url),
          theme_variant = COALESCE($10, theme_variant),
          soporte_habilitado = COALESCE($11, soporte_habilitado)
        WHERE id_academia = $12
        RETURNING *
      `,
      [
        nombre,
        slug,
        brand_primary_color,
        brand_secondary_color,
        brand_accent_color,
        plan_activo,
        activo,
        logo_url,
        background_url,
        theme_variant,
        soporte_habilitado,
        req.params.id_academia,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Academia no encontrada.' });
    }

    await registrarLog(req.usuario.id_usuario, req.params.id_academia, 'ACTUALIZACION_ACADEMIA', `Actualizacion de parametros de ${rows[0].nombre}`, req.ip);
    res.json({ mensaje: 'Academia actualizada.', academia: rows[0] });
  } catch (error) {
    res.status(500).json({ error: `Error actualizando academia: ${error.message}` });
  }
});

router.delete('/academias/:id_academia', async (req, res) => {
  try {
    await pool.query('UPDATE academias SET activo = false WHERE id_academia = $1', [req.params.id_academia]);
    res.json({ mensaje: 'Academia desactivada.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/academias/:id_academia/modulos', async (req, res) => {
  try {
    await seedAcademyModules(pool, req.params.id_academia);
    const { rows } = await pool.query(
      `
        SELECT *
        FROM academia_modulos
        WHERE id_academia = $1
        ORDER BY codigo_modulo ASC
      `,
      [req.params.id_academia]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: `Error cargando modulos: ${error.message}` });
  }
});

router.put('/academias/:id_academia/modulos', async (req, res) => {
  const { modulos } = req.body;

  if (!Array.isArray(modulos)) {
    return res.status(400).json({ error: 'Debes enviar una lista de modulos.' });
  }

  try {
    await seedAcademyModules(pool, req.params.id_academia);

    for (const modulo of modulos) {
      await pool.query(
        `
          UPDATE academia_modulos
          SET
            habilitado = COALESCE($1, habilitado),
            nombre_visible = COALESCE($2, nombre_visible),
            requiere_aprobacion = COALESCE($3, requiere_aprobacion),
            precio_referencial = COALESCE($4, precio_referencial),
            configuracion = COALESCE($5, configuracion),
            fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_academia = $6 AND codigo_modulo = $7
        `,
        [
          modulo.habilitado,
          modulo.nombre_visible,
          modulo.requiere_aprobacion,
          modulo.precio_referencial,
          modulo.configuracion ? JSON.stringify(modulo.configuracion) : null,
          req.params.id_academia,
          modulo.codigo_modulo,
        ]
      );
    }

    await registrarLog(req.usuario.id_usuario, req.params.id_academia, 'ACTUALIZACION_MODULOS', 'Se actualizo la configuracion de modulos por academia', req.ip);
    res.json({ mensaje: 'Modulos actualizados correctamente.' });
  } catch (error) {
    res.status(500).json({ error: `Error actualizando modulos: ${error.message}` });
  }
});

router.get('/usuarios/:id_academia', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          u.id_usuario,
          u.nombre_completo,
          u.email,
          u.rol,
          u.activo,
          u.id_salon,
          s.nombre_salon,
          c.nombre_ciclo
        FROM usuarios u
        LEFT JOIN salones s ON u.id_salon = s.id_salon
        LEFT JOIN ciclos c ON s.id_ciclo = c.id_ciclo
        WHERE u.id_academia = $1
        ORDER BY u.rol, u.nombre_completo
      `,
      [req.params.id_academia]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/usuarios', async (req, res) => {
  const { rol, id_academia } = req.query;

  try {
    let query = `
      SELECT
        u.id_usuario,
        u.nombre_completo,
        u.email,
        u.rol,
        u.activo,
        u.id_academia,
        a.nombre AS nombre_academia
      FROM usuarios u
      LEFT JOIN academias a ON u.id_academia = a.id_academia
      WHERE 1 = 1
    `;
    const values = [];

    if (rol) {
      values.push(rol);
      query += ` AND u.rol = $${values.length}`;
    }

    if (id_academia) {
      values.push(id_academia);
      query += ` AND u.id_academia = $${values.length}`;
    }

    query += ' ORDER BY u.rol, u.nombre_completo';

    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/usuarios', async (req, res) => {
  const { id_usuario, nombre_completo, email, password, rol, id_academia, id_salon } = req.body;

  if (!nombre_completo || !password || !rol || !id_academia) {
    return res.status(400).json({ error: 'nombre_completo, password, rol e id_academia son obligatorios.' });
  }

  const rolesValidos = [
    'superadmin', 'admin_soporte', 'soporte_comercial', 'agencia_marketing',
    'director', 'secretaria', 'profesor', 'tutor', 'padre', 'marketing_academia', 'alumno',
  ];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: `Rol invalido. Usa: ${rolesValidos.join(', ')}` });
  }

  try {
    if (email) {
      const existingEmail = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
      }
    }

    let finalId = id_usuario?.trim() || null;
    if (finalId) {
      const existingId = await pool.query('SELECT 1 FROM usuarios WHERE id_usuario = $1', [finalId]);
      if (existingId.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese ID.' });
      }
    } else {
      const prefijos = {
        superadmin: 'ROOT',
        admin_soporte: 'SOP',
        soporte_comercial: 'SOC',
        agencia_marketing: 'MKT',
        director: 'DIR',
        secretaria: 'SEC',
        profesor: 'PROF',
        tutor: 'TUT',
        marketing_academia: 'MKA',
        alumno: 'ALU',
      };
      finalId = `${prefijos[rol] || 'USR'}-${Date.now().toString(36).toUpperCase()}`;
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `
        INSERT INTO usuarios (id_usuario, id_academia, id_salon, rol, nombre_completo, email, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id_usuario, nombre_completo, email, rol, activo
      `,
      [finalId, id_academia, id_salon || null, rol, nombre_completo, email || null, hash]
    );

    res.status(201).json({
      mensaje: `Usuario creado correctamente. Codigo: ${finalId}`,
      usuario: rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: `Error creando usuario: ${error.message}` });
  }
});

router.put('/usuarios/:id_usuario', async (req, res) => {
  const { nombre_completo, email, rol, id_academia, id_salon, activo, password } = req.body;

  try {
    let hash = null;
    if (password) hash = await bcrypt.hash(password, 10);

    await pool.query(
      `
        UPDATE usuarios
        SET
          nombre_completo = COALESCE($1, nombre_completo),
          email = COALESCE($2, email),
          rol = COALESCE($3, rol),
          id_academia = COALESCE($4, id_academia),
          id_salon = $5,
          activo = COALESCE($6, activo),
          password_hash = COALESCE($7, password_hash)
        WHERE id_usuario = $8
      `,
      [nombre_completo, email, rol, id_academia, id_salon || null, activo, hash, req.params.id_usuario]
    );

    res.json({ mensaje: 'Usuario actualizado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: `Error actualizando usuario: ${error.message}` });
  }
});

router.delete('/usuarios/:id_usuario', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET activo = false WHERE id_usuario = $1 RETURNING nombre_completo',
      [req.params.id_usuario]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ mensaje: `"${rows[0].nombre_completo}" fue desactivado.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/usuarios/:id_usuario/reactivar', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET activo = true WHERE id_usuario = $1 RETURNING nombre_completo',
      [req.params.id_usuario]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ mensaje: `"${rows[0].nombre_completo}" fue reactivado.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint específico para cambiar rol (con auditoría)
router.put('/usuarios/:id_usuario/rol', verificarToken, async (req, res) => {
  const { rol } = req.body;
  const { id_usuario } = req.params;
  
  if (!rol) {
    return res.status(400).json({ error: 'El rol es requerido.' });
  }
  
  // Validar que el rol sea válido
  const rolesValidos = ['superadmin', 'admin_soporte', 'soporte_comercial', 'agencia_marketing', 'director', 'secretaria', 'profesor', 'tutor', 'alumno', 'marketing_academia', 'padre'];
  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol no válido.' });
  }
  
  try {
    // Obtener nombre actual del usuario
    const current = await pool.query('SELECT nombre_completo, rol FROM usuarios WHERE id_usuario = $1', [id_usuario]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    
    const usuarioNombre = current.rows[0].nombre_completo;
    const rolAnterior = current.rows[0].rol;
    
    // Actualizar rol
    await pool.query('UPDATE usuarios SET rol = $1 WHERE id_usuario = $2', [rol, id_usuario]);
    
    // Registrar en auditoría
    await registrarLog(
      req.usuario.id_usuario,
      req.usuario.id_academia,
      'CAMBIO_DE_ROL',
      `Se cambió el rol de ${usuarioNombre} de ${rolAnterior} a ${rol}`,
      req.ip
    );
    
    res.json({ mensaje: `Rol de ${usuarioNombre} cambiado de ${rolAnterior} a ${rol}.` });
  } catch (error) {
    res.status(500).json({ error: `Error cambiando rol: ${error.message}` });
  }
});

router.get('/planes', (req, res) => {
  res.json([
    {
      id: 'basico',
      nombre: 'Basico (Trial)',
      precio_mes: 'Gratuito',
      omr_mes: 200,
      max_alumnos: 30,
      features: ['200 escaneos OMR/mes', 'Hasta 30 alumnos', 'Funciones basicas'],
      color: 'slate',
    },
    {
      id: 'starter',
      nombre: 'Starter',
      precio_mes: 'S/180/mes',
      omr_mes: 200,
      max_alumnos: 80,
      setup_fee: 150,
      features: ['200 escaneos OMR/mes', 'Hasta 80 alumnos', 'CRM + pagos + comunicados'],
      color: 'blue',
    },
    {
      id: 'pro',
      nombre: 'Pro',
      precio_mes: 'S/320/mes',
      omr_mes: 500,
      max_alumnos: 300,
      setup_fee: 200,
      features: ['500 escaneos OMR/mes', 'Hasta 300 alumnos', 'Formulas universitarias', 'Analisis por pregunta'],
      color: 'indigo',
    },
    {
      id: 'academy',
      nombre: 'Academy',
      precio_mes: 'S/550/mes',
      omr_mes: -1,
      max_alumnos: -1,
      setup_fee: 300,
      features: ['OMR ilimitado', 'Alumnos ilimitados', 'Modulo tutor', 'Portal padres'],
      color: 'amber',
    },
  ]);
});

// ==========================================
// MARCAR SETUP FEE COMO PAGADO / PENDIENTE
// PUT /api/admin/academias/:id/setup-fee
// ==========================================
router.put('/academias/:id_academia/setup-fee', async (req, res) => {
  const { pagado, monto } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE academias
      SET setup_fee_pagado = $1,
          setup_fee_monto  = COALESCE($2, setup_fee_monto),
          setup_fee_fecha  = CASE WHEN $1 THEN NOW() ELSE NULL END
      WHERE id_academia = $3
      RETURNING nombre, setup_fee_pagado, setup_fee_monto, setup_fee_fecha
    `, [!!pagado, monto || null, req.params.id_academia]);
    if (!rows.length) return res.status(404).json({ error: 'Academia no encontrada.' });
    await registrarLog(req.usuario.id_usuario, req.params.id_academia, 'SETUP_FEE', `Setup fee marcado como ${pagado ? 'pagado' : 'pendiente'} para ${rows[0].nombre}`, req.ip);
    res.json({ mensaje: `Setup fee ${pagado ? 'confirmado' : 'revertido'}.`, academia: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/academias/:id_academia/plan', async (req, res) => {
  const { plan_activo } = req.body;
  const planesValidos = ['basico', 'starter', 'pro', 'academy'];
  if (!planesValidos.includes(plan_activo)) {
    return res.status(400).json({ error: 'Plan invalido. Usa: basico, starter, pro o academy.' });
  }

  try {
    const { rows } = await pool.query('UPDATE academias SET plan_activo = $1 WHERE id_academia = $2 RETURNING nombre', [plan_activo, req.params.id_academia]);
    if (!rows.length) return res.status(404).json({ error: 'Academia no encontrada.' });
    await registrarLog(req.usuario.id_usuario, req.params.id_academia, 'CAMBIO_PLAN', `Plan cambiado a ${plan_activo} para ${rows[0].nombre}`, req.ip);
    res.json({ mensaje: `Plan cambiado a "${plan_activo}" para ${rows[0].nombre}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sugerencias', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.*,
        u.nombre_completo AS nombre_usuario,
        a.nombre AS nombre_academia
      FROM sugerencias_buzon b
      JOIN usuarios u ON b.id_usuario = u.id_usuario
      JOIN academias a ON b.id_academia = a.id_academia
      ORDER BY b.fecha_creacion DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sugerencias/:id/leer', async (req, res) => {
  try {
    await pool.query('UPDATE sugerencias_buzon SET leido = true WHERE id_sugerencia = $1', [req.params.id]);
    res.json({ mensaje: 'Sugerencia marcada como leida.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sugerencias/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sugerencias_buzon WHERE id_sugerencia = $1', [req.params.id]);
    res.json({ mensaje: 'Sugerencia eliminada.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/inbox', async (req, res) => {
  const { id_academia, estado, categoria } = req.query;

  try {
    await ensureFoundationSchema(pool);

    const values = [];
    const filters = [];

    if (id_academia) {
      values.push(id_academia);
      filters.push(`x.id_academia = $${values.length}`);
    }

    if (estado) {
      values.push(estado);
      filters.push(`x.estado = $${values.length}`);
    }

    if (categoria) {
      values.push(categoria);
      filters.push(`x.categoria = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `
        SELECT *
        FROM (
          SELECT
            CONCAT('sugerencia-', b.id_sugerencia) AS inbox_id,
            'sugerencia' AS origen,
            b.id_academia,
            a.nombre AS academia_nombre,
            b.id_usuario AS id_creador,
            u.nombre_completo AS creador_nombre,
            b.tipo AS categoria,
            b.tipo AS subtipo,
            LEFT(b.mensaje, 120) AS titulo,
            b.mensaje AS descripcion,
            CASE WHEN b.leido THEN 'revisado' ELSE 'pendiente' END AS estado,
            NULL::VARCHAR AS destino_equipo,
            NULL::VARCHAR AS prioridad,
            b.fecha_creacion
          FROM sugerencias_buzon b
          JOIN usuarios u ON u.id_usuario = b.id_usuario
          LEFT JOIN academias a ON a.id_academia = b.id_academia

          UNION ALL

          SELECT
            CONCAT('marketing-', s.id_solicitud) AS inbox_id,
            'marketing' AS origen,
            s.id_academia,
            a.nombre AS academia_nombre,
            s.id_solicitante AS id_creador,
            u.nombre_completo AS creador_nombre,
            'marketing' AS categoria,
            COALESCE(c.categoria, 'marketing') AS subtipo,
            COALESCE(s.titulo, c.nombre, 'Solicitud de marketing') AS titulo,
            s.detalles AS descripcion,
            s.estado,
            'marketing' AS destino_equipo,
            'media' AS prioridad,
            s.fecha_creacion
          FROM solicitudes_marketing s
          JOIN usuarios u ON u.id_usuario = s.id_solicitante
          LEFT JOIN academias a ON a.id_academia = s.id_academia
          LEFT JOIN catalogo_servicios c ON c.id_servicio = s.id_servicio_ref

          UNION ALL

          SELECT
            CONCAT('ticket-', so.id_solicitud) AS inbox_id,
            'ticket' AS origen,
            so.id_academia,
            a.nombre AS academia_nombre,
            so.id_creador,
            u.nombre_completo AS creador_nombre,
            so.categoria,
            so.subtipo,
            so.titulo,
            so.descripcion,
            so.estado,
            so.destino_equipo,
            so.prioridad,
            so.fecha_creacion
          FROM solicitudes_operativas so
          LEFT JOIN usuarios u ON u.id_usuario = so.id_creador
          LEFT JOIN academias a ON a.id_academia = so.id_academia
        ) x
        ${whereClause}
        ORDER BY x.fecha_creacion DESC
      `,
      values
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: `Error cargando inbox: ${error.message}` });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [academiasRes, usuariosRes, examenesRes, graficaRes] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE activo) AS activos FROM academias'),
      pool.query('SELECT rol, COUNT(*) AS total FROM usuarios WHERE activo GROUP BY rol'),
      pool.query('SELECT COUNT(*) AS total FROM resultados'),
      pool.query(`
        SELECT
          TO_CHAR(fecha_procesamiento, 'DD/MM') AS fecha,
          COUNT(*) AS total
        FROM resultados
        WHERE fecha_procesamiento >= CURRENT_DATE - INTERVAL '15 days'
        GROUP BY fecha
        ORDER BY MIN(fecha_procesamiento) ASC
      `),
    ]);

    const usuariosPorRol = {};
    usuariosRes.rows.forEach((row) => {
      usuariosPorRol[row.rol] = parseInt(row.total, 10);
    });

    res.json({
      academias: {
        total: parseInt(academiasRes.rows[0].total, 10),
        activas: parseInt(academiasRes.rows[0].activos, 10),
      },
      usuarios: usuariosPorRol,
      examenes_procesados: parseInt(examenesRes.rows[0].total, 10),
      grafica_uso: graficaRes.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Permisos de roles por academia ──────────────────────────────────────────

router.get('/academias/:id_academia/permisos-roles', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT permisos_roles FROM academias WHERE id_academia = $1',
      [req.params.id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Academia no encontrada.' });
    res.json({ permisos_roles: rows[0].permisos_roles || {} });
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo permisos: ' + err.message });
  }
});

router.put('/academias/:id_academia/permisos-roles', async (req, res) => {
  const { permisos_roles } = req.body;
  if (typeof permisos_roles !== 'object' || Array.isArray(permisos_roles)) {
    return res.status(400).json({ error: 'permisos_roles debe ser un objeto JSON.' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE academias SET permisos_roles = $1
       WHERE id_academia = $2 RETURNING id_academia, nombre, permisos_roles`,
      [JSON.stringify(permisos_roles), req.params.id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Academia no encontrada.' });
    await registrarLog(req.usuario.id_usuario, req.params.id_academia, 'PERMISOS_ROLES_UPDATE', 'Actualización de permisos por rol', req.ip);
    res.json({ mensaje: 'Permisos actualizados.', academia: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando permisos: ' + err.message });
  }
});

// ==========================================
// SALUD DE ACADEMIAS — vista de pulso global para SuperAdmin
// GET /api/admin/academias-salud
// ==========================================
router.get('/academias-salud', soloSuperAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        a.id_academia,
        a.nombre,
        a.plan_activo,
        a.fecha_creacion,
        COUNT(DISTINCT u.id_usuario) FILTER (WHERE u.rol = 'alumno' AND u.activo) AS alumnos_activos,
        COUNT(DISTINCT u.id_usuario) FILTER (WHERE u.rol = 'profesor' AND u.activo) AS profesores_activos,
        COALESCE(SUM(p.monto) FILTER (
          WHERE p.estado = 'pagado'
          AND DATE_TRUNC('month', p.fecha_pago) = DATE_TRUNC('month', NOW())
        ), 0) AS ingresos_mes,
        COUNT(p.id_pago) FILTER (
          WHERE p.estado = 'pagado'
          AND DATE_TRUNC('month', p.fecha_pago) = DATE_TRUNC('month', NOW())
        ) AS pagos_mes,
        MAX(r.fecha_procesamiento) AS ultimo_acceso,
        COUNT(r.id_resultado) FILTER (
          WHERE DATE_TRUNC('month', r.fecha_procesamiento) = DATE_TRUNC('month', NOW())
        ) AS examenes_mes
      FROM academias a
      LEFT JOIN usuarios u ON u.id_academia = a.id_academia
      LEFT JOIN pagos_crm p ON p.id_academia = a.id_academia
      LEFT JOIN resultados r ON r.id_academia = a.id_academia
      GROUP BY a.id_academia, a.nombre, a.plan_activo, a.fecha_creacion
      ORDER BY alumnos_activos DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo salud de academias: ' + err.message });
  }
});

module.exports = router;
