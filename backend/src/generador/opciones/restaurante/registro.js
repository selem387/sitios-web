// Opciones de restaurantes y cafeterías (etapa 3, 18-nov-2026): una carpeta por opción, igual que las generales, con su
// propia tabla de letras (A–F de restaurante no son las A–F generales: las letras ya entregadas a clientes no cambian).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const carpetas = fs.readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(DIR, d.name, 'opcion.js'))).map((d) => d.name).sort();
const cargadas = [];
for (const carpeta of carpetas) {
  const { opcion } = await import(`./${carpeta}/opcion.js`);
  if (!opcion || opcion.nombre !== carpeta) throw new Error(`opciones/restaurante/${carpeta}: "opcion.nombre" debe ser igual a la carpeta`);
  if (opcion.giro !== 'restaurante') throw new Error(`opciones/restaurante/${carpeta}: falta giro: 'restaurante'`);
  for (const f of ['paleta', 'portada', 'portadaSlider', 'orden']) if (typeof opcion[f] !== 'function') throw new Error(`opciones/restaurante/${carpeta}: falta "${f}"`);
  if (!/^[A-Z]$/.test(opcion.letra)) throw new Error(`opciones/restaurante/${carpeta}: letra inválida`);
  cargadas.push(Object.freeze({ ...opcion }));
}
cargadas.sort((a, b) => a.indice - b.indice);
for (const campo of ['letra', 'indice']) if (new Set(cargadas.map((o) => o[campo])).size !== cargadas.length) throw new Error(`opciones/restaurante: ${campo} repetido`);

/** Opciones de restaurante en orden (A, B, C…). */
export const OPCIONES_RESTAURANTE = Object.freeze(cargadas);
export const porLayoutRestaurante = (nombre) => cargadas.find((o) => o.nombre === nombre) || null;
