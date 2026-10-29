#!/usr/bin/env node
// Importa una app de Base44 al backend sitios-web.
//
// Uso:
//   SITIOS_API=https://sitios-web-api.x6jqxs.easypanel.host ADMIN_TOKEN=... \
//   node tools/importar-app.mjs <carpeta-export>
//
// <carpeta-export>/app.json      { "app_id", "slug", "name", "settings": {...} }
// <carpeta-export>/entities/*.jsonc   esquemas (copiados de base44/entities del repo)
// <carpeta-export>/data/<Entidad>.json  arreglo de registros exportados de Base44
// <carpeta-export>/data/User.json      usuarios (opcional)
//
// Descarga las imágenes/archivos alojados en Base44 que aparezcan en los registros,
// los guarda en el backend y reescribe las URLs.
import fs from 'node:fs/promises';
import path from 'node:path';

const API = (process.env.SITIOS_API || '').replace(/\/$/, '');
const TOKEN = process.env.ADMIN_TOKEN;
const dir = process.argv[2];
if (!API || !TOKEN || !dir) {
  console.error('Faltan SITIOS_API, ADMIN_TOKEN o la carpeta de exportación');
  process.exit(1);
}

async function admin(method, p, body) {
  const r = await fetch(`${API}${p}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} → ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// Quita comentarios // y /* */ de un .jsonc sin tocar strings.
function parseJsonc(src) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inStr) {
      out += ch;
      if (ch === '\\') out += src[++i];
      else if (ch === '"') inStr = false;
    } else if (ch === '"') {
      inStr = true;
      out += ch;
    } else if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++;
    } else out += ch;
  }
  return JSON.parse(out.replace(/,\s*([}\]])/g, '$1'));
}

const FILE_URL_RE = /https:\/\/(?:base44\.app\/api\/apps\/[^"\s]+\/files\/[^"\s]+|[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/base44-prod\/[^"\s]+|media\.base44\.com\/[^"\s]+)/g;

const app = JSON.parse(await fs.readFile(path.join(dir, 'app.json'), 'utf8'));
console.log(`→ App ${app.name} (${app.app_id}) como /t/${app.slug}`);
await admin('POST', '/admin/tenants', app);

const entDir = path.join(dir, 'entities');
const schemas = [];
for (const f of await fs.readdir(entDir).catch(() => [])) {
  if (!/\.jsonc?$/.test(f)) continue;
  const schema = parseJsonc(await fs.readFile(path.join(entDir, f), 'utf8'));
  if (schema.name) schemas.push({ name: schema.name, schema });
}
if (schemas.length) console.log('  esquemas:', (await admin('PUT', `/admin/tenants/${app.app_id}/schemas`, { schemas })).saved);

const dataDir = path.join(dir, 'data');
const files = (await fs.readdir(dataDir).catch(() => [])).filter((f) => f.endsWith('.json'));
const urls = new Set();
const datasets = {};
for (const f of files) {
  const entity = f.replace(/\.json$/, '');
  const rows = JSON.parse(await fs.readFile(path.join(dataDir, f), 'utf8'));
  datasets[entity] = rows;
  for (const m of JSON.stringify(rows).matchAll(FILE_URL_RE)) urls.add(m[0]);
}

let map = {};
if (urls.size) {
  const list = [...urls];
  for (let i = 0; i < list.length; i += 20) {
    const res = await admin('POST', `/admin/tenants/${app.app_id}/files/import`, { urls: list.slice(i, i + 20) });
    map = { ...map, ...res.map };
    for (const [u, e] of Object.entries(res.errors || {})) console.warn('  ⚠ archivo', u, e);
  }
  console.log(`  archivos: ${Object.keys(map).length}/${urls.size}`);
}

const rewrite = (rows) => JSON.parse(JSON.stringify(rows).replace(FILE_URL_RE, (u) => map[u] || u));

for (const [entity, rows] of Object.entries(datasets)) {
  const clean = rewrite(rows).map(({ is_sample, ...r }) => r);
  if (entity === 'User') {
    console.log('  usuarios:', (await admin('POST', `/admin/tenants/${app.app_id}/users`, { users: clean })).imported);
  } else {
    for (let i = 0; i < clean.length; i += 200) {
      await admin('POST', `/admin/tenants/${app.app_id}/records/${entity}`, { records: clean.slice(i, i + 200) });
    }
    console.log(`  ${entity}: ${clean.length}`);
  }
}
console.log('✓ Listo');
