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

/** Inserta el código de medición al final del body (nunca en vista previa). */
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
if(document.readyState==='complete')despues();else addEventListener('load',despues);
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'',m=/wa\\.me|whatsapp/i.test(h)?'whatsapp':/^tel:/i.test(h)?'llamada':/^mailto:/i.test(h)?'correo':'';if(!m)return;carga();
 if(G)gtag('event','generate_lead',{method:m,link_url:h.slice(0,100)});if(P)fbq('track','Contact',{method:m});},true);})();</script>`;
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + js : html.slice(0, i) + js + html.slice(i);
}
