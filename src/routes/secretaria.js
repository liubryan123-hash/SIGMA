const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verificarToken } = require('../middleware/authMiddleware');
const { generarBoletaPago, generarReporteResultados } = require('../utils/pdfGenerator');

// Cargar configuración centralizada
const config = require('../config');

// Pool de conexiones a PostgreSQL con configuración centralizada
const pool = new Pool(config.database);

const FINANCE_ROLES = ['admin', 'secretaria', 'director', 'superadmin'];

const verificarSecretaria = (req, res, next) => {
  if (req.usuario && FINANCE_ROLES.includes(req.usuario.rol)) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso exclusivo para secretaria, direccion o superadmin.' });
  }
};

const resolveAcademyScope = (req) => {
  if (req.usuario.rol === 'superadmin' && req.query.id_academia) {
    return req.query.id_academia;
  }

  return req.usuario.id_academia;
};

const buildReceiptNumber = (payment, academyId) => {
  const academyFragment = (academyId || 'GEN')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6) || 'GEN';
  const year = new Date(payment.fecha_pago || payment.fecha_vencimiento || Date.now()).getFullYear();
  return `REC-${academyFragment}-${year}-${String(payment.id_pago).padStart(5, '0')}`;
};

async function getFinanceSummary(idAcademia) {
  const statsQuery = `
    SELECT
      COALESCE(SUM(CASE WHEN estado = 'pagado' THEN monto ELSE 0 END), 0) AS ganancias,
      COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END), 0) AS deuda_total,
      COUNT(CASE WHEN estado = 'pagado' THEN 1 END) AS pagos_confirmados,
      COUNT(CASE WHEN estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE THEN 1 END) AS pagos_vencidos,
      COUNT(*) AS total_movimientos
    FROM pagos_crm
    WHERE id_academia = $1
  `;

  const [stats, recientes] = await Promise.all([
    pool.query(statsQuery, [idAcademia]),
    pool.query(
      `
        SELECT
          p.*,
          u.nombre_completo AS alumno_nombre
        FROM pagos_crm p
        JOIN usuarios u ON p.id_usuario = u.id_usuario
        WHERE p.id_academia = $1
        ORDER BY COALESCE(p.fecha_pago, p.fecha_vencimiento) DESC, p.id_pago DESC
        LIMIT 8
      `,
      [idAcademia]
    ),
  ]);

  return {
    resumen: stats.rows[0],
    recientes: recientes.rows,
  };
}

router.get('/pagos/resumen', verificarToken, verificarSecretaria, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  if (!idAcademia) {
    return res.status(400).json({ error: 'No se pudo determinar la academia para el resumen financiero.' });
  }

  try {
    const summary = await getFinanceSummary(idAcademia);
    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el resumen financiero.' });
  }
});

router.get('/pagos/:id/recibo', verificarToken, verificarSecretaria, async (req, res) => {
  const { id } = req.params;
  const whereAcademia = req.usuario.rol === 'superadmin' ? '' : 'AND p.id_academia = $2';
  const params = req.usuario.rol === 'superadmin' ? [id] : [id, req.usuario.id_academia];

  try {
    const result = await pool.query(
      `
        SELECT
          p.*,
          u.nombre_completo AS alumno_nombre,
          u.email AS alumno_email,
          a.nombre AS academia_nombre,
          a.logo_url,
          a.brand_primary_color,
          a.brand_secondary_color
        FROM pagos_crm p
        JOIN usuarios u ON p.id_usuario = u.id_usuario
        JOIN academias a ON p.id_academia = a.id_academia
        WHERE p.id_pago = $1
        ${whereAcademia}
      `,
      params
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Pago no encontrado para emitir el recibo.' });
    }

    const payment = result.rows[0];
    const receiptNumber = buildReceiptNumber(payment, payment.id_academia);

    res.json({
      numero_recibo: receiptNumber,
      emitido_por: req.usuario.id_usuario,
      fecha_emision: payment.fecha_pago || new Date().toISOString(),
      pago: payment,
      alumno: {
        id_usuario: payment.id_usuario,
        nombre_completo: payment.alumno_nombre,
        email: payment.alumno_email,
      },
      academia: {
        id_academia: payment.id_academia,
        nombre: payment.academia_nombre,
        logo_url: payment.logo_url,
        brand_primary_color: payment.brand_primary_color,
        brand_secondary_color: payment.brand_secondary_color,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al preparar el recibo.' });
  }
});

// Nuevo endpoint: Generar PDF de boleta
router.get('/pagos/:id/boleta-pdf', verificarToken, verificarSecretaria, async (req, res) => {
  const { id } = req.params;
  const whereAcademia = req.usuario.rol === 'superadmin' ? '' : 'AND p.id_academia = $2';
  const params = req.usuario.rol === 'superadmin' ? [id] : [id, req.usuario.id_academia];

  try {
    const result = await pool.query(
      `
        SELECT
          p.*,
          u.nombre_completo AS alumno_nombre,
          u.documento_identidad AS alumno_dni,
          a.nombre AS academia_nombre,
          a.ruc AS academia_ruc,
          a.direccion AS academia_direccion,
          a.telefono AS academia_telefono
        FROM pagos_crm p
        JOIN usuarios u ON p.id_usuario = u.id_usuario
        JOIN academias a ON p.id_academia = a.id_academia
        WHERE p.id_pago = $1
        ${whereAcademia}
      `,
      params
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    const payment = result.rows[0];
    
    // Generar PDF
    const pdfUrl = await generarBoletaPago({
      id_pago: payment.id_pago,
      numero_boleta: buildReceiptNumber(payment, payment.id_academia),
      fecha_emision: new Date().toISOString(),
      fecha_pago: payment.fecha_pago,
      monto: payment.monto,
      concepto: payment.concepto,
      estado: payment.estado,
      alumno_nombre: payment.alumno_nombre,
      alumno_dni: payment.alumno_dni,
      alumno_codigo: payment.id_usuario,
      academia_nombre: payment.academia_nombre,
      academia_ruc: payment.academia_ruc,
      academia_direccion: payment.academia_direccion,
      academia_telefono: payment.academia_telefono,
    });

    res.json({
      mensaje: 'Boleta generada correctamente',
      url: pdfUrl,
      downloadUrl: `${config.urls.publicApiUrl}${pdfUrl}`,
    });
  } catch (err) {
    console.error('Error al generar boleta PDF:', err);
    res.status(500).json({ error: 'Error al generar la boleta PDF.' });
  }
});

router.post('/pagos', verificarToken, verificarSecretaria, async (req, res) => {
  const { id_usuario, monto, concepto, fecha_vencimiento } = req.body;
  const idAcademia = resolveAcademyScope(req);

  try {
    const result = await pool.query(
      `
        INSERT INTO pagos_crm (id_usuario, id_academia, monto, concepto, fecha_vencimiento, estado)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [id_usuario, idAcademia, monto, concepto, fecha_vencimiento, 'pendiente']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar pago.' });
  }
});

const { crearNotificacion } = require('../utils/notificaciones');
const { enviarEmailPagoConfirmado } = require('../utils/email');

router.put('/pagos/:id/completar', verificarToken, verificarSecretaria, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
        UPDATE pagos_crm
        SET estado = $1, fecha_pago = CURRENT_TIMESTAMP
        WHERE id_pago = $2
        ${req.usuario.rol === 'superadmin' ? '' : 'AND id_academia = $3'}
        RETURNING *
      `,
      req.usuario.rol === 'superadmin'
        ? ['pagado', id]
        : ['pagado', id, req.usuario.id_academia]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    const payment = result.rows[0];

    // Notificar al alumno que su pago fue confirmado
    if (payment.id_usuario) {
      const numeroRecibo = buildReceiptNumber(payment, payment.id_academia);

      crearNotificacion(
        payment.id_usuario,
        payment.id_academia,
        'pago_confirmado',
        '✅ Pago confirmado',
        `Tu pago de S/ ${Number(payment.monto).toFixed(2)} por "${payment.concepto}" fue registrado.`,
        'resumen'
      );

      // Email al alumno (fire-and-forget — solo si tiene email)
      pool.query('SELECT email, nombre_completo FROM usuarios WHERE id_usuario = $1', [payment.id_usuario])
        .then(({ rows }) => {
          if (rows[0]?.email) {
            enviarEmailPagoConfirmado({
              email: rows[0].email,
              nombre: rows[0].nombre_completo,
              monto: payment.monto,
              concepto: payment.concepto,
              numero_recibo: numeroRecibo,
            });
          }
        })
        .catch(() => {});
    }

    res.json({
      ...payment,
      numero_recibo: buildReceiptNumber(payment, payment.id_academia),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar pago.' });
  }
});

router.get('/pagos/usuario/:id_usuario', verificarToken, verificarSecretaria, async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT *
        FROM pagos_crm
        WHERE id_usuario = $1
        ${req.usuario.rol === 'superadmin' ? '' : 'AND id_academia = $2'}
        ORDER BY fecha_vencimiento DESC, id_pago DESC
      `,
      req.usuario.rol === 'superadmin'
        ? [id_usuario]
        : [id_usuario, req.usuario.id_academia]
    );

    res.json(
      result.rows.map((payment) => ({
        ...payment,
        numero_recibo: payment.estado === 'pagado' ? buildReceiptNumber(payment, payment.id_academia) : null,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial de pagos.' });
  }
});

router.get('/pagos/:id_usuario', verificarToken, verificarSecretaria, async (req, res) => {
  const { id_usuario } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT *
        FROM pagos_crm
        WHERE id_usuario = $1
        ${req.usuario.rol === 'superadmin' ? '' : 'AND id_academia = $2'}
        ORDER BY COALESCE(fecha_pago, fecha_vencimiento) DESC, id_pago DESC
      `,
      req.usuario.rol === 'superadmin'
        ? [id_usuario]
        : [id_usuario, req.usuario.id_academia]
    );

    res.json(
      result.rows.map((payment) => ({
        ...payment,
        numero_recibo: payment.estado === 'pagado' ? buildReceiptNumber(payment, payment.id_academia) : null,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pagos del alumno.' });
  }
});

router.get('/expediente/:id_usuario', verificarToken, verificarSecretaria, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id_expediente,
          id_usuario,
          tipo_documento,
          url_archivo AS url_documento,
          fecha_subida
        FROM alumnos_expedientes
        WHERE id_usuario = $1
        ORDER BY fecha_subida DESC, id_expediente DESC
      `,
      [req.params.id_usuario]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener expediente.' });
  }
});

router.post('/expediente', verificarToken, verificarSecretaria, async (req, res) => {
  const { id_usuario, tipo_documento, url_documento } = req.body;

  try {
    const result = await pool.query(
      `
        INSERT INTO alumnos_expedientes (id_usuario, tipo_documento, url_archivo)
        VALUES ($1, $2, $3)
        RETURNING
          id_expediente,
          id_usuario,
          tipo_documento,
          url_archivo AS url_documento,
          fecha_subida
      `,
      [id_usuario, tipo_documento, url_documento]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir documento.' });
  }
});

// ==========================================
// HOME OPERATIVO PARA SECRETARIA
// ==========================================

router.get('/home-resumen', verificarToken, verificarSecretaria, async (req, res) => {
  const idAcademia = resolveAcademyScope(req);
  try {
    // Tarjetas operativas
    const [deudoresHoy, vencimientos7d, listaEspera, cajaMes] = await Promise.all([
      // Deudores del día
      pool.query(`
        SELECT COUNT(*) as cantidad, SUM(monto) as total
        FROM pagos_crm
        WHERE id_academia = $1 AND estado = 'pendiente' AND fecha_vencimiento = CURRENT_DATE
      `, [idAcademia]),
      
      // Vencimientos próximos 7 días
      pool.query(`
        SELECT COUNT(*) as cantidad, SUM(monto) as total
        FROM pagos_crm
        WHERE id_academia = $1 AND estado = 'pendiente' 
          AND fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
      `, [idAcademia]),
      
      // Lista de espera activa
      pool.query(`
        SELECT COUNT(*) as cantidad
        FROM lista_espera
        WHERE id_academia = $1 AND estado = 'pendiente'
      `, [idAcademia]),
      
      // Caja del mes
      pool.query(`
        SELECT SUM(monto) as total, COUNT(*) as cantidad
        FROM pagos_crm
        WHERE id_academia = $1 AND estado = 'pagado'
          AND EXTRACT(MONTH FROM fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE)
      `, [idAcademia]),
    ]);

    res.json({
      deudores_hoy: deudoresHoy.rows[0],
      vencimientos_7d: vencimientos7d.rows[0],
      lista_espera: listaEspera.rows[0],
      caja_mes: cajaMes.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando home resumen: ' + err.message });
  }
});

module.exports = router;
