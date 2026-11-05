// Cliente del mu-plugin iaprop-generador (REST iaprop/v1 en el sitio principal del Multisite)
// y registro opcional del dominio de vista previa en Easypanel.
import crypto from 'node:crypto';
import { config } from '../config.js';

async function llamar(metodo, ruta, cuerpo, timeoutMs = 120000) {
  if (!config.wpGenUrl || !config.wpGenKey) throw new Error('Faltan WP_GEN_URL / WP_GEN_KEY');
  const r = await fetch(`${config.wpGenUrl}/wp-json/iaprop/v1${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', 'x-iaprop-key': config.wpGenKey },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const txt = await r.text();
  let d; try { d = JSON.parse(txt); } catch { d = { crudo: txt.slice(0, 500) }; }
  if (!r.ok) throw new Error(`WP ${ruta} ${r.status}: ${d.message || d.crudo || ''}`);
  return d;
}

export const salud = () => llamar('GET', '/salud');
export const crearSitio = ({ dominio, titulo }) => llamar('POST', '/sitios', { dominio, titulo });
export const estadoSitio = (id) => llamar('GET', `/sitios/${id}`);
export const aplicar = (id, cuerpo) => llamar('POST', `/sitios/${id}/aplicar`, cuerpo, 300000);
// Dueño del sitio (mu-plugin iaprop-acceso): único usuario del cliente, entra sin contraseña en /acceso.
export const asignarDueno = (id, { email, nombre, apiUrl, google, arquetipo }) => llamar('POST', `/sitios/${id}/dueno`, { email, nombre, api_url: apiUrl, google: !!google, arquetipo });

/**
 * Registra host → servicio WordPress en Easypanel (Traefik). Best effort: si no hay token, devuelve {ok:false}
 * y el orquestador lo reporta como paso manual. API tRPC de Easypanel: POST /api/trpc/<procedimiento> {json}.
 */
export async function registrarDominioEasypanel(host) {
  if (!config.easypanelUrl || !config.easypanelToken) return { ok: false, motivo: 'sin EASYPANEL_URL/EASYPANEL_TOKEN' };
  const input = {
    id: crypto.randomBytes(8).toString('hex'), host, https: true, path: '/', wildcard: false, middlewares: [], certificateResolver: '',
    destinationType: 'service',
    serviceDestination: { projectName: config.wpEasypanelProyecto, serviceName: config.wpEasypanelServicio, port: 80, protocol: 'http', path: '/', composeService: '' },
  };
  try {
    const r = await fetch(`${config.easypanelUrl}/api/trpc/domains.createDomain`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.easypanelToken}` },
      body: JSON.stringify({ json: input }), signal: AbortSignal.timeout(30000),
    });
    const t = await r.text();
    return r.ok ? { ok: true } : { ok: false, motivo: `${r.status} ${t.slice(0, 200)}` };
  } catch (e) { return { ok: false, motivo: e.message }; }
}

/** ¿El host ya responde? (para saber si hay que registrar el dominio). */
export async function responde(url) {
  try { const r = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) }); return r.status < 500 && r.status !== 404; }
  catch { return false; }
}
