// Paso de propuestas visuales dentro de la entrevista (entre B6 fotos y B7 confianza):
// 1) revisar materiales (logo, fotos, menú); si no alcanzan para una propuesta digna, decirlo y pedir mejores,
//    con la opción "no las tengo" → se trabaja con lo que mandó (nunca se omiten sus imágenes);
// 2) mandar 3 opciones A/B/C con su logo, colores y fotos; 3) registrar la elegida (o mezclas / ninguna).
// Estado en brief.marca.propuestas = {estado, pedidos, opciones[], elegido, colores_de, rechazos[], comentario}.
import { procesarMateriales } from '../generador/materiales.js';
import { interpretarEleccion } from '../generador/opciones.js';
import { crearPropuestasHTML, textosPropuestas } from '../generador/propuestas_html.js';
import { revisarYCorregir } from '../generador/revision_visual.js';
import { coloresDePalabras } from '../generador/materiales.js';
import * as db from './db.js';
import { pedirJSON } from './claude.js';
import { estudiarReferencias } from './referencias.js';
import { atenderMostradas, clasificarImagenesPedido } from './propuestas_cambios.js';
import { construirDireccion, PRESETS, LISTA_PRESETS } from '../generador/estilo_ref.js';

const NO_TENGO = /no (las |los )?tengo|no tengo (m[aá]s|otras|mejores)|son (todas|las [uú]nicas)|con esas|as[ií] est[aá] bien|usa(lo)? (esas|lo que hay)|no hay (m[aá]s|otras)/i;
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const propuestasPendientes = (brief) => ['pendiente_material', 'mostradas', 'rechazadas'].includes(brief?.marca?.propuestas?.estado);
// Opción ya elegida y la entrevista sigue: los cambios que pida van a su página al momento (10-nov-2026: antes Ari decía
// "ya actualicé" sin que nada cambiara, porque después de elegir nadie aplicaba los cambios).
export const ajusteElegida = (e) => e?.brief?.marca?.propuestas?.estado === 'elegida' && ['en_curso', 'pausada'].includes(e?.estado);

/** Última pregunta pendiente de Ari (para retomarla después de aplicar un cambio). */
async function ultimaPregunta(entrevistaId) {
  const ms = await db.ultimosMensajes(entrevistaId, 30).catch(() => []);
  const m = [...ms].reverse().find((x) => x.rol === 'agente' && x.tipo !== 'imagen' && x.contenido?.includes('?') && !/^(Listo ✅|Seguimos 👇)/.test(x.contenido));
  if (!m) return null;
  const parrafos = m.contenido.split(/\n\s*\n/).filter((x) => x.includes('?'));
  return parrafos.at(-1)?.trim() || null;
}
// Se disparan al cruzar B6 hacia adelante, aunque Ari se haya saltado B6 (antes, saltar de B5 a B7 nunca mandaba propuestas).
export const tocaPropuestas = (brief, bloqueAnterior, bloqueNuevo) =>
  !brief?.marca?.propuestas && BLOQUES_ORDEN.indexOf(bloqueNuevo) > BLOQUES_ORDEN.indexOf('B6') && bloqueAnterior !== bloqueNuevo;
const BLOQUES_ORDEN = ['B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12'];

function mensajeFaltan(mat) {
  const capturas = mat.menus.length + mat.otras.length;
  const partes = ['Revisé con calma las imágenes que me mandaste 👀'];
  if (capturas) partes.push(`Las ${capturas} que son capturas de tu menú o diseños sí las voy a usar en tu página (las recorto para que se vean limpias), pero para que la portada luzca profesional me falta:`);
  else partes.push('Para que tu página luzca profesional me falta:');
  partes.push(mat.faltan.map((f) => `• ${f.pedir}`).join('\n'));
  partes.push('Mándamelas cuando puedas. Si no las tienes, escríbeme *no las tengo* y armo las propuestas con lo que ya me mandaste.');
  return partes.join('\n\n');
}

function queIncluye(brief, mat) {
  const partes = [];
  if (mat?.logo) partes.push('tu logo');
  if (mat?.fundador) partes.push('tu foto');
  if ((mat?.trabajos?.length || 0) + (mat?.local?.length || 0)) partes.push(brief.negocio?.arquetipo === 'servicios' ? 'las fotos de tu trabajo' : 'tus fotos');
  if (brief.negocio?.arquetipo === 'restaurante') partes.push('tus productos', 'tu menú');
  else if (brief.oferta?.items?.length) partes.push(brief.negocio?.arquetipo === 'servicios' ? 'tus paquetes' : 'tus servicios');
  if (brief.confianza?.testimonios?.length || mat?.resenas?.length) partes.push('lo que dicen tus clientes');
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0] || 'tu información';
}

function mensajeOpciones(op, brief, mat, ronda = 0) {
  const lista = op.opciones.map((o) => `*${o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n');
  // Asesor de color: si sus colores no siguen las mejores prácticas, se avisa una vez con la razón y la F muestra el ajuste.
  const h = !brief.marca?.colores_aviso_aceptado && op.asesor?.hallazgos?.[0];
  const conF = op.opciones.find((o) => o.letra === 'F')?.paleta?.origen === 'sugerencia';
  const nota = h ? `Una nota sobre tus colores: ${h.mensaje_cliente}${conF ? ' La *F* ya trae ese ajuste para que compares; las demás usan tus colores tal cual.' : ''}` : null;
  return {
    textos: [
      `${ronda ? `Aquí van ${op.opciones.length} propuestas nuevas, con otros colores, letras y acomodo` : `Te preparé ${op.opciones.length} propuestas de tu página`}, con ${queIncluye(brief, mat)}. Ábrelas en tu celular y recórrelas completas 👇`,
      lista,
      ...(nota ? [nota] : []),
      `¿Cuál te gusta más? Respóndeme con la letra (${op.opciones.map((o) => `*${o.letra}*`).join(', ')}). También puedes pedir mezclas, por ejemplo _la B con los colores de la E_. Si ninguna te convence, dime *ninguna* y qué te gustaría distinto.`,
    ],
    media: [],
  };
}

// Comentario del cliente al rechazar → ajustes concretos de estilo y colores para la siguiente ronda.
const ESTILOS_PALABRAS = [[/alegre|divertid|colorid|juguet|infantil/i, 'divertido'], [/elegante|fin[oa]|sofisticad/i, 'elegante'], [/minimal|sencill|limpi|simple/i, 'minimalista'],
  [/c[aá]lid|acogedor|hogare/i, 'calido'], [/modern|fresc|juvenil/i, 'fresco'], [/lujo|premium|exclusiv/i, 'lujo'], [/cl[aá]sic|tradicional/i, 'tradicional'], [/tecnol/i, 'tecnologico']];
export function ajustesDeComentario(texto, brief) {
  const marca = { ...(brief.marca || {}) };
  const est = ESTILOS_PALABRAS.find(([re]) => re.test(texto));
  if (est) marca.estilo = est[1];
  const cols = coloresDePalabras(texto.split(/[,.;\n]| y | con /i).map((x) => x.trim()).filter((x) => x && coloresDePalabras([x]).length));
  if (cols.length) marca.colores = texto.split(/[,.;\n]| y | con /i).map((x) => x.trim()).filter((x) => coloresDePalabras([x]).length);
  const ligas = texto.match(/https?:\/\/\S+/g);
  if (ligas) marca.referencias_sitios = [...new Set([...(marca.referencias_sitios || []), ...ligas])];
  return { ...brief, marca };
}
const VAGO = /^(no s[eé]|nada|ninguna|no me gust[oó]|no|igual|lo que sea)\W*$/i;

const ESTILOS = ['minimalista', 'fresco', 'calido', 'elegante', 'tecnologico', 'tradicional', 'lujo', 'divertido'];
export const PREGUNTA_RECHAZO = 'Va, te preparo otras 6 😊 Para atinarle, cuéntame qué fue exactamente lo que no te gustó: ¿los colores, el tipo de letra, cómo se acomodan tus fotos y secciones, o el ambiente en general (muy serio, muy sencillo, muy cargado…)? Si alguna se acercó, dime cuál y qué le cambiarías. Si tienes una página que te guste, mándame la liga.';

/**
 * Entiende con IA qué no le gustó de sus 6 opciones y lo convierte en cambios concretos.
 * → {claro, pregunta, resumen, estilo?, colores?, evitar?, preset?, notas?} | null si falla la IA.
 */
export async function entenderRechazo(brief, p, comentarios) {
  const opciones = (p.opciones || []).map((o) => ({ letra: o.letra, nombre: o.nombre, estilo: o.estilo, letras: o.tipografia, colores: o.paleta && { marca: o.paleta.primary || o.paleta.p, fondo: o.paleta.bg, texto: o.paleta.fg } }));
  try {
    const r = await pedirJSON({
      system: `Eres directora de arte de páginas web para negocios pequeños en México. Al cliente no le gustó ninguna de sus 6 opciones de diseño. Con lo que dijo, decide qué cambiar en las 6 nuevas.
- "claro": true si ya se sabe al menos UN cambio concreto (colores, tipo de letra, acomodo o tamaño de fotos, ambiente o estilo) o mandó una página de referencia. false si solo dijo que no le gustó o algo muy vago.
- "pregunta": si claro=false, UNA sola pregunta corta, en español de México, cálida, sin palabras técnicas (nada de layout, hero, tipografía, paleta), sobre lo que más falta saber. Si mencionó una letra, úsala ("¿Qué le cambiarías a la B?").
- "resumen": si claro=true, 1 o 2 frases en segunda persona de lo que entendiste ("Entendí que quieres colores más claros y letras más sencillas, con tus fotos más grandes").
- "estilo": uno de ${ESTILOS.join(', ')}, el que mejor refleje lo que pidió (si no hay pista, el actual).
- "colores": 2 a 4 colores en palabras sencillas si pidió colores; vacío si no habló de colores.
- "evitar": lo que pidió no repetir, en frases cortas (p. ej. "letras elaboradas", "fondos oscuros", "rojo"). Si dijo que quiere letra sencilla, incluye "letra sencilla".
- "preset": el estilo base más parecido a la página de referencia que mandó (y que no contradiga lo que pidió); si no mandó página, vacío:
${LISTA_PRESETS}
- "notas": 1 a 3 frases de lo que se debe notar en las nuevas (fotos grandes, más aire, más color…).
Nunca inventes cosas que el cliente no dijo.`,
      contenido: `NEGOCIO: ${brief.negocio?.nombre || ''} · ${brief.negocio?.giro_texto || ''}\nESTILO ACTUAL: ${brief.marca?.estilo || '-'} · COLORES DEL CLIENTE: ${JSON.stringify(brief.marca?.colores || [])}\nOPCIONES QUE VIO: ${JSON.stringify(opciones).slice(0, 3000)}\nLO QUE DIJO EL CLIENTE (en orden): ${comentarios.map((x, i) => `${i + 1}) ${x}`).join('\n')}`,
      schema: { type: 'object', properties: { claro: { type: 'boolean' }, pregunta: { type: 'string' }, resumen: { type: 'string' }, estilo: { type: 'string', enum: ESTILOS }, colores: { type: 'array', items: { type: 'string' } }, evitar: { type: 'array', items: { type: 'string' } }, preset: { type: 'string' }, notas: { type: 'string' } }, required: ['claro'] },
      max_tokens: 700,
    });
    return r.data;
  } catch (err) {
    console.error('[propuestas] entenderRechazo', err.message);
    return null;
  }
}

/** Aplica al brief los cambios entendidos (estilo, colores, qué evitar, página de referencia o estilo base). */
async function aplicarRechazo(brief, d, comentarios) {
  const marca = { ...(brief.marca || {}) };
  if (d?.estilo) marca.estilo = d.estilo;
  if (d?.colores?.length && coloresDePalabras(d.colores).length) marca.colores = d.colores;
  if (d?.evitar?.length) marca.evitar = [...new Set([marca.evitar, ...d.evitar].filter(Boolean).join(', ').split(/,\s*/))].join(', ');
  const ligas = [...new Set(comentarios.join(' ').match(/https?:\/\/[^\s)>\]]+/g) || [])].filter((u) => !/\/p\/[A-Za-z0-9]+\/[A-L]\b/.test(u)).slice(0, 3);
  if (ligas.length) marca.referencias_sitios = [...new Set([...(marca.referencias_sitios || []), ...ligas])];
  const estudio = ligas.length ? await estudiarReferencias({ marca: { referencias_sitios: ligas } }).catch(() => []) : [];
  const ref = estudio.find((x) => x && !x.error) || null;
  // Estilo base solo con página de referencia: sin ella, la IA a veces elige uno que contradice lo pedido
  // (p. ej. 'editorial suave', de letra cursiva, cuando pidió letras más sencillas).
  const sencilla = /sencill|rebuscad|elaborad|cursiv/i.test(String(marca.evitar || ''));
  const preset = PRESETS[d?.preset] && !(sencilla && PRESETS[d.preset].cursiva) ? d.preset : (sencilla ? 'moderno_limpio' : 'editorial_suave');
  if (ref || ligas.length) marca.direccion_ref = construirDireccion(preset, ref);
  marca.referencias_que_gusta = [marca.referencias_que_gusta, ...comentarios, d?.notas].filter(Boolean).join(' · ').slice(0, 2000);
  return { ...brief, marca };
}

export async function mostrar(e, brief, mat, { ronda = 0 } = {}) {
  const textos = await textosPropuestas(brief, mat);
  const prev = brief.marca?.propuestas || {};
  // Agente de revisión visual y corrección (10-nov-2026): antes de mandarlas, cada opción se revisa (código + IA) y las
  // que fallan se corrigen y se vuelven a revisar. Solo se mandan las que pasan; con menos de 4, se intenta otra ronda.
  // Reglas de envío (12-nov-2026, decisión de Sebastián; antes, si pasaban menos de 2, se mandaban todas):
  //  1. Una opción con defectos medibles (contraste, texto chico, desborde, fotos con franjas, logo que no carga) nunca
  //     se envía: se corrige y se vuelve a revisar, hasta 3 intentos.
  //  2. El juicio de gusto de la IA ("genérica", "poco parecida a la referencia") no bloquea por sí solo: solo provoca
  //     otro intento de mejora.
  //  3. Si tras los 3 intentos quedan menos de 2 opciones sin defectos medibles, no se manda nada: queda el evento
  //     opciones_retenidas (sin aviso por correo mientras el chat no esté en producción) y Ari dice que las sigue afinando.
  const INTENTOS = 3;
  const aOpcion = (o) => ({ etiqueta: o.letra, letra: o.letra, layout: o.layout, nombre: o.nombre, url: o.url, estilo: o.fuentes.estilo, tipografia: { titulos: o.fuentes.titulos, cuerpo: o.fuentes.cuerpo }, paleta: o.paleta });
  let mejor = null;
  // Tope de tiempo: el cliente está esperando en el chat. Pasado el tope no se empieza otro intento.
  const t0 = Date.now(), TOPE_MS = 9 * 60000;
  for (let intento = 0; intento < INTENTOS && (intento === 0 || Date.now() - t0 < TOPE_MS); intento++) {
    const r = await crearPropuestasHTML(brief, mat, textos, { ronda: ronda + intento });
    const opciones = r.opciones.map(aOpcion);
    const rev = await revisarYCorregir(opciones, { referencia: (brief.marca?.referencias_sitios || [])[0] || null }).catch((err) => { console.error('[propuestas] revisión', err.message); return { pasan: opciones, revision: [] }; });
    const de = (l) => (rev.revision || []).find((x) => x.letra === l);
    // Sin defectos medibles: las que pasan todo y las que solo fallan por gusto.
    const limpias = opciones.filter((o) => { const v = de(o.letra); return !v || v.ok !== false || (!v.error && !(v.objetivas || []).length); });
    if (e?.id) await db.evento(e.id, 'revision_opciones', { intento, token: r.token, pasan: rev.pasan.map((o) => o.letra), sin_defectos: limpias.map((o) => o.letra), revision: (rev.revision || []).map(({ letra, ok, problemas, objetivas }) => ({ letra, ok, medibles: (objetivas || []).length, problemas })) }).catch(() => {});
    if (!mejor || limpias.length > mejor.limpias.length || (limpias.length === mejor.limpias.length && rev.pasan.length > mejor.pasan.length)) mejor = { r, pasan: rev.pasan, limpias, ronda: ronda + intento };
    if (rev.pasan.length >= 4 || (limpias.length >= 4 && intento >= 1)) break;
  }
  const { r, limpias } = mejor;
  if (limpias.length < 2) {
    if (e?.id) await db.evento(e.id, 'opciones_retenidas', { token: r.token, sin_defectos: limpias.map((o) => o.letra), intentos: INTENTOS }).catch(() => {});
    const err = new Error(`Opciones retenidas: solo ${limpias.length} sin defectos medibles tras ${INTENTOS} intentos`);
    err.code = 'OPCIONES_RETENIDAS';
    throw err;
  }
  const opciones = limpias;
  return { propuestas: { ...prev, estado: 'mostradas', token: r.token, opciones, textos, ronda: mejor.ronda, asesor_color: r.asesor?.hallazgos || [], usados: [...(prev.usados || []), r.token] }, salida: mensajeOpciones({ opciones, asesor: r.asesor }, brief, mat, mejor.ronda) };
}

/**
 * Se llama ANTES del turno de Ari cuando hay propuestas pendientes. Devuelve
 * {responder:{textos, media}, brief, seguirConAri:boolean}.
 */
export async function atenderPropuestas(e, brief, { texto = '', huboMedia = false, clavesNuevas = [] }) {
  const p = brief.marca?.propuestas || {};
  if (p.estado === 'pendiente_material') {
    const aceptar = NO_TENGO.test(texto) || (p.pedidos || 0) >= 2;
    if (!aceptar && !huboMedia) return { responder: { textos: ['Cuando tengas las fotos mándamelas por aquí. Si no las tienes, escríbeme *no las tengo* y sigo con lo que ya me mandaste.'] }, brief, seguirConAri: false };
    const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: aceptar });
    if (!mat.material_suficiente && !aceptar) {
      const nb = { ...brief, marca: { ...brief.marca, propuestas: { ...p, pedidos: (p.pedidos || 0) + 1 } } };
      return { responder: { textos: [mensajeFaltan(mat)] }, brief: nb, seguirConAri: false };
    }
    const fotos = { ...(brief.fotos || {}), acepta_lo_que_hay: aceptar };
    const m = await mostrar(e, { ...brief, fotos }, mat);
    return { responder: m.salida, brief: { ...brief, fotos, marca: { ...brief.marca, propuestas: m.propuestas } }, seguirConAri: false };
  }
  if (p.estado === 'rechazadas') {
    const comentarios = [...(p.comentarios_rechazo || []), texto].filter((x) => x && x.trim());
    const preguntas = p.preguntas_estilo || 0;
    let d = comentarios.length ? await entenderRechazo(brief, p, comentarios) : { claro: false };
    if (!d) d = { claro: !(!texto || VAGO.test(texto.trim())), resumen: '' }; // sin IA: lo de antes (palabras clave)
    if (!d.claro && preguntas < 2) {
      const pregunta = preguntas === 0 || !d.pregunta ? (d.pregunta || PREGUNTA_RECHAZO) : d.pregunta;
      return { responder: { textos: [pregunta] }, brief: { ...brief, marca: { ...brief.marca, propuestas: { ...p, comentarios_rechazo: comentarios, preguntas_estilo: preguntas + 1 } } }, seguirConAri: false };
    }
    const comentario = comentarios.join(' · ');
    const b2 = d.estilo || d.colores || d.evitar || d.preset ? await aplicarRechazo(brief, d, comentarios) : ajustesDeComentario(comentario, brief);
    const mat = await procesarMateriales(e.id, b2, { aceptarLoQueHay: true });
    const m = await mostrar(e, b2, mat, { ronda: (p.ronda || 0) + 1 });
    const intro = d.resumen ? `${d.resumen.trim()} Con eso te preparé 6 nuevas 👇` : 'Te preparé 6 nuevas con lo que me dijiste 👇';
    const salida = { ...m.salida, textos: [intro, ...(m.salida?.textos || [])] };
    await db.evento(e.id, 'opciones_rehechas', { comentarios, entendido: d, ronda: (p.ronda || 0) + 1 }).catch(() => {});
    return { responder: salida, brief: { ...b2, marca: { ...b2.marca, propuestas: { ...m.propuestas, comentario, comentarios_rechazo: [], preguntas_estilo: 0, rechazos_previos: [...(p.rechazos_previos || []), { ronda: p.ronda || 0, comentarios, entendido: d }] } } }, seguirConAri: false };
  }
  if (p.estado === 'mostradas') {
    const reenviar = () => ({ responder: { textos: ['Claro, aquí van otra vez 👇', p.opciones.map((o) => `*${o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n'), `¿Cuál te gusta más? Respóndeme con la letra (${p.opciones.map((o) => `*${o.letra}*`).join(', ')}) o dime *ninguna* y qué cambiarías. Ya que elijas una, puedes pedirme cualquier ajuste.`] }, brief, seguirConAri: false });
    // Elección directa ("la B") solo sin fotos nuevas ni preguntas pendientes sobre fotos: con esas, un "a la galería"
    // se confundía con la opción A. Todo lo demás (agregar fotos, dónde ponerlas, cambios, preguntas) lo entiende la IA.
    const enEspera = (p.fotos_por_ubicar || []).length > 0 || p.esperando_fotos;
    let r = !clavesNuevas.length && !enEspera ? interpretarEleccion(texto) : null;
    // "En la A cambia el título por…", "me gusta la B pero agrega estas fotos": trae una letra pero pide un cambio.
    if (r?.elegido && /agreg|a[ñn]ad|cambi|\bpon(er|le|las|los|me)?\b|quit|muev|mover|foto|imagen|color|t[ií]tulo|texto|secci[oó]n/i.test(texto)) r = null;
    if (!r && !clavesNuevas.length && !enEspera && /reenv|no (me )?llegaron|ligas|links|enlaces/i.test(texto) && !/agreg|foto|imagen|cambi|pon/i.test(texto)) return reenviar();
    if (!r) {
      const m = await atenderMostradas(e, brief, p, { texto, clavesNuevas });
      if (m?.responder) return { ...m, seguirConAri: false };
      if (m?.accion === 'reenviar') return reenviar();
      if (m?.accion === 'elegir' && (p.opciones || []).some((o) => (o.etiqueta || o.letra) === m.letra)) r = { elegido: m.letra, colores_de: m.colores_de, pendiente: m.pendiente || null };
      else if (m?.accion === 'ninguna') r = { ninguna: true };
      else if (!m) r = interpretarEleccion(texto); // sin IA: como antes
    }
    if (!r) { const disp = (p.opciones || []).map((o) => o.etiqueta || o.letra); return { responder: { textos: [`No me quedó claro 🙏 Puedes elegir una opción con su letra (${disp.map((l) => `*${l}*`).join(', ')}), o decirme *ninguna* y qué te gustaría distinto. Ya que elijas una, puedes pedirme cualquier cambio: agregar fotos, cambiar textos, colores o dónde va cada cosa.`] }, brief, seguirConAri: false }; }
    if (r.ninguna) {
      const nb = { ...brief, marca: { ...brief.marca, propuestas: { ...p, estado: 'rechazadas', rechazos: [...(p.rechazos || []), texto], comentarios_rechazo: [], preguntas_estilo: 0 } } };
      // Si en el mismo mensaje ya dijo qué no le gustó, se entiende de una vez; si no, se le pregunta exactamente qué.
      if (huboMedia || texto.replace(/ningun[ao]?|no me gust\w*|no me convenc\w*|otras?|opciones|quiero|porfa(vor)?/gi, '').trim().split(/\s+/).filter((w) => w.length > 2).length >= 3) return atenderPropuestas(e, nb, { texto, huboMedia });
      return { responder: { textos: [PREGUNTA_RECHAZO] }, brief: { ...nb, marca: { ...nb.marca, propuestas: { ...nb.marca.propuestas, preguntas_estilo: 1, comentarios_rechazo: [texto] } } }, seguirConAri: false };
    }
    const deLetra = (l) => (p.opciones || []).find((o) => (o.etiqueta || o.letra) === l) || null;
    const elegida = deLetra(r.elegido);
    // Letra que no está entre las opciones guardadas (p. ej. una que no pasó la revisión): no se truena ni se cicla;
    // se le dice cuáles tiene disponibles, con sus ligas.
    if (!elegida) {
      const disp = (p.opciones || []).map((o) => o.etiqueta || o.letra);
      await db.evento(e.id, 'eleccion_no_disponible', { elegido: r.elegido, disponibles: disp, token: p.token }).catch(() => {});
      return { responder: { textos: [`La opción *${r.elegido}* ya no está disponible. Estas son las que tienes para elegir 👇`, (p.opciones || []).map((o) => `*${o.etiqueta || o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n'), `¿Cuál te gusta más? Respóndeme con la letra (${disp.map((l) => `*${l}*`).join(', ')}), o dime *ninguna* y qué cambiarías.`] }, brief, seguirConAri: false };
    }
    const colores = r.colores_de ? deLetra(r.colores_de) : null;
    const pendiente = r.pendiente || p.cambio_pendiente || null;
    const nb = { ...brief, marca: { ...brief.marca, estilo: elegida.estilo, propuestas: { ...p, estado: 'elegida', elegido: r.elegido, colores_de: colores ? r.colores_de : null, comentario: texto, cambio_pendiente: null } } };
    // Desde que elige, su página se arma desde la base (datos) con el diseño de su opción, y lo visual lo ajusta la IA.
    const sv = await asegurarSitioVivo(e, nb);
    if (sv && (pendiente?.texto || pendiente?.claves?.length)) {
      // Lo que pidió antes de elegir se aplica ahora a la opción elegida.
      await clasificarImagenesPedido(e, pendiente.claves || [], { texto: pendiente.texto || '', urlPagina: elegida.url });
      const { registrarPedido } = await import('./cambios.js');
      await registrarPedido(e.id, { texto: pendiente.texto || '', media: pendiente.claves || [] });
      await db.evento(e.id, 'cambio_pendiente_encolado', { letra: r.elegido, pendiente }).catch(() => {});
      return { responder: { textos: [`¡Perfecto! Vamos con la opción *${r.elegido}*. Ya le estoy aplicando los cambios que me pediste; en 1 o 2 minutos te mando aquí la liga para que los veas 👍`] }, brief: nb, seguirConAri: true };
    }
    const conf = `¡Perfecto! Vamos con la opción *${r.elegido}*${colores ? ` con los colores de la *${r.colores_de}*` : ''}. Tomo en cuenta lo que me dijiste para la página completa.`;
    return { responder: { textos: [conf] }, brief: nb, seguirConAri: true };
  }
  if (p.estado === 'elegida' && e && ['en_curso', 'pausada'].includes(e.estado) && (texto || clavesNuevas.length)) {
    const m = await atenderMostradas(e, brief, p, { texto, clavesNuevas, elegida: p.elegido });
    if (!m || m.accion === 'seguir') return { responder: null, brief, seguirConAri: true };
    if (m.accion === 'encolar' || (m.accion === 'elegir' && m.letra !== p.elegido)) {
      // Cambios con la opción ya elegida (11-nov-2026): datos → base, visual → IA sobre el sitio armado desde la base.
      const sv = await asegurarSitioVivo(e, brief);
      if (sv) {
        const { registrarPedido } = await import('./cambios.js');
        const o = (p.opciones || []).find((x) => (x.etiqueta || x.letra) === p.elegido);
        if (m.accion === 'encolar') await clasificarImagenesPedido(e, clavesNuevas, { texto, urlPagina: o?.url || '' });
        const rp = await registrarPedido(e.id, m.accion === 'encolar' ? { texto, media: clavesNuevas } : { texto: `la ${m.letra}`, media: [] });
        const aviso = rp.enCurso ? 'Estoy terminando el cambio anterior 👍 enseguida hago este y te aviso aquí.' : !rp.nuevo ? 'Lo sumo al cambio que estoy haciendo 👍' : 'Ya lo estoy haciendo 👍 En 1 o 2 minutos te mando aquí la liga para que lo veas.';
        const q = await ultimaPregunta(e.id);
        return { responder: { textos: q ? [aviso, `Mientras, seguimos 👇\n\n${q}`] : [aviso] }, brief, seguirConAri: false };
      }
    }
    if (m.accion === 'reenviar') {
      const o = (p.opciones || []).find((x) => (x.etiqueta || x.letra) === p.elegido);
      return { responder: { textos: [`Claro, aquí está tu página 👇\n${o?.url || ''}`] }, brief, seguirConAri: true };
    }
    if (m.accion === 'elegir' && m.letra !== p.elegido) {
      const o = (p.opciones || []).find((x) => (x.etiqueta || x.letra) === m.letra);
      if (o) {
        const nb = { ...brief, marca: { ...brief.marca, estilo: o.estilo, propuestas: { ...p, elegido: m.letra, colores_de: m.colores_de || null } } };
        await db.evento(e.id, 'eleccion_cambiada', { antes: p.elegido, ahora: m.letra }).catch(() => {});
        return { responder: { textos: [`Listo ✅ Cambié tu página a la opción *${m.letra}* · ${o.nombre} 👇\n${o.url}`] }, brief: nb, seguirConAri: true };
      }
    }
    if (m.accion === 'ninguna') return { responder: null, brief, seguirConAri: true };
    if (m.responder) {
      const textos = [...(m.responder.textos || [])];
      if (m.retomar) { const q = await ultimaPregunta(e.id); if (q) textos.push(`Seguimos 👇\n\n${q}`); }
      return { responder: { textos }, brief: m.brief || brief, seguirConAri: false };
    }
    return { responder: null, brief, seguirConAri: true };
  }
  return { responder: null, brief, seguirConAri: true };
}

/** Se llama DESPUÉS del turno de Ari cuando el cliente terminó las fotos (sale de B6). */
export async function iniciarPropuestas(e, brief) {
  const mat = await procesarMateriales(e.id, brief);
  if (!mat.material_suficiente) {
    const nb = { ...brief, marca: { ...brief.marca, propuestas: { estado: 'pendiente_material', pedidos: 1, faltan: mat.faltan } } };
    return { responder: { textos: [mensajeFaltan(mat)] }, brief: nb };
  }
  const m = await mostrar(e, brief, mat);
  return { responder: m.salida, brief: { ...brief, marca: { ...brief.marca, propuestas: m.propuestas } } };
}

/** Sitio que se arma desde la base con el diseño elegido. Se crea al elegir; marcado para que el aviso de "tu página ya quedó" salga al terminar la entrevista. */
async function asegurarSitioVivo(e, brief) {
  try {
    const { crearSitioVivo } = await import('../panel/sitios.js');
    const sv = await crearSitioVivo({ ...e, brief });
    if (!sv.contenido?._previo_cierre && e.estado !== 'completada') {
      const r = await db.q(`UPDATE sitios_vivos SET contenido = contenido || '{"_previo_cierre": true}'::jsonb WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM eventos WHERE entrevista_id=$2 AND tipo='sitio_vivo_listo') RETURNING *`, [sv.id, e.id]);
      return r.rows[0] || sv;
    }
    return sv;
  } catch (err) { console.error('[propuestas] sitio vivo', e.id, err.message); return null; }
}
