// Mensajes del cliente mientras ve sus 6 opciones (estado 'mostradas') que no son elegir una letra (10-nov-2026).
// Siempre abierto a modificaciones: agregar fotos, decir dónde va cada foto (portada, "Nuestro trabajo", galería…),
// moverlas o quitarlas, y cambios de textos, colores y datos. Se aplican de inmediato a las MISMAS 6 opciones
// (mismas ligas, mismo diseño) y se le pide recargar. Nada de "anotado": o se hace, o se le pide explicarlo de otra forma.
import * as db from './db.js';
import { pedirJSON } from './claude.js';
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

function pedirFotos(brief, textos, seccion) {
  const s = seccionesFotos(brief, textos);
  if (seccion && s[seccion]) return `¡Claro! Mándame por aquí las fotos que quieras agregar en *${s[seccion]}* (hasta 18 por envío) y las pongo en tus 6 opciones.`;
  const nombres = Object.values(s).map((v) => `*${v}*`);
  return `¡Claro! Mándame por aquí las fotos que quieras agregar (hasta 18 por envío). Si ya sabes dónde las quieres —${nombres.slice(0, -1).join(', ')} o ${nombres.at(-1)}— dímelo junto con las fotos; si no, te pregunto al recibirlas.`;
}

const listaOpciones = (p) => p.opciones.map((o) => `*${o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n');
const cierre = (p) => `¿Cuál te gusta más? Respóndeme con la letra (${p.opciones.map((o) => `*${o.letra}*`).join(', ')}). Si quieres cambiar algo más —fotos, textos, colores o dónde va cada cosa— dímelo y lo ajusto.`;

/** Entiende con IA qué quiere el cliente con su mensaje mientras ve las opciones. */
async function entender(e, brief, p, { texto, nuevas, fotos, secciones }) {
  const historial = (await db.ultimosMensajes(e.id, 10).catch(() => [])).map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${String(m.transcripcion || m.contenido || '').slice(0, 300)}`).join('\n');
  const ub = brief.fotos?.ubicacion || {};
  const fotosTxt = fotos.map((a) => `- ${a.clave}${nuevas.includes(a.clave) ? ` (NUEVA #${nuevas.indexOf(a.clave) + 1} de este mensaje)` : (p.fotos_por_ubicar || []).includes(a.clave) ? ' (mandada antes, SIN SECCIÓN todavía)' : ''} · sección: ${ub[a.clave] || 'automática'} · ${String(a.descripcion_ia || a.nota || '').slice(0, 160)}`).join('\n');
  const secTxt = Object.entries(secciones).map(([k, v]) => `${k} = «${v}»`).join(', ');
  const r = await pedirJSON({
    system: `Eres Ari, asistente que crea páginas web por chat para negocios pequeños en México. El cliente está viendo sus 6 opciones de diseño (letras A a F) y te escribió. Decide qué quiere y conviértelo en acciones concretas. Siempre estás abierto a cualquier modificación.
Intenciones:
- "elegir": elige una opción (pon "letra" y, si pide mezcla, "colores_de").
- "ninguna": ninguna opción le gusta y quiere diseños distintos.
- "reenviar": quiere que le vuelvas a mandar las ligas.
- "agregar_fotos": quiere agregar fotos pero aún no las manda. Si dijo dónde, pon "seccion_nuevas".
- "ubicar_fotos": mandó fotos nuevas o dice dónde poner fotos que mandó (incluye las SIN SECCIÓN). Llena "ubicaciones" con CADA foto de la que se sepa la sección. Si mandó fotos nuevas sin decir dónde, deja "ubicaciones" vacío (se le preguntará). Si dice "tú decide", "donde quieras" o similar, usa sección "auto" para esas fotos. "la primera", "la segunda"… se refieren al número de NUEVA; "todas" son todas las nuevas o sin sección.
- "mover_fotos": quiere cambiar de sección o quitar fotos que ya están (identifícalas por su descripción). Sección "quitar" solo si pide claramente quitarla.
- "cambio": otro cambio a sus opciones: textos, nombre de una sección, colores, estilo, datos de contacto, horario o promoción. Llena "cambios".
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
        intencion: { type: 'string', enum: ['elegir', 'ninguna', 'reenviar', 'agregar_fotos', 'ubicar_fotos', 'mover_fotos', 'cambio', 'pregunta', 'otro'] },
        letra: { type: 'string' }, colores_de: { type: 'string' },
        seccion_nuevas: { type: 'string' },
        ubicaciones: { type: 'array', items: { type: 'object', properties: { clave: { type: 'string' }, seccion: { type: 'string' } }, required: ['clave', 'seccion'] } },
        cambios: {
          type: 'object',
          properties: {
            titular: { type: 'string' }, subtitulo: { type: 'string' }, boton: { type: 'string' },
            colores: { type: 'array', items: { type: 'string' } }, estilo: { type: 'string', enum: ESTILOS }, evitar: { type: 'array', items: { type: 'string' } },
            titulos_secciones: { type: 'object', properties: { trabajo: { type: 'string' }, galeria: { type: 'string' }, servicios: { type: 'string' }, sobre: { type: 'string' }, resenas: { type: 'string' }, faq: { type: 'string' }, contacto: { type: 'string' } } },
            horarios: { type: 'string' }, whatsapp: { type: 'string' }, correo: { type: 'string' }, promocion: { type: 'string' },
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
async function rehacerMismas(e, brief, p, pedido) {
  const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
  const textos = p.textos || await textosPropuestas(brief, mat);
  const r = await crearPropuestasHTML(brief, mat, textos, { token: p.token, ronda: p.ronda || 0 });
  const opciones = p.opciones.map((o) => {
    const n = r.opciones.find((x) => x.letra === o.letra);
    return n ? { ...o, url: n.url, paleta: n.paleta, estilo: n.fuentes.estilo, tipografia: { titulos: n.fuentes.titulos, cuerpo: n.fuentes.cuerpo } } : o;
  });
  // Regla dura: revisión visual antes de mandarlas. Aquí no se quitan opciones (el cliente ya las vio); solo se corrigen.
  await revisarYCorregir(opciones, { referencia: (brief.marca?.referencias_sitios || [])[0] || null, pedido, rondas: 1 }).catch((err) => console.error('[propuestas_cambios] revisión', err.message));
  return { ...p, opciones, textos };
}

/** Aplica los cambios de texto y datos. Solo textos que el cliente escribió tal cual (letra por letra). */
function aplicarCambios(brief, p, c = {}, texto = '') {
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
export async function atenderMostradas(e, brief, p, { texto = '', clavesNuevas = [] }) {
  const assets = (await db.assetsDe(e.id).catch(() => [])).filter(esImagen);
  // Las referencias (capturas para explicar un cambio) no se publican: no se ubican en ninguna sección.
  const nuevas = clavesNuevas.filter((k) => assets.some((a) => a.clave === k && a.tipo !== 'referencia'));
  const secciones = seccionesFotos(brief, p.textos);
  let d;
  try { d = await entender(e, brief, p, { texto, nuevas, fotos: assets, secciones }); }
  catch (err) { console.error('[propuestas_cambios] entender', err.message); return null; }
  await db.evento(e.id, 'mensaje_en_opciones', { texto: texto.slice(0, 300), nuevas, entendido: d }).catch(() => {});

  if (d.intencion === 'elegir' && /^[A-F]$/i.test(d.letra || '')) return { accion: 'elegir', letra: d.letra.toUpperCase(), colores_de: /^[A-F]$/i.test(d.colores_de || '') ? d.colores_de.toUpperCase() : null };
  if (d.intencion === 'ninguna') return { accion: 'ninguna' };
  if (d.intencion === 'reenviar') return { accion: 'reenviar' };

  const valida = (s) => s === 'auto' || s === 'quitar' || (SECCIONES.includes(s) && secciones[s]);
  const seccionNuevas = valida(d.seccion_nuevas) && d.seccion_nuevas !== 'quitar' ? d.seccion_nuevas : (p.seccion_nuevas || null);

  // Pide agregar fotos y todavía no las manda: se le piden (y se recuerda la sección si ya la dijo).
  if (d.intencion === 'agregar_fotos' && !nuevas.length) {
    const np = { ...p, esperando_fotos: true, seccion_nuevas: seccionNuevas };
    return { responder: { textos: [pedirFotos(brief, p.textos, seccionNuevas)] }, brief: { ...brief, marca: { ...brief.marca, propuestas: np } } };
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
    return { responder: { textos: resp ? [resp, cierre(p)] : [cierre(p)] }, brief };
  }

  let np;
  try { np = await rehacerMismas(e, b, { ...p, textos: ap.textos || p.textos }, texto); }
  catch (err) {
    console.error('[propuestas_cambios] rehacer', err);
    return { responder: { textos: ['No pude aplicar ese cambio a tus opciones. ¿Me lo explicas de otra forma? Si son fotos, intenta mandarlas otra vez.'] }, brief };
  }
  np = { ...np, fotos_por_ubicar: porUbicar, esperando_fotos: false, seccion_nuevas: null, cambios_aplicados: [...(p.cambios_aplicados || []), { texto: texto.slice(0, 500), hechos }] };
  const nb = { ...b, marca: { ...b.marca, propuestas: np } };
  await db.evento(e.id, 'opciones_ajustadas', { hechos, ubicaciones: Object.fromEntries(ubic) }).catch(() => {});
  const resumen = d.resumen?.trim() ? d.resumen.trim().replace(/^\p{Ll}/u, (x) => x.toUpperCase()).replace(/[.\s]*$/, '.') : 'Ya quedó.';
  const textos = [`Listo ✅ ${resumen} Recarga las páginas para verlo 👇`, listaOpciones(np)];
  if (porUbicar.length) textos.push(preguntaUbicacion(b, np.textos, porUbicar.length).replace(/^¡Recibí[^?]*\?/, porUbicar.length === 1 ? 'Me falta una foto: ¿dónde la pongo?' : `Me faltan ${porUbicar.length} fotos: ¿dónde las pongo?`));
  else textos.push(cierre(np));
  return { responder: { textos }, brief: nb };
}
