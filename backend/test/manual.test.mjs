import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS, NOMBRES_GENERAL } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { validarMaterial, fotosRepetidas } from '../src/generador/validar_material.js';
import { auditarPaleta } from '../src/generador/tipo_color.js';
import { temasManual, gruposManual, marcaManual, fraseManual, paletaManual, contraste, CDN_R } from '../src/generador/manual.js';

const foto = (n, extra = {}) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: n % 2 ? 1500 : 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}`, ...extra });
const matDe = (n) => ({ logo: { url: 'https://x/logo.png', ancho: 400, alto: 120 }, logos_extra: [], hero: foto(1, { tipo: 'foto_fundador' }), fundador: foto(1, { tipo: 'foto_fundador' }), fotos: [], trabajos: Array.from({ length: n }, (_, k) => foto(k + 2)), equipo: [foto(40, { tipo: 'foto_equipo' })], local: [], resenas: [foto(50, { tipo: 'captura_resena' })], catalogos: [], menus: [], otras: [], documentos: [], videos: [], colores: ['#FFFFFF', '#E8DCC4', '#B8913A'], usables: [] });
const textos = { variantes: Array(18).fill({ titular: 'Hay momentos que quisieras guardar', subtitulo: 'Sub', cta: 'Reserva tu sesión' }), sobre: '¡Hola! Soy Blanca. Con el tiempo descubrí que lo que más disfruto es capturar emociones y pequeños instantes.', secciones: { servicios: 'Servicios y paquetes', trabajo: 'Mi trabajo' } };
const oferta = { proceso_pasos: ['Entrega en 3 a 5 días', 'Enlace por WhatsApp'], items: [
  { grupo: '🎂 Smash Cake', nombre: 'Paquete #1', precio_o_rango: '$1,200 MXN', descripcion_corta: 'Primer añito.\n\n- 1 hora de sesión.\n- 35 fotografías.' },
  { grupo: '🎂 Smash Cake', nombre: 'Paquete #2', precio_o_rango: '$900 MXN' },
  { nombre: 'Eventos | Boda civil', precio: '$3,300 MXN' } ] };
const brief = { negocio: { nombre: 'Blanca Banderas Fotografía', arquetipo: 'servicios', giro_texto: 'Fotógrafa', ciudad: 'Mérida' }, contacto: { whatsapp: '999 263 2568', redes: { instagram: 'blanca', facebook: 'BlancaFoto' }, horarios: 'Lunes a sábado' }, confianza: { fundador: { nombre: 'Blanca Banderas', rol: 'Fotógrafa' }, cifras: ['12 años de experiencia'], testimonios: [{ nombre: 'Joy', texto: 'Las fotos nos encantaron' }] }, faq: [{ pregunta: '¿Cuándo entregan?', respuesta: 'En 3 a 5 días.' }], oferta };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const gen = (o = {}) => paginasGenerales({ brief, mat: matDe(6), textos, pares, urlFuentes: () => '', ...o });

test('la R sale como decimoctava solo cuando se pide; la Q queda reservada', () => {
  assert.equal(LETRAS, 'ABCDEFGHIJKLMNOPQR');
  assert.equal(NOMBRES_GENERAL.manual, 'Manual de servicios');
  assert.deepEqual(gen({ solo: 'R' }).map((p) => [p.letra, p.layout]), [['R', 'manual']]);
  assert.deepEqual(gen({ solo: 'Q' }), []);
  assert.equal(gen().some((p) => p.layout === 'manual'), false);
});

test('la R es una página propia: no usa la barra, el slider ni las secciones de las otras opciones', () => {
  const [r] = gen({ solo: 'R' });
  assert.match(r.html, /<body class="l-manual">/);
  assert.doesNotMatch(r.html, /class="barra"|class="sl[ -]|id="slider"|class="paq"|class="galeria g-|class="etq"/);
  for (const id of ['inicio', 'servicios', 'proceso', 'trabajo', 'sobre', 'resenas', 'faq', 'contacto']) assert.match(r.html, new RegExp(`<section class="cp-sec cp-${id}" id="${id}"`));
  assert.equal((r.html.match(/<h1/g) || []).length, 1);
  assert.match(r.html, /class="cp-wordmark"/);
  assert.match(r.html, /class="cp-regla"/);
  assert.match(r.html, /class="cp-menu-b"/);
  assert.match(r.html, /class="cp-barras"/);
  assert.match(r.html, /class="cp-giro"/);
});

test('la R carga las librerías de la referencia con versión fija y el shader de giro', () => {
  const [r] = gen({ solo: 'R' });
  for (const u of [CDN_R.gsap, CDN_R.scrolltrigger, CDN_R.splittype, CDN_R.lenis]) assert.ok(r.html.includes(`<script defer src="${u}">`), u);
  assert.ok(r.html.includes(CDN_R.three));
  assert.match(r.html, /qinticInOut/);
  assert.match(r.html, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(r.html, /<video/);
});

test('todo el material del cliente aparece y no se repiten fotos fuera de las permitidas', () => {
  const m = matDe(9);
  m.usables = [...m.trabajos, m.hero, ...m.equipo, ...m.resenas].map((x) => ({ clave: x.clave, tipo: x.tipo, urls: [x.url] }));
  const [r] = gen({ solo: 'R', mat: m });
  assert.deepEqual(validarMaterial(r.html, m), []);
  assert.deepEqual(fotosRepetidas(r.html, m), []);
});

test('servicios: grupos por "grupo" o por "A | B", con precio y detalle del cliente', () => {
  const g = gruposManual(oferta.items);
  assert.deepEqual(g.map((x) => [x.nombre, x.opciones.length]), [['🎂 Smash Cake', 2], ['Eventos', 1]]);
  assert.equal(g[0].opciones[0].precio, '$1,200 MXN');
  const [r] = gen({ solo: 'R' });
  assert.match(r.html, /<li>1 hora de sesión\.<\/li>/);
  assert.match(r.html, /\$900 MXN/);
});

test('nombre gigante y palabra manuscrita', () => {
  assert.deepEqual(marcaManual('Blanca Banderas Fotografía', 'Fotógrafa'), { grande: 'Blanca Banderas', mano: 'Fotografía' });
  assert.deepEqual(marcaManual('Norte 21', 'Bienes raíces'), { grande: 'Norte 21', mano: 'Bienes raíces' });
});

test('temas pastel con contraste: acento ≥ 4.5 y tinta ≥ 7 sobre el fondo; paleta aprobada por la auditoría', () => {
  for (const cs of [['#B8913A', '#E8DCC4'], [], ['#1E3D59'], ['#FF0000', '#00AA00', '#0000FF']]) {
    const ts = temasManual(cs);
    assert.equal(ts.length, 3);
    for (const t of ts) { assert.ok(contraste(t.acento, t.arriba) >= 4.5); assert.ok(contraste(t.tinta, t.arriba) >= 7); assert.ok(contraste(t.sobreAcento, t.acento) >= 4.5); }
    assert.deepEqual(auditarPaleta(paletaManual(cs)), []);
  }
});

test('frase de proceso: salta saludos y prefiere lo que el negocio disfruta', () => {
  assert.match(fraseManual([undefined, textos.sobre]), /^Con el tiempo descubrí/);
  assert.equal(fraseManual(['¡Hola!']), '');
});

test('elegir la R por chat', () => {
  assert.equal(interpretarEleccion('me quedo con la R').elegido, 'R');
  assert.equal(interpretarEleccion('la 18').elegido, 'R');
  assert.equal(interpretarEleccion('la decimoctava').elegido, 'R');
  assert.equal(interpretarEleccion('la 16').elegido, 'P');
  assert.notEqual(interpretarEleccion('la 17')?.elegido, 'A');
});
