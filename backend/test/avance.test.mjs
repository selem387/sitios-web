import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS, LAYOUTS_GENERAL } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { parAvance, datosDe, fraseResaltada, franjaN, vitrinaN, avanceN, prensaN, CDN_N } from '../src/generador/avance.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(16).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], sobre: 'Somos una inmobiliaria familiar en Mérida con más de quince años acompañando a cada familia. Acompañamos cada paso.', diapositivas: [{ titular: 'Atención directa' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const oferta = { proceso_pasos: ['Visita', 'Oferta', 'Firma'], items: [{ nombre: 'Casa 3 recámaras', grupo: 'Venta', precio: '$3.2 M' }, { nombre: 'Departamento', grupo: 'Venta', precio: '$1.9 M' }, { nombre: 'Casa en renta', grupo: 'Renta', precio: '$18 mil' }] };
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: { whatsapp: '9991234567', horarios: 'Lun a sáb 9 a 19' }, oferta };
const conf = { cifras: ['15 años de experiencia', 'Más de 500 familias'], premios: ['Mejor inmobiliaria 2025'], certificaciones: ['AMPI'], testimonios: [{ texto: 'Nos ayudaron a encontrar casa en dos semanas.', nombre: 'Laura P.' }] };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(8), textos, pares, urlFuentes: () => '', ...o });

test('la N sale como decimocuarta, solo cuando se pide', () => {
  assert.equal(LETRAS[13], 'N');
  assert.equal(LAYOUTS_GENERAL[13], 'avance');
  assert.deepEqual(gen({ solo: 'N' }).map((p) => [p.letra, p.layout]), [['N', 'avance']]);
  assert.equal(gen().some((p) => p.layout === 'avance'), false);
  assert.equal(parAvance(pares).titulos, 'Geist');
});

test('la N sigue el recorrido de la referencia: portada, franja, vitrina, avance, tarjetas, prensa y marco negro', () => {
  const [n] = gen({ solo: 'N', brief: { ...brief, confianza: conf } });
  const orden = ['vx-portada', 'vx-franja', 'vx-vitrina', 'vx-avance', 'vx-tarjetas', 'vx-prensa', 'vx-negro'].map((c) => n.html.indexOf(`class="${c}`) >= 0 ? n.html.indexOf(`class="${c}`) : n.html.indexOf(`${c}`));
  orden.forEach((i) => assert.ok(i > 0));
  assert.deepEqual([...orden].sort((a, b) => a - b), orden);
  assert.match(n.html, /<body class="l-avance">/);
  assert.match(n.html, /class="vx-pausa"/);
  assert.match(n.html, /class="vx-w"/);
  assert.match(n.html, /class="vx-gigante" aria-hidden="true">Norte 21</);
  assert.equal((n.html.match(/<div><dt>/g) || []).length, 2);
  assert.match(n.html, /class="vx-marcas"/);
  assert.equal((n.html.match(/class="vx-card/g) || []).length, 3);
  assert.match(n.html, /Laura P\./);
  assert.match(n.html, /Mejor inmobiliaria 2025/);
  assert.equal((n.html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(n.html, /<video/);
  assert.ok(n.html.includes(CDN_N.gsap) && n.html.includes(CDN_N.scrolltrigger) && n.html.includes(CDN_N.lenis));
  assert.match(n.html, /family=Geist\+Mono/);
  assert.deepEqual(fotosRepetidas(n.html, matDe(8)), []);
});

test('la N omite lo que el cliente no tiene', () => {
  const [n] = gen({ solo: 'N', textos: { ...textos, sobre: '' } });
  assert.doesNotMatch(n.html, /class="vx-franja"/);
  assert.doesNotMatch(n.html, /class="vx-prensa"/);
  assert.doesNotMatch(n.html, /class="vx-datos"/);
  assert.equal(franjaN(''), '');
  assert.equal(vitrinaN({ img: () => '' }), '');
  assert.equal(avanceN({ img: () => '' }).html, '');
  assert.equal(prensaN({}), '');
});

test('datos y frase', () => {
  assert.deepEqual(datosDe(['15 años de experiencia', 'Más de 500 clientes']), [{ valor: '15', etiqueta: 'Años de experiencia' }, { valor: '+500', etiqueta: 'Clientes' }]);
  assert.deepEqual(datosDe(['15 años']), []);
  assert.deepEqual(datosDe(['Trato directo', 'Siempre']), []);
  assert.equal(fraseResaltada('Corta. Segunda oración aquí. Tercera.'), 'Corta. Segunda oración aquí.');
  assert.equal(fraseResaltada(''), '');
});

test('elegir la N por chat', () => {
  assert.equal(interpretarEleccion('me quedo con la N').elegido, 'N');
  assert.equal(interpretarEleccion('la decimocuarta').elegido, 'N');
  assert.equal(interpretarEleccion('la 14').elegido, 'N');
});
