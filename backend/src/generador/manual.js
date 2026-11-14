// Opción R "Manual de servicios" (14-nov-2026, pedido de Sebastián a partir de compsych.konpo.co, sitio de lineamientos de
// marca hecho en Webflow por Konpo Studio; se tomó la lógica de diseño —secciones numeradas con índice lateral, frase que
// se revela palabra por palabra en una escena fija, fotos con parallax— no el contenido ni la marca).
// Versión "de servicios" (elegida por Sebastián): en lugar de Por qué / Cómo / Qué / Quién / Visión, la página ordena lo
// que el negocio ofrece: la frase que lo distingue, servicios numerados, cómo se trabaja, su trabajo y quiénes son.
// Qué la distingue de las demás:
// - Portada: UNA foto del cliente a pantalla completa con acercamiento lento que se detiene (no hay carrusel ni fundido).
// - Índice lateral numerado (01, 02…) fijo en pantallas anchas; marca la sección que se está leyendo.
// - Declaración: escena fija con la frase del cliente que se enciende palabra por palabra al hacer scroll.
// - Servicios: título fijo a la izquierda y filas numeradas a la derecha (un número por servicio).
// - Trabajo: rejilla de fotos escalonada, cada foto con parallax suave.
// Técnica (medida en la referencia el 14-nov-2026): Webflow con interacciones IX2, jQuery 3.5.1, Lottie, Barba, Swiper, 3 secciones
// con position:sticky, 3 videos MP4 en bucle y 1 canvas. Aquí: CSS nativo (animation-timeline: view() y position:sticky) y un
// script mínimo para el índice. Sin librerías, sin video, sin Lottie y sin Barba (el sitio es una sola página).
// Reglas:
// - Solo fotos del cliente. Solo opacity y transform en lo que se anima. Sin script o sin soporte de view(): todo visible y quieto.
// - Con "reducir movimiento": ninguna animación; la declaración se ve completa y la portada sin zoom.
// - Todas las fotos de trabajo entran en la rejilla (rep-ok), igual que en las otras opciones.
import { METRICAS } from './tipo_color.js';
import { COMUNES as COMUNES_TITULOS } from './fuentes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = (x) => Math.round(x * 10) / 10;
const dos = (n) => String(n).padStart(2, '0');

/** Una sola grotesca para todo (titulares en peso 400, números y etiquetas en 500-600: los pesos que carga urlFuentes). */
export const GROTESCAS_R = ['Hanken Grotesk', 'Albert Sans', 'Instrument Sans', 'Schibsted Grotesk'];

/** Letra de la R: la grotesca del estilo del cliente si es apta; si no, la primera de la lista. */
export function parManual(pares = []) {
  const usadas = pares.flatMap((p) => [p.titulos, p.cuerpo]);
  const apta = (f) => GROTESCAS_R.includes(f) && [400, 500, 600].every((w) => METRICAS[f]?.pesos?.includes(w)) && !COMUNES_TITULOS.has(String(f).toLowerCase());
  const fam = usadas.find(apta) || GROTESCAS_R.find(apta) || GROTESCAS_R[0];
  return { titulos: fam, cuerpo: fam, estilo: pares[0]?.estilo || 'minimalista' };
}

/** Segundos del acercamiento lento de la portada (termina y se queda quieto: no es movimiento infinito). */
export const T_ZOOM_PORTADA = 20;
/** Palabras máximas de la declaración y tramo del scroll (en % del recorrido) donde se encienden. */
export const MAX_PALABRAS = 40;
export const TRAMO_DECL = { ini: 34, ancho: 28, dur: 6 };

/**
 * Portada: una foto a pantalla completa con el titular grande en peso ligero, texto de apoyo y botones.
 * Lleva el único h1. → {html, urls}
 */
export function portadaManualHTML({ heroFoto = null, img, kicker = '', titular = '', subtitulo = '', cta = '', ctaSec = '', etiqueta = '' }) {
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 46 ? ' h1-m' : '';
  const foto = heroFoto ? `<figure class="mn-fig">${img(heroFoto, { cls: 'rep-ok', eager: true, extra: ' fetchpriority="high"', sizes: ' sizes="100vw"' })}</figure>` : '';
  const html = `<section class="hero h-man${heroFoto ? '' : ' sin-foto'}" id="inicio">${foto}<div class="wrap mn-tx">${kicker ? `<p class="mn-kick">${esc(kicker)}</p>` : ''}<h1 class="mn-h${clase}">${esc(titular)}</h1>${subtitulo ? `<p class="mn-sub">${esc(subtitulo)}</p>` : ''}<div class="mn-bots">${cta || ''}${ctaSec || ''}</div></div>${etiqueta ? `<p class="mn-baja" aria-hidden="true"><span>${esc(etiqueta)}</span><i></i></p>` : ''}</section>`;
  return { html, urls: heroFoto ? [heroFoto.url] : [] };
}

/** Índice lateral numerado: [[id, nombre], …]. Solo se muestra en pantallas anchas; el script marca la sección activa. */
export function indiceManualHTML(secciones = []) {
  const s = secciones.filter((x) => x?.[0] && x?.[1]);
  if (s.length < 2) return '';
  return `<nav class="mn-rail" aria-label="Secciones"><ol>${s.map(([id, n], k) => `<li><a href="#${esc(id)}"><span>${dos(k + 1)}</span><b>${esc(n)}</b></a></li>`).join('')}</ol></nav>`;
}

/**
 * Elige la frase de la declaración entre los textos del cliente (en orden de preferencia), sin cambiar una letra:
 * descarta saludos y presentaciones ("¡Hola!", "Soy…", "Me llamo…"), frases que dependen de la anterior ("Lo que…",
 * "Esto…") y las de menos de 8 o más de MAX_PALABRAS palabras. Prefiere la que dice lo que el negocio valora o disfruta.
 */
export function fraseDeclaracion(textos = []) {
  const VALOR = /\b(disfrut\w*|me apasiona|nos apasiona|lo que más|nos importa|me importa|creemos|creo que|cuidamos|buscamos|nuestro objetivo|nuestra misión|mi misión|nos distingue|nos diferencia)\b/i;
  const NO = /^(¡?\s*hola\b|soy\b|me llamo\b|mi nombre\b|somos\b(?!\s+(el|la|los|las|un|una)\b)|lo que\b|esto\b|eso\b|así\b|por eso\b|además\b|también\b)/i;
  const todas = [];
  for (const [k, texto] of textos.entries()) {
    const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
    for (const f of limpio.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []) {
      const s = f.trim(), n = s.split(' ').length;
      if (n >= 8 && n <= MAX_PALABRAS && !NO.test(s)) todas.push({ s, k, valor: VALOR.test(s) });
    }
  }
  return (todas.find((x) => x.valor && x.k === 0) || todas.find((x) => x.k === 0) || todas.find((x) => x.valor) || todas[0])?.s || '';
}

/** Palabras de la declaración, cada una con el tramo de scroll donde se enciende (--s y --e, en %). */
export function palabrasDeclaracion(frase = '') {
  const ps = String(frase).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).slice(0, MAX_PALABRAS);
  const n = ps.length;
  return ps.map((p, k) => {
    const s = TRAMO_DECL.ini + (TRAMO_DECL.ancho * k) / Math.max(n, 1);
    return { p, s: r1(s), e: r1(s + TRAMO_DECL.dur) };
  });
}

/**
 * Declaración: escena fija con la frase del cliente que se enciende palabra por palabra.
 * Sin soporte de animation-timeline o con "reducir movimiento" se ve como una banda normal con la frase completa.
 */
export function declaracionManualHTML({ frase = '', kicker = '', cta = '' }) {
  const ps = palabrasDeclaracion(frase);
  if (ps.length < 4) return '';
  const aria = ps.map((x) => x.p).join(' ');
  const palabras = ps.map((x) => `<span class="mn-w" style="--s:${x.s}%;--e:${x.e}%">${esc(x.p)}</span>`).join(' ');
  const largo = ps.length > 26 ? ' f-l' : ps.length > 16 ? ' f-m' : '';
  return `<section class="mn-decl" aria-label="${esc(aria)}"><div class="mn-decl-in"><div class="wrap">${kicker ? `<p class="mn-kick2">${esc(kicker)}</p>` : ''}<p class="mn-frase${largo}" aria-hidden="true">${palabras}</p>${cta || ''}</div></div></section>`;
}

/**
 * Pone la sección de servicios en dos columnas: título e introducción a la izquierda (fijos al hacer scroll) y las
 * filas numeradas a la derecha. Recibe el HTML de la sección de servicios de las demás opciones; si no reconoce su
 * forma, la devuelve igual (se ve en una sola columna, con la misma numeración).
 */
export function serviciosManualHTML(html = '') {
  const m = String(html).match(/^(<section class="sec" id="servicios"><div class="wrap">)(<h2>[\s\S]*?<\/h2>(?:<p class="sec-intro">[\s\S]*?<\/p>)?)([\s\S]*)(<\/div><\/section>)$/);
  if (!m) return html;
  return `${m[1]}<div class="mn-srv"><div class="mn-srv-h">${m[2]}</div><div class="mn-srv-l">${m[3]}</div></div>${m[4]}`;
}

/**
 * "Nuestro trabajo": rejilla de fotos escalonada; cada foto con parallax suave y su "+ info" por WhatsApp.
 * fotos: todas las de trabajo. info(x) → atributos href/target del WhatsApp de esa foto.
 */
export function trabajoManualHTML({ fotos = [], titulo = '', img, info = () => '' }) {
  const fs = fotos.filter((x) => x?.url);
  if (!fs.length) return '';
  const figs = fs.map((x) => {
    const nombre = x.nombre || '';
    return `<figure class="mn-ph">${img(x, { cls: 'rep-ok', sizes: ' sizes="(min-width:900px) 30vw,48vw"' })}<a class="mn-info"${info(x)} aria-label="Pedir información${nombre ? ` de ${esc(nombre)}` : ' de este trabajo'} por WhatsApp">+ info</a></figure>`;
  }).join('');
  return `<section class="sec" id="trabajo"><div class="wrap"><h2>${esc(titulo)}</h2><div class="mn-gal" data-n="${fs.length}">${figs}</div></div></section>`;
}

/** Cierre tipográfico: el nombre del negocio en grande y el botón. Va antes del pie. */
export function cierreManualHTML({ titulo = '', apoyo = '', cta = '' }) {
  if (!titulo) return '';
  return `<section class="mn-cierre" aria-label="${esc(titulo)}"><div class="wrap"><h2 class="mn-cierre-t">${esc(titulo)}</h2>${apoyo ? `<p class="mn-cierre-a">${esc(apoyo)}</p>` : ''}${cta || ''}</div></section>`;
}

export const CSS_MANUAL = `
body.l-manual{--margen:clamp(20px,5vw,72px)}
body.l-manual h1,body.l-manual h2,body.l-manual h3,body.l-manual h4{font-weight:400;letter-spacing:-.03em;line-height:1.02}
body.l-manual footer{margin-top:0}
body.l-manual .sec{padding:clamp(64px,9vw,128px) 0 8px}
body.l-manual .sec>.wrap>h2{font-size:clamp(34px,5vw,68px);margin-bottom:clamp(20px,3vw,36px)}
/* portada: una foto, acercamiento lento que se detiene */
.h-man{position:relative;padding:0;overflow:clip;background:var(--banda);color:#fff;min-height:clamp(560px,94svh,920px);display:grid;align-items:end}
.mn-fig{position:absolute;inset:0;margin:0;overflow:hidden}.mn-fig img{width:100%;height:100%;object-fit:cover;display:block}
.h-man::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,.3) 60%,rgba(0,0,0,.38));pointer-events:none}
@media (min-width:900px){.h-man::after{background:linear-gradient(90deg,rgba(0,0,0,.66),rgba(0,0,0,.32) 55%,rgba(0,0,0,.1)),linear-gradient(0deg,rgba(0,0,0,.45),rgba(0,0,0,0) 45%)}}
.mn-tx{text-shadow:0 1px 18px rgba(0,0,0,.28)}
.mn-tx{position:relative;z-index:1;width:100%;display:grid;gap:14px;justify-items:start;padding-top:110px;padding-bottom:clamp(64px,9vw,120px)}
.mn-kick{font:600 12px/1.2 var(--fc);letter-spacing:.22em;text-transform:uppercase;margin:0;opacity:.95}
.mn-h{font-family:var(--ft);font-size:clamp(40px,8vw,124px);line-height:.94;max-width:13ch;margin:0;font-weight:400;letter-spacing:-.04em;text-transform:none}.mn-h.h1-m{font-size:clamp(34px,6.6vw,100px)}.mn-h.h1-l{font-size:clamp(30px,5.4vw,84px)}
.mn-sub{max-width:46ch;font-size:clamp(16px,1.4vw,21px);margin:0;opacity:.97}
.mn-bots{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.mn-bots .btn{margin-top:6px}
.mn-baja{position:absolute;z-index:1;right:var(--margen);bottom:clamp(24px,4vw,44px);display:none;align-items:center;gap:12px;font:600 12px/1 var(--fc);letter-spacing:.2em;text-transform:uppercase;margin:0}
.mn-baja i{display:block;width:1px;height:56px;background:rgba(255,255,255,.7)}
@media (min-width:900px){.mn-baja{display:flex}}
/* índice lateral numerado */
.mn-rail{display:none}
@media (min-width:1360px){
.mn-rail{display:block;position:fixed;left:clamp(14px,1.8vw,32px);top:50%;transform:translateY(-50%);z-index:15;mix-blend-mode:normal}
.mn-rail ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.mn-rail a{display:flex;align-items:baseline;gap:10px;text-decoration:none;font:500 13px/1.2 var(--fc);color:var(--fg);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(6px);padding:6px 10px;border-radius:999px;opacity:.7}
.mn-rail span{font-variant-numeric:tabular-nums;font-weight:600}.mn-rail b{font-weight:500;max-width:0;overflow:hidden;white-space:nowrap;transition:max-width .35s ease}
.mn-rail a[aria-current="true"],.mn-rail a:focus-visible,.mn-rail a:hover{opacity:1}
.mn-rail a[aria-current="true"] b,.mn-rail a:focus-visible b,.mn-rail a:hover b{max-width:200px}
.mn-rail a[aria-current="true"]{background:var(--fg);color:var(--bg)}
.mn-rail a:focus-visible{outline:3px solid var(--p);outline-offset:2px}
}
/* declaración: frase del cliente que se enciende palabra por palabra */
.mn-decl{background:var(--banda);color:#fff;margin-top:0}
.mn-decl-in{display:grid;align-content:center;padding:clamp(72px,11vw,150px) 0}
.mn-kick2{font:600 12px/1.2 var(--fc);letter-spacing:.22em;text-transform:uppercase;opacity:.9;margin:0 0 clamp(16px,2.4vw,28px)}
.mn-frase{font-family:var(--ft);font-size:clamp(30px,5.2vw,82px);line-height:1.05;letter-spacing:-.03em;max-width:21ch;margin:0 0 6px}
.mn-frase.f-m{font-size:clamp(26px,4.2vw,64px);max-width:24ch}.mn-frase.f-l{font-size:clamp(24px,3.4vw,52px);max-width:28ch;line-height:1.1}
.mn-decl .btn{margin-top:clamp(20px,3vw,36px)}
/* servicios: título fijo a la izquierda y filas numeradas a la derecha */
.mn-srv{display:grid;gap:clamp(18px,3vw,36px)}
.mn-srv-h h2{margin-bottom:12px}.mn-srv-h .sec-intro{margin:0;max-width:34ch}
.mn-srv-l{counter-reset:srv}
body.l-manual .paqs{display:block}
body.l-manual .paq-grupo{counter-increment:srv;border-top:1px solid var(--fg);padding:clamp(20px,2.6vw,32px) 0 clamp(8px,1.4vw,16px)}
body.l-manual .paq-grupo+.paq-grupo{margin-top:0}
body.l-manual .grupo-t{display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:clamp(14px,2.4vw,32px);font-size:clamp(26px,3.4vw,46px);margin:0 0 14px}
body.l-manual .grupo-t::before{content:counter(srv,decimal-leading-zero);font:600 clamp(13px,1.2vw,16px)/1 var(--fc);letter-spacing:.14em;font-variant-numeric:tabular-nums;color:var(--p)}
body.l-manual .grupo-t::after{display:none}
body.l-manual .paq{background:none;border:0;border-radius:0;padding:14px 0;box-shadow:none}
body.l-manual .paq-grupo .paq{border-top:1px dashed var(--bor);margin-left:calc(clamp(14px,2.4vw,32px) + 2.2em)}
body.l-manual .paq-grupo .paq:first-child{border-top:0}
body.l-manual .mn-srv-l>.paqs>.paq{counter-increment:srv;border-top:1px solid var(--fg);padding:clamp(20px,2.6vw,32px) 0;display:grid;grid-template-columns:auto 1fr;column-gap:clamp(14px,2.4vw,32px)}
body.l-manual .mn-srv-l>.paqs>.paq::before{content:counter(srv,decimal-leading-zero);font:600 clamp(13px,1.2vw,16px)/1.9 var(--fc);letter-spacing:.14em;font-variant-numeric:tabular-nums;color:var(--p);grid-row:1 / span 3}
body.l-manual .mn-srv-l>.paqs>.paq>*{grid-column:2}
body.l-manual .paq-cab h3,body.l-manual .paq-cab h4{font-size:clamp(20px,2.2vw,30px)}
body.l-manual .mn-srv-l>.paqs>.paq .paq-cab h3{font-size:clamp(26px,3.4vw,46px)}
body.l-manual .paq-cab em{font-weight:600}
body.l-manual .mn-srv-l .centro{text-align:left;border-top:1px solid var(--fg);padding-top:clamp(14px,2vw,24px)}
@media (min-width:900px){
.mn-srv{grid-template-columns:minmax(0,.8fr) minmax(0,1.7fr);gap:clamp(32px,5vw,88px);align-items:start}
.mn-srv-h{position:sticky;top:96px}
}
/* proceso: pasos como filas numeradas */
body.l-manual .pasos{display:block}
body.l-manual .pasos li{padding:clamp(18px,2.4vw,28px) 0 clamp(18px,2.4vw,28px) clamp(56px,8vw,96px);border-top:1px solid var(--fg);min-height:0}
body.l-manual .pasos li::before{content:counter(p,decimal-leading-zero);top:clamp(20px,2.6vw,30px);width:auto;height:auto;border-radius:0;background:none;color:var(--p);font:600 clamp(13px,1.2vw,16px)/1.9 var(--fc);letter-spacing:.14em;display:block;font-variant-numeric:tabular-nums}
body.l-manual .pasos .paso-t{font-size:clamp(20px,2.2vw,30px);font-weight:400;letter-spacing:-.02em}
/* trabajo: rejilla escalonada con parallax */
.mn-gal{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(10px,1.6vw,24px);align-items:start}
.mn-ph{position:relative;margin:0;overflow:hidden;aspect-ratio:4/5;background:var(--banda);border-radius:2px}
.mn-ph:nth-child(3n+2){aspect-ratio:1/1}.mn-ph:nth-child(3n){aspect-ratio:3/4}
.mn-ph img{position:absolute;left:0;top:0;width:100%;height:116%;object-fit:cover;display:block}
.mn-info{position:absolute;left:12px;bottom:12px;z-index:2;min-height:40px;padding:0 16px;display:inline-flex;align-items:center;border-radius:999px;background:rgba(255,255,255,.94);color:#111;text-decoration:none;font-weight:600;font-size:15px}
.mn-info:focus-visible{outline:3px solid var(--p);outline-offset:2px}
@media (min-width:900px){.mn-gal{grid-template-columns:repeat(3,minmax(0,1fr))}.mn-ph:nth-child(3n+2){margin-top:clamp(28px,5vw,80px)}}
/* cierre tipográfico */
.mn-cierre{background:var(--banda);color:#fff;padding:clamp(64px,10vw,140px) 0;margin-top:clamp(40px,6vw,96px)}
.mn-cierre-t{font-size:clamp(46px,11vw,170px);line-height:.92;margin:0 0 16px;text-wrap:balance;color:#fff}
.mn-cierre-a{font-size:clamp(16px,1.4vw,20px);margin:0 0 8px;opacity:.94}
/* movimiento: solo con soporte de animation-timeline y sin "reducir movimiento"; si no, todo queda visible y quieto */
@media (prefers-reduced-motion:no-preference){
.mn-fig img{animation:mn-zoom ${T_ZOOM_PORTADA}s cubic-bezier(.2,.7,.2,1) both}
@keyframes mn-zoom{from{transform:scale(1.12)}to{transform:scale(1)}}
}
@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
.mn-decl{height:280svh;view-timeline-name:--mn-decl;view-timeline-axis:block}
.mn-decl-in{position:sticky;top:0;height:100svh;padding:68px 0 0}
.mn-w{opacity:.2;animation:mn-w linear both;animation-timeline:--mn-decl;animation-range:cover var(--s) cover var(--e)}
@keyframes mn-w{from{opacity:.2}to{opacity:1}}
.mn-ph img{animation:mn-par linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
@keyframes mn-par{from{transform:translateY(0)}to{transform:translateY(-13%)}}
}}
@media (hover:hover){.mn-ph img{transition:scale .6s cubic-bezier(.2,.7,.2,1)}.mn-ph:hover img{scale:1.04}.mn-rail a{transition:opacity .2s}}
@media (max-width:700px){.mn-tx{padding-bottom:72px}}
`;

/** Para la revisión visual: página quieta (sin zoom, sin escena fija, frase completa, fotos sin desplazar). */
export const CSS_REVISION_MANUAL = '.mn-decl{height:auto!important}.mn-decl-in{position:static!important;height:auto!important;padding:clamp(72px,11vw,150px) 0!important}.mn-w{animation:none!important;opacity:1!important}.mn-fig img,.mn-ph img{animation:none!important;transform:none!important}.mn-rail,.mn-baja{display:none!important}';

/** Script mínimo (sin dependencias): marca en el índice lateral la sección que se está leyendo. */
export const JS_MANUAL = `<script>(function(){var r=document.querySelector('.mn-rail');if(!r||!('IntersectionObserver' in window))return;
var as=[].slice.call(r.querySelectorAll('a')),mapa={};
as.forEach(function(a){var s=document.getElementById(a.getAttribute('href').slice(1));if(s)mapa[s.id]=a});
function marca(id){as.forEach(function(a){if(a===mapa[id])a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')})}
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)marca(e.target.id)})},{rootMargin:'-45% 0px -50% 0px'});
Object.keys(mapa).forEach(function(id){io.observe(document.getElementById(id))})})()</script>`;
