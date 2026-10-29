// Endpoints de autenticación con el mismo contrato que Base44.
import {
  signUserToken, hashPassword, checkPassword, findUserByEmail, createUser, userToRecord, requireUser, requireAdmin,
} from './authcore.js';
import { sendMail } from './mail.js';
import { HttpError, otpCode, randomToken } from './util.js';
import { config } from './config.js';
import { emitEntityEvent } from './realtime.js';

const OTP_MINUTES = 15;
const RESET_HOURS = 2;

function appUrl(tenant, c) {
  const fromSettings = tenant.settings.app_url;
  if (fromSettings) return fromSettings.replace(/\/$/, '');
  const origin = c.req.header('origin') || c.req.header('x-origin-url');
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      /* ignorar */
    }
  }
  return config.publicUrl;
}

async function sendOtp(tenant, user) {
  const code = otpCode();
  await tenant.pool.query(
    `UPDATE users SET otp_code = $2, otp_expires = now() + interval '${OTP_MINUTES} minutes' WHERE id = $1`,
    [user.id, code]
  );
  await sendMail(tenant, {
    to: user.email,
    subject: `Tu código de verificación: ${code}`,
    html: `<p>Tu código para ${tenant.name} es:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Vence en ${OTP_MINUTES} minutos.</p>`,
    text: `Tu código para ${tenant.name} es ${code}. Vence en ${OTP_MINUTES} minutos.`,
  });
}

// Migración perezosa: si el usuario aún no tiene contraseña local, se valida
// una vez contra Base44 y se guarda el hash aquí.
async function tryBase44Fallback(tenant, email, password) {
  if (!tenant.settings.base44_fallback_login) return null;
  try {
    const res = await fetch(`${config.base44Url}/api/apps/${tenant.app_id}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Id': tenant.app_id },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const remote = body.user || {};
    let user = await findUserByEmail(tenant, email);
    const hash = await hashPassword(password);
    if (user) {
      const r = await tenant.pool.query(
        'UPDATE users SET password_hash = $2, is_verified = true, updated_date = now() WHERE id = $1 RETURNING *',
        [user.id, hash]
      );
      user = r.rows[0];
    } else {
      user = await createUser(tenant, {
        id: remote.id,
        email,
        full_name: remote.full_name,
        role: remote.role || 'user',
        password,
        is_verified: true,
      });
    }
    return user;
  } catch (e) {
    console.warn('[auth] fallback Base44 falló:', e.message);
    return null;
  }
}

export async function loginWithPassword(tenant, email, password) {
  let user = await findUserByEmail(tenant, email);
  if (user && user.disabled) throw new HttpError(403, 'Usuario deshabilitado');
  let ok = user && (await checkPassword(password, user.password_hash));
  if (!ok) {
    const migrated = await tryBase44Fallback(tenant, email, password);
    if (migrated) {
      user = migrated;
      ok = true;
    }
  }
  if (!ok) throw new HttpError(401, 'Invalid email or password');
  if (!user.is_verified && tenant.settings.require_email_verification !== false && user.password_hash) {
    // Los usuarios importados de Base44 ya vienen verificados.
    await sendOtp(tenant, user);
    throw new HttpError(403, 'Email not verified', { reason: 'email_not_verified' });
  }
  const access_token = await signUserToken(tenant, user);
  return { access_token, user: userToRecord(user) };
}

export function registerAuthRoutes(app, ctx) {
  app.post('/api/apps/:appId/auth/login', ctx(async (c, { tenant, body }) => {
    if (tenant.settings.auth?.password === false) throw new HttpError(403, 'Login con contraseña deshabilitado');
    return loginWithPassword(tenant, body?.email, body?.password);
  }));

  app.post('/api/apps/:appId/auth/register', ctx(async (c, { tenant, body }) => {
    if (tenant.settings.auth?.allow_signup === false) throw new HttpError(403, 'El registro está deshabilitado');
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    if (!email || !email.includes('@')) throw new HttpError(400, 'Email inválido');
    if (password.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
    let user = await findUserByEmail(tenant, email);
    if (user && user.is_verified && user.password_hash) throw new HttpError(409, 'User already exists');
    if (user) {
      const r = await tenant.pool.query(
        'UPDATE users SET password_hash = $2, full_name = COALESCE($3, full_name), updated_date = now() WHERE id = $1 RETURNING *',
        [user.id, await hashPassword(password), body?.full_name || null]
      );
      user = r.rows[0];
    } else {
      user = await createUser(tenant, { email, password, full_name: body?.full_name });
      emitEntityEvent(tenant, 'User', 'create', userToRecord(user));
    }
    await sendOtp(tenant, user);
    return { message: 'Verification code sent', email };
  }));

  app.post('/api/apps/:appId/auth/verify-otp', ctx(async (c, { tenant, body }) => {
    const user = await findUserByEmail(tenant, body?.email);
    const code = String(body?.otp_code || body?.otpCode || '');
    if (!user || !user.otp_code || user.otp_code !== code || new Date(user.otp_expires) < new Date()) {
      throw new HttpError(400, 'Invalid or expired code');
    }
    const r = await tenant.pool.query(
      'UPDATE users SET is_verified = true, otp_code = NULL, otp_expires = NULL, updated_date = now() WHERE id = $1 RETURNING *',
      [user.id]
    );
    const access_token = await signUserToken(tenant, r.rows[0]);
    return { access_token, user: userToRecord(r.rows[0]) };
  }));

  app.post('/api/apps/:appId/auth/resend-otp', ctx(async (c, { tenant, body }) => {
    const user = await findUserByEmail(tenant, body?.email);
    if (user) await sendOtp(tenant, user);
    return { message: 'Verification code sent' };
  }));

  app.post('/api/apps/:appId/auth/reset-password-request', ctx(async (c, { tenant, body }) => {
    const user = await findUserByEmail(tenant, body?.email);
    if (user) {
      const token = randomToken(24);
      await tenant.pool.query(
        `UPDATE users SET reset_token = $2, reset_expires = now() + interval '${RESET_HOURS} hours' WHERE id = $1`,
        [user.id, token]
      );
      const link = `${appUrl(tenant, c)}/reset-password?token=${token}`;
      await sendMail(tenant, {
        to: user.email,
        subject: `Restablece tu contraseña de ${tenant.name}`,
        html: `<p>Para crear una nueva contraseña abre este enlace:</p><p><a href="${link}">${link}</a></p><p>Vence en ${RESET_HOURS} horas.</p>`,
        text: `Para crear una nueva contraseña abre: ${link}`,
      });
    }
    return { message: 'If the email exists, a reset link was sent' };
  }));

  app.post('/api/apps/:appId/auth/reset-password', ctx(async (c, { tenant, body }) => {
    const token = String(body?.reset_token || '');
    const pw = String(body?.new_password || '');
    if (pw.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
    const r = await tenant.pool.query(
      `UPDATE users SET password_hash = $2, reset_token = NULL, reset_expires = NULL, is_verified = true, updated_date = now()
       WHERE reset_token = $1 AND reset_expires > now() RETURNING id`,
      [token, await hashPassword(pw)]
    );
    if (!r.rowCount) throw new HttpError(400, 'Invalid or expired reset token');
    return { message: 'Password updated' };
  }));

  app.post('/api/apps/:appId/auth/change-password', ctx(async (c, { tenant, caller, body }) => {
    const me = requireUser(caller);
    const r0 = await tenant.pool.query('SELECT * FROM users WHERE id = $1', [me.id]);
    if (!(await checkPassword(String(body?.current_password || ''), r0.rows[0].password_hash))) {
      throw new HttpError(400, 'Current password is incorrect');
    }
    const pw = String(body?.new_password || '');
    if (pw.length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
    await tenant.pool.query('UPDATE users SET password_hash = $2, updated_date = now() WHERE id = $1', [me.id, await hashPassword(pw)]);
    return { message: 'Password updated' };
  }));

  const invite = ctx(async (c, { tenant, caller, body }) => {
    requireAdmin(caller);
    const email = String(body?.user_email || '').trim();
    const role = body?.role === 'admin' ? 'admin' : 'user';
    if (!email.includes('@')) throw new HttpError(400, 'Email inválido');
    let user = await findUserByEmail(tenant, email);
    if (!user) {
      user = await createUser(tenant, { email, role, is_verified: true });
      emitEntityEvent(tenant, 'User', 'create', userToRecord(user));
    }
    const token = randomToken(24);
    await tenant.pool.query(
      `UPDATE users SET reset_token = $2, reset_expires = now() + interval '7 days', role = $3 WHERE id = $1`,
      [user.id, token, role]
    );
    const link = `${appUrl(tenant, c)}/reset-password?token=${token}`;
    await sendMail(tenant, {
      to: email,
      subject: `Te invitaron a ${tenant.name}`,
      html: `<p>Te invitaron a ${tenant.name}. Crea tu contraseña aquí:</p><p><a href="${link}">${link}</a></p>`,
      text: `Te invitaron a ${tenant.name}. Crea tu contraseña aquí: ${link}`,
    });
    return { success: true, user: userToRecord(user) };
  });
  app.post('/api/apps/:appId/users/invite-user', invite);
  app.post('/api/apps/:appId/runtime/users/invite-user', invite);
}
