// Opciones de diseño A/B/C para el cliente (antes de generar): 3 estilos con composición distinta,
// con su logo, sus colores y su foto, renderizadas por el servicio render. La opción elegida fija estilo,
// tipografía y paleta del sitio final, para que el sitio se parezca a lo que el cliente escogió.
import { config } from '../config.js';
import { pedirJSON } from '../entrevista/claude.js';
import { datosDiseno } from '../entrevista/subtipo.js';
import { generarVariaciones, contraste } from '../entrevista/tema.js';

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

/** Interpreta la respuesta del cliente: "la B", "me gusta la a con los colores de c", "ninguna". */
export function interpretarEleccion(texto = '') {
  const t = ` ${String(texto).toLowerCase()} `;
  const letras = [...t.matchAll(/(?:^|[\s,.;:¡!¿?"'(])(?:la |opci[oó]n |op\. ?)?([abc])(?=[\s,.;:!?)"']|$)/g)].map((m) => m[1].toUpperCase());
  const colores = t.match(/colores? (?:de|del|de la) (?:la |opci[oó]n )?([abc])\b/);
  if (/ninguna|ninguno|no me gusta(n)? ninguna/.test(t) && !letras.length) return { ninguna: true };
  const ord = { primera: 'A', primer: 'A', '1': 'A', segunda: 'B', '2': 'B', tercera: 'C', '3': 'C', 'última': 'C', ultima: 'C' };
  if (!letras.length) { const m = t.match(/\b(primera|primer|segunda|tercera|[uú]ltima|[123])\b/); if (m) letras.push(ord[m[1]] || ord[m[1].replace('ú', 'u')]); }
  if (!letras.length) return null;
  const base = colores ? letras.find((l) => l !== colores[1].toUpperCase()) || letras[0] : letras[0];
  return { elegido: base, colores_de: colores ? colores[1].toUpperCase() : null };
}
