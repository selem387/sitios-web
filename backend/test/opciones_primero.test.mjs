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
