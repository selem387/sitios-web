// Celular y contacto (9-nov-2026), sobre el HTML final de propuestas y sitio en vivo:
//  - Menú en celular: botón ☰ (44 px, aria-expanded) que abre las ligas de la barra; antes en ≤760 px el menú desaparecía.
//  - Teléfono: renglón "Teléfono" con liga tel:+52… en Contacto y, si no hay WhatsApp, el botón flotante llama.
//  - Cómo llegar: liga a Google Maps (la del cliente o una búsqueda con su dirección) en Contacto.
import { direccionTexto, mapaHTML } from './datos_brief.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function telefonoE164(t) {
  const d = String(t || '').replace(/\D/g, '');
  if (d.length === 10) return `+52${d}`;
  if (d.length === 12 && d.startsWith('52')) return `+${d}`;
  if (d.length === 13 && d.startsWith('521')) return `+52${d.slice(3)}`;
  return d.length >= 8 ? `+${d}` : '';
}
const bonito = (e164) => { const d = e164.replace(/^\+52/, ''); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : e164; };

const CSS = `<style id="movil">
.menu-btn{display:none;width:44px;height:44px;border:0;background:transparent;color:inherit;border-radius:12px;align-items:center;justify-content:center;cursor:pointer}
.menu-btn svg{width:24px;height:24px}.menu-btn:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media (max-width:760px){
 .menu-btn{display:inline-flex}
 .barra{position:sticky}
 .barra.abierto nav{display:flex!important;position:absolute;left:0;right:0;top:100%;flex-direction:column;gap:0;padding:8px 20px 16px;background:var(--bg,#fff);color:var(--fg,inherit);border-bottom:1px solid var(--bor,rgba(0,0,0,.12));box-shadow:0 12px 24px rgba(0,0,0,.08)}
 .barra.abierto nav a{padding:14px 4px;font-size:17px;border-bottom:1px solid var(--bor,rgba(0,0,0,.08))}
 .barra.abierto nav a:last-child{border-bottom:0}
}
@media (prefers-reduced-motion:no-preference){.barra.abierto nav{animation:menuIn .18s ease-out}@keyframes menuIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}}
</style>`;
const JS = `<script>(function(){var h=document.querySelector('header.barra'),b=h&&h.querySelector('.menu-btn');if(!b)return;
function pon(v){h.classList.toggle('abierto',v);b.setAttribute('aria-expanded',v?'true':'false');b.setAttribute('aria-label',v?'Cerrar menú':'Abrir menú')}
b.addEventListener('click',function(){pon(!h.classList.contains('abierto'))});
h.addEventListener('click',function(e){if(e.target.closest('nav a'))pon(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&h.classList.contains('abierto')){pon(false);b.focus()}});})();</script>`;
const TEL_ICONO = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
const ICONO = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

/** Botón de menú para celular junto a la barra (solo si la barra tiene ligas). */
export function conMenuMovil(html) {
  if (html.includes('class="menu-btn"')) return html;
  const re = /(<header class="barra"[^>]*>[\s\S]*?)(<nav\b)([^>]*>)([\s\S]*?<\/nav>)/;
  const m = html.match(re);
  if (!m || !/<a\b/.test(m[4])) return html;
  const out = html.replace(re, (t, antes, nav, resto, cuerpo) => `${antes}<button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu-sitio" aria-label="Abrir menú">${ICONO}</button>${nav} id="menu-sitio"${resto}${cuerpo}`);
  const i = out.lastIndexOf('</body>');
  const conJs = i < 0 ? out + JS : out.slice(0, i) + JS + out.slice(i);
  return conJs.replace('</head>', () => `${CSS}</head>`);
}

/** Teléfono y "Cómo llegar" en Contacto; si no hay WhatsApp, el botón flotante llama. */
export function conContacto(html, brief = {}) {
  const c = brief.contacto || {};
  const tel = telefonoE164(c.telefono);
  const dir = direccionTexto(brief);
  const maps = c.google_maps_url && /^https:\/\//.test(c.google_maps_url) ? c.google_maps_url
    : dir ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([dir, brief.negocio?.nombre].filter(Boolean).join(' '))}` : '';
  let extra = '';
  if (tel && !html.includes(`href="tel:${tel}"`)) extra += `<p><b>Teléfono</b><a href="tel:${tel}">${esc(bonito(tel))}</a></p>`;
  if (maps && !html.includes('class="como-llegar"')) extra += `<p><b>Cómo llegar</b><a class="como-llegar" href="${esc(maps)}" target="_blank" rel="noopener">Abrir en Google Maps</a></p>`;
  // La dirección siempre se ve en Contacto (12-nov-2026): si la plantilla no la pintó, se agrega aquí.
  if (dir && !/<b>Dónde<\/b>/.test((html.match(/<section[^>]*id="contacto"[\s\S]*?<\/section>/) || [''])[0])) extra = `<p><b>Dónde</b>${esc(dir)}</p>` + extra;
  let out = extra ? html.replace(/(<section[^>]*id="contacto"[^>]*>[\s\S]*?<div class="(?:datos|vis)">)/, (m) => m + extra) : html;
  // Mapa de Google con la dirección, al final de Contacto (pedido de Sebastián).
  const mapa = dir && !out.includes('class="mapa"') ? mapaHTML(brief) : '';
  if (mapa) out = out.replace(/(<section[^>]*id="contacto"[^>]*>[\s\S]*?)(<\/section>)/, (m, a, b) => `${a}${mapa}${b}`);
  // Sin WhatsApp: el botón flotante se vuelve "Llamar" (antes quedaba sin liga o mandaba a #contacto).
  if (!c.whatsapp && tel) {
    out = out.replace(/<a class="wa"([^>]*)>[\s\S]*?<\/a>/, (m, at) => `<a class="wa"${at.replace(/\shref="[^"]*"/, '').replace(/\saria-label="[^"]*"/, '')} href="tel:${tel}" aria-label="Llamar">${TEL_ICONO}</a>`);
  }
  return out;
}
