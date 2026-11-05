// Acceso del dueño a su panel, sin contraseña: código de 6 dígitos a su correo o "Entrar con Google".
// Solo entra el correo registrado como administrador del sitio (sitios_vivos.admin_email). Sesión en cookie firmada.
// Google necesita una sola dirección de regreso registrada, así que el login con Google pasa por ACCESO_URL
// (dominio neutro) y vuelve al dominio del cliente con un pase de un solo uso.
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';
import * as db from '../entrevista/db.js';
import { otpCode } from '../util.js';
import { enviarCodigo } from '../correo_codigos.js';

const q = db.q;
const cookie = (sv) => `sv_admin_${sv.id}`;
const DIAS = 30;
const secreto = () => new TextEncoder().encode(config.panelSecret || 'cambia-PANEL_SECRET');
const hashCodigo = (sitioId, codigo) => crypto.createHash('sha256').update(`${sitioId}:${codigo}`).digest('hex');
const igualEmail = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
export const googleActivo = () => Boolean(config.googleClientId && config.googleClientSecret);

/* ---------------- Código al correo ---------------- */
// Respuesta idéntica exista o no el correo, para no revelar quién administra el sitio.
export async function pedirCodigo(sv, email, negocio) {
  if (!igualEmail(email, sv.admin_email)) return { ok: true };
  const recientes = (await q(`SELECT count(*)::int AS n FROM codigos_panel WHERE sitio_id=$1 AND creado > now() - interval '1 hour'`, [sv.id])).rows[0].n;
  if (recientes >= 6) return { ok: false, error: 'Ya pediste varios códigos. Espera unos minutos e inténtalo de nuevo.' };
  const codigo = otpCode();
  await q(`INSERT INTO codigos_panel (sitio_id, email, codigo_hash, expira) VALUES ($1,$2,$3, now() + interval '10 minutes')`, [sv.id, sv.admin_email, hashCodigo(sv.id, codigo)]);
  const r = await enviarCodigo(sv.admin_email, codigo, { negocio, motivo: 'acceso' });
  if (!r.entregado) { console.error('[panel] código no entregado', sv.id, r.error); return { ok: false, error: 'No pudimos mandar el código en este momento. Inténtalo en unos minutos.' }; }
  return { ok: true };
}

export async function validarCodigo(sv, email, codigo) {
  if (!igualEmail(email, sv.admin_email)) return false;
  const c = String(codigo || '').replace(/\D/g, '');
  const fila = (await q(`SELECT * FROM codigos_panel WHERE sitio_id=$1 AND usado IS NULL AND expira > now() ORDER BY id DESC LIMIT 1`, [sv.id])).rows[0];
  if (!fila || fila.intentos >= 5 || c.length !== 6) return false;
  if (fila.codigo_hash !== hashCodigo(sv.id, c)) { await q(`UPDATE codigos_panel SET intentos=intentos+1 WHERE id=$1`, [fila.id]); return false; }
  await q(`UPDATE codigos_panel SET usado=now() WHERE id=$1`, [fila.id]);
  return true;
}

/* ---------------- Sesión ---------------- */
export async function emitirSesion(c, sv, metodo, ruta = '/') {
  const jwt = await new SignJWT({ sid: sv.id, email: sv.admin_email, metodo, typ: 'panel' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${DIAS}d`).sign(secreto());
  const seguro = !/^localhost$|^127\./.test(String(c.req.header('host') || '').split(':')[0]);
  c.header('set-cookie', `${cookie(sv)}=${jwt}; Path=${ruta}; HttpOnly; SameSite=Lax; Max-Age=${DIAS * 86400}${seguro ? '; Secure' : ''}`, { append: true });
  await db.evento(sv.entrevista_id, 'panel_entrada', { sitio_id: sv.id, metodo });
}

export function cerrarSesion(c, sv, ruta = '/') {
  c.header('set-cookie', `${cookie(sv)}=; Path=${ruta}; HttpOnly; SameSite=Lax; Max-Age=0`, { append: true });
}

export async function sesionDe(c, sv) {
  const m = String(c.req.header('cookie') || '').match(new RegExp(`(?:^|;\\s*)${cookie(sv)}=([^;]+)`));
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], secreto());
    if (payload.typ !== 'panel' || payload.sid !== sv.id || !igualEmail(payload.email, sv.admin_email)) return null;
    return payload;
  } catch { return null; }
}

/* ---------------- Google ---------------- */
const accesoUrl = () => (config.accesoUrl || config.publicUrl).replace(/\/$/, '');
const regreso = () => `${accesoUrl()}/acceso/google/callback`;

export async function urlGoogle(sv) {
  const state = await new SignJWT({ sid: sv.id, typ: 'g-state', n: crypto.randomBytes(8).toString('hex') })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('10m').sign(secreto());
  const p = new URLSearchParams({ client_id: config.googleClientId, redirect_uri: regreso(), response_type: 'code', scope: 'openid email', state, prompt: 'select_account', login_hint: sv.admin_email });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/** Callback en ACCESO_URL → {sv, pase} o {error}. */
export async function callbackGoogle({ code, state }, buscarSitio) {
  let sid;
  try { const { payload } = await jwtVerify(String(state || ''), secreto()); if (payload.typ !== 'g-state') throw new Error(); sid = payload.sid; }
  catch { return { error: 'La liga para entrar ya venció. Vuelve a intentarlo desde tu página.' }; }
  const sv = await buscarSitio(sid);
  if (!sv) return { error: 'Sitio no encontrado.' };
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: String(code || ''), client_id: config.googleClientId, client_secret: config.googleClientSecret, redirect_uri: regreso(), grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(15000),
  });
  const t = await r.json().catch(() => ({}));
  if (!r.ok || !t.id_token) return { sv, error: 'Google no confirmó tu cuenta. Inténtalo de nuevo.' };
  // El id_token llega directo de Google por TLS; se revisan emisor, audiencia y correo verificado.
  const claims = JSON.parse(Buffer.from(t.id_token.split('.')[1], 'base64url').toString('utf8'));
  if (!['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss) || claims.aud !== config.googleClientId || !claims.email_verified) return { sv, error: 'No pudimos verificar tu cuenta de Google.' };
  if (!igualEmail(claims.email, sv.admin_email)) return { sv, error: `Esa cuenta (${claims.email}) no es la que administra esta página. Entra con ${sv.admin_email} o pide un código a tu correo.` };
  const pase = await new SignJWT({ sid: sv.id, typ: 'g-pase', jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('2m').sign(secreto());
  return { sv, pase };
}

/** En el dominio del cliente: canjea el pase (un solo uso). */
export async function canjearPase(sv, pase) {
  try {
    const { payload } = await jwtVerify(String(pase || ''), secreto());
    if (payload.typ !== 'g-pase' || payload.sid !== sv.id) return false;
    const r = await q(`INSERT INTO panel_tokens_usados (jti, expira) VALUES ($1, now() + interval '10 minutes') ON CONFLICT DO NOTHING RETURNING jti`, [payload.jti]);
    await q(`DELETE FROM panel_tokens_usados WHERE expira < now()`).catch(() => {});
    return r.rows.length === 1;
  } catch { return false; }
}
