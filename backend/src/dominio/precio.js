// Precio al cliente del dominio: costo de GoDaddy sin margen, en pesos, con
//   1) tolerancia al tipo de cambio (DOMINIO_TOLERANCIA_TC, default 3 %) cuando GoDaddy cobra en otra moneda, y
//   2) la comisión de Stripe trasladada (gross-up), para que IAprop reciba completo el costo.
// Stripe México tarjeta nacional: 3.6 % + MX$3 por cobro, más IVA 16 % sobre la comisión (configurable).
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== undefined ? Number(v) : d);
export const PARAMS = () => ({
  tolerancia: num(process.env.DOMINIO_TOLERANCIA_TC, 0.03),
  pct: num(process.env.STRIPE_COMISION_PCT, 0.036),
  fijo: num(process.env.STRIPE_COMISION_FIJA_MXN, 3),
  iva: num(process.env.STRIPE_IVA, 0.16),
});

let cache = null;
/** Pesos por dólar (FIX de Banxico si hay BANXICO_TOKEN; si no, open.er-api.com; si no, TIPO_CAMBIO_RESPALDO). */
export async function tipoDeCambio(moneda = 'USD') {
  if (moneda === 'MXN') return { tc: 1, fuente: 'misma moneda', fecha: new Date().toISOString() };
  if (cache && cache.moneda === moneda && Date.now() - cache.t < 3600e3) return cache.v;
  let v = null;
  if (moneda === 'USD' && process.env.BANXICO_TOKEN) {
    try {
      const r = await fetch('https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno', { headers: { 'Bmx-Token': process.env.BANXICO_TOKEN, accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      const dato = d?.bmx?.series?.[0]?.datos?.[0];
      const tc = Number(String(dato?.dato || '').replace(',', ''));
      if (tc > 5) v = { tc, fuente: 'Banxico FIX', fecha: dato.fecha };
    } catch { /* siguiente fuente */ }
  }
  if (!v) {
    try {
      const r = await fetch(`https://open.er-api.com/v6/latest/${moneda}`, { signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      const tc = Number(d?.rates?.MXN);
      if (tc > 0) v = { tc, fuente: 'open.er-api.com', fecha: d.time_last_update_utc };
    } catch { /* respaldo */ }
  }
  if (!v && moneda === 'USD' && Number(process.env.TIPO_CAMBIO_RESPALDO) > 5) v = { tc: Number(process.env.TIPO_CAMBIO_RESPALDO), fuente: 'respaldo manual', fecha: null };
  if (!v) throw new Error(`No hay tipo de cambio ${moneda}→MXN disponible`);
  cache = { moneda, t: Date.now(), v };
  return v;
}

/**
 * Cálculo puro. costo en unidades de su moneda (11.99 USD). → desglose en pesos y centavos para Stripe.
 */
export function calcular({ costo, moneda, tc, params = PARAMS() }) {
  const { tolerancia, pct, fijo, iva } = params;
  const tcAplicado = moneda === 'MXN' ? 1 : tc * (1 + tolerancia);
  const neto = costo * tcAplicado;                       // lo que IAprop necesita recibir
  const pctEf = pct * (1 + iva);
  const fijoEf = fijo * (1 + iva);
  const bruto = (neto + fijoEf) / (1 - pctEf);           // lo que se cobra para que, quitando la comisión, quede el neto
  const total = Math.ceil(bruto);                        // pesos cerrados hacia arriba
  return {
    costo, moneda, tc, tc_aplicado: Number(tcAplicado.toFixed(4)), tolerancia,
    costo_mxn: Number((costo * (moneda === 'MXN' ? 1 : tc)).toFixed(2)),
    neto_mxn: Number(neto.toFixed(2)),
    comision_mxn: Number((total * pctEf + fijoEf).toFixed(2)),
    total_mxn: total,
    total_centavos: total * 100,
  };
}

export async function precioCliente(costo, moneda) {
  const { tc, fuente, fecha } = await tipoDeCambio(moneda);
  return { ...calcular({ costo, moneda, tc }), tc_fuente: fuente, tc_fecha: fecha };
}

export const pesos = (n) => `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`;
