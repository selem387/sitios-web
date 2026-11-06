// Ari: conduce la entrevista por mensajes (mismo contrato que creador_video/entrevista).
import { coloresDePalabras } from '../generador/materiales.js';
import { contextoColorParaAri } from '../generador/asesor_color.js';
import { paresTipograficos } from '../generador/fuentes.js';
import crypto from 'node:crypto';
import { config } from '../config.js';
import * as db from './db.js';
import { pedirJSON, describirImagen, transcribirAudio, MODELO_ARI } from './claude.js';
import { actualizarMemoria, tocaActualizar } from './memoria.js';
import { BLOQUES, TOTAL_BLOQUES, PALABRA_INICIO, INSTRUCCIONES, SISTEMA_ARI, GUIA_BLOQUES, BRIEF_VACIO, ESQUEMA_SALIDA_ARI, SISTEMA_PLATAFORMA, ESQUEMA_PLATAFORMA } from './prompts.js';
import { isObject } from '../util.js';
import { resolverSubtipo } from './subtipo.js';
import { estudiarReferencias } from './referencias.js';
import { propuestasPendientes, tocaPropuestas, atenderPropuestas, iniciarPropuestas } from './propuestas.js';
import { verificacionPendiente, atenderVerificacion, enviarVerificacion, correoCambio, faltaCorreo } from './verificacion.js';
import { normalizarRedes, redesFaltantes, listaNombres } from './redes.js';
import { redesEnCurso, atenderRedes } from './entrega.js';
import { dominioEnCurso, atenderDominio, notaParaAri, quiereRetomar, retomarDominio, leerFlujo, borrarFlujo } from './dominio.js';
import { limpiarDominio } from '../dominio/registrador.js';
import { sitioEditable, estadoCambios, registrarPedido, clasificarMensaje } from './cambios.js';
import { avisarEquipo } from './avisos.js';
import { dominioRespondido, quiereDominio, PREGUNTA_DOMINIO, mensajePago, pagoPendiente, atenderPostCierre } from './pago_pagina.js';

// Tope de seguridad (fotos y audios cuentan como mensajes). Una entrevista real ronda 60–130.
const MAX_MSGS_CLIENTE = 400;
const PAUSA_MS = 2 * 3600 * 1000;
const CIERRE_POR_TOPE = 'Ya tengo todo lo necesario para armar tu página 🙌. Empiezo ahora mismo con lo que me contaste; en unos minutos te mando la liga aquí. Cuando la veas me dices qué ajustar.';

// Una cola por usuario para que los mensajes rápidos (varias fotos) no se pisen.
const colas = new Map();
export function enSerie(clave, fn) {
  const previa = colas.get(clave) || Promise.resolve();
  const sig = previa.catch(() => {}).then(fn);
  colas.set(clave, sig.finally(() => { if (colas.get(clave) === sig) colas.delete(clave); }));
  return sig;
}

const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
// "reiniciar" (o frases cortas como "quiero empezar de cero", "borra todo") borra el avance y empieza desde cero.
const REINICIO = /\b(reinici\w*|empe[zc]\w* de (cero|nuevo)|comen[zc]\w* de (cero|nuevo)|inici\w* de (cero|nuevo)|borr\w* todo)\b/;
function quiereReiniciar(texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (t.replace(/ /g, '') === 'reiniciar') return true;
  return t.split(' ').length <= 6 && REINICIO.test(t) && !/\bno\b/.test(t);
}
export { quiereReiniciar };

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
    sesion_id: e.id, usuario_id: e.usuario_id, estado: e.estado, nombre: e.nombre || e.brief?.cliente?.nombre || null,
    bloque: e.bloque_actual, paso: idx, total_pasos: TOTAL_BLOQUES,
    esperando, respuestas, metadata: e.metadata || {},
  };
}

// Respuesta a mensajes que llegan después de cerrar la entrevista: según el estado real del sitio, sin repetir el mismo texto.
// Con el sitio listo, el cliente siempre puede pedir cambios desde el primer mensaje (no se ofrece empezar otra página).
const SIN_ACENTOS = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const PIDE_CAMBIOS = /\b(correcc\w*|correg\w*|cambi\w*|modific\w*|ajust\w*|arregl\w*|edit\w*|actualiz\w*|mejor\w*)\b/;
const ALGO_CONCRETO = /\b(foto\w*|imagen\w*|color\w*|texto\w*|titulo\w*|frase\w*|precio\w*|telefono\w*|numero\w*|horario\w*|seccion\w*|logo\w*|letra\w*|fuente\w*|boton\w*|direccion\w*|correo\w*|whatsapp|menu\w*|servicio\w*|producto\w*|paquete\w*|nombre\w*|redes|instagram|facebook|tiktok|fondo\w*|testimonio\w*|pregunta\w*|mapa|ubicacion|que diga|en vez de|por favor pon|quita\w*|agrega\w*|pon\w*)\b/;
// "quiero hacer unas correcciones" (sin decir cuáles) → se le pregunta qué quiere cambiar.
export const pideCambiosSinDetalle = (texto) => { const t = SIN_ACENTOS(texto); return !!t && t.split(' ').length <= 14 && PIDE_CAMBIOS.test(t) && !ALGO_CONCRETO.test(t); };

async function respuestaPostCierre(u, texto = '', media = []) {
  const s = (await db.q(`SELECT estado, url_publica FROM sitios WHERE entrevista_id=$1 ORDER BY id DESC LIMIT 1`, [u.id]).catch(() => ({ rows: [] }))).rows[0];
  const previos = await db.ultimosMensajes(u.id, 6).catch(() => []);
  const ultimoAgente = [...previos].reverse().find((m) => m.rol === 'agente')?.contenido || '';
  const adm = u.brief?.administracion;
  // Página publicada en WordPress: los cambios que pide se aplican solos (cambios.js).
  if (await sitioEditable(u.id)) {
    const est = await estadoCambios(u.id);
    let tipo;
    if (media.length) tipo = 'cambio';
    else {
      const cl = await clasificarMensaje(u.id, texto, { abierto: est.abierto });
      tipo = cl?.tipo || (pideCambiosSinDetalle(texto) ? 'sin_detalle' : 'cambio');
      if (tipo === 'otro') return cl?.respuesta || '¡Con gusto! 🙌 Si quieres cambiar algo de tu página, dime qué y lo ajusto.';
    }
    if (tipo === 'sin_detalle') {
      const panel = adm?.estado === 'entregado' && adm.url ? `\n(También puedes cambiar precios, fotos u horarios tú mismo en tu administrador: ${adm.url})` : '';
      return `¡Claro! 🙌 Dime qué quieres cambiar de tu página: textos, fotos, colores, letra, secciones, precios, datos de contacto… Puedes escribirlo, mandarme un audio o fotos. Si son varias cosas, mándamelas todas y las aplico juntas.${panel}`;
    }
    const r = await registrarPedido(u.id, { texto, media });
    if (r.enCurso) return 'Anotado ✅ En cuanto termine el cambio anterior aplico este y te aviso aquí.';
    if (!r.nuevo) return 'Anotado ✅ También lo incluyo.';
    return 'Anotado ✅ En un par de minutos lo aplico a tu página y te mando la liga aquí. Si quieres cambiar algo más, mándamelo ahora y lo incluyo.';
  }
  let base;
  if (adm?.estado === 'entregado' && adm.url) base = `Tu página ya está publicada. Para cambiar precios, productos, fotos u horarios entra a tu administrador: ${adm.url}\nSi necesitas algo más, ya anoté tu comentario y el equipo lo revisa.`;
  else if (s?.estado === 'listo' && s.url_publica) {
    // Sitio en vivo (no WordPress): el comentario queda para el equipo.
    if (pideCambiosSinDetalle(texto)) return '¡Claro! 🙌 Dime qué quieres cambiar de tu página: textos, fotos, colores, secciones, precios, datos de contacto… Puedes escribirlo, mandarme un audio o fotos.';
    await avisarEquipo('Cambio pedido en sitio en vivo', `${u.brief?.negocio?.nombre || u.id}: ${texto || '(fotos)'}`, u.id).catch(() => {});
    base = 'Anotado ✅ Lo paso para ajustar tu página y te aviso aquí en cuanto quede.';
  }
  else if (s?.estado === 'requiere_revision') base = 'Tu página ya está armada y el equipo la está revisando antes de mostrártela. Te mando la liga en cuanto quede; ya anoté tu comentario.';
  else if (s?.estado === 'error') base = 'Hubo un problema al armar tu página y el equipo ya lo está revisando. Te aviso aquí en cuanto quede; ya anoté tu comentario.';
  else base = 'Sigo armando tu página; en cuanto quede te mando la liga aquí. Ya anoté tu comentario.';
  if (ultimoAgente.startsWith(base)) return 'Anotado 👍';
  return base;
}

// Fotos y audios que manda después de cerrar la entrevista: se guardan como assets (para usarlos en los cambios).
async function registrarMediaPostCierre(u, entrantes) {
  let n = (await db.assetsDe(u.id)).length;
  const claves = [];
  const audios = [];
  for (const m of entrantes) {
    const tipo = tipoMedia(m.tipo, m.mime);
    if (tipo === 'audio') {
      const t = await transcribirAudio(m.url);
      await db.insertarMensaje(u.id, { rol: 'cliente', tipo: 'audio', contenido: t?.texto ? null : '[audio sin transcripción]', transcripcion: t?.texto || null });
      if (t?.texto) audios.push(t.texto);
      continue;
    }
    if (tipo !== 'imagen') { await db.insertarMensaje(u.id, { rol: 'cliente', tipo, contenido: `[${tipo}] ${m.url}${m.caption ? ` ${m.caption}` : ''}` }); continue; }
    const clave = `a${++n}`;
    const desc = await describirImagen(m.url);
    const msgId = await db.insertarMensaje(u.id, { rol: 'cliente', tipo, contenido: `[imagen ${clave}${m.caption ? `: ${m.caption}` : ''}${desc ? ` — ${desc.descripcion}` : ''}]` });
    await db.insertarAsset(u.id, { mensaje_id: msgId, clave, tipo: desc?.tipo || 'foto_otro', url: m.url, mime: m.mime, nota: m.caption, descripcion_ia: desc?.descripcion, calidad: desc?.calidad, usar: true });
    claves.push(clave);
    if (m.caption) audios.push(m.caption);
  }
  return { claves, textoExtra: audios.join('\n') };
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
  // WordPress suspendido: siempre la opción dinámica, sin consultar al decisor.
  if (!config.wordpressActivo) return { plataforma: 'app', razon: 'WordPress suspendido: todos los sitios se construyen como app (sitio en vivo + panel propio).', senales: [], modulos_dinamicos: [] };
  try {
    const r = await pedirJSON({ system: SISTEMA_PLATAFORMA, contenido: `BRIEF:\n${JSON.stringify(brief)}`, schema: ESQUEMA_PLATAFORMA, max_tokens: 600 });
    return r.data;
  } catch (err) {
    return { plataforma: 'app', razon: `Por defecto (no se pudo decidir: ${err.message})`, senales: [], modulos_dinamicos: [] };
  }
}

async function turnoAri(e, { mensajesRecientes, ultimoTexto, regresaDePausa, arquetipos, assets, notaAri = null }) {
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
  if (bloque === 'B5') {
    // Asesor de color: evalúa los colores que dio y trae tendencias 2026–2027 de su giro con letras coherentes.
    try {
      const coloresCliente = coloresDePalabras(brief.marca?.colores || []);
      partes.push(contextoColorParaAri({ brief, coloresCliente, pares: paresTipograficos(brief.marca?.estilo || 'calido', brief, 18) }));
    } catch (err) { console.error('asesor color', err.message); }
  }
  if (bloque === 'B11' && brief.negocio?.arquetipo) partes.push(`ARQUETIPO ASIGNADO: ${brief.negocio.arquetipo}`);
  if (assets.length) partes.push(`ASSETS recibidos:\n${assets.map((a) => `${a.clave} [${a.tipo}, ${a.calidad || '?'}, usar=${a.usar}] ${a.descripcion_ia || a.nota || ''}`).join('\n')}`);
  if (verificacionPendiente(brief)) partes.push(`VERIFICACION_CORREO: pendiente (código enviado a ${brief.contacto.email})`);
  if (bloque === 'B12') {
    const faltan = redesFaltantes(brief);
    partes.push(`REDES QUE FALTAN: ${faltan.length ? listaNombres(faltan) : '(ninguna; no hagas la pregunta B12.2)'}`);
  }
  const notaDominio = notaParaAri(brief);
  if (notaDominio) partes.push(notaDominio);
  if (notaAri) partes.push(`NOTA DEL SISTEMA: ${notaAri}`);
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
  const reiniciar = b.reiniciar === true || quiereReiniciar(texto);
  const comando = palabra === PALABRA_INICIO || reiniciar;

  let e = await db.activa(usuario_id);
  if (reiniciar && e) { await db.guardar(e.id, { estado: 'cancelada' }); await db.evento(e.id, 'reiniciada'); e = null; }
  const textoTurno = reiniciar ? '' : texto; // la palabra de reinicio no se le pasa a Ari como respuesta
  let nueva = false;
  if (!e) {
    const u = await db.ultima(usuario_id);
    // Ayuda con las redes después de entregar el acceso (hasta 30 días).
    if (u && u.estado === 'completada' && !comando && redesEnCurso(u.brief) && texto) {
      await db.insertarMensaje(u.id, { rol: 'cliente', contenido: texto });
      const rs = (await atenderRedes(u, texto)).filter(Boolean);
      for (const r of rs) await db.insertarMensaje(u.id, { rol: 'agente', contenido: r });
      return salida(u, rs, 'texto');
    }
    // Pago de la página y dirección (después del cierre): reenviar enlace, "ya pagué", pasos de la dirección.
    if (u && u.estado === 'completada' && !comando && texto && u.brief?.pago_pagina) {
      const rs = await atenderPostCierre(u, texto).catch((err) => { console.error('pago/dirección post cierre', err); return null; });
      if (rs?.length) {
        await db.insertarMensaje(u.id, { rol: 'cliente', contenido: texto });
        for (const r of rs) await db.insertarMensaje(u.id, { rol: 'agente', contenido: r });
        return salida(u, rs, 'texto');
      }
    }
    if (u && u.estado === 'completada' && !comando && (Date.now() - new Date(u.actualizado).getTime() < 7 * 864e5 || await sitioEditable(u.id))) {
      // Entrevista ya cerrada (o con página publicada): los cambios que pida se aplican a su página; si no, se responde según el estado del sitio.
      if (texto) await db.insertarMensaje(u.id, { rol: 'cliente', contenido: texto });
      const md = entrantes.length ? await registrarMediaPostCierre(u, entrantes) : { claves: [], textoExtra: '' };
      const textoTodo = [texto, md.textoExtra].filter(Boolean).join('\n');
      await db.evento(u.id, 'comentario_post_cierre', { texto: textoTodo.slice(0, 300), media: md.claves });
      const r = await respuestaPostCierre(u, textoTodo, md.claves);
      await db.insertarMensaje(u.id, { rol: 'agente', contenido: r });
      return salida(u, [r], 'nada');
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
  if (textoTurno) await db.insertarMensaje(e.id, { rol: 'cliente', tipo: 'texto', contenido: textoTurno, bloque: e.bloque_actual });
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

  // Propuestas visuales pendientes (faltan materiales, esperando elección A/B/C o rehacer): se atienden antes que Ari.
  const responderConMedia = async (textos, media = []) => {
    for (const m of media) await db.insertarMensaje(e.id, { rol: 'agente', tipo: 'imagen', contenido: `[${m.caption || 'imagen'}] ${m.url}`, bloque: e.bloque_actual });
    const r = await responder(textos, 'texto');
    r.media = media;
    return r;
  };
  const prefijo = [];
  if (!nueva && propuestasPendientes(e.brief)) {
    try {
      const r = await atenderPropuestas(e, e.brief || {}, { texto, huboMedia: nuevosAssets.length > 0 });
      if (r.brief !== e.brief) { await db.guardar(e.id, { brief: r.brief }); e.brief = r.brief; }
      if (!r.seguirConAri) return responderConMedia(r.responder.textos, r.responder.media);
      if (r.responder?.textos) prefijo.push(...r.responder.textos);
    } catch (err) {
      console.error('propuestas', err);
      return responder(['Dame un momento, estoy terminando de preparar tus propuestas. Escríbeme de nuevo en un par de minutos 🙏'], 'texto');
    }
  }

  // Dirección de la página (B10): opciones, a nombre de quién, condiciones, pago, "listo". Se atiende antes que Ari.
  let notaAri = null;
  if (!nueva && texto && (dominioEnCurso(e.brief) || quiereRetomar(e.brief, texto))) {
    try {
      const r = dominioEnCurso(e.brief) ? await atenderDominio(e, e.brief || {}, texto) : await retomarDominio(e, e.brief || {});
      e.brief = (await db.obtener(e.id)).brief; // el flujo se guarda de forma atómica; se recarga
      if (!r.seguirConAri) return responder([...prefijo, ...r.textos], 'texto');
      prefijo.push(...r.textos);
      notaAri = r.notaAri || null;
    } catch (err) {
      console.error('dominio', err);
      return responder([...prefijo, 'Dame un momento, estoy revisando lo de tu dirección. Escríbeme de nuevo en un par de minutos 🙏'], 'texto');
    }
  }

  // Código de verificación del correo pendiente: se atiende antes que Ari (código, correo nuevo o "no me llegó").
  if (!nueva && verificacionPendiente(e.brief) && texto) {
    const r = await atenderVerificacion(e, e.brief || {}, texto);
    if (r.brief !== e.brief) { await db.guardar(e.id, { brief: r.brief }); e.brief = r.brief; }
    if (!r.seguirConAri) return responder([...prefijo, ...r.textos], 'texto');
    prefijo.push(...r.textos);
    notaAri = r.notaAri || notaAri;
  }

  const mensajes = [...prefijo];
  if (nueva && reiniciar) mensajes.push('Listo, borré todo el avance y empezamos de cero 🔄');
  if (nueva) mensajes.push(INSTRUCCIONES);
  const [mensajesRecientes, arquetipos] = await Promise.all([db.ultimosMensajes(e.id, 8), db.arquetipos()]);
  const assets = [...assetsPrevios, ...nuevosAssets];
  const bloqueAnterior = e.bloque_actual;

  const t = await turnoAri(e, { mensajesRecientes, ultimoTexto: textoTurno, regresaDePausa, arquetipos, assets, notaAri });
  const brief = mergeProfundo(e.brief || {}, t.briefPatch);
  // El estado de las propuestas lo maneja solo propuestas.js; Ari no puede tocarlo (antes lo pisaba con "pendiente").
  if (brief.marca) { if (e.brief?.marca?.propuestas) brief.marca.propuestas = e.brief.marca.propuestas; else delete brief.marca.propuestas; }
  if (brief.marca && e.brief?.marca?.vistazo) brief.marca.vistazo = e.brief.marca.vistazo; else if (brief.marca) delete brief.marca.vistazo;
  // La verificación del correo la maneja solo verificacion.js; Ari no puede marcarla.
  if (brief.contacto) {
    brief.contacto.email_verificado = e.brief?.contacto?.email_verificado === true;
    brief.contacto.email_verificacion = e.brief?.contacto?.email_verificacion || null;
    if (brief.contacto.redes) brief.contacto.redes = normalizarRedes(brief.contacto.redes);
  }
  // La dirección la lleva solo dominio.js (escritura atómica): se toma de la base, Ari no puede tocar el flujo.
  const flujoDb = await leerFlujo(e.id);
  brief.tecnico = { ...(brief.tecnico || {}) };
  if (flujoDb?.modo === 'propio' && brief.tecnico.dominio && limpiarDominio(brief.tecnico.dominio) !== flujoDb.dominio && !['conectando', 'lista'].includes(flujoDb.estado)) {
    await borrarFlujo(e.id); // corrigió la dirección: se vuelve a investigar
    delete brief.tecnico.dominio_flujo;
  } else if (flujoDb) {
    brief.tecnico.dominio_flujo = flujoDb;
    if (flujoDb.modo === 'compra' && ['registrada', 'conectando', 'lista'].includes(flujoDb.estado)) { brief.tecnico.tiene_dominio = true; brief.tecnico.dominio = flujoDb.dominio; }
  } else delete brief.tecnico.dominio_flujo;
  // Validar arquetipo/subtipo contra la tabla.
  if (brief.negocio?.arquetipo && !arquetipos.some((a) => a.slug === brief.negocio.arquetipo)) brief.negocio.arquetipo = 'generico';
  const arq = arquetipos.find((a) => a.slug === brief.negocio?.arquetipo);
  if (brief.negocio?.subtipo && !(arq?.subtipos && brief.negocio.subtipo in arq.subtipos)) brief.negocio.subtipo = null;
  if (t.assetsPatch.length) await db.actualizarAssets(e.id, t.assetsPatch);

  // Correo nuevo o corregido → mandar código (el mensaje va después de la respuesta de Ari).
  let avisoCorreo = null;
  if (correoCambio(e.brief, brief)) {
    const r = await enviarVerificacion(e, brief);
    Object.assign(brief, r.brief);
    avisoCorreo = r.texto;
  }
  // No se cierra la entrevista sin correo confirmado ni sin contestar la oferta de redes.
  if (t.completado) {
    const falta = faltaCorreo(brief);
    const faltanRedes = redesFaltantes(brief);
    if (falta === 'sin_email') {
      t.completado = false; t.bloque = 'B12';
      t.reply = 'Antes de armar tu página me falta tu correo: con él vas a entrar a administrarla (precios, productos, fotos) sin contraseña, con un código que te llega ahí. ¿Cuál es?';
    } else if (falta === 'sin_verificar' || avisoCorreo) {
      t.completado = false; t.bloque = 'B12';
      if (!avisoCorreo) t.reply = `Solo me falta que me escribas el código de 6 números que te mandé a *${brief.contacto.email}* para confirmar tu correo. Si no te llegó, escríbeme *reenviar*.`;
    } else if (faltanRedes.length && (brief.redes_crear?.interesa === null || brief.redes_crear?.interesa === undefined)) {
      t.completado = false; t.bloque = 'B12';
      t.reply = `Una última cosa: no tienes ${listaNombres(faltanRedes)}. Tenerlas te ayuda a que te encuentren y a publicar tus productos y promociones. Al terminar tu página te puedo guiar paso a paso para crearlas, y si se te complica, alguien de nuestro equipo te las crea. ¿Te interesa?`;
    } else if (!dominioRespondido(brief)) {
      // La dirección es siempre la última pregunta antes de armar la página.
      t.completado = false; t.bloque = 'B12';
      t.reply = PREGUNTA_DOMINIO;
    }
  }
  // Cierre: tras la dirección, el enlace de pago para alojarla en su dominio y el aviso de que se arma la página.
  if (t.completado) {
    const cierre = 'Mientras tanto ya estoy armando tu página: en unos minutos te mando la liga para que la veas desde tu celular. Después me dices qué ajustar; los primeros cambios van incluidos.';
    if (quiereDominio(brief)) {
      brief.pago_pagina = pagoPendiente(e.id);
      t.reply = `${mensajePago(e.id)}\n\n${cierre} En cuanto se refleje tu pago seguimos con tu dirección.`;
    } else t.reply = `Va 👍 ${cierre} Cuando quieras tu propia dirección, escríbeme *comprar dirección*.`;
  }

  const cambios = { brief, bloque_actual: t.bloque, pendientes_bloque: t.pendientes, arquetipo_slug: brief.negocio?.arquetipo || null, nombre: brief.cliente?.nombre || e.nombre };
  await db.guardar(e.id, cambios);
  Object.assign(e, cambios);
  // Al salir de B6 (fotos): revisar materiales y mandar las 3 propuestas, o pedir mejores imágenes.
  if (!t.completado && tocaPropuestas(e.brief, bloqueAnterior, t.bloque)) {
    try {
      const r = await iniciarPropuestas(e, e.brief);
      await db.guardar(e.id, { brief: r.brief }); e.brief = r.brief;
      return responderConMedia([...mensajes, ...r.responder.textos], r.responder.media);
    } catch (err) { console.error('iniciarPropuestas', err); }
  }
  // La dirección ya no arranca aquí: es la última pregunta y su flujo empieza al confirmarse el pago de la página (pago_pagina.js).
  const demasiado = !t.completado && e.mensajes_cliente + 1 >= MAX_MSGS_CLIENTE;
  // Cierre forzado por tope: nunca dejar una pregunta de Ari sin respuesta posible.
  mensajes.push(demasiado ? CIERRE_POR_TOPE : t.reply);
  if (avisoCorreo && !demasiado) mensajes.push(avisoCorreo);

  if (!t.completado && !demasiado) {
    const res = await responder(mensajes, e.bloque_actual === 'B6' ? 'media' : 'texto');
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
  const faltantes = redesFaltantes(brief);
  const contacto = { ...(brief.contacto || {}), redes_faltantes: faltantes };
  const redesCrear = { interesa: brief.redes_crear?.interesa ?? null, redes: (brief.redes_crear?.redes?.length ? brief.redes_crear.redes : faltantes).filter((r) => faltantes.includes(r)) };
  // Acceso del dueño (único administrador): se entrega cuando el sitio queda en su dominio con HTTPS (paso "listo" de dominios).
  const email = contacto.email || null;
  const administracion = {
    email,
    metodos: ['codigo_correo', ...(/@(gmail|googlemail)\.com$/i.test(email || '') ? ['google'] : [])],
    panel: plataforma.plataforma === 'wordpress' ? 'wp-admin' : 'panel_propio',
    email_verificado: contacto.email_verificado === true,
    estado: 'pendiente_entrega',
  };
  const briefFinal = { ...brief, marca, contacto, redes_crear: redesCrear, administracion, negocio: { ...(brief.negocio || {}), arquetipo: sub.arquetipo, subtipo_resuelto: sub.subtipo, subtipo_fuente: sub.fuente }, plataforma };
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
