const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');
const { ensureFoundationSchema } = require('../db/foundation');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../public/uploads/comunidad');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

router.get('/material', verificarToken, async (req, res) => {
  const { id_academia, id_salon } = req.usuario;
  try {
    const result = await pool.query(
      `
        SELECT m.*, u.nombre_completo AS autor_nombre
        FROM material_didactico m
        JOIN usuarios u ON m.id_autor = u.id_usuario
        WHERE m.id_academia = $1 AND (m.id_salon = $2 OR m.id_salon IS NULL)
        ORDER BY m.fecha_creacion DESC
      `,
      [id_academia, id_salon]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener material didactico.' });
  }
});

router.post('/material', verificarToken, upload.single('archivo'), async (req, res) => {
  const { rol, id_usuario, id_academia, id_salon } = req.usuario;
  if (rol === 'alumno') {
    return res.status(403).json({ error: 'No tienes permisos para subir material.' });
  }

  const { titulo, tipo_material, url_recurso, materia, descripcion } = req.body;

  // Validar que al menos haya un archivo o una URL
  if (!req.file && !url_recurso) {
    return res.status(400).json({ error: 'Debes subir un archivo o proporcionar una URL.' });
  }

  // Usar el archivo subido si existe, de lo contrario la url_recurso en texto
  const URL_FINAL = req.file ? `/uploads/comunidad/${req.file.filename}` : url_recurso;

  try {
    const result = await pool.query(
      `
        INSERT INTO material_didactico (
          id_academia, id_salon, id_autor, titulo, tipo_material, url_recurso, materia, descripcion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [id_academia, id_salon, id_usuario, titulo, tipo_material, URL_FINAL, materia, descripcion]
    );
    res.json({ mensaje: 'Material subido con exito.', material: result.rows[0] });
  } catch (error) {
    console.error('Error al guardar material:', error.message);
    console.error('Detalle:', error);
    res.status(500).json({ 
      error: 'Error al guardar el material.',
      detalle: error.message 
    });
  }
});

router.delete('/material/:id', verificarToken, async (req, res) => {
  const { id_usuario, rol } = req.usuario;

  try {
    const check = await pool.query('SELECT id_autor FROM material_didactico WHERE id_material = $1', [req.params.id]);
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Material no encontrado.' });
    }

    if (check.rows[0].id_autor !== id_usuario && !['admin', 'superadmin', 'admin_soporte'].includes(rol)) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este material.' });
    }

    await pool.query('DELETE FROM material_didactico WHERE id_material = $1', [req.params.id]);
    res.json({ mensaje: 'Material eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar material.' });
  }
});

router.get('/publicaciones', verificarToken, async (req, res) => {
  try {
    await ensureFoundationSchema(pool);

    const scope = req.query.scope || 'academia';
    const values = [];
    let query = `
      SELECT
        cp.*,
        u.nombre_completo AS autor_nombre,
        u.rol AS autor_rol,
        a.nombre AS academia_nombre,
        (
          SELECT json_agg(json_build_object(
            'id_comentario', cc.id_comentario,
            'contenido', cc.contenido,
            'fecha_creacion', cc.fecha_creacion,
            'autor_nombre', cu.nombre_completo
          ) ORDER BY cc.fecha_creacion ASC)
          FROM comunidad_comentarios cc
          JOIN usuarios cu ON cc.id_autor = cu.id_usuario
          WHERE cc.id_publicacion = cp.id_publicacion
        ) as comentarios,
        (
          SELECT count(*) FROM comunidad_reacciones cr WHERE cr.id_publicacion = cp.id_publicacion
        ) as likes,
        EXISTS(
          SELECT 1 FROM comunidad_reacciones cr2 
          WHERE cr2.id_publicacion = cp.id_publicacion AND cr2.id_autor = $1
        ) as user_liked
      FROM comunidad_publicaciones cp
      LEFT JOIN usuarios u ON u.id_usuario = cp.id_autor
      LEFT JOIN academias a ON a.id_academia = cp.id_academia
      WHERE cp.visible = true
    `;

    if (scope === 'global') {
      query += ` AND cp.scope_comunidad = 'global'`;
    } else {
      values.push(req.usuario.id_academia);
      query += ` AND cp.scope_comunidad = 'academia' AND cp.id_academia = $${values.length}`;
    }

    query += ' ORDER BY cp.fijado DESC, cp.fecha_creacion DESC';

    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener publicaciones.' });
  }
});

router.post('/publicaciones', verificarToken, upload.array('archivos', 5), async (req, res) => {
  const { titulo, contenido, tipo_publicacion, scope_comunidad } = req.body;
  let { media_urls } = req.body; // En texto plano por si combinan

  if (!contenido) {
    return res.status(400).json({ error: 'El contenido es obligatorio.' });
  }
  
  // Procesar archivos si enviaron múltiple Media
  const uploadedUrls = req.files ? req.files.map(f => `/uploads/comunidad/${f.filename}`) : [];
  
  try {
    let parsedUrls = [];
    if (media_urls) {
      if (typeof media_urls === 'string') {
        try { parsedUrls = JSON.parse(media_urls); } 
        catch (_) { parsedUrls = media_urls.split('\n').map(l => l.trim()).filter(Boolean); }
      } else {
        parsedUrls = media_urls;
      }
    }
    
    // Unir enlaces de texto y archivos locales subidos
    const TODAS_LAS_URLS = [...parsedUrls, ...uploadedUrls];

    await ensureFoundationSchema(pool);

    const scope = scope_comunidad === 'global' && ['superadmin', 'admin_soporte'].includes(req.usuario.rol)
      ? 'global'
      : 'academia';

    const academyId = scope === 'global' ? null : req.usuario.id_academia;

    const { rows } = await pool.query(
      `
        INSERT INTO comunidad_publicaciones (
          id_academia, scope_comunidad, id_autor, tipo_publicacion, titulo, contenido, media_urls
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        academyId,
        scope,
        req.usuario.id_usuario,
        tipo_publicacion || 'texto',
        titulo || null,
        contenido,
        JSON.stringify(TODAS_LAS_URLS),
      ]
    );

    res.status(201).json({ mensaje: 'Publicacion creada correctamente.', publicacion: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la publicacion.' });
  }
});

router.delete('/publicaciones/:id', verificarToken, verificarRoles('superadmin', 'admin_soporte'), async (req, res) => {
  try {
    await ensureFoundationSchema(pool);
    const result = await pool.query('DELETE FROM comunidad_publicaciones WHERE id_publicacion = $1 RETURNING *', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Publicacion no encontrada.' });
    }

    res.json({ mensaje: 'Publicacion eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la publicacion.' });
  }
});

router.post('/publicaciones/:id/comentarios', verificarToken, async (req, res) => {
  const { contenido } = req.body;
  if (!contenido) return res.status(400).json({ error: 'Contenido vacio.' });
  
  try {
    const result = await pool.query(
      'INSERT INTO comunidad_comentarios (id_publicacion, id_autor, contenido) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.usuario.id_usuario, contenido]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error agregando comentario.' });
  }
});

router.post('/publicaciones/:id/reaccionar', verificarToken, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT 1 FROM comunidad_reacciones WHERE id_publicacion = $1 AND id_autor = $2',
      [req.params.id, req.usuario.id_usuario]
    );
    
    if (check.rows.length > 0) {
      await pool.query(
        'DELETE FROM comunidad_reacciones WHERE id_publicacion = $1 AND id_autor = $2',
        [req.params.id, req.usuario.id_usuario]
      );
      res.json({ liked: false });
    } else {
      await pool.query(
        'INSERT INTO comunidad_reacciones (id_publicacion, id_autor) VALUES ($1, $2)',
        [req.params.id, req.usuario.id_usuario]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error en la reaccion.' });
  }
});

router.post('/sugerencias', verificarToken, async (req, res) => {
  const { id_usuario, id_academia } = req.usuario;
  const { tipo, mensaje } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO sugerencias_buzon (id_usuario, id_academia, tipo, mensaje) VALUES ($1, $2, $3, $4) RETURNING *',
      [id_usuario, id_academia, tipo, mensaje]
    );
    res.json({ mensaje: 'Sugerencia enviada. Gracias por ayudarnos a mejorar.', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar sugerencia.' });
  }
});

router.get('/sugerencias', verificarToken, verificarRoles('superadmin', 'admin_soporte'), async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          s.*,
          u.nombre_completo,
          a.nombre AS academia_nombre
        FROM sugerencias_buzon s
        JOIN usuarios u ON s.id_usuario = u.id_usuario
        LEFT JOIN academias a ON s.id_academia = a.id_academia
        ORDER BY s.fecha_creacion DESC
      `
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo sugerencias.' });
  }
});

module.exports = router;
