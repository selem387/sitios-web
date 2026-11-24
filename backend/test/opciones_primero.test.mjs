// Primero las opciones de diseño (23-nov-2026, caso Intiviso Lab).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faltantes, listoParaOpciones, requisitoDePregunta, esNegativa, noTieneDelHistorial, notaAntesDeOpciones } from '../src/entrevista/requisitos.js';
import { parsearJSONTextos } from '../src/generador/propuestas_html.js';

const indispensable = {
  cliente: { nombre: 'Jeancarlo' }, contacto: { whatsapp: '529990000000' }, no_tiene: ['redes'],
  negocio: { nombre: 'Intiviso Lab', giro_texto: 'agencia de marketing', arquetipo: 'servicios', ciudad: 'CDMX' },
  objetivo: { principal: 'me_contacten_whatsapp' }, oferta: { items: ['Branding', 'Pauta'] }, marca: { estilo: 'tecnologico' },
};
const assets = [{ tipo: 'logo', usar: true }, { tipo: 'foto_equipo', usar: true }];

test('antes de las opciones no se piden cliente ideal, zonas, reseñas, FAQ ni horarios', () => {
  assert.deepEqual(faltantes(indispensable, assets), []);
  assert.equal(listoParaOpciones(indispensable, assets), true);
});

test('sin fotos todavía no hay opciones', () => {
  assert.equal(listoParaOpciones(indispensable, [{ tipo: 'logo', usar: true }]), false);
  assert.deepEqual(faltantes(indispensable, [{ tipo: 'logo', usar: true }]).map((f) => f.id), ['fotos']);
});

test('ya elegido el diseño, vuelve a pedir lo que se dejó para después', () => {
  const b = { ...indispensable, marca: { ...indispensable.marca, propuestas: { estado: 'elegida', opciones: [{ letra: 'A' }] } } };
  const ids = faltantes(b, assets).map((f) => f.id);
  for (const id of ['cliente_ideal', 'zona', 'diferenciador', 'personalidad', 'testimonios', 'faq', 'horarios']) assert.ok(ids.includes(id), id);
  assert.equal(listoParaOpciones(b, assets), false);
  assert.equal(notaAntesDeOpciones(b), null);
});

test('"no" a una anécdota cuenta como que no tiene historia (no se repite)', () => {
  const p = '¡Perfecto! Ya tengo tu historia.\n¿Tienes alguna anécdota memorable del negocio? (por ejemplo: cómo nació el nombre, un cliente que marcó un antes y después…)';
  assert.equal(requisitoDePregunta(p), 'historia');
  assert.ok(esNegativa('no'));
  assert.deepEqual(noTieneDelHistorial([{ rol: 'agente', contenido: p }, { rol: 'cliente', contenido: 'no' }]), ['historia']);
});

test('JSON de textos con comillas sin escapar se repara', () => {
  const d = parsearJSONTextos('Aquí va: {"sobre":"Nos encargamos del "100%" del proceso","info":["a","b",]}');
  assert.match(d.sobre, /100%/);
  assert.deepEqual(d.info, ['a', 'b']);
});

// Agencias creativas (24-nov-2026, Intiviso Lab): lista con movimiento, sin subtipo asignado todavía.
import { mapaNuevo, elegirLetras, CON_MOVIMIENTO } from '../src/generador/giros/index.js';
import { porLetra } from '../src/generador/opciones/registro.js';
import { conDescripciones } from '../src/generador/propuestas_html.js';

test('agencia de marketing sin subtipo → variante creativos, con las opciones de movimiento primero', () => {
  const m = mapaNuevo({ negocio: { arquetipo: 'servicios', subtipo: null, giro_texto: 'Marketing Digital y Contenidos' } });
  assert.equal(m.variante, 'creativos');
  assert.ok(m.lista.slice(0, 4).every((l) => CON_MOVIMIENTO.includes(l)));
  assert.equal(mapaNuevo({ negocio: { arquetipo: 'servicios', subtipo: null, giro_texto: 'Despacho de abogados' } }).variante, 'profesionales');
});

test('"espectacular" pone primero las opciones con movimiento de la lista del giro', () => {
  const m = mapaNuevo({ negocio: { arquetipo: 'servicios', subtipo: 'legal' }, marca: { efectos: 'espectacular' } });
  const k = m.lista.findIndex((l) => !CON_MOVIMIENTO.includes(l));
  assert.ok(m.lista.slice(k).every((l) => !CON_MOVIMIENTO.includes(l)));
  assert.equal([...m.lista].sort().join(), [...mapaNuevo({ negocio: { arquetipo: 'servicios', subtipo: 'legal' } }).lista].sort().join());
});

test('las letras excluidas no vuelven a salir, ni de relleno', () => {
  const m = { ...mapaNuevo({ negocio: { arquetipo: 'servicios', subtipo: 'legal' } }), excluir: ['B', 'H', 'E', 'A', 'F'] };
  const r = elegirLetras(m, { brief: { oferta: { items: [] } }, mat: {}, textos: {}, porLetra });
  for (const l of m.excluir) assert.ok(!r.letras.includes(l) && !r.respaldo.includes(l), l);
});

test('descripciones de la IA solo donde el cliente no dio una', () => {
  const b = conDescripciones({ oferta: { items: [{ nombre: 'Estrategia Digital', descripcion_corta: '' }, { nombre: 'Podcast', descripcion_corta: 'La mía' }] } }, { descripciones: { 'estrategia digital': 'Plan de canales y mensajes', Podcast: 'otra' } });
  assert.equal(b.oferta.items[0].descripcion_corta, 'Plan de canales y mensajes');
  assert.equal(b.oferta.items[0].descripcion_generada, true);
  assert.equal(b.oferta.items[1].descripcion_corta, 'La mía');
});

test('A–F suspendidas por omisión: no salen ni de relleno, y se completa con la G en adelante', () => {
  const antes = process.env.OPCIONES_SUSPENDIDAS; delete process.env.OPCIONES_SUSPENDIDAS;
  try {
    for (const negocio of [{ arquetipo: 'oficios', subtipo: null }, { arquetipo: 'clinica', subtipo: 'dental' }, { arquetipo: 'generico' }]) {
      const m = mapaNuevo({ negocio });
      const mat = { hero: { url: 'h' }, trabajos: [{ url: 'a' }, { url: 'b' }, { url: 'c' }, { url: 'd' }], logo: { url: 'l' } };
      const brief = { negocio, oferta: { items: ['x', 'y', 'z'].map((n) => ({ nombre: n, descripcion_corta: 'd' })) } };
      const r = elegirLetras(m, { brief, mat, textos: { sobre: 's' }, porLetra });
      assert.ok(r.letras.every((l) => !'ABCDEF'.includes(l)), `${negocio.arquetipo}: ${r.letras}`);
      assert.ok(r.respaldo.every((l) => !'ABCDEF'.includes(l)));
      assert.ok(r.letras.length >= 4, `${negocio.arquetipo}: ${r.letras}`);
    }
    process.env.OPCIONES_SUSPENDIDAS = 'ninguna';
    const r2 = elegirLetras(mapaNuevo({ negocio: { arquetipo: 'generico' } }), { brief: { oferta: { items: [] } }, mat: {}, textos: {}, porLetra });
    assert.ok(r2.letras.some((l) => 'ABCDEF'.includes(l)));
  } finally { if (antes === undefined) delete process.env.OPCIONES_SUSPENDIDAS; else process.env.OPCIONES_SUSPENDIDAS = antes; }
});

// Plantillas de sitios modelo externos: las reglas duras no les aplican (24-nov-2026).
import { esPlantilla, fallasQueAplican } from '../src/generador/revision_visual.js';

test('plantillas (opcion.modelo): solo las detienen las fallas técnicas; la G (propia) sigue con todas las reglas', () => {
  for (const l of ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']) assert.ok(esPlantilla(l), l);
  assert.equal(esPlantilla('G'), false);
  const p = ['titular de portada chico para computadora: 29px (mínimo 56px)', 'el logo aparece 2 veces en la primera pantalla', 'foto rota: a.jpg', 'desborde horizontal: la página mide 600px', 'texto con poco contraste (2:1, mínimo 3:1): "x"'];
  assert.deepEqual(fallasQueAplican('Q', p), ['foto rota: a.jpg', 'desborde horizontal: la página mide 600px']);
  assert.deepEqual(fallasQueAplican('G', p), p);
});
