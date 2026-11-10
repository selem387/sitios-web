// La dirección de la página (B10, incluida en el pago desde 9-nov-2026) dentro de la entrevista. Ari solo pregunta si ya la tiene comprada y cuál es
// (o cómo le gustaría que se llamara); a partir de ahí lo lleva este módulo:
//   propio: investigar registrador y quién administra el DNS → pasos vigentes de ese proveedor → "listo" → revisar → conectar
//   compra: opciones libres → a nombre de quién (1/2/3) → condiciones → "acepto" → registro en GoDaddy → conexión → aviso
//           Incluida en los $1,350 (decidido 9-nov-2026): solo se proponen las que nos cuestan menos de $50 MXN el 1er año
//           y se registran sin cobrar. Otra que pida el cliente y cueste más se paga aparte (liga de Stripe, como antes).
// Estado en brief.tecnico.dominio_flujo (escrito de forma atómica con patchFlujo).
import { ligaCorta } from './ligas.js';
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
// Liga corta de Stripe para un dominio que se paga aparte (registro en ligas_pago).
const corta = (c, url) => (url ? ligaCorta({ entrevistaId: c.entrevista_id, tipo: 'dominio', referencia: String(c.id), destino: url, montoMxn: c.precio?.total_mxn ?? null, descripcion: `Dominio ${c.dominio}` }) : url);
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
    } else if (r && r.disponible === false) pedidoNoLibre.push(d); // solo si de verdad está ocupada (no por precio ni por error)
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

/* ---------------- Interpretación con IA (cualquier respuesta fuera del libreto) ---------------- */
// Cada mensaje que no es una respuesta inequívoca al paso pasa por la IA, que decide qué quiere el cliente:
// contestar el paso, cambiar de dirección, regresar al paso anterior, preguntar, posponer o hablar de otra cosa.
// Si no queda claro (p. ej. "listo" en la búsqueda), se le pregunta qué quiso decir con opciones numeradas.
const PASOS = {
  buscar: 'dar una idea de nombre para buscar la dirección (dominio) de su página',
  reembolsada: 'dar una idea de nombre para buscar otra dirección',
  opciones: 'elegir por número una de las direcciones incluidas en su pago',
  opciones_aparte: 'elegir por número una dirección que se paga aparte',
  titularidad: 'decidir a nombre de quién queda la dirección: 1 IAprop, 2 a su nombre (se la pasamos a su cuenta de GoDaddy), 3 IAprop con aviso un mes antes de vencer',
  traspaso_email: 'dar el correo de su cuenta de GoDaddy o decir que no tiene cuenta',
  acuerdos: 'escribir "acepto" para aceptar las condiciones del registro',
};
const ANTERIOR = { opciones: 'buscar', opciones_aparte: 'opciones', titularidad: 'opciones', traspaso_email: 'titularidad', acuerdos: 'titularidad' };
const ACCIONES = ['responder', 'cambiar_direccion', 'ver_aparte', 'ver_incluidas', 'regresar', 'posponer', 'aceptar', 'rechazar', 'pregunta', 'aclarar', 'otro_tema'];
const CORTO = (t) => t.length <= 25; // los atajos por número/palabra clave solo valen en respuestas cortas

async function entender(e, f, texto, brief) {
  let recientes = '';
  try {
    recientes = (await db.ultimosMensajes(e.id, 8))
      .map((m) => `${m.rol === 'cliente' ? 'CLIENTE' : 'ARI'}: ${String(m.transcripcion || m.contenido || '').replace(/\s+/g, ' ').slice(0, 350)}`).join('\n');
  } catch { /* sin historial */ }
  const contexto = [
    `Negocio: ${brief?.negocio?.nombre || '?'}`,
    f.dominio ? `Dirección elegida: ${f.dominio}${f.incluido === false ? ' (se paga aparte)' : ' (incluida en su pago)'}` : null,
    f.opciones?.length ? `Opciones incluidas que se le mostraron: ${f.opciones.map((o, i) => `${i + 1}. ${o.dominio}`).join(' · ')}` : null,
    f.aparte?.length ? `Opciones de pago aparte: ${f.aparte.map((o, i) => `${i + 1}. ${o.dominio}${o.total_mxn ? ` ${pesos(o.total_mxn)}` : ''}`).join(' · ')}` : null,
    f.titularidad ? `A nombre de: ${f.titularidad}` : null,
    f.total_mxn != null ? `Total a pagar por la dirección: ${pesos(f.total_mxn)}` : null,
  ].filter(Boolean).join('\n');
  try {
    const { data } = await pedirJSON({
      model: MODELO_MEMORIA,
      max_tokens: 500,
      system: `Interpretas lo que escribe por WhatsApp un cliente mientras consigue la dirección (dominio) de su página. El cliente no tiene que seguir el libreto: entiende qué quiere y elige la acción que lo cumple.
Paso actual: ${PASOS[f.estado] || f.estado}.
Acciones:
- responder: contesta el paso actual. numero = opción elegida; correo = si dio uno; sin_cuenta = true si dice que no tiene cuenta de GoDaddy; consulta = idea de nombre SOLO si de verdad es un nombre o palabra para su dirección.
- cambiar_direccion: quiere una dirección distinta a la elegida o a las mostradas. direccion = la dirección completa si la escribió (ej. minegocio.xyz); si no, consulta = su idea de nombre.
- ver_aparte: quiere .com, .com.mx u otras con costo. ver_incluidas: quiere ver las que no cuestan extra.
- regresar: quiere volver a la pregunta o paso anterior, o cambiar algo que ya contestó.
- posponer: no quiere la dirección ahora. aceptar: acepta explícitamente las condiciones. rechazar: no acepta.
- pregunta: tiene una duda sobre este paso; respuesta = 1 a 3 frases sencillas, sin tecnicismos, sin inventar precios ni prometer lo que no esté en el contexto.
- aclarar: no queda claro qué quiere, o la palabra no tiene sentido como respuesta a este paso (p. ej. "listo", "ok", "ya", "gracias" cuando se le pidió un nombre). respuesta = una pregunta breve de qué quiso decir; opciones = 2 a 4 interpretaciones posibles, cada una con texto (cómo se le muestra), accion (una de las otras acciones) y, si aplica, numero/direccion/consulta. Nunca uses una palabra así como nombre de dirección sin preguntar.
- otro_tema: habla de otra cosa (su página, fotos, textos, cambios, el pago de la página, saludos) que no es la dirección.
Si mezcla una respuesta con otra petición, elige lo que quiere hacer AHORA ("la 2, pero mejor quiero x.com" es cambiar_direccion). Usa los mensajes recientes para entender referencias como "la anterior" o "esa".`,
      contenido: `${contexto}\n\nMENSAJES RECIENTES:\n${recientes || '(sin historial)'}\n\nMENSAJE NUEVO DEL CLIENTE: ${texto}`,
      schema: {
        type: 'object',
        properties: {
          accion: { type: 'string', enum: ACCIONES },
          numero: { type: 'integer' }, correo: { type: 'string' }, sin_cuenta: { type: 'boolean' },
          direccion: { type: 'string' }, consulta: { type: 'string' }, respuesta: { type: 'string' },
          opciones: { type: 'array', items: { type: 'object', properties: { texto: { type: 'string' }, accion: { type: 'string', enum: ACCIONES.filter((a) => a !== 'aclarar') }, numero: { type: 'integer' }, direccion: { type: 'string' }, consulta: { type: 'string' } }, required: ['texto', 'accion'] } },
        },
        required: ['accion'],
      },
    });
    return data?.accion ? data : { accion: 'aclarar' };
  } catch (err) { console.error('dominio entender', err.message); return { accion: 'aclarar' }; }
}

/** Recordatorio de lo que falta en el paso actual (para cerrar una respuesta o una aclaración). */
function recordatorio(f) {
  switch (f.estado) {
    case 'buscar': case 'reembolsada': return 'Escríbeme una idea de nombre para tu dirección (por ejemplo, el nombre de tu negocio) y busco las que están libres.';
    case 'opciones': return '¿Cuál te late? Respóndeme con el número, escríbeme otra idea de nombre, o *pagar aparte* si quieres .com o .com.mx.';
    case 'opciones_aparte': return 'Respóndeme con el número de la que quieres, o escríbeme *incluidas* para ver las que no tienen costo extra.';
    case 'titularidad': return `Para *${f.dominio}*: ¿a nombre de quién queda? *1* IAprop, *2* a tu nombre, *3* IAprop con aviso antes de vencer. Si prefieres otra dirección, escríbemela.`;
    case 'traspaso_email': return 'Pásame el correo de tu cuenta de GoDaddy, o escribe *no tengo* si aún no tienes cuenta.';
    case 'acuerdos': return 'Si estás de acuerdo, escríbeme *acepto*. Si prefieres otra dirección, escríbeme el nombre.';
    default: return '';
  }
}

/** Cambia la dirección elegida por otra: si la escribió completa y está libre, la toma; si no, busca opciones. */
async function cambiarDireccion(e, brief, f, consulta) {
  const exacta = /\.[a-z]{2,}/i.test(String(consulta || '')) ? candidatosExactos(consulta, brief)[0] : null;
  if (!exacta) { await patchFlujo(e.id, { estado: 'buscar' }); return { textos: await pasoBuscar(e, brief, consulta), seguirConAri: false }; }
  let r;
  try { r = await buscarOpciones(exacta, brief); }
  catch (err) { console.error('buscarOpciones', err); return { textos: ['No pude revisar esa dirección en este momento 😕. Escríbemela de nuevo en un par de minutos.'], seguirConAri: false }; }
  const inc = r.opciones.find((o) => o.dominio === exacta);
  const ap = r.aparte.find((o) => o.dominio === exacta);
  const base = { opciones: r.opciones, aparte: r.aparte, consulta: exacta, titularidad: null, traspaso_email: null, compra_id: null, total_mxn: null };
  if (inc) {
    await patchFlujo(e.id, { ...base, estado: 'titularidad', dominio: exacta, incluido: true });
    return { textos: [`Va, cambiamos a *${exacta}* ✅ Está libre y viene incluida en tu pago.`, MENSAJE_TITULARIDAD], seguirConAri: false };
  }
  if (ap) {
    await patchFlujo(e.id, { ...base, estado: 'titularidad', dominio: exacta, incluido: false });
    return { textos: [`*${exacta}* está libre, pero no entra en tu pago: cuesta ${pesos(ap.total_mxn)} por 1 año y te mando la liga para pagarla aparte. Si mejor quieres una incluida, escríbeme *incluidas*.`, MENSAJE_TITULARIDAD], seguirConAri: false };
  }
  if (!r.opciones.length && !r.aparte.length) { await patchFlujo(e.id, { estado: 'buscar' }); return { textos: await pasoBuscar(e, brief, exacta), seguirConAri: false }; }
  await patchFlujo(e.id, { ...base, estado: 'opciones' });
  return { textos: mensajeOpciones(r.opciones, r.aparte, r.pedidoNoLibre.length ? r.pedidoNoLibre : [exacta]), seguirConAri: false };
}

/** Vuelve al paso anterior y le repite esa pregunta. */
async function regresar(e, brief, f) {
  const ant = ANTERIOR[f.estado];
  if (ant === 'opciones' && f.opciones?.length) { await patchFlujo(e.id, { estado: 'opciones' }); return { textos: ['Claro, regresamos 👇', ...mensajeOpciones(f.opciones, f.aparte || [])], seguirConAri: false }; }
  if (ant === 'titularidad') { await patchFlujo(e.id, { estado: 'titularidad', compra_id: null, total_mxn: null }); return { textos: ['Claro, regresamos 👇', MENSAJE_TITULARIDAD], seguirConAri: false }; }
  await patchFlujo(e.id, { estado: 'buscar' });
  return { textos: ['Claro, regresamos. Escríbeme la idea de nombre que quieres para tu dirección y busco las que están libres.'], seguirConAri: false };
}

/** Aplica lo que entendió la IA cuando el mensaje no es una respuesta directa al paso. → resultado o null si es "responder". */
async function desvio(e, brief, f, ia, t) {
  switch (ia.accion) {
    case 'posponer': return posponer(e);
    case 'rechazar': return ['acuerdos', 'opciones_aparte'].includes(f.estado) ? posponer(e) : { textos: [recordatorio(f)], seguirConAri: false };
    case 'cambiar_direccion': return cambiarDireccion(e, brief, f, ia.direccion || ia.consulta || t);
    case 'ver_aparte': return { textos: await pasoAparte(e, brief, f.consulta || brief?.tecnico?.dominio_deseado || brief?.negocio?.nombre), seguirConAri: false };
    case 'ver_incluidas': await patchFlujo(e.id, { estado: 'buscar' }); return { textos: await pasoBuscar(e, brief, f.consulta || brief?.tecnico?.dominio_deseado || brief?.negocio?.nombre), seguirConAri: false };
    case 'regresar': return regresar(e, brief, f);
    case 'pregunta': return { textos: [[ia.respuesta, recordatorio(f)].filter(Boolean).join('\n\n')], seguirConAri: false };
    case 'otro_tema':
      return { textos: [], seguirConAri: true, notaAri: `El cliente escribió de otra cosa mientras estaba en el paso de la dirección (${PASOS[f.estado] || f.estado}). Atiende lo que pide con normalidad y al final recuérdale en una frase lo que falta: ${recordatorio(f)}` };
    case 'responder': case 'aceptar': return null;
    default: { // aclarar (o no se entendió): preguntar qué quiso decir, con opciones numeradas
      const ops = (Array.isArray(ia.opciones) ? ia.opciones : []).filter((o) => o?.texto && o.accion && o.accion !== 'aclarar').slice(0, 4);
      if (!ops.length) return { textos: [`No estoy seguro de qué quisiste decir con "${t.slice(0, 60)}" 🤔\n\n${recordatorio(f)}`], seguirConAri: false };
      await patchFlujo(e.id, { aclaracion: { opciones: ops, estado: f.estado } });
      return { textos: [`${ia.respuesta || `¿Qué quisiste decir con "${t.slice(0, 60)}"?`}\n\n${ops.map((o, i) => `${i + 1}. ${o.texto}`).join('\n')}\n\nRespóndeme con el número o escríbemelo con tus palabras.`], seguirConAri: false };
    }
  }
}

const posponer = async (e) => {
  await patchFlujo(e.id, { estado: 'pospuesto' });
  return { textos: ['Va, la dirección la dejamos para después. Tu página queda con una dirección temporal de prueba; cuando quieras la buscamos (escríbeme *comprar dirección*).'], seguirConAri: true, notaAri: 'El cliente pospuso la compra de la dirección; no la menciones. Sigue con la siguiente pregunta pendiente.' };
};

/* ---------------- Atender mensaje mientras hay flujo ---------------- */
const PASOS_IA = new Set(['buscar', 'reembolsada', 'opciones', 'opciones_aparte', 'titularidad', 'traspaso_email', 'acuerdos']);
const NUM_SOLO = /^\D{0,12}?([1-9])\D{0,12}$/;
const tieneDominio = (t) => /[a-z0-9][a-z0-9-]*\.[a-z]{2,}(\.[a-z]{2,})?\b/i.test(t);
const indicePorNombre = (lista, t) => (lista || []).findIndex((o) => t.toLowerCase().includes(o.dominio));

/** Respuestas inequívocas que no necesitan IA (cortas y sin ambigüedad). → intención o null. */
function atajoDelPaso(f, t) {
  const n = tieneDominio(t) ? NaN : Number((t.match(NUM_SOLO) || [])[1]); // "listo2.shop" no es la opción 2
  switch (f.estado) {
    case 'buscar': case 'reembolsada':
      if (CORTO(t) && tieneDominio(t)) return { accion: 'responder', consulta: t };
      return null; // una palabra suelta ("listo", "ok") la evalúa la IA antes de buscarla
    case 'opciones': {
      const i = indicePorNombre(f.opciones, t);
      if (i >= 0 && CORTO(t)) return { accion: 'responder', numero: i + 1 };
      if (indicePorNombre(f.aparte, t) >= 0 && CORTO(t)) return { accion: 'cambiar_direccion', direccion: f.aparte[indicePorNombre(f.aparte, t)].dominio };
      if (CORTO(t) && n >= 1 && n <= (f.opciones || []).length) return { accion: 'responder', numero: n };
      if (CORTO(t) && /^(pagar )?aparte$/i.test(t.trim())) return { accion: 'ver_aparte' };
      return null;
    }
    case 'opciones_aparte': {
      const i = indicePorNombre(f.aparte, t);
      if (i >= 0 && CORTO(t)) return { accion: 'responder', numero: i + 1 };
      if (CORTO(t) && n >= 1 && n <= (f.aparte || []).length) return { accion: 'responder', numero: n };
      if (/^\s*incluidas?\s*$/i.test(t)) return { accion: 'ver_incluidas' };
      return null;
    }
    case 'titularidad':
      if (CORTO(t) && [1, 2, 3].includes(n)) return { accion: 'responder', numero: n };
      return null;
    case 'traspaso_email': {
      const correo = (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
      if (correo && t.length <= 80) return { accion: 'responder', correo };
      if (CORTO(t) && /^\s*no (la )?tengo( cuenta)?\s*\.?$/i.test(t)) return { accion: 'responder', sin_cuenta: true };
      return null;
    }
    case 'acuerdos':
      if (CORTO(t) && ACEPTO.test(t) && !/no acepto|no estoy de acuerdo/i.test(t)) return { accion: 'aceptar' };
      return null;
    default: return null;
  }
}

/** Ejecuta la respuesta al paso actual con la intención ya entendida. */
async function responderPaso(e, brief, f, ia, t) {
  switch (f.estado) {
    case 'buscar': case 'reembolsada': {
      const consulta = ia.direccion || ia.consulta;
      if (!consulta) return { textos: [recordatorio(f)], seguirConAri: false };
      return { textos: await pasoBuscar(e, brief, consulta), seguirConAri: false };
    }
    case 'opciones': {
      const ops = f.opciones || [];
      if (ia.numero >= 1 && ia.numero <= ops.length) {
        const elegido = ops[ia.numero - 1].dominio;
        await patchFlujo(e.id, { estado: 'titularidad', dominio: elegido, incluido: true });
        return { textos: [`Buena elección: *${elegido}* ✅`, MENSAJE_TITULARIDAD], seguirConAri: false };
      }
      if (ia.direccion || ia.consulta) return cambiarDireccion(e, brief, f, ia.direccion || ia.consulta);
      return { textos: [recordatorio(f)], seguirConAri: false };
    }
    case 'opciones_aparte': {
      const lista = f.aparte || [];
      if (ia.numero >= 1 && ia.numero <= lista.length) {
        const o = lista[ia.numero - 1];
        await patchFlujo(e.id, { estado: 'titularidad', dominio: o.dominio, incluido: false });
        return { textos: [`Va: *${o.dominio}* ✅ Cuesta ${pesos(o.total_mxn)} por 1 año; después te mando la liga para pagarla.`, MENSAJE_TITULARIDAD], seguirConAri: false };
      }
      if (ia.direccion || ia.consulta) return { textos: await pasoAparte(e, brief, ia.direccion || ia.consulta), seguirConAri: false };
      return { textos: [recordatorio(f)], seguirConAri: false };
    }
    case 'titularidad': {
      const titularidad = { 1: 'iaprop', 2: 'traspaso', 3: 'aviso_vencimiento' }[ia.numero];
      if (!titularidad) return { textos: [recordatorio(f)], seguirConAri: false };
      if (titularidad === 'traspaso') {
        await patchFlujo(e.id, { estado: 'traspaso_email', titularidad });
        return { textos: ['Perfecto, queda a tu nombre. ¿Cuál es el correo de tu cuenta de GoDaddy? Si no tienes cuenta, escribe *no tengo* y te ayudamos a abrirla cuando ya esté comprada.'], seguirConAri: false };
      }
      await patchFlujo(e.id, { estado: 'cotizar', titularidad });
      return pasoCotizar(e, brief);
    }
    case 'traspaso_email': {
      const correo = (String(ia.correo || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0] || null;
      if (!correo && !ia.sin_cuenta) return { textos: [recordatorio(f)], seguirConAri: false };
      await patchFlujo(e.id, { estado: 'cotizar', traspaso_email: correo ? correo.toLowerCase() : null });
      return pasoCotizar(e, brief);
    }
    case 'acuerdos':
      if (ia.accion === 'aceptar' && ACEPTO.test(t) && !/no acepto|no estoy de acuerdo/i.test(t)) return pasoPagar(e, brief, f);
      return { textos: ['Para dejar constancia de que aceptas las condiciones del registro, escríbeme la palabra *acepto*. Si prefieres otra dirección, escríbeme el nombre.'], seguirConAri: false };
    default: return { textos: [recordatorio(f)], seguirConAri: false };
  }
}

export async function atenderDominio(e, brief, texto) {
  const f = flujoDe(brief);
  const t = String(texto || '').trim();
  if (PASOS_IA.has(f.estado)) {
    let ia = null;
    // Respuesta a una aclaración ("¿qué quisiste decir?"): el número elige la interpretación.
    if (f.aclaracion) {
      const ops = f.aclaracion.estado === f.estado ? (f.aclaracion.opciones || []) : [];
      await patchFlujo(e.id, { aclaracion: null });
      const n = Number((t.match(NUM_SOLO) || [])[1]);
      if (CORTO(t) && n >= 1 && n <= ops.length) ia = ops[n - 1];
    }
    if (!ia) ia = atajoDelPaso(f, t);
    if (!ia && CORTO(t) && DESPUES.test(t) && !/\d/.test(t)) ia = { accion: 'posponer' };
    if (!ia) ia = await entender(e, f, t, brief);
    const r = await desvio(e, brief, f, ia, t);
    if (r) return r;
    return responderPaso(e, brief, f, ia, t);
  }
  switch (f.estado) {
    case 'cotizar':
      return pasoCotizar(e, brief);
    case 'pago_pendiente': {
      if (PAGUE.test(t)) {
        const ok = await revisarPago(f.compra_id).catch(() => false);
        if (ok) return { textos: ['¡Sí, ya se acreditó tu pago! ✅ Estoy registrando la dirección; te aviso aquí en unos minutos.'], seguirConAri: false };
        const c = await obtenerCompra(f.compra_id);
        return { textos: [`Todavía no veo el pago. A veces tarda un par de minutos. Si no lo has hecho, aquí está tu liga:\n${corta(c, c?.stripe_url)}`], seguirConAri: false };
      }
      if (/\b(liga|link|enlace)\b/i.test(t)) {
        const c = await obtenerCompra(f.compra_id);
        return { textos: [c?.stripe_url ? `Aquí está tu liga para pagar *${pesos(c.precio.total_mxn)}* por *${c.dominio}*:\n${corta(c, c.stripe_url)}` : `*${c?.dominio || f.dominio}* viene incluida en tu pago; no hay nada que pagar. Ya la estoy registrando y te aviso aquí.`], seguirConAri: false };
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
  try { url = corta(c, await ligaDePago(c.id, { email: brief.contacto?.email, agreedAt: new Date().toISOString() })); }
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
