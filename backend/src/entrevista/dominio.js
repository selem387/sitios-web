// La dirección de la página (B10) dentro de la entrevista. Ari solo pregunta si ya la tiene comprada y cuál es
// (o cómo le gustaría que se llamara); a partir de ahí lo lleva este módulo:
//   propio: investigar registrador y quién administra el DNS → pasos vigentes de ese proveedor → "listo" → revisar → conectar
//   compra: opciones libres → a nombre de quién (1/2/3) → condiciones → "acepto" → registro en GoDaddy → conexión → aviso
//           Incluida en los $1,350 (decidido 9-nov-2026): solo se proponen las que nos cuestan menos de $50 MXN el 1er año
//           y se registran sin cobrar. Otra que pida el cliente y cueste más se paga aparte (liga de Stripe, como antes).
// Estado en brief.tecnico.dominio_flujo (escrito de forma atómica con patchFlujo).
import * as db from './db.js';
import { pedirJSON, MODELO_MEMORIA } from './claude.js';
import { avisar, avisarEquipo } from './avisos.js';
import { investigar, revisarApuntado, limpiarDominio, esDominio, partes, ipServidor } from '../dominio/registrador.js';
import { guiaParaCliente } from '../dominio/guias.js';
import * as GD from '../dominio/godaddy.js';
import { precioCliente, pesos } from '../dominio/precio.js';
import { patchFlujo, leerFlujo, borrarFlujo, cotizarParaCliente, crearCompra, ligaDePago, registrarIncluida, revisarPago, obtener as obtenerCompra } from '../dominio/compra.js';
import { conectar, estadoConexion, conexionConfigurada } from '../dominio/conexion.js';
import { stripeConfigurado } from '../dominio/stripe.js';
import { disenoElegido } from '../panel/sitios.js';

// Extensiones para sugerencias: incluye las baratas en promoción; el tope en pesos decide cuáles se muestran.
const TLDS = () => (process.env.DOMINIO_TLDS || 'com,mx,com.mx,xyz,online,site,store,shop,space,website,fun,lat,click,link,info,tech').split(',').map((x) => x.trim()).filter(Boolean);
const MAX_USD = () => Number(process.env.DOMINIO_PRECIO_MAX_USD || 60);
// Tope de lo que nos cuesta (1er año, con tipo de cambio y tolerancia) un dominio incluido en el pago de la página.
// Solo se proponen los que están debajo; uno que el cliente pide por nombre y cuesta más se le ofrece pagándolo aparte.
const TOPE_INCLUIDO = () => Number(process.env.DOMINIO_INCLUIDO_MAX_MXN || process.env.DOMINIO_SUGERIDO_MAX_MXN || 50);
export const cabeIncluido = (precio) => Number(precio?.neto_mxn) > 0 && Number(precio.neto_mxn) < TOPE_INCLUIDO();
const MAX_APARTE = 3;
const TLDS_APARTE = () => (process.env.DOMINIO_TLDS_APARTE || 'com,com.mx,mx,net').split(',').map((x) => x.trim()).filter(Boolean);
const PIDE_APARTE = /aparte|pagar(la)? yo|la pago|lo pago|con precio|\.com\b|\.mx\b|otras? opciones? (de|con) pago/i;
const MAX_OPCIONES = 5;
const MAX_BUSQUEDAS = 6;

const DESPUES = /despu[eé]s|luego|m[aá]s tarde|ahorita no|por ahora no|no quiero|lo dejo|olv[ií]dalo|cancel|mejor no|sin direcci[oó]n|no gracias/i;
const LISTO = /^\s*(ya\s+)?(listo|hecho|ya (lo |la )?(hice|cambi\w*|qued\w*|puse)|lo (hice|cambi[eé])|termin[eé])\b.{0,40}$/i;
const RETOMAR = /comprar (una |la |mi )?direcci[oó]n|quiero (mi|una) direcci[oó]n|buscar (una |la |mi )?direcci[oó]n/i;
const PAGUE = /pagu[eé]|ya pag|ya qued[oó] (el )?pago|ya se pag|pago (hecho|listo)/i;
const LIGA = /\b(liga|link|enlace|pagar|otra)\b/i;
const ACEPTO = /\bacept\w*|\bde acuerdo\b|\bestoy de acuerdo\b/i;
const SI_SUELTO = /^\s*(s[ií]+|va+|ok|okey|dale|claro|perfecto|sale)[\s.!]*$/i;

const BLOQUEANTES = new Set(['opciones', 'opciones_aparte', 'titularidad', 'traspaso_email', 'cotizar', 'acuerdos', 'reembolsada', 'buscar']);
const CON_PALABRAS = new Set(['esperando_cambios', 'pago_pendiente', 'pago_vencido']);

const flujoDe = (brief) => brief?.tecnico?.dominio_flujo || null;
export const dominioEnCurso = (brief) => { const f = flujoDe(brief); return Boolean(f && (BLOQUEANTES.has(f.estado) || CON_PALABRAS.has(f.estado))); };

/** "comprar dirección" después de haberla pospuesto (o tras un intento fallido). */
export const quiereRetomar = (brief, texto) => ['pospuesto', 'abandonado', 'reembolsada'].includes(flujoDe(brief)?.estado) && RETOMAR.test(String(texto || ''));
export async function retomarDominio(e, brief) {
  await patchFlujo(e.id, { modo: 'compra', estado: 'buscar', busquedas: 0 });
  return { textos: await pasoBuscar(e, brief, brief?.tecnico?.dominio_deseado || brief?.negocio?.nombre), seguirConAri: false };
}

/** ¿Arrancar el flujo después del turno de Ari? */
export function tocaDominio(brief) {
  const t = brief?.tecnico || {};
  if (flujoDe(brief) || t.quiere_dominio === false) return false;
  if (t.tiene_dominio === true) return esDominio(limpiarDominio(t.dominio));
  if (t.tiene_dominio === false) return Boolean(String(t.dominio_deseado || '').trim());
  return false;
}

/** Texto para Ari: qué está pasando con la dirección, para que no la vuelva a pedir ni prometa nada. */
export function notaParaAri(brief) {
  const f = flujoDe(brief);
  if (!f) return null;
  return `DIRECCIÓN DE LA PÁGINA: la lleva el sistema (modo ${f.modo}, estado ${f.estado}${f.dominio ? `, ${f.dominio}` : ''}). No la vuelvas a pedir, no digas precios, disponibilidad ni pasos; si el cliente pregunta por ella, dile en una frase que ya está en proceso y que le aviso por aquí.`;
}

/* ---------------- Búsqueda de opciones ---------------- */
const base = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'y')
  .replace(/\b(el|la|los|las|de|del|y|mi|tu)\b/g, ' ').replace(/[^a-z0-9]+/g, '').slice(0, 40);

function candidatosExactos(consulta, brief) {
  const txt = String(consulta || '');
  const conTld = [...txt.toLowerCase().matchAll(/[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.[a-z]{2,24}\b/g)].map((m) => limpiarDominio(m[0])).filter(esDominio);
  if (conTld.length) return [...new Set(conTld)].slice(0, 3);
  const nombre = base(txt) || base(brief?.negocio?.nombre);
  if (!nombre || nombre.length < 3) return [];
  return TLDS().slice(0, 3).map((t) => `${nombre}.${t}`);
}

const TLDS_BARATAS = () => (process.env.DOMINIO_TLDS_BARATAS || 'online,site,store,xyz,shop,lat,website,space,tech,fun').split(',').map((x) => x.trim()).filter(Boolean);
/** Nombres base para buscar: lo que pidió (sin terminación), el nombre del negocio y nombre+ciudad. */
function basesDe(consulta, brief) {
  const txt = String(consulta || '').toLowerCase();
  const conTld = (txt.match(/[a-z0-9][a-z0-9-]*(?=\.[a-z]{2,24}\b)/) || [])[0];
  const pedido = (conTld || base(txt)).replace(/[^a-z0-9-]/g, '').slice(0, 40);
  const negocio = base(brief?.negocio?.nombre);
  const ciudad = base(brief?.negocio?.ciudad);
  return [...new Set([pedido, negocio, negocio && ciudad ? `${negocio}${ciudad}` : ''].filter((x) => x && x.length >= 3 && x.length <= 40))];
}

export async function buscarOpciones(consulta, brief) {
  const exactos = candidatosExactos(consulta, brief);
  const vistos = new Set();
  const incluidas = [];
  const aparte = [];
  const pedidoNoLibre = [];
  for (const d of exactos) {
    vistos.add(d);
    const r = await GD.disponibilidad(d).catch(() => null);
    if (r?.disponible && r.precio?.monto && (r.precio.moneda !== 'USD' || r.precio.monto <= MAX_USD()) && (!r.inventario || r.inventario === 'REGISTRY')) {
      const p = await precioCliente(r.precio.monto, r.precio.moneda || 'USD').catch(() => null);
      if (!p) continue;
      if (cabeIncluido(p)) incluidas.push({ dominio: d, incluido: true, exacto: true });
      else aparte.push({ dominio: d, incluido: false, total_mxn: p.total_mxn });
    } else pedidoNoLibre.push(d);
  }
  // Mismo nombre con terminaciones baratas (.online, .site, …): lo más parecido a lo que pidió.
  const bases = basesDe(consulta, brief);
  let revisados = 0;
  for (const bse of bases) {
    for (const tld of TLDS_BARATAS()) {
      if (incluidas.length >= MAX_OPCIONES || revisados >= 14) break;
      const d = `${bse}.${tld}`;
      if (vistos.has(d)) continue;
      vistos.add(d); revisados++;
      const r = await GD.disponibilidad(d).catch(() => null);
      if (!r?.disponible || !r.precio?.monto || (r.inventario && r.inventario !== 'REGISTRY')) continue;
      const p = await precioCliente(r.precio.monto, r.precio.moneda || 'USD').catch(() => null);
      if (cabeIncluido(p)) incluidas.push({ dominio: d, incluido: true, exacto: bse === bases[0] });
    }
  }
  // Respaldo: sugerencias de GoDaddy con nombres cortos.
  const sug = incluidas.length >= MAX_OPCIONES ? [] : await GD.sugerencias(bases[0] || 'negocio', { tlds: TLDS(), pageSize: 40 }).catch((e) => { console.error('sugerencias', e.message); return []; });
  for (const s of sug) {
    if (incluidas.length >= MAX_OPCIONES) break;
    if (vistos.has(s.dominio) || !s.precio?.monto) continue;
    if (s.dominio.split('.')[0].length > 28) continue;
    if (s.inventario && s.inventario !== 'REGISTRY') continue;
    if (s.precio.moneda === 'USD' && s.precio.monto > MAX_USD()) continue;
    const p = await precioCliente(s.precio.monto, s.precio.moneda || 'USD').catch(() => null);
    if (!cabeIncluido(p)) continue;
    vistos.add(s.dominio);
    incluidas.push({ dominio: s.dominio, incluido: true, exacto: false });
  }
  // Primero lo que pidió, luego los más cortos.
  const opciones = incluidas.sort((a, b) => (b.exacto - a.exacto) || (a.dominio.length - b.dominio.length)).slice(0, MAX_OPCIONES).map(({ dominio }) => ({ dominio, incluido: true }));
  return { opciones, aparte: aparte.slice(0, MAX_APARTE), pedidoNoLibre };
}

/** Opciones que se pagan aparte (.com, .com.mx, …) con su precio al cliente: costo de GoDaddy + comisión de la pasarela. */
export async function buscarAparte(consulta, brief) {
  const lista = [];
  for (const bse of basesDe(consulta, brief).slice(0, 2)) {
    for (const tld of TLDS_APARTE()) {
      if (lista.length >= MAX_OPCIONES) break;
      const d = `${bse}.${tld}`;
      if (lista.some((x) => x.dominio === d)) continue;
      const r = await GD.disponibilidad(d).catch(() => null);
      if (!r?.disponible || !r.precio?.monto || (r.inventario && r.inventario !== 'REGISTRY')) continue;
      if (r.precio.moneda === 'USD' && r.precio.monto > MAX_USD()) continue;
      const p = await precioCliente(r.precio.monto, r.precio.moneda || 'USD').catch(() => null);
      if (p && !cabeIncluido(p)) lista.push({ dominio: d, incluido: false, total_mxn: p.total_mxn });
    }
  }
  return lista.sort((a, b) => a.total_mxn - b.total_mxn);
}

async function pasoAparte(e, brief, consulta) {
  let lista;
  try { lista = await buscarAparte(consulta, brief); }
  catch (err) { console.error('buscarAparte', err); return ['No pude revisar los precios en este momento 😕. Escríbeme *pagar aparte* otra vez en un par de minutos.']; }
  if (!lista.length) return ['No encontré direcciones libres con ese nombre para pagar aparte. Escríbeme otra idea de nombre, o elige una de las que vienen incluidas.'];
  await patchFlujo(e.id, { estado: 'opciones_aparte', aparte: lista });
  return [
    `Estas están libres y se pagan aparte. El precio es por 1 año e incluye la comisión del pago con tarjeta:\n\n${lista.map((o, i) => `${i + 1}. *${o.dominio}* · ${pesos(o.total_mxn)}`).join('\n')}`,
    '¿Cuál quieres? Respóndeme con el número. Si mejor prefieres una de las incluidas, escríbeme *incluidas*.',
  ];
}

function mensajeOpciones(opciones, aparte = [], pedidoNoLibre = []) {
  const textos = [];
  const ocupados = pedidoNoLibre.length ? `${pedidoNoLibre.map((d) => `*${d}*`).join(', ')} ya ${pedidoNoLibre.length > 1 ? 'están ocupadas' : 'está ocupada'}. ` : '';
  const caras = aparte.length ? `${aparte.map((o) => `*${o.dominio}*`).join(', ')} ${aparte.length > 1 ? 'están libres' : 'está libre'}, pero no ${aparte.length > 1 ? 'entran' : 'entra'} en tu pago: ${aparte.map((o) => `${o.dominio} cuesta ${pesos(o.total_mxn)}`).join(', ')} por 1 año y se paga aparte. ` : '';
  if (opciones.length) {
    textos.push(`${ocupados}${caras}Estas direcciones están libres y ya vienen *incluidas en tu pago*, sin costo extra (1 año):\n\n${opciones.map((o, i) => `${i + 1}. *${o.dominio}*`).join('\n')}`);
    textos.push('¿Cuál te late? Respóndeme con el número. Si quieres otra terminación, como *.com* o *.com.mx*, esa se paga aparte: escríbeme *pagar aparte* y te muestro las opciones con su precio. Si prefieres dejarlo para después, dime *después* y tu página queda con una dirección temporal.');
  } else {
    textos.push(`${ocupados}${caras}Si quieres pagar una aparte, escríbeme *pagar aparte* y te muestro las opciones con su precio. O dame otra idea de nombre y busco direcciones que vengan incluidas en tu pago.`);
  }
  return textos;
}

const MENSAJE_TITULARIDAD = `Antes de comprarla, una decisión: ¿a nombre de quién queda la dirección?

1️⃣ *A nombre de IAprop*: nosotros la tenemos registrada y tú la usas para tu página. Si algún día la quieres a tu nombre, nos pides que te la pasemos.
2️⃣ *A tu nombre*: después de comprarla te la pasamos a tu propia cuenta de GoDaddy (si no tienes, se abre gratis). Solo aceptas un correo que te llega.
3️⃣ *A nombre de IAprop, con aviso*: igual que la 1, y un mes antes de que se venza te aviso para que decidas si la renuevas o te la llevas.

En las tres se paga solo un año y no se renueva sola: si nadie la renueva, se pierde y alguien más podría comprarla. ¿Cuál prefieres: *1*, *2* o *3*?`;

/* ---------------- Inicio (después del turno de Ari) ---------------- */
export async function iniciarDominio(e, brief) {
  const t = brief.tecnico || {};
  if (t.tiene_dominio === true) {
    const dominio = limpiarDominio(t.dominio);
    let info;
    try { info = await investigar(dominio); } catch (err) { info = { dominio, ...partes(dominio), registrado: null, ns: [], dns_slug: null, registrador_slug: null }; console.error('investigar', err.message); }
    await db.evento(e.id, 'dominio_investigado', { dominio, registrado: info.registrado, registrador: info.registrador, dns: info.dns_slug, ns: info.ns, fuente: info.fuente });
    if (info.registrado === false) {
      await patchFlujo(e.id, { modo: 'compra', estado: 'buscar', dominio, busquedas: 0 });
      const textos = [`Revisé *${dominio}* y no aparece registrada a nombre de nadie: parece que aún no está comprada.`];
      return { textos: [...textos, ...(await pasoBuscar(e, brief, dominio))] };
    }
    const g = await guiaParaCliente(info);
    await patchFlujo(e.id, { modo: 'propio', estado: 'esperando_cambios', dominio, proveedor: g.proveedor, registrador: g.registrador, desde: new Date().toISOString(), recordado: false });
    if (info.vence && new Date(info.vence).getTime() - Date.now() < 30 * 864e5) g.textos.splice(1, 0, `Ojo: según el registro, tu dirección vence el ${new Date(info.vence).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}. Renuévala para no perderla.`);
    return { textos: g.textos };
  }
  // No tiene: buscar opciones con la idea que dio.
  await patchFlujo(e.id, { modo: 'compra', estado: 'buscar', busquedas: 0 });
  return { textos: await pasoBuscar(e, brief, t.dominio_deseado) };
}

async function pasoBuscar(e, brief, consulta) {
  const f = (await leerFlujo(e.id)) || {};
  if ((f.busquedas || 0) >= MAX_BUSQUEDAS) {
    await patchFlujo(e.id, { estado: 'pospuesto' });
    return ['Ya revisamos varias ideas. Dejemos la dirección para después; tu página queda con una dirección temporal y cuando quieras la buscamos juntos (escríbeme *comprar dirección*).'];
  }
  let r;
  try { r = await buscarOpciones(consulta, brief); }
  catch (err) {
    console.error('buscarOpciones', err);
    await patchFlujo(e.id, { estado: 'buscar' });
    return ['No pude revisar las direcciones en este momento 😕. Escríbeme de nuevo la idea de nombre en un par de minutos y lo intento otra vez.'];
  }
  if (!r.opciones.length && !r.aparte.length) {
    await patchFlujo(e.id, { estado: 'buscar', busquedas: (f.busquedas || 0) + 1 });
    return [`No encontré direcciones libres con esa idea${r.pedidoNoLibre.length ? ` (${r.pedidoNoLibre.join(', ')} ya están ocupadas)` : ''}. Dame otra: puede ser el nombre con tu ciudad, con tu giro o una palabra corta. Por ejemplo: _${base(brief?.negocio?.nombre) || 'tunegocio'}${base(brief?.negocio?.ciudad) || 'merida'}.online_`];
  }
  await patchFlujo(e.id, { estado: 'opciones', opciones: r.opciones, aparte: r.aparte, consulta: String(consulta || '').slice(0, 100), busquedas: (f.busquedas || 0) + 1 });
  return mensajeOpciones(r.opciones, r.aparte, r.pedidoNoLibre);
}

/* ---------------- Interpretación de respuestas libres ---------------- */
async function interpretar(estado, texto, contexto) {
  try {
    const { data } = await pedirJSON({
      model: MODELO_MEMORIA,
      max_tokens: 300,
      system: `Interpretas la respuesta de un cliente en WhatsApp mientras compra la dirección (dominio) de su página. Paso actual: ${estado}.
Acciones: elegir (escogió una opción; da su número), buscar (propone otro nombre; da la consulta), posponer (no quiere ahora), aceptar (acepta explícitamente las condiciones), rechazar, pregunta (pregunta algo; contéstala en 1–2 frases sencillas, sin tecnicismos, sin inventar precios), otro.`,
      contenido: `CONTEXTO: ${contexto}\nRESPUESTA DEL CLIENTE: ${texto}`,
      schema: { type: 'object', properties: { accion: { type: 'string', enum: ['elegir', 'buscar', 'posponer', 'aceptar', 'rechazar', 'pregunta', 'otro'] }, numero: { type: 'integer' }, consulta: { type: 'string' }, respuesta: { type: 'string' } }, required: ['accion'] },
    });
    return data;
  } catch { return { accion: 'otro' }; }
}

const posponer = async (e) => {
  await patchFlujo(e.id, { estado: 'pospuesto' });
  return { textos: ['Va, la dirección la dejamos para después. Tu página queda con una dirección temporal de prueba; cuando quieras la buscamos (escríbeme *comprar dirección*).'], seguirConAri: true, notaAri: 'El cliente pospuso la compra de la dirección; no la menciones. Sigue con la siguiente pregunta pendiente.' };
};

/* ---------------- Atender mensaje mientras hay flujo ---------------- */
export async function atenderDominio(e, brief, texto) {
  const f = flujoDe(brief);
  const t = String(texto || '').trim();
  switch (f.estado) {
    case 'buscar':
    case 'reembolsada': {
      if (DESPUES.test(t)) return posponer(e);
      return { textos: await pasoBuscar(e, brief, t), seguirConAri: false };
    }
    case 'opciones': {
      const ops = f.opciones || [];
      const aparte = f.aparte || [];
      if (DESPUES.test(t) && !/\d/.test(t)) return posponer(e);
      // Eligió por nombre una de las que se pagan aparte.
      const cara = aparte.find((o) => t.toLowerCase().includes(o.dominio));
      if (!cara && PIDE_APARTE.test(t) && !/^\D{0,12}?[1-9]\b/.test(t)) return { textos: await pasoAparte(e, brief, (t.match(/[a-z0-9-]+\.[a-z.]{2,10}/i) || [])[0] || f.consulta || brief?.tecnico?.dominio_deseado || brief?.tecnico?.dominio || brief?.negocio?.nombre), seguirConAri: false };
      if (cara) {
        await patchFlujo(e.id, { estado: 'titularidad', dominio: cara.dominio, incluido: false });
        return { textos: [`Va: *${cara.dominio}* ✅ Esta no entra en tu pago; cuesta ${pesos(cara.total_mxn)} por 1 año y te mando la liga para pagarla aparte.`, MENSAJE_TITULARIDAD], seguirConAri: false };
      }
      let n = Number((t.match(/^\D{0,12}?([1-9])\b/) || [])[1]);
      const porNombre = ops.findIndex((o) => t.toLowerCase().includes(o.dominio));
      if (porNombre >= 0) n = porNombre + 1;
      let consulta = null;
      if (!(n >= 1 && n <= ops.length)) {
        const ia = await interpretar('elegir una de las opciones', t, `Opciones: ${ops.map((o, i) => `${i + 1}. ${o.dominio}`).join(' ')}`);
        if (ia.accion === 'elegir' && ia.numero >= 1 && ia.numero <= ops.length) n = ia.numero;
        else if (ia.accion === 'posponer') return posponer(e);
        else if (ia.accion === 'buscar') consulta = ia.consulta || t;
        else if (ia.accion === 'pregunta' && ia.respuesta) return { textos: [`${ia.respuesta}\n\n¿Cuál eliges? Respóndeme con el número, o escríbeme otra idea de nombre.`], seguirConAri: false };
        else consulta = t;
      }
      if (consulta) return { textos: await pasoBuscar(e, brief, consulta), seguirConAri: false };
      const elegido = ops[n - 1].dominio;
      await patchFlujo(e.id, { estado: 'titularidad', dominio: elegido, incluido: true });
      return { textos: [`Buena elección: *${elegido}* ✅`, MENSAJE_TITULARIDAD], seguirConAri: false };
    }
    case 'opciones_aparte': {
      const lista = f.aparte || [];
      if (DESPUES.test(t) && !/\d/.test(t)) return posponer(e);
      if (/inclu/i.test(t)) { await patchFlujo(e.id, { estado: 'buscar' }); return { textos: await pasoBuscar(e, brief, f.consulta || brief?.tecnico?.dominio_deseado || brief?.negocio?.nombre), seguirConAri: false }; }
      let n = Number((t.match(/^\D{0,12}?([1-9])\b/) || [])[1]);
      const porNombre = lista.findIndex((o) => t.toLowerCase().includes(o.dominio));
      if (porNombre >= 0) n = porNombre + 1;
      if (!(n >= 1 && n <= lista.length)) {
        const ia = await interpretar('elegir una dirección de pago aparte', t, `Opciones: ${lista.map((o, i) => `${i + 1}. ${o.dominio} ${pesos(o.total_mxn)}`).join(' ')}`);
        if (ia.accion === 'elegir' && ia.numero >= 1 && ia.numero <= lista.length) n = ia.numero;
        else if (ia.accion === 'posponer' || ia.accion === 'rechazar') return posponer(e);
        else if (ia.accion === 'buscar') return { textos: await pasoAparte(e, brief, ia.consulta || t), seguirConAri: false };
        else return { textos: [`${ia.accion === 'pregunta' && ia.respuesta ? `${ia.respuesta}\n\n` : ''}Respóndeme con el número de la que quieres, o escríbeme *incluidas* para ver las que no tienen costo extra.`], seguirConAri: false };
      }
      const o = lista[n - 1];
      await patchFlujo(e.id, { estado: 'titularidad', dominio: o.dominio, incluido: false });
      return { textos: [`Va: *${o.dominio}* ✅ Cuesta ${pesos(o.total_mxn)} por 1 año; después te mando la liga para pagarla.`, MENSAJE_TITULARIDAD], seguirConAri: false };
    }
    case 'titularidad': {
      let op = Number((t.match(/\b([123])\b/) || [])[1]);
      if (!op) {
        if (/mi nombre|a mi nombre|m[ií]a|mi cuenta/i.test(t)) op = 2;
        else if (/avis/i.test(t)) op = 3;
        else if (/iaprop|ustedes|su nombre|de ustedes/i.test(t)) op = 1;
      }
      if (!op) {
        const ia = await interpretar('elegir a nombre de quién queda: 1 IAprop, 2 a su nombre (traspaso), 3 IAprop con aviso antes de vencer', t, 'Opciones 1, 2, 3');
        if (ia.accion === 'elegir' && [1, 2, 3].includes(ia.numero)) op = ia.numero;
        else if (ia.accion === 'posponer') return posponer(e);
        else return { textos: [`${ia.accion === 'pregunta' && ia.respuesta ? `${ia.respuesta}\n\n` : ''}Respóndeme *1*, *2* o *3*, según cómo quieres que quede la dirección.`], seguirConAri: false };
      }
      const titularidad = { 1: 'iaprop', 2: 'traspaso', 3: 'aviso_vencimiento' }[op];
      if (titularidad === 'traspaso') {
        await patchFlujo(e.id, { estado: 'traspaso_email', titularidad });
        return { textos: ['Perfecto, queda a tu nombre. ¿Cuál es el correo de tu cuenta de GoDaddy? Si no tienes cuenta, escribe *no tengo* y te ayudamos a abrirla cuando ya esté comprada.'], seguirConAri: false };
      }
      await patchFlujo(e.id, { estado: 'cotizar', titularidad });
      return pasoCotizar(e, brief);
    }
    case 'traspaso_email': {
      const correo = (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || null;
      if (!correo && !/no tengo|no la tengo|ninguna|no tengo cuenta/i.test(t)) return { textos: ['Pásame el correo de tu cuenta de GoDaddy, o escribe *no tengo* si aún no tienes cuenta.'], seguirConAri: false };
      await patchFlujo(e.id, { estado: 'cotizar', traspaso_email: correo ? correo.toLowerCase() : null });
      return pasoCotizar(e, brief);
    }
    case 'cotizar':
      return pasoCotizar(e, brief);
    case 'acuerdos': {
      if (ACEPTO.test(t) && !/no acepto|no estoy de acuerdo/i.test(t)) return pasoPagar(e, brief, f);
      if (SI_SUELTO.test(t)) return { textos: ['Para dejar constancia de que aceptas las condiciones del registro, escríbeme la palabra *acepto*.'], seguirConAri: false };
      if (DESPUES.test(t)) return posponer(e);
      const ia = await interpretar('aceptar las condiciones del registro y el total para pasar a pagar', t, `Dominio ${f.dominio}, total ${pesos(f.total_mxn)}`);
      if (ia.accion === 'posponer' || ia.accion === 'rechazar') return posponer(e);
      if (ia.accion === 'buscar') { await patchFlujo(e.id, { estado: 'buscar' }); return { textos: await pasoBuscar(e, brief, ia.consulta || t), seguirConAri: false }; }
      return { textos: [`${ia.respuesta ? `${ia.respuesta}\n\n` : ''}Si estás de acuerdo, escríbeme *acepto* y te mando la liga para pagar. Si prefieres otra dirección, escríbeme el nombre.`], seguirConAri: false };
    }
    case 'pago_pendiente': {
      if (PAGUE.test(t)) {
        const ok = await revisarPago(f.compra_id).catch(() => false);
        if (ok) return { textos: ['¡Sí, ya se acreditó tu pago! ✅ Estoy registrando la dirección; te aviso aquí en unos minutos.'], seguirConAri: false };
        const c = await obtenerCompra(f.compra_id);
        return { textos: [`Todavía no veo el pago. A veces tarda un par de minutos. Si no lo has hecho, aquí está tu liga:\n${c?.stripe_url}`], seguirConAri: false };
      }
      if (/\b(liga|link|enlace)\b/i.test(t)) {
        const c = await obtenerCompra(f.compra_id);
        return { textos: [c?.stripe_url ? `Aquí está tu liga para pagar *${pesos(c.precio.total_mxn)}* por *${c.dominio}*:\n${c.stripe_url}` : `*${c?.dominio || f.dominio}* viene incluida en tu pago; no hay nada que pagar. Ya la estoy registrando y te aviso aquí.`], seguirConAri: false };
      }
      return { textos: [], seguirConAri: true };
    }
    case 'pago_vencido': {
      if (LIGA.test(t) || PAGUE.test(t)) { await patchFlujo(e.id, { estado: 'cotizar' }); return pasoCotizar(e, brief); }
      return { textos: [], seguirConAri: true };
    }
    case 'esperando_cambios': {
      if (!LISTO.test(t)) return { textos: [], seguirConAri: true };
      return revisarYConectar(e, f, { desdeChat: true });
    }
    default:
      return { textos: [], seguirConAri: true };
  }
}

async function pasoCotizar(e, brief) {
  const f = await leerFlujo(e.id);
  let r;
  try { r = await cotizarParaCliente(f.dominio); }
  catch (err) {
    if (err.codigo === 'no_disponible') {
      await patchFlujo(e.id, { estado: 'buscar' });
      return { textos: [`Uy, *${f.dominio}* se acaba de ocupar. Busquemos otra 👇`, ...(await pasoBuscar(e, brief, f.dominio))], seguirConAri: false };
    }
    console.error('cotizar dominio', err);
    await patchFlujo(e.id, { estado: 'cotizar' });
    return { textos: ['No pude confirmar el precio en este momento 😕. Escríbeme cualquier cosa en un par de minutos y lo intento de nuevo.'], seguirConAri: false };
  }
  // Incluida: solo si al cotizar sigue debajo del tope; si subió, pasa a pagarse aparte.
  let incluido = f.incluido === true && cabeIncluido(r.precio);
  const subio = f.incluido === true && !incluido;
  if (!incluido && !stripeConfigurado()) {
    await patchFlujo(e.id, { estado: 'cotizar', incluido: false });
    return { textos: [`${subio ? `El precio de *${f.dominio}* cambió y ya no entra en tu pago. ` : ''}Estoy terminando de habilitar el pago con tarjeta para direcciones que se pagan aparte. Alguien de nuestro equipo te escribe por aquí para completarlo; si prefieres una que venga incluida, escríbeme otra idea de nombre.`], seguirConAri: true, notaAri: 'La compra de la dirección quedó en espera; no la menciones. Sigue con la siguiente pregunta pendiente.' };
  }
  const precio = { ...r.precio, incluido };
  const compraId = await crearCompra(e, { dominio: f.dominio, titularidad: f.titularidad, traspasoEmail: f.traspaso_email, cotizacion: r.cotizacion, precio });
  await patchFlujo(e.id, { estado: 'acuerdos', compra_id: compraId, total_mxn: incluido ? 0 : r.precio.total_mxn, incluido });
  const quien = { iaprop: 'A nombre de IAprop (puedes pedir que te la pasemos cuando quieras)', traspaso: 'A nombre de IAprop mientras se registra; luego te la pasamos a tu cuenta', aviso_vencimiento: 'A nombre de IAprop, con aviso un mes antes de que venza' }[f.titularidad];
  const acuerdos = r.cotizacion.acuerdos.length
    ? r.cotizacion.acuerdos.map((a) => `• ${a.titulo}${a.url ? `: ${a.url}` : ''}`).join('\n')
    : '• Condiciones de registro de GoDaddy: https://www.godaddy.com/legal/agreements/domain-name-registration-agreement';
  const costo = incluido
    ? '• Costo: *incluido en tu pago de la página*, no pagas nada extra'
    : `• Total: *${pesos(r.precio.total_mxn)}*, se paga aparte (ya incluye la comisión del pago con tarjeta)`;
  return {
    textos: [
      `${subio ? `Ojo: el precio de *${f.dominio}* cambió y ya no entra en tu pago. ` : ''}Así queda:\n• Dirección: *${f.dominio}*\n• Vigencia: 1 año, *no se renueva sola*\n• Privacidad de tus datos en el registro: incluida\n• Queda: ${quien}\n${costo}`,
      `Para registrarla hay que aceptar estas condiciones:\n${acuerdos}\n\nSi estás de acuerdo, escríbeme *acepto* y ${incluido ? 'la registro' : 'te mando la liga para pagar con tarjeta'}.`,
    ],
    seguirConAri: false,
  };
}

async function pasoPagar(e, brief, f) {
  const c = await obtenerCompra(f.compra_id);
  // Precio de hace más de 6 h: se vuelve a cotizar para no cobrar de menos o de más.
  if (!c || Date.now() - new Date(c.creado).getTime() > 6 * 3600e3) { await patchFlujo(e.id, { estado: 'cotizar' }); return pasoCotizar(e, brief); }
  if (c.precio?.incluido) {
    await registrarIncluida(c.id, { agreedAt: new Date().toISOString() });
    await db.evento(e.id, 'dominio_acuerdos_aceptados', { compra_id: c.id, acuerdos: c.acuerdos, incluido: true });
    return { textos: [`¡Perfecto! Estoy registrando *${c.dominio}* ✅ En unos minutos te aviso por aquí.`], seguirConAri: false };
  }
  let url;
  try { url = await ligaDePago(c.id, { email: brief.contacto?.email, agreedAt: new Date().toISOString() }); }
  catch (err) {
    console.error('liga de pago', err);
    return { textos: ['No pude generar la liga de pago en este momento 😕. Escríbeme *acepto* otra vez en un par de minutos.'], seguirConAri: false };
  }
  await db.evento(e.id, 'dominio_acuerdos_aceptados', { compra_id: c.id, acuerdos: c.acuerdos });
  await patchFlujo(e.id, { estado: 'pago_pendiente' });
  return {
    textos: [`Aquí está tu liga para pagar *${pesos(c.precio.total_mxn)}* con tarjeta (es de Stripe, segura):\n${url}\n\nVale por 23 horas. En cuanto se acredite registro *${c.dominio}* y te aviso aquí. Mientras, seguimos 👇`],
    seguirConAri: true,
    notaAri: 'El sistema acaba de mandar la liga de pago de la dirección; no la menciones ni la repitas. Sigue con la siguiente pregunta pendiente del bloque actual.',
  };
}

/* ---------------- Dominio propio: revisar y conectar ---------------- */
async function revisarYConectar(e, f, { desdeChat }) {
  const r = await revisarApuntado(f.dominio);
  if (!r.ok) {
    if (!desdeChat) return null;
    const visto = r.a.length ? `todavía veo que apunta a *${r.a.join(', ')}*` : 'todavía no veo el registro nuevo';
    return { textos: [`Revisé *${f.dominio}* y ${visto}. A veces tarda desde unos minutos hasta unas horas en verse. Revisa que el registro *A* diga *${r.ip}*${r.aaaa.length ? ' y borra el registro *AAAA*' : ''}. Yo sigo revisando cada rato y te aviso en cuanto quede.`], seguirConAri: false };
  }
  if (!conexionConfigurada()) {
    await patchFlujo(e.id, { estado: 'apuntado' });
    if (desdeChat) return { textos: ['¡Ya veo tu dirección apuntando a nuestro servidor! ✅ Alguien del equipo termina de conectarla y te aviso aquí.'], seguirConAri: false };
    return null;
  }
  const ent = await db.obtener(e.id);
  try { await conectar({ dominio: f.dominio, sesionId: e.id, dnsCliente: true, elegido: disenoElegido(ent?.brief) }); }
  catch (err) {
    if (err.status === 425) {
      // Sin diseño elegido no se monta nada en su dominio; el cron conecta en cuanto elija.
      await patchFlujo(e.id, { estado: 'apuntado' });
      const t = [`¡Ya veo *${f.dominio}* apuntando a nuestro servidor! ✅ En cuanto elijas una de tus 6 opciones, la pongo en tu dirección.`];
      if (desdeChat) return { textos: t, seguirConAri: false };
      return null;
    }
    if (err.status !== 409) { console.error('conectar propio', err.message); if (desdeChat) return { textos: ['Ya veo tu dirección apuntando bien ✅. Tuve un problema al conectarla; lo reintento en unos minutos y te aviso.'], seguirConAri: false }; return null; } }
  await patchFlujo(e.id, { estado: 'conectando' });
  const extra = r.ok_www ? '' : ` (falta el cambio de *www*; sin él, solo funcionará escrito sin www)`;
  const textos = [`¡Listo, ya veo *${f.dominio}* apuntando a nuestro servidor! ✅${extra} La estoy conectando con tu página y activando el candado de seguridad; tarda unos minutos y te aviso aquí.`];
  if (desdeChat) return { textos, seguirConAri: false };
  await avisar(e.id, textos, { evento: 'dominio_apuntado' });
  return true;
}

/** Cron (cada 10 min): dominios propios esperando el cambio del cliente o terminando de conectarse. */
export async function cronDominiosPropios() {
  const r = await db.q(`SELECT id, brief#>'{tecnico,dominio_flujo}' AS f FROM entrevistas
                        WHERE brief#>>'{tecnico,dominio_flujo,modo}'='propio'
                          AND brief#>>'{tecnico,dominio_flujo,estado}' IN ('esperando_cambios','apuntado','conectando')`);
  for (const { id, f } of r.rows) {
    try {
      if (f.estado === 'esperando_cambios' || f.estado === 'apuntado') {
        const dias = (Date.now() - new Date(f.desde).getTime()) / 864e5;
        if (dias > 14) { await patchFlujo(id, { estado: 'abandonado' }); continue; }
        const hecho = await revisarYConectar({ id }, f, { desdeChat: false });
        if (!hecho && dias > 3 && !f.recordado && f.estado === 'esperando_cambios') {
          await patchFlujo(id, { recordado: true });
          await avisar(id, [`Hola 👋 Todavía no veo el cambio en *${f.dominio}* para que tu página se vea ahí. Cuando tengas 5 minutos, hazlo con los pasos que te mandé (registro *A* con el valor *${ipServidor()}*) y escríbeme *listo*. Si te atoras, dime en qué paso vas.`], { evento: 'dominio_recordatorio' });
        }
      } else if (f.estado === 'conectando') {
        const t = await estadoConexion(f.dominio);
        if (t?.estado === 'listo') {
          await patchFlujo(id, { estado: 'lista', url: t.resultado?.url || `https://${f.dominio}/` });
          await avisar(id, [`Tu página ya se ve en tu dirección 🎉\nhttps://${f.dominio}/\n\nÁbrela en tu celular. En unos minutos te mando aquí la liga para administrarla.`], { evento: 'dominio_listo' });
        } else if (t?.estado === 'error' || t?.estado === 'interrumpido') {
          const n = (f.intentos_conexion || 0) + 1;
          if (n >= 3) {
            await patchFlujo(id, { estado: 'requiere_revision', intentos_conexion: n });
            await avisarEquipo('Dominio propio no se pudo conectar', `${f.dominio} (entrevista ${id}): el microservicio dominios terminó en ${t.estado} 3 veces. Último error: ${t.error || ''}`, id);
            await avisar(id, [`Tu dirección *${f.dominio}* ya apunta bien, pero tuve un detalle al activarla. Alguien del equipo lo está revisando y te aviso aquí en cuanto quede.`], { evento: 'dominio_revision' });
          } else await patchFlujo(id, { estado: 'apuntado', intentos_conexion: n }); // el siguiente ciclo vuelve a lanzar la conexión
        }
      }
    } catch (err) { console.error('cron dominio propio', id, err.message); }
  }
}

export { borrarFlujo, leerFlujo };
