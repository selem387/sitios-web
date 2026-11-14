import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { parGuia, escenaGuiaHTML, indiceGuiaHTML } from '../src/generador/guia.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(13).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], diapositivas: [{ titular: 'Atención directa' }, { titular: 'Asesoría legal incluida' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta: { proceso_pasos: ['Visita', 'Oferta', 'Firma'] } };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', ...o });

test('la M sale como decimotercera, solo cuando se pide, y la L queda libre', () => {
  assert.deepEqual(gen({ solo: 'M' }).map((p) => [p.letra, p.layout]), [['M', 'guia']]);
  assert.deepEqual(gen({ solo: 'L' }), []);
  assert.equal(gen().some((p) => p.layout === 'guia'), false);
  assert.equal(parGuia(pares).titulos, 'Hanken Grotesk');
  assert.equal(parGuia([{ titulos: 'Gloock', cuerpo: 'Petrona' }]).titulos, 'Instrument Sans');
});

test('la M arma portada que se abre, recorrido de fotos, frase, cierre e índice con efectos GSAP', () => {
  const [m] = gen({ solo: 'M' });
  assert.match(m.html, /<body class="l-guia">/);
  assert.match(m.html, /data-fx="titulo" data-fx-split="letras"/);
  assert.match(m.html, /data-fx="abre"/);
  assert.match(m.html, /data-fx="secuencia" style="--n:4"/);
  assert.match(m.html, /data-fx="cierre"/);
  assert.match(m.html, /data-fx="banda"/);
  assert.match(m.html, /class="gu-ind-b"/);
  assert.match(m.html, /<nav class="gu-ind" id="indice" aria-label="Índice" hidden><ol><li><a href="#[a-z]+"><span>01<\/span>/);
  assert.match(m.html, /data-fx-gsap/);
  assert.match(m.html, /<script src="[^"]*gsap[^"]*" defer>/);
  assert.equal((m.html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(m.html, /<video/);
});

test('la M no repite fotos fuera de las permitidas ni deforma (cover) y usa las del cliente', () => {
  const [m] = gen({ solo: 'M' });
  assert.match(m.html, /https:\/\/x\/1\.jpg/);
  assert.deepEqual(fotosRepetidas(m.html, matDe(6)), []);
  assert.match(m.html, /\.gu-p img\{width:100%;height:100%;object-fit:cover/);
});

test('sin fotos suficientes sigue completa y sin recorrido', () => {
  const e = escenaGuiaHTML({ img: () => '', titular: 'T', cta: '<a class="btn">x</a>' });
  assert.match(e.html, /<h1 class="gu-tit" data-fx="titulo"[^>]*>T<\/h1>/);
  assert.doesNotMatch(e.html, /gu-abre|gu-sec/);
  assert.equal(indiceGuiaHTML([]), '');
});

test('elegir la M por chat', () => {
  assert.equal(interpretarEleccion('me quedo con la M').elegido, 'M');
  assert.equal(interpretarEleccion('la decimotercera').elegido, 'M');
  assert.equal(interpretarEleccion('la 13').elegido, 'M');
  assert.equal(interpretarEleccion('la K').elegido, 'K');
});
