// Traduce los filtros estilo MongoDB que usa Base44 a SQL sobre jsonb.
import { HttpError, isObject } from './util.js';

// Columnas reales por tabla. El resto de campos vive en data (jsonb).
export const RECORD_COLUMNS = {
  id: 'text',
  created_date: 'timestamptz',
  updated_date: 'timestamptz',
  created_by: 'text',
  created_by_id: 'text',
};

export const USER_COLUMNS = {
  id: 'text',
  email: 'text',
  full_name: 'text',
  role: 'text',
  created_date: 'timestamptz',
  updated_date: 'timestamptz',
};

export class QueryBuilder {
  constructor(columns = RECORD_COLUMNS, params = []) {
    this.columns = columns;
    this.params = params;
  }

  p(value) {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  // Expresión jsonb para un campo (columna o ruta dentro de data).
  jsonExpr(field) {
    if (this.columns[field]) return `to_jsonb("${field}")`;
    const f = field.startsWith('data.') ? field.slice(5) : field;
    const parts = f.split('.').map((s) => s.replace(/[{}",\\]/g, ''));
    return `(data #> '{${parts.join(',')}}')`;
  }

  textExpr(field) {
    if (this.columns[field]) return `"${field}"::text`;
    const f = field.startsWith('data.') ? field.slice(5) : field;
    const parts = f.split('.').map((s) => s.replace(/[{}",\\]/g, ''));
    return `(data #>> '{${parts.join(',')}}')`;
  }

  isColumn(field) {
    return Boolean(this.columns[field]);
  }

  eq(field, value) {
    if (this.isColumn(field)) {
      if (value === null) return `"${field}" IS NULL`;
      const t = this.columns[field];
      return `"${field}" = ${this.p(t === 'timestamptz' ? value : String(value))}::${t}`;
    }
    const J = this.jsonExpr(field);
    if (value === null || value === undefined) return `(${J} IS NULL OR ${J} = 'null'::jsonb)`;
    const v = this.p(JSON.stringify(value));
    return `(${J} = ${v}::jsonb OR (jsonb_typeof(${J}) = 'array' AND ${J} @> jsonb_build_array(${v}::jsonb)))`;
  }

  compare(field, op, value) {
    const sqlOp = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' }[op];
    if (this.isColumn(field)) {
      const t = this.columns[field];
      return `"${field}" ${sqlOp} ${this.p(value)}::${t}`;
    }
    const J = this.jsonExpr(field);
    const v = this.p(JSON.stringify(value));
    return `(jsonb_typeof(${J}) = jsonb_typeof(${v}::jsonb) AND ${J} ${sqlOp} ${v}::jsonb)`;
  }

  fieldCondition(field, cond) {
    // Valor simple, arreglo u objeto sin operadores = igualdad.
    if (!isObject(cond) || !Object.keys(cond).some((k) => k.startsWith('$'))) {
      return this.eq(field, cond);
    }
    const parts = [];
    for (const [op, value] of Object.entries(cond)) {
      switch (op) {
        case '$eq':
          parts.push(this.eq(field, value));
          break;
        case '$ne':
          parts.push(`NOT COALESCE(${this.eq(field, value)}, false)`);
          break;
        case '$in': {
          const arr = Array.isArray(value) ? value : [value];
          parts.push(arr.length ? `(${arr.map((v) => this.eq(field, v)).join(' OR ')})` : 'false');
          break;
        }
        case '$nin': {
          const arr = Array.isArray(value) ? value : [value];
          if (arr.length) parts.push(`NOT COALESCE((${arr.map((v) => this.eq(field, v)).join(' OR ')}), false)`);
          break;
        }
        case '$gt':
        case '$gte':
        case '$lt':
        case '$lte':
          parts.push(this.compare(field, op, value));
          break;
        case '$exists':
          parts.push(
            value
              ? `(${this.jsonExpr(field)} IS NOT NULL AND ${this.jsonExpr(field)} <> 'null'::jsonb)`
              : `(${this.jsonExpr(field)} IS NULL OR ${this.jsonExpr(field)} = 'null'::jsonb)`
          );
          break;
        case '$regex': {
          const flags = String(cond.$options || '');
          const re = value instanceof RegExp ? value.source : String(value);
          parts.push(`COALESCE(${this.textExpr(field)}, '') ${flags.includes('i') ? '~*' : '~'} ${this.p(re)}`);
          break;
        }
        case '$options':
          break;
        case '$all':
          parts.push(`${this.jsonExpr(field)} @> ${this.p(JSON.stringify(Array.isArray(value) ? value : [value]))}::jsonb`);
          break;
        case '$size':
          parts.push(
            `(jsonb_typeof(${this.jsonExpr(field)}) = 'array' AND jsonb_array_length(${this.jsonExpr(field)}) = ${this.p(Number(value))}::int)`
          );
          break;
        case '$not':
          parts.push(`NOT COALESCE(${this.fieldCondition(field, value)}, false)`);
          break;
        case '$elemMatch': {
          // Soporte básico: algún elemento del arreglo cumple todas las igualdades.
          const v = this.p(JSON.stringify([value]));
          parts.push(`${this.jsonExpr(field)} @> ${v}::jsonb`);
          break;
        }
        default:
          throw new HttpError(400, `Operador no soportado: ${op}`);
      }
    }
    return parts.length ? `(${parts.join(' AND ')})` : 'true';
  }

  where(query) {
    if (!query || !isObject(query) || !Object.keys(query).length) return 'true';
    const parts = [];
    for (const [key, value] of Object.entries(query)) {
      if (key === '$or' || key === '$and' || key === '$nor') {
        const subs = (Array.isArray(value) ? value : [value]).map((q) => this.where(q));
        if (!subs.length) continue;
        if (key === '$and') parts.push(`(${subs.join(' AND ')})`);
        else if (key === '$or') parts.push(`(${subs.join(' OR ')})`);
        else parts.push(`NOT (${subs.join(' OR ')})`);
      } else if (key.startsWith('$')) {
        throw new HttpError(400, `Operador no soportado: ${key}`);
      } else {
        parts.push(this.fieldCondition(key, value));
      }
    }
    return parts.length ? parts.join(' AND ') : 'true';
  }

  orderBy(sort, defaultSort = '-created_date') {
    const s = sort || defaultSort;
    const items = String(s)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const out = items.map((item) => {
      const desc = item.startsWith('-');
      const field = item.replace(/^[-+]/, '');
      const expr = this.isColumn(field) ? `"${field}"` : this.jsonExpr(field);
      return `${expr} ${desc ? 'DESC' : 'ASC'} NULLS LAST`;
    });
    out.push('id ASC');
    return out.join(', ');
  }
}
