import test from 'node:test';
import assert from 'node:assert/strict';
import { dominioEnTexto, pidePublicar } from '../src/entrevista/propuestas_cambios.js';
import { clavePorArchivo } from '../src/panel/cambios_vivo.js';

test('dirección escrita por el cliente (26-nov-2026, Intiviso Lab)', () => {
  assert.equal(dominioEnTexto('nada por ahora quiero montarla en el dominio intiviso.com y luego hacerle modificaciones'), 'intiviso.com');
  assert.equal(dominioEnTexto('súbela a https://www.toolatte.cafe/'), 'toolatte.cafe');
  assert.equal(dominioEnTexto('cambia el correo a dragonjam@gmail.com'), null);
  assert.equal(dominioEnTexto('https://sitios-web-api.x6jqxs.easypanel.host/p/NkuxnOxTxrWK/H'), null);
});

test('pedir publicar no es pedir un cambio', () => {
  assert.ok(pidePublicar('quiero montarla en el dominio intiviso.com'));
  assert.ok(pidePublicar('quiero publicarla ya'));
  assert.ok(!pidePublicar('pon el título más grande'));
  assert.ok(!pidePublicar('sube estas fotos a la galería'));
});

test('foto nombrada por su archivo → su clave', () => {
  const fotos = [{ clave: 'a22', url: 'https://x/chat/archivos/rec-5wZ3SUmKAjkR.jpg' }, { clave: 'a3', url: 'https://x/chat/archivos/mgK-EWitNAGLvveg.jpg' }];
  assert.equal(clavePorArchivo('rec-5wZ3SUmKAjkR.jpg', fotos), 'a22');
  assert.equal(clavePorArchivo('https://x/chat/archivos/mgK-EWitNAGLvveg.jpg?w=800', fotos), 'a3');
  assert.equal(clavePorArchivo('a3', fotos), 'a3');
  assert.equal(clavePorArchivo('otra.jpg', fotos), 'otra.jpg');
});

test('al editor solo le llegan las secciones editables', async () => {
  const { soloSecciones } = await import('../src/panel/cambios_vivo.js');
  assert.deepEqual(Object.keys(soloSecciones({ portada: {}, es_inmobiliaria: false, diseno: {}, faq: [] })), ['portada', 'faq']);
});
