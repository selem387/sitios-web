// Secuencia de correos a prospectos por GoHighLevel (subcuenta timewins.ai, GHL_LOCATION_ID_PROSPECTOS).
// REGLA DURA: nunca sale desde timewins.ai; solo desde timewins.site y timewins.online (sebastian.lemos@…).
// Día 0: sus 6 opciones con "¿Te gusta esta?" · día 3: recordatorio · día 7: último correo.
// Se detiene si eligió una opción, escribió por WhatsApp o se dio de baja.
// Calentamiento por dominio desde PROSPECCION_INICIO_ENVIOS: semana 1 = 10/día, 2 = 20, 3 = 35, después 50.
// Apagado hasta PROSPECCION_ENVIO_ACTIVO=1.
import cron from 'node-cron';
import * as pdb from './db.js';

const GHL = 'https://services.leadconnectorhq.com';
const PIT = () => process.env.GHL_PIT_PROSPECTOS || '';
const LOC = () => process.env.GHL_LOCATION_ID_PROSPECTOS || '';
const DOMINIOS = () => String(process.env.PROSPECCION_DOMINIOS || 'timewins.site').split(',').map((x) => x.trim()).filter((d) => d && !/(^|\.)timewins\.ai$/i.test(d));
const REMITENTE = (d) => `Sebastián Lemos <sebastian.lemos@${d}>`;
const PASOS = [0, 3, 7];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function cupoDiario(hoy = new Date()) {
  const ini = process.env.PROSPECCION_INICIO_ENVIOS ? new Date(process.env.PROSPECCION_INICIO_ENVIOS) : hoy;
  const semana = Math.floor((hoy - ini) / (7 * 86400000));
  return semana <= 0 ? 10 : semana === 1 ? 20 : semana === 2 ? 35 : 50;
}

export function armarCorreo(n, paso, dominio) {
  const b = `https://${dominio}`;
  const nombre = esc(n.nombre);
  const ops = (n.opciones || []).map((o, i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee"><b>Opción ${i + 1}</b> · ${esc(o.nombre)}<br>
<a href="${b}/p/${n.folio}/${i + 1}" style="color:#1a56db">Verla</a> &nbsp;·&nbsp; <a href="${b}/w/${n.folio}/${i + 1}" style="color:#15803d;font-weight:bold">¿Te gusta esta? Haz clic aquí</a></td></tr>`).join('');
  const pie = `<p style="margin-top:28px;color:#888;font-size:12px">Si no quieres recibir más correos sobre esto: <a href="${b}/baja/${n.folio}" style="color:#888">${b.replace('https://', '')}/baja/${n.folio}</a></p>`;
  const firma = '<p style="margin-top:20px">Saludos,<br>Sebastián Lemos<br><span style="color:#666">timewins · Mérida</span></p>';
  const marco = (h) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px">${h}${firma}${pie}</div>`;
  if (paso === 0) {
    const resenas = n.resenas ? `tienen ${Number(n.resenas).toLocaleString('es-MX')} reseñas en Google pero ` : '';
    return {
      asunto: `${n.nombre}: les hicimos 6 opciones de página web`,
      html: marco(`<p>Hola, equipo de ${nombre}:</p>
<p>Vi que ${resenas}todavía no tienen página web propia, así que les armamos <b>6 opciones</b> con sus fotos de Google Maps y sus redes. Son suyas para verlas, sin compromiso:</p>
<table style="width:100%;border-collapse:collapse">${ops}</table>
<p>Si alguna les gusta, con un clic nos escriben por WhatsApp y Blanca les ayuda a terminarla con su información (menú, horarios, logo).</p>
<p>Las 6 juntas: <a href="${b}/p/${n.folio}" style="color:#1a56db">${dominio}/p/${n.folio}</a></p>`),
    };
  }
  if (paso === 1) {
    return {
      asunto: `¿Pudieron ver las opciones de ${n.nombre}?`,
      html: marco(`<p>Hola de nuevo:</p><p>Les escribí hace unos días con 6 opciones de página web para ${nombre}. Aquí están otra vez, por si se perdió el correo:</p>
<p><a href="${b}/p/${n.folio}" style="color:#1a56db;font-weight:bold">${dominio}/p/${n.folio}</a></p>
<p>Si alguna les late, en cada una hay un botón para elegirla y escribirnos por WhatsApp.</p>`),
    };
  }
  return {
    asunto: `Último correo sobre la página de ${n.nombre}`,
    html: marco(`<p>Hola:</p><p>Este es mi último correo sobre las 6 opciones de página que hicimos para ${nombre}. Si en algún momento quieren tener su página, aquí siguen:</p>
<table style="width:100%;border-collapse:collapse">${ops}</table>
<p>Gracias por su tiempo.</p>`),
  };
}

async function ghl(ruta, body, version = '2021-07-28') {
  const r = await fetch(`${GHL}${ruta}`, { method: 'POST', headers: { Authorization: `Bearer ${PIT()}`, Version: version, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GHL ${ruta} ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

// El envío lo hace el workflow de GHL "Prospeccion - correo por timewins.site" (disparador: etiqueta pr-enviar-site),
// porque en la subcuenta el "Workflow Domain" es timewins.site; la API de conversaciones saldría por timewins.ai.
const ETIQUETA = { 'timewins.site': 'pr-enviar-site', 'timewins.online': 'pr-enviar-online' };
async function ghlTags(contactId, method, tags) {
  const r = await fetch(`${GHL}/contacts/${contactId}/tags`, { method, headers: { Authorization: `Bearer ${PIT()}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tags }), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`GHL tags ${method} ${r.status}: ${(await r.text()).slice(0, 300)}`);
}
export async function enviarCorreo(n, paso, dominio, { destino = n.correo } = {}) {
  const etiqueta = ETIQUETA[dominio];
  if (!etiqueta) throw new Error(`sin workflow para ${dominio}`);
  const { asunto, html } = armarCorreo(n, paso, dominio);
  const c = await ghl('/contacts/upsert', { locationId: LOC(), email: destino, companyName: n.nombre, name: n.nombre, phone: n.telefono || undefined, tags: ['prospecto-sitio', `giro-${n.giro}`], source: 'prospeccion google maps',
    customFields: [{ key: 'asunto_prospeccion', field_value: asunto }, { key: 'cuerpo_prospeccion', field_value: html }] });
  const contactId = c.contact?.id || c.id;
  await ghlTags(contactId, 'DELETE', [etiqueta]).catch(() => {});
  await ghlTags(contactId, 'POST', [etiqueta]);
  return { contactId, via: 'workflow', etiqueta };
}

/** Una pasada: manda lo que toca respetando el cupo diario por dominio. */
export async function pasada({ maxPorDominio = 2 } = {}) {
  if (process.env.PROSPECCION_ENVIO_ACTIVO !== '1' || !PIT() || !LOC()) return { apagado: true };
  await pdb.migrar();
  const cupo = cupoDiario();
  const enviados = [];
  for (const dominio of DOMINIOS()) {
    const hoy = (await pdb.q(`SELECT count(*)::int n FROM prospeccion.envios WHERE canal='correo' AND dominio=$1 AND estado='enviado' AND creado >= date_trunc('day', now() AT TIME ZONE 'America/Merida') AT TIME ZONE 'America/Merida'`, [dominio])).rows[0].n;
    let libres = Math.min(maxPorDominio, cupo - hoy);
    if (libres <= 0) continue;
    // Seguimientos primero (pasos 1 y 2 de quienes ya recibieron el anterior por este dominio), luego nuevos.
    const pend = (await pdb.q(`
      WITH ult AS (SELECT negocio_id, max(paso) paso, max(creado) ultimo FROM prospeccion.envios WHERE canal='correo' AND estado='enviado' GROUP BY negocio_id)
      SELECT n.*, coalesce(u.paso, -1) + 1 AS siguiente FROM prospeccion.negocios n LEFT JOIN ult u ON u.negocio_id=n.id
      WHERE n.correo IS NOT NULL AND NOT n.baja AND n.token IS NOT NULL AND n.estado IN ('construido','contactado')
        AND coalesce(n.dominio_envio, $1) = $1
        AND (u.paso IS NULL OR (u.paso = 0 AND u.ultimo < now() - interval '3 days') OR (u.paso = 1 AND u.ultimo < now() - interval '4 days'))
        AND NOT EXISTS (SELECT 1 FROM prospeccion.clics k WHERE k.negocio_id=n.id AND k.tipo IN ('elige','whatsapp','baja'))
      ORDER BY (u.paso IS NOT NULL) DESC, n.resenas DESC LIMIT $2`, [dominio, libres])).rows;
    for (const n of pend) {
      if (n.siguiente >= PASOS.length) continue;
      try {
        const r = await enviarCorreo(n, n.siguiente, dominio);
        await pdb.q(`INSERT INTO prospeccion.envios (negocio_id, canal, paso, dominio, destino, estado, detalle) VALUES ($1,'correo',$2,$3,$4,'enviado',$5) ON CONFLICT (negocio_id, canal, paso) DO NOTHING`, [n.id, n.siguiente, dominio, n.correo, JSON.stringify(r)]);
        await pdb.actualizar(n.id, { estado: 'contactado', dominio_envio: dominio });
        enviados.push({ folio: n.folio, paso: n.siguiente, dominio });
      } catch (err) {
        console.error('[prospectos] correo', n.folio, err.message);
        await pdb.q(`INSERT INTO prospeccion.envios (negocio_id, canal, paso, dominio, destino, estado, detalle) VALUES ($1,'correo',$2,$3,$4,'error',$5) ON CONFLICT (negocio_id, canal, paso) DO UPDATE SET estado='error', detalle=EXCLUDED.detalle`, [n.id, n.siguiente, dominio, n.correo, JSON.stringify({ error: err.message })]);
      }
    }
  }
  return { cupo, enviados };
}

export function programarCorreos() {
  // Cada 15 minutos, de lunes a sábado de 9:00 a 18:45 (hora de Mérida): reparte el cupo del día.
  cron.schedule('*/15 9-18 * * 1-6', () => pasada().catch((e) => console.error('[prospectos] pasada', e.message)), { timezone: 'America/Merida' });
}
