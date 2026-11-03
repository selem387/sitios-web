// DNS del dominio del cliente en GoDaddy o Cloudflare (se detecta por los nameservers).
// Operación única: @ (o el subdominio pedido) → IP del servidor con registro A; www → CNAME al dominio.
// Nunca toca MX, TXT, NS ni SOA (correo y verificaciones del cliente quedan intactos).
const env = process.env;
const IP = () => env.SERVIDOR_IP || '72.62.163.198';

async function pedir(url, { metodo = 'GET', headers = {}, cuerpo, timeout = 30000 } = {}) {
  const r = await fetch(url, { method: metodo, headers: { ...(cuerpo ? { 'content-type': 'application/json' } : {}), ...headers }, body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: AbortSignal.timeout(timeout) });
  const t = await r.text();
  let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = { texto: t.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${metodo} ${url.split('?')[0]} → ${r.status} ${t.slice(0, 300)}`);
  return d;
}

/** Zona registrable (ejemplo.com.mx, ejemplo.cafe) y nombre relativo ('@', 'weber'). */
const SLD2 = /\.(com|org|net|gob|edu)\.(mx|ar|co|br|pe|cl)$|\.co\.uk$/;
export function partes(host) {
  const h = host.toLowerCase();
  const n = SLD2.test(h) ? 3 : 2;
  const seg = h.split('.');
  const zona = seg.slice(-n).join('.');
  const nombre = seg.length > n ? seg.slice(0, -n).join('.') : '@';
  return { zona, nombre };
}

export async function proveedorDe(zona) {
  const d = await pedir(`https://dns.google/resolve?name=${encodeURIComponent(zona)}&type=NS`, { timeout: 15000 });
  const ns = (d?.Answer || []).map((x) => String(x.data).toLowerCase());
  if (ns.some((x) => x.endsWith('.ns.cloudflare.com.'))) return { proveedor: 'cloudflare', ns };
  if (ns.some((x) => x.includes('domaincontrol.com'))) return { proveedor: 'godaddy', ns };
  return { proveedor: 'desconocido', ns };
}

export async function dnsPublico(host) {
  const d = await pedir(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`, { timeout: 15000 }).catch(() => null);
  return (d?.Answer || []).filter((x) => x.type === 1).map((x) => x.data);
}

/* ---------------- GoDaddy (API v3, token GODADDY_PAT) ---------------- */
const gd = (metodo, ruta, cuerpo) => {
  if (!env.GODADDY_PAT) throw new Error('Falta GODADDY_PAT');
  return pedir(`https://api.godaddy.com/v3/domains/zones${ruta}`, { metodo, cuerpo, headers: { authorization: `Bearer ${env.GODADDY_PAT}` } });
};
const godaddy = {
  async registros(zona) { return ((await gd('GET', `/${zona}/dns-records?pageSize=100`))?.items || []).map((x) => ({ id: x.recordId, tipo: x.type, nombre: x.name, valor: String(x.data || '').replace(/\.$/, '') })); },
  crear: (zona, r) => gd('POST', `/${zona}/dns-records`, { type: r.tipo, name: r.nombre, data: r.valor, ttl: 600 }),
  cambiar: (zona, id, r) => gd('PUT', `/${zona}/dns-records/${id}`, { type: r.tipo, name: r.nombre, data: r.valor, ttl: 600 }),
  borrar: (zona, id) => gd('DELETE', `/${zona}/dns-records/${id}`),
};

/* ---------------- Cloudflare (API v4, token CLOUDFLARE_API_TOKEN con Zone.DNS:Edit) ---------------- */
const cf = (metodo, ruta, cuerpo) => {
  if (!env.CLOUDFLARE_API_TOKEN) throw new Error('Falta CLOUDFLARE_API_TOKEN');
  return pedir(`https://api.cloudflare.com/client/v4${ruta}`, { metodo, cuerpo, headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } });
};
const zonasCf = new Map();
async function zonaCf(zona) {
  if (zonasCf.has(zona)) return zonasCf.get(zona);
  const d = await cf('GET', `/zones?name=${encodeURIComponent(zona)}`);
  const id = d?.result?.[0]?.id;
  if (!id) throw new Error(`La zona ${zona} no está en la cuenta de Cloudflare del token`);
  zonasCf.set(zona, id); return id;
}
const fqdn = (zona, nombre) => (nombre === '@' ? zona : `${nombre}.${zona}`);
const relativo = (zona, name) => (name === zona ? '@' : name.endsWith(`.${zona}`) ? name.slice(0, -(zona.length + 1)) : name);
const cloudflare = {
  async registros(zona) {
    const z = await zonaCf(zona);
    const d = await cf('GET', `/zones/${z}/dns_records?per_page=200`);
    return (d?.result || []).map((x) => ({ id: x.id, tipo: x.type, nombre: relativo(zona, x.name), valor: x.content, proxied: x.proxied }));
  },
  // proxied:false → Traefik emite el certificado Let's Encrypt directamente (reto HTTP).
  crear: async (zona, r) => cf('POST', `/zones/${await zonaCf(zona)}/dns_records`, { type: r.tipo, name: fqdn(zona, r.nombre), content: r.valor, ttl: 300, proxied: false }),
  cambiar: async (zona, id, r) => cf('PUT', `/zones/${await zonaCf(zona)}/dns_records/${id}`, { type: r.tipo, name: fqdn(zona, r.nombre), content: r.valor, ttl: 300, proxied: false }),
  borrar: async (zona, id) => cf('DELETE', `/zones/${await zonaCf(zona)}/dns_records/${id}`),
};

const PROVEEDORES = { godaddy, cloudflare };
function api(proveedor) {
  const p = PROVEEDORES[proveedor];
  if (!p) throw new Error(`Proveedor DNS no soportado (${proveedor}). Soportados: GoDaddy y Cloudflare`);
  return p;
}

export async function registros(host) {
  const { zona } = partes(host);
  const { proveedor, ns } = await proveedorDe(zona);
  return { zona, proveedor, ns, registros: await api(proveedor).registros(zona) };
}

/**
 * Apunta el host al servidor. Para un dominio raíz también crea/ajusta www → dominio.
 * @param {string} host  "toolatte.cafe" o "weber.lemoss.co"
 * @returns {{proveedor, zona, nombre, cambios: string[]}}
 */
export async function apuntar(host, { conWww = true } = {}) {
  const { zona, nombre } = partes(host);
  const { proveedor } = await proveedorDe(zona);
  const p = api(proveedor);
  const log = [];
  const todos = await p.registros(zona);
  // A del nombre → IP; sin AAAA (IPv6 iría a otro lado) ni CNAME en ese nombre.
  const a = todos.filter((x) => x.tipo === 'A' && x.nombre === nombre);
  for (const x of todos.filter((y) => y.nombre === nombre && (y.tipo === 'AAAA' || (y.tipo === 'CNAME' && nombre !== '@')))) { await p.borrar(zona, x.id); log.push(`borrado ${x.tipo} ${nombre} ${x.valor}`); }
  if (a.length === 1 && a[0].valor === IP() && a[0].proxied !== true) log.push(`A ${nombre} ya apunta a ${IP()}`);
  else if (a.length) {
    await p.cambiar(zona, a[0].id, { tipo: 'A', nombre, valor: IP() }); log.push(`A ${nombre} ${a[0].valor} → ${IP()}`);
    for (const x of a.slice(1)) { await p.borrar(zona, x.id); log.push(`borrado A ${nombre} ${x.valor}`); }
  } else { await p.crear(zona, { tipo: 'A', nombre, valor: IP() }); log.push(`creado A ${nombre} → ${IP()}`); }
  if (nombre === '@' && conWww) {
    const www = todos.filter((x) => x.nombre === 'www' && ['A', 'AAAA', 'CNAME'].includes(x.tipo));
    const cname = www.find((x) => x.tipo === 'CNAME');
    for (const x of www.filter((y) => y !== cname)) { await p.borrar(zona, x.id); log.push(`borrado ${x.tipo} www ${x.valor}`); }
    if (cname && cname.valor === zona && cname.proxied !== true) log.push('CNAME www ya apunta al dominio');
    else if (cname) { await p.cambiar(zona, cname.id, { tipo: 'CNAME', nombre: 'www', valor: zona }); log.push(`CNAME www ${cname.valor} → ${zona}`); }
    else { await p.crear(zona, { tipo: 'CNAME', nombre: 'www', valor: zona }); log.push(`creado CNAME www → ${zona}`); }
  }
  return { proveedor, zona, nombre, cambios: log };
}
