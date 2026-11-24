// Fotos siempre en movimiento (decisión de Sebastián, 24-nov-2026): en todas las propuestas y sitios, ninguna foto queda
// estática. Cada foto lleva un movimiento lento y continuo de buenas prácticas (zoom de acercamiento o alejamiento, o un
// desplazamiento lateral o vertical con un leve acercamiento), estilo Ken Burns:
// - Se usan las propiedades `scale` y `translate` (no `transform`), así se suman a los efectos propios de cada opción
//   (GSAP, parallax) sin pisarlos.
// - La foto se recorta a su marco: si su contenedor no recorta, se le pone overflow:clip solo cuando el contenedor mide lo
//   mismo que la foto; si no hay marco seguro, esa foto no se mueve (antes que salirse de su lugar).
// - No se tocan logos, íconos ni fotos chicas, ni las que la opción ya anima.
// - Solo se mueve lo que está en pantalla (IntersectionObserver). Con "reducir movimiento" del sistema, quietas.
// Se inyecta al servir la página (/p/<token>/<letra> y el sitio en vivo), así aplica también a lo ya generado.

const ID = 'fotos-mov';

const CSS = `@keyframes fm-zin{from{scale:1}to{scale:1.1}}
@keyframes fm-zout{from{scale:1.1}to{scale:1}}
@keyframes fm-izq{from{scale:1.12;translate:3% 0}to{scale:1.12;translate:-3% 0}}
@keyframes fm-der{from{scale:1.12;translate:-3% 0}to{scale:1.12;translate:3% 0}}
@keyframes fm-sube{from{scale:1.12;translate:0 2.5%}to{scale:1.12;translate:0 -2.5%}}
img.fm{animation:var(--fm,fm-zin) var(--fmd,18s) ease-in-out infinite alternate;animation-play-state:paused;transform-origin:50% 50%}
img.fm.fm-on{animation-play-state:running}
@media (prefers-reduced-motion:reduce){img.fm{animation:none}}`;

const JS = `(function(){if(window.__fotosMov)return;window.__fotosMov=1;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var VAR=['fm-izq','fm-zout','fm-der','fm-sube','fm-zin'],k=0;
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('fm-on',e.isIntersecting)})},{rootMargin:'80px'}):null;
function recorta(el){var o=getComputedStyle(el);return /(hidden|clip)/.test(o.overflow+o.overflowX+o.overflowY)}
function marco(img){var r=img.getBoundingClientRect();
 var pos=getComputedStyle(img).position;
 var a=img.parentElement;if(a&&a.tagName==='PICTURE')a=a.parentElement;
 if(pos==='absolute'||pos==='fixed'){for(var i=0,p=a;p&&i<5;i++,p=p.parentElement){if(recorta(p))return p}return null}
 for(var j=0,q=a;q&&j<3;j++,q=q.parentElement){if(recorta(q)){var b=q.getBoundingClientRect();if(b.width<=r.width+4&&b.height<=r.height+4)return q}}
 if(!a)return null;var c=a.getBoundingClientRect();
 if(Math.abs(c.width-r.width)<4&&Math.abs(c.height-r.height)<4&&getComputedStyle(a).display!=='inline'){a.style.overflow='clip';return a}
 var ci=getComputedStyle(img),ca=getComputedStyle(a);
 var anchoA=c.width-parseFloat(ca.paddingLeft)-parseFloat(ca.paddingRight)-parseFloat(ca.borderLeftWidth)-parseFloat(ca.borderRightWidth);
 if(pos==='static'&&Math.abs(r.width-anchoA)<4&&(ci.display==='block'||/grid|flex/.test(ca.display))){
  var w=document.createElement('span');w.className='fm-marco';
  w.style.cssText='display:block;overflow:clip;border-radius:'+ci.borderRadius+';margin:'+ci.margin+';';
  a.insertBefore(w,img.parentElement&&img.parentElement.tagName==='PICTURE'?img.parentElement:img);
  w.appendChild(img.parentElement&&img.parentElement.tagName==='PICTURE'?img.parentElement:img);img.style.margin='0';img.style.display='block';return w}
 return null}
function salta(img){if(img.dataset.fm)return true;var r=img.getBoundingClientRect();
 if(r.width<140||r.height<100)return true;
 var t=((img.className&&img.className.baseVal!==undefined?img.className.baseVal:img.className)+' '+(img.alt||'')+' '+(img.getAttribute('src')||'')).toLowerCase();
 if(/logo|icono|icon|avatar|sello|monograma|qr/.test(t))return true;
 if(img.closest('header nav,.etq,.wa,[aria-hidden="true"] .logo'))return true;
 var cs=getComputedStyle(img);if(cs.animationName&&cs.animationName!=='none')return true;
 return false}
function run(){Array.prototype.forEach.call(document.images,function(img){if(salta(img))return;var m=marco(img);img.dataset.fm='1';if(!m)return;
 var r=img.getBoundingClientRect();var v=r.width>innerWidth*.6?(k%2?'fm-zout':'fm-zin'):VAR[k%VAR.length];k++;
 img.style.setProperty('--fm',v);img.style.setProperty('--fmd',(16+(k%4)*2)+'s');img.classList.add('fm');if(io)io.observe(img);else img.classList.add('fm-on')})}
function go(){run();setTimeout(run,1500);setTimeout(run,4000)}
if(document.readyState==='complete')go();else addEventListener('load',go);})();`;

/** Agrega el movimiento de fotos a una página (una sola vez). */
export function conFotosEnMovimiento(html) {
  const h = String(html || '');
  if (!h || h.includes(`id="${ID}"`)) return h;
  const bloque = `<style id="${ID}">${CSS}</style><script id="${ID}-js">${JS}</script>`;
  return h.includes('</body>') ? h.replace(/<\/body>(?![\s\S]*<\/body>)/, `${bloque}</body>`) : h + bloque;
}
