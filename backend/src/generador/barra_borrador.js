// REGLA DURA (14-nov-2026): en TODAS las opciones de diseño, arriba va una barra negra con texto blanco que avisa que es
// una muestra borrador hecha solo con los datos básicos de la empresa y que se puede mejorar sin costo, con tres botones:
// "Me gusta con cambios" · "Me gusta como está" · "No me gusta". Si la persona intenta salir de la página, se abre una
// ventana emergente con el mismo texto y las mismas tres opciones.
//
// Se inyecta al SERVIR la opción (no se guarda en el HTML), así aplica a todas las plantillas, actuales y futuras:
//   chat/index.js (/p/<token>/<letra>), generador/dominios.js (dominio del cliente /a…/p), prospectos/rutas.js (/p/<folio>/<n>).
// No se muestra dentro de iframes (vistas previas del selector) ni en navegadores automatizados (revisión visual).
//
// conBarraBorrador(html, { acciones: { cambios, tal, no }, modo: 'post' | 'ir', volver?: { url, texto } })
//   modo 'post': POST a la URL y muestra el mensaje que regresa ({ mensaje, ir? }).
//   modo 'ir'  : navega a la URL (p. ej. /w/<folio>/<n>?r=… que abre WhatsApp).

export const TEXTO_BORRADOR = 'Esta es una muestra borrador: solo tomamos los datos básicos de tu empresa. Podemos mejorarla sin costo.';
export const REACCIONES = {
  cambios: 'Me gusta con cambios',
  tal: 'Me gusta como está',
  no: 'No me gusta',
};

const CSS = `
#tw-borrador,#tw-borrador *,#tw-salida,#tw-salida *{box-sizing:border-box!important;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important;letter-spacing:normal!important;text-transform:none!important}
#tw-borrador{position:relative!important;z-index:2147483000!important;background:#000!important;color:#fff!important;padding:12px 16px!important;margin:0!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:center!important;gap:10px 18px!important;text-align:center!important;width:100%!important}
#tw-borrador p,#tw-salida p{margin:0!important;color:#fff!important;font-size:15px!important;line-height:1.4!important;font-weight:500!important;max-width:640px}
#tw-borrador .tw-acc,#tw-salida .tw-acc{display:flex!important;flex-wrap:wrap!important;gap:8px!important;justify-content:center!important}
#tw-borrador button,#tw-salida button,#tw-borrador a.tw-volver{appearance:none!important;cursor:pointer!important;min-height:40px!important;padding:8px 16px!important;border-radius:999px!important;font-size:14px!important;font-weight:700!important;line-height:1.2!important;border:1.5px solid #fff!important;background:transparent!important;color:#fff!important;text-decoration:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;transition:background .2s,color .2s,transform .2s!important;box-shadow:none!important}
#tw-borrador button:hover,#tw-salida button:hover{background:#fff!important;color:#000!important;transform:translateY(-1px)!important}
#tw-borrador button.tw-si,#tw-salida button.tw-si{background:#fff!important;color:#000!important}
#tw-borrador button:focus-visible,#tw-salida button:focus-visible,#tw-borrador a.tw-volver:focus-visible{outline:3px solid #fff!important;outline-offset:3px!important}
#tw-borrador a.tw-volver{border-color:transparent!important;text-decoration:underline!important;padding:8px 6px!important}
#tw-borrador .tw-ok,#tw-salida .tw-ok{font-weight:700!important}
#tw-salida{position:fixed!important;inset:0!important;z-index:2147483600!important;background:rgba(0,0,0,.6)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;opacity:0;transition:opacity .25s!important}
#tw-salida.tw-ver{opacity:1}
#tw-salida .tw-caja{background:#000!important;color:#fff!important;border-radius:18px!important;padding:28px 22px 22px!important;max-width:460px!important;width:100%!important;text-align:center!important;position:relative!important;box-shadow:0 20px 60px rgba(0,0,0,.5)!important;display:flex!important;flex-direction:column!important;gap:18px!important}
#tw-salida .tw-caja p{font-size:17px!important}
#tw-salida .tw-acc{flex-direction:column!important}
#tw-salida .tw-acc button{width:100%!important;min-height:46px!important;font-size:15px!important}
#tw-salida .tw-x{position:absolute!important;top:8px!important;right:8px!important;min-height:36px!important;width:36px!important;padding:0!important;border:0!important;font-size:22px!important}
@media (max-width:640px){#tw-borrador p{font-size:13.5px!important}#tw-borrador button{font-size:13px!important;padding:7px 12px!important;min-height:38px!important}}
@media (prefers-reduced-motion:reduce){#tw-borrador button,#tw-salida{transition:none!important}}`;

function script(cfg) {
  const datos = JSON.stringify(cfg).replace(/</g, '\\u003c');
  return `<script>(function(){
var C=${datos};
try{if(window.self!==window.top)return}catch(e){return}
if(navigator.webdriver||/[?&]vista=1(&|$)/.test(location.search))return;
var CLAVE='tw_reaccion_'+location.pathname;
function ya(){try{return sessionStorage.getItem(CLAVE)}catch(e){return null}}
function marcar(r){try{sessionStorage.setItem(CLAVE,r)}catch(e){}}
function el(t,a,h){var n=document.createElement(t);for(var k in a)n.setAttribute(k,a[k]);if(h!=null)n.textContent=h;return n}
function botones(cont){var acc=el('div',{'class':'tw-acc'});['cambios','tal','no'].forEach(function(k){var b=el('button',{type:'button','data-r':k,'class':k==='tal'?'tw-si':''},C.textos[k]);b.addEventListener('click',function(){reaccionar(k,cont)});acc.appendChild(b)});return acc}
function aviso(cont,txt){var acc=cont.querySelector('.tw-acc');if(acc)acc.remove();var p=cont.querySelector('.tw-ok');if(!p){p=el('p',{'class':'tw-ok',role:'status'});cont.appendChild(p)}p.textContent=txt}
var ocupado=false;
function reaccionar(k,cont){if(ocupado)return;ocupado=true;marcar(k);var url=C.acciones[k];
 if(C.modo==='ir'){location.href=url;return}
 aviso(cont,'Enviando…');
 fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(function(r){return r.json()}).then(function(d){
  var m=(d&&d.mensaje)||'¡Gracias! Ya recibimos tu respuesta.';aviso(barra,m);var s=document.getElementById('tw-salida');if(s)aviso(s.querySelector('.tw-caja'),m);
  if(d&&d.ir)setTimeout(function(){location.href=d.ir},900)
 }).catch(function(){ocupado=false;aviso(cont,'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.');setTimeout(function(){var p=cont.querySelector('.tw-ok');if(p)p.remove();cont.appendChild(botones(cont))},2500)})}
var est=el('style',{},C.css);document.head.appendChild(est);
var barra=el('div',{id:'tw-borrador',role:'region','aria-label':'Muestra borrador'});
barra.appendChild(el('p',{},C.texto));
if(ya()){barra.appendChild(el('p',{'class':'tw-ok'},'¡Gracias! Ya recibimos tu respuesta.'))}else barra.appendChild(botones(barra));
if(C.volver){var v=el('a',{href:C.volver.url,'class':'tw-volver'},C.volver.texto);barra.appendChild(v)}
document.body.insertBefore(barra,document.body.firstChild);
// Encabezados fijos arriba (position:fixed;top:0) se recorren para no tapar la barra mientras se ve.
var fijos=[];function medirFijos(){fijos=[];var all=document.body.querySelectorAll('header,nav,[class*="nav"],[class*="header"],[class*="barra"],[class*="top"]');for(var i=0;i<all.length;i++){var n=all[i];if(barra.contains(n))continue;var cs=getComputedStyle(n);if(cs.position==='fixed'&&parseFloat(cs.top||'0')<=1)fijos.push(n)}}
function recorrer(){var h=Math.max(0,barra.offsetHeight-window.scrollY);for(var i=0;i<fijos.length;i++)fijos[i].style.setProperty('top',h+'px','important')}
medirFijos();recorrer();addEventListener('scroll',recorrer,{passive:true});addEventListener('resize',function(){medirFijos();recorrer()});addEventListener('load',function(){medirFijos();recorrer()});
// Ventana emergente al intentar salir (una vez por visita, y no si ya respondió).
var mostrada=false;
function abrir(){if(mostrada||ya())return false;mostrada=true;var s=el('div',{id:'tw-salida',role:'dialog','aria-modal':'true','aria-label':'Muestra borrador'});var caja=el('div',{'class':'tw-caja'});
 var x=el('button',{type:'button','class':'tw-x','aria-label':'Cerrar'},'×');x.addEventListener('click',cerrar);caja.appendChild(x);
 caja.appendChild(el('p',{},C.texto));caja.appendChild(botones(caja));s.appendChild(caja);
 s.addEventListener('click',function(e){if(e.target===s)cerrar()});document.body.appendChild(s);requestAnimationFrame(function(){s.classList.add('tw-ver')});
 var f=caja.querySelector('.tw-acc button');if(f)f.focus();return true}
function cerrar(){var s=document.getElementById('tw-salida');if(s)s.remove()}
addEventListener('keydown',function(e){if(e.key==='Escape')cerrar()});
// Escritorio: el mouse sale por arriba de la ventana (hacia pestañas/barra de direcciones).
document.addEventListener('mouseout',function(e){if(!e.relatedTarget&&e.clientY<=0)abrir()});
// Celular y botón "atrás": se intercepta el primer regreso.
try{history.pushState({tw:1},'',location.href)}catch(e){}
addEventListener('popstate',function(){if(abrir()){try{history.pushState({tw:1},'',location.href)}catch(e){}}else{history.back()}});
// Celular: cambia de app o de pestaña sin responder → se muestra al volver.
var oculto=false;document.addEventListener('visibilitychange',function(){if(document.hidden)oculto=true;else if(oculto)abrir()});
})();</script>`;
}

/** Inyecta la barra borrador y la ventana de salida en el HTML de una opción. */
export function conBarraBorrador(html, { acciones, modo = 'post', volver = null } = {}) {
  if (!acciones || /id="tw-borrador"|tw_reaccion_/.test(html)) return html;
  const cfg = { texto: TEXTO_BORRADOR, textos: REACCIONES, acciones, modo, volver, css: CSS.trim() };
  // Solo ASCII (\uXXXX) para que los acentos se vean bien aunque la página no declare UTF-8.
  const s = script(cfg).replace(/[\u0080-\uffff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${s}</body>`) : html + s;
}

/** Texto que se le pasa a Ari como mensaje del cliente al reaccionar a una opción. */
export function textoReaccion(r, nombreOpcion) {
  const o = `la opción ${nombreOpcion}`;
  if (r === 'tal') return `Me gusta ${o} como está.`;
  if (r === 'cambios') return `Me gusta ${o}, pero con cambios.`;
  return `No me gusta ${o}.`;
}
