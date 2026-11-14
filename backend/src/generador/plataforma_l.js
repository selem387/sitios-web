// Opción L "Plataforma" (14-nov-2026). Página completa y propia, reconstruida SOLO a partir del sitio modelo antigravity.google
// (estructura, medidas, tipografía y comportamiento), con el contenido y las fotos del cliente en lugar del video y las capturas.
// No usa secciones de la plantilla general ni de otras opciones. Sin librerías: CSS y un script propio.
//
// Mapa modelo → cliente:
//   barra blanca translúcida + aviso con insignia      → logo, secciones, botón WhatsApp + promoción u horario
//   portada centrada (marca, titular grande, botón)    → logo, titular, CTA; en celular, tarjeta de contacto (igual que el modelo)
//   partículas que siguen al mouse                     → efecto de mouse configurable por giro (puntos, luz, distorsión, tinta)
//   marco negro grande con video y botón de play       → video del cliente o sus fotos en secuencia, con botón de pausa
//   fila de íconos en arco + frase grande              → íconos en arco + frase del negocio (con su foto si mandó una)
//   explorador de productos (texto / tarjeta de medio) → sus servicios o diapositivas, cada uno con su foto
//   "Creado para…" + carrusel de casos con video       → su trabajo: carrusel de fotos con pie
//   dos columnas "Para desarrolladores / organizaciones"→ agenda por WhatsApp / paquetes y precios
//   carrusel del blog con miniaturas degradadas        → paquetes con precio, miniatura degradada con el nombre del grupo
//   tarjeta del boletín con temas en píldoras          → contacto: elige el tema, escribe tu nombre y se abre WhatsApp
//   bloque negro de descarga con partículas            → bloque final con el CTA
//   pie con columnas y la marca gigante                → secciones, contacto, nombre del negocio gigante, redes
import { agruparOferta, giroCorto, redes } from './propuestas_general.js';
import { direccionTexto } from './datos_brief.js';
import { iconoRed } from './iconos_redes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FAMILIA_L = 'Google Sans Flex';
export const parPlataforma = (pares = []) => ({ titulos: FAMILIA_L, cuerpo: FAMILIA_L, estilo: pares[0]?.estilo || 'minimalista', ok: true });
const URL_FUENTE = 'https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,400..600&display=swap';

/* ---------- Efecto de mouse (configurable) ---------- */
export const EFECTOS_L = ['puntos', 'luz', 'distorsion', 'tinta'];
export const EFECTO_POR_GIRO = { servicios: 'puntos', educacion: 'puntos', generico: 'puntos', clinica: 'luz', oficios: 'luz', inmobiliaria: 'distorsion', turismo: 'distorsion', tienda: 'tinta' };
/** cliente (brief.marca.efecto_mouse) → variable OPCION_L_EFECTO → giro → puntos. */
export function efectoParaBrief(brief = {}, env = process.env) {
  const ok = (v) => (EFECTOS_L.includes(String(v || '').toLowerCase()) ? String(v).toLowerCase() : null);
  return ok(brief.marca?.efecto_mouse) || ok(env.OPCION_L_EFECTO) || EFECTO_POR_GIRO[brief.negocio?.arquetipo] || 'puntos';
}

/* ---------- Color: el modelo es casi monocromo (tinta #121317, gris #45474D, superficie #F8F9FC); la marca va en efectos y miniaturas ---------- */
const hex = (h) => { let s = String(h || '').replace('#', '').trim(); if (s.length === 3) s = s.split('').map((c) => c + c).join(''); return /^[0-9a-f]{6}$/i.test(s) ? [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) : null; };
const aHex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mezcla = (a, b, t) => aHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const lum = (h) => { const c = hex(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const saturacion = (h) => { const c = hex(h); const mx = Math.max(...c), mn = Math.min(...c); return mx === 0 ? 0 : (mx - mn) / mx; };

export function paletaPlataforma(colores = []) {
  const validos = colores.map((c) => (typeof c === 'string' ? c : c?.hex)).filter((c) => hex(c));
  const base = [...validos].sort((a, b) => saturacion(b) - saturacion(a))[0] || '#3B5BDB';
  let marca = base; for (let i = 0; i < 14 && contraste(marca, '#FFFFFF') < 3; i++) marca = mezcla(marca, '#000000', 0.12);
  const tinta = mezcla('#121317', base, 0.06);
  const gris = mezcla('#45474D', base, 0.05);
  return {
    bg: '#FFFFFF', fg: tinta, primary: marca, muted: mezcla('#F8F9FC', base, 0.035), soft: gris, border: mezcla('#E6E8EE', base, 0.04),
    surface: mezcla('#F8F9FC', base, 0.035), pill: mezcla('#F1F3F7', base, 0.05), base,
    claro: mezcla(base, '#FFFFFF', 0.45), oscuro: mezcla(base, '#05060A', 0.82), onPrimary: contraste(marca, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#121317',
  };
}

/* ---------- Íconos (trazo, como la fila del modelo) ---------- */
const P = {
  chispa: 'M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7Z',
  corazon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  estrella: 'm12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6L12 4Z',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2',
  pin: 'M12 21s-6-5.6-6-10.5a6 6 0 1 1 12 0C18 15.4 12 21 12 21Zm0-8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  chat: 'M5 5h14v10H9l-4 4V5Z',
  calendario: 'M5 6h14v13H5zM5 10h14M9 4v4M15 4v4',
  check: 'm5 12.5 4.2 4L19 7',
  regalo: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3-4.5-.5.4 1.4 4.5.5 4.5.5Zm0 0c1.5-3 5-3 4.5-.5-.4 1.4-4.5.5-4.5.5Z',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  sonrisa: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 14.5s1.2 1.8 3.5 1.8 3.5-1.8 3.5-1.8M9 9.5h.01M15 9.5h.01',
  escudo: 'M12 3 5 6v5c0 4.4 3 8.2 7 10 4-1.8 7-5.6 7-10V6l-7-3Z',
  flecha: 'M5 12h13m-5-5 5 5-5 5',
  mano: 'M7 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5V4.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V12m0-3a1.5 1.5 0 0 1 3 0v4.5c0 4-2.7 7-6.5 7-2.8 0-4.4-1.3-6-3.5L4.4 14a1.5 1.5 0 0 1 2.4-1.8L7 12.5',
};
const ico = (n, w = 22) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n]}"/></svg>`;
const ICO_WA = '<svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.3c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.3Z"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
const CHEV_I = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>';
const CHEV_D = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

/* ---------- Datos ---------- */
const corta = (t, max) => { let s = String(t || '').replace(/\s+/g, ' ').trim(); if (s.length <= max) return s; s = s.slice(0, max); return `${s.slice(0, s.lastIndexOf(' ') > max * 0.6 ? s.lastIndexOf(' ') : max).replace(/[,;:.\s]+$/, '')}…`; };
const sinNegritas = (t) => String(t || '').replace(/\*\*/g, '');
const primerParrafo = (t) => sinNegritas(String(t || '').replace(/\r/g, '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)[0] || '');
const precioNum = (p) => { const m = String(p || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
const conWa = (wa, texto) => { if (!wa) return '#contacto'; try { const u = new URL(wa); u.searchParams.set('text', texto); return u.toString(); } catch { return wa; } };
const esFoto = (x) => x?.url && !/\.(mp4|mov|webm|m4v|pdf|docx?|xlsx?)(\?|$)/i.test(x.url) && !/^(video|documento)/.test(x.tipo || '');
const buena = (x) => esFoto(x) && !x.captura && x.calidad !== 'regular' && !x.recorte;

/**
 * Página completa de la opción L.
 * { brief, mat, v: {titular, subtitulo, cta}, textos, letra, colores: [hex], efecto, wa, tel, nombreOpcion }
 * → { html, paleta, fuentes, efecto }
 */
export function paginaPlataforma({ brief = {}, mat = {}, v = {}, textos = {}, letra = 'L', colores = [], efecto = null, wa = null, tel = null, nombreOpcion = 'Plataforma' }) {
  const p = paletaPlataforma(colores);
  const neg = brief.negocio || {}, c = brief.contacto || {}, of = brief.oferta || {};
  const nombre = neg.nombre || '';
  const sec = textos.secciones || {};
  const T = { servicios: sec.servicios || 'Servicios', trabajo: sec.trabajo || 'Nuestro trabajo', contacto: sec.contacto || 'Contacto', sobre: sec.sobre || 'Quiénes somos' };
  const titular = v.titular || nombre, cta = v.cta || 'Escríbenos por WhatsApp';
  const giro = giroCorto(neg.giro_texto);
  const horario = c.horario || c.horarios || '';
  const dir = direccionTexto(brief);
  const waHref = wa ? esc(wa) : '#contacto';
  const ext = wa ? ' target="_blank" rel="noopener"' : '';

  /* Fotos: ninguna se repite. */
  const vistos = new Set();
  const pool = [mat.hero, ...(mat.trabajos || []), ...(mat.local || []), ...(mat.equipo || []), ...(mat.otras || [])].filter(buena).filter((x) => !vistos.has(x.url) && vistos.add(x.url));
  const usadas = new Set();
  const tomar = (x) => { if (!x || usadas.has(x.url)) return null; usadas.add(x.url); return x; };
  const siguiente = () => tomar(pool.find((x) => !usadas.has(x.url)));
  const img = (x, { cls = '', eager = false, sizes = '', alt = null } = {}) => `<img${cls ? ` class="${cls}"` : ''} src="${esc(x.url)}" alt="${esc(alt ?? x.alt ?? '')}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}${sizes ? ` sizes="${sizes}"` : ''}${eager ? ' fetchpriority="high"' : ''}>`;

  /* Filas del explorador: diapositivas (texto y foto elegidos juntos) o grupos de la oferta. */
  const grupos = agruparOferta(of.items || []);
  const diapos = (Array.isArray(textos.diapositivas) ? textos.diapositivas : []).filter((d) => d?.titular);
  let filas = diapos.length >= 2
    ? diapos.slice(0, 4).map((d) => ({ titulo: d.titular, texto: d.apoyo || '', foto_url: d.foto_url || null }))
    : grupos.slice(0, 4).map((g) => ({ titulo: g.nombre, texto: corta(g.opciones.map((o) => [o.nombre, o.precio].filter(Boolean).join(' · ')).filter(Boolean).join(' — ') || g.opciones[0]?.detalle?.split('\n')[0] || '', 170), foto_url: null }));
  if (filas.length < 2) filas = [];

  /* Reparto: el marco se queda con la primera foto (más si sobran), luego cada fila del explorador, y el resto va al carrusel. */
  const video = (mat.videos || []).find((x) => x?.url);
  const reservadas = filas.length;
  const marco = [];
  const primera = tomar(pool[0]);
  if (primera) marco.push(primera);
  // Fotos pedidas por las diapositivas: quedan apartadas antes de llenar el marco.
  const pedidas = new Set(filas.map((f) => f.foto_url).filter(Boolean));
  const libresMarco = () => pool.filter((x) => !usadas.has(x.url) && !pedidas.has(x.url));
  const extraMarco = Math.max(0, Math.min(3, libresMarco().length - reservadas - 3));
  for (const x of libresMarco().slice(0, extraMarco)) marco.push(tomar(x));
  for (const f of filas) f.foto = (f.foto_url && tomar(pool.find((x) => x.url === f.foto_url))) || null;
  for (const f of filas) if (!f.foto) f.foto = siguiente();
  const casos = pool.filter((x) => !usadas.has(x.url)).map(tomar).filter(Boolean);

  /* --- Barra y aviso --- */
  const logo = mat.logo?.url ? `<img class="ag-logo" src="${esc(mat.logo.url)}" alt="${esc(nombre)}"${mat.logo.ancho ? ` width="${mat.logo.ancho}" height="${mat.logo.alto}"` : ''}>` : '';
  const marcaBarra = `<a class="ag-marca" href="#inicio">${logo}<span>${esc(nombre)}</span></a>`;
  const nav = [['servicios', T.servicios, filas.length], ['trabajo', T.trabajo, casos.length], ['paquetes', 'Paquetes', grupos.length], ['contacto', T.contacto, true]].filter((x) => x[2]);
  const promo = String(of.promocion_actual || '').trim();
  const aviso = promo || horario
    ? `<div class="ag-aviso" role="region" aria-label="Aviso"><a class="ag-aviso-in" href="${promo ? esc(conWa(wa, `Hola, me interesa la promoción: ${promo}`)) : waHref}"${ext}><span class="ag-insignia">${ico('chispa', 12)}${promo ? 'PROMOCIÓN' : 'HORARIO'}</span><span class="ag-aviso-t">${esc(corta(promo || horario, 90))}</span><span class="ag-aviso-cta">${promo ? 'La quiero' : 'Escríbenos'} ${ico('flecha', 14)}</span></a><button class="ag-aviso-x" type="button" aria-label="Cerrar aviso">×</button></div>`
    : '';
  const barra = `<header class="ag-barra"><div class="ag-barra-in">${marcaBarra}<nav class="ag-nav" aria-label="Secciones">${nav.map(([id, n]) => `<a href="#${id}">${esc(n)}</a>`).join('')}</nav><a class="ag-btn ag-btn-o ag-btn-s" href="${waHref}"${ext}>WhatsApp ${ICO_WA}</a></div>${aviso}</header>`;

  /* --- Portada --- */
  const ef = EFECTOS_L.includes(efecto) ? efecto : 'puntos';
  // Copia decorativa de la foto del marco para el efecto de distorsión (rep-ok: no cuenta como foto repetida). Con otro efecto
  // queda oculta y con carga diferida, así no se descarga, pero permite probar ?efecto=distorsion.
  const fondo = marco[0] ? `<img class="ag-fx-foto rep-ok" src="${esc(marco[0].url)}" alt="" aria-hidden="true" crossorigin="anonymous" loading="${ef === 'distorsion' ? 'eager' : 'lazy'}" decoding="async">` : '';
  const efFinal = ef === 'distorsion' && !fondo ? 'luz' : ef;
  const palabras = String(titular).split(/\s+/).filter(Boolean).map((w, i) => `<span class="ag-w" style="--i:${i}">${esc(w)}</span>`).join(' ');
  const tamH1 = titular.length > 70 ? ' ag-h1-l' : titular.length > 48 ? ' ag-h1-m' : '';
  const tarjeta = `<div class="ag-tarjeta">${ico('chat', 28)}<div><b>${esc(cta)}</b>${horario ? `<span>${esc(horario)}</span>` : giro ? `<span>${esc([giro, neg.ciudad].filter(Boolean).join(' · '))}</span>` : ''}</div><a class="ag-btn ag-btn-l" href="${waHref}"${ext}>${ICO_WA} Escríbenos</a></div>`;
  const portada = `<section class="ag-hero" id="inicio" data-ag-fx="${efFinal}"><div class="ag-fx" aria-hidden="true">${fondo}<canvas></canvas><i class="ag-luz"></i></div>
<div class="ag-hero-in"><p class="ag-sello">${logo}<span>${esc(nombre)}</span></p><h1 class="ag-h1${tamH1}">${palabras}</h1><a class="ag-btn ag-btn-o ag-btn-g ag-solo-esc" href="${waHref}"${ext}>${esc(cta)}</a>${tarjeta}</div></section>`;

  /* --- Marco (video o fotos en secuencia) --- */
  let marcoHTML = '';
  if (video || marco.length) {
    const medios = video
      ? `<video class="ag-m on" src="${esc(video.url)}" ${marco[0] ? `poster="${esc(marco[0].url)}" ` : ''}muted loop playsinline autoplay preload="metadata"></video>${marco.map((x) => img(x, { cls: 'ag-m ag-oculta', sizes: '100vw' })).join('')}`
      : marco.map((x, k) => img(x, { cls: `ag-m${k === 0 ? ' on' : ''}`, eager: k === 0, sizes: '100vw' })).join('');
    const mueve = video || marco.length > 1;
    marcoHTML = `<section class="ag-marco-s" aria-label="${esc(T.trabajo)}"><div class="ag-marco" data-ag-marco>${medios}${mueve ? `<button class="ag-play" type="button" aria-label="Pausar" aria-pressed="false"><svg class="i-pausa" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg><svg class="i-play" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg></button>` : ''}</div></section>`;
  }

  /* --- Arco de íconos + frase --- */
  const nombresIco = ['chispa', 'mano', 'corazon', 'estrella', 'reloj', 'chat', 'calendario', 'check', 'regalo', 'sol', 'pin', 'sonrisa', 'escudo', 'chispa'];
  const arco = `<div class="ag-arco" aria-hidden="true">${nombresIco.map((n, k) => `<span class="ag-ico" style="--k:${k}">${ico(n, n === 'chispa' ? 26 : 22)}</span>`).join('')}</div>`;
  const frase = v.subtitulo || primerParrafo(textos.sobre) || [giro, neg.ciudad].filter(Boolean).join(' en ');
  const fundador = mat.fundador?.url ? tomar(mat.fundador) : null;
  const fraseHTML = frase ? `<section class="ag-frase-s">${arco}<div class="ag-wrap"><p class="ag-frase">${fundador ? `<span class="ag-avatar">${img(fundador, { alt: fundador.alt || nombre })}</span>` : ''}${esc(sinNegritas(frase))}</p></div></section>` : '';

  /* --- Explorador --- */
  const explorador = filas.length
    ? `<section class="ag-expl" id="servicios" aria-label="${esc(T.servicios)}"><div class="ag-wrap">${filas.map((f, k) => `<div class="ag-fila"><div class="ag-fila-t"><h3>${esc(f.titulo)}</h3>${f.texto ? `<p>${esc(f.texto)}</p>` : ''}${k === filas.length - 1 ? `<a class="ag-btn ag-btn-l" href="${grupos.length ? '#paquetes' : waHref}"${grupos.length ? '' : ext}>${grupos.length ? 'Ver paquetes' : esc(cta)}</a>` : ''}</div><div class="ag-fila-m${f.foto ? '' : ' ag-sin'}" style="--n:${k}">${f.foto ? img(f.foto, { sizes: '(min-width:900px) 624px, 100vw' }) : `<span>${esc(f.titulo)}</span>`}</div></div>`).join('')}</div></section>`
    : '';

  /* --- Casos (su trabajo) --- */
  const sobre = primerParrafo(textos.sobre);
  const pieCaso = (x) => corta(String(x.nombre || x.alt || '').split(/[.;]/)[0], 80);
  const casosHTML = casos.length
    ? `<section class="ag-casos" id="trabajo"><div class="ag-wrap"><div class="ag-casos-cab"><h2>${esc(T.trabajo)}</h2>${sobre ? `<p>${esc(corta(sobre, 260))}</p>` : ''}</div>
<div class="ag-car" data-ag-car><div class="ag-car-pista">${casos.map((x, k) => `<figure class="ag-caso">${img(x, { sizes: '(min-width:900px) 848px, 88vw' })}<figcaption><b>${esc(pieCaso(x) || `${T.trabajo} ${k + 1}`)}</b><a href="${esc(conWa(wa, `Hola, vi esta foto en su página (${pieCaso(x) || T.trabajo}) y quiero información.`))}"${ext}>Quiero algo así ${CHEV}</a></figcaption></figure>`).join('')}</div>${casos.length > 1 ? `<div class="ag-flechas"><button type="button" class="ag-ant" aria-label="Anterior">${CHEV_I}</button><button type="button" class="ag-sig" aria-label="Siguiente">${CHEV_D}</button></div>` : ''}</div></div></section>`
    : '';

  /* --- Dos columnas --- */
  const items = (of.items || []).filter((x) => x?.nombre);
  const precios = items.map((x) => precioNum(x.precio_o_rango || x.precio)).filter((x) => x != null && x > 0);
  const desde = precios.length && of.mostrar_precios !== false ? `Desde $${Math.min(...precios).toLocaleString('es-MX')}` : items.length ? `${items.length} opciones para elegir` : '';
  const info = (textos.info || []).filter(Boolean);
  const col = (etq, h, sub, boton) => `<div class="ag-col"><p class="ag-etq">${esc(etq)}</p><p class="ag-col-h">${esc(h)}</p>${sub ? `<p class="ag-col-s">${esc(sub)}</p>` : ''}${boton}</div>`;
  const dos = `<section class="ag-dos"><div class="ag-dos-in"><div class="ag-col-p" aria-hidden="true"></div>${col(info[0] || giro || 'WhatsApp', cta, info[1] || (horario ? `Atendemos ${horario.charAt(0).toLowerCase()}${horario.slice(1)}` : 'Te respondemos por WhatsApp'), `<a class="ag-btn ag-btn-o" href="${waHref}"${ext}>Escríbenos</a>`)}${grupos.length ? col(promo ? 'Promoción' : `${grupos.length} ${grupos.length === 1 ? 'categoría' : 'categorías'}`, 'Paquetes y precios', desde, '<a class="ag-btn ag-btn-l" href="#paquetes">Ver paquetes</a>') : col('Visítanos', dir ? 'Dónde estamos' : T.sobre, dir || neg.ciudad || '', `<a class="ag-btn ag-btn-l" href="#contacto">${esc(T.contacto)}</a>`)}</div></section>`;

  /* --- Paquetes (carrusel tipo blog) --- */
  const idxGrupo = (g) => grupos.findIndex((x) => x.nombre === g);
  const tarjetas = grupos.flatMap((g) => g.opciones.map((o) => ({ g: g.nombre, ...o })));
  const paquetes = tarjetas.length
    ? `<section class="ag-paq" id="paquetes"><div class="ag-wrap"><div class="ag-paq-cab"><h2>${esc(T.servicios)}</h2><a class="ag-btn ag-btn-l" href="${waHref}"${ext}>Pedir informes</a></div>
<div class="ag-car" data-ag-car><div class="ag-car-pista ag-paq-pista">${tarjetas.map((o) => { const k = Math.max(0, idxGrupo(o.g)); const lineas = String(o.detalle || '').split('\n').map((x) => x.trim()).filter(Boolean); const inc = lineas.filter((x) => /^[-•*]\s+/.test(x)).map((x) => x.replace(/^[-•*]\s+/, '')); const intro = lineas.find((x) => !/^[-•*]\s+/.test(x)) || ''; const titulo = o.nombre || o.g; return `<article class="ag-tj"><div class="ag-tj-img" style="--h:${(k * 67 + 200) % 360};--k:${k % 4}"><span>${esc(String(o.g).replace(/^[^\p{L}\d]+/u, ''))}</span></div><h3>${esc(titulo)}</h3><p class="ag-tj-meta">${o.precio && of.mostrar_precios !== false ? `<b>${esc(o.precio)}</b>` : ''}${o.nombre ? `<span>${esc(String(o.g).replace(/^[^\p{L}\d]+/u, ''))}</span>` : ''}</p>${intro ? `<p class="ag-tj-d">${esc(corta(intro, 120))}</p>` : ''}${inc.length ? `<ul>${inc.slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<a class="ag-tj-a" href="${esc(conWa(wa, `Hola, quiero información de: ${titulo}${o.nombre ? ` (${o.g})` : ''}`))}"${ext}>Pedir informes ${CHEV}</a></article>`; }).join('')}</div>${tarjetas.length > 3 ? `<div class="ag-flechas"><button type="button" class="ag-ant" aria-label="Anterior">${CHEV_I}</button><button type="button" class="ag-sig" aria-label="Siguiente">${CHEV_D}</button></div>` : ''}</div></div></section>`
    : '';

  /* --- Contacto (tarjeta tipo boletín) --- */
  const temas = grupos.length ? grupos.map((g) => g.nombre) : items.map((x) => x.nombre);
  const temasHTML = [['Información general', true], ...temas.slice(0, 6).map((t) => [t, false])].map(([t, on], k) => `<label class="ag-tema"><input type="radio" name="ag-tema" value="${esc(t)}"${on ? ' checked' : ''}><span>${ico('check', 14)}${esc(String(t).replace(/^[^\p{L}\d]+/u, ''))}</span></label>`).join('');
  const redesHTML = redes(c).filter(([, u]) => u).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(n)}">${iconoRed(n)}</a>`).join('');
  const datos = [tel ? `Tel. ${tel}` : '', horario, dir].filter(Boolean);
  const contacto = `<section class="ag-cont-s" id="contacto"><div class="ag-wrap"><aside class="ag-cont"><h2>${esc(T.contacto)}</h2><p class="ag-cont-sub">${esc(wa ? 'Elige el tema, escribe tu nombre y te contestamos por WhatsApp.' : 'Elige el tema y escríbenos.')}</p>
<form class="ag-form" data-wa="${esc(wa || '')}" data-negocio="${esc(nombre)}"><fieldset><legend class="ag-oculto">Tema</legend><div class="ag-temas">${temasHTML}</div></fieldset><div class="ag-campo"><label class="ag-oculto" for="ag-nombre">Tu nombre</label><input id="ag-nombre" name="nombre" autocomplete="name" placeholder="Tu nombre"><button class="ag-btn ag-btn-o" type="submit">${wa ? 'Enviar por WhatsApp' : 'Enviar'}</button></div></form>${datos.length ? `<p class="ag-cont-datos">${datos.map(esc).join(' · ')}</p>` : ''}</aside></div></section>`;

  /* --- Bloque final oscuro --- */
  const final = `<section class="ag-final" data-ag-fx="puntos" data-ag-oscuro><div class="ag-fx" aria-hidden="true"><canvas></canvas></div><div class="ag-final-in"><p class="ag-final-h">${esc(cta)}${nombre ? ` con ${esc(nombre)}` : ''}</p><a class="ag-btn ag-btn-b" href="${waHref}"${ext}>${ICO_WA} Escríbenos</a></div></section>`;

  /* --- Pie --- */
  const n = Math.max(6, nombre.length);
  const marcasPie = (mat.logos_extra || []).filter((x) => x?.url).map((x) => `<img class="pie-marca" src="${esc(x.url)}" alt="${esc(nombre)}" loading="lazy"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}>`).join('');
  const pie = `<footer class="ag-pie"><div class="ag-wrap"><div class="ag-pie-top"><p class="ag-pie-t">${esc(corta(titular, 60))}</p><div class="ag-pie-col"><p>Secciones</p>${nav.map(([id, t]) => `<a href="#${id}">${esc(t)}</a>`).join('')}</div><div class="ag-pie-col"><p>${esc(T.contacto)}</p>${wa ? `<a href="${waHref}"${ext}>WhatsApp</a>` : ''}${tel ? `<a href="tel:${esc(String(c.whatsapp || c.telefono || '').replace(/\D/g, ''))}">${esc(tel)}</a>` : ''}${horario ? `<span>${esc(horario)}</span>` : ''}${dir ? `<span>${esc(dir)}</span>` : ''}</div></div>
<p class="ag-gigante" style="font-size:min(${(170 / n).toFixed(2)}vw,${Math.round(1100 / n * 1.6)}px)" aria-hidden="true"><span>${esc(nombre)}</span></p></div>
<div class="ag-pie-bajo"><div class="ag-wrap ag-pie-bajo-in"><span class="ag-pie-marca">${logo}${marcasPie ? `<span class="pie-marcas">${marcasPie}</span>` : ''}</span><span>© ${new Date().getFullYear()} ${esc(nombre)} · Propuesta ${esc(letra)}: ${esc(nombreOpcion)}</span><span class="ag-redes">${redesHTML}</span></div></div></footer>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(nombre)} · Propuesta ${esc(letra)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${URL_FUENTE}">
<style>:root{--bg:${p.bg};--fg:${p.fg};--gris:${p.soft};--p:${p.primary};--on:${p.onPrimary};--sup:${p.surface};--pil:${p.pill};--bor:${p.border};--claro:${p.claro};--osc:${p.oscuro};--base:${p.base}}${CSS_PLATAFORMA}</style></head>
<body class="l-plataforma">${barra}<main>${portada}${marcoHTML}${fraseHTML}${explorador}${casosHTML}${dos}${paquetes}${contacto}${final}</main>${pie}
<span class="etq">Propuesta ${esc(letra)}</span>${JS_PLATAFORMA}</body></html>`;
  return { html, paleta: p, fuentes: parPlataforma(), efecto: efFinal };
}

export const CSS_PLATAFORMA = `
*{box-sizing:border-box;margin:0}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}body{font-family:'Google Sans Flex','Google Sans',system-ui,-apple-system,'Segoe UI',sans-serif;font-variation-settings:'opsz' 24;color:var(--fg);background:var(--bg);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:clip}
img,video{max-width:100%;height:auto;display:block}a{color:inherit}button{font:inherit;color:inherit}
section[id]{scroll-margin-top:100px}
.ag-wrap{max-width:1440px;margin:0 auto;padding:0 clamp(20px,5vw,72px)}
.ag-oculto{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
fieldset{border:0;padding:0;min-width:0}
/* Botones (modelo: píldora 44px, 15px/450) */
.ag-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 24px;border-radius:9999px;font-size:15px;font-weight:450;letter-spacing:.01em;text-decoration:none;border:0;cursor:pointer;white-space:nowrap;transition:transform .2s,background .2s,box-shadow .2s}
.ag-btn:hover{transform:translateY(-1px)}.ag-btn:active{transform:none}
.ag-btn-o{background:var(--fg);color:#fff}.ag-btn-o:hover{background:color-mix(in srgb,var(--fg) 86%,var(--p))}
.ag-btn-l{background:var(--pil);color:var(--fg);box-shadow:inset 0 0 0 1px var(--bor)}.ag-btn-l:hover{background:color-mix(in srgb,var(--pil) 80%,var(--bor))}
.ag-btn-b{background:#fff;color:var(--fg)}
.ag-btn-g{font-size:18px;min-height:48px;padding:12px 26px}
.ag-btn-s{min-height:36px;padding:7px 16px;font-size:15px}
a:focus-visible,button:focus-visible,input:focus-visible,.ag-tema input:focus-visible+span{outline:2px solid var(--p);outline-offset:3px}
/* Barra */
.ag-barra{position:sticky;top:0;z-index:40;background:rgba(255,255,255,.85);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid var(--bor)}
.ag-barra-in{display:flex;align-items:center;gap:32px;height:52px;padding:0 clamp(16px,5vw,72px)}
.ag-marca{display:flex;align-items:center;gap:8px;text-decoration:none;font-size:18px;font-weight:500;letter-spacing:-.01em;min-width:0}.ag-marca span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-logo{height:28px;width:auto;max-width:120px;object-fit:contain;border-radius:4px}
.ag-nav{display:flex;gap:4px;flex:1}.ag-nav a{text-decoration:none;color:var(--gris);font-size:16px;padding:6px 14px;border-radius:999px;transition:color .2s,background .2s}.ag-nav a:hover{color:var(--fg);background:var(--sup)}
.ag-aviso{display:flex;align-items:center;justify-content:center;gap:8px;height:40px;background:var(--sup);border-top:1px solid var(--bor);padding:0 44px 0 16px;position:relative}
.ag-aviso-in{display:flex;align-items:center;gap:10px;text-decoration:none;min-width:0}
.ag-insignia{display:inline-flex;align-items:center;gap:5px;background:var(--fg);color:#fff;font-size:11px;font-weight:600;letter-spacing:.04em;padding:3px 10px;border-radius:999px;flex:none}
.ag-aviso-t{font-size:13.5px;font-weight:450;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-aviso-cta{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:550;padding-left:10px;border-left:1px solid var(--bor);flex:none}
.ag-aviso-x{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:999px;border:0;background:none;color:rgba(18,19,23,.56);font-size:20px;line-height:1;cursor:pointer}
.ag-aviso.cerrado{display:none}
/* Portada */
.ag-hero{position:relative;isolation:isolate;min-height:min(92svh,860px);display:grid;place-items:center;text-align:center;overflow:clip;padding:72px 0 64px}
.ag-fx{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.ag-fx canvas{position:absolute;inset:0;width:100%;height:100%;display:none}
.ag-js [data-ag-fx="puntos"] canvas,.ag-js [data-ag-fx="tinta"] canvas,.ag-js [data-ag-fx].ag-gl canvas{display:block}
.ag-luz{position:absolute;inset:0;display:none;background:radial-gradient(circle 360px at var(--mx,50%) var(--my,40%),color-mix(in srgb,var(--p) 26%,transparent),transparent 72%)}
.ag-js [data-ag-fx="luz"] .ag-luz{display:block}
.ag-fx-foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}
[data-ag-fx="distorsion"] .ag-fx-foto{display:block}[data-ag-fx="distorsion"].ag-gl .ag-fx-foto{visibility:hidden}
[data-ag-fx="distorsion"] .ag-fx::after{content:"";position:absolute;inset:0;background:radial-gradient(70% 60% at 50% 45%,rgba(255,255,255,.9),rgba(255,255,255,.62) 70%,rgba(255,255,255,.4))}
.ag-hero-in{display:grid;justify-items:center;gap:28px;padding:0 clamp(20px,5vw,72px);max-width:1340px}
.ag-sello{display:inline-flex;align-items:center;gap:10px;font-size:clamp(20px,2vw,28px);font-weight:450;letter-spacing:-.01em}.ag-sello .ag-logo{height:clamp(28px,2.6vw,38px)}
.ag-h1{font-size:clamp(40px,5.6vw,80px);font-weight:450;line-height:1.1;letter-spacing:-.035em;text-wrap:balance;max-width:17ch}.ag-h1.ag-h1-m{font-size:clamp(36px,4.8vw,70px);max-width:20ch}.ag-h1.ag-h1-l{font-size:clamp(32px,4vw,58px);max-width:24ch}
.ag-w{display:inline-block}
.ag-js .ag-w{opacity:0;transform:translateY(.35em);filter:blur(6px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1),filter .7s;transition-delay:calc(var(--i)*55ms + 120ms)}
.ag-js .ag-listo .ag-w{opacity:1;transform:none;filter:none}
.ag-tarjeta{display:none;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;text-align:left;background:color-mix(in srgb,var(--sup) 86%,transparent);border:1px solid var(--bor);border-radius:24px;padding:18px 20px;max-width:100%}
.ag-tarjeta>svg{flex:none}.ag-tarjeta div{display:grid;gap:2px;flex:1 1 180px}.ag-tarjeta b{font-weight:550;font-size:16.8px}.ag-tarjeta span{font-size:14.5px;color:var(--gris)}.ag-tarjeta .ag-btn{flex:1 1 100%}
/* Marco */
.ag-marco-s{padding:0 6px}
.ag-marco{position:relative;border-radius:clamp(20px,2.4vw,32px);overflow:hidden;background:#000;aspect-ratio:16/9;max-height:calc(100svh - 60px);width:100%;transform-origin:50% 0;transform:scale(calc(.94 + var(--ag-p,1)*.06));will-change:transform}
.ag-m{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s ease}.ag-m.on{opacity:1}
img.ag-m.on{animation:ag-zoom 9s ease-out both}.ag-oculta{display:none}
@keyframes ag-zoom{from{transform:scale(1.08)}to{transform:scale(1)}}
.ag-play{position:absolute;right:22px;bottom:22px;width:48px;height:48px;border-radius:50%;border:0;background:rgba(0,0,0,.3);color:#fff;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(6px)}
.ag-play .i-play{display:none}.ag-play[aria-pressed="true"] .i-play{display:block}.ag-play[aria-pressed="true"] .i-pausa{display:none}
.ag-pausado img.ag-m.on{animation-play-state:paused}
/* Arco + frase */
.ag-frase-s{padding:clamp(64px,8vw,120px) 0 clamp(72px,9vw,140px);overflow:clip}
.ag-arco{position:relative;height:clamp(150px,13vw,200px);margin-bottom:clamp(64px,9vw,140px);transform:translateX(var(--ag-ax,0px))}
.ag-ico{--n:13;position:absolute;left:calc(var(--k)/var(--n)*100%);top:0;width:clamp(56px,6.8vw,98px);height:clamp(56px,6.8vw,98px);margin-left:calc(clamp(56px,6.8vw,98px)/-2);border-radius:50%;background:var(--sup);box-shadow:inset 0 0 0 1px var(--bor);display:grid;place-items:center;color:var(--fg);
 transform:translateY(calc((var(--k) - 6.5)*(var(--k) - 6.5)/42.25*clamp(50px,7vw,118px)))}
.ag-ico:nth-child(1) svg,.ag-ico:nth-child(14) svg{fill:var(--fg);stroke:none}
.ag-frase{font-size:clamp(28px,3.4vw,48px);font-weight:450;line-height:1.18;letter-spacing:-.025em;max-width:31ch;text-wrap:pretty}
.ag-avatar{display:inline-block;vertical-align:-.12em;width:1.25em;height:1.25em;border-radius:50%;overflow:hidden;margin-right:.3em;box-shadow:0 0 0 3px var(--bg),0 0 0 4px var(--bor)}.ag-avatar img{width:100%;height:100%;object-fit:cover}
/* Explorador */
.ag-expl{padding:clamp(40px,6vw,96px) 0 clamp(72px,9vw,140px)}
.ag-fila{display:grid;gap:28px;align-items:center;padding:24px 0}
.ag-fila-t{display:grid;gap:18px;justify-items:start;max-width:420px}
.ag-fila-t h3{font-size:clamp(32px,3vw,44px);font-weight:450;line-height:1.1;letter-spacing:-.03em}
.ag-fila-t p{font-size:17.5px;line-height:1.45;letter-spacing:.01em;color:var(--gris)}
.ag-fila-t .ag-btn{margin-top:22px}
.ag-fila-m{border-radius:clamp(22px,2.4vw,32px);overflow:hidden;aspect-ratio:1/1;background:var(--sup);position:relative}
.ag-fila-m img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.ag-sin{display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 0%,var(--claro),var(--base) 45%,var(--osc));color:#fff;font-size:clamp(26px,3vw,40px);letter-spacing:-.02em;padding:24px;text-align:center}
.ag-js .ag-fila .ag-fila-t,.ag-js .ag-fila .ag-fila-m{opacity:0;transform:translateY(28px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
.ag-js .ag-fila .ag-fila-m img{transform:scale(1.1)}
.ag-js .ag-fila.ag-vis .ag-fila-t,.ag-js .ag-fila.ag-vis .ag-fila-m{opacity:1;transform:none}.ag-js .ag-fila.ag-vis .ag-fila-m img{transform:none}
/* Casos */
.ag-casos{border-top:1px solid var(--bor);padding:clamp(56px,6vw,80px) 0 clamp(72px,8vw,120px)}
.ag-casos-cab{display:grid;gap:22px;margin-bottom:clamp(36px,4vw,56px)}
.ag-casos-cab h2,.ag-paq-cab h2,.ag-cont h2{font-size:clamp(32px,3vw,42px);font-weight:450;line-height:1.04;letter-spacing:-.025em;text-wrap:balance}
.ag-casos-cab p{font-size:17.5px;line-height:1.45;color:var(--gris);max-width:400px}
.ag-car{position:relative}
.ag-car-pista{display:flex;gap:24px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px;scroll-padding-left:0}.ag-car-pista::-webkit-scrollbar{display:none}
.ag-caso{flex:0 0 min(848px,88%);scroll-snap-align:start;display:grid;gap:18px}
.ag-caso img{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:clamp(20px,2.4vw,32px);background:var(--sup)}
.ag-caso figcaption{display:grid;gap:10px;max-width:440px}.ag-caso b{font-weight:450;font-size:17.5px}
.ag-caso a,.ag-tj-a{display:inline-flex;align-items:center;gap:4px;text-decoration:none;color:var(--gris);font-size:16.5px}.ag-caso a:hover,.ag-tj-a:hover{color:var(--fg)}
.ag-flechas{display:inline-flex;gap:4px;background:var(--pil);border-radius:999px;padding:4px;margin-top:22px}
.ag-flechas button{width:38px;height:36px;border-radius:999px;border:0;background:none;display:grid;place-items:center;cursor:pointer;color:var(--fg)}.ag-flechas button:disabled{opacity:.35;cursor:default}.ag-flechas button:not(:disabled):hover{background:#fff}
/* Dos columnas */
.ag-dos{border-top:1px solid var(--bor);border-bottom:1px solid var(--bor)}
.ag-dos-in{position:relative;display:grid;max-width:1440px;margin:0 auto}
.ag-col{position:relative;display:grid;justify-items:center;align-content:center;text-align:center;gap:10px;padding:clamp(80px,12vw,200px) clamp(20px,4vw,48px)}
.ag-col-p{position:absolute;left:clamp(20px,5vw,72px);top:0;bottom:0;width:calc(50% - clamp(20px,5vw,72px));background-image:radial-gradient(circle,color-mix(in srgb,var(--fg) 70%,transparent) 1px,transparent 1.4px);background-size:22px 22px;-webkit-mask:radial-gradient(closest-side,#000 0 46%,transparent 47% 58%,#000 59% 70%,transparent 100%);mask:radial-gradient(closest-side,#000 0 46%,transparent 47% 58%,#000 59% 70%,transparent 100%);opacity:.55}
.ag-etq{font-size:12.5px;font-weight:450;letter-spacing:.01em;padding:4px 8px;border-radius:4px;background:rgba(255,255,255,.85);box-shadow:inset 0 0 0 1px var(--bor);margin-bottom:6px}
.ag-col-h,.ag-col-s{font-size:clamp(30px,3vw,42px);font-weight:450;line-height:1.04;letter-spacing:-.025em;max-width:16ch;text-wrap:balance}.ag-col-s{color:var(--gris)}
.ag-col .ag-btn{margin-top:30px}
/* Paquetes */
.ag-paq{padding:clamp(56px,6vw,80px) 0 clamp(64px,8vw,110px)}
.ag-paq-cab{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:clamp(32px,4vw,60px)}
.ag-paq-pista{gap:0}
.ag-tj{flex:0 0 clamp(250px,25%,336px);scroll-snap-align:start;display:grid;align-content:start;gap:14px;padding:0 24px;border-left:1px solid var(--bor)}.ag-tj:first-child{padding-left:0;border-left:0}
.ag-tj-img{aspect-ratio:1/1;border-radius:20px;display:grid;place-items:center;padding:20px;text-align:center;color:#fff;font-size:clamp(20px,1.8vw,26px);letter-spacing:-.02em;line-height:1.15;margin-bottom:10px;
 background:radial-gradient(110% 90% at calc(15% + var(--k)*23%) calc(var(--k)*12%),color-mix(in oklab,var(--claro) 70%,hsl(var(--h) 75% 72%)),color-mix(in oklab,var(--base) 78%,hsl(var(--h) 60% 45%)) 46%,var(--osc) 100%)}
.ag-tj-img span{text-shadow:0 1px 18px rgba(0,0,0,.25)}
.ag-tj h3{font-size:clamp(22px,2vw,28px);font-weight:450;line-height:1.08;letter-spacing:-.01em}
.ag-tj-meta{display:flex;gap:12px;flex-wrap:wrap;font-size:15px;color:var(--gris)}.ag-tj-meta b{font-weight:550;color:var(--fg)}
.ag-tj-d{font-size:15px;line-height:1.45;color:var(--gris)}
.ag-tj ul{padding-left:18px;font-size:14.5px;color:var(--gris);display:grid;gap:2px}
/* Contacto */
.ag-cont-s{border-top:1px solid var(--bor);padding:clamp(48px,5vw,72px) 0}
.ag-cont{background:var(--sup);border-radius:36px;padding:clamp(36px,4.4vw,60px) clamp(20px,4vw,48px);display:grid;justify-items:center;text-align:center;gap:10px}
.ag-cont-sub{font-size:17.5px;color:var(--gris);max-width:52ch}
.ag-form{display:grid;gap:16px;width:min(780px,100%);margin-top:28px}
.ag-temas{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.ag-tema{position:relative;cursor:pointer}.ag-tema input{position:absolute;opacity:0;pointer-events:none}
.ag-tema span{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:450;padding:10px 16px;border-radius:999px;background:#fff;color:var(--gris);box-shadow:inset 0 0 0 1px var(--bor);transition:background .2s,color .2s}
.ag-tema span svg{display:none}.ag-tema input:checked+span{background:var(--fg);color:#fff;box-shadow:none}.ag-tema input:checked+span svg{display:block}
.ag-campo{display:flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:6px 6px 6px 24px;box-shadow:inset 0 0 0 1px var(--bor)}
.ag-campo input{flex:1;min-width:0;border:0;background:none;font:inherit;font-size:16px;color:var(--fg);padding:8px 0}.ag-campo input:focus{outline:none}.ag-campo:focus-within{box-shadow:inset 0 0 0 2px var(--p)}
.ag-cont-datos{font-size:13.5px;color:var(--gris);margin-top:6px}
/* Bloque final */
.ag-final{position:relative;isolation:isolate;overflow:hidden;margin:clamp(40px,5vw,72px) 6px 0;border-radius:clamp(22px,3vw,40px);background:#000;color:#fff;min-height:clamp(380px,42vw,560px);display:flex;align-items:center}
.ag-final .ag-fx{z-index:0}
.ag-final-in{position:relative;z-index:1;padding:clamp(40px,6vw,96px) clamp(20px,5vw,66px);display:grid;gap:34px;justify-items:start}
.ag-final-h{font-size:clamp(34px,4vw,58px);font-weight:450;line-height:1.02;letter-spacing:-.03em;max-width:15ch;text-wrap:balance}
.ag-final:not(.ag-fxon){background:radial-gradient(circle,rgba(255,255,255,.18) 1px,transparent 1.5px) 0 0/26px 26px,radial-gradient(80% 90% at 80% 20%,var(--osc),#000 70%)}
/* Pie */
.ag-pie{padding-top:28px}
.ag-pie-top{display:grid;gap:36px;padding-bottom:clamp(24px,4vw,56px)}
.ag-pie-t{font-size:clamp(26px,2.4vw,32px);font-weight:450;letter-spacing:-.01em;line-height:1.06;max-width:16ch}
.ag-pie-col{display:grid;gap:12px;align-content:start;font-size:15px}.ag-pie-col p{color:var(--gris);font-weight:500;margin-bottom:10px}.ag-pie-col a{text-decoration:none}.ag-pie-col a:hover{text-decoration:underline}.ag-pie-col span{color:var(--gris)}
.ag-gigante{font-weight:500;letter-spacing:-.05em;line-height:.9;white-space:nowrap;overflow:hidden;padding:.06em 0 .14em;margin-left:-.04em}.ag-gigante span{display:inline-block}
.ag-pie-bajo{border-top:1px solid var(--bor);margin-top:clamp(16px,3vw,40px)}
.ag-pie-bajo-in{display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding-top:26px;padding-bottom:88px;font-size:14.5px;color:var(--gris)}
.ag-pie-marca{display:flex;align-items:center;gap:10px}.pie-marcas{display:flex;gap:10px}.pie-marca{height:28px;width:auto}
.ag-redes{display:flex;gap:6px;margin-left:auto}.ag-redes a{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;color:var(--fg)}.ag-redes a:hover{background:var(--sup)}
/* Lo que agrega el validador de material (sección "mas") */
.sec{padding:clamp(48px,6vw,80px) 0}.sec .wrap{max-width:1440px;margin:0 auto;padding:0 clamp(20px,5vw,72px)}.sec h2{font-size:clamp(32px,3vw,42px);font-weight:450;letter-spacing:-.025em;margin-bottom:28px}.sec img{border-radius:20px!important}.btn{display:inline-flex;min-height:44px;align-items:center;padding:10px 24px;border-radius:999px;background:var(--fg);color:#fff;text-decoration:none}
.etq{position:fixed;left:16px;bottom:16px;z-index:30;background:var(--fg);color:#fff;font-size:14px;font-weight:550;line-height:1;padding:9px 12px;border-radius:999px}
/* Escritorio */
@media (min-width:900px){
 .ag-fila{grid-template-columns:minmax(0,1fr) minmax(0,624px);gap:clamp(40px,6vw,120px);padding:12px 0;min-height:min(720px,90vh)}
 .ag-casos-cab{grid-template-columns:minmax(0,1fr) minmax(0,400px);align-items:start}.ag-casos-cab p{margin-top:clamp(60px,7vw,100px)}
 .ag-dos-in{grid-template-columns:1fr 1fr}
 .ag-pie-top{grid-template-columns:minmax(0,1fr) 336px 336px}
}
/* Celular (el modelo cambia el botón de la portada por la tarjeta) */
@media (max-width:899px){
 .ag-nav{display:none}.ag-barra-in{justify-content:space-between;gap:12px}
 .ag-solo-esc{display:none}.ag-tarjeta{display:flex}
 .ag-hero{min-height:auto;padding:48px 0 40px}
 .ag-col-p{left:0;width:100%;height:50%}
 .ag-marco{aspect-ratio:4/5}
 .ag-aviso{height:auto;min-height:40px;padding:8px 44px 8px 12px}.ag-aviso-t{white-space:normal;font-size:13px}.ag-aviso-cta{display:none}
 .ag-arco{margin-bottom:56px}
 .ag-tj{flex-basis:78%}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}.ag-marco{transform:none!important}}
`;

/** Para la revisión visual automática: todo visible, quieto y sin el lienzo encima. */
export const CSS_REVISION_PLATAFORMA = '.ag-js .ag-w,.ag-js .ag-fila .ag-fila-t,.ag-js .ag-fila .ag-fila-m,.ag-js .ag-fila .ag-fila-m img{opacity:1!important;transform:none!important;filter:none!important}.ag-fx canvas,.ag-luz{display:none!important}.ag-marco{transform:none!important}img.ag-m{animation:none!important}';

export const JS_PLATAFORMA = `<script>(function(){var D=document,W=window,R=matchMedia('(prefers-reduced-motion: reduce)').matches,TQ=matchMedia('(hover: none), (max-width: 899px)').matches;
D.documentElement.classList.add('ag-js');
var H=D.querySelector('.ag-hero');requestAnimationFrame(function(){requestAnimationFrame(function(){if(H)H.classList.add('ag-listo')})});
/* Aviso */
var ax=D.querySelector('.ag-aviso-x');if(ax)ax.addEventListener('click',function(){ax.parentNode.classList.add('cerrado')});
/* Marco: secuencia de fotos o video, con pausa */
var M=D.querySelector('[data-ag-marco]');
if(M){var ms=[].slice.call(M.querySelectorAll('img.ag-m:not(.ag-oculta)')),vd=M.querySelector('video'),bt=M.querySelector('.ag-play'),k=0,tm=0,pausa=R;
 function paso(){if(pausa||ms.length<2)return;ms[k].classList.remove('on');k=(k+1)%ms.length;ms[k].classList.add('on')}
 function correr(){clearInterval(tm);if(!pausa&&ms.length>1)tm=setInterval(paso,5200)}
 function marcar(){if(bt){bt.setAttribute('aria-pressed',pausa);bt.setAttribute('aria-label',pausa?'Reproducir':'Pausar')}M.classList.toggle('ag-pausado',pausa);if(vd){try{pausa?vd.pause():vd.play()}catch(e){}}}
 if(bt)bt.addEventListener('click',function(){pausa=!pausa;marcar();correr()});
 if(R&&vd){vd.removeAttribute('autoplay');try{vd.pause()}catch(e){}}
 marcar();correr();
 if(!R){var t0=0;var esc=function(){t0=0;var r=M.getBoundingClientRect(),h=innerHeight||800;M.style.setProperty('--ag-p',Math.max(0,Math.min(1,(h-r.top)/(h*.7))).toFixed(3))};addEventListener('scroll',function(){if(!t0)t0=requestAnimationFrame(esc)},{passive:true});esc()}}
/* Arco de íconos: se desliza un poco con el scroll */
var A=D.querySelector('.ag-arco');if(A&&!R){var t1=0;var mv=function(){t1=0;var r=A.getBoundingClientRect();A.style.setProperty('--ag-ax',((r.top-innerHeight/2)*-.12).toFixed(1)+'px')};addEventListener('scroll',function(){if(!t1)t1=requestAnimationFrame(mv)},{passive:true});mv()}
/* Filas del explorador: entran al aparecer */
var fs=[].slice.call(D.querySelectorAll('.ag-fila'));
if('IntersectionObserver'in W&&!R){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('ag-vis');io.unobserve(e.target)}})},{threshold:.2});fs.forEach(function(f){io.observe(f)})}else fs.forEach(function(f){f.classList.add('ag-vis')});
/* Carruseles */
[].forEach.call(D.querySelectorAll('[data-ag-car]'),function(c){var p=c.querySelector('.ag-car-pista'),a=c.querySelector('.ag-ant'),b=c.querySelector('.ag-sig');if(!p||!a||!b)return;
 function est(){a.disabled=p.scrollLeft<4;b.disabled=p.scrollLeft+p.clientWidth>=p.scrollWidth-4;c.querySelector('.ag-flechas').hidden=p.scrollWidth<=p.clientWidth+4}
 a.addEventListener('click',function(){p.scrollBy({left:-p.clientWidth*.8,behavior:R?'auto':'smooth'})});b.addEventListener('click',function(){p.scrollBy({left:p.clientWidth*.8,behavior:R?'auto':'smooth'})});
 p.addEventListener('scroll',est,{passive:true});addEventListener('resize',est,{passive:true});addEventListener('load',est);est()});
/* Nombre gigante del pie: llena el ancho, como la marca del modelo */
var G=D.querySelector('.ag-gigante span');function fit(){if(!G)return;var pp=G.parentNode;G.style.fontSize='';var f=parseFloat(getComputedStyle(pp).fontSize),wd=G.getBoundingClientRect().width;if(wd>0)G.style.fontSize=Math.min(f*pp.clientWidth*.95/wd,320)+'px'}if(D.fonts&&D.fonts.ready)D.fonts.ready.then(fit);addEventListener('load',function(){fit();setTimeout(fit,700)});addEventListener('resize',fit);fit();
/* Contacto: arma el mensaje y abre WhatsApp */
var F=D.querySelector('.ag-form');if(F)F.addEventListener('submit',function(e){e.preventDefault();var wa=F.getAttribute('data-wa'),t=(F.querySelector('input[name="ag-tema"]:checked')||{}).value||'',n=(F.querySelector('#ag-nombre')||{}).value||'';
 var msg='Hola'+(n?', soy '+n.trim():'')+'. Quiero información'+(t&&t!=='Información general'?' de: '+t:'')+'.';
 if(!wa){location.hash='contacto';return}try{var u=new URL(wa);u.searchParams.set('text',msg);W.open(u.toString(),'_blank','noopener')}catch(x){location.href=wa}});
/* Efecto de mouse (puntos, luz, distorsion, tinta). En táctil o con "reducir movimiento": los puntos se dibujan quietos y lo demás no corre. */
function rgb(el,v){var c=(getComputedStyle(el).getPropertyValue(v)||'').trim(),m=/^#?([0-9a-f]{6})$/i.exec(c);if(!m)return[59,91,219];var n=parseInt(m[1],16);return[n>>16&255,n>>8&255,n&255]}
[].forEach.call(D.querySelectorAll('[data-ag-fx]'),function(host){
 var ef=host.getAttribute('data-ag-fx'),fx=host.querySelector('.ag-fx'),cv=fx&&fx.querySelector('canvas'),osc=host.hasAttribute('data-ag-oscuro');
 if(host===H){try{var q=new URLSearchParams(location.search).get('efecto')||(location.hash.match(/efecto-(\\w+)/)||[])[1];if(q&&/^(puntos|luz|distorsion|tinta)$/.test(q)&&(q!=='distorsion'||host.querySelector('.ag-fx-foto'))){ef=q;host.setAttribute('data-ag-fx',q)}}catch(e){}}
 if(!fx||!cv)return;if(osc)host.classList.add('ag-fxon');
 var C=osc?rgb(host,'--claro'):rgb(host,'--p'),dpr=Math.min(W.devicePixelRatio||1,2),w=0,h=0,mx=-9999,my=-9999,vivo=false,dentro=true,raf=0,pasos=null,rearmar=function(){};
 var quieto=R||TQ;
 function med(){var r=fx.getBoundingClientRect();w=r.width;h=r.height;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
 host.addEventListener('pointermove',function(e){var r=fx.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;vivo=true});
 host.addEventListener('pointerleave',function(){vivo=false;mx=my=-9999});
 function puntos(){var c=cv.getContext('2d'),S=osc?26:30,P=[],RAD=150;
  function armar(){med();c.setTransform(dpr,0,0,dpr,0,0);P=[];var cx=w/2,cy=h*.46;for(var y=S/2;y<h;y+=S)for(var x=S/2;x<w;x+=S){var d=Math.hypot(x-cx,y-cy)/Math.hypot(cx,cy);P.push({ox:x,oy:y,x:x,y:y,vx:0,vy:0,a:osc?.18+.5*Math.random()*d:.1+.32*d})}}
  armar();
  pasos=function(){c.clearRect(0,0,w,h);c.fillStyle='rgb('+C[0]+','+C[1]+','+C[2]+')';
   for(var i=0;i<P.length;i++){var p=P[i],dx=p.x-mx,dy=p.y-my,d=Math.sqrt(dx*dx+dy*dy),k=0;
    if(d<RAD&&d>.01){k=1-d/RAD;var f=k*k*5;p.vx+=dx/d*f;p.vy+=dy/d*f}
    p.vx+=(p.ox-p.x)*.06;p.vy+=(p.oy-p.y)*.06;p.vx*=.84;p.vy*=.84;p.x+=p.vx;p.y+=p.vy;
    var sp=Math.min(1,Math.hypot(p.vx,p.vy)/3);c.globalAlpha=Math.min(1,p.a+k*.6);
    if(sp>.15){c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));c.fillRect(-1.5-sp*4,-1.1,3+sp*8,2.2);c.restore()}else{c.beginPath();c.arc(p.x,p.y,1.3+k*1.6,0,6.2832);c.fill()}}
   c.globalAlpha=1};
  return armar}
 function tinta(){var c=cv.getContext('2d'),px=-1,py=-1;
  function armar(){med();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);px=py=-1}
  armar();
  pasos=function(){c.globalCompositeOperation='destination-out';c.fillStyle='rgba(0,0,0,.045)';c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';
   if(vivo&&mx>-999){if(px<0){px=mx;py=my}var dx=mx-px,dy=my-py,v=Math.sqrt(dx*dx+dy*dy),n=Math.max(1,Math.ceil(v/6)),r=Math.min(64,22+v*.6);
    for(var i=1;i<=n;i++){var x=px+dx*i/n,y=py+dy*i/n,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+C[0]+','+C[1]+','+C[2]+',.28)');g.addColorStop(1,'rgba('+C[0]+','+C[1]+','+C[2]+',0)');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,6.2832);c.fill()}
    px=mx;py=my}else px=-1};
  return armar}
 function luz(){var l=host.querySelector('.ag-luz'),x=50,y=40;
  pasos=function(){var tx=50,ty=40;if(vivo){tx=mx/w*100;ty=my/h*100}x+=(tx-x)*.1;y+=(ty-y)*.1;l.style.setProperty('--mx',x.toFixed(2)+'%');l.style.setProperty('--my',y.toFixed(2)+'%')};
  return function(){med()}}
 function distor(){var bg=host.querySelector('.ag-fx-foto');if(!bg)return null;var gl=cv.getContext('webgl',{alpha:false,antialias:false});if(!gl)return null;
  var vs='attribute vec2 a;varying vec2 u;void main(){u=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
  var fsrc='precision mediump float;uniform sampler2D t;uniform vec2 r,m;uniform float am,tm,ia;varying vec2 u;void main(){vec2 d=(u-m)*vec2(r.x/r.y,1.);float s=length(d);float f=exp(-s*5.)*am;vec2 o=normalize(d+vec2(1e-4))*sin(s*30.-tm*3.)*.014*f;float sa=r.x/r.y;vec2 k=vec2(1.);if(sa>ia){k.y=ia/sa;}else{k.x=sa/ia;}vec2 uv=clamp((u-.5)*k+.5+o,0.,1.);vec4 col=texture2D(t,uv);float vg=smoothstep(.95,.2,length((u-vec2(.5,.45))*vec2(1.,1.2)));gl_FragColor=vec4(mix(col.rgb,vec3(1.),.42+.4*vg),1.);}';
  function sh(tp,s){var x=gl.createShader(tp);gl.shaderSource(x,s);gl.compileShader(x);return x}
  var pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,fsrc));gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))return null;
  gl.useProgram(pg);var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var la=gl.getAttribLocation(pg,'a');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
  var U={};['t','r','m','am','tm','ia'].forEach(function(n){U[n]=gl.getUniformLocation(pg,n)});
  var tx=gl.createTexture(),ia=1,listo=false,act=0,t0=performance.now(),m0=[.5,.45];
  function armar(){med();gl.viewport(0,0,cv.width,cv.height)}
  function cargar(im){try{gl.bindTexture(gl.TEXTURE_2D,tx);[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(function(p){gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE)});gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);ia=im.naturalWidth/im.naturalHeight;listo=true;host.classList.add('ag-gl')}catch(e){cambiar('luz')}}
  if(bg.complete&&bg.naturalWidth)cargar(bg);else{bg.addEventListener('load',function(){cargar(bg)});bg.addEventListener('error',function(){cambiar('luz')})}
  armar();
  pasos=function(){if(!listo)return;if(vivo){m0=[mx/w,my/h];act+=(1-act)*.15}else act*=.94;gl.uniform1i(U.t,0);gl.uniform2f(U.r,cv.width,cv.height);gl.uniform2f(U.m,m0[0],m0[1]);gl.uniform1f(U.am,act);gl.uniform1f(U.tm,(performance.now()-t0)/1000);gl.uniform1f(U.ia,ia);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)};
  return armar}
 function cambiar(n){ef=n;host.setAttribute('data-ag-fx',n);host.classList.remove('ag-gl');pasos=null;iniciar()}
 function bucle(){raf=requestAnimationFrame(function(){raf=0;if(!dentro||D.hidden)return;if(pasos)pasos();bucle()})}
 function iniciar(){
  if(quieto){if(ef==='puntos'){try{puntos();pasos();rearmar=function(){puntos();pasos()}}catch(e){}}return}
  var f=ef==='puntos'?puntos:ef==='tinta'?tinta:ef==='luz'?luz:ef==='distorsion'?distor:null;if(!f)return;var a=null;try{a=f()}catch(e){a=null}
  if(a===null){if(ef!=='luz')return cambiar('luz');return}rearmar=a;if(!raf)bucle()}
 if('IntersectionObserver'in W)new IntersectionObserver(function(es){dentro=es[0].isIntersecting;if(dentro&&!raf&&pasos&&!quieto)bucle()}).observe(host);
 D.addEventListener('visibilitychange',function(){if(!D.hidden&&!raf&&pasos&&!quieto)bucle()});
 var rt=0;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){try{rearmar()}catch(e){}},150)});
 iniciar()});
})();</script>`;
