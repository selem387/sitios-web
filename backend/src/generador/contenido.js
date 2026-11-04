// Textos del sitio con Claude. El modelo devuelve JSON (nunca HTML); bloques.js lo convierte en marcado.
// Reglas duras: nada inventado (testimonios, cifras, precios, años, certificaciones), sin emojis ni flechas,
// español de México, tú/usted según marca.tono_textos, frases concretas del negocio (no genéricas de IA).
import { pedirJSON } from '../entrevista/claude.js';
import { config } from '../config.js';

const ITEMS = { type: 'array', items: { type: 'object', properties: { titulo: { type: 'string' }, texto: { type: 'string' } }, required: ['titulo', 'texto'] } };

export const ESQUEMA_CONTENIDO = {
  type: 'object',
  properties: {
    titulo_sitio: { type: 'string', description: 'Título SEO de la página de inicio, ≤ 60 caracteres: negocio + qué hace + ciudad.' },
    descripcion_meta: { type: 'string', description: 'Meta descripción 140-160 caracteres.' },
    lema: { type: 'string', description: 'Frase corta para el pie y la descripción del sitio (≤ 80 caracteres).' },
    hero: {
      type: 'object',
      properties: {
        h1: { type: 'string', description: 'Promesa concreta del negocio, ≤ 70 caracteres. Nada de "Bienvenidos", "Soluciones integrales", "Tu socio de confianza".' },
        subtitulo: { type: 'string', description: 'Para quién es y qué resuelve, 1-2 frases, ≤ 180 caracteres.' },
        cta_principal: { type: 'string', description: 'Verbo + objeto, ≤ 28 caracteres, abre WhatsApp (p. ej. "Cotiza por WhatsApp").' },
        cta_secundario: { type: 'string', description: '≤ 24 caracteres, lleva a #servicios.' },
        nota: { type: 'string', description: 'Opcional: dato real que reduce fricción (horario de respuesta, zona, garantía del brief). Vacío si no hay.' },
      },
      required: ['h1', 'subtitulo', 'cta_principal', 'cta_secundario'],
    },
    servicios: { type: 'object', properties: { titulo: { type: 'string' }, intro: { type: 'string' }, items: ITEMS }, required: ['titulo', 'items'] },
    proceso: { type: 'object', properties: { titulo: { type: 'string' }, intro: { type: 'string' }, items: ITEMS }, description: 'Solo si el brief describe pasos reales (oferta.proceso_pasos) o el giro tiene un proceso evidente; si no, items vacío.' },
    sobre: { type: 'object', properties: { titulo: { type: 'string' }, texto: { type: 'string', description: '2-3 párrafos separados por línea en blanco, con datos del brief (historia, fundador, zona).' } } },
    confianza: { type: 'object', properties: { titulo: { type: 'string' }, intro: { type: 'string' } }, description: 'Solo títulos; las cifras, testimonios y certificaciones se toman tal cual del brief.' },
    faq: { type: 'array', items: { type: 'object', properties: { pregunta: { type: 'string' }, respuesta: { type: 'string' } }, required: ['pregunta', 'respuesta'] }, description: '4-6 preguntas que un cliente real haría; usa brief.faq y brief.objeciones primero.' },
    cta_final: { type: 'object', properties: { titulo: { type: 'string' }, texto: { type: 'string' }, boton: { type: 'string' } }, required: ['titulo', 'boton'] },
    contacto: { type: 'object', properties: { titulo: { type: 'string' } } },
    whatsapp_mensaje: { type: 'string', description: 'Mensaje prellenado de WhatsApp (≤ 90 caracteres), si el brief no trae contacto.mensaje_whatsapp_inicial.' },
    alt_hero: { type: 'string' },
    alt_sobre: { type: 'string' },
    llms_resumen: { type: 'string', description: 'Párrafo factual (≤ 500 caracteres) para llms.txt: qué es, qué ofrece, dónde, cómo contactar.' },
  },
  required: ['titulo_sitio', 'descripcion_meta', 'hero', 'servicios', 'faq', 'cta_final', 'llms_resumen'],
};

const SISTEMA = `Eres el redactor web de IAprop. Escribes los textos de la página de inicio de un negocio mexicano a partir de su brief.

Reglas duras:
- Español de México. Trato: "{{TRATO}}" (tu = tutea; usted = de usted) de forma consistente.
- NO inventes datos: testimonios, cifras, años de experiencia, número de clientes, precios, certificaciones, premios, garantías. Si el brief no los trae, no los menciones.
- Nada de emojis, flechas (→), signos de exclamación en títulos ni MAYÚSCULAS sostenidas.
- Prohibidas frases genéricas de IA: "soluciones integrales", "tu socio de confianza", "llevamos tu negocio al siguiente nivel", "en el mundo actual", "calidad y servicio", "Bienvenidos a", "descubre", "potencia", "transforma", "sin igual", "de clase mundial".
- Cada frase debe poder pertenecer SOLO a este negocio: usa su giro, ciudad/zona, cliente ideal, diferenciador y objeciones.
- Títulos de sección cortos y concretos (≤ 6 palabras). Nada de kicker/eyebrow encima de títulos.
- Servicios: 3 a 6 ítems reales de oferta.items; título ≤ 5 palabras; texto 1-2 frases sobre el resultado para el cliente.
- El CTA principal siempre lleva a WhatsApp; el botón debe decir qué pasa al tocarlo.
- Clichés de diseño/redacción a evitar (lista del sistema): {{CLICHES}}`;

/** Recorta el brief a lo que importa para redactar (menos tokens, menos ruido). */
function briefParaRedactar(brief) {
  const { negocio, objetivo, cliente_ideal, zona, oferta, confianza, faq, objeciones, marca, contacto } = brief || {};
  return {
    negocio, objetivo, cliente_ideal, zona, oferta, faq, objeciones,
    confianza: confianza && { historia_corta: confianza.historia_corta, fundador: confianza.fundador, garantias: confianza.garantias, tiene_testimonios: (confianza.testimonios || []).length, tiene_cifras: (confianza.cifras || []).length },
    marca: marca && { personalidad: marca.personalidad, tono_textos: marca.tono_textos, evitar: marca.evitar, referencias_que_gusta: marca.referencias_que_gusta },
    contacto: contacto && { ciudad: contacto.direccion?.ciudad, horarios: contacto.horarios, mensaje_whatsapp_inicial: contacto.mensaje_whatsapp_inicial },
  };
}

export async function redactar(brief, diseno, { correcciones = [] } = {}) {
  const trato = brief?.marca?.tono_textos === 'usted' ? 'usted' : 'tu';
  const cliches = (diseno?.cliches_ia || []).slice(0, 30).map((c) => (typeof c === 'string' ? c : c.nombre || c.slug || c.regla)).filter(Boolean).join('; ');
  const system = SISTEMA.replace('{{TRATO}}', trato).replace('{{CLICHES}}', cliches || '—');
  const contenido = [
    `Brief (JSON):\n${JSON.stringify(briefParaRedactar(brief), null, 1)}`,
    `Subtipo de negocio: ${diseno?.arquetipo}/${diseno?.subtipo}. Patrón de landing del subtipo: ${diseno?.subtipo_diseno?.patron_landing || '—'}; secciones de referencia: ${(diseno?.subtipo_diseno?.patrones_detalle || []).map((p) => p.secciones).join(' | ') || '—'}`,
    diseno?.menu_texto?.length ? `Menú real del negocio (úsalo para los textos; no inventes productos ni precios fuera de él):\n${JSON.stringify(diseno.menu_texto).slice(0, 4000)}` : '',
    correcciones.length ? `Correcciones obligatorias de la revisión anterior:\n- ${correcciones.join('\n- ')}` : '',
  ].filter(Boolean).join('\n\n');
  // Esquema muy anidado: con tool_use el modelo a veces aplana o rompe los objetos. Aquí pedimos JSON en texto
  // contra el esquema descrito y validamos; un reintento si no parsea o faltan secciones clave.
  const model = config.generadorModel || config.anthropicModel;
  let ultimoError = null;
  for (let intento = 0; intento < 2; intento++) {
    const r = await jsonEnTexto({ system, contenido: `${contenido}\n\nEsquema de la respuesta (JSON Schema):\n${JSON.stringify(ESQUEMA_CONTENIDO)}${ultimoError ? `\n\nTu respuesta anterior no sirvió: ${ultimoError}. Devuelve el JSON completo.` : ''}`, model });
    const faltan = ['hero', 'servicios', 'faq', 'cta_final'].filter((k) => !r.data?.[k]);
    if (r.data && !faltan.length && r.data.hero?.h1 && (r.data.servicios?.items || []).length >= 3) return { ...r, data: limpiar(r.data) };
    ultimoError = r.data ? `faltan o vienen vacíos: ${faltan.join(', ') || 'hero.h1 / servicios.items'}` : 'no era JSON válido';
    if (intento === 1 && r.data) return { ...r, data: limpiar(r.data) };
  }
  throw new Error(`Redacción inválida: ${ultimoError}`);
}

async function jsonEnTexto({ system, contenido, model, max_tokens = 8000 }) {
  const t0 = Date.now();
  const res = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens,
      system: `${system}\n\nFORMATO: responde ÚNICAMENTE con un objeto JSON válido que cumpla el esquema dado. Sin texto antes ni después, sin bloques de código.`,
      messages: [{ role: 'user', content: contenido }],
    }),
    signal: AbortSignal.timeout(180000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Claude: ${json?.error?.message || res.status}`);
  const texto = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  let data = null;
  const i = texto.indexOf('{'), j = texto.lastIndexOf('}');
  if (i >= 0 && j > i) { try { data = JSON.parse(texto.slice(i, j + 1)); } catch { data = null; } }
  return { data, usage: json.usage || {}, model, duracion_ms: Date.now() - t0 };
}

// Red de seguridad determinista sobre lo que devuelva el modelo.
const PROHIBIDAS = /(soluciones integrales|socio de confianza|siguiente nivel|bienvenid[oa]s a|de clase mundial)/i;
// A veces el modelo entrega arreglos/objetos anidados como cadena JSON dentro del tool_use.
const comoArreglo = (v) => { if (Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } } return []; };
const comoObjeto = (v) => { if (v && typeof v === 'object' && !Array.isArray(v)) return v; if (typeof v === 'string') { try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } } return {}; };
function normalizar(d) {
  for (const k of ['hero', 'servicios', 'proceso', 'sobre', 'confianza', 'cta_final', 'contacto']) d[k] = comoObjeto(d[k]);
  // Mínimos para que el marcado nunca quede sin H1 ni CTA aunque el modelo omita campos.
  d.hero.h1 ||= d.titulo_sitio || ''; d.hero.cta_principal ||= 'Escríbenos por WhatsApp'; d.hero.cta_secundario ||= 'Ver servicios';
  d.cta_final.titulo ||= '¿Hablamos?'; d.cta_final.boton ||= d.hero.cta_principal;
  d.faq = comoArreglo(d.faq);
  for (const k of ['servicios', 'proceso']) d[k].items = comoArreglo(d[k].items).map(comoObjeto).filter((i) => i.titulo);
  d.faq = d.faq.map(comoObjeto).filter((f) => f.pregunta && f.respuesta);
  return d;
}
export function limpiar(d) {
  d = normalizar(d || {});
  const txt = (s) => (typeof s === 'string' ? s.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s*→\s*/g, ' ').replace(/\s{2,}/g, ' ').trim() : s);
  const rec = (o) => (Array.isArray(o) ? o.map(rec) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, rec(v)])) : txt(o));
  const out = rec(d);
  out._avisos = [];
  const todo = JSON.stringify(out);
  if (PROHIBIDAS.test(todo)) out._avisos.push(`Frase genérica detectada: ${todo.match(PROHIBIDAS)[0]}`);
  if (out.servicios?.items) out.servicios.items = out.servicios.items.slice(0, 6);
  if (out.faq) out.faq = out.faq.slice(0, 6);
  return out;
}
