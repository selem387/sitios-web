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
const REGLAS = `Ya se comprobó con código (midiendo píxeles) que no hay fotos deformadas, rotas o repetidas, ni desbordes, ni textos encimados, y que el contraste del texto es suficiente: NO evalúes nada de eso ni lo menciones.
Juzga solo:
- Profesionalismo: se ve como una página de calidad, con jerarquía clara, aire y fotos protagonistas (no una presentación de puro texto).
- Que el recorte de la foto principal no corte una cara o una cabeza (un recorte normal de fondo está bien).
- Que la tipografía y los colores combinen entre sí.
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
