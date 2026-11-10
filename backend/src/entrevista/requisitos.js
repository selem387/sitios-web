// Requisitos por bloque, revisados en código (no por el modelo) antes de cada pregunta de Ari:
// si a un bloque anterior le falta algo que se necesita después (fotos, logo, servicios…), se vuelve a pedir
// antes de avanzar, y no se mandan propuestas ni se cierra la entrevista hasta tenerlo.
// "El cliente dijo que no lo tiene" se registra en brief.no_tiene[] (solo para requisitos con puedeNoTener).
import { BLOQUES } from './prompts.js';

const vacio = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
const noTiene = (brief, id) => Array.isArray(brief?.no_tiene) && brief.no_tiene.includes(id);
const faqLista = (b) => (Array.isArray(b?.faq) ? b.faq.filter((x) => x && !vacio(x.pregunta)) : []);
const faqConRespuesta = (b) => faqLista(b).filter((x) => !vacio(x.respuesta)).length;
const faqSinRespuesta = (b) => faqLista(b).filter((x) => vacio(x.respuesta));
const TIPOS_FOTO = ['foto_local', 'foto_producto', 'foto_equipo', 'foto_fundador', 'foto_otro'];

export const fotosUtiles = (assets = []) => assets.filter((a) => a.usar !== false && TIPOS_FOTO.includes(a.tipo));
export const logoRecibido = (assets = []) => assets.some((a) => a.tipo === 'logo');

// id · bloque · cumple(brief, assets) · pedir (texto para el cliente si hay que volver a pedirlo) · puedeNoTener
export const REQUISITOS = [
  { id: 'nombre_cliente', bloque: 'B0', cumple: (b) => !vacio(b.cliente?.nombre), pedir: '¿Cómo te llamas?' },
  // Ligas de Facebook/Instagram justo después del nombre: de ahí salen nombre, giro, ciudad, servicios, logo y fotos.
  { id: 'redes', bloque: 'B0', puedeNoTener: true, cumple: (b) => !!b.redes_extraccion || !vacio(b.contacto?.redes?.facebook) || !vacio(b.contacto?.redes?.instagram),
    pedir: '¿Tu negocio tiene página de Facebook o Instagram? Mándame las ligas (o tu @usuario) y de ahí tomo tu logo, tus fotos y tus datos para hacerte menos preguntas. Si no tienes, dime y seguimos.' },
  { id: 'nombre_negocio', bloque: 'B1', cumple: (b) => !vacio(b.negocio?.nombre), pedir: '¿Cómo se llama tu negocio?' },
  { id: 'giro', bloque: 'B1', cumple: (b) => !vacio(b.negocio?.giro_texto) && !vacio(b.negocio?.arquetipo), pedir: '¿A qué se dedica tu negocio? Cuéntamelo como se lo dirías a un amigo.' },
  { id: 'ciudad', bloque: 'B1', cumple: (b) => !vacio(b.negocio?.ciudad), pedir: '¿En qué ciudad está tu negocio?' },
  { id: 'objetivo', bloque: 'B2', cumple: (b) => !vacio(b.objetivo?.principal), pedir: 'Cuando alguien entre a tu página, ¿qué quieres que haga? ¿Que te escriba por WhatsApp, que agende, que compre, que llegue a tu local…?' },
  { id: 'cliente_ideal', bloque: 'B3', cumple: (b) => !vacio(b.cliente_ideal?.descripcion), pedir: '¿Quién es tu cliente típico? Edad aproximada, qué busca, qué le preocupa.' },
  { id: 'zona', bloque: 'B3', cumple: (b) => !vacio(b.zona?.cobertura), pedir: '¿En qué zonas atiendes? Colonias, ciudades o estados.' },
  { id: 'servicios', bloque: 'B4', cumple: (b) => !vacio(b.oferta?.items), pedir: 'Dime tus 3 a 6 servicios o productos principales, del más importante al menos.' },
  { id: 'diferenciador', bloque: 'B4', puedeNoTener: true, cumple: (b) => !vacio(b.oferta?.diferenciador), pedir: '¿Qué te hace diferente de otros que hacen lo mismo?' },
  { id: 'logo', bloque: 'B5', cumple: (b, a) => b.marca?.tiene_logo === false || noTiene(b, 'logo') || logoRecibido(a),
    pedir: (b) => (b.marca?.tiene_logo === true ? 'Me dijiste que sí tienes logotipo, pero todavía no me llega. ¿Me lo mandas por aquí? Si no lo tienes a la mano, dime y seguimos sin él.' : '¿Tienes logotipo? Mándamelo aquí. Si no, no pasa nada, lo resolvemos.') },
  { id: 'personalidad', bloque: 'B5', cumple: (b) => !vacio(b.marca?.personalidad), pedir: 'Si tu negocio fuera una persona, ¿cómo sería? Dame 3 palabras, por ejemplo "confiable, moderno, cercano".' },
  { id: 'estilo', bloque: 'B5', cumple: (b) => !vacio(b.marca?.estilo), pedir: '¿Qué estilo te late más para tu página: elegante, fresco, minimalista, cálido, tecnológico o tradicional?' },
  { id: 'fotos', bloque: 'B6', cumple: (b, a) => fotosUtiles(a).length > 0 || (b.fotos?.sin_fotos === true && !vacio(b.fotos?.temas)),
    pedir: (b) => (b.fotos?.sin_fotos === true ? 'Como no tienes fotos, dime de qué te gustaría que fueran (por ejemplo: tu local, tus platillos, gente usando tu servicio) para buscarte ejemplos o crearlas.' : 'Antes de seguir necesito las fotos de tu negocio: tu local o espacio, tus productos o trabajos, tú y tu equipo. Mándame las que tengas. Si no tienes, dime de qué te gustaría que fueran para buscarte ejemplos o crearlas.') },
  { id: 'testimonios', bloque: 'B7', puedeNoTener: true, cumple: (b) => !vacio(b.confianza?.testimonios) || !vacio(b.confianza?.link_resenas), pedir: '¿Tienes reseñas en Google o Facebook? Mándame la liga, o copia 2 o 3 comentarios de clientes contentos.' },
  // Una pregunta sin respuesta no se publica (la sección no sale): cuentan solo las que traen respuesta, y se pide la que falte.
  { id: 'faq', bloque: 'B8', puedeNoTener: true, cumple: (b) => faqConRespuesta(b) >= 3 && !faqSinRespuesta(b).length,
    pedir: (b) => { const sin = faqSinRespuesta(b); return sin.length ? `¿Cómo le contestas a tus clientes cuando te preguntan "${String(sin[0].pregunta).trim()}"? Escríbemelo tal cual quieres que aparezca en tu página.` : '¿Qué te preguntan SIEMPRE tus clientes antes de contratar? Dime 3 o 4, con cómo las contestas tú.'; } },
  { id: 'whatsapp', bloque: 'B9', cumple: (b) => !vacio(b.contacto?.whatsapp) || !vacio(b.contacto?.telefono), pedir: '¿A qué número de WhatsApp quieres que te escriban desde la página? ¿Es el mismo que este?' },
  { id: 'horarios', bloque: 'B9', puedeNoTener: true, cumple: (b) => !vacio(b.contacto?.horarios), pedir: '¿Cuáles son tus horarios de atención?' },
];

const idx = (bl) => BLOQUES.indexOf(bl);
// Atajo a las propuestas: ids en brief.diferir[] se saltan hasta que el cliente elige diseño;
// después vuelven a contar y la revisión de requisitos hace que Ari los pida.
const diferido = (brief, id) => Array.isArray(brief?.diferir) && brief.diferir.includes(id) && brief?.marca?.propuestas?.estado !== 'elegida';
const textoPedir = (r, brief) => (typeof r.pedir === 'function' ? r.pedir(brief) : r.pedir);

/** Requisitos sin cumplir de los bloques en [desde, hasta] (inclusive). */
export function faltantes(brief = {}, assets = [], { hasta = 'B12', desde = 'B0' } = {}) {
  return REQUISITOS
    .filter((r) => idx(r.bloque) >= idx(desde) && idx(r.bloque) <= idx(hasta))
    .filter((r) => !r.cumple(brief, assets) && !(r.puedeNoTener && noTiene(brief, r.id)) && !diferido(brief, r.id))
    .map((r) => ({ id: r.id, bloque: r.bloque, pedir: textoPedir(r, brief), puedeNoTener: !!r.puedeNoTener }));
}

/** Bloque más temprano con algo pendiente antes de `bloque` (excluido), o null. */
export function primerBloqueIncompleto(brief, assets, bloque) {
  const i = idx(bloque);
  if (i <= 0) return null;
  const f = faltantes(brief, assets, { hasta: BLOQUES[i - 1] });
  return f.length ? f[0].bloque : null;
}

/** Texto para el prompt de Ari: lo que falta de bloques anteriores y del actual. */
export function notaRequisitos(brief, assets, bloque) {
  const i = idx(bloque);
  const previos = i > 0 ? faltantes(brief, assets, { hasta: BLOQUES[i - 1] }) : [];
  const actuales = faltantes(brief, assets, { desde: bloque, hasta: bloque });
  const lineas = [];
  if (previos.length) lineas.push(`FALTA DE BLOQUES ANTERIORES (pídelo YA, antes de cualquier otra pregunta, una cosa por mensaje):\n${previos.map((f) => `- ${f.bloque} ${f.id}: "${f.pedir}"${f.puedeNoTener ? ' (si dice que no lo tiene, agrega "' + f.id + '" a brief_patch.no_tiene y no lo vuelvas a pedir)' : ''}`).join('\n')}`);
  if (actuales.length) lineas.push(`FALTA EN ESTE BLOQUE (no lo cierres sin esto; pídelo de uno en uno, una cosa por mensaje):\n${actuales.map((f) => `- ${f.id}${f.puedeNoTener ? ' (si dice que no lo tiene, agrega "' + f.id + '" a brief_patch.no_tiene)' : ''}`).join('\n')}`);
  const nt = (brief?.no_tiene || []).filter((x) => ETIQUETA[x]);
  if (nt.length) lineas.push(`EL CLIENTE YA DIJO QUE NO TIENE (no lo vuelvas a preguntar, ni con otras palabras, ni repitas "ya anoté…" de turnos anteriores): ${nt.map((x) => ETIQUETA[x]).join('; ')}. Si de este bloque ya no queda nada que no esté aquí, ciérralo y pasa al siguiente.`);
  const ya = yaTiene(brief);
  if (ya.length) lineas.push(`YA TIENES ESTOS DATOS (no los vuelvas a preguntar, ni a pedir que los confirme, ni a pedir más detalle; si el cliente los corrige, actualízalos): ${ya.join('; ')}.`);
  const om = (brief?.omitidas || []).slice(-12);
  if (om.length) lineas.push(`EL CLIENTE PIDIÓ OMITIR ESTAS PREGUNTAS (no las vuelvas a hacer ni con otras palabras; sigue con lo siguiente): ${om.map((x) => `"${x}"`).join('; ')}.`);
  return lineas.length ? `REVISIÓN DE REQUISITOS (la hace el sistema; es la verdad):\n${lineas.join('\n')}` : 'REVISIÓN DE REQUISITOS: todo lo de los bloques anteriores está completo.';
}

// Respuestas negativas cortas ("no", "no no tengo", "ninguna", "todavía no"…) a una pregunta de un requisito
// que se puede no tener: se registran en código en brief.no_tiene para que ese requisito no se vuelva a pedir
// aunque el modelo olvide marcarlo (caso Punto Legal, 8-nov-2026: pidió las reseñas tres veces).
const TEMA = {
  testimonios: /rese[nñ]as?|testimonio|comentarios? de (tus |sus )?clientes|clientes contentos|opiniones/,
  faq: /preguntan|preguntas frecuentes/,
  certificaciones: /certificaci|premio|reconocimiento|titulo|cedula|acreditaci|credencial/,
  cifras: /cifra|numero que|numeros? que impresione|anos de experiencia|cuantos (clientes|tramites|proyectos)/,
  garantias: /garantia|quite el miedo/,
  historia: /como empezo|historia del (negocio|equipo)|como nacio/,
  equipo: /tu equipo|quien(es)? (esta|estan|trabaja)/,
  otro_dato_confianza: /otro dato de confianza|algun otro dato|algo mas que (quieras|te gustaria) (incluir|agregar|mostrar)/,
  diferenciador: /diferente|diferencia|distingue|que otros no/,
  horarios: /horario/,
  logo: /logo/,
  redes: /facebook|instagram/,
};
// Temas opcionales (no son requisitos): si dijo que no los tiene, tampoco se vuelven a preguntar.
export const OPCIONALES = { certificaciones: 'certificaciones, premios o reconocimientos', cifras: 'cifras o números (años, clientes, trámites)', garantias: 'garantías', historia: 'historia del negocio', equipo: 'equipo', otro_dato_confianza: 'otro dato de confianza' };
const ETIQUETA = { redes: 'página de Facebook o Instagram', testimonios: 'reseñas o testimonios', faq: 'preguntas frecuentes', diferenciador: 'diferenciador', horarios: 'horarios', logo: 'logotipo', ...OPCIONALES };
const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zñ0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const NEG = /^(no+|nop|nel|nada|ningun[oa]?s?|aun no|todavia no|por ahora no|no por (ahora|el momento)|sin \w+|de momento no)( (no|tengo|tenemos|hay|cuento|contamos|con|ninguna?o?s?|las|los|la|lo|ahorita|aun|todavia|por ahora|resenas|testimonios|comentarios|logo|redes|redes sociales|facebook|instagram|face|insta|ni|horarios?|nada|gracias|la verdad|realmente|fijo|todavia no))*$/;

export function esNegativa(respuesta) {
  const r = norm(respuesta);
  return !!r && r.length <= 60 && NEG.test(r) && !/\b(pero|si tengo|aqui|te mando|ahi va)\b/.test(r);
}

/** Requisito (puedeNoTener o logo) al que se refiere la última pregunta de un mensaje de Ari, o null. */
export function requisitoDePregunta(mensaje) {
  const qs = String(mensaje || '').match(/¿[^?]*\?/g);
  const q = norm(qs ? qs[qs.length - 1] : mensaje);
  return Object.keys(TEMA).find((id) => TEMA[id].test(q)) || null;
}

/** Ids que el cliente dijo que no tiene, leídos del historial (pares pregunta de Ari → respuesta del cliente). */
export function noTieneDelHistorial(mensajes = []) {
  const ids = new Set();
  for (let i = 0; i < mensajes.length - 1; i++) {
    const m = mensajes[i];
    if (m.rol !== 'agente' || m.tipo === 'imagen') continue;
    const sig = mensajes[i + 1];
    if (sig?.rol !== 'cliente') continue;
    const id = requisitoDePregunta(m.contenido);
    if (id && esNegativa(sig.transcripcion || sig.contenido)) ids.add(id);
  }
  return [...ids];
}

/** true si la pregunta del reply es de algo que el cliente ya dijo que no tiene. */
export const preguntaYaNegada = (reply, brief) => { const id = requisitoDePregunta(reply); return !!id && (brief?.no_tiene || []).includes(id); };

/** Une brief.no_tiene anterior con lo que Ari agregó (los arreglos se reemplazan al mezclar). */
export function unirNoTiene(anterior, nuevo) {
  const ids = new Set(REQUISITOS.filter((r) => r.puedeNoTener).map((r) => r.id).concat('logo', ...Object.keys(OPCIONALES)));
  return [...new Set([...(anterior || []), ...(nuevo || [])])].filter((x) => ids.has(x));
}

// Datos que el cliente ya contestó y el modelo no guardó: se toman en código de su respuesta a la pregunta
// (caso JIGA, 9-nov-2026: preguntó la ciudad tres veces y las zonas dos, con la respuesta ya en el chat).
const PREG_DATO = {
  ciudad: /(en que|que) ciudad|donde (esta|estas|queda|se ubica|tienes) (tu|su)? ?(negocio|oficina|local)|oficina principal/,
  zona: /que zonas?|zonas? (atiendes|cubres|trabajas|das servicio)|donde (atiendes|das servicio|trabajas)/,
};
const limpiarLugar = (t) => String(t || '').replace(/^\s*(s?t[aá]|est[aá]n?|estamos|en|la oficina est[aá]|las oficinas est[aá]n)\s+(en\s+)?/i, '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
const ciudadDeTexto = (t) => {
  const m = String(t || '').match(/(?:zona de|en la zona de|ciudad de|en)\s+([A-ZÁÉÍÓÚÑ][^,.;]*(?:,\s*[A-ZÁÉÍÓÚÑ][^,.;]*)?)\s*\.?\s*$/);
  return limpiarLugar(m ? m[1] : t);
};

/** Rellena negocio.ciudad y zona.cobertura vacíos con la respuesta del cliente a esa pregunta. { brief, cambio } */
export function rellenarDelHistorial(brief = {}, mensajes = []) {
  let b = brief; let cambio = false;
  const set = (ruta, valor) => { b = { ...b, [ruta[0]]: { ...(b[ruta[0]] || {}), [ruta[1]]: valor } }; cambio = true; };
  for (let i = mensajes.length - 2; i >= 0; i--) {
    const m = mensajes[i]; const sig = mensajes[i + 1];
    if (m.rol !== 'agente' || sig?.rol !== 'cliente') continue;
    const resp = String(sig.transcripcion || sig.contenido || '').trim();
    if (!resp || esNegativa(resp) || resp.length > 300) continue;
    const qs = String(m.contenido || '').match(/¿[^?]*\?/g); const q = norm(qs ? qs[qs.length - 1] : m.contenido);
    if (PREG_DATO.ciudad.test(q) && vacio(b.negocio?.ciudad)) set(['negocio', 'ciudad'], ciudadDeTexto(resp));
    else if (PREG_DATO.zona.test(q) && vacio(b.zona?.cobertura)) set(['zona', 'cobertura'], resp.split(/\s*(?:;|\by\b|\n)\s*/).map(limpiarLugar).filter(Boolean));
  }
  // La dirección de contacto también dice la ciudad.
  if (vacio(b.negocio?.ciudad) && !vacio(b.contacto?.direccion?.ciudad)) set(['negocio', 'ciudad'], b.contacto.direccion.ciudad);
  return { brief: b, cambio };
}

// Datos ya capturados que Ari no debe volver a preguntar ni "confirmar" (caso JIGA: ciudad 3 veces, zonas en 3 variantes).
const CAMPOS_YA = [
  ['ciudad', (b) => b.negocio?.ciudad], ['zonas que atiende', (b) => b.zona?.cobertura], ['años', (b) => b.negocio?.anios],
  ['modalidad', (b) => b.negocio?.modalidad], ['tamaño del equipo', (b) => b.negocio?.tamano], ['objetivo', (b) => b.objetivo?.principal],
  ['cliente ideal', (b) => b.cliente_ideal?.descripcion], ['qué le preocupa / problema que resuelve', (b) => b.cliente_ideal?.problema_que_resuelves],
  ['idiomas', (b) => (Array.isArray(b.zona?.idiomas) && b.zona.idiomas.length > 1 ? b.zona.idiomas : null)],
  ['servicios', (b) => (Array.isArray(b.oferta?.items) ? b.oferta.items.map((x) => (typeof x === 'string' ? x : x?.nombre)).filter(Boolean) : null)],
  ['diferenciador', (b) => b.oferta?.diferenciador],
];
function yaTiene(b = {}) {
  return CAMPOS_YA.map(([et, f]) => { const v = f(b); return vacio(v) ? null : `${et}: ${Array.isArray(v) ? v.join(', ') : String(v).slice(0, 120)}`; }).filter(Boolean);
}

// "Omite esa pregunta", "sáltala", "luego te digo"…: no se vuelve a preguntar. Si era un requisito, se difiere
// (opcional → no_tiene; obligatorio → diferir hasta elegir diseño) para que la revisión no lo exija de nuevo.
const OMITIR = /\b(omit[ea]|omitir|omitela|omitamos|salta(la|te)?|saltemos|pasa(le)? a la siguiente|siguiente pregunta|despues te (digo|lo digo|paso)|luego te (digo|lo digo|paso)|no quiero (contestar|responder)( eso)?|prefiero no (contestar|responder|decir))\b/;
export const esOmitir = (t) => { const r = norm(t); return !!r && r.length <= 80 && OMITIR.test(r); };
const ID_PREGUNTA = (q) => Object.keys(PREG_DATO).find((id) => PREG_DATO[id].test(q)) || Object.keys(TEMA).find((id) => TEMA[id].test(q)) || null;

export function omitidasDelHistorial(brief = {}, mensajes = []) {
  const preguntas = new Set(brief.omitidas || []); const noT = new Set(brief.no_tiene || []); const dif = new Set(brief.diferir || []);
  for (let i = 0; i < mensajes.length - 1; i++) {
    const m = mensajes[i]; const sig = mensajes[i + 1];
    if (m.rol !== 'agente' || sig?.rol !== 'cliente' || !esOmitir(sig.transcripcion || sig.contenido)) continue;
    const qs = String(m.contenido || '').match(/¿[^?]*\?/g); if (!qs) continue;
    const pregunta = qs[qs.length - 1].trim(); preguntas.add(pregunta);
    const id = ID_PREGUNTA(norm(pregunta)); const r = REQUISITOS.find((x) => x.id === id);
    if (r?.puedeNoTener || (id && OPCIONALES[id])) noT.add(id); else if (r) dif.add(id);
  }
  return { ...brief, omitidas: [...preguntas].slice(-20), no_tiene: unirNoTiene([...noT]), diferir: [...dif] };
}
