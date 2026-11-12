// Ari: conduce la entrevista por mensajes (mismo contrato que creador_video/entrevista).
import { coloresDePalabras } from '../generador/materiales.js';
import { contextoColorParaAri } from '../generador/asesor_color.js';
import { paresTipograficos } from '../generador/fuentes.js';
import crypto from 'node:crypto';
import { config } from '../config.js';
import * as db from './db.js';
import { pedirJSON, describirImagen, interpretarImagenCambio, transcribirAudio, MODELO_ARI } from './claude.js';
import { actualizarMemoria, tocaActualizar } from './memoria.js';
import { BLOQUES, TOTAL_BLOQUES, PALABRA_INICIO, INSTRUCCIONES, SISTEMA_ARI, GUIA_BLOQUES, BRIEF_VACIO, ESQUEMA_SALIDA_ARI, SISTEMA_PLATAFORMA, ESQUEMA_PLATAFORMA } from './prompts.js';
import { isObject } from '../util.js';
import { resolverSubtipo } from './subtipo.js';
import { estudiarReferencias } from './referencias.js';
import { propuestasPendientes, ajusteElegida, tocaPropuestas, atenderPropuestas, iniciarPropuestas } from './propuestas.js';
import { verificacionPendiente, atenderVerificacion, enviarVerificacion, correoCambio, faltaCorreo } from './verificacion.js';
import { normalizarRedes, redesFaltantes, listaNombres } from './redes.js';
import { redesEnCurso, atenderRedes } from './entrega.js';
import { dominioEnCurso, atenderDominio, notaParaAri, quiereRetomar, retomarDominio, leerFlujo, borrarFlujo } from './dominio.js';
import { limpiarDominio } from '../dominio/registrador.js';
import { paginaEditable, estadoCambios, registrarPedido, clasificarMensaje } from './cambios.js';
import { alElegir } from '../panel/rehacer.js';
import { avisarEquipo } from './avisos.js';
import { notaRequisitos, primerBloqueIncompleto, faltantes, unirNoTiene, noTieneDelHistorial, preguntaYaNegada, rellenarDelHistorial, omitidasDelHistorial } from './requisitos.js';
import { atenderExtraccion, asegurarResumen } from './redes_extraccion.js';
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
  colas.set(clave, sig.catch(() => {}).finally(() => { if (colas.get(clave) === sig) colas.delete(clave); }));
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
    // Un null, "" o [] del modelo no borra un dato que ya teníamos (caso JIGA, 9-nov-2026: la ciudad y las zonas
    // se perdían cuando Ari mandaba el bloque completo con campos vacíos y se volvían a preguntar).
    const vacioV = v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
    const lleno = out[k] !== null && out[k] !== undefined && !(typeof out[k] === 'string' && !out[k].trim()) && !(Array.isArray(out[k]) && !out[k].length);
    if (vacioV && lleno) continue;
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

/** Guarda (o borra con null) brief.marca.rediseno_pendiente: esperando que diga qué no le gustó de sus opciones. */
const rediseñoPendiente = (id, valor) => db.q(`UPDATE entrevistas SET brief = jsonb_set(brief, '{marca,rediseno_pendiente}', $2::jsonb, true), actualizado=now() WHERE id=$1`, [id, JSON.stringify(valor)]);

async function respuestaPostCierre(u, texto = '', media = []) {
  const s = (await db.q(`SELECT estado, url_publica FROM sitios WHERE entrevista_id=$1 AND estado<>'reemplazado' ORDER BY id DESC LIMIT 1`, [u.id]).catch(() => ({ rows: [] }))).rows[0];
  const previos = await db.ultimosMensajes(u.id, 6).catch(() => []);
  const ultimoAgente = [...previos].reverse().find((m) => m.rol === 'agente')?.contenido || '';
  const adm = u.brief?.administracion;
  // Página publicada (sitio en vivo o WordPress): los cambios que pide se aplican solos (cambios.js / cambios_vivo.js).
  if (await paginaEditable(u.id)) {
    const est = await estadoCambios(u.id);
    let tipo;
    // Esperando que diga qué no le gustó de sus opciones: este mensaje es su respuesta.
    const rp = u.brief?.marca?.rediseno_pendiente;
    if (rp && !media.length && Date.now() - new Date(rp.desde).getTime() < 3 * 864e5) tipo = 'nuevas_opciones';
    else if (media.length) tipo = 'cambio';
    else {
      const cl = await clasificarMensaje(u.id, texto, { abierto: est.abierto });
      tipo = cl?.tipo || (pideCambiosSinDetalle(texto) ? 'sin_detalle' : 'cambio');
      if (tipo === 'otro') return cl?.respuesta || '¡Con gusto! 🙌 Si quieres cambiar algo de tu página, dime qué y lo ajusto.';
    }
    if (tipo === 'nuevas_opciones') {
      const { prepararOpcionesNuevas, ligasReferencia } = await import('../panel/rediseno.js');
      const { entenderRechazo, PREGUNTA_RECHAZO } = await import('./propuestas.js');
      // Lo que pidió en sus últimos mensajes (estilo, ligas de referencia) se usa para las nuevas.
      const recientes = (await db.ultimosMensajes(u.id, 16).catch(() => [])).filter((m) => m.rol === 'cliente').map((m) => m.transcripcion || m.contenido || '');
      const comentario = [...recientes, texto].filter(Boolean).join('\n').slice(-3000);
      const refs = ligasReferencia(comentario);
      // Antes de rehacer: entender exactamente qué no le gustó; si no está claro, se le pregunta (máximo 2 veces).
      const rp0 = u.brief?.marca?.rediseno_pendiente || { preguntas: 0, comentarios: [] };
      const comentarios = [...rp0.comentarios, texto].filter(Boolean);
      const d = refs.length ? { claro: true } : await entenderRechazo(u.brief || {}, u.brief?.marca?.propuestas || {}, comentarios.length ? comentarios : [comentario]);
      if (d && !d.claro && rp0.preguntas < 2) {
        await rediseñoPendiente(u.id, { desde: rp0.desde || new Date().toISOString(), preguntas: rp0.preguntas + 1, comentarios });
        return rp0.preguntas === 0 && !comentarios.join(' ').trim().split(/\s+/).filter((w) => w.length > 3).length ? PREGUNTA_RECHAZO : (d.pregunta || PREGUNTA_RECHAZO);
      }
      if (u.brief?.marca?.rediseno_pendiente) await rediseñoPendiente(u.id, null);
      const pedido = [comentario, ...comentarios, d?.resumen].filter(Boolean).join('\n').slice(-3000);
      prepararOpcionesNuevas(u.id, { comentario: pedido, referencias: refs }).catch((err) => console.error('rediseno', err));
      await db.evento(u.id, 'pidio_opciones_nuevas', { referencias: refs, entendido: d || null });
      return `${d?.resumen ? `${d.resumen.trim()} ` : ''}¡Va! 🎨 Te preparo opciones nuevas${refs.length ? ' inspiradas en la página que me compartiste' : ''} con eso, con tus textos y tus fotos. En unos minutos te mando aquí las ligas. Tu página se queda como está hasta que elijas.`;
    }
    if (tipo === 'ver_opciones') {
      const prop = u.brief?.marca?.propuestas_nuevas?.estado === 'mostradas' ? u.brief.marca.propuestas_nuevas : (u.brief?.marca?.propuestas || {});
      const opc = (prop.opciones || []).filter((o) => o.url);
      if (opc.length) {
        const sv = (await db.q(`SELECT contenido FROM sitios_vivos WHERE entrevista_id=$1 ORDER BY id DESC LIMIT 1`, [u.id]).catch(() => ({ rows: [] }))).rows[0];
        const actual = sv?.contenido?.diseno?.propuesta || prop.elegido;
        const lista = opc.map((o) => `*${o.letra || o.etiqueta}. ${o.nombre}*${(o.letra || o.etiqueta) === actual ? ' (la que tienes ahora)' : ''}\n${o.url}`).join('\n\n');
        await db.evento(u.id, 'opciones_reenviadas', { actual });
        const ref = (texto.match(/https?:\/\/\S+/g) || []).filter((x) => !/\/p\/[A-Za-z0-9]+\/[A-G]/.test(x));
        await db.evento(u.id, 'pregunta_cambio_diseno', { actual, referencias: ref });
        return `¿Quieres cambiar el diseño de tu página por otra de tus opciones? 😊${ref.length ? ' Revisa cuál se parece más a la página que me compartiste.' : ''}\n\nEstas son:\n\n${lista}\n\nDime la letra de la que quieres. Si ninguna te convence, dime *ninguna* y te preparo 6 nuevas${ref.length ? ' inspiradas en esa página' : ''}. Tus textos, fotos y los cambios que ya hicimos se quedan; solo cambia el diseño.`;
      }
      tipo = 'cambio';
    }
    if (tipo === 'sin_detalle') {
      const panel = adm?.estado === 'entregado' && adm.url ? `\n(También puedes cambiar precios, fotos u horarios tú mismo en tu administrador: ${adm.url})` : '';
      return `¡Claro! 🙌 Dime qué quieres cambiar de tu página: textos, fotos, colores, letra, secciones, precios, datos de contacto… Puedes escribirlo, mandarme un audio o fotos. Si son varias cosas, mándamelas todas y las aplico juntas.${panel}`;
    }
    const r = await registrarPedido(u.id, { texto, media });
    if (r.enCurso) return 'Estoy terminando el cambio anterior 👍 enseguida hago este y te aviso aquí.';
    if (!r.nuevo) return 'Lo sumo al cambio que estoy haciendo 👍';
    return 'Ya lo estoy haciendo 👍 En 1 o 2 minutos te mando aquí la liga para que lo veas.';
  }
  // Falta algo indispensable (fotos, servicios, logo…): no se le hace esperar, se reabre la entrevista y se le pide.
  if (!(s?.estado === 'listo' && s.url_publica)) {
    const f = faltantes(u.brief || {}, await db.assetsDe(u.id));
    if (f.length) {
      await db.guardar(u.id, { estado: 'en_curso', bloque_actual: f[0].bloque });
      await db.evento(u.id, 'entrevista_reabierta', { desde: f[0].bloque, motivo: 'faltan requisitos', faltan: f.map((x) => x.id) });
      return `Para terminar tu página me faltan algunos datos. Empecemos con este:\n\n${f[0].pedir}`;
    }
  }
  const t = SIN_ACENTOS(texto);
  const esPedido = !!t && (PIDE_CAMBIOS.test(t) || ALGO_CONCRETO.test(t)) && !/\?\s*$/.test(String(texto).trim());
  const anotado = esPedido ? ' Ya guardé lo que me pediste para aplicarlo.' : '';
  let base;
  if (adm?.estado === 'entregado' && adm.url) base = `Tu página ya está publicada. Para cambiar precios, productos, fotos u horarios entra a tu administrador: ${adm.url}`;
  else if (s?.estado === 'listo' && s.url_publica) base = 'Tu página ya está lista 🎉: ' + s.url_publica + '\nDime qué quieres ajustar y lo cambio aquí mismo.';
  else if (s?.estado === 'requiere_revision' || s?.estado === 'error') base = 'Todavía no: estoy dando los últimos ajustes a tu página para que quede bien. En cuanto quede te mando la liga aquí.';
  else base = 'Todavía no: sigo armando tu página. En cuanto quede te mando la liga aquí.';
  base += anotado;
  if (ultimoAgente.startsWith(base)) return esPedido ? 'Anotado 👍' : 'Sigue en proceso; en cuanto quede te escribo aquí 🙏';
  return base;
}

// Fotos y audios que manda después de cerrar la entrevista: se guardan como assets (para usarlos en los cambios).
const USOS_REFERENCIA = { captura_pagina: 'captura de tu página', referencia_diseno: 'diseño de referencia', texto_nuevo: 'texto para tu página', duda: 'imagen (¿foto para la página o referencia?)' };
async function registrarMediaPostCierre(u, entrantes, texto = '') {
  let n = (await db.assetsDe(u.id)).length;
  const claves = [];
  const extras = [];
  const editable = await paginaEditable(u.id).catch(() => false);
  const previos = await db.ultimosMensajes(u.id, 8).catch(() => []);
  const historial = previos.map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${(m.transcripcion || m.contenido || '').slice(0, 300)}`).join('\n');
  const sv = editable ? (await db.q(`SELECT slug, dominio FROM sitios_vivos WHERE entrevista_id=$1 ORDER BY id DESC LIMIT 1`, [u.id]).catch(() => ({ rows: [] }))).rows[0] : null;
  const urlPagina = sv ? (sv.dominio ? `https://${sv.dominio}/` : `${config.publicUrl}/s/${sv.slug}`) : '';
  for (const m of entrantes) {
    const tipo = tipoMedia(m.tipo, m.mime);
    if (tipo === 'audio') {
      const t = await transcribirAudio(m.url);
      await db.insertarMensaje(u.id, { rol: 'cliente', tipo: 'audio', contenido: t?.texto ? null : '[audio sin transcripción]', transcripcion: t?.texto || null });
      if (t?.texto) extras.push(t.texto);
      continue;
    }
    if (tipo !== 'imagen') { await db.insertarMensaje(u.id, { rol: 'cliente', tipo, contenido: `[${tipo}] ${m.url}${m.caption ? ` ${m.caption}` : ''}` }); continue; }
    const clave = `a${++n}`;
    const textoJunto = [texto, m.caption].filter(Boolean).join('\n');
    // Con página ya generada: se interpreta para qué la manda (foto o referencia). Antes: descripción normal.
    const it = editable ? await interpretarImagenCambio(m.url, { texto: textoJunto, mismoMensaje: !!textoJunto, historial, urlPagina }) : null;
    const desc = it ? null : await describirImagen(m.url);
    const esFoto = !it || it.uso === 'foto';
    const etiqueta = esFoto ? 'imagen' : USOS_REFERENCIA[it.uso];
    const detalle = it ? [it.descripcion, it.senala ? `Señala: ${it.senala}` : '', it.transcripcion ? `Texto en la imagen: «${it.transcripcion}»` : ''].filter(Boolean).join(' · ') : desc?.descripcion || '';
    const msgId = await db.insertarMensaje(u.id, { rol: 'cliente', tipo, contenido: `[${etiqueta} ${clave}${m.caption ? `: ${m.caption}` : ''}${detalle ? ` — ${detalle}` : ''}]` });
    // Las referencias (capturas, diseños, textos, dudas) nunca se publican: tipo "referencia", usar=false.
    await db.insertarAsset(u.id, {
      mensaje_id: msgId, clave, url: m.url, mime: m.mime, nota: m.caption,
      tipo: esFoto ? (it?.tipo || desc?.tipo || 'foto_otro') : 'referencia',
      descripcion_ia: it ? [`[${it.uso}]`, it.descripcion, it.senala, it.transcripcion ? `Texto: ${it.transcripcion}` : ''].filter(Boolean).join(' ').slice(0, 2000) : desc?.descripcion,
      calidad: it?.calidad || desc?.calidad, usar: esFoto,
    });
    await db.evento(u.id, 'imagen_interpretada', { clave, uso: it?.uso || 'foto', razon: it?.razon || null });
    claves.push(clave);
    if (m.caption) extras.push(m.caption);
    if (!esFoto) extras.push(`[${etiqueta} ${clave}] ${detalle}`);
  }
  return { claves, textoExtra: extras.join('\n') };
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


// Palabras con contenido de la pregunta final de un mensaje (sin saludos ni relleno).
const VACIAS = new Set('el la los las un una unos unas de del a al y o u que qué en con por para tu tus su sus mi me te se lo le les es son estas estás esta está como cómo cual cuál cuales cuáles donde dónde cuando cuándo ya si sí no ustedes usted tú yo nos más muy hay ser estar tienes tiene tienen eres desde estan están ejemplo dime cuéntame cuentame'.split(' '));
function palabrasPregunta(texto) {
  const qs = String(texto || '').match(/¿[^?]*\?/g);
  const base = qs ? qs[qs.length - 1] : '';
  return new Set(base.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zñ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !VACIAS.has(w)));
}
/** Si la pregunta del reply ya se hizo (y se contestó) en esta entrevista, devuelve {pregunta, respuesta}. */
async function preguntaRepetida(entrevistaId, reply) {
  const nueva = palabrasPregunta(reply);
  if (nueva.size < 2) return null;
  const msgs = await db.ultimosMensajes(entrevistaId, 120);
  for (let i = 0; i < msgs.length - 1; i++) {
    const m = msgs[i];
    if (m.rol !== 'agente' || m.tipo === 'imagen') continue;
    const sig = msgs.slice(i + 1).find((x) => x.rol === 'cliente');
    if (!sig) continue;
    const vieja = palabrasPregunta(m.contenido);
    if (vieja.size < 2) continue;
    const comunes = [...nueva].filter((w) => vieja.has(w)).length;
    const menor = Math.min(nueva.size, vieja.size);
    if (comunes / menor >= (menor >= 3 ? 0.6 : 0.7)) {
      const q = String(m.contenido).match(/¿[^?]*\?/g);
      return { pregunta: q ? q[q.length - 1] : m.contenido, respuesta: sig.transcripcion || sig.contenido || '' };
    }
  }
  return null;
}

// Quita un saludo inicial ("¡Hola…", "Hola de nuevo…") si no regresa de una pausa, y deja una sola pregunta:
// todo lo que empieza en la segunda oración con "¿" (al inicio de línea o tras punto) se corta.
export function pulirReply(reply, regresaDePausa) {
  let r = String(reply || '').trim();
  if (!regresaDePausa) {
    const sinSaludo = r.replace(/^¡?\s*hola\b[^\n!]*[!.]?\s*(?:[^\w\s¿¡]{1,4}\s*)?\n?/iu, '').trim();
    if (sinSaludo) r = sinSaludo;
  }
  const abiertas = [...r.matchAll(/(^|\n|[.!?…:]\s+)¿/g)];
  if (abiertas.length > 1) {
    const corte = abiertas[1].index + abiertas[1][1].length;
    const recortado = r.slice(0, corte).trim();
    if (recortado.includes('¿')) r = recortado;
  }
  return r;
}

async function turnoAri(e, { mensajesRecientes, ultimoTexto, regresaDePausa, arquetipos, assets, notaAri = null }) {
  const bloque = BLOQUES.includes(e.bloque_actual) ? e.bloque_actual : 'B0';
  const mem = e.memoria && Object.keys(e.memoria).length ? JSON.stringify(e.memoria, null, 1) : 'vacía';
  const brief = mergeProfundo(BRIEF_VACIO, e.brief || {});
  const historial = mensajesRecientes.map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${m.transcripcion ? `[audio] ${m.transcripcion}` : m.contenido || ''}`).join('\n');
  const hoy = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' });
  const partes = [
    `HOY ES: ${hoy} (si el cliente dice "este año", es ${new Date().getFullYear()})`,
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
  partes.push(notaRequisitos(brief, assets, bloque));
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
  const entrantes = (Array.isArray(b.media) ? b.media : []).filter((m) => /^https?:\/\//.test(m?.url || '')).slice(0, 18);
  const palabra = normalizar(texto);
  const reiniciar = b.reiniciar === true || quiereReiniciar(texto);
  const comando = palabra === PALABRA_INICIO || reiniciar;

  let e = await db.activa(usuario_id);
  if (reiniciar && e) { await db.guardar(e.id, { estado: 'cancelada' }); await db.evento(e.id, 'reiniciada'); e = null; }
  const textoTurno = reiniciar ? '' : texto; // la palabra de reinicio no se le pasa a Ari como respuesta
  let nueva = false;
  if (!e) {
    const u = await db.ultima(usuario_id, { sinCanceladas: true }); // una cancelada después no debe tapar la página ya cerrada
    // Propuestas mandadas después del cierre (sitio rehecho como app): su respuesta elige el diseño y se arma la página.
    if (u && u.estado === 'completada' && !comando && propuestasPendientes(u.brief) && (texto || entrantes.length)) {
      if (texto) await db.insertarMensaje(u.id, { rol: 'cliente', contenido: texto });
      const md = entrantes.length ? await registrarMediaPostCierre(u, entrantes) : { claves: [] };
      const r = await atenderPropuestas(u, u.brief || {}, { texto, huboMedia: md.claves.length > 0, clavesNuevas: md.claves });
      if (r.brief !== u.brief) { await db.guardar(u.id, { brief: r.brief }); u.brief = r.brief; }
      const rs = [...(r.responder?.textos || [])];
      if (r.brief?.marca?.propuestas?.estado === 'elegida') rs.push(...await alElegir(u.id).catch((err) => { console.error('alElegir', err); return ['Dame un momento, estoy terminando tu página; te mando la liga aquí en cuanto quede 🙏']; }));
      for (const t of rs) await db.insertarMensaje(u.id, { rol: 'agente', contenido: t });
      return salida(u, rs, 'texto');
    }
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
    if (u && u.estado === 'completada' && !comando && (Date.now() - new Date(u.actualizado).getTime() < 7 * 864e5 || await paginaEditable(u.id))) {
      // Entrevista ya cerrada (o con página publicada): los cambios que pida se aplican a su página; si no, se responde según el estado del sitio.
      if (texto) await db.insertarMensaje(u.id, { rol: 'cliente', contenido: texto });
      const md = entrantes.length ? await registrarMediaPostCierre(u, entrantes, texto) : { claves: [], textoExtra: '' };
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

  // La pausa se mide contra el último mensaje de cualquiera (cliente, Ari o un aviso/recordatorio):
  // si Ari ya escribió hace poco (p. ej. el recordatorio, que ya saluda), no se vuelve a saludar.
  const ultimoMsg = nueva ? null : (await db.q('SELECT max(creado) AS t FROM mensajes WHERE entrevista_id=$1', [e.id])).rows[0]?.t;
  const regresaDePausa = !nueva && Date.now() - new Date(ultimoMsg || e.ultimo_contacto).getTime() > PAUSA_MS;
  if (regresaDePausa && e.estado === 'pausada') { await db.guardar(e.id, { estado: 'en_curso' }); e.estado = 'en_curso'; }

  // Registrar el mensaje del cliente (texto + cada media como mensaje y asset).
  const assetsPrevios = await db.assetsDe(e.id);
  let n = assetsPrevios.length;
  const nuevosAssets = [];
  if (textoTurno) await db.insertarMensaje(e.id, { rol: 'cliente', tipo: 'texto', contenido: textoTurno, bloque: e.bloque_actual });
  // Describir las imágenes en paralelo (4 a la vez): con 18 fotos en serie la respuesta tardaba demasiado.
  const descripciones = new Map();
  {
    const cola = entrantes.filter((m) => tipoMedia(m.tipo, m.mime) === 'imagen');
    const trabajador = async () => { for (let m = cola.shift(); m; m = cola.shift()) descripciones.set(m, await describirImagen(m.url).catch(() => null)); };
    await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]);
  }
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
    const desc = tipo === 'imagen' ? (descripciones.get(m) || null) : null;
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
  if (!nueva && (propuestasPendientes(e.brief) || ajusteElegida(e))) {
    try {
      const r = await atenderPropuestas(e, e.brief || {}, { texto, huboMedia: nuevosAssets.length > 0, clavesNuevas: nuevosAssets.filter((a) => !['documento', 'video'].includes(a.tipo)).map((a) => a.clave) });
      if (r.brief !== e.brief) { await db.guardar(e.id, { brief: r.brief }); e.brief = r.brief; }
      if (!r.seguirConAri) return responderConMedia(r.responder.textos, r.responder.media);
      if (r.responder?.textos) prefijo.push(...r.responder.textos);
    } catch (err) {
      // Un error aquí no debe dejar al cliente en un ciclo de "dame un momento" (10-nov-2026): se registra y sigue Ari.
      console.error('propuestas', err);
      await db.evento(e.id, 'propuestas_error', { error: String(err?.message || err).slice(0, 500), texto: String(texto || '').slice(0, 200) }).catch(() => {});
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
  const [mensajesRecientes, arquetipos] = await Promise.all([db.ultimosMensajes(e.id, 24), db.arquetipos()]);
  const assets = [...assetsPrevios, ...nuevosAssets];
  const bloqueAnterior = e.bloque_actual;

  // "No tengo" a una pregunta de algo opcional (reseñas, FAQ, horarios…) se registra en código antes de Ari,
  // para que la revisión de requisitos no lo vuelva a pedir aunque el modelo no lo marque.
  const historial = await db.ultimosMensajes(e.id, 200);
  {
    const nt = unirNoTiene(e.brief?.no_tiene, noTieneDelHistorial(historial));
    const relleno = rellenarDelHistorial(omitidasDelHistorial({ ...(e.brief || {}), no_tiene: nt }, historial), historial);
    if (JSON.stringify(relleno.brief) !== JSON.stringify(e.brief || {})) {
      e.brief = relleno.brief;
      await db.guardar(e.id, { brief: e.brief });
    }
  }
  // Facebook/Instagram: lanzar la extracción al recibir las ligas y, cuando llegue, llenar brief + fotos y mostrar el resumen.
  let resumenRedes = null;
  {
    const rx = await atenderExtraccion(e, textoTurno, historial).catch((err) => { console.error('extracción redes', err); return {}; });
    if (rx.brief) e.brief = rx.brief;
    if (rx.assetsNuevos?.length) assets.push(...rx.assetsNuevos);
    if (rx.nota) notaAri = [notaAri, rx.nota].filter(Boolean).join('\n');
    resumenRedes = rx.resumen || null;
  }
  let t = await turnoAri(e, { mensajesRecientes, ultimoTexto: textoTurno, regresaDePausa, arquetipos, assets, notaAri });
  let brief = mergeProfundo(e.brief || {}, t.briefPatch);
  brief.no_tiene = unirNoTiene(e.brief?.no_tiene, t.briefPatch?.no_tiene);
  brief = rellenarDelHistorial(brief, historial).brief;
  brief.omitidas = e.brief?.omitidas || []; brief.diferir = [...new Set([...(e.brief?.diferir || []), ...(brief.diferir || [])])];
  // Revisión antes de cada pregunta: no se avanza (ni se cierra) con algo pendiente de un bloque anterior.
  // Si Ari intentó avanzar, se repite su turno parado en el bloque incompleto; si aun así no lo pide, se pide con el texto fijo.
  {
    const destino = t.completado ? 'B12' : t.bloque;
    const incompleto = primerBloqueIncompleto(brief, assets, destino);
    if (incompleto) {
      const pend = faltantes(brief, assets, { desde: incompleto, hasta: incompleto });
      await db.evento(e.id, 'requisito_pendiente', { destino, bloque: incompleto, faltan: pend.map((f) => f.id) });
      const nota = `NO PUEDES AVANZAR. Antes de seguir falta del bloque ${incompleto}: ${pend.map((f) => f.id).join(', ')}. Tu reply debe pedir SOLO "${pend[0].pedir}" (con tus palabras, cálido, sin regañar), sin resumen de bloque ni "listo ✅".${pend[0].puedeNoTener ? ` Si en su último mensaje el cliente ya dijo que no lo tiene, NO lo pidas: agrega "${pend[0].id}" a brief_patch.no_tiene y sigue con lo siguiente.` : ''} bloque_actual=${incompleto}, completado=false.`;
      const eForzado = { ...e, bloque_actual: incompleto, brief };
      const t2 = await turnoAri(eForzado, { mensajesRecientes, ultimoTexto: textoTurno, regresaDePausa, arquetipos, assets, notaAri: [notaAri, nota].filter(Boolean).join('\n') }).catch(() => null);
      const brief2 = t2 ? mergeProfundo(brief, t2.briefPatch) : brief;
      if (t2) brief2.no_tiene = unirNoTiene(brief.no_tiene, t2.briefPatch?.no_tiene);
      const sigue = primerBloqueIncompleto(brief2, assets, BLOQUES[BLOQUES.indexOf(incompleto) + 1] || 'B12');
      const reply = t2 && !/listo\s*✅/i.test(t2.reply) ? t2.reply : pend[0].pedir;
      brief = brief2;
      // Si con este mismo mensaje ya quedó completo, se respeta la respuesta de Ari; si no, se queda pidiendo lo que falta.
      t = { ...(t2 || t), reply: sigue ? reply : (t2?.reply || reply), bloque: sigue || t2?.bloque || incompleto, completado: false, assetsPatch: [...t.assetsPatch, ...(t2?.assetsPatch || [])] };
    }
  }
  // No repetir preguntas: si la pregunta de Ari ya se hizo antes y el cliente la contestó, se rehace el turno una vez.
  {
    const rep = await preguntaRepetida(e.id, t.reply);
    if (rep) {
      await db.evento(e.id, 'pregunta_repetida', { reply: t.reply.slice(0, 200), antes: rep.pregunta.slice(0, 200) });
      const nota = `NO REPITAS: ya preguntaste "${rep.pregunta}" y el cliente contestó "${rep.respuesta.slice(0, 300)}". Eso ya está en BRIEF. Pregunta lo SIGUIENTE que falte; si del bloque ${t.bloque} ya tienes todo, ciérralo y pasa al siguiente bloque.`;
      const eAct = { ...e, bloque_actual: t.bloque, brief };
      const t3 = await turnoAri(eAct, { mensajesRecientes, ultimoTexto: textoTurno, regresaDePausa, arquetipos, assets, notaAri: [notaAri, nota].filter(Boolean).join('\n') }).catch(() => null);
      if (t3 && !(await preguntaRepetida(e.id, t3.reply))) {
        const b3 = mergeProfundo(brief, t3.briefPatch);
        b3.no_tiene = unirNoTiene(brief.no_tiene, t3.briefPatch?.no_tiene);
        if (!primerBloqueIncompleto(b3, assets, t3.completado ? 'B12' : t3.bloque)) { brief = b3; t = { ...t3, assetsPatch: [...t.assetsPatch, ...t3.assetsPatch] }; }
      }
    }
  }
  // Nunca volver a preguntar algo que el cliente ya dijo que no tiene (reseñas, certificaciones, cifras…).
  if (preguntaYaNegada(t.reply, brief)) {
    await db.evento(e.id, 'pregunta_negada_repetida', { reply: t.reply.slice(0, 200) });
    const nota = `NO REPITAS: el cliente ya dijo que no tiene eso (ver "EL CLIENTE YA DIJO QUE NO TIENE"). No lo menciones. Pregunta lo SIGUIENTE que falte; si del bloque ${t.bloque} ya no queda nada, ciérralo y pasa al siguiente bloque.`;
    const t4 = await turnoAri({ ...e, bloque_actual: t.bloque, brief }, { mensajesRecientes, ultimoTexto: textoTurno, regresaDePausa, arquetipos, assets, notaAri: [notaAri, nota].filter(Boolean).join('\n') }).catch(() => null);
    if (t4 && !preguntaYaNegada(t4.reply, brief)) {
      const b4 = mergeProfundo(brief, t4.briefPatch);
      b4.no_tiene = unirNoTiene(brief.no_tiene, t4.briefPatch?.no_tiene);
      brief = b4; t = { ...t4, assetsPatch: [...t.assetsPatch, ...t4.assetsPatch] };
    } else {
      const sig = faltantes(brief, assets).find((f) => !preguntaYaNegada(f.pedir, brief));
      const i = BLOQUES.indexOf(t.bloque);
      t = { ...t, reply: sig ? sig.pedir : 'Perfecto, con eso seguimos 👍', bloque: sig ? sig.bloque : (BLOQUES[i + 1] || t.bloque) };
    }
  }
  // Pulido final del texto: sin saludos a media plática y una sola pregunta por mensaje.
  t = { ...t, reply: pulirReply(t.reply, regresaDePausa) };
  // Ari no modifica la página: si aun así dice "ya actualicé/cambié/agregué…", esa frase se quita (10-nov-2026).
  if (e.brief?.marca?.propuestas?.estado) {
    const sinFalso = t.reply.replace(/(^|\n)\s*¡?(listo|perfecto|entendido|genial|claro|hecho)?[!,.]?\s*(ya\s+)?(actualic|cambi[eé]|agregu[eé]|a[nñ]ad[ií]|puse|quit[eé]|elimin[eé]|sustitu[ií]|reemplac)[^?\n]*?[.!](?=\s|$)/i, '$1').trim();
    if (sinFalso !== t.reply.trim() && sinFalso.length > 10) { await db.evento(e.id, 'ari_afirmo_cambio', { reply: t.reply.slice(0, 300) }).catch(() => {}); t = { ...t, reply: sinFalso }; }
  }
  // El estado de la extracción de redes lo maneja solo redes_extraccion.js.
  if (e.brief?.redes_extraccion) brief.redes_extraccion = e.brief.redes_extraccion; else delete brief.redes_extraccion;
  if (resumenRedes) { const a = asegurarResumen(t.reply, brief, resumenRedes); t = { ...t, reply: a.reply }; brief = a.brief; }
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
  // No se cierra ni se pide el pago sin diseño elegido (12-nov-2026, caso La Fondita de Celestún: las 6 opciones tronaron
  // al salir de B6, el error solo quedó en la consola y Ari llegó al pago sin haberlas mandado; además la página no se
  // podía armar porque el generador exige una opción elegida). Aquí se mandan las opciones; la respuesta va más abajo.
  const sinDiseno = t.completado && e.brief?.marca?.propuestas?.estado !== 'elegida';
  if (sinDiseno) { t.completado = false; t.bloque = 'B12'; }
  // Cierre: tras la dirección, el enlace de pago para alojarla en su dominio y el aviso de que se arma la página.
  if (t.completado) {
    const cierre = 'Mientras tanto ya estoy armando tu página: en unos minutos te mando la liga para que la veas desde tu celular. Después me dices qué ajustar; los primeros cambios van incluidos.';
    if (quiereDominio(brief)) {
      brief.pago_pagina = pagoPendiente(e.id);
      t.reply = `${mensajePago(e.id)}\n\n${cierre} En cuanto se refleje tu pago seguimos con tu dirección.`;
    } else {
      brief.pago_pagina = pagoPendiente(e.id);
      t.reply = `${mensajePago(e.id, { conDominio: false })}\n\n${cierre}`;
    }
  }

  const cambios = { brief, bloque_actual: t.bloque, pendientes_bloque: t.pendientes, arquetipo_slug: brief.negocio?.arquetipo || null, nombre: brief.cliente?.nombre || e.nombre };
  await db.guardar(e.id, cambios);
  Object.assign(e, cambios);
  // Al salir de B6 (fotos): revisar materiales y mandar las 3 propuestas, o pedir mejores imágenes.
  // Si ya se retuvieron dos veces (no pasaron la revisión), no se reintenta en cada cambio de bloque: solo al cierre.
  const retenidas = e.brief?.marca?.opciones_retenidas || 0;
  let avisoRetenidas = null;
  if (!t.completado && ((tocaPropuestas(e.brief, bloqueAnterior, t.bloque) && retenidas < 2) || (sinDiseno && !e.brief?.marca?.propuestas))) {
    try {
      const r = await iniciarPropuestas(e, e.brief);
      await db.guardar(e.id, { brief: r.brief }); e.brief = r.brief;
      return responderConMedia([...mensajes, ...r.responder.textos], r.responder.media);
    } catch (err) {
      // El error queda registrado en la entrevista (antes solo iba a la consola y nadie se enteraba).
      console.error('iniciarPropuestas', err);
      await db.evento(e.id, 'propuestas_error', { error: String(err?.message || err).slice(0, 500), bloque: t.bloque, al_cierre: sinDiseno }).catch(() => {});
      if (err?.code === 'OPCIONES_RETENIDAS') {
        // No pasaron la revisión: no se le manda nada a medias; se le dice que siguen en proceso.
        const b = { ...e.brief, marca: { ...(e.brief.marca || {}), opciones_retenidas: retenidas + 1 } };
        await db.guardar(e.id, { brief: b }).catch(() => {}); e.brief = b;
        avisoRetenidas = 'Sigo afinando tus opciones de diseño para que queden bien; te las mando por aquí en cuanto estén listas 🙏';
      }
    }
  }
  if (sinDiseno) {
    const p = e.brief?.marca?.propuestas;
    t = { ...t, reply: p?.opciones?.length
      ? `Antes de armar tu página necesito que elijas tu diseño 👇\n\n${p.opciones.map((o) => `*${o.etiqueta || o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n')}\n\n¿Cuál te gusta más? Respóndeme con la letra.`
      : 'Antes de armar tu página me falta mostrarte las opciones de diseño para que elijas la que más te guste. Las estoy preparando; escríbeme *opciones* en un par de minutos y te las mando por aquí 🙏' };
  } else if (avisoRetenidas) mensajes.push(avisoRetenidas);
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
  const redesQueFaltan = redesFaltantes(brief);
  const contacto = { ...(brief.contacto || {}), redes_faltantes: redesQueFaltan };
  const redesCrear = { interesa: brief.redes_crear?.interesa ?? null, redes: (brief.redes_crear?.redes?.length ? brief.redes_crear.redes : redesQueFaltan).filter((r) => redesQueFaltan.includes(r)) };
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
