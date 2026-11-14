import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inicialesDe, escenaIndiceHTML, navIndiceHTML } from '../src/generador/indice.js';
import { paginasGenerales } from '../src/generador/propuestas_general.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { interpretarEleccion } from '../src/generador/opciones.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] });
const textos = { variantes: Array(8).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], diapositivas: [{ tipo: 'diferenciador', titular: 'Sin letras chiquitas', apoyo: 'De principio a fin' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }, { titulos: 'Albert Sans', cuerpo: 'Petrona', estilo: 'minimalista' }];
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {} };

test('iniciales para el monograma', () => {
  assert.equal(inicialesDe('Norte 21'), 'N21');
  assert.equal(inicialesDe('Casa Ceiba Bienes Raíces'), 'CC');
  assert.equal(inicialesDe('La Fondita de Celestún'), 'FC');
  assert.equal(inicialesDe(''), '');
});

test('la H sale como octava opción, con su letra aunque la G no esté activa', () => {
  const todas = paginasGenerales({ brief, mat: matDe(5), textos, pares, urlFuentes: () => '', solo: 'ABCDEFGH' });
  assert.equal(todas.map((p) => p.letra).join(''), 'ABCDEFGH');
  assert.equal(todas[7].layout, 'indice');
  const sola = paginasGenerales({ brief, mat: matDe(5), textos, pares, urlFuentes: () => '', solo: 'H' });
  assert.deepEqual(sola.map((p) => [p.letra, p.layout]), [['H', 'indice']]);
  // sin pedirla (y sin OPCION_H) no aparece
  assert.equal(paginasGenerales({ brief, mat: matDe(5), textos, pares, urlFuentes: () => '' }).some((p) => p.layout === 'indice'), false);
});

test('la H usa un par con título sin remates y arma portada, índice y monograma', () => {
  const [h] = paginasGenerales({ brief, mat: matDe(5), textos, pares, urlFuentes: () => '', solo: 'H' });
  assert.equal(h.fuentes.titulos, 'Albert Sans');
  assert.match(h.html, /<body class="l-indice">/);
  assert.match(h.html, /class="ix-escena" id="inicio"/);
  assert.match(h.html, /class="ix-fondo rep-ok" src="https:\/\/x\/1\.jpg"/);
  assert.equal((h.html.match(/<div class="ix-tunel">[\s\S]*?<\/div>/)[0].match(/<img/g) || []).length, 3);
  assert.match(h.html, /class="ix-lm ix-lm-t">Sin letras chiquitas</);
  // la tarjeta va dentro de su marco y la encabeza el nombre del negocio
  assert.match(h.html, /<div class="ix-tj-marco" aria-hidden="true"><div class="ix-tarjeta"><p class="ix-tj-k">Norte 21<\/p>/);
  assert.match(h.html, /<nav class="ix-nav"[^>]*><ol><li><a href="#inicio">Inicio<\/a><\/li><li><a href="#trabajo">/);
  assert.match(h.html, /class="ix-flot" aria-hidden="true" hidden><div class="ix-cubo"><span>N21<\/span>/);
  // "Nuestro trabajo" lleva todas las fotos de trabajo aunque estén en la portada, y nada se repite fuera de eso
  const trabajo = h.html.match(/<section class="sec" id="trabajo">[\s\S]*?<\/section>/)[0];
  for (let n = 2; n <= 6; n++) assert.match(trabajo, new RegExp(`x/${n}\\.jpg`));
  assert.deepEqual(fotosRepetidas(h.html, matDe(5)), []);
});

test('con pocas fotos la portada sigue completa', () => {
  const [h] = paginasGenerales({ brief, mat: { ...matDe(1), hero: null }, textos: { ...textos, info: [], diapositivas: [] }, pares, urlFuentes: () => '', solo: 'H' });
  assert.match(h.html, /class="ix-fondo rep-ok" src="https:\/\/x\/2\.jpg"/);
  assert.doesNotMatch(h.html, /class="ix-tarjeta"|class="ix-ficha"/);
  assert.match(h.html, /class="ix-lm ix-lm-t">Norte 21</);
  const e = escenaIndiceHTML({ img: () => '', titular: 'T', lema: 'L' });
  assert.match(e.html, /sin-fondo/);
  assert.deepEqual(e.urls, []);
  assert.match(navIndiceHTML([['faq', 'Preguntas'], ['x', '']]), /#inicio[\s\S]*#faq/);
});

test('el cliente puede elegir la H', () => {
  assert.equal(interpretarEleccion('la H').elegido, 'H');
  assert.equal(interpretarEleccion('me gusta la h').elegido, 'H');
  assert.equal(interpretarEleccion('la octava').elegido, 'H');
  assert.equal(interpretarEleccion('la 8').elegido, 'H');
  assert.equal(interpretarEleccion('la B').elegido, 'B');
});
