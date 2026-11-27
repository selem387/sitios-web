// Páginas legales estándar de los sitios en vivo (26-nov-2026): términos y condiciones, política de cookies y mapa
// del sitio. Igual que el aviso de privacidad (aviso.js): plantilla fija con los datos reales del negocio, nunca
// redactada por la IA, y servida con el encabezado, letras, colores y pie del propio sitio.
import { medicionActiva } from './medicion.js';
import { navDe, LEGALES } from './pie.js';
import { direccionTexto } from '../generador/datos_brief.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const limpio = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const fechaMx = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

export const CSS_LEGAL = `<style>.aviso{max-width:68ch;margin:0 auto;padding:clamp(88px,12vw,128px) clamp(20px,5vw,32px) 72px;line-height:1.65}
.aviso h1{font-size:clamp(2rem,7vw,3rem)!important;line-height:1.1!important;margin:0 0 .6em!important}.aviso h2{font-size:clamp(1.25rem,4.2vw,1.6rem)!important;line-height:1.2!important;margin:2.2em 0 .6em!important;text-transform:none!important;letter-spacing:0!important;max-width:none!important}.aviso p,.aviso li{max-width:none!important}
.aviso p{margin:0 0 1em}.aviso ul{margin:0 0 1.2em;padding-left:1.3em}.aviso li{margin:.3em 0}.aviso li::marker{color:var(--p,currentColor)}.aviso a{color:inherit}
.aviso table{border-collapse:collapse;width:100%;margin:0 0 1.2em;font-size:.95em}.aviso th,.aviso td{border:1px solid color-mix(in srgb,currentColor 20%,transparent);padding:8px 10px;text-align:left;vertical-align:top}</style>`;

function quien(brief) {
  const n = brief.negocio || {};
  const c = brief.contacto || {};
  const nombre = limpio(n.nombre) || 'Este negocio';
  const titular = limpio(brief.confianza?.fundador?.nombre);
  const dom = direccionTexto(brief) || [...new Set([n.ciudad, n.estado, 'México'].filter(Boolean).map(limpio))].join(', ');
  const medio = c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : (c.whatsapp || c.telefono) ? `WhatsApp o teléfono ${esc(c.whatsapp || c.telefono)}` : 'los medios de contacto de esta página';
  return { nombre, titular, dom, medio, estado: limpio(n.estado) || limpio(n.ciudad) };
}

/** Términos y condiciones de uso del sitio (negocios de servicios, comercio o atención al público en México). */
export function terminos(brief = {}, { actualizado = new Date(), base = '' } = {}) {
  const q = quien(brief);
  const venta = ['tienda', 'restaurante'].includes(brief.negocio?.arquetipo);
  return `${CSS_LEGAL}<section class="aviso">
<h1>Términos y condiciones</h1>
<p>Estos términos regulan el uso de esta página de <strong>${esc(q.nombre)}</strong>${q.titular ? ` (${esc(q.titular)})` : ''}, con domicilio en ${esc(q.dom)}. Al navegar en ella aceptas estos términos; si no estás de acuerdo, te pedimos no usarla.</p>
<h2>Uso de la página</h2>
<p>Esta página es informativa: te muestra quiénes somos, lo que ofrecemos y cómo contactarnos. Puedes consultarla y compartirla libremente para fines personales. No está permitido usarla para fines ilícitos, intentar dañar su funcionamiento ni copiar su contenido para uso comercial sin nuestra autorización.</p>
<h2>Productos, servicios y precios</h2>
<p>La información de productos, servicios, paquetes, promociones y precios es de referencia y puede cambiar sin previo aviso. ${venta ? 'La disponibilidad, el precio final y las condiciones de entrega se confirman al momento de tu pedido.' : 'El alcance, el precio final y las condiciones de cada servicio se confirman por escrito (cotización, propuesta o contrato) antes de contratarlo.'} Las promociones aplican en las fechas y condiciones que se indiquen.</p>
<h2>Contrataciones y pagos</h2>
<p>Cuando contrates o compres con nosotros, la relación se rige por lo que acordemos por escrito y por la Ley Federal de Protección al Consumidor cuando seas consumidor final. Los precios se expresan en pesos mexicanos e incluyen impuestos, salvo que se indique otra cosa. Si tienes una queja que no podamos resolver, puedes acudir a la Procuraduría Federal del Consumidor (Profeco).</p>
<h2>Propiedad intelectual</h2>
<p>La marca, el logotipo, los textos, las fotografías y el diseño de esta página pertenecen a ${esc(q.nombre)} o se usan con autorización de sus titulares. Las fotografías de ejemplo, cuando las hay, son ilustrativas.</p>
<h2>Ligas a otros sitios</h2>
<p>Esta página tiene ligas a WhatsApp, redes sociales, mapas y otros servicios de terceros. No somos responsables de su contenido ni de sus políticas de privacidad; te recomendamos revisarlas.</p>
<h2>Responsabilidad</h2>
<p>Procuramos que la información sea correcta y esté actualizada, pero puede contener errores o cambiar. No garantizamos que la página esté disponible todo el tiempo ni libre de fallas técnicas.</p>
<h2>Datos personales</h2>
<p>El tratamiento de los datos que nos compartes se explica en nuestro <a href="${esc(`${base}/aviso-de-privacidad`)}">aviso de privacidad</a>.</p>
<h2>Ley aplicable</h2>
<p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales competentes${q.estado ? ` de ${esc(q.estado)}` : ''}, salvo lo que disponga la ley a favor del consumidor.</p>
<h2>Contacto</h2>
<p>Para cualquier duda sobre estos términos, escríbenos a ${q.medio}.</p>
<p>Última actualización: ${esc(fechaMx(actualizado))}.</p>
</section>`;
}

/** Política de cookies: qué se carga en la página y cómo decidir. */
export function politicaCookies(brief = {}, { actualizado = new Date(), medicion = null, base = '' } = {}) {
  const q = quien(brief);
  const m = medicionActiva(medicion) ? medicion : null;
  const filas = [
    ['Necesarias', 'Guardan tu decisión sobre cookies y el funcionamiento básico de la página (por ejemplo, el menú y los formularios).', 'Esta página', 'Siempre activas'],
    ['Servicios incrustados', 'Mapa de Google, videos de YouTube o Vimeo y tipos de letra de Google Fonts. Estos proveedores pueden recibir datos técnicos de tu conexión, como tu dirección IP, al mostrarse.', 'Google, YouTube o Vimeo', 'Al cargar ese contenido'],
    ...(m?.ga4 ? [['Medición', 'Google Analytics nos dice cuántas personas visitan la página y qué secciones les interesan, sin identificarte por tu nombre.', 'Google', 'Solo si las aceptas']] : []),
    ...(m?.pixel ? [['Publicidad', 'El Pixel de Meta mide los resultados de nuestros anuncios en Facebook e Instagram.', 'Meta', 'Solo si las aceptas']] : []),
  ];
  return `${CSS_LEGAL}<section class="aviso">
<h1>Política de cookies</h1>
<p>Las cookies son pequeños archivos que una página guarda en tu navegador. Aquí te explicamos cuáles usa la página de <strong>${esc(q.nombre)}</strong> y cómo puedes decidir.</p>
<h2>Cookies y tecnologías que usamos</h2>
<table><thead><tr><th>Tipo</th><th>Para qué sirve</th><th>De quién</th><th>Cuándo</th></tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>
${m ? '<p>Las cookies de medición y publicidad solo se activan si las aceptas en el aviso que aparece al entrar. Puedes cambiar tu decisión cuando quieras con el botón <em>Configurar cookies</em> del pie de la página.</p>' : '<p>Esta página no usa cookies para rastrearte ni para publicidad. Si en el futuro las usamos, te pediremos tu permiso antes y lo indicaremos aquí.</p>'}
<h2>Cómo bloquearlas o borrarlas</h2>
<p>También puedes bloquear o borrar las cookies desde la configuración de tu navegador (Chrome, Safari, Firefox o Edge). Si bloqueas todas, algunas partes de la página, como el mapa o los videos, podrían no mostrarse.</p>
<h2>Tus datos</h2>
<p>Lo que hacemos con tus datos personales está en nuestro <a href="${esc(`${base}/aviso-de-privacidad`)}">aviso de privacidad</a>. Si tienes dudas, escríbenos a ${q.medio}.</p>
<p>Última actualización: ${esc(fechaMx(actualizado))}.</p>
</section>`;
}

/** Mapa del sitio en HTML (para personas; el de buscadores es /sitemap.xml). */
export function mapaDelSitio(brief = {}, { html = '', base = '', propiedades = [] } = {}) {
  const raiz = `${base}/`;
  const nav = navDe(html);
  return `${CSS_LEGAL}<section class="aviso">
<h1>Mapa del sitio</h1>
<h2>Secciones</h2>
<ul><li><a href="${esc(raiz)}">Inicio</a></li>${nav.map(([id, t]) => `<li><a href="${esc(`${raiz}#${id}`)}">${esc(t)}</a></li>`).join('')}</ul>
${propiedades.length ? `<h2>Propiedades</h2><ul>${propiedades.map((p) => `<li><a href="${esc(`${base}/propiedad/${p.slug}`)}">${esc(p.titulo || p.slug)}</a></li>`).join('')}</ul>` : ''}
<h2>Información legal</h2>
<ul>${LEGALES.filter(([r]) => r !== 'mapa-del-sitio').map(([r, t]) => `<li><a href="${esc(`${base}/${r}`)}">${esc(t)}</a></li>`).join('')}</ul>
</section>`;
}

/** Página completa con el encabezado, letras, colores y pie del sitio; solo cambia el contenido de <main>. */
export function paginaLegal(htmlSitio, brief, { titulo, descripcion, cuerpo, base = '', url = '' }) {
  const nombre = esc(brief.negocio?.nombre || '');
  return htmlSitio
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, '')
    .replace(/<link rel="canonical"[^>]*>/, '')
    .replace(/<main([^>]*)>[\s\S]*<\/main>/, (m, at) => `<main${at}>${cuerpo}</main>`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${esc(titulo)} · ${nombre}</title>`)
    .replace('</head>', () => `${url ? `<link rel="canonical" href="${esc(url)}">` : ''}<meta name="description" content="${esc(descripcion)}"></head>`)
    .replace(/(<nav[\s\S]*?<\/nav>)/, (nav) => nav.replace(/href="#/g, `href="${base}/#`));
}
