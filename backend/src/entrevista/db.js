// Acceso a la base `web_builder`: entrevistas, mensajes, assets, memoria y eventos.
import { ensureDatabase, poolFor } from '../db.js';
import { config } from '../config.js';
import { SCHEMA } from './schema.js';

export const DB = config.entrevistaDb;
const pool = () => poolFor(DB);
export const q = (sql, params = []) => pool().query(sql, params);

export async function migrar() {
  await ensureDatabase(DB);
  await pool().query(SCHEMA);
}

// ---- entrevistas ----
export async function activa(usuarioId) {
  const r = await q(`SELECT * FROM entrevistas WHERE usuario_id=$1 AND estado IN ('en_curso','pausada') LIMIT 1`, [usuarioId]);
  return r.rows[0] || null;
}

export async function ultima(usuarioId) {
  const r = await q(`SELECT * FROM entrevistas WHERE usuario_id=$1 ORDER BY creado DESC LIMIT 1`, [usuarioId]);
  return r.rows[0] || null;
}

export async function obtener(id) {
  const r = await q(`SELECT * FROM entrevistas WHERE id=$1`, [id]);
  return r.rows[0] || null;
}

export async function crear({ id, usuario_id, canal, callback_url, metadata }) {
  const r = await q(
    `INSERT INTO entrevistas (id, usuario_id, canal, callback_url, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [id, usuario_id, canal || null, callback_url || null, metadata || {}],
  );
  return r.rows[0];
}

const COLS = new Set(['canal', 'callback_url', 'metadata', 'nombre', 'estado', 'bloque_actual', 'arquetipo_slug', 'brief', 'pendientes_bloque',
  'memoria', 'memoria_msg_id', 'memoria_version', 'memoria_en_curso', 'recordatorios_enviados', 'ultimo_contacto']);

export async function guardar(id, cambios) {
  const sets = [];
  const vals = [id];
  for (const [k, v] of Object.entries(cambios)) {
    if (!COLS.has(k) || v === undefined) continue;
    vals.push(v && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);
    sets.push(`${k}=$${vals.length}`);
  }
  if (!sets.length) return;
  sets.push('actualizado=now()');
  await q(`UPDATE entrevistas SET ${sets.join(', ')} WHERE id=$1`, vals);
}

// ---- mensajes ----
export async function insertarMensaje(entrevistaId, { rol, tipo = 'texto', contenido, transcripcion, bloque }) {
  const r = await q(
    `INSERT INTO mensajes (entrevista_id, rol, tipo, contenido, transcripcion, bloque) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [entrevistaId, rol, tipo, contenido || null, transcripcion || null, bloque || null],
  );
  if (rol === 'cliente') {
    await q(`UPDATE entrevistas SET mensajes_cliente=mensajes_cliente+1, ultimo_contacto=now(), actualizado=now() WHERE id=$1`, [entrevistaId]);
  }
  return r.rows[0].id;
}

export async function ultimosMensajes(entrevistaId, n = 8) {
  const r = await q(`SELECT * FROM (SELECT * FROM mensajes WHERE entrevista_id=$1 ORDER BY id DESC LIMIT $2) t ORDER BY id`, [entrevistaId, n]);
  return r.rows;
}

export async function mensajesDesde(entrevistaId, desdeId) {
  const r = await q(`SELECT * FROM mensajes WHERE entrevista_id=$1 AND id>$2 ORDER BY id`, [entrevistaId, desdeId]);
  return r.rows;
}

export async function clientesSinResumir(entrevistaId, desdeId) {
  const r = await q(`SELECT count(*)::int AS n FROM mensajes WHERE entrevista_id=$1 AND id>$2 AND rol='cliente'`, [entrevistaId, desdeId]);
  return r.rows[0].n;
}

// ---- assets ----
export async function insertarAsset(entrevistaId, a) {
  const r = await q(
    `INSERT INTO assets (entrevista_id, mensaje_id, clave, tipo, url, mime, nota, descripcion_ia, calidad, usar)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [entrevistaId, a.mensaje_id || null, a.clave, a.tipo || 'foto_otro', a.url, a.mime || null, a.nota || null, a.descripcion_ia || null, a.calidad || null, a.usar !== false],
  );
  return r.rows[0];
}

export async function assetsDe(entrevistaId) {
  const r = await q(`SELECT * FROM assets WHERE entrevista_id=$1 ORDER BY id`, [entrevistaId]);
  return r.rows;
}

export async function actualizarAssets(entrevistaId, cambios) {
  for (const c of cambios) {
    await q(`UPDATE assets SET tipo=COALESCE($3,tipo), usar=COALESCE($4,usar), nota=COALESCE($5,nota) WHERE entrevista_id=$1 AND clave=$2`,
      [entrevistaId, c.clave, c.tipo || null, typeof c.usar === 'boolean' ? c.usar : null, c.nota || null]);
  }
}

// ---- memoria ----
export async function logMemoria(entrevistaId, r) {
  await q(
    `INSERT INTO memoria_log (entrevista_id, version, memoria, msg_desde, msg_hasta, disparador, modelo, tokens_in, tokens_out, duracion_ms, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [entrevistaId, r.version, JSON.stringify(r.memoria || {}), r.msg_desde, r.msg_hasta, r.disparador, r.modelo, r.tokens_in, r.tokens_out, r.duracion_ms, r.error || null],
  );
}

// ---- eventos ----
export async function evento(entrevistaId, tipo, datos = {}) {
  await q(`INSERT INTO eventos (entrevista_id, tipo, datos) VALUES ($1,$2,$3)`, [entrevistaId, tipo, JSON.stringify(datos)]).catch(() => {});
}

// ---- arquetipos ----
export async function arquetipos() {
  const r = await q(`SELECT slug, nombre, cta_default, diseno->'subtipos' AS subtipos FROM arquetipos WHERE activo ORDER BY id`);
  return r.rows;
}

// ---- cron ----
export async function entrevistasParaCron() {
  const r = await q(`
    SELECT e.id, e.usuario_id, e.canal, e.callback_url, e.metadata, e.estado, e.bloque_actual, e.memoria, e.memoria_msg_id,
           e.recordatorios_enviados, e.ultimo_contacto, e.memoria_en_curso,
           (SELECT count(*)::int FROM mensajes m WHERE m.entrevista_id=e.id AND m.id>e.memoria_msg_id) AS sin_resumir
    FROM entrevistas e
    WHERE e.estado IN ('en_curso','pausada')`);
  return r.rows;
}
