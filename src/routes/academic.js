const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

router.use(verificarToken);

router.post('/ciclos', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { nombre_ciclo, descripcion, id_academia } = req.body;
  const academyId = req.usuario.rol === 'superadmin' ? id_academia : req.usuario.id_academia;

  if (!academyId || !nombre_ciclo) {
    return res.status(400).json({ error: 'Debes indicar la academia y el nombre del ciclo.' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO ciclos (id_academia, nombre_ciclo, descripcion) VALUES ($1, $2, $3) RETURNING *',
      [academyId, nombre_ciclo, descripcion || null]
    );
    res.status(201).json({ mensaje: 'Ciclo academico creado correctamente.', ciclo_creado: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor al guardar el ciclo.' });
  }
});

router.get('/ciclos/:id_academia', async (req, res) => {
  const academyId = req.usuario.rol === 'superadmin' ? req.params.id_academia : req.usuario.id_academia;

  try {
    const { rows } = await pool.query(
      'SELECT id_ciclo, nombre_ciclo, descripcion FROM ciclos WHERE id_academia = $1 AND activo = true ORDER BY nombre_ciclo ASC',
      [academyId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Fallo al obtener los ciclos de esta academia.' });
  }
});

router.post('/salones', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { id_ciclo, nombre_salon } = req.body;

  if (!id_ciclo || !nombre_salon) {
    return res.status(400).json({ error: 'Falta el ciclo o el nombre del salon.' });
  }

  try {
    if (req.usuario.rol !== 'superadmin') {
      const cicloCheck = await pool.query('SELECT 1 FROM ciclos WHERE id_ciclo = $1 AND id_academia = $2', [id_ciclo, req.usuario.id_academia]);
      if (!cicloCheck.rows.length) {
        return res.status(403).json({ error: 'No puedes crear salones fuera de tu academia.' });
      }
    }

    const { rows } = await pool.query(
      'INSERT INTO salones (id_ciclo, nombre_salon) VALUES ($1, $2) RETURNING *',
      [id_ciclo, nombre_salon]
    );
    res.status(201).json({ mensaje: 'Salon creado correctamente.', salon_creado: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error creando el salon.' });
  }
});

router.get('/salones/ciclo/:id_ciclo', async (req, res) => {
  try {
    if (req.usuario.rol !== 'superadmin') {
      const cicloCheck = await pool.query(
        'SELECT 1 FROM ciclos WHERE id_ciclo = $1 AND id_academia = $2',
        [req.params.id_ciclo, req.usuario.id_academia]
      );
      if (!cicloCheck.rows.length) return res.status(403).json({ error: 'Acceso denegado.' });
    }
    const { rows } = await pool.query(
      'SELECT id_salon, nombre_salon FROM salones WHERE id_ciclo = $1 AND activo = true ORDER BY nombre_salon ASC',
      [req.params.id_ciclo]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo los salones de este ciclo.' });
  }
});

router.get('/salones/academia/:id_academia', async (req, res) => {
  const academyId = req.usuario.rol === 'superadmin' ? req.params.id_academia : req.usuario.id_academia;

  try {
    const { rows } = await pool.query(
      `
        SELECT
          s.id_salon,
          s.nombre_salon,
          c.id_ciclo,
          c.nombre_ciclo
        FROM salones s
        JOIN ciclos c ON c.id_ciclo = s.id_ciclo
        WHERE c.id_academia = $1 AND s.activo = true AND c.activo = true
        ORDER BY c.nombre_ciclo, s.nombre_salon
      `,
      [academyId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo los salones de la academia.' });
  }
});

router.post('/asistencias', verificarRoles('superadmin', 'director', 'secretaria', 'profesor'), async (req, res) => {
  const { id_usuario, id_salon, estado } = req.body;
  if (!id_usuario || !id_salon || !estado) {
    return res.status(400).json({ error: 'Faltan datos del alumno, salon o estado.' });
  }

  try {
    const check = await pool.query(
      'SELECT id_asistencia FROM asistencias WHERE id_usuario = $1 AND id_salon = $2 AND fecha = CURRENT_DATE',
      [id_usuario, id_salon]
    );

    if (check.rows.length > 0) {
      await pool.query(
        'UPDATE asistencias SET estado = $1, validado_por = NULL, fecha_validacion = NULL WHERE id_asistencia = $2',
        [estado, check.rows[0].id_asistencia]
      );
      return res.json({ mensaje: 'Asistencia actualizada. Requiere nueva validacion.' });
    }

    const { rows } = await pool.query(
      'INSERT INTO asistencias (id_usuario, id_salon, fecha, estado) VALUES ($1, $2, CURRENT_DATE, $3) RETURNING *',
      [id_usuario, id_salon, estado]
    );

    res.status(201).json({ mensaje: 'Asistencia registrada correctamente.', asistencia: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor registrando asistencia.' });
  }
});

router.put('/asistencias/:id_asistencia/validar', verificarRoles('profesor', 'secretaria', 'superadmin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        UPDATE asistencias
        SET validado_por = $1, fecha_validacion = CURRENT_TIMESTAMP
        WHERE id_asistencia = $2
        RETURNING *
      `,
      [req.usuario.id_usuario, req.params.id_asistencia]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Ese registro de asistencia no existe.' });
    }

    res.json({ mensaje: 'Asistencia validada oficialmente.', asistencia: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al validar la asistencia.' });
  }
});

router.get('/asistencias/salon/:id_salon/fecha/:fecha', async (req, res) => {
  try {
    if (req.usuario.rol !== 'superadmin') {
      const salonCheck = await pool.query(
        `SELECT 1 FROM salones s
         JOIN ciclos c ON c.id_ciclo = s.id_ciclo
         WHERE s.id_salon = $1 AND c.id_academia = $2`,
        [req.params.id_salon, req.usuario.id_academia]
      );
      if (!salonCheck.rows.length) return res.status(403).json({ error: 'Acceso denegado.' });
    }
    const { rows } = await pool.query(
      `SELECT a.*, u.nombre_completo
       FROM asistencias a
       JOIN usuarios u ON a.id_usuario = u.id_usuario
       WHERE a.id_salon = $1 AND a.fecha = $2
       ORDER BY u.nombre_completo ASC`,
      [req.params.id_salon, req.params.fecha]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error consultando historial de asistencia.' });
  }
});

router.post('/sugerir', async (req, res) => {
  const { mensaje, tipo } = req.body;
  const { id_usuario, id_academia } = req.usuario;

  if (!mensaje) {
    return res.status(400).json({ error: 'El mensaje de sugerencia esta vacio.' });
  }

  try {
    await pool.query(
      'INSERT INTO sugerencias_buzon (id_usuario, id_academia, tipo, mensaje) VALUES ($1, $2, $3, $4)',
      [id_usuario, id_academia, tipo || 'sugerencia', mensaje]
    );
    res.status(201).json({ mensaje: 'Sugerencia enviada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor al enviar comentario.' });
  }
});

// ==========================================
// COMUNICADOS MASIVOS
// ==========================================
router.post('/comunicados', verificarRoles('superadmin', 'director', 'secretaria', 'profesor'), async (req, res) => {
  const { titulo, cuerpo, destinatarios } = req.body; // destinatarios: 'academia' | 'salon:ID' | 'rol:alumno'
  const { id_usuario, id_academia } = req.usuario;

  if (!titulo || !cuerpo) return res.status(400).json({ error: 'Título y cuerpo son obligatorios.' });
  if (!destinatarios) return res.status(400).json({ error: 'Debes especificar los destinatarios.' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO comunicados (id_academia, id_autor, titulo, cuerpo, destinatarios)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id_academia, id_usuario, titulo, cuerpo, destinatarios]
    );
    res.status(201).json({ mensaje: 'Comunicado enviado.', comunicado: rows[0] });
  } catch (err) {
    // Si la tabla no existe aún, error descriptivo
    if (err.code === '42P01') {
      return res.status(500).json({ error: 'Tabla comunicados pendiente de migración. Ejecuta la migración de BD.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error enviando comunicado: ' + err.message });
  }
});

router.get('/comunicados', async (req, res) => {
  const { id_academia } = req.usuario;
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.nombre_completo AS autor_nombre
       FROM comunicados c
       JOIN usuarios u ON c.id_autor = u.id_usuario
       WHERE c.id_academia = $1
       ORDER BY c.fecha_creacion DESC
       LIMIT 50`,
      [id_academia]
    );
    res.json(rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]); // tabla no creada aún → lista vacía
    res.status(500).json({ error: 'Error obteniendo comunicados.' });
  }
});

// GET /api/academic/lista-espera
router.get('/lista-espera', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT le.*, s.nombre_salon
       FROM lista_espera le
       LEFT JOIN salones s ON le.id_salon = s.id_salon
       WHERE le.id_academia = $1 AND le.estado = 'en_espera'
       ORDER BY le.posicion ASC, le.fecha_registro ASC`,
      [req.usuario.id_academia]
    );
    res.json(rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/lista-espera
router.post('/lista-espera', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { nombre_completo, telefono, email, notas, id_salon } = req.body;
  if (!nombre_completo?.trim()) return res.status(400).json({ error: 'nombre_completo es requerido.' });
  if (nombre_completo.trim().length > 150) return res.status(400).json({ error: 'nombre_completo demasiado largo (máx 150).' });
  if (telefono && telefono.length > 20) return res.status(400).json({ error: 'Teléfono inválido.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'Email inválido.' });
  if (notas && notas.length > 1000) return res.status(400).json({ error: 'Notas demasiado largas (máx 1000).' });
  try {
    const { rows: posRows } = await pool.query(
      `SELECT COALESCE(MAX(posicion), 0) + 1 AS siguiente FROM lista_espera WHERE id_academia = $1 AND estado = 'en_espera'`,
      [req.usuario.id_academia]
    );
    const { rows } = await pool.query(
      `INSERT INTO lista_espera (id_academia, id_salon, nombre_completo, telefono, email, notas, posicion, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.usuario.id_academia, id_salon || null, nombre_completo.trim(), telefono || null, email || null, notas || null, posRows[0].siguiente, req.usuario.id_usuario]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Ejecuta la migración 005.' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/academic/lista-espera/:id/estado
router.put('/lista-espera/:id/estado', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { estado } = req.body; // 'promovido' | 'descartado'
  if (!['promovido', 'descartado'].includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  try {
    const { rows } = await pool.query(
      `UPDATE lista_espera SET estado = $1 WHERE id_espera = $2 AND id_academia = $3 RETURNING *`,
      [estado, req.params.id, req.usuario.id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'No encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/academic/documentos/pendientes — alumnos con docs incompletos
router.get('/documentos/pendientes', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, s.nombre_salon,
              COUNT(CASE WHEN d.estado = 'pendiente' THEN 1 END) AS docs_pendientes,
              COUNT(d.id_documento) AS docs_total
       FROM usuarios u
       LEFT JOIN salones s ON u.id_salon = s.id_salon
       LEFT JOIN documentos_alumno d ON d.id_alumno = u.id_usuario AND d.id_academia = $1
       WHERE u.id_academia = $1 AND u.rol = 'alumno' AND u.activo = true
       GROUP BY u.id_usuario, u.nombre_completo, s.nombre_salon
       HAVING COUNT(CASE WHEN d.estado = 'pendiente' THEN 1 END) > 0
       ORDER BY docs_pendientes DESC, u.nombre_completo ASC`,
      [req.usuario.id_academia]
    );
    res.json(rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/academic/alumnos/:id_alumno/documentos
router.get('/alumnos/:id_alumno/documentos', verificarRoles('superadmin', 'director', 'secretaria', 'profesor'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, u.nombre_completo AS registrado_por_nombre
       FROM documentos_alumno d
       LEFT JOIN usuarios u ON d.registrado_por = u.id_usuario
       WHERE d.id_alumno = $1 AND d.id_academia = $2
       ORDER BY d.tipo_documento ASC`,
      [req.params.id_alumno, req.usuario.id_academia]
    );
    res.json(rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/alumnos/:id_alumno/documentos
router.post('/alumnos/:id_alumno/documentos', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { tipo_documento, estado, observacion } = req.body;
  if (!tipo_documento) return res.status(400).json({ error: 'tipo_documento es requerido.' });
  if (tipo_documento.length > 100) return res.status(400).json({ error: 'tipo_documento demasiado largo.' });
  if (estado && !['pendiente', 'entregado', 'vencido'].includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  if (observacion && observacion.length > 500) return res.status(400).json({ error: 'Observación demasiado larga (máx 500).' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO documentos_alumno (id_alumno, id_academia, tipo_documento, estado, observacion, fecha_entrega, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        req.params.id_alumno,
        req.usuario.id_academia,
        tipo_documento,
        estado || 'pendiente',
        observacion || null,
        estado === 'entregado' ? new Date().toISOString().split('T')[0] : null,
        req.usuario.id_usuario,
      ]
    );
    res.status(201).json(rows[0] || {});
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Ejecuta la migración 004.' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/academic/alumnos/:id_alumno/documentos/:id_documento
router.put('/alumnos/:id_alumno/documentos/:id_documento', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { estado, observacion } = req.body;
  if (estado && !['pendiente', 'entregado', 'vencido'].includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  if (observacion && observacion.length > 500) return res.status(400).json({ error: 'Observación demasiado larga (máx 500).' });
  try {
    const { rows } = await pool.query(
      `UPDATE documentos_alumno
       SET estado = COALESCE($1, estado),
           observacion = COALESCE($2, observacion),
           fecha_entrega = CASE WHEN $1 = 'entregado' THEN CURRENT_DATE ELSE fecha_entrega END,
           registrado_por = $3
       WHERE id_documento = $4 AND id_academia = $5
       RETURNING *`,
      [estado || null, observacion || null, req.usuario.id_usuario, req.params.id_documento, req.usuario.id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Documento no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/alumnos/:id_alumno/comentarios
router.post('/alumnos/:id_alumno/comentarios', verificarRoles('superadmin', 'director', 'secretaria', 'profesor'), async (req, res) => {
  const { texto } = req.body;
  if (!texto?.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
  if (texto.trim().length > 2000) return res.status(400).json({ error: 'Comentario demasiado largo (máx 2000 caracteres).' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO comentarios_alumno (id_alumno, id_autor, id_academia, texto)
       VALUES ($1, $2, $3, $4)
       RETURNING id_comentario, texto, fecha_creacion`,
      [req.params.id_alumno, req.usuario.id_usuario, req.usuario.id_academia, texto.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Tabla no creada. Ejecuta la migración 003.' });
    res.status(500).json({ error: 'Error guardando comentario.' });
  }
});

// GET /api/academic/alumnos/:id_alumno/comentarios
router.get('/alumnos/:id_alumno/comentarios', verificarRoles('superadmin', 'director', 'secretaria', 'profesor'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id_comentario, c.texto, c.fecha_creacion,
              u.nombre_completo AS autor_nombre, u.rol AS autor_rol
       FROM comentarios_alumno c
       JOIN usuarios u ON c.id_autor = u.id_usuario
       WHERE c.id_alumno = $1 AND c.id_academia = $2
       ORDER BY c.fecha_creacion DESC
       LIMIT 50`,
      [req.params.id_alumno, req.usuario.id_academia]
    );
    res.json(rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: 'Error obteniendo comentarios.' });
  }
});

// GET /api/academic/buscar?q=texto — Búsqueda global (alumnos, exámenes, pagos)
router.get('/buscar', verificarRoles('superadmin', 'director', 'secretaria', 'profesor'), async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ alumnos: [], examenes: [], pagos: [] });
  const idAcademia = req.usuario.id_academia;
  const term = `%${q.trim()}%`;

  try {
    const [aRes, eRes, pRes] = await Promise.all([
      pool.query(
        `SELECT id_usuario AS id, nombre_completo AS label, email AS sub, 'alumno' AS tipo
         FROM usuarios
         WHERE id_academia = $1 AND rol = 'alumno' AND nombre_completo ILIKE $2 AND activo = true
         ORDER BY nombre_completo LIMIT 8`,
        [idAcademia, term]
      ),
      pool.query(
        `SELECT id_plantilla AS id, nombre_examen AS label, codigo_examen AS sub, 'examen' AS tipo
         FROM plantillas_examen
         WHERE id_academia = $1 AND nombre_examen ILIKE $2 AND activo = true
         ORDER BY nombre_examen LIMIT 8`,
        [idAcademia, term]
      ),
      pool.query(
        `SELECT p.id_pago AS id, u.nombre_completo AS label, p.concepto AS sub, 'pago' AS tipo
         FROM pagos p
         JOIN usuarios u ON p.id_alumno = u.id_usuario
         WHERE p.id_academia = $1 AND (u.nombre_completo ILIKE $2 OR p.concepto ILIKE $2)
         ORDER BY p.fecha_vencimiento DESC LIMIT 8`,
        [idAcademia, term]
      ),
    ]);

    res.json({ alumnos: aRes.rows, examenes: eRes.rows, pagos: pRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error en búsqueda: ' + err.message });
  }
});

// ─── Gestión avanzada de salones ─────────────────────────────────────────────

// Renombrar salón
router.put('/salones/:id_salon', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { nombre_salon } = req.body;
  if (!nombre_salon?.trim()) return res.status(400).json({ error: 'El nombre del salón es requerido.' });
  try {
    if (req.usuario.rol !== 'superadmin') {
      const check = await pool.query(
        `SELECT 1 FROM salones s JOIN ciclos c ON c.id_ciclo = s.id_ciclo
         WHERE s.id_salon = $1 AND c.id_academia = $2`,
        [req.params.id_salon, req.usuario.id_academia]
      );
      if (!check.rows.length) return res.status(403).json({ error: 'Acceso denegado.' });
    }
    const { rows } = await pool.query(
      'UPDATE salones SET nombre_salon = $1 WHERE id_salon = $2 RETURNING *',
      [nombre_salon.trim(), req.params.id_salon]
    );
    if (!rows.length) return res.status(404).json({ error: 'Salón no encontrado.' });
    res.json({ mensaje: 'Salón renombrado.', salon: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error renombrando salón: ' + err.message });
  }
});

// Eliminar salón (soft delete — requiere que no tenga alumnos activos)
router.delete('/salones/:id_salon', verificarRoles('superadmin', 'director'), async (req, res) => {
  try {
    if (req.usuario.rol !== 'superadmin') {
      const check = await pool.query(
        `SELECT 1 FROM salones s JOIN ciclos c ON c.id_ciclo = s.id_ciclo
         WHERE s.id_salon = $1 AND c.id_academia = $2`,
        [req.params.id_salon, req.usuario.id_academia]
      );
      if (!check.rows.length) return res.status(403).json({ error: 'Acceso denegado.' });
    }
    const alumnos = await pool.query(
      `SELECT COUNT(*) AS n FROM usuarios WHERE id_salon = $1 AND activo = true AND rol = 'alumno'`,
      [req.params.id_salon]
    );
    if (parseInt(alumnos.rows[0].n) > 0) {
      return res.status(409).json({ error: `No se puede eliminar: el salón tiene ${alumnos.rows[0].n} alumno(s) activo(s). Transfiérelos primero.` });
    }
    await pool.query('UPDATE salones SET activo = false WHERE id_salon = $1', [req.params.id_salon]);
    res.json({ mensaje: 'Salón eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando salón: ' + err.message });
  }
});

// Alumnos de un salón (con conteo)
router.get('/salones/:id_salon/alumnos', async (req, res) => {
  try {
    if (req.usuario.rol !== 'superadmin') {
      const check = await pool.query(
        `SELECT 1 FROM salones s JOIN ciclos c ON c.id_ciclo = s.id_ciclo
         WHERE s.id_salon = $1 AND c.id_academia = $2`,
        [req.params.id_salon, req.usuario.id_academia]
      );
      if (!check.rows.length) return res.status(403).json({ error: 'Acceso denegado.' });
    }
    const { rows } = await pool.query(
      `SELECT id_usuario, nombre_completo, email, activo
       FROM usuarios WHERE id_salon = $1 AND rol = 'alumno'
       ORDER BY nombre_completo ASC`,
      [req.params.id_salon]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando alumnos del salón.' });
  }
});

// Transferir alumno a otro salón
router.put('/alumnos/:id_usuario/salon', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { id_salon_destino } = req.body;
  if (!id_salon_destino) return res.status(400).json({ error: 'Debes indicar el salón destino.' });
  try {
    if (req.usuario.rol !== 'superadmin') {
      const destCheck = await pool.query(
        `SELECT 1 FROM salones s JOIN ciclos c ON c.id_ciclo = s.id_ciclo
         WHERE s.id_salon = $1 AND c.id_academia = $2`,
        [id_salon_destino, req.usuario.id_academia]
      );
      if (!destCheck.rows.length) return res.status(403).json({ error: 'El salón destino no pertenece a tu academia.' });
    }
    const { rows } = await pool.query(
      `UPDATE usuarios SET id_salon = $1
       WHERE id_usuario = $2 AND rol = 'alumno' RETURNING id_usuario, nombre_completo, id_salon`,
      [id_salon_destino, req.params.id_usuario]
    );
    if (!rows.length) return res.status(404).json({ error: 'Alumno no encontrado.' });
    res.json({ mensaje: 'Alumno transferido correctamente.', alumno: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error transfiriendo alumno: ' + err.message });
  }
});

// Salones de academia con conteo de alumnos
router.get('/salones/academia/:id_academia/stats', async (req, res) => {
  const academyId = req.usuario.rol === 'superadmin' ? req.params.id_academia : req.usuario.id_academia;
  try {
    const { rows } = await pool.query(
      `SELECT s.id_salon, s.nombre_salon, c.id_ciclo, c.nombre_ciclo,
              COUNT(u.id_usuario) FILTER (WHERE u.activo = true AND u.rol = 'alumno') AS total_alumnos
       FROM salones s
       JOIN ciclos c ON c.id_ciclo = s.id_ciclo
       LEFT JOIN usuarios u ON u.id_salon = s.id_salon
       WHERE c.id_academia = $1 AND s.activo = true AND c.activo = true
       GROUP BY s.id_salon, s.nombre_salon, c.id_ciclo, c.nombre_ciclo
       ORDER BY c.nombre_ciclo, s.nombre_salon`,
      [academyId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando salones: ' + err.message });
  }
});

module.exports = router;

// ==========================================
// GESTIÓN DE CICLOS CON PREPARACIÓN/TURNO
// ==========================================

// Crear ciclo con campos extendidos (preparación, turno)
router.post('/ciclos-extendidos', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { nombre_ciclo, descripcion, activo, preparacion, turno } = req.body;
  const idAcademia = req.usuario.id_academia;
  
  if (!nombre_ciclo?.trim()) {
    return res.status(400).json({ error: 'El nombre del ciclo es requerido.' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO ciclos (id_academia, nombre_ciclo, descripcion, activo, preparacion, turno)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [idAcademia, nombre_ciclo, descripcion || null, activo !== false, preparacion || null, turno || null]
    );
    
    res.status(201).json({ 
      mensaje: 'Ciclo creado exitosamente.',
      ciclo: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Error creando ciclo: ' + err.message });
  }
});

// Actualizar ciclo con campos extendidos
router.put('/ciclos/:id_ciclo', verificarRoles('superadmin', 'director', 'secretaria'), async (req, res) => {
  const { nombre_ciclo, descripcion, activo, preparacion, turno } = req.body;
  const { id_ciclo } = req.params;
  const idAcademia = req.usuario.id_academia;
  
  try {
    // Verificar que el ciclo pertenece a la academia
    const check = await pool.query(
      `SELECT 1 FROM ciclos c JOIN academias a ON a.id_academia = c.id_academia
       WHERE c.id_ciclo = $1 AND a.id_academia = $2`,
      [id_ciclo, idAcademia]
    );
    
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Ciclo no encontrado.' });
    }
    
    const result = await pool.query(
      `UPDATE ciclos 
       SET nombre_ciclo = COALESCE($1, nombre_ciclo),
           descripcion = COALESCE($2, descripcion),
           activo = COALESCE($3, activo),
           preparacion = COALESCE($4, preparacion),
           turno = COALESCE($5, turno)
       WHERE id_ciclo = $6
       RETURNING *`,
      [nombre_ciclo, descripcion, activo, preparacion, turno, id_ciclo]
    );
    
    res.json({ 
      mensaje: 'Ciclo actualizado exitosamente.',
      ciclo: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando ciclo: ' + err.message });
  }
});

// Listar ciclos con conteo de salones
router.get('/ciclos-con-salones', verificarToken, async (req, res) => {
  const idAcademia = req.usuario.id_academia;
  
  try {
    const result = await pool.query(
      `SELECT 
         c.*,
         COUNT(s.id_salon) as total_salones
       FROM ciclos c
       LEFT JOIN salones s ON s.id_ciclo = c.id_ciclo
       WHERE c.id_academia = $1
       GROUP BY c.id_ciclo
       ORDER BY c.nombre_ciclo DESC`,
      [idAcademia]
    );
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando ciclos: ' + err.message });
  }
});

// ==========================================
// VISTA DE RIESGO DEL SALÓN (PROFESOR)
// ==========================================

router.get('/salones/:id_salon/riesgo', verificarToken, async (req, res) => {
  const { id_salon } = req.params;
  try {
    // Alumnos con riesgo (asistencia < 70% O notas bajas)
    const result = await pool.query(
      `
      SELECT 
        u.id_usuario,
        u.nombre_completo,
        COUNT(CASE WHEN a.estado = 'presente' THEN 1 END) as presentes,
        COUNT(a.id_asistencia) as total_asistencias,
        ROUND((COUNT(CASE WHEN a.estado = 'presente' THEN 1 END)::NUMERIC / 
               NULLIF(COUNT(a.id_asistencia), 0)) * 100, 2) as pct_asistencia,
        ROUND(AVG(r.nota_total), 2) as promedio_notas,
        COUNT(r.id_resultado) as examenes_presentados
      FROM usuarios u
      LEFT JOIN asistencias a ON a.id_usuario = u.id_usuario
      LEFT JOIN resultados r ON r.id_usuario = u.id_usuario
      WHERE u.id_salon = $1 AND u.rol = 'alumno' AND u.activo = true
      GROUP BY u.id_usuario, u.nombre_completo
      HAVING 
        (COUNT(CASE WHEN a.estado = 'presente' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(a.id_asistencia), 0)) * 100 < 70
        OR AVG(r.nota_total) < 500
      ORDER BY pct_asistencia ASC, promedio_notas ASC NULLS LAST
      `,
      [id_salon]
    );

    // Clasificar por nivel de riesgo
    const alumnosRiesgo = result.rows.map(al => ({
      ...al,
      nivel_riesgo: al.pct_asistencia < 50 || (al.promedio_notas && al.promedio_notas < 400) ? 'alto'
        : al.pct_asistencia < 70 || (al.promedio_notas && al.promedio_notas < 500) ? 'medio'
        : 'bajo'
    }));

    res.json(alumnosRiesgo);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando vista de riesgo: ' + err.message });
  }
});

// Historial de evaluaciones por alumno (curva de progreso)
router.get('/alumnos/:id_usuario/evaluaciones-historial', verificarToken, async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT 
        r.id_resultado,
        r.nota_total,
        r.fecha_procesamiento,
        ep.nombre_simulacro,
        ep.tipo_calificacion,
        s.nombre_salon,
        ROW_NUMBER() OVER (ORDER BY r.fecha_procesamiento ASC) as numero_evaluacion
      FROM resultados r
      JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
      LEFT JOIN salones s ON ep.id_salon = s.id_salon
      WHERE r.id_usuario = $1
      ORDER BY r.fecha_procesamiento ASC
      `,
      [id_usuario]
    );

    // Calcular tendencia
    const evaluaciones = result.rows;
    const tendencia = evaluaciones.length >= 3 ? (
      evaluaciones[evaluaciones.length - 1].nota_total - evaluaciones[evaluaciones.length - 3].nota_total
    ) : 0;

    res.json({
      evaluaciones,
      tendencia,
      mejora: tendencia > 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando historial de evaluaciones: ' + err.message });
  }
});
