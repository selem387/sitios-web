import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarEstructura, validarEstructura, limpiarHtml } from '../src/panel/estructura.js';

const H = '<html><head></head><body><header class="barra"><nav><a href="#servicios">Servicios</a><a href="#faq">Preguntas</a></nav></header><main><section class="hero h-portada"><h1>Hola</h1></section><section class="sec" id="servicios">S</section><section class="sec" id="faq">F</section><section class="sec contacto" id="contacto">C</section></main><footer>pie</footer></body></html>';

test('ocultar, reordenar, agregar y cambiar menú', () => {
  const { estructura, errores } = validarEstructura({ ocultas: ['faq'], orden: ['contacto', 'servicios'], extras: [{ id: 'mapa', despues_de: 'contacto', html: '<h2>Cómo llegar</h2><iframe src="https://www.google.com/maps/embed?pb=1"></iframe>' }], menu: [{ texto: 'Contacto', href: '#contacto' }] }, { html: H });
  assert.deepEqual(errores, []);
  const o = aplicarEstructura(H, estructura);
  assert.doesNotMatch(o, /id="faq"/);
  assert.doesNotMatch(o, /href="#faq"/);
  assert.ok(o.indexOf('hero') < o.indexOf('id="contacto"') && o.indexOf('id="contacto"') < o.indexOf('id="extra-mapa"') && o.indexOf('id="extra-mapa"') < o.indexOf('id="servicios"'));
  assert.match(o, /<nav><a href="#contacto">Contacto<\/a><\/nav>/);
  assert.match(o, /google\.com\/maps\/embed/);
});

test('no se reescriben secciones del panel ni se cuelan scripts', () => {
  assert.ok(validarEstructura({ reemplazos: { servicios: '<p>x</p>' } }, { html: H }).errores.length);
  const t = limpiarHtml('<p onclick="x()">Hola</p><script>alert(1)</script><a href="javascript:alert(1)">a</a><iframe src="https://malo.com"></iframe>');
  assert.doesNotMatch(t, /onclick|<script|javascript:|malo\.com/);
});

test('imágenes solo del cliente o de la página', () => {
  const r = validarEstructura({ extras: [{ id: 'x', html: '<img src="https://otro.com/a.jpg">' }] }, { html: H, imagenes: ['https://cliente/1.jpg'] });
  assert.ok(r.errores.some((e) => /imagen/.test(e)));
});

test('rehacer el pie', () => {
  const o = aplicarEstructura(H, { reemplazos: { pie: '<p>© Blanca</p>' } });
  assert.match(o, /<footer><p>© Blanca<\/p><\/footer>/);
});

test('secciones que no existen se reportan', () => {
  const r = validarEstructura({ orden: ['faq2', 'servicios'], ocultas: ['nada'] }, { html: H });
  assert.ok(r.errores.some((e) => /faq2/.test(e)) && r.errores.some((e) => /nada/.test(e)));
});
