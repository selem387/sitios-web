// Microservicio "extractor-redes" (proyecto Easypanel sitios-web).
// Recibe las ligas de Facebook y/o Instagram de un negocio y devuelve todo lo útil para armar su página:
// nombre, giro, descripción, servicios, dirección, ciudad, teléfono/WhatsApp, correo, horarios, calificación,
// logo, portada, capturas de las páginas y hasta 18 fotos de publicaciones filtradas con visión (sin flyers ni texto encima).
// Lo consumen la entrevista de Ari y el scraper de prospectos (que arma sitios sin preguntar).
//
// API (header X-API-Key = EXTRACTOR_API_KEY):
//   POST /v1/extracciones {facebook?, instagram?, referencia?, max_fotos?=18, captura?=true}  → 202 {id, estado}
//   GET  /v1/extracciones/:id                                                                → {id, estado, resultado?, error?}
//   GET  /v1/gasto                                → {mes, apify_usd, otros_usd, total_usd, tope_usd, disponible_usd}
//   POST /v1/gasto {fuente, usd, nota?}           → registra gasto de fuera de Apify (p. ej. Google Places) para el tope compartido
//   GET  /files/<id>/<archivo>                    → imágenes rehospedadas (públicas, nombres no adivinables)
//   GET  /health
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import pg from 'pg';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as A from './apify.js';
import * as F from './fuentes.js';
import { elegirFotos, guardar, carpetaArchivos } from './fotos.js';
import { pedirJSON, hayClaude } from './claude.js';

const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.EXTRACTOR_API_KEY || '';
const TOPE_USD = Number(process.env.TOPE_USD || 20);
const RENDER_URL = (process.env.RENDER_URL || '').replace(/\/$/, '');
const RENDER_KEY = process.env.RENDER_API_KEY || '';
const MAX_PARALELO = Number(process.env.MAX_PARALELO || 2);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const q = (s, v = []) => pool.query(s, v);

await q(`CREATE TABLE IF NOT EXISTS extracciones (
  id uuid PRIMARY KEY, referencia text, entrada jsonb NOT NULL, estado text NOT NULL DEFAULT 'pendiente',
  resultado jsonb, error text, costo_estimado_usd numeric(8,4) NOT NULL DEFAULT 0,
  creado timestamptz NOT NULL DEFAULT now(), actualizado timestamptz NOT NULL DEFAULT now())`);
await q(`CREATE INDEX IF NOT EXISTS extracciones_ref_idx ON extracciones (referencia, creado DESC)`);
await q(`CREATE TABLE IF NOT EXISTS gasto_scrapers (
  id serial PRIMARY KEY, fuente text NOT NULL, usd numeric(10,4) NOT NULL, nota text, creado timestamptz NOT NULL DEFAULT now())`);
// Trabajos que quedaron a medias por un reinicio se reintentan.
await q(`UPDATE extracciones SET estado='pendiente' WHERE estado='procesando'`);

// ---------------- presupuesto compartido ----------------
const inicioMes = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); };
let cacheUso = { t: 0, v: null };
async function gasto() {
  if (Date.now() - cacheUso.t > 10 * 60e3) cacheUso = { t: Date.now(), v: await A.usoMensualUsd() };
  const otros = Number((await q(`SELECT coalesce(sum(usd),0) AS s FROM gasto_scrapers WHERE creado >= $1`, [inicioMes()])).rows[0].s);
  // Si Apify no responde, se estima con lo que este servicio lanzó en el mes.
  const propio = Number((await q(`SELECT coalesce(sum(costo_estimado_usd),0) AS s FROM extracciones WHERE creado >= $1`, [inicioMes()])).rows[0].s);
  const apify = cacheUso.v ?? propio;
  const total = apify + otros;
  return { mes: inicioMes().toISOString().slice(0, 7), apify_usd: +apify.toFixed(2), apify_leido: cacheUso.v !== null, otros_usd: +otros.toFixed(2), total_usd: +total.toFixed(2), tope_usd: TOPE_USD, disponible_usd: +Math.max(0, TOPE_USD - total).toFixed(2) };
}

// ---------------- extracción ----------------
const ESQUEMA_DATOS = {
  type: 'object',
  properties: {
    giro_texto: { type: 'string', description: 'A qué se dedica, en una frase simple ("cafetería de especialidad", "despacho de abogados laborales")' },
    ciudad: { type: 'string', description: 'Ciudad donde está el negocio, solo si se dice o se deduce de la dirección; vacío si no' },
    estado: { type: 'string' },
    servicios: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, descripcion_corta: { type: 'string' } }, required: ['nombre'] }, description: 'Productos o servicios que ofrece según los textos (máximo 8); no inventes' },
    horarios: { type: 'string', description: 'Horario si aparece en los textos; vacío si no' },
    whatsapp: { type: 'string', description: 'Número de WhatsApp si aparece explícito en los textos (solo dígitos con lada); vacío si no' },
    promocion_actual: { type: 'string', description: 'Promoción vigente que se repite en publicaciones recientes; vacío si no' },
  },
  required: ['giro_texto', 'servicios'],
};

async function interpretarTextos(fb, ig, posts) {
  if (!hayClaude()) return {};
  const txt = [
    fb && `FACEBOOK: ${[fb.nombre, fb.categorias?.join(', '), fb.descripcion, fb.direccion, fb.horarios].filter(Boolean).join(' | ')}`,
    ig && `INSTAGRAM: ${[ig.nombre, ig.categorias?.join(', '), ig.descripcion, ig.direccion, ig.ciudad].filter(Boolean).join(' | ')}`,
    posts.length && `PUBLICACIONES RECIENTES:\n${posts.slice(0, 25).map((p) => `- ${p}`).join('\n')}`,
  ].filter(Boolean).join('\n\n').slice(0, 12000);
  if (!txt.trim()) return {};
  try {
    return await pedirJSON({
      system: 'Extraes datos de un negocio a partir de los textos de sus redes sociales. Español de México. No inventes nada: si un dato no aparece, déjalo vacío.',
      contenido: txt,
      schema: ESQUEMA_DATOS,
      max_tokens: 1500,
    });
  } catch { return {}; }
}

async function capturar(url) {
  if (!RENDER_URL || !RENDER_KEY || !url) return null;
  try {
    const r = await fetch(`${RENDER_URL}/v1/captura`, {
      method: 'POST', headers: { 'x-api-key': RENDER_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ url, ancho: 1280 }), signal: AbortSignal.timeout(90000),
    });
    const j = await r.json().catch(() => null);
    return r.ok && j?.url ? j.url : null;
  } catch { return null; }
}

const solo = (x) => (x == null || x === '' ? null : x);
const digitos = (t) => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 10 ? d : null; };

/** Actor de fotos de Facebook → candidatas en tamaño completo (incluye las fotos de álbumes). */
function fotosDeActorFotos(items = []) {
  const vistas = new Set();
  const out = [];
  for (const x of items) {
    const u = [x?.image, x?.imageUrl, x?.photo_image?.uri].find((v) => typeof v === 'string' && /^https?:\/\//i.test(v));
    if (!u) continue;
    const llave = u.split('?')[0];
    if (vistas.has(llave)) continue;
    vistas.add(llave);
    out.push({ url: u, texto: '', fuente: 'facebook' });
  }
  return out;
}

async function procesar(id) {
  const fila = (await q(`UPDATE extracciones SET estado='procesando', actualizado=now() WHERE id=$1 AND estado='pendiente' RETURNING *`, [id])).rows[0];
  if (!fila) return;
  const { facebook, instagram, max_fotos = 18, captura = true } = fila.entrada;
  const avisos = [];
  const fuentes = {};
  let costo = 0;
  try {
    const g = await gasto();
    const estimado = (facebook ? A.COSTO_ESTIMADO.fbPagina + A.COSTO_ESTIMADO.fbPosts + A.COSTO_ESTIMADO.fbFotos : 0) + (instagram ? A.COSTO_ESTIMADO.igPerfil : 0);
    const conApify = A.hayApify() && g.total_usd + estimado <= TOPE_USD;
    if (A.hayApify() && !conApify) avisos.push(`tope mensual alcanzado (${g.total_usd}/${TOPE_USD} USD): solo página pública`);

    const tareas = [];
    if (facebook && conApify) {
      tareas.push(A.correr(A.ACTORES.fbPagina, { startUrls: [{ url: facebook }] }, { timeoutS: 120 }).then((r) => ({ k: 'fbPagina', r })));
      tareas.push(A.correr(A.ACTORES.fbPosts, { startUrls: [{ url: facebook }], resultsLimit: 30 }, { timeoutS: 180 }).then((r) => ({ k: 'fbPosts', r })));
      tareas.push(A.correr(A.ACTORES.fbFotos, { startUrls: [{ url: facebook }], resultsLimit: 40 }, { timeoutS: 180 }).then((r) => ({ k: 'fbFotos', r })));
    }
    if (instagram && conApify) {
      tareas.push(A.correr(A.ACTORES.igPerfil, { usernames: [F.usuarioInstagram(instagram)], resultsLimit: 30 }, { timeoutS: 150 }).then((r) => ({ k: 'igPerfil', r })));
    }
    const caps = captura ? Promise.all([capturar(facebook), capturar(instagram)]) : Promise.resolve([null, null]);
    const res = Object.fromEntries((await Promise.all(tareas)).map((x) => [x.k, x.r]));
    for (const [k, r] of Object.entries(res)) { costo += A.COSTO_ESTIMADO[k]; if (r.error) avisos.push(r.error); }

    let fb = res.fbPagina?.items?.length ? F.deFacebook(res.fbPagina.items[0]) : null;
    let ig = res.igPerfil?.items?.length ? F.deInstagram(res.igPerfil.items[0]) : null;
    if (facebook) fuentes.facebook = { url: facebook, ok: !!fb, via: fb ? 'apify' : null };
    if (instagram) fuentes.instagram = { url: instagram, ok: !!ig, via: ig ? 'apify' : null };
    // Respaldo: página pública (og:)
    if (facebook && !fb) { const p = await F.dePaginaPublica(facebook); if (p) { fb = { ...p, categorias: [], redes: {} }; fuentes.facebook = { url: facebook, ok: true, via: 'publica' }; } }
    if (instagram && !ig) { const p = await F.dePaginaPublica(instagram); if (p) { ig = { ...p, categorias: [], posts: [] }; fuentes.instagram = { url: instagram, ok: true, via: 'publica' }; } }

    const postsFb = res.fbPosts?.items || [];
    const postsIg = ig?.posts || [];
    const textos = [...postsIg, ...postsFb].map((p) => String(p?.caption || p?.text || p?.message || '').trim()).filter((t) => t.length > 15);
    const datos = await interpretarTextos(fb, ig, textos);

    // Logo: el de Instagram suele venir en mejor resolución que el de Facebook.
    let logo = null; let portada = null;
    for (const u of [ig?.logo, fb?.logo].filter(Boolean)) {
      try { logo = await guardar(id, 'logo', u, { minLado: 120, esLogo: true }); break; } catch (err) { avisos.push(`logo: ${err.message}`); }
    }
    if (fb?.portada) { try { portada = await guardar(id, 'portada', fb.portada, { minLado: 300 }); } catch (err) { avisos.push(`portada: ${err.message}`); } }

    // Primero las fotos en tamaño completo del actor de fotos; las miniaturas de las publicaciones quedan de respaldo
    // (las repetidas se descartan por huella al descargarlas).
    const candidatas = [...F.fotosDePosts(postsIg, 'instagram'), ...fotosDeActorFotos(res.fbFotos?.items), ...F.fotosDePosts(postsFb, 'facebook')];
    const nombre = fb?.nombre || ig?.nombre || '';
    const { fotos, descartadas } = await elegirFotos(id, candidatas, {
      max: Math.min(Number(max_fotos) || 18, 30),
      contexto: [nombre, datos.giro_texto, (fb?.categorias || []).join(', ')].filter(Boolean).join(' — '),
      excluir: [logo?.huella, portada?.huella].filter(Boolean),
      avisos,
    });
    const [capFb, capIg] = await caps;
    const sinHuella = (x) => (x ? { url: x.url, ancho: x.ancho, alto: x.alto, mime: x.mime, orientacion: x.orientacion } : null);

    const resultado = {
      fuentes,
      negocio: {
        nombre: solo(nombre),
        giro_texto: solo(datos.giro_texto),
        categorias: [...new Set([...(fb?.categorias || []), ...(ig?.categorias || [])])],
        descripcion: solo(fb?.descripcion || ig?.descripcion),
        ciudad: solo(datos.ciudad || ig?.ciudad),
        estado: solo(datos.estado),
        direccion: solo(fb?.direccion || ig?.direccion),
        seguidores: { facebook: fb?.seguidores || null, instagram: ig?.seguidores || null },
      },
      contacto: {
        telefono: solo(fb?.telefono || ig?.telefono),
        whatsapp: digitos(fb?.whatsapp || ig?.whatsapp || datos.whatsapp),
        email: solo(fb?.email || ig?.email),
        sitio_web: solo(fb?.sitio_web || ig?.sitio_web),
        horarios: solo(fb?.horarios || datos.horarios),
        redes: { ...(fb?.redes || {}), ...(facebook ? { facebook } : {}), ...(instagram || fb?.redes?.instagram ? { instagram: instagram || fb.redes.instagram } : {}) },
      },
      oferta: { servicios: (datos.servicios || []).filter((s) => s?.nombre).slice(0, 8), promocion_actual: solo(datos.promocion_actual) },
      confianza: { calificacion: fb?.calificacion ?? null, num_resenas: fb?.num_resenas ?? null, texto_resenas: fb?.texto_resenas || null, link_resenas: fb?.num_resenas ? `${facebook.replace(/\/$/, '')}/reviews` : null },
      logo: sinHuella(logo),
      portada: sinHuella(portada),
      capturas: { facebook: capFb, instagram: capIg },
      fotos,
      fotos_descartadas: descartadas,
      avisos,
    };
    const ok = Object.values(fuentes).some((f) => f.ok);
    await q(`UPDATE extracciones SET estado=$2, resultado=$3, error=$4, costo_estimado_usd=$5, actualizado=now() WHERE id=$1`,
      [id, ok ? 'lista' : 'sin_datos', resultado, ok ? null : (avisos.join(' · ') || 'no se pudo leer ninguna red'), costo]);
  } catch (err) {
    console.error('extracción', id, err);
    await q(`UPDATE extracciones SET estado='error', error=$2, costo_estimado_usd=$3, actualizado=now() WHERE id=$1`, [id, String(err.message).slice(0, 500), costo]);
  }
}

// Cola simple en memoria + barrido de pendientes (por si se reinicia el servicio).
const enCurso = new Set();
async function bombear() {
  if (enCurso.size >= MAX_PARALELO) return;
  const r = await q(`SELECT id FROM extracciones WHERE estado='pendiente' ORDER BY creado LIMIT $1`, [MAX_PARALELO]);
  for (const { id } of r.rows) {
    if (enCurso.has(id) || enCurso.size >= MAX_PARALELO) continue;
    enCurso.add(id);
    procesar(id).finally(() => { enCurso.delete(id); bombear().catch(() => {}); });
  }
}
setInterval(() => bombear().catch((e) => console.error('bombear', e)), 15000);

// ---------------- HTTP ----------------
const app = new Hono();
const igual = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return y.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); };
app.use('/v1/*', async (c, next) => { if (!igual(c.req.header('x-api-key'), API_KEY)) return c.json({ error: 'X-API-Key inválida' }, 401); return next(); });

app.get('/health', (c) => c.json({ ok: true, apify: A.hayApify(), claude: hayClaude(), render: !!RENDER_URL, en_curso: enCurso.size }));

app.post('/v1/extracciones', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const facebook = F.urlFacebook(b.facebook);
  const instagram = F.urlInstagram(b.instagram);
  if (!facebook && !instagram) return c.json({ error: 'manda una liga válida de facebook o instagram' }, 400);
  // Misma liga en las últimas 24 h: se reutiliza (el cliente puede repetir el mensaje y no hay que pagar dos veces).
  const previa = (await q(`SELECT id, estado FROM extracciones WHERE entrada->>'facebook' IS NOT DISTINCT FROM $1 AND entrada->>'instagram' IS NOT DISTINCT FROM $2
    AND estado IN ('pendiente','procesando','lista') AND creado > now() - interval '24 hours' ORDER BY creado DESC LIMIT 1`, [facebook, instagram])).rows[0];
  if (previa && !b.forzar) return c.json({ id: previa.id, estado: previa.estado, reutilizada: true }, 202);
  const id = crypto.randomUUID();
  const entrada = { facebook, instagram, max_fotos: b.max_fotos || 18, captura: b.captura !== false };
  await q(`INSERT INTO extracciones (id, referencia, entrada) VALUES ($1,$2,$3)`, [id, b.referencia ? String(b.referencia).slice(0, 120) : null, entrada]);
  bombear().catch(() => {});
  return c.json({ id, estado: 'pendiente', entrada }, 202);
});

app.get('/v1/extracciones/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return c.json({ error: 'id inválido' }, 400);
  const f = (await q(`SELECT id, referencia, entrada, estado, resultado, error, creado, actualizado FROM extracciones WHERE id=$1`, [id])).rows[0];
  return f ? c.json(f) : c.json({ error: 'no existe' }, 404);
});

app.get('/v1/gasto', async (c) => c.json(await gasto()));
app.post('/v1/gasto', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const usd = Number(b.usd);
  if (!b.fuente || !Number.isFinite(usd) || usd < 0) return c.json({ error: 'fuente y usd requeridos' }, 400);
  await q(`INSERT INTO gasto_scrapers (fuente, usd, nota) VALUES ($1,$2,$3)`, [String(b.fuente).slice(0, 40), usd, b.nota ? String(b.nota).slice(0, 300) : null]);
  return c.json(await gasto());
});

app.get('/files/:id/:archivo', async (c) => {
  const { id, archivo } = c.req.param();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[a-z0-9_-]+\.(jpg|png)$/i.test(archivo)) return c.text('no', 404);
  try {
    const buf = await fs.readFile(path.join(carpetaArchivos(), id, archivo));
    return c.body(buf, 200, { 'content-type': archivo.endsWith('.png') ? 'image/png' : 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*' });
  } catch { return c.text('no existe', 404); }
});

serve({ fetch: app.fetch, port: PORT }, () => console.log(`extractor-redes en :${PORT}`));
bombear().catch(() => {});
