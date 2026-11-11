// Chat web de prueba para la entrevista (sustituto temporal de WhatsApp).
//   GET  /chat                         página del chat
//   POST /chat/v1/mensajes             {usuario_id, texto?, media?[]}      (header X-Chat-Codigo)
//   POST /chat/v1/subir                multipart "archivo" → {url, mime, tipo}
//   GET  /chat/v1/sitio?usuario_id=     estado del sitio generado de su última entrevista
//   GET  /chat/v1/avisos?usuario_id=    mensajes de Ari pendientes de mostrar (pago, dirección lista)
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
import { servirClip } from '../generador/clips.js';
import { pendientesChat } from '../entrevista/avisos.js';
import { urlSitio } from '../panel/cambios_vivo.js';

const DIR = path.join(config.dataDir, 'chat');
const CODIGO = process.env.CHAT_CODIGO || '';
const MAX_MB = 16;
const MAX_ADJ = 18; // archivos por mensaje (igual que MAX_ADJ en pagina.js)
const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf', 'video/mp4': 'mp4' };

// Límite simple por IP: 90 peticiones por minuto (un envío de 18 fotos ya son 19 peticiones).
const golpes = new Map();
function limitar(c) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'x';
  const ahora = Date.now();
  const lista = (golpes.get(ip) || []).filter((t) => ahora - t < 60000);
  if (lista.length >= 90) throw new HttpError(429, 'Demasiados mensajes, espera un minuto');
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

// Estado de la página de su última entrevista, tal como lo ve el cliente:
//   entrevista (reabierta o en curso: no hay nada que esperar) · armando · listo · requiere_revision · error
async function sitioDe(usuarioId) {
  const e = (await db.q(`SELECT id, estado FROM entrevistas WHERE usuario_id=$1 ORDER BY creado DESC LIMIT 1`, [usuarioId])).rows[0];
  if (!e) return null;
  if (e.estado !== 'completada') return { sesion_id: e.id, estado: 'entrevista' };
  const sv = (await db.q(`SELECT * FROM sitios_vivos WHERE entrevista_id=$1 AND estado='activo'`, [e.id]).catch(() => ({ rows: [] }))).rows[0];
  if (sv) return { id: `v${sv.id}`, estado: 'listo', url_publica: urlSitio(sv), captura: null, sesion_id: e.id };
  const s = (await db.q(
    `SELECT id, estado, url_publica, reporte->'auditoria'->>'captura' AS captura FROM sitios
     WHERE entrevista_id=$1 AND estado<>'reemplazado' ORDER BY id DESC LIMIT 1`, [e.id]).catch(() => ({ rows: [] }))).rows[0];
  return s ? { ...s, sesion_id: e.id } : { id: 'pendiente', estado: 'armando', sesion_id: e.id };
}

export function registerChatRoutes(app, wrap) {
  app.get('/chat', (c) => c.html(paginaChat()));

  // Propuestas de diseño navegables (6 por cliente): /p/<token>/<A-F>
  app.get('/p/:token/:letra', async (c) => {
    const { token, letra } = c.req.param();
    if (!/^[A-Za-z0-9]{8,40}$/.test(token) || !/^[A-F]$/.test(letra)) return c.text('no', 404);
    // Opción ya elegida (11-nov-2026): su liga muestra el sitio armado desde la base con sus ajustes visuales.
    try {
      const sv = (await db.q(`SELECT sv.*, e.brief#>>'{marca,propuestas,elegido}' AS _elegido FROM sitios_vivos sv JOIN entrevistas e ON e.id = sv.entrevista_id
                              WHERE e.brief#>>'{marca,propuestas,token}' = $1 AND sv.estado='activo' ORDER BY sv.id DESC LIMIT 1`, [token])).rows[0];
      if (sv && (sv.contenido?.diseno?.propuesta || sv._elegido) === letra) {
        const { renderSitio } = await import('../panel/sitios.js');
        return c.html(await renderSitio(sv, { previa: true }), 200, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
      }
    } catch (err) { console.error('[p] sitio vivo', token, err.message); }
    try { return c.html(await fs.readFile(path.join(DIR_PROPUESTAS, token, `${letra}.html`), 'utf8'), 200, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }); }
    catch { return c.text('Propuesta no encontrada', 404); }
  });

  // Clips del slider de portada y variaciones IA (generador/clips.js).
  app.get('/clips/:nombre', (c) => servirClip(c));

  app.get('/chat/archivos/:nombre', async (c) => {
    const nombre = c.req.param('nombre');
    if (!/^[\w-]+\.[a-z0-9]{2,4}$/.test(nombre)) return c.text('no', 404);
    // ?w=480|800|1200|1600: versión reducida en WebP para el srcset de las páginas (generador/movimiento.js: conSrcset).
    const w = Number(c.req.query('w'));
    if (w) {
      try {
        const { reducida } = await import('../imagenes.js');
        const buf = await reducida(path.join(DIR, nombre), w);
        if (buf) return c.body(buf, 200, { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' });
      } catch { /* si falla, sirve el original */ }
    }
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
    const media = (Array.isArray(b.media) ? b.media : []).filter((m) => String(m?.url || '').startsWith(`${config.publicUrl}/chat/archivos/`)).slice(0, MAX_ADJ);
    const res = await enSerie(b.usuario_id, () => procesarMensaje({ usuario_id: b.usuario_id, texto: b.texto, media, canal: 'web', reiniciar: b.reiniciar === true }));
    // Cierre de la entrevista: lanzar el generador una sola vez (los sitios WordPress retirados no cuentan).
    if (res.estado === 'completada') {
      const ya = await db.q(`SELECT 1 FROM sitios WHERE entrevista_id=$1 AND estado<>'reemplazado' UNION ALL SELECT 1 FROM sitios_vivos WHERE entrevista_id=$1 AND NOT (contenido ? '_previo_cierre') LIMIT 1`, [res.sesion_id]).catch(() => ({ rows: [] }));
      if (!ya.rows.length) {
        const e = await db.obtener(res.sesion_id);
        await encolar(e, {}).catch((err) => console.error('chat generar', err));
        res.generando = true;
      }
    }
    return res;
  }));

  // Mensajes de Ari que llegaron sin que el cliente escribiera (pago recibido, dirección conectada…).
  app.get('/chat/v1/avisos', wrap(async (c) => {
    auth(c);
    const u = c.req.query('usuario_id');
    if (!usuarioValido(u)) throw new HttpError(400, 'usuario_id inválido');
    return { avisos: (await pendientesChat(u)).map((x) => ({ texto: x.texto, evento: x.evento })) };
  }));

  // "Mis páginas": resumen de las conversaciones que este navegador conoce (ids web-<uuid>, imposibles de adivinar).
  app.get('/chat/v1/conversaciones', wrap(async (c) => {
    auth(c);
    const ids = [...new Set(String(c.req.query('ids') || '').split(',').map((x) => x.trim()).filter(usuarioValido))].slice(0, 50);
    if (!ids.length) return { conversaciones: [] };
    const r = await db.q(
      `SELECT DISTINCT ON (usuario_id) usuario_id, estado, brief->'negocio'->>'nombre' AS nombre, creado, actualizado
       FROM entrevistas WHERE usuario_id = ANY($1) AND estado <> 'cancelada' ORDER BY usuario_id, creado DESC`, [ids]);
    const lista = [];
    for (const x of r.rows) {
      const s = x.estado === 'completada' ? await sitioDe(x.usuario_id).catch(() => null) : null;
      lista.push({ usuario_id: x.usuario_id, nombre: x.nombre || '', estado: s?.estado || (x.estado === 'completada' ? 'armando' : 'entrevista'), url: s?.url_publica || null, actualizado: x.actualizado });
    }
    return { conversaciones: lista.sort((a, b) => new Date(b.actualizado) - new Date(a.actualizado)) };
  }));

  // Historial de una conversación guardado en el servidor (para abrirla en otro navegador o después de cambiar de página).
  app.get('/chat/v1/historial', wrap(async (c) => {
    auth(c);
    const u = c.req.query('usuario_id');
    if (!usuarioValido(u)) throw new HttpError(400, 'usuario_id inválido');
    const r = await db.q(
      `SELECT m.rol, m.tipo, m.contenido, m.transcripcion FROM mensajes m JOIN entrevistas e ON e.id = m.entrevista_id
       WHERE e.usuario_id=$1 AND e.estado <> 'cancelada' AND m.rol IN ('cliente','agente') ORDER BY m.creado, m.id`, [u]);
    const ETIQUETA = { imagen: '📷 Foto enviada', audio: '🎤 Nota de voz', documento: '📎 Archivo enviado', video: '🎬 Video enviado', ubicacion: '📍 Ubicación' };
    const items = [];
    for (const m of r.rows) {
      const de = m.rol === 'cliente' ? 'yo' : 'ari';
      if (m.tipo === 'texto' || !ETIQUETA[m.tipo]) { if (m.contenido) items.push({ de, texto: m.contenido }); continue; }
      const extra = m.tipo === 'audio' ? m.transcripcion : (String(m.contenido || '').match(/https?:\/\/\S+/) || [])[0];
      items.push({ de, texto: ETIQUETA[m.tipo] + (extra ? `: ${extra}` : '') });
    }
    const s = await sitioDe(u).catch(() => null);
    if (s?.estado === 'listo' && s.url_publica) items.push({ tipo: 'sitio', url: s.url_publica, captura: s.captura || null });
    const existe = (await db.q(`SELECT 1 FROM entrevistas WHERE usuario_id=$1 AND estado <> 'cancelada' LIMIT 1`, [u])).rows.length > 0;
    return { items: items.slice(-200), existe };
  }));

  app.get('/chat/v1/sitio', wrap(async (c) => {
    auth(c);
    const u = c.req.query('usuario_id');
    if (!usuarioValido(u)) throw new HttpError(400, 'usuario_id inválido');
    return (await sitioDe(u)) || {};
  }));
}
