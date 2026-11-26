import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales } from '../../propuestas_general.js';
import { fotosRepetidas, validarMaterial } from '../../validar_material.js';
import { paginaSenal, colorFosforo, letrasSenal, FOSFORO } from './senal.js';
import { CSS_SENAL } from './senal.css.js';
import { porNombre } from '../registro.js';

const LT = porNombre('senal').letra;
const foto = (n, nombre, extra = {}) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: nombre, nombre, tipo: 'foto_trabajo', clave: `a${n}`, ...extra });
const trabajos = [foto(2, 'Sala del sótano'), foto(3, 'Pasillo de los televisores'), foto(4, 'Cuarto de la cinta'), foto(5, 'Laboratorio')];
const usables = [foto(1, 'Portada'), ...trabajos].map((x) => ({ clave: x.clave, tipo: x.tipo, urls: [x.url] }));
const mat = { logo: { url: 'https://x/logo.png', ancho: 200, alto: 200 }, logos_extra: [], hero: foto(1, 'Portada'), fundador: null, fotos: [], trabajos, equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], usables };
const brief = {
  negocio: { nombre: 'Búnker 404', arquetipo: 'servicios', ciudad: 'Mérida', estado: 'Yucatán' },
  contacto: { whatsapp: '529990000000', email: 'hola@bunker404.mx', horarios: 'Jue a dom · 18:00 a 02:00', redes: { instagram: '@bunker404' }, direccion: { calle: 'Calle 60 #404', ciudad: 'Mérida' } },
  oferta: { diferenciador: 'Salas de escape de terror analógico.', proceso_pasos: ['Reserva\nElige sala y horario', 'Entra\nTienes 60 minutos'],
    items: [{ nombre: 'Sala Cinta Maldita', precio_o_rango: '$350', descripcion: 'Una VHS que no deberías ver.' }, { nombre: 'Sala Señal Perdida', precio_o_rango: '$350' }, { nombre: 'Fiestas privadas' }] },
  faq: [{ pregunta: '¿Desde qué edad?', respuesta: 'Desde 14 años.' }],
  confianza: { historia_corta: 'Empezamos grabando cintas en un sótano.', testimonios: [{ autor: 'Ana', texto: 'La mejor sala de Mérida, salimos temblando.' }] },
};
const textos = { variantes: Array(20).fill({ titular: 'Terror del fenómeno analógico', subtitulo: 'Salas de escape', cta: 'Reserva por WhatsApp' }), sobre: 'Empezamos grabando cintas en un sótano.' };
const gen = (o = {}) => paginasGenerales({ brief, mat, textos, pares: [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }], urlFuentes: () => '', ...o });

test('la opción Señal sale solo cuando se pide, con su página propia', () => {
  assert.equal(gen().some((p) => p.layout === 'senal'), false);
  const [p] = gen({ solo: LT });
  assert.equal(p.layout, 'senal');
  assert.match(p.html, /<body class="l-senal">/);
  assert.equal((p.html.match(/<h1/g) || []).length, 1);
  for (const pieza of ['scanline-veil', 'marquee-track', 'grid-veil', 'phosphor-flicker', '[writing-mode:vertical-rl]', 'md:grid-cols-[64px_1.1fr_1.6fr_auto]']) assert.ok(p.html.includes(pieza), pieza);
  assert.equal(p.fuentes.titulos, 'Syne');
  assert.match(p.html, /family=Syne/);
  assert.doesNotMatch(p.html, /gsap|lenis|jquery/i);
});

test('secciones numeradas en orden y solo con material', () => {
  const { html } = paginaSenal({ brief, mat, textos, v: textos.variantes[0], titulos: {}, wa: 'https://wa.me/529990000000', letra: LT });
  const ids = [...html.matchAll(/<section[^>]* id="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['inicio', 'trabajo', 'servicios', 'proceso', 'faq', 'testimonios', 'contacto', 'sobre']);
  assert.match(html, /01 <span class="text-ash">\/ Ahora en pantalla/);
  const sinFaq = paginaSenal({ brief: { ...brief, faq: [], oferta: { ...brief.oferta, proceso_pasos: [] } }, mat, textos, v: textos.variantes[0], titulos: {}, wa: '', letra: LT }).html;
  assert.equal(sinFaq.includes('id="faq"'), false);
  assert.equal(sinFaq.includes('id="proceso"'), false);
  assert.match(sinFaq, /03 <span class="text-ash">\/ Reseñas/);
});

test('titular con la última palabra en fósforo y precio en lugar del año', () => {
  const { html } = paginaSenal({ brief, mat, textos, v: textos.variantes[0], titulos: {}, wa: 'https://wa.me/529990000000', letra: LT });
  assert.match(html, /Terror del fenómeno<br><span class="text-phosphor">analógico<\/span>/);
  assert.match(html, /<span class="text-phosphor">01<\/span><span>\$350<\/span>/);
});

test('lleva todo el material y no repite fotos fuera de las marcadas', () => {
  const [p] = gen({ solo: LT });
  assert.deepEqual(validarMaterial(p.html, mat), []);
  assert.deepEqual(fotosRepetidas(p.html, mat), []);
});

test('color y letra: idénticos al modelo sin elección; los elegidos cuando los hay', () => {
  assert.equal(colorFosforo({}), FOSFORO);
  assert.equal(colorFosforo({ marca: { paleta_elegida: { colores: { marca: '#FF3B30', acento: '#111111' } } } }), '#FF3B30');
  // Un color que no se lee sobre negro no reemplaza al verde.
  assert.equal(colorFosforo({ marca: { paleta_elegida: { colores: { marca: '#1A1A40', acento: '#202020' } } } }), FOSFORO);
  assert.deepEqual(letrasSenal({ marca: { tipografia_elegida: { titulos: 'Archivo Black', cuerpo: 'Inter' } } }).titulos, 'Archivo Black');
  const { html } = paginaSenal({ brief: { ...brief, marca: { paleta_elegida: { colores: { marca: '#FF3B30' } } } }, mat, textos, v: {}, titulos: {}, wa: '', letra: LT });
  assert.match(html, /--ph:#FF3B30;/);
  assert.equal(/00ff41/i.test(CSS_SENAL), false); // el verde solo entra por la variable
});

test('colores a mano (Intiviso): fucsia en lugar del blanco y morado en lugar del verde', () => {
  const b = { ...brief, marca: { colores_opcion: { senal: { estatica: '#E6007E', fosforo: '#5B2A86' } } } };
  const { html } = paginaSenal({ brief: b, mat, textos, v: textos.variantes[0], titulos: {}, wa: 'https://wa.me/529990000000', letra: LT });
  assert.match(html, /--ph:#5B2A86;--ph-ink:#FFFFFF;--st:#E6007E;/);
  assert.equal(/224 224 224/.test(CSS_SENAL), false);
  // Sin colores a mano, idéntica al modelo.
  assert.match(paginaSenal({ brief, mat, textos, v: {}, titulos: {}, wa: '', letra: LT }).html, /--ph:#00FF41;--ph-ink:#050505;--st:#E0E0E0;/);
});

test('las fotos del fundador y del equipo no se repiten en Trabajo (caso Intiviso)', () => {
  const fundador = foto(8, 'Fundador', { tipo: 'foto_fundador' }), otra = foto(9, 'Socia', { tipo: 'foto_fundador' });
  const m2 = { ...mat, fundador, equipo: [otra], fotos: [fundador, otra], usables: [...mat.usables, ...[fundador, otra].map((x) => ({ clave: x.clave, tipo: x.tipo, urls: [x.url] }))] };
  const [p] = gen({ solo: LT, mat: m2 });
  assert.deepEqual(fotosRepetidas(p.html, m2), []);
  assert.deepEqual(validarMaterial(p.html, m2), []);
});

test('ajustes a mano (Intiviso): letra chica al doble, ícono del logo y títulos a dos colores', () => {
  const b = { ...brief, marca: { colores_opcion: { senal: { estatica: '#F0087A', fosforo: '#7B2FD0', letra_chica: 2, titulos_mitad: true, logo_icono: 'https://x/icono.png' } } } };
  const { html } = paginaSenal({ brief: b, mat, textos, v: textos.variantes[0], titulos: {}, wa: 'https://wa.me/529990000000', letra: LT });
  assert.match(html, /--t9:18px;--t10:20px;--t11:22px;--lat:162px;/);
  assert.match(html, /Terror del<br><span class="text-phosphor">fenómeno analógico<\/span>/);
  assert.match(html, /<h2 class="[^"]*">Nuestro <span class="text-phosphor">trabajo<\/span><\/h2>/);
  assert.match(html, /src="https:\/\/x\/icono\.png"/);
  assert.match(html, /src="https:\/\/x\/logo\.png"[^>]*style="height:48px/); // logo completo en el pie
  assert.match(CSS_SENAL, /font-size:var\(--t9,9px\)/);
  // Sin ajustes, idéntica al modelo.
  const igual = paginaSenal({ brief, mat, textos, v: textos.variantes[0], titulos: {}, wa: '', letra: LT }).html;
  assert.doesNotMatch(igual, /--t9:/);
  assert.match(igual, /Terror del fenómeno<br><span class="text-phosphor">analógico<\/span>/);
});
