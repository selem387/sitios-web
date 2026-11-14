import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { paginasGenerales } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { validarMaterial, fotosRepetidas } from '../src/generador/validar_material.js';
import { efectoParaBrief, EFECTO_POR_GIRO, EFECTOS_L, JS_PLATAFORMA, paletaPlataforma } from '../src/generador/plataforma_l.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const mat = { logo: { url: 'https://x/logo.png', ancho: 400, alto: 400 }, logos_extra: [], hero: foto(1), fundador: { ...foto(99), tipo: 'foto_fundador' }, fotos: [], trabajos: Array.from({ length: 9 }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] };
const textos = { variantes: Array(16).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Te acompañamos de la visita a la firma.', cta: 'Agenda tu visita' }), info: ['Mérida', 'Sin comisión al comprador'], sobre: 'Somos un equipo local.\n\nMás texto.', diapositivas: [{ titular: 'Foto cinco', foto_url: 'https://x/5.jpg' }, { titular: 'Foto tres', apoyo: 'Apoyo tres', foto_url: 'https://x/3.jpg' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: { whatsapp: '9991234567', horario: 'Lunes a viernes de 9 a 6' }, oferta: { items: [{ grupo: 'Venta', nombre: 'Casa', precio_o_rango: '$2,500,000' }, { grupo: 'Renta', nombre: 'Depa', precio_o_rango: '$12,000', descripcion_corta: 'Amueblado.\n- 2 recámaras\n- Alberca' }] } };
const gen = (o = {}) => paginasGenerales({ brief, mat, textos, pares, urlFuentes: () => '', ...o });

test('la L es la duodécima, solo cuando se pide, y es una página propia', () => {
  assert.deepEqual(gen({ solo: 'L' }).map((p) => [p.letra, p.layout]), [['L', 'plataforma']]);
  assert.equal(gen().some((p) => p.layout === 'plataforma'), false);
  const [l] = gen({ solo: 'L' });
  assert.match(l.html, /<body class="l-plataforma">/);
  assert.doesNotMatch(l.html, /class="hero h-|class="sec" id="servicios"|gsap|three/i, 'no usa la plantilla general ni librerías');
  assert.equal(l.fuentes.titulos, 'Google Sans Flex');
});

test('secciones del modelo: barra con aviso, portada, marco, frase, explorador, casos, dos columnas, paquetes, contacto, bloque final y pie', () => {
  const [l] = gen({ solo: 'L' });
  for (const cls of ['ag-barra', 'ag-aviso', 'ag-hero', 'ag-marco', 'ag-arco', 'ag-frase', 'ag-expl', 'ag-casos', 'ag-dos', 'ag-paq', 'ag-cont', 'ag-final', 'ag-gigante']) assert.match(l.html, new RegExp(`class="${cls}[" ]`), cls);
  assert.equal((l.html.match(/<h1/g) || []).length, 1);
});

test('todo el material aparece una sola vez y cada texto del explorador va con su foto', () => {
  const [l] = gen({ solo: 'L' });
  const usables = [mat.hero, ...mat.trabajos, mat.fundador].map((x) => ({ clave: x.clave, tipo: x.tipo, urls: [x.url] }));
  assert.deepEqual(validarMaterial(l.html, { ...mat, usables }), []);
  assert.deepEqual(fotosRepetidas(l.html, mat), []);
  const filas = [...l.html.matchAll(/<div class="ag-fila">.*?<h3>([^<]+)<\/h3>.*?src="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(filas, [['Foto cinco', 'https://x/5.jpg'], ['Foto tres', 'https://x/3.jpg']]);
});

test('paquetes con precio y liga a WhatsApp con el nombre del paquete', () => {
  const [l] = gen({ solo: 'L' });
  assert.match(l.html, /\$2,500,000/);
  assert.match(l.html, /<li>2 recámaras<\/li>/);
  assert.match(l.html, /wa\.me\/[^"]*text=Hola%2C\+quiero\+informaci%C3%B3n\+de%3A\+Depa/);
  assert.match(l.html, /Desde \$12,000/);
});

test('el efecto sale del giro y se puede fijar por cliente o por variable de entorno', () => {
  assert.equal(efectoParaBrief(brief, {}), 'distorsion');
  assert.equal(efectoParaBrief({ negocio: { arquetipo: 'clinica' } }, {}), 'luz');
  assert.equal(efectoParaBrief({ negocio: {} }, {}), 'puntos');
  assert.equal(efectoParaBrief({ ...brief, marca: { efecto_mouse: 'Tinta' } }, { OPCION_L_EFECTO: 'luz' }), 'tinta');
  assert.equal(efectoParaBrief(brief, { OPCION_L_EFECTO: 'luz' }), 'luz');
  for (const e of Object.values(EFECTO_POR_GIRO)) assert.ok(EFECTOS_L.includes(e));
  const [d] = gen({ solo: 'L' });
  assert.match(d.html, /data-ag-fx="distorsion"/);
  const [s] = gen({ solo: 'L', mat: { ...mat, hero: null, trabajos: [] } });
  assert.match(s.html, /data-ag-fx="luz"/, 'distorsión sin foto cae a luz');
});

test('el script es JS válido y respeta reducir movimiento y pantallas táctiles', () => {
  const js = JS_PLATAFORMA.replace(/^<script>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => new vm.Script(js));
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /hover: none/);
});

test('paleta: tinta casi negra y color de marca con contraste para texto', () => {
  const p = paletaPlataforma(['#F2D5C4', '#C48E7C']);
  assert.equal(p.bg, '#FFFFFF');
  assert.match(p.fg, /^#1[0-9a-f]{5}$/i);
});

test('elegir la L por chat', () => {
  assert.equal(interpretarEleccion('me quedo con la L').elegido, 'L');
  assert.equal(interpretarEleccion('la duodécima').elegido, 'L');
  assert.equal(interpretarEleccion('la 12').elegido, 'L');
});
