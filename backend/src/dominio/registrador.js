// Dónde está un dominio: registrador (RDAP con bootstrap de IANA; respaldo WHOIS puerto 43),
// nameservers y quién administra sus registros DNS (puede no ser el registrador: p. ej. comprado en Akky
// y con los registros en Cloudflare o en su hosting).
import net from 'node:net';

const IP = () => process.env.SERVIDOR_IP || '72.62.163.198';
export const ipServidor = IP;

async function pedirJSON(url, timeout = 15000) {
  const r = await fetch(url, { headers: { accept: 'application/rdap+json, application/json' }, signal: AbortSignal.timeout(timeout), redirect: 'follow' });
  if (r.status === 404) return { _404: true };
  if (!r.ok) throw new Error(`${url.split('?')[0]} → ${r.status}`);
  return r.json();
}

/* ---------- Nombre del dominio ---------- */
const SLD2 = /\.(com|org|net|gob|edu|nom)\.(mx|ar|co|br|pe|cl|ec|uy|ve)$|\.co\.uk$|\.com\.(es|au)$/;
export function limpiarDominio(d) {
  return String(d || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '').replace(/\.$/, '')
    .normalize('NFKC');
}
export const esDominio = (d) => /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d);
/** Zona registrable (ejemplo.com.mx) y nombre relativo ('@' o 'pagina'). */
export function partes(host) {
  const h = limpiarDominio(host);
  const n = SLD2.test(h) ? 3 : 2;
  const seg = h.split('.');
  return { zona: seg.slice(-n).join('.'), nombre: seg.length > n ? seg.slice(0, -n).join('.') : '@', tld: seg.slice(n === 3 ? -2 : -1).join('.') };
}

/* ---------- Proveedores conocidos ---------- */
// ns: patrón de nameservers que indica que ESE proveedor administra los registros.
// reg: patrón del nombre del registrador en RDAP/WHOIS.
export const PROVEEDORES = {
  godaddy: { nombre: 'GoDaddy', ns: /domaincontrol\.com/, reg: /godaddy|wild west/i, panel: 'https://dcc.godaddy.com/control/portfolio', ayuda: 'https://www.godaddy.com/es/help/agregar-o-editar-un-registro-a-42546' },
  cloudflare: { nombre: 'Cloudflare', ns: /\.ns\.cloudflare\.com/, reg: /cloudflare/i, panel: 'https://dash.cloudflare.com/', ayuda: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/' },
  hostinger: { nombre: 'Hostinger', ns: /dns-parking\.com|hostinger/, reg: /hostinger/i, panel: 'https://hpanel.hostinger.com/domains', ayuda: 'https://www.hostinger.com/support/4468886-how-to-manage-a-records-at-hostinger/' },
  namecheap: { nombre: 'Namecheap', ns: /registrar-servers\.com/, reg: /namecheap/i, panel: 'https://ap.www.namecheap.com/domains/list/', ayuda: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/' },
  squarespace: { nombre: 'Squarespace (antes Google Domains)', ns: /squarespacedns\.com|googledomains\.com/, reg: /squarespace|google/i, panel: 'https://account.squarespace.com/domains', ayuda: 'https://support.squarespace.com/hc/en-us/articles/360002101888-Adding-custom-DNS-records-to-your-Squarespace-managed-domain' },
  wix: { nombre: 'Wix', ns: /wixdns\.net/, reg: /wix\.com/i, panel: 'https://manage.wix.com/account/domains', ayuda: 'https://support.wix.com/es/article/agregar-o-actualizar-registros-a-en-tu-cuenta-de-wix' },
  ionos: { nombre: 'IONOS', ns: /ui-dns\.(com|org|de|biz)/, reg: /ionos|1&1|1and1/i, panel: 'https://my.ionos.mx/domains', ayuda: 'https://www.ionos.mx/ayuda/dominios/configurar-la-direccion-ip/conectar-dominio-con-direccion-ip-estatica/' },
  porkbun: { nombre: 'Porkbun', ns: /porkbun\.com/, reg: /porkbun/i, panel: 'https://porkbun.com/account/domainsSpeedy', ayuda: 'https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun' },
  akky: { nombre: 'Akky', ns: /akky\.mx/, reg: /akky/i, panel: 'https://www.akky.mx/', ayuda: 'https://soporte.akky.mx/sitioayuda2/s/?language=es_MX' },
  neubox: { nombre: 'Neubox', ns: /neubox\.(net|com|mx)/, reg: /neubox/i, panel: 'https://clientes.neubox.com/clientarea.php', ayuda: 'https://neubox.com/' },
  hostgator: { nombre: 'HostGator', ns: /hostgator\.(mx|com)/, reg: /hostgator/i, panel: 'https://cliente.hostgator.mx/', ayuda: 'https://www.hostgator.com/help/article/how-to-change-dns-zones-mx-cname-and-a-records' },
};

export function proveedorPorNs(ns = []) {
  const lista = ns.map((x) => String(x).toLowerCase());
  for (const [slug, p] of Object.entries(PROVEEDORES)) if (lista.some((x) => p.ns.test(x))) return slug;
  return null;
}
export function proveedorPorRegistrador(nombre = '') {
  for (const [slug, p] of Object.entries(PROVEEDORES)) if (p.reg.test(nombre)) return slug;
  return null;
}

/* ---------- RDAP ---------- */
let bootstrap = null, bootstrapT = 0;
async function baseRdap(tld) {
  if (!bootstrap || Date.now() - bootstrapT > 864e5) {
    const d = await pedirJSON('https://data.iana.org/rdap/dns.json');
    bootstrap = new Map();
    for (const [tlds, urls] of d.services || []) for (const t of tlds) bootstrap.set(t.toLowerCase(), urls.find((u) => u.startsWith('https')) || urls[0]);
    bootstrapT = Date.now();
  }
  const ultimo = tld.split('.').pop();
  return bootstrap.get(tld) || bootstrap.get(ultimo) || null;
}

const vcardNombre = (ent) => {
  const v = ent?.vcardArray?.[1] || [];
  return (v.find((x) => x[0] === 'fn') || [])[3] || (v.find((x) => x[0] === 'org') || [])[3] || null;
};

export function leerRdap(d) {
  const registrar = (d.entities || []).find((x) => (x.roles || []).includes('registrar'));
  const url = (registrar?.links || []).find((l) => l.href && !/rdap/i.test(l.href))?.href || null;
  const ev = (t) => (d.events || []).find((x) => x.eventAction === t)?.eventDate || null;
  return {
    registrado: true,
    registrador: vcardNombre(registrar) || registrar?.handle || null,
    registrador_iana: (registrar?.publicIds || []).find((p) => /iana/i.test(p.type))?.identifier || null,
    registrador_url: url,
    ns: (d.nameservers || []).map((n) => String(n.ldhName || '').toLowerCase().replace(/\.$/, '')).filter(Boolean),
    vence: ev('expiration'),
    creado: ev('registration'),
    estados: d.status || [],
    fuente: 'rdap',
  };
}

/* ---------- WHOIS (respaldo para TLD sin RDAP, p. ej. algunos ccTLD) ---------- */
function whoisCrudo(servidor, consulta, timeout = 12000) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const s = net.createConnection({ host: servidor, port: 43 });
    s.setTimeout(timeout, () => { s.destroy(); reject(new Error(`whois ${servidor} sin respuesta`)); });
    s.on('connect', () => s.write(`${consulta}\r\n`));
    s.on('data', (c) => { buf += c.toString('utf8'); if (buf.length > 200000) s.destroy(); });
    s.on('end', () => resolve(buf));
    s.on('close', () => resolve(buf));
    s.on('error', reject);
  });
}

export function leerWhois(t) {
  const linea = (re) => (t.match(re) || [])[1]?.trim() || null;
  if (/no match|not found|no entries found|no data found|status:\s*free|object does not exist/i.test(t)) return { registrado: false, fuente: 'whois' };
  const ns = [...t.matchAll(/^\s*(?:name ?server|nserver|dns|ns\d?)\s*[:.]\s*([a-z0-9.-]+\.[a-z]{2,})/gim)].map((m) => m[1].toLowerCase().replace(/\.$/, ''));
  return {
    registrado: true,
    registrador: linea(/^\s*registrar(?: name)?\s*:\s*(.+)$/im) || linea(/^\s*sponsoring registrar\s*:\s*(.+)$/im),
    registrador_iana: linea(/registrar iana id\s*:\s*(\d+)/i),
    registrador_url: linea(/registrar url\s*:\s*(\S+)/i),
    ns: [...new Set(ns)],
    vence: linea(/(?:expir\w*(?: date)?|registry expiry date|fecha de vencimiento)\s*:\s*(.+)$/im),
    creado: linea(/(?:creation date|created on|fecha de creaci[oó]n)\s*:\s*(.+)$/im),
    estados: [],
    fuente: 'whois',
  };
}

async function whois(zona) {
  const tld = zona.split('.').pop();
  const iana = await whoisCrudo('whois.iana.org', tld);
  const servidor = (iana.match(/^whois:\s*(\S+)/im) || [])[1];
  if (!servidor) throw new Error(`sin servidor WHOIS para .${tld}`);
  return leerWhois(await whoisCrudo(servidor, zona));
}

/* ---------- DNS público ---------- */
export async function resolver(nombre, tipo = 'A') {
  try {
    const d = await pedirJSON(`https://dns.google/resolve?name=${encodeURIComponent(nombre)}&type=${tipo}`);
    const n = { A: 1, NS: 2, CNAME: 5, AAAA: 28 }[tipo];
    return (d?.Answer || []).filter((x) => x.type === n).map((x) => String(x.data).toLowerCase().replace(/\.$/, ''));
  } catch { return []; }
}

/**
 * Investiga el dominio. → {dominio, zona, nombre, registrado, registrador, registrador_slug, ns, dns_slug, vence, fuente}
 * registrado=null cuando no se pudo confirmar en ningún lado.
 */
export async function investigar(dominio) {
  const host = limpiarDominio(dominio);
  const { zona, nombre, tld } = partes(host);
  let info = null;
  try {
    const base = await baseRdap(tld);
    if (base) {
      const d = await pedirJSON(`${base.replace(/\/$/, '')}/domain/${encodeURIComponent(zona)}`);
      info = d._404 ? { registrado: false, fuente: 'rdap' } : leerRdap(d);
    }
  } catch { /* cae a WHOIS */ }
  if (!info) { try { info = await whois(zona); } catch { info = null; } }
  const nsDns = await resolver(zona, 'NS');
  const ns = (info?.ns?.length ? info.ns : nsDns);
  // Si el DNS público responde nameservers, la zona existe aunque RDAP/WHOIS fallen.
  const registrado = info?.registrado ?? (nsDns.length ? true : null);
  return {
    dominio: host, zona, nombre,
    registrado,
    registrador: info?.registrador || null,
    registrador_slug: proveedorPorRegistrador(info?.registrador || ''),
    registrador_url: info?.registrador_url || null,
    ns,
    dns_slug: proveedorPorNs(nsDns.length ? nsDns : ns),
    vence: info?.vence || null,
    fuente: info?.fuente || (nsDns.length ? 'dns' : null),
  };
}

/** ¿Ya apunta al servidor? Revisa A del host (y www si es raíz) en Google DNS. */
export async function revisarApuntado(dominio) {
  const host = limpiarDominio(dominio);
  const { nombre } = partes(host);
  const [a, aaaa] = await Promise.all([resolver(host, 'A'), resolver(host, 'AAAA')]);
  const okRaiz = a.length > 0 && a.every((x) => x === IP());
  let okWww = true, www = [];
  if (nombre === '@') { www = await resolver(`www.${host}`, 'A'); okWww = www.length > 0 && www.every((x) => x === IP()); }
  return { ok: okRaiz, ok_www: okWww, a, aaaa, www, ip: IP() };
}
