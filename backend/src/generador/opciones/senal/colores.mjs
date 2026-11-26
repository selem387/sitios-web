// Colores a mano de la opción Señal para un cliente (26-nov-2026, pedido de Sebastián para Intiviso).
// Guarda brief.marca.colores_opcion.senal = { estatica, fosforo }: "estatica" reemplaza el blanco de títulos y
// "fosforo" el verde. No genera la página: después se corre generar_opcion.mjs T "<cliente>" --aplicar.
//
// Uso dentro del contenedor api (desde /app o la carpeta del backend):
//   node src/generador/opciones/senal/colores.mjs "<negocio o id>"                       → muestra los colores de su logo
//   node src/generador/opciones/senal/colores.mjs "<negocio o id>" --logo-fucsia-morado  → fucsia en lugar del blanco y
//                                                                                          morado en lugar del verde
//   node src/generador/opciones/senal/colores.mjs "<negocio o id>" --estatica=#RRGGBB --fosforo=#RRGGBB
//   node src/generador/opciones/senal/colores.mjs "<negocio o id>" --quitar              → vuelve a los del modelo
import * as db from '../../../entrevista/db.js';
import { procesarMateriales } from '../../materiales.js';

const args = process.argv.slice(2);
const quien = args.find((a) => !a.startsWith('--'));
const val = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || null;
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
const logo = [...new Set([...(mat.logo?.colores || []), ...(mat.colores || []), ...(e.brief.marca?.colores_logo || [])].filter(esHex).map((x) => x.toUpperCase()))];
console.log('Colores del logo:', logo.map((c) => { const { h, s, l } = hsl(c); return `${c} (tono ${Math.round(h)}°, sat ${Math.round(s * 100)} %, luz ${Math.round(l * 100)} %)`; }).join(' | ') || 'ninguno');

let nuevos = null;
if (args.includes('--quitar')) nuevos = null;
else if (args.includes('--logo-fucsia-morado')) {
  const vivos = logo.map((c) => ({ c, ...hsl(c) })).filter((x) => x.s > 0.25 && x.l > 0.12 && x.l < 0.9);
  const mejor = (lo, hi) => vivos.filter((x) => x.h >= lo && x.h < hi).sort((a, b) => b.s - a.s)[0]?.c || null;
  const fucsia = mejor(300, 350) || mejor(350, 361);
  const morado = mejor(250, 300);
  if (!fucsia || !morado) { console.error(`No encontré ${!fucsia ? 'fucsia' : 'morado'} en el logo; pásalos a mano con --estatica y --fosforo`); process.exit(1); }
  nuevos = { estatica: fucsia, fosforo: morado };
} else if (esHex(val('estatica')) || esHex(val('fosforo'))) nuevos = { ...(esHex(val('estatica')) ? { estatica: val('estatica').toUpperCase() } : {}), ...(esHex(val('fosforo')) ? { fosforo: val('fosforo').toUpperCase() } : {}) };
else process.exit(0); // solo mostrar

const actuales = { ...(e.brief.marca?.colores_opcion || {}) };
if (nuevos) actuales.senal = nuevos; else delete actuales.senal;
await db.guardar(e.id, { brief: { ...e.brief, marca: { ...(e.brief.marca || {}), colores_opcion: actuales } } });
console.log(nuevos ? `Guardado: blanco → ${nuevos.estatica || 'igual'}, verde → ${nuevos.fosforo || 'igual'}` : 'Quitados: vuelve a los colores del modelo');
console.log(`Ahora: node src/herramientas/generar_opcion.mjs T "${rows[0].nombre}" --aplicar`);
process.exit(0);
