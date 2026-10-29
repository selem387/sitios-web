// CRUD de entidades con la misma forma que la API REST de Base44.
import { QueryBuilder, RECORD_COLUMNS, USER_COLUMNS } from './query.js';
import { rlsFor, matches } from './rls.js';
import { HttpError, newId, stripMeta, rowToRecord, pickFields, safeJsonParse, isObject } from './util.js';
import { emitEntityEvent } from './realtime.js';
import { requireAdmin, requireUser, userToRecord } from './authcore.js';
import { config } from './config.js';

const schemaCache = new Map();

export async function getSchema(tenant, entity) {
  const key = `${tenant.app_id}:${entity}`;
  const hit = schemaCache.get(key);
  if (hit && Date.now() - hit.at < 10000) return hit.schema;
  const r = await tenant.pool.query('SELECT schema FROM entity_schemas WHERE name = $1', [entity]);
  const schema = r.rows[0]?.schema || null;
  schemaCache.set(key, { schema, at: Date.now() });
  return schema;
}

export function clearSchemaCache(tenant) {
  for (const k of schemaCache.keys()) if (k.startsWith(`${tenant.app_id}:`)) schemaCache.delete(k);
}

function applyDefaults(schema, data) {
  const props = schema?.properties || {};
  const out = { ...data };
  for (const [k, def] of Object.entries(props)) {
    if (out[k] === undefined && def && def.default !== undefined) out[k] = def.default;
  }
  return out;
}

function combine(rlsQuery, userQuery) {
  if (rlsQuery === false) return false;
  const parts = [];
  if (rlsQuery !== true) parts.push(rlsQuery);
  if (userQuery && isObject(userQuery) && Object.keys(userQuery).length) parts.push(userQuery);
  if (!parts.length) return {};
  return parts.length === 1 ? parts[0] : { $and: parts };
}

function clampLimit(limit) {
  const n = Number(limit);
  if (!n || n < 0) return config.maxListLimit;
  return Math.min(n, config.maxListLimit);
}

// ---------- Registros genéricos ----------

async function readRecords(tenant, entity, caller, { query, sort, limit, skip, fields }) {
  const schema = await getSchema(tenant, entity);
  const q = combine(rlsFor(schema, 'read', caller), query);
  if (q === false) return [];
  const qb = new QueryBuilder(RECORD_COLUMNS, [entity]);
  const where = qb.where(q);
  const sql = `SELECT * FROM records WHERE entity = $1 AND ${where} ORDER BY ${qb.orderBy(sort)} LIMIT ${clampLimit(limit)} OFFSET ${Math.max(0, Number(skip) || 0)}`;
  const r = await tenant.pool.query(sql, qb.params);
  return r.rows.map((row) => pickFields(rowToRecord(row), fields));
}

async function countRecords(tenant, entity, caller, query) {
  const schema = await getSchema(tenant, entity);
  const q = combine(rlsFor(schema, 'read', caller), query);
  if (q === false) return 0;
  const qb = new QueryBuilder(RECORD_COLUMNS, [entity]);
  const r = await tenant.pool.query(`SELECT count(*)::int AS n FROM records WHERE entity = $1 AND ${qb.where(q)}`, qb.params);
  return r.rows[0].n;
}

async function getRecord(tenant, entity, caller, id, op = 'read') {
  const schema = await getSchema(tenant, entity);
  const q = combine(rlsFor(schema, op, caller), { id });
  if (q === false) throw new HttpError(op === 'read' ? 404 : 403, op === 'read' ? 'Entity not found' : 'Permission denied');
  const qb = new QueryBuilder(RECORD_COLUMNS, [entity]);
  const r = await tenant.pool.query(`SELECT * FROM records WHERE entity = $1 AND ${qb.where(q)}`, qb.params);
  if (!r.rowCount) {
    // Distingue "no existe" de "sin permiso".
    const exists = await tenant.pool.query('SELECT 1 FROM records WHERE entity = $1 AND id = $2', [entity, id]);
    if (exists.rowCount && op !== 'read') throw new HttpError(403, 'Permission denied');
    throw new HttpError(404, 'Entity not found');
  }
  return r.rows[0];
}

export async function createRecord(tenant, entity, caller, input, { meta } = {}) {
  const schema = await getSchema(tenant, entity);
  const user = caller.kind === 'user' ? caller.user : null;
  const data = applyDefaults(schema, stripMeta(input));
  const id = meta?.id || newId();
  const record = {
    ...data,
    id,
    created_by: meta?.created_by ?? user?.email ?? null,
    created_by_id: meta?.created_by_id ?? user?.id ?? null,
  };
  const rule = rlsFor(schema, 'create', caller);
  if (!matches(record, rule === true ? true : rule)) throw new HttpError(403, 'Permission denied');
  const r = await tenant.pool.query(
    `INSERT INTO records (id, entity, data, created_by, created_by_id, created_date, updated_date)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), COALESCE($7::timestamptz, $6::timestamptz, now()))
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_date = EXCLUDED.updated_date
     RETURNING *`,
    [id, entity, data, record.created_by, record.created_by_id, meta?.created_date || null, meta?.updated_date || null]
  );
  const out = rowToRecord(r.rows[0]);
  emitEntityEvent(tenant, entity, 'create', out);
  return out;
}

export async function updateRecord(tenant, entity, caller, id, input) {
  const row = await getRecord(tenant, entity, caller, id, 'update');
  const data = { ...row.data, ...stripMeta(input) };
  const r = await tenant.pool.query(
    'UPDATE records SET data = $3, updated_date = now() WHERE entity = $1 AND id = $2 RETURNING *',
    [entity, id, data]
  );
  const out = rowToRecord(r.rows[0]);
  emitEntityEvent(tenant, entity, 'update', out);
  return out;
}

async function deleteRecord(tenant, entity, caller, id) {
  const row = await getRecord(tenant, entity, caller, id, 'delete');
  await tenant.pool.query('DELETE FROM records WHERE entity = $1 AND id = $2', [entity, id]);
  const out = rowToRecord(row);
  emitEntityEvent(tenant, entity, 'delete', out);
  return { success: true, id };
}

async function deleteMany(tenant, entity, caller, query) {
  const schema = await getSchema(tenant, entity);
  const q = combine(rlsFor(schema, 'delete', caller), query);
  if (q === false) return { success: true, deleted: 0 };
  const qb = new QueryBuilder(RECORD_COLUMNS, [entity]);
  const r = await tenant.pool.query(`DELETE FROM records WHERE entity = $1 AND ${qb.where(q)} RETURNING *`, qb.params);
  for (const row of r.rows) emitEntityEvent(tenant, entity, 'delete', rowToRecord(row));
  return { success: true, deleted: r.rowCount };
}

async function updateMany(tenant, entity, caller, query, data, limit = 500) {
  const schema = await getSchema(tenant, entity);
  const q = combine(rlsFor(schema, 'update', caller), query);
  if (q === false) return { updated: 0, has_more: false };
  const clean = stripMeta(data);
  const qb = new QueryBuilder(RECORD_COLUMNS, [entity]);
  const where = qb.where(q);
  const dataParam = qb.p(JSON.stringify(clean));
  const r = await tenant.pool.query(
    `UPDATE records SET data = data || ${dataParam}::jsonb, updated_date = now()
     WHERE id IN (SELECT id FROM records WHERE entity = $1 AND ${where} LIMIT ${limit + 1})
     RETURNING *`,
    qb.params
  );
  for (const row of r.rows) emitEntityEvent(tenant, entity, 'update', rowToRecord(row));
  return { updated: r.rowCount, has_more: false };
}

function aggregate(records, spec) {
  const groupBy = spec.groupBy ? (Array.isArray(spec.groupBy) ? spec.groupBy : [spec.groupBy]) : [];
  const arr = (v) => (v ? (Array.isArray(v) ? v : [v]) : []);
  const bucket = (value, unit) => {
    if (!value) return null;
    const d = new Date(value);
    if (unit === 'year') return `${d.getUTCFullYear()}`;
    if (unit === 'month') return d.toISOString().slice(0, 7);
    if (unit === 'week') {
      const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
      return t.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  };
  const groups = new Map();
  for (const rec of records) {
    const keyObj = {};
    for (const g of groupBy) keyObj[g] = rec[g] ?? null;
    if (spec.dateBucket) keyObj[spec.dateBucket.field] = bucket(rec[spec.dateBucket.field], spec.dateBucket.unit);
    const key = JSON.stringify(keyObj);
    if (!groups.has(key)) groups.set(key, { keyObj, items: [] });
    groups.get(key).items.push(rec);
  }
  const rows = [];
  for (const { keyObj, items } of groups.values()) {
    const row = { ...keyObj };
    if (spec.count !== false) row.count = items.length;
    const nums = (f) => items.map((i) => Number(i[f])).filter((n) => !Number.isNaN(n));
    for (const f of arr(spec.sum)) row[`sum_${f}`] = nums(f).reduce((a, b) => a + b, 0);
    for (const f of arr(spec.avg)) {
      const n = nums(f);
      row[`avg_${f}`] = n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
    }
    for (const f of arr(spec.min)) row[`min_${f}`] = nums(f).length ? Math.min(...nums(f)) : null;
    for (const f of arr(spec.max)) row[`max_${f}`] = nums(f).length ? Math.max(...nums(f)) : null;
    for (const f of arr(spec.countDistinct)) row[`count_distinct_${f}`] = new Set(items.map((i) => JSON.stringify(i[f]))).size;
    rows.push(row);
  }
  const limit = Number(spec.limit) || 1000;
  return { rows: rows.slice(0, limit), truncated: rows.length > limit };
}

// ---------- Entidad especial User ----------

async function readUsers(tenant, caller, { query, sort, limit, skip, fields }) {
  requireAdmin(caller);
  const qb = new QueryBuilder(USER_COLUMNS, []);
  const where = qb.where(query);
  const r = await tenant.pool.query(
    `SELECT * FROM users WHERE ${where} ORDER BY ${qb.orderBy(sort)} LIMIT ${clampLimit(limit)} OFFSET ${Math.max(0, Number(skip) || 0)}`,
    qb.params
  );
  return r.rows.map((row) => pickFields(userToRecord(row), fields));
}

const PROTECTED_USER_FIELDS = ['id', 'email', 'role', 'created_date', 'updated_date', 'is_verified', 'disabled', 'password', 'password_hash'];

export async function updateUser(tenant, id, input, { allowRole = false } = {}) {
  const r0 = await tenant.pool.query('SELECT * FROM users WHERE id = $1', [id]);
  if (!r0.rowCount) throw new HttpError(404, 'User not found');
  const row = r0.rows[0];
  const data = { ...row.data };
  let fullName = row.full_name;
  let role = row.role;
  for (const [k, v] of Object.entries(input || {})) {
    if (k === 'full_name') fullName = v;
    else if (k === 'role' && allowRole) role = v;
    else if (!PROTECTED_USER_FIELDS.includes(k)) data[k] = v;
  }
  const r = await tenant.pool.query(
    'UPDATE users SET data = $2, full_name = $3, role = $4, updated_date = now() WHERE id = $1 RETURNING *',
    [id, data, fullName, role]
  );
  const out = userToRecord(r.rows[0]);
  emitEntityEvent(tenant, 'User', 'update', out);
  return out;
}

// ---------- Rutas ----------

export function registerEntityRoutes(app, ctx) {
  const base = '/api/apps/:appId/entities/:entity';

  app.get('/api/apps/:appId/entities/User/me', ctx(async (c, { caller }) => requireUser(caller)));

  app.put('/api/apps/:appId/entities/User/me', ctx(async (c, { tenant, caller, body }) => {
    const user = requireUser(caller);
    return updateUser(tenant, user.id, body);
  }));

  app.get(`${base}/count`, ctx(async (c, { tenant, caller }) => {
    const entity = c.req.param('entity');
    const query = safeJsonParse(c.req.query('q'), {});
    if (entity === 'User') return { count: (await readUsers(tenant, caller, { query })).length };
    return { count: await countRecords(tenant, entity, caller, query) };
  }));

  app.get(`${base}/v2/list`, ctx(async (c, { tenant, caller }) => {
    const entity = c.req.param('entity');
    let state = {};
    const cursor = c.req.query('cursor');
    if (cursor) state = safeJsonParse(Buffer.from(cursor, 'base64url').toString(), {});
    const query = state.q ?? safeJsonParse(c.req.query('q'), {});
    const limit = Number(c.req.query('limit')) || state.limit || 100;
    const skip = state.skip || 0;
    const distinct = state.distinct ?? c.req.query('distinct');
    const sort = state.sort ?? c.req.query('sort');
    const fields = state.fields ?? c.req.query('fields');
    const reader = entity === 'User' ? (o) => readUsers(tenant, caller, o) : (o) => readRecords(tenant, entity, caller, o);
    if (distinct) {
      const all = await reader({ query, limit: config.maxListLimit });
      const values = new Set();
      for (const rec of all) {
        const v = rec[distinct];
        for (const x of Array.isArray(v) ? v : [v]) if (x !== undefined && x !== null) values.add(JSON.stringify(x));
      }
      const sorted = [...values].map((v) => JSON.parse(v)).sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      const items = sorted.slice(skip, skip + limit);
      const more = skip + limit < sorted.length;
      return { items, next_cursor: more ? Buffer.from(JSON.stringify({ q: query, limit, skip: skip + limit, distinct })).toString('base64url') : null };
    }
    const items = await reader({ query, sort, limit: limit + 1, skip, fields });
    const more = items.length > limit;
    return {
      items: items.slice(0, limit),
      next_cursor: more ? Buffer.from(JSON.stringify({ q: query, limit, skip: skip + limit, sort, fields })).toString('base64url') : null,
    };
  }));

  app.get(base, ctx(async (c, { tenant, caller }) => {
    const entity = c.req.param('entity');
    const opts = {
      query: safeJsonParse(c.req.query('q'), {}),
      sort: c.req.query('sort'),
      limit: c.req.query('limit'),
      skip: c.req.query('skip'),
      fields: c.req.query('fields'),
    };
    if (entity === 'User') return readUsers(tenant, caller, opts);
    return readRecords(tenant, entity, caller, opts);
  }));

  app.post(`${base}/bulk`, ctx(async (c, { tenant, caller, body }) => {
    const entity = c.req.param('entity');
    if (entity === 'User') throw new HttpError(400, 'Use inviteUser para crear usuarios');
    const out = [];
    for (const item of Array.isArray(body) ? body : []) out.push(await createRecord(tenant, entity, caller, item));
    return out;
  }));

  app.put(`${base}/bulk`, ctx(async (c, { tenant, caller, body }) => {
    const entity = c.req.param('entity');
    const out = [];
    for (const item of Array.isArray(body) ? body : []) {
      if (!item?.id) throw new HttpError(400, 'Cada elemento necesita id');
      out.push(await updateRecord(tenant, entity, caller, item.id, item));
    }
    return out;
  }));

  app.patch(`${base}/update-many`, ctx(async (c, { tenant, caller, body }) =>
    updateMany(tenant, c.req.param('entity'), caller, body?.query || {}, body?.data || {})));

  app.post(`${base}/upsert`, ctx(async (c, { tenant, caller, body }) => {
    const entity = c.req.param('entity');
    const keys = Array.isArray(body?.key) ? body.key : [body?.key || 'id'];
    const out = [];
    for (const rec of body?.records || []) {
      const query = Object.fromEntries(keys.map((k) => [k, rec[k]]));
      const existing = await readRecords(tenant, entity, caller, { query, limit: 1 });
      out.push(existing.length ? await updateRecord(tenant, entity, caller, existing[0].id, rec) : await createRecord(tenant, entity, caller, rec));
    }
    return out;
  }));

  app.post(`${base}/aggregate`, ctx(async (c, { tenant, caller, body }) => {
    const entity = c.req.param('entity');
    const records = entity === 'User'
      ? await readUsers(tenant, caller, { query: body?.query })
      : await readRecords(tenant, entity, caller, { query: body?.query, limit: config.maxListLimit });
    return aggregate(records, body || {});
  }));

  app.get(`${base}/:id`, ctx(async (c, { tenant, caller }) => {
    const entity = c.req.param('entity');
    const id = c.req.param('id');
    if (entity === 'User') {
      if (caller.kind === 'user' && caller.user.id === id) return caller.user;
      requireAdmin(caller);
      const r = await tenant.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (!r.rowCount) throw new HttpError(404, 'User not found');
      return userToRecord(r.rows[0]);
    }
    return rowToRecord(await getRecord(tenant, entity, caller, id));
  }));

  app.post(base, ctx(async (c, { tenant, caller, body }) => {
    const entity = c.req.param('entity');
    if (entity === 'User') throw new HttpError(400, 'Use inviteUser para crear usuarios');
    return createRecord(tenant, entity, caller, body);
  }));

  app.put(`${base}/:id`, ctx(async (c, { tenant, caller, body }) => {
    const entity = c.req.param('entity');
    const id = c.req.param('id');
    if (entity === 'User') {
      const isSelf = caller.kind === 'user' && caller.user.id === id;
      if (!isSelf) requireAdmin(caller);
      return updateUser(tenant, id, body, { allowRole: !isSelf || caller.user?.role === 'admin' });
    }
    return updateRecord(tenant, entity, caller, id, body);
  }));

  app.delete(`${base}/:id`, ctx(async (c, { tenant, caller }) => {
    const entity = c.req.param('entity');
    const id = c.req.param('id');
    if (entity === 'User') {
      requireAdmin(caller);
      await tenant.pool.query('DELETE FROM users WHERE id = $1', [id]);
      return { success: true, id };
    }
    return deleteRecord(tenant, entity, caller, id);
  }));

  app.delete(base, ctx(async (c, { tenant, caller, body }) => deleteMany(tenant, c.req.param('entity'), caller, body || {})));
}
