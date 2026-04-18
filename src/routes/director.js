const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken } = require('../middleware/authMiddleware');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

const verificarDirector = (req, res, next) => {
  if (req.usuario && ['admin', 'director', 'secretaria', 'superadmin'].includes(req.usuario.rol)) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso exclusivo para direccion, secretaria o superadmin.' });
  }
};

const resolveAcademyScope = (req) => {
  if (req.usuario.rol === 'superadmin' && req.query.id_academia) {
    return req.query.id_academia;
  }

  return req.usuario.id_academia;
};

router.get('/finanzas', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  if (!idAcademia) {
    return res.status(400).json({ error: 'Usuario no vinculado a una academia.' });
  }

  try {
    const statsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto ELSE 0 END), 0) AS ganancias,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END), 0) AS deuda_total,
        COUNT(CASE WHEN estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE THEN 1 END) AS pagos_vencidos,
        COUNT(CASE WHEN estado = 'pagado' THEN 1 END) AS pagos_confirmados
      FROM pagos_crm
      WHERE id_academia = $1
    `;

    const [stats, movimientos] = await Promise.all([
      pool.query(statsQuery, [idAcademia]),
      pool.query(
        `
          SELECT
            p.*,
            u.nombre_completo AS alumno_nombre
          FROM pagos_crm p
          JOIN usuarios u ON p.id_usuario = u.id_usuario
          WHERE p.id_academia = $1
          ORDER BY COALESCE(p.fecha_pago, p.fecha_vencimiento) DESC, p.id_pago DESC
          LIMIT 10
        `,
        [idAcademia]
      ),
    ]);

    res.json({
      resumen: stats.rows[0],
      recientes: movimientos.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener finanzas de la academia.' });
  }
});

router.get('/deudores', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);

  try {
    const result = await pool.query(
      `
        SELECT
          u.id_usuario,
          u.nombre_completo,
          u.email,
          SUM(p.monto) AS deuda_pendiente
        FROM usuarios u
        JOIN pagos_crm p ON u.id_usuario = p.id_usuario
        WHERE p.id_academia = $1 AND p.estado = 'pendiente'
        GROUP BY u.id_usuario, u.nombre_completo, u.email
        ORDER BY deuda_pendiente DESC
      `,
      [idAcademia]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar deudores.' });
  }
});

// ==========================================
// ESTADO DEL DÍA — dashboard ejecutivo
// ==========================================
router.get('/estado-del-dia', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  if (!idAcademia) return res.status(400).json({ error: 'Usuario no vinculado a una academia.' });

  try {
    const [asistencia, pagosHoy, examenesSemana, alertasDeuda, alumnosTotales] = await Promise.all([
      // Asistencia de hoy
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE estado = 'presente') AS presentes,
           COUNT(*) FILTER (WHERE estado = 'ausente') AS ausentes,
           COUNT(*) FILTER (WHERE estado = 'tardanza') AS tardanzas,
           COUNT(*) AS total_registrados
         FROM asistencias a
         JOIN salones s ON a.id_salon = s.id_salon
         JOIN ciclos c ON s.id_ciclo = c.id_ciclo
         WHERE c.id_academia = $1 AND a.fecha = CURRENT_DATE`,
        [idAcademia]
      ),
      // Pagos cobrados hoy
      pool.query(
        `SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total
         FROM pagos_crm
         WHERE id_academia = $1 AND estado = 'pagado' AND DATE(fecha_pago) = CURRENT_DATE`,
        [idAcademia]
      ),
      // Exámenes procesados esta semana
      pool.query(
        `SELECT COUNT(*) AS cantidad
         FROM resultados r
         JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
         WHERE ep.id_academia = $1
           AND r.omr_estado = 'confirmado'
           AND r.fecha_procesamiento >= DATE_TRUNC('week', NOW())`,
        [idAcademia]
      ),
      // Alertas de deuda escalonadas
      pool.query(
        `SELECT
           u.id_usuario, u.nombre_completo, u.email,
           p.monto, p.fecha_vencimiento, p.concepto,
           CURRENT_DATE - p.fecha_vencimiento AS dias_vencido
         FROM pagos_crm p
         JOIN usuarios u ON p.id_usuario = u.id_usuario
         WHERE p.id_academia = $1 AND p.estado = 'pendiente' AND p.fecha_vencimiento < CURRENT_DATE
         ORDER BY dias_vencido DESC
         LIMIT 20`,
        [idAcademia]
      ),
      // Total alumnos activos
      pool.query(
        `SELECT COUNT(*) AS total FROM usuarios WHERE id_academia = $1 AND rol = 'alumno' AND activo = true`,
        [idAcademia]
      ),
    ]);

    // Clasificar alertas por escalón
    const alertasClasificadas = alertasDeuda.rows.map((a) => ({
      ...a,
      nivel: a.dias_vencido > 30 ? 'critico' : a.dias_vencido > 7 ? 'urgente' : 'reciente',
    }));

    const asistenciaHoy = asistencia.rows[0];
    const pct_asistencia = asistenciaHoy.total_registrados > 0
      ? Math.round((asistenciaHoy.presentes / asistenciaHoy.total_registrados) * 100)
      : null;

    res.json({
      asistencia_hoy: { ...asistenciaHoy, pct_asistencia },
      pagos_hoy: pagosHoy.rows[0],
      examenes_semana: parseInt(examenesSemana.rows[0]?.cantidad || 0),
      total_alumnos: parseInt(alumnosTotales.rows[0]?.total || 0),
      alertas_deuda: alertasClasificadas,
      criticos: alertasClasificadas.filter(a => a.nivel === 'critico').length,
      urgentes: alertasClasificadas.filter(a => a.nivel === 'urgente').length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo estado del día: ' + err.message });
  }
});

// GET /api/director/salon/:id_salon/mapa-calor
router.get('/salon/:id_salon/mapa-calor', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  const { id_salon } = req.params;
  try {
    // Verificar que el salón pertenece a la academia
    const salonCheck = await pool.query(
      `SELECT s.id_salon, s.nombre_salon, c.nombre_ciclo
       FROM salones s JOIN ciclos c ON s.id_ciclo = c.id_ciclo
       WHERE s.id_salon = $1 AND c.id_academia = $2`,
      [id_salon, idAcademia]
    );
    if (!salonCheck.rows.length) return res.status(404).json({ error: 'Salón no encontrado.' });

    const { rows } = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre_completo,
         u.activo,
         -- Rendimiento: promedio de nota_final en últimos 90 días
         ROUND(AVG(r.nota_final)::numeric, 1)                                    AS promedio_nota,
         COUNT(r.id_resultado)                                                    AS total_examenes,
         -- Asistencia: % de días presentes en últimos 30 días
         ROUND(
           100.0 * COUNT(CASE WHEN a.estado = 'presente' THEN 1 END)::numeric /
           NULLIF(COUNT(a.id_asistencia), 0), 1
         )                                                                        AS pct_asistencia,
         COUNT(a.id_asistencia)                                                   AS total_registros_asistencia
       FROM usuarios u
       LEFT JOIN resultados r
         ON r.id_usuario = u.id_usuario
        AND r.estado = 'confirmado'
        AND r.fecha_procesamiento >= NOW() - INTERVAL '90 days'
       LEFT JOIN asistencias a
         ON a.id_usuario = u.id_usuario
        AND a.id_salon = $1
        AND a.fecha >= NOW() - INTERVAL '30 days'
       WHERE u.id_salon = $1 AND u.rol = 'alumno'
       GROUP BY u.id_usuario, u.nombre_completo, u.activo
       ORDER BY u.nombre_completo ASC`,
      [id_salon]
    );

    res.json({ salon: salonCheck.rows[0], alumnos: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error generando mapa de calor: ' + err.message });
  }
});

// PUT /api/director/configurar — Director actualiza su propia academia (onboarding)
router.put('/configurar', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  if (!idAcademia) return res.status(400).json({ error: 'Sin academia vinculada.' });

  const { nombre, logo_url, brand_primary_color } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE academias
       SET nombre = COALESCE($1, nombre),
           logo_url = COALESCE($2, logo_url),
           brand_primary_color = COALESCE($3, brand_primary_color)
       WHERE id_academia = $4
       RETURNING id_academia, nombre, logo_url, brand_primary_color`,
      [nombre || null, logo_url || null, brand_primary_color || null, idAcademia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Academia no encontrada.' });
    res.json({ academia: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando academia: ' + err.message });
  }
});

// ==========================================
// ANÁLISIS DE ERRORES POR PREGUNTA
// GET /api/director/examen/:codigo/analisis-preguntas
// ==========================================
const LIMITES_PLAN = { basico: 200, starter: 200, pro: 500, academy: -1 };

router.get('/examen/:codigo/analisis-preguntas', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  const { codigo } = req.params;

  try {
    const examCheck = await pool.query(
      `SELECT codigo_examen, nombre_simulacro, claves_correctas, configuracion_cursos
       FROM examenes_plantillas
       WHERE codigo_examen = $1 AND id_academia = $2`,
      [codigo, idAcademia]
    );
    if (!examCheck.rows.length) return res.status(404).json({ error: 'Examen no encontrado.' });

    const examen = examCheck.rows[0];
    const claves = examen.claves_correctas || {};

    if (!Object.keys(claves).length) {
      return res.json({ examen: examen.nombre_simulacro, total_alumnos: 0, preguntas: [] });
    }

    const { rows: resultados } = await pool.query(
      `SELECT respuestas_alumno
       FROM resultados
       WHERE codigo_examen = $1 AND omr_estado = 'confirmado'`,
      [codigo]
    );

    if (!resultados.length) {
      return res.json({ examen: examen.nombre_simulacro, total_alumnos: 0, preguntas: [] });
    }

    // Acumular stats por pregunta
    const stats = {};
    for (const nQ of Object.keys(claves)) {
      stats[nQ] = { pregunta: parseInt(nQ), correcta: claves[nQ], aciertos: 0, errores: 0, blancos: 0 };
    }

    for (const r of resultados) {
      const respuestas = r.respuestas_alumno || {};
      for (const nQ of Object.keys(claves)) {
        const resp = respuestas[nQ] || '';
        if (!resp) stats[nQ].blancos++;
        else if (resp === claves[nQ]) stats[nQ].aciertos++;
        else stats[nQ].errores++;
      }
    }

    const total = resultados.length;
    const preguntas = Object.values(stats)
      .sort((a, b) => a.pregunta - b.pregunta)
      .map(s => ({
        ...s,
        pct_acierto: total > 0 ? Math.round((s.aciertos / total) * 100) : 0,
        pct_error:   total > 0 ? Math.round((s.errores  / total) * 100) : 0,
        pct_blanco:  total > 0 ? Math.round((s.blancos  / total) * 100) : 0,
      }));

    res.json({ examen: examen.nombre_simulacro, codigo, total_alumnos: total, preguntas });
  } catch (err) {
    res.status(500).json({ error: 'Error generando análisis: ' + err.message });
  }
});

// ==========================================
// USO OMR DEL PLAN — widget para director
// GET /api/director/omr-uso
// ==========================================
router.get('/omr-uso', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  if (!idAcademia) return res.status(400).json({ error: 'Sin academia vinculada.' });

  try {
    const [planRow, usoRow] = await Promise.all([
      pool.query(
        "SELECT COALESCE(plan_activo, 'basico') AS plan FROM academias WHERE id_academia = $1",
        [idAcademia]
      ),
      pool.query(
        `SELECT COUNT(*) AS uso
         FROM resultados r
         JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
         WHERE ep.id_academia = $1
           AND DATE_TRUNC('month', r.fecha_procesamiento) = DATE_TRUNC('month', NOW())`,
        [idAcademia]
      ),
    ]);

    const plan   = planRow.rows[0]?.plan || 'basico';
    const uso    = parseInt(usoRow.rows[0]?.uso || 0);
    const limite = LIMITES_PLAN[plan] ?? 200;
    const pct    = limite > 0 ? Math.min(100, Math.round((uso / limite) * 100)) : 0;

    res.json({ plan, uso, limite, pct });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo uso OMR: ' + err.message });
  }
});

// ==========================================
// PADRES/APODERADOS DISPONIBLES EN LA ACADEMIA
// GET /api/director/padres
// ==========================================
router.get('/padres', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  try {
    const { rows } = await pool.query(`
      SELECT u.id_usuario, u.nombre_completo, u.email,
             COUNT(a.id_usuario) AS hijos_vinculados
      FROM usuarios u
      LEFT JOIN usuarios a ON a.id_padre = u.id_usuario AND a.rol = 'alumno'
      WHERE u.id_academia = $1 AND u.rol = 'padre' AND u.activo
      GROUP BY u.id_usuario, u.nombre_completo, u.email
      ORDER BY u.nombre_completo
    `, [idAcademia]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando padres: ' + err.message });
  }
});

// ==========================================
// TUTORES DISPONIBLES EN LA ACADEMIA
// GET /api/director/tutores
// ==========================================
router.get('/tutores', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  try {
    const { rows } = await pool.query(`
      SELECT u.id_usuario, u.nombre_completo, u.email,
             COUNT(a.id_usuario) AS alumnos_vinculados
      FROM usuarios u
      LEFT JOIN usuarios a ON a.id_tutor = u.id_usuario AND a.rol = 'alumno'
      WHERE u.id_academia = $1 AND u.rol = 'tutor' AND u.activo
      GROUP BY u.id_usuario, u.nombre_completo, u.email
      ORDER BY u.nombre_completo
    `, [idAcademia]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando tutores: ' + err.message });
  }
});

// ==========================================
// CALENDARIO ACADÉMICO
// GET /api/director/calendario?mes=3&anio=2026
// ==========================================
router.get('/calendario', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  const mesNum  = Math.max(1, Math.min(12, parseInt(req.query.mes)  || new Date().getMonth() + 1));
  const anioNum = parseInt(req.query.anio) || new Date().getFullYear();

  // Calcular inicio y fin del mes
  const inicio = new Date(anioNum, mesNum - 1, 1);
  const fin    = new Date(anioNum, mesNum, 1);
  const inicioStr = inicio.toISOString().slice(0, 10);
  const finStr    = fin.toISOString().slice(0, 10);

  try {
    const [pagosRes, vencimientosRes, asistRes, examRes] = await Promise.all([
      // Pagos completados en el mes
      pool.query(`
        SELECT DATE(fecha_pago) AS fecha, COUNT(*) AS cantidad, SUM(monto) AS monto_total
        FROM pagos_crm
        WHERE id_academia = $1 AND estado = 'pagado'
          AND DATE(fecha_pago) >= $2 AND DATE(fecha_pago) < $3
        GROUP BY DATE(fecha_pago)
        ORDER BY DATE(fecha_pago)
      `, [idAcademia, inicioStr, finStr]),

      // Vencimientos de cuotas en el mes
      pool.query(`
        SELECT DATE(fecha_vencimiento) AS fecha, COUNT(*) AS cantidad
        FROM pagos_crm
        WHERE id_academia = $1 AND estado = 'pendiente'
          AND DATE(fecha_vencimiento) >= $2 AND DATE(fecha_vencimiento) < $3
        GROUP BY DATE(fecha_vencimiento)
        ORDER BY DATE(fecha_vencimiento)
      `, [idAcademia, inicioStr, finStr]),

      // Asistencias registradas en el mes
      pool.query(`
        SELECT a.fecha, COUNT(*) AS total,
               COUNT(*) FILTER (WHERE a.estado = 'presente') AS presentes
        FROM asistencias a
        JOIN usuarios u ON u.id_usuario = a.id_usuario
        WHERE u.id_academia = $1
          AND a.fecha >= $2 AND a.fecha < $3
        GROUP BY a.fecha
        ORDER BY a.fecha
      `, [idAcademia, inicioStr, finStr]),

      // Exámenes procesados en el mes
      pool.query(`
        SELECT DATE(r.fecha_procesamiento) AS fecha, COUNT(*) AS cantidad
        FROM resultados r
        JOIN examenes_plantillas ep ON ep.codigo_examen = r.codigo_examen
        WHERE ep.id_academia = $1 AND r.omr_estado = 'confirmado'
          AND DATE(r.fecha_procesamiento) >= $2 AND DATE(r.fecha_procesamiento) < $3
        GROUP BY DATE(r.fecha_procesamiento)
        ORDER BY DATE(r.fecha_procesamiento)
      `, [idAcademia, inicioStr, finStr]),
    ]);

    // Eventos internos del mes
    const eventosRes = await pool.query(
      `SELECT id_evento, titulo, descripcion, fecha, tipo
       FROM eventos_calendario
       WHERE id_academia = $1 AND fecha >= $2 AND fecha < $3 AND activo = true
       ORDER BY fecha`,
      [idAcademia, inicioStr, finStr]
    ).catch(() => ({ rows: [] })); // graceful si la migración no se corrió aún

    res.json({
      mes: mesNum,
      anio: anioNum,
      pagos: pagosRes.rows,
      vencimientos: vencimientosRes.rows,
      asistencias: asistRes.rows,
      examenes: examRes.rows,
      eventos: eventosRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando calendario: ' + err.message });
  }
});

// ─── Eventos internos del calendario ─────────────────────────────────────────

router.get('/eventos', async (req, res) => {
  const { mes, anio } = req.query;
  const mesNum  = parseInt(mes)  || new Date().getMonth() + 1;
  const anioNum = parseInt(anio) || new Date().getFullYear();
  const inicioStr = `${anioNum}-${String(mesNum).padStart(2,'0')}-01`;
  const finStr    = `${anioNum}-${String(mesNum + 1 > 12 ? 1 : mesNum + 1).padStart(2,'0')}-01`;
  const idAcademia = req.usuario.id_academia;
  try {
    const { rows } = await pool.query(
      `SELECT id_evento, titulo, descripcion, fecha, tipo, creado_por
       FROM eventos_calendario
       WHERE id_academia = $1 AND fecha >= $2 AND fecha < $3 AND activo = true
       ORDER BY fecha`,
      [idAcademia, inicioStr, finStr]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando eventos: ' + err.message });
  }
});

router.post('/eventos', async (req, res) => {
  const { titulo, descripcion, fecha, tipo } = req.body;
  if (!titulo?.trim() || !fecha) return res.status(400).json({ error: 'Título y fecha son requeridos.' });
  const tiposValidos = ['evento', 'feriado', 'reunion', 'pago_especial'];
  const tipoFinal = tiposValidos.includes(tipo) ? tipo : 'evento';
  try {
    const { rows } = await pool.query(
      `INSERT INTO eventos_calendario (id_academia, titulo, descripcion, fecha, tipo, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.usuario.id_academia, titulo.trim(), descripcion || null, fecha, tipoFinal, req.usuario.id_usuario]
    );
    res.status(201).json({ mensaje: 'Evento creado.', evento: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error creando evento: ' + err.message });
  }
});

router.delete('/eventos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE eventos_calendario SET activo = false
       WHERE id_evento = $1 AND id_academia = $2 RETURNING id_evento`,
      [req.params.id, req.usuario.id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Evento no encontrado.' });
    res.json({ mensaje: 'Evento eliminado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando evento: ' + err.message });
  }
});

// ==========================================
// MÉTRICAS EJECUTIVAS PARA DIRECTOR
// ==========================================

// Ingresos mensuales (últimos 12 meses)
router.get('/ingresos-mensuales', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  try {
    const result = await pool.query(
      `
      SELECT 
        TO_CHAR(fecha_pago, 'YYYY-MM') as mes,
        SUM(monto) as total,
        COUNT(*) as cantidad
      FROM pagos_crm
      WHERE id_academia = $1 
        AND estado = 'pagado'
        AND fecha_pago >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(fecha_pago, 'YYYY-MM')
      ORDER BY mes DESC
      `,
      [idAcademia]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando ingresos mensuales: ' + err.message });
  }
});

// Retención de alumnos (tasa de renovación por mes)
router.get('/retencion', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  try {
    const result = await pool.query(
      `
      WITH alumnos_por_mes AS (
        SELECT 
          TO_CHAR(fecha_creacion, 'YYYY-MM') as mes,
          COUNT(*) FILTER (WHERE activo = true) as activos,
          COUNT(*) FILTER (WHERE activo = false) as inactivos
        FROM usuarios
        WHERE id_academia = $1 AND rol = 'alumno'
          AND fecha_creacion >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(fecha_creacion, 'YYYY-MM')
      )
      SELECT 
        mes,
        activos,
        inactivos,
        ROUND((activos::NUMERIC / NULLIF(activos + inactivos, 0)) * 100, 2) as tasa_retencion
      FROM alumnos_por_mes
      ORDER BY mes DESC
      `,
      [idAcademia]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando retención: ' + err.message });
  }
});

// Rendimiento por salón (promedio notas + asistencia)
router.get('/salones-rendimiento', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  try {
    const result = await pool.query(
      `
      SELECT 
        s.nombre_salon,
        c.nombre_ciclo,
        COUNT(DISTINCT u.id_usuario) as total_alumnos,
        ROUND(AVG(r.nota_total), 2) as promedio_notas,
        ROUND(
          (COUNT(CASE WHEN a.estado = 'presente' THEN 1 END)::NUMERIC / 
           NULLIF(COUNT(a.id_asistencia), 0)) * 100, 
          2
        ) as pct_asistencia
      FROM salones s
      JOIN ciclos c ON s.id_ciclo = c.id_ciclo
      LEFT JOIN usuarios u ON u.id_salon = s.id_salon AND u.rol = 'alumno' AND u.activo = true
      LEFT JOIN resultados r ON r.id_usuario = u.id_usuario
      LEFT JOIN asistencias a ON a.id_usuario = u.id_usuario
      WHERE s.id_academia = $1
      GROUP BY s.id_salon, s.nombre_salon, c.nombre_ciclo
      ORDER BY promedio_notas DESC NULLS LAST
      `,
      [idAcademia]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando rendimiento por salón: ' + err.message });
  }
});

// Alertas configuradas de la academia
router.get('/alertas-config', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  try {
    const result = await pool.query(
      `SELECT configuracion_alertas FROM academias WHERE id_academia = $1`,
      [idAcademia]
    );
    res.json(result.rows[0]?.configuracion_alertas || {
      asistencia_minima: 70,
      nota_minima: 500,
      dias_vencimiento_alerta: 7
    });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando configuración de alertas: ' + err.message });
  }
});

// Actualizar configuración de alertas
router.put('/alertas-config', verificarToken, verificarDirector, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  const { asistencia_minima, nota_minima, dias_vencimiento_alerta } = req.body;
  try {
    await pool.query(
      `UPDATE academias 
       SET configuracion_alertas = jsonb_build_object(
         'asistencia_minima', $1,
         'nota_minima', $2,
         'dias_vencimiento_alerta', $3
       ) WHERE id_academia = $4`,
      [asistencia_minima, nota_minima, dias_vencimiento_alerta, idAcademia]
    );
    res.json({ mensaje: 'Configuración de alertas actualizada.' });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando alertas: ' + err.message });
  }
});

module.exports = router;
