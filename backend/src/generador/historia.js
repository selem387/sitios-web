// Opción I "Historia con scroll" (14-nov-2026, pedido de Sebastián a partir de savor.it; diseño propio, no copia).
// Para giros que se venden con fotos de detalle (alimentos de marca, cosmética, hoteles, inmobiliarias premium,
// interiorismo, joyería): la página se cuenta como una historia que avanza al bajar.
// - Portada a pantalla completa: titular grande con remates que sube palabra por palabra; la foto se aleja al salir.
// - Relato fijo: hasta 4 fotos a pantalla completa que entran una sobre otra (cortina de abajo hacia arriba y
//   acercamiento), cada una con el texto de su diapositiva y puntos de avance.
// - Frase: un texto grande que se va "encendiendo" palabra por palabra al bajar, con dos fotos que flotan a distinto ritmo.
// - Cierre: una foto que empieza como tarjeta y crece hasta llenar la pantalla, con el nombre y el botón.
// Técnica: Motion (scroll ligado al avance, MIT) + Lenis (desplazamiento suave, MIT), servidos desde /vendor/ del API
// (archivos en generador/vendor/). Sin GSAP por su licencia (ver claude/opcion-i-historia.md en el proyecto).
// Reglas:
// - Solo transform, opacity y clip-path; nada de video.
// - Sin JS, si las librerías no cargan o con "reducir movimiento": todo queda quieto y completo (fotos una debajo de otra).
// - Las fotos de la portada y del relato llevan rep-ok: pueden repetirse en "Nuestro trabajo", que siempre lleva todas.
// - El contenido sale del brief igual que en las demás opciones; aquí solo vive lo visual.
import { config } from '../config.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MAX_PASOS = 4;
export const MIN_FOTOS_HISTORIA = 4;
// Giros donde la historia con scroll no conviene: el visitante quiere el teléfono o el precio rápido.
// Manda el subtipo (paletas_giro.js): dentro de "servicios" la fotografía, la arquitectura o una agencia sí la sostienen;
// un despacho contable o legal no. Si no hay subtipo, se decide por arquetipo.
export const SUBTIPOS_SIN_HISTORIA = ['plomero_electricista', 'servicio_local', 'legal', 'contador_consultor', 'servicio_b2b', 'medica', 'veterinaria', 'restaurante', 'cafeteria_panaderia'];
export const ARQUETIPOS_SIN_HISTORIA = ['oficios', 'servicios', 'restaurante'];

export const VENDOR = { motion: 'motion-14.14.0.min.js', lenis: 'lenis-1.3.27.min.js' };
const DIR_VENDOR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vendor');

/** ¿El negocio tiene giro y fotos para la historia? fotosBuenas: fotos del cliente que no son capturas ni de calidad regular. */
export function aptaHistoria(brief = {}, fotosBuenas = 0) {
  const st = brief.negocio?.subtipo;
  if (brief.negocio?.arquetipo === 'restaurante') return false;
  if (st ? SUBTIPOS_SIN_HISTORIA.includes(st) : ARQUETIPOS_SIN_HISTORIA.includes(brief.negocio?.arquetipo)) return false;
  return fotosBuenas >= MIN_FOTOS_HISTORIA;
}

/** Frase grande: primera oración de la historia (o el texto que se pase), hasta ~26 palabras. */
export function fraseDe(texto = '') {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!limpio) return '';
  // Primera oración con cuerpo: se saltan saludos y frases cortas ("¡Hola!", "Soy Blanca.").
  const oraciones = limpio.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [limpio];
  const primera = (oraciones.find((o) => o.trim().split(' ').length >= 6) || oraciones[0]).trim();
  const ps = primera.split(' ');
  return ps.length > 26 ? `${ps.slice(0, 24).join(' ').replace(/[,;:]$/, '')}…` : primera;
}

/**
 * Escena completa de la opción I.
 * heroFoto: foto de portada. pasos: [{foto, titular, apoyo}] (se usan hasta 4). frase: texto grande.
 * flotan: hasta 2 fotos junto a la frase. cierre: {foto, titulo, apoyo}. img(x, {cls, eager, extra}) es el de la plantilla.
 * → {html, urls} (urls: fotos que quedaron en la escena)
 */
export function escenaHistoriaHTML({ heroFoto = null, pasos = [], frase = '', flotan = [], cierre = null, img, kicker = '', titular = '', subtitulo = '', cta = '' }) {
  const vistas = new Set(heroFoto ? [heroFoto.url] : []);
  const ps = pasos.filter((x) => x?.foto?.url && !vistas.has(x.foto.url) && vistas.add(x.foto.url)).slice(0, MAX_PASOS);
  const fl = flotan.filter((x) => x?.url && !vistas.has(x.url) && vistas.add(x.url)).slice(0, 2);
  const fondo = heroFoto ? `${img(heroFoto, { cls: 'hs-fondo rep-ok', eager: true, extra: ' fetchpriority="high" sizes="100vw"' })}<div class="hs-velo"></div>` : '';
  const largo = String(titular || '').trim().split(/\s+/).length > 5 ? ' hs-largo' : '';
  const hero = `<section class="hero hs-hero${heroFoto ? '' : ' sin-fondo'}${largo}">${fondo}<div class="wrap hs-txt">${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}<h1>${esc(titular)}</h1>${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}${cta}</div><span class="hs-baja" aria-hidden="true">Desliza</span></section>`;
  const relato = ps.length >= 2 ? `<section class="hs-relato" style="--n:${ps.length}" aria-label="${esc(titular || 'Nuestra historia')}"><div class="hs-fijo">${ps.map((x, k) => `<figure class="hs-paso">${img(x.foto, { cls: 'rep-ok', sizes: ' sizes="100vw"' })}${x.titular ? `<figcaption><p class="hs-pt">${esc(x.titular)}</p>${x.apoyo ? `<p class="hs-pa">${esc(x.apoyo)}</p>` : ''}</figcaption>` : ''}<span class="hs-num" aria-hidden="true">${String(k + 1).padStart(2, '0')} / ${String(ps.length).padStart(2, '0')}</span></figure>`).join('')}<ol class="hs-puntos" aria-hidden="true">${ps.map(() => '<li></li>').join('')}</ol></div></section>` : '';
  // Con una sola foto de relato no hay historia que contar: va como foto suelta grande.
  const suelta = ps.length === 1 ? `<section class="hs-relato hs-uno"><div class="hs-fijo"><figure class="hs-paso">${img(ps[0].foto, { cls: 'rep-ok', sizes: ' sizes="100vw"' })}${ps[0].titular ? `<figcaption><p class="hs-pt">${esc(ps[0].titular)}</p>${ps[0].apoyo ? `<p class="hs-pa">${esc(ps[0].apoyo)}</p>` : ''}</figcaption>` : ''}</figure></div></section>` : '';
  const poema = frase ? `<section class="hs-poema"><div class="wrap"><p class="hs-frase">${esc(frase)}</p></div>${fl.length ? `<div class="hs-flotan f${fl.length}">${fl.map((x, k) => `<figure class="hs-flota hs-f${k + 1}">${img(x, { cls: 'rep-ok' })}</figure>`).join('')}</div>` : ''}</section>` : '';
  const cf = cierre?.foto?.url ? cierre.foto : null;
  const banner = cf ? `<section class="hs-cierre"><div class="hs-cfijo"><div class="hs-cmarco">${img(cf, { cls: 'rep-ok', sizes: ' sizes="100vw"' })}<div class="hs-cvelo"></div><div class="wrap hs-ctxt">${cierre.titulo ? `<p class="hs-ct">${esc(cierre.titulo)}</p>` : ''}${cierre.apoyo ? `<p class="hs-ca">${esc(cierre.apoyo)}</p>` : ''}${cierre.cta || ''}</div></div></div></section>` : '';
  const html = `<div class="hs" id="inicio">${hero}${relato || suelta}${poema}${banner}</div>`;
  return { html, urls: [heroFoto?.url, ...ps.map((x) => x.foto.url), ...fl.map((x) => x.url), cf?.url].filter(Boolean) };
}

/** Etiquetas <script defer> de Motion y Lenis (servidas por el API en /vendor/). */
export const scriptsHistoria = () => `<script defer src="${esc(config.publicUrl)}/vendor/${VENDOR.motion}"></script><script defer src="${esc(config.publicUrl)}/vendor/${VENDOR.lenis}"></script>`;

/** Sirve /vendor/<archivo> (solo los archivos de VENDOR), con caché larga: el nombre lleva la versión. */
export async function servirVendor(c) {
  const nombre = c.req.param('nombre');
  if (!Object.values(VENDOR).includes(nombre)) return c.text('no', 404);
  const buf = await fs.readFile(path.join(DIR_VENDOR, nombre)).catch(() => null);
  if (!buf) return c.text('no', 404);
  return c.body(buf, 200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' });
}

export const CSS_HISTORIA = `
/* opción I: historia con scroll (generador/historia.js) */
body.l-historia{--hb:69px;overflow-x:clip}
body.l-historia h1,body.l-historia h2,.hs-pt,.hs-frase,.hs-ct{font-family:var(--ft);font-weight:400;letter-spacing:-.02em}
body.l-historia h2{font-size:clamp(34px,5.2vw,72px);line-height:1}
body.l-historia .sec{padding-top:clamp(64px,8vw,112px)}
body.l-historia .btn{border-radius:6px;gap:12px}
body.l-historia .btn::after{content:"";width:26px;height:1px;background:currentColor;order:-1;transition:width .3s}
body.l-historia .btn:hover::after{width:40px}
body.l-historia .paq,body.l-historia blockquote{border-radius:6px}
body.l-historia .galeria.g-car figure,body.l-historia .galeria.g-car img,body.l-historia .retrato{border-radius:4px}
.hs{position:relative}
.hs-hero{position:relative;min-height:calc(100svh - var(--hb));display:flex;align-items:flex-end;color:#fff;overflow:hidden;isolation:isolate;background:var(--banda)}
.hs-fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none;z-index:-2;transform:scale(1.06);will-change:transform}
.hs-velo{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.06) 35%,rgba(0,0,0,.62))}
.hs-txt{width:100%;padding-bottom:clamp(40px,7vw,88px);will-change:transform,opacity}
.hs-hero h1{font-size:clamp(46px,10.5vw,136px);line-height:.94;max-width:12ch}
.hs-largo h1{font-size:clamp(38px,7.2vw,104px);max-width:15ch}
@media (max-width:759px){.hs-hero .sub{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}}
.hs-hero .sub,.hs-hero .kicker{color:rgba(255,255,255,.9)}.hs-hero .btn{background:#fff;color:#141414}
.hs-baja{display:none;position:absolute;right:24px;bottom:28px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.85)}
.hs-baja::after{content:"";display:block;width:1px;height:46px;margin:10px auto 0;background:currentColor;transform-origin:top;animation:hsbaja 2.2s ease-in-out infinite}
@keyframes hsbaja{0%{transform:scaleY(0)}50%{transform:scaleY(1);transform-origin:top}51%{transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
@media (min-width:900px){.hs-baja{display:block}}
/* relato (quieto: fotos una debajo de otra) */
.hs-relato{padding:clamp(48px,6vw,88px) 0 0}
.hs-fijo{display:grid;gap:12px;max-width:1400px;margin:0 auto;padding:0 12px}
.hs-paso{position:relative;margin:0;overflow:hidden;border-radius:4px;aspect-ratio:4/5;background:var(--banda);color:#fff}
@media (min-width:760px){.hs-paso{aspect-ratio:16/9}}
.hs-paso img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.hs-paso::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.6))}
.hs-paso figcaption{position:absolute;left:0;right:0;bottom:0;z-index:1;padding:clamp(22px,5vw,64px);max-width:900px}
@media (max-width:759px){.hs-paso figcaption,.hs-ctxt{padding-bottom:96px}} /* deja libre el botón de WhatsApp */
.hs-pt{font-size:clamp(30px,5.4vw,76px);line-height:1}.hs-pa{margin-top:14px;font-size:clamp(16px,1.6vw,19px);max-width:46ch;opacity:.92}
.hs-num{position:absolute;right:clamp(16px,3vw,40px);top:clamp(16px,3vw,36px);z-index:1;font-size:13px;letter-spacing:.14em;opacity:.85}
.hs-puntos{display:none}
/* frase */
.hs-poema{position:relative;padding:clamp(80px,12vw,180px) 0}
.hs-frase{font-size:clamp(30px,5vw,68px);line-height:1.08;max-width:20ch;margin:0 auto;text-align:center;text-wrap:balance}
.hs-flotan{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:760px;margin:clamp(40px,6vw,72px) auto 0;padding:0 20px}.hs-flotan.f1{grid-template-columns:1fr;max-width:420px}
.hs-flota{margin:0;border-radius:4px;overflow:hidden;aspect-ratio:3/4}.hs-flota img{width:100%;height:100%;object-fit:cover}
/* cierre (quieto: foto ancha con texto) */
.hs-cierre{padding:clamp(24px,4vw,48px) 12px 0}
.hs-cmarco{position:relative;overflow:hidden;border-radius:4px;min-height:min(80svh,760px);display:flex;align-items:flex-end;color:#fff;max-width:1400px;margin:0 auto}
.hs-cmarco>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.hs-cvelo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.6))}
.hs-ctxt{position:relative;width:100%;padding-bottom:clamp(36px,6vw,80px)}
.hs-ct{font-size:clamp(40px,8vw,112px);line-height:.95}.hs-ca{margin-top:12px;font-size:clamp(16px,1.8vw,20px);opacity:.92}.hs-cmarco .btn{background:#fff;color:#141414}
/* historia viva: la clase la pone el JS cuando cargaron las librerías (nunca con "reducir movimiento") */
html.hs-lenis{scroll-behavior:auto!important}html.lenis,html.lenis body{height:auto}.lenis.lenis-stopped{overflow:clip}.lenis [data-lenis-prevent]{overscroll-behavior:contain}
.hs-w{display:inline-block;overflow:hidden;vertical-align:top;padding:.12em .03em .1em;margin:-.12em -.03em -.1em}
.hs-w>span{display:inline-block;transition:transform 1.2s cubic-bezier(.19,1,.22,1)}
.hs-partido:not(.hs-in) .hs-w>span{transform:translateY(112%);transition:none}
.hs-vivo .hs-relato:not(.hs-uno){height:calc(var(--n)*100svh + 40svh);padding:0}
.hs-vivo .hs-relato:not(.hs-uno) .hs-fijo{position:sticky;top:var(--hb);height:calc(100svh - var(--hb));display:block;max-width:none;padding:0;overflow:hidden}
.hs-vivo .hs-relato:not(.hs-uno) .hs-paso{position:absolute;inset:0;aspect-ratio:auto;border-radius:0}
.hs-vivo .hs-relato:not(.hs-uno) .hs-paso+.hs-paso{clip-path:inset(100% 0 0 0)}
.hs-vivo .hs-paso img{will-change:transform}
.hs-vivo .hs-relato:not(.hs-uno) figcaption{opacity:0;will-change:transform,opacity}
.hs-vivo .hs-puntos{display:grid;gap:10px;position:absolute;right:clamp(14px,2.4vw,32px);top:50%;transform:translateY(-50%);z-index:3;list-style:none}
.hs-puntos li{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.45);transition:transform .3s,background .3s}.hs-puntos li.aqui{background:#fff;transform:scale(1.6)}
.hs-vivo .hs-frase .hs-p{opacity:.16;transition:opacity .25s linear}
@media (min-width:900px){
.hs-vivo .hs-poema{min-height:120svh;display:grid;align-content:center}
.hs-vivo .hs-flotan{position:absolute;inset:0;display:block;max-width:none;margin:0;padding:0;pointer-events:none}
.hs-vivo .hs-flota{position:absolute;width:clamp(180px,17vw,280px);will-change:transform}
.hs-vivo .hs-f1{left:4vw;top:8%}.hs-vivo .hs-f2{right:5vw;bottom:6%}
.hs-vivo .hs-frase{max-width:18ch;position:relative;z-index:1}
}
.hs-vivo .hs-cierre{height:210svh;padding:0}
.hs-vivo .hs-cfijo{position:sticky;top:var(--hb);height:calc(100svh - var(--hb));overflow:hidden}
.hs-vivo .hs-cmarco{position:absolute;inset:0;min-height:0;max-width:none;border-radius:0;clip-path:inset(14% 12% round 24px);will-change:clip-path}
.hs-vivo .hs-cmarco>img{will-change:transform}
.hs-vivo .hs-ctxt{opacity:0;will-change:transform,opacity}
@media (prefers-reduced-motion:reduce){.hs-baja::after{animation:none}}
`;

// JS en línea (≈2.5 KB). Sin plantillas de texto ni backticks adentro: va con String.raw para conservar las diagonales.
// Corre en DOMContentLoaded, cuando los <script defer> de Motion y Lenis ya se ejecutaron. Si no están, todo queda quieto.
export const JS_HISTORIA = String.raw`<script>(()=>{
var D=document,H=D.documentElement,hs=D.querySelector('.hs');if(!hs)return;
var $$=function(s,r){return [].slice.call((r||D).querySelectorAll(s))};
var cl=function(x){return Math.min(1,Math.max(0,x))},ez=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
var parte=function(el,cls){var w=D.createTreeWalker(el,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())ns.push(w.currentNode);
ns.forEach(function(n){if(!n.nodeValue.trim())return;var f=D.createDocumentFragment();
n.nodeValue.split(/(\s+)/).forEach(function(t){if(!t)return;if(/^\s+$/.test(t)){f.appendChild(D.createTextNode(' '));return}
var o=D.createElement('span');o.className=cls;if(cls==='hs-w'){var i=D.createElement('span');i.textContent=t;o.appendChild(i)}else o.textContent=t;f.appendChild(o)});
n.parentNode.replaceChild(f,n)})};
var go=function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches||!window.Motion||!Motion.scroll)return;
var M=window.Motion;
try{if(window.Lenis){new Lenis({autoRaf:true,anchors:{offset:-70}});H.classList.add('hs-lenis')}}catch(e){}
var br=D.querySelector('.barra');if(br)D.body.style.setProperty('--hb',br.offsetHeight+'px');
H.classList.add('hs-vivo');
/* portada: el titular sube por palabra; al salir la foto se aleja y el texto sube */
var hero=hs.querySelector('.hs-hero'),h1=hero&&hero.querySelector('h1'),fo=hero&&hero.querySelector('.hs-fondo'),tx=hero&&hero.querySelector('.hs-txt');
if(h1){parte(h1,'hs-w');h1.classList.add('hs-partido');var y0=null,l=-1;$$('.hs-w',h1).forEach(function(q,k){var t=q.offsetTop;if(t!==y0){y0=t;l++}q.firstChild.style.transitionDelay=(l*120+k*28)+'ms'});
requestAnimationFrame(function(){requestAnimationFrame(function(){h1.classList.add('hs-in')})})}
if(hero)M.scroll(function(p){if(fo)fo.style.transform='translate3d(0,'+(p*16).toFixed(2)+'%,0) scale('+(1.06+p*.1).toFixed(4)+')';if(tx){tx.style.transform='translate3d(0,'+(-p*18).toFixed(2)+'%,0)';tx.style.opacity=cl(1-p*1.5).toFixed(3)}},{target:hero,offset:['start start','end start']});
/* relato: cada foto entra con cortina desde abajo y acercamiento; su texto aparece y se va */
var rel=hs.querySelector('.hs-relato:not(.hs-uno)');
if(rel){var ps=$$('.hs-paso',rel),n=ps.length,pts=$$('.hs-puntos li',rel),ims=ps.map(function(f){return f.querySelector('img')}),cap=ps.map(function(f){return f.querySelector('figcaption')}),ak=-1;
M.scroll(function(p){var x=p*n;ps.forEach(function(f,k){
var e=k?ez(cl((x-k+.55)/.55)):1;if(k)f.style.clipPath='inset('+((1-e)*100).toFixed(2)+'% 0 0 0)';
var z=cl(x-k+.55);if(ims[k])ims[k].style.transform='scale('+(1.18-.18*ez(cl(z/1.4))).toFixed(4)+')';
if(cap[k]){var a=cl((x-k+(k?.2:.95))/.35),b=k<n-1?cl((x-k-.7)/.25):0,v=a*(1-b);cap[k].style.opacity=v.toFixed(3);cap[k].style.transform='translate3d(0,'+((1-a)*40-b*30).toFixed(1)+'px,0)'}});
var kk=Math.min(n-1,Math.floor(x));if(kk!==ak){ak=kk;pts.forEach(function(q,k){q.classList.toggle('aqui',k===kk)})}},{target:rel,offset:['start start','end end']})}
/* frase: se enciende palabra por palabra; las fotos flotan a distinto ritmo */
var po=hs.querySelector('.hs-poema'),fr=po&&po.querySelector('.hs-frase');
if(fr){parte(fr,'hs-p');var pw=$$('.hs-p',fr),fl=$$('.hs-flota',po),N=pw.length;
M.scroll(function(p){var x=cl((p-.18)/.5)*N;pw.forEach(function(w,i){w.style.opacity=(.16+.84*cl(x-i)).toFixed(3)});
if(innerWidth>=900)fl.forEach(function(f,k){f.style.transform='translate3d(0,'+((.5-p)*(k?220:-160)).toFixed(1)+'px,0) rotate('+((.5-p)*(k?6:-5)).toFixed(2)+'deg)'})},{target:po,offset:['start end','end start']})}
/* cierre: la foto crece de tarjeta a pantalla completa y entra el texto */
var ci=hs.querySelector('.hs-cierre');
if(ci){var mc=ci.querySelector('.hs-cmarco'),im=mc.querySelector('img'),ct=ci.querySelector('.hs-ctxt');
M.scroll(function(p){var e=ez(cl(p/.62)),r=(1-e)*24;mc.style.clipPath='inset('+((1-e)*14).toFixed(2)+'% '+((1-e)*12).toFixed(2)+'% round '+r.toFixed(1)+'px)';
if(im)im.style.transform='scale('+(1.22-.22*e).toFixed(4)+')';var t=cl((p-.5)/.28);ct.style.opacity=t.toFixed(3);ct.style.transform='translate3d(0,'+((1-t)*36).toFixed(1)+'px,0)'},{target:ci,offset:['start start','end end']})}
};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',go);else go();
})();</script>`;

// Para la revisión visual automática: se mide con todo quieto (fotos del relato una debajo de otra, frase encendida).
export const CSS_REVISION_HISTORIA = '.hs-vivo .hs-relato,.hs-vivo .hs-cierre{height:auto!important;padding:clamp(48px,6vw,88px) 0 0!important}.hs-vivo .hs-fijo,.hs-vivo .hs-cfijo{position:relative!important;top:0!important;height:auto!important;display:grid!important;gap:12px}.hs-vivo .hs-paso,.hs-vivo .hs-cmarco{position:relative!important;inset:auto!important;clip-path:none!important;aspect-ratio:16/9}.hs-vivo .hs-cmarco{min-height:min(80svh,760px)!important}.hs-vivo figcaption,.hs-vivo .hs-ctxt,.hs-vivo .hs-txt{opacity:1!important;transform:none!important}.hs-p{opacity:1!important}.hs-vivo .hs-flotan{position:static!important;display:grid!important}.hs-vivo .hs-flota{position:static!important;transform:none!important}.hs-w>span,.hs-vivo .hs-paso img,.hs-vivo .hs-cmarco>img,.hs-fondo{transform:none!important}.hs-puntos{display:none!important}';
