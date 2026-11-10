// Sitio WordPress fiel a la propuesta que eligió el cliente (servicios, clínica, inmobiliaria, oficios, educación, turismo,
// tienda, genérico). Misma composición (layout A–F), mismo orden de secciones, misma paleta, mismas fuentes, mismos textos y
// las mismas fotos que en propuestas_general.js, pero como bloques nativos de Gutenberg (editables en wp-admin) + el CSS de la
// propuesta inyectado en los estilos globales del sitio. Nada se "reinterpreta": si la propuesta lo tenía, el sitio lo tiene.
import { TITULOS, NOMBRES_GENERAL, agruparOferta, redes } from './propuestas_general.js';
import { cssTipografia } from './tipo_color.js';
import { urlFuentes } from './fuentes.js';
import { waUrl, formatoTel } from './bloques.js';
import { contraste } from '../entrevista/tema.js';
import { logoTenido } from './materiales.js';
import { DIR_PROPUESTAS } from './propuestas_html.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { enlacesRedes, CSS_REDES } from './iconos_redes.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON de atributos dentro de un comentario HTML: no puede contener "--".
const attrs = (o) => (o && Object.keys(o).length ? ' ' + JSON.stringify(o).replace(/--/g, '\\u002d\\u002d') : '');
const lum = (h) => { const n = parseInt(String(h).slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const sobre = (bg, a = '#FFFFFF', b = '#16120F') => (contraste(a, bg) >= contraste(b, bg) ? a : b);
const limpio = (s) => String(s ?? '').replace(/\p{Extended_Pictographic}/gu, '').trim();

/* ---------------- Bloques (marcado idéntico al que serializa Gutenberg) ---------------- */
const B = {
  grupo(interior, { clase = '', tag = null, ancla = null, full = false } = {}) {
    const a = { ...(tag ? { tagName: tag } : {}), ...(full ? { align: 'full' } : {}), ...(ancla ? { anchor: ancla } : {}), ...(clase ? { className: clase } : {}), layout: { type: 'default' } };
    const t = tag || 'div';
    const cls = ['wp-block-group', full ? 'alignfull' : '', clase].filter(Boolean).join(' ');
    return `<!-- wp:group${attrs(a)} -->\n<${t} class="${cls}"${ancla ? ` id="${esc(ancla)}"` : ''}>${interior}</${t}>\n<!-- /wp:group -->`;
  },
  titulo(texto, { nivel = 2, clase = '' } = {}) {
    if (!texto) return '';
    const a = { ...(nivel !== 2 ? { level: nivel } : {}), ...(clase ? { className: clase } : {}) };
    return `<!-- wp:heading${attrs(a)} -->\n<h${nivel} class="wp-block-heading${clase ? ` ${clase}` : ''}">${esc(texto)}</h${nivel}>\n<!-- /wp:heading -->`;
  },
  // html: contenido enriquecido ya escapado (strong, a, br).
  p(html, clase = '') {
    if (!html) return '';
    return `<!-- wp:paragraph${attrs(clase ? { className: clase } : null)} -->\n<p${clase ? ` class="${clase}"` : ''}>${html}</p>\n<!-- /wp:paragraph -->`;
  },
  botones(lista, clase = '') {
    const bs = lista.filter((x) => x?.texto && x?.url).map((x) => {
      const nueva = /^https?:/i.test(x.url);
      const ca = x.clase ? { className: x.clase } : null;
      return `<!-- wp:button${attrs(ca)} -->\n<div class="wp-block-button${x.clase ? ` ${x.clase}` : ''}"><a class="wp-block-button__link wp-element-button" href="${esc(x.url)}"${nueva ? ' target="_blank" rel="noreferrer noopener"' : ''}>${esc(x.texto)}</a></div>\n<!-- /wp:button -->`;
    }).join('\n');
    if (!bs) return '';
    return `<!-- wp:buttons${attrs(clase ? { className: clase } : null)} -->\n<div class="wp-block-buttons${clase ? ` ${clase}` : ''}">${bs}</div>\n<!-- /wp:buttons -->`;
  },
  imagen(k, alt, clase = '', tam = 'grande') {
    const a = { id: '__ID__', sizeSlug: 'large', linkDestination: 'none', ...(clase ? { className: clase } : {}) };
    const json = attrs(a).replace('"__ID__"', `{{media:${k}:id}}`);
    const src = tam === 'full' ? `{{media:${k}}}` : `{{media:${k}:grande}}`;
    return `<!-- wp:image${json} -->\n<figure class="wp-block-image size-large${clase ? ` ${clase}` : ''}"><img src="${src}" alt="${esc(alt)}" class="wp-image-{{media:${k}:id}}"/></figure>\n<!-- /wp:image -->`;
  },
  portada(k, alt, interior, clase) {
    const a = { url: `__URL__`, id: '__ID__', alt: alt || '', dimRatio: 0, minHeight: 88, minHeightUnit: 'vh', contentPosition: 'bottom left', tagName: 'section', align: 'full', className: clase, layout: { type: 'default' } };
    const json = attrs(a).replace('"__URL__"', `"{{media:${k}}}"`).replace('"__ID__"', `{{media:${k}:id}}`);
    return `<!-- wp:cover${json} -->\n<section class="wp-block-cover alignfull has-custom-content-position is-position-bottom-left ${clase}" style="min-height:88vh"><img class="wp-block-cover__image-background wp-image-{{media:${k}:id}}" alt="${esc(alt)}" src="{{media:${k}}}" data-object-fit="cover"/><span aria-hidden="true" class="wp-block-cover__background has-background-dim-0 has-background-dim"></span><div class="wp-block-cover__inner-container">${interior}</div></section>\n<!-- /wp:cover -->`;
  },
  logo(clase = '', ancho = 220) {
    return `<!-- wp:site-logo ${JSON.stringify({ width: ancho, shouldSyncIcon: false, ...(clase ? { className: clase } : {}) })} /-->`;
  },
  lista(items, { ordenada = false, clase = '' } = {}) {
    if (!items.length) return '';
    const t = ordenada ? 'ol' : 'ul';
    const a = { ...(ordenada ? { ordered: true } : {}), ...(clase ? { className: clase } : {}) };
    return `<!-- wp:list${attrs(a)} -->\n<${t} class="wp-block-list${clase ? ` ${clase}` : ''}">${items.map((x) => `<!-- wp:list-item -->\n<li>${esc(x)}</li>\n<!-- /wp:list-item -->`).join('')}</${t}>\n<!-- /wp:list -->`;
  },
  cita(texto, autor) {
    return `<!-- wp:quote -->\n<blockquote class="wp-block-quote"><!-- wp:paragraph -->\n<p>${esc(texto)}</p>\n<!-- /wp:paragraph -->${autor ? `<cite>${esc(autor)}</cite>` : ''}</blockquote>\n<!-- /wp:quote -->`;
  },
  pregunta(q, r, abierta) {
    return `<!-- wp:details${abierta ? ' {"showContent":true}' : ''} -->\n<details class="wp-block-details"${abierta ? ' open' : ''}><summary>${esc(q)}</summary><!-- wp:paragraph -->\n<p>${esc(r)}</p>\n<!-- /wp:paragraph --></details>\n<!-- /wp:details -->`;
  },
  video(url) {
    return `<!-- wp:video {"className":"video"} -->\n<figure class="wp-block-video video"><video controls src="${esc(url)}" playsinline></video></figure>\n<!-- /wp:video -->`;
  },
};

/* ---------------- CSS de la propuesta adaptado al marcado de WordPress ---------------- */
// Las variables apuntan a la paleta del tema: si el dueño cambia un color en el editor, cambia en todo el sitio.
function cssPropuesta() {
  return `
:root{--bg:var(--wp--preset--color--base);--fg:var(--wp--preset--color--main);--p:var(--wp--preset--color--primary);--on:var(--wp--preset--color--on-primary);--mut:var(--wp--preset--color--secondary);--card:var(--wp--preset--color--tertiary);--soft:var(--wp--preset--color--main-accent);--bor:var(--wp--preset--color--border-light);--tin:var(--wp--preset--color--tinte);--banda:var(--wp--preset--color--banda);--ft:var(--wp--preset--font-family--titulos);--fc:var(--wp--preset--font-family--cuerpo)}
html{scroll-behavior:smooth}
:root body{background:var(--bg);color:var(--fg);font-family:var(--fc);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;margin:0}
:root .wp-site-blocks{padding:0}:root .wp-site-blocks>*{margin-block-start:0;margin-block-end:0}
:root .site-content{margin:0}
.iap,.iap *,.barra,.barra *,.pie,.pie *{box-sizing:border-box}
.iap *,.barra *,.pie *{margin-block-start:0;margin-block-end:0}
.iap img{max-width:100%;height:auto;display:block}.iap a,.barra a,.pie a{color:inherit}
.iap h1,.iap h2,.iap h3,.iap summary{font-family:var(--ft);font-weight:400;line-height:1.06;letter-spacing:-.015em;text-wrap:balance;color:inherit}
.iap h1{font-size:clamp(36px,9vw,72px)}.iap h2{font-size:clamp(28px,6.5vw,44px);margin-bottom:22px}.iap h3{font-size:22px}
.iap .wrap,.barra .wrap{max-width:1140px;margin-left:auto;margin-right:auto;padding:0 20px;width:100%}.iap .estrecho{max-width:760px}.iap .centro{display:flex;justify-content:center}
.barra{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--bor)}
.admin-bar .barra{top:32px}
.barra .in{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.barra .wp-block-site-logo img{height:46px!important;width:auto!important;max-width:220px;object-fit:contain}
.wp-block-site-logo.con-placa a{display:inline-flex;padding:6px 12px;border-radius:12px;background:var(--placa,#1C1714)}
.barra .wp-block-navigation{font-size:15px;font-weight:600;gap:22px}.barra .wp-block-navigation a{text-decoration:none}
.barra .wp-block-navigation__responsive-container.is-menu-open{background:var(--bg);color:var(--fg)}
.iap .kicker{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:var(--soft);margin-bottom:14px}
.iap .sub{color:var(--soft);font-size:clamp(17px,4.4vw,20px);margin-top:16px;max-width:38ch}
.iap .wp-block-buttons{margin-top:24px}
.iap .wp-block-button .wp-block-button__link{display:inline-flex;align-items:center;justify-content:center;background:var(--p);color:var(--on);font-family:var(--fc);font-size:16px;font-weight:700;text-decoration:none;padding:15px 26px;border-radius:999px;min-height:50px;border:0}
.iap .wp-block-button.inv .wp-block-button__link{background:#fff;color:var(--banda)}
.iap .info{list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:22px;padding:0;font-size:14px;color:var(--soft)}.iap .info li::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--p);margin-right:8px;vertical-align:2px}
.iap .sec{padding:64px 0 8px}.iap [id]{scroll-margin-top:80px}
/* héroes */
.iap .h-portada{position:relative;min-height:88vh;display:flex;align-items:flex-end;justify-content:flex-start;color:#fff;overflow:hidden;padding:0}
.iap .h-portada .wp-block-cover__image-background{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.iap .h-portada .wp-block-cover__background{background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.62))!important;opacity:1!important}
.iap .h-portada .wp-block-cover__inner-container{position:relative;z-index:1;width:100%;max-width:1140px;margin:0 auto;padding:0 20px 56px;color:#fff}
.iap .h-portada .sub,.iap .h-portada .kicker{color:rgba(255,255,255,.88)}
.iap .h-edit{display:grid;gap:28px;padding-top:36px}.iap .arco{border-radius:999px 999px 24px 24px;overflow:hidden;aspect-ratio:4/5;max-height:620px}.iap .arco img{width:100%;height:100%;object-fit:cover}
.iap .h-mos{padding-top:40px}.iap .mos{display:grid;gap:8px;margin-top:34px;grid-template-columns:repeat(2,1fr)}.iap .mos figure{margin:0}.iap .mos img{width:100%;height:100%;object-fit:cover;border-radius:14px;aspect-ratio:1}.iap .mos figure:first-child{grid-column:span 2}.iap .mos figure:first-child img{aspect-ratio:16/10}
.iap .h-logo{text-align:center;padding-top:40px;padding-bottom:10px}.iap .h-logo .sub{margin:16px auto 0}.iap .h-logo .wp-block-buttons{justify-content:center}
.iap .h-logo .logo-grande{display:flex;justify-content:center;margin:0 auto 26px}.iap .h-logo .logo-grande img{width:min(84vw,460px)!important;height:auto!important;max-height:none}
.iap .ovalo{width:min(78%,380px);margin:38px auto 0;border-radius:50%;overflow:hidden;aspect-ratio:3/4;border:8px solid var(--mut)}.iap .ovalo img{width:100%;height:100%;object-fit:cover}
.iap .h-dos{background:var(--banda);color:#fff;padding:42px 0 0;border-radius:0 0 36px 36px}.iap .h-dos .in{display:grid;gap:26px}.iap .h-dos .txt{padding-bottom:clamp(40px,5vw,72px)}.iap .h-dos .sub{color:rgba(255,255,255,.86)}
.iap .marco{border-radius:24px 24px 0 0;overflow:hidden;aspect-ratio:4/5;max-height:560px;border:10px solid rgba(255,255,255,.14);border-bottom:0}.iap .marco img{width:100%;height:100%;object-fit:cover}
.iap .h-carta{padding-top:clamp(56px,8vw,112px);padding-bottom:clamp(28px,4vw,48px)}.iap .h-carta h1{max-width:16ch}.iap .h-carta .sub{max-width:46ch}
.iap .tira{display:flex;flex-wrap:wrap;gap:10px;max-width:1140px;margin:12px auto 0;padding:0 20px}.iap .tira figure{flex:1 1 200px;margin:0;min-width:0}.iap .tira img{width:100%;height:auto;border-radius:8px}
/* galerías */
.iap .galeria{columns:2 160px;column-gap:10px}.iap .galeria figure{break-inside:avoid;margin:0 0 10px;display:block}.iap .galeria img{width:100%;height:auto;border-radius:12px}
.iap .g-editorial{columns:2 150px}.iap .g-carta img,.iap .g-dostonos img{border-radius:4px}.iap .g-logo img{border-radius:999px 999px 14px 14px}
.iap .g-eq{margin-top:20px}
/* paquetes */
.iap .paqs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.iap .paq{background:var(--card);border:1px solid var(--bor);border-radius:20px;padding:22px}.iap .paq h3{margin-bottom:10px}
.iap .opc{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:11px 0;border-top:1px dashed var(--bor)}.iap .paq h3+.opc{border-top:0}
.iap .opc .op-n{font-weight:700;font-size:15px;max-width:none}.iap .opc .op-d{color:var(--soft);font-size:14px;max-width:none}.iap .opc .op-p{font-weight:800;color:var(--p);white-space:nowrap;font-variant-numeric:tabular-nums lining-nums}
.iap.l-carta .paq{background:none;border:0;border-top:2px solid var(--fg);border-radius:0;padding:18px 0}.iap.l-dostonos .paq{border-top:6px solid var(--p)}
.iap .cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:18px}.iap .cats img{width:100%;height:auto;border-radius:14px;border:1px solid var(--bor)}
.iap .doc{margin-top:18px;font-weight:700}.iap .doc a{text-underline-offset:5px}
/* sobre */
.iap .sobre{background:var(--mut);padding-bottom:64px;margin-top:64px}.iap .s-in{display:grid;gap:28px;align-items:center}.iap .retrato{border-radius:24px;overflow:hidden;max-width:440px;margin:0}.iap .retrato img{width:100%;height:auto}
.iap .firma{font-weight:700;margin-bottom:10px}.iap .historia{font-size:18px;max-width:58ch}.iap .cred{margin-top:12px;color:var(--soft);font-size:15px}
.iap .cifras{list-style:none;display:flex;flex-wrap:wrap;gap:12px;margin-top:22px;padding:0}.iap .cifras li{font-family:var(--ft);font-size:22px;padding:10px 16px;border:1px solid var(--bor);border-radius:999px;background:var(--bg)}
/* reseñas */
.iap .quotes{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}.iap .wp-block-quote{background:var(--card);border:1px solid var(--bor)!important;border-radius:20px;padding:22px;margin:0}
.iap .wp-block-quote p{font-family:var(--ft);font-size:20px;line-height:1.3;max-width:none}.iap .wp-block-quote cite{display:block;margin-top:12px;font-style:normal;font-weight:700;font-size:14px;color:var(--soft)}
.iap .capturas{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:18px;align-items:start}.iap .capturas figure{margin:0}.iap .capturas img{width:100%;height:auto;border-radius:14px;border:1px solid var(--bor)}
.iap .pasos{counter-reset:p;list-style:none;display:grid;gap:12px;padding:0}.iap .pasos li{counter-increment:p;padding-left:52px;position:relative;min-height:40px}.iap .pasos li::before{content:counter(p);position:absolute;left:0;top:-4px;width:38px;height:38px;border-radius:50%;background:var(--p);color:var(--on);display:grid;place-items:center;font-weight:800}
.iap .wp-block-details{border-bottom:1px solid var(--bor);padding:16px 0}.iap .wp-block-details summary{font-size:21px;cursor:pointer;list-style:none}.iap .wp-block-details summary::-webkit-details-marker{display:none}.iap .wp-block-details p{margin-top:10px;color:var(--soft)}
.iap .video{margin:0}.iap .video video{width:100%;border-radius:18px}
.iap .datos{display:grid;gap:14px}.iap .datos p{display:flex;flex-direction:column;max-width:none}.iap .datos strong{font-family:var(--ft);font-weight:400;font-size:20px}${CSS_REDES}
.pie{margin-top:64px;padding:26px 20px 92px;border-top:1px solid var(--bor);font-size:14px;color:var(--soft);text-align:center}.pie p{max-width:none}
.iap a:focus-visible,.iap summary:focus-visible,.barra a:focus-visible{outline:3px solid var(--p);outline-offset:3px}
@media (min-width:900px){.iap .h-portada .wp-block-cover__background{background:linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,.15) 70%)!important}.iap .h-edit{grid-template-columns:1.1fr .9fr;align-items:center;padding-top:64px}.iap .h-dos .in{grid-template-columns:1.1fr .9fr;align-items:end}.iap .mos{grid-template-columns:repeat(4,1fr)}.iap .mos figure:first-child{grid-column:span 2;grid-row:span 2}.iap .mos figure:first-child img{aspect-ratio:auto}
.iap .s-in{grid-template-columns:.8fr 1.2fr}.iap .galeria{columns:3 220px}.iap .g-editorial{columns:4 220px}.iap .datos{grid-template-columns:repeat(3,1fr)}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;
}

// La regla de tipografía usa selectores de elemento; en WordPress los estilos del tema llevan :root, así que se refuerzan.
function reforzar(css) {
  return css.split('\n').map((l) => {
    const m = l.match(/^([^{/@][^{]*)\{(.*)$/);
    if (!m) return l;
    return `${m[1].split(',').map((s) => `:root ${s.trim()}`).join(',')}{${m[2]}`;
  }).join('\n');
}

/* ---------------- Logo con el mismo contraste que en la propuesta ---------------- */
async function logoParaFondo(logo, bg, fg) {
  if (!logo?.url) return null;
  const claroLogo = logo.tono === 'claro', fondoClaro = lum(bg) > 0.4;
  const choca = claroLogo === fondoClaro;
  if (choca && logo.mono !== false) {
    const t = await logoTenido(logo, fg).catch(() => null);
    if (t) return { url: t, placa: null };
    return { url: logo.url, placa: fondoClaro ? '#1C1714' : '#FFFFFF' };
  }
  if (choca) return { url: logo.url, placa: fondoClaro ? '#1C1714' : '#FFFFFF' };
  return { url: logo.url, placa: null };
}

/**
 * Construye el sitio de la propuesta elegida.
 * @returns {Promise<{contenido, header, footer, menu, medios, estilos, fuentesUrl, logoClave, resumen}>}
 */
export async function sitioDePropuesta({ brief, mat, prop, elegida, deColores = null }) {
  const indice = Math.max(0, 'ABCDEF'.indexOf(elegida.letra || elegida.etiqueta));
  const layout = elegida.layout;
  if (!NOMBRES_GENERAL[layout]) throw new Error(`layout de propuesta desconocido: ${layout}`);
  const ronda = prop.ronda || 0;
  const pal = { ...(elegida.paleta || {}), ...((deColores?.paleta) || {}) };
  const f = elegida.tipografia || {};
  const textos = prop.textos || {};
  const v = textos.variantes?.[indice] || textos.variantes?.[0] || {};
  const t = { titular: v.titular, subtitulo: v.subtitulo, cta: v.cta || 'Escríbeme por WhatsApp', info: (textos.info || []).slice(0, 3), sobre: textos.sobre, proceso: textos.proceso };
  const arq = TITULOS[brief.negocio?.arquetipo] ? brief.negocio.arquetipo : 'generico';
  const T = { ...TITULOS[arq], ...(textos.secciones || {}) };
  const c = brief.contacto || {};
  const wa = waUrl(c.whatsapp, c.mensaje_whatsapp_inicial) || '#contacto';
  const tel = c.whatsapp ? formatoTel(c.whatsapp) : null;
  const nombre = brief.negocio?.nombre || '';
  const neg = brief.negocio || {}, conf = brief.confianza || {}, fund = conf.fundador || {};

  // Medios: cada URL una clave; la misma foto nunca se sube ni se usa dos veces.
  const medios = [], claves = new Map(), usadas = new Set();
  const clave = (x) => { if (!claves.has(x.url)) { const k = `p${claves.size + 1}`; claves.set(x.url, k); medios.push({ clave: k, url: x.url, alt: x.alt || '' }); } return claves.get(x.url); };
  const img = (x, clase = '', tam = 'grande') => { usadas.add(x.url); return B.imagen(clave(x), x.alt || '', clase, tam); };

  // Mismo orden de fotos que la propuesta (propuestas_general.js → pagina()).
  const i = indice + ronda * 3;
  const buenaFoto = (x) => !x.captura && x.calidad !== 'regular';
  const trabajos = [...mat.trabajos, ...mat.local].filter(buenaFoto);
  const capturasT = [...mat.trabajos, ...mat.local].filter((x) => !buenaFoto(x));
  const rot = (arr, k) => (arr.length ? [...arr.slice(k % arr.length), ...arr.slice(0, k % arr.length)] : []);
  const fotosT = [...rot(trabajos, i * 2), ...capturasT];
  const heroFoto = (layout === 'portada' || layout === 'logo') ? (mat.hero || fotosT[0]) : (fotosT[0] || mat.hero || mat.fundador);

  const cta = (clase = '') => B.botones([{ texto: t.cta, url: wa, clase: clase || '' }]);
  const info = B.lista(t.info, { clase: 'info' });

  /* --- Héroes --- */
  const heros = {
    portada: () => {
      const txt = B.p(esc(neg.ciudad ? `${neg.giro_texto || ''} · ${neg.ciudad}` : neg.giro_texto || ''), 'kicker') + B.titulo(t.titular, { nivel: 1 }) + B.p(esc(t.subtitulo), 'sub') + cta();
      if (!heroFoto) return B.grupo(B.grupo(txt, { clase: 'wrap in' }), { tag: 'section', full: true, clase: 'hero h-carta' });
      usadas.add(heroFoto.url);
      return B.portada(clave(heroFoto), heroFoto.alt || '', txt, 'hero h-portada');
    },
    editorial: () => B.grupo(B.grupo(B.p(esc(neg.giro_texto || ''), 'kicker') + B.titulo(t.titular, { nivel: 1 }) + B.p(esc(t.subtitulo), 'sub') + cta() + info, { clase: 'txt' }) + (heroFoto ? img(heroFoto, 'arco', 'full') : ''), { tag: 'section', clase: 'hero h-edit wrap' }),
    mosaico: () => { const m = fotosT.slice(0, 5); return B.grupo(B.titulo(t.titular, { nivel: 1 }) + B.p(esc(t.subtitulo), 'sub') + cta() + B.grupo(m.map((x) => img(x)).join(''), { clase: `mos m${m.length}` }), { tag: 'section', clase: 'hero h-mos wrap' }); },
    logo: () => B.grupo((mat.logo ? B.logo('logo-grande', 460) : B.p(esc(nombre), 'nombre-grande')) + B.titulo(t.titular, { nivel: 1 }) + B.p(esc(t.subtitulo), 'sub') + cta() + (heroFoto ? img(heroFoto, 'ovalo', 'full') : ''), { tag: 'section', clase: 'hero h-logo wrap' }),
    dostonos: () => B.grupo(B.grupo(B.grupo(B.titulo(t.titular, { nivel: 1 }) + B.p(esc(t.subtitulo), 'sub') + cta('inv'), { clase: 'txt' }) + (heroFoto ? img(heroFoto, 'marco', 'full') : ''), { clase: 'wrap in' }), { tag: 'section', full: true, clase: 'hero h-dos' }),
    carta: () => B.grupo(B.p(esc(nombre), 'kicker') + B.titulo(t.titular, { nivel: 1 }) + B.p(esc(t.subtitulo), 'sub') + cta(), { tag: 'section', clase: 'hero h-carta wrap' }) + (fotosT.length ? B.grupo(fotosT.slice(0, 8).map((x) => img(x)).join(''), { clase: 'tira' }) : ''),
  };
  const hero = heros[layout]();

  /* --- Secciones (mismo contenido y orden que la propuesta) --- */
  const sec = (ancla, interior, clase = 'sec', estrecho = false) => B.grupo(B.grupo(interior, { clase: estrecho ? 'wrap estrecho' : 'wrap' }), { tag: 'section', ancla, clase });
  const secTrabajo = () => {
    const resto = fotosT.filter((x) => !usadas.has(x.url));
    return resto.length ? sec('trabajo', B.titulo(T.trabajo) + B.grupo(resto.map((x) => img(x)).join(''), { clase: `galeria g-${layout}` })) : '';
  };
  const grupos = agruparOferta(brief.oferta?.items || []);
  const mostrarPrecios = brief.oferta?.mostrar_precios !== false || brief.oferta?.mostrar_paquetes;
  const secServicios = () => {
    if (!grupos.length && !mat.catalogos.length && !mat.documentos.length) return '';
    const cards = grupos.map((g) => B.grupo(B.titulo(g.nombre, { nivel: 3 }) + g.opciones.map((o) => B.grupo(
      B.grupo((o.nombre ? B.p(esc(o.nombre), 'op-n') : '') + (o.detalle ? B.p(esc(o.detalle), 'op-d') : ''), { clase: 'op-txt' }) + (mostrarPrecios && o.precio ? B.p(esc(o.precio), 'op-p') : ''),
      { clase: 'opc' })).join(''), { clase: 'paq' })).join('');
    const cat = mat.catalogos.map((x) => img(x)).join('');
    const docs = mat.documentos.map((x) => { usadas.add(x.url); return B.p(`<a href="${esc(x.url)}" target="_blank" rel="noreferrer noopener">Ver ${esc(/pdf/i.test(x.url) ? 'catálogo (PDF)' : x.alt || 'documento')}</a>`, 'doc'); }).join('');
    return sec('servicios', B.titulo(T.servicios) + (cards ? B.grupo(cards, { clase: 'paqs' }) : '') + (cat ? B.grupo(cat, { clase: 'cats' }) : '') + docs + B.botones([{ texto: t.cta, url: wa }], 'centro'));
  };
  const secSobre = () => {
    const otra = mat.equipo.find((x) => x.tipo === 'foto_fundador' && !usadas.has(x.url));
    const foto = mat.fundador && usadas.has(mat.fundador.url) ? (otra || null) : (mat.fundador || otra || null);
    if (!foto && !conf.historia_corta) return '';
    const cred = (fund.credenciales || []).map((x) => esc(x)).join(' · ');
    const der = B.titulo(T.sobre) + (fund.nombre ? B.p(`${esc(fund.nombre)}${fund.rol ? ` · ${esc(fund.rol)}` : ''}`, 'firma') : '') + B.p(esc(t.sobre || conf.historia_corta || ''), 'historia') + (cred ? B.p(cred, 'cred') : '') + B.lista((conf.cifras || []).slice(0, 3).map(String), { clase: 'cifras' });
    return B.grupo(B.grupo((foto ? img(foto, 'retrato') : '') + B.grupo(der), { clase: 'wrap s-in' }), { tag: 'section', ancla: 'sobre', clase: 'sec sobre' });
  };
  const secEquipo = () => { const eq = mat.equipo.filter((x) => !usadas.has(x.url)); return eq.length ? B.grupo(B.grupo(eq.map((x) => img(x)).join(''), { clase: 'galeria g-eq' }), { clase: 'wrap' }) : ''; };
  const secResenas = () => {
    const tes = (conf.testimonios || []).filter((x) => x.texto);
    if (!tes.length && !mat.resenas.length) return '';
    const cards = tes.map((x) => B.cita(limpio(x.texto), x.nombre)).join('');
    const caps = mat.resenas.map((x) => img(x)).join('');
    return sec('resenas', B.titulo(T.resenas) + (cards ? B.grupo(cards, { clase: 'quotes' }) : '') + (caps ? B.grupo(caps, { clase: 'capturas' }) : ''), 'sec resenas');
  };
  const secProceso = () => { const ps = brief.oferta?.proceso_pasos || []; return ps.length >= 3 ? sec(null, B.titulo(t.proceso || 'Cómo funciona') + B.lista(ps.map(String), { ordenada: true, clase: 'pasos' })) : ''; };
  const secFaq = () => { const fq = (brief.faq || []).filter((x) => x.pregunta && x.respuesta); return fq.length ? sec('faq', B.titulo(T.faq) + fq.map((x, k) => B.pregunta(x.pregunta, x.respuesta, k === 0)).join(''), 'sec', true) : ''; };
  const secVideo = () => (mat.videos.length ? sec(null, mat.videos.map((x) => { usadas.add(x.url); return B.video(x.url); }).join('')) : '');
  const secContacto = () => {
    const dir = c.direccion && typeof c.direccion === 'object' ? [c.direccion.calle, c.direccion.colonia, c.direccion.ciudad].filter(Boolean).join(', ') : c.direccion;
    const zona = (brief.zona?.cobertura || []).join(' · ');
    const rs = enlacesRedes(redes(c), 'noreferrer noopener');
    const datos = [
      tel ? B.p(`<strong>WhatsApp</strong><a href="${esc(wa)}"${/^https?:/.test(wa) ? ' target="_blank" rel="noreferrer noopener"' : ''}>${esc(tel)}</a>`) : '',
      dir ? B.p(`<strong>Dónde</strong>${esc(dir)}`) : zona ? B.p(`<strong>Dónde</strong>${esc(zona)}`) : '',
      typeof c.horarios === 'string' ? B.p(`<strong>Horario</strong>${esc(c.horarios)}`) : '',
      rs ? B.p(`<strong>Redes</strong><span class="rs">${rs}</span>`) : '',
    ].join('');
    return sec('contacto', B.titulo(T.contacto) + B.grupo(datos, { clase: 'datos' }) + cta(), 'sec contacto');
  };

  const ORDEN = {
    portada: [secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto],
    editorial: [secSobre, secTrabajo, secEquipo, secServicios, secResenas, secFaq, secVideo, secContacto],
    mosaico: [secServicios, secTrabajo, secResenas, secSobre, secEquipo, secProceso, secFaq, secVideo, secContacto],
    logo: [secTrabajo, secSobre, secEquipo, secServicios, secResenas, secFaq, secVideo, secContacto],
    dostonos: [secServicios, secTrabajo, secSobre, secEquipo, secResenas, secFaq, secVideo, secContacto],
    carta: [secServicios, secSobre, secEquipo, secResenas, secTrabajo, secFaq, secVideo, secContacto],
  }[layout];
  const cuerpo = ORDEN.map((fn) => fn()).join('\n');
  // Galería final: todo lo que el cliente mandó y aún no aparece (regla dura).
  const pendientes = [...mat.trabajos, ...mat.local, ...mat.equipo, mat.fundador, ...mat.resenas, ...mat.catalogos, ...mat.otras, ...mat.menus, ...mat.fotos.filter((x) => !x.recorte)]
    .filter((x) => x && !usadas.has(x.url)).filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k);
  const galeria = pendientes.length ? sec('galeria', B.titulo(T.galeria) + B.grupo(pendientes.map((x) => img(x)).join(''), { clase: 'galeria g-mas' })) : '';

  const contenido = B.grupo(`${hero}\n${cuerpo}\n${galeria}`, { full: true, clase: `iap l-${layout}` });

  // Menú: mismas secciones que la barra de la propuesta (con "/" para que funcione desde el aviso de privacidad).
  const menu = [['trabajo', T.trabajo], ['servicios', T.servicios], ['sobre', T.sobre], ['contacto', T.contacto]].filter(([id]) => cuerpo.includes(`id="${id}"`)).map(([id, n]) => ({ texto: n, url: `/#${id}` }));

  // Logo con el mismo contraste que vio el cliente.
  const lg = await logoParaFondo(mat.logo, pal.bg, pal.fg);
  if (lg) medios.push({ clave: 'logo', url: lg.url, alt: nombre || 'Logo' });
  const logoBarra = lg ? B.logo(lg.placa ? 'con-placa' : '', 220) : `<!-- wp:site-title {"level":0} /-->`;
  const header = B.grupo(B.grupo(`${logoBarra}\n<!-- wp:navigation {"overlayMenu":"mobile","className":"nav"} /-->`, { clase: 'wrap in' }), { tag: 'header', full: true, clase: 'barra' });
  const footer = B.grupo(B.p(`© ${new Date().getFullYear()} ${esc(nombre)} · <a href="/aviso-de-privacidad/">Aviso de privacidad</a>`), { tag: 'footer', full: true, clase: 'pie' });

  // Estilos globales: paleta EXACTA de la propuesta (sin regenerar) + fuentes de la propuesta + CSS de la propuesta.
  const onP = pal.onPrimary || sobre(pal.primary);
  const paleta = [
    ['base', pal.bg], ['main', pal.fg], ['primary', pal.primary], ['on-primary', onP], ['main-accent', pal.soft], ['border-light', pal.border],
    ['secondary', pal.muted], ['tertiary', pal.card], ['tinte', pal.tinte || pal.muted], ['banda', pal.banda || pal.primary],
  ].filter(([, col]) => /^#[0-9a-f]{6}$/i.test(col || '')).map(([slug, color]) => ({ slug, color, name: slug }));
  // Escala tipográfica: la misma que vio el cliente. Si su propuesta se generó sin la regla de escala, el sitio tampoco la usa.
  let conEscala = true;
  if (prop.token) {
    const html = await fs.readFile(path.join(DIR_PROPUESTAS, prop.token, `${elegida.letra || elegida.etiqueta}.html`), 'utf8').catch(() => null);
    if (html !== null) conEscala = html.includes('Regla dura tipograf');
  }
  const css = cssPropuesta()
    + (lg?.placa ? `\n.wp-block-site-logo.con-placa{--placa:${lg.placa}}` : '')
    + (conEscala ? reforzar(cssTipografia({ titulos: f.titulos, cuerpo: f.cuerpo }, elegida.estilo || brief.marca?.estilo || 'calido')) : '');
  const estilos = {
    settings: {
      color: { palette: paleta },
      typography: { fontFamilies: [{ slug: 'titulos', name: f.titulos, fontFamily: `'${f.titulos}', serif` }, { slug: 'cuerpo', name: f.cuerpo, fontFamily: `'${f.cuerpo}', sans-serif` }] },
    },
    styles: {
      color: { background: 'var(--wp--preset--color--base)', text: 'var(--wp--preset--color--main)' },
      spacing: { padding: { top: '0', right: '0', bottom: '0', left: '0' }, blockGap: '0' },
      typography: { fontFamily: 'var(--wp--preset--font-family--cuerpo)', fontSize: '16px', lineHeight: '1.55' },
      elements: {
        heading: { typography: { fontFamily: 'var(--wp--preset--font-family--titulos)', fontWeight: '400' } },
        button: { color: { background: 'var(--wp--preset--color--primary)', text: 'var(--wp--preset--color--on-primary)' } },
        link: { color: { text: 'inherit' } },
      },
      css,
    },
  };
  return {
    contenido, header, footer, menu, medios, estilos,
    fuentesUrl: urlFuentes([{ titulos: f.titulos, cuerpo: f.cuerpo }]),
    logoClave: lg ? 'logo' : '',
    esperado: { layout, letra: elegida.letra, paleta: pal, fuentes: f, fotos: [...usadas].filter((u) => !mat.videos.some((x) => x.url === u) && !mat.documentos.some((x) => x.url === u)), heroFoto: heroFoto?.url || null, titular: t.titular },
  };
}
