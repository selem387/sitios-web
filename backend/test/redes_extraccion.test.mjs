import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarLigas, aplicarAlBrief, asegurarResumen, DIFERIR_ATAJO } from '../src/entrevista/redes_extraccion.js';
import { faltantes } from '../src/entrevista/requisitos.js';

test('detecta ligas y @usuario solo si se preguntó por redes', () => {
  assert.deepEqual(detectarLigas('mi face es https://m.facebook.com/ToolatteMerida y ya'), { facebook: 'https://m.facebook.com/ToolatteMerida', instagram: null });
  assert.equal(detectarLigas('@toolattemid'), null);
  assert.deepEqual(detectarLigas('en insta @toolattemid', { preguntoRedes: true }), { facebook: null, instagram: 'https://www.instagram.com/toolattemid/' });
  assert.equal(detectarLigas('no tengo face', { preguntoRedes: true }), null);
});

test('llena solo lo vacío y no pisa al cliente', () => {
  const r = { negocio: { nombre: 'Toolatte Redes', giro_texto: 'cafetería', ciudad: 'Mérida' }, contacto: { whatsapp: '5219991112233', redes: { instagram: 'https://www.instagram.com/x/' } }, oferta: { servicios: [{ nombre: 'Café' }] }, logo: { url: 'u' } };
  const { brief, encontrado } = aplicarAlBrief({ negocio: { nombre: 'Toolatte' } }, r);
  assert.equal(brief.negocio.nombre, 'Toolatte');
  assert.equal(brief.negocio.giro_texto, 'cafetería');
  assert.equal(brief.oferta.items[0].nombre, 'Café');
  assert.equal(brief.marca.tiene_logo, true);
  assert.ok(!encontrado.includes('nombre') && encontrado.includes('servicios'));
});

test('requisito redes en B0 y atajo difiere cliente ideal y zona', () => {
  assert.ok(faltantes({ cliente: { nombre: 'Ana' } }, [], { hasta: 'B0' }).some((f) => f.id === 'redes'));
  assert.ok(!faltantes({ cliente: { nombre: 'Ana' }, no_tiene: ['redes'] }, [], { hasta: 'B0' }).length);
  const ids = faltantes({ cliente: { nombre: 'Ana' }, redes_extraccion: { id: 'x' }, diferir: DIFERIR_ATAJO }, [], { hasta: 'B5' }).map((f) => f.id);
  assert.ok(!ids.includes('zona') && !ids.includes('cliente_ideal') && ids.includes('estilo'));
});

test('el resumen siempre sale en el mensaje', () => {
  const b = { redes_extraccion: { id: 'x' } };
  const r = asegurarResumen('¿Va?', b, '• Nombre: Toolatte\n• Tu logo');
  assert.match(r.reply, /Revisé tus redes/);
  assert.equal(r.brief.redes_extraccion.resumen_mostrado, true);
});
