// Opción M "Guía en movimiento" (14-nov-2026, pedido de Sebastián a partir de brand.docusign.com; se tomó la lógica de
// diseño —índice numerado, portada que se abre, bloques de foto a pantalla completa— no el contenido ni la marca).
// Qué la distingue:
// - Índice numerado (01, 02…) que se abre a pantalla completa desde un botón; sin JS queda la barra de siempre.
// - Portada: titular enorme que sube letra por letra y una foto del cliente que empieza como tarjeta y se abre hasta
//   llenar la pantalla con el scroll.
// - Recorrido de fotos: en lugar del video que se mueve con el scroll de la referencia, una secuencia de fotos del
//   cliente que se revelan una sobre otra (máscara + acercamiento), con su texto, contador y barra de avance.
// - Frase que se enciende palabra por palabra y cierre con una foto que crece de tarjeta a pantalla completa.
// Técnica: GSAP + ScrollTrigger + SplitType + Lenis (generador/efectos_gsap.js y fx/fx-runtime.js, acciones abre,
// secuencia y cierre). Licencia de GSAP: Sebastián confirmó (14-nov-2026) que su uso está permitido en el creador de sitios.
// Reglas:
// - Solo fotos del cliente; nada de video generado. Solo transform, opacity y clip-path.
// - Sin JS, si las librerías no cargan o con "reducir movimiento": todo queda quieto y completo (fotos una debajo de otra).
// - Las fotos de la portada y del recorrido llevan rep-ok: pueden repetirse en "Nuestro trabajo", que siempre lleva todas.
import { METRICAS } from './tipo_color.js';
import { COMUNES as COMUNES_TITULOS } from './fuentes.js';
import { bandaHTML } from './efectos_gsap.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MAX_PASOS_GUIA = 4;
/** Grotescas con 400, 500 y 700 que no son letras comunes (orden de preferencia). */
export const GROTESCAS_M = ['Instrument Sans', 'Hanken Grotesk', 'Albert Sans', 'Familjen Grotesk', 'Schibsted Grotesk'];

/** Letra de la M: una sola grotesca para títulos y texto; la del estilo del cliente si trae una apta, si no la primera. */
export function parGuia(pares = []) {
  const usadas = pares.flatMap((p) => [p.titulos, p.cuerpo]);
  const apta = (f) => GROTESCAS_M.includes(f) && METRICAS[f]?.pesos?.includes(700) && !COMUNES_TITULOS.has(String(f).toLowerCase());
  const fam = usadas.find(apta) || GROTESCAS_M.find(apta) || GROTESCAS_M[0];
  return { titulos: fam, cuerpo: fam, estilo: pares[0]?.estilo || 'minimalista' };
}

const dos = (n) => String(n).padStart(2, '0');

/**
 * Escena de apertura de la opción M: portada, banda, recorrido de fotos y frase.
 * heroFoto: foto del cliente. pasos: [{foto, titular, apoyo}] (hasta 4). frases: textos cortos de la banda. frase: texto grande.
 * img(x, {cls, eager, sizes, extra}) es el de la plantilla. → {html, urls}
 */
export function escenaGuiaHTML({ heroFoto = null, pasos = [], frases = [], frase = '', img, kicker = '', titular = '', subtitulo = '', cta = '' }) {
  const vistas = new Set(heroFoto ? [heroFoto.url] : []);
  const ps = pasos.filter((x) => x?.foto?.url && !vistas.has(x.foto.url) && vistas.add(x.foto.url)).slice(0, MAX_PASOS_GUIA);
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 46 ? ' h1-m' : '';
  const f = frases.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4);
  const abre = heroFoto
    ? `<div class="gu-abre" data-fx="abre"><div class="gu-abre-fijo"><figure class="gu-abre-foto">${img(heroFoto, { cls: 'gu-img rep-ok', eager: true, extra: ' fetchpriority="high" sizes="100vw"' })}</figure></div></div>`
    : '';
  const cab = `<div class="wrap gu-cab">${kicker ? `<p class="gu-kick">${esc(kicker)}</p>` : ''}<h1 class="gu-tit${clase}" data-fx="titulo" data-fx-split="letras" data-fx-ahora>${esc(titular)}</h1>${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}${cta || ''}</div>`;
  const portada = `<section class="hero h-guia${heroFoto ? '' : ' sin-foto'}" id="inicio">${cab}${abre}</section>`;
  const banda = f.length >= 2 ? bandaHTML(f, { dir: -1, vel: 70, clase: 'gu-banda' }) : '';
  const pie = (x) => `${x.titular ? `<figcaption><span class="gu-num">${esc(x.num)}</span><p class="gu-pt">${esc(x.titular)}</p>${x.apoyo ? `<p class="gu-pa">${esc(x.apoyo)}</p>` : ''}</figcaption>` : ''}`;
  const recorrido = ps.length >= 2
    ? `<section class="gu-sec" id="recorrido" data-fx="secuencia" style="--n:${ps.length}" aria-label="${esc(titular || 'Recorrido')}"><div class="gu-sec-fijo"><div class="gu-escena">${ps.map((x, k) => `<figure class="gu-p">${img(x.foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}${pie({ ...x, num: dos(k + 1) })}</figure>`).join('')}</div><p class="gu-cont" aria-hidden="true"><b>01</b> / ${dos(ps.length)}</p><div class="gu-prog" aria-hidden="true"><i></i></div></div></section>`
    : ps.length === 1
      ? `<section class="gu-sec gu-uno" id="recorrido"><div class="gu-sec-fijo"><div class="gu-escena"><figure class="gu-p">${img(ps[0].foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}${pie({ ...ps[0], num: '01' })}</figure></div></div></section>`
      : '';
  const fr = frase ? `<section class="gu-frase"><div class="wrap"><p data-fx="palabras">${esc(frase)}</p></div></section>` : '';
  return { html: `${portada}${banda}${recorrido}${fr}`, urls: [heroFoto?.url, ...ps.map((x) => x.foto.url)].filter(Boolean) };
}

/** Cierre: foto que crece de tarjeta a pantalla completa con el nombre y el botón. Va antes del pie de la página. */
export function cierreGuiaHTML({ foto = null, img, titulo = '', apoyo = '', cta = '' }) {
  if (!foto) return '';
  return `<section class="gu-cierre" data-fx="cierre" aria-label="${esc(titulo)}"><div class="gu-cierre-fijo"><figure class="gu-cierre-foto">${img(foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}<figcaption><h2 class="gu-cierre-t">${esc(titulo)}</h2>${apoyo ? `<p>${esc(apoyo)}</p>` : ''}${cta || ''}</figcaption></figure></div></section>`;
}

/** Índice numerado a pantalla completa. secciones: [[id, nombre]]. Solo se ve con JS (html.gu-js). */
export function indiceGuiaHTML(secciones = []) {
  const s = secciones.filter((x) => x?.[0] && x?.[1]);
  if (!s.length) return '';
  return `<button type="button" class="gu-ind-b" aria-expanded="false" aria-controls="indice">Índice</button><nav class="gu-ind" id="indice" aria-label="Índice" hidden><ol>${s.map(([id, n], k) => `<li><a href="#${esc(id)}"><span>${dos(k + 1)}</span>${esc(n)}</a></li>`).join('')}</ol></nav>`;
}

export const CSS_GUIA = `
body.l-guia{--margen:clamp(20px,5vw,72px)}
body.l-guia h1,body.l-guia h2,body.l-guia h3{font-weight:500;letter-spacing:-.035em;line-height:1.02}
.h-guia{padding:clamp(96px,14vh,150px) 0 0;overflow:clip}.gu-cab{display:grid;gap:18px}
.gu-kick{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.gu-tit{font-size:clamp(40px,7.4vw,128px);line-height:.94;text-transform:uppercase;max-width:15ch}.gu-tit.h1-m{font-size:clamp(34px,6.2vw,104px)}.gu-tit.h1-l{font-size:clamp(30px,5.2vw,88px)}
.h-guia .sub{max-width:52ch;font-size:clamp(17px,1.4vw,21px)}
.gu-abre{margin:clamp(28px,5vw,64px) var(--margen) 0}.gu-abre-foto{margin:0;border-radius:24px;overflow:hidden;aspect-ratio:16/8;position:relative}
.gu-img{width:100%;height:100%;object-fit:cover;display:block}
.gu-banda{margin-top:clamp(24px,4vw,48px)}
.gu-sec{padding:clamp(40px,7vw,96px) var(--margen)}.gu-escena{display:grid;gap:clamp(16px,2.4vw,32px)}
.gu-p{margin:0;position:relative;border-radius:20px;overflow:hidden;aspect-ratio:16/9;background:var(--soft)}.gu-p img{width:100%;height:100%;object-fit:cover;display:block}
.gu-p figcaption{position:absolute;left:0;right:0;bottom:0;padding:clamp(18px,3vw,44px);color:#fff;background:linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,0));display:grid;gap:6px;max-width:none}
.gu-num{font-size:13px;letter-spacing:.14em}.gu-pt{font-size:clamp(22px,3.2vw,48px);font-weight:500;letter-spacing:-.03em;line-height:1.05;max-width:22ch}.gu-pa{font-size:clamp(15px,1.3vw,19px);max-width:46ch;opacity:.92}
.gu-cont,.gu-prog{display:none}
.gu-frase{padding:clamp(48px,9vw,140px) 0}.gu-frase p{font-size:clamp(26px,4.4vw,68px);font-weight:500;letter-spacing:-.03em;line-height:1.08;max-width:22ch}
.gu-cierre{padding:clamp(32px,6vw,80px) var(--margen)}.gu-cierre-foto{margin:0;position:relative;border-radius:24px;overflow:hidden;min-height:min(80svh,720px);display:grid;align-items:end}
.gu-cierre-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.gu-cierre-foto::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.7),rgba(0,0,0,.05) 70%)}
.gu-cierre-foto figcaption{position:relative;z-index:1;color:#fff;padding:clamp(22px,4vw,64px);max-width:none}.gu-cierre-t{font-size:clamp(34px,6vw,96px);text-transform:uppercase;line-height:.96}
/* índice numerado: solo con JS */
.gu-ind-b,.gu-ind{display:none}
html.gu-js .barra nav{display:none}
html.gu-js .gu-ind-b{display:inline-flex;position:fixed;top:14px;right:var(--margen);z-index:60;min-height:44px;align-items:center;padding:0 20px;border-radius:999px;border:1px solid var(--bor);background:var(--bg);color:var(--fg);font:inherit;font-weight:700;cursor:pointer}
html.gu-js .gu-ind{position:fixed;inset:0;z-index:55;background:var(--banda);color:#fff;padding:clamp(88px,14vh,140px) var(--margen) 40px;overflow:auto;opacity:0;visibility:hidden;transition:opacity .35s ease,visibility 0s linear .35s}
html.gu-js .gu-ind:not([hidden]){display:block}html.gu-js .gu-ind.abierto{opacity:1;visibility:visible;transition:opacity .35s ease}
.gu-ind ol{list-style:none;margin:0;padding:0;display:grid;gap:clamp(6px,1.4vh,14px)}.gu-ind a{display:flex;gap:clamp(14px,2vw,28px);align-items:baseline;font-size:clamp(30px,6vw,84px);font-weight:500;letter-spacing:-.03em;line-height:1.05;color:inherit;text-decoration:none;padding:4px 0}
.gu-ind a span{font-size:.28em;letter-spacing:.1em;opacity:.7}@media (hover:hover){.gu-ind a:hover{opacity:.7}}
/* con los efectos activos (GSAP): tarjeta que se abre y recorrido fijo */
.gu-abre.gu-pin{height:170svh;margin:0}.gu-abre.gu-pin .gu-abre-fijo{position:sticky;top:0;height:100svh;display:grid;place-items:center;padding:0}.gu-abre.gu-pin .gu-abre-foto{width:100%;height:100%;aspect-ratio:auto;border-radius:0}
.gu-sec.gu-pin{height:calc(var(--n) * 90svh + 100svh);padding:0}.gu-sec.gu-pin .gu-sec-fijo{position:sticky;top:0;height:100svh;overflow:hidden}.gu-sec.gu-pin .gu-escena{display:block;position:absolute;inset:0}
.gu-sec.gu-pin .gu-p{position:absolute;inset:0;aspect-ratio:auto;border-radius:0}
.gu-sec.gu-pin .gu-cont{display:block;position:absolute;left:var(--margen);top:clamp(80px,12vh,120px);color:#fff;font-size:14px;letter-spacing:.12em;z-index:2;text-shadow:0 1px 8px rgba(0,0,0,.5)}.gu-sec.gu-pin .gu-cont b{font-size:clamp(28px,4vw,56px);letter-spacing:-.02em;font-weight:500}
.gu-sec.gu-pin .gu-prog{display:block;position:absolute;left:var(--margen);right:var(--margen);bottom:22px;height:3px;background:rgba(255,255,255,.3);border-radius:3px;overflow:hidden;z-index:2}.gu-prog>i{display:block;height:100%;background:#fff;transform:scaleX(0);transform-origin:left}
.gu-sec.gu-pin .gu-p figcaption{padding-bottom:56px}
.gu-cierre.gu-pin{height:170svh;padding:0}.gu-cierre.gu-pin .gu-cierre-fijo{position:sticky;top:0;height:100svh;display:grid;place-items:center}.gu-cierre.gu-pin .gu-cierre-foto{width:100%;height:100%;min-height:0;border-radius:0}
@media (max-width:700px){.gu-abre-foto{aspect-ratio:4/5;border-radius:16px}}
@media (prefers-reduced-motion:reduce){.gu-ind{transition:none!important}}
`;

/** Para la revisión visual: todo quieto y completo (sin fijados ni estados ocultos). */
export const CSS_REVISION_GUIA = '.gu-abre.gu-pin,.gu-sec.gu-pin,.gu-cierre.gu-pin{height:auto!important}.gu-pin .gu-abre-fijo,.gu-pin .gu-sec-fijo,.gu-pin .gu-cierre-fijo{position:static!important;height:auto!important}.gu-sec.gu-pin .gu-escena{position:static!important;display:grid!important}.gu-sec.gu-pin .gu-p{position:relative!important;aspect-ratio:16/9!important;clip-path:none!important}.gu-abre.gu-pin .gu-abre-foto{aspect-ratio:16/8!important;height:auto!important;clip-path:none!important}.gu-cierre.gu-pin .gu-cierre-foto{min-height:min(80svh,720px)!important;height:auto!important;clip-path:none!important}.gu-ind-b,.gu-ind{display:none!important}';

/** Script del índice (sin dependencias): abre y cierra con el botón, Esc o al elegir una sección. */
export const JS_GUIA = `<script>(function(){var H=document.documentElement,b=document.querySelector('.gu-ind-b'),n=document.getElementById('indice');if(!b||!n)return;H.classList.add('gu-js');n.hidden=false;
function abrir(v){n.classList.toggle('abierto',v);b.setAttribute('aria-expanded',v?'true':'false');b.textContent=v?'Cerrar':'Índice';var l=window.FX&&window.FX.lenis&&window.FX.lenis();if(l){v?l.stop():l.start()}else{document.body.style.overflow=v?'hidden':''}}
b.addEventListener('click',function(){abrir(!n.classList.contains('abierto'))});
n.addEventListener('click',function(e){if(e.target.closest('a'))abrir(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&n.classList.contains('abierto')){abrir(false);b.focus()}});
})()</script>`;
