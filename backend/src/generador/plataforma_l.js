// Opción L "Plataforma con efecto de cursor" (14-nov-2026): estructura de las páginas de producto tipo plataforma (portada centrada,
// tarjeta de acción, marco grande con la foto del cliente en lugar de video, explorador de funciones con fotos) y un efecto de
// mouse de fondo CONFIGURABLE por giro: puntos que se apartan, luz que sigue, foto que se distorsiona o estela de tinta.
// Todo es JS y CSS propio (sin GSAP ni librerías externas, sin licencias que resolver). Sin JS, con "reducir movimiento" o en
// celular/tablet táctil la portada queda quieta y completa (fondo suave con el color de la marca).
import { METRICAS } from './tipo_color.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Letra de la L: Instrument Sans (neutra y geométrica, con métricas conocidas) para títulos y texto. */
export const FAMILIA_L = 'Instrument Sans';
export const parPlataforma = (pares = []) => ({ titulos: FAMILIA_L, cuerpo: FAMILIA_L, estilo: pares[0]?.estilo || 'minimalista', ok: !!METRICAS[FAMILIA_L] || true });

export const EFECTOS_L = ['puntos', 'luz', 'distorsion', 'tinta'];

/** Efecto por defecto de cada giro (arquetipo del brief). Se puede fijar uno distinto por cliente con brief.marca.efecto_mouse
 *  o para todos con OPCION_L_EFECTO en el servicio api. */
export const EFECTO_POR_GIRO = {
  servicios: 'puntos', educacion: 'puntos', generico: 'puntos',
  clinica: 'luz', oficios: 'luz',
  inmobiliaria: 'distorsion', turismo: 'distorsion',
  tienda: 'tinta',
};

/** Efecto elegido: cliente → variable de entorno → giro → puntos. Cualquier valor no válido se ignora. */
export function efectoParaBrief(brief = {}, env = process.env) {
  const ok = (v) => (EFECTOS_L.includes(String(v || '').toLowerCase()) ? String(v).toLowerCase() : null);
  return ok(brief.marca?.efecto_mouse) || ok(env.OPCION_L_EFECTO) || EFECTO_POR_GIRO[brief.negocio?.arquetipo] || 'puntos';
}

const ICONO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Zm0 2.3 5.6 3.2L12 11.7 6.4 8.5 12 5.3Zm-6 4.9 5 2.9v5.6l-5-2.8v-5.7Zm7 8.5v-5.6l5-2.9v5.7l-5 2.8Z"/></svg>';

/**
 * Portada + explorador de la opción L.
 * heroFoto: foto del marco · fotoMini: segunda foto flotante (opcional) · fotoFondo: foto para el efecto "distorsion" (opcional,
 * distinta de las otras) · items: [{foto, titulo, texto}] para el explorador (2 a 4) · frases: 1 a 3 textos cortos de la tarjeta.
 * → {html, urls, efecto}
 */
export function portadaPlataformaHTML({ heroFoto = null, fotoMini = null, fotoFondo = null, img, kicker = '', titular = '', subtitulo = '', cta = '', frases = [], items = [], efecto = 'puntos', nombre = '' }) {
  let ef = EFECTOS_L.includes(efecto) ? efecto : 'puntos';
  if (ef === 'distorsion' && !fotoFondo) ef = 'luz'; // sin una segunda foto distinta no hay con qué distorsionar
  const f = frases.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3);
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 44 ? ' h1-m' : '';
  const urls = [];
  const usar = (x, o) => { if (x?.url) urls.push(x.url); return img(x, o); };
  const fondo = ef === 'distorsion' && fotoFondo ? `<img class="pl-bg" src="${esc(fotoFondo.url)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
  if (fondo) urls.push(fotoFondo.url);
  const tarjeta = `<div class="pl-card"><span class="pl-ico">${ICONO}</span><div class="pl-card-t">${f[0] ? `<b>${esc(f[0])}</b>` : ''}${f[1] ? `<span>${esc(f[1])}</span>` : ''}</div>${cta}</div>`;
  const marco = heroFoto
    ? `<div class="wrap pl-marco-w"><div class="pl-marco"><div class="pl-pantalla">${usar(heroFoto, { cls: 'pl-img rep-ok', eager: true, extra: ' fetchpriority="high" sizes="(min-width:1200px) 1100px, 100vw"' })}</div>${fotoMini ? `<div class="pl-mini">${usar(fotoMini, { cls: 'pl-img rep-ok', sizes: '(min-width:900px) 320px, 40vw' })}</div>` : ''}</div></div>`
    : '';
  const hero = `<section class="hero h-plat${heroFoto ? '' : ' sin-foto'}" id="inicio" data-efecto="${ef}"><div class="pl-fx" aria-hidden="true">${fondo}<canvas></canvas><i class="pl-luz"></i></div><div class="wrap pl-cab">${kicker ? `<p class="pl-kick">${esc(kicker)}</p>` : ''}<h1 class="pl-tit${clase}">${esc(titular)}</h1>${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}${tarjeta}</div>${marco}</section>`;

  // Explorador de funciones: lista a la izquierda, foto a la derecha. Sin JS se ven todas las filas con su foto, una debajo de otra.
  const it = items.filter((x) => x?.foto?.url && String(x.titulo || '').trim()).slice(0, 4);
  let expl = '';
  if (it.length >= 2) {
    const filas = it.map((x, k) => `<div class="pl-fila${k === 0 ? ' on' : ''}" data-k="${k}"><button type="button" class="pl-tab" id="pl-t${k}" aria-controls="pl-p${k}" aria-selected="${k === 0}" role="tab"><span class="pl-n">0${k + 1}</span><b>${esc(x.titulo)}</b></button>${x.texto ? `<p class="pl-tx">${esc(x.texto)}</p>` : ''}<div class="pl-pan" id="pl-p${k}" role="tabpanel" aria-labelledby="pl-t${k}">${usar(x.foto, { cls: 'pl-img rep-ok', sizes: '(min-width:900px) 620px, 100vw' })}</div></div>`).join('');
    expl = `<section class="sec pl-expl" id="funciones" aria-label="${esc(nombre || 'Lo que hacemos')}"><div class="wrap"><div class="pl-lista" role="tablist">${filas}</div></div></section>`;
  }
  return { html: hero + expl, urls: [...new Set(urls)], efecto: ef };
}

export const CSS_PLATAFORMA_L = `
body.l-plataforma{--margen:clamp(20px,5vw,72px)}
body.l-plataforma h1,body.l-plataforma h2,body.l-plataforma h3{font-weight:500;letter-spacing:-.035em;line-height:1.05}
.h-plat{position:relative;isolation:isolate;overflow:clip;padding:clamp(88px,13vh,140px) 0 0;text-align:center;background:var(--bg)}
.pl-fx{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:radial-gradient(60% 50% at 50% 18%,color-mix(in srgb,var(--p) 14%,transparent),transparent 72%),radial-gradient(40% 36% at 85% 8%,color-mix(in srgb,var(--acc) 10%,transparent),transparent 70%)}
.pl-fx canvas{position:absolute;inset:0;width:100%;height:100%;display:none}
.pl-luz{position:absolute;inset:0;display:none;background:radial-gradient(circle 340px at var(--mx,50%) var(--my,22%),color-mix(in srgb,var(--p) 34%,transparent),transparent 72%)}
.pl-bg{display:none}
.pl-js .h-plat[data-efecto="puntos"] .pl-fx canvas,.pl-js .h-plat[data-efecto="tinta"] .pl-fx canvas{display:block}
.pl-js .h-plat[data-efecto="luz"] .pl-luz{display:block}
.h-plat[data-efecto="distorsion"] .pl-bg{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.h-plat[data-efecto="distorsion"] .pl-fx::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,var(--bg) 6%,color-mix(in srgb,var(--bg) 80%,transparent) 55%,color-mix(in srgb,var(--bg) 92%,transparent))}
.pl-js .h-plat.pl-gl .pl-fx canvas{display:block}.h-plat.pl-gl .pl-bg{visibility:hidden}
.pl-cab{display:grid;justify-items:center;gap:16px}
.pl-kick{display:inline-flex;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);background:color-mix(in srgb,var(--p) 9%,transparent);padding:8px 16px;border-radius:999px}
.pl-tit{font-size:clamp(36px,6vw,84px);line-height:1;max-width:18ch;text-wrap:balance}.pl-tit.h1-m{font-size:clamp(32px,5.2vw,72px)}.pl-tit.h1-l{font-size:clamp(28px,4.4vw,62px)}
.h-plat .sub{max-width:54ch;font-size:clamp(17px,1.4vw,21px);color:var(--soft)}
.pl-card{display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;margin-top:10px;padding:16px 18px;border-radius:22px;background:color-mix(in srgb,var(--bg) 70%,transparent);border:1px solid var(--bor);backdrop-filter:blur(8px);text-align:left;max-width:min(560px,100%)}
.pl-ico{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:color-mix(in srgb,var(--p) 12%,transparent)}.pl-ico svg{width:24px;height:24px;fill:var(--p)}
.pl-card-t{display:grid;gap:2px;min-width:0;flex:1 1 180px}.pl-card-t b{font-weight:600;font-size:17px}.pl-card-t span{font-size:15px;color:var(--soft)}
.pl-card .btn{margin-top:0}
.pl-marco-w{margin-top:clamp(36px,6vw,72px)}
.pl-marco{position:relative;border-radius:clamp(22px,3vw,40px);background:var(--fg);padding:clamp(8px,1.4vw,16px);transform-origin:50% 0;transform:translateY(calc((1 - var(--pl-p,1))*36px)) scale(calc(.93 + var(--pl-p,1)*.07));will-change:transform}
.pl-pantalla{border-radius:clamp(16px,2vw,28px);overflow:hidden;aspect-ratio:16/9;background:var(--mut)}
.pl-img{width:100%;height:100%;object-fit:cover;display:block}
.pl-mini{position:absolute;right:clamp(14px,4vw,56px);bottom:clamp(-28px,-3vw,-14px);width:clamp(120px,26%,300px);aspect-ratio:4/5;border-radius:18px;overflow:hidden;border:6px solid var(--bg);box-shadow:0 18px 40px rgba(0,0,0,.28)}
.pl-expl{padding-top:clamp(56px,8vw,112px);text-align:left}
.pl-lista{display:grid;gap:28px}
.pl-fila{display:grid;gap:12px}.pl-tab{display:flex;align-items:baseline;gap:14px;text-align:left;font:inherit;color:var(--fg);background:none;border:0;padding:6px 0;cursor:default}.pl-tab b{font-family:var(--ft);font-weight:500;font-size:clamp(22px,2.6vw,34px);letter-spacing:-.03em;line-height:1.1}
.pl-n{font-size:13px;color:var(--soft);letter-spacing:.1em;min-width:28px}.pl-tx{color:var(--soft);max-width:46ch}
.pl-pan{border-radius:20px;overflow:hidden;aspect-ratio:16/10;background:var(--mut)}
@media (min-width:900px){
 .pl-js .pl-lista{grid-template-columns:minmax(0,5fr) minmax(0,7fr);align-items:start;gap:0 56px}
 .pl-js .pl-fila{display:contents}
 .pl-js .pl-fila .pl-tab,.pl-js .pl-fila .pl-tx{grid-column:1}
 .pl-js .pl-fila .pl-pan{grid-column:2;grid-row:1 / span 8;display:none}
 .pl-js .pl-fila.on .pl-pan{display:block}
 .pl-js .pl-tab{cursor:pointer;opacity:.5;padding:14px 0;border-top:1px solid var(--bor);transition:opacity .25s}
 .pl-js .pl-fila.on .pl-tab,.pl-js .pl-tab:hover,.pl-js .pl-tab:focus-visible{opacity:1}
 .pl-js .pl-tx{display:none}.pl-js .pl-fila.on .pl-tx{display:block;padding-bottom:12px}
}
@media (max-width:899px){.pl-pan{aspect-ratio:4/3}}
@media (max-width:700px){.pl-pantalla{aspect-ratio:4/5}.pl-mini{display:none}.pl-card{border-radius:18px}}
@media (prefers-reduced-motion:reduce){.pl-marco{transform:none!important;will-change:auto}}
`;

/** Para la revisión visual: sin canvas encima ni marco a medio escalar. */
export const CSS_REVISION_PLATAFORMA = '.pl-fx canvas,.pl-luz{display:none!important}.pl-marco{transform:none!important}.pl-js .pl-fila .pl-pan{display:block!important}.pl-js .pl-tx{display:block!important}';

export const JS_PLATAFORMA_L = `<script>(function(){var D=document,H=D.querySelector('.h-plat');if(!H)return;
var fx=H.querySelector('.pl-fx'),cv=fx&&fx.querySelector('canvas'),OK=['puntos','luz','distorsion','tinta'];
var ef=H.getAttribute('data-efecto');
try{var q=new URLSearchParams(location.search).get('efecto');if(q&&OK.indexOf(q)>-1){ef=q;H.setAttribute('data-efecto',q)}}catch(e){}
var R=matchMedia('(prefers-reduced-motion: reduce)').matches,T=matchMedia('(hover: none), (max-width: 700px)').matches;
D.documentElement.classList.add('pl-js');
/* Explorador: una foto a la vez en pantallas anchas; las filas se activan con clic, foco o cursor. */
var filas=[].slice.call(D.querySelectorAll('.pl-fila'));
function ver(k){filas.forEach(function(f,i){var on=i===k;f.classList.toggle('on',on);var b=f.querySelector('.pl-tab');if(b)b.setAttribute('aria-selected',on)})}
filas.forEach(function(f,i){var b=f.querySelector('.pl-tab');if(!b)return;b.addEventListener('click',function(){ver(i)});b.addEventListener('focus',function(){ver(i)});b.addEventListener('mouseenter',function(){ver(i)})});
/* Marco: entra escalando suavemente mientras sube. */
var M=H.querySelector('.pl-marco');
if(M&&!R){var tk=0;var calc=function(){tk=0;var r=M.getBoundingClientRect(),h=innerHeight||800;var p=Math.min(1,Math.max(0,(h-r.top)/(h*.62)));M.style.setProperty('--pl-p',p.toFixed(3))};
addEventListener('scroll',function(){if(!tk)tk=requestAnimationFrame(calc)},{passive:true});calc()}
if(R||T||!fx||!cv)return;
var mx=-9999,my=-9999,vivo=false,quieto=0,dentro=true,raf=0,pasos=null;
function rect(){return fx.getBoundingClientRect()}
H.addEventListener('pointermove',function(e){var r=rect();mx=e.clientX-r.left;my=e.clientY-r.top;vivo=true;quieto=0});
H.addEventListener('pointerleave',function(){vivo=false;mx=my=-9999});
function rgb(){var c=(getComputedStyle(H).getPropertyValue('--p')||'').trim(),m=/^#?([0-9a-f]{6})$/i.exec(c);if(!m){m=/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);if(m)return [parseInt(m[1]+m[1],16),parseInt(m[2]+m[2],16),parseInt(m[3]+m[3],16)];return [59,108,246]}var n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255]}
var C=rgb(),dpr=Math.min(devicePixelRatio||1,2),W=0,Hh=0;
function medir(){var r=rect();W=r.width;Hh=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(Hh*dpr)}
function puntos(){var c=cv.getContext('2d'),S=28,P=[],RAD=130;
 function armar(){medir();c.setTransform(dpr,0,0,dpr,0,0);P=[];for(var y=S/2;y<Hh;y+=S)for(var x=S/2;x<W;x+=S)P.push({ox:x,oy:y,x:x,y:y,vx:0,vy:0})}
 armar();
 pasos=function(){c.clearRect(0,0,W,Hh);var col='rgb('+C[0]+','+C[1]+','+C[2]+')';c.fillStyle=col;
  for(var i=0;i<P.length;i++){var p=P[i],dx=p.x-mx,dy=p.y-my,d=Math.sqrt(dx*dx+dy*dy),k=0;
   if(d<RAD&&d>.01){k=1-d/RAD;var f=k*k*5.5;p.vx+=dx/d*f;p.vy+=dy/d*f}
   p.vx+=(p.ox-p.x)*.07;p.vy+=(p.oy-p.y)*.07;p.vx*=.84;p.vy*=.84;p.x+=p.vx;p.y+=p.vy;
   var r=1.2+k*2.4;c.globalAlpha=.22+k*.55;c.beginPath();c.arc(p.x,p.y,r,0,6.2832);c.fill()}
  c.globalAlpha=1};
 return armar}
function tinta(){var c=cv.getContext('2d'),px=-1,py=-1,res=0;
 function armar(){medir();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,Hh);px=py=-1}
 armar();
 pasos=function(){c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.05)';c.fillRect(0,0,W,Hh);c.globalCompositeOperation='source-over';
  if(vivo&&mx>-999){if(px<0){px=mx;py=my}var dx=mx-px,dy=my-py,v=Math.sqrt(dx*dx+dy*dy),n=Math.max(1,Math.ceil(v/6)),r=Math.min(70,26+v*.7);
   for(var i=1;i<=n;i++){var x=px+dx*i/n,y=py+dy*i/n,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+C[0]+','+C[1]+','+C[2]+',.32)');g.addColorStop(1,'rgba('+C[0]+','+C[1]+','+C[2]+',0)');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,6.2832);c.fill()}
   px=mx;py=my;res=0}else{px=-1;if(++res>240){c.clearRect(0,0,W,Hh);res=0}}};
 return armar}
function luz(){var l=H.querySelector('.pl-luz'),x=50,y=22,tx=50,ty=22;
 pasos=function(){if(vivo){var r=rect();tx=mx/r.width*100;ty=my/r.height*100}else{tx=50;ty=22}x+=(tx-x)*.12;y+=(ty-y)*.12;l.style.setProperty('--mx',x.toFixed(2)+'%');l.style.setProperty('--my',y.toFixed(2)+'%')};
 return function(){}}
function distor(){var bg=fx.querySelector('.pl-bg');if(!bg)return null;
 var gl=cv.getContext('webgl',{alpha:false,antialias:false});if(!gl)return null;
 var im=new Image();im.crossOrigin='anonymous';var listo=false,act=0,t0=performance.now();
 var vs='attribute vec2 a;varying vec2 u;void main(){u=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
 var fs='precision mediump float;uniform sampler2D t;uniform vec2 r,m;uniform float a,tm,ia;varying vec2 u;void main(){vec2 d=(u-m)*vec2(r.x/r.y,1.);float s=length(d);float f=exp(-s*5.)*a;vec2 off=normalize(d+vec2(1e-4))*sin(s*30.-tm*3.)*.014*f;float sa=r.x/r.y;vec2 k=vec2(1.);if(sa>ia){k.y=ia/sa;}else{k.x=sa/ia;}vec2 uv=clamp((u-.5)*k+.5+off,0.,1.);gl_FragColor=texture2D(t,uv);}';
 function sh(tp,src){var s=gl.createShader(tp);gl.shaderSource(s,src);gl.compileShader(s);return s}
 var pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pg);
 if(!gl.getProgramParameter(pg,gl.LINK_STATUS))return null;
 gl.useProgram(pg);var bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 var la=gl.getAttribLocation(pg,'a');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
 var U={};['t','r','m','a','tm','ia'].forEach(function(n){U[n]=gl.getUniformLocation(pg,n)});
 var tx=gl.createTexture(),ia=1,fallo=false;
 function armar(){medir();gl.viewport(0,0,cv.width,cv.height)}
 im.onload=function(){try{gl.bindTexture(gl.TEXTURE_2D,tx);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);ia=im.naturalWidth/im.naturalHeight;listo=true;H.classList.add('pl-gl')}catch(e){fallo=true;cambiar('luz')}};
 im.onerror=function(){fallo=true;cambiar('luz')};im.src=bg.currentSrc||bg.src;
 armar();var m0=[.5,.5];
 pasos=function(){if(!listo)return;var r=rect();if(vivo){m0=[mx/r.width,my/r.height];act+=(1-act)*.15}else act*=.94;
  gl.uniform1i(U.t,0);gl.uniform2f(U.r,cv.width,cv.height);gl.uniform2f(U.m,m0[0],m0[1]);gl.uniform1f(U.a,act);gl.uniform1f(U.tm,(performance.now()-t0)/1000);gl.uniform1f(U.ia,ia);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)};
 return armar}
var rearmar=function(){};
function cambiar(n){ef=n;H.setAttribute('data-efecto',n);H.classList.remove('pl-gl');pasos=null;iniciar()}
function iniciar(){var f=ef==='puntos'?puntos:ef==='tinta'?tinta:ef==='luz'?luz:ef==='distorsion'?distor:null;if(!f)return;var a=null;try{a=f()}catch(e){a=null}
 if(a===null){if(ef!=='luz')return cambiar('luz');return}rearmar=a;if(!raf)bucle()}
function bucle(){raf=requestAnimationFrame(function(){raf=0;if(!dentro||D.hidden){return}if(pasos)pasos();bucle()})}
if('IntersectionObserver'in window)new IntersectionObserver(function(es){dentro=es[0].isIntersecting;if(dentro&&!raf&&pasos)bucle()}).observe(H);
D.addEventListener('visibilitychange',function(){if(!D.hidden&&!raf&&pasos)bucle()});
var rt=0;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){try{rearmar()}catch(e){}},150)});
iniciar();
})();</script>`;

/** Post-proceso: la L no necesita librerías; solo deja una marca para los efectos de bloques (movimiento.js ya se aplica). */
export const conEfectosL = (html) => html;
