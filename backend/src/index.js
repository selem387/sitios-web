// Servidor principal: API compatible con Base44 (/api/apps/...), páginas de acceso,
// archivos, funciones Deno, tiempo real y API de administración.
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { Readable } from 'node:stream';
import { config } from './config.js';
import { initControl } from './db.js';
import { getTenant, migrateAllTenants } from './tenants.js';
import { resolveCaller } from './authcore.js';
import { registerEntityRoutes } from './entities.js';
import { registerAuthRoutes } from './auth.js';
import { registerHostedRoutes } from './hosted.js';
import { registerIntegrationRoutes } from './integrations.js';
import { registerAdminRoutes } from './admin.js';
import { invokeFunction } from './functions.js';
import { attachRealtime } from './realtime.js';
import { scheduleAll } from './automations.js';
import { resolveFilePath, checkPrivateAccess, streamFile } from './storage.js';
import { HttpError, errorBody } from './util.js';

const app = new Hono();

app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-App-Id', 'X-Origin-URL', 'X-Base44-Anonymous-Id', 'Base44-Functions-Version', 'on-behalf-of', 'X-Data-Env'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

function handleError(c, err) {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  return c.json(errorBody(err instanceof HttpError ? err : new HttpError(500, err.message || 'Internal error')), status);
}

// Identifica la app: prefijo /t/<slug>, parámetro :appId, header X-App-Id o ?app_id.
export async function resolveTenant(c, explicit) {
  const id = explicit || c.req.param('appId') || c.req.header('x-tenant-slug') || c.req.header('x-app-id') || c.req.query('app_id');
  if (!id) return null;
  return getTenant(id);
}

// Envoltura común: resuelve app, usuario y cuerpo, y serializa la respuesta.
function ctx(handler, { rawBody = false } = {}) {
  return async (c) => {
    try {
      const tenant = await resolveTenant(c);
      if (!tenant) throw new HttpError(400, 'App no identificada');
      const caller = await resolveCaller(tenant, c.req.header('authorization'));
      if (caller.kind === 'invalid') throw new HttpError(401, 'Invalid or expired token', { reason: 'auth_required' });
      let body;
      if (!rawBody && !['GET', 'HEAD'].includes(c.req.method)) body = await c.req.json().catch(() => undefined);
      const result = await handler(c, { tenant, caller, body });
      if (result instanceof Response) return result;
      return c.json(result === undefined ? null : result);
    } catch (err) {
      return handleError(c, err);
    }
  };
}

const wrap = (handler) => async (c) => {
  try {
    const result = await handler(c);
    if (result instanceof Response) return result;
    return c.json(result === undefined ? null : result);
  } catch (err) {
    return handleError(c, err);
  }
};

app.get('/health', (c) => c.json({ ok: true }));

// Ajustes públicos que el AuthContext de las apps consulta al cargar.
app.get('/api/apps/public/prod/public-settings/by-id/:appId', ctx(async (c, { tenant, caller }) => {
  const requiresAuth = Boolean(tenant.settings.requires_auth);
  if (requiresAuth && caller.kind !== 'user' && caller.kind !== 'service') {
    throw new HttpError(403, 'Authentication required', { reason: 'auth_required' });
  }
  return {
    id: tenant.app_id,
    public_settings: {
      name: tenant.name,
      requires_auth: requiresAuth,
      auth_config: { password: tenant.settings.auth?.password !== false, google: Boolean(tenant.secrets.GOOGLE_CLIENT_ID) },
      ...(tenant.settings.public || {}),
    },
  };
}));

registerEntityRoutes(app, ctx);
registerAuthRoutes(app, ctx);
registerIntegrationRoutes(app, ctx);
registerHostedRoutes(app, ctx, resolveTenant);
registerAdminRoutes(app, wrap);

// Funciones backend: el SDK hace POST /api/apps/:appId/functions/:name.
async function proxyFunction(c, tenant, name) {
  const url = new URL(c.req.url);
  const headers = {};
  for (const [k, v] of c.req.raw.headers) {
    if (!['host', 'connection', 'content-length', 'authorization'].includes(k)) headers[k] = v;
  }
  const res = await invokeFunction(tenant, name, {
    method: c.req.method,
    body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : Buffer.from(await c.req.arrayBuffer()),
    headers,
    userAuthorization: c.req.header('authorization'),
    search: url.search,
  });
  const out = new Headers(res.headers);
  out.delete('content-encoding');
  out.delete('content-length');
  return new Response(res.body, { status: res.status, headers: out });
}

app.all('/api/apps/:appId/functions/:name{.+}', async (c) => {
  try {
    const tenant = await resolveTenant(c);
    return await proxyFunction(c, tenant, c.req.param('name'));
  } catch (err) {
    return handleError(c, err);
  }
});

// functions.fetch() del SDK: /api/functions/<ruta>, la app llega por header o prefijo.
app.all('/api/functions/:name{.+}', async (c) => {
  try {
    const tenant = await resolveTenant(c);
    if (!tenant) throw new HttpError(400, 'App no identificada');
    return await proxyFunction(c, tenant, c.req.param('name'));
  } catch (err) {
    return handleError(c, err);
  }
});

// Analítica y logs de navegación del SDK: se aceptan y se descartan.
app.post('/api/apps/:appId/analytics/track/batch', (c) => c.json({ ok: true }));
app.post('/api/apps/:appId/app-logs/:appIdAgain/log-user-in-app/:page', (c) => c.json({ ok: true }));
app.post('/api/app-logs/:appId/log-user-in-app/:page', (c) => c.json({ ok: true }));
app.get('/api/app-logs/:appId', (c) => c.json([]));
app.get('/api/app-logs/:appId/stats', (c) => c.json({}));

// Agentes y conectores OAuth de Base44: aún no soportados.
app.all('/api/apps/:appId/agents/*', (c) => c.json(errorBody(new HttpError(501, 'Agentes de IA aún no soportados en este backend')), 501));
app.all('/api/apps/:appId/payments/*', (c) => c.json(errorBody(new HttpError(501, 'Pagos de Base44 no soportados; usa Stripe/MercadoPago desde una función')), 501));

// Archivos públicos y privados (con firma).
app.get('/files/*', async (c) => {
  try {
    const rel = decodeURIComponent(c.req.path.replace(/^\/files\//, ''));
    const [appId, visibility] = rel.split('/');
    if (visibility === 'private') {
      const tenant = await getTenant(appId);
      if (!checkPrivateAccess(tenant, rel, c.req.query('expires'), c.req.query('sig'))) throw new HttpError(403, 'Enlace vencido o inválido');
    } else if (visibility !== 'public') {
      throw new HttpError(404, 'Archivo no encontrado');
    }
    const { stream, size, mime } = await streamFile(resolveFilePath(rel));
    return new Response(Readable.toWeb(stream), {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(size),
        'Cache-Control': visibility === 'public' ? 'public, max-age=31536000, immutable' : 'private, no-store',
      },
    });
  } catch (err) {
    return handleError(c, err);
  }
});

app.notFound((c) => c.json(errorBody(new HttpError(404, `Ruta no encontrada: ${c.req.method} ${c.req.path}`)), 404));
app.onError((err, c) => handleError(c, err));

// Prefijo /t/<slug>: permite usar https://api/t/<slug> como VITE_BASE44_APP_BASE_URL.
async function fetchWithPrefix(req, env) {
  const url = new URL(req.url);
  const m = url.pathname.match(/^\/t\/([a-z0-9-]+)(\/.*)?$/);
  if (!m) return app.fetch(req, env);
  url.pathname = m[2] || '/';
  const headers = new Headers(req.headers);
  headers.set('x-tenant-slug', m[1]);
  const init = { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body, duplex: 'half' };
  return app.fetch(new Request(url, init), env);
}

async function main() {
  await initControl();
  await migrateAllTenants();
  const server = serve({ fetch: fetchWithPrefix, port: config.port, hostname: '0.0.0.0' }, (info) => {
    console.log(`sitios-web backend escuchando en :${info.port}`);
  });
  attachRealtime(server);
  await scheduleAll();
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { app, fetchWithPrefix };
