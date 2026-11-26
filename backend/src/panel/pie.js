// Pie de sitio estándar de todos los sitios en vivo (26-nov-2026, pedido de Sebastián con el caso Intiviso Lab):
// contacto completo, mapa de Google, navegación, redes y legales (aviso de privacidad, términos, cookies, derechos ARCO,
// mapa del sitio y, si hay medición, "Configurar cookies"). Reemplaza el <footer> que traiga la opción de diseño y toma
// sus colores y letras de las variables del sitio (--fg, --bg, --p, --ft, --fc), con respaldo si una opción no las tiene.
// Buenas prácticas 2026: legales y contacto siempre visibles (también en celular), liga a mapa del sitio en lugar de
// listar todo, dirección con botón "Cómo llegar" del tamaño de un dedo, y mapa con carga diferida.
import { direccionTexto } from '../generador/datos_brief.js';
import { redes } from '../generador/kit/utiles.js';
import { enlacesRedes } from '../generador/iconos_redes.js';
import { medicionActiva } from './medicion.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const limpio = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Páginas legales que sirve cada sitio en vivo (ruta → título). */
export const LEGALES = [
  ['aviso-de-privacidad', 'Aviso de privacidad'],
  ['terminos-y-condiciones', 'Términos y condiciones'],
  ['politica-de-cookies', 'Política de cookies'],
  ['mapa-del-sitio', 'Mapa del sitio'],
];

export function horariosTexto(h) {
  if (!h) return '';
  if (typeof h === 'string') return limpio(h);
  if (Array.isArray(h)) return h.map((x) => (typeof x === 'string' ? x : [x?.dias, x?.horas || x?.horario].filter(Boolean).join(' '))).filter(Boolean).join(' · ');
  if (typeof h === 'object') return Object.entries(h).map(([d, v]) => `${d}: ${v}`).join(' · ');
  return '';
}

/** Zona de servicio cuando no hay dirección (negocios que van a domicilio o trabajan en línea). */
export function zonaTexto(brief = {}) {
  const cob = (brief.zona?.cobertura || []).filter(Boolean);
  if (cob.length) return cob.join(' · ');
  const n = brief.negocio || {};
  return [n.ciudad, n.estado].filter(Boolean).join(', ');
}

/** Lo que se busca en Google Maps: la dirección exacta o, si no hay, la ciudad / zona principal. */
export function consultaMapa(brief = {}) {
  const dir = direccionTexto(brief);
  const n = brief.negocio || {};
  if (dir) return { q: [n.nombre, dir].filter(Boolean).join(', '), exacta: true };
  const primera = (brief.zona?.cobertura || [])[0];
  const lugar = limpio(n.ciudad) || limpio(primera);
  if (!lugar) return null;
  const q = /^cdmx$/i.test(lugar) ? 'Ciudad de México' : lugar;
  return { q: n.estado && !q.includes(n.estado) ? `${q}, ${n.estado}` : q, exacta: false };
}

/** Ligas de la navegación del sitio (las anclas del menú) para la columna "Navegación". */
export function navDe(html = '') {
  const nav = html.match(/<nav[^>]*id="menu-sitio"[^>]*>([\s\S]*?)<\/nav>/) || html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/);
  if (!nav) return [];
  const out = []; const vistos = new Set();
  for (const m of nav[1].matchAll(/<a[^>]*href="#([\w-]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const t = limpio(m[2].replace(/<[^>]+>/g, ''));
    if (t && !vistos.has(m[1])) { vistos.add(m[1]); out.push([m[1], t]); }
  }
  return out.slice(0, 9);
}

/** Primer logo del sitio (para no depender de cómo lo arme cada opción). */
const logoDe = (html = '') => {
  const m = html.match(/<img[^>]*class="[^"]*\blogo\b[^"]*"[^>]*>/);
  if (!m) return '';
  const src = (m[0].match(/\ssrc="([^"]+)"/) || [])[1];
  return src ? src : '';
};

export const CSS_PIE = `.pie-std{background:color-mix(in srgb,var(--fg,#111) 5%,var(--bg,#fff));color:var(--fg,#1a1a1a);font-family:var(--fc,inherit);border-top:1px solid color-mix(in srgb,var(--fg,#111) 12%,transparent);padding:clamp(48px,7vw,80px) 0 28px;margin-top:0}
.pie-std *{box-sizing:border-box}.pie-std .ps-w{width:min(1200px,100% - 40px);margin:0 auto}
.pie-std .ps-g{display:grid;gap:36px 40px;grid-template-columns:minmax(0,1.3fr) repeat(3,minmax(0,1fr))}
@media(max-width:980px){.pie-std .ps-g{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.pie-std .ps-g{grid-template-columns:1fr}}
.pie-std h2{font-family:var(--fc,inherit);font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin:0 0 14px;opacity:.7}
.pie-std .ps-logo{display:block;max-width:220px;max-height:64px;width:auto;height:auto;margin:0 0 14px}
.pie-std .ps-nombre{font-family:var(--ft,inherit);font-size:22px;margin:0 0 8px}
.pie-std p{margin:0 0 10px;line-height:1.55;font-size:15px}.pie-std ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.pie-std a{color:inherit;text-decoration:none;font-size:15px;line-height:1.4}.pie-std a:hover,.pie-std a:focus-visible{text-decoration:underline;text-underline-offset:3px}
.pie-std .ps-dato{display:grid;gap:2px;margin:0 0 12px}.pie-std .ps-dato b{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.6}
.pie-std .ps-btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;border:1px solid currentColor;font-size:14px;font-weight:600;margin-top:6px;text-decoration:none!important}
.pie-std .ps-btn:hover{background:var(--p,#111);border-color:var(--p,#111);color:var(--on,#fff)}
.pie-std .rs{margin-top:16px}
.pie-std .ps-mapa{margin-top:40px;border-radius:14px;overflow:hidden;border:1px solid color-mix(in srgb,var(--fg,#111) 12%,transparent)}
.pie-std .ps-mapa iframe{display:block;border:0;width:100%;height:clamp(240px,32vw,340px)}
.pie-std .ps-zona{font-size:13px;opacity:.7;margin:10px 0 0}
.pie-std .ps-base{display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between;align-items:center;border-top:1px solid color-mix(in srgb,var(--fg,#111) 12%,transparent);margin-top:36px;padding-top:20px;font-size:13px;opacity:.85}
.pie-std .ps-base a{font-size:13px}.pie-std button.ps-cookies{background:none;border:0;padding:0;color:inherit;font:inherit;font-size:15px;cursor:pointer;text-align:left}
.pie-std button.ps-cookies:hover{text-decoration:underline;text-underline-offset:3px}`;

/** HTML del pie. */
export function pieHTML(brief = {}, { html = '', base = '', medicion = null, anio = new Date().getFullYear() } = {}) {
  const n = brief.negocio || {};
  const c = brief.contacto || {};
  const nombre = limpio(n.nombre) || 'Nuestro negocio';
  const raiz = `${base}/`;
  const wa = String(c.whatsapp || '').replace(/\D/g, '');
  const tel = String(c.telefono || '').replace(/[^\d+]/g, '');
  const telVer = (x) => { const d = String(x).replace(/\D/g, '').replace(/^52(1)?/, ''); return d.length === 10 ? `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}` : x; };
  const dir = direccionTexto(brief);
  const zona = zonaTexto(brief);
  const hor = horariosTexto(c.horarios);
  const mapa = consultaMapa(brief);
  const comoLlegar = c.google_maps_url || (dir ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([nombre, dir].join(', '))}` : '');
  const logo = logoDe(html);
  const lema = limpio(brief.oferta?.diferenciador || brief.negocio?.descripcion || '');
  const nav = navDe(html);
  const rs = enlacesRedes(redes(c));
  const dato = (t, v) => (v ? `<p class="ps-dato"><b>${esc(t)}</b>${v}</p>` : '');
  const cookiesCfg = medicionActiva(medicion);
  const col1 = `<div>${logo ? `<a href="${esc(raiz)}" aria-label="${esc(nombre)}, inicio"><img class="ps-logo" src="${esc(logo)}" alt="${esc(nombre)}" loading="lazy" decoding="async"></a>` : `<p class="ps-nombre">${esc(nombre)}</p>`}${lema ? `<p>${esc(lema.length > 160 ? `${lema.slice(0, 157)}…` : lema)}</p>` : ''}${rs ? `<div class="rs" aria-label="Redes sociales">${rs}</div>` : ''}</div>`;
  const col2 = nav.length ? `<nav aria-label="Navegación del pie"><h2>Navegación</h2><ul><li><a href="${esc(raiz)}">Inicio</a></li>${nav.map(([id, t]) => `<li><a href="${esc(`${raiz}#${id}`)}">${esc(t)}</a></li>`).join('')}</ul></nav>` : '';
  const col3 = `<div><h2>Contacto</h2>${dato('WhatsApp', wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(telVer(wa))}</a>` : '')}${dato('Teléfono', tel && tel.replace(/\D/g, '') !== wa.replace(/^521?/, '') ? `<a href="tel:${esc(tel)}">${esc(telVer(tel))}</a>` : '')}${dato('Correo', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '')}${dato(dir ? 'Dirección' : 'Zona de servicio', esc(dir || zona))}${dato('Horario', esc(hor))}${comoLlegar ? `<a class="ps-btn" href="${esc(comoLlegar)}" target="_blank" rel="noopener">Cómo llegar</a>` : ''}</div>`;
  const legales = LEGALES.map(([r, t]) => `<li><a href="${esc(`${base}/${r}`)}">${esc(t)}</a></li>`);
  legales.splice(1, 0, `<li><a href="${esc(`${base}/aviso-de-privacidad#arco`)}">Derechos ARCO</a></li>`);
  const col4 = `<nav aria-label="Información legal"><h2>Legal</h2><ul>${legales.join('')}${cookiesCfg ? '<li><button type="button" class="ps-cookies" onclick="window.__cookies&&window.__cookies(true)">Configurar cookies</button></li>' : ''}</ul></nav>`;
  const iframe = mapa ? `<div class="ps-mapa"><iframe title="${esc(mapa.exacta ? `Mapa: cómo llegar a ${nombre}` : `Mapa de la zona donde trabaja ${nombre}`)}" src="https://www.google.com/maps?q=${encodeURIComponent(mapa.q)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>${mapa.exacta ? '' : `<p class="ps-zona">${esc(zona ? `Atendemos en ${zona}.` : '')}</p>`}` : '';
  return `<footer class="pie-std" role="contentinfo"><style>${CSS_PIE}</style><div class="ps-w"><div class="ps-g">${col1}${col2}${col3}${col4}</div>${iframe}<div class="ps-base"><span>© ${anio} ${esc(nombre)}. Todos los derechos reservados.</span><span><a href="${esc(`${base}/aviso-de-privacidad`)}">Privacidad</a> · <a href="${esc(`${base}/terminos-y-condiciones`)}">Términos</a> · <a href="${esc(`${base}/politica-de-cookies`)}">Cookies</a></span></div></div></footer>`;
}

/** Reemplaza el pie de la opción de diseño por el estándar (o lo agrega antes de </body> si no tenía). */
export function conPieCompleto(html, brief, opts = {}) {
  const pie = pieHTML(brief, { ...opts, html });
  const fin = html.lastIndexOf('</footer>');
  if (fin >= 0) {
    const ini = html.lastIndexOf('<footer', fin);
    if (ini >= 0) return html.slice(0, ini) + pie + html.slice(fin + '</footer>'.length);
  }
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + pie : html.slice(0, i) + pie + html.slice(i);
}
