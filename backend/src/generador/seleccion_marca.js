// Paleta y letra al inicio de la entrevista (decisión de Sebastián, 24-nov-2026).
// Después de conocer el giro, Ari pide el logo, muestra paletas de color y luego parejas de letras (títulos + textos),
// cada grupo en UNA imagen en cuadrícula con letra por opción. Lo que elija el cliente se aplica a todas las propuestas,
// también a las plantillas de sitios modelo (de ellas solo cambia letra y color; estructura, efectos y movimiento quedan).
// - Paletas: 4 por imagen (de su giro, ordenadas por ajuste). Si tiene logo, la primera opción son los colores del logo.
//   Siempre hay una opción "Que lo decida el diseñador" y puede pedir "más" (otras 4: primero su giro, luego giros afines).
// - Letras: 4 parejas por imagen, mostradas con los colores que eligió y el nombre real del negocio; "más" y "diseñador".
// - Ari recomienda una opción con una razón corta.
// Este módulo no habla con nadie: arma opciones, HTML de las cuadrículas y aplica la letra elegida a una página.
import { PALETAS, paletasPara, dimensionesDe } from './paletas_giro.js';
import { paresTipograficos, urlFuentes, CATALOGO, COMUNES } from './fuentes.js';
import { coherenciaFuentePaleta, nombreColor } from './asesor_color.js';
import { oklch } from './tipo_color.js';

export const POR_IMAGEN = 4;
const LETRAS = 'ABCDEFGH';
const esHex = (c) => /^#[0-9a-f]{6}$/i.test(String(c || ''));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// De otro giro (ronda "más"): su razón habla de ese giro, así que se explica solo por sus colores.
const deFamilia = (f, afin = false) => ({ id: f.n, nombre: f.n, colores: { marca: f.m, acento: f.a, fondo: f.c, texto: f.o },
  por: afin ? `combina ${nombreColor(f.m)} con ${nombreColor(f.a)}: se ve profesional y actual` : f.por, estilo: f.e?.[0] || null, origen: afin ? 'afin' : 'giro' });

/** Todas las familias candidatas, en orden: las del giro del cliente y luego las de giros afines y el resto. */
export function familiasCandidatas(brief = {}, evitarHex = []) {
  const n = brief.negocio || {};
  const base = { arquetipo: n.arquetipo, estilo: brief.marca?.estilo, dimensiones: dimensionesDe(brief), evitarHex };
  const propio = paletasPara({ ...base, subtipo: n.subtipo_resuelto || n.subtipo });
  const otros = Object.keys(PALETAS).filter((st) => st !== propio.subtipo)
    .map((st) => paletasPara({ ...base, subtipo: st }))
    // Primero los giros con familias más afines (mejor puntaje de estilo/personalidad).
    .sort((a, b) => (b.familias[0]?.puntaje || 0) - (a.familias[0]?.puntaje || 0));
  const vistos = new Set();
  const out = [];
  for (const g of [propio, ...otros]) for (const f of g.familias) {
    const k = `${f.m}|${f.a}|${f.c}`.toUpperCase();
    if (vistos.has(f.n) || vistos.has(k)) continue;
    vistos.add(f.n); vistos.add(k); out.push(deFamilia(f, g !== propio));
  }
  return out;
}

/** Paleta armada con los colores del logo: el más saturado es la marca; acento y neutros de la familia de tono más cercano. */
export function paletaDeLogo(coloresLogo = [], brief = {}) {
  const cs = coloresLogo.filter(esHex);
  if (!cs.length) return null;
  const conColor = cs.filter((c) => oklch(c).c > 0.04).sort((a, b) => oklch(b).c - oklch(a).c);
  const marca = conColor[0] || cs[0];
  const fams = familiasCandidatas(brief);
  const h = oklch(marca).h;
  const dist = (x) => { const d = Math.abs(oklch(x).h - h) % 360; return d > 180 ? 360 - d : d; };
  const cerca = [...fams].sort((a, b) => dist(a.colores.marca) - dist(b.colores.marca))[0];
  const segundo = conColor.find((c) => c !== marca && dist(c) > 30);
  return {
    id: 'logo', nombre: 'Colores de tu logo', origen: 'logo',
    colores: { marca, acento: segundo || cerca?.colores.acento || marca, fondo: cerca?.colores.fondo || '#F7F5F1', texto: cerca?.colores.texto || '#1C1C1C' },
    por: 'Mantiene los colores de tu marca para que todo se vea de la misma empresa', estilo: cerca?.estilo || null,
    logo: cs,
  };
}

/**
 * Opciones de paleta de una ronda (0 = primera imagen). Con logo, la ronda 0 lleva "Colores de tu logo" primero.
 * La recomendada es la de mejor ajuste a su giro (la primera del giro de esa ronda).
 * @returns {{opciones:[{letra,id,nombre,colores,por,estilo,origen}], recomendada:string|null, disenador:string, agotadas:boolean}}
 */
export function opcionesPaleta({ brief = {}, coloresLogo = [], ronda = 0, mostradas = [] } = {}) {
  const fams = familiasCandidatas(brief).filter((f) => !mostradas.includes(f.id));
  const elegidas = fams.slice(0, POR_IMAGEN);
  const logo = ronda === 0 ? paletaDeLogo(coloresLogo, brief) : null;
  const lista = [...(logo ? [logo] : []), ...elegidas].map((o, i) => ({ ...o, letra: LETRAS[i] }));
  const rec = lista.find((o) => o.origen === 'giro') || lista.find((o) => o.origen === 'afin') || lista[0] || null;
  return { opciones: lista, recomendada: rec?.letra || null, disenador: LETRAS[lista.length], agotadas: fams.length <= POR_IMAGEN };
}

/** Estilo tipográfico para la paleta elegida (el que pidió el cliente o el de la familia de color). */
const estiloPara = (brief, paleta) => brief?.marca?.estilo || paleta?.estilo || 'calido';

/** Todas las parejas del catálogo, empezando por las del estilo y ordenadas por coherencia con la paleta. */
export function paresCandidatos({ brief = {}, paleta = null } = {}) {
  const estilo = estiloPara(brief, paleta);
  const n = Object.values(CATALOGO).reduce((s, x) => s + x.length, 0);
  const pares = paresTipograficos(estilo, brief, n);
  const cols = paleta?.colores ? [paleta.colores.marca, paleta.colores.acento, paleta.colores.fondo] : [];
  const conPuntaje = pares.map((p, k) => ({ p, k, s: cols.length ? coherenciaFuentePaleta(p, cols).puntaje : 0 }));
  // Las 8 primeras (estilo del cliente y vecinos) se ordenan por coherencia; el resto queda en orden de catálogo.
  const cabeza = conPuntaje.slice(0, 8).sort((a, b) => b.s - a.s || a.k - b.k);
  return [...cabeza, ...conPuntaje.slice(8)].map((x) => x.p).filter((p) => !COMUNES.has(p.titulos.toLowerCase()));
}

/** Opciones de letra de una ronda. @returns {{opciones:[{letra,titulos,cuerpo,estilo}], recomendada, disenador, agotadas}} */
export function opcionesFuente({ brief = {}, paleta = null, mostradas = [] } = {}) {
  const todas = paresCandidatos({ brief, paleta }).filter((p) => !mostradas.includes(`${p.titulos}|${p.cuerpo}`));
  const lista = todas.slice(0, POR_IMAGEN).map((p, i) => ({ letra: LETRAS[i], titulos: p.titulos, cuerpo: p.cuerpo, estilo: p.estilo, id: `${p.titulos}|${p.cuerpo}` }));
  return { opciones: lista, recomendada: lista[0]?.letra || null, disenador: LETRAS[lista.length], agotadas: todas.length <= POR_IMAGEN };
}

/** Por qué se recomienda una pareja de letras (una línea para el cliente). */
export function porQueFuente(par = {}) {
  const e = { calido: 'cercana y cálida', fresco: 'fresca y actual', elegante: 'elegante sin perder claridad', minimalista: 'limpia y moderna', lujo: 'de lujo y con presencia',
    tecnologico: 'moderna y tecnológica', tradicional: 'seria y confiable', divertido: 'alegre y con personalidad' }[par.estilo] || 'clara y con personalidad';
  return `se ve ${e} y combina con los colores que elegiste; los textos se leen fácil en el celular`;
}

/* ---------- Cuadrículas (HTML que el servicio render convierte en imagen) ---------- */

const CSS_BASE = `*{box-sizing:border-box;margin:0}body{font-family:'Onest',system-ui,-apple-system,'Segoe UI',sans-serif;background:#EEECE8;color:#1C1C1C;padding:18px;width:480px}
h1{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:2px 4px 4px}p.sub{font-size:13px;color:#5C5A56;margin:0 4px 14px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:12px}.c{position:relative;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.l{position:absolute;top:8px;left:8px;width:34px;height:34px;border-radius:50%;background:#1C1C1C;color:#fff;font:700 19px/34px 'Onest',system-ui,sans-serif;text-align:center;z-index:2;box-shadow:0 0 0 3px #fff}
.rec{position:absolute;top:12px;right:8px;background:#1C1C1C;color:#fff;font:600 10px/1 'Onest',system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;padding:6px 8px;border-radius:999px;z-index:2}
.n{font-size:12.5px;font-weight:600;padding:8px 10px 10px;line-height:1.25}.n small{display:block;font-weight:400;color:#6A6763;font-size:11px;margin-top:2px}
.dis{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:100%;padding:52px 14px 18px;background:repeating-linear-gradient(135deg,#F7F6F3 0 10px,#F1EFEB 10px 20px)}
.dis b{font-size:15px}.dis span{font-size:12px;color:#5C5A56;margin-top:6px;line-height:1.35}`;

/** Imagen de paletas: una tarjeta por opción (mini portada con sus colores + franjas) y la del diseñador. */
export function htmlPaletas({ opciones = [], recomendada = null, disenador = 'F', negocio = '' } = {}) {
  const tarjeta = (o) => {
    const c = o.colores;
    return `<div class="c"><span class="l">${o.letra}</span>${o.letra === recomendada ? '<span class="rec">Recomendada</span>' : ''}
<div style="background:${c.fondo};padding:52px 14px 14px;min-height:150px">
<div style="font:700 17px/1.15 'Onest',system-ui,sans-serif;color:${c.marca};letter-spacing:-.01em">${esc(negocio || 'Tu negocio')}</div>
<div style="height:6px;width:70%;background:${c.texto};opacity:.55;border-radius:3px;margin-top:10px"></div><div style="height:6px;width:52%;background:${c.texto};opacity:.35;border-radius:3px;margin-top:6px"></div>
<span style="display:inline-block;margin-top:12px;background:${c.acento};color:${legibleSobre(c.acento)};font:600 11px/1 'Onest',system-ui,sans-serif;padding:8px 12px;border-radius:999px">Escríbenos</span></div>
<div style="display:flex;height:22px">${[c.marca, c.acento, c.texto, c.fondo].map((h, k) => `<span style="flex:${k === 0 ? 3 : 2};background:${h}${k === 3 ? ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)' : ''}"></span>`).join('')}</div>
<div class="n">${esc(o.nombre)}<small>${esc(`${nombreColor(c.marca)}, ${nombreColor(c.acento)} y ${nombreColor(c.fondo)}`)}</small></div></div>`;
  };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;600;700&display=swap"><style>${CSS_BASE}</style></head><body>
<h1>Colores para ${esc(negocio || 'tu página')}</h1><p class="sub">Respóndeme con la letra que más te guste</p>
<div class="g">${opciones.map(tarjeta).join('')}<div class="c"><span class="l">${disenador}</span><div class="dis"><b>Que lo decida el diseñador</b><span>Uso los colores de cada diseño tal como fueron creados</span></div></div></div></body></html>`;
}

/** Imagen de letras: cada pareja escrita con el nombre del negocio, un título y un párrafo, con los colores elegidos. */
export function htmlFuentes({ opciones = [], recomendada = null, disenador = 'E', negocio = '', paleta = null, frase = '' } = {}) {
  const c = paleta?.colores || { marca: '#1C1C1C', acento: '#1C1C1C', fondo: '#FFFFFF', texto: '#2A2A2A' };
  const tarjeta = (o) => `<div class="c"><span class="l">${o.letra}</span>${o.letra === recomendada ? '<span class="rec">Recomendada</span>' : ''}
<div style="background:${c.fondo};padding:52px 14px 16px;min-height:200px">
<div style="font-family:'${o.titulos}',serif;font-size:24px;line-height:1.08;color:${c.marca};overflow-wrap:anywhere">${esc(negocio || 'Tu negocio')}</div>
<div style="font-family:'${o.titulos}',serif;font-size:15px;line-height:1.2;color:${c.texto};margin-top:8px">${esc(frase || 'Lo que mejor sabemos hacer')}</div>
<div style="font-family:'${o.cuerpo}',sans-serif;font-size:12px;line-height:1.5;color:${c.texto};opacity:.85;margin-top:8px">Así se leen los textos de tu página: claros y cómodos en el celular.</div>
<span style="display:inline-block;margin-top:12px;background:${c.acento};color:${legibleSobre(c.acento)};font-family:'${o.cuerpo}',sans-serif;font-weight:600;font-size:11px;padding:8px 12px;border-radius:999px">Escríbenos</span></div>
<div class="n">${esc(o.titulos)}<small>Títulos · ${esc(o.cuerpo)} en textos</small></div></div>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;600;700&display=swap"><link rel="stylesheet" href="${esc(urlFuentes(opciones.map((o) => ({ titulos: o.titulos, cuerpo: o.cuerpo }))))}"><style>${CSS_BASE}</style></head><body>
<h1>Letras para ${esc(negocio || 'tu página')}</h1><p class="sub">Respóndeme con la letra que más te guste</p>
<div class="g">${opciones.map(tarjeta).join('')}<div class="c"><span class="l">${disenador}</span><div class="dis"><b>Que lo decida el diseñador</b><span>Uso la letra de cada diseño tal como fue creado</span></div></div></div></body></html>`;
}

/** Blanco o casi negro, el que se lea mejor sobre el color dado. */
export function legibleSobre(hex) {
  if (!esHex(hex)) return '#FFFFFF';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.0525) ? '#FFFFFF' : '#1A1A1A';
}

/* ---------- Respuesta del cliente ---------- */

const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
/**
 * Lee la respuesta a una cuadrícula.
 * @returns {{tipo:'letra', letra}|{tipo:'mas'}|{tipo:'disenador'}|{tipo:'otro'}}
 */
export function leerRespuesta(texto = '', { letras = [], disenador = null } = {}) {
  const t = norm(texto);
  if (!t) return { tipo: 'otro' };
  const validas = [...letras, disenador].filter(Boolean).map((l) => l.toLowerCase());
  const m = t.match(/^(?:(?:me gusta|me quedo con|quiero|prefiero|elijo|escojo|mejor)\s+)?(?:la\s+|el\s+)?(?:opcion\s+|letra\s+|numero\s+)?([a-h])(?:\s+(?:porfa|por favor|gracias|esa|plis|me gusta|esta bien|va))*$/)
    || t.match(/\b(?:la|opcion|letra)\s+([a-h])\b/);
  if (m && validas.includes(m[1])) return m[1] === disenador?.toLowerCase() ? { tipo: 'disenador' } : { tipo: 'letra', letra: m[1].toUpperCase() };
  if (/\b(disenador|disenadora|tu decide|decide tu|decidelo|tu elige|elige tu|elijan ustedes|como (tu )?quieras|me da igual|da igual|cualquiera|lo que (tu )?recomiendes|la que recomiendes|la recomendada|tu recomendacion)\b/.test(t)) {
    return /recomiend|recomendada|recomendacion/.test(t) ? { tipo: 'recomendada' } : { tipo: 'disenador' };
  }
  if (/\b(mas|otras|otra|otros|ver mas|mas opciones|diferentes|distintas|ninguna|no me gusta|no me gustan)\b/.test(t) && !/\bmas (o menos|bien)\b/.test(t)) return { tipo: 'mas' };
  return { tipo: 'otro' };
}

/* ---------- Letra elegida en una página ya armada ---------- */

const GENERICAS = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|blinkmacsystemfont|inherit|initial|unset|revert|emoji|math)$/i;
const primeraFamilia = (valor) => String(valor).split(',')[0].trim().replace(/^["']|["']$/g, '').replace(/\s*!important$/i, '');
const esMono = (f) => /mono|code|courier|consolas|menlo/i.test(f);

/**
 * Cambia la letra de una página (también de las plantillas de sitios modelo) por la pareja que eligió el cliente:
 * la familia del cuerpo (la de `body`) pasa a la de textos y las demás (títulos, display) a la de títulos.
 * Se respetan genéricas, monoespaciadas y variables (var(--x)); las variables que guardan una pila de letras también se cambian.
 */
export function conTipografia(html, par) {
  const h = String(html || '');
  if (!h || !par?.titulos || !par?.cuerpo) return h;
  if (h.includes('id="letra-cliente"')) return h;
  const body = h.match(/(?:^|[}\s;>,])body[\w.#:-]*\s*\{[^}]*?font-family\s*:\s*([^;}]+)/i)
    || h.match(/(?:^|[}\s;>,])html[\w.#:-]*\s*\{[^}]*?font-family\s*:\s*([^;}]+)/i);
  let famCuerpo = body ? primeraFamilia(body[1]) : null;
  // Cuerpo con variable (body{font-family:var(--fc)}): esa variable es la de textos; las demás pilas de letras, títulos.
  const vm = famCuerpo && famCuerpo.match(/^var\(\s*(--[\w-]+)/);
  const varCuerpo = vm ? vm[1] : null;
  if (varCuerpo) { const d = h.match(new RegExp(`${varCuerpo}\\s*:\\s*([^;}]+)`)); famCuerpo = d ? primeraFamilia(d[1]) : null; }
  const pila = (nueva, valor) => {
    const resto = String(valor).split(',').slice(1).join(',').trim();
    const imp = /!important\s*$/i.test(valor) ? ' !important' : '';
    return `'${nueva}', ${resto.replace(/\s*!important\s*$/i, '') || (nueva === par.cuerpo ? 'sans-serif' : 'serif')}${imp}`;
  };
  const cambiar = (valor) => {
    const f = primeraFamilia(valor);
    if (!f || GENERICAS.test(f) || /^var\(/i.test(f) || esMono(f)) return null;
    return pila(famCuerpo && f.toLowerCase() === famCuerpo.toLowerCase() ? par.cuerpo : par.titulos, valor);
  };
  let out = h.replace(/font-family\s*:\s*((?:[^;}"<>]|"[^"]*")+)/gi, (m, v) => { const n = cambiar(v.trim()); return n ? `font-family:${n}` : m; });
  // Variables con pila de letras (--ft:'X',serif): la del cuerpo pasa a textos, las demás a títulos.
  out = out.replace(/(--[\w-]+)\s*:\s*((?:'[^']+'|"[^"]+"|[A-Za-z][\w ]*?)\s*,\s*[^;}]*?(?:serif|sans-serif|cursive|monospace|system-ui)[^;}]*)/g, (m, k, v) => {
    const f = primeraFamilia(v);
    if (!f || GENERICAS.test(f) || esMono(f)) return m;
    const deCuerpo = varCuerpo ? k === varCuerpo : (famCuerpo && f.toLowerCase() === famCuerpo.toLowerCase());
    return `${k}:${pila(deCuerpo ? par.cuerpo : par.titulos, v.trim())}`;
  });
  // Modelos que ponen la letra de títulos también en el texto (J: body.l-narrativa{--fc:var(--ft)}): el cliente eligió una
  // letra para textos, así que el texto la conserva.
  if (varCuerpo) out = out.replace(new RegExp(`(${varCuerpo.replace(/[-]/g, '\\-')})\\s*:\\s*var\\(\\s*--[\\w-]+\\s*\\)`, 'g'), `$1:'${par.cuerpo}', sans-serif`);
  // Atajo font: 700 48px/1 "X", serif.
  out = out.replace(/(\bfont\s*:\s*[^;}]*?\d(?:px|rem|em|%|vw)[^;}'"]*?\s)((?:['"][^'"]+['"]|[A-Z][\w -]+)(?:\s*,\s*[^;}]+)?)(?=[;}])/g, (m, pre, fams) => { const n = cambiar(fams); return n ? `${pre}${n}` : m; });
  // Modelos de una sola familia (los títulos heredan la del cuerpo): los títulos toman la letra de títulos. Va al inicio
  // del <head> para que las reglas propias de la plantilla que fijan letra a un título sigan mandando.
  const hs = `<style id="letra-cliente-h">h1,h2,h3{font-family:'${par.titulos}',serif}</style>`;
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (x) => x + hs) : hs + out;
  const link = `<link id="letra-cliente" rel="stylesheet" href="${urlFuentes([par]).replace(/"/g, '&quot;')}">`;
  return /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${link}</head>`) : link + out;
}
