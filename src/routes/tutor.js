const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');
const config = require('../config');

const pool = new Pool(config.database);

router.use(verificarToken);
router.use(verificarRoles('tutor', 'superadmin'));

// ==========================================
// MIS ALUMNOS (alumnos vinculados a este tutor)
// GET /api/tutor/mis-alumnos
// ==========================================
router.get('/mis-alumnos', async (req, res) => {
  const idTutor = req.usuario.id_usuario;
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id_usuario,
        u.nombre_completo,
        u.email,
        u.estado_alumno,
        s.nombre_salon,
        c.nombre_ciclo,
        a.nombre AS nombre_academia
      FROM usuarios u
      LEFT JOIN salones s ON s.id_salon = u.id_salon
      LEFT JOIN ciclos c ON c.id_ciclo = s.id_ciclo
      LEFT JOIN academias a ON a.id_academia = u.id_academia
      WHERE u.id_tutor = $1 AND u.rol = 'alumno'
      ORDER BY u.nombre_completo
    `, [idTutor]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando alumnos: ' + err.message });
  }
});

// ==========================================
// RESUMEN DE UN ALUMNO (notas, asistencia, pagos)
// GET /api/tutor/alumno/:id/resumen
// ==========================================
router.get('/alumno/:id/resumen', async (req, res) => {
  const idTutor  = req.usuario.id_usuario;
  const { id }   = req.params;

  try {
    // Verificar que el alumno está vinculado a este tutor
    const check = await pool.query(
      `SELECT id_usuario, nombre_completo, estado_alumno, id_academia
       FROM usuarios WHERE id_usuario = $1 AND id_tutor = $2 AND rol = 'alumno'`,
      [id, idTutor]
    );
    if (!check.rows.length) return res.status(403).json({ error: 'No tienes acceso a este alumno.' });
    const alumno = check.rows[0];

    // Últimos 10 resultados de exámenes
    const examenesRes = await pool.query(`
      SELECT
        r.id_resultado,
        r.nota_total,
        r.fecha_procesamiento,
        r.puntaje_por_cursos,
        ep.nombre_simulacro,
        ep.tipo_calificacion
      FROM resultados r
      JOIN examenes_plantillas ep ON ep.codigo_examen = r.codigo_examen
      WHERE r.id_usuario = $1 AND r.omr_estado = 'confirmado'
      ORDER BY r.fecha_procesamiento DESC
      LIMIT 10
    `, [id]);

    // Resumen de asistencia últimas 4 semanas
    const asistenciaRes = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE estado = 'presente') AS presentes,
        COUNT(*) FILTER (WHERE estado = 'tardanza') AS tardanzas,
        COUNT(*) FILTER (WHERE estado = 'ausente')  AS ausentes
      FROM asistencias
      WHERE id_usuario = $1 AND fecha >= CURRENT_DATE - INTERVAL '28 days'
    `, [id]);

    // Pagos: deuda pendiente
    const pagosRes = await pool.query(`
      SELECT
        id_pago, concepto, monto, estado, fecha_vencimiento, fecha_pago
      FROM pagos_crm
      WHERE id_usuario = $1
      ORDER BY COALESCE(fecha_pago, fecha_vencimiento) DESC
      LIMIT 10
    `, [id]);

    // Racha de login
    const rachaRes = await pool.query(`
      SELECT racha_actual, racha_maxima, ultimo_login
      FROM rachas_login WHERE id_usuario = $1
    `, [id]).catch(() => ({ rows: [] }));

    res.json({
      alumno: {
        id_usuario:     alumno.id_usuario,
        nombre_completo: alumno.nombre_completo,
        estado_alumno:  alumno.estado_alumno,
        id_academia:    alumno.id_academia,
      },
      asistencia: asistenciaRes.rows[0] || { total: 0, presentes: 0, tardanzas: 0, ausentes: 0 },
      examenes:   examenesRes.rows,
      pagos:      pagosRes.rows,
      racha:      rachaRes.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando resumen del alumno: ' + err.message });
  }
});

module.exports = router;
