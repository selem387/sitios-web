import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBRERIAS, urlLibreria, servirVendor } from '../src/generador/librerias.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const VENDOR = path.join(SRC, 'generador', 'vendor');

test('cada librería existe en generador/vendor y se sirve con caché larga', async () => {
  for (const [clave, archivo] of Object.entries(LIBRERIAS)) {
    assert.match(archivo, /^[a-z-]+-\d+\.\d+\.\d+\.min\.js$/, `${clave}: el nombre lleva la versión`);
    const s = fs.readFileSync(path.join(VENDOR, archivo), 'utf8');
    assert.doesNotThrow(() => new Function(s), `${archivo} no es JavaScript válido`);
    assert.ok(urlLibreria(clave).endsWith(`/vendor/${archivo}`));
    let r; await servirVendor({ req: { param: () => archivo }, text: (t, st) => ({ st }), body: (b, st, h) => { r = { st, h }; return r; } });
    assert.equal(r.st, 200); assert.match(r.h['cache-control'], /immutable/);
  }
  assert.throws(() => urlLibreria('jquery-1.0.0'));
});

test('ningún generador carga librerías desde un CDN de terceros', () => {
  const malos = [];
  const ver = (dir) => { for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) { if (d.name !== 'vendor') ver(f); continue; }
    if (/\.(m?js|css|html)$/.test(d.name) && /cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com/.test(fs.readFileSync(f, 'utf8'))) malos.push(path.relative(SRC, f));
  } };
  ver(path.join(SRC, 'generador'));
  assert.deepEqual(malos, [], 'agregar la librería a generador/librerias.js y usar urlLibreria()');
});
