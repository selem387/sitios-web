import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { parMovimiento } from '../src/generador/movimiento_k.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const mat = { logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: 5 }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] };
const textos = { variantes: Array(11).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], diapositivas: [{ titular: 'Atención directa' }, { titular: 'Asesoría legal incluida' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta: { proceso_pasos: ['Visita', 'Oferta', 'Firma'] } };
const gen = (o = {}) => paginasGenerales({ brief, mat, textos, pares, urlFuentes: () => '', ...o });

test('la K sale como undécima, solo cuando se pide', () => {
  assert.deepEqual(gen({ solo: 'K' }).map((p) => [p.letra, p.layout]), [['K', 'movimiento']]);
  assert.equal(gen().some((p) => p.layout === 'movimiento'), false);
  assert.equal(parMovimiento(pares).titulos, 'Public Sans');
});

test('la K trae portada con foto real, efectos y librerías con defer', () => {
  const [k] = gen({ solo: 'K' });
  assert.match(k.html, /data-fx="titulo" data-fx-split="letras"/);
  assert.match(k.html, /https:\/\/x\/1\.jpg/);
  assert.match(k.html, /data-fx-gsap/);
  assert.match(k.html, /<script src="[^"]*gsap[^"]*" defer>/);
  assert.match(k.html, /data-fx="banda"/);
  assert.equal((k.html.match(/<h1/g) || []).length, 1);
});

test('elegir la K por chat', () => {
  assert.equal(interpretarEleccion('me quedo con la K').elegido, 'K');
  assert.equal(interpretarEleccion('la undécima').elegido, 'K');
  assert.equal(interpretarEleccion('la 11').elegido, 'K');
});
