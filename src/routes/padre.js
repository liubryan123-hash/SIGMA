const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');
const config = require('../config');

const pool = new Pool(config.database);

router.use(verificarToken);
router.use(verificarRoles('padre', 'superadmin'));

// ==========================================
// MIS HIJOS (alumnos vinculados a este padre)
// GET /api/padre/mis-hijos
// ==========================================
router.get('/mis-hijos', async (req, res) => {
  const idPadre = req.usuario.id_usuario;
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id_usuario, u.nombre_completo, u.email, u.estado_alumno,
        s.nombre_salon, c.nombre_ciclo, a.nombre AS nombre_academia
      FROM usuarios u
      LEFT JOIN salones s ON s.id_salon = u.id_salon
      LEFT JOIN ciclos c ON c.id_ciclo = s.id_ciclo
      LEFT JOIN academias a ON a.id_academia = u.id_academia
      WHERE u.id_padre = $1 AND u.rol = 'alumno'
      ORDER BY u.nombre_completo
    `, [idPadre]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error listando hijos: ' + err.message });
  }
});

// ==========================================
// RESUMEN DEL HIJO (notas, asistencia, pagos)
// GET /api/padre/hijo/:id/resumen
// Vista reducida — sin info interna de la academia
// ==========================================
router.get('/hijo/:id/resumen', async (req, res) => {
  const idPadre = req.usuario.id_usuario;
  const { id }  = req.params;

  try {
    // Verificar vínculo padre-hijo
    const check = await pool.query(
      `SELECT id_usuario, nombre_completo, estado_alumno
       FROM usuarios WHERE id_usuario = $1 AND id_padre = $2 AND rol = 'alumno'`,
      [id, idPadre]
    );
    if (!check.rows.length) return res.status(403).json({ error: 'No tienes acceso a este alumno.' });
    const alumno = check.rows[0];

    // Últimos 5 exámenes (solo nota y nombre)
    const examenesRes = await pool.query(`
      SELECT r.nota_total, r.fecha_procesamiento, ep.nombre_simulacro
      FROM resultados r
      JOIN examenes_plantillas ep ON ep.codigo_examen = r.codigo_examen
      WHERE r.id_usuario = $1 AND r.omr_estado = 'confirmado'
      ORDER BY r.fecha_procesamiento DESC
      LIMIT 5
    `, [id]);

    // Asistencia últimas 4 semanas
    const asistenciaRes = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE estado = 'presente') AS presentes,
        COUNT(*) FILTER (WHERE estado = 'tardanza') AS tardanzas,
        COUNT(*) FILTER (WHERE estado = 'ausente')  AS ausentes
      FROM asistencias
      WHERE id_usuario = $1 AND fecha >= CURRENT_DATE - INTERVAL '28 days'
    `, [id]);

    // Solo pagos pendientes (deuda visible para el padre)
    const pagosRes = await pool.query(`
      SELECT concepto, monto, estado, fecha_vencimiento, fecha_pago
      FROM pagos_crm
      WHERE id_usuario = $1
      ORDER BY COALESCE(fecha_pago, fecha_vencimiento) DESC
      LIMIT 8
    `, [id]);

    res.json({
      alumno: { id_usuario: alumno.id_usuario, nombre_completo: alumno.nombre_completo, estado_alumno: alumno.estado_alumno },
      asistencia: asistenciaRes.rows[0] || { total: 0, presentes: 0, tardanzas: 0, ausentes: 0 },
      examenes:   examenesRes.rows,
      pagos:      pagosRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando resumen: ' + err.message });
  }
});

module.exports = router;
