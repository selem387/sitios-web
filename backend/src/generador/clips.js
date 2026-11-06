// Clips breves del slider de portada y variaciones IA de fotos (decisión 6-nov-2026, doc claude/slider-portada.md).
// - Foto 1 del slider: nunca clip (solo movimiento CSS).
// - Foto 2, 4…: clip de Higgsfield (image-to-video, 4 s, sin audio). Sin créditos o con error → clip FFmpeg.
// - Foto 3, 5…: clip FFmpeg (paneo lento de cámara sobre la foto).
// Los clips se generan en segundo plano y quedan en DATA_DIR/clips/<hash>.mp4, servidos en /clips/<hash>.mp4.
// La página siempre sale con la foto; el navegador baja el clip después del evento load solo si ya existe.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { config } from '../config.js';

export const DIR_CLIPS = path.join(config.dataDir, 'clips');
const HF_BASE = 'https://api.higgsfield.ai';
const HF_ID = process.env.HF_API_KEY_ID || '';
const HF_SECRET = process.env.HF_API_KEY_SECRET || '';
// Modelo image-to-video. Seedance 2.5 (12 créditos a 480p, 4 s). Para Kling 4.0 Flash, poner aquí su ruta de la API.
const HF_MODELO_VIDEO = process.env.HF_MODELO_VIDEO || 'bytedance/seedance-2.5/reference-to-video';
const HF_MODELO_EDICION = process.env.HF_MODELO_EDICION || 'alibaba/qwen-image-3/edit';
const ACTIVOS = process.env.CLIPS_ACTIVOS !== '0' && process.env.NODE_ENV !== 'test';
const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 24);
export const nombreClip = (fotoUrl, tipo) => `${hash(`${fotoUrl}|${tipo}|v1`)}.mp4`;
export const urlClip = (fotoUrl, tipo) => `${config.publicUrl}/clips/${nombreClip(fotoUrl, tipo)}`;

/** Qué lleva cada posición del slider (0 = primera foto). */
export const tipoClip = (k) => (k === 0 ? null : k % 2 === 1 ? 'hf' : 'ff');

const existe = (p) => fs.access(p).then(() => true, () => false);
let sinCreditosHasta = 0;
const cola = [];
const enCurso = new Set();
let trabajando = false;

/** Pide los clips que falten. No espera: la generación corre en segundo plano, de uno en uno. */
export function encolarClips(lista = []) {
  if (!ACTIVOS) return;
  for (const c of lista) {
    if (!c?.url || !c.tipo) continue;
    const nombre = nombreClip(c.url, c.tipo);
    if (enCurso.has(nombre)) continue;
    enCurso.add(nombre);
    cola.push({ ...c, nombre });
  }
  if (!trabajando) trabajar().catch((e) => console.warn('[clips]', e.message));
}

async function trabajar() {
  trabajando = true;
  try {
    await fs.mkdir(DIR_CLIPS, { recursive: true });
    while (cola.length) {
      const c = cola.shift();
      const destino = path.join(DIR_CLIPS, c.nombre);
      try {
        if (await existe(destino)) continue;
        // Un error reciente: no reintentar en 24 h (evita gastar créditos en bucle).
        const err = await fs.stat(`${destino}.err`).catch(() => null);
        if (err && Date.now() - err.mtimeMs < 864e5) continue;
        await generar(c, destino);
        console.log('[clips] listo', c.tipo, c.nombre);
      } catch (e) {
        console.warn('[clips] falló', c.tipo, c.nombre, e.message);
        await fs.writeFile(`${destino}.err`, String(e.message)).catch(() => {});
      } finally {
        enCurso.delete(c.nombre);
      }
    }
  } finally {
    trabajando = false;
  }
}

async function generar(c, destino) {
  const tmp = `${destino}.tmp.mp4`;
  if (c.tipo === 'hf' && HF_ID && HF_SECRET && Date.now() > sinCreditosHasta) {
    try {
      const url = await higgsfieldVideo(c);
      await bajarYComprimir(url, tmp);
      await fs.rename(tmp, destino);
      return;
    } catch (e) {
      // Sin créditos (402/403 o mensaje de saldo): 6 h sin intentar Higgsfield; el clip se hace con FFmpeg.
      if (e.sinCreditos) sinCreditosHasta = Date.now() + 6 * 36e5;
      console.warn('[clips] Higgsfield no disponible, uso FFmpeg:', e.message);
    }
  }
  await clipFfmpeg(c, tmp);
  await fs.rename(tmp, destino);
}

/* ---------------- FFmpeg ---------------- */
function correr(args, ms = 180000) {
  return new Promise((ok, mal) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
    let err = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); mal(new Error('ffmpeg: tiempo agotado')); }, ms);
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(t); mal(e); });
    p.on('close', (code) => { clearTimeout(t); code === 0 ? ok() : mal(new Error(`ffmpeg ${code}: ${err.slice(-300)}`)); });
  });
}

async function bajar(url, archivo) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error(`descarga ${r.status}`);
  await fs.writeFile(archivo, Buffer.from(await r.arrayBuffer()));
}

// Tope ≈ 1.3 Mb/s → un clip de 4 s pesa ≤ 700 KB.
const salida = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '30', '-maxrate', '1300k', '-bufsize', '2600k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

/** Paneo lento de cámara (lateral + acercamiento leve), 4 s, 25 fps, sin audio. Distinto del acercamiento CSS. */
async function clipFfmpeg(c, tmp) {
  const img = `${tmp}.src`;
  await bajar(c.url, img);
  const vertical = (c.alto || 0) > (c.ancho || 0);
  const [w, h] = vertical ? [720, 1280] : [1280, 720];
  const n = 100; // 4 s × 25 fps
  const lado = c.k % 4 === 2 ? `iw/2-(iw/zoom/2)+(on/${n}-0.5)*iw*0.06` : `iw/2-(iw/zoom/2)-(on/${n}-0.5)*iw*0.06`;
  const vf = [
    `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase`,
    `crop=${w * 2}:${h * 2}`,
    `zoompan=z='1.06+0.04*on/${n}':x='${lado}':y='ih/2-(ih/zoom/2)':d=${n}:s=${w}x${h}:fps=25`,
  ].join(',');
  try {
    await correr(['-loop', '1', '-i', img, '-vf', vf, '-t', '4', ...salida, tmp]);
  } finally {
    await fs.rm(img, { force: true });
  }
}

async function bajarYComprimir(url, tmp) {
  const crudo = `${tmp}.crudo.mp4`;
  await bajar(url, crudo);
  try {
    await correr(['-i', crudo, '-t', '4', '-vf', "scale='min(1280,iw)':-2", ...salida, tmp]);
  } finally {
    await fs.rm(crudo, { force: true });
  }
}

/* ---------------- Higgsfield ---------------- */
async function hf(ruta, body) {
  const r = await fetch(`${HF_BASE}/${ruta}`, {
    method: 'POST',
    headers: { authorization: `Key ${HF_ID}:${HF_SECRET}`, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`Higgsfield ${r.status}: ${j?.detail || j?.message || j?.error || ''}`.trim());
    e.sinCreditos = r.status === 402 || r.status === 403 || /credit|balance|saldo|insufficient/i.test(JSON.stringify(j));
    throw e;
  }
  return esperar(j);
}

async function esperar(j, limiteMs = 10 * 60000) {
  const fin = Date.now() + limiteMs;
  let estado = j;
  while (!['completed', 'failed', 'nsfw', 'canceled'].includes(estado.status)) {
    if (Date.now() > fin) throw new Error('Higgsfield: tiempo agotado');
    await new Promise((ok) => setTimeout(ok, 5000));
    const r = await fetch(estado.status_url || `${HF_BASE}/requests/${estado.request_id}/status`, { headers: { authorization: `Key ${HF_ID}:${HF_SECRET}` }, signal: AbortSignal.timeout(30000) });
    estado = await r.json();
  }
  if (estado.status !== 'completed') throw new Error(`Higgsfield: ${estado.status}`);
  return estado;
}

async function higgsfieldVideo(c) {
  const vertical = (c.alto || 0) > (c.ancho || 0);
  const r = await hf(HF_MODELO_VIDEO, {
    prompt: 'Very subtle, realistic natural motion of this exact scene (light, steam, leaves, fabric or water if present) with a gentle slow camera push-in. Keep the composition, people, products, colors and every detail identical. No new objects, no text, no cuts.',
    image_urls: [c.url], duration: 4, resolution: '480p', aspect_ratio: vertical ? '9:16' : '16:9', generate_audio: false, bitrate_mode: 'standard',
  });
  const url = r.video?.url || r.videos?.[0]?.url;
  if (!url) throw new Error('Higgsfield: respuesta sin video');
  return url;
}

/**
 * Variaciones muy parecidas a una foto real del cliente (solo cuando dijo que no tiene más fotos).
 * Devuelve [{url, alt, ancho, alto, ia:true}] servidas en /clips/. Nunca lanza: si no se puede, devuelve [].
 */
export async function variacionesFoto(foto, n = 2) {
  if (!ACTIVOS || !foto?.url || !HF_ID || !HF_SECRET || n < 1 || Date.now() < sinCreditosHasta) return [];
  await fs.mkdir(DIR_CLIPS, { recursive: true });
  const vertical = (foto.alto || 0) > (foto.ancho || 0);
  const encuadres = ['a slightly closer framing', 'a slightly different angle, a few steps to the side', 'a wider framing with a bit more of the surroundings'];
  const out = [];
  for (let k = 0; k < n; k++) {
    const nombre = `${hash(`${foto.url}|var|${k}|v1`)}.jpg`;
    const destino = path.join(DIR_CLIPS, nombre);
    try {
      if (!(await existe(destino))) {
        const err = await fs.stat(`${destino}.err`).catch(() => null);
        if (err && Date.now() - err.mtimeMs < 864e5) break;
        const r = await hf(HF_MODELO_EDICION, {
          prompt: `Create a new photograph of this same place and the same subject, as if taken a moment later from ${encuadres[k % encuadres.length]}. Keep the same style, light, colors, materials and identity. Photorealistic, no text, no logos, no extra people.`,
          image_urls: [foto.url], aspect_ratio: vertical ? '3:4' : '4:3', resolution: '1k',
        });
        const url = r.images?.[0]?.url;
        if (!url) throw new Error('sin imagen');
        await bajar(url, destino);
      }
      out.push({ url: `${config.publicUrl}/clips/${nombre}`, alt: foto.alt || '', ancho: vertical ? 768 : 1024, alto: vertical ? 1024 : 768, ia: true, variacion_de: foto.url, calidad: 'buena' });
    } catch (e) {
      if (e.sinCreditos) sinCreditosHasta = Date.now() + 6 * 36e5;
      console.warn('[clips] variación IA falló:', e.message);
      await fs.writeFile(`${destino}.err`, String(e.message)).catch(() => {});
      break;
    }
  }
  return out;
}

/** Sirve /clips/<archivo> con soporte de Range (Safari exige 206 para video). */
export async function servirClip(c) {
  const nombre = c.req.param('nombre');
  if (!/^[a-f0-9]{24}\.(mp4|jpg)$/.test(nombre)) return c.text('no', 404);
  const archivo = path.join(DIR_CLIPS, nombre);
  const st = await fs.stat(archivo).catch(() => null);
  if (!st) return c.text('no', 404, { 'cache-control': 'no-store' });
  const tipo = nombre.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
  const comunes = { 'content-type': tipo, 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=31536000, immutable' };
  const m = /bytes=(\d*)-(\d*)/.exec(c.req.header('range') || '');
  const fh = await fs.open(archivo);
  try {
    if (m) {
      const ini = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
      const fin = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (ini >= st.size || ini > fin) return c.body(null, 416, { 'content-range': `bytes */${st.size}` });
      const buf = Buffer.alloc(fin - ini + 1);
      await fh.read(buf, 0, buf.length, ini);
      return c.body(buf, 206, { ...comunes, 'content-range': `bytes ${ini}-${fin}/${st.size}`, 'content-length': String(buf.length) });
    }
    const buf = await fs.readFile(archivo);
    return c.body(buf, 200, { ...comunes, 'content-length': String(st.size) });
  } finally {
    await fh.close();
  }
}
