// Limpia el logo de un cliente que ya tiene propuestas: quita el contorno claro que dejó el fondo y los huecos cerrados
// de las letras. Si el logo es de tinta oscura sin color queda como silueta negra transparente (14-nov-2026, Blanca).
// Sobrescribe el archivo en su misma dirección (se corrige en todas sus páginas) y rehace sus versiones teñidas.
// Uso dentro del contenedor api:  node src/herramientas/limpiar_logo.mjs "<nombre del negocio o id>" [--aplicar]
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from '../config.js';
import * as db from '../entrevista/db.js';
import { procesarMateriales, siluetaSiMonocromo } from '../generador/materiales.js';
import { DIR_PROPUESTAS } from '../generador/propuestas_html.js';

const arg = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
if (!arg) { console.error('Falta el nombre del negocio o el id de la entrevista'); process.exit(1); }
const { rows } = await db.q(`SELECT id, brief->'negocio'->>'nombre' AS nombre FROM entrevistas WHERE id::text = $1 OR brief->'negocio'->>'nombre' ILIKE $2 ORDER BY actualizado DESC`, [arg, `%${arg}%`]);
if (!rows.length) { console.error('No encontré esa entrevista'); process.exit(1); }
const e = await db.obtener(rows[0].id);
const mat = await procesarMateriales(e.id, e.brief, { aceptarLoQueHay: true });
const url = mat.logo?.url;
if (!url?.startsWith(`${config.publicUrl}/chat/archivos/`)) { console.error('Sin logo propio en /chat/archivos/'); process.exit(1); }
const DIR = path.join(config.dataDir, 'chat');
const archivo = path.join(DIR, path.basename(new URL(url).pathname));
const { data, info } = await sharp(await fs.readFile(archivo)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const mono = siluetaSiMonocromo(data);
console.log(rows[0].nombre, '·', path.basename(archivo), mono ? '· silueta negra' : '· tiene color: no se cambia');
if (!mono) process.exit(0);
const limpio = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().png().toBuffer();
// Versiones teñidas (logo-<hash>.png) que usan sus propuestas: se rehacen con el logo limpio y el mismo color.
const prop = e.brief?.marca?.propuestas;
const htmls = prop?.token ? await fs.readdir(path.join(DIR_PROPUESTAS, prop.token)).catch(() => []) : [];
const tenidos = new Set();
for (const f of htmls.filter((x) => x.endsWith('.html'))) {
  const h = await fs.readFile(path.join(DIR_PROPUESTAS, prop.token, f), 'utf8');
  for (const m of h.matchAll(/\/chat\/archivos\/(logo-[0-9a-f]{12}\.png)/g)) tenidos.add(m[1]);
}
console.log('Versiones teñidas encontradas:', [...tenidos].join(', ') || 'ninguna');
if (!APLICAR) { console.log('Prueba (sin --aplicar)'); process.exit(0); }
await fs.copyFile(archivo, `${archivo}.antes-${Date.now()}`);
await fs.writeFile(archivo, limpio);
const { data: d2, info: i2 } = await sharp(limpio).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const t of tenidos) {
  const ruta = path.join(DIR, t);
  const actual = await sharp(await fs.readFile(ruta).catch(() => null) || Buffer.alloc(0)).ensureAlpha().raw().toBuffer({ resolveWithObject: true }).catch(() => null);
  if (!actual) continue;
  // Color de la versión teñida: el del primer píxel visible.
  let rgb = null; for (let k = 0; k < actual.data.length; k += 4) if (actual.data[k + 3] > 200) { rgb = [actual.data[k], actual.data[k + 1], actual.data[k + 2]]; break; }
  if (!rgb) continue;
  const copia = Buffer.from(d2);
  for (let k = 0; k < copia.length; k += 4) { copia[k] = rgb[0]; copia[k + 1] = rgb[1]; copia[k + 2] = rgb[2]; }
  await sharp(copia, { raw: { width: i2.width, height: i2.height, channels: 4 } }).png().toFile(ruta);
}
console.log('Listo: logo limpio y', tenidos.size, 'versiones teñidas rehechas');
process.exit(0);
