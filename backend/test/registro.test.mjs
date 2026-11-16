import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPCIONES, OPCIONES_BASE, OPCIONES_EXTRA, LETRAS, LAYOUTS, NOMBRES, RESERVADAS, porLetra, porNombre, indiceDeLetra } from '../src/generador/opciones/registro.js';
import { esLetra, reLigaPropuesta, CLASE_MAYUS } from '../src/generador/opciones/letras.js';
import { paginasGenerales, LETRAS as LETRAS_GENERAL, LAYOUTS_GENERAL, NOMBRES_GENERAL } from '../src/generador/propuestas_general.js';
import { interpretarEleccion } from '../src/generador/opciones.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

test('el registro carga una opción por carpeta, sin letras ni posiciones repetidas', () => {
  const carpetas = fs.readdirSync(path.join(SRC, 'generador', 'opciones'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  assert.deepEqual(OPCIONES.map((o) => o.nombre).sort(), carpetas);
  assert.equal(new Set(OPCIONES.map((o) => o.letra)).size, OPCIONES.length);
  assert.equal(OPCIONES_BASE.length, 6);
  assert.equal(OPCIONES_BASE.map((o) => o.letra).join(''), 'ABCDEF');
  assert.equal(OPCIONES.length, OPCIONES_BASE.length + OPCIONES_EXTRA.length);
  for (const o of OPCIONES) { assert.equal(LETRAS[o.indice], o.letra); assert.equal(LAYOUTS[o.indice], o.nombre); assert.equal(NOMBRES[o.nombre], o.titulo); }
});

test('las letras y posiciones ya entregadas a clientes no cambian', () => {
  // Estas letras están en ligas y propuestas guardadas: una opción nueva toma la siguiente libre, nunca una de estas.
  const fijas = { A: 'portada', B: 'editorial', C: 'mosaico', D: 'logo', E: 'dostonos', F: 'carta', G: 'collage', H: 'indice', I: 'historia', J: 'narrativa', K: 'movimiento', M: 'guia', N: 'avance', O: 'catalogo', P: 'ficha', Q: 'vitrina', R: 'manual' };
  for (const [letra, nombre] of Object.entries(fijas)) { assert.equal(porLetra(letra)?.nombre, nombre); assert.equal(porNombre(nombre).indice, 'ABCDEFGHIJKLMNOPQR'.indexOf(letra)); }
  assert.equal(LETRAS.slice(0, 18), 'ABCDEFGHIJKLMNOPQR');
  assert.equal(porLetra('L'), null); // apartada para "Plataforma" hasta que pase a su carpeta
  assert.ok(RESERVADAS.some((r) => r.letra === 'L') || porLetra('L'));
  assert.equal(indiceDeLetra('M'), 12); assert.equal(indiceDeLetra(''), 0); assert.equal(indiceDeLetra('?'), 0);
});

test('la plantilla general toma letras, layouts y nombres del registro', () => {
  assert.equal(LETRAS_GENERAL, LETRAS); assert.equal(LAYOUTS_GENERAL, LAYOUTS); assert.equal(NOMBRES_GENERAL, NOMBRES);
});

test('reconocer letras: validación, ligas y elección por chat salen del registro', () => {
  for (const o of OPCIONES) {
    assert.ok(esLetra(o.letra)); assert.ok(esLetra(o.letra.toLowerCase(), { i: true })); assert.ok(!esLetra(o.letra.toLowerCase()));
    assert.ok(reLigaPropuesta().test(`https://x.mx/p/abc12345/${o.letra}`));
    assert.equal(interpretarEleccion(`me quedo con la ${o.letra}`).elegido, o.letra);
    assert.equal(interpretarEleccion(`la ${o.indice + 1}`).elegido, o.letra);
  }
  assert.ok(!esLetra('AB')); assert.ok(!esLetra('')); assert.ok(!esLetra('Z') || LETRAS.includes('Z'));
  assert.deepEqual('https://x.mx/p/abc12345/M?x=1'.match(reLigaPropuesta({ captura: true })).slice(1), ['abc12345', 'M']);
  assert.equal(CLASE_MAYUS, `[${LETRAS}]`);
});

test('cada opción adicional se arma sola cuando se pide por su letra', () => {
  const foto = (n) => ({ url: `https://x/${n}.jpg`, ancho: 1200, alto: 800, alt: `foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
  const mat = { logo: null, logos_extra: [], hero: foto(1), fundador: null, fotos: [], trabajos: Array.from({ length: 6 }, (_, k) => foto(k + 2)), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] };
  const args = { brief: { negocio: { nombre: 'Norte 21', arquetipo: 'servicios', giro_texto: 'Despacho', ciudad: 'Mérida' }, contacto: {}, oferta: {} }, mat, textos: { variantes: Array(LETRAS.length).fill({ titular: 'Titular', subtitulo: 'Sub', cta: 'Escríbeme' }), info: [] }, pares: [{ titulos: 'Gloock', cuerpo: 'Hanken Grotesk', estilo: 'elegante' }], urlFuentes: () => '' };
  assert.deepEqual(paginasGenerales(args).map((p) => p.letra), ['A', 'B', 'C', 'D', 'E', 'F']);
  for (const o of OPCIONES_EXTRA) {
    const ps = paginasGenerales({ ...args, solo: o.letra });
    assert.deepEqual(ps.map((p) => [p.letra, p.layout, p.nombre]), [[o.letra, o.nombre, o.titulo]]);
    assert.match(ps[0].html, /^<!doctype html>/i);
  }
});

test('ningún archivo fuera de generador/opciones/ lleva las letras escritas a mano', () => {
  const malos = [];
  const ver = (dir) => { for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) { if (!f.endsWith(path.join('generador', 'opciones')) && d.name !== 'vendor') ver(f); continue; }
    if (!/\.(m?js)$/.test(d.name)) continue;
    const s = fs.readFileSync(f, 'utf8');
    if (/\[A-R\]|\[a-r\]|ABCDEFGHIJKLMNOPQR|'ABCDEFGHIJKLMNOP/.test(s)) malos.push(path.relative(SRC, f));
  } };
  ver(SRC);
  assert.deepEqual(malos, [], 'usar generador/opciones/letras.js o registro.js en lugar de escribir las letras');
});
