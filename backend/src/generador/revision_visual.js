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

async function capturasOpcion(o) {
  const [pc, cel, galeria] = await Promise.all([
    captura(o.url, { ancho: 1366 }),
    captura(o.url, { ancho: 390 }),
    captura(o.url, { ancho: 1366, selector: '#trabajo .galeria, #galeria .galeria, .galeria, #propiedades' }),
  ]);
  return [{ vista: 'computadora (primera pantalla)', url: pc }, { vista: 'celular (primera pantalla)', url: cel }, { vista: 'galería de trabajos en computadora', url: galeria }];
}

const REGLAS = `Reglas (todas obligatorias):
- Ninguna foto deformada: estirada o aplastada (proporciones alteradas). OJO: una foto de fondo a pantalla completa que se recorta en los bordes (cover) es NORMAL y está bien, igual que una foto vertical mostrada completa con los costados difuminados; solo es falla si el recorte corta una cara, una cabeza o al sujeto principal de forma que se ve mal.
- Ninguna foto repetida dentro de la MISMA sección visible (la foto de portada puede volver a aparecer en la galería).
- El logo del cliente se ve y es legible; sus fotos están presentes (no hay huecos ni cuadros vacíos).
- Ningún texto encimado con otro texto o botón, cortado o ilegible por bajo contraste; todo se lee en celular.
- Sin desbordes horizontales ni botones cortados; nada roto.
- No parece una presentación de puro texto: las fotos son protagonistas.
- Se ve profesional y atractiva, con tipografía y colores que combinan.
Si una vista no se pudo capturar, NO la cuentes como falla.
Pon ok=false solo por fallas reales y visibles de esta lista; detalles de gusto menores van en problemas pero no impiden ok=true.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'true solo si cumple TODAS las reglas y se ve lista para mostrarse a un cliente.' },
    parecido: { type: 'integer', minimum: 0, maximum: 5, description: '0 si no hay referencia; 1–5 qué tanto se parece al estilo de la referencia (no a su contenido).' },
    problemas: { type: 'array', items: { type: 'string' }, description: 'Problemas concretos y dónde (p. ej. "celular: el título se encima con el botón").' },
  },
  required: ['ok', 'problemas'],
};

async function revisarUna(o, caps, { refCaptura, pedido }) {
  if (!caps.some((c) => c.url)) return { ok: true, problemas: [], sin_capturas: true };
  const contenido = [{ type: 'text', text: `Opción ${o.letra} (“${o.nombre}”) de la página web de un cliente.${pedido ? `\nLO QUE PIDIÓ EL CLIENTE: ${pedido.slice(0, 800)}` : ''}\n${REGLAS}` }];
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
    return { ok: !!r.data.ok, parecido: r.data.parecido ?? null, problemas: r.data.problemas || [] };
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
      const caps = await capturasOpcion(o);
      const v = await revisarUna(o, caps, { refCaptura, pedido });
      if (v.ok && refCaptura && v.parecido != null && v.parecido < 3) { v.ok = false; v.problemas = [...v.problemas, `poco parecida a la referencia (${v.parecido}/5)`]; }
      return { letra: o.letra, ...v, capturas: caps.map((c) => c.url).filter(Boolean) };
    }));
    out.push(...lote);
  }
  return out;
}
