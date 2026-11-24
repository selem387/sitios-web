// Estas pruebas cubren la elección con A–F disponibles; la suspensión de A–F se prueba en opciones_primero.test.mjs.
process.env.OPCIONES_SUSPENDIDAS = 'ninguna';
// Elementos ilustrativos (etapa 2, parte 3): con poco material salen las primeras 6 de la lista del giro y lo que falta
// se llena con fotos marcadas, ejemplos sin precio y logo con letras; nunca desplazan material del cliente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.RENDER_URL = ''; process.env.PUBLIC_URL = 'https://ejemplo.test';
const { necesidades, ejemplosDe, aplicarRelleno, construirRelleno, conCredito, svgMarca, MARCA_EJEMPLO, terminosBusqueda } = await import('../src/generador/ilustrativas.js');
const { mapaNuevo } = await import('../src/generador/giros/index.js');
const { porLetra } = await import('../src/generador/opciones/registro.js');
const { renderPropuestas } = await import('../src/generador/propuestas_html.js');

const foto = (n, extra = {}) => ({ url: `https://x.test/${n}.jpg`, ancho: 1400, alto: 900, alt: `Foto ${n}`, nombre: `Trabajo ${n}`, tipo: 'foto_trabajo', clave: `a${n}`, ...extra });
const matPobre = () => ({ logo: null, logos_extra: [], colores: ['#1F4E79'], hero: null, fundador: null, fotos: [], trabajos: [foto(2)], equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] });
const brief = (arquetipo, subtipo, items = []) => ({ negocio: { nombre: 'Clínica Sonrisa Norte', arquetipo, subtipo, giro_texto: 'Clínica dental', ciudad: 'Mérida' }, contacto: { whatsapp: '5219990000000' }, marca: { estilo: 'moderno' }, oferta: { items } });
let n = 0;
const deps = {
  buscar: async (q) => Array.from({ length: 6 }, (_, k) => ({ id: `${q}-${k}`, url: `https://pixabay.test/${k}.jpg`, ancho: 1600, alto: 1000 })),
  descargarConMarca: async (h) => ({ url: `https://ejemplo.test/chat/archivos/ilus-${++n}.jpg`, ancho: 1600, alto: 1000, pixabay: h.id }),
  logoLetras: async () => ({ url: 'https://ejemplo.test/chat/archivos/letras-1.png', ancho: 600, alto: 600 }),
};

test('necesidades: foto principal, fotos de trabajo, servicios y logo según las opciones', () => {
  const n0 = necesidades(['C', 'D', 'L'].map(porLetra), { brief: brief('clinica', 'dental'), mat: matPobre() });
  assert.equal(n0.fotos, 2); // C pide 3 fotos de trabajo; tiene 1
  assert.equal(n0.servicios, 3);
  assert.equal(n0.logoLetras, true);
  const conHero = necesidades(['A'].map(porLetra), { brief: brief('clinica', 'dental'), mat: matPobre() });
  assert.equal(conHero.hero, true);
});

test('ejemplos: marcados y sin precio; para la O en grupos distintos a los del cliente', () => {
  const e = ejemplosDe(brief('tienda'), { productos: 4 });
  assert.equal(e.length, 4);
  assert.ok(e.every((x) => x.nombre.includes(MARCA_EJEMPLO) && x.precio_o_rango === '' && x.ejemplo));
  const g = ejemplosDe(brief('servicios', 'legal', [{ nombre: 'Divorcio', grupo: 'Familia' }]), { grupos: 1 });
  assert.ok(g.every((x) => x.grupo && x.grupo !== 'Familia'));
});

test('aplicarRelleno: solo llena lo que sigue faltando (si el cliente manda fotos, sobran las ilustrativas)', () => {
  const relleno = { necesita: { fotosObjetivo: 3 }, hero: foto(90, { ilustrativa: true }), fotos: [foto(91, { ilustrativa: true }), foto(92, { ilustrativa: true })], items: [], logoLetras: null };
  const a = aplicarRelleno(brief('clinica'), matPobre(), relleno);
  assert.equal(a.mat.trabajos.length, 3);
  assert.equal(a.mat.trabajos[0].url, 'https://x.test/2.jpg', 'la foto del cliente va primero');
  assert.equal(a.mat.hero.url, 'https://x.test/90.jpg');
  const conFotos = { ...matPobre(), hero: foto(1), trabajos: [foto(2), foto(3), foto(4)] };
  const b = aplicarRelleno(brief('clinica'), conFotos, relleno);
  assert.equal(b.mat.trabajos.length, 3);
  assert.ok(!b.mat.trabajos.some((x) => x.ilustrativa));
  assert.equal(b.mat.hero.url, 'https://x.test/1.jpg');
});

test('marca de agua y crédito', () => {
  assert.match(svgMarca(1600, 1000), /Imagen ilustrativa/);
  assert.match(conCredito('<footer>x</footer>'), /^<footer>x/);
  assert.match(conCredito('<img src="https://e.test/chat/archivos/ilus-1.jpg"><footer>x</footer>'), /Pixabay<\/p><\/footer>/);
});

test('búsqueda: términos del subtipo primero y los servicios del cliente al final', () => {
  const t = terminosBusqueda(brief('clinica', 'dental', [{ nombre: 'Blanqueamiento' }]));
  assert.equal(t[0], 'consultorio dental');
  assert.equal(t.at(-1), 'Blanqueamiento');
});

test('propuestas desde cero con poco material: las primeras 6 de la lista del giro, con relleno marcado', async () => {
  const antes = process.env.PIXABAY_API_KEY; process.env.PIXABAY_API_KEY = 'prueba';
  try {
    const b = brief('inmobiliaria', null); // lista C, A, G, M, O, K: G pide 4 fotos de trabajo, O 2 grupos
    const textos = { variantes: Array.from({ length: 18 }, () => ({ titular: 'Sonrisas sanas', subtitulo: 'Atención cercana', cta: 'Agenda' })), info: ['Mérida'] };
    const r = await renderPropuestas(b, matPobre(), textos, { mapa: 'nuevo', depsIlustrativas: deps });
    const lista = mapaNuevo(b).lista.slice(0, 6);
    assert.deepEqual(r.paginas.map((p) => p.letra), lista);
    assert.ok(r.relleno?.hero && r.relleno.fotos.length === 3);
    assert.ok(r.relleno.items.length >= 2, 'la O pide 2 grupos');
    const html = r.paginas.map((p) => p.html).join('\n');
    assert.match(html, /\/ilus-\d+\.jpg/);
    assert.match(html, /Pixabay/);
    assert.ok(html.includes(MARCA_EJEMPLO));
    assert.ok(html.includes('https://x.test/2.jpg'), 'la foto del cliente sigue');
    // Cambios posteriores: se reaplica el relleno guardado sin buscar de nuevo.
    const b2 = { ...b, marca: { ...b.marca, propuestas: { relleno: r.relleno, mapa: r.mapa } } };
    const r2 = await renderPropuestas(b2, matPobre(), textos, { depsIlustrativas: { ...deps, buscar: async () => { throw new Error('no debe buscar'); } } });
    assert.ok(r2.paginas.map((p) => p.html).join('').includes('/ilus-'));
  } finally { if (antes === undefined) delete process.env.PIXABAY_API_KEY; else process.env.PIXABAY_API_KEY = antes; }
});

test('sin llave de Pixabay todo sigue como antes (sin relleno)', async () => {
  const antes = process.env.PIXABAY_API_KEY; delete process.env.PIXABAY_API_KEY;
  try {
    const r = await construirRelleno([], { brief: brief('clinica'), mat: matPobre() }, deps);
    assert.equal(r, null);
  } finally { if (antes !== undefined) process.env.PIXABAY_API_KEY = antes; }
});

test('en el slider las fotos ilustrativas van sin texto', async () => {
  const { emparejarFotos } = await import('../src/generador/movimiento.js');
  const hero = foto(1), il = foto(50, { ilustrativa: true, nombre: '' });
  const r = emparejarFotos({ hero, pool: [il], diapos: [{ tipo: 'diferenciador', titular: 'Casas en privadas residenciales', apoyo: '' }], items: [{ nombre: 'Trabajo 50' }] });
  const k = r.fotos.findIndex((x) => x.url === il.url);
  assert.ok(k > 0);
  assert.equal(r.diapos[k - 1].sin_texto, true);
});

test('restaurante sin material: portada, "Lo más pedido" y menú de ejemplo, marcados; orden del giro', async () => {
  const antes = process.env.PIXABAY_API_KEY; process.env.PIXABAY_API_KEY = 'prueba';
  try {
    const b = { negocio: { nombre: 'La Cocina de Prueba', arquetipo: 'restaurante', ciudad: 'Mérida' }, contacto: { whatsapp: '5219990000000' }, marca: { estilo: 'calido' }, oferta: {} };
    const mat = { ...matPobre(), trabajos: [], menu_texto: [], menus: [] };
    const textos = { variantes: Array.from({ length: 6 }, () => ({ titular: 'Comida casera', subtitulo: 'Hecha al momento', cta: 'Pide por WhatsApp' })), info: [] };
    const r = await renderPropuestas(b, mat, textos, { mapa: 'nuevo', depsIlustrativas: deps });
    assert.equal(r.mapa.giro, 'restaurante');
    assert.deepEqual(r.paginas.map((p) => p.letra), ['A', 'B', 'C', 'D', 'E', 'F']);
    assert.ok(r.relleno?.hero && r.relleno.fotosProducto.length === 3 && r.relleno.items.length === 5);
    for (const p of r.paginas) {
      assert.match(p.html, /\/ilus-\d+\.jpg/);
      assert.ok(p.html.includes(MARCA_EJEMPLO), `${p.letra} sin platillos de ejemplo`);
      assert.match(p.html, /Pixabay/);
      const ids = [...p.html.matchAll(/<section[^>]*\bid="(destacados|menu|resenas|contacto)"/g)].map((m) => m[1]);
      assert.deepEqual(ids, ids.slice().sort((x, y) => ['destacados', 'menu', 'resenas', 'contacto'].indexOf(x) - ['destacados', 'menu', 'resenas', 'contacto'].indexOf(y)), `${p.letra}: ${ids}`);
    }
  } finally { if (antes === undefined) delete process.env.PIXABAY_API_KEY; else process.env.PIXABAY_API_KEY = antes; }
});
