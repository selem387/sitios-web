// Opción R "Manual de servicios" (14-nov-2026). Plantilla propia, reconstruida SOLO a partir de compsych.konpo.co
// (lineamientos de marca de ComPsych, Konpo Studio), por decisión de Sebastián: no usa piezas de otras opciones ni de
// otras ramas. Del generador solo toma los datos del cliente (brief, textos y fotos) y los ayudantes de datos
// (WhatsApp, teléfono, dirección, testimonios válidos).
//
// Lo que se tomó de la referencia (medido el 14-nov-2026 en escritorio a 1440 px y en su cp.min.js):
// - Recorrido horizontal en escritorio (> 991 px) con Lenis; vertical en celular.
// - Cada sección con su propio degradado pastel y su color de acento; el fondo cambia de color al pasar de una a otra.
// - Cabecera: logo con etiqueta chica, liga a la derecha y botón redondo ⋮ que abre el índice numerado.
// - Regla de avance abajo con marcas, nombres de sección y una píldora del color de la sección actual.
// - Portada: nombre gigante en serif, palabra manuscrita subrayada, tarjeta oscura con foto y párrafo a la derecha.
// - Títulos dobles (título + clon) con letras que suben y deriva al recorrer; tarjetas blancas con palabra fantasma.
// - Tarjeta con foto y palabra manuscrita encima; líneas finas que cruzan la sección.
// - Fotos que giran sobre su eje en WebGL (shader de la referencia) y estela de fotos que sigue al mouse.
// - Nombre gigante en blanco con palabra manuscrita encima, iniciales gigantes de fondo, mosaico de tarjetas.
// - Contacto como barras-píldora de colores que entran desde la derecha; al pasar el mouse muestran círculo y dato.
// - Botón redondo con flecha ↗ en lugar de botones de texto.
// Mapeo a la versión de servicios: Marca y modelo → Servicios; Tono de voz → Cómo trabajo; Fotografía → Mi trabajo;
// Tipografía → Sobre mí; tarjetas Por qué/Cómo → Testimonios y Preguntas; Color → Contacto.
// Librerías (las mismas de la referencia, CDN con versión fija): GSAP 3.12.5 + ScrollTrigger, Lenis 1.2.3,
// SplitType 0.3.4 y Three.js 0.147. Sin ellas, sin WebGL o con "reducir movimiento": la página se ve completa, vertical y quieta.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { waUrl, formatoTel } from './bloques.js';
import { direccionTexto, testimoniosValidos } from './datos_brief.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tres = (n) => String(n).padStart(3, '0');
const sinEmoji = (s) => String(s || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();

export const CDN_R = {
  gsap: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
  scrolltrigger: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
  splittype: 'https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js',
  lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.2.3/dist/lenis.min.js',
  three: 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
};
/** Letras: grotesca para todo (como Beatrice), serif para el nombre gigante (como el logotipo) y manuscrita (como Bright Clones). */
export const FUENTES_R = { cuerpo: 'Hanken Grotesk', serif: 'Libre Caslon Display', mano: 'Caveat' };
const URL_FUENTES = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Libre+Caslon+Display&family=Caveat:wght@500;700&display=swap';
const RUNTIME = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fx', 'manual-runtime.js'), 'utf8');

/* ---------------- color: tres temas pastel con su acento, desde los colores del cliente ---------------- */
const hex2rgb = (h) => { const x = String(h).replace('#', ''); const n = parseInt(x.length === 3 ? x.replace(/./g, '$&$&') : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = (h) => { const a = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
export const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function rgb2hsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
function hsl2hex(h, s, l) { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return rgb2hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]); }
const oscurecer = (fg, bg, min) => { let [h, s, l] = rgb2hsl(hex2rgb(fg)); let c = fg; for (let i = 0; i < 40 && contraste(c, bg) < min; i++) { l -= 0.02; c = hsl2hex(h, s, Math.max(0, l)); } return c; };

/**
 * Tres temas como los de la referencia (azul, amarillo y verde pastel con acento oscuro), pero con el tono de los
 * colores del cliente; si trae menos de tres tonos, se completan girando el tono (±35° y +70°).
 * Cada tema: arriba (degradado), abajo, acento (títulos y botón, ≥ 4.5:1 sobre ambos) y tinta (texto, ≥ 7:1).
 */
export function temasManual(colores = []) {
  const tonos = [];
  for (const c of colores) {
    if (!/^#?[0-9a-f]{6}$/i.test(String(c))) continue;
    const [h, s] = rgb2hsl(hex2rgb(c));
    if (s < 0.12) continue;
    if (!tonos.some((t) => Math.min(Math.abs(t - h), 360 - Math.abs(t - h)) < 25)) tonos.push(h);
  }
  const base = tonos[0] ?? 212;
  while (tonos.length < 3) tonos.push([base - 35, base + 70, base + 150][tonos.length - 1] ?? base + 120);
  return tonos.slice(0, 3).map((h) => {
    const arriba = hsl2hex(h, 0.82, 0.86), abajo = hsl2hex(h, 0.6, 0.965);
    const acento = oscurecer(hsl2hex(h, 0.62, 0.34), arriba, 4.6);
    const tinta = oscurecer(hsl2hex(h, 0.45, 0.16), arriba, 7.5);
    return { arriba, abajo, acento, tinta, sobreAcento: contraste('#FFFFFF', acento) >= 4.5 ? '#FFFFFF' : '#111111' };
  });
}

/* ---------------- datos ---------------- */
const precioDe = (it) => it.precio || it.precio_o_rango || '';
const detalleDe = (it) => String(it.detalle || it.descripcion_corta || it.descripcion || '').trim();
/** Agrupa la oferta por su grupo ("A | B" en el nombre también cuenta como grupo A). */
export function gruposManual(items = []) {
  const g = new Map();
  for (const it of items) {
    let grupo = it.grupo || it.categoria || '', nombre = it.nombre || '';
    if (!grupo && nombre.includes(' | ')) [grupo, nombre] = [nombre.split(' | ')[0], nombre.split(' | ').slice(1).join(' | ')];
    grupo = grupo || nombre;
    if (!g.has(grupo)) g.set(grupo, []);
    g.get(grupo).push({ nombre, precio: precioDe(it), detalle: detalleDe(it) });
  }
  return [...g].map(([nombre, opciones]) => ({ nombre, opciones }));
}
/** Párrafos y viñetas ("- algo") de un texto del cliente, sin cambiar letras. */
function textoHTML(t = '') {
  const bloques = String(t).split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return bloques.map((b) => {
    const ls = b.split('\n').map((x) => x.trim()).filter(Boolean);
    if (ls.every((x) => /^[-•*]\s+/.test(x))) return `<ul>${ls.map((x) => `<li>${esc(x.replace(/^[-•*]\s+/, '')).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}</ul>`;
    return `<p>${ls.map((x) => esc(x).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')).join('<br>')}</p>`;
  }).join('');
}
/** Una frase con sustancia de los textos del cliente (sin cambiar letras): salta saludos y presentaciones. */
export function fraseManual(textos = []) {
  const VALOR = /\b(disfrut\w*|me apasiona|nos apasiona|lo que más|nos importa|creemos|cuidamos|buscamos|nuestra misión|mi misión)\b/i;
  const NO = /^(¡?\s*hola\b|soy\b|me llamo\b|mi nombre\b|lo que\b|esto\b|eso\b|así\b|por eso\b|además\b|también\b)/i;
  const todas = [];
  textos.forEach((texto, k) => {
    for (const f of String(texto || '').replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []) {
      const s = f.trim(), n = s.split(' ').length;
      if (n >= 8 && n <= 34 && !NO.test(s)) todas.push({ s, k, v: VALOR.test(s) });
    }
  });
  return (todas.find((x) => x.v && x.k === 0) || todas.find((x) => x.k === 0) || todas.find((x) => x.v) || todas[0])?.s || '';
}
/** Nombre gigante y palabra manuscrita: "Blanca Banderas Fotografía" → "Blanca Banderas" + "Fotografía"; si no, nombre + giro. */
export function marcaManual(nombre = '', giro = '') {
  const ps = String(nombre).trim().split(/\s+/);
  const raiz = (w) => String(w).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').slice(0, 5);
  if (ps.length >= 3 && giro && raiz(ps.at(-1)) === raiz(giro.split(/\s+/)[0])) return { grande: ps.slice(0, -1).join(' '), mano: ps.at(-1) };
  return { grande: nombre, mano: giro };
}
const iniciales = (s) => String(s).split(/\s+/).filter((w) => /^\p{Lu}/u.test(w)).slice(0, 2).map((w) => w[0]).join('') || String(s).slice(0, 2);

/* ---------------- piezas ---------------- */
const FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const botonR = (href, etiqueta) => `<a class="cp-btn"${href} aria-label="${esc(etiqueta)}"><span class="cp-btn-i">${FLECHA}</span><span class="cp-btn-t">${esc(etiqueta)}</span></a>`;
/** Título doble: el título y su clon (decorativo). Las letras suben y el par deriva al recorrer. */
const tituloDoble = (texto, { tag = 'h2', clase = '' } = {}) => `<div class="cp-dt ${clase}" data-dt><${tag} class="cp-h" data-dt-main>${esc(texto)}</${tag}><div class="cp-h cp-dt-clon" data-dt-clon aria-hidden="true">${esc(texto)}</div></div>`;
const fig = (img, x, { cls = '', sizes = '(min-width:992px) 30vw,90vw', eager = false } = {}) => (x ? `<figure class="cp-ph ${cls}" data-inset>${img(x, { cls: 'rep-ok', sizes, eager })}</figure>` : '');

/**
 * Página completa de la opción R. d: {brief, mat, textos, v (variante), titulos, wa, colores, nombreOpcion, letra}.
 * img(x, o) arma la etiqueta <img> y marca la foto como usada. → html
 */
export function paginaManual({ brief = {}, mat = {}, textos = {}, v = {}, titulos = {}, wa = '', colores = [], nombreOpcion = 'Manual de servicios', letra = 'R' }) {
  const neg = brief.negocio || {}, c = brief.contacto || {}, conf = brief.confianza || {}, fund = conf.fundador || {};
  const nombre = neg.nombre || '';
  const giro = neg.giro_texto || '';
  const marca = marcaManual(nombre, giro);
  const temas = temasManual(colores);
  const href = wa ? ` href="${esc(wa)}" target="_blank" rel="noopener"` : ' href="#contacto"';
  const cta = v.cta || 'Escríbeme por WhatsApp';
  const img = (x, { cls = '', sizes = '', eager = false } = {}) => `<img${cls ? ` class="${cls}"` : ''} src="${esc(x.url)}" alt="${esc(x.alt || '')}" loading="${eager ? 'eager' : 'lazy'}"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}${sizes ? ` sizes="${sizes}"` : ''} decoding="async">`;
  const T = { servicios: 'Servicios', trabajo: 'Mi trabajo', sobre: 'Sobre mí', resenas: 'Lo que dicen', faq: 'Preguntas frecuentes', contacto: 'Contacto', ...titulos };

  // Fotos: portada = foto principal; trabajo = todas las de trabajo; sobre mí = fundador y equipo.
  const trabajos = (mat.trabajos || []).filter((x) => x?.url);
  const hero = mat.hero?.url ? mat.hero : trabajos[0] || null;
  const yaUsadas = new Set([hero?.url]);
  const deEquipo = [mat.fundador, ...(mat.equipo || []), ...(mat.local || [])].filter((x) => x?.url && !yaUsadas.has(x.url) && (yaUsadas.add(x.url) || true));
  const otras = [...(mat.otras || []), ...(mat.fotos || []).filter((x) => !x.recorte)].filter((x) => x?.url && !yaUsadas.has(x.url) && !trabajos.some((t) => t.url === x.url) && (yaUsadas.add(x.url) || true));
  const galeria = [...trabajos, ...otras];
  const destacadas = trabajos.length ? [trabajos.find((x) => (x.alto || 0) > (x.ancho || 0)) || trabajos[0], trabajos.find((x, k) => k > 0 && (x.ancho || 0) >= (x.alto || 0)) || trabajos[1]].filter(Boolean) : [];

  const secciones = [];
  const sec = (id, etiqueta, tema, cuerpo, extra = '') => { secciones.push([id, etiqueta]); return `<section class="cp-sec cp-${id}" id="${id}" data-tema="${tema}" aria-label="${esc(etiqueta)}"${extra}>${cuerpo}</section>`; };
  const t3 = (i) => i % 3;

  // 00 · portada
  const portada = sec('inicio', 'Inicio', 0, `<div class="cp-hero-marca"><h1 class="cp-wordmark" data-hero-word><span class="cp-sr">${esc(nombre)}. </span><span aria-hidden="true">${esc(marca.grande)}</span></h1>${marca.mano ? `<p class="cp-mano cp-hero-mano" aria-hidden="true">${esc(marca.mano)}<i class="cp-subraya"></i></p>` : ''}</div>
<div class="cp-hero-pie">${hero ? `<figure class="cp-hero-card" data-hero-card>${img(hero, { cls: 'rep-ok', eager: true, sizes: '(min-width:992px) 36vw,90vw' })}</figure>` : ''}<div class="cp-hero-tx" data-hero-tx>${v.titular ? `<p class="cp-lead">${esc(v.titular)}</p>` : ''}${botonR(href, cta)}</div></div>`);

  // 001 · servicios (Marca y modelo)
  const grupos = gruposManual(brief.oferta?.items || []);
  const mostrar = brief.oferta?.mostrar_precios !== false;
  const cartas = grupos.map((g, k) => {
    const limpio = sinEmoji(g.nombre);
    const fantasma = limpio.split(/\s+/)[0] || limpio;
    const ops = g.opciones.map((o) => `<details class="cp-op"><summary><span class="cp-op-n">${esc(o.nombre || limpio)}</span>${mostrar && o.precio ? `<span class="cp-op-p">${esc(o.precio)}</span>` : ''}</summary>${o.detalle ? `<div class="cp-op-d">${textoHTML(o.detalle)}</div>` : ''}</details>`).join('');
    return `<article class="cp-card" data-card><span class="cp-card-ghost" aria-hidden="true">${esc(fantasma)}</span><h3 class="cp-card-t">${esc(limpio)}</h3><div class="cp-card-b">${ops}</div></article>`;
  }).join('');
  const docs = [...(mat.catalogos || []), ...(mat.menus || []), ...(mat.documentos || [])].filter((x) => x?.url).map((x) => `<a class="cp-doc" href="${esc(x.url)}" target="_blank" rel="noopener">${/\.pdf/i.test(x.url) ? 'Ver catálogo (PDF)' : esc(x.alt || 'Ver documento')}</a>`).join('');
  const servicios = grupos.length || docs ? sec('servicios', T.servicios, 1, `<div class="cp-col cp-srv-foto">${fig(img, destacadas[0], { cls: 'cp-ph-alta' })}${tituloDoble(T.servicios, { clase: 'cp-srv-dt' })}</div>
<div class="cp-col cp-srv-tx" data-px="-350,250">${fig(img, destacadas[1], { cls: 'cp-ph-chica' })}${textos.servicios_intro || v.subtitulo ? `<p class="cp-p" data-words>${esc(textos.servicios_intro || v.subtitulo)}</p>` : ''}${botonR(href, cta)}${docs ? `<div class="cp-docs">${docs}</div>` : ''}</div>
<div class="cp-cards">${cartas}</div>`) : '';

  // 002 · cómo trabajo (Tono de voz)
  const pasos = (brief.oferta?.proceso_pasos || []).filter(Boolean);
  const fraseProceso = textos.proceso_intro || fraseManual([brief.oferta?.diferenciador, textos.sobre || conf.historia_corta]);
  const video = (mat.videos || []).find((x) => x?.url);
  const fotoVoz = trabajos.find((x) => !destacadas.includes(x)) || null;
  const manoVoz = (conf.cifras || [])[0] || (textos.info || []).find((x) => /\d/.test(x)) || '';
  const pasosHTML = pasos.length ? `<ol class="cp-pasos">${pasos.map((p, k) => { const [t, ...r] = String(p).split('\n'); return `<li><span class="cp-num">${tres(k + 1)}</span><b data-chars>${esc(t)}</b>${r.length ? `<span>${esc(r.join(' '))}</span>` : ''}</li>`; }).join('')}</ol>` : '';
  const tarjetaVoz = video ? `<figure class="cp-voz-card" data-inset><video src="${esc(video.url)}" muted loop playsinline preload="metadata" controls></video>${manoVoz ? `<span class="cp-mano cp-voz-mano" aria-hidden="true">${esc(manoVoz)}<i class="cp-subraya"></i></span>` : ''}</figure>`
    : fotoVoz ? `<figure class="cp-voz-card cp-ph" data-inset>${img(fotoVoz, { cls: 'rep-ok', sizes: '(min-width:992px) 30vw,90vw' })}${manoVoz ? `<span class="cp-mano cp-voz-mano" aria-hidden="true">${esc(manoVoz)}<i class="cp-subraya"></i></span>` : ''}</figure>` : '';
  const proceso = pasos.length || fraseProceso ? sec('proceso', textos.proceso || 'Cómo trabajo', 2, `<div class="cp-voz-lineas" aria-hidden="true"><i class="h"></i><i class="v"></i></div>
<div class="cp-col cp-voz-a"><div class="cp-voz-t">${tituloDoble(textos.proceso || 'Cómo trabajo')}</div><div class="cp-voz-tx" data-px="-350,250">${fraseProceso ? `<p class="cp-p" data-words>${esc(fraseProceso)}</p>` : ''}${pasosHTML}${botonR(href, cta)}</div></div>
${tarjetaVoz}`) : '';

  // 003 · mi trabajo (Fotografía): galería en giro (WebGL) y estela de fotos; sin WebGL, rejilla.
  const fraseTrabajo = textos.trabajo_intro || (typeof textos.destacados === 'string' ? textos.destacados : '') || '';
  const trabajo = galeria.length ? sec('trabajo', T.trabajo, 0, `<div class="cp-foto-cab" data-trail-zona>${tituloDoble(T.trabajo, { clase: 'cp-foto-dt' })}${fraseTrabajo ? `<p class="cp-p" data-words>${esc(fraseTrabajo)}</p>` : ''}${botonR(href, cta)}<div class="cp-trail" aria-hidden="true"></div></div>
<div class="cp-giro" aria-hidden="true" data-three="${CDN_R.three}"><canvas></canvas></div>
<div class="cp-galeria" data-n="${galeria.length}">${galeria.map((x) => `<figure class="cp-ph" data-inset data-par>${img(x, { cls: 'rep-ok', sizes: '(min-width:992px) 24vw,46vw' })}</figure>`).join('')}</div>`) : '';

  // 004 · sobre mí (Tipografía)
  const historia = textos.sobre || conf.historia_corta || '';
  const quien = fund.nombre || marca.grande;
  const datosFund = [fund.rol, ...(fund.credenciales || []), ...(conf.cifras || [])].filter(Boolean);
  const sobre = historia || deEquipo.length ? sec('sobre', T.sobre, 1, `<div class="cp-col cp-tipo-t"><p class="cp-tipo-nombre" aria-hidden="true">${esc(quien)}</p>${fund.rol ? `<p class="cp-mano cp-tipo-mano" aria-hidden="true">${esc(fund.rol)}</p>` : ''}${tituloDoble(T.sobre, { clase: 'cp-tipo-dt' })}</div>
${historia ? `<div class="cp-col cp-tipo-tx"><div class="cp-historia">${textoHTML(historia)}</div>${datosFund.length ? `<ul class="cp-chips">${datosFund.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${botonR(href, cta)}</div>` : ''}
${deEquipo.length ? `<div class="cp-mosaico" data-n="${deEquipo.length}"><div class="cp-mono" aria-hidden="true"><span>${esc(iniciales(quien))}</span></div>${deEquipo.map((x) => fig(img, x)).join('')}</div>` : ''}
<span class="cp-aa" aria-hidden="true">${esc(iniciales(quien))}</span>`) : '';

  // 005 · testimonios y preguntas (tarjetas con palabra fantasma)
  const tes = testimoniosValidos(brief, mat);
  const capturas = (mat.resenas || []).filter((x) => x?.url);
  const resenas = tes.length || capturas.length ? sec('resenas', T.resenas, 2, `<div class="cp-col cp-res-t">${tituloDoble(T.resenas)}</div>
<div class="cp-cards">${tes.map((x) => { const n = sinEmoji(x.nombre || ''); return `<article class="cp-card cp-card-q" data-card><span class="cp-card-ghost" aria-hidden="true">${esc(n.split(' ')[0] || '“')}</span><blockquote><p>${esc(sinEmoji(x.texto))}</p>${n ? `<cite>${esc(n)}</cite>` : ''}</blockquote></article>`; }).join('')}${capturas.map((x) => `<figure class="cp-card cp-card-cap" data-card>${img(x, { cls: 'rep-ok', sizes: '(min-width:992px) 28vw,90vw' })}</figure>`).join('')}</div>`) : '';
  const fq = (brief.faq || []).filter((x) => x.pregunta && x.respuesta);
  const faq = fq.length ? sec('faq', T.faq, 0, `<div class="cp-col cp-faq-t">${tituloDoble(T.faq)}</div>
<div class="cp-cards">${fq.map((x, k) => `<article class="cp-card cp-card-f" data-card><span class="cp-card-ghost" aria-hidden="true">${tres(k + 1)}</span><h3 class="cp-card-t">${esc(x.pregunta)}</h3><p class="cp-card-r">${esc(x.respuesta)}</p></article>`).join('')}</div>`) : '';

  // 006 · contacto (Color): barras-píldora de colores
  const dir = direccionTexto(brief);
  const tel = c.telefono || c.whatsapp || '';
  const r = c.redes || {};
  const red = (v0, base) => { const s = String(v0 || '').trim(); if (!s) return ''; return /^https?:\/\//.test(s) ? s : `${base}${s.replace(/^@/, '')}`; };
  const barras = [
    c.whatsapp && wa ? ['WhatsApp', formatoTel(c.whatsapp), wa] : null,
    tel && tel !== c.whatsapp ? ['Teléfono', formatoTel(tel), `tel:${String(tel).replace(/\D/g, '')}`] : null,
    r.instagram ? ['Instagram', `@${String(r.instagram).replace(/^@|.*instagram\.com\//g, '').replace(/\/$/, '')}`, red(r.instagram, 'https://instagram.com/')] : null,
    r.facebook ? ['Facebook', String(r.facebook).replace(/.*facebook\.com\//, '').replace(/\/$/, ''), red(r.facebook, 'https://facebook.com/')] : null,
    r.tiktok ? ['TikTok', `@${String(r.tiktok).replace(/^@|.*tiktok\.com\/@?/g, '')}`, red(r.tiktok, 'https://www.tiktok.com/@')] : null,
    c.email ? ['Correo', c.email, `mailto:${c.email}`] : null,
    typeof (c.horarios || c.horario) === 'string' ? ['Horario', c.horarios || c.horario, ''] : null,
    dir || neg.ciudad ? ['Dónde', dir || [neg.ciudad, neg.estado].filter(Boolean).join(', '), `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([dir || neg.ciudad, nombre].filter(Boolean).join(' '))}`] : null,
  ].filter(Boolean);
  const coloresBarra = [temas[0].arriba, temas[0].acento, temas[1].acento, temas[1].arriba, temas[2].acento, temas[2].arriba, temas[0].tinta];
  const contacto = sec('contacto', T.contacto, 2, `<div class="cp-col cp-color-t">${tituloDoble(T.contacto)}${typeof c.horarios === 'string' || c.horario ? '' : ''}${botonR(href, cta)}</div>
<ul class="cp-barras">${barras.map(([k, val, link], i) => { const bg = coloresBarra[i % coloresBarra.length]; const fg = contraste('#FFFFFF', bg) >= 4.5 ? '#FFFFFF' : '#141414'; const dentro = `<span class="cp-barra-c" aria-hidden="true"></span><span class="cp-barra-k">${esc(k)}</span><span class="cp-barra-v">${esc(val)}</span>`; return `<li class="cp-barra" style="--b:${bg};--bf:${fg};--bc:${coloresBarra[(i + 3) % coloresBarra.length]}" data-barra>${link ? `<a href="${esc(link)}"${/^https?:/.test(link) ? ' target="_blank" rel="noopener"' : ''}>${dentro}</a>` : `<div>${dentro}</div>`}</li>`; }).join('')}</ul>`);

  const cuerpo = [portada, servicios, proceso, trabajo, sobre, resenas, faq, contacto].join('\n');
  const marcasPie = (mat.logos_extra || []).filter((x) => x?.url).map((x) => `<img class="cp-pie-marca" src="${esc(x.url)}" alt="${esc(nombre)}" loading="lazy"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}>`).join('');
  const logo = mat.logo?.url ? `<img class="cp-logo" src="${esc(mat.logo.url)}" alt="${esc(nombre)}"${mat.logo.ancho ? ` width="${mat.logo.ancho}" height="${mat.logo.alto}"` : ''}>` : `<span class="cp-logo-txt">${esc(nombre)}</span>`;
  const cssTemas = secciones.map(([id], k) => { const tm = temas[[0, 1, 2, 0, 1, 2, 0, 2][k] ?? t3(k)]; return `#${id}{--arriba:${tm.arriba};--abajo:${tm.abajo};--acento:${tm.acento};--tinta:${tm.tinta};--sobre-acento:${tm.sobreAcento}}`; }).join('');
  const temaDe = (k) => temas[[0, 1, 2, 0, 1, 2, 0, 2][k] ?? 0];
  const t0 = temaDe(0);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(nombre)} · Propuesta ${letra}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preload" as="style" href="${URL_FUENTES}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link href="${URL_FUENTES}" rel="stylesheet"></noscript>
<style>
:root{--arriba:${t0.arriba};--abajo:${t0.abajo};--acento:${t0.acento};--tinta:${t0.tinta};--sobre-acento:${t0.sobreAcento};--fc:'${FUENTES_R.cuerpo}',system-ui,sans-serif;--fs:'${FUENTES_R.serif}',Georgia,serif;--fm:'${FUENTES_R.mano}',cursive;--m:clamp(20px,4vw,64px)}
${CSS_MANUAL}
${cssTemas}
</style></head>
<body class="l-manual">
<a class="cp-salta" href="#servicios">Ir al contenido</a>
<div class="cp-fondo" aria-hidden="true"></div>
<header class="cp-cab"><a class="cp-marca" href="#inicio">${logo}${giro ? `<sup>${esc(giro)}</sup>` : ''}</a><a class="cp-cab-liga"${href}>${esc(cta)}</a><button type="button" class="cp-menu-b" aria-expanded="false" aria-controls="cp-indice" aria-label="Abrir índice"><i></i><i></i><i></i></button></header>
<nav class="cp-indice" id="cp-indice" aria-label="Índice" hidden><ol>${secciones.map(([id, n], k) => `<li><a href="#${id}"><span>${tres(k)}</span>${esc(n)}</a></li>`).join('')}</ol></nav>
<main class="cp-main"><div class="cp-pista">
${cuerpo}
</div></main>
<div class="cp-regla" aria-hidden="true"><div class="cp-regla-m"></div><div class="cp-regla-p"></div><ol class="cp-regla-n">${secciones.map(([id, n], k) => `<li data-para="${id}"><span class="cp-regla-k">${tres(k)}</span><span class="cp-regla-t">${esc(n)}</span></li>`).join('')}</ol></div>
<footer class="cp-pie">${marcasPie ? `<div class="cp-pie-marcas">${marcasPie}</div>` : ''}<p>© ${new Date().getFullYear()} ${esc(nombre)} · Propuesta ${letra}: ${esc(nombreOpcion)}</p></footer>
<script>${JS_INDICE}</script>
<script defer src="${CDN_R.gsap}"></script><script defer src="${CDN_R.scrolltrigger}"></script><script defer src="${CDN_R.splittype}"></script><script defer src="${CDN_R.lenis}"></script>
<script>${RUNTIME}</script>
</body></html>`;
}

/** Índice (botón ⋮): abre y cierra; funciona aunque no carguen las librerías. */
const JS_INDICE = `(function(){var b=document.querySelector('.cp-menu-b'),n=document.getElementById('cp-indice');if(!b||!n)return;
function pon(v){n.hidden=!v;b.setAttribute('aria-expanded',v?'true':'false');b.setAttribute('aria-label',v?'Cerrar índice':'Abrir índice');document.documentElement.classList.toggle('cp-indice-abierto',v)}
b.addEventListener('click',function(){pon(n.hidden)});n.addEventListener('click',function(e){if(e.target.closest('a'))pon(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!n.hidden){pon(false);b.focus()}})})();`;

export const CSS_MANUAL = `
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body.l-manual{font-family:var(--fc);color:var(--tinta);background:linear-gradient(180deg,var(--arriba),var(--abajo)) fixed;font-size:18px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:clip}
img,video{max-width:100%;display:block}a{color:inherit}
.cp-sr,.cp-salta{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.cp-salta:focus{position:fixed;left:12px;top:12px;width:auto;height:auto;clip:auto;z-index:99;background:#fff;color:#111;padding:10px 14px;border-radius:999px}
:focus-visible{outline:3px solid var(--acento);outline-offset:3px}
.cp-fondo{display:none}
/* cabecera */
.cp-cab{position:fixed;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;gap:20px;padding:18px var(--m);pointer-events:none}
.cp-cab>*{pointer-events:auto}
.cp-marca{display:flex;align-items:flex-start;gap:6px;text-decoration:none;margin-right:auto}
.cp-logo{height:clamp(34px,4vw,46px);width:auto;max-width:200px}.cp-logo-txt{font-family:var(--fs);font-size:26px}
.cp-marca sup{font-size:12px;letter-spacing:.02em;opacity:.7;line-height:1;margin-top:4px}
.cp-cab-liga{font-weight:500;text-decoration:none;font-size:16px;display:none}
.cp-menu-b{width:40px;height:40px;border-radius:50%;border:1px solid color-mix(in srgb,var(--tinta) 45%,transparent);background:color-mix(in srgb,#fff 35%,transparent);display:grid;place-content:center;gap:3px;cursor:pointer}
.cp-menu-b i{display:block;width:3px;height:3px;border-radius:50%;background:var(--tinta)}
.cp-indice{position:fixed;inset:0;z-index:39;background:linear-gradient(180deg,var(--arriba),var(--abajo));display:grid;align-content:center;padding:96px var(--m) 40px}
.cp-indice[hidden]{display:none}
.cp-indice ol{list-style:none;display:grid;gap:6px}
.cp-indice a{display:flex;align-items:baseline;gap:18px;text-decoration:none;font-size:clamp(30px,5.5vw,72px);font-weight:500;letter-spacing:-.04em;line-height:1.05;color:var(--tinta)}
.cp-indice a span{font-size:16px;letter-spacing:.04em;font-weight:500;color:var(--acento);min-width:40px}
.cp-indice a:hover{color:var(--acento)}
/* secciones (vertical: celular y respaldo sin librerías) */
.cp-sec{position:relative;padding:clamp(96px,14vw,160px) var(--m) clamp(48px,8vw,96px);background:linear-gradient(180deg,var(--arriba),var(--abajo));color:var(--tinta);overflow:clip;display:flex;flex-direction:column;gap:clamp(24px,4vw,48px)}
html.cp-fx .cp-sec{background:transparent}
html.cp-fx .cp-fondo{display:block;position:fixed;inset:0;z-index:-1;background:linear-gradient(180deg,var(--fondo-a,var(--arriba)),var(--fondo-b,var(--abajo)))}
.cp-h{font-weight:500;letter-spacing:-.045em;line-height:.95;font-size:clamp(48px,9vw,140px);color:var(--acento)}
.cp-dt{position:relative}
.cp-dt-clon{position:absolute;inset:0;pointer-events:none;user-select:none;color:transparent;-webkit-text-stroke:1px color-mix(in srgb,var(--acento) 40%,transparent);transform:translate(.05em,.12em);z-index:-1}
.cp-p{font-size:clamp(19px,1.6vw,23px);font-weight:500;line-height:1.3;max-width:24ch;letter-spacing:-.01em}
.cp-lead{font-size:clamp(22px,2vw,28px);font-weight:500;line-height:1.25;max-width:22ch;letter-spacing:-.015em}
.cp-mano{font-family:var(--fm);font-weight:500;line-height:1;color:var(--tinta);position:relative;display:inline-block}
.cp-subraya{position:absolute;left:0;right:0;bottom:-.08em;height:3px;border-radius:3px;background:color-mix(in srgb,var(--acento) 60%,transparent);transform-origin:left}
/* botón redondo con flecha */
.cp-btn{display:inline-flex;align-items:center;gap:14px;text-decoration:none;color:var(--tinta);font-weight:600;font-size:18px;min-height:48px}
.cp-btn-i{width:48px;height:48px;border-radius:50%;background:var(--acento);color:var(--sobre-acento);display:grid;place-items:center;flex:none;transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.cp-btn-i svg{width:18px;height:18px}
.cp-btn:hover .cp-btn-i{transform:scale(1.12) rotate(45deg)}
/* tarjetas fotográficas */
.cp-ph{position:relative;margin:0;overflow:hidden;border-radius:14px;background:color-mix(in srgb,var(--tinta) 12%,transparent)}
.cp-ph img{width:100%;height:100%;object-fit:cover}
/* portada */
.cp-inicio{min-height:100svh;justify-content:flex-end}
.cp-hero-marca{position:relative;margin-top:24px}
.cp-wordmark{font-family:var(--fs);font-weight:400;font-size:clamp(52px,15vw,300px);line-height:.86;letter-spacing:-.03em;color:color-mix(in srgb,var(--acento) 30%,var(--arriba));white-space:normal}
.cp-hero-mano{font-size:clamp(40px,7vw,104px);margin:-.15em 0 0 auto;display:table;padding-right:.1em}
.cp-hero-pie{display:grid;gap:28px;align-items:end}
.cp-hero-card{aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:var(--tinta);margin:0;max-width:640px}.cp-hero-card img{width:100%;height:100%;object-fit:cover}
.cp-hero-tx{display:grid;gap:22px;justify-items:start}
/* servicios */
.cp-ph-alta{aspect-ratio:4/5;max-width:560px}
.cp-ph-chica{aspect-ratio:4/5;width:min(200px,40vw)}
.cp-srv-foto{position:relative}
.cp-srv-dt{margin-top:-1.2em;position:relative}
.cp-srv-tx{display:grid;gap:24px;align-content:start}
.cp-cards{display:grid;gap:8px}
.cp-card{position:relative;background:#fff;color:#141414;border-radius:14px;padding:26px 26px 22px;min-height:340px;display:flex;flex-direction:column;overflow:hidden;margin:0}
.cp-card-ghost{position:absolute;left:14px;top:4px;font-size:clamp(80px,9vw,128px);font-weight:500;letter-spacing:-.05em;line-height:1;color:#141414;opacity:.05;pointer-events:none;white-space:nowrap}
.cp-card-t{position:relative;font-size:clamp(24px,2.2vw,32px);font-weight:500;letter-spacing:-.03em;line-height:1.1;margin-bottom:auto;padding-bottom:28px}
.cp-card-b{position:relative;display:grid;gap:0;border-top:1px solid #e6e3df}
.cp-op{border-bottom:1px solid #e6e3df}
.cp-op summary{list-style:none;display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:12px 0;cursor:pointer;font-size:18px}
.cp-op summary::-webkit-details-marker{display:none}
.cp-op summary::after{content:"+";font-size:20px;line-height:1;color:var(--acento);margin-left:4px}
.cp-op[open] summary::after{content:"–"}
.cp-op-n{font-weight:500}.cp-op-p{margin-left:auto;font-weight:600;color:var(--acento);white-space:nowrap;font-variant-numeric:tabular-nums}
.cp-op-d{padding:0 0 14px;color:#4a4744;font-size:17px;display:grid;gap:8px}
.cp-op-d ul{padding-left:18px;display:grid;gap:2px}
.cp-docs{display:flex;flex-wrap:wrap;gap:10px}.cp-doc{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;border:1.5px solid currentColor;text-decoration:none;font-weight:600}
.cp-card-q blockquote p{position:relative;font-size:clamp(19px,1.5vw,22px);line-height:1.35;font-weight:500;margin-top:auto}
.cp-card-q blockquote{display:flex;flex-direction:column;gap:14px;margin-top:auto;position:relative}
.cp-card-q cite{font-style:normal;color:#5a5651;font-size:16px}
.cp-card-r{position:relative;color:#4a4744;font-size:18px;line-height:1.45}
.cp-card-cap{padding:0;background:#fff}.cp-card-cap img{width:100%;height:100%;object-fit:contain}
/* cómo trabajo */
.cp-voz-lineas{display:none}
.cp-pasos{list-style:none;display:grid;gap:0;max-width:640px;border-top:1px solid color-mix(in srgb,var(--tinta) 30%,transparent)}
.cp-pasos li{display:grid;grid-template-columns:auto 1fr;column-gap:20px;padding:16px 0;border-bottom:1px solid color-mix(in srgb,var(--tinta) 30%,transparent)}
.cp-pasos .cp-num{grid-row:span 2;font-size:16px;font-weight:600;color:var(--acento);padding-top:4px;font-variant-numeric:tabular-nums}
.cp-pasos b{font-weight:500;font-size:clamp(19px,1.5vw,22px);line-height:1.3}
.cp-voz-tx{display:grid;gap:24px;justify-items:start}
.cp-voz-card{position:relative;aspect-ratio:4/3;max-width:560px;border-radius:14px;overflow:hidden;margin:0}
.cp-voz-card img,.cp-voz-card video{width:100%;height:100%;object-fit:cover}
.cp-voz-mano{position:absolute;left:5%;bottom:10%;color:#fff;font-size:clamp(34px,4vw,60px);text-shadow:0 2px 18px rgba(0,0,0,.35)}
.cp-voz-mano .cp-subraya{background:#fff}
/* mi trabajo */
.cp-foto-cab{position:relative;display:grid;gap:22px;justify-items:start}
.cp-trail,.cp-giro{display:none}
.cp-galeria{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cp-galeria .cp-ph{aspect-ratio:4/5}
.cp-galeria .cp-ph:nth-child(5n+1){grid-column:span 2;aspect-ratio:3/2}
/* sobre mí */
.cp-tipo-t{position:relative}
.cp-tipo-nombre{font-size:clamp(56px,11vw,180px);font-weight:600;letter-spacing:-.06em;line-height:.85;color:#fff;text-shadow:0 1px 0 color-mix(in srgb,var(--acento) 10%,transparent)}
.cp-tipo-mano{font-size:clamp(36px,5vw,74px);color:var(--acento);margin:-.55em 0 0 .3em;transform:rotate(-3deg)}
.cp-tipo-dt{margin-top:28px}.cp-tipo-dt .cp-h{font-size:clamp(40px,6vw,96px)}
.cp-historia{display:grid;gap:14px;font-size:19px;line-height:1.55;max-width:60ch}
.cp-historia ul{padding-left:20px}
.cp-tipo-tx{display:grid;gap:24px;justify-items:start}
.cp-chips{list-style:none;display:flex;flex-wrap:wrap;gap:8px}.cp-chips li{padding:8px 14px;border-radius:999px;background:#fff;color:#141414;font-size:16px;font-weight:500}
.cp-mosaico{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.cp-mosaico .cp-ph{aspect-ratio:1}
.cp-mono{aspect-ratio:1;border-radius:14px;background:var(--tinta);display:grid;place-items:center}
.cp-mono span{width:62%;aspect-ratio:1;border:3px solid var(--arriba);border-radius:10px;display:grid;place-items:center;color:var(--arriba);font-family:var(--fs);font-size:clamp(40px,6vw,88px)}
.cp-aa{position:absolute;right:-.06em;bottom:-.22em;font-size:clamp(200px,40vw,560px);font-weight:600;letter-spacing:-.08em;line-height:1;color:#fff;opacity:.55;pointer-events:none;z-index:0}
.cp-sobre>*:not(.cp-aa){position:relative;z-index:1}
/* contacto: barras-píldora */
.cp-barras{list-style:none;display:grid;gap:0;margin-right:calc(var(--m) * -1)}
.cp-barra{position:relative}
.cp-barra a,.cp-barra>div{display:flex;align-items:center;gap:18px;min-height:clamp(72px,10vh,112px);padding:0 28px;border-radius:999px 0 0 999px;background:var(--b);color:var(--bf);text-decoration:none;position:relative;overflow:hidden}
.cp-barra-c{width:clamp(48px,7vh,80px);aspect-ratio:1;border-radius:50%;background:var(--bc);flex:none;transform:scale(0);transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cp-barra-k{font-weight:600;font-size:16px;letter-spacing:.06em;text-transform:uppercase;opacity:.85;min-width:110px}
.cp-barra-v{font-size:clamp(20px,2vw,30px);font-weight:600;letter-spacing:-.01em;overflow-wrap:anywhere}
.cp-barra:hover .cp-barra-c,.cp-barra:focus-within .cp-barra-c{transform:scale(1)}
.cp-color-t{display:grid;gap:24px;justify-items:start}
#contacto .mapa{border-radius:14px;overflow:hidden;min-height:320px}#contacto .mapa iframe{width:100%;height:100%;min-height:320px;border:0;display:block}
/* regla de avance (solo en el recorrido horizontal) */
.cp-regla{display:none}
/* pie */
.cp-pie{padding:28px var(--m) 40px;display:grid;gap:16px;justify-items:center;text-align:center;font-size:16px;opacity:.85}
.cp-pie-marcas{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}.cp-pie-marca{height:56px;width:auto}
/* ---------- recorrido horizontal (escritorio, con librerías) ---------- */
@media (max-width:991px){
.cp-cab{background:color-mix(in srgb,var(--arriba) 82%,transparent);backdrop-filter:blur(8px);padding-top:12px;padding-bottom:12px}
.cp-card{min-height:0}.cp-card-t{padding-bottom:20px;margin-bottom:0}.cp-card-q blockquote,.cp-card-r{margin-top:0}
.cp-barra a,.cp-barra>div{flex-wrap:wrap;gap:4px 14px;padding:16px 24px;min-height:0}.cp-barra-c{display:none}.cp-barra-k{min-width:0;flex-basis:100%}
}
@media (min-width:992px){
.cp-cab-liga{display:inline-flex}
.cp-hero-pie{grid-template-columns:minmax(0,1fr) minmax(0,.7fr);align-items:end}
.cp-cards{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.cp-galeria{grid-template-columns:repeat(4,minmax(0,1fr))}
.cp-mosaico{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (min-width:992px){
html.cp-horiz body.l-manual{overflow:hidden;height:100svh}
html.cp-horiz .cp-main{position:fixed;inset:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
html.cp-horiz .cp-main::-webkit-scrollbar{display:none}
html.cp-horiz .cp-pista{display:flex;height:100svh;width:max-content}
html.cp-horiz .cp-sec{flex:none;height:100svh;flex-direction:row;align-items:stretch;gap:0;padding:96px 0 120px;overflow:visible}
html.cp-horiz .cp-col{flex:none}
html.cp-horiz .cp-sec+.cp-sec{margin-left:6vw}
html.cp-horiz .cp-pie{display:none}
html.cp-horiz .cp-regla{display:block;position:fixed;left:24px;right:24px;bottom:16px;height:70px;z-index:30;color:var(--tinta)}
.cp-regla-m{position:absolute;left:0;right:0;top:0;height:14px;display:flex;justify-content:space-between;align-items:flex-start}
.cp-regla-m i{display:block;width:1px;height:8px;background:currentColor;opacity:.35}.cp-regla-m i.l{height:30px;opacity:.5}
.cp-regla-p{position:absolute;top:0;left:0;width:70px;height:6px;border-radius:6px;background:var(--acento);transform:translateX(0)}
.cp-regla-n{list-style:none;position:absolute;left:0;right:0;top:38px;height:24px}
.cp-regla-n li{position:absolute;top:0;font-size:13px;white-space:nowrap;opacity:.6;transition:opacity .3s;display:flex;gap:10px;padding:0 6px;border-radius:6px}.cp-regla-n li.act{opacity:1;font-weight:500;z-index:1;background:var(--abajo)}
.cp-regla-t{display:none}.cp-regla-n li.act .cp-regla-t{display:inline;background:color-mix(in srgb,var(--abajo) 80%,transparent);padding:0 6px;border-radius:6px}
/* portada */
html.cp-horiz .cp-inicio{width:calc(100vw + 40px);display:block;padding:0}
html.cp-horiz .cp-hero-marca{position:absolute;left:2.5vw;top:6vh;margin:0;width:max-content}
html.cp-horiz .cp-wordmark{font-size:min(19vw,32vh);white-space:nowrap}
html.cp-horiz .cp-hero-mano{position:absolute;right:0;top:calc(min(19vw,32vh) * .78);font-size:min(5.6vw,9vh)}
html.cp-horiz .cp-hero-pie{position:absolute;left:14vw;right:6vw;bottom:19vh;grid-template-columns:36vw 1fr;gap:0}
html.cp-horiz .cp-hero-card{width:36vw;max-width:none;height:38vh;aspect-ratio:auto}
html.cp-horiz .cp-hero-tx{justify-self:end;max-width:26vw}
/* servicios */
html.cp-horiz .cp-servicios{padding-left:0}
html.cp-horiz .cp-srv-foto{width:52vw;display:flex;align-items:flex-end;justify-content:flex-start;padding-left:0}
html.cp-horiz .cp-ph-alta{width:34vw;height:calc(100svh - 96px - 150px);max-width:none;aspect-ratio:auto;position:absolute;left:2vw;top:0}
html.cp-horiz .cp-srv-dt{position:absolute;left:16vw;bottom:0;margin:0;width:max-content}
html.cp-horiz .cp-srv-dt .cp-h{font-size:min(7vw,13vh);max-width:9ch}
html.cp-horiz .cp-srv-tx{width:30vw;padding:0 3vw 0 6vw;align-content:center;position:relative;display:flex;flex-direction:column;justify-content:center;gap:22px}
html.cp-horiz .cp-ph-chica{width:12vw;aspect-ratio:4/5}
html.cp-horiz .cp-cards{display:flex;gap:4px;align-items:stretch;padding:15vh 4vw 0 0;grid-template-columns:none}
html.cp-horiz .cp-card{width:min(30vw,440px);flex:none;min-height:0;height:100%;overflow:auto;scrollbar-width:thin}
/* cómo trabajo */
html.cp-horiz .cp-proceso{padding:96px 0 120px}
html.cp-horiz .cp-voz-lineas{display:block;position:absolute;inset:0;pointer-events:none}
html.cp-horiz .cp-voz-lineas .h{position:absolute;left:0;right:0;top:55%;height:1px;background:color-mix(in srgb,var(--tinta) 30%,transparent)}
html.cp-horiz .cp-voz-lineas .v{position:absolute;top:0;bottom:22%;right:30vw;width:1px;background:color-mix(in srgb,var(--tinta) 30%,transparent)}
html.cp-horiz .cp-voz-a{width:70vw;display:grid;grid-template-rows:calc(55svh - 96px) 1fr;padding-left:14vw}
html.cp-horiz .cp-voz-t{display:flex;align-items:flex-end;padding-bottom:4vh}
html.cp-horiz .cp-voz-t .cp-h{font-size:min(8vw,15vh);white-space:nowrap}
html.cp-horiz .cp-voz-tx{display:flex;flex-wrap:wrap;align-items:flex-start;gap:20px 4vw;padding-top:4vh}
html.cp-horiz .cp-voz-tx .cp-p{flex:0 0 22ch;max-width:22ch}
html.cp-horiz .cp-srv-tx .cp-p{width:100%;max-width:24ch}
html.cp-horiz .cp-pasos{width:26vw}
html.cp-horiz .cp-voz-tx .cp-btn{align-self:flex-start}
html.cp-horiz .cp-voz-card{width:30vw;height:32vh;align-self:end;margin:0 6vw 0 10vw;max-width:none;aspect-ratio:auto}
/* mi trabajo */
html.cp-horiz .cp-trabajo{width:auto;padding:96px 0 120px}
html.cp-horiz .cp-foto-cab{width:70vw;align-content:center;justify-items:center;text-align:center;padding:0 6vw}
html.cp-horiz .cp-foto-cab .cp-p{max-width:26ch;text-align:left}
html.cp-horiz .cp-foto-dt .cp-h{font-size:min(8vw,15vh);white-space:nowrap}
html.cp-horiz .cp-galeria{display:grid;grid-auto-flow:column;grid-template-rows:repeat(2,minmax(0,1fr));grid-auto-columns:18vw;grid-template-columns:none;gap:10px;height:100%;padding-right:4vw}
html.cp-horiz .cp-galeria .cp-ph,html.cp-horiz .cp-galeria .cp-ph:nth-child(5n+1){aspect-ratio:auto;grid-column:auto;height:100%}
html.cp-horiz .cp-galeria .cp-ph:nth-child(3n+1){grid-row:span 2}
html.cp-horiz .cp-ph[data-par] img{width:120%;max-width:none}
html.cp-horiz.cp-webgl .cp-giro{display:block;position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0;transition:opacity .6s}
html.cp-horiz.cp-webgl .cp-giro.vis{opacity:1}
html.cp-horiz.cp-webgl .cp-giro canvas{width:100%;height:100%;display:block}
html.cp-horiz .cp-trail{display:block;position:absolute;inset:-96px 0 -120px;z-index:3;pointer-events:none}
.cp-trail-i{position:absolute;left:0;top:0;width:14vw;aspect-ratio:3/4;border-radius:10px;overflow:hidden;opacity:0;will-change:transform,opacity}.cp-trail-i img{width:100%;height:100%;object-fit:cover}
/* sobre mí */
html.cp-horiz .cp-sobre{padding:96px 0 120px}
html.cp-horiz .cp-tipo-t{width:60vw;display:flex;flex-direction:column;justify-content:center;padding-left:8vw}
html.cp-horiz .cp-tipo-nombre{font-size:min(10vw,19vh);white-space:nowrap}
html.cp-horiz .cp-tipo-tx{width:auto;align-content:center;padding:0 5vw}
html.cp-horiz .cp-historia{display:block;columns:26ch;column-gap:3vw;column-fill:auto;height:calc(100svh - 96px - 120px - 140px);width:max-content;max-width:none}
html.cp-horiz .cp-historia p,html.cp-horiz .cp-historia ul{break-inside:avoid;margin-bottom:14px;width:26ch}
html.cp-horiz .cp-mosaico{display:grid;grid-template-columns:none;grid-template-rows:repeat(2,minmax(0,1fr));grid-auto-flow:column;grid-auto-columns:22vw;gap:8px;height:100%;padding-right:6vw}
html.cp-horiz .cp-mosaico .cp-ph,html.cp-horiz .cp-mono{aspect-ratio:auto;height:100%}
html.cp-horiz .cp-mosaico .cp-ph:nth-child(2){grid-row:span 2;width:28vw}
html.cp-horiz .cp-aa{position:absolute;right:auto;left:30vw;bottom:-14vh;font-size:min(48vw,80vh)}
/* testimonios y preguntas */
html.cp-horiz .cp-resenas,html.cp-horiz .cp-faq{padding:96px 0 120px}
html.cp-horiz .cp-res-t,html.cp-horiz .cp-faq-t{width:44vw;display:flex;align-items:center;padding-left:8vw}
html.cp-horiz .cp-res-t .cp-h,html.cp-horiz .cp-faq-t .cp-h{font-size:min(7vw,13vh);max-width:9ch}
html.cp-horiz .cp-card-q,html.cp-horiz .cp-card-f{width:min(26vw,400px)}
html.cp-horiz .cp-card-cap{width:auto;aspect-ratio:3/4}
/* contacto */
html.cp-horiz .cp-contacto{padding:0;width:100vw}
html.cp-horiz .cp-color-t{position:absolute;left:8vw;top:50%;transform:translateY(-50%);width:28vw;z-index:2}
html.cp-horiz .cp-color-t .cp-h{font-size:min(6vw,11vh);max-width:none;white-space:nowrap}
html.cp-horiz .cp-barras{position:absolute;right:0;top:0;bottom:0;width:66vw;display:flex;flex-direction:column;margin:0}
html.cp-horiz .cp-barra{flex:1;display:flex}
html.cp-horiz .cp-barra a,html.cp-horiz .cp-barra>div{flex:1;min-height:0;border-radius:999px 0 0 999px}
html.cp-horiz #contacto .mapa{flex:none;width:34vw;height:calc(100svh - 216px);align-self:center;margin:0 4vw 0 70vw}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.cp-btn-i,.cp-barra-c{transition:none}}
@media (hover:none){.cp-barra-c{transform:scale(1)}}
`;

/** Para la revisión visual automática: la página vertical y quieta, con todo visible. */
export const CSS_REVISION_MANUAL = '.cp-giro,.cp-trail,.cp-regla,.cp-dt-clon,.cp-fondo{display:none!important}.cp-sec{background:linear-gradient(180deg,var(--arriba),var(--abajo))!important}';

/** Paleta de la R en el formato del generador (se audita igual que las demás y sirve si luego se monta el sitio). */
export function paletaManual(colores = []) {
  const [t] = temasManual(colores);
  return { bg: t.abajo, fg: t.tinta, primary: t.acento, onPrimary: t.sobreAcento, muted: t.arriba, card: '#FFFFFF', soft: t.tinta, border: t.arriba, tinte: t.arriba, banda: t.acento, accent: t.acento, onAccent: t.sobreAcento, accentUso: 'relleno', btn: t.acento, onBtn: t.sobreAcento, familia: 'Manual de servicios', origen: 'manual' };
}
