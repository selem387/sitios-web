import test from 'node:test';
import assert from 'node:assert/strict';
import { GIROS, variablesTema, contraste, bandaHTML, cifraHTML, conEfectosGsap, cssTema, opcionConFx, headFx, pieFx } from '../src/generador/efectos_gsap.js';
import { renderPagina } from '../src/generador/plantilla_movimiento.js';

test('catálogo: 15 giros con estructura completa', () => {
  assert.equal(GIROS.length, 15);
  for (const g of GIROS) {
    assert.equal(g.servicios.length, 4, g.id); assert.equal(g.pasos.length, 3, g.id); assert.equal(g.perfiles.length, 2, g.id);
    assert.equal(g.bandas.length, 2, g.id); assert.equal(g.cifras.length, 3, g.id); assert.ok(g.roles.length >= 4, g.id);
    for (const s of g.servicios) assert.equal(s.p.length, 3, g.id);
  }
  assert.equal(new Set(GIROS.map((g) => g.id)).size, 15);
});

test('paleta flexible: contraste legible en todos los giros', () => {
  for (const g of GIROS) {
    const v = variablesTema(g.paleta);
    assert.ok(contraste(v['--tinta'], v['--fondo']) >= 7, `${g.id} tinta/fondo`);
    assert.ok(contraste(v['--acento-txt'], v['--fondo']) >= 4.5, `${g.id} acento como texto`);
    assert.ok(contraste(v['--sobre-boton'], v['--boton']) >= 4.5, `${g.id} texto sobre botón`);
    assert.ok(contraste(v['--sobre-banda'], v['--banda']) >= 4.5, `${g.id} texto sobre banda`);
    assert.ok(contraste(v['--acento-sobre-banda'], v['--banda']) >= 4.5, `${g.id} acento sobre banda`);
    assert.ok(contraste(v['--sobre-tinta'], v['--tinta']) >= 4.5, `${g.id} texto sobre tinta`);
  }
});

test('paleta flexible: corrige tinta pobre, acepta fondo oscuro y valores inválidos', () => {
  const pobre = variablesTema({ fondo: '#ffffff', tinta: '#dddddd', acento: '#ff6600' });
  assert.ok(contraste(pobre['--tinta'], pobre['--fondo']) >= 7);
  const oscuro = variablesTema({ fondo: '#14161c', tinta: '#eceae4', acento: '#d6a85c' });
  assert.ok(contraste(oscuro['--tinta'], oscuro['--fondo']) >= 7);
  assert.doesNotThrow(() => variablesTema({ fondo: 'azul', acento: null }));
  assert.match(cssTema({ fondo: '#fff', tinta: '#000', acento: '#0a0' }, '.x'), /^\.x\{--fondo:#ffffff/);
});

test('piezas HTML escapan texto y llevan atributos data-fx', () => {
  const b = bandaHTML('Uno <b> ✦ Dos & tres', { dir: 1, vel: 40, clase: 'fx-banda--contorno' });
  assert.match(b, /data-fx="banda" data-fx-dir="1" data-fx-vel="40"/);
  assert.ok(!b.includes('<b>') && b.includes('&lt;b&gt;'));
  assert.equal(bandaHTML('', {}), '');
  const c = cifraHTML(600, { sufijo: '+', etiqueta: 'casos' });
  assert.match(c, /data-valor="600"/); assert.match(c, />600\+</);
});

test('conEfectosGsap: inyecta una sola vez y marca títulos y bloques', () => {
  const html = '<!DOCTYPE html><html lang="es"><head><title>x</title></head><body><section class="sec"><h2>Servicios</h2><div class="paq">a</div></section></body></html>';
  const a = conEfectosGsap(html, { paleta: { fondo: '#fff', tinta: '#111', acento: '#06c' } });
  assert.match(a, /<html lang="es" data-fx-gsap>/);
  assert.match(a, /<h2 data-fx="titulo">/);
  assert.match(a, /data-fx="revela" data-fx-hijos="/);
  assert.equal((a.match(/gsap\.min\.js/g) || []).length, 1);
  assert.ok(a.includes('--acento:#0066cc'));
  assert.equal(conEfectosGsap(a), a, 'idempotente');
  const sin = conEfectosGsap(html, { lenis: false });
  assert.ok(!sin.includes('lenis.min.js') && sin.includes('data-fx-sin-lenis'));
  assert.equal(conEfectosGsap('<p>sin body</p>'), '<p>sin body</p>');
});

test('activación por opción (EFECTOS_GSAP=1; G y H excluidas)', () => {
  assert.equal(opcionConFx('A'), false, 'apagado por omisión');
});

test('plantilla: renderiza los 15 giros completos y sin "undefined"', () => {
  for (const g of GIROS) {
    const { barra, main, pie } = renderPagina(g);
    const todo = barra + main + pie;
    assert.ok(!/undefined|\[object/.test(todo), g.id);
    assert.equal((main.match(/class="serv serv-/g) || []).length, 4, g.id);
    assert.equal((main.match(/data-fx="banda"/g) || []).length, 3, g.id);
    assert.ok(main.includes('data-fx="horizontal"') && main.includes('data-fx="apila"') && main.includes('data-fx="palabras"'), g.id);
    assert.equal((pie.match(/class="btn-red"/g) || []).length, 5, `${g.id}: logos de todas las redes`);
    assert.ok(main.includes('maps'), `${g.id}: mapa de la dirección`);
  }
});

test('head y pie incluyen librerías con versión fija y defer', () => {
  assert.match(headFx(), /fx-pre/);
  const p = pieFx();
  for (const lib of ['gsap.min.js', 'ScrollTrigger.min.js', 'split-type', 'lenis']) assert.ok(p.includes(lib), lib);
  assert.equal((p.match(/ defer>/g) || []).length, 4);
});
