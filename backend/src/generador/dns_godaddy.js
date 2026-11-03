// DNS de dominios del cliente en GoDaddy (API v3, Personal Access Token en GODADDY_PAT).
// apuntarDominio: @ → IP del servidor (A) y www → dominio (CNAME), quitando los registros de estacionamiento.
const BASE = 'https://api.godaddy.com/v3/domains/zones';
const PAT = () => process.env.GODADDY_PAT || '';
export const IP_SERVIDOR = process.env.SERVIDOR_IP || '72.62.163.198';

async function gd(metodo, ruta, cuerpo) {
  if (!PAT()) throw new Error('Falta GODADDY_PAT en el servicio api');
  const r = await fetch(`${BASE}${ruta}`, {
    method: metodo, headers: { authorization: `Bearer ${PAT()}`, 'content-type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(30000),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`GoDaddy ${metodo} ${ruta.split('?')[0]} → ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

export async function registros(dominio) {
  const d = await gd('GET', `/${dominio}/dns-records?pageSize=100`);
  return d?.items || [];
}

export async function apuntarDominio(dominio, ip = IP_SERVIDOR) {
  const log = [];
  const todos = await registros(dominio);
  const aRaiz = todos.filter((x) => x.type === 'A' && x.name === '@');
  if (aRaiz.length) {
    await gd('PUT', `/${dominio}/dns-records/${aRaiz[0].recordId}`, { name: '@', type: 'A', data: ip, ttl: 600 });
    log.push(`A @ ${aRaiz[0].data} → ${ip}`);
    for (const x of aRaiz.slice(1)) { await gd('DELETE', `/${dominio}/dns-records/${x.recordId}`); log.push(`borrado A @ ${x.data}`); }
  } else {
    await gd('POST', `/${dominio}/dns-records`, { type: 'A', name: '@', data: ip, ttl: 600 });
    log.push(`creado A @ ${ip}`);
  }
  const www = todos.filter((x) => x.name === 'www' && ['A', 'AAAA', 'CNAME'].includes(x.type));
  const cname = www.find((x) => x.type === 'CNAME');
  for (const x of www.filter((y) => y !== cname)) { await gd('DELETE', `/${dominio}/dns-records/${x.recordId}`); log.push(`borrado ${x.type} www ${x.data}`); }
  if (cname) { await gd('PUT', `/${dominio}/dns-records/${cname.recordId}`, { name: 'www', type: 'CNAME', data: dominio, ttl: 600 }); log.push(`CNAME www ${cname.data} → ${dominio}`); }
  else { await gd('POST', `/${dominio}/dns-records`, { type: 'CNAME', name: 'www', data: dominio, ttl: 600 }); log.push(`creado CNAME www → ${dominio}`); }
  // AAAA en la raíz (si lo hubiera de estacionamiento) haría que IPv6 vaya a otro lado.
  for (const x of todos.filter((y) => y.type === 'AAAA' && y.name === '@')) { await gd('DELETE', `/${dominio}/dns-records/${x.recordId}`); log.push(`borrado AAAA @ ${x.data}`); }
  return { ok: true, dominio, ip, cambios: log, registros: (await registros(dominio)).map((x) => `${x.type} ${x.name} ${x.data}`) };
}
