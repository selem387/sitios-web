// Una sola vez: copia al almacenamiento permanente del api (/data/chat) los PNG sin fondo que viven en el servicio
// render (que los borra a los 30 días) y cambia sus ligas en la base y en las propuestas guardadas.
// Uso dentro del contenedor api:  node src/herramientas/rehospedar_sin_fondo.mjs [--aplicar]
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import * as db from '../entrevista/db.js';
import { rehospedar } from '../generador/materiales.js';

const APLICAR = process.argv.includes('--aplicar');
const RE = /https?:\/\/[^"'\s<>\\]*render[^"'\s<>\\]*\/files\/[\w.-]+\.png/g;
const mapa = new Map();
async function nueva(url) {
  if (!mapa.has(url)) mapa.set(url, APLICAR ? (await rehospedar({ url }).catch(() => null))?.url || null : 'pendiente');
  return mapa.get(url);
}
async function reemplazar(texto) {
  let out = texto, n = 0, rotas = 0;
  for (const u of new Set(texto.match(RE) || [])) {
    const v = await nueva(u);
    if (v && v !== 'pendiente') { out = out.split(u).join(v); n++; } else if (!v) rotas++;
    else n++;
  }
  return { out, n, rotas };
}
const tablas = [['assets', 'analisis'], ['entrevistas', 'brief'], ['sitios_vivos', 'contenido']];
for (const [t, col] of tablas) {
  const { rows } = await db.q(`SELECT id, ${col}::text AS j FROM ${t} WHERE ${col}::text ~ 'render[^"]*/files/'`).catch(() => ({ rows: [] }));
  let filas = 0, ligas = 0, rotas = 0;
  for (const r of rows) {
    const x = await reemplazar(r.j);
    ligas += x.n; rotas += x.rotas;
    if (APLICAR && x.out !== r.j) { await db.q(`UPDATE ${t} SET ${col}=$2::jsonb WHERE id=$1`, [r.id, x.out]); filas++; }
  }
  console.log(`${t}.${col}: ${rows.length} filas con ligas de render, ${ligas} ligas${APLICAR ? `, ${filas} filas actualizadas` : ''}, ${rotas} ya borradas en render`);
}
const dirP = path.join(config.dataDir, 'propuestas');
let archivos = 0, cambiados = 0;
async function recorrer(d) {
  for (const f of await fs.readdir(d, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) await recorrer(p);
    else if (f.name.endsWith('.html')) {
      const s = await fs.readFile(p, 'utf8');
      if (!RE.test(s)) continue; RE.lastIndex = 0;
      archivos++;
      const x = await reemplazar(s);
      if (APLICAR && x.out !== s) { await fs.writeFile(p, x.out); cambiados++; }
    }
  }
}
await recorrer(dirP);
console.log(`propuestas HTML: ${archivos} archivos con ligas de render${APLICAR ? `, ${cambiados} actualizados` : ''}`);
console.log(`ligas distintas: ${mapa.size}${APLICAR ? `, copiadas: ${[...mapa.values()].filter(Boolean).length}, ya no existían: ${[...mapa.values()].filter((v) => !v).length}` : ' (prueba; usa --aplicar)'}`);
process.exit(0);
