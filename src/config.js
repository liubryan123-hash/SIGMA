/**
 * Configuración Centralizada de Edu-SaaS Platform
 * 
 * Este archivo centraliza todas las variables de entorno y configuraciones
 * para facilitar el despliegue en diferentes entornos (local, VPS, producción).
 * 
 * Uso:
 *   const config = require('./config');
 *   const dbConfig = config.database;
 *   const apiUrls = config.urls;
 */

require('dotenv').config();

const config = {
  // --------------------------------------------
  // SERVIDOR
  // --------------------------------------------
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
  },

  // --------------------------------------------
  // URLs Públicas
  // --------------------------------------------
  urls: {
    // URL pública del backend (accesible desde internet)
    publicApiUrl: process.env.PUBLIC_API_URL || 'http://localhost:3000',
    
    // URL del frontend
    frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001',
    
    // URL de la API accesible desde el navegador del cliente
    browserApiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },

  // --------------------------------------------
  // BASE DE DATOS (PostgreSQL)
  // --------------------------------------------
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'edusaas_admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'edusaas_db',
    
    // Configuración adicional para el Pool de conexiones
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  },

  // --------------------------------------------
  // SEGURIDAD
  // --------------------------------------------
  security: {
    // Secreto para JWT - IMPORTANTE: cambiar en producción
    jwtSecret: process.env.JWT_SECRET || 'cambia_esto_en_produccion',
    // Duración del token (24 horas)
    jwtExpiresIn: '24h',
  },

  // --------------------------------------------
  // SERVICIOS EXTERNOS
  // --------------------------------------------
  external: {
    // Webhook de n8n para procesamiento de exámenes con IA
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'http://127.0.0.1:5678/webhook/procesar-examen',
  },

  // --------------------------------------------
  // ARCHIVOS Y UPLOADS
  // --------------------------------------------
  uploads: {
    // Directorio base para uploads (relativo al proyecto)
    baseDir: './uploads',
    // Tamaño máximo de archivo en bytes (10MB)
    maxFileSize: 10 * 1024 * 1024,
    // Días para limpiar archivos antiguos
    cleanupDays: 30,
  },

  // --------------------------------------------
  // CORS (Cross-Origin Resource Sharing)
  // --------------------------------------------
  cors: {
    // Orígenes permitidos - en producción especificar solo los necesarios
    origin: true,
    // Métodos HTTP permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // Headers permitidos
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // --------------------------------------------
  // UTILIDADES
  // --------------------------------------------
  
  /**
   * Valida que todas las variables críticas estén configuradas
   * @throws {Error} Si falta alguna variable requerida
   */
  validate: function() {
    const required = [
      'DB_HOST',
      'DB_PORT',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Faltan variables de entorno requeridas: ${missing.join(', ')}. ` +
        'Revisa el archivo .env o .env.example'
      );
    }

    // Advertencia de seguridad en producción
    if (this.isProduction && this.security.jwtSecret === 'cambia_esto_en_produccion') {
      console.warn('⚠️  ADVERTENCIA: JWT_SECRET no está configurado para producción');
    }
  },

  /**
   * Imprime la configuración actual (sin datos sensibles)
   */
  print: function() {
    console.log('======== EDU-SAAS CONFIG ========');
    console.log(`Entorno: ${this.server.nodeEnv}`);
    console.log(`Puerto: ${this.server.port}`);
    console.log(`DB Host: ${this.database.host}:${this.database.port}`);
    console.log(`DB Name: ${this.database.database}`);
    console.log(`API URL: ${this.urls.publicApiUrl}`);
    console.log(`Frontend URL: ${this.urls.frontendUrl}`);
    console.log(`n8n Webhook: ${this.external.n8nWebhookUrl}`);
    console.log('=================================');
  },
};

module.exports = config;
