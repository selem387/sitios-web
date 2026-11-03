// Clientes de los servicios externos: GoDaddy (DNS v3), Easypanel (tRPC) y la API de sitios-web.
const env = process.env;
export const C = {
  ip: env.SERVIDOR_IP || '72.62.163.198',
  easypanelUrl: (env.EASYPANEL_URL || 'https://x6jqxs.easypanel.host').replace(/\/$/, ''),
  easypanelToken: env.EASYPANEL_TOKEN || '',
  apiUrl: (env.API_URL || 'http://sitios-web_api:3000').replace(/\/$/, ''),
  apiKey: env.ENTREVISTA_API_KEY || '',
  destino: { projectName: env.DESTINO_PROYECTO || 'sitios-web', serviceName: env.DESTINO_SERVICIO || 'api', port: Number(env.DESTINO_PUERTO || 3000) },
};

async function pedir(url, { metodo = 'GET', headers = {}, cuerpo, timeout = 30000 } = {}) {
  const r = await fetch(url, { method: metodo, headers: { ...(cuerpo ? { 'content-type': 'application/json' } : {}), ...headers }, body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(timeout) });
  const t = await r.text();
  let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = { texto: t.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${metodo} ${url.split('?')[0]} → ${r.status} ${t.slice(0, 300)}`);
  return d;
}

/* ---------------- Easypanel (tRPC) ---------------- */
async function ep(proc, input, mutacion = false) {
  if (!C.easypanelToken) throw new Error('Falta EASYPANEL_TOKEN');
  const h = { authorization: `Bearer ${C.easypanelToken}` };
  if (!mutacion) return (await pedir(`${C.easypanelUrl}/api/trpc/${proc}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`, { headers: h }))?.json;
  return (await pedir(`${C.easypanelUrl}/api/trpc/${proc}`, { metodo: 'POST', headers: h, cuerpo: { json: input } }))?.json;
}
const destinoDominio = (host, id, https = true) => ({
  id, host, https, path: '/', wildcard: false, middlewares: [], certificateResolver: 'letsencrypt', destinationType: 'service',
  serviceDestination: { ...C.destino, protocol: 'http', path: '/', composeService: '' },
});

/** Crea (si faltan) los dominios apex y www hacia el servicio destino. Devuelve {creados, existentes}. */
export async function easypanelDominios(hosts) {
  const lista = await ep('domains.listDomains', { projectName: C.destino.projectName, serviceName: C.destino.serviceName });
  const out = { creados: [], existentes: [] };
  for (const host of hosts) {
    if (lista.some((d) => d.host === host)) { out.existentes.push(host); continue; }
    await ep('domains.createDomain', destinoDominio(host, `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`), true);
    out.creados.push(host);
  }
  return out;
}

/** Vuelve a pedir el certificado: apaga y prende HTTPS del dominio (Traefik reintenta el reto ACME). */
export async function easypanelReintentarCertificado(host) {
  const lista = await ep('domains.listDomains', { projectName: C.destino.projectName, serviceName: C.destino.serviceName });
  const d = lista.find((x) => x.host === host);
  if (!d) throw new Error(`No existe el dominio ${host} en Easypanel`);
  await ep('domains.updateDomain', destinoDominio(host, d.id, false), true);
  await ep('domains.updateDomain', destinoDominio(host, d.id, true), true);
}

/* ---------------- API sitios-web ---------------- */
const api = (ruta, cuerpo, metodo = cuerpo ? 'POST' : 'GET', timeout = 900000) => pedir(`${C.apiUrl}${ruta}`, { metodo, cuerpo, headers: { 'x-api-key': C.apiKey }, timeout });
export const sesion = (id) => api(`/entrevista/v1/sesiones/${id}`);
export const generarPropuestas = (id, { logo_url, token } = {}) => api(`/entrevista/v1/sesiones/${id}/propuestas`, { logo_url, token });
export const mapearDominio = (dominio, sesion_id, logo_url, modo = 'propuestas') => api('/entrevista/v1/dominios', { dominio, sesion_id, logo_url, modo });

/** Revisa el sitio por HTTPS con certificado válido. {ok, codigo, error, selector} */
export async function verificarHttps(dominio, patron = /Elige el diseño/) {
  try {
    const r = await fetch(`https://${dominio}/`, { signal: AbortSignal.timeout(20000), redirect: 'manual' });
    const t = r.status === 200 ? await r.text() : '';
    return { ok: r.status === 200 && patron.test(t), codigo: r.status };
  } catch (e) {
    const causa = String(e.cause?.code || e.cause?.message || e.message);
    return { ok: false, error: causa, tls: /CERT|SELF_SIGNED|certificate|UNABLE_TO_VERIFY/i.test(causa) };
  }
}
