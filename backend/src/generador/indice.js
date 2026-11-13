// Opción H "Recorrido con índice" (12-nov-2026, pedido de Sebastián a partir de un sitio de referencia; diseño propio
// aprobado en demo). Qué la distingue de las demás:
// - Portada que se queda fija mientras se baja: una tarjeta sube con los datos del negocio rodando, una banda de color
//   parte el titular desde el centro, tres fotos crecen una dentro de otra (túnel), entra un lema palabra por palabra y
//   una banda del color de fondo abre paso al resto de la página.
// - En pantallas anchas (≥ 1100 px) el menú es un índice numerado fijo al costado; abajo de eso, la barra de siempre.
// - Titulares en mayúsculas de trazo fino que suben por palabra al entrar en pantalla; ligas y botones "ruedan" al pasar
//   el cursor; el logo (o las iniciales) flota en 3D y gira con el desplazamiento.
// Reglas:
// - Solo transform y opacity ligados al desplazamiento (un requestAnimationFrame por evento); nada de video.
// - Sin JS o con "reducir movimiento" la portada queda quieta y completa (foto, texto, botón y datos).
// - La foto de portada y las del túnel llevan rep-ok: pueden repetirse en "Nuestro trabajo", que siempre lleva todas.
// - El contenido sale del brief igual que en las demás opciones; aquí solo vive lo visual.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MAX_FOTOS_TUNEL = 3;

/** Iniciales del negocio para el monograma cuando no hay logo: "Norte 21" → "N21", "Casa Ceiba Bienes Raíces" → "CC". */
export function inicialesDe(nombre = '') {
  const ps = String(nombre).trim().split(/\s+/).filter((x) => /[\p{L}\d]/u.test(x) && !/^(de|del|la|las|el|los|y|e|&)$/i.test(x));
  if (!ps.length) return '';
  const num = ps.find((x) => /^\d{1,3}$/.test(x));
  if (num && ps[0] !== num) return (ps[0][0] + num).toUpperCase();
  return ps.slice(0, 2).map((x) => x[0]).join('').toUpperCase();
}

/**
 * Portada de la opción H.
 * heroFoto: foto de fondo. tunel: fotos del túnel (se usan hasta 3). img(x, {cls, eager, extra}) es el de la plantilla.
 * info: datos cortos del negocio (ruedan en la tarjeta). lema/apoyo: texto grande sobre la banda de color.
 * logo: HTML del logo con contraste sobre fondo oscuro (o '').
 * → {html, urls} (urls: fotos que quedaron en la portada)
 */
export function escenaIndiceHTML({ heroFoto = null, tunel = [], img, kicker = '', titular = '', subtitulo = '', cta = '', info = [], lema = '', apoyo = '', logo = '' }) {
  const fotosT = tunel.filter((x) => x?.url && x.url !== heroFoto?.url).slice(0, MAX_FOTOS_TUNEL);
  const fondo = heroFoto ? `${img(heroFoto, { cls: 'ix-fondo rep-ok', eager: true, extra: ' fetchpriority="high" sizes="100vw"' })}<div class="ix-velo"></div>` : '';
  const datos = info.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4);
  const ficha = datos.length ? `<ul class="ix-ficha">${datos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const tarjeta = datos.length >= 2 ? `<div class="ix-tarjeta" aria-hidden="true">${kicker ? `<p class="ix-tj-k">${esc(kicker)}</p>` : '<span></span>'}<div class="ix-rueda"><ul>${datos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : '';
  const figs = fotosT.map((x) => `<figure>${img(x, { cls: 'rep-ok', eager: true })}</figure>`).join('');
  const html = `<div class="ix-escena" id="inicio"><section class="hero h-indice${heroFoto ? '' : ' sin-fondo'}">${fondo}${logo ? `<div class="ix-logo">${logo}</div>` : ''}<div class="wrap ix-txt">${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}<h1>${esc(titular)}</h1>${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}${cta}</div>${ficha}${tarjeta}<div class="ix-banda ix-b1" aria-hidden="true"></div><div class="ix-tunel">${figs}<figure class="ix-fin"></figure></div>${lema ? `<div class="ix-lema"><p class="ix-lm ix-lm-t">${esc(lema)}</p>${apoyo ? `<p class="ix-lm ix-lm-a">${esc(apoyo)}</p>` : ''}</div>` : ''}<div class="ix-banda ix-b2" aria-hidden="true"></div></section></div>`;
  return { html, urls: [heroFoto?.url, ...fotosT.map((x) => x.url)].filter(Boolean) };
}

/** Índice lateral: "Inicio" + las secciones que existen, en el orden de la página. secciones: [[id, título]]. */
export function navIndiceHTML(secciones = []) {
  const ligas = [['inicio', 'Inicio'], ...secciones].filter(([id, n]) => id && n);
  return `<nav class="ix-nav" aria-label="Secciones"><ol>${ligas.map(([id, n]) => `<li><a href="#${esc(id)}">${esc(n)}</a></li>`).join('')}</ol></nav>`;
}

/** Monograma flotante: el logo del cliente (o sus iniciales). El JS lo apila en capas para darle volumen. */
export function monogramaHTML({ logoUrl = '', nombre = '' }) {
  const ini = inicialesDe(nombre);
  if (!logoUrl && !ini) return '';
  return `<div class="ix-flot" aria-hidden="true" hidden><div class="ix-cubo">${logoUrl ? `<img src="${esc(logoUrl)}" alt="">` : `<span>${esc(ini)}</span>`}</div></div>`;
}

export const CSS_INDICE = `
/* opción H: recorrido con índice (generador/indice.js) */
body.l-indice{--ixw:0px;overflow-x:clip}
body.l-indice h1,body.l-indice h2,.ix-lm-t{text-transform:uppercase;font-weight:400;letter-spacing:-.01em}
body.l-indice h2{font-size:clamp(34px,5.6vw,84px);line-height:1.02;margin-bottom:clamp(22px,3vw,44px)}
body.l-indice .sec{padding-top:clamp(64px,9vw,120px);overflow-x:clip}
body.l-indice .paq,body.l-indice blockquote{background:none;border:0;border-top:1.5px solid var(--fg);border-radius:0;padding:20px 0}
body.l-indice .galeria img,body.l-indice .galeria.g-car figure,body.l-indice .retrato,body.l-indice .video,body.l-indice .catimg img{border-radius:0}
body.l-indice .btn{background:none;color:inherit;border:1.5px solid currentColor;transition:background .25s,color .25s}
body.l-indice .btn:hover{background:var(--fg);color:var(--bg)}
.ix-escena{position:relative}
.h-indice{position:relative;min-height:min(100svh,920px);display:grid;place-items:center;text-align:center;color:#fff;overflow:hidden;isolation:isolate;background:var(--banda);padding:120px 0 220px}
.h-indice .ix-fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none;z-index:-2;animation:ixresp 16s ease-in-out infinite alternate}
@keyframes ixresp{from{transform:scale(1.02)}to{transform:scale(1.1) translate3d(-1%,-1%,0)}}
.ix-velo{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.56),rgba(0,0,0,.34) 45%,rgba(0,0,0,.64))}
.h-indice h1{font-size:clamp(34px,5.4vw,84px);max-width:17ch;margin:0 auto;line-height:1.03;will-change:transform}
.h-indice .ix-txt p{margin-left:auto;margin-right:auto}.h-indice .sub,.h-indice .kicker{color:rgba(255,255,255,.92)}
.h-indice .btn:hover{background:#fff;color:#111}
.ix-logo{display:none;position:absolute;left:50%;top:22px;transform:translateX(-50%)}.ix-logo .logo{height:56px}
.ix-ficha{position:absolute;left:20px;right:20px;bottom:84px;list-style:none;display:grid;gap:4px;background:var(--bg);color:var(--fg);padding:16px 18px;text-align:left;font-weight:600;line-height:1.25}
.ix-banda,.ix-lema,.ix-tunel,.ix-tarjeta{display:none}
/* portada viva: la clase la pone el JS (nunca con "reducir movimiento") */
.ix-escena.viva{height:520vh}
.viva .h-indice{position:sticky;top:0;height:100svh;min-height:0;padding:0}
/* con la barra de arriba (menos de 1100 px) la portada se fija debajo de ella */
@media (max-width:1099px){.viva .h-indice{top:69px;height:calc(100svh - 69px)}}
.viva .ix-banda{display:block;position:absolute;inset:0;z-index:3;background:var(--banda);transform:scaleX(0);will-change:transform}
.viva .ix-b2{background:var(--bg);z-index:5}
.viva .ix-lema{display:grid;visibility:hidden;position:absolute;inset:0;z-index:4;place-content:center;justify-items:center;gap:24px;text-align:center;padding:90px 20px;color:#fff;will-change:transform}
.viva .ix-lema.ver{visibility:visible}
.ix-lm-t{font-family:var(--ft);font-size:clamp(30px,5.8vw,92px);line-height:1.02;max-width:17ch}.ix-lm-a{max-width:54ch;font-weight:600}
/* en pantallas angostas los datos quedan fijos abajo (la tarjeta taparía el botón); la tarjeta que sube es de 900 px en adelante */
.viva .ix-txt{padding-bottom:200px}
.viva .ix-tarjeta{flex-direction:column;justify-content:space-between;gap:18px;position:absolute;background:var(--bg);color:var(--fg);padding:18px 20px;text-align:left;z-index:2;will-change:transform}
.ix-tj-k{font-weight:600;max-width:22ch;line-height:1.2}
.ix-rueda{height:2.3em;overflow:hidden;font-family:var(--ft);font-size:clamp(22px,2.3vw,34px);line-height:1.15;text-transform:uppercase;text-align:right}
.ix-rueda ul{list-style:none;transition:transform .65s cubic-bezier(.16,1,.3,1)}
.ix-rueda li{height:2.3em;display:flex;align-items:flex-end;justify-content:flex-end}
.viva .ix-tunel{display:block;position:absolute;inset:0;z-index:3;pointer-events:none}
.ix-tunel figure{position:absolute;inset:0;margin:0;overflow:hidden;transform:scale(0);box-shadow:0 0 0 2.4vmax var(--banda);will-change:transform}
.ix-tunel img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.ix-tunel .ix-fin{background:var(--banda)}
/* índice lateral */
.ix-nav{display:none}
@media (min-width:900px){.ix-ficha{left:auto;right:96px;max-width:360px;bottom:28px}.viva .ix-ficha{display:none}.viva .ix-txt{padding-bottom:0}.viva .ix-tarjeta{display:flex;right:20px;width:min(30vw,400px);min-height:190px;bottom:160px}}
@media (min-width:1100px){
body.l-indice{--ixw:232px}
body.l-indice .barra{display:none}.ix-logo{display:block}
body.l-indice main{padding-left:var(--ixw)}.ix-escena{margin-left:calc(-1*var(--ixw))}
.ix-nav{display:block;position:fixed;left:20px;top:50%;transform:translateY(-50%);z-index:25;width:196px;color:var(--fg);transition:color .3s}
body.ix-osc .ix-nav{color:#fff}
.ix-nav ol{list-style:none;display:grid;gap:8px;counter-reset:ix}
.ix-nav a{display:inline-flex;gap:8px;align-items:baseline;text-decoration:none;font-weight:600;line-height:1.15;transition:transform .2s}
.ix-nav a::before{counter-increment:ix;content:"[" counter(ix) "]";opacity:.7;font-weight:400}
.ix-nav a:hover,.ix-nav a.aqui{transform:translateX(8px)}.ix-nav a.aqui{text-decoration:underline;text-underline-offset:4px}
}
/* monograma 3D */
.ix-flot{position:fixed;right:24px;bottom:92px;z-index:28;perspective:520px;pointer-events:none;transition:opacity .4s;animation:ixflota 4.5s ease-in-out infinite alternate}
.ix-flot.fuera{opacity:0}
.ix-cubo{position:relative;transform-style:preserve-3d;will-change:transform;font-family:var(--ft);font-size:40px;line-height:1;color:#69716c}
.ix-cubo>*{display:block}.ix-cubo>*+*{position:absolute;inset:0}
.ix-cubo img{height:auto;width:auto;max-height:46px;max-width:130px;filter:brightness(.55)}.ix-cubo img.cara{filter:none}
.ix-cubo span.cara{color:#e6eae6;text-shadow:0 1px 2px rgba(0,0,0,.45)}
@keyframes ixflota{to{transform:translateY(-9px)}}
@media (max-width:899px){.ix-flot{right:20px;bottom:86px}.ix-cubo{font-size:28px}.ix-cubo img{max-height:30px;max-width:64px}}
/* movimiento de letras */
.ix-pw{display:inline-block;overflow:hidden;vertical-align:top;padding:.2em .04em .14em;margin:-.2em -.04em -.14em}
.ix-pw>span{display:inline-block;transition:transform 1.25s cubic-bezier(.19,1,.22,1);will-change:transform}
.ix-partido:not(.ix-sale) .ix-pw>span{transform:translateY(125%);transition:none}
.ix-rd{display:inline-block;overflow:hidden;vertical-align:top;line-height:1.3}
.ix-rd>span{display:block;position:relative;transition:transform .45s cubic-bezier(.16,1,.3,1)}
.ix-rd>span::after{content:attr(data-t);position:absolute;left:0;top:100%;white-space:nowrap}
a:hover>.ix-rd>span,a:focus-visible>.ix-rd>span{transform:translateY(-100%)}
.ix-desliza{will-change:transform}
@media (prefers-reduced-motion:reduce){.h-indice .ix-fondo,.ix-flot{animation:none}}
`;

// JS en línea (≈3 KB). Sin plantillas de texto ni backticks adentro: va con String.raw para conservar las diagonales.
export const JS_INDICE = String.raw`<script>(()=>{
var D=document,B=D.body,es=D.querySelector('.ix-escena');if(!es)return;
var R=matchMedia('(prefers-reduced-motion: reduce)').matches,IO='IntersectionObserver'in window;
var $$=function(s,r){return [].slice.call((r||D).querySelectorAll(s))};
var viva=false,p=0;
/* el índice va en blanco mientras la portada (oscura) ocupa la pantalla */
var osc=function(){var r=es.getBoundingClientRect();B.classList.toggle('ix-osc',r.bottom>innerHeight*.5&&(!viva||p<.9))};
/* índice: marca la sección visible */
var ligas=$$('.ix-nav a');
if(IO&&ligas.length){var io0=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting)ligas.forEach(function(a){a.classList.toggle('aqui',a.getAttribute('href')==='#'+x.target.id)})})},{rootMargin:'-45% 0px -50% 0px'});
$$('main section[id],.ix-escena').forEach(function(s){io0.observe(s)})}
if(R||!IO){addEventListener('scroll',osc,{passive:true});osc();return}
/* texto que rueda al pasar el cursor */
$$('.ix-nav a,body.l-indice a.btn').forEach(function(el){var n=[].slice.call(el.childNodes).filter(function(x){return x.nodeType===3&&x.nodeValue.trim()}).pop();if(!n)return;
var t=n.nodeValue.trim(),o=D.createElement('span'),i=D.createElement('span');o.className='ix-rd';i.setAttribute('data-t',t);i.textContent=t;o.appendChild(i);el.replaceChild(o,n)});
/* titulares: cada palabra sube desde su máscara, escalonado por renglón */
var parte=function(el){var w=D.createTreeWalker(el,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())ns.push(w.currentNode);
ns.forEach(function(n){if(!n.nodeValue.trim())return;var f=D.createDocumentFragment();
n.nodeValue.split(/(\s+)/).forEach(function(t){if(!t)return;if(/^\s+$/.test(t)){f.appendChild(D.createTextNode(' '));return}
var o=D.createElement('span'),i=D.createElement('span');o.className='ix-pw';i.textContent=t;o.appendChild(i);f.appendChild(o)});
n.parentNode.replaceChild(f,n)});el.classList.remove('ix-sale');el.classList.add('ix-partido')};
var toca=function(el){var y=null,l=-1,k=0;$$('.ix-pw',el).forEach(function(q){var t=q.offsetTop;if(t!==y){y=t;l++;k=0}q.firstChild.style.transitionDelay=(l*140+(k++)*35)+'ms'});
requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.add('ix-sale')})})};
var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting)toca(x.target);else x.target.classList.remove('ix-sale')})},{threshold:.15});
$$('.h-indice h1,main .sec h2').forEach(function(el){parte(el);io.observe(el)});
/* titulares que se deslizan un poco con el desplazamiento */
var ds=$$('main .sec h2');ds.forEach(function(d){d.classList.add('ix-desliza')});
/* portada viva */
es.classList.add('viva');viva=true;
var q=function(s){return es.querySelector(s)},b1=q('.ix-b1'),b2=q('.ix-b2'),lema=q('.ix-lema'),h1=q('h1'),tj=q('.ix-tarjeta'),ru=q('.ix-rueda ul'),nr=ru?ru.children.length:0,tus=$$('.ix-tunel figure',es),lms=$$('.ix-lm',es);
lms.forEach(parte);
var cl=function(x,a,b){return Math.min(1,Math.max(0,(x-a)/(b-a)))},ez=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
var on=false,kk=-1;
/* monograma: capas apiladas en Z; gira con el desplazamiento y se oculta al llegar al pie */
var fl=D.querySelector('.ix-flot'),cu=fl&&fl.firstElementChild;
if(cu){var base=cu.firstElementChild;for(var z=1;z<9;z++){var c=base.cloneNode(true);c.style.transform='translateZ('+z+'px)';if(z===8)c.className='cara';cu.appendChild(c)}fl.hidden=false;
var pie=D.querySelector('footer');if(pie)new IntersectionObserver(function(e){fl.classList.toggle('fuera',e[0].isIntersecting)}).observe(pie)}
var tick=false;
var paso=function(){tick=false;var r=es.getBoundingClientRect();p=cl(-r.top,0,r.height-innerHeight);
if(tj)tj.style.transform='translate3d(0,'+(64*(1-ez(cl(p,0,.09)))).toFixed(2)+'%,0)';
if(ru){var k=Math.min(nr-1,Math.floor(cl(p,.03,.16)*nr));if(k!==kk){kk=k;ru.style.transform='translateY('+(-k*2.3).toFixed(1)+'em)'}}
h1.style.transform='scale('+(1+.08*cl(p,0,.3)).toFixed(4)+')';
b1.style.transform='scaleX('+ez(cl(p,.14,.3)).toFixed(4)+')';
tus.forEach(function(f,i){var a=.28+i*(.26/Math.max(tus.length,1));f.style.transform='scale('+ez(cl(p,a,a+.2)).toFixed(4)+')'});
if(lema){var v=p>.655;if(v!==on){on=v;lema.classList.toggle('ver',v);lms.forEach(function(el){if(v)toca(el);else el.classList.remove('ix-sale')})}
lema.style.transform='scale('+(1.14-.14*ez(cl(p,.655,.84))).toFixed(4)+')'}
b2.style.transform='scaleX('+ez(cl(p,.86,.98)).toFixed(4)+')';
ds.forEach(function(d){var g=d.getBoundingClientRect();if(g.bottom<-200||g.top>innerHeight+200)return;d.style.transform='translate3d('+(((g.top+g.height/2-innerHeight/2)/innerHeight)*-3.5).toFixed(2)+'%,0,0)'});
if(cu){var y=scrollY;cu.style.transform='rotateX('+(Math.cos(y/620)*16).toFixed(2)+'deg) rotateY('+(Math.sin(y/430)*44).toFixed(2)+'deg)'}
osc()};
addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(paso)}},{passive:true});addEventListener('resize',paso);paso();
})();</script>`;
