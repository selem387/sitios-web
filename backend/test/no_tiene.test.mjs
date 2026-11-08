import test from 'node:test';
import assert from 'node:assert/strict';
import { esNegativa, requisitoDePregunta, noTieneDelHistorial, faltantes } from '../src/entrevista/requisitos.js';

test('respuestas negativas', () => {
  for (const r of ['no', 'no no tengo', 'No.', 'ninguna', 'todavía no', 'no tengo reseñas', 'nop']) assert.ok(esNegativa(r), r);
  for (const r of ['no, pero te mando capturas', 'sí', 'Entregamos el acuse oficial con folio', '']) assert.ok(!esNegativa(r), r);
});

test('caso Punto Legal: reseñas no se vuelven a pedir', () => {
  const pedir = '¡Perfecto! Ya anoté la cuarta.\n\n¿Tienes reseñas en Google o Facebook? Mándame la liga, o copia 2 o 3 comentarios de clientes contentos.';
  assert.equal(requisitoDePregunta(pedir), 'testimonios');
  const ids = noTieneDelHistorial([{ rol: 'agente', contenido: pedir }, { rol: 'cliente', contenido: 'no no tengo' }]);
  assert.deepEqual(ids, ['testimonios']);
  const f = faltantes({ no_tiene: ids }, [], { desde: 'B7', hasta: 'B7' });
  assert.ok(!f.some((x) => x.id === 'testimonios'));
});
