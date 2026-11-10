// Pago por alojar la página en la dirección (dominio) del cliente. Se cobra con un enlace de pago de Stripe
// (Payment Link) al terminar la entrevista, justo después de la última pregunta (la dirección).
// Cada enlace lleva client_reference_id=pag_<entrevista> para reconocer el pago en el webhook.
// Con el pago confirmado arranca el flujo de la dirección (pasos para apuntarla, o búsqueda y compra).
// Estado en brief.pago_pagina = {estado: 'pendiente'|'pagado', enlace, enviado, pagado, fuente, payment_intent}.
import * as db from './db.js';
import { avisar } from './avisos.js';
import { iniciarDominio, dominioEnCurso, atenderDominio, quiereRetomar, retomarDominio } from './dominio.js';

const ENLACE = () => process.env.PAGO_PAGINA_URL || 'https://buy.stripe.com/4gM7sF7Rz01K7SA9EK8bS03';
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

export const PRECIO_TEXTO = () => `$${Number(process.env.PAGO_PAGINA_MONTO_MXN || 1350).toLocaleString('es-MX')} MXN`;
/** Base de la dirección nuestra para quien no quiere dominio propio: <base>/s/<slug>. */
export const BASE_SIN_DOMINIO = () => (process.env.SITIOS_BASE_URL || 'https://websites.timewins.ai').replace(/\/$/, '');
export const mensajePago = (entrevistaId, { conDominio = true } = {}) => (conDominio
  ? `Ahora, para publicar tu página en tu propia dirección, completa por favor el pago único de *${PRECIO_TEXTO()}* en este enlace:\n${ligaPago(entrevistaId)}`
  : `Ahora, para publicar tu página, completa por favor el pago único de *${PRECIO_TEXTO()}* en este enlace:\n${ligaPago(entrevistaId)}\n\nQuedará en una dirección nuestra (${BASE_SIN_DOMINIO().replace(/^https?:\/\//, '')}/s/…). Si después quieres tu propia dirección, escríbeme *comprar dirección*.`);

/** Estado inicial que se guarda al mandar el enlace. */
export const pagoPendiente = (entrevistaId) => ({ estado: 'pendiente', enlace: ligaPago(entrevistaId), enviado: new Date().toISOString() });

const pagoDe = (brief) => brief?.pago_pagina || null;

async function guardarPago(entrevistaId, patch) {
  await db.q(`UPDATE entrevistas SET brief = jsonb_set(brief, '{pago_pagina}', COALESCE(brief->'pago_pagina','{}'::jsonb) || $2::jsonb), actualizado=now() WHERE id=$1`,
    [entrevistaId, JSON.stringify(patch)]);
}

/**
 * Sin dominio propio (opción decidida 8-nov-2026): paga igual y su página queda publicada en nuestra dirección
 * <SITIOS_BASE_URL>/s/<slug> (deja de ser vista previa: se indexa y lleva canonical), y se entrega el panel ahí.
 * Si el sitio en vivo aún no existe (no ha elegido diseño), el cron de entregas lo publica cuando exista.
 */
export async function publicarSinDominio(entrevistaId) {
  const sv = (await db.q(`SELECT * FROM sitios_vivos WHERE entrevista_id=$1 ORDER BY id DESC LIMIT 1`, [entrevistaId]).catch(() => ({ rows: [] }))).rows[0];
  if (!sv || sv.dominio) return { publicado: false, motivo: sv ? 'tiene dominio propio' : 'sin sitio en vivo aún' };
  const url = `${BASE_SIN_DOMINIO()}/s/${sv.slug}`;
  if (sv.url_publica !== url) {
    await db.q(`UPDATE sitios_vivos SET url_publica=$2, version=version+1, actualizado=now() WHERE id=$1`, [sv.id, url]);
    const { invalidar } = await import('../panel/sitios.js');
    invalidar(sv.id);
  }
  const { entregarAcceso } = await import('./entrega.js');
  const r = await entregarAcceso(entrevistaId, { dominio: url.replace(/^https?:\/\//, ''), panel: 'panel_propio', sitio_vivo_id: sv.id });
  return { publicado: true, url, entrega: r };
}

/** Marca el pago (webhook o confirmación manual) y arranca el flujo de la dirección. Idempotente. */
export async function confirmarPago(entrevistaId, { fuente = 'stripe', payment_intent = null, monto_centavos = null, descuento_centavos = 0, cupon_pct = 0 } = {}) {
  const e = await db.obtener(entrevistaId);
  if (!e) return { ok: false, error: 'no existe' };
  if (pagoDe(e.brief)?.estado === 'pagado') return { ok: true, repetido: true };
  await guardarPago(e.id, { estado: 'pagado', pagado: new Date().toISOString(), fuente, payment_intent, monto_centavos, descuento_centavos, cupon_pct });
  await db.evento(e.id, 'pago_pagina', { fuente, payment_intent, monto_centavos, descuento_centavos, cupon_pct });
  const brief = (await db.obtener(e.id)).brief || {};
  const textos = [monto_centavos === 0 ? '¡Listo, quedó aplicado tu cupón! ✅ Gracias.' : '¡Recibí tu pago! ✅ Gracias.'];
  if (quiereDominio(brief) && dominioRespondido(brief) && !brief.tecnico?.dominio_flujo) {
    try { textos.push(...(await iniciarDominio(e, brief)).textos); }
    catch (err) { console.error('iniciarDominio tras pago', err); textos.push('Ahora reviso lo de tu dirección y en unos minutos te escribo por aquí con los siguientes pasos.'); }
  }
  const sinDominio = !quiereDominio(brief);
  if (sinDominio) textos.push('Ahora la publico y en un momento te mando aquí la liga de tu página y la de tu administrador.');
  await avisar(e.id, textos, { evento: 'pago_pagina_recibido' });
  if (sinDominio) await publicarSinDominio(e.id).catch((err) => console.error('publicarSinDominio', err));
  return { ok: true };
}

// Precio de lista de la página en centavos de MXN (el Payment Link de Stripe cobra esto antes de cupones).
const PRECIO_CENTAVOS = () => Math.round(Number(process.env.PAGO_PAGINA_MONTO_MXN || 1350) * 100);

/** Revisa que la sesión de Stripe sea del cobro de la página: MXN y precio de lista correcto (antes de cupón). */
export function revisarCobro(s) {
  const subtotal = s.amount_subtotal ?? null;
  const total = s.amount_total ?? null;
  const descuento = s.total_details?.amount_discount ?? 0;
  if (String(s.currency || '').toLowerCase() !== 'mxn') return { ok: false, motivo: `moneda ${s.currency}` };
  if (subtotal === null || total === null) return { ok: false, motivo: 'sin montos' };
  if (subtotal < PRECIO_CENTAVOS()) return { ok: false, motivo: `subtotal ${subtotal} menor al precio ${PRECIO_CENTAVOS()}` };
  if (total + descuento < subtotal) return { ok: false, motivo: `total ${total} + descuento ${descuento} no cubre el subtotal ${subtotal}` };
  return { ok: true, subtotal, total, descuento, cupon: descuento > 0 ? Math.round((descuento / subtotal) * 100) : 0 };
}

/** Evento del webhook de Stripe cuyo client_reference_id es de una página.
 *  Acepta 'paid' y también 'no_payment_required' (cupón del 100 %: Stripe no cobra y no lo marca como pagado). */
export async function procesarEventoPagina(ev) {
  const s = ev?.data?.object || {};
  const id = String(s.client_reference_id || '').slice(PREFIJO.length);
  if (!id) return { ignorado: 'sin entrevista' };
  const pagado = s.payment_status === 'paid' || (s.payment_status === 'no_payment_required' && ev.type === 'checkout.session.completed');
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(ev.type) && pagado) {
    const cobro = revisarCobro(s);
    if (!cobro.ok) {
      await db.evento(id, 'pago_pagina_rechazado', { motivo: cobro.motivo, sesion: s.id || null, payment_status: s.payment_status }).catch(() => {});
      console.error('pago página rechazado', id, cobro.motivo);
      return { ignorado: `cobro no válido: ${cobro.motivo}` };
    }
    return confirmarPago(id, { fuente: s.payment_status === 'paid' ? 'stripe' : 'stripe_cupon_100', payment_intent: s.payment_intent || null, monto_centavos: cobro.total, descuento_centavos: cobro.descuento, cupon_pct: cobro.cupon });
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
