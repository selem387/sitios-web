// Medición del sitio en vivo (9-nov-2026): GA4 y Meta Pixel, los pone el equipo (no el dueño) con
// PUT /entrevista/v1/sitios-vivos/:id/medicion {ga4?, pixel?}. Se guardan en sitios_vivos.medicion.
// Carga diferida (después de load + primera interacción o 3.5 s) para no afectar la velocidad.
// Conversión: cada clic a WhatsApp o a llamar → GA4 'generate_lead' y Pixel 'Contact' (con método).
export const RE_GA4 = /^G-[A-Z0-9]{4,15}$/;
export const RE_PIXEL = /^\d{10,20}$/;

export function limpiarMedicion(m = {}) {
  const ga4 = String(m.ga4 || '').trim().toUpperCase();
  const pixel = String(m.pixel || '').trim();
  if (ga4 && !RE_GA4.test(ga4)) throw new Error('ga4 debe verse como G-XXXXXXX');
  if (pixel && !RE_PIXEL.test(pixel)) throw new Error('pixel debe ser solo números (10 a 20)');
  return { ...(ga4 ? { ga4 } : {}), ...(pixel ? { pixel } : {}) };
}

export const medicionActiva = (m) => !!(m && (RE_GA4.test(m.ga4 || '') || RE_PIXEL.test(m.pixel || '')));

/** Inserta el código de medición al final del body (nunca en vista previa). Desde el 26-nov-2026 solo carga GA4 y el
 * Pixel si el visitante acepta en el aviso de cookies (se guarda en localStorage; "Configurar cookies" del pie lo reabre). */
export function conMedicion(html, m) {
  if (!medicionActiva(m)) return html;
  const ga4 = RE_GA4.test(m.ga4 || '') ? m.ga4 : '';
  const pixel = RE_PIXEL.test(m.pixel || '') ? m.pixel : '';
  const js = `<script>(function(){var G=${JSON.stringify(ga4)},P=${JSON.stringify(pixel)},listo=0;
window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};
if(P&&!window.fbq){var n=window.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];window._fbq=n;}
function carga(){if(listo)return;listo=1;
 if(G){var s=document.createElement('script');s.async=1;s.src='https://www.googletagmanager.com/gtag/js?id='+G;document.head.appendChild(s);gtag('js',new Date());gtag('config',G);}
 if(P){var f=document.createElement('script');f.async=1;f.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(f);fbq('init',P);fbq('track','PageView');}}
function despues(){['pointerdown','keydown','scroll','touchstart'].forEach(function(e){addEventListener(e,carga,{once:true,passive:true})});setTimeout(carga,3500);}
var K='cookies_ok',dec=null;try{dec=localStorage.getItem(K)}catch(e){}
function guardar(v){try{localStorage.setItem(K,v)}catch(e){}var b=document.getElementById('aviso-cookies');if(b)b.remove();if(v==='si'){if(document.readyState==='complete')despues();else addEventListener('load',despues);}}
window.__cookies=function(abrir){if(document.getElementById('aviso-cookies'))return;var b=document.createElement('div');b.id='aviso-cookies';b.setAttribute('role','dialog');b.setAttribute('aria-label','Aviso de cookies');
b.innerHTML='<p>Usamos cookies de medición y publicidad para mejorar esta página y nuestros anuncios, solo si nos das permiso. <a href="'+(window.__baseLegal||'')+'/politica-de-cookies">Saber más</a></p><div><button type="button" data-v="no">Rechazar</button><button type="button" data-v="si">Aceptar</button></div>';
b.addEventListener('click',function(e){var v=e.target&&e.target.getAttribute&&e.target.getAttribute('data-v');if(v)guardar(v)});document.body.appendChild(b);var y=b.querySelector('[data-v="si"]');if(abrir&&y)y.focus();};
if(dec==='si'){if(document.readyState==='complete')despues();else addEventListener('load',despues);}else if(dec!=='no'){if(document.readyState==='loading')addEventListener('DOMContentLoaded',function(){window.__cookies()});else window.__cookies();}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'',m=/wa\\.me|whatsapp/i.test(h)?'whatsapp':/^tel:/i.test(h)?'llamada':/^mailto:/i.test(h)?'correo':'';if(!m)return;carga();
 if(!listo)return;if(G)gtag('event','generate_lead',{method:m,link_url:h.slice(0,100)});if(P)fbq('track','Contact',{method:m});},true);})();</script>`;
  const css = `<style>#aviso-cookies{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;justify-content:space-between;padding:16px 18px;border-radius:14px;background:#141414;color:#fff;font:15px/1.45 var(--fc,system-ui,sans-serif);box-shadow:0 12px 40px rgba(0,0,0,.25)}#aviso-cookies p{margin:0;flex:1 1 260px}#aviso-cookies a{color:inherit;text-decoration:underline}#aviso-cookies div{display:flex;gap:8px}#aviso-cookies button{min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid #fff;background:transparent;color:#fff;font:600 14px/1 var(--fc,system-ui,sans-serif);cursor:pointer}#aviso-cookies button[data-v="si"]{background:#fff;color:#141414}</style>`;
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + css + js : html.slice(0, i) + css + js + html.slice(i);
}
