import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, urlsPorUbicacion } from '../src/generador/propuestas_general.js';
import { emparejarFotos } from '../src/generador/movimiento.js';
import { seccionesFotos, preguntaUbicacion } from '../src/entrevista/propuestas_cambios.js';

const foto = (n, tipo = 'foto_trabajo') => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo, clave: `a${n}` });
const mat = () => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: [1, 2, 3, 4, 5, 6, 7].map((n) => foto(n)), equipo: [foto(8, 'foto_equipo')], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], colores: [] });
const textos = { variantes: Array(6).fill({ titular: 'Hola', subtitulo: 'Sub', cta: 'Escríbeme' }), info: [], diapositivas: [] };
const par = { titulos: 'Fraunces', cuerpo: 'Inter', estilo: 'calido' };
const html = (brief, m = mat()) => paginasGenerales({ brief, mat: m, textos, pares: [par], urlFuentes: () => '' })[0].html;
const seccion = (h, id) => (h.match(new RegExp(`<section class="sec" id="${id}">[\\s\\S]*?</section>`)) || [''])[0];
const portada = (h) => h.slice(0, h.indexOf('<section class="sec"'));

test('fotos en galería no van al slider ni a "Nuestro trabajo" y la galería sale aunque sea una', () => {
  const b = { negocio: { nombre: 'X', arquetipo: 'generico' }, contacto: {}, fotos: { ubicacion: { a7: 'galeria' } } };
  const h = html(b);
  assert.doesNotMatch(portada(h), /x\/7\.jpg/);
  assert.doesNotMatch(seccion(h, 'trabajo'), /x\/7\.jpg/);
  assert.match(seccion(h, 'galeria'), /x\/7\.jpg/);
});

test('fotos pedidas en la portada entran al slider aunque esté lleno', () => {
  const b = { negocio: { nombre: 'X', arquetipo: 'generico' }, contacto: {}, fotos: { ubicacion: { a8: 'portada', a7: 'portada' } } };
  const h = html(b);
  assert.match(portada(h), /x\/8\.jpg/);
  assert.match(portada(h), /x\/7\.jpg/);
});

test('foto de equipo pedida en "Nuestro trabajo" entra al carrusel', () => {
  const b = { negocio: { nombre: 'X', arquetipo: 'generico' }, contacto: {}, fotos: { ubicacion: { a8: 'trabajo' } } };
  assert.match(seccion(html(b), 'trabajo'), /x\/8\.jpg/);
});

test('emparejarFotos respeta fijas sin desplazar la primera', () => {
  const pool = [2, 3, 4, 5, 6, 7].map((n) => foto(n));
  const r = emparejarFotos({ hero: foto(1), pool, fijas: [foto(7).url] });
  assert.equal(r.fotos[0].url, foto(1).url);
  assert.ok(r.fotos.some((x) => x.url === foto(7).url));
  assert.equal(r.diapos.length, r.fotos.length - 1);
});

test('nombres de secciones y pregunta', () => {
  const b = { negocio: { arquetipo: 'generico' } };
  assert.deepEqual(seccionesFotos(b, { secciones: { trabajo: 'Mis sesiones' } }), { portada: 'Portada', trabajo: 'Mis sesiones', galeria: 'Galería' });
  assert.match(preguntaUbicacion(b, {}, 3), /Nuestro trabajo/);
  assert.deepEqual(Object.keys(seccionesFotos({ negocio: { arquetipo: 'restaurante' } })), ['portada', 'galeria']);
  assert.equal(urlsPorUbicacion(mat(), { fotos: { ubicacion: { a2: 'galeria' } } }).galeria.size, 1);
});
