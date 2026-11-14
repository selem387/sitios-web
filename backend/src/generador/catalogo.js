// Opción O "Catálogo en movimiento" (14-nov-2026, pedido de Sebastián a partir de shop.lululemon.com; se tomó la lógica de
// diseño —portada en carrusel, estantes que se deslizan, pestañas por categoría, bandas con parallax— no el contenido ni la marca).
// Qué la distingue:
// - Portada: carrusel a pantalla completa con las fotos del cliente (la principal + las del slider), cada una con su texto y botón.
// - "Nuestro trabajo" funciona como estante deslizable (carrusel con scroll-snap) con "+ info" por WhatsApp.
// - Servicios en pestañas por categoría (cuando hay 2 o más grupos de oferta).
// - Bandas de foto con parallax y cierre a pantalla completa.
// Técnica (la misma que usa la referencia, medida el 14-nov-2026): CSS nativo —scroll-snap para los carruseles,
// animation-timeline: view() para el parallax, position: sticky para el encabezado— y un script mínimo sin librerías
// (flechas, pausa del carrusel y pestañas). No usa GSAP, Lenis ni Swiper, así que no depende de ninguna licencia.
// Reglas:
// - Solo fotos del cliente; nada de video generado. Solo transform y opacity en lo que se anima.
// - Sin JS o con "reducir movimiento": el carrusel se desliza con el dedo, las pestañas muestran todo y nada se anima solo.
// - Las fotos de las bandas llevan rep-ok: pueden repetirse en "Nuestro trabajo", que siempre lleva todas.
import { METRICAS } from './tipo_color.js';
import { COMUNES as COMUNES_TITULOS } from './fuentes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MAX_SLIDES_CAT = 5;
/** Grotescas con 400, 500 y 700 que no son letras comunes (orden de preferencia; distinto al de la M). */
export const GROTESCAS_O = ['Albert Sans', 'Hanken Grotesk', 'Instrument Sans', 'Schibsted Grotesk', 'Familjen Grotesk'];

/** Letra de la O: una sola grotesca; la del estilo del cliente si trae una apta, si no la primera. */
export function parCatalogo(pares = []) {
  const usadas = pares.flatMap((p) => [p.titulos, p.cuerpo]);
  const apta = (f) => GROTESCAS_O.includes(f) && METRICAS[f]?.pesos?.includes(700) && !COMUNES_TITULOS.has(String(f).toLowerCase());
  const fam = usadas.find(apta) || GROTESCAS_O.find(apta) || GROTESCAS_O[0];
  return { titulos: fam, cuerpo: fam, estilo: pares[0]?.estilo || 'minimalista' };
}

const dos = (n) => String(n).padStart(2, '0');

/**
 * Portada de la opción O: carrusel de fotos del cliente con su texto.
 * heroFoto: foto principal (lleva el único h1). pasos: [{foto, titular, apoyo}] (hasta 4 más).
 * img(x, {cls, eager, sizes, extra}) es el de la plantilla. → {html, urls}
 */
export function portadaCatalogoHTML({ heroFoto = null, pasos = [], img, kicker = '', titular = '', subtitulo = '', cta = '', ctaSec = '' }) {
  const vistas = new Set(heroFoto ? [heroFoto.url] : []);
  const ps = pasos.filter((x) => x?.foto?.url && !vistas.has(x.foto.url) && vistas.add(x.foto.url)).slice(0, MAX_SLIDES_CAT - 1);
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 46 ? ' h1-m' : '';
  const principal = `<article class="ct-slide" id="ct-s1" aria-roledescription="diapositiva" aria-label="1 de ${ps.length + 1}">${heroFoto ? `<figure class="ct-fig">${img(heroFoto, { cls: 'ct-img rep-ok', eager: true, extra: ' fetchpriority="high"', sizes: ' sizes="100vw"' })}</figure>` : ''}<div class="wrap ct-txt">${kicker ? `<p class="ct-kick">${esc(kicker)}</p>` : ''}<h1 class="ct-h${clase}">${esc(titular)}</h1>${subtitulo ? `<p class="ct-sub">${esc(subtitulo)}</p>` : ''}<div class="ct-bots">${cta || ''}${ctaSec || ''}</div></div></article>`;
  const resto = ps.map((x, k) => `<article class="ct-slide" id="ct-s${k + 2}" aria-roledescription="diapositiva" aria-label="${k + 2} de ${ps.length + 1}"><figure class="ct-fig">${img(x.foto, { cls: 'ct-img rep-ok', extra: ' sizes="100vw"' })}</figure><div class="wrap ct-txt">${x.titular ? `<p class="ct-h ct-h2">${esc(x.titular)}</p>` : ''}${x.apoyo ? `<p class="ct-sub">${esc(x.apoyo)}</p>` : ''}${cta || ''}</div></article>`).join('');
  const n = ps.length + 1;
  const ctl = n >= 2
    ? `<div class="ct-ctl"><button type="button" class="ct-b ct-ant" aria-label="Diapositiva anterior">&#8249;</button><button type="button" class="ct-b ct-sig" aria-label="Diapositiva siguiente">&#8250;</button><button type="button" class="ct-b ct-pausa" aria-label="Pausar el cambio automático" aria-pressed="false">&#10074;&#10074;</button><p class="ct-cont" aria-hidden="true"><b>01</b> / ${dos(n)}</p></div>`
    : '';
  const html = `<section class="hero h-cat${heroFoto ? '' : ' sin-foto'}" id="inicio" aria-roledescription="carrusel" aria-label="${esc(titular || 'Destacados')}"><div class="ct-pista" tabindex="0" data-n="${n}">${principal}${resto}</div>${ctl}</section>`;
  return { html, urls: [heroFoto?.url, ...ps.map((x) => x.foto.url)].filter(Boolean) };
}

/** Banda de foto a todo lo ancho con una frase y parallax (CSS nativo). */
export function bandaFotoHTML({ foto = null, img, frase = '', cta = '' }) {
  if (!foto || !frase) return '';
  return `<section class="ct-banda" aria-label="${esc(frase)}"><figure class="ct-banda-f">${img(foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}</figure><div class="wrap ct-banda-t"><p>${esc(frase)}</p>${cta || ''}</div></section>`;
}

/** Cierre: foto a pantalla completa con el nombre y el botón. Va antes del pie. */
export function cierreCatalogoHTML({ foto = null, img, titulo = '', apoyo = '', cta = '' }) {
  if (!foto) return '';
  return `<section class="ct-cierre" aria-label="${esc(titulo)}"><figure class="ct-banda-f">${img(foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}</figure><div class="wrap ct-banda-t"><h2 class="ct-cierre-t">${esc(titulo)}</h2>${apoyo ? `<p>${esc(apoyo)}</p>` : ''}${cta || ''}</div></section>`;
}

/**
 * Pestañas por categoría sobre el HTML que ya arma la sección de servicios (grupos con varios paquetes).
 * Con menos de 2 grupos lo deja igual. Sin JS la barra de pestañas no se ve y se muestran todos los grupos.
 */
export function tabsDeServicios(html = '') {
  const marca = '<div class="paq-grupo">';
  const n = html.split(marca).length - 1;
  if (n < 2) return html;
  const titulos = [...html.matchAll(/<div class="paq-grupo"><h3 class="grupo-t">([^<]*)<\/h3>/g)].map((m) => m[1]);
  if (titulos.length !== n) return html;
  let k = 0;
  const conPaneles = html.replaceAll(marca, () => { const i = k++; return `<div class="paq-grupo" role="tabpanel" id="ct-p${i}" aria-labelledby="ct-t${i}" data-ct="${i}">`; });
  const barra = `<div class="ct-tabs" role="tablist" aria-label="Categorías">${titulos.map((x, i) => `<button type="button" role="tab" class="ct-tab" id="ct-t${i}" aria-controls="ct-p${i}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}">${x}</button>`).join('')}</div>`;
  return conPaneles.replace('<div class="paq-grupo" role="tabpanel"', `${barra}<div class="paq-grupo" role="tabpanel"`);
}

export const CSS_CATALOGO = `
body.l-catalogo{--margen:clamp(20px,5vw,72px)}
body.l-catalogo h1,body.l-catalogo h2,body.l-catalogo h3{font-weight:700;letter-spacing:-.03em;line-height:1.04}
.h-cat{position:relative;padding:0;overflow:clip}
.ct-pista{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}.ct-pista::-webkit-scrollbar{display:none}
.ct-pista:focus-visible{outline:3px solid var(--primary);outline-offset:-3px}
.ct-slide{flex:0 0 100%;scroll-snap-align:start;position:relative;min-height:clamp(480px,82svh,820px);display:grid;grid-template-columns:minmax(0,1fr);align-items:end;color:#fff;background:var(--banda)}
.ct-fig{position:absolute;inset:0;margin:0}.ct-img{width:100%;height:100%;object-fit:cover;display:block}
.ct-slide::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.66),rgba(0,0,0,.08) 62%);pointer-events:none}
.ct-txt{position:relative;z-index:1;width:100%;display:grid;gap:12px;justify-items:start;padding-top:clamp(40px,8vw,96px);padding-bottom:clamp(64px,9vw,112px)}
.ct-kick{font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.92}
.ct-h{font-size:clamp(34px,6vw,96px);line-height:.98;max-width:16ch;text-transform:none;margin:0;font-weight:700;letter-spacing:-.035em}.ct-h.h1-m{font-size:clamp(30px,5.2vw,82px)}.ct-h.h1-l{font-size:clamp(28px,4.6vw,72px)}.ct-h2{font-size:clamp(28px,4.6vw,68px)}
.ct-sub{max-width:48ch;font-size:clamp(16px,1.4vw,20px);opacity:.96;margin:0}
.ct-bots{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.ct-txt .btn{margin-top:8px}
.ct-ctl{position:absolute;left:var(--margen);right:var(--margen);bottom:clamp(16px,2.4vw,28px);z-index:2;display:flex;gap:10px;align-items:center;justify-content:flex-end;pointer-events:none}
.ct-ctl>*{pointer-events:auto}
.ct-b{width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.7);background:rgba(0,0,0,.35);color:#fff;font:inherit;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}
.ct-b:focus-visible,.ct-tab:focus-visible{outline:3px solid #fff;outline-offset:2px}
.ct-cont{margin:0 0 0 8px;color:#fff;font-size:13px;letter-spacing:.12em;text-shadow:0 1px 6px rgba(0,0,0,.5)}.ct-cont b{font-size:20px;font-weight:700;letter-spacing:-.01em}
html:not(.ct-js) .ct-pausa{display:none}
@media (hover:hover){.ct-b:hover{background:rgba(0,0,0,.6)}}
/* estante: "Nuestro trabajo" como carrusel deslizable */
body.l-catalogo .galeria.g-car{scroll-snap-type:x mandatory}
body.l-catalogo .galeria.g-car figure{scroll-snap-align:start}
/* pestañas por categoría: solo con JS */
.ct-tabs{display:none}
html.ct-js .ct-tabs{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 0 clamp(18px,3vw,32px);padding-bottom:4px}.ct-tabs::-webkit-scrollbar{display:none}
.ct-tab{flex:0 0 auto;min-height:44px;padding:0 22px;border-radius:999px;border:1px solid var(--bor);background:transparent;color:var(--fg);font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}
.ct-tab[aria-selected="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.ct-tab:focus-visible{outline-color:var(--primary)}
html.ct-js .paq-grupo[hidden]{display:none}
html.ct-js .paq-grupo .grupo-t{display:none}
/* bandas de foto con parallax */
.ct-banda,.ct-cierre{position:relative;overflow:clip;display:grid;grid-template-columns:minmax(0,1fr);align-items:end;color:#fff;background:var(--banda);min-height:clamp(380px,64svh,640px);margin:clamp(24px,5vw,64px) 0}
.ct-cierre{min-height:clamp(440px,76svh,760px);margin-bottom:0}
.ct-banda-f{position:absolute;inset:0;margin:0;overflow:hidden}.ct-banda-f img{position:absolute;left:0;top:-12%;width:100%;height:124%;object-fit:cover;display:block}
.ct-banda::after,.ct-cierre::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.66),rgba(0,0,0,.06) 70%);pointer-events:none}
.ct-banda-t{position:relative;z-index:1;width:100%;display:grid;gap:10px;justify-items:start;padding-top:clamp(32px,6vw,72px);padding-bottom:clamp(32px,6vw,72px)}
.ct-banda-t p{font-size:clamp(24px,3.8vw,56px);font-weight:700;letter-spacing:-.03em;line-height:1.06;max-width:22ch;margin:0}.ct-cierre .ct-banda-t p{font-size:clamp(16px,1.4vw,20px);font-weight:400;letter-spacing:0}
.ct-cierre-t{font-size:clamp(34px,6vw,96px);line-height:.98;text-transform:none}
@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
.ct-banda-f img{animation:ct-par linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
@keyframes ct-par{from{transform:translateY(-9%)}to{transform:translateY(9%)}}
}}
@media (max-width:700px){.ct-slide{min-height:clamp(460px,78svh,720px)}.ct-txt{padding-bottom:96px}.ct-b{width:40px;height:40px}}
@media (prefers-reduced-motion:reduce){.ct-pista{scroll-behavior:auto}}
`;

/** Para la revisión visual: mide la página quieta (sin deslizar el carrusel ni mover el parallax). */
export const CSS_REVISION_CATALOGO = '.ct-banda-f img{animation:none!important;transform:none!important}.ct-ctl{display:none!important}.ct-tabs{display:none!important}.paq-grupo[hidden]{display:block!important}';

/** Script mínimo (sin dependencias): flechas y cambio automático del carrusel de portada, y pestañas de servicios. */
export const JS_CATALOGO = `<script>(function(){var H=document.documentElement;H.classList.add('ct-js');
var mov=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var pista=document.querySelector('.ct-pista');
if(pista){var ss=pista.querySelectorAll('.ct-slide'),n=ss.length,cont=document.querySelector('.ct-cont b'),pausa=document.querySelector('.ct-pausa'),ant=document.querySelector('.ct-ant'),sig=document.querySelector('.ct-sig'),i=0,auto=!mov&&n>1,tm=null;
function ir(k){i=(k+n)%n;pista.scrollTo({left:ss[i].offsetLeft,behavior:mov?'auto':'smooth'})}
function marca(){var w=pista.clientWidth||1;i=Math.max(0,Math.min(n-1,Math.round(pista.scrollLeft/w)));if(cont)cont.textContent=('0'+(i+1)).slice(-2)}
function plan(){clearTimeout(tm);if(auto&&!document.hidden)tm=setTimeout(function(){ir(i+1);plan()},6500)}
function estado(){if(pausa){pausa.setAttribute('aria-pressed',auto?'false':'true');pausa.setAttribute('aria-label',auto?'Pausar el cambio automático':'Reanudar el cambio automático');pausa.innerHTML=auto?'&#10074;&#10074;':'&#9654;'}}
pista.addEventListener('scroll',function(){clearTimeout(pista._t);pista._t=setTimeout(marca,80)},{passive:true});
if(ant)ant.addEventListener('click',function(){ir(i-1);plan()});if(sig)sig.addEventListener('click',function(){ir(i+1);plan()});
if(pausa)pausa.addEventListener('click',function(){auto=!auto;estado();plan()});
['pointerdown','focusin'].forEach(function(e){pista.addEventListener(e,function(){clearTimeout(tm)})});
pista.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){ir(i+1);e.preventDefault()}else if(e.key==='ArrowLeft'){ir(i-1);e.preventDefault()}});
document.addEventListener('visibilitychange',plan);
if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(x){if(!x.isIntersecting)clearTimeout(tm);else plan()})},{threshold:.35}).observe(pista)}
estado();plan()}
var tabs=[].slice.call(document.querySelectorAll('.ct-tab')),pan=[].slice.call(document.querySelectorAll('.paq-grupo[data-ct]'));
function elige(k){tabs.forEach(function(t,j){t.setAttribute('aria-selected',j===k?'true':'false');t.tabIndex=j===k?0:-1});pan.forEach(function(p,j){p.hidden=j!==k})}
if(tabs.length&&pan.length===tabs.length){elige(0);tabs.forEach(function(t,j){t.addEventListener('click',function(){elige(j)});t.addEventListener('keydown',function(e){var d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){var k=(j+d+tabs.length)%tabs.length;elige(k);tabs[k].focus();e.preventDefault()}})})}
})()</script>`;
