// Descarga, rehospeda y filtra con visión las fotos de las redes.
// Las ligas de Facebook/Instagram caducan en horas: todo se guarda en el volumen y se sirve desde /files.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { pedirJSON, hayClaude, MODELO_VISION } from './claude.js';

const DATA = process.env.DATA_DIR || '/data';
const PUBLIC = (process.env.PUBLIC_URL || 'http://localhost:8080').replace(/\/$/, '');
const LADO_MIN = Number(process.env.FOTO_LADO_MIN || 480);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

export const carpetaArchivos = () => path.join(DATA, 'files');

async function bajarDe(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, referer: 'https://www.instagram.com/' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`descarga ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 2000) throw new Error('archivo vacío');
  return buf;
}

// Apify entrega ligas de fbcdn con servidores regionales (p. ej. scontent.fcps3-1.fna.fbcdn.net) que a veces no
// resuelven desde nuestro servidor; la misma liga con el servidor genérico scontent.xx.fbcdn.net sí descarga.
async function bajar(url) {
  try {
    return await bajarDe(url);
  } catch (err) {
    let alterna = null;
    try { const u = new URL(url); if (/\.fbcdn\.net$/i.test(u.hostname) && u.hostname !== 'scontent.xx.fbcdn.net') { u.hostname = 'scontent.xx.fbcdn.net'; alterna = u.toString(); } } catch { /* liga inválida */ }
    if (!alterna) throw err;
    return bajarDe(alterna);
  }
}

// Huella de 64 bits (promedio de grises 8x8) para no guardar dos veces la misma foto con otro tamaño o recorte leve.
async function huella(buf) {
  const px = await sharp(buf).resize(8, 8, { fit: 'fill' }).grayscale().raw().toBuffer();
  const prom = px.reduce((a, b) => a + b, 0) / px.length;
  return [...px].map((v) => (v >= prom ? '1' : '0')).join('');
}
const distancia = (a, b) => [...a].reduce((n, c, i) => n + (c !== b[i]), 0);

/** Guarda una imagen como JPG (o PNG si trae transparencia, p. ej. un logo). */
export async function guardar(trabajoId, nombre, url, { minLado = LADO_MIN, esLogo = false } = {}) {
  const buf = await bajar(url);
  const img = sharp(buf, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const ancho = meta.autoOrient?.width || meta.width; const alto = meta.autoOrient?.height || meta.height;
  if (!ancho || !alto) throw new Error('no es imagen');
  if (Math.min(ancho, alto) < minLado) throw new Error(`muy chica (${ancho}x${alto})`);
  const png = esLogo && meta.hasAlpha;
  const salida = await img.resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })[png ? 'png' : 'jpeg'](png ? {} : { quality: 86, mozjpeg: true }).toBuffer();
  const rel = `${trabajoId}/${nombre}.${png ? 'png' : 'jpg'}`;
  await fs.mkdir(path.join(carpetaArchivos(), trabajoId), { recursive: true });
  await fs.writeFile(path.join(carpetaArchivos(), rel), salida);
  const m2 = await sharp(salida).metadata();
  return {
    url: `${PUBLIC}/files/${rel}`,
    ancho: m2.width, alto: m2.height,
    orientacion: m2.width > m2.height * 1.15 ? 'horizontal' : m2.height > m2.width * 1.15 ? 'vertical' : 'cuadrada',
    mime: png ? 'image/png' : 'image/jpeg',
    huella: await huella(salida),
    miniatura: (await sharp(salida).resize({ width: 512, height: 512, fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()).toString('base64'),
  };
}

const ESQUEMA = {
  type: 'object',
  properties: {
    fotos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          i: { type: 'integer' },
          tipo: { type: 'string', enum: ['foto_local', 'foto_producto', 'foto_equipo', 'foto_fundador', 'foto_otro', 'flyer', 'captura', 'meme', 'logo'] },
          tiene_texto_encima: { type: 'boolean' },
          calidad: { type: 'string', enum: ['buena', 'regular', 'mala'] },
          sirve: { type: 'boolean', description: 'true si una agencia la pondría en la página web del negocio tal cual' },
          descripcion: { type: 'string' },
        },
        required: ['i', 'tipo', 'tiene_texto_encima', 'calidad', 'sirve', 'descripcion'],
      },
    },
  },
  required: ['fotos'],
};

async function clasificarLote(lote, contexto) {
  const contenido = [];
  lote.forEach((f, i) => {
    contenido.push({ type: 'text', text: `Foto ${i}${f.texto ? ` (texto de la publicación: "${f.texto.slice(0, 160)}")` : ''}:` });
    contenido.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.miniatura } });
  });
  contenido.push({ type: 'text', text: `Negocio: ${contexto}. Clasifica cada foto (i = número de foto).` });
  const r = await pedirJSON({
    model: MODELO_VISION,
    max_tokens: 1800,
    system: 'Eres el editor de fotos de una agencia que arma páginas web para pequeños negocios con material de sus redes sociales. '
      + 'Descarta (sirve=false) flyers, promociones, anuncios con precios, fechas o texto grande encima, memes, capturas de pantalla, collages, fotos borrosas, oscuras o pixeleadas, '
      + 'y fotos que no muestran el negocio (paisajes genéricos, fotos de stock evidentes). Sirven: el local, sus productos o platillos, trabajos terminados, el equipo o el dueño, clientes usando el servicio. '
      + 'descripcion: una frase en español útil para un diseñador.',
    contenido,
    schema: ESQUEMA,
  });
  const lista = Array.isArray(r.fotos) ? r.fotos : [];
  return lista.filter((x) => Number.isInteger(x.i) && lote[x.i]);
}

const PESO = { buena: 3, regular: 1, mala: -5 };

/**
 * Baja las candidatas, quita repetidas y chicas, las clasifica y regresa las mejores (hasta `max`),
 * intercalando tipos para que no salgan 18 fotos del mismo platillo.
 */
export async function elegirFotos(trabajoId, candidatas, { max = 18, contexto = '', excluir = [], avisos = [] } = {}) {
  const guardadas = [];
  const huellas = [...excluir];
  const fallas = {};
  let n = 0;
  for (const c of candidatas.slice(0, Number(process.env.MAX_CANDIDATAS || 45))) {
    try {
      const g = await guardar(trabajoId, `f${++n}`, c.url);
      if (huellas.some((h) => distancia(h, g.huella) <= 5)) continue;
      huellas.push(g.huella);
      guardadas.push({ ...g, fuente: c.fuente, texto: c.texto });
    } catch (err) {
      const k = String(err.message).replace(/\(\d+x\d+\)/, '').trim();
      fallas[k] = (fallas[k] || 0) + 1;
    }
  }
  if (Object.keys(fallas).length) avisos.push(`fotos no usadas: ${Object.entries(fallas).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  if (!guardadas.length) return { fotos: [], descartadas: 0 };
  let clasif = [];
  if (hayClaude()) {
    for (let i = 0; i < guardadas.length; i += 8) {
      const lote = guardadas.slice(i, i + 8);
      try {
        const r = await clasificarLote(lote, contexto);
        clasif.push(...r.map((x) => ({ ...lote[x.i], ...x })));
      } catch (err) { avisos.push(`clasificación de fotos: ${err.message}`); }
    }
  } else {
    avisos.push('sin ANTHROPIC_API_KEY: fotos sin filtro de visión');
    clasif = guardadas.map((g) => ({ ...g, tipo: 'foto_otro', calidad: 'regular', sirve: true, tiene_texto_encima: false, descripcion: g.texto || '' }));
  }
  const buenas = clasif
    .filter((f) => f.sirve && !f.tiene_texto_encima && !['flyer', 'captura', 'meme', 'logo'].includes(f.tipo) && f.calidad !== 'mala')
    .map((f) => ({ ...f, puntos: PESO[f.calidad] + Math.min(f.ancho, f.alto) / 1000 }))
    .sort((a, b) => b.puntos - a.puntos);
  // Intercalar por tipo.
  const porTipo = new Map();
  for (const f of buenas) { if (!porTipo.has(f.tipo)) porTipo.set(f.tipo, []); porTipo.get(f.tipo).push(f); }
  const elegidas = [];
  while (elegidas.length < max && [...porTipo.values()].some((l) => l.length)) {
    for (const l of porTipo.values()) { if (l.length && elegidas.length < max) elegidas.push(l.shift()); }
  }
  const limpias = elegidas.map(({ miniatura, huella: _h, puntos, i, ...f }) => f);
  return { fotos: limpias, descartadas: guardadas.length - limpias.length };
}
