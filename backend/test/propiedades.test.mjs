import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarPropiedad, conPropiedades, paginaPropiedad, precioTexto } from '../src/panel/propiedades.js';
import { ideaDePropiedad } from '../src/panel/publicador.js';

const HTML = '<html><head><title>X</title><meta name="description" content="d"></head><body class="l-portada"><header class="barra"><nav><a href="#servicios">Servicios</a></nav></header><main><section class="hero h-portada"><h1>Hola</h1></section><section class="sec" id="servicios">S</section></main><footer>F</footer><a class="wa" href="https://wa.me/52999?text=x" target="_blank">wa</a></body></html>';
const P = { id: 3, slug: 'casa-cholul-p-1', creado: '2026-11-06', imagenes: ['https://x/1.jpg', 'https://x/2.jpg'], datos: limpiarPropiedad({ titulo: 'Casa en Cholul', operacion: 'venta', tipo: 'casa', precio: '3,500,000', recamaras: '3', banos: '2.5', colonia: 'Cholul', ciudad: 'Mérida', amenidades: 'Alberca\nTerraza', descripcion: 'Bonita.\n\nCon jardín.' }) };

test('la ficha se valida y normaliza', () => {
  assert.equal(P.datos.precio, 3500000);
  assert.deepEqual(P.datos.amenidades, ['Alberca', 'Terraza']);
  assert.throws(() => limpiarPropiedad({}), /título/);
  assert.equal(limpiarPropiedad({ titulo: 'x', operacion: 'trueque' }).operacion, 'venta');
  assert.equal(precioTexto({ precio: 15000, moneda: 'MXN', operacion: 'renta' }), '$15,000 MXN al mes');
});

test('la sección de propiedades va después de la portada y en el menú', () => {
  const h = conPropiedades(HTML, [P], { base: '/s/demo' });
  assert.ok(h.indexOf('id="propiedades"') > h.indexOf('h-portada') && h.indexOf('id="propiedades"') < h.indexOf('id="servicios"'));
  assert.match(h, /<nav><a href="#propiedades">Propiedades<\/a>/);
  assert.match(h, /href="\/s\/demo\/propiedad\/casa-cholul-p-1"/);
  assert.equal(conPropiedades(HTML, []), HTML);
});

test('la ficha pública conserva el diseño y lleva WhatsApp con la propiedad', () => {
  const h = paginaPropiedad(HTML, P, { base: '', url: 'https://inmo.mx/propiedad/casa-cholul-p-1', negocio: 'Inmo', wa: '529991112233' });
  assert.match(h, /<header class="barra">/);
  assert.match(h, /<h1>Casa en Cholul<\/h1>/);
  assert.match(h, /RealEstateListing/);
  assert.match(h, /<a class="wa" href="https:\/\/wa\.me\/529991112233\?text=[^"]*Casa%20en%20Cholul/);
  assert.match(h, /<nav><a href="\/#servicios">/);
  assert.doesNotMatch(h, /id="servicios"/);
});

test('la idea para redes usa solo datos de la ficha', () => {
  const i = ideaDePropiedad(P, 'https://inmo.mx/propiedad/casa-cholul-p-1');
  assert.match(i, /\$3,500,000 MXN/);
  assert.match(i, /3 recámaras/);
  assert.match(i, /no inventes/);
});
