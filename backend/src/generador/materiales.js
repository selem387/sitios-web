// Materiales del cliente → listos para diseño: clasificación con visión, recorte de capturas de pantalla,
// extracción del logo, del menú (con precios) y de fotos de producto, colores del logo y lista de faltantes.
// Lo usan las opciones de diseño (B7/B8) y el generador. El análisis se guarda en assets.analisis.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from '../config.js';
import * as db from '../entrevista/db.js';

const DIR = path.join(config.dataDir, 'chat'); // se sirve en /chat/archivos/
const urlPublica = (nombre) => `${config.publicUrl}/chat/archivos/${nombre}`;
const MIN_HERO = 900;   // ancho mínimo para foto de portada
const MIN_FOTO = 420;   // ancho mínimo para galería
const MIN_LOGO = 160;

const PROMPT = `Analiza esta imagen que un emprendedor mandó para su página web. Responde SOLO con JSON:
{
 "tipo": "logo" | "foto_producto" | "foto_local" | "foto_equipo" | "foto_fundador" | "menu" | "flyer" | "documento" | "otro",
 "es_captura_pantalla": boolean,           // captura de celular/computadora (barras de estado, navegador, botones de app)
 "contenido": {"x":0,"y":0,"w":1,"h":1},    // caja del contenido útil SIN barras del sistema/navegador/app ni márgenes vacíos, en fracciones 0-1 de ancho y alto
 "logo": {"x":..,"y":..,"w":..,"h":..} | null, // caja ajustada del logotipo del negocio si aparece (símbolo + nombre), en fracciones
 "productos": [{"nombre":"", "x":..,"y":..,"w":..,"h":..}], // fotos de producto individuales que se puedan recortar limpias (máx 6)
 "menu": [{"seccion":"", "items":[{"nombre":"", "descripcion":"", "precio":""}]}] | null, // si es menú o lista de precios: transcribe TODO tal cual, precios con $
 "colores": ["#RRGGBB"],                    // 3-5 colores dominantes del diseño de la marca
 "calidad": "buena" | "regular" | "mala",
 "descripcion": ""                          // una frase en español
}`;

async function visionJSON(buf, mime) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.generadorModel || config.anthropicModel, max_tokens: 4000,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } },
        { type: 'text', text: PROMPT },
      ] }],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Claude visión: ${j?.error?.message || res.status}`);
  const t = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const i = t.indexOf('{'), k = t.lastIndexOf('}');
  return JSON.parse(t.slice(i, k + 1));
}

async function descargar(url) {
  // Archivos del chat: leer del disco (evita ida y vuelta por internet).
  const m = url.match(/\/chat\/archivos\/([\w-]+\.[a-z0-9]+)$/);
  if (m && url.startsWith(config.publicUrl)) return fs.readFile(path.join(DIR, m[1]));
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`descarga ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const caja = (b, W, H, margen = 0) => {
  if (!b || !(b.w > 0) || !(b.h > 0)) return null;
  const x = Math.max(0, Math.floor((b.x - margen) * W)), y = Math.max(0, Math.floor((b.y - margen) * H));
  const w = Math.min(W - x, Math.ceil((b.w + 2 * margen) * W)), h = Math.min(H - y, Math.ceil((b.h + 2 * margen) * H));
  return w > 10 && h > 10 ? { left: x, top: y, width: w, height: h } : null;
};

async function guardar(img, prefijo, formato = 'jpg') {
  await fs.mkdir(DIR, { recursive: true });
  const nombre = `${prefijo}-${crypto.randomBytes(9).toString('base64url').replace(/_/g, '-')}.${formato}`;
  const out = formato === 'png' ? img.png() : img.jpeg({ quality: 86, mozjpeg: true });
  const info = await out.toFile(path.join(DIR, nombre));
  return { url: urlPublica(nombre), ancho: info.width, alto: info.height };
}

/** Colores dominantes por cuantización simple (sin fondo blanco/negro puro). */
async function coloresDe(buf) {
  const { data } = await sharp(buf).resize(48, 48, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const cubos = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const l = (r + g + b) / 3;
    if (l > 242 || l < 12) continue;
    const k = `${r >> 5},${g >> 5},${b >> 5}`;
    const c = cubos.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    c.n++; c.r += r; c.g += g; c.b += b; cubos.set(k, c);
  }
  return [...cubos.values()].sort((a, b) => b.n - a.n).slice(0, 4)
    .map((c) => '#' + [c.r / c.n, c.g / c.n, c.b / c.n].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase());
}

/** Analiza (o reutiliza el análisis guardado de) un asset de imagen y genera sus recortes. */
export async function analizarAsset(a) {
  if (a.analisis?.version === 2) return a.analisis;
  const original = await descargar(a.url);
  const base = sharp(original).rotate();
  const meta = await base.metadata();
  const W = meta.width, H = meta.height;
  // Para el modelo: lado largo ≤ 1568 px; las cajas vienen en fracciones, así que sirven para el original.
  const vista = await sharp(original).rotate().resize(1568, 1568, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const v = await visionJSON(vista, 'image/jpeg');
  const out = { version: 2, tipo: v.tipo, es_captura: !!v.es_captura_pantalla, calidad: v.calidad, descripcion: v.descripcion, colores: (v.colores || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)), menu: v.menu || null, ancho: W, alto: H };

  const cont = caja(v.contenido, W, H) || { left: 0, top: 0, width: W, height: H };
  const recorteContenido = sharp(original).rotate().extract(cont);
  if (v.es_captura_pantalla || cont.width < W * 0.97 || cont.height < H * 0.97) {
    out.contenido = await guardar(recorteContenido, 'rec');
  } else {
    out.contenido = { url: a.url, ancho: W, alto: H };
  }
  const lb = v.tipo === 'logo' ? cont : caja(v.logo, W, H, 0.01);
  if (lb) {
    const buf = await sharp(original).rotate().extract(lb).trim({ threshold: 18 }).png().toBuffer().catch(() => null);
    if (buf) {
      const g = await guardar(sharp(buf), 'logo', 'png');
      out.logo = { ...g, colores: await coloresDe(buf).catch(() => []) };
    }
  }
  out.productos = [];
  for (const p of (v.productos || []).slice(0, 6)) {
    const b = caja(p, W, H);
    if (!b || b.width < 120) continue;
    out.productos.push({ nombre: p.nombre || '', ...(await guardar(sharp(original).rotate().extract(b), 'prod')) });
  }
  await db.q(`UPDATE assets SET analisis=$2, tipo=COALESCE(NULLIF($3,''), tipo), calidad=COALESCE($4, calidad), descripcion_ia=COALESCE(descripcion_ia,$5) WHERE id=$1`,
    [a.id, JSON.stringify(out), mapaTipo(v.tipo), ['buena', 'regular', 'mala'].includes(v.calidad) ? v.calidad : null, v.descripcion || null]).catch(() => {});
  return out;
}
const mapaTipo = (t) => (['logo', 'foto_producto', 'foto_local', 'foto_equipo', 'foto_fundador', 'documento'].includes(t) ? t : t === 'menu' ? 'menu' : t === 'flyer' ? 'foto_otro' : '');

// Palabras de color que da el cliente en la entrevista → hex aproximado.
const COLORES = {
  cafe: '#6F4E37', 'café': '#6F4E37', marron: '#7B4B2A', 'marrón': '#7B4B2A', chocolate: '#4E2A1E', beige: '#E8DCC4', crema: '#F3E9D2', arena: '#D8C3A5',
  verde: '#2E7D4F', 'verde olivo': '#6B7A3A', menta: '#9ED9C0', azul: '#1E4E8C', marino: '#1B2A4A', celeste: '#7FB8E6', turquesa: '#1AA6A6',
  rojo: '#B23A3A', vino: '#6D1F2F', rosa: '#E58FA8', naranja: '#E07A2E', amarillo: '#E8B931', mostaza: '#C9A227', dorado: '#B8913A',
  negro: '#151515', gris: '#6B6B6B', blanco: '#FFFFFF', morado: '#5B3A8C', lila: '#B49BD6', terracota: '#C0603B',
};
export function coloresDePalabras(lista = []) {
  return lista.map((c) => {
    const s = String(c).toLowerCase().trim();
    if (/^#?[0-9a-f]{6}$/i.test(s)) return s.startsWith('#') ? s.toUpperCase() : `#${s.toUpperCase()}`;
    const k = Object.keys(COLORES).sort((a, b) => b.length - a.length).find((w) => s.includes(w));
    return k ? COLORES[k] : null;
  }).filter(Boolean);
}

/**
 * Procesa todos los materiales de una entrevista.
 * @returns {{logo, hero, fotos[], menus[], menu_texto[], colores[], faltan[], avisos[]}}
 */
export async function procesarMateriales(entrevistaId, brief = {}, { aceptarLoQueHay = false } = {}) {
  const assets = (await db.assetsDe(entrevistaId)).filter((a) => a.usar && /\.(jpe?g|png|webp|heic)(\?|$)/i.test(a.url) || (a.usar && /^image\//.test(a.mime || '')));
  const res = { logo: null, hero: null, fotos: [], menus: [], otras: [], menu_texto: [], colores: [], faltan: [], avisos: [], total_imagenes: assets.length };
  const analisis = [];
  for (const a of assets.slice(0, 20)) {
    try { analisis.push({ a, r: await analizarAsset(a) }); }
    catch (e) { res.avisos.push(`No pude analizar ${a.clave}: ${e.message}`); }
  }
  // Logo: el de mayor tamaño entre los detectados.
  const logos = analisis.filter((x) => x.r.logo).map((x) => x.r.logo).sort((p, q) => q.ancho * q.alto - p.ancho * p.alto);
  if (logos[0]) res.logo = logos[0];
  // Fotos reales (no capturas de menú/flyer).
  for (const { a, r } of analisis) {
    if (/^foto_/.test(r.tipo) && r.calidad !== 'mala' && r.contenido.ancho >= MIN_FOTO) res.fotos.push({ url: r.contenido.url, ancho: r.contenido.ancho, alto: r.contenido.alto, alt: r.descripcion || '', tipo: r.tipo, clave: a.clave });
    if (r.tipo === 'menu') { res.menus.push({ url: r.contenido.url, ancho: r.contenido.ancho, alto: r.contenido.alto, alt: r.descripcion || 'Menú' }); }
    // Regla: ninguna imagen del cliente se omite. Lo que no es foto, menú ni logo puro va a la galería.
    else if (!/^foto_/.test(r.tipo) && r.tipo !== 'logo' && r.tipo !== 'documento') res.otras.push({ url: r.contenido.url, ancho: r.contenido.ancho, alto: r.contenido.alto, alt: r.descripcion || '' });
    else if (/^foto_/.test(r.tipo) && (r.calidad === 'mala' || r.contenido.ancho < MIN_FOTO)) res.otras.push({ url: r.contenido.url, ancho: r.contenido.ancho, alto: r.contenido.alto, alt: r.descripcion || '' });
    if (r.menu?.length) res.menu_texto.push(...r.menu);
    for (const p of r.productos || []) if (p.ancho >= MIN_FOTO) res.fotos.push({ url: p.url, ancho: p.ancho, alto: p.alto, alt: p.nombre, tipo: 'foto_producto' });
  }
  const vertical = brief.fotos?.vertical_hero_asset_id;
  const elegida = vertical && analisis.find((x) => String(x.a.id) === String(vertical) || x.a.clave === vertical);
  const candidatas = res.fotos.filter((f) => f.ancho >= MIN_HERO).sort((p, q) => (q.tipo === 'foto_local') - (p.tipo === 'foto_local') || q.ancho - p.ancho);
  res.hero = elegida && /^foto_/.test(elegida.r.tipo) && elegida.r.contenido.ancho >= MIN_HERO ? { url: elegida.r.contenido.url, alt: elegida.r.descripcion } : candidatas[0] || null;
  res.colores = [...new Set([...(res.logo?.colores || []), ...coloresDePalabras(brief.marca?.colores || [])])].slice(0, 5);

  // Si el cliente ya dijo que no tiene mejores, se trabaja con lo que mandó: la mejor imagen disponible va a la portada.
  if (!res.hero && aceptarLoQueHay) {
    const resto = [...res.fotos, ...res.otras, ...res.menus].sort((p, q) => q.ancho * q.alto - p.ancho * p.alto);
    if (resto[0]) res.hero = { url: resto[0].url, alt: resto[0].alt, provisional: true };
  }
  res.material_suficiente = !!res.hero && (!!res.logo || brief.marca?.tiene_logo === false);
  if (aceptarLoQueHay) return res;
  // Lo mínimo para una primera propuesta digna.
  if (brief.marca?.tiene_logo !== false && !res.logo) res.faltan.push({ que: 'logo', pedir: 'tu logotipo en archivo (PNG o JPG, de preferencia con fondo blanco o transparente)' });
  else if (res.logo && res.logo.ancho < MIN_LOGO) res.faltan.push({ que: 'logo_resolucion', pedir: 'tu logotipo en mejor resolución (el que tengo se ve pequeño); el archivo original de Canva o de tu diseñador sirve' });
  if (!res.hero) res.faltan.push({ que: 'foto_portada', pedir: '2 o 3 fotos reales de tu negocio para la portada (tu local, tus productos o tu equipo), tomadas con el celular en vertical y con buena luz; no capturas de pantalla' });
  return res;
}
