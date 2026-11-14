import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { parGuia, anilloGuiaHTML, formaGuiaHTML, apiladasGuiaHTML, menuGuiaHTML, CDN_GUIA } from '../src/generador/guia.js';

const foto = (n, w = 1200, h = 800, tipo = 'foto_trabajo') => ({ url: `https://x/${n}.jpg`, ancho: w, alto: h, alt: `foto ${n}`, tipo, clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2, k % 3 === 2 ? 800 : 1200, k % 3 === 2 ? 1100 : 800)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(13).fill({ titular: 'Espacios que se sienten tuyos', subtitulo: 'Sub', cta: 'Escríbenos por WhatsApp' }), info: ['Diseño a medida', 'Obra sin sorpresas', 'Entrega puntual'], diapositivas: [{ titular: 'Atención directa' }, { titular: 'Asesoría incluida' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Gabarito', estilo: 'elegante' }];
const brief = {
  negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Interiorismo', ciudad: 'Mérida' }, contacto: { whatsapp: '5219999999999' },
  confianza: { historia_corta: 'Nacimos en 2015. Diseñamos casas en Mérida. Trabajamos con materiales de la región.', fundador: { nombre: 'Ana Pérez', rol: 'Arquitecta' } },
  oferta: { diferenciador: 'Cada casa empieza escuchándote. Te entregamos en la fecha acordada.', items: [{ nombre: 'Interiores' }, { nombre: 'Remodelación' }, { nombre: 'Fachadas' }], proceso_pasos: ['Visita', 'Propuesta', 'Obra'] },
};
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(7), textos, pares, urlFuentes: () => '', ...o });

test('la M solo sale cuando se pide y usa una grotesca geométrica', () => {
  assert.deepEqual(gen({ solo: 'M' }).map((p) => [p.letra, p.layout]), [['M', 'guia']]);
  assert.equal(gen().some((p) => p.layout === 'guia'), false);
  assert.equal(parGuia(pares).titulos, 'Gabarito');
  assert.equal(parGuia([{ titulos: 'Gloock', cuerpo: 'Petrona' }]).titulos, 'Onest');
});

test('no usa nada de las opciones anteriores (solo el modelo)', () => {
  const [m] = gen({ solo: 'M' });
  assert.doesNotMatch(m.html, /data-fx=|data-fx-gsap|fx-runtime|SplitType|split-type/);
  assert.match(m.html, new RegExp(CDN_GUIA.gsap.replace(/[.]/g, '\\.')));
  assert.match(m.html, /ScrollTrigger\.min\.js/);
  assert.match(m.html, /lenis@1\.3\.27/);
});

test('portada: anillo con todas las fotos, tarjeta de frase, nombre de la tarjeta del frente, menú y bloque final', () => {
  const [m] = gen({ solo: 'M' });
  assert.match(m.html, /<body class="l-guia">/);
  assert.match(m.html, /class="hero h-guia gu-anillo"/);
  assert.equal((m.html.match(/class="gu-t gu-(tl|tm|ts|vl|vm)"/g) || []).length, 8);
  assert.match(m.html, /class="gu-t gu-tx"[^>]*><span class="gu-tc"><span class="gu-fr">Te ayudamos con<\/span>/);
  assert.match(m.html, /class="gu-front" aria-live="polite"><b>[^<]+<\/b>/);
  assert.match(m.html, /class="gu-mb"[^>]*>Menú<\/button><nav class="gu-menu"/);
  assert.match(m.html, /class="gu-sig-b"><a href="https:\/\/wa\.me/);
  assert.match(m.html, /class="gu-apil"/);
  assert.match(m.html, /class="gu-color"/);
  assert.equal((m.html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(m.html, /<!--GU-ANILLO-->/);
});

test('las tarjetas respetan la proporción de cada foto y llevan a secciones que existen', () => {
  const [m] = gen({ solo: 'M' });
  assert.match(m.html, /class="gu-t gu-v[lm]"[^>]*style="--r:0\.7273"/);
  for (const [, id] of m.html.matchAll(/class="gu-t[^"]*" href="#([a-z]+)"/g)) assert.match(m.html, new RegExp(`id="${id}"`));
  assert.match(m.html, /\.gu-t img\{width:100%;aspect-ratio:var\(--r\);object-fit:cover/);
});

test('sin fotos repetidas fuera de la portada; la forma usa fotos que no están en la portada', () => {
  const mat = matDe(7, { fundador: foto(50, 900, 1200, 'foto_fundador'), equipo: [foto(51, 1200, 900, 'foto_equipo')] });
  const [m] = gen({ solo: 'M', mat });
  assert.deepEqual(fotosRepetidas(m.html, mat), []);
  const forma = m.html.match(/<section class="gu-forma"[\s\S]*?<\/section>/)[0];
  assert.match(forma, /https:\/\/x\/50\.jpg/);
  assert.doesNotMatch(forma, /https:\/\/x\/(1|[2-8])\.jpg/);
  assert.match(forma, /Ana Pérez/);
  assert.match(forma, /Nacimos en 2015\.[\s\S]*Trabajamos con materiales de la región\./);
});

test('sin fotos libres, "Sobre" queda como siempre; piezas vacías no salen', () => {
  const [m] = gen({ solo: 'M' });
  assert.doesNotMatch(m.html, /class="gu-forma"/);
  assert.match(m.html, /id="sobre"/);
  assert.equal(formaGuiaHTML({ fotos: [], img: () => '' }), '');
  assert.equal(apiladasGuiaHTML({ palabras: ['una'] }), '');
  assert.equal(menuGuiaHTML([]), '');
  const a = anilloGuiaHTML({ titular: 'T', img: () => '' });
  assert.match(a, /<h1 class="gu-h1"><span>T<\/span><\/h1>/);
});

test('elegir la M por chat', () => {
  assert.equal(interpretarEleccion('me quedo con la M').elegido, 'M');
  assert.equal(interpretarEleccion('la 13').elegido, 'M');
});
