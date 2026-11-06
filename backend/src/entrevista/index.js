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
import { cronEntregas, cronProgramados, entregarAcceso } from './entrega.js';
import { actualizarMemoria, mensajeRecordatorio } from './memoria.js';
import { TOTAL_BLOQUES } from './prompts.js';
import { MODELO_ARI, MODELO_MEMORIA } from './claude.js';
import { verificarWebhook } from '../dominio/stripe.js';
import { procesarEventoStripe, cronCompras, obtener as obtenerCompra } from '../dominio/compra.js';
import { cronDominiosPropios } from './dominio.js';
import { investigar } from '../dominio/registrador.js';
import { actualizarGuia, BASE as GUIAS } from '../dominio/guias.js';

const paginaPago = (titulo, texto) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>:root{--bg:#f6f4ef;--tx:#1c1b19;--mu:#5d5a54;--ac:#1f5c63}@media (prefers-color-scheme:dark){:root{--bg:#161615;--tx:#f1efe9;--mu:#b5b1a8;--ac:#6fc3c9}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--tx);font:17px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:30rem;padding:2rem 1.25rem}h1{font-size:1.5rem;line-height:1.2;margin:0 0 .75rem;color:var(--ac)}p{margin:0;color:var(--mu)}</style></head>
<body><main><h1>${titulo}</h1><p>${texto}</p></main></body></html>`;

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

  // ---- Dirección de la página: pagos (Stripe), consulta de compras y de registradores ----
  app.post('/pagos/stripe/webhook', async (c) => {
    const crudo = await c.req.text();
    let ev;
    try { ev = verificarWebhook(crudo, c.req.header('stripe-signature')); }
    catch (err) { return c.json({ error: err.message }, 400); }
    try { return c.json(await procesarEventoStripe(ev)); }
    catch (err) { console.error('webhook stripe', err); return c.json({ error: 'error interno' }, 500); } // Stripe reintenta
  });
  app.get('/pago/listo', (c) => c.html(paginaPago('Pago recibido ✅', 'Gracias. Ya puedes regresar a la conversación con Ari: en cuanto quede registrada tu dirección te aviso ahí.')));
  app.get('/pago/cancelado', (c) => c.html(paginaPago('Pago no realizado', 'No se hizo ningún cargo. Regresa a la conversación con Ari y escríbele <b>liga</b> si quieres intentarlo de nuevo.')));

  app.get('/entrevista/v1/dominios-compras/:id', wrap(async (c) => {
    auth(c);
    const r = await obtenerCompra(c.req.param('id'));
    if (!r) throw new HttpError(404, 'no existe');
    return r;
  }));
  app.get('/entrevista/v1/dominios-compras', wrap(async (c) => {
    auth(c);
    const sesion = c.req.query('sesion_id');
    const r = await db.q(`SELECT id, entrevista_id, dominio, estado, titularidad, precio->>'total_mxn' AS total_mxn, pagado, vence, error, actualizado
                          FROM dominios_compras ${sesion ? 'WHERE entrevista_id=$1' : ''} ORDER BY creado DESC LIMIT 100`, sesion ? [sesion] : []);
    return r.rows;
  }));
  app.get('/entrevista/v1/registrador/:dominio', wrap(async (c) => { auth(c); return investigar(c.req.param('dominio')); }));
  app.post('/entrevista/v1/guias/:proveedor/actualizar', wrap(async (c) => {
    auth(c);
    const p = c.req.param('proveedor');
    if (!GUIAS[p]) throw new HttpError(404, 'proveedor desconocido');
    return { ok: true, pasos: (await actualizarGuia(p))?.pasos || null };
  }));

  // Entrega manual del acceso (normalmente la hace el cron cuando la página ya responde en su dominio). {dominio, panel?, forzar?}
  app.post('/entrevista/v1/sesiones/:id/entregar-acceso', wrap(async (c) => {
    auth(c);
    const e = await db.obtener(c.req.param('id'));
    if (!e) throw new HttpError(404, 'no existe');
    const b = await c.req.json().catch(() => ({}));
    const dominio = String(b.dominio || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) throw new HttpError(400, 'dominio inválido');
    const sv = (await db.q(`SELECT id FROM sitios_vivos WHERE entrevista_id=$1`, [e.id]).catch(() => ({ rows: [] }))).rows[0];
    const panel = b.panel || (sv ? 'panel_propio' : 'wp-admin');
    return entregarAcceso(e.id, { dominio, panel, sitio_vivo_id: sv?.id }, { forzar: b.forzar === true });
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
  // Dirección de la página: registros pagados, conexiones y dominios propios en espera del cambio del cliente.
  const cronDominios = async () => {
    await cronCompras().catch((err) => console.error('cron compras', err));
    await cronDominiosPropios().catch((err) => console.error('cron dominios propios', err));
    await cronEntregas().catch((err) => console.error('cron entregas', err)); // acceso del dueño cuando su página ya está en su dominio
  };
  setInterval(cronDominios, 10 * 60e3).unref();
  setInterval(() => cronProgramados().catch((err) => console.error('cron programados', err)), 60e3).unref();
  // Guías de proveedores: se revisa la ayuda oficial una vez por semana.
  setInterval(() => { for (const p of Object.keys(GUIAS)) actualizarGuia(p).catch(() => {}); }, 7 * 864e5).unref();
}
