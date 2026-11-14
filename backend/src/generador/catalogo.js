// Opción O "Catálogo" (14-nov-2026). Rehecha desde cero a partir de shop.lululemon.com, la única referencia (medida en
// el navegador el 14-nov-2026). Se toma la lógica de diseño, no el contenido ni la marca ni el código.
// Lo que se observó en la referencia y lo que se hace aquí:
// - Barra de anuncio oscura con texto, liga subrayada y botón para cerrarla.   → anuncioHTML
// - Portada a pantalla completa en carrusel, titular claro (peso 400, interletrado -4%) abajo a la izquierda, botón en
//   píldora y controles pausa/anterior/siguiente.                              → portadaHTML
// - Estante "Nuevo y destacado": título a la izquierda, pestañas a la derecha, tarjetas verticales con el nombre
//   centrado abajo, que se deslizan (scroll-snap).                             → estanteHTML
// - Bloques de foto a todo lo ancho con texto abajo a la izquierda o al centro y parallax (animation-timeline: view()).
//                                                                             → bloqueHTML
// - Mosaico de categorías con foto y nombre.                                    → categoriasHTML
// - Tarjeta central translúcida sobre foto.                                     → cierreHTML
// Técnica de la referencia: CSS nativo (scroll-snap, scroll-driven animations, sticky) sin GSAP, Lenis ni Swiper; aquí
// igual, más un script mínimo para flechas, pausa, pestañas y cerrar la barra. Sin JS o con "reducir movimiento" todo queda
// quieto y completo; solo se anima transform y opacity.
// Reglas del proyecto: solo fotos del cliente (nada de video); las fotos de bloques y cierre llevan rep-ok porque
// pueden repetirse en "Nuestro trabajo", que siempre lleva todas.
import { METRICAS } from './tipo_color.js';
import { COMUNES as COMUNES_TITULOS } from './fuentes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinAcentos = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const MAX_SLIDES_CAT = 5;
/** Grotescas de peso 400 y 700 (la referencia usa una sans clara de peso normal). */
export const GROTESCAS_O = ['Albert Sans', 'Hanken Grotesk', 'Instrument Sans', 'Schibsted Grotesk', 'Familjen Grotesk'];

/** Letra de la O: una sola grotesca para títulos y texto; la del estilo del cliente si trae una apta. */
export function parCatalogo(pares = []) {
  const usadas = pares.flatMap((p) => [p.titulos, p.cuerpo]);
  const apta = (f) => GROTESCAS_O.includes(f) && METRICAS[f]?.pesos?.includes(400) && METRICAS[f]?.pesos?.includes(700) && !COMUNES_TITULOS.has(String(f).toLowerCase());
  const fam = usadas.find(apta) || GROTESCAS_O.find(apta) || GROTESCAS_O[0];
  return { titulos: fam, cuerpo: fam, estilo: pares[0]?.estilo || 'minimalista' };
}

/**
 * Relaciona cada foto con un grupo de la oferta por nombre (la foto o su descripción nombra el producto o el grupo).
 * grupos: [{nombre, opciones:[{nombre, precio}]}]. → [{grupo: índice o -1, precio: texto o ''}] en el orden de las fotos.
 * Nunca inventa: sin coincidencia clara la foto queda sin grupo y sin precio.
 */
export function relacionarFotos(fotos = [], grupos = [], { precios = true } = {}) {
  const palabras = (s) => ` ${sinAcentos(s).replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  return fotos.map((f) => {
    const txt = palabras(`${f?.nombre || ''} ${f?.alt || ''}`);
    if (txt.trim().length < 3) return { grupo: -1, precio: '' };
    for (let gi = 0; gi < grupos.length; gi++) {
      const g = grupos[gi];
      for (const o of g.opciones || []) {
        const n = palabras(o.nombre);
        if (n.trim().length >= 4 && txt.includes(n)) return { grupo: gi, precio: precios && o.precio ? String(o.precio) : '' };
      }
      const gn = palabras(g.nombre);
      if (gn.trim().length >= 4 && txt.includes(gn)) return { grupo: gi, precio: '' };
    }
    return { grupo: -1, precio: '' };
  });
}

/** Barra de anuncio arriba de todo. Se puede cerrar con JS; sin JS se queda. */
export function anuncioHTML({ texto = '', cta = '', href = '#contacto', externo = false }) {
  if (!texto && !cta) return '';
  return `<div class="ct-anuncio" role="region" aria-label="Aviso"><p>${texto ? `${esc(texto)} ` : ''}${cta ? `<a href="${esc(href)}"${externo ? ' target="_blank" rel="noopener"' : ''}>${esc(cta)}</a>` : ''}</p><button type="button" class="ct-x" aria-label="Cerrar aviso">&#215;</button></div>`;
}

/**
 * Portada: carrusel a pantalla completa. La primera diapositiva lleva el único h1.
 * pasos: [{foto, titular, apoyo}] (hasta 4 más). img(f, {cls, eager, extra}) es el de la plantilla. cta: HTML del botón.
 */
export function portadaHTML({ heroFoto = null, pasos = [], img, titular = '', subtitulo = '', cta = '' }) {
  const vistas = new Set(heroFoto ? [heroFoto.url] : []);
  const ps = pasos.filter((x) => x?.foto?.url && !vistas.has(x.foto.url) && vistas.add(x.foto.url)).slice(0, MAX_SLIDES_CAT - 1);
  const n = ps.length + 1;
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 40 ? ' h1-m' : '';
  const fig = (f, eager) => (f ? `<figure class="ct-fig">${img(f, { cls: 'ct-img rep-ok', eager, extra: eager ? ' fetchpriority="high"' : '' })}</figure>` : '');
  const primera = `<article class="ct-slide" aria-roledescription="diapositiva" aria-label="1 de ${n}">${fig(heroFoto, true)}<div class="wrap ct-txt"><h1 class="ct-h${clase}">${esc(titular)}</h1>${subtitulo ? `<p class="ct-sub">${esc(subtitulo)}</p>` : ''}${cta || ''}</div></article>`;
  const resto = ps.map((x, k) => `<article class="ct-slide" aria-roledescription="diapositiva" aria-label="${k + 2} de ${n}">${fig(x.foto, false)}<div class="wrap ct-txt">${x.titular ? `<p class="ct-h">${esc(x.titular)}</p>` : ''}${x.apoyo ? `<p class="ct-sub">${esc(x.apoyo)}</p>` : ''}${cta || ''}</div></article>`).join('');
  const ctl = n >= 2
    ? '<div class="ct-ctl"><button type="button" class="ct-b ct-pausa" aria-label="Pausar el cambio automático" aria-pressed="false">&#10074;&#10074;</button><button type="button" class="ct-b ct-ant" aria-label="Diapositiva anterior">&#8249;</button><button type="button" class="ct-b ct-sig" aria-label="Diapositiva siguiente">&#8250;</button></div>'
    : '';
  return {
    html: `<section class="hero ct-hero${heroFoto ? '' : ' sin-foto'}" id="inicio" aria-roledescription="carrusel" aria-label="${esc(titular || 'Destacados')}"><div class="ct-pista" tabindex="0" data-n="${n}">${primera}${resto}</div>${ctl}</section>`,
    urls: [heroFoto?.url, ...ps.map((x) => x.foto.url)].filter(Boolean),
  };
}

/**
 * Estante de tarjetas verticales que se deslizan, con pestañas por grupo cuando hay fotos de 2 o más grupos.
 * rel: salida de relacionarFotos. grupos: los de la oferta. attrs(foto): atributos del enlace de la tarjeta (href, target…).
 */
export function estanteHTML({ titulo = '', fotos = [], rel = [], grupos = [], img, attrs }) {
  if (!fotos.length) return '';
  const usados = [...new Set(rel.map((r) => r.grupo).filter((g) => g >= 0))];
  const pestanas = usados.length >= 2 ? usados : [];
  const tab = pestanas.length
    ? `<div class="ct-tabs" role="tablist" aria-label="${esc(titulo)}"><button type="button" role="tab" class="ct-tab" aria-selected="true" data-g="todo">Todo</button>${pestanas.map((g) => `<button type="button" role="tab" class="ct-tab" aria-selected="false" data-g="${g}">${esc(grupos[g]?.nombre || '')}</button>`).join('')}</div>`
    : '';
  const tarjetas = fotos.map((f, i) => {
    const nombre = String(f?.nombre || '').trim();
    const r = rel[i] || { grupo: -1, precio: '' };
    const dataG = r.grupo >= 0 && pestanas.includes(r.grupo) ? ` data-g="${r.grupo}"` : '';
    return `<li class="ct-card"${dataG}><a${attrs(f)} aria-label="${esc(nombre ? `Pedir información de ${nombre}` : 'Pedir información de esta foto')}"><span class="ct-card-f">${img(f, { cls: 'ct-card-img', extra: ' sizes="(min-width:900px) 24vw, 46vw"' })}</span>${nombre ? `<span class="ct-card-n">${esc(nombre)}</span>` : ''}${r.precio ? `<span class="ct-card-p">${esc(r.precio)}</span>` : ''}</a></li>`;
  }).join('');
  return `<section class="sec ct-estante" id="trabajo"><div class="wrap"><div class="ct-cab"><h2>${esc(titulo)}</h2>${tab}</div><div class="ct-pista-e" tabindex="0" aria-label="${esc(titulo)}"><ul class="ct-fila">${tarjetas}</ul></div><div class="ct-flechas"><button type="button" class="ct-fl ct-fl-a" aria-label="Anteriores">&#8249;</button><button type="button" class="ct-fl ct-fl-s" aria-label="Siguientes">&#8250;</button></div></div></section>`;
}

/** Bloque de foto a todo lo ancho con texto abajo (izquierda o centro) y parallax. Sin foto o sin titular no sale. */
export function bloqueHTML({ foto = null, img, titular = '', texto = '', cta = '', centro = false }) {
  if (!foto || !titular) return '';
  return `<section class="ct-bloque${centro ? ' ct-centro' : ''}" aria-label="${esc(titular)}"><figure class="ct-par">${img(foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}</figure><div class="wrap ct-bt"><h2>${esc(titular)}</h2>${texto ? `<p>${esc(texto)}</p>` : ''}${cta || ''}</div></section>`;
}

/** Mosaico de categorías: una tarjeta por grupo de la oferta, con su foto si se reconoce y si no, tipográfica. */
export function categoriasHTML({ titulo = '', grupos = [], fotoDe = () => null, img, precios = true, ancla = (i) => `#g-${i}` }) {
  if (grupos.length < 2) return '';
  const celdas = grupos.map((g, i) => {
    const f = fotoDe(i);
    const n = (g.opciones || []).length;
    const desde = precios ? (g.opciones || []).map((o) => o.precio).filter(Boolean)[0] : '';
    const pie = desde ? `Desde ${esc(desde)}` : n > 1 ? `${n} opciones` : '';
    return `<li class="ct-cat"><a href="${esc(ancla(i))}"><span class="ct-cat-f${f ? '' : ' ct-sin'}">${f ? img(f, { cls: 'rep-ok', extra: ' sizes="(min-width:900px) 24vw, 46vw"' }) : `<b>${esc(String(g.nombre || '').slice(0, 2).toUpperCase())}</b>`}</span><span class="ct-card-n">${esc(g.nombre)}</span>${pie ? `<span class="ct-card-p">${pie}</span>` : ''}</a></li>`;
  }).join('');
  return `<section class="sec ct-cats" aria-label="${esc(titulo)}"><div class="wrap"><div class="ct-cab"><h2>${esc(titulo)}</h2></div><ul class="ct-rejilla">${celdas}</ul></div></section>`;
}

/** Pone un id (g-0, g-1…) a cada grupo de la sección de servicios para que el mosaico enlace a ellos. */
export function conIdsGrupos(html = '') {
  let k = 0;
  return html.replaceAll('<div class="paq-grupo">', () => `<div class="paq-grupo" id="g-${k++}">`);
}

/** Cierre: foto a pantalla completa con una tarjeta central oscura translúcida (nombre, línea y botón). */
export function cierreHTML({ foto = null, img, titulo = '', apoyo = '', cta = '' }) {
  if (!foto) return '';
  return `<section class="ct-cierre" aria-label="${esc(titulo)}"><figure class="ct-par">${img(foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}</figure><div class="ct-panel"><h2>${esc(titulo)}</h2>${apoyo ? `<p>${esc(apoyo)}</p>` : ''}${cta || ''}</div></section>`;
}

export const CSS_CATALOGO = `
body.l-catalogo{--margen:clamp(20px,5vw,72px);--pill:#F4F3F2;--tinta:#140F0F}
body.l-catalogo h1,body.l-catalogo h2,body.l-catalogo h3{font-weight:400;letter-spacing:-.04em;line-height:1.1}
body.l-catalogo h2{font-size:clamp(30px,3.6vw,48px);margin-bottom:0}
body.l-catalogo .btn{border-radius:1000px;background:var(--pill);color:var(--tinta);font-size:14px;font-weight:700;letter-spacing:0;min-height:44px;padding:0 24px;margin-top:20px}
body.l-catalogo .sec .btn{background:var(--tinta);color:#fff}
.ct-anuncio{position:relative;background:var(--tinta);color:#fff;font-size:13px;line-height:1.3;padding:10px 48px;text-align:center}.ct-anuncio p{margin:0}.ct-anuncio a{color:inherit;text-decoration:underline;font-weight:700}
.ct-x{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:44px;height:44px;border:0;background:transparent;color:#fff;font-size:24px;line-height:1;cursor:pointer}.ct-x:focus-visible,.ct-b:focus-visible,.ct-tab:focus-visible{outline:3px solid #fff;outline-offset:-3px}
html:not(.ct-js) .ct-x{display:none}
.ct-hero{position:relative;padding:0;overflow:clip}
.ct-pista{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}.ct-pista::-webkit-scrollbar{display:none}
.ct-pista:focus-visible{outline:3px solid var(--primary);outline-offset:-3px}
.ct-slide{flex:0 0 100%;scroll-snap-align:start;position:relative;display:grid;grid-template-columns:minmax(0,1fr);align-items:end;min-height:clamp(500px,84svh,820px);background:var(--banda);color:#fff}
.ct-fig{position:absolute;inset:0;margin:0}.ct-img{width:100%;height:100%;object-fit:cover;display:block}
.ct-slide::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,0) 55%);pointer-events:none}
.ct-txt{position:relative;z-index:1;width:100%;display:grid;gap:10px;justify-items:start;padding-top:48px;padding-bottom:clamp(72px,9vw,120px)}
.ct-h{font-size:clamp(38px,5.4vw,84px);line-height:1.04;letter-spacing:-.04em;font-weight:400;margin:0;max-width:16ch}.ct-h.h1-m{font-size:clamp(34px,4.6vw,72px)}.ct-h.h1-l{font-size:clamp(30px,4vw,60px)}
.ct-sub{font-size:clamp(18px,1.7vw,24px);font-weight:500;line-height:1.25;letter-spacing:-.01em;max-width:34ch;margin:0}
.ct-txt .btn{margin-top:14px}
.ct-ctl{position:absolute;right:var(--margen);bottom:clamp(18px,2.4vw,32px);z-index:2;display:flex;gap:2px;background:rgba(20,15,15,.45);border-radius:1000px;padding:2px}
.ct-b{width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:#fff;font:inherit;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}
@media (hover:hover){.ct-b:hover{background:rgba(255,255,255,.2)}}
html:not(.ct-js) .ct-pausa{display:none}
.ct-cab{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px;margin-bottom:clamp(18px,2.4vw,32px)}
.ct-tabs{display:none}
html.ct-js .ct-tabs{display:flex;gap:20px;overflow-x:auto;scrollbar-width:none}.ct-tabs::-webkit-scrollbar{display:none}
.ct-tab{flex:0 0 auto;min-height:44px;padding:0;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--fg);font:inherit;font-size:16px;cursor:pointer;opacity:.7}
.ct-tab[aria-selected="true"]{border-bottom-color:var(--fg);opacity:1;font-weight:700}
.ct-tab:focus-visible{outline-color:var(--fg)}
.ct-pista-e{overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;scroll-behavior:smooth}.ct-pista-e::-webkit-scrollbar{display:none}
.ct-fila{list-style:none;display:flex;gap:clamp(8px,1.2vw,16px)}
.ct-card{flex:0 0 calc((100% - 8px) / 2);scroll-snap-align:start}@media (min-width:700px){.ct-card{flex-basis:calc((100% - 2 * 12px) / 3)}}@media (min-width:1000px){.ct-card{flex-basis:calc((100% - 3 * 16px) / 4)}}
.ct-card[hidden]{display:none}
.ct-card a,.ct-cat a{display:grid;gap:6px;text-decoration:none;color:inherit}
.ct-card-f,.ct-cat-f{display:block;aspect-ratio:5/6;overflow:hidden;background:var(--soft)}.ct-card-img,.ct-cat-f img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease}
@media (hover:hover){.ct-card a:hover .ct-card-img,.ct-cat a:hover img{transform:scale(1.03)}}
.ct-card-n{font-size:15px;font-weight:500;text-align:center;margin-top:8px}.ct-card-p{font-size:14px;text-align:center;opacity:.75}
.ct-flechas{display:none}
html.ct-js .ct-flechas{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.ct-fl{width:44px;height:44px;border-radius:50%;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;font-size:24px;line-height:1;cursor:pointer;display:grid;place-items:center}.ct-fl[disabled]{opacity:.35;cursor:default}
.ct-bloque,.ct-cierre{position:relative;overflow:clip;display:grid;grid-template-columns:minmax(0,1fr);align-items:end;color:#fff;background:var(--banda);min-height:clamp(480px,80svh,760px);margin:clamp(32px,6vw,80px) 0}
.ct-par{position:absolute;inset:0;margin:0;overflow:hidden}.ct-par img{position:absolute;left:0;top:-10%;width:100%;height:120%;object-fit:cover;display:block}
.ct-bloque::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.6),rgba(0,0,0,0) 60%);pointer-events:none}
.ct-bt{position:relative;z-index:1;width:100%;display:grid;gap:10px;justify-items:start;padding-top:48px;padding-bottom:clamp(40px,6vw,80px)}
.ct-bt h2{font-size:clamp(28px,3.8vw,56px);line-height:1.06;max-width:20ch}.ct-bt p{font-size:clamp(17px,1.5vw,22px);font-weight:500;line-height:1.3;max-width:38ch;margin:0}
.ct-centro{align-items:center}.ct-centro .ct-bt{justify-items:center;text-align:center;padding-bottom:48px}.ct-centro::after{background:rgba(0,0,0,.32)}
.ct-rejilla{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(8px,1.2vw,16px)}@media (min-width:900px){.ct-rejilla{grid-template-columns:repeat(4,minmax(0,1fr))}}
.ct-sin{display:grid;place-items:center;background:var(--soft)}.ct-sin b{font-size:clamp(40px,7vw,88px);font-weight:400;letter-spacing:-.05em;opacity:.55}
.ct-cierre{align-items:center;justify-items:center;min-height:clamp(520px,86svh,800px);margin-bottom:0}
.ct-panel{position:relative;z-index:1;width:min(88%,360px);padding:clamp(28px,4vw,44px) 24px;background:rgba(20,15,15,.62);border-radius:16px;text-align:center;display:grid;gap:12px;justify-items:center}
.ct-panel h2{font-size:clamp(26px,3vw,36px);line-height:1.1}.ct-panel p{font-size:15px;margin:0}
.ct-panel .btn{background:var(--pill)}
@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
.ct-par img{animation:ct-par linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
@keyframes ct-par{from{transform:translateY(-7%)}to{transform:translateY(7%)}}
}}
@media (prefers-reduced-motion:reduce){.ct-pista,.ct-pista-e{scroll-behavior:auto}.ct-card-img,.ct-cat-f img{transition:none}}
`;

/** Para la revisión visual: página quieta (sin parallax ni controles que se mueven). */
export const CSS_REVISION_CATALOGO = '.ct-par img{animation:none!important;transform:none!important}.ct-ctl,.ct-flechas,.ct-x,.ct-tabs{display:none!important}.ct-card[hidden]{display:block!important}';

/** Script mínimo (sin dependencias): pausa y flechas de la portada, flechas y pestañas del estante, cerrar el aviso. */
export const JS_CATALOGO = `<script>(function(){var H=document.documentElement;H.classList.add('ct-js');
var mov=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var x=document.querySelector('.ct-x');if(x)x.addEventListener('click',function(){var a=document.querySelector('.ct-anuncio');if(a)a.hidden=true});
var p=document.querySelector('.ct-pista');
if(p){var ss=p.querySelectorAll('.ct-slide'),n=ss.length,pa=document.querySelector('.ct-pausa'),an=document.querySelector('.ct-ant'),si=document.querySelector('.ct-sig'),i=0,auto=!mov&&n>1,tm=null;
function ir(k){i=(k+n)%n;p.scrollTo({left:ss[i].offsetLeft,behavior:mov?'auto':'smooth'})}
function marca(){var w=p.clientWidth||1;i=Math.max(0,Math.min(n-1,Math.round(p.scrollLeft/w)))}
function plan(){clearTimeout(tm);if(auto&&!document.hidden)tm=setTimeout(function(){ir(i+1);plan()},7000)}
function est(){if(pa){pa.setAttribute('aria-pressed',auto?'false':'true');pa.setAttribute('aria-label',auto?'Pausar el cambio automático':'Reanudar el cambio automático');pa.innerHTML=auto?'&#10074;&#10074;':'&#9654;'}}
p.addEventListener('scroll',function(){clearTimeout(p._t);p._t=setTimeout(marca,80)},{passive:true});
if(an)an.addEventListener('click',function(){ir(i-1);plan()});if(si)si.addEventListener('click',function(){ir(i+1);plan()});
if(pa)pa.addEventListener('click',function(){auto=!auto;est();plan()});
['pointerdown','focusin'].forEach(function(e){p.addEventListener(e,function(){clearTimeout(tm)})});
p.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){ir(i+1);e.preventDefault()}else if(e.key==='ArrowLeft'){ir(i-1);e.preventDefault()}});
document.addEventListener('visibilitychange',plan);
if('IntersectionObserver' in window){new IntersectionObserver(function(es){es.forEach(function(o){if(!o.isIntersecting)clearTimeout(tm);else plan()})},{threshold:.35}).observe(p)}
est();plan()}
var e=document.querySelector('.ct-pista-e');
if(e){var fa=document.querySelector('.ct-fl-a'),fs=document.querySelector('.ct-fl-s');
function paso(){var c=e.querySelector('.ct-card:not([hidden])');return c?c.getBoundingClientRect().width+16:300}
function bt(){if(fa)fa.disabled=e.scrollLeft<=2;if(fs)fs.disabled=e.scrollLeft+e.clientWidth>=e.scrollWidth-2}
if(fa)fa.addEventListener('click',function(){e.scrollBy({left:-paso()*2,behavior:mov?'auto':'smooth'})});
if(fs)fs.addEventListener('click',function(){e.scrollBy({left:paso()*2,behavior:mov?'auto':'smooth'})});
e.addEventListener('scroll',bt,{passive:true});window.addEventListener('resize',bt);bt();
var tabs=[].slice.call(document.querySelectorAll('.ct-tab')),cards=[].slice.call(e.querySelectorAll('.ct-card'));
function elige(k){tabs.forEach(function(t,j){t.setAttribute('aria-selected',j===k?'true':'false');t.tabIndex=j===k?0:-1});var g=tabs[k].getAttribute('data-g');cards.forEach(function(c){c.hidden=g!=='todo'&&c.getAttribute('data-g')!==g});e.scrollLeft=0;bt()}
if(tabs.length){elige(0);tabs.forEach(function(t,j){t.addEventListener('click',function(){elige(j)});t.addEventListener('keydown',function(ev){var d=ev.key==='ArrowRight'?1:ev.key==='ArrowLeft'?-1:0;if(d){var k=(j+d+tabs.length)%tabs.length;elige(k);tabs[k].focus();ev.preventDefault()}})})}}
})()</script>`;
