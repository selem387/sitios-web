import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarSeccion, aplicarContenido, comoSitio, disenoElegido, contenidoActual } from '../src/panel/sitios.js';

const prop = { elegido: 'B', colores_de: null, ronda: 1, textos: { variantes: [{ titular: 'A' }, { titular: 'Tit B', subtitulo: 'Sub B', cta: 'Escríbeme' }], sobre: 'Historia original' },
  opciones: [{ etiqueta: 'A', letra: 'A', paleta: { bg: '#fff' } }, { etiqueta: 'B', letra: 'B', estilo: 'calido', tipografia: { titulos: 'Fraunces', cuerpo: 'Hanken Grotesk' }, paleta: { bg: '#f5efe6', fg: '#222' } }] };
const e = { brief: { negocio: { nombre: 'Luz', giro_texto: 'Fotografía', ciudad: 'Mérida' }, oferta: { items: [{ nombre: 'Retrato', precio_o_rango: '$1' }] }, contacto: { email: 'a@b.com', direccion: { calle: 'C 60', ciudad: 'Mérida' }, redes: { instagram: '@luz' } }, marca: { propuestas: prop } } };

test('limpiarSeccion valida y recorta', () => {
  assert.deepEqual(limpiarSeccion('oferta', { items: [{ nombre: ' X ', precio_o_rango: '$2' }, { nombre: '' }] }).items, [{ nombre: 'X', descripcion_corta: '', precio_o_rango: '$2', destacado: false }]);
  assert.throws(() => limpiarSeccion('contacto', { email: 'malo' }), /correo/);
  assert.throws(() => limpiarSeccion('contacto', { google_maps_url: 'javascript:alert(1)' }), /https/);
  assert.equal(limpiarSeccion('contacto', { whatsapp: '999 123-4567' }).whatsapp, '9991234567');
  assert.deepEqual(limpiarSeccion('redes', { instagram: 'https://instagram.com/luz/', tiktok: '' }), { instagram: 'luz' });
  assert.throws(() => limpiarSeccion('otra', {}));
});

test('contenidoActual parte de la entrevista', () => {
  const c = contenidoActual(e, { contenido: {} });
  assert.equal(c.portada.titular, 'Tit B');
  assert.equal(c.contacto.direccion, 'C 60, Mérida');
  assert.equal(c.historia.texto, 'Historia original');
  assert.deepEqual(c.redes, { instagram: 'luz' });
});

test('aplicarContenido pone lo editado sobre el brief', () => {
  const sv = { contenido: { oferta: { items: [{ nombre: 'Boda' }], mostrar_precios: false }, promocion: { texto: '2x1' }, portada: { titular: 'Nuevo', subtitulo: '' }, historia: { texto: 'Nueva' }, fotos: { portada_asset_id: 7 } } };
  const { brief, textos } = aplicarContenido(e, sv);
  assert.deepEqual(brief.oferta.items, [{ nombre: 'Boda' }]);
  assert.equal(brief.oferta.promocion_actual, '2x1');
  assert.equal(brief.oferta.mostrar_precios, false);
  assert.equal(textos.variantes[1].titular, 'Nuevo');
  assert.equal(textos.variantes[1].subtitulo, 'Sub B'); // vacío no borra
  assert.equal(textos.sobre, 'Nueva');
  assert.equal(brief.fotos.vertical_hero_asset_id, 7);
  assert.equal(brief.contacto.email, 'a@b.com'); // lo no editado se queda
});

test('disenoElegido congela letra, tipografía y paleta', () => {
  const d = disenoElegido(e.brief);
  assert.equal(d.letra, 'B'); assert.equal(d.ronda, 1); assert.equal(d.paleta.bg, '#f5efe6'); assert.equal(d.fuentes.titulos, 'Fraunces');
  const mezcla = disenoElegido({ marca: { propuestas: { ...prop, colores_de: 'A' } } });
  assert.equal(mezcla.paleta.bg, '#fff');
  assert.equal(disenoElegido({ marca: { propuestas: { opciones: [] } } }), null);
});

test('comoSitio quita etiqueta de propuesta y abre a buscadores', () => {
  const h = '<head><meta name="robots" content="noindex"><title>Luz · Propuesta B</title></head><body><footer>© 2026 Luz · Propuesta B: Editorial</footer><span class="etq">Propuesta B</span></body>';
  const s = comoSitio(h, e.brief, { letra: 'B', dominio: 'luz.mx' });
  assert.ok(!s.includes('noindex') && s.includes('canonical') && !s.includes('Propuesta'));
  assert.ok(s.includes('<title>Luz · Fotografía en Mérida</title>'));
  assert.ok(comoSitio(h, e.brief, { letra: 'B' }).includes('noindex'));
});
