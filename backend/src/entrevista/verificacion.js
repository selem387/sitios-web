// Verificación de contacto.email dentro de la entrevista (B9). Ese correo es el del administrador del sitio:
// con él entra sin contraseña (código o Google), así que se confirma con un código antes de cerrar.
// Estado en brief.contacto.email_verificacion = {estado, email, reenvios}
//   estado: enviado | verificado | sin_proveedor (no hay correo configurado: se verifica al entregar el acceso)
// y brief.contacto.email_verificado = true cuando queda confirmado.
import crypto from 'node:crypto';
import * as db from './db.js';
import { otpCode } from '../util.js';
import { enviarCodigo, correoConfigurado, EMAIL_RE, normalizarEmail, esEmail } from '../correo_codigos.js';

const VIGENCIA_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 5;
const MAX_REENVIOS = 3;
const REENVIAR = /no (me )?(ha )?lleg|no (me )?(sale|aparece|veo)|reenv|otra vez|otro c[oó]digo|manda(lo)? de nuevo|no lo encuentro/i;

const hashCodigo = (entrevistaId, codigo) => crypto.createHash('sha256').update(`${entrevistaId}:${codigo}`).digest('hex');
const ver = (brief) => brief?.contacto?.email_verificacion || null;
const conContacto = (brief, cambios) => ({ ...brief, contacto: { ...(brief.contacto || {}), ...cambios } });

export const emailVerificado = (brief) => brief?.contacto?.email_verificado === true && normalizarEmail(ver(brief)?.email) === normalizarEmail(brief?.contacto?.email);
// 5-nov-2026: ya no se verifica el correo con código (el acceso al panel se entrega por chat con enlace).
export const verificacionPendiente = () => false;
// Para el cierre: ¿falta algo del correo que impida completar?
export function faltaCorreo() { return null; }
export function faltaCorreoAnterior(brief) {
  if (!esEmail(brief?.contacto?.email)) return 'sin_email';
  if (emailVerificado(brief)) return null;
  if (!correoConfigurado()) return null; // sin proveedor: se verifica al entregar el acceso
  return 'sin_verificar';
}

// Genera y manda un código nuevo para el correo actual del brief. → { brief, texto }
export async function enviarVerificacion(e, brief, { reenvio = false } = {}) {
  const email = normalizarEmail(brief.contacto?.email);
  const previa = ver(brief);
  const reenvios = reenvio && normalizarEmail(previa?.email) === email ? (previa?.reenvios || 0) + 1 : 0;
  if (!correoConfigurado()) {
    await db.evento(e.id, 'correo_sin_proveedor', { email });
    return { brief: conContacto(brief, { email: email, email_verificado: false, email_verificacion: { estado: 'sin_proveedor', email, reenvios: 0 } }), texto: null };
  }
  const codigo = otpCode();
  const r = await enviarCodigo(email, codigo, { negocio: brief.negocio?.nombre, motivo: 'verificar' });
  await db.q(`INSERT INTO verificaciones_correo (entrevista_id, email, codigo_hash, entregado, proveedor, expira) VALUES ($1,$2,$3,$4,$5,$6)`,
    [e.id, email, hashCodigo(e.id, codigo), r.entregado, r.proveedor, new Date(Date.now() + VIGENCIA_MS)]);
  await db.evento(e.id, 'correo_codigo_enviado', { email, entregado: r.entregado, proveedor: r.proveedor, error: r.error, reenvios });
  const nuevo = conContacto(brief, { email, email_verificado: false, email_verificacion: { estado: 'enviado', email, reenvios } });
  if (!r.entregado) {
    return { brief: nuevo, texto: `No pude mandar el código a *${email}* 😕. ¿Está bien escrito? Si sí, escríbeme *reenviar* en un momento; si no, mándame el correo correcto.` };
  }
  return {
    brief: nuevo,
    texto: reenvio
      ? `Te mandé un código nuevo a *${email}*. Revisa también la carpeta de spam o promociones y escríbeme los 6 números.`
      : `Te acabo de mandar un código de 6 números a *${email}*. Con ese correo vas a entrar a administrar tu página (cambiar precios, productos, fotos y horarios), por eso lo confirmamos. ¿Me escribes el código?`,
  };
}

// Mientras hay un código enviado: atiende el código, un correo nuevo o "no me llegó".
// → { brief, textos, seguirConAri, notaAri }
export async function atenderVerificacion(e, brief, texto) {
  const v = ver(brief);
  const t = String(texto || '');
  const correoNuevo = (t.match(EMAIL_RE) || [])[0];
  if (correoNuevo && normalizarEmail(correoNuevo) !== normalizarEmail(v.email)) {
    const r = await enviarVerificacion(e, conContacto(brief, { email: normalizarEmail(correoNuevo) }));
    return { brief: r.brief, textos: [r.texto].filter(Boolean), seguirConAri: !r.texto };
  }
  const digitos = t.replace(/[\s-]/g, '').match(/(?<!\d)\d{6}(?!\d)/);
  if (digitos) {
    const fila = (await db.q(`SELECT * FROM verificaciones_correo WHERE entrevista_id=$1 AND email=$2 AND verificado IS NULL ORDER BY id DESC LIMIT 1`, [e.id, normalizarEmail(v.email)])).rows[0];
    if (!fila) return { brief, textos: ['No encuentro un código vigente. Escríbeme *reenviar* y te mando uno nuevo.'], seguirConAri: false };
    if (new Date(fila.expira).getTime() < Date.now()) return { brief, textos: ['Ese código ya venció (duran 10 minutos). Escríbeme *reenviar* y te mando uno nuevo.'], seguirConAri: false };
    if (fila.intentos >= MAX_INTENTOS) return { brief, textos: ['Ya fueron varios intentos con ese código. Escríbeme *reenviar* y te mando uno nuevo.'], seguirConAri: false };
    if (fila.codigo_hash !== hashCodigo(e.id, digitos[0])) {
      await db.q(`UPDATE verificaciones_correo SET intentos=intentos+1 WHERE id=$1`, [fila.id]);
      return { brief, textos: ['Ese código no coincide. Revisa el último correo que te llegó y escríbeme los 6 números.'], seguirConAri: false };
    }
    await db.q(`UPDATE verificaciones_correo SET verificado=now() WHERE id=$1`, [fila.id]);
    await db.evento(e.id, 'correo_verificado', { email: fila.email });
    const nuevo = conContacto(brief, { email_verificado: true, email_verificacion: { ...v, estado: 'verificado' } });
    return { brief: nuevo, textos: ['¡Listo, correo confirmado! ✅'], seguirConAri: true, notaAri: 'El cliente acaba de confirmar su correo con el código. No lo menciones otra vez; sigue con la siguiente pregunta pendiente.' };
  }
  if (REENVIAR.test(t)) {
    if ((v.reenvios || 0) >= MAX_REENVIOS) return { brief, textos: ['Ya te mandé varios códigos y no te llegan. ¿Me confirmas el correo, o me das otro? Puede ser un Gmail.'], seguirConAri: false };
    const r = await enviarVerificacion(e, brief, { reenvio: true });
    return { brief: r.brief, textos: [r.texto].filter(Boolean), seguirConAri: !r.texto };
  }
  // Cualquier otra cosa: la contesta Ari, que pide el código antes de cerrar B9.
  return { brief, textos: [], seguirConAri: true };
}

// Después del turno de Ari: si el correo del brief es nuevo o cambió, manda el código.
export function correoCambio() { return false; }
export function correoCambioAnterior(antes, despues) {
  const a = normalizarEmail(antes?.contacto?.email);
  const d = normalizarEmail(despues?.contacto?.email);
  return esEmail(d) && d !== a && normalizarEmail(ver(despues)?.email) !== d;
}
