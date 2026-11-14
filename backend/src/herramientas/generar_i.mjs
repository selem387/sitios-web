// Genera la opción I (historia con scroll) para un cliente que ya tiene sus 6 opciones, sin tocar las demás.
// Usa sus datos actuales (y lo editado en su panel si ya tiene sitio en vivo). Guarda I.html junto a sus otras
// propuestas (/p/<token>/I) y agrega la I a su lista de opciones para que Ari la reconozca.
// Uso dentro del contenedor api:  node src/herramientas/generar_i.mjs "<nombre del negocio o id de entrevista>" [--aplicar]
// Letra elegida a mano (14-nov-2026, Blanca pidió Onest):  --letra=Onest  (títulos y texto)  o  --letra="Titulos|Cuerpo"
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import * as db from '../entrevista/db.js';
import { procesarMateriales } from '../generador/materiales.js';
import { renderPropuestas, DIR_PROPUESTAS } from '../generador/propuestas_html.js';
import { NOMBRES_GENERAL, historiaApta } from '../generador/propuestas_general.js';
import { parPorNombres } from '../generador/fuentes.js';

const arg = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
const LETRA = (process.argv.find((a) => a.startsWith('--letra=')) || '').slice(8).replace(/^"|"$/g, '');
if (!arg) { console.error('Falta el nombre del negocio o el id de la entrevista'); process.exit(1); }

const { rows } = await db.q(`SELECT id, brief->'negocio'->>'nombre' AS nombre, actualizado FROM entrevistas
  WHERE id::text = $1 OR brief->'negocio'->>'nombre' ILIKE $2 ORDER BY actualizado DESC`, [arg, `%${arg}%`]);
if (!rows.length) { console.error('No encontré esa entrevista'); process.exit(1); }
console.log('Coincidencias:', rows.map((r) => `${r.id} · ${r.nombre} · ${new Date(r.actualizado).toISOString().slice(0, 10)}`).join(' | '));
const e = await db.obtener(rows[0].id);
const prop = e.brief?.marca?.propuestas;
if (!prop?.token) { console.error('Ese cliente aún no tiene propuestas'); process.exit(1); }
if (e.brief?.negocio?.arquetipo === 'restaurante') { console.error('Restaurantes no tienen opción I'); process.exit(1); }

// Si ya tiene sitio en vivo, la I se arma con lo que editó en su panel.
let brief = e.brief, textos = prop.textos || {};
const sv = (await db.q(`SELECT * FROM sitios_vivos WHERE entrevista_id=$1 AND estado='activo' ORDER BY id DESC LIMIT 1`, [e.id]).catch(() => ({ rows: [] }))).rows[0];
if (sv) { const { aplicarContenido } = await import('../panel/sitios.js'); ({ brief, textos } = aplicarContenido(e, sv)); }

const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
if (!historiaApta(brief, mat)) console.warn('Aviso: por su giro o por sus fotos (menos de 4 buenas) la I no saldría sola con OPCION_I=1; se arma de todos modos.');
const [tit, cue] = LETRA ? LETRA.split('|') : [];
const fijo = LETRA ? { letra: 'I', fuentes: parPorNombres({ titulos: tit, cuerpo: cue || tit, estilo: brief.marca?.estilo }) } : null;
if (fijo) console.log('Letra:', fijo.fuentes.titulos, '/', fijo.fuentes.cuerpo);
const r = await renderPropuestas(brief, mat, textos, { ronda: prop.ronda || 0, solo: 'I', fijo });
const g = r.paginas.find((p) => p.letra === 'I');
if (!g) { console.error('No se armó la I'); process.exit(1); }
const archivo = path.join(DIR_PROPUESTAS, prop.token, 'I.html');
const url = `${config.publicUrl}/p/${prop.token}/I`;
if (!APLICAR) { console.log('Prueba (sin --aplicar):', g.html.length, 'bytes →', archivo); process.exit(0); }
await fs.writeFile(archivo, g.html);
const op = { etiqueta: 'I', letra: 'I', layout: 'historia', nombre: NOMBRES_GENERAL.historia, url, estilo: g.fuentes?.estilo, tipografia: { titulos: g.fuentes?.titulos, cuerpo: g.fuentes?.cuerpo, estilo: g.fuentes?.estilo }, paleta: g.paleta };
const opciones = [...(prop.opciones || []).filter((o) => (o.etiqueta || o.letra) !== 'I'), op];
await db.guardar(e.id, { brief: { ...e.brief, marca: { ...e.brief.marca, propuestas: { ...prop, opciones } } } });
console.log('Lista:', url);
process.exit(0);
