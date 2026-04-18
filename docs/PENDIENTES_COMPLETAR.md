# 📋 PENDIENTES PARA COMPLETAR

**Fecha:** 23 de marzo de 2026

---

## ✅ LO QUE SÍ ESTÁ IMPLEMENTADO

1. **Cámara web** - ✅ Funcional en ScannerIA
2. **Alumno envía examen** - ✅ Backend + Frontend listos
3. **Bandeja carga pendientes** - ✅ Carga de examenes_pendientes
4. **PortalAlumno carga plantillas** - ✅ Lista de exámenes disponibles
5. **Responsive móvil** - ✅ Arreglado en ScannerIA

---

## ⏳ LO QUE FALTA (IMPORTANTE)

### 1. **BandejaOMR - Corrección manual con grilla**

**Archivo:** `frontend/src/app/dashboard/BandejaOMR.jsx`

**Qué falta:**
- En el modal de revisión, agregar el componente `ManualCorrectionGrid`
- Que muestre alternativas A-E por cada pregunta
- Que guarde los cambios antes de confirmar

**Cómo hacerlo:**
```jsx
// En el modal de revisión (línea ~530)
import ManualCorrectionGrid from './ManualCorrectionGrid';

// Dentro del modal, después de la imagen:
<ManualCorrectionGrid
  plantilla={plantillaRevisar}
  respuestasDetectadas={respuestasEdit}
  onRespuestasCambiadas={setRespuestasEdit}
  isDark={isDark}
  textMuted={textMuted}
/>
```

---

### 2. **BandejaOMR - Botón "Enviar a ScannerIA" funcional**

**Archivo:** `frontend/src/app/dashboard/BandejaOMR.jsx`

**Qué falta:**
- El botón "📤 Enviar a ScannerIA" actualmente solo muestra una alerta
- Debería redirigir a ScannerIA con los datos cargados

**Solución rápida:**
```jsx
onClick={() => {
  // Opción 1: Abrir ScannerIA en nueva pestaña con parámetros
  window.open(`/dashboard?tab=ia&examen=${pendiente.codigo_examen}&alumno=${pendiente.id_usuario}`, '_blank');
  
  // Opción 2: Cambiar la pestaña activa (si estás en page.js)
  // setActiveTab('ia');
  // setCodigoExamen(pendiente.codigo_examen);
  // setIdAlumno(pendiente.id_usuario);
}}
```

---

### 3. **Backend - Endpoint para obtener plantilla por código**

**Archivo:** `src/routes/exams.js`

**Qué falta:**
- Endpoint para que BandejaOMR obtenga la plantilla completa (con claves_correctas)

**Agregar:**
```javascript
router.get('/plantillas/:codigo', verificarToken, async (req, res) => {
  const { codigo } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM examenes_plantillas WHERE codigo_examen = $1',
      [codigo]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🚀 COMANDOS ACTUALIZADOS

```bash
# Archivos NUEVOS a subir:
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/ManualCorrectionGrid.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/

# Archivos MODIFICADOS a subir:
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/BandejaOMR.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/
scp "e:/Antigravity proyectos/plataforma-saas-academias/frontend/src/app/dashboard/PortalAlumno.jsx" root@187.77.217.145:/opt/edusaas/frontend/src/app/dashboard/

# En el VPS:
cd /opt/edusaas && bash deploy.sh
```

---

## 📝 RESUMEN

**Prioridad ALTA:**
1. ✅ Alumno puede subir examen
2. ✅ Profesor ve pendientes en BandejaOMR
3. ⏳ Profesor puede corregir manualmente con grilla (falta integrar ManualCorrectionGrid)
4. ⏳ Botón "Enviar a ScannerIA" redirige correctamente

**Prioridad MEDIA:**
- Responsive en BandejaOMR (celular)
- Estados de pendientes más claros

**Prioridad BAJA:**
- Animaciones de carga
- Notificaciones push

---

## 💡 RECOMENDACIÓN

**Sube lo que SÍ está completo** y prueba:
1. Alumno sube examen ✅
2. Profesor ve en Bandeja ✅
3. Flujo básico funciona ✅

Luego en el VPS, con calma, integra:
- ManualCorrectionGrid en el modal
- Redirección del botón "Enviar a ScannerIA"

**¡No dejes que los detalles te frenen el lanzamiento!** 🚀
