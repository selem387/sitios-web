// Paleta y letra al inicio (decisión de Sebastián, 24-nov-2026): en cuanto Ari conoce el giro, antes de seguir con la
// entrevista, se pide el logo, se muestran las paletas (una imagen en cuadrícula) y después las parejas de letras con los
// colores elegidos. Lo maneja el código, no el modelo: cada paso guarda su estado en brief.marca.seleccion.
// Lo elegido queda en brief.marca.paleta_elegida y brief.marca.tipografia_elegida ({disenador:true} si dejó que lo decida
// el diseñador) y se aplica a todas las propuestas (generador/propuestas_html.js).
import { config } from '../config.js';
import { esNegativa } from './requisitos.js';
import { opcionesPaleta, opcionesFuente, htmlPaletas, htmlFuentes, leerRespuesta, porQueFuente } from '../generador/seleccion_marca.js';
import { nombreColor } from '../generador/asesor_color.js';
import { resolverSubtipo } from './subtipo.js';

/**
 * Giro dicho pero sin arquetipo todavía (Ari lo pone a veces un turno después): se infiere por palabras clave entre
 * todos los arquetipos para poder mostrar paletas de su giro sin esperar. null si ninguno coincide.
 */
export function inferirArquetipo(brief = {}, arquetipos = []) {
  const n = brief.negocio || {};
  if (vacio(n.giro_texto) || !vacio(n.arquetipo)) return null;
  let mejor = null;
  for (const a of arquetipos) {
    const r = resolverSubtipo({ ...brief, negocio: { ...n, arquetipo: a.slug, subtipo: null } }, arquetipos);
    const pts = r.fuente === 'inferido' ? Math.max(0, ...Object.values(r.puntajes || {})) : 0;
    if (pts > 0 && (!mejor || pts > mejor.pts)) mejor = { arquetipo: a.slug, subtipo: r.subtipo, pts };
  }
  return mejor;
}

const vacio = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim());

/** ¿Ya eligió paleta y letra (o dejó que lo decida el diseñador)? */
export const seleccionHecha = (brief = {}) => !!brief?.marca?.paleta_elegida && !!brief?.marca?.tipografia_elegida;

/** ¿Toca esta etapa? Giro conocido, sin opciones de diseño todavía y sin terminar la elección. */
export function seleccionAplica(brief = {}) {
  const n = brief?.negocio || {};
  if (vacio(n.giro_texto) || vacio(n.arquetipo)) return false;
  if (brief?.marca?.propuestas) return false; // a quien ya recibió propuestas no se le cambia el camino
  return !seleccionHecha(brief);
}

/** ¿Está en medio de la etapa (esperando logo, paleta o letra)? */
export const seleccionEnCurso = (brief = {}) => seleccionAplica(brief) && ['logo', 'paleta', 'fuente'].includes(brief?.marca?.seleccion?.paso);

async function imagenDeHtml(html, prefijo) {
  if (!config.renderUrl) return null;
  const r = await fetch(`${config.renderUrl}/v1/imagen`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey },
    body: JSON.stringify({ html, ancho: 480, prefijo }), signal: AbortSignal.timeout(60000),
  }).catch(() => null);
  return r?.ok ? (await r.json()).url || null : null;
}

async function coloresDeLogo(url) {
  const { coloresDeUrl } = await import('../generador/materiales.js');
  return coloresDeUrl(url);
}

export const DEPS = { imagen: imagenDeHtml, coloresLogo: coloresDeLogo };

const negocioDe = (b) => String(b?.negocio?.nombre || '').trim();
const frase = (b) => { const g = String(b?.negocio?.giro_texto || '').trim(); return g ? (g[0].toUpperCase() + g.slice(1)).slice(0, 48) : ''; };
const minus = (s) => String(s || '').replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '');

const PIDE_LOGO = 'Antes de seguir, vamos a definir los colores y la letra de tu página 🎨\n\n¿Tienes logotipo? Mándamelo por aquí y lo uso para proponerte colores que combinen con tu marca. Si no tienes, dime y te muestro opciones pensadas para tu giro.';

/** Mensaje y media de la cuadrícula de paletas de la ronda actual. */
export async function mandarPaletas(b, sel, deps = DEPS) {
  const p = opcionesPaleta({ brief: b, coloresLogo: sel.logo_colores || [], ronda: sel.ronda_paleta || 0, mostradas: sel.paletas_mostradas || [] });
  if (!p.opciones.length) {
    // Ya vio todas: se vuelve a empezar por las de su giro.
    sel.paletas_mostradas = []; sel.ronda_paleta = 1;
    return mandarPaletas(b, sel, deps);
  }
  sel.paletas = { opciones: p.opciones, recomendada: p.recomendada, disenador: p.disenador };
  sel.paletas_mostradas = [...new Set([...(sel.paletas_mostradas || []), ...p.opciones.filter((o) => o.origen !== 'logo').map((o) => o.id)])];
  const url = await deps.imagen(htmlPaletas({ ...p, negocio: negocioDe(b) }), 'paletas').catch(() => null);
  const rec = p.opciones.find((o) => o.letra === p.recomendada);
  const conLogo = p.opciones.some((o) => o.origen === 'logo');
  const lista = url ? '' : `\n\n${p.opciones.map((o) => `*${o.letra}* · ${o.nombre}: ${nombreColor(o.colores.marca)}, ${nombreColor(o.colores.acento)} y ${nombreColor(o.colores.fondo)}`).join('\n')}\n*${p.disenador}* · Que lo decida el diseñador`;
  const textos = [
    `${(sel.ronda_paleta || 0) ? 'Aquí van otras combinaciones de color' : 'Te preparé estas combinaciones de color para tu página'}${conLogo ? ' (la *A* sale de tu logo)' : ''} 👇${lista}`,
    `${rec ? `Te recomiendo la *${rec.letra}*: ${minus(rec.por)}.\n\n` : ''}¿Cuál te gusta más? Respóndeme con la letra. Si quieres ver otras, escribe *más*; si prefieres que lo decida el diseñador, la *${p.disenador}*.`,
  ];
  return { textos, media: url ? [{ url, caption: 'Paletas de color' }] : [] };
}

/** Mensaje y media de la cuadrícula de letras (con los colores elegidos). */
export async function mandarFuentes(b, sel, deps = DEPS) {
  const paleta = b.marca?.paleta_elegida?.colores ? b.marca.paleta_elegida : null;
  let f = opcionesFuente({ brief: b, paleta, mostradas: sel.fuentes_mostradas || [] });
  if (!f.opciones.length) { sel.fuentes_mostradas = []; f = opcionesFuente({ brief: b, paleta, mostradas: [] }); }
  sel.fuentes = { opciones: f.opciones, recomendada: f.recomendada, disenador: f.disenador };
  sel.fuentes_mostradas = [...new Set([...(sel.fuentes_mostradas || []), ...f.opciones.map((o) => o.id)])];
  const url = await deps.imagen(htmlFuentes({ ...f, negocio: negocioDe(b), paleta, frase: frase(b) }), 'letras').catch(() => null);
  const rec = f.opciones.find((o) => o.letra === f.recomendada);
  const lista = url ? '' : `\n\n${f.opciones.map((o) => `*${o.letra}* · ${o.titulos} en títulos y ${o.cuerpo} en textos`).join('\n')}\n*${f.disenador}* · Que lo decida el diseñador`;
  const textos = [
    `${(sel.ronda_fuente || 0) ? 'Aquí van otras letras' : 'Ahora la letra de tu página'}${paleta ? ', ya con tus colores' : ''} 👇${lista}`,
    `${rec ? `Te recomiendo la *${rec.letra}*: ${porQueFuente(rec)}.\n\n` : ''}¿Cuál te gusta más? Respóndeme con la letra. Si quieres ver otras, escribe *más*; si prefieres que lo decida el diseñador, la *${f.disenador}*.`,
  ];
  return { textos, media: url ? [{ url, caption: 'Letras para tu página' }] : [] };
}

const conMarca = (b, patch) => ({ ...b, marca: { ...(b.marca || {}), ...patch } });

/**
 * Un turno de la etapa. inicio=true: se acaba de conocer el giro (arranca la etapa).
 * @returns {null | {brief, textos:string[], media:object[], assetsPatch:object[], terminado:boolean}}
 *   null si la etapa no aplica.
 */
export async function atenderSeleccion({ brief = {}, assets = [], texto = '', nuevosAssets = [], inicio = false } = {}, deps = DEPS) {
  if (!seleccionAplica(brief)) return null;
  let b = brief;
  const sel = { ...(b.marca?.seleccion || {}) };
  const assetsPatch = [];
  const fin = (r) => ({ brief: conMarca(b, { seleccion: sel }), assetsPatch, terminado: false, ...r });

  // 1) Logo
  if (!sel.paso || sel.paso === 'logo') {
    let logo = assets.find((a) => a.tipo === 'logo' && a.usar !== false);
    const sinLogo = b.marca?.tiene_logo === false || (b.no_tiene || []).includes('logo');
    if (!logo && sel.paso === 'logo') {
      // Lo que mande mientras se le pide el logo es su logo.
      const img = nuevosAssets.find((a) => !['documento', 'video'].includes(a.tipo) && /^https?:/.test(a.url || ''));
      if (img) { logo = { ...img, tipo: 'logo' }; assetsPatch.push({ clave: img.clave, tipo: 'logo' }); }
    }
    if (!logo && !sinLogo) {
      if (!sel.paso || inicio) { sel.paso = 'logo'; return fin({ textos: [PIDE_LOGO], media: [] }); }
      if (esNegativa(texto) || /\b(no tengo|no tenemos|sin logo|no hay logo|aun no tengo|todavia no tengo)\b/i.test(texto)) {
        b = conMarca(b, { tiene_logo: false });
      } else if (!sel.logo_insistido) {
        sel.logo_insistido = true;
        if (/\b(si|claro|ahorita|luego|despues|te lo mando|lo busco)\b/i.test(texto)) return fin({ textos: ['Va, mándamelo por aquí cuando lo tengas a la mano 👍 Si prefieres seguir sin él, dime y te muestro los colores.'], media: [] });
        return fin({ textos: ['¿Me mandas tu logotipo por aquí? Si no tienes o prefieres seguir sin él, dime y te muestro los colores para tu giro.'], media: [] });
      } else sel.sin_logo_ahora = true; // sigue sin él; el requisito de logo se vuelve a pedir más adelante
    }
    if (logo) sel.logo_colores = await deps.coloresLogo(logo.url).catch(() => []);
    sel.paso = 'paleta'; sel.ronda_paleta = 0; sel.paletas_mostradas = [];
    const m = await mandarPaletas(b, sel, deps);
    const previo = logo && !inicio ? ['¡Gracias por tu logo! 🙌'] : [];
    return fin({ textos: [...previo, ...m.textos], media: m.media });
  }

  // 2) Paleta
  if (sel.paso === 'paleta') {
    const ps = sel.paletas || { opciones: [] };
    const r = leerRespuesta(texto, { letras: ps.opciones.map((o) => o.letra), disenador: ps.disenador });
    const elegir = (o) => conMarca(b, { paleta_elegida: { nombre: o.nombre, colores: o.colores, origen: o.origen, estilo: o.estilo || null } });
    if (r.tipo === 'mas') {
      sel.ronda_paleta = (sel.ronda_paleta || 0) + 1;
      return fin(await mandarPaletas(b, sel, deps));
    }
    if (r.tipo === 'otro') return fin({ textos: [`Para seguir, respóndeme con la letra de la paleta que más te guste (de la *A* a la *${ps.disenador}*). Si quieres ver otras, escribe *más*.`], media: [] });
    let elegida = null;
    if (r.tipo === 'letra') elegida = ps.opciones.find((o) => o.letra === r.letra);
    if (r.tipo === 'recomendada') elegida = ps.opciones.find((o) => o.letra === ps.recomendada);
    b = elegida ? elegir(elegida) : conMarca(b, { paleta_elegida: { disenador: true } });
    sel.paso = 'fuente'; sel.ronda_fuente = 0; sel.fuentes_mostradas = [];
    const m = await mandarFuentes(b, sel, deps);
    const ok = elegida ? `¡Buena elección! Tu página va con *${elegida.nombre.replace(/^./, (c) => c.toLowerCase())}* 🎨` : 'Va, el diseñador decide los colores de cada diseño 👍';
    return fin({ textos: [ok, ...m.textos], media: m.media });
  }

  // 3) Letra
  if (sel.paso === 'fuente') {
    const fs = sel.fuentes || { opciones: [] };
    const r = leerRespuesta(texto, { letras: fs.opciones.map((o) => o.letra), disenador: fs.disenador });
    if (r.tipo === 'mas') {
      sel.ronda_fuente = (sel.ronda_fuente || 0) + 1;
      return fin(await mandarFuentes(b, sel, deps));
    }
    if (r.tipo === 'otro') return fin({ textos: [`Para seguir, respóndeme con la letra de la opción que más te guste (de la *A* a la *${fs.disenador}*). Si quieres ver otras, escribe *más*.`], media: [] });
    let elegida = null;
    if (r.tipo === 'letra') elegida = fs.opciones.find((o) => o.letra === r.letra);
    if (r.tipo === 'recomendada') elegida = fs.opciones.find((o) => o.letra === fs.recomendada);
    b = conMarca(b, { tipografia_elegida: elegida ? { titulos: elegida.titulos, cuerpo: elegida.cuerpo, estilo: elegida.estilo } : { disenador: true } });
    // El estilo sale de lo que eligió: ya no se le pregunta "¿elegante, fresco, minimalista…?".
    if (vacio(b.marca?.estilo)) {
      const est = elegida?.estilo || b.marca?.paleta_elegida?.estilo;
      if (est) b = conMarca(b, { estilo: est });
    }
    sel.paso = 'lista';
    const ok = elegida ? `¡Listo! Tus opciones de diseño van a usar *${elegida.titulos}* en títulos y *${elegida.cuerpo}* en textos ✍️` : 'Va, el diseñador decide la letra de cada diseño 👍';
    return { brief: conMarca(b, { seleccion: sel }), assetsPatch, terminado: true, textos: [ok], media: [] };
  }
  return null;
}
