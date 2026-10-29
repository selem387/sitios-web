import crypto from 'node:crypto';

// IDs de 24 caracteres hex, mismo formato que Base44 (tipo ObjectId).
export const newId = () => crypto.randomBytes(12).toString('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const otpCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Formato de error que el SDK entiende (lee data.message / data.detail).
export function errorBody(err) {
  return {
    message: err.message,
    detail: err.message,
    ...(err.extra && Object.keys(err.extra).length ? { extra_data: err.extra } : {}),
  };
}

export const META_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id'];

export function stripMeta(data) {
  const out = { ...(data || {}) };
  for (const k of META_FIELDS) delete out[k];
  delete out._id;
  return out;
}

export function rowToRecord(row) {
  return {
    ...row.data,
    id: row.id,
    created_date: row.created_date,
    updated_date: row.updated_date,
    created_by: row.created_by,
    created_by_id: row.created_by_id,
  };
}

export function pickFields(record, fields) {
  if (!fields) return record;
  const list = (Array.isArray(fields) ? fields : String(fields).split(','))
    .map((f) => f.trim())
    .filter(Boolean);
  if (!list.length) return record;
  const out = { id: record.id };
  for (const f of list) if (f in record) out[f] = record[f];
  return out;
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function safeJsonParse(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}
