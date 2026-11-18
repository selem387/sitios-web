// Opción S "Tu página de referencia": cualquier plano (aunque venga incompleto o con valores raros) arma una página
// completa con los datos del cliente, sin dejar fuera secciones con material.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlano, paginaReferencia, paletaPlano, PORTADAS, BLOQUES } from './referencia.js';
import { wcag } from '../../tipo_color.js';

const f = (n) => ({ url: `https://x.test/${n}.jpg`, ancho: 1400, alto: 900, alt: `Foto ${n}`, tipo: 'foto_trabajo' });
const brief = { negocio: { nombre: 'Casa Norte' }, contacto: { whatsapp: '5219991234567', email: 'a@b.mx' }, confianza: { historia_corta: 'Desde 2012.', testimonios: [{ nombre: 'Laura', texto: 'Excelente servicio.' }] }, oferta: { proceso_pasos: ['Uno', 'Dos', 'Tres'], items: [{ nombre: 'Compra', descripcion_corta: 'Te ayudamos.' }, { nombre: 'Venta', precio_o_rango: '$1,000' }] }, faq: [{ pregunta: '¿Cobran?', respuesta: 'No.' }] };
const mat = { logo: null, colores: ['#C0392B'], hero: f(1), fundador: null, trabajos: [f(2), f(3), f(4)], local: [], otras: [] };
const ids = (html) => [...html.matchAll(/<section[^>]*\bid="([a-z]+)"/g)].map((m) => m[1]);

test('un plano vacío o con basura se normaliza sin fallar', () => {
  const p = normalizarPlano({ estilo: { colores: { fondo: 'rojo' }, par: 999 }, portada: { tipo: 'x' }, secciones: [{ tipo: 'nada' }, null, { tipo: 'servicios', estilo: 'raro' }] });
  assert.equal(p.portada.tipo, 'dividida');
  assert.equal(p.estilo.colores.fondo, '#FAF8F5');
  assert.deepEqual(p.secciones.map((s) => [s.tipo, s.estilo]), [['servicios', 'tarjetas']]);
});

test('todas las portadas y estilos de bloque arman la página con todas las secciones con material', () => {
  for (const tipo of PORTADAS) for (const [bloque, estilos] of Object.entries(BLOQUES)) for (const estilo of estilos) {
    const r = paginaReferencia({ plano: { portada: { tipo }, secciones: [{ tipo: bloque, estilo }] }, brief, mat, v: { titular: 'Hola', cta: 'Escríbenos' }, titulos: {}, wa: ' href="https://wa.me/1"' });
    const s = ids(r.html);
    for (const id of ['inicio', 'servicios', 'trabajo', 'sobre', 'resenas', 'proceso', 'faq', 'contacto']) assert.ok(s.includes(id), `${tipo}/${bloque}/${estilo}: falta ${id}`);
    assert.equal((r.html.match(/<h1/g) || []).length, 1);
    assert.equal(s.at(-1), 'contacto');
  }
});

test('colores: los de la referencia con el acento acomodado al logo, siempre legibles', () => {
  const plano = normalizarPlano({ estilo: { colores: { fondo: '#111111', texto: '#333333', acento: '#D4AF37' } } });
  const p = paletaPlano(plano, ['#1F4E79']);
  assert.equal(p.fondo, '#111111');
  assert.ok(wcag(p.texto, p.fondo) >= 4.5, 'el texto se ajusta para leerse');
  assert.ok(wcag(p.sobreAcento, p.acento) >= 4.5);
  const sinLogo = paletaPlano(plano, []);
  assert.notEqual(sinLogo.acento, p.acento, 'con logo el acento toma su tono');
});

test('nunca carga nada de la página original: solo fuentes y fotos del cliente', () => {
  const r = paginaReferencia({ plano: {}, brief, mat, v: { titular: 'Hola' }, titulos: {}, wa: '' });
  const urls = [...r.html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.every((u) => /^https:\/\/(x\.test|fonts\.googleapis\.com|fonts\.gstatic\.com|wa\.me|instagram\.com|facebook\.com)/.test(u)), urls.join(' '));
});
