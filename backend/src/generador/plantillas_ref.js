// Plantillas desde páginas de referencia (decisiones 5–8 del 18-nov-2026; doc claude/pagina-referencia-plantilla.md).
// Cada reconstrucción automática se guarda como CANDIDATA (su plano, el giro y una página de muestra). A Sebastián le
// llega un Telegram con la liga y botones Aprobar / Descartar (bot @websites_timewins_bot). Una plantilla aprobada entra
// al final de la lista de su giro, como respaldo; Sebastián la sube cuando quiera (en giros/<giro>.js, como "ref:<id>").
import * as db from '../entrevista/db.js';

let listo = null;
const migrar = () => (listo ||= db.q(`CREATE TABLE IF NOT EXISTS plantillas_referencia (
  id serial PRIMARY KEY,
  giro text NOT NULL,
  subtipo text,
  plano jsonb NOT NULL,
  url_origen text,
  url_muestra text,
  entrevista_id text,
  parecido int,
  estado text NOT NULL DEFAULT 'candidata',
  creada timestamptz NOT NULL DEFAULT now(),
  decidida timestamptz
)`).catch((err) => { listo = null; throw err; }));

// ---------------- caché de aprobadas (la lee renderPropuestas sin esperar a la base) ----------------
let cache = { t: 0, filas: [] };
export async function refrescarAprobadas({ forzar = false } = {}) {
  if (!forzar && Date.now() - cache.t < 60000) return cache.filas;
  try {
    await migrar();
    const { rows } = await db.q("SELECT id, giro, subtipo, plano FROM plantillas_referencia WHERE estado='aprobada' ORDER BY decidida, id");
    cache = { t: Date.now(), filas: rows };
  } catch { cache = { t: Date.now(), filas: cache.filas }; }
  return cache.filas;
}
/** Plantillas aprobadas de un giro (de la última lectura). */
export const aprobadasDe = (giro) => cache.filas.filter((r) => r.giro === giro);
/** Para pruebas. */
export const _fijarCache = (filas) => { cache = { t: Date.now(), filas }; };

/**
 * Lista del giro con una plantilla de referencia: entra como "S" en el lugar que Sebastián le dio ("ref:<id>") o al
 * final (respaldo). Solo una por propuesta (la S es una sola página). → {lista, plantilla}
 */
export function listaConPlantillas(lista = [], giro, aprobadas = aprobadasDe(giro)) {
  const ids = new Set(aprobadas.map((r) => `ref:${r.id}`));
  const pos = lista.findIndex((x) => ids.has(x));
  const plantilla = pos >= 0 ? aprobadas.find((r) => `ref:${r.id}` === lista[pos]) : aprobadas[0] || null;
  const limpia = lista.filter((x, k) => !/^ref:\d+$/.test(x) || k === pos);
  if (!plantilla) return { lista: limpia.filter((x) => !/^ref:\d+$/.test(x)), plantilla: null };
  return { lista: pos >= 0 ? limpia.map((x) => (/^ref:\d+$/.test(x) ? 'S' : x)) : [...limpia, 'S'], plantilla };
}

// ---------------- Telegram ----------------
const TG = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
export const telegramActivo = () => !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

async function tg(metodo, cuerpo) {
  const r = await fetch(`${TG()}/${metodo}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${metodo}: ${j.description || r.status}`);
  return j.result;
}

/** Guarda una candidata y avisa a Sebastián. Nunca lanza (el cliente no debe esperar por esto). */
export async function guardarCandidata({ giro, subtipo, plano, urlOrigen, urlMuestra, entrevistaId, parecido, negocio }) {
  try {
    await migrar();
    const { rows } = await db.q('INSERT INTO plantillas_referencia (giro, subtipo, plano, url_origen, url_muestra, entrevista_id, parecido) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [giro || 'generico', subtipo || null, plano, urlOrigen || null, urlMuestra || null, entrevistaId || null, parecido ?? null]);
    const id = rows[0].id;
    if (telegramActivo()) {
      const texto = `Plantilla candidata #${id} · giro ${giro || 'genérico'}${subtipo ? ` (${subtipo})` : ''}\nReconstruida para ${negocio || 'un cliente'} (parecido ${parecido ?? '?'}/5).\nPágina: ${urlMuestra || '—'}\nReferencia: ${urlOrigen || '—'}\n\nSi la apruebas, entra al final de la lista del giro como respaldo.`;
      await tg('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: texto, disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: 'Aprobar', callback_data: `ref:aprobar:${id}` }, { text: 'Descartar', callback_data: `ref:descartar:${id}` }]] } });
    }
    return id;
  } catch (err) {
    console.error('[plantillas_ref] candidata', err.message);
    return null;
  }
}

export async function decidir(id, aprobar) {
  await migrar();
  const { rows } = await db.q("UPDATE plantillas_referencia SET estado=$2, decidida=now() WHERE id=$1 AND estado='candidata' RETURNING id, giro, estado", [id, aprobar ? 'aprobada' : 'descartada']);
  if (rows.length) await refrescarAprobadas({ forzar: true });
  return rows[0] || null;
}

/** Webhook del bot: solo acepta botones del chat de Sebastián y con el secreto del webhook. */
export async function atenderTelegram(update, secreto) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secreto !== process.env.TELEGRAM_WEBHOOK_SECRET) return { ok: false, motivo: 'secreto' };
  const cb = update?.callback_query;
  if (!cb) return { ok: true };
  if (String(cb.message?.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID)) return { ok: false, motivo: 'chat' };
  const m = /^ref:(aprobar|descartar):(\d+)$/.exec(cb.data || '');
  if (!m) return { ok: true };
  const r = await decidir(Number(m[2]), m[1] === 'aprobar');
  const aviso = !r ? `La plantilla #${m[2]} ya estaba decidida.` : r.estado === 'aprobada' ? `Aprobada: la plantilla #${r.id} entra al final de la lista de ${r.giro}.` : `Descartada: la plantilla #${r.id} no se usará.`;
  await tg('answerCallbackQuery', { callback_query_id: cb.id, text: aviso }).catch(() => {});
  await tg('editMessageReplyMarkup', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
  await tg('sendMessage', { chat_id: cb.message.chat.id, text: aviso, reply_to_message_id: cb.message.message_id }).catch(() => {});
  return { ok: true, decision: r };
}

/** Configura el webhook del bot (se llama al arrancar si hay token, secreto y URL pública). */
export async function configurarWebhook(urlPublica) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET || !/^https:/.test(urlPublica || '')) return false;
  await tg('setWebhook', { url: `${urlPublica}/telegram/webhook`, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['callback_query'] }).catch((err) => console.error('[telegram] webhook', err.message));
  return true;
}
