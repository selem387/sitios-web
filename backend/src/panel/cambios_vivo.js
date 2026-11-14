// Editor de cambios del chatbot para sitios en vivo.
// Cambios que pide el cliente por chat sobre su sitio en vivo (plataforma "app"): se aplican solos sobre el
// contenido estructurado (sitios_vivos.contenido), sin aviso al equipo. Gemelo de entrevista/cambios.js (WordPress).
//   1) Claude recibe el contenido actual por sección + el pedido + la conversación y devuelve secciones completas nuevas.
//   2) Se valida: forma (limpiarSeccion), texto del cliente letra por letra y nada inventado.
//   3) Se respalda lo que se toca, se aplica, se verifica que la página se arme; si falla se restaura.
//   4) Ari avisa con la liga. Si no se puede, se lo dice al cliente y le pide explicarlo de otra forma.
import * as db from '../entrevista/db.js';
import { pedirJSON } from '../entrevista/claude.js';
import { avisar } from '../entrevista/avisos.js';
import { procesarMateriales } from '../generador/materiales.js';
import { config } from '../config.js';
import { SECCIONES, urlBase, limpiarSeccion, contenidoActual, disenoElegido, renderSitio, invalidar, porId } from './sitios.js';
import { textosInventados, separarPrecio, renglonesAjenos } from './reinterpretar.js';
import { validarEstructura, textoDe } from './estructura.js';
import { opcionesNuevasPendientes, adoptarOpcionNueva, restaurarBrief } from './rediseno.js';

const q = db.q;
const NO_PUDE = 'No pude aplicar ese cambio a tu página 😔 ¿Me lo explicas de otra forma? Por ejemplo, dime en qué parte de la página está y cómo quieres que quede.';

export const urlSitio = (sv) => (sv.dominio ? `https://${sv.dominio}/` : `${config.publicUrl}/s/${sv.slug}`);

const COLORES = ['bg', 'fg', 'p', 'primary', 'accent', 'mut', 'card', 'bor', 'soft', 'banda', 'on'];
// Se arma al usarse: sitios.js y este módulo se importan en ciclo (vía agente.js).
const esquema = () => ({
  type: 'object',
  properties: {
    accion: { type: 'string', enum: ['editar', 'preguntar', 'revertir', 'no_se_puede'] },
    pregunta: { type: 'string', description: 'Si accion=preguntar: una sola pregunta clara, sin tecnicismos.' },
    secciones: { type: 'object', description: `Solo las secciones que cambian, cada una COMPLETA como debe quedar. Claves posibles: ${SECCIONES.join(', ')}.` },
    paleta: { type: 'object', description: 'Solo si pide cambiar colores: claves de la paleta actual que cambian, con su hex nuevo.' },
    portada_foto: { type: 'string', description: 'Clave de la foto que debe abrir la página, si lo pide.' },
    fotos_quitar: { type: 'array', items: { type: 'string' }, description: 'Claves de fotos que pide quitar de la página.' },
    fotos_poner: { type: 'array', items: { type: 'string' }, description: 'Claves de fotos (quitadas antes o recién mandadas) que pide poner.' },
    estructura: {
      type: 'object',
      description: 'Estructura COMPLETA propia del sitio como debe quedar (incluye lo vigente de ESTRUCTURA ACTUAL). Omítela si no cambia.',
      properties: {
        ocultas: { type: 'array', items: { type: 'string' }, description: 'ids de secciones que no se muestran' },
        orden: { type: 'array', items: { type: 'string' }, description: 'ids de secciones en el orden deseado después de la portada' },
        extras: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, despues_de: { type: 'string' }, html: { type: 'string' } }, required: ['id', 'html'] }, description: 'Secciones nuevas: HTML interior con las clases del tema (h2, p, .paqs/.paq, .quotes, .galeria, .btn…)' },
        reemplazos: { type: 'object', description: 'HTML nuevo para "portada", "encabezado", "pie" o una sección extra-…' },
        menu: { type: 'array', items: { type: 'object', properties: { texto: { type: 'string' }, href: { type: 'string' } }, required: ['texto', 'href'] }, description: 'Menú completo nuevo, si cambia' },
      },
    },
    propuesta: { type: 'string', description: 'Letra de otra de sus 6 propuestas (PROPUESTAS) si pide cambiar todo el diseño por otra.' },
    fuentes: { type: 'object', properties: { titulos: { type: 'string' }, cuerpo: { type: 'string' } }, description: 'Familias de Google Fonts si pide cambiar la letra.' },
    css: { type: 'string', description: 'Ajustes de diseño: la hoja COMPLETA de reglas CSS propias del sitio como debe quedar (incluye las de CSS PROPIO ACTUAL que sigan vigentes). Vacío si no cambia el diseño.' },
    verificar: { type: 'array', items: { type: 'string' }, description: 'Selectores CSS de las secciones que cambian visualmente (p. ej. "#servicios", "#resenas") para revisarlas con capturas.' },
    no_pude: { type: 'array', items: { type: 'string' }, description: 'Partes del pedido que no se pueden hacer, dichas al cliente en palabras sencillas (sin ids ni términos técnicos), p. ej. "mover las preguntas frecuentes: tu página todavía no tiene esa sección".' },
    aceptado_por_cliente: { type: 'array', items: { type: 'string' }, description: 'Reglas de diseño que el cliente eligió romper después de que le advertiste (p. ej. "letras amarillo claro sobre fondo blanco").' },
    resumen_cliente: { type: 'string', description: 'Qué cambiaste, 1–2 frases simples en primera persona ("Cambié…").' },
  },
  required: ['accion', 'resumen_cliente'],
});

const SISTEMA = `Eres el editor de la página web del cliente de Ari. La página se arma sola a partir de SECCIONES (datos estructurados) con un diseño ya elegido.
Aplicas EXACTAMENTE lo que el cliente pide cambiando esas secciones. Todo lo demás queda idéntico.

REGLA NÚMERO UNO: EL TEXTO DEL CLIENTE NO SE TOCA
- Todo lo que el cliente escribió para su página va EXACTAMENTE como lo escribió, letra por letra: títulos, descripciones, viñetas, precios, emojis, signos, mayúsculas, orden. No corriges, no resumes, no reordenas, no agregas emojis.
- Paquetes/servicios (sección "oferta"): cada elemento {grupo, nombre, descripcion_corta, precio_o_rango, destacado}. Un "## Título" del chat es la categoría (grupo, sin "## "). "*Paquete #1 — $1,200 MXN*" → nombre "Paquete #1", precio "$1,200 MXN". La descripción y sus viñetas van en descripcion_corta, un renglón cada una, conservando el "- " de las viñetas.
- Si manda una lista nueva completa, reemplaza la anterior con TODOS sus elementos en su orden. Si agrega o corrige uno, conserva los demás tal cual.
- Si una frase no viene del cliente, se queda como ya estaba. No redactes textos nuevos ni inventes precios, horarios, teléfonos o cifras.
- Cuando el cliente pide cambiar, quitar o reemplazar palabras de SU texto (p. ej. "donde dice X deja solo Y", "quita Z"), hazlo exactamente: esa es su instrucción y SÍ se puede. Busca el texto en CONTENIDO ACTUAL (títulos de categoría de paquetes = oferta.items[].grupo; nombres = .nombre) y cámbialo en TODOS los elementos donde aparezca, sin tocar nada más.

QUÉ PUEDES HACER
- Cambiar cualquier sección (devuélvela completa con el mismo formato que tiene en CONTENIDO ACTUAL). Las claves de "secciones" NO son los ids de la página: #resenas → testimonios, #servicios → oferta, #sobre → historia, #faq → faq, #contacto → contacto. Usa solo las claves que aparecen en CONTENIDO ACTUAL.
- TÍTULOS DE SECCIÓN (el <h2>: "Reseñas de clientes", "Paquetes", "Sobre mí"…): se cambian SOLO con secciones.titulos = {<id de la sección>: "título nuevo"} (ids válidos: trabajo, servicios, sobre, resenas, faq, contacto, galeria). Devuelve titulos completo (los que ya tiene en CONTENIDO ACTUAL más el nuevo). Nunca toques testimonios/oferta/historia para cambiar un título.
- TEXTO DEBAJO (O AL PIE) DE UNA IMAGEN: secciones.pies = {items:[{imagen:"URL de la imagen tal como está en HTML ACTUAL, sin ?w=", texto:"texto del cliente letra por letra"}]} (completa: los pies que ya hay más el nuevo). Si dice "debajo de la imagen" y en esa sección hay una sola imagen, es esa.
- Colores: "paleta" con las claves de PALETA ACTUAL que cambian (hex). Cuida que el texto se lea (claro sobre oscuro o al revés).
- Fotos: portada_foto, fotos_quitar, fotos_poner, usando SOLO claves de FOTOS. Las fotos que manda el cliente se usan; ninguna se repite ni se deforma (el diseño ya lo cuida).
- Si pide dejarlo como estaba antes del último cambio: accion=revertir.
- Si no se entiende qué o dónde: accion=preguntar con UNA pregunta concreta.
- Cómo está armado el HTML del tema: cada sección es <section class="sec …" id="ID"><div class="wrap">…</div></section>; su título es un <h2> DENTRO de la sección. Selector correcto del título: "#ID h2" (nunca "h2#ID"). Tarjetas: .paq, .prop, blockquote, figure; rejillas: .paqs, .rejilla, .quotes, .galeria. Sube la especificidad con el id de la sección (#ID …) para ganarle a los estilos del tema.
- Acomodo y diseño (poner cosas en una fila, usar todo el ancho, columnas, tamaños, espacios, separadores, alinear, cambiar cómo se ven tarjetas o secciones, letra más grande, etc.): escribe reglas en "css" usando las clases e ids reales de HTML ACTUAL (sección por id: #servicios, #resenas, #sobre, #trabajo, #faq, #contacto…). "css" es la hoja completa propia del sitio: conserva las reglas de CSS PROPIO ACTUAL que sigan vigentes. Usa las variables del tema (var(--p), var(--fg), var(--bor), var(--card), var(--soft)…) para no salirte de la paleta. Piensa en celular primero: lo de pantallas anchas va en @media (min-width:900px). Nunca deformes fotos (si cambias tamaño de imágenes usa object-fit:cover o height:auto) ni ocultes material del cliente que no pidió quitar. Pon en "verificar" los selectores de las secciones que cambias.
- Estructura ("estructura", completa como debe quedar): para QUITAR una sección usa siempre estructura.ocultas (quita también su liga del menú; nunca con CSS). Ocultar secciones, reordenarlas, agregar secciones nuevas (extras, con su HTML interior usando las clases del tema), rehacer la portada, el encabezado o el pie (reemplazos) y cambiar el menú. Las secciones que el dueño edita en su panel (servicios, menu, faq, resenas, sobre, contacto, propiedades, trabajo, promocion) no se reescriben a mano: su contenido se cambia en "secciones" y su aspecto con CSS. En HTML nuevo usa solo imágenes de FOTOS (su URL) o que ya estén en la página, y solo textos que escribió el cliente o que ya están en la página; nada de scripts ni formularios. Para mapas o videos usa <iframe> de Google Maps o YouTube.
- Cambiar todo el diseño por otra de sus propuestas: "propuesta" con la letra. Si elige una opción (por letra, por nombre o mandando un enlace que termina en /A … /F), es esto: pon solo "propuesta" y NO intentes imitarla con CSS ni preguntes; si el enlace es de otra prueba, usa su letra final. Cambiar la letra: "fuentes" con familias de Google Fonts poco comunes y acordes a su estilo (nunca Arial, Roboto, Open Sans, Montserrat, Poppins, Lato ni Inter).
- Elige la herramienta más simple que cumpla exactamente lo pedido: secciones (contenido) → CSS (aspecto) → estructura (agregar, quitar, reordenar, rehacer).
- Si de verdad no hay forma (p. ej. cobrar en línea, una página aparte con su propia dirección, una sección que no existe): esa parte va en no_pude.
- SIEMPRE haz todo lo que sí se pueda del pedido (accion=editar) y deja en no_pude solo lo que no. accion=no_se_puede únicamente si NADA de lo pedido es posible.
- resumen_cliente: simple y cálido, sin tecnicismos.

REGLAS DE DISEÑO DEL SITIO (11-nov-2026)
- Reglas: el texto siempre se lee sobre su fondo (buen contraste), ningún texto queda más chico que el mínimo actual del tema, las fotos nunca se deforman ni se repiten, la letra siempre es una fuente para web, y nada queda encimado o cortado en celular.
- Si lo que pide el cliente rompe alguna de esas reglas (p. ej. letras amarillo claro sobre fondo blanco, texto más chico que el mínimo, estirar una foto): NO lo apliques todavía. accion=preguntar; en "pregunta" explícale en palabras sencillas por qué no se va a ver bien, proponle una alternativa concreta y cercana a lo que pidió (p. ej. "un amarillo más oscuro") y pregúntale si lo quiere como lo pidió o con tu sugerencia.
- Si en la CONVERSACIÓN ya le hiciste esa pregunta y contestó, haz exactamente lo que eligió (aunque rompa la regla, si eligió su versión). En ese caso pon en "aceptado_por_cliente" qué regla aceptó romper.

AJUSTE AUTOMÁTICO DE SECCIONES NUEVAS
- Si el pedido empieza con "(ajuste automático)", no lo pidió el cliente: solo ajusta con CSS el aspecto de las secciones que se indican para que combinen con los cambios visuales que el cliente ya pidió para el resto (CSS PROPIO ACTUAL). No toques contenido, ni otras secciones, ni preguntes: si no hace falta nada, devuelve el mismo CSS.`;

async function guardar(id, cambios) {
  const cols = Object.keys(cambios);
  const vals = cols.map((k) => (cambios[k] !== null && typeof cambios[k] === 'object' ? JSON.stringify(cambios[k]) : cambios[k]));
  await q(`UPDATE cambios_sitio SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(', ')}, actualizado=now() WHERE id=$1`, [id, ...vals]);
}
async function noPude(c, e, resultado, { silencioso = false } = {}) {
  // Si se sabe qué parte no se pudo, se le dice al cliente cuál; si no, el mensaje general. Siempre pide explicarlo de otra forma.
  const partes = (resultado?.no_pude || []).filter(Boolean);
  const texto = partes.length ? `No pude hacer esto en tu página 😔: ${partes.join('; ')}.\n¿Me lo explicas de otra forma o me dices qué prefieres?` : NO_PUDE;
  // Se conserva el plan que se intentó (para revisar después) y se agrega la pregunta.
  if (silencioso) { await q(`UPDATE cambios_sitio SET estado='auto_fallo', resultado=$2, actualizado=now() WHERE id=$1`, [c.id, JSON.stringify(resultado)]); return null; }
  await q(`UPDATE cambios_sitio SET estado='preguntar', plan = COALESCE(plan,'{}'::jsonb) || $2::jsonb, resultado=$3, actualizado=now() WHERE id=$1`, [c.id, JSON.stringify({ pregunta: texto }), JSON.stringify(resultado)]);
  return avisar(e.id, texto, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

async function conversacion(e, sv) {
  const r = await q(`SELECT rol, contenido, transcripcion FROM mensajes WHERE entrevista_id=$1 AND creado > $2 AND rol IN ('cliente','agente') ORDER BY id DESC LIMIT 40`, [e.id, sv.creado]);
  const filas = r.rows.reverse();
  return {
    texto: filas.map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${(m.transcripcion || m.contenido || '').slice(0, 12000)}`).join('\n'),
    cliente: filas.filter((m) => m.rol === 'cliente').map((m) => m.transcripcion || m.contenido || '').join('\n'),
  };
}

/** Lo que hoy tiene el sitio: secciones, paleta y fotos. */
async function estadoActual(e, sv) {
  const mat = await procesarMateriales(e.id, e.brief || {}, { aceptarLoQueHay: true }).catch(() => null);
  const contenido = contenidoActual(e, sv, mat);
  delete contenido.es_menu;
  const paleta = { ...(disenoElegido(e.brief)?.paleta || {}), ...(sv.contenido?.diseno?.paleta || {}) };
  const todos = await db.assetsDe(e.id);
  const fotos = todos.filter((a) => a.url && a.tipo !== 'referencia' && (/^foto_|logo|imagen/.test(a.tipo) || /^image\//.test(a.mime || '')));
  const referencias = todos.filter((a) => a.url && a.tipo === 'referencia');
  let html = '', htmlCompleto = '';
  try { html = await renderSitio(sv, { previa: true }); htmlCompleto = html; } catch { /* sin html */ }
  html = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/<style id="ajustes">[\s\S]*?<\/style>/, '').slice(0, 90000);
  const dz = sv.contenido?.diseno || {};
  // Si le mandamos opciones nuevas y aún no elige, la letra que diga es de esas (y ninguna es "la actual").
  const nuevas = opcionesNuevasPendientes(e.brief);
  const prop = nuevas || e.brief?.marca?.propuestas || {};
  const propuestas = (prop.opciones || []).map((o) => ({ letra: o.letra || o.etiqueta, nombre: o.nombre, tipografia: o.tipografia, url: o.url, nueva: !!nuevas }));
  const propuesta = nuevas ? null : (dz.propuesta || prop.elegido);
  const fuentes = dz.fuentes || propuestas.find((o) => o.letra === propuesta)?.tipografia || (e.brief?.marca?.propuestas?.opciones || []).find((o) => (o.letra || o.etiqueta) === (dz.propuesta || e.brief?.marca?.propuestas?.elegido))?.tipografia || null;
  return { contenido, paleta, fotos, referencias, css: dz.css || '', estructura: dz.estructura || null, propuestas, propuesta, fuentes, html, htmlCompleto: htmlCompleto || html };
}

/** CSS propio: sin importar nada externo ni scripts, tamaño acotado. Devuelve errores. */
export function revisarCss(css) {
  const e = [];
  const t = String(css || '');
  if (t.length > 12000) e.push('El CSS propio pasa de 12,000 caracteres; simplifícalo');
  if (/@import|expression\s*\(|javascript:|behavior\s*:|<\/?style|<script/i.test(t)) e.push('El CSS no puede importar nada ni llevar scripts');
  if (/url\s*\(\s*['"]?(?!data:image\/svg)/i.test(t)) e.push('El CSS no puede cargar archivos externos (url())');
  const abre = (t.match(/{/g) || []).length, cierra = (t.match(/}/g) || []).length;
  if (abre !== cierra) e.push('El CSS tiene llaves sin cerrar');
  if (/(^|[\s,}])(body|html|main|\.wrap|section)\s*{[^}]*display\s*:\s*none/i.test(t)) e.push('No ocultes la página completa ni secciones enteras que el cliente no pidió quitar');
  if (/(^|[\s,}])#[\w-]+\s*{[^}]*display\s*:\s*none/i.test(t)) e.push('Para quitar una sección usa estructura.ocultas (también quita su liga del menú), no CSS');
  return e;
}

async function planear(e, act, pedidos, conv, errores) {
  const partes = [
    `NEGOCIO: ${e.brief?.negocio?.nombre || ''}`,
    `PEDIDO DEL CLIENTE (en orden):\n${pedidos.map((p, i) => `${i + 1}. ${p.texto || '(sin texto)'}${p.media?.length ? ` [mandó foto(s): ${p.media.join(', ')}]` : ''}`).join('\n')}`,
    `CONVERSACIÓN DESDE QUE TIENE SU PÁGINA (aplica también lo que pidió antes y no esté ya en el contenido):\n${conv.texto || '(nada)'}`,
    `CONTENIDO ACTUAL (secciones):\n${JSON.stringify(act.contenido, null, 1)}`,
    `PALETA ACTUAL: ${JSON.stringify(act.paleta)}`,
    `CSS PROPIO ACTUAL (ajustes de diseño ya aplicados a este sitio):\n${act.css || '(ninguno)'}`,
    `SECCIONES EN LA PÁGINA (ids, en orden): portada, ${[...(act.htmlCompleto || '').matchAll(/<section\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]).join(', ')}. Si el cliente menciona una sección que no está, dilo en no_pude (o pregunta).`,
    `ESTRUCTURA ACTUAL: ${JSON.stringify(act.estructura || {})}`,
    `PROPUESTAS (puede cambiar a otra)${act.propuestas[0]?.nueva ? ' — son las 6 NUEVAS que le mandé; si dice una letra es de estas' : ''}: ${act.propuestas.map((o) => `${o.letra}${o.letra === act.propuesta ? ' (la actual)' : ''}: ${o.nombre} · letras ${o.tipografia?.titulos}/${o.tipografia?.cuerpo}${o.url ? ` · ${o.url}` : ''}`).join(' | ') || '(no hay)'}`,
    `LETRA ACTUAL: ${JSON.stringify(act.fuentes || {})}`,
    `HTML ACTUAL DE LA PÁGINA (estructura y estilos del tema; los textos pueden venir recortados):\n${act.html || '(no disponible)'}`,
    `FOTOS (clave · tipo · en la página · descripción):\n${act.fotos.map((a) => `${a.clave} · ${a.tipo} · ${a.usar ? 'sí' : 'no'} · ${(a.descripcion_ia || a.nota || '').slice(0, 120)}`).join('\n') || '(ninguna)'}`,
  ];
  if (errores.length) partes.push(`TU INTENTO ANTERIOR FALLÓ, corrige esto:\n- ${errores.join('\n- ')}`);
  // Imágenes de referencia de este pedido (capturas de su página, diseños, textos): el editor las VE.
  const delPedido = new Set(pedidos.flatMap((p) => p.media || []));
  const refs = (act.referencias || []).filter((a) => delPedido.has(a.clave)).slice(0, 4);
  const contenido = [{ type: 'text', text: partes.join('\n\n') }];
  if (refs.length) {
    contenido.push({ type: 'text', text: `IMÁGENES DE REFERENCIA QUE MANDÓ CON SU PEDIDO (no son fotos para publicar; nunca las pongas en la página):
- "captura_pagina": pantallazo de SU página. Su texto es el texto ACTUAL de la página: úsalo para ubicar qué sección o frase quiere cambiar (lo marcado, encerrado, tachado o con flechas). No lo copies como texto nuevo.
- "referencia_diseno": otra página o diseño que le gusta: imita acomodo, estilo o colores con CSS/estructura, sin copiar sus textos ni fotos.
- "texto_nuevo": un texto que quiere en su página: va letra por letra tal cual se lee.
- "duda": si con el mensaje no queda claro para qué la mandó, usa accion=preguntar.` });
    for (const a of refs) {
      contenido.push({ type: 'text', text: `${a.clave}: ${a.descripcion_ia || ''}` });
      contenido.push({ type: 'image', source: { type: 'url', url: a.url } });
    }
  }
  const r = await pedirJSON({ system: SISTEMA, contenido, schema: esquema(), model: config.anthropicModel, max_tokens: 16000, timeoutMs: 420000 });
  return r.data;
}

/** Valida el plan y devuelve {secciones limpias, paleta, errores}. */
// Ids de la página → clave de contenido (el modelo a veces usa el id del HTML).
const ALIAS = { resenas: 'testimonios', servicios: 'oferta', sobre: 'historia', preguntas: 'faq', titulo: 'titulos', pie: 'pies' };
const quiereQuitar = (fuentes) => /\b(quita|quitar|borra|borrar|elimina|eliminar|saca|sacar)\b/i.test(fuentes);
const elementos = (v) => (Array.isArray(v?.items) ? v.items.length : Array.isArray(v?.secciones) ? v.secciones.length : null);

function validar(plan, act, fuentes, pedidoTexto = '') {
  const errores = [];
  const secciones = {};
  for (let [k0, v] of Object.entries(plan.secciones || {})) {
    const k = SECCIONES.includes(k0) ? k0 : ALIAS[k0];
    if (!k) { errores.push(`Sección desconocida "${k0}". Claves válidas: ${SECCIONES.join(', ')} (un título se cambia en "titulos"; un texto bajo una imagen en "pies")`); continue; }
    if (k !== k0 && secciones[k]) continue;
    if (k === 'oferta' && Array.isArray(v?.items)) v = { ...v, items: v.items.map(separarPrecio) };
    let limpio;
    try { limpio = limpiarSeccion(k, v); } catch (err) { errores.push(`${k}: ${err.message}`); continue; }
    // Nada se pierde en silencio: elementos incompletos que la limpieza descartaría, o una sección que queda vacía sin que lo pidan.
    const crudos = elementos(v), quedan = elementos(limpio), habia = elementos(act.contenido?.[k]);
    if (crudos !== null && quedan !== null && quedan < crudos) errores.push(`${k}: ${crudos - quedan} elemento(s) vienen incompletos (p. ej. pregunta sin respuesta) y se perderían. No dejes campos vacíos ni inventes: si el cliente no dio ese dato, no agregues el elemento (va en no_pude).`);
    if (quedan === 0 && habia > 0 && !quiereQuitar(pedidoTexto)) errores.push(`${k}: quedaría vacía y desaparecería de la página, y el cliente no pidió quitarla`);
    if (k === 'pies') for (const it of limpio.items) if (!(act.htmlCompleto || '').includes(urlBase(it.imagen))) errores.push(`pies: la imagen ${it.imagen} no está en la página`);
    secciones[k] = limpio;
  }
  errores.push(...textosInventados(secciones, fuentes));
  for (const [id, t] of Object.entries(secciones.titulos || {})) if (t !== act.contenido?.titulos?.[id]) for (const l of renglonesAjenos(t, `${fuentes}\n${textoDe(act.htmlCompleto || '')}`)) errores.push(`titulos.${id}: "${l.slice(0, 80)}" no lo escribió el cliente`);
  for (const [i, it] of (secciones.pies?.items || []).entries()) for (const l of renglonesAjenos(it.texto, fuentes)) errores.push(`pies[${i}]: "${l.slice(0, 80)}" no lo escribió el cliente`);
  const paleta = {};
  for (const [k, v] of Object.entries(plan.paleta || {})) {
    if (!(k in act.paleta) && !COLORES.includes(k)) errores.push(`Color "${k}" no existe en la paleta`);
    else if (!/^#[0-9a-f]{6}$/i.test(String(v))) errores.push(`Color "${k}" debe ser hex #RRGGBB`);
    else paleta[k] = v.toUpperCase();
  }
  if (typeof plan.css === 'string' && plan.css.trim() && plan.css.trim() !== (act.css || '').trim()) errores.push(...revisarCss(plan.css));
  let estructura = null;
  if (plan.estructura && typeof plan.estructura === 'object') {
    const r = validarEstructura(plan.estructura, { html: act.htmlCompleto, imagenes: act.fotos.map((a) => a.url) });
    errores.push(...r.errores);
    // Texto nuevo solo del cliente o de lo que ya está en la página.
    const base = `${fuentes}\n${textoDe(act.htmlCompleto)}`;
    for (const h of [...r.estructura.extras.map((x) => x.html), ...Object.values(r.estructura.reemplazos)]) for (const l of renglonesAjenos(textoDe(h), base)) errores.push(`Texto que no escribió el cliente ni está en la página: "${l.slice(0, 80)}"`);
    estructura = r.estructura;
  }
  if (plan.propuesta && !act.propuestas.some((o) => o.letra === plan.propuesta)) errores.push(`La propuesta "${plan.propuesta}" no existe`);
  const comunes = /^(arial|helvetica|roboto|open sans|montserrat|poppins|lato|inter|times new roman)$/i;
  if (plan.fuentes && (!plan.fuentes.titulos || !plan.fuentes.cuerpo)) errores.push('Para cambiar la letra indica titulos y cuerpo');
  if (plan.fuentes && [plan.fuentes.titulos, plan.fuentes.cuerpo].some((f) => comunes.test(String(f || '').trim()))) errores.push('Usa tipografías poco comunes, no Arial, Roboto, Open Sans, Montserrat, Poppins, Lato ni Inter');
  const claves = new Set(act.fotos.map((a) => a.clave));
  for (const k of [plan.portada_foto, ...(plan.fotos_quitar || []), ...(plan.fotos_poner || [])].filter(Boolean)) if (!claves.has(k)) errores.push(`La foto "${k}" no existe`);
  return { secciones, paleta, estructura, errores };
}

/** Escribe el contenido y las fotos; devuelve el sitio actualizado. */
async function escribir(sv, e, { secciones = {}, quitar = [], diseno, fotos, usar = {} }) {
  const k = { ...(sv.contenido || {}) };
  for (const [s, v] of Object.entries(secciones)) { if (v === null) delete k[s]; else k[s] = v; }
  if (diseno !== undefined) { if (diseno === null) delete k.diseno; else k.diseno = diseno; }
  if (fotos !== undefined) { if (fotos === null) delete k.fotos; else k.fotos = fotos; }
  for (const s of quitar) delete k[s];
  for (const [clave, u] of Object.entries(usar)) await db.actualizarAssets(e.id, [{ clave, usar: u }]);
  const r = await q(`UPDATE sitios_vivos SET contenido=$2::jsonb, version=version+1, actualizado=now() WHERE id=$1 RETURNING *`, [sv.id, JSON.stringify(k)]);
  invalidar(sv.id);
  return r.rows[0];
}

async function revertir(c, e, sv) {
  const ult = (await q(`SELECT * FROM cambios_sitio WHERE entrevista_id=$1 AND estado='aplicado' AND respaldo ? 'vivo' AND id<>$2 AND NOT (pedidos @> '[{"auto": true}]'::jsonb) ORDER BY id DESC LIMIT 1`, [e.id, c.id])).rows[0];
  if (!ult) {
    await guardar(c.id, { estado: 'aplicado', resultado: { revertir: 'sin cambios previos' } });
    return avisar(e.id, 'Todavía no he hecho cambios a tu página, así que sigue como la viste la primera vez. ¿Qué te gustaría ajustar?', { evento: 'cambios_sitio' });
  }
  const rs = ult.respaldo.vivo;
  await escribir(sv, e, { secciones: rs.secciones, diseno: rs.diseno, fotos: rs.fotos, usar: rs.usar });
  await guardar(ult.id, { estado: 'revertido' });
  await guardar(c.id, { estado: 'aplicado', resultado: { revertido: ult.id } });
  return avisar(e.id, `Listo, dejé tu página como estaba antes del último cambio ✅: ${urlSitio(sv)}\nSi no lo ves, recarga la página. ¿Quieres ajustar algo más?`, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

/* ---------------- Verificación visual de ajustes de diseño ---------------- */

async function captura(url, selector, ancho) {
  if (!config.renderUrl) return null;
  const r = await fetch(`${config.renderUrl}/v1/captura`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey },
    body: JSON.stringify({ url, selector, ancho }), signal: AbortSignal.timeout(90000),
  }).catch(() => null);
  return r?.ok ? (await r.json()).url : null;
}

async function capturas(sv, selectores) {
  const url = `${config.publicUrl}/s/${sv.slug}?v=${Date.now()}`;
  const out = [];
  for (const sel of selectores.slice(0, 3)) {
    for (const ancho of [1366, 390]) { const u = await captura(url, sel, ancho); out.push({ sel, ancho, url: u }); }
  }
  return out;
}

const ESQUEMA_VISTA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', description: 'true solo si el DESPUÉS cumple lo que pidió el cliente y se ve bien en computadora y en celular.' },
    problemas: { type: 'array', items: { type: 'string' }, description: 'Qué falta o qué se ve mal, concreto (p. ej. "en computadora siguen en dos filas", "el texto se encima con la foto en celular").' },
  },
  required: ['ok'],
};

/** Compara capturas antes/después contra el pedido. Devuelve {ok, problemas}. Sin servicio de capturas, no bloquea. */
async function revisarVista(pedidos, antes, despues, noPudo = [], aceptado = []) {
  if (!despues.some((d) => d.url)) return { ok: true, problemas: [], sin_capturas: true };
  const contenido = [{ type: 'text', text: `PEDIDO DEL CLIENTE:\n${pedidos.map((p) => `- ${p.texto}`).join('\n')}\n\nCompara ANTES y DESPUÉS de cada sección (computadora 1366 px y celular 390 px). "No existe" significa que esa sección no está en la página (correcto si el cliente pidió quitarla).` }];
  for (const d of despues) {
    const a = antes.find((x) => x.sel === d.sel && x.ancho === d.ancho);
    contenido.push({ type: 'text', text: `ANTES · ${d.sel} · ${d.ancho}px${a?.url ? '' : ': no existe'}` });
    if (a?.url) contenido.push({ type: 'image', source: { type: 'url', url: a.url } });
    contenido.push({ type: 'text', text: `DESPUÉS · ${d.sel} · ${d.ancho}px${d.url ? '' : ': no existe'}` });
    if (d.url) contenido.push({ type: 'image', source: { type: 'url', url: d.url } });
  }
  if (aceptado.length) contenido.push({ type: 'text', text: `EL CLIENTE ELIGIÓ ESTO A PESAR DE LA ADVERTENCIA (no lo cuentes como falla): ${aceptado.join('; ')}` });
  if (noPudo.length) contenido.push({ type: 'text', text: `PARTES QUE NO SE PUEDEN HACER (se le avisará al cliente; no las cuentes como falla): ${noPudo.join('; ')}` });
  // El menú se revisa siempre (secciones quitadas, agregadas o reordenadas).
  const nav = (despues[0]?.menu || '').trim();
  if (nav) contenido.push({ type: 'text', text: `MENÚ DESPUÉS: ${nav}` });
  try {
    const r = await pedirJSON({
      system: 'Revisas cambios de diseño en la página web de un cliente. Dices si el DESPUÉS cumple exactamente lo que pidió y si se ve profesional: sin texto encimado ni cortado, sin desbordes horizontales, sin fotos deformadas, sin huecos raros, legible en celular. Sé estricto con lo pedido. Solo cuentan como falla los problemas NUEVOS: si un problema ya se veía igual en el ANTES, no lo pongas (no lo causó este cambio).',
      contenido, schema: ESQUEMA_VISTA, model: config.anthropicModel, max_tokens: 800, timeoutMs: 180000,
    });
    return { ok: !!r.data.ok, problemas: r.data.problemas || [] };
  } catch (err) { return { ok: true, problemas: [], error: err.message }; }
}

export async function aplicarCambioVivo(c, e, sv) {
  // Ajuste automático de secciones nuevas (11-nov-2026): no lo pidió el cliente, así que no se le escribe nada.
  const auto = (c.pedidos || []).length > 0 && c.pedidos.every((p) => p.auto);
  const decir = auto ? async () => null : avisar;
  const fallo = (cc, ee, res) => noPude(cc, ee, res, { silencioso: auto });
  await guardar(c.id, { sitio_id: sv.id });
  const act = await estadoActual(e, sv);
  const conv = await conversacion(e, sv);
  const fuentes = `${c.pedidos.map((p) => p.texto).join('\n')}\n${conv.cliente}\n${JSON.stringify(act.contenido)}`.replace(/\\n/g, '\n');
  const k = sv.contenido || {};
  let errores = [], plan, v, nuevo = null, respaldo = null, vista = null, antes = null, briefAntes = null;

  // Elegir una de sus opciones ("D", "la D", "opción D", o la liga …/p/<token>/D): no pasa por el planeador.
  const letraElegida = (() => {
    // Solo lo que escribió el cliente: se ignora el "(Ari preguntó: …)" que se agrega cuando contesta una pregunta.
    const t = c.pedidos.filter((p) => !/^\(Ari pregunt[oó]:/.test(p.texto || '')).map((p) => p.texto || '').join(' ').trim();
    if (c.pedidos.some((p) => p.media?.length) || t.length > 80) return null;
    const m = t.match(/^(?:quiero\s+|me\s+gusta\s+|elijo\s+|prefiero\s+)?(?:la\s+)?(?:opci[oó]n\s+)?([a-m])\s*[.!]*$/i) || t.match(/\/p\/[A-Za-z0-9]+\/([A-M])\b/);
    const L = m && m[1].toUpperCase();
    return L && act.propuestas.some((o) => o.letra === L) && L !== act.propuesta ? L : null;
  })();
  const soloPropuesta = (p) => p?.accion === 'editar' && p.propuesta && !p.css && !p.estructura && !Object.keys(p.paleta || {}).length && !p.fuentes && !Object.keys(p.secciones || {}).length;

  for (let ronda = 0; ronda < 3; ronda++) {
    // 1) Plan válido (hasta 3 intentos por ronda).
    if (letraElegida) { plan = { accion: 'editar', propuesta: letraElegida, resumen_cliente: `Cambié tu página al diseño ${letraElegida}.` }; v = validar(plan, act, fuentes, ''); errores = v.errores; }
    for (let i = 0; i < 3 && !letraElegida; i++) {
      plan = await planear(e, act, c.pedidos, conv, errores);
      if (plan.accion === 'no_se_puede' && i < 2) { errores = ['Dijiste no_se_puede, pero cambiar, quitar o agregar textos, datos, colores, fotos, acomodo o secciones SÍ se puede: busca dónde está ese texto en CONTENIDO ACTUAL (p. ej. oferta.items[].grupo o .nombre) y edítalo con accion=editar. Solo usa no_se_puede si de verdad nada de lo pedido es posible.']; v = undefined; continue; }
      if (plan.accion !== 'editar') break;
      v = validar(plan, act, fuentes, c.pedidos.map((p) => p.texto).join('\n'));
      errores = v.errores;
      if (!errores.length) break;
    }
    await guardar(c.id, { plan });
    if (plan.accion === 'preguntar') {
      await guardar(c.id, { estado: 'preguntar' });
      if (auto) return fallo(c, e, { pregunta: plan.pregunta });
      return decir(e.id, plan.pregunta || '¿Me dices un poco más de lo que quieres cambiar?', { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
    }
    if (plan.accion === 'revertir') return auto ? fallo(c, e, { revertir: true }) : revertir(c, e, sv);
    if (plan.accion !== 'editar' || !v) return fallo(c, e, { errores, no_pude: plan.no_pude || [] });
    const cssNuevo = typeof plan.css === 'string' && plan.css.trim() !== (act.css || '').trim() ? plan.css.trim() : null;
    const estNueva = v.estructura && JSON.stringify(v.estructura) !== JSON.stringify(act.estructura || null) ? v.estructura : null;
    const propNueva = plan.propuesta && plan.propuesta !== act.propuesta ? plan.propuesta : null;
    const fuentesNuevas = plan.fuentes?.titulos && plan.fuentes?.cuerpo && JSON.stringify(plan.fuentes) !== JSON.stringify(act.fuentes || null) ? { titulos: plan.fuentes.titulos, cuerpo: plan.fuentes.cuerpo } : null;
    const hay = plan.accion === 'editar' && (Object.keys(v.secciones).length || Object.keys(v.paleta).length || cssNuevo !== null || estNueva || propNueva || fuentesNuevas || plan.portada_foto || plan.fotos_quitar?.length || plan.fotos_poner?.length);
    if (!hay || errores.length) return fallo(c, e, { errores, no_pude: plan.no_pude || [] });

    // 2) Capturas de ANTES de las secciones que cambian de diseño (una sola vez).
    const cambiaVista = cssNuevo !== null || estNueva || propNueva || fuentesNuevas || Object.keys(v.paleta).length;
    let selectores = (plan.verificar || []).filter((x) => /^[#.a-z][\w\s#.>:()-]{0,80}$/i.test(x));
    if (cambiaVista && !selectores.length) selectores = ['main'];
    // Un cambio a otra de sus opciones ya pasó su revisión visual al generarse: aquí solo se comprueba que la página se arme.
    const revisar = !!cambiaVista && !soloPropuesta(plan);
    if (revisar && !antes) antes = await capturas(sv, selectores);

    // 3) Respaldo exacto y escritura.
    const usar = {};
    for (const cl of plan.fotos_quitar || []) usar[cl] = false;
    for (const cl of plan.fotos_poner || []) usar[cl] = true;
    const tocaDiseno = !!cambiaVista;
    respaldo = {
      secciones: Object.fromEntries(Object.keys(v.secciones).map((s) => [s, k[s] ?? null])),
      diseno: tocaDiseno ? (k.diseno ?? null) : undefined,
      fotos: plan.portada_foto ? (k.fotos ?? null) : undefined,
      usar: Object.fromEntries(Object.keys(usar).map((cl) => [cl, act.fotos.find((a) => a.clave === cl)?.usar !== false])),
    };
    await guardar(c.id, { respaldo: { vivo: respaldo } });
    let diseno = tocaDiseno ? { ...(propNueva ? {} : (k.diseno || {})), ...(Object.keys(v.paleta).length ? { paleta: { ...(k.diseno?.paleta || {}), ...v.paleta } } : {}), ...(cssNuevo !== null ? { css: cssNuevo } : {}), ...(estNueva ? { estructura: estNueva } : {}), ...(propNueva ? { propuesta: propNueva } : {}), ...(fuentesNuevas ? { fuentes: fuentesNuevas } : {}) } : undefined;
    // Opción de la ronda nueva: pasa a ser su propuesta (se deshace si la página no queda bien).
    if (propNueva && act.propuestas[0]?.nueva && !briefAntes) {
      briefAntes = await adoptarOpcionNueva(e, propNueva);
      if (briefAntes) diseno = {};
    }
    nuevo = await escribir(sv, e, { secciones: v.secciones, diseno, fotos: plan.portada_foto ? { ...(k.fotos || {}), portada_asset_id: plan.portada_foto } : undefined, usar });

    // 4) La página se arma con lo nuevo.
    try {
      const html = await renderSitio(await porId(nuevo.id), { previa: true });
      if (!html || html.length < 500) throw new Error('página vacía');
    } catch (err) {
      await escribir(nuevo, e, respaldo);
      await restaurarBrief(e, briefAntes); briefAntes = null;
      console.error('[cambios vivo] restaurado', c.id, err);
      return fallo(c, e, { error: String(err.message || err).slice(0, 500) });
    }

    // 5) Ajustes de diseño: revisión visual contra lo pedido; si no cumple, se deshace y se vuelve a intentar.
    if (!revisar) { vista = null; break; }
    const despues = await capturas(nuevo, selectores);
    try { const h = await renderSitio(await porId(nuevo.id), { previa: true }); const nav = (h.match(/<nav>([\s\S]*?)<\/nav>/) || [])[1] || ''; if (despues[0]) despues[0].menu = nav.replace(/<[^>]+>/g, ' · ').replace(/(\s·\s)+/g, ' · '); } catch { /* sin menú */ }
    vista = await revisarVista(c.pedidos, antes || [], despues, (plan.no_pude || []).filter(Boolean), (plan.aceptado_por_cliente || []).filter(Boolean));
    if (vista.ok) break;
    await escribir(nuevo, e, respaldo);
    await restaurarBrief(e, briefAntes); briefAntes = null;
    errores = [`La revisión visual con capturas encontró: ${vista.problemas.join('; ') || 'no cumple lo pedido'}. Corrige el plan (CSS, estructura o secciones). Lo que de verdad no se puede va en no_pude.`];
    nuevo = null;
  }
  if (!nuevo) return fallo(c, e, { errores, vista });

  const pendientes = (plan.no_pude || []).filter(Boolean);
  await guardar(c.id, { estado: 'aplicado', resultado: { secciones: Object.keys(v.secciones), paleta: v.paleta, css: !!plan.css, vista, pendientes } });
  const extra = pendientes.length ? `\n\nLo que no pude hacer: ${pendientes.join('; ')}. ¿Me lo explicas de otra forma o me dices qué prefieres?` : '';
  await registrarSeccionesVistas(nuevo).catch(() => {});
  return decir(e.id, `${plan.resumen_cliente}\nYa quedó ✅ Recarga tu página para verlo:\n${urlSitio(nuevo)}${extra}\n¿Hay algo más que quieras ajustar?`, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

/* ---------------- Secciones nuevas: la IA las ajusta para que combinen (11-nov-2026) ---------------- */
const idsSecciones = (html) => [...String(html || '').matchAll(/<section\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
const personalizado = (sv) => { const dz = sv?.contenido?.diseno || {}; return !!(String(dz.css || '').trim() || dz.estructura); };

/** Guarda qué secciones tenía la página cuando se hizo el último ajuste de diseño. */
const revisando = new Set();
export async function registrarSeccionesVistas(sv) {
  revisando.add(sv.id);
  try {
    const html = await renderSitio(await porId(sv.id), { previa: true });
    await q(`UPDATE sitios_vivos SET contenido = jsonb_set(contenido, '{_secciones_vistas}', $2::jsonb) WHERE id=$1`, [sv.id, JSON.stringify(idsSecciones(html))]);
  } finally { revisando.delete(sv.id); }
}

/**
 * Lo llama renderSitio. Si el diseño tiene ajustes del cliente y aparece una sección que no existía cuando se hicieron
 * (contenido nuevo desde el panel, la entrevista o el chat), se encola un ajuste automático y silencioso para esa sección.
 */
export async function revisarSeccionesNuevas(sv, html) {
  if (!sv?.id || revisando.has(sv.id) || !personalizado(sv)) return;
  revisando.add(sv.id);
  try {
    const ids = idsSecciones(html);
    const vistas = (await q(`SELECT contenido->'_secciones_vistas' AS v FROM sitios_vivos WHERE id=$1`, [sv.id])).rows[0]?.v;
    // Sitios con ajustes de antes de esta regla: se toma la foto actual como punto de partida.
    if (!Array.isArray(vistas)) { await q(`UPDATE sitios_vivos SET contenido = jsonb_set(contenido, '{_secciones_vistas}', $2::jsonb) WHERE id=$1`, [sv.id, JSON.stringify(ids)]); return; }
    const nuevas = ids.filter((x) => !vistas.includes(x));
    if (!nuevas.length) return;
    const ocupado = (await q(`SELECT 1 FROM cambios_sitio WHERE entrevista_id=$1 AND estado IN ('pendiente','aplicando') LIMIT 1`, [sv.entrevista_id])).rowCount;
    if (ocupado) return; // se revisa en el siguiente armado de la página
    await q(`UPDATE sitios_vivos SET contenido = jsonb_set(contenido, '{_secciones_vistas}', $2::jsonb) WHERE id=$1`, [sv.id, JSON.stringify([...new Set([...vistas, ...nuevas])])]);
    const texto = `(ajuste automático) Aparecieron secciones nuevas en la página: ${nuevas.map((x) => `#${x}`).join(', ')}. Ajusta solo su aspecto con CSS para que combinen con los cambios visuales que el cliente ya pidió en el resto del sitio.`;
    await q(`INSERT INTO cambios_sitio (entrevista_id, sitio_id, pedidos, aplicar_en) VALUES ($1, $2, $3::jsonb, now() + interval '5 seconds')`, [sv.entrevista_id, sv.id, JSON.stringify([{ texto, media: [], auto: true, t: new Date().toISOString() }])]);
    await db.evento(sv.entrevista_id, 'ajuste_automatico_encolado', { secciones: nuevas }).catch(() => {});
    const { cronCambios } = await import('../entrevista/cambios.js');
    setTimeout(() => cronCambios().catch((err) => console.error('ajuste automático', err)), 8000).unref?.();
  } catch (err) { console.error('[secciones nuevas]', sv.id, err.message); }
  finally { revisando.delete(sv.id); }
}
