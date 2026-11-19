// Página aparte del menú para restaurantes (etapa 3, decisiones 2 y 3 del 18 y 19-nov-2026; doc del proyecto
// claude/etapa3-restaurantes.md). Es lo que abre el QR de las mesas: se arma a partir de la página del restaurante
// (mismo diseño: colores, letra, barra con el logo) dejando solo la promoción activa, "Lo más pedido" y el menú, más un
// botón de WhatsApp para pedir o llamar al mesero. Sin portada, categorías, reseñas ni visítanos.

const seccion = (html, id) => (html.match(new RegExp(`<section class="[^"]*" id="${id}">[\\s\\S]*?</section>`)) || [''])[0];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** ¿La página es de restaurante (tiene sección de menú)? */
export const tieneMenu = (html) => /<section class="[^"]*\bmenu\b[^"]*" id="menu">/.test(String(html || ''));

/**
 * html: la página completa del restaurante (propuesta o sitio publicado).
 * opts: {nombre, inicio: liga de la página principal, wa: liga de WhatsApp o null, url: liga pública de esta página}
 */
export function paginaMenu(html, { nombre = '', inicio = '/', wa = null, url = null } = {}) {
  if (!tieneMenu(html)) return null;
  const promo = seccion(html, 'promocion');
  const destacados = seccion(html, 'destacados');
  const menu = seccion(html, 'menu');
  const href = wa || (html.match(/<a class="wa" href="([^"]+)"/) || [])[1] || null;
  const boton = href ? `<section class="sec pedir" id="pedir"><a class="btn ancho" href="${esc(href)}" target="_blank" rel="noopener">Pedir por WhatsApp</a><p class="hint">También puedes pedirle a tu mesero.</p></section>` : '';
  let out = html.replace(/<main class="wrap">[\s\S]*<\/main>/, () => `<main class="wrap pagina-menu">${promo}${menu.replace('<h2>Menú</h2>', `<h1 class="h-menu-pag">Menú</h1>`)}${boton}${destacados}</main>`);
  out = out.replace(/<nav>[\s\S]*?<\/nav>/, () => `<nav><a href="#menu">Menú</a>${destacados ? '<a href="#destacados">Lo más pedido</a>' : ''}<a href="${esc(inicio)}">Inicio</a></nav>`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>Menú · ${esc(nombre)}</title>`);
  if (url) out = out.replace(/<link rel="canonical"[^>]*>/, '').replace('</head>', `<link rel="canonical" href="${esc(url)}"></head>`);
  out = out.replace('</head>', '<style id="pagina-menu">.pagina-menu{padding-top:12px}.h-menu-pag{font-size:clamp(30px,7vw,48px);margin:18px 0 14px}.pagina-menu .promo{margin-top:16px}.pedir{padding-top:24px}.pedir .hint{text-align:center}</style></head>');
  // La página del menú no lleva la etiqueta "Propuesta X" ni los scripts de la portada con slider.
  return out;
}
