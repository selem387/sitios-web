import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mismoLogo } from '../src/generador/materiales.js';
import { completarMaterial, validarMaterial } from '../src/generador/validar_material.js';

// Caso La Fondita de Celestún (12-nov-2026): el logo bajado de su Facebook (a1) y el que subió en el chat (a2).
const A2 = '0110111100001000110111001000000001110011101100001110000101101000100100110011011010100111000110101010111100001010100011001100111010011100110011101011101010101010101011110100101011100111000101001111000111111100011100100101000010011110010001000010111100001000';
const A1 = '0010111100001000100111001000010001110010100100000110000101101000100100110011011010100111000110101010111100001010100011001100111010011101110011101011101010101010101011110100101011100111000101001110000011110100011100100101000010011110010001000010111100001000';
const OTRO = '0001000110001010001000010100111001000010101001100000110011011101000010001111101100011011011101111100100101101011100101001101011000100111010011110010101100111011110100000111100000100110001111011100010001110111100011001101010100000101101001110010000101100111';

test('el mismo logo recomprimido se reconoce como copia; otro logo no', () => {
  assert.equal(mismoLogo(`${A1}|aa|bb|v`, `${A2}|cc|dd|v`), true);
  assert.equal(mismoLogo(A1, OTRO), false);
  assert.equal(mismoLogo(null, A2), false);
});

const html = '<html><body><main><img src="https://x/logo-main.png"><img src="https://x/f1.jpg"></main><footer>© X</footer></body></html>';
const base = { logo: { url: 'https://x/logo-main.png' }, usables: [{ clave: 'a2', tipo: 'logo', urls: ['https://x/a2.jpg', 'https://x/rec-a2.jpg', 'https://x/logo-main.png'] }, { clave: 'a3', tipo: 'foto_producto', urls: ['https://x/f1.jpg'] }] };

test('copia del logo: cuenta como usada a través del logo elegido', () => {
  const mat = { ...base, usables: [...base.usables, { clave: 'a1', tipo: 'logo', urls: ['https://x/a1.jpg', 'https://x/rec-a1.jpg', 'https://x/logo-a1.png', 'https://x/logo-main.png'] }] };
  assert.deepEqual(validarMaterial(html, mat), []);
});

test('otra versión del logo que la plantilla no pintó: va como marca en el pie y no falta material', () => {
  const mat = { ...base, usables: [...base.usables, { clave: 'a1', tipo: 'logo', urls: ['https://x/a1.jpg', 'https://x/rec-a1.jpg', 'https://x/logo-a1.png'] }] };
  assert.deepEqual(validarMaterial(html, mat).map((f) => f.clave), ['a1']);
  const r = completarMaterial(html, mat);
  assert.deepEqual(r.faltan, []);
  assert.match(r.html, /<footer><div class="pie-marcas"[^>]*><img class="pie-marca" src="https:\/\/x\/logo-a1\.png"/);
  assert.doesNotMatch(r.html, /id="mas"/);
});
