// Estas pruebas cubren la elección con A–F disponibles; la suspensión de A–F se prueba en opciones_primero.test.mjs.
process.env.OPCIONES_SUSPENDIDAS = 'ninguna';
// Página de referencia → opción S + plantillas del giro (decisiones del 18-nov-2026; doc claude/pagina-referencia-plantilla.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.RENDER_URL = ''; process.env.PUBLIC_URL = 'https://ejemplo.test';
const { reconstruirReferencia } = await import('../src/generador/reconstruir.js');
const { listaConPlantillas, atenderTelegram, _fijarCache } = await import('../src/generador/plantillas_ref.js');
const { renderPropuestas } = await import('../src/generador/propuestas_html.js');
const { mapaNuevo, elegirLetras } = await import('../src/generador/giros/index.js');
const { porLetra } = await import('../src/generador/opciones/registro.js');
const { construirDireccion } = await import('../src/generador/estilo_ref.js');
const { avisoReferencia } = await import('../src/entrevista/propuestas.js');

const foto = (n) => ({ url: `https://x.test/${n}.jpg`, ancho: 1400, alto: 900, alt: `Foto ${n}`, tipo: 'foto_trabajo', clave: `a${n}` });
const mat = () => ({ logo: null, logos_extra: [], colores: ['#1F4E79'], hero: foto(1), fundador: null, fotos: [], trabajos: [2, 3, 4, 5, 6].map(foto), equipo: [], local: [], resenas: [], catalogos: [], menus: [], otras: [], documentos: [], videos: [] });
const brief = (extra = {}) => ({ negocio: { nombre: 'Casa Norte', arquetipo: 'inmobiliaria', ciudad: 'Mérida' }, contacto: { whatsapp: '5219990000000' }, marca: { estilo: 'moderno', ...extra }, confianza: { historia_corta: 'Desde 2012.' }, oferta: { items: [{ nombre: 'Compra', descripcion_corta: 'x' }, { nombre: 'Venta', descripcion_corta: 'y' }, { nombre: 'Renta', descripcion_corta: 'z' }] } });
const textos = { variantes: Array.from({ length: 20 }, () => ({ titular: 'Tu casa en Mérida', subtitulo: 'Te acompañamos', cta: 'Escríbenos' })), info: [] };
const PLANO = { estilo: { colores: { fondo: '#111111', texto: '#F5F5F0', acento: '#D4AF37' }, par: 3 }, portada: { tipo: 'texto_grande' }, secciones: [{ tipo: 'trabajo', estilo: 'carrusel' }, { tipo: 'servicios', estilo: 'filas' }] };

test('reconstrucción: corrige el plano hasta parecerse; si no se parece, falla para seguir sin ella', async () => {
  const llamadas = [];
  const deps = {
    capturasDe: async (u) => ({ escritorio: [`${u}#1`], celular: `${u}#c` }),
    estudiar: async () => ({}),
    planoInicial: async () => ({ legible: true, plano: PLANO }),
    paginaDePrueba: async () => 'https://ejemplo.test/p/rfprueba/S',
    compararYCorregir: async ({ plano }) => { llamadas.push(plano.portada.tipo); return llamadas.length === 1 ? { legible: true, parecido: 2, plano: { ...PLANO, portada: { tipo: 'foto_completa' } } } : { legible: true, parecido: 4, plano }; },
  };
  const r = await reconstruirReferencia('https://ref.test', { deps });
  assert.equal(r.parecido, 4);
  assert.equal(r.plano.portada.tipo, 'foto_completa');
  assert.deepEqual(llamadas, ['texto_grande', 'foto_completa']);
  await assert.rejects(reconstruirReferencia('https://ref.test', { deps: { ...deps, compararYCorregir: async ({ plano }) => ({ legible: true, parecido: 2, plano }) } }), (e) => e.code === 'REFERENCIA_SIN_PARECIDO');
  await assert.rejects(reconstruirReferencia('https://ref.test', { deps: { ...deps, planoInicial: async () => ({ legible: false, plano: {} }) } }), (e) => e.code === 'REFERENCIA_ILEGIBLE');
});

test('liga en la entrevista: la S primero + las 5 primeras de la lista del giro', async () => {
  const b = brief({ plano_ref: { plano: PLANO, url: 'https://ref.test', origen: 'propia' } });
  const r = await renderPropuestas(b, mat(), textos, { mapa: 'nuevo' });
  assert.deepEqual(r.paginas.map((p) => p.letra), ['S', ...elegirLetras(mapaNuevo(b), { brief: b, mat: mat(), textos, porLetra }).letras.slice(0, 5)]);
  assert.match(r.paginas[0].html, /Tu casa en Mérida/);
});

test('liga al rechazar: la S primero + 5 variaciones del estilo de referencia', async () => {
  const b = brief({ direccion_ref: construirDireccion('moderno_limpio', null), plano_ref: { plano: PLANO, url: 'https://ref.test', origen: 'propia' } });
  const r = await renderPropuestas(b, mat(), textos, {});
  assert.equal(r.paginas.length, 6);
  assert.equal(r.paginas[0].letra, 'S');
  assert.deepEqual(r.paginas.slice(1).map((p) => p.letra), ['A', 'B', 'C', 'D', 'E']);
});

test('plantillas aprobadas: entran al final de la lista o donde Sebastián las puso, solo una', () => {
  const ap = [{ id: 7, giro: 'inmobiliaria', plano: PLANO }, { id: 9, giro: 'inmobiliaria', plano: PLANO }];
  assert.deepEqual(listaConPlantillas(['C', 'A', 'G'], 'inmobiliaria', ap), { lista: ['C', 'A', 'G', 'S'], plantilla: ap[0] });
  assert.deepEqual(listaConPlantillas(['C', 'ref:9', 'A', 'ref:7'], 'inmobiliaria', ap).lista, ['C', 'S', 'A']);
  assert.deepEqual(listaConPlantillas(['C', 'ref:3'], 'inmobiliaria', []), { lista: ['C'], plantilla: null });
});

test('una plantilla aprobada sale como respaldo, con su plano, si otra opción falla', async () => {
  _fijarCache([{ id: 7, giro: 'inmobiliaria', plano: PLANO }]);
  try {
    const r = await renderPropuestas(brief(), mat(), textos, { mapa: 'nuevo' });
    assert.ok(!r.paginas.some((p) => p.letra === 'S'), 'al final de la lista: no desplaza a las 6 primeras');
    assert.equal(r.plano_ref?.plantilla_id, 7);
    assert.equal(r.mapa.lista.at(-1), 'S');
  } finally { _fijarCache([]); }
});

test('Telegram: solo el secreto del webhook y el chat de Sebastián', async () => {
  process.env.TELEGRAM_WEBHOOK_SECRET = 'sec'; process.env.TELEGRAM_CHAT_ID = '123';
  assert.equal((await atenderTelegram({}, 'otro')).motivo, 'secreto');
  assert.equal((await atenderTelegram({ callback_query: { data: 'ref:aprobar:1', message: { chat: { id: 999 } } } }, 'sec')).motivo, 'chat');
  assert.equal((await atenderTelegram({ message: { text: '/start' } }, 'sec')).ok, true);
  delete process.env.TELEGRAM_WEBHOOK_SECRET; delete process.env.TELEGRAM_CHAT_ID;
});

test('Ari dice si la S viene de su página o si no se pudo', () => {
  assert.match(avisoReferencia({ sale: true }), /\*S\*/);
  assert.match(avisoReferencia({ fallo: { url: 'x' } }), /No pude leer/);
  assert.match(avisoReferencia({ plano_ref: { plano: {} } }), /no quedó como debe/);
  assert.equal(avisoReferencia({}), null);
});
