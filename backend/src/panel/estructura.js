import sanitizeHtml from 'sanitize-html';
// Cambios de estructura que pide el cliente por chat sobre su sitio en vivo, aplicados al HTML ya armado:
// ocultar o reordenar secciones, agregar secciones nuevas, rehacer la portada, el encabezado o el pie, y cambiar el menú.
// Se guardan en sitios_vivos.contenido.diseno.estructura y se aplican en cada render (se pueden deshacer).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Secciones que el dueño edita desde su panel: se pueden ocultar o reordenar, pero no rehacer a mano (se congelarían).
export const EDITABLES = ['servicios', 'menu', 'faq', 'resenas', 'sobre', 'contacto', 'propiedades', 'trabajo', 'promocion'];
const IFRAMES_OK = /^https:\/\/(www\.google\.com\/maps\/embed|maps\.google\.com\/maps|www\.youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/i;

// Etiquetas y atributos permitidos en el HTML que escribe el editor (lista blanca con sanitize-html, no regex):
// nada de scripts, estilos, formularios, eventos on*, ni ligas javascript:/data:.
const ETIQUETAS = ['section', 'div', 'header', 'footer', 'nav', 'article', 'aside', 'main', 'figure', 'figcaption', 'picture', 'source',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'br', 'hr', 'blockquote', 'q', 'cite',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'a', 'img', 'iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary', 'time', 'address', 'sup', 'sub'];
const ESTILO_PELIGROSO = /url\s*\(|expression\s*\(|@import|javascript:|behavior\s*:|-moz-binding/i;
const OPCIONES = {
  allowedTags: ETIQUETAS,
  allowedAttributes: {
    '*': ['class', 'id', 'style', 'title', 'aria-label', 'aria-hidden', 'role', 'lang', 'dir', 'data-*'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding', 'fetchpriority'],
    source: ['srcset', 'sizes', 'media', 'type'],
    iframe: ['src', 'loading', 'allowfullscreen', 'referrerpolicy', 'title'],
    time: ['datetime'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'], details: ['open'], ol: ['start'],
  },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https', 'http'], source: ['https', 'http'], iframe: ['https'] },
  allowProtocolRelative: false,
  allowedIframeHostnames: ['www.google.com', 'maps.google.com', 'www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'template', 'title', 'head'],
  transformTags: {
    a: (tag, at) => ({ tagName: 'a', attribs: { ...at, ...(at.target === '_blank' ? { rel: 'noopener noreferrer' } : {}) } }),
    iframe: (tag, at) => (IFRAMES_OK.test(at.src || '')
      ? { tagName: 'iframe', attribs: { src: at.src, loading: 'lazy', style: 'width:100%;aspect-ratio:16/9;border:0;border-radius:16px', allowfullscreen: '', referrerpolicy: 'no-referrer-when-downgrade', ...(at.title ? { title: at.title } : {}) } }
      : { tagName: 'span', attribs: {}, text: '' }),
  },
};

/** Limpia HTML escrito por el editor con lista blanca: sin scripts, estilos, formularios, eventos ni ligas javascript:/data:. */
export function limpiarHtml(html) {
  const t = sanitizeHtml(String(html || '').slice(0, 30000), OPCIONES);
  // Atributo style: se queda solo si no trae url(), expression(), @import ni javascript:.
  return t.replace(/\sstyle="([^"]*)"/gi, (m, v) => (ESTILO_PELIGROSO.test(v.replace(/&[#\w]+;/g, '')) ? '' : m));
}

/** Texto visible de un fragmento HTML, renglón por renglón (para verificar que no se invente texto). */
export const textoDe = (html) => String(html || '').replace(/<(br|\/p|\/h[1-6]|\/li|\/div|\/blockquote|\/figcaption|\/a)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ');

const reSeccion = (id) => (id === 'portada'
  ? /<section class="hero[\s\S]*?<\/section>/
  : new RegExp(`<section\\b[^>]*\\sid="${id.replace(/[^a-z0-9_-]/gi, '')}"[^>]*>[\\s\\S]*?<\\/section>`));

/** Valida la estructura que propone el editor. Devuelve {estructura limpia, errores}. */
export function validarEstructura(e = {}, { html = '', imagenes = [] } = {}) {
  const errores = [];
  const ids = new Set([...html.matchAll(/<section\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]).concat(['portada']));
  const lista = (v) => (Array.isArray(v) ? v.map(String) : []);
  const out = { ocultas: [], orden: [], extras: [], reemplazos: {}, menu: null };
  const extrasIds = new Set((Array.isArray(e.extras) ? e.extras : []).map((x, i) => `extra-${String(x?.id || i + 1).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^extra-/, '').slice(0, 30)}`));
  const existe = (id) => ids.has(id) || extrasIds.has(id);
  for (const id of lista(e.ocultas)) {
    if (id === 'portada') errores.push('No se puede ocultar la portada');
    else if (!existe(id)) errores.push(`La sección "${id}" no existe en la página: no la uses y ponla en no_pude`);
    else out.ocultas.push(id);
  }
  for (const id of lista(e.orden)) if (id !== 'portada' && !existe(id)) errores.push(`La sección "${id}" no existe en la página: no la uses en orden y ponla en no_pude`);
  out.orden = lista(e.orden).filter((id) => id !== 'portada' && existe(id));
  for (const [i, x] of (Array.isArray(e.extras) ? e.extras : []).entries()) {
    const id = `extra-${String(x?.id || i + 1).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^extra-/, '').slice(0, 30)}`;
    if (!x?.html) { errores.push(`La sección nueva ${id} no tiene contenido`); continue; }
    if (x.despues_de && !ids.has(x.despues_de) && !out.extras.some((y) => y.id === x.despues_de)) errores.push(`"${x.despues_de}" no existe para poner la sección nueva después`);
    out.extras.push({ id, despues_de: x.despues_de || null, html: limpiarHtml(x.html) });
  }
  for (const [id, h] of Object.entries(e.reemplazos || {})) {
    if (EDITABLES.includes(id)) { errores.push(`La sección "${id}" se edita desde el panel: cámbiala con "secciones" o con CSS, no reescribiendo su HTML`); continue; }
    if (!['portada', 'encabezado', 'pie'].includes(id) && !ids.has(id) && !id.startsWith('extra-')) { errores.push(`"${id}" no existe`); continue; }
    out.reemplazos[id] = limpiarHtml(h);
  }
  if (Array.isArray(e.menu)) out.menu = e.menu.filter((m) => m?.texto && m?.href && /^(#[\w-]+|\/[\w/-]*|https:\/\/)/.test(m.href)).slice(0, 10).map((m) => ({ texto: String(m.texto).slice(0, 40), href: String(m.href) }));
  // Solo imágenes que ya existen (las del cliente o las de la página).
  const permitidas = new Set([...imagenes, ...[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1])]);
  for (const h of [...out.extras.map((x) => x.html), ...Object.values(out.reemplazos)]) {
    for (const m of h.matchAll(/<img[^>]+src="([^"]+)"/g)) if (!permitidas.has(m[1])) errores.push(`La imagen ${m[1].slice(0, 80)} no es del cliente ni está en la página`);
  }
  return { estructura: out, errores };
}

/** Aplica la estructura al HTML del sitio. */
export function aplicarEstructura(html, est) {
  if (!est) return html;
  let out = html;
  // Rehacer portada, encabezado y pie.
  for (const [id, h] of Object.entries(est.reemplazos || {})) {
    if (id === 'encabezado') out = out.replace(/<header class="barra">[\s\S]*?<\/header>/, () => `<header class="barra">${h}</header>`);
    else if (id === 'pie') out = out.replace(/<footer>[\s\S]*?<\/footer>/, () => `<footer>${h}</footer>`);
    else if (id === 'portada') out = out.replace(reSeccion('portada'), () => (/^\s*<section/i.test(h) ? h : `<section class="hero h-propia"><div class="wrap">${h}</div></section>`));
    else out = out.replace(reSeccion(id), () => (/^\s*<section/i.test(h) ? h : `<section class="sec" id="${esc(id)}"><div class="wrap">${h}</div></section>`));
  }
  // Secciones nuevas.
  for (const x of est.extras || []) {
    const sec = /^\s*<section/i.test(x.html) ? x.html.replace(/<section\b/i, `<section id="${esc(x.id)}"`) : `<section class="sec" id="${esc(x.id)}"><div class="wrap">${x.html}</div></section>`;
    const ancla = x.despues_de && out.match(reSeccion(x.despues_de));
    out = ancla ? out.replace(ancla[0], () => ancla[0] + sec) : out.replace('</main>', () => `${sec}</main>`);
  }
  // Ocultar.
  for (const id of est.ocultas || []) out = out.replace(reSeccion(id), '').replace(new RegExp(`<a href="#${id}">[^<]*<\\/a>`, 'g'), '');
  // Reordenar (la portada siempre primero).
  if (est.orden?.length) {
    const m = out.match(/<main>([\s\S]*)<\/main>/);
    if (m) {
      const piezas = [...m[1].matchAll(/<section\b[^>]*>[\s\S]*?<\/section>|<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>|<div class="wrap"><div class="galeria g-eq">[\s\S]*?<\/div><\/div>/g)].map((x) => x[0]);
      const idDe = (p) => (/^<section class="hero/.test(p) ? 'portada' : (p.match(/^<section\b[^>]*\sid="([^"]+)"/) || [])[1] || null);
      const secciones = piezas.filter((p) => p.startsWith('<section'));
      const resto = m[1].replace(/<section\b[^>]*>[\s\S]*?<\/section>/g, '');
      // Las secciones que no están en "orden" viajan pegadas a la anterior (p. ej. una sección nueva junto a la que la ancla).
      const grupos = [];
      for (const p of secciones) {
        const id = idDe(p);
        const i = id === 'portada' ? -1 : est.orden.indexOf(id);
        if (i !== -1 || id === 'portada' || !grupos.length) grupos.push({ pos: id === 'portada' ? -1 : i === -1 ? 1000 + grupos.length : i, piezas: [p] });
        else grupos[grupos.length - 1].piezas.push(p);
      }
      const ordenadas = grupos.sort((a, b) => a.pos - b.pos).flatMap((g) => g.piezas);
      out = out.replace(m[0], () => `<main>${ordenadas.join('')}${resto}</main>`);
    }
  }
  // Menú.
  if (est.menu) out = out.replace(/<nav>[\s\S]*?<\/nav>/, () => `<nav>${est.menu.map((x) => `<a href="${esc(x.href)}"${/^https:/.test(x.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(x.texto)}</a>`).join('')}</nav>`);
  return out;
}
