// Pruebas de interpretarEleccion (generador/opciones.js): letras sueltas, rechazos y preguntas.
import { interpretarEleccion as f } from '../src/generador/opciones.js';
const casos = [
  ['B', { elegido: 'B' }], ['la b', { elegido: 'B' }], ['b porfa', { elegido: 'B' }], ['Opción a', { elegido: 'A' }],
  ['La D me encantó', { elegido: 'D' }], ['Me quedo con la E', { elegido: 'E' }], ['la 3', { elegido: 'C' }], ['2', { elegido: 'B' }],
  ['me late la segunda pero a mi esposa no', { elegido: 'B' }], ['a mi esposa le gustó la B', { elegido: 'B' }],
  ['me gusta la a con los colores de la c', { elegido: 'A', colores_de: 'C' }], ['la C con los colores de la A', { elegido: 'C', colores_de: 'A' }],
  ['No me gusta la C, prefiero la A', { elegido: 'A' }],
  ['ninguna, a mí no me gustó', { ninguna: true }], ['A mí no me gustó ninguna', { ninguna: true }], ['ninguna me convence', { ninguna: true }],
  ['no me gustaron, quiero otras', { ninguna: true }], ['las vi todas y están bonitas, pero quiero otras más elegantes', { ninguna: true }],
  ['Ninguna, la B se acerca pero los colores no', { ninguna: true }],
  ['¿cuáles 6?', null], ['¿dónde las veo?', null], ['Hola, ya las vi', null], ['No me gusta la C', null],
];
let mal = 0;
for (const [texto, esperado] of casos) {
  const r = f(texto);
  const ok = esperado === null ? r === null : r && Object.entries(esperado).every(([k, v]) => r[k] === v) && (!esperado.elegido || !esperado.colores_de ? true : true);
  if (!ok) { mal++; console.log('FALLA', JSON.stringify(texto), '→', JSON.stringify(r), 'esperado', JSON.stringify(esperado)); }
}
console.log(`${casos.length - mal}/${casos.length} casos de elección correctos`);
if (mal) process.exit(1);
