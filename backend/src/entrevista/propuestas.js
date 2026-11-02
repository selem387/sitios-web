// Paso de propuestas visuales dentro de la entrevista (entre B8 fotos y B9 contacto):
// 1) revisar materiales (logo, fotos, menú); si no alcanzan para una propuesta digna, decirlo y pedir mejores,
//    con la opción "no las tengo" → se trabaja con lo que mandó (nunca se omiten sus imágenes);
// 2) mandar 3 opciones A/B/C con su logo, colores y fotos; 3) registrar la elegida (o mezclas / ninguna).
// Estado en brief.marca.propuestas = {estado, pedidos, opciones[], elegido, colores_de, rechazos[], comentario}.
import { procesarMateriales } from '../generador/materiales.js';
import { crearOpciones, interpretarEleccion } from '../generador/opciones.js';

const NO_TENGO = /no (las |los )?tengo|no tengo (m[aá]s|otras|mejores)|son (todas|las [uú]nicas)|con esas|as[ií] est[aá] bien|usa(lo)? (esas|lo que hay)|no hay (m[aá]s|otras)/i;
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const propuestasPendientes = (brief) => ['pendiente_material', 'mostradas', 'rechazadas'].includes(brief?.marca?.propuestas?.estado);
export const tocaPropuestas = (brief, bloqueAnterior, bloqueNuevo) =>
  !brief?.marca?.propuestas && BLOQUES_ORDEN.indexOf(bloqueAnterior) >= BLOQUES_ORDEN.indexOf('B8') && bloqueNuevo !== 'B8' && bloqueAnterior !== bloqueNuevo;
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

function mensajeOpciones(op) {
  return {
    textos: [
      'Te preparé 3 propuestas de cómo se vería el inicio de tu página en el celular, con tu logo, tus colores y tus fotos 👇',
      '¿Cuál te gusta más: *A*, *B* o *C*? También puedes pedir mezclas, por ejemplo _la A con los colores de la C_, o decirme qué cambiarías.',
    ],
    media: op.opciones.map((o) => ({ url: o.url, tipo: 'imagen', caption: `Opción ${o.etiqueta}` })),
  };
}

async function mostrar(e, brief, mat, { excluir = [] } = {}) {
  const b = { ...brief, marca: { ...brief.marca, estilo: excluir.includes(brief.marca?.estilo) ? null : brief.marca?.estilo } };
  const op = await crearOpciones(b, mat, hash(e.id) + excluir.length * 7, { excluir });
  const prev = brief.marca?.propuestas || {};
  return { propuestas: { ...prev, estado: 'mostradas', opciones: op.opciones, textos: op.textos, usados: [...new Set([...(prev.usados || []), ...op.opciones.map((o) => o.estilo)])] }, salida: mensajeOpciones(op) };
}

/**
 * Se llama ANTES del turno de Ari cuando hay propuestas pendientes. Devuelve
 * {responder:{textos, media}, brief, seguirConAri:boolean}.
 */
export async function atenderPropuestas(e, brief, { texto = '', huboMedia = false }) {
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
    const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
    const comentario = [p.comentario, texto].filter(Boolean).join(' · ');
    const m = await mostrar(e, { ...brief, marca: { ...brief.marca, referencias_que_gusta: [brief.marca?.referencias_que_gusta, comentario].filter(Boolean).join(' · ') } }, mat, { excluir: p.usados || [] });
    return { responder: m.salida, brief: { ...brief, marca: { ...brief.marca, propuestas: { ...m.propuestas, comentario } } }, seguirConAri: false };
  }
  if (p.estado === 'mostradas') {
    const r = interpretarEleccion(texto);
    if (!r) return { responder: { textos: ['¿Cuál de las 3 te gustó más: *A*, *B* o *C*? Si ninguna te convence, dime *ninguna* y qué te gustaría distinto.'] }, brief, seguirConAri: false };
    if (r.ninguna) {
      return { responder: { textos: ['Va, hago otras. ¿Qué no te gustó o qué te gustaría ver? Por ejemplo: colores más claros, letras más sencillas, que la foto se vea más grande.'] }, brief: { ...brief, marca: { ...brief.marca, propuestas: { ...p, estado: 'rechazadas', rechazos: [...(p.rechazos || []), texto] } } }, seguirConAri: false };
    }
    const elegida = p.opciones.find((o) => o.etiqueta === r.elegido);
    const colores = r.colores_de ? p.opciones.find((o) => o.etiqueta === r.colores_de) : null;
    const nb = { ...brief, marca: { ...brief.marca, estilo: elegida.estilo, propuestas: { ...p, estado: 'elegida', elegido: r.elegido, colores_de: r.colores_de, comentario: texto } } };
    const conf = `¡Perfecto! Vamos con la opción *${r.elegido}*${colores ? ` con los colores de la *${r.colores_de}*` : ''}. Tomo en cuenta lo que me dijiste para la página completa.`;
    return { responder: { textos: [conf] }, brief: nb, seguirConAri: true };
  }
  return { responder: null, brief, seguirConAri: true };
}

/** Se llama DESPUÉS del turno de Ari cuando el cliente terminó las fotos (sale de B8). */
export async function iniciarPropuestas(e, brief) {
  const mat = await procesarMateriales(e.id, brief);
  if (!mat.material_suficiente) {
    const nb = { ...brief, marca: { ...brief.marca, propuestas: { estado: 'pendiente_material', pedidos: 1, faltan: mat.faltan } } };
    return { responder: { textos: [mensajeFaltan(mat)] }, brief: nb };
  }
  const m = await mostrar(e, brief, mat);
  return { responder: m.salida, brief: { ...brief, marca: { ...brief.marca, propuestas: m.propuestas } } };
}
