// Etapa 3 (restaurantes): orden del giro y página aparte del menú para el QR de las mesas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.RENDER_URL = ''; process.env.PUBLIC_URL = 'https://ejemplo.test';
const { renderPropuestas } = await import('../src/generador/propuestas_html.js');
const { paginaMenu, tieneMenu } = await import('../src/generador/restaurante/pagina_menu.js');

const foto = (n, extra = {}) => ({ url: `https://x.test/${n}.jpg`, ancho: 1200, alto: 900, alt: `Foto ${n}`, tipo: 'foto_producto', clave: `a${n}`, ...extra });
const brief = { negocio: { nombre: 'Café Prueba', arquetipo: 'restaurante', ciudad: 'Mérida' }, contacto: { whatsapp: '5219990000000', horarios: 'Lun a Dom 8 a 22' }, marca: { estilo: 'calido' }, oferta: { promocion_actual: '2x1 en bebidas los martes' }, confianza: { testimonios: [{ nombre: 'Ana', texto: 'Muy rico todo.' }] } };
const mat = () => ({ logo: null, logos_extra: [], colores: ['#7A3E2B'], hero: foto(1, { tipo: 'foto_local' }), fundador: null, fotos: [foto(2, { nombre: 'Latte' }), foto(3, { nombre: 'Frappé' }), foto(4, { nombre: 'Pay' })], trabajos: [], equipo: [], local: [foto(5, { tipo: 'foto_local' })], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [],
  menu_texto: [{ seccion: 'Bebidas', items: [{ nombre: 'Latte', precio: '$55' }, { nombre: 'Frappé', precio: '$70' }] }, { seccion: 'Postres', items: [{ nombre: 'Pay', precio: '$60' }] }] });
const textos = { variantes: Array.from({ length: 6 }, () => ({ titular: 'Café de especialidad', subtitulo: 'En el centro', cta: 'Pide por WhatsApp' })), info: [] };
const ids = (h) => [...h.matchAll(/<section[^>]*\bid="(destacados|menu|resenas|contacto|promocion)"/g)].map((m) => m[1]);

test('con el mapa de restaurante, las 6 opciones siguen el orden único; lo ya generado conserva el suyo', async () => {
  const nuevo = await renderPropuestas(brief, mat(), textos, { mapa: 'nuevo' });
  for (const p of nuevo.paginas) assert.deepEqual(ids(p.html).filter((x) => x !== 'promocion'), ['destacados', 'menu', 'resenas', 'contacto'], p.letra);
  const legado = await renderPropuestas(brief, mat(), textos, {});
  assert.notDeepEqual(legado.paginas.map((p) => ids(p.html).join()), nuevo.paginas.map((p) => ids(p.html).join()));
});

test('página del menú: promoción, menú, botón de WhatsApp y "Lo más pedido", con el mismo diseño', async () => {
  const r = await renderPropuestas(brief, mat(), textos, { mapa: 'nuevo' });
  for (const p of r.paginas) {
    assert.ok(tieneMenu(p.html), p.letra);
    const m = paginaMenu(p.html, { nombre: 'Café Prueba', inicio: '/' });
    assert.deepEqual(ids(m).filter((x) => x !== 'pedir'), ['promocion', 'menu', 'destacados'], p.letra);
    assert.match(m, /Pedir por WhatsApp/);
    assert.match(m, /<title>Menú · Café Prueba<\/title>/);
    assert.equal((m.match(/<h1/g) || []).length, 1);
    assert.ok(m.includes(p.html.match(/:root\{[^}]*\}/)[0]), 'mismos colores');
    assert.match(m, /\$55/);
  }
  assert.equal(paginaMenu('<html><main class="wrap"></main></html>'), null);
});

test('QR y tarjetas de mesa: PNG del QR y PDF carta con las tarjetas', async () => {
  const { pngQR, pngTarjeta, pdfTarjetas, coloresTarjeta } = await import('../src/generador/restaurante/qr_mesa.js');
  const colores = coloresTarjeta({ bg: '#1A1410', fg: '#F6EFE3', primary: '#D4AF37' });
  assert.equal(colores.qr, '#111111', 'el QR siempre oscuro sobre blanco para que lea bien');
  const qr = await pngQR('https://ejemplo.mx/menu', { nombre: 'Café Prueba', color: colores.qr });
  assert.equal(qr.subarray(1, 4).toString(), 'PNG');
  const pdf = await pdfTarjetas(await pngTarjeta({ qr, nombre: 'Café Prueba', url: 'https://ejemplo.mx/menu', colores }));
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
});
