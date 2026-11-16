// Genera UNA opción para un cliente que ya tiene sus propuestas, sin tocar las demás. Sirve para cualquier opción del
// registro (generador/opciones/): al agregar una opción nueva no hace falta crear otro script.
// Usa los datos actuales del cliente (y lo editado en su panel si ya tiene sitio en vivo). Guarda <LETRA>.html junto a
// sus otras propuestas (/p/<token>/<LETRA>) y agrega la opción a su lista para que Ari la reconozca.
//
// Uso dentro del contenedor api:
//   node src/herramientas/generar_opcion.mjs <letra o nombre> "<nombre del negocio o id de entrevista>" [--aplicar]
//   Sin --aplicar solo prueba (no escribe nada).
//   --salida <ruta>            solo escribe el HTML en esa ruta, para revisarlo, sin tocar las opciones del cliente.
//   --letra=Onest              letra elegida a mano para títulos y texto;  --letra="Titulos|Cuerpo"  para dos distintas.
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import * as db from '../entrevista/db.js';
import { procesarMateriales } from '../generador/materiales.js';
import { renderPropuestas, DIR_PROPUESTAS } from '../generador/propuestas_html.js';
import { parPorNombres } from '../generador/fuentes.js';
import { OPCIONES, porLetra, porNombre } from '../generador/opciones/registro.js';

const [cual, arg] = process.argv.slice(2).filter((a) => !a.startsWith('--') && a !== process.argv[process.argv.indexOf('--salida') + 1]);
const APLICAR = process.argv.includes('--aplicar');
const LETRA_TIPO = (process.argv.find((a) => a.startsWith('--letra=')) || '').slice(8).replace(/^"|"$/g, '');
const iS = process.argv.indexOf('--salida');
const SALIDA = iS > 0 ? process.argv[iS + 1] : null;

const op = porLetra(cual) || porNombre(String(cual || '').toLowerCase());
if (!op) { console.error(`No conozco la opción "${cual || ''}". Opciones: ${OPCIONES.map((o) => `${o.letra} (${o.nombre})`).join(', ')}`); process.exit(1); }
if (!arg) { console.error('Falta el nombre del negocio o el id de la entrevista'); process.exit(1); }
const L = op.letra;

const { rows } = await db.q(`SELECT id, brief->'negocio'->>'nombre' AS nombre, actualizado FROM entrevistas
  WHERE id::text = $1 OR brief->'negocio'->>'nombre' ILIKE $2 ORDER BY actualizado DESC`, [arg, `%${arg}%`]);
if (!rows.length) { console.error('No encontré esa entrevista'); process.exit(1); }
console.log('Coincidencias:', rows.map((r) => `${r.id} · ${r.nombre} · ${new Date(r.actualizado).toISOString().slice(0, 10)}`).join(' | '));
const e = await db.obtener(rows[0].id);
const prop = e.brief?.marca?.propuestas;
if (!prop?.token) { console.error('Ese cliente aún no tiene propuestas'); process.exit(1); }

// Si ya tiene sitio en vivo, la opción se arma con lo que editó en su panel.
let brief = e.brief, textos = prop.textos || {};
const sv = (await db.q(`SELECT * FROM sitios_vivos WHERE entrevista_id=$1 AND estado='activo' ORDER BY id DESC LIMIT 1`, [e.id]).catch(() => ({ rows: [] }))).rows[0];
if (sv) { const { aplicarContenido } = await import('../panel/sitios.js'); ({ brief, textos } = aplicarContenido(e, sv)); }

const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
if (op.apta && !op.apta({ brief, mat })) console.warn(`Aviso: por su giro o por su material, la ${L} no le saldría sola a este cliente; se arma de todos modos.`);
const [tit, cue] = LETRA_TIPO ? LETRA_TIPO.split('|') : [];
const fijo = LETRA_TIPO ? { letra: L, fuentes: parPorNombres({ titulos: tit, cuerpo: cue || tit, estilo: brief.marca?.estilo }) } : null;
if (fijo) console.log('Letra:', fijo.fuentes.titulos, '/', fijo.fuentes.cuerpo);
const r = await renderPropuestas(brief, mat, textos, { ronda: prop.ronda || 0, solo: L, fijo });
const g = r.paginas.find((p) => p.letra === L);
if (!g) { console.error(`No se armó la ${L}${e.brief?.negocio?.arquetipo === 'restaurante' ? ' (restaurantes y cafeterías usan otra plantilla y no tienen esta opción)' : ''}`); process.exit(1); }
if (SALIDA) { await fs.writeFile(SALIDA, g.html); console.log('Escrito:', SALIDA); process.exit(0); }
const archivo = path.join(DIR_PROPUESTAS, prop.token, `${L}.html`);
const url = `${config.publicUrl}/p/${prop.token}/${L}`;
if (!APLICAR) { console.log('Prueba (sin --aplicar):', g.html.length, 'bytes →', archivo); process.exit(0); }
await fs.writeFile(archivo, g.html);
const nueva = { etiqueta: L, letra: L, layout: op.nombre, nombre: op.titulo, url, estilo: g.fuentes?.estilo, tipografia: { titulos: g.fuentes?.titulos, cuerpo: g.fuentes?.cuerpo, estilo: g.fuentes?.estilo }, paleta: g.paleta };
const opciones = [...(prop.opciones || []).filter((o) => (o.etiqueta || o.letra) !== L), nueva];
await db.guardar(e.id, { brief: { ...e.brief, marca: { ...e.brief.marca, propuestas: { ...prop, opciones } } } });
console.log('Lista:', url);
// Algunas opciones dejan trabajo en cola al generarse (por ejemplo, el video de respaldo del collage).
if (op.esperaAlGenerarMs) await new Promise((ok) => setTimeout(ok, op.esperaAlGenerarMs));
process.exit(0);
