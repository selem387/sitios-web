// Servicio render: mockups de primera pantalla (B7 de la entrevista) y capturas de sitios publicados (QA).
// Un solo Chromium compartido; cada petición abre un contexto nuevo y lo cierra.
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { chromium } from 'playwright';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { heroHTML, ESTILOS_CON_LAYOUT } from './plantillas/hero.js';
import { lighthouse, impeccable, checksPropios } from './auditoria.js';
import { estudiarSitio } from './estudio.js';
import { revisarPagina } from './revisar.js';

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
  d.logo_url = await incrustarFoto(d.logo_url);
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
    for (const k of ['foto_url', 'logo_url']) if (d[k]) { if (!fotos.has(d[k])) fotos.set(d[k], await incrustarFoto(d[k])); d[k] = fotos.get(d[k]); }
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
    // css: estilos extra para la captura (p. ej. ocultar la etiqueta de vista previa y el botón flotante).
    if (b.css) await page.addStyleTag({ content: String(b.css).slice(0, 4000) });
    // selector: captura solo esa sección (para verificar un cambio de diseño). Las imágenes diferidas se fuerzan a cargar.
    if (b.selector) {
      const el = page.locator(String(b.selector)).first();
      if (!(await el.count())) return null; // la sección no existe: no se manda la pantalla completa en su lugar
      {
        // Encabezado fijo y botón flotante no se cuelan en la captura de una sección.
        await page.addStyleTag({ content: 'header,.barra{position:static!important}.wa{display:none!important}' });
        await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }));
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        return el.screenshot({ type: 'png' });
      }
    }
    return page.screenshot({ type: 'png', fullPage: Boolean(b.completa) });
  });
  if (!buf) return c.json({ error: 'no existe', selector: b.selector }, 404);
  const f = await guardarPNG(buf, movil ? 'movil' : 'desktop');
  return c.json({ ...f, ms: Date.now() - t0 });
});

// Revisión objetiva (sin IA) de una página en computadora y celular. Cuerpo: {url, css?}
app.post('/v1/revisar', async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || !/^https?:\/\//.test(b.url || '')) return c.json({ error: 'falta url' }, 400);
  const out = {};
  for (const [k, ancho] of [['computadora', 1366], ['celular', 390]]) {
    const movil = ancho <= 500;
    out[k] = await conPagina({ width: ancho, height: movil ? 844 : 800, scale: 1, movil }, async (page) => {
      await page.goto(b.url, { waitUntil: 'networkidle', timeout: 30000 });
      if (b.css) await page.addStyleTag({ content: String(b.css).slice(0, 4000) });
      return revisarPagina(page);
    }).catch((err) => ({ error: err.message, problemas: [] }));
  }
  return c.json(out);
});

// Auditoría de un sitio publicado: Lighthouse móvil + Impeccable detect + checks propios + captura móvil.
// Cuerpo: {url, desktop?:boolean, sin_lighthouse?:boolean, sin_impeccable?:boolean}
app.post('/v1/auditar', async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || !/^https?:\/\//.test(b.url || '')) return c.json({ error: 'falta url' }, 400);
  const t0 = Date.now();
  const [lh, imp, propio] = await Promise.all([
    b.sin_lighthouse ? null : lighthouse(b.url, { desktop: Boolean(b.desktop) }),
    b.sin_impeccable ? null : impeccable(b.url),
    conPagina({}, async (page) => {
      await page.goto(b.url, { waitUntil: 'networkidle', timeout: 30000 });
      const checks = await checksPropios(page);
      const buf = await page.screenshot({ type: 'png' });
      return { checks, captura: await guardarPNG(buf, 'auditoria') };
    }).catch((e) => ({ error: String(e.message) })),
  ]);
  // Veredicto simple para que el generador decida si itera: P0 = bloquea publicación.
  const p0 = [];
  if (lh?.ok && lh.puntajes.rendimiento < 75) p0.push(`Lighthouse rendimiento móvil ${lh.puntajes.rendimiento} < 75`);
  if (lh?.ok && lh.puntajes.accesibilidad < 90) p0.push(`Lighthouse accesibilidad ${lh.puntajes.accesibilidad} < 90`);
  if (propio?.checks && !propio.checks.whatsapp_links && !propio.checks.tel_links) p0.push('Sin enlace de WhatsApp ni teléfono');
  if (propio?.checks && propio.checks.h1 !== 1) p0.push(`H1 = ${propio?.checks?.h1} (debe ser 1)`);
  if (propio?.checks?.inter_como_fuente) p0.push('Inter/Roboto/Arial como fuente visible');
  const slop = (imp?.hallazgos || []).filter((h) => h.categoria === 'slop');
  if (slop.length >= 3) p0.push(`${slop.length} clichés de diseño IA detectados por Impeccable (${slop.slice(0, 3).map((h) => h.regla).join(', ')})`);
  return c.json({ url: b.url, lighthouse: lh, impeccable: imp, propio, p0, publicable: p0.length === 0, ms: Date.now() - t0 });
});

// Estudio de una liga de referencia (B7.5): extrae dirección de diseño, nunca clona.
app.post('/v1/estudiar', async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || !/^https?:\/\//.test(b.url || '')) return c.json({ error: 'falta url' }, 400);
  const t0 = Date.now();
  try {
    const r = await conPagina({ width: 1280, height: 800, scale: 1, movil: false }, (page) => estudiarSitio(page, b.url));
    return c.json({ ...r, ms: Date.now() - t0 });
  } catch (e) { return c.json({ error: String(e.message) }, 502); }
});

// Quitar el fondo de una foto de producto. Cuerpo: {url} → {url, ancho, alto} (PNG transparente).
import { execFile } from 'node:child_process';
const ejecutar = (cmd, args, op) => new Promise((res, rej) => execFile(cmd, args, op, (e, so, se) => (e ? rej(new Error(String(se || e.message).slice(0, 300))) : res(so))));
app.post('/v1/sin-fondo', async (c) => {
  const b = await c.req.json().catch(() => null);
  if (!b || !/^https?:\/\//.test(b.url || '')) return c.json({ error: 'falta url' }, 400);
  const t0 = Date.now();
  try {
    const r = await fetch(b.url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return c.json({ error: `descarga ${r.status}` }, 502);
    const tmp = path.join(FILES_DIR, `tmp-${crypto.randomBytes(6).toString('hex')}`);
    await fs.writeFile(tmp, Buffer.from(await r.arrayBuffer()));
    const nombre = `sinfondo-${crypto.randomBytes(9).toString('base64url')}.png`;
    await tomar();
    let so;
    try { so = await ejecutar('/opt/rembg/bin/python', [path.join(path.dirname(new URL(import.meta.url).pathname), 'py', 'sin_fondo.py'), tmp, path.join(FILES_DIR, nombre)], { timeout: 120000 }); }
    finally { soltar(); await fs.unlink(tmp).catch(() => {}); }
    const [ancho, alto] = String(so).trim().split(/\s+/).map(Number);
    return c.json({ url: `${PUBLIC_URL}/files/${nombre}`, ancho, alto, ms: Date.now() - t0 });
  } catch (e) { return c.json({ error: String(e.message) }, 500); }
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
