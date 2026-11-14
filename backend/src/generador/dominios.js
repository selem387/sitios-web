// Dominios propios de clientes servidos por la API (antes de tener sitio final):
// toolatte.cafe/ → selector con las 6 propuestas; toolatte.cafe/a … /f → cada propuesta.
// La tabla dominios_cliente se crea al vuelo. www.<dominio> redirige al dominio sin www.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as db from '../entrevista/db.js';
import { DIR_PROPUESTAS } from './propuestas_html.js';
import { conBarraBorrador } from './barra_borrador.js';
import { paginaChat } from '../chat/pagina.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let listo = false;
async function tabla() {
  if (listo) return;
  await db.q(`CREATE TABLE IF NOT EXISTS dominios_cliente (
    dominio text PRIMARY KEY, entrevista_id uuid, modo text NOT NULL DEFAULT 'propuestas', token text, datos jsonb NOT NULL DEFAULT '{}',
    creado timestamptz NOT NULL DEFAULT now(), actualizado timestamptz NOT NULL DEFAULT now())`);
  listo = true;
}

let cache = { t: 0, mapa: new Map() };
async function mapa() {
  if (Date.now() - cache.t < 30000) return cache.mapa;
  await tabla();
  const r = await db.q(`SELECT * FROM dominios_cliente`);
  cache = { t: Date.now(), mapa: new Map(r.rows.map((x) => [x.dominio, x])) };
  return cache.mapa;
}

export async function asignarDominio({ dominio, entrevista_id, token, datos = {}, modo = 'propuestas' }) {
  await tabla();
  await db.q(`INSERT INTO dominios_cliente (dominio, entrevista_id, token, datos, modo) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (dominio) DO UPDATE SET entrevista_id=EXCLUDED.entrevista_id, token=EXCLUDED.token, datos=EXCLUDED.datos, modo=EXCLUDED.modo, actualizado=now()`,
  [dominio.toLowerCase(), entrevista_id || null, token || null, JSON.stringify(datos), modo]);
  cache.t = 0;
}

export function selector(d, reg) {
  const ops = reg.datos.opciones || [];
  const pal = { bg: '#F4EDE1', fg: '#3B2417', p: '#5A331F', card: '#FFFDF8', bor: '#E6D9C3' };
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(reg.datos.nombre || d)} · Elige tu diseño</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Hanken+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0}body{background:${pal.bg};color:${pal.fg};font-family:'Hanken Grotesk',sans-serif;line-height:1.5}
.w{max-width:1120px;margin:0 auto;padding:28px 20px 60px}header{text-align:center}header img{height:84px;margin:0 auto 10px;display:block}
h1{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(28px,6vw,44px);line-height:1.1}header p{color:#6E5446;margin-top:8px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px;margin-top:28px}
a.op{display:block;background:${pal.card};border:1px solid ${pal.bor};border-radius:22px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .15s,box-shadow .15s}
a.op:hover,a.op:focus-visible{transform:translateY(-3px);box-shadow:0 14px 30px rgba(59,36,23,.14)}a.op:focus-visible{outline:3px solid ${pal.p};outline-offset:3px}
.th{aspect-ratio:390/600;background:#eee;overflow:hidden}.th img{width:100%;display:block}
.pie{display:flex;align-items:center;gap:12px;padding:14px 16px}.l{flex:0 0 auto;width:38px;height:38px;border-radius:50%;background:${pal.p};color:#fff;display:grid;place-items:center;font-weight:700;font-family:'Bricolage Grotesque'}
.pie b{display:block}.pie span{font-size:14px;color:#6E5446}.pie .l{color:#fff;font-size:17px}
@media (prefers-reduced-motion:reduce){a.op{transition:none}}</style></head><body><div class="w">
<header>${reg.datos.logo ? `<img src="${esc(reg.datos.logo)}" alt="${esc(reg.datos.nombre || '')}">` : ''}<h1>Elige el diseño de tu página</h1><p>${ops.length} propuestas hechas con tu logo, tus productos y tu menú. Ábrelas y recórrelas completas.</p></header>
<div class="g">${ops.map((o) => `<a class="op" href="/${o.letra.toLowerCase()}"><div class="th">${o.captura ? `<img src="${esc(o.captura)}" alt="Vista de la propuesta ${o.letra}" loading="lazy">` : ''}</div><div class="pie"><span class="l">${o.letra}</span><span><b>Propuesta ${o.letra}</b><span>${esc(o.nombre)}</span></span></div></a>`).join('')}</div>
</div></body></html>`;
}

// Otros módulos atienden sus propios modos (p. ej. "vivo": sitio en vivo + panel del dueño).
const modos = new Map();
export const registrarModo = (modo, fn) => modos.set(modo, fn);

/** Middleware Hono: atiende peticiones cuyo Host es un dominio de cliente registrado. */
export function middlewareDominios() {
  return async (c, next) => {
    const host = String(c.req.header('host') || '').split(':')[0].toLowerCase();
    if (!host || host.endsWith('.easypanel.host') || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return next();
    let m;
    try { m = await mapa(); } catch { return next(); }
    if (host.startsWith('www.') && m.has(host.slice(4))) return c.redirect(`https://${host.slice(4)}${c.req.path}`, 301);
    const reg = m.get(host);
    if (!reg) return next();
    // Dominio del chat de Ari (p. ej. weber.lemoss.co): la raíz es el chat; /chat/v1, /chat/archivos y /p/ siguen normales.
    if (modos.has(reg.modo)) return modos.get(reg.modo)(c, reg, next, host);
    if (reg.modo === 'chat') {
      if (c.req.path === '/' || c.req.path === '/chat') return c.html(paginaChat({ ...(reg.datos?.titulo ? { titulo: reg.datos.titulo } : {}), ...(reg.datos?.marca ? { marca: reg.datos.marca } : {}), ...(reg.datos?.descripcion ? { descripcion: reg.datos.descripcion } : {}), url: `https://${host}/` }), 200, { 'cache-control': 'no-cache' });
      return next();
    }
    const ruta = c.req.path.replace(/\/+$/, '') || '/';
    if (ruta.startsWith('/r/')) return next(); // reacciones de la barra borrador (chat/index.js)
    if (ruta === '/') return c.html(selector(host, reg), 200, { 'cache-control': 'no-cache' });
    const letra = ruta.match(/^\/([a-r])$/i)?.[1]?.toUpperCase();
    if (letra) {
      try {
        const html = (await fs.readFile(path.join(DIR_PROPUESTAS, reg.token, `${letra}.html`), 'utf8'))
          .replace(/<span class="etq">([^<]*)<\/span>/, '<a class="etq" href="/" style="text-decoration:none">‹ Ver todas · $1</a>');
        const acciones = Object.fromEntries(['cambios', 'tal', 'no'].map((r) => [r, `/r/${reg.token}/${letra}/${r}`]));
        return c.html(conBarraBorrador(html, { acciones }), 200, { 'cache-control': 'no-cache' });
      }
      catch { return c.text('No encontrada', 404); }
    }
    if (ruta === '/robots.txt') return c.text('User-agent: *\nDisallow: /\n');
    return c.redirect('/', 302);
  };
}
