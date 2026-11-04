import { test } from 'node:test';
import assert from 'node:assert/strict';
import { usuarioDeRed, normalizarRedes, redesFaltantes, listaNombres } from '../src/entrevista/redes.js';
import { emailVerificado, verificacionPendiente, faltaCorreo, correoCambio } from '../src/entrevista/verificacion.js';

test('usuarioDeRed limpia ligas y @', () => {
  assert.equal(usuarioDeRed('https://www.instagram.com/toolattemid/?hl=es'), 'toolattemid');
  assert.equal(usuarioDeRed('@toolattemid'), 'toolattemid');
  assert.equal(usuarioDeRed('https://www.linkedin.com/company/iaprop'), 'iaprop');
  assert.equal(usuarioDeRed('https://youtube.com/@lemossco'), 'lemossco');
  assert.equal(usuarioDeRed('Toolatte Café'), 'Toolatte Café');
  assert.equal(usuarioDeRed('  '), null);
});

test('normalizarRedes descarta redes fuera de las 5 y vacías', () => {
  assert.deepEqual(normalizarRedes({ instagram: '@a', facebook: '', twitter: 'x', tiktok: 'https://tiktok.com/@b' }), { instagram: 'a', tiktok: 'b' });
});

test('redesFaltantes y listaNombres', () => {
  const brief = { contacto: { redes: { instagram: 'a', facebook: 'b' } } };
  assert.deepEqual(redesFaltantes(brief), ['tiktok', 'youtube', 'linkedin']);
  assert.equal(listaNombres(['tiktok', 'youtube', 'linkedin']), 'TikTok, YouTube y LinkedIn');
  assert.deepEqual(redesFaltantes({}), ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin']);
});

test('estado de verificación del correo', () => {
  const pendiente = { contacto: { email: 'a@b.com', email_verificacion: { estado: 'enviado', email: 'a@b.com' } } };
  assert.equal(verificacionPendiente(pendiente), true);
  assert.equal(emailVerificado(pendiente), false);
  const ok = { contacto: { email: 'A@b.com', email_verificado: true, email_verificacion: { estado: 'verificado', email: 'a@b.com' } } };
  assert.equal(emailVerificado(ok), true);
  assert.equal(faltaCorreo(ok), null);
  assert.equal(faltaCorreo({ contacto: { email: 'no-es-correo' } }), 'sin_email');
  // Si cambia el correo después de verificar, deja de contar como verificado.
  assert.equal(emailVerificado({ contacto: { ...ok.contacto, email: 'otro@b.com' } }), false);
});

test('correoCambio detecta correo nuevo o corregido', () => {
  assert.equal(correoCambio({ contacto: {} }, { contacto: { email: 'a@b.com' } }), true);
  assert.equal(correoCambio({ contacto: { email: 'a@b.com' } }, { contacto: { email: 'a@b.com' } }), false);
  assert.equal(correoCambio({ contacto: {} }, { contacto: { email: 'sin arroba' } }), false);
  assert.equal(correoCambio({ contacto: {} }, { contacto: { email: 'a@b.com', email_verificacion: { email: 'a@b.com' } } }), false);
});
