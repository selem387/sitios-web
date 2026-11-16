// Opciones de diseño A/B/C para el cliente (antes de generar): 3 estilos con composición distinta,
// con su logo, sus colores y su foto, renderizadas por el servicio render. La opción elegida fija estilo,
// tipografía y paleta del sitio final, para que el sitio se parezca a lo que el cliente escogió.
import { config } from '../config.js';
import { pedirJSON } from '../entrevista/claude.js';
import { datosDiseno } from '../entrevista/subtipo.js';
import { generarVariaciones, contraste } from '../entrevista/tema.js';
import { LETRAS, CLASE_MINUS, CLASE_MAYUS } from './opciones/letras.js';

// Estilos candidatos por giro y composición del mockup de cada uno (debe haber 3 composiciones distintas).
const POR_ARQUETIPO = {
  restaurante: ['calido', 'fresco', 'elegante', 'minimalista'], inmobiliaria: ['elegante', 'minimalista', 'calido', 'lujo'],
  clinica: ['fresco', 'minimalista', 'elegante', 'calido'], servicios: ['minimalista', 'elegante', 'calido', 'tecnologico'],
  tienda: ['fresco', 'calido', 'minimalista', 'elegante'], oficios: ['tradicional', 'fresco', 'calido', 'tecnologico'],
  educacion: ['fresco', 'calido', 'minimalista', 'tecnologico'], turismo: ['calido', 'elegante', 'fresco', 'minimalista'],
  generico: ['minimalista', 'fresco', 'calido', 'elegante'],
};
const LAYOUT = { minimalista: 'centrado', tradicional: 'centrado', elegante: 'editorial', lujo: 'editorial', fresco: 'bloques', divertido: 'bloques', calido: 'tarjeta', tecnologico: 'bento' };

const TODOS = ['minimalista', 'fresco', 'calido', 'elegante', 'tecnologico', 'tradicional', 'lujo', 'divertido'];
export function elegirEstilos(arquetipo, preferido, excluir = []) {
  const lista = [preferido, ...(POR_ARQUETIPO[arquetipo] || POR_ARQUETIPO.generico), ...TODOS].filter((e) => e && !excluir.includes(e));
  const out = [], layouts = new Set();
  for (const e of lista) { if (out.includes(e) || layouts.has(LAYOUT[e])) continue; out.push(e); layouts.add(LAYOUT[e]); if (out.length === 3) break; }
  return out;
}

/** Paleta Ollie (tema.js) → claves que entiende la plantilla de mockup del render. */
function paletaMockup(p) {
  const textoBoton = contraste('#FFFFFF', p.primary) >= 4.5 ? '#FFFFFF' : p.main;
  return {
    primary: p.primary, on_primary: textoBoton, accent: p.primary, on_accent: textoBoton, secondary: p['primary-alt'],
    background: p.base, foreground: p.main, muted_foreground: p['main-accent'], card: p.secondary, muted: p.tertiary, border: p['border-light'],
  };
}

async function textosHero(brief) {
  const r = await pedirJSON({
    model: config.generadorModel || config.anthropicModel, max_tokens: 400,
    system: 'Escribes la primera pantalla de la página web de un negocio mexicano. Español de México, concreto, sin emojis, sin frases genéricas ("soluciones integrales", "bienvenidos"), sin datos inventados.',
    contenido: `Brief: ${JSON.stringify({ negocio: brief.negocio, oferta: brief.oferta, cliente_ideal: brief.cliente_ideal, marca: { personalidad: brief.marca?.personalidad, tono: brief.marca?.tono_textos } })}`,
    schema: { type: 'object', properties: {
      titular: { type: 'string', description: '≤ 60 caracteres, promesa concreta' },
      subtitulo: { type: 'string', description: '≤ 110 caracteres' },
      cta: { type: 'string', description: '≤ 24 caracteres, abre WhatsApp' },
      servicios: { type: 'string', description: '3 productos o servicios reales separados por |' },
    }, required: ['titular', 'subtitulo', 'cta', 'servicios'] },
  });
  return r.data;
}

/**
 * @param {object} brief
 * @param {object} mat  resultado de procesarMateriales
 * @param {number} semilla
 * @returns {Promise<{opciones: Array<{etiqueta, estilo, tipografia, paleta, url}>, textos}>}
 */
export async function crearOpciones(brief, mat, semilla = 0, { excluir = [] } = {}) {
  if (!config.renderUrl) throw new Error('RENDER_URL no configurada');
  const arquetipo = brief.negocio?.arquetipo || 'generico';
  const subtipo = brief.negocio?.subtipo_resuelto || brief.negocio?.subtipo;
  const estilos = elegirEstilos(arquetipo, brief.marca?.estilo, excluir);
  const textos = await textosHero(brief);
  const opciones = [];
  for (const [i, estilo] of estilos.entries()) {
    const dd = await datosDiseno({ arquetipo, subtipo, estilo });
    const vars = generarVariaciones({ estilo: dd.estilo_diseno || {}, subtipo_diseno: dd.subtipo_diseno || {}, colores_marca: mat.colores || [], slug_sitio: 'opcion', semilla: semilla + i });
    opciones.push({ etiqueta: 'ABC'[i], estilo, tipografia: { titulos: vars.tipografia.titulos, cuerpo: vars.tipografia.cuerpo }, paleta: vars.paleta, hints: dd.estilo_diseno?.theme_json_hints || {} });
  }
  const r = await fetch(`${config.renderUrl}/v1/mockups`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey },
    body: JSON.stringify({
      comun: {
        negocio: { nombre: brief.negocio?.nombre, giro_texto: brief.negocio?.giro_texto, ciudad: brief.negocio?.ciudad },
        titular: textos.titular, subtitulo: textos.subtitulo, cta: textos.cta,
        servicios: String(textos.servicios || '').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 3),
        foto_url: mat.hero?.url || null, foto_sin_fondo: !!mat.hero?.sin_fondo, logo_url: mat.logo?.url || null,
      },
      opciones: opciones.map((o) => ({ etiqueta: o.etiqueta, estilo: { slug: o.estilo, tipografia: o.tipografia, theme_json_hints: o.hints }, subtipo: { paleta: paletaMockup(o.paleta) } })),
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error(`render mockups ${r.status}`);
  const d = await r.json();
  for (const o of opciones) o.url = d.opciones.find((x) => x.etiqueta === o.etiqueta)?.url || null;
  return { opciones, textos };
}

// --- Letras de las opciones: salen del registro (generador/opciones/). Al agregar una opción no se toca nada de esto. ---
// Ordinales y números por posición: "la segunda" o "la 2" es la opción en la posición 2, cualquiera que sea su letra.
// "La última" es la séptima (así quedó desde que la G era la última adicional).
const POSICION_ORDINAL = { primera: 1, primer: 1, primero: 1, segunda: 2, segundo: 2, tercera: 3, tercero: 3, cuarta: 4, cuarto: 4, quinta: 5, quinto: 5, sexta: 6, sexto: 6, septima: 7, septimo: 7, octava: 8, octavo: 8, novena: 9, noveno: 9, decima: 10, decimo: 10, undecima: 11, undecimo: 11, duodecima: 12, duodecimo: 12, decimotercera: 13, decimotercero: 13, decimotercer: 13, decimocuarta: 14, decimocuarto: 14, decimoquinta: 15, decimoquinto: 15, decimosexta: 16, decimosexto: 16, decimoseptima: 17, decimoseptimo: 17, decimoctava: 18, decimoctavo: 18, ultima: 7, ultimo: 7 };
const ORDINALES = Object.freeze({
  ...Object.fromEntries(Object.entries(POSICION_ORDINAL).filter(([, n]) => LETRAS[n - 1]).map(([k, n]) => [k, LETRAS[n - 1]])),
  ...Object.fromEntries(Array.from(LETRAS, (l, k) => [String(k + 1), l])),
});
const ORDINALES_RE = 'primer[ao]?|segund[ao]|tercer[ao]?|cuart[ao]|quint[ao]|sext[ao]|septim[ao]|octav[ao]|noven[ao]|decim[ao]|undecim[ao]|duodecim[ao]|decimoterc(?:er[ao]?|[ao])|decimocuart[ao]|decimoquint[ao]|decimosext[ao]|decimoseptim[ao]|decimoctav[ao]|ultim[ao]';
// Números del 1 al total de letras, del mayor al menor ("18|17|…|1").
const NUMEROS = Array.from(LETRAS, (_, k) => LETRAS.length - k).join('|');
// En un mensaje corto, una letra suelta cuenta como elección. Las que también son palabra o abreviatura en un chat
// ("o", "q" de "que", "r") solo cuentan si no les sigue otra palabra. Las letras nuevas (después de la R) entran con ese
// mismo cuidado; si alguna no lo necesita, se quita de aquí.
const SIN_CUIDADO = new Set('abcdefghijklmnp');
const LETRA_CORTA = Array.from(LETRAS.toLowerCase(), (l) => (SIN_CUIDADO.has(l) ? l : `${l}(?!\\s+[a-z0-9])`)).join('|');
const RE_CORTO = new RegExp(`(?:^|[\\s,.;:¡!¿?"'(])(${LETRA_CORTA}|${NUMEROS}|${ORDINALES_RE})(?=[\\s,.;:!?)"']|$)`, 'g');
const RE_MAYUS_SUELTA = new RegExp(`(^|[^\\p{L}\\d])(${CLASE_MAYUS})(?![\\p{L}\\d])`, 'gu');
const RE_COLORES_DE = new RegExp(`colores? (?:de|del|de la) (?:la |opcion |propuesta )?(${CLASE_MINUS})\\b`);

/**
 * Interpreta la respuesta del cliente a sus 6 opciones: "la B", "me gusta la a con los colores de c", "ninguna".
 * Una letra cuenta como elección solo si: viene con "la/opción/propuesta/letra", el mensaje es corto (≤ 3 palabras),
 * o es mayúscula suelta (A y E en mayúscula solo si no abren una frase: "A mí no me gustó" no es la A).
 * → {elegido, colores_de} | {ninguna:true, mencionadas[]} | null (no es una elección; p. ej. una pregunta).
 */
export function interpretarEleccion(texto = '') {
  const orig = String(texto).trim();
  const t = ` ${orig.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')} `;
  const palabras = orig.split(/\s+/).filter(Boolean).length;
  const ORD = ORDINALES;
  const PREF = '(?:la|el|opcion|propuesta|op\\.?|letra|numero|#)';
  const letras = [];
  const add = (l) => { if (l && !letras.includes(l)) letras.push(l); };
  // 1) Con prefijo: "la b", "opción C", "la 2", "la segunda".
  for (const m of t.matchAll(new RegExp(`\\b${PREF}\\s+(${CLASE_MINUS}|${NUMEROS}|${ORDINALES_RE})(?![\\w])`, 'g'))) add(ORD[m[1]] || ORD[m[1].replace(/o$/, 'a')] || m[1].toUpperCase());
  // 2) Mensaje corto: "B", "b porfa", "la d", "2", "la segunda".
  if (palabras <= 3) for (const m of t.matchAll(RE_CORTO)) add(ORD[m[1]] || m[1].toUpperCase());
  // 3) Mayúscula suelta: B, C, D, F en cualquier lugar; A y E solo si no abren frase seguidas de una palabra en minúscula.
  for (const m of orig.matchAll(RE_MAYUS_SUELTA)) {
    const l = m[2];
    if (l === 'A' || l === 'E') {
      const ini = m.index + m[1].length;
      const abreFrase = /(^|[.!?¡¿…\n]\s*)$/.test(orig.slice(0, ini));
      if (abreFrase && /^\s+\p{Ll}/u.test(orig.slice(ini + 1))) continue;
    }
    add(l);
  }
  const colores = t.match(RE_COLORES_DE);
  // "no me gusta la C": esa letra NO es elección y la frase no es un rechazo de todas.
  const NEG = new RegExp(`no me (gust\\w*|convenc\\w*|lat\\w*|encant\\w*)( mucho| tanto)?( la| el| ${PREF})* ?(${CLASE_MINUS})\\b`, 'g');
  const negadas = [...t.matchAll(NEG)].map((m) => m[m.length - 1].toUpperCase());
  const tSinNeg = t.replace(NEG, ' ');
  const POS = new RegExp(`(me gusta(ron|n)?|me gusto|me encanta|me encanto|me quedo con|elijo|escojo|quiero|prefiero|vamos con|va la|me late|esta bien)( mas)?( la| el| ${PREF})* ?(${CLASE_MINUS})\\b`, 'g');
  const positivas = [...tSinNeg.matchAll(POS)].filter((m) => !/\bno\s*$/.test(tSinNeg.slice(0, m.index))).map((m) => m[m.length - 1].toUpperCase());
  const RECHAZO = /\bningun[ao]?\b|\bni una\b|no me (gusto|gustaron|gusta|gustan|convence|convencen|convencio|convencieron|late|laten|encanto|encantaron)\b|nada de (eso|esto)|\botras? (opciones|diferentes|distintas|nuevas)\b|todas (estan |se ven )?(feas|mal|iguales)|(quiero|hazme|mandame|dame) otras|no es lo que (busco|queria)/;
  const validas = letras.filter((l) => !negadas.includes(l));
  if (RECHAZO.test(tSinNeg) && !positivas.length) return { ninguna: true, mencionadas: letras };
  // Preguntas ("¿cuáles 6?", "¿dónde las veo?") no son elección salvo que nombre la opción con claridad.
  if (!positivas.length && /\?|cuales|donde|no (me )?(llegaron|abren|veo)|reenv/.test(t) && !new RegExp(`\\b${PREF}\\s+${CLASE_MINUS}\\b`).test(t)) return null;
  if (!validas.length && !positivas.length) return null;
  const base = colores ? [...positivas, ...validas].find((l) => l !== colores[1].toUpperCase()) || validas[0] : (positivas.at(-1) || validas[0]);
  return { elegido: base, colores_de: colores ? colores[1].toUpperCase() : null };
}
