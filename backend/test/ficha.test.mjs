import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { auditarPaleta } from '../src/generador/tipo_color.js';
import { parFicha, fichasDe, portadaFichaHTML, cintaFichaHTML, atributosFichaHTML, escenaFichaHTML } from '../src/generador/ficha.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(16).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], sobre: 'Somos una inmobiliaria familiar. Acompañamos cada paso.', diapositivas: [{ titular: 'Atención directa', apoyo: 'Te acompañamos' }, { titular: 'Asesoría legal incluida' }, { titular: 'Sin sorpresas' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const oferta = { proceso_pasos: ['Visita', 'Oferta', 'Firma'], items: [
  { nombre: 'Casa 3 recámaras', grupo: 'Venta', precio_o_rango: '$3.2 M', descripcion_corta: 'Con alberca y jardín' }, { nombre: 'Departamento', grupo: 'Venta', precio: '$1.9 M' },
  { nombre: 'Casa en renta', grupo: 'Renta', precio: '$18 mil' }, { nombre: 'Local comercial', grupo: 'Renta', precio: '$25 mil' } ] };
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', ...o });

test('la P sale como decimosexta, solo cuando se pide; L y N siguen libres', () => {
  assert.equal(LETRAS, 'ABCDEFGHIJKLMNOP');
  assert.deepEqual(gen({ solo: 'P' }).map((p) => [p.letra, p.layout]), [['P', 'ficha']]);
  assert.equal(gen().some((p) => p.layout === 'ficha'), false);
  assert.deepEqual(gen({ solo: 'L' }), []);
  assert.equal(parFicha(pares).titulos, 'Gloock');
});

test('la P arma portada con panel de pedido, cinta, fichas con panel, escena fija y cierre; sin librerías ni video', () => {
  const [p] = gen({ solo: 'P' });
  assert.match(p.html, /<body class="l-ficha">/);
  assert.match(p.html, /class="hero h-fc"/);
  assert.match(p.html, /class="fc-panel"/);
  assert.equal((p.html.match(/class="fc-chip"/g) || []).length, 3);
  assert.match(p.html, /class="fc-cinta"/);
  assert.match(p.html, /id="ficha"/);
  assert.equal((p.html.match(/class="fc-tile/g) || []).length, 4);
  assert.match(p.html, /<dialog class="fc-dlg"/);
  assert.match(p.html, /class="fc-esc"/);
  assert.equal((p.html.match(/class="fc-paso( on)?"/g) || []).length, 4);
  assert.match(p.html, /class="fc-cierre"/);
  assert.equal((p.html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(p.html, /<video/);
  assert.doesNotMatch(p.html, /gsap|lenis|swiper|anime|data-fx=|<script src/i);
});

test('la P: tema oscuro que pasa la regla de contraste y respeta reducir movimiento', () => {
  const [p] = gen({ solo: 'P' });
  assert.deepEqual(auditarPaleta(p.paleta), []);
  assert.match(p.html, /prefers-reduced-motion:no-preference/);
  assert.match(p.html, /html:not\(\.fc-js\)|html\.fc-js \.fc-det\{display:none\}/);
});

test('la P usa las fotos del cliente y no repite fuera de las permitidas', () => {
  const [p] = gen({ solo: 'P' });
  assert.match(p.html, /https:\/\/x\/1\.jpg/);
  assert.deepEqual(fotosRepetidas(p.html, matDe(6)), []);
});

test('fichasDe usa la oferta (destacados primero) y cae a las líneas de info', () => {
  const f = fichasDe([{ nombre: 'A', grupo: 'G' }, { nombre: 'B', destacado: true, descripcion_corta: 'x', precio: '$1' }], [], 'Servicio');
  assert.equal(f[0].valor, 'B'); assert.equal(f[0].detalle, 'x'); assert.equal(f[1].etiqueta, 'G');
  assert.deepEqual(fichasDe([], ['Uno', 'Dos'], 'Menú').map((x) => x.valor), ['Uno', 'Dos']);
  assert.equal(fichasDe([{ nombre: 'Solo' }], [], 'S').length, 1);
});

test('piezas: sin fichas ni escena suficientes no se arman; sin foto la portada sigue con su h1', () => {
  assert.equal(atributosFichaHTML({ fichas: [{ etiqueta: 'a', valor: 'b' }] }), '');
  assert.equal(escenaFichaHTML({ pasos: [{ foto: foto(1) }], img: () => '' }).html, '');
  assert.equal(cintaFichaHTML(['uno']), '');
  const e = portadaFichaHTML({ img: () => '', titular: 'T', cta: '<a class="btn">x</a>' });
  assert.match(e.html, /<h1 class="fc-h">T<\/h1>/);
  assert.match(e.html, /sin-foto/);
});

test('elegir la P por chat: letra, "la 16" y "decimosexta"', () => {
  assert.equal(interpretarEleccion('me quedo con la P').elegido, 'P');
  assert.equal(interpretarEleccion('la decimosexta').elegido, 'P');
  assert.equal(interpretarEleccion('la 16').elegido, 'P');
  assert.equal(interpretarEleccion('la O').elegido, 'O');
  assert.notEqual(interpretarEleccion('A o B')?.elegido, 'P');
});
