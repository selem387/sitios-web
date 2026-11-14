// Opción M "Guía en movimiento" — reconstruida el 14-nov-2026 SOLO a partir de brand.docusign.com (pedido de Sebastián:
// nada de las opciones G–L ni de sus librerías internas). Se tomó la lógica de diseño y de movimiento, no contenido ni marca.
//
// Qué se tomó del modelo (estudiado en vivo y en su app.js):
// - Intro: un círculo que se dibuja como barra de carga y una foto dentro de una forma redondeada que se abre.
// - Portada (HomeCarousel): anillo vertical de tarjetas de tamaños distintos (horizontales y verticales) que gira con el
//   scroll o al arrastrar. Mismos números del modelo: radio 1500, profundidad −1200 (−1700 en celular), perspectiva 2000,
//   escala 0.4–0.8, opacidad mínima 0.2, movimiento vertical 0.1 y suavizado 0.1. Entrada con escala 0 y desplazamiento
//   alterno en cascada; al elegir una tarjeta, las tarjetas salen hacia arriba y se va a su sección.
// - Nombre de la tarjeta del frente, grande, abajo a la izquierda; fondo oscuro con una mancha de color difuminada.
// - Tarjeta de texto con frase fija y lista que gira ("Bringing agreements to …").
// - Menú a pantalla completa; encabezado transparente que cambia de color al salir de la portada (ColorSwitch).
// - Páginas interiores: forma fija con fotos que cambian dentro (HeroPhoto/PhotoSticky), filas de palabras que corren en
//   sentidos opuestos (OppositeScroll), bloque que cambia de color con textos que suben (PhotoSticky) y bloque final gigante
//   de color hacia lo siguiente (nextpage).
// - Letra: grotesca geométrica en peso 500 con tracking negativo (DS Indigo en el modelo; aquí Onest, Gabarito o Geist).
// Técnica: GSAP 3.12.7 + ScrollTrigger (los del modelo) + Lenis (el modelo usa scroll suave). Uso de GSAP permitido por
// regla dura del proyecto (14-nov-2026).
// Reglas del proyecto que se respetan:
// - Solo fotos del cliente, sin video generado; cada foto con su proporción real (las tarjetas toman la proporción de su foto).
// - Las fotos de la portada llevan rep-ok (pueden repetirse en "Nuestro trabajo"); las de la forma y del bloque de color
//   nunca son de la portada.
// - Sin JS, si las librerías no cargan o con "reducir movimiento": todo visible, quieto y completo.
import { METRICAS } from './tipo_color.js';
import { COMUNES } from './fuentes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MAX_TARJETAS_M = 22; // las del modelo
export const GROTESCAS_M = ['Onest', 'Gabarito', 'Geist'];

/** Letra de la M: una sola grotesca geométrica para todo; la del estilo del cliente si es una de estas. */
export function parGuia(pares = []) {
  const usadas = pares.flatMap((p) => [p.titulos, p.cuerpo]);
  const apta = (f) => GROTESCAS_M.includes(f) && METRICAS[f]?.pesos?.includes(500) && !COMUNES.has(String(f).toLowerCase());
  const fam = usadas.find(apta) || GROTESCAS_M.find(apta) || GROTESCAS_M[0];
  return { titulos: fam, cuerpo: fam, estilo: pares[0]?.estilo || 'minimalista' };
}

// Tamaños del modelo (ancho relativo al escenario). La altura sale de la proporción real de cada foto (nunca se deforma).
const HORIZ = ['tl', 'tm', 'ts'];
const VERT = ['vl', 'vm'];
const tamDe = (f, k) => ((f.ancho || 4) / (f.alto || 3) >= 1 ? HORIZ[k % HORIZ.length] : VERT[k % VERT.length]);

/**
 * Portada de la M. tarjetas: fotos del cliente (orden de aparición). destinos: [[id, nombre]] de las secciones.
 * lista: textos para la tarjeta de frase (≥ 3 o no sale). video: {url} opcional (miniatura abajo a la derecha).
 */
export function anilloGuiaHTML({ tarjetas = [], destinos = [], frase = '', lista = [], titular = '', subtitulo = '', kicker = '', cta = '', video = null, img }) {
  const fotos = tarjetas.filter((f) => f?.url).slice(0, MAX_TARJETAS_M);
  const dst = destinos.length ? destinos : [['contacto', 'Contacto']];
  const items = lista.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 12);
  const conFrase = items.length >= 3;
  const tarj = [];
  if (conFrase) {
    const [id, nom] = dst[0];
    tarj.push(`<a class="gu-t gu-tx" href="#${esc(id)}" data-label="${esc(nom)}"><span class="gu-tc"><span class="gu-fr">${esc(frase)}</span><span class="gu-ls" aria-hidden="true"><span class="gu-lsi">${items.map((x, k) => `<span${k === 0 ? ' class="on"' : ''}>${esc(x)}</span>`).join('')}</span></span><span class="gu-sr">${esc(items.join(', '))}</span></span></a>`);
  }
  fotos.forEach((f, k) => {
    const [id, nom] = dst[(k + (conFrase ? 1 : 0)) % dst.length];
    const r = (f.ancho && f.alto ? f.ancho / f.alto : 4 / 3).toFixed(4);
    tarj.push(`<a class="gu-t gu-${tamDe(f, k)}" href="#${esc(id)}" data-label="${esc(nom)}" style="--r:${r}" aria-label="${esc(nom)}"><span class="gu-tc">${img(f, { cls: 'rep-ok', eager: k === 0, extra: k === 0 ? ' fetchpriority="high" sizes="(max-width:700px) 86vw, 62vw"' : ' sizes="(max-width:700px) 86vw, 62vw"' })}</span></a>`);
  });
  const primera = tarj.length ? dst[0][1] : '';
  const vid = video?.url
    ? `<button type="button" class="gu-vb" aria-label="Ver video"><video src="${esc(video.url)}" muted playsinline preload="metadata" aria-hidden="true" tabindex="-1"></video><span class="gu-play" aria-hidden="true"></span></button><div class="gu-vp" hidden><button type="button" class="gu-vx" aria-label="Cerrar video">×</button><video src="${esc(video.url)}" controls playsinline preload="none"></video></div>`
    : '';
  const pre = fotos[0] ? `<div class="gu-pre" aria-hidden="true"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="96"/></svg><figure>${img(fotos[0], { cls: 'rep-ok' })}</figure></div>` : '';
  const largo = String(titular).length > 52 ? ' h1-l' : '';
  return `<section class="hero h-guia gu-anillo" id="inicio" style="--n:${tarj.length}">${pre}<div class="gu-fijo"><div class="gu-mancha" aria-hidden="true"></div>`
    + `<div class="gu-cab"><p class="gu-kick">${esc(kicker)}</p><h1 class="gu-h1${largo}"><span>${esc(titular)}</span></h1></div>`
    + `<div class="gu-esc" role="group" aria-roledescription="carrusel" aria-label="${esc(titular)}">${tarj.join('')}</div>`
    + `<div class="gu-pie"><p class="gu-front" aria-live="polite"><b>${esc(primera)}</b></p><div class="gu-acc">${subtitulo ? `<p class="gu-sub">${esc(subtitulo)}</p>` : ''}<div class="gu-btns">${cta}${vid}</div></div></div>`
    + `<p class="gu-ayuda" aria-hidden="true">Desliza</p></div></section>`;
}

/**
 * "Sobre" con la forma del modelo: dos figuras redondeadas que se enciman y una tercera en la intersección, con fotos que
 * cambian dentro al bajar. fotos: hasta 6 (la primera, de preferencia la del dueño, va en la intersección).
 */
export function formaGuiaHTML({ fotos = [], titulo = '', textoA = '', textoB = '', extra = '', img }) {
  const fs = fotos.filter((f) => f?.url).slice(0, 6);
  if (!fs.length) return '';
  const [c, ...resto] = fs;
  const a = resto.filter((_, k) => k % 2 === 0), b = resto.filter((_, k) => k % 2 === 1);
  const capa = (lista) => lista.map((f, k) => img(f, { cls: k ? 'gu-sig' : '', extra: ' sizes="(max-width:700px) 60vw, 30vw"' })).join('');
  const figs = resto.length
    ? `<figure class="gu-fa">${capa(a)}</figure>${b.length ? `<figure class="gu-fb">${capa(b)}</figure>` : ''}<figure class="gu-fc">${capa([c])}</figure>`
    : `<figure class="gu-fb gu-sola">${capa([c])}</figure>`;
  return `<section class="gu-forma" id="sobre"><div class="gu-forma-fijo"><h2 class="gu-ft">${esc(titulo)}</h2><div class="gu-figs${b.length ? '' : ' gu-dos'}">${figs}</div>`
    + `${textoA ? `<p class="gu-ca">${esc(textoA)}</p>` : ''}${textoB || extra ? `<div class="gu-cb">${textoB ? `<p>${esc(textoB)}</p>` : ''}${extra}</div>` : ''}</div></section>`;
}

/** Filas de palabras que corren en sentidos opuestos con el scroll (OppositeScroll + "Principles" del modelo). */
export function apiladasGuiaHTML({ titulo = '', palabras = [] }) {
  const ps = palabras.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4);
  if (ps.length < 2) return '';
  const fila = (x) => `<li class="gu-fila"><span class="gu-pal">${esc(x)}</span>${Array.from({ length: 4 }, () => `<span class="gu-pal gu-eco" aria-hidden="true">${esc(x)}</span>`).join('')}</li>`;
  return `<section class="gu-apil"><h2 class="gu-et">${esc(titulo)}</h2><ul class="gu-filas">${ps.map(fila).join('')}</ul></section>`;
}

/** Bloque que cambia de color con dos frases que suben (PhotoSticky del modelo). foto opcional que se recoge hacia arriba. */
export function colorGuiaHTML({ fraseA = '', fraseB = '', foto = null, pops = [], img }) {
  if (!fraseA) return '';
  const pp = pops.filter((f) => f?.url).slice(0, 2);
  return `<section class="gu-color"><div class="gu-color-fijo"><p class="gu-cx gu-cx1"><span>${esc(fraseA)}</span></p>${fraseB ? `<p class="gu-cx gu-cx2"><span>${esc(fraseB)}</span></p>` : ''}`
    + `${foto ? `<figure class="gu-cfoto">${img(foto, { extra: ' sizes="(max-width:700px) 70vw, 34vw"' })}</figure>` : ''}`
    + `${pp.map((f, k) => `<figure class="gu-pop gu-pop${k + 1}">${img(f, { extra: ' sizes="160px"' })}</figure>`).join('')}</div></section>`;
}

/** Bloque final gigante de color (nextpage del modelo): número y llamada, lleva a WhatsApp. */
export function siguienteGuiaHTML({ numero = '', texto = '', href = '' }) {
  if (!texto) return '';
  return `<section class="gu-sig-b"><a${href}><span class="gu-sn">${esc(numero)}</span><span class="gu-st">${esc(texto)}</span><span class="gu-sf" aria-hidden="true">↗</span></a></section>`;
}

/** Botón "Menú" y menú a pantalla completa con las secciones (solo con JS; sin JS queda la barra de siempre). */
export function menuGuiaHTML(secciones = [], cta = '') {
  const s = secciones.filter((x) => x?.[0] && x?.[1]);
  if (!s.length) return '';
  return `<button type="button" class="gu-mb" aria-expanded="false" aria-controls="gu-menu">Menú</button><nav class="gu-menu" id="gu-menu" aria-label="Menú" hidden><ul>${s.map(([id, n], k) => `<li style="--i:${k}"><a href="#${esc(id)}">${esc(n)}</a></li>`).join('')}</ul>${cta ? `<div class="gu-menu-cta">${cta}</div>` : ''}</nav>`;
}

/** Clase en <html> antes de pintar: activa la intro (si no hay "reducir movimiento"); se apaga sola a los 3.5 s. */
export const HEAD_GUIA = `<script>(function(){var H=document.documentElement;H.classList.add('gu-js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){H.classList.add('gu-intro');setTimeout(function(){H.classList.remove('gu-intro')},3500)}})()</script>`;

export const CDN_GUIA = {
  gsap: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/gsap.min.js',
  st: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.7/ScrollTrigger.min.js',
  lenis: 'https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.min.js',
};

export const CSS_GUIA = `
body.l-guia{--osc:var(--banda);--pad:clamp(20px,4vw,56px);font-family:var(--fc)}
body.l-guia h1,body.l-guia h2,body.l-guia h3,body.l-guia h4{font-family:var(--ft);font-weight:500;letter-spacing:-.03em;line-height:1.02}
body.l-guia h2{font-size:clamp(34px,5vw,72px);margin-bottom:28px}
body.l-guia .sec{padding:clamp(72px,10vw,140px) 0}
body.l-guia .wrap{max-width:1280px;padding:0 var(--pad)}
body.l-guia .btn{border-radius:999px;font-weight:500}
body.l-guia .paq,body.l-guia blockquote,body.l-guia .tr-c figure,body.l-guia .galeria img{border-radius:12px}
html.gu-js body.l-guia .barra{position:fixed;left:0;right:0;background:transparent;backdrop-filter:none;border:0;transition:color .4s ease,background-color .4s ease}
html.gu-js body.l-guia .barra nav{display:none}
html.gu-js body.l-guia .barra .in{max-width:none;padding:0 var(--pad)}
html.gu-js:not(.gu-claro) body.l-guia .barra{color:#fff}
html.gu-js:not(.gu-claro) body.l-guia .barra .logo-claro{display:none}
html.gu-js.gu-claro body.l-guia .barra .logo-osc{display:none}
html.gu-js.gu-claro body.l-guia .barra{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px)}
.logo-osc{display:none}html.gu-js .logo-osc{display:inline-flex}
.gu-mb,.gu-menu{display:none}
html.gu-js .gu-mb{display:inline-flex;position:fixed;top:12px;right:var(--pad);z-index:62;min-height:44px;align-items:center;padding:0 6px;background:none;border:0;color:inherit;font:500 16px/1 var(--fc);cursor:pointer;letter-spacing:-.01em}
html.gu-js:not(.gu-claro) .gu-mb{color:#fff}html.gu-js.gu-claro .gu-mb{color:var(--fg)}
html.gu-js .gu-menu:not([hidden]){display:flex;flex-direction:column;justify-content:center;gap:40px;position:fixed;inset:0;z-index:61;background:var(--osc);color:#fff;padding:96px var(--pad) 48px;opacity:0;visibility:hidden;transition:opacity .45s ease,visibility 0s linear .45s}
html.gu-js .gu-menu.abierto{opacity:1;visibility:visible;transition:opacity .45s ease}
html.gu-menu-on .gu-mb{color:#fff!important}
.gu-menu ul{list-style:none;display:grid;gap:clamp(4px,1vh,12px)}
.gu-menu a{display:inline-block;font:500 clamp(36px,6.4vw,92px)/1.04 var(--ft);letter-spacing:-.035em;color:inherit;text-decoration:none;transform:translateY(40%);opacity:0;transition:transform .7s cubic-bezier(.16,1,.3,1),opacity .5s ease;transition-delay:calc(var(--i) * 45ms)}
.gu-menu.abierto a{transform:none;opacity:1}@media (hover:hover){.gu-menu a:hover{opacity:.6}}
/* portada: anillo de tarjetas */
.h-guia{position:relative;background:var(--osc);color:#fff;overflow:clip}
.gu-fijo{position:relative;min-height:100svh;display:grid;grid-template-rows:auto 1fr auto;padding:clamp(84px,12vh,120px) var(--pad) clamp(20px,4vh,40px);gap:24px}
.gu-mancha{position:absolute;inset:-20%;pointer-events:none;background:radial-gradient(40% 36% at 30% 40%,color-mix(in srgb,var(--p) 70%,transparent),transparent 70%),radial-gradient(36% 40% at 72% 64%,color-mix(in srgb,var(--p) 55%,var(--osc)),transparent 72%);filter:blur(60px);opacity:.75}
.gu-cab{position:relative;z-index:2;text-align:center;display:grid;gap:12px;justify-items:center}
.gu-kick{font-size:13px;letter-spacing:.1em;text-transform:uppercase;opacity:.75}
.gu-h1{font-size:clamp(26px,2.8vw,44px);max-width:28ch;overflow:clip;padding-bottom:.06em}.gu-h1.h1-l{font-size:clamp(24px,2.4vw,38px)}.gu-h1>span{display:inline-block}
.gu-sub{max-width:36ch;opacity:.85;font-size:clamp(15px,1.15vw,18px);line-height:1.4}
.gu-esc{position:relative;z-index:1;display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:8px 0;align-items:center}
.gu-t{flex:0 0 auto;scroll-snap-align:center;display:block;color:#fff;text-decoration:none;width:min(72vw,520px)}
.gu-tc{display:block;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.06)}
.gu-t img{width:100%;aspect-ratio:var(--r);object-fit:cover;display:block}
.gu-tx .gu-tc{display:flex;align-items:center;justify-content:center;gap:.35em;min-height:240px;padding:28px;background:color-mix(in srgb,var(--osc) 82%,#000);font-size:clamp(18px,2vw,28px);letter-spacing:-.01em;border:1px solid rgba(255,255,255,.08)}
.gu-fr{white-space:nowrap;text-align:right}.gu-ls{position:relative;height:9.6em;overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 30%,#000 70%,transparent);mask-image:linear-gradient(transparent,#000 30%,#000 70%,transparent)}
.gu-lsi{display:flex;flex-direction:column;transform:translateY(calc(4.2em - var(--k,0) * 1.2em));transition:transform .9s cubic-bezier(.65,0,.35,1)}
.gu-lsi>span{height:1.2em;line-height:1.2em;white-space:nowrap;opacity:.35;transition:opacity .6s ease}.gu-lsi>span.on{opacity:1}
.gu-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.gu-pie{position:relative;z-index:2;align-self:end;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap}
.gu-front{font:500 clamp(32px,4.4vw,64px)/1 var(--ft);letter-spacing:-.035em;overflow:clip;padding-bottom:.06em}.gu-front b{font-weight:inherit;display:inline-block}
.gu-acc{display:grid;gap:12px;justify-items:end;text-align:right;margin-right:clamp(0px,5vw,72px)}.gu-btns{display:flex;gap:14px;align-items:center}.gu-acc .btn{margin-top:0}
.gu-vb{position:relative;width:132px;aspect-ratio:16/10;border-radius:10px;overflow:hidden;border:0;padding:0;cursor:pointer;background:#000}.gu-vb video{width:100%;height:100%;object-fit:cover;display:block;opacity:.85}
.gu-play{position:absolute;inset:0;margin:auto;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.28);backdrop-filter:blur(6px)}.gu-play::after{content:"";position:absolute;left:16px;top:12px;border:8px solid transparent;border-left:12px solid #fff;border-right:0}
.gu-vp:not([hidden]){position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.92);display:grid;place-items:center;padding:56px var(--pad) 24px}.gu-vp video{max-width:100%;max-height:100%;border-radius:12px}
.gu-vx{position:absolute;top:12px;right:var(--pad);width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:26px;cursor:pointer}
.gu-ayuda,.gu-pre{display:none}
/* con JS: anillo 3D (los números del modelo los aplica el script) */
html.gu-ring .gu-anillo{height:calc(100svh + var(--n) * 26svh)}
html.gu-ring .gu-fijo{position:sticky;top:0;height:100svh;min-height:0}
html.gu-ring .gu-esc{position:absolute;inset:0;display:block;overflow:visible;perspective:2000px;transform-style:preserve-3d;padding:0;cursor:grab;touch-action:pan-y}
html.gu-ring .gu-esc.arrastre{cursor:grabbing}
html.gu-ring .gu-t{position:absolute;left:50%;top:55%;transform-origin:center;will-change:transform,opacity}
html.gu-ring .gu-tl{width:min(62vw,calc(70svh * var(--r)))}html.gu-ring .gu-tm{width:min(50vw,calc(62svh * var(--r)))}html.gu-ring .gu-ts{width:min(40vw,calc(56svh * var(--r)))}
html.gu-ring .gu-vl{width:min(27vw,calc(78svh * var(--r)))}html.gu-ring .gu-vm{width:min(25vw,calc(70svh * var(--r)))}html.gu-ring .gu-tx{width:min(62vw,880px)}
html.gu-ring .gu-ayuda{display:block;position:absolute;z-index:2;left:50%;bottom:clamp(22px,4vh,40px);transform:translateX(-50%);font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.6}
@media (max-width:700px){
  html.gu-ring .gu-tl{width:min(86vw,calc(56svh * var(--r)))}html.gu-ring .gu-tm{width:min(76vw,calc(52svh * var(--r)))}html.gu-ring .gu-ts{width:min(66vw,calc(48svh * var(--r)))}
  html.gu-ring .gu-vl{width:min(56vw,calc(56svh * var(--r)))}html.gu-ring .gu-vm{width:min(50vw,calc(50svh * var(--r)))}html.gu-ring .gu-tx{width:90vw}
  .gu-tx .gu-tc{font-size:17px;padding:20px}.gu-pie{flex-direction:column;align-items:flex-start}.gu-acc{justify-items:start;text-align:left;margin-right:0}.gu-btns{padding-right:64px}html.gu-ring .gu-ayuda{display:none}
}
@media (hover:hover){html.gu-ring .gu-t .gu-tc{transition:box-shadow .3s ease}html.gu-ring .gu-t:hover .gu-tc{box-shadow:0 0 0 2px rgba(255,255,255,.7)}}
/* intro */
html.gu-intro .gu-pre{display:grid;place-items:center;position:fixed;inset:0;z-index:80;background:var(--osc)}
.gu-pre svg{position:absolute;width:min(56vmin,420px);height:auto;fill:none;stroke:rgba(255,255,255,.45);stroke-width:.6;transform:rotate(-90deg)}
.gu-pre circle{stroke-dasharray:604;stroke-dashoffset:604}
.gu-pre figure{width:min(22vmin,170px);aspect-ratio:1;border-radius:22px 50% 50% 22px;overflow:hidden;clip-path:inset(50% 50% 50% 50% round 22px)}.gu-pre img{width:100%;height:100%;object-fit:cover}
html.gu-intro .gu-fijo{visibility:hidden}
/* sobre: forma fija con fotos */
.gu-forma{position:relative;padding:clamp(72px,10vw,120px) var(--pad)}
.gu-forma-fijo{display:grid;gap:28px;justify-items:center;text-align:center}
.gu-ft{font-size:clamp(44px,8vw,128px)!important;margin:0!important}
.gu-figs{position:relative;width:min(560px,82vw);aspect-ratio:1.1}
.gu-figs figure{position:absolute;overflow:hidden;margin:0}.gu-figs img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.gu-fa{left:0;top:32%;width:52%;height:68%;border-radius:16px}
.gu-fb{left:34%;top:0;width:62%;height:72%;border-radius:16px 999px 999px 16px}
.gu-fc{left:34%;top:32%;width:18%;height:40%;border-radius:0;z-index:2}
.gu-dos .gu-fc{left:34%;top:32%;width:18%;height:68%}
.gu-sola{left:12%;top:4%;width:76%;height:92%}
.gu-ca,.gu-cb{max-width:34ch;font-size:clamp(16px,1.25vw,19px);line-height:1.45}
.gu-cb{display:grid;gap:10px}
html.gu-on .gu-forma{height:260svh;padding:0}
html.gu-on .gu-forma-fijo{position:sticky;top:0;height:100svh;display:block;text-align:left}
html.gu-on .gu-ft{position:absolute;left:var(--pad);top:50%;transform:translateY(-50%);z-index:3;max-width:none;white-space:nowrap}
html.gu-on .gu-figs{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(76svh * 1.1),82vw)}
html.gu-on .gu-ca{position:absolute;left:var(--pad);top:clamp(84px,12vh,120px)}
html.gu-on .gu-cb{position:absolute;right:var(--pad);bottom:clamp(28px,6vh,64px)}
html.gu-on .gu-sig{opacity:0}
@media (max-width:700px){html.gu-on .gu-ft{top:auto;bottom:24%;transform:none;white-space:normal;font-size:clamp(40px,12vw,64px)!important}html.gu-on .gu-figs{top:44%}html.gu-on .gu-cb{left:var(--pad);right:var(--pad);bottom:20px;max-width:none}}
/* palabras que corren */
.gu-apil{padding:clamp(72px,10vw,140px) 0;overflow:clip}
.gu-et{font-size:13px!important;letter-spacing:.12em!important;text-transform:uppercase;padding:0 var(--pad);margin-bottom:28px!important;font-family:var(--fc)!important}
.gu-filas{list-style:none;display:grid;gap:clamp(4px,1vw,10px)}
.gu-fila{display:flex;gap:.4em;white-space:nowrap;font:500 clamp(44px,8.4vw,136px)/1 var(--ft);letter-spacing:-.04em;padding-left:var(--pad);will-change:transform}
.gu-fila:nth-child(even){justify-content:flex-end;padding:0 var(--pad) 0 0}
.gu-eco{color:transparent;-webkit-text-stroke:1px color-mix(in srgb,var(--fg) 45%,transparent)}
/* bloque de color */
.gu-color{position:relative;background:var(--bg)}
.gu-color-fijo{min-height:80svh;display:grid;place-items:center;gap:24px;padding:clamp(72px,10vw,120px) var(--pad);text-align:center;position:relative;overflow:clip}
.gu-cx{font:500 clamp(30px,4.8vw,76px)/1.05 var(--ft);letter-spacing:-.035em;max-width:20ch;overflow:clip;padding-bottom:.06em}.gu-cx>span{display:inline-block}
.gu-cfoto{width:min(440px,70vw);aspect-ratio:4/5;border-radius:14px;overflow:hidden;margin:0}.gu-cfoto img{width:100%;height:100%;object-fit:cover}
.gu-pop{position:absolute;width:clamp(96px,12vw,170px);aspect-ratio:1;border-radius:50%;overflow:hidden;margin:0}.gu-pop img{width:100%;height:100%;object-fit:cover}
.gu-pop1{left:8%;top:18%}.gu-pop2{right:8%;bottom:16%}
html.gu-on .gu-color{height:220svh}
html.gu-on .gu-color-fijo{position:sticky;top:0;height:100svh;min-height:0;display:block;padding:0}
html.gu-on .gu-cx{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:90vw;margin:0 auto}
html.gu-on .gu-cx2>span{transform:translateY(120%)}
html.gu-on .gu-cfoto{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2}
html.gu-on .gu-pop{transform:scale(0)}
/* final gigante */
.gu-sig-b a{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:clamp(12px,2vw,28px);min-height:72svh;padding:clamp(28px,5vw,72px) var(--pad);background:var(--acc);color:var(--on-acc);text-decoration:none}
.gu-sn{font:500 clamp(28px,3vw,44px)/1 var(--ft);align-self:start}
.gu-st{font:500 clamp(52px,11vw,200px)/.92 var(--ft);letter-spacing:-.05em;text-wrap:balance}
.gu-sf{font-size:clamp(40px,7vw,120px);line-height:1;transition:transform .5s cubic-bezier(.16,1,.3,1)}
@media (hover:hover){.gu-sig-b a:hover .gu-sf{transform:translate(8%,-8%)}}
@media (max-width:700px){.gu-sig-b a{grid-template-columns:1fr auto;min-height:56svh}.gu-sn{grid-column:1/-1}}
@media (prefers-reduced-motion:reduce){.gu-menu,.gu-menu a,.gu-lsi,.gu-lsi>span{transition:none!important}.gu-menu a{transform:none;opacity:1}}
`;

/** Para la revisión visual: todo visible y completo, sin fijados, sin intro y con las tarjetas en fila. */
export const CSS_REVISION_GUIA = 'html.gu-intro .gu-fijo{visibility:visible!important}.gu-pre{display:none!important}html.gu-ring .gu-anillo,html.gu-on .gu-forma,html.gu-on .gu-color{height:auto!important}html.gu-ring .gu-fijo,html.gu-on .gu-forma-fijo,html.gu-on .gu-color-fijo{position:relative!important;height:auto!important;min-height:100svh}html.gu-ring .gu-esc{position:relative!important;display:flex!important;flex-wrap:wrap;gap:16px;perspective:none}html.gu-ring .gu-t{position:relative!important;left:auto!important;top:auto!important;transform:none!important;opacity:1!important;width:min(44vw,520px)!important}html.gu-on .gu-sig{opacity:0!important}html.gu-on .gu-cx,html.gu-on .gu-cfoto{position:relative!important;left:auto!important;top:auto!important;transform:none!important}html.gu-on .gu-cx2>span{transform:none!important}html.gu-on .gu-pop{transform:none!important}.gu-mb,.gu-menu{display:none!important}';

/** Scripts: GSAP + ScrollTrigger + Lenis del CDN (con versión fija) y el movimiento de la M. */
export const JS_GUIA = `<script src="${CDN_GUIA.gsap}" defer></script><script src="${CDN_GUIA.st}" defer></script><script src="${CDN_GUIA.lenis}" defer></script>
<script>(function(){'use strict';
var W=window,D=document,H=D.documentElement,RM=W.matchMedia('(prefers-reduced-motion: reduce)').matches;
function $$(s,c){return [].slice.call((c||D).querySelectorAll(s))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function prog(el){var r=el.getBoundingClientRect(),t=r.height-W.innerHeight;return t>0?clamp(-r.top/t,0,1):clamp((W.innerHeight-r.top)/(W.innerHeight+r.height),0,1)}
var lenis=null,G=null;
function irA(id){var t=D.getElementById(id);if(!t)return;if(lenis)lenis.scrollTo(t,{offset:0,duration:1.4});else t.scrollIntoView({behavior:RM?'auto':'smooth'})}
/* menú a pantalla completa */
function menu(){var b=D.querySelector('.gu-mb'),n=D.getElementById('gu-menu');if(!b||!n)return;n.hidden=false;
function abrir(v){n.classList.toggle('abierto',v);H.classList.toggle('gu-menu-on',v);b.setAttribute('aria-expanded',v?'true':'false');b.textContent=v?'Cerrar':'Menú';if(lenis){v?lenis.stop():lenis.start()}else D.body.style.overflow=v?'hidden':'';if(v){var a=n.querySelector('a');a&&a.focus({preventScroll:true})}}
b.addEventListener('click',function(){abrir(!n.classList.contains('abierto'))});
n.addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;var id=(a.getAttribute('href')||'').slice(1);if(id&&D.getElementById(id)){e.preventDefault();abrir(false);setTimeout(function(){irA(id)},60)}});
D.addEventListener('keydown',function(e){if(e.key==='Escape'&&n.classList.contains('abierto')){abrir(false);b.focus()}})}
/* encabezado claro u oscuro según la sección (ColorSwitch del modelo) */
function encabezado(){var h=D.querySelector('.gu-anillo');function f(){var r=h?h.getBoundingClientRect().bottom:0;H.classList.toggle('gu-claro',r<=70)}f();W.addEventListener('scroll',f,{passive:true});W.addEventListener('resize',f)}
/* video de la portada */
function video(){var b=D.querySelector('.gu-vb'),p=D.querySelector('.gu-vp');if(!b||!p)return;var v=p.querySelector('video'),x=p.querySelector('.gu-vx');
b.addEventListener('click',function(){p.hidden=false;lenis&&lenis.stop();try{v.play()}catch(e){}x.focus()});
function cerrar(){v.pause();p.hidden=true;lenis&&lenis.start();b.focus()}x.addEventListener('click',cerrar);D.addEventListener('keydown',function(e){if(e.key==='Escape'&&!p.hidden)cerrar()})}
/* anillo de tarjetas: mismos números que el modelo */
function anillo(){var sec=D.querySelector('.gu-anillo');if(!sec)return null;var esc=sec.querySelector('.gu-esc'),items=$$('.gu-t',esc),lbl=sec.querySelector('.gu-front b');
var tx=sec.querySelector('.gu-lsi');if(tx&&!RM){var ls=$$('span',tx),k=0;setInterval(function(){if(D.hidden)return;ls[k].classList.remove('on');k=(k+1)%ls.length;ls[k].classList.add('on');tx.style.setProperty('--k',k)},1800)}
if(items.length<3)return null;H.classList.add('gu-ring');
var movil=W.innerWidth<700,R=1500,Z0=movil?-1700:-1200,BS=0.8,MS=0.4,VY=0.1,MINO=0.2,LERP=0.1,n=items.length,Q=360/n;
var sA=0,dA=0,cur=0,pr=0,front=-1,vivo=true,arr=null,movido=0;
function pintar(a){var best=-1e9,bi=0;items.forEach(function(el,i){var h=(i*Q-a)%360;if(h<0)h+=360;var x=h*Math.PI/180,z=Z0+R*Math.cos(x),y=R*Math.sin(x)*VY;if(z>best){best=z;bi=i}var l=(z-Z0+R)/(R*2),s=MS+(BS-MS)*l,o=Math.min(1,Math.max(MINO,l));el.style.transform='translate(-50%,-50%) translateZ('+z.toFixed(1)+'px) translateY('+y.toFixed(1)+'px) scale('+s.toFixed(4)+')';el.style.opacity=o.toFixed(3);el.style.zIndex=String(Math.round(l*100));el.tabIndex=l>.9?0:-1});
if(bi!==front){front=bi;var t=items[bi].getAttribute('data-label')||'';if(G&&!RM){G.to(lbl,{yPercent:-110,duration:.25,ease:'power2.in',onComplete:function(){lbl.textContent=t;G.fromTo(lbl,{yPercent:110},{yPercent:0,duration:.6,ease:'expo.out'})}})}else lbl.textContent=t}}
function objetivo(){return sA+dA}
function onScroll(){sA=prog(sec)*(n-1)*Q}
W.addEventListener('scroll',onScroll,{passive:true});onScroll();
function loop(){if(vivo){var t=objetivo();if(RM){cur=pr=t}else{cur+=(t-cur)*LERP;pr+=(cur-pr)*LERP}pintar(pr)}requestAnimationFrame(loop)}
if('IntersectionObserver' in W)new IntersectionObserver(function(e){vivo=e[0].isIntersecting}).observe(sec);
cur=pr=objetivo();pintar(pr);requestAnimationFrame(loop);
esc.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse'&&e.button!==0)return;arr={y:e.clientY,x:e.clientX,a:dA};movido=0});
W.addEventListener('pointermove',function(e){if(!arr)return;var d=(arr.y-e.clientY)+(arr.x-e.clientX)*.6;movido=Math.max(movido,Math.abs(d));if(movido>6)esc.classList.add('arrastre');dA=arr.a+d*.18});
W.addEventListener('pointerup',function(){arr=null;esc.classList.remove('arrastre')});
esc.addEventListener('keydown',function(e){if(/Arrow(Right|Down)/.test(e.key)){dA+=Q;e.preventDefault();var j=(front+1)%n;setTimeout(function(){items[j].focus({preventScroll:true})},380)}else if(/Arrow(Left|Up)/.test(e.key)){dA-=Q;e.preventDefault();var j2=(front-1+n)%n;setTimeout(function(){items[j2].focus({preventScroll:true})},380)}});
items.forEach(function(el){el.addEventListener('click',function(e){if(movido>6){e.preventDefault();movido=0;return}var id=(el.getAttribute('href')||'').slice(1);if(!id||!D.getElementById(id))return;e.preventDefault();
if(G&&!RM){var cs=items.map(function(x){return x.firstElementChild});G.to(cs,{yPercent:movil?-400:-180,scale:.6,stagger:{each:.01,from:'end'},duration:1,ease:'expo.out'});setTimeout(function(){irA(id)},350);setTimeout(function(){G.set(cs,{yPercent:0,scale:1})},2200)}else irA(id)})});
return {items:items,lbl:lbl,sec:sec}}
/* intro: círculo que se dibuja, foto que se abre y entrada de las tarjetas */
function intro(an){if(!H.classList.contains('gu-intro'))return;var pre=D.querySelector('.gu-pre');if(!G||!pre){H.classList.remove('gu-intro');return}
var c=pre.querySelector('circle'),f=pre.querySelector('figure'),tl=G.timeline({onComplete:function(){H.classList.remove('gu-intro');pre.remove()}});
tl.to(c,{strokeDashoffset:0,duration:1.1,ease:'power2.inOut'}).to(f,{clipPath:'inset(0% 0% 0% 0% round 22px)',duration:.9,ease:'expo.out'},.25).to(pre,{autoAlpha:0,duration:.5,ease:'power1.out'},1.25)
.add(function(){H.classList.remove('gu-intro');if(!an)return;var cs=an.items.map(function(x){return x.firstElementChild});G.fromTo(cs,{yPercent:function(i){return clamp(i%2?180*i:-180*i,-420,420)},scale:0},{yPercent:0,scale:1,stagger:{each:.03,from:'start'},duration:1.8,ease:'expo.out',delay:.1});
var h1=D.querySelector('.gu-h1>span');h1&&G.fromTo(h1,{yPercent:110},{yPercent:0,duration:1.4,ease:'expo.out',delay:.3});G.fromTo(an.lbl,{yPercent:200},{yPercent:0,duration:1.4,ease:'expo.out',delay:.5})},1.25)}
/* forma con fotos (HeroPhoto/PhotoSticky del modelo) */
function forma(){var s=D.querySelector('.gu-forma');if(!s||!G||!W.ScrollTrigger)return;H.classList.add('gu-on');var figs=s.querySelector('.gu-figs'),capas=$$('figure',figs);
G.fromTo(figs,{scale:2.4},{scale:1,ease:'none',scrollTrigger:{trigger:s,start:'top bottom',end:'top top',scrub:true}});
var tl=G.timeline({scrollTrigger:{trigger:s,start:'top top',end:'bottom bottom',scrub:true}});
tl.fromTo(s.querySelector('.gu-ft'),{xPercent:0},{xPercent:-30,autoAlpha:0,duration:.5},0);
capas.forEach(function(fg){$$('img.gu-sig',fg).forEach(function(im,k){tl.to(im,{opacity:1,duration:.12},.25+k*.2)})});
var ca=s.querySelector('.gu-ca'),cb=s.querySelector('.gu-cb');ca&&tl.fromTo(ca,{autoAlpha:0,y:30},{autoAlpha:1,y:0,duration:.2},.3);cb&&tl.fromTo(cb,{autoAlpha:0,y:30},{autoAlpha:1,y:0,duration:.2},.45)}
/* filas que corren en sentidos opuestos */
function filas(){var s=D.querySelector('.gu-apil');if(!s||RM)return;var fs=$$('.gu-fila',s);function f(){var p=prog(s)-.5;fs.forEach(function(el,i){el.style.transform='translate3d('+(p*40*(i%2?1:-1)).toFixed(2)+'%,0,0)'})}f();W.addEventListener('scroll',f,{passive:true})}
/* bloque de color */
function color(){var s=D.querySelector('.gu-color');if(!s||!G||!W.ScrollTrigger)return;H.classList.add('gu-on');var bg=getComputedStyle(D.documentElement).getPropertyValue('--mut').trim()||'#e6e0ff';
var tl=G.timeline({scrollTrigger:{trigger:s,start:'top top',end:'bottom bottom',scrub:true}});
tl.to(s,{backgroundColor:bg,duration:1},0);var ft=s.querySelector('.gu-cfoto');ft&&tl.fromTo(ft,{clipPath:'inset(0% 0% 0% 0% round 14px)'},{clipPath:'inset(0% 0% 100% 0% round 14px)',ease:'none',duration:.6},.3);
var a=s.querySelector('.gu-cx1>span'),b=s.querySelector('.gu-cx2>span');if(b){tl.to(a,{yPercent:-120,duration:.4},.4);tl.fromTo(b,{yPercent:120},{yPercent:0,duration:.35},.6)}
var pp=$$('.gu-pop',s);pp.forEach(function(p,k){tl.fromTo(p,{scale:0},{scale:1,duration:.2,ease:'expo.out'},.1+k*.35)})}
function iniciar(){G=W.gsap||null;var ST=W.ScrollTrigger;if(G&&ST)G.registerPlugin(ST);
if(G&&W.Lenis&&!RM){try{lenis=new W.Lenis({lerp:.1});if(ST)lenis.on('scroll',ST.update);G.ticker.add(function(t){lenis.raf(t*1000)});G.ticker.lagSmoothing(0)}catch(e){lenis=null}}
menu();encabezado();video();var an=anillo();intro(an);if(!RM){forma();color()}filas();
$$('a[href^="#"]').forEach(function(a){if(a.closest('.gu-anillo,.gu-menu'))return;a.addEventListener('click',function(e){var id=a.getAttribute('href').slice(1);if(id&&D.getElementById(id)&&lenis){e.preventDefault();irA(id)}})});
if(ST)ST.refresh()}
if(D.readyState==='complete')iniciar();else W.addEventListener('load',iniciar);
})()</script>`;
