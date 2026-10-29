import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { HttpError, newId } from './util.js';

const enc = (s) => new TextEncoder().encode(s);

export async function signUserToken(tenant, user, expiresIn = '30d') {
  return new SignJWT({ email: user.email, role: user.role, app_id: tenant.app_id, typ: 'user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(enc(tenant.jwt_secret));
}

// Token de servicio que reciben las funciones backend (asServiceRole).
export async function signServiceToken(tenant, expiresIn = '15m') {
  return new SignJWT({ app_id: tenant.app_id, typ: 'service' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('service')
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(enc(tenant.jwt_secret));
}

export async function verifyToken(tenant, token) {
  try {
    const { payload } = await jwtVerify(token, enc(tenant.jwt_secret));
    if (payload.app_id !== tenant.app_id) return null;
    return payload;
  } catch {
    return null;
  }
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const checkPassword = (pw, hash) => (hash ? bcrypt.compare(pw, hash) : false);

export function userToRecord(row) {
  if (!row) return null;
  return {
    ...(row.data || {}),
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_verified: row.is_verified,
    disabled: row.disabled,
    created_date: row.created_date,
    updated_date: row.updated_date,
  };
}

export async function findUserByEmail(tenant, email) {
  const r = await tenant.pool.query('SELECT * FROM users WHERE email = $1', [String(email || '').trim()]);
  return r.rows[0] || null;
}

export async function findUserById(tenant, id) {
  const r = await tenant.pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return r.rows[0] || null;
}

export async function createUser(tenant, { email, full_name, role = 'user', password, is_verified = false, data = {}, id }) {
  const hash = password ? await hashPassword(password) : null;
  const r = await tenant.pool.query(
    `INSERT INTO users (id, email, full_name, role, password_hash, is_verified, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id || newId(), String(email).trim(), full_name || null, role, hash, is_verified, data]
  );
  return r.rows[0];
}

// Resuelve quién hace la petición: usuario, servicio o anónimo.
export async function resolveCaller(tenant, authorization) {
  if (!authorization || !authorization.startsWith('Bearer ')) return { kind: 'anon' };
  const token = authorization.slice(7).trim();
  const payload = await verifyToken(tenant, token);
  if (!payload) return { kind: 'invalid' };
  if (payload.typ === 'service') return { kind: 'service' };
  const user = await findUserById(tenant, payload.sub);
  if (!user || user.disabled) return { kind: 'invalid' };
  return { kind: 'user', user: userToRecord(user), token };
}

export function requireUser(caller) {
  if (caller.kind === 'user') return caller.user;
  throw new HttpError(401, 'Authentication required', { reason: 'auth_required' });
}

export function requireAdmin(caller) {
  if (caller.kind === 'service') return null;
  const user = requireUser(caller);
  if (user.role !== 'admin') throw new HttpError(403, 'Admin role required');
  return user;
}
