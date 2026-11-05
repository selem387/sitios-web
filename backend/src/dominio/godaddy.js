// GoDaddy Domains API v3 (Personal Access Token en GODADDY_PAT; 60 peticiones/min).
// Precios: SimpleMoney {currencyCode, value} con decimales implícitos ISO-4217 (USD 1199 = 11.99).
// Pruebas sin cobro: GODADDY_URL=https://api.ote-godaddy.com con un PAT de OTE.
const BASE = () => (process.env.GODADDY_URL || 'https://api.godaddy.com').replace(/\/$/, '');
const PAT = () => process.env.GODADDY_PAT || '';

export class ErrorGoDaddy extends Error {
  constructor(status, cuerpo, ruta) {
    super(`GoDaddy ${ruta} → ${status} ${cuerpo?.name || ''} ${cuerpo?.message || ''}`.trim());
    this.status = status; this.codigo = cuerpo?.name || cuerpo?.code || null; this.cuerpo = cuerpo;
  }
}

async function gd(metodo, ruta, { cuerpo, headers = {}, timeout = 30000 } = {}) {
  if (!PAT()) throw new Error('Falta GODADDY_PAT en el servicio api');
  const r = await fetch(`${BASE()}${ruta}`, {
    method: metodo,
    headers: { authorization: `Bearer ${PAT()}`, accept: 'application/json', ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  const t = await r.text();
  let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = { message: t.slice(0, 300) }; }
  if (!r.ok) throw new ErrorGoDaddy(r.status, d, `${metodo} ${ruta.split('?')[0]}`);
  return d;
}

const DECIMALES = { JPY: 0, CLP: 0, KRW: 0 };
/** SimpleMoney → número en unidades de la moneda (11.99). */
export const monto = (m) => (m && Number.isFinite(Number(m.value)) ? Number(m.value) / 10 ** (DECIMALES[m.currencyCode] ?? 2) : null);

/** Precio del primer año de una lista prices[] de v3. */
export function precioUnAnio(prices = []) {
  const p = prices.find((x) => Number(x.period) === 1 && (!x.term || /year|annual|anual|1/i.test(String(x.term)))) || prices.find((x) => Number(x.period) === 1);
  if (!p) return null;
  return { monto: monto(p.price), moneda: p.price?.currencyCode, renovacion: monto(p.renewalPrice) };
}

export async function sugerencias(consulta, { tlds = [], pageSize = 10 } = {}) {
  const qs = new URLSearchParams({ query: String(consulta).slice(0, 100), pageSize: String(pageSize) });
  if (tlds.length) qs.set('tlds', tlds.join(','));
  const d = await gd('GET', `/v3/domains/suggestions?${qs}`);
  return (d?.items || []).map((x) => ({ dominio: String(x.domain).toLowerCase(), inventario: x.inventory, precio: precioUnAnio(x.prices) }));
}

export async function disponibilidad(dominio) {
  const d = await gd('GET', `/v3/domains/check-availability?domain=${encodeURIComponent(dominio)}`);
  return { dominio: String(d?.domain || dominio).toLowerCase(), disponible: d?.available === true, definitivo: d?.definitive === true, inventario: d?.inventory, precio: precioUnAnio(d?.prices), error: d?.error || null };
}

/** Cotización: fija precio y acuerdos 10 minutos. */
export async function cotizar(dominio, period = 1) {
  const d = await gd('POST', '/v3/domains/registration-quotes', { cuerpo: { domain: dominio, period } });
  const fees = Array.isArray(d?.fees) ? d.fees : [];
  return {
    dominio: d?.domain || dominio,
    disponible: d?.available !== false,
    quoteToken: d?.quoteToken,
    expira: d?.expiresAt || null,
    period: d?.period || period,
    precio: { monto: monto(d?.price), moneda: d?.price?.currencyCode },
    fees,
    fees_monto: fees.reduce((s, f) => s + (monto(f.fee) || 0), 0),
    acuerdos: (d?.requiredAgreements || []).map((a) => ({ tipo: a.agreementType, titulo: a.title || a.agreementType, url: a.url || null })),
    crudo: d,
  };
}

/** Registra (cobra a la cuenta de IAprop, irreversible). idempotencia: misma llave = misma operación. */
export async function registrar({ dominio, period = 1, quoteToken, acuerdos, agreedAt, fees = [], idempotencia }) {
  const consent = { agreementTypes: acuerdos, agreedAt };
  if (fees.length) consent.acknowledgedFees = fees.map((f) => ({ type: f.type, fee: f.fee }));
  const d = await gd('POST', '/v3/domains/registrations', {
    cuerpo: { domain: dominio, period, quoteToken, consent },
    headers: { 'Idempotency-Key': idempotencia },
    timeout: 60000,
  });
  return { id: d?.registrationId || d?.id || d?.operationId, estado: d?.status || 'CONFIRMED', crudo: d };
}

export async function estadoRegistro(id) {
  const d = await gd('GET', `/v3/domains/registrations/${encodeURIComponent(id)}`);
  return { id, estado: d?.status, crudo: d };
}

export async function dominioEnCuenta(dominio) {
  try { return await gd('GET', `/v3/domains/domain-names/${encodeURIComponent(dominio)}`); }
  catch (e) { if (e.status === 404) return null; throw e; }
}

/** Apaga la renovación automática (v3; respaldo v1 PATCH renewAuto). */
export async function sinRenovacion(dominio) {
  try { await gd('POST', `/v3/domains/domain-names/${encodeURIComponent(dominio)}/auto-renew`, { cuerpo: false }); return 'v3'; }
  catch (e) {
    if (![404, 405, 501].includes(e.status)) throw e;
    await gd('PATCH', `/v1/domains/${encodeURIComponent(dominio)}`, { cuerpo: { renewAuto: false } });
    return 'v1';
  }
}
