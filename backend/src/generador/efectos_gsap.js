// Efectos con GSAP, ScrollTrigger, SplitType y Lenis para las opciones del creador de sitios (nov-2026, Sebastián).
// Piezas reutilizables: el generador las usa en cualquier opción (A–I) sin reescribir nada:
//   - headFx() / pieFx()         → estilos y scripts (CDN con versión fija, cargados con defer; si fallan, la página queda quieta y completa)
//   - bandaHTML() / cifraHTML()  → HTML de las piezas con sus atributos data-fx
//   - variablesTema()/cssTema()  → paleta flexible: de {fondo, tinta, acento, banda?} calcula todos los colores con contraste legible
//   - conEfectosGsap(html)       → inyecta todo en un HTML ya armado y marca títulos y bloques con data-fx (opt-in)
//   - GIROS / giroDe()           → catálogo de giros (paleta y textos de ejemplo) para la plantilla en movimiento
// Reglas:
// - Solo transform y opacity ligados al desplazamiento; Lenis y los efectos se apagan con prefers-reduced-motion.
// - Se activa con la variable EFECTOS_GSAP=1 (servicio api); sin ella no cambia nada para los clientes actuales.
// - Para no duplicar el efecto de títulos de movimiento.js, conEfectosGsap marca <html data-fx-gsap> y neutraliza ese CSS;
//   en movimiento.js conviene excluir los h2 con data-fx (ver NOTAS al final).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const leer = (f) => readFileSync(join(dir, 'fx', f), 'utf8');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Versiones fijas (mismas que probó la demo). Se pueden cambiar con variables de entorno si hace falta un espejo propio. */
export const CDN = {
  gsap: process.env.FX_CDN_GSAP || 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
  scrolltrigger: process.env.FX_CDN_SCROLLTRIGGER || 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
  splittype: process.env.FX_CDN_SPLITTYPE || 'https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js',
  lenis: process.env.FX_CDN_LENIS || 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js',
};

export const FX_ACTIVO = process.env.EFECTOS_GSAP === '1';
export const CSS_FX = leer('fx-base.css');
export const JS_FX = leer('fx-runtime.js');
export const GIROS = JSON.parse(leer('giros.json')).giros;
export const giroDe = (id) => GIROS.find((g) => g.id === id) || GIROS[0];

// ---------- color: paleta flexible con contraste automático ----------
const hex2rgb = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = (c) => '#' + c.map((x) => ('0' + Math.round(Math.max(0, Math.min(255, x))).toString(16)).slice(-2)).join('');
const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
export const contraste = (a, b) => { const x = lum(hex2rgb(a)), y = lum(hex2rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mezcla = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
const sobre = (bg) => (contraste(bg, '#ffffff') >= contraste(bg, '#111111') ? '#ffffff' : '#111111');
const legible = (color, fondo, min, hacia) => { let c = color, t = 0; while (contraste(c, fondo) < min && t < 1) { t += 0.05; c = mezcla(color, hacia, t); } return c; };
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const norm = (h, def) => { if (!HEX.test(String(h || ''))) return def; let x = String(h).replace('#', '').toLowerCase(); if (x.length === 3) x = x.replace(/./g, '$&$&'); return '#' + x; };
/** Acento apto para botones y fichas rellenas: si el texto blanco o negro no llega a 4.5:1 sobre el acento, se oscurece o aclara lo justo. */
const botonDe = (acento) => { const t = sobre(acento), h = t === '#ffffff' ? '#000000' : '#ffffff'; let c = acento, i = 0; while (contraste(c, t) < 4.5 && i < 20) { i++; c = mezcla(acento, h, i * 0.05); } return c; };

/**
 * Variables CSS de toda la plantilla a partir de 3 colores (la banda es opcional). Garantiza texto legible:
 * tinta ≥ 7:1 sobre el fondo, acento como texto ≥ 4.5:1, y texto blanco o negro sobre acento, banda y tinta.
 * Acepta la paleta del cliente (logo), la de paletas_giro.js o la de un giro de GIROS.
 */
export function variablesTema(p = {}) {
  const fondo = norm(p.fondo, '#f7f0e8');
  let tinta = norm(p.tinta, '#2b1b20');
  if (contraste(tinta, fondo) < 7) tinta = lum(hex2rgb(fondo)) > 0.5 ? '#111111' : '#f5f5f5';
  const acento = norm(p.acento, '#9b2347');
  const banda = norm(p.banda, mezcla(tinta, acento, 0.22));
  const sb = sobre(banda);
  return {
    '--fondo': fondo, '--tinta': tinta, '--acento': acento,
    '--acento-txt': legible(acento, fondo, 4.5, tinta), '--sobre-acento': sobre(acento), '--boton': botonDe(acento), '--sobre-boton': sobre(botonDe(acento)),
    '--banda': banda, '--sobre-banda': sb, '--acento-sobre-banda': legible(acento, banda, 4.5, sb),
    '--sobre-tinta': sobre(tinta), '--suave': mezcla(fondo, tinta, 0.06), '--linea': mezcla(fondo, tinta, 0.2),
  };
}
export const cssTema = (p, selector = ':root') => `${selector}{${Object.entries(variablesTema(p)).map(([k, v]) => `${k}:${v}`).join(';')}}`;

// ---------- HTML de las piezas ----------
/** Banda de texto que corre con el scroll. frases: texto con "✦" entre frases o arreglo. dir -1 = hacia la izquierda. clase: '', 'fx-banda--contorno' o 'fx-banda--suave'. */
export function bandaHTML(frases, { dir = -1, vel = 60, clase = '' } = {}) {
  const lista = (Array.isArray(frases) ? frases : String(frases || '').split('✦')).map((x) => String(x).trim()).filter(Boolean);
  if (!lista.length) return '';
  return `<div class="fx-banda ${esc(clase)}" data-fx="banda" data-fx-dir="${dir < 0 ? -1 : 1}" data-fx-vel="${Number(vel) || 60}" role="presentation"><div class="fx-banda-pista"><div class="fx-banda-grupo">${lista.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div></div>`;
}
/** Contador: el HTML lleva ya el texto final (sin JS se ve completo). */
export const cifraHTML = (valor, { prefijo = '', sufijo = '', etiqueta = '' } = {}) => `<div class="cifra"><strong data-fx="cifra" data-valor="${Number(valor) || 0}" data-prefijo="${esc(prefijo)}" data-sufijo="${esc(sufijo)}">${esc(prefijo)}${Number(valor) || 0}${esc(sufijo)}</strong>${etiqueta ? `<span>${esc(etiqueta)}</span>` : ''}</div>`;
/** Atributos para marcar un elemento propio: fxAttrs('titulo', {split:'letras', ahora:true}). */
export function fxAttrs(tipo, o = {}) {
  const a = [`data-fx="${esc(tipo)}"`];
  if (o.split) a.push(`data-fx-split="${esc(o.split)}"`);
  if (o.ahora) a.push('data-fx-ahora');
  if (o.hijos) a.push(`data-fx-hijos="${esc(o.hijos)}"`);
  if (o.fuerza != null) a.push(`data-fx-fuerza="${Number(o.fuerza)}"`);
  return a.join(' ');
}

// ---------- scripts y estilos ----------
const PRE = `<script>if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('fx-pre');setTimeout(function(){document.documentElement.classList.remove('fx-pre')},4000)}</script>`;
/** Para el <head>: marca previa (evita el destello de los textos partidos) y el CSS de las piezas. */
export const headFx = () => `${PRE}<style>${CSS_FX}</style>`;
/** Para el final del <body>: librerías con defer (orden garantizado) y el runtime, que arranca en DOMContentLoaded. lenis:false apaga el scroll suave. */
export function pieFx({ lenis = true } = {}) {
  const libs = [CDN.gsap, CDN.scrolltrigger, CDN.splittype, ...(lenis ? [CDN.lenis] : [])];
  return `${libs.map((u) => `<script src="${esc(u)}" defer></script>`).join('')}<script>${JS_FX}</script>`;
}

const CSS_COMPAT = `html[data-fx-gsap].tit .sec h2[data-fx]:not(.visto){opacity:1;transform:none}html[data-fx-gsap] .sec h2[data-fx].ri{opacity:1!important;translate:none!important;transition:none!important}html[data-fx-gsap] .sec h2[data-fx] .ln>span{transform:none!important}`;
const BLOQUES = '.paq,blockquote,.prod,.cat,li.serv,.tarjeta,.card,.item,.pasos li';

/**
 * Agrega los efectos a un HTML ya armado por cualquier opción. Es idempotente y no toca nada si no hay <html>/<body>.
 *  - títulos h2 de secciones → data-fx="titulo" (suben por palabra al entrar)
 *  - secciones .sec con tarjetas → data-fx="revela" con hijos escalonados
 *  - paleta opcional → variables CSS de la plantilla en :root (para las piezas fx-banda, fx-tarjeta, etc.)
 * o: { lenis=true, paleta=null, titulos=true, bloques=true }
 */
export function conEfectosGsap(html, o = {}) {
  let out = String(html || '');
  if (!/<\/body>/i.test(out) || out.includes('data-fx-gsap')) return out;
  const { lenis = true, paleta = null, titulos = true, bloques = true } = o;
  out = out.replace(/<html\b([^>]*)>/i, (m, a) => `<html${a} data-fx-gsap${lenis ? '' : ' data-fx-sin-lenis'}>`);
  if (titulos) out = out.replace(/<h2(?![^>]*data-fx)([^>]*)>/gi, (m, a) => `<h2 data-fx="titulo"${a}>`);
  if (bloques) out = out.replace(/<section\b(?![^>]*data-fx)([^>]*class="[^"]*\bsec\b[^"]*"[^>]*)>/gi, (m, a) => `<section${a} data-fx="revela" data-fx-hijos="${BLOQUES}">`);
  const estilo = `<style>${paleta ? cssTema(paleta) : ''}${CSS_COMPAT}</style>`;
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${headFx()}${estilo}</head>`) : out.replace(/<body\b/i, `${headFx()}${estilo}<body`);
  return out.replace(/<\/body>/i, `${pieFx({ lenis })}</body>`);
}

/** ¿Esta opción lleva los efectos? Todas menos las que ya tienen su propio recorrido (G collage, H índice) cuando EFECTOS_GSAP=1; EFECTOS_GSAP_SOLO="A,C" limita. */
export function opcionConFx(letra) {
  if (!FX_ACTIVO) return false;
  const L = String(letra || '').toUpperCase();
  const solo = (process.env.EFECTOS_GSAP_SOLO || '').toUpperCase().split(',').map((x) => x.trim()).filter(Boolean);
  if (solo.length) return solo.includes(L);
  return !['G', 'H'].includes(L);
}

/* NOTAS de integración
 * 1) movimiento.js: dos líneas para no duplicar el efecto de los h2 cuando hay data-fx:
 *      document.querySelectorAll('.sec h2:not([data-fx])').forEach(h=>ot.observe(h))
 *      if(x.tagName==='H2'&&!x.hasAttribute('data-fx')){ ...lineas... }   // y no agregarles .ri
 * 2) Dónde llamarlo: al final del armado del HTML de cada opción, antes de conSrcset():
 *      if (opcionConFx(letra)) html = conEfectosGsap(html, { paleta: paletaDeLaOpcion });
 * 3) Opción I (plantilla_movimiento.js): renderPagina(g) recibe un objeto con la forma de GIROS; el generador lo arma con el brief.
 */
