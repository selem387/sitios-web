// Ajustes a mano de la opción Señal para un cliente (26-nov-2026, pedidos de Sebastián para Intiviso).
// Guarda brief.marca.colores_opcion.senal y no genera la página: después se corre
//   node src/herramientas/generar_opcion.mjs T "<cliente>" --aplicar
//
// Uso dentro del contenedor api (carpeta /app):
//   node src/generador/opciones/senal/colores.mjs "<negocio o id>"                      → muestra lo guardado y los colores del logo
//   --estatica=#RRGGBB      color que reemplaza el blanco de títulos
//   --fosforo=#RRGGBB       color que reemplaza el verde
//   --logo-fucsia-morado    toma del logo el fucsia (→ blanco) y el morado (→ verde)
//   --letra-chica=2         letras de 9, 10 y 11 px multiplicadas (2 = al doble); la columna lateral se ensancha
//   --titulos-mitad         títulos con la mitad de las palabras en un color y la otra mitad en el otro
//   --subtitulo=2.2         texto bajo el titular más grande (2.2 = 120 % más grande)
//   --logo-icono            recorta el logo hasta el primer hueco vertical (deja solo el ícono) y lo usa arriba;
//                           el logo completo pasa al pie
//   --sin-<ajuste>          quita ese ajuste (p. ej. --sin-logo-icono, --sin-titulos-mitad, --sin-letra-chica)
//   --quitar                quita todos los ajustes: vuelve a ser idéntica al modelo
// Los ajustes se suman a lo ya guardado.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { config } from '../../../config.js';
import * as db from '../../../entrevista/db.js';
import { procesarMateriales } from '../../materiales.js';

const args = process.argv.slice(2);
const quien = args.find((a) => !a.startsWith('--'));
const val = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || null;
const tiene = (k) => args.includes(`--${k}`);
const esHex = (c) => /^#[0-9a-f]{6}$/i.test(String(c || ''));
if (!quien) { console.error('Falta el nombre del negocio o el id de la entrevista'); process.exit(1); }

const hsl = (hex) => {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
};

const { rows } = await db.q(`SELECT id, brief->'negocio'->>'nombre' AS nombre FROM entrevistas
  WHERE id::text = $1 OR brief->'negocio'->>'nombre' ILIKE $2 ORDER BY actualizado DESC`, [quien, `%${quien}%`]);
if (!rows.length) { console.error('No encontré esa entrevista'); process.exit(1); }
const e = await db.obtener(rows[0].id);
console.log('Cliente:', e.id, '·', rows[0].nombre);
const mat = await procesarMateriales(e.id, e.brief, { aceptarLoQueHay: true });
const logo = [...new Set([...(mat.logo?.colores || []), ...(mat.colores || [])].filter(esHex).map((x) => x.toUpperCase()))];
console.log('Colores del logo detectados:', logo.join(' ') || 'ninguno');
const antes = e.brief.marca?.colores_opcion?.senal || {};
console.log('Guardado antes:', JSON.stringify(antes));

let a = tiene('quitar') ? {} : { ...antes };
if (esHex(val('estatica'))) a.estatica = val('estatica').toUpperCase();
if (esHex(val('fosforo'))) a.fosforo = val('fosforo').toUpperCase();
if (tiene('logo-fucsia-morado')) {
  const vivos = logo.map((c) => ({ c, ...hsl(c) })).filter((x) => x.s > 0.25 && x.l > 0.12 && x.l < 0.9);
  const mejor = (lo, hi) => vivos.filter((x) => x.h >= lo && x.h < hi).sort((p, q) => q.s - p.s)[0]?.c || null;
  const fucsia = mejor(300, 350) || mejor(350, 361), morado = mejor(250, 300);
  if (!fucsia || !morado) { console.error('No encontré fucsia y morado entre los colores detectados; pásalos con --estatica y --fosforo'); process.exit(1); }
  Object.assign(a, { estatica: fucsia, fosforo: morado });
}
if (val('letra-chica')) a.letra_chica = Number(val('letra-chica'));
if (tiene('titulos-mitad')) a.titulos_mitad = true;
if (val('subtitulo')) a.subtitulo = Number(val('subtitulo'));
if (tiene('logo-icono')) {
  if (!mat.logo?.url) { console.error('El cliente no tiene logo'); process.exit(1); }
  const buf = Buffer.from(await (await fetch(mat.logo.url)).arrayBuffer());
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const fondo = [data[0], data[1], data[2], data[3]];
  const tinta = (i) => (fondo[3] < 30 ? data[i + 3] > 100 : Math.abs(data[i] - fondo[0]) + Math.abs(data[i + 1] - fondo[1]) + Math.abs(data[i + 2] - fondo[2]) > 60);
  const col = Array.from({ length: W }, (_, x) => { let n = 0; for (let y = 0; y < H; y++) if (tinta((y * W + x) * 4)) n++; return n; });
  const inicio = col.findIndex((n) => n > 2);
  let fin = -1, vacias = 0;
  for (let x = inicio; x < W; x++) { if (col[x] <= 2) { vacias++; if (vacias >= Math.max(12, W * 0.02)) { fin = x - vacias; break; } } else vacias = 0; }
  if (inicio < 0 || fin <= inicio) { console.error('No encontré un hueco entre el ícono y el texto del logo'); process.exit(1); }
  const recorte = await sharp(buf).extract({ left: inicio, top: 0, width: fin - inicio + 1, height: H }).trim({ threshold: 10 }).png().toBuffer();
  const nombre = `logo-icono-${crypto.randomBytes(6).toString('base64url').replace(/[^\w]/g, 'x')}.png`;
  await fs.writeFile(path.join(config.dataDir, 'chat', nombre), recorte);
  a.logo_icono = `${config.publicUrl}/chat/archivos/${nombre}`;
  console.log(`Ícono recortado (x ${inicio}–${fin} de ${W} px):`, a.logo_icono);
}
for (const [flag, k] of [['sin-logo-icono', 'logo_icono'], ['sin-titulos-mitad', 'titulos_mitad'], ['sin-letra-chica', 'letra_chica'], ['sin-subtitulo', 'subtitulo']]) if (tiene(flag)) delete a[k];

const actuales = { ...(e.brief.marca?.colores_opcion || {}) };
if (Object.keys(a).length) actuales.senal = a; else delete actuales.senal;
await db.guardar(e.id, { brief: { ...e.brief, marca: { ...(e.brief.marca || {}), colores_opcion: actuales } } });
console.log('Guardado ahora:', JSON.stringify(a));
console.log(`Siguiente: node src/herramientas/generar_opcion.mjs T ${e.id} --aplicar`);
process.exit(0);
