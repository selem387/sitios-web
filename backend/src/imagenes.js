// Imágenes de los sitios en el tamaño justo (9-nov-2026). Una sola lógica para todas las rutas de fotos:
//  - /chat/archivos/<nombre>                 (fotos del chat, sin fondo, logos, variaciones)
//  - /files/<app>/public/<ruta>              (fotos subidas desde el panel y fichas de propiedades)
// Versiones reducidas en WebP (?w=480|800|1200|1600) guardadas en disco, y proporción real declarada en cada <img>
// (atributos width/height → el navegador reserva el espacio y la página no "brinca" al cargar; el aspect-ratio
// de la plantilla, si lo hay, manda sobre esa proporción).
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

export const ANCHOS = [480, 800, 1200, 1600];
const DIR_CHAT = path.join(config.dataDir, 'chat');
const DIR_W = path.join(DIR_CHAT, '_w');
const ES_FOTO = /\.(jpe?g|png|webp)$/i;

/** Ruta en disco de una URL de foto nuestra, o null si no es nuestra. */
export function rutaLocal(url) {
  const u = String(url || '');
  let m = u.match(/\/chat\/archivos\/([\w-]+\.(?:jpe?g|png|webp))(?:$|[?#])/i);
  if (m) return path.join(DIR_CHAT, m[1]);
  m = u.match(/\/files\/([\w-]+\/public\/[^?#"]+\.(?:jpe?g|png|webp))(?:$|[?#])/i);
  if (m) {
    const rel = decodeURIComponent(m[1]);
    if (rel.includes('..')) return null;
    return path.join(config.dataDir, 'files', rel);
  }
  return null;
}

/** Versión reducida en WebP (la genera una vez y la guarda). → Buffer | null */
export async function reducida(origen, w) {
  if (!ANCHOS.includes(w) || !ES_FOTO.test(origen)) return null;
  const clave = Buffer.from(path.relative(config.dataDir, origen)).toString('base64url');
  const destino = path.join(DIR_W, `${clave}-${w}.webp`);
  const hecha = await fs.readFile(destino).catch(() => null);
  if (hecha) return hecha;
  const sharp = (await import('sharp')).default;
  const buf = await sharp(origen).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
  await fs.mkdir(DIR_W, { recursive: true });
  await fs.writeFile(`${destino}.tmp`, buf); await fs.rename(`${destino}.tmp`, destino);
  return buf;
}

const medidas = new Map(); // ruta → {w,h} (con orientación EXIF aplicada)
async function medida(ruta) {
  if (medidas.has(ruta)) return medidas.get(ruta);
  try {
    const sharp = (await import('sharp')).default;
    const m = await sharp(ruta).metadata();
    const giro = m.orientation >= 5;
    const r = m.width && m.height ? { w: giro ? m.height : m.width, h: giro ? m.width : m.height } : null;
    if (medidas.size > 5000) medidas.clear();
    medidas.set(ruta, r);
    return r;
  } catch { return null; }
}

/** Tamaño mostrado según dónde está la foto (para `sizes`). */
function sizesPara(attrs) {
  if (/\bsl-img\b|class="[^"]*\b(hero|portada|fondo)\b/.test(attrs)) return '100vw';
  if (/class="[^"]*\b(logo|avatar|icono)\b/.test(attrs)) return '240px';
  return '(min-width: 1100px) 33vw, (min-width: 700px) 50vw, 100vw';
}

/**
 * A cada <img> con foto nuestra: srcset WebP + sizes (si no trae) y su tamaño real (width/height).
 * Los logos no llevan srcset (son chicos y a veces PNG con transparencia), pero sí su proporción.
 */
export async function optimizarImagenes(html) {
  const re = /<img\b([^>]*?)\ssrc="([^"]+)"([^>]*)>/g;
  const tareas = [];
  for (const m of String(html).matchAll(re)) {
    const ruta = rutaLocal(m[2]);
    if (ruta) tareas.push(medida(ruta));
  }
  await Promise.all(tareas);
  return String(html).replace(re, (todo, a, src, b) => {
    const ruta = rutaLocal(src);
    if (!ruta) return todo;
    const limpia = (t) => t.replace(/\ssrcset="[^"]*(?:\/chat\/archivos\/|\/files\/)[^"]*"/g, '').replace(/\ssizes="[^"]*"/g, '');
    let attrs = limpia(a) + limpia(b);
    const esLogo = /class="[^"]*\blogo/.test(attrs);
    let extra = '';
    if (!esLogo && !/\ssrcset=/.test(attrs)) {
      const base = src.replace(/\?.*$/, '');
      extra += ` srcset="${ANCHOS.map((w) => `${base}?w=${w} ${w}w`).join(', ')}" sizes="${sizesPara(attrs)}"`;
    }
    const md = medidas.get(ruta);
    if (md) {
      if (!/\swidth=/.test(attrs)) extra += ` width="${md.w}"`;
      if (!/\sheight=/.test(attrs)) extra += ` height="${md.h}"`;
      if (!/\sdecoding=/.test(attrs)) extra += ' decoding="async"';
    }
    return `<img${attrs} src="${src}"${extra}>`;
  });
}

/** CSS que acompaña (especificidad 0 con :where): la altura sigue la proporción salvo que la plantilla fije otra. */
export const CSS_IMAGENES = '<style>:where(img[width][height]){height:auto}</style>';

/** Atajo para el HTML final de una página: optimiza imágenes y agrega el CSS. */
export async function conImagenesOptimizadas(html) {
  const out = await optimizarImagenes(html);
  return out.includes(':where(img[width][height])') ? out : out.replace('</head>', () => `${CSS_IMAGENES}</head>`);
}
