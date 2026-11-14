import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginasGenerales, LETRAS } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { fotosRepetidas, validarMaterial } from '../src/generador/validar_material.js';
import { conPisoTexto, fuenteUI } from '../src/generador/tipo_color.js';
import { repartirPorProducto, intercalar, cssFundido, LETRA_Q } from '../src/generador/vitrina.js';

const foto = (n, nombre, extra = {}) => ({ url: `https://x/${n}.jpg`, ancho: 700, alto: 1400, alt: nombre, nombre, tipo: 'foto_producto', clave: `a${n}`, ...extra });
const trabajos = [
  foto(2, 'Guayabera rosa con bordados'), foto(3, 'Guayabera azul', { personas: true }), foto(4, 'Guayabera roja'),
  foto(5, 'Blusa blanca con flores'), foto(6, 'Vestido bordado maya', { personas: true, tipo: 'foto_trabajo' }), foto(7, 'Blusa morada'),
  foto(8, 'Taza de barro'),
];
const usables = [foto(1, 'Portada'), ...trabajos].map((x) => ({ clave: x.clave, tipo: x.tipo, urls: [x.url] }));
const mat = { logo: null, logos_extra: [], hero: foto(1, 'Blusa de portada', { personas: true }), fundador: null, fotos: [], trabajos, equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [], usables };
const oferta = { diferenciador: 'Combinamos ropa regional, hamacas y miel directa del apiario en un solo lugar, con guayaberas a precio de mayoreo.', proceso_pasos: ['Elige\nMira el catálogo', 'Pregunta\nPor WhatsApp'],
  items: [{ nombre: 'Guayaberas', destacado: true, descripcion_corta: 'Para diario' }, { nombre: 'Blusas y vestidos bordados' }, { nombre: 'Hamacas' }, { nombre: 'Miel directa del apiario' }] };
const brief = { negocio: { nombre: 'El Rincón', arquetipo: 'tienda', ciudad: 'Mérida' }, contacto: { whatsapp: '529990000000', direccion: { calle: 'Calle 46', ciudad: 'Mérida' } }, oferta, confianza: { historia_corta: 'Crecimos entre talleres.' } };
const textos = { variantes: Array(17).fill({ titular: 'Tu estilo regional', subtitulo: 'Sub', cta: 'Escríbenos' }), sobre: 'Somos una tienda familiar.', secciones: { trabajo: 'Lo más pedido' } };
const gen = (o = {}) => paginasGenerales({ brief, mat, textos, pares: [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }], urlFuentes: () => '', ...o });

test('la Q sale como decimoséptima, solo cuando se pide', () => {
  assert.equal(LETRAS, 'ABCDEFGHIJKLMNOPQ');
  assert.deepEqual(gen({ solo: 'Q' }).map((p) => [p.letra, p.layout, p.nombre]), [['Q', 'vitrina', 'Vitrina']]);
  assert.equal(gen().some((p) => p.layout === 'vitrina'), false);
});

test('la Q no usa el esqueleto de las demás plantillas: barra, portada, secciones y pie propios', () => {
  const [p] = gen({ solo: 'Q' });
  for (const ajeno of ['class="barra"', 'class="wrap', 'class="btn', 'h-portada', 'sl-img', 'g-car', 'class="paq']) assert.equal(p.html.includes(ajeno), false, ajeno);
  assert.match(p.html, /<body class="l-vitrina">/);
  assert.match(p.html, /class="vq-barra"/);
  assert.match(p.html, /class="vq-hero"/);
  assert.match(p.html, /id="trabajo"/);
  assert.match(p.html, /class="vq-partida" id="cat-1"/);
  assert.match(p.html, /class="vq-partida vq-reves" id="cat-2"/);
  assert.match(p.html, /class="vq-banda"/);
  assert.match(p.html, /<footer class="vq-pie"/);
  assert.equal((p.html.match(/<h1/g) || []).length, 1);
  assert.match(p.html, /family=Jost/);
  assert.doesNotMatch(p.html, /gsap|swiper|jquery|lenis/i);
  assert.equal(p.fuentes.titulos, 'Jost');
});

test('la Q reparte las fotos por producto y muestra en la banda lo que vende sin foto', () => {
  const [p] = gen({ solo: 'Q' });
  const cat1 = p.html.split('id="cat-1"')[1].split('</section>')[0];
  assert.match(cat1, /<h2>Guayaberas<\/h2>/);
  assert.equal(cat1.includes('Blusa morada'), false);
  assert.match(p.html.split('id="cat-2"')[1].split('</section>')[0], /<h2>Blusas y vestidos bordados<\/h2>/);
  assert.match(p.html, /<h2>Hamacas · Miel directa del apiario<\/h2>|<h2>Hamacas y Miel directa del apiario<\/h2>/);
  assert.match(p.html.split('id="trabajo"')[1].split('</section>')[0], /Taza de barro/); // sin producto: va al primer carrusel
});

test('la Q lleva todo el material y no repite fotos fuera de las marcadas', () => {
  const [p] = gen({ solo: 'Q' });
  assert.deepEqual(validarMaterial(p.html, mat), []);
  assert.deepEqual(fotosRepetidas(p.html, mat), []);
});

test('la Q: pie como la referencia (frase completa, mensaje por WhatsApp, acordeones) y menú sin script', () => {
  const [p] = gen({ solo: 'Q' });
  assert.match(p.html, /class="vq-frase">“Combinamos ropa regional, hamacas y miel directa del apiario en un solo lugar\.”/);
  assert.match(p.html, /<form class="vq-msj" action="https:\/\/api\.whatsapp\.com\/send\/"/);
  assert.match(p.html, /name="phone" value="529990000000"/);
  assert.ok((p.html.match(/<details class="vq-acc"/g) || []).length >= 2);
  assert.match(p.html, /\.vq-menu:target/);
  assert.match(p.html, /href="#menu"/);
});

test('la Q respeta el piso de letra y su letra de interfaz es Jost', () => {
  const [p] = gen({ solo: 'Q' });
  const h = conPisoTexto(p.html);
  assert.match(h, /\.vq-cn\{font-size:max\(20px, 20px\)/);
  assert.equal(fuenteUI(LETRA_Q), 'Jost');
});

test('repartirPorProducto, intercalar y fundido de portada', () => {
  const r = repartirPorProducto(trabajos, oferta.items);
  assert.deepEqual(r.grupos.map((g) => [g.item.nombre, g.fotos.length]), [['Guayaberas', 3], ['Blusas y vestidos bordados', 3]]);
  assert.deepEqual(r.sueltas.map((x) => x.nombre), ['Taza de barro']);
  assert.deepEqual(r.sinFoto.map((x) => x.nombre), ['Hamacas', 'Miel directa del apiario']);
  assert.deepEqual(intercalar([[1, 2, 3], ['a']], 3), [1, 'a', 2]);
  assert.equal(cssFundido(1), '');
  assert.match(cssFundido(3), /@keyframes vq-f3\{/);
  assert.doesNotMatch(cssFundido(3), /vq-f3\.\d/);
});

test('con video del cliente la portada usa su video', () => {
  const conVideo = { ...mat, videos: [{ url: 'https://x/v.mp4' }], usables: [...usables, { clave: 'v1', tipo: 'video', urls: ['https://x/v.mp4'] }] };
  const [p] = paginasGenerales({ brief, mat: conVideo, textos, pares: [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk' }], urlFuentes: () => '', solo: 'Q' });
  assert.match(p.html.split('id="trabajo"')[0], /<video class="vq-video" src="https:\/\/x\/v\.mp4" autoplay muted loop playsinline/);
  assert.deepEqual(validarMaterial(p.html, conVideo), []);
});

test('elegir la Q por chat: letra, "la 17" y "decimoséptima"', () => {
  assert.equal(interpretarEleccion('me gusta la Q').elegido, 'Q');
  assert.equal(interpretarEleccion('la 17').elegido, 'Q');
  assert.equal(interpretarEleccion('la decimoséptima').elegido, 'Q');
  assert.equal(interpretarEleccion('q bonito')?.elegido ?? null, null);
});
