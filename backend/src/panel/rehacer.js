// Rehacer como sitio en vivo (plataforma "app") una entrevista que se construyó en WordPress.
//   1) Reinterpreta todo su historial y deja el brief al día (texto del cliente tal cual).
//   2) Retira los sitios WordPress de esa entrevista (quedan como 'reemplazado').
//   3) Con propuesta elegida → crea el sitio en vivo. Sin propuesta → genera las 6 y (si se pide) se las manda por su chat;
//      al elegir, alElegir() crea el sitio y le manda la liga.
import * as db from '../entrevista/db.js';
import { avisar } from '../entrevista/avisos.js';
import { mostrar } from '../entrevista/propuestas.js';
import { procesarMateriales } from '../generador/materiales.js';
import { crearSitioVivo, disenoElegido, porEntrevista, invalidar } from './sitios.js';
import { reinterpretarHistorial, briefReinterpretado } from './reinterpretar.js';
import { urlSitio } from './cambios_vivo.js';
import { asignarDominio } from '../generador/dominios.js';

const q = db.q;

/** Crea el sitio en vivo y le pone encima lo que el cliente dictó (portada / historia). */
async function crearConDictado(e) {
  const sv = await crearSitioVivo(e);
  const dictado = e.brief?.reinterpretacion?.dictado || {};
  if (Object.keys(dictado).length) {
    const r = await q(`UPDATE sitios_vivos SET contenido = contenido || $2::jsonb, version=version+1, actualizado=now() WHERE id=$1 RETURNING *`, [sv.id, JSON.stringify(dictado)]);
    invalidar(sv.id);
    return r.rows[0];
  }
  return sv;
}

export async function rehacerComoApp(entrevistaId, { enviar = false, reinterpretar = true } = {}) {
  let e = await db.obtener(entrevistaId);
  if (!e) throw Object.assign(new Error('no existe'), { status: 404 });
  const resultado = { entrevista: e.id, negocio: e.brief?.negocio?.nombre || e.nombre };

  if (reinterpretar) {
    const r = await reinterpretarHistorial(e);
    if (r.errores.length) resultado.avisos = r.errores;
    const { brief } = briefReinterpretado(e.brief || {}, r.data);
    await db.evento(e.id, 'brief_reinterpretado', { antes: e.brief, notas: r.data.notas || [], errores: r.errores, mensajes: r.mensajes });
    // Las fotos del cliente nunca se quitan al reinterpretar: quitar una foto solo pasa por un pedido explícito (cambios).
    e.brief = brief;
    resultado.notas = r.data.notas || [];
  }
  e.brief = {
    ...e.brief,
    plataforma: { plataforma: 'app', razon: 'Rehecho como sitio en vivo (WordPress suspendido).', senales: [], modulos_dinamicos: [] },
    administracion: { ...(e.brief.administracion || {}), panel: 'panel_propio' },
  };
  await db.guardar(e.id, { brief: e.brief });
  const ret = await q(`UPDATE sitios SET estado='reemplazado', actualizado=now() WHERE entrevista_id=$1 AND estado<>'reemplazado' RETURNING id`, [e.id]);
  resultado.wp_retirados = ret.rows.map((x) => x.id);

  if (disenoElegido(e.brief)) {
    const sv = await crearConDictado(e);
    Object.assign(resultado, { estado: 'vivo', sitio_vivo_id: sv.id, url: urlSitio(sv) });
    if (enviar) await avisar(e.id, [`¡Rehice tu página! 🙌 Quedó así: ${urlSitio(sv)}`, 'Ábrela en tu celular y recórrela completa. Si quieres cambiar algo, dímelo aquí y lo ajusto.'], { evento: 'sitio_rehecho' });
    return resultado;
  }

  // Sin propuesta elegida: se generan las 6 con el brief ya reinterpretado.
  const mat = await procesarMateriales(e.id, e.brief, { aceptarLoQueHay: true });
  const fotos = { ...(e.brief.fotos || {}), acepta_lo_que_hay: true };
  const m = await mostrar(e, { ...e.brief, fotos }, mat);
  e.brief = { ...e.brief, fotos, marca: { ...(e.brief.marca || {}), propuestas: m.propuestas } };
  await db.guardar(e.id, { brief: e.brief });
  Object.assign(resultado, { estado: 'propuestas_mostradas', opciones: m.propuestas.opciones.map((o) => ({ letra: o.letra, nombre: o.nombre, url: o.url })) });
  if (enviar) {
    await avisar(e.id, ['¡Hola! 👋 Mejoramos la forma en que armamos tu página y antes de terminarla quiero que elijas su diseño.', ...m.salida.textos], { evento: 'propuestas_rehechas' });
    resultado.enviadas = true;
  }
  return resultado;
}

/** Registra la elección (fuera del chat) y crea el sitio en vivo. */
export async function elegirYCrear(entrevistaId, { elegido, colores_de = null }) {
  const e = await db.obtener(entrevistaId);
  const p = e?.brief?.marca?.propuestas;
  const op = p?.opciones?.find((o) => o.etiqueta === elegido);
  if (!op) throw Object.assign(new Error('opción inválida'), { status: 400 });
  e.brief = { ...e.brief, marca: { ...e.brief.marca, estilo: op.estilo, propuestas: { ...p, estado: 'elegida', elegido, colores_de, comentario: '(elegida por el equipo)' } } };
  await db.guardar(e.id, { brief: e.brief });
  const sv = await crearConDictado(e);
  return { sitio_vivo_id: sv.id, url: urlSitio(sv) };
}

/** El cliente eligió por chat con la entrevista ya cerrada: se crea el sitio y se le manda la liga. */
export async function alElegir(entrevistaId) {
  const e = await db.obtener(entrevistaId);
  if (!disenoElegido(e?.brief)) return [];
  if (await porEntrevista(e.id)) return [];
  let sv = await crearConDictado(e);
  await db.evento(e.id, 'sitio_vivo_por_eleccion', { sitio_vivo_id: sv.id });
  // Si su dominio ya mostraba el selector de 6 propuestas, ahora muestra su sitio en vivo; el cron entrega el panel.
  const dom = (await db.q(`SELECT dominio FROM dominios_cliente WHERE entrevista_id=$1 AND modo='propuestas' ORDER BY actualizado DESC LIMIT 1`, [e.id]).catch(() => ({ rows: [] }))).rows[0]?.dominio;
  if (dom) {
    sv = (await db.q(`UPDATE sitios_vivos SET dominio=$2, actualizado=now() WHERE id=$1 RETURNING *`, [sv.id, dom])).rows[0];
    await asignarDominio({ dominio: dom, entrevista_id: e.id, modo: 'vivo', datos: { nombre: e.brief?.negocio?.nombre, sitio_vivo_id: sv.id } });
    await db.evento(e.id, 'dominio_a_sitio_vivo', { dominio: dom, sitio_vivo_id: sv.id });
  }
  return [`Tu página ya quedó 🎉: ${urlSitio(sv)}`, 'Ábrela desde tu celular y dime qué quieres ajustar; los cambios los aplico aquí mismo.'];
}
