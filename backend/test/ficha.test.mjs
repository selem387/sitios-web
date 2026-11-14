// Opción P reconstruida solo a partir de la referencia (onyxcoffeelab.com): página propia, sin piezas de otras opciones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { auditarPaleta } from '../src/generador/tipo_color.js';
import { datosFicha, paginaFicha } from '../src/generador/ficha.js';

const foto = (n, x = {}) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}`, ...x });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2, { nombre: `Trabajo ${k + 2}` })), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(16).fill({ titular: 'Defendemos tu patrimonio', subtitulo: 'Despacho en Mérida', cta: 'Agenda tu consulta' }), info: ['Primera consulta sin costo', 'Atención por WhatsApp', 'Más de 10 años'], sobre: 'Somos un despacho familiar. Acompañamos cada paso del proceso con trato directo y costos claros desde el primer día, sin sorpresas ni letra chica, porque creemos que la tranquilidad de nuestros clientes vale más que cualquier caso. Llevamos más de diez años en Mérida.' };
const pares = [{ titulos: 'Fraunces', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const oferta = { proceso_pasos: ['Consulta', 'Estrategia', 'Trámite'], items: [
  { nombre: 'Divorcio', grupo: 'Familiar', precio_o_rango: 'Desde $8,000', descripcion_corta: 'Mutuo acuerdo o contencioso' }, { nombre: 'Pensión', grupo: 'Familiar' },
  { nombre: 'Contratos', grupo: 'Civil', precio_o_rango: '$3,500' }, { nombre: 'Testamentos', grupo: 'Civil', precio_o_rango: '$2,500' } ] };
const brief = { negocio: { nombre: 'Punto Legal', arquetipo: 'servicios', giro_texto: 'Despacho jurídico', ciudad: 'Mérida' }, contacto: { whatsapp: '9991234567', horarios: 'Lun-Vie 9:00-18:00' }, oferta,
  faq: [{ pregunta: '¿Cuánto cuesta?', respuesta: 'Depende del caso.' }, { pregunta: '¿Atienden en línea?', respuesta: 'Sí.' }] };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(5), textos, pares, urlFuentes: () => '', ...o });

test('la P sale como decimosexta, solo cuando se pide', () => {
  assert.equal(LETRAS[15], 'P');
  assert.deepEqual(gen({ solo: 'P' }).map((p) => [p.letra, p.layout]), [['P', 'ficha']]);
  assert.equal(gen().some((p) => p.layout === 'ficha'), false);
});

test('la P es una página propia: no usa la plantilla general ni los efectos de otras opciones', () => {
  const [p] = gen({ solo: 'P' });
  assert.match(p.html, /<body class="l-ficha">/);
  assert.doesNotMatch(p.html, /class="[^"]*\b(sl-|sl |ct-|hs-|gu-|fx-|g-car|tr-nav|sec\b)|data-fx=/);
  assert.doesNotMatch(p.html, /gsap|lenis|swiper|anime|<script src/i);
  assert.equal((p.html.match(/<h1/g) || []).length, 1);
});

test('la P sigue el recorrido de la referencia', () => {
  const [p] = gen({ solo: 'P' });
  for (const re of [/class="fp-esc"/, /class="fp-nombre"/, /class="fp-notas"/, /class="fp-centro"/, /<template id="fp-d0">/, /class="fp-hist"/, /class="fp-anillo"/,
    /class="fp-guia"/, /role="tablist"/, /class="fp-tira"/, /¿listo para pedir\?/, /class="fp-claros"/, /class="fp-sellos"/, /class="fp-pares"/, /id="contacto"/, /class="fp-pedido"/]) assert.match(p.html, re);
  assert.ok((p.html.match(/class="fp-dato"/g) || []).length >= 6);
  assert.match(p.html, /data-wa="529991234567"/);
});

test('la P usa solo datos reales: sin reseñas no hay sección ni estrellas', () => {
  const [p] = gen({ solo: 'P' });
  assert.doesNotMatch(p.html, /<section class="fp-resenas"|★/);
  const D = datosFicha({ brief, mat: matDe(2), t: { info: [] } });
  assert.ok(D.datos.every((x) => x.valor));
  assert.equal(D.claros.cols.length, 2);
});

test('la P: paleta oscura con contraste y fotos del cliente sin repetir fuera de lo permitido', () => {
  const [p] = gen({ solo: 'P' });
  assert.deepEqual(auditarPaleta(p.paleta), []);
  assert.match(p.html, /https:\/\/x\/1\.jpg/);
  assert.deepEqual(fotosRepetidas(p.html, matDe(5)), []);
});

test('cafetería: portada con el producto recortado y guía por categoría del menú', () => {
  const menu = { categorias: [{ nombre: 'Frappés', desde: 60, items: [{ nombre: 'Moka', precio: '$60' }, { nombre: 'Taro', precio: '$70' }] }, { nombre: 'Café', desde: 45, items: [{ nombre: 'Latte', precio: '$55' }] }],
    productos: [{ nombre: 'Moka', precio: '$60', img: 'https://x/moka.png', recortado: true }, { nombre: 'Latte', precio: '$55', img: 'https://x/latte.png', recortado: true }] };
  const html = paginaFicha({ letra: 'P', brief: { negocio: { nombre: 'Toolatte', giro_texto: 'Cafetería', ciudad: 'Mérida' }, contacto: {} }, mat: matDe(1), t: { titular: 'T', cta: 'Pide' }, menu });
  assert.match(html, /class="fp-pf recorte"><img class="fp-pimg rep-ok" src="https:\/\/x\/moka\.png"/);
  assert.match(html, /nuestro menú/);
  assert.equal((html.match(/role="tab"/g) || []).length, 2);
  assert.match(html, /class="fp-notas">Frappés/);
});

test('elegir la P por chat: letra, "la 16" y "decimosexta"', () => {
  assert.equal(interpretarEleccion('me quedo con la P').elegido, 'P');
  assert.equal(interpretarEleccion('la decimosexta').elegido, 'P');
  assert.equal(interpretarEleccion('la 16').elegido, 'P');
});
