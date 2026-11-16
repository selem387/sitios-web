// Librerías de terceros servidas desde el propio API en /vendor/<archivo> (versión fija en el nombre).
// Hoy: Motion y Lenis, que usa la opción I (opciones/historia). Para agregar una, se copia el archivo a generador/vendor/
// con la versión en el nombre y se agrega aquí.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VENDOR = { motion: 'motion-14.14.0.min.js', lenis: 'lenis-1.3.27.min.js' };
const DIR_VENDOR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vendor');

/** Sirve /vendor/<archivo> (solo los archivos de VENDOR), con caché larga: el nombre lleva la versión. */
export async function servirVendor(c) {
  const nombre = c.req.param('nombre');
  if (!Object.values(VENDOR).includes(nombre)) return c.text('no', 404);
  const buf = await fs.readFile(path.join(DIR_VENDOR, nombre)).catch(() => null);
  if (!buf) return c.text('no', 404);
  return c.body(buf, 200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable', 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' });
}
