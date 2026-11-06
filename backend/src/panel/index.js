// Sitio en vivo + panel del dueño.
// En el dominio del cliente (dominios_cliente.modo = 'vivo'):
//   GET  /                          sitio armado desde la base (caché por versión)
//   GET  /admin                     panel (pantalla de acceso o de edición)
//   *    /admin/api/...             API del panel (sesión por cookie)
//   GET  /admin/google, /admin/sso  entrar con Google (ida y regreso por ACCESO_URL)
// En el host de la API: /s/<slug> (vista previa, noindex) y /s/<slug>/admin (mismo panel, para el equipo y pruebas).
//   GET  /acceso/google/callback    regreso de Google (dominio neutro)
//   POST /entrevista/v1/sesiones/:id/sitio-vivo  {dominio?}   alta del sitio en vivo (X-API-Key)
//   GET  /entrevista/v1/sitios-vivos/:id                      estado (X-API-Key)
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { HttpError } from '../util.js';
import * as db from '../entrevista/db.js';
import { analizarAsset, VERSION as VERSION_ANALISIS } from '../generador/materiales.js';
import { asignarDominio, registrarModo } from '../generador/dominios.js';
import { procesarMateriales } from '../generador/materiales.js';
import * as S from './sitios.js';
import * as A from './sesion.js';
import { paginaPanel } from './pagina.js';
import { enviarCodigo } from '../correo_codigos.js';
import { entregarAcceso } from '../entrevista/entrega.js';
import * as P from './propiedades.js';
import * as PUB from './publicador.js';

const q = db.q;
const DIR_SUBIDAS = path.join(config.dataDir, 'chat'); // mismas rutas públicas que el chat: /chat/archivos/<nombre>
const TIPOS_IMG = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const TIPOS_FOTO = ['logo', 'foto_local', 'foto_trabajo', 'foto_producto', 'foto_equipo', 'foto_fundador', 'menu', 'catalogo'];
const igual = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return y.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); };

// Límite por IP para pedir y validar códigos.
const golpes = new Map();
function limitar(c, n = 12) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'x';
  const ahora = Date.now();
  const l = (golpes.get(ip) || []).filter((t) => ahora - t < 10 * 60000);
  if (l.length >= n) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
  l.push(ahora); golpes.set(ip, l);
}

const json = (c, data, status = 200) => c.json(data, status, { 'cache-control': 'no-store' });
const err = (c, e) => { const s = e.status || (e instanceof HttpError ? e.status : 400); if (s >= 500) console.error('[panel]', e); return json(c, { error: e.message || 'Error' }, s); };

async function fotosDe(e, sv) {
  const portada = sv.contenido?.fotos?.portada_asset_id || e.brief?.fotos?.vertical_hero_asset_id || null;
  return (await db.assetsDe(e.id))
    .filter((a) => /^image\//.test(a.mime || '') || /\.(jpe?g|png|webp|heic)(\?|$)/i.test(a.url))
    .map((a) => ({ id: a.id, url: a.analisis?.contenido?.url || a.url, tipo: a.analisis?.tipo || a.tipo, usar: a.usar, portada: String(portada) === String(a.id) || portada === a.clave, descripcion: a.descripcion_ia || '' }));
}

/** Atiende /admin y /admin/api/* para un sitio. base = '' en su dominio o '/s/<slug>' en el host de la API. */
async function atenderPanel(c, sv, base, ruta) {
  const cookiePath = base || '/';
  const negocio = async () => (await db.obtener(sv.entrevista_id))?.brief?.negocio?.nombre || '';
  try {
    if (ruta === '/admin' && c.req.method === 'GET') return c.html(paginaPanel({ base, negocio: await negocio(), google: A.googleActivo() }), 200, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
    if (ruta === '/admin/google' && c.req.method === 'GET') {
      if (!A.googleActivo()) return c.redirect(`${base}/admin`, 302);
      return c.redirect(await A.urlGoogle(sv), 302);
    }
    // Enlace mágico permanente que Ari le manda al dueño por el chat.
    const ml = ruta.match(/^\/admin\/llave\/([A-Za-z0-9_-]{20,64})$/);
    if (ml && c.req.method === 'GET') {
      await S.migrarPanel();
      const fresco = await S.porId(sv.id);
      if (!fresco?.llave || !igual(ml[1], fresco.llave)) return c.redirect(`${base}/admin?error=llave`, 302);
      await A.emitirSesion(c, fresco, 'enlace', cookiePath);
      return c.redirect(`${base}/admin`, 302);
    }
    if (ruta === '/admin/sso' && c.req.method === 'GET') {
      if (!(await A.canjearPase(sv, c.req.query('pase')))) return c.redirect(`${base}/admin?error=google`, 302);
      await A.emitirSesion(c, sv, 'google', cookiePath);
      return c.redirect(`${base}/admin`, 302);
    }
    if (!ruta.startsWith('/admin/api/')) return null;
    const api = ruta.slice('/admin/api'.length);
    // Peticiones que cambian algo: solo desde el propio panel (cabecera propia; un formulario de otro sitio no puede ponerla).
    if (c.req.method !== 'GET' && c.req.header('x-panel') !== '1') return json(c, { error: 'Petición no permitida' }, 403);

    if (api === '/yo' && c.req.method === 'GET') {
      const s = await A.sesionDe(c, sv);
      const [u = '', d = ''] = String(sv.admin_email || '').split('@');
      const pista = u && d ? `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}` : '';
      return json(c, { sesion: !!s, google: A.googleActivo(), negocio: await negocio(), pista, email: s ? sv.admin_email : null });
    }
    if (api === '/codigo' && c.req.method === 'POST') {
      limitar(c, 8);
      const b = await c.req.json().catch(() => ({}));
      const r = await A.pedirCodigo(sv, b.email, await negocio());
      return json(c, r.ok ? { ok: true } : { error: r.error }, r.ok ? 200 : 503);
    }
    if (api === '/entrar' && c.req.method === 'POST') {
      limitar(c, 20);
      const b = await c.req.json().catch(() => ({}));
      if (!(await A.validarCodigo(sv, b.email, b.codigo))) return json(c, { error: 'El código no es correcto o ya venció. Pide uno nuevo.' }, 401);
      await A.emitirSesion(c, sv, 'codigo_correo', cookiePath);
      return json(c, { ok: true });
    }
    if (api === '/salir' && c.req.method === 'POST') { A.cerrarSesion(c, sv, cookiePath); return json(c, { ok: true }); }

    // De aquí en adelante, solo con sesión del dueño.
    if (!(await A.sesionDe(c, sv))) return json(c, { error: 'Tu sesión terminó. Vuelve a entrar.' }, 401);
    const e = await db.obtener(sv.entrevista_id);

    if (api === '/contenido' && c.req.method === 'GET') {
      const mat = await procesarMateriales(e.id, e.brief || {}, { aceptarLoQueHay: true }).catch(() => null);
      return json(c, { version: sv.version, sitio: sv.dominio ? `https://${sv.dominio}/` : `${config.publicUrl}/s/${sv.slug}`, contenido: S.contenidoActual(e, sv, mat), fotos: await fotosDe(e, sv) });
    }
    const m = api.match(/^\/contenido\/([a-z]+)$/);
    if (m && c.req.method === 'PUT') {
      if (!S.SECCIONES.includes(m[1])) return json(c, { error: 'Sección desconocida' }, 404);
      const b = await c.req.json().catch(() => ({}));
      const nuevo = await S.guardarSeccion(sv, m[1], b);
      return json(c, { ok: true, version: nuevo.version, contenido: nuevo.contenido[m[1]] });
    }
    if (api === '/fotos' && c.req.method === 'POST') {
      const form = await c.req.parseBody();
      const f = form.archivo;
      const tipo = TIPOS_FOTO.includes(String(form.tipo)) ? String(form.tipo) : null;
      if (!f || typeof f === 'string') return json(c, { error: 'Falta la foto' }, 400);
      const mime = String(f.type || '').split(';')[0];
      if (!TIPOS_IMG[mime]) return json(c, { error: 'Sube la foto en JPG, PNG o WEBP' }, 415);
      if (f.size > 16 * 1024 * 1024) return json(c, { error: 'La foto pesa más de 16 MB' }, 413);
      await fs.mkdir(DIR_SUBIDAS, { recursive: true });
      const nombre = `${crypto.randomBytes(12).toString('base64url').replace(/_/g, '-')}.${TIPOS_IMG[mime]}`;
      await fs.writeFile(path.join(DIR_SUBIDAS, nombre), Buffer.from(await f.arrayBuffer()));
      const url = `${config.publicUrl}/chat/archivos/${nombre}`;
      const n = (await db.assetsDe(e.id)).length;
      const a = await db.insertarAsset(e.id, { clave: `panel${n + 1}`, tipo: tipo || 'foto_otro', url, mime, nota: 'subida desde el panel', calidad: 'buena', usar: true });
      let analisis = await analizarAsset(a, { negocio: e.brief?.negocio?.nombre || '' }).catch((x) => { console.error('[panel] análisis', x.message); return null; });
      // Lo que el dueño dice que es la foto manda sobre lo que detecta la visión.
      if (tipo) {
        analisis = analisis || { version: VERSION_ANALISIS, tipo, calidad: 'buena', descripcion: '', colores: [], contenido: { url, ancho: 1200, alto: 1200 }, productos: [] };
        analisis.tipo = tipo;
        if (tipo === 'logo' && !analisis.logo) analisis.logo = { url: analisis.contenido.url, ancho: analisis.contenido.ancho, alto: analisis.contenido.alto, colores: analisis.colores || [], propio: true, mono: false };
        if (tipo === 'logo') analisis.logo.propio = true;
        await q(`UPDATE assets SET analisis=$2, tipo=$3 WHERE id=$1`, [a.id, JSON.stringify(analisis), tipo]);
      }
      // Logo nuevo: el anterior deja de usarse.
      if (tipo === 'logo') await q(`UPDATE assets SET usar=false WHERE entrevista_id=$1 AND id<>$2 AND (tipo='logo' OR analisis->>'tipo'='logo')`, [e.id, a.id]);
      const nuevo = await S.subirVersion(sv);
      return json(c, { ok: true, version: nuevo.version, fotos: await fotosDe(e, nuevo) });
    }
    const mf = api.match(/^\/fotos\/(\d+)$/);
    if (mf && c.req.method === 'PATCH') {
      const b = await c.req.json().catch(() => ({}));
      const a = (await db.assetsDe(e.id)).find((x) => x.id === Number(mf[1]));
      if (!a) return json(c, { error: 'Foto no encontrada' }, 404);
      if (typeof b.usar === 'boolean') await q(`UPDATE assets SET usar=$2 WHERE id=$1`, [a.id, b.usar]);
      const parche = b.portada === true ? { fotos: { ...(sv.contenido?.fotos || {}), portada_asset_id: a.id } } : null;
      if (b.portada === true && !a.usar) await q(`UPDATE assets SET usar=true WHERE id=$1`, [a.id]);
      const nuevo = await S.subirVersion(sv, parche);
      return json(c, { ok: true, version: nuevo.version, fotos: await fotosDe(e, nuevo) });
    }
    /* ---------- Propiedades (inmobiliarias) ---------- */
    if (api.startsWith('/propiedades') || api.startsWith('/redes')) {
      await P.migrarPropiedades();
      const svp = await S.porId(sv.id); // con la columna publicador
      const urlBase = svp.dominio ? `https://${svp.dominio}` : `${config.publicUrl}/s/${svp.slug}`;
      const vista = (p) => ({ id: p.id, slug: p.slug, datos: p.datos, imagenes: p.imagenes, vistas: p.vistas, url: `${urlBase}/propiedad/${p.slug}`, publicaciones: (p.publicaciones || []).slice(-10) });
      const refrescar = () => S.subirVersion(svp);
      if (api === '/propiedades' && c.req.method === 'GET') {
        let cuentas = [], errorRedes = null;
        try { cuentas = await PUB.cuentas(svp); } catch (x) { errorRedes = x.message; }
        return json(c, { propiedades: (await P.listar(svp.id)).map(vista), redes: { activo: PUB.publicadorActivo(), cuentas, error: errorRedes } });
      }
      if (api === '/propiedades' && c.req.method === 'POST') {
        const p = await P.crear(svp.id, await c.req.json().catch(() => ({})));
        await refrescar();
        return json(c, { ok: true, propiedad: vista(p) });
      }
      if (api === '/propiedades/orden' && c.req.method === 'POST') {
        const b = await c.req.json().catch(() => ({}));
        await P.ordenar(svp.id, b.ids); await refrescar();
        return json(c, { ok: true });
      }
      const mp = api.match(/^\/propiedades\/(\d+)(\/fotos|\/publicar|\/publicaciones)?$/);
      if (mp) {
        const p = await P.obtener(svp.id, mp[1]);
        if (!p) return json(c, { error: 'Propiedad no encontrada' }, 404);
        if (!mp[2] && c.req.method === 'PUT') { const n = await P.actualizar(svp.id, p.id, await c.req.json().catch(() => ({}))); await refrescar(); return json(c, { ok: true, propiedad: vista(n) }); }
        if (!mp[2] && c.req.method === 'DELETE') { await P.borrar(svp.id, p.id); await refrescar(); return json(c, { ok: true }); }
        if (mp[2] === '/fotos' && c.req.method === 'POST') {
          const form = await c.req.parseBody({ all: true });
          const archivos = [].concat(form.archivo || []).filter((f) => f && typeof f !== 'string');
          if (!archivos.length) return json(c, { error: 'Falta la foto' }, 400);
          const nuevas = [];
          await fs.mkdir(DIR_SUBIDAS, { recursive: true });
          for (const f of archivos.slice(0, 20)) {
            const mime = String(f.type || '').split(';')[0];
            if (!TIPOS_IMG[mime]) return json(c, { error: 'Sube las fotos en JPG, PNG o WEBP' }, 415);
            if (f.size > 16 * 1024 * 1024) return json(c, { error: 'Una foto pesa más de 16 MB' }, 413);
            const nombre = `${crypto.randomBytes(12).toString('base64url').replace(/_/g, '-')}.${TIPOS_IMG[mime]}`;
            await fs.writeFile(path.join(DIR_SUBIDAS, nombre), Buffer.from(await f.arrayBuffer()));
            nuevas.push(`${config.publicUrl}/chat/archivos/${nombre}`);
          }
          const n = await P.ponerImagenes(svp.id, p.id, [...(p.imagenes || []), ...nuevas]);
          await refrescar();
          return json(c, { ok: true, propiedad: vista(n) });
        }
        if (mp[2] === '/fotos' && c.req.method === 'PUT') {
          // Reordenar o quitar: el panel manda la lista completa (solo de las que ya tiene).
          const b = await c.req.json().catch(() => ({}));
          const n = await P.ponerImagenes(svp.id, p.id, (b.imagenes || []).filter((u) => (p.imagenes || []).includes(u)));
          await refrescar();
          return json(c, { ok: true, propiedad: vista(n) });
        }
        if (mp[2] === '/publicar' && c.req.method === 'POST') {
          const b = await c.req.json().catch(() => ({}));
          const pubs = await PUB.publicarPropiedad(svp, e, p, { conexion_ids: b.conexion_ids, url: `${urlBase}/propiedad/${p.slug}` });
          await P.registrarPublicacion(svp.id, p.id, { fecha: new Date().toISOString(), ids: pubs.map((x) => x.id), redes: pubs.map((x) => x.red) });
          await db.evento(e.id, 'propiedad_publicada', { propiedad_id: p.id, publicaciones: pubs.length });
          return json(c, { ok: true, publicaciones: pubs });
        }
        if (mp[2] === '/publicaciones' && c.req.method === 'GET') {
          const ids = (p.publicaciones || []).flatMap((x) => x.ids || []).slice(-20);
          return json(c, { publicaciones: ids.length ? await PUB.estadoPublicaciones(ids) : [] });
        }
      }
      if (api === '/redes/conectar' && c.req.method === 'POST') {
        const mat = await procesarMateriales(e.id, e.brief || {}, { aceptarLoQueHay: true }).catch(() => null);
        const paleta = S.disenoElegido(e.brief)?.paleta || {};
        const url = await PUB.ligaConexion(svp, e, { logo: mat?.logo?.url || null, colores: [paleta.p || paleta.primary, paleta.fg, paleta.bg].filter(Boolean) });
        return json(c, { url });
      }
    }
    return json(c, { error: 'No encontrado' }, 404);
  } catch (e) { return err(c, e); }
}

/** Ficha pública de una propiedad (/propiedad/<slug>), con el diseño del sitio. */
async function servirPropiedad(c, sv, slug, { previa }) {
  try {
    const p = await P.porSlug(sv.id, slug);
    if (!p || !P.VISIBLES.includes(p.datos.estado)) return c.redirect(previa ? `/s/${sv.slug}` : '/', 302);
    const e = await db.obtener(sv.entrevista_id);
    const base = previa ? `/s/${sv.slug}` : '';
    const url = previa ? `${config.publicUrl}/s/${sv.slug}/propiedad/${p.slug}` : `https://${sv.dominio}/propiedad/${p.slug}`;
    const html = await S.renderSitio(sv, { previa });
    const wa = String(sv.contenido?.contacto?.whatsapp || e?.brief?.contacto?.whatsapp || '').replace(/\D/g, '');
    P.contarVista(p.id);
    return c.html(P.paginaPropiedad(html, p, { base, url, negocio: e?.brief?.negocio?.nombre || '', wa: wa ? (wa.length === 10 ? `52${wa}` : wa) : null }), 200, { 'cache-control': 'no-cache', ...(previa ? { 'x-robots-tag': 'noindex' } : {}) });
  } catch (x) {
    console.error('[propiedad]', sv.id, slug, x);
    return c.redirect(previa ? `/s/${sv.slug}` : '/', 302);
  }
}

async function servirSitio(c, sv, { previa }) {
  try {
    const html = await S.renderSitio(sv, { previa });
    return c.html(html, 200, { 'cache-control': 'no-cache', ...(previa ? { 'x-robots-tag': 'noindex' } : {}) });
  } catch (e) {
    console.error('[sitio vivo]', sv.id, e);
    return c.html('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>En mantenimiento</title><p style="font:18px system-ui;padding:40px;text-align:center">Estamos actualizando esta página. Vuelve en unos minutos.</p>', 503);
  }
}

/** Modo "vivo" del middleware de dominios. */
async function modoVivo(c, reg, next, host) {
  await S.migrarPanel();
  const sv = (await q(`SELECT * FROM sitios_vivos WHERE dominio=$1`, [host])).rows[0];
  if (!sv || sv.estado !== 'activo') return c.text('Sitio no disponible', 404);
  const ruta = c.req.path.replace(/\/+$/, '') || '/';
  if (ruta === '/') return servirSitio(c, sv, { previa: false });
  if (ruta === '/admin' || ruta.startsWith('/admin/')) return (await atenderPanel(c, sv, '', ruta)) || c.text('No encontrado', 404);
  const mprop = ruta.match(/^\/propiedad\/([a-z0-9-]{1,80})$/);
  if (mprop) return servirPropiedad(c, sv, mprop[1], { previa: false });
  if (ruta === '/robots.txt') return c.text(`User-agent: *\nDisallow: /admin\nSitemap: https://${host}/sitemap.xml\n`);
  if (ruta === '/sitemap.xml') {
    const props = await P.listar(sv.id, { publicas: true }).catch(() => []);
    const urls = [`<url><loc>https://${host}/</loc><lastmod>${new Date(sv.actualizado).toISOString().slice(0, 10)}</lastmod></url>`, ...props.map((p) => `<url><loc>https://${host}/propiedad/${p.slug}</loc><lastmod>${new Date(p.actualizado).toISOString().slice(0, 10)}</lastmod></url>`)];
    return c.body(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, 200, { 'content-type': 'application/xml' });
  }
  if (ruta.startsWith('/chat/archivos/') || ruta.startsWith('/files/')) return next();
  return c.redirect('/', 302);
}

export function registerPanelRoutes(app, wrap) {
  registrarModo('vivo', modoVivo);
  const auth = (c) => { if (!igual(c.req.header('x-api-key'), config.entrevistaApiKey)) throw new HttpError(401, 'X-API-Key inválida'); };

  // Vista previa y panel en el host de la API.
  app.all('/s/:slug/*', async (c) => {
    await S.migrarPanel();
    const sv = await S.porSlug(c.req.param('slug'));
    if (!sv) return c.text('No encontrado', 404);
    const base = `/s/${sv.slug}`;
    const ruta = c.req.path.slice(base.length).replace(/\/+$/, '') || '/';
    if (ruta === '/') return servirSitio(c, sv, { previa: true });
    const mprop = ruta.match(/^\/propiedad\/([a-z0-9-]{1,80})$/);
    if (mprop) return servirPropiedad(c, sv, mprop[1], { previa: true });
    return (await atenderPanel(c, sv, base, ruta)) || c.text('No encontrado', 404);
  });
  app.get('/s/:slug', async (c) => {
    await S.migrarPanel();
    const sv = await S.porSlug(c.req.param('slug'));
    return sv ? servirSitio(c, sv, { previa: true }) : c.text('No encontrado', 404);
  });

  // Regreso de Google (dominio neutro): valida la cuenta y manda al panel del cliente con un pase de un solo uso.
  app.get('/acceso/google/callback', async (c) => {
    await S.migrarPanel();
    const r = await A.callbackGoogle({ code: c.req.query('code'), state: c.req.query('state') }, S.porId);
    if (r.wp) {
      if (r.wp.pase) return c.redirect(`${r.wp.url}?pase=${encodeURIComponent(r.wp.pase)}`, 302);
      return c.redirect(`${r.wp.url}?error=${encodeURIComponent(r.error || 'No se pudo entrar con Google')}`, 302);
    }
    const destino = r.sv ? (r.sv.dominio ? `https://${r.sv.dominio}` : `${config.publicUrl}/s/${r.sv.slug}`) : null;
    if (r.pase) return c.redirect(`${destino}/admin/sso?pase=${encodeURIComponent(r.pase)}`, 302);
    const volver = destino ? `<p><a href="${destino}/admin">Volver a intentarlo</a></p>` : '';
    return c.html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>No se pudo entrar</title><div style="font:17px/1.5 system-ui;max-width:440px;margin:60px auto;padding:0 20px"><h1 style="font-size:22px">No se pudo entrar</h1><p>${String(r.error || '').replace(/[<>&]/g, '')}</p>${volver}</div>`, 400);
  });

  // WordPress (mu-plugin iaprop-acceso): el sitio genera el código y aquí solo se manda por el servicio de correo.
  const authWp = (c) => { if (!config.wpGenKey || config.wpGenKey.length < 24 || !igual(c.req.header('x-iaprop-key'), config.wpGenKey)) throw new HttpError(401, 'X-IAprop-Key inválida'); };
  const porCorreo = new Map();
  app.post('/acceso/v1/enviar-codigo', wrap(async (c) => {
    authWp(c);
    const b = await c.req.json().catch(() => ({}));
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || !/^\d{6}$/.test(String(b.codigo || ''))) throw new HttpError(400, 'datos inválidos');
    const ahora = Date.now(); const l = (porCorreo.get(email) || []).filter((t) => ahora - t < 3600000);
    if (l.length >= 8) throw new HttpError(429, 'demasiados códigos');
    l.push(ahora); porCorreo.set(email, l);
    const r = await enviarCodigo(email, String(b.codigo), { negocio: String(b.negocio || '').slice(0, 80), motivo: 'acceso' });
    if (!r.entregado) throw new HttpError(503, 'no se pudo enviar');
    return { ok: true };
  }));
  app.get('/acceso/google/wp', async (c) => {
    const u = A.googleActivo() ? await A.urlGoogleWp(c.req.query('d'), c.req.query('s')) : null;
    if (u) return c.redirect(u, 302);
    return c.text('La liga para entrar ya venció. Vuelve a intentarlo desde tu página.', 400);
  });

  app.post('/entrevista/v1/sesiones/:id/sitio-vivo', wrap(async (c) => {
    auth(c);
    const e = await db.obtener(c.req.param('id'));
    if (!e) throw new HttpError(404, 'no existe');
    const b = await c.req.json().catch(() => ({}));
    const dominio = b.dominio ? String(b.dominio).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null;
    if (dominio && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) throw new HttpError(400, 'dominio inválido');
    let sv = await S.crearSitioVivo(e, { dominio, slug: b.slug }).catch((x) => { throw new HttpError(x.status || 500, x.message); });
    if (dominio && sv.dominio !== dominio) sv = (await q(`UPDATE sitios_vivos SET dominio=$2, actualizado=now() WHERE id=$1 RETURNING *`, [sv.id, dominio])).rows[0];
    if (dominio) {
      await asignarDominio({ dominio, entrevista_id: e.id, modo: 'vivo', datos: { nombre: e.brief?.negocio?.nombre, sitio_vivo_id: sv.id } });
      // Si el dominio ya tiene HTTPS, el acceso se entrega de una vez; si no, lo hace el cron en cuanto responda.
      entregarAcceso(e.id, { dominio, panel: 'panel_propio', sitio_vivo_id: sv.id }).catch((x) => console.error('entrega', x.message));
    }
    return { sitio_vivo_id: sv.id, slug: sv.slug, previa: `${config.publicUrl}/s/${sv.slug}`, panel_previa: `${config.publicUrl}/s/${sv.slug}/admin`, dominio: sv.dominio, url: sv.dominio ? `https://${sv.dominio}/` : null, admin: sv.dominio ? `https://${sv.dominio}/admin` : null, admin_email: sv.admin_email };
  }));

  // Rehacer como sitio en vivo una entrevista hecha en WordPress: {enviar?, reinterpretar?} (reinterpreta todo el historial).
  app.post('/entrevista/v1/sesiones/:id/rehacer-app', wrap(async (c) => {
    auth(c);
    const b = await c.req.json().catch(() => ({}));
    const { rehacerComoApp } = await import('./rehacer.js');
    return rehacerComoApp(c.req.param('id'), { enviar: b.enviar === true, reinterpretar: b.reinterpretar !== false }).catch((x) => { throw new HttpError(x.status || 500, x.message); });
  }));
  // Elegir la propuesta por fuera del chat (p. ej. pilotos sin cliente) y crear el sitio en vivo: {elegido:"A", colores_de?}.
  app.post('/entrevista/v1/sesiones/:id/rehacer-app/elegir', wrap(async (c) => {
    auth(c);
    const b = await c.req.json().catch(() => ({}));
    const { elegirYCrear } = await import('./rehacer.js');
    return elegirYCrear(c.req.param('id'), { elegido: String(b.elegido || '').toUpperCase(), colores_de: b.colores_de || null }).catch((x) => { throw new HttpError(x.status || 500, x.message); });
  }));

  app.get('/entrevista/v1/sitios-vivos/:id', wrap(async (c) => {
    auth(c);
    await S.migrarPanel();
    const sv = await S.porId(c.req.param('id'));
    if (!sv) throw new HttpError(404, 'no existe');
    const cambios = (await q(`SELECT seccion, creado FROM panel_cambios WHERE sitio_id=$1 ORDER BY id DESC LIMIT 20`, [sv.id])).rows;
    return { ...sv, cambios };
  }));
}
