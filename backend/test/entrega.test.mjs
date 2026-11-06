import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ligaDeRed, textoEntrega, textoInicioRedes, redesPorCrear } from '../src/entrevista/entrega.js';

test('ligaDeRed reconoce perfiles de las 5 redes', () => {
  assert.deepEqual(ligaDeRed('ya quedó facebook.com/EstudioLuzMerida'), { red: 'facebook', usuario: 'EstudioLuzMerida' });
  assert.deepEqual(ligaDeRed('https://www.facebook.com/profile.php?id=6158399'), { red: 'facebook', usuario: '6158399' });
  assert.deepEqual(ligaDeRed('https://www.tiktok.com/@luz.mx?lang=es'), { red: 'tiktok', usuario: 'luz.mx' });
  assert.deepEqual(ligaDeRed('youtube.com/@lemossco'), { red: 'youtube', usuario: 'lemossco' });
  assert.deepEqual(ligaDeRed('https://www.linkedin.com/company/estudio-luz/'), { red: 'linkedin', usuario: 'estudio-luz' });
  assert.equal(ligaDeRed('todavía no la hago'), null);
});

test('textoEntrega menciona liga, correo y Google solo con Gmail', () => {
  const g = textoEntrega({ dominio: 'luz.mx', urlAdmin: 'https://luz.mx/admin', email: 'ana@gmail.com' }).join('\n');
  assert.ok(g.includes('https://luz.mx/admin') && g.includes('ana@gmail.com') && g.includes('Google'));
  const o = textoEntrega({ dominio: 'luz.mx', urlAdmin: 'https://luz.mx/acceso/', email: 'ana@luz.mx' }).join('\n');
  assert.ok(!o.includes('Google'));
  assert.ok(!/iaprop/i.test(g + o));
});

test('redes por crear respeta las que eligió y las que ya tiene', () => {
  assert.deepEqual(redesPorCrear({ redes_crear: { redes: ['tiktok', 'linkedin'] }, contacto: { redes: { tiktok: 'x' } } }), ['linkedin']);
  assert.deepEqual(redesPorCrear({ contacto: { redes: { instagram: 'a', facebook: 'b' } } }), ['tiktok', 'youtube', 'linkedin']);
  assert.ok(textoInicioRedes(['tiktok']).includes('alguien de nuestro equipo') && !/iaprop/i.test(textoInicioRedes(['tiktok'])));
});

test('textoEntrega con enlace mágico no pide correo', () => {
  const t = textoEntrega({ dominio: 'luz.mx', urlAdmin: 'https://luz.mx/admin/llave/abcdefghijklmnopqrstuvwxyz', email: null, llave: true }).join('\n');
  assert.match(t, /admin\/llave\//);
  assert.doesNotMatch(t, /código de 6/);
});
