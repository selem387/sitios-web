// Opción P "Ficha en movimiento" — reconstruida el 14-nov-2026 SOLO a partir de onyxcoffeelab.com/products/southern-weather
// (pedido de Sebastián: nada de las otras opciones ni de ramas anteriores; ni slider, ni secciones de la plantilla general, ni
// los efectos de movimiento.js). Página propia, con su HTML, CSS y JS, que replica el recorrido de la referencia con los datos
// y las fotos del cliente:
//   1. Escena fija de portada (Onyx: .main-title fijo + .hero-spacer de 3200 px): nombre enorme en minúsculas, renglón de notas
//      y la foto del producto sobre un aro; al bajar, la foto se va y aparece un círculo "en resumen" rodeado de hasta 10 datos
//      con ícono. Pasar el cursor (o tocar) un dato cambia el contenido del círculo (Onyx: "hover over each feature").
//   2. Barra de pedido fija abajo (Onyx: subscribe / tamaño / cantidad / add to cart) → producto, cantidad y "Pedir por WhatsApp".
//   3. "nuestra historia" (Onyx: "the story"): foto de fondo fija, anillo de texto que gira y "Más" con el texto completo.
//   4. Guía con pestañas (Onyx: "extraction guides"): una pestaña por categoría, foto, lista con precios y tira de datos;
//      cierra con "¿listo para pedir?" (Onyx: "ready to brew?").
//   5. "en claro" (Onyx: "financial transparency"): columnas que se despliegan (preguntas o pasos del cliente).
//   6. Reseñas (Onyx: "peer reviewed"): barra con el conteo y tarjetas deslizables con "Leer más". Solo reseñas reales;
//      nada de estrellas inventadas.
//   7. Sellos circulares (Onyx: virtues), banda clara "va bien con" (Onyx: "pairs well with") y pie con contacto.
// Técnica de la referencia (medida 14-nov-2026): Shopify + jQuery + anime.js + script propio que liga el scroll a las
// animaciones (scroll-ties.js), capas position:fixed y videos MP4. Aquí: CSS (variable --p del avance) y un script mínimo,
// sin librerías ni video generado. Sin JS o con "reducir movimiento": todo quieto, completo y en orden de lectura.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dos = (n) => String(n).padStart(2, '0');
const corto = (t, n) => { const s = String(t || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n); return `${c.slice(0, Math.max(c.lastIndexOf(' '), n - 20)).replace(/[,.;:\s]+$/, '')}…`; };
const primeraFrase = (t) => (String(t || '').replace(/\s+/g, ' ').match(/^.{20,220}?[.!?](?=\s|$)/) || [String(t || '').slice(0, 200)])[0].trim();
const giroCorto = (g) => String(g || '').split(/[:;(]/)[0].trim();
const precioNum = (s) => { const m = [...String(s || '').matchAll(/\$\s?(\d+(?:[.,]\d+)?)/g)].map((x) => Number(x[1].replace(',', '.'))); return m.length ? Math.min(...m) : null; };

export const MAX_DATOS = 10;
/** Texto de un anillo: se repite el texto entero hasta acercarse a la vuelta (n caracteres) y termina con su separador. */
export function vueltas(t, n, sep = '  |  ') {
  const u = `${String(t || '').toUpperCase()}${sep}`;
  return u.repeat(Math.max(1, Math.round(n / u.length)));
}

/* ---------------- Íconos (trazo, como los de la referencia) ---------------- */
const ICO = {
  sello: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
  reloj: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/>',
  precio: '<path d="M4 12l8-8h7v7l-8 8z"/><circle cx="15.5" cy="8.5" r="1.2"/>',
  lista: '<path d="M8 7h11M8 12h11M8 17h11"/><circle cx="4.5" cy="7" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="17" r=".8"/>',
  taza: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M9 3v3M12 3v3"/>',
  estrella: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  check: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.3 2.3 4.7-4.9"/>',
  persona: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  ruta: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
  sol: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
};
const icono = (k) => `<svg class="fp-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICO[k] || ICO.check}</svg>`;

/* ---------------- Datos del cliente → contenido de la página ---------------- */
const fotoOk = (x) => x?.url && !x.captura && x.calidad !== 'regular';

/**
 * Normaliza lo que mandan las dos plantillas (general y restaurante/cafetería) en el contenido de la ficha.
 * d: {letra, nombre, brief, mat, t:{titular, subtitulo, cta, info, sobre, proceso}, titulos, menu?:{categorias, productos, docs}, testimonios?}
 */
export function datosFicha(d) {
  const brief = d.brief || {}, mat = d.mat || {}, t = d.t || {};
  const neg = brief.negocio || {}, conf = brief.confianza || {}, c = brief.contacto || {};
  const giro = giroCorto(neg.giro_texto);
  const dir = d.direccion || [c.direccion?.calle || (typeof c.direccion === 'string' ? c.direccion : ''), c.direccion?.colonia].filter(Boolean).join(', ') || '';
  const horario = typeof c.horarios === 'string' ? c.horarios : '';
  const historia = String(t.sobre || conf.historia_corta || brief.oferta?.diferenciador || '').trim();

  // Productos o servicios, agrupados por categoría: [{nombre, items:[{nombre, precio, desc}]}]
  let grupos = [];
  if (d.menu?.categorias?.length) {
    grupos = d.menu.categorias.map((g) => ({ nombre: g.nombre, items: (g.items || []).map((i) => ({ nombre: i.nombre, precio: i.precio || '', desc: i.descripcion || '' })) }));
  } else {
    const m = new Map();
    for (const it of brief.oferta?.items || []) {
      const x = typeof it === 'string' ? { nombre: it } : it;
      if (!x?.nombre) continue;
      const g = String(x.grupo || '').trim() || (d.titulos?.servicios || 'Lo que ofrecemos');
      if (!m.has(g)) m.set(g, { nombre: g, items: [] });
      m.get(g).items.push({ nombre: x.nombre, precio: brief.oferta?.mostrar_precios === false ? '' : (x.precio_o_rango || x.precio || ''), desc: x.descripcion_corta || x.descripcion || '' });
    }
    grupos = [...m.values()];
  }
  const todos = grupos.flatMap((g) => g.items);

  // Fotos: recortes de producto (sin fondo) para la portada y "va bien con"; fotos con fondo para la historia y la guía.
  const productos = (d.menu?.productos || []).filter((x) => x.img);
  const sf = (f) => (typeof f.sin_fondo === 'string' ? f.sin_fondo : f.sin_fondo?.url) || '';
  const recortes = [...productos.filter((x) => x.recortado).map((x) => ({ url: x.img, alt: x.nombre, nombre: x.nombre, precio: x.precio, ancho: x.ancho, alto: x.alto })),
    ...(mat.fotos || []).filter((f) => sf(f)).map((f) => ({ url: sf(f), alt: f.nombre || f.alt || '', nombre: f.nombre || '' }))]
    .filter((x, k, a) => typeof x.url === 'string' && x.url && a.findIndex((y) => y.url === x.url) === k);
  const conFondo = [mat.hero, ...(mat.trabajos || []), ...(mat.local || []), ...(mat.equipo || []), mat.fundador, ...(mat.otras || []), ...(mat.fotos || []).filter((f) => !f.sin_fondo && !f.recorte && f.tipo !== 'foto_producto')]
    .filter(fotoOk).filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k);
  const heroFoto = recortes[0] ? { ...recortes[0], recorte: true } : conFondo[0] ? { ...conFondo[0], recorte: false } : null;
  const restoFondo = conFondo.filter((x) => x.url !== heroFoto?.url);
  const fotoHistoria = restoFondo[0] || conFondo[0] || null;

  // Datos alrededor del círculo (Onyx: extraction, caffeine, roast, origin, variety…). Solo datos reales del brief.
  const datos = [];
  const add = (ico, valor, etiqueta, detalle = '') => { if (valor && datos.length < MAX_DATOS && !datos.some((x) => x.valor === corto(valor, 34))) datos.push({ ico, valor: corto(valor, 34), etiqueta, detalle: detalle || '' }); };
  if (giro) add('sello', giro, 'Especialidad', historia ? primeraFrase(historia) : '');
  const desde = todos.map((x) => precioNum(x.precio)).filter(Boolean);
  if (desde.length) add('precio', `Desde $${Math.min(...desde)}`, 'Precios', grupos.map((g) => { const p = g.items.map((x) => precioNum(x.precio)).filter(Boolean); return p.length ? `${g.nombre}: desde $${Math.min(...p)}` : ''; }).filter(Boolean).join(' · '));
  if (todos.length) add('lista', `${todos.length} ${todos.length === 1 ? 'opción' : 'opciones'}`, d.menu ? 'En el menú' : 'Para elegir', grupos.map((g) => g.nombre).join(' · '));
  if (horario) add('reloj', horario.split(/[,;\n]/)[0], 'Horario', horario);
  if (dir || neg.ciudad) add('pin', c.direccion?.colonia || neg.ciudad || dir, 'Dónde', [dir, neg.ciudad].filter(Boolean).join(', '));
  if (brief.oferta?.diferenciador) add('estrella', brief.oferta.diferenciador, 'Lo que nos distingue', brief.oferta.diferenciador);
  for (const linea of (t.info || []).slice(0, 3)) add('check', linea, 'Ventaja', linea);
  if (conf.fundador?.nombre) add('persona', conf.fundador.nombre, conf.fundador.rol || 'Quién te atiende');
  if ((brief.zona?.cobertura || []).length) add('ruta', brief.zona.cobertura.slice(0, 2).join(' · '), 'Cobertura', brief.zona.cobertura.join(' · '));
  for (const g of grupos.slice(0, 4)) { const p = g.items.map((x) => precioNum(x.precio)).filter(Boolean); add('taza', g.nombre, p.length ? `Desde $${Math.min(...p)}` : `${g.items.length} opciones`, g.items.slice(0, 6).map((x) => x.nombre).join(' · ')); }

  // Notas bajo el nombre (Onyx: "MILK CHOCOLATE | PLUM | CANDIED WALNUTS | JUICY & CITRUS FINISH").
  const notas = (grupos.length >= 2 ? grupos.map((g) => g.nombre) : [giro, neg.ciudad, ...(t.info || [])]).filter(Boolean).slice(0, 4);

  // Guía con pestañas: una por categoría (hasta 5); cada una con la foto de uno de sus productos o, si no, una del cliente.
  const usadasGuia = new Set([heroFoto?.url]);
  const fotosGuia = [...restoFondo.slice(1), ...restoFondo.slice(0, 1)];
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const buscaFoto = (g) => recortes.find((r) => !usadasGuia.has(r.url) && r.nombre && g.items.some((i) => norm(i.nombre).includes(norm(r.nombre)) || norm(r.nombre).includes(norm(i.nombre))));
  let kf = 0;
  const pestanas = grupos.slice(0, 5).map((g) => {
    const pr = g.items.map((x) => precioNum(x.precio)).filter(Boolean);
    let foto = buscaFoto(g);
    if (foto) { usadasGuia.add(foto.url); foto = { ...foto, recorte: true }; } else if (fotosGuia.length) { foto = { ...fotosGuia[kf++ % fotosGuia.length], recorte: false }; } else {
      const r = recortes.find((x) => !usadasGuia.has(x.url)) || recortes[0];
      if (r) { usadasGuia.add(r.url); foto = { ...r, recorte: true }; }
    }
    return { nombre: g.nombre, items: g.items.slice(0, 10), foto: foto || null,
      tira: [`${g.items.length} ${g.items.length === 1 ? 'opción' : 'opciones'}`, pr.length ? `Desde $${Math.min(...pr)}` : '', pr.length > 1 ? `Hasta $${Math.max(...pr)}` : '', giro].filter(Boolean) };
  });

  // "en claro": preguntas frecuentes del cliente; si no, los pasos de su proceso.
  const faq = (brief.faq || []).filter((x) => x?.pregunta && x?.respuesta).slice(0, 6).map((x, k) => ({ etq: `Pregunta ${dos(k + 1)}`, valor: x.pregunta, texto: x.respuesta }));
  const pasosRaw = Array.isArray(t.proceso) ? t.proceso : (brief.oferta?.proceso_pasos || []);
  const pasos = pasosRaw.slice(0, 6).map((x, k) => { const o = typeof x === 'object' && x ? x : { titulo: String(x).split('\n')[0], texto: String(x).split('\n').slice(1).join(' ') }; return { etq: `Paso ${dos(k + 1)}`, valor: o.titulo || '', texto: o.texto || '' }; }).filter((x) => x.valor);
  const claros = faq.length >= 2 ? { titulo: 'en claro', intro: 'Lo que más nos preguntan, sin letra chica.', cols: faq } : pasos.length >= 2 ? { titulo: 'cómo trabajamos', intro: t.proceso_intro || 'Así es el proceso, paso a paso.', cols: pasos } : null;

  // Reseñas reales: texto (testimonios) y capturas.
  const testimonios = (d.testimonios || []).filter((x) => x?.texto).map((x) => ({ nombre: x.nombre || '', texto: String(x.texto).replace(/\p{Extended_Pictographic}/gu, '').trim() }));
  const capturas = (mat.resenas || []).filter((x) => x?.url);

  // Sellos (Onyx: solar, living wage, transparent trade, B Corp) → las líneas de información del cliente.
  const sellos = (t.info || []).filter(Boolean).slice(0, 4);

  // "va bien con": productos con foto y precio (recortes) o, en servicios, fotos de trabajo con su nombre.
  const pares = (recortes.length >= 3 ? recortes.filter((x) => x.url !== heroFoto?.url).slice(0, 4).map((x) => ({ nombre: x.nombre, precio: x.precio || '', foto: { ...x, recorte: true } }))
    : restoFondo.filter((x) => x.nombre).slice(0, 4).map((x) => ({ nombre: x.nombre, precio: '', foto: { ...x, recorte: false } }))).filter((x) => x.nombre);

  return {
    letra: d.letra || 'P', nombre: d.nombre || neg.nombre || '', giro, ciudad: neg.ciudad || '', titular: t.titular || '', subtitulo: t.subtitulo || '', cta: t.cta || 'Escríbenos por WhatsApp',
    notas, heroFoto, datos, resumen: historia ? corto(historia, 230) : (t.subtitulo || ''),
    historia: { texto: historia, foto: fotoHistoria, video: (mat.videos || [])[0] || null, anillo: [giro, neg.ciudad, dir, horario.split(/[,;\n]/)[0]].filter(Boolean).join('  |  ') },
    guia: { titulo: d.menu ? 'nuestro menú' : String(d.titulos?.servicios || 'lo que hacemos').toLowerCase(), pestanas, docs: d.menu?.docs || [], menus: (mat.menus || []).filter((x) => x?.url) },
    claros, resenas: { testimonios, capturas }, sellos, pares, promo: brief.oferta?.promocion_actual || '',
    pedido: todos.filter((x) => x.nombre).slice(0, 40),
    contacto: { dir, ciudad: neg.ciudad || '', horario, email: c.email || '', tel: d.tel || '', redes: d.redes || [] },
  };
}

/* ---------------- HTML ---------------- */
const imgTag = (x, { cls = '', eager = false, sizes = '' } = {}) => x?.url ? `<img class="${cls ? `${cls} ` : ''}rep-ok" src="${esc(x.url)}" alt="${esc(x.alt || x.nombre || '')}" loading="${eager ? 'eager' : 'lazy'}"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}${eager ? ' fetchpriority="high"' : ''}${sizes ? ` sizes="${sizes}"` : ''}>` : '';

function escenaHTML(D, ctaHTML) {
  const mitad = Math.ceil(D.datos.length / 2);
  const dato = (x, k) => `<li class="fp-dato" style="--i:${k}"><button type="button" class="fp-db" data-k="${k}"><span class="fp-dv">${esc(x.valor)}</span><span class="fp-de">${esc(x.etiqueta)}</span>${icono(x.ico)}</button></li>`;
  const plantillas = D.datos.map((x, k) => `<template id="fp-d${k}"><p class="fp-ce">${esc(x.etiqueta)}</p><p class="fp-ct">${esc(x.valor)}</p>${x.detalle && x.detalle !== x.valor ? `<p class="fp-cx">${esc(x.detalle)}</p>` : ''}</template>`).join('');
  return `<section class="fp-esc" id="inicio" aria-label="${esc(D.nombre)}"><div class="fp-stage">
<div class="fp-tit"><p class="fp-nombre" aria-hidden="true">${esc(String(D.nombre).toLowerCase())}</p>${D.notas.length ? `<p class="fp-notas">${D.notas.map(esc).join('<i aria-hidden="true">|</i>')}</p>` : ''}</div>
<div class="fp-prod">${D.heroFoto ? `<figure class="fp-pf${D.heroFoto.recorte ? ' recorte' : ''}">${imgTag(D.heroFoto, { cls: 'fp-pimg', eager: true, sizes: '(min-width:900px) 40vw, 80vw' })}</figure>${D.heroFoto.recorte ? '<span class="fp-aro" aria-hidden="true"></span>' : ''}` : ''}
<div class="fp-intro"><h1 class="fp-h1">${esc(D.titular)}</h1>${D.subtitulo ? `<p class="fp-sub">${esc(D.subtitulo)}</p>` : ''}${ctaHTML}</div>
<p class="fp-baja" aria-hidden="true">Baja para conocernos</p></div>
${D.datos.length >= 4 ? `<div class="fp-res"><ul class="fp-col fp-izq">${D.datos.slice(0, mitad).map((x, k) => dato(x, k)).join('')}</ul>
<div class="fp-centro" aria-live="polite"><div id="fp-centro-c"><p class="fp-ce">${esc(D.giro || D.nombre)}</p><h2 class="fp-ct">en resumen</h2><p class="fp-hint">Toca cada dato</p>${D.resumen ? `<p class="fp-cx">${esc(D.resumen)}</p>` : ''}</div></div>
<ul class="fp-col fp-der">${D.datos.slice(mitad).map((x, k) => dato(x, k + mitad)).join('')}</ul>${plantillas}</div>` : ''}
</div></section>`;
}

function historiaHTML(D, ctaHTML) {
  const h = D.historia;
  if (!h.texto || (!h.foto && !h.video)) return '';
  const largo = h.texto.length > 300;
  const anillo = h.anillo || D.nombre;
  const fondo = h.video ? `<video class="fp-hbg" src="${esc(h.video.url)}"${h.foto ? ` poster="${esc(h.foto.url)}"` : ''} muted loop playsinline autoplay preload="metadata" aria-hidden="true"></video>` : imgTag(h.foto, { cls: 'fp-hbg', sizes: '100vw' });
  return `<section class="fp-hist" id="historia" aria-labelledby="fp-hist-t"><div class="fp-hfijo">${fondo}<span class="fp-hvelo" aria-hidden="true"></span>
<div class="fp-hcirc"><svg class="fp-anillo" viewBox="0 0 400 400" aria-hidden="true"><defs><path id="fp-ap" d="M200,200 m-176,0 a176,176 0 1,1 352,0 a176,176 0 1,1 -352,0"/></defs><text><textPath href="#fp-ap" textLength="1090" lengthAdjust="spacing">${esc(vueltas(anillo, 78))}</textPath></text></svg>
<div class="fp-hin"><h2 class="fp-h2" id="fp-hist-t">nuestra historia</h2><p>${esc(largo ? corto(h.texto, 260) : h.texto)}</p>${largo ? '<button type="button" class="fp-mas" data-dlg="fp-dlg-hist">Más</button>' : ''}</div></div></div>
${largo ? `<dialog class="fp-dlg" id="fp-dlg-hist" aria-labelledby="fp-dh-t"><div class="fp-dlg-in"><button type="button" class="fp-x" aria-label="Cerrar">&#10005;</button><h3 id="fp-dh-t">nuestra historia</h3>${h.texto.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('')}${ctaHTML}</div></dialog>` : ''}</section>`;
}

function guiaHTML(D, ctaHTML) {
  const g = D.guia;
  if (!g.pestanas.length) return '';
  const varias = g.pestanas.length > 1;
  const tabs = varias ? `<div class="fp-tabs" role="tablist" aria-label="${esc(g.titulo)}">${g.pestanas.map((p, k) => `<button type="button" role="tab" class="fp-tab" id="fp-t${k}" aria-controls="fp-p${k}" aria-selected="${k ? 'false' : 'true'}" tabindex="${k ? -1 : 0}">${esc(p.nombre)}</button>`).join('')}</div>` : '';
  const paneles = g.pestanas.map((p, k) => `<div class="fp-panel"${varias ? ` role="tabpanel" aria-labelledby="fp-t${k}"` : ''} id="fp-p${k}"><h3 class="fp-ptit">${esc(p.nombre)}</h3><div class="fp-pgrid">
${p.foto ? `<figure class="fp-pfoto${p.foto.recorte ? ' recorte' : ''}">${imgTag(p.foto, { sizes: '(min-width:900px) 50vw, 100vw' })}</figure>` : ''}
<div class="fp-pcard"><p class="fp-pk">${esc(p.nombre)}</p><ul class="fp-plist">${p.items.map((i) => `<li><span><b>${esc(i.nombre)}</b>${i.desc ? `<small>${esc(i.desc)}</small>` : ''}</span>${i.precio ? `<em>${esc(i.precio)}</em>` : ''}</li>`).join('')}</ul></div></div>
${p.tira.length ? `<ul class="fp-tira">${p.tira.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('');
  const docs = g.docs.map((u, i, a) => `<a class="fp-btn fp-lin" href="${esc(u)}" target="_blank" rel="noopener">${a.length > 1 ? `Ver el menú completo (${i + 1})` : 'Ver el menú completo'}</a>`).join('');
  const menus = g.menus.length ? `<div class="fp-menus">${g.menus.map((x, i) => `<a href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="Imagen del menú ${i + 1}">${imgTag(x)}</a>`).join('')}</div>` : '';
  return `<section class="fp-guia" id="menu" aria-labelledby="fp-guia-t"><div class="fp-wrap"><h2 class="fp-h2" id="fp-guia-t">${esc(g.titulo)}</h2>${tabs}${paneles}${menus}${docs ? `<div class="fp-docs">${docs}</div>` : ''}
<div class="fp-listo"><p class="fp-listo-t">¿listo para pedir?</p>${ctaHTML}</div></div></section>`;
}

function clarosHTML(D) {
  const c = D.claros;
  if (!c) return '';
  return `<section class="fp-claros" id="claros" aria-labelledby="fp-cl-t"><div class="fp-wrap"><h2 class="fp-h2" id="fp-cl-t">${esc(c.titulo)}</h2><p class="fp-intro-t">${esc(c.intro)}</p>
<ul class="fp-cols">${c.cols.map((x, k) => `<li class="fp-colu${k ? '' : ' abierta'}"><button type="button" class="fp-cb" aria-expanded="${k ? 'false' : 'true'}" aria-controls="fp-cx${k}"><span class="fp-ck">${esc(x.etq)}</span><span class="fp-cv">${esc(x.valor)}</span></button><div class="fp-cd" id="fp-cx${k}">${x.texto ? `<p>${esc(x.texto)}</p>` : ''}</div></li>`).join('')}</ul></div></section>`;
}

function resenasHTML(D) {
  const { testimonios, capturas } = D.resenas;
  const n = testimonios.length + capturas.length;
  if (!n) return '';
  const tarjetas = testimonios.map((x, k) => {
    const largo = x.texto.length > 220;
    return `<li class="fp-rev"><p class="fp-rt">${esc(primeraFrase(x.texto).split(' ').slice(0, 5).join(' ').replace(/[.,;:!?…]+$/, ''))}</p><p class="fp-rx">${esc(largo ? corto(x.texto, 220) : x.texto)}</p>${largo ? `<button type="button" class="fp-lee" data-dlg="fp-dlg-r${k}">Leer más</button><dialog class="fp-dlg" id="fp-dlg-r${k}" aria-label="Reseña${x.nombre ? ` de ${esc(x.nombre)}` : ''}"><div class="fp-dlg-in"><button type="button" class="fp-x" aria-label="Cerrar">&#10005;</button><p>${esc(x.texto)}</p>${x.nombre ? `<p class="fp-rn">${esc(x.nombre)}</p>` : ''}</div></dialog>` : ''}${x.nombre ? `<p class="fp-rn">${esc(x.nombre)}</p><p class="fp-rs">Cliente</p>` : ''}</li>`;
  }).join('') + capturas.map((x) => `<li class="fp-rev fp-cap"><figure>${imgTag(x)}</figure></li>`).join('');
  return `<section class="fp-resenas" id="resenas" aria-labelledby="fp-re-t"><div class="fp-wrap"><h2 class="fp-h2" id="fp-re-t">lo que dicen</h2><p class="fp-intro-t">Lo que escriben nuestros clientes, tal cual.</p>
<div class="fp-rbar"><span><b>${n}</b> ${n === 1 ? 'reseña' : 'reseñas'}</span><span>Clientes reales</span><span class="fp-rnav"><button type="button" class="fp-rb" data-d="-1" aria-label="Reseñas anteriores">&#8249;</button><button type="button" class="fp-rb" data-d="1" aria-label="Más reseñas">&#8250;</button></span></div>
<ul class="fp-rlist" tabindex="0" aria-label="Reseñas">${tarjetas}</ul></div></section>`;
}

function sellosHTML(D) {
  if (D.sellos.length < 2) return '';
  const icos = ['sol', 'check', 'estrella', 'sello'];
  return `<section class="fp-sellos" aria-label="Lo que nos importa"><ul class="fp-wrap fp-sl">${D.sellos.map((s, k) => `<li class="fp-sello"><svg class="fp-sring" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="fp-sp${k}" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs><text><textPath href="#fp-sp${k}" textLength="284" lengthAdjust="spacing">${esc(vueltas(corto(s, 34), 30, ' • '))}</textPath></text></svg>${icono(icos[k % icos.length])}<span class="fp-sr">${esc(s)}</span></li>`).join('')}</ul></section>`;
}

function paresHTML(D) {
  if (D.pares.length < 2) return '';
  return `<section class="fp-pares" aria-labelledby="fp-pa-t"><div class="fp-wrap"><h2 class="fp-pa-h" id="fp-pa-t"><span>va bien con</span></h2><ul class="fp-plist2">${D.pares.map((x) => `<li><figure class="${x.foto.recorte ? 'recorte' : ''}">${imgTag(x.foto)}</figure><p class="fp-pan">${esc(x.nombre)}</p>${x.precio ? `<p class="fp-pap">${esc(x.precio)}</p>` : ''}</li>`).join('')}</ul></div></section>`;
}

function pieHTML(D, wa, ctaHTML) {
  const c = D.contacto;
  const redes = (c.redes || []).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join('');
  return `<section class="fp-pie" id="contacto" aria-labelledby="fp-pie-t"><div class="fp-wrap"><div class="fp-pie-a"><h2 class="fp-h2" id="fp-pie-t">visítanos</h2><p class="fp-intro-t">${esc([D.giro, D.ciudad].filter(Boolean).join(' · '))}</p>${ctaHTML}</div>
<div class="datos">${c.dir ? `<p><b>Dónde</b>${esc([c.dir, c.ciudad].filter(Boolean).join(', '))}</p>` : ''}${c.horario ? `<p><b>Horario</b>${esc(c.horario)}</p>` : ''}${c.tel && wa ? `<p><b>WhatsApp</b><a${wa}>${esc(c.tel)}</a></p>` : ''}${c.email ? `<p><b>Correo</b><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}${redes ? `<p><b>Redes</b><span class="fp-redes">${redes}</span></p>` : ''}</div></div></section>`;
}

function pedidoHTML(D, numero) {
  const op = D.pedido.map((x, k) => `<option value="${k}" data-n="${esc(x.nombre)}" data-p="${precioNum(x.precio) ?? ''}">${esc(x.nombre)}${x.precio ? ` — ${esc(x.precio)}` : ''}</option>`).join('');
  return `<form class="fp-pedido" aria-label="Haz tu pedido" data-wa="${esc(numero || '')}" onsubmit="return false">${op ? `<label class="fp-sel"><span class="fp-oc">${D.pedido.length ? 'Elige qué quieres' : ''}</span><select name="p">${op}</select></label>
<div class="fp-cant" role="group" aria-label="Cantidad"><button type="button" data-c="-1" aria-label="Uno menos">-</button><output name="c">1</output><button type="button" data-c="1" aria-label="Uno más">+</button></div>` : ''}
<a class="fp-btn fp-pbtn" href="${numero ? `https://wa.me/${esc(numero)}` : '#contacto'}"${numero ? ' target="_blank" rel="noopener"' : ''}><span class="fp-pt">${esc(D.cta)}</span></a></form>`;
}

/** Página completa de la P. d viene de la plantilla (general o restaurante); ver datosFicha. */
export function paginaFicha(d) {
  const D = datosFicha(d);
  const p = d.pal || {};
  const f = d.f || {};
  const wa = d.wa ? ` href="${esc(d.wa)}" target="_blank" rel="noopener"` : ' href="#contacto"';
  const numero = String(d.wa || '').match(/wa\.me\/(\d+)/)?.[1] || String(d.wa || '').match(/phone=(\d+)/)?.[1] || '';
  const cta = () => `<a class="fp-btn"${wa}>${esc(D.cta)}</a>`;
  const nav = [['inicio', 'Inicio'], D.historia.texto && (D.historia.foto || D.historia.video) ? ['historia', 'Historia'] : null, D.guia.pestanas.length ? ['menu', D.guia.titulo.replace(/^./, (x) => x.toUpperCase())] : null, ['contacto', 'Contacto']].filter(Boolean);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(D.nombre)} · Propuesta ${esc(D.letra)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="${esc(d.fuentesUrl || '')}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link href="${esc(d.fuentesUrl || '')}" rel="stylesheet"></noscript>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&display=swap">
<style>
:root{--bg:${p.bg || '#2B292A'};--fg:${p.fg || '#F3EFE6'};--acc:${p.accent || p.primary || '#E8C98A'};--on-acc:${p.onAccent || p.onPrimary || '#141414'};--soft:${p.soft || '#BDB8B0'};--bor:${p.border || 'rgba(255,255,255,.2)'};--card:${p.card || '#353334'};--crema:${p.crema || '#F6F3EA'};--tinta:${p.tinta || '#1D1B1C'};--ft:'${f.titulos || 'serif'}',serif;--fc:'${f.cuerpo || 'sans-serif'}',sans-serif;--fl:'Oswald','Arial Narrow',sans-serif;--margen:clamp(20px,4vw,56px)}
${CSS_FICHA}
</style></head>
<body class="l-ficha">
<header class="barra"><div class="in">${d.logoBarra || `<span class="nombre">${esc(D.nombre)}</span>`}<nav>${nav.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</nav></div></header>
<main>${escenaHTML(D, cta())}${D.promo ? `<p class="fp-promo">${esc(D.promo)}</p>` : ''}${historiaHTML(D, cta())}${guiaHTML(D, cta())}${clarosHTML(D)}${resenasHTML(D)}${sellosHTML(D)}${paresHTML(D)}${pieHTML(D, wa, cta())}</main>
<footer class="fp-f">© ${new Date().getFullYear()} ${esc(D.nombre)} · Propuesta ${esc(D.letra)}: Ficha en movimiento</footer>
<span class="etq">Propuesta ${esc(D.letra)}</span>
${pedidoHTML(D, numero)}
${JS_FICHA}
</body></html>`;
}

export const CSS_FICHA = `
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth;background:var(--bg)}body.l-ficha{background:var(--bg);color:var(--fg);font-family:var(--fc);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}a{color:inherit}button{font:inherit;color:inherit}
.fp-wrap{max-width:1200px;margin:0 auto;padding:0 var(--margen)}
body.l-ficha .fp-h2{font-family:var(--ft);font-weight:700;font-size:clamp(40px,6vw,84px);line-height:1;letter-spacing:-.01em;text-transform:lowercase;text-align:center;margin:0 0 18px;max-width:none}
.fp-intro-t{max-width:56ch;margin:0 auto 34px;text-align:center;color:var(--soft)}
.fp-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 26px;border-radius:6px;background:var(--acc);color:var(--on-acc);font-family:var(--fl);font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:15px;text-decoration:none;border:0;cursor:pointer;text-align:center}
.fp-btn:focus-visible,button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid var(--acc);outline-offset:3px}
.fp-promo{text-align:center;padding:14px var(--margen);background:var(--acc);color:var(--on-acc);font-weight:700;max-width:none}
/* barra */
header.barra{position:fixed;top:0;left:0;right:0;z-index:40;background:transparent;transition:background .3s}
header.barra.solida{background:color-mix(in srgb,var(--bg) 92%,transparent)}
header.barra .in{display:flex;align-items:center;justify-content:space-between;padding:12px var(--margen);gap:16px}
header.barra .logo,header.barra img{height:46px;width:auto;max-width:150px;object-fit:contain}header.barra .nombre{font-family:var(--ft);font-size:20px;font-weight:700}
header.barra nav{display:flex;gap:22px;font-family:var(--fl);text-transform:uppercase;letter-spacing:.12em;font-size:14px}header.barra nav a{text-decoration:none}
/* 1. escena */
.fp-esc{position:relative}
.fp-stage{position:relative;min-height:100svh;padding:100px var(--margen) 40px;display:grid;grid-template-columns:minmax(0,1fr);justify-items:center;align-content:start;gap:14px;overflow:hidden;background:radial-gradient(ellipse at 50% 62%,color-mix(in srgb,var(--fg) 9%,var(--bg)),var(--bg) 70%)}
.fp-tit{text-align:center;position:relative;z-index:3;max-width:100%}
.fp-nombre{font-family:var(--ft);font-weight:700;font-size:clamp(36px,7.5vw,104px);overflow-wrap:anywhere;line-height:1;letter-spacing:-.01em;max-width:none}
.fp-notas{font-family:var(--fl);font-weight:600;font-size:clamp(12px,1.1vw,15px);letter-spacing:.14em;text-transform:uppercase;margin:10px auto 0;max-width:none}.fp-notas i{font-style:normal;margin:0 .7em;opacity:.7}
.fp-prod{position:relative;display:grid;grid-template-columns:minmax(0,1fr);justify-items:center;gap:14px;width:100%;min-width:0}
.fp-pf{position:relative;z-index:2;width:min(72vw,400px);aspect-ratio:1;margin:0;border-radius:50%;overflow:hidden}
.fp-pf.recorte{border-radius:0;overflow:visible;aspect-ratio:auto;width:auto;max-width:100%;height:min(44svh,430px)}
.fp-pf img{width:100%;height:100%;object-fit:cover}.fp-pf.recorte img{height:100%;width:auto;object-fit:contain;filter:drop-shadow(0 30px 34px rgba(0,0,0,.6))}
.fp-aro{position:relative;z-index:1;display:block;width:min(100%,620px);height:70px;margin-top:-60px;border:1px solid var(--bor);border-radius:50%}
.fp-intro{position:relative;z-index:3;max-width:100%;display:grid;justify-items:center;gap:10px;text-align:center;margin-top:6px}
body.l-ficha .fp-h1{font-family:var(--fc);font-weight:600;font-size:clamp(18px,1.8vw,24px);line-height:1.3;max-width:40ch;letter-spacing:0}
.fp-sub{color:var(--soft);max-width:52ch;font-size:15px}
.fp-baja{font-family:var(--fl);text-transform:uppercase;letter-spacing:.2em;font-size:12px;color:var(--soft);margin-top:6px}
.fp-res{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;width:100%;max-width:1160px;margin:56px auto 0}
.fp-col{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fp-db{width:100%;display:grid;grid-template-columns:1fr auto;grid-template-areas:"v i" "e i";align-items:center;gap:2px 14px;padding:12px 4px;background:transparent;border:0;border-bottom:1px solid var(--bor);text-align:left;cursor:pointer;min-height:44px}
.fp-dv{grid-area:v;font-weight:700;font-size:16px;line-height:1.25}.fp-de{grid-area:e;font-family:var(--fl);text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:var(--soft)}
.fp-ico{grid-area:i;width:24px;height:24px}
.fp-centro{order:-1;justify-self:center;width:min(100%,520px);aspect-ratio:1;border:1px solid var(--bor);border-radius:50%;display:grid;place-items:center;padding:clamp(28px,6vw,64px);text-align:center;background:color-mix(in srgb,var(--bg) 70%,transparent)}
.fp-ce{font-family:var(--fl);text-transform:uppercase;letter-spacing:.16em;font-size:12px;color:var(--soft);margin:0 auto}
body.l-ficha .fp-ct{font-family:var(--ft);font-weight:700;font-size:clamp(30px,4vw,60px);line-height:1;text-transform:lowercase;margin:6px auto 10px;max-width:none}
.fp-hint{font-family:var(--fl);text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:var(--soft);margin:0 auto 12px}
.fp-cx{font-size:15px;line-height:1.6;max-width:40ch;margin:0 auto}
@media (min-width:900px){
 .fp-res{grid-template-columns:1fr minmax(380px,520px) 1fr;align-items:center;gap:36px}
 .fp-centro{order:0}.fp-col{grid-template-columns:1fr;gap:4px}
 .fp-db{border:0;position:relative}
 .fp-izq .fp-db{grid-template-columns:1fr auto;text-align:right}
 .fp-der .fp-db{grid-template-areas:"i v" "i e";grid-template-columns:auto 1fr}
 .fp-izq .fp-db::after,.fp-der .fp-db::before{content:"";position:absolute;top:50%;width:40px;border-top:1px solid var(--bor)}.fp-izq .fp-db::after{right:-50px}.fp-der .fp-db::before{left:-50px}
}
.fp-db.on .fp-dv{color:var(--acc)}@media (hover:hover){.fp-db:hover .fp-dv{color:var(--acc)}}
/* escena fija: solo con JS, sin "reducir movimiento" y en pantallas anchas */
@media (min-width:900px) and (prefers-reduced-motion:no-preference){
 html.fp-js .fp-esc{height:280svh}
 html.fp-js .fp-stage{position:sticky;top:0;height:100svh;min-height:0;padding:0}
 html.fp-js .fp-tit{position:absolute;top:78px;left:0;right:0}
 html.fp-js .fp-prod{position:absolute;inset:200px var(--margen) 30px;align-content:center;opacity:clamp(0,calc(1 - var(--p,0)*3.2),1);transform:translateY(calc(var(--p,0)*-60px)) scale(calc(1 - var(--p,0)*.25))}
 html.fp-js .fp-res{position:absolute;inset:170px var(--margen) 24px;margin:0 auto;opacity:clamp(0,calc((var(--p,0) - .28)*4),1);pointer-events:none}
 html.fp-js .fp-esc.res .fp-res{pointer-events:auto}
 html.fp-js .fp-esc.res .fp-prod{pointer-events:none}
 html.fp-js .fp-centro{width:min(520px,calc(100svh - 240px));padding:clamp(24px,4vh,56px);transform:scale(calc(.86 + clamp(0,(var(--p,0) - .28)*4,1)*.14))}
 html.fp-js .fp-dato{opacity:clamp(0,calc((var(--p,0) - .36 - var(--i)*.025)*6),1);transform:translateY(calc(clamp(0,1 - (var(--p,0) - .36 - var(--i)*.025)*6,1)*16px))}
}
/* 2. barra de pedido */
.fp-pedido{position:fixed;left:0;right:0;bottom:0;z-index:35;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:12px var(--margen);background:color-mix(in srgb,var(--bg) 88%,#000);border-top:1px solid var(--bor);transition:transform .35s ease}
.fp-pedido.fuera{transform:translateY(110%)}
.fp-sel{position:relative;flex:1 1 260px;max-width:460px}.fp-oc{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.fp-sel select{width:100%;min-height:48px;padding:0 14px;border-radius:6px;border:1px solid var(--bor);background:var(--bg);color:var(--fg);font:inherit;font-size:15px}
.fp-cant{display:flex;align-items:center;border:1px solid var(--bor);border-radius:6px;min-height:48px}.fp-cant button{width:44px;height:46px;border:0;background:transparent;font-size:18px;cursor:pointer}.fp-cant output{min-width:28px;text-align:center;font-weight:700}
/* 3. historia */
.fp-hist{position:relative;height:200svh}
.fp-hfijo{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center}
.fp-hbg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.fp-hvelo{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,.38),rgba(0,0,0,.74))}
.fp-hcirc{position:relative;width:min(90vw,620px);aspect-ratio:1;display:grid;place-items:center;color:#fff}
.fp-anillo{position:absolute;inset:0;width:100%;height:100%;font-family:var(--fl);font-size:13px;letter-spacing:.32em;fill:#fff}
@media (prefers-reduced-motion:no-preference){.fp-anillo{animation:fp-gira 60s linear infinite}@keyframes fp-gira{to{transform:rotate(360deg)}}.fp-hbg{animation:fp-zoom 30s ease-in-out infinite alternate}@keyframes fp-zoom{from{transform:scale(1)}to{transform:scale(1.1)}}}
.fp-hin{width:72%;text-align:center;display:grid;justify-items:center;gap:12px}.fp-hin .fp-h2{margin:0;color:#fff}.fp-hin p{font-size:15px;line-height:1.65;margin:0 auto}
.fp-mas,.fp-lee{background:transparent;border:0;border-bottom:1px solid currentColor;font-family:var(--fl);text-transform:uppercase;letter-spacing:.16em;font-size:13px;padding:6px 0;min-height:44px;cursor:pointer;justify-self:start}
.fp-hin .fp-mas{justify-self:center}
/* ventanas */
.fp-dlg{border:0;padding:0;border-radius:10px;max-width:min(92vw,620px);width:100%;margin:auto;background:var(--bg);color:var(--fg)}
.fp-dlg::backdrop{background:rgba(0,0,0,.7)}
.fp-dlg-in{position:relative;padding:44px 28px 28px;display:grid;gap:12px}.fp-dlg h3{font-family:var(--ft);font-size:clamp(28px,4vw,44px);text-transform:lowercase;line-height:1}
.fp-x{position:absolute;right:10px;top:10px;width:44px;height:44px;border-radius:50%;border:1px solid var(--bor);background:transparent;cursor:pointer}
@media (prefers-reduced-motion:no-preference){.fp-dlg[open]{animation:fp-in .25s ease both}@keyframes fp-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}}
/* 4. guía */
.fp-guia{padding:clamp(80px,10vw,140px) 0 clamp(60px,8vw,100px);position:relative;background:var(--bg)}
.fp-tabs{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin-bottom:28px}
.fp-tab{min-height:44px;padding:0 18px;border-radius:4px;border:0;background:var(--card);color:var(--soft);cursor:pointer;font-size:14px}.fp-tab[aria-selected="true"]{background:#000;color:#fff}
.fp-panel+.fp-panel{margin-top:48px}.fp-ptit{font-family:var(--fl);text-transform:uppercase;letter-spacing:.14em;font-size:15px;margin-bottom:12px}
html.fp-js .fp-panel[hidden]{display:none}html.fp-js .fp-tabs~.fp-panel .fp-ptit{display:none}html.fp-js .fp-tabs~.fp-panel+.fp-panel{margin-top:0}
.fp-pgrid{display:grid;grid-template-columns:1fr;gap:14px}
.fp-pfoto{margin:0;background:#000;aspect-ratio:4/3;overflow:hidden;display:grid;place-items:center}.fp-pfoto img{width:100%;height:100%;object-fit:cover}
.fp-pfoto.recorte{background:radial-gradient(ellipse at 50% 45%,color-mix(in srgb,var(--fg) 14%,var(--bg)),#000 75%)}.fp-pfoto.recorte img{width:auto;height:86%;object-fit:contain;filter:drop-shadow(0 20px 26px rgba(0,0,0,.6))}
.fp-pcard{background:#000;color:#fff;padding:24px 22px}.fp-pk{font-weight:700;margin-bottom:10px}
.fp-plist{list-style:none;columns:1;column-gap:28px}.fp-plist li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;break-inside:avoid;font-size:15px}.fp-plist small{display:block;color:#bdb8b0;font-size:13px}.fp-plist em{font-style:normal;font-weight:700;white-space:nowrap}
.fp-tira{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;margin-top:14px;border-block:1px solid var(--bor)}.fp-tira li{flex:1 1 160px;text-align:center;padding:14px 10px;font-family:var(--fl);text-transform:uppercase;letter-spacing:.12em;font-size:13px;color:var(--soft)}.fp-tira li+li{border-left:1px solid var(--bor)}
.fp-menus{display:flex;gap:10px;overflow-x:auto;margin-top:26px;padding-bottom:6px}.fp-menus a{flex:0 0 min(60%,260px)}
.fp-docs{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:20px}.fp-lin{background:transparent;color:var(--fg);border:1px solid var(--bor)}
.fp-listo{display:grid;justify-items:center;gap:14px;margin-top:clamp(48px,7vw,90px)}.fp-listo-t{font-family:var(--fl);font-weight:600;text-transform:uppercase;font-size:clamp(30px,4vw,52px);letter-spacing:.02em;line-height:1;max-width:none}
@media (min-width:900px){.fp-pgrid{grid-template-columns:1.15fr 1fr}.fp-pfoto{aspect-ratio:auto;min-height:380px}.fp-plist{columns:2}}
/* 5. en claro */
.fp-claros{padding:clamp(80px,10vw,130px) 0;background:linear-gradient(color-mix(in srgb,var(--bg) 80%,#000),var(--bg))}
.fp-cols{list-style:none;display:grid;grid-template-columns:1fr;border-top:1px solid var(--bor)}
.fp-colu{border-bottom:1px solid var(--bor)}
.fp-cb{width:100%;display:grid;gap:4px;text-align:left;background:transparent;border:0;padding:18px 4px;cursor:pointer;min-height:44px}
.fp-ck{font-family:var(--fl);text-transform:uppercase;letter-spacing:.14em;font-size:12px;color:var(--soft)}.fp-cv{font-family:var(--fl);font-weight:600;text-transform:uppercase;font-size:clamp(17px,1.6vw,22px);letter-spacing:.04em;line-height:1.2}
.fp-colu:not(.abierta) .fp-cv{color:var(--soft)}
.fp-cd{padding:0 4px 20px}.fp-cd p{font-size:15px;max-width:48ch}
html.fp-js .fp-colu:not(.abierta) .fp-cd{display:none}
@media (min-width:900px){
 .fp-cols{grid-auto-flow:column;grid-auto-columns:1fr;border:0}
 .fp-colu{border:0;border-left:1px solid var(--bor)}
 html.fp-js .fp-cols{display:flex}html.fp-js .fp-colu{flex:1 1 0;transition:flex .4s}html.fp-js .fp-colu.abierta{flex:2.6 1 0;border-left:3px solid var(--acc)}
 .fp-cb{padding:6px 14px 14px}.fp-cd{padding:0 14px}
}
/* 6. reseñas */
.fp-resenas{padding:clamp(80px,10vw,130px) 0}
.fp-rbar{display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid var(--bor);margin-bottom:28px}.fp-rbar>span{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;font-family:var(--fl);text-transform:uppercase;letter-spacing:.14em;font-size:13px}.fp-rbar>span+span{border-left:1px solid var(--bor)}
.fp-rb{width:44px;height:44px;border-radius:50%;border:1px solid var(--bor);background:transparent;font-size:22px;cursor:pointer}
.fp-rlist{list-style:none;display:flex;gap:28px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:6px}.fp-rlist::-webkit-scrollbar{display:none}
.fp-rev{flex:0 0 min(82vw,300px);scroll-snap-align:start;display:flex;flex-direction:column;gap:8px}
.fp-rt{font-weight:700;font-size:17px}.fp-rx{font-size:15px;color:var(--soft)}.fp-rn{font-weight:700;font-size:18px;margin-top:auto;padding-top:10px}.fp-rs{color:var(--soft);font-size:14px}
.fp-cap figure{margin:0}.fp-cap img{border-radius:8px}
/* 7. sellos, va bien con, pie */
.fp-sellos{padding:clamp(40px,6vw,70px) 0}.fp-sl{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(18px,4vw,44px)}
.fp-sello{position:relative;width:132px;height:132px;display:grid;place-items:center}.fp-sring{position:absolute;inset:0;width:100%;height:100%;font-family:var(--fl);font-size:9.5px;letter-spacing:.18em;fill:currentColor}.fp-sello .fp-ico{width:34px;height:34px}
.fp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (prefers-reduced-motion:no-preference){.fp-sring{transition:transform 1.2s ease}.fp-sello:hover .fp-sring{transform:rotate(120deg)}}
.fp-pares{background:var(--crema);color:var(--tinta);padding:clamp(56px,8vw,96px) 0}
.fp-pa-h{display:flex;align-items:center;gap:20px;font-family:var(--ft);font-size:clamp(26px,3vw,40px);text-transform:lowercase;margin-bottom:34px}.fp-pa-h::before,.fp-pa-h::after{content:"";flex:1;border-top:1px solid currentColor}
.fp-plist2{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:28px;text-align:center}
.fp-plist2 figure{margin:0 0 12px;aspect-ratio:4/5;display:grid;place-items:center;overflow:hidden}.fp-plist2 figure img{width:100%;height:100%;object-fit:cover}.fp-plist2 figure.recorte img{width:auto;height:92%;object-fit:contain;filter:drop-shadow(0 16px 18px rgba(0,0,0,.25))}
.fp-pan{font-family:var(--fl);font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin:0 auto}.fp-pap{font-weight:700;margin:0 auto}
.fp-pie{background:#000;color:#fff;padding:clamp(60px,8vw,100px) 0}.fp-pie .fp-wrap{display:grid;gap:36px}.fp-pie-a{display:grid;justify-items:center;text-align:center}.fp-pie .fp-intro-t{color:#cfcac2;margin-bottom:18px}
.fp-pie .datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:22px}.fp-pie .datos p{display:flex;flex-direction:column;gap:4px;font-size:15px}.fp-pie .datos b{font-family:var(--fl);text-transform:uppercase;letter-spacing:.14em;font-size:13px;font-weight:600;color:#cfcac2}
.fp-redes{display:flex;gap:14px;flex-wrap:wrap}
.fp-pie .mapa{margin-top:10px;border-radius:8px;overflow:hidden}
footer.fp-f{background:#000;color:#9f9a92;text-align:center;font-size:13px;padding:0 20px 28px}.fp-guia,.fp-claros,.fp-resenas{scroll-margin-top:60px}
.etq{position:fixed;left:16px;bottom:92px;z-index:30;background:#111;color:#fff;font:700 14px/1 var(--fc);padding:9px 12px;border-radius:999px}
/* material extra que agregue la validación */
#mas{padding:60px 0}#mas .wrap{max-width:1200px;margin:0 auto;padding:0 var(--margen)}#mas h2{font-family:var(--ft);font-size:clamp(30px,4vw,48px);text-transform:lowercase;text-align:center;margin-bottom:22px}
@media (max-width:899px){.fp-centro{aspect-ratio:auto;border-radius:28px;width:100%}}
@media (max-width:520px){.fp-col{grid-template-columns:minmax(0,1fr)}}
@media (max-width:760px){header.barra nav{display:none}.fp-rbar{grid-template-columns:1fr 1fr}.fp-rbar>span:nth-child(2){display:none}.fp-pedido{gap:8px}.fp-sel{flex-basis:100%}.fp-pbtn{flex:1}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.fp-hist{height:auto}.fp-hfijo{position:relative;min-height:100svh;height:auto;padding:60px 0}}
`;

/** Para la revisión visual: mide la página quieta (escena e historia en orden de lectura, sin barra de pedido). */
export const CSS_REVISION_FICHA = 'html.fp-js .fp-esc{height:auto!important}html.fp-js .fp-stage{position:relative!important;height:auto!important;min-height:100svh!important;padding:100px var(--margen) 40px!important}html.fp-js .fp-tit,html.fp-js .fp-prod,html.fp-js .fp-res{position:relative!important;inset:auto!important;top:auto!important;opacity:1!important;transform:none!important}html.fp-js .fp-dato,html.fp-js .fp-centro{opacity:1!important;transform:none!important}.fp-hist{height:auto!important}.fp-hfijo{position:relative!important;height:auto!important;min-height:100svh}.fp-anillo,.fp-hbg{animation:none!important}.fp-pedido{display:none!important}.fp-dlg{display:none!important}';

/** Script mínimo, sin dependencias. */
export const JS_FICHA = `<script>(function(){var H=document.documentElement;H.classList.add('fp-js');
var mov=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var $=function(s,c){return(c||document).querySelector(s)},$$=function(s,c){return[].slice.call((c||document).querySelectorAll(s))};
var barra=$('header.barra'),esc=$('.fp-esc'),ped=$('.fp-pedido'),pie=$('#contacto'),tk=false;
function mide(){tk=false;if(barra)barra.classList.toggle('solida',scrollY>40);
 if(esc&&!mov){var r=esc.getBoundingClientRect(),rec=Math.max(1,esc.offsetHeight-innerHeight),p=Math.min(1,Math.max(0,-r.top/rec));esc.style.setProperty('--p',p.toFixed(3));esc.classList.toggle('res',p>.4)}
 if(ped&&pie){ped.classList.toggle('fuera',pie.getBoundingClientRect().top<innerHeight-40)}}
function pide(){if(!tk){tk=true;requestAnimationFrame(mide)}}
addEventListener('scroll',pide,{passive:true});addEventListener('resize',pide);mide();
var cc=document.getElementById('fp-centro-c'),orig=cc?cc.innerHTML:'',dbs=$$('.fp-db'),fijo=null;
function muestra(b){var t=document.getElementById('fp-d'+b.getAttribute('data-k'));if(!t||!cc)return;cc.innerHTML=t.innerHTML;dbs.forEach(function(x){x.classList.toggle('on',x===b)})}
function vuelve(){if(fijo||!cc)return;cc.innerHTML=orig;dbs.forEach(function(x){x.classList.remove('on')})}
dbs.forEach(function(b){b.addEventListener('mouseenter',function(){muestra(b)});b.addEventListener('focus',function(){muestra(b)});b.addEventListener('mouseleave',vuelve);b.addEventListener('blur',vuelve);
 b.addEventListener('click',function(){fijo=fijo===b?null:b;if(fijo)muestra(b);else vuelve()})});
$$('[data-dlg]').forEach(function(b){var d=document.getElementById(b.getAttribute('data-dlg'));if(!d||typeof d.showModal!=='function')return;b.addEventListener('click',function(){d.showModal()});var x=$('.fp-x',d);if(x)x.addEventListener('click',function(){d.close()});d.addEventListener('click',function(e){if(e.target===d)d.close()})});
var tabs=$$('.fp-tab'),pans=$$('.fp-panel');
function elige(k){tabs.forEach(function(t,j){t.setAttribute('aria-selected',j===k?'true':'false');t.tabIndex=j===k?0:-1});pans.forEach(function(p,j){p.hidden=j!==k})}
if(tabs.length>1&&pans.length===tabs.length){elige(0);tabs.forEach(function(t,j){t.addEventListener('click',function(){elige(j)});t.addEventListener('keydown',function(e){var d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(d){var k=(j+d+tabs.length)%tabs.length;elige(k);tabs[k].focus();e.preventDefault()}})})}
$$('.fp-colu').forEach(function(li,_,all){var b=$('.fp-cb',li);b.addEventListener('click',function(){all.forEach(function(o){var on=o===li;o.classList.toggle('abierta',on);$('.fp-cb',o).setAttribute('aria-expanded',on?'true':'false')})})});
var rl=$('.fp-rlist');$$('.fp-rb').forEach(function(b){b.addEventListener('click',function(){if(rl)rl.scrollBy({left:(+b.getAttribute('data-d'))*rl.clientWidth*.9,behavior:mov?'auto':'smooth'})})});
if(ped){var sel=$('select',ped),out=$('output',ped),btn=$('.fp-pbtn',ped),num=ped.getAttribute('data-wa'),n=1,base=$('.fp-pt',btn).textContent;
 function arma(){if(!sel)return;var o=sel.options[sel.selectedIndex],pr=+o.getAttribute('data-p'),nom=o.getAttribute('data-n');if(out)out.textContent=n;
  $('.fp-pt',btn).textContent=pr?('Pedir · $'+(pr*n)):base;if(num)btn.href='https://wa.me/'+num+'?text='+encodeURIComponent('Hola, quiero pedir '+n+' × '+nom)}
 $$('[data-c]',ped).forEach(function(b){b.addEventListener('click',function(){n=Math.max(1,Math.min(20,n+(+b.getAttribute('data-c'))));arma()})});if(sel)sel.addEventListener('change',arma);arma()}
})()</script>`;
