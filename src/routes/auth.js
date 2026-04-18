const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

// ==========================================
// 1. ENDPOINT: INICIO DE SESIÓN (LOGIN WEB)
// ==========================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son datos obligatorios papá' });
  }

  try {
    // Buscar si el usuario existe en PostgreSQL
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas o tu usuario fue desactivado' });

    const user = rows[0];
    
    // Aquí ocurre la magia: Node compara el texto plano con el texto encriptado de seguridad militar en DB
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'La contraseña es incorrecta' });

    // Si pasamos ambos bloqueos, generamos el "Ticket VIP" o "Token" para que el usuario navegue sin logearse a cada rato
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        rol: user.rol,
        id_academia: user.id_academia,
        salon: user.id_salon
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // Esta sesión dura 8 horas
    );

    // Obtener permisos de la academia (si existen)
    let permisosRoles = null;
    try {
      const permisosResult = await pool.query(
        'SELECT permisos_roles FROM academias WHERE id_academia = $1',
        [user.id_academia]
      );
      if (permisosResult.rows.length > 0 && permisosResult.rows[0].permisos_roles) {
        permisosRoles = permisosResult.rows[0].permisos_roles;
      }
    } catch (e) {
      console.log('No se pudo leer permisos_roles (puede que no exista la columna aún)');
    }

    // Retornamos el éxito hacia React
    res.json({
      message: '¡Bienvenido! Has iniciado sesión',
      token: token,
      user_info: {
        id: user.id_usuario,
        nombre: user.nombre_completo,
        rol: user.rol,
        academia: user.id_academia
      },
      permisos_roles: permisosRoles // Nuevos permisos configurables por superadmin
    });

    // Actualizar racha de login (fire-and-forget — no bloquea la respuesta)
    pool.query(`
      INSERT INTO rachas_login (id_usuario, racha_actual, racha_maxima, ultimo_login, actualizado_en)
      VALUES ($1, 1, 1, CURRENT_DATE, NOW())
      ON CONFLICT (id_usuario) DO UPDATE SET
        racha_actual = CASE
          WHEN rachas_login.ultimo_login = CURRENT_DATE         THEN rachas_login.racha_actual
          WHEN rachas_login.ultimo_login = CURRENT_DATE - 1     THEN rachas_login.racha_actual + 1
          ELSE 1
        END,
        racha_maxima = GREATEST(
          rachas_login.racha_maxima,
          CASE
            WHEN rachas_login.ultimo_login = CURRENT_DATE         THEN rachas_login.racha_actual
            WHEN rachas_login.ultimo_login = CURRENT_DATE - 1     THEN rachas_login.racha_actual + 1
            ELSE 1
          END
        ),
        ultimo_login = CASE
          WHEN rachas_login.ultimo_login = CURRENT_DATE THEN rachas_login.ultimo_login
          ELSE CURRENT_DATE
        END,
        actualizado_en = NOW()
    `, [user.id_usuario]).catch(() => { /* graceful — tabla puede no existir aún */ });

  } catch (error) {
    console.error("Error catastrofico en login", error);
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const isMissingTunnel =
      error.code === 'ECONNREFUSED' && dbHost === '127.0.0.1' && dbPort === '5433';

    res.status(500).json({
      error: isMissingTunnel
        ? 'No hay conexion con la base de datos. Activa primero el tunel SSH al VPS.'
        : 'Error interno del backend al procesar el login'
    });
  }
});


// ==========================================
// 2. ENDPOINT HERRAMIENTA: CONFIGURADOR MAESTRO
// ==========================================
// Solo disponible en entorno de desarrollo. Bloqueado en producción.
router.post('/setup-admin', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Ruta deshabilitada en produccion.' });
  }

  const { nombre, email, password, codigo_academia, rol } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userRol = rol || 'superadmin';
    const id_usuario = `${userRol.toUpperCase()}-` + Date.now();

    await pool.query(
      'INSERT INTO usuarios (id_usuario, id_academia, rol, nombre_completo, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6)',
      [id_usuario, codigo_academia || 'SUPERADMIN', userRol, nombre, email, hash]
    );

    res.json({ message: 'Usuario creado. Solo disponible en desarrollo.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
