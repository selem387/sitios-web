// Genera la opción G (collage en movimiento) para un cliente que ya tiene sus 6 opciones, sin tocar las demás.
// Usa sus datos actuales (y lo editado en su panel si ya tiene sitio en vivo). Guarda G.html junto a sus otras
// propuestas (/p/<token>/G) y agrega la G a su lista de opciones para que Ari la reconozca.
// Uso dentro del contenedor api:  node src/herramientas/generar_g.mjs "<nombre del negocio o id de entrevista>" [--aplicar]
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import * as db from '../entrevista/db.js';
import { procesarMateriales } from '../generador/materiales.js';
import { renderPropuestas, DIR_PROPUESTAS } from '../generador/propuestas_html.js';
import { NOMBRES_GENERAL } from '../generador/propuestas_general.js';

const arg = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
if (!arg) { console.error('Falta el nombre del negocio o el id de la entrevista'); process.exit(1); }

const { rows } = await db.q(`SELECT id, brief->'negocio'->>'nombre' AS nombre, actualizado FROM entrevistas
  WHERE id::text = $1 OR brief->'negocio'->>'nombre' ILIKE $2 ORDER BY actualizado DESC`, [arg, `%${arg}%`]);
if (!rows.length) { console.error('No encontré esa entrevista'); process.exit(1); }
console.log('Coincidencias:', rows.map((r) => `${r.id} · ${r.nombre} · ${new Date(r.actualizado).toISOString().slice(0, 10)}`).join(' | '));
const e = await db.obtener(rows[0].id);
const prop = e.brief?.marca?.propuestas;
if (!prop?.token) { console.error('Ese cliente aún no tiene propuestas'); process.exit(1); }
if (e.brief?.negocio?.arquetipo === 'restaurante') { console.error('Restaurantes no tienen opción G'); process.exit(1); }

// Si ya tiene sitio en vivo, la G se arma con lo que editó en su panel.
let brief = e.brief, textos = prop.textos || {};
const sv = (await db.q(`SELECT * FROM sitios_vivos WHERE entrevista_id=$1 AND estado='activo' ORDER BY id DESC LIMIT 1`, [e.id]).catch(() => ({ rows: [] }))).rows[0];
if (sv) { const { aplicarContenido } = await import('../panel/sitios.js'); ({ brief, textos } = aplicarContenido(e, sv)); }

const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
const r = await renderPropuestas(brief, mat, textos, { ronda: prop.ronda || 0, solo: 'G' });
const g = r.paginas.find((p) => p.letra === 'G');
if (!g) { console.error('No se armó la G'); process.exit(1); }
const archivo = path.join(DIR_PROPUESTAS, prop.token, 'G.html');
const url = `${config.publicUrl}/p/${prop.token}/G`;
if (!APLICAR) { console.log('Prueba (sin --aplicar):', g.html.length, 'bytes →', archivo); process.exit(0); }
await fs.writeFile(archivo, g.html);
const op = { etiqueta: 'G', letra: 'G', layout: 'collage', nombre: NOMBRES_GENERAL.collage, url, estilo: g.fuentes?.estilo, tipografia: { titulos: g.fuentes?.titulos, cuerpo: g.fuentes?.cuerpo, estilo: g.fuentes?.estilo }, paleta: g.paleta };
const opciones = [...(prop.opciones || []).filter((o) => (o.etiqueta || o.letra) !== 'G'), op];
await db.guardar(e.id, { brief: { ...e.brief, marca: { ...e.brief.marca, propuestas: { ...prop, opciones } } } });
console.log('Lista:', url);
// Deja correr la cola del MP4 de respaldo antes de salir.
await new Promise((ok) => setTimeout(ok, 90000));
process.exit(0);
