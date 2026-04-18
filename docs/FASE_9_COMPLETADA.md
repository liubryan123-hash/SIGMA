# 📋 FASE 9 COMPLETADA: Preparación para Producción

## Resumen de Cambios

Esta fase convirtió el proyecto de "solo funciona en mi computadora" a "listo para desplegar en cualquier servidor".

---

## 🗂️ Archivos Creados

### Backend

| Archivo | Propósito |
|---------|-----------|
| `src/config.js` | **Configuración centralizada** - Todas las variables de entorno se leen aquí y se exportan para usar en todo el backend |
| `.env.example` | Plantilla segura para compartir o tener como referencia (sin contraseñas reales) |

### Frontend

| Archivo | Propósito |
|---------|-----------|
| `frontend/.env.local` | Variables de entorno para Next.js (las que empiezan con `NEXT_PUBLIC_`) |
| `frontend/.env.example` | Plantilla segura para el frontend |

---

## 📝 Archivos Modificados

### 1. `.env` (Backend)
**Antes:** Solo 7 variables básicas
**Ahora:** 13 variables organizadas por categoría con comentarios explicativos

**Nuevas variables:**
- `PUBLIC_API_URL` - URL pública del backend
- `NEXT_PUBLIC_FRONTEND_URL` - URL del frontend Next.js
- `NEXT_PUBLIC_API_URL` - URL de la API accesible desde el navegador
- `N8N_WEBHOOK_URL` - Webhook de n8n para procesamiento de IA
- `NODE_ENV` - Entorno (development/production)

### 2. `src/index.js` (Backend)
**Antes:** Usaba `process.env` directamente y tenía código hardcodeado
**Ahora:** 
- Importa `config.js` centralizado
- Valida variables requeridas al iniciar
- Imprime configuración limpia al arrancar
- Usa CORS configurado centralmente

### 3. `src/routes/*.js` (Todas las rutas del backend)
**Archivos actualizados (13 archivos):**
- `auth.js`, `admin.js`, `academic.js`, `alumnos.js`
- `community.js`, `crm.js`, `director.js`, `marketing.js`
- `operations.js`, `public.js`, `secretaria.js`, `audit.js`
- `exams.js`

**Cambio común en todos:**
```javascript
// ANTES (hardcodeado)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// AHORA (configuración centralizada)
const config = require('../config');
const pool = new Pool(config.database);
```

### 4. `src/routes/exams.js` (Adicional)
**Extra:** Las URLs de n8n ahora usan configuración:
```javascript
// ANTES
const n8nUrl = "https://n8n.srv1415334.hstgr.cloud/webhook/vision-ia-scanner";

// AHORA
const n8nUrl = config.external.n8nWebhookUrl;
```

### 5. `frontend/src/lib/api.js`
**Antes:** URL hardcodeada `http://127.0.0.1:3000`
**Ahora:** 
- Usa `NEXT_PUBLIC_API_URL` desde variables de entorno
- Soporta modo producción con rutas relativas (`/api`)
- Detecta automáticamente si está en servidor o navegador

### 6. `frontend/next.config.mjs`
**Nuevas configuraciones:**
- `output: 'standalone'` - Optimizado para Docker/producción
- `rewrites()` - Proxy de API para desarrollo
- `headers()` - Headers de seguridad para producción (HSTS, X-Frame-Options, etc.)

---

## 🎯 ¿Qué logramos con esto?

### 1. **Cero Hardcoding**
- No hay más `localhost` o `127.0.0.1` embebidos en el código
- Todo se configura mediante variables de entorno

### 2. **Configuración Centralizada**
- Un solo archivo (`config.js`) controla toda la configuración del backend
- Las rutas solo hacen `require('../config')` y usan `config.database`, `config.urls`, etc.

### 3. **Validación Automática**
- El backend valida que todas las variables críticas estén presentes al iniciar
- Si falta algo, te avisa inmediatamente con un error claro

### 4. **Fácil Despliegue**
- Para desplegar en el VPS, solo cambias los valores en `.env`
- No necesitas tocar el código

### 5. **Seguridad**
- Los archivos `.env` reales NO se suben a Git (ya están en `.gitignore`)
- Solo compartes las plantillas `.env.example` sin datos sensibles

---

## 🔧 Cómo usar en diferentes entornos

### Desarrollo Local (tu computadora)
```env
# .env (ya está configurado así)
DB_HOST=127.0.0.1
DB_PORT=5433
PUBLIC_API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/procesar-examen
```

### VPS (Hostinger)
Cuando despliegues, cambiarás a:
```env
# .env (ejemplo para VPS)
DB_HOST=localhost
DB_PORT=5432
PUBLIC_API_URL=http://TU_IP_VPS:3000
NEXT_PUBLIC_API_URL=http://TU_IP_VPS:3000
N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/procesar-examen
```

### VPS con Dominio (futuro)
Cuando tengas dominio:
```env
# .env (ejemplo con dominio)
DB_HOST=localhost
DB_PORT=5432
PUBLIC_API_URL=https://api.tudominio.com
NEXT_PUBLIC_API_URL=https://api.tudominio.com
NEXT_PUBLIC_FRONTEND_URL=https://tudominio.com
N8N_WEBHOOK_URL=https://n8n.tudominio.com/webhook/procesar-examen
```

---

## ✅ Pruebas de Validación

Para verificar que todo funciona:

### 1. Backend
```bash
cd "e:\Antigravity proyectos\plataforma-saas-academias"
npm start
```

Deberías ver algo como:
```
======== EDU-SAAS CONFIG ========
Entorno: development
Puerto: 3000
DB Host: 127.0.0.1:5433
DB Name: edusaas_db
API URL: http://127.0.0.1:3000
Frontend URL: http://127.0.0.1:3001
n8n Webhook: http://127.0.0.1:5678/webhook/procesar-examen
=================================
Health check: http://127.0.0.1:3000/api/health
DB Status: http://127.0.0.1:3000/api/db-status
```

### 2. Frontend
```bash
cd "e:\Antigravity proyectos\plataforma-saas-academias\frontend"
npm run dev
```

El frontend debería:
- Arrancar en `http://localhost:3001` (o el puerto que use Next.js)
- Poder hacer login y navegar por el dashboard
- Las llamadas a la API deberían funcionar sin errores de CORS

---

## 📚 Próximos Pasos

Ahora que la FASE 9 está completa, podemos continuar con:

1. **FASE 10**: Limpieza del VPS (eliminar proyecto viejo)
2. **FASE 11**: Despliegue en VPS (Docker + Traefik)
3. **FASE 12**: Consolidación funcional (módulos pendientes)

---

## ⚠️ Importante

**NUNCA subas los archivos `.env` reales a Git.** Solo las plantillas `.env.example`.

Los archivos `.env` ya están en el `.gitignore`, pero es bueno recordarlo:
- `.env` → Contiene contraseñas reales → NO subir a Git
- `.env.example` → Plantilla sin datos sensibles → SÍ se puede compartir

---

## 📞 ¿Problemas?

Si algo no funciona después de estos cambios:

1. Verifica que el `.env` tenga todas las variables requeridas
2. Reinicia el backend después de cambiar el `.env`
3. Revisa la consola del backend para ver si hay errores de configuración
4. Usa los endpoints de health check:
   - `http://localhost:3000/api/health` - Verifica que el backend corre
   - `http://localhost:3000/api/db-status` - Verifica conexión a PostgreSQL
