// Servicio render: mockups de primera pantalla (B7 de la entrevista) y capturas de sitios publicados (QA).
// Un solo Chromium compartido; cada petición abre un contexto nuevo y lo cierra.
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { heroHTML, ESTILOS_CON_LAYOUT } from './plantillas/hero.js';

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || '/data';
const FILES_DIR = path.join(DATA_DIR, 'files');
const API_KEY = process.env.RENDER_API_KEY || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const RETENCION_DIAS = Number(process.env.RETENCION_DIAS || 30);
const MAX_PARALELO = Number(process.env.MAX_PARALELO || 2);

await fs.mkdir(FILES_DIR, { recursive: true });

let browser = null;
async function navegador() {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  return browser;
}

// Semáforo simple para no abrir N contextos a la vez en un VPS chico.
let activos = 0; const cola = [];
const tomar = () => new Promise((r) => { if (activos < MAX_PARALELO) { activos++; r(); } else cola.push(r); });
const soltar = () => { activos--; const s = cola.shift(); if (s) { activos++; s(); } };

async function conPagina({ width = 390, height = 844, scale = 2, movil = true }, fn) {
  await tomar();
  const b = await navegador();
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: movil, hasTouch: movil, locale: 'es-MX' });
  try { return await fn(await ctx.newPage()); } finally { await ctx.close().catch(() => {}); soltar(); }
}

// Descarga la foto del cliente y la incrusta como data URI: evita depender de que Chromium alcance la URL (YCloud, S3 firmado)
// y de que cargue antes de la captura. Si falla, se deja la URL y el navegador intenta cargarla.
async function incrustarFoto(url) {
  if (!url || !/^https?:\/\//.test(url)) return url;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow' });
    if (!r.ok) return url;
    const tipo = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!tipo.startsWith('image/')) return url;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return url;
    return `data:${tipo};base64,${buf.toString('base64')}`;
  } catch { return url; }
}

async function guardarPNG(buf, prefijo = 'img') {
  const nombre = `${prefijo}-${crypto.randomBytes(9).toString('base64url')}.png`;
  await fs.writeFile(path.join(FILES_DIR, nombre), buf);
  return { nombre, url: `${PUBLIC_URL}/files/${nombre}` };
}

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, estilos: ESTILOS_CON_LAYOUT, activos }));

app.get('/files/:nombre', async (c) => {
  const nombre = c.req.param('nombre');
  if (!/^[\w-]+\.png$/.test(nombre)) return c.text('no', 404);
  try {
    const buf = await fs.readFile(path.join(FILES_DIR, nombre));
    return c.body(buf, 200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' });
  } catch { return c.text('no', 404); }
});

app.use('/v1/*', async (c, next) => {
  if (!API_KEY) return c.json({ error: 'RENDER_API_KEY no configurada' }, 503);
  if (c.req.header('x-api-key') !== API_KEY) return c.json({ error: 'no autorizado' }, 401);
  await next();
});

// Un mockup. Cuerpo: ver heroHTML(d). Respuesta: {url, nombre, ms} o PNG si ?formato=png
app.post('/v1/mockup', async (c) => {
  const d = await c.req.json().catch(() => null);
  if (!d || !d.estilo?.slug) return c.json({ error: 'falta estilo.slug' }, 400);
  const t0 = Date.now();
  d.foto_url = await incrustarFoto(d.foto_url);
  const buf = await conPagina({}, async (page) => {
    await page.setContent(heroHTML(d), { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    return page.screenshot({ type: 'png', fullPage: false });
  });
  if (c.req.query('formato') === 'png') return c.body(buf, 200, { 'content-type': 'image/png' });
  const f = await guardarPNG(buf, `mockup-${d.etiqueta || 'x'}`);
  return c.json({ ...f, ms: Date.now() - t0 });
});

// Tres opciones de una vez (A, B, C). Cuerpo: {comun:{...datos del negocio...}, opciones:[{etiqueta, estilo, subtipo?, foto_url?}]}
app.post('/v1/mockups', async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || !Array.isArray(b.opciones) || !b.opciones.length) return c.json({ error: 'faltan opciones' }, 400);
  const t0 = Date.now();
  const res = [];
  const fotos = new Map();
  for (const [i, op] of b.opciones.slice(0, 4).entries()) {
    const d = { ...(b.comun || {}), ...op, etiqueta: op.etiqueta || 'ABCD'[i] };
    if (d.foto_url) { if (!fotos.has(d.foto_url)) fotos.set(d.foto_url, await incrustarFoto(d.foto_url)); d.foto_url = fotos.get(d.foto_url); }
    const buf = await conPagina({}, async (page) => {
      await page.setContent(heroHTML(d), { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
      return page.screenshot({ type: 'png' });
    });
    res.push({ etiqueta: d.etiqueta, estilo: d.estilo?.slug, ...(await guardarPNG(buf, `mockup-${d.etiqueta}`)) });
  }
  return c.json({ opciones: res, ms: Date.now() - t0 });
});

// Captura de una URL pública (QA post-publicación). Cuerpo: {url, ancho?:390|1280, completa?:boolean}
app.post('/v1/captura', async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || !/^https?:\/\//.test(b.url || '')) return c.json({ error: 'falta url' }, 400);
  const movil = (b.ancho || 390) <= 500;
  const t0 = Date.now();
  const buf = await conPagina({ width: b.ancho || 390, height: movil ? 844 : 800, scale: movil ? 2 : 1, movil }, async (page) => {
    await page.goto(b.url, { waitUntil: 'networkidle', timeout: 30000 });
    return page.screenshot({ type: 'png', fullPage: Boolean(b.completa) });
  });
  const f = await guardarPNG(buf, movil ? 'movil' : 'desktop');
  return c.json({ ...f, ms: Date.now() - t0 });
});

// Vista previa del HTML sin capturar (para ajustar plantillas desde el navegador).
app.post('/v1/mockup/html', async (c) => c.html(heroHTML(await c.req.json())));

// Limpieza diaria de archivos viejos.
setInterval(async () => {
  const limite = Date.now() - RETENCION_DIAS * 864e5;
  for (const f of await fs.readdir(FILES_DIR).catch(() => [])) {
    const p = path.join(FILES_DIR, f);
    const st = await fs.stat(p).catch(() => null);
    if (st && st.mtimeMs < limite) await fs.unlink(p).catch(() => {});
  }
}, 6 * 3600 * 1000).unref();

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, () => console.log(`render escuchando en :${PORT}`));
