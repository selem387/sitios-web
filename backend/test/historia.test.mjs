import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fraseDe, aptaHistoria, servirVendor, VENDOR, CSS_REVISION_HISTORIA, botonSv, dosRenglones } from '../src/generador/historia.js';
import { paginasGenerales, historiaApta } from '../src/generador/propuestas_general.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { interpretarEleccion } from '../src/generador/opciones.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1600, alto: 1067, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] });
const textos = { variantes: Array(9).fill({ titular: 'Mantequilla hecha sin prisa', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Envíos', 'Mérida'], sobre: 'Empezamos en la cocina de mi abuela. Hoy seguimos igual.', diapositivas: [{ tipo: 'diferenciador', titular: 'Sin conservadores', apoyo: 'Solo leche y tiempo' }, { tipo: 'vision', titular: 'Hecho en Yucatán', apoyo: '' }] };
const pares = [{ titulos: 'Albert Sans', cuerpo: 'Petrona', estilo: 'minimalista' }, { titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const brief = { negocio: { nombre: 'Lechería Ceiba', arquetipo: 'tienda', giro_texto: 'Lácteos artesanales', ciudad: 'Mérida' }, contacto: {} };

test('la I sale como novena opción solo si se pide (o con OPCION_I y giro apto)', () => {
  const todas = paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', solo: 'ABCDEFGHI' });
  assert.equal(todas.map((p) => p.letra).join(''), 'ABCDEFGHI');
  assert.equal(todas[8].layout, 'historia');
  assert.equal(paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '' }).some((p) => p.layout === 'historia'), false);
  process.env.OPCION_I = '1';
  try {
    assert.equal(paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '' }).at(-1).letra, 'I');
    // giro de urgencia u oficio: no sale aunque esté activa
    const plomero = { ...brief, negocio: { ...brief.negocio, arquetipo: 'oficios' } };
    assert.equal(paginasGenerales({ brief: plomero, mat: matDe(6), textos, pares, urlFuentes: () => '' }).some((p) => p.layout === 'historia'), false);
    // pocas fotos: tampoco
    assert.equal(paginasGenerales({ brief, mat: matDe(2), textos, pares, urlFuentes: () => '' }).some((p) => p.layout === 'historia'), false);
  } finally { delete process.env.OPCION_I; }
});

test('aptitud por giro y número de fotos', () => {
  assert.equal(aptaHistoria(brief, 4), true);
  assert.equal(aptaHistoria(brief, 3), false);
  assert.equal(aptaHistoria({ negocio: { arquetipo: 'servicios' } }, 10), false);
  assert.equal(aptaHistoria({ negocio: { arquetipo: 'servicios', subtipo: 'fotografia' } }, 10), true);
  assert.equal(aptaHistoria({ negocio: { arquetipo: 'servicios', subtipo: 'legal' } }, 10), false);
  assert.equal(aptaHistoria({ negocio: { arquetipo: 'oficios', subtipo: 'plomero_electricista' } }, 10), false);
  assert.equal(historiaApta(brief, matDe(3)), true); // portada + 3 de trabajo
  assert.equal(historiaApta(brief, { ...matDe(3), trabajos: matDe(3).trabajos.map((x) => ({ ...x, captura: true })) }), false);
});

test('la I es una página propia hecha a partir de savor.it (sin la plantilla general)', () => {
  const [h] = paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', solo: 'I' });
  assert.equal(h.fuentes.titulos, 'Gloock');
  assert.match(h.html, /<body class="l-historia"><header class="sv-nav"/);
  assert.doesNotMatch(h.html, /class="barra"|class="sec"|class="wa"|sl-img|hs-/);
  for (const sec of ['sv-hero', 'sv-relato', 'sv-sobre', 'sv-cadena', 'sv-pie']) assert.match(h.html, new RegExp(`class="${sec}`));
  assert.match(h.html, /<section id="contacto" class="sv-pie-arriba">[\s\S]*<div class="datos">/);
  assert.match(h.html, /class="sv-et sv-e1"[^>]*>Sin conservadores<\/p><svg class="sv-linea"[\s\S]*?class="sv-et sv-e2"[^>]*>Solo leche y tiempo<\/p>/);
  assert.match(h.html, /<a class="sv-btn sv-btn--claro"[^>]*><span aria-hidden="true">Escríbeme<\/span><i class="sv-raya"/);
  assert.match(h.html, new RegExp(`<script defer src="[^"]*/vendor/${VENDOR.motion}"></script><script defer src="[^"]*/vendor/${VENDOR.lenis}"></script>`));
  assert.doesNotMatch(h.html, /gsap/i);
  const cadena = h.html.match(/<section class="sv-cadena"[\s\S]*?<\/section>/)[0];
  for (let n = 2; n <= 7; n++) assert.match(cadena, new RegExp(`x/${n}\\.jpg`));
  assert.deepEqual(fotosRepetidas(h.html, matDe(6)), []);
});

test('sin textos de relato la página sigue completa', () => {
  const [h] = paginasGenerales({ brief, mat: matDe(6), textos: { ...textos, diapositivas: [] }, pares, urlFuentes: () => '', solo: 'I' });
  assert.match(h.html, /class="sv-pie"/);
  assert.match(h.html, /class="sv-cadena"/);
});

test('frase grande: primera oración, recortada si es muy larga', () => {
  assert.equal(fraseDe('Hola mundo. Otra cosa.'), 'Hola mundo.');
  assert.equal(fraseDe(''), '');
  assert.equal(fraseDe('¡Hola! Soy Blanca, fotógrafa en Mérida y retrato familias. Más texto.'), 'Soy Blanca, fotógrafa en Mérida y retrato familias.');
  assert.match(fraseDe(Array(40).fill('palabra').join(' ')), /…$/);
});

test('/vendor/ solo sirve Motion y Lenis', async () => {
  const c = (nombre) => ({ req: { param: () => nombre }, text: (t, s) => ({ s }), body: (b, s, h) => ({ s, b, h }) });
  assert.equal((await servirVendor(c('../../config.js'))).s, 404);
  const r = await servirVendor(c(VENDOR.motion));
  assert.equal(r.s, 200);
  assert.match(r.h['cache-control'], /immutable/);
  assert.match(String(r.b).slice(0, 200), /MIT License/);
  assert.ok(CSS_REVISION_HISTORIA.length > 0);
  assert.deepEqual(dosRenglones('Inspired by Earths blueprints'), ['Inspired by', 'Earths blueprints']);
  assert.match(botonSv('Reserva tu sesión', ' href="#"'), /<span aria-hidden="true">Reserva<\/span><i class="sv-raya" aria-hidden="true"><\/i><span aria-hidden="true">tu sesión<\/span>/);
});

test('el cliente puede elegir la I', () => {
  assert.equal(interpretarEleccion('la I').elegido, 'I');
  assert.equal(interpretarEleccion('me gusta la i').elegido, 'I');
  assert.equal(interpretarEleccion('la novena').elegido, 'I');
  assert.equal(interpretarEleccion('la 9').elegido, 'I');
});
