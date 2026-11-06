// Reinterpreta TODO el historial de una entrevista (entrevista + lo que pidió después de ver su página)
// y deja el brief al día: lo último que dijo el cliente gana, "déjalo como estaba" deshace el cambio anterior
// y todo texto que el cliente dictó va letra por letra. Se usa al pasar sitios de WordPress a la plataforma "app".
import * as db from '../entrevista/db.js';
import { pedirJSON } from '../entrevista/claude.js';
import { normalizarRedes } from '../entrevista/redes.js';
import { config } from '../config.js';

/* ---------------- Texto del cliente: verificación letra por letra ---------------- */

// Quita solo el formato del chat (## títulos, *énfasis*, viñetas "- ") y junta espacios; nada más.
export const normal = (s) => String(s ?? '').replace(/[*#]/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/\s+/g, ' ').trim();

/**
 * Renglones de `valor` que no aparecen tal cual en ninguna fuente permitida.
 * Fuentes: lo que escribió el cliente y lo que ya estaba (brief o contenido actual).
 */
export function renglonesAjenos(valor, fuentes) {
  const base = normal(fuentes);
  return String(valor ?? '').replace(/\r/g, '').split('\n').map(normal).filter((l) => l.length >= 3 && !base.includes(l));
}

/** Textos del contenido propuesto que no salen del cliente ni de lo que ya había. */
export function textosInventados(secciones, fuentes) {
  const fallos = [];
  const revisar = (donde, v) => { for (const l of renglonesAjenos(v, fuentes)) fallos.push(`${donde}: "${l.slice(0, 80)}" no lo escribió el cliente ni estaba antes`); };
  for (const [i, it] of (secciones.oferta?.items || []).entries()) {
    revisar(`oferta[${i}].nombre`, it.nombre); revisar(`oferta[${i}].grupo`, it.grupo);
    revisar(`oferta[${i}].descripcion_corta`, it.descripcion_corta); revisar(`oferta[${i}].precio_o_rango`, it.precio_o_rango);
  }
  const arr = (x) => (Array.isArray(x) ? x : Array.isArray(x?.items) ? x.items : []);
  for (const [i, f] of arr(secciones.faq).entries()) { revisar(`faq[${i}].pregunta`, f.pregunta); revisar(`faq[${i}].respuesta`, f.respuesta); }
  for (const [i, t] of arr(secciones.testimonios).entries()) revisar(`testimonios[${i}].texto`, t.texto);
  if (secciones.historia?.texto) revisar('historia', secciones.historia.texto);
  if (secciones.promocion?.texto) revisar('promocion', secciones.promocion.texto);
  return fallos;
}

/** "Paquete #1 — $1,200 MXN" con precio "$1,200 MXN": el nombre queda "Paquete #1" (se parte el renglón sin cambiar caracteres). */
export function separarPrecio(it) {
  const precio = String(it.precio_o_rango || '').trim();
  let nombre = String(it.nombre || '').trim();
  if (precio && nombre.endsWith(precio)) nombre = nombre.slice(0, -precio.length).replace(/\s*[—–-]\s*$/, '').trim() || nombre;
  return { ...it, nombre };
}

/* ---------------- Historial ---------------- */

export async function historialCompleto(entrevistaId) {
  const r = await db.q(`SELECT id, rol, tipo, contenido, transcripcion, creado FROM mensajes WHERE entrevista_id=$1 AND rol IN ('cliente','agente') ORDER BY id`, [entrevistaId]);
  const conv = r.rows.map((m) => {
    const t = m.transcripcion ? `[audio] ${m.transcripcion}` : m.contenido || '';
    return `#${m.id} ${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${m.rol === 'cliente' ? t : t.slice(0, 1500)}`;
  }).join('\n');
  const cliente = r.rows.filter((m) => m.rol === 'cliente').map((m) => m.transcripcion || m.contenido || '').join('\n');
  return { conv, cliente, total: r.rows.length };
}

/* ---------------- Reinterpretación ---------------- */

const ITEM = { type: 'object', properties: { grupo: { type: 'string', description: 'Categoría tal cual la escribió el cliente (p. ej. "🎂 Smash Cake | Primer Añito"); vacío si no agrupó.' }, nombre: { type: 'string' }, descripcion_corta: { type: 'string', description: 'Descripción con sus renglones y viñetas "- " tal cual.' }, precio_o_rango: { type: 'string' }, destacado: { type: 'boolean' } }, required: ['nombre'] };
const ESQUEMA = {
  type: 'object',
  properties: {
    oferta: { type: 'object', properties: { items: { type: 'array', items: ITEM }, mostrar_precios: { type: 'boolean' }, promocion_actual: { type: 'string' } } },
    contacto: { type: 'object', properties: { whatsapp: { type: 'string' }, telefono: { type: 'string' }, email: { type: 'string' }, direccion: { type: 'string' }, google_maps_url: { type: 'string' }, horarios: { type: 'string' }, mensaje_whatsapp_inicial: { type: 'string' } } },
    redes: { type: 'object', properties: { instagram: { type: 'string' }, facebook: { type: 'string' }, tiktok: { type: 'string' }, youtube: { type: 'string' }, linkedin: { type: 'string' } } },
    faq: { type: 'array', items: { type: 'object', properties: { pregunta: { type: 'string' }, respuesta: { type: 'string' } }, required: ['pregunta', 'respuesta'] } },
    testimonios: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, texto: { type: 'string' }, fuente: { type: 'string' } }, required: ['texto'] } },
    historia: { type: 'object', properties: { texto: { type: 'string' }, dictado_por_cliente: { type: 'boolean', description: 'true solo si el cliente escribió él mismo ese texto para su página.' } } },
    portada: { type: 'object', properties: { titular: { type: 'string' }, subtitulo: { type: 'string' }, dictado_por_cliente: { type: 'boolean' } } },
    fotos_no_usar: { type: 'array', items: { type: 'string' }, description: 'Claves de fotos que el cliente pidió quitar y no volvió a pedir.' },
    notas: { type: 'array', items: { type: 'string' }, description: 'Decisiones que tomaste al reinterpretar (breve).' },
  },
  required: ['oferta', 'notas'],
};

const SISTEMA = `Reconstruyes los datos de la página web de un negocio leyendo TODA la conversación con su dueño: la entrevista con Ari y los cambios que pidió después de ver su página.
Devuelves cómo debe quedar la página HOY.

REGLAS
- Lo último que dijo el cliente gana. Si pidió "déjalo como estaba" después de un cambio, ese cambio se deshace; si luego lo volvió a pedir, vuelve a aplicar.
- Si Ari dijo que aplicó algo pero el cliente después se quejó de que faltaba o estaba mal, lo que vale es lo que el cliente escribió.
- TEXTO DEL CLIENTE NO SE TOCA: todo lo que el cliente escribió para su página (nombres de paquetes, descripciones, viñetas, precios, emojis, mayúsculas, signos, orden) va EXACTAMENTE como lo escribió, letra por letra. No corriges, no resumes, no reordenas, no agregas.
- Los "## " del chat marcan una categoría: va en "grupo" sin los "## ". "*Paquete #1 — $1,200 MXN*": nombre "Paquete #1", precio "$1,200 MXN" (puedes partir el renglón, sin cambiar caracteres). Las viñetas "- …" van dentro de descripcion_corta, un renglón cada una, con su "- ".
- Si el cliente mandó una lista completa de paquetes o servicios, esa lista reemplaza a la anterior completa, con TODOS sus elementos en su orden.
- Lo que el cliente no tocó se queda como está en el BRIEF ACTUAL (copia sus textos tal cual).
- Nunca inventes datos, precios, teléfonos ni textos. Si no hay dato, déjalo vacío.
- historia/portada: solo pon dictado_por_cliente=true si el cliente escribió ese texto exacto para su página.`;

export async function reinterpretarHistorial(e, { intentos = 3 } = {}) {
  const h = await historialCompleto(e.id);
  const assets = (await db.assetsDe(e.id)).filter((a) => a.url);
  const brief = e.brief || {};
  const actual = { oferta: brief.oferta || {}, contacto: brief.contacto || {}, faq: brief.faq || [], confianza: brief.confianza || {} };
  const fuentes = `${h.cliente}\n${JSON.stringify(actual)}`.replace(/\\n/g, '\n');
  let errores = [], data = null;
  for (let i = 0; i < intentos; i++) {
    const partes = [
      `NEGOCIO: ${brief.negocio?.nombre || ''} (${brief.negocio?.giro_texto || brief.negocio?.arquetipo || ''})`,
      `BRIEF ACTUAL (lo que salió de la entrevista):\n${JSON.stringify(actual, null, 1)}`,
      `FOTOS (clave · tipo · descripción · usar):\n${assets.map((a) => `${a.clave} · ${a.tipo} · ${(a.descripcion_ia || a.nota || '').slice(0, 120)} · ${a.usar}`).join('\n') || '(ninguna)'}`,
      `CONVERSACIÓN COMPLETA (${h.total} mensajes, en orden):\n${h.conv}`,
    ];
    if (errores.length) partes.push(`TU INTENTO ANTERIOR TUVO ESTOS ERRORES; corrígelos copiando el texto exacto del cliente o el del brief actual:\n- ${errores.slice(0, 30).join('\n- ')}`);
    const r = await pedirJSON({ system: SISTEMA, contenido: partes.join('\n\n'), schema: ESQUEMA, model: config.anthropicModel, max_tokens: 16000, timeoutMs: 420000 });
    data = r.data;
    errores = textosInventados({
      oferta: data.oferta, faq: data.faq, testimonios: data.testimonios,
      historia: data.historia?.dictado_por_cliente ? data.historia : null, promocion: { texto: data.oferta?.promocion_actual },
    }, fuentes);
    if (!errores.length) break;
  }
  return { data, errores, mensajes: h.total };
}

/** Aplica la reinterpretación al brief (sin perder lo demás). Devuelve {brief, dictado}. */
export function briefReinterpretado(brief, d) {
  const lleno = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => typeof v === 'string' ? v.trim() : v !== undefined && v !== null));
  const contacto = { ...(brief.contacto || {}), ...lleno(d.contacto) };
  if (d.redes && Object.keys(lleno(d.redes)).length) contacto.redes = normalizarRedes({ ...(brief.contacto?.redes || {}), ...lleno(d.redes) });
  const oferta = { ...(brief.oferta || {}) };
  if (d.oferta?.items?.length) oferta.items = d.oferta.items.map(separarPrecio).map((x) => ({ grupo: x.grupo || '', nombre: x.nombre, descripcion_corta: x.descripcion_corta || '', precio_o_rango: x.precio_o_rango || '', destacado: !!x.destacado }));
  if (typeof d.oferta?.mostrar_precios === 'boolean') oferta.mostrar_precios = d.oferta.mostrar_precios;
  if (d.oferta?.promocion_actual !== undefined) oferta.promocion_actual = d.oferta.promocion_actual || null;
  const confianza = { ...(brief.confianza || {}) };
  if (d.testimonios?.length) confianza.testimonios = d.testimonios;
  if (d.historia?.texto && d.historia.dictado_por_cliente) confianza.historia_corta = d.historia.texto;
  const nuevo = structuredClone(brief);
  Object.assign(nuevo, { contacto, oferta, confianza, ...(d.faq?.length ? { faq: d.faq } : {}) });
  // Lo que el cliente dictó para portada o "sobre mí" se pone encima de los textos de la propuesta (en el sitio en vivo).
  const dictado = {};
  if (d.historia?.dictado_por_cliente && d.historia.texto) dictado.historia = { texto: d.historia.texto };
  if (d.portada?.dictado_por_cliente && (d.portada.titular || d.portada.subtitulo)) dictado.portada = { titular: d.portada.titular || '', subtitulo: d.portada.subtitulo || '', cta: '' };
  nuevo.reinterpretacion = { fecha: new Date().toISOString(), notas: d.notas || [], dictado, fotos_no_usar: d.fotos_no_usar || [] };
  return { brief: nuevo, dictado };
}
