// Opción Q "Vitrina" (14-nov-2026, reconstruida desde cero por pedido de Sebastián). Única referencia: www.dvf.com
// (Diane von Furstenberg). No toma nada de las otras plantillas: barra, portada, secciones, pie, letra y CSS son propios.
//
// Estructura de la referencia (medida el 14-nov-2026 a 1440 px y 390 px):
// 1. Barra blanca de 76 px: menú (hamburguesa) a la izquierda, logo al centro, íconos a la derecha.
// 2. Portada a todo lo ancho (en la referencia es video) con una línea de texto abajo a la izquierda y un enlace subrayado.
// 3. "Best Sellers": título grande a la izquierda y carrusel de tarjetas de producto a la derecha (fondo gris claro,
//    nombre, precio y un enlace gris debajo; flechas en cuadros blancos sobre las fotos).
// 4. Bloques partidos 50/50: foto grande de un lado y, del otro, título + "Shop now" + carrusel de esa categoría;
//    el siguiente bloque va al revés.
// 5. Banda de dos fotos lado a lado (video en la referencia) con el nombre de una categoría y un enlace.
// 6. Pie: foto de fondo a todo lo ancho y encima una tarjeta blanca con el logo grande, una frase entre comillas,
//    suscripción (aquí: mensaje por WhatsApp), acordeones y enlaces legales.
// Letra: Jost (geométrica sin remates), negro sobre blanco, sin colores de acento. Los textos chicos de la referencia
// (14 px) van a 20 px por el piso de letra del proyecto (conPisoTexto); las tarjetas son más anchas para que quepan.
//
// Técnica: la referencia usa Shopify + videos MP4 + carruseles con script. Aquí: CSS nativo (scroll-snap, fundido y
// acercamiento lento de fotos en lugar de video) y un script mínimo para las flechas. Sin librerías. Solo opacity y
// transform se animan. Con "reducir movimiento" nada se mueve y se ve la primera foto.
// Si el cliente mandó video, la portada usa su video (como la referencia).
//
// REGLA DURA del proyecto: todo el material del cliente aparece. Las fotos se reparten por producto (por el nombre de
// cada foto y de cada producto de su oferta); las que no encajan van al primer carrusel. Las que se repiten a propósito
// (portada, carrusel inicial, foto grande de cada bloque, foto alterna al pasar el mouse) llevan rep-ok.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const VACIAS = new Set(['para', 'como', 'con', 'del', 'los', 'las', 'una', 'unos', 'unas', 'que', 'por', 'sus', 'directa', 'directo', 'estilo', 'tipo', 'servicio', 'servicios', 'producto', 'productos', 'todo', 'todos']);

export const LETRA_Q = { titulos: 'Jost', cuerpo: 'Jost', ui: 'Jost', estilo: 'moderno' };
export const URL_FUENTES_Q = 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap';
export const T_PORTADA = 7; // segundos por foto en la portada
export const FADE_PORTADA = 1.4;
export const MAX_PORTADA = 4;
export const MAX_INICIAL = 8;
export const MAX_CATEGORIAS = 3;

/** Raíces de las palabras de un nombre (5 letras), la primera pesa más. */
export function raices(nombre) {
  return norm(nombre).split(' ').filter((w) => w.length >= 4 && !VACIAS.has(w)).map((w) => w.slice(0, 5));
}

/**
 * Reparte las fotos entre los productos de la oferta por su nombre. Devuelve
 * { grupos: [{item, fotos}], sueltas: [fotos sin producto], sinFoto: [items sin fotos] }.
 */
export function repartirPorProducto(fotos = [], items = []) {
  const lista = (items || []).map((x) => (typeof x === 'string' ? { nombre: x } : x)).filter((x) => x?.nombre);
  const claves = lista.map((it) => raices(it.nombre));
  const grupos = lista.map((item) => ({ item, fotos: [] }));
  const sueltas = [];
  for (const f of fotos) {
    const texto = ` ${norm(`${f.nombre || ''} ${f.alt || ''}`)} `;
    const palabras = texto.split(' ').filter(Boolean).map((w) => w.slice(0, 5));
    let mejor = -1, puntos = 0;
    claves.forEach((ks, k) => {
      const p = ks.reduce((s, r, j) => s + (palabras.includes(r) ? (j === 0 ? 3 : 1) : 0), 0);
      if (p > puntos) { puntos = p; mejor = k; }
    });
    if (mejor >= 0) grupos[mejor].fotos.push(f); else sueltas.push(f);
  }
  return { grupos: grupos.filter((g) => g.fotos.length), sueltas, sinFoto: grupos.filter((g) => !g.fotos.length).map((g) => g.item) };
}

/** Intercala las fotos de varios grupos (una de cada uno, por turnos). */
export function intercalar(listas = [], max = Infinity) {
  const out = [];
  const largo = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < largo && out.length < max; i++) for (const l of listas) if (l[i] && out.length < max) out.push(l[i]);
  return out;
}

/** Fotos de ambiente (con personas o de trabajo) primero: son las que van grandes. */
const ambiente = (fotos) => [...fotos].sort((a, b) => (b.personas ? 2 : 0) + (b.tipo === 'foto_trabajo' ? 1 : 0) - ((a.personas ? 2 : 0) + (a.tipo === 'foto_trabajo' ? 1 : 0)));

/** Fotogramas del fundido de la portada para n fotos (nombre sin puntos: es un identificador CSS). */
export function cssFundido(n, T = T_PORTADA, F = FADE_PORTADA) {
  if (n < 2) return '';
  const tot = n * T, f = +((F / tot) * 100).toFixed(3), s = +((T / tot) * 100).toFixed(3);
  const capas = Array.from({ length: n }, (_, k) => `.vq-hero .vq-capa:nth-child(${k + 1}){animation:vq-f${n} ${tot}s linear ${k === 0 ? -F : k * T - F}s infinite both}`).join('');
  return `@keyframes vq-f${n}{0%{opacity:0}${f}%{opacity:1}${+(s + f).toFixed(3)}%{opacity:1}${+(s + 2 * f).toFixed(3)}%{opacity:0}100%{opacity:0}}${capas}`;
}

const ICONOS = {
  menu: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 19.5l1.3-3.8A8 8 0 1 1 8.4 18.9L4 19.5Z" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/></svg>',
  flecha: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  flechaIzq: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  baja: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 9l7 7 7-7" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  wa: '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.3c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.3Z"/></svg>',
};

/** Teléfono del enlace de WhatsApp (para armar mensajes por producto y el formulario del pie). */
export function telDeWa(wa) {
  if (!wa) return '';
  try { const u = new URL(wa); return (u.pathname.match(/\d{8,}/) || [u.searchParams.get('phone') || ''])[0] || ''; } catch { return ''; }
}

const waTexto = (tel, texto) => (tel ? `https://api.whatsapp.com/send/?phone=${tel}&text=${encodeURIComponent(texto)}&type=phone_number&app_absent=0` : '');

/**
 * Página completa de la opción Q.
 * d: { letra, nombre, brief, mat, t, titulos, wa, tel, redes: [[nombre, url]], direccion }
 */
export function paginaVitrina(d) {
  const { brief, mat, t } = d;
  const T = d.titulos || {};
  const neg = brief.negocio || {}, conf = brief.confianza || {}, c = brief.contacto || {};
  const tel = telDeWa(d.wa);
  const wa = d.wa ? ` href="${esc(d.wa)}" target="_blank" rel="noopener"` : ' href="#pie"';
  const usadas = new Set();
  const img = (x, { cls = '', eager = false, rep = false, sizes = '' } = {}) => {
    usadas.add(x.url);
    const clase = [cls, rep ? 'rep-ok' : ''].filter(Boolean).join(' ');
    return `<img${clase ? ` class="${clase}"` : ''} src="${esc(x.url)}" alt="${esc(x.alt || '')}" loading="${eager ? 'eager' : 'lazy'}"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}${sizes}${eager ? ' fetchpriority="high"' : ''}>`;
  };
  const nombreDe = (x) => String(x.nombre || (x.alt || '').split(/[,.;]/)[0] || '').trim();
  const waFoto = (x) => {
    const n = nombreDe(x);
    const u = n && tel ? waTexto(tel, `Hola, me interesa ${x.articulo || 'el'} ${n.toLowerCase()}. ¿Me das más información?`) : '';
    return u ? ` href="${esc(u)}" target="_blank" rel="noopener"` : wa;
  };
  const waItem = (it) => {
    const u = tel ? waTexto(tel, `Hola, me interesa saber más de ${String(it.nombre).toLowerCase()}.`) : '';
    return u ? ` href="${esc(u)}" target="_blank" rel="noopener"` : wa;
  };

  // --- Material ---
  const ubic = brief.fotos?.ubicacion || {};
  const buena = (x) => x?.url && !x.captura && x.calidad !== 'regular' && /^(foto|imagen)/.test(x.tipo || 'foto');
  const productos = [...mat.trabajos, ...mat.local, ...(mat.otras || [])].filter((x) => x?.url).filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k);
  const buenas = productos.filter(buena);
  const flojas = productos.filter((x) => !buena(x)); // capturas o regulares: nunca grandes, van al final del primer carrusel
  const items = (brief.oferta?.items || []).map((x) => (typeof x === 'string' ? { nombre: x } : x)).filter((x) => x?.nombre);
  const mostrarPrecios = brief.oferta?.mostrar_precios !== false && brief.mostrar_precios !== false;
  const precioDe = (it) => (mostrarPrecios ? String(it?.precio_o_rango || it?.precio || '').trim() : '');
  const { grupos, sueltas, sinFoto } = repartirPorProducto(buenas, items);
  // Categorías con bloque propio: las que tienen al menos 2 fotos, destacadas primero.
  const cats = [...grupos].filter((g) => g.fotos.length >= 2).sort((a, b) => (b.item.destacado ? 1 : 0) - (a.item.destacado ? 1 : 0) || b.fotos.length - a.fotos.length).slice(0, MAX_CATEGORIAS);
  const enCats = new Set(cats.flatMap((g) => g.fotos.map((x) => x.url)));
  const restoGrupos = grupos.filter((g) => !cats.includes(g)); // productos con 1 foto: su foto va al carrusel inicial
  const deGrupo = new Map(grupos.flatMap((g) => g.fotos.map((x) => [x.url, g.item])));

  // Portada: la foto que eligió la IA de textos para el titular (o la de portada del cliente), luego las de ambiente.
  const porUrl = new Map([mat.hero, ...buenas].filter((x) => x?.url).map((x) => [x.url, x]));
  const fijas = Object.entries(ubic).filter(([, v]) => v === 'portada').map(([k]) => [mat.hero, ...buenas].find((x) => x?.clave === k)).filter(Boolean);
  const primera = (brief.fotos?.portada_manual && mat.hero) || porUrl.get(t.foto_url) || (buena(mat.hero) ? mat.hero : null) || ambiente(buenas)[0] || null;
  const portada = [primera, ...fijas, ...ambiente(buenas)].filter((x) => x?.url).filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k).slice(0, MAX_PORTADA);
  const video = (mat.videos || []).find((v) => v?.url);

  // --- Barra y menú ---
  const logo = mat.logo?.url
    ? `<img class="vq-logo" src="${esc(mat.logo.url)}" alt="${esc(d.nombre)}"${mat.logo.ancho ? ` width="${mat.logo.ancho}" height="${mat.logo.alto}"` : ''}>`
    : `<span class="vq-nombre">${esc(d.nombre)}</span>`;
  const secciones = []; // [id, etiqueta] en el orden de la página (para el menú y los enlaces del pie)

  // --- Portada ---
  const linea = t.titular || d.nombre;
  const promo = String(brief.oferta?.promocion_actual || '').trim();
  const fondoHero = video
    ? (() => { usadas.add(video.url); return `<video class="vq-video" src="${esc(video.url)}" autoplay muted loop playsinline preload="metadata"${portada[0] ? ` poster="${esc(portada[0].url)}"` : ''}></video>`; })()
    : portada.map((x, k) => `<div class="vq-capa">${img(x, { cls: 'vq-hf', eager: k === 0, rep: true, sizes: ' sizes="100vw"' })}</div>`).join('');
  const hero = `<section class="vq-hero${portada.length || video ? '' : ' vq-sin'}" id="inicio" aria-label="${esc(d.nombre)}"><div class="vq-fondo">${fondoHero}</div><div class="vq-hero-txt">${promo ? `<p class="vq-promo">${esc(promo)}</p>` : ''}<h1>${esc(linea)}</h1>${t.subtitulo ? `<p class="vq-hsub">${esc(t.subtitulo)}</p>` : ''}<a class="vq-link"${wa}>${esc(t.cta || 'Escríbenos por WhatsApp')}</a></div></section>`;

  // --- Tarjeta de producto (como la referencia: foto con vista alterna al pasar el mouse, nombre, precio, enlace gris) ---
  const tarjeta = (x, alterna, { rep = false } = {}) => {
    const it = deGrupo.get(x.url);
    const pr = precioDe(it);
    const alt2 = alterna && alterna.url !== x.url ? img(alterna, { cls: 'vq-alt', rep: true }) : '';
    return `<li class="vq-card"><a class="vq-foto${alt2 ? ' con-alt' : ''}"${waFoto(x)}>${img(x, { cls: x.captura ? 'vq-cap' : '', rep })}${alt2}</a><p class="vq-cn">${esc(nombreDe(x) || it?.nombre || d.nombre)}</p>${pr ? `<p class="vq-pr">${esc(pr)}</p>` : ''}<a class="vq-mas"${waFoto(x)}>Pedir informes</a></li>`;
  };
  const carrusel = (fotos, etiqueta, opts = {}) => `<div class="vq-car"><button type="button" class="vq-fl vq-ant" aria-label="Anteriores" hidden>${ICONOS.flechaIzq}</button><ul class="vq-pista" tabindex="0" aria-label="${esc(etiqueta)}">${fotos.map((x, k) => tarjeta(x, fotos[(k + 1) % fotos.length], opts)).join('')}</ul><button type="button" class="vq-fl vq-sig" aria-label="Siguientes">${ICONOS.flecha}</button></div>`;

  // --- 1. Carrusel inicial ("Best Sellers"): una foto de cada producto por turnos, más las que no tienen producto ---
  const inicialRep = intercalar(cats.map((g) => g.fotos), MAX_INICIAL);
  const propiasIni = [...restoGrupos.flatMap((g) => g.fotos), ...sueltas, ...(cats.length ? [] : buenas.filter((x) => !enCats.has(x.url))), ...flojas]
    .filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k && !inicialRep.some((y) => y.url === x.url));
  let secInicial = '';
  if (inicialRep.length || propiasIni.length) {
    const tit = T.trabajo || 'Lo más pedido';
    const lista = [...inicialRep, ...propiasIni];
    const html = lista.map((x, k) => tarjeta(x, lista[(k + 1) % lista.length], { rep: k < inicialRep.length })).join('');
    secInicial = `<section class="vq-fila" id="trabajo"><div class="vq-fila-cab"><h2>${esc(tit)}</h2><a class="vq-link"${wa}>Pregunta por WhatsApp</a></div><div class="vq-car"><button type="button" class="vq-fl vq-ant" aria-label="Anteriores" hidden>${ICONOS.flechaIzq}</button><ul class="vq-pista" tabindex="0" aria-label="${esc(tit)}">${html}</ul><button type="button" class="vq-fl vq-sig" aria-label="Siguientes">${ICONOS.flecha}</button></div></section>`;
    secciones.push(['trabajo', tit]);
  }

  // --- 2. Bloques partidos por producto (foto grande + título + carrusel), uno a cada lado ---
  const grandes = new Set(portada.map((x) => x.url));
  const secCats = cats.map((g, k) => {
    const id = `cat-${k + 1}`;
    const grande = ambiente(g.fotos).find((x) => !grandes.has(x.url)) || ambiente(g.fotos)[0];
    grandes.add(grande.url);
    const desc = String(g.item.descripcion_corta || g.item.descripcion || '').trim();
    const pr = precioDe(g.item);
    secciones.push([id, g.item.nombre]);
    return `<section class="vq-partida${k % 2 ? ' vq-reves' : ''}" id="${id}"><figure class="vq-grande">${img(grande, { rep: true, sizes: ' sizes="(min-width:900px) 50vw, 100vw"' })}</figure><div class="vq-lado"><div class="vq-lado-cab"><div><h2>${esc(g.item.nombre)}</h2>${desc || pr ? `<p class="vq-desc">${esc([desc, pr].filter(Boolean).join(' · '))}</p>` : ''}</div><a class="vq-link"${waItem(g.item)}>Pedir por WhatsApp</a></div>${carrusel([...g.fotos.filter((x) => x.url !== grande.url), grande], g.item.nombre)}</div></section>`;
  }).join('');

  // --- 3. Banda de dos fotos (en la referencia, video) con lo que vende y no tiene foto, o su diferenciador ---
  const libres = ambiente(buenas).filter((x) => !grandes.has(x.url));
  const parBanda = (libres.length >= 2 ? libres : ambiente(buenas)).slice(0, 2);
  // Frase corta sin cortar palabras: la oración completa si cabe; si no, las cláusulas (hasta una coma) que quepan.
  const corto = (s, max) => {
    const x = String(s || '').trim().replace(/\s+/g, ' ');
    if (x.length <= max) return x;
    const or = x.split(/(?<=[.!?])\s/)[0];
    if (or.length <= max) return or;
    let out = '';
    for (const cl of or.split(/,\s*/)) { const n = out ? `${out}, ${cl}` : cl; if (n.length > max) break; out = n; }
    return out.length >= 20 ? out : '';
  };
  const sinFotoTxt = sinFoto.length ? sinFoto.slice(0, 3).map((x) => x.nombre).join(sinFoto.length === 2 ? ' y ' : ' · ') : '';
  const titBanda = sinFotoTxt || corto(brief.oferta?.diferenciador, 70) || T.servicios || '';
  let secBanda = '';
  if (parBanda.length === 2 && titBanda) {
    parBanda.forEach((x) => grandes.add(x.url));
    const desc = sinFoto.length === 1 ? String(sinFoto[0].descripcion_corta || '').trim() : '';
    secBanda = `<section class="vq-banda" id="banda"><figure>${img(parBanda[0], { rep: true, sizes: ' sizes="50vw"' })}</figure><figure>${img(parBanda[1], { rep: true, sizes: ' sizes="50vw"' })}</figure><div class="vq-banda-txt"><h2>${esc(titBanda)}</h2>${desc ? `<p>${esc(desc)}</p>` : ''}<a class="vq-link"${sinFoto.length === 1 ? waItem(sinFoto[0]) : wa}>Pregunta por WhatsApp</a></div></section>`;
  }

  // --- 4. Sobre nosotros: bloque partido con su historia (su foto si la mandó) ---
  const historia = String(t.sobre || conf.historia_corta || '').trim();
  const fotoSobre = [mat.fundador, ...(mat.equipo || [])].find((x) => x?.url) || libres.find((x) => !grandes.has(x.url)) || null;
  let secSobre = '';
  if (historia) {
    if (fotoSobre) grandes.add(fotoSobre.url);
    const parrafos = historia.split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join('');
    secSobre = `<section class="vq-partida${cats.length % 2 ? ' vq-reves' : ''} vq-sobre" id="sobre">${fotoSobre ? `<figure class="vq-grande">${img(fotoSobre, { rep: true, sizes: ' sizes="(min-width:900px) 50vw, 100vw"' })}</figure>` : ''}<div class="vq-lado"><h2>${esc(T.sobre || 'Sobre nosotros')}</h2><div class="vq-texto">${parrafos}</div><a class="vq-link"${wa}>${esc(t.cta || 'Escríbenos por WhatsApp')}</a></div></section>`;
    secciones.push(['sobre', T.sobre || 'Sobre nosotros']);
  }
  // Equipo (fotos que no fueron a "Sobre nosotros"): fila de tarjetas.
  const equipo = (mat.equipo || []).filter((x) => x?.url && !usadas.has(x.url));
  const secEquipo = equipo.length ? `<section class="vq-fila" id="equipo"><div class="vq-fila-cab"><h2>Nuestro equipo</h2></div>${carrusel(equipo, 'Nuestro equipo')}</section>` : '';

  // --- 5. Reseñas (capturas) y catálogos: filas de tarjetas como la referencia ---
  const resenas = (mat.resenas || []).filter((x) => x?.url);
  const secResenas = resenas.length ? `<section class="vq-fila vq-contener" id="resenas"><div class="vq-fila-cab"><h2>${esc(T.resenas || 'Opiniones de clientes')}</h2>${conf.link_resenas ? `<a class="vq-link" href="${esc(conf.link_resenas)}" target="_blank" rel="noopener">Ver todas</a>` : ''}</div><div class="vq-car"><button type="button" class="vq-fl vq-ant" aria-label="Anteriores" hidden>${ICONOS.flechaIzq}</button><ul class="vq-pista" tabindex="0" aria-label="${esc(T.resenas || 'Opiniones')}">${resenas.map((x) => `<li class="vq-card"><span class="vq-foto">${img(x)}</span></li>`).join('')}</ul><button type="button" class="vq-fl vq-sig" aria-label="Siguientes">${ICONOS.flecha}</button></div></section>` : '';
  if (resenas.length) secciones.push(['resenas', T.resenas || 'Opiniones']);
  const catalogos = [...(mat.catalogos || []), ...(mat.menus || [])].filter((x) => x?.url);
  const docs = (mat.documentos || []).filter((x) => x?.url);
  const secCatalogo = catalogos.length || docs.length ? `<section class="vq-fila vq-contener" id="catalogo"><div class="vq-fila-cab"><h2>Catálogo</h2>${docs.map((x) => { usadas.add(x.url); return `<a class="vq-link" href="${esc(x.url)}" target="_blank" rel="noopener">Ver ${esc(/pdf/i.test(x.url) ? 'catálogo (PDF)' : x.alt || 'documento')}</a>`; }).join('')}</div>${catalogos.length ? `<ul class="vq-pista vq-sola">${catalogos.map((x) => `<li class="vq-card"><a class="vq-foto" href="${esc(x.url)}" target="_blank" rel="noopener">${img(x)}</a></li>`).join('')}</ul>` : ''}</section>` : '';

  // Material que aún no salió (regla dura): fotos de equipo/otras sin lugar, videos extra.
  const faltan = [...(mat.fotos || []).filter((x) => !x.recorte), mat.fundador].filter((x) => x?.url && /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(x.url) && !usadas.has(x.url) && x.url !== mat.logo?.url && !(mat.logos_extra || []).some((y) => y?.url === x.url))
    .filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k);
  const videosExtra = (mat.videos || []).filter((v) => v?.url && !usadas.has(v.url));
  const secMas = faltan.length || videosExtra.length ? `<section class="vq-fila" id="mas"><div class="vq-fila-cab"><h2>${esc(T.galeria || 'Galería')}</h2></div>${faltan.length ? carrusel(faltan, T.galeria || 'Galería') : ''}${videosExtra.map((v) => { usadas.add(v.url); return `<video class="vq-vid" src="${esc(v.url)}" controls playsinline preload="metadata"></video>`; }).join('')}</section>` : '';

  // --- 6. Pie como la referencia: foto de fondo, tarjeta blanca con logo grande, frase, mensaje y acordeones ---
  // Fondo del pie: una foto del cliente (en la referencia, su estampado); sus otras versiones del logo van como firmas.
  const fondoPie = libres.find((x) => !grandes.has(x.url)) || parBanda[1] || portada[0] || null;
  const marcas = (mat.logos_extra || []).filter((x) => x?.url);
  const frase = corto(brief.oferta?.diferenciador, 90) || corto(brief.diferenciador, 90) || corto(neg.descripcion_redes, 90) || '';
  const dir = d.direccion || '';
  const mapa = dir ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.nombre}, ${dir}`)}` : '';
  const horario = typeof c.horarios === 'string' ? c.horarios : '';
  const pasos = (brief.oferta?.proceso_pasos || brief.proceso_pasos || []).map((p) => String(p || '').split('\n')).filter((p) => p[0]);
  const faq = (brief.faq || []).filter((x) => x?.pregunta && x?.respuesta);
  const acordeon = (titulo, cuerpo) => (cuerpo ? `<details class="vq-acc"><summary>${esc(titulo)}${ICONOS.baja}</summary><div class="vq-acc-in">${cuerpo}</div></details>` : '');
  const visita = [dir ? `<p>${esc(dir)}</p>` : '', horario ? `<p>${esc(horario)}</p>` : '', d.tel ? `<p>WhatsApp: <a${wa}>${esc(d.tel)}</a></p>` : '', c.telefono && c.telefono !== d.tel ? `<p>Teléfono: <a href="tel:${esc(String(c.telefono).replace(/[^\d+]/g, ''))}">${esc(c.telefono)}</a></p>` : '', c.email ? `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : '', mapa ? `<p><a href="${esc(mapa)}" target="_blank" rel="noopener">Cómo llegar</a></p>` : ''].join('');
  const redesHTML = (d.redes || []).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join('');
  const pasosHTML = pasos.length ? `<ol>${pasos.map(([a, ...b]) => `<li><b>${esc(a)}</b>${b.join(' ').trim() ? ` ${esc(b.join(' ').trim())}` : ''}</li>`).join('')}</ol>` : '';
  const faqHTML = faq.map((x) => `<p><b>${esc(x.pregunta)}</b><br>${esc(x.respuesta)}</p>`).join('');
  const titCont = T.contacto || 'Contáctanos';
  secciones.push(['pie', titCont]);
  const formWa = tel
    ? `<form class="vq-msj" action="https://api.whatsapp.com/send/" method="get" target="_blank"><input type="hidden" name="phone" value="${esc(tel)}"><label class="vq-oculto" for="vq-m">Tu mensaje</label><input id="vq-m" name="text" type="text" placeholder="Tu mensaje" autocomplete="off"><button type="submit" aria-label="Enviar por WhatsApp">${ICONOS.enviar}</button></form><p class="vq-nota">Al enviar se abre WhatsApp con tu mensaje; nadie más lo ve.</p>`
    : `<a class="vq-link"${wa}>${esc(t.cta || 'Escríbenos')}</a>`;
  const pie = `<footer class="vq-pie" id="pie">${fondoPie ? `<div class="vq-pie-fondo">${img(fondoPie, { rep: true, sizes: ' sizes="100vw"' })}</div>` : ''}<div class="vq-pie-card"><div class="vq-pie-izq">${mat.logo?.url ? `<img class="vq-logo-g" src="${esc(mat.logo.url)}" alt="${esc(d.nombre)}" loading="lazy"${mat.logo.ancho ? ` width="${mat.logo.ancho}" height="${mat.logo.alto}"` : ''}>` : `<p class="vq-nombre-g">${esc(d.nombre)}</p>`}${frase ? `<p class="vq-frase">“${esc(frase.replace(/\.$/, ''))}.”</p>` : ''}${marcas.length ? `<div class="vq-marcas">${marcas.map((x) => img(x, { rep: true })).join('')}</div>` : ''}<nav class="vq-legal" aria-label="Secciones">${secciones.filter(([id]) => id !== 'pie').map(([id, n]) => `<a href="#${id}">${esc(n)}</a>`).join('')}</nav><p class="vq-copy">© ${new Date().getFullYear()} ${esc(d.nombre)} · Propuesta ${d.letra}: Vitrina</p></div><div class="vq-pie-der"><h2 class="vq-pie-t">${esc(titCont)}</h2><p class="vq-pie-p">${esc(t.servicios_cierre || 'Escríbenos y te respondemos por WhatsApp.')}</p>${formWa}${acordeon(T.sobre || 'Sobre nosotros', historia && !secSobre ? `<p>${esc(historia)}</p>` : '')}${acordeon(t.proceso || 'Cómo comprar', pasosHTML)}${acordeon(T.faq || 'Preguntas frecuentes', faqHTML)}${acordeon(t.visita || 'Visítanos', visita)}${acordeon('Síguenos', redesHTML)}${neg.ciudad ? `<p class="vq-ciudad">${ICONOS.pin}<span>${esc([neg.ciudad, neg.estado].filter((x, k, a) => x && !(k && norm(a[0]).includes(norm(x)))).join(', '))}</span></p>` : ''}</div></div></footer>`;

  const menu = `<div class="vq-menu" id="menu" role="dialog" aria-label="Menú"><a class="vq-menu-velo" href="#" aria-label="Cerrar menú" tabindex="-1"></a><nav class="vq-menu-panel"><a class="vq-menu-x" href="#" aria-label="Cerrar menú">${ICONOS.cerrar}</a>${secciones.map(([id, n]) => `<a href="#${id}">${esc(n)}${ICONOS.enviar}</a>`).join('')}<a class="vq-menu-wa"${wa}>${esc(t.cta || 'Escríbenos por WhatsApp')}</a></nav></div>`;
  const barra = `<header class="vq-barra"><div class="vq-bizq"><a class="vq-ico" href="#menu" aria-label="Abrir menú">${ICONOS.menu}</a></div><a class="vq-marca" href="#inicio">${logo}</a><div class="vq-bder">${dir || neg.ciudad ? `<a class="vq-ico" href="${mapa ? esc(mapa) : '#pie'}"${mapa ? ' target="_blank" rel="noopener"' : ''} aria-label="Ubicación">${ICONOS.pin}</a>` : ''}<a class="vq-ico"${wa} aria-label="WhatsApp">${ICONOS.chat}</a></div></header>`;

  // Material registrado que ninguna sección tomó (p. ej. una foto sin ficha en las listas): tarjeta en el primer carrusel.
  let cuerpo = `${hero}${secInicial}${secCats}${secBanda}${secSobre}${secEquipo}${secResenas}${secCatalogo}${secMas}`;
  const todo = `${cuerpo}${pie}${barra}`;
  const sinLugar = (mat.usables || []).filter((u) => u.tipo !== 'logo' && !/logo/.test(u.tipo || '') && (u.urls || []).length && !u.urls.some((x) => todo.includes(x) || todo.includes(esc(x))))
    .map((u) => ({ url: u.urls[0], alt: '', tipo: u.tipo, nombre: '' })).filter((x) => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(x.url));
  if (sinLugar.length) {
    const cards = sinLugar.map((x) => `<li class="vq-card"><span class="vq-foto">${img(x)}</span></li>`).join('');
    if (secInicial) cuerpo = cuerpo.replace(/(id="trabajo"[\s\S]*?<ul class="vq-pista"[^>]*>[\s\S]*?)(<\/ul>)/, (m, a, b) => `${a}${cards}${b}`);
    else cuerpo += `<section class="vq-fila" id="trabajo"><div class="vq-fila-cab"><h2>${esc(T.trabajo || 'Nuestro trabajo')}</h2></div><ul class="vq-pista vq-sola">${cards}</ul></section>`;
  }
  const nPortada = video ? 0 : portada.length;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(d.nombre)} · Propuesta ${d.letra}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preload" as="style" href="${URL_FUENTES_Q}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link href="${URL_FUENTES_Q}" rel="stylesheet"></noscript>
<style>${CSS_VITRINA}${cssFundido(nPortada)}</style></head>
<body class="l-vitrina">
${barra}${menu}
<main>${cuerpo}</main>
${pie}
<span class="etq">Propuesta ${d.letra}</span>
<a class="vq-wa"${wa} aria-label="Escríbenos por WhatsApp">${ICONOS.wa}</a>
${JS_VITRINA}
</body></html>`;
  return { html, usadas };
}

export const CSS_VITRINA = `
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth;scroll-padding-top:76px}
body{background:#fff;color:#000;font-family:'Jost',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;font-weight:400;-webkit-font-smoothing:antialiased}
img,video{display:block;max-width:100%}a{color:inherit}h1,h2,h3{font-weight:400;line-height:1.1}
.vq-oculto{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.vq-link{display:inline-block;font-size:20px;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px;white-space:nowrap}.vq-link:hover{text-decoration-thickness:2px}
/* barra */
.vq-barra{position:sticky;top:0;z-index:30;height:76px;background:#fff;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 48px}
.vq-bizq,.vq-bder{display:flex;align-items:center;gap:28px}.vq-bder{justify-content:flex-end}
.vq-ico{display:grid;place-items:center;width:40px;height:40px;color:#000}.vq-ico:hover{opacity:.6}
.vq-marca{display:flex;align-items:center;text-decoration:none}.vq-logo{height:46px;width:auto;max-width:220px;object-fit:contain}.vq-nombre{font-size:22px;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
/* menú (sin script: :target) */
.vq-menu{position:fixed;inset:0;z-index:50;visibility:hidden}.vq-menu:target{visibility:visible}
.vq-menu-velo{position:absolute;inset:0;background:rgba(0,0,0,.35);opacity:0;transition:opacity .3s}.vq-menu:target .vq-menu-velo{opacity:1}
.vq-menu-panel{position:absolute;left:0;top:0;bottom:0;width:min(420px,88vw);background:#fff;padding:22px 32px;display:flex;flex-direction:column;transform:translateX(-100%);transition:transform .35s ease;overflow-y:auto}.vq-menu:target .vq-menu-panel{transform:none}
.vq-menu-x{align-self:flex-start;margin:0 0 26px -8px;width:40px;height:40px;display:grid;place-items:center}
.vq-menu-panel>a:not(.vq-menu-x):not(.vq-menu-wa){display:flex;justify-content:space-between;align-items:center;font-size:20px;padding:14px 0;text-decoration:none;border-bottom:1px solid #e6e6e6}
.vq-menu-wa{margin-top:28px;font-size:16px;text-underline-offset:4px}
/* portada */
.vq-hero{position:relative;height:calc(100vh - 76px);height:calc(100svh - 76px);min-height:520px;max-height:880px;overflow:hidden;background:#e9e9e9;color:#fff}
.vq-fondo,.vq-capa{position:absolute;inset:0}.vq-capa{opacity:0}.vq-capa:first-child{opacity:1}
.vq-hf,.vq-video{width:100%;height:100%;object-fit:cover;object-position:50% 30%}
.vq-hf{animation:vq-z 16s ease-in-out infinite alternate;will-change:transform}
@keyframes vq-z{from{transform:scale(1)}to{transform:scale(1.07)}}
.vq-hero::after{content:"";position:absolute;inset:auto 0 0 0;height:60%;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.58));pointer-events:none}
.vq-hero-txt{position:absolute;left:50px;right:50px;bottom:52px;z-index:2;max-width:640px;text-shadow:0 1px 3px rgba(0,0,0,.45),0 1px 14px rgba(0,0,0,.3)}
.vq-hero h1{font-size:clamp(24px,2.1vw,30px);font-weight:400;line-height:1.25}
.vq-hsub{font-size:20px;font-weight:300;margin-top:8px;max-width:52ch;opacity:.95}
.vq-promo{display:inline-block;font-size:20px;letter-spacing:.01em;margin-bottom:12px;padding:5px 10px;background:#fff;color:#000;text-shadow:none}
.vq-hero .vq-link{margin-top:22px}
.vq-sin{background:#111}.vq-sin::after{display:none}
/* carruseles */
.vq-car{position:relative;min-width:0}
.vq-pista{list-style:none;display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none;overscroll-behavior-x:contain}.vq-pista::-webkit-scrollbar{display:none}
.vq-card{flex:0 0 calc((100% - 32px)/2.7);scroll-snap-align:start;min-width:0}
.vq-foto{position:relative;display:block;aspect-ratio:314/455;background:#efefef;overflow:hidden}
.vq-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;transition:opacity .45s ease,transform .8s ease}
.vq-foto .vq-alt{opacity:0}.vq-foto.con-alt:hover .vq-alt,.vq-foto.con-alt:focus-visible .vq-alt{opacity:1}
.vq-foto:not(.con-alt):hover img{transform:scale(1.03)}
.vq-foto .vq-cap,.vq-contener .vq-foto img{object-fit:contain;padding:10px}
.vq-cn{font-size:20px;margin:14px 16px 0;line-height:1.3}.vq-pr{font-size:20px;margin:2px 16px 0;color:#222}
.vq-mas{display:inline-block;font-size:20px;color:#6b6b6b;margin:6px 16px 0;text-decoration:none}.vq-mas:hover{color:#000;text-decoration:underline;text-underline-offset:3px}
.vq-fl{position:absolute;top:calc((100% - 90px)/2);z-index:3;width:40px;height:40px;display:grid;place-items:center;background:#fff;border:0;color:#000;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.08)}.vq-fl[hidden]{display:none}
.vq-sig{right:16px}.vq-ant{left:16px}.vq-fl:hover{background:#000;color:#fff}
/* fila (Best Sellers) */
.vq-fila{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:16px;padding:56px 24px 56px 32px}
.vq-fila-cab h2{font-size:clamp(30px,2.8vw,40px)}.vq-fila-cab .vq-link{margin-top:12px;display:block;width:max-content}
.vq-sola{overflow-x:auto}
.vq-vid{width:100%;max-height:70vh;background:#000;grid-column:2}
/* bloques partidos */
.vq-partida{display:grid;grid-template-columns:1fr 1fr;align-items:stretch}
.vq-reves .vq-grande{order:2}
.vq-grande{position:relative;min-height:620px;overflow:hidden;background:#efefef}
.vq-grande img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%}
.vq-lado{padding:40px 24px 40px 24px;min-width:0;display:flex;flex-direction:column;justify-content:flex-start}
.vq-lado-cab{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:24px}
.vq-lado h2{font-size:clamp(30px,2.8vw,42px)}.vq-desc{font-size:20px;color:#555;margin-top:8px;max-width:48ch}
.vq-lado .vq-card{flex-basis:calc((100% - 16px)/1.9)}
.vq-sobre .vq-lado{justify-content:center;padding:64px clamp(24px,6vw,96px)}.vq-sobre h2{margin-bottom:22px}
.vq-texto p{font-size:20px;line-height:1.65;max-width:52ch;color:#1a1a1a}.vq-texto p+p{margin-top:14px}.vq-sobre .vq-link{margin-top:26px;align-self:flex-start}
.vq-sobre:not(:has(.vq-grande)){grid-template-columns:1fr}
/* banda de dos fotos */
.vq-banda{position:relative;display:grid;grid-template-columns:1fr 1fr;margin-top:20px}
.vq-banda figure{position:relative;height:clamp(460px,62vw,940px);overflow:hidden;background:#efefef}
.vq-banda img{width:100%;height:100%;object-fit:cover;animation:vq-z 18s ease-in-out infinite alternate}
.vq-banda figure+figure img{animation-delay:-9s}
.vq-banda::after{content:"";position:absolute;left:0;bottom:0;width:50%;height:45%;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.45));pointer-events:none}
.vq-banda-txt{position:absolute;left:50px;bottom:56px;z-index:2;color:#fff;max-width:min(44vw,560px);text-shadow:0 1px 14px rgba(0,0,0,.3)}
.vq-banda-txt h2{font-size:clamp(22px,1.8vw,26px)}.vq-banda-txt p{font-weight:300;margin-top:6px}.vq-banda-txt .vq-link{margin-top:18px}
/* pie */
.vq-pie{position:relative;padding:80px 40px;margin-top:26px;background:#1a1a1a}
.vq-pie-fondo{position:absolute;inset:0;overflow:hidden}.vq-pie-fondo img{width:100%;height:100%;object-fit:cover}
.vq-pie-card{position:relative;background:#fff;max-width:1360px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:56px 20px 22px 32px}
.vq-pie-izq{display:flex;flex-direction:column}
.vq-logo-g{width:min(440px,90%);height:auto;max-height:200px;object-fit:contain;object-position:left}.vq-nombre-g{font-size:54px;font-weight:500;line-height:1;text-transform:uppercase;letter-spacing:.02em}
.vq-frase{font-size:clamp(32px,3.6vw,56px);line-height:1.2;margin-top:44px;max-width:15ch}
.vq-marcas{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}.vq-marcas img{height:auto;max-height:80px;width:auto;max-width:240px;object-fit:contain}
.vq-legal{display:flex;flex-wrap:wrap;gap:12px 36px;margin-top:auto;padding-top:48px;font-size:20px}.vq-legal a{text-decoration:none}.vq-legal a:hover{text-decoration:underline}
.vq-copy{font-size:20px;margin-top:28px;color:#222}
.vq-pie-t{font-size:20px;font-weight:500}.vq-pie-p{margin-top:16px}
.vq-msj{display:flex;align-items:center;border-bottom:1px solid #000;margin-top:26px}.vq-msj input[type=text]{flex:1;border:0;outline:0;font:inherit;font-size:16px;padding:10px 0;background:transparent}.vq-msj button{border:0;background:none;cursor:pointer;width:40px;height:40px;display:grid;place-items:center}
.vq-nota{font-size:20px;font-style:italic;color:#444;margin-top:8px}
.vq-acc{border-bottom:1px solid #d8d8d8}.vq-acc:first-of-type{margin-top:28px}
.vq-acc summary{list-style:none;display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:500;padding:16px 0;cursor:pointer}.vq-acc summary::-webkit-details-marker{display:none}
.vq-acc summary svg{transition:transform .25s}.vq-acc[open] summary svg{transform:rotate(180deg)}
.vq-acc-in{padding:0 0 18px;font-size:20px;line-height:1.6}.vq-acc-in p+p{margin-top:10px}.vq-acc-in ol{padding-left:20px}.vq-acc-in li+li{margin-top:8px}.vq-acc-in a{text-underline-offset:3px}
.vq-acc-in a+a{margin-left:18px}
.vq-ciudad{display:inline-flex;align-items:center;gap:8px;margin-top:22px;border:1px solid #d8d8d8;padding:8px 16px;font-size:20px;float:right}.vq-ciudad svg{width:20px;height:20px}
/* flotantes */
.vq-wa{position:fixed;right:30px;bottom:28px;z-index:40;width:60px;height:60px;border-radius:50%;background:#fff;color:#1f9d55;display:grid;place-items:center;box-shadow:0 4px 18px rgba(0,0,0,.18)}
.etq{position:fixed;left:20px;bottom:24px;z-index:40;background:#000;color:#fff;font-size:14px;padding:6px 12px;border-radius:999px}
/* tablet y celular */
@media (max-width:899px){
.vq-barra{height:64px;padding:0 12px}.vq-bizq,.vq-bder{gap:4px}.vq-logo{height:38px;max-width:160px}html{scroll-padding-top:64px}
.vq-hero{height:min(560px,calc(100svh - 64px));min-height:440px}.vq-hero-txt{left:20px;right:20px;bottom:30px;text-align:center;margin:0 auto}
.vq-hsub{display:none}
.vq-fila{grid-template-columns:1fr;padding:36px 0 36px 16px}.vq-fila-cab{padding-right:16px}
.vq-card,.vq-lado .vq-card{flex-basis:78%}.vq-fl{display:none}
.vq-partida{grid-template-columns:1fr}.vq-reves .vq-grande{order:0}.vq-grande{min-height:0;aspect-ratio:4/5}
.vq-lado{padding:28px 0 36px 16px}.vq-lado-cab{flex-direction:column;align-items:flex-start;gap:8px;padding-right:16px}
.vq-sobre .vq-lado{padding:32px 20px 40px}
.vq-banda figure{height:clamp(320px,80vw,560px)}.vq-banda-txt{left:16px;bottom:26px;max-width:80vw}.vq-banda::after{width:100%}
.vq-pie{padding:56px 16px}.vq-pie-card{grid-template-columns:1fr;gap:28px;padding:36px 20px 22px}.vq-pie-izq{display:contents}.vq-pie-der{order:4}.vq-legal{order:5}.vq-copy{order:6;margin-top:0}
.vq-hero::after{height:75%;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.66))}
.vq-frase{margin-top:28px}.vq-legal{padding-top:28px;gap:10px 24px}.vq-ciudad{float:none}
.vq-wa{right:16px;bottom:16px;width:54px;height:54px}.etq{left:12px;bottom:16px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}.vq-capa:not(:first-child){opacity:0!important}}
`;

// Flechas de los carruseles: avanzan casi una pantalla, se ocultan en los extremos y si todo cabe.
export const JS_VITRINA = `<script>(()=>{document.querySelectorAll('.vq-car').forEach(c=>{const p=c.querySelector('.vq-pista'),a=c.querySelector('.vq-ant'),b=c.querySelector('.vq-sig');if(!p||!a||!b)return;
const est=()=>{a.hidden=p.scrollLeft<8;b.hidden=p.scrollLeft+p.clientWidth>=p.scrollWidth-8};
a.addEventListener('click',()=>p.scrollBy({left:-p.clientWidth*.85}));b.addEventListener('click',()=>p.scrollBy({left:p.clientWidth*.85}));
p.addEventListener('scroll',est,{passive:true});addEventListener('resize',est);est();});
addEventListener('keydown',e=>{if(e.key==='Escape'&&location.hash==='#menu')location.hash='';});})();</script>`;
