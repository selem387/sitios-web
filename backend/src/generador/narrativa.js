// Opción I "Narrativa por capítulos" (14-nov-2026, pedido de Sebastián a partir de capplasticproduction.org; se tomó la
// lógica de diseño, no el contenido ni la marca). Qué la distingue de las demás:
// - Una sola familia grotesca (pesos 400/500/700) en mayúsculas, titulares enormes con el tracking apretado.
// - Cada sección es un "capítulo" numerado (● 01, ● 02…) con mucho aire; reseñas y contacto van en fondo casi negro
//   para partir la página a la mitad y al cierre.
// - Portada tipográfica: el titular entra letra por letra; abajo una foto a todo lo ancho que se abre (máscara) y se
//   desplaza un poco con el scroll. Cifras y pasos como números grandes.
// - Bloques que suben al entrar en pantalla; la galería de trabajo entra volteándose.
// Reglas:
// - Nada de video generado: fotos del cliente. Si el cliente subió un video, ese video es el fondo de la foto de portada
//   (sin sonido, en bucle, con su foto como póster) y ya no se repite abajo.
// - Solo transform, opacity y clip-path; un requestAnimationFrame por evento de scroll.
// - Sin JS o con "reducir movimiento" todo queda visible y quieto (los estados ocultos solo existen con .na-js).
// - El contenido sale del brief igual que en las demás opciones; aquí solo vive lo visual.
import { METRICAS } from './tipo_color.js';
import { COMUNES as COMUNES_TITULOS } from './fuentes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Grotescas con 400, 500 y 700 que no están en la lista de letras comunes (orden de preferencia). */
export const GROTESCAS_I = ['Schibsted Grotesk', 'Familjen Grotesk', 'Hanken Grotesk', 'Instrument Sans', 'Albert Sans'];

/**
 * Letra de la I: una sola familia para títulos y texto. Si el estilo del cliente ya trae una de las grotescas, esa;
 * si no, la primera de la lista. → par {titulos, cuerpo, estilo}
 */
export function parNarrativa(pares = []) {
  const usadas = pares.flatMap((p) => [p.titulos, p.cuerpo]);
  const apta = (f) => GROTESCAS_I.includes(f) && METRICAS[f]?.pesos?.includes(700) && !COMUNES_TITULOS.has(String(f).toLowerCase());
  const fam = usadas.find(apta) || GROTESCAS_I[0];
  return { titulos: fam, cuerpo: fam, estilo: pares[0]?.estilo || 'minimalista' };
}

/**
 * Portada de la opción I.
 * heroFoto: foto grande bajo el titular. video: {url} del cliente (opcional; va encima de la foto como fondo vivo).
 * img(x, {cls, eager, extra}) es el de la plantilla. info: hasta 3 datos cortos (renglón numerado bajo la foto).
 * → {html, urls}
 */
export function portadaNarrativaHTML({ heroFoto = null, video = null, img, kicker = '', titular = '', subtitulo = '', cta = '', info = [] }) {
  const datos = info.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3);
  const media = heroFoto
    ? `${img(heroFoto, { cls: 'na-img rep-ok', eager: true, extra: ' fetchpriority="high" sizes="100vw"' })}${video?.url ? `<video class="na-vid" src="${esc(video.url)}" poster="${esc(heroFoto.url)}" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>` : ''}`
    : video?.url ? `<video class="na-vid solo" src="${esc(video.url)}" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>` : '';
  const html = `<section class="hero h-narr" id="inicio"><div class="wrap na-cab">${kicker ? `<p class="na-punto">${esc(kicker)}</p>` : ''}<h1 class="na-tit">${esc(titular)}</h1><div class="na-pie">${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : '<span></span>'}${cta}</div></div>${media ? `<figure class="na-foto">${media}</figure>` : ''}${datos.length ? `<ol class="wrap na-datos">${datos.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</section>`;
  return { html, urls: [heroFoto?.url, video?.url].filter(Boolean) };
}

export const CSS_NARRATIVA = `
/* opción I: narrativa por capítulos (generador/narrativa.js) */
body.l-narrativa{--fc:var(--ft)}
body.l-narrativa h1,body.l-narrativa h2,body.l-narrativa h3,body.l-narrativa summary,body.l-narrativa .grupo-t{text-transform:uppercase;font-weight:700;letter-spacing:-.045em}
body.l-narrativa h2{font-size:clamp(38px,6.6vw,104px);line-height:.92;margin-bottom:clamp(26px,3.4vw,52px);max-width:16ch}
body.l-narrativa h3{font-size:clamp(22px,2.2vw,30px);line-height:1}
body.l-narrativa main{counter-reset:cap}
body.l-narrativa main>section.sec:has(h2){counter-increment:cap}
body.l-narrativa .sec h2::before{content:"\\25CF\\00a0\\00a0" counter(cap,decimal-leading-zero);display:block;font-size:14px;font-weight:500;letter-spacing:.02em;line-height:1;margin-bottom:22px;color:var(--acc)}
body.l-narrativa .sec{padding:clamp(84px,11vw,168px) 0 0}
body.l-narrativa .sobre{margin-top:clamp(84px,11vw,168px);padding-bottom:clamp(84px,11vw,168px)}
body.l-narrativa .barra nav{font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:.06em}
body.l-narrativa .kicker,.na-punto{text-transform:uppercase;letter-spacing:.02em;font-size:14px;font-weight:500;color:var(--fg)}
.na-punto::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--acc);margin-right:10px;vertical-align:1px}
body.l-narrativa .btn{border-radius:0;text-transform:uppercase;letter-spacing:.04em;font-weight:700;font-size:15px}
body.l-narrativa .sub{color:var(--fg);font-size:clamp(18px,1.6vw,22px);font-weight:500;line-height:1.3}
body.l-narrativa .galeria img,body.l-narrativa .galeria.g-car figure,body.l-narrativa .galeria.g-car img,body.l-narrativa .retrato,body.l-narrativa .video,body.l-narrativa .catimg img,body.l-narrativa .capturas img,body.l-narrativa .quotes .cap img{border-radius:0}
body.l-narrativa .paq{background:none;border:0;border-top:2px solid var(--fg);border-radius:0;padding:20px 0}
body.l-narrativa blockquote{background:none;border:0;border-left:3px solid var(--acc);border-radius:0;padding:4px 0 4px 22px}
body.l-narrativa blockquote p{font-size:clamp(22px,2.4vw,34px);font-weight:700;letter-spacing:-.025em;line-height:1.08}
body.l-narrativa .cifras{gap:clamp(18px,3vw,40px);margin-top:34px}
body.l-narrativa .cifras li{flex:1 1 180px;background:none;border:0;border-top:2px solid var(--fg);border-radius:0;padding:14px 0 0;font-size:clamp(26px,3.4vw,48px);font-weight:700;letter-spacing:-.04em;line-height:1;text-transform:uppercase}
body.l-narrativa .pasos{gap:clamp(22px,3vw,40px)}
body.l-narrativa .pasos>li{border-top:2px solid var(--fg);padding:16px 0 0;min-height:0}body.l-narrativa .pasos>li:hover{transform:none;background:none}
body.l-narrativa .pasos>li::before{content:counter(p,decimal-leading-zero);position:static;display:block;font-size:clamp(44px,5.4vw,84px);font-weight:700;letter-spacing:-.05em;line-height:.9;color:var(--acc);margin-bottom:14px;background:none;width:auto;height:auto;border-radius:0}
/* capítulos en negro: reseñas (a media página) y contacto (cierre) */
body.l-narrativa #resenas,body.l-narrativa #contacto{--fg:#F2F0EC;--soft:rgba(242,240,236,.74);--bor:rgba(242,240,236,.2);--card:transparent;background:#0D0D0D;color:var(--fg);padding-bottom:clamp(84px,11vw,168px);margin-top:clamp(84px,11vw,168px)}
body.l-narrativa #resenas+#contacto,body.l-narrativa #contacto{margin-top:clamp(84px,11vw,168px)}
body.l-narrativa footer{margin-top:0}
/* portada */
.h-narr{padding:clamp(34px,6vw,84px) 0 0}
.h-narr .na-cab{display:grid;gap:clamp(18px,2.6vw,32px)}
.h-narr h1{font-size:clamp(46px,10.6vw,168px);line-height:.88;letter-spacing:-.055em;max-width:none;overflow-wrap:anywhere;hyphens:auto}
.na-pie{display:grid;gap:8px;align-items:end}.na-pie .sub{margin-top:0;max-width:44ch}.na-pie .btn{justify-self:start}
.na-foto{position:relative;margin:clamp(36px,5vw,72px) 0 0;height:clamp(340px,74vh,860px);overflow:hidden;background:#111;clip-path:inset(0 var(--na-r,0px))}
.na-foto>img,.na-foto>video{position:absolute;left:0;top:-8%;width:100%;height:116%;object-fit:cover;max-width:none;transform:translate3d(0,var(--na-y,0px),0) scale(var(--na-s,1))}
.na-foto>.na-vid{opacity:0;transition:opacity .9s ease}.na-foto>.na-vid.listo,.na-foto>.na-vid.solo{opacity:1}
.na-datos{list-style:none;counter-reset:d;display:grid;gap:16px;margin-top:clamp(28px,3.4vw,48px)}
.na-datos li{counter-increment:d;border-top:2px solid var(--fg);padding-top:12px;font-weight:500;line-height:1.25}
.na-datos li::before{content:counter(d,decimal-leading-zero);display:block;font-size:13px;color:var(--acc);margin-bottom:6px}
@media (min-width:900px){.na-pie{grid-template-columns:minmax(0,1fr) auto;gap:40px}.na-pie .btn{margin-top:0}.na-datos{grid-template-columns:repeat(3,minmax(0,1fr));gap:40px}
body.l-narrativa .s-in{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(40px,6vw,96px)}body.l-narrativa .retrato{max-width:none}}
/* movimiento (solo con JS y sin "reducir movimiento") */
.na-js .na-ch{display:inline-block;transform:translate3d(0,.5em,0);opacity:0;transition:transform .9s cubic-bezier(.16,.8,.2,1),opacity .7s ease;transition-delay:calc(var(--c,0)*24ms)}
.na-js .na-on .na-ch{transform:none;opacity:1}
.na-pal{display:inline-block;white-space:nowrap}
.na-js [data-na]{opacity:0;transform:translate3d(0,42px,0);transition:opacity .9s ease,transform 1s cubic-bezier(.16,.8,.2,1);transition-delay:calc(var(--k,0)*90ms)}
.na-js [data-na=voltea]{transform:perspective(1200px) rotateX(-24deg) translate3d(0,60px,0);transform-origin:50% 0}
.na-js [data-na=mascara]{opacity:1;transform:none;clip-path:inset(0 0 100% 0);transition:clip-path 1.1s cubic-bezier(.77,0,.18,1)}
.na-js [data-na].na-on{opacity:1;transform:none;clip-path:inset(0 0 0 0)}
@media (prefers-reduced-motion:reduce){.na-foto>img,.na-foto>video{transform:none!important}.na-foto{clip-path:none!important}}
`;

// JS en línea (≈1.6 KB). Parte el titular en letras (con aria-label con el texto completo), marca los bloques que
// suben al entrar en pantalla y abre la foto de portada con el scroll.
export const JS_NARRATIVA = `<script>(function(){var D=document,R=matchMedia('(prefers-reduced-motion: reduce)').matches,IO='IntersectionObserver'in window;
var v=D.querySelector('.na-vid');if(v){if(R){v.removeAttribute('autoplay');v.pause()}else{v.addEventListener('playing',function(){v.classList.add('listo')},{once:true})}}
if(R||!IO)return;
try{D.documentElement.classList.add('na-js');
var h=D.querySelector('.h-narr h1');if(h){var t=h.textContent,c=0,f=D.createDocumentFragment();h.setAttribute('aria-label',t);
t.split(/(\\s+)/).forEach(function(w){if(!w)return;if(/^\\s+$/.test(w)){f.appendChild(D.createTextNode(' '));return}var p=D.createElement('span');p.className='na-pal';p.setAttribute('aria-hidden','true');
[].forEach.call(w,function(ch){var s=D.createElement('span');s.className='na-ch';s.style.setProperty('--c',c++);s.textContent=ch;p.appendChild(s)});f.appendChild(p)});
h.textContent='';h.appendChild(f);requestAnimationFrame(function(){requestAnimationFrame(function(){h.classList.add('na-on')})})}
/* Un elemento con máscara completa no cuenta como visible para IntersectionObserver: se observa su contenedor. */
var M=new Map(),io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting){(M.get(x.target)||[]).forEach(function(el){el.classList.add('na-on')});io.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
var marca=function(el,tipo,k){if(!el||el.hasAttribute('data-na'))return;el.setAttribute('data-na',tipo);el.style.setProperty('--k',k||0);var o=tipo==='mascara'?el.parentElement:el;if(!M.has(o))M.set(o,[]);M.get(o).push(el);io.observe(o)};
[].forEach.call(D.querySelectorAll('main .sec'),function(s){var w=s.querySelector('.wrap')||s;var hs=w.children.length===1&&w.firstElementChild.tagName==='DIV'?w.firstElementChild.children:w.children;
[].forEach.call(hs,function(el,k){var tipo=el.tagName==='H2'?'mascara':/\\bgaleria\\b/.test(el.className)?'voltea':'sube';marca(el,tipo,Math.min(k,4))})});
[].forEach.call(D.querySelectorAll('.na-datos li,.cifras li,.pasos>li,.quotes>*,.paqs>*'),function(el,k){marca(el,'sube',k%4)});
var fo=D.querySelector('.na-foto');if(!fo)return;var tk=false;
var paso=function(){tk=false;var r=fo.getBoundingClientRect(),H=innerHeight;if(r.bottom<0||r.top>H)return;
var p=Math.min(1,Math.max(0,(H-r.top)/(H+r.height))),ab=Math.min(1,Math.max(0,(H-r.top)/(H*.75)));
fo.style.setProperty('--na-r',(innerWidth>=700?(1-ab)*innerWidth*.06:0).toFixed(1)+'px');fo.style.setProperty('--na-y',((p-.5)*-8).toFixed(2)+'%');fo.style.setProperty('--na-s',(1.06-.06*ab).toFixed(4))};
addEventListener('scroll',function(){if(!tk){tk=true;requestAnimationFrame(paso)}},{passive:true});addEventListener('resize',paso);paso();
}catch(err){D.documentElement.classList.remove('na-js')}})();</script>`;

/** CSS para la revisión visual automática: todo visible y quieto (sin depender de que el bloque entre en pantalla). */
export const CSS_REVISION_NARRATIVA = '.na-js [data-na],.na-js .na-ch{opacity:1!important;transform:none!important;clip-path:none!important}.na-foto{clip-path:none!important}';
