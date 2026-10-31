// Rutas y cron de la entrevista web. Contrato idéntico al servicio entrevista de creador_video:
//   POST /v1/mensajes            {usuario_id, texto?, media?[{url,tipo,mime,caption}], canal?, callback_url?, metadata?}
//   GET  /v1/sesiones/:id        (?historial=1 para incluir mensajes)
//   POST /v1/sesiones/:id/cancelar
//   GET  /v1/usuarios/ultima?usuario_id=...
// Todo bajo el prefijo /entrevista y con header X-API-Key = ENTREVISTA_API_KEY.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../util.js';
import * as db from './db.js';
import { procesarMensaje, enSerie, notificar } from './agente.js';
import { actualizarMemoria, mensajeRecordatorio } from './memoria.js';
import { TOTAL_BLOQUES } from './prompts.js';
import { MODELO_ARI, MODELO_MEMORIA } from './claude.js';

const igual = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return y.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); };

export function registerEntrevistaRoutes(app, wrap) {
  const auth = (c) => { if (!igual(c.req.header('x-api-key'), config.entrevistaApiKey)) throw new HttpError(401, 'X-API-Key inválida'); };

  app.get('/entrevista/health', (c) => c.json({ ok: true, modelo: MODELO_ARI, modelo_memoria: MODELO_MEMORIA }));

  app.post('/entrevista/v1/mensajes', wrap(async (c) => {
    auth(c);
    const b = await c.req.json().catch(() => { throw new HttpError(400, 'JSON inválido'); });
    return enSerie(String(b.usuario_id || ''), () => procesarMensaje(b));
  }));

  app.get('/entrevista/v1/sesiones/:id', wrap(async (c) => {
    auth(c);
    const e = await db.obtener(c.req.param('id'));
    if (!e) throw new HttpError(404, 'no existe');
    const out = { ...e };
    if (c.req.query('historial')) out.mensajes = await db.mensajesDesde(e.id, 0);
    out.assets = await db.assetsDe(e.id);
    return out;
  }));

  app.post('/entrevista/v1/sesiones/:id/cancelar', wrap(async (c) => {
    auth(c);
    await db.guardar(c.req.param('id'), { estado: 'cancelada' });
    return { ok: true };
  }));

  app.post('/entrevista/v1/sesiones/:id/memoria', wrap(async (c) => {
    auth(c);
    const m = await actualizarMemoria(c.req.param('id'), 'manual');
    return { ok: true, memoria: m };
  }));

  app.get('/entrevista/v1/usuarios/ultima', wrap(async (c) => {
    auth(c);
    const e = await db.ultima(String(c.req.query('usuario_id') || ''));
    if (!e) throw new HttpError(404, 'sin entrevistas');
    return { sesion_id: e.id, estado: e.estado, bloque: e.bloque_actual, actualizado: e.actualizado };
  }));
}

// Cada hora: memoria de entrevistas en pausa, recordatorios a las 24 h (máximo 2) y pausa definitiva a los 7 días.
async function cron() {
  const ahora = Date.now();
  const filas = await db.entrevistasParaCron().catch((err) => { console.error('cron entrevista', err); return []; });
  for (const e of filas) {
    const inactivo = ahora - new Date(e.ultimo_contacto).getTime();
    try {
      if (inactivo > 2 * 3600e3 && e.sin_resumir > 0 && !e.memoria_en_curso) await actualizarMemoria(e.id, 'pausa');
      if (e.estado === 'en_curso' && inactivo > 7 * 864e5) {
        await db.guardar(e.id, { estado: 'pausada' });
        await db.evento(e.id, 'pausada_7d');
        continue;
      }
      if (e.estado === 'en_curso' && inactivo > 24 * 3600e3 && e.recordatorios_enviados < 2) {
        const actual = await db.obtener(e.id);
        // Un recordatorio por cada 24 h de silencio, no más de 2.
        if (inactivo < (e.recordatorios_enviados + 1) * 24 * 3600e3) continue;
        const texto = mensajeRecordatorio(actual, TOTAL_BLOQUES);
        await db.guardar(e.id, { recordatorios_enviados: e.recordatorios_enviados + 1 });
        await db.insertarMensaje(e.id, { rol: 'agente', contenido: texto, bloque: e.bloque_actual });
        await notificar(e, { evento: 'recordatorio', sesion_id: e.id, usuario_id: e.usuario_id, canal: e.canal, mensajes: [texto], metadata: e.metadata });
      }
    } catch (err) {
      console.error('cron entrevista', e.id, err);
    }
  }
}

export async function initEntrevista() {
  await db.migrar();
  setInterval(() => cron().catch((err) => console.error(err)), 3600e3).unref();
}
