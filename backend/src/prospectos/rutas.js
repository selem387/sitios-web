// Ligas cortas y páginas de prospección en timewins.site y timewins.online (modo "prospeccion" de dominios_cliente).
//   /p/<folio>            prospecto: sus 6 opciones con "¿Te gusta esta?" · Blanca/Sebastián (con sesión): ficha completa
//   /p/<folio>/<1-6>      una opción a pantalla completa con barra "Me gusta esta"
//   /w/<folio>/<1-6>      registra la opción elegida en la sesión del constructor y abre WhatsApp a Blanca
//   /w/<folio>            WhatsApp a Blanca sin opción
//   /baja/<folio>         no recibir más correos
//   /acceso/<token>       enlace mágico permanente (Blanca: atención · Sebastián: admin)
//   /prospectos           lista por giro; el admin autoriza la construcción por negocio o por giro
//   /prospectos/chat/<folio>  abre el chat de Ari en la sesión de ese prospecto
// En el host de la API todo cuelga de /pr (pruebas antes del DNS): /pr/p/<folio>, /pr/prospectos…
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';
import * as edb from '../entrevista/db.js';
import { DIR_PROPUESTAS } from '../generador/propuestas_html.js';
import { registrarModo } from '../generador/dominios.js';
import * as pdb from './db.js';
import { encolar, enCola, usuarioDe, reanudar } from './construir.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LETRAS = 'ABCDEFGH';
const WA_BLANCA = () => (process.env.PROSPECCION_WA_ATENCION || '529992632568').replace(/\D/g, '');
const DOMINIOS = () => String(process.env.PROSPECCION_DOMINIOS || 'timewins.site,timewins.online').split(',').map((x) => x.trim()).filter(Boolean);
const COOKIE = 'tw_pr';
const secreto = () => new TextEncoder().encode(`pr:${config.panelSecret || 'cambia-PANEL_SECRET'}`);
const hash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

/* ---------------- Sesión (enlace mágico permanente) ---------------- */
export async function crearAcceso(nombre, rol) {
  await pdb.migrar();
  const token = crypto.randomBytes(18).toString('base64url');
  await pdb.q(`INSERT INTO prospeccion.accesos (token_hash, nombre, rol) VALUES ($1,$2,$3)`, [hash(token), nombre, rol]);
  return token;
}
async function sesion(c) {
  const m = String(c.req.header('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], secreto());
    const a = (await pdb.q(`SELECT * FROM prospeccion.accesos WHERE id=$1 AND activo`, [payload.aid])).rows[0];
    return a ? { id: a.id, nombre: a.nombre, rol: a.rol } : null;
  } catch { return null; }
}
async function ponerSesion(c, a) {
  const jwt = await new SignJWT({ aid: a.id }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('3650d').sign(secreto());
  c.header('set-cookie', `${COOKIE}=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${3650 * 86400}; Secure`, { append: true });
}

/* ---------------- Páginas ---------------- */
const FUENTES = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Hanken+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">';
const BASE_CSS = `*{box-sizing:border-box;margin:0}body{background:#F6F1E8;color:#2A2420;font-family:'Hanken Grotesk',system-ui,sans-serif;line-height:1.5}
a{color:inherit}.w{max-width:1080px;margin:0 auto;padding:28px 16px 64px}h1,h2{font-family:'Bricolage Grotesque',sans-serif;line-height:1.1}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;font-weight:700;text-decoration:none;border:0;cursor:pointer;font:inherit;font-weight:700}
.wa{background:#1F7A4D;color:#fff}.sec{background:#fff;color:#2A2420;border:1px solid #DDD2C2}.btn:focus-visible{outline:3px solid #2A2420;outline-offset:3px}
.muted{color:#6B5E52}`;
const pagina = (titulo, cuerpo, extraCss = '') => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(titulo)}</title>${FUENTES}<style>${BASE_CSS}${extraCss}</style></head><body>${cuerpo}</body></html>`;

function selectorProspecto(n, base) {
  const ops = n.opciones || [];
  const css = `header{text-align:center;max-width:640px;margin:0 auto}h1{font-size:clamp(28px,6vw,42px);margin-top:6px}header p{margin-top:10px;color:#6B5E52}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin-top:28px}
.op{background:#fff;border:1px solid #E5DACB;border-radius:20px;overflow:hidden;display:flex;flex-direction:column}
.vista{position:relative;aspect-ratio:4/5;overflow:hidden;background:#EFE7DA}.vista iframe{position:absolute;top:0;left:0;width:390px;height:780px;border:0;transform-origin:0 0;pointer-events:none}
.pie{padding:14px 16px;display:flex;flex-direction:column;gap:10px}.pie b{font-size:17px}.acc{display:flex;gap:10px;flex-wrap:wrap}.acc .btn{flex:1 1 120px}
footer{text-align:center;margin-top:36px;font-size:14px}`;
  const cards = ops.map((o, i) => `<article class="op"><a class="vista" href="${base}/p/${n.folio}/${i + 1}" aria-label="Ver la opción ${i + 1} completa"><iframe src="${base}/p/${n.folio}/${i + 1}?vista=1" loading="lazy" tabindex="-1" title="Vista previa de la opción ${i + 1}"></iframe></a>
<div class="pie"><b>Opción ${i + 1} · ${esc(o.nombre)}</b><div class="acc"><a class="btn sec" href="${base}/p/${n.folio}/${i + 1}">Verla completa</a><a class="btn wa" href="${base}/w/${n.folio}/${i + 1}">¿Te gusta? Elígela</a></div></div></article>`).join('');
  const js = `<script>function ajustar(){document.querySelectorAll('.vista').forEach(function(v){var f=v.querySelector('iframe');f.style.transform='scale('+(v.clientWidth/390)+')'})}addEventListener('resize',ajustar);ajustar();</script>`;
  return pagina(`${n.nombre} · ${ops.length} opciones de página`, `<div class="w"><header><p class="muted">Hecho para ${esc(n.nombre)}</p><h1>Te hicimos ${ops.length} opciones de página web</h1><p>Las armamos con tus fotos de Google Maps y tus redes. Ábrelas en tu celular y, si alguna te gusta, elígela: te atendemos por WhatsApp para terminarla con tu información.</p></header><div class="g">${cards}</div>
<footer class="muted">¿Dudas? <a href="${base}/w/${n.folio}">Escríbenos por WhatsApp</a> · <a href="${base}/baja/${n.folio}">No quiero recibir más correos</a></footer></div>${js}`, css);
}

async function opcionHtml(n, i, base, { vista = false } = {}) {
  const letra = LETRAS[i - 1];
  let html = await fs.readFile(path.join(DIR_PROPUESTAS, n.token, `${letra}.html`), 'utf8');
  if (vista) return html;
  const barra = `<div id="tw-elige" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(20,18,16,.92);backdrop-filter:blur(8px);font:600 15px/1.3 system-ui,sans-serif;color:#fff">
<a href="${base}/p/${n.folio}" style="color:#fff;text-decoration:underline;min-height:44px;display:inline-flex;align-items:center">‹ Ver las 6</a>
<span>¿Te gusta la opción ${i}?</span><a href="${base}/w/${n.folio}/${i}" style="background:#25D366;color:#0B2B17;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:800;min-height:44px;display:inline-flex;align-items:center">Sí, quiero esta</a></div><div style="height:84px"></div>`;
  return html.replace(/<\/body>/i, `${barra}</body>`);
}

function fichaBlanca(n, s, base, extra) {
  const ig = n.redes?.instagram && typeof n.redes.instagram === 'object' ? n.redes.instagram : null;
  const fb = n.redes?.facebook && typeof n.redes.facebook === 'object' ? n.redes.facebook : null;
  const fila = (k, v) => (v ? `<tr><th>${esc(k)}</th><td>${v}</td></tr>` : '');
  const link = (u, t) => (u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t || u)}</a>` : '');
  const css = `.top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}h1{font-size:clamp(26px,5vw,38px)}
.chip{display:inline-block;padding:4px 12px;border-radius:999px;background:#2A2420;color:#fff;font-size:13px;font-weight:700}
.card{background:#fff;border:1px solid #E5DACB;border-radius:18px;padding:18px;margin-top:18px}table{border-collapse:collapse;width:100%}th{text-align:left;color:#6B5E52;font-weight:600;padding:8px 12px 8px 0;vertical-align:top;width:34%}td{padding:8px 0;word-break:break-word}
.ops{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.ops a{display:block;padding:12px 14px;border-radius:14px;border:1px solid #E5DACB;text-decoration:none;background:#FBF8F3}.ops a.si{border:2px solid #1F7A4D;background:#EAF5EE}
ul{padding-left:18px}`;
  const elegida = n.opcion_elegida;
  return pagina(`Ficha · ${n.nombre}`, `<div class="w"><div class="top"><div><p class="muted">Folio ${esc(n.folio)} · ${esc(n.giro)}</p><h1>${esc(n.nombre)}</h1></div><span class="chip">${esc(n.estado)}${elegida ? ` · eligió la ${elegida}` : ''}</span></div>
<p style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">${n.token && !n.aprobado_en ? `<a class="btn wa" href="${base}/prospectos/aprobar/${n.folio}">Autorizar envío del correo</a>` : ''}${n.entrevista_id ? `<a class="btn ${n.token && !n.aprobado_en ? 'sec' : 'wa'}" href="${base}/prospectos/chat/${n.folio}${n.aprobado_en ? '' : '?revision=1'}">${n.aprobado_en ? 'Continuar en el chat con Ari' : 'Revisar con Ari'}</a>` : ''}<a class="btn sec" href="${base}/prospectos">Todos los prospectos</a></p>
${(n.opciones || []).length ? `<div class="card"><h2 style="font-size:20px;margin-bottom:12px">Sus ${n.opciones.length} opciones</h2><div class="ops">${n.opciones.map((o, i) => `<a class="${elegida === i + 1 ? 'si' : ''}" href="${base}/p/${n.folio}/${i + 1}" target="_blank" rel="noopener"><b>${i + 1} · ${esc(o.nombre)}</b>${elegida === i + 1 ? '<br><span class="muted">La eligió</span>' : ''}</a>`).join('')}</div></div>` : ''}
<div class="card"><table>
${fila('Reseñas en Google', `${(n.resenas || 0).toLocaleString('es-MX')}${n.rating ? ` · ${n.rating} ★` : ''}`)}
${fila('Tipo', esc(n.tipo))}${fila('Teléfono', n.telefono ? `<a href="tel:${esc(n.telefono.replace(/\s/g, ''))}">${esc(n.telefono)}</a>` : '')}${fila('Celular en redes', esc(n.celular))}
${fila('Correo', n.correo ? `<a href="mailto:${esc(n.correo)}">${esc(n.correo)}</a>` : '')}${fila('Dirección', esc(n.direccion))}${fila('Google Maps', link(n.maps_url, 'Abrir ficha'))}
${fila('Web que tiene', link(n.web))}${fila('Instagram', ig ? `${link(`https://www.instagram.com/${ig.usuario}/`, '@' + ig.usuario)} · ${(ig.seguidores || 0).toLocaleString('es-MX')} seguidores · ${ig.publicaciones || 0} publicaciones` : '')}
${fila('Facebook', fb ? `${link(fb.url, fb.nombre || 'Página')}${fb.seguidores ? ` · ${Number(fb.seguidores).toLocaleString('es-MX')} seguidores` : ''}${fb.anuncios ? ` · anuncios: ${esc(fb.anuncios)}` : ''}` : '')}
${fila('Bio', esc(ig?.bio || fb?.intro || ''))}</table></div>
<div class="card"><h2 style="font-size:20px;margin-bottom:8px">Actividad</h2><ul>${extra.map((x) => `<li>${esc(x)}</li>`).join('') || '<li class="muted">Sin actividad todavía</li>'}</ul></div>
<p class="muted" style="margin-top:18px;font-size:14px">Sesión de ${esc(s.nombre)}</p></div>`, css);
}

async function lista(c, s, base) {
  const giro = c.req.query('giro') || null;
  const estado = c.req.query('estado') || null;
  const min = Number(c.req.query('min') || 0);
  const giros = (await pdb.q(`SELECT giro, count(*)::int n, count(*) FILTER (WHERE estado='nuevo')::int nuevos, count(*) FILTER (WHERE estado IN ('construido','contactado','interesado'))::int listos FROM prospeccion.negocios GROUP BY giro ORDER BY giro`)).rows;
  const rows = (await pdb.q(`SELECT id, folio, nombre, tipo, giro, resenas, rating, telefono, correo, estado, opcion_elegida, web_tipo,
      (jsonb_typeof(redes->'instagram')='object') ig, (jsonb_typeof(redes->'facebook')='object') fb
    FROM prospeccion.negocios WHERE ($1::text IS NULL OR giro=$1) AND ($2::text IS NULL OR estado=$2) AND resenas >= $3 AND NOT baja
    ORDER BY (estado='interesado') DESC, resenas DESC LIMIT 400`, [giro, estado, min])).rows;
  const admin = s.rol === 'admin';
  const gasto = await pdb.gastoMes();
  const css = `h1{font-size:clamp(26px,5vw,36px)}.f{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.f a{padding:8px 14px;border-radius:999px;background:#fff;border:1px solid #DDD2C2;text-decoration:none;font-weight:600;font-size:14px}.f a.on{background:#2A2420;color:#fff;border-color:#2A2420}
.t{width:100%;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden}.t th,.t td{padding:10px 12px;border-bottom:1px solid #EFE7DA;text-align:left;font-size:14px;vertical-align:middle}.t th{background:#FBF8F3;color:#6B5E52}
.wrap{overflow-x:auto;border:1px solid #E5DACB;border-radius:16px}.e{font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;background:#EFE7DA;white-space:nowrap}.e.interesado{background:#1F7A4D;color:#fff}.e.error{background:#B3261E;color:#fff}
.giro{background:#fff;border:1px solid #E5DACB;border-radius:16px;padding:14px 16px;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px}`;
  const q = (o) => `${base}/prospectos?${new URLSearchParams({ ...(giro ? { giro } : {}), ...(estado ? { estado } : {}), ...(min ? { min } : {}), ...o }).toString()}`;
  const girosHtml = giros.map((g) => `<div class="giro"><div><b>${esc(g.giro)}</b><div class="muted" style="font-size:14px">${g.n} sin sitio · ${g.listos} con opciones · ${g.nuevos} por construir</div></div>${admin ? `<form method="post" action="${base}/prospectos/autorizar"><input type="hidden" name="giro" value="${esc(g.giro)}"><label class="muted" style="font-size:14px">Desde <input name="min" type="number" value="${min || 500}" min="0" style="width:84px;padding:6px;border-radius:8px;border:1px solid #DDD2C2"> reseñas</label> <button class="btn wa" type="submit">Autorizar todo el giro</button></form>` : ''}</div>`).join('');
  const filas = rows.map((r) => `<tr><td><a href="${base}/p/${r.folio}"><b>${esc(r.nombre)}</b></a><div class="muted" style="font-size:12px">${esc(r.tipo || '')}</div></td><td>${r.resenas.toLocaleString('es-MX')}${r.rating ? ` · ${r.rating}★` : ''}</td>
<td>${r.correo ? '✉️' : ''} ${r.ig ? 'IG' : ''} ${r.fb ? 'FB' : ''}</td><td>${esc(r.telefono || '')}</td><td><span class="e ${esc(r.estado)}">${esc(r.estado)}${r.opcion_elegida ? ` · ${r.opcion_elegida}` : ''}</span></td>
<td>${admin && ['nuevo', 'error'].includes(r.estado) ? `<form method="post" action="${base}/prospectos/autorizar"><input type="hidden" name="id" value="${r.id}"><button class="btn sec" style="min-height:36px;padding:6px 12px" type="submit">Construir</button></form>` : ''}</td></tr>`).join('');
  return pagina('Prospectos', `<div class="w"><h1>Prospectos sin sitio web</h1><p class="muted" style="margin-top:6px">Gasto de este mes: USD ${gasto.toFixed(2)} de ${Number(process.env.PROSPECCION_TOPE_USD || 20)} · en construcción: ${enCola()}</p>
<div style="margin-top:18px">${girosHtml}</div>
<div class="f">${[['', 'Todos'], ['interesado', 'Interesados'], ['construido', 'Con opciones'], ['contactado', 'Contactados'], ['nuevo', 'Por construir'], ['error', 'Con error']].map(([k, t]) => `<a class="${(estado || '') === k ? 'on' : ''}" href="${q({ estado: k })}">${t}</a>`).join('')}</div>
<div class="wrap"><table class="t"><thead><tr><th>Negocio</th><th>Reseñas</th><th>Datos</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead><tbody>${filas || '<tr><td colspan="6" class="muted">Sin resultados</td></tr>'}</tbody></table></div></div>`, css);
}

/* ---------------- Elección (clic en "me gusta esta") ---------------- */
async function registrarEleccion(n, i, c) {
  const letra = LETRAS[i - 1];
  await pdb.q(`INSERT INTO prospeccion.clics (negocio_id, tipo, opcion, ip, agente) VALUES ($1,'elige',$2,$3,$4)`, [n.id, i, c.req.header('x-forwarded-for')?.split(',')[0] || null, String(c.req.header('user-agent') || '').slice(0, 200)]);
  await pdb.actualizar(n.id, { opcion_elegida: i, estado: 'interesado' });
  if (!n.entrevista_id) return;
  const e = await edb.obtener(n.entrevista_id);
  const p = e?.brief?.marca?.propuestas;
  if (!p?.opciones) return;
  const op = p.opciones.find((o) => o.letra === letra);
  const brief = { ...e.brief, marca: { ...e.brief.marca, ...(op?.estilo ? { estilo: op.estilo } : {}), propuestas: { ...p, estado: 'elegida', elegido: letra, comentario: `Eligió la opción ${i} desde el correo` } } };
  await edb.guardar(e.id, { brief });
  await edb.insertarMensaje(e.id, { rol: 'cliente', contenido: `Me gustó la opción ${i} (${letra}${op?.nombre ? ` · ${op.nombre}` : ''}).`, bloque: e.bloque_actual });
  await edb.evento(e.id, 'prospecto_eligio', { opcion: i, letra });
}

const waLink = (texto) => `https://wa.me/${WA_BLANCA()}?text=${encodeURIComponent(texto)}`;

/* ---------------- Router ---------------- */
async function atender(c, ruta, base, host) {
  await pdb.migrar();
  let m;
  if ((m = ruta.match(/^\/acceso\/([A-Za-z0-9_-]{16,64})$/))) {
    const a = (await pdb.q(`SELECT * FROM prospeccion.accesos WHERE token_hash=$1 AND activo`, [hash(m[1])])).rows[0];
    if (!a) return c.html(pagina('Enlace inválido', '<div class="w"><h1>Este enlace ya no es válido</h1><p class="muted">Pide uno nuevo.</p></div>'), 404);
    await ponerSesion(c, a);
    // La sesión también se pone en el otro dominio de prospección (cada correo sale de uno de los dos).
    const otros = DOMINIOS().filter((d) => d !== host);
    const sig = c.req.query('d') ? null : otros[0];
    return c.redirect(sig && host && DOMINIOS().includes(host) ? `https://${sig}/acceso/${m[1]}?d=1` : `${base}/prospectos`, 302);
  }
  if ((m = ruta.match(/^\/p\/([a-z0-9]{4,12})$/))) {
    const n = await pdb.porFolio(m[1]);
    if (!n) return c.text('No encontrado', 404);
    const s = await sesion(c);
    if (s) {
      const act = [];
      for (const x of (await pdb.q(`SELECT tipo, opcion, creado FROM prospeccion.clics WHERE negocio_id=$1 ORDER BY id DESC LIMIT 20`, [n.id])).rows) act.push(`${x.creado.toLocaleString('es-MX', { timeZone: 'America/Merida' })}: ${x.tipo === 'elige' ? `eligió la opción ${x.opcion}` : x.tipo}`);
      for (const x of (await pdb.q(`SELECT canal, paso, dominio, estado, creado FROM prospeccion.envios WHERE negocio_id=$1 ORDER BY id DESC LIMIT 20`, [n.id])).rows) act.push(`${x.creado.toLocaleString('es-MX', { timeZone: 'America/Merida' })}: ${x.canal} paso ${x.paso + 1} (${x.dominio || ''}) ${x.estado}`);
      return c.html(fichaBlanca(n, s, base, act), 200, { 'cache-control': 'no-store' });
    }
    if (!n.token) return c.html(pagina(n.nombre, '<div class="w"><h1>Estamos terminando tus opciones</h1><p class="muted">Vuelve en unos minutos.</p></div>'));
    await pdb.q(`INSERT INTO prospeccion.clics (negocio_id, tipo) VALUES ($1,'ver')`, [n.id]).catch(() => {});
    return c.html(selectorProspecto(n, base), 200, { 'cache-control': 'no-store' });
  }
  if ((m = ruta.match(/^\/p\/([a-z0-9]{4,12})\/([1-6])$/))) {
    const n = await pdb.porFolio(m[1]);
    if (!n?.token) return c.text('No encontrado', 404);
    try { return c.html(await opcionHtml(n, Number(m[2]), base, { vista: c.req.query('vista') === '1' }), 200, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }); }
    catch { return c.text('No encontrada', 404); }
  }
  if ((m = ruta.match(/^\/w\/([a-z0-9]{4,12})(?:\/([1-6]))?$/))) {
    const n = await pdb.porFolio(m[1]);
    if (!n) return c.redirect(waLink('Hola Blanca, vi las páginas que me hicieron y me interesa.'), 302);
    const i = m[2] ? Number(m[2]) : null;
    const o = i && n.opciones?.[i - 1];
    if (i) await registrarEleccion(n, i, c).catch((err) => console.error('[prospectos] eleccion', err.message));
    else await pdb.q(`INSERT INTO prospeccion.clics (negocio_id, tipo) VALUES ($1,'whatsapp')`, [n.id]).catch(() => {});
    const corto = `${DOMINIOS()[0]}/p/${n.folio}${i ? `/${i}` : ''}`;
    const texto = i ? `Hola Blanca, me gustó la opción ${i}${o?.nombre ? ` (${o.nombre})` : ''} para ${n.nombre}.\n${corto}` : `Hola Blanca, vi las páginas que me hicieron para ${n.nombre} y me interesa.\n${corto}`;
    return c.redirect(waLink(texto), 302);
  }
  if ((m = ruta.match(/^\/baja\/([a-z0-9]{4,12})$/))) {
    const n = await pdb.porFolio(m[1]);
    if (n && c.req.method === 'POST') {
      await pdb.actualizar(n.id, { baja: true });
      await pdb.q(`INSERT INTO prospeccion.clics (negocio_id, tipo) VALUES ($1,'baja')`, [n.id]).catch(() => {});
      return c.html(pagina('Listo', '<div class="w"><h1>Listo, no te escribiremos más</h1><p class="muted">Perdón por la molestia.</p></div>'));
    }
    return c.html(pagina('Dejar de recibir correos', `<div class="w" style="max-width:560px"><h1>¿Dejar de recibir correos?</h1><p class="muted" style="margin:12px 0 20px">No te volveremos a escribir sobre tu página.</p><form method="post"><button class="btn sec" type="submit">Sí, ya no quiero recibir correos</button></form></div>`));
  }
  if (ruta === '/prospectos' || ruta.startsWith('/prospectos/')) {
    const s = await sesion(c);
    if (!s) return c.html(pagina('Acceso', '<div class="w"><h1>Necesitas tu enlace de acceso</h1><p class="muted">Ábrelo desde el mensaje donde te lo mandaron.</p></div>'), 401);
    if (ruta === '/prospectos') return c.html(await lista(c, s, base), 200, { 'cache-control': 'no-store' });
    if (ruta === '/prospectos/autorizar' && c.req.method === 'POST') {
      if (s.rol !== 'admin') return c.text('Solo el administrador autoriza', 403);
      const b = await c.req.parseBody();
      let ids = [];
      if (b.id) ids = [Number(b.id)];
      else if (b.giro) ids = (await pdb.q(`SELECT id FROM prospeccion.negocios WHERE giro=$1 AND estado IN ('nuevo','error') AND NOT baja AND resenas >= $2 ORDER BY resenas DESC`, [b.giro, Number(b.min || 0)])).rows.map((r) => r.id);
      if (ids.length) {
        await pdb.q(`UPDATE prospeccion.negocios SET estado='autorizado', autorizado_en=now() WHERE id = ANY($1)`, [ids]);
        encolar(ids);
      }
      return c.redirect(`${base}/prospectos`, 303);
    }
    if ((m = ruta.match(/^\/prospectos\/aprobar\/([a-z0-9]{4,12})$/))) {
      const n = await pdb.porFolio(m[1]);
      if (!n?.token) return c.text('Este prospecto aún no tiene opciones', 404);
      if (c.req.method === 'POST') {
        // Si en la revisión Ari rehízo las propuestas, el correo debe llevar las nuevas.
        const e = n.entrevista_id ? await edb.obtener(n.entrevista_id) : null;
        const p = e?.brief?.marca?.propuestas;
        const cambios = { aprobado_en: new Date(), aprobado_por: s.nombre };
        if (p?.token && p.token !== n.token && Array.isArray(p.opciones) && p.opciones.length) {
          cambios.token = p.token;
          cambios.opciones = p.opciones.map((o) => ({ letra: o.letra, nombre: o.nombre, url: o.url }));
        }
        await pdb.actualizar(n.id, cambios);
        await pdb.q(`INSERT INTO prospeccion.clics (negocio_id, tipo) VALUES ($1,'aprobado')`, [n.id]).catch(() => {});
        return c.html(pagina('Autorizado', `<div class="w" style="max-width:560px"><h1>Listo, ${esc(n.nombre)} queda autorizado</h1><p class="muted" style="margin:12px 0 20px">Su correo sale en el siguiente turno de envíos (lunes a sábado de 9:00 a 18:45).</p><a class="btn sec" href="${base}/p/${n.folio}">Ver su ficha</a></div>`));
      }
      if (n.aprobado_en) return c.html(pagina('Ya autorizado', `<div class="w" style="max-width:560px"><h1>${esc(n.nombre)} ya estaba autorizado</h1><p class="muted" style="margin-top:12px">Por ${esc(n.aprobado_por || '')} el ${new Date(n.aprobado_en).toLocaleString('es-MX', { timeZone: 'America/Merida' })}.</p></div>`));
      return c.html(pagina('Autorizar envío', `<div class="w" style="max-width:560px"><p class="muted">Folio ${esc(n.folio)}</p><h1>¿Autorizar el correo a ${esc(n.nombre)}?</h1>
<p class="muted" style="margin:12px 0 20px">Se le mandarán sus opciones a ${esc(n.correo || 'su correo')}. Si aún quieres cambios, primero pídeselos a Ari.</p>
<form method="post" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn wa" type="submit">Sí, autorizar envío</button><a class="btn sec" href="${base}/prospectos/chat/${n.folio}?revision=1">Pedir cambios a Ari</a><a class="btn sec" href="${base}/p/${n.folio}">Ver las 6</a></form></div>`), 200, { 'cache-control': 'no-store' });
    }
    if ((m = ruta.match(/^\/prospectos\/chat\/([a-z0-9]{4,12})$/))) {
      const n = await pdb.porFolio(m[1]);
      if (!n?.entrevista_id) return c.text('Este prospecto aún no tiene sesión', 404);
      const msgs = (await edb.q(`SELECT rol, contenido, transcripcion FROM mensajes WHERE entrevista_id=$1 ORDER BY id DESC LIMIT 120`, [n.entrevista_id])).rows.reverse();
      const hist = msgs.map((x) => ({ de: x.rol === 'cliente' ? 'yo' : 'ari', texto: x.contenido || x.transcripcion || '' })).filter((x) => x.texto);
      hist.unshift({ tipo: 'sis', texto: c.req.query('revision')
        ? `Revisión de ${n.nombre} (folio ${n.folio}). Pídele a Ari los cambios que quieras en sus opciones. Cuando estén bien, autoriza el envío en ${DOMINIOS()[0]}/prospectos/aprobar/${n.folio}`
        : `Atendiendo a ${n.nombre} (folio ${n.folio}). Escribe lo que te diga el cliente; Ari continúa desde aquí.` });
      const datos = JSON.stringify({ u: usuarioDe(n.folio), c: process.env.CHAT_CODIGO || '', h: hist, n: n.nombre }).replace(/</g, '\\u003c');
      return c.html(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><script>var d=${datos};try{localStorage.setItem('ari_usuario',d.u);localStorage.setItem('ari_codigo',d.c);localStorage.setItem('ari_historial',JSON.stringify(d.h));localStorage.setItem('ari_nombre',d.n);sessionStorage.setItem('tw_pr','1')}catch(e){}location.replace('/chat')</script>`, 200, { 'cache-control': 'no-store' });
    }
  }
  if (ruta === '/robots.txt') return c.text('User-agent: *\nDisallow: /\n');
  if (ruta === '/' ) return c.redirect('https://websites.timewins.ai/', 302);
  return null;
}

export function registerProspectosRoutes(app) {
  if (!pdb.activo()) { console.log('[prospectos] sin PROSPECCION_DATABASE_URL: módulo apagado'); return; }
  registrarModo('prospeccion', async (c, reg, next, host) => {
    const ruta = c.req.path.replace(/\/+$/, '') || '/';
    if (ruta === '/chat' || ruta.startsWith('/chat/') || ruta.startsWith('/clips/')) return next();
    try { return (await atender(c, ruta, '', host)) || c.text('No encontrado', 404); }
    catch (err) { console.error('[prospectos]', err); return c.text('Error', 500); }
  });
  // API interna (X-API-Key = ENTREVISTA_API_KEY): accesos, construir y correo de prueba.
  const llave = (c) => {
    const a = Buffer.from(String(c.req.header('x-api-key') || '')), b = Buffer.from(String(config.entrevistaApiKey || ''));
    return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  app.post('/prospectos/v1/accesos', async (c) => {
    if (!llave(c)) return c.json({ error: 'no' }, 401);
    const b = await c.req.json();
    const token = await crearAcceso(String(b.nombre || '').slice(0, 60), b.rol === 'admin' ? 'admin' : 'atencion');
    return c.json({ token, ligas: DOMINIOS().map((d) => `https://${d}/acceso/${token}`) });
  });
  app.post('/prospectos/v1/construir', async (c) => {
    if (!llave(c)) return c.json({ error: 'no' }, 401);
    const b = await c.req.json();
    const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(Number).filter(Boolean);
    await pdb.migrar();
    await pdb.q(`UPDATE prospeccion.negocios SET estado='autorizado', autorizado_en=now() WHERE id = ANY($1)`, [ids]);
    encolar(ids);
    return c.json({ ok: true, en_cola: enCola() });
  });
  app.post('/prospectos/v1/prueba-correo', async (c) => {
    if (!llave(c)) return c.json({ error: 'no' }, 401);
    const b = await c.req.json();
    const n = await pdb.porFolio(b.folio);
    if (!n?.token) return c.json({ error: 'sin opciones' }, 404);
    const { enviarCorreo, armarCorreo } = await import('./correos.js');
    const dominio = DOMINIOS().includes(b.dominio) ? b.dominio : DOMINIOS()[0];
    if (!b.destino) return c.json(armarCorreo(n, Number(b.paso || 0), dominio));
    return c.json(await enviarCorreo(n, Number(b.paso || 0), dominio, { destino: b.destino }));
  });
  app.post('/prospectos/v1/avisar-revision', async (c) => {
    if (!llave(c)) return c.json({ error: 'no' }, 401);
    const { avisarRevision } = await import('./correos.js');
    return c.json(await avisarRevision());
  });
  reanudar();
  import('./correos.js').then((m) => m.programarCorreos()).catch((e) => console.error('[prospectos] cron', e.message));
  app.all('/pr/*', async (c) => {
    const ruta = c.req.path.slice(3).replace(/\/+$/, '') || '/';
    try { return (await atender(c, ruta, '/pr', null)) || c.text('No encontrado', 404); }
    catch (err) { console.error('[prospectos]', err); return c.text('Error', 500); }
  });
}
