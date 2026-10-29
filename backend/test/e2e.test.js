// Prueba de extremo a extremo usando el SDK oficial @base44/sdk contra este backend.
// Requiere el servidor corriendo: BASE_URL y ADMIN_TOKEN en el entorno.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@base44/sdk';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const ADMIN = process.env.ADMIN_TOKEN || 'test-admin-token';
const APP_ID = `test${Date.now().toString(16)}`;
const SLUG = `prueba-${Date.now().toString(36)}`;

const admin = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${ADMIN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(j)}`);
  return j;
};

test('flujo completo con el SDK', async () => {
  await admin('POST', '/admin/tenants', { app_id: APP_ID, slug: SLUG, name: 'App de prueba', settings: { require_email_verification: false } });
  await admin('PUT', `/admin/tenants/${APP_ID}/schemas`, {
    schemas: [
      { name: 'Task', schema: { name: 'Task', type: 'object', properties: { title: { type: 'string' }, done: { type: 'boolean', default: false }, priority: { type: 'number' }, tags: { type: 'array' } } } },
      { name: 'Note', schema: { name: 'Note', type: 'object', properties: { text: { type: 'string' } }, rls: { create: true, read: { created_by: '{{user.email}}' }, update: { created_by: '{{user.email}}' }, delete: { user_condition: { role: 'admin' } } } } },
    ],
  });
  await admin('POST', `/admin/tenants/${APP_ID}/users`, {
    users: [{ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', email: 'admin@test.mx', full_name: 'Admin', role: 'admin' }],
  });

  const anon = createClient({ serverUrl: BASE, appId: APP_ID, analytics: { enabled: false } });

  // Registro + OTP (el código se lee directo de la base para la prueba).
  await anon.auth.register({ email: 'ana@test.mx', password: 'secreto123' });
  const pg = (await import('pg')).default;
  const db = new pg.Client({ connectionString: `postgres://postgres@localhost:5432/app_${SLUG.replace(/-/g, '_')}` });
  await db.connect();
  const { rows } = await db.query("SELECT otp_code FROM users WHERE email = 'ana@test.mx'");
  const verified = await anon.auth.verifyOtp({ email: 'ana@test.mx', otpCode: rows[0].otp_code });
  assert.ok(verified.access_token);

  const login = await anon.auth.loginViaEmailPassword('ana@test.mx', 'secreto123');
  const ana = createClient({ serverUrl: BASE, appId: APP_ID, token: login.access_token, analytics: { enabled: false } });
  const me = await ana.auth.me();
  assert.equal(me.email, 'ana@test.mx');
  const me2 = await ana.auth.updateMe({ telefono: '9991234567', role: 'admin' });
  assert.equal(me2.telefono, '9991234567');
  assert.equal(me2.role, 'user', 'un usuario no puede subirse a admin');

  // CRUD + filtros
  const t1 = await ana.entities.Task.create({ title: 'Uno', priority: 1, tags: ['a', 'b'] });
  assert.equal(t1.done, false, 'aplica default del esquema');
  assert.equal(t1.created_by, 'ana@test.mx');
  await ana.entities.Task.bulkCreate([{ title: 'Dos', priority: 2 }, { title: 'Tres', priority: 3, done: true }]);
  const all = await ana.entities.Task.list('-priority');
  assert.deepEqual(all.map((t) => t.title), ['Tres', 'Dos', 'Uno']);
  const limited = await ana.entities.Task.list('priority', 2, 1);
  assert.deepEqual(limited.map((t) => t.title), ['Dos', 'Tres']);
  assert.equal((await ana.entities.Task.filter({ priority: { $gte: 2 } })).length, 2);
  assert.equal((await ana.entities.Task.filter({ tags: 'a' })).length, 1);
  assert.equal((await ana.entities.Task.filter({ $or: [{ title: 'Uno' }, { done: true }] })).length, 2);
  assert.equal((await ana.entities.Task.filter({ title: { $regex: 'ó|o', $options: 'i' } })).length, 2);
  assert.equal((await ana.entities.Task.filter({ title: { $in: ['Uno', 'Dos'] } })).length, 2);
  assert.equal(await ana.entities.Task.count({ done: false }), 2);
  const page = await ana.entities.Task.list({ sort: 'priority', limit: 2 });
  assert.equal(page.items.length, 2);
  assert.ok(page.next_cursor);
  const page2 = await ana.entities.Task.list({ cursor: page.next_cursor, limit: 2 });
  assert.equal(page2.items.length, 1);
  const fields = await ana.entities.Task.list('priority', 1, 0, ['title']);
  assert.deepEqual(Object.keys(fields[0]).sort(), ['id', 'title']);
  const got = await ana.entities.Task.get(t1.id);
  assert.equal(got.title, 'Uno');
  const upd = await ana.entities.Task.update(t1.id, { done: true });
  assert.equal(upd.done, true);
  assert.equal(upd.title, 'Uno');
  const agg = await ana.entities.Task.aggregate({ groupBy: 'done', sum: 'priority' });
  assert.equal(agg.rows.length, 2);
  await ana.entities.Task.delete(t1.id);
  await assert.rejects(() => ana.entities.Task.get(t1.id), (e) => e.status === 404);

  // RLS: Ana solo ve sus notas
  await ana.entities.Note.create({ text: 'privada de Ana' });
  await admin('POST', `/admin/tenants/${APP_ID}/records/Note`, { records: [{ text: 'de otro', created_by: 'otro@test.mx' }] });
  assert.equal((await ana.entities.Note.list()).length, 1);
  const n = (await ana.entities.Note.list())[0];
  await assert.rejects(() => ana.entities.Note.delete(n.id), (e) => e.status === 403);

  // Admin ve usuarios; Ana no
  await assert.rejects(() => ana.entities.User.list(), (e) => e.status === 403);
  await db.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@test.mx'", [(await import('bcryptjs')).default.hashSync('admin12345', 10)]);
  const adminLogin = await anon.auth.loginViaEmailPassword('admin@test.mx', 'admin12345');
  const adm = createClient({ serverUrl: BASE, appId: APP_ID, token: adminLogin.access_token, analytics: { enabled: false } });
  assert.equal((await adm.entities.User.list()).length, 2);

  // Subida de archivo
  const blob = new File([Buffer.from('hola mundo')], 'saludo.txt', { type: 'text/plain' });
  const up = await ana.integrations.Core.UploadFile({ file: blob });
  assert.match(up.file_url, /\/files\/.+saludo\.txt$/);
  assert.equal(await (await fetch(up.file_url)).text(), 'hola mundo');
  const priv = await ana.integrations.Core.UploadPrivateFile({ file: blob });
  const signed = await ana.integrations.Core.CreateFileSignedUrl({ file_uri: priv.file_uri });
  assert.equal(await (await fetch(signed.signed_url)).text(), 'hola mundo');
  assert.equal((await fetch(signed.signed_url.replace(/sig=\w+/, 'sig=x'))).status, 403);

  // Correo sin proveedor configurado: no falla
  await ana.integrations.Core.SendEmail({ to: 'x@test.mx', subject: 'Hola', body: '<b>hola</b>' });

  // Función backend Deno con createClientFromRequest + asServiceRole
  await admin('PUT', `/admin/tenants/${APP_ID}/app-files`, {
    files: {
      'functions/contar-tareas/entry.ts': `import { createClientFromRequest } from "npm:@base44/sdk@0.8.57";
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  const { extra } = await req.json();
  const total = await base44.asServiceRole.entities.Task.count();
  return Response.json({ email: user.email, total, extra, secreto: Deno.env.get("MI_SECRETO") ?? null });
});`,
    },
  });
  await admin('PATCH', `/admin/tenants/${APP_ID}`, { secrets: { MI_SECRETO: 's3cr3t' } });
  const fn = await ana.functions.invoke('contar-tareas', { extra: 42 });
  assert.equal(fn.status, 200);
  assert.deepEqual(fn.data, { email: 'ana@test.mx', total: 2, extra: 42, secreto: 's3cr3t' });

  // Ajustes públicos y página de login
  const ps = await (await fetch(`${BASE}/api/apps/public/prod/public-settings/by-id/${APP_ID}`)).json();
  assert.equal(ps.id, APP_ID);
  const html = await (await fetch(`${BASE}/t/${SLUG}/login?from_url=http://x/`)).text();
  assert.match(html, /App de prueba/);
  const viaPrefix = await (await fetch(`${BASE}/t/${SLUG}/api/apps/${APP_ID}/entities/Task?limit=1`, { headers: { Authorization: `Bearer ${login.access_token}` } })).json();
  assert.equal(viaPrefix.length, 1);

  await db.end();
});
