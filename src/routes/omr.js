const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');
const { registrarLog } = require('./audit');
const { crearNotificacion } = require('../utils/notificaciones');
const { enviarEmailExamenCalificado } = require('../utils/email');
const config = require('../config');

// Límites de escaneos mensuales por plan
const LIMITES_PLAN = { basico: 200, starter: 200, pro: 500, academy: Infinity };

// Motor de cálculo reutilizable
function calcularNota(respuestas, claves, configCursos, tipo_calificacion) {
  let nota_total = 0;
  let desglose = [];
  if (configCursos?.areas && Array.isArray(configCursos.areas)) {
    configCursos.areas.forEach((area) => {
      let a = 0, e = 0, b = 0;
      for (let q = parseInt(area.inicio); q <= parseInt(area.fin); q++) {
        const rA = respuestas[q.toString()] || '';
        const rC = claves[q.toString()];
        if (!rC) continue;
        if (!rA) b++; else if (rA === rC) a++; else e++;
      }
      const ptje = a * parseFloat(area.correcta) + e * parseFloat(area.incorrecta) + b * (parseFloat(area.blanco) || 0);
      nota_total += ptje;
      desglose.push({ curso: area.nombre, aciertos: a, errores: e, blancos: b, puntaje: ptje.toFixed(3) });
    });
  } else {
    const pPos = tipo_calificacion === 'uni' ? 5 : 20;
    const pNeg = tipo_calificacion === 'uni' ? -1 : -1.125;
    let a = 0, e = 0, b = 0;
    for (const nQ of Object.keys(claves)) {
      const rA = respuestas[nQ] || '';
      if (!rA) b++; else if (rA === claves[nQ]) a++; else e++;
    }
    nota_total = a * pPos + e * pNeg;
    desglose.push({ curso: 'GLOBAL', aciertos: a, errores: e, blancos: b, puntaje: nota_total.toFixed(3) });
  }
  return { nota_total: parseFloat(nota_total.toFixed(3)), desglose };
}

const pool = new Pool(config.database);
const OMR_SECRET = process.env.OMR_CALLBACK_SECRET || 'sigma_omr_2026';

// ── Control de concurrencia y reintentos para n8n ────────────
let _omrConcurrentes = 0;
const OMR_MAX_CONCURRENTES = 3;
const OMR_TIMEOUT_MS = 30_000;        // 30s por intento
const OMR_MAX_REINTENTOS = 3;         // 3 intentos en total (intento 1 + 2 reintentos)
const OMR_DELAY_REINTENTO_MS = 5_000; // 5s entre reintentos

async function enviarAOMRService(url, formData) {
  let ultimoError;
  for (let intento = 1; intento <= OMR_MAX_REINTENTOS; intento++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OMR_TIMEOUT_MS);
    try {
      const resp = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json.error || 'Error en servicio OMR');
      return json; // éxito
    } catch (err) {
      ultimoError = err.name === 'AbortError'
        ? new Error('Timeout (30s) al conectar con motor OMR nativo')
        : err;
      if (intento < OMR_MAX_REINTENTOS) {
        await new Promise(r => setTimeout(r, OMR_DELAY_REINTENTO_MS));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw ultimoError;
}

// ==========================================
// MOTOR ANTI-COLAPSO: Worker en Background (Cola)
// ==========================================
async function procesarSiguienteEnCola() {
  if (_omrConcurrentes >= OMR_MAX_CONCURRENTES) return; // Todo ocupado

  try {
    // Tomar el registro más antiguo en_cola usando un lock (Skip Locked evita condiciones de carrera)
    const { rows } = await pool.query(
      `UPDATE resultados
       SET omr_estado = 'procesando', omr_intentos = omr_intentos + 1, omr_ultimo_intento = NOW()
       WHERE id_resultado = (
         SELECT id_resultado FROM resultados
         WHERE omr_estado IN ('en_cola', 'error_reintentar')
           AND omr_intentos < $1
         ORDER BY fecha_procesamiento ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id_resultado, url_imagen_scan`,
      [OMR_MAX_REINTENTOS]
    );

    if (rows.length === 0) return; // Nada en la cola

    const resultado = rows[0];
    const imagePath = `public${resultado.url_imagen_scan}`;

    if (!fs.existsSync(imagePath)) {
      await pool.query("UPDATE resultados SET omr_estado = 'error_manual', omr_error_detalle = 'Imagen física no encontrada' WHERE id_resultado = $1", [resultado.id_resultado]);
      return procesarSiguienteEnCola(); // Buscar el siguiente
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), path.basename(imagePath));
    formData.append('id_resultado', String(resultado.id_resultado));

    _omrConcurrentes++;
    const OMR_SERVICE_URL = process.env.OMR_SERVICE_URL || 'http://omr_service:5000/api/omr/process';
    
    enviarAOMRService(OMR_SERVICE_URL, formData)
      .then(async (json) => {
        const { respuestas_detectadas, confianza_por_pregunta, codigo_leido_ia } = json;
        
        let id_alumno = null;
        if (codigo_leido_ia && codigo_leido_ia !== 'DESCONOCIDO' && codigo_leido_ia !== '000000') {
          const alumnoRow = await pool.query('SELECT id_usuario FROM usuarios WHERE id_usuario::text = $1 LIMIT 1', [codigo_leido_ia]);
          if (alumnoRow.rows.length > 0) id_alumno = alumnoRow.rows[0].id_usuario;
        }

        await pool.query(
          `UPDATE resultados SET
             omr_estado = 'revision_humana', respuestas_detectadas = $1, omr_confianza = $2,
             codigo_leido_ia = $3, id_usuario = COALESCE($4, id_usuario)
           WHERE id_resultado = $5`,
          [JSON.stringify(respuestas_detectadas || {}), JSON.stringify(confianza_por_pregunta || {}), codigo_leido_ia || null, id_alumno, resultado.id_resultado]
        );
      })
      .catch(async (err) => {
        await pool.query(
          "UPDATE resultados SET omr_estado = 'error_reintentar', omr_error_detalle = $1 WHERE id_resultado = $2",
          [`Motor OMR falló: ${err.message}`, resultado.id_resultado]
        );
      })
      .finally(() => {
        _omrConcurrentes--;
        procesarSiguienteEnCola(); // Iniciar inmediatamente el siguiente
      });

    // Validar si hay más espacio para lanzar otro concurrente
    procesarSiguienteEnCola();

  } catch (err) {
    console.error('Error fatal en worker OMR:', err);
  }
}

// Iniciar worker general de escaneo que funciona de fondo (cada 10s verifica si quedó algo trabado)
setInterval(procesarSiguienteEnCola, 10000);

// ── Multer ──────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'scan-' + suffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se aceptan imágenes'));
  },
});

// ── Callback n8n NO requiere JWT ─────────────────────────────
// ==========================================
// CALLBACK DE n8n → backend (sin token)
// ==========================================
router.post('/callback', async (req, res) => {
  const { id_resultado, omr_secret, respuestas_detectadas, confianza_por_pregunta, codigo_leido, error } = req.body;

  if (omr_secret !== OMR_SECRET) {
    return res.status(401).json({ error: 'Secreto OMR inválido.' });
  }
  if (!id_resultado) return res.status(400).json({ error: 'Falta id_resultado.' });

  try {
    if (error) {
      await pool.query(
        "UPDATE resultados SET omr_estado = 'error_reintentar', omr_error_detalle = $1 WHERE id_resultado = $2",
        [error, id_resultado]
      );
      return res.json({ ok: true });
    }

    // Intentar resolver id_alumno a partir del código leído por la IA
    let id_alumno = null;
    if (codigo_leido && codigo_leido !== 'DESCONOCIDO' && codigo_leido !== '000000') {
      const alumnoRow = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE id_usuario::text = $1 LIMIT 1',
        [codigo_leido]
      );
      if (alumnoRow.rows.length > 0) id_alumno = alumnoRow.rows[0].id_usuario;
    }

    if (id_alumno) {
      await pool.query(
        `UPDATE resultados SET
           omr_estado = 'revision_humana',
           respuestas_detectadas = $1,
           omr_confianza = $2,
           codigo_leido_ia = $3,
           id_usuario = $4
         WHERE id_resultado = $5`,
        [
          JSON.stringify(respuestas_detectadas || {}),
          JSON.stringify(confianza_por_pregunta || {}),
          codigo_leido || null,
          id_alumno,
          id_resultado,
        ]
      );
    } else {
      await pool.query(
        `UPDATE resultados SET
           omr_estado = 'revision_humana',
           respuestas_detectadas = $1,
           omr_confianza = $2,
           codigo_leido_ia = $3
         WHERE id_resultado = $4`,
        [
          JSON.stringify(respuestas_detectadas || {}),
          JSON.stringify(confianza_por_pregunta || {}),
          codigo_leido || null,
          id_resultado,
        ]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en callback OMR:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Todas las rutas siguientes requieren JWT ─────────────────
router.use(verificarToken);

// ==========================================
// COLA 1 — SUBIR FOTO (validación sharp + en_cola)
// ==========================================
router.post('/subir', verificarRoles('superadmin', 'director', 'profesor'), upload.single('imagen_examen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

  const { codigo_examen, id_alumno } = req.body;
  const id_profesor = req.usuario.id_usuario;
  const id_academia = req.usuario.id_academia;

  if (!codigo_examen) return res.status(400).json({ error: 'Debes seleccionar un examen.' });

  // Validación con sharp
  try {
    const meta = await sharp(req.file.path).metadata();

    if (!meta.width || meta.width < 800 || meta.height < 800) {
      return res.status(400).json({ error: 'Foto muy pequeña (mínimo 800×800 px). Acércate más al papel.' });
    }
    if (meta.width > meta.height * 1.2) {
      return res.status(400).json({ error: 'Foto horizontal. Gira el celular para que el papel quede vertical.' });
    }

    const stats = await sharp(req.file.path).stats();
    const brightness = stats.channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / 3;
    if (brightness < 30) {
      return res.status(400).json({ error: 'Foto muy oscura. Mejora la iluminación e intenta de nuevo.' });
    }
    if (brightness > 240) {
      return res.status(400).json({ error: 'Foto sobreexpuesta. Evita el flash directo.' });
    }
  } catch {
    return res.status(400).json({ error: 'Imagen inválida o corrupta. Sube una foto real del examen.' });
  }

  try {
    const { rows: exam } = await pool.query(
      'SELECT id FROM examenes_plantillas WHERE codigo_examen = $1 AND id_academia = $2',
      [codigo_examen, id_academia]
    );
    if (exam.length === 0) return res.status(404).json({ error: 'Examen no encontrado en esta academia.' });

    // Verificar límite de escaneos del plan
    const { rows: planRow } = await pool.query(
      "SELECT COALESCE(plan_activo, 'basico') AS plan FROM academias WHERE id_academia = $1",
      [id_academia]
    );
    const plan = planRow[0]?.plan || 'basico';
    const limite = LIMITES_PLAN[plan] ?? 200;
    if (limite !== Infinity) {
      const { rows: usoRow } = await pool.query(
        `SELECT COUNT(*) AS uso FROM resultados r
         JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
         WHERE ep.id_academia = $1 AND DATE_TRUNC('month', r.fecha_procesamiento) = DATE_TRUNC('month', NOW())`,
        [id_academia]
      );
      const uso = parseInt(usoRow[0]?.uso || 0);
      if (uso >= limite) {
        return res.status(429).json({
          error: `Has alcanzado el límite de ${limite} escaneos/mes del plan ${plan.toUpperCase()}. Contacta a LB Systems para hacer upgrade.`,
          uso, limite,
        });
      }
    }

    const url_foto = `/uploads/${req.file.filename}`;

    const { rows } = await pool.query(
      `INSERT INTO resultados
         (codigo_examen, id_usuario, id_profesor, url_imagen_scan,
          omr_estado, omr_intentos, respuestas_alumno, puntaje_por_cursos, nota_total)
       VALUES ($1, $2, $3, $4, 'en_cola', 0, '{}'::jsonb, '[]'::jsonb, 0)
       RETURNING id_resultado`,
      [codigo_examen, id_alumno || null, id_profesor, url_foto]
    );

    res.status(201).json({ mensaje: 'Foto recibida y en cola.', id_resultado: rows[0].id_resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando en cola: ' + err.message });
  }
});

// ==========================================
// BANDEJA DEL PROFESOR — ver cola pendiente
// ==========================================
router.get('/bandeja', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_academia = req.usuario.id_academia;

  try {
    const { rows } = await pool.query(
      `SELECT
         r.id_resultado, r.codigo_examen, r.omr_estado, r.omr_intentos,
         r.omr_confianza, r.omr_error_detalle, r.fecha_procesamiento,
         r.url_imagen_scan, r.respuestas_detectadas, r.codigo_leido_ia,
         u.nombre_completo AS nombre_alumno,
         p.nombre_completo AS nombre_profesor,
         ep.nombre_simulacro
       FROM resultados r
       LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
       LEFT JOIN usuarios p ON r.id_profesor = p.id_usuario
       LEFT JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
       WHERE ep.id_academia = $1
         AND r.omr_estado IN ('en_cola', 'procesando', 'revision_humana', 'error_reintentar')
       ORDER BY r.fecha_procesamiento DESC`,
      [id_academia]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo bandeja.' });
  }
});

// ==========================================
// COLA 2 — AGREGAR A LA COLA (Dispara el worker)
// ==========================================
router.post('/procesar/:id', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_resultado = req.params.id;
  const id_academia = req.usuario.id_academia;

  try {
    const { rows } = await pool.query(
      `UPDATE resultados 
       SET omr_estado = 'en_cola', omr_intentos = 0
       WHERE id_resultado = $1 
         AND id_resultado IN (
           SELECT r.id_resultado FROM resultados r
           JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
           WHERE ep.id_academia = $2
         )
       RETURNING id_resultado`,
      [id_resultado, id_academia]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Resultado no encontrado o sin acceso.' });
    }

    // Disparar el worker para que capte el trabajo en fondo si hay capacidad
    procesarSiguienteEnCola();

    res.json({ mensaje: 'Añadido a la cola de procesamiento IA.', id_resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error añadiendo a cola: ' + err.message });
  }
});

// ==========================================
// CONFIRMAR — profesor revisa y acepta (con o sin correcciones)
// ==========================================
router.post('/confirmar/:id', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_resultado = req.params.id;
  const id_academia = req.usuario.id_academia;
  const { respuestas_finales, id_alumno } = req.body;

  try {
    const { rows } = await pool.query(
      `SELECT r.*, ep.claves_correctas, ep.configuracion_cursos, ep.tipo_calificacion
       FROM resultados r
       JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
       WHERE r.id_resultado = $1 AND ep.id_academia = $2
         AND r.omr_estado = 'revision_humana'`,
      [id_resultado, id_academia]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Resultado no encontrado o no está listo para confirmar.' });
    }

    const r = rows[0];
    const respuestas = respuestas_finales || r.respuestas_detectadas || {};
    const claves = r.claves_correctas || {};
    const configCursos = r.configuracion_cursos || {};

    // Motor de cálculo
    let nota_total = 0;
    let desglose_cursos = [];

    if (configCursos.areas && Array.isArray(configCursos.areas)) {
      configCursos.areas.forEach((area) => {
        let a = 0, e = 0, b = 0;
        for (let q = parseInt(area.inicio); q <= parseInt(area.fin); q++) {
          const rAlumno = respuestas[q.toString()] || '';
          const rCorrecta = claves[q.toString()];
          if (!rCorrecta) continue;
          if (!rAlumno) b++;
          else if (rAlumno === rCorrecta) a++;
          else e++;
        }
        const pPos = parseFloat(area.correcta);
        const pNeg = parseFloat(area.incorrecta);
        const pBlanco = parseFloat(area.blanco) || 0;
        const ptje = a * pPos + e * pNeg + b * pBlanco;
        nota_total += ptje;
        desglose_cursos.push({ curso: area.nombre, aciertos: a, errores: e, blancos: b, puntaje: ptje.toFixed(3) });
      });
    } else {
      const pPos = r.tipo_calificacion === 'uni' ? 5 : 20;
      const pNeg = r.tipo_calificacion === 'uni' ? -1 : -1.125;
      let a = 0, e = 0, b = 0;
      for (const nQ of Object.keys(claves)) {
        const rA = respuestas[nQ] || '';
        if (!rA) b++;
        else if (rA === claves[nQ]) a++;
        else e++;
      }
      nota_total = a * pPos + e * pNeg;
      desglose_cursos.push({ curso: 'GLOBAL', aciertos: a, errores: e, blancos: b, puntaje: nota_total.toFixed(3) });
    }

    nota_total = parseFloat(nota_total.toFixed(3));
    const alumnoId = id_alumno || r.id_usuario;

    await pool.query(
      `UPDATE resultados SET
         omr_estado = 'confirmado',
         nota_total = $1,
         respuestas_alumno = $2,
         puntaje_por_cursos = $3,
         id_usuario = $4
       WHERE id_resultado = $5`,
      [nota_total, JSON.stringify(respuestas), JSON.stringify(desglose_cursos), alumnoId, id_resultado]
    );

    // Notificar al alumno que su examen fue calificado
    if (alumnoId) {
      crearNotificacion(
        alumnoId,
        id_academia,
        'examen_confirmado',
        '📋 Examen calificado',
        `Tu examen fue corregido. Nota: ${nota_total} pts.`,
        'resumen'
      );

      // Email al alumno con resultado (fire-and-forget)
      pool.query(
        `SELECT u.email, u.nombre_completo, ep.nombre_simulacro
         FROM usuarios u
         JOIN examenes_plantillas ep ON ep.codigo_examen = $2
         WHERE u.id_usuario = $1`,
        [alumnoId, r.codigo_examen]
      ).then(({ rows }) => {
        if (rows[0]?.email) {
          enviarEmailExamenCalificado({
            email: rows[0].email,
            nombre: rows[0].nombre_completo,
            examen: rows[0].nombre_simulacro || r.codigo_examen,
            nota: nota_total,
            desglose: desglose_cursos,
          });
        }
      }).catch(() => {});
    }

    res.json({ mensaje: 'Examen confirmado y calificado.', nota_total, desglose_cursos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error confirmando examen: ' + err.message });
  }
});

// ==========================================
// INGRESO MANUAL (modo degradado si n8n cae)
// ==========================================
router.post('/manual/:id', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_resultado = req.params.id;
  const id_academia = req.usuario.id_academia;
  const { respuestas_manuales, id_alumno } = req.body;

  if (!respuestas_manuales) return res.status(400).json({ error: 'Faltan las respuestas manuales.' });

  try {
    const { rows } = await pool.query(
      `SELECT r.id_resultado FROM resultados r
       JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
       WHERE r.id_resultado = $1 AND ep.id_academia = $2
         AND r.omr_estado IN ('en_cola', 'error_reintentar', 'error_manual')`,
      [id_resultado, id_academia]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Resultado no encontrado o en estado incorrecto.' });

    await pool.query(
      `UPDATE resultados SET
         omr_estado = 'revision_humana',
         respuestas_detectadas = $1,
         omr_confianza = '{}'::jsonb,
         id_usuario = COALESCE($2, id_usuario)
       WHERE id_resultado = $3`,
      [JSON.stringify(respuestas_manuales), id_alumno || null, id_resultado]
    );

    res.json({ mensaje: 'Respuestas guardadas. Confirma para calcular la nota.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en ingreso manual: ' + err.message });
  }
});

// ==========================================
// CONFIRMADOS RECIENTES — para corrección post-confirmación
// ==========================================
router.get('/confirmados-recientes', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_academia = req.usuario.id_academia;
  const rol = req.usuario.rol;
  // Profesor: solo últimas 24h. Director/superadmin: últimos 7 días
  const horas = (rol === 'profesor') ? 24 : 7 * 24;

  try {
    const { rows } = await pool.query(
      `SELECT r.id_resultado, r.codigo_examen, r.nota_total, r.respuestas_alumno,
              r.puntaje_por_cursos, r.fecha_procesamiento, r.id_usuario,
              u.nombre_completo AS nombre_alumno,
              p.nombre_completo AS nombre_profesor,
              ep.nombre_simulacro
       FROM resultados r
       LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
       LEFT JOIN usuarios p ON r.id_profesor = p.id_usuario
       JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
       WHERE ep.id_academia = $1
         AND r.omr_estado = 'confirmado'
         AND r.fecha_procesamiento >= NOW() - ($2 || ' hours')::INTERVAL
       ORDER BY r.fecha_procesamiento DESC
       LIMIT 50`,
      [id_academia, horas]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo confirmados recientes.' });
  }
});

// ==========================================
// CORREGIR — corrección post-confirmación con auditoría
// ==========================================
router.put('/corregir/:id', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_resultado = req.params.id;
  const id_academia = req.usuario.id_academia;
  const { id_usuario, rol } = req.usuario;
  const { respuestas_corregidas, motivo } = req.body;

  if (!motivo || motivo.trim().length < 10) {
    return res.status(400).json({ error: 'El motivo es obligatorio (mínimo 10 caracteres).' });
  }
  if (!respuestas_corregidas) {
    return res.status(400).json({ error: 'Faltan las respuestas corregidas.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT r.*, ep.claves_correctas, ep.configuracion_cursos, ep.tipo_calificacion
       FROM resultados r
       JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
       WHERE r.id_resultado = $1 AND ep.id_academia = $2 AND r.omr_estado = 'confirmado'`,
      [id_resultado, id_academia]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Resultado no encontrado o no está confirmado.' });
    }

    const r = rows[0];

    if (rol === 'profesor') {
      const horasDesde = (Date.now() - new Date(r.fecha_procesamiento).getTime()) / 3600000;
      if (horasDesde > 24) {
        return res.status(403).json({ error: 'Los profesores solo pueden corregir dentro de las primeras 24 horas. Solicita al director.' });
      }
    }

    const { nota_total, desglose } = calcularNota(
      respuestas_corregidas,
      r.claves_correctas || {},
      r.configuracion_cursos || {},
      r.tipo_calificacion
    );

    const nota_anterior = parseFloat(r.nota_total);

    await pool.query(
      `UPDATE resultados SET nota_total = $1, respuestas_alumno = $2, puntaje_por_cursos = $3 WHERE id_resultado = $4`,
      [nota_total, JSON.stringify(respuestas_corregidas), JSON.stringify(desglose), id_resultado]
    );

    await registrarLog(
      id_usuario, id_academia, 'CORRECCION_NOTA',
      `Resultado #${id_resultado} | Nota anterior: ${nota_anterior} → Nueva: ${nota_total} | Motivo: ${motivo.trim()}`,
      null
    );

    res.json({ mensaje: 'Corrección aplicada y registrada.', nota_total, nota_anterior, desglose });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error aplicando corrección: ' + err.message });
  }
});

// ==========================================
// ANÁLISIS — errores por pregunta de un examen
// ==========================================
router.get('/analisis/:codigo_examen', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const { codigo_examen } = req.params;
  const id_academia = req.usuario.id_academia;

  try {
    const { rows: examRows } = await pool.query(
      `SELECT claves_correctas, nombre_simulacro FROM examenes_plantillas
       WHERE codigo_examen = $1 AND id_academia = $2`,
      [codigo_examen, id_academia]
    );
    if (examRows.length === 0) return res.status(404).json({ error: 'Examen no encontrado.' });

    const claves = examRows[0].claves_correctas || {};
    const numPreguntas = Object.keys(claves).length;

    const { rows: results } = await pool.query(
      `SELECT respuestas_alumno FROM resultados
       WHERE codigo_examen = $1 AND omr_estado = 'confirmado'`,
      [codigo_examen]
    );

    if (results.length === 0) {
      return res.json({ nombre_simulacro: examRows[0].nombre_simulacro, total_examenes: 0, preguntas: [] });
    }

    const stats = {};
    for (let q = 1; q <= numPreguntas; q++) {
      stats[q] = { pregunta: q, clave: claves[q.toString()], correctas: 0, incorrectas: 0, blancos: 0, total: 0 };
    }

    for (const row of results) {
      const resp = row.respuestas_alumno || {};
      for (let q = 1; q <= numPreguntas; q++) {
        const qs = q.toString();
        if (!claves[qs]) continue;
        stats[q].total++;
        const r = resp[qs] || '';
        if (!r) stats[q].blancos++;
        else if (r === claves[qs]) stats[q].correctas++;
        else stats[q].incorrectas++;
      }
    }

    const preguntas = Object.values(stats)
      .filter(s => s.total > 0)
      .map(s => ({
        ...s,
        pct_correcto: Math.round((s.correctas / s.total) * 100),
        pct_error: Math.round((s.incorrectas / s.total) * 100),
      }))
      .sort((a, b) => b.pct_error - a.pct_error);

    res.json({ nombre_simulacro: examRows[0].nombre_simulacro, total_examenes: results.length, preguntas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error calculando análisis: ' + err.message });
  }
});

// ==========================================
// USO OMR — cuántos escaneos lleva la academia este mes
// ==========================================
router.get('/uso-mensual', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_academia = req.usuario.id_academia;
  try {
    const { rows: planRow } = await pool.query(
      "SELECT COALESCE(plan_activo, 'basico') AS plan FROM academias WHERE id_academia = $1",
      [id_academia]
    );
    const plan = planRow[0]?.plan || 'basico';
    const limite = LIMITES_PLAN[plan] ?? 200;

    const { rows: usoRow } = await pool.query(
      `SELECT COUNT(*) AS uso FROM resultados r
       JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
       WHERE ep.id_academia = $1 AND DATE_TRUNC('month', r.fecha_procesamiento) = DATE_TRUNC('month', NOW())`,
      [id_academia]
    );
    const uso = parseInt(usoRow[0]?.uso || 0);

    res.json({ uso, limite: limite === Infinity ? null : limite, plan, pct: limite === Infinity ? 0 : Math.round((uso / limite) * 100) });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo uso mensual.' });
  }
});

module.exports = router;
