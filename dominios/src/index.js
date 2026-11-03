// Microservicio "dominios" (proyecto Easypanel sitios-web).
// Conecta el dominio de un cliente a sus 6 propuestas de diseño, de punta a punta:
//   1 validar (GoDaddy confirma que el dominio está en la cuenta)  2 propuestas (reusar o generar)
//   3 mapeo dominio→propuestas + capturas  4 Easypanel (apex + www, Let's Encrypt)  5 DNS GoDaddy (@ y www)
//   6 propagación (Google DNS)  7 HTTPS válido (reintenta el certificado si sale autofirmado)  → listo
// API (header X-API-Key = DOMINIOS_API_KEY):
//   POST /v1/dominios {dominio, sesion_id?, modo?: 'propuestas'|'chat', regenerar?, logo_url?}  → 202 {trabajo_id}
//   DNS: GoDaddy (GODADDY_PAT) o Cloudflare (CLOUDFLARE_API_TOKEN), detectado por nameservers.
//   GET  /v1/dominios/:dominio                                    → último trabajo con pasos
//   GET  /v1/dominios/:dominio/dns                                → registros actuales en GoDaddy
//   GET  /health
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import pg from 'pg';
import crypto from 'node:crypto';
import * as P from './proveedores.js';
import * as DNS from './dns.js';

const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.DOMINIOS_API_KEY || '';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const q = (s, v = []) => pool.query(s, v);

await q(`CREATE TABLE IF NOT EXISTS dominios_trabajos (
  id serial PRIMARY KEY, dominio text NOT NULL, sesion_id uuid, estado text NOT NULL DEFAULT 'pendiente',
  pasos jsonb NOT NULL DEFAULT '[]', error text, resultado jsonb, creado timestamptz NOT NULL DEFAULT now(), actualizado timestamptz NOT NULL DEFAULT now())`);
await q(`CREATE INDEX IF NOT EXISTS dominios_trabajos_dom_idx ON dominios_trabajos (dominio, id DESC)`);
// Trabajos que quedaron a medias por un reinicio: se marcan para que se puedan relanzar.
await q(`UPDATE dominios_trabajos SET estado='interrumpido', actualizado=now() WHERE estado IN ('pendiente','en_curso')`);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const enCurso = new Set();

async function ejecutar(id, { dominio, sesion_id, regenerar, logo_url, modo }) {
  const pasos = [];
  const paso = async (nombre, datos = {}) => {
    pasos.push({ paso: nombre, t: new Date().toISOString(), ...datos });
    await q(`UPDATE dominios_trabajos SET pasos=$2, estado='en_curso', actualizado=now() WHERE id=$1`, [id, JSON.stringify(pasos)]);
  };
  enCurso.add(dominio);
  try {
    // 1) Proveedor DNS (GoDaddy o Cloudflare, por nameservers) y acceso a la zona con el token.
    const zonaInfo = await DNS.registros(dominio);
    const raiz = DNS.partes(dominio).nombre === '@';
    await paso('validado', { proveedor: zonaInfo.proveedor, zona: zonaInfo.zona, registros: zonaInfo.registros.length });

    if (modo === 'propuestas') {
      // 2) Propuestas: reutiliza las de la sesión salvo que se pida regenerar.
      const s = await P.sesion(sesion_id);
      let token = s?.brief?.marca?.propuestas?.token;
      if (!token || regenerar) {
        const r = await P.generarPropuestas(sesion_id, { logo_url, token: regenerar ? token : undefined });
        token = r.token;
        await paso('propuestas_generadas', { token, opciones: r.opciones?.length });
      } else await paso('propuestas_existentes', { token });
    }

    // 3) Mapeo dominio → contenido (propuestas con capturas para el selector, o el chat de Ari).
    const m = await P.mapearDominio(dominio, sesion_id, logo_url, modo);
    await paso('mapeo', { modo, opciones: m.opciones?.length });

    // 4) Easypanel: rutas de Traefik con Let's Encrypt (apex + www, o solo el subdominio).
    await paso('easypanel', await P.easypanelDominios(raiz ? [dominio, `www.${dominio}`] : [dominio]));

    // 5) DNS en el proveedor del cliente.
    await paso('dns', await DNS.apuntar(dominio));

    // 6) Propagación: Google DNS debe responder solo la IP del servidor (hasta 30 min).
    let ips = [];
    for (let i = 0; i < 90; i++) {
      ips = await DNS.dnsPublico(dominio);
      if (ips.length && ips.every((x) => x === P.C.ip)) break;
      await dormir(20000);
    }
    await paso('propagacion', { ips });

    // 7) HTTPS: si el certificado sale autofirmado (Let's Encrypt validó antes de propagar), se vuelve a pedir.
    let v = null, reintentos = 0;
    for (let i = 0; i < 45; i++) {
      v = await P.verificarHttps(dominio, modo === 'chat' ? /Ari/ : /Elige el diseño/);
      if (v.ok) break;
      if (v.tls && i > 0 && i % 9 === 0 && reintentos < 3) {
        await P.easypanelReintentarCertificado(dominio).catch(() => {});
        if (raiz) await P.easypanelReintentarCertificado(`www.${dominio}`).catch(() => {});
        reintentos++;
        await paso('certificado_reintento', { intento: reintentos });
      }
      await dormir(20000);
    }
    if (!v?.ok) throw new Error(`HTTPS no quedó listo: ${JSON.stringify(v)}`);
    const resultado = { url: `https://${dominio}/`, ...(modo === 'propuestas' ? { propuestas: 'abcdef'.split('').map((l) => `https://${dominio}/${l}`) } : {}) };
    await paso('listo', resultado);
    await q(`UPDATE dominios_trabajos SET estado='listo', resultado=$2, actualizado=now() WHERE id=$1`, [id, JSON.stringify(resultado)]);
  } catch (e) {
    await q(`UPDATE dominios_trabajos SET estado='error', error=$2, pasos=$3, actualizado=now() WHERE id=$1`, [id, String(e.message).slice(0, 1000), JSON.stringify(pasos)]);
    console.error('dominio', dominio, e);
  } finally { enCurso.delete(dominio); }
}

const app = new Hono();
const igual = (a, b) => { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return y.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); };
app.get('/health', (c) => c.json({ ok: true, en_curso: [...enCurso], godaddy: !!process.env.GODADDY_PAT, cloudflare: !!process.env.CLOUDFLARE_API_TOKEN, easypanel: !!P.C.easypanelToken }));
app.use('/v1/*', async (c, next) => { if (!igual(c.req.header('x-api-key'), API_KEY)) return c.json({ error: 'X-API-Key inválida' }, 401); await next(); });

const limpiar = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

app.post('/v1/dominios', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const dominio = limpiar(b.dominio);
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) return c.json({ error: 'dominio inválido' }, 400);
  const modo = b.modo === 'chat' ? 'chat' : 'propuestas';
  if (modo === 'propuestas' && !/^[0-9a-f-]{36}$/.test(String(b.sesion_id || ''))) return c.json({ error: 'sesion_id inválido' }, 400);
  if (enCurso.has(dominio)) return c.json({ error: 'ya hay un trabajo en curso para ese dominio' }, 409);
  const r = await q(`INSERT INTO dominios_trabajos (dominio, sesion_id, estado) VALUES ($1,$2,'pendiente') RETURNING id`, [dominio, b.sesion_id || null]);
  ejecutar(r.rows[0].id, { dominio, sesion_id: b.sesion_id || null, regenerar: !!b.regenerar, logo_url: b.logo_url || undefined, modo });
  return c.json({ trabajo_id: r.rows[0].id, dominio, modo, estado: 'pendiente', consulta: `/v1/dominios/${dominio}` }, 202);
});

app.get('/v1/dominios/:dominio', async (c) => {
  const r = await q(`SELECT * FROM dominios_trabajos WHERE dominio=$1 ORDER BY id DESC LIMIT 1`, [limpiar(c.req.param('dominio'))]);
  return r.rows[0] ? c.json(r.rows[0]) : c.json({ error: 'sin trabajos' }, 404);
});

app.get('/v1/dominios/:dominio/dns', async (c) => {
  try { return c.json(await DNS.registros(limpiar(c.req.param('dominio')))); }
  catch (e) { return c.json({ error: e.message }, 502); }
});

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, () => console.log(`dominios escuchando en :${PORT}`));
