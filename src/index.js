const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

// Cargar configuración centralizada
const config = require('./config');

// Validar que todas las variables estén configuradas
config.validate();

const app = express();
const port = config.server.port;
const publicApiUrl = config.urls.publicApiUrl;

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  min: config.database.pool.min,
  max: config.database.pool.max,
  idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
});

// Configurar CORS con las opciones centralizadas
// Reemplazo robusto para evitar fallos de matching
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});
app.use(express.json());
app.use(express.static('public'));

// Rate limiting general: 200 req/min por IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta en un momento.' },
});

// Rate limiting estricto para login: 10 intentos/15min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', loginLimiter);

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const academicRoutes = require('./routes/academic');
const examsRoutes = require('./routes/exams');
const publicRoutes = require('./routes/public');
const alumnosRoutes = require('./routes/alumnos');
const marketingRoutes = require('./routes/marketing');
const directorRoutes = require('./routes/director');
const secretariaRoutes = require('./routes/secretaria');
const communityRoutes = require('./routes/community');
const crmRoutes = require('./routes/crm');
const operationsRoutes = require('./routes/operations');
const { router: auditRoutes } = require('./routes/audit');
const omrRoutes = require('./routes/omr');
const notificacionesRoutes = require('./routes/notificaciones');
const tutorRoutes = require('./routes/tutor');
const padreRoutes = require('./routes/padre');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/director', directorRoutes);
app.use('/api/secretaria', secretariaRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/omr', omrRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/padre', padreRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    sistema: 'EduSaaS API (Node.js)',
    mensaje: 'Servidor backend funcionando correctamente',
  });
});

app.get('/api/db-status', async (req, res) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({
      status: 'conectado',
      mensaje: 'Conexion a PostgreSQL exitosa.',
      hora_servidor_db: time.rows[0].now,
    });
  } catch (error) {
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT;
    const tunnelHint =
      error.code === 'ECONNREFUSED' && dbHost === '127.0.0.1' && dbPort === '5433'
        ? 'No se detecta el tunel SSH hacia PostgreSQL en 127.0.0.1:5433. Activalo antes de iniciar sesion.'
        : 'Fallo la conexion a la base de datos. Revisa las credenciales en .env.';

    res.status(500).json({
      status: 'error',
      mensaje: tunnelHint,
      detalle: error.message,
    });
  }
});

// Iniciar servidor con configuración centralizada
app.listen(port, () => {
  config.print();
  console.log(`Health check: ${publicApiUrl}/api/health`);
  console.log(`DB Status: ${publicApiUrl}/api/db-status`);
});

const uploadsDir = path.join(__dirname, '../uploads');
setInterval(() => {
  if (!fs.existsSync(uploadsDir)) return;

  fs.readdir(uploadsDir, (readError, files) => {
    if (readError) return;

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(uploadsDir, file);
      fs.stat(filePath, (statError, stats) => {
        if (statError) return;
        if (now - stats.mtimeMs <= thirtyDays) return;

        fs.unlink(filePath, () => {
          console.log(`[EduSaaS cleanup] Imagen antigua eliminada: ${file}`);
        });
      });
    });
  });
}, 24 * 60 * 60 * 1000);
