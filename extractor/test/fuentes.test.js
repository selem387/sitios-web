import test from 'node:test';
import assert from 'node:assert/strict';
import { urlFacebook, urlInstagram, deFacebook, fotosDePosts, deInstagram } from '../src/fuentes.js';

test('ligas', () => {
  assert.equal(urlInstagram('@toolattemid'), 'https://www.instagram.com/toolattemid/');
  assert.equal(urlInstagram('https://www.instagram.com/toolattemid?igsh=abc'), 'https://www.instagram.com/toolattemid/');
  assert.equal(urlInstagram('instagram.com/p/xyz'), null);
  assert.equal(urlFacebook('m.facebook.com/ToolatteMerida/?ref=x'), 'https://www.facebook.com/ToolatteMerida');
  assert.equal(urlFacebook('https://www.facebook.com/profile.php?id=1000&sk=about'), 'https://www.facebook.com/profile.php?id=1000');
  assert.equal(urlFacebook('https://facebook.com/'), null);
});
test('facebook y posts', () => {
  const f = deFacebook({ title: 'Toolatte', categories: ['Page', 'Cafetería'], phone: '+52 999 1', email: 'a@b.mx', websites: ['https://instagram.com/toolattemid', 'https://wa.me/5219991234567'], profilePictureUrl: 'https://scontent.x/a.jpg', ratingOverall: 95, ratingCount: 40 });
  assert.equal(f.redes.instagram, 'https://www.instagram.com/toolattemid/');
  assert.equal(f.whatsapp, '5219991234567');
  assert.deepEqual(f.categorias, ['Cafetería']);
  const fotos = fotosDePosts([{ text: 'hola', media: [{ thumbnail: 'https://scontent.x/1.jpg?a=1' }, { photo_image: { uri: 'https://scontent.x/1.jpg?a=2' } }] }, { displayUrl: 'https://cdninstagram.com/2.jpg', videoUrl: 'https://x/v.mp4' }], 'fb');
  assert.equal(fotos.length, 2);
  const ig = deInstagram({ username: 'x', biography: 'pedidos wa.me/5219990000000 hola@x.mx', latestPosts: [] });
  assert.equal(ig.email, 'hola@x.mx');
  assert.equal(ig.whatsapp, '5219990000000');
});
