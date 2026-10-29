// API de administración (crear apps, importar esquemas/datos/archivos, secretos).
// Protegida con ADMIN_TOKEN.
import crypto from 'node:crypto';
import { config } from './config.js';
import { createTenant, getTenant, listTenants, updateTenant } from './tenants.js';
import { createRecord, clearSchemaCache } from './entities.js';
import { writeAppFiles, listFunctions, invokeFunction } from './functions.js';
import { saveBuffer, mimeFor } from './storage.js';
import { scheduleTenant } from './automations.js';
import { HttpError, newId, isObject } from './util.js';

function checkAdmin(c) {
  const h = c.req.header('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const a = Buffer.from(token);
  const b = Buffer.from(config.adminToken || '');
  if (!config.adminToken || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new HttpError(401, 'Token de administración inválido');
  }
}

const SERVICE = { kind: 'service' };

export function registerAdminRoutes(app, wrap) {
  const admin = (fn) => wrap(async (c) => {
    checkAdmin(c);
    const body = ['GET', 'HEAD'].includes(c.req.method) ? {} : await c.req.json().catch(() => ({}));
    return fn(c, body);
  });

  app.get('/admin/tenants', admin(async () => listTenants()));

  app.post('/admin/tenants', admin(async (c, body) => {
    const t = await createTenant(body);
    await scheduleTenant(t.app_id);
    return t;
  }));

  app.get('/admin/tenants/:id', admin(async (c) => {
    const t = await getTenant(c.req.param('id'));
    const counts = await t.pool.query('SELECT entity, count(*)::int AS n FROM records GROUP BY entity ORDER BY entity');
    const users = await t.pool.query('SELECT count(*)::int AS n FROM users');
    const schemas = await t.pool.query('SELECT name FROM entity_schemas ORDER BY name');
    return {
      app_id: t.app_id, slug: t.slug, name: t.name, db_name: t.db_name, settings: t.settings,
      secret_keys: Object.keys(t.secrets),
      schemas: schemas.rows.map((r) => r.name),
      records: counts.rows, users: users.rows[0].n,
      functions: await listFunctions(t.app_id),
    };
  }));

  app.patch('/admin/tenants/:id', admin(async (c, body) => {
    const t = await updateTenant(c.req.param('id'), {
      name: body.name, settings: body.settings, secrets: body.secrets, replaceSecrets: Boolean(body.replace_secrets),
    });
    await scheduleTenant(t.app_id);
    return t;
  }));

  app.put('/admin/tenants/:id/schemas', admin(async (c, body) => {
    const t = await getTenant(c.req.param('id'));
    const list = Array.isArray(body.schemas)
      ? body.schemas
      : Object.entries(body.schemas || body).map(([name, schema]) => ({ name, schema }));
    for (const { name, schema } of list) {
      if (!name || !/^[A-Za-z0-9]+$/.test(name)) throw new HttpError(400, `Nombre de entidad inválido: ${name}`);
      await t.pool.query(
        `INSERT INTO entity_schemas (name, schema) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET schema = EXCLUDED.schema, updated_at = now()`,
        [name, schema]
      );
    }
    clearSchemaCache(t);
    return { saved: list.length };
  }));

  // Importa registros conservando id, fechas y creador originales.
  app.post('/admin/tenants/:id/records/:entity', admin(async (c, body) => {
    const t = await getTenant(c.req.param('id'));
    const entity = c.req.param('entity');
    let n = 0;
    for (const rec of body.records || []) {
      await createRecord(t, entity, SERVICE, rec, {
        meta: {
          id: rec.id || newId(),
          created_date: rec.created_date,
          updated_date: rec.updated_date,
          created_by: rec.created_by ?? null,
          created_by_id: rec.created_by_id ?? null,
        },
      });
      n++;
    }
    return { imported: n };
  }));

  app.post('/admin/tenants/:id/users', admin(async (c, body) => {
    const t = await getTenant(c.req.param('id'));
    let n = 0;
    for (const u of body.users || []) {
      const { id, email, full_name, role, created_date, updated_date, is_verified, password_hash, ...rest } = u;
      for (const k of ['_app_role', 'disabled', 'app_id', 'collaborator_role', 'is_service']) delete rest[k];
      await t.pool.query(
        `INSERT INTO users (id, email, full_name, role, is_verified, password_hash, data, created_date, updated_date)
         VALUES ($1, $2, $3, $4, true, $5, $6, COALESCE($7::timestamptz, now()), COALESCE($8::timestamptz, now()))
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, data = users.data || EXCLUDED.data`,
        [id || newId(), email, full_name || null, role || 'user', password_hash || null, rest, created_date || null, updated_date || null]
      );
      n++;
    }
    return { imported: n };
  }));

  app.put('/admin/tenants/:id/app-files', admin(async (c, body) => {
    const t = await getTenant(c.req.param('id'));
    return writeAppFiles(t.app_id, body.files || {}, { replaceFunctions: body.replace !== false });
  }));

  // Descarga archivos (p. ej. del storage de Base44) y los guarda localmente.
  app.post('/admin/tenants/:id/files/import', admin(async (c, body) => {
    const t = await getTenant(c.req.param('id'));
    const map = {};
    const errors = {};
    for (const url of body.urls || []) {
      const prev = await t.pool.query('SELECT path FROM files WHERE original_url = $1 LIMIT 1', [url]);
      if (prev.rowCount) {
        map[url] = `${config.publicUrl}/files/${prev.rows[0].path}`;
        continue;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'archivo');
        const saved = await saveBuffer(t, buf, name, {
          mime: (res.headers.get('content-type') || mimeFor(name)).split(';')[0],
          originalUrl: url,
        });
        map[url] = saved.url;
      } catch (e) {
        errors[url] = e.message;
      }
    }
    return { map, errors };
  }));

  // Reemplaza URLs viejas por nuevas dentro de todos los registros.
  app.post('/admin/tenants/:id/rewrite-urls', admin(async (c, body) => {
    const t = await getTenant(c.req.param('id'));
    let changed = 0;
    for (const [from, to] of Object.entries(body.map || {})) {
      const r = await t.pool.query(
        `UPDATE records SET data = replace(data::text, $1, $2)::jsonb WHERE data::text LIKE '%' || $1 || '%'`,
        [JSON.stringify(from).slice(1, -1), JSON.stringify(to).slice(1, -1)]
      );
      changed += r.rowCount;
    }
    return { changed };
  }));

  app.post('/admin/tenants/:id/functions/:name{.+}/invoke', admin(async (c, body) => {
    const t = await getTenant(c.req.param('id'));
    const res = await invokeFunction(t, c.req.param('name'), {
      body: JSON.stringify(isObject(body) ? body : {}),
      headers: { 'Content-Type': 'application/json' },
    });
    const text = await res.text();
    try {
      return { status: res.status, body: JSON.parse(text) };
    } catch {
      return { status: res.status, body: text };
    }
  }));
}
