// Mapas por giro (etapa 2, aprobada por Sebastián el 16 al 18-nov-2026; doc del proyecto
// claude/etapa2-mapa-por-giro-propuesta.md). Un archivo por giro en esta carpeta, con sus variantes por subtipo:
//   orden   secciones del kit después de la portada (el giro manda en el orden; la opción decide cómo se ven)
//   nombres títulos de esas secciones (lo que el cliente pida cambiar con Ari va encima)
//   lista   opciones en orden de preferencia; al cliente le tocan las primeras 6 que puede armar
// Cada propuesta guarda el mapa con el que se generó (brief.marca.propuestas.mapa), y los cambios que pide el cliente
// lo reutilizan. Las propuestas generadas antes de la etapa 2 no lo tienen: se arman con el mapa LEGADO (el orden
// propio de cada opción y los títulos de siempre).
// Restaurantes y cafeterías tienen su mapa aparte (giros/restaurante.js, etapa 3): sus secciones son las de su plantilla.
import { giro as servicios } from './servicios.js';
import { giro as clinica } from './clinica.js';
import { giro as inmobiliaria } from './inmobiliaria.js';
import { giro as tienda } from './tienda.js';
import { giro as oficios } from './oficios.js';
import { giro as educacion } from './educacion.js';
import { giro as turismo } from './turismo.js';
import { giro as generico } from './generico.js';
import { giro as restaurante } from './restaurante.js';

export const VERSION = 'giros-1';
/** Opciones con movimiento y narrativa al hacer scroll (las de sitios de referencia premiados). */
export const CON_MOVIMIENTO = Object.freeze(['K', 'N', 'J', 'M', 'I', 'R', 'H']);
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
  const texto = `${negocio.giro_texto || ''} ${negocio.descripcion_redes || ''}`;
  const [id, v] = Object.entries(g.variantes).find(([, x]) => x.subtipos.includes(sub))
    || (!sub && Object.entries(g.variantes).find(([, x]) => x.detectar?.test(texto)))
    || [g.porOmision, g.variantes[g.porOmision]];
  return { giro: g.id, variante: id, ...v };
}

/** Mapa nuevo para un negocio (se guarda tal cual en la propuesta). */
export function mapaNuevo(brief = {}) {
  if (brief.negocio?.arquetipo === 'restaurante') { const v = restaurante.variantes.base; return { version: VERSION, giro: 'restaurante', variante: 'base', orden: [...v.orden], nombres: { ...v.nombres }, lista: [...v.lista] }; }
  const v = varianteDe(brief.negocio || {});
  if (!v) return null;
  // Si pidió "con todo el espectáculo" (marca.efectos), las opciones con movimiento de su lista van primero.
  const lista = brief.marca?.efectos === 'espectacular' ? [...v.lista.filter((l) => CON_MOVIMIENTO.includes(l)), ...v.lista.filter((l) => !CON_MOVIMIENTO.includes(l))] : [...v.lista];
  return { version: VERSION, giro: v.giro, variante: v.variante, orden: [...v.orden], nombres: { ...v.nombres }, lista };
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
  const fin = mapa.orden.includes('contacto') ? mapa.orden.indexOf('contacto') - 0.5 : mapa.orden.length;
  const pos = (id) => { const i = mapa.orden.indexOf(id); return i >= 0 ? i : id === 'contacto' ? 1e6 : fin; };
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
    // Los productos de ejemplo (sin precio, etapa 2 parte 3) cuentan como productos.
    productos: items.filter((x) => x?.ejemplo || String(x?.precio_o_rango || '').trim()).length,
    producto: items.some((x) => x?.ejemplo || String(x?.precio_o_rango || '').trim()) && trabajos + hero > 0,
    secciones,
  };
}

/** ¿El material del cliente alcanza para que la opción se vea completa? (requisitos de su opcion.js y su regla apta). */
export function cumple(op, cuenta, { brief, mat, ignorar = [] } = {}) {
  if (!op) return false;
  // Una regla apta que truena con material incompleto cuenta como "no apta" (no tumba la elección de las 6).
  if (op.apta) { let a = false; try { a = op.apta({ brief, mat }); } catch { a = false; } if (!a) return false; }
  return Object.entries(op.requisitos || {}).filter(([k]) => !ignorar.includes(k)).every(([k, v]) => (typeof v === 'boolean' ? !v || cuenta[k] === true : (cuenta[k] || 0) >= v));
}

/**
 * Las 6 opciones de un cliente según la lista de su giro: las primeras que su material permite armar completas; si no
 * se juntan 6, se completa con E y F (no piden nada) y luego con el resto de la lista. Devuelve también el respaldo
 * (las siguientes de la lista), por si alguna falla al generarse.
 */
// Opciones suspendidas (24-nov-2026, decisión de Sebastián): las 6 de siempre (A–F) dejan de proponerse "hasta nuevo
// aviso" en propuestas nuevas de todos los giros, salvo restaurantes (sus A–F son otras, con registro propio). Las propuestas
// ya generadas y los sitios elegidos con A–F siguen funcionando igual. Para volver a proponerlas: OPCIONES_SUSPENDIDAS=ninguna
// en el servicio api (o la lista de letras que se quieran suspender, separadas por coma).
export const SUSPENDIDAS_POR_OMISION = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F']);
export function suspendidas() {
  const v = process.env.OPCIONES_SUSPENDIDAS;
  if (v == null || v === '') return [...SUSPENDIDAS_POR_OMISION];
  if (/^ningun[oa]s?$/i.test(v.trim())) return [];
  return v.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
}
// Con A–F suspendidas, lo que falte para llegar a 6 se completa con estas (en este orden), primero las que el material
// del cliente permite armar completas. S solo sale con página de referencia; P, Q y O solo si cumplen (son de productos).
const COMPLETAR = ['K', 'N', 'J', 'M', 'H', 'G', 'I', 'R', 'L', 'O', 'Q', 'P'];
const SOLO_SI_CUMPLE = new Set(['O', 'P', 'Q', 'S']);

export function elegirLetras(mapa, { brief, mat, textos, porLetra, rellenables = [] }) {
  const cuenta = contarMaterial({ brief, mat, textos });
  const fuera = new Set([...(mapa.excluir || []), ...suspendidas()]);
  // mapa.excluir: letras que no deben salir (ya mostradas y rechazadas, o con defectos en la revisión visual).
  const existe = (l) => !!porLetra(l) && !fuera.has(l);
  const lista = mapa.lista.filter(existe);
  const ok = (l) => cumple(porLetra(l), cuenta, { brief, mat, ignorar: rellenables });
  // Con elementos ilustrativos (rellenables = requisitos que el relleno cubre), salen las primeras 6 de la lista.
  const elegidas = lista.filter(ok).slice(0, 6);
  for (const l of COMPLETAR) if (elegidas.length < 6 && existe(l) && !elegidas.includes(l) && ok(l)) elegidas.push(l);
  for (const l of ['E', 'F', ...lista, 'A', 'B', 'C', 'D', ...COMPLETAR]) if (elegidas.length < 6 && existe(l) && !elegidas.includes(l) && !SOLO_SI_CUMPLE.has(l)) elegidas.push(l);
  const respaldo = [...lista, ...COMPLETAR, 'E', 'F', 'A', 'B', 'C', 'D'].filter((l, k, a) => existe(l) && !elegidas.includes(l) && a.indexOf(l) === k && (!SOLO_SI_CUMPLE.has(l) || ok(l)));
  // Se muestran en el orden de preferencia de la lista (las que no están en ella, al final).
  const lugar = (l) => (lista.includes(l) ? lista.indexOf(l) : 99);
  return { letras: elegidas.sort((a, b) => lugar(a) - lugar(b)), respaldo, cuenta };
}
