/**
 * Job: Resumen semanal para alumnos
 * Se ejecuta cada domingo a las 23:00 desde el cron del VPS.
 * Genera un resumen de la semana por alumno y lo guarda en resumenes_semanales.
 *
 * Uso manual: node src/jobs/resumenSemanal.js
 * Cron VPS:   0 23 * * 0 cd /opt/edusaas && node src/jobs/resumenSemanal.js >> /opt/edusaas/backups/resumen.log 2>&1
 */

const { Pool } = require('pg');
const config   = require('../config');

const pool = new Pool(config.database);

const MENSAJES = {
  excelente: (n)  => `¡Excelente semana! Promedio de ${n} puntos. Sigue así.`,
  buena:     (n)  => `Buena semana con ${n} puntos de promedio. Puedes mejorar aún más.`,
  regular:   (n)  => `Promedio de ${n} puntos esta semana. Dedica más tiempo a repasar.`,
  sinExamen:  ()  => `Esta semana no tuviste exámenes registrados. ¡Mantente al día!`,
};

async function generarResumenes() {
  const hoy       = new Date();
  const lunes     = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  lunes.setHours(0, 0, 0, 0);
  const domingo   = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const semanaInicio = lunes.toISOString().split('T')[0];
  const semanaFin    = domingo.toISOString().split('T')[0];

  console.log(`[ResumenSemanal] Generando para semana ${semanaInicio} → ${semanaFin}`);

  try {
    // Obtener todos los alumnos activos
    const { rows: alumnos } = await pool.query(
      `SELECT u.id_usuario, u.id_academia, u.id_salon
       FROM usuarios u
       WHERE u.rol = 'alumno' AND u.activo = true AND u.id_academia IS NOT NULL`
    );

    console.log(`[ResumenSemanal] ${alumnos.length} alumnos a procesar`);
    let generados = 0;

    for (const alumno of alumnos) {
      try {
        // Exámenes y promedio de la semana
        const { rows: examRows } = await pool.query(
          `SELECT COUNT(*) AS total, ROUND(AVG(nota_final)::numeric, 1) AS promedio
           FROM resultados
           WHERE id_usuario = $1 AND estado = 'confirmado'
             AND fecha_procesamiento::date BETWEEN $2 AND $3`,
          [alumno.id_usuario, semanaInicio, semanaFin]
        );

        // Asistencia de la semana
        const { rows: asistRows } = await pool.query(
          `SELECT
             COUNT(CASE WHEN estado = 'presente' THEN 1 END)  AS presentes,
             COUNT(CASE WHEN estado = 'ausente'  THEN 1 END)  AS ausentes
           FROM asistencias
           WHERE id_usuario = $1 AND fecha BETWEEN $2 AND $3`,
          [alumno.id_usuario, semanaInicio, semanaFin]
        );

        // Ranking en el salón (últimos 30 días)
        let posicion = null, totalSalon = null;
        if (alumno.id_salon) {
          const { rows: rankRows } = await pool.query(
            `SELECT id_usuario, ROUND(AVG(nota_final)::numeric,1) AS prom
             FROM resultados r
             JOIN usuarios u ON r.id_usuario = u.id_usuario
             WHERE u.id_salon = $1 AND r.estado = 'confirmado'
               AND r.fecha_procesamiento >= NOW() - INTERVAL '30 days'
             GROUP BY id_usuario
             ORDER BY prom DESC`,
            [alumno.id_salon]
          );
          totalSalon = rankRows.length;
          const idx  = rankRows.findIndex(r => r.id_usuario === alumno.id_usuario);
          if (idx >= 0) posicion = idx + 1;
        }

        const examTotal  = parseInt(examRows[0]?.total   || 0);
        const promedio   = examRows[0]?.promedio ? parseFloat(examRows[0].promedio) : null;
        const presentes  = parseInt(asistRows[0]?.presentes || 0);
        const ausentes   = parseInt(asistRows[0]?.ausentes  || 0);

        // Mensaje motivacional
        let mensaje;
        if (!examTotal) {
          mensaje = MENSAJES.sinExamen();
        } else if (promedio >= 14) {
          mensaje = MENSAJES.excelente(promedio);
        } else if (promedio >= 11) {
          mensaje = MENSAJES.buena(promedio);
        } else {
          mensaje = MENSAJES.regular(promedio);
        }

        // Upsert
        await pool.query(
          `INSERT INTO resumenes_semanales
             (id_usuario, id_academia, semana_inicio, semana_fin, examenes_semana, promedio_semana, asistencias, ausencias, posicion_salon, total_salon, mensaje)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id_usuario, semana_inicio)
           DO UPDATE SET
             examenes_semana = EXCLUDED.examenes_semana,
             promedio_semana = EXCLUDED.promedio_semana,
             asistencias     = EXCLUDED.asistencias,
             ausencias       = EXCLUDED.ausencias,
             posicion_salon  = EXCLUDED.posicion_salon,
             total_salon     = EXCLUDED.total_salon,
             mensaje         = EXCLUDED.mensaje,
             generado_en     = NOW()`,
          [alumno.id_usuario, alumno.id_academia, semanaInicio, semanaFin,
           examTotal, promedio, presentes, ausentes, posicion, totalSalon, mensaje]
        );
        generados++;
      } catch (err) {
        console.error(`[ResumenSemanal] Error alumno ${alumno.id_usuario}:`, err.message);
      }
    }

    console.log(`[ResumenSemanal] ✅ ${generados}/${alumnos.length} resúmenes generados.`);
  } catch (err) {
    console.error('[ResumenSemanal] Error fatal:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

generarResumenes();
