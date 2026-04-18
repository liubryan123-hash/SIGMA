# Auditoria del Proyecto Viejo: `educational-dashboard`

## Resumen

Se audito la carpeta local de referencia [`E:\Antigravity proyectos\educational-dashboard`](E:\Antigravity proyectos\educational-dashboard) para identificar la huella tecnica del proyecto viejo y usarla para localizar su copia remota en el VPS.

Conclusion principal:

- El proyecto viejo no era un backend Node/Express como el SaaS actual.
- Era una app estatica servida por `Nginx` con `HTML + JS`.
- La logica de negocio dependia de `n8n` y PostgreSQL por medio de webhooks.
- Su esquema SQL es una version previa y mas pequena del esquema del SaaS actual.

Eso significa que en el VPS lo mas probable es que existan tres restos del proyecto viejo:

1. Archivos web en una carpeta tipo `/var/www/...`
2. Configuracion de `Nginx` apuntando a esa carpeta
3. Datos en PostgreSQL y posiblemente workflows viejos de `n8n`

## Hallazgos Locales

### 1. Estructura del proyecto viejo

Archivos principales detectados:

- `index.html`
- `admin.html`
- `teacher.html`
- `student.html`
- `js/auth.js`
- `js/core.js`
- `js/admin.js`
- `sql/schema.sql`
- `sql/seed_demo.sql`
- multiples workflows de `n8n` dentro de `data/`

Interpretacion:

- El frontend era estatico.
- No hay servidor de aplicacion propio en esta carpeta.
- La logica de API estaba externalizada en `n8n`.

### 2. Dominio y dependencia de n8n

Se encontraron referencias directas al mismo host de `n8n` que sigues usando hoy:

- `https://n8n.srv1415334.hstgr.cloud/webhook`
- `https://n8n.srv1415334.hstgr.cloud/webhook/auth-login`

Archivos donde aparece:

- [`js/core.js`](E:\Antigravity proyectos\educational-dashboard\js\core.js)
- [`js/auth.js`](E:\Antigravity proyectos\educational-dashboard\js\auth.js)
- [`js/admin.js`](E:\Antigravity proyectos\educational-dashboard\js\admin.js)
- [`test_req.py`](E:\Antigravity proyectos\educational-dashboard\test_req.py)

Interpretacion:

- El proyecto viejo probablemente no hablaba con `Nginx` como API.
- `Nginx` seguramente solo servia los archivos estaticos.
- La parte funcional dependia del contenedor/instancia de `n8n`.

### 3. Base de datos usada por el proyecto viejo

En la carpeta local no aparecen credenciales de PostgreSQL concretas, pero si hay evidencia fuerte de uso de PostgreSQL:

- workflows `n8n` con nodos `postgres`
- esquema SQL propio en [`sql/schema.sql`](E:\Antigravity proyectos\educational-dashboard\sql\schema.sql)
- datos demo en [`sql/seed_demo.sql`](E:\Antigravity proyectos\educational-dashboard\sql\seed_demo.sql)

Senales de identificacion utiles:

- academia demo: `ACAD-JIREH`
- examen demo: `100-PREG-SANMARCOS`
- usuarios demo:
  - `TEACHER-PRUEBA`
  - `STUDENT-PRUEBA`

Estas tres senales sirven para buscar si la base del proyecto viejo sigue cargada en tu PostgreSQL del VPS.

### 4. Relacion con el SaaS actual

El SQL del proyecto viejo se parece mucho al SaaS actual, pero es una version anterior.

El esquema actual agrega tablas y modulos que no aparecen en el viejo, por ejemplo:

- `catalogo_servicios`
- `solicitudes_marketing`
- `sugerencias_buzon`
- `material_didactico`
- `crm_prospectos`
- `logs_auditoria`

Interpretacion:

- Si la base del VPS contiene solo tablas del proyecto viejo, se puede retirar con menos riesgo.
- Si ya mezclaste datos del SaaS nuevo en la misma base, no conviene borrar la base completa; habria que borrar solo datos/tablas aisladas.

## Hipotesis Tecnica del VPS

Con la informacion disponible, la instalacion vieja en el VPS probablemente se veia asi:

- `Nginx` sirviendo archivos estaticos desde `/var/www/...`
- `n8n` resolviendo endpoints de negocio por webhook
- PostgreSQL guardando academias, usuarios, examenes y resultados

Por tanto, borrar solo la carpeta web no elimina todo el proyecto viejo.

Para retirarlo por completo hay que revisar:

1. carpeta web remota
2. config de `Nginx`
3. workflows viejos de `n8n`
4. datos viejos en PostgreSQL

## Auditoria Remota Recomendada

Ejecuta estos comandos en tu VPS y guarda la salida.

### 1. Encontrar la carpeta remota del proyecto viejo

```bash
find /var/www -maxdepth 3 -type d | grep -i "educational\|dashboard\|edu"
```

Si no aparece nada:

```bash
find / -maxdepth 3 -type d 2>/dev/null | grep -i "educational\|dashboard\|edu"
```

### 2. Revisar configuraciones activas de Nginx

```bash
ls -la /etc/nginx/sites-enabled
ls -la /etc/nginx/sites-available
grep -Rni "/var/www\|root \|server_name\|listen" /etc/nginx/sites-available /etc/nginx/sites-enabled
```

Objetivo:

- detectar que `server_name` usaba
- a que carpeta `root` apuntaba
- confirmar si sigue publicado

### 3. Verificar si el proyecto viejo aun existe en PostgreSQL

Si ya entras al VPS con tu tunel, puedes revisar desde tu PC:

```bash
psql -h 127.0.0.1 -p 5433 -U edusaas_admin -d edusaas_db
```

Y dentro de `psql`:

```sql
\dt
SELECT id_academia, nombre, slug FROM academias WHERE id_academia = 'ACAD-JIREH' OR slug = 'jireh';
SELECT id_usuario, rol, nombre_completo FROM usuarios WHERE id_usuario IN ('TEACHER-PRUEBA', 'STUDENT-PRUEBA');
SELECT codigo_examen, nombre_simulacro FROM examenes_plantillas WHERE codigo_examen = '100-PREG-SANMARCOS';
```

Interpretacion:

- Si aparecen, la base vieja sigue viva dentro de la base actual o de una base heredada.
- Si no aparecen, puede que el despliegue viejo haya sido solo web o que use otra base.

### 4. Revisar bases de datos y roles existentes

Dentro de `psql`:

```sql
\l
\du
```

Objetivo:

- ver si existe una base separada del proyecto viejo
- ver si hay un usuario SQL viejo ya descartable

### 5. Revisar workflows viejos de n8n

Como el proyecto viejo dependia de webhooks, antes de borrar conviene revisar si `n8n` sigue teniendo workflows con estos nombres o similares:

- `api-admin-dashboard`
- `api-student-dashboard`
- `api-grade-exam-full`
- `api-create-user`
- `api-create-academy`
- `api-bulk-create-users`

Si esos workflows siguen activos y ya no los necesitas, forman parte del retiro del proyecto viejo.

## Regla de Borrado Seguro

Puedes borrar con seguridad la carpeta remota del proyecto viejo cuando se cumplan estas condiciones:

- ya identificaste su ruta exacta en el VPS
- ya identificaste su config de `Nginx`
- confirmaste que el SaaS nuevo no usa esa carpeta

Puedes borrar con seguridad la base vieja solo si se cumple una de estas:

- estaba en una base separada y ya la respaldaste
- o confirmaste que los datos viejos dentro de la base actual no se usan

No borres la base completa si el SaaS nuevo esta usando esa misma base.

## Orden Recomendado de Limpieza

1. Respaldar datos viejos
2. Deshabilitar sitio viejo en `Nginx`
3. Recargar `Nginx`
4. Eliminar carpeta remota del proyecto viejo
5. Revisar y desactivar workflows viejos de `n8n`
6. Eliminar base o datos viejos solo despues de confirmar aislamiento

## Decision Practica

Con lo auditado hasta ahora, la mejor suposicion es:

- el proyecto viejo esta publicado como sitio estatico en `/var/www`
- su logica aun puede vivir en `n8n`
- sus datos pueden estar mezclados parcialmente con la base que hoy usas

Por eso, el siguiente paso correcto no es borrar a ciegas, sino ejecutar la auditoria remota de `Nginx + PostgreSQL + n8n` usando las senales anteriores.
