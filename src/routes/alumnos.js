const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');
const { registrarLog } = require('./audit');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

const canManageStudents = (rol) =>
  ['profesor', 'secretaria', 'director', 'superadmin', 'admin'].includes(rol);

router.use(verificarToken);

router.get('/', async (req, res) => {
  const { id_academia, rol } = req.usuario;
  const { id_salon } = req.query;

  if (!canManageStudents(rol)) {
    return res.status(403).json({ error: 'No tienes permisos para ver el padron de alumnos.' });
  }

  try {
    let query = `
      SELECT
        u.id_usuario,
        u.nombre_completo,
        u.email,
        u.activo,
        u.id_salon,
        COALESCE(u.estado_alumno, 'activo') AS estado_alumno,
        s.nombre_salon,
        c.nombre_ciclo
      FROM usuarios u
      LEFT JOIN salones s ON u.id_salon = s.id_salon
      LEFT JOIN ciclos c ON s.id_ciclo = c.id_ciclo
      WHERE u.id_academia = $1 AND u.rol = 'alumno'
    `;
    const params = [id_academia];

    if (id_salon) {
      query += ' AND u.id_salon = $2';
      params.push(id_salon);
    }

    query += ' ORDER BY s.nombre_salon ASC, u.nombre_completo ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo la lista de alumnos.' });
  }
});

router.get('/salones', async (req, res) => {
  const { id_academia } = req.usuario;

  try {
    const { rows } = await pool.query(
      `
        SELECT s.id_salon, s.nombre_salon, c.nombre_ciclo, c.id_ciclo
        FROM salones s
        JOIN ciclos c ON s.id_ciclo = c.id_ciclo
        WHERE c.id_academia = $1 AND s.activo = true
        ORDER BY c.nombre_ciclo, s.nombre_salon
      `,
      [id_academia]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo salones.' });
  }
});

router.post('/registrar', async (req, res) => {
  const { rol, id_academia } = req.usuario;
  if (!canManageStudents(rol)) {
    return res.status(403).json({ error: 'Sin permiso para registrar alumnos.' });
  }

  const { nombre_completo, email, password, id_salon, id_usuario_custom } = req.body;

  if (!nombre_completo || !password) {
    return res.status(400).json({ error: 'El nombre completo y la contrasena son obligatorios.' });
  }

  try {
    if (email) {
      const emailCheck = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese correo electronico.' });
      }
    }

    let idFinal;
    if (id_usuario_custom && id_usuario_custom.trim()) {
      const idCheck = await pool.query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1', [id_usuario_custom.trim()]);
      if (idCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe un alumno con ese codigo de usuario.' });
      }
      idFinal = id_usuario_custom.trim().toUpperCase();
    } else {
      const prefix = id_academia.substring(0, 4).toUpperCase();
      idFinal = `ALUM-${prefix}-${Date.now().toString(36).toUpperCase()}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `
        INSERT INTO usuarios (id_usuario, id_academia, id_salon, rol, nombre_completo, email, password_hash, activo)
        VALUES ($1, $2, $3, 'alumno', $4, $5, $6, true)
        RETURNING id_usuario, nombre_completo, email, id_salon, activo
      `,
      [idFinal, id_academia, id_salon || null, nombre_completo, email || null, passwordHash]
    );

    res.status(201).json({
      mensaje: `Alumno "${nombre_completo}" registrado correctamente. Su codigo de acceso es: ${idFinal}`,
      alumno: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Error registrando el alumno: ${error.message}` });
  }
});

router.put('/:id_usuario', async (req, res) => {
  const { rol, id_academia } = req.usuario;
  if (!canManageStudents(rol)) {
    return res.status(403).json({ error: 'Sin permiso para modificar alumnos.' });
  }

  const { nombre_completo, email, id_salon, activo } = req.body;
  const { id_usuario } = req.params;

  try {
    const check = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = $1 AND id_academia = $2 AND rol = $3',
      [id_usuario, id_academia, 'alumno']
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado en tu academia.' });
    }

    await pool.query(
      `
        UPDATE usuarios
        SET
          nombre_completo = COALESCE($1, nombre_completo),
          email = COALESCE($2, email),
          id_salon = $3,
          activo = COALESCE($4, activo)
        WHERE id_usuario = $5
      `,
      [nombre_completo, email, id_salon || null, activo, id_usuario]
    );

    res.json({ mensaje: 'Alumno actualizado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error actualizando alumno.' });
  }
});

router.delete('/:id_usuario', async (req, res) => {
  const { rol, id_academia } = req.usuario;
  if (!canManageStudents(rol)) {
    return res.status(403).json({ error: 'Sin permiso para dar de baja alumnos.' });
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE usuarios
        SET activo = false
        WHERE id_usuario = $1 AND id_academia = $2 AND rol = $3
        RETURNING nombre_completo
      `,
      [req.params.id_usuario, id_academia, 'alumno']
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    await registrarLog(
      req.usuario.id_usuario,
      id_academia,
      'BAJA_ALUMNO',
      `Se dio de baja al alumno ${rows[0].nombre_completo} (ID: ${req.params.id_usuario})`,
      req.ip
    );

    res.json({ mensaje: `Alumno "${rows[0].nombre_completo}" dado de baja. Su acceso fue revocado.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al dar de baja al alumno.' });
  }
});

router.put('/:id_usuario/reactivar', async (req, res) => {
  const { rol, id_academia } = req.usuario;
  if (!canManageStudents(rol)) {
    return res.status(403).json({ error: 'Sin permiso.' });
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE usuarios
        SET activo = true
        WHERE id_usuario = $1 AND id_academia = $2 AND rol = $3
        RETURNING nombre_completo
      `,
      [req.params.id_usuario, id_academia, 'alumno']
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    await registrarLog(
      req.usuario.id_usuario,
      id_academia,
      'REACTIVACION_ALUMNO',
      `Se reactivo al alumno ${rows[0].nombre_completo} (ID: ${req.params.id_usuario})`,
      req.ip
    );

    res.json({ mensaje: `Alumno "${rows[0].nombre_completo}" reactivado.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error reactivando alumno.' });
  }
});

// Nuevo endpoint: Historial de resultados por alumno
router.get('/:id_usuario/resultados', verificarToken, async (req, res) => {
  try {
    const canView =
      String(req.usuario.id_usuario) === String(req.params.id_usuario) ||
      ['profesor', 'secretaria', 'director', 'superadmin', 'admin'].includes(req.usuario.rol);

    if (!canView) {
      return res.status(403).json({ error: 'No tienes permisos para ver estos resultados.' });
    }

    // Para staff (no superadmin): verificar que el alumno pertenece a su academia
    const params = [req.params.id_usuario];
    let academiaCond = '';
    if (!['superadmin'].includes(req.usuario.rol)) {
      academiaCond = 'AND u.id_academia = $2';
      params.push(req.usuario.id_academia);
    }

    const { rows } = await pool.query(
      `SELECT
          r.*,
          ep.nombre_simulacro,
          ep.tipo_calificacion,
          s.nombre_salon,
          c.nombre_ciclo,
          u.nombre_completo AS alumno_nombre
       FROM resultados r
       JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
       LEFT JOIN salones s ON ep.id_salon = s.id_salon
       LEFT JOIN ciclos c ON s.id_ciclo = c.id_ciclo
       JOIN usuarios u ON r.id_usuario = u.id_usuario
       WHERE r.id_usuario = $1 ${academiaCond}
       ORDER BY r.fecha_procesamiento DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial de resultados:', error);
    res.status(500).json({ error: 'Error al obtener el historial de resultados.' });
  }
});

// Nuevo endpoint: Generar PDF de reporte de resultados
router.get('/:id_usuario/resultados/:id_resultado/pdf', verificarToken, async (req, res) => {
  try {
    // Verificar permisos
    const canView = 
      req.usuario.id_usuario === Number(req.params.id_usuario) ||
      ['profesor', 'secretaria', 'director', 'superadmin', 'admin'].includes(req.usuario.rol);

    if (!canView) {
      return res.status(403).json({ error: 'No tienes permisos para ver este resultado.' });
    }

    const { rows } = await pool.query(
      `
        SELECT
          r.*,
          ep.nombre_simulacro,
          ep.tipo_calificacion,
          s.nombre_salon,
          c.nombre_ciclo,
          a.nombre AS academia_nombre,
          u.nombre_completo AS alumno_nombre
        FROM resultados r
        JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
        LEFT JOIN salones s ON ep.id_salon = s.id_salon
        LEFT JOIN ciclos c ON s.id_ciclo = c.id_ciclo
        JOIN academias a ON ep.id_academia = a.id_academia
        JOIN usuarios u ON r.id_usuario = u.id_usuario
        WHERE r.id_resultado = $1 AND r.id_usuario = $2
      `,
      [req.params.id_resultado, req.params.id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Resultado no encontrado.' });
    }

    const resultado = rows[0];
    
    // Generar PDF
    const { generarReporteResultados } = require('../utils/pdfGenerator');
    const pdfUrl = await generarReporteResultados({
      id_resultado: resultado.id_resultado,
      codigo_examen: resultado.codigo_examen,
      nombre_examen: resultado.nombre_simulacro,
      fecha_procesamiento: resultado.fecha_procesamiento,
      alumno_nombre: resultado.alumno_nombre,
      alumno_codigo: resultado.id_usuario,
      nombre_salon: resultado.nombre_salon,
      academia_nombre: resultado.academia_nombre,
      nota_total: parseFloat(resultado.nota_total),
      puntaje_por_cursos: resultado.puntaje_por_cursos || [],
      observaciones: resultado.observaciones ? JSON.parse(resultado.observaciones) : [],
    });

    res.json({
      mensaje: 'Reporte generado correctamente',
      url: pdfUrl,
      downloadUrl: `${config.urls.publicApiUrl}${pdfUrl}`,
    });
  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    res.status(500).json({ error: 'Error al generar el reporte PDF.' });
  }
});

// GET /api/alumnos/:id_usuario/ranking — Posición del alumno en su salón
router.get('/:id_usuario/ranking', verificarToken, async (req, res) => {
  const canView =
    String(req.usuario.id_usuario) === String(req.params.id_usuario) ||
    ['profesor', 'secretaria', 'director', 'superadmin', 'admin'].includes(req.usuario.rol);
  if (!canView) return res.status(403).json({ error: 'Sin permiso.' });

  try {
    // Obtener el salón del alumno verificando academia (no superadmin)
    const acadFilter = req.usuario.rol !== 'superadmin' ? 'AND id_academia = $2' : '';
    const uParams = req.usuario.rol !== 'superadmin'
      ? [req.params.id_usuario, req.usuario.id_academia]
      : [req.params.id_usuario];
    const { rows: uRows } = await pool.query(
      `SELECT id_salon FROM usuarios WHERE id_usuario = $1 ${acadFilter}`,
      uParams
    );
    if (!uRows.length || !uRows[0].id_salon) {
      return res.json({ posicion: null, total: null, promedio_salon: null, promedio_alumno: null });
    }
    const idSalon = uRows[0].id_salon;

    // Promedio de nota por alumno del mismo salón (últimos 90 días)
    const { rows } = await pool.query(
      `SELECT r.id_usuario,
              ROUND(AVG(r.nota_final)::numeric, 1) AS promedio
       FROM resultados r
       JOIN usuarios u ON r.id_usuario = u.id_usuario
       WHERE u.id_salon = $1
         AND r.estado = 'confirmado'
         AND r.fecha_procesamiento >= NOW() - INTERVAL '90 days'
       GROUP BY r.id_usuario
       ORDER BY promedio DESC`,
      [idSalon]
    );

    if (!rows.length) {
      return res.json({ posicion: null, total: 0, promedio_salon: null, promedio_alumno: null });
    }

    const idx = rows.findIndex(r => String(r.id_usuario) === String(req.params.id_usuario));
    const promedioAlumno = idx >= 0 ? parseFloat(rows[idx].promedio) : null;
    const promedioSalon  = parseFloat((rows.reduce((a, r) => a + parseFloat(r.promedio), 0) / rows.length).toFixed(1));

    res.json({
      posicion:        idx >= 0 ? idx + 1 : null,
      total:           rows.length,
      promedio_alumno: promedioAlumno,
      promedio_salon:  promedioSalon,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error calculando ranking: ' + err.message });
  }
});

// GET /api/alumnos/:id_usuario/resumen-semanal — Últimos 4 resúmenes semanales
router.get('/:id_usuario/resumen-semanal', verificarToken, async (req, res) => {
  const canView =
    String(req.usuario.id_usuario) === String(req.params.id_usuario) ||
    ['profesor', 'secretaria', 'director', 'superadmin', 'admin'].includes(req.usuario.rol);
  if (!canView) return res.status(403).json({ error: 'Sin permiso.' });

  try {
    const acadFilter = req.usuario.rol !== 'superadmin' ? 'AND id_academia = $2' : '';
    const params = req.usuario.rol !== 'superadmin'
      ? [req.params.id_usuario, req.usuario.id_academia]
      : [req.params.id_usuario];
    const { rows } = await pool.query(
      `SELECT * FROM resumenes_semanales
       WHERE id_usuario = $1 ${acadFilter}
       ORDER BY semana_inicio DESC
       LIMIT 4`,
      params
    );
    res.json(rows);
  } catch (err) {
    if (err.code === '42P01') return res.json([]);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PLANTILLA CSV — descarga el modelo
// ==========================================
router.get('/plantilla-csv', verificarRoles('superadmin', 'director', 'secretaria'), (_req, res) => {
  const bom = '\uFEFF';
  const contenido = bom + [
    'nombre_completo,email,salon,codigo_alumno,password',
    'Juan Pérez García,juan@correo.com,Salón A,,',
    'María López Ríos,maria@correo.com,Salón B,ALUM-001,clave123',
    'Carlos Ramos,,Salón A,,',
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_alumnos.csv"');
  res.send(contenido);
});

// ==========================================
// IMPORTACIÓN MASIVA DESDE CSV
// ==========================================
const multer = require('multer');
const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parsearCSV(texto) {
  const lineas = texto.replace(/\r/g, '').split('\n').filter(l => l.trim());
  return lineas.map(linea => {
    const campos = [];
    let campo = '', dentroComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') { dentroComillas = !dentroComillas; }
      else if (c === ',' && !dentroComillas) { campos.push(campo.trim()); campo = ''; }
      else { campo += c; }
    }
    campos.push(campo.trim());
    return campos;
  });
}

router.post('/importar', verificarRoles('superadmin', 'director', 'secretaria'), uploadCsv.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo CSV.' });

  const { id_academia } = req.usuario;
  const texto = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, ''); // quitar BOM

  const filas = parsearCSV(texto);
  if (filas.length < 2) return res.status(400).json({ error: 'El CSV está vacío o solo tiene encabezado.' });

  // Cabecera: nombre_completo, email, salon, codigo_alumno, password
  const filasDatos = filas.slice(1);

  // Cargar salones de la academia para hacer lookup por nombre
  const { rows: salonesDB } = await pool.query(
    `SELECT s.id_salon, s.nombre_salon
     FROM salones s JOIN ciclos c ON c.id_ciclo = s.id_ciclo
     WHERE c.id_academia = $1 AND s.activo = true`,
    [id_academia]
  );
  const salonMap = {};
  salonesDB.forEach(s => { salonMap[s.nombre_salon.trim().toLowerCase()] = s.id_salon; });

  const resultados = { creados: 0, duplicados: 0, errores: [] };

  for (let i = 0; i < filasDatos.length; i++) {
    const [nombre_completo = '', email = '', salon = '', codigo_alumno = '', password = ''] = filasDatos[i];
    const numLinea = i + 2;

    if (!nombre_completo.trim()) {
      resultados.errores.push(`Línea ${numLinea}: nombre_completo vacío, se omitió.`);
      continue;
    }
    if (nombre_completo.trim().length > 150) {
      resultados.errores.push(`Línea ${numLinea}: nombre_completo demasiado largo (máx 150 chars).`);
      continue;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      resultados.errores.push(`Línea ${numLinea}: email inválido "${email.trim()}".`);
      continue;
    }
    if (codigo_alumno.trim().length > 50) {
      resultados.errores.push(`Línea ${numLinea}: codigo_alumno demasiado largo (máx 50 chars).`);
      continue;
    }

    // Buscar salón por nombre (insensible a mayúsculas)
    const idSalon = salon.trim() ? (salonMap[salon.trim().toLowerCase()] || null) : null;
    if (salon.trim() && !idSalon) {
      resultados.errores.push(`Línea ${numLinea}: salón "${salon}" no encontrado en la academia.`);
    }

    // Generar o usar ID personalizado
    const prefix = id_academia.substring(0, 4).toUpperCase();
    const idFinal = codigo_alumno.trim()
      ? codigo_alumno.trim().toUpperCase()
      : `ALUM-${prefix}-${Date.now().toString(36).toUpperCase()}-${i}`;

    // Verificar duplicado por ID o email
    try {
      const dupCheck = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE id_usuario = $1 OR (email = $2 AND email IS NOT NULL AND email != \'\')',
        [idFinal, email.trim() || null]
      );
      if (dupCheck.rows.length > 0) {
        resultados.duplicados++;
        continue;
      }

      const passHashFinal = await bcrypt.hash(password.trim() || nombre_completo.trim(), 10);
      await pool.query(
        `INSERT INTO usuarios (id_usuario, id_academia, id_salon, rol, nombre_completo, email, password_hash, activo)
         VALUES ($1, $2, $3, 'alumno', $4, $5, $6, true)`,
        [idFinal, id_academia, idSalon, nombre_completo.trim(), email.trim() || null, passHashFinal]
      );
      resultados.creados++;
    } catch (err) {
      resultados.errores.push(`Línea ${numLinea} (${nombre_completo}): ${err.message}`);
    }
  }

  await registrarLog(
    req.usuario.id_usuario, id_academia, 'IMPORTACION_MASIVA',
    `Importación CSV: ${resultados.creados} creados, ${resultados.duplicados} duplicados, ${resultados.errores.length} errores`,
    req.ip
  );

  res.json({
    mensaje: `Importación completada: ${resultados.creados} alumnos creados.`,
    ...resultados,
  });
});

// ==========================================
// CICLO DE VIDA DEL ALUMNO
// PUT /api/alumnos/:id/estado
// ==========================================
const ESTADOS_VALIDOS = ['activo', 'inactivo', 'graduado', 'retirado'];

router.put('/:id_usuario/estado', async (req, res) => {
  const { rol, id_academia } = req.usuario;
  if (!canManageStudents(rol)) {
    return res.status(403).json({ error: 'Sin permiso para modificar estado del alumno.' });
  }

  const { id_usuario } = req.params;
  const { estado_alumno } = req.body;

  if (!ESTADOS_VALIDOS.includes(estado_alumno)) {
    return res.status(400).json({ error: `Estado inválido. Usa: ${ESTADOS_VALIDOS.join(', ')}.` });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios
       SET estado_alumno = $1
       WHERE id_usuario = $2 AND id_academia = $3 AND rol = 'alumno'
       RETURNING id_usuario, nombre_completo, estado_alumno`,
      [estado_alumno, id_usuario, id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Alumno no encontrado.' });
    res.json({ mensaje: 'Estado actualizado.', alumno: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando estado del alumno.' });
  }
});

// ==========================================
// RACHA DE LOGIN DEL USUARIO AUTENTICADO
// GET /api/alumnos/mi-racha
// ==========================================
router.get('/mi-racha', async (req, res) => {
  const id_usuario = req.usuario.id_usuario;
  try {
    const { rows } = await pool.query(
      `SELECT racha_actual, racha_maxima, ultimo_login
       FROM rachas_login
       WHERE id_usuario = $1`,
      [id_usuario]
    );
    if (!rows.length) return res.json({ racha_actual: 0, racha_maxima: 0, ultimo_login: null });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '42P01') return res.json({ racha_actual: 0, racha_maxima: 0, ultimo_login: null });
    res.status(500).json({ error: 'Error obteniendo racha.' });
  }
});

// ==========================================
// ASIGNAR / REMOVER PADRE/APODERADO DE UN ALUMNO
// PUT /api/alumnos/:id_usuario/padre
// Body: { id_padre: "PAD-xxx" } o { id_padre: null }
// ==========================================
router.put('/:id_usuario/padre', verificarToken, verificarRoles('director', 'secretaria', 'superadmin'), async (req, res) => {
  const { id_usuario } = req.params;
  const { id_padre }   = req.body;

  try {
    const alumnoCheck = await pool.query(
      `SELECT id_academia FROM usuarios WHERE id_usuario = $1 AND rol = 'alumno' AND activo`,
      [id_usuario]
    );
    if (!alumnoCheck.rows.length) return res.status(404).json({ error: 'Alumno no encontrado.' });
    if (alumnoCheck.rows[0].id_academia !== req.usuario.id_academia && req.usuario.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    if (id_padre) {
      const padreCheck = await pool.query(
        `SELECT id_usuario FROM usuarios WHERE id_usuario = $1 AND rol = 'padre' AND activo`,
        [id_padre]
      );
      if (!padreCheck.rows.length) return res.status(404).json({ error: 'Padre no encontrado o no tiene rol padre.' });
    }

    await pool.query('UPDATE usuarios SET id_padre = $1 WHERE id_usuario = $2', [id_padre || null, id_usuario]);
    await registrarLog(req.usuario.id_usuario, req.usuario.id_academia, 'ASIGNAR_PADRE', `Padre ${id_padre || 'removido'} al alumno ${id_usuario}`, req.ip);
    res.json({ mensaje: id_padre ? 'Apoderado asignado.' : 'Apoderado removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Error asignando apoderado: ' + err.message });
  }
});

// ==========================================
// ASIGNAR / REMOVER TUTOR DE UN ALUMNO
// PUT /api/alumnos/:id_usuario/tutor
// Body: { id_tutor: "TUT-xxx" } o { id_tutor: null } para remover
// ==========================================
router.put('/:id_usuario/tutor', verificarToken, verificarRoles('director', 'secretaria', 'superadmin'), async (req, res) => {
  const { id_usuario } = req.params;
  const { id_tutor }   = req.body; // null = remover

  try {
    // Verificar que el alumno pertenece a esta academia
    const alumnoCheck = await pool.query(
      `SELECT id_academia FROM usuarios WHERE id_usuario = $1 AND rol = 'alumno' AND activo`,
      [id_usuario]
    );
    if (!alumnoCheck.rows.length) return res.status(404).json({ error: 'Alumno no encontrado.' });
    if (alumnoCheck.rows[0].id_academia !== req.usuario.id_academia && req.usuario.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado.' });
    }

    // Si se envía un tutor, verificar que existe y pertenece a la misma academia con rol tutor
    if (id_tutor) {
      const tutorCheck = await pool.query(
        `SELECT id_usuario FROM usuarios WHERE id_usuario = $1 AND rol = 'tutor' AND activo`,
        [id_tutor]
      );
      if (!tutorCheck.rows.length) return res.status(404).json({ error: 'Tutor no encontrado o no es rol tutor.' });
    }

    await pool.query('UPDATE usuarios SET id_tutor = $1 WHERE id_usuario = $2', [id_tutor || null, id_usuario]);

    const accion = id_tutor ? `Tutor ${id_tutor} asignado` : 'Tutor removido';
    await registrarLog(req.usuario.id_usuario, req.usuario.id_academia, 'ASIGNAR_TUTOR', `${accion} al alumno ${id_usuario}`, req.ip);

    res.json({ mensaje: id_tutor ? 'Tutor asignado correctamente.' : 'Tutor removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Error asignando tutor: ' + err.message });
  }
});

module.exports = router;

// ==========================================
// SIMULADOR DE INGRESO (ALUMNO)
// ==========================================

// Obtener carreras objetivo de la academia
router.get('/carreras-objetivo', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM carreras_objetivo 
       WHERE id_academia = $1 AND activo = true
       ORDER BY universidad, nombre_carrera`,
      [req.usuario.id_academia]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando carreras: ' + err.message });
  }
});

// Agregar carrera objetivo personal
router.post('/carrera-objetivo', verificarToken, async (req, res) => {
  const { nombre_carrera, universidad, puntaje_minimo } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO carreras_objetivo (id_academia, nombre_carrera, universidad, puntaje_minimo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.usuario.id_academia, nombre_carrera, universidad, puntaje_minimo]
    );
    res.json({ mensaje: 'Carrera objetivo agregada.', carrera: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error agregando carrera: ' + err.message });
  }
});

// ==========================================
// GAMIFICACIÓN - RACHAS Y BADGES
// ==========================================

// Obtener rachas del alumno
router.get('/:id_usuario/rachas', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM rachas_alumno 
       WHERE id_usuario = $1
       ORDER BY tipo_racha`,
      [req.params.id_usuario]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando rachas: ' + err.message });
  }
});

// Actualizar racha (login diario)
router.post('/:id_usuario/racha-login', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `INSERT INTO rachas_alumno (id_usuario, tipo_racha, racha_actual, racha_maxima, ultimo_registro, actualizado_en)
       VALUES ($1, 'login', 1, 1, CURRENT_DATE, NOW())
       ON CONFLICT (id_usuario, tipo_racha) DO UPDATE SET
         racha_actual = CASE
           WHEN rachas_alumno.ultimo_registro = CURRENT_DATE THEN rachas_alumno.racha_actual
           WHEN rachas_alumno.ultimo_registro = CURRENT_DATE - 1 THEN rachas_alumno.racha_actual + 1
           ELSE 1
         END,
         racha_maxima = GREATEST(
           rachas_alumno.racha_maxima,
           CASE
             WHEN rachas_alumno.ultimo_registro = CURRENT_DATE THEN rachas_alumno.racha_actual
             WHEN rachas_alumno.ultimo_registro = CURRENT_DATE - 1 THEN rachas_alumno.racha_actual + 1
             ELSE 1
           END
         ),
         ultimo_registro = CASE
           WHEN rachas_alumno.ultimo_registro = CURRENT_DATE THEN rachas_alumno.ultimo_registro
           ELSE CURRENT_DATE
         END,
         actualizado_en = NOW()
       RETURNING *`,
      [req.params.id_usuario]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando racha: ' + err.message });
  }
});

// Obtener badges del alumno
router.get('/:id_usuario/badges', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM alumnos_badges WHERE id_usuario = $1 ORDER BY ganado_en DESC`,
      [req.params.id_usuario]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error cargando badges: ' + err.message });
  }
});

// Desbloquear badge
router.post('/:id_usuario/badge', verificarToken, async (req, res) => {
  const { codigo_badge, nombre_badge, descripcion, icono } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO alumnos_badges (id_usuario, codigo_badge, nombre_badge, descripcion, icono)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_usuario, codigo_badge) DO NOTHING
       RETURNING *`,
      [req.params.id_usuario, codigo_badge, nombre_badge, descripcion, icono || '🏆']
    );
    res.json({ 
      mensaje: result.rows.length > 0 ? 'Badge desbloqueado!' : 'Badge ya obtenido',
      badge: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Error desbloqueando badge: ' + err.message });
  }
});
