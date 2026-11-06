// Pago por alojar la página en la dirección (dominio) del cliente. Se cobra con un enlace de pago de Stripe
// (Payment Link) al terminar la entrevista, justo después de la última pregunta (la dirección).
// Cada enlace lleva client_reference_id=pag_<entrevista> para reconocer el pago en el webhook.
// Con el pago confirmado arranca el flujo de la dirección (pasos para apuntarla, o búsqueda y compra).
// Estado en brief.pago_pagina = {estado: 'pendiente'|'pagado', enlace, enviado, pagado, fuente, payment_intent}.
import * as db from './db.js';
import { avisar } from './avisos.js';
import { iniciarDominio, dominioEnCurso, atenderDominio, quiereRetomar, retomarDominio } from './dominio.js';

const ENLACE = () => process.env.PAGO_PAGINA_URL || 'https://buy.stripe.com/aFa7sLfma2MS8shgG7gUM0c';
const PREFIJO = 'pag_';
const PAGUE = /pagu[eé]|ya pag|ya qued[oó] (el )?pago|ya se pag|pago (hecho|listo)/i;
const LIGA = /\b(liga|link|enlace|pagar)\b/i;

export const ligaPago = (entrevistaId) => `${ENLACE()}?client_reference_id=${PREFIJO}${entrevistaId}`;
export const esReferenciaPagina = (ref) => String(ref || '').startsWith(PREFIJO);

/** ¿Ya contestó la última pregunta (tiene dirección, dio ideas o no quiere una)? */
export function dominioRespondido(brief) {
  const t = brief?.tecnico || {};
  if (t.quiere_dominio === false) return true;
  if (t.tiene_dominio === true) return Boolean(String(t.dominio || '').trim());
  if (t.tiene_dominio === false) return Boolean(String(t.dominio_deseado || '').trim());
  return false;
}
export const quiereDominio = (brief) => brief?.tecnico?.quiere_dominio !== false;

export const PREGUNTA_DOMINIO = 'Por último, la dirección de tu página en internet, por ejemplo tunegocio.com. ¿Ya tienes una comprada?';

export const mensajePago = (entrevistaId) => `Ahora, para alojar la página en tu nombre de dominio, completa por favor el pago en este enlace:\n${ligaPago(entrevistaId)}`;

/** Estado inicial que se guarda al mandar el enlace. */
export const pagoPendiente = (entrevistaId) => ({ estado: 'pendiente', enlace: ligaPago(entrevistaId), enviado: new Date().toISOString() });

const pagoDe = (brief) => brief?.pago_pagina || null;

async function guardarPago(entrevistaId, patch) {
  await db.q(`UPDATE entrevistas SET brief = jsonb_set(brief, '{pago_pagina}', COALESCE(brief->'pago_pagina','{}'::jsonb) || $2::jsonb), actualizado=now() WHERE id=$1`,
    [entrevistaId, JSON.stringify(patch)]);
}

/** Marca el pago (webhook o confirmación manual) y arranca el flujo de la dirección. Idempotente. */
export async function confirmarPago(entrevistaId, { fuente = 'stripe', payment_intent = null, monto_centavos = null } = {}) {
  const e = await db.obtener(entrevistaId);
  if (!e) return { ok: false, error: 'no existe' };
  if (pagoDe(e.brief)?.estado === 'pagado') return { ok: true, repetido: true };
  await guardarPago(e.id, { estado: 'pagado', pagado: new Date().toISOString(), fuente, payment_intent, monto_centavos });
  await db.evento(e.id, 'pago_pagina', { fuente, payment_intent, monto_centavos });
  const brief = (await db.obtener(e.id)).brief || {};
  const textos = ['¡Recibí tu pago! ✅ Gracias.'];
  if (quiereDominio(brief) && dominioRespondido(brief) && !brief.tecnico?.dominio_flujo) {
    try { textos.push(...(await iniciarDominio(e, brief)).textos); }
    catch (err) { console.error('iniciarDominio tras pago', err); textos.push('Ahora reviso lo de tu dirección y en unos minutos te escribo por aquí con los siguientes pasos.'); }
  }
  await avisar(e.id, textos, { evento: 'pago_pagina_recibido' });
  return { ok: true };
}

/** Evento del webhook de Stripe cuyo client_reference_id es de una página. */
export async function procesarEventoPagina(ev) {
  const s = ev?.data?.object || {};
  const id = String(s.client_reference_id || '').slice(PREFIJO.length);
  if (!id) return { ignorado: 'sin entrevista' };
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(ev.type) && s.payment_status === 'paid') {
    return confirmarPago(id, { fuente: 'stripe', payment_intent: s.payment_intent || null, monto_centavos: s.amount_total ?? null });
  }
  return { ignorado: ev.type };
}

/** Mensajes después del cierre mientras el pago o la dirección siguen en curso. → textos o null (no aplica). */
export async function atenderPostCierre(e, texto) {
  const p = pagoDe(e.brief);
  const t = String(texto || '').trim();
  if (p?.estado === 'pendiente') {
    if (PAGUE.test(t)) return ['Gracias 🙌 En cuanto se refleje tu pago te aviso por aquí y seguimos con tu dirección.'];
    if (LIGA.test(t)) return [mensajePago(e.id)];
    return null;
  }
  if (p?.estado !== 'pagado') return null;
  if (dominioEnCurso(e.brief)) {
    const r = await atenderDominio(e, e.brief || {}, t);
    return r.textos?.length ? r.textos : null;
  }
  if (quiereRetomar(e.brief, t)) return (await retomarDominio(e, e.brief || {})).textos;
  return null;
}
