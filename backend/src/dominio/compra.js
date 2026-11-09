// Compra de dominio para el cliente (sin margen, 1 año, sin renovación automática). Incluida en el pago de la página
// si nos cuesta menos de DOMINIO_INCLUIDO_MAX_MXN (registrarIncluida, sin cobro); si no, se cobra aparte con Stripe:
//   cotizada → pago_pendiente → pagada → registrando → registrada → conectando → lista
//   desvíos: pago_vencido · reembolsada (no se pudo registrar) · requiere_revision (avisa al equipo)
// La cuenta que paga a GoDaddy es la de IAprop: el registro SOLO se ejecuta con el pago de Stripe confirmado.
// Tabla dominios_compras (base web_builder). El resumen para la conversación vive en brief.tecnico.dominio_flujo.
import crypto from 'node:crypto';
import * as db from '../entrevista/db.js';
import { config } from '../config.js';
import { avisar, avisarEquipo } from '../entrevista/avisos.js';
import * as GD from './godaddy.js';
import * as ST from './stripe.js';
import { precioCliente, pesos } from './precio.js';
import { conectar, estadoConexion, conexionConfigurada } from './conexion.js';
import { disenoElegido } from '../panel/sitios.js';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Estado de la conversación (atómico: el webhook y el chat pueden escribir a la vez) ---------- */
export async function patchFlujo(entrevistaId, patch, tecnico = {}) {
  await db.q(`UPDATE entrevistas SET brief =
      jsonb_set(
        jsonb_set(brief, '{tecnico}', COALESCE(brief->'tecnico','{}'::jsonb) || $3::jsonb),
        '{tecnico,dominio_flujo}', COALESCE(brief#>'{tecnico,dominio_flujo}','{}'::jsonb) || $2::jsonb),
      actualizado=now()
    WHERE id=$1`, [entrevistaId, JSON.stringify(patch), JSON.stringify(tecnico)]);
}
export async function leerFlujo(entrevistaId) {
  const r = await db.q(`SELECT brief#>'{tecnico,dominio_flujo}' AS f FROM entrevistas WHERE id=$1`, [entrevistaId]);
  return r.rows[0]?.f || null;
}

/* ---------- Compras ---------- */
export async function obtener(id) {
  return (await db.q('SELECT * FROM dominios_compras WHERE id=$1', [id])).rows[0] || null;
}
async function guardar(id, cambios) {
  const cols = Object.keys(cambios);
  if (!cols.length) return;
  const vals = cols.map((k) => { const v = cambios[k]; return v && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v; });
  await db.q(`UPDATE dominios_compras SET ${cols.map((k, i) => `${k}=$${i + 2}`).join(', ')}, actualizado=now() WHERE id=$1`, [id, ...vals]);
}

/** Cotiza con GoDaddy y calcula el precio al cliente. → {cotizacion, precio} (lanza si no está disponible) */
export async function cotizarParaCliente(dominio) {
  const c = await GD.cotizar(dominio, 1);
  if (!c.disponible || !c.quoteToken) { const e = new Error('no_disponible'); e.codigo = 'no_disponible'; throw e; }
  const costo = (c.precio.monto || 0) + (c.fees_monto || 0);
  if (!(costo > 0)) throw new Error('cotización sin precio');
  const precio = await precioCliente(costo, c.precio.moneda || 'USD');
  return { cotizacion: c, precio };
}

export async function crearCompra(e, { dominio, titularidad, traspasoEmail, cotizacion, precio }) {
  const id = crypto.randomUUID();
  await db.q(`INSERT INTO dominios_compras (id, entrevista_id, dominio, estado, titularidad, traspaso_email, costo, moneda, precio, acuerdos)
              VALUES ($1,$2,$3,'cotizada',$4,$5,$6,$7,$8,$9)`,
  [id, e.id, dominio, titularidad, traspasoEmail || null, cotizacion.precio.monto + (cotizacion.fees_monto || 0), cotizacion.precio.moneda, JSON.stringify(precio), JSON.stringify(cotizacion.acuerdos)]);
  await db.evento(e.id, 'dominio_cotizado', { compra_id: id, dominio, total_mxn: precio.total_mxn, costo: precio.costo, moneda: precio.moneda, tc: precio.tc });
  return id;
}

/** Registra la aceptación del cliente y genera la liga de pago. → url */
export async function ligaDePago(compraId, { email, agreedAt = new Date().toISOString() } = {}) {
  const c = await obtener(compraId);
  if (!c) throw new Error('compra no existe');
  if (!c.acuerdo_aceptado) await guardar(compraId, { acuerdo_aceptado: agreedAt });
  if (c.stripe_url && c.estado === 'pago_pendiente' && new Date(c.stripe_expira).getTime() > Date.now() + 15 * 60e3) return c.stripe_url;
  const s = await ST.crearCheckout({
    compraId, dominio: c.dominio, centavos: c.precio.total_centavos, email,
    exito: `${config.publicUrl}/pago/listo?c=${compraId}`,
    cancelar: `${config.publicUrl}/pago/cancelado?c=${compraId}`,
  });
  await guardar(compraId, { estado: 'pago_pendiente', stripe_session_id: s.id, stripe_url: s.url, stripe_expira: new Date(s.expires_at * 1000) });
  await db.evento(c.entrevista_id, 'dominio_liga_pago', { compra_id: compraId, session: s.id });
  return s.url;
}

/** Dominio incluido en el pago de la página: sin cobro, pasa directo a registrarse. */
export async function registrarIncluida(compraId, { agreedAt = new Date().toISOString() } = {}) {
  const r = await db.q(`UPDATE dominios_compras SET estado='pagada', pagado=now(), cobrado_centavos=0, acuerdo_aceptado=COALESCE(acuerdo_aceptado, $2), actualizado=now()
                        WHERE id=$1 AND estado='cotizada' AND (precio->>'incluido')::boolean IS TRUE RETURNING *`, [compraId, agreedAt]);
  const c = r.rows[0];
  if (!c) return false;
  await patchFlujo(c.entrevista_id, { estado: 'pagada' });
  await db.evento(c.entrevista_id, 'dominio_incluido', { compra_id: c.id, dominio: c.dominio, costo_mxn: c.precio?.neto_mxn });
  registrarCompra(c.id).catch((err) => console.error('registrarCompra', err));
  return true;
}

/** Revisa en Stripe si ya se pagó (por si el webhook se retrasa). → true si quedó pagada */
export async function revisarPago(compraId) {
  const c = await obtener(compraId);
  if (!c?.stripe_session_id) return false;
  if (['pagada', 'registrando', 'registrada', 'conectando', 'lista'].includes(c.estado)) return true;
  const s = await ST.obtenerCheckout(c.stripe_session_id);
  if (s.payment_status === 'paid') { await alPagar(s); return true; }
  return false;
}

/* ---------- Webhook de Stripe ---------- */
export async function procesarEventoStripe(ev) {
  const s = ev?.data?.object || {};
  const compraId = s.metadata?.compra_id || s.client_reference_id;
  if (!compraId) return { ignorado: 'sin compra_id' };
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(ev.type) && s.payment_status === 'paid') return alPagar(s);
  if (ev.type === 'checkout.session.expired') {
    const r = await db.q(`UPDATE dominios_compras SET estado='pago_vencido', actualizado=now() WHERE id=$1 AND estado='pago_pendiente' RETURNING entrevista_id, dominio`, [compraId]);
    if (r.rows[0]) {
      await patchFlujo(r.rows[0].entrevista_id, { estado: 'pago_vencido' });
      await avisar(r.rows[0].entrevista_id, [`La liga para pagar *${r.rows[0].dominio}* venció sin pago. Si todavía la quieres, escríbeme *pagar* y te mando una nueva (reviso que siga libre).`], { evento: 'dominio_pago_vencido' });
    }
    return { ok: true };
  }
  return { ignorado: ev.type };
}

async function alPagar(s) {
  const compraId = s.metadata?.compra_id || s.client_reference_id;
  const r = await db.q(`UPDATE dominios_compras SET estado='pagada', pagado=now(), stripe_payment_intent=$2, cobrado_centavos=$3, actualizado=now()
                        WHERE id=$1 AND estado IN ('pago_pendiente','pago_vencido','cotizada') RETURNING *`, [compraId, s.payment_intent, s.amount_total]);
  const c = r.rows[0];
  if (!c) return { ok: true, repetido: true };
  await patchFlujo(c.entrevista_id, { estado: 'pagada' });
  await avisar(c.entrevista_id, [`¡Recibí tu pago! ✅ Estoy registrando *${c.dominio}*; en unos minutos te aviso.`], { evento: 'dominio_pagado', datos: { compra_id: c.id } });
  registrarCompra(c.id).catch((err) => console.error('registrarCompra', err));
  return { ok: true };
}

/* ---------- Registro en GoDaddy (solo con pago confirmado) ---------- */
const TERMINAL_OK = /COMPLETED|SUCCEEDED|ACTIVE/i;
const TERMINAL_MAL = /FAILED|CANCELLED|REJECTED|ERROR/i;

export async function registrarCompra(compraId) {
  // Candado: solo una ejecución pasa de pagada → registrando.
  const r = await db.q(`UPDATE dominios_compras SET estado='registrando', intentos=intentos+1, actualizado=now() WHERE id=$1 AND estado='pagada' RETURNING *`, [compraId]);
  const c = r.rows[0];
  if (!c) return;
  try {
    // ¿Ya quedó en la cuenta (reintento después de un corte)?
    let enCuenta = await GD.dominioEnCuenta(c.dominio).catch(() => null);
    let registro = null;
    if (!enCuenta) {
      const q = await GD.cotizar(c.dominio, 1);
      if (!q.disponible || !q.quoteToken) return await fallarConReembolso(c, 'La dirección dejó de estar disponible antes de registrarla.');
      const aceptados = (c.acuerdos || []).map((a) => a.tipo);
      const nuevos = q.acuerdos.map((a) => a.tipo).filter((t) => !aceptados.includes(t));
      if (nuevos.length) return await revisar(c, `GoDaddy pide acuerdos nuevos que el cliente no aceptó: ${nuevos.join(', ')}`);
      const costoNuevo = (q.precio.monto || 0) + (q.fees_monto || 0);
      if (costoNuevo > Number(c.costo) * 1.25) return await revisar(c, `El costo subió de ${c.costo} a ${costoNuevo} ${q.precio.moneda}`);
      try {
        registro = await GD.registrar({ dominio: c.dominio, quoteToken: q.quoteToken, acuerdos: q.acuerdos.map((a) => a.tipo), agreedAt: new Date(c.acuerdo_aceptado || c.pagado).toISOString(), fees: q.fees, idempotencia: `${c.id}-${c.intentos}` });
      } catch (e) {
        if (e.codigo === 'domain_already_exists' || e.status === 409) {
          enCuenta = await GD.dominioEnCuenta(c.dominio).catch(() => null);
          if (!enCuenta) return await fallarConReembolso(c, 'Alguien más registró esa dirección justo antes.');
        } else throw e;
      }
      if (registro) {
        await guardar(c.id, { registro_id: registro.id, registro: registro.crudo, costo_final: costoNuevo });
        let estado = registro.estado;
        for (let i = 0; i < 60 && !TERMINAL_OK.test(estado) && !TERMINAL_MAL.test(estado); i++) {
          await dormir(10000);
          estado = (await GD.estadoRegistro(registro.id).catch(() => ({ estado }))).estado;
        }
        if (TERMINAL_MAL.test(estado)) return await fallarConReembolso(c, `GoDaddy no completó el registro (${estado}).`);
        if (!TERMINAL_OK.test(estado)) {
          // Sigue en proceso después de 10 min: se deja para el cron, sin reenviar la compra.
          await guardar(c.id, { estado: 'registrando', error: `en proceso (${estado})` });
          return;
        }
      }
    }
    await terminarRegistro(c.id);
  } catch (e) {
    console.error('registro dominio', c.dominio, e);
    // Error de red o 5xx: se regresa a pagada para que el cron reintente (máximo 4 veces).
    if (c.intentos >= 4) return revisar(c, `Falló el registro 4 veces: ${e.message}`);
    await guardar(c.id, { estado: 'pagada', error: String(e.message).slice(0, 500) });
  }
}

async function terminarRegistro(compraId) {
  const c = await obtener(compraId);
  const via = await GD.sinRenovacion(c.dominio).catch((e) => { console.error('sin renovación', e.message); return null; });
  const vence = new Date(Date.now() + 365 * 864e5);
  await guardar(c.id, { estado: 'registrada', renovacion_apagada: Boolean(via), vence, error: via ? null : 'no se pudo apagar la renovación automática' });
  if (!via) await avisarEquipo('Apagar renovación automática', `No se pudo apagar la renovación automática de ${c.dominio} (compra ${c.id}). Apágala a mano en GoDaddy.`, c.entrevista_id);
  await patchFlujo(c.entrevista_id, { estado: 'registrada', vence: vence.toISOString() }, { tiene_dominio: true, dominio: c.dominio });
  const fecha = vence.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const textos = [`¡Listo! *${c.dominio}* ya está registrado ✅. Vale por un año, hasta el ${fecha}, y no se renueva solo.`];
  if (c.titularidad === 'traspaso') {
    textos.push('Para pasártelo a tu nombre, alguien de nuestro equipo te contacta por aquí con los pasos (solo tienes que aceptar un correo de GoDaddy).');
    await avisarEquipo('Traspaso de dominio solicitado', `Cliente pidió traspaso de ${c.dominio} a su cuenta de GoDaddy. Correo de su cuenta: ${c.traspaso_email || '(no dio; pedírselo)'}. Compra ${c.id}, entrevista ${c.entrevista_id}.`, c.entrevista_id);
  }
  textos.push('Ahora lo conecto con tu página; tarda unos minutos y te mando la liga en cuanto se vea.');
  await avisar(c.entrevista_id, textos, { evento: 'dominio_registrado', datos: { compra_id: c.id } });
  await conectarCompra(c.id);
}

async function conectarCompra(compraId) {
  const c = await obtener(compraId);
  if (!conexionConfigurada()) return revisar(c, 'Falta DOMINIOS_API_KEY en api: conectar el dominio a mano con el microservicio dominios.', { sinReembolso: true });
  try {
    const e = await db.obtener(c.entrevista_id);
    const t = await conectar({ dominio: c.dominio, sesionId: c.entrevista_id, elegido: disenoElegido(e?.brief) });
    await guardar(c.id, { estado: 'conectando', conexion: t });
    await patchFlujo(c.entrevista_id, { estado: 'conectando' });
  } catch (e) {
    if (e.status === 409) { await guardar(c.id, { estado: 'conectando' }); return; }
    if (e.status === 425) { await guardar(c.id, { estado: 'esperando_eleccion' }); return; }
    await guardar(c.id, { error: `conexión: ${e.message}`.slice(0, 500) });
  }
}

async function fallarConReembolso(c, motivo) {
  let reembolso = null;
  try { if (c.stripe_payment_intent) reembolso = await ST.reembolsar(c.stripe_payment_intent); }
  catch (e) { return revisar(c, `${motivo} Además falló el reembolso automático: ${e.message}`); }
  await guardar(c.id, { estado: 'reembolsada', error: motivo, reembolso });
  await patchFlujo(c.entrevista_id, { estado: 'reembolsada', motivo });
  const cobrado = Boolean(c.stripe_payment_intent) && !c.precio?.incluido;
  await avisar(c.entrevista_id, [
    `No pude registrar *${c.dominio}*: ${motivo.charAt(0).toLowerCase()}${motivo.slice(1)}${cobrado ? ` Ya te regresé tu pago completo (${pesos((c.cobrado_centavos || c.precio.total_centavos) / 100)}); según tu banco se ve en 5 a 10 días.` : ''}`,
    '¿Buscamos otra dirección? Dime una idea de nombre y reviso cuáles están libres.',
  ], { evento: 'dominio_reembolsado', datos: { compra_id: c.id } });
  await avisarEquipo('Dominio reembolsado', `${c.dominio}: ${motivo} (compra ${c.id})`, c.entrevista_id);
}

async function revisar(c, motivo, { sinReembolso = false } = {}) {
  await guardar(c.id, { estado: 'requiere_revision', error: motivo.slice(0, 1000) });
  await patchFlujo(c.entrevista_id, { estado: 'requiere_revision' });
  if (!sinReembolso) await avisar(c.entrevista_id, [`${c.precio?.incluido ? `Tu dirección *${c.dominio}* ya está en proceso.` : `Tu pago de *${c.dominio}* está recibido.`} Hubo un detalle al registrarlo y alguien de nuestro equipo lo está revisando; te aviso por aquí en cuanto quede.`], { evento: 'dominio_revision' });
  await avisarEquipo('Compra de dominio requiere revisión', `${c.dominio} (compra ${c.id}, entrevista ${c.entrevista_id}): ${motivo}`, c.entrevista_id);
}

/* ---------- Cron (cada 10 min) ---------- */
export async function cronCompras() {
  // 1) Pagadas que no se registraron (corte, error temporal).
  for (const c of (await db.q(`SELECT id FROM dominios_compras WHERE estado='pagada' AND actualizado < now() - interval '5 minutes'`)).rows) await registrarCompra(c.id).catch(() => {});
  // 2) Registros que seguían en proceso en GoDaddy.
  for (const c of (await db.q(`SELECT * FROM dominios_compras WHERE estado='registrando' AND actualizado < now() - interval '15 minutes'`)).rows) {
    try {
      const enCuenta = await GD.dominioEnCuenta(c.dominio);
      if (enCuenta) { await terminarRegistro(c.id); continue; }
      if (c.registro_id) {
        const { estado } = await GD.estadoRegistro(c.registro_id);
        if (TERMINAL_OK.test(estado)) await terminarRegistro(c.id);
        else if (TERMINAL_MAL.test(estado)) await fallarConReembolso(c, `GoDaddy no completó el registro (${estado}).`);
        else if (Date.now() - new Date(c.pagado).getTime() > 6 * 3600e3) await revisar(c, `Registro sigue en ${estado} después de 6 h`);
      } else await guardar(c.id, { estado: 'pagada' });
    } catch (e) { console.error('cron registrando', c.dominio, e.message); }
  }
  // 3) Registradas sin conectar (faltaba configuración o falló la llamada).
  for (const c of (await db.q(`SELECT id FROM dominios_compras WHERE (estado='registrada' AND actualizado < now() - interval '10 minutes') OR estado='esperando_eleccion'`)).rows) await conectarCompra(c.id).catch(() => {});
  // 4) Conectando → lista cuando el microservicio termina.
  for (const c of (await db.q(`SELECT * FROM dominios_compras WHERE estado='conectando'`)).rows) {
    try {
      const t = await estadoConexion(c.dominio);
      if (t?.estado === 'listo') {
        await guardar(c.id, { estado: 'lista', conexion: t });
        await patchFlujo(c.entrevista_id, { estado: 'lista', url: t.resultado?.url || `https://${c.dominio}/` });
        await avisar(c.entrevista_id, [`Tu página ya se ve en tu dirección 🎉\nhttps://${c.dominio}/\n\nÁbrela en tu celular. En unos minutos te mando aquí la liga para administrarla.`], { evento: 'dominio_listo', datos: { compra_id: c.id } });
      } else if (t?.estado === 'error' || t?.estado === 'interrumpido') {
        if (Date.now() - new Date(c.actualizado).getTime() > 3600e3) await revisar(c, `El microservicio dominios terminó en ${t.estado}: ${t.error || ''}`, { sinReembolso: true });
      }
    } catch (e) { console.error('cron conectando', c.dominio, e.message); }
  }
  // 5) Opción "te aviso antes de que venza": 30 días antes.
  for (const c of (await db.q(`SELECT * FROM dominios_compras WHERE titularidad='aviso_vencimiento' AND estado IN ('registrada','conectando','lista')
                               AND aviso_vencimiento IS NULL AND vence < now() + interval '30 days'`)).rows) {
    await guardar(c.id, { aviso_vencimiento: new Date() });
    const fecha = new Date(c.vence).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    await avisar(c.entrevista_id, [`Hola 👋 Te aviso que *${c.dominio}*, la dirección de tu página, vence el ${fecha} y no se renueva sola. ¿Quieres renovarla un año más o que te la pasemos a tu nombre? Respóndeme y lo vemos.`], { evento: 'dominio_por_vencer' });
    await avisarEquipo('Dominio por vencer', `${c.dominio} vence el ${fecha} (compra ${c.id}). El cliente eligió aviso previo.`, c.entrevista_id);
  }
}

export async function borrarFlujo(entrevistaId) {
  await db.q(`UPDATE entrevistas SET brief = brief #- '{tecnico,dominio_flujo}', actualizado=now() WHERE id=$1`, [entrevistaId]);
}
