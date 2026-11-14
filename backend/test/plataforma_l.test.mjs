import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { paginasGenerales } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';
import { efectoParaBrief, EFECTO_POR_GIRO, EFECTOS_L, parPlataforma, JS_PLATAFORMA_L } from '../src/generador/plataforma_l.js';

const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const mat = { logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: 8 }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] };
const textos = { variantes: Array(12).fill({ titular: 'Casas que se sienten tuyas', subtitulo: 'Sub', cta: 'Escríbeme' }), info: ['Compra', 'Vende', 'Renta'], diapositivas: [{ titular: 'Atención directa', apoyo: 'Sin intermediarios' }, { titular: 'Asesoría legal incluida', apoyo: 'Desde la primera visita' }, { titular: 'Trato en tu idioma' }, { titular: 'Proceso claro' }] };
const pares = [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }];
const brief = { negocio: { nombre: 'Norte 21', arquetipo: 'inmobiliaria', giro_texto: 'Bienes raíces', ciudad: 'Mérida' }, contacto: {}, oferta: { proceso_pasos: ['Visita', 'Oferta', 'Firma'] } };
const gen = (o = {}) => paginasGenerales({ brief, mat, textos, pares, urlFuentes: () => '', ...o });

test('la L sale como duodécima, solo cuando se pide', () => {
  assert.deepEqual(gen({ solo: 'L' }).map((p) => [p.letra, p.layout]), [['L', 'plataforma']]);
  assert.equal(gen().some((p) => p.layout === 'plataforma'), false);
  assert.equal(parPlataforma(pares).titulos, 'Instrument Sans');
});

test('la L trae portada centrada, marco con foto real, un solo h1 y ninguna librería externa', () => {
  const [l] = gen({ solo: 'L' });
  assert.match(l.html, /class="hero h-plat/);
  assert.match(l.html, /class="pl-marco"/);
  assert.match(l.html, /https:\/\/x\/1\.jpg/);
  assert.equal((l.html.match(/<h1/g) || []).length, 1);
  assert.doesNotMatch(l.html, /gsap|three(\.min)?\.js|lenis/i);
  assert.match(l.html, /<canvas><\/canvas>/);
});

test('el explorador usa fotos y textos reales y no repite fotos', () => {
  const [l] = gen({ solo: 'L' });
  assert.match(l.html, /id="funciones"/);
  assert.match(l.html, /Asesoría legal incluida/);
  const urls = [...l.html.matchAll(/<img[^>]*class="pl-img[^"]*"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.length >= 3, 'marco + al menos 2 filas');
  assert.equal(new Set(urls).size, urls.length, 'sin fotos repetidas en la portada');
});

test('en el explorador cada texto va con la foto que se eligió para él', () => {
  const t2 = { ...textos, diapositivas: [{ titular: 'Foto cinco', foto_url: 'https://x/5.jpg' }, { titular: 'Foto tres', foto_url: 'https://x/3.jpg' }] };
  const [l] = gen({ solo: 'L', textos: t2 });
  const filas = [...l.html.matchAll(/<div class="pl-fila[^>]*>.*?<b>([^<]+)<\/b>.*?src="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(filas, [['Foto cinco', 'https://x/5.jpg'], ['Foto tres', 'https://x/3.jpg']]);
});

test('el efecto sale del giro y se puede fijar por cliente o por variable de entorno', () => {
  assert.equal(efectoParaBrief(brief, {}), 'distorsion');
  assert.equal(efectoParaBrief({ negocio: { arquetipo: 'clinica' } }, {}), 'luz');
  assert.equal(efectoParaBrief({ negocio: { arquetipo: 'raro' } }, {}), 'puntos');
  assert.equal(efectoParaBrief({ ...brief, marca: { efecto_mouse: 'Tinta' } }, { OPCION_L_EFECTO: 'luz' }), 'tinta');
  assert.equal(efectoParaBrief(brief, { OPCION_L_EFECTO: 'luz' }), 'luz');
  assert.equal(efectoParaBrief({ ...brief, marca: { efecto_mouse: 'fuego' } }, {}), 'distorsion', 'un valor inválido se ignora');
  for (const e of Object.values(EFECTO_POR_GIRO)) assert.ok(EFECTOS_L.includes(e));
});

test('cada efecto queda en el HTML y distorsión sin segunda foto cae a luz', () => {
  for (const e of ['puntos', 'luz', 'tinta']) {
    const [l] = gen({ solo: 'L', brief: { ...brief, marca: { efecto_mouse: e } } });
    assert.match(l.html, new RegExp(`data-efecto="${e}"`));
  }
  const [d] = gen({ solo: 'L', brief: { ...brief, marca: { efecto_mouse: 'distorsion' } } });
  assert.match(d.html, /data-efecto="distorsion"/);
  assert.match(d.html, /class="pl-bg"/);
  const matUna = { ...mat, trabajos: [foto(2)] };
  const [s] = gen({ solo: 'L', mat: matUna, brief: { ...brief, marca: { efecto_mouse: 'distorsion' } } });
  assert.match(s.html, /data-efecto="luz"/);
});

test('el script de la L es JS válido, respeta reducir movimiento y no corre en táctil', () => {
  const js = JS_PLATAFORMA_L.replace(/^<script>/, '').replace(/<\/script>$/, '');
  assert.doesNotThrow(() => new vm.Script(js));
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /hover: none/);
  assert.match(js, /IntersectionObserver/);
});

test('elegir la L por chat', () => {
  assert.equal(interpretarEleccion('me quedo con la L').elegido, 'L');
  assert.equal(interpretarEleccion('la duodécima').elegido, 'L');
  assert.equal(interpretarEleccion('la 12').elegido, 'L');
});
