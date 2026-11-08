// Conecta un dominio a las propuestas/sitio del cliente usando el microservicio `dominios`
// (servicio dominios del proyecto Easypanel sitios-web): rutas Easypanel + Let's Encrypt, DNS, propagación, HTTPS.
//   dnsCliente=true → el cliente ya cambió sus registros en su proveedor; el microservicio no toca DNS.
const URL_ = () => (process.env.DOMINIOS_URL || 'http://sitios-web_dominios:8080').replace(/\/$/, '');
const KEY = () => process.env.DOMINIOS_API_KEY || '';
export const conexionConfigurada = () => Boolean(KEY());

async function pedir(metodo, ruta, cuerpo) {
  if (!KEY()) throw new Error('Falta DOMINIOS_API_KEY en el servicio api');
  const r = await fetch(`${URL_()}${ruta}`, {
    method: metodo,
    headers: { 'x-api-key': KEY(), ...(cuerpo ? { 'content-type': 'application/json' } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`dominios ${metodo} ${ruta} → ${r.status} ${d?.error || ''}`); e.status = r.status; throw e; }
  return d;
}

/** elegido=false → error 425: el dominio solo se monta con la opción que eligió el cliente. */
export function conectar({ dominio, sesionId, dnsCliente = false, elegido = true }) {
  if (!elegido) return Promise.reject(Object.assign(new Error('el cliente aún no elige diseño'), { status: 425 }));
  return pedir('POST', '/v1/dominios', { dominio, sesion_id: sesionId, modo: 'vivo', dns: dnsCliente ? 'cliente' : 'auto' });
}

/** Último trabajo del dominio: {estado: pendiente|en_curso|listo|error|interrumpido, resultado, error} */
export async function estadoConexion(dominio) {
  try { return await pedir('GET', `/v1/dominios/${encodeURIComponent(dominio)}`); }
  catch (e) { if (e.status === 404) return null; throw e; }
}
