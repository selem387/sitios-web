// Cambios que pide el cliente por chat sobre su sitio en vivo (plataforma "app"): se aplican solos sobre el
// contenido estructurado (sitios_vivos.contenido), sin aviso al equipo. Gemelo de entrevista/cambios.js (WordPress).
//   1) Claude recibe el contenido actual por sección + el pedido + la conversación y devuelve secciones completas nuevas.
//   2) Se valida: forma (limpiarSeccion), texto del cliente letra por letra y nada inventado.
//   3) Se respalda lo que se toca, se aplica, se verifica que la página se arme; si falla se restaura.
//   4) Ari avisa con la liga. Si no se puede, se lo dice al cliente y le pide explicarlo de otra forma.
import * as db from '../entrevista/db.js';
import { pedirJSON } from '../entrevista/claude.js';
import { avisar } from '../entrevista/avisos.js';
import { procesarMateriales } from '../generador/materiales.js';
import { config } from '../config.js';
import { SECCIONES, limpiarSeccion, contenidoActual, disenoElegido, renderSitio, invalidar, porId } from './sitios.js';
import { textosInventados } from './reinterpretar.js';

const q = db.q;
const NO_PUDE = 'No pude aplicar ese cambio a tu página 😔 ¿Me lo explicas de otra forma? Por ejemplo, dime en qué parte de la página está y cómo quieres que quede.';

export const urlSitio = (sv) => (sv.dominio ? `https://${sv.dominio}/` : `${config.publicUrl}/s/${sv.slug}`);

const COLORES = ['bg', 'fg', 'p', 'primary', 'accent', 'mut', 'card', 'bor', 'soft', 'banda', 'on'];
// Se arma al usarse: sitios.js y este módulo se importan en ciclo (vía agente.js).
const esquema = () => ({
  type: 'object',
  properties: {
    accion: { type: 'string', enum: ['editar', 'preguntar', 'revertir', 'no_se_puede'] },
    pregunta: { type: 'string', description: 'Si accion=preguntar: una sola pregunta clara, sin tecnicismos.' },
    secciones: { type: 'object', description: `Solo las secciones que cambian, cada una COMPLETA como debe quedar. Claves posibles: ${SECCIONES.join(', ')}.` },
    paleta: { type: 'object', description: 'Solo si pide cambiar colores: claves de la paleta actual que cambian, con su hex nuevo.' },
    portada_foto: { type: 'string', description: 'Clave de la foto que debe abrir la página, si lo pide.' },
    fotos_quitar: { type: 'array', items: { type: 'string' }, description: 'Claves de fotos que pide quitar de la página.' },
    fotos_poner: { type: 'array', items: { type: 'string' }, description: 'Claves de fotos (quitadas antes o recién mandadas) que pide poner.' },
    no_pude: { type: 'array', items: { type: 'string' }, description: 'Partes del pedido que no se pueden hacer con estas herramientas, en palabras del cliente.' },
    resumen_cliente: { type: 'string', description: 'Qué cambiaste, 1–2 frases simples en primera persona ("Cambié…").' },
  },
  required: ['accion', 'resumen_cliente'],
});

const SISTEMA = `Eres el editor de la página web del cliente de Ari. La página se arma sola a partir de SECCIONES (datos estructurados) con un diseño ya elegido.
Aplicas EXACTAMENTE lo que el cliente pide cambiando esas secciones. Todo lo demás queda idéntico.

REGLA NÚMERO UNO: EL TEXTO DEL CLIENTE NO SE TOCA
- Todo lo que el cliente escribió para su página va EXACTAMENTE como lo escribió, letra por letra: títulos, descripciones, viñetas, precios, emojis, signos, mayúsculas, orden. No corriges, no resumes, no reordenas, no agregas emojis.
- Paquetes/servicios (sección "oferta"): cada elemento {grupo, nombre, descripcion_corta, precio_o_rango, destacado}. Un "## Título" del chat es la categoría (grupo, sin "## "). "*Paquete #1 — $1,200 MXN*" → nombre "Paquete #1", precio "$1,200 MXN". La descripción y sus viñetas van en descripcion_corta, un renglón cada una, conservando el "- " de las viñetas.
- Si manda una lista nueva completa, reemplaza la anterior con TODOS sus elementos en su orden. Si agrega o corrige uno, conserva los demás tal cual.
- Si una frase no viene del cliente, se queda como ya estaba. No redactes textos nuevos ni inventes precios, horarios, teléfonos o cifras.

QUÉ PUEDES HACER
- Cambiar cualquier sección (devuélvela completa con el mismo formato que tiene en CONTENIDO ACTUAL).
- Colores: "paleta" con las claves de PALETA ACTUAL que cambian (hex). Cuida que el texto se lea (claro sobre oscuro o al revés).
- Fotos: portada_foto, fotos_quitar, fotos_poner, usando SOLO claves de FOTOS. Las fotos que manda el cliente se usan; ninguna se repite ni se deforma (el diseño ya lo cuida).
- Si pide dejarlo como estaba antes del último cambio: accion=revertir.
- Si no se entiende qué o dónde: accion=preguntar con UNA pregunta concreta.
- Lo que no se puede (cambiar la letra o el acomodo/diseño de una sección, agregar páginas nuevas): va en no_pude; si nada se puede, accion=no_se_puede.
- resumen_cliente: simple y cálido, sin tecnicismos.`;

async function guardar(id, cambios) {
  const cols = Object.keys(cambios);
  const vals = cols.map((k) => (cambios[k] !== null && typeof cambios[k] === 'object' ? JSON.stringify(cambios[k]) : cambios[k]));
  await q(`UPDATE cambios_sitio SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(', ')}, actualizado=now() WHERE id=$1`, [id, ...vals]);
}
async function noPude(c, e, resultado) {
  await guardar(c.id, { estado: 'preguntar', plan: { ...(c.plan || {}), pregunta: NO_PUDE }, resultado });
  return avisar(e.id, NO_PUDE, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

async function conversacion(e, sv) {
  const r = await q(`SELECT rol, contenido, transcripcion FROM mensajes WHERE entrevista_id=$1 AND creado > $2 AND rol IN ('cliente','agente') ORDER BY id DESC LIMIT 40`, [e.id, sv.creado]);
  const filas = r.rows.reverse();
  return {
    texto: filas.map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${(m.transcripcion || m.contenido || '').slice(0, 12000)}`).join('\n'),
    cliente: filas.filter((m) => m.rol === 'cliente').map((m) => m.transcripcion || m.contenido || '').join('\n'),
  };
}

/** Lo que hoy tiene el sitio: secciones, paleta y fotos. */
async function estadoActual(e, sv) {
  const mat = await procesarMateriales(e.id, e.brief || {}, { aceptarLoQueHay: true }).catch(() => null);
  const contenido = contenidoActual(e, sv, mat);
  delete contenido.es_menu;
  const paleta = { ...(disenoElegido(e.brief)?.paleta || {}), ...(sv.contenido?.diseno?.paleta || {}) };
  const fotos = (await db.assetsDe(e.id)).filter((a) => a.url && (/^foto_|logo|imagen/.test(a.tipo) || /^image\//.test(a.mime || '')));
  return { contenido, paleta, fotos };
}

async function planear(e, act, pedidos, conv, errores) {
  const partes = [
    `NEGOCIO: ${e.brief?.negocio?.nombre || ''}`,
    `PEDIDO DEL CLIENTE (en orden):\n${pedidos.map((p, i) => `${i + 1}. ${p.texto || '(sin texto)'}${p.media?.length ? ` [mandó foto(s): ${p.media.join(', ')}]` : ''}`).join('\n')}`,
    `CONVERSACIÓN DESDE QUE TIENE SU PÁGINA (aplica también lo que pidió antes y no esté ya en el contenido):\n${conv.texto || '(nada)'}`,
    `CONTENIDO ACTUAL (secciones):\n${JSON.stringify(act.contenido, null, 1)}`,
    `PALETA ACTUAL: ${JSON.stringify(act.paleta)}`,
    `FOTOS (clave · tipo · en la página · descripción):\n${act.fotos.map((a) => `${a.clave} · ${a.tipo} · ${a.usar ? 'sí' : 'no'} · ${(a.descripcion_ia || a.nota || '').slice(0, 120)}`).join('\n') || '(ninguna)'}`,
  ];
  if (errores.length) partes.push(`TU INTENTO ANTERIOR FALLÓ, corrige esto:\n- ${errores.join('\n- ')}`);
  const r = await pedirJSON({ system: SISTEMA, contenido: partes.join('\n\n'), schema: esquema(), model: config.anthropicModel, max_tokens: 16000, timeoutMs: 420000 });
  return r.data;
}

/** Valida el plan y devuelve {secciones limpias, paleta, errores}. */
function validar(plan, act, fuentes) {
  const errores = [];
  const secciones = {};
  for (const [k, v] of Object.entries(plan.secciones || {})) {
    if (!SECCIONES.includes(k)) { errores.push(`Sección desconocida "${k}"`); continue; }
    try { secciones[k] = limpiarSeccion(k, v); } catch (err) { errores.push(`${k}: ${err.message}`); }
  }
  errores.push(...textosInventados(secciones, fuentes));
  const paleta = {};
  for (const [k, v] of Object.entries(plan.paleta || {})) {
    if (!(k in act.paleta) && !COLORES.includes(k)) errores.push(`Color "${k}" no existe en la paleta`);
    else if (!/^#[0-9a-f]{6}$/i.test(String(v))) errores.push(`Color "${k}" debe ser hex #RRGGBB`);
    else paleta[k] = v.toUpperCase();
  }
  const claves = new Set(act.fotos.map((a) => a.clave));
  for (const k of [plan.portada_foto, ...(plan.fotos_quitar || []), ...(plan.fotos_poner || [])].filter(Boolean)) if (!claves.has(k)) errores.push(`La foto "${k}" no existe`);
  return { secciones, paleta, errores };
}

/** Escribe el contenido y las fotos; devuelve el sitio actualizado. */
async function escribir(sv, e, { secciones = {}, quitar = [], diseno, fotos, usar = {} }) {
  const k = { ...(sv.contenido || {}) };
  for (const [s, v] of Object.entries(secciones)) { if (v === null) delete k[s]; else k[s] = v; }
  if (diseno !== undefined) { if (diseno === null) delete k.diseno; else k.diseno = diseno; }
  if (fotos !== undefined) { if (fotos === null) delete k.fotos; else k.fotos = fotos; }
  for (const s of quitar) delete k[s];
  for (const [clave, u] of Object.entries(usar)) await db.actualizarAssets(e.id, [{ clave, usar: u }]);
  const r = await q(`UPDATE sitios_vivos SET contenido=$2::jsonb, version=version+1, actualizado=now() WHERE id=$1 RETURNING *`, [sv.id, JSON.stringify(k)]);
  invalidar(sv.id);
  return r.rows[0];
}

async function revertir(c, e, sv) {
  const ult = (await q(`SELECT * FROM cambios_sitio WHERE entrevista_id=$1 AND estado='aplicado' AND respaldo ? 'vivo' AND id<>$2 ORDER BY id DESC LIMIT 1`, [e.id, c.id])).rows[0];
  if (!ult) {
    await guardar(c.id, { estado: 'aplicado', resultado: { revertir: 'sin cambios previos' } });
    return avisar(e.id, 'Todavía no he hecho cambios a tu página, así que sigue como la viste la primera vez. ¿Qué te gustaría ajustar?', { evento: 'cambios_sitio' });
  }
  const rs = ult.respaldo.vivo;
  await escribir(sv, e, { secciones: rs.secciones, diseno: rs.diseno, fotos: rs.fotos, usar: rs.usar });
  await guardar(ult.id, { estado: 'revertido' });
  await guardar(c.id, { estado: 'aplicado', resultado: { revertido: ult.id } });
  return avisar(e.id, `Listo, dejé tu página como estaba antes del último cambio ✅: ${urlSitio(sv)}\nSi no lo ves, recarga la página. ¿Quieres ajustar algo más?`, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

export async function aplicarCambioVivo(c, e, sv) {
  await guardar(c.id, { sitio_id: sv.id });
  const act = await estadoActual(e, sv);
  const conv = await conversacion(e, sv);
  const fuentes = `${c.pedidos.map((p) => p.texto).join('\n')}\n${conv.cliente}\n${JSON.stringify(act.contenido)}`.replace(/\\n/g, '\n');
  let plan, v = { secciones: {}, paleta: {}, errores: [] }, errores = [];
  for (let i = 0; i < 3; i++) {
    plan = await planear(e, act, c.pedidos, conv, errores);
    if (plan.accion !== 'editar') break;
    v = validar(plan, act, fuentes);
    errores = v.errores;
    if (!errores.length) break;
  }
  await guardar(c.id, { plan });
  if (plan.accion === 'preguntar') {
    await guardar(c.id, { estado: 'preguntar' });
    return avisar(e.id, plan.pregunta || '¿Me dices un poco más de lo que quieres cambiar?', { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
  }
  if (plan.accion === 'revertir') return revertir(c, e, sv);
  const hay = plan.accion === 'editar' && (Object.keys(v.secciones).length || Object.keys(v.paleta).length || plan.portada_foto || plan.fotos_quitar?.length || plan.fotos_poner?.length);
  if (!hay || errores.length) return noPude(c, e, { errores, no_pude: plan.no_pude || [] });

  // Respaldo exacto de lo que se toca (para "déjalo como estaba" y para restaurar si falla).
  const k = sv.contenido || {};
  const usar = {};
  for (const cl of plan.fotos_quitar || []) usar[cl] = false;
  for (const cl of plan.fotos_poner || []) usar[cl] = true;
  const respaldo = {
    secciones: Object.fromEntries(Object.keys(v.secciones).map((s) => [s, k[s] ?? null])),
    diseno: Object.keys(v.paleta).length ? (k.diseno ?? null) : undefined,
    fotos: plan.portada_foto ? (k.fotos ?? null) : undefined,
    usar: Object.fromEntries(Object.keys(usar).map((cl) => [cl, act.fotos.find((a) => a.clave === cl)?.usar !== false])),
  };
  await guardar(c.id, { respaldo: { vivo: respaldo } });
  const nuevo = await escribir(sv, e, {
    secciones: v.secciones,
    diseno: Object.keys(v.paleta).length ? { ...(k.diseno || {}), paleta: { ...(k.diseno?.paleta || {}), ...v.paleta } } : undefined,
    fotos: plan.portada_foto ? { ...(k.fotos || {}), portada_asset_id: plan.portada_foto } : undefined,
    usar,
  });

  // Verificación: la página se arma con lo nuevo.
  try {
    const html = await renderSitio(await porId(nuevo.id), { previa: true });
    if (!html || html.length < 500) throw new Error('página vacía');
  } catch (err) {
    await escribir(nuevo, e, respaldo);
    console.error('[cambios vivo] restaurado', c.id, err);
    return noPude(c, e, { error: String(err.message || err).slice(0, 500) });
  }
  const pendientes = (plan.no_pude || []).filter(Boolean);
  await guardar(c.id, { estado: 'aplicado', resultado: { secciones: Object.keys(v.secciones), paleta: v.paleta, pendientes } });
  const extra = pendientes.length ? `\nLo de ${pendientes.join(', ')} no pude hacerlo; ¿me lo explicas de otra forma?` : '';
  return avisar(e.id, `${plan.resumen_cliente}\nYa quedó ✅: ${urlSitio(nuevo)}\nSi no ves el cambio, recarga la página.${extra}\n¿Hay algo más que quieras ajustar?`, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}
