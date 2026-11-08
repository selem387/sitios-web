// Lo que el sitio en vivo le dice a Google, a WhatsApp/Facebook y a los motores de IA (8-nov-2026):
// meta description, Open Graph/Twitter, favicon, color del navegador, lang es-MX y JSON-LD del negocio + preguntas frecuentes.
// Todo sale de datos reales del brief (nada inventado). El bloque va entre <!--seo--> … <!--/seo--> para que las fichas
// de propiedad lo reemplacen por el suyo.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const limpio = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const corta = (s, n) => { const t = limpio(s); if (t.length <= n) return t; const c = t.slice(0, n - 1); return `${c.slice(0, Math.max(c.lastIndexOf(' '), n - 20))}…`; };
const abs = (u, base) => { try { return u ? new URL(u, base).href : null; } catch { return null; } };

/** Frase para Google y para la tarjeta al compartir: qué es, dónde y por qué (≤ 155 caracteres). */
export function descripcionMeta(brief = {}) {
  const n = brief.negocio || {};
  const giro = limpio(n.giro_texto).replace(/[.;].*$/, '');
  const lugar = [n.ciudad, n.estado].filter(Boolean).join(', ');
  const base = [n.nombre, giro && `${giro}${lugar ? ` en ${lugar}` : ''}`].filter(Boolean).join(': ');
  const extra = limpio(brief.oferta?.diferenciador) || limpio(brief.objetivo?.accion_cliente_ideal) || (brief.oferta?.items || []).slice(0, 3).map((i) => i.nombre).filter(Boolean).join(', ');
  return corta([base, extra].filter(Boolean).join('. '), 155);
}

/** Contenido en la forma que espera jsonLd()/llmsTxt() del generador. */
export function contenidoSeo(brief = {}) {
  return {
    descripcion_meta: descripcionMeta(brief),
    llms_resumen: corta([descripcionMeta(brief), limpio(brief.confianza?.historia_corta)].filter(Boolean).join(' '), 400),
    servicios: { items: (brief.oferta?.items || []).filter((i) => i?.nombre).slice(0, 20).map((i) => ({ titulo: limpio(i.nombre), texto: limpio(i.descripcion_corta || i.para_quien || '') })) },
    faq: (brief.faq || []).filter((f) => f?.pregunta && f?.respuesta).slice(0, 15).map((f) => ({ pregunta: limpio(f.pregunta), respuesta: limpio(f.respuesta) })),
  };
}

/**
 * Inserta las etiquetas en el HTML del sitio.
 * url: dirección pública con / final. mat: materiales (hero, logo). color: color de marca. jsonLd: función del generador.
 */
export function conSeo(html, { brief = {}, mat = {}, url, color, jsonLd }) {
  const n = brief.negocio || {};
  const desc = descripcionMeta(brief);
  const titulo = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || esc(n.nombre || '');
  const imagen = abs(mat.hero?.url || mat.logo?.url, url);
  const logo = abs(mat.logo?.url, url);
  let ld = '';
  if (jsonLd) {
    const cont = contenidoSeo(brief);
    const doc = jsonLd(brief, cont, url, n.arquetipo);
    const neg = doc['@graph'][0];
    if (imagen) neg.image = imagen;
    if (logo) neg.logo = logo;
    if (!neg.address && n.ciudad) neg.address = { '@type': 'PostalAddress', addressLocality: n.ciudad, ...(n.estado ? { addressRegion: n.estado } : {}), addressCountry: 'MX' };
    if (typeof brief.contacto?.direccion === 'string' && brief.contacto.direccion.trim() && neg.address) neg.address.streetAddress = limpio(brief.contacto.direccion);
    if (brief.contacto?.google_maps_url) neg.hasMap = brief.contacto.google_maps_url;
    if (neg.telephone) { const d = String(neg.telephone).replace(/\D/g, ''); neg.telephone = d.length === 10 ? `+52${d}` : d.length === 12 && d.startsWith('52') ? `+${d}` : neg.telephone; }
    ld = `<script type="application/ld+json">${JSON.stringify(doc).replace(/</g, '\\u003c')}</script>`;
  }
  const seo = `<!--seo--><meta name="description" content="${esc(desc)}">`
    + `<meta property="og:type" content="website"><meta property="og:locale" content="es_MX"><meta property="og:site_name" content="${esc(n.nombre || '')}">`
    + `<meta property="og:title" content="${titulo}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">`
    + (imagen ? `<meta property="og:image" content="${esc(imagen)}"><meta name="twitter:image" content="${esc(imagen)}">` : '')
    + `<meta name="twitter:card" content="${imagen ? 'summary_large_image' : 'summary'}">${ld}<!--/seo-->`;
  const icono = logo ? `<link rel="icon" href="${esc(logo)}"><link rel="apple-touch-icon" href="${esc(logo)}">` : '';
  const tema = /^#[0-9a-f]{6}$/i.test(color || '') ? `<meta name="theme-color" content="${color}">` : '';
  return html.replace(/<html lang="es"/, '<html lang="es-MX"').replace('</head>', () => `${seo}${icono}${tema}</head>`);
}
