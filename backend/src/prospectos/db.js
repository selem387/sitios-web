// Base de prospección (proyecto Easypanel prospeccion-activa, servicio pg, esquema "prospeccion").
// Ahí viven los negocios encontrados en Google Maps, su enriquecimiento (redes, correo) y los gastos.
// Este módulo solo agrega lo que necesita el constructor: accesos, clics, envíos y la liga con la entrevista.
import pg from 'pg';

let pool = null;
export const activo = () => Boolean(process.env.PROSPECCION_DATABASE_URL);
const p = () => (pool ||= new pg.Pool({ connectionString: process.env.PROSPECCION_DATABASE_URL, max: 4 }));
export const q = (sql, params = []) => p().query(sql, params);

let listo = false;
export async function migrar() {
  if (listo || !activo()) return;
  await q(`CREATE SCHEMA IF NOT EXISTS prospeccion`);
  await q(`ALTER TABLE prospeccion.negocios ADD COLUMN IF NOT EXISTS entrevista_id uuid`);
  await q(`ALTER TABLE prospeccion.negocios ADD COLUMN IF NOT EXISTS token text`);
  await q(`ALTER TABLE prospeccion.negocios ADD COLUMN IF NOT EXISTS opciones jsonb`);
  await q(`ALTER TABLE prospeccion.negocios ADD COLUMN IF NOT EXISTS error text`);
  await q(`ALTER TABLE prospeccion.negocios ADD COLUMN IF NOT EXISTS baja boolean NOT NULL DEFAULT false`);
  await q(`ALTER TABLE prospeccion.negocios ADD COLUMN IF NOT EXISTS dominio_envio text`);
  await q(`CREATE TABLE IF NOT EXISTS prospeccion.accesos (id serial PRIMARY KEY, token_hash text UNIQUE NOT NULL, nombre text NOT NULL,
    rol text NOT NULL CHECK (rol IN ('admin','atencion')), activo boolean NOT NULL DEFAULT true, creado timestamptz NOT NULL DEFAULT now())`);
  await q(`CREATE TABLE IF NOT EXISTS prospeccion.clics (id serial PRIMARY KEY, negocio_id int NOT NULL, tipo text NOT NULL, opcion int,
    ip text, agente text, creado timestamptz NOT NULL DEFAULT now())`);
  await q(`CREATE TABLE IF NOT EXISTS prospeccion.envios (id serial PRIMARY KEY, negocio_id int NOT NULL, canal text NOT NULL, paso int NOT NULL,
    dominio text, destino text, estado text NOT NULL, detalle jsonb NOT NULL DEFAULT '{}', creado timestamptz NOT NULL DEFAULT now(),
    UNIQUE (negocio_id, canal, paso))`);
  listo = true;
}

export async function porFolio(folio) {
  if (!/^[a-z0-9]{4,12}$/.test(String(folio || ''))) return null;
  return (await q(`SELECT * FROM prospeccion.negocios WHERE folio=$1`, [folio])).rows[0] || null;
}
export async function porId(id) { return (await q(`SELECT * FROM prospeccion.negocios WHERE id=$1`, [id])).rows[0] || null; }
export async function actualizar(id, cambios) {
  const k = Object.keys(cambios);
  if (!k.length) return;
  const vals = k.map((x) => (cambios[x] && typeof cambios[x] === 'object' && !(cambios[x] instanceof Date) ? JSON.stringify(cambios[x]) : cambios[x]));
  await q(`UPDATE prospeccion.negocios SET ${k.map((x, i) => `${x}=$${i + 2}`).join(', ')}, actualizado=now() WHERE id=$1`, [id, ...vals]);
}
export const gasto = (proveedor, concepto, usd) => q(`INSERT INTO prospeccion.gastos (proveedor, concepto, usd) VALUES ($1,$2,$3)`, [proveedor, concepto, usd]).catch(() => {});
export async function gastoMes() {
  return Number((await q(`SELECT coalesce(sum(usd),0) s FROM prospeccion.gastos WHERE creado >= date_trunc('month', now())`)).rows[0].s);
}
