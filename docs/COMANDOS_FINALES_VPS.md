# 🚀 COMANDOS FINALES - SUBIR TODO AL VPS

**Fecha:** 23 de marzo de 2026
**Versión:** v1.0.0 RELEASE

---

## 📦 ARCHIVOS MODIFICADOS/CREADOS

### Backend y OMR (Actualización 25/03/2026):
- ✅ `src/routes/omr.js` - Nuevo Worker y motor de Colas
- ✅ `docker-compose.yml` - Integración del microservicio `omr_service`
- ✅ `seed_unmsm.js` - Inyector de Plantillas
- ✅ `omr_service/` - Carpeta entera del microservicio en Python
- ✅ `frontend/public/hoja-omr-preview.html` - Ficha Horizontal 100 prev

### Backend (Anterior):
- ✅ `src/routes/exams.js` - Endpoints para alumno subir examen + pendientes
- ✅ `src/migrations/016_examenes_pendientes.sql` - Tabla de pendientes

### Frontend:

- ✅ `frontend/src/app/dashboard/WebcamCapture.jsx` - Componente de cámara
- ✅ `frontend/src/app/dashboard/ScannerIA.jsx` - Cámara + responsive
- ✅ `frontend/src/app/dashboard/BandejaOMR.jsx` - Pendientes de alumnos
- ✅ `frontend/src/app/dashboard/PortalAlumno.jsx` - Enviar a revisión
- ✅ `frontend/src/app/dashboard/page.js` - Limpieza de pestañas
- ✅ `frontend/src/app/dashboard/SidebarNav.jsx` - Menú limpio

---

## 📋 COMANDOS PARA SUBIR (ACTUALIZACIÓN MOTOR OMR NATIVO)

```bash
# ============================================
# 0. NUEVA ARQUITECTURA OMR (Microservicio + Colas)
# ============================================
# Subir carpeta completa del microservicio Python
scp -r "e:/Antigravity proyectos/plataforma-saas-academias/omr_service" root@187.77.217.145:/opt/edusaas/

# Subir Docker Compose modificado
scp "e:/Antigravity proyectos/plataforma-saas-academias/docker-compose.yml" root@187.77.217.145:/opt/edusaas/

# Subir Backend modificado (omr.js)
scp "e:/Antigravity proyectos/plataforma-saas-academias/src/routes/omr.js" root@187.77.217.145:/opt/edusaas/src/routes/

# Subir Inyector de San Marcos
scp "e:/Antigravity proyectos/plataforma-saas-academias/seed_unmsm.js" root@187.77.217.145:/opt/edusaas/

# Subir HTML de la Ficha Horizontal
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/public/hoja-omr-preview.html" root@187.77.217.145:/opt/edusaas/frontend/public/

# Documentación actualizada
scp "e:/Antigravity proyectos/plataforma-saas-academias/docs/SIGMA_CONTEXTO_MAESTRO.md" root@187.77.217.145:/opt/edusaas/docs/

# ============================================
# PASOS EN EL VPS LUEGO DE SUBIR:
# ============================================
ssh root@187.77.217.145

cd /opt/edusaas
# 1. Inyectar plantillas de San Marcos
docker compose exec backend node seed_unmsm.js

# 2. Reconstruir TODO y levantar el nuevo microservicio (tardará unos minutos en instalar Python/OpenCV)
docker compose build --no-cache && docker compose up -d

# 3. Ver que los 3 contenedores (backend, frontend, omr_service) estén UP
docker compose ps
```

---

## 📋 COMANDOS ANTERIORES

```bash
# ============================================
# 1. MIGRACIONES
# ============================================
scp "e:/Antigravity proyectos/plataforma-saas-academias/src/migrations/016_examenes_pendientes.sql" root@187.77.217.145:/opt/edusaas/src/migrations/

# ============================================
# 2. BACKEND
# ============================================
scp "e:/Antigravity proyectos/plataforma-saas-academias/src/routes/exams.js" root@187.77.217.145:/opt/edusaas/src/routes/

# ============================================
# 3. FRONTEND
# ============================================
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/WebcamCapture.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/ScannerIA.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/BandejaOMR.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/PortalAlumno.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/page.js" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/SidebarNav.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/

# ============================================
# 4. EN EL VPS - CORRER MIGRACIÓN Y DEPLOY
# ============================================
# Conectarse al VPS
ssh root@187.77.217.145

# Correr migración
PGPASSWORD=SaaS2026 psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db -f /opt/edusaas/src/migrations/016_examenes_pendientes.sql
# Deploy
cd /opt/edusaas && bash deploy.sh

# Verificar
tail -20 /opt/edusaas/backups/deploy.log && docker ps
```

---

## 🧪 PRUEBAS RECOMENDADAS

### 1. **Alumno envía examen:**

- Entra como alumno
- Baja a "Enviar Examen a Revisión"
- Selecciona examen
- Sube foto (o usa cámara)
- Envía

### 2. **Profesor revisa:**

- Entra como profesor
- Ve a "Bandeja OMR"
- Ve sección "📋 Pendientes de Alumnos"
- Haz clic en "📤 Enviar a ScannerIA"
- Ve a "🤖 Scanner IA"
- La foto debería estar cargada
- Procesa con IA

### 3. **Cámara web:**

- Ve a "🤖 Scanner IA"
- Haz clic en "📸 Usar cámara"
- Permite acceso a cámara
- Toma foto
- Debería aparecer como archivo seleccionado

### 4. **Responsive celular:**

- Abre en celular
- Ve a ScannerIA
- Debería verse bien (no estirado)
- Botones accesibles

---

## ✅ FLUJO COMPLETO

```
ALUMNO:
1. 📤 Sube examen desde portal
2. ⏳ Espera calificación
3. 📋 Ve estado en "Mis envíos"

PROFESOR:
1. 📋 Ve pendientes en BandejaOMR
2. 📤 Envía a ScannerIA
3. 🤖 IA procesa
4. ✅ Confirma nota
5. 💾 Guarda en PostgreSQL
```

---

## 🎉 ¡LISTO PARA LANZAMIENTO!

**Funcionalidades completas:**

- ✅ Alumnos pueden enviar exámenes
- ✅ Profesores pueden revisar con IA
- ✅ Cámara web integrada
- ✅ Responsive móvil
- ✅ Bandeja de pendientes
- ✅ Flujo completo OMR

**¡A PROBAR! 🚀**
