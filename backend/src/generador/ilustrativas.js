// Elementos ilustrativos (etapa 2, parte 3; decisiones del 18-nov-2026 en el doc del proyecto
// claude/material-faltante-imagenes-ilustrativas.md). Donde al cliente le falta material para que una de sus 6 opciones
// se vea completa, se llena con:
//   - fotos de Pixabay descargadas a nuestro servidor, con la marca "Imagen ilustrativa" DENTRO de la imagen;
//   - servicios o productos de ejemplo marcados "Ejemplo ilustrativo", sin precio;
//   - para la D (Tu logo al centro) sin logo: una imagen con las letras del nombre del negocio.
// Nunca desplazan material del cliente: solo llenan el hueco que falta, y si el cliente manda lo suyo, sobran.
// El relleno se calcula una vez (propuestas desde cero) y se guarda en brief.marca.propuestas.relleno; los cambios,
// el sitio en vivo y el rediseño lo vuelven a aplicar sin buscar de nuevo (aplicarRelleno).
import { contarMaterial } from './giros/index.js';

export const MARCA_FOTO = 'Imagen ilustrativa';
export const MARCA_EJEMPLO = 'Ejemplo ilustrativo';
export const PREFIJO = 'ilus'; // nombre de archivo de las fotos ilustrativas (sirve para detectarlas en el HTML)
export const CREDITO = 'Imágenes ilustrativas de Pixabay';

/** ¿Se usan ilustrativas? Con llave de Pixabay (y sin ILUSTRATIVAS=no). */
// Restaurantes y cafeterías también (etapa 3, decisión 6 del 19-nov-2026).
export const ilustrativasActivas = (brief = {}) => !!process.env.PIXABAY_API_KEY && process.env.ILUSTRATIVAS !== 'no';

// Requisitos que el relleno puede cubrir (los demás, como "secciones" o la regla apta de la I, siguen decidiendo).
export const RELLENABLES = ['fotosTrabajo', 'fotoBuena', 'fotosTotal', 'logo', 'servicios', 'grupos', 'productos', 'producto'];
/** Requisitos que el relleno cubre para este cliente (los grupos no, si ya tiene 3 servicios o más). */
export const rellenablesPara = ({ brief = {}, mat = {}, textos = {} } = {}) => (contarMaterial({ brief, mat, textos }).servicios >= 3 ? RELLENABLES.filter((r) => r !== 'grupos') : RELLENABLES);

// Búsqueda por giro y subtipo (en español; Pixabay con lang=es).
const TERMINOS = {
  inmobiliaria: { _: ['casa moderna', 'interior de casa', 'fachada casa', 'sala de estar', 'cocina moderna'] },
  clinica: { dental: ['consultorio dental', 'dentista'], medica: ['consultorio médico', 'médico'], veterinaria: ['veterinario perro', 'veterinaria'], estetica_spa: ['spa masaje', 'tratamiento facial'], _: ['clínica', 'consultorio'] },
  servicios: { legal: ['oficina de abogados', 'reunión de negocios'], contador_consultor: ['oficina contabilidad', 'reunión de negocios'], agencia_marketing: ['equipo de trabajo oficina', 'marketing digital'], fotografia: ['fotógrafo', 'sesión de fotos'], arquitectura_construccion: ['arquitectura casa', 'construcción'], _: ['oficina', 'reunión de trabajo'] },
  tienda: { _: ['tienda', 'productos artesanales', 'compras'] },
  oficios: { _: ['herramientas', 'plomero', 'electricista', 'reparación'] },
  educacion: { _: ['salón de clases', 'estudiantes', 'aprendizaje'] },
  turismo: { hotel: ['habitación de hotel', 'hotel alberca'], _: ['cenote', 'viaje méxico', 'tour'] },
  generico: { _: ['negocio local', 'emprendedor'] },
  restaurante: { cafeteria: ['café latte', 'cafetería', 'postre'], _: ['platillo mexicano', 'comida restaurante', 'tacos', 'postre', 'bebida refrescante'] },
};

// Servicios o productos de ejemplo por giro (el nombre lleva la marca; nunca precio).
const EJEMPLOS = {
  inmobiliaria: ['Compra de vivienda', 'Venta de tu propiedad', 'Renta', 'Asesoría de crédito'],
  clinica: ['Consulta de valoración', 'Limpieza y revisión', 'Tratamiento personalizado', 'Seguimiento'],
  servicios: ['Asesoría inicial', 'Servicio integral', 'Seguimiento personalizado', 'Paquete completo'],
  tienda: ['Producto destacado', 'Producto de temporada', 'Paquete regalo', 'Edición especial'],
  oficios: ['Diagnóstico a domicilio', 'Reparación', 'Instalación', 'Mantenimiento'],
  educacion: ['Curso básico', 'Curso intermedio', 'Clases particulares', 'Taller intensivo'],
  turismo: ['Tour de un día', 'Experiencia privada', 'Paquete fin de semana', 'Recorrido al atardecer'],
  generico: ['Servicio principal', 'Servicio a la medida', 'Paquete completo', 'Asesoría'],
  restaurante: ['Platillo de la casa', 'Entrada', 'Plato fuerte', 'Postre', 'Bebida de temporada'],
};

const giroDe = (brief) => (TERMINOS[brief.negocio?.arquetipo] ? brief.negocio.arquetipo : 'generico');
const subtipoDe = (brief) => brief.negocio?.subtipo_resuelto || brief.negocio?.subtipo || '';

export function terminosBusqueda(brief = {}) {
  const t = TERMINOS[giroDe(brief)];
  const propios = (brief.oferta?.items || []).filter((x) => !x?.ejemplo).map((x) => String(x?.nombre || '').trim()).filter((x) => x.length > 2).slice(0, 3);
  return [...new Set([...(t[subtipoDe(brief)] || []), ...t._, ...propios])];
}

/** Cuánto le falta a la opción para verse completa: {clave: faltante} (solo requisitos rellenables). */
export function faltantes(op, cuenta) {
  const out = {};
  for (const [k, v] of Object.entries(op?.requisitos || {})) {
    if (!RELLENABLES.includes(k)) continue;
    if (typeof v === 'boolean') { if (v && cuenta[k] !== true) out[k] = true; } else if ((cuenta[k] || 0) < v) out[k] = v - (cuenta[k] || 0);
  }
  return out;
}

/**
 * Qué hay que rellenar para que las opciones elegidas se vean completas.
 * → {hero:boolean, fotos:n, servicios:n, grupos:n, productos:n, logoLetras:boolean}
 */
export function necesidades(ops, { brief = {}, mat = {}, textos = {} } = {}) {
  const c = contarMaterial({ brief, mat, textos });
  const n = { hero: false, fotos: 0, servicios: 0, grupos: 0, productos: 0, logoLetras: false };
  for (const op of ops) {
    const f = faltantes(op, c);
    // Sin foto principal, la portada lleva una ilustrativa (decisión 4); cuenta como foto buena y foto en total.
    if ((f.fotoBuena || f.fotosTotal || op.conFotoPrincipal || f.producto) && !mat.hero?.url) n.hero = true;
    const conHero = n.hero ? 1 : 0;
    n.fotos = Math.max(n.fotos, f.fotosTrabajo || 0, (f.fotosTotal || 0) - conHero, (f.fotoBuena || 0) - conHero);
    n.servicios = Math.max(n.servicios, f.servicios || 0);
    n.grupos = Math.max(n.grupos, f.grupos || 0);
    n.productos = Math.max(n.productos, f.productos || 0, f.producto ? 1 : 0);
    if (f.logo) n.logoLetras = true;
  }
  n.fotos = Math.min(n.fotos, 8);
  // Con 3 servicios o más del cliente no se agregan servicios de ejemplo solo para formar grupos (24-nov-2026, Intiviso
  // Lab: con 8 servicios reales le salieron 2 de ejemplo para la O); la opción que pide grupos no entra.
  if (c.servicios >= 3) n.grupos = 0;
  return n;
}

/**
 * Restaurantes (etapa 3): portada, "Lo más pedido" (fotos de platillos), el slider (≥ 2 fotos reales) y el menú.
 * → {hero, fotos, fotosProducto, menu}
 */
export function necesidadesRestaurante({ brief = {}, mat = {} } = {}) {
  const productos = (mat.fotos || []).filter((f) => f.sin_fondo || f.tipo === 'foto_producto').length;
  const reales = [mat.hero, ...(mat.local || []), ...(mat.trabajos || []), ...(mat.fotos || []).filter((x) => !x.sin_fondo && x.tipo !== 'foto_producto')].filter((x) => x?.url).length;
  const hero = !mat.hero?.url;
  const conMenu = (mat.menu_texto || []).some((s) => (s.items || []).length) || (mat.menus || []).length > 0 || (brief.oferta?.items || []).some((x) => !x?.ejemplo && (x?.nombre || typeof x === 'string'));
  return { hero, fotos: Math.max(0, 2 - reales - (hero ? 1 : 0)), fotosProducto: Math.max(0, 3 - productos), menu: !conMenu };
}

/** Servicios o productos de ejemplo (sin precio, marcados en el nombre y la descripción). */
export function ejemplosDe(brief = {}, { servicios = 0, grupos = 0, productos = 0 } = {}) {
  const base = EJEMPLOS[giroDe(brief)];
  const items = brief.oferta?.items || [];
  const gruposCliente = [...new Set(items.map((x) => String(x?.grupo || '').trim()).filter(Boolean))];
  const total = Math.max(servicios, productos, grupos ? 2 : 0);
  // Para la O (grupos): los ejemplos van en grupos distintos a los del cliente.
  const nombresGrupo = grupos ? ['Más opciones', 'Paquetes', 'Especiales'].filter((g) => !gruposCliente.includes(g)) : [];
  const sinGrupoCliente = !gruposCliente.length;
  return Array.from({ length: total }, (_, k) => ({
    nombre: `${base[k % base.length]} · ${MARCA_EJEMPLO}`,
    descripcion_corta: `${MARCA_EJEMPLO}: aquí va la descripción de tu ${({ tienda: 'producto', restaurante: 'platillo' })[giroDe(brief)] || 'servicio'}.`,
    precio_o_rango: '',
    ...(nombresGrupo.length ? { grupo: nombresGrupo[sinGrupoCliente ? k % Math.min(2, nombresGrupo.length) : 0] } : {}),
    ejemplo: true,
  }));
}

/**
 * Aplica un relleno guardado: agrega solo lo que todavía falta (si el cliente ya mandó lo suyo, sobra).
 * → {brief, mat} nuevos (no modifica los originales).
 */
export function aplicarRelleno(brief = {}, mat = {}, relleno = null) {
  if (!relleno) return { brief, mat };
  const n = relleno.necesita || {};
  const m = { ...mat };
  if (!m.hero?.url && relleno.hero) m.hero = relleno.hero;
  const propias = (m.trabajos || []).length;
  const objetivo = n.fotosObjetivo ?? propias + (relleno.fotos || []).length;
  const faltanFotos = Math.max(0, objetivo - propias);
  if (faltanFotos) m.trabajos = [...(m.trabajos || []), ...(relleno.fotos || []).slice(0, faltanFotos)];
  if (!m.logo?.url && relleno.logoLetras) m.logoLetras = relleno.logoLetras;
  // Restaurantes: fotos de platillos para "Lo más pedido", solo las que sigan faltando.
  if ((relleno.fotosProducto || []).length) {
    const tiene = (m.fotos || []).filter((f) => f.sin_fondo || f.tipo === 'foto_producto').length;
    const faltan = Math.max(0, (n.productosFotoObjetivo ?? 3) - tiene);
    if (faltan) m.fotos = [...(m.fotos || []), ...relleno.fotosProducto.slice(0, faltan)];
  }
  if ((relleno.fotos || []).length || relleno.hero || (relleno.fotosProducto || []).length) m.ilustrativas = true;
  let b = brief;
  // Restaurantes sin menú: platillos de ejemplo mientras no mande el suyo.
  if (n.menu && (relleno.items || []).length) {
    if (!necesidadesRestaurante({ brief, mat: m }).menu) return { brief, mat: m };
    return { brief: { ...brief, oferta: { ...(brief.oferta || {}), items: [...(brief.oferta?.items || []).filter((x) => !x?.ejemplo), ...relleno.items] } }, mat: m };
  }
  if ((relleno.items || []).length) {
    const propios = (brief.oferta?.items || []).filter((x) => !x?.ejemplo);
    const con = (items) => ({ ...brief, oferta: { ...(brief.oferta || {}), items } });
    const falta = (items) => { const c = contarMaterial({ brief: con(items), mat: m }); return (n.serviciosObjetivo && c.servicios < n.serviciosObjetivo) || (n.productosObjetivo && c.productos < n.productosObjetivo) || (n.grupos && c.grupos < 2); };
    const items = [...propios];
    for (const it of relleno.items) { if (!falta(items)) break; items.push(it); }
    if (items.length > propios.length) b = con(items);
  }
  return { brief: b, mat: m };
}

// ---------- Pixabay, marca de agua y logo con letras (con red y disco; se inyectan para las pruebas) ----------

const cacheBusqueda = new Map(); // término → {t, hits}  (Pixabay pide guardar los resultados 24 h)
const DIA = 24 * 3600 * 1000;

export async function buscarPixabay(q, { fetchImpl = fetch, orientacion = 'horizontal' } = {}) {
  const clave = `${q}|${orientacion}`;
  const c = cacheBusqueda.get(clave);
  if (c && Date.now() - c.t < DIA) return c.hits;
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(process.env.PIXABAY_API_KEY || '')}&q=${encodeURIComponent(q)}&lang=es&image_type=photo&safesearch=true&orientation=${orientacion}&per_page=30&min_width=1200`;
  const r = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Pixabay ${r.status}`);
  const hits = ((await r.json()).hits || []).map((h) => ({ id: h.id, url: h.largeImageURL || h.webformatURL, ancho: h.imageWidth, alto: h.imageHeight, tags: h.tags || '' }));
  cacheBusqueda.set(clave, { t: Date.now(), hits });
  return hits;
}

/** SVG de la marca de agua: banda centrada a un cuarto de la altura (sobrevive a los recortes de "cover" y no queda bajo los textos de portada, que van abajo). */
export function svgMarca(W, H) {
  const fs = Math.max(18, Math.round(W * 0.034));
  const w = Math.round(fs * 10.2), h = Math.round(fs * 1.9), x = Math.round((W - w) / 2), y = Math.round(H * 0.26 - h / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,0.5)"/><text x="${W / 2}" y="${y + h / 2}" font-family="DejaVu Sans, sans-serif" font-size="${fs}" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">${MARCA_FOTO}</text></svg>`;
}

/** SVG del logo con las letras del nombre (iniciales en un círculo con el color de la marca). */
export function svgLogoLetras(nombre = '', color = '#333333') {
  const pal = String(nombre).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((x) => x && !/^(de|del|la|las|el|los|y|e)$/i.test(x));
  const ini = (pal.length > 1 ? pal[0][0] + pal[1][0] : (pal[0] || '?').slice(0, 2)).toUpperCase();
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><circle cx="300" cy="300" r="290" fill="${color}"/><text x="300" y="300" font-family="DejaVu Serif, serif" font-size="${ini.length > 1 ? 250 : 320}" fill="#fff" text-anchor="middle" dominant-baseline="central">${esc(ini)}</text></svg>`;
}

/**
 * Calcula y construye el relleno de unas opciones. deps: {buscar, descargarConMarca, logoLetras} (con red y disco).
 * → relleno {necesita, hero, fotos[], items[], logoLetras} o null si no falta nada.
 */
export async function construirRelleno(ops, { brief = {}, mat = {}, textos = {} } = {}, deps) {
  if (brief.negocio?.arquetipo === 'restaurante') return construirRellenoRestaurante({ brief, mat }, deps);
  const n = necesidades(ops, { brief, mat, textos });
  const nFotos = n.fotos + (n.hero ? 1 : 0);
  const relleno = { v: 1, necesita: {}, hero: null, fotos: [], items: [], logoLetras: null };
  if (nFotos) {
    const vistos = new Set();
    const hits = [];
    for (const q of terminosBusqueda(brief)) {
      if (hits.length >= nFotos * 2) break;
      try { for (const h of await deps.buscar(q)) if (!vistos.has(h.id)) { vistos.add(h.id); hits.push(h); } } catch (err) { console.warn('[ilustrativas] búsqueda', q, err.message); }
    }
    const listas = [];
    for (const h of hits) {
      if (listas.length >= nFotos) break;
      try { listas.push(await deps.descargarConMarca(h)); } catch (err) { console.warn('[ilustrativas] descarga', h.id, err.message); }
    }
    const desc = `${MARCA_FOTO} de ${brief.negocio?.giro_texto || 'un negocio como el tuyo'}`;
    const ficha = (f) => ({ ...f, alt: desc, nombre: '', tipo: 'foto_trabajo', ilustrativa: true, clave: `ilus-${f.pixabay}` });
    if (n.hero && listas.length) relleno.hero = { ...ficha(listas.shift()), tipo: 'foto_local' };
    relleno.fotos = listas.map(ficha);
    relleno.necesita.fotosObjetivo = (mat.trabajos || []).length + n.fotos;
  }
  if (n.servicios || n.grupos || n.productos) {
    relleno.items = ejemplosDe(brief, n);
    const c = contarMaterial({ brief, mat, textos });
    Object.assign(relleno.necesita, { serviciosObjetivo: n.servicios ? c.servicios + n.servicios : 0, productosObjetivo: n.productos ? c.productos + n.productos : 0, grupos: n.grupos > 0 });
  }
  if (n.logoLetras && !mat.logo?.url) relleno.logoLetras = await deps.logoLetras(brief.negocio?.nombre || '', (mat.colores || [])[0] || '#333333').catch(() => null);
  return relleno.hero || relleno.fotos.length || relleno.items.length || relleno.logoLetras ? relleno : null;
}

async function fotosPixabay(brief, cuantas, deps) {
  const vistos = new Set(), hits = [], listas = [];
  for (const q of terminosBusqueda(brief)) {
    if (hits.length >= cuantas * 2) break;
    try { for (const h of await deps.buscar(q)) if (!vistos.has(h.id)) { vistos.add(h.id); hits.push(h); } } catch (err) { console.warn('[ilustrativas] búsqueda', q, err.message); }
  }
  for (const h of hits) {
    if (listas.length >= cuantas) break;
    try { listas.push(await deps.descargarConMarca(h)); } catch (err) { console.warn('[ilustrativas] descarga', h.id, err.message); }
  }
  return listas;
}

/** Relleno de un restaurante (decisión 6 del 19-nov-2026). */
async function construirRellenoRestaurante({ brief, mat }, deps) {
  const n = necesidadesRestaurante({ brief, mat });
  const total = (n.hero ? 1 : 0) + n.fotos + n.fotosProducto;
  const relleno = { v: 1, necesita: { productosFotoObjetivo: 3, menu: n.menu }, hero: null, fotos: [], fotosProducto: [], items: [], logoLetras: null };
  if (total) {
    const listas = await fotosPixabay(brief, total, deps);
    const alt = `${MARCA_FOTO} de comida`;
    const ficha = (f, tipo) => ({ ...f, alt, nombre: tipo === 'foto_producto' ? MARCA_EJEMPLO : '', tipo, ilustrativa: true, clave: `ilus-${f.pixabay}` });
    if (n.hero && listas.length) relleno.hero = ficha(listas.shift(), 'foto_local');
    relleno.fotos = listas.splice(0, n.fotos).map((f) => ficha(f, 'foto_local'));
    relleno.fotosProducto = listas.splice(0, n.fotosProducto).map((f) => ficha(f, 'foto_producto'));
    relleno.necesita.fotosObjetivo = (mat.trabajos || []).length + relleno.fotos.length;
  }
  if (n.menu) relleno.items = ejemplosDe(brief, { servicios: 5 });
  return relleno.hero || relleno.fotos.length || relleno.fotosProducto.length || relleno.items.length ? relleno : null;
}

/** Dependencias reales (Pixabay + sharp + disco), con caché de fotos ya marcadas por id de Pixabay. */
export async function dependenciasReales() {
  const sharp = (await import('sharp')).default;
  const { guardarImagen } = await import('./materiales.js');
  const yaMarcadas = new Map();
  return {
    buscar: (q) => buscarPixabay(q),
    async descargarConMarca(h) {
      if (yaMarcadas.has(h.id)) return yaMarcadas.get(h.id);
      const r = await fetch(h.url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`descarga ${r.status}`);
      const img = sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({ width: 1600, withoutEnlargement: true });
      const { data, info } = await img.toBuffer({ resolveWithObject: true });
      const marcada = sharp(data).composite([{ input: Buffer.from(svgMarca(info.width, info.height)) }]);
      const g = await guardarImagen(marcada, PREFIJO);
      const out = { ...g, pixabay: h.id };
      yaMarcadas.set(h.id, out);
      return out;
    },
    async logoLetras(nombre, color) {
      const g = await guardarImagen(sharp(Buffer.from(svgLogoLetras(nombre, color))), 'letras', 'png');
      return { ...g, alt: nombre, ilustrativo: true };
    },
  };
}

/** Crédito de Pixabay en el pie, solo si la página muestra alguna foto ilustrativa. */
export function conCredito(html) {
  if (!html.includes(`/${PREFIJO}-`) || html.includes('class="credito-ilus"')) return html;
  const nota = `<p class="credito-ilus" style="font-size:12px;opacity:.7;margin-top:8px">${CREDITO}</p>`;
  return html.includes('</footer>') ? html.replace(/<\/footer>(?![\s\S]*<\/footer>)/, `${nota}</footer>`) : html.replace('</body>', `<div style="text-align:center;padding:0 16px 90px">${nota}</div></body>`);
}
