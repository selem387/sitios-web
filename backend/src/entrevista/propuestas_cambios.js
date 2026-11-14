// Mensajes del cliente mientras ve sus 6 opciones (estado 'mostradas') que no son elegir una letra (10-nov-2026).
// Siempre abierto a modificaciones: agregar fotos, decir dónde va cada foto (portada, "Nuestro trabajo", galería…),
// moverlas o quitarlas, y cambios de textos, colores y datos. Se aplican de inmediato a las MISMAS 6 opciones
// (mismas ligas, mismo diseño) y se le pide recargar. Nada de "anotado": o se hace, o se le pide explicarlo de otra forma.
import * as db from './db.js';
import { pedirJSON, interpretarImagenCambio } from './claude.js';
import { procesarMateriales, coloresDePalabras } from '../generador/materiales.js';
import { crearPropuestasHTML, textosPropuestas } from '../generador/propuestas_html.js';
import { revisarYCorregir } from '../generador/revision_visual.js';
import { TITULOS } from '../generador/propuestas_general.js';

const SECCIONES = ['portada', 'trabajo', 'galeria'];
const ESTILOS = ['minimalista', 'fresco', 'calido', 'elegante', 'tecnologico', 'tradicional', 'lujo', 'divertido'];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const esImagen = (a) => /\.(jpe?g|png|webp|heic)(\?|$)/i.test(a.url || '') || /^image\//.test(a.mime || '') || /^(foto|imagen|logo|captura|menu|catalogo)/.test(a.tipo || '');

/** Nombre de cada sección de fotos tal como aparece en las propuestas de este cliente. */
export function seccionesFotos(brief, textos = {}) {
  if (brief.negocio?.arquetipo === 'restaurante') return { portada: 'Portada', galeria: 'Más de nosotros' };
  const arq = TITULOS[brief.negocio?.arquetipo] ? brief.negocio.arquetipo : 'generico';
  const T = { ...TITULOS[arq], ...(textos.secciones || {}) };
  return { portada: 'Portada', trabajo: T.trabajo, galeria: T.galeria };
}

const DESCRIPCION_SECCION = { portada: 'las fotos grandes que van pasando arriba', trabajo: 'el carrusel de fotos que se desliza', galeria: 'una sección de fotos al final' };

export function preguntaUbicacion(brief, textos, n) {
  const s = seccionesFotos(brief, textos);
  const lineas = Object.entries(s).map(([k, v]) => `• *${v}*: ${DESCRIPCION_SECCION[k]}`).join('\n');
  const ej = s.trabajo ? `_la primera en la portada y las demás en ${s.trabajo}_` : `_la primera en la portada y las demás en ${s.galeria}_`;
  return `${n === 1 ? '¡Recibí tu foto! 📸 ¿Dónde quieres que la ponga?' : `¡Recibí tus ${n} fotos! 📸 ¿Dónde quieres que las ponga?`}\n\n${lineas}\n\n${n > 1 ? `Puedes repartirlas, por ejemplo ${ej}. ` : ''}Si prefieres que yo ${n === 1 ? 'la acomode' : 'las acomode'}, dime *tú decide*.`;
}

function pedirFotos(brief, textos, seccion, dondeVan = 'en tus opciones') {
  const s = seccionesFotos(brief, textos);
  if (seccion && s[seccion]) return `¡Claro! Mándame por aquí las fotos que quieras agregar en *${s[seccion]}* (hasta 18 por envío) y las pongo ${dondeVan}.`;
  const nombres = Object.values(s).map((v) => `*${v}*`);
  return `¡Claro! Mándame por aquí las fotos que quieras agregar (hasta 18 por envío). Si ya sabes dónde las quieres —${nombres.slice(0, -1).join(', ')} o ${nombres.at(-1)}— dímelo junto con las fotos; si no, te pregunto al recibirlas.`;
}

/** ¿El texto nombra la opción? ("la A", "opción B", "B", "la primera"…) */
export function mencionaOpcion(texto, letra, nombreOpcion = '') {
  const l = String(letra || '').toUpperCase();
  if (!/^[A-L]$/.test(l)) return false;
  const t = String(texto || '');
  const ord = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta'][l.charCodeAt(0) - 65];
  if (new RegExp(`(^|[^\\p{L}])\\*?${l}\\*?([^\\p{L}]|$)`, 'u').test(t)) return true; // "B", "la B", "*B*" (mayúscula sola)
  if (new RegExp(`(^|[^\\p{L}])(la|opci[oó]n|letra|dise[nñ]o)\\s+${l}([^\\p{L}]|$)`, 'iu').test(t)) return true; // "la a", "opción b"
  if (new RegExp(`(^|[^\\p{L}])${ord}([^\\p{L}]|$)`, 'iu').test(t)) return true;
  const n = norm(nombreOpcion);
  return n.length > 3 && norm(t).includes(n); // "me quedo con la editorial"
}

const listaOpciones = (p) => p.opciones.map((o) => `*${o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n');
const letrasDe = (p) => (p.opciones || []).map((o) => o.etiqueta || o.letra);
const enumerar = (ls) => (ls.length > 1 ? `${ls.slice(0, -1).map((l) => `*${l}*`).join(', ')} o *${ls.at(-1)}*` : `*${ls[0] || ''}*`);
const cierre = (p) => `¿Cuál te gusta más? Respóndeme con la letra (${letrasDe(p).map((l) => `*${l}*`).join(', ')}). Ya que elijas una, puedes pedirme cualquier cambio —fotos, textos, colores o dónde va cada cosa— y se lo aplico.`;

/** Regla (10-nov-2026): para pedir cambios primero se elige una opción. Si pide un cambio antes, se le pregunta a cuál. */
export const preguntaQueOpcion = (p) => `¡Con gusto te aplico esos cambios! 😊 ¿A qué opción se los aplico: ${enumerar(letrasDe(p))}? Necesitas elegir una para empezar a modificarla.`;

/** Letra que el cliente nombró sin lugar a dudas al pedir un cambio ("en la opción B", "la *C*", "la segunda opción"). Una sola o null. */
export function opcionNombrada(texto, opciones = []) {
  const t = String(texto || '');
  const ords = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta'];
  const hits = opciones.map((o) => String(o.etiqueta || o.letra || '').toUpperCase()).filter((l) => /^[A-L]$/.test(l)).filter((l) => {
    const ord = ords[l.charCodeAt(0) - 65];
    return new RegExp(`(^|[^\\p{L}])([Oo]pci[oó]n|OPCI[OÓ]N|[Ll]etra)\\s+\\*?(${l}|${l.toLowerCase()})\\*?([^\\p{L}]|$)`, 'u').test(t)
      || new RegExp(`(^|[^\\p{L}])([Dd]ise[nñ]o|[Pp]ropuesta)\\s+\\*?${l}\\*?([^\\p{L}]|$)`, 'u').test(t)
      || new RegExp(`(^|[^\\p{L}])([Ll]a|[Ee]l)\\s+\\*?${l}\\*?([^\\p{L}]|$)`, 'u').test(t)
      || new RegExp(`\\*${l}\\*`).test(t)
      || new RegExp(`(^|[^\\p{L}])${ord}\\s+(opci[oó]n|propuesta)|(opci[oó]n|propuesta)\\s+${ord}([^\\p{L}]|$)`, 'iu').test(t);
  });
  return hits.length === 1 ? hits[0] : null;
}

/** Entiende con IA qué quiere el cliente con su mensaje mientras ve las opciones. */
async function entender(e, brief, p, { texto, nuevas, fotos, secciones, elegida = null }) {
  const historial = (await db.ultimosMensajes(e.id, 10).catch(() => [])).map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${String(m.transcripcion || m.contenido || '').slice(0, 300)}`).join('\n');
  const ub = brief.fotos?.ubicacion || {};
  const fotosTxt = fotos.map((a) => `- ${a.clave}${nuevas.includes(a.clave) ? ` (NUEVA #${nuevas.indexOf(a.clave) + 1} de este mensaje)` : (p.fotos_por_ubicar || []).includes(a.clave) ? ' (mandada antes, SIN SECCIÓN todavía)' : ''} · sección: ${ub[a.clave] || 'automática'} · ${String(a.descripcion_ia || a.nota || '').slice(0, 160)}`).join('\n');
  const secTxt = Object.entries(secciones).map(([k, v]) => `${k} = «${v}»`).join(', ');
  const r = await pedirJSON({
    system: `Eres Ari, asistente que crea páginas web por chat para negocios pequeños en México. ${elegida ? `El cliente YA ELIGIÓ la opción ${elegida} y la entrevista sigue (le estás haciendo preguntas para completar su página). Puede estar contestando tu última pregunta o pidiendo un cambio a su página.` : 'El cliente está viendo sus 6 opciones de diseño (letras A a F) y te escribió.'} Decide qué quiere y conviértelo en acciones concretas. Siempre estás abierto a cualquier modificación.
Intenciones:${elegida ? `
- "respuesta": contesta tu última pregunta de la entrevista (historia, equipo, cifras, garantía, testimonios, horario que le pediste, etc.) o platica, SIN pedir ningún cambio a la página. Si contesta algo y además pide un cambio, la intención es la del cambio.` : ''}
- "elegir": ${elegida ? 'quiere cambiar su opción elegida por otra' : 'elige una opción'} (pon "letra" y, si pide mezcla, "colores_de"). SOLO si en su mensaje nombra la letra o la opción ("la A", "opción B", "la primera", "me quedo con la de foto grande"); un saludo, un "sí", "va" u "ok" sueltos NUNCA son elegir.
- "ninguna": ninguna opción le gusta y quiere diseños distintos.
- "reenviar": quiere que le vuelvas a mandar las ligas.
- "agregar_fotos": quiere agregar fotos pero aún no las manda. Si dijo dónde, pon "seccion_nuevas".
- "ubicar_fotos": mandó fotos nuevas o dice dónde poner fotos que mandó (incluye las SIN SECCIÓN). Llena "ubicaciones" con CADA foto de la que se sepa la sección. Si mandó fotos nuevas sin decir dónde, deja "ubicaciones" vacío (se le preguntará). Si dice "tú decide", "donde quieras" o similar, usa sección "auto" para esas fotos. "la primera", "la segunda"… se refieren al número de NUEVA; "todas" son todas las nuevas o sin sección.
- "mover_fotos": quiere cambiar de sección o quitar fotos que ya están (identifícalas por su descripción). Sección "quitar" solo si pide claramente quitarla.
- "cambio": otro cambio a ${elegida ? 'su página' : 'sus opciones'}: textos, nombre de una sección, colores, estilo, datos de contacto, horario, promoción, los pasos de "Cómo funciona" o los textos de la sección de productos/servicios. Llena "cambios".
  · Pasos ("cómo funciona", "proceso" o como se llame esa sección): "proceso_titulo" con el título nuevo de la sección y "pasos" con CADA paso {titulo, texto} tal cual los escribió (sin el número).
  · Productos/servicios: "titulos_secciones.servicios" con el título, "servicios_intro" con la frase de debajo del título, "productos" con {nombre, descripcion} de cada uno (nombre como lo escribió el cliente), "servicios_cierre" con la frase del final y "servicios_boton" con el texto del botón de esa sección.
- "pregunta": pregunta algo del proceso; responde en "respuesta".
- "otro": nada de lo anterior; en "respuesta" pregúntale qué quiso decir, con opciones sencillas.
Secciones de fotos de sus páginas: ${secTxt}. Usa solo esas claves (o "auto"/"quitar").
Reglas:
- Un mensaje puede traer varias cosas: elige la intención principal, pero llena también ubicaciones y cambios si vienen.
- Textos del cliente (titular, subtítulo, botón, nombres de secciones, horario, promoción): cópialos EXACTAMENTE como los escribió, letra por letra; nunca los redactes ni "mejores". Si no escribió el texto exacto, no lo pongas y en "respuesta" pregúntale cómo lo quiere.
- Nunca inventes datos ni fotos.
- "resumen": en segunda persona y en pasado, qué quedó hecho (p. ej. "puse tus 3 fotos nuevas en la portada"). Corto, sin palabras técnicas.
- "respuesta": español de México, cálido, breve, sin palabras técnicas (nada de hero, layout, slider, tipografía, paleta). Nunca menciones a un equipo.`,
    contenido: `NEGOCIO: ${brief.negocio?.nombre || ''} · ${brief.negocio?.giro_texto || ''}
${p.esperando_fotos ? 'ESTADO: le pediste fotos para agregar y estás esperando que las mande.\n' : ''}${(p.fotos_por_ubicar || []).length ? `ESTADO: le preguntaste dónde poner ${p.fotos_por_ubicar.length} foto(s) sin sección.\n` : ''}FOTOS DEL CLIENTE:
${fotosTxt || '(ninguna)'}
ÚLTIMOS MENSAJES:
${historial || '(ninguno)'}
MENSAJE NUEVO DEL CLIENTE: ${texto || '(solo mandó fotos)'}${nuevas.length ? ` [mandó ${nuevas.length} foto(s): ${nuevas.join(', ')}]` : ''}`,
    schema: {
      type: 'object',
      properties: {
        intencion: { type: 'string', enum: ['elegir', 'ninguna', 'reenviar', 'agregar_fotos', 'ubicar_fotos', 'mover_fotos', 'cambio', 'pregunta', 'respuesta', 'otro'] },
        letra: { type: 'string' }, colores_de: { type: 'string' },
        seccion_nuevas: { type: 'string' },
        ubicaciones: { type: 'array', items: { type: 'object', properties: { clave: { type: 'string' }, seccion: { type: 'string' } }, required: ['clave', 'seccion'] } },
        cambios: {
          type: 'object',
          properties: {
            titular: { type: 'string' }, subtitulo: { type: 'string' }, boton: { type: 'string' },
            colores: { type: 'array', items: { type: 'string' } }, estilo: { type: 'string', enum: ESTILOS }, evitar: { type: 'array', items: { type: 'string' } },
            titulos_secciones: { type: 'object', properties: { proceso: { type: 'string' }, trabajo: { type: 'string' }, galeria: { type: 'string' }, servicios: { type: 'string' }, sobre: { type: 'string' }, resenas: { type: 'string' }, faq: { type: 'string' }, contacto: { type: 'string' } } },
            horarios: { type: 'string' }, whatsapp: { type: 'string' }, correo: { type: 'string' }, promocion: { type: 'string' },
            proceso_titulo: { type: 'string' }, proceso_intro: { type: 'string' },
            pasos: { type: 'array', items: { type: 'object', properties: { titulo: { type: 'string' }, texto: { type: 'string' } }, required: ['titulo'] } },
            servicios_intro: { type: 'string' }, servicios_cierre: { type: 'string' }, servicios_boton: { type: 'string' },
            productos: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, descripcion: { type: 'string' } }, required: ['nombre', 'descripcion'] } },
          },
        },
        resumen: { type: 'string' }, respuesta: { type: 'string' },
      },
      required: ['intencion'],
    },
    max_tokens: 1200,
  });
  return r.data || {};
}

/** Vuelve a armar las MISMAS opciones (mismas ligas, mismo diseño) con el brief y materiales actuales. */
async function rehacerMismas(e, brief, p, pedido, soloLetra = null) {
  const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
  const textos = p.textos || await textosPropuestas(brief, mat);
  const r = await crearPropuestasHTML(brief, mat, textos, { token: p.token, ronda: p.ronda || 0 });
  const opciones = p.opciones.map((o) => {
    const n = r.opciones.find((x) => x.letra === o.letra);
    return n ? { ...o, url: n.url, paleta: n.paleta, estilo: n.fuentes.estilo, tipografia: { titulos: n.fuentes.titulos, cuerpo: n.fuentes.cuerpo } } : o;
  });
  // Regla dura: revisión visual antes de mandarlas. Aquí no se quitan opciones (el cliente ya las vio); solo se corrigen.
  // Ya elegida: solo se revisa (y corrige) su opción; las demás ya no las ve.
  const aRevisar = soloLetra ? opciones.filter((o) => (o.etiqueta || o.letra) === soloLetra) : opciones;
  await revisarYCorregir(aRevisar, { referencia: (brief.marca?.referencias_sitios || [])[0] || null, pedido, rondas: 1 }).catch((err) => console.error('[propuestas_cambios] revisión', err.message));
  return { ...p, opciones, textos };
}

/** Aplica los cambios de texto y datos. Solo textos que el cliente escribió tal cual (letra por letra). */
export function aplicarCambios(brief, p, c = {}, texto = '') {
  const t = norm(texto);
  const literal = (s) => s && norm(s) && t.includes(norm(s)) ? String(s).trim() : null;
  let b = brief, textos = p.textos ? { ...p.textos } : null;
  const hechos = [];
  const marca = { ...(b.marca || {}) };
  if (c.colores?.length && coloresDePalabras(c.colores).length) { marca.colores = c.colores; hechos.push('colores'); }
  if (c.estilo && ESTILOS.includes(c.estilo) && c.estilo !== marca.estilo) { marca.estilo = c.estilo; hechos.push('estilo'); }
  if (c.evitar?.length) { marca.evitar = [...new Set([marca.evitar, ...c.evitar].filter(Boolean).join(', ').split(/,\s*/))].join(', '); hechos.push('evitar'); }
  b = { ...b, marca };
  if (textos) {
    const campos = { titular: literal(c.titular), subtitulo: literal(c.subtitulo), cta: literal(c.boton) };
    if (Object.values(campos).some(Boolean)) {
      textos.variantes = (textos.variantes || []).map((v) => ({ ...v, ...Object.fromEntries(Object.entries(campos).filter(([, x]) => x)) }));
      hechos.push('textos');
    }
    const secs = Object.fromEntries(Object.entries(c.titulos_secciones || {}).map(([k, v]) => [k, literal(v)]).filter(([, v]) => v));
    if (Object.keys(secs).length) { textos.secciones = { ...(textos.secciones || {}), ...secs }; hechos.push('secciones'); }
  }
  // "Cómo funciona" y textos de la sección de productos/servicios (10-nov-2026: antes no se podían cambiar y Ari decía que sí).
  if (textos) {
    const titProc = literal(c.proceso_titulo) || literal(c.titulos_secciones?.proceso);
    if (titProc) { textos.proceso = titProc; hechos.push('proceso_titulo'); }
    if (literal(c.proceso_intro)) { textos.proceso_intro = literal(c.proceso_intro); hechos.push('proceso_intro'); }
    for (const k of ['servicios_intro', 'servicios_cierre', 'servicios_boton']) if (literal(c[k])) { textos[k] = literal(c[k]); hechos.push(k); }
  }
  const pasos = (c.pasos || []).map((x) => ({ titulo: literal(x?.titulo), texto: x?.texto ? literal(x.texto) : '' })).filter((x) => x.titulo && (x.texto !== null));
  if (pasos.length >= 2 && pasos.length === (c.pasos || []).length) {
    const ps = pasos.map((x) => (x.texto ? `${x.titulo}\n${x.texto}` : x.titulo));
    b = { ...b, proceso_pasos: ps, oferta: { ...(b.oferta || {}), proceso_pasos: ps } };
    hechos.push('pasos');
  }
  const items = b.oferta?.items || [];
  if ((c.productos || []).length && items.length) {
    const nuevos = items.map((it) => ({ ...it }));
    let n = 0;
    for (const pr of c.productos) {
      const desc = literal(pr?.descripcion);
      const nm = norm(pr?.nombre);
      if (!desc || !nm) continue;
      const it = nuevos.find((x) => norm(x.nombre) === nm) || nuevos.find((x) => norm(x.nombre).includes(nm) || nm.includes(norm(x.nombre)));
      if (it) { it.descripcion_corta = desc; if (literal(pr.nombre)) it.nombre = literal(pr.nombre); n++; } // el nombre como lo escribió ("Guayaberas", no "guayaberas")
    }
    if (n) { b = { ...b, oferta: { ...(b.oferta || {}), items: nuevos } }; hechos.push('productos'); }
  }
  const contacto = { ...(b.contacto || {}) };
  if (literal(c.horarios)) { contacto.horarios = literal(c.horarios); hechos.push('horario'); }
  const tel = String(c.whatsapp || '').replace(/\D/g, '');
  if (tel.length >= 10 && t.replace(/\D/g, '').includes(tel.slice(-10))) { contacto.whatsapp = tel; hechos.push('whatsapp'); }
  if (c.correo && /^\S+@\S+\.\S+$/.test(c.correo) && texto.toLowerCase().includes(c.correo.toLowerCase())) { contacto.email = c.correo.trim(); hechos.push('correo'); }
  b = { ...b, contacto };
  if (literal(c.promocion)) { b = { ...b, oferta: { ...(b.oferta || {}), promocion_actual: literal(c.promocion) } }; hechos.push('promocion'); }
  return { brief: b, textos, hechos };
}

/**
 * Atiende el mensaje. → {accion:'elegir', letra, colores_de} | {accion:'ninguna'} | {accion:'reenviar'}
 *   | {responder:{textos}, brief} (ya resuelto) | null si la IA falló.
 */
export async function atenderMostradas(e, brief, p, { texto = '', clavesNuevas = [], elegida = null }) {
  // elegida: la letra ya elegida mientras la entrevista sigue; los cambios van a esa página y luego se retoma la pregunta pendiente.
  const urlElegida = elegida ? (p.opciones || []).find((o) => (o.etiqueta || o.letra) === elegida)?.url : null;
  const cierreM = (pp) => (elegida ? null : cierre(pp));
  const assets = (await db.assetsDe(e.id).catch(() => [])).filter(esImagen);
  // Las referencias (capturas para explicar un cambio) no se publican: no se ubican en ninguna sección.
  const nuevas = clavesNuevas.filter((k) => assets.some((a) => a.clave === k && a.tipo !== 'referencia'));
  const secciones = seccionesFotos(brief, p.textos);
  let d;
  try { d = await entender(e, brief, p, { texto, nuevas, fotos: assets, secciones, elegida }); }
  catch (err) { console.error('[propuestas_cambios] entender', err.message); return null; }
  await db.evento(e.id, 'mensaje_en_opciones', { texto: texto.slice(0, 300), nuevas, entendido: d }).catch(() => {});

  // Una letra solo cuenta si el cliente la nombró: un "hola" llegó a tomarse como elegir la B (10-nov-2026).
  if (d.intencion === 'elegir' && !mencionaOpcion(texto, d.letra, (p.opciones || []).find((o) => (o.etiqueta || o.letra) === String(d.letra || '').toUpperCase())?.nombre)) { d.intencion = elegida ? 'respuesta' : 'pregunta'; d.respuesta = ''; } // en opciones: solo se le recuerda elegir
  if (elegida && d.intencion === 'respuesta' && !nuevas.length) return { accion: 'seguir' };
  if (d.intencion === 'elegir' && /^[A-L]$/i.test(d.letra || '')) return { accion: 'elegir', letra: d.letra.toUpperCase(), colores_de: /^[A-L]$/i.test(d.colores_de || '') ? d.colores_de.toUpperCase() : null };
  if (d.intencion === 'ninguna') return { accion: 'ninguna' };
  if (d.intencion === 'reenviar') return { accion: 'reenviar' };

  // Antes de elegir no se modifica ninguna opción (10-nov-2026): el pedido se guarda y se aplica a la que elija.
  const CAMBIOS = ['agregar_fotos', 'ubicar_fotos', 'mover_fotos', 'cambio'];
  if (!elegida && (CAMBIOS.includes(d.intencion) || nuevas.length || clavesNuevas.length)) {
    const prev = p.cambio_pendiente || {};
    const pendiente = { texto: [prev.texto, texto].filter((x) => x && x.trim()).join('\n'), claves: [...new Set([...(prev.claves || []), ...clavesNuevas])] };
    const letra = opcionNombrada(texto, p.opciones);
    await db.evento(e.id, 'cambio_antes_de_elegir', { texto: texto.slice(0, 300), letra, pendiente }).catch(() => {});
    if (letra) return { accion: 'elegir', letra, colores_de: null, pendiente };
    const np = { ...p, cambio_pendiente: pendiente, esperando_fotos: false, fotos_por_ubicar: [], seccion_nuevas: null };
    return { responder: { textos: [preguntaQueOpcion(p)] }, brief: { ...brief, marca: { ...brief.marca, propuestas: np } } };
  }

  // Opción ya elegida (11-nov-2026): los datos van a la base y lo visual lo ajusta la IA sobre el sitio que se arma
  // desde la base (panel/cambios_vivo.js). Aquí no se aplica nada: se encola.
  if (elegida && (CAMBIOS.includes(d.intencion) || nuevas.length || clavesNuevas.length)) return { accion: 'encolar' };

  const valida = (s) => s === 'auto' || s === 'quitar' || (SECCIONES.includes(s) && secciones[s]);
  const seccionNuevas = valida(d.seccion_nuevas) && d.seccion_nuevas !== 'quitar' ? d.seccion_nuevas : (p.seccion_nuevas || null);

  // Pide agregar fotos y todavía no las manda: se le piden (y se recuerda la sección si ya la dijo).
  if (d.intencion === 'agregar_fotos' && !nuevas.length) {
    const np = { ...p, esperando_fotos: true, seccion_nuevas: seccionNuevas };
    return { responder: { textos: [pedirFotos(brief, p.textos, seccionNuevas, elegida ? 'en tu página' : undefined)] }, brief: { ...brief, marca: { ...brief.marca, propuestas: np } } };
  }

  // Ubicaciones: lo que dijo el cliente; las fotos nuevas sin sección toman la que dijo antes ("agrega fotos a la galería").
  const conocidas = new Set(assets.map((a) => a.clave));
  const ubic = new Map((d.ubicaciones || []).filter((u) => conocidas.has(u.clave) && valida(u.seccion)).map((u) => [u.clave, u.seccion]));
  if (seccionNuevas) for (const k of nuevas) if (!ubic.has(k)) ubic.set(k, seccionNuevas);
  const porUbicar = [...new Set([...(p.fotos_por_ubicar || []), ...nuevas])].filter((k) => !ubic.has(k));

  // Fotos sin sección: se pregunta dónde (las que ya tienen sección se aplican hasta que contesten por las demás).
  const previo = aplicarCambios(brief, p, d.cambios, texto);
  if (porUbicar.length && !previo.hechos.length && !ubic.size) {
    const np = { ...p, fotos_por_ubicar: porUbicar, esperando_fotos: false };
    return { responder: { textos: [preguntaUbicacion(brief, p.textos, porUbicar.length)] }, brief: { ...brief, marca: { ...brief.marca, propuestas: np } } };
  }

  let b = brief;
  const hechos = [];
  if (ubic.size) {
    const ubicacion = { ...(b.fotos?.ubicacion || {}) };
    const assetsCambio = [];
    for (const [k, s] of ubic) {
      if (s === 'quitar') { delete ubicacion[k]; assetsCambio.push({ clave: k, usar: false }); }
      else { if (s === 'auto') delete ubicacion[k]; else ubicacion[k] = s; assetsCambio.push({ clave: k, usar: true }); } // si pidió ponerla, se usa aunque la calidad no sea la mejor
    }
    await db.actualizarAssets(e.id, assetsCambio);
    b = { ...b, fotos: { ...(b.fotos || {}), ubicacion } };
    hechos.push('fotos');
  }
  const ap = aplicarCambios(b, p, d.cambios, texto);
  b = ap.brief;
  hechos.push(...ap.hechos);

  if (!hechos.length) {
    const resp = d.respuesta?.trim() || (d.intencion === 'pregunta' ? null : 'No me quedó claro qué cambio quieres. ¿Me lo explicas de otra forma? Por ejemplo: _agrega estas fotos en la portada_, _cambia el título por…_ o _quiero colores más claros_.');
    if (elegida) return { responder: { textos: [resp || 'Perfecto 👍'] }, brief, retomar: true };
    return { responder: { textos: resp ? [resp, cierre(p)] : [cierre(p)] }, brief };
  }

  let np;
  try { np = await rehacerMismas(e, b, { ...p, textos: ap.textos || p.textos }, texto, elegida); }
  catch (err) {
    console.error('[propuestas_cambios] rehacer', err);
    return { responder: { textos: [`No pude aplicar ese cambio a ${elegida ? 'tu página' : 'tus opciones'}. ¿Me lo explicas de otra forma? Si son fotos, intenta mandarlas otra vez.`] }, brief };
  }
  np = { ...np, fotos_por_ubicar: porUbicar, esperando_fotos: false, seccion_nuevas: null, cambios_aplicados: [...(p.cambios_aplicados || []), { texto: texto.slice(0, 500), hechos }] };
  const nb = { ...b, marca: { ...b.marca, propuestas: np } };
  await db.evento(e.id, 'opciones_ajustadas', { hechos, ubicaciones: Object.fromEntries(ubic) }).catch(() => {});
  const resumen = d.resumen?.trim() ? d.resumen.trim().replace(/^\p{Ll}/u, (x) => x.toUpperCase()).replace(/[.\s]*$/, '.') : 'Ya quedó.';
  const urlNueva = elegida ? (np.opciones || []).find((o) => (o.etiqueta || o.letra) === elegida)?.url || urlElegida : null;
  const textos = elegida ? [`Listo ✅ ${resumen} Recarga tu página para verlo 👇\n${urlNueva}`] : [`Listo ✅ ${resumen} Recarga las páginas para verlo 👇`, listaOpciones(np)];
  if (porUbicar.length) textos.push(preguntaUbicacion(b, np.textos, porUbicar.length).replace(/^¡Recibí[^?]*\?/, porUbicar.length === 1 ? 'Me falta una foto: ¿dónde la pongo?' : `Me faltan ${porUbicar.length} fotos: ¿dónde las pongo?`));
  else if (!elegida) textos.push(cierreM(np));
  return { responder: { textos }, brief: nb, retomar: !!elegida && !porUbicar.length };
}

/**
 * Imágenes que llegan con un pedido de cambio: ¿foto para la página o captura/referencia para entender el pedido?
 * Las referencias nunca se publican (tipo "referencia", usar=false). Caso JIGA (10-nov-2026): una captura se publicó como foto.
 */
export async function clasificarImagenesPedido(e, claves, { texto = '', urlPagina = '' } = {}) {
  if (!claves?.length) return;
  const assets = (await db.assetsDe(e.id).catch(() => [])).filter((a) => claves.includes(a.clave) && esImagen(a) && a.tipo !== 'referencia');
  const historial = (await db.ultimosMensajes(e.id, 6).catch(() => [])).map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${String(m.transcripcion || m.contenido || '').slice(0, 300)}`).join('\n');
  for (const a of assets) {
    const it = await interpretarImagenCambio(a.url, { texto, mismoMensaje: !!texto, historial, urlPagina });
    if (!it || it.uso === 'foto') continue;
    const desc = [`[${it.uso}]`, it.descripcion, it.senala, it.transcripcion ? `Texto: ${it.transcripcion}` : ''].filter(Boolean).join(' ').slice(0, 2000);
    await db.q(`UPDATE assets SET tipo='referencia', usar=false, descripcion_ia=$3 WHERE entrevista_id=$1 AND clave=$2`, [e.id, a.clave, desc]);
    await db.evento(e.id, 'imagen_interpretada', { clave: a.clave, uso: it.uso, razon: it.razon || null }).catch(() => {});
  }
}
