// Extracción de Facebook/Instagram dentro de la entrevista (microservicio extractor-redes).
// Ari pide las ligas justo después del nombre (B0). Al detectarlas se lanza la extracción y Ari sigue con el objetivo;
// cuando llega el resultado se llena el brief SOLO en lo que esté vacío (nunca pisa lo que dijo el cliente),
// se guardan logo, portada y hasta 18 fotos como assets (origen "redes"), y Ari muestra un resumen para confirmar o corregir.
// Con logo y fotos se activa el atajo: lo no indispensable se difiere hasta que el cliente elige diseño.
// Estado en brief.redes_extraccion = {id, estado, ligas, aplicada, resumen_mostrado, encontrado[], captura}.
// Si el extractor no responde al lanzar, queda estado "por_lanzar" con las ligas y se reintenta en cada turno (hasta MAX_INTENTOS).
import { config } from '../config.js';
import * as db from './db.js';

const ACTIVOS = new Set(['pendiente', 'procesando']);
const MAX_INTENTOS = 5;
// Lo que se difiere con el atajo (vuelve a pedirse después de elegir diseño; ver requisitos.js → diferido()).
export const DIFERIR_ATAJO = ['cliente_ideal', 'zona', 'diferenciador', 'personalidad'];
const ESPERA_EN_TURNO_MS = Number(process.env.EXTRACTOR_ESPERA_MS || 20000);
const NOTA_EN_CURSO = 'Estoy revisando sus redes en segundo plano: NO le pidas todavía datos que suelen venir en Facebook/Instagram (logo, fotos, servicios, teléfono, horarios); sigue con el objetivo de la página.';

const vacio = (v) => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v).some((x) => !vacio(x)));

/** Ligas o @usuarios en un texto. `preguntoRedes`: la última pregunta de Ari fue por las redes (acepta @usuario suelto). */
export function detectarLigas(texto, { preguntoRedes = false } = {}) {
  const t = String(texto || '');
  const fb = t.match(/(?:https?:\/\/)?(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.com|fb\.me)\/[^\s,;)]+/i)?.[0] || null;
  const ig = t.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}/i)?.[0] || null;
  let igArroba = null; let fbNombre = null;
  if (preguntoRedes) {
    // "@toolattemid", "en insta toolattemid", "face: ToolatteMerida"
    const conRed = (re) => t.match(re)?.[1] || null;
    igArroba = !ig ? (conRed(/(?:insta(?:gram)?|ig)\s*(?:es|:|=)?\s*@?([A-Za-z0-9._]{2,30})/i) || conRed(/(?:^|\s)@([A-Za-z0-9._]{2,30})/)) : null;
    fbNombre = !fb ? conRed(/(?:face(?:book)?|fb)\s*(?:es|:|=)?\s*@?([A-Za-z0-9.]{3,60})/i) : null;
  }
  const facebook = fb || (fbNombre && !/^(es|no|si|sí|tengo|como|el|la)$/i.test(fbNombre) ? `https://www.facebook.com/${fbNombre}` : null);
  const instagram = ig || (igArroba ? `https://www.instagram.com/${igArroba}/` : null);
  return facebook || instagram ? { facebook, instagram } : null;
}

export const preguntaPorRedes = (mensaje) => /facebook|instagram|redes sociales|tus redes/i.test(String(mensaje || ''));
const hayExtractor = () => !!(config.extractorUrl && config.extractorApiKey);

async function api(ruta, opciones = {}) {
  const r = await fetch(`${config.extractorUrl}${ruta}`, {
    ...opciones,
    headers: { 'x-api-key': config.extractorApiKey, 'content-type': 'application/json', ...(opciones.headers || {}) },
    signal: AbortSignal.timeout(opciones.timeoutMs || 15000),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok && r.status !== 202) throw new Error(`extractor ${r.status}: ${j?.error || ''}`);
  return j;
}

/** Arma el texto del resumen que Ari le muestra al cliente para confirmar en un solo mensaje. */
function resumen(r, nFotos) {
  const l = [];
  if (r.negocio?.nombre) l.push(`• Nombre: ${r.negocio.nombre}`);
  if (r.negocio?.giro_texto) l.push(`• A qué te dedicas: ${r.negocio.giro_texto}`);
  if (r.negocio?.ciudad || r.negocio?.direccion) l.push(`• Dónde: ${[r.negocio.direccion, r.negocio.ciudad].filter(Boolean).join(', ')}`);
  if (r.oferta?.servicios?.length) l.push(`• Lo que ofreces: ${r.oferta.servicios.map((s) => s.nombre).slice(0, 6).join(', ')}`);
  if (r.contacto?.whatsapp || r.contacto?.telefono) l.push(`• Teléfono / WhatsApp: ${r.contacto.whatsapp || r.contacto.telefono}`);
  if (r.contacto?.email) l.push(`• Correo: ${r.contacto.email}`);
  if (r.contacto?.horarios) l.push(`• Horario: ${r.contacto.horarios}`);
  if (r.confianza?.num_resenas) l.push(`• Reseñas en Facebook: ${r.confianza.texto_resenas || r.confianza.num_resenas}`);
  if (r.logo) l.push('• Tu logo');
  if (nFotos) l.push(`• ${nFotos} fotos de tus publicaciones (descarté flyers y fotos con texto)`);
  return l.join('\n');
}

/** Llena el brief solo donde está vacío y regresa {brief, encontrado[]}. */
export function aplicarAlBrief(brief, r) {
  const b = JSON.parse(JSON.stringify(brief || {}));
  const encontrado = [];
  const poner = (ruta, valor, etiqueta) => {
    if (vacio(valor)) return;
    let o = b;
    for (const k of ruta.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
    const k = ruta.at(-1);
    if (vacio(o[k])) { o[k] = valor; encontrado.push(etiqueta || ruta.join('.')); }
  };
  poner(['negocio', 'nombre'], r.negocio?.nombre, 'nombre');
  poner(['negocio', 'giro_texto'], r.negocio?.giro_texto, 'giro');
  poner(['negocio', 'ciudad'], r.negocio?.ciudad, 'ciudad');
  poner(['negocio', 'estado'], r.negocio?.estado);
  poner(['negocio', 'descripcion_redes'], r.negocio?.descripcion);
  poner(['contacto', 'whatsapp'], r.contacto?.whatsapp, 'whatsapp');
  poner(['contacto', 'telefono'], r.contacto?.telefono, 'telefono');
  poner(['contacto', 'email'], r.contacto?.email, 'correo');
  poner(['contacto', 'horarios'], r.contacto?.horarios, 'horarios');
  poner(['contacto', 'sitio_actual'], r.contacto?.sitio_web);
  if (r.negocio?.direccion) poner(['contacto', 'direccion'], { calle: r.negocio.direccion, ciudad: r.negocio.ciudad || null }, 'direccion');
  for (const [red, url] of Object.entries(r.contacto?.redes || {})) poner(['contacto', 'redes', red], url);
  poner(['oferta', 'items'], (r.oferta?.servicios || []).map((s) => ({ nombre: s.nombre, descripcion_corta: s.descripcion_corta || null })), 'servicios');
  poner(['oferta', 'promocion_actual'], r.oferta?.promocion_actual);
  if (r.confianza?.num_resenas) {
    poner(['confianza', 'link_resenas'], r.confianza.link_resenas, 'resenas');
    poner(['confianza', 'calificacion_facebook'], { porcentaje: r.confianza.calificacion, resenas: r.confianza.num_resenas });
  }
  if (r.logo) poner(['marca', 'tiene_logo'], true);
  return { brief: b, encontrado };
}

async function guardarAssets(e, r) {
  const previos = await db.assetsDe(e.id);
  const urls = new Set(previos.map((a) => a.url));
  let n = previos.length;
  const nuevos = [];
  const add = async (a) => {
    if (!a?.url || urls.has(a.url)) return;
    urls.add(a.url);
    nuevos.push(await db.insertarAsset(e.id, { clave: `a${++n}`, origen: 'redes', usar: true, mime: a.mime, ...a }));
  };
  // Si el cliente ya mandó su logo por el chat, el de redes no se agrega (el suyo manda).
  if (r.logo && !previos.some((a) => a.tipo === 'logo')) await add({ ...r.logo, tipo: 'logo', nota: 'logo tomado de sus redes', calidad: 'buena' });
  if (r.portada) await add({ ...r.portada, tipo: 'foto_local', nota: 'portada de su página de Facebook', descripcion_ia: 'Portada de Facebook del negocio', calidad: 'buena' });
  for (const f of r.fotos || []) await add({ url: f.url, mime: f.mime, tipo: f.tipo, nota: `foto de su ${f.fuente === 'instagram' ? 'Instagram' : 'Facebook'}`, descripcion_ia: `${f.descripcion} (${f.orientacion})`, calidad: f.calidad });
  return nuevos;
}

/**
 * Se llama en cada turno antes de Ari. Devuelve {brief?, assetsNuevos[], nota?}:
 * - si el cliente mandó ligas y no hay extracción, la lanza (si el extractor no responde, la deja pendiente de lanzar);
 * - si hay una en curso, espera unos segundos y si ya está, la aplica;
 * - si ya se aplicó y falta mostrar el resumen, le pasa a Ari la nota para que lo muestre y pida confirmación.
 */
export async function atenderExtraccion(e, textoTurno, historial = []) {
  if (!hayExtractor()) return {};
  let brief = e.brief || {};
  let rx = brief.redes_extraccion || null;
  const ultimaAri = [...historial].reverse().find((m) => m.rol === 'agente' && m.tipo !== 'imagen')?.contenido;
  const ligas = textoTurno ? detectarLigas(textoTurno, { preguntoRedes: preguntaPorRedes(ultimaAri) }) : null;

  const ligasNuevas = ligas && (!rx || (ligas.facebook && ligas.facebook !== rx.ligas?.facebook) || (ligas.instagram && ligas.instagram !== rx.ligas?.instagram));
  const reintentar = !ligasNuevas && rx?.estado === 'por_lanzar' && (rx.intentos || 0) < MAX_INTENTOS;

  // Ligas nuevas (o distintas a las ya extraídas), o un lanzamiento que falló antes → lanzar.
  if (ligasNuevas || reintentar) {
    const unidas = { facebook: ligas?.facebook || rx?.ligas?.facebook || null, instagram: ligas?.instagram || rx?.ligas?.instagram || null };
    brief = { ...brief, contacto: { ...(brief.contacto || {}), redes: { ...(brief.contacto?.redes || {}), ...Object.fromEntries(Object.entries(unidas).filter(([, v]) => v)) } } };
    try {
      const j = await api('/v1/extracciones', { method: 'POST', body: JSON.stringify({ ...unidas, referencia: `entrevista:${e.id}` }) });
      rx = { id: j.id, estado: j.estado, ligas: unidas, aplicada: false, resumen_mostrado: false, lanzada: new Date().toISOString() };
      brief = { ...brief, redes_extraccion: rx };
      await db.guardar(e.id, { brief });
      await db.evento(e.id, 'redes_extraccion_lanzada', { id: j.id, ...unidas, reintento: !!reintentar });
    } catch (err) {
      const intentos = (reintentar ? rx.intentos || 0 : 0) + 1;
      rx = { estado: 'por_lanzar', ligas: unidas, intentos, aplicada: false, resumen_mostrado: false };
      brief = { ...brief, redes_extraccion: rx };
      await db.guardar(e.id, { brief });
      await db.evento(e.id, 'redes_extraccion_error', { error: err.message, intentos });
      return { brief, nota: intentos < MAX_INTENTOS ? NOTA_EN_CURSO : null };
    }
  }
  if (!rx || rx.estado === 'por_lanzar') return { brief };

  // En curso → consultar (con una espera corta para no responder antes de tener los datos).
  if (!rx.aplicada && ACTIVOS.has(rx.estado)) {
    const fin = Date.now() + (textoTurno ? ESPERA_EN_TURNO_MS : 0);
    let j = null;
    do {
      j = await api(`/v1/extracciones/${rx.id}`).catch(() => null);
      if (!j || !ACTIVOS.has(j.estado)) break;
      await new Promise((r) => setTimeout(r, 4000));
    } while (Date.now() < fin);
    if (!j) return { brief };
    if (ACTIVOS.has(j.estado)) {
      // Más de 6 min sin terminar: se da por perdida y la entrevista sigue normal.
      if (Date.now() - new Date(rx.lanzada).getTime() > 6 * 60e3) { rx = { ...rx, estado: 'error', aplicada: true }; brief = { ...brief, redes_extraccion: rx }; await db.guardar(e.id, { brief }); }
      return { brief, nota: rx.estado === 'error' ? null : NOTA_EN_CURSO };
    }
    if (j.estado !== 'lista') {
      rx = { ...rx, estado: j.estado, aplicada: true, resumen_mostrado: true };
      brief = { ...brief, redes_extraccion: rx };
      await db.guardar(e.id, { brief });
      await db.evento(e.id, 'redes_extraccion_sin_datos', { estado: j.estado, error: j.error });
      return { brief, nota: 'No pude leer sus redes (están privadas o no se encontraron). No lo menciones como error técnico; sigue la entrevista normal pidiendo los datos.' };
    }
    const r = j.resultado || {};
    const ap = aplicarAlBrief(brief, r);
    const assetsNuevos = await guardarAssets(e, r);
    const nFotos = assetsNuevos.filter((a) => a.tipo !== 'logo').length;
    const conLogo = !!r.logo || assetsNuevos.some((a) => a.tipo === 'logo');
    const atajo = conLogo && nFotos > 0;
    rx = { ...rx, estado: 'lista', aplicada: true, resumen_mostrado: false, encontrado: ap.encontrado, n_fotos: nFotos, atajo, capturas: r.capturas || null, resumen: resumen(r, nFotos) };
    brief = { ...ap.brief, redes_extraccion: rx };
    if (atajo) brief.diferir = [...new Set([...(brief.diferir || []), ...DIFERIR_ATAJO])];
    await db.guardar(e.id, { brief });
    await db.evento(e.id, 'redes_extraccion_aplicada', { encontrado: ap.encontrado, fotos: nFotos, atajo });
    return { brief, assetsNuevos, nota: notaResumen(rx), resumen: rx.resumen };
  }

  if (rx.aplicada && rx.estado === 'lista' && !rx.resumen_mostrado) return { brief, nota: notaResumen(rx), resumen: rx.resumen };
  return { brief };
}

function notaResumen(rx) {
  return `YA LEÍ SUS REDES. En este reply, después de responder en una frase a lo que acaba de decir, muéstrale este resumen tal cual (en líneas) y pídele que confirme o corrija lo que esté mal, en UN solo mensaje; esa es tu única pregunta:
"Revisé tus redes y esto es lo que encontré:
${rx.resumen}"
Lo del resumen ya está en BRIEF: no lo vuelvas a preguntar. Si corrige algo, guárdalo en brief_patch.
${rx.atajo ? `ATAJO ACTIVO: cuando confirme, pide SOLO lo que diga REVISIÓN DE REQUISITOS (normalmente el estilo; servicios u otro dato si faltaran), una cosa por mensaje, y en cuanto esté completo pon bloque_actual="B7" para que el sistema mande las 6 propuestas. Cliente ideal, zonas, diferenciador y personalidad se piden después de que elija diseño. Antes de B7 asigna negocio.arquetipo con el giro.` : 'Después de que confirme sigue la entrevista normal, sin volver a pedir lo que ya está en BRIEF.'}`;
}

/** Después del turno de Ari: garantiza que el resumen salió en el mensaje (si Ari no lo puso, se antepone) y lo marca como mostrado. */
export function asegurarResumen(reply, brief, resumenTxt) {
  if (!resumenTxt || !brief?.redes_extraccion) return { reply, brief };
  const lineas = resumenTxt.split('\n').filter(Boolean);
  const lo = lineas.filter((l) => reply.includes(l.replace(/^•\s*/, '').slice(0, 25))).length;
  const r = lo >= Math.ceil(lineas.length / 2) ? reply : `Revisé tus redes y esto es lo que encontré:\n${resumenTxt}\n\n${reply}`;
  return { reply: r, brief: { ...brief, redes_extraccion: { ...brief.redes_extraccion, resumen_mostrado: true } } };
}
