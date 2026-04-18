const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

// ==========================================
// 🔓 ZONA PÚBLICA (Sin Protección JWT)
// ==========================================
// Necesaria para que los visitantes puedan ver los colores de página de login antes de ingresar clave.

router.get('/academias/:slug', async (req, res) => {
  try {
    // Escaneamos si esa URL (slug) de academia existe de verdad en el servidor
    const { rows } = await pool.query(
      'SELECT id_academia, nombre, slug, brand_primary_color, dark_mode_enabled, logo_url, background_url FROM academias WHERE slug = $1 AND activo = true',
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'La Sede no existe, URL incorrecta o academia desactivada por morosidad.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error trágico buscando el Branding' });
  }
});

router.get('/academias/id/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id_academia, nombre, slug, brand_primary_color as color_primario, logo_url FROM academias WHERE id_academia = $1',
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'No existe' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;
