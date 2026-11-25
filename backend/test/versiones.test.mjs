// Varias versiones de diseño después de elegir (24-nov-2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conDisenoActivo, letraActiva, versionesDe } from '../src/panel/sitios.js';
import { leerFinal } from '../src/entrevista/propuestas.js';

const brief = { marca: { propuestas: { elegido: 'K' } } };

test('cambiar a otra versión guarda la anterior con sus ajustes y comparte el contenido', () => {
  const k0 = { servicios: { items: ['Branding'] }, diseno: { css: '.h1{color:red}', paleta: { p: '#111111' } } };
  const k1 = conDisenoActivo(k0, { propuesta: 'N' }, { letraAntes: 'K' });
  assert.equal(k1.diseno.propuesta, 'N');
  assert.equal(k1.disenos.K.css, '.h1{color:red}');
  assert.deepEqual(k1.servicios, k0.servicios);
  // Ajuste en la N y regreso a la K: la K vuelve como estaba y la N queda guardada con su ajuste.
  const k2 = { ...k1, diseno: { ...k1.diseno, css: '.x{margin:0}' } };
  const k3 = conDisenoActivo(k2, { propuesta: 'K' }, { letraAntes: 'N' });
  assert.equal(k3.diseno.propuesta, 'K');
  assert.equal(k3.diseno.css, '.h1{color:red}');
  assert.equal(k3.disenos.N.css, '.x{margin:0}');
  assert.equal(k3.disenos.K, undefined);
  assert.deepEqual(versionesDe({ contenido: k3 }, brief).sort(), ['K', 'N']);
  assert.equal(letraActiva({ contenido: k3 }, brief), 'K');
});

test('un ajuste sin cambiar de letra no crea versiones', () => {
  const k = conDisenoActivo({ diseno: { propuesta: 'K' } }, { propuesta: 'K', css: '.a{}' }, { letraAntes: 'K' });
  assert.equal(k.disenos, undefined);
  assert.equal(k.diseno.css, '.a{}');
});

test('decisión final', () => {
  const L = ['K', 'N', 'J', 'M', 'R', 'H'];
  assert.equal(leerFinal('me quedo con la N', L), 'N');
  assert.equal(leerFinal('Decidí la R', L), 'R');
  assert.equal(leerFinal('la J es la final', L), 'J');
  assert.equal(leerFinal('la N', L), null);
  assert.equal(leerFinal('la N', L, { preguntando: true }), 'N');
  assert.equal(leerFinal('me quedo con la Z', L), null);
  assert.equal(leerFinal('quiero modificar la N', L), null);
});

test('paleta nueva: el CSS propio pierde los colores pero conserva tamaños', async () => {
  const { sinColoresCss } = await import('../src/panel/sitios.js');
  const out = sinColoresCss('.btn{background-color:#D08C60 !important;color:#fff}.h1{font-size:40px;color:#111}');
  assert.doesNotMatch(out, /#D08C60|#fff\b|#111/);
  assert.match(out, /font-size:40px/);
});
