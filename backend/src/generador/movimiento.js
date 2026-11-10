// Slider de portada, movimiento sutil de fotos y microanimaciones (aprobado 6-nov-2026, doc claude/slider-portada.md).
// Reglas:
// - Foto 1: fija, eager + fetchpriority=high; solo acercamiento CSS (nunca video). El avance automático arranca después de load.
// - Foto 2 en adelante: clip diferido (generador/clips.js); si no existe todavía o la conexión es lenta, queda la foto con movimiento CSS.
// - Cada foto lleva texto encima (titular 3-8 palabras, apoyo, botón), solo con datos reales del brief.
// - Pausa visible (WCAG 2.2.2), pausa con mouse/foco, flechas, teclado, deslizar; prefers-reduced-motion apaga todo.
// - Solo se animan transform y opacity (sin costo de layout; Lighthouse móvil ≥ 90).
import { urlClip, tipoClip, encolarClips } from './clips.js';

// Clips de FFmpeg y Higgsfield en el slider: SUSPENDIDOS (6-nov-2026, Sebastián: las fotos "saltan").
// Todas las fotos usan solo movimiento CSS. Para reactivarlos: variable CLIPS_SLIDER=1 en el servicio api.
const CLIPS_SLIDER = process.env.CLIPS_SLIDER === '1';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const corto = (s, max) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t && t.length <= max ? t : ''; };
export const MAX_DIAPOSITIVAS = 5;

/*
 * Efectos en tendencia para imágenes y video (investigación nov-2026, doc claude/tendencias-efectos.md; se repasa cada mes).
 * Cada propuesta lleva una combinación distinta para dar variedad; el sitio final conserva la de la propuesta elegida.
 *  fx-zoom      transición del slider con acercamiento suave (transiciones fluidas tipo "match cut")
 *  fx-cortina   transición del slider como cortina lateral (revelado con máscara)
 *  fx-mascara   las fotos se revelan con una máscara de abajo hacia arriba al entrar en pantalla
 *  fx-foco      las fotos aparecen con un leve acercamiento y desvanecido
 *  fx-paralaje  profundidad: la foto se desplaza dentro de su marco al hacer scroll (CSS scroll-driven, solo escritorio)
 *  fx-grano     textura de grano de película muy sutil sobre el slider (tendencia de texturas táctiles)
 *  fx-color     fotos un poco apagadas que toman color al pasar el cursor (solo con mouse)
 *  fx-texto     el texto de cada foto del slider entra en secuencia (tipografía cinética)
 * Todos usan transform, opacity o clip-path; prefers-reduced-motion los apaga.
 */
// 6-nov-2026 (Sebastián): solo los efectos más aceptados — fundido con acercamiento entre fotos, Ken Burns notorio,
// aparición suave al bajar y acercamiento al pasar el cursor. Se retiraron cortina, grano y color (siguen en el CSS por si se reactivan).
const PRESETS_FX = [
  'fx-zoom fx-foco fx-hover',
  'fx-zoom fx-mascara fx-hover',
  'fx-zoom fx-paralaje fx-texto fx-hover',
  'fx-zoom fx-foco fx-texto fx-hover',
  'fx-zoom fx-paralaje fx-hover',
  'fx-zoom fx-mascara fx-texto fx-hover',
];
export const efectosDe = (letra) => PRESETS_FX[Math.max(0, 'ABCDEF'.indexOf(String(letra || 'A').toUpperCase())) % PRESETS_FX.length];
const ORDEN_TIPOS = ['diferenciador', 'oferta', 'prueba', 'vision'];

/**
 * Textos de las diapositivas 2-5. Usa los de Claude (textos.diapositivas) si son válidos; si faltan, los arma del brief
 * solo con datos cortos y reales (nunca recorta ni inventa: si el dato es largo, esa diapositiva se omite).
 */
export function diapositivasDe(textos = {}, brief = {}) {
  const deIA = (Array.isArray(textos.diapositivas) ? textos.diapositivas : [])
    .map((x) => ({ tipo: String(x?.tipo || ''), titular: corto(x?.titular, 60), apoyo: corto(x?.apoyo, 110), cta: corto(x?.cta, 24), foto_url: x?.foto_url || null }))
    .filter((x) => x.titular);
  if (deIA.length) return deIA.slice(0, MAX_DIAPOSITIVAS - 1);
  const of = brief.oferta || {}, conf = brief.confianza || {}, neg = brief.negocio || {};
  const out = [];
  const dif = corto(of.diferenciador, 60);
  if (dif) out.push({ tipo: 'diferenciador', titular: dif, apoyo: '' });
  const estrella = (of.items || []).find((i) => i.destacado) || null;
  const promo = corto(of.promocion_actual, 60);
  if (promo) out.push({ tipo: 'oferta', titular: promo, apoyo: '' });
  else if (estrella && corto(estrella.nombre, 60)) out.push({ tipo: 'oferta', titular: estrella.nombre.trim(), apoyo: corto(estrella.descripcion_corta, 110) });
  const cifra = corto((conf.cifras || [])[0], 60);
  const tes = (conf.testimonios || []).find((t) => corto(t?.texto, 90));
  if (cifra) out.push({ tipo: 'prueba', titular: cifra, apoyo: '' });
  else if (Number(neg.anios) > 0) out.push({ tipo: 'prueba', titular: `${Number(neg.anios)} años de experiencia`, apoyo: '' });
  else if (tes) out.push({ tipo: 'prueba', titular: `“${tes.texto.trim()}”`, apoyo: tes.nombre ? `— ${tes.nombre}` : '' });
  return out.sort((a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo)).slice(0, MAX_DIAPOSITIVAS - 1);
}

// ---------- Foto correcta para cada texto (6-nov-2026) ----------
// Caso Blanca Banderas: foto de maternidad con el texto de "Smash Cake". Cada texto de producto u oferta lleva la foto
// de ESE producto (la IA de textos elige la foto por su descripción: foto_url); los textos generales (años, visión,
// diferenciador) usan fotos que queden libres. Si un texto de producto no tiene foto que le corresponda, se omite.
const sinAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const VACIAS = new Set('para como desde sesion sesiones fotos fotografia fotografo fotografa paquete paquetes incluye incluido incluida tu tus con sin por una unos unas este esta todo toda mas muy tiene hace años anos experiencia historia historias'.split(' '));
const SINONIMOS = [['smash', 'pastel', 'cake', 'cumpleanos', 'anito'], ['newborn', 'recien', 'nacido', 'bebe'], ['maternidad', 'embarazada', 'embarazo', 'panza'],
  ['boda', 'bodas', 'novia', 'novios', 'nupcial'], ['xv', 'quince', 'quinceanera'], ['familia', 'familiar', 'familias'], ['pareja', 'parejas', 'novios'], ['bautizo', 'bautizos']];
const raiz = (w) => { const g = SINONIMOS.find((l) => l.includes(w)); return g ? g[0] : w.replace(/(es|s)$/, ''); };
const palabras = (t) => new Set(sinAcentos(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 || w === 'xv').filter((w) => !VACIAS.has(w)).map(raiz));
const coincide = (texto, foto) => { const a = palabras(texto), b = palabras(foto?.alt); let n = 0; for (const w of a) if (b.has(w)) n++; return n; };

/**
 * Ordena las fotos del slider para que cada texto tenga su foto.
 * @param {object} o  hero: foto 1 por omisión; fotoTitular: url que eligió la IA para el titular; pool: fotos disponibles; diapos: textos 2-5
 * @returns {{fotos: Array, diapos: Array}} alineados: diapos[k-1] va con fotos[k]
 */
export function emparejarFotos({ hero, fotoTitular = null, pool = [], diapos = [], items = [], cta = '' }) {
  const vistas = new Set();
  const todas = [hero, ...pool].filter((x) => x?.url && !vistas.has(x.url) && vistas.add(x.url));
  if (!todas.length) return { fotos: [], diapos: [] };
  const primera = (fotoTitular && todas.find((x) => x.url === fotoTitular)) || todas[0];
  const usadas = new Set([primera.url]);
  const libre = (x) => x && !usadas.has(x.url);
  const pedidas = new Set(diapos.map((d) => d.foto_url).filter(Boolean));
  const fotos = [primera], out = [];
  for (const d of diapos) {
    let f = d.foto_url ? todas.find((x) => x.url === d.foto_url && libre(x)) : null;
    const texto = `${d.titular} ${d.apoyo || ''}`;
    if (!f && !d.foto_url) {
      const mejor = todas.filter(libre).map((x) => [x, coincide(texto, x)]).sort((a, b) => b[1] - a[1])[0];
      if (mejor && mejor[1] > 0) f = mejor[0];
    }
    if (!f && d.tipo === 'oferta') continue; // producto sin su foto: mejor omitir que mostrar otro producto
    // texto general: una foto libre que no esté reservada para otro texto y que no muestre un producto mencionado en otra diapositiva
    if (!f) f = todas.find((x) => libre(x) && !pedidas.has(x.url) && !diapos.some((o) => o !== d && o.tipo === 'oferta' && coincide(`${o.titular} ${o.apoyo || ''}`, x) > 0));
    if (!f) continue;
    usadas.add(f.url); fotos.push(f); out.push(d);
  }
  // Slider completo (10-nov-2026, caso El Rincón del Mayab: 5 fotos disponibles y el slider solo mostraba 2 porque solo
  // había 1 texto). Las fotos buenas que sobran entran hasta MAX_DIAPOSITIVAS; cada una lleva el nombre (y descripción)
  // del producto o servicio del cliente que mejor coincide con la foto, tal cual lo escribió; si ninguno coincide, va sin texto.
  const libres = todas.filter(libre);
  for (const f of libres) {
    if (fotos.length >= MAX_DIAPOSITIVAS) break;
    const it = items.map((x) => [x, coincide(`${x?.nombre || ''} ${x?.descripcion_corta || x?.descripcion || ''}`, f)])
      .filter(([x, n]) => n > 0 && x?.nombre && !out.some((d) => d.titular === x.nombre.trim())).sort((a, b) => b[1] - a[1])[0]?.[0];
    usadas.add(f.url); fotos.push(f);
    out.push(it ? { tipo: 'producto', titular: corto(it.nombre.trim(), 60), apoyo: corto(it.descripcion_corta || '', 110), cta } : { tipo: 'foto', titular: '', apoyo: '', sin_texto: true });
  }
  return { fotos, diapos: out };
}

/**
 * HTML del slider. fotos[0] es la foto principal; diapos[k-1] es el texto de fotos[k].
 * @param {object} o
 * @param {Array}  o.fotos      [{url, alt, ancho, alto}]
 * @param {Array}  o.diapos     [{titular, apoyo, cta}]
 * @param {Function} o.img      img(x, {cls, eager, extra}) de la plantilla (registra la foto como usada)
 * @param {string} o.primera    HTML del texto de la foto 1 ('' si el texto va fuera del marco)
 * @param {string} o.cta        texto del botón por omisión
 * @param {string} o.href       atributos del enlace del botón (href, target)
 * @param {string} o.tag        etiqueta contenedora (section, figure, div)
 * @param {string} o.clase      clases del contenedor
 * @param {boolean} o.envolver  texto dentro de .wrap (portada a todo el ancho)
 * @param {string} o.nombre     nombre del negocio (aria-label)
 */
export function sliderHTML({ fotos = [], diapos = [], img, primera = '', cta = '', href = '', tag = 'div', clase = '', envolver = false, nombre = '' }) {
  const n = Math.min(fotos.length, 1 + diapos.length, MAX_DIAPOSITIVAS);
  const lista = fotos.slice(0, Math.max(n, 1));
  const clips = [];
  const caja = (html) => (envolver ? `<div class="wrap">${html}</div>` : html);
  const slides = lista.map((f, k) => {
    const tipo = CLIPS_SLIDER && n > 1 ? tipoClip(k) : null;
    if (tipo) clips.push({ url: f.url, tipo, ancho: f.ancho, alto: f.alto, k });
    const extra = `${k === 0 ? ' fetchpriority="high"' : ''}${tipo ? ` data-clip="${esc(urlClip(f.url, tipo))}"` : ''}`;
    const foto = img(f, { cls: `sl-img km km-${k % 4}`, eager: k === 0, extra });
    let txt = '';
    if (k === 0) txt = primera;
    else {
      const d = diapos[k - 1] || {};
      if (d.sin_texto || !d.titular) txt = '';
      // Sin botón dentro de las diapositivas (10-nov-2026, pedido de Sebastián): el botón de WhatsApp vive fuera del slider.
      else txt = `<p class="sl-t">${esc(d.titular)}</p>${d.apoyo ? `<p class="sl-a">${esc(d.apoyo)}</p>` : ''}`;
    }
    const attrs = n > 1 ? ` role="group" aria-roledescription="diapositiva" aria-label="${k + 1} de ${n}"${k ? ' inert aria-hidden="true"' : ''}` : '';
    return `<div class="sl-d${k === 0 ? ' activa' : ''}${txt ? ' con-txt' : ''}"${attrs}>${foto}${txt ? `<div class="sl-cap">${caja(txt)}</div>` : ''}</div>`;
  }).join('');
  const ctrl = n > 1 ? `<div class="sl-ctrl"><button type="button" class="sl-b sl-pausa" aria-label="Pausar fotos" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pausa" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/><path class="i-play" d="M8 5l11 7-11 7z"/></svg></button><button type="button" class="sl-b sl-prev" aria-label="Foto anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button><span class="sl-pos">1 / ${n}</span><button type="button" class="sl-b sl-sig" aria-label="Foto siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button></div>` : '';
  if (clips.length) encolarClips(clips);
  const reg = n > 1 ? ` data-sl role="region" aria-roledescription="carrusel" aria-label="${esc(nombre ? `Fotos de ${nombre}` : 'Fotos')}"` : '';
  return { html: `<${tag} class="${clase} sl"${reg}>${slides}${ctrl}</${tag}>`, n, usadas: lista.map((f) => f.url) };
}

/**
 * Fotos del cliente en el tamaño justo (7-nov-2026, Lighthouse móvil ≥ 90): a cada <img> de /chat/archivos/ se le agrega
 * srcset con versiones de 480, 800, 1200 y 1600 px en WebP (las genera y guarda /chat/archivos/:nombre?w=).
 * El celular baja ~800-1200 px en vez del original. Se aplica al HTML final, después de validar el material.
 */
export function conSrcset(html) {
  return String(html).replace(/<img\b([^>]*?)\ssrc="([^"]+\/chat\/archivos\/[\w-]+\.(?:jpe?g|png|webp))"([^>]*)>/g, (m, a, src, b) => {
    // si ya trae un srcset nuestro (p. ej. el editor cambió la foto de un bloque), se rehace con la foto actual
    const limpia = (t) => t.replace(/\ssrcset="[^"]*\/chat\/archivos\/[^"]*"/g, '').replace(/\ssizes="(?:100vw|\(min-width: 900px\) 50vw, 100vw)"/g, '');
    a = limpia(a); b = limpia(b);
    const attrs = a + b;
    if (/\ssrcset=/.test(attrs) || /class="[^"]*\blogo/.test(attrs)) return `<img${a} src="${src}"${b}>`;
    const set = [480, 800, 1200, 1600].map((w) => `${src}?w=${w} ${w}w`).join(', ');
    const sizes = /\ssizes=/.test(attrs) ? '' : ` sizes="${/\bsl-img\b/.test(attrs) ? '100vw' : '(min-width: 900px) 50vw, 100vw'}"`;
    return `<img${a} src="${src}" srcset="${set}"${sizes}${b}>`;
  });
}


/**
 * Fila justificada de fotos (10-nov-2026, caso El Rincón del Mayab): reemplaza la "tira" que se salía de la columna
 * (empezaba pegada al borde de la pantalla y dejaba hueco a la derecha). Cada foto crece en proporción a su ancho/alto,
 * así todas las de una fila quedan a la misma altura, alineadas con la columna del sitio, sin recortar ni deformar.
 */
export function filaJustificada(fotos = [], img, { clase = '' } = {}) {
  if (!fotos.length) return '';
  const r = (x) => (x.ancho && x.alto ? Math.min(2.4, Math.max(0.3, x.ancho / x.alto)) : 0.75).toFixed(3);
  // Una sola fila (las fotos caben a ~300 px de alto en 1100 px): se estira a todo el ancho. Con varias filas, la última
  // no se estira de más (relleno invisible al final).
  const varias = fotos.reduce((a, x) => a + Number(r(x)), 0) * 300 > 1320;
  return `<div class="just${varias ? ' varias' : ''}${clase ? ` ${clase}` : ''}">${fotos.map((x) => `<figure style="--r:${r(x)}">${img(x)}</figure>`).join('')}</div>`;
}
export const CSS_JUSTIFICADA = `.just{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.just.varias::after{content:"";flex:999 1 0}.just figure{margin:0;flex:var(--r) 1 calc(var(--r) * 240px);min-width:0}.just img{display:block;width:100%;height:auto;border-radius:8px}
@media (min-width:900px){.just figure{flex-basis:calc(var(--r) * 300px)}}`;

export const CSS_MOVIMIENTO = `
/* slider de portada (generador/movimiento.js) */
.sl{position:relative;overflow:hidden;isolation:isolate}
.sl-d{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity 1.1s ease,visibility 0s linear 1.1s}
.sl-d.activa{opacity:1;visibility:visible;z-index:1;transition:opacity 1.1s ease,visibility 0s}
/* Hasta el evento load solo existe la foto 1: las demás no se descargan ni compiten con la carga (LCP). */
.sl[data-sl]:not(.vivo) .sl-d:not(.activa){display:none}
.sl-d>img,.sl-d>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.sl-d>video{opacity:0;transition:opacity .9s ease}.sl-d>video.listo{opacity:1}
.sl-d.con-txt::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,0) 22%,rgba(0,0,0,.42) 52%,rgba(0,0,0,.78))}
.sl-cap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:22px 20px 76px;color:#fff}
.sl-t{font-family:var(--ft);font-size:clamp(26px,6vw,50px);line-height:1.06;letter-spacing:-.015em;max-width:18ch;text-wrap:balance;text-shadow:0 1px 18px rgba(0,0,0,.35)}
.sl-a{color:rgba(255,255,255,.92);margin-top:10px;max-width:42ch;font-size:clamp(15px,3.8vw,19px);text-shadow:0 1px 12px rgba(0,0,0,.4)}
.sl-btn{margin-top:16px;background:#fff;color:#1A1714}
/* controles del slider 30% más chicos (10-nov-2026) */.sl-ctrl{position:absolute;z-index:3;left:50%;bottom:10px;transform:translateX(-50%);display:flex;align-items:center;gap:1px;background:rgba(0,0,0,.62);border-radius:999px;padding:2px;color:#fff}
.sl-b{width:31px;height:31px;border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;padding:0}
.sl-b svg{width:14px;height:14px;fill:currentColor}.sl-b:focus-visible{outline:3px solid #fff;outline-offset:-3px}
.sl-pausa .i-play{display:none}.sl.pausado .sl-pausa .i-play{display:inline}.sl.pausado .sl-pausa .i-pausa{display:none}
.sl-pos{font:700 10px/1 var(--fc);min-width:3.4em;text-align:center;font-variant-numeric:tabular-nums}
.sl-marco .sl-cap{padding:18px 16px 70px}.sl-marco .sl-t{font-size:clamp(22px,5vw,32px)}.sl-marco .sl-a{font-size:15px}.sl-marco .sl-btn{padding:11px 18px;min-height:44px;font-size:15px}
.ovalo.sl-marco .sl-cap{text-align:center;padding:0 16% 22%}.ovalo.sl-marco .sl-t,.ovalo.sl-marco .sl-a{margin-left:auto;margin-right:auto}.ovalo.sl-marco .sl-ctrl{bottom:6%}
.sl-carta{aspect-ratio:4/5;border-radius:8px;margin-bottom:12px}
@media (min-width:900px){.sl-carta{aspect-ratio:16/8}.sl-cap{padding-bottom:84px}}
/* movimiento de cámara: acercamientos distintos por foto */
/* Ken Burns (6-nov-2026, mejores prácticas Baymard/Smashing/43frames): la foto cambia cada 6 s y hace UN solo
   movimiento de 6.5 s (de ida, sin regresar), acercamiento 100 % → 112 % con paneo leve, aceleración y frenado suaves.
   Un movimiento distinto por foto. Con una sola foto (sin slider) el movimiento va y viene. */
@keyframes km0{from{transform:scale(1)}to{transform:scale(1.12) translate3d(-2%,-1.4%,0)}}
@keyframes km1{from{transform:scale(1.12) translate3d(2%,.8%,0)}to{transform:scale(1.01)}}
@keyframes km2{from{transform:scale(1.01) translate3d(-1.8%,1.4%,0)}to{transform:scale(1.12) translate3d(1.8%,-1%,0)}}
@keyframes km3{from{transform:scale(1.11) translate3d(0,-1.8%,0)}to{transform:scale(1) translate3d(0,1%,0)}}
.km{animation:km0 6.5s cubic-bezier(.45,0,.55,1) both;animation-play-state:paused;transform-origin:50% 50%}
.sl:not([data-sl]) .km{animation-duration:9s;animation-iteration-count:infinite;animation-direction:alternate}
/* foto entera: si la proporción no cabe en el marco, se muestra completa sobre un fondo difuminado de la misma foto */
/* fondo en canvas diminuto (no cuenta para LCP ni pesa) */
.sl.carrusel .sl-d{opacity:1;visibility:visible;background:none;z-index:2;pointer-events:none}.sl.carrusel .sl-d>img.sl-img,.sl.carrusel .sl-d>canvas.sl-fondo,.sl.carrusel .sl-d>video{display:none}.sl.carrusel .sl-cap{pointer-events:auto}
.sl.carrusel .sl-prev,.sl.carrusel .sl-sig,.sl.carrusel .sl-pos{display:none}.sl.carrusel .sl-ctrl{z-index:3}
.sl-car{position:absolute;inset:0;overflow:hidden;z-index:1}
.sl-car::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.66) 0%,rgba(0,0,0,.5) 45%,rgba(0,0,0,.18) 80%,rgba(0,0,0,.08)),linear-gradient(0deg,rgba(0,0,0,.45),rgba(0,0,0,0) 55%)}
.sl.carrusel .sl-cap{text-shadow:0 1px 3px rgba(0,0,0,.55)}.sl-pista{display:flex;gap:10px;height:100%;width:max-content;animation:sl-corre 60s linear infinite;will-change:transform}
.sl-ci{height:100%;width:auto;max-width:none;flex:0 0 auto;object-fit:cover;display:block}
.sl.carrusel:hover .sl-pista,.sl.carrusel.quieto .sl-pista{animation-play-state:paused}
@keyframes sl-corre{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(-50% - 5px),0,0)}}
@media (prefers-reduced-motion:reduce){.sl-pista{animation:none}.sl-car{overflow-x:auto}}
.sl-d>canvas.sl-fondo{position:absolute;inset:0;width:100%;height:100%;filter:blur(18px) brightness(.7);transform:scale(1.2)}
.sl-d.entera>img.sl-img{object-fit:contain}
.sl-d.entera .km{animation-name:kme}
@keyframes kme{from{transform:scale(1)}to{transform:scale(1.05)}}
.km-1{animation-name:km1}.km-2{animation-name:km2}.km-3{animation-name:km3}
.sl-d.activa .km,.sl:not([data-sl]) .km{animation-play-state:running}.sl.pausado .km{animation-play-state:paused}
/* todo el sitio: fotos con movimiento muy lento mientras están en pantalla */
@keyframes mv{from{transform:scale(1)}to{transform:scale(1.08) translate3d(0,-1.5%,0)}}
.mv{animation:mv 11s ease-in-out infinite alternate;animation-play-state:paused}.mv.en{animation-play-state:running}
/* aparición suave al hacer scroll y reacción leve al cursor */
/* 7-nov-2026: escalonado y cascada — dentro de cada sección, título, frase, botón y tarjetas entran uno tras otro (0.12 s).
   Se usa la propiedad translate (no transform) para no chocar con la elevación al pasar el cursor. */
.rv .ri{opacity:0;translate:0 18px;transition:opacity .7s ease calc(var(--i,0)*.12s),translate .8s cubic-bezier(.2,.7,.2,1) calc(var(--i,0)*.12s)}
.rv.en .ri{opacity:1;translate:none}
/* revelado por líneas en títulos h2: cada línea sube desde abajo detrás de una máscara */
.ln{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.14em;margin-bottom:-.14em}
.ln>span{display:inline-block;transform:translate3d(0,110%,0);transition:transform .9s cubic-bezier(.2,.7,.2,1) calc(var(--l,0)*.12s)}
.rv.en .ln>span{transform:none}
.cifras li,.cifra{font-variant-numeric:tabular-nums}
@media (hover:hover){.btn{transition:transform .25s ease,box-shadow .25s ease}.btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.16)}
.paq,blockquote,.wa{transition:transform .35s ease,box-shadow .35s ease}.paq:hover,blockquote:hover{transform:translateY(-3px);box-shadow:0 10px 26px rgba(0,0,0,.08)}.wa:hover{transform:scale(1.05)}}
/* efectos en tendencia por propuesta (efectosDe) */
.fx-zoom .sl-d{transform:scale(1.06);transition:opacity 1.1s ease,transform 1.8s cubic-bezier(.2,.7,.2,1),visibility 0s linear 1.1s}
.fx-zoom .sl-d.activa{transform:none;transition:opacity 1.1s ease,transform 1.8s cubic-bezier(.2,.7,.2,1),visibility 0s}
.fx-cortina .sl-d{opacity:1;clip-path:inset(0 100% 0 0);transition:clip-path 0s linear 1.2s,visibility 0s linear 1.2s}
.fx-cortina .sl-d.activa{clip-path:inset(0 0 0 0);transition:clip-path 1.2s cubic-bezier(.77,0,.18,1),visibility 0s}
.fx-mascara .rvf{clip-path:inset(0 0 100% 0);transition:clip-path 1.2s cubic-bezier(.77,0,.18,1)}.fx-mascara .rvf.en{clip-path:inset(0 0 0 0)}
.fx-foco .rvf{opacity:0;transform:scale(.96);transition:opacity 1s ease,transform 1.2s cubic-bezier(.2,.7,.2,1)}.fx-foco .rvf.en{opacity:1;transform:none}
@supports (animation-timeline:view()){@media (min-width:900px) and (prefers-reduced-motion:no-preference){.fx-paralaje main img.mv{animation:mvp linear both;animation-timeline:view();animation-range:cover}}}
@keyframes mvp{from{transform:scale(1.12) translate3d(0,-4%,0)}to{transform:scale(1.12) translate3d(0,4%,0)}}
.fx-grano .sl::before{content:"";position:absolute;inset:-50%;z-index:2;pointer-events:none;opacity:.08;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");animation:grano 1.2s steps(5) infinite}
@keyframes grano{0%{transform:translate3d(0,0,0)}20%{transform:translate3d(-3%,2%,0)}40%{transform:translate3d(2%,-3%,0)}60%{transform:translate3d(-2%,-1%,0)}80%{transform:translate3d(3%,3%,0)}100%{transform:translate3d(0,0,0)}}
@media (hover:hover){.fx-color main figure:not(.sl) img{filter:saturate(.72);transition:filter .6s ease}.fx-color main figure:not(.sl):hover img{filter:none}}
@media (hover:hover){.fx-hover main img.mv{transition:scale .6s cubic-bezier(.2,.7,.2,1)}.fx-hover main :is(figure,div):hover>img.mv{scale:1.09}}
@keyframes subir{from{opacity:0;transform:translate3d(0,18px,0)}to{opacity:1;transform:none}}
.fx-texto .sl-d.activa:not(:first-child) .sl-cap .sl-t,.fx-texto .sl-d.activa:not(:first-child) .sl-cap .sl-a,.fx-texto .sl-d.activa:not(:first-child) .sl-cap .sl-btn{animation:subir .9s cubic-bezier(.2,.7,.2,1) both}
.fx-texto .sl-d.activa .sl-a{animation-delay:.12s!important}.fx-texto .sl-d.activa .sl-btn{animation-delay:.24s!important}
@media (prefers-reduced-motion:reduce){.fx-zoom .sl-d,.fx-cortina .sl-d{transform:none!important;clip-path:none!important;transition:none!important}.fx-mascara .rvf,.fx-foco .rvf{clip-path:none!important;opacity:1!important;transform:none!important}.fx-grano .sl::before,.fx-texto .sl-cap *{animation:none!important}}
@media (prefers-reduced-motion:reduce){.km,.mv{animation:none!important}.rv .ri{opacity:1!important;translate:none!important;transition:none!important}.ln>span{transform:none!important;transition:none!important}.sl-d,.sl-d>video{transition:none}.btn,.paq,blockquote,.wa{transition:none!important;transform:none!important}}
`;

// JS en línea (≈2.5 KB). Corre al final del body; no bloquea el pintado de la primera foto.
export const JS_MOVIMIENTO = `<script>(()=>{
const R=matchMedia('(prefers-reduced-motion: reduce)').matches;
const lenta=()=>{const c=navigator.connection;return !!c&&(c.saveData||/(^|-)(2g|3g)$/.test(c.effectiveType||''))};
const io=(cb,o)=>'IntersectionObserver' in window?new IntersectionObserver(cb,o):null;
let cargada=document.readyState==='complete';const listos=[];
addEventListener('load',()=>{cargada=true;listos.forEach(f=>f())},{once:true});
const alCargar=f=>cargada?f():listos.push(f);
document.querySelectorAll('.sl').forEach(sl=>{const ds=[...sl.querySelectorAll('.sl-d')];
const enteras=()=>ds.forEach(d=>{const im=d.querySelector('img.sl-img'),w=+im.getAttribute('width'),h=+im.getAttribute('height');if(!w||!h||!sl.clientWidth)return;
const r=(w/h)/(sl.clientWidth/sl.clientHeight),ent=r>1.25||r<.8;d.classList.toggle('entera',ent);
if(ent&&!d.querySelector('.sl-fondo')){const c=document.createElement('canvas');c.className='sl-fondo';c.width=24;c.height=Math.max(8,Math.round(24*h/w));c.setAttribute('aria-hidden','true');im.before(c);const pinta=()=>{try{c.getContext('2d').drawImage(im,0,0,c.width,c.height)}catch(e){}};im.complete&&im.naturalWidth?pinta():im.addEventListener('load',pinta,{once:true})}});
enteras();addEventListener('resize',enteras,{passive:true});
/* Carrusel (10-nov-2026): si NINGUNA foto llena el ancho del slider (todas verticales con relleno desenfocado a los
   lados), las fotos van una al lado de la otra y corren de derecha a izquierda a ritmo suave, en bucle continuo.
   Queda fijo el texto de la primera diapositiva. Se detiene con el botón de pausa, al pasar el mouse y con
   "reducir movimiento" (ahí se puede deslizar a mano). */
const rs=ds.map(d=>{const im=d.querySelector('img.sl-img'),w=+im.getAttribute('width'),h=+im.getAttribute('height');return w&&h&&sl.clientWidth?(w/h)/(sl.clientWidth/sl.clientHeight):1});
if(ds.length>1&&rs.every(r=>r<.8)){sl.classList.add('carrusel');sl.removeAttribute('data-sl');
const car=document.createElement('div');car.className='sl-car';car.setAttribute('aria-hidden','true');const pista=document.createElement('div');pista.className='sl-pista';car.append(pista);
const ims=ds.map(d=>d.querySelector('img.sl-img'));for(let v=0;v<2;v++)ims.forEach(im=>{const c=im.cloneNode(true);c.className='sl-ci';c.removeAttribute('fetchpriority');c.loading='eager';pista.append(c)});
sl.prepend(car);ds.forEach((d,k)=>{if(k){d.remove()}else{d.classList.add('activa');d.inert=false;d.removeAttribute('aria-hidden')}});
const vel=()=>{const w=pista.scrollWidth/2;if(w)pista.style.animationDuration=Math.max(18,w/45)+'s'};vel();addEventListener('load',vel,{once:true});addEventListener('resize',vel,{passive:true});
const bp=sl.querySelector('.sl-pausa');if(bp)bp.addEventListener('click',()=>{const p=!sl.classList.contains('quieto');sl.classList.toggle('quieto',p);bp.setAttribute('aria-pressed',p);bp.setAttribute('aria-label',p?'Reanudar fotos':'Pausar fotos')})}
});
document.querySelectorAll('[data-sl]').forEach(sl=>{
const ds=[...sl.querySelectorAll('.sl-d')];if(ds.length<2)return;
const pos=sl.querySelector('.sl-pos'),bp=sl.querySelector('.sl-pausa');

let i=0,t=null,usuario=R,encima=false;
const clip=d=>{const im=d&&d.querySelector('img[data-clip]');if(!im||im.dataset.c||R||lenta())return;im.dataset.c=1;
const v=document.createElement('video');v.muted=v.defaultMuted=true;v.playsInline=true;v.loop=true;v.preload='auto';v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');
v.addEventListener('loadeddata',()=>{v.classList.add('listo');if(d.classList.contains('activa')&&!parado())v.play().catch(()=>{})},{once:true});
v.addEventListener('error',()=>v.remove(),{once:true});v.src=im.dataset.clip;im.after(v)};
const parado=()=>usuario||encima;
const vids=()=>ds.forEach((d,k)=>{const v=d.querySelector('video.listo');if(!v)return;if(k===i&&!parado())v.play().catch(()=>{});else v.pause()});
const ir=k=>{sl.classList.add('vivo');const a=ds[i];a.classList.remove('activa');a.inert=true;a.setAttribute('aria-hidden','true');
i=(k+ds.length)%ds.length;const d=ds[i];d.inert=false;d.removeAttribute('aria-hidden');
const im=d.querySelector('.km');if(im){im.style.animation='none';void im.offsetWidth;im.style.animation=''}
d.classList.add('activa');pos.textContent=(i+1)+' / '+ds.length;vids();clip(ds[(i+1)%ds.length])};
const prog=()=>{clearTimeout(t);if(!parado())t=setTimeout(()=>{ir(i+1);prog()},6000)};
const estado=()=>{sl.classList.toggle('pausado',parado());bp.setAttribute('aria-pressed',String(usuario));bp.setAttribute('aria-label',usuario?'Reproducir fotos':'Pausar fotos');pos.setAttribute('aria-live',parado()?'polite':'off');vids();prog()};
bp.addEventListener('click',()=>{usuario=!usuario;estado()});
sl.querySelector('.sl-prev').addEventListener('click',()=>{ir(i-1);prog()});
sl.querySelector('.sl-sig').addEventListener('click',()=>{ir(i+1);prog()});
sl.addEventListener('focusin',e=>{if(e.target.matches(':focus-visible')){encima=true;estado()}});sl.addEventListener('focusout',e=>{if(!sl.contains(e.relatedTarget)){encima=false;estado()}});
sl.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){ir(i+1);prog()}else if(e.key==='ArrowLeft'){ir(i-1);prog()}});
let x0=null;sl.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
sl.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40){ir(i+(dx<0?1:-1));prog()}},{passive:true});
sl.classList.toggle('pausado',parado());if(R){bp.setAttribute('aria-pressed','true');bp.setAttribute('aria-label','Reproducir fotos')}
alCargar(()=>{sl.classList.add('vivo');setTimeout(()=>clip(ds[1]),1200);if(!parado())t=setTimeout(()=>{ir(1);prog()},6000)});
});
if(R)return;
/* lo que no se ve al abrir (revelados, líneas de títulos, contadores, movimiento de fotos) se prepara cuando la página ya cargó y el navegador está libre: no retrasa la portada */
const ocioso=f=>'requestIdleCallback' in window?requestIdleCallback(f,{timeout:1000}):setTimeout(f,200);
alCargar(()=>ocioso(()=>{
const vis=io(es=>es.forEach(e=>e.target.classList.toggle('en',e.isIntersecting)),{rootMargin:'60px'});
/* contadores: la cifra sube de 0 a su valor y al final queda exactamente el texto del cliente */
const cuenta=li=>{const tn=[...li.childNodes].find(n=>n.nodeType===3&&/\\d/.test(n.nodeValue));if(!tn)return;const orig=tn.nodeValue,m=orig.match(/\\d[\\d,.]*/);
const fin=parseFloat(m[0].replace(/,/g,''));if(!(fin>1)||fin>1e6||(/^(19|20)\\d\\d$/.test(m[0])))return;
li.style.minWidth=li.offsetWidth+'px';const ini=performance.now(),d=1400,fmt=n=>Math.round(n).toLocaleString('es-MX');
const paso=t=>{const p=Math.min(1,(t-ini)/d),e=1-Math.pow(1-p,3);tn.nodeValue=orig.replace(m[0],fmt(fin*e));if(p<1)requestAnimationFrame(paso);else{tn.nodeValue=orig;li.style.minWidth=''}};
tn.nodeValue=orig.replace(m[0],'0');requestAnimationFrame(paso)};
const ap=io((es,o)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('en');o.unobserve(e.target);e.target.querySelectorAll('.cifras li,.cifra').forEach(cuenta)}}),{rootMargin:'0px 0px -8% 0px'});
/* títulos h2 de texto simple: se parten en palabras y se agrupan por línea (--l) */
const lineas=(h,base)=>{if(h.children.length||!h.textContent.trim())return false;const ws=h.textContent.trim().split(/\\s+/);h.textContent='';
ws.forEach((w,k)=>{const a=document.createElement('span'),b=document.createElement('span');a.className='ln';b.textContent=w;a.appendChild(b);h.appendChild(a);if(k<ws.length-1)h.appendChild(document.createTextNode(' '))});
let top=null,l=base-1;h.querySelectorAll('.ln').forEach(a=>{if(a.offsetTop!==top){top=a.offsetTop;l++}a.firstChild.style.setProperty('--l',l)});return l-base+1};
document.querySelectorAll('main img').forEach(im=>{const p=im.parentElement;
if(!vis||im.closest('.sl,.cap,.catimg,.carr,.circulo')||/logo/.test(im.className)||p.querySelectorAll('img').length!==1)return;
const r=getComputedStyle(im).borderRadius;p.style.overflow='hidden';if(r&&r!=='0px')p.style.borderRadius=r;im.classList.add('mv');vis.observe(im);
if(ap&&/fx-(mascara|foco)/.test(document.documentElement.className)&&p.getBoundingClientRect().top>innerHeight*.85){p.classList.add('rvf');ap.observe(p)}});
if(ap)document.querySelectorAll('main>section:not(.hero):not(.promo),main>div:not(.tira):not(.wrap)').forEach(el=>{if(el.getBoundingClientRect().top<=innerHeight)return;
el.classList.add('rv');let i=0;
el.querySelectorAll('h2,h3,p,.btn,.paq,blockquote,details,figure,.cifras li,li.serv,.tarjeta,.card,.item').forEach(x=>{if(x.closest('.ri,.sl,.ln')||x.parentElement.closest('.ri'))return;
if(x.tagName==='H2'){const n=lineas(x,Math.min(i,10));if(n){i+=n;return}}x.classList.add('ri');x.style.setProperty('--i',Math.min(i,10));i++});
ap.observe(el)});
}));
})();</script>`;
