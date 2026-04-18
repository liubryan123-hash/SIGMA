// =====================================================
// SIGMA — Email transaccional con Resend
// Usa: RESEND_API_KEY y EMAIL_FROM en .env
// Si resend no está instalado o sin API key → silencioso
// =====================================================

let resend = null;
try {
  const { Resend } = require('resend');
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch {
  // resend no instalado — emails desactivados
}

const FROM = process.env.EMAIL_FROM || 'SIGMA <noreply@lbsystems.pe>';

// ──────────────────────────────────────────────────────
// Email: Pago confirmado → alumno
// ──────────────────────────────────────────────────────
async function enviarEmailPagoConfirmado({ email, nombre, monto, concepto, numero_recibo }) {
  if (!resend || !email) return;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '✅ Tu pago fue confirmado — SIGMA',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#0f172a;color:#f1f5f9;border-radius:20px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
            <div style="background:#22c55e;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px">✅</div>
            <div>
              <h2 style="margin:0;font-size:20px;font-weight:900;color:#22c55e">Pago confirmado</h2>
              <p style="margin:0;font-size:12px;color:#64748b">SIGMA · LB Systems</p>
            </div>
          </div>
          <p style="margin:0 0 20px;color:#cbd5e1">Hola <strong>${nombre}</strong>, tu pago fue registrado correctamente.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
            <tr>
              <td style="padding:12px 16px;background:#1e293b;border-radius:8px 8px 0 0;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">Concepto</td>
              <td style="padding:12px 16px;background:#1e293b;border-radius:8px 8px 0 0;font-weight:700">${concepto}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;background:#0f172a;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">Monto</td>
              <td style="padding:12px 16px;background:#0f172a;font-weight:900;color:#22c55e;font-size:18px">S/ ${Number(monto).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;background:#1e293b;border-radius:0 0 8px 8px;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.05em">N° Recibo</td>
              <td style="padding:12px 16px;background:#1e293b;border-radius:0 0 8px 8px;font-family:monospace;font-size:13px;color:#a5b4fc">${numero_recibo}</td>
            </tr>
          </table>
          <p style="color:#475569;font-size:12px;text-align:center;margin:0">Ingresa a tu portal para ver el historial completo.</p>
          <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0">Powered by LB Systems · SIGMA</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] Error enviando confirmación de pago:', err.message);
  }
}

// ──────────────────────────────────────────────────────
// Email: Examen calificado → alumno
// ──────────────────────────────────────────────────────
async function enviarEmailExamenCalificado({ email, nombre, examen, nota, desglose }) {
  if (!resend || !email) return;
  try {
    const filasCursos = Array.isArray(desglose) && desglose.length > 0
      ? desglose.map(d => `
          <tr>
            <td style="padding:10px 16px;background:#1e293b;color:#cbd5e1">${d.curso}</td>
            <td style="padding:10px 16px;background:#1e293b;text-align:right;font-weight:900;color:#818cf8">${d.puntaje} pts</td>
            <td style="padding:10px 16px;background:#1e293b;text-align:right;color:#64748b;font-size:12px">${d.aciertos}✓ ${d.errores}✗ ${d.blancos}○</td>
          </tr>
        `).join('')
      : '';

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `📋 Resultado disponible: ${examen} — SIGMA`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#0f172a;color:#f1f5f9;border-radius:20px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
            <div style="background:#818cf8;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px">📋</div>
            <div>
              <h2 style="margin:0;font-size:20px;font-weight:900;color:#818cf8">Examen calificado</h2>
              <p style="margin:0;font-size:12px;color:#64748b">SIGMA · LB Systems</p>
            </div>
          </div>
          <p style="margin:0 0 20px;color:#cbd5e1">Hola <strong>${nombre}</strong>, tus resultados de <strong>${examen}</strong> ya están disponibles.</p>
          <div style="background:#1e293b;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="margin:0 0 4px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.08em">Nota Total</p>
            <p style="margin:0;font-size:48px;font-weight:900;color:#818cf8;line-height:1">${nota}</p>
            <p style="margin:4px 0 0;color:#475569;font-size:12px">puntos</p>
          </div>
          ${filasCursos ? `
            <table style="width:100%;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden">
              <thead>
                <tr>
                  <th style="padding:8px 16px;background:#0f172a;color:#64748b;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">Curso</th>
                  <th style="padding:8px 16px;background:#0f172a;color:#64748b;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">Puntaje</th>
                  <th style="padding:8px 16px;background:#0f172a;color:#64748b;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:0.05em">Detalle</th>
                </tr>
              </thead>
              <tbody>${filasCursos}</tbody>
            </table>
          ` : ''}
          <p style="margin:24px 0 0;color:#475569;font-size:12px;text-align:center">Ingresa a tu portal para ver el análisis completo por pregunta.</p>
          <p style="color:#334155;font-size:11px;text-align:center;margin:12px 0 0">Powered by LB Systems · SIGMA</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] Error enviando resultado de examen:', err.message);
  }
}

module.exports = { enviarEmailPagoConfirmado, enviarEmailExamenCalificado };
