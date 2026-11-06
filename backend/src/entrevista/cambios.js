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
          buscar: { type: 'string', description: 'Fragmento EXACTO, copiado carácter por carácter del contenido actual; debe aparecer una sola vez (alarga el fragmento si se repite).' },
          reemplazar: { type: 'string' },
          todas: { type: 'boolean', description: 'true solo si a propósito se reemplazan todas las apariciones (p. ej. un color hex en estilos).' },
        },
        required: ['destino', 'buscar', 'reemplazar'],
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
    fotos_quitadas: { type: 'integer', description: 'Cuántas fotos se quitan de la página a propósito (0 si ninguna).' },
    pendientes_equipo: { type: 'array', items: { type: 'string' }, description: 'Cosas pedidas que NO se pueden hacer editando (explicadas en lenguaje del cliente).' },
    resumen_cliente: { type: 'string', description: 'Qué se cambió, en 1–2 frases sencillas para el cliente, en primera persona ("Cambié…, puse…").' },
  },
  required: ['accion', 'resumen_cliente'],
};

const SISTEMA_EDITOR = `Eres el editor web del equipo de Ari. El cliente ya tiene su página WordPress publicada y pide cambios.
Aplicas EXACTAMENTE lo que pide, editando el marcado publicado con ediciones buscar/reemplazar. Todo lo demás queda idéntico.

REGLAS
- "buscar" se copia tal cual del contenido actual (mismos espacios, comillas, entidades y comentarios <!-- wp:... -->) y debe aparecer UNA sola vez en su destino; si se repite, alarga el fragmento. Ediciones pequeñas y precisas: nunca reemplaces la página entera.
- Mantén el marcado de bloques válido: si cambias un atributo que está en el comentario JSON del bloque y también en el HTML (url, id, color, alineación), cámbialo en ambos.
- Fotos: usa SOLO las claves de FOTOS DISPONIBLES. Para poner una foto escribe {{media:CLAVE}} donde va la URL, {{media:CLAVE:id}} donde va el número de id (en el JSON del bloque "id":{{media:CLAVE:id}} y en la clase wp-image-{{media:CLAVE:id}}) y {{media:CLAVE:grande}} para la versión grande. Al reemplazar una foto cambia su URL, su id y su alt en todos los lugares del bloque. Nunca deformes fotos: conserva los atributos de proporción/recorte (object-fit, aspect-ratio, focal point) que ya tenga el bloque. Ninguna foto se repite en la página: si pones una que ya está en otra sección, sustitúyela allá por otra o avisa en pendientes_equipo.
- Colores: cambia el hex en "estilos" (paleta) y también donde aparezca escrito en el contenido (estilos en línea, clases has-…-color usan el slug de la paleta). Respeta contraste legible (texto oscuro sobre claro o al revés).
- Letra: cambia fontFamilies en "estilos" y opciones.fuentes_url (Google Fonts css2). Usa tipografías poco comunes y acordes al estilo; nunca Arial, Roboto, Open Sans, Montserrat, Poppins, Lato ni Inter.
- Textos: escribe en el tono del sitio, español de México, sin faltas. Si corrige un dato (teléfono, correo, horario, dirección, precio), cámbialo en TODOS los lugares donde aparece (incluye enlaces tel:, wa.me, mailto:) y repórtalo en "contacto".
- Teléfono/WhatsApp: el botón flotante usa opciones.whatsapp (solo dígitos con lada, 52 + 10 dígitos).
- No inventes datos que el cliente no dio. Si no se entiende qué quiere o dónde, accion=preguntar con UNA pregunta concreta (p. ej. "¿Cuál foto quieres cambiar, la de la portada o la de 'Sobre mí'?").
- Si pide dejarlo como estaba antes, accion=revertir.
- Lo que no se puede hacer editando (cambiar todo el diseño por otra propuesta, una sección nueva muy compleja, algo que requiere material que no mandó) va a pendientes_equipo; si nada se puede hacer, accion=equipo.
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
async function mensajesDesdePagina(e, s) {
  const ult = (await q(`SELECT max(actualizado) AS t FROM cambios_sitio WHERE entrevista_id=$1 AND estado IN ('aplicado','revertido')`, [e.id])).rows[0]?.t;
  const desde = [s?.publicado, ult].filter(Boolean).map((t) => new Date(t)).sort((a, b) => b - a)[0] || new Date(Date.now() - 7 * 864e5);
  const r = await q(`SELECT rol, contenido, transcripcion FROM mensajes WHERE entrevista_id=$1 AND creado > $2 AND rol IN ('cliente','agente') ORDER BY id DESC LIMIT 40`, [e.id, desde]);
  return r.rows.reverse().map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${(m.transcripcion || m.contenido || '').slice(0, 3000)}`).join('\n');
}

async function planear(e, actual, pedidos, fotos, errores = [], historial = '') {
  const brief = e.brief || {};
  const pedidoTxt = pedidos.map((p, i) => `${i + 1}. ${p.texto || '(sin texto)'}${p.media?.length ? ` [mandó foto(s): ${p.media.join(', ')}]` : ''}`).join('\n');
  const fotosTxt = fotos.map((f) => `- ${f.clave}${f.cliente ? ` (cliente: ${f.cliente})` : ''} · ${f.en_sitio ? `YA EN LA PÁGINA (id ${f.id_sitio}, url ${f.url_sitio})` : 'no está en la página'}${f.recien_mandada ? ' · RECIÉN MANDADA con este pedido' : ''} · ${f.descripcion}`).join('\n');
  const partes = [
    `NEGOCIO: ${brief.negocio?.nombre || ''} · contacto actual: ${JSON.stringify(brief.contacto || {})}`,
    `PEDIDO DEL CLIENTE (en orden):\n${pedidoTxt}`,
    ...(historial ? [`CONVERSACIÓN DESDE QUE VIO SU PÁGINA (incluye cambios que pidió antes y aún no se aplican; aplícalos también si son claros):\n${historial}`] : []),
    `FOTOS DISPONIBLES:\n${fotosTxt || '(ninguna)'}`,
    `OPCIONES ACTUALES: ${JSON.stringify(actual.opciones || {})}`,
    `MENÚ ACTUAL: ${JSON.stringify(navALista(actual.menu))}`,
    ...(actual.paginas || []).filter((p) => p.inicio || !/privacidad/.test(p.slug) || /privacidad|aviso/i.test(pedidoTxt + historial)).map((p) => `=== DESTINO pagina:${p.slug} (título "${p.titulo}"${p.inicio ? ', página de inicio' : ''}) ===\n${p.contenido}`),
    ...Object.entries(actual.partes || {}).map(([k, v]) => `=== DESTINO ${k} ===\n${v}`),
    `=== DESTINO estilos (JSON) ===\n${JSON.stringify(actual.estilos || {}, null, 1)}`,
  ];
  if (errores.length) partes.push(`TU INTENTO ANTERIOR FALLÓ, corrige esto:\n- ${errores.join('\n- ')}`);
  const r = await pedirJSON({ system: SISTEMA_EDITOR, contenido: partes.join('\n\n'), schema: ESQUEMA_PLAN, model: config.anthropicModel, max_tokens: 8000, timeoutMs: 360000 });
  return r.data;
}

/** Aplica las ediciones en memoria. Devuelve {destinos, errores}. */
function aplicarEdiciones(actual, ediciones) {
  const destinos = {};
  const errores = [];
  const leer = (d) => {
    if (d in destinos) return destinos[d];
    if (d === 'estilos') return JSON.stringify(actual.estilos || {}, null, 1);
    if (d === 'header' || d === 'footer') return actual.partes?.[d];
    if (d.startsWith('pagina:')) return actual.paginas?.find((p) => p.slug === d.slice(7))?.contenido;
    return undefined;
  };
  for (const [i, ed] of (ediciones || []).entries()) {
    const actualTxt = leer(ed.destino);
    if (actualTxt === undefined) { errores.push(`Edición ${i + 1}: el destino "${ed.destino}" no existe`); continue; }
    if (!ed.buscar) { errores.push(`Edición ${i + 1}: "buscar" vacío`); continue; }
    const veces = actualTxt.split(ed.buscar).length - 1;
    if (veces === 0) { errores.push(`Edición ${i + 1} (${ed.destino}): el fragmento a buscar no existe tal cual: ${JSON.stringify(ed.buscar.slice(0, 160))}`); continue; }
    if (veces > 1 && !ed.todas) { errores.push(`Edición ${i + 1} (${ed.destino}): el fragmento aparece ${veces} veces; alárgalo para que sea único: ${JSON.stringify(ed.buscar.slice(0, 160))}`); continue; }
    destinos[ed.destino] = ed.todas ? actualTxt.split(ed.buscar).join(ed.reemplazar) : actualTxt.replace(ed.buscar, () => ed.reemplazar);
  }
  if ('estilos' in destinos) {
    try { destinos.estilos = JSON.parse(destinos.estilos); } catch { errores.push('Las ediciones dejaron "estilos" como JSON inválido'); }
  }
  return { destinos, errores };
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
    if (e) await avisar(e.id, 'Ya tengo tus cambios; alguien de nuestro equipo los aplica y te aviso aquí en cuanto queden 🙌', { evento: 'cambios_sitio' });
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
    await guardar(c.id, { estado: 'equipo', resultado: { errores, pendientes } });
    await avisarEquipo('Cambios de página para revisar', `${e.brief?.negocio?.nombre || e.id} · ${s.url_publica}\nPedido:\n${c.pedidos.map((p) => `- ${p.texto}`).join('\n')}\n\n${motivo}${pendientes.length ? `\nPendientes: ${pendientes.join('; ')}` : ''}`, e.id);
    return avisar(e.id, 'Ya tengo tus cambios 🙌 Este ajuste lo hace alguien de nuestro equipo con cuidado; te aviso aquí en cuanto quede.', { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
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
    await guardar(c.id, { estado: 'fallo', resultado: { fallos, avisos, log: ap.log } });
    await avisarEquipo('Cambio de página revertido', `${e.brief?.negocio?.nombre || e.id} · ${s.url_publica}\nPedido:\n${c.pedidos.map((p) => `- ${p.texto}`).join('\n')}\n\nSe aplicó y se restauró porque:\n- ${fallos.join('\n- ')}`, e.id);
    return avisar(e.id, 'Ya tengo tus cambios 🙌 Quiero que queden perfectos, así que alguien de nuestro equipo los está revisando; te aviso aquí en cuanto queden.', { evento: 'cambios_sitio', datos: { cambio_id: c.id } });
  }

  await actualizarContacto(e, plan.contacto);
  await guardar(c.id, { estado: 'aplicado', resultado: { avisos, log: ap.log, pendientes } });
  if (pendientes.length) await avisarEquipo('Cambios pendientes de página', `${e.brief?.negocio?.nombre || e.id} · ${s.url_publica}\nSe aplicó: ${plan.resumen_cliente}\nFalta (equipo): ${pendientes.join('; ')}`, e.id);
  const extra = pendientes.length ? `\nLo de ${pendientes.join(', ')} lo hace alguien de nuestro equipo; te aviso aquí cuando quede.` : '';
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
        await guardar(c.id, { estado: 'fallo', resultado: { error: String(err.message || err).slice(0, 800) } }).catch(() => {});
        await avisarEquipo('Error al aplicar cambios de página', `Cambio ${c.id} (entrevista ${c.entrevista_id}): ${err.message}\nPedido:\n${c.pedidos.map((p) => `- ${p.texto}`).join('\n')}`, c.entrevista_id).catch(() => {});
        await avisar(c.entrevista_id, 'Ya tengo tus cambios 🙌 Alguien de nuestro equipo los está aplicando; te aviso aquí en cuanto queden.', { evento: 'cambios_sitio' }).catch(() => {});
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
