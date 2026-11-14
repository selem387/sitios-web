import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portadaNarrativaHTML, parNarrativa } from '../src/generador/narrativa.js';
import { paginasGenerales } from '../src/generador/propuestas_general.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { interpretarEleccion } from '../src/generador/opciones.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(10).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], diapositivas: [] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }, { titulos: 'Albert Sans', cuerpo: 'Petrona', estilo: 'minimalista' }];
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta: { proceso_pasos: ['Visita', 'Oferta', 'Firma'] } };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(5), textos, pares, urlFuentes: () => '', ...o });

test('la J sale como décima opción, con su letra aunque G, H e I no estén activas', () => {
  assert.equal(gen({ solo: 'ABCDEFGHIJ' }).map((p) => p.letra).join(''), 'ABCDEFGHIJ');
  assert.deepEqual(gen({ solo: 'J' }).map((p) => [p.letra, p.layout]), [['J', 'narrativa']]);
  assert.deepEqual(gen({ solo: 'I' }).map((p) => [p.letra, p.layout]), [['I', 'historia']]);
  assert.equal(gen().some((p) => p.layout === 'narrativa'), false);
});

test('una sola grotesca para títulos y texto', () => {
  assert.deepEqual(parNarrativa(pares), { titulos: 'Hanken Grotesk', cuerpo: 'Hanken Grotesk', estilo: 'elegante' });
  assert.equal(parNarrativa([{ titulos: 'Gloock', cuerpo: 'Petrona' }]).titulos, 'Schibsted Grotesk');
  const [j] = gen({ solo: 'J' });
  assert.equal(j.fuentes.titulos, j.fuentes.cuerpo);
});

test('la J arma portada tipográfica, capítulos y movimiento sin repetir fotos', () => {
  const [j] = gen({ solo: 'J' });
  assert.match(j.html, /<body class="l-narrativa">/);
  assert.match(j.html, /<section class="hero h-narr" id="inicio">[\s\S]*?<h1 class="na-tit">Casas que se sienten tuyas<\/h1>/);
  assert.match(j.html, /<figure class="na-foto"><img class="na-img rep-ok" src="https:\/\/x\/1\.jpg"/);
  assert.match(j.html, /<ol class="wrap na-datos"><li>Compra<\/li><li>Vende<\/li><li>Renta<\/li><\/ol>/);
  assert.match(j.html, /counter\(cap,decimal-leading-zero\)/);
  assert.match(j.html, /na-js/);
  assert.doesNotMatch(j.html, /<video/);
  const trabajo = j.html.match(/<section class="sec" id="trabajo">[\s\S]*?<\/section>/)[0];
  for (let n = 2; n <= 6; n++) assert.match(trabajo, new RegExp(`x/${n}\\.jpg`));
  assert.deepEqual(fotosRepetidas(j.html, matDe(5)), []);
});

test('si el cliente subió video, va en la portada y no se repite abajo', () => {
  const [j] = gen({ solo: 'J', mat: matDe(5, { videos: [{ url: 'https://x/v.mp4' }] }) });
  assert.match(j.html, /<video class="na-vid" src="https:\/\/x\/v\.mp4" poster="https:\/\/x\/1\.jpg" autoplay muted loop playsinline/);
  assert.equal((j.html.match(/https:\/\/x\/v\.mp4/g) || []).length, 1);
  const [a] = gen({ solo: 'A', mat: matDe(5, { videos: [{ url: 'https://x/v.mp4' }] }) });
  assert.match(a.html, /<video class="video" src="https:\/\/x\/v\.mp4" controls/);
});

test('portada sin foto ni datos sigue completa', () => {
  const p = portadaNarrativaHTML({ img: () => '', titular: 'T', cta: '<a class="btn">x</a>' });
  assert.match(p.html, /<h1 class="na-tit">T<\/h1>/);
  assert.doesNotMatch(p.html, /na-foto|na-datos/);
  assert.deepEqual(p.urls, []);
});

test('el cliente puede elegir la J', () => {
  assert.equal(interpretarEleccion('la J').elegido, 'J');
  assert.equal(interpretarEleccion('me gusta la j').elegido, 'J');
  assert.equal(interpretarEleccion('la décima').elegido, 'J');
  assert.equal(interpretarEleccion('la 10').elegido, 'J');
  assert.equal(interpretarEleccion('la 1').elegido, 'A');
  assert.equal(interpretarEleccion('la novena').elegido, 'I');
});
