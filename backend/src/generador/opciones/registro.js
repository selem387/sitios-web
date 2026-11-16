// Registro de opciones de diseño (16-nov-2026).
// Cada opción vive en su carpeta dentro de este directorio y se da de alta sola: basta con que la carpeta tenga un
// archivo opcion.js que exporte `opcion`. Agregar una opción NO requiere editar este archivo ni ningún otro compartido.
//
// Contrato de `opcion` (campos con * obligatorios):
//   nombre*   nombre interno; debe ser igual al nombre de la carpeta. Es también el `layout` de la propuesta.
//   letra*    letra fija que ve el cliente. La asigna Sebastián desde el chat designado (siguiente libre).
//   indice*   posición fija (0 = A). Decide qué variante de texto, paleta y efectos le tocan; no se cambia nunca.
//   titulo*   nombre que ve el cliente ("Guía en movimiento").
//   base      true en las 6 opciones que salen siempre (A–F).
//   propia    true si conserva su diseño (letra y paleta) aunque el cliente tenga estilo de referencia.
//   par(pares, i)        tipografía propia de la opción; si falta, se usa el par del estilo del cliente.
//   urlFuentes           liga de fuentes propia (si no la arma la plantilla con su par).
//   apta({brief, mat})   requisito para salir sola (por ejemplo, mínimo de fotos). Si falta, siempre es apta.
//   pagina(d, kit)       arma su página completa y devuelve el HTML. Si falta, la arma la plantilla general.
//   completa(ctx)        arma el resultado entero ({html, fuentes, paleta}) sin pasar por la plantilla general.
//   sinWordPress         true si no tiene versión WordPress (usa la composición de foto a pantalla completa).
//   cssRevision          CSS para que la revisión visual la mida quieta y completa.
//   esperaAlGenerarMs    milisegundos que la herramienta de generación manual espera al terminar (trabajo en cola).
//   paleta({base, tinte, papel, tinta})  colores propios de la opción (bg, fg, primary, muted, banda…); la plantilla completa el resto.
//   temaOscuro           true si la paleta es de fondo oscuro (tarjetas y acento se ajustan).
//   conFotoPrincipal     true si la portada abre con la foto principal del cliente.
//   plantilla            cómo se arma con la plantilla general (propuestas_general.js). c es el contexto de la página:
//     portada(c)                    HTML de la portada.
//     secciones(c, s)               lista ordenada de secciones; s trae las comunes del kit (kit/secciones.js).
//     claseHtml, css                clase del <html> (si no, la de efectos por letra) y CSS propio.
//     trasBarra(c, {navs, contenido})   HTML después de la barra (índices, menús).
//     cierre(c)                     HTML al final de <main>.   js(c): scripts propios al final de <body>.
//     final(html, c)                último retoque del HTML completo.
//     paginaCompleta(c, {ft, fc})   arma la página entera con lo ya calculado (la I).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const carpetas = fs.readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(DIR, d.name, 'opcion.js')))
  .map((d) => d.name).sort();

const cargadas = [];
for (const carpeta of carpetas) {
  const { opcion } = await import(`./${carpeta}/opcion.js`);
  if (!opcion) throw new Error(`opciones/${carpeta}/opcion.js no exporta "opcion"`);
  if (opcion.nombre !== carpeta) throw new Error(`opciones/${carpeta}: el nombre "${opcion.nombre}" debe ser igual al de la carpeta`);
  for (const campo of ['letra', 'titulo']) if (typeof opcion[campo] !== 'string' || !opcion[campo]) throw new Error(`opciones/${carpeta}: falta "${campo}"`);
  if (!Number.isInteger(opcion.indice) || opcion.indice < 0) throw new Error(`opciones/${carpeta}: "indice" debe ser un entero desde 0`);
  // Los patrones que reconocen la letra en el chat y en las ligas trabajan con una sola letra mayúscula.
  // Después de la Z se seguirá con dos letras (AA, AB); ese cambio se hace aquí y en letras.js, no en cada opción.
  if (!/^[A-Z]$/.test(opcion.letra)) throw new Error(`opciones/${carpeta}: la letra "${opcion.letra}" debe ser una sola letra mayúscula`);
  cargadas.push(Object.freeze({ ...opcion }));
}

// Letras apartadas para opciones que aún no están en el repositorio. Cuentan como letra válida y conservan su
// posición para que nada se recorra. La L es de "Plataforma" (PR #29, pendiente de pasar a su carpeta).
export const RESERVADAS = Object.freeze([Object.freeze({ nombre: 'reservada_l', letra: 'L', indice: 11, reservada: true })]);

const todas = [...cargadas, ...RESERVADAS.filter((r) => !cargadas.some((o) => o.letra === r.letra || o.indice === r.indice))].sort((a, b) => a.indice - b.indice);
for (const campo of ['nombre', 'letra', 'indice']) {
  const vistos = new Map();
  for (const o of todas) { if (vistos.has(o[campo])) throw new Error(`Dos opciones con el mismo ${campo} "${o[campo]}": ${vistos.get(o[campo])} y ${o.nombre}`); vistos.set(o[campo], o.nombre); }
}
todas.forEach((o, k) => { if (o.indice !== k) throw new Error(`Falta la opción con indice ${k} (hay un hueco antes de "${o.nombre}")`); });

/** Opciones que existen (sin las reservadas), en orden de índice. */
export const OPCIONES = Object.freeze(todas.filter((o) => !o.reservada));
/** Las que salen siempre (A–F) y las adicionales. */
export const OPCIONES_BASE = Object.freeze(OPCIONES.filter((o) => o.base));
export const OPCIONES_EXTRA = Object.freeze(OPCIONES.filter((o) => !o.base));
/** Letras por posición, incluidas las reservadas: LETRAS[indice] es la letra. */
export const LETRAS = todas.map((o) => o.letra).join('');
/** Nombre interno (layout) por posición, incluidas las reservadas. */
export const LAYOUTS = Object.freeze(todas.map((o) => o.nombre));
/** Nombre que ve el cliente, por nombre interno. */
export const NOMBRES = Object.freeze(Object.fromEntries(OPCIONES.map((o) => [o.nombre, o.titulo])));

export const porLetra = (letra) => OPCIONES.find((o) => o.letra === String(letra || '').toUpperCase()) || null;
export const porNombre = (nombre) => OPCIONES.find((o) => o.nombre === nombre) || null;
/** Posición de una letra (0 si no existe o viene vacía, como se ha hecho siempre). */
export const indiceDeLetra = (letra) => Math.max(0, LETRAS.indexOf(letra));
