// Opción Q "Vitrina editorial" (14-nov-2026, pedido de Sebastián a partir de www.dvf.com, tienda de moda en Shopify;
// se tomó la lógica de diseño —portada a pantalla completa con fundido entre fotos, tarjetas de producto que rotan sus
// fotos, filas de colecciones con carrusel— no el contenido ni la marca).
// Qué la distingue de la O (catálogo):
// - Portada: fundido cruzado entre las fotos del cliente (no un carrusel que se desliza), con barritas de avance.
// - "Nuestro trabajo": tarjetas verticales y cada una rota 2 a 4 fotos del cliente, escalonadas para que no cambien a la vez.
//   Es lo que la referencia hace con videos cortos; aquí se hace con fotos.
// - Servicios como "colecciones": cada grupo es una fila con su título grande y sus paquetes en un carrusel.
// - Banda partida (frase + foto con zoom al hacer scroll) y cierre tipográfico con el nombre del negocio.
// Técnica (medida en la referencia el 14-nov-2026): CSS nativo —keyframes de opacity y transform, scroll-snap, view() para el
// zoom— y un script mínimo (pausa y flechas). No usa GSAP, Lenis, Swiper, Flickity ni jQuery, ni video.
// Reglas:
// - Solo fotos del cliente. Solo opacity y transform en lo que se anima. El fundido funciona aunque no cargue el script.
// - Con "reducir movimiento": nada se anima, se ve la primera foto de cada tarjeta y la portada queda en la primera foto.
// - Botón de pausa visible (con script) para quien no quiera movimiento; al pasar el mouse sobre una tarjeta, esa se detiene.
// - Las fotos de la portada y las tarjetas llevan rep-ok: "Nuestro trabajo" siempre lleva todas las fotos de trabajo.
import { METRICAS } from './tipo_color.js';
import { COMUNES as COMUNES_TITULOS } from './fuentes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r3 = (x) => Math.round(x * 1000) / 1000;

export const MAX_SLIDES_VQ = 5;
/** Segundos que se ve cada foto de la portada y lo que dura el fundido. */
export const T_PORTADA = 6, FADE_PORTADA = 1.2;
/** Lo mismo para las tarjetas de "Nuestro trabajo". */
export const T_TARJETA = 3.4, FADE_TARJETA = 0.9;
export const MAX_FOTOS_TARJETA = 4;

/** Titulares con remates y de trazo fino (look de revista de moda); cuerpo en grotesca. */
export const SERIFAS_Q = ['Bodoni Moda', 'Cormorant Garamond', 'Instrument Serif'];
export const CUERPOS_Q = ['Albert Sans', 'Hanken Grotesk', 'Instrument Sans', 'Schibsted Grotesk'];

/** Letra de la Q: serif para titulares y grotesca para texto; las del estilo del cliente si son aptas, si no las primeras. */
export function parVitrina(pares = []) {
  const ok = (f, lista, peso) => lista.includes(f) && METRICAS[f]?.pesos?.includes(peso) && !COMUNES_TITULOS.has(String(f).toLowerCase());
  const titulos = pares.map((p) => p.titulos).find((f) => ok(f, SERIFAS_Q, 400)) || SERIFAS_Q.find((f) => ok(f, SERIFAS_Q, 400)) || SERIFAS_Q[0];
  const cuerpo = pares.map((p) => p.cuerpo).find((f) => ok(f, CUERPOS_Q, 500)) || CUERPOS_Q.find((f) => ok(f, CUERPOS_Q, 500)) || CUERPOS_Q[0];
  return { titulos, cuerpo, estilo: pares[0]?.estilo || 'elegante' };
}

const dos = (n) => String(n).padStart(2, '0');

/** Fotogramas de un fundido cruzado de n fotos (cada una visible 1/n del ciclo, con fundido de entrada y de salida). */
const nomFundido = (n, t) => `vq-o${n}-${String(t).replace('.', '_')}`;
function fotogramasFundido(n, t, fade) {
  const ciclo = n * t, v = 100 / n, f = (fade / ciclo) * 100;
  return `@keyframes ${nomFundido(n, t)}{0%{opacity:0}${r3(f)}%{opacity:1}${r3(v)}%{opacity:1}${r3(v + f)}%{opacity:0}100%{opacity:0}}`;
}

/** Retraso negativo para que la foto k ya esté en su turno al cargar (la 0 visible de inmediato). */
const retraso = (k, n, t, fade, extra = 0) => r3((n - k) * t + fade + extra);

/**
 * Portada de la opción Q: fotos del cliente a pantalla completa con fundido cruzado, su titular y barritas de avance.
 * heroFoto: foto principal (lleva el único h1). pasos: [{foto, titular, apoyo}] (hasta 4 más).
 * El botón es uno solo y no cambia con las fotos. → {html, urls}
 */
export function portadaVitrinaHTML({ heroFoto = null, pasos = [], img, kicker = '', titular = '', subtitulo = '', cta = '', ctaSec = '' }) {
  const vistas = new Set(heroFoto ? [heroFoto.url] : []);
  const ps = pasos.filter((x) => x?.foto?.url && !vistas.has(x.foto.url) && vistas.add(x.foto.url)).slice(0, MAX_SLIDES_VQ - 1);
  const n = ps.length + 1;
  const T = T_PORTADA, F = FADE_PORTADA;
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 46 ? ' h1-m' : '';
  const sty = (k) => (n > 1 ? ` style="animation-delay:-${retraso(k, n, T, F)}s"` : '');
  const aria = (k) => `aria-roledescription="diapositiva" aria-label="${k + 1} de ${n}"`;
  const principal = `<article class="vq-sl" ${aria(0)}${sty(0)}>${heroFoto ? `<figure class="vq-fig">${img(heroFoto, { cls: 'rep-ok', eager: true, extra: `${sty(0)} fetchpriority="high"`, sizes: ' sizes="100vw"' })}</figure>` : ''}<div class="wrap vq-tx">${kicker ? `<p class="vq-kick">${esc(kicker)}</p>` : ''}<h1 class="vq-h${clase}">${esc(titular)}</h1>${subtitulo ? `<p class="vq-sub">${esc(subtitulo)}</p>` : ''}</div></article>`;
  const resto = ps.map((x, j) => {
    const k = j + 1;
    return `<article class="vq-sl" ${aria(k)}${sty(k)}><figure class="vq-fig">${img(x.foto, { cls: 'rep-ok', extra: `${sty(k)}`, sizes: ' sizes="100vw"' })}</figure><div class="wrap vq-tx">${x.titular ? `<p class="vq-h vq-h2">${esc(x.titular)}</p>` : ''}${x.apoyo ? `<p class="vq-sub">${esc(x.apoyo)}</p>` : ''}</div></article>`;
  }).join('');
  const ciclo = n * T;
  const movimiento = n > 1
    ? `<style>@media (prefers-reduced-motion:no-preference){.vq-st .vq-sl{animation:${nomFundido(n, T)} ${ciclo}s linear infinite both}.vq-st .vq-fig img{animation:vq-z${n} ${ciclo}s linear infinite both}.vq-dots li::after{animation:vq-d${n} ${ciclo}s linear infinite both}${fotogramasFundido(n, T, F)}@keyframes vq-z${n}{0%{transform:scale(1)}${r3(100 / n + (F / ciclo) * 100)}%{transform:scale(1.08)}100%{transform:scale(1.08)}}@keyframes vq-d${n}{0%{transform:scaleX(0)}${r3(100 / n)}%{transform:scaleX(1)}${r3(100 / n + 0.01)}%{transform:scaleX(0)}100%{transform:scaleX(0)}}}</style>`
    : '';
  const dots = n > 1 ? `<ol class="vq-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<li${sty(k)}></li>`).join('')}</ol><button type="button" class="vq-pausa" aria-label="Pausar el movimiento" aria-pressed="false">&#10074;&#10074;</button>` : '';
  const html = `<section class="hero h-vit${heroFoto ? '' : ' sin-foto'}" id="inicio" aria-roledescription="carrusel" aria-label="${esc(titular || 'Destacados')}">${movimiento}<div class="vq-st">${principal}${resto}</div><div class="vq-pie"><div class="wrap vq-pie-in"><div class="vq-bots">${cta || ''}${ctaSec || ''}</div>${dots ? `<div class="vq-ctl">${dots}</div>` : ''}</div></div></section>`;
  return { html, urls: [heroFoto?.url, ...ps.map((x) => x.foto.url)].filter(Boolean) };
}

/**
 * Reparte las fotos de trabajo en tarjetas: entre 3 y 8 tarjetas, cada una con 1 a 4 fotos (reparto por turnos para que
 * las fotos de una misma tarjeta no sean consecutivas). Con pocas fotos, tarjetas de una sola foto (quietas).
 */
export function repartirTarjetas(fotos = []) {
  const n = fotos.length;
  if (!n) return [];
  // Con menos de 4 fotos, una tarjeta por foto. Con más: entre 3 y 8 tarjetas (más si hace falta para no pasar de 4 fotos por tarjeta).
  const c = n < 4 ? n : Math.max(Math.ceil(n / MAX_FOTOS_TARJETA), Math.min(8, Math.max(3, Math.ceil(n / 3))));
  const tarjetas = Array.from({ length: c }, () => []);
  fotos.forEach((x, i) => tarjetas[i % c].push(x));
  return tarjetas.filter((t) => t.length);
}

/**
 * "Nuestro trabajo" como estante de tarjetas verticales; cada tarjeta rota sus fotos con fundido (CSS, sin video).
 * fotos: todas las de trabajo. info(x) → atributos href/target del "+ info" por WhatsApp de esa foto.
 */
export function vitrinaTrabajoHTML({ fotos = [], titulo = '', img, info = () => '' }) {
  const tarjetas = repartirTarjetas(fotos);
  if (!tarjetas.length) return '';
  const cartas = tarjetas.map((fs, i) => {
    const m = fs.length;
    const desfase = (i % 4) * 0.85;
    const pila = fs.map((x, j) => `<figure class="vq-f"${m > 1 ? ` style="animation-delay:-${retraso(j, m, T_TARJETA, FADE_TARJETA, desfase)}s"` : ''}>${img(x, { cls: 'rep-ok', extra: ' sizes="(min-width:900px) 27vw,78vw"' })}</figure>`).join('');
    const nombre = fs[0].nombre || '';
    return `<article class="vq-card"><div class="vq-pila" data-m="${m}">${pila}</div><span class="vq-num" aria-hidden="true">${dos(i + 1)}</span><a class="vq-info"${info(fs[0])} aria-label="Pedir información${nombre ? ` de ${esc(nombre)}` : ' de esta colección'} por WhatsApp">+ info</a></article>`;
  }).join('');
  return `<section class="sec" id="trabajo"><div class="wrap"><div class="vq-cab"><h2>${esc(titulo)}</h2><div class="vq-nav"><button type="button" class="vq-b vq-ant" aria-label="Tarjetas anteriores">&#8249;</button><button type="button" class="vq-b vq-sig" aria-label="Más tarjetas">&#8250;</button></div></div><div class="vq-estante" data-n="${tarjetas.length}" tabindex="0" aria-label="${esc(titulo)}">${cartas}</div></div></section>`;
}

/** Banda partida: la frase del cliente a un lado y su foto al otro (con zoom suave al hacer scroll). */
export function bandaVitrinaHTML({ foto = null, img, frase = '', cta = '' }) {
  if (!foto || !frase) return '';
  return `<section class="vq-banda" aria-label="${esc(frase)}"><div class="wrap vq-banda-in"><div class="vq-banda-t"><p class="vq-frase">${esc(frase)}</p>${cta || ''}</div><figure class="vq-banda-f">${img(foto, { cls: 'rep-ok', extra: ' sizes="(min-width:900px) 50vw,100vw"' })}</figure></div></section>`;
}

/** Cierre tipográfico: el nombre del negocio en grande y el botón. Va antes del pie. */
export function cierreVitrinaHTML({ titulo = '', apoyo = '', cta = '' }) {
  if (!titulo) return '';
  return `<section class="vq-cierre" aria-label="${esc(titulo)}"><div class="wrap"><h2 class="vq-cierre-t">${esc(titulo)}</h2>${apoyo ? `<p class="vq-cierre-a">${esc(apoyo)}</p>` : ''}${cta || ''}</div></section>`;
}

/** Fotogramas fijos de las tarjetas (2, 3 y 4 fotos). */
const fotogramasTarjetas = [2, 3, 4].map((m) => fotogramasFundido(m, T_TARJETA, FADE_TARJETA)).join('');
const reglasTarjetas = [2, 3, 4].map((m) => `.vq-pila[data-m="${m}"] .vq-f{animation:${nomFundido(m, T_TARJETA)} ${r3(m * T_TARJETA)}s linear infinite both}`).join('');

export const CSS_VITRINA = `
body.l-vitrina{--margen:clamp(20px,5vw,72px)}
body.l-vitrina h1,body.l-vitrina h2,body.l-vitrina h3{font-weight:400;letter-spacing:-.02em;line-height:1.02}
body.l-vitrina footer{margin-top:0}
.h-vit{position:relative;padding:0;overflow:clip;background:var(--banda);color:#fff;min-height:clamp(540px,92svh,900px)}
.vq-st{position:absolute;inset:0}
.vq-sl{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr);align-items:end;opacity:0}.vq-sl:first-child{opacity:1}
.vq-fig{position:absolute;inset:0;margin:0;overflow:hidden}.vq-fig img{width:100%;height:100%;object-fit:cover;display:block}
.vq-sl::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.66),rgba(0,0,0,.04) 62%);pointer-events:none}
.vq-tx{position:relative;z-index:1;width:100%;display:grid;gap:12px;justify-items:start;padding-top:96px;padding-bottom:clamp(120px,15vw,168px)}
.vq-kick{font:600 12px/1.2 var(--fc);letter-spacing:.22em;text-transform:uppercase;opacity:.94;margin:0}
.vq-h{font-family:var(--ft);font-size:clamp(38px,7.4vw,112px);line-height:.95;max-width:14ch;margin:0;font-weight:400;letter-spacing:-.02em;text-transform:none}.vq-h.h1-m{font-size:clamp(34px,6.2vw,92px)}.vq-h.h1-l{font-size:clamp(30px,5.2vw,78px)}.vq-h2{font-size:clamp(32px,5.6vw,84px)}
.vq-sub{max-width:46ch;font-size:clamp(16px,1.4vw,20px);margin:0;opacity:.96}
.vq-pie{position:absolute;left:0;right:0;bottom:0;z-index:3;padding-bottom:clamp(18px,3vw,36px)}
.vq-pie-in{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px}
.vq-bots{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.vq-bots .btn{margin-top:0}
.vq-ctl{display:flex;align-items:center;gap:14px}
.vq-dots{display:flex;gap:6px;list-style:none;margin:0;padding:0}
.vq-dots li{position:relative;width:clamp(26px,4vw,48px);height:3px;background:rgba(255,255,255,.38);overflow:hidden}
.vq-dots li::after{content:"";position:absolute;inset:0;background:#fff;transform:scaleX(0);transform-origin:left}.vq-dots li:first-child::after{transform:scaleX(1)}
.vq-pausa{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.75);background:rgba(0,0,0,.38);color:#fff;font:inherit;font-size:14px;cursor:pointer;display:grid;place-items:center}
.vq-pausa:focus-visible,.vq-b:focus-visible{outline:3px solid #fff;outline-offset:2px}
html:not(.vq-js) .vq-pausa,html:not(.vq-js) .vq-nav{display:none}
html.vq-quieto .vq-sl,html.vq-quieto .vq-fig img,html.vq-quieto .vq-dots li::after,html.vq-quieto .vq-f{animation-play-state:paused!important}
/* nuestro trabajo: estante de tarjetas que rotan sus fotos */
.vq-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:clamp(18px,3vw,32px)}.vq-cab h2{margin:0;font-size:clamp(36px,5.6vw,76px)}
.vq-nav{display:flex;gap:8px;margin-bottom:8px}
.vq-b{width:46px;height:46px;border-radius:50%;border:1px solid var(--bor);background:transparent;color:var(--fg);font:inherit;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}
.vq-estante{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(240px,27vw,340px);gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:6px;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}.vq-estante::-webkit-scrollbar{display:none}
.vq-estante:focus-visible{outline:3px solid var(--p);outline-offset:4px}
.vq-card{position:relative;aspect-ratio:3/4;overflow:hidden;background:var(--banda);scroll-snap-align:start;border-radius:2px}
.vq-pila{position:absolute;inset:0}
.vq-f{position:absolute;inset:0;margin:0;opacity:0}.vq-f:first-child{opacity:1}
.vq-f img{width:100%;height:100%;object-fit:cover;display:block}
.vq-num{position:absolute;right:14px;top:12px;z-index:2;color:#fff;font:600 13px/1 var(--fc);letter-spacing:.16em;text-shadow:0 1px 6px rgba(0,0,0,.55)}
.vq-info{position:absolute;left:12px;bottom:12px;z-index:2;min-height:40px;padding:0 16px;display:inline-flex;align-items:center;border-radius:999px;background:rgba(255,255,255,.94);color:#111;text-decoration:none;font-weight:600;font-size:15px}
.vq-info:focus-visible{outline:3px solid var(--p);outline-offset:2px}
/* servicios como colecciones: una fila por grupo, paquetes en carrusel */
body.l-vitrina #servicios h2{font-size:clamp(36px,5.6vw,76px)}
body.l-vitrina .paq-grupo+.paq-grupo{margin-top:clamp(28px,4vw,52px)}
body.l-vitrina .grupo-t{font-family:var(--ft);font-weight:400;font-size:clamp(28px,3.8vw,48px);letter-spacing:-.02em}
body.l-vitrina .paqs{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin;padding-bottom:8px;overscroll-behavior-x:contain}
body.l-vitrina .paqs>.paq{flex:0 0 min(78vw,320px);scroll-snap-align:start;border-radius:2px}
/* banda partida y cierre tipográfico */
.vq-banda{margin:clamp(32px,6vw,88px) 0;background:var(--mut)}
.vq-banda-in{display:grid;grid-template-columns:minmax(0,1fr);gap:0;align-items:stretch}
.vq-banda-t{display:grid;align-content:center;justify-items:start;gap:18px;padding:clamp(32px,6vw,88px) 0}
.vq-frase{font-family:var(--ft);font-size:clamp(28px,4.2vw,64px);line-height:1.04;letter-spacing:-.02em;max-width:18ch;margin:0}
.vq-banda-t .btn{margin-top:0}
.vq-banda-f{margin:0;position:relative;overflow:hidden;min-height:clamp(320px,70vw,660px)}.vq-banda-f img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
@media (min-width:900px){.vq-banda-in{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,4vw,64px)}.vq-banda-t{padding-right:0}}
.vq-cierre{background:var(--banda);color:#fff;padding:clamp(64px,10vw,140px) 0}
.vq-cierre-t{font-size:clamp(46px,11vw,170px);line-height:.92;margin:0 0 16px;text-wrap:balance;color:#fff}
.vq-cierre-a{font-size:clamp(16px,1.4vw,20px);margin:0 0 8px;opacity:.94}
@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
.vq-banda-f img{animation:vq-zoom linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
@keyframes vq-zoom{from{transform:scale(1.14)}to{transform:scale(1)}}
}}
@media (prefers-reduced-motion:no-preference){${reglasTarjetas}${fotogramasTarjetas}}
@media (hover:hover){.vq-card:hover .vq-f{animation-play-state:paused}.vq-f img{transition:scale .6s cubic-bezier(.2,.7,.2,1)}.vq-card:hover .vq-f img{scale:1.05}.vq-b:hover{background:var(--fg);color:var(--bg)}.vq-pausa:hover{background:rgba(0,0,0,.6)}}
@media (min-width:900px){.vq-estante[data-n="3"]{grid-auto-columns:calc((100% - 28px)/3)}.vq-estante[data-n="4"]{grid-auto-columns:calc((100% - 42px)/4)}}
@media (max-width:700px){.vq-tx{padding-bottom:140px}.vq-pausa{width:40px;height:40px}}
`;

/** Para la revisión visual: mide la página quieta (primera foto de la portada y de cada tarjeta, sin zoom ni barritas). */
export const CSS_REVISION_VITRINA = '.vq-sl,.vq-f{animation:none!important;opacity:0!important}.vq-sl:first-child,.vq-f:first-child{opacity:1!important}.vq-fig img,.vq-banda-f img{animation:none!important;transform:none!important}.vq-dots,.vq-pausa,.vq-nav{display:none!important}';

/** Script mínimo (sin dependencias): pausa del movimiento y flechas del estante de tarjetas. */
export const JS_VITRINA = `<script>(function(){var H=document.documentElement;H.classList.add('vq-js');
var mov=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var p=document.querySelector('.vq-pausa');
if(p){p.addEventListener('click',function(){var q=H.classList.toggle('vq-quieto');p.setAttribute('aria-pressed',q?'true':'false');p.setAttribute('aria-label',q?'Reanudar el movimiento':'Pausar el movimiento');p.innerHTML=q?'&#9654;':'&#10074;&#10074;'})}
var e=document.querySelector('.vq-estante'),a=document.querySelector('.vq-ant'),b=document.querySelector('.vq-sig');
if(e&&a&&b){var paso=function(){return Math.max(240,e.clientWidth*.8)};
a.addEventListener('click',function(){e.scrollBy({left:-paso(),behavior:mov?'auto':'smooth'})});
b.addEventListener('click',function(){e.scrollBy({left:paso(),behavior:mov?'auto':'smooth'})});
e.addEventListener('keydown',function(k){if(k.key==='ArrowRight'){e.scrollBy({left:paso(),behavior:mov?'auto':'smooth'});k.preventDefault()}else if(k.key==='ArrowLeft'){e.scrollBy({left:-paso(),behavior:mov?'auto':'smooth'});k.preventDefault()}})}
})()</script>`;
