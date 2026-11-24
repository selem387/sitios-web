import test from 'node:test';
import assert from 'node:assert/strict';
import { conFotosEnMovimiento } from '../src/generador/kit/fotos_movimiento.js';

test('inyecta estilos y script de fotos en movimiento una sola vez', () => {
  const html = '<html><head><title>x</title></head><body><img src="a.jpg"></body></html>';
  const una = conFotosEnMovimiento(html);
  assert.match(una, /<style id="fotos-mov">/);
  assert.match(una, /@keyframes fm-zin/);
  assert.match(una, /IntersectionObserver/);
  const dos = conFotosEnMovimiento(una);
  assert.equal(dos.match(/id="fotos-mov"/g).length, 1);
});

test('respeta reducir movimiento y no rompe html sin head', () => {
  const out = conFotosEnMovimiento('<body><img src="a.jpg"></body>');
  assert.match(out, /prefers-reduced-motion/);
  assert.match(out, /<img src="a.jpg">/);
});
