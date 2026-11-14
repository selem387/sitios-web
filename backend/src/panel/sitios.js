import crypto from 'node:crypto';
// Sitios en vivo (plataforma "app"): la página se arma en cada visita desde la base `web_builder`
// con la propuesta que eligió el cliente (misma composición, tipografía y paleta) y el contenido que él edita en su panel.
// El HTML se guarda en memoria por versión: editar sube la versión y la siguiente visita ya ve el cambio.
import * as db from '../entrevista/db.js';
import { mergeProfundo } from '../entrevista/agente.js';
import { procesarMateriales } from '../generador/materiales.js';
import { renderPropuestas } from '../generador/propuestas_html.js';
import { giroCorto } from '../generador/propuestas_general.js';
import { parPorNombres } from '../generador/fuentes.js';
import { REDES, normalizarRedes } from '../entrevista/redes.js';
import { config } from '../config.js';

const q = db.q;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const SCHEMA_PANEL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
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
-- Enlace mágico permanente al panel (Ari lo manda por el chat; solo el dueño lo tiene).
ALTER TABLE sitios_vivos ADD COLUMN IF NOT EXISTS llave text UNIQUE;
ALTER TABLE sitios_vivos ADD COLUMN IF NOT EXISTS url_publica text;
ALTER TABLE sitios_vivos ADD COLUMN IF NOT EXISTS medicion jsonb;
UPDATE sitios_vivos SET llave = replace(replace(encode(gen_random_bytes(24),'base64'),'/','_'),'+','-') WHERE llave IS NULL;
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
export const SECCIONES = ['portada', 'oferta', 'menu', 'promocion', 'contacto', 'redes', 'faq', 'testimonios', 'historia', 'titulos', 'pies'];
// Títulos de sección que el cliente puede cambiar (por id de la sección en la página).
export const TITULOS_SECCION = ['trabajo', 'servicios', 'sobre', 'resenas', 'faq', 'contacto', 'galeria'];
/** URL de una imagen sin parámetros (?w=…), para ubicarla aunque cambie el tamaño servido. */
export const urlBase = (u) => String(u || '').trim().split(/[?#]/)[0];

const txt = (v, max = 400) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, max));
const largo = (v, max = 2000) => (v === null || v === undefined ? '' : String(v).replace(/\r/g, '').trim().slice(0, max));
const lista = (v, max = 60) => (Array.isArray(v) ? v.slice(0, max) : []);

/** Valida y limpia lo que manda el panel para una sección. Lanza Error con mensaje para el usuario. */
export function limpiarSeccion(seccion, d = {}) {
  switch (seccion) {
    case 'portada': return { titular: txt(d.titular, 160), subtitulo: largo(d.subtitulo, 600), cta: txt(d.cta, 30) };
    case 'oferta': return {
      mostrar_precios: d.mostrar_precios !== false,
      // La descripción conserva renglones y viñetas tal cual (el cliente las escribe así); grupo = categoría opcional.
      items: lista(d.items).map((x) => ({ grupo: txt(x.grupo, 90), nombre: txt(x.nombre, 120), descripcion_corta: largo(x.descripcion_corta, 1500), precio_o_rango: txt(x.precio_o_rango, 60), destacado: !!x.destacado })).filter((x) => x.nombre),
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
    case 'titulos': {
      const o = {};
      for (const [k, v] of Object.entries(d || {})) {
        if (!TITULOS_SECCION.includes(k)) throw new Error(`No hay título "${k}" (válidos: ${TITULOS_SECCION.join(', ')})`);
        const t = txt(v, 80);
        if (t) o[k] = t;
      }
      return o;
    }
    case 'pies': return { items: lista(d.items, 40).map((x) => ({ imagen: urlBase(x.imagen), texto: largo(x.texto, 400) })).filter((x) => /^https?:\/\//.test(x.imagen) && x.texto) };
    default: throw new Error('Sección desconocida');
  }
}

const direccionTexto = (d) => (d && typeof d === 'object' ? [d.calle, d.colonia, d.ciudad, d.estado].filter(Boolean).join(', ') : d || '');

/** Lo que el panel muestra en cada sección: lo editado, o lo que salió de la entrevista si aún no se toca. */
export function contenidoActual(entrevista, sv, mat = null) {
  const b = entrevista.brief || {};
  const k = sv.contenido || {};
  const prop = b.marca?.propuestas || {};
  const i = Math.max(0, 'ABCDEFGHIJKLMNOP'.indexOf(prop.elegido || 'A'));
  const v = prop.textos?.variantes?.[i] || prop.textos?.variantes?.[0] || {};
  const c = b.contacto || {};
  return {
    portada: k.portada || { titular: v.titular || '', subtitulo: v.subtitulo || '', cta: v.cta || '' },
    oferta: k.oferta || { mostrar_precios: b.oferta?.mostrar_precios !== false, items: (b.oferta?.items || []).map((x) => ({ grupo: x.grupo || '', nombre: x.nombre || '', descripcion_corta: x.descripcion_corta || x.descripcion || '', precio_o_rango: x.precio_o_rango || x.precio || '', destacado: !!x.destacado })) },
    menu: k.menu || { secciones: (mat?.menu_texto || []).map((s) => ({ seccion: s.seccion || '', items: (s.items || []).map((x) => ({ nombre: x.nombre || '', precio: x.precio || '', descripcion: x.descripcion || '' })) })) },
    promocion: k.promocion || { texto: b.oferta?.promocion_actual || '' },
    contacto: k.contacto || { whatsapp: c.whatsapp || '', telefono: c.telefono || '', email: c.email || '', direccion: direccionTexto(c.direccion), google_maps_url: c.google_maps_url || '', horarios: typeof c.horarios === 'string' ? c.horarios : '', mensaje_whatsapp_inicial: c.mensaje_whatsapp_inicial || '' },
    redes: k.redes || normalizarRedes(c.redes || {}),
    faq: k.faq || { items: (b.faq || []).map((x) => ({ pregunta: x.pregunta || '', respuesta: x.respuesta || '' })) },
    testimonios: k.testimonios || { items: (b.confianza?.testimonios || []).map((x) => ({ nombre: x.nombre || '', texto: x.texto || '', fuente: x.fuente || '' })) },
    historia: k.historia || { texto: prop.textos?.sobre || b.confianza?.historia_corta || '' },
    titulos: k.titulos || {},
    pies: k.pies || { items: [] },
    es_menu: b.negocio?.arquetipo === 'restaurante',
    es_inmobiliaria: b.negocio?.arquetipo === 'inmobiliaria',
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
  const i = Math.max(0, 'ABCDEFGHIJKLMNOP'.indexOf(prop.elegido || 'A'));
  const variantes = [...(prop.textos?.variantes || [])];
  if (k.portada) variantes[i] = { ...(variantes[i] || {}), ...Object.fromEntries(Object.entries(k.portada).filter(([, x]) => x)) };
  const textos = { ...(prop.textos || {}), variantes, ...(k.historia ? { sobre: k.historia.texto } : {}), ...(k.titulos && Object.keys(k.titulos).length ? { secciones: { ...(prop.textos?.secciones || {}), ...k.titulos } } : {}) };
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
  const giro = giroCorto(n.giro_texto);
  const titulo = [n.nombre, giro && n.ciudad ? `${giro} en ${n.ciudad}` : giro].filter(Boolean).join(' · ');
  return html
    .replace('<meta name="robots" content="noindex">', dominio ? `<link rel="canonical" href="https://${esc(dominio)}/">` : '<meta name="robots" content="noindex">')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo || n.nombre || '')}</title>`)
    .replace(/<span class="etq">[^<]*<\/span>/, '')
    .replace(new RegExp(` · Propuesta ${letra}: [^<]*</footer>`), '</footer>');
}

const cache = new Map(); // `${id}:${version}` → html
/** Dirección pública del sitio con / final: su dominio, nuestra dirección si pagó sin dominio, o la vista previa. */
export function urlPublica(sv, { previa = false } = {}) {
  if (!previa && sv.dominio) return `https://${sv.dominio}/`;
  if (!previa && sv.url_publica) return `${sv.url_publica.replace(/\/$/, '')}/`;
  return `${config.publicUrl}/s/${sv.slug}/`;
}

/** Prefijo de rutas internas: '' en su dominio propio; /s/<slug> en vista previa o publicado en nuestra dirección. */
export const rutaBase = (sv, { previa = false } = {}) => (!previa && sv.dominio ? '' : `/s/${sv.slug}`);

export function invalidar(id) { for (const k of cache.keys()) if (k.startsWith(`${id}:`)) cache.delete(k); }

/** HTML del sitio en vivo. */
export async function renderSitio(sv, { previa = false } = {}) {
  const clave = `${sv.id}:${sv.version}:${previa ? 'p' : 's'}`;
  if (cache.has(clave)) return cache.get(clave);
  const e0 = await db.obtener(sv.entrevista_id);
  if (!e0) throw new Error('entrevista no encontrada');
  const dz = sv.contenido?.diseno || {};
  // Otra de sus 6 propuestas, si la pidió después por chat.
  const prop0 = e0.brief?.marca?.propuestas;
  const e = dz.propuesta && prop0?.opciones?.some((o) => (o.etiqueta || o.letra) === dz.propuesta)
    ? { ...e0, brief: { ...e0.brief, marca: { ...e0.brief.marca, propuestas: { ...prop0, elegido: dz.propuesta, colores_de: dz.colores_de ?? null } } } }
    : e0;
  const fijo0 = disenoElegido(e.brief);
  if (!fijo0) throw new Error('el cliente aún no elige propuesta');
  // Colores y letra que el cliente cambió después (cambios automáticos): se enciman a los de su propuesta.
  const fijo = { ...fijo0, ...(dz.paleta ? { paleta: { ...fijo0.paleta, ...dz.paleta } } : {}), ...(dz.fuentes?.titulos && dz.fuentes?.cuerpo ? { fuentes: parPorNombres({ titulos: dz.fuentes.titulos, cuerpo: dz.fuentes.cuerpo, estilo: fijo0.fuentes?.estilo }) } : {}) };
  const { brief, textos } = aplicarContenido(e, sv);
  const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
  if (sv.contenido?.menu?.secciones) mat.menu_texto = sv.contenido.menu.secciones;
  const r = await renderPropuestas(brief, mat, textos, { ronda: fijo.ronda, fijo });
  const pg = r.paginas[0];
  if (!pg) throw new Error('no se pudo armar la página');
  if (r.faltan?.length) console.warn('[sitio vivo]', sv.id, 'material sin mostrar:', r.faltan.map((f) => f.clave).join(','));
  let html = comoSitio(pg.html, brief, { letra: fijo.letra, dominio: previa ? null : (sv.dominio || (sv.url_publica ? sv.url_publica.replace(/^https?:\/\//, '').replace(/\/$/, '') : null)) });
  { // Descripción, tarjeta al compartir, favicon, color y JSON-LD del negocio (también en la vista previa, que sigue noindex).
    const { conSeo } = await import('./seo.js');
    const { jsonLd } = await import('../generador/index.js');
    html = conSeo(html, { brief, mat, url: urlPublica(sv, { previa }), color: fijo.paleta?.primary || fijo.paleta?.p, jsonLd });
  }
  if (brief.negocio?.arquetipo === 'inmobiliaria') {
    const { listar, conPropiedades } = await import('./propiedades.js');
    html = conPropiedades(html, await listar(sv.id, { publicas: true }), { base: rutaBase(sv, { previa }) });
  }
  // Estructura y ajustes de diseño propios de este sitio (los escribe el editor de cambios a pedido del cliente).
  { const { conLigaAviso } = await import('./aviso.js'); html = conLigaAviso(html, `${rutaBase(sv, { previa })}/aviso-de-privacidad`); }
  if (!previa && sv.medicion) { const { conMedicion } = await import('./medicion.js'); html = conMedicion(html, sv.medicion); }
  if (dz.estructura) { const { aplicarEstructura } = await import('./estructura.js'); html = aplicarEstructura(html, dz.estructura); }
  if (sv.contenido?.pies?.items?.length) html = conPies(html, sv.contenido.pies.items);
  { const { conMenuMovil, conContacto } = await import('../generador/movil.js'); html = conContacto(conMenuMovil(html), brief); } // menú en celular, teléfono y cómo llegar
  { const { conImagenesOptimizadas } = await import('../imagenes.js'); html = await conImagenesOptimizadas(html); } // srcset WebP + tamaño real en todas las fotos
  const css = dz.css;
  if (css) html = html.replace('</head>', () => `<style id="ajustes">${String(css).replace(/<\/style/gi, '')}</style></head>`);
  for (const k of cache.keys()) if (k.startsWith(`${sv.id}:`) && !k.startsWith(`${sv.id}:${sv.version}:`)) cache.delete(k);
  cache.set(clave, html);
  // Secciones que aparecen después de los ajustes de diseño del cliente: la IA las ajusta sola (11-nov-2026).
  import('./cambios_vivo.js').then((m) => m.revisarSeccionesNuevas(sv, html)).catch(() => {});
  return html;
}

/** Texto debajo de una imagen: <figcaption> en la figura que la contiene (o figura nueva si la imagen va suelta). */
export function conPies(html, items) {
  let out = html;
  for (const { imagen, texto } of items || []) {
    const u = urlBase(imagen);
    if (!u || !texto) continue;
    const re = new RegExp(`(<figure\\b[^>]*>)((?:(?!</figure>)[\\s\\S])*?<img\\b[^>]*\\ssrc="${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?[^"]*)?"[^>]*>(?:(?!</figure>)[\\s\\S])*?)(</figure>)`);
    const cap = `<figcaption class="pie">${esc(texto).replace(/\n/g, '<br>')}</figcaption>`;
    if (re.test(out)) out = out.replace(re, (m, a, b, c) => `${a}${b.replace(/<figcaption class="pie">[\s\S]*?<\/figcaption>/, '')}${cap}${c}`);
  }
  if (out !== html && !out.includes('id="pies-css"')) out = out.replace('</head>', '<style id="pies-css">figcaption.pie{margin-top:.6rem;font-size:.95rem;line-height:1.45;color:var(--fg);text-align:center}</style></head>');
  return out;
}

/* ---------------- Alta ---------------- */
/** Enlace mágico permanente al panel: en su dominio si ya lo tiene, si no en el host de la API. */
export const enlacePanel = (sv) => (sv.dominio ? `https://${sv.dominio}/admin/llave/${sv.llave}` : `${config.publicUrl}/s/${sv.slug}/admin/llave/${sv.llave}`);
const slugify = (s) => String(s || 'sitio').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sitio';

export async function crearSitioVivo(entrevista, { dominio = null, slug = null } = {}) {
  await migrarPanel();
  const ya = await porEntrevista(entrevista.id);
  if (ya) return ya;
  const b = entrevista.brief || {};
  if (!disenoElegido(b)) throw Object.assign(new Error('El cliente aún no elige una propuesta'), { status: 409 });
  const email = String(b.administracion?.email || b.contacto?.email || '').trim().toLowerCase();
  // El acceso al panel va por enlace mágico en el chat (decidido 5-nov-2026); el correo ya no es obligatorio.
  if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw Object.assign(new Error('El correo del administrador no es válido'), { status: 409 });
  let s = slugify(slug || b.negocio?.nombre || entrevista.id.slice(0, 8));
  for (let n = 2; await porSlug(s); n++) s = `${slugify(slug || b.negocio?.nombre)}-${n}`;
  const llave = crypto.randomBytes(24).toString('base64url');
  const r = await q(`INSERT INTO sitios_vivos (entrevista_id, slug, dominio, admin_email, llave) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [entrevista.id, s, dominio, email, llave]);
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
