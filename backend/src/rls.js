// Row Level Security compatible con el formato "rls" de los esquemas de Base44.
// Devuelve true (todo permitido), false (nada) o un filtro estilo Mongo.
import { isObject } from './util.js';

function getUserValue(user, path) {
  if (!user) return undefined;
  let p = path;
  if (p.startsWith('user.')) p = p.slice(5);
  if (p.startsWith('data.')) p = p.slice(5);
  return p.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), user);
}

function substitute(value, user) {
  if (typeof value === 'string') {
    const m = value.match(/^\{\{\s*(user\.[\w.]+)\s*\}\}$/);
    if (m) return getUserValue(user, m[1]) ?? '__no_user_value__';
    return value.replace(/\{\{\s*(user\.[\w.]+)\s*\}\}/g, (_, k) => String(getUserValue(user, k) ?? ''));
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, user));
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, user)]));
  return value;
}

const and = (items) => {
  if (items.some((x) => x === false)) return false;
  const rest = items.filter((x) => x !== true);
  if (!rest.length) return true;
  return rest.length === 1 ? rest[0] : { $and: rest };
};
const or = (items) => {
  if (items.some((x) => x === true)) return true;
  const rest = items.filter((x) => x !== false);
  if (!rest.length) return false;
  return rest.length === 1 ? rest[0] : { $or: rest };
};

function userCondition(cond, user) {
  if (!user) return false;
  return Object.entries(cond).every(([k, v]) => getUserValue(user, k) === v);
}

export function ruleToQuery(rule, user) {
  if (rule === undefined || rule === null || rule === true) return true;
  if (rule === false) return false;
  if (!isObject(rule)) return false;
  const parts = [];
  for (const [key, value] of Object.entries(rule)) {
    if (key === 'user_condition') parts.push(userCondition(value || {}, user));
    else if (key === '$or') parts.push(or((value || []).map((r) => ruleToQuery(r, user))));
    else if (key === '$and') parts.push(and((value || []).map((r) => ruleToQuery(r, user))));
    else if (key === '$nor') {
      const inner = or((value || []).map((r) => ruleToQuery(r, user)));
      parts.push(inner === true ? false : inner === false ? true : { $nor: [inner] });
    } else {
      // Sin usuario no se puede comparar con {{user.*}}.
      const sub = substitute(value, user);
      if (JSON.stringify(sub).includes('__no_user_value__')) parts.push(false);
      else parts.push({ [key.startsWith('data.') ? key.slice(5) : key]: sub });
    }
  }
  return and(parts);
}

export function rlsFor(schema, op, caller) {
  if (caller.kind === 'service') return true;
  const rls = schema?.rls;
  if (!rls) return true;
  const rule = rls[op] ?? (op === 'delete' ? rls.update : undefined) ?? (op === 'create' ? rls.write : undefined) ?? rls.write;
  return ruleToQuery(rule, caller.kind === 'user' ? caller.user : null);
}

// Evalúa un filtro contra un registro en memoria (para create).
export function matches(record, query) {
  if (query === true) return true;
  if (query === false) return false;
  if (!isObject(query)) return false;
  return Object.entries(query).every(([k, v]) => {
    if (k === '$and') return v.every((q) => matches(record, q));
    if (k === '$or') return v.some((q) => matches(record, q));
    if (k === '$nor') return !v.some((q) => matches(record, q));
    const actual = k.split('.').reduce((a, p) => (a == null ? undefined : a[p]), record);
    return matchValue(actual, v);
  });
}

function eqValue(actual, expected) {
  if (Array.isArray(actual) && !Array.isArray(expected)) return actual.includes(expected);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function matchValue(actual, cond) {
  if (!isObject(cond) || !Object.keys(cond).some((k) => k.startsWith('$'))) return eqValue(actual, cond);
  return Object.entries(cond).every(([op, v]) => {
    switch (op) {
      case '$eq':
        return eqValue(actual, v);
      case '$ne':
        return !eqValue(actual, v);
      case '$in':
        return (v || []).some((x) => eqValue(actual, x));
      case '$nin':
        return !(v || []).some((x) => eqValue(actual, x));
      case '$all':
        return Array.isArray(actual) && (v || []).every((x) => actual.includes(x));
      case '$exists':
        return v ? actual !== undefined && actual !== null : actual === undefined || actual === null;
      case '$gt':
        return actual > v;
      case '$gte':
        return actual >= v;
      case '$lt':
        return actual < v;
      case '$lte':
        return actual <= v;
      case '$regex':
        return new RegExp(v, cond.$options || '').test(String(actual ?? ''));
      case '$options':
        return true;
      default:
        return false;
    }
  });
}
