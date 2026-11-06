// Propiedades de inmobiliarias (plantilla tomada de la ficha de HRB Consulting, tipo EasyBroker) dentro del sitio en vivo:
// el dueño las administra en su panel, se muestran en su página con el diseño de su propuesta y cada una tiene su ficha
// pública en /propiedad/<slug>. "Publicar en redes" las manda al publicador (publicador.js).
import crypto from 'node:crypto';
import * as db from '../entrevista/db.js';

const q = db.q;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const SCHEMA_PROPIEDADES = `
CREATE TABLE IF NOT EXISTS propiedades (
  id             serial PRIMARY KEY,
  sitio_id       int NOT NULL REFERENCES sitios_vivos(id) ON DELETE CASCADE,
  slug           text NOT NULL,
  orden          int NOT NULL DEFAULT 0,
  datos          jsonb NOT NULL DEFAULT '{}',
  imagenes       jsonb NOT NULL DEFAULT '[]',
  publicaciones  jsonb NOT NULL DEFAULT '[]',
  vistas         int NOT NULL DEFAULT 0,
  creado         timestamptz NOT NULL DEFAULT now(),
  actualizado    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sitio_id, slug)
);
CREATE INDEX IF NOT EXISTS propiedades_sitio_idx ON propiedades (sitio_id, orden, id);
ALTER TABLE sitios_vivos ADD COLUMN IF NOT EXISTS publicador jsonb NOT NULL DEFAULT '{}';
`;
let migrado = false;
export async function migrarPropiedades() { if (!migrado) { await q(SCHEMA_PROPIEDADES); migrado = true; } }

/* ---------------- Ficha ---------------- */

export const OPERACIONES = { venta: 'Venta', renta: 'Renta', preventa: 'Preventa', venta_renta: 'Venta o renta' };
export const TIPOS = { casa: 'Casa', departamento: 'Departamento', terreno: 'Terreno', bodega: 'Bodega', oficina: 'Oficina', local_comercial: 'Local comercial', edificio: 'Edificio', desarrollo: 'Desarrollo', rancho: 'Rancho', otro: 'Otro' };
export const ESTADOS = { disponible: 'Disponible', reservado: 'Apartada', vendido: 'Vendida', rentado: 'Rentada', suspendido: 'Oculta' };
export const CONDICIONES = { nuevo: 'Nueva', usado: 'Usada', en_construccion: 'En construcción', en_remodelacion: 'En remodelación', por_estrenar: 'Por estrenar' };
export const USOS = { habitacional: 'Habitacional', comercial: 'Comercial', industrial: 'Industrial', mixto: 'Mixto', rustico: 'Rústico', turistico: 'Turístico' };
// Se ven en la página: disponibles y apartadas. Vendidas, rentadas y ocultas solo en el panel.
export const VISIBLES = ['disponible', 'reservado'];

const txt = (v, max = 200) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim().slice(0, max));
const largo = (v, max = 5000) => (v === null || v === undefined ? '' : String(v).replace(/\r/g, '').trim().slice(0, max));
const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };
const ent = (v) => { const n = num(v); return n === null ? null : Math.round(n); };
const de = (v, opciones, def) => (v in opciones ? v : def);
const lista = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => txt(x, 120)).filter(Boolean).slice(0, 60);

/** Valida y limpia la ficha que manda el panel. Lanza Error con mensaje para el dueño. */
export function limpiarPropiedad(d = {}) {
  const p = {
    titulo: txt(d.titulo, 140), clave: txt(d.clave, 40),
    operacion: de(d.operacion, OPERACIONES, 'venta'), tipo: de(d.tipo, TIPOS, 'casa'), estado: de(d.estado, ESTADOS, 'disponible'),
    destacada: !!d.destacada,
    precio: num(d.precio), moneda: d.moneda === 'USD' ? 'USD' : 'MXN', mantenimiento: num(d.mantenimiento), negociable: !!d.negociable,
    descripcion: largo(d.descripcion), inversion: largo(d.inversion, 2000), notas_internas: largo(d.notas_internas, 2000),
    m2_terreno: num(d.m2_terreno), m2_construccion: num(d.m2_construccion), frente_m: num(d.frente_m), fondo_m: num(d.fondo_m),
    recamaras: ent(d.recamaras), banos: num(d.banos), medios_banos: ent(d.medios_banos), estacionamientos: ent(d.estacionamientos), niveles: ent(d.niveles),
    antiguedad: ent(d.antiguedad), condicion: d.condicion in CONDICIONES ? d.condicion : '', anio: ent(d.anio), disponible_desde: txt(d.disponible_desde, 40),
    uso_suelo: d.uso_suelo in USOS ? d.uso_suelo : '', situacion_legal: txt(d.situacion_legal, 200),
    amenidades: lista(d.amenidades), servicios: lista(d.servicios),
    direccion: txt(d.direccion, 240), colonia: txt(d.colonia, 120), ciudad: txt(d.ciudad, 80), estado_rep: txt(d.estado_rep, 80), cp: txt(d.cp, 10),
    lat: num(d.lat), lng: num(d.lng), mapa_url: /^https:\/\//i.test(txt(d.mapa_url, 500)) ? txt(d.mapa_url, 500) : '',
  };
  if (!p.titulo) throw new Error('Ponle un título a la propiedad');
  return p;
}

export const slugify = (s) => String(s || 'propiedad').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'propiedad';

/* ---------------- Datos ---------------- */

export async function listar(sitioId, { publicas = false } = {}) {
  await migrarPropiedades();
  const r = await q(`SELECT * FROM propiedades WHERE sitio_id=$1 ${publicas ? `AND datos->>'estado' = ANY($2)` : ''} ORDER BY (datos->>'destacada')::boolean DESC NULLS LAST, orden, id`, publicas ? [sitioId, VISIBLES] : [sitioId]);
  return r.rows;
}
export async function obtener(sitioId, id) {
  await migrarPropiedades();
  return (await q(`SELECT * FROM propiedades WHERE sitio_id=$1 AND id=$2`, [sitioId, Number(id)])).rows[0] || null;
}
export async function porSlug(sitioId, slug) {
  await migrarPropiedades();
  return (await q(`SELECT * FROM propiedades WHERE sitio_id=$1 AND slug=$2`, [sitioId, String(slug)])).rows[0] || null;
}
async function slugLibre(sitioId, base, id = null) {
  let s = slugify(base);
  for (let n = 2; (await q(`SELECT 1 FROM propiedades WHERE sitio_id=$1 AND slug=$2 AND id IS DISTINCT FROM $3`, [sitioId, s, id])).rowCount; n++) s = `${slugify(base).slice(0, 55)}-${n}`;
  return s;
}
export async function crear(sitioId, datos) {
  await migrarPropiedades();
  const d = limpiarPropiedad(datos);
  if (!d.clave) d.clave = `P-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const slug = await slugLibre(sitioId, `${d.titulo}-${d.clave}`);
  const orden = (await q(`SELECT COALESCE(max(orden),0)+1 AS o FROM propiedades WHERE sitio_id=$1`, [sitioId])).rows[0].o;
  return (await q(`INSERT INTO propiedades (sitio_id, slug, orden, datos) VALUES ($1,$2,$3,$4) RETURNING *`, [sitioId, slug, orden, JSON.stringify(d)])).rows[0];
}
export async function actualizar(sitioId, id, datos) {
  const p = await obtener(sitioId, id);
  if (!p) return null;
  const d = limpiarPropiedad({ ...p.datos, ...datos });
  if (!d.clave) d.clave = p.datos.clave;
  // El slug no cambia aunque cambie el título: las ligas que ya se compartieron siguen sirviendo.
  return (await q(`UPDATE propiedades SET datos=$3, actualizado=now() WHERE sitio_id=$1 AND id=$2 RETURNING *`, [sitioId, p.id, JSON.stringify(d)])).rows[0];
}
export async function borrar(sitioId, id) {
  await migrarPropiedades();
  return (await q(`DELETE FROM propiedades WHERE sitio_id=$1 AND id=$2 RETURNING id`, [sitioId, Number(id)])).rowCount > 0;
}
export async function ponerImagenes(sitioId, id, imagenes) {
  const limpias = (Array.isArray(imagenes) ? imagenes : []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 40);
  return (await q(`UPDATE propiedades SET imagenes=$3, actualizado=now() WHERE sitio_id=$1 AND id=$2 RETURNING *`, [sitioId, Number(id), JSON.stringify([...new Set(limpias)])])).rows[0] || null;
}
export async function ordenar(sitioId, ids) {
  for (const [i, id] of (ids || []).entries()) await q(`UPDATE propiedades SET orden=$3 WHERE sitio_id=$1 AND id=$2`, [sitioId, Number(id), i + 1]);
}
export async function registrarPublicacion(sitioId, id, registro) {
  await q(`UPDATE propiedades SET publicaciones = (publicaciones || $3::jsonb), actualizado=now() WHERE sitio_id=$1 AND id=$2`, [sitioId, Number(id), JSON.stringify([registro])]);
}
export async function contarVista(id) { await q(`UPDATE propiedades SET vistas=vistas+1 WHERE id=$1`, [id]).catch(() => {}); }

/* ---------------- Textos ---------------- */

export function precioTexto(d) {
  if (d.precio === null || d.precio === undefined) return 'Precio a consultar';
  const n = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(d.precio);
  return `$${n} ${d.moneda || 'MXN'}${d.operacion === 'renta' ? ' al mes' : ''}`;
}
export const lugarTexto = (d) => [d.colonia, d.ciudad, d.estado_rep].filter(Boolean).join(', ');
export function datosClave(d) {
  const x = [];
  if (d.recamaras) x.push(`${d.recamaras} ${d.recamaras === 1 ? 'recámara' : 'recámaras'}`);
  if (d.banos) x.push(`${d.banos} ${d.banos === 1 ? 'baño' : 'baños'}${d.medios_banos ? ` y ${d.medios_banos} medio${d.medios_banos > 1 ? 's' : ''}` : ''}`);
  if (d.estacionamientos) x.push(`${d.estacionamientos} ${d.estacionamientos === 1 ? 'estacionamiento' : 'estacionamientos'}`);
  if (d.m2_construccion) x.push(`${d.m2_construccion} m² construidos`);
  if (d.m2_terreno) x.push(`${d.m2_terreno} m² de terreno`);
  return x;
}

/* ---------------- Página pública ---------------- */

const CSS = `
.props .filtros{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 22px}.props .filtros button{font:inherit;font-weight:700;font-size:14px;border:1px solid var(--bor);background:var(--card);color:var(--fg);border-radius:999px;padding:9px 16px;min-height:42px;cursor:pointer}
.props .filtros button[aria-pressed=true]{background:var(--p);border-color:var(--p);color:var(--on)}
.props .rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px}
.prop{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--bor);border-radius:18px;overflow:hidden;text-decoration:none;color:var(--fg);transition:transform .15s,box-shadow .15s}
.prop:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.08)}.prop:focus-visible{outline:3px solid var(--p);outline-offset:3px}
.prop .foto{position:relative;aspect-ratio:4/3;background:var(--mut,var(--bor));overflow:hidden}.prop .foto img{width:100%;height:100%;object-fit:cover;display:block}
.prop .chips{position:absolute;left:12px;top:12px;display:flex;gap:6px;flex-wrap:wrap}.chip{font-size:12px;font-weight:800;letter-spacing:.02em;background:var(--card);color:var(--fg);border-radius:999px;padding:4px 10px}.chip.p{background:var(--p);color:var(--on)}
.prop .info{padding:16px 18px 18px;display:grid;gap:6px}.prop .precio{font-weight:800;font-size:20px;color:var(--p)}.prop h3{font-size:18px;line-height:1.25;margin:0}
.prop .lugar{color:var(--soft);font-size:14px}.prop .datos{display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--soft);font-size:13px;margin-top:4px}
.ficha .volver{display:inline-block;margin:22px 0 8px;color:var(--p);font-weight:700;text-decoration:none}
.ficha .encabezado{display:grid;gap:8px;margin-bottom:18px}.ficha h1{font-family:var(--ft);font-size:clamp(28px,5vw,44px);line-height:1.1;margin:0}
.ficha .precio{font-weight:800;font-size:clamp(22px,3.5vw,30px);color:var(--p)}.ficha .lugar{color:var(--soft)}
.ficha .galeria{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:10px 0 26px}.ficha .galeria img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:14px;display:block}
.ficha .galeria a:first-child{grid-column:1/-1}.ficha .galeria a:first-child img{aspect-ratio:16/9}
.ficha .cols{display:grid;gap:26px}.ficha .caja{background:var(--card);border:1px solid var(--bor);border-radius:18px;padding:20px}
.ficha dl{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;margin:0}.ficha dt{color:var(--soft)}.ficha dd{margin:0;font-weight:700}
.ficha .desc p{margin:0 0 12px}.ficha ul.am{columns:2;gap:24px;padding-left:18px;margin:8px 0 0}.ficha h2{font-size:22px;margin:0 0 12px}
.ficha .cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
@media (min-width:900px){.ficha .cols{grid-template-columns:1.6fr 1fr;align-items:start}.ficha .lado{position:sticky;top:90px}}
@media (prefers-reduced-motion:reduce){.prop{transition:none}}`;

function tarjeta(p, base) {
  const d = p.datos;
  const img = p.imagenes?.[0];
  const chips = [`<span class="chip p">${esc(OPERACIONES[d.operacion])}</span>`, d.estado === 'reservado' ? '<span class="chip">Apartada</span>' : '', d.destacada ? '<span class="chip">Destacada</span>' : ''].join('');
  return `<a class="prop" href="${esc(base)}/propiedad/${esc(p.slug)}" data-op="${esc(d.operacion)}">
<div class="foto">${img ? `<img src="${esc(img)}" alt="${esc(d.titulo)}" loading="lazy">` : ''}<div class="chips">${chips}</div></div>
<div class="info"><span class="precio">${esc(precioTexto(d))}</span><h3>${esc(d.titulo)}</h3>${lugarTexto(d) ? `<span class="lugar">${esc(TIPOS[d.tipo])} · ${esc(lugarTexto(d))}</span>` : `<span class="lugar">${esc(TIPOS[d.tipo])}</span>`}
<span class="datos">${datosClave(d).slice(0, 4).map((x) => `<span>${esc(x)}</span>`).join('')}</span></div></a>`;
}

/** Sección "Propiedades" para la página de inicio. */
export function seccionPropiedades(props, { base = '', titulo = 'Propiedades' } = {}) {
  if (!props.length) return '';
  const ops = [...new Set(props.map((p) => p.datos.operacion))];
  const filtros = ops.length > 1 ? `<div class="filtros" role="group" aria-label="Filtrar por operación"><button type="button" aria-pressed="true" data-f="">Todas</button>${ops.map((o) => `<button type="button" aria-pressed="false" data-f="${esc(o)}">${esc(OPERACIONES[o])}</button>`).join('')}</div>` : '';
  const js = ops.length > 1 ? `<script>(function(){var s=document.getElementById('propiedades');s.querySelectorAll('.filtros button').forEach(function(b){b.onclick=function(){var f=b.getAttribute('data-f');s.querySelectorAll('.filtros button').forEach(function(x){x.setAttribute('aria-pressed',x===b)});s.querySelectorAll('.prop').forEach(function(c){c.hidden=!!f&&c.getAttribute('data-op')!==f&&c.getAttribute('data-op')!=='venta_renta'})}})})();</script>` : '';
  return `<style>${CSS}</style><section class="sec props" id="propiedades"><div class="wrap"><h2>${esc(titulo)}</h2>${filtros}<div class="rejilla">${props.map((p) => tarjeta(p, base)).join('')}</div></div></section>${js}`;
}

function parrafos(t) { return String(t || '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join(''); }

/** JSON-LD de la propiedad (anuncio inmobiliario). */
export function jsonLdPropiedad(p, url, negocio) {
  const d = p.datos;
  return {
    '@context': 'https://schema.org', '@type': 'RealEstateListing', name: d.titulo, url, description: d.descripcion?.slice(0, 500) || undefined,
    image: (p.imagenes || []).slice(0, 6), datePosted: new Date(p.creado).toISOString().slice(0, 10),
    ...(d.precio ? { offers: { '@type': 'Offer', price: d.precio, priceCurrency: d.moneda || 'MXN', availability: d.estado === 'disponible' ? 'https://schema.org/InStock' : 'https://schema.org/LimitedAvailability', seller: { '@type': 'RealEstateAgent', name: negocio } } } : {}),
    ...(lugarTexto(d) ? { contentLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', streetAddress: d.direccion || undefined, addressLocality: d.ciudad || undefined, addressRegion: d.estado_rep || undefined, postalCode: d.cp || undefined, addressCountry: 'MX' } } } : {}),
  };
}

/**
 * Ficha pública de una propiedad, armada sobre el HTML del sitio (mismo encabezado, paleta, letras y pie).
 * html = página de inicio ya renderizada; wa = número de WhatsApp (solo dígitos) o null.
 */
export function paginaPropiedad(html, p, { base = '', url = '', negocio = '', wa = null } = {}) {
  const d = p.datos;
  const msg = `Hola, me interesa la propiedad "${d.titulo}"${d.clave ? ` (${d.clave})` : ''}: ${url}`;
  const waUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : null;
  const filas = [
    ['Operación', OPERACIONES[d.operacion]], ['Tipo', TIPOS[d.tipo]], ['Estado', d.estado === 'disponible' ? null : ESTADOS[d.estado]],
    ['Recámaras', d.recamaras], ['Baños', d.banos ? `${d.banos}${d.medios_banos ? ` + ${d.medios_banos} medio${d.medios_banos > 1 ? 's' : ''}` : ''}` : null],
    ['Estacionamientos', d.estacionamientos], ['Construcción', d.m2_construccion ? `${d.m2_construccion} m²` : null], ['Terreno', d.m2_terreno ? `${d.m2_terreno} m²` : null],
    ['Frente × fondo', d.frente_m && d.fondo_m ? `${d.frente_m} × ${d.fondo_m} m` : null], ['Niveles', d.niveles],
    ['Antigüedad', d.antiguedad === 0 ? 'Nueva' : d.antiguedad ? `${d.antiguedad} años` : null], ['Condición', CONDICIONES[d.condicion]],
    ['Uso de suelo', USOS[d.uso_suelo]], ['Mantenimiento', d.mantenimiento ? `$${new Intl.NumberFormat('es-MX').format(d.mantenimiento)} al mes` : null],
    ['Situación legal', d.situacion_legal], ['Disponible desde', d.disponible_desde], ['Clave', d.clave],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');
  const galeria = (p.imagenes || []).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(d.titulo)} · foto ${i + 1}" loading="${i < 2 ? 'eager' : 'lazy'}"></a>`).join('');
  const main = `<main><style>${CSS}</style><div class="wrap ficha">
<a class="volver" href="${esc(base)}/#propiedades">‹ Ver todas las propiedades</a>
<div class="encabezado"><span class="chip p" style="justify-self:start">${esc(OPERACIONES[d.operacion])}${d.estado === 'reservado' ? ' · Apartada' : ''}</span><h1>${esc(d.titulo)}</h1>
<span class="precio">${esc(precioTexto(d))}${d.negociable ? ' · negociable' : ''}</span>${lugarTexto(d) ? `<span class="lugar">${esc(lugarTexto(d))}</span>` : ''}</div>
${galeria ? `<div class="galeria">${galeria}</div>` : ''}
<div class="cols"><div>
${d.descripcion ? `<div class="caja desc"><h2>Descripción</h2>${parrafos(d.descripcion)}</div>` : ''}
${d.amenidades?.length ? `<div class="caja" style="margin-top:18px"><h2>Amenidades</h2><ul class="am">${d.amenidades.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
${d.servicios?.length ? `<div class="caja" style="margin-top:18px"><h2>Servicios</h2><ul class="am">${d.servicios.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
${d.inversion ? `<div class="caja desc" style="margin-top:18px"><h2>Potencial de inversión</h2>${parrafos(d.inversion)}</div>` : ''}
</div><aside class="lado"><div class="caja"><h2>Datos</h2><dl>${filas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<div class="cta">${waUrl ? `<a class="btn" href="${esc(waUrl)}" target="_blank" rel="noopener">Me interesa</a>` : ''}${d.mapa_url ? `<a class="btn inv" style="background:var(--card);color:var(--fg);border:1px solid var(--bor)" href="${esc(d.mapa_url)}" target="_blank" rel="noopener">Ver ubicación</a>` : ''}</div></div></aside></div>
</div></main>`;
  const titulo = `${d.titulo} · ${precioTexto(d)}${negocio ? ` · ${negocio}` : ''}`;
  const desc = `${OPERACIONES[d.operacion]} · ${TIPOS[d.tipo]}${lugarTexto(d) ? ` en ${lugarTexto(d)}` : ''}. ${datosClave(d).join(', ')}.`.slice(0, 300);
  const ld = `<script type="application/ld+json">${JSON.stringify(jsonLdPropiedad(p, url, negocio)).replace(/</g, '\\u003c')}</script>`;
  let out = html.replace(/<main>[\s\S]*<\/main>/, main)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace('</head>', `<meta property="og:title" content="${esc(d.titulo)}"><meta property="og:description" content="${esc(desc)}">${p.imagenes?.[0] ? `<meta property="og:image" content="${esc(p.imagenes[0])}">` : ''}<meta property="og:type" content="website">${url ? `<link rel="canonical" href="${esc(url)}">` : ''}${ld}</head>`);
  // El botón flotante de WhatsApp lleva el mensaje de esta propiedad.
  if (waUrl) out = out.replace(/<a class="wa" href="[^"]*"/, `<a class="wa" href="${esc(waUrl)}"`);
  // Enlaces del menú (anclas de la página de inicio) apuntan a la portada.
  out = out.replace(/(<nav>[\s\S]*?<\/nav>)/, (nav) => nav.replace(/href="#/g, `href="${base}/#`));
  return out;
}

/** Inserta la sección de propiedades en la página de inicio (después de la portada) y su liga en el menú. */
export function conPropiedades(html, props, { base = '' } = {}) {
  const sec = seccionPropiedades(props, { base });
  if (!sec) return html;
  let out = html.replace(/(<section class="hero[\s\S]*?<\/section>)/, `$1${sec}`);
  if (out === html) out = html.replace('<main>', `<main>${sec}`);
  return out.replace(/(<nav>)/, `$1<a href="#propiedades">Propiedades</a>`);
}
