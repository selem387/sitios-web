// Envío de códigos de 6 dígitos por correo (verificación de contacto.email en la entrevista y,
// después, login sin contraseña del panel). Proveedor principal: GoHighLevel (LC Email) vía API v2.
// Si GHL no está configurado (GHL_API_KEY + GHL_LOCATION_ID + CORREO_REMITENTE) cae a mail.js (Resend/SMTP);
// si tampoco hay proveedor, devuelve entregado=false para que el flujo no prometa un correo que no salió.
// Nunca menciona a la empresa: remitente y textos son neutros.
import { config } from './config.js';
import { sendMail } from './mail.js';

const GHL = 'https://services.leadconnectorhq.com';
const ghlHeaders = () => ({ Authorization: `Bearer ${config.ghlApiKey}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' });
export const ghlConfigurado = () => Boolean(config.ghlApiKey && config.ghlLocationId && config.correoRemitente);
export const correoConfigurado = () => ghlConfigurado() || Boolean(config.resendApiKey || config.smtpUrl);

export const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
export const normalizarEmail = (s) => String(s || '').trim().toLowerCase();
export const esEmail = (s) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(normalizarEmail(s));

function plantilla(codigo, { negocio, motivo }) {
  const para = motivo === 'acceso' ? 'entrar a administrar tu página' : 'confirmar tu correo';
  const asunto = `${codigo} es tu código para ${para}`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#1d1d1f">
<p style="margin:0 0 12px">Hola${negocio ? `, ${negocio}` : ''}:</p>
<p style="margin:0 0 20px">Usa este código para ${para}. Vence en 10 minutos.</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:0 0 20px">${codigo}</p>
<p style="margin:0;color:#6e6e73;font-size:13px">Si no lo pediste, ignora este correo.</p></div>`;
  const text = `Tu código para ${para}: ${codigo}. Vence en 10 minutos. Si no lo pediste, ignora este correo.`;
  return { asunto, html, text };
}

async function ghlFetch(path, body) {
  const r = await fetch(`${GHL}${path}`, { method: 'POST', headers: ghlHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { /* texto */ }
  if (!r.ok) throw new Error(`GHL ${path} ${r.status}: ${t.slice(0, 300)}`);
  return j;
}

async function enviarGhl(email, { asunto, html }) {
  const c = await ghlFetch('/contacts/upsert', { locationId: config.ghlLocationId, email, tags: ['acceso-sitio'] });
  const contactId = c?.contact?.id || c?.id;
  if (!contactId) throw new Error('GHL no devolvió contactId');
  await ghlFetch('/conversations/messages', {
    type: 'Email', contactId, subject: asunto, html,
    emailFrom: `${config.correoRemitenteNombre} <${config.correoRemitente}>`,
  });
}

// → { entregado: boolean, proveedor: 'ghl'|'mail'|null, error? }
export async function enviarCodigo(email, codigo, { negocio = null, motivo = 'verificar' } = {}) {
  const p = plantilla(codigo, { negocio, motivo });
  if (ghlConfigurado()) {
    try { await enviarGhl(email, p); return { entregado: true, proveedor: 'ghl' }; }
    catch (err) { console.error('[correo_codigos] GHL', err.message); if (!(config.resendApiKey || config.smtpUrl)) return { entregado: false, proveedor: 'ghl', error: err.message }; }
  }
  try {
    const r = await sendMail(null, { to: email, subject: p.asunto, html: p.html, text: p.text, from_name: config.correoRemitenteNombre });
    return r.delivered === false ? { entregado: false, proveedor: null, error: 'sin proveedor de correo' } : { entregado: true, proveedor: 'mail' };
  } catch (err) {
    return { entregado: false, proveedor: 'mail', error: err.message };
  }
}
