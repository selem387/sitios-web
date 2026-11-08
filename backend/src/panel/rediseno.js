// Rediseño por chat (7-nov-2026): cuando al cliente no le convence ninguna de sus 6 opciones, se le preparan
// 6 opciones NUEVAS inspiradas en lo que pidió y en las páginas de referencia que mandó.
// Su página actual NO cambia: las nuevas se guardan aparte (brief.marca.propuestas_nuevas) y solo se aplican
// cuando elige una letra (panel/cambios_vivo.js cambia la propuesta y deja el diseño limpio).
// Sus textos, fotos y cambios ya hechos se conservan en las nuevas opciones.

import * as db from '../entrevista/db.js';
import { pedirJSON } from '../entrevista/claude.js';
import { avisar } from '../entrevista/avisos.js';
import { estudiarReferencias } from '../entrevista/referencias.js';
import { procesarMateriales } from '../generador/materiales.js';
import { crearPropuestasHTML } from '../generador/propuestas_html.js';
import { direccionEditorialSuave } from '../generador/estilo_ref.js';
import { revisarOpciones } from '../generador/revision_visual.js';
import { aplicarContenido, porEntrevista } from './sitios.js';

const ESTILOS = ['minimalista', 'fresco', 'calido', 'elegante', 'tecnologico', 'tradicional', 'lujo', 'divertido'];
const enCurso = new Set();

/** Ligas de otros sitios en un texto (no sus propias propuestas /p/<token>/<letra>). */
export const ligasReferencia = (texto) => (String(texto || '').match(/https?:\/\/[^\s)>\]]+/g) || [])
  .filter((u) => !/\/p\/[A-Za-z0-9]+\/[A-F]\b/.test(u) && !/easypanel\.host\/s\//.test(u));

/** Dirección de diseño (estilo, colores, notas) a partir de lo que pidió y del estudio de sus referencias. */
async function direccion(comentario, estudio, brief) {
  try {
    const r = await pedirJSON({
      system: `Eres directora de arte. El cliente quiere otro diseño para su página web. Con lo que pidió y el estudio de las páginas que le gustan, decide la dirección para 6 propuestas nuevas.
- "estilo": uno de ${ESTILOS.join(', ')}.
- "colores": 2 a 4 colores en palabras sencillas en español (p. ej. "blanco marfil", "negro", "beige", "dorado suave") tomados de la referencia o de lo que pidió; vacío si no hay pista clara.
- "notas": 1 a 3 frases con lo que se debe notar (fotos grandes, frases breves, letra delicada, mucho aire, galerías por tipo…). Nunca copiar textos, imágenes ni logos de la referencia.`,
      contenido: `LO QUE PIDIÓ: ${comentario || '(nada)'}\nNEGOCIO: ${brief.negocio?.nombre || ''} · ${brief.negocio?.giro_texto || ''}\nESTILO ACTUAL: ${brief.marca?.estilo || '-'}\nESTUDIO DE REFERENCIAS: ${JSON.stringify((estudio || []).map((x) => ({ url: x.url, resumen: x.resumen, modo: x.modo, tipografia: x.tipografia, colores: x.colores, densidad: x.densidad, error: x.error })) ).slice(0, 6000)}`,
      schema: { type: 'object', properties: { estilo: { type: 'string', enum: ESTILOS }, colores: { type: 'array', items: { type: 'string' } }, notas: { type: 'string' } }, required: ['estilo'] },
      max_tokens: 600,
    });
    return r.data;
  } catch (err) {
    console.error('[rediseno] direccion', err.message);
    return null;
  }
}

/**
 * Prepara 6 opciones nuevas en segundo plano y le manda las ligas por el chat.
 * No toca la página publicada.
 */
export async function prepararOpcionesNuevas(entrevistaId, { comentario = '', referencias = [], enviar = true } = {}) {
  if (enCurso.has(entrevistaId)) return;
  enCurso.add(entrevistaId);
  try {
    const e = await db.obtener(entrevistaId);
    const sv = e && await porEntrevista(e.id);
    if (!e || !sv) throw new Error('sin sitio');
    const { brief: actual, textos } = aplicarContenido(e, sv);
    const prop = actual.marca?.propuestas || {};
    const ligas = [...new Set([...referencias, ...ligasReferencia(comentario)])].slice(0, 3);
    const estudio = ligas.length ? await estudiarReferencias({ marca: { referencias_sitios: ligas } }).catch(() => []) : [];
    const dir = await direccion(comentario, estudio, actual);
    const ajustes = {
      ...(dir?.estilo ? { estilo: dir.estilo } : {}),
      ...(dir?.colores?.length ? { colores: dir.colores } : {}),
      referencias_sitios: [...new Set([...(actual.marca?.referencias_sitios || []), ...ligas])],
      referencias_estudio: [...(actual.marca?.referencias_estudio || []), ...estudio],
      referencias_que_gusta: [actual.marca?.referencias_que_gusta, comentario, dir?.notas].filter(Boolean).join(' · ').slice(0, 2000),
    };
    // Con una página de referencia estudiada y un estilo sobrio, las 6 son variaciones de ese estilo (no los acomodos de siempre).
    const refOk = estudio.some((x) => x && !x.error);
    if (refOk && ['elegante', 'lujo', 'minimalista', 'tradicional', 'calido'].includes(dir?.estilo || 'elegante')) ajustes.direccion_ref = direccionEditorialSuave();
    const baseRonda = Math.max(prop.ronda || 0, actual.marca?.propuestas_nuevas?.ronda || 0) + 1;
    // Hasta 3 intentos; solo se guardan (y se mandan) las opciones que pasan la revisión visual. Con menos de 4, se reintenta:
    // cada intento es otra ronda (otras fotos y variaciones) con la MISMA dirección: nunca se abandona el estilo que pidió.
    let elegidas = null, ultima = null, mejor = null, avisado = false;
    for (let intento = 0; intento < 3 && !elegidas; intento++) {
      const aj = ajustes;
      const brief = { ...actual, marca: { ...actual.marca, ...aj } };
      const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
      if (sv.contenido?.menu?.secciones) mat.menu_texto = sv.contenido.menu.secciones;
      const ronda = baseRonda + intento;
      const r = await crearPropuestasHTML(brief, mat, textos, { ronda });
      const opciones = r.opciones.map((o) => ({ etiqueta: o.letra, letra: o.letra, layout: o.layout, nombre: o.nombre, url: o.url, estilo: o.fuentes.estilo, tipografia: { titulos: o.fuentes.titulos, cuerpo: o.fuentes.cuerpo }, paleta: o.paleta }));
      const revision = await revisarOpciones(opciones, { referencia: aj.direccion_ref ? ligas[0] : null, pedido: comentario });
      const pasan = opciones.filter((o) => revision.find((x) => x.letra === o.letra)?.ok);
      await db.evento(e.id, 'revision_opciones', { intento, token: r.token, pasan: pasan.map((o) => o.letra), revision: revision.map(({ capturas, ...x }) => ({ ...x, capturas })) });
      ultima = { r, opciones, pasan, revision, aj, ronda };
      if (!mejor || pasan.length > mejor.pasan.length) mejor = ultima;
      if (pasan.length >= 4) elegidas = ultima;
      else if (enviar && !avisado) { avisado = true; await avisar(e.id, 'Les estoy dando una última revisada a tus opciones para que queden impecables ✨ En unos minutos más te las mando.').catch(() => {}); }
    }
    // Si ningún intento junta 4, se mandan las que pasaron del mejor intento (mínimo 2); si no, no se manda nada malo.
    if (!elegidas && mejor && mejor.pasan.length >= 2) elegidas = mejor;
    if (!elegidas) throw new Error(`ninguna ronda pasó la revisión visual: ${JSON.stringify((ultima?.revision || []).map((x) => ({ letra: x.letra, problemas: x.problemas })) ).slice(0, 400)}`);
    const { r, pasan, revision, aj, ronda } = elegidas;
    // Se relee el brief para no pisar lo que haya cambiado mientras se generaban.
    const e2 = await db.obtener(e.id);
    const nuevas = { estado: 'mostradas', token: r.token, opciones: pasan, textos, ronda, ajustes_marca: aj, comentario, revision: revision.map(({ letra, ok, parecido, problemas }) => ({ letra, ok, parecido, problemas })), creado: new Date().toISOString() };
    await db.guardar(e.id, { brief: { ...e2.brief, marca: { ...e2.brief.marca, propuestas_nuevas: nuevas } } });
    await db.evento(e.id, 'opciones_nuevas', { token: r.token, ronda, ligas, estilo: dir?.estilo || null, enviadas: pasan.map((o) => o.letra) });
    if (!enviar) return;
    await enviarOpcionesNuevas(e.id);
  } catch (err) {
    console.error('[rediseno]', entrevistaId, err);
    await db.evento(entrevistaId, 'opciones_nuevas_error', { error: String(err.message || err).slice(0, 500) }).catch(() => {});
    if (enviar) await avisar(entrevistaId, 'No logré dejar tus opciones nuevas como mereces 😔 ¿Me cuentas un poco más de lo que te gustaría (o me mandas otra página de ejemplo)? Así te preparo unas mejores.').catch(() => {});
  } finally {
    enCurso.delete(entrevistaId);
  }
}

/** Manda por el chat las ligas de las opciones nuevas ya preparadas. */
export async function enviarOpcionesNuevas(entrevistaId) {
  const e = await db.obtener(entrevistaId);
  const nuevas = opcionesNuevasPendientes(e?.brief);
  if (!nuevas) throw new Error('no hay opciones nuevas preparadas');
  const ligas = nuevas.ajustes_marca?.referencias_sitios || [];
  const opciones = nuevas.opciones;
  const r = { token: nuevas.token };
  {
    const lista = opciones.map((o) => `*${o.letra}. ${o.nombre}*\n${o.url}`).join('\n\n');
    await avisar(entrevistaId, `¡Listo! 😊 Te preparé ${opciones.length} opciones nuevas${ligas.length ? ' más parecidas a la página que me compartiste' : ''}, con tus textos y tus fotos:\n\n${lista}\n\nÁbrelas y dime la letra de la que quieres. Tu página no cambia hasta que me digas cuál.`, { evento: 'opciones_nuevas_enviadas', datos: { token: r.token } });
  }
  return { token: r.token };
}

/** Si hay opciones nuevas esperando elección, las devuelve. */
export const opcionesNuevasPendientes = (brief) => (brief?.marca?.propuestas_nuevas?.estado === 'mostradas' ? brief.marca.propuestas_nuevas : null);

/**
 * Pasa la ronda nueva a ser la propuesta del sitio con la letra elegida. Devuelve el brief anterior (para deshacer).
 */
export async function adoptarOpcionNueva(e, letra) {
  const actual = await db.obtener(e.id);
  const nuevas = opcionesNuevasPendientes(actual.brief);
  if (!nuevas || !nuevas.opciones.some((o) => o.letra === letra)) return null;
  const prev = actual.brief.marca.propuestas || {};
  const { ajustes_marca: ajustes = {}, ...resto } = nuevas;
  const marca = {
    ...actual.brief.marca, ...ajustes,
    propuestas: { ...resto, estado: 'elegida', elegido: letra, colores_de: null, anteriores: [...(prev.anteriores || []), { token: prev.token, ronda: prev.ronda || 0, elegido: prev.elegido, opciones: prev.opciones }].slice(-5), usados: [...(prev.usados || []), nuevas.token] },
    propuestas_nuevas: null,
  };
  await db.guardar(e.id, { brief: { ...actual.brief, marca } });
  return actual.brief;
}

export async function restaurarBrief(e, briefAnterior) {
  if (briefAnterior) await db.guardar(e.id, { brief: briefAnterior });
}
