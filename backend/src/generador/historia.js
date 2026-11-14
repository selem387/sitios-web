// Opción I "Historia con scroll" — reconstruida el 14-nov-2026 SOLO a partir de savor.it (pedido de Sebastián: nada de
// la plantilla general ni de versiones anteriores; del cliente solo vienen sus datos, textos, fotos y logo).
//
// Estructura de savor.it (medida en escritorio 1440 px) y cómo se traduce aquí:
//   NavBar          → barra fija transparente: logo a la izquierda, ligas a la derecha; en celular "Menú" abre
//                     TheMenu (pantalla completa con ligas grandes). Se esconde al bajar y vuelve al subir.
//   HeroVideo       → portada a pantalla completa con la foto principal (en lugar del video), titular enorme ligero
//                     abajo a la izquierda y, a la derecha, frase corta + botón "palabra —— palabra".
//   StoryCanvas     → relato fijo de varias pantallas: las fotos del cliente a sangre se suceden y encima aparecen
//                     etiquetas chicas unidas por líneas que se dibujan al bajar ("From butter —— to palm oil"); un
//                     capítulo de lista cuyos renglones aparecen uno a uno ("Without animals / hormones / …").
//   StoryCanvasOutro→ "Sobre mí": foto chica centrada que se revela, titular de dos renglones escalonados y a la
//                     derecha texto + botón.
//   EntrypointChain → "Mi trabajo": cascada vertical de fotos en zigzag que se revelan y se mueven a distinto ritmo;
//                     a la derecha el texto fijo (titular que sube por renglón, texto y botón).
//   ImageCTAGrid    → "Paquetes" y "Lo que dicen": titular centrado y rejilla limpia con líneas finas.
//   BannerFullbleed → banda fija: la foto crece de recuadro a pantalla completa y entra un titular de dos renglones.
//   TheFooter       → pie en crema más oscuro: ligas, contacto con botón oscuro, el logo del cliente enorme a todo
//                     lo ancho y la línea final.
// Colores como savor: fondo crema, tinta muy oscura del color de la marca, botones claros (oscuro en el pie).
// Letras: títulos ligeros (300) y texto (400) del par que se le asigne (Blanca: Onest).
// Técnica: Motion (scroll e inView, MIT) + Lenis (desplazamiento suave, MIT), servidos en /vendor/ del API. Solo
// transform, opacity y clip-path. Sin JS, si no cargan las librerías, con "reducir movimiento" o en navegador
// automatizado (revisión visual): todo quieto y completo.
import { config } from '../config.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { METRICAS } from './tipo_color.js';

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

/** Frase corta: primera oración con cuerpo (se saltan saludos), hasta ~26 palabras. La usan también otras opciones. */
export function fraseDe(texto = '') {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!limpio) return '';
  const oraciones = limpio.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [limpio];
  const primera = (oraciones.find((o) => o.trim().split(' ').length >= 6) || oraciones[0]).trim();
  const ps = primera.split(' ');
  return ps.length > 26 ? `${ps.slice(0, 24).join(' ').replace(/[,;:]$/, '')}…` : primera;
}

/** Sirve /vendor/<archivo> (solo los archivos de VENDOR), con caché larga: el nombre lleva la versión. */
export async function servirVendor(c) {
  const nombre = c.req.param('nombre');
  if (!Object.values(VENDOR).includes(nombre)) return c.text('no', 404);
  const buf = await fs.readFile(path.join(DIR_VENDOR, nombre)).catch(() => null);
  if (!buf) return c.text('no', 404);
  return c.body(buf, 200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' });
}

/** Botón como el de savor: "palabra —— resto" (la raya crece al pasar el cursor). */
export function botonSv(texto, attrs, variante = '') {
  const ps = String(texto || '').trim().split(/\s+/).filter(Boolean);
  const a = ps[0] || '', b = ps.slice(1).join(' ');
  return `<a class="sv-btn${variante ? ` sv-btn--${variante}` : ''}"${attrs} aria-label="${esc(texto)}"><span aria-hidden="true">${esc(a)}</span><i class="sv-raya" aria-hidden="true"></i>${b ? `<span aria-hidden="true">${esc(b)}</span>` : ''}</a>`;
}

/** Divide un titular en dos renglones parejos (el segundo va escalonado, como "Inspired by / Earth's blueprints"). */
export function dosRenglones(texto = '') {
  const ps = String(texto || '').trim().split(/\s+/).filter(Boolean);
  if (ps.length < 2) return [ps.join(' '), ''];
  let mejor = 1, dif = Infinity;
  for (let k = 1; k < ps.length; k++) { const d = Math.abs(ps.slice(0, k).join(' ').length - ps.slice(k).join(' ').length); if (d < dif) { dif = d; mejor = k; } }
  return [ps.slice(0, mejor).join(' '), ps.slice(mejor).join(' ')];
}

export const urlLetras = (ft, fc) => {
  const pesos = (f, quiero) => { const m = METRICAS[f]?.pesos; const w = m ? quiero.filter((x) => m.includes(x)) : quiero; return w.length ? `:wght@${w.join(';')}` : ''; };
  const fams = ft === fc ? [[ft, [300, 400, 500]]] : [[ft, [300, 400]], [fc, [400, 500]]];
  return `https://fonts.googleapis.com/css2?${fams.map(([f, q]) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}${pesos(f, q)}`).join('&')}&display=swap`;
};

// Posiciones de las etiquetas del relato (en % de la pantalla) y la línea que las une, por capítulo (se alternan).
const PLANOS = [
  { x1: 8, y1: 28, x2: 44, y2: 52, d: 'M 22 29.5 L 34 29.5 Q 40 30 41 40 Q 42 50 43.5 51' },
  { x1: 54, y1: 22, x2: 14, y2: 64, d: 'M 53 24 Q 30 26 24 44 Q 20 58 19 62' },
  { x1: 10, y1: 70, x2: 58, y2: 34, d: 'M 24 70.5 Q 46 70 52 52 Q 55 40 57.5 36' },
  { x1: 50, y1: 66, x2: 12, y2: 26, d: 'M 49 67.5 Q 30 66 22 48 Q 17 34 15 28.5' },
];

/** Página completa de la opción I. Recibe los datos ya resueltos (no usa HTML ni CSS de la plantilla general). */
export function paginaHistoria(x) {
  const { nombre, letra, p, ft, fc, t, T, brief, img, wa, heroFoto, pasos, trabajo, retrato, videos, catalogos, documentos,
    resenasCap, testimonios, grupos, mostrarPrecios, faq, datos, redesHTML, logoClaro, logoOscuro, logoPie, fotoBanda } = x;
  const neg = brief.negocio || {}, conf = brief.confianza || {}, fund = conf.fundador || {};
  const ctaTxt = t.cta || 'Escríbeme';
  const btn = (v = '', texto = ctaTxt, attrs = wa) => botonSv(texto, attrs, v);
  const navs = [['trabajo', T.trabajo], grupos.length ? ['servicios', T.servicios] : null, ['sobre', T.sobre], testimonios.length || resenasCap.length ? ['resenas', T.resenas] : null, ['contacto', T.contacto]].filter(Boolean);
  const lin = (s) => `<span class="sv-lin sv-partir">${esc(s)}</span>`;

  // NavBar + TheMenu
  const nav = `<header class="sv-nav" data-sv-nav><a class="sv-marca" href="#inicio" aria-label="${esc(nombre)}"><span class="sv-lc">${logoClaro}</span><span class="sv-lo">${logoOscuro}</span></a><nav class="sv-ligas" aria-label="Secciones">${navs.map(([id, n]) => `<a href="#${id}">${esc(n)}</a>`).join('')}</nav><button class="sv-abre" type="button" aria-expanded="false" aria-controls="sv-menu">Menú</button></header>
<div class="sv-menu" id="sv-menu" hidden><button class="sv-cierra" type="button">Cerrar</button><nav aria-label="Menú">${navs.map(([id, n]) => `<a href="#${id}">${esc(n)}</a>`).join('')}</nav><div class="sv-menu-pie">${redesHTML}${datos.correo ? `<a href="mailto:${esc(datos.correo)}">${esc(datos.correo)}</a>` : ''}</div></div>`;

  // HeroVideo
  const hero = `<section class="sv-hero" id="inicio">${heroFoto ? img(heroFoto, { cls: 'sv-hero-img rep-ok', eager: true, extra: ' fetchpriority="high" sizes="100vw"' }) : ''}<div class="sv-hero-velo"></div><div class="sv-hero-in"><h1 class="sv-t1 sv-partir">${esc(t.titular)}</h1><div class="sv-hero-der">${t.subtitulo ? `<p>${esc(t.subtitulo)}</p>` : ''}${btn('claro')}</div></div></section>`;

  // StoryCanvas: un capítulo por foto (titular —— apoyo de su diapositiva) y uno de lista con los servicios.
  const fotosRel = pasos.slice(0, MAX_PASOS);
  const caps = fotosRel.map((s, k) => ({ tipo: 'par', foto: k, a: s.titular || '', b: s.apoyo || '' })).filter((c) => c.a || c.b);
  const lista = grupos.map((g) => g.nombre).filter(Boolean).slice(0, 6);
  if (lista.length >= 2 && fotosRel.length) caps.push({ tipo: 'lista', foto: fotosRel.length - 1, a: T.servicios, items: lista });
  const relato = fotosRel.length && caps.length ? `<section class="sv-relato" style="--n:${caps.length}" aria-label="${esc(nombre)}"><div class="sv-fijo"><div class="sv-fotos">${fotosRel.map((s, k) => `<figure class="sv-foto" data-k="${k}">${img(s.foto, { cls: 'rep-ok', sizes: ' sizes="100vw"' })}</figure>`).join('')}<div class="sv-fotos-velo"></div></div><div class="sv-caps">${caps.map((c, k) => {
    const pl = PLANOS[k % PLANOS.length];
    if (c.tipo === 'lista') return `<div class="sv-cap sv-cap-lista" data-foto="${c.foto}"><p class="sv-et sv-e1" style="left:${pl.x1}%;top:${pl.y1}%">${esc(c.a)}</p><ul class="sv-items" style="left:${pl.x1 + 16}%;top:${pl.y1}%">${c.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul></div>`;
    return `<div class="sv-cap" data-foto="${c.foto}">${c.a ? `<p class="sv-et sv-e1" style="left:${pl.x1}%;top:${pl.y1}%">${esc(c.a)}</p>` : ''}${c.a && c.b ? `<svg class="sv-linea" aria-hidden="true"><path data-d="${pl.d}" pathLength="1"/></svg>` : ''}${c.b ? `<p class="sv-et sv-e2" style="left:${pl.x2}%;top:${pl.y2}%">${esc(c.b)}</p>` : ''}</div>`;
  }).join('')}</div></div></section>` : '';

  // StoryCanvasOutro → Sobre mí
  const [s1, s2] = dosRenglones(fund.nombre || T.sobre);
  const textoSobre = String(t.sobre || conf.historia_corta || '').replace(/\r/g, '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const sobre = `<section class="sv-sobre" id="sobre">${retrato ? `<figure class="sv-retrato">${img(retrato, { cls: retrato.rep ? 'rep-ok' : '' })}</figure>` : ''}<h2 class="sv-t2 sv-escalon"><span class="sv-r1">${lin(s1)}</span>${s2 ? `<span class="sv-r2">${lin(s2)}</span>` : ''}</h2><div class="sv-sobre-txt sv-rev"><p class="sv-firma">${esc(T.sobre)}${fund.rol ? ` · ${esc(fund.rol)}` : ''}</p>${textoSobre.map((s) => `<p>${esc(s).replace(/\n/g, '<br>')}</p>`).join('')}${btn('claro')}</div></section>`;

  // EntrypointChain → Mi trabajo (cascada en zigzag + texto fijo)
  const ANCHOS = [62, 48, 56, 44, 60, 50], SANGRIA = [0, 34, 12, 46, 6, 28], RITMO = [0.6, -0.4, 0.9, -0.2, 0.5, -0.6];
  const cadenaFigs = [...trabajo.map((f) => ({ f })), ...videos.map((v) => ({ v }))].map((it, k) => `<figure class="sv-esl" style="--w:${ANCHOS[k % 6]}%;--x:${SANGRIA[k % 6]}%;--v:${RITMO[k % 6]}">${it.f ? img(it.f, { cls: it.f.rep ? 'rep-ok' : '' }) : `<video src="${esc(it.v.url)}" muted loop playsinline autoplay preload="metadata"></video>`}</figure>`).join('');
  const cadena = cadenaFigs ? `<section class="sv-cadena" id="trabajo"><div class="sv-cadena-fotos">${cadenaFigs}</div><div class="sv-cadena-txt"><div class="sv-cadena-fijo"><h2 class="sv-t2 sv-partir">${esc(T.trabajo)}</h2>${t.servicios_intro || t.subtitulo ? `<p class="sv-rev">${esc(t.servicios_intro || t.subtitulo)}</p>` : ''}${grupos.length ? btn('claro', `Ver ${T.servicios.toLowerCase()}`, ' href="#servicios"') : btn('claro')}</div></div></section>` : '';

  // ImageCTAGrid → Paquetes
  const opNombre = (g, o) => (o.nombre && o.nombre !== g.nombre ? o.nombre : '');
  const paquetes = grupos.length || catalogos.length || documentos.length ? `<section class="sv-rejilla" id="servicios"><h2 class="sv-t2 sv-centro sv-partir">${esc(T.servicios)}</h2><div class="sv-celdas">${grupos.map((g) => `<article class="sv-celda sv-rev"><h3>${esc(g.nombre)}</h3><ul>${g.opciones.map((o) => `<li>${opNombre(g, o) || (mostrarPrecios && o.precio) ? `<div class="sv-op"><b>${esc(opNombre(g, o))}</b>${mostrarPrecios && o.precio ? `<span>${esc(o.precio)}</span>` : ''}</div>` : ''}${o.detalle ? `<p>${esc(o.detalle).replace(/\n/g, '<br>')}</p>` : ''}</li>`).join('')}</ul></article>`).join('')}</div>${catalogos.length ? `<div class="sv-cats">${catalogos.map((c) => `<a href="${esc(c.url)}" target="_blank" rel="noopener">${img(c)}</a>`).join('')}</div>` : ''}${documentos.length ? `<p class="sv-docs">${documentos.map((d) => `<a href="${esc(d.url)}" target="_blank" rel="noopener">Ver ${esc(/pdf/i.test(d.url) ? 'catálogo (PDF)' : d.alt || 'documento')}</a>`).join(' · ')}</p>` : ''}<div class="sv-centro">${btn('osc', t.servicios_boton || ctaTxt)}</div></section>` : '';

  // BannerFullbleed
  const corto = (s) => (s && s.split(/\s+/).length <= 7 ? s : '');
  const lema = (corto(fraseDe(brief.oferta?.diferenciador || '')) || [...fotosRel].reverse().map((s) => s.titular).find(Boolean) || nombre).replace(/[.]$/, '');
  const [b1, b2] = dosRenglones(lema);
  const banda = fotoBanda ? `<section class="sv-banda"><div class="sv-banda-fijo"><div class="sv-banda-marco">${img(fotoBanda, { cls: 'rep-ok', sizes: ' sizes="100vw"' })}<div class="sv-banda-velo"></div><p class="sv-t2 sv-banda-t sv-escalon" role="heading" aria-level="2"><span class="sv-r1">${lin(b1)}</span>${b2 ? `<span class="sv-r2">${lin(b2)}</span>` : ''}</p></div></div></section>` : '';

  // ImageCTAGrid → Lo que dicen
  const resenas = testimonios.length || resenasCap.length ? `<section class="sv-rejilla sv-dicen" id="resenas"><h2 class="sv-t2 sv-centro sv-partir">${esc(T.resenas)}</h2><div class="sv-celdas">${testimonios.map((q) => `<blockquote class="sv-celda sv-rev"><p>${esc(String(q.texto).replace(/\p{Extended_Pictographic}/gu, '').trim())}</p>${q.nombre ? `<cite>${esc(q.nombre)}</cite>` : ''}</blockquote>`).join('')}${resenasCap.map((c) => `<figure class="sv-celda sv-cap-img sv-rev">${img(c)}</figure>`).join('')}</div></section>` : '';

  const preguntas = faq.length ? `<section class="sv-faq" id="faq"><h2 class="sv-t2 sv-partir">${esc(T.faq)}</h2><div class="sv-faq-l">${faq.map((q) => `<details class="sv-rev"><summary>${esc(q.pregunta)}</summary><p>${esc(q.respuesta)}</p></details>`).join('')}</div></section>` : '';

  // TheFooter (con id="contacto" y div.datos: ahí se agregan teléfono, "Cómo llegar" y mapa como en todas las opciones)
  const pie = `<footer class="sv-pie"><section id="contacto" class="sv-pie-arriba"><div class="sv-pie-ligas"><nav aria-label="Secciones">${navs.map(([id, n]) => `<a href="#${id}">${esc(n)}</a>`).join('')}</nav>${redesHTML ? `<div>${redesHTML}</div>` : ''}</div><div class="sv-pie-der"><h2 class="sv-pie-t">${esc(T.contacto)}</h2><div class="datos">${datos.whatsapp ? `<p><b>WhatsApp</b><a${wa}>${esc(datos.whatsapp)}</a></p>` : ''}${datos.donde ? `<p><b>Dónde</b>${esc(datos.donde)}</p>` : ''}${datos.horario ? `<p><b>Horario</b>${esc(datos.horario)}</p>` : ''}${datos.correo ? `<p><b>Correo</b><a href="mailto:${esc(datos.correo)}">${esc(datos.correo)}</a></p>` : ''}</div>${btn('osc')}</div></section><div class="sv-pie-marca" aria-hidden="true">${logoPie}</div><div class="sv-pie-abajo"><span>© ${new Date().getFullYear()} ${esc(nombre)}</span><span>${esc([neg.giro_texto ? String(neg.giro_texto).split(/[:;(]/)[0].trim() : '', neg.ciudad].filter(Boolean).join(' · '))}</span></div></footer>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(nombre)} · Propuesta ${letra}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preload" as="style" href="${esc(urlLetras(ft, fc))}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link href="${esc(urlLetras(ft, fc))}" rel="stylesheet"></noscript>
<style>${cssHistoria(p, ft, fc)}</style><script defer src="${esc(config.publicUrl)}/vendor/${VENDOR.motion}"></script><script defer src="${esc(config.publicUrl)}/vendor/${VENDOR.lenis}"></script></head>
<body class="l-historia">${nav}<main>${hero}${relato}${sobre}${cadena}${paquetes}${banda}${resenas}${preguntas}</main>${pie}<span class="etq">Propuesta ${letra}</span>${JS_HISTORIA}</body></html>`;
}

function cssHistoria(p, ft, fc) {
  return `
:root{--bg:${p.bg};--ink:${p.fg};--b2:color-mix(in srgb,${p.fg} 8%,${p.bg});--soft:${p.soft};--lin:color-mix(in srgb,${p.fg} 18%,transparent);--crema:color-mix(in srgb,${p.bg} 70%,#fff);--ft:'${ft}',system-ui,sans-serif;--fc:'${fc}',system-ui,sans-serif;--pad:clamp(20px,2.8vw,40px)}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}html.lenis,html.lenis body{height:auto}.lenis.lenis-stopped{overflow:clip}html.sv-lenis{scroll-behavior:auto}
body{background:var(--bg);color:var(--ink);font:400 20px/1.45 var(--fc);letter-spacing:-.01em;-webkit-font-smoothing:antialiased;overflow-x:clip}
img,video{display:block;max-width:100%}a{color:inherit}
.sv-t1,.sv-t2{font-family:var(--ft);font-weight:300;letter-spacing:-.025em;line-height:.92}
.sv-t1{font-size:clamp(52px,9.7vw,140px)}.sv-t2{font-size:clamp(44px,8.3vw,120px)}
.sv-centro{text-align:center;margin-inline:auto}
.sv-btn{display:inline-flex;white-space:nowrap;align-items:center;gap:14px;padding:18px 34px;border-radius:5px;background:var(--b2);color:var(--ink);text-decoration:none;font:400 20px/1.2 var(--fc);transition:background .3s}
.sv-btn .sv-raya{display:block;width:34px;height:1px;background:currentColor;transition:width .4s cubic-bezier(.19,1,.22,1)}
.sv-btn:hover .sv-raya{width:58px}.sv-btn:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.sv-btn--claro{background:var(--crema);color:var(--ink)}.sv-btn--osc{background:var(--ink);color:var(--crema)}
.sv-nav{position:fixed;inset:0 0 auto;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:20px var(--pad);color:var(--crema);transition:transform .5s cubic-bezier(.19,1,.22,1),background .3s,color .3s}
.sv-nav.sv-osc{color:var(--ink);background:color-mix(in srgb,var(--bg) 92%,transparent)}.sv-nav.sv-fuera{transform:translateY(-110%)}
.sv-marca{display:block;height:48px}.sv-marca img,.sv-marca .nombre{display:block;height:48px;width:auto;max-width:220px;object-fit:contain;font:400 26px/48px var(--ft)}
.sv-lo{display:none}.sv-osc .sv-lo{display:block}.sv-osc .sv-lc{display:none}
.sv-ligas{display:flex;gap:26px}.sv-ligas a{text-decoration:none;font-size:20px}.sv-ligas a:hover{text-decoration:underline;text-underline-offset:4px}
.sv-abre{display:none;background:none;border:0;color:inherit;font:400 20px var(--fc);cursor:pointer;min-height:44px}
.sv-menu{position:fixed;inset:0;z-index:50;background:var(--bg);color:var(--ink);padding:24px var(--pad);display:flex;flex-direction:column}
.sv-menu[hidden]{display:none}.sv-cierra{align-self:flex-end;background:none;border:0;font:400 20px var(--fc);color:inherit;cursor:pointer;min-height:44px}
.sv-menu nav{display:grid;gap:4px;margin-top:8vh}.sv-menu nav a{font:300 clamp(48px,12vw,96px)/1.02 var(--ft);letter-spacing:-.03em;text-decoration:none}
.sv-menu-pie{margin-top:auto;display:flex;flex-wrap:wrap;gap:16px;align-items:center}
@media (max-width:860px){.sv-ligas{display:none}.sv-abre{display:block}}
.sv-hero{position:relative;height:100svh;min-height:560px;overflow:hidden;color:var(--crema);background:var(--ink)}
.sv-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;max-width:none}
.sv-vivo .sv-hero-img{transform:scale(1.12);transition:transform 2.4s cubic-bezier(.19,1,.22,1)}.sv-vivo.sv-listo .sv-hero-img{transform:scale(1)}
.sv-hero-velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.3),rgba(0,0,0,0) 28%,rgba(0,0,0,.08) 50%,rgba(0,0,0,.55))}
.sv-hero-in{position:absolute;left:0;right:0;bottom:0;padding:0 var(--pad) clamp(28px,4vw,56px);display:grid;grid-template-columns:1fr auto;gap:24px 48px;align-items:end}
.sv-hero h1{max-width:9.5em}.sv-hero-der{display:grid;gap:clamp(20px,3vw,44px);justify-items:start;max-width:20ch}.sv-hero-der p{font-size:22px;line-height:1.35}
@media (max-width:860px){.sv-hero-in{grid-template-columns:1fr;padding-bottom:84px}.sv-hero-der{max-width:none}.sv-hero-der p{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}}
.sv-relato{position:relative;background:var(--ink)}
.sv-fotos{display:grid}.sv-foto{position:relative;height:90svh;overflow:hidden}.sv-foto img{width:100%;height:100%;object-fit:cover;max-width:none}
.sv-fotos-velo{display:none}
.sv-caps{display:grid;gap:28px;padding:56px var(--pad);color:var(--crema)}.sv-cap{position:relative}
.sv-et{font-size:20px;line-height:1.3;max-width:24ch}.sv-e2{margin-top:6px}.sv-linea{display:none}
.sv-items{list-style:none;margin-top:6px}.sv-cap-lista{display:flex;gap:28px}.sv-cap-lista .sv-items{margin-top:0}
.sv-vivo .sv-relato{height:calc(var(--n)*150svh + 60svh)}
.sv-vivo .sv-fijo{position:sticky;top:0;height:100svh;overflow:hidden}
.sv-vivo .sv-fotos{position:absolute;inset:0;display:block;z-index:0}
.sv-vivo .sv-foto{position:absolute;inset:0;height:auto;opacity:0;will-change:opacity}.sv-vivo .sv-foto[data-k="0"]{opacity:1}
.sv-vivo .sv-foto img{will-change:transform}
.sv-vivo .sv-fotos-velo{display:block;position:absolute;inset:0;background:radial-gradient(120% 90% at 30% 40%,rgba(0,0,0,.2),rgba(0,0,0,.45))}
.sv-vivo .sv-caps{position:absolute;inset:0;padding:0;display:block;z-index:1}
.sv-vivo .sv-cap{position:absolute;inset:0}
.sv-vivo .sv-et{position:absolute;opacity:0;will-change:opacity,transform;text-shadow:0 1px 18px rgba(0,0,0,.35)}
.sv-vivo .sv-linea{display:block;position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.sv-linea path{fill:none;stroke:var(--crema);stroke-width:1.2;stroke-dasharray:1;stroke-dashoffset:1}
.sv-vivo .sv-items{position:absolute;text-shadow:0 1px 18px rgba(0,0,0,.35)}.sv-vivo .sv-items li{opacity:0;will-change:opacity,transform}
@media (max-width:760px){.sv-vivo .sv-et,.sv-vivo .sv-items{left:var(--pad)!important;right:var(--pad);max-width:none}.sv-vivo .sv-e1{top:30%!important}.sv-vivo .sv-e2{top:54%!important}.sv-vivo .sv-items{top:calc(30% + 48px)!important}.sv-vivo .sv-linea{display:none}}
.sv-sobre{position:relative;padding:clamp(96px,12vw,180px) var(--pad);display:grid;grid-template-columns:1fr minmax(260px,34ch);gap:40px clamp(32px,6vw,96px);align-items:end}
.sv-retrato{grid-column:1/-1;justify-self:center;width:min(26vw,360px);aspect-ratio:3/4;overflow:hidden;border-radius:2px;margin-bottom:clamp(24px,4vw,56px)}.sv-retrato img{width:100%;height:100%;object-fit:cover}
.sv-escalon .sv-r1,.sv-escalon .sv-r2{display:block}.sv-escalon .sv-r2{padding-left:clamp(48px,18vw,300px)}
.sv-sobre-txt{display:grid;gap:16px;justify-items:start}.sv-sobre-txt p{font-size:20px;line-height:1.5}.sv-firma{color:var(--soft)}
.sv-sobre-txt .sv-btn{margin-top:12px}
@media (max-width:860px){.sv-sobre{grid-template-columns:1fr}.sv-retrato{width:min(64vw,360px)}}
.sv-cadena{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:0 clamp(24px,4vw,64px);padding:clamp(40px,6vw,96px) var(--pad) clamp(80px,10vw,160px)}
.sv-cadena-fotos{display:grid}
.sv-esl{width:var(--w);margin-left:var(--x);margin-top:-2.5vw;overflow:hidden;border-radius:2px;position:relative}.sv-esl:first-child{margin-top:0}
.sv-esl img,.sv-esl video{width:100%;height:auto}
.sv-cadena-txt{position:relative}.sv-cadena-fijo{position:sticky;top:28vh;display:grid;gap:22px;justify-items:start}.sv-cadena-fijo p{font-size:22px;line-height:1.35;max-width:30ch}
@media (max-width:860px){.sv-cadena{grid-template-columns:1fr}.sv-cadena-txt{order:-1;margin-bottom:40px}.sv-cadena-fijo{position:static}.sv-esl{width:min(100%,calc(var(--w) + 30%));margin-left:calc(var(--x) * .4)}}
.sv-rejilla{padding:clamp(80px,10vw,150px) var(--pad);display:grid;gap:clamp(32px,4vw,64px)}
.sv-celdas{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));border-top:1px solid var(--lin)}
.sv-celda{padding:32px clamp(16px,2vw,32px) 36px;border-bottom:1px solid var(--lin);border-right:1px solid var(--lin)}
.sv-celda h3{font:400 clamp(28px,2.6vw,38px)/1.05 var(--ft);letter-spacing:-.02em;margin-bottom:18px}
.sv-celda ul{list-style:none;display:grid;gap:16px}.sv-op{display:flex;justify-content:space-between;gap:12px;align-items:baseline}.sv-op b{font-weight:500}.sv-op span{white-space:nowrap}
.sv-celda li p{color:var(--soft);font-size:20px;margin-top:4px}
.sv-dicen blockquote p{font:300 clamp(24px,2vw,30px)/1.3 var(--ft);letter-spacing:-.01em}.sv-dicen cite{display:block;margin-top:16px;font-style:normal;color:var(--soft)}
.sv-cap-img img{width:100%;height:auto;border-radius:2px}.sv-cats{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}.sv-cats img{max-height:420px;width:auto}
.sv-docs{text-align:center}
.sv-banda{position:relative}.sv-banda-fijo{position:relative;height:100svh;overflow:hidden}
.sv-banda-marco{position:absolute;inset:0;overflow:hidden;color:var(--crema)}.sv-banda-marco img{width:100%;height:100%;object-fit:cover;max-width:none}
.sv-banda-velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.5))}
.sv-banda-t{position:absolute;left:var(--pad);right:var(--pad);bottom:clamp(36px,6vw,88px)}
.sv-vivo .sv-banda{height:210svh}.sv-vivo .sv-banda-fijo{position:sticky;top:0}
.sv-vivo .sv-banda-marco{clip-path:inset(14% 16% round 4px);will-change:clip-path}.sv-vivo .sv-banda-marco img{will-change:transform}
.sv-faq .sv-t2{font-size:clamp(40px,5.6vw,84px)}.sv-faq{padding:clamp(60px,8vw,120px) var(--pad);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:32px clamp(32px,6vw,96px);align-items:start}
.sv-faq details{border-top:1px solid var(--lin);padding:20px 0}.sv-faq details:last-child{border-bottom:1px solid var(--lin)}
.sv-faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;font-size:22px}.sv-faq summary::-webkit-details-marker{display:none}
.sv-faq summary::after{content:"+";font-weight:300}.sv-faq details[open] summary::after{content:"–"}.sv-faq details p{margin-top:12px;color:var(--soft)}
@media (max-width:860px){.sv-faq{grid-template-columns:1fr}}
.sv-pie{background:var(--b2);padding:clamp(64px,7vw,100px) var(--pad) 32px;overflow:hidden}
.sv-pie-arriba{display:grid;grid-template-columns:1fr minmax(280px,1fr);gap:40px}
.sv-pie-ligas{display:flex;flex-wrap:wrap;gap:24px clamp(32px,6vw,96px);align-content:start}.sv-pie-ligas nav{display:grid;gap:6px}.sv-pie-ligas a{text-decoration:none}.sv-pie-ligas a:hover{text-decoration:underline}
.sv-pie-der{display:grid;gap:20px;justify-items:start}.sv-pie-t{font:400 clamp(28px,2.4vw,34px)/1.2 var(--fc);letter-spacing:-.01em}
.sv-pie .datos{display:grid;gap:6px}.sv-pie .datos p{display:flex;flex-wrap:wrap;gap:4px 12px}.sv-pie .datos b{font-weight:500;min-width:7ch}
.sv-pie .mapa{width:100%;max-width:520px;border-radius:4px;overflow:hidden}.sv-pie .mapa iframe{width:100%;height:220px;border:0;display:block}
.sv-pie-marca{margin:clamp(48px,6vw,80px) 0 24px;will-change:transform}.sv-pie-marca img{width:100%;height:auto;max-height:40vw;object-fit:contain;object-position:left bottom}
.sv-pie-marca .nombre{display:block;font:300 clamp(64px,17vw,300px)/.85 var(--ft);letter-spacing:-.04em}
.sv-pie-abajo{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;color:var(--soft)}
.redes{display:flex;gap:12px;flex-wrap:wrap}.redes a{display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border:1px solid var(--lin);border-radius:50%}.redes svg{width:20px;height:20px}
@media (max-width:860px){.sv-pie-arriba{grid-template-columns:1fr}}
.etq{position:fixed;left:16px;bottom:16px;z-index:45;background:#111;color:#fff;font:700 14px/1 var(--fc);padding:9px 12px;border-radius:999px}
.sv-ren{display:block;overflow:hidden;padding-bottom:.1em;margin-bottom:-.1em}.sv-ren>span{display:block;transition:transform 1.25s cubic-bezier(.19,1,.22,1)}
.sv-lin.sv-partido{display:block}
.sv-vivo .sv-partido:not(.sv-in) .sv-ren>span{transform:translateY(108%);transition:none}
.sv-vivo .sv-rev{transition:opacity 1s cubic-bezier(.19,1,.22,1),transform 1.2s cubic-bezier(.19,1,.22,1)}
.sv-vivo .sv-rev:not(.sv-in){opacity:0;transform:translateY(40px)}
.sv-vivo .sv-retrato>img,.sv-vivo .sv-esl>*{clip-path:inset(0);transition:clip-path 1.4s cubic-bezier(.19,1,.22,1)}
.sv-vivo .sv-retrato:not(.sv-in)>img,.sv-vivo .sv-esl:not(.sv-in)>*{clip-path:inset(100% 0 0 0)}
.sv-vivo .sv-esl img,.sv-vivo .sv-esl video{will-change:transform}
`;
}

// JS en línea (String.raw: sin backticks ni ${} adentro). Corre en DOMContentLoaded, cuando Motion y Lenis (defer) ya cargaron.
export const JS_HISTORIA = String.raw`<script>(()=>{
var D=document,H=D.documentElement,$$=function(s,r){return [].slice.call((r||D).querySelectorAll(s))};
var cl=function(x){return Math.min(1,Math.max(0,x))},ez=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
var nav=D.querySelector('[data-sv-nav]'),ab=D.querySelector('.sv-abre'),mn=D.getElementById('sv-menu');
var pon=function(v){if(!mn)return;mn.hidden=!v;ab&&ab.setAttribute('aria-expanded',v?'true':'false');D.body.style.overflow=v?'hidden':'';if(window.__svL){if(v)window.__svL.stop();else window.__svL.start()}if(v){var a=mn.querySelector('a');a&&a.focus()}else ab&&ab.focus()};
ab&&ab.addEventListener('click',function(){pon(true)});mn&&mn.querySelector('.sv-cierra').addEventListener('click',function(){pon(false)});
mn&&mn.addEventListener('click',function(e){if(e.target.closest('a'))pon(false)});D.addEventListener('keydown',function(e){if(e.key==='Escape'&&mn&&!mn.hidden)pon(false)});
var hero=D.querySelector('.sv-hero'),y0=0;
var barra=function(){if(!nav)return;var y=scrollY,hh=hero?hero.offsetHeight-80:0;nav.classList.toggle('sv-osc',y>hh);if(y>hh&&y>y0+4)nav.classList.add('sv-fuera');else if(y<y0-4||y<=hh)nav.classList.remove('sv-fuera');y0=y};
addEventListener('scroll',barra,{passive:true});barra();
var partir=function(el){var ws=el.textContent.trim().split(/\s+/),sp=[];el.textContent='';
ws.forEach(function(w,i){var s=D.createElement('span');s.textContent=w+(i<ws.length-1?' ':'');el.appendChild(s);sp.push(s)});
var ls=[],t=null;sp.forEach(function(s){var o=s.offsetTop;if(o!==t){ls.push([]);t=o}ls[ls.length-1].push(s.textContent)});
el.textContent='';ls.forEach(function(l,k){var r=D.createElement('span');r.className='sv-ren';var i=D.createElement('span');i.textContent=l.join('');i.style.transitionDelay=(k*110)+'ms';r.appendChild(i);el.appendChild(r)});el.classList.add('sv-partido')};
var go=function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches||navigator.webdriver||!window.Motion||!Motion.scroll)return;
var M=window.Motion;
try{if(window.Lenis){window.__svL=new Lenis({autoRaf:true,anchors:true});H.classList.add('sv-lenis')}}catch(e){}
H.classList.add('sv-vivo');
$$('.sv-partir').forEach(partir);
var h1=D.querySelector('.sv-hero h1');
requestAnimationFrame(function(){requestAnimationFrame(function(){H.classList.add('sv-listo');h1&&h1.classList.add('sv-in')})});
var hi=D.querySelector('.sv-hero-img'),hin=D.querySelector('.sv-hero-in');
if(hero)M.scroll(function(p){if(hi&&p>0)hi.style.transform='translate3d(0,'+(p*18).toFixed(2)+'%,0) scale('+(1+p*.06).toFixed(4)+')';if(hin)hin.style.opacity=cl(1-p*1.6).toFixed(3)},{target:hero,offset:['start start','end start']});
var rel=D.querySelector('.sv-relato');
if(rel){var fs=$$('.sv-foto',rel),ims=fs.map(function(f){return f.querySelector('img')}),cps=$$('.sv-cap',rel),N=cps.length,
fotoDe=cps.map(function(c){return +c.getAttribute('data-foto')}),
et=cps.map(function(c){return {a:c.querySelector('.sv-e1'),b:c.querySelector('.sv-e2'),l:c.querySelector('.sv-linea path'),it:$$('.sv-items li',c)}});
var trazos=$$('.sv-linea',rel),traza=function(){var W=rel.querySelector('.sv-fijo').clientWidth,Hh=rel.querySelector('.sv-fijo').clientHeight;trazos.forEach(function(sv){sv.setAttribute('viewBox','0 0 '+W+' '+Hh);var pa=sv.querySelector('path'),i=0;pa.setAttribute('d',pa.getAttribute('data-d').replace(/-?\d+(\.\d+)?/g,function(n){var v=parseFloat(n)*((i++%2)?Hh:W)/100;return v.toFixed(1)}))})};traza();addEventListener('resize',traza);
M.scroll(function(p){var x=p*N,k=Math.min(N-1,Math.floor(x)),fk=fotoDe[k],sig=k+1<N?fotoDe[k+1]:fk,mz=sig!==fk?cl((x-k-.8)/.2):0;
fs.forEach(function(f,j){var v=j===fk?1:j===sig?mz:0;f.style.opacity=v.toFixed(3);f.style.zIndex=j===sig&&sig!==fk?2:1;
if(ims[j]){var ks=fotoDe.indexOf(j),ke=fotoDe.lastIndexOf(j),q=ks<0?0:cl((x-ks+.2)/(ke-ks+1.2));ims[j].style.transform='scale('+(1.14-.14*q).toFixed(4)+')'}});
et.forEach(function(e,j){var o=j<N-1?cl((x-j-.84)/.12):0,s=function(a){return (a*(1-o)).toFixed(3)};
if(e.a){var a=cl((x-j-.04)/.14);e.a.style.opacity=s(a);e.a.style.transform='translate3d(0,'+((1-a)*14).toFixed(1)+'px,0)'}
if(e.l){var d=cl((x-j-.18)/.32);e.l.style.strokeDashoffset=(1-d).toFixed(4);e.l.parentNode.style.opacity=(1-o).toFixed(3)}
if(e.b){var b=cl((x-j-.48)/.14);e.b.style.opacity=s(b);e.b.style.transform='translate3d(0,'+((1-b)*14).toFixed(1)+'px,0)'}
e.it.forEach(function(li,i){var v=cl((x-j-.2-i*.09)/.1);li.style.opacity=s(v);li.style.transform='translate3d(0,'+((1-v)*12).toFixed(1)+'px,0)'})})},{target:rel,offset:['start start','end end']})}
/* aparecen al entrar (también si se llega saltando con una liga: todo lo que ya quedó arriba se muestra) */
var pend=$$('.sv-partido,.sv-rev,.sv-retrato,.sv-esl').filter(function(el){return !el.closest('.sv-hero')&&!el.closest('.sv-banda')}),rq=0;
var revisa=function(){rq=0;var lim=innerHeight*.88;pend=pend.filter(function(el){if(el.getBoundingClientRect().top<lim){el.classList.add('sv-in');return false}return true})};
addEventListener('scroll',function(){if(!rq)rq=requestAnimationFrame(revisa)},{passive:true});revisa();
$$('.sv-esl').forEach(function(f){var i=f.querySelector('img,video'),v=parseFloat(f.style.getPropertyValue('--v'))||0;if(i)M.scroll(function(p){i.style.transform='translate3d(0,'+((.5-p)*v*70).toFixed(1)+'px,0) scale(1.12)'},{target:f,offset:['start end','end start']})});
var bd=D.querySelector('.sv-banda');
if(bd){var mc=bd.querySelector('.sv-banda-marco'),bi=mc.querySelector('img'),bts=$$('.sv-partido',bd);
M.scroll(function(p){var e=ez(cl(p/.6));mc.style.clipPath='inset('+((1-e)*14).toFixed(2)+'% '+((1-e)*16).toFixed(2)+'% round '+((1-e)*4).toFixed(1)+'px)';if(bi)bi.style.transform='scale('+(1.18-.18*e).toFixed(4)+')';bts.forEach(function(s){s.classList.toggle('sv-in',p>.48)})},{target:bd,offset:['start start','end end']})}
var pm=D.querySelector('.sv-pie-marca');
if(pm)M.scroll(function(p){pm.style.transform='translate3d(0,'+((1-ez(p))*28).toFixed(2)+'%,0)'},{target:pm,offset:['start end','end end']});
};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',go);else go();
})();</script>`;

// La revisión visual automática corre en navegador automatizado: el JS no anima y la página se mide quieta y completa.
export const CSS_REVISION_HISTORIA = '.sv-nav{position:absolute!important}';
