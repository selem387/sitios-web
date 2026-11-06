// Paso de propuestas visuales dentro de la entrevista (entre B6 fotos y B7 confianza):
// 1) revisar materiales (logo, fotos, menú); si no alcanzan para una propuesta digna, decirlo y pedir mejores,
//    con la opción "no las tengo" → se trabaja con lo que mandó (nunca se omiten sus imágenes);
// 2) mandar 3 opciones A/B/C con su logo, colores y fotos; 3) registrar la elegida (o mezclas / ninguna).
// Estado en brief.marca.propuestas = {estado, pedidos, opciones[], elegido, colores_de, rechazos[], comentario}.
import { procesarMateriales } from '../generador/materiales.js';
import { interpretarEleccion } from '../generador/opciones.js';
import { crearPropuestasHTML, textosPropuestas } from '../generador/propuestas_html.js';
import { coloresDePalabras } from '../generador/materiales.js';

const NO_TENGO = /no (las |los )?tengo|no tengo (m[aá]s|otras|mejores)|son (todas|las [uú]nicas)|con esas|as[ií] est[aá] bien|usa(lo)? (esas|lo que hay)|no hay (m[aá]s|otras)/i;
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const propuestasPendientes = (brief) => ['pendiente_material', 'mostradas', 'rechazadas'].includes(brief?.marca?.propuestas?.estado);
export const tocaPropuestas = (brief, bloqueAnterior, bloqueNuevo) =>
  !brief?.marca?.propuestas && BLOQUES_ORDEN.indexOf(bloqueAnterior) >= BLOQUES_ORDEN.indexOf('B6') && bloqueNuevo !== 'B6' && bloqueAnterior !== bloqueNuevo;
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
      `${ronda ? 'Aquí van 6 propuestas nuevas, con otros colores, letras y acomodo' : 'Te preparé 6 propuestas de tu página'}, con ${queIncluye(brief, mat)}. Ábrelas en tu celular y recórrelas completas 👇`,
      lista,
      ...(nota ? [nota] : []),
      '¿Cuál te gusta más? Respóndeme con la letra (*A* a *F*). También puedes pedir mezclas, por ejemplo _la B con los colores de la E_. Si ninguna te convence, dime *ninguna* y qué te gustaría distinto.',
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

export async function mostrar(e, brief, mat, { ronda = 0 } = {}) {
  const textos = await textosPropuestas(brief, mat);
  const r = await crearPropuestasHTML(brief, mat, textos, { ronda });
  const prev = brief.marca?.propuestas || {};
  const opciones = r.opciones.map((o) => ({ etiqueta: o.letra, letra: o.letra, layout: o.layout, nombre: o.nombre, url: o.url, estilo: o.fuentes.estilo, tipografia: { titulos: o.fuentes.titulos, cuerpo: o.fuentes.cuerpo }, paleta: o.paleta }));
  return { propuestas: { ...prev, estado: 'mostradas', token: r.token, opciones, textos, ronda, asesor_color: r.asesor?.hallazgos || [], usados: [...(prev.usados || []), r.token] }, salida: mensajeOpciones({ opciones, asesor: r.asesor }, brief, mat, ronda) };
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
    // Si la respuesta no dice qué cambiar, se pregunta una vez más con ejemplos concretos.
    if ((!texto || VAGO.test(texto.trim())) && !huboMedia && !(p.preguntas_estilo >= 1)) {
      return { responder: { textos: ['Para atinarle mejor, cuéntame una o dos cosas: ¿los colores los quieres más claros, más fuertes o de otro tono? ¿Las letras más sencillas o más elegantes? ¿Prefieres que se vean más grandes tus fotos? Si hay alguna página que te guste, mándame la liga y me inspiro en ella.'] },
        brief: { ...brief, marca: { ...brief.marca, propuestas: { ...p, preguntas_estilo: (p.preguntas_estilo || 0) + 1 } } }, seguirConAri: false };
    }
    const comentario = [p.comentario, texto].filter(Boolean).join(' · ');
    const ajustado = ajustesDeComentario(texto || '', brief);
    const b2 = { ...ajustado, marca: { ...ajustado.marca, referencias_que_gusta: [brief.marca?.referencias_que_gusta, comentario].filter(Boolean).join(' · ') } };
    const mat = await procesarMateriales(e.id, b2, { aceptarLoQueHay: true });
    const m = await mostrar(e, b2, mat, { ronda: (p.ronda || 0) + 1 });
    return { responder: m.salida, brief: { ...b2, marca: { ...b2.marca, propuestas: { ...m.propuestas, comentario, preguntas_estilo: 0 } } }, seguirConAri: false };
  }
  if (p.estado === 'mostradas') {
    const r = interpretarEleccion(texto);
    if (!r && /reenv|no (me )?llegaron|ligas|links|enlaces|cu[aá]les|d[oó]nde/i.test(texto)) {
      return { responder: { textos: ['Claro, aquí van otra vez las 6 👇', p.opciones.map((o) => `*${o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n'), '¿Cuál te gusta más? Respóndeme con la letra, de la *A* a la *F*, o dime *ninguna* y qué cambiarías.'] }, brief, seguirConAri: false };
    }
    if (!r) return { responder: { textos: ['¿Cuál de las 6 te gustó más? Respóndeme con la letra, de la *A* a la *F*. Si ninguna te convence, dime *ninguna* y qué te gustaría distinto.'] }, brief, seguirConAri: false };
    if (r.ninguna) {
      // Si ya dijo qué no le gustó en el mismo mensaje, se rehace de una vez.
      const nb = { ...brief, marca: { ...brief.marca, propuestas: { ...p, estado: 'rechazadas', rechazos: [...(p.rechazos || []), texto] } } };
      if (texto.replace(/ninguna|no me gust[oó]|ning[uú]n[ao]?/gi, '').trim().split(/\s+/).length >= 4) return atenderPropuestas(e, nb, { texto, huboMedia });
      return { responder: { textos: ['Va, te hago otras 6 distintas. ¿Qué no te gustó o qué te gustaría ver? Por ejemplo: colores más claros o más fuertes, letras más sencillas o más elegantes, tus fotos más grandes. Si tienes una página de referencia, mándame la liga.'] }, brief: nb, seguirConAri: false };
    }
    const elegida = p.opciones.find((o) => o.etiqueta === r.elegido);
    const colores = r.colores_de ? p.opciones.find((o) => o.etiqueta === r.colores_de) : null;
    const nb = { ...brief, marca: { ...brief.marca, estilo: elegida.estilo, propuestas: { ...p, estado: 'elegida', elegido: r.elegido, colores_de: r.colores_de, comentario: texto } } };
    const conf = `¡Perfecto! Vamos con la opción *${r.elegido}*${colores ? ` con los colores de la *${r.colores_de}*` : ''}. Tomo en cuenta lo que me dijiste para la página completa.`;
    return { responder: { textos: [conf] }, brief: nb, seguirConAri: true };
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
