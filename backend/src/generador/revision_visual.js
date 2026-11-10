// Revisión visual automática de propuestas antes de mandarlas al cliente (7-nov-2026).
// Toma capturas de cada opción (computadora arriba, celular arriba, galería en computadora) y de la página de
// referencia, y una IA las revisa contra las reglas de calidad de Sebastián. Solo pasan las que cumplen.

import { config } from '../config.js';
import { pedirJSON } from '../entrevista/claude.js';

async function captura(url, { ancho = 1366, selector = null } = {}) {
  if (!config.renderUrl || !url) return null;
  const r = await fetch(`${config.renderUrl}/v1/captura`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey },
    body: JSON.stringify({ url, ancho, css: '.etq,.wa{display:none!important}', ...(selector ? { selector } : {}) }), signal: AbortSignal.timeout(90000),
  }).catch(() => null);
  return r?.ok ? (await r.json()).url : null;
}

/** Comprobaciones objetivas con código (servicio render): fotos deformadas/rotas/repetidas, desbordes, encimados, letras. */
async function objetivas(url) {
  if (!config.renderUrl || !url) return null;
  const r = await fetch(`${config.renderUrl}/v1/revisar`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey },
    body: JSON.stringify({ url, css: '.etq,.wa{display:none!important}' }), signal: AbortSignal.timeout(120000),
  }).catch(() => null);
  if (!r?.ok) return null;
  const d = await r.json();
  const problemas = [...(d.computadora?.problemas || []).map((p) => `computadora: ${p}`), ...(d.celular?.problemas || []).map((p) => `celular: ${p}`)];
  if (d.computadora?.logo === false) problemas.push('el logo no cargó');
  return { problemas, fuentes: d.computadora?.fuentes || null };
}

async function capturasOpcion(o) {
  const [pc, cel, galeria] = await Promise.all([
    captura(o.url, { ancho: 1366 }),
    captura(o.url, { ancho: 390 }),
    captura(o.url, { ancho: 1366, selector: '#trabajo .galeria, #galeria .galeria, .galeria, #propiedades' }),
  ]);
  return [{ vista: 'computadora (primera pantalla)', url: pc }, { vista: 'celular (primera pantalla)', url: cel }, { vista: 'galería de trabajos en computadora', url: galeria }];
}

// Lo objetivo (deformadas, repetidas, desbordes, encimados, letras que no cargan) ya lo revisa el código; la IA solo juzga lo visual.
// Lo objetivo (deformadas, repetidas, desbordes, encimados, letras, CONTRASTE medido en píxeles) ya lo revisa el código;
// la IA solo juzga lo que no se puede medir.
const REGLAS = `Ya se comprobó con código (midiendo píxeles) que no hay fotos deformadas, rotas, repetidas o con franjas negras, ni desbordes, ni textos encimados, ni bloques fuera de la columna, ni textos por debajo del 86% del cuerpo, y que el contraste del texto es suficiente: NO evalúes nada de eso ni lo menciones.
Juzga solo:
- Profesionalismo: se ve como una página de calidad, con jerarquía clara, aire y fotos protagonistas (no una presentación de puro texto).
- Que el recorte de la foto principal no corte una cara o una cabeza (un recorte normal de fondo está bien).
- Que la tipografía y los colores combinen entre sí (la paleta ya sale de los colores del logo por código: no la juzgues por su origen).
- NO es error que las fotos del slider de portada se repitan en la sección de trabajo (es una decisión del dueño); sí lo es que se repitan en otra parte.
- Que el logo no se vea cortado (letras o lema recortados) ni repetido en la misma pantalla.
- Proporción: que el tamaño de los textos se vea proporcionado al ancho de la página (ni titulares diminutos en una pantalla ancha ni descripciones apenas legibles).
Pon profesional=false solo por una falla clara y visible de esta lista. Califica aparte el parecido con la referencia.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    profesional: { type: 'boolean', description: 'false SOLO si hay una falla clara de calidad de la lista (se ve amateur, rota, sin jerarquía, foto principal que corta una cara). El gusto o el parecido con la referencia NO cuentan aquí.' },
    parecido: { type: 'integer', minimum: 0, maximum: 5, description: '0 si no hay referencia; 1–5 qué tanto se parece al ESTILO de la referencia (no a su contenido).' },
    problemas: { type: 'array', items: { type: 'string' }, description: 'Observaciones concretas y dónde.' },
  },
  required: ['profesional', 'problemas'],
};

async function revisarUna(o, caps, { refCaptura, pedido, fuentes }) {
  if (!caps.some((c) => c.url)) return { ok: true, problemas: [], sin_capturas: true };
  const contenido = [{ type: 'text', text: `Opción ${o.letra} (“${o.nombre}”) de la página web de un cliente.${fuentes?.titulos ? `\nLetras usadas (dato real, no lo adivines): títulos ${fuentes.titulos}, texto ${fuentes.cuerpo}.` : ''}${pedido ? `\nLO QUE PIDIÓ EL CLIENTE: ${pedido.slice(0, 800)}` : ''}\n${REGLAS}` }];
  if (refCaptura) contenido.push({ type: 'text', text: 'PÁGINA DE REFERENCIA que le gusta al cliente (compara el ESTILO: letra, colores, aire, protagonismo de fotos; no el contenido):' }, { type: 'image', source: { type: 'url', url: refCaptura } });
  for (const c of caps) {
    contenido.push({ type: 'text', text: `OPCIÓN ${o.letra} · ${c.vista}${c.url ? '' : ': no se pudo capturar'}` });
    if (c.url) contenido.push({ type: 'image', source: { type: 'url', url: c.url } });
  }
  try {
    const r = await pedirJSON({
      system: 'Eres directora de arte y revisas propuestas de páginas web antes de enseñárselas a un cliente. Eres estricta: si algo se ve mal, no pasa. No inventes problemas que no se ven en las capturas.',
      contenido, schema: ESQUEMA, model: config.anthropicModel, max_tokens: 900, timeoutMs: 180000,
    });
    return { ok: r.data.profesional !== false, parecido: r.data.parecido ?? null, problemas: r.data.problemas || [] };
  } catch (err) {
    return { ok: false, problemas: [`no se pudo revisar: ${err.message}`], error: true };
  }
}

/**
 * Revisa todas las opciones. Devuelve [{letra, ok, parecido, problemas, capturas}].
 * Con referencia, una opción con parecido < 3 no pasa.
 */
export async function revisarOpciones(opciones, { referencia = null, pedido = '' } = {}) {
  const refCaptura = referencia ? await captura(referencia, { ancho: 1366 }) : null;
  const out = [];
  // De 2 en 2 para no saturar el servicio de capturas.
  for (let i = 0; i < opciones.length; i += 2) {
    const lote = await Promise.all(opciones.slice(i, i + 2).map(async (o) => {
      const [caps, obj] = await Promise.all([capturasOpcion(o), objetivas(o.url)]);
      const v = await revisarUna(o, caps, { refCaptura, pedido, fuentes: obj?.fuentes });
      if (v.ok && refCaptura && v.parecido != null && v.parecido < 3) { v.ok = false; v.problemas = [...v.problemas, `poco parecida a la referencia (${v.parecido}/5)`]; }
      // Lo objetivo manda: cualquier falla medida con código hace que no pase.
      if (obj?.problemas?.length) { v.ok = false; v.problemas = [...obj.problemas, ...v.problemas]; }
      return { letra: o.letra, ...v, objetivas: obj ? obj.problemas : null, capturas: caps.map((c) => c.url).filter(Boolean) };
    }));
    out.push(...lote);
  }
  return out;
}

/* ======================= Agente de revisión y corrección (10-nov-2026) =======================
 * Antes de mandar las propuestas: revisa cada opción (código + IA), y a las que fallan les aplica una corrección de
 * estilos hecha por una IA "directora de arte" siguiendo las reglas de diseño vigentes del proyecto; vuelve a revisar.
 * Nunca toca textos del cliente ni quita o cambia fotos/logo (regla dura): solo CSS que se agrega al final de la página.
 * Solo se mandan las opciones que pasan. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DIR_PROPUESTAS } from './propuestas_html.js';

const REGLAS_DISENO = `Reglas de diseño vigentes (bibliografía de tipografía y color 2026 del proyecto):
- Columna única alineada: logo, titulares, fotos y secciones empiezan en el mismo borde izquierdo de la columna (max 1140 px).
- Escala tipográfica fluida: titular de portada de exhibición (≈ 1/14 del ancho de la columna en computadora, 56–90 px); cuerpo 16–19 px; ningún texto de lectura por debajo del 90% del cuerpo; títulos de tarjeta un paso arriba del cuerpo.
- Aire: ningún texto ni botón pegado al borde de su sección (mínimo 40 px en computadora); ritmo vertical constante.
- Fotos enteras y proporcionadas (sin deformar ni recortar caras); filas de fotos a la misma altura llenando la columna, sin huecos grandes.
- Colores 60-30-10 tomados de la paleta del logo: neutro claro derivado del logo, color protagonista del logo, acento del logo; contraste AA.
- El logo se ve completo y una sola vez por pantalla.`;

const ESQUEMA_CORRECCION = {
  type: 'object',
  properties: {
    css: { type: 'string', description: 'CSS que corrige los problemas. Solo estilos; sin @import, sin url() externas, sin ocultar fotos, logo ni textos del cliente.' },
    explicacion: { type: 'string' },
  },
  required: ['css'],
};

const archivoDe = (url) => { const m = String(url || '').match(/\/p\/([A-Za-z0-9]{8,40})\/([A-F])\b/); return m ? path.join(DIR_PROPUESTAS, m[1], `${m[2]}.html`) : null; };

// CSS seguro: fuera @import/url()/expression y cualquier regla que oculte imágenes, el logo o textos.
function cssSeguro(css) {
  let c = String(css || '').slice(0, 6000).replace(/<\/?style[^>]*>/gi, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;?/gi, '').replace(/url\([^)]*\)/gi, 'none').replace(/expression\(/gi, '');
  c = c.replace(/[^{}]*\{[^{}]*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(\.0+)?\s*[;}!])[^{}]*\}/gi, '');
  // Nada global (10-nov-2026: una corrección puso max-width al body y cambió la paleta por colores inventados):
  // fuera reglas sobre html/body/:root/* solos y cualquier declaración de color, fondo, tipo de letra o variables.
  const PROHIBIDAS = /^\s*(--[\w-]+|color|background(-color|-image)?|font-family|font-weight|max-width|width|margin(-left|-right)?|padding(-left|-right)?|border-radius|filter|transform)\s*:/i;
  const global = (sel) => sel.split(',').some((x) => /^\s*(html|body|:root|\*|header|main|footer|section|div|p|a|img|figure)\s*$/i.test(x));
  c = c.replace(/([^{}@]+)\{([^{}]*)\}/g, (m, sel, decl) => {
    if (global(sel)) return '';
    const keep = decl.split(';').map((d) => d.trim()).filter((d) => d && !PROHIBIDAS.test(d));
    return keep.length ? `${sel.trim()}{${keep.join(';')}}` : '';
  });
  return c.replace(/@media[^{]*\{\s*\}/g, '').trim();
}

async function corregirUna(o, problemas, caps) {
  const archivo = archivoDe(o.url);
  if (!archivo) return false;
  const html = await fs.readFile(archivo, 'utf8').catch(() => null);
  if (!html) return false;
  // Estructura (sin scripts ni estilos) para que la IA conozca clases y jerarquía.
  const estructura = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/\s(src|srcset|alt)="[^"]*"/g, '').replace(/>[^<]{60,}</g, (m) => `>${m.slice(1, 58)}…<`).slice(0, 14000);
  const estilos = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).join('\n').replace(/<\/?style[^>]*>/gi, '').slice(-9000);
  const contenido = [{ type: 'text', text: `${REGLAS_DISENO}\n\nOpción ${o.letra} ("${o.nombre}"). PROBLEMAS DETECTADOS (corrígelos todos):\n- ${problemas.join('\n- ')}\n\nESTRUCTURA HTML:\n${estructura}\n\nCSS ACTUAL (final):\n${estilos}` }];
  for (const c of caps || []) if (c.url) contenido.push({ type: 'text', text: c.vista }, { type: 'image', source: { type: 'url', url: c.url } });
  try {
    const r = await pedirJSON({
      system: 'Eres directora de arte y desarrolladora front-end. Corriges una página web SOLO con CSS que se agrega al final y SOLO para los problemas listados (no rediseñes ni "mejores" otra cosa). Prohibido: cambiar colores, fondos, tipos de letra o variables (la paleta sale del logo y ya es correcta), poner anchos o márgenes al body/html, cambiar textos, ocultar o quitar fotos, logo o contenido, deformar fotos. Si un problema no se arregla con un ajuste puntual, no lo toques. Usa selectores específicos (con body delante si hace falta ganar especificidad) y media queries para computadora (min-width:900px) y celular.',
      contenido, schema: ESQUEMA_CORRECCION, model: config.anthropicModel, max_tokens: 2500, timeoutMs: 180000,
    });
    const css = cssSeguro(r.data.css);
    if (!css) return false;
    const bloque = `<style data-correccion="agente">\n${css}\n</style>`;
    const nuevo = html.includes('data-correccion="agente"') ? html.replace(/<style data-correccion="agente">[\s\S]*?<\/style>/, bloque) : html.replace('</head>', `${bloque}\n</head>`);
    await fs.writeFile(archivo, nuevo, 'utf8');
    return { archivo, original: html };
  } catch (err) {
    console.error('[agente revisión] corrección', o.letra, err.message);
    return false;
  }
}

/**
 * Revisa y corrige las opciones antes de mandarlas. Devuelve {pasan:[opciones], revision:[...]}.
 * Sin servicio de capturas configurado no bloquea el envío (devuelve todas).
 */
export async function revisarYCorregir(opciones, { referencia = null, pedido = '', rondas = 2, presupuestoMs = 6 * 60000 } = {}) {
  if (!config.renderUrl) return { pasan: opciones, revision: [], sin_revision: true };
  const t0 = Date.now();
  let revision = await revisarOpciones(opciones, { referencia, pedido });
  for (let k = 0; k < rondas && Date.now() - t0 < presupuestoMs; k++) {
    const malas = revision.filter((x) => !x.ok && !x.error && !x.sin_capturas);
    if (!malas.length) break;
    const corregidas = [], respaldos = new Map();
    for (const m of malas) {
      const o = opciones.find((x) => x.letra === m.letra);
      const r = o && await corregirUna(o, m.problemas || [], (m.capturas || []).map((url, i) => ({ url, vista: ['computadora', 'celular', 'galería'][i] || 'captura' })));
      if (r) { corregidas.push(o); respaldos.set(o.letra, r); }
    }
    if (!corregidas.length) break;
    const nueva = await revisarOpciones(corregidas, { referencia, pedido });
    // Una corrección que no deja la opción aprobada se deshace: nunca se queda un cambio que no sirvió (o que empeoró).
    for (const n of nueva) if (!n.ok) { const b = respaldos.get(n.letra); if (b) await fs.writeFile(b.archivo, b.original, 'utf8').catch(() => {}); }
    revision = revision.map((x) => nueva.find((n) => n.letra === x.letra) || x);
  }
  const pasan = opciones.filter((o) => revision.find((x) => x.letra === o.letra)?.ok !== false);
  return { pasan, revision };
}
