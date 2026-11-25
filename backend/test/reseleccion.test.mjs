// Volver a elegir paleta o letra con un pedido general (24-nov-2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pideGeneral, iniciarReseleccion, atenderReseleccion, momentoDe, instruccionCambio } from '../src/entrevista/reseleccion.js';

const deps = { imagen: async () => 'https://render/files/x.png', coloresLogo: async () => [] };
const brief = { negocio: { nombre: 'Nómada', giro_texto: 'agencia de diseño', arquetipo: 'servicios' }, marca: { paleta_elegida: { nombre: 'Teal profundo', colores: { marca: '#1E3638', acento: '#D08C60', fondo: '#F7F3EE', texto: '#1C1C1C' } }, propuestas: { opciones: [{ letra: 'K' }] } } };

test('pedidos generales vs puntuales', () => {
  assert.equal(pideGeneral('cambia los colores'), 'paleta');
  assert.equal(pideGeneral('no me gustan los colores'), 'paleta');
  assert.equal(pideGeneral('quiero otra letra'), 'letra');
  assert.equal(pideGeneral('cámbiale la tipografía'), 'letra');
  assert.equal(pideGeneral('pon el botón naranja'), null);
  assert.equal(pideGeneral('cambia el color del título'), null);
  assert.equal(pideGeneral('la letra de los textos más grande'), null);
  assert.equal(pideGeneral('agrega mi horario'), null);
});

test('momento', () => {
  assert.equal(momentoDe(brief), 'propuestas');
  assert.equal(momentoDe(brief, { sitioVivo: true }), 'version');
  assert.equal(momentoDe({ marca: {} }), 'previo');
});

test('flujo: imagen sin la paleta actual → "más" → elige', async () => {
  const r = await iniciarReseleccion({ brief, tipo: 'paleta', momento: 'propuestas' }, deps);
  assert.equal(r.media.length, 1);
  assert.ok(!r.brief.marca.reseleccion.paletas.opciones.some((o) => o.nombre === 'Teal profundo'));
  const m = await atenderReseleccion({ brief: r.brief, texto: 'más' }, deps);
  assert.equal(m.media.length, 1);
  const e = await atenderReseleccion({ brief: m.brief, texto: 'la B' }, deps);
  assert.equal(e.eleccion.tipo, 'paleta');
  assert.ok(e.eleccion.valor.colores.marca);
  assert.equal(e.brief.marca.reseleccion, undefined);
  assert.match(instruccionCambio(e.eleccion), /Cambia la paleta de colores de TODA la página/);
});

test('si habla de otra cosa se cancela y se atiende normal', async () => {
  const r = await iniciarReseleccion({ brief, tipo: 'letra', momento: 'version' }, deps);
  const c = await atenderReseleccion({ brief: r.brief, texto: 'mejor agrega mi horario de lunes a viernes' }, deps);
  assert.equal(c.cancelado, true);
  assert.equal(c.brief.marca.reseleccion, undefined);
});
