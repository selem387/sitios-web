// Opción N (14-nov-2026). Reconstruida SOLO a partir de https://www.vastspace.com/ (pedido de Sebastián: nada de otras
// opciones ni ramas). Se tomó la lógica de diseño y de movimiento de la referencia, no su contenido ni su marca.
//
// Referencia medida en el navegador (1440×900, 14-nov-2026): Webflow + bundle propio con GSAP 3.14.2, Three.js r172 (modelo
// 3D de la estación en WebGL) y Lenis 1.3.18. Letras: Owners (títulos), Owners Text (texto), Phonic (etiquetas mono).
// Colores: grafito #2A2C2F, gris cálido #B3ABA3, texto apagado #897F75, crema #FDFCF4, arena #ECE8E3, acento #FF5623.
//
// Recorrido de la página (mismo orden que la referencia):
// 1. Portada a pantalla completa: en la referencia es un video en bucle con botón de pausa y "Watch full video"; aquí las
//    fotos del cliente se alternan con fundido y acercamiento lento, con su botón de pausa. Titular grande abajo a la izquierda.
// 2. Franja gris cálida con una frase grande que se "enciende" palabra por palabra con el scroll (texto apagado → blanco).
// 3. Vitrina sobre crema: nombre gigante y tenue de fondo, etiqueta mono con acento, objeto al centro con anillo punteado
//    (en la referencia, el modelo 3D; aquí la foto del cliente), datos en rejilla mono y "Saber más".
// 4. Avance: carrusel de fotos grandes con pie sobre la foto, nota mono y barra de marcas verticales (la activa en acento).
// 5. Tarjetas en 3 columnas (en la referencia "Updates"): foto cuadrada, línea mono con cuadrito de acento, título.
// 6. Prensa: citas en columnas con línea divisoria y franja de nombres que corre sin fin (aquí: testimonios y reconocimientos).
// 7. Marco negro con tarjeta blanca para escribir (en la referencia, el boletín) y pie con datos de contacto en columnas mono.
// Barra de navegación: transparente sobre la portada; se esconde al bajar y regresa como tarjeta blanca al subir.
//
// Reglas: solo fotos del cliente y datos reales (sin cifras, testimonios o reconocimientos, su bloque no aparece).
// Sin JS o con "reducir movimiento": todo visible y quieto (las animaciones se ponen solo desde el script).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CDN_N = {
  gsap: process.env.N_CDN_GSAP || 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js',
  scrolltrigger: process.env.N_CDN_SCROLLTRIGGER || 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/ScrollTrigger.min.js',
  lenis: process.env.N_CDN_LENIS || 'https://cdn.jsdelivr.net/npm/lenis@1.3.18/dist/lenis.min.js',
};
/** Letras de la N: Geist hace de Owners/Owners Text y Geist Mono de Phonic (las de la referencia son comerciales). */
export const LETRA_N = 'Geist';
export const LETRA_MONO_N = 'Geist Mono';
export const URL_MONO_N = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap';
export const MAX_FOTOS_PORTADA_N = 4;
export const MAX_FOTOS_AVANCE_N = 12;

export function parAvance(pares = []) {
  return { titulos: LETRA_N, cuerpo: LETRA_N, estilo: pares[0]?.estilo || 'minimalista' };
}

const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const dos = (n) => String(n).padStart(2, '0');

/** "15 años de experiencia" → {valor:'15', etiqueta:'Años de experiencia'}. Menos de 2 válidas → []. */
export function datosDe(lista = []) {
  const out = [];
  for (const c of Array.isArray(lista) ? lista : []) {
    const s = String(c ?? '').replace(/\s+/g, ' ').trim();
    const m = s.match(/^(m[aá]s de\s+|\+\s*)?(\$?\d[\d.,]*(?:\s?[–-]\s?\d[\d.,]*)?\s?(?:%|\+|k|mil|m²|m2)?)\s*(?:[:·—]\s*)?(.*)$/i);
    if (!m) continue;
    const etiqueta = capital(m[3].trim().replace(/^(?:de|del)\s+/i, ''));
    if (!etiqueta) continue;
    const valor = `${m[1] ? '+' : ''}${m[2].replace(/\s+/g, ' ').trim()}`;
    if (!out.some((x) => x.valor === valor && x.etiqueta === etiqueta)) out.push({ valor, etiqueta });
    if (out.length >= 6) break;
  }
  return out.length >= 2 ? out : [];
}

/** Primera oración (o las dos primeras si la primera es corta) para la franja que se enciende. */
export function fraseResaltada(texto = '') {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const os = t.match(/[^.!?]+[.!?]+/g) || [t];
  let f = os[0].trim();
  if (f.length < 60 && os[1]) f = `${f} ${os[1].trim()}`;
  return f.length > 220 ? `${f.slice(0, 217).replace(/\s+\S*$/, '')}…` : f;
}

/** 1. Portada: fotos con fundido y acercamiento lento, pausa y titular. heroFoto va primero (lleva fetchpriority). */
export function portadaN({ fotos = [], img, titular = '', subtitulo = '', cta = '', verMas = '' }) {
  const fs = fotos.filter((x, k, a) => x?.url && a.findIndex((y) => y?.url === x.url) === k).slice(0, MAX_FOTOS_PORTADA_N);
  const capas = fs.map((x, k) => `<div class="vx-cuadro${k === 0 ? ' es-activa' : ''}">${img(x, { cls: 'vx-foto rep-ok', eager: k === 0, extra: k === 0 ? ' fetchpriority="high"' : '', sizes: ' sizes="100vw"' })}</div>`).join('');
  const pausa = fs.length > 1 ? `<button type="button" class="vx-pausa" aria-pressed="false" aria-label="Pausar las fotos"><span aria-hidden="true"></span></button>` : '';
  const ver = verMas ? `<a class="vx-ver" href="${esc(verMas)}"><i aria-hidden="true">›</i>Ver nuestro trabajo</a>` : '';
  return {
    html: `<section class="hero vx-portada${fs.length ? '' : ' sin-foto'}" id="inicio"><div class="vx-medios">${capas}</div><span class="vx-cruz vx-c1" aria-hidden="true"></span><div class="vx-port-txt"><h1 class="vx-h1">${esc(titular)}</h1>${subtitulo ? `<p class="vx-sub">${esc(subtitulo)}</p>` : ''}<div class="vx-acciones">${pausa}${ver}${cta}</div></div></section>`,
    urls: fs.map((x) => x.url),
  };
}

/** 2. Franja gris cálida con la frase que se enciende palabra por palabra. */
export function franjaN(frase = '') {
  if (!frase) return '';
  const palabras = frase.split(/\s+/).filter(Boolean);
  const encendida = palabras.map((w) => `<span class="vx-w">${esc(w)}</span>`).join(' ');
  return `<section class="vx-franja" aria-label="${esc(frase)}"><span class="vx-cruz vx-c2" aria-hidden="true"></span><div class="vx-marco"><p class="vx-frase"><span class="vx-base">${esc(frase)}</span><span class="vx-luz" aria-hidden="true">${encendida}</span></p></div><span class="vx-cruz vx-c3" aria-hidden="true"></span></section>`;
}

/** 3. Vitrina: nombre gigante de fondo, etiqueta mono, foto con anillo punteado, datos y "Saber más". */
export function vitrinaN({ foto = null, img, nombre = '', etiqueta = '', apoyo = '', datos = [], href = '#contacto', recorte = false }) {
  if (!foto && !datos.length) return '';
  const fig = foto ? `<figure class="vx-objeto${recorte ? ' es-recorte' : ''}"><span class="vx-anillo" aria-hidden="true"></span>${img(foto, { cls: 'vx-obj-img', sizes: ' sizes="(min-width:900px) 40vw, 80vw"' })}</figure>` : '';
  const rejilla = datos.length ? `<dl class="vx-datos">${datos.map((d) => `<div><dt>${esc(d.etiqueta)}</dt><dd>${esc(d.valor)}</dd></div>`).join('')}</dl>` : '';
  return `<section class="vx-vitrina" id="destacado"><div class="vx-marco vx-vit-in"><p class="vx-etq"><span>${esc(nombre)}</span>${etiqueta ? `<b>${esc(etiqueta)}</b>` : ''}</p><p class="vx-gigante" aria-hidden="true">${esc(nombre)}</p>${fig}<div class="vx-vit-pie">${apoyo ? `<p class="vx-apoyo">${esc(apoyo)}</p>` : ''}<a class="vx-ver vx-oscuro" href="${esc(href)}"><i aria-hidden="true">›</i>Saber más</a></div>${rejilla}</div></section>`;
}

/** 4. Avance: carrusel de fotos grandes con pie sobre la foto, nota mono y marcas verticales. */
export function avanceN({ titulo = '', fotos = [], img, nota = '' }) {
  const fs = fotos.filter((x) => x?.foto?.url).slice(0, MAX_FOTOS_AVANCE_N);
  if (!fs.length) return { html: '', urls: [] };
  const n = fs.length;
  const slides = fs.map((x, k) => `<figure class="vx-slide" aria-roledescription="diapositiva" aria-label="${k + 1} de ${n}">${img(x.foto, { cls: 'vx-sl-img', sizes: ' sizes="(min-width:900px) 75vw, 90vw"' })}<figcaption><span class="vx-mono">${dos(k + 1)} / ${dos(n)}</span>${x.texto ? `<span class="vx-sl-t">${esc(x.texto)}</span>` : ''}</figcaption></figure>`).join('');
  const marcas = Array.from({ length: n * 3 }, (_, k) => `<i${k % 3 === 0 ? ` data-k="${k / 3}"` : ''}></i>`).join('');
  return {
    html: `<section class="vx-avance" id="trabajo"><div class="vx-marco"><h2 class="vx-h2">${esc(titulo)}</h2></div><div class="vx-pista" tabindex="0" aria-roledescription="carrusel" aria-label="${esc(titulo)}">${slides}</div><div class="vx-marco vx-av-pie">${nota ? `<p class="vx-mono vx-nota">${esc(nota)}</p>` : '<span></span>'}<div class="vx-marcas" aria-hidden="true">${marcas}</div><div class="vx-flechas"><button type="button" class="vx-fl vx-ant" aria-label="Foto anterior">‹</button><button type="button" class="vx-fl vx-sig" aria-label="Foto siguiente">›</button></div></div></section>`,
    urls: fs.map((x) => x.foto.url),
  };
}

/** 5. Tarjetas en 3 columnas: foto (si hay), línea mono con cuadrito de acento, título y texto. */
export function tarjetasN({ titulo = '', items = [], img, cta = '' }) {
  if (!items.length) return '';
  const cards = items.map((x) => `<article class="vx-card${x.foto ? '' : ' sin-foto'}">${x.foto ? `<figure>${img(x.foto, { sizes: ' sizes="(min-width:900px) 30vw, 90vw"' })}</figure>` : ''}<p class="vx-mono vx-meta">${x.meta.map((m) => esc(m)).join('<i aria-hidden="true"></i>')}</p><h3>${esc(x.titulo)}</h3>${x.texto ? `<p class="vx-card-t">${esc(x.texto)}</p>` : ''}</article>`).join('');
  return `<section class="vx-tarjetas" id="servicios"><div class="vx-marco"><div class="vx-cab"><h2 class="vx-h2">${esc(titulo)}</h2>${cta}</div><div class="vx-grid">${cards}</div></div></section>`;
}

/** 6. Prensa: citas con línea divisoria y franja de nombres que corre. Sin citas ni nombres no hay sección. */
export function prensaN({ titulo = '', citas = [], nombres = [], tituloNombres = '' }) {
  if (!citas.length && !nombres.length) return '';
  const cs = citas.length ? `<div class="vx-citas">${citas.map((c) => `<blockquote class="vx-cita"><p class="vx-mono vx-quien">${esc(c.autor || 'Cliente')}</p><p>${esc(c.texto)}</p></blockquote>`).join('')}</div>` : '';
  const fila = nombres.map((x) => `<span>${esc(x)}</span>`).join('');
  const cinta = nombres.length ? `<div class="vx-cinta" aria-label="${esc(tituloNombres)}"><div class="vx-cinta-in">${fila}${`<span aria-hidden="true" class="vx-dup">${nombres.map((x) => esc(x)).join('</span><span aria-hidden="true" class="vx-dup">')}</span>`}</div></div>` : '';
  return `<section class="vx-prensa" id="resenas"><div class="vx-marco"><h2 class="vx-h2">${esc(citas.length ? titulo : tituloNombres)}</h2>${cs}</div>${cinta}</section>`;
}

/** 7. Marco negro: tarjeta para escribir y pie con datos de contacto en columnas mono. */
export function contactoN({ titulo = '', cta = '', columnas = [], mapa = '' }) {
  const cols = columnas.filter((c) => c.html).map((c) => `<div><p class="vx-mono vx-col-t">${esc(c.titulo)}</p><div class="vx-col">${c.html}</div></div>`).join('');
  return `<section class="vx-negro" id="contacto"><div class="vx-tarjeta vx-escribe"><h2>${esc(titulo)}</h2><div class="vx-esc-der">${cta}</div></div>${cols ? `<div class="vx-tarjeta vx-datos-pie">${cols}</div>` : ''}${mapa}</section>`;
}

export const CSS_AVANCE = `
body.l-avance{--vx-graf:#2A2C2F;--vx-gris:#B3ABA3;--vx-apag:#897F75;--vx-crema:#FDFCF4;--vx-arena:#ECE8E3;--vx-acc:var(--p);--vx-mono:'Geist Mono',ui-monospace,Menlo,monospace;--vx-m:clamp(20px,2.8vw,40px);background:var(--vx-crema);color:var(--vx-graf);font-size:14px;line-height:1.5}
body.l-avance h1,body.l-avance h2,body.l-avance h3{font-weight:500;letter-spacing:-.01em;text-transform:none}
body.l-avance .wrap{max-width:none;padding:0 var(--vx-m)}
.vx-marco{padding:0 var(--vx-m)}
.vx-mono{font-family:var(--vx-mono);font-size:12px;letter-spacing:.01em;text-transform:uppercase;line-height:1.35}
.vx-h2{font-size:clamp(32px,3.4vw,48px);line-height:1;margin:0 0 clamp(28px,4vw,56px)}
.vx-cruz{position:absolute;width:13px;height:13px;pointer-events:none;z-index:2}.vx-cruz::before,.vx-cruz::after{content:"";position:absolute;background:currentColor}.vx-cruz::before{left:6px;top:0;width:1px;height:13px}.vx-cruz::after{top:6px;left:0;width:13px;height:1px}
/* barra */
body.l-avance .barra{position:fixed;left:0;right:0;top:0;background:transparent;border:0;backdrop-filter:none;color:#fff;transition:transform .45s cubic-bezier(.2,.7,.2,1),color .3s}
body.l-avance .barra .in{height:76px;margin:16px var(--vx-m) 0;padding:0 18px;border-radius:2px;transition:background .3s,box-shadow .3s}
body.l-avance .barra nav{gap:clamp(18px,3vw,44px);font-weight:400;font-size:14px}
body.l-avance .barra.es-tarjeta{color:var(--vx-graf)}body.l-avance .barra.es-tarjeta .in{background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.06)}
body.l-avance .barra.se-oculta{transform:translateY(-120%)}
/* 1. portada */
.vx-portada{position:relative;min-height:100svh;display:grid;align-items:end;background:var(--vx-graf);color:#fff;overflow:hidden;padding:0}
.vx-medios,.vx-cuadro{position:absolute;inset:0}.vx-cuadro{opacity:0;transition:opacity 1.4s ease}.vx-cuadro.es-activa{opacity:1}
.vx-foto{width:100%;height:100%;object-fit:cover;transform-origin:60% 50%}
.vx-cuadro.es-activa .vx-foto{animation:vx-acerca 9s linear both}
@keyframes vx-acerca{from{transform:scale(1.02)}to{transform:scale(1.12)}}
.vx-portada::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,0) 55%),linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0) 22%);pointer-events:none}
.vx-port-txt{position:relative;z-index:1;padding:0 var(--vx-m) clamp(32px,5vw,56px);display:grid;gap:18px;justify-items:start}
.vx-h1{font-size:clamp(44px,5.3vw,76px);line-height:.86;max-width:13ch;margin:0}
.vx-sub{max-width:44ch;font-size:16px;opacity:.92;margin:0}
.vx-acciones{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.vx-pausa{width:40px;height:40px;border:0;border-radius:2px;background:rgba(255,255,255,.16);backdrop-filter:blur(10px);color:#fff;cursor:pointer;display:grid;place-items:center}
.vx-pausa span{width:10px;height:12px;border-left:3px solid currentColor;border-right:3px solid currentColor}
.vx-pausa[aria-pressed="true"] span{width:0;height:0;border:0;border-left:11px solid currentColor;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:3px}
.vx-ver{display:inline-flex;align-items:center;gap:10px;height:40px;padding:0 16px;border-radius:2px;background:rgba(255,255,255,.16);backdrop-filter:blur(10px);color:#fff;text-decoration:none;font-size:14px}
.vx-ver i{font-style:normal;font-size:18px;line-height:1}
.vx-ver.vx-oscuro{background:transparent;color:var(--vx-graf);padding:0}
body.l-avance .vx-acciones .btn,body.l-avance .vx-esc-der .btn{border-radius:2px;height:40px;padding:0 18px;display:inline-flex;align-items:center;font-size:14px;font-weight:500}
.vx-c1{left:var(--vx-m);top:120px;color:rgba(255,255,255,.7)}
/* 2. franja */
.vx-franja{position:relative;background:var(--vx-gris);color:#fff;min-height:min(80svh,720px);display:grid;align-items:center;padding:clamp(80px,12vw,160px) 0}
.vx-frase{position:relative;font-size:clamp(30px,3.4vw,48px);line-height:1.05;letter-spacing:.01em;font-weight:500;max-width:22ch;margin:0}
.vx-base{color:#fff}.vx-luz{position:absolute;inset:0;color:#fff}
html.vx-js .vx-base{color:var(--vx-apag)}
html.vx-js .vx-luz .vx-w{opacity:0}
html:not(.vx-js) .vx-luz{display:none}
.vx-c2{left:var(--vx-m);top:var(--vx-m);color:rgba(255,255,255,.75)}.vx-c3{right:var(--vx-m);bottom:var(--vx-m);color:rgba(255,255,255,.75)}
/* 3. vitrina */
.vx-vitrina{position:relative;background:var(--vx-crema);overflow:hidden}
.vx-vit-in{position:relative;min-height:min(100svh,900px);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);grid-template-rows:auto 1fr auto;gap:24px;padding-top:clamp(48px,7vw,96px);padding-bottom:clamp(48px,7vw,96px)}
.vx-etq{grid-column:1;font-family:var(--vx-mono);font-size:12px;text-transform:uppercase;display:grid;gap:2px;margin:0;z-index:1}.vx-etq b{font-weight:400;color:var(--vx-acc)}
.vx-gigante{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);margin:0;font-size:clamp(120px,22vw,340px);line-height:1;color:var(--vx-arena);white-space:nowrap;text-align:center;font-weight:400;letter-spacing:-.03em;pointer-events:none;z-index:0}
.vx-objeto{grid-column:2;grid-row:1 / span 3;position:relative;align-self:center;justify-self:center;width:min(100%,560px);aspect-ratio:1;margin:0;z-index:1}
.vx-anillo{position:absolute;inset:-7%;border:1.5px dotted color-mix(in srgb,var(--vx-graf) 45%,transparent);border-radius:50%;animation:vx-gira 60s linear infinite}
.vx-anillo::after{content:"";position:absolute;left:50%;top:-1px;width:1px;height:12%;background:var(--vx-acc);transform:translateY(-50%)}
@keyframes vx-gira{to{transform:rotate(360deg)}}
.vx-obj-img{position:absolute;inset:8%;width:84%;height:84%;object-fit:cover;border-radius:50%}
.vx-objeto.es-recorte .vx-obj-img{object-fit:contain;border-radius:0;filter:drop-shadow(0 30px 40px rgba(0,0,0,.18))}
.vx-vit-pie{grid-column:1;grid-row:3;display:grid;gap:14px;justify-items:start;z-index:1;max-width:30ch}
.vx-apoyo{font-size:16px;line-height:1.3;margin:0}
.vx-datos{grid-column:1 / -1;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0;border-top:1px solid color-mix(in srgb,var(--vx-graf) 18%,transparent);margin:0;z-index:1}
.vx-datos div{padding:16px 16px 0 0}.vx-datos dt{font-family:var(--vx-mono);font-size:12px;text-transform:uppercase;color:var(--vx-apag)}.vx-datos dd{margin:6px 0 0;font-size:clamp(22px,2.4vw,32px);font-variant-numeric:tabular-nums}
/* 4. avance */
.vx-avance{background:var(--vx-crema);padding:clamp(56px,8vw,110px) 0 clamp(40px,6vw,80px)}
.vx-pista{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:0 var(--vx-m);scroll-padding:0 var(--vx-m)}.vx-pista::-webkit-scrollbar{display:none}
.vx-pista:focus-visible{outline:2px solid var(--vx-acc);outline-offset:-2px}
.vx-slide{position:relative;flex:0 0 min(75vw,1084px);aspect-ratio:1084/701;margin:0;scroll-snap-align:start;overflow:hidden;background:var(--vx-arena)}
.vx-sl-img{width:100%;height:100%;object-fit:cover}
.vx-slide::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.5),rgba(0,0,0,0) 45%);pointer-events:none}
.vx-slide figcaption{position:absolute;left:24px;right:24px;bottom:22px;z-index:1;color:#fff;display:grid;gap:8px;max-width:38ch}
.vx-sl-t{font-size:16px;line-height:1.3}
.vx-av-pie{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:24px;align-items:center;margin-top:22px}
.vx-nota{margin:0;max-width:34ch}
.vx-marcas{display:flex;align-items:flex-end;gap:7px;height:36px}
.vx-marcas i{display:block;width:1px;height:14px;background:color-mix(in srgb,var(--vx-graf) 35%,transparent);transition:height .35s,background .35s}
.vx-marcas i[data-k]{height:22px}.vx-marcas i.es-activa{width:4px;height:30px;background:var(--vx-acc)}
.vx-flechas{display:flex;gap:6px}.vx-fl{width:34px;height:34px;border:0;border-radius:2px;background:var(--vx-arena);color:var(--vx-graf);font:inherit;font-size:20px;cursor:pointer}
html:not(.vx-car) .vx-flechas,html:not(.vx-car) .vx-marcas{display:none}
/* 5. tarjetas */
.vx-tarjetas{background:var(--vx-arena);padding:clamp(56px,8vw,110px) 0}
.vx-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap}
.vx-cab .btn{border-radius:2px}
.vx-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(28px,3vw,44px) 16px}
.vx-card figure{margin:0 0 14px;aspect-ratio:1;overflow:hidden;background:var(--vx-gris)}.vx-card figure img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.7,.2,1)}
@media (hover:hover){.vx-card:hover figure img{transform:scale(1.04)}}
.vx-card.sin-foto{border-top:1px solid color-mix(in srgb,var(--vx-graf) 22%,transparent);padding-top:16px}
.vx-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px}.vx-meta i{width:6px;height:6px;background:var(--vx-acc);display:inline-block}
.vx-card h3{font-size:18px;line-height:1.2;margin:0 0 6px;max-width:28ch}.vx-card-t{margin:0;color:var(--vx-apag);max-width:40ch}
/* 6. prensa */
.vx-prensa{background:var(--vx-arena);padding:0 0 clamp(56px,8vw,96px)}
.vx-citas{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0}
body.l-avance blockquote.vx-cita{margin:0;padding:6px 28px 6px 0;background:none;border:0;border-radius:0;box-shadow:none;transform:none}body.l-avance blockquote.vx-cita+.vx-cita{padding-left:28px;border-left:1px solid color-mix(in srgb,var(--vx-graf) 18%,transparent)}
.vx-cita p{margin:0;font-family:inherit;font-size:clamp(17px,1.5vw,20px);line-height:1.25}.vx-quien{margin:0 0 14px!important;font-size:12px!important;color:var(--vx-graf)}
.vx-cinta{overflow:hidden;margin-top:clamp(48px,6vw,80px);padding:6px 0}
.vx-cinta-in{display:flex;gap:clamp(40px,5vw,80px);width:max-content;font-size:clamp(20px,2vw,28px);font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.vx-cinta-in span{padding-left:clamp(40px,5vw,80px)}
html:not(.vx-js) .vx-dup{display:none}
/* 7. negro */
.vx-negro{background:#000;padding:40px var(--vx-m);display:grid;gap:8px}
.vx-tarjeta{background:#fff;border-radius:2px;padding:clamp(22px,3vw,36px)}
.vx-escribe{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center}.vx-escribe h2{font-size:clamp(20px,2vw,26px);margin:0}
.vx-datos-pie{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:28px}
.vx-col-t{margin:0 0 12px!important;color:var(--vx-apag)}.vx-col{display:grid;gap:4px;font-size:14px}.vx-col a{color:inherit}
.vx-negro .mapa,.vx-negro iframe{border-radius:2px}
body.l-avance footer{background:#000;color:rgba(255,255,255,.6);border:0;margin-top:0}
/* las entradas de la N las hace GSAP: se anulan las de la plantilla base para no animar dos veces */
body.l-avance .rv .ri{opacity:1;translate:none;transition:none}html.tit body.l-avance .sec h2:not(.visto){opacity:1;transform:none}
/* resto de secciones de la plantilla: mismo margen y títulos */
body.l-avance .sec{background:var(--vx-crema);padding:clamp(56px,8vw,100px) 0}
body.l-avance .sec h2{font-size:clamp(32px,3.4vw,48px);line-height:1}
@media (max-width:900px){
.vx-vit-in{grid-template-columns:1fr;grid-template-rows:auto auto auto auto}
.vx-objeto{grid-column:1;grid-row:2;width:min(86%,420px)}.vx-vit-pie{grid-row:3}.vx-datos{grid-row:4}
.vx-grid{grid-template-columns:1fr 1fr}
.vx-slide{flex-basis:86vw}
.vx-av-pie{grid-template-columns:1fr auto}.vx-marcas{display:none}
body.l-avance .barra nav{display:none}
}
@media (max-width:560px){.vx-grid{grid-template-columns:1fr}.vx-escribe{grid-template-columns:1fr}body.l-avance blockquote.vx-cita+.vx-cita{padding-left:0;border-left:0;border-top:1px solid color-mix(in srgb,var(--vx-graf) 18%,transparent);padding-top:18px;margin-top:18px}}
@media (prefers-reduced-motion:reduce){.vx-cuadro.es-activa .vx-foto,.vx-anillo{animation:none}.vx-cuadro{transition:none}body.l-avance .barra{transition:none}}
`;

/** Revisión visual: página quieta y completa (sin fundidos, sin barra escondida, sin palabras apagadas). */
export const CSS_REVISION_AVANCE = '.vx-cuadro.es-activa .vx-foto,.vx-anillo{animation:none!important;transform:none!important}.vx-luz{display:none!important}.vx-base{color:#fff!important}body.l-avance .barra{transform:none!important}.vx-gigante{transform:translateY(-50%)!important}.vx-dup{display:none!important}.vx-cinta-in{transform:none!important}';

/** Script: Lenis + GSAP/ScrollTrigger como la referencia. Sin librerías (o con "reducir movimiento") todo queda quieto y visible. */
export const JS_AVANCE = `<script src="${CDN_N.gsap}" defer></script><script src="${CDN_N.scrolltrigger}" defer></script><script src="${CDN_N.lenis}" defer></script>
<script>addEventListener('DOMContentLoaded',function(){var H=document.documentElement,mov=matchMedia('(prefers-reduced-motion: reduce)').matches;H.classList.add('vx-js','vx-car');
var G=window.gsap,ST=window.ScrollTrigger;if(G&&ST)G.registerPlugin(ST);
var lenis=null;if(!mov&&window.Lenis){lenis=new Lenis({lerp:.1});if(G&&ST){lenis.on('scroll',ST.update);G.ticker.add(function(t){lenis.raf(t*1000)});G.ticker.lagSmoothing(0)}else{(function f(t){lenis.raf(t);requestAnimationFrame(f)})(0)}}
/* barra: transparente en la portada, se esconde al bajar y vuelve como tarjeta blanca al subir */
var bar=document.querySelector('.barra'),port=document.querySelector('.vx-portada'),ult=scrollY;
function barra(){var y=scrollY,lim=port?port.offsetHeight-90:80;if(!bar)return;bar.classList.toggle('es-tarjeta',y>lim);bar.classList.toggle('se-oculta',y>lim&&y>ult+2);if(y<ult-2||y<=lim)bar.classList.remove('se-oculta');ult=y}
addEventListener('scroll',barra,{passive:true});barra();
/* 1. portada: fundido entre fotos y pausa */
var cs=[].slice.call(document.querySelectorAll('.vx-cuadro')),pz=document.querySelector('.vx-pausa'),i=0,tm=null,auto=!mov&&cs.length>1;
function sig(){cs[i].classList.remove('es-activa');i=(i+1)%cs.length;cs[i].classList.add('es-activa')}
function plan(){clearTimeout(tm);if(auto&&!document.hidden)tm=setTimeout(function(){sig();plan()},7000)}
if(pz){pz.setAttribute('aria-pressed',auto?'false':'true');pz.addEventListener('click',function(){auto=!auto;pz.setAttribute('aria-pressed',auto?'false':'true');pz.setAttribute('aria-label',auto?'Pausar las fotos':'Reanudar las fotos');cs.forEach(function(c){var im=c.querySelector('img');if(im)im.style.animationPlayState=auto?'running':'paused'});plan()})}
document.addEventListener('visibilitychange',plan);plan();
if(G&&!mov){G.from('.vx-h1,.vx-sub,.vx-acciones',{y:40,opacity:0,duration:1.1,ease:'power3.out',stagger:.12,delay:.15})}
if(!G||!ST||mov){H.classList.remove('vx-js');H.classList.add('vx-js-min');}
/* 4. carrusel de avance: marcas y flechas (funciona sin GSAP) */
var pista=document.querySelector('.vx-pista');if(pista){var ss=pista.querySelectorAll('.vx-slide'),ms=[].slice.call(document.querySelectorAll('.vx-marcas i[data-k]'));
function act(){var x=pista.scrollLeft,w=ss[0]?ss[0].offsetWidth+16:1,k=Math.max(0,Math.min(ss.length-1,Math.round(x/w)));ms.forEach(function(m,j){m.classList.toggle('es-activa',j===k)});return k}
pista.addEventListener('scroll',function(){clearTimeout(pista._t);pista._t=setTimeout(act,60)},{passive:true});act();
function ir(d){var k=act()+d;k=Math.max(0,Math.min(ss.length-1,k));pista.scrollTo({left:ss[k].offsetLeft-pista.offsetLeft-parseFloat(getComputedStyle(pista).paddingLeft),behavior:mov?'auto':'smooth'})}
var a=document.querySelector('.vx-ant'),b=document.querySelector('.vx-sig');if(a)a.addEventListener('click',function(){ir(-1)});if(b)b.addEventListener('click',function(){ir(1)});
pista.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){ir(1);e.preventDefault()}if(e.key==='ArrowLeft'){ir(-1);e.preventDefault()}})}
if(!G||!ST||mov)return;
/* 2. frase que se enciende palabra por palabra */
var ws=document.querySelectorAll('.vx-luz .vx-w');if(ws.length)G.to(ws,{opacity:1,ease:'none',stagger:.08,scrollTrigger:{trigger:'.vx-frase',start:'top 78%',end:'bottom 38%',scrub:true}});
/* 3. vitrina: el nombre gigante se desliza y la foto gira un poco */
if(document.querySelector('.vx-vitrina')){G.fromTo('.vx-gigante',{xPercent:12},{xPercent:-12,ease:'none',scrollTrigger:{trigger:'.vx-vitrina',start:'top bottom',end:'bottom top',scrub:true}});
G.fromTo('.vx-obj-img',{rotate:-6,scale:.94},{rotate:6,scale:1,ease:'none',scrollTrigger:{trigger:'.vx-vitrina',start:'top bottom',end:'bottom top',scrub:true}});
G.from('.vx-etq,.vx-vit-pie,.vx-datos div',{y:30,opacity:0,duration:.9,ease:'power3.out',stagger:.08,scrollTrigger:{trigger:'.vx-vitrina',start:'top 70%'}})}
/* 5 y 6: entradas suaves y cinta sin fin */
ST.batch('.vx-card,.vx-cita',{start:'top 88%',onEnter:function(b){G.from(b,{y:36,opacity:0,duration:.9,ease:'power3.out',stagger:.1})}});
G.utils.toArray('.vx-h2').forEach(function(h){G.from(h,{y:30,opacity:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:h,start:'top 88%'}})});
var ci=document.querySelector('.vx-cinta-in');if(ci){G.to(ci,{xPercent:-50,ease:'none',duration:Math.max(18,ci.children.length*3),repeat:-1})}
});</script>`;
