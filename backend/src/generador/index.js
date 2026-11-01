// Generador de sitios WordPress: brief → diseño → textos → publicación en Multisite → auditoría → 1 corrección.
//   POST /entrevista/v1/sesiones/:id/generar   {forzar_wordpress?, slug?}        → 202 {sitio_id}
//   POST /entrevista/v1/generar                {brief, usuario_id?, slug?}        → 202 {sitio_id, sesion_id} (pilotos sin entrevista)
//   GET  /entrevista/v1/sitios/:id                                                 → estado + reporte
// Mismo X-API-Key que la entrevista.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../util.js';
import * as db from '../entrevista/db.js';
import { resolverSubtipo, datosDiseno } from '../entrevista/subtipo.js';
import { generarVariaciones, generarThemeJsonHints, contraste } from '../entrevista/tema.js';
import { mergeProfundo } from '../entrevista/agente.js';
import { redactar } from './contenido.js';
import { paginaInicio, paginaTexto, waUrl } from './bloques.js';
import * as wp from './wp.js';

const q = db.q;
const igual = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return y.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); };

export const slugify = (s) => String(s || 'sitio').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sitio';
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ------------------------------------------------------------------ */
/* Estilos globales del sitio                                          */
/* ------------------------------------------------------------------ */

export function estilosGlobales(vars, estilo) {
  const tipo = vars.archivos[Object.keys(vars.archivos).find((k) => k.includes('/typography/'))];
  const hints = generarThemeJsonHints(estilo?.theme_json_hints || {});
  const p = vars.paleta;
  // Texto del botón: blanco si contrasta ≥ 4.5 sobre primary; si no, el color de texto principal.
  const textoBoton = contraste('#FFFFFF', p.primary) >= 4.5 ? '#FFFFFF' : p.main;
  const settings = mergeProfundo(hints.settings, {
    color: { palette: Object.entries(p).map(([slug, color]) => ({ slug, color, name: slug })) },
    typography: { fontFamilies: tipo.settings.typography.fontFamilies.map(({ googleFontsUrl, ...f }) => f) },
  });
  const styles = mergeProfundo(mergeProfundo(tipo.styles, hints.styles), {
    color: { background: 'var(--wp--preset--color--base)', text: 'var(--wp--preset--color--main)' },
    elements: {
      button: { color: { background: 'var(--wp--preset--color--primary)', text: textoBoton } },
      link: { color: { text: 'var(--wp--preset--color--primary)' } },
    },
  });
  return { settings, styles };
}

/* ------------------------------------------------------------------ */
/* SEO / GEO                                                           */
/* ------------------------------------------------------------------ */

const TIPO_LD = { inmobiliaria: 'RealEstateAgent', clinica: 'MedicalClinic', restaurante: 'Restaurant', servicios: 'ProfessionalService', tienda: 'Store', oficios: 'HomeAndConstructionBusiness', educacion: 'EducationalOrganization', turismo: 'LodgingBusiness' };

export function jsonLd(brief, cont, url, arquetipo) {
  const c = brief.contacto || {}; const d = c.direccion || {};
  const negocio = {
    '@type': TIPO_LD[arquetipo] || 'LocalBusiness', '@id': `${url}#negocio`, name: brief.negocio?.nombre, url,
    description: cont.descripcion_meta,
    ...(c.telefono || c.whatsapp ? { telephone: c.telefono || c.whatsapp } : {}),
    ...(c.email ? { email: c.email } : {}),
    ...(d.ciudad ? { address: { '@type': 'PostalAddress', streetAddress: [d.calle, d.colonia].filter(Boolean).join(', ') || undefined, addressLocality: d.ciudad, addressRegion: d.estado, postalCode: d.cp, addressCountry: 'MX' } } : {}),
    ...(brief.zona?.cobertura?.length ? { areaServed: brief.zona.cobertura } : {}),
    ...(Object.values(c.redes || {}).filter(Boolean).length ? { sameAs: Object.values(c.redes).filter((u) => /^https?:/.test(u)) } : {}),
    ...(cont.servicios?.items?.length ? { makesOffer: cont.servicios.items.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.titulo, description: s.texto } })) } : {}),
  };
  const grafo = [negocio, { '@type': 'WebSite', '@id': `${url}#web`, url, name: brief.negocio?.nombre, inLanguage: 'es-MX', publisher: { '@id': `${url}#negocio` } }];
  if (cont.faq?.length) grafo.push({ '@type': 'FAQPage', mainEntity: cont.faq.map((f) => ({ '@type': 'Question', name: f.pregunta, acceptedAnswer: { '@type': 'Answer', text: f.respuesta } })) });
  return { '@context': 'https://schema.org', '@graph': JSON.parse(JSON.stringify(grafo)) };
}

export function llmsTxt(brief, cont, url) {
  const c = brief.contacto || {};
  return [
    `# ${brief.negocio?.nombre || ''}`, '', `> ${cont.llms_resumen || cont.descripcion_meta}`, '',
    '## Servicios', ...(cont.servicios?.items || []).map((s) => `- ${s.titulo}: ${s.texto}`), '',
    '## Contacto', c.whatsapp ? `- WhatsApp: ${waUrl(c.whatsapp)}` : '', c.telefono ? `- Teléfono: ${c.telefono}` : '', c.email ? `- Correo: ${c.email}` : '',
    '', '## Páginas', `- [Inicio](${url})`, `- [Aviso de privacidad](${url}aviso-de-privacidad/)`,
    ...(cont.faq?.length ? ['', '## Preguntas frecuentes', ...cont.faq.map((f) => `- ${f.pregunta} ${f.respuesta}`)] : []),
  ].filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

function avisoPrivacidad(brief) {
  const n = brief.negocio?.nombre || 'El responsable';
  const email = brief.contacto?.email;
  return [
    `${n} es responsable del tratamiento de los datos personales que nos compartes por este sitio, WhatsApp, teléfono o correo.`,
    'Usamos tus datos (nombre, teléfono, correo y el mensaje que nos envías) solo para responder tu solicitud, darte seguimiento y, si nos contratas, prestarte el servicio. No los vendemos ni los compartimos con terceros salvo obligación legal.',
    `Puedes ejercer tus derechos de acceso, rectificación, cancelación u oposición (ARCO) o revocar tu consentimiento escribiéndonos${email ? ` a ${email}` : ' por WhatsApp'}.`,
    'Este aviso puede cambiar; la versión vigente siempre estará en esta página.',
  ];
}

/* ------------------------------------------------------------------ */
/* Orquestador                                                         */
/* ------------------------------------------------------------------ */

async function fotosDelSitio(entrevistaId, brief) {
  const assets = (await db.assetsDe(entrevistaId)).filter((a) => a.usar && a.calidad !== 'mala' && /^foto_|logo/.test(a.tipo));
  const vertical = brief.fotos?.vertical_hero_asset_id;
  const hero = assets.find((a) => String(a.id) === String(vertical) || a.clave === vertical)
    || assets.find((a) => ['foto_local', 'foto_producto', 'foto_equipo', 'foto_fundador'].includes(a.tipo) && a.calidad === 'buena')
    || assets.find((a) => a.tipo !== 'logo');
  const sobre = assets.find((a) => a !== hero && ['foto_fundador', 'foto_equipo', 'foto_local'].includes(a.tipo));
  return { hero, sobre };
}

async function auditar(url) {
  const a = await auditarRender(url);
  // Regla propia del generador: una landing con muy poco texto no compite (SEO/GEO ni conversión).
  const palabras = a?.propio?.checks?.palabras;
  if (typeof palabras === 'number' && palabras < 250) { a.p0 = [...(a.p0 || []), `Contenido pobre: ${palabras} palabras (mínimo 250)`]; a.publicable = false; }
  return a;
}

async function auditarRender(url) {
  if (!config.renderUrl) return { error: 'RENDER_URL no configurada' };
  const r = await fetch(`${config.renderUrl}/v1/auditar`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey },
    body: JSON.stringify({ url }), signal: AbortSignal.timeout(300000),
  });
  return r.ok ? r.json() : { error: `render ${r.status}` };
}

/** Correcciones a partir de la auditoría: qué cambia en la segunda vuelta. */
export function planCorreccion(aud) {
  const textos = []; const ajustes = {};
  for (const p of aud?.p0 || []) {
    if (/rendimiento/i.test(p) && (aud.lighthouse?.metricas?.lcp_ms || 0) > 3000) ajustes.heroSinFoto = true;
    if (/H1/.test(p)) textos.push('Debe existir exactamente un H1 (el del hero).');
    if (/Contenido pobre/.test(p)) textos.push('La página quedó con muy poco texto: entrega 4-6 servicios con 2 frases cada uno, sección "sobre" de 2-3 párrafos y 5-6 preguntas frecuentes.');
  }
  const slop = (aud?.impeccable?.hallazgos || []).filter((h) => h.categoria === 'slop');
  if (slop.length) textos.push(`Impeccable marcó clichés: ${[...new Set(slop.map((h) => h.nombre || h.regla))].slice(0, 6).join(', ')}. Reescribe evitando esas fórmulas.`);
  if ((aud?.impeccable?.hallazgos || []).some((h) => /contrast/i.test(h.regla || ''))) ajustes.subirContraste = true;
  return { textos, ajustes, hay: textos.length > 0 || Object.keys(ajustes).length > 0 };
}

async function guardarSitio(id, cambios) {
  const cols = Object.keys(cambios);
  const vals = cols.map((k) => (cambios[k] && typeof cambios[k] === 'object' && !(cambios[k] instanceof Date) ? JSON.stringify(cambios[k]) : cambios[k]));
  await q(`UPDATE sitios SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(', ')}, actualizado=now() WHERE id=$1`, [id, ...vals]);
}

export async function generarSitio(sitioId, entrevista, { slug } = {}) {
  const brief = entrevista.brief || {};
  const reporte = { pasos: [], avisos: [] };
  const paso = (p, extra = {}) => { reporte.pasos.push({ paso: p, t: new Date().toISOString(), ...extra }); return guardarSitio(sitioId, { reporte }); };
  try {
    // 1) Subtipo y datos de diseño.
    let arquetipo = brief.negocio?.arquetipo, subtipo = brief.negocio?.subtipo_resuelto || brief.negocio?.subtipo, fuente = brief.negocio?.subtipo_fuente || 'ari';
    if (!arquetipo || !subtipo) { const r = resolverSubtipo(brief, await db.arquetipos()); arquetipo = r.arquetipo; subtipo = r.subtipo; fuente = r.fuente; }
    const estiloSlug = brief.marca?.estilo || null;
    const dd = await datosDiseno({ arquetipo, subtipo, estilo: estiloSlug });
    await guardarSitio(sitioId, { subtipo_resuelto: `${arquetipo}/${subtipo}`, subtipo_fuente: fuente });
    await paso('diseno', { arquetipo, subtipo, estilo: estiloSlug, tipografia: dd.tipografia_recomendada });

    // 2) Variaciones de tema (paleta + tipografía) → estilos globales del sitio.
    const vars = generarVariaciones({ estilo: dd.estilo_diseno || {}, subtipo_diseno: dd.subtipo_diseno || {}, colores_marca: brief.marca?.colores || [], slug_sitio: slug, semilla: hash(entrevista.id) });
    reporte.avisos.push(...vars.avisos);
    const estilos = estilosGlobales(vars, dd.estilo_diseno);
    await paso('tema', { paleta: vars.paleta, tipografia: vars.tipografia });

    // 3) Textos.
    let red = await redactar(brief, dd);
    await paso('textos', { modelo: red.model, ms: red.duracion_ms, tokens: red.usage, avisos: red.data._avisos });
    reporte.contenido = red.data;

    // 4) Sitio en el Multisite.
    const dominio = `sw-${slug}.${config.wpDominioBase}`;
    const sitio = await wp.crearSitio({ dominio, titulo: brief.negocio?.nombre || slug });
    const url = sitio.url.replace(/^http:/, 'https:');
    // Regenerar el mismo dominio: la fila anterior queda como histórico sin dominio.
    await q(`UPDATE sitios SET dominio=NULL, estado=CASE WHEN estado IN ('listo','requiere_revision') THEN 'reemplazado' ELSE estado END, actualizado=now() WHERE dominio=$1 AND id<>$2`, [dominio, sitioId]);
    await guardarSitio(sitioId, { dominio, blog_id_wp: sitio.blog_id, url_publica: url, estado: 'publicando' });
    await paso('sitio_wp', sitio);

    const fotos = await fotosDelSitio(entrevista.id, brief);
    const contacto = brief.contacto || {};
    const mensajeWa = contacto.mensaje_whatsapp_inicial || red.data.whatsapp_mensaje || `Hola, vi su página y quiero información.`;

    const publicar = async (cont, ajustes = {}) => {
      const medios = [];
      if (fotos.hero && !ajustes.heroSinFoto) medios.push({ clave: 'hero', url: fotos.hero.url, alt: cont.alt_hero || fotos.hero.descripcion_ia || brief.negocio?.nombre });
      if (fotos.sobre) medios.push({ clave: 'sobre', url: fotos.sobre.url, alt: cont.alt_sobre || fotos.sobre.descripcion_ia || '' });
      const ctx = {
        densidad: brief.marca?.densidad || 'media',
        wa: waUrl(contacto.whatsapp, mensajeWa),
        tel: contacto.telefono ? `tel:${String(contacto.telefono).replace(/[^\d+]/g, '')}` : null,
        contacto,
        medios: Object.fromEntries(medios.map((m) => [m.clave, m])),
      };
      const conf = brief.confianza || {};
      const contenido = paginaInicio({
        ...cont,
        confianza: { ...(cont.confianza || {}), cifras: (conf.cifras || []).filter((x) => x?.valor && x?.etiqueta), testimonios: (conf.testimonios || []).filter((t) => t?.texto && t?.autor), certificaciones: conf.certificaciones || [] },
      }, ctx);
      const menu = [
        { texto: cont.servicios?.titulo?.split(' ').slice(0, 2).join(' ') || 'Servicios', url: '#servicios' },
        ...(cont.faq?.length ? [{ texto: 'Preguntas', url: '#preguntas' }] : []),
        { texto: 'Contacto', url: '#contacto' },
      ];
      return wp.aplicar(sitio.blog_id, {
        estilos, fuentes_url: vars.googleFontsUrl, medios,
        paginas: [
          { slug: 'inicio', titulo: cont.titulo_sitio, contenido, inicio: true, descripcion: cont.descripcion_meta, plantilla: 'page-no-title' },
          { slug: 'aviso-de-privacidad', titulo: 'Aviso de privacidad', contenido: paginaTexto('Aviso de privacidad', avisoPrivacidad(brief)), descripcion: `Aviso de privacidad de ${brief.negocio?.nombre || ''}`, plantilla: 'page-no-title' },
        ],
        menu,
        opciones: {
          descripcion: cont.lema || cont.descripcion_meta, whatsapp: waUrl(contacto.whatsapp) ? String(contacto.whatsapp) : '', whatsapp_mensaje: mensajeWa,
          jsonld: jsonLd(brief, cont, url, arquetipo), llms: llmsTxt(brief, cont, url),
        },
      });
    };

    const ap = await publicar(red.data);
    await paso('publicado', { log: ap.log, paginas: ap.paginas });

    // 5) Dominio de vista previa (Traefik) si aún no responde.
    if (!(await wp.responde(url))) {
      const d = await wp.registrarDominioEasypanel(dominio);
      await paso('dominio', d);
      if (!d.ok) reporte.avisos.push(`Registrar en Easypanel el dominio ${dominio} → ${config.wpEasypanelServicio}:80`);
    }

    // 6) Auditoría + una corrección.
    let aud = await auditar(url);
    await guardarSitio(sitioId, { lighthouse_json: aud.lighthouse || null });
    await paso('auditoria_1', { p0: aud.p0, puntajes: aud.lighthouse?.puntajes, slop: aud.impeccable?.por_categoria });
    const plan = planCorreccion(aud);
    if (!aud.publicable && plan.hay) {
      if (plan.textos.length) red = await redactar(brief, dd, { correcciones: plan.textos });
      await publicar(red.data, plan.ajustes);
      aud = await auditar(url);
      await guardarSitio(sitioId, { lighthouse_json: aud.lighthouse || null });
      await paso('auditoria_2', { correcciones: plan, p0: aud.p0, puntajes: aud.lighthouse?.puntajes });
    }
    reporte.auditoria = { p0: aud.p0 || [], publicable: !!aud.publicable, captura: aud.propio?.captura?.url || null, impeccable: aud.impeccable?.hallazgos?.slice(0, 40) || [], propio: aud.propio?.checks || null };
    await guardarSitio(sitioId, { estado: aud.publicable ? 'listo' : 'requiere_revision', reporte, publicado: new Date() });
    await db.evento(entrevista.id, 'sitio_generado', { sitio_id: sitioId, url, publicable: !!aud.publicable });
    return { url, publicable: !!aud.publicable };
  } catch (err) {
    reporte.error = String(err.message || err).slice(0, 1000);
    reporte.error_stack = String(err.stack || '').split('\n').slice(0, 6).join(' | ');
    await guardarSitio(sitioId, { estado: 'error', reporte }).catch(() => {});
    console.error('generarSitio', sitioId, err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Rutas                                                               */
/* ------------------------------------------------------------------ */

async function encolar(entrevista, { slug, forzarWordpress }) {
  const plat = entrevista.brief?.plataforma?.plataforma || entrevista.brief?.plataforma;
  if (plat === 'app' && !forzarWordpress) throw new HttpError(409, 'El brief salió para plataforma "app"; usa forzar_wordpress:true para generar una landing en WordPress.');
  const s = slugify(slug || entrevista.brief?.negocio?.nombre || entrevista.id.slice(0, 8));
  const r = await q(`INSERT INTO sitios (entrevista_id, estado) VALUES ($1,'generando') RETURNING id`, [entrevista.id]);
  const sitioId = r.rows[0].id;
  generarSitio(sitioId, entrevista, { slug: s }).catch(() => {}); // segundo plano; el estado queda en la tabla sitios
  return { sitio_id: sitioId, slug: s, estado: 'generando' };
}

export function registerGeneradorRoutes(app, wrap) {
  const auth = (c) => { if (!igual(c.req.header('x-api-key'), config.entrevistaApiKey)) throw new HttpError(401, 'X-API-Key inválida'); };

  app.post('/entrevista/v1/sesiones/:id/generar', wrap(async (c) => {
    auth(c);
    const b = await c.req.json().catch(() => ({}));
    const e = await db.obtener(c.req.param('id'));
    if (!e) throw new HttpError(404, 'no existe');
    return c.json(await encolar(e, { slug: b.slug, forzarWordpress: !!b.forzar_wordpress }), 202);
  }));

  // Piloto: brief directo, sin entrevista por WhatsApp. Crea una entrevista "completada" para enlazar el sitio.
  app.post('/entrevista/v1/generar', wrap(async (c) => {
    auth(c);
    const b = await c.req.json().catch(() => { throw new HttpError(400, 'JSON inválido'); });
    if (!b.brief?.negocio?.nombre) throw new HttpError(400, 'brief.negocio.nombre es obligatorio');
    const id = crypto.randomUUID();
    await db.crear({ id, usuario_id: b.usuario_id || `piloto-${id.slice(0, 8)}`, canal: 'piloto', metadata: { origen: 'generar_directo' } });
    await db.guardar(id, { brief: b.brief, estado: 'completada', nombre: b.brief.negocio.nombre, arquetipo_slug: b.brief.negocio.arquetipo || null });
    for (const [i, f] of (b.fotos || []).entries()) await db.insertarAsset(id, { clave: f.clave || `foto${i + 1}`, tipo: f.tipo || 'foto_otro', url: f.url, calidad: f.calidad || 'buena', descripcion_ia: f.descripcion || null });
    const e = await db.obtener(id);
    return c.json({ sesion_id: id, ...(await encolar(e, { slug: b.slug, forzarWordpress: true })) }, 202);
  }));

  app.get('/entrevista/v1/sitios/:id', wrap(async (c) => {
    auth(c);
    const r = await q(`SELECT * FROM sitios WHERE id=$1`, [Number(c.req.param('id'))]);
    if (!r.rows[0]) throw new HttpError(404, 'no existe');
    return r.rows[0];
  }));

  app.get('/entrevista/v1/generador/salud', wrap(async (c) => {
    auth(c);
    return { wp: await wp.salud().catch((e) => ({ error: e.message })), render: !!config.renderUrl };
  }));
}
