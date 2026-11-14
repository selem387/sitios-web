// Opción P "Ficha en movimiento" (14-nov-2026, pedido de Sebastián a partir de onyxcoffeelab.com; se tomó la lógica de diseño
// —portada oscura con panel de pedido, cinta de texto, fichas con panel emergente y escena fija que cambia de foto al hacer
// scroll— no el contenido ni la marca). Para todos los giros: producto o servicio. La ficha de atributos sale de la oferta
// del cliente (nombre, descripción y precio de cada producto o servicio) y la escena fija de las fotos del slider con sus textos.
// Técnica (medida en la referencia el 14-nov-2026: Shopify + jQuery + Swiper + ScrollReveal + anime.js 3.2.2 + un script propio
// que liga animaciones al scroll, 15 elementos sticky y videos MP4 en bucle): aquí solo CSS nativo y un script mínimo sin
// librerías; los videos se cambian por fotos del cliente con acercamiento lento. No usa GSAP, Lenis ni Swiper.
// Reglas:
// - Solo fotos del cliente; nada de video generado. Solo transform y opacity en lo que se anima.
// - Sin JS o con "reducir movimiento": la escena se lee como bloques seguidos, las fichas muestran su descripción y nada se anima.
// - Las fotos de la portada, de la escena y del cierre llevan rep-ok: pueden repetirse en "Nuestro trabajo".
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dos = (n) => String(n).padStart(2, '0');

export const MAX_PASOS_FICHA = 4;
export const MAX_FICHAS = 8;

/** Letra de la P: el par tipográfico del estilo del cliente (el display da la personalidad, como la letra gótica de la referencia). */
export function parFicha(pares = []) {
  const p = pares[0] || {};
  return { titulos: p.titulos, cuerpo: p.cuerpo, estilo: p.estilo || 'calido' };
}

/** Fichas a partir de la oferta del cliente: [{etiqueta, valor, detalle, precio}]. Si no hay oferta, las líneas de info. */
export function fichasDe(items = [], info = [], etiquetaBase = 'Servicio') {
  const lista = (items || []).map((x) => (typeof x === 'string' ? { nombre: x } : x)).filter((x) => x?.nombre);
  const dest = [...lista.filter((x) => x.destacado), ...lista.filter((x) => !x.destacado)].slice(0, MAX_FICHAS);
  const hechas = dest.map((x) => ({ etiqueta: String(x.grupo || etiquetaBase).trim(), valor: String(x.nombre).trim(), detalle: String(x.descripcion_corta || x.descripcion || '').trim(), precio: String(x.precio_o_rango || x.precio || '').trim() }));
  if (hechas.length >= 2) return hechas;
  const extra = (info || []).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4).map((t) => ({ etiqueta: etiquetaBase, valor: t, detalle: '', precio: '' }));
  return [...hechas, ...extra].slice(0, MAX_FICHAS);
}

/**
 * Portada de la opción P: foto a pantalla completa con acercamiento lento, titular centrado y un panel de pedido con hasta 3
 * opciones reales (nombre y precio) y el botón. heroFoto lleva el único h1. img(x, {cls, eager, sizes, extra}) es el de la plantilla.
 */
export function portadaFichaHTML({ heroFoto = null, img, kicker = '', titular = '', subtitulo = '', opciones = [], cta = '', ctaSec = '' }) {
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 40 ? ' h1-m' : '';
  const chips = opciones.slice(0, 3).map((o) => `<li class="fc-chip"><b>${esc(o.valor)}</b>${o.precio ? `<i>${esc(o.precio)}</i>` : ''}</li>`).join('');
  const html = `<section class="hero h-fc${heroFoto ? '' : ' sin-foto'}" id="inicio">${heroFoto ? `<figure class="fc-fondo">${img(heroFoto, { cls: 'fc-img rep-ok', eager: true, extra: ' fetchpriority="high"', sizes: ' sizes="100vw"' })}</figure>` : ''}<div class="wrap fc-in">${kicker ? `<p class="fc-kick">${esc(kicker)}</p>` : ''}<h1 class="fc-h${clase}">${esc(titular)}</h1>${subtitulo ? `<p class="fc-sub">${esc(subtitulo)}</p>` : ''}<div class="fc-panel">${chips ? `<ul class="fc-opc" aria-label="Lo que más piden">${chips}</ul>` : ''}<div class="fc-bots">${cta || ''}${ctaSec || ''}</div></div></div></section>`;
  return { html, urls: heroFoto ? [heroFoto.url] : [] };
}

/** Cinta de texto que corre (CSS). Decorativa: los mismos textos ya están en la página. */
export function cintaFichaHTML(frases = []) {
  const f = [...new Set(frases.map((x) => String(x || '').trim()).filter(Boolean))].slice(0, 6);
  if (f.length < 2) return '';
  const una = f.map((x) => `<span>${esc(x)}</span>`).join('');
  return `<div class="fc-cinta" aria-hidden="true"><div class="fc-cinta-in">${una}${una}${una}${una}</div></div>`;
}

/** Ficha de atributos: tarjetas con etiqueta y valor; con JS, "Más" abre un panel con la descripción y el precio. */
export function atributosFichaHTML({ fichas = [], titulo = 'En pocas palabras', intro = '', cta = '' }) {
  if (fichas.length < 2) return '';
  const tarjetas = fichas.map((x, k) => {
    const hay = !!(x.detalle || x.precio);
    return `<li class="fc-tile${hay ? ' con-mas' : ''}"><span class="fc-n" aria-hidden="true">${dos(k + 1)}</span><p class="fc-et">${esc(x.etiqueta)}</p><h3 class="fc-val">${esc(x.valor)}</h3>${hay ? `<div class="fc-det">${x.detalle ? `<p>${esc(x.detalle)}</p>` : ''}${x.precio ? `<p class="fc-pr">${esc(x.precio)}</p>` : ''}</div><button type="button" class="fc-mas" aria-haspopup="dialog" aria-label="Más sobre ${esc(x.valor)}">Más</button>` : ''}</li>`;
  }).join('');
  return `<section class="sec fc-attr" id="ficha"><div class="wrap"><h2>${esc(titulo)}</h2>${intro ? `<p class="fc-intro">${esc(intro)}</p>` : ''}<ul class="fc-grid">${tarjetas}</ul></div><dialog class="fc-dlg" id="fc-dlg" aria-labelledby="fc-dlg-t"><div class="fc-dlg-in"><button type="button" class="fc-x" aria-label="Cerrar">&#10005;</button><p class="fc-et" id="fc-dlg-e"></p><h3 id="fc-dlg-t"></h3><div id="fc-dlg-d"></div>${cta ? `<div class="fc-dlg-cta">${cta}</div>` : ''}</div></dialog></section>`;
}

/**
 * Escena fija: las fotos del slider con su texto. Con JS y sin "reducir movimiento" el escenario se queda fijo y la foto cambia
 * al hacer scroll; si no, cada paso es un bloque normal (foto y texto) y se lee completo. → {html, urls}
 */
export function escenaFichaHTML({ pasos = [], img, etiqueta = '' }) {
  const vistas = new Set();
  const ps = pasos.filter((x) => x?.foto?.url && !vistas.has(x.foto.url) && vistas.add(x.foto.url)).slice(0, MAX_PASOS_FICHA);
  if (ps.length < 2) return { html: '', urls: [] };
  const n = ps.length;
  const bloques = ps.map((x, k) => `<article class="fc-paso${k === 0 ? ' on' : ''}" data-i="${k}"><figure class="fc-pf">${img(x.foto, { cls: 'fc-pimg rep-ok', extra: ' sizes="100vw"' })}</figure><div class="wrap fc-cap"><p class="fc-num"><b>${dos(k + 1)}</b> / ${dos(n)}</p>${x.titular ? `<p class="fc-t">${esc(x.titular)}</p>` : ''}${x.apoyo ? `<p class="fc-ap">${esc(x.apoyo)}</p>` : ''}</div></article>`).join('');
  const html = `<section class="fc-esc" id="recorrido" style="--n:${n}"${etiqueta ? ` aria-label="${esc(etiqueta)}"` : ''}><div class="fc-stage"><div class="fc-pasos">${bloques}</div><div class="fc-prog" aria-hidden="true"><i></i></div></div></section>`;
  return { html, urls: ps.map((x) => x.foto.url) };
}

/** Cierre: foto a pantalla completa con el nombre y el botón. Va antes del pie. */
export function cierreFichaHTML({ foto = null, img, titulo = '', apoyo = '', cta = '' }) {
  if (!foto) return '';
  return `<section class="fc-cierre" aria-label="${esc(titulo)}"><figure class="fc-cf">${img(foto, { cls: 'rep-ok', extra: ' sizes="100vw"' })}</figure><div class="wrap fc-ct"><h2 class="fc-cierre-t">${esc(titulo)}</h2>${apoyo ? `<p>${esc(apoyo)}</p>` : ''}${cta || ''}</div></section>`;
}

/** Aptitud: la P sale a todos los giros; solo pide al menos una foto del cliente para la portada. */
export const aptaFicha = (fotos = []) => fotos.filter((x) => x?.url).length >= 1;

export const CSS_FICHA = `
body.l-ficha{--margen:clamp(20px,5vw,72px)}
body.l-ficha h1,body.l-ficha h2,body.l-ficha h3{letter-spacing:-.01em;line-height:1.04}
body.l-ficha .barra{background:color-mix(in srgb,var(--bg) 94%,transparent)}
/* portada */
.h-fc{position:relative;padding:0;overflow:clip;min-height:clamp(520px,90svh,880px);display:grid;align-items:end;color:#fff;background:var(--banda,#111)}
.fc-fondo{position:absolute;inset:0;margin:0}.fc-img{width:100%;height:100%;object-fit:cover;display:block}
.h-fc::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.78),rgba(0,0,0,.18) 58%,rgba(0,0,0,.42));pointer-events:none}
.fc-in{position:relative;z-index:1;width:100%;display:grid;gap:12px;justify-items:center;text-align:center;padding-top:clamp(72px,10vw,120px);padding-bottom:clamp(24px,4vw,48px)}
.fc-kick{font-size:13px;letter-spacing:.16em;text-transform:uppercase;opacity:.92}
.fc-h{font-size:clamp(36px,7.4vw,96px);line-height:.98;max-width:18ch;margin:0;text-wrap:balance}.fc-h.h1-m{font-size:clamp(32px,6.2vw,80px)}.fc-h.h1-l{font-size:clamp(28px,5vw,64px)}
.fc-sub{max-width:48ch;font-size:clamp(16px,1.4vw,20px);opacity:.96;margin:0}
.fc-panel{width:min(100%,560px);margin-top:clamp(14px,3vw,28px);display:grid;gap:12px;padding:14px;border:1px solid rgba(255,255,255,.32);border-radius:20px;background:rgba(0,0,0,.5)}
.fc-opc{list-style:none;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.fc-chip{display:inline-flex;align-items:baseline;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.4);font-size:14px}.fc-chip b{font-weight:700}.fc-chip i{font-style:normal;opacity:.85}
.fc-bots{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center}.fc-bots .btn{margin-top:0;flex:1 1 220px}
@media (prefers-reduced-motion:no-preference){.fc-img{animation:fc-kb 26s ease-in-out infinite alternate}@keyframes fc-kb{from{transform:scale(1.02)}to{transform:scale(1.14)}}}
/* cinta */
.fc-cinta{overflow:hidden;background:var(--banda,#111);color:#fff;border-block:1px solid rgba(255,255,255,.14)}
.fc-cinta-in{display:flex;width:max-content;gap:clamp(28px,5vw,64px);padding:14px 0;font-size:clamp(14px,1.3vw,18px);letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}.fc-cinta-in span::after{content:"\\2022";margin-left:clamp(28px,5vw,64px);opacity:.6}
@media (prefers-reduced-motion:no-preference){.fc-cinta-in{animation:fc-cinta 38s linear infinite}.fc-cinta:hover .fc-cinta-in{animation-play-state:paused}@keyframes fc-cinta{to{transform:translateX(-25%)}}}
@media (prefers-reduced-motion:reduce){.fc-cinta-in{width:auto;flex-wrap:wrap;justify-content:center;padding-inline:20px}.fc-cinta-in span:nth-child(n+7){display:none}}
/* fichas */
.fc-intro{max-width:56ch;color:var(--soft);margin:-6px 0 22px}
.fc-grid{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:12px}
.fc-tile{position:relative;display:flex;flex-direction:column;gap:6px;padding:18px 16px 16px;border:1px solid var(--bor);border-radius:18px;background:var(--card);min-height:150px}
.fc-n{width:36px;height:36px;border-radius:50%;border:1px solid var(--bor);display:grid;place-items:center;font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--soft)}
.fc-et{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin:6px 0 0}
.fc-val{font-size:clamp(18px,2vw,24px)}
.fc-det{color:var(--soft);font-size:14px}.fc-det p+p{margin-top:4px}.fc-pr{font-weight:700;color:var(--fg)}
.fc-mas{display:none}
html.fc-js .fc-det{display:none}
html.fc-js .fc-mas{display:inline-flex;align-self:flex-start;margin-top:auto;min-height:44px;align-items:center;padding:0 16px;border-radius:999px;border:1px solid var(--fg);background:transparent;color:var(--fg);font:inherit;font-weight:700;cursor:pointer}
.fc-mas:focus-visible,.fc-x:focus-visible{outline:3px solid var(--acc);outline-offset:2px}
@media (hover:hover){html.fc-js .fc-mas:hover{background:var(--fg);color:var(--bg)}}
.fc-dlg{border:0;padding:0;border-radius:22px;max-width:min(92vw,480px);width:100%;background:var(--card);color:var(--fg);margin:auto}
.fc-dlg::backdrop{background:rgba(0,0,0,.62)}
.fc-dlg-in{position:relative;padding:28px 24px 24px;display:grid;gap:10px}.fc-dlg h3{font-size:clamp(22px,3vw,30px)}.fc-dlg-cta .btn{margin-top:8px}
.fc-dlg .ri{opacity:1!important;translate:none!important;transition:none!important}
.fc-x{position:absolute;right:10px;top:10px;width:44px;height:44px;border-radius:50%;border:1px solid var(--bor);background:transparent;color:var(--fg);font-size:16px;cursor:pointer}
@media (prefers-reduced-motion:no-preference){.fc-dlg[open]{animation:fc-in .28s ease both}@keyframes fc-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}}
/* escena fija: sin JS cada paso es un bloque normal */
.fc-esc{position:relative;margin:clamp(24px,5vw,64px) 0}
.fc-pasos{display:grid;gap:clamp(24px,4vw,48px)}
.fc-paso{position:relative;display:grid;min-height:clamp(360px,64svh,620px);align-items:end;color:#fff;background:var(--banda,#111);overflow:hidden}
.fc-pf{position:absolute;inset:0;margin:0}.fc-pimg{width:100%;height:100%;object-fit:cover;display:block}
.fc-paso::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.72),rgba(0,0,0,.06) 70%);pointer-events:none}
.fc-cap{position:relative;z-index:1;width:100%;display:grid;gap:8px;padding-top:32px;padding-bottom:clamp(28px,5vw,64px)}
.fc-num{font-size:13px;letter-spacing:.14em}.fc-num b{font-size:22px;letter-spacing:-.01em}
.fc-t{font-family:var(--ft);font-size:clamp(28px,5vw,68px);line-height:1;max-width:18ch}.fc-ap{max-width:46ch;font-size:clamp(15px,1.3vw,19px);opacity:.95}
.fc-prog{display:none}
@media (prefers-reduced-motion:no-preference){
html.fc-pin .fc-esc{height:calc(var(--n)*100svh);margin:0}
html.fc-pin .fc-stage{position:sticky;top:0;height:100svh;overflow:hidden}
html.fc-pin .fc-pasos{display:block;height:100%}
html.fc-pin .fc-paso{position:absolute;inset:0;min-height:0;opacity:0;transition:opacity .7s ease;pointer-events:none}
html.fc-pin .fc-paso.on{opacity:1;pointer-events:auto;z-index:1}
html.fc-pin .fc-pimg{transform:scale(1.12);transition:transform 1.6s ease}html.fc-pin .fc-paso.on .fc-pimg{transform:scale(1)}
html.fc-pin .fc-cap{transform:translateY(18px);opacity:0;transition:transform .7s ease .15s,opacity .7s ease .15s}html.fc-pin .fc-paso.on .fc-cap{transform:none;opacity:1}
html.fc-pin .fc-prog{display:block;position:absolute;left:var(--margen);right:var(--margen);bottom:clamp(14px,2.4vw,26px);height:3px;background:rgba(255,255,255,.28);z-index:2}
html.fc-pin .fc-prog i{display:block;height:100%;background:#fff;transform-origin:left;transform:scaleX(calc(var(--k,0) / var(--n)))}
}
/* cierre */
.fc-cierre{position:relative;overflow:clip;display:grid;align-items:end;color:#fff;background:var(--banda,#111);min-height:clamp(440px,76svh,760px)}
.fc-cf{position:absolute;inset:0;margin:0;overflow:hidden}.fc-cf img{position:absolute;left:0;top:-12%;width:100%;height:124%;object-fit:cover;display:block}
.fc-cierre::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.7),rgba(0,0,0,.06) 70%);pointer-events:none}
.fc-ct{position:relative;z-index:1;width:100%;display:grid;gap:10px;justify-items:start;padding-top:clamp(32px,6vw,72px);padding-bottom:clamp(32px,6vw,72px)}.fc-cierre-t{font-size:clamp(34px,6vw,96px);line-height:.98;margin:0}.fc-ct p{font-size:clamp(16px,1.4vw,20px);margin:0}
@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){.fc-cf img{animation:fc-par linear both;animation-timeline:view();animation-range:cover 0% cover 100%}@keyframes fc-par{from{transform:translateY(-9%)}to{transform:translateY(9%)}}}}
@media (max-width:700px){.fc-panel{padding:12px}.fc-chip{font-size:13px}}
`;

/** Para la revisión visual: mide la página quieta (sin acercamiento, sin cinta corriendo, sin escena fija ni parallax). */
export const CSS_REVISION_FICHA = '.fc-img,.fc-cf img,.fc-cinta-in{animation:none!important;transform:none!important}.fc-dlg{display:none!important}.fc-prog{display:none!important}html.fc-pin .fc-esc{height:auto!important;margin:clamp(24px,5vw,64px) 0!important}html.fc-pin .fc-stage{position:static!important;height:auto!important}html.fc-pin .fc-pasos{display:grid!important;height:auto!important}html.fc-pin .fc-paso{position:relative!important;inset:auto!important;opacity:1!important;min-height:clamp(360px,64svh,620px)!important}html.fc-pin .fc-pimg,html.fc-pin .fc-cap{transform:none!important;opacity:1!important}';

/** Script mínimo (sin dependencias): panel emergente de las fichas y escena fija que cambia de foto con el scroll. */
export const JS_FICHA = `<script>(function(){var H=document.documentElement;
var mov=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var dlg=document.getElementById('fc-dlg');
if(dlg&&typeof dlg.showModal==='function'){H.classList.add('fc-js');
var et=document.getElementById('fc-dlg-e'),ti=document.getElementById('fc-dlg-t'),de=document.getElementById('fc-dlg-d');
[].slice.call(document.querySelectorAll('.fc-tile .fc-mas')).forEach(function(b){b.addEventListener('click',function(){var t=b.closest('.fc-tile');
et.textContent=t.querySelector('.fc-et').textContent;ti.textContent=t.querySelector('.fc-val').textContent;de.innerHTML=t.querySelector('.fc-det').innerHTML;dlg.showModal()})});
dlg.querySelector('.fc-x').addEventListener('click',function(){dlg.close()});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()})}
var esc=document.querySelector('.fc-esc');
if(esc&&!mov){H.classList.add('fc-pin');
var ps=[].slice.call(esc.querySelectorAll('.fc-paso')),n=ps.length,cur=-1,tk=false;
function ve(i){if(i===cur)return;cur=i;ps.forEach(function(p,k){p.classList.toggle('on',k===i)});esc.style.setProperty('--k',i+1)}
function mide(){tk=false;var r=esc.getBoundingClientRect(),rec=Math.max(1,esc.offsetHeight-innerHeight),f=Math.min(1,Math.max(0,-r.top/rec));ve(Math.min(n-1,Math.floor(f*n)))}
function pide(){if(!tk){tk=true;requestAnimationFrame(mide)}}
addEventListener('scroll',pide,{passive:true});addEventListener('resize',pide);mide()}
})()</script>`;
