// 6 propuestas de diseño como páginas HTML navegables (cada una con su liga), con los materiales reales del cliente:
// logo, productos sin fondo, precios y secciones de su menú, imágenes de su menú, contacto. Responsive (celular primero).
// Cada propuesta cambia composición, paleta y tipografía (poco común, acorde al estilo del cliente).
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { mezclar, contraste } from '../entrevista/tema.js';
import { paresTipograficos, urlFuentes } from './fuentes.js';
import { coloresDePalabras, logoTenido } from './materiales.js';
import { waUrl, formatoTel } from './bloques.js';
import { paginasGenerales, logoHTML } from './propuestas_general.js';
import { completarMaterial } from './validar_material.js';

export const DIR_PROPUESTAS = path.join(config.dataDir, 'propuestas');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LAYOUTS = ['protagonista', 'menu', 'fresco', 'mascota', 'dostonos', 'lista'];
const NOMBRES = { protagonista: 'Producto protagonista', menu: 'Tu menú al frente', fresco: 'Fresca con acento', mascota: 'Tu logo al centro', dostonos: 'Dos tonos', lista: 'Minimalista tipo carta' };

/* ---------------- Paletas ---------------- */
const lum = (h) => { const n = parseInt(h.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const sobre = (bg, a = '#FFFFFF', b = '#1A1410') => (contraste(a, bg) >= contraste(b, bg) ? a : b);
function base(colores) {
  const cs = colores.filter((c) => /^#[0-9A-F]{6}$/i.test(c));
  const oscuros = cs.filter((c) => lum(c) < 0.18), claros = cs.filter((c) => lum(c) > 0.55), medios = cs.filter((c) => lum(c) >= 0.18 && lum(c) <= 0.55);
  const principal = oscuros[0] || medios[0] || '#3E2A20';
  const claro = claros[0] || mezclar(principal, '#FFFFFF', 0.9);
  const acento = cs.find((c) => c !== principal && c !== claro && Math.abs(lum(c) - lum(principal)) > 0.02) || mezclar(principal, '#FFFFFF', 0.35);
  return { principal, claro, acento };
}
function paleta(layout, b) {
  const crema = mezclar(b.claro, '#FFFFFF', 0.45);
  const tinta = mezclar(b.principal, '#000000', 0.25);
  const p = {
    protagonista: { bg: crema, fg: tinta, primary: b.principal, accent: b.acento, muted: mezclar(crema, b.principal, 0.08), card: '#FFFFFF' },
    menu: { bg: mezclar(b.principal, '#000000', 0.2), fg: crema, primary: crema, accent: b.acento, muted: mezclar(b.principal, '#000000', 0.05), card: mezclar(b.principal, '#FFFFFF', 0.08) },
    fresco: { bg: crema, fg: tinta, primary: b.acento, accent: b.principal, muted: mezclar(b.claro, b.principal, 0.1), card: mezclar(crema, '#FFFFFF', 0.6) },
    mascota: { bg: crema, fg: tinta, primary: b.principal, accent: b.acento, muted: mezclar(crema, b.principal, 0.1), card: '#FFFFFF' },
    dostonos: { bg: crema, fg: tinta, primary: b.principal, accent: b.acento, muted: mezclar(b.principal, '#000000', 0.1), card: '#FFFFFF' },
    lista: { bg: mezclar(crema, '#FFFFFF', 0.5), fg: tinta, primary: b.acento, accent: b.principal, muted: mezclar(b.acento, '#FFFFFF', 0.82), card: '#FFFFFF' },
  }[layout];
  p.onPrimary = sobre(p.primary); p.soft = mezclar(p.fg, p.bg, 0.35); p.border = mezclar(p.fg, p.bg, 0.85);
  if (contraste(p.primary, p.bg) < 3) p.primary = mezclar(p.primary, p.fg, 0.4), p.onPrimary = sobre(p.primary);
  return p;
}

/* ---------------- Datos del negocio ---------------- */
// "12 oz $60 / 16 oz $80" → 60 (el menor monto con signo de pesos; si no hay $, el primer número de 2+ cifras).
const precioNum = (s) => { const t = String(s || ''); const m = [...t.matchAll(/\$\s?(\d+(?:[.,]\d+)?)/g)].map((x) => Number(x[1].replace(',', '.'))); if (m.length) return Math.min(...m); const n = t.match(/\b(\d{2,4})\b/); return n ? Number(n[1]) : null; };
function categorias(menuTexto) {
  const grupos = new Map();
  for (const sec of menuTexto || []) {
    const nombre = String(sec.seccion || '').split(/[-–(]/)[0].replace(/bebidas\s*/i, '').trim() || sec.seccion;
    const sub = String(sec.seccion || '').split(/[-–]/)[1]?.replace(/[()*]/g, '').trim();
    const clave = /frapp/i.test(nombre) ? 'Frappés' : (sub && /bebidas/i.test(sec.seccion) ? sub : nombre);
    const precios = (sec.items || []).map((i) => precioNum(i.precio)).filter(Boolean);
    if (!precios.length) continue;
    const g = grupos.get(clave) || { nombre: clave.charAt(0).toUpperCase() + clave.slice(1), desde: Infinity, items: [] };
    g.desde = Math.min(g.desde, ...precios); g.items.push(...sec.items); grupos.set(clave, g);
  }
  return [...grupos.values()].slice(0, 8);
}
function productos(mat, menuTexto) {
  const items = (menuTexto || []).flatMap((s) => s.items || []);
  const buscar = (n) => { const k = String(n || '').toLowerCase(); return items.find((i) => String(i.nombre).toLowerCase() === k) || items.find((i) => { const x = String(i.nombre).toLowerCase(); return x && (x.includes(k) || k.includes(x)); }); };
  return mat.fotos.filter((f) => f.sin_fondo || f.tipo === 'foto_producto').map((f) => { const it = buscar(f.alt); return { nombre: f.alt || it?.nombre, precio: it?.precio || '', descripcion: it?.descripcion || '', img: f.sin_fondo || f.url, alto: f.alto, ancho: f.ancho }; }).filter((p) => p.nombre);
}

/* ---------------- Plantilla ---------------- */
function pagina(d) {
  const { pal: p, f } = d;
  const prod = d.productos;
  const top = prod.slice(0, 6);
  const heroImgs = d.heroImgs;
  const wa = d.wa ? ` href="${esc(d.wa)}" target="_blank" rel="noopener"` : '';
  const logo = d.logoObj ? logoHTML(d.logoObj, p.bg, p.fg, { alt: d.nombre }) : `<span class="nombre">${esc(d.nombre)}</span>`;
  const tarjetas = top.map((x) => `<article class="prod"><div class="ph"><img src="${esc(x.img)}" alt="${esc(x.nombre)}" loading="lazy"></div><h3>${esc(x.nombre)}</h3>${x.precio ? `<p class="precio">${esc(x.precio)}</p>` : ''}</article>`).join('');
  const cats = d.categorias.map((c) => `<a class="cat" href="#menu"><b>${esc(c.nombre)}</b><span>desde $${c.desde}</span></a>`).join('');
  const menuTxt = d.categorias.map((c, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(c.nombre)} <span>desde $${c.desde}</span></summary><ul>${c.items.slice(0, 14).map((it) => `<li><span><b>${esc(it.nombre)}</b>${it.descripcion ? `<small>${esc(it.descripcion)}</small>` : ''}</span><em>${esc(it.precio || '')}</em></li>`).join('')}</ul></details>`).join('');
  const menuImgs = d.menus.length ? `<div class="carr" aria-roledescription="carrusel" aria-label="Imágenes del menú"><div class="pista">${d.menus.map((u, i) => `<a class="slide" href="${esc(u)}" target="_blank" rel="noopener" aria-label="Menú ${i + 1} de ${d.menus.length}"><img src="${esc(u)}" alt="Menú de ${esc(d.nombre)} (${i + 1} de ${d.menus.length})" loading="${i < 2 ? 'eager' : 'lazy'}"></a>`).join('')}</div>${d.menus.length > 1 ? `<button class="cb prev" type="button" aria-label="Anterior">‹</button><button class="cb next" type="button" aria-label="Siguiente">›</button><div class="puntos">${d.menus.map((_, i) => `<button type="button" aria-label="Ir al menú ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}</div>` : ''}</div>` : '';
  const info = d.info.map((t) => `<li>${esc(t)}</li>`).join('');
  const vis = `<section class="sec visita" id="contacto"><h2>${esc(d.textos.visita || 'Visítanos')}</h2><div class="vis">${d.direccion ? `<p><b>Dónde</b>${esc(d.direccion)}</p>` : ''}${d.horarios ? `<p><b>Horario</b>${esc(d.horarios)}</p>` : ''}${d.tel ? `<p><b>WhatsApp</b><a${wa}>${esc(d.tel)}</a></p>` : ''}</div><a class="btn"${wa}>${esc(d.textos.cta)}</a></section>`;

  const heros = {
    protagonista: `<section class="hero h-prot"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><div class="ctas"><a class="btn"${wa}>${esc(d.textos.cta)}</a><a class="lnk" href="#menu">Ver menú</a></div><ul class="info">${info}</ul></div><div class="vis1"><img src="${esc(heroImgs[0])}" alt=""></div></section>`,
    menu: `<section class="hero h-menu"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><a class="btn"${wa}>${esc(d.textos.cta)}</a></div><div class="vasos">${heroImgs.slice(0, 3).map((u, k) => `<img class="${k === 1 ? 'c' : ''}" src="${esc(u)}" alt="">`).join('')}</div></section>`,
    fresco: `<section class="hero h-fresco"><div class="caja"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p></div><div class="vasos">${heroImgs.slice(0, 2).map((u) => `<img src="${esc(u)}" alt="">`).join('')}</div></div><a class="btn ancho"${wa}>${esc(d.textos.cta)}</a></section>`,
    mascota: `<section class="hero h-masc">${d.logo ? `<img class="logo-grande" src="${esc(d.logo)}" alt="${esc(d.nombre)}">` : ''}<h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><div class="trio">${heroImgs.slice(0, 3).map((u, i) => `<img class="${i === 1 ? 'c' : ''}" src="${esc(u)}" alt="">`).join('')}</div><a class="btn ancho"${wa}>${esc(d.textos.cta)}</a><ul class="info centro">${info}</ul></section>`,
    dostonos: `<section class="hero h-dos"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><a class="btn inv"${wa}>${esc(d.textos.cta)}</a></div><div class="vasos">${heroImgs.slice(0, 2).map((u) => `<img src="${esc(u)}" alt="">`).join('')}</div></section>`,
    lista: `<section class="hero h-lista"><div class="circulo"><img src="${esc(heroImgs[0])}" alt=""></div><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><a class="btn ancho"${wa}>${esc(d.textos.cta)}</a></section>`,
  };
  const secDest = `<section class="sec" id="destacados"><h2>${esc(d.textos.destacados || 'Lo más pedido')}</h2><div class="prods">${tarjetas}</div></section>`;
  const secCats = cats ? `<section class="sec"><h2>${esc(d.textos.categorias || 'Elige tu antojo')}</h2><div class="cats">${cats}</div></section>` : '';
  // Imágenes del menú del cliente: carrusel navegable justo debajo del título "Menú" (en todas las propuestas).
  const secMenu = `<section class="sec menu" id="menu"><h2>Menú</h2>${menuImgs}<div class="mtxt">${menuTxt}</div></section>`;
  const orden = {
    protagonista: [secDest, secCats, secMenu, vis], menu: [secDest, secCats, secMenu, vis], fresco: [secDest, secMenu, secCats, vis],
    mascota: [secCats, secDest, secMenu, vis], dostonos: [secCats, secDest, secMenu, vis], lista: [secMenu, secDest, vis],
  }[d.layout];

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(d.nombre)} · Propuesta ${d.letra}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${esc(d.fuentesUrl)}" rel="stylesheet">
<style>
:root{--bg:${p.bg};--fg:${p.fg};--p:${p.primary};--on:${p.onPrimary};--acc:${p.accent};--mut:${p.muted};--card:${p.card};--soft:${p.soft};--bor:${p.border};--ft:'${f.titulos}',serif;--fc:'${f.cuerpo}',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:var(--bg);color:var(--fg);font-family:var(--fc);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}a{color:inherit}
h1,h2,h3{font-family:var(--ft);line-height:1.08;letter-spacing:-.01em;text-wrap:balance}h1{font-size:clamp(32px,8.5vw,60px)}h2{font-size:clamp(24px,6vw,36px);margin-bottom:16px}
.barra{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--bor)}
.barra .in{max-width:1120px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:10px 20px}
.logo{height:44px;width:auto}body.menu .logo,body.dostonos .logo{background:#F6EFE3;padding:4px 10px;border-radius:12px;height:52px}.nombre{font-family:var(--ft);font-size:20px;font-weight:700}
.barra nav{display:flex;gap:18px;font-weight:600;font-size:15px}.barra nav a{text-decoration:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.sub{color:var(--soft);font-size:clamp(16px,4.2vw,19px);margin-top:12px;max-width:34ch}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--p);color:var(--on);font-weight:700;text-decoration:none;padding:14px 22px;border-radius:999px;margin-top:20px;min-height:48px}
.btn.ancho{display:flex;width:100%}.btn.inv{background:var(--bg);color:var(--fg)}
.lnk{font-weight:700;margin-left:16px;text-underline-offset:5px}
.info{list-style:none;display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:16px;font-size:14px;font-weight:600;color:var(--acc)}.info li::before{content:"● ";font-size:10px;vertical-align:2px}.info.centro{justify-content:center}
.hero{padding:28px 0 8px}
.h-prot{display:grid;grid-template-columns:1.2fr 1fr;gap:12px;align-items:end}.h-prot .vis1 img{max-height:340px;margin-left:auto;object-fit:contain;filter:drop-shadow(0 16px 22px rgba(0,0,0,.18))}
.h-menu{display:grid;grid-template-columns:1fr;gap:6px}.h-menu .vasos{display:flex;justify-content:center;align-items:flex-end;gap:4px;margin-top:18px}.h-menu .vasos img{height:150px;width:auto;object-fit:contain;filter:drop-shadow(0 12px 16px rgba(0,0,0,.35))}.h-menu .vasos img.c{height:200px}
.carr{position:relative;margin:4px -20px 26px}.pista{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 20px;padding:4px 20px 12px;scrollbar-width:none}.pista::-webkit-scrollbar{display:none}
.slide{flex:0 0 78%;scroll-snap-align:start;display:block}.slide img{width:100%;height:auto;border-radius:18px;box-shadow:0 10px 26px rgba(0,0,0,.18)}
.cb{position:absolute;top:calc(50% - 26px);width:44px;height:44px;border-radius:50%;border:0;background:var(--card);color:var(--fg);font-size:28px;line-height:1;box-shadow:0 4px 14px rgba(0,0,0,.2);cursor:pointer;display:grid;place-items:center}.cb.prev{left:8px}.cb.next{right:8px}.cb:disabled{opacity:.35;cursor:default}
.puntos{display:flex;justify-content:center;gap:8px}.puntos button{width:9px;height:9px;border-radius:50%;border:0;background:var(--bor);padding:0;cursor:pointer}.puntos button[aria-current="true"]{background:var(--p);width:22px;border-radius:9px}
.cb:focus-visible,.puntos button:focus-visible{outline:3px solid var(--acc);outline-offset:2px}
.hint{font-size:13px;color:var(--soft);margin-top:8px}
.h-fresco .caja{background:var(--mut);border-radius:28px;padding:26px 22px 0;display:grid;grid-template-columns:1fr;overflow:hidden}.h-fresco .vasos{display:flex;justify-content:flex-end;align-items:flex-end;gap:4px;margin-top:6px}.h-fresco .vasos img{height:210px;object-fit:contain;filter:drop-shadow(0 12px 16px rgba(0,0,0,.18))}
.h-masc{text-align:center}.h-masc .sub{margin:12px auto 0}.logo-grande{width:min(86%,420px);margin:0 auto 10px}.trio{display:flex;justify-content:center;align-items:flex-end;gap:6px;margin-top:18px}.trio img{height:130px;width:auto;object-fit:contain;filter:drop-shadow(0 10px 14px rgba(0,0,0,.18))}.trio img.c{height:170px}
body.dostonos .barra{background:var(--muted-dark,${mezclar(p.primary, '#000000', 0.15)});color:${sobre(mezclar(p.primary, '#000000', 0.15))};border:0}
.h-dos{background:${mezclar(p.primary, '#000000', 0.15)};color:${sobre(mezclar(p.primary, '#000000', 0.15))};margin:0 -20px;padding:22px 20px 0;border-radius:0 0 32px 32px;display:grid;grid-template-columns:1fr;overflow:hidden}.h-dos .sub{color:inherit;opacity:.85}.h-dos .vasos{display:flex;justify-content:flex-end;align-items:flex-end;gap:2px;margin-top:10px}.h-dos .vasos img{height:200px;object-fit:contain;filter:drop-shadow(0 12px 16px rgba(0,0,0,.35))}.h-dos .vasos img+img{height:160px;order:-1}
.h-lista{text-align:center}.h-lista .sub{margin:10px auto 0}.circulo{position:relative;height:300px;display:flex;justify-content:center;align-items:flex-end}.circulo::before{content:"";position:absolute;left:50%;top:10px;transform:translateX(-50%);width:260px;height:260px;border-radius:50%;background:var(--mut)}.circulo img{position:relative;height:270px;width:auto;object-fit:contain;filter:drop-shadow(0 14px 18px rgba(0,0,0,.18))}
.sec{padding:40px 0 8px}section[id]{scroll-margin-top:76px}
.prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.prod{background:var(--card);border:1px solid var(--bor);border-radius:20px;padding:12px 12px 14px;text-align:center}.prod .ph{height:140px;display:flex;align-items:flex-end;justify-content:center}.prod img{max-height:140px;width:auto;object-fit:contain}
.prod h3{font-size:16px;margin-top:10px;font-family:var(--fc);font-weight:700}.precio{color:var(--p);font-weight:800;margin-top:2px}
body.menu .prod,body.menu .cat{color:var(--fg)}
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}.cat{background:var(--card);border:1px solid var(--bor);border-radius:16px;padding:14px;text-decoration:none;text-align:center}.cat b{display:block;font-size:16px}.cat span{font-size:13px;font-weight:700;color:var(--acc)}
.mtxt details{border-bottom:1px solid var(--bor);padding:14px 0}.mtxt summary{font-family:var(--ft);font-size:20px;cursor:pointer;display:flex;justify-content:space-between;align-items:baseline;list-style:none}.mtxt summary::-webkit-details-marker{display:none}.mtxt summary span{font-family:var(--fc);font-size:14px;font-weight:700;color:var(--acc)}
.mtxt ul{list-style:none;margin-top:10px}.mtxt li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px dashed var(--bor)}.mtxt li small{display:block;color:var(--soft);font-size:13px}.mtxt li em{font-style:normal;font-weight:800;color:var(--p);white-space:nowrap}

.vis{display:grid;gap:12px}.vis p{display:flex;flex-direction:column}.vis b{font-family:var(--ft);font-size:18px}
footer{margin-top:48px;padding:24px 20px 90px;border-top:1px solid var(--bor);font-size:14px;color:var(--soft);text-align:center}
.wa{position:fixed;right:16px;bottom:16px;width:58px;height:58px;border-radius:50%;background:#1F7A4C;display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.25);z-index:30}.wa svg{width:30px;height:30px;fill:#fff}
.etq{position:fixed;left:16px;bottom:16px;z-index:30;background:#111;color:#fff;font:700 14px/1 var(--fc);padding:9px 12px;border-radius:999px}
@media (max-width:760px){.barra nav{display:none}.h-prot{grid-template-columns:1.25fr 1fr}.h-prot .vis1 img{max-height:260px}}
@media (min-width:900px){.slide{flex-basis:31%}.carr{margin:4px 0 30px}.pista{padding:4px 0 12px;scroll-padding:0}.h-menu{grid-template-columns:1.1fr 1fr;align-items:end}.h-menu .vasos img{height:240px}.h-menu .vasos img.c{height:320px}.hero{padding-top:56px}.h-fresco .caja{grid-template-columns:1.1fr 1fr;align-items:end}.h-dos{grid-template-columns:1.1fr 1fr;align-items:end;margin:0;border-radius:32px;padding:40px}.h-dos .vasos img{height:320px}.h-dos .vasos img+img{height:250px}.trio img{height:200px}.trio img.c{height:260px}.circulo{height:380px}.circulo::before{width:340px;height:340px}.circulo img{height:350px}.vis{grid-template-columns:repeat(3,1fr)}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head>
<body class="${d.layout}">
<header class="barra"><div class="in">${logo}<nav><a href="#destacados">${esc(d.textos.destacados || 'Lo más pedido')}</a><a href="#menu">Menú</a><a href="#contacto">Contacto</a></nav></div></header>
<main class="wrap">${heros[d.layout]}${orden.join('')}</main>
<footer>© ${new Date().getFullYear()} ${esc(d.nombre)} · Propuesta ${d.letra}: ${esc(NOMBRES[d.layout])}</footer>
<span class="etq">Propuesta ${d.letra}</span>
<a class="wa"${wa} aria-label="Escríbenos por WhatsApp"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.3c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.3Z"/></svg></a>
<script>
document.querySelectorAll('.carr').forEach(function(c){var p=c.querySelector('.pista'),s=[].slice.call(p.children),d=[].slice.call(c.querySelectorAll('.puntos button')),a=c.querySelector('.prev'),b=c.querySelector('.next');if(!a)return;
function idx(){var x=p.scrollLeft,m=0,best=1e9;s.forEach(function(el,i){var dd=Math.abs(el.offsetLeft-p.offsetLeft-x-20);if(dd<best){best=dd;m=i}});return m}
function ir(i){i=Math.max(0,Math.min(s.length-1,i));p.scrollTo({left:s[i].offsetLeft-p.offsetLeft-20,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
function upd(){var i=idx();d.forEach(function(el,k){el.setAttribute('aria-current',k===i?'true':'false')});a.disabled=i===0;b.disabled=p.scrollLeft+p.clientWidth>=p.scrollWidth-4}
a.onclick=function(){ir(idx()-1)};b.onclick=function(){ir(idx()+1)};d.forEach(function(el,k){el.onclick=function(){ir(k)}});p.addEventListener('scroll',function(){clearTimeout(p._t);p._t=setTimeout(upd,60)},{passive:true});upd()});
</script>
</body></html>`;
}

/**
 * Crea las 6 propuestas y las guarda como HTML. Devuelve [{letra, layout, nombre, url, fuentes, paleta}].
 * @param {object} brief
 * @param {object} mat     procesarMateriales(...)
 * @param {object} textos  {variantes:[{titular, subtitulo, cta}], info:[], destacados, categorias, visita}
 */
export async function crearPropuestasHTML(brief, mat, textos, { token = crypto.randomBytes(9).toString('base64url').replace(/[_-]/g, 'x'), ronda = 0 } = {}) {
  // Cada ronda ("ninguna me gustó") usa otras tipografías y otro orden de color/fotos.
  const todosPares = paresTipograficos(brief.marca?.estilo || 'calido', brief, 18);
  const pares = [...todosPares.slice((ronda * 6) % todosPares.length), ...todosPares].slice(0, 6);
  await fs.mkdir(path.join(DIR_PROPUESTAS, token), { recursive: true });
  if (brief.negocio?.arquetipo !== 'restaurante') {
    // Logo de un color: versión pintada con la tinta de cada propuesta (contraste garantizado sobre fondos claros u oscuros).
    let pags = paginasGenerales({ brief, mat, textos, pares, urlFuentes, ronda });
    if (mat.logo?.url && mat.logo.mono !== false) {
      const tenidos = {};
      for (const pg of pags) for (const hex of [pg.paleta.fg, '#FFFFFF']) if (!tenidos[hex]) tenidos[hex] = await logoTenido(mat.logo, hex).catch(() => null);
      mat = { ...mat, logo: { ...mat.logo, tenidos: Object.fromEntries(Object.entries(tenidos).filter(([, v]) => v)) } };
      pags = paginasGenerales({ brief, mat, textos, pares, urlFuentes, ronda });
    }
    const out = [];
    for (const pg of pags) {
      const { html, faltan } = completarMaterial(pg.html, mat);
      if (faltan.length) throw new Error(`Propuesta ${pg.letra} sin material del cliente: ${faltan.map((f) => f.clave).join(', ')}`);
      await fs.writeFile(path.join(DIR_PROPUESTAS, token, `${pg.letra}.html`), html);
      out.push({ letra: pg.letra, layout: pg.layout, nombre: pg.nombre, url: `${config.publicUrl}/p/${token}/${pg.letra}`, fuentes: pg.fuentes, paleta: pg.paleta });
    }
    return { token, opciones: out };
  }
  const colores = [...coloresDePalabras(brief.marca?.colores || []), ...(mat.colores || [])];
  const b = base(colores);
  const prods = productos(mat, mat.menu_texto).sort((x, y) => (y.precio ? 1 : 0) - (x.precio ? 1 : 0));
  // Imágenes de portada: productos sin fondo más altos (vasos completos), distintos por propuesta.
  const altos = prods.filter((x) => x.img).sort((x, y) => (y.alto || 0) - (x.alto || 0));
  const c = brief.contacto || {};
  const dir = c.direccion && typeof c.direccion === 'object' ? [c.direccion.calle, c.direccion.colonia, c.direccion.ciudad].filter(Boolean).join(', ') : c.direccion;
  const cats = categorias(mat.menu_texto);
  const out = [];
  for (const [i, layout] of LAYOUTS.entries()) {
    const letra = 'ABCDEF'[i];
    const v = textos.variantes?.[i] || textos.variantes?.[0] || {};
    const rot = (k) => altos.length ? altos[(i * 2 + k) % altos.length].img : (mat.hero?.url || '');
    const d = {
      letra, layout, nombre: brief.negocio?.nombre || '', logo: mat.logo?.url || null, logoObj: mat.logo || null,
      pal: paleta(layout, b), f: pares[i % pares.length], fuentesUrl: urlFuentes([pares[i % pares.length]]),
      textos: { titular: v.titular, subtitulo: v.subtitulo, cta: v.cta || 'Pide por WhatsApp', destacados: textos.destacados, categorias: textos.categorias, visita: textos.visita },
      heroImgs: [rot(0), rot(1), rot(2)], productos: prods.slice(i % 2 ? 3 : 0).concat(prods.slice(0, i % 2 ? 3 : 0)),
      categorias: cats, menus: mat.menus.map((m) => m.url), info: (textos.info || []).slice(0, 3),
      wa: waUrl(c.whatsapp, c.mensaje_whatsapp_inicial), tel: c.whatsapp ? formatoTel(c.whatsapp) : null, direccion: dir, horarios: typeof c.horarios === 'string' ? c.horarios : null,
    };
    const { html, faltan } = completarMaterial(pagina(d), mat, { titulo: 'Más de nosotros' });
    if (faltan.length) throw new Error(`Propuesta ${letra} sin material del cliente: ${faltan.map((f) => f.clave).join(', ')}`);
    await fs.writeFile(path.join(DIR_PROPUESTAS, token, `${letra}.html`), html);
    out.push({ letra, layout, nombre: NOMBRES[layout], url: `${config.publicUrl}/p/${token}/${letra}`, fuentes: d.f, paleta: d.pal });
  }
  return { token, opciones: out };
}

/** Textos de las 6 propuestas con Claude (JSON en texto). Solo datos reales del brief y del menú. */
export async function textosPropuestas(brief, mat) {
  const menu = brief.negocio?.arquetipo === 'restaurante';
  const enfoques = menu ? 'producto, antojo, rapidez/pickup, ubicación, variedad del menú, experiencia'
    : 'el resultado que se lleva el cliente, la especialidad más fuerte, la experiencia/años, la zona, la variedad de servicios o paquetes, el trato personal';
  const prompt = `Escribe los textos de 6 propuestas de página de inicio para este negocio mexicano (giro: ${brief.negocio?.giro_texto || brief.negocio?.arquetipo || ''}). Español de México, trato "${brief?.marca?.tono_textos === 'usted' ? 'usted' : 'tú'}", ${brief.negocio?.tamano === 'solo_tu' ? 'en primera persona del singular (es una sola persona), ' : ''}sin emojis, sin frases genéricas de IA, sin inventar datos (nada de años, clientes, premios ni promociones que no estén abajo). Cada titular con un enfoque distinto (${enfoques}).
Brief: ${JSON.stringify({ negocio: brief.negocio, oferta: brief.oferta, cliente_ideal: brief.cliente_ideal, confianza: { historia_corta: brief.confianza?.historia_corta, cifras: brief.confianza?.cifras }, marca: { personalidad: brief.marca?.personalidad, evitar: brief.marca?.evitar, comentarios_del_cliente: brief.marca?.referencias_que_gusta }, zona: brief.zona, contacto: { ciudad: brief.contacto?.direccion?.ciudad, horarios: brief.contacto?.horarios } })}
${menu ? `Menú real (resumen): ${JSON.stringify((mat.menu_texto || []).map((s) => ({ seccion: s.seccion, items: (s.items || []).slice(0, 6).map((i) => `${i.nombre} ${i.precio || ''}`) })))}` : ''}
Responde SOLO JSON: {"variantes":[{"titular":"≤ 55 caracteres","subtitulo":"≤ 120 caracteres","cta":"≤ 22 caracteres, abre WhatsApp"} ×6],"info":["3 datos cortos y reales (≤ 30 caracteres) p. ej. modalidad, zona, entrega"],"destacados":"título ≤ 22","categorias":"título ≤ 22","visita":"título ≤ 22"${menu ? '' : ',"secciones":{"trabajo":"≤ 22","servicios":"≤ 22","sobre":"≤ 22","resenas":"≤ 30","faq":"≤ 24","contacto":"≤ 22","galeria":"≤ 22"},"sobre":"la historia real del brief, pulida, ≤ 380 caracteres, sin agregar datos"'}}`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: config.generadorModel || config.anthropicModel, max_tokens: 3200, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(120000),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Claude: ${j?.error?.message || res.status}`);
  const t = (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('');
  const d = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  const limpio = (s) => String(s || '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s*→\s*/g, ' ').trim();
  d.variantes = (d.variantes || []).map((v) => ({ titular: limpio(v.titular), subtitulo: limpio(v.subtitulo), cta: limpio(v.cta) }));
  if (d.sobre) d.sobre = limpio(d.sobre);
  return d;
}
