// Cambios que pide el cliente después de ver su página: se juntan unos segundos (suele mandar varios mensajes
// seguidos) y se aplican solos sobre el sitio WordPress publicado, editando lo que ya existe (no se regenera nada).
//
//   1) registrarPedido(): cada mensaje con un cambio se suma a la fila "pendiente" de cambios_sitio.
//   2) cronCambios(): a los ESPERA_S segundos sin mensajes nuevos, lee el contenido publicado (GET /contenido),
//      Claude devuelve ediciones buscar/reemplazar sobre el marcado actual, se validan, se respalda lo que se toca,
//      se aplica (POST /aplicar) y se verifica la página. Si algo sale mal se restaura el respaldo.
//   3) Ari avisa al cliente con la liga (chat web o WhatsApp vía avisar()).
// Si el pedido es ambiguo, Ari pregunta y la respuesta del cliente se junta con el pedido anterior.
// "Déjalo como estaba" restaura el respaldo del último cambio aplicado.
import * as db from './db.js';
import * as wp from '../generador/wp.js';
import { pedirJSON, MODELO_MEMORIA } from './claude.js';
import { avisar, avisarEquipo } from './avisos.js';
import { config } from '../config.js';

const q = db.q;
export const ESPERA_S = 75;
// Si un cambio no se puede aplicar, Ari se lo dice al cliente y le pide explicarlo de otra forma (no hay equipo que lo retome).
const NO_PUDE = 'No pude aplicar ese cambio a tu página 😔 ¿Me lo explicas de otra forma? Por ejemplo, dime en qué parte de la página está y cómo quieres que quede.';


export const SCHEMA_CAMBIOS = `
CREATE TABLE IF NOT EXISTS cambios_sitio (
  id             serial PRIMARY KEY,
  entrevista_id  uuid NOT NULL REFERENCES entrevistas(id) ON DELETE CASCADE,
  sitio_id       int,
  estado         text NOT NULL DEFAULT 'pendiente',   -- pendiente | aplicando | aplicado | preguntar | contestada | equipo | fallo | revertido
  pedidos        jsonb NOT NULL DEFAULT '[]',         -- [{texto, media:[clave], t}]
  aplicar_en     timestamptz NOT NULL DEFAULT now(),
  plan           jsonb,
  resultado      jsonb,
  respaldo       jsonb,
  creado         timestamptz NOT NULL DEFAULT now(),
  actualizado    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cambios_sitio_pend_idx ON cambios_sitio (aplicar_en) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS cambios_sitio_ent_idx ON cambios_sitio (entrevista_id, id);
ALTER TABLE cambios_sitio ADD COLUMN IF NOT EXISTS intentos int NOT NULL DEFAULT 0;
-- Los que fallaron por tiempo de espera (antes de existir los reintentos) vuelven a la cola una vez.
UPDATE cambios_sitio SET estado='pendiente', aplicar_en=now(), intentos=1
  WHERE estado='fallo' AND intentos=0 AND resultado->>'error' ILIKE '%timeout%' AND creado > now() - interval '1 day';
-- Un reinicio corta los que estaban en curso: vuelven a la cola en un minuto.
UPDATE cambios_sitio SET estado='pendiente', aplicar_en=now() + interval '60 seconds' WHERE estado='aplicando';
-- Los que no se pudieron editar (fragmentos que no coincidían) se reintentan una vez con la edición por bloques.
UPDATE cambios_sitio SET estado='pendiente', aplicar_en=now(), intentos=2
  WHERE estado='equipo' AND intentos<2 AND jsonb_array_length(COALESCE(resultado->'errores','[]'::jsonb)) > 0 AND creado > now() - interval '1 day';
`;
let migrado = false;
async function migrar() { if (!migrado) { await q(SCHEMA_CAMBIOS); migrado = true; } }

/** Sitio WordPress publicado que se puede editar (el más reciente en estado listo). */
export async function sitioEditable(entrevistaId) {
  const r = await q(`SELECT id, blog_id_wp, url_publica, publicado FROM sitios WHERE entrevista_id=$1 AND estado='listo' AND blog_id_wp IS NOT NULL ORDER BY id DESC LIMIT 1`, [entrevistaId]);
  return r.rows[0] || null;
}

/** Estado de los cambios de una entrevista: ¿hay uno juntándose, aplicándose o una pregunta abierta? */
export async function estadoCambios(entrevistaId) {
  await migrar();
  const r = await q(`SELECT estado, actualizado FROM cambios_sitio WHERE entrevista_id=$1 ORDER BY id DESC LIMIT 1`, [entrevistaId]);
  const u = r.rows[0];
  if (!u) return { ultimo: null };
  const reciente = Date.now() - new Date(u.actualizado).getTime() < 2 * 864e5;
  return { ultimo: u.estado, abierto: ['pendiente', 'aplicando'].includes(u.estado) || (u.estado === 'preguntar' && reciente) };
}

/** Suma un pedido del cliente. Devuelve {nuevo, enCurso} para que Ari conteste acorde. */
export async function registrarPedido(entrevistaId, { texto = '', media = [] }) {
  await migrar();
  const pedido = [{ texto: String(texto || '').slice(0, 2000), media, t: new Date().toISOString() }];
  const enCurso = (await q(`SELECT 1 FROM cambios_sitio WHERE entrevista_id=$1 AND estado='aplicando' LIMIT 1`, [entrevistaId])).rowCount > 0;
  const upd = await q(`UPDATE cambios_sitio SET pedidos = pedidos || $2::jsonb, aplicar_en = now() + make_interval(secs => $3), actualizado = now()
                       WHERE id = (SELECT id FROM cambios_sitio WHERE entrevista_id=$1 AND estado='pendiente' ORDER BY id DESC LIMIT 1) RETURNING id`,
  [entrevistaId, JSON.stringify(pedido), ESPERA_S]);
  if (upd.rowCount) return { nuevo: false, enCurso, id: upd.rows[0].id };
  // Respuesta a una pregunta de Ari: se arrastra el pedido anterior para que el cambio se entienda completo.
  const preg = (await q(`UPDATE cambios_sitio SET estado='contestada', actualizado=now()
                         WHERE id = (SELECT id FROM cambios_sitio WHERE entrevista_id=$1 AND estado='preguntar' AND actualizado > now() - interval '2 days' ORDER BY id DESC LIMIT 1)
                         RETURNING pedidos, plan`, [entrevistaId])).rows[0];
  const previos = preg ? [...preg.pedidos, { texto: `(Ari preguntó: ${preg.plan?.pregunta || ''})`, media: [], t: null }] : [];
  const ins = await q(`INSERT INTO cambios_sitio (entrevista_id, pedidos, aplicar_en) VALUES ($1, $2::jsonb, now() + make_interval(secs => $3)) RETURNING id`,
    [entrevistaId, JSON.stringify([...previos, ...pedido]), ESPERA_S]);
  const t = setTimeout(() => cronCambios().catch((err) => console.error('cambios', err)), (ESPERA_S + 3) * 1000);
  t.unref?.();
  return { nuevo: true, enCurso, id: ins.rows[0].id };
}

/* ------------------------------------------------------------------ */
/* Clasificar el mensaje del cliente (después de ver su página)        */
/* ------------------------------------------------------------------ */

const ESQUEMA_CLASE = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: ['cambio', 'sin_detalle', 'otro'] },
    respuesta: { type: 'string', description: 'Solo si tipo=otro: respuesta breve y cálida de Ari (1–2 frases).' },
  },
  required: ['tipo'],
};
const SISTEMA_CLASE = `Eres Ari. El cliente ya tiene su página web lista y te escribe. Clasifica su ÚLTIMO mensaje:
- "cambio": pide o describe algo concreto que quiere cambiar, quitar, agregar o corregir en su página (textos, fotos, colores, datos, secciones, letra, botones…), contesta una pregunta tuya sobre un cambio, o pide dejar algo como estaba.
- "sin_detalle": dice que quiere hacer cambios/correcciones pero todavía no dice cuáles.
- "otro": cualquier otra cosa (gracias, le gustó, saludos, dudas generales). En "respuesta" contesta breve y cálido; si viene al caso, recuérdale que puede pedirte cambios. Nunca ofrezcas empezar otra página ni menciones palabras clave.
Si hay un cambio en curso o una pregunta tuya abierta, un mensaje corto como "la de arriba", "sí, esa", "en azul" es "cambio".
Si pregunta por la página con sus correcciones o cuándo quedan los cambios que ya mandó antes, es "cambio" (se aplican los que mandó).`;

export async function clasificarMensaje(entrevistaId, texto, { abierto = false } = {}) {
  const previos = await db.ultimosMensajes(entrevistaId, 6).catch(() => []);
  const historial = previos.map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${(m.transcripcion || m.contenido || '').slice(0, 400)}`).join('\n');
  try {
    const r = await pedirJSON({
      model: MODELO_MEMORIA, max_tokens: 300, system: SISTEMA_CLASE, schema: ESQUEMA_CLASE,
      contenido: `Cambio en curso o pregunta abierta: ${abierto ? 'sí' : 'no'}\nÚLTIMOS MENSAJES:\n${historial || '(ninguno)'}\n\nÚLTIMO MENSAJE DEL CLIENTE: ${texto}`,
    });
    return r.data;
  } catch (err) {
    console.error('clasificar cambio', err.message);
    return null; // el llamador usa la heurística
  }
}

/* ------------------------------------------------------------------ */
/* Planear: Claude devuelve ediciones sobre el marcado publicado        */
/* ------------------------------------------------------------------ */

const ESQUEMA_PLAN = {
  type: 'object',
  properties: {
    accion: { type: 'string', enum: ['editar', 'preguntar', 'revertir', 'equipo'], description: 'editar (lo normal), preguntar (si no se entiende qué o dónde), revertir (pide dejarlo como estaba antes del último cambio), equipo (nada se puede hacer editando)' },
    pregunta: { type: 'string', description: 'Si accion=preguntar: una sola pregunta clara y breve, sin tecnicismos.' },
    ediciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          destino: { type: 'string', description: '"pagina:<slug>", "header", "footer" o "estilos"' },
          bloque: { type: 'string', description: 'Para reescribir una sección o bloque completo: su marca (p. ej. "B7"). Entonces "reemplazar" es el marcado completo nuevo de ese bloque y "buscar" va vacío.' },
          buscar: { type: 'string', description: 'Para cambios pequeños: fragmento EXACTO copiado del contenido actual (sin las marcas ⟦B…⟧); debe aparecer una sola vez.' },
          reemplazar: { type: 'string' },
          todas: { type: 'boolean', description: 'true solo si a propósito se reemplazan todas las apariciones (p. ej. un color hex en estilos).' },
        },
        required: ['destino', 'reemplazar'],
      },
    },
    menu: { type: 'array', items: { type: 'object', properties: { texto: { type: 'string' }, url: { type: 'string' } }, required: ['texto', 'url'] }, description: 'Solo si cambia el menú: la lista completa nueva.' },
    opciones: {
      type: 'object',
      properties: {
        descripcion: { type: 'string' }, whatsapp: { type: 'string', description: 'Solo dígitos con lada, p. ej. 529991234567' },
        whatsapp_mensaje: { type: 'string' }, fuentes_url: { type: 'string', description: 'URL completa de Google Fonts si cambia la letra' },
        logo: { type: 'string', description: 'Clave de la foto que pasa a ser el logo' },
      },
    },
    contacto: {
      type: 'object', description: 'Datos de contacto que el cliente corrigió (para mantener su ficha al día).',
      properties: { telefono: { type: 'string' }, whatsapp: { type: 'string' }, email: { type: 'string' }, horario: { type: 'string' } },
    },
    textos_quitados: { type: 'array', items: { type: 'string' }, description: 'Títulos de secciones, paquetes o tarjetas que se quitan a propósito (el cliente lo pidió o lo sustituyó por otro).' },
    fotos_quitadas: { type: 'integer', description: 'Cuántas fotos se quitan de la página a propósito (0 si ninguna).' },
    pendientes_equipo: { type: 'array', items: { type: 'string' }, description: 'Cosas pedidas que NO se pueden hacer editando (explicadas en lenguaje del cliente).' },
    resumen_cliente: { type: 'string', description: 'Qué se cambió, en 1–2 frases sencillas para el cliente, en primera persona ("Cambié…, puse…").' },
  },
  required: ['accion', 'resumen_cliente'],
};

const SISTEMA_EDITOR = `Eres el editor web del equipo de Ari. El cliente ya tiene su página WordPress publicada y pide cambios.
Aplicas EXACTAMENTE lo que pide, editando el marcado publicado. Todo lo demás queda idéntico.

REGLA NÚMERO UNO: EL TEXTO DEL CLIENTE NO SE TOCA
- Todo lo que el cliente escribió para su página (títulos, descripciones, listas, precios, emojis, signos, mayúsculas, orden) se pone EXACTAMENTE como lo escribió, letra por letra. No corriges, no resumes, no reordenas, no cambias palabras ni puntuación, no agregas emojis, no juntas renglones en uno.
- Solo lo acomodas en el diseño: cada renglón o parte suya va en el elemento que corresponda (título, párrafo, lista, precio). Puedes partir un renglón en dos elementos (p. ej. "Nombre — $900 MXN" en título y precio) pero sin cambiar ni un carácter de cada parte.
- Si una frase de la página no viene del cliente, se queda como ya estaba en la página; no redactas textos nuevos. (Quitar viñetas "- " o marcas ** del chat sí está permitido.)

CÓMO EDITAR
- El contenido de las páginas y partes viene marcado con ⟦B1⟧…⟦/B1⟧, ⟦B2⟧…⟦/B2⟧: son bloques que puedes reescribir completos. Las marcas NO son parte del contenido: nunca las copies dentro de "buscar" ni de "reemplazar".
- Cambios grandes en una sección (reescribir paquetes, listas, varias tarjetas, reordenar, agrupar por categorías): usa "bloque" con la marca de la SECCIÓN completa y en "reemplazar" su marcado completo nuevo, copiando su estructura, clases y estilos y cambiando solo lo pedido. Así los títulos de categoría aparecen una sola vez y nada se pierde.
- Cuando el cliente manda una lista nueva (paquetes, servicios, precios), incluye TODOS los elementos que mandó, en su orden, con sus textos tal cual; conserva los que ya estaban y no pidió quitar. Si quitas algo a propósito, ponlo en "textos_quitados".
- Cambios pequeños (una palabra, un precio, un teléfono, un color): usa "buscar"/"reemplazar" con un fragmento copiado tal cual del contenido actual que aparezca UNA sola vez.
- Nunca reemplaces la página entera.
- Mantén el marcado de bloques válido: si cambias un atributo que está en el comentario JSON del bloque y también en el HTML (url, id, color, alineación), cámbialo en ambos.
- Fotos: usa SOLO las claves de FOTOS DISPONIBLES. Para poner una foto escribe {{media:CLAVE}} donde va la URL, {{media:CLAVE:id}} donde va el número de id (en el JSON del bloque "id":{{media:CLAVE:id}} y en la clase wp-image-{{media:CLAVE:id}}) y {{media:CLAVE:grande}} para la versión grande. Al reemplazar una foto cambia su URL, su id y su alt en todos los lugares del bloque. Nunca deformes fotos: conserva los atributos de proporción/recorte (object-fit, aspect-ratio, focal point) que ya tenga el bloque. Ninguna foto se repite en la página: si pones una que ya está en otra sección, sustitúyela allá por otra o avisa en pendientes_equipo.
- Colores: cambia el hex en "estilos" (paleta) y también donde aparezca escrito en el contenido (estilos en línea, clases has-…-color usan el slug de la paleta). Respeta contraste legible (texto oscuro sobre claro o al revés).
- Letra: cambia fontFamilies en "estilos" y opciones.fuentes_url (Google Fonts css2). Usa tipografías poco comunes y acordes al estilo; nunca Arial, Roboto, Open Sans, Montserrat, Poppins, Lato ni Inter.
- Textos: escribe en el tono del sitio, español de México, sin faltas. Si corrige un dato (teléfono, correo, horario, dirección, precio), cámbialo en TODOS los lugares donde aparece (incluye enlaces tel:, wa.me, mailto:) y repórtalo en "contacto".
- Teléfono/WhatsApp: el botón flotante usa opciones.whatsapp (solo dígitos con lada, 52 + 10 dígitos).
- No inventes datos que el cliente no dio: nunca cambies precios, horas, cantidades de fotos ni otras cifras que el cliente no escribió. Si pide aplicar "las correcciones que mandó" y no las encuentras en la conversación, accion=preguntar.
- No "mejores" textos que el cliente no pidió cambiar. Si no se entiende qué quiere o dónde, accion=preguntar con UNA pregunta concreta (p. ej. "¿Cuál foto quieres cambiar, la de la portada o la de 'Sobre mí'?").
- Si pide dejarlo como estaba antes, accion=revertir.
- Lo que no se puede hacer editando (cambiar todo el diseño por otra propuesta, una sección nueva muy compleja, algo que requiere material que no mandó) va a pendientes_equipo (se le dirá al cliente que no se pudo); si nada se puede hacer, accion=equipo.
- resumen_cliente: lo que cambiaste, simple y cálido, sin tecnicismos ni mencionar WordPress, bloques o código.`;

const texto = (v) => String(v ?? '');
const navALista = (marcado) => [...texto(marcado).matchAll(/<!-- wp:navigation-link (\{.*?\}) \/-->/g)].map((m) => { try { const a = JSON.parse(m[1]); return { texto: a.label, url: a.url }; } catch { return null; } }).filter(Boolean);
const quitarHtml = (s) => texto(s).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Fotos que se pueden usar: las del sitio (con su clave en WordPress) y las que el cliente mandó y aún no están. */
async function fotosDisponibles(e, actual, clavesNuevas) {
  const assets = await db.assetsDe(e.id);
  const enSitio = new Map((actual.medios || []).filter((m) => m.origen).map((m) => [m.origen, m]));
  const lista = [];
  for (const m of actual.medios || []) lista.push({ clave: m.clave, url_origen: m.origen || m.url, en_sitio: true, url_sitio: m.url, id_sitio: m.id, descripcion: m.alt || '' });
  for (const a of assets) {
    if (!a.url || !['foto_local', 'foto_producto', 'foto_equipo', 'foto_fundador', 'foto_otro', 'logo', 'imagen'].includes(a.tipo) && !/^image\//.test(a.mime || '')) continue;
    if (enSitio.has(a.url)) { const w = lista.find((x) => x.clave === enSitio.get(a.url).clave); if (w) { w.descripcion = a.descripcion_ia || w.descripcion; w.cliente = a.clave; } continue; }
    lista.push({ clave: `cli-${a.clave}`.toLowerCase(), url_origen: a.url, en_sitio: false, descripcion: a.descripcion_ia || a.nota || '', recien_mandada: clavesNuevas.has(a.clave), cliente: a.clave });
  }
  return lista;
}

/** Lo que el cliente escribió desde que vio su página (o desde el último cambio aplicado): da contexto y rescata pedidos previos. */
const soloCliente = new Map(); // entrevista → lo que escribió el cliente (fuente de cifras permitidas)
async function mensajesDesdePagina(e, s) {
  // Desde la primera vez que se publicó su página (aunque luego se haya regenerado).
  const pub = (await q(`SELECT min(publicado) AS t FROM sitios WHERE entrevista_id=$1`, [e.id])).rows[0]?.t || s?.publicado;
  const desde = pub ? new Date(pub) : new Date(Date.now() - 14 * 864e5);
  const r = await q(`SELECT rol, contenido, transcripcion FROM mensajes WHERE entrevista_id=$1 AND creado > $2 AND rol IN ('cliente','agente') ORDER BY id DESC LIMIT 40`, [e.id, desde]);
  const aplicados = (await q(`SELECT plan->>'resumen_cliente' AS r FROM cambios_sitio WHERE entrevista_id=$1 AND estado='aplicado' AND plan->>'accion'='editar' ORDER BY id`, [e.id])).rows.map((x) => x.r).filter(Boolean);
  const conv = r.rows.reverse().map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${(m.transcripcion || m.contenido || '').slice(0, 12000)}`).join('\n');
  soloCliente.set(e.id, r.rows.filter((m) => m.rol === 'cliente').map((m) => m.transcripcion || m.contenido || '').join('\n'));
  return `${conv}${aplicados.length ? `\n\nCAMBIOS YA APLICADOS Y VIGENTES (ya están en el contenido actual; no los repitas):\n- ${aplicados.join('\n- ')}` : ''}`;
}

async function planear(e, actual, pedidos, fotos, errores = [], historial = '') {
  const brief = e.brief || {};
  const pedidoTxt = pedidos.map((p, i) => `${i + 1}. ${p.texto || '(sin texto)'}${p.media?.length ? ` [mandó foto(s): ${p.media.join(', ')}]` : ''}`).join('\n');
  const fotosTxt = fotos.map((f) => `- ${f.clave}${f.cliente ? ` (cliente: ${f.cliente})` : ''} · ${f.en_sitio ? `YA EN LA PÁGINA (id ${f.id_sitio}, url ${f.url_sitio})` : 'no está en la página'}${f.recien_mandada ? ' · RECIÉN MANDADA con este pedido' : ''} · ${f.descripcion}`).join('\n');
  const partes = [
    `NEGOCIO: ${brief.negocio?.nombre || ''} · contacto actual: ${JSON.stringify(brief.contacto || {})}`,
    `PEDIDO DEL CLIENTE (en orden):\n${pedidoTxt}`,
    ...(historial ? [`CONVERSACIÓN DESDE QUE VIO SU PÁGINA (aplica también los cambios claros que pidió antes y que no estén en CAMBIOS YA APLICADOS; los cambios deshechos con "déjalo como estaba" quedan pendientes solo si los vuelve a pedir):\n${historial}`] : []),
    `FOTOS DISPONIBLES:\n${fotosTxt || '(ninguna)'}`,
    `OPCIONES ACTUALES: ${JSON.stringify(actual.opciones || {})}`,
    `MENÚ ACTUAL: ${JSON.stringify(navALista(actual.menu))}`,
    ...(actual.paginas || []).filter((p) => p.inicio || !/privacidad/.test(p.slug) || /privacidad|aviso/i.test(pedidoTxt + historial)).map((p) => `=== DESTINO pagina:${p.slug} (título "${p.titulo}"${p.inicio ? ', página de inicio' : ''}) ===\n${marcarBloques(p.contenido).marcado}`),
    ...Object.entries(actual.partes || {}).map(([k, v]) => `=== DESTINO ${k} ===\n${marcarBloques(v).marcado}`),
    `=== DESTINO estilos (JSON) ===\n${JSON.stringify(actual.estilos || {}, null, 1)}`,
  ];
  if (errores.length) partes.push(`TU INTENTO ANTERIOR FALLÓ, corrige esto:\n- ${errores.join('\n- ')}`);
  const r = await pedirJSON({ system: SISTEMA_EDITOR, contenido: partes.join('\n\n'), schema: ESQUEMA_PLAN, model: config.anthropicModel, max_tokens: 16000, timeoutMs: 420000 });
  return r.data;
}

/** Aplica las ediciones en memoria. Devuelve {destinos, errores}. Primero bloques completos, luego buscar/reemplazar. */
export function aplicarEdiciones(actual, ediciones) {
  const destinos = {};
  const errores = [];
  const leer = (d) => {
    if (d in destinos) return destinos[d];
    if (d === 'estilos') return JSON.stringify(actual.estilos || {}, null, 1);
    if (d === 'header' || d === 'footer') return actual.partes?.[d];
    if (d.startsWith('pagina:')) return actual.paginas?.find((p) => p.slug === d.slice(7))?.contenido;
    return undefined;
  };
  const lista = (ediciones || []).map((ed, i) => ({ ...ed, n: i + 1, buscar: sinMarcas(ed.buscar), reemplazar: sinMarcas(ed.reemplazar) }));
  // 1) Bloques completos, sobre las posiciones originales (de atrás hacia adelante).
  const porDestino = {};
  for (const ed of lista.filter((x) => x.bloque)) (porDestino[ed.destino] ||= []).push(ed);
  for (const [d, eds] of Object.entries(porDestino)) {
    const original = leer(d);
    if (original === undefined || !DESTINOS_HTML(d)) { errores.push(`El destino "${d}" no tiene bloques`); continue; }
    const { unidades } = marcarBloques(original);
    const cambios = [];
    for (const ed of eds) {
      const u = unidades.find((x) => x.id === String(ed.bloque).replace(/[⟦⟧\/]/g, '').trim());
      if (!u) { errores.push(`Edición ${ed.n}: el bloque ${ed.bloque} no existe en ${d}`); continue; }
      if (cambios.some((c) => c.u === u)) { errores.push(`Edición ${ed.n}: el bloque ${ed.bloque} se reescribe dos veces`); continue; }
      cambios.push({ u, nuevo: ed.reemplazar });
    }
    let txt = original;
    for (const c of cambios.sort((a, b) => b.u.ini - a.u.ini)) txt = txt.slice(0, c.u.ini) + c.nuevo + txt.slice(c.u.fin);
    destinos[d] = txt;
  }
  // 2) Buscar/reemplazar.
  for (const ed of lista.filter((x) => !x.bloque)) {
    const actualTxt = leer(ed.destino);
    if (actualTxt === undefined) { errores.push(`Edición ${ed.n}: el destino "${ed.destino}" no existe`); continue; }
    if (!ed.buscar) { errores.push(`Edición ${ed.n}: falta "buscar" o "bloque"`); continue; }
    const { veces, re } = buscarTolerante(actualTxt, ed.buscar);
    if (veces === 0) { errores.push(`Edición ${ed.n} (${ed.destino}): el fragmento no existe en el contenido actual: ${JSON.stringify(ed.buscar.slice(0, 200))}. Cópialo tal cual o reescribe el bloque completo con "bloque".`); continue; }
    if (veces > 1 && !ed.todas) { errores.push(`Edición ${ed.n} (${ed.destino}): el fragmento aparece ${veces} veces; alárgalo o usa "bloque": ${JSON.stringify(ed.buscar.slice(0, 200))}`); continue; }
    if (re) destinos[ed.destino] = ed.todas ? actualTxt.replace(re, () => ed.reemplazar) : actualTxt.replace(new RegExp(re.source), () => ed.reemplazar);
    else destinos[ed.destino] = ed.todas ? actualTxt.split(ed.buscar).join(ed.reemplazar) : actualTxt.replace(ed.buscar, () => ed.reemplazar);
  }
  if ('estilos' in destinos) {
    try { destinos.estilos = JSON.parse(destinos.estilos); } catch { errores.push('Las ediciones dejaron "estilos" como JSON inválido'); }
  }
  return { destinos, errores };
}

/* Bloques editables: se marca el árbol de bloques de WordPress hasta que cada unidad mida ≤ MAX_BLOQUE caracteres. */
const MAX_BLOQUE = 20000; // una sección completa (p. ej. todos los paquetes) cabe en un bloque para reescribirla coherente
function arbolBloques(txt) {
  const re = /<!--\s+(\/)?wp:([a-z0-9/_-]+)(?:\s+(\{[\s\S]*?\}))?\s+(\/)?-->/g;
  const raiz = { hijos: [] }; const pila = [raiz]; let m;
  while ((m = re.exec(txt))) {
    const [todo, cierra, nombre, , auto] = m;
    if (auto) { pila.at(-1).hijos.push({ nombre, ini: m.index, fin: m.index + todo.length, hijos: [] }); continue; }
    if (!cierra) { const n = { nombre, ini: m.index, fin: null, hijos: [] }; pila.at(-1).hijos.push(n); pila.push(n); continue; }
    const n = pila.at(-1);
    if (n !== raiz && n.nombre === nombre) { n.fin = m.index + todo.length; pila.pop(); }
  }
  const limpiar = (n) => { n.hijos = n.hijos.filter((h) => h.fin !== null); n.hijos.forEach(limpiar); };
  limpiar(raiz);
  return raiz.hijos;
}
export function marcarBloques(txt, prefijo = 'B') {
  const unidades = [];
  const elegir = (n) => { if (n.fin - n.ini <= MAX_BLOQUE || !n.hijos.length) unidades.push(n); else n.hijos.forEach(elegir); };
  arbolBloques(txt).forEach(elegir);
  unidades.sort((a, b) => a.ini - b.ini);
  unidades.forEach((u, i) => { u.id = `${prefijo}${i + 1}`; });
  let out = ''; let pos = 0;
  for (const u of unidades) { out += txt.slice(pos, u.ini) + `⟦${u.id}⟧` + txt.slice(u.ini, u.fin) + `⟦/${u.id}⟧`; pos = u.fin; }
  return { marcado: out + txt.slice(pos), unidades };
}
const sinMarcas = (t) => texto(t).replace(/⟦\/?[A-Z]+\d+⟧/g, '');
// Búsqueda tolerante a espacios: si el fragmento exacto no aparece, se prueba ignorando diferencias de espacios.
function buscarTolerante(txt, frag) {
  const exactas = txt.split(frag).length - 1;
  if (exactas) return { veces: exactas, re: null };
  const patron = frag.trim().split(/\s+/).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
  if (!patron) return { veces: 0, re: null };
  const re = new RegExp(patron, 'g');
  return { veces: (txt.match(re) || []).length, re };
}

// Ningún texto nuevo en la página que no venga, tal cual, del cliente o de lo que ya estaba.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', times: '×' };
const decodificar = (t) => texto(t).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, c) => (c[0] === '#' ? String.fromCodePoint(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : (ENT[c.toLowerCase()] ?? m)));
const normTexto = (t) => decodificar(t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const nodosTexto = (html) => texto(html).replace(/<!--[\s\S]*?-->/g, '\n').split(/<[^>]+>/).map(normTexto).filter((x) => x.length >= 3 && /\p{L}/u.test(x));
const textoCliente = (t) => normTexto(texto(t).split('\n').map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '').replace(/\*\*|__/g, '')).join('\n'));
// El fragmento aparece en el texto del cliente sin cortar palabras a la mitad.
function contienePalabraEntera(hay, frag) {
  const esLetra = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch);
  for (let i = hay.indexOf(frag); i !== -1; i = hay.indexOf(frag, i + 1)) {
    if ((!esLetra(frag[0]) || !esLetra(hay[i - 1])) && (!esLetra(frag.at(-1)) || !esLetra(hay[i + frag.length]))) return true;
  }
  return false;
}
export function textosAjenos(actual, destinos, fuenteCliente) {
  const cliente = textoCliente(fuenteCliente);
  const errores = [];
  for (const [d, nuevo] of Object.entries(destinos)) {
    if (!DESTINOS_HTML(d)) continue;
    const viejo = d.startsWith('pagina:') ? actual.paginas.find((p) => p.slug === d.slice(7))?.contenido : actual.partes?.[d];
    const yaEstaba = new Set(nodosTexto(viejo));
    const viejoTodo = normTexto(quitarHtml(viejo));
    const ajenos = nodosTexto(nuevo).filter((n) => !yaEstaba.has(n) && !viejoTodo.includes(n) && !contienePalabraEntera(cliente, n) && !/\{\{media:/.test(n));
    if (ajenos.length) errores.push(`En ${d} hay textos que no escribió el cliente ni estaban en la página (el texto del cliente va letra por letra, sin cambios): ${ajenos.slice(0, 8).map((x) => JSON.stringify(x.slice(0, 120))).join(' · ')}`);
  }
  return errores;
}

// Ninguna cifra nueva en la página que el cliente no haya escrito.
const cifras = (t) => new Set((quitarHtml(t).match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/,(?=\d{3}\b)/g, '')));
export function cifrasInventadas(actual, destinos, fuente) {
  const permitidas = cifras(fuente);
  const errores = [];
  for (const [d, nuevo] of Object.entries(destinos)) {
    if (!DESTINOS_HTML(d)) continue;
    const viejo = d.startsWith('pagina:') ? actual.paginas.find((p) => p.slug === d.slice(7))?.contenido : actual.partes?.[d];
    const antes = cifras(viejo);
    const nuevas = [...cifras(nuevo)].filter((n) => !antes.has(n) && !permitidas.has(n) && !/\{\{/.test(n));
    if (nuevas.length) errores.push(`En ${d} aparecen cifras que el cliente no escribió: ${nuevas.slice(0, 12).join(', ')}. No cambies ni agregues precios, horas o cantidades que no estén en sus mensajes.`);
  }
  return errores;
}

// Ningún título (h1–h4) desaparece sin que el editor lo declare en textos_quitados.
const titulos = (html) => new Set([...texto(html).matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)].map((m) => normTit(m[1])).filter(Boolean));
const normTit = (t) => quitarHtml(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9$]+/g, ' ').trim();
const palabras = (t) => new Set(t.split(' ').filter((w) => w.length >= 3 && !['paquete', 'sesion', 'para', 'con', 'los', 'las', 'del'].includes(w)));
const parecido = (a, b) => { const A = palabras(a); const B = palabras(b); if (!A.size || !B.size) return 0; let n = 0; for (const w of A) if ([...B].some((x) => x === w || (w.length > 4 && (x.startsWith(w.slice(0, 4)))))) n++; return n / A.size; };
export function titulosPerdidos(actual, destinos, quitados = []) {
  const q2 = (quitados || []).map(normTit);
  const errores = [];
  for (const [d, nuevo] of Object.entries(destinos)) {
    if (!DESTINOS_HTML(d)) continue;
    const viejo = d.startsWith('pagina:') ? actual.paginas.find((p) => p.slug === d.slice(7))?.contenido : actual.partes?.[d];
    const ahora = titulos(nuevo);
    const textoNuevo = normTit(nuevo);
    for (const t of titulos(viejo)) {
      if (ahora.has(t) || textoNuevo.includes(t) || q2.some((x) => x && (x.includes(t) || t.includes(x)))) continue;
      if ([...ahora].some((n) => parecido(t, n) >= 0.5)) continue; // renombrado (p. ej. "Smash Cake (Primer Año)" → "Smash Cake | Primer Añito")
      if (parecido(t, textoNuevo) >= 0.75) continue; // sigue en la página aunque ya no sea título (p. ej. "Paquete Boda Civil + Recepción" → "Boda Civil + Recepción — $3,300 MXN")
      errores.push(`En ${d} desapareció el título "${t}". Si el cliente no pidió quitarlo, consérvalo (o su versión nueva); si se quita a propósito, ponlo en textos_quitados.`);
    }
    // Títulos repetidos que antes no lo estaban (p. ej. la misma categoría encima de cada tarjeta).
    const cuenta = (html) => { const c = {}; for (const m of texto(html).matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)) { const k = normTit(m[1]); if (k) c[k] = (c[k] || 0) + 1; } return c; };
    const cv = cuenta(viejo); const cn = cuenta(nuevo);
    for (const [k, n] of Object.entries(cn)) if (n > 1 && n > (cv[k] || 0)) errores.push(`En ${d} el título "${k}" quedó repetido ${n} veces; cada título de categoría va una sola vez, encima de su grupo.`);
  }
  return errores;
}

const DESTINOS_HTML = (d) => d.startsWith('pagina:') || d === 'header' || d === 'footer';

/** Cuerpo para /aplicar a partir de destinos editados (o de un respaldo, que tiene la misma forma). */
function cuerpoAplicar(actual, destinos, { menu, opciones, medios = [] } = {}) {
  const cuerpo = { medios };
  const paginas = Object.entries(destinos).filter(([d]) => d.startsWith('pagina:')).map(([d, contenido]) => {
    const p = actual.paginas.find((x) => x.slug === d.slice(7));
    return { slug: p.slug, titulo: p.titulo, contenido, ...(p.inicio ? { inicio: true } : {}), ...(p.plantilla ? { plantilla: p.plantilla } : {}) };
  });
  if (paginas.length) cuerpo.paginas = paginas;
  const partes = Object.fromEntries(['header', 'footer'].filter((k) => k in destinos).map((k) => [k, destinos[k]]));
  if (Object.keys(partes).length) cuerpo.partes = partes;
  if (destinos.estilos) cuerpo.estilos = destinos.estilos;
  if (menu?.length) cuerpo.menu = menu;
  if (opciones && Object.keys(opciones).length) {
    const { fuentes_url, ...resto } = opciones;
    if (fuentes_url) cuerpo.fuentes_url = fuentes_url;
    if (Object.keys(resto).length) cuerpo.opciones = resto;
  }
  return cuerpo;
}

/** Lo que había antes en cada cosa que se va a tocar (para restaurar). */
function respaldoDe(actual, destinos, { menu, opciones }) {
  const r = { destinos: {}, menu: null, opciones: {} };
  for (const d of Object.keys(destinos)) {
    if (d === 'estilos') r.destinos.estilos = actual.estilos;
    else if (d === 'header' || d === 'footer') r.destinos[d] = actual.partes[d];
    else r.destinos[d] = actual.paginas.find((p) => p.slug === d.slice(7))?.contenido;
  }
  if (menu?.length) r.menu = navALista(actual.menu);
  const o = actual.opciones || {};
  for (const k of Object.keys(opciones || {})) {
    if (k === 'logo') { if (o.site_logo) r.opciones.site_logo = o.site_logo; }
    else if (k in o) r.opciones[k] = o[k] ?? '';
  }
  return r;
}

async function leerPagina(url) {
  const u = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  const r = await fetch(u, { signal: AbortSignal.timeout(30000), headers: { 'cache-control': 'no-cache' } });
  return { status: r.status, html: await r.text() };
}
const contarImgs = (html) => (texto(html).match(/<img\b/g) || []).length;
const repetidas = (html) => { const ids = texto(html).match(/wp-image-(\d+)/g) || []; return ids.length - new Set(ids).size; };

/* ------------------------------------------------------------------ */
/* Aplicar                                                             */
/* ------------------------------------------------------------------ */

async function noPude(c, e, resultado) {
  await guardar(c.id, { estado: 'preguntar', plan: { ...(c.plan || {}), pregunta: NO_PUDE }, resultado });
  return avisar(e?.id || c.entrevista_id, NO_PUDE, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

async function guardar(id, cambios) {
  const cols = Object.keys(cambios);
  const vals = cols.map((k) => (cambios[k] !== null && typeof cambios[k] === 'object' ? JSON.stringify(cambios[k]) : cambios[k]));
  await q(`UPDATE cambios_sitio SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(', ')}, actualizado=now() WHERE id=$1`, [id, ...vals]);
}

async function actualizarContacto(e, contacto) {
  const limpio = Object.fromEntries(Object.entries(contacto || {}).filter(([, v]) => typeof v === 'string' && v.trim()));
  if (!Object.keys(limpio).length) return;
  await q(`UPDATE entrevistas SET brief = jsonb_set(COALESCE(brief,'{}'::jsonb), '{contacto}', COALESCE(brief->'contacto','{}'::jsonb) || $2::jsonb, true), actualizado=now() WHERE id=$1`, [e.id, JSON.stringify(limpio)]);
}

async function revertirUltimo(c, e, s) {
  const ult = (await q(`SELECT * FROM cambios_sitio WHERE entrevista_id=$1 AND estado='aplicado' AND respaldo IS NOT NULL AND id<>$2 ORDER BY id DESC LIMIT 1`, [e.id, c.id])).rows[0];
  if (!ult) {
    await guardar(c.id, { estado: 'aplicado', resultado: { revertir: 'sin cambios previos' } });
    return avisar(e.id, 'Todavía no he hecho cambios a tu página, así que sigue como la viste la primera vez. ¿Qué te gustaría ajustar?', { evento: 'cambios_sitio' });
  }
  const actual = await wp.contenido(s.blog_id_wp);
  const rs = ult.respaldo;
  await wp.aplicar(s.blog_id_wp, cuerpoAplicar(actual, rs.destinos || {}, { menu: rs.menu, opciones: rs.opciones }));
  await guardar(ult.id, { estado: 'revertido' });
  await guardar(c.id, { estado: 'aplicado', resultado: { revertido: ult.id } });
  await avisar(e.id, `Listo, dejé tu página como estaba antes del último cambio ✅: ${s.url_publica}\nSi no lo ves, recarga la página. ¿Quieres ajustar algo más?`, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

export async function aplicarCambio(c) {
  const e = await db.obtener(c.entrevista_id);
  const s = await sitioEditable(c.entrevista_id);
  if (!e || !s) {
    await guardar(c.id, { estado: 'equipo', resultado: { motivo: 'sin sitio WordPress editable' } });
    await avisarEquipo('Cambios sin sitio editable', `Pedido de cambios para ${e?.brief?.negocio?.nombre || c.entrevista_id}, pero no hay sitio WordPress en estado listo:\n${c.pedidos.map((p) => `- ${p.texto}`).join('\n')}`, c.entrevista_id);
    if (e) await avisar(e.id, 'Por ahora no puedo aplicar cambios a esta página desde aquí 😔', { evento: 'cambios_sitio' });
    return;
  }
  await guardar(c.id, { sitio_id: s.id });
  const actual = await wp.contenido(s.blog_id_wp);
  const clavesNuevas = new Set(c.pedidos.flatMap((p) => p.media || []));
  const fotos = await fotosDisponibles(e, actual, clavesNuevas);

  const historial = await mensajesDesdePagina(e, s);
  let plan, ed, errores = [];
  for (let intento = 0; intento < 3; intento++) {
    plan = await planear(e, actual, c.pedidos, fotos, errores, historial);
    if (plan.accion !== 'editar') break;
    ed = aplicarEdiciones(actual, plan.ediciones);
    errores = [...ed.errores];
    const usadas = new Set([...JSON.stringify(ed.destinos).matchAll(/\{\{media:([a-z0-9_-]+)/g)].map((m) => m[1]));
    if (plan.opciones?.logo) usadas.add(plan.opciones.logo);
    for (const k of usadas) if (!fotos.some((f) => f.clave === k)) errores.push(`La foto "${k}" no está en FOTOS DISPONIBLES`);
    for (const [d, v] of Object.entries(ed.destinos)) if (d === 'estilos' && /\{\{media:/.test(JSON.stringify(v))) errores.push('No pongas fotos en "estilos"');
    errores.push(...titulosPerdidos(actual, ed.destinos, plan.textos_quitados));
    errores.push(...textosAjenos(actual, ed.destinos, `${c.pedidos.map((p) => p.texto).join('\n')}\n${soloCliente.get(e.id) || ''}`));
    errores.push(...cifrasInventadas(actual, ed.destinos, `${c.pedidos.map((p) => p.texto).join('\n')}\n${soloCliente.get(e.id) || ''}\n${JSON.stringify(e.brief?.contacto || {})}`));
    if (!errores.length) break;
  }
  await guardar(c.id, { plan });

  if (plan.accion === 'preguntar') {
    await guardar(c.id, { estado: 'preguntar' });
    return avisar(e.id, plan.pregunta || '¿Me dices un poco más de lo que quieres cambiar?', { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
  }
  if (plan.accion === 'revertir') return revertirUltimo(c, e, s);

  const pendientes = (plan.pendientes_equipo || []).filter(Boolean);
  const hayEdiciones = plan.accion === 'editar' && ed && (Object.keys(ed.destinos).length || plan.menu?.length || Object.keys(plan.opciones || {}).length);
  if (!hayEdiciones || errores.length) {
    const motivo = errores.length ? `No se pudieron aplicar las ediciones:\n- ${errores.join('\n- ')}` : 'Nada se puede hacer editando.';
    await avisarEquipo('Cambios de página para revisar', `${e.brief?.negocio?.nombre || e.id} · ${s.url_publica}\nPedido:\n${c.pedidos.map((p) => `- ${p.texto}`).join('\n')}\n\n${motivo}${pendientes.length ? `\nPendientes: ${pendientes.join('; ')}` : ''}`, e.id);
    return noPude(c, e, { errores, pendientes });
  }

  // Opciones → formato de /aplicar.
  const opciones = { ...(plan.opciones || {}) };
  const medios = [];
  const usadas = new Set([...JSON.stringify(ed.destinos).matchAll(/\{\{media:([a-z0-9_-]+)/g)].map((m) => m[1]));
  if (opciones.logo) usadas.add(opciones.logo);
  for (const k of usadas) { const f = fotos.find((x) => x.clave === k); medios.push({ clave: k, url: f.url_origen, alt: f.descripcion?.slice(0, 120) || '' }); }
  if (opciones.logo) { opciones.logo_clave = opciones.logo; delete opciones.logo; }
  if (opciones.whatsapp) opciones.whatsapp = opciones.whatsapp.replace(/\D/g, '');

  const respaldo = respaldoDe(actual, ed.destinos, { menu: plan.menu, opciones: plan.opciones });
  await guardar(c.id, { respaldo });
  const antes = await leerPagina(s.url_publica).catch(() => ({ status: 0, html: '' }));

  const cuerpo = cuerpoAplicar(actual, ed.destinos, { menu: plan.menu, opciones, medios });
  const ap = await wp.aplicar(s.blog_id_wp, cuerpo);

  // Verificación: la página responde, sin marcadores sueltos, sin perder fotos ni repetirlas.
  const fallos = [];
  const medioFallido = (ap.log || []).filter((l) => /^medio /.test(l));
  if (medioFallido.length) fallos.push(...medioFallido);
  const despues = await leerPagina(s.url_publica).catch((err) => ({ status: 0, html: '', error: err.message }));
  if (despues.status !== 200) fallos.push(`La página respondió ${despues.status}${despues.error ? ` (${despues.error})` : ''}`);
  if (/\{\{media:/.test(despues.html)) fallos.push('Quedó un marcador de foto sin reemplazar');
  if (antes.status === 200 && despues.status === 200) {
    const quitadas = Math.max(0, plan.fotos_quitadas || 0);
    if (contarImgs(despues.html) < contarImgs(antes.html) - quitadas) fallos.push(`La página perdió fotos (${contarImgs(antes.html)} → ${contarImgs(despues.html)})`);
    if (repetidas(despues.html) > repetidas(antes.html)) fallos.push('Quedaron fotos repetidas');
  }
  const avisos = [];
  for (const edi of plan.ediciones || []) {
    if (!DESTINOS_HTML(edi.destino)) continue;
    const frag = quitarHtml(edi.reemplazar).replace(/\{\{[^}]+\}\}/g, '').split(/[.!?\n]/).map((x) => x.trim()).sort((a, b) => b.length - a.length)[0] || '';
    if (frag.length >= 8 && !quitarHtml(despues.html).replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").includes(frag.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").slice(0, 40))) avisos.push(`No se encontró en la página: "${frag.slice(0, 60)}"`);
  }

  if (fallos.length) {
    try { await wp.aplicar(s.blog_id_wp, cuerpoAplicar(actual, respaldo.destinos, { menu: respaldo.menu, opciones: respaldo.opciones })); } catch (err) { fallos.push(`No se pudo restaurar: ${err.message}`); }
    await avisarEquipo('Cambio de página revertido', `${e.brief?.negocio?.nombre || e.id} · ${s.url_publica}\nPedido:\n${c.pedidos.map((p) => `- ${p.texto}`).join('\n')}\n\nSe aplicó y se restauró porque:\n- ${fallos.join('\n- ')}`, e.id);
    return noPude(c, e, { fallos, avisos, log: ap.log });
  }

  await actualizarContacto(e, plan.contacto);
  await guardar(c.id, { estado: 'aplicado', resultado: { avisos, log: ap.log, pendientes } });
  if (pendientes.length) await avisarEquipo('Cambios pendientes de página', `${e.brief?.negocio?.nombre || e.id} · ${s.url_publica}\nSe aplicó: ${plan.resumen_cliente}\nFalta (equipo): ${pendientes.join('; ')}`, e.id);
  const extra = pendientes.length ? `\nLo de ${pendientes.join(', ')} no pude hacerlo; ¿me lo explicas de otra forma?` : '';
  await avisar(e.id, `${plan.resumen_cliente}\nYa quedó ✅: ${s.url_publica}\nSi no ves el cambio, recarga la página.${extra}\n¿Hay algo más que quieras ajustar?`, { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
}

let corriendo = false;
export async function cronCambios() {
  if (corriendo) return;
  corriendo = true;
  try {
    await migrar();
    // Los que se quedaron a medias por un reinicio vuelven a la cola.
    await q(`UPDATE cambios_sitio SET estado='pendiente', aplicar_en=now() WHERE estado='aplicando' AND actualizado < now() - interval '30 minutes'`);
    for (let i = 0; i < 10; i++) {
      const c = (await q(`UPDATE cambios_sitio SET estado='aplicando', actualizado=now()
                          WHERE id = (SELECT id FROM cambios_sitio WHERE estado='pendiente' AND aplicar_en <= now() ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
                          RETURNING *`)).rows[0];
      if (!c) break;
      try { await aplicarCambio(c); }
      catch (err) {
        console.error('aplicarCambio', c.id, err);
        // Fallas pasajeras (tiempo de espera, red): se reintenta hasta 2 veces sin molestar al cliente.
        if ((c.intentos || 0) < 2 && /timeout|aborted|fetch failed|ECONN|overloaded|5\d\d/i.test(String(err.message || err))) {
          await q(`UPDATE cambios_sitio SET estado='pendiente', aplicar_en=now() + interval '30 seconds', intentos=intentos+1, resultado=$2, actualizado=now() WHERE id=$1`, [c.id, JSON.stringify({ error: String(err.message || err).slice(0, 300) })]).catch(() => {});
          continue;
        }
        await avisarEquipo('Error al aplicar cambios de página', `Cambio ${c.id} (entrevista ${c.entrevista_id}): ${err.message}\nPedido:\n${c.pedidos.map((p) => `- ${p.texto}`).join('\n')}`, c.entrevista_id).catch(() => {});
        await noPude(c, null, { error: String(err.message || err).slice(0, 800) }).catch(() => {});
      }
    }
  } finally { corriendo = false; }
}

/** Prueba sin tocar nada: qué ediciones haría Claude para estos pedidos y si validan. */
export async function simular(entrevistaId, pedidos) {
  const e = await db.obtener(entrevistaId);
  const s = await sitioEditable(entrevistaId);
  if (!e || !s) throw new Error('sin sitio WordPress editable');
  const actual = await wp.contenido(s.blog_id_wp);
  const fotos = await fotosDisponibles(e, actual, new Set(pedidos.flatMap((p) => p.media || [])));
  const plan = await planear(e, actual, pedidos, fotos, [], await mensajesDesdePagina(e, s));
  const ed = plan.accion === 'editar' ? aplicarEdiciones(actual, plan.ediciones) : { destinos: {}, errores: [] };
  return { url: s.url_publica, plan, errores: ed.errores, destinos: Object.keys(ed.destinos), fotos: fotos.length };
}
