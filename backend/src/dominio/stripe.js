// Stripe por REST (sin SDK): Checkout Session, consulta, reembolso y firma del webhook.
// Variables: STRIPE_SECRET_KEY (sk_live_… o sk_test_…), STRIPE_WEBHOOK_SECRET (whsec_…).
import crypto from 'node:crypto';

const KEY = () => process.env.STRIPE_SECRET_KEY || '';
export const stripeConfigurado = () => Boolean(KEY());

// Objeto anidado → x-www-form-urlencoded con corchetes (line_items[0][price_data][currency]=mxn).
export function formulario(obj, prefijo = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const clave = prefijo ? `${prefijo}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? formulario(x, `${clave}[${i}]`, out) : out.append(`${clave}[${i}]`, String(x))));
    else if (typeof v === 'object') formulario(v, clave, out);
    else out.append(clave, String(v));
  }
  return out;
}

async function st(metodo, ruta, cuerpo, idempotencia) {
  if (!KEY()) throw new Error('Falta STRIPE_SECRET_KEY en el servicio api');
  const r = await fetch(`https://api.stripe.com/v1${ruta}`, {
    method: metodo,
    headers: { authorization: `Bearer ${KEY()}`, ...(cuerpo ? { 'content-type': 'application/x-www-form-urlencoded' } : {}), ...(idempotencia ? { 'Idempotency-Key': idempotencia } : {}) },
    body: cuerpo ? formulario(cuerpo).toString() : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Stripe ${metodo} ${ruta} → ${r.status} ${d?.error?.message || ''}`);
  return d;
}

export function crearCheckout({ compraId, dominio, centavos, email, exito, cancelar, horas = 23 }) {
  return st('POST', '/checkout/sessions', {
    mode: 'payment',
    locale: 'es-419',
    client_reference_id: compraId,
    customer_email: email || undefined,
    expires_at: Math.floor(Date.now() / 1000) + Math.round(horas * 3600),
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'mxn',
        unit_amount: centavos,
        product_data: { name: `Dominio ${dominio} (1 año)`, description: 'Registro por 1 año, privacidad de datos incluida, sin renovación automática.' },
      },
    }],
    metadata: { compra_id: compraId, dominio },
    payment_intent_data: { metadata: { compra_id: compraId, dominio }, description: `Dominio ${dominio} (1 año)` },
    success_url: exito,
    cancel_url: cancelar,
  }, `checkout-${compraId}-${centavos}`);
}

export const obtenerCheckout = (id) => st('GET', `/checkout/sessions/${encodeURIComponent(id)}`);
export const reembolsar = (paymentIntent, motivo = 'requested_by_customer') =>
  st('POST', '/refunds', { payment_intent: paymentIntent, reason: motivo }, `refund-${paymentIntent}`);

/** Verifica la firma "Stripe-Signature: t=…,v1=…" sobre el cuerpo crudo. Devuelve el evento o lanza. */
export function verificarWebhook(cuerpoCrudo, firma, secreto = process.env.STRIPE_WEBHOOK_SECRET, toleranciaSeg = 300) {
  if (!secreto) throw new Error('Falta STRIPE_WEBHOOK_SECRET');
  const partes = Object.fromEntries(String(firma || '').split(',').map((p) => p.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v]));
  const v1 = String(firma || '').split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
  const t = Number(partes.t);
  if (!t || !v1.length) throw new Error('firma incompleta');
  if (Math.abs(Date.now() / 1000 - t) > toleranciaSeg) throw new Error('firma vencida');
  const esperado = crypto.createHmac('sha256', secreto).update(`${t}.${cuerpoCrudo}`, 'utf8').digest('hex');
  const ok = v1.some((s) => s.length === esperado.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(esperado)));
  if (!ok) throw new Error('firma inválida');
  return JSON.parse(cuerpoCrudo);
}
