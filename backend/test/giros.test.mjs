import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GIROS, SECCIONES, LEGADO, esLegado, varianteDe, mapaNuevo, resolverMapa, ordenarPiezas, elegirLetras, comoSeccion } from '../src/generador/giros/index.js';
import { porLetra } from '../src/generador/opciones/registro.js';

test('cada mapa por giro es válido', () => {
  for (const g of Object.values(GIROS)) {
    assert.ok(g.variantes[g.porOmision], `${g.id}: variante por omisión`);
    for (const [id, v] of Object.entries(g.variantes)) {
      const n = `${g.id}/${id}`;
      assert.deepEqual(v.orden.filter((s) => !SECCIONES.includes(s)), [], `${n}: secciones desconocidas`);
      assert.equal(new Set(v.orden).size, v.orden.length, `${n}: sección repetida`);
      assert.equal(v.orden.at(-1), 'contacto', `${n}: contacto va al final`);
      assert.deepEqual(Object.keys(v.nombres).filter((k) => !v.orden.includes(k)), [], `${n}: nombre de una sección que no está en el orden`);
      assert.ok(v.lista.length >= 6, `${n}: la lista necesita al menos 6 opciones`);
      assert.equal(new Set(v.lista).size, v.lista.length, `${n}: opción repetida en la lista`);
      assert.deepEqual(v.lista.filter((l) => !porLetra(l)), [], `${n}: letras sin opción`);
    }
  }
});

test('cada subtipo de la base cae en su variante y sin giro es genérico; restaurante no tiene mapa todavía', () => {
  const casos = { dental: 'clinica/resultados', estetica_spa: 'clinica/resultados', medica: 'clinica/espacio', veterinaria: 'clinica/espacio', legal: 'servicios/profesionales', contador_consultor: 'servicios/profesionales', agencia_marketing: 'servicios/profesionales', fotografia: 'servicios/visual', arquitectura_construccion: 'servicios/proyectos', hotel: 'turismo/hotel', tours: 'turismo/tours' };
  const arq = { dental: 'clinica', estetica_spa: 'clinica', medica: 'clinica', veterinaria: 'clinica', legal: 'servicios', contador_consultor: 'servicios', agencia_marketing: 'servicios', fotografia: 'servicios', arquitectura_construccion: 'servicios', hotel: 'turismo', tours: 'turismo' };
  for (const [sub, esperado] of Object.entries(casos)) { const v = varianteDe({ arquetipo: arq[sub], subtipo: sub }); assert.equal(`${v.giro}/${v.variante}`, esperado, sub); }
  assert.equal(varianteDe({}).giro, 'generico');
  assert.equal(varianteDe({ arquetipo: 'tienda', subtipo: 'floreria' }).giro, 'tienda');
  assert.equal(varianteDe({ arquetipo: 'restaurante' }), null);
  assert.ok(esLegado(resolverMapa({ negocio: { arquetipo: 'restaurante' } }, 'nuevo')));
});

test('las propuestas de antes de la etapa 2 se arman con el mapa legado; las nuevas guardan el suyo', () => {
  assert.ok(esLegado(resolverMapa({})));
  assert.ok(esLegado(resolverMapa({ marca: { propuestas: { opciones: [{ letra: 'A' }] } } })));
  const m = mapaNuevo({ negocio: { arquetipo: 'inmobiliaria' } });
  assert.equal(m.version, 'giros-1');
  assert.deepEqual(resolverMapa({ marca: { propuestas: { mapa: m } } }), m);
  assert.deepEqual(resolverMapa({ marca: { propuestas: { mapa: m } } }, 'nuevo').orden, m.orden);
});

test('el mapa ordena las secciones y cada pieza propia viaja con la sección que la precede', () => {
  const s = (id) => comoSeccion(id, () => id);
  const propia = (n) => () => n;
  const piezas = [propia('intro'), s('sobre'), propia('tras-sobre'), s('trabajo'), s('servicios'), propia('tras-servicios'), s('contacto')];
  const mapa = { version: 'giros-1', orden: ['servicios', 'trabajo', 'sobre', 'contacto'] };
  assert.deepEqual(ordenarPiezas(piezas, mapa).map((f) => f()), ['intro', 'servicios', 'tras-servicios', 'trabajo', 'sobre', 'tras-sobre', 'contacto']);
  assert.equal(ordenarPiezas(piezas, LEGADO), piezas);
});

test('las 6 opciones salen de la lista del giro según el material del cliente', () => {
  const mapa = mapaNuevo({ negocio: { arquetipo: 'inmobiliaria' } }); // C, A, G, M, O, K, B, E, D
  const foto = (k) => ({ url: `https://x.test/${k}.jpg` });
  const rico = { hero: foto(0), trabajos: Array.from({ length: 8 }, (_, k) => foto(k + 1)), logo: foto(99), local: [], equipo: [], resenas: [], videos: [] };
  const items = [{ grupo: 'Venta', nombre: 'Casa', descripcion_corta: 'x', precio_o_rango: '$1' }, { grupo: 'Renta', nombre: 'Local', descripcion_corta: 'y' }];
  const r1 = elegirLetras(mapa, { brief: { oferta: { items } }, mat: rico, textos: {}, porLetra });
  assert.deepEqual(r1.letras, ['C', 'A', 'G', 'M', 'O', 'K']);
  // Con 1 foto de trabajo y sin grupos: se saltan el mosaico, el collage y el catálogo, y entran las siguientes.
  const pobre = { ...rico, trabajos: [foto(1)] };
  const r2 = elegirLetras(mapa, { brief: { oferta: { items: [] } }, mat: pobre, textos: {}, porLetra });
  assert.deepEqual(r2.letras, ['A', 'K', 'B', 'E', 'D', 'F']);
  assert.ok(r2.respaldo.includes('C'));
});
