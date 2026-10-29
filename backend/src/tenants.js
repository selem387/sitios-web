import { controlPool, initTenantDb, poolFor } from './db.js';
import { HttpError, randomToken } from './util.js';

const cache = new Map();
const CACHE_MS = 15000;

export async function getTenant(appId) {
  if (!appId) throw new HttpError(400, 'Falta el id de la app');
  const hit = cache.get(appId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.tenant;
  const r = await controlPool().query('SELECT * FROM tenants WHERE app_id = $1 OR slug = $1', [appId]);
  if (!r.rowCount) throw new HttpError(404, `App no encontrada: ${appId}`);
  const tenant = decorate(r.rows[0]);
  cache.set(tenant.app_id, { tenant, at: Date.now() });
  if (tenant.slug !== tenant.app_id) cache.set(tenant.slug, { tenant, at: Date.now() });
  return tenant;
}

function decorate(row) {
  return {
    ...row,
    pool: poolFor(row.db_name),
    settings: row.settings || {},
    secrets: row.secrets || {},
  };
}

export function invalidateTenant(appId) {
  for (const [k, v] of cache) if (k === appId || v.tenant.app_id === appId) cache.delete(k);
}

export async function listTenants() {
  const r = await controlPool().query(
    'SELECT app_id, slug, name, db_name, settings, created_at, updated_at FROM tenants ORDER BY created_at'
  );
  return r.rows;
}

export async function createTenant({ app_id, slug, name, settings = {} }) {
  if (!app_id || !slug) throw new HttpError(400, 'app_id y slug son obligatorios');
  if (!/^[a-z0-9-]+$/.test(slug)) throw new HttpError(400, 'slug solo admite minúsculas, números y guiones');
  const dbName = `app_${slug.replace(/-/g, '_')}`;
  await initTenantDb(dbName);
  const r = await controlPool().query(
    `INSERT INTO tenants (app_id, slug, name, db_name, jwt_secret, settings)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (app_id) DO UPDATE SET name = EXCLUDED.name, settings = tenants.settings || EXCLUDED.settings, updated_at = now()
     RETURNING app_id, slug, name, db_name, settings`,
    [app_id, slug, name || slug, dbName, randomToken(32), settings]
  );
  invalidateTenant(app_id);
  return r.rows[0];
}

export async function updateTenant(appId, { name, settings, secrets, replaceSecrets = false }) {
  const t = await getTenant(appId);
  const r = await controlPool().query(
    `UPDATE tenants SET
       name = COALESCE($2, name),
       settings = CASE WHEN $3::jsonb IS NULL THEN settings ELSE settings || $3::jsonb END,
       secrets = CASE WHEN $4::jsonb IS NULL THEN secrets WHEN $5 THEN $4::jsonb ELSE secrets || $4::jsonb END,
       updated_at = now()
     WHERE app_id = $1
     RETURNING app_id, slug, name, db_name, settings`,
    [t.app_id, name ?? null, settings ? JSON.stringify(settings) : null, secrets ? JSON.stringify(secrets) : null, replaceSecrets]
  );
  invalidateTenant(t.app_id);
  return r.rows[0];
}

export async function migrateAllTenants() {
  const r = await controlPool().query('SELECT db_name FROM tenants');
  for (const row of r.rows) await initTenantDb(row.db_name);
}
