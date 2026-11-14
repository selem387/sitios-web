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
 "aislable": boolean,                      // un solo producto EN SU ENVASE o para llevar (bebida en vaso o botella, frasco, caja, bolsa, artículo), sin personas, que se vería bien recortado sin fondo. NUNCA comida servida en plato, molcajete, tabla o mesa: un platillo servido se muestra con su fondo (false)
 "productos": [{"nombre":"", "x":..,"y":..,"w":..,"h":..}], // SOLO en menús/flyers: fotos de producto individuales (máx 6). Producto COMPLETO a lo ancho con margen; en vasos solo se corta por abajo. Nombre como aparece en el menú
 "menu": [{"seccion":"", "items":[{"nombre":"", "descripcion":"", "precio":""}]}] | null, // si es menú, catálogo o lista de precios: transcribe TODO tal cual, precios con $
 "resena": {"nombre":"", "texto":""} | null, // si es captura de reseña: quién la escribió y el texto tal cual
 "colores": ["#RRGGBB"],                    // 3-5 colores dominantes del diseño de la marca
 "calidad": "buena" | "regular" | "mala",
 "nombre": "",                              // si es foto de producto o trabajo: cómo lo llamaría un cliente, 2 a 5 palabras (p. ej. "Blusa bordada de flores")
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

/**
 * Nombre corto de cada foto de producto/trabajo (10-nov-2026): lo usa "+ info" para pedir informes por WhatsApp
 * llamando al producto por su nombre. Las fotos analizadas antes de existir el campo se nombran en una sola llamada de
 * texto (con los nombres de productos del cliente como referencia) y se guarda en el análisis para no repetirlo.
 */
/** Artículo de respaldo por la primera palabra (si la IA no lo dio). */
export function articuloDe(nombre = '') {
  const w = String(nombre).trim().split(/\s+/)[0].toLowerCase();
  if (/^(miel|sal|piel|flor|leche|carne|crema|mano)$/.test(w)) return 'la';
  if (/as$/.test(w)) return 'las';
  if (/(os|es)$/.test(w)) return 'los';
  if (/(a|ión|dad|tud)$/.test(w) && !/^(día|mapa|sofá|problema|tema|sistema|programa)$/.test(w)) return 'la';
  return 'el';
}
async function nombrarFotos(analisis, brief = {}) {
  const faltan = analisis.filter(({ r }) => (!r.nombre || !r.articulo) && r.descripcion && /^foto/.test(r.tipo || ''));
  if (!faltan.length) return;
  const productos = (brief.oferta?.items || []).map((x) => x?.nombre).filter(Boolean).slice(0, 30);
  const lista = faltan.map(({ r }, i) => `${i + 1}. ${r.descripcion}`).join('\n');
  const res = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.anthropicModel, max_tokens: 1500,
      messages: [{ role: 'user', content: `Da a cada foto un nombre corto de producto (2 a 5 palabras, en español, como lo pediría un cliente; sin "modelo", "mujer" ni "foto"). El nombre SIEMPRE empieza con el tipo de producto o servicio (p. ej. "Blusa blanca con flores", "Vestido bordado de venado", "Hamaca de algodón"), nunca con un color o adjetivo suelto. Cada nombre debe distinguir esa foto de las demás de la lista (color, detalle del bordado, tela, figura): no repitas el mismo nombre en dos fotos. Si coincide con uno de estos productos del negocio, usa ese término: ${productos.join(', ') || '(sin lista)'}.\n\nFotos:\n${lista}\n\nPara cada nombre da también su artículo definido en español ("el", "la", "los" o "las") según el género y número del producto. Responde solo JSON: {"nombres":["...", ...], "articulos":["la", ...]} en el mismo orden.` }],
    }),
    signal: AbortSignal.timeout(60000),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error?.message || res.status);
  const t = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const resp = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  const nombres = resp.nombres || [], articulos = resp.articulos || [];
  for (let i = 0; i < faltan.length; i++) {
    let n = String(nombres[i] || '').trim().slice(0, 60);
    // Respaldo: un nombre que empieza con color o adjetivo ("blanca con flores") se completa con el producto de la descripción.
    if (/^(blanc|negr|roj|azul|verd|amarill|morad|rosa|gris|caf|dorad|plat|grande|pequeñ|chic|bonit|nuev|tradicional|artesanal|bordad)/i.test(n)) {
      const prod = (faltan[i].r.descripcion.match(/\b(blusa|vestido|guayabera|hamaca|huipil|terno|falda|camisa|bolsa|sombrero|miel|rebozo|pantal[oó]n|filipina|jarr[oó]n|plato|collar|aretes?)\b/i) || [])[1];
      if (prod) n = `${prod} ${n.toLowerCase()}`;
    }
    n = n.charAt(0).toUpperCase() + n.slice(1);
    if (!n) continue;
    const art = /^(el|la|los|las)$/i.test(String(articulos[i] || '').trim()) ? String(articulos[i]).trim().toLowerCase() : articuloDe(n);
    faltan[i].r.nombre = n; faltan[i].r.articulo = art;
    await db.q(`UPDATE assets SET analisis = analisis || jsonb_build_object('nombre', $2::text, 'articulo', $3::text) WHERE id=$1`, [faltan[i].a.id, n, art]).catch(() => {});
  }
}

/** Quita el fondo con el servicio render (rembg). Devuelve null si no está disponible. */
async function sinFondo(url) {
  if (!config.renderUrl) return null;
  try {
    const r = await fetch(`${config.renderUrl}/v1/sin-fondo`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(150000) });
    if (!r.ok) return null;
    // render borra sus archivos a los 30 días: el PNG se copia al almacenamiento permanente del api.
    return await rehospedar(await r.json());
  } catch { return null; }
}

const ES_DE_RENDER = /^https?:\/\/[^\s"'<>]*\/files\/[\w.-]+\.png$/i;
/** Copia a /data/chat un PNG que vive en el servicio render y devuelve {url, ancho, alto} permanentes. */
export async function rehospedar(sf) {
  if (!sf?.url || !ES_DE_RENDER.test(sf.url) || sf.url.startsWith(config.publicUrl)) return sf;
  const nombre = sf.url.split('/').pop();
  const interna = config.renderUrl ? `${config.renderUrl}/files/${nombre}` : sf.url;
  let r = await fetch(interna, { signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!r?.ok) r = await fetch(sf.url, { signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!r?.ok) return null;
  const g = await guardar(sharp(Buffer.from(await r.arrayBuffer())), 'sinfondo', 'png');
  return { ...sf, ...g };
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

/** Logo: el fondo se vuelve transparente y se recorta al contenido.
 * 10-nov-2026 (caso El Rincón del Mayab: logo sobre negro con un filo de otro color en la esquina): el color de fondo es
 * el más común del borde (no solo el pixel de la esquina) y se borra solo lo conectado al borde (relleno por inundación),
 * así no se agujerean letras o detalles del mismo color dentro del logo. */
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** ¿Sin color? (menos del 2 % de los píxeles visibles con tono). */
export function esMonocromo(data) {
  let n = 0, color = 0;
  for (let k = 0; k < data.length; k += 4) {
    if (data[k + 3] < 128) continue;
    n++; if (Math.max(data[k], data[k + 1], data[k + 2]) - Math.min(data[k], data[k + 1], data[k + 2]) > 40) color++;
  }
  return n > 0 && color / n < 0.02;
}
/** Silueta por brillo respecto al fondo: tinta del tono contrario al fondo, opacidad según su distancia al fondo. */
export function siluetaPorBrillo(data, W, H, Lbg) {
  const claro = Lbg < 128, rango = claro ? 255 - Lbg : Lbg, tinta = claro ? 255 : 0;
  for (let k = 0; k < data.length; k += 4) {
    const d = Math.abs(lum(data[k], data[k + 1], data[k + 2]) - Lbg);
    const a = Math.max(0, Math.min(1, (d - 0.06 * rango) / (0.8 * rango)));
    data[k] = data[k + 1] = data[k + 2] = tinta;
    data[k + 3] = Math.round(data[k + 3] * a);
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim().png().toBuffer();
}

export async function fondoTransparente(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const cuenta = new Map(); let mejor = null;
  const borde = [];
  for (let x = 0; x < W; x++) borde.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) borde.push([0, y], [W - 1, y]);
  for (const [x, y] of borde) {
    const k = (y * W + x) * 4; if (data[k + 3] < 20) continue;
    const q = `${data[k] >> 4},${data[k + 1] >> 4},${data[k + 2] >> 4}`;
    const n = (cuenta.get(q) || 0) + 1; cuenta.set(q, n);
    if (!mejor || n > mejor.n) mejor = { n, k };
  }
  if (!mejor || mejor.n < borde.length * 0.3) return sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim().png().toBuffer();
  const [r0, g0, b0] = [data[mejor.k], data[mejor.k + 1], data[mejor.k + 2]];
  // Logo en blanco y negro (tinta clara sobre fondo oscuro o al revés): la tinta se separa por su brillo. Queda una
  // silueta limpia del tono de la tinta (blanca o negra) con transparencia suave, sin contornos ni huecos cerrados de
  // las letras. Después el sitio la tiñe o invierte según el fondo de la página (14-nov-2026, caso Blanca Banderas).
  if (esMonocromo(data)) return siluetaPorBrillo(data, W, H, lum(r0, g0, b0));
  const dist = (k) => Math.abs(data[k] - r0) + Math.abs(data[k + 1] - g0) + Math.abs(data[k + 2] - b0);
  // 14-nov-2026 (caso Blanca Banderas): los píxeles del borde del dibujo mezclan tinta y fondo; antes solo bajaba su
  // opacidad y conservaban el color del fondo, y quedaba un contorno blanco alrededor de cada letra. Ahora se separa el
  // color del fondo ("color a transparencia"): esos píxeles quedan con el color de la tinta y la opacidad que les toca.
  const bg = [r0, g0, b0];
  const alfaDe = (k) => { let a = 0; for (let c = 0; c < 3; c++) { const v = data[k + c], f = bg[c]; a = Math.max(a, v > f ? (v - f) / (255 - f || 1) : (f - v) / (f || 1)); } return Math.min(1, a); };
  const limpia = (k) => {
    const a = alfaDe(k);
    if (a < 0.04) { data[k + 3] = 0; return; }
    for (let c = 0; c < 3; c++) data[k + c] = Math.max(0, Math.min(255, Math.round((data[k + c] - bg[c] * (1 - a)) / a)));
    data[k + 3] = Math.min(data[k + 3], Math.round(255 * a));
  };
  const visto = new Uint8Array(W * H), pila = [];
  for (const [x, y] of borde) { const i = y * W + x; if (!visto[i] && dist(i * 4) < 60) { visto[i] = 1; pila.push(i); } }
  const orilla = [];
  while (pila.length) {
    const i = pila.pop(), k = i * 4, d = dist(k);
    if (d >= 28) { orilla.push(i); continue; } // borde del dibujo: no se sigue inundando hacia adentro
    data[k + 3] = 0;
    const x = i % W, y = (i / W) | 0;
    for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
      if (n >= 0 && !visto[n] && dist(n * 4) < 60) { visto[n] = 1; pila.push(n); }
    }
  }
  // La orilla y dos píxeles hacia adentro (el suavizado de un JPEG ocupa 2-3 px) se limpian del color del fondo.
  // Solo píxeles más claros/parecidos al fondo que la tinta: la tinta ya opaca queda igual (alfa 1).
  let frente = orilla;
  for (let paso = 0; paso < 3 && frente.length; paso++) {
    const sig = [];
    for (const i of frente) {
      limpia(i * 4);
      const x = i % W, y = (i / W) | 0;
      for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (n >= 0 && !visto[n] && data[n * 4 + 3] > 0) { visto[n] = 1; sig.push(n); }
      }
    }
    frente = sig;
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim().png().toBuffer();
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
  // Color 3x3 y grises 16x16 (10-nov-2026): el dHash solo juntaba como "la misma foto" guayaberas distintas con la misma
  // pose y fondo (El Rincón del Mayab: de 9 fotos quedaban 3). Ahora una copia también debe coincidir en color y en detalle.
  const { data: rgb } = await sharp(buf).rotate().removeAlpha().resize(3, 3, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const { data: gris } = await sharp(buf).rotate().greyscale().resize(16, 16, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const hex = (d) => [...d].map((v) => v.toString(16).padStart(2, '0')).join('');
  return `${bits}|${hex(rgb)}|${hex(gris)}|o`; // 'o': calculada sobre el original
}
const bytes = (h) => { const v = []; for (let i = 0; i < h.length; i += 2) v.push(parseInt(h.slice(i, i + 2), 16)); return v; };
const MISMO_COLOR = 25; // diferencia máxima por celda de color (0-255): arriba de esto ya son fotos distintas
const MISMO_DETALLE = 6; // diferencia media en grises 16x16: una copia real (aunque cambie tamaño) da ~0-2
export const distanciaHuella = (a, b) => {
  if (!a || !b) return 1;
  const [ba, ca, ga] = String(a).split('|'), [bb, cb, gb] = String(b).split('|');
  if (ba.length !== bb.length) return 1;
  if (ca && cb && ca.length === cb.length) {
    const x = bytes(ca), y = bytes(cb);
    for (let k = 0; k < x.length; k += 3) if ((Math.abs(x[k] - y[k]) + Math.abs(x[k + 1] - y[k + 1]) + Math.abs(x[k + 2] - y[k + 2])) / 3 > MISMO_COLOR) return 1;
  }
  if (ga && gb && ga.length === gb.length) {
    const x = bytes(ga), y = bytes(gb);
    let m = 0; for (let k = 0; k < x.length; k++) m += Math.abs(x[k] - y[k]);
    if (m / x.length > MISMO_DETALLE) return 1;
  }
  let d = 0; for (let i = 0; i < ba.length; i++) if (ba[i] !== bb[i]) d++;
  return d / ba.length;
};
const MISMA_FOTO = 0.32;
/** Foto de comida servida: se usa entera, sin quitarle el fondo (12-nov-2026). En restaurantes y cafeterías toda foto de
 * producto es un platillo servido salvo que su nombre diga que es una bebida o algo envasado (vaso, botella, frasco…);
 * en los demás giros, solo si la descripción habla de plato, molcajete, tazón, etc. */
const BEBIDA_O_ENVASE = /\b(caf[eé]s?|frapp[eé]s?|lattes?|capuchinos?|cappuccinos?|espressos?|americanos?|mocas?|mochas?|chai|matcha|t[eé]|tisanas?|smoothies?|malteadas?|licuados?|jugos?|aguas?|refrescos?|sodas?|limonadas?|naranjadas?|cervezas?|micheladas?|bebidas?|vasos?|botellas?|frascos?|latas?|cajas?|bolsas?|paquetes?|empaques?)\b/i;
const PLATO = /\b(platos?|platillos?|platones?|molcajetes?|cazuelas?|sart[eé]n(es)?|taz[oó]n(es)?|bowls?|charolas?|guarnici[oó]n|servid[oa]s?)\b/i;
export const esPlatilloServido = (r, arquetipo = '') => {
  if (r?.tipo !== 'foto_producto') return false;
  if (arquetipo === 'restaurante') return !BEBIDA_O_ENVASE.test(String(r.nombre || r.descripcion || ''));
  return PLATO.test(String(r.descripcion || ''));
};
/** Dos archivos del mismo logotipo (uno bajado de sus redes, recomprimido, y el original): basta la forma; el color y el
 * detalle fino cambian con la compresión y el tamaño, así que no se exigen como en las fotos. */
export const mismoLogo = (a, b) => {
  const fa = String(a || '').split('|')[0], fb = String(b || '').split('|')[0];
  if (!fa || fa.length !== fb.length) return false;
  let d = 0; for (let i = 0; i < fa.length; i++) if (fa[i] !== fb[i]) d++;
  return d / fa.length < 0.2;
};

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

// Franjas lisas en los bordes (10-nov-2026, caso El Rincón del Mayab): fotos generadas con barras negras arriba/abajo
// (letterbox) se veían desalineadas en filas y galerías. Se detectan midiendo filas/columnas uniformes y se recortan.
/** Detecta bandas lisas (letterbox negro/blanco o de un color) pegadas a los bordes. Devuelve el área útil o null. */
async function areaSinBandas(buf, { tol = 14, maxFrac = 0.3 } = {}) {
  const img = sharp(buf).rotate();
  const { width: W0, height: H0 } = await img.metadata();
  const esc = Math.min(1, 600 / Math.max(W0, H0));
  const w = Math.max(1, Math.round(W0 * esc)), h = Math.max(1, Math.round(H0 * esc));
  const { data } = await img.clone().resize(w, h, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const linea = (get, n) => { let s = 0, s2 = 0, mn = 255, mx = 0; for (let i = 0; i < n; i++) { const v = get(i); s += v; s2 += v * v; if (v < mn) mn = v; if (v > mx) mx = v; } const m = s / n; return { m, sd: Math.sqrt(Math.max(0, s2 / n - m * m)), rango: mx - mn }; };
  const fila = (y) => linea((i) => data[y * w + i], w), col = (x) => linea((i) => data[i * w + x], h);
  const lisa = (l, ref) => l.sd < 4 && l.rango < tol * 2 && Math.abs(l.m - ref.m) < tol;
  const contar = (n, get, lim) => { const ref = get(0); if (ref.sd >= 4 || ref.m > 40) return 0; /* solo franjas oscuras: un fondo claro de estudio es parte de la foto */ let k = 0; while (k < lim && lisa(get(k), ref)) k++; return k; };
  const top = contar(h, (k) => fila(k), Math.floor(h * maxFrac)), bot = contar(h, (k) => fila(h - 1 - k), Math.floor(h * maxFrac));
  const izq = contar(w, (k) => col(k), Math.floor(w * maxFrac)), der = contar(w, (k) => col(w - 1 - k), Math.floor(w * maxFrac));
  const min = 2; // ≥ 2 px a esta escala: una banda real, no un borde de 1 px
  const t = top >= min ? top + 1 : 0, b = bot >= min ? bot + 1 : 0, l = izq >= min ? izq + 1 : 0, r = der >= min ? der + 1 : 0;
  if (!t && !b && !l && !r) return null;
  const left = Math.round(l / esc), topPx = Math.round(t / esc);
  const width = W0 - left - Math.round(r / esc), height = H0 - topPx - Math.round(b / esc);
  if (width < W0 * 0.5 || height < H0 * 0.5) return null;
  return { left, top: topPx, width, height };
}

/** Si la foto trae franjas lisas en los bordes, guarda una versión sin ellas. Devuelve {url, ancho, alto} o null. */
async function sinBandas(buf) {
  const a = await areaSinBandas(buf).catch(() => null);
  if (!a) return null;
  return guardar(sharp(await sharp(buf).rotate().extract(a).jpeg({ quality: 92 }).toBuffer()), 'rec');
}

/** Amplía una caja (px) hasta cubrir todo el logo: avanza cada lado mientras haya dibujo, y cruza huecos de fondo
 * de hasta 10% del alto (5% del ancho) (el espacio entre el símbolo y el nombre o el lema) si después sigue habiendo dibujo.
 * 10-nov-2026: la versión anterior se detenía en el primer renglón de fondo y dejaba fuera el nombre del negocio. */
async function ampliarHastaFondo(original, a, W, H) {
  if (!a) return null;
  const esc = Math.min(1, 900 / Math.max(W, H));
  const w = Math.round(W * esc), h = Math.round(H * esc);
  const { data } = await sharp(original).rotate().resize(w, h, { fit: 'fill' }).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = Math.floor(a.left * esc), y0 = Math.floor(a.top * esc), x1 = Math.min(w - 1, Math.ceil((a.left + a.width) * esc)), y1 = Math.min(h - 1, Math.ceil((a.top + a.height) * esc));
  const px = (x, y) => { const k = (y * w + x) * 3; return [data[k], data[k + 1], data[k + 2]]; };
  // Color de fondo = el más común de la imagen (cuantizado); la caja puede empezar sobre el dibujo.
  const cuenta = new Map(); let ref = px(0, 0), mejor = 0;
  for (let k = 0; k < data.length; k += 3 * 7) { const q = (data[k] >> 4) * 256 + (data[k + 1] >> 4) * 16 + (data[k + 2] >> 4); const n = (cuenta.get(q) || 0) + 1; cuenta.set(q, n); if (n > mejor) { mejor = n; ref = [data[k], data[k + 1], data[k + 2]]; } }
  const lisa = (pts) => { let ok = 0; for (const [x, y] of pts) { const c = px(x, y); if (Math.abs(c[0] - ref[0]) + Math.abs(c[1] - ref[1]) + Math.abs(c[2] - ref[2]) < 45) ok++; } return ok >= pts.length * 0.985; };
  const fila = (y) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y]);
  const col = (x) => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i]);
  // Línea de marco: casi toda dibujo de punta a punta (≥ 72% de píxeles distintos al fondo en el 88% central de la
  // imagen, para no contar los marcos laterales). Así son las grecas y filetes de un marco; el logo y su lema no.
  // Si aparece en el 10% exterior después de un hueco de fondo, ese lado se detiene ahí.
  const distinto = (c) => Math.abs(c[0] - ref[0]) + Math.abs(c[1] - ref[1]) + Math.abs(c[2] - ref[2]) >= 45;
  const cobertura = (pts) => pts.reduce((a, [x, y]) => a + (distinto(px(x, y)) ? 1 : 0), 0) / pts.length;
  const mx = Math.round(w * 0.06), my = Math.round(h * 0.06);
  const marcoFila = (y) => cobertura(Array.from({ length: w - 2 * mx }, (_, i) => [mx + i, y])) >= 0.72;
  const marcoCol = (x) => cobertura(Array.from({ length: h - 2 * my }, (_, i) => [x, my + i])) >= 0.72;
  // Avanza un lado: d = -1/+1; devuelve la última línea con dibujo (más un margen de 2 px).
  const lado = (ini, d, n, linea, hueco, max, marco) => {
    let ult = ini, vacias = 0;
    for (let v = ini + d, k = 0; v >= 0 && v <= n - 1 && k < max; v += d, k++) {
      // Marco: línea densa en el 10% exterior que aparece después de un hueco de fondo.
      if (vacias > 0 && (d > 0 ? n - 1 - v : v) < n * 0.1 && marco(v)) break;
      if (lisa(linea(v))) { if (++vacias > hueco) break; continue; }
      vacias = 0; ult = v;
    }
    return Math.max(0, Math.min(n - 1, ult + d * 2));
  };
  for (let vuelta = 0; vuelta < 2; vuelta++) { // dos vueltas: al crecer en alto pueden aparecer dibujos a los lados y al revés
    y0 = lado(y0, -1, h, fila, Math.round(h * 0.1), Math.round(h * 0.45), marcoFila);
    y1 = lado(y1, 1, h, fila, Math.round(h * 0.1), Math.round(h * 0.45), marcoFila);
    x0 = lado(x0, -1, w, col, Math.round(w * 0.05), Math.round(w * 0.45), marcoCol);
    x1 = lado(x1, 1, w, col, Math.round(w * 0.05), Math.round(w * 0.45), marcoCol);
  }
  const left = Math.max(0, Math.floor(x0 / esc)), top = Math.max(0, Math.floor(y0 / esc));
  return { left, top, width: Math.min(W - left, Math.ceil((x1 - x0 + 1) / esc)), height: Math.min(H - top, Math.ceil((y1 - y0 + 1) / esc)) };
}

/** Imagen que en realidad es el logo (con o sin lema, sobre cualquier fondo): sin personas y el logo cubre ≥ 35%. */
export function esVersionLogo(r = {}) {
  if (r.personas || !r.logo?.ancho || !r.contenido?.ancho) return false;
  return (r.logo.ancho * r.logo.alto) / (r.contenido.ancho * r.contenido.alto) >= 0.35;
}

/** Analiza (o reutiliza el análisis guardado de) un asset de imagen y genera sus recortes. */
export async function analizarAsset(a, { negocio = '' } = {}) {
  // Logos recortados con la caja justa del modelo (antes de 10-nov-2026) salían con las letras cortadas: esos análisis
  // se rehacen una vez (solo los que tienen logo) para recortarlo con margen.
  if (a.analisis?.version === VERSION && !(a.analisis.logo && a.analisis.logo_v !== 5)) {
    if (!a.analisis.huella || String(a.analisis.huella).split('|').length < 4) { // huella vieja (sin color/detalle o del recorte): se recalcula
      a.analisis.huella = await descargar(a.url).then(huella).catch(() => null); // del original: dos recortes distintos de la misma foto deben coincidir
      if (a.analisis.huella) await db.q(`UPDATE assets SET analisis = analisis || jsonb_build_object('huella', $2::text) WHERE id=$1`, [a.id, a.analisis.huella]).catch(() => {});
    }
    if (!a.analisis.bandas_ok && a.analisis.tipo !== 'logo' && a.analisis.contenido?.url) {
      const nueva = await descargar(a.analisis.contenido.url).then(sinBandas).catch(() => null);
      if (nueva) a.analisis.contenido = nueva;
      a.analisis.bandas_ok = true;
      await db.q(`UPDATE assets SET analisis = analisis || jsonb_build_object('contenido', $2::jsonb, 'bandas_ok', true) WHERE id=$1`, [a.id, JSON.stringify(a.analisis.contenido)]).catch(() => {});
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
  if (v.tipo !== 'logo') {
    const nueva = await (out.contenido.url === a.url ? Promise.resolve(original) : descargar(out.contenido.url)).then(sinBandas).catch(() => null);
    if (nueva) out.contenido = nueva;
    out.bandas_ok = true;
  }
  // Logo (10-nov-2026, caso El Rincón del Mayab: letras cortadas por abajo): un archivo que ES el logo se recorta completo;
  // un logo dentro de otra imagen se amplía lado por lado hasta topar con una franja de puro fondo (no se cortan letras
  // ni se mete medio lema o el marco decorativo).
  // Un archivo que ES el logo también pasa por la ampliación (10-nov-2026, caso El Rincón del Mayab: logo sobre un
  // rectángulo negro con marco decorativo): se parte del centro, se excluye el marco del borde y luego el fondo se
  // vuelve transparente. Si no hay marco, la ampliación termina cubriendo todo el dibujo igual que antes.
  const centro = { left: Math.round(W * 0.3), top: Math.round(H * 0.3), width: Math.round(W * 0.4), height: Math.round(H * 0.4) };
  const lb = v.tipo === 'logo'
    ? await ampliarHastaFondo(original, caja(v.logo, W, H, 0.005) || centro, W, H).catch(() => ({ left: 0, top: 0, width: W, height: H }))
    : await ampliarHastaFondo(original, caja(v.logo, W, H, 0.005), W, H).catch(() => caja(v.logo, W, H, 0.02));
  if (lb) { out.logo_caja = { x: lb.left / W, y: lb.top / H, w: lb.width / W, h: lb.height / H }; out.logo_v = 5; }
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
  out.huella = await huella(original).catch(() => null); // del original, no del recorte
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
  const res = { logo: null, logos_extra: [], hero: null, fundador: null, fotos: [], trabajos: [], equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [],
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
  // Mismo logo mandado dos veces (12-nov-2026, caso La Fondita de Celestún: el de su Facebook y el que subió en el chat):
  // es una copia del logo elegido, no "otra versión". Cuenta como usado a través del logo y no se repite en el pie.
  // Sin esto, el validador lo daba por material sin usar y las 6 opciones tronaban.
  const origenLogo = res.logo ? analisis.find((x) => x.r.logo?.url === res.logo.url) : null;
  const copiaDelLogo = (a, r) => !!origenLogo && a.id !== origenLogo.a.id && r.tipo === 'logo' && mismoLogo(r.huella, origenLogo.r.huella);
  await nombrarFotos(analisis, brief).catch((e) => console.warn('[materiales] nombrar fotos:', e.message));
  const ficha = (a, r, extra = {}) => ({ url: r.contenido.url, ancho: r.contenido.ancho, alto: r.contenido.alto, alt: r.descripcion || '', nombre: r.nombre || '', articulo: r.articulo || '', tipo: r.tipo, clave: a.clave, ...extra });
  const urlsDe = (a, r) => [a.url, r.contenido?.url, r.sin_fondo?.url, r.logo?.url, ...(r.productos || []).map((p) => p.url)].filter(Boolean);
  for (const { a, r: r0 } of analisis) {
    // Platillos servidos: nunca se les quita el fondo (12-nov-2026, decisión de Sebastián). El recorte queda solo para
    // bebidas y productos envasados (vasos, botellas, frascos, cajas), como en Toolatte.
    const r = esPlatilloServido(r0, brief.negocio?.arquetipo) ? { ...r0, aislable: false, sin_fondo: null } : r0;
    const original = copias.get(a.id);
    // Copia de otra foto: no se muestra; cuenta como usada a través de la foto que se queda.
    res.usables.push({ id: a.id, clave: a.clave, tipo: r.tipo, urls: original ? [...urlsDe(a, r), ...urlsDe(original.a, original.r)] : urlsDe(a, r) });
    if (original) continue;
    const f = ficha(a, r, { sin_fondo: r.sin_fondo?.url || null, personas: r.personas, captura: r.es_captura, calidad: r.calidad });
    // Otra versión del logo (10-nov-2026, caso El Rincón del Mayab: su logo sobre fondo negro salió como única foto de
    // una "Galería"). Un archivo que ES un logo distinto al elegido, o una imagen sin personas donde el logo ocupa casi
    // todo, no es una foto de trabajo: va como marca en el pie de página, nunca en galerías ni en el slider.
    if (r.tipo === 'logo' || esVersionLogo(r)) {
      if (copiaDelLogo(a, r)) { res.usables[res.usables.length - 1].urls.push(res.logo.url); res.duplicadas.push({ copia: a.clave, se_queda: origenLogo.a.clave }); continue; }
      if (f.url !== res.logo?.url && !res.logos_extra.some((x) => x.url === f.url)) res.logos_extra.push({ ...f, tipo: 'logo_extra' });
      continue;
    }
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
