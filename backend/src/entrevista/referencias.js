// Estudio de las ligas de referencia del brief (marca.referencias_sitios) al cierre de la entrevista.
// - Sitios web → servicio render POST /v1/estudiar (dirección de diseño, nunca copia).
// - Ligas de Figma → REST API de Figma (solo lectura; requiere FIGMA_TOKEN) → variables/estilos → tokens.
// El resultado se guarda en brief.marca.referencias_estudio para que el generador lo use como inspiración declarada.

const RENDER_URL = (process.env.RENDER_URL || '').replace(/\/$/, '');
const RENDER_API_KEY = process.env.RENDER_API_KEY || '';
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';

const esFigma = (u) => /^https?:\/\/(www\.)?figma\.com\/(file|design|proto)\/([A-Za-z0-9]+)/i.test(u);

export async function estudiarReferencias(brief, { timeoutMs = 60000 } = {}) {
  const ligas = (brief?.marca?.referencias_sitios || []).filter((u) => /^https?:\/\//.test(u)).slice(0, 3);
  const out = [];
  for (const url of ligas) {
    try {
      out.push(esFigma(url) ? await estudiarFigma(url, timeoutMs) : await estudiarWeb(url, timeoutMs));
    } catch (err) {
      out.push({ url, tipo: esFigma(url) ? 'figma' : 'web', error: String(err.message).slice(0, 200) });
    }
  }
  return out;
}

async function estudiarWeb(url, timeoutMs) {
  if (!RENDER_URL) return { url, tipo: 'web', error: 'RENDER_URL no configurada' };
  const r = await fetch(`${RENDER_URL}/v1/estudiar`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': RENDER_API_KEY },
    body: JSON.stringify({ url }), signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`render ${r.status}`);
  const d = await r.json();
  return {
    url, tipo: 'web', titulo: d.titulo, resumen: d.resumen, modo: d.modo,
    tipografia: d.tipografia, colores: d.colores, forma: d.forma, densidad: d.densidad?.nivel || null,
    estructura: d.estructura?.orden || [], hero: d.estructura?.hero || null, movil: d.movil || null,
    uso: 'Inspiración: tomar dirección (tipo de letra por rol, temperatura de color, radio, densidad, orden de secciones). Prohibido copiar textos, imágenes, logos o marcado.',
  };
}

/** Lee variables y estilos publicados de un archivo de Figma por REST (solo lectura). */
async function estudiarFigma(url, timeoutMs) {
  if (!FIGMA_TOKEN) return { url, tipo: 'figma', error: 'FIGMA_TOKEN no configurado; se guarda la liga sin estudiar' };
  const key = /figma\.com\/(?:file|design|proto)\/([A-Za-z0-9]+)/i.exec(url)?.[1];
  const h = { 'X-Figma-Token': FIGMA_TOKEN };
  const get = async (p) => {
    const r = await fetch(`https://api.figma.com/v1/${p}`, { headers: h, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) throw new Error(`figma ${r.status} en ${p}`);
    return r.json();
  };
  const meta = await get(`files/${key}?depth=1`);
  const colores = [], tipografias = [];
  // Variables locales (plan Enterprise las expone por REST; en otros planes devuelve 403 → se ignora).
  try {
    const v = await get(`files/${key}/variables/local`);
    for (const varb of Object.values(v.meta?.variables || {})) {
      if (varb.resolvedType === 'COLOR') {
        const modo = Object.values(varb.valuesByMode || {})[0];
        if (modo && typeof modo === 'object' && 'r' in modo) colores.push({ nombre: varb.name, hex: rgbHex(modo) });
      }
    }
  } catch { /* sin variables por REST en este plan */ }
  // Estilos publicados (disponibles en todos los planes).
  try {
    const st = await get(`files/${key}/styles`);
    for (const s of st.meta?.styles || []) {
      if (s.style_type === 'TEXT') tipografias.push(s.name);
      if (s.style_type === 'FILL') colores.push({ nombre: s.name, hex: null });
    }
  } catch { /* sin estilos publicados */ }
  return {
    url, tipo: 'figma', titulo: meta.name, ultima_modificacion: meta.lastModified,
    colores: colores.slice(0, 20), tipografias: tipografias.slice(0, 20),
    resumen: `Figma "${meta.name}": ${colores.length} colores y ${tipografias.length} estilos de texto leídos por REST.`,
    uso: 'Si el archivo es del cliente, sus tokens mandan sobre la paleta del subtipo: mapear colores con nombre primary/accent/background a theme.json. Figma solo se lee; no se escribe.',
  };
}

const rgbHex = ({ r, g, b }) => '#' + [r, g, b].map((n) => Math.round(n * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
