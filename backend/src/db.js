import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// Las fechas se devuelven como texto ISO para no perder zona horaria.
pg.types.setTypeParser(1184, (v) => (v === null ? null : new Date(v).toISOString()));

const pools = new Map();

function urlForDb(dbName) {
  const u = new URL(config.databaseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

export function poolFor(dbName) {
  if (!pools.has(dbName)) {
    pools.set(dbName, new Pool({ connectionString: urlForDb(dbName), max: 5, idleTimeoutMillis: 30000 }));
  }
  return pools.get(dbName);
}

export const adminPool = () => poolFor(new URL(config.databaseUrl).pathname.slice(1) || 'postgres');
export const controlPool = () => poolFor(config.controlDb);

async function databaseExists(name) {
  const r = await adminPool().query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  return r.rowCount > 0;
}

export async function ensureDatabase(name) {
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`Nombre de base inválido: ${name}`);
  if (!(await databaseExists(name))) {
    await adminPool().query(`CREATE DATABASE "${name}"`);
  }
}

const CONTROL_SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  app_id      text PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  db_name     text UNIQUE NOT NULL,
  jwt_secret  text NOT NULL,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
`;

export const TENANT_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS citext;
CREATE TABLE IF NOT EXISTS users (
  id             text PRIMARY KEY,
  email          citext UNIQUE NOT NULL,
  full_name      text,
  role           text NOT NULL DEFAULT 'user',
  password_hash  text,
  is_verified    boolean NOT NULL DEFAULT false,
  disabled       boolean NOT NULL DEFAULT false,
  otp_code       text,
  otp_expires    timestamptz,
  reset_token    text,
  reset_expires  timestamptz,
  data           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_date   timestamptz NOT NULL DEFAULT now(),
  updated_date   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS records (
  id             text PRIMARY KEY,
  entity         text NOT NULL,
  data           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_date   timestamptz NOT NULL DEFAULT now(),
  updated_date   timestamptz NOT NULL DEFAULT now(),
  created_by     text,
  created_by_id  text
);
CREATE INDEX IF NOT EXISTS records_entity_created ON records (entity, created_date DESC);
CREATE INDEX IF NOT EXISTS records_data_gin ON records USING gin (data jsonb_path_ops);
CREATE TABLE IF NOT EXISTS entity_schemas (
  name        text PRIMARY KEY,
  schema      jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS files (
  id            text PRIMARY KEY,
  path          text NOT NULL,
  mime          text,
  size          bigint,
  is_private    boolean NOT NULL DEFAULT false,
  original_url  text,
  created_date  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS files_original_url ON files (original_url);
`;

export async function initControl() {
  await ensureDatabase(config.controlDb);
  await controlPool().query(CONTROL_SCHEMA);
}

export async function initTenantDb(dbName) {
  await ensureDatabase(dbName);
  await poolFor(dbName).query(TENANT_SCHEMA);
}
