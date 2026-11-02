// Chat web de prueba para la entrevista (sustituto temporal de WhatsApp).
//   GET  /chat                         página del chat
//   POST /chat/v1/mensajes             {usuario_id, texto?, media?[]}      (header X-Chat-Codigo)
//   POST /chat/v1/subir                multipart "archivo" → {url, mime, tipo}
//   GET  /chat/v1/sitio?usuario_id=     estado del sitio generado de su última entrevista
//   GET  /chat/archivos/:nombre         archivos subidos
// Mismo flujo que WhatsApp: procesarMensaje(). Al cerrar la entrevista se lanza el generador.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { HttpError } from '../util.js';
import * as db from '../entrevista/db.js';
import { procesarMensaje, enSerie } from '../entrevista/agente.js';
import { encolar } from '../generador/index.js';
import { paginaChat } from './pagina.js';
import { DIR_PROPUESTAS } from '../generador/propuestas_html.js';

const DIR = path.join(config.dataDir, 'chat');
const CODIGO = process.env.CHAT_CODIGO || '';
const MAX_MB = 16;
const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf', 'video/mp4': 'mp4' };

// Límite simple por IP: 40 peticiones por minuto.
const golpes = new Map();
function limitar(c) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'x';
  const ahora = Date.now();
  const lista = (golpes.get(ip) || []).filter((t) => ahora - t < 60000);
  if (lista.length >= 40) throw new HttpError(429, 'Demasiados mensajes, espera un minuto');
  lista.push(ahora); golpes.set(ip, lista);
}
const usuarioValido = (u) => /^web-[a-z0-9-]{8,60}$/.test(String(u || ''));

function auth(c) {
  limitar(c);
  if (!CODIGO) throw new HttpError(503, 'CHAT_CODIGO no configurado');
  const dado = Buffer.from(String(c.req.header('x-chat-codigo') || ''));
  const real = Buffer.from(CODIGO);
  if (dado.length !== real.length || !crypto.timingSafeEqual(dado, real)) throw new HttpError(401, 'Código de acceso incorrecto');
}

async function sitioDe(usuarioId) {
  const r = await db.q(
    `SELECT s.id, s.estado, s.url_publica, s.reporte->'auditoria'->>'captura' AS captura, s.reporte->>'error' AS error, e.id AS sesion_id
     FROM entrevistas e LEFT JOIN sitios s ON s.entrevista_id = e.id
     WHERE e.usuario_id = $1 ORDER BY e.creado DESC, s.id DESC LIMIT 1`, [usuarioId]);
  return r.rows[0] || null;
}

export function registerChatRoutes(app, wrap) {
  app.get('/chat', (c) => c.html(paginaChat()));

  // Propuestas de diseño navegables (6 por cliente): /p/<token>/<A-F>
  app.get('/p/:token/:letra', async (c) => {
    const { token, letra } = c.req.param();
    if (!/^[A-Za-z0-9]{8,40}$/.test(token) || !/^[A-F]$/.test(letra)) return c.text('no', 404);
    try { return c.html(await fs.readFile(path.join(DIR_PROPUESTAS, token, `${letra}.html`), 'utf8'), 200, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }); }
    catch { return c.text('Propuesta no encontrada', 404); }
  });

  app.get('/chat/archivos/:nombre', async (c) => {
    const nombre = c.req.param('nombre');
    if (!/^[\w-]+\.[a-z0-9]{2,4}$/.test(nombre)) return c.text('no', 404);
    try {
      const buf = await fs.readFile(path.join(DIR, nombre));
      const ext = nombre.split('.').pop();
      const mime = Object.entries(TIPOS).find(([, e]) => e === ext)?.[0] || 'application/octet-stream';
      return c.body(buf, 200, { 'content-type': mime, 'cache-control': 'public, max-age=86400' });
    } catch { return c.text('no', 404); }
  });

  app.post('/chat/v1/subir', wrap(async (c) => {
    auth(c);
    const form = await c.req.parseBody();
    const f = form.archivo;
    if (!f || typeof f === 'string') throw new HttpError(400, 'falta archivo');
    const mime = (f.type || '').split(';')[0];
    const ext = TIPOS[mime];
    if (!ext) throw new HttpError(415, `Tipo no permitido: ${mime || 'desconocido'}`);
    if (f.size > MAX_MB * 1024 * 1024) throw new HttpError(413, `Máximo ${MAX_MB} MB`);
    await fs.mkdir(DIR, { recursive: true });
    const nombre = `${crypto.randomBytes(12).toString('base64url').replace(/_/g, '-')}.${ext}`;
    await fs.writeFile(path.join(DIR, nombre), Buffer.from(await f.arrayBuffer()));
    const tipo = mime.startsWith('image/') ? 'imagen' : mime.startsWith('audio/') ? 'audio' : mime.startsWith('video/') ? 'video' : 'documento';
    return { url: `${config.publicUrl}/chat/archivos/${nombre}`, mime, tipo };
  }));

  app.post('/chat/v1/mensajes', wrap(async (c) => {
    auth(c);
    const b = await c.req.json().catch(() => { throw new HttpError(400, 'JSON inválido'); });
    if (!usuarioValido(b.usuario_id)) throw new HttpError(400, 'usuario_id inválido');
    const media = (Array.isArray(b.media) ? b.media : []).filter((m) => String(m?.url || '').startsWith(`${config.publicUrl}/chat/archivos/`)).slice(0, 5);
    const res = await enSerie(b.usuario_id, () => procesarMensaje({ usuario_id: b.usuario_id, texto: b.texto, media, canal: 'web', reiniciar: b.reiniciar === true }));
    // Cierre de la entrevista: lanzar el generador una sola vez (en web de prueba se fuerza WordPress).
    if (res.estado === 'completada') {
      const ya = await db.q(`SELECT 1 FROM sitios WHERE entrevista_id=$1 LIMIT 1`, [res.sesion_id]);
      if (!ya.rows.length) {
        const e = await db.obtener(res.sesion_id);
        await encolar(e, { forzarWordpress: true }).catch((err) => console.error('chat generar', err));
        res.generando = true;
      }
    }
    return res;
  }));

  app.get('/chat/v1/sitio', wrap(async (c) => {
    auth(c);
    const u = c.req.query('usuario_id');
    if (!usuarioValido(u)) throw new HttpError(400, 'usuario_id inválido');
    return (await sitioDe(u)) || {};
  }));
}
