import test from 'node:test';
import assert from 'node:assert/strict';
import { conPieCompleto, consultaMapa, navDe } from '../src/panel/pie.js';
import { terminos, politicaCookies, mapaDelSitio, paginaLegal } from '../src/panel/legales.js';
import { conMedicion } from '../src/panel/medicion.js';

const brief = {
  negocio: { nombre: 'Intiviso Lab', ciudad: 'Ciudad de México', estado: 'CDMX' },
  zona: { cobertura: ['CDMX', 'Zona Metropolitana', 'todo México'] },
  contacto: { whatsapp: '525544422461', email: 'contacto@intiviso.com', redes: { facebook: 'https://www.facebook.com/intiviso', x: 'https://x.com/intivisolab' } },
};
const sitio = '<html><head><title>X</title></head><body><header><img class="logo" src="https://x/logo.png"><nav id="menu-sitio"><a href="#servicios">Lo que hacemos</a><a href="#sobre">Quiénes somos</a></nav></header><main><p>hola</p></main><footer class="viejo">© viejo</footer></body></html>';

test('el pie estándar reemplaza al de la opción y trae contacto, mapa, redes y legales', () => {
  const h = conPieCompleto(sitio, brief, { base: '' });
  assert.ok(!h.includes('© viejo'));
  assert.equal((h.match(/<footer/g) || []).length, 1);
  for (const t of ['contacto@intiviso.com', 'wa.me/525544422461', '55 4442 2461', 'maps?q=Ciudad%20de%20M', '/aviso-de-privacidad', '/terminos-y-condiciones', '/politica-de-cookies', '/mapa-del-sitio', '#arco', 'href="/#servicios"', 'x.com/intivisolab', 'Atendemos en CDMX']) assert.ok(h.includes(t), t);
  assert.ok(!h.includes('Configurar cookies'), 'sin medición no hay botón de cookies');
});

test('con medición aparece "Configurar cookies" y el código espera el permiso', () => {
  const h = conPieCompleto(sitio, brief, { base: '', medicion: { ga4: 'G-ABC1234' } });
  assert.ok(h.includes('Configurar cookies'));
  const m = conMedicion(h, { ga4: 'G-ABC1234' });
  assert.ok(m.includes('cookies_ok') && m.includes('aviso-cookies'));
});

test('mapa: dirección exacta o la ciudad de la zona', () => {
  assert.equal(consultaMapa(brief).exacta, false);
  assert.ok(consultaMapa({ ...brief, contacto: { direccion: 'Calle 60 #500, Centro, Mérida' } }).exacta);
  assert.equal(consultaMapa({}), null);
});

test('páginas legales con los datos del negocio', () => {
  assert.ok(terminos(brief).includes('Intiviso Lab') && terminos(brief).includes('Profeco'));
  assert.ok(politicaCookies(brief).includes('no usa cookies para rastrearte'));
  assert.ok(politicaCookies(brief, { medicion: { pixel: '1234567890' } }).includes('Pixel de Meta'));
  const mapa = mapaDelSitio(brief, { html: sitio, base: '/s/x' });
  assert.ok(mapa.includes('/s/x/#servicios') && mapa.includes('/s/x/terminos-y-condiciones'));
  const pg = paginaLegal(sitio, brief, { titulo: 'Términos y condiciones', descripcion: 'd', cuerpo: '<p>T</p>', base: '' });
  assert.ok(pg.includes('<main><p>T</p></main>') && pg.includes('<title>Términos y condiciones · Intiviso Lab</title>'));
  assert.deepEqual(navDe(sitio), [['servicios', 'Lo que hacemos'], ['sobre', 'Quiénes somos']]);
});
