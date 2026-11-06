// Publicación en redes sociales vía publicador.timewins.ai (API REST /v1, clave Bearer).
// Cada sitio en vivo es una marca del publicador; el dueño conecta su Facebook e Instagram con la liga OAuth
// y "Publicar en redes" crea una publicación por cuenta con la idea armada de la ficha y sus fotos.
// El clic del dueño es la aprobación: sus cuentas quedan en modo de aprobación "directa".
import * as db from '../entrevista/db.js';
import { config } from '../config.js';
import { OPERACIONES, TIPOS, precioTexto, lugarTexto, datosClave } from './propiedades.js';

const q = db.q;
export const publicadorActivo = () => Boolean(config.publicadorUrl && config.publicadorClave);

async function llamar(metodo, ruta, cuerpo) {
  if (!publicadorActivo()) throw Object.assign(new Error('La publicación en redes no está configurada todavía.'), { status: 503 });
  const r = await fetch(`${config.publicadorUrl}${ruta}`, {
    method: metodo,
    headers: { authorization: `Bearer ${config.publicadorClave}`, ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `publicador ${r.status}`), { status: r.status >= 500 ? 502 : r.status });
  return j;
}

/** Marca del sitio en el publicador (se crea la primera vez con nombre, sitio, colores y logo). */
export async function asegurarMarca(sv, e, { logo = null, colores = [] } = {}) {
  if (sv.publicador?.marca_id) return sv.publicador.marca_id;
  const b = e.brief || {};
  const sitio = sv.dominio ? `https://${sv.dominio}/` : `${config.publicUrl}/s/${sv.slug}`;
  const m = await llamar('POST', '/v1/marcas', {
    nombre: (b.negocio?.nombre || sv.slug).slice(0, 120),
    descripcion: (b.negocio?.giro_texto || '').slice(0, 2000) || undefined,
    sitio,
    publico: (b.cliente_ideal?.descripcion || '').slice(0, 1000) || undefined,
    tono: b.marca?.tono_textos === 'usted' ? 'Profesional, de usted' : 'Cercano y profesional, de tú',
    colores: colores.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8),
    ...(logo && /^https:\/\//.test(logo) ? { logo_url: logo } : {}),
    ctas: ['Escríbenos por WhatsApp', 'Agenda una visita'],
  });
  await q(`UPDATE sitios_vivos SET publicador = publicador || $2::jsonb WHERE id=$1`, [sv.id, JSON.stringify({ marca_id: m.id })]);
  sv.publicador = { ...(sv.publicador || {}), marca_id: m.id };
  return m.id;
}

/** Liga OAuth para que el dueño conecte Facebook e Instagram (un solo paso). */
export async function ligaConexion(sv, e, extra) {
  const marca_id = await asegurarMarca(sv, e, extra);
  return (await llamar('POST', '/v1/conexiones/meta/iniciar', { marca_id })).url;
}

/** Cuentas conectadas de esta marca. */
export async function cuentas(sv) {
  if (!publicadorActivo() || !sv.publicador?.marca_id) return [];
  const todas = await llamar('GET', '/v1/conexiones');
  return (Array.isArray(todas) ? todas : []).filter((c) => c.marca_id === sv.publicador.marca_id)
    .map((c) => ({ id: c.id, red: c.red, nombre: c.nombre, usuario: c.usuario, estado: c.estado, modo: c.modo_aprobacion }));
}

/** Idea para la IA del publicador, armada solo con datos de la ficha (no inventa nada). */
export function ideaDePropiedad(p, url) {
  const d = p.datos;
  return [
    `Anuncio de ${OPERACIONES[d.operacion].toLowerCase()} de ${TIPOS[d.tipo].toLowerCase()}: "${d.titulo}".`,
    `Precio: ${precioTexto(d)}${d.negociable ? ' (negociable)' : ''}.`,
    lugarTexto(d) ? `Ubicación: ${lugarTexto(d)}.` : '',
    datosClave(d).length ? `Datos: ${datosClave(d).join(', ')}.` : '',
    d.amenidades?.length ? `Amenidades: ${d.amenidades.slice(0, 10).join(', ')}.` : '',
    d.descripcion ? `Descripción del anunciante: ${d.descripcion.slice(0, 1500)}` : '',
    `Invita a pedir informes o agendar una visita. Ficha completa: ${url}`,
    'Usa solo estos datos; no inventes medidas, precios ni amenidades.',
  ].filter(Boolean).join('\n');
}

/** Publica la propiedad en las cuentas indicadas (o en todas las activas de la marca). */
export async function publicarPropiedad(sv, e, p, { conexion_ids = null, url }) {
  const activas = (await cuentas(sv)).filter((c) => c.estado === 'activa');
  const ids = (conexion_ids?.length ? activas.filter((c) => conexion_ids.includes(c.id)) : activas).map((c) => c.id);
  if (!ids.length) throw Object.assign(new Error('Primero conecta tu Facebook o Instagram.'), { status: 409 });
  const fotos = (p.imagenes || []).filter((u) => /^https:\/\//.test(u)).slice(0, 10);
  if (!fotos.length) throw Object.assign(new Error('Agrega al menos una foto de la propiedad para publicarla.'), { status: 409 });
  // El clic del dueño es la aprobación: sus cuentas publican directo.
  for (const c of activas.filter((x) => ids.includes(x.id) && x.modo !== 'directa')) await llamar('PATCH', `/v1/conexiones/${c.id}`, { modo_aprobacion: 'directa' });
  const pubs = await llamar('POST', '/v1/publicaciones', {
    conexion_ids: ids, marca_id: sv.publicador.marca_id, idea: ideaDePropiedad(p, url),
    medios: fotos.map((u) => ({ url: u, tipo: 'imagen' })),
    solicitud_id: `sitio${sv.id}-prop${p.id}-${Date.now()}`, metadata: { sitio_vivo_id: sv.id, propiedad_id: p.id, entrevista_id: e.id },
  });
  return (Array.isArray(pubs) ? pubs : []).map((x) => ({ id: x.id, red: x.red, cuenta: x.cuenta, estado: x.estado, permalink: x.permalink, error: x.error }));
}

/** Estado actual de publicaciones ya creadas. */
export async function estadoPublicaciones(ids) {
  const out = [];
  for (const id of ids.slice(0, 20)) {
    try { const x = await llamar('GET', `/v1/publicaciones/${id}`); out.push({ id: x.id, red: x.red, cuenta: x.cuenta, estado: x.estado, permalink: x.permalink, error: x.error, publicada: x.publicada }); }
    catch { out.push({ id, estado: 'desconocido' }); }
  }
  return out;
}
