// Librerías de terceros servidas desde el propio API en /vendor/<archivo>, con la versión fija en el nombre
// (decisión de Sebastián, 15-nov-2026: nada desde CDN de terceros). Cada opción usa su versión; no se cambian solas.
// Los archivos de generador/vendor/ son los mismos que servía el CDN (verificado byte por byte el 16-nov-2026), sin
// la línea final de sourceMappingURL. Para agregar una: copiar el .min.js del paquete de npm a generador/vendor/ con la
// versión en el nombre y agregarlo a LIBRERIAS.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

export const LIBRERIAS = Object.freeze({
  motion: 'motion-14.14.0.min.js', // I (historia)
  'lenis-1.3.27': 'lenis-1.3.27.min.js', // I (historia) y M (guía)
  'gsap-3.12.5': 'gsap-3.12.5.min.js', 'scrolltrigger-3.12.5': 'scrolltrigger-3.12.5.min.js', // K (efectos) y R (manual)
  'split-type-0.3.4': 'split-type-0.3.4.min.js', // K y R
  'lenis-1.1.20': 'lenis-1.1.20.min.js', // K
  'lenis-1.2.3': 'lenis-1.2.3.min.js', 'three-0.147.0': 'three-0.147.0.min.js', // R
  'gsap-3.12.7': 'gsap-3.12.7.min.js', 'scrolltrigger-3.12.7': 'scrolltrigger-3.12.7.min.js', // M
  'gsap-3.14.2': 'gsap-3.14.2.min.js', 'scrolltrigger-3.14.2': 'scrolltrigger-3.14.2.min.js', 'lenis-1.3.18': 'lenis-1.3.18.min.js', // N (avance)
});
/** Las de la opción I, con su nombre de siempre. */
export const VENDOR = { motion: LIBRERIAS.motion, lenis: LIBRERIAS['lenis-1.3.27'] };

const DIR_VENDOR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vendor');
const ARCHIVOS = new Set(Object.values(LIBRERIAS));

/** URL pública de una librería: urlLibreria('gsap-3.12.5'). */
export function urlLibreria(clave) {
  const archivo = LIBRERIAS[clave];
  if (!archivo) throw new Error(`librería desconocida: ${clave}`);
  return `${config.publicUrl}/vendor/${archivo}`;
}

/** Sirve /vendor/<archivo> (solo los de LIBRERIAS), con caché larga: el nombre lleva la versión. */
export async function servirVendor(c) {
  const nombre = c.req.param('nombre');
  if (!ARCHIVOS.has(nombre)) return c.text('no', 404);
  const buf = await fs.readFile(path.join(DIR_VENDOR, nombre)).catch(() => null);
  if (!buf) return c.text('no', 404);
  return c.body(buf, 200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' });
}
