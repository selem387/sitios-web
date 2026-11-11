// Opción G "Collage en movimiento" (11-nov-2026, pedido de Sebastián con video de referencia).
// Portada con foto de fondo y texto a la izquierda; a la derecha un panel que cambia de acomodo cada 3.6 s
// (tiras verticales → una foto → rejilla → mosaico → una foto). Reglas:
// - Movimiento con CSS/JS (solo transform, opacity y clip-path); sin clips por foto (las fotos "saltaban").
// - Con pocas fotos los acomodos se ajustan a las que hay; nunca dos veces la misma foto en un mismo acomodo.
// - La foto de fondo no entra al panel.
// - Pausa visible (WCAG 2.2.2); con "reducir movimiento" el panel queda quieto en el primer acomodo.
// - Respaldo: MP4 hecho con FFmpeg (generador/clips.js) que solo se usa si el JS no corre o falla.
import { urlCollage, encolarCollage } from './clips.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const MAX_FOTOS_COLLAGE = 9;
export const SEG_ACOMODO = 3.6;

/** Cuántas fotos lleva cada acomodo. */
const CUPO = { una: 1, duo: 2, mos: 3, r2x2: 4, r3x2: 6, r3x3: 9 };

/**
 * Secuencia de acomodos para n fotos (índices de fotos). Cada acomodo usa fotos distintas entre sí y la secuencia
 * reparte el uso para que todas las fotos salgan al menos una vez.
 * → [{tipo, idx:[...]}]
 */
export function acomodosCollage(n) {
  const m = Math.min(n, MAX_FOTOS_COLLAGE);
  if (m <= 0) return [];
  if (m === 1) return [{ tipo: 'una', idx: [0] }];
  if (m === 2) return [{ tipo: 'duo', idx: [0, 1] }, { tipo: 'una', idx: [0] }, { tipo: 'una', idx: [1] }];
  const usos = new Array(m).fill(0);
  let giro = 0;
  // Las menos usadas primero; a igual uso, en orden a partir de un punto que va girando.
  let ultimaUna = -1;
  const tomar = (k) => {
    const orden = [...Array(m).keys()].filter((x) => k > 1 || x !== ultimaUna).sort((a, b) => usos[a] - usos[b] || ((a - giro + m) % m) - ((b - giro + m) % m)).slice(0, k);
    giro = (giro + k) % m;
    orden.forEach((x) => usos[x]++);
    if (k === 1) ultimaUna = orden[0];
    return orden;
  };
  const tiras = [...Array(Math.min(m, 5)).keys()];
  tiras.forEach((x) => usos[x]++);
  giro = tiras.length % m;
  const out = [{ tipo: 'tiras', idx: tiras }];
  if (m === 3) return [...out, { tipo: 'una', idx: tomar(1) }, { tipo: 'mos', idx: tomar(3) }];
  const rej = m >= 9 ? 'r3x3' : m >= 6 ? 'r3x2' : 'r2x2';
  out.push({ tipo: 'una', idx: tomar(1) });
  out.push({ tipo: rej, idx: tomar(CUPO[rej]) });
  out.push({ tipo: 'mos', idx: tomar(3) });
  out.push({ tipo: 'una', idx: tomar(1) });
  return out;
}

/** Rectángulos de cada foto de un acomodo en un lienzo w×h con separación g (mismo acomodo que el CSS). */
export function rectsAcomodo(tipo, k, w, h, g) {
  const rej = (cols, filas, fr = null) => {
    const anchos = fr || new Array(cols).fill(1);
    const tot = anchos.reduce((a, b) => a + b, 0);
    const libreW = w - g * (cols - 1), libreH = h - g * (filas - 1);
    const xs = [], ws = [];
    let x = 0;
    for (const f of anchos) { const ww = Math.round((libreW * f) / tot); xs.push(x); ws.push(ww); x += ww + g; }
    const hh = Math.round(libreH / filas);
    return { xs, ws, hh };
  };
  if (tipo === 'una') return [{ x: 0, y: 0, w, h }];
  if (tipo === 'tiras' || tipo === 'duo') {
    const { xs, ws } = rej(k, 1);
    return xs.map((x, i) => ({ x, y: 0, w: ws[i], h }));
  }
  if (tipo === 'mos') {
    const { xs, ws, hh } = rej(2, 2, [1.6, 1]);
    return [{ x: xs[0], y: 0, w: ws[0], h }, { x: xs[1], y: 0, w: ws[1], h: hh }, { x: xs[1], y: hh + g, w: ws[1], h: h - hh - g }];
  }
  const [cols, filas] = { r2x2: [2, 2], r3x2: [3, 2], r3x3: [3, 3] }[tipo];
  const { xs, ws, hh } = rej(cols, filas);
  const out = [];
  for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) out.push({ x: xs[c], y: f * (hh + g), w: ws[c], h: f === filas - 1 ? h - f * (hh + g) : hh });
  return out;
}

/**
 * HTML del panel. fotos: [{url, alt, ancho, alto}] (sin la foto de fondo). img(x, {cls, eager}) es el de la plantilla.
 * → {html, urls}
 */
export function collageHTML({ fotos = [], img, nombre = '' }) {
  const lista = fotos.slice(0, MAX_FOTOS_COLLAGE);
  const acomodos = acomodosCollage(lista.length);
  if (!acomodos.length) return { html: '', urls: [] };
  const estados = acomodos.map((a) => ({ tipo: a.tipo, urls: a.idx.map((k) => lista[k].url) }));
  const mp4 = acomodos.length > 1 ? urlCollage(estados) : '';
  if (mp4) encolarCollage(estados);
  const capas = acomodos.map((a, e) => {
    const tiles = a.idx.map((k, j) => `<figure class="col-t" style="--k:${j}">${img(lista[k], { cls: 'col-img rep-ok', eager: e === 0 })}</figure>`).join('');
    return `<div class="col-e e-${a.tipo} d${e % 4}${e === 0 ? ' activa' : ''}"${e ? ' aria-hidden="true"' : ''}>${tiles}</div>`;
  }).join('');
  const varias = acomodos.length > 1;
  const pausa = varias ? '<button type="button" class="col-pausa" aria-label="Pausar fotos" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pausa" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/><path class="i-play" d="M8 5l11 7-11 7z"/></svg></button>' : '';
  // Respaldo sin JS: el MP4 encima de la primera capa (si aún no existe, el video queda transparente y se ve la capa).
  const respaldo = mp4 ? `<noscript><video class="col-mp4" src="${esc(mp4)}" autoplay muted loop playsinline aria-hidden="true"></video></noscript>` : '';
  const reg = varias ? ` data-col${mp4 ? ` data-mp4="${esc(mp4)}"` : ''} role="region" aria-roledescription="carrusel" aria-label="${esc(nombre ? `Fotos de ${nombre}` : 'Fotos')}"` : '';
  return { html: `<div class="col${varias ? '' : ' fija'}"${reg}>${capas}${pausa}${respaldo}</div>`, urls: [...new Set(lista.map((x) => x.url))] };
}

export const CSS_COLLAGE = `
/* opción G: collage en movimiento (generador/collage.js) */
.h-col{position:relative;color:#fff;overflow:hidden;isolation:isolate;padding:clamp(36px,6vw,64px) 0 clamp(44px,6vw,72px)}
.h-col>.col-fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none;z-index:-2}
.h-col>.col-velo{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.58),rgba(0,0,0,.74))}
.h-col.sin-fondo{background:var(--banda)}
.h-col .wrap{max-width:1320px}.h-col .col-in{display:grid;gap:clamp(28px,4vw,52px);align-items:center}
.h-col h1{font-size:clamp(38px,8.4vw,72px)}.h-col .sub,.h-col .kicker{color:rgba(255,255,255,.9)}.h-col .info{color:rgba(255,255,255,.86)}
.col{position:relative;width:100%;aspect-ratio:4/3}
.col-e{position:absolute;inset:0;display:grid;gap:8px;visibility:hidden;z-index:0}
.col-e.activa{visibility:visible;z-index:2}.col-e.sale{visibility:visible;z-index:1;opacity:0;transition:opacity .5s ease .75s}
.col:not(.vivo) .col-e:not(.activa){display:none}
.col-t{position:relative;margin:0;min-width:0;min-height:0;overflow:hidden;border-radius:10px;background:rgba(255,255,255,.06);clip-path:inset(0 0 0 100% round 10px)}
.col-e.d1 .col-t{clip-path:inset(100% 0 0 0 round 10px)}.col-e.d2 .col-t{clip-path:inset(0 100% 0 0 round 10px)}.col-e.d3 .col-t{clip-path:inset(0 0 100% 0 round 10px)}
.col-e.activa .col-t,.col-e.sale .col-t,.col.fija .col-t{clip-path:inset(0 round 10px)}
.col.vivo .col-e.activa .col-t{transition:clip-path .9s cubic-bezier(.77,0,.18,1) calc(var(--k,0)*.07s)}
.col-t>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none;transform-origin:50% 50%}
@keyframes colkb{from{transform:scale(1.14)}to{transform:scale(1.02)}}
@keyframes colkb2{from{transform:scale(1)}to{transform:scale(1.1) translate3d(-1.5%,-1%,0)}}
.col-e.activa .col-t>img,.col-e.sale .col-t>img{animation:colkb 4.8s cubic-bezier(.2,.6,.3,1) both}
.col.fija .col-t>img{animation:colkb2 9s ease-in-out infinite alternate}
.col.pausado .col-t>img{animation-play-state:paused}
.e-tiras{grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}.e-una{grid-template:minmax(0,1fr)/minmax(0,1fr)}.e-duo{grid-template-columns:repeat(2,minmax(0,1fr))}
.e-r2x2{grid-template:repeat(2,minmax(0,1fr))/repeat(2,minmax(0,1fr))}.e-r3x2{grid-template:repeat(2,minmax(0,1fr))/repeat(3,minmax(0,1fr))}
.e-r3x3{grid-template:repeat(3,minmax(0,1fr))/repeat(3,minmax(0,1fr))}.e-mos{grid-template:repeat(2,minmax(0,1fr))/minmax(0,1.6fr) minmax(0,1fr)}.e-mos>:first-child{grid-row:span 2}
.col-pausa{position:absolute;right:10px;bottom:10px;z-index:4;width:31px;height:31px;border:0;border-radius:50%;background:rgba(0,0,0,.62);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}
.col-pausa svg{width:14px;height:14px;fill:currentColor}.col-pausa .i-play{display:none}.col.pausado .col-pausa .i-play{display:inline}.col.pausado .col-pausa .i-pausa{display:none}
.col-pausa:focus-visible{outline:3px solid #fff;outline-offset:2px}
.col-mp4{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:3;border-radius:10px}
@media (max-width:600px){.e-tiras>.col-t:nth-child(n+5){display:none}}
@media (min-width:900px){.h-col{min-height:calc(100svh - 69px);display:flex;align-items:center}.h-col>.col-velo{background:linear-gradient(90deg,rgba(0,0,0,.74),rgba(0,0,0,.5) 55%,rgba(0,0,0,.34))}
.h-col .col-in{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}.h-col h1{font-size:clamp(44px,4.6vw,76px)}.col{aspect-ratio:16/11}.col-e{gap:10px}}
@media (prefers-reduced-motion:reduce){.col-t>img{animation:none!important}.col-t{transition:none!important}.col-pausa,.col-mp4{display:none}}
`;

// JS en línea (≈1.2 KB). El panel arranca después de load (las capas 2+ no se descargan antes).
// Si algo falla, se pone el MP4 de respaldo.
export const JS_COLLAGE = `<script>(()=>{const R=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-col]').forEach(c=>{try{
const es=[...c.querySelectorAll('.col-e')],b=c.querySelector('.col-pausa');if(es.length<2)return;if(R){c.classList.add('pausado');return}
let i=0,t=null,usr=false,foco=false,vis=true;
const parado=()=>usr||foco||!vis||document.hidden;
const prep=e=>e&&e.querySelectorAll('img[loading=lazy]').forEach(m=>{m.loading='eager'});
const ir=()=>{const a=es[i];i=(i+1)%es.length;const n=es[i];prep(es[(i+1)%es.length]);a.classList.remove('activa');a.classList.add('sale');a.setAttribute('aria-hidden','true');setTimeout(()=>a.classList.remove('sale'),1400);n.removeAttribute('aria-hidden');n.classList.add('activa')};
const prog=()=>{clearTimeout(t);if(!parado())t=setTimeout(()=>{ir();prog()},${SEG_ACOMODO * 1000})};
const est=()=>{c.classList.toggle('pausado',parado());b.setAttribute('aria-pressed',String(usr));b.setAttribute('aria-label',usr?'Reproducir fotos':'Pausar fotos');prog()};
b.addEventListener('click',()=>{usr=!usr;est()});
c.addEventListener('focusin',e=>{if(e.target.matches(':focus-visible')){foco=true;est()}});c.addEventListener('focusout',e=>{if(!c.contains(e.relatedTarget)){foco=false;est()}});
document.addEventListener('visibilitychange',est);
if('IntersectionObserver'in window)new IntersectionObserver(([e])=>{vis=e.isIntersecting;est()}).observe(c);
const go=()=>{c.classList.add('vivo');prep(es[1]);est()};document.readyState==='complete'?go():addEventListener('load',go,{once:true});
}catch(err){const u=c.dataset.mp4;if(u&&!R&&!c.querySelector('video')){const v=document.createElement('video');v.className='col-mp4';v.muted=v.autoplay=v.loop=v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');v.src=u;c.append(v);v.play().catch(()=>{})}}});})();</script>`;
