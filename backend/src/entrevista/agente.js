// Ari: conduce la entrevista por mensajes (mismo contrato que creador_video/entrevista).
import crypto from 'node:crypto';
import * as db from './db.js';
import { pedirJSON, describirImagen, transcribirAudio, MODELO_ARI } from './claude.js';
import { actualizarMemoria, tocaActualizar } from './memoria.js';
import { BLOQUES, TOTAL_BLOQUES, PALABRA_INICIO, INSTRUCCIONES, SISTEMA_ARI, GUIA_BLOQUES, BRIEF_VACIO, ESQUEMA_SALIDA_ARI, SISTEMA_PLATAFORMA, ESQUEMA_PLATAFORMA } from './prompts.js';
import { isObject } from '../util.js';
import { resolverSubtipo } from './subtipo.js';
import { estudiarReferencias } from './referencias.js';

const MAX_MSGS_CLIENTE = 120;
const PAUSA_MS = 2 * 3600 * 1000;

// Una cola por usuario para que los mensajes rápidos (varias fotos) no se pisen.
const colas = new Map();
export function enSerie(clave, fn) {
  const previa = colas.get(clave) || Promise.resolve();
  const sig = previa.catch(() => {}).then(fn);
  colas.set(clave, sig.finally(() => { if (colas.get(clave) === sig) colas.delete(clave); }));
  return sig;
}

const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

const tipoMedia = (t, mime = '') => {
  t = String(t || '').toLowerCase(); mime = String(mime).toLowerCase();
  if (t.startsWith('im') || mime.startsWith('image/')) return 'imagen';
  if (t.startsWith('vid') || mime.startsWith('video/')) return 'video';
  if (t.startsWith('au') || mime.startsWith('audio/')) return 'audio';
  if (t.startsWith('ub') || t.startsWith('loc')) return 'ubicacion';
  return 'documento';
};

export function mergeProfundo(base, patch) {
  if (!isObject(patch)) return base;
  const out = isObject(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    out[k] = isObject(v) && isObject(out[k]) ? mergeProfundo(out[k], v) : v;
  }
  return out;
}

function salida(e, respuestas, esperando) {
  const idx = Math.max(0, BLOQUES.indexOf(e.bloque_actual));
  return {
    sesion_id: e.id, usuario_id: e.usuario_id, estado: e.estado,
    bloque: e.bloque_actual, paso: idx, total_pasos: TOTAL_BLOQUES,
    esperando, respuestas, metadata: e.metadata || {},
  };
}

async function notificar(e, payload) {
  if (!e.callback_url) return;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(e.callback_url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      if (r.ok) { await db.evento(e.id, 'callback_ok', { evento: payload.evento, status: r.status }); return; }
      await db.evento(e.id, 'callback_fallo', { evento: payload.evento, status: r.status });
    } catch (err) { await db.evento(e.id, 'callback_fallo', { evento: payload.evento, error: String(err.message) }); }
    await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
  }
}

async function decidirPlataforma(brief) {
  try {
    const r = await pedirJSON({ system: SISTEMA_PLATAFORMA, contenido: `BRIEF:\n${JSON.stringify(brief)}`, schema: ESQUEMA_PLATAFORMA, max_tokens: 600 });
    return r.data;
  } catch (err) {
    return { plataforma: 'wordpress', razon: `Por defecto (no se pudo decidir: ${err.message})`, senales: [], modulos_dinamicos: [] };
  }
}

async function turnoAri(e, { mensajesRecientes, ultimoTexto, regresaDePausa, arquetipos, assets }) {
  const bloque = BLOQUES.includes(e.bloque_actual) ? e.bloque_actual : 'B0';
  const mem = e.memoria && Object.keys(e.memoria).length ? JSON.stringify(e.memoria, null, 1) : 'vacía';
  const brief = mergeProfundo(BRIEF_VACIO, e.brief || {});
  const historial = mensajesRecientes.map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${m.transcripcion ? `[audio] ${m.transcripcion}` : m.contenido || ''}`).join('\n');
  const partes = [
    `MEMORIA:\n${mem}`,
    `BLOQUE ACTUAL: ${bloque}\nGUÍA DEL BLOQUE:\n${GUIA_BLOQUES[bloque]}`,
  ];
  if (bloque === 'B1' || !brief.negocio?.arquetipo) {
    const lista = arquetipos.map((a) => {
      const subs = a.subtipos ? Object.entries(a.subtipos).map(([k, v]) => `${k} (${String(v?.keywords_es || v?.keywords || '').split(',').slice(0, 6).map((x) => x.trim()).join(', ')})`) : ['(sin subtipos)'];
      return `${a.slug}:\n  ${subs.join('\n  ')}`;
    });
    partes.push(`ARQUETIPOS (slug → subtipos con palabras clave). Asigna negocio.arquetipo y negocio.subtipo SOLO con estos valores:\n${lista.join('\n')}`);
  }
  if (bloque === 'B11' && brief.negocio?.arquetipo) partes.push(`ARQUETIPO ASIGNADO: ${brief.negocio.arquetipo}`);
  if (assets.length) partes.push(`ASSETS recibidos:\n${assets.map((a) => `${a.clave} [${a.tipo}, ${a.calidad || '?'}, usar=${a.usar}] ${a.descripcion_ia || a.nota || ''}`).join('\n')}`);
  partes.push(`BRIEF:\n${JSON.stringify(brief)}`);
  partes.push(`ÚLTIMOS MENSAJES:\n${historial || '(ninguno)'}`);
  partes.push(`regresa_de_pausa: ${regresaDePausa}\nÚLTIMO MENSAJE DEL CLIENTE: ${ultimoTexto || '(sin texto)'}`);
  const r = await pedirJSON({ system: SISTEMA_ARI, contenido: partes.join('\n\n'), schema: ESQUEMA_SALIDA_ARI, model: MODELO_ARI, max_tokens: 1800 });
  const d = r.data;
  const idxActual = BLOQUES.indexOf(bloque);
  const idxNuevo = BLOQUES.indexOf(d.bloque_actual);
  return {
    reply: String(d.reply || '').trim(),
    bloque: idxNuevo >= 0 && idxNuevo >= idxActual - 1 ? d.bloque_actual : bloque, // no retroceder más de un bloque
    briefPatch: isObject(d.brief_patch) ? d.brief_patch : {},
    pendientes: Array.isArray(d.pendientes_bloque) ? d.pendientes_bloque : [],
    assetsPatch: Array.isArray(d.assets_patch) ? d.assets_patch : [],
    completado: Boolean(d.completado),
  };
}

export async function procesarMensaje(b) {
  const usuario_id = String(b.usuario_id || '').trim().slice(0, 120);
  if (!usuario_id) throw Object.assign(new Error('falta usuario_id'), { status: 400 });
  const texto = String(b.texto || '').trim().slice(0, 4000);
  const entrantes = (Array.isArray(b.media) ? b.media : []).filter((m) => /^https?:\/\//.test(m?.url || '')).slice(0, 10);
  const palabra = normalizar(texto);
  const reiniciar = b.reiniciar === true || palabra === 'reiniciar';
  const comando = palabra === PALABRA_INICIO || palabra === 'reiniciar';

  let e = await db.activa(usuario_id);
  if (reiniciar && e) { await db.guardar(e.id, { estado: 'cancelada' }); await db.evento(e.id, 'reiniciada'); e = null; }
  let nueva = false;
  if (!e) {
    const u = await db.ultima(usuario_id);
    if (u && u.estado === 'completada' && !comando && Date.now() - new Date(u.actualizado).getTime() < 7 * 864e5) {
      // Entrevista ya cerrada hace poco: se registra lo que diga como comentario y se avisa.
      await db.insertarMensaje(u.id, { rol: 'cliente', contenido: texto || '(media)' });
      await db.evento(u.id, 'comentario_post_cierre', { texto: texto.slice(0, 300) });
      return salida(u, [`Tu página ya está en proceso 🙌. Anoté tu comentario para tomarlo en cuenta. Si quieres empezar una página nueva escribe *${PALABRA_INICIO}*.`], 'nada');
    }
    e = await db.crear({ id: crypto.randomUUID(), usuario_id, canal: b.canal, callback_url: b.callback_url, metadata: b.metadata || {} });
    nueva = true;
    await db.evento(e.id, 'entrevista_creada', { canal: b.canal });
  } else if (b.callback_url || b.metadata) {
    const cambios = { callback_url: b.callback_url || e.callback_url, metadata: { ...(e.metadata || {}), ...(b.metadata || {}) } };
    await db.guardar(e.id, cambios);
    Object.assign(e, cambios);
  }

  const regresaDePausa = !nueva && Date.now() - new Date(e.ultimo_contacto).getTime() > PAUSA_MS;
  if (regresaDePausa && e.estado === 'pausada') { await db.guardar(e.id, { estado: 'en_curso' }); e.estado = 'en_curso'; }

  // Registrar el mensaje del cliente (texto + cada media como mensaje y asset).
  const assetsPrevios = await db.assetsDe(e.id);
  let n = assetsPrevios.length;
  const nuevosAssets = [];
  if (texto) await db.insertarMensaje(e.id, { rol: 'cliente', tipo: 'texto', contenido: texto, bloque: e.bloque_actual });
  for (const m of entrantes) {
    const tipo = tipoMedia(m.tipo, m.mime);
    if (tipo === 'audio') {
      const t = await transcribirAudio(m.url);
      await db.insertarMensaje(e.id, { rol: 'cliente', tipo: 'audio', contenido: t?.texto ? null : '[audio sin transcripción]', transcripcion: t?.texto || null, bloque: e.bloque_actual });
      continue;
    }
    if (tipo === 'ubicacion') {
      await db.insertarMensaje(e.id, { rol: 'cliente', tipo: 'ubicacion', contenido: `[ubicación] ${m.url}${m.caption ? ` ${m.caption}` : ''}`, bloque: e.bloque_actual });
      continue;
    }
    const clave = `a${++n}`;
    const desc = tipo === 'imagen' ? await describirImagen(m.url) : null;
    const contenido = `[${tipo} ${clave}${m.caption ? `: ${m.caption}` : ''}${desc ? ` — ${desc.descripcion} (calidad ${desc.calidad})` : ''}]`;
    const msgId = await db.insertarMensaje(e.id, { rol: 'cliente', tipo, contenido, bloque: e.bloque_actual });
    const a = await db.insertarAsset(e.id, { mensaje_id: msgId, clave, tipo: desc?.tipo || (tipo === 'documento' ? 'documento' : tipo === 'video' ? 'video' : 'foto_otro'), url: m.url, mime: m.mime, nota: m.caption, descripcion_ia: desc?.descripcion, calidad: desc?.calidad, usar: desc?.calidad !== 'mala' });
    nuevosAssets.push(a);
  }
  if (!texto && !entrantes.length) await db.insertarMensaje(e.id, { rol: 'sistema', contenido: nueva ? '(inició la conversación)' : '(mensaje vacío)' });

  const responder = async (mensajes, esperando) => {
    for (const m of mensajes) await db.insertarMensaje(e.id, { rol: 'agente', contenido: m, bloque: e.bloque_actual });
    return salida(e, mensajes, esperando);
  };

  // Palabra de inicio a mitad de una entrevista: instrucciones + retomar.
  if (!nueva && palabra === PALABRA_INICIO && !entrantes.length) {
    const prev = await db.ultimosMensajes(e.id, 12);
    const pendiente = [...prev].reverse().find((m) => m.rol === 'agente' && m.contenido?.includes('?'));
    return responder([INSTRUCCIONES.replace('¡Empecemos! 👇', '').trim(), pendiente ? `Seguimos donde nos quedamos 👇\n\n${pendiente.contenido}` : 'Seguimos donde nos quedamos 👇'], 'texto');
  }

  const mensajes = [];
  if (nueva) mensajes.push(INSTRUCCIONES);
  const [mensajesRecientes, arquetipos] = await Promise.all([db.ultimosMensajes(e.id, 8), db.arquetipos()]);
  const assets = [...assetsPrevios, ...nuevosAssets];
  const bloqueAnterior = e.bloque_actual;

  const t = await turnoAri(e, { mensajesRecientes, ultimoTexto: texto, regresaDePausa, arquetipos, assets });
  const brief = mergeProfundo(e.brief || {}, t.briefPatch);
  // Validar arquetipo/subtipo contra la tabla.
  if (brief.negocio?.arquetipo && !arquetipos.some((a) => a.slug === brief.negocio.arquetipo)) brief.negocio.arquetipo = 'generico';
  const arq = arquetipos.find((a) => a.slug === brief.negocio?.arquetipo);
  if (brief.negocio?.subtipo && !(arq?.subtipos && brief.negocio.subtipo in arq.subtipos)) brief.negocio.subtipo = null;
  if (t.assetsPatch.length) await db.actualizarAssets(e.id, t.assetsPatch);

  const cambios = { brief, bloque_actual: t.bloque, pendientes_bloque: t.pendientes, arquetipo_slug: brief.negocio?.arquetipo || null, nombre: brief.cliente?.nombre || e.nombre };
  await db.guardar(e.id, cambios);
  Object.assign(e, cambios);
  mensajes.push(t.reply);

  const demasiado = e.mensajes_cliente + 1 >= MAX_MSGS_CLIENTE;
  if (!t.completado && !demasiado) {
    const res = await responder(mensajes, e.bloque_actual === 'B8' ? 'media' : 'texto');
    // Memoria en segundo plano: cierre de bloque o ventana de 10 mensajes.
    tocaActualizar(e, bloqueAnterior).then((d) => d && actualizarMemoria(e.id, d)).catch((err) => console.error('memoria', err));
    return res;
  }

  // Cierre: última memoria (síncrona), decisión de plataforma y callback.
  await actualizarMemoria(e.id, 'cierre').catch((err) => console.error('memoria cierre', err));
  const plataforma = await decidirPlataforma(brief);
  // Capa 2 de subtipo: confirma el de Ari o lo infiere por keywords; queda en el brief para el generador.
  const sub = resolverSubtipo(brief, arquetipos);
  // Densidad por defecto según arquetipo si Ari no la fijó.
  const DENSIDAD = { restaurante: 'compacta', tienda: 'compacta', turismo: 'aireada', servicios: 'aireada' };
  const marca = { ...(brief.marca || {}) };
  if (!marca.densidad) marca.densidad = DENSIDAD[sub.arquetipo] || 'media';
  if (!marca.efectos) marca.efectos = 'sobrio';
  // Estudio de ligas de referencia (web → render /v1/estudiar; Figma → REST). No bloquea el cierre si falla.
  marca.referencias_estudio = await estudiarReferencias(brief).catch(() => []);
  const briefFinal = { ...brief, marca, negocio: { ...(brief.negocio || {}), arquetipo: sub.arquetipo, subtipo_resuelto: sub.subtipo, subtipo_fuente: sub.fuente }, plataforma };
  await db.evento(e.id, 'subtipo_resuelto', sub);
  await db.guardar(e.id, { brief: briefFinal, estado: 'completada' });
  e.brief = briefFinal; e.estado = 'completada';
  await db.evento(e.id, 'entrevista_completada', { plataforma: plataforma.plataforma, demasiado });
  const res = await responder(mensajes, 'nada');
  const final = await db.obtener(e.id);
  notificar(e, { evento: 'entrevista_completada', sesion_id: e.id, usuario_id, canal: e.canal, brief: briefFinal, memoria: final.memoria, assets: await db.assetsDe(e.id), metadata: e.metadata }).catch(() => {});
  return res;
}

export { notificar };
