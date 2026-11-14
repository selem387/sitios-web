import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { parCatalogo, portadaCatalogoHTML, bandaFotoHTML, tabsDeServicios } from '../src/generador/catalogo.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(15).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], sobre: 'Somos una inmobiliaria familiar. Acompañamos cada paso.', diapositivas: [{ titular: 'Atención directa' }, { titular: 'Asesoría legal incluida' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const oferta = { proceso_pasos: ['Visita', 'Oferta', 'Firma'], items: [
  { nombre: 'Casa 3 recámaras', grupo: 'Venta', precio: '$3.2 M' }, { nombre: 'Departamento', grupo: 'Venta', precio: '$1.9 M' },
  { nombre: 'Casa en renta', grupo: 'Renta', precio: '$18 mil' }, { nombre: 'Local comercial', grupo: 'Renta', precio: '$25 mil' } ] };
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', ...o });

test('la O sale como decimoquinta, solo cuando se pide; L queda libre', () => {
  assert.equal(LETRAS, 'ABCDEFGHIJKLMNOPQ');
  assert.deepEqual(gen({ solo: 'O' }).map((p) => [p.letra, p.layout]), [['O', 'catalogo']]);
  assert.deepEqual(gen({ solo: 'L' }), []);
  assert.equal(gen().some((p) => p.layout === 'catalogo'), false);
  assert.equal(parCatalogo(pares).titulos, 'Hanken Grotesk');
  assert.equal(parCatalogo([{ titulos: 'Gloock', cuerpo: 'Petrona' }]).titulos, 'Albert Sans');
});

test('la O arma carrusel de portada, estante, banda, pestañas y cierre sin librerías ni video', () => {
  const [o] = gen({ solo: 'O' });
  assert.match(o.html, /<body class="l-catalogo">/);
  assert.match(o.html, /class="ct-pista"/);
  assert.equal((o.html.match(/class="ct-slide"/g) || []).length, 5);
  assert.match(o.html, /class="ct-b ct-ant"/);
  assert.match(o.html, /class="ct-b ct-pausa"/);
  assert.match(o.html, /scroll-snap-type:x mandatory/);
  assert.match(o.html, /animation-timeline:view\(\)/);
  assert.match(o.html, /class="ct-banda"/);
  assert.match(o.html, /class="ct-cierre"/);
  assert.match(o.html, /role="tablist"/);
  assert.equal((o.html.match(/role="tab"/g) || []).length, 2);
  assert.equal((o.html.match(/role="tabpanel"/g) || []).length, 2);
  assert.equal((o.html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(o.html, /<video/);
  assert.doesNotMatch(o.html, /gsap|lenis|swiper|data-fx=|<script src/i);
});

test('la O usa las fotos del cliente y no repite fuera de las permitidas', () => {
  const [o] = gen({ solo: 'O' });
  assert.match(o.html, /https:\/\/x\/1\.jpg/);
  assert.deepEqual(fotosRepetidas(o.html, matDe(6)), []);
});

test('la O: sin pestañas con un solo grupo y sin banda si no hay frase ni fotos de sobra', () => {
  const b1 = { ...brief, oferta: { items: [{ nombre: 'Casa', grupo: 'Venta', precio: '$1 M' }, { nombre: 'Depto', grupo: 'Venta', precio: '$2 M' }] } };
  const [o] = gen({ solo: 'O', brief: b1, textos: { ...textos, sobre: '' } });
  assert.doesNotMatch(o.html, /role="tablist"/);
  assert.doesNotMatch(o.html, /class="ct-banda"/);
  const e = portadaCatalogoHTML({ img: () => '', titular: 'T', cta: '<a class="btn">x</a>' });
  assert.match(e.html, /<h1 class="ct-h">T<\/h1>/);
  assert.doesNotMatch(e.html, /ct-ctl/);
  assert.equal(bandaFotoHTML({ foto: null, img: () => '', frase: 'x' }), '');
  assert.equal(tabsDeServicios('<div class="paq-grupo"><h3 class="grupo-t">Solo</h3></div>'), '<div class="paq-grupo"><h3 class="grupo-t">Solo</h3></div>');
});

test('con ordinales y letras, elegir la O por chat sin confundir la conjunción "o"', () => {
  assert.equal(interpretarEleccion('me quedo con la O').elegido, 'O');
  assert.equal(interpretarEleccion('la decimoquinta').elegido, 'O');
  assert.equal(interpretarEleccion('la 15').elegido, 'O');
  assert.equal(interpretarEleccion('la M').elegido, 'M');
  assert.equal(interpretarEleccion('B o C')?.elegido ?? null, interpretarEleccion('B o C')?.elegido ?? null);
  assert.notEqual(interpretarEleccion('A o B')?.elegido, 'O');
});
