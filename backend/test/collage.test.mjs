import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acomodosCollage, rectsAcomodo } from '../src/generador/collage.js';
import { paginasGenerales } from '../src/generador/propuestas_general.js';

test('acomodos del collage: sin fotos repetidas dentro de un acomodo y todas salen', () => {
  for (let n = 1; n <= 12; n++) {
    const a = acomodosCollage(n);
    const m = Math.min(n, 9);
    for (const e of a) assert.equal(new Set(e.idx).size, e.idx.length, `n=${n} ${e.tipo}`);
    assert.equal(new Set(a.flatMap((e) => e.idx)).size, m, `n=${n} todas`);
  }
});

test('rectángulos del collage caben en el lienzo', () => {
  for (const [t, k] of [['tiras', 5], ['una', 1], ['duo', 2], ['mos', 3], ['r2x2', 4], ['r3x2', 6], ['r3x3', 9]]) {
    const rs = rectsAcomodo(t, k, 1280, 880, 10);
    assert.equal(rs.length, k);
    for (const r of rs) assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= 1280 && r.y + r.h <= 880 && r.w > 0 && r.h > 0, `${t} ${JSON.stringify(r)}`);
  }
});

test('la G (collage) sale como séptima opción y la foto de fondo no entra al panel', () => {
  const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
  const mat = { logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: [2, 3, 4, 5, 6].map(foto), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] };
  const textos = { variantes: Array(7).fill({ titular: 'Hola', subtitulo: 'Sub', cta: 'Escríbeme' }), info: [], diapositivas: [] };
  const pags = paginasGenerales({ brief: { negocio: { nombre: 'X', arquetipo: 'generico' }, contacto: {} }, mat, textos, pares: [{ titulos: 'Fraunces', cuerpo: 'Inter', estilo: 'calido' }], urlFuentes: () => '', solo: 'ABCDEFG' });
  assert.deepEqual(pags.map((p) => p.letra).join(''), 'ABCDEFG');
  const g = pags[6].html;
  const panel = g.slice(g.indexOf('<div class="col'), g.indexOf('</section>'));
  assert.match(g, /class="col-fondo/);
  assert.doesNotMatch(panel, /x\/1\.jpg/);
  assert.match(panel, /x\/2\.jpg/);
  assert.match(g, /data-mp4=/);
});
