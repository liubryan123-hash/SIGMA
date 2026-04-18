# 📘 DOCUMENTO MAESTRO DEL PROYECTO - EduSaaS Platform
## Estado: FASE 9 COMPLETADA - Listo para Producción

**Fecha de corte:** 19 de marzo de 2026  
**Ubicación del proyecto:** `e:\Antigravity proyectos\plataforma-saas-academias`  
**VPS:** Hostinger KVM2 (Traefik + n8n + PostgreSQL corriendo)

---

## 🎯 RESUMEN EJECUTIVO

### ¿Qué es este proyecto?

**EduSaaS** es una plataforma SaaS multi-tenant para academias pre-universitarias. Permite gestionar:
- 🎓 Academias, ciclos, salones y usuarios (multi-tenant)
- 📝 Exámenes tipo OMR (lectura óptica) con IA vía n8n
- ✅ Control de asistencia
- 💰 Finanzas y pagos (CRM de cobranza)
- 📈 CRM de prospectos/ventas
- 📚 Material didáctico y comunidad
- 🛡️ Auditoría de acciones
- 🚀 Solicitudes de marketing

### Roles del sistema

| Rol | Permisos |
|-----|----------|
| **superadmin** | Gestiona TODAS las academias, usuarios, planes, auditoría global |
| **director** | Gestiona SU academia completa, finanzas, marketing, CRM |
| **secretaria** | Gestión operativa: alumnos, pagos, comunidad |
| **profesor** | Sube exámenes, califica, toma asistencia, ve sus alumnos |
| **alumno** | Ve sus resultados, material, portal personal |

### Arquitectura técnica

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS Hostinger                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Traefik   │  │    n8n      │  │   PostgreSQL        │  │
│  │  (80/443)   │  │ (5678 int)  │  │   (5432 - cerrado)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │        Este Proyecto (por desplegar)                    ││
│  │  ┌──────────────┐  ┌──────────────┐                    ││
│  │  │   Backend    │  │   Frontend   │                    ││
│  │  │  Node.js     │  │   Next.js    │                    ││
│  │  │  Puerto 3000 │  │  Puerto 3001 │                    ││
│  │  └──────────────┘  └──────────────┘                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
plataforma-saas-academias/
├── .env                          # Variables de entorno (NO subir a Git)
├── .env.example                  # Plantilla segura para compartir
├── package.json                  # Dependencias backend
├── src/
│   ├── config.js                 # ⭐ CONFIGURACIÓN CENTRALIZADA (FASE 9)
│   ├── index.js                  # Entry point del backend
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT y verificación de roles
│   ├── routes/                   # 13 rutas API
│   │   ├── auth.js               # Login, autenticación
│   │   ├── admin.js              # Panel superadmin
│   │   ├── academic.js           # Ciclos, salones, asistencia
│   │   ├── exams.js              # Plantillas, exámenes, IA/OMR
│   │   ├── alumnos.js            # Gestión de alumnos
│   │   ├── director.js           # Finanzas, estadísticas director
│   │   ├── secretaria.js         # Pagos, boletas, estado de cuenta
│   │   ├── crm.js                # Prospectos, conversión
│   │   ├── marketing.js          # Solicitudes de marketing
│   │   ├── community.js          # Publicaciones, material
│   │   ├── operations.js         # Tickets de soporte
│   │   ├── audit.js              # Logs de auditoría
│   │   └── public.js             # Endpoints públicos (sin auth)
│   └── db/
│       └── foundation.js         # Inicialización de esquema
├── frontend/
│   ├── .env.local                # Variables frontend (NO subir a Git)
│   ├── .env.example              # Plantilla segura frontend
│   ├── next.config.mjs           # Configuración Next.js
│   ├── package.json              # Dependencias frontend
│   └── src/
│       ├── app/
│       │   ├── dashboard/
│       │   │   ├── page.js       # ⭐ Dashboard principal (1014 líneas)
│       │   │   ├── AdminPanel.jsx
│       │   │   ├── PlantillasManager.jsx
│       │   │   ├── CRM.jsx
│       │   │   ├── AuditDashboard.jsx
│       │   │   ├── ControlAsistencia.jsx
│       │   │   ├── MaterialDidactico.jsx
│       │   │   ├── PortalAlumno.jsx
│       │   │   ├── GestionAlumnos.jsx
│       │   │   ├── FastInputConsole.jsx
│       │   │   └── ImportadorDatos.jsx
│       │   ├── login/
│       │   │   └── [slug]/page.js
│       │   ├── layout.js
│       │   └── page.js
│       └── lib/
│           └── api.js            # ⭐ Configuración de API del frontend
├── sql/
│   └── schema.sql                # Esquema completo de PostgreSQL (20+ tablas)
├── public/
│   └── uploads/                  # Exámenes escaneados subidos
├── docs/
│   ├── auditoria_proyecto_viejo_educational_dashboard.md
│   └── FASE_9_COMPLETADA.md      # Documentación de cambios FASE 9
└── scripts/
    └── start-local.ps1           # Script de arranque local
```

---

## 🚀 FASES DEL PROYECTO

### ✅ FASES 1-8: COMPLETADAS (Funcionalidad base)

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| **Autenticación** | ✅ Completo | JWT, roles, login por slug |
| **Multi-tenant** | ✅ Completo | Academias independientes con branding |
| **Gestión Académica** | ✅ Completo | Ciclos, salones, usuarios |
| **Exámenes OMR** | ✅ Completo | Plantillas, calificación, IA vía n8n |
| **Asistencia** | ✅ Completo | Registro, validación, histórico |
| **CRM** | ✅ Completo | Prospectos, estados, conversión |
| **Finanzas** | ✅ Parcial | Pagos, deudas (falta boleta PDF) |
| **Comunidad** | ✅ Completo | Publicaciones, material didáctico |
| **Auditoría** | ✅ Completo | Logs de acciones críticas |
| **Marketing** | ✅ Completo | Catálogo de servicios, solicitudes |
| **Soporte** | ✅ Completo | Tickets operativos |

### ✅ FASE 9: PREPARACIÓN PARA PRODUCCIÓN (COMPLETADA)

**Objetivo:** Eliminar todo el código hardcodeado y centralizar configuración.

#### Cambios realizados:

##### 1. Archivos CREADOS

| Archivo | Propósito |
|---------|-----------|
| `src/config.js` | Configuración centralizada del backend |
| `.env.example` | Plantilla backend sin datos sensibles |
| `frontend/.env.local` | Variables de entorno frontend |
| `frontend/.env.example` | Plantilla frontend sin datos sensibles |
| `docs/FASE_9_COMPLETADA.md` | Documentación detallada de cambios |

##### 2. Archivos MODIFICADOS

| Archivo | Cambio principal |
|---------|------------------|
| `.env` | Ampliado de 7 a 13 variables con comentarios |
| `src/index.js` | Usa `config.js`, valida variables, imprime configuración |
| `src/routes/auth.js` | Usa `config.database` en lugar de `process.env` directo |
| `src/routes/admin.js` | Usa `config.database` |
| `src/routes/academic.js` | Usa `config.database` |
| `src/routes/alumnos.js` | Usa `config.database` |
| `src/routes/community.js` | Usa `config.database` |
| `src/routes/crm.js` | Usa `config.database` |
| `src/routes/director.js` | Usa `config.database` |
| `src/routes/marketing.js` | Usa `config.database` |
| `src/routes/operations.js` | Usa `config.database` |
| `src/routes/public.js` | Usa `config.database` |
| `src/routes/secretaria.js` | Usa `config.database` |
| `src/routes/audit.js` | Usa `config.database` |
| `src/routes/exams.js` | Usa `config.database` + `config.external.n8nWebhookUrl` |
| `frontend/src/lib/api.js` | Usa `NEXT_PUBLIC_API_URL`, soporta rutas relativas |
| `frontend/next.config.mjs` | Agrega proxy de API, headers de seguridad, output standalone |

##### 3. Variables de entorno (`.env`)

```env
# Backend
PORT=3000
PUBLIC_API_URL=http://127.0.0.1:3000
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=edusaas_admin
DB_PASSWORD=SaaS2026
DB_NAME=edusaas_db
JWT_SECRET=super_secreto_para_tokens

# Frontend
NEXT_PUBLIC_FRONTEND_URL=http://127.0.0.1:3001
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000

# Servicios externos
N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/procesar-examen

# Entorno
NODE_ENV=development
```

##### 4. Configuración centralizada (`src/config.js`)

```javascript
const config = {
  server: { port, nodeEnv, isProduction, isDevelopment },
  urls: { publicApiUrl, frontendUrl, browserApiUrl },
  database: { host, port, user, password, database, pool },
  security: { jwtSecret, jwtExpiresIn },
  external: { n8nWebhookUrl },
  uploads: { baseDir, maxFileSize, cleanupDays },
  cors: { origin, methods, allowedHeaders },
  validate: function() { /* valida variables requeridas */ },
  print: function() { /* imprime configuración sin datos sensibles */ }
};
```

##### 5. Beneficios de la FASE 9

- ✅ **Cero hardcoding:** No hay `localhost` o `127.0.0.1` embebidos
- ✅ **Configuración centralizada:** Un solo archivo controla todo
- ✅ **Validación automática:** Error claro si falta variable
- ✅ **Fácil despliegue:** Solo cambiar `.env` para producción
- ✅ **Seguridad:** `.env` no se sube a Git

---

### ⏳ FASE 10: LIMPIEZA DEL VPS (PENDIENTE)

**Objetivo:** Eliminar el proyecto viejo en Nginx que ya no se usa.

#### Contexto del VPS actual:

```
VPS Hostinger KVM2 (10 meses restantes)
├── Docker: corriendo
│   ├── traefik (puertos 80/443 públicos)
│   └── n8n (localhost:5678, interno)
├── Nginx: corriendo (puerto 8080 público) ← PROYECTO VIEJO
├── PostgreSQL: corriendo (puerto 5432 expuesto) ← CERRAR EN FIREWALL
└── Proyecto viejo:
    ├── Archivos web en /var/www/educational-dashboard (probable)
    ├── Config de Nginx en /etc/nginx/sites-available/
    ├── Base de datos: posiblemente mezclada con edusaas_db
    └── Workflows n8n viejos: posiblemente activos
```

#### Tareas pendientes FASE 10:

1. **Auditoría remota** (ejecutar comandos en VPS):
   ```bash
   # Identificar carpeta del proyecto viejo
   find /var/www -maxdepth 3 -type d | grep -i "educational\|dashboard\|edu"
   
   # Revisar configs de Nginx
   ls -la /etc/nginx/sites-enabled
   grep -Rni "/var/www\|root \|server_name" /etc/nginx/sites-available
   
   # Verificar bases de datos PostgreSQL
   psql -h localhost -U edusaas_admin -d edusaas_db -c "\dt"
   ```

2. **Respaldar datos del proyecto viejo** (si existen)

3. **Eliminar:**
   - Carpeta web en `/var/www/...`
   - Config de Nginx en `/etc/nginx/sites-available/...`
   - Base de datos vieja (si está separada)
   - Workflows n8n viejos

4. **Cerrar puerto 5432** en firewall del VPS

---

### ⏳ FASE 11: DESPLIEGUE EN VPS (PENDIENTE)

**Objetivo:** Desplegar el proyecto en el VPS usando Docker + Traefik.

#### Arquitectura objetivo:

```
┌─────────────────────────────────────────────────────────────┐
│                         VPS Hostinger                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Traefik (proxy)                     │ │
│  │              EntryPoints: 80, 443                      │ │
│  └────────────────────────────────────────────────────────┘ │
│           │                              │                   │
│           ▼                              ▼                   │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │   Frontend       │        │    Backend       │          │
│  │   Next.js        │        │    Node.js       │          │
│  │   :3001          │        │    :3000         │          │
│  │                  │        │                  │          │
│  │ Labels:          │        │ Labels:          │          │
│  │ - traefik.http.  │        │ - traefik.http.  │          │
│  │   routers.app    │        │   routers.api    │          │
│  └──────────────────┘        └──────────────────┘          │
│           │                              │                   │
│           └──────────┬───────────────────┘                   │
│                      ▼                                       │
│           ┌──────────────────┐                              │
│           │   PostgreSQL     │                              │
│           │   :5432 (interno)│                              │
│           └──────────────────┘                              │
│                                                              │
│           ┌──────────────────┐                              │
│           │   n8n            │                              │
│           │   :5678 (interno)│                              │
│           └──────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

#### Archivos a crear:

1. **`Dockerfile.backend`**:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY src/ ./src/
   COPY sql/ ./sql/
   EXPOSE 3000
   CMD ["node", "src/index.js"]
   ```

2. **`Dockerfile.frontend`**:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

3. **`docker-compose.yml`**:
   ```yaml
   version: '3.8'
   services:
     backend:
       build:
         context: .
         dockerfile: Dockerfile.backend
       environment:
         - NODE_ENV=production
         - DB_HOST=postgres
         - DB_PORT=5432
         # ... más variables
       labels:
         - "traefik.http.routers.api.rule=Host(`api.tudominio.com`)"
       networks:
         - edusaas-network
   
     frontend:
       build:
         context: ./frontend
         dockerfile: Dockerfile.frontend
       environment:
         - NEXT_PUBLIC_API_URL=https://api.tudominio.com
       labels:
         - "traefik.http.routers.app.rule=Host(`tudominio.com`)"
       networks:
         - edusaas-network
   
     postgres:
       image: postgres:15-alpine
       volumes:
         - postgres_data:/var/lib/postgresql/data
       environment:
         - POSTGRES_USER=edusaas_admin
         - POSTGRES_PASSWORD=${DB_PASSWORD}
         - POSTGRES_DB=edusaas_db
       networks:
         - edusaas-network
   
   networks:
     edusaas-network:
       external: true # Traefik ya lo tiene
   
   volumes:
     postgres_data:
   ```

4. **`.env.produccion`** (ejemplo):
   ```env
   PORT=3000
   PUBLIC_API_URL=https://api.tudominio.com
   DB_HOST=postgres
   DB_PORT=5432
   DB_USER=edusaas_admin
   DB_PASSWORD=contraseña_segura_generada
   DB_NAME=edusaas_db
   JWT_SECRET=secreto_largo_y_aleatorio
   N8N_WEBHOOK_URL=http://n8n:5678/webhook/procesar-examen
   NODE_ENV=production
   ```

#### Pasos de despliegue:

1. Subir archivos al VPS (git clone o SCP)
2. Copiar `.env.produccion` a `.env`
3. Crear red Docker: `docker network create edusaas-network`
4. Ejecutar: `docker-compose up -d`
5. Verificar logs: `docker-compose logs -f`
6. Configurar DNS del dominio hacia el VPS
7. Traefik automáticamente genera HTTPS con Let's Encrypt

---

### ⏳ FASE 12: CONSOLIDACIÓN FUNCIONAL (PENDIENTE)

**Objetivo:** Completar módulos faltantes y corregir deuda técnica.

#### Tareas pendientes:

1. **Módulo financiero completo:**
   - [ ] Generación de boletas PDF
   - [ ] Estado de cuenta consolidado
   - [ ] Historial de pagos por alumno
   - [ ] Reportes de deuda por academia

2. **Corrección de inconsistencias OMR:**
   - [ ] Normalizar payload entre frontend/backend
   - [ ] Asegurar que `codigo_examen` siempre se guarda
   - [ ] Validar que `url_imagen_scan` no sea null
   - [ ] Mejorar manejo de observaciones

3. **Refactor de frontend:**
   - [ ] Dividir `page.js` (1014 líneas) en módulos por rol
   - [ ] Extraer hooks personalizados para lógica repetida
   - [ ] Mejorar manejo de estados de carga/error

4. **Permisos y seguridad:**
   - [ ] Auditar todas las rutas por permisos de rol
   - [ ] Asegurar que profesor no pueda acceder a finanzas
   - [ ] Asegurar que alumno solo vea sus datos

5. **Mejoras de CRM:**
   - [ ] Métricas de conversión (tasa de cierre)
   - [ ] Funnel de ventas visual
   - [ ] Recordatorios de seguimiento

---

### ⏳ FASE 13: AUTOMATIZACIONES (PENDIENTE)

**Objetivo:** Integrar notificaciones y automatizaciones.

#### Tareas pendientes:

1. **Email/WhatsApp:**
   - [ ] Notificación de pago recibido
   - [ ] Recordatorio de pago vencido
   - [ ] Confirmación de inscripción
   - [ ] Resultados de exámenes

2. **Backups automáticos:**
   - [ ] Script de backup diario de PostgreSQL
   - [ ] Subida a S3 o Google Drive
   - [ ] Rotación de backups antiguos

3. **Monitoreo:**
   - [ ] Health checks periódicos
   - [ ] Alertas por Slack/Telegram si cae el servicio
   - [ ] Logs centralizados

---

### ⏳ FASE 14: DOCUMENTACIÓN Y CIERRE (PENDIENTE)

**Objetivo:** Documentar para usuarios y desarrolladores.

#### Tareas pendientes:

1. **Documentación técnica:**
   - [ ] API completa (Endpoints, payloads, ejemplos)
   - [ ] Diagrama de arquitectura
   - [ ] Guía de despliegue paso a paso
   - [ ] Troubleshooting común

2. **Manuales de usuario:**
   - [ ] Superadmin: gestión de academias
   - [ ] Director: finanzas, reportes
   - [ ] Profesor: exámenes, asistencia
   - [ ] Secretaria: pagos, alumnos
   - [ ] Alumno: portal, resultados

3. **Políticas:**
   - [ ] Términos de servicio
   - [ ] Política de privacidad
   - [ ] SLA (acuerdo de nivel de servicio)

---

## 🔧 CONFIGURACIÓN ACTUAL (.env)

### Backend (`.env`)

```env
# ============================================
# CONFIGURACIÓN EDU-SAAS PLATFORM
# ============================================

# 1. SERVIDOR
PORT=3000
PUBLIC_API_URL=http://127.0.0.1:3000

# 2. BASE DE DATOS (PostgreSQL)
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=edusaas_admin
DB_PASSWORD=SaaS2026
DB_NAME=edusaas_db

# 3. SEGURIDAD (JWT)
JWT_SECRET=super_secreto_para_tokens

# 4. FRONTEND
NEXT_PUBLIC_FRONTEND_URL=http://127.0.0.1:3001
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000

# 5. SERVICIOS EXTERNOS (n8n)
N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/procesar-examen

# 6. MODO
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
NEXT_PUBLIC_FRONTEND_URL=http://127.0.0.1:3001
```

---

## 🗄️ BASE DE DATOS

### Esquema actual (20+ tablas)

| Tabla | Propósito |
|-------|-----------|
| `academias` | Multi-tenant, configuración por academia |
| `ciclos` | Ciclos académicos (ej: 2026-A) |
| `salones` | Salones por ciclo |
| `usuarios` | Usuarios de todos los roles |
| `examenes_plantillas` | Plantillas de exámenes con claves |
| `resultados` | Resultados de exámenes calificados |
| `asistencias` | Registro de asistencia |
| `foro_temas` | Temas de foro/comunidad |
| `foro_respuestas` | Respuestas en foros |
| `pagos_crm` | Pagos y deudas de alumnos |
| `alumnos_expedientes` | Documentos de alumnos |
| `reportes_alumnos` | Reportes de incidencia |
| `catalogo_servicios` | Servicios de marketing |
| `solicitudes_marketing` | Solicitudes de academias |
| `sugerencias_buzon` | Buzón de sugerencias |
| `material_didactico` | Material por academia/salón |
| `crm_prospectos` | Prospectos de ventas |
| `logs_auditoria` | Auditoría de acciones críticas |
| `academia_modulos` | Módulos configurables por academia |
| `solicitudes_operativas` | Tickets de soporte |
| `solicitud_mensajes` | Mensajes en tickets |
| `comunidad_publicaciones` | Publicaciones de comunidad |

### Conexión actual

- **Host:** 127.0.0.1 (túnel SSH)
- **Puerto local:** 5433 → mapeado a 5432 en VPS
- **Usuario:** edusaas_admin
- **Base:** edusaas_db

### Comando de túnel SSH

```bash
ssh -L 5433:127.0.0.1:5432 edusaas_admin@TU_VPS_IP -N
```

---

## 🌐 ENDPOINTS PRINCIPALES

### Autenticación
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Verificar token

### Admin (Superadmin)
- `GET /api/admin/stats` - Estadísticas globales
- `POST /api/admin/academias` - Crear academia
- `PUT /api/admin/academias/:id` - Actualizar academia
- `POST /api/admin/usuarios` - Crear usuario
- `GET /api/admin/auditoria` - Logs de auditoría

### Académico
- `POST /api/academic/ciclos` - Crear ciclo
- `POST /api/academic/salones` - Crear salón
- `POST /api/academic/asistencia` - Registrar asistencia
- `GET /api/academic/asistencia/:id_salon` - Ver asistencia

### Exámenes
- `POST /api/exams/plantilla` - Crear plantilla
- `GET /api/exams/plantillas` - Listar plantillas
- `POST /api/exams/upload-foto` - Subir examen para IA
- `POST /api/exams/confirmar-resultados` - Guardar resultado

### CRM
- `GET /api/crm/prospectos` - Listar prospectos
- `POST /api/crm/prospectos` - Crear prospecto
- `PATCH /api/crm/prospectos/:id/estado` - Cambiar estado

### Director
- `GET /api/director/finanzas` - Estadísticas financieras
- `GET /api/director/deuda` - Deuda consolidada

### Secretaria
- `POST /api/secretaria/pagos` - Registrar pago
- `GET /api/secretaria/boleta/:id` - Generar boleta

### Marketing
- `GET /api/marketing/catalogo` - Catálogo de servicios
- `POST /api/marketing/solicitar` - Solicitar servicio

### Comunidad
- `GET /api/community/material` - Material didáctico
- `POST /api/community/publicaciones` - Crear publicación

### Auditoría
- `GET /api/audit/logs` - Logs de auditoría
- `POST /api/audit/log` - Registrar acción

---

## 🧪 PRUEBAS DE VALIDACIÓN ACTUAL

### Backend corriendo correctamente

```bash
cd "e:\Antigravity proyectos\plataforma-saas-academias"
npm start
```

**Salida esperada:**
```
[dotenv@17.3.1] injecting env (12) from .env
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

### Frontend corriendo correctamente

```bash
cd "e:\Antigravity proyectos\plataforma-saas-academias\frontend"
npm run dev
```

**Salida esperada:**
```
⚠ Port 3000 is in use, using available port 3002 instead.
▲ Next.js 16.2.0 (Turbopack)
- Local:         http://localhost:3002
✓ Ready in 4.0s
```

### Endpoints de health check

- **Backend:** http://127.0.0.1:3000/api/health
  ```json
  {
    "status": "ok",
    "sistema": "EduSaaS API (Node.js)",
    "mensaje": "Servidor backend funcionando correctamente"
  }
  ```

- **DB Status:** http://127.0.0.1:3000/api/db-status
  ```json
  {
    "status": "conectado",
    "mensaje": "Conexion a PostgreSQL exitosa.",
    "hora_servidor_db": "2026-03-20T03:23:45.678Z"
  }
  ```

---

## ⚠️ PROBLEMAS CONOCIDOS Y SOLUCIONES

### 1. Puerto ya en uso (EADDRINUSE)

**Error:** `listen EADDRINUSE: address already in use :::3000`

**Solución:**
```powershell
taskkill /F /IM node.exe
```

### 2. Frontend no conecta al backend

**Síntoma:** Error de CORS o "no response"

**Solución:**
1. Verificar backend corriendo en puerto 3000
2. Verificar `.env.local` tiene `NEXT_PUBLIC_API_URL=http://127.0.0.1:3000`
3. Reiniciar frontend después de cambiar `.env.local`

### 3. Base de datos no conecta

**Error:** `ECONNREFUSED` en puerto 5433

**Solución:**
1. Verificar túnel SSH activo: `ssh -L 5433:127.0.0.1:5432 ...`
2. Verificar PostgreSQL corriendo en VPS
3. Verificar credenciales en `.env`

### 4. n8n no responde

**Error:** Webhook timeout o 404

**Solución:**
1. Verificar n8n corriendo en VPS
2. Verificar URL en `N8N_WEBHOOK_URL`
3. Probar webhook manualmente con Postman

---

## 📞 PRÓXIMOS PASOS RECOMENDADOS

### Orden sugerido:

1. **FASE 10: Limpieza del VPS** (1-2 horas)
   - Eliminar proyecto viejo en Nginx
   - Cerrar puerto 5432 en firewall
   - Dejar VPS limpio para despliegue

2. **FASE 11: Despliegue en VPS** (2-4 horas)
   - Crear Dockerfiles
   - Crear docker-compose.yml
   - Configurar Traefik
   - Desplegar y probar

3. **FASE 12: Consolidación funcional** (1-2 semanas)
   - Completar módulo financiero
   - Corregir inconsistencias OMR
   - Refactor frontend

4. **FASE 13-14: Automatizaciones y documentación** (1 semana)
   - Notificaciones email/WhatsApp
   - Backups automáticos
   - Documentación completa

---

## 🔐 SEGURIDAD

### Lo que está implementado:

- ✅ JWT para autenticación
- ✅ Middleware de verificación de roles
- ✅ Passwords hasheados con bcrypt
- ✅ CORS configurado
- ✅ Variables de entorno no subidas a Git

### Lo que falta implementar:

- [ ] Rate limiting en endpoints críticos
- [ ] Validación de input más estricta
- [ ] Sanitización de SQL injection (usar parameterized queries siempre)
- [ ] HTTPS en producción (Traefik lo hace automático)
- [ ] 2FA para superadmin
- [ ] Logs de intentos de login fallidos

---

## 📚 RECURSOS Y REFERENCIAS

### Documentación interna:
- `docs/auditoria_proyecto_viejo_educational_dashboard.md` - Auditoría del proyecto anterior
- `docs/FASE_9_COMPLETADA.md` - Detalle de cambios de configuración

### Archivos clave:
- `src/config.js` - Configuración centralizada
- `sql/schema.sql` - Esquema completo de base de datos
- `frontend/src/app/dashboard/page.js` - Dashboard principal (por refactorizar)

### URLs importantes:
- **n8n VPS:** http://127.0.0.1:5678 (interno)
- **PostgreSQL VPS:** localhost:5432 (cerrado al público)
- **Traefik VPS:** Puertos 80/443 públicos

---

## 🎯 CHECKLIST PARA OTRA IA

Si vas a continuar este proyecto en otra IA, verifica esto primero:

### ✅ Verificación inicial

- [ ] El proyecto está en `e:\Antigravity proyectos\plataforma-saas-academias`
- [ ] El backend usa `src/config.js` para configuración
- [ ] Todas las rutas usan `config.database` en lugar de `process.env` directo
- [ ] El frontend usa `NEXT_PUBLIC_API_URL` desde `.env.local`
- [ ] No hay `localhost` o `127.0.0.1` hardcodeados (excepto en `.env`)
- [ ] El esquema de base de datos está en `sql/schema.sql`
- [ ] Hay 13 rutas API en `src/routes/`
- [ ] El dashboard está en `frontend/src/app/dashboard/page.js`

### ✅ Pruebas de funcionamiento

- [ ] Backend arranca con `npm start` y muestra configuración
- [ ] Frontend arranca con `npm run dev` en puerto 3002
- [ ] http://127.0.0.1:3000/api/health responde "ok"
- [ ] http://127.0.0.1:3000/api/db-status conecta a PostgreSQL
- [ ] Login funciona con credenciales válidas
- [ ] Dashboard carga según el rol del usuario

### ✅ Próximas tareas (FASE 10-11)

- [ ] Auditoría del VPS (identificar proyecto viejo)
- [ ] Eliminar proyecto viejo de Nginx
- [ ] Cerrar puerto 5432 en firewall
- [ ] Crear Dockerfile.backend
- [ ] Crear Dockerfile.frontend
- [ ] Crear docker-compose.yml
- [ ] Configurar Traefik para routing
- [ ] Desplegar en VPS
- [ ] Verificar HTTPS automático con Let's Encrypt

---

## 📝 NOTAS ADICIONALES

### Decisiones de arquitectura:

1. **PostgreSQL fuera de Docker:** Ya estaba corriendo en el VPS, se decidió mantenerlo así para no migrar datos.

2. **n8n como webhook externo:** La IA de OMR depende de n8n. En producción, debería estar en la misma red Docker.

3. **Traefik como proxy principal:** Se eligió Traefik sobre Nginx porque ya está en el VPS y maneja HTTPS automático.

4. **Configuración centralizada:** Se creó `config.js` para evitar la dispersión de `process.env` en todos los archivos.

### Deuda técnica conocida:

1. **page.js muy grande (1014 líneas):** Necesita refactor urgente en módulos por rol.

2. **Exámenes.js depende de n8n:** Parte crítica del flujo está externalizada.

3. **Finanzas incompleto:** Faltan PDFs de boletas y reportes consolidados.

4. **Permisos no auditados:** No todas las rutas verifican correctamente los roles.

### Contexto del usuario:

- **No es técnico:** Está aprendiendo, necesita explicaciones claras
- **VPS en Hostinger:** KVM2 por 1 año (10 meses restantes)
- **Dominio:** Aún no reclamado, se usará IP temporalmente
- **Proyecto paralelo:** Tiene otro proyecto en el VPS que quiere eliminar

---

## 🚀 COMANDOS ÚTILES

### Desarrollo local

```bash
# Backend
cd "e:\Antigravity proyectos\plataforma-saas-academias"
npm start          # Producción
npm run dev        # Desarrollo con auto-reload

# Frontend
cd "e:\Antigravity proyectos\plataforma-saas-academias\frontend"
npm run dev        # Desarrollo
npm run build      # Build de producción
npm start          # Producción
```

### Túnel SSH (para conectar a PostgreSQL del VPS)

```bash
ssh -L 5433:127.0.0.1:5432 edusaas_admin@TU_VPS_IP -N
```

### Limpieza de procesos

```powershell
# Windows PowerShell
taskkill /F /IM node.exe
```

### Verificación de puertos

```powershell
# Ver qué está usando cada puerto
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :3002
```

---

## 📞 CONTACTO Y CONTEXTO

**Usuario:** Habla español, no es técnico, está aprendiendo.

**Proyecto:** Plataforma SaaS para academias pre-universitarias.

**Estado actual:** FASE 9 completada (configuración para producción).

**Próximo paso:** FASE 10 (limpieza de VPS) y FASE 11 (despliegue).

**VPS:** Hostinger KVM2 con Traefik, n8n y PostgreSQL corriendo.

**Dominio:** No reclamado aún, se usará IP temporalmente.

---

## ✨ RESUMEN FINAL

Este proyecto es un **SaaS multi-tenant funcional** con:
- ✅ 8 fases completadas de funcionalidad base
- ✅ Configuración lista para producción (FASE 9)
- ✅ Backend Node.js + Express con 13 rutas API
- ✅ Frontend Next.js + React con dashboard por roles
- ✅ PostgreSQL con 20+ tablas
- ✅ Integración con n8n para IA de OMR
- ✅ VPS listo para desplegar (Traefik + Docker)

**Lo que falta:**
- ⏳ Limpieza del VPS (FASE 10)
- ⏳ Despliegue en VPS (FASE 11)
- ⏳ Consolidación funcional (FASE 12)
- ⏳ Automatizaciones (FASE 13)
- ⏳ Documentación final (FASE 14)

**Tiempo estimado para completar:** 2-4 semanas trabajando parte tiempo.

---

**Documento creado:** 19 de marzo de 2026  
**Última actualización:** 19 de marzo de 2026  
**FASE actual:** 9 COMPLETADA  
**Próxima FASE:** 10 (Limpieza de VPS)
