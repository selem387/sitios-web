// Editor directo del HTML de la opción elegida (10-nov-2026).
// Regla: una vez que el cliente elige su opción, sus cambios se aplican directo sobre el HTML de esa página
// (/data/propuestas/<token>/<letra>.html), nunca regenerándola con el generador. Cada cambio deja respaldo de la
// versión anterior. Ese HTML terminado es el que se publica en su dominio cuando compra el sitio.
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import * as db from './db.js';
import { pedirJSON, interpretarImagenCambio } from './claude.js';
import { DIR_PROPUESTAS } from '../generador/propuestas_html.js';
import { captura } from '../generador/revision_visual.js';

const esImagen = (a) => /\.(jpe?g|png|webp|heic)(\?|$)/i.test(a.url || '') || /^image\//.test(a.mime || '') || /^(foto|imagen|logo|captura|menu|catalogo|referencia)/.test(a.tipo || '');
const absoluta = (u) => (!u ? '' : /^https?:\/\//.test(u) ? u : `${config.publicUrl}${u.startsWith('/') ? '' : '/'}${u}`);

export const rutaHTML = (token, letra) => path.join(DIR_PROPUESTAS, token, `${letra}.html`);

/** HTML guardado de la opción elegida (el que se publica). */
export async function htmlElegido(p) {
  const letra = p?.elegido;
  if (!p?.token || !letra) return null;
  return fs.readFile(rutaHTML(p.token, letra), 'utf8').catch(() => null);
}

async function respaldar(token, letra, html) {
  const dir = path.join(DIR_PROPUESTAS, token, 'historial');
  await fs.mkdir(dir, { recursive: true });
  const archivo = path.join(dir, `${letra}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
  await fs.writeFile(archivo, html);
  return archivo;
}

/** Aplica reemplazos exactos. Cada "buscar" debe aparecer UNA sola vez; si no, ese reemplazo no se aplica. */
export function aplicarEdiciones(html, ediciones = []) {
  let out = html;
  const fallidas = [];
  for (const ed of ediciones) {
    const buscar = String(ed?.buscar ?? '');
    if (!buscar) { fallidas.push({ ...ed, motivo: 'buscar vacío' }); continue; }
    const primera = out.indexOf(buscar);
    if (primera === -1) { fallidas.push({ ...ed, motivo: 'no aparece en el HTML' }); continue; }
    if (out.indexOf(buscar, primera + buscar.length) !== -1) { fallidas.push({ ...ed, motivo: 'aparece más de una vez; agrega más contexto' }); continue; }
    out = out.slice(0, primera) + String(ed.reemplazar ?? '') + out.slice(primera + buscar.length);
  }
  return { html: out, fallidas };
}

/** CSS de los cambios del cliente: un solo bloque al final del <head>, que se acumula en cada cambio. */
export function conCssCliente(html, css) {
  const limpio = String(css || '').replace(/<\/style/gi, '').trim();
  if (!limpio) return html;
  const re = /<style id="cambios-cliente">([\s\S]*?)<\/style>/;
  if (re.test(html)) return html.replace(re, (m, previo) => `<style id="cambios-cliente">${previo}\n${limpio}</style>`);
  return html.replace('</head>', () => `<style id="cambios-cliente">\n${limpio}</style></head>`);
}

const SCHEMA = {
  type: 'object',
  properties: {
    entendido: { type: 'string', description: 'Qué pidió el cliente, en una frase.' },
    ediciones: { type: 'array', items: { type: 'object', properties: { buscar: { type: 'string' }, reemplazar: { type: 'string' } }, required: ['buscar', 'reemplazar'] } },
    css: { type: 'string', description: 'CSS adicional (va al final del head y gana sobre el anterior). Vacío si no hace falta.' },
    hecho: { type: 'array', items: { type: 'string' }, description: 'Cada cosa que SÍ quedó hecha, en segunda persona, sin palabras técnicas.' },
    no_pude: { type: 'array', items: { type: 'string' }, description: 'Lo que de verdad no se pudo hacer y por qué, sin palabras técnicas.' },
    pregunta: { type: 'string', description: 'Solo si el pedido es ambiguo y no se puede hacer nada sin aclarar. Si hay pregunta, no hay ediciones.' },
  },
  required: ['ediciones', 'hecho'],
};

const SISTEMA = `Eres el editor de la página web de un negocio. Recibes el HTML COMPLETO de su página y el pedido del cliente.
Aplica el pedido directo sobre ese HTML. NO rediseñes, NO cambies nada que el cliente no pidió.
Cómo entregar los cambios:
- "ediciones": reemplazos exactos {buscar, reemplazar}. "buscar" debe copiarse TAL CUAL del HTML (espacios y comillas incluidos) y aparecer una sola vez; usa fragmentos cortos pero únicos.
- "css": reglas CSS extra para cambios visuales (colores, fondos, tamaños, acomodo). Van al final del <head> y ganan sobre las anteriores; usa !important cuando haga falta para ganar a estilos en línea o más específicos. Para colores globales prefiere redefinir las variables de :root (--bg, --fg, --p, --card, --soft, --bor, --tin, --banda, --acc, --on-acc, --btn, --on-btn, etc.) y además corrige los elementos que tengan colores fijos.
Reglas:
- Si el cliente pide colores para "toda la página", cubre TODAS las secciones (encabezado, portada, cada sección, tarjetas, formulario, pie), no solo el body.
- Revisa que el texto siga leyéndose sobre el fondo nuevo (contraste) en todos los elementos, incluidos menús, tarjetas, precios, iconos y bordes.
- Textos que escribe el cliente: van letra por letra como los escribió; nunca los redactes ni "mejores".
- Fotos: usa solo las URLs de "FOTOS DISPONIBLES". Para agregarlas copia el marcado de las fotos que ya hay en esa sección. Las capturas de pantalla que manda el cliente son para entender el pedido: nunca se ponen en la página.
- Nunca deformes fotos (respeta proporciones) ni repitas una foto donde no estaba.
- No toques <script>, metadatos ni ligas de WhatsApp salvo que el cliente lo pida.
- "hecho" solo lista lo que de verdad cambiaste con tus ediciones y CSS. Lo que no se pueda va en "no_pude".`;

/** Pide a la IA las ediciones. imagenes: [{url, nota}] (capturas del cliente para entender el pedido). */
async function pedirEdiciones({ html, pedido, fotos, imagenes, errores = [], historial = '' }) {
  const contenido = [
    ...imagenes.filter((i) => i.url).slice(0, 4).map((i) => ({ type: 'image', source: { type: 'url', url: absoluta(i.url) } })),
    { type: 'text', text: `PEDIDO DEL CLIENTE:\n${pedido}\n\n${historial ? `ÚLTIMOS MENSAJES (contexto):\n${historial}\n\n` : ''}${imagenes.length ? `Las imágenes de arriba las mandó el cliente con su pedido: ${imagenes.map((i) => `${i.clave}${i.nota ? ` (${i.nota})` : ''}`).join('; ')}. Si son capturas de su página, úsalas para entender qué parte quiere cambiar.\n\n` : ''}FOTOS DISPONIBLES (para agregar a la página):\n${fotos.map((f) => `- ${f.clave}: ${f.url} · ${f.descripcion}`).join('\n') || '(ninguna nueva)'}\n\n${errores.length ? `INTENTO ANTERIOR CON PROBLEMAS (corrígelos):\n${errores.map((e) => `- ${e}`).join('\n')}\n\n` : ''}HTML COMPLETO DE SU PÁGINA:\n${html}` },
  ];
  const r = await pedirJSON({ system: SISTEMA, contenido, schema: SCHEMA, max_tokens: 16000, timeoutMs: 240000 });
  return r.data || {};
}

/** Revisión visual del resultado contra el pedido (capturas en computadora y celular). */
async function verificar(url, pedido, hecho) {
  const [pc, cel] = await Promise.all([captura(url, { ancho: 1366 }), captura(url, { ancho: 390 })]);
  if (!pc && !cel) return { ok: true, problemas: [] };
  const r = await pedirJSON({
    system: 'Revisas si una página web quedó como pidió su dueño. Compara las capturas con el pedido. Marca solo problemas reales: lo pedido que no se ve aplicado, texto que no se lee sobre su fondo, elementos rotos o encimados. No opines de gustos.',
    contenido: [
      ...[pc, cel].filter(Boolean).map((u) => ({ type: 'image', source: { type: 'url', url: u } })),
      { type: 'text', text: `PEDIDO: ${pedido}\nLO QUE EL EDITOR DICE QUE HIZO: ${hecho.join('; ')}\nCapturas: computadora${cel ? ' y celular' : ''}, primera pantalla.` },
    ],
    schema: { type: 'object', properties: { ok: { type: 'boolean' }, problemas: { type: 'array', items: { type: 'string' } } }, required: ['ok'] },
    max_tokens: 1500,
  }).catch(() => null);
  return r?.data || { ok: true, problemas: [] };
}

/**
 * Aplica un pedido del cliente directo sobre el HTML de su opción elegida.
 * → { ok, hecho:[], no_pude:[], pregunta, url } (nunca regenera con el generador)
 */
export async function editarElegida(e, p, { texto, claves = [] }) {
  const letra = p.elegido;
  const opcion = (p.opciones || []).find((o) => (o.etiqueta || o.letra) === letra);
  const archivo = rutaHTML(p.token, letra);
  const html0 = await fs.readFile(archivo, 'utf8');
  const assets = (await db.assetsDe(e.id).catch(() => [])).filter(esImagen);
  const historial = (await db.ultimosMensajes(e.id, 6).catch(() => [])).map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${String(m.transcripcion || m.contenido || '').slice(0, 300)}`).join('\n');
  const delMensaje = assets.filter((a) => claves.includes(a.clave));
  // Cada imagen del pedido: ¿foto para poner o captura/referencia para entender? (la captura de JIGA se publicó como foto, 10-nov-2026)
  const usos = new Map();
  for (const a of delMensaje) {
    if (a.tipo === 'referencia') { usos.set(a.clave, { uso: 'captura_pagina' }); continue; }
    const r = await interpretarImagenCambio(absoluta(a.url), { texto, mismoMensaje: true, historial, urlPagina: opcion?.url || '' });
    usos.set(a.clave, r || { uso: texto.trim() ? 'captura_pagina' : 'foto' });
  }
  const capturas = delMensaje.filter((a) => usos.get(a.clave)?.uso !== 'foto');
  const fotos = assets.filter((a) => !capturas.includes(a) && a.tipo !== 'logo' && a.usar !== false)
    .map((a) => ({ clave: a.clave, url: absoluta(a.url), descripcion: String(a.descripcion_ia || a.nota || '').slice(0, 140) }))
    .filter((f) => claves.includes(f.clave) || !html0.includes(f.url)); // solo fotos que aún no están en la página
  if (capturas.length) await db.actualizarAssets(e.id, capturas.map((a) => ({ clave: a.clave, tipo: 'referencia', usar: false }))).catch(() => {});
  const imagenes = capturas.map((a) => { const u = usos.get(a.clave) || {}; return { clave: a.clave, url: a.url, nota: [u.uso, u.senala, u.transcripcion && `texto: ${u.transcripcion}`].filter(Boolean).join(' · ').slice(0, 400) }; });

  let errores = [];
  let resultado = null;
  for (let intento = 0; intento < 2; intento++) {
    const d = await pedirEdiciones({ html: html0, pedido: texto, fotos, imagenes, errores, historial });
    if (d.pregunta && !(d.ediciones || []).length && !d.css) return { ok: false, pregunta: d.pregunta, hecho: [], no_pude: [] };
    const ap = aplicarEdiciones(html0, d.ediciones || []);
    const html1 = conCssCliente(ap.html, d.css);
    if (html1 === html0) { errores = ['No se aplicó ningún cambio: revisa que cada "buscar" exista tal cual y una sola vez, o usa CSS.']; continue; }
    if (ap.fallidas.length && intento === 0) { errores = ap.fallidas.map((f) => `No se pudo aplicar el reemplazo (${f.motivo}): ${String(f.buscar).slice(0, 120)}`); continue; }
    resultado = { html: html1, d, fallidas: ap.fallidas };
    break;
  }
  if (!resultado) return { ok: false, hecho: [], no_pude: [], pregunta: null };

  await respaldar(p.token, letra, html0);
  await fs.writeFile(archivo, resultado.html);
  let hecho = resultado.d.hecho || [];
  let noPude = resultado.d.no_pude || [];

  // Revisión visual: si algo de lo pedido no se ve o algo se rompió, una corrección más sobre el HTML ya editado.
  const v = await verificar(opcion?.url, texto, hecho).catch(() => ({ ok: true, problemas: [] }));
  if (!v.ok && (v.problemas || []).length) {
    const d2 = await pedirEdiciones({ html: resultado.html, pedido: texto, fotos, imagenes, errores: v.problemas, historial }).catch(() => null);
    if (d2) {
      const ap2 = aplicarEdiciones(resultado.html, d2.ediciones || []);
      const html2 = conCssCliente(ap2.html, d2.css);
      if (html2 !== resultado.html) { await fs.writeFile(archivo, html2); hecho = d2.hecho?.length ? d2.hecho : hecho; noPude = d2.no_pude || noPude; }
    }
  }
  await db.evento(e.id, 'html_editado', { letra, pedido: texto.slice(0, 500), hecho, no_pude: noPude, capturas: capturas.map((a) => a.clave), verificacion: v }).catch(() => {});
  return { ok: true, hecho, no_pude: noPude, url: opcion?.url };
}
