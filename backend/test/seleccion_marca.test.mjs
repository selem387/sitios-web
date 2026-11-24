// Paleta y letra al inicio de la entrevista (24-nov-2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opcionesPaleta, opcionesFuente, leerRespuesta, conTipografia, htmlPaletas, htmlFuentes } from '../src/generador/seleccion_marca.js';
import { atenderSeleccion, seleccionAplica } from '../src/entrevista/seleccion.js';

const brief = { negocio: { nombre: 'Intiviso Lab', giro_texto: 'agencia de marketing', arquetipo: 'servicios' }, marca: {} };
const deps = { imagen: async () => 'https://render/files/x.png', coloresLogo: async () => ['#E4572E', '#29335C'] };

test('paletas: con logo la A son sus colores, 4 del giro, la siguiente letra es el diseñador; "más" no repite', () => {
  const p = opcionesPaleta({ brief, coloresLogo: ['#E4572E'] });
  assert.equal(p.opciones[0].origen, 'logo');
  assert.equal(p.opciones.length, 5);
  assert.equal(p.disenador, 'F');
  assert.equal(p.recomendada, 'B');
  const p2 = opcionesPaleta({ brief, ronda: 1, mostradas: p.opciones.map((o) => o.id) });
  assert.equal(p2.opciones.length, 4);
  assert.ok(p2.opciones.every((o) => !p.opciones.some((x) => x.id === o.id)));
  assert.match(htmlPaletas({ ...p, negocio: 'Intiviso Lab' }), /Que lo decida el diseñador/);
});

test('letras: 4 parejas con recomendación y diseñador', () => {
  const f = opcionesFuente({ brief, paleta: { colores: { marca: '#1F4E79', acento: '#2E8B57', fondo: '#F5F7F8', texto: '#13263A' } } });
  assert.equal(f.opciones.length, 4);
  assert.equal(f.disenador, 'E');
  assert.match(htmlFuentes({ ...f, negocio: 'Intiviso Lab' }), /fonts\.googleapis\.com/);
});

test('respuestas: letra, más, diseñador, recomendada', () => {
  const o = { letras: ['A', 'B', 'C', 'D', 'E'], disenador: 'F' };
  assert.deepEqual(leerRespuesta('la b', o), { tipo: 'letra', letra: 'B' });
  assert.deepEqual(leerRespuesta('Me gusta la C', o), { tipo: 'letra', letra: 'C' });
  assert.deepEqual(leerRespuesta('F', o), { tipo: 'disenador' });
  assert.deepEqual(leerRespuesta('ver más opciones', o), { tipo: 'mas' });
  assert.deepEqual(leerRespuesta('que decida el diseñador', o), { tipo: 'disenador' });
  assert.deepEqual(leerRespuesta('la que recomiendes', o), { tipo: 'recomendada' });
  assert.deepEqual(leerRespuesta('a mí me gusta el azul', o), { tipo: 'otro' });
});

test('conTipografia: cuerpo a la de textos, títulos a la de títulos, respeta monoespaciadas', () => {
  const h = '<html><head><style>body{font-family:"Google Sans Flex",system-ui,sans-serif}h1{font-family:"Fraunces",serif}.m{font-family:"JetBrains Mono",monospace}</style></head><body></body></html>';
  const out = conTipografia(h, { titulos: 'Young Serif', cuerpo: 'Instrument Sans' });
  assert.match(out, /body\{font-family:'Instrument Sans'/);
  assert.match(out, /h1\{font-family:'Young Serif'/);
  assert.match(out, /JetBrains Mono/);
  assert.match(out, /id="letra-cliente"/);
});

test('flujo: logo → paletas → letras → listo', async () => {
  assert.equal(seleccionAplica(brief), true);
  let r = await atenderSeleccion({ brief, assets: [], inicio: true }, deps);
  assert.equal(r.brief.marca.seleccion.paso, 'logo');
  r = await atenderSeleccion({ brief: r.brief, assets: [], nuevosAssets: [{ clave: 'a3', tipo: 'foto_otro', url: 'https://x/logo.png' }] }, deps);
  assert.deepEqual(r.assetsPatch, [{ clave: 'a3', tipo: 'logo' }]);
  assert.equal(r.brief.marca.seleccion.paso, 'paleta');
  assert.equal(r.media.length, 1);
  assert.equal(r.brief.marca.seleccion.paletas.opciones[0].origen, 'logo');
  r = await atenderSeleccion({ brief: r.brief, assets: [{ tipo: 'logo' }], texto: 'más' }, deps);
  assert.equal(r.brief.marca.seleccion.paso, 'paleta');
  r = await atenderSeleccion({ brief: r.brief, assets: [{ tipo: 'logo' }], texto: 'la B' }, deps);
  assert.ok(r.brief.marca.paleta_elegida.colores.marca);
  assert.equal(r.brief.marca.seleccion.paso, 'fuente');
  r = await atenderSeleccion({ brief: r.brief, assets: [{ tipo: 'logo' }], texto: 'A' }, deps);
  assert.equal(r.terminado, true);
  assert.ok(r.brief.marca.tipografia_elegida.titulos);
  assert.ok(r.brief.marca.estilo);
  assert.equal(seleccionAplica(r.brief), false);
});

test('flujo: sin logo pasa directo a paletas; quien ya tiene propuestas no entra', async () => {
  const r = await atenderSeleccion({ brief: { ...brief, marca: { tiene_logo: false } }, assets: [], inicio: true }, deps);
  assert.equal(r.brief.marca.seleccion.paso, 'paleta');
  assert.equal(r.brief.marca.seleccion.paletas.opciones[0].origen, 'giro');
  assert.equal(seleccionAplica({ ...brief, marca: { propuestas: { estado: 'enviada' } } }), false);
});
