import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logoAcotado, logoDesbordado, LOGO_V } from '../src/generador/materiales.js';

const box = (left, top, width, height) => ({ left, top, width, height });

test('logo dentro de otra imagen: la ampliación desbordada se descarta (caso Toolatte)', () => {
  const modelo = box(80, 230, 400, 140);
  assert.equal(logoAcotado(box(0, 0, 738, 1509), modelo, 738, 1509), null);
  assert.equal(logoAcotado(box(60, 220, 900, 400), modelo, 2000, 3000), null); // > 3 veces el área del modelo
  const ok = box(70, 222, 430, 160);
  assert.deepEqual(logoAcotado(ok, modelo, 738, 1509), ok);
  assert.deepEqual(logoAcotado(ok, null, 738, 1509), ok);
});

test('análisis guardados con logo desbordado se rehacen una vez', () => {
  assert.equal(logoDesbordado({ tipo: 'menu', logo: { url: 'x' }, logo_v: 5, logo_caja: { x: 0, y: 0, w: 1, h: 1 } }), true);
  assert.equal(logoDesbordado({ tipo: 'menu', logo: { url: 'x' }, logo_v: LOGO_V, logo_caja: { x: 0, y: 0, w: 1, h: 1 } }), false);
  assert.equal(logoDesbordado({ tipo: 'logo', logo: { url: 'x' }, logo_v: 5, logo_caja: { x: 0, y: 0, w: 1, h: 1 } }), false);
  assert.equal(logoDesbordado({ tipo: 'menu', logo: { url: 'x' }, logo_v: 5, logo_caja: { x: .1, y: .1, w: .5, h: .2 } }), false);
});
