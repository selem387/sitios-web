// Slider de portada, movimiento sutil de fotos y microanimaciones (aprobado 6-nov-2026, doc claude/slider-portada.md).
// Reglas:
// - Foto 1: fija, eager + fetchpriority=high; solo acercamiento CSS (nunca video). El avance automático arranca después de load.
// - Foto 2 en adelante: clip diferido (generador/clips.js); si no existe todavía o la conexión es lenta, queda la foto con movimiento CSS.
// - Cada foto lleva texto encima (titular 3-8 palabras, apoyo, botón), solo con datos reales del brief.
// - Pausa visible (WCAG 2.2.2), pausa con mouse/foco, flechas, teclado, deslizar; prefers-reduced-motion apaga todo.
// - Solo se animan transform y opacity (sin costo de layout; Lighthouse móvil ≥ 90).
import { urlClip, tipoClip, encolarClips } from './clips.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const corto = (s, max) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t && t.length <= max ? t : ''; };
export const MAX_DIAPOSITIVAS = 5;
const ORDEN_TIPOS = ['diferenciador', 'oferta', 'prueba', 'vision'];

/**
 * Textos de las diapositivas 2-5. Usa los de Claude (textos.diapositivas) si son válidos; si faltan, los arma del brief
 * solo con datos cortos y reales (nunca recorta ni inventa: si el dato es largo, esa diapositiva se omite).
 */
export function diapositivasDe(textos = {}, brief = {}) {
  const deIA = (Array.isArray(textos.diapositivas) ? textos.diapositivas : [])
    .map((x) => ({ tipo: String(x?.tipo || ''), titular: corto(x?.titular, 60), apoyo: corto(x?.apoyo, 110), cta: corto(x?.cta, 24) }))
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
    const tipo = n > 1 ? tipoClip(k) : null;
    if (tipo) clips.push({ url: f.url, tipo, ancho: f.ancho, alto: f.alto, k });
    const extra = `${k === 0 ? ' fetchpriority="high"' : ''}${tipo ? ` data-clip="${esc(urlClip(f.url, tipo))}"` : ''}`;
    const foto = img(f, { cls: `sl-img km km-${k % 4}`, eager: k === 0, extra });
    let txt = '';
    if (k === 0) txt = primera;
    else {
      const d = diapos[k - 1] || {};
      txt = `<p class="sl-t">${esc(d.titular)}</p>${d.apoyo ? `<p class="sl-a">${esc(d.apoyo)}</p>` : ''}${(d.cta || cta) ? `<a class="btn sl-btn"${href} tabindex="0">${esc(d.cta || cta)}</a>` : ''}`;
    }
    const attrs = n > 1 ? ` role="group" aria-roledescription="diapositiva" aria-label="${k + 1} de ${n}"${k ? ' inert aria-hidden="true"' : ''}` : '';
    return `<div class="sl-d${k === 0 ? ' activa' : ''}${txt ? ' con-txt' : ''}"${attrs}>${foto}${txt ? `<div class="sl-cap">${caja(txt)}</div>` : ''}</div>`;
  }).join('');
  const ctrl = n > 1 ? `<div class="sl-ctrl"><button type="button" class="sl-b sl-pausa" aria-label="Pausar fotos" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pausa" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/><path class="i-play" d="M8 5l11 7-11 7z"/></svg></button><button type="button" class="sl-b sl-prev" aria-label="Foto anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button><span class="sl-pos">1 / ${n}</span><button type="button" class="sl-b sl-sig" aria-label="Foto siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4"/></svg></button></div>` : '';
  if (clips.length) encolarClips(clips);
  const reg = n > 1 ? ` data-sl role="region" aria-roledescription="carrusel" aria-label="${esc(nombre ? `Fotos de ${nombre}` : 'Fotos')}"` : '';
  return { html: `<${tag} class="${clase} sl"${reg}>${slides}${ctrl}</${tag}>`, n, usadas: lista.map((f) => f.url) };
}

export const CSS_MOVIMIENTO = `
/* slider de portada (generador/movimiento.js) */
.sl{position:relative;overflow:hidden;isolation:isolate}
.sl-d{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity 1.1s ease,visibility 0s linear 1.1s}
.sl-d.activa{opacity:1;visibility:visible;z-index:1;transition:opacity 1.1s ease,visibility 0s}
/* Hasta el evento load solo existe la foto 1: las demás no se descargan ni compiten con la carga (LCP). */
.sl[data-sl]:not(.vivo) .sl-d:not(.activa){display:none}
.sl-d>img,.sl-d>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.sl-d>video{opacity:0;transition:opacity .9s ease}.sl-d>video.listo{opacity:1}
.sl-d.con-txt::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.68))}
.sl-cap{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:22px 20px 76px;color:#fff}
.sl-t{font-family:var(--ft);font-size:clamp(26px,6vw,50px);line-height:1.06;letter-spacing:-.015em;max-width:18ch;text-wrap:balance;text-shadow:0 1px 18px rgba(0,0,0,.35)}
.sl-a{color:rgba(255,255,255,.92);margin-top:10px;max-width:42ch;font-size:clamp(15px,3.8vw,19px);text-shadow:0 1px 12px rgba(0,0,0,.4)}
.sl-btn{margin-top:16px;background:#fff;color:#1A1714}
.sl-ctrl{position:absolute;z-index:3;left:50%;bottom:12px;transform:translateX(-50%);display:flex;align-items:center;gap:2px;background:rgba(0,0,0,.62);border-radius:999px;padding:3px;color:#fff}
.sl-b{width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;padding:0}
.sl-b svg{width:20px;height:20px;fill:currentColor}.sl-b:focus-visible{outline:3px solid #fff;outline-offset:-3px}
.sl-pausa .i-play{display:none}.sl.pausado .sl-pausa .i-play{display:inline}.sl.pausado .sl-pausa .i-pausa{display:none}
.sl-pos{font:700 13px/1 var(--fc);min-width:3.4em;text-align:center;font-variant-numeric:tabular-nums}
.sl-marco .sl-cap{padding:18px 16px 70px}.sl-marco .sl-t{font-size:clamp(22px,5vw,32px)}.sl-marco .sl-a{font-size:15px}.sl-marco .sl-btn{padding:11px 18px;min-height:44px;font-size:15px}
.ovalo.sl-marco .sl-cap{text-align:center;padding:0 16% 22%}.ovalo.sl-marco .sl-t,.ovalo.sl-marco .sl-a{margin-left:auto;margin-right:auto}.ovalo.sl-marco .sl-ctrl{bottom:6%}
.sl-carta{aspect-ratio:4/5;border-radius:8px;margin-bottom:12px}
@media (min-width:900px){.sl-carta{aspect-ratio:16/8}.sl-cap{padding-bottom:84px}}
/* movimiento de cámara: acercamientos distintos por foto */
@keyframes km0{from{transform:scale(1.02)}to{transform:scale(1.1) translate3d(-1.6%,-1%,0)}}
@keyframes km1{from{transform:scale(1.1) translate3d(1.6%,0,0)}to{transform:scale(1.02)}}
@keyframes km2{from{transform:scale(1.03) translate3d(-1%,1%,0)}to{transform:scale(1.09) translate3d(1.4%,-1%,0)}}
@keyframes km3{from{transform:scale(1.09) translate3d(0,-1.2%,0)}to{transform:scale(1.02) translate3d(0,.6%,0)}}
.km{animation:km0 16s ease-in-out infinite alternate;animation-play-state:paused;transform-origin:50% 50%}
.km-1{animation-name:km1}.km-2{animation-name:km2}.km-3{animation-name:km3}
.sl-d.activa .km,.sl:not([data-sl]) .km{animation-play-state:running}.sl.pausado .km{animation-play-state:paused}
/* todo el sitio: fotos con movimiento muy lento mientras están en pantalla */
@keyframes mv{from{transform:scale(1)}to{transform:scale(1.035) translate3d(0,-.6%,0)}}
.mv{animation:mv 24s ease-in-out infinite alternate;animation-play-state:paused}.mv.en{animation-play-state:running}
/* aparición suave al hacer scroll y reacción leve al cursor */
.rv{opacity:0;transform:translate3d(0,16px,0);transition:opacity .8s ease,transform .9s cubic-bezier(.2,.7,.2,1)}.rv.en{opacity:1;transform:none}
@media (hover:hover){.btn{transition:transform .25s ease,box-shadow .25s ease}.btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(0,0,0,.16)}
.paq,blockquote,.wa{transition:transform .35s ease,box-shadow .35s ease}.paq:hover,blockquote:hover{transform:translateY(-3px);box-shadow:0 10px 26px rgba(0,0,0,.08)}.wa:hover{transform:scale(1.05)}}
@media (prefers-reduced-motion:reduce){.km,.mv{animation:none!important}.rv{opacity:1!important;transform:none!important;transition:none!important}.sl-d,.sl-d>video{transition:none}.btn,.paq,blockquote,.wa{transition:none!important;transform:none!important}}
`;

// JS en línea (≈2.5 KB). Corre al final del body; no bloquea el pintado de la primera foto.
export const JS_MOVIMIENTO = `<script>(()=>{
const R=matchMedia('(prefers-reduced-motion: reduce)').matches;
const lenta=()=>{const c=navigator.connection;return !!c&&(c.saveData||/(^|-)(2g|3g)$/.test(c.effectiveType||''))};
const io=(cb,o)=>'IntersectionObserver' in window?new IntersectionObserver(cb,o):null;
let cargada=document.readyState==='complete';const listos=[];
addEventListener('load',()=>{cargada=true;listos.forEach(f=>f())},{once:true});
const alCargar=f=>cargada?f():listos.push(f);
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
const prog=()=>{clearTimeout(t);if(!parado())t=setTimeout(()=>{ir(i+1);prog()},6500)};
const estado=()=>{sl.classList.toggle('pausado',parado());bp.setAttribute('aria-pressed',String(usuario));bp.setAttribute('aria-label',usuario?'Reproducir fotos':'Pausar fotos');pos.setAttribute('aria-live',parado()?'polite':'off');vids();prog()};
bp.addEventListener('click',()=>{usuario=!usuario;estado()});
sl.querySelector('.sl-prev').addEventListener('click',()=>{ir(i-1);prog()});
sl.querySelector('.sl-sig').addEventListener('click',()=>{ir(i+1);prog()});
sl.addEventListener('mouseenter',()=>{encima=true;estado()});sl.addEventListener('mouseleave',()=>{encima=false;estado()});
sl.addEventListener('focusin',()=>{encima=true;estado()});sl.addEventListener('focusout',e=>{if(!sl.contains(e.relatedTarget)){encima=false;estado()}});
sl.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){ir(i+1);prog()}else if(e.key==='ArrowLeft'){ir(i-1);prog()}});
let x0=null;sl.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
sl.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>40){ir(i+(dx<0?1:-1));prog()}},{passive:true});
sl.classList.toggle('pausado',parado());if(R){bp.setAttribute('aria-pressed','true');bp.setAttribute('aria-label','Reproducir fotos')}
alCargar(()=>{sl.classList.add('vivo');setTimeout(()=>clip(ds[1]),1200);if(!parado())t=setTimeout(()=>{ir(1);prog()},4500)});
});
if(R)return;
const vis=io(es=>es.forEach(e=>e.target.classList.toggle('en',e.isIntersecting)),{rootMargin:'60px'});
document.querySelectorAll('main img').forEach(im=>{const p=im.parentElement;
if(!vis||im.closest('.sl,.cap,.catimg,.carr,.circulo')||/logo/.test(im.className)||p.querySelectorAll('img').length!==1)return;
const r=getComputedStyle(im).borderRadius;p.style.overflow='hidden';if(r&&r!=='0px')p.style.borderRadius=r;im.classList.add('mv');vis.observe(im)});
const ap=io((es,o)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('en');o.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
if(ap)document.querySelectorAll('main>section:not(.hero):not(.promo),main>div:not(.tira):not(.wrap)').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('rv');ap.observe(el)}});
})();</script>`;
