import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS, LAYOUTS_GENERAL, NOMBRES_GENERAL } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { parAvance, cifrasDe, reconocimientosDe, portadaAvanceHTML, cifrasAvanceHTML, reconocimientosHTML } from '../src/generador/avance.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(15).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], sobre: 'Somos una inmobiliaria familiar. Acompañamos cada paso.', diapositivas: [{ titular: 'Atención directa' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const oferta = { proceso_pasos: ['Visita', 'Oferta', 'Firma'], items: [{ nombre: 'Casa 3 recámaras', grupo: 'Venta', precio: '$3.2 M' }, { nombre: 'Departamento', grupo: 'Venta', precio: '$1.9 M' }] };
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta };
const conf = { cifras: ['15 años de experiencia', 'Más de 500 clientes', '98% de satisfacción'], premios: ['Mejor inmobiliaria 2025'], certificaciones: ['Corredor certificado AMPI'] };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', ...o });

test('la N sale como decimocuarta, solo cuando se pide; la L sigue libre', () => {
  assert.equal(LETRAS[13], 'N');
  assert.equal(LAYOUTS_GENERAL[13], 'avance');
  assert.equal(NOMBRES_GENERAL.avance, 'Cifras y avance');
  assert.deepEqual(gen({ solo: 'N' }).map((p) => [p.letra, p.layout]), [['N', 'avance']]);
  assert.deepEqual(gen({ solo: 'L' }), []);
  assert.equal(gen().some((p) => p.layout === 'avance'), false);
  assert.equal(parAvance(pares).titulos, 'Hanken Grotesk');
  assert.equal(parAvance([{ titulos: 'Gloock', cuerpo: 'Petrona' }]).titulos, 'Familjen Grotesk');
});

test('cifrasDe separa valor y etiqueta y descarta lo que no sirve', () => {
  assert.deepEqual(cifrasDe(['15 años de experiencia', 'Más de 500 clientes']), [{ valor: '15', etiqueta: 'Años de experiencia' }, { valor: '+500', etiqueta: 'Clientes' }]);
  assert.deepEqual(cifrasDe(['98% de satisfacción', '3 sucursales'])[0], { valor: '98%', etiqueta: 'De satisfacción' });
  assert.deepEqual(cifrasDe(['15 años de experiencia']), []);
  assert.deepEqual(cifrasDe(['Atención personalizada', 'Desde siempre']), []);
  assert.deepEqual(cifrasDe(null), []);
  assert.equal(cifrasDe(Array.from({ length: 9 }, (_, k) => `${k + 1} cosas${k}`)).length, 6);
});

test('reconocimientosDe junta premios y certificaciones sin repetir', () => {
  assert.deepEqual(reconocimientosDe(conf), ['Mejor inmobiliaria 2025', 'Corredor certificado AMPI']);
  assert.deepEqual(reconocimientosDe({ premios: ['A', 'A'], certificaciones: [''] }), ['A']);
  assert.deepEqual(reconocimientosDe({}), []);
});

test('la N arma portada con zoom lento, cifras y reconocimientos sin librerías ni video', () => {
  const [n] = gen({ solo: 'N', brief: { ...brief, confianza: conf } });
  assert.match(n.html, /<body class="l-avance">/);
  assert.match(n.html, /class="hero h-avance"/);
  assert.match(n.html, /@keyframes av-kb/);
  assert.match(n.html, /class="av-dato"/);
  assert.equal((n.html.match(/class="av-c"/g) || []).length, 3);
  assert.match(n.html, /id="reconocimientos"/);
  assert.equal((n.html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(n.html, /<video/);
  assert.doesNotMatch(n.html, /gsap|lenis|swiper|data-fx=|<script src/i);
  assert.deepEqual(fotosRepetidas(n.html, matDe(6)), []);
});

test('la N omite sola las cifras y los reconocimientos cuando el cliente no tiene datos', () => {
  const [n] = gen({ solo: 'N' });
  assert.doesNotMatch(n.html, /id="cifras"/);
  assert.doesNotMatch(n.html, /id="reconocimientos"/);
  assert.doesNotMatch(n.html, /class="av-dato"/);
  const [u] = gen({ solo: 'N', brief: { ...brief, confianza: { cifras: ['15 años de experiencia'] } } });
  assert.doesNotMatch(u.html, /id="cifras"/);
  assert.equal(cifrasAvanceHTML([]), '');
  assert.equal(reconocimientosHTML([]), '');
  const e = portadaAvanceHTML({ img: () => '', titular: 'T' });
  assert.match(e.html, /<h1 class="av-h">T<\/h1>/);
  assert.doesNotMatch(e.html, /av-bots|av-dato/);
});

test('elegir la N por chat: letra, ordinal y número', () => {
  assert.equal(interpretarEleccion('me quedo con la N').elegido, 'N');
  assert.equal(interpretarEleccion('la decimocuarta').elegido, 'N');
  assert.equal(interpretarEleccion('la 14').elegido, 'N');
  assert.equal(interpretarEleccion('la O').elegido, 'O');
});
