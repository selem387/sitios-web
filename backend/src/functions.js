// Ejecuta las funciones backend (Deno) de cada app en un proceso aislado por app.
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { signServiceToken } from './authcore.js';
import { HttpError } from './util.js';

const RUNNER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'runner', 'runner.ts');
const IDLE_MS = 15 * 60 * 1000;
const runners = new Map();

export const appDir = (appId) => path.join(config.dataDir, 'apps', appId);
export const functionsDir = (appId) => path.join(appDir(appId), 'base44', 'functions');

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function waitHealthy(port, ms = 90000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/__health`);
      if (r.ok) return;
    } catch {
      /* aún no */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('El ejecutor de funciones no arrancó a tiempo');
}

async function startRunner(tenant) {
  const port = await freePort();
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME || '/tmp',
    DENO_DIR: process.env.DENO_DIR || path.join(config.dataDir, 'deno-cache'),
    DENO_NO_UPDATE_CHECK: '1',
    ...Object.fromEntries(
      ['DENO_CERT', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'no_proxy', 'TZ']
        .filter((k) => process.env[k])
        .map((k) => [k, process.env[k]])
    ),
    ...Object.fromEntries(Object.entries(tenant.secrets || {}).map(([k, v]) => [k, String(v)])),
    BASE44_APP_ID: tenant.app_id,
    RUNNER_PORT: String(port),
    FUNCTIONS_DIR: functionsDir(tenant.app_id),
  };
  // Sin config ni node_modules del backend: las funciones resuelven npm: desde la caché global de Deno.
  await fs.mkdir(env.FUNCTIONS_DIR, { recursive: true });
  const proc = spawn(config.denoBin, ['run', '-A', '--quiet', '--no-config', '--node-modules-dir=none', RUNNER], {
    env,
    cwd: env.FUNCTIONS_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tag = `[fn:${tenant.slug}]`;
  proc.stdout.on('data', (d) => process.stdout.write(`${tag} ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`${tag} ${d}`));
  const entry = { proc, port, lastUsed: Date.now(), ready: null };
  proc.on('exit', () => {
    if (runners.get(tenant.app_id) === entry) runners.delete(tenant.app_id);
  });
  entry.ready = waitHealthy(port).catch((e) => {
    proc.kill();
    runners.delete(tenant.app_id);
    throw e;
  });
  runners.set(tenant.app_id, entry);
  return entry;
}

export function stopRunner(appId) {
  const r = runners.get(appId);
  if (r) {
    r.proc.kill();
    runners.delete(appId);
  }
}

setInterval(() => {
  for (const [appId, r] of runners) if (Date.now() - r.lastUsed > IDLE_MS) stopRunner(appId);
}, 60000).unref();

export async function invokeFunction(tenant, name, { method = 'POST', body, headers = {}, userAuthorization, search = '' }) {
  const dir = functionsDir(tenant.app_id);
  const exists = await fs.stat(path.join(dir, name)).then((s) => s.isDirectory()).catch(() => false);
  if (!exists) throw new HttpError(404, `Función no encontrada: ${name}`);
  let r = runners.get(tenant.app_id);
  if (!r) r = await startRunner(tenant);
  await r.ready;
  r.lastUsed = Date.now();
  const serviceToken = await signServiceToken(tenant);
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) if (v !== undefined && v !== null) h.set(k, String(v));
  h.set('Base44-App-Id', tenant.app_id);
  h.set('Base44-Api-Url', config.internalUrl);
  h.set('Base44-Service-Authorization', `Bearer ${serviceToken}`);
  if (userAuthorization && userAuthorization.startsWith('Bearer ')) h.set('Authorization', userAuthorization);
  else h.delete('Authorization');
  const res = await fetch(`http://127.0.0.1:${r.port}/__fn/${encodeURIComponent(name).replace(/%2F/g, '/')}${search}`, {
    method,
    headers: h,
    body: ['GET', 'HEAD'].includes(method) ? undefined : body,
  });
  return res;
}

// Guarda los archivos de base44/ (functions, shared) de una app.
export async function writeAppFiles(appId, files, { replaceFunctions = true } = {}) {
  const root = path.join(appDir(appId), 'base44');
  if (replaceFunctions) {
    await fs.rm(path.join(root, 'functions'), { recursive: true, force: true });
    await fs.rm(path.join(root, 'shared'), { recursive: true, force: true });
  }
  let count = 0;
  for (const [rel, content] of Object.entries(files || {})) {
    const clean = rel.replace(/^\/+/, '').replace(/^base44\//, '');
    if (clean.includes('..') || !/^(functions|shared)\//.test(clean)) continue;
    const abs = path.join(root, clean);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
    count++;
  }
  stopRunner(appId);
  return { written: count };
}

export async function listFunctions(appId) {
  const dir = functionsDir(appId);
  const out = [];
  async function walk(d, prefix) {
    const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => []);
    const hasEntry = entries.some((e) => e.isFile() && /^(entry|index)\.(ts|js)$/.test(e.name));
    if (hasEntry && prefix) out.push(prefix);
    for (const e of entries) if (e.isDirectory()) await walk(path.join(d, e.name), prefix ? `${prefix}/${e.name}` : e.name);
  }
  await walk(dir, '');
  return out;
}
