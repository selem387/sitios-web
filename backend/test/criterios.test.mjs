// Criterios que debe cumplir toda opción (etapa 2, parte 4; aprobados por Sebastián el 16 y 18-nov-2026).
// La guía está en backend/src/generador/opciones/LEEME.md. Cada prueba dice qué criterio vigila.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.RENDER_URL = ''; process.env.PUBLIC_URL = 'https://ejemplo.test';
const { OPCIONES, porLetra } = await import('../src/generador/opciones/registro.js');
const { GIROS, SECCIONES, mapaNuevo, elegirLetras } = await import('../src/generador/giros/index.js');
const { RELLENABLES } = await import('../src/generador/ilustrativas.js');
const { renderPropuestas } = await import('../src/generador/propuestas_html.js');

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'generador', 'opciones');
const CLAVES = ['fotosTrabajo', 'fotoBuena', 'fotosTotal', 'logo', 'servicios', 'grupos', 'productos', 'producto', 'secciones'];
const paginaPropia = (o) => !!(o.pagina || o.completa || o.plantilla?.paginaCompleta);

const foto = (n, w = 1400, h = 900, tipo = 'foto_trabajo') => ({ url: `https://x.test/${n}.jpg`, ancho: w, alto: h, alt: `Foto ${n}`, nombre: `Trabajo ${n}`, tipo, clave: `a${n}` });
const matRico = () => ({ logo: null, logos_extra: [], colores: ['#1F4E79', '#C8A15A'], hero: foto(1, 1600, 1000), fundador: foto(90, 900, 1200, 'foto_fundador'), fotos: [], trabajos: Array.from({ length: 8 }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] });
const matPobre = () => ({ logo: null, logos_extra: [], colores: ['#7A3E2B'], hero: null, fundador: null, fotos: [], trabajos: [], equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] });
const briefDe = (arquetipo, subtipo, rico) => ({
  negocio: { nombre: 'Norte 21', arquetipo, subtipo, giro_texto: 'Negocio de prueba', ciudad: 'Mérida' },
  contacto: { whatsapp: '5219990000000', email: 'hola@ejemplo.test' },
  marca: { estilo: 'moderno' },
  confianza: rico ? { historia_corta: 'Nacimos en 2015 en Mérida.', testimonios: [{ nombre: 'Laura', texto: 'Excelente.' }, { nombre: 'Jorge', texto: 'Muy claros.' }] } : {},
  oferta: rico ? { proceso_pasos: ['Visita', 'Propuesta', 'Firma'], items: [{ grupo: 'Uno', nombre: 'Servicio A', precio_o_rango: '$900', descripcion_corta: 'Descripción A.' }, { grupo: 'Uno', nombre: 'Servicio B', precio_o_rango: '$1,200', descripcion_corta: 'Descripción B.' }, { grupo: 'Dos', nombre: 'Servicio C', precio_o_rango: '$2,000', descripcion_corta: 'Descripción C.' }, { grupo: 'Dos', nombre: 'Servicio D', precio_o_rango: '$500', descripcion_corta: 'Descripción D.' }] } : {},
});
const textos = (rico) => ({ variantes: Array.from({ length: 18 }, () => ({ titular: 'Atención clara desde el primer día', subtitulo: 'Te acompañamos en cada paso.', cta: 'Escríbenos' })), info: ['Mérida'], sobre: rico ? 'Somos un equipo local.' : '', proceso: rico ? ['Visita', 'Propuesta', 'Firma'] : undefined });
const variantes = () => Object.values(GIROS).flatMap((g) => Object.entries(g.variantes).map(([v, x]) => ({ giro: g.id, variante: v, subtipo: (x.subtipos || [])[0] || null })));
const deps = { buscar: async (q) => Array.from({ length: 10 }, (_, k) => ({ id: `${q}-${k}`, url: 'https://pixabay.test/x.jpg' })), descargarConMarca: async (h) => ({ url: `https://ejemplo.test/chat/archivos/ilus-${h.id.replace(/\W/g, '')}.jpg`, ancho: 1600, alto: 1000, pixabay: h.id }), logoLetras: async () => ({ url: 'https://ejemplo.test/chat/archivos/letras-1.png', ancho: 600, alto: 600 }) };
const conLlave = async (fn) => { const a = process.env.PIXABAY_API_KEY; process.env.PIXABAY_API_KEY = 'prueba'; try { return await fn(); } finally { if (a === undefined) delete process.env.PIXABAY_API_KEY; else process.env.PIXABAY_API_KEY = a; } };
const idsSecciones = (html) => [...html.matchAll(/<section[^>]*\bid="([a-z]+)"/g)].map((m) => m[1]).filter((x) => SECCIONES.includes(x));

test('criterio 3: toda opción declara requisitos con claves conocidas', () => {
  for (const o of OPCIONES) {
    assert.equal(typeof o.requisitos, 'object', `${o.letra} ${o.nombre}: falta requisitos en opcion.js`);
    for (const k of Object.keys(o.requisitos)) assert.ok(CLAVES.includes(k), `${o.letra}: requisito desconocido "${k}"`);
  }
});

test('criterio 2: una opción con página propia declara la excepción (ordenPropio) en su carpeta', () => {
  for (const o of OPCIONES) if (paginaPropia(o)) assert.equal(o.ordenPropio, true, `${o.letra} ${o.nombre}: página propia sin ordenPropio`);
});

test('criterio 7: ninguna opción carga librerías desde un CDN (se sirven con librerias.js)', () => {
  const malos = [];
  for (const d of fs.readdirSync(RAIZ, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    for (const f of fs.readdirSync(path.join(RAIZ, d.name)).filter((x) => /\.m?js$/.test(x) && !/\.test\./.test(x))) {
      const s = fs.readFileSync(path.join(RAIZ, d.name, f), 'utf8');
      for (const m of s.matchAll(/https?:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh|cdn\.skypack\.dev|ajax\.googleapis\.com)[^\s'"`]*/g)) malos.push(`${d.name}/${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(malos, []);
});

test('criterio 8: el CSS de una opción solo sale en su página', async () => {
  const b = briefDe('generico', null, true);
  const r = await renderPropuestas(b, matRico(), textos(true), {});
  const propio = (l) => Object.values(porLetra(l)?.plantilla?.cssBase || {}).map((x) => x.split('\n')[0].slice(0, 60)).filter(Boolean);
  for (const p of r.paginas) {
    for (const otra of r.paginas) if (otra.letra !== p.letra) for (const frag of propio(otra.letra)) assert.ok(!p.html.includes(frag), `${p.letra} lleva CSS de ${otra.letra}: ${frag}`);
  }
});

test('criterio 1: las opciones con secciones del kit siguen el orden del mapa de cada giro', async () => {
  for (const v of variantes()) {
    const b = briefDe(v.giro, v.subtipo, true);
    const orden = mapaNuevo(b).orden;
    const r = await conLlave(() => renderPropuestas(b, matRico(), textos(true), { mapa: 'nuevo', depsIlustrativas: deps }));
    for (const p of r.paginas) {
      if (porLetra(p.letra)?.ordenPropio) continue;
      const ids = idsSecciones(p.html).filter((x) => orden.includes(x));
      const pos = ids.map((x) => orden.indexOf(x));
      assert.deepEqual(pos, [...pos].sort((a, c) => a - c), `${v.giro}/${v.variante} ${p.letra}: ${ids.join('>')}`);
    }
  }
});

test('criterio 4: con material mínimo cada giro recibe las primeras 6 de su lista, completas con ilustrativos', async () => {
  for (const v of variantes()) {
    const b = briefDe(v.giro, v.subtipo, false);
    const esperadas = elegirLetras(mapaNuevo(b), { brief: b, mat: matPobre(), textos: textos(false), porLetra, rellenables: RELLENABLES }).letras;
    const r = await conLlave(() => renderPropuestas(b, matPobre(), textos(false), { mapa: 'nuevo', depsIlustrativas: deps }));
    assert.deepEqual(r.paginas.map((p) => p.letra), esperadas, `${v.giro}/${v.variante}: alguna opción no se armó con ilustrativos`);
  }
});
