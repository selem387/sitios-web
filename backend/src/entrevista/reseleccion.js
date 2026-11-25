// Volver a elegir paleta o letra (decisión de Sebastián, 24-nov-2026).
// Si el cliente pide un cambio GENERAL de colores ("cambia los colores", "no me gustan los colores") o de letra
// ("quiero otra letra"), se le vuelven a mostrar las imágenes de paletas o de letras para que elija. Los pedidos puntuales
// ("el botón naranja", "los títulos más grandes") se aplican directo como siempre.
// Momentos: 'propuestas' (viendo sus opciones, antes de elegir: se rehacen las mismas con lo nuevo),
// 'version' (ya eligió y trabaja una versión: se aplica solo a la versión activa con el editor de cambios),
// 'previo' (eligió paleta/letra pero aún no hay propuestas: solo se guarda).
// El estado vive en brief.marca.reseleccion.
import { mandarPaletas, mandarFuentes, DEPS } from './seleccion.js';
import { leerRespuesta } from '../generador/seleccion_marca.js';

const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9#ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const PIDE = /\b(cambia|cambiar|cambiale|cambiemos|cambies|otra|otro|otras|otros|nueva|nuevas|nuevo|diferente|diferentes|distinta|distintas|no me gusta|no me gustan|no me convence|no me convencen|ver opciones|muestrame|ensename|quiero ver|puedo ver|elegir)\b/;
const PALETA = /\b(colores|color|paleta|paletas|gama|combinacion|combinaciones|tonos)\b/;
const LETRA = /\b(letra|letras|tipografia|tipografias|fuente|fuentes|tipo de letra)\b/;
// Algo concreto (una parte de la página, un color con nombre, un tamaño): es puntual y va directo al editor.
const PUNTUAL = /\b(boton|botones|titulo|titulos|subtitulo|fondo|fondos|menu|encabezado|seccion|portada|footer|pie|icono|iconos|logo|enlace|enlaces|link|precio|precios|tarjeta|tarjetas|banner|formulario|mas grande|mas chica|mas chico|mas pequena|tamano|negrita|cursiva|mas oscuro|mas oscura|mas claro|mas clara|mas vivo|azul|azules|rojo|roja|verde|amarillo|naranja|morado|rosa|negro|negra|blanco|blanca|gris|cafe|dorado|plateado|turquesa|beige|crema|vino|lila|#[0-9a-f]{3,6})\b/;

/** 'paleta' | 'letra' | null: si el mensaje pide cambiar en general los colores o la letra. */
export function pideGeneral(texto = '') {
  const t = norm(texto);
  if (!t || t.split(' ').length > 25 || !PIDE.test(t) || PUNTUAL.test(t)) return null;
  if (PALETA.test(t)) return 'paleta';
  if (LETRA.test(t)) return 'letra';
  return null;
}

export const reseleccionActiva = (brief = {}) => !!brief?.marca?.reseleccion?.paso;

/** Momento de la conversación para saber cómo aplicar lo que elija. */
export function momentoDe(brief = {}, { sitioVivo = false } = {}) {
  const p = brief?.marca?.propuestas;
  if (sitioVivo || p?.estado === 'elegida') return 'version';
  if (p?.opciones?.length) return 'propuestas';
  return 'previo';
}

const conMarca = (b, patch) => ({ ...b, marca: { ...(b.marca || {}), ...patch } });
const sinReseleccion = (b) => { const m = { ...(b.marca || {}) }; delete m.reseleccion; return { ...b, marca: m }; };

/** Manda la imagen de paletas o de letras y deja la etapa abierta. */
export async function iniciarReseleccion({ brief = {}, assets = [], tipo, momento }, deps = DEPS) {
  const sel = { paso: tipo === 'letra' ? 'fuente' : 'paleta', momento, ronda_paleta: 0, ronda_fuente: 0 };
  // La paleta actual no se vuelve a ofrecer.
  const actual = brief.marca?.paleta_elegida?.nombre;
  sel.paletas_mostradas = actual ? [actual] : [];
  const actualF = brief.marca?.tipografia_elegida?.titulos ? `${brief.marca.tipografia_elegida.titulos}|${brief.marca.tipografia_elegida.cuerpo}` : null;
  sel.fuentes_mostradas = actualF ? [actualF] : [];
  if (sel.paso === 'paleta') {
    const logo = assets.find((a) => a.tipo === 'logo' && a.usar !== false);
    sel.logo_colores = logo ? await deps.coloresLogo(logo.url).catch(() => []) : [];
  }
  const m = sel.paso === 'paleta' ? await mandarPaletas(brief, sel, deps) : await mandarFuentes(brief, sel, deps);
  const intro = sel.paso === 'paleta' ? 'Claro, elige otra combinación de colores 🎨' : 'Claro, elige otra letra ✍️';
  return { brief: conMarca(brief, { reseleccion: sel }), textos: [intro, ...m.textos], media: m.media };
}

/**
 * Respuesta a la imagen. → {brief, textos, media} (más opciones o recordatorio) | {brief, eleccion:{tipo, valor}}
 * | {brief, cancelado:true} (habló de otra cosa: se atiende normal).
 */
export async function atenderReseleccion({ brief = {}, texto = '' }, deps = DEPS) {
  const sel = { ...(brief.marca?.reseleccion || {}) };
  const lista = sel.paso === 'paleta' ? sel.paletas : sel.fuentes;
  const r = leerRespuesta(texto, { letras: (lista?.opciones || []).map((o) => o.letra), disenador: lista?.disenador });
  if (r.tipo === 'mas') {
    if (sel.paso === 'paleta') sel.ronda_paleta = (sel.ronda_paleta || 0) + 1; else sel.ronda_fuente = (sel.ronda_fuente || 0) + 1;
    const m = sel.paso === 'paleta' ? await mandarPaletas(brief, sel, deps) : await mandarFuentes(brief, sel, deps);
    return { brief: conMarca(brief, { reseleccion: sel }), textos: m.textos, media: m.media };
  }
  if (r.tipo === 'otro') return { brief: sinReseleccion(brief), cancelado: true };
  let o = null;
  if (r.tipo === 'letra') o = lista.opciones.find((x) => x.letra === r.letra);
  if (r.tipo === 'recomendada') o = lista.opciones.find((x) => x.letra === lista.recomendada);
  const tipo = sel.paso === 'paleta' ? 'paleta' : 'letra';
  const valor = !o ? { disenador: true }
    : tipo === 'paleta' ? { nombre: o.nombre, colores: o.colores, origen: o.origen, estilo: o.estilo || null }
      : { titulos: o.titulos, cuerpo: o.cuerpo, estilo: o.estilo };
  return { brief: sinReseleccion(brief), eleccion: { tipo, valor, momento: sel.momento } };
}

/** Instrucción para el editor de cambios de la versión activa. */
export function instruccionCambio({ tipo, valor }) {
  if (tipo === 'paleta') {
    if (valor.disenador) return 'Regresa los colores de toda la página a los originales de este diseño (quita los cambios de color que se hicieron).';
    const c = valor.colores;
    return `Cambia la paleta de colores de TODA la página por la que eligió el cliente ("${valor.nombre}"): color de marca ${c.marca}, acento (botones y llamados a la acción) ${c.acento}, fondo ${c.fondo} y texto ${c.texto}. Ajusta todos los colores de la paleta del sitio a esta combinación, cuidando que todo se lea bien.`;
  }
  if (valor.disenador) return 'Regresa la letra de toda la página a la original de este diseño.';
  return `Cambia la letra de TODA la página: títulos en "${valor.titulos}" y textos en "${valor.cuerpo}".`;
}

/** Texto corto de lo elegido para confirmar. */
export function resumenEleccion({ tipo, valor }) {
  if (tipo === 'paleta') return valor.disenador ? 'Regresé los colores originales de cada diseño.' : `Ya tienen la paleta *${valor.nombre.replace(/^./, (x) => x.toLowerCase())}*.`;
  return valor.disenador ? 'Regresé la letra original de cada diseño.' : `Ya tienen la letra *${valor.titulos}* en títulos y *${valor.cuerpo}* en textos.`;
}
