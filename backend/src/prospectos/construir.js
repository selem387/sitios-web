// Construcción automática de las 6 opciones de un prospecto de Google Maps (sin entrevista previa).
// 1) Ficha de Google (fotos, horarios, reseñas) + redes (Instagram/Facebook) ya enriquecidas en la base de prospección.
// 2) Brief con IA SOLO con datos reales (nada inventado). 3) Fotos y logo como assets de una entrevista nueva.
// 4) Mismo generador de propuestas que Ari (procesarMateriales + mostrar). La entrevista queda en B7 con las
//    6 opciones "mostradas": cuando el prospecto elige una (clic en el correo) o Blanca continúa por el chat,
//    Ari sigue desde ahí pidiendo lo que falta.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import * as edb from '../entrevista/db.js';
import { pedirJSON } from '../entrevista/claude.js';
import { procesarMateriales, analizarAsset } from '../generador/materiales.js';
import { mostrar } from '../entrevista/propuestas.js';
import * as pdb from './db.js';

const KEY = () => process.env.GOOGLE_PLACES_KEY || '';
const DIR = path.join(config.dataDir, 'chat');
const TOPE_USD = () => Number(process.env.PROSPECCION_TOPE_USD || 20);
export const usuarioDe = (folio) => `web-prospecto-${folio}`;

async function guardarImagen(url, { headers = {} } = {}) {
  const r = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`imagen ${r.status}`);
  const mime = (r.headers.get('content-type') || '').split(';')[0];
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
  if (!ext) throw new Error(`tipo ${mime}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 8000) throw new Error('imagen muy chica');
  await fs.mkdir(DIR, { recursive: true });
  const nombre = `${crypto.randomBytes(12).toString('base64url').replace(/_/g, '-')}.${ext}`;
  await fs.writeFile(path.join(DIR, nombre), buf);
  return { url: `${config.publicUrl}/chat/archivos/${nombre}`, mime };
}

async function fichaGoogle(placeId) {
  const campos = 'displayName,photos,regularOpeningHours,reviews,editorialSummary,priceLevel,primaryTypeDisplayName,servesBreakfast,servesCoffee,servesVegetarianFood,delivery,takeout,dineIn,outdoorSeating,reservable,addressComponents,formattedAddress';
  const r = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=es`, { headers: { 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': campos } });
  const j = await r.json();
  if (!r.ok) throw new Error(`Places: ${j?.error?.message || r.status}`);
  await pdb.gasto('google_places', 'ficha (details pro)', 0.025);
  return j;
}

async function fotoGoogle(nombre) {
  const r = await fetch(`https://places.googleapis.com/v1/${nombre}/media?maxWidthPx=1600&skipHttpRedirect=true`, { headers: { 'X-Goog-Api-Key': KEY() } });
  const j = await r.json();
  await pdb.gasto('google_places', 'foto', 0.007);
  if (!j.photoUri) throw new Error('sin photoUri');
  return guardarImagen(j.photoUri);
}

const ESTILOS = ['minimalista', 'fresco', 'calido', 'elegante', 'tecnologico', 'tradicional', 'lujo', 'divertido'];
const ESQUEMA = {
  type: 'object',
  properties: {
    giro_texto: { type: 'string' },
    subtipo: { type: 'string', enum: ['restaurante', 'cafeteria_panaderia'] },
    estilo: { type: 'string', enum: ESTILOS },
    personalidad: { type: 'array', items: { type: 'string' } },
    items: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, destacado: { type: 'boolean' }, descripcion_corta: { type: 'string' } }, required: ['nombre'] } },
    diferenciador: { type: 'string' },
    historia_corta: { type: 'string' },
    testimonios: { type: 'array', items: { type: 'object', properties: { texto: { type: 'string' }, nombre: { type: 'string' } }, required: ['texto'] } },
    faq: { type: 'array', items: { type: 'object', properties: { pregunta: { type: 'string' }, respuesta: { type: 'string' } }, required: ['pregunta', 'respuesta'] } },
    servicio: { type: 'string', enum: ['comer_aqui', 'pickup', 'domicilio', 'mixto'] },
  },
  required: ['giro_texto', 'subtipo', 'estilo', 'items'],
};

async function briefConIA(n, g) {
  const ig = n.redes?.instagram && typeof n.redes.instagram === 'object' ? n.redes.instagram : null;
  const fb = n.redes?.facebook && typeof n.redes.facebook === 'object' ? n.redes.facebook : null;
  const datos = {
    nombre: n.nombre, tipo_google: n.tipo, direccion: n.direccion, calificacion: n.rating, resenas: n.resenas, precio: n.precio,
    resumen_google: g.editorialSummary?.text || null,
    atributos: { desayunos: g.servesBreakfast, cafe: g.servesCoffee, vegetariano: g.servesVegetarianFood, domicilio: g.delivery, para_llevar: g.takeout, comer_ahi: g.dineIn, terraza: g.outdoorSeating, reservaciones: g.reservable },
    resenas_google: (g.reviews || []).slice(0, 5).map((x) => ({ autor: x.authorAttribution?.displayName, estrellas: x.rating, texto: x.originalText?.text || x.text?.text })),
    instagram: ig && { bio: ig.bio, categoria: ig.categoria, ultimas_publicaciones: (ig.ultimas || []).length },
    facebook: fb && { intro: fb.intro, categorias: fb.categorias },
  };
  const r = await pedirJSON({
    system: `Armas el brief de la página web de un restaurante o cafetería de Mérida a partir de su ficha pública de Google Maps y sus redes.
REGLA DURA: solo datos que aparecen abajo. Nada inventado (ni años, ni premios, ni platillos, ni precios, ni promociones).
- "items": 4 a 9 productos o categorías que se mencionan en reseñas, resumen o bio (marca 3 o 4 como destacado). Si casi no hay datos, usa las categorías evidentes por el tipo de negocio sin nombres de platillos inventados (p. ej. "Desayunos", "Café").
- "diferenciador": lo que más elogian en las reseñas, en una frase (vacío si no hay).
- "historia_corta": solo si la bio o la intro la cuenta; si no, vacío.
- "testimonios": hasta 3 reseñas reales de 4 o 5 estrellas, recortadas a lo esencial SIN cambiar sus palabras, con el nombre de pila del autor.
- "faq": 2 a 4 preguntas cuya respuesta esté en los datos (horarios no, eso va aparte).
- "estilo" y "personalidad" (3 palabras) según lo que transmite el lugar en reseñas y redes.
Español de México, sin emojis.`,
    contenido: JSON.stringify(datos),
    schema: ESQUEMA, max_tokens: 1800,
  });
  return r.data || {};
}

function horarios(g) {
  const d = g.regularOpeningHours?.weekdayDescriptions;
  return Array.isArray(d) && d.length ? d.join('; ') : null;
}

function direccion(g, n) {
  const c = (t) => g.addressComponents?.find((x) => x.types?.includes(t))?.longText || '';
  return { calle: [c('route'), c('street_number')].filter(Boolean).join(' ') || n.direccion, colonia: c('sublocality_level_1') || c('neighborhood'), ciudad: c('locality') || 'Mérida', estado: c('administrative_area_level_1') || 'Yucatán', cp: c('postal_code') };
}

const soloDigitos = (t) => String(t || '').replace(/\D/g, '').replace(/^52/, '').slice(-10);

/** Construye (o reconstruye) las 6 opciones de un prospecto. Devuelve el negocio actualizado. */
export async function construir(id) {
  await pdb.migrar();
  const n = await pdb.porId(id);
  if (!n) throw new Error('prospecto no existe');
  if (!KEY()) throw new Error('falta GOOGLE_PLACES_KEY');
  if (await pdb.gastoMes() >= TOPE_USD()) throw new Error(`tope mensual de USD ${TOPE_USD()} alcanzado`);
  await pdb.actualizar(id, { estado: 'construyendo', error: null });
  try {
    const g = await fichaGoogle(n.place_id);
    const ia = await briefConIA(n, g).catch((err) => { console.error('[prospectos] brief IA', err.message); return {}; });
    const ig = n.redes?.instagram && typeof n.redes.instagram === 'object' ? n.redes.instagram : null;
    const fb = n.redes?.facebook && typeof n.redes.facebook === 'object' ? n.redes.facebook : null;
    const redes = {};
    if (ig?.usuario) redes.instagram = `https://www.instagram.com/${ig.usuario}/`;
    if (fb?.url) redes.facebook = fb.url;
    const tel = soloDigitos(n.celular || n.telefono);
    const brief = {
      negocio: { nombre: n.nombre, giro_texto: ia.giro_texto || n.tipo, arquetipo: 'restaurante', subtipo: ia.subtipo || (/caf/i.test(n.tipo || '') ? 'cafeteria_panaderia' : 'restaurante'), subtipo_fuente: 'prospeccion', ciudad: 'Mérida', estado: 'Yucatán', modalidad: 'local', tamano: 'equipo_pequeno' },
      oferta: { items: (ia.items || []).slice(0, 9), diferenciador: ia.diferenciador || '', mostrar_precios: false },
      marca: { estilo: ia.estilo || 'calido', personalidad: (ia.personalidad || []).slice(0, 3), tono_textos: 'tu', tiene_logo: Boolean(ig?.foto || fb?.foto) },
      confianza: { historia_corta: ia.historia_corta || '', testimonios: (ia.testimonios || []).slice(0, 3).map((t) => ({ ...t, fuente: 'Google' })), cifras: n.resenas ? [`${n.resenas.toLocaleString('es-MX')} reseñas en Google${n.rating ? ` con ${n.rating} estrellas` : ''}`] : [] },
      faq: (ia.faq || []).slice(0, 4),
      contacto: { whatsapp: tel || null, horarios: horarios(g), direccion: direccion(g, n), redes, email: n.correo || null, mensaje_whatsapp_inicial: `Hola, vi su página y quiero hacer un pedido en ${n.nombre}` },
      modulos: { servicio: ia.servicio || (g.delivery ? 'mixto' : 'comer_aqui'), restaurante: { reservaciones: Boolean(g.reservable), entregas_domicilio: Boolean(g.delivery) } },
      fotos: { acepta_lo_que_hay: true, origen: 'google_maps_y_redes' },
      prospeccion: { folio: n.folio, place_id: n.place_id, maps_url: n.maps_url },
    };
    // Entrevista nueva (o la que ya tenía si se reconstruye).
    let e = n.entrevista_id ? await edb.obtener(n.entrevista_id) : null;
    if (!e) e = (await edb.q(`SELECT * FROM entrevistas WHERE usuario_id=$1 ORDER BY creado DESC LIMIT 1`, [usuarioDe(n.folio)])).rows[0] || null;
    if (e) await pdb.actualizar(id, { entrevista_id: e.id });
    if (!e) {
      e = await edb.crear({ id: crypto.randomUUID(), usuario_id: usuarioDe(n.folio), canal: 'web', metadata: { prospecto: { folio: n.folio, negocio_id: n.id } } });
      // Fotos: hasta 8 de Google (las de mayor tamaño primero) + 6 de Instagram; logo = foto de perfil de Instagram o Facebook.
      const fotos = (g.photos || []).sort((a, b) => (b.widthPx * b.heightPx) - (a.widthPx * a.heightPx)).slice(0, 7);
      let k = 0;
      const logo = ig?.foto || fb?.foto;
      if (logo) {
        const a = await guardarImagen(logo).catch(() => null);
        if (a) await edb.insertarAsset(e.id, { clave: `a${++k}`, tipo: 'logo', url: a.url, mime: a.mime, nota: 'Foto de perfil de sus redes (posible logo)' });
      }
      for (const f of fotos) {
        const a = await fotoGoogle(f.name).catch(() => null);
        if (a) await edb.insertarAsset(e.id, { clave: `a${++k}`, tipo: 'foto_local', url: a.url, mime: a.mime, nota: 'Foto de su ficha de Google Maps' });
      }
      for (const p of (ig?.ultimas || []).slice(0, 4)) {
        const a = await guardarImagen(p.img).catch(() => null);
        if (a) await edb.insertarAsset(e.id, { clave: `a${++k}`, tipo: 'foto_trabajo', url: a.url, mime: a.mime, nota: 'Publicación de su Instagram' });
      }
      if (!k) throw new Error('sin fotos utilizables');
    }
    // Análisis de fotos de 4 en 4 (el de Ari va una por una al subirlas; aquí llegan todas juntas). Queda en caché por asset.
    const pend = (await edb.assetsDe(e.id)).filter((a) => !a.analisis);
    for (let i = 0; i < pend.length; i += 4) await Promise.all(pend.slice(i, i + 4).map((a) => analizarAsset(a, { negocio: n.nombre }).catch((err) => console.error('[prospectos] analisis', a.clave, err.message))));
    const mat = await procesarMateriales(e.id, brief, { aceptarLoQueHay: true });
    const m = await mostrar(e, brief, mat);
    const final = { ...brief, marca: { ...brief.marca, propuestas: m.propuestas } };
    await edb.guardar(e.id, { nombre: n.nombre, bloque_actual: 'B7', brief: final, metadata: { ...(e.metadata || {}), prospecto: { folio: n.folio, negocio_id: n.id } } });
    await edb.insertarMensaje(e.id, { rol: 'agente', contenido: `Le preparamos a ${n.nombre} 6 opciones de página con sus fotos de Google Maps y sus redes:\n\n${m.propuestas.opciones.map((o) => `*${o.letra}* · ${o.nombre}\n${o.url}`).join('\n\n')}`, bloque: 'B7' });
    await edb.evento(e.id, 'prospecto_construido', { folio: n.folio, token: m.propuestas.token });
    const opciones = m.propuestas.opciones.map((o) => ({ letra: o.letra, nombre: o.nombre, url: o.url }));
    await pdb.actualizar(id, { estado: 'construido', entrevista_id: e.id, token: m.propuestas.token, opciones, error: null });
    return pdb.porId(id);
  } catch (err) {
    await pdb.actualizar(id, { estado: 'error', error: String(err.message || err).slice(0, 500) });
    throw err;
  }
}

// Cola en serie: los autorizados se construyen de uno en uno, sin bloquear al servidor.
const cola = [];
let trabajando = false;
export function encolar(ids) {
  for (const id of ids) if (!cola.includes(id)) cola.push(id);
  if (!trabajando) correr();
}
async function correr() {
  trabajando = true;
  while (cola.length) {
    const id = cola.shift();
    try { await construir(id); } catch (err) { console.error('[prospectos] construir', id, err.message); }
  }
  trabajando = false;
}
export const enCola = () => cola.length + (trabajando ? 1 : 0);

// Los despliegues (frecuentes) reinician el proceso y vacían la cola en memoria: al arrancar y cada 5 minutos se
// retoman los autorizados y los que se quedaron "construyendo" (los assets ya analizados quedan en caché).
export function reanudar() {
  const tick = async () => {
    if (trabajando || cola.length) return;
    try {
      await pdb.migrar();
      const ids = (await pdb.q(`SELECT id FROM prospeccion.negocios WHERE estado='autorizado' OR (estado='construyendo' AND actualizado < now() - interval '15 minutes') ORDER BY resenas DESC LIMIT 50`)).rows.map((r) => r.id);
      if (ids.length) encolar(ids);
    } catch (err) { console.error('[prospectos] reanudar', err.message); }
  };
  setTimeout(tick, 20000);
  setInterval(tick, 5 * 60000).unref();
}
