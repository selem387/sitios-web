// Compara lo que producen los generadores antes y después de un cambio, con los negocios reales de la base
// (clientes y prospectos). Todo queda en el servidor (DATA_DIR/comparacion): no se copia ningún dato a GitHub.
// Uso dentro del contenedor api (SRC_DIR solo si el script se corre desde fuera de src/herramientas):
//   node comparar_generadores.mjs capturar            guarda las entradas (brief, material, textos) de cada negocio
//   node comparar_generadores.mjs generar <etiqueta>  genera todas las opciones con esas entradas y guarda el HTML
//   node comparar_generadores.mjs comparar <a> <b>    dice si dos corridas salieron idénticas y, si no, dónde difieren
// capturar y generar son reanudables: trabajan hasta SEGUNDOS (45 por omisión), dicen cuántos faltan y la siguiente
// llamada sigue donde quedó. Para empezar de cero, borrar DATA_DIR/comparacion/<entradas o etiqueta>.
// No encola videos (CLIPS_ACTIVOS=0) ni toca las propuestas de los clientes.
process.env.CLIPS_ACTIVOS = '0';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

const SRC = process.env.SRC_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(SRC, p)).href);
const { config } = await imp('config.js');
const DIR = path.join(config.dataDir, 'comparacion');
const [modo, a, b] = process.argv.slice(2);
const LIMITE = Date.now() + Number(process.env.SEGUNDOS || 45) * 1000;
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
const EXTRA = 'GHIJKLMNOPQRSTUVWXYZ'.split('');
const banderas = (on) => { for (const l of EXTRA) { if (on) process.env[`OPCION_${l}`] = '1'; else delete process.env[`OPCION_${l}`]; } };

if (modo === 'capturar') {
  const db = await imp('entrevista/db.js');
  const { procesarMateriales } = await imp('generador/materiales.js');
  const { rows } = await db.q(`SELECT id FROM entrevistas WHERE brief->'marca'->'propuestas'->>'token' IS NOT NULL ORDER BY id`);
  fs.mkdirSync(path.join(DIR, 'entradas'), { recursive: true });
  let ok = 0; const fallas = []; let pendientes = 0;
  for (const { id } of rows) {
    if (fs.existsSync(path.join(DIR, 'entradas', `${id}.json`))) continue;
    if (Date.now() > LIMITE) { pendientes++; continue; }
    try {
      const e = await db.obtener(id);
      const prop = e.brief.marca.propuestas;
      const mat = await procesarMateriales(e.id, e.brief, { aceptarLoQueHay: true });
      fs.writeFileSync(path.join(DIR, 'entradas', `${id}.json`), JSON.stringify({ id, brief: e.brief, mat, textos: prop.textos || {}, ronda: prop.ronda || 0 }));
      ok++;
    } catch (err) { fallas.push(`${id}: ${String(err.message).slice(0, 120)}`); }
  }
  const listas = fs.readdirSync(path.join(DIR, 'entradas')).length;
  console.log(`negocios con propuestas: ${rows.length} · guardadas en esta vuelta: ${ok} · guardadas en total: ${listas} · faltan: ${pendientes} · fallas: ${fallas.length}`);
  for (const f of fallas.slice(0, 10)) console.log('  FALLA', f);
  process.exit(0);
}

if (modo === 'generar' && a) {
  const { renderPropuestas } = await imp('generador/propuestas_html.js');
  var semilla = 7; Math.random = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  const out = path.join(DIR, a); fs.mkdirSync(path.join(out, '_m'), { recursive: true });
  let paginas = 0, errores = 0, hechos = 0, pendientes = 0;
  const archivos = fs.readdirSync(path.join(DIR, 'entradas')).filter((f) => f.endsWith('.json')).sort();
  for (const f of archivos) {
    if (fs.existsSync(path.join(out, '_m', f))) { hechos++; continue; }
    if (Date.now() > LIMITE) { pendientes++; continue; }
    const { id, brief, mat, textos, ronda } = JSON.parse(fs.readFileSync(path.join(DIR, 'entradas', f), 'utf8'));
    const manifiesto = {};
    const variantes = [['base', { ronda }, false], ['todas', { ronda }, true], ['otra-ronda', { ronda: ronda + 1 }, false], ...EXTRA.map((l) => [`solo-${l}`, { ronda, solo: l }, false])];
    for (const [nombre, opts, on] of variantes) {
      const clave = `${id}/${nombre}`;
      semilla = 7;
      try {
        banderas(on);
        const r = await renderPropuestas(structuredClone(brief), structuredClone(mat), structuredClone(textos), opts);
        banderas(false);
        manifiesto[`${clave}/_lista`] = sha(JSON.stringify((r.paginas || []).map((p) => ({ letra: p.letra, layout: p.layout, nombre: p.nombre, fuentes: p.fuentes, paleta: p.paleta }))));
        for (const p of r.paginas || []) {
          const dest = path.join(out, clave, `${p.letra}.html`);
          fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, p.html);
          manifiesto[`${clave}/${p.letra}`] = sha(p.html); paginas++;
        }
      } catch (err) { banderas(false); manifiesto[`${clave}/ERROR`] = String(err.message).slice(0, 200); errores++; }
    }
    fs.writeFileSync(path.join(out, '_m', f), JSON.stringify(manifiesto));
    hechos++;
  }
  console.log(`[${a}] negocios listos: ${hechos} de ${archivos.length} · faltan: ${pendientes} · páginas en esta vuelta: ${paginas} · variantes con error: ${errores}`);
  process.exit(0);
}

if (modo === 'comparar' && a && b) {
  const leer = (et) => Object.assign({}, ...fs.readdirSync(path.join(DIR, et, '_m')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, et, '_m', f), 'utf8'))));
  const A = leer(a), B = leer(b);
  const errs = Object.keys(B).filter((k) => k.endsWith('/ERROR'));
  if (errs.length) console.log(`variantes con error en [${b}]: ${errs.length} (si también están en [${a}], son del dato, no del cambio)`);
  const claves = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
  const distintas = claves.filter((k) => A[k] !== B[k]);
  console.log(`[${a}] vs [${b}] · elementos: ${claves.length} · distintos: ${distintas.length}`);
  for (const k of distintas.slice(0, 25)) console.log('  ', k, A[k] === undefined ? '(solo en la segunda)' : B[k] === undefined ? '(solo en la primera)' : '(cambió)');
  process.exit(distintas.length ? 2 : 0);
}

console.error('Uso: capturar | generar <etiqueta> | comparar <a> <b>');
process.exit(1);
