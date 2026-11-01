// Marcado de bloques de WordPress (Gutenberg) a partir del contenido estructurado del generador.
// Deterministas a propósito: el modelo escribe textos, no HTML. Así garantizamos 1 H1, enlaces de WhatsApp,
// jerarquía correcta y que no aparezcan los clichés de cliches_ia (kicker sobre título, tarjetas anidadas,
// iconos en cuadrito, borde lateral de color, texto con degradado, flechas o emojis en botones).
// Colores por slug de la paleta del tema (tema.js): primary, main, main-accent, base, secondary, tertiary, border-light.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON de atributos dentro de un comentario HTML: no puede contener "--".
const attrs = (o) => (o && Object.keys(o).length ? ' ' + JSON.stringify(o).replace(/--/g, '\\u002d\\u002d') : '');
const sp = (k) => `var:preset|spacing|${k}`;
const spCss = (k) => `var(--wp--preset--spacing--${k})`;

// Espaciado vertical de sección según densidad del brief.
const PAD = { compacta: 'x-large', media: 'xx-large', aireada: 'xxx-large' };

export const waUrl = (numero, mensaje) => {
  const n = String(numero || '').replace(/\D/g, '');
  if (!n) return null;
  const num = n.length === 10 ? `52${n}` : n; // México: 10 dígitos → +52
  return `https://wa.me/${num}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
};

function heading(texto, { nivel = 2, tam = null, clase = '', ancla = null } = {}) {
  const a = { ...(nivel !== 2 ? { level: nivel } : {}), ...(tam ? { fontSize: tam } : {}), ...(ancla ? { anchor: ancla } : {}) };
  const cls = ['wp-block-heading', tam ? `has-${tam}-font-size` : '', clase].filter(Boolean).join(' ');
  return `<!-- wp:heading${attrs(a)} -->\n<h${nivel}${ancla ? ` id="${esc(ancla)}"` : ''} class="${cls}">${esc(texto)}</h${nivel}>\n<!-- /wp:heading -->`;
}

function parrafo(texto, { tam = null, color = null } = {}) {
  if (!texto) return '';
  const a = { ...(color ? { textColor: color } : {}), ...(tam ? { fontSize: tam } : {}) };
  const cls = [color ? `has-${color}-color has-text-color` : '', tam ? `has-${tam}-font-size` : ''].filter(Boolean).join(' ');
  return `<!-- wp:paragraph${attrs(a)} -->\n<p${cls ? ` class="${cls}"` : ''}>${esc(texto)}</p>\n<!-- /wp:paragraph -->`;
}

function boton({ texto, url, contorno = false, nueva = false }) {
  if (!texto || !url) return '';
  const a = contorno ? { className: 'is-style-outline' } : {};
  const extra = nueva ? ' target="_blank" rel="noreferrer noopener"' : '';
  return `<!-- wp:button${attrs(a)} -->\n<div class="wp-block-button${contorno ? ' is-style-outline' : ''}"><a class="wp-block-button__link wp-element-button" href="${esc(url)}"${extra}>${esc(texto)}</a></div>\n<!-- /wp:button -->`;
}

function botones(lista) {
  const b = lista.filter((x) => x && x.texto && x.url).map(boton).join('\n');
  if (!b) return '';
  return `<!-- wp:buttons {"style":{"spacing":{"blockGap":{"left":"${sp('small')}"}}}} -->\n<div class="wp-block-buttons">${b}</div>\n<!-- /wp:buttons -->`;
}

function imagen(clave, alt, { ratio = '4/5', prioridad = false } = {}) {
  const a = { id: '__ID__', sizeSlug: 'large', linkDestination: 'none', aspectRatio: ratio, scale: 'cover' };
  const json = attrs(a).replace('"__ID__"', `{{media:${clave}:id}}`);
  const carga = prioridad ? ' fetchpriority="high" loading="eager"' : ' loading="lazy"';
  return `<!-- wp:image${json} -->\n<figure class="wp-block-image size-large"><img src="{{media:${clave}:grande}}" alt="${esc(alt)}" class="wp-image-{{media:${clave}:id}}" style="aspect-ratio:${ratio};object-fit:cover"${carga}/></figure>\n<!-- /wp:image -->`;
}

/** Sección: group full con padding vertical según densidad y fondo opcional. */
function seccion(nombre, interior, { densidad = 'media', fondo = null, ancla = null, texto = null } = {}) {
  const pad = PAD[densidad] || PAD.media;
  const a = {
    metadata: { name: nombre }, ...(ancla ? { anchor: ancla } : {}), align: 'full',
    style: { spacing: { padding: { top: sp(pad), bottom: sp(pad), left: sp('medium'), right: sp('medium') }, blockGap: sp('large') } },
    ...(fondo ? { backgroundColor: fondo } : {}), ...(texto ? { textColor: texto } : {}),
    layout: { type: 'constrained' },
  };
  const cls = ['wp-block-group', 'alignfull', fondo ? `has-${fondo}-background-color has-background` : '', texto ? `has-${texto}-color has-text-color` : ''].filter(Boolean).join(' ');
  const style = `padding-top:${spCss(pad)};padding-right:${spCss('medium')};padding-bottom:${spCss(pad)};padding-left:${spCss('medium')}`;
  return `<!-- wp:group${attrs(a)} -->\n<div${ancla ? ` id="${esc(ancla)}"` : ''} class="${cls}" style="${style}">\n${interior}\n</div>\n<!-- /wp:group -->`;
}

function grupo(interior, { ancho = false, gap = 'small', nombre = null } = {}) {
  const a = { ...(nombre ? { metadata: { name: nombre } } : {}), ...(ancho ? { align: 'wide' } : {}), style: { spacing: { blockGap: sp(gap) } }, layout: { type: 'constrained' } };
  return `<!-- wp:group${attrs(a)} -->\n<div class="wp-block-group${ancho ? ' alignwide' : ''}">\n${interior}\n</div>\n<!-- /wp:group -->`;
}

function columnas(cols, { ancho = true, alinear = 'center', gap = 'x-large' } = {}) {
  const a = { align: ancho ? 'wide' : undefined, verticalAlignment: alinear, style: { spacing: { blockGap: { left: sp(gap), top: sp('large') } } } };
  const inner = cols.map(({ html, ancho: w }) => {
    const ca = { verticalAlignment: alinear, ...(w ? { width: w } : {}) };
    return `<!-- wp:column${attrs(ca)} -->\n<div class="wp-block-column is-vertically-aligned-${alinear}"${w ? ` style="flex-basis:${w}"` : ''}>\n${html}\n</div>\n<!-- /wp:column -->`;
  }).join('\n');
  return `<!-- wp:columns${attrs(JSON.parse(JSON.stringify(a)))} -->\n<div class="wp-block-columns${ancho ? ' alignwide' : ''} are-vertically-aligned-${alinear}">\n${inner}\n</div>\n<!-- /wp:columns -->`;
}

/** Lista de ítems en rejilla, separados por una línea superior (no tarjetas: evita nested-cards e icon-tile-stack). */
function rejilla(items, { columnasMax = 3, numerar = false } = {}) {
  const n = Math.min(columnasMax, Math.max(1, items.length === 4 ? 2 : items.length));
  const celdas = items.map((it, i) => {
    const a = { style: { border: { top: { color: 'var:preset|color|border-light', width: '1px' } }, spacing: { padding: { top: sp('medium') }, blockGap: sp('small') } }, layout: { type: 'constrained' } };
    const num = numerar ? parrafo(String(i + 1).padStart(2, '0'), { color: 'primary', tam: 'small' }) + '\n' : '';
    return `<!-- wp:group${attrs(a)} -->\n<div class="wp-block-group" style="border-top-color:var(--wp--preset--color--border-light);border-top-width:1px;padding-top:${spCss('medium')}">\n${num}${heading(it.titulo, { nivel: 3, tam: 'medium' })}\n${parrafo(it.texto, { color: 'main-accent' })}\n</div>\n<!-- /wp:group -->`;
  }).join('\n');
  const a = { align: 'wide', style: { spacing: { blockGap: { top: sp('large'), left: sp('large') } } }, layout: { type: 'grid', columnCount: n, minimumColumnWidth: null } };
  return `<!-- wp:group${attrs(a)} -->\n<div class="wp-block-group alignwide">\n${celdas}\n</div>\n<!-- /wp:group -->`;
}

function encabezadoSeccion(titulo, intro, ancla) {
  return grupo([heading(titulo, { ancla }), parrafo(intro, { tam: 'medium', color: 'main-accent' })].filter(Boolean).join('\n'), { ancho: true, nombre: 'Encabezado' });
}

/* ------------------------------------------------------------------ */
/* Secciones                                                           */
/* ------------------------------------------------------------------ */

export function hero(c, ctx) {
  const ctas = botones([
    { texto: c.cta_principal, url: ctx.wa || ctx.tel },
    { texto: c.cta_secundario, url: c.cta_secundario_url || '#servicios', contorno: true },
  ]);
  const texto = [
    heading(c.h1, { nivel: 1, tam: 'xx-large' }),
    parrafo(c.subtitulo, { tam: 'large', color: 'main-accent' }),
    ctas,
    c.nota ? parrafo(c.nota, { tam: 'small', color: 'main-accent' }) : '',
  ].filter(Boolean).join('\n');
  const interior = ctx.medios.hero
    ? columnas([{ html: grupo(texto, { gap: 'medium' }), ancho: '55%' }, { html: imagen('hero', ctx.medios.hero.alt, { ratio: '4/5', prioridad: true }), ancho: '45%' }])
    : grupo(texto, { ancho: true, gap: 'medium' });
  return seccion('Hero', interior, { densidad: ctx.densidad });
}

export function servicios(s, ctx) {
  if (!s?.items?.length) return '';
  return seccion('Servicios', [encabezadoSeccion(s.titulo, s.intro, 'servicios'), rejilla(s.items)].join('\n'), { densidad: ctx.densidad, fondo: 'tertiary' });
}

export function proceso(s, ctx) {
  if (!s?.items?.length || s.items.length < 3) return '';
  return seccion('Proceso', [encabezadoSeccion(s.titulo, s.intro, 'proceso'), rejilla(s.items, { columnasMax: 4, numerar: true })].join('\n'), { densidad: ctx.densidad });
}

export function sobre(s, ctx) {
  if (!s?.texto) return '';
  const txt = grupo([heading(s.titulo, { ancla: 'nosotros' }), ...String(s.texto).split(/\n{2,}/).map((p) => parrafo(p))].join('\n'), { gap: 'medium' });
  const interior = ctx.medios.sobre
    ? columnas([{ html: imagen('sobre', ctx.medios.sobre.alt, { ratio: '1/1' }), ancho: '42%' }, { html: txt, ancho: '58%' }])
    : grupo(txt, { ancho: false });
  return seccion('Nosotros', interior, { densidad: ctx.densidad });
}

/** Solo datos reales del brief: cifras, certificaciones, testimonios. Si no hay, no hay sección. */
export function confianza(s, ctx) {
  const partes = [];
  if (s?.cifras?.length) {
    const a = { align: 'wide', layout: { type: 'grid', columnCount: Math.min(4, s.cifras.length), minimumColumnWidth: null } };
    const celdas = s.cifras.map((c) => grupo([parrafo(c.valor, { tam: 'xx-large', color: 'primary' }), parrafo(c.etiqueta, { color: 'main-accent' })].join('\n'), { gap: 'small' })).join('\n');
    partes.push(`<!-- wp:group${attrs(a)} -->\n<div class="wp-block-group alignwide">\n${celdas}\n</div>\n<!-- /wp:group -->`);
  }
  if (s?.testimonios?.length) {
    partes.push(rejilla(s.testimonios.map((t) => ({ titulo: t.autor, texto: `“${t.texto}”` })), { columnasMax: 3 }));
  }
  if (s?.certificaciones?.length) partes.push(parrafo(s.certificaciones.join(' · '), { color: 'main-accent' }));
  if (!partes.length) return '';
  return seccion('Confianza', [encabezadoSeccion(s.titulo, s.intro, 'confianza'), ...partes].join('\n'), { densidad: ctx.densidad });
}

export function faq(lista, ctx, titulo = 'Preguntas frecuentes') {
  if (!lista?.length) return '';
  const items = lista.map((f) => `<!-- wp:details {"style":{"border":{"bottom":{"color":"var:preset|color|border-light","width":"1px"}},"spacing":{"padding":{"top":"${sp('small')}","bottom":"${sp('small')}"}}}} -->\n<details class="wp-block-details" style="border-bottom-color:var(--wp--preset--color--border-light);border-bottom-width:1px;padding-top:${spCss('small')};padding-bottom:${spCss('small')}"><summary>${esc(f.pregunta)}</summary>${parrafo(f.respuesta, { color: 'main-accent' })}</details>\n<!-- /wp:details -->`).join('\n');
  return seccion('Preguntas', [heading(titulo, { ancla: 'preguntas' }), grupo(items, { gap: 'small' })].join('\n'), { densidad: ctx.densidad, fondo: 'tertiary' });
}

export function ctaFinal(s, ctx) {
  const interior = grupo([
    heading(s.titulo, { tam: 'x-large' }),
    parrafo(s.texto, { tam: 'medium' }),
    botones([{ texto: s.boton, url: ctx.wa || ctx.tel }]),
  ].filter(Boolean).join('\n'), { gap: 'medium' });
  return seccion('Llamado final', interior, { densidad: ctx.densidad, fondo: 'main', texto: 'base' });
}

export function contacto(s, ctx) {
  const c = ctx.contacto || {};
  const dir = c.direccion && typeof c.direccion === 'object' ? [c.direccion.calle, c.direccion.colonia, c.direccion.ciudad, c.direccion.estado, c.direccion.cp].filter(Boolean).join(', ') : c.direccion;
  const datos = [];
  if (ctx.wa) datos.push({ titulo: 'WhatsApp', html: `<a href="${esc(ctx.wa)}">${esc(c.whatsapp)}</a>` });
  if (c.telefono) datos.push({ titulo: 'Teléfono', html: `<a href="tel:${esc(String(c.telefono).replace(/[^\d+]/g, ''))}">${esc(c.telefono)}</a>` });
  if (c.email) datos.push({ titulo: 'Correo', html: `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` });
  if (dir) datos.push({ titulo: 'Dirección', html: c.google_maps_url ? `<a href="${esc(c.google_maps_url)}">${esc(dir)}</a>` : esc(dir) });
  if (c.horarios) datos.push({ titulo: 'Horario', html: esc(typeof c.horarios === 'string' ? c.horarios : JSON.stringify(c.horarios)) });
  if (!datos.length) return '';
  const celdas = datos.map((d) => grupo(`${heading(d.titulo, { nivel: 3, tam: 'small' })}\n<!-- wp:paragraph -->\n<p>${d.html}</p>\n<!-- /wp:paragraph -->`, { gap: 'small' })).join('\n');
  const a = { align: 'wide', layout: { type: 'grid', columnCount: Math.min(3, datos.length), minimumColumnWidth: null }, style: { spacing: { blockGap: { top: sp('large'), left: sp('large') } } } };
  return seccion('Contacto', [heading(s?.titulo || 'Contacto', { ancla: 'contacto' }), `<!-- wp:group${attrs(a)} -->\n<div class="wp-block-group alignwide">\n${celdas}\n</div>\n<!-- /wp:group -->`].join('\n'), { densidad: ctx.densidad });
}

/** Página de inicio completa. El orden respeta la estructura del subtipo si viene, con hero siempre primero. */
export function paginaInicio(cont, ctx) {
  const porTipo = {
    servicios: () => servicios(cont.servicios, ctx),
    proceso: () => proceso(cont.proceso, ctx),
    sobre: () => sobre(cont.sobre, ctx),
    confianza: () => confianza(cont.confianza, ctx),
    faq: () => faq(cont.faq, ctx),
    cta: () => ctaFinal(cont.cta_final, ctx),
    contacto: () => contacto(cont.contacto, ctx),
  };
  const orden = (ctx.orden || ['servicios', 'proceso', 'sobre', 'confianza', 'faq', 'cta', 'contacto']).filter((k) => porTipo[k]);
  for (const k of Object.keys(porTipo)) if (!orden.includes(k)) orden.push(k);
  return [hero(cont.hero, ctx), ...orden.map((k) => porTipo[k]())].filter(Boolean).join('\n\n');
}

export function paginaTexto(titulo, parrafos) {
  return seccion('Texto', grupo([heading(titulo, { nivel: 1, tam: 'x-large' }), ...parrafos.map((p) => parrafo(p))].join('\n'), { gap: 'medium' }), { densidad: 'media' });
}
