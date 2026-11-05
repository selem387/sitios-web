// Mensajes que Ari manda sin que el cliente escriba (pago recibido, dominio registrado, página conectada).
// Se guardan como mensaje del agente + fila en `avisos` (el chat web los recoge con /chat/v1/avisos)
// y, si la entrevista tiene callback_url (WhatsApp), se envían como evento "aviso".
import * as db from './db.js';
import { sendMail } from '../mail.js';

export async function avisar(entrevistaId, textos, { evento = 'aviso', datos = {} } = {}) {
  const e = await db.obtener(entrevistaId);
  if (!e) return;
  const lista = (Array.isArray(textos) ? textos : [textos]).filter(Boolean);
  for (const t of lista) {
    await db.insertarMensaje(e.id, { rol: 'agente', contenido: t, bloque: e.bloque_actual });
    await db.q('INSERT INTO avisos (entrevista_id, usuario_id, texto, evento) VALUES ($1,$2,$3,$4)', [e.id, e.usuario_id, t, evento]);
  }
  await db.evento(e.id, evento, { ...datos, mensajes: lista.length });
  if (!e.callback_url) return;
  const payload = { evento: 'aviso', tipo: evento, sesion_id: e.id, usuario_id: e.usuario_id, canal: e.canal, mensajes: lista, datos, metadata: e.metadata };
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(e.callback_url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      if (r.ok) return;
    } catch { /* reintenta */ }
    await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
  }
  await db.evento(e.id, 'callback_fallo', { evento });
}

/** Avisos aún no entregados al chat web de un usuario; los marca como entregados. */
export async function pendientesChat(usuarioId) {
  const r = await db.q(`UPDATE avisos SET entregado=now() WHERE id IN (
      SELECT id FROM avisos WHERE usuario_id=$1 AND entregado IS NULL ORDER BY id LIMIT 20)
    RETURNING id, texto, evento, creado`, [usuarioId]);
  return r.rows.sort((a, b) => a.id - b.id);
}

/** Aviso interno para el equipo (traspasos, compras que requieren revisión). */
export async function avisarEquipo(asunto, texto, entrevistaId = null) {
  if (entrevistaId) await db.evento(entrevistaId, 'aviso_equipo', { asunto, texto: texto.slice(0, 1000) }).catch(() => {});
  const para = process.env.AVISOS_EQUIPO_EMAIL;
  if (!para) { console.warn(`[aviso equipo] ${asunto}: ${texto}`); return; }
  await sendMail(null, { to: para, subject: `[Sitios web] ${asunto}`, text: texto, from_name: 'Ari · sitios-web' }).catch((err) => console.error('aviso equipo', err.message));
}
