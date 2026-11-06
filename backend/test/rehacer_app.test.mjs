import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparOferta, detalleHTML } from '../src/generador/propuestas_general.js';
import { limpiarSeccion } from '../src/panel/sitios.js';
import { renglonesAjenos, textosInventados, briefReinterpretado, separarPrecio } from '../src/panel/reinterpretar.js';
import { parrafosHTML, giroCorto } from '../src/generador/propuestas_general.js';

const CLIENTE = `quiero que ajustes los paquetes, los quiero asi;
## 🎂 Smash Cake | Primer Añito
*Paquete #1 — $1,200 MXN*
¡Su primer añito merece recuerdos llenos de alegría!
- 1 hora de sesión.
- 35 fotografías.`;

test('paquetes con categoría explícita se agrupan por ella', () => {
  const g = agruparOferta([{ grupo: '🎂 Smash Cake | Primer Añito', nombre: 'Paquete #1', precio_o_rango: '$1,200 MXN', descripcion_corta: 'x' }, { grupo: '🎂 Smash Cake | Primer Añito', nombre: 'Paquete #2', precio_o_rango: '$900 MXN' }]);
  assert.equal(g.length, 1);
  assert.equal(g[0].nombre, '🎂 Smash Cake | Primer Añito');
  assert.deepEqual(g[0].opciones.map((o) => o.nombre), ['Paquete #1', 'Paquete #2']);
});

test('descripción: renglones con "- " van en lista y el texto queda tal cual', () => {
  const h = detalleHTML('¡Su primer añito merece recuerdos llenos de alegría!\n- 1 hora de sesión.\n- 35 fotografías.');
  assert.match(h, /<span>¡Su primer añito merece recuerdos llenos de alegría!<\/span>/);
  assert.match(h, /<ul class="inc"><li>1 hora de sesión.<\/li><li>35 fotografías.<\/li><\/ul>/);
});

test('el panel conserva renglones, viñetas y categoría', () => {
  const o = limpiarSeccion('oferta', { items: [{ grupo: 'Bodas', nombre: 'Paquete', descripcion_corta: 'Uno\n- dos\n- tres' }] });
  assert.equal(o.items[0].descripcion_corta, 'Uno\n- dos\n- tres');
  assert.equal(o.items[0].grupo, 'Bodas');
});

test('detecta texto que el cliente no escribió', () => {
  assert.deepEqual(renglonesAjenos('- 1 hora de sesión.\n- 35 fotografías.', CLIENTE), []);
  assert.equal(renglonesAjenos('- 2 horas de sesión.', CLIENTE).length, 1);
  const f = textosInventados({ oferta: { items: [{ grupo: '🎂 Smash Cake | Primer Añito', nombre: 'Paquete #1', precio_o_rango: '$1,500 MXN', descripcion_corta: '- 35 fotografías.' }] } }, CLIENTE);
  assert.equal(f.length, 1);
  assert.match(f[0], /1,500/);
});

test('brief reinterpretado reemplaza paquetes y guarda lo dictado', () => {
  const { brief, dictado } = briefReinterpretado({ negocio: { nombre: 'X' }, oferta: { items: [{ nombre: 'viejo' }] }, contacto: { email: 'a@b.mx' } },
    { oferta: { items: [{ grupo: 'G', nombre: 'Nuevo', precio_o_rango: '$1' }] }, contacto: { telefono: '9991112233' }, historia: { texto: 'Hola', dictado_por_cliente: true }, notas: [] });
  assert.deepEqual(brief.oferta.items.map((x) => x.nombre), ['Nuevo']);
  assert.equal(brief.contacto.email, 'a@b.mx');
  assert.equal(brief.contacto.telefono, '9991112233');
  assert.deepEqual(dictado.historia, { texto: 'Hola' });
});

test('el precio no se repite en el nombre', () => {
  assert.equal(separarPrecio({ nombre: 'Paquete #1 — $1,200 MXN', precio_o_rango: '$1,200 MXN' }).nombre, 'Paquete #1');
  assert.equal(separarPrecio({ nombre: 'Maternidad | Paquete #2 — $1,000 MXN', precio_o_rango: '$1,000 MXN' }).nombre, 'Maternidad | Paquete #2');
  assert.equal(separarPrecio({ nombre: 'Sesión', precio_o_rango: '$900' }).nombre, 'Sesión');
});

test('historia en párrafos con negritas del chat', () => {
  assert.equal(parrafosHTML('Hola\n\nCon **12 años**', 'historia'), '<p class="historia">Hola</p><p class="historia">Con <strong>12 años</strong></p>');
});

test('el giro largo se resume en la portada', () => {
  assert.equal(giroCorto('Consultoría inmobiliaria y de inversión: venta y renta de casas en privadas'), 'Consultoría inmobiliaria y de inversión');
  assert.equal(giroCorto('Fotógrafa'), 'Fotógrafa');
  assert.ok(giroCorto('Venta y renta de casas en privadas residenciales, departamentos frente a la playa y terrenos').length <= 48);
});

test('servicios con varios paquetes: título con línea por servicio y un cuadro por paquete', async () => {
  const { agruparOferta } = await import('../src/generador/propuestas_general.js');
  const g = agruparOferta([{ grupo: 'A', nombre: 'P1', precio_o_rango: '$1' }, { grupo: 'A', nombre: 'P2', precio_o_rango: '$2' }, { grupo: 'B', nombre: 'P3', precio_o_rango: '$3' }]);
  assert.deepEqual(g.map((x) => x.opciones.length), [2, 1]);
});

test('CSS propio: se rechaza lo peligroso y se acepta lo normal', async () => {
  const { revisarCss } = await import('../src/panel/cambios_vivo.js');
  assert.deepEqual(revisarCss('@media (min-width:900px){#resenas .quotes{grid-template-columns:repeat(4,1fr)}}'), []);
  assert.ok(revisarCss('@import url(https://x.com/a.css);').length);
  assert.ok(revisarCss('#a{background:url(https://x.com/i.png)}').length);
  assert.ok(revisarCss('#a{color:red').length);
  assert.ok(revisarCss('section{display:none}').length);
});
