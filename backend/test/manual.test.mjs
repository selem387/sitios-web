import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas } from '../src/generador/validar_material.js';
import { parManual, portadaManualHTML, declaracionManualHTML, palabrasDeclaracion, serviciosManualHTML, trabajoManualHTML, cierreManualHTML, indiceManualHTML, CSS_MANUAL, CSS_REVISION_MANUAL, MAX_PALABRAS, TRAMO_DECL } from '../src/generador/manual.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const matDe = (n, extra = {}) => ({ logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], ...extra });
const textos = { variantes: Array(18).fill({ titular: 'Sonrisas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Limpieza', 'Blanqueamiento', 'Ortodoncia'], sobre: 'Somos una clínica familiar. Acompañamos cada paso.', diapositivas: [{ titular: 'Atención directa' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const oferta = { diferenciador: 'Tratamos a cada paciente como a alguien de la familia y le explicamos cada paso antes de empezar.', proceso_pasos: ['Valoración\nRevisamos tu caso', 'Plan\nTe explicamos opciones', 'Tratamiento\nCon seguimiento'], items: [
  { nombre: 'Limpieza dental', grupo: 'Prevención', precio: '$800' }, { nombre: 'Revisión', grupo: 'Prevención', precio: '$400' },
  { nombre: 'Blanqueamiento', grupo: 'Estética', precio: '$3,200' }, { nombre: 'Carillas', grupo: 'Estética', precio: '$9,500' } ] };
const brief = { negocio: { nombre: 'Clínica Norte', arquetipo: 'clinica', giro_texto: 'Clínica dental', ciudad: 'Mérida' }, contacto: {}, oferta };
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', ...o });

test('la R sale como decimoctava, solo cuando se pide; la Q y la O no cambian', () => {
  assert.equal(LETRAS, 'ABCDEFGHIJKLMNOPQR');
  assert.deepEqual(gen({ solo: 'R' }).map((p) => [p.letra, p.layout]), [['R', 'manual']]);
  assert.equal(gen().some((p) => p.layout === 'manual'), false);
  assert.deepEqual(gen({ solo: 'Q' }).map((p) => [p.letra, p.layout]), [['Q', 'vitrina']]);
  assert.deepEqual(gen({ solo: 'OQR' }).map((p) => p.letra), ['O', 'Q', 'R']);
});

test('letra de la R: una sola grotesca con los pesos 400, 500 y 600', () => {
  assert.deepEqual(parManual(pares), { titulos: 'Hanken Grotesk', cuerpo: 'Hanken Grotesk', estilo: 'elegante' });
  assert.equal(parManual([{ titulos: 'Albert Sans', cuerpo: 'Albert Sans' }]).titulos, 'Albert Sans');
  assert.equal(parManual([]).cuerpo, 'Hanken Grotesk');
});

test('la R arma portada, declaración, servicios numerados, proceso, rejilla, índice y cierre sin librerías ni video', () => {
  const [r] = gen({ solo: 'R' });
  assert.match(r.html, /<body class="l-manual">/);
  assert.equal((r.html.match(/<h1/g) || []).length, 1);
  assert.match(r.html, /class="mn-fig"/);
  assert.match(r.html, /class="mn-decl"/);
  assert.equal((r.html.match(/class="mn-w"/g) || []).length, palabrasDeclaracion(oferta.diferenciador).length);
  assert.match(r.html, /class="mn-srv"/);
  assert.match(r.html, /class="mn-srv-h"/);
  assert.match(r.html, /id="proceso"/);
  assert.match(r.html, /class="mn-gal"/);
  assert.match(r.html, /class="mn-rail"/);
  assert.match(r.html, /class="mn-cierre"/);
  assert.match(r.html, /animation-timeline:view\(\)/);
  assert.match(r.html, /position:sticky/);
  assert.match(r.html, /prefers-reduced-motion:no-preference/);
  assert.doesNotMatch(r.html, /<video/);
  assert.doesNotMatch(r.html, /gsap|lenis|swiper|flickity|jquery|lottie|barba|data-fx=|<script src/i);
});

test('el orden de la R: declaración, servicios, proceso, trabajo y al final contacto', () => {
  const [r] = gen({ solo: 'R' });
  const pos = ['class="mn-decl"', 'id="servicios"', 'id="proceso"', 'id="trabajo"', 'id="contacto"', 'class="mn-cierre"'].map((s) => r.html.indexOf(s));
  assert.ok(pos.every((x) => x > 0), JSON.stringify(pos));
  assert.deepEqual([...pos].sort((a, b) => a - b), pos);
});

test('la R solo anima opacity y transform; los nombres de fotogramas son válidos', () => {
  const [r] = gen({ solo: 'R' });
  const bloques = [...r.html.matchAll(/@keyframes ([^{]+)\{((?:[^{}]|\{[^{}]*\})*)\}/g)].filter((m) => m[1].startsWith('mn-'));
  assert.ok(bloques.length >= 3);
  for (const [, nombre, cuerpo] of bloques) {
    assert.match(nombre, /^mn-[a-z0-9_-]+$/);
    assert.doesNotMatch(cuerpo, /(left|top|width|height|margin|padding)\s*:/);
  }
});

test('la R usa las fotos del cliente y no repite fuera de las permitidas', () => {
  const [r] = gen({ solo: 'R' });
  assert.match(r.html, /https:\/\/x\/1\.jpg/);
  assert.deepEqual(fotosRepetidas(r.html, matDe(6)), []);
});

test('todas las fotos de trabajo van en la rejilla (ninguna se pierde)', () => {
  for (const n of [1, 5, 6, 9, 14, 40]) {
    const m = matDe(n);
    const [r] = gen({ solo: 'R', mat: m });
    const rejilla = r.html.split('class="mn-gal"')[1].split('</section>')[0];
    for (const t of m.trabajos) assert.ok(rejilla.includes(t.url), `falta ${t.url} con ${n} fotos`);
  }
});

test('la declaración enciende cada palabra en su tramo del scroll, sin salirse del recorrido', () => {
  const frase = Array.from({ length: 80 }, (_, i) => `p${i}`).join(' ');
  const ps = palabrasDeclaracion(frase);
  assert.equal(ps.length, MAX_PALABRAS);
  for (let k = 1; k < ps.length; k++) assert.ok(ps[k].s >= ps[k - 1].s);
  assert.equal(ps[0].s, TRAMO_DECL.ini);
  assert.ok(ps.at(-1).e <= TRAMO_DECL.ini + TRAMO_DECL.ancho + TRAMO_DECL.dur);
  assert.ok(ps.at(-1).e < 70);
  assert.equal(declaracionManualHTML({ frase: 'dos palabras' }), '');
  assert.equal(declaracionManualHTML({ frase: '' }), '');
  const h = declaracionManualHTML({ frase: 'Cuidamos tu sonrisa como si fuera la nuestra de verdad' });
  assert.match(h, /aria-label="Cuidamos tu sonrisa/);
  assert.match(h, /<p class="mn-frase" aria-hidden="true">/);
});

test('servicios en dos columnas conserva todo el contenido; si no reconoce la forma, devuelve igual', () => {
  const html = '<section class="sec" id="servicios"><div class="wrap"><h2>Servicios</h2><p class="sec-intro">Intro</p><div class="paq-grupo">A</div><div class="centro"><a class="btn">x</a></div></div></section>';
  const out = serviciosManualHTML(html);
  assert.match(out, /<div class="mn-srv-h"><h2>Servicios<\/h2><p class="sec-intro">Intro<\/p><\/div><div class="mn-srv-l"><div class="paq-grupo">A<\/div>/);
  assert.equal(out.replace(/<div class="mn-srv(-h|-l)?">/g, '').replace(/<\/div><\/div><\/div><\/section>$/, '</div></div></section>').includes('paq-grupo'), true);
  assert.equal(serviciosManualHTML(''), '');
  assert.equal(serviciosManualHTML('<p>otra cosa</p>'), '<p>otra cosa</p>');
});

test('piezas vacías no salen y el índice necesita al menos dos secciones', () => {
  const img = (x) => `<img src="${x.url}">`;
  assert.equal(trabajoManualHTML({ fotos: [], titulo: 'T', img }), '');
  assert.equal(cierreManualHTML({ titulo: '' }), '');
  assert.equal(indiceManualHTML([['a', 'A']]), '');
  const ix = indiceManualHTML([['servicios', 'Servicios'], ['trabajo', 'Trabajo']]);
  assert.match(ix, /<span>01<\/span><b>Servicios<\/b>/);
  assert.match(ix, /<span>02<\/span><b>Trabajo<\/b>/);
  const sin = portadaManualHTML({ img: () => '', titular: 'T', cta: '<a class="btn">x</a>' });
  assert.match(sin.html, /sin-foto/);
  assert.deepEqual(sin.urls, []);
  assert.match(CSS_MANUAL, /prefers-reduced-motion:no-preference/);
  assert.match(CSS_REVISION_MANUAL, /\.mn-w\{animation:none!important;opacity:1!important\}/);
});

test('con ordinales y letras, elegir la R por chat sin tocar la Q', () => {
  assert.equal(interpretarEleccion('me quedo con la R').elegido, 'R');
  assert.equal(interpretarEleccion('la decimoctava').elegido, 'R');
  assert.equal(interpretarEleccion('la 18').elegido, 'R');
  assert.equal(interpretarEleccion('la 17').elegido, 'Q');
  assert.equal(interpretarEleccion('la decimoséptima').elegido, 'Q');
  assert.notEqual(interpretarEleccion('quiero la que tiene el fondo azul')?.elegido, 'R');
});

test('la frase de la declaración salta saludos y presentaciones y prefiere lo que el negocio valora', async () => {
  const { fraseDeclaracion } = await import('../src/generador/manual.js');
  const sobre = '¡Hola! Soy Blanca, y me encanta poder compartir contigo un poquito de mi historia. Soy licenciada en Periodismo, pero todo empezó antes. Lo que empezó como una curiosidad terminó convirtiéndose en una de mis grandes pasiones. Con el tiempo descubrí que lo que más disfruto es capturar emociones, conexiones y esos pequeños instantes que muchas veces pasan desapercibidos.';
  assert.match(fraseDeclaracion([undefined, sobre]), /^Con el tiempo descubrí que lo que más disfruto/);
  assert.equal(fraseDeclaracion(['Tratamos a cada paciente como a alguien de la familia y le explicamos cada paso.', sobre]), 'Tratamos a cada paciente como a alguien de la familia y le explicamos cada paso.');
  assert.equal(fraseDeclaracion(['¡Hola!', 'Corto.']), '');
  assert.equal(fraseDeclaracion([]), '');
});
