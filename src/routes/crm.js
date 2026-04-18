const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { verificarToken, verificarRoles } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

const crmRoles = verificarRoles('director', 'secretaria', 'superadmin', 'admin_soporte');

router.get('/prospectos', verificarToken, crmRoles, async (req, res) => {
  const { id_academia, rol } = req.usuario;
  const targetAcademy = rol === 'superadmin' ? req.query.id_academia || id_academia : id_academia;

  if (!targetAcademy) {
    return res.status(400).json({ error: 'No se pudo determinar la academia del CRM.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM crm_prospectos WHERE id_academia = $1 ORDER BY fecha_creacion DESC',
      [targetAcademy]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener prospectos.' });
  }
});

router.post('/prospectos', verificarToken, crmRoles, async (req, res) => {
  const { id_academia } = req.usuario;
  const { nombre_completo, telefono, email, interes_ciclo, fuente, observaciones } = req.body;

  if (!id_academia) {
    return res.status(400).json({ error: 'El CRM necesita una academia asociada.' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO crm_prospectos (
          id_academia, nombre_completo, telefono, email, interes_ciclo, fuente, observaciones
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [id_academia, nombre_completo, telefono, email, interes_ciclo, fuente, observaciones]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear prospecto.' });
  }
});

router.put('/prospectos/:id', verificarToken, crmRoles, async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, telefono, email, interes_ciclo, fuente, observaciones, estado } = req.body;

  try {
    const result = await pool.query(
      `
        UPDATE crm_prospectos
        SET
          nombre_completo = COALESCE($1, nombre_completo),
          telefono = COALESCE($2, telefono),
          email = COALESCE($3, email),
          interes_ciclo = COALESCE($4, interes_ciclo),
          fuente = COALESCE($5, fuente),
          observaciones = COALESCE($6, observaciones),
          estado = COALESCE($7, estado)
        WHERE id_prospecto = $8 AND id_academia = $9
        RETURNING *
      `,
      [nombre_completo, telefono, email, interes_ciclo, fuente, observaciones, estado, id, req.usuario.id_academia]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Prospecto no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar prospecto.' });
  }
});

router.put('/prospectos/:id/estado', verificarToken, crmRoles, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const result = await pool.query(
      'UPDATE crm_prospectos SET estado = $1 WHERE id_prospecto = $2 AND id_academia = $3 RETURNING *',
      [estado, id, req.usuario.id_academia]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Prospecto no encontrado.' });
    }

    res.json({ mensaje: 'Estado actualizado.', prospecto: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado.' });
  }
});

router.post('/importar-alumnos', verificarToken, crmRoles, upload.single('csv'), async (req, res) => {
  const { id_academia } = req.usuario;
  if (!req.file) {
    return res.status(400).json({ error: 'No se subio ningun archivo.' });
  }

  const data = req.file.buffer.toString('utf8');
  const rows = data.split('\n').filter((row) => row.trim());
  let count = 0;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let i = 1; i < rows.length; i += 1) {
      const [nombre, email, dni, id_salon] = rows[i].split(',').map((segment) => segment.trim());
      if (!nombre || !dni) continue;

      const hashedPassword = await bcrypt.hash(dni, 10);
      const idUsuario = `ALU-${Date.now().toString(36).toUpperCase()}-${i}`;

      await client.query(
        `
          INSERT INTO usuarios (
            id_usuario, id_academia, id_salon, rol, nombre_completo, email, password_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [idUsuario, id_academia, id_salon || null, 'alumno', nombre, email || null, hashedPassword]
      );

      count += 1;
    }

    await client.query('COMMIT');
    res.json({ mensaje: 'Importacion finalizada.', count });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error durante la importacion masiva.' });
  } finally {
    client.release();
  }
});

module.exports = router;
