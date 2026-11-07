// Requisitos por bloque, revisados en código (no por el modelo) antes de cada pregunta de Ari:
// si a un bloque anterior le falta algo que se necesita después (fotos, logo, servicios…), se vuelve a pedir
// antes de avanzar, y no se mandan propuestas ni se cierra la entrevista hasta tenerlo.
// "El cliente dijo que no lo tiene" se registra en brief.no_tiene[] (solo para requisitos con puedeNoTener).
import { BLOQUES } from './prompts.js';

const vacio = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
const noTiene = (brief, id) => Array.isArray(brief?.no_tiene) && brief.no_tiene.includes(id);
const TIPOS_FOTO = ['foto_local', 'foto_producto', 'foto_equipo', 'foto_fundador', 'foto_otro'];

export const fotosUtiles = (assets = []) => assets.filter((a) => a.usar !== false && TIPOS_FOTO.includes(a.tipo));
export const logoRecibido = (assets = []) => assets.some((a) => a.tipo === 'logo');

// id · bloque · cumple(brief, assets) · pedir (texto para el cliente si hay que volver a pedirlo) · puedeNoTener
export const REQUISITOS = [
  { id: 'nombre_cliente', bloque: 'B0', cumple: (b) => !vacio(b.cliente?.nombre), pedir: '¿Cómo te llamas?' },
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
  { id: 'faq', bloque: 'B8', puedeNoTener: true, cumple: (b) => Array.isArray(b.faq) && b.faq.length >= 3, pedir: '¿Qué te preguntan SIEMPRE tus clientes antes de contratar? Dime 3 o 4, con cómo las contestas tú.' },
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
  if (previos.length) lineas.push(`FALTA DE BLOQUES ANTERIORES (pídelo YA, antes de cualquier otra pregunta, una cosa por mensaje):\n${previos.map((f) => `- ${f.bloque} ${f.id}: "${f.pedir}"`).join('\n')}`);
  if (actuales.length) lineas.push(`FALTA EN ESTE BLOQUE (no lo cierres sin esto):\n${actuales.map((f) => `- ${f.id}${f.puedeNoTener ? ' (si dice que no lo tiene, agrega "' + f.id + '" a brief_patch.no_tiene)' : ''}`).join('\n')}`);
  return lineas.length ? `REVISIÓN DE REQUISITOS (la hace el sistema; es la verdad):\n${lineas.join('\n')}` : 'REVISIÓN DE REQUISITOS: todo lo de los bloques anteriores está completo.';
}

/** Une brief.no_tiene anterior con lo que Ari agregó (los arreglos se reemplazan al mezclar). */
export function unirNoTiene(anterior, nuevo) {
  const ids = new Set(REQUISITOS.filter((r) => r.puedeNoTener).map((r) => r.id).concat('logo'));
  return [...new Set([...(anterior || []), ...(nuevo || [])])].filter((x) => ids.has(x));
}
