// Pasos para que el cliente apunte SU dominio al servidor, según quién administra sus registros DNS.
// Base curada (revisada contra la ayuda oficial de cada proveedor el 4-nov-2026) + refresco automático:
// cada 14 días se lee la página de ayuda oficial vigente y Claude reescribe los pasos con lo que diga hoy.
// Caché en la tabla dominios_guias (base web_builder).
import * as db from '../entrevista/db.js';
import { pedirJSON, MODELO_MEMORIA } from '../entrevista/claude.js';
import { PROVEEDORES, partes, ipServidor } from './registrador.js';

const VIGENCIA_MS = 14 * 864e5;

// {NOMBRE} = '@' o subdominio · {IP} · {DOMINIO} (zona) · {HOST} (lo que se va a ver)
export const BASE = {
  godaddy: [
    'Entra a tu cuenta de GoDaddy y abre *Mis productos* → *Dominios*.',
    'Toca tu dominio *{DOMINIO}* y luego la pestaña *DNS*.',
    'Busca el registro tipo *A* con nombre *{NOMBRE}* y toca el lápiz para editarlo (si no existe, toca *Agregar nuevo registro* y elige *A*).',
    'En *Valor* escribe *{IP}* y toca *Guardar*.',
    '{WWW}',
    'Si GoDaddy te pide un código de verificación, es normal: llega por SMS o a tu correo.',
  ],
  cloudflare: [
    'Entra a dash.cloudflare.com y elige tu dominio *{DOMINIO}*.',
    'En el menú de la izquierda abre *DNS* → *Records*.',
    'Si ya hay un registro *A* con nombre *{NOMBRE}*, toca *Edit*; si no, toca *Add record* y elige tipo *A*.',
    'En *IPv4 address* escribe *{IP}* y deja *Proxy status* en gris (*DNS only*). Toca *Save*.',
    '{WWW}',
    'Si hay un registro *AAAA* con nombre *{NOMBRE}*, bórralo.',
  ],
  hostinger: [
    'Entra a hpanel.hostinger.com → *Dominios* → elige *{DOMINIO}*.',
    'Abre *DNS / Nameservers* (editor de zona DNS).',
    'Si tienes activado el *CDN de Hostinger*, apágalo primero; si no, no te deja cambiar el registro de la raíz.',
    'Busca el registro *A* con nombre *{NOMBRE}*, toca el lápiz, en *Apunta a* escribe *{IP}* y toca *Actualizar*. Si no existe, créalo arriba: tipo *A*, nombre *{NOMBRE}*, apunta a *{IP}*.',
    'Borra cualquier otro registro *A* o *AAAA* con nombre *{NOMBRE}* (ícono de basura).',
    '{WWW}',
  ],
  namecheap: [
    'Entra a Namecheap → *Domain List* → toca *Manage* junto a *{DOMINIO}*.',
    'Abre la pestaña *Advanced DNS*.',
    'En *Host Records*, borra los registros de estacionamiento (*URL Redirect* o *CNAME* hacia parkingpage) que tengan host *{NOMBRE}*.',
    'Toca *Add New Record* → tipo *A Record*, Host *{NOMBRE}*, Value *{IP}* y toca la palomita verde para guardar.',
    '{WWW}',
    'Si no te deja editar, revisa que en la pestaña *Domain* los Nameservers digan *Namecheap BasicDNS*.',
  ],
  squarespace: [
    'Entra a account.squarespace.com/domains y toca *{DOMINIO}*.',
    'En el panel de la izquierda abre *DNS* (te pedirá tu contraseña).',
    'En *Squarespace Defaults*, borra el bloque de registros predeterminados (los A que apuntan a Squarespace), si los tienes.',
    'En *Custom Records* toca *Add record*: tipo *A*, host *{NOMBRE}*, data *{IP}* y guarda.',
    '{WWW}',
  ],
  wix: [
    'Entra a Wix → *Dominios* y toca el ícono de *Acciones de dominio* junto a *{DOMINIO}*.',
    'Elige *Administrar registros DNS*.',
    'En la sección *A (host)*, pasa sobre el registro y toca *Editar* (toca *Entendido* en el aviso).',
    'Deja *Nombre del host* vacío (equivale a *{NOMBRE}*), en *Valor* escribe *{IP}*, toca *Guardar* y luego *Guardar cambios*.',
    '{WWW}',
    'Si tu dominio está conectado a un sitio de Wix, desconéctalo primero en *Dominios*; si no, Wix vuelve a poner sus registros.',
  ],
  ionos: [
    'Entra a my.ionos.mx → *Dominios y SSL* → toca *{DOMINIO}*.',
    'Abre la pestaña *DNS*.',
    'Busca el registro *A* con host *{NOMBRE}* y toca el lápiz; cambia el valor a *{IP}* y guarda. Si no existe, toca *Agregar registro* → *A*.',
    'Borra el registro *AAAA* con host *{NOMBRE}*, si lo hay.',
    '{WWW}',
  ],
  porkbun: [
    'Entra a porkbun.com → *Domain Management*.',
    'Junto a *{DOMINIO}* toca *DNS*.',
    'Borra los registros de estacionamiento que traiga (*ALIAS* o *CNAME* hacia pixie.porkbun.com).',
    'En *Add Record* elige tipo *A - Address record*, deja *Host* vacío (equivale a *{NOMBRE}*), en *Answer* escribe *{IP}* y toca *Add*.',
    '{WWW}',
  ],
  akky: [
    'Entra a tu cuenta en akky.mx → *Mis dominios* → elige *{DOMINIO}*.',
    'Abre la administración de DNS (zona DNS / registros).',
    'Crea o edita el registro tipo *A* con nombre *{NOMBRE}* y valor *{IP}*; guarda.',
    '{WWW}',
    'Si Akky no te deja editar registros, es porque tu dominio usa los servidores de nombres de tu hosting: dime cuál es y te doy los pasos de ahí.',
  ],
  neubox: [
    'Entra a clientes.neubox.com → *Dominios* → *Mis dominios* → elige *{DOMINIO}*.',
    'Abre *Administrar DNS* / *Zona DNS*.',
    'Edita el registro *A* con nombre *{NOMBRE}* para que apunte a *{IP}* (o créalo si no existe) y guarda.',
    '{WWW}',
  ],
  hostgator: [
    'Entra a tu cPanel de HostGator y abre *Editor de zona* (Zone Editor).',
    'Junto a *{DOMINIO}* toca *Administrar*.',
    'Edita el registro *A* de *{HOST}* para que apunte a *{IP}* y guarda.',
    '{WWW}',
  ],
  cpanel: [
    'Entra al cPanel de tu hosting y abre *Editor de zona* (Zone Editor).',
    'Junto a *{DOMINIO}* toca *Administrar*.',
    'Edita el registro *A* de *{HOST}* para que apunte a *{IP}* y guarda.',
    '{WWW}',
  ],
  generico: [
    'Entra al panel de la empresa donde compraste tu dominio (o donde tienes tu hosting).',
    'Busca la sección *DNS*, *Zona DNS* o *Registros DNS* de *{DOMINIO}*.',
    'Crea o edita el registro tipo *A* con nombre *{NOMBRE}* y valor *{IP}*. Borra otros registros *A* o *AAAA* con ese mismo nombre.',
    '{WWW}',
  ],
};

const pasoWww = (nombre, dominio) => (nombre === '@'
  ? `Haz lo mismo para *www*: un registro *CNAME* con nombre *www* que apunte a *${dominio}* (si ya hay un *A* o *CNAME* llamado *www*, cámbialo o bórralo).`
  : null);

function rellenar(pasos, { nombre, ip, dominio, host }) {
  return pasos
    .map((p) => (p === '{WWW}' ? pasoWww(nombre, dominio) : p))
    .filter(Boolean)
    .map((p) => p.replaceAll('{NOMBRE}', nombre).replaceAll('{IP}', ip).replaceAll('{DOMINIO}', dominio).replaceAll('{HOST}', host));
}

const texto = (html) => String(html)
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const ESQUEMA = {
  type: 'object',
  properties: {
    util: { type: 'boolean', description: 'false si el texto no trae pasos del panel para editar registros DNS' },
    pasos: { type: 'array', items: { type: 'string' } },
    notas: { type: 'array', items: { type: 'string' } },
  },
  required: ['util', 'pasos'],
};

/** Lee la ayuda oficial vigente y reescribe los pasos con marcadores. Devuelve null si no sirve. */
async function refrescar(slug) {
  const p = PROVEEDORES[slug];
  if (!p?.ayuda) return null;
  const r = await fetch(p.ayuda, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; IAprop-guias/1.0)', 'accept-language': 'es-MX,es;q=0.9,en;q=0.6' }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
  if (!r.ok) return null;
  const t = texto(await r.text()).slice(0, 14000);
  if (t.length < 400) return null;
  const { data } = await pedirJSON({
    model: MODELO_MEMORIA,
    max_tokens: 900,
    system: `Eres soporte técnico y escribes para un dueño de negocio sin conocimientos técnicos. Con el TEXTO de la ayuda oficial de ${p.nombre}, escribe los pasos actuales en el panel de ${p.nombre} para:
1) crear o editar un registro A con nombre {NOMBRE} y valor {IP} del dominio {DOMINIO};
2) borrar otros registros A o AAAA con ese nombre;
3) la línea literal "{WWW}" como un paso aparte (el sistema la sustituye).
Reglas: máximo 7 pasos, español de México, una acción por paso, nombres de menús y botones tal como aparecen en el texto entre *asteriscos*.
Usa los marcadores {NOMBRE}, {IP}, {DOMINIO} tal cual. No inventes menús que no estén en el texto; si el texto no describe el panel, devuelve util=false.`,
    contenido: `TEXTO DE LA AYUDA OFICIAL (${p.ayuda}):\n${t}`,
    schema: ESQUEMA,
  });
  if (!data?.util || !Array.isArray(data.pasos) || data.pasos.length < 2) return null;
  const pasos = data.pasos.map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
  if (!pasos.some((x) => x.includes('{IP}'))) return null;
  if (!pasos.includes('{WWW}')) pasos.push('{WWW}');
  return { pasos, notas: data.notas || [] };
}

const refrescando = new Set();
/** Revisa la ayuda oficial y guarda los pasos nuevos; si no sirve, conserva lo anterior y reintenta en 1 día. */
export async function actualizarGuia(clave) {
  if (refrescando.has(clave)) return null;
  refrescando.add(clave);
  try {
    const nuevo = await refrescar(clave).catch((err) => { console.error('guia refresco', clave, err.message); return null; });
    if (nuevo) {
      await db.q(`INSERT INTO dominios_guias (proveedor, pasos, fuente, notas, revisado) VALUES ($1,$2,$3,$4,now())
                  ON CONFLICT (proveedor) DO UPDATE SET pasos=EXCLUDED.pasos, fuente=EXCLUDED.fuente, notas=EXCLUDED.notas, revisado=now()`,
      [clave, JSON.stringify(nuevo.pasos), PROVEEDORES[clave].ayuda, JSON.stringify(nuevo.notas)]);
      return nuevo;
    }
    await db.q(`INSERT INTO dominios_guias (proveedor, pasos, fuente, revisado) VALUES ($1,$2,'curada',now() - interval '13 days')
                ON CONFLICT (proveedor) DO UPDATE SET revisado=now() - interval '13 days'`, [clave, JSON.stringify(BASE[clave])]);
    return null;
  } finally { refrescando.delete(clave); }
}

/** Pasos vigentes para un proveedor. Nunca hace esperar al cliente: si la caché está vencida, responde con lo que hay y refresca atrás. */
export async function pasosVigentes(slug) {
  const clave = BASE[slug] ? slug : 'generico';
  if (!PROVEEDORES[clave]) return { pasos: BASE[clave], fuente: 'curada', revisado: '2026-11-04' };
  const fila = (await db.q('SELECT pasos, fuente, revisado FROM dominios_guias WHERE proveedor=$1', [clave]).catch(() => ({ rows: [] }))).rows[0];
  if (!fila || Date.now() - new Date(fila.revisado).getTime() > VIGENCIA_MS) actualizarGuia(clave).catch(() => {});
  return fila ? { pasos: fila.pasos, fuente: fila.fuente, revisado: fila.revisado } : { pasos: BASE[clave], fuente: 'curada', revisado: '2026-11-04' };
}

/**
 * Arma los mensajes para el cliente a partir de investigar(). → {textos[], proveedor, pasos}
 */
export async function guiaParaCliente(info) {
  const ip = ipServidor();
  const { zona, nombre } = partes(info.dominio);
  const host = info.dominio;
  // Manda quien administra los registros (por nameservers); si no se reconoce, el registrador; si tampoco, genérico.
  const nsGenericoCpanel = info.ns.some((x) => /^ns\d?\./.test(x)) && !info.dns_slug;
  const slug = info.dns_slug || (nsGenericoCpanel ? 'cpanel' : null) || info.registrador_slug || 'generico';
  const prov = PROVEEDORES[slug];
  const regNombre = PROVEEDORES[info.registrador_slug]?.nombre || info.registrador || null;
  const { pasos } = await pasosVigentes(slug);
  const lista = rellenar(pasos, { nombre, ip, dominio: zona, host });

  const intro = [];
  if (regNombre && prov && info.registrador_slug && info.registrador_slug !== slug) {
    intro.push(`Revisé *${host}*: está registrado en *${regNombre}*, pero sus registros los administra *${prov.nombre}*, así que el cambio se hace en ${prov.nombre}.`);
  } else if (prov) {
    intro.push(`Revisé *${host}*: está en *${prov.nombre}*. Para que tu página se vea ahí hay que hacer un cambio en tu cuenta (toma 5 minutos y no afecta tu correo).`);
  } else if (regNombre) {
    intro.push(`Revisé *${host}*: está registrado en *${regNombre}*. Para que tu página se vea ahí hay que hacer un cambio en el panel de esa empresa (toma 5 minutos y no afecta tu correo).`);
  } else {
    intro.push(`Revisé *${host}*. Para que tu página se vea ahí hay que hacer un cambio en el panel donde lo compraste (toma 5 minutos y no afecta tu correo).`);
  }
  const textos = [
    intro[0],
    `*Pasos${prov ? ` en ${prov.nombre}` : ''}:*\n${lista.map((p, i) => `${i + 1}. ${p}`).join('\n')}${prov?.panel ? `\n\nEntra aquí: ${prov.panel}` : ''}`,
    `No toques los registros *MX* ni *TXT*: son los de tu correo.\n\nNo tienes que hacerlo ahora. Cuando lo hagas escríbeme *listo* y yo reviso que haya quedado (a veces tarda unas horas en verse). ${slug === 'generico' ? 'Si me dices en qué empresa lo compraste, te doy los pasos exactos de ahí. ' : ''}¿Seguimos con las últimas preguntas?`,
  ];
  return { textos, proveedor: slug, registrador: regNombre, pasos: lista };
}
