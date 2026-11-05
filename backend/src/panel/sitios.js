// Sitios en vivo (plataforma "app"): la página se arma en cada visita desde la base `web_builder`
// con la propuesta que eligió el cliente (misma composición, tipografía y paleta) y el contenido que él edita en su panel.
// El HTML se guarda en memoria por versión: editar sube la versión y la siguiente visita ya ve el cambio.
import * as db from '../entrevista/db.js';
import { mergeProfundo } from '../entrevista/agente.js';
import { procesarMateriales } from '../generador/materiales.js';
import { renderPropuestas } from '../generador/propuestas_html.js';
import { parPorNombres } from '../generador/fuentes.js';
import { REDES, normalizarRedes } from '../entrevista/redes.js';

const q = db.q;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const SCHEMA_PANEL = `
CREATE TABLE IF NOT EXISTS sitios_vivos (
  id             serial PRIMARY KEY,
  entrevista_id  uuid NOT NULL UNIQUE REFERENCES entrevistas(id),
  slug           text UNIQUE NOT NULL,
  dominio        text UNIQUE,
  admin_email    text NOT NULL,
  contenido      jsonb NOT NULL DEFAULT '{}',
  version        int NOT NULL DEFAULT 1,
  estado         text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','pausado')),
  acceso_entregado timestamptz,
  creado         timestamptz NOT NULL DEFAULT now(),
  actualizado    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS codigos_panel (
  id           serial PRIMARY KEY,
  sitio_id     int NOT NULL REFERENCES sitios_vivos(id) ON DELETE CASCADE,
  email        text NOT NULL,
  codigo_hash  text NOT NULL,
  intentos     int NOT NULL DEFAULT 0,
  usado        timestamptz,
  expira       timestamptz NOT NULL,
  creado       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS codigos_panel_sitio_idx ON codigos_panel (sitio_id, id DESC);
CREATE TABLE IF NOT EXISTS panel_tokens_usados (jti text PRIMARY KEY, expira timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS panel_cambios (
  id         serial PRIMARY KEY,
  sitio_id   int NOT NULL REFERENCES sitios_vivos(id) ON DELETE CASCADE,
  seccion    text NOT NULL,
  antes      jsonb,
  despues    jsonb,
  creado     timestamptz NOT NULL DEFAULT now()
);
`;

let migrado = false;
export async function migrarPanel() {
  if (migrado) return;
  await q(SCHEMA_PANEL);
  migrado = true;
}

export const porId = async (id) => (await q(`SELECT * FROM sitios_vivos WHERE id=$1`, [Number(id)])).rows[0] || null;
export const porSlug = async (slug) => (await q(`SELECT * FROM sitios_vivos WHERE slug=$1`, [String(slug)])).rows[0] || null;
export const porEntrevista = async (id) => (await q(`SELECT * FROM sitios_vivos WHERE entrevista_id=$1`, [id])).rows[0] || null;

/* ---------------- Contenido editable ---------------- */
// Secciones que el dueño administra. Cada una se guarda completa en sitios_vivos.contenido.<seccion>.
export const SECCIONES = ['portada', 'oferta', 'menu', 'promocion', 'contacto', 'redes', 'faq', 'testimonios', 'historia'];

const txt = (v, max = 400) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, max));
const largo = (v, max = 2000) => (v === null || v === undefined ? '' : String(v).replace(/\r/g, '').trim().slice(0, max));
const lista = (v, max = 60) => (Array.isArray(v) ? v.slice(0, max) : []);

/** Valida y limpia lo que manda el panel para una sección. Lanza Error con mensaje para el usuario. */
export function limpiarSeccion(seccion, d = {}) {
  switch (seccion) {
    case 'portada': return { titular: txt(d.titular, 90), subtitulo: txt(d.subtitulo, 200), cta: txt(d.cta, 30) };
    case 'oferta': return {
      mostrar_precios: d.mostrar_precios !== false,
      items: lista(d.items).map((x) => ({ nombre: txt(x.nombre, 90), descripcion_corta: txt(x.descripcion_corta, 220), precio_o_rango: txt(x.precio_o_rango, 60), destacado: !!x.destacado })).filter((x) => x.nombre),
    };
    case 'menu': return {
      secciones: lista(d.secciones, 30).map((s) => ({ seccion: txt(s.seccion, 60), items: lista(s.items, 80).map((i) => ({ nombre: txt(i.nombre, 90), precio: txt(i.precio, 40), descripcion: txt(i.descripcion, 200) })).filter((i) => i.nombre) })).filter((s) => s.seccion && s.items.length),
    };
    case 'promocion': return { texto: txt(d.texto, 200) };
    case 'contacto': {
      const tel = (v) => String(v || '').replace(/[^\d+]/g, '').slice(0, 16);
      const email = txt(d.email, 120).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw new Error('El correo no es válido');
      const maps = txt(d.google_maps_url, 500);
      if (maps && !/^https:\/\//i.test(maps)) throw new Error('La liga de Google Maps debe empezar con https://');
      return { whatsapp: tel(d.whatsapp), telefono: tel(d.telefono), email, direccion: txt(d.direccion, 240), google_maps_url: maps, horarios: largo(d.horarios, 300), mensaje_whatsapp_inicial: txt(d.mensaje_whatsapp_inicial, 200) };
    }
    case 'redes': return normalizarRedes(Object.fromEntries(REDES.map((r) => [r, txt(d[r], 200)])));
    case 'faq': return { items: lista(d.items, 30).map((x) => ({ pregunta: txt(x.pregunta, 200), respuesta: largo(x.respuesta, 800) })).filter((x) => x.pregunta && x.respuesta) };
    case 'testimonios': return { items: lista(d.items, 30).map((x) => ({ nombre: txt(x.nombre, 80), texto: largo(x.texto, 600), fuente: txt(x.fuente, 60) })).filter((x) => x.texto) };
    case 'historia': return { texto: largo(d.texto, 1200) };
    default: throw new Error('Sección desconocida');
  }
}

const direccionTexto = (d) => (d && typeof d === 'object' ? [d.calle, d.colonia, d.ciudad, d.estado].filter(Boolean).join(', ') : d || '');

/** Lo que el panel muestra en cada sección: lo editado, o lo que salió de la entrevista si aún no se toca. */
export function contenidoActual(entrevista, sv, mat = null) {
  const b = entrevista.brief || {};
  const k = sv.contenido || {};
  const prop = b.marca?.propuestas || {};
  const i = Math.max(0, 'ABCDEF'.indexOf(prop.elegido || 'A'));
  const v = prop.textos?.variantes?.[i] || prop.textos?.variantes?.[0] || {};
  const c = b.contacto || {};
  return {
    portada: k.portada || { titular: v.titular || '', subtitulo: v.subtitulo || '', cta: v.cta || '' },
    oferta: k.oferta || { mostrar_precios: b.oferta?.mostrar_precios !== false, items: (b.oferta?.items || []).map((x) => ({ nombre: x.nombre || '', descripcion_corta: x.descripcion_corta || x.descripcion || '', precio_o_rango: x.precio_o_rango || x.precio || '', destacado: !!x.destacado })) },
    menu: k.menu || { secciones: (mat?.menu_texto || []).map((s) => ({ seccion: s.seccion || '', items: (s.items || []).map((x) => ({ nombre: x.nombre || '', precio: x.precio || '', descripcion: x.descripcion || '' })) })) },
    promocion: k.promocion || { texto: b.oferta?.promocion_actual || '' },
    contacto: k.contacto || { whatsapp: c.whatsapp || '', telefono: c.telefono || '', email: c.email || '', direccion: direccionTexto(c.direccion), google_maps_url: c.google_maps_url || '', horarios: typeof c.horarios === 'string' ? c.horarios : '', mensaje_whatsapp_inicial: c.mensaje_whatsapp_inicial || '' },
    redes: k.redes || normalizarRedes(c.redes || {}),
    faq: k.faq || { items: (b.faq || []).map((x) => ({ pregunta: x.pregunta || '', respuesta: x.respuesta || '' })) },
    testimonios: k.testimonios || { items: (b.confianza?.testimonios || []).map((x) => ({ nombre: x.nombre || '', texto: x.texto || '', fuente: x.fuente || '' })) },
    historia: k.historia || { texto: prop.textos?.sobre || b.confianza?.historia_corta || '' },
    es_menu: b.negocio?.arquetipo === 'restaurante',
  };
}

/** Brief + textos que usa el render, con lo editado encima del brief de la entrevista. */
export function aplicarContenido(entrevista, sv) {
  const b = entrevista.brief || {};
  const k = sv.contenido || {};
  const parche = {};
  if (k.oferta) parche.oferta = { items: k.oferta.items, mostrar_precios: k.oferta.mostrar_precios };
  if (k.promocion) parche.oferta = { ...(parche.oferta || {}), promocion_actual: k.promocion.texto || null };
  if (k.contacto) parche.contacto = { ...k.contacto, direccion: k.contacto.direccion || null, email: k.contacto.email || null };
  if (k.redes) parche.contacto = { ...(parche.contacto || {}), redes: k.redes };
  if (k.faq) parche.faq = k.faq.items;
  if (k.testimonios) parche.confianza = { testimonios: k.testimonios.items };
  if (k.historia) parche.confianza = { ...(parche.confianza || {}), historia_corta: k.historia.texto || null };
  if (k.fotos?.portada_asset_id) parche.fotos = { vertical_hero_asset_id: k.fotos.portada_asset_id, portada_manual: true };
  // mergeProfundo reemplaza los arreglos completos (items, faq, testimonios), que es lo que el panel manda.
  const brief = mergeProfundo(b, parche);
  const prop = b.marca?.propuestas || {};
  const i = Math.max(0, 'ABCDEF'.indexOf(prop.elegido || 'A'));
  const variantes = [...(prop.textos?.variantes || [])];
  if (k.portada) variantes[i] = { ...(variantes[i] || {}), ...Object.fromEntries(Object.entries(k.portada).filter(([, x]) => x)) };
  const textos = { ...(prop.textos || {}), variantes, ...(k.historia ? { sobre: k.historia.texto } : {}) };
  return { brief, textos };
}

/** Diseño congelado de la propuesta elegida: letra, tipografía y paleta (o la paleta de la opción que pidió mezclar). */
export function disenoElegido(brief) {
  const prop = brief?.marca?.propuestas;
  if (!prop?.elegido) return null;
  const op = (prop.opciones || []).find((o) => (o.etiqueta || o.letra) === prop.elegido);
  if (!op) return null;
  const deColores = prop.colores_de ? (prop.opciones || []).find((o) => (o.etiqueta || o.letra) === prop.colores_de) : null;
  return {
    letra: op.letra || op.etiqueta,
    fuentes: parPorNombres({ ...(op.tipografia || {}), estilo: op.estilo }),
    paleta: (deColores || op).paleta,
    ronda: prop.ronda || 0,
  };
}

// Convierte la propuesta en sitio: indexable, sin etiqueta "Propuesta X" y con título real.
export function comoSitio(html, brief, { letra, dominio } = {}) {
  const n = brief.negocio || {};
  const titulo = [n.nombre, n.giro_texto && n.ciudad ? `${n.giro_texto} en ${n.ciudad}` : n.giro_texto].filter(Boolean).join(' · ');
  return html
    .replace('<meta name="robots" content="noindex">', dominio ? `<link rel="canonical" href="https://${esc(dominio)}/">` : '<meta name="robots" content="noindex">')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo || n.nombre || '')}</title>`)
    .replace(/<span class="etq">[^<]*<\/span>/, '')
    .replace(new RegExp(` · Propuesta ${letra}: [^<]*</footer>`), '</footer>');
}

const cache = new Map(); // `${id}:${version}` → html
export function invalidar(id) { for (const k of cache.keys()) if (k.startsWith(`${id}:`)) cache.delete(k); }

/** HTML del sitio en vivo. */
export async function renderSitio(sv, { previa = false } = {}) {
  const clave = `${sv.id}:${sv.version}:${previa ? 'p' : 's'}`;
  if (cache.has(clave)) return cache.get(clave);
  const e = await db.obtener(sv.entrevista_id);
  if (!e) throw new Error('entrevista no encontrada');
  const fijo = disenoElegido(e.brief);
  if (!fijo) throw new Error('el cliente aún no elige propuesta');
  const { brief, textos } = aplicarContenido(e, sv);
  const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
  if (sv.contenido?.menu?.secciones) mat.menu_texto = sv.contenido.menu.secciones;
  const r = await renderPropuestas(brief, mat, textos, { ronda: fijo.ronda, fijo });
  const pg = r.paginas[0];
  if (!pg) throw new Error('no se pudo armar la página');
  if (r.faltan?.length) console.warn('[sitio vivo]', sv.id, 'material sin mostrar:', r.faltan.map((f) => f.clave).join(','));
  const html = comoSitio(pg.html, brief, { letra: fijo.letra, dominio: previa ? null : sv.dominio });
  for (const k of cache.keys()) if (k.startsWith(`${sv.id}:`) && !k.startsWith(`${sv.id}:${sv.version}:`)) cache.delete(k);
  cache.set(clave, html);
  return html;
}

/* ---------------- Alta ---------------- */
const slugify = (s) => String(s || 'sitio').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sitio';

export async function crearSitioVivo(entrevista, { dominio = null, slug = null } = {}) {
  await migrarPanel();
  const ya = await porEntrevista(entrevista.id);
  if (ya) return ya;
  const b = entrevista.brief || {};
  if (!disenoElegido(b)) throw Object.assign(new Error('El cliente aún no elige una propuesta'), { status: 409 });
  const email = String(b.administracion?.email || b.contacto?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw Object.assign(new Error('El brief no tiene correo del administrador (contacto.email)'), { status: 409 });
  let s = slugify(slug || b.negocio?.nombre || entrevista.id.slice(0, 8));
  for (let n = 2; await porSlug(s); n++) s = `${slugify(slug || b.negocio?.nombre)}-${n}`;
  const r = await q(`INSERT INTO sitios_vivos (entrevista_id, slug, dominio, admin_email) VALUES ($1,$2,$3,$4) RETURNING *`, [entrevista.id, s, dominio, email]);
  await db.evento(entrevista.id, 'sitio_vivo_creado', { sitio_id: r.rows[0].id, slug: s, dominio });
  return r.rows[0];
}

/** Guarda una sección editada, deja registro y sube la versión. */
export async function guardarSeccion(sv, seccion, datos) {
  const limpio = limpiarSeccion(seccion, datos);
  const antes = sv.contenido?.[seccion] ?? null;
  const r = await q(`UPDATE sitios_vivos SET contenido = contenido || jsonb_build_object($2::text, $3::jsonb), version=version+1, actualizado=now() WHERE id=$1 RETURNING *`,
    [sv.id, seccion, JSON.stringify(limpio)]);
  await q(`INSERT INTO panel_cambios (sitio_id, seccion, antes, despues) VALUES ($1,$2,$3,$4)`, [sv.id, seccion, JSON.stringify(antes), JSON.stringify(limpio)]);
  invalidar(sv.id);
  return r.rows[0];
}

export async function subirVersion(sv, parcheContenido = null) {
  const r = parcheContenido
    ? await q(`UPDATE sitios_vivos SET contenido = contenido || $2::jsonb, version=version+1, actualizado=now() WHERE id=$1 RETURNING *`, [sv.id, JSON.stringify(parcheContenido)])
    : await q(`UPDATE sitios_vivos SET version=version+1, actualizado=now() WHERE id=$1 RETURNING *`, [sv.id]);
  invalidar(sv.id);
  return r.rows[0];
}
