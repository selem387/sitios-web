// Aviso de privacidad del sitio en vivo (LFPDPPP publicada en el DOF el 20-mar-2025).
// Plantilla fija revisada + bloques por giro + datos reales del negocio. No lo redacta la IA: es texto legal.
// Varía por giro en: datos que se recaban (salud = sensibles; patrimoniales; menores), finalidades y transferencias.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const limpio = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const SALUD = ['medica', 'dental', 'estetica_spa'];
function giro(brief) {
  const a = brief.negocio?.arquetipo || 'generico';
  const s = brief.negocio?.subtipo_resuelto || brief.negocio?.subtipo || '';
  return { a, s };
}

function domicilio(brief) {
  const d = brief.contacto?.direccion;
  const n = brief.negocio || {};
  if (typeof d === 'string' && d.trim()) return limpio(d);
  if (d && typeof d === 'object') {
    const t = [d.calle, d.colonia, d.cp && `C.P. ${d.cp}`, d.ciudad || n.ciudad, d.estado || n.estado].filter(Boolean).join(', ');
    if (t) return t;
  }
  return [n.ciudad, n.estado, 'México'].filter(Boolean).join(', ');
}

/** Bloques que cambian según el giro. */
function porGiro({ a, s }) {
  const g = { datos: [], sensibles: null, finalidades: [], transferencias: [] };
  if (a === 'clinica' && SALUD.includes(s)) {
    g.datos.push('datos de tu historial clínico y estado de salud que nos compartas para atenderte');
    g.sensibles = 'Tus datos de salud son datos personales sensibles. Solo los tratamos con tu consentimiento expreso y por escrito, que te pedimos en la consulta, y los guardamos con medidas de seguridad reforzadas. Por favor no nos envíes información de salud por este sitio ni por redes sociales.';
    g.finalidades.push('agendar, confirmar o cambiar tus citas', 'darte la atención o el tratamiento que solicitas y su seguimiento', 'cumplir las obligaciones del expediente clínico que marca la ley');
    g.transferencias.push('laboratorios, gabinetes o especialistas a quienes te refiramos, solo cuando sea necesario para tu atención y con tu consentimiento', 'aseguradoras, únicamente si tú nos lo pides para un reembolso');
  } else if (a === 'clinica' && s === 'veterinaria') {
    g.datos.push('los datos de tu mascota y de su historial');
    g.finalidades.push('agendar las citas de tu mascota y darle la atención que solicitas', 'avisarte de vacunas y revisiones');
  } else if (a === 'inmobiliaria') {
    g.datos.push('datos de identificación oficial, patrimoniales y financieros cuando se vaya a realizar una operación (compra, venta o renta)');
    g.finalidades.push('informarte sobre las propiedades que te interesan y agendar visitas', 'integrar el expediente y dar seguimiento a la operación inmobiliaria que solicites', 'verificar tu identidad y cumplir con las obligaciones legales de la operación');
    g.transferencias.push('notarías públicas, instituciones de crédito y avalúo, y la contraparte de la operación (propietario, comprador o arrendatario), solo en lo necesario para concretarla');
  } else if (a === 'restaurante') {
    g.finalidades.push('tomar y confirmar tus pedidos o reservaciones', 'entregarte tu pedido cuando lo solicites a domicilio');
  } else if (a === 'educacion') {
    g.datos.push('datos del alumno y, si es menor de edad, de su madre, padre o tutor');
    g.sensibles = 'Si el alumno es menor de edad, sus datos solo los tratamos con el consentimiento de su madre, padre o tutor.';
    g.finalidades.push('darte informes e inscribirte en nuestros cursos o programas', 'darte seguimiento académico y emitir constancias o certificados');
  } else if (a === 'turismo') {
    g.finalidades.push('tomar y confirmar tus reservaciones', 'coordinar los servicios turísticos que contrates');
    g.transferencias.push('prestadores de servicios turísticos que intervengan en tu reservación (hospedaje, transporte o guías), solo en lo necesario para darte el servicio');
  } else if (a === 'servicios' && ['legal', 'contador_consultor', 'servicio_b2b'].includes(s)) {
    g.datos.push('datos patrimoniales, fiscales o de tu asunto que sean necesarios para prestarte el servicio');
    g.finalidades.push('cotizarte y prestarte los servicios profesionales que nos solicites', 'cumplir las obligaciones legales y fiscales relacionadas con el servicio');
    g.transferencias.push('autoridades fiscales, judiciales o administrativas cuando sea necesario para atender tu asunto y tú lo hayas solicitado');
  } else if (a === 'tienda') {
    g.finalidades.push('atender y entregarte tus pedidos', 'atender cambios, devoluciones y garantías');
  } else {
    g.finalidades.push('cotizarte y prestarte los servicios que solicites');
  }
  return g;
}

function herramientas(m) {
  const fuentes = 'Para mostrar los tipos de letra se cargan desde Google Fonts, por lo que Google puede recibir datos técnicos de tu conexión (como tu dirección IP).';
  const usa = [m?.ga4 && 'Google Analytics, para saber cuántas personas visitan la página y qué secciones les interesan', m?.pixel && 'el Pixel de Meta (Facebook e Instagram), para medir los resultados de nuestros anuncios y mostrar publicidad a quien ya nos visitó'].filter(Boolean);
  if (!usa.length) return `<p>Esta página no usa cookies para rastrearte. ${fuentes} Si en el futuro usamos herramientas de medición o publicidad, lo indicaremos aquí.</p>`;
  return `<p>Esta página usa cookies y tecnologías similares de terceros: ${usa.map(esc).join('; y ')}. Registran datos de navegación como páginas vistas, clics en los botones de contacto, tipo de dispositivo y una dirección IP aproximada; no recaban tu nombre ni tu teléfono. Puedes desactivarlas o borrarlas desde la configuración de tu navegador, y administrar tus preferencias de anuncios en Google y en Meta. ${fuentes}</p>`;
}

/** HTML del aviso (dentro de <main>). */
export function avisoPrivacidad(brief = {}, { actualizado = new Date(), medicion = null } = {}) {
  const n = brief.negocio || {};
  const c = brief.contacto || {};
  const nombre = limpio(n.nombre) || 'Este negocio';
  const titular = limpio(brief.confianza?.fundador?.nombre);
  const medio = c.email ? `al correo <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : (c.whatsapp || c.telefono) ? `por WhatsApp o teléfono al ${esc(c.whatsapp || c.telefono)}` : 'por los medios de contacto de esta página';
  const g = porGiro(giro(brief));
  const datos = ['nombre', 'teléfono o WhatsApp', 'correo electrónico', 'el contenido de los mensajes que nos envías', ...g.datos];
  const finalidades = ['responder tus mensajes y solicitudes de información', ...g.finalidades];
  const fecha = new Date(actualizado).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const li = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return `<style>.aviso{max-width:68ch;margin:0 auto;padding:clamp(88px,12vw,128px) clamp(20px,5vw,32px) 72px;line-height:1.65}
.aviso h1{font-size:clamp(2rem,7vw,3rem);line-height:1.1;margin:0 0 .6em}.aviso h2{font-size:clamp(1.25rem,4.2vw,1.6rem);line-height:1.2;margin:2.2em 0 .6em}
.aviso p{margin:0 0 1em}.aviso ul{margin:0 0 1.2em;padding-left:1.3em}.aviso li{margin:.3em 0}.aviso li::marker{color:var(--p,currentColor)}.aviso a{color:inherit}</style>
<section class="aviso">
<h1>Aviso de privacidad</h1>
<p><strong>${esc(nombre)}</strong>${titular ? ` (${esc(titular)})` : ''}, con domicilio en ${esc(domicilio(brief))}, es responsable del tratamiento de los datos personales que nos compartes por esta página, WhatsApp, teléfono, correo, redes sociales o en persona, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>
<h2>Datos que recabamos</h2>${li(datos)}
${g.sensibles ? `<p>${esc(g.sensibles)}</p>` : ''}
<h2>Para qué los usamos</h2>
<p>Finalidades necesarias para atenderte (no requieren tu consentimiento porque son indispensables para la relación que nos solicitas):</p>${li(finalidades)}
<p>Finalidad adicional, que requiere tu consentimiento: enviarte promociones, novedades o encuestas de satisfacción. Si no lo deseas, escríbenos ${medio} con la palabra <em>NO PROMOCIONES</em> y dejaremos de enviártelas, sin que eso afecte la atención que te damos.</p>
<h2>Con quién los compartimos</h2>
${g.transferencias.length ? `<p>Solo compartimos tus datos con:</p>${li(g.transferencias)}` : ''}
<p>${g.transferencias.length ? 'Fuera de esos casos, no' : 'No'} vendemos ni compartimos tus datos con terceros, salvo cuando lo exija una autoridad o la ley. Quien los reciba asume las mismas obligaciones que nosotros.</p>
<h2>Tus derechos (ARCO) y cómo revocar tu consentimiento</h2>
<p>Puedes pedirnos acceder a tus datos, corregirlos, cancelarlos u oponerte a su uso, así como revocar tu consentimiento o limitar su uso, escribiéndonos ${medio}. Indica tu nombre, lo que solicitas y un medio para responderte; te contestaremos en los plazos que marca la ley. Si consideras que no atendimos tu solicitud, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno.</p>
<h2>Cookies y tecnologías de esta página</h2>
${herramientas(medicion)}
<h2>Cambios a este aviso</h2>
<p>Cualquier cambio lo publicaremos en esta misma página. Última actualización: ${esc(fecha)}.</p>
</section>`;
}

/** Página completa: usa el encabezado, letras, colores y pie del sitio; solo cambia el contenido. */
export function paginaAviso(htmlSitio, brief, { base = '', url = '', medicion = null } = {}) {
  return htmlSitio
    .replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, '')
    .replace(/<link rel="canonical"[^>]*>/, '')
    .replace(/<main([^>]*)>[\s\S]*<\/main>/, (m, at) => `<main${at}>${avisoPrivacidad(brief, { medicion })}</main>`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>Aviso de privacidad · ${esc(brief.negocio?.nombre || '')}</title>`)
    .replace('</head>', () => `${url ? `<link rel="canonical" href="${esc(url)}">` : ''}<meta name="description" content="Aviso de privacidad de ${esc(brief.negocio?.nombre || '')}: qué datos recabamos, para qué y cómo ejercer tus derechos."></head>`)
    .replace(/(<nav[\s\S]*?<\/nav>)/, (nav) => nav.replace(/href="#/g, `href="${base}/#`));
}

/** Liga al aviso en el pie del sitio. */
export function conLigaAviso(html, href) {
  const i = html.lastIndexOf('</footer>');
  if (i < 0 || html.includes('class="liga-aviso"')) return html;
  return `${html.slice(0, i)} · <a class="liga-aviso" href="${esc(href)}" style="color:inherit">Aviso de privacidad</a>${html.slice(i)}`;
}
