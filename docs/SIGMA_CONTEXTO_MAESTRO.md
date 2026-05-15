# SIGMA — Contexto Maestro del Proyecto

**Sistema Integrado de Gestión y Marketing Académico**
Desarrollado por LB Systems — Bryan

**Última actualización:** 14 de mayo de 2026 — **v1.0.0 en producción con HTTPS**

**Estado VPS:** DESPLEGADO Y CORRIENDO CON HTTPS ✅

**Estado Producción:** ACTIVO — Pendiente onboarding de clientes piloto

**Clientes piloto:** Jireh, Círculo Matemático (pendiente onboarding)

**Próximo hito:** Test end-to-end OMR + onboarding primeros clientes (mayo 2026)

**URLs de producción verificadas (13/05/2026):**

| Servicio | URL | Estado |
|---|---|---|
| Frontend SIGMA | `https://sigma.srv1415334.hstgr.cloud` | ✅ activo |
| Backend API | `https://api.sigma.srv1415334.hstgr.cloud` | ✅ activo |
| n8n | `https://n8n.srv1415334.hstgr.cloud` | ✅ activo |
| NocoDB (Farmacia) | `https://db.srv1415334.hstgr.cloud` | ✅ activo |
| OMR service | `http://187.77.217.145:5000` (interno) | ✅ Up 3+ semanas |

**Características únicas implementadas:**

- ✅ **OMR nativo con OpenCV** — microservicio Python propio, sin dependencia de n8n
- ✅ **Bandeja de Exámenes Pendientes** — cuando falla la validación, no se pierden datos
- ✅ **OMR con tabla editable tipo casilleros** — corrección manual rápida
- ✅ **Dashboard ejecutivo Director** — gráficos de ingresos y rendimiento
- ✅ **Simulador de ingreso Alumno** — carreras objetivo con barra de progreso
- ✅ **Gamificación** — rachas de login, badges, ranking del salón

---

## 1. QUÉ ES SIGMA

Plataforma SaaS multi-tenant para academias preuniversitarias en Perú. Gestiona alumnos, exámenes, pagos, asistencia, marketing y CRM desde un solo lugar. Cada academia ve únicamente sus datos, nunca los de otra.

**Empresa:** LB Systems. Todas las instancias muestran en el footer: _Powered by LB Systems_.

**Modelo de negocio dual:**

- SaaS de gestión académica con suscripción mensual
- Agencia digital (LB Systems) que ofrece marketing, desarrollo y automatización — las academias de SIGMA son clientes naturales de la agencia

**Diferenciadores clave:**

1. **OMR con IA calibrado para Perú** — Lee exámenes físicos por foto y los califica automáticamente con las fórmulas exactas de San Marcos, UNI y Agraria. **Incluye corrección manual con tabla editable tipo casilleros.**
2. **Desglose por curso y grupo** — El alumno sabe exactamente en qué materia falló, no solo el puntaje total.
3. **Plataforma que avisa lo que va a pasar** — Alertas de deuda, alumnos en riesgo, ciclos que van mal antes de que terminen.
4. **Agencia integrada** — Marketing, automatización y gestión en un solo proveedor.
5. **Simulador de ingreso universitario** — El alumno ve su puntaje actual vs el requerido y su barra de progreso.
6. **Gamificación** — Rachas de login, badges de logros, ranking del salón.

---

## 2. ARQUITECTURA TÉCNICA

### Stack

| Capa                | Tecnología                                                        |
| ------------------- | ----------------------------------------------------------------- |
| Backend             | Express.js 5.x, Node.js, CommonJS (NO ES modules)                 |
| Base de datos       | PostgreSQL 15+                                                    |
| Auth                | JWT (jsonwebtoken) + bcryptjs                                     |
| Uploads             | Multer                                                            |
| Config              | dotenv + `src/config.js` centralizado — SIEMPRE usar este archivo |
| Frontend            | Next.js 16.x App Router, React 19+, Tailwind CSS                  |
| Estado frontend     | React hooks (useState, useEffect) — SIN Redux                     |
| API client          | Fetch nativo con función `apiUrl()` de `frontend/src/lib/api.js`  |
| Motor OMR (NUEVO)   | Microservicio Python (FastAPI + OpenCV) — puerto 5000 (interno)   |
| IA Automations      | n8n en Docker (puerto 5678) — Uso interno (Reemplazado para OMR)  |
| Proxy               | Traefik (pendiente configurar completo)                           |
| Validación imágenes | sharp (para el OMR)                                               |

### Puertos

| Servicio           | Puerto                            |
| ------------------ | --------------------------------- |
| Backend (Express)  | 3000                              |
| Frontend (Next.js) | 3001                              |
| Microservicio OMR  | 5000 (interno)                    |
| n8n                | 5678 (interno)                    |
| PostgreSQL         | 5432 en VPS / 5433 en túnel local |

### Arquitectura en el VPS

```
Internet
   │
   ├── :3000 → Contenedor Docker: Backend (Express.js)
   ├── :3001 → Contenedor Docker: Frontend (Next.js)
   ├── :5000 → Contenedor Docker: omr_service (Python + OpenCV)
   └── :5678 → Contenedor Docker: n8n (ya existía)

Host del VPS (fuera de Docker):
   └── PostgreSQL 16 — puerto 5432
       ├── Base de datos: edusaas_db
       └── Usuario: edusaas_admin

Los contenedores llegan a PostgreSQL vía: host.docker.internal → host-gateway
```

---

## 3. ESTRUCTURA DE CARPETAS

```
plataforma-saas-academias/
├── .env                          ← Variables de entorno (NO subir a Git)
├── .env.example                  ← Plantilla segura
├── .env.production               ← Variables para VPS
├── package.json
├── Dockerfile                    ← Corregido (no copia public/ que no existía)
├── docker-compose.yml            ← Corregido volumen uploads
├── src/
│   ├── config.js                 ← CONFIGURACIÓN CENTRAL (DB, JWT, URLs)
│   ├── index.js                  ← Entry point del backend
│   ├── middleware/
│   │   └── authMiddleware.js     ← JWT y verificación de roles
│   ├── migrations/
│   │   ├── 001_omr_fields.sql         ← Ejecutado 21/03/2026
│   │   ├── 002_comunicados.sql        ← Ejecutado 21/03/2026
│   │   ├── 003_comentarios_alumno.sql ← Ejecutado 22/03/2026
│   │   ├── 004_documentos_alumno.sql  ← Ejecutado 22/03/2026
│   │   ├── 005_lista_espera.sql       ← Ejecutado 22/03/2026
│   │   ├── 006_resumenes_semanales.sql← Ejecutado 22/03/2026
│   │   ├── 007_enforcement_permisos.sql ← Ejecutado 23/03/2026 (permisos por rol)
│   │   ├── 008_eventos_calendario.sql   ← Ejecutado 23/03/2026
│   │   ├── 009_configuracion_alertas.sql ← Ejecutado 23/03/2026
│   │   ├── 010_mejoras_roles.sql        ← Ejecutado 23/03/2026 (carreras, rachas, badges)
│   │   ├── 011_ciclos_extendidos.sql    ← Ejecutado 23/03/2026 (preparación/turno)
│   │   ├── 012_gestion_perfiles.sql     ← Ejecutado 23/03/2026 (cambio rol, eliminar)
│   │   └── 013_examenes_pendientes.sql  ← Ejecutado 23/03/2026 (bandeja de pendientes)
│   ├── jobs/
│   │   └── resumenSemanal.js     ← Cron dominical — genera resúmenes semanales por alumno
│   ├── utils/
│   │   └── pdfGenerator.js       ← Módulo generador de PDFs
│   └── routes/
│       ├── auth.js
│       ├── admin.js
│       ├── academic.js           ← +lista-espera, +documentos, +comentarios, +buscar
│       ├── alumnos.js            ← +historial, +PDF, +ranking, +resumen-semanal
│       ├── exams.js
│       ├── omr.js                ← Sistema OMR de dos colas
│       ├── crm.js
│       ├── director.js           ← +mapa-calor, +configurar
│       ├── secretaria.js         ← Incluye boleta PDF
│       ├── community.js
│       ├── marketing.js
│       ├── operations.js
│       ├── audit.js
│       └── public.js
├── frontend/
│   ├── .env.local
│   ├── next.config.mjs
│   └── src/
│       ├── lib/
│       │   └── api.js            ← API client centralizado
│       └── app/
│           ├── login/[slug]/page.js
│           ├── layout.js
│           ├── academia/[slug]/page.js  ← Landing pública por academia (nuevo)
│           └── dashboard/
│               ├── page.js              ← Dashboard principal (+wizard, +buscador, +nuevos tabs)
│               ├── AdminPanel.jsx
│               ├── AuditDashboard.jsx
│               ├── BandejaOMR.jsx       ← +modo degradado (entrada manual desde UI)
│               ├── BuscadorGlobal.jsx   ← Búsqueda Ctrl+K: alumnos, exámenes, pagos (nuevo)
│               ├── ControlAsistencia.jsx
│               ├── ControlDocumentos.jsx← Documentos por alumno para secretaría (nuevo)
│               ├── ComunicadosMasivos.jsx← Comunicados internos por salón (nuevo)
│               ├── CRM.jsx
│               ├── DirectorResumen.jsx
│               ├── FastInputConsole.jsx
│               ├── GestionAlumnos.jsx   ← +comentarios privados por alumno
│               ├── ImportarDatos.jsx
│               ├── ListaEspera.jsx      ← Lista de espera de prospectos (nuevo)
│               ├── MapaCalorSalon.jsx   ← Mapa calor rendimiento/asistencia por salón (nuevo)
│               ├── MarketingPanel.jsx
│               ├── MaterialDidactico.jsx
│               ├── OnboardingWizard.jsx ← Wizard 5 pasos para directores nuevos (nuevo)
│               ├── PlantillasManager.jsx
│               ├── PortalAlumno.jsx     ← +ranking del salón, +resúmenes semanales
│               └── ScannerIA.jsx
└── docs/
    ├── SIGMA_CONTEXTO_MAESTRO.md        ← Este archivo
    ├── DOCUMENTO_MAESTRO_PROYECTO.md
    ├── REPORTE_FUNCIONALIDADES_V1.md
    ├── FASE_9_COMPLETADA.md
    ├── IMPLEMENTACION_PDFS_HISTORIAL.md
    └── auditoria_proyecto_viejo_educational_dashboard.md
```

---

## 4. ESTADO ACTUAL DEL VPS (verificado 13/05/2026)

| Componente              | Estado                                                     |
| ----------------------- | ---------------------------------------------------------- |
| PostgreSQL 16           | ✅ Corriendo, configurado para aceptar Docker              |
| nginx                   | ✅ Dado de baja (`systemctl disable nginx`)                |
| Docker + Docker Compose | ✅ Instalado (v29.3 / v5.1)                                |
| Traefik + Let's Encrypt | ✅ Activo — HTTPS automático en todos los servicios        |
| n8n                     | ✅ Corriendo — `https://n8n.srv1415334.hstgr.cloud`        |
| Backend Docker          | ✅ Corriendo — `https://api.sigma.srv1415334.hstgr.cloud`  |
| Frontend Docker         | ✅ Corriendo — `https://sigma.srv1415334.hstgr.cloud`      |
| omr_service Docker      | ✅ Corriendo — puerto 5000 interno (Up 3+ semanas)         |
| NocoDB (Farmacia)       | ✅ Corriendo — `https://db.srv1415334.hstgr.cloud`         |

### Archivos que faltaban en el VPS y se crearon/copiaron (21-22/03/2026)

- `frontend/next.config.mjs` — necesario para `output: 'standalone'`
- `frontend/jsconfig.json` — necesario para el alias `@/*`
- `frontend/postcss.config.mjs` — necesario para Tailwind CSS
- `frontend/public/` — carpeta de assets estáticos (puede estar vacía)

### Firewall Hostinger — Puertos abiertos

| Puerto | Protocolo | Uso          |
| ------ | --------- | ------------ |
| 22     | TCP       | SSH          |
| 80     | TCP       | HTTP         |
| 443    | TCP       | HTTPS        |
| 3000   | TCP       | Backend API  |
| 3001   | TCP       | Frontend     |
| 8080   | TCP       | Uso anterior |

### Comandos útiles en el VPS

```bash
# Ver estado de los contenedores
cd /opt/edusaas && docker compose ps

# Ver logs del backend
docker compose logs backend --tail=50

# Ver logs del frontend
docker compose logs frontend --tail=50

# Rebuild completo sin caché (SIEMPRE --no-cache)
cd /opt/edusaas && docker compose build --no-cache && docker compose up -d

# Deploy con script (loguea en /opt/edusaas/backups/deploy.log)
bash /opt/edusaas/deploy.sh

# Logs en tiempo real
docker compose logs -f
```

### Crons activos en el VPS

| Hora         | Comando                                                   | Log                                |
| ------------ | --------------------------------------------------------- | ---------------------------------- |
| `0 2 * * *`  | `/opt/edusaas/backup.sh` — pg_dump, guarda 14 días        | `/opt/edusaas/backups/backup.log`  |
| `0 23 * * 0` | `node src/jobs/resumenSemanal.js` — resúmenes dominicales | `/opt/edusaas/backups/resumen.log` |
| `0 3 * * *`  | `node src/jobs/cleanupPdfs.js` — borra PDFs y scans +30 días | `/opt/edusaas/backups/cleanup.log` |

`/opt/edusaas/deploy.sh` — script de deploy manual/programable, loguea timestamp + resultado.

### Accesos y credenciales

| Qué                  | Valor                                              |
| -------------------- | -------------------------------------------------- |
| IP del VPS           | 187.77.217.145                                     |
| SSH                  | `ssh root@187.77.217.145`                          |
| PostgreSQL desde VPS | `psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db` |
| Backend              | http://187.77.217.145:3000                         |
| Frontend             | http://187.77.217.145:3001                         |
| n8n                  | http://187.77.217.145:5678                         |
| OMR secret           | sigma_omr_2026                                     |

### Cómo levantar en desarrollo local (tu PC)

```bash
# Terminal 1 — Túnel SSH a PostgreSQL del VPS
ssh -L 5433:127.0.0.1:5432 root@187.77.217.145 -N

# Terminal 2 — Backend
npm start   # desde c:\Users\USUARIO\Proyectos\SIGMA\

# Terminal 3 — Frontend
npm run dev  # desde c:\Users\USUARIO\Proyectos\SIGMA\frontend\
```

> **Nota migración:** El proyecto se migró de `e:\Antigravity proyectos\plataforma-saas-academias\` a `c:\Users\USUARIO\Proyectos\SIGMA\`. Docker Desktop no está instalado en local — todo corre en VPS. Para el OMR en local: conectar vía túnel SSH y llamar al servicio en VPS.

---

## 5. ROLES DEL SISTEMA

| Rol                  | Descripción                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `superadmin`         | Bryan. Control total. Ve todas las academias, todos los logs, impersonación de roles, CRM interno de la agencia con dos pipelines, panel de observabilidad en tiempo real. **Puede crear/desactivar cualquier usuario con cualquier rol.**    |
| `admin_soporte`      | Soporte técnico. Atiende tickets, ve logs de errores, impersona roles para diagnosticar. Sin acceso a información financiera. **Acceso: Mesa de Ayuda, Tickets, Inbox.**                                                                      |
| `soporte_comercial`  | Gestiona prospectos de nuevas academias en el CRM de la agencia. Sin acceso a datos internos de academias. **Solo CRM externo de la agencia.**                                                                                                |
| `agencia_marketing`  | Equipo LB Systems. Ve métricas de academias con permiso, gestiona campañas, CRM de la agencia con dos pipelines. **Acceso: Métricas con permiso, CRM agencia.**                                                                               |
| `director`           | Dueño/director de academia. Dashboard ejecutivo con gráficos de ingresos, retención, rendimiento por salón. Finanzas, auditoría anti-fraude, reportes. **Puede crear ciclos con preparación/turno (ej: San Marcos, Repaso, Mañana).**         |
| `secretaria`         | Gestión operativa. Home con tarjetas: deudores hoy, vencimientos 7d, lista espera, caja mes. Pagos, boletas PDF, documentos, comunicados. **Acceso rápido a acciones frecuentes.** Sin acceso a notas completas.                              |
| `profesor`           | Exámenes, OMR con **tabla editable tipo casilleros**, asistencia. **Vista de riesgo del salón:** semáforo de alumnos con asistencia <70% O notas <500. Historial de evaluaciones por alumno con curva de progreso.\*\* Corregir notas <24h.   |
| `tutor`              | Rol activable. Registra observaciones de seguimiento emocional y académico en sección privada del expediente. Crea sesiones de tutoría. **Alertas de rendimiento de sus tutorados.** Sin acceso a notas ni pagos.                             |
| `alumno`             | Portal personal, historial de exámenes, **simulador de ingreso universitario** (puntaje actual vs requerido), **gamificación** (rachas de login, badges, ranking del salón), progreso por curso, material sugerido, notificaciones semanales. |
| `marketing_academia` | Marketing interno de una academia específica. Herramientas de marketing, landing page, métricas de prospectos. Sin acceso a finanzas ni datos sensibles de alumnos.                                                                           |
| `padre`              | **Nuevo.** Ve resumen de su hijo: asistencia, deuda pendiente, próximos exámenes, últimas notas. **Alertas de inasistencia.** Historial de pagos y boletas.                                                                                   |

**Nota:** Todos los roles pueden ser creados/desactivados por el SuperAdmin desde el panel de usuarios. Los permisos son configurables por academia (enforcement implementado).

---

## 6. SISTEMA OMR NATIVO — COLA ANTI-COLAPSO (Actualizado 13/05/2026)

Se reemplazó la dependencia externa de n8n por un **Microservicio Nativo en Python (FastAPI + OpenCV)** y un diseño de **Hoja OMR Horizontal de 100 preguntas**.

### Estado actual del OMR (13/05/2026)

- ✅ `sigma-omr_service-1` corriendo en VPS (Up 3+ semanas, puerto 5000 interno)
- ✅ Health check respondiendo: `{"status":"ok","service":"OMR Service"}`
- ⚠️ **Hoja OMR aún no probada con impresión real** — pendiente test end-to-end
- 🔄 **Rediseño visual de la hoja en curso** — decisiones tomadas el 13/05/2026 (ver abajo)

### Formato definitivo de la hoja OMR — Decisiones 13/05/2026

Después de análisis y diseño, el formato quedó definido como **único y fijo**. No hay variantes configurables.

| Parámetro | Decisión | Razón |
| --- | --- | --- |
| Preguntas | Siempre 100, fijas | Si el examen tiene menos, el calificador ignora las no usadas |
| Opciones | Siempre A–E (5), fijas | Si el examen usa 4, se configura en el módulo calificador |
| Marcadores de esquina | Círculos negros rellenos (~9mm radio) | Más robustos que cuadrados ante fotos con ángulo/perspectiva |
| Código alumno | 8 dígitos (DNI peruano) | Grilla 8 columnas × 10 filas (0–9) |
| Logo academia | Opción C: logo si existe, nombre en texto si no | Profesional y flexible para todas las academias |
| Formato de página | A4 horizontal (landscape), fijo | Estándar impresoras peruanas |

### Cambios implementados ✅ (14/05/2026)

**`omr_constants.py`:**
- ✅ Radio marcadores de esquina: 6mm → **9mm** (más visibles para fotos de celular)

**`template_generator.py` — rediseño completo:**
- ✅ Paleta azul en cabeceras, etiquetas y separadores
- ✅ Franja azul sólida de 4mm en tope del header
- ✅ Barra azul de encabezados de columna con texto blanco ("1–25", "26–50", "51–75", "76–100")
- ✅ Letras A–E dentro de cada burbuja en azul medio
- ✅ Filas alternas con fondo azul pálido (en lugar de gris)
- ✅ Borde exterior azul en grilla y header

**`omr_engine.py`:**
- ✅ Nueva función `_select_by_quadrant()` — 1 candidato por cuadrante, evita falsos positivos
- ✅ Rango de área se ajusta automáticamente al nuevo `MARKER_R = 9mm`

**Backend Node.js (14/05/2026):**
- ✅ `GET /api/omr/template` — proxy autenticado que lee `nombre_academia` de BD y devuelve el PDF

**Pendiente:**
- [ ] `POST /api/admin/academias/:id/upload-logo` — endpoint de subida de logo con Multer
- `logo_url` ya existe en `academias` y en el PUT de admin; solo falta el file-upload

**Flujo logo completo (cuando se implemente):**
```
Director sube logo → public/uploads/logos/ → logo_url en BD
                              ↓
GET /api/omr/template → Node.js lee logo_url → envía al omr_service
                              ↓
              omr_service genera PDF con logo real (o nombre si no hay)
```

### Arquitectura Anti-Colapso (Worker en Node.js)
El sistema incluye un gestor interno de concurrencia que previene la saturación del servidor procesando las imágenes en segundo plano de manera autónoma:
1. El usuario (Profesor o Alumno) sube la placa fotográfica del examen.
2. El examen adquiere estado `en_cola` y el código del Backend avisa al Frontend sin trabarse.
3. Un **Worker Periódico** corre globalmente barriendo la tabla `resultados` y bloqueando por lotes (`FOR UPDATE SKIP LOCKED`).
4. Extrae un máximo de **3 imágenes concurrentes**, enviándolas por HTTP interno al contenedor `omr_service` (puerto 5000).
5. Python y OpenCV escanean la cuadrícula alineada con marcadores *fiducials* y devuelve las 100 burbujas leídas en un JSON ultrarrápido.
6. El Backend calcula la nota en subsegundos y el estado cambia a `revision_humana` o `confirmado` mostrando el semáforo al profesor.

### Flujos de Usuario Soportados

#### Flujo 1: Profesor sube lotes (Clásico)
El profesor captura las 100 fotos y las sube desde la Interfaz. Activa la "Cola IA" y el Worker destranca y procesa.

#### Flujo 2: Alumno -> Profesor (Nuevo)
El alumno imprime/llena su *Hoja OMR Horizontal*, y le toma foto subiéndola desde su Portal de Alumno por `/api/exams/alumno/subir-revision`. 
Esta subida cae directamente en la categoría **"Pendientes de Alumnos"** dentro de la *Bandeja OMR del Profesor*. El profesor simplemente valída visualmente la foto generada y presiona en "Cola IA" conectando el flujo al Worker principal.

### Endpoints Principales OMR y Backend

| Ruta                            | Método  | Descripción                                          |
| ------------------------------- | ------- | ---------------------------------------------------- |
| `/api/omr/subir`                | POST    | Profesor sube imagen, entra a estado `en_cola` o provisional. |
| `/api/exams/alumno/subir-revision`| POST  | Alumno sube hoja. Va a Bandeja Pendientes de Alumnos. |
| `/api/omr/procesar/:id`         | POST    | Dispara y asigna la foto al Worker (Anti-Colapso).   |
| `/api/omr/template`             | GET     | Descarga hoja OMR PDF personalizada con el nombre de la academia. |
| `/api/exams/pendientes/:id/enviar-ia` | POST | Reenvía un pendiente directo a la cola principal del OMR. |
| `http://omr_service:5000/api...`| POST    | (Interna) API Python de visión computacional pura.   |

### Correcciones post-confirmación

- Primeras 24h: el profesor puede editar con motivo obligatorio escrito
- Después de 24h: solo el director puede editar, también con motivo obligatorio
- La secretaria nunca toca notas
- Todo queda en `logs_auditoria`: quién cambió, cuándo, valor anterior, valor nuevo, motivo

### Límites por plan

| Plan    | Simultáneos | Escaneos/mes |
| ------- | ----------- | ------------ |
| Starter | 5           | 200          |
| Pro     | 15          | 500          |
| Academy | Sin límite  | Sin límite   |

Al llegar al 80% del límite mensual: alerta automática + oferta de upgrade.

### Correcciones post-confirmación

- Primeras 24h: el profesor puede editar con motivo obligatorio escrito
- Después de 24h: solo el director puede editar, también con motivo obligatorio
- La secretaria nunca toca notas
- Todo queda en `logs_auditoria`: quién cambió, cuándo, valor anterior, valor nuevo, motivo

---

## 7. MOTOR DE CÁLCULO

### Nivel 1 — Fórmulas universitarias predefinidas

San Marcos, UNI, Agraria, PUCP. El profesor selecciona la universidad, el sistema sabe cómo calcular. Cero configuración adicional.

### Nivel 2 — Fórmula personalizada simple

El profesor define cuánto suma una correcta, cuánto resta una incorrecta, qué pasa con las en blanco. Cubre el 90% de los casos fuera de universidades específicas.

### Nivel 3 — Fórmula avanzada

Expresión configurable que el director o profesor escribe una vez y queda como plantilla reutilizable.

### Estructura de cursos y grupos
La plantilla define qué preguntas pertenecen a qué curso y qué cursos forman cada grupo. El sistema soporta configuraciones extremas como **Las 5 Áreas de la Universidad Nacional Mayor de San Marcos (UNMSM)** mediante formato JSON:

- Mediante parámetros de rangos (`Inicio: 1, Fin: 10, Puntaje Exacto: +20`).
- Motor procesador `calcularNota()` de Node.js cuenta con soporte para áreas superpuestas y distribuciones complejas.
- **`seed_unmsm.js`**: El repositorio del proyecto incluye un script listo para insertar la matriz estructural de las 5 configuraciones oficiales (A, B, C, D, E) sumando los 100 puntos de manera matemática directamente hacia PostgreSQL.

El alumno ve: nota total, nota por grupo, nota por cada curso individual. Información accionable para saber dónde mejorar.

---

## 8. TABLAS PRINCIPALES (PostgreSQL)

| Tabla                     | Propósito                                                                      |
| ------------------------- | ------------------------------------------------------------------------------ |
| `academias`               | Multi-tenant, configuración, colores de marca                                  |
| `ciclos`                  | Ciclos académicos (ej: 2026-A)                                                 |
| `salones`                 | Salones por ciclo                                                              |
| `usuarios`                | Todos los roles                                                                |
| `examenes_plantillas`     | Plantillas con claves y fórmulas                                               |
| `resultados`              | Resultados calificados (incluye campos OMR nuevos)                             |
| `asistencias`             | Registro de asistencia                                                         |
| `pagos_crm`               | Pagos y deudas de alumnos                                                      |
| `crm_prospectos`          | Prospectos de ventas                                                           |
| `material_didactico`      | Material por academia/salón                                                    |
| `comunidad_publicaciones` | Publicaciones                                                                  |
| `comunidad_comentarios`   | Comentarios                                                                    |
| `comunidad_reacciones`    | Likes                                                                          |
| `foro_temas`              | Temas de foro                                                                  |
| `foro_respuestas`         | Respuestas de foro                                                             |
| `solicitudes_operativas`  | Tickets de soporte                                                             |
| `solicitud_mensajes`      | Mensajes en tickets                                                            |
| `catalogo_servicios`      | Servicios de marketing                                                         |
| `solicitudes_marketing`   | Solicitudes de academias                                                       |
| `sugerencias_buzon`       | Buzón de sugerencias                                                           |
| `logs_auditoria`          | Auditoría de acciones críticas                                                 |
| `academia_modulos`        | Módulos configurables por academia (add-ons)                                   |
| `alumnos_expedientes`     | Documentos de alumnos                                                          |
| `reportes_alumnos`        | Reportes de incidencia                                                         |
| `comunicados`             | Comunicados masivos por academia y salón (migración 002)                       |
| `comentarios_alumno`      | Notas privadas de profesor/secretaria en expediente del alumno (migración 003) |
| `documentos_alumno`       | Control de documentos por alumno: DNI, voucher, ficha, etc. (migración 004)    |
| `lista_espera`            | Prospectos en lista de espera con posición y estado (migración 005)            |
| `resumenes_semanales`     | Resúmenes semanales de rendimiento + asistencia por alumno (migración 006)     |

**Regla de oro:** TODAS las queries deben filtrar por `id_academia`. Nunca devolver datos de una academia a otra.

---

## 9. CONVENCIONES DE CÓDIGO OBLIGATORIAS

```javascript
// Siempre usar config.js para conexión a BD
const { pool } = require("../config");

// Siempre filtrar por academia en queries
const result = await pool.query("SELECT * FROM tabla WHERE id_academia = $1", [
  req.user.id_academia,
]);

// Siempre verificar token en rutas protegidas
router.get("/ruta", verifyToken, async (req, res) => {
  // req.user tiene: id, nombre, rol, id_academia
});

// Manejo de errores estándar
try {
  // lógica
} catch (error) {
  console.error("Error en [nombre]:", error);
  res.status(500).json({ error: "Error interno del servidor" });
}
```

---

## 10. ENDPOINTS API COMPLETOS

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Admin (superadmin)

- `GET /api/admin/stats`
- `GET/POST /api/admin/academias`
- `GET/POST /api/admin/usuarios`
- `GET /api/admin/inbox`
- `GET /api/admin/sugerencias`

### Académico

- `POST /api/academic/ciclos`
- `GET /api/academic/ciclos/:id_academia`
- `POST /api/academic/salones`
- `GET/POST /api/academic/asistencia`
- `GET /api/academic/asistencia/:id_salon`
- `POST /api/academic/sugerir`
- `GET/POST /api/academic/lista-espera` ← Prospectos en espera
- `PUT /api/academic/lista-espera/:id/estado` ← Promover/descartar
- `GET /api/academic/documentos/pendientes` ← Alumnos con docs faltantes
- `GET/POST /api/academic/alumnos/:id/documentos` ← Documentos por alumno
- `PUT /api/academic/alumnos/:id/documentos/:id_doc` ← Toggle estado doc
- `GET/POST /api/academic/alumnos/:id/comentarios` ← Notas privadas
- `GET /api/academic/buscar?q=` ← Búsqueda global (alumnos, exámenes, pagos)

### Exámenes

- `POST /api/exams/plantilla`
- `GET /api/exams/plantillas`
- `POST /api/exams/upload-foto` ← OMR legado (reemplazado por /api/omr)
- `POST /api/exams/confirmar-resultados`

### OMR (nuevo sistema de dos colas)

- `POST /api/omr/subir`
- `GET /api/omr/bandeja`
- `POST /api/omr/procesar/:id`
- `POST /api/omr/callback`
- `POST /api/omr/confirmar/:id`
- `POST /api/omr/manual/:id`

### Alumnos

- `GET /api/alumnos`
- `POST /api/alumnos/registrar`
- `PUT /api/alumnos/:id`
- `DELETE /api/alumnos/:id`
- `PUT /api/alumnos/:id/reactivar`
- `GET /api/alumnos/salones`
- `GET /api/alumnos/plantilla-csv` ← Descarga CSV modelo para importación masiva
- `POST /api/alumnos/importar` ← Importación masiva desde CSV (multipart)
- `GET /api/alumnos/:id_usuario/resultados` ← Historial de exámenes
- `GET /api/alumnos/:id_usuario/resultados/:id_resultado/pdf` ← PDF de resultado
- `GET /api/alumnos/:id_usuario/ranking` ← Posición del alumno en su salón (90 días)
- `GET /api/alumnos/:id_usuario/resumen-semanal` ← Últimos 4 resúmenes semanales

### CRM

- `GET/POST /api/crm/prospectos`
- `PATCH /api/crm/prospectos/:id/estado`
- `POST /api/crm/prospectos/importar`

### Director

- `GET /api/director/finanzas`
- `GET /api/director/deuda`
- `GET /api/director/salon/:id_salon/mapa-calor` ← Promedio nota + % asistencia por alumno
- `PUT /api/director/configurar` ← Actualizar nombre, logo, color de marca de la academia

### Secretaria

- `POST /api/secretaria/pagos`
- `GET /api/secretaria/pagos/:id/boleta-pdf` ← PDF de boleta (implementado)

### Comunidad

- `GET/POST /api/community/material`
- `DELETE /api/community/material/:id`
- `GET/POST /api/community/publicaciones`
- `DELETE /api/community/publicaciones/:id`
- `POST /api/community/publicaciones/:id/comentarios`
- `POST /api/community/publicaciones/:id/reaccionar`

### Marketing

- `GET /api/marketing/catalogo`
- `POST /api/marketing/solicitar`
- `GET /api/marketing/mis-solicitudes`

### Operaciones (tickets)

- `POST /api/operations/tickets`
- `GET /api/operations/tickets/mios`
- `GET /api/operations/tickets/:id`
- `POST /api/operations/tickets/:id/mensajes`
- `PUT /api/operations/tickets/:id/estado`

### Auditoría

- `GET /api/audit/logs`
- `POST /api/audit/log`

### Público (sin auth)

- `GET /api/public/academias`
- `GET /api/public/academias/:id`
- `GET /api/public/academias/slug/:slug`

---

## 11. PAQUETES Y PRECIOS SIGMA (Actualizado 13/05/2026)

> **Filosofía:** El motor OMR está en TODOS los planes. Los planes se diferencian por la profundidad del análisis, el acceso a funciones avanzadas y el límite de personal/alumnos. Precio único de implementación obligatorio en todos.

### Setup Fee (pago único al contratar)

- **Precio:** S/350 – S/500
- Cubre: configuración inicial, logo, colores, capacitación del equipo y carga de plantillas de examen
- Academias piloto (Jireh, Círculo Matemático): exoneradas del setup fee como condición de onboarding fundador

### Plan Básico — S/250 – S/290/mes

**Enfoque:** Digitalización y control operativo esencial.

**Personal incluido:** 1 Director, 1 Secretaria, 1 Profesor (fijo)
**Límite alumnos:** Hasta 100

**Motor OMR:**
- Calificación con fórmula genérica (puntos por correcta, incorrecta, blanco)
- Límite de escaneos mensual (contador visible en dashboard del Director)

**Reportes:** Notas totales únicamente

**Funciones desbloqueadas:**
- CRM de prospectos básico
- Control de asistencia
- Boletas PDF y gestión de pagos
- Portal del alumno (historial de exámenes, gamificación básica)
- Notificaciones básicas del sistema
- Soporte por tickets

**No incluye:** Fórmulas universitarias avanzadas, portal de padres, calendario, comunidad

---

### Plan Pro — S/490 – S/550/mes

**Enfoque:** Fidelización, análisis estructurado y comunicación con padres.

**Personal:** Escala según cantidad de alumnos
**Límite alumnos:** Hasta 300

**Motor OMR:**
- Fórmulas universitarias exactas: UNMSM (5 áreas A–E), UNI, Agraria, PUCP
- Límite de escaneos ampliado

**Reportes:** Desglose por grupos de cursos (Matemática, Ciencias, Letras, etc.)

**Funciones desbloqueadas (todo Básico más):**
- Portal de Padres — sin comparaciones entre alumnos, páginas independientes por hijo, alertas inteligentes
- Calendario académico y creación de eventos
- Comunicados/notificaciones institucionales (sin comunidad aún)
- Simulador de ingreso universitario
- Gamificación con medallas y tokens

**No incluye:** Comunidad, Biblioteca Digital, Mapa de Calor, análisis por curso específico

---

### Plan Ultimate — S/850 – S/990/mes

**Enfoque:** Analítica profunda, comunidad activa y retención predictiva.

**Personal:** Ilimitado
**Límite alumnos:** Ilimitado

**Motor OMR:**
- Todo el motor Pro más detección de anomalías por pregunta (alerta si una pregunta tiene <5% de aciertos en el salón → posible error en la clave)
- Escaneos ilimitados

**Reportes:** Análisis por curso específico (Álgebra, Geometría, Química Orgánica, etc.)

**Funciones desbloqueadas (todo Pro más):**
- Comunidad interna de la academia
- Biblioteca Digital de material didáctico
- Mapa de Calor del salón
- Centro de Retención anti-churn (alumnos con asistencia <60% + caída de notas en 2 simulacros consecutivos)
- Módulo Tutor activable
- Diplomas PDF automáticos al cierre de ciclo
- Soporte prioritario (<4h)

---

### Servicios de Marketing LB Systems — ⏳ Coming Soon

Disponible para todos los planes. En pausa por capacidad operativa.

| Pack | Precio |
| --- | --- |
| Pack Presencia Digital | S/350/mes |
| Pack Captación | S/500/mes |
| Pack Automatización | S/400/mes |
| Pack Completo Crecimiento | S/1,000/mes |
| Landing page personalizada | S/500–800 (proyecto) |
| Automatización a medida | S/600–1,200 (proyecto) |

### Estrategia de Precio Ancla (para el pitch comercial)

Mostrar la tabla con precios reales y ofrecer descuento de fundador a las primeras 3 academias:
- Plan Pro a S/350/mes de por vida (en vez de S/490–550)
- Exoneración del setup fee
- Esto crea un cliente comprometido con costo de cambio alto ("si me voy pierdo mi precio especial")

### Servicios de agencia contratables desde el panel del director

| Servicio                           | Precio                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Pack Presencia Digital             | S/350/mes (2 redes, 12 publicaciones, reporte mensual)                  |
| Pack Captación                     | S/500/mes (lo anterior + landing + CRM activo + estrategia)             |
| Pack Automatización                | S/400/mes (bot WhatsApp, respuestas automáticas, flujos de seguimiento) |
| Pack Completo Crecimiento          | S/1,000/mes (los 3 packs con descuento)                                 |
| Landing page personalizada         | S/500–800 (por proyecto)                                                |
| Sistema de automatización a medida | S/600–1,200 (por proyecto)                                              |
| Capacitación del equipo            | S/200/sesión de 2h                                                      |

**Formas de pago aceptadas:** Yape, transferencia bancaria, efectivo.

---

## 12. COSTOS FIJOS MENSUALES DE OPERACIÓN

| Concepto                 | Costo                            |
| ------------------------ | -------------------------------- |
| VPS Hostinger            | S/31/mes (~$8.33)                |
| Editor de código         | S/148/mes (~$40)                 |
| Canva Pro                | S/48/mes                         |
| Herramientas de video IA | S/37/mes (~$10) cuando se active |
| **Total costos fijos**   | **~S/264/mes**                   |

Rubén y Camila: variable según proyectos activos, sin costo fijo hasta consolidar ingresos.

---

## 13. PROYECCIÓN DE GANANCIAS

| Escenario                                          | Ingresos recurrentes | Ganancia neta |
| -------------------------------------------------- | -------------------- | ------------- |
| Mes 1 (Jireh + Círculo Matemático, con setup fees) | ~S/960               | —             |
| Mes 2 con esas 2 academias                         | S/560                | ~S/296/mes    |
| Con Círculo Matemático + Pack Presencia Digital    | S/910                | ~S/460/mes    |
| 5 academias en 3 meses                             | S/1,840              | ~S/1,140/mes  |
| 10 academias en 6 meses                            | S/4,410              | ~S/3,110/mes  |
| 20 academias en 1 año                              | S/9,550              | ~S/7,050/mes  |

---

## 14. ESTADO DE FUNCIONALIDADES POR MÓDULO

| Módulo                                         | Estado          | %    |
| ---------------------------------------------- | --------------- | ---- |
| Autenticación                                  | ✅ Completo     | 100% |
| Dashboard por roles                            | ✅ Completo     | 100% |
| Gestión Académica                              | ✅ Completo     | 95%  |
| Exámenes OMR + IA (dos colas + tabla editable) | ✅ Implementado | 95%  |
| Asistencia                                     | ✅ Completo     | 90%  |
| CRM Prospectos                                 | ✅ Completo     | 90%  |
| Comunidad                                      | ✅ Funcional    | 85%  |
| Material Didáctico                             | ✅ Funcional    | 85%  |
| Finanzas/Pagos + PDF boletas                   | ✅ Implementado | 85%  |
| Historial de resultados + PDF                  | ✅ Implementado | 95%  |
| Tickets Soporte                                | ✅ Completo     | 90%  |
| Auditoría                                      | ✅ Completo     | 95%  |
| Panel Superadmin (todos los roles)             | ✅ Completo     | 100% |
| Comunicados masivos                            | ✅ Implementado | 90%  |
| Control de documentos (secretaría)             | ✅ Implementado | 85%  |
| Lista de espera                                | ✅ Implementado | 90%  |
| Mapa de calor del salón                        | ✅ Implementado | 90%  |
| Modo degradado OMR (entrada manual)            | ✅ Implementado | 95%  |
| Landing pública por academia                   | ✅ Implementado | 85%  |
| Resumen semanal automático (cron)              | ✅ Implementado | 95%  |
| Portal alumno — ranking + resúmenes            | ✅ Implementado | 90%  |
| Búsqueda global Ctrl+K                         | ✅ Implementado | 90%  |
| Onboarding wizard para directores              | ✅ Implementado | 90%  |
| Notas privadas por alumno                      | ✅ Implementado | 85%  |
| Backup automático nocturno (pg_dump)           | ✅ Implementado | 100% |
| Importación masiva de alumnos (CSV)            | ✅ Implementado | 95%  |
| Exportar padrón a CSV desde GestionAlumnos     | ✅ Implementado | 100% |
| Script de deploy nocturno (`deploy.sh`)        | ✅ Implementado | 100% |
| **Home operativo Secretaria**                  | ✅ **NUEVO**    | 90%  |
| **Vista de riesgo Profesor**                   | ✅ **NUEVO**    | 90%  |
| **Simulador de ingreso Alumno**                | ✅ **NUEVO**    | 90%  |
| **Gamificación (rachas + badges)**             | ✅ **NUEVO**    | 85%  |
| **Dashboard ejecutivo Director**               | ✅ **NUEVO**    | 95%  |
| **Ciclos con preparación/turno**               | ✅ **NUEVO**    | 95%  |
| **Enforcement de permisos**                    | ✅ **NUEVO**    | 100% |
| **Rol Padre de familia**                       | ✅ **NUEVO**    | 85%  |

**Estado Producción:** LISTO PARA LANZAMIENTO PÚBLICO 🎉

---

## 15. DEUDA TÉCNICA ACTIVA

### Crítico (bloquea onboarding de clientes)

- [ ] **Test end-to-end del OMR** — nunca se ha probado con una hoja impresa real. Antes del onboarding hay que imprimir la hoja, fotografiarla y confirmar que el motor detecta correctamente.
- [x] **Rediseño visual de la hoja OMR** ✅ 14/05/2026 — `omr_constants.py` (9mm), `template_generator.py` (azul), `omr_engine.py` (quadrant selection)
- [x] **Endpoint proxy template OMR** ✅ 14/05/2026 — `GET /api/omr/template` en Node.js lee academia de BD y devuelve PDF
- [x] **Seguridad `app.py`** ✅ 14/05/2026 — validación de extensión + límite 20 MB
- [x] **Limpieza automática de PDFs** ✅ 14/05/2026 — `src/jobs/cleanupPdfs.js` (PDFs y scans +30 días)
- [ ] **Endpoint upload de logo de academia** — `POST /api/admin/academias/:id/upload-logo`. El campo `logo_url` ya existe en BD y en el PUT, solo falta el endpoint de file upload con Multer.

### Alto (importante pero no bloquea)

- [x] ~~**Frontend Docker:** Build falla por caché~~ — resuelto 21/03/2026
- [x] ~~**Backend Docker:** Pendiente de levantar~~ — corriendo con HTTPS
- [x] ~~**Backup automático**~~ — `/opt/edusaas/backup.sh` + cron `0 2 * * *`, 14 días
- [x] ~~**Auditoría de permisos**~~ — 5 bugs cross-tenant corregidos 22/03/2026
- [x] ~~**Rate limiting**~~ — `express-rate-limit` activo
- [x] ~~**Enforcement de permisos**~~ — implementado 23/03/2026
- [ ] **Refactor de `dashboard/page.js`** — ~1000 líneas, difícil de mantener. NO BLOQUEA.
- [ ] **Validación de input** — sanitización pendiente en algunos endpoints. NO BLOQUEA.
- [ ] **Retry/timeout OMR worker** — máx 3 concurrentes, retry x2, timeout 30s. Para V1.1.

### Pendiente limpieza VPS (no urgente)

- [ ] Identificar y eliminar carpeta del proyecto viejo en `/var/www/`
- [ ] Revisar y eliminar workflows viejos de n8n
- [ ] Cerrar puerto 5432 en firewall del VPS
- [ ] Verificar si hay datos demo del proyecto viejo en la BD actual

### Mejoras estéticas (post-lanzamiento)

- [ ] Pulir colores y espaciados en algunos componentes
- [ ] Animaciones de transición más suaves
- [ ] Modo oscuro/claro consistente en toda la app

---

## 16. ROADMAP COMPLETO

### ✅ 23 de marzo de 2026 — V1.0.0 RC (LISTO PARA PRODUCCIÓN) 🎉

**Funcionalidades completas:**

- ✅ Todos los roles configurables (11 roles: superadmin, admin_soporte, soporte_comercial, agencia_marketing, director, secretaria, profesor, tutor, alumno, marketing_academia, padre)
- ✅ Enforcement de permisos por academia
- ✅ OMR con tabla editable tipo casilleros
- ✅ Dashboard ejecutivo Director (gráficos de ingresos, retención, rendimiento por salón)
- ✅ Home operativo Secretaria (deudores, vencimientos, lista espera, caja)
- ✅ Vista de riesgo Profesor (semáforo asistencia/notas)
- ✅ Simulador de ingreso Alumno (carreras objetivo, barra de progreso)
- ✅ Gamificación (rachas de login, badges, ranking)
- ✅ Ciclos con preparación/turno (San Marcos, Repaso, Mañana, etc.)
- ✅ Boletas PDF
- ✅ Historial de resultados con PDF
- ✅ Backup automático
- ✅ Deploy automático
- ✅ Multi-tenant seguro

**Próximos pasos (post-lanzamiento):**

1. Onboarding de Jireh y Círculo Matemático (1-2 semanas)
2. Recoger feedback (2-4 semanas)
3. Iterar rápido en base a lo que digan los clientes
4. Escalar a más academias (mes 2-3)

### Mayo 2026 — Pre-onboarding (crítico antes de Jireh y Círculo Matemático)

1. ✅ VPS corriendo con HTTPS (Traefik + Let's Encrypt)
2. ✅ OMR service activo (3+ semanas de uptime)
3. [x] **Rediseño visual hoja OMR** ✅ — `template_generator.py` (azul), `omr_constants.py` (9mm), `omr_engine.py` (quadrant)
4. [x] **Proxy template + seguridad OMR** ✅ — `GET /api/omr/template`, validación extensión/tamaño, cleanup PDFs
5. [ ] **Endpoint upload logo** — `POST /api/admin/academias/:id/upload-logo`
6. [ ] **Test end-to-end** — imprimir hoja, fotografiar, procesar, confirmar resultado
6. [ ] Onboarding Academia Jireh
7. [ ] Onboarding Círculo Matemático

### Mes 2 — V1.1 (retención y mejoras)

- Motor de alertas de deuda escalonadas (pendiente)
- Límites OMR por plan + alertas al 80% (pendiente)
- Análisis de errores por pregunta (pendiente)
- Semáforo de cursos por alumno 🟢🟡🔴 (pendiente)
- Ciclo de vida completo del alumno (pendiente)
- Google Vision API como motor OMR principal (pendiente)
- Notificaciones in-app (campana en el header) (pendiente)
- Importación con validación visual previa (pendiente)
- **Retry/timeout n8n** (pendiente - único crítico restante)

### Mes 3 — V1.2 (expansión de features)

- Plantillas de examen reutilizables entre ciclos
- Mapa de calor académico para el director
- Calendario individual por usuario
- Eventos por academia con aislamiento completo por tenant
- Sistema de rachas de uso (gamificación ligera) - ✅ Implementado
- CRM interno de la agencia con dos pipelines
- Subroles de soporte técnico y comercial

### Mes 4-5 — V1.3 (monetización)

- Módulo tutor activable - ✅ Implementado
- Portal para padres como add-on - ✅ Implementado
- PWA mobile-first para alumnos (next-pwa)
- Reporte post-examen automático para padres
- Gamificación del campus (puntos, badges, ranking) - ✅ Implementado
- Calendario académico con eventos compartibles (FullCalendar.js)
- Simulador de vacantes — "Estás a 250 puntos de Enfermería UNI" - ✅ Implementado
- Notificaciones por email automáticas (Resend — 3,000/mes gratis)
- Servicios de agencia contratables desde el panel del director
- Panel de observabilidad del superadmin con impersonación de roles
- Sistema de referidos formalizado (1 mes gratis al referir)
- Demos automatizadas para captación

### Mes 5-6 — V2.0 (escala)

- Banco de preguntas universitarias como add-on
- Certificados digitales de simulacro con QR de verificación
- Add-ons activables con facturación integrada
- Exportación a Excel en todos los módulos
- Bots de WhatsApp para academias (Pack Automatización)
- Analytics avanzado para Plan Academy

### Mes 6+ — V3.0 (liderazgo de mercado)

- IA predictiva de abandono de alumnos (regresión logística con datos propios)
- Score académico por alumno (notas 40% + asistencia 30% + tendencia 30%)
- Mega-simulacro nacional multi-academia (ranking interacademia anónimo)
- Marketplace de simulacros entre academias (comisión 20-30%)
- Banco de preguntas preuniversitario peruano (activo de datos único)
- Automatización financiera con pasarelas (MercadoPago o Niubiz)
- Financiamiento de matrículas (modelo fintech, alianza con fintech peruana)
- API pública para academias con equipo técnico propio

---

## 17. ÁREA LEGAL

### Propiedad intelectual

El código es de Bryan desde que fue creado. El historial de commits en GitHub con fechas es evidencia de autoría suficiente por ahora.

### Nombre SIGMA

Pendiente de verificación en Indecopi: https://pi.indecopi.gob.pe/buscatumarca/
Buscar en clases 42 (software y tecnología) y 41 (servicios educativos).
Costo para MYPE con RUC: S/401.24 por clase. Plazo: 40-45 días hábiles sin oposición.
Iniciar registro cuando haya ingresos consistentes.

### Dominio

Verificar disponibilidad de `sigma.pe`, `sigmaacad.pe` o `getsigma.pe`.
Dominio .pe: ~S/80/año.

### Documentos que debe redactar la abogada

1. **Términos de Servicio:** SIGMA es propiedad de Bryan, las academias tienen licencia de uso. Los datos de la academia son suyos pero Bryan los almacena y protege. Período de gracia para exportar datos si dejan de pagar. Prohibición de copiar o replicar el sistema.
2. **Política de Privacidad:** Cumplimiento con Ley 29733 de Protección de Datos Personales del Perú.
3. **Acuerdo de cesión de derechos:** Para Rubén, Camila y cualquier colaborador — el trabajo producido para SIGMA pertenece al negocio.

### Estructura legal actual

Opera con RUC 10 de persona natural. Emite recibos por honorarios o facturas electrónicas desde SUNAT. Evaluar constituir EIRL o SAC cuando se llegue a S/3,000–4,000/mes consistentes.

### Confirmación de trato con academias (sin contrato formal)

Siempre enviar por WhatsApp: plan, precio, forma de pago y fecha de primer cobro. Es evidencia escrita suficiente para el inicio.

---

## 18. FRONTEND — PÁGINAS Y COMPONENTES DEL DASHBOARD

Todas las páginas viven en `frontend/src/app/dashboard/`. El enrutamiento entre componentes lo maneja `page.js` mediante un estado `activeTab`. La autenticación usa JWT guardado en `localStorage` bajo la clave `edusaas_token`.

### Convenciones del frontend

- API: `apiUrl()` de `@/lib/api` — NUNCA hardcodear URLs del backend
- Estado: React hooks (`useState`, `useEffect`) — sin Redux ni Zustand
- Tema: Dark/Light mode global manejado desde `page.js`
- Carga dinámica: `dynamic()` de Next.js con `ssr: false` para componentes pesados
- `req.usuario` en JWT tiene: `id_usuario`, `nombre_completo`, `rol`, `id_academia`

---

### page.js — Enrutador y Shell del Dashboard

**Roles:** Todos
**Descripción:** Componente raíz del dashboard. Controla qué pestaña/vista está activa y renderiza el componente correspondiente. Contiene el menú lateral dinámico (distinto por rol), el botón de tema Dark/Light, y el modal del Buzón de Sugerencias.

**Funciones:**

- Menú lateral adaptado a cada rol (superadmin ve todo, alumno ve solo su portal)
- Modal "Buzón de Sugerencias" disponible para cualquier usuario logueado
- Carga de estadísticas globales al inicio (solo superadmin)
- Carga de configuración/colores de la academia activa
- Ctrl+K abre `BuscadorGlobal` modal (no alumnos)
- Auto-muestra `OnboardingWizard` cuando el director no tiene ciclos creados
- Botones sidebar: Comunicados (profesor/director/secretaria), Mapa calor (profesor/director), Documentos (secretaria), Lista espera (secretaria), Configurar academia (director)

**Endpoints:** `GET /api/admin/stats`, `GET /api/public/academias/id/:id`, `POST /api/academic/sugerir`, `GET /api/academic/ciclos/:id_academia`

---

### AdminPanel.jsx — Panel del Superadmin

**Roles:** superadmin, soporte_tecnico (modo lectura)
**Descripción:** Centro de control total de la plataforma. Permite gestionar todas las academias, usuarios, módulos activos, mensajes entrantes y tickets de soporte.

**Pestañas:**

- **Overview:** Estadísticas globales (academias activas, alumnos totales, exámenes procesados)
- **Academias:** Crear/editar academias, configurar colores de marca, habilitar/deshabilitar módulos add-on por academia
- **Usuarios:** Crear/editar usuarios de cualquier academia con cualquier rol
- **Inbox:** Mensajes y sugerencias enviadas por usuarios de cualquier academia
- **Tickets:** Sistema de soporte — ver tickets abiertos, responder mensajes

**Endpoints:** `GET /api/admin/stats`, `GET /api/admin/academias`, `GET /api/admin/usuarios`, `POST /api/admin/academias`, `POST /api/admin/usuarios`, `PUT /api/admin/usuarios/:id`, `GET /api/admin/inbox`, `GET /api/operations/tickets/mios`, `GET /api/operations/tickets/:id`, `POST /api/operations/tickets/:id/mensajes`, `GET|PUT /api/admin/academias/:id/modulos`

---

### BandejaOMR.jsx — Bandeja OMR del Profesor (Cola de Escaneo)

**Roles:** superadmin, director, profesor
**Descripción:** Interfaz completa del sistema OMR de dos colas. El profesor sube fotos de exámenes, las manda a procesar con IA, y confirma (o corrige) los resultados detectados.

**Flujo UI:**

1. **Cola 1 — Subir foto:** Formulario con selector de examen (código), campo de alumno (opcional), y upload de imagen. La foto pasa validación de calidad antes de entrar a la cola.
2. **Bandeja:** Tabla con todos los exámenes en estados `en_cola`, `procesando`, `revision_humana`, `error_reintentar`. Muestra nombre del alumno, fecha, estado con color, confianza de la IA.
3. **Cola 2 — Procesar con IA:** Botón "Procesar" → backend envía a n8n en background → estado cambia a `procesando`. Auto-refresh cada 8 segundos.
4. **Revisión humana:** Modal con imagen original + grilla de respuestas detectadas por pregunta. Cada respuesta muestra confianza (verde ≥85% / amarillo 70–85% / rojo <70%). El profesor puede corregir respuestas individualmente antes de confirmar.
5. **Confirmar:** Botón "Confirmar" → motor de cálculo → nota guardada en BD.
6. **Modo manual:** Si n8n falla, el profesor puede ingresar respuestas manualmente para que pasen por el mismo flujo de revisión y confirmación.

**Endpoints:** `GET /api/omr/bandeja`, `POST /api/omr/subir`, `POST /api/omr/procesar/:id`, `POST /api/omr/confirmar/:id`, `POST /api/omr/manual/:id`, `GET /api/exams/plantillas`, `GET /api/alumnos`

---

### PlantillasManager.jsx — Gestor de Plantillas de Examen

**Roles:** superadmin, director, profesor
**Descripción:** Permite crear y listar plantillas de examen (llamadas "simulacros"). Una plantilla define el código del examen, las claves correctas por pregunta, la fórmula de calificación y la estructura de cursos/áreas.

**Pasos para crear plantilla:**

1. Código único del examen (ej: `SM-2026-A`)
2. Nombre público del simulacro
3. Tipo de calificación: predefinido (uni, san marcos) o personalizado
4. Claves correctas por pregunta (A–E para cada número)
5. Configuración de áreas/cursos: nombre, rango de preguntas, puntos por acierto/error/blanco

**Endpoints:** `GET /api/exams/plantillas`, `POST /api/exams/plantilla`

---

### GestionAlumnos.jsx — Padrón de Alumnos

**Roles:** superadmin, director, secretaria
**Descripción:** CRUD completo del padrón de alumnos de la academia. Muestra tabla con nombre, contacto, salón/ciclo y estado. Permite matricular nuevos alumnos, editar datos, desactivar y reactivar.

**Funciones:**

- Tabla de alumnos con búsqueda/filtro
- Modal "+ Matricular Alumno": nombre, email, contraseña inicial, salón
- Modal edición: mismos campos
- Botón desactivar / reactivar por alumno
- Botón "Notas" (amber) — abre modal de comentarios privados del alumno con historial de notas y campo para agregar nueva

**Endpoints:** `GET /api/alumnos`, `GET /api/alumnos/salones`, `POST /api/alumnos/registrar`, `PUT /api/alumnos/:id`, `DELETE /api/alumnos/:id`, `PUT /api/alumnos/:id/reactivar`, `GET /api/academic/alumnos/:id/comentarios`, `POST /api/academic/alumnos/:id/comentarios`

---

### ControlAsistencia.jsx — Registro de Asistencias

**Roles:** superadmin, director, secretaria, profesor
**Descripción:** Tomar lista del día y consultar historial de asistencias por salón. Dos modos: diaria (marcar hoy) e historial (consultar fecha anterior).

**Funciones:**

- Selector de salón
- Tabla de alumnos con toggle presente / ausente / tardanza
- Botón "Guardar asistencia del día"
- Vista historial: selector de fecha + tabla de resultados con validaciones

**Endpoints:** `GET /api/alumnos?id_salon=:id`, `GET /api/academic/asistencias/salon/:id/fecha/:fecha`, `POST /api/academic/asistencias`

---

### GestionPagos.jsx — Pagos y Boletas

**Roles:** secretaria, director
**Descripción:** Registrar cobros, ver estado de pagos por alumno y descargar boletas PDF. Incluye métricas de cobrado, pendiente y total de movimientos.

**Funciones:**

- Métricas: Total cobrado / Deuda pendiente / Movimientos del mes
- Tabla de movimientos: alumno, concepto, vencimiento, monto, estado (pagado/pendiente)
- Modal "Registrar pago": alumno, concepto, monto, fecha, método
- Botón descarga PDF por cada pago confirmado

**Endpoints:** `GET /api/secretaria/pagos/resumen`, `POST /api/secretaria/pagos`, `GET /api/secretaria/pagos/:id/boleta-pdf`

---

### DirectorResumen.jsx — Resumen Financiero del Director

**Roles:** director, secretaria
**Descripción:** Vista ejecutiva de las finanzas de la academia. Muestra las tres métricas clave: ingresos, deuda y potencial de marketing. Incluye tabla de últimos movimientos con acceso directo a boletas PDF.

**Funciones:**

- Cards: Ganancias Totales / Deuda Pendiente / Potencial Marketing
- Tabla de últimos cobros con estado (pagado / pendiente)
- Descarga de boleta PDF desde la tabla
- Acceso rápido a oportunidades de servicios de agencia

**Endpoints:** `GET /api/director/finanzas`, `GET /api/secretaria/pagos/:id/boleta-pdf`

---

### CRM.jsx — CRM de Prospectos

**Roles:** director, secretaria
**Descripción:** Tablero Kanban para gestionar prospectos de nuevos alumnos. Cuatro columnas: Nuevo → Contactado → Convertido → Perdido. Permite crear, editar y mover prospectos entre estados.

**Funciones:**

- Tablero Kanban de 4 columnas con conteo por estado
- Modal "Nuevo prospecto": nombre, teléfono, email, ciclo de interés, fuente, observaciones
- Edición de prospecto existente
- Cambio de estado con botones

**Endpoints:** `GET /api/crm/prospectos`, `POST /api/crm/prospectos`, `PUT /api/crm/prospectos/:id`, `PATCH /api/crm/prospectos/:id/estado`

---

### MaterialDidactico.jsx — Comunidad y Material

**Roles:** Todos (alumno solo lectura y reacciones)
**Descripción:** Hub de contenido de la academia. Dos pestañas: Comunidad (publicaciones tipo red social interna) y Material Didáctico (recursos educativos: PDFs, videos, links).

**Funciones:**

- Pestaña **Comunidad:** crear publicaciones, dar like, comentar, eliminar las propias
- Pestaña **Material:** subir y listar recursos por categoría/salón
- Moderación total para superadmin/soporte (eliminar cualquier contenido)

**Endpoints:** `GET|POST /api/community/publicaciones`, `DELETE /api/community/publicaciones/:id`, `POST /api/community/publicaciones/:id/reaccionar`, `POST /api/community/publicaciones/:id/comentarios`, `GET|POST /api/community/material`, `DELETE /api/community/material/:id`

---

### ScannerIA.jsx — Escáner IA (flujo alternativo)

**Roles:** superadmin, director, profesor
**Descripción:** Flujo alternativo de procesamiento OMR (pre-sistema de dos colas). Sube foto directamente a n8n via `exams.js`, recibe respuestas en la misma llamada y califica sin bandeja. Incluye modo de ingreso manual.

> **Nota:** Este componente usa el workflow `vision-ia-scanner` de n8n (síncrono). El sistema moderno es `BandejaOMR.jsx` con el workflow `procesar-examen` (asíncrono con cola). Ambos coexisten.

**Funciones:**

- Upload de foto → procesamiento síncrono → mostrar respuestas detectadas
- Monitor de aciertos/errores/blancos/puntaje en tiempo real
- Modo manual: seleccionar plantilla + ingresar cadena de respuestas
- Confirmar y guardar en BD

**Endpoints:** `POST /api/exams/upload-foto`, `GET /api/exams/plantillas`, `POST /api/exams/confirmar-resultados`

---

### FastInputConsole.jsx — Consola de Ingreso Rápido

**Roles:** superadmin, director, profesor
**Descripción:** Interfaz de digitación rápida para ingresar respuestas de múltiples alumnos en serie (sin imagen). El profesor digita el código de alumno y la cadena de respuestas; el sistema calcula nota en tiempo real y guarda.

**Funciones:**

- Campo de búsqueda de alumno por DNI/código
- Campo de respuestas (cadena tipo "ABCDE...") con cálculo automático
- Monitor: aciertos, errores, blancos, nota proyectada, desglose por área
- Botón "Confirmar y Siguiente" para flujo en lote

**Endpoints:** `POST /api/exams/confirmar-resultados`

---

### MarketingPanel.jsx — Servicios de Agencia

**Roles:** director
**Descripción:** Catálogo de servicios de marketing de LB Systems contratables desde el panel. El director puede ver los packs disponibles, solicitar uno y hacer seguimiento de sus solicitudes.

**Funciones:**

- Catálogo de servicios con descripción y precio (Pack Presencia, Captación, Automatización, Completo)
- Modal para solicitar servicio con detalles adicionales
- Tabla de mis solicitudes activas con estado y presupuesto

**Endpoints:** `GET /api/marketing/catalogo`, `POST /api/marketing/solicitar`, `GET /api/marketing/mis-solicitudes`

---

### ImportarDatos.jsx — Importación Masiva de Alumnos

**Roles:** superadmin, director, secretaria
**Descripción:** Permite importar múltiples alumnos desde un archivo CSV. Muestra preview de los primeros 10 registros, detecta duplicados automáticamente y ejecuta la importación en lote.

**Funciones:**

- Upload de archivo CSV
- Preview de primeras 10 filas con validación de columnas
- Detección de duplicados por DNI/email
- Selección de salón de destino
- Botón importar con feedback de éxito/error por registro

**Endpoints:** `GET /api/alumnos/salones`, `POST /api/crm/importar-alumnos`

---

### AuditDashboard.jsx — Auditoría de Acciones

**Roles:** superadmin, soporte_tecnico
**Descripción:** Tabla de logs de auditoría en tiempo real. Registra todas las acciones críticas del sistema: eliminaciones, cambios de nota, modificaciones de pagos, bloqueos de usuarios.

**Funciones:**

- Tabla: Fecha/Hora, Usuario, Acción, Academia, Detalles, IP
- Iconos de color por tipo de acción (rojo = eliminación, azul = modificación)
- Filtrado por tipo de acción

**Endpoints:** `GET /api/audit/logs`

---

### PortalAlumno.jsx — Portal del Estudiante

**Roles:** alumno
**Descripción:** Vista personal del alumno. Muestra el examen activo disponible para tomar, historial de resultados anteriores con gráficas de progreso, y descarga de comprobantes individuales.

**Funciones:**

- Card del examen activo con estado (en curso / cerrado / sin examen)
- Upload de foto del examen respondido con validación de calidad
- Historial de resultados: nota, fecha, desglose por cursos
- Gráficas de progreso (AreaChart, BarChart con Recharts)
- Descarga PDF del resultado individual
- Consejos para mejorar precisión del escaneo
- **Ranking del salón:** posición del alumno, promedio propio vs promedio salón, barra circular SVG mostrando "top X%"
- **Resúmenes semanales:** hasta 4 cards con promedio, exámenes tomados, asistencia, posición en ranking y mensaje motivacional de esa semana

**Endpoints:** `GET /api/exams/alumno/examen-activo`, `GET /api/alumnos/:id/resultados`, `POST /api/exams/upload-foto`, `GET /api/alumnos/:id/resultados/:id_resultado/pdf`, `GET /api/alumnos/:id/ranking`, `GET /api/alumnos/:id/resumen-semanal`

---

### OnboardingWizard.jsx — Asistente de Configuración Inicial

**Roles:** director
**Descripción:** Wizard de 5 pasos que aparece automáticamente cuando un director nuevo no tiene ciclos creados. También accesible desde "Configurar academia" en el sidebar.

**Pasos:**

1. Datos de la academia (nombre)
2. Branding (logo URL + color primario con presets + color picker)
3. Ciclo y salones (crea el primer ciclo y hasta 3 salones)
4. Primer usuario staff (opcional, skippable)
5. ¡Listo! — próximos pasos y botón "Ir al dashboard"

**Endpoints:** `PUT /api/director/configurar`, `POST /api/academic/ciclos`, `POST /api/academic/salones`, `POST /api/admin/usuarios`

---

### BuscadorGlobal.jsx — Búsqueda Global

**Roles:** superadmin, director, secretaria, profesor
**Descripción:** Modal de búsqueda unificada. Se abre con Ctrl+K o botón en el header. Devuelve resultados de alumnos, exámenes y pagos con navegación por teclado (↑↓ Enter Esc).

**Funciones:**

- Debounce 280ms, mínimo 2 caracteres
- 3 categorías: Alumnos (🎓), Exámenes (📋), Pagos (💰)
- Teclado: ↑↓ navegan, Enter abre, Esc cierra
- `onNavigate(tab, item)` cambia el tab activo en el dashboard

**Endpoints:** `GET /api/academic/buscar?q=`

---

### MapaCalorSalon.jsx — Mapa de Calor del Salón

**Roles:** superadmin, director, profesor
**Descripción:** Visualización de rendimiento y asistencia de todos los alumnos de un salón. Toggle entre modo Rendimiento y modo Asistencia.

**Funciones:**

- Selector de salón (carga todos los salones de la academia)
- Grid de tarjetas por alumno con color según umbral: verde ≥14/80%, amarillo 11-13/60-79%, rojo <11/<60%
- Hover en tarjeta muestra promedio exacto + % asistencia
- Sección "Alumnos en riesgo" al pie
- Stats: total activos, promedio general, asistencia media, en riesgo

**Endpoints:** `GET /api/alumnos/salones`, `GET /api/director/salon/:id_salon/mapa-calor`

---

### ControlDocumentos.jsx — Control de Documentos

**Roles:** secretaria, director
**Descripción:** Dos vistas: resumen (alumnos con documentos pendientes) y detalle (todos los documentos de un alumno).

**Funciones:**

- Vista resumen: lista de alumnos con count de docs pendientes, buscador, botón "Ver documentos"
- Vista detalle: 6 tipos de doc predeterminados (DNI, Voucher, Ficha, Foto, Certificado, Constancia), toggle estado pendiente↔entregado
- Botón "+" para registrar nuevo tipo de documento

**Endpoints:** `GET /api/academic/documentos/pendientes`, `GET /api/academic/alumnos/:id/documentos`, `POST /api/academic/alumnos/:id/documentos`, `PUT /api/academic/alumnos/:id/documentos/:id_doc`

---

### ListaEspera.jsx — Lista de Espera

**Roles:** secretaria, director
**Descripción:** Gestión de prospectos que están esperando un cupo en la academia.

**Funciones:**

- Lista de prospectos ordenada por posición con nombre, teléfono, salón de interés, fecha
- Stats por salón mostrando cuántos están en espera
- Botones "Promover ✓" (estado=promovido) y "Descartar" por prospecto
- Modal "+ Agregar": nombre, teléfono, email, salón de interés, notas
- Posición asignada automáticamente

**Endpoints:** `GET /api/academic/lista-espera`, `POST /api/academic/lista-espera`, `PUT /api/academic/lista-espera/:id/estado`

---

### ComunicadosMasivos.jsx — Comunicados Masivos

**Roles:** superadmin, director, secretaria, profesor
**Descripción:** Envío de mensajes internos a un salón o a toda la academia.

**Endpoints:** Usa tabla `comunicados` (migración 002)

---

### academia/[slug]/page.js — Landing Pública de la Academia

**Roles:** Público (sin auth)
**Descripción:** Página pública accesible en `/academia/[slug]`. Muestra el nombre, logo y colores de marca de la academia, tres cards de beneficios, y CTA que redirige a `/login/[slug]`. Footer "Powered by SIGMA · LB Systems".

**Endpoints:** `GET /api/public/academias/slug/:slug`

---

### Resumen de acceso por rol

| Componente         | superadmin | director | secretaria | profesor |    alumno    |
| ------------------ | :--------: | :------: | :--------: | :------: | :----------: |
| AdminPanel         |     ✅     |    —     |     —      |    —     |      —       |
| AuditDashboard     |     ✅     |    —     |     —      |    —     |      —       |
| BandejaOMR         |     ✅     |    ✅    |     —      |    ✅    |      —       |
| BuscadorGlobal     |     ✅     |    ✅    |     ✅     |    ✅    |      —       |
| ComunicadosMasivos |     ✅     |    ✅    |     ✅     |    ✅    |      —       |
| ControlAsistencia  |     ✅     |    ✅    |     ✅     |    ✅    |      —       |
| ControlDocumentos  |     ✅     |    ✅    |     ✅     |    —     |      —       |
| CRM                |     ✅     |    ✅    |     ✅     |    —     |      —       |
| DirectorResumen    |     ✅     |    ✅    |     ✅     |    —     |      —       |
| FastInputConsole   |     ✅     |    ✅    |     —      |    ✅    |      —       |
| GestionAlumnos     |     ✅     |    ✅    |     ✅     |    —     |      —       |
| GestionPagos       |     ✅     |    ✅    |     ✅     |    —     |      —       |
| ImportarDatos      |     ✅     |    ✅    |     ✅     |    —     |      —       |
| ListaEspera        |     ✅     |    ✅    |     ✅     |    —     |      —       |
| MapaCalorSalon     |     ✅     |    ✅    |     —      |    ✅    |      —       |
| MarketingPanel     |     ✅     |    ✅    |     —      |    —     |      —       |
| MaterialDidactico  |     ✅     |    ✅    |     ✅     |    ✅    | ✅ (lectura) |
| OnboardingWizard   |     —      |    ✅    |     —      |    —     |      —       |
| PlantillasManager  |     ✅     |    ✅    |     —      |    ✅    |      —       |
| PortalAlumno       |     —      |    —     |     —      |    —     |      ✅      |
| ScannerIA          |     ✅     |    ✅    |     —      |    ✅    |      —       |

---

## 19. ARGUMENTO DE VENTAS (PARA USAR EN CONVERSACIONES)

**No estás vendiendo un sistema de gestión genérico. Estás vendiendo tres cosas que ningún competidor tiene juntas:**

1. **El único OMR calibrado para las universidades peruanas.** San Marcos, UNI y Agraria tienen fórmulas específicas. SIGMA las conoce. El profesor no configura nada. Solo selecciona la universidad.

2. **Una plataforma que acompaña el crecimiento.** No solo registra lo que pasa, avisa qué va a pasar. Alumnos en riesgo, deudas que se acumulan, ciclos que van mal antes de que terminen.

3. **Acceso a una agencia digital integrada.** Sin buscar proveedor de marketing por un lado, automatización por otro, y sistema por otro. Todo en un solo lugar, con un proveedor que conoce el negocio desde adentro.

**Para Academia Jireh:** El profesor va a dejar de corregir exámenes a mano y va a tener resultados en minutos con control total sobre lo que confirma. 180 alumnos en Plan Pro a S/320/mes son menos de S/1.80 por alumno al mes. Menos que una fotocopia.

**Para Academia Círculo Matemático:** Van a poder ver exactamente en qué curso cada alumno está fallando, por nombre, semana a semana, sin hacer nada manual. Para una academia enfocada en San Marcos y UNI, el desglose por grupos de cursos es el argumento central. La diferencia entre Starter y Pro es S/140/mes y lo que obtienen es el análisis detallado que transforma cómo enseñan.

---

## 20. JOBS Y CRONS EN EL VPS

### Backup nocturno — `/opt/edusaas/backup.sh`

```bash
#!/bin/bash
FECHA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/edusaas/backups
PGPASSWORD=SaaS2026 pg_dump -h 127.0.0.1 -U edusaas_admin edusaas_db | gzip > "$BACKUP_DIR/backup_$FECHA.sql.gz"
# Mantener solo los últimos 14 backups
ls -t "$BACKUP_DIR"/backup_*.sql.gz | tail -n +15 | xargs rm -f
```

**Cron:** `0 2 * * * /opt/edusaas/backup.sh >> /opt/edusaas/backups/backup.log 2>&1`

---

### Resumen semanal — `src/jobs/resumenSemanal.js`

Script Node.js standalone. Para cada alumno activo calcula:

- Exámenes tomados y promedio de la semana (lunes a domingo)
- Asistencias y ausencias de la semana
- Posición en el ranking del salón (últimos 30 días)
- Mensaje motivacional según promedio (excelente ≥14, buena ≥11, regular <11, sinExamen)
- UPSERT en `resumenes_semanales` (unique: id_usuario + semana_inicio)

**Cron:** `0 23 * * 0 cd /opt/edusaas && node src/jobs/resumenSemanal.js >> /opt/edusaas/backups/resumen.log 2>&1`

**Uso manual:** `node src/jobs/resumenSemanal.js`

---

### Limpieza de archivos temporales — `src/jobs/cleanupPdfs.js`

Elimina PDFs de boletas/resultados en `public/pdfs/` y fotos de scan en `public/uploads/scan-*` que superen los 30 días. Previene que el disco del VPS se llene silenciosamente.

**Cron:** `0 3 * * * cd /opt/edusaas && node src/jobs/cleanupPdfs.js >> /opt/edusaas/backups/cleanup.log 2>&1`

**Uso manual:** `node src/jobs/cleanupPdfs.js`

---

## 21. CONSIDERACIONES DE IMPLEMENTACIÓN (REGLAS INNEGOCIABLES)

1. **Separar siempre entornos de desarrollo y producción** antes de tener clientes pagando. Un error en producción con academias activas tiene consecuencias reales.

2. **Todos los endpoints deben tener `verifyToken` y verificación de rol específico.** Un alumno no puede llamar rutas del director aunque tenga JWT válido.

3. **Todas las queries deben filtrar por `id_academia` sin excepción.** Nunca devolver datos de una academia a otra.

4. **El backup nocturno con `pg_dump` es innegociable desde el primer cliente activo.** Sin backup no hay negocio.

5. **El nombre SIGMA con el footer Powered by LB Systems construye dos marcas simultáneamente** mientras las academias usan el producto día a día.

---

---

## 22. PORTAL DE PADRES — ESPECIFICACIÓN COMPLETA

### Filosofía de diseño (innegociable)

- **Cero comparaciones entre alumnos.** El padre nunca ve rankings ni tablas comparativas con otros estudiantes. Solo ve a su(s) hijo(s).
- **Páginas independientes por hijo.** Si un padre tiene dos hijos en la academia, hay un selector en la cabecera ("Viendo: Luis" / "Viendo: Ana"). Al cambiar, la vista se recarga completamente. Los datos nunca se mezclan.
- **Datos ocultos en la vista padre:** El componente `ranking` visible en el PortalAlumno debe estar estrictamente deshabilitado en la vista del padre.
- **Gráficos de progreso individual:** Solo se compara el historial del alumno consigo mismo y con el puntaje mínimo requerido para la carrera que eligió.

### Alertas automáticas al padre

Disparadas desde el backend en el momento del registro de asistencia o al procesar resultados OMR:

| Disparador | Condición | Tipo alerta |
| --- | --- | --- |
| Faltas seguidas | 2 o más `ausente` consecutivos | ⚠️ Alerta temprana |
| Tardanzas acumuladas | 3 `tardanza` seguidos | ⚠️ Alerta temprana |
| Caída de rendimiento | Promedio bajó >15% vs semana anterior | 📉 Alerta de seguimiento |
| Subida de rendimiento | Promedio subió >15% vs semana anterior | 🎉 Felicitación |

### Vista del padre por sección

- **Rendimiento:** Gráfica `AreaChart` (Recharts) del puntaje en el tiempo vs. puntaje mínimo de la carrera objetivo
- **Asistencia:** Porcentaje del mes actual, últimas 4 semanas
- **Finanzas:** Deuda pendiente + historial de boletas descargables
- **Próximos eventos:** Calendario con simulacros y fechas de pago
- **Alertas recientes:** Feed de notificaciones del hijo (no comparativas)

### Vinculación técnica

La tabla `usuarios` ya soporta el rol `padre`. La vinculación padre-alumno requiere una tabla `padre_alumno` (pendiente migración):

```sql
CREATE TABLE padre_alumno (
    id_padre    VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_alumno   VARCHAR(50) REFERENCES usuarios(id_usuario),
    id_academia VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_padre, id_alumno)
);
```

La Secretaria crea esta vinculación al matricular al alumno o desde el panel de gestión.

---

## 23. GAMIFICACIÓN v2 — MEDALLAS, TOKENS Y DIPLOMAS

### Medallas globales (creadas por Bryan, luego personalizables por academia)

Primera fase: Bryan diseña un set estándar usando los recursos de LB Systems.

| Medalla | Condición de obtención |
| --- | --- |
| 🕐 El Reloj Suizo | 100% asistencia en el mes, sin tardanzas |
| 📈 El Escalador | Mayor subida de puntaje vs. mes anterior (progreso propio) |
| 🔥 El Imparable | Racha de login más larga del mes |
| 🎯 El Enfocado | 5 simulacros completados en el ciclo |
| 🧠 El Constante | Asistencia ≥90% durante todo el ciclo |
| ⭐ Alumno del Mes | Mejor combinación asistencia + rendimiento (elegido por el sistema) |
| 👨‍🏫 Profe del Mes | Elegido manualmente por el Director |

Segunda fase (futuro): cada academia puede crear medallas propias desde su panel.

### Sistema de Tokens (puntos canjeables)

| Acción | Tokens ganados |
| --- | --- |
| Asistir toda la semana | +50 pts |
| Dar el simulacro (solo por asistir) | +20 pts |
| Aprobar el simulacro | +30 pts extra |
| Login 7 días seguidos | +25 pts |
| Obtener una medalla | +100 pts |

La academia configura qué se puede canjear y por cuántos tokens (descuento en pensión, producto físico, etc.).

### Diplomas PDF automáticos

Al cierre de ciclo, el Director hace un solo clic y el sistema genera diplomas usando `pdfGenerator.js` para:
- El alumno con más puntaje del salón
- El alumno con mejor asistencia
- El alumno con mayor progreso (subida de puntaje entre primer y último simulacro)
- Todos los alumnos con 90%+ de asistencia

### Resumen mensual compartible ("Spotify Wrapped" estudiantil)

El cron `resumenSemanal.js` ya tiene los datos. A fin de mes, generar una vista visual del alumno:
- Puntaje máximo alcanzado ese mes
- Número de simulacros completados
- Horas de racha acumuladas
- Medallas obtenidas

El alumno puede compartir esta tarjeta a sus redes sociales → marketing orgánico para la academia.

---

## 24. ANÁLISIS DE COMPETENCIA

### Competidores directos en calificación OMR

| Competidor | Precio | Ventaja | Debilidad vs SIGMA |
| --- | --- | --- | --- |
| **ZipGrade** | ~$15/año | Barato, fácil de usar | Solo califica. Sin fórmulas peruanas, sin portal, sin CRM |
| **Remark Office OMR** | $1,000+ (licencia única) | Alta precisión | Software de escritorio, no cloud, sin interacción alumno |
| **Google Forms + Sheets** | Gratis | Sin costo | Manual, sin OMR físico, sin gamificación, sin reportes automáticos |

### Competidores de gestión escolar (ERPs)

| Competidor | Precio aprox. | Enfoque | Debilidad vs SIGMA |
| --- | --- | --- | --- |
| **SieWeb** | S/3–8/alumno/mes | Colegios K-12 | No entiende simulacros tipo admisión, sin OMR nativo, sin fórmulas UNMSM/UNI |
| **Cubicol** | Variable | Gestión general | Genérico, no especializado en preuniversitarios peruanos |
| **Idukay** | Variable | Plataforma educativa | Enfocado en contenido digital, no en calificación física |

### La ventaja injusta de SIGMA

Nadie en el mercado peruano tiene estas tres cosas juntas:
1. OMR físico con las fórmulas exactas de UNMSM, UNI y Agraria
2. Portal del alumno con simulador de ingreso por carrera
3. CRM de cobranza + gamificación + alertas predictivas

Todo en una sola plataforma, a un precio por academia (no por alumno), sin instalar nada.

---

## 25. BACKLOG DE MEJORAS ESTRATÉGICAS

Ideas validadas en sesión de planteamiento (13/05/2026). Ordenadas por impacto/esfuerzo:

### Alta prioridad (impacto inmediato en onboarding)

- **Onboarding del alumno "estilo Duolingo":** Primera vez que el alumno entra, pantalla de 3 pasos: ¿A qué universidad apuntas? → ¿Qué carrera? → barra de progreso activada. Alimenta el Simulador de Ingreso sin intervención de la secretaria.
- **Empty States amigables:** Cuando no hay alumnos o exámenes, mostrar diseño visual con CTA claro ("Sube tu primera plantilla aquí"). Evita que los directores nuevos se confundan con tablas vacías.
- **Bandeja OMR keyboard-first:** Navegación por teclado (↑↓ Enter) para procesar pendientes rápidamente. Filosofía "Inbox Zero" — limpiar la bandeja debe ser adictivo.

### Media prioridad (V1.1)

- **Detección de anomalías en plantilla:** Si una pregunta tiene <5% de aciertos en todo el salón, alerta visual al profesor: "La pregunta 42 tiene nivel de error inusual. ¿Revisar clave?"
- **Recomendaciones "estilo Netflix":** El OMR ya sabe en qué falla el alumno. Si sacó bajo en Álgebra, el portal le sugiere automáticamente el material didáctico de ese curso. Requiere vincular temas del material con preguntas de la plantilla.
- **Centro de Retención anti-churn:** Card roja en el Dashboard del Director: "X alumnos en riesgo de abandono" (asistencia <60% + caída de notas en 2 simulacros). Dato accionable, no solo informativo.

### Baja prioridad (V1.2+)

- **WhatsApp 1-click para secretaria:** Botón al lado de cada deudor que abre WhatsApp con mensaje pre-llenado. Requiere presupuesto para API oficial de Meta — pendiente crecimiento de ingresos.
- **Resumen mensual compartible:** Tarjeta visual tipo "Spotify Wrapped" que el alumno puede publicar en redes. Marketing orgánico para la academia.
- **Diplomas PDF automáticos al cierre de ciclo:** Ya tenemos `pdfGenerator.js`, solo falta el template y el trigger.
- **Calendario individual por usuario:** Cada alumno con su propia agenda de asesorías/tutorías (V1.2).

---

## 26. CAPACIDAD DEL VPS Y PLAN DE ESCALABILIDAD

### Estado actual (KVM2 Hostinger, ~2 vCPUs / 8GB RAM)

| Servicio | Consumo estimado | Notas |
| --- | --- | --- |
| PostgreSQL 16 | Medio-alto | En el host, fuera de Docker |
| Backend Node.js | Bajo-medio | Express.js es eficiente |
| Frontend Next.js | Medio | Build estático servido por container |
| omr_service Python | Alto en picos | Limitado a 3 concurrentes por el worker |
| n8n | Medio | Solo para automatizaciones internas |
| NocoDB | Bajo | Solo panel admin Farmacia |

**Conclusión para V1.0:** El VPS soporta sin problema hasta 3 academias piloto. La cola anti-colapso del OMR (máx. 3 concurrentes) es el blindaje clave contra saturación de CPU.

### Plan de escalabilidad por etapas

| Etapa | Trigger | Acción |
| --- | --- | --- |
| **V1.0** (ahora) | 1–3 academias | VPS KVM2 actual. Monitorear con `docker stats` en horas pico |
| **V1.2** (5–10 academias) | RAM >70% sostenida | Migrar PostgreSQL a instancia administrada externa (Supabase o RDS) |
| **V2.0** (10+ academias) | CPU picos en OMR | omr_service a servidor dedicado con CPU optimizada |
| **V3.0** (50+ academias) | Latencia frontend | CDN + separar frontend a Vercel o Cloudflare Pages |

**Regla:** No mejorar el servidor antes de que el tráfico real lo exija. Los ingresos de las primeras academias financian la siguiente capa de infraestructura.

---

_Documento generado: 21 de marzo de 2026_
_Actualización 22/03/2026 — Sprint V1.1 completo_
_Actualización 13/05/2026 — VPS con HTTPS activo, migración de máquina, omr_service verificado, decisiones de diseño hoja OMR, planes de precios redefinidos, especificación portal de padres, gamificación v2, análisis de competencia, backlog estratégico_
_Actualización 14/05/2026 — Rediseño visual hoja OMR completo (azul, marcadores 9mm, quadrant detection), proxy GET /api/omr/template, seguridad app.py (extensión + 20MB), cleanupPdfs.js_
_Estado del proyecto: v1.0.0 en producción — https://sigma.srv1415334.hstgr.cloud_
_Pendiente crítico: endpoint upload-logo, test end-to-end OMR (imprimir + fotografiar), onboarding Jireh y Círculo Matemático_
