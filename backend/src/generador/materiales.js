// Materiales del cliente → listos para diseño: clasificación con visión, recorte de capturas de pantalla,
// extracción del logo, del menú (con precios) y de fotos de producto, colores del logo y lista de faltantes.
// Lo usan las opciones de diseño (B5/B6) y el generador. El análisis se guarda en assets.analisis.
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

export const VERSION = 5;
const PROMPT = (negocio) => `Analiza esta imagen que el dueño de "${negocio || 'un negocio'}" mandó para su página web. Responde SOLO con JSON:
{
 "tipo": "logo" | "foto_trabajo" | "foto_producto" | "foto_local" | "foto_equipo" | "foto_fundador" | "captura_resena" | "menu" | "catalogo" | "flyer" | "documento" | "otro",
   // foto_trabajo = muestra de su trabajo/servicio ya hecho (sesión de fotos, corte de pelo, obra, tratamiento, evento, platillo servido con gente, antes/después, propiedad)
   // foto_producto = un objeto que vende (bebida, platillo, artículo) SIN personas como tema principal
   // foto_fundador = el dueño o la dueña; foto_equipo = su equipo; captura_resena = captura de una reseña, comentario o agradecimiento de un cliente
   // catalogo = lista de paquetes, servicios o precios que NO es menú de comida
 "es_captura_pantalla": boolean,           // captura de celular/computadora (barras de estado, navegador, botones de app)
 "contenido": {"x":0,"y":0,"w":1,"h":1},    // caja del contenido útil SIN barras del sistema/navegador/app ni márgenes vacíos, en fracciones 0-1 de ancho y alto
 "logo": {"x":..,"y":..,"w":..,"h":..} | null, // caja ajustada SOLO del logotipo DE ESTE NEGOCIO (símbolo + nombre "${negocio || ''}"); null si no aparece. Fotos de perfil, avatares o logos de otras personas o empresas NO cuentan
 "personas": boolean,                      // hay personas como tema de la imagen
 "aislable": boolean,                      // un solo objeto (bebida, platillo, producto) sin personas, que se vería bien recortado sin fondo
 "productos": [{"nombre":"", "x":..,"y":..,"w":..,"h":..}], // SOLO en menús/flyers: fotos de producto individuales (máx 6). Producto COMPLETO a lo ancho con margen; en vasos solo se corta por abajo. Nombre como aparece en el menú
 "menu": [{"seccion":"", "items":[{"nombre":"", "descripcion":"", "precio":""}]}] | null, // si es menú, catálogo o lista de precios: transcribe TODO tal cual, precios con $
 "resena": {"nombre":"", "texto":""} | null, // si es captura de reseña: quién la escribió y el texto tal cual
 "colores": ["#RRGGBB"],                    // 3-5 colores dominantes del diseño de la marca
 "calidad": "buena" | "regular" | "mala",
 "descripcion": ""                          // una frase en español
}`;

async function visionJSON(buf, mime, negocio) {
  const res = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.generadorModel || config.anthropicModel, max_tokens: 4000,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } },
        { type: 'text', text: PROMPT(negocio) },
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

/** Quita el fondo con el servicio render (rembg). Devuelve null si no está disponible. */
async function sinFondo(url) {
  if (!config.renderUrl) return null;
  try {
    const r = await fetch(`${config.renderUrl}/v1/sin-fondo`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(150000) });
    return r.ok ? r.json() : null;
  } catch { return null; }
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

/** Logo: el color de fondo (esquina) se vuelve transparente con borde suave, y se recorta al contenido. */
async function fondoTransparente(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r0, g0, b0] = [data[0], data[1], data[2]];
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0);
    if (d < 28) data[i + 3] = 0; else if (d < 60) data[i + 3] = Math.min(data[i + 3], Math.round(255 * (d - 28) / 32));
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().png().toBuffer();
}

/** Colores dominantes por cuantización simple (sin fondo blanco/negro puro). */
async function coloresDe(buf) {
  const { data, info } = await sharp(buf).resize(48, 48, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // Color de fondo = el de la esquina superior izquierda: se excluye (si no, el "color de marca" sale beige del fondo).
  const fondo = [data[0], data[1], data[2]];
  const cubos = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const l = (r + g + b) / 3;
    if (l > 242 || l < 12) continue;
    if (Math.abs(r - fondo[0]) + Math.abs(g - fondo[1]) + Math.abs(b - fondo[2]) < 60) continue;
    const k = `${r >> 5},${g >> 5},${b >> 5}`;
    const c = cubos.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    c.n++; c.r += r; c.g += g; c.b += b; cubos.set(k, c);
  }
  return [...cubos.values()].sort((a, b) => b.n - a.n).slice(0, 4)
    .map((c) => '#' + [c.r / c.n, c.g / c.n, c.b / c.n].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase());
}

/** Huella visual (dHash 16x16 = 256 bits). Dos fotos con < 32% de bits distintos son la misma foto (aunque cambie tamaño o recorte). */
async function huella(buf) {
  const { data } = await sharp(buf).rotate().greyscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) bits += data[r * 17 + c] > data[r * 17 + c + 1] ? '1' : '0';
  return bits;
}
export const distanciaHuella = (a, b) => { if (!a || !b || a.length !== b.length) return 1; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d / a.length; };
const MISMA_FOTO = 0.32;

/** Tono del logo (pixeles visibles): claro/oscuro y si es de un solo color. Decide si necesita placa o inversión. */
async function tonoLogo(buf) {
  const { data } = await sharp(buf).ensureAlpha().resize(96, 96, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let n = 0, L = 0, S = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    n++; L += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; S += mx ? (mx - mn) / mx : 0;
  }
  if (!n) return { tono: 'oscuro', mono: true, opaco: 0 };
  return { tono: L / n > 0.6 ? 'claro' : 'oscuro', mono: S / n < 0.15, opaco: n };
}

/** Logo de un solo color pintado del color dado (conserva la transparencia). Se guarda una vez por color. */
export async function logoTenido(logo, hex) {
  if (!logo?.url || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const nombre = `logo-${crypto.createHash('md5').update(logo.url + hex).digest('hex').slice(0, 12)}.png`;
  const destino = path.join(DIR, nombre);
  try { await fs.access(destino); return urlPublica(nombre); } catch {}
  const buf = await descargar(logo.url);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; }
  await fs.mkdir(DIR, { recursive: true });
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(destino);
  return urlPublica(nombre);
}

/** Recorta un área (extract y trim en pasos separados: encadenados en un mismo pipeline sharp falla con "bad extract area"). */
async function recortar(original, area, trim = true) {
  const e = await sharp(original).rotate().extract(area).png().toBuffer();
  if (!trim) return e;
  return sharp(e).trim({ threshold: 18 }).png().toBuffer().catch(() => e);
}

/** Analiza (o reutiliza el análisis guardado de) un asset de imagen y genera sus recortes. */
export async function analizarAsset(a, { negocio = '' } = {}) {
  if (a.analisis?.version === VERSION) {
    if (!a.analisis.huella) {
      a.analisis.huella = await descargar(a.analisis.contenido?.url || a.url).then(huella).catch(() => null);
      if (a.analisis.huella) await db.q(`UPDATE assets SET analisis = analisis || jsonb_build_object('huella', $2::text) WHERE id=$1`, [a.id, a.analisis.huella]).catch(() => {});
    }
    return a.analisis;
  }
  const original = await descargar(a.url);
  const meta = await sharp(original).rotate().metadata();
  const giro = (meta.orientation || 1) >= 5;
  const W = giro ? meta.height : meta.width, H = giro ? meta.width : meta.height;
  // Para el modelo: lado largo ≤ 1568 px; las cajas vienen en fracciones, así que sirven para el original.
  const vista = await sharp(original).rotate().resize(1568, 1568, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const v = await visionJSON(vista, 'image/jpeg', negocio);
  const out = { version: VERSION, tipo: v.tipo, es_captura: !!v.es_captura_pantalla, personas: !!v.personas, aislable: !!v.aislable && !v.personas, calidad: v.calidad, descripcion: v.descripcion,
    colores: (v.colores || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)), menu: v.menu || null, resena: v.resena?.texto ? v.resena : null, ancho: W, alto: H };

  const cont = caja(v.contenido, W, H) || { left: 0, top: 0, width: W, height: H };
  if (v.es_captura_pantalla || cont.width < W * 0.97 || cont.height < H * 0.97) {
    out.contenido = await guardar(sharp(await recortar(original, cont, false)), 'rec');
  } else {
    out.contenido = { url: a.url, ancho: W, alto: H };
  }
  const lb = v.tipo === 'logo' ? cont : caja(v.logo, W, H, 0.01);
  if (lb) {
    try {
      let buf = await recortar(original, lb);
      buf = await fondoTransparente(buf).catch(() => buf);
      const g = await guardar(sharp(buf), 'logo', 'png');
      out.logo = { ...g, colores: await coloresDe(buf).catch(() => []), ...(await tonoLogo(buf).catch(() => ({}))), propio: v.tipo === 'logo' };
    } catch (err) { out.aviso_logo = `No pude recortar el logo: ${err.message}`; }
  }
  out.productos = [];
  for (const p of (v.productos || []).slice(0, 6)) {
    // Margen lateral extra para no cortar los lados del producto (el modelo tiende a ajustar de más).
    const b = caja({ x: p.x - 0.02, y: p.y - 0.01, w: p.w + 0.04, h: p.h + 0.01 }, W, H);
    if (!b || b.width < 120) continue;
    const g = await guardar(sharp(await recortar(original, b, false)), 'prod');
    const sf = await sinFondo(g.url);
    out.productos.push({ nombre: p.nombre || '', ...g, ...(sf ? { url: sf.url, ancho: sf.ancho, alto: sf.alto, sin_fondo: true } : {}) });
  }
  // Producto suelto (un objeto, sin personas): sin fondo para usarlo en portada. Nunca a retratos ni fotos de trabajo.
  if (v.tipo === 'foto_producto' && out.aislable) { const sf = await sinFondo(out.contenido.url); if (sf) out.sin_fondo = sf; }
  out.huella = await huella(out.contenido.url === a.url ? original : await descargar(out.contenido.url)).catch(() => null);
  await db.q(`UPDATE assets SET analisis=$2, tipo=COALESCE(NULLIF($3,''), tipo), calidad=COALESCE($4, calidad), descripcion_ia=COALESCE(descripcion_ia,$5) WHERE id=$1`,
    [a.id, JSON.stringify(out), mapaTipo(v.tipo), ['buena', 'regular', 'mala'].includes(v.calidad) ? v.calidad : null, v.descripcion || null]).catch(() => {});
  return out;
}
const mapaTipo = (t) => (['logo', 'foto_trabajo', 'foto_producto', 'foto_local', 'foto_equipo', 'foto_fundador', 'captura_resena', 'catalogo', 'documento', 'menu'].includes(t) ? t : t === 'flyer' ? 'foto_otro' : '');

// Palabras de color que da el cliente en la entrevista → hex aproximado.
const COLORES = {
  cafe: '#6F4E37', 'café': '#6F4E37', marron: '#7B4B2A', 'marrón': '#7B4B2A', chocolate: '#4E2A1E', beige: '#E8DCC4', crema: '#F3E9D2', arena: '#D8C3A5',
  verde: '#2E7D4F', 'verde olivo': '#6B7A3A', menta: '#9ED9C0', azul: '#1E4E8C', marino: '#1B2A4A', celeste: '#7FB8E6', turquesa: '#1AA6A6',
  rojo: '#B23A3A', vino: '#6D1F2F', rosa: '#E58FA8', naranja: '#E07A2E', amarillo: '#E8B931', mostaza: '#C9A227', dorado: '#B8913A',
  negro: '#151515', gris: '#6B6B6B', blanco: '#FFFFFF', morado: '#5B3A8C', lila: '#B49BD6', terracota: '#C0603B',
};
// "pastel" solo → familia pastel; "rosa pastel" → rosa aclarado.
const PASTELES = ['#F2C4CE', '#CDE6D8', '#D8CDEE', '#F8DCC4', '#CFE2F3'];
const aclarar = (h, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
export function coloresDePalabras(lista = []) {
  return lista.flatMap((c) => {
    const s = String(c).toLowerCase().trim();
    if (/^#?[0-9a-f]{6}$/i.test(s)) return [s.startsWith('#') ? s.toUpperCase() : `#${s.toUpperCase()}`];
    const k = Object.keys(COLORES).sort((a, b) => b.length - a.length).find((w) => s.includes(w));
    if (/pastel/.test(s)) return k ? [aclarar(COLORES[k], 0.6)] : PASTELES;
    return k ? [COLORES[k]] : [];
  });
}
export const esPastel = (brief) => (brief?.marca?.colores || []).some((c) => /pastel/i.test(String(c)));

/**
 * Procesa todos los materiales de una entrevista.
 * @returns {{logo, hero, fotos[], menus[], menu_texto[], colores[], faltan[], avisos[]}}
 */
export async function procesarMateriales(entrevistaId, brief = {}, opts = {}) {
  const res = await procesarMaterialesBase(entrevistaId, brief, opts);
  return conVariacionesIA(res, brief);
}

/**
 * Slider de portada (6-nov-2026): si el cliente tiene menos de 3 fotos buenas, Ari le pide más una vez (B6.7).
 * Si dice que no tiene (fotos.no_tiene_mas), se agregan variaciones IA muy parecidas a su foto principal
 * (generador/clips.js), solo para completar el slider. Quedan marcadas ia:true y en caché; si no se puede, no pasa nada.
 */
async function conVariacionesIA(res, brief) {
  if (brief.fotos?.no_tiene_mas !== true || brief.fotos?.permiso_generar_ia === false || !res.hero) return res;
  const buenas = [...res.trabajos, ...res.local].filter((x) => !x.captura && x.calidad !== 'regular');
  const faltan = Math.min(2, 3 - buenas.length);
  if (faltan < 1) return res;
  const { variacionesFoto } = await import('./clips.js');
  const vars = await variacionesFoto(res.hero, faltan).catch(() => []);
  return vars.length ? { ...res, trabajos: [...res.trabajos, ...vars] } : res;
}

async function procesarMaterialesBase(entrevistaId, brief = {}, { aceptarLoQueHay = false } = {}) {
  const todos = (await db.assetsDe(entrevistaId)).filter((a) => a.usar);
  const esImagen = (a) => /\.(jpe?g|png|webp|heic)(\?|$)/i.test(a.url) || /^image\//.test(a.mime || '');
  const assets = todos.filter(esImagen);
  const res = { logo: null, hero: null, fundador: null, fotos: [], trabajos: [], equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [],
    menu_texto: [], colores: [], faltan: [], avisos: [], usables: [], total_imagenes: assets.length };
  // Regla dura: TODO lo que mandó el cliente se usa. usables = cada asset con todas las URLs que lo representan (para el validador).
  for (const a of todos.filter((x) => !esImagen(x))) {
    const item = { url: a.url, alt: a.descripcion_ia || a.nota || a.clave, tipo: a.tipo, clave: a.clave };
    (/^video\//.test(a.mime || '') || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(a.url) ? res.videos : res.documentos).push(item);
    res.usables.push({ id: a.id, clave: a.clave, tipo: a.tipo, urls: [a.url] });
  }
  const analisis = [];
  const negocio = brief.negocio?.nombre || '';
  for (const a of assets.slice(0, 60)) {
    try { analisis.push({ a, r: await analizarAsset(a, { negocio }) }); }
    catch (e) { res.avisos.push(`No pude analizar ${a.clave}: ${e.message}`); res.otras.push({ url: a.url, alt: a.descripcion_ia || '', clave: a.clave }); res.usables.push({ id: a.id, clave: a.clave, tipo: a.tipo, urls: [a.url] }); }
  }
  // REGLA DURA: ninguna foto se repite. Si el cliente mandó la misma foto dos veces (aunque cambie tamaño o recorte),
  // se usa una sola vez: la de mayor resolución; las URLs de la copia cuentan como usadas para el validador.
  const copias = new Map(); // id copia → asset que se queda
  const porArea = [...analisis].filter((x) => x.r.tipo !== 'logo' && x.r.huella).sort((p, q) => (q.r.contenido.ancho * q.r.contenido.alto) - (p.r.contenido.ancho * p.r.contenido.alto));
  for (let i = 0; i < porArea.length; i++) {
    if (copias.has(porArea[i].a.id)) continue;
    for (let j = i + 1; j < porArea.length; j++) {
      if (!copias.has(porArea[j].a.id) && distanciaHuella(porArea[i].r.huella, porArea[j].r.huella) < MISMA_FOTO) copias.set(porArea[j].a.id, porArea[i]);
    }
  }
  res.duplicadas = [...copias].map(([id, k]) => ({ copia: analisis.find((x) => x.a.id === id)?.a.clave, se_queda: k.a.clave }));
  // Logo: primero los de un asset que ES el logo; los detectados dentro de otras imágenes solo si no hay, y nunca miniaturas.
  const logos = analisis.filter((x) => x.r.logo).map((x) => ({ ...x.r.logo, propio: x.r.tipo === 'logo' || x.r.logo.propio }))
    .filter((l, _, arr) => l.propio || (!arr.some((o) => o.propio) && l.ancho >= MIN_LOGO))
    .sort((p, q) => (q.propio - p.propio) || (q.ancho * q.alto - p.ancho * p.alto));
  if (logos[0]) res.logo = logos[0];
  const ficha = (a, r, extra = {}) => ({ url: r.contenido.url, ancho: r.contenido.ancho, alto: r.contenido.alto, alt: r.descripcion || '', tipo: r.tipo, clave: a.clave, ...extra });
  const urlsDe = (a, r) => [a.url, r.contenido?.url, r.sin_fondo?.url, r.logo?.url, ...(r.productos || []).map((p) => p.url)].filter(Boolean);
  for (const { a, r } of analisis) {
    const original = copias.get(a.id);
    // Copia de otra foto: no se muestra; cuenta como usada a través de la foto que se queda.
    res.usables.push({ id: a.id, clave: a.clave, tipo: r.tipo, urls: original ? [...urlsDe(a, r), ...urlsDe(original.a, original.r)] : urlsDe(a, r) });
    if (original) continue;
    if (r.tipo === 'logo') continue; // se usa como logo (su URL recortada está en usables)
    const f = ficha(a, r, { sin_fondo: r.sin_fondo?.url || null, personas: r.personas, captura: r.es_captura, calidad: r.calidad });
    const chica = r.calidad === 'mala' || r.contenido.ancho < MIN_FOTO;
    if (/^foto_/.test(r.tipo) && !chica) res.fotos.push(f);
    if (r.tipo === 'foto_fundador') { if (!res.fundador || f.ancho > res.fundador.ancho) { if (res.fundador) res.equipo.push(res.fundador); res.fundador = f; } else res.equipo.push(f); }
    else if (r.tipo === 'foto_equipo') res.equipo.push(f);
    else if (r.tipo === 'foto_local') res.local.push(f);
    else if (r.tipo === 'foto_trabajo' || (r.tipo === 'foto_producto' && !r.aislable)) res.trabajos.push(f);
    else if (r.tipo === 'captura_resena') res.resenas.push({ ...f, resena: r.resena });
    else if (r.tipo === 'catalogo') res.catalogos.push(f);
    else if (r.tipo === 'menu') res.menus.push({ ...f, alt: r.descripcion || 'Menú' });
    else if (r.tipo !== 'foto_producto') res.otras.push(f);
    if (r.menu?.length) res.menu_texto.push(...r.menu.map((s) => ({ ...s, origen: r.tipo })));
    // Recortes de producto (de menús/flyers): van a destacados aunque sean pequeños; nunca a la portada si < MIN_HERO.
    for (const p of r.productos || []) res.fotos.push({ url: p.url, ancho: p.ancho, alto: p.alto, alt: p.nombre, tipo: 'foto_producto', sin_fondo: p.sin_fondo ? p.url : null, recorte: true });
  }
  const vertical = brief.fotos?.vertical_hero_asset_id;
  const elegida0 = vertical && analisis.find((x) => String(x.a.id) === String(vertical) || x.a.clave === vertical);
  const elegida = elegida0 && (copias.get(elegida0.a.id) || elegida0);
  const prioridad = (t) => ({ foto_local: 3, foto_trabajo: 2, foto_fundador: 1 }[t] || 0);
  const candidatas = res.fotos.filter((f) => f.ancho >= MIN_HERO && !f.recorte).sort((p, q) => prioridad(q.tipo) - prioridad(p.tipo) || q.ancho - p.ancho);
  res.hero = elegida && /^foto_/.test(elegida.r.tipo) && elegida.r.contenido.ancho >= MIN_HERO ? { url: elegida.r.contenido.url, alt: elegida.r.descripcion, tipo: elegida.r.tipo } : candidatas[0] || null;
  // Lo que dijo el cliente manda sobre los colores detectados en el logo.
  res.colores = [...new Set([...coloresDePalabras(brief.marca?.colores || []), ...(res.logo?.colores || [])])].slice(0, 6);

  // Si el cliente ya dijo que no tiene mejores, se trabaja con lo que mandó: la mejor imagen disponible va a la portada.
  if (!res.hero && aceptarLoQueHay) {
    // Primero un producto recortado sin fondo (se ve bien sobre el color de la portada); si no, la imagen más grande.
    const prod = res.fotos.filter((f) => f.sin_fondo).sort((p, q) => q.alto - p.alto)[0];
    const resto = [...res.fotos, ...res.otras, ...res.menus].sort((p, q) => q.ancho * q.alto - p.ancho * p.alto);
    if (prod) res.hero = { url: prod.sin_fondo, alt: prod.alt, sin_fondo: true, provisional: true };
    else if (resto[0]) res.hero = { url: resto[0].url, alt: resto[0].alt, provisional: true };
  }
  res.material_suficiente = !!res.hero && (!!res.logo || brief.marca?.tiene_logo === false);
  if (aceptarLoQueHay) return res;
  // Lo mínimo para una primera propuesta digna.
  if (brief.marca?.tiene_logo !== false && !res.logo) res.faltan.push({ que: 'logo', pedir: 'tu logotipo en archivo (PNG o JPG, de preferencia con fondo blanco o transparente)' });
  else if (res.logo && res.logo.ancho < MIN_LOGO) res.faltan.push({ que: 'logo_resolucion', pedir: 'tu logotipo en mejor resolución (el que tengo se ve pequeño); el archivo original de Canva o de tu diseñador sirve' });
  if (!res.hero) res.faltan.push({ que: 'foto_portada', pedir: '2 o 3 fotos reales de tu negocio para la portada (tu local, tus productos o tu equipo), tomadas con el celular en vertical y con buena luz; no capturas de pantalla' });
  return res;
}
