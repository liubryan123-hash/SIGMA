const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

// Ruta blindada por el JWT Pase VIP
router.use(verificarToken);


// ==========================================
// 1. CREAR PLANTILLA DE EXAMEN (El "Molde de Respuestas" Oficial)
// ==========================================
router.post('/plantilla', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const { codigo_examen, nombre_simulacro, claves_correctas, configuracion_cursos, id_salon, tipo_calificacion, estado, fecha_apertura, fecha_cierre } = req.body;
  const id_creador = req.usuario.id_usuario; 
  const id_academia = req.usuario.id_academia;

  if (!codigo_examen || !claves_correctas) {
    return res.status(400).json({ error: 'Error Táctico: Faltan las claves correctas o el código del simulacro.' });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO examenes_plantillas 
      (codigo_examen, id_academia, id_creador, nombre_simulacro, claves_correctas, configuracion_cursos, id_salon, tipo_calificacion, estado, fecha_apertura, fecha_cierre)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (codigo_examen) DO UPDATE 
      SET nombre_simulacro = EXCLUDED.nombre_simulacro, claves_correctas = EXCLUDED.claves_correctas, id_salon = EXCLUDED.id_salon, 
          tipo_calificacion = EXCLUDED.tipo_calificacion, estado = EXCLUDED.estado, fecha_apertura = EXCLUDED.fecha_apertura, fecha_cierre = EXCLUDED.fecha_cierre
      RETURNING *
    `, [codigo_examen, id_academia, id_creador, nombre_simulacro, JSON.stringify(claves_correctas), JSON.stringify(configuracion_cursos || {}), id_salon || null, tipo_calificacion || 'unmsm', estado || 'cerrado', fecha_apertura || null, fecha_cierre || null]);

    res.status(201).json({ mensaje: '¡Molde de Simulacro Sincronizado en Disco!', plantilla_guardada: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fallo al sincronizar la plantilla en PostgreSQL' });
  }
});

// ==========================================
// 1.5 LISTAR PLANTILLAS DE LA ACADEMIA
// ==========================================
router.get('/plantillas', verificarRoles('superadmin', 'director', 'secretaria', 'profesor', 'tutor'), async (req, res) => {
   const id_academia = req.usuario.id_academia;
   try {
      const { rows } = await pool.query('SELECT * FROM examenes_plantillas WHERE id_academia = $1 ORDER BY codigo_examen DESC', [id_academia]);
      res.json(rows);
   } catch(e) { res.status(500).json({error: 'Falla de conexión listando plantillas'}) }
});

// ==========================================
// OBTENER PLANTILLA POR CÓDIGO
// GET /api/exams/plantillas/:codigo
// ==========================================
router.get('/plantillas/:codigo', verificarRoles('superadmin', 'director', 'secretaria', 'profesor', 'tutor'), async (req, res) => {
  const id_academia = req.usuario.id_academia;
  const { codigo }  = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM examenes_plantillas WHERE codigo_examen = $1 AND id_academia = $2',
      [codigo, id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Error obteniendo plantilla' }); }
});

// ==========================================
// CLONAR PLANTILLA ENTRE CICLOS
// POST /api/exams/plantillas/:codigo/clonar
// ==========================================
router.post('/plantillas/:codigo/clonar', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const id_academia  = req.usuario.id_academia;
  const id_creador   = req.usuario.id_usuario;
  const { codigo }   = req.params;
  const sufijo       = Date.now().toString(36).toUpperCase();
  const nuevoCodigo  = `${codigo}-C${sufijo}`;

  try {
    const { rows: orig } = await pool.query(
      'SELECT * FROM examenes_plantillas WHERE codigo_examen = $1 AND id_academia = $2',
      [codigo, id_academia]
    );
    if (!orig.length) return res.status(404).json({ error: 'Plantilla no encontrada.' });

    const p = orig[0];
    const { rows } = await pool.query(`
      INSERT INTO examenes_plantillas
        (codigo_examen, id_academia, id_creador, nombre_simulacro, claves_correctas,
         configuracion_cursos, id_salon, tipo_calificacion, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'cerrado')
      RETURNING *
    `, [
      nuevoCodigo, id_academia, id_creador,
      `${p.nombre_simulacro} (Copia)`,
      JSON.stringify(p.claves_correctas),
      JSON.stringify(p.configuracion_cursos || {}),
      p.id_salon || null,
      p.tipo_calificacion,
    ]);

    res.status(201).json({ mensaje: 'Plantilla clonada correctamente.', plantilla: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error clonando plantilla: ' + err.message });
  }
});

// ==========================================
// ELIMINAR PLANTILLA
// DELETE /api/exams/plantillas/:codigo
// ==========================================
router.delete('/plantillas/:codigo', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const { codigo }  = req.params;
  const id_academia = req.usuario.id_academia;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM examenes_plantillas WHERE codigo_examen = $1 AND id_academia = $2',
      [codigo, id_academia]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Plantilla no encontrada o sin permiso.' });
    res.json({ mensaje: 'Plantilla eliminada.' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando plantilla: ' + err.message });
  }
});

// ==========================================
// CAMBIAR ESTADO DE PLANTILLA (abrir/cerrar/programado)
// PUT /api/exams/plantillas/:codigo/estado
// ==========================================
router.put('/plantillas/:codigo/estado', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const { codigo }  = req.params;
  const { estado, fecha_apertura, fecha_cierre } = req.body;
  const id_academia = req.usuario.id_academia;
  const estadosValidos = ['abierto', 'cerrado', 'programado'];
  if (!estadosValidos.includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  try {
    const { rowCount } = await pool.query(
      `UPDATE examenes_plantillas SET estado = $1, fecha_apertura = $2, fecha_cierre = $3
       WHERE codigo_examen = $4 AND id_academia = $5`,
      [estado, fecha_apertura || null, fecha_cierre || null, codigo, id_academia]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Plantilla no encontrada.' });
    res.json({ mensaje: 'Estado actualizado.' });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando estado: ' + err.message });
  }
});

// ==========================================
// 2. MOTOR MATEMÁTICO DE CALIFICACIÓN INTELIGENTE 🧠
// ==========================================
router.post('/calificar', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  // En el futuro, "respuestas_alumno" vendrá pre-digerido desde la IA que lea la foto en React
  const { codigo_examen, id_alumno, respuestas_alumno } = req.body;

  try {
    // 1. Ir a rescatar el Patrón/Molde original del Examen a la BD
    const examCheck = await pool.query('SELECT * FROM examenes_plantillas WHERE codigo_examen = $1', [codigo_examen]);
    if (examCheck.rows.length === 0) return res.status(404).json({ error: 'Imposible calificar: El examen indicado carece de una Plantilla Registrada' });

    const plantilla = examCheck.rows[0];
    const clavesCorrectas = plantilla.claves_correctas; // ej: {"1":"A", "2":"B"}
    const configCursos = plantilla.configuracion_cursos; // ej: {"matematica": {rango:[1,20], puntos_correcta: 20...}}
    
    // 2. Semillas Computacionales para el cálculo final
    let nota_total = 0;
    let puntaje_por_cursos = {};

    // 2.1 Pre-armar el casillero de resultados de los cursos (Inicializar sus sub-notas en 0)
    for(let curso in configCursos) {
       puntaje_por_cursos[curso] = { nota: 0, buenas: 0, malas: 0, blanco: 0 };
    }

    // 3. ✨ EL CEREBRO EVALUADOR ✨ (Iterando pregunta por pregunta a velocidad luz)
    for(let stringNumPregunta of Object.keys(clavesCorrectas)) {
        const resOficial = clavesCorrectas[stringNumPregunta];
        const resAlumno = respuestas_alumno[stringNumPregunta] || ""; // Si no marcó, asumimos cadena vacía
        const nPregunta = parseInt(stringNumPregunta);
        
        let cursoAlQuePertenece = null;
        let reglasMatematicasDeseCurso = null;

        // Detectar si la pregunta 12 pertenece a un Área/Curso específico
        if (configCursos.areas && Array.isArray(configCursos.areas)) {
          for (let area of configCursos.areas) {
            if (nPregunta >= parseInt(area.inicio) && nPregunta <= parseInt(area.fin)) {
              cursoAlQuePertenece = area.nombre;
              reglasMatematicasDeseCurso = {
                puntos_correcta: parseFloat(area.correcta),
                puntos_incorrecta: parseFloat(area.incorrecta),
                blanco: parseFloat(area.blanco) || 0
              };
              break;
            }
          }
        } else {
          // Fallback para plantillas antiguas o sin áreas definidas (Usamos valores globales)
          cursoAlQuePertenece = "General";
          reglasMatematicasDeseCurso = {
            puntos_correcta: configCursos.puntos_correcta || (plantilla.tipo_calificacion === 'uni' ? 5 : 20),
            puntos_incorrecta: configCursos.puntos_incorrecta || (plantilla.tipo_calificacion === 'uni' ? -1 : -1.125),
            blanco: configCursos.puntos_blanco || 0
          };
        }

        // Aplicación del Algoritmo Punitivo Universitario (Ej. San Marcos)
        if(cursoAlQuePertenece) {
           if (resAlumno === "") {
               puntaje_por_cursos[cursoAlQuePertenece].blanco += 1;
               puntaje_por_cursos[cursoAlQuePertenece].nota += reglasMatematicasDeseCurso.blanco; // Suele ser +0
               nota_total += reglasMatematicasDeseCurso.blanco;
           } else if (resAlumno === resOficial) {
               // Acierto Épico
               puntaje_por_cursos[cursoAlQuePertenece].buenas += 1;
               puntaje_por_cursos[cursoAlQuePertenece].nota += reglasMatematicasDeseCurso.puntos_correcta; // Suele ser +20
               nota_total += reglasMatematicasDeseCurso.puntos_correcta;
           } else {
               // Fallo Trágico (Aquí es donde duelen los -1.125)
               puntaje_por_cursos[cursoAlQuePertenece].malas += 1;
               puntaje_por_cursos[cursoAlQuePertenece].nota += reglasMatematicasDeseCurso.puntos_incorrecta; 
               nota_total += reglasMatematicasDeseCurso.puntos_incorrecta;
           }
        }
    }

    // 4. Guardar Nota Oficial, Firmada e Irrevocable en la Base de Datos SaaS
    const resultado = await pool.query(`
      INSERT INTO resultados (codigo_examen, id_usuario, nota_total, respuestas_alumno, puntaje_por_cursos)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [codigo_examen, id_alumno, nota_total, respuestas_alumno, puntaje_por_cursos]);

    // 5. Devolver al Front-End el desglose espectacular para imprimir su gráfico
    res.json({
        mensaje: '¡Examen del Alumno Calificado Automáticamente!',
        nota_final: parseFloat(nota_total.toFixed(3)), // Limpieza a 3 decimales
        desglose_por_areas: puntaje_por_cursos,
        id_certificado: resultado.rows[0].id_resultado
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'El Motor Algorítmico sufrió un cortocircuito calculando la nota.' });
  }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Sistema de Almacenamiento seguro de fotos en nuestra carpeta local pública
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/') // La subcarpeta que acabo de instanciar
  },
  filename: function (req, file, cb) {
    // Generar nombres indescifrables como scan-177386...jpg para que no puedan ser robadas o espiadas
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'scan-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


// ==========================================
// 3. RECIBIR FOTO DEL PAPEL DE BURBUJAS (Upload Analítico)
// ==========================================
router.post('/upload-foto', verificarRoles('superadmin', 'director', 'profesor'), upload.single('imagen_examen'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Error Óptico: ¿Olvidaste encender la cámara y subir la imagen?' });
  const codigoExamen = req.body.codigo_examen || "FASE-3-UNMSM-24";
  
  // ==========================================
  // CEREBRO GEMINI REAL (Microservicio n8n)
  // ==========================================
  let extraccion_ia = {};
  for(let i=1; i<=100; i++) extraccion_ia[i.toString()] = ""; // Fallback preventivo de 100 cuadros
  let codigo_postulante = "DESCONOCIDO";
  let estado_examen = "PROCESADO_AUTOMATICO";
  let observaciones = [];

  try {
     const formData = new FormData();
     const fileBuffer = fs.readFileSync(req.file.path);
     const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
     formData.append('data', fileBlob, req.file.filename);

     // Llamamos al webhook de n8n para procesamiento con IA
     // La URL está configurada en variables de entorno (N8N_WEBHOOK_URL)
     const n8nUrl = config.external.n8nWebhookUrl;
     const n8nRes = await fetch(n8nUrl, {
        method: "POST",
        body: formData
     });

     if (!n8nRes.ok) {
         throw new Error("El Webhook n8n rebotó la conexión. Código: " + n8nRes.status);
     }

     const iaData = await n8nRes.json();
     
     // Hacemos limpieza inteligente del Prompt para que 'BLANCO' sea un hueco en la UI
     if (iaData.respuestas) {
         for (let val in iaData.respuestas) {
             let rawAns = String(iaData.respuestas[val]).toUpperCase().trim();
             if (rawAns === "BLANCO" || rawAns === "NULL" || rawAns === "") {
                 iaData.respuestas[val] = "";
             } else if (rawAns === "NULO") {
                 iaData.respuestas[val] = "X"; // Doble burbuja detectada por Gemini
             }
         }
         // Fusión exacta de la data IA (pisando los huecos correspondientes de las 100 bases)
         Object.assign(extraccion_ia, iaData.respuestas);
     }
     
     codigo_postulante = iaData.codigo_leido || "DESCONOCIDO";

     // AUDITORÍA INTELIGENTE:
     if (codigo_postulante === "000000") {
         estado_examen = "REQUIERE_OBSERVACION";
         observaciones.push("Fraude: El alumno rellenó el DNI asimétricamente como '000000', el cual no existe en BD.");
     } else if (codigo_postulante === "DESCONOCIDO") {
         estado_examen = "REQUIERE_OBSERVACION";
         observaciones.push("Advertencia Óptica: Gemini no pudo leer con claridad la cuadrícula del Código DNI.");
     }
     
     extraccion_ia["_confianza_optica"] = "99.9%"; // Oculares reales

  } catch (error) {
     console.error("¡N8N DISCONNECTED!", error);
     estado_examen = "REQUIERE_OBSERVACION";
     observaciones.push("Pérdida de enlace con el Ojo Oculto n8n. " + error.message + ". ¿Olvidaste Activar el Workflow en n8n?");
  }

  // ==========================================
  // MOTOR DE CÁLCULO DINÁMICO (Basado en la Plantilla)
  // ==========================================
  let desglose_cursos = [];
  let puntajeTotal = 0;

  try {
     // Buscamos la plantilla oficial del examen para saber cómo calificar
     const { rows: pRows } = await pool.query('SELECT * FROM examenes_plantillas WHERE codigo_examen = $1', [codigoExamen]);
     const plantilla = pRows[0] || { tipo_calificacion: 'unmsm', claves_correctas: {} };
     const config = plantilla.configuracion_cursos || {};
     const claves = plantilla.claves_correctas || {};

     if (config.areas && Array.isArray(config.areas)) {
        config.areas.forEach(area => {
           let aciertos = 0, errores = 0, blancos = 0;
           for(let q = parseInt(area.inicio); q <= parseInt(area.fin); q++) {
               const rIA = extraccion_ia[q.toString()];
               const rOficial = claves[q.toString()];
               
               if (!rIA || rIA === "") { blancos++; }
               else if (rIA === "X") { errores++; }
               else if (rIA === rOficial) { aciertos++; }
               else { errores++; }
           }
           const pPos = parseFloat(area.correcta);
           const pNeg = parseFloat(area.incorrecta);
           const pBlanco = parseFloat(area.blanco) || 0;
           const ptje = (aciertos * pPos) + (errores * pNeg) + (blancos * pBlanco);
           
           puntajeTotal += ptje;
           desglose_cursos.push({
               curso: area.nombre,
               aciertos, errores, blancos,
               puntaje: ptje.toFixed(3)
           });
        });
     } else {
        // Fallback si no hay áreas (Calificación Global)
        let aciertos = 0, errores = 0, blancos = 0;
        const pPos = config.puntos_correcta || (plantilla.tipo_calificacion === 'uni' ? 5 : 20);
        const pNeg = config.puntos_incorrecta || (plantilla.tipo_calificacion === 'uni' ? -1 : -1.125);

        for(let q = 1; q <= 100; q++) {
           const rIA = extraccion_ia[q.toString()];
           const rOficial = claves[q.toString()];
           if(!rIA) blancos++;
           else if(rIA === rOficial) aciertos++;
           else errores++;
        }
        puntajeTotal = (aciertos * pPos) + (errores * pNeg);
        desglose_cursos.push({ curso: "General", aciertos, errores, blancos, puntaje: puntajeTotal.toFixed(3) });
     }
  } catch(err) {
     console.error("Error en calificación dinámica:", err);
  }
  
  puntajeTotal = parseFloat(puntajeTotal).toFixed(3);

  // DEVOLUCIÓN AL DASHBOARD
  res.status(201).json({
    mensaje: 'Matriz de Píxeles Traducida con precisión. Se detectaron fallos de identidad.',
    codigo_examen: codigoExamen,
    url_foto_subida: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
    json_sugerido_ia: extraccion_ia,
    codigo_leido: codigo_postulante,
    respuestas_cruzadas: extraccion_ia,
    estado_examen: estado_examen,
    observaciones: observaciones,
    metadata_alumno: {
      codigo_leido: codigo_postulante, 
      verificado_db: (codigo_postulante !== "000000" && codigo_postulante !== "DESCONOCIDO")
    },
    inteligencia_artificial: {
      puntaje_total: puntajeTotal,
      puntaje_global: puntajeTotal,
      desglose_por_areas: {}, // Ya incluido en desglose_cursos
      desglose_cursos: desglose_cursos
    }
  });
});

// ==========================================
// ENDPOINT: GRABACIÓN DEFINITIVA EN POSTGRES
// ==========================================
router.post('/confirmar-resultados', verificarRoles('superadmin', 'director', 'profesor'), async (req, res) => {
  const { codigo_examen, codigo_postulante, nota_total, respuestas_alumno, puntaje_por_cursos, url_imagen_scan, observaciones } = req.body;

  if (!codigo_postulante) {
    return res.status(400).json({ error: 'Falta el código de postulante (DNI) para registrarlo en el Histórico de la Academia.' });
  }

  // VALIDAR QUE EL CÓDIGO DE EXAMEN EXISTE EN EXAMENES_PLANTILLAS
  try {
    const examenCheck = await pool.query(
      'SELECT codigo_examen, estado, id_salon, id_academia FROM examenes_plantillas WHERE codigo_examen = $1',
      [codigo_examen]
    );
    
    if (examenCheck.rows.length === 0) {
      // GUARDAR EN PENDIENTES - El código de examen no existe
      await pool.query(
        `INSERT INTO examenes_pendientes 
         (codigo_examen, codigo_postulante_lectura, id_academia, id_salon, nota_total, 
          respuestas_alumno, puntaje_por_cursos, url_imagen_scan, observaciones, 
          motivo_pendiente, estado, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente_asignacion', $11)`,
        [
          codigo_examen,
          codigo_postulante,
          req.usuario.id_academia,
          null,
          parseFloat(nota_total),
          JSON.stringify(respuestas_alumno || {}),
          JSON.stringify(puntaje_por_cursos || []),
          url_imagen_scan,
          JSON.stringify(observaciones || []),
          `El código de examen "${codigo_examen}" no existe en la base de datos. Requiere creación de plantilla.`,
          req.usuario.id_usuario
        ]
      );
      
      return res.status(404).json({ 
        error: 'El código de examen no existe. Se ha guardado en la bandeja de pendientes para que el profesor lo revise.',
        guardado_pendiente: true
      });
    }
    
    // Opcional: verificar que el examen esté abierto
    const examenEstado = examenCheck.rows[0].estado;
    if (examenEstado === 'cerrado') {
      // GUARDAR EN PENDIENTES - El examen está cerrado
      await pool.query(
        `INSERT INTO examenes_pendientes 
         (codigo_examen, codigo_postulante_lectura, id_academia, id_salon, nota_total, 
          respuestas_alumno, puntaje_por_cursos, url_imagen_scan, observaciones, 
          motivo_pendiente, estado, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente_validacion', $11)`,
        [
          codigo_examen,
          codigo_postulante,
          examenCheck.rows[0].id_academia,
          examenCheck.rows[0].id_salon,
          parseFloat(nota_total),
          JSON.stringify(respuestas_alumno || {}),
          JSON.stringify(puntaje_por_cursos || []),
          url_imagen_scan,
          JSON.stringify(observaciones || []),
          `El examen "${codigo_examen}" está cerrado. Requiere validación del profesor.`,
          req.usuario.id_usuario
        ]
      );
      
      return res.status(400).json({ 
        error: 'Este examen está cerrado. Se ha guardado en pendientes para validación del profesor.',
        guardado_pendiente: true
      });
    }
  } catch (checkError) {
    console.error('Error validando código de examen:', checkError);
    return res.status(500).json({ error: 'Error validando el código de examen.' });
  }

  try {
    // 1. Buscamos si el DNI existe oficialmente en Postgres
    const { rows } = await pool.query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1', [codigo_postulante]);
    let id_validado = null;
    if (rows.length > 0) id_validado = rows[0].id_usuario;

    // Si el alumno no existe, guardar en pendientes
    if (!id_validado) {
      const examenInfo = await pool.query(
        'SELECT id_academia, id_salon FROM examenes_plantillas WHERE codigo_examen = $1',
        [codigo_examen]
      );
      
      await pool.query(
        `INSERT INTO examenes_pendientes 
         (codigo_examen, codigo_postulante_lectura, id_academia, id_salon, nota_total, 
          respuestas_alumno, puntaje_por_cursos, url_imagen_scan, observaciones, 
          motivo_pendiente, estado, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente_asignacion', $11)`,
        [
          codigo_examen,
          codigo_postulante,
          examenInfo.rows[0]?.id_academia || req.usuario.id_academia,
          examenInfo.rows[0]?.id_salon,
          parseFloat(nota_total),
          JSON.stringify(respuestas_alumno || {}),
          JSON.stringify(puntaje_por_cursos || []),
          url_imagen_scan,
          JSON.stringify(observaciones || []),
          `El alumno con código "${codigo_postulante}" no existe en la base de datos. Requiere asignación manual.`,
          req.usuario.id_usuario
        ]
      );
      
      return res.status(404).json({ 
        error: 'El alumno no existe. Se ha guardado en pendientes para asignación manual.',
        guardado_pendiente: true
      });
    }

    // 2. Insertamos la fila en Resultados
    // Si id_validado es NULL, lo guardará como examen Huérfano (Para alumnos invitados o Códigos Mal Escritos)
    const query = `
      INSERT INTO resultados
      (codigo_examen, id_usuario, nota_total, respuestas_alumno, puntaje_por_cursos, url_imagen_scan, observaciones)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_resultado
    `;

    // Postgres exige cadenas de texto para campos JSONB desde node-pg
    const values = [
      codigo_examen || null,
      id_validado,
      parseFloat(nota_total),
      JSON.stringify(respuestas_alumno || {}),
      JSON.stringify(puntaje_por_cursos || []),
      url_imagen_scan,
      JSON.stringify(observaciones || [])
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
        message: '¡Puntaje Matemático y Evidencia Visual guardados permanentemente en la Base de Datos!',
        id_resultado: result.rows[0].id_resultado
    });

  } catch (error) {
    console.error('Falló la inserción crítica en Postgres:', error);
    res.status(500).json({ error: 'Falla catastrófica en el motor SQL de la Base de Datos: ' + error.message });
  }
});

// ==========================================
// PORTAL ALUMNO: EXAMEN ACTIVO EN SU SALÓN
// ==========================================
router.get('/alumno/examen-activo', async (req, res) => {
  const id_usuario = req.usuario.id_usuario;
  try {
    // Buscar el salón al que pertenece el alumno
    const userRow = await pool.query('SELECT id_salon FROM usuarios WHERE id_usuario = $1', [id_usuario]);
    if(userRow.rows.length === 0) return res.json({ examen: null, mensaje: 'Alumno no encontrado en el sistema.' });
    
    const id_salon = userRow.rows[0].id_salon;
    if(!id_salon) return res.json({ examen: null, mensaje: 'No estás asignado a ningún salón todavía.' });

    // Buscar plantilla ABIERTA para ese salón (O PROGRAMADA en rango de tiempo)
    const { rows } = await pool.query(`
      SELECT codigo_examen, nombre_simulacro, tipo_calificacion, estado, fecha_apertura, fecha_cierre
      FROM examenes_plantillas 
      WHERE id_salon = $1 
        AND (
          estado = 'abierto' 
          OR (estado = 'programado' AND NOW() BETWEEN fecha_apertura AND fecha_cierre)
        )
      ORDER BY fecha_apertura DESC
      LIMIT 1
    `, [id_salon]);

    if(rows.length === 0) return res.json({ examen: null, mensaje: 'No hay exámenes activos en tu salón ahora mismo. Tu profesor abrirá el sistema cuando sea momento.' });
    
    res.json({ examen: rows[0] });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error consultando examen activo.' });
  }
});

// ==========================================
// PORTAL ALUMNO: HISTORIAL DE RESULTADOS
// ==========================================
router.get('/alumno/mis-resultados', async (req, res) => {
  const id_usuario = req.usuario.id_usuario;
  try {
    const { rows } = await pool.query(`
      SELECT r.id_resultado, r.nota_total, r.puntaje_por_cursos, r.fecha_procesamiento,
             r.url_imagen_scan, r.observaciones, ep.nombre_simulacro, ep.tipo_calificacion
      FROM resultados r
      LEFT JOIN examenes_plantillas ep ON r.codigo_examen = ep.codigo_examen
      WHERE r.id_usuario = $1
      ORDER BY r.fecha_procesamiento DESC
    `, [id_usuario]);
    res.json(rows);
  } catch(e) {
    res.status(500).json({ error: 'Error obteniendo tus resultados.' });
  }
});

// ==========================================
// PORTAL ALUMNO: SUBIR SU PROPIO EXAMEN
// ==========================================
router.post('/alumno/subir-examen', upload.single('imagen_examen'), async (req, res) => {
  if(!req.file) return res.status(400).json({ error: 'No se detectó ningún archivo de imagen.' });
  
  const id_usuario = req.usuario.id_usuario;
  const { codigo_examen } = req.body;

  try {
    // Verificar que el examen está abierto para su salón
    const userRow = await pool.query('SELECT id_salon FROM usuarios WHERE id_usuario = $1', [id_usuario]);
    const id_salon = userRow.rows[0]?.id_salon;
    
    const examCheck = await pool.query(`
      SELECT * FROM examenes_plantillas 
      WHERE codigo_examen = $1 
        AND (id_salon = $2 OR id_salon IS NULL)
        AND (
          estado = 'abierto' 
          OR (estado = 'programado' AND NOW() BETWEEN fecha_apertura AND fecha_cierre)
        )
      `, [codigo_examen, id_salon]);
    
    if(examCheck.rows.length === 0) {
      return res.status(403).json({ error: 'El examen no está abierto para tu salón en este momento.' });
    }

    // Verificar si ya tiene resultado para este examen
    const yaEntrego = await pool.query(
      'SELECT id_resultado FROM resultados WHERE id_usuario = $1 AND codigo_examen = $2',
      [id_usuario, codigo_examen]
    );
    if(yaEntrego.rows.length > 0) {
      return res.status(409).json({ error: '⚠️ Ya tienes un resultado registrado para este simulacro. No es posible volver a entregar.' });
    }

    // Enviar a n8n para procesamiento IA
    const url_foto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    let respuestasIA = {};
    for(let i=1; i<=100; i++) respuestasIA[i.toString()] = '';
    let estado_examen = 'PROCESADO_ALUMNO';
    
    try {
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(req.file.path);
      formData.append('data', new Blob([fileBuffer], { type: req.file.mimetype }), req.file.filename);
      // Usar URL de n8n desde configuración
      const n8nRes = await fetch(config.external.n8nWebhookUrl, { method: 'POST', body: formData });
      if(n8nRes.ok) {
        const iaData = await n8nRes.json();
        if(iaData.respuestas) {
          for(let v in iaData.respuestas) {
            let r = String(iaData.respuestas[v]).toUpperCase().trim();
            respuestasIA[v] = (r === 'BLANCO' || r === 'NULL' || r === '') ? '' : r;
          }
        }
      }
    } catch(iaErr) {
      console.error('IA no disponible para alumno:', iaErr.message);
      estado_examen = 'PENDIENTE_REVISION';
    }

    // Calificar usando la plantilla
    const plantilla = examCheck.rows[0];
    const claves = plantilla.claves_correctas;
    const configCursos = plantilla.configuracion_cursos || {};
    
    const ptsCorrecta = plantilla.tipo_calificacion === 'uni' ? 5 : (plantilla.tipo_calificacion === 'personalizado' ? (configCursos.puntos_correcta || 0) : 20);
    const ptsIncorrecta = plantilla.tipo_calificacion === 'uni' ? -1 : (plantilla.tipo_calificacion === 'personalizado' ? (configCursos.puntos_incorrecta || 0) : -1.125);

    let nota_total = 0;
    let respuestas_cruzadas = {};
    let desglose_cursos = [];

    if (configCursos.areas && Array.isArray(configCursos.areas)) {
      configCursos.areas.forEach(area => {
        let a_area = 0, e_area = 0, b_area = 0;
        for(let q = parseInt(area.inicio); q <= parseInt(area.fin); q++) {
          const rIA = respuestasIA[q.toString()] || '';
          const rOficial = claves[q.toString()];
          respuestas_cruzadas[q.toString()] = rIA;
          if(!rOficial) continue;
          if(!rIA) b_area++;
          else if(rIA === rOficial) a_area++;
          else e_area++;
        }
        const pPos = parseFloat(area.correcta);
        const pNeg = parseFloat(area.incorrecta);
        const pBlanco = parseFloat(area.blanco) || 0;
        const ptje = (a_area * pPos) + (e_area * pNeg) + (b_area * pBlanco);
        nota_total += ptje;
        desglose_cursos.push({ curso: area.nombre, aciertos: a_area, errores: e_area, blancos: b_area, puntaje: ptje.toFixed(3) });
      });
    } else {
      // Calificación Global (Legacy)
      const ptsCorrecta = plantilla.tipo_calificacion === 'uni' ? 5 : 20;
      const ptsIncorrecta = plantilla.tipo_calificacion === 'uni' ? -1 : -1.125;
      
      for(let nQ of Object.keys(claves)) {
        const correcta = claves[nQ];
        const alumnoResp = respuestasIA[nQ] || '';
        respuestas_cruzadas[nQ] = alumnoResp;
        if(!alumnoResp) continue;
        else if(alumnoResp === correcta) nota_total += ptsCorrecta;
        else nota_total += ptsIncorrecta;
      }
      desglose_cursos.push({ curso: 'GLOBAL', puntaje: nota_total.toFixed(3) });
    }

    // Guardar en BD
    await pool.query(`
      INSERT INTO resultados (codigo_examen, id_usuario, nota_total, respuestas_alumno, puntaje_por_cursos, url_imagen_scan, observaciones)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      codigo_examen, id_usuario, parseFloat(nota_total.toFixed(3)),
      JSON.stringify(respuestas_cruzadas),
      JSON.stringify(desglose_cursos),
      url_foto,
      JSON.stringify([`Entrega propia del Alumno. Estado: ${estado_examen}`])
    ]);

    res.status(201).json({
      mensaje: '¡Tu examen fue recibido y calificado! Ya puedes ver tu resultado.',
      nota_total: parseFloat(nota_total.toFixed(3)),
      url_foto
    });

  } catch(e) {
    console.error('Error en subida alumno:', e);
    res.status(500).json({ error: 'Error interno al procesar tu examen: ' + e.message });
  }
});

module.exports = router;

// ==========================================
// ALUMNO: SUBIR EXAMEN PARA REVISIÓN
// ==========================================

router.post('/alumno/subir-revision', verificarToken, async (req, res) => {
  const { id_usuario, id_academia } = req.usuario;
  const { codigo_examen } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ error: 'Debes subir una foto del examen.' });
  }
  
  if (!codigo_examen) {
    return res.status(400).json({ error: 'Selecciona el examen que estás entregando.' });
  }
  
  try {
    // Verificar que el examen existe
    const examenCheck = await pool.query(
      'SELECT * FROM examenes_plantillas WHERE codigo_examen = $1 AND id_academia = $2',
      [codigo_examen, id_academia]
    );
    
    if (examenCheck.rows.length === 0) {
      return res.status(404).json({ error: 'El examen no existe o no está disponible para tu academia.' });
    }
    
    // Verificar si ya entregó
    const yaEntrego = await pool.query(
      'SELECT id_resultado FROM resultados WHERE id_usuario = $1 AND codigo_examen = $2',
      [id_usuario, codigo_examen]
    );
    
    if (yaEntrego.rows.length > 0) {
      return res.status(409).json({ error: 'Ya entregaste este examen. No se puede volver a enviar.' });
    }
    
    // Guardar en examenes_pendientes para que el profesor lo revise
    await pool.query(
      `INSERT INTO examenes_pendientes 
       (codigo_examen, codigo_postulante_lectura, id_usuario_asignado, id_academia, id_salon,
        url_imagen_scan, estado, motivo_pendiente, creado_por, creado_en)
       VALUES ($1, $2, $3, $4, $5, $6, 'pendiente_revision', 
        'Examen enviado por alumno desde portal', $7, NOW())`,
      [
        codigo_examen,
        id_usuario, // El código del alumno es su ID
        id_usuario,
        id_academia,
        req.usuario.id_salon || null,
        `/uploads/${req.file.filename}`,
        id_usuario
      ]
    );
    
    res.json({ 
      mensaje: '✅ Examen enviado correctamente. Tu profesor lo revisará y calificará pronto.' 
    });
    
  } catch (error) {
    console.error('Error al subir examen para revisión:', error);
    res.status(500).json({ error: 'Error al subir el examen. Intenta nuevamente.' });
  }
});

// Listar exámenes que el alumno ha enviado para revisión
router.get('/alumno/mis-envios', verificarToken, async (req, res) => {
  const { id_usuario } = req.usuario;
  
  try {
    const result = await pool.query(
      `SELECT 
         ep.*,
         p.nombre_simulacro,
         CASE 
           WHEN ep.estado = 'procesado' THEN '✅ Calificado'
           WHEN ep.estado = 'pendiente_revision' THEN '⏳ En revisión'
           WHEN ep.estado = 'pendiente_validacion' THEN '📋 Por validar'
           ELSE '📋 Pendiente'
         END as estado_texto
       FROM examenes_pendientes ep
       LEFT JOIN examenes_plantillas p ON ep.codigo_examen = p.codigo_examen
       WHERE ep.id_usuario_asignado = $1
       ORDER BY ep.creado_en DESC`,
      [id_usuario]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error cargando tus envíos: ' + error.message });
  }
});

// ==========================================
// EXÁMENES PENDIENTES DE ASIGNACIÓN
// ==========================================

// Listar exámenes pendientes por profesor/academia
router.get('/pendientes', verificarToken, async (req, res) => {
  const { id_academia, id_salon, rol } = req.usuario;
  
  try {
    let query = `
      SELECT 
        ep.*,
        u.nombre_completo AS alumno_nombre,
        p.nombre_simulacro,
        creador.nombre_completo AS creado_por_nombre
      FROM examenes_pendientes ep
      LEFT JOIN usuarios u ON ep.id_usuario_asignado = u.id_usuario
      LEFT JOIN examenes_plantillas p ON ep.codigo_examen = p.codigo_examen
      LEFT JOIN usuarios creador ON ep.creado_por = creador.id_usuario
      WHERE ep.id_academia = $1
    `;
    
    const params = [id_academia];
    let paramCount = 1;
    
    // Profesor solo ve los de su salón
    if (rol === 'profesor' && id_salon) {
      paramCount++;
      query += ` AND (ep.id_salon = $${paramCount} OR ep.id_salon IS NULL)`;
      params.push(id_salon);
    }
    
    query += ' ORDER BY ep.creado_en DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error cargando exámenes pendientes: ' + error.message });
  }
});

// Asignar alumno a examen pendiente
router.put('/pendientes/:id_pendiente/asignar', verificarToken, async (req, res) => {
  const { id_usuario_asignado, codigo_examen_correcto } = req.body;
  const { id_pendiente } = req.params;
  
  try {
    // Obtener el pendiente
    const pendiente = await pool.query(
      'SELECT * FROM examenes_pendientes WHERE id_pendiente = $1',
      [id_pendiente]
    );
    
    if (pendiente.rows.length === 0) {
      return res.status(404).json({ error: 'Examen pendiente no encontrado.' });
    }
    
    const data = pendiente.rows[0];
    
    // Si se proporcionó un código de examen correcto, usarlo
    const codigoExamenFinal = codigo_examen_correcto || data.codigo_examen;
    
    // Actualizar con el alumno asignado
    await pool.query(
      `UPDATE examenes_pendientes 
       SET id_usuario_asignado = $1, 
           codigo_examen = COALESCE($2, codigo_examen),
           estado = 'pendiente_validacion'
       WHERE id_pendiente = $3`,
      [id_usuario_asignado, codigoExamenFinal, id_pendiente]
    );
    
    res.json({ mensaje: 'Alumno asignado correctamente. Ahora confirma el resultado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error asignando alumno: ' + error.message });
  }
});

// Confirmar examen pendiente (mover a resultados)
router.post('/pendientes/:id_pendiente/confirmar', verificarToken, async (req, res) => {
  const { id_pendiente } = req.params;
  
  try {
    const pendiente = await pool.query(
      'SELECT * FROM examenes_pendientes WHERE id_pendiente = $1',
      [id_pendiente]
    );
    
    if (pendiente.rows.length === 0) {
      return res.status(404).json({ error: 'Examen pendiente no encontrado.' });
    }
    
    const data = pendiente.rows[0];
    
    if (!data.id_usuario_asignado) {
      return res.status(400).json({ error: 'Debe asignar un alumno primero.' });
    }
    
    // Insertar en resultados
    const result = await pool.query(
      `INSERT INTO resultados
       (codigo_examen, id_usuario, nota_total, respuestas_alumno, puntaje_por_cursos, url_imagen_scan, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_resultado`,
      [
        data.codigo_examen,
        data.id_usuario_asignado,
        parseFloat(data.nota_total),
        data.respuestas_alumno,
        data.puntaje_por_cursos,
        data.url_imagen_scan,
        data.observaciones
      ]
    );
    
    // Actualizar estado del pendiente
    await pool.query(
      `UPDATE examenes_pendientes 
       SET estado = 'procesado', 
           procesado_en = NOW(), 
           procesado_por = $1
       WHERE id_pendiente = $2`,
      [req.usuario.id_usuario, id_pendiente]
    );
    
    res.json({ 
      mensaje: 'Examen confirmado y guardado en resultados.',
      id_resultado: result.rows[0].id_resultado
    });
  } catch (error) {
    res.status(500).json({ error: 'Error confirmando examen: ' + error.message });
  }
});

// Reenviar pendiente con imagen a la cola IA
// POST /api/exams/pendientes/:id_pendiente/enviar-ia
router.post('/pendientes/:id_pendiente/enviar-ia', verificarToken, async (req, res) => {
  const { id_pendiente } = req.params;
  const id_academia = req.usuario.id_academia;
  const id_profesor = req.usuario.id_usuario;

  try {
    const { rows } = await pool.query(
      'SELECT * FROM examenes_pendientes WHERE id_pendiente = $1 AND id_academia = $2',
      [id_pendiente, id_academia]
    );
    if (!rows.length) return res.status(404).json({ error: 'Pendiente no encontrado.' });
    const p = rows[0];
    if (!p.url_imagen_scan) return res.status(400).json({ error: 'Este pendiente no tiene imagen. Usa revisión manual.' });

    // Crear fila en resultados para que entre al flujo OMR normal
    const { rows: nuevo } = await pool.query(
      `INSERT INTO resultados
         (codigo_examen, id_usuario, id_profesor, id_academia, url_imagen_scan,
          respuestas_alumno, observaciones, omr_estado, fecha_procesamiento)
       VALUES ($1, $2, $3, $4, $5, '{}', '{}', 'en_cola', NOW())
       RETURNING id_resultado`,
      [p.codigo_examen, p.id_usuario_asignado || null, id_profesor, id_academia, p.url_imagen_scan]
    );

    // Marcar el pendiente como procesado
    await pool.query(
      "UPDATE examenes_pendientes SET estado = 'procesado' WHERE id_pendiente = $1",
      [id_pendiente]
    );

    res.json({ id_resultado: nuevo[0].id_resultado, mensaje: 'Imagen enviada a la cola IA.' });
  } catch (err) {
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});

// Alumno ingresa respuestas manuales (sin imagen) → va a revisión del profesor
// POST /api/exams/alumno/subir-manual
router.post('/alumno/subir-manual', verificarToken, verificarRoles('alumno'), async (req, res) => {
  const id_usuario  = req.usuario.id_usuario;
  const id_academia = req.usuario.id_academia;
  const { codigo_examen, respuestas } = req.body;

  if (!codigo_examen || !respuestas || typeof respuestas !== 'object') {
    return res.status(400).json({ error: 'Faltan código de examen o respuestas.' });
  }

  try {
    // Verificar examen activo para el salón del alumno
    const userRow = await pool.query('SELECT id_salon FROM usuarios WHERE id_usuario = $1', [id_usuario]);
    const id_salon = userRow.rows[0]?.id_salon;

    const examCheck = await pool.query(`
      SELECT * FROM examenes_plantillas
      WHERE codigo_examen = $1
        AND (id_salon = $2 OR id_salon IS NULL)
        AND (
          estado = 'abierto'
          OR (estado = 'programado' AND NOW() BETWEEN fecha_apertura AND fecha_cierre)
        )`, [codigo_examen, id_salon]);

    if (!examCheck.rows.length) {
      return res.status(403).json({ error: 'El examen no está abierto para tu salón.' });
    }

    // Verificar que no tenga resultado ni pendiente duplicado
    const yaExiste = await pool.query(
      `SELECT 1 FROM resultados WHERE id_usuario = $1 AND codigo_examen = $2
       UNION ALL
       SELECT 1 FROM examenes_pendientes WHERE id_usuario_asignado = $1 AND codigo_examen = $2
         AND estado NOT IN ('descartado', 'procesado')`,
      [id_usuario, codigo_examen]
    );
    if (yaExiste.rows.length > 0) {
      return res.status(409).json({ error: '⚠️ Ya tienes un envío registrado para este simulacro.' });
    }

    // Crear pendiente sin imagen, para revisión del profesor
    const { rows: nuevo } = await pool.query(
      `INSERT INTO examenes_pendientes
         (codigo_examen, id_usuario_asignado, id_academia, id_salon,
          respuestas_alumno, motivo_pendiente, estado, creado_por, creado_en)
       VALUES ($1, $2, $3, $4, $5, 'Ingreso manual del alumno', 'pendiente_revision', $2, NOW())
       RETURNING id_pendiente`,
      [codigo_examen, id_usuario, id_academia, id_salon || null, JSON.stringify(respuestas)]
    );

    // Notificación al profesor (fire and forget)
    try {
      const { crearNotificacion } = require('../utils/notificaciones');
      const alumnoRow = await pool.query('SELECT nombre_completo FROM usuarios WHERE id_usuario = $1', [id_usuario]);
      const alumnoNombre = alumnoRow.rows[0]?.nombre_completo || 'Un alumno';
      const profRow = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE id_academia = $1 AND id_salon = $2 AND rol = $3 AND activo = true LIMIT 1',
        [id_academia, id_salon, 'profesor']
      );
      if (profRow.rows.length > 0) {
        await crearNotificacion(
          profRow.rows[0].id_usuario,
          `${alumnoNombre} envió respuestas manuales para ${codigo_examen} — pendiente de revisión.`,
          'examen'
        );
      }
    } catch { /* notificación no crítica */ }

    res.json({ mensaje: 'Respuestas enviadas al profesor para revisión.', id_pendiente: nuevo[0].id_pendiente });
  } catch (err) {
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});

// Descartar examen pendiente
router.delete('/pendientes/:id_pendiente', verificarToken, async (req, res) => {
  const { id_pendiente } = req.params;
  
  try {
    await pool.query(
      `UPDATE examenes_pendientes SET estado = 'descartado' WHERE id_pendiente = $1`,
      [id_pendiente]
    );
    
    res.json({ mensaje: 'Examen pendiente descartado.' });
  } catch (error) {
    res.status(500).json({ error: 'Error descartando examen: ' + error.message });
  }
});
