import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { parVitrina, portadaVitrinaHTML, bandaVitrinaHTML, cierreVitrinaHTML, repartirTarjetas, vitrinaTrabajoHTML, CSS_VITRINA } from '../src/generador/vitrina.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(17).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], sobre: 'Somos una inmobiliaria familiar. Acompañamos cada paso.', diapositivas: [{ titular: 'Atención directa' }, { titular: 'Asesoría legal incluida' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const oferta = { proceso_pasos: ['Visita', 'Oferta', 'Firma'], items: [
  { nombre: 'Casa 3 recámaras', grupo: 'Venta', precio: '$3.2 M' }, { nombre: 'Departamento', grupo: 'Venta', precio: '$1.9 M' },
  { nombre: 'Casa en renta', grupo: 'Renta', precio: '$18 mil' }, { nombre: 'Local comercial', grupo: 'Renta', precio: '$25 mil' } ] };
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', ...o });

test('la Q sale como decimoséptima, solo cuando se pide; la P queda libre y la O no cambia', () => {
  assert.equal(LETRAS, 'ABCDEFGHIJKLMNOPQR');
  assert.deepEqual(gen({ solo: 'Q' }).map((p) => [p.letra, p.layout]), [['Q', 'vitrina']]);
  assert.deepEqual(gen({ solo: 'P' }), []);
  assert.equal(gen().some((p) => p.layout === 'vitrina'), false);
  assert.deepEqual(gen({ solo: 'O' }).map((p) => [p.letra, p.layout]), [['O', 'catalogo']]);
  assert.deepEqual(gen({ solo: 'OQ' }).map((p) => p.letra), ['O', 'Q']);
});

test('letra de la Q: serif para titulares y grotesca para texto', () => {
  assert.deepEqual(parVitrina(pares), { titulos: 'Bodoni Moda', cuerpo: 'Hanken Grotesk', estilo: 'elegante' });
  assert.equal(parVitrina([{ titulos: 'Instrument Serif', cuerpo: 'Albert Sans' }]).titulos, 'Instrument Serif');
  assert.equal(parVitrina([]).cuerpo, 'Albert Sans');
});

test('la Q arma portada con fundido, tarjetas que rotan, filas, banda partida y cierre sin librerías ni video', () => {
  const [q] = gen({ solo: 'Q' });
  assert.match(q.html, /<body class="l-vitrina">/);
  assert.equal((q.html.match(/class="vq-sl"/g) || []).length, 5);
  assert.match(q.html, /class="vq-dots"/);
  assert.match(q.html, /class="vq-pausa"/);
  assert.match(q.html, /@keyframes vq-o5-6\{/);
  assert.equal((q.html.match(/<h1/g) || []).length, 1);
  assert.equal((q.html.match(/class="vq-bots"/g) || []).length, 1);
  assert.match(q.html, /class="vq-estante"/);
  assert.match(q.html, /class="vq-card"/);
  assert.match(q.html, /class="vq-info"/);
  assert.match(q.html, /class="vq-banda"/);
  assert.match(q.html, /class="vq-cierre"/);
  assert.match(q.html, /scroll-snap-type:x mandatory/);
  assert.match(q.html, /animation-timeline:view\(\)/);
  assert.match(q.html, /prefers-reduced-motion:no-preference/);
  assert.doesNotMatch(q.html, /<video/);
  assert.doesNotMatch(q.html, /gsap|lenis|swiper|flickity|jquery|data-fx=|<script src/i);
});

test('la Q solo anima opacity, transform y scale; los nombres de fotogramas son válidos', () => {
  const [q] = gen({ solo: 'Q' });
  const bloques = [...q.html.matchAll(/@keyframes ([^{]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g)].filter((m) => m[1].startsWith('vq-'));
  assert.ok(bloques.length >= 6);
  for (const [, nombre, cuerpo] of bloques) {
    assert.match(nombre, /^vq-[a-z0-9_-]+$/);
    assert.doesNotMatch(cuerpo, /(left|top|width|height|margin|padding)\s*:/);
  }
});

test('la Q usa las fotos del cliente y no repite fuera de las permitidas', () => {
  const [q] = gen({ solo: 'Q' });
  assert.match(q.html, /https:\/\/x\/1\.jpg/);
  assert.deepEqual(fotosRepetidas(q.html, matDe(6)), []);
});

test('todas las fotos de trabajo van en las tarjetas (ninguna se pierde)', () => {
  for (const n of [5, 6, 9, 14, 40]) {
    const m = matDe(n);
    const [q] = gen({ solo: 'Q', mat: m });
    const enTarjetas = q.html.split('class="vq-estante"')[1].split('</section>')[0];
    for (const t of m.trabajos) assert.ok(enTarjetas.includes(t.url), `falta ${t.url} con ${n} fotos`);
  }
});

test('reparto de tarjetas: de 1 a 4 fotos cada una y todas las fotos entran', () => {
  assert.deepEqual(repartirTarjetas([]), []);
  assert.deepEqual(repartirTarjetas([1, 2, 3]).map((t) => t.length), [1, 1, 1]);
  assert.deepEqual(repartirTarjetas([1, 2, 3, 4, 5]).map((t) => t.length), [2, 2, 1]);
  for (const n of [4, 8, 13, 24, 40, 100]) {
    const t = repartirTarjetas(Array.from({ length: n }, (_, i) => i));
    assert.equal(t.flat().length, n);
    assert.ok(t.every((x) => x.length >= 1 && x.length <= 4), `n=${n}`);
    assert.ok(t.length >= 3 && t.length <= Math.max(8, Math.ceil(n / 4)));
  }
});

test('una tarjeta de una sola foto queda quieta y la portada de una sola foto no lleva movimiento', () => {
  const img = (x) => `<img src="${x.url}">`;
  const una = vitrinaTrabajoHTML({ fotos: [foto(1)], titulo: 'Trabajo', img });
  assert.match(una, /data-m="1"/);
  assert.doesNotMatch(una, /animation-delay/);
  const e = portadaVitrinaHTML({ img: () => '', titular: 'T', cta: '<a class="btn">x</a>' });
  assert.match(e.html, /<h1 class="vq-h">T<\/h1>/);
  assert.doesNotMatch(e.html, /vq-dots|vq-pausa|<style>/);
  assert.equal(bandaVitrinaHTML({ foto: null, img: () => '', frase: 'x' }), '');
  assert.equal(bandaVitrinaHTML({ foto: foto(1), img, frase: '' }), '');
  assert.equal(cierreVitrinaHTML({ titulo: '' }), '');
  assert.match(CSS_VITRINA, /prefers-reduced-motion:no-preference/);
});

test('el primer fotograma de la portada ya está visible al cargar (retraso negativo) y los demás escalonados', () => {
  const img = (x, o = {}) => `<img src="${x.url}"${o.extra || ''}>`;
  const { html } = portadaVitrinaHTML({ heroFoto: foto(1), pasos: [2, 3].map((n) => ({ foto: foto(n), titular: `p${n}` })), img, titular: 'T' });
  const retrasos = [...html.matchAll(/<article class="vq-sl"[^>]*animation-delay:-([\d.]+)s/g)].map((m) => Number(m[1]));
  assert.deepEqual(retrasos, [19.2, 13.2, 7.2]);
});

test('con ordinales y letras, elegir la Q por chat sin confundir "que" ni la conjunción "o"', () => {
  assert.equal(interpretarEleccion('me quedo con la Q').elegido, 'Q');
  assert.equal(interpretarEleccion('la decimoséptima').elegido, 'Q');
  assert.equal(interpretarEleccion('la 17').elegido, 'Q');
  assert.equal(interpretarEleccion('la O').elegido, 'O');
  assert.equal(interpretarEleccion('la 15').elegido, 'O');
  assert.notEqual(interpretarEleccion('quiero la que tiene el fondo azul')?.elegido, 'Q');
  assert.notEqual(interpretarEleccion('A o B')?.elegido, 'Q');
});
