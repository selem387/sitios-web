// Entrega del acceso al dueño y ayuda con las redes que le faltan.
//
// 1) Cuando su página ya está en su dominio con HTTPS válido y la pantalla de acceso responde ahí
//    (sitio en vivo: https://<dominio>/admin · WordPress: https://<dominio>/acceso/), Ari le manda la liga
//    y el correo con el que entra (sin contraseña: código al correo o Google). Solo por Ari, sin correo de bienvenida.
// 2) A los 5 minutos, si al cerrar la entrevista dijo que sí quería ayuda con las redes que le faltan, Ari empieza a
//    guiarlo red por red. Si se le complica, "alguien de nuestro equipo" se las crea (aviso al equipo). Nunca se nombra a la empresa.
import * as db from './db.js';
import { avisar, avisarEquipo } from './avisos.js';
import { pedirJSON } from './claude.js';
import { REDES, NOMBRE_RED, listaNombres, usuarioDeRed, normalizarRedes } from './redes.js';

const q = db.q;
const MARCA_ACCESO = 'Administra tu página';
const MIN_REDES = 5;

export const SCHEMA_ENTREGA = `
CREATE TABLE IF NOT EXISTS avisos_programados (
  id             serial PRIMARY KEY,
  entrevista_id  uuid NOT NULL REFERENCES entrevistas(id) ON DELETE CASCADE,
  evento         text NOT NULL,
  enviar_en      timestamptz NOT NULL,
  enviado        timestamptz,
  creado         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS avisos_programados_pend_idx ON avisos_programados (enviar_en) WHERE enviado IS NULL;
`;
let migrado = false;
async function migrar() { if (!migrado) { await q(SCHEMA_ENTREGA); migrado = true; } }

async function patchBrief(id, ruta, valor) {
  await q(`UPDATE entrevistas SET brief = jsonb_set(COALESCE(brief,'{}'::jsonb), $2::text[], $3::jsonb, true), actualizado=now() WHERE id=$1`, [id, ruta, JSON.stringify(valor)]);
}

/** ¿La pantalla de acceso ya responde en el dominio con un certificado válido? (fetch valida el certificado) */
export async function accesoResponde(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'sitios-web-entrega' } });
    return r.ok && (await r.text()).includes(MARCA_ACCESO);
  } catch { return false; }
}

/* ---------------- 1) Entrega del acceso ---------------- */

export function textoEntrega({ dominio, urlAdmin, email, llave = false }) {
  if (llave) return [
    `Tu página ya está en tu dirección 🎉\nhttps://${dominio}/`,
    `Para administrarla tú mismo (precios, productos, servicios, fotos, horarios y promociones) entra con esta liga:\n${urlAdmin}\n\n`
    + 'Es solo para ti: no la compartas. No necesitas contraseña; guárdala en tus favoritos. Lo que cambies se ve en tu página al momento.',
  ];
  const gmail = /@(gmail|googlemail)\.com$/i.test(email || '');
  return [
    `Tu página ya está en tu dirección 🎉\nhttps://${dominio}/`,
    `Para administrarla tú mismo (precios, productos, servicios, fotos, horarios y promociones) entra aquí:\n${urlAdmin}\n\n`
    + `No necesitas contraseña: escribe tu correo *${email}* y te llega un código de 6 números.${gmail ? ' Como es Gmail, también puedes tocar *Entrar con Google*.' : ''}\n\n`
    + 'Guarda esta liga en tus favoritos. Lo que cambies se ve en tu página al momento.',
  ];
}

/**
 * Entrega el acceso una sola vez. destino = {dominio, panel: 'panel_propio'|'wp-admin', sitio_vivo_id?}
 * → {entregado: true} | {entregado: false, motivo}
 */
export async function entregarAcceso(entrevistaId, destino, { forzar = false } = {}) {
  await migrar();
  const e = await db.obtener(entrevistaId);
  if (!e) return { entregado: false, motivo: 'entrevista no existe' };
  const adm = e.brief?.administracion || {};
  if (adm.estado === 'entregado' && !forzar) return { entregado: false, motivo: 'ya entregado' };
  const email = adm.email || e.brief?.contacto?.email || null;
  // Sitio en vivo: enlace mágico permanente (decidido 5-nov-2026); WordPress sigue con correo.
  const sv = destino.panel === 'panel_propio' && destino.sitio_vivo_id ? (await q(`SELECT * FROM sitios_vivos WHERE id=$1`, [destino.sitio_vivo_id])).rows[0] : null;
  const llave = sv?.llave ? `https://${destino.dominio}/admin/llave/${sv.llave}` : null;
  if (!email && !llave) return { entregado: false, motivo: 'sin correo del dueño' };
  const urlAdmin = destino.panel === 'wp-admin' ? `https://${destino.dominio}/acceso/` : `https://${destino.dominio}/admin`;
  if (!(await accesoResponde(urlAdmin))) return { entregado: false, motivo: 'la pantalla de acceso aún no responde con HTTPS en el dominio' };

  await patchBrief(e.id, ['administracion'], { ...adm, email, panel: destino.panel, url: urlAdmin, estado: 'entregado', entregado: new Date().toISOString() });
  if (destino.sitio_vivo_id) await q(`UPDATE sitios_vivos SET acceso_entregado=now() WHERE id=$1`, [destino.sitio_vivo_id]).catch(() => {});
  await avisar(e.id, textoEntrega({ dominio: destino.dominio, urlAdmin: llave || urlAdmin, email, llave: !!llave }), { evento: 'acceso_entregado', datos: { dominio: destino.dominio, panel: destino.panel } });

  // Redes: solo si dijo que sí quería ayuda y le sigue faltando alguna.
  const faltan = redesPorCrear(e.brief);
  if (e.brief?.redes_crear?.interesa === true && faltan.length) {
    await q(`INSERT INTO avisos_programados (entrevista_id, evento, enviar_en) VALUES ($1,'redes_inicio', now() + make_interval(mins => $2))`, [e.id, MIN_REDES]);
  }
  return { entregado: true, url: urlAdmin };
}

/** Busca sitios cuyo acceso aún no se entrega y lo entrega en cuanto la pantalla de acceso responde en su dominio. */
export async function cronEntregas() {
  await migrar();
  // Sitios en vivo con dominio propio.
  const vivos = await q(`SELECT sv.id, sv.entrevista_id, sv.dominio FROM sitios_vivos sv JOIN entrevistas e ON e.id = sv.entrevista_id
                         WHERE sv.dominio IS NOT NULL AND sv.acceso_entregado IS NULL AND sv.estado='activo'
                           AND COALESCE(e.brief#>>'{administracion,estado}','') <> 'entregado'`).catch(() => ({ rows: [] }));
  for (const s of vivos.rows) {
    await entregarAcceso(s.entrevista_id, { dominio: s.dominio, panel: 'panel_propio', sitio_vivo_id: s.id }).catch((err) => console.error('entrega vivo', s.id, err.message));
  }
  // WordPress publicado en un dominio que no es de vista previa.
  const wps = await q(`SELECT DISTINCT ON (s.entrevista_id) s.entrevista_id, s.url_publica FROM sitios s JOIN entrevistas e ON e.id = s.entrevista_id
                       WHERE s.estado='listo' AND s.url_publica IS NOT NULL AND s.url_publica !~ 'easypanel\\.host'
                         AND COALESCE(e.brief#>>'{administracion,estado}','') <> 'entregado'
                       ORDER BY s.entrevista_id, s.id DESC`).catch(() => ({ rows: [] }));
  for (const s of wps.rows) {
    const dominio = new URL(s.url_publica).hostname;
    await entregarAcceso(s.entrevista_id, { dominio, panel: 'wp-admin' }).catch((err) => console.error('entrega wp', s.entrevista_id, err.message));
  }
}

/** Cada minuto: avisos programados que ya tocan. */
export async function cronProgramados() {
  await migrar();
  const r = await q(`UPDATE avisos_programados SET enviado=now() WHERE id IN (SELECT id FROM avisos_programados WHERE enviado IS NULL AND enviar_en <= now() ORDER BY id LIMIT 20) RETURNING *`);
  for (const a of r.rows) {
    try { if (a.evento === 'redes_inicio') await iniciarRedes(a.entrevista_id); }
    catch (err) { console.error('aviso programado', a.id, err.message); }
  }
}

/* ---------------- 2) Ayuda con las redes ---------------- */

export function redesPorCrear(brief) {
  const quiere = brief?.redes_crear?.redes?.length ? brief.redes_crear.redes : REDES;
  return quiere.filter((r) => REDES.includes(r) && !usuarioDeRed(brief?.contacto?.redes?.[r]));
}

export function textoInicioRedes(faltan) {
  return `Ahora sí, vamos con tus redes 📲 Te faltan ${listaNombres(faltan)}.\n\n`
    + `Te guío paso a paso para crear cada una desde tu celular; son unos 5 minutos por red. ¿Empezamos con *${NOMBRE_RED[faltan[0]]}*?\n\n`
    + 'Si prefieres que alguien de nuestro equipo te las cree, escríbeme *equipo*.';
}

export async function iniciarRedes(entrevistaId) {
  const e = await db.obtener(entrevistaId);
  if (!e) return;
  const faltan = redesPorCrear(e.brief);
  if (!faltan.length || e.brief?.tecnico?.redes_flujo) return;
  await patchBrief(e.id, ['tecnico'], { ...(e.brief?.tecnico || {}), redes_flujo: { estado: 'guiando', pendientes: faltan, actual: faltan[0], desde: new Date().toISOString() } });
  await avisar(e.id, [textoInicioRedes(faltan)], { evento: 'redes_inicio', datos: { faltan } });
}

export const redesEnCurso = (brief) => ['guiando'].includes(brief?.tecnico?.redes_flujo?.estado)
  && Date.now() - new Date(brief.tecnico.redes_flujo.desde).getTime() < 30 * 864e5;

const GUIA = `Eres Ari, asistente que ayuda por WhatsApp a dueños de negocios pequeños en México a crear las redes sociales de su negocio desde el celular.
Habla en español de México, de tú, cálido y muy claro. Mensajes cortos (máximo 8 líneas), un paso a la vez o una lista corta numerada. Nada técnico.
Nunca menciones el nombre de ninguna empresa propia; si hace falta, di "alguien de nuestro equipo".
Guía SOLO la red ACTUAL. Pasos de referencia (vigentes; si el cliente ve algo distinto, adáptate a lo que te describa):
- Facebook: necesita su perfil personal. En la app de Facebook: menú ☰ › Páginas › Crear (o facebook.com/pages/create). Nombre del negocio, categoría, foto de perfil (su logo) y portada.
- Instagram: en la app, toca su foto de perfil › nombre arriba › Agregar cuenta › Crear cuenta nueva. Usuario parecido al nombre del negocio. Luego Configuración › Tipo de cuenta y herramientas › Cambiar a cuenta profesional › Empresa. Puede conectarla a su página de Facebook.
- TikTok: descarga TikTok › Perfil › Registrarte con su correo o teléfono. Luego Perfil › ☰ › Configuración y privacidad › Cuenta › Cambiar a cuenta de empresa.
- YouTube: entra con su cuenta de Google a la app o a youtube.com › foto de perfil › Crear un canal; para que lleve el nombre del negocio: youtube.com/account › Agregar o administrar canales › Crear un canal (cuenta de marca).
- LinkedIn: necesita su perfil personal de LinkedIn. En computadora: linkedin.com/company/setup/new (o desde la app: Inicio › Para negocios › Crear página de empresa). Nombre, URL (linkedin.com/company/...), logo y descripción.
Reglas:
- Si dice que ya la creó, pídele su usuario o la liga del perfil; cuando la mande, devuélvela en "red_creada".
- Si dice que no quiere esa red, márcala en "omitir_red".
- Si escribe "equipo", dice que no puede, que se le complica o que prefiere que se la hagan: "pedir_equipo": true y dile que alguien de nuestro equipo le escribirá por aquí para crearlas con él (le pedirán su correo y un código que le llegará a su celular).
- Si pregunta algo que no es de redes, contesta breve y vuelve a la red actual.`;

const ESQUEMA_GUIA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Mensaje para el cliente' },
    red_creada: { type: ['object', 'null'], properties: { red: { type: 'string', enum: REDES }, usuario: { type: 'string' } } },
    omitir_red: { type: ['string', 'null'], enum: [...REDES, null] },
    pedir_equipo: { type: 'boolean' },
  },
  required: ['reply', 'pedir_equipo'],
};

// Ligas de perfil reconocibles sin IA.
const LIGAS = [
  ['facebook', /(?:facebook|fb)\.com\/(?!profile\.php)([A-Za-z0-9.\-]{3,})/i], ['facebook', /facebook\.com\/profile\.php\?id=(\d+)/i],
  ['instagram', /instagram\.com\/([A-Za-z0-9._]{2,})/i], ['tiktok', /tiktok\.com\/@([A-Za-z0-9._]{2,})/i],
  ['youtube', /youtube\.com\/(@[A-Za-z0-9._\-]{2,}|channel\/[A-Za-z0-9_\-]+)/i], ['linkedin', /linkedin\.com\/company\/([A-Za-z0-9\-_%]{2,})/i],
];
export function ligaDeRed(texto) {
  for (const [red, re] of LIGAS) { const m = String(texto || '').match(re); if (m) return { red, usuario: m[1].replace(/^@/, '') }; }
  return null;
}

/** Conversación de redes después del cierre. → texto(s) para el cliente */
export async function atenderRedes(e, texto) {
  const f = e.brief.tecnico.redes_flujo;
  const pidioEquipo = /^\s*equipo\s*$/i.test(texto || '');
  let r;
  const liga = ligaDeRed(texto);
  if (pidioEquipo) r = { reply: '', pedir_equipo: true };
  else if (liga && f.pendientes.includes(liga.red)) r = { reply: '', red_creada: liga, pedir_equipo: false };
  else {
    const recientes = (await db.ultimosMensajes(e.id, 10).catch(() => [])).map((m) => `${m.rol === 'cliente' ? 'Cliente' : 'Ari'}: ${m.contenido || m.transcripcion || ''}`).join('\n');
    try {
      r = (await pedirJSON({ system: GUIA, contenido: `NEGOCIO: ${e.brief?.negocio?.nombre || ''} (${e.brief?.negocio?.giro_texto || ''})\nRED ACTUAL: ${NOMBRE_RED[f.actual]}\nPENDIENTES: ${listaNombres(f.pendientes)}\nCONVERSACIÓN RECIENTE:\n${recientes}\n\nÚLTIMO MENSAJE DEL CLIENTE: ${texto}`, schema: ESQUEMA_GUIA, max_tokens: 900 })).data;
    } catch (err) {
      console.error('guía redes', err.message);
      r = { reply: `Seguimos con *${NOMBRE_RED[f.actual]}*. Si ya la creaste, mándame tu usuario; si se te complica, escríbeme *equipo* y alguien de nuestro equipo te ayuda.`, pedir_equipo: false };
    }
  }
  let pendientes = [...f.pendientes];
  const textos = [];
  const hecha = r.red_creada && REDES.includes(r.red_creada.red) ? r.red_creada : null;
  if (hecha) {
    const usuario = usuarioDeRed(hecha.usuario);
    if (usuario) {
      await patchBrief(e.id, ['contacto', 'redes', hecha.red], usuario);
      await q(`UPDATE sitios_vivos SET contenido = jsonb_set(contenido, '{redes}', COALESCE(contenido->'redes','{}'::jsonb) || jsonb_build_object($2::text, $3::text)), version=version+1, actualizado=now() WHERE entrevista_id=$1 AND contenido ? 'redes'`, [e.id, hecha.red, usuario]).catch(() => {});
      await q(`UPDATE sitios_vivos SET contenido = contenido || jsonb_build_object('redes', $2::jsonb), version=version+1, actualizado=now() WHERE entrevista_id=$1 AND NOT (contenido ? 'redes')`, [e.id, JSON.stringify(normalizarRedes({ ...(e.brief?.contacto?.redes || {}), [hecha.red]: usuario }))]).catch(() => {});
      await db.evento(e.id, 'red_creada', { red: hecha.red, usuario });
      pendientes = pendientes.filter((x) => x !== hecha.red);
    }
  }
  if (r.omitir_red) pendientes = pendientes.filter((x) => x !== r.omitir_red);

  if (r.pedir_equipo) {
    await patchBrief(e.id, ['tecnico', 'redes_flujo'], { ...f, pendientes, estado: 'equipo', equipo_desde: new Date().toISOString() });
    const c = e.brief?.contacto || {};
    await avisarEquipo('Crear redes sociales a un cliente', `${e.brief?.negocio?.nombre || ''} (entrevista ${e.id}) pidió que le creemos: ${listaNombres(pendientes)}.\nWhatsApp: ${c.whatsapp || e.usuario_id}\nCorreo: ${e.brief?.administracion?.email || c.email || ''}\nRedes que ya tiene: ${JSON.stringify(c.redes || {})}`, e.id);
    textos.push(r.reply || `¡Claro! Alguien de nuestro equipo te va a escribir por aquí para crear ${listaNombres(pendientes)} contigo. Te pedirán tu correo y un código que te llegará al celular; así quedan a tu nombre. 🙌`);
    return textos;
  }
  if (!pendientes.length) {
    await patchBrief(e.id, ['tecnico', 'redes_flujo'], { ...f, pendientes, estado: 'terminado', terminado: new Date().toISOString() });
    textos.push(`${hecha ? '¡Listo! ' : ''}Ya quedaron tus redes 🎉 Las agregué a tu página para que te encuentren. Cuando quieras cambiar algo, entra a tu administrador.`);
    return textos;
  }
  const actual = hecha || r.omitir_red ? pendientes[0] : f.actual;
  await patchBrief(e.id, ['tecnico', 'redes_flujo'], { ...f, pendientes, actual });
  if (hecha && actual !== f.actual) textos.push(`¡Quedó tu ${NOMBRE_RED[hecha.red]}! Ya la agregué a tu página ✅\n\nSigue *${NOMBRE_RED[actual]}*. ¿Le seguimos?`);
  else if (r.omitir_red && actual !== f.actual) textos.push(`Va, sin ${NOMBRE_RED[r.omitir_red]}. Sigue *${NOMBRE_RED[actual]}*. ¿Le seguimos?`);
  else textos.push(r.reply);
  return textos;
}
