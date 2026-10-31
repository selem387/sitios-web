// Memoria larga de la entrevista: un modelo barato resume el tramo nuevo de mensajes y reescribe
// `entrevistas.memoria` completa. Ari solo la lee. Ver doc, sección 2.2.
import * as db from './db.js';
import { pedirJSON, MODELO_MEMORIA } from './claude.js';
import { SISTEMA_MEMORIA, ESQUEMA_MEMORIA, GUIA_BLOQUES } from './prompts.js';

const CAMPOS_LISTA = ['hechos', 'decisiones', 'rechazado', 'preguntas_hechas', 'pendientes', 'preferencias_cliente', 'bloques_cerrados'];
const TOPE_CHARS = 6000; // ~1,500 tokens

function formatearMensajes(mensajes) {
  return mensajes.map((m) => {
    const quien = m.rol === 'cliente' ? 'Cliente' : m.rol === 'agente' ? 'Ari' : 'Sistema';
    const texto = m.transcripcion ? `[audio] ${m.transcripcion}` : m.contenido || '';
    return `#${m.id} ${quien}${m.bloque ? ` (${m.bloque})` : ''}: ${texto}`;
  }).join('\n');
}

function validar(mem, anterior) {
  if (!mem || typeof mem !== 'object') return null;
  const out = { resumen: String(mem.resumen || '').trim() };
  for (const k of CAMPOS_LISTA) {
    out[k] = Array.isArray(mem[k]) ? mem[k].map((x) => String(x).trim()).filter(Boolean) : [];
  }
  // Un rechazo nunca desaparece solo.
  for (const r of anterior.rechazado || []) if (!out.rechazado.includes(r)) out.rechazado.push(r);
  for (const p of anterior.preguntas_hechas || []) if (!out.preguntas_hechas.includes(p)) out.preguntas_hechas.push(p);
  if (!out.resumen) return null;
  // Tope de tamaño: se comprime resumen y hechos, nunca rechazado ni pendientes.
  let intentos = 0;
  while (JSON.stringify(out).length > TOPE_CHARS && intentos++ < 5) {
    if (out.hechos.length > 5) out.hechos = out.hechos.slice(-Math.ceil(out.hechos.length * 0.7));
    else if (out.resumen.length > 600) out.resumen = out.resumen.slice(0, 600);
    else break;
  }
  return out;
}

// Actualiza la memoria si hay mensajes nuevos. Idempotente y con candado por entrevista.
export async function actualizarMemoria(entrevistaId, disparador = 'manual') {
  const e = await db.obtener(entrevistaId);
  if (!e || e.memoria_en_curso) return null;
  const nuevos = await db.mensajesDesde(entrevistaId, e.memoria_msg_id);
  if (!nuevos.length) return null;
  await db.guardar(entrevistaId, { memoria_en_curso: true });
  const anterior = e.memoria && Object.keys(e.memoria).length ? e.memoria : {};
  const msgDesde = nuevos[0].id;
  const msgHasta = nuevos[nuevos.length - 1].id;
  const version = (e.memoria_version || 0) + 1;
  const contenido = [
    `MEMORIA ACTUAL:\n${Object.keys(anterior).length ? JSON.stringify(anterior, null, 1) : '(vacía)'}`,
    `BRIEF:\n${JSON.stringify(e.brief || {})}`,
    `BLOQUE ACTUAL: ${e.bloque_actual}`,
    `GUÍA DE PREGUNTAS (usa estos códigos en preguntas_hechas, p. ej. "B1.3"):\n${Object.values(GUIA_BLOQUES).join('\n')}`,
    `MENSAJES NUEVOS (desde #${msgDesde} hasta #${msgHasta}):\n${formatearMensajes(nuevos)}`,
  ].join('\n\n');
  let ultimoError = null;
  try {
    for (let intento = 0; intento < 2; intento++) {
      try {
        const r = await pedirJSON({ system: SISTEMA_MEMORIA, contenido, schema: ESQUEMA_MEMORIA, model: MODELO_MEMORIA, max_tokens: 2500 });
        const mem = validar(r.data, anterior);
        if (!mem) throw new Error('memoria inválida');
        const memoria = { ...mem, version, msg_hasta: msgHasta, actualizado: new Date().toISOString() };
        await db.guardar(entrevistaId, { memoria, memoria_msg_id: msgHasta, memoria_version: version });
        await db.logMemoria(entrevistaId, { version, memoria, msg_desde: msgDesde, msg_hasta: msgHasta, disparador, modelo: r.model, tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens, duracion_ms: r.duracion_ms });
        return memoria;
      } catch (err) {
        ultimoError = err;
      }
    }
    // Falló dos veces: se conserva la memoria anterior y queda registrado.
    await db.logMemoria(entrevistaId, { version, memoria: anterior, msg_desde: msgDesde, msg_hasta: msgHasta, disparador, modelo: MODELO_MEMORIA, error: String(ultimoError?.message || ultimoError) });
    return null;
  } finally {
    await db.guardar(entrevistaId, { memoria_en_curso: false });
  }
}

// Decide si toca actualizar tras un turno: cierre de bloque o ventana de 10 mensajes del cliente.
export async function tocaActualizar(e, bloqueAnterior) {
  if (e.bloque_actual !== bloqueAnterior) return 'bloque';
  const n = await db.clientesSinResumir(e.id, e.memoria_msg_id);
  return n >= 10 ? 'ventana' : null;
}

// Texto de recordatorio tras una pausa, armado desde la memoria.
export function mensajeRecordatorio(e, totalBloques) {
  const mem = e.memoria || {};
  const cerrados = (mem.bloques_cerrados || []).filter((b) => b !== 'B0').length;
  const pend = (mem.pendientes || []).slice(0, 2);
  const avance = cerrados ? `Ya tenemos ${cerrados} de ${totalBloques} pasos listos.` : 'Apenas íbamos empezando.';
  const falta = pend.length ? ` Solo falta: ${pend.join(' y ')}.` : '';
  return `¡Hola! Soy Ari 👋 ${avance}${falta} ¿Seguimos? Contéstame cualquier cosa y retomamos donde nos quedamos.`;
}
