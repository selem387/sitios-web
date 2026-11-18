// Mapas por giro (etapa 2, aprobada por Sebastián el 16 al 18-nov-2026; doc del proyecto
// claude/etapa2-mapa-por-giro-propuesta.md). Un archivo por giro en esta carpeta, con sus variantes por subtipo:
//   orden   secciones del kit después de la portada (el giro manda en el orden; la opción decide cómo se ven)
//   nombres títulos de esas secciones (lo que el cliente pida cambiar con Ari va encima)
//   lista   opciones en orden de preferencia; al cliente le tocan las primeras 6 que puede armar
// Cada propuesta guarda el mapa con el que se generó (brief.marca.propuestas.mapa), y los cambios que pide el cliente
// lo reutilizan. Las propuestas generadas antes de la etapa 2 no lo tienen: se arman con el mapa LEGADO (el orden
// propio de cada opción y los títulos de siempre).
// Restaurantes y cafeterías no tienen mapa todavía (etapa 3).
import { giro as servicios } from './servicios.js';
import { giro as clinica } from './clinica.js';
import { giro as inmobiliaria } from './inmobiliaria.js';
import { giro as tienda } from './tienda.js';
import { giro as oficios } from './oficios.js';
import { giro as educacion } from './educacion.js';
import { giro as turismo } from './turismo.js';
import { giro as generico } from './generico.js';

export const VERSION = 'giros-1';
export const GIROS = Object.freeze({ servicios, clinica, inmobiliaria, tienda, oficios, educacion, turismo, generico });
/** Secciones del kit que puede ordenar un mapa (id de cada una en kit/secciones.js). */
export const SECCIONES = Object.freeze(['trabajo', 'servicios', 'sobre', 'equipo', 'resenas', 'proceso', 'video', 'faq', 'contacto']);
/** Propuestas generadas antes de la etapa 2. */
export const LEGADO = Object.freeze({ version: 'legado' });
export const esLegado = (m) => !m || m.version === 'legado';

/** Variante del giro para un negocio: por subtipo; si no, la de omisión del giro. Sin giro (o sin mapa) → genérico. */
export function varianteDe(negocio = {}) {
  const g = GIROS[negocio.arquetipo] || (negocio.arquetipo === 'restaurante' ? null : GIROS.generico);
  if (!g) return null;
  const sub = negocio.subtipo_resuelto || negocio.subtipo;
  const [id, v] = Object.entries(g.variantes).find(([, x]) => x.subtipos.includes(sub)) || [g.porOmision, g.variantes[g.porOmision]];
  return { giro: g.id, variante: id, ...v };
}

/** Mapa nuevo para un negocio (se guarda tal cual en la propuesta). null para restaurantes. */
export function mapaNuevo(brief = {}) {
  const v = varianteDe(brief.negocio || {});
  if (!v) return null;
  return { version: VERSION, giro: v.giro, variante: v.variante, orden: [...v.orden], nombres: { ...v.nombres }, lista: [...v.lista] };
}

/** Mapa con el que se arma una propuesta: el que se pida, el guardado en la propuesta o, si no hay, el legado. */
export function resolverMapa(brief = {}, pedido = null) {
  if (pedido === 'nuevo') return mapaNuevo(brief) || LEGADO;
  if (pedido && typeof pedido === 'object') return pedido;
  return brief.marca?.propuestas?.mapa || LEGADO;
}

/**
 * Ordena las piezas que devuelve una opción según el mapa: cada sección del kit (función con .seccion) se mueve a su
 * lugar en el mapa y se lleva consigo las piezas propias de la opción que venían justo después de ella (las que
 * vienen antes de cualquier sección se quedan al principio). Las secciones que el mapa no menciona van al final,
 * antes de contacto, en el orden de la opción.
 */
export function ordenarPiezas(piezas, mapa) {
  if (esLegado(mapa)) return piezas;
  const inicio = [], grupos = [];
  for (const p of piezas) {
    if (p?.seccion) grupos.push({ id: p.seccion, piezas: [p], k: grupos.length });
    else (grupos.length ? grupos[grupos.length - 1].piezas : inicio).push(p);
  }
  const pos = (id) => { const i = mapa.orden.indexOf(id); return i >= 0 ? i : id === 'contacto' ? 1e6 : mapa.orden.length + 0.5; };
  grupos.sort((a, b) => pos(a.id) - pos(b.id) || a.k - b.k);
  return [...inicio, ...grupos.flatMap((g) => g.piezas)];
}

/** Marca una pieza de una opción como su versión de una sección del kit (para que el mapa la ordene). */
export const comoSeccion = (id, fn) => Object.assign(fn, { seccion: id });

/** Cuánto material tiene el cliente, en las unidades de los requisitos de las opciones (opcion.js → requisitos). */
export function contarMaterial({ brief = {}, mat = {}, textos = {} } = {}) {
  const items = brief.oferta?.items || [];
  const trabajos = (mat.trabajos || []).length;
  const hero = mat.hero?.url ? 1 : 0;
  const testimonios = (brief.confianza?.testimonios || []).filter((x) => x?.texto).length;
  const secciones = [
    trabajos > 0, items.length > 0, !!(textos.sobre || brief.confianza?.historia_corta || mat.fundador), (mat.equipo || []).length > 0,
    testimonios > 0 || (mat.resenas || []).length > 0, (brief.oferta?.proceso_pasos || []).length >= 3,
    (brief.faq || []).some((x) => x?.pregunta && x?.respuesta), (mat.videos || []).length > 0,
  ].filter(Boolean).length + 1; // + contacto, que siempre sale
  return {
    fotosTrabajo: trabajos,
    fotoBuena: hero + trabajos + (mat.local || []).length,
    fotosTotal: hero + trabajos,
    logo: !!mat.logo?.url,
    servicios: items.filter((x) => String(x?.descripcion_corta || '').trim()).length,
    grupos: new Set(items.map((x) => String(x?.grupo || '').trim()).filter(Boolean)).size,
    productos: items.filter((x) => String(x?.precio_o_rango || '').trim()).length,
    producto: items.some((x) => String(x?.precio_o_rango || '').trim()) && trabajos + hero > 0,
    secciones,
  };
}

/** ¿El material del cliente alcanza para que la opción se vea completa? (requisitos de su opcion.js y su regla apta). */
export function cumple(op, cuenta, { brief, mat } = {}) {
  if (!op) return false;
  if (op.apta && !op.apta({ brief, mat })) return false;
  return Object.entries(op.requisitos || {}).every(([k, v]) => (typeof v === 'boolean' ? !v || cuenta[k] === true : (cuenta[k] || 0) >= v));
}

/**
 * Las 6 opciones de un cliente según la lista de su giro: las primeras que su material permite armar completas; si no
 * se juntan 6, se completa con E y F (no piden nada) y luego con el resto de la lista. Devuelve también el respaldo
 * (las siguientes de la lista), por si alguna falla al generarse.
 */
export function elegirLetras(mapa, { brief, mat, textos, porLetra }) {
  const cuenta = contarMaterial({ brief, mat, textos });
  const existe = (l) => !!porLetra(l);
  const lista = mapa.lista.filter(existe);
  const elegidas = lista.filter((l) => cumple(porLetra(l), cuenta, { brief, mat })).slice(0, 6);
  for (const l of ['E', 'F', ...lista, 'A', 'B', 'C', 'D']) if (elegidas.length < 6 && existe(l) && !elegidas.includes(l)) elegidas.push(l);
  const respaldo = [...lista, 'E', 'F', 'A', 'B', 'C', 'D'].filter((l, k, a) => existe(l) && !elegidas.includes(l) && a.indexOf(l) === k);
  return { letras: elegidas, respaldo, cuenta };
}
