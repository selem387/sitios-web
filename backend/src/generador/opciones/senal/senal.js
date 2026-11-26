// Opción "Señal" (26-nov-2026). Plantilla idéntica a su sitio modelo: https://kaiju-fright-hub.base44.app/
// ("Terror del Fenómeno Analógico · Mundo Galeficol"). No toma nada de las otras opciones.
//
// Estructura del modelo (medida el 26-nov-2026 en su HTML ya armado y su CSS compilado):
// - Velo de líneas de barrido (scanline) fijo sobre toda la página.
// - Escritorio: columna fija de 92 px a la izquierda con el emblema (parpadeo de fósforo), el nombre en vertical, un
//   índice numerado 00, 01, 02… y "Señal · v.01" abajo. Celular: barra fija de 56 px con el emblema, el nombre y el índice
//   que se desliza de lado.
// - Portada de 88vh: foto a todo lo ancho al 70 %, degradado negro de abajo hacia arriba y rejilla de 72 px; arriba una
//   línea de estado con punto que late, al centro rótulo verde, titular gigante en Syne 800 (la última palabra en verde),
//   texto en IBM Plex Mono, dos botones rectos (lleno verde y con borde) y una tarjeta "sitio aliado" con ícono; abajo
//   dos rótulos chicos.
// - Cinta de palabras que corre sin fin (40 s) separada por cuadritos verdes.
// - Secciones con número verde "01 / rótulo", título en Syne, texto gris y botón con borde a la derecha:
//   01 tarjetas tipo cinta de video (foto en gris que se colorea al pasar el mouse), 02 foto alta + tarjetas 2×2 con
//   número, dato a la derecha, título, subtítulo, texto y etiquetas, 03 filas de directorio (número, nombre, texto,
//   etiquetas y ligas), 04 foto + lista numerada a dos columnas, 05 lista con texto + foto + recuadro, 06 cuatro tarjetas
//   de canal "Abrir canal ↗", manifiesto partido (foto | título, texto y etiquetas) y pie de tres columnas.
// Colores: negro #050505, obsidiana #0A0A0B, fósforo #00FF41, estática #E0E0E0, ceniza #8B8B8B. Letras: Syne (títulos) e
// IBM Plex Mono (todo lo demás).
//
// Cómo se llena con los datos del cliente (el modelo es un archivo de videos; aquí cada pieza toma su lugar):
//   portada → titular y foto principal; tarjeta "sitio aliado" → su WhatsApp (o su red principal) con su logo;
//   cinta → sus servicios y productos; 01 → todas sus fotos de trabajo; 02 → sus servicios o productos (precio en lugar
//   del año); 03 → sus pasos de trabajo; 04 → preguntas frecuentes (se abren en su lugar); 05 → testimonios + horario;
//   06 → sus canales (WhatsApp, redes, correo, ubicación); manifiesto → su historia; pie → sus datos.
// Las secciones sin material no salen; los números se recorren solos.
// Paleta y letra elegidas al inicio de la entrevista (24-nov-2026): el verde fósforo toma el color de marca elegido y las
// letras, la pareja elegida. Sin elección, queda idéntica al modelo.
import { CSS_SENAL } from './senal.css.js';
import { direccionTexto, testimoniosValidos } from '../../datos_brief.js';
import { redes as redesDe } from '../../kit/utiles.js';

export const FUENTES_SENAL = { titulos: 'Syne', cuerpo: 'IBM Plex Mono', estilo: 'audaz' };
export const URL_FUENTES_SENAL = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap';
export const FOSFORO = '#00FF41';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dos = (n) => String(n).padStart(2, '0');
const esHex = (c) => /^#[0-9a-f]{6}$/i.test(String(c || ''));
const lum = (hex) => {
  const v = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

/** Color del fósforo: el de marca que eligió el cliente si se lee sobre negro; si no, el verde del modelo. */
export function colorFosforo(brief = {}) {
  const c = brief.marca?.paleta_elegida?.colores || {};
  const cand = [c.marca, c.acento].filter(esHex).find((x) => (lum(x) + 0.05) / (lum('#050505') + 0.05) >= 4.5);
  return (cand || FOSFORO).toUpperCase();
}

/** Pareja de letras: la elegida al inicio o la del modelo. */
export function letrasSenal(brief = {}) {
  const t = brief.marca?.tipografia_elegida;
  return t?.titulos && t?.cuerpo ? { titulos: t.titulos, cuerpo: t.cuerpo, estilo: FUENTES_SENAL.estilo } : FUENTES_SENAL;
}
const urlFuentes = (par) => (par === FUENTES_SENAL ? URL_FUENTES_SENAL
  : `https://fonts.googleapis.com/css2?${[...new Set([par.titulos, par.cuerpo])].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700;800`).join('&')}&display=swap`);

const telDeWa = (wa) => { try { const u = new URL(wa); return (u.pathname.match(/\d{8,}/) || [u.searchParams.get('phone') || ''])[0] || ''; } catch { return ''; } };
const waTexto = (tel, texto) => (tel ? `https://api.whatsapp.com/send/?phone=${tel}&text=${encodeURIComponent(texto)}&type=phone_number&app_absent=0` : '');

// Clases tal cual el modelo (se repiten mucho; aquí con nombre para no equivocarse).
const K = {
  rot: 'font-body text-[10px] uppercase tracking-[0.4em] text-phosphor',
  tag: 'border border-white/10 px-2 py-1 font-body text-[9px] uppercase tracking-[0.2em] text-ash',
  btnBorde: 'inline-flex min-h-[44px] items-center border border-white/20 px-6 font-body text-[10px] uppercase tracking-[0.3em] text-static transition-colors hover:border-phosphor hover:text-phosphor',
  h2: 'mt-4 font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-static md:text-5xl',
  sub: 'mt-4 max-w-xl text-sm leading-relaxed text-ash',
};

/**
 * Página completa de la opción.
 * d: { brief, mat, textos, v, titulos, wa, letra, titulo }
 */
export function paginaSenal(d) {
  const { brief = {}, mat = {}, textos = {}, v = {} } = d;
  const T = d.titulos || {};
  const neg = brief.negocio || {}, c = brief.contacto || {}, conf = brief.confianza || {}, of = brief.oferta || {};
  const nombre = neg.nombre || '';
  const tel = telDeWa(d.wa);
  const ext = ' target="_blank" rel="noopener noreferrer"';
  const waHref = d.wa ? ` href="${esc(d.wa)}"${ext}` : ' href="#contacto"';
  const ph = colorFosforo(brief);
  const par = letrasSenal(brief);
  const usadas = new Set();
  const marcar = (x) => { if (x?.url) usadas.add(x.url); return x; };

  // --- Material ---
  const unicas = (l) => l.filter((x) => x?.url).filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k);
  const buena = (x) => x?.url && !x.captura && x.calidad !== 'regular';
  const trabajos = unicas([...(mat.trabajos || []), ...(mat.local || []), ...(mat.otras || []), ...(mat.fotos || []).filter((x) => !x.recorte)])
    .filter((x) => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(x.url) || x.ancho);
  const buenas = trabajos.filter(buena);
  const porUrl = new Map([mat.hero, ...buenas].filter((x) => x?.url).map((x) => [x.url, x]));
  const portada = (brief.fotos?.portada_manual && mat.hero) || porUrl.get(v.foto_url) || (buena(mat.hero) ? mat.hero : null) || buenas[0] || null;
  const video = (mat.videos || []).find((x) => x?.url);
  // Fotos grandes de las secciones (en el modelo son ilustraciones propias): se toman de las del cliente sin repetir
  // mientras alcancen; si no alcanzan, se repite alguna (marcada rep-ok, como en las demás plantillas).
  const grandes = buenas.filter((x) => x.url !== portada?.url);
  let ig = 0;
  const grande = () => (grandes.length ? grandes[ig++ % grandes.length] : portada);
  const nombreDe = (x) => String(x?.nombre || (x?.alt || '').split(/[,.;]/)[0] || '').trim();
  const items = (of.items || []).map((x) => (typeof x === 'string' ? { nombre: x } : x)).filter((x) => x?.nombre);
  const mostrarPrecios = of.mostrar_precios !== false && brief.mostrar_precios !== false;
  const precioDe = (it) => (mostrarPrecios ? String(it?.precio_o_rango || it?.precio || '').trim() : '');

  const img = (x, cls, { lazy = true, rep = false, alt = null } = {}) => {
    marcar(x);
    return `<img${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} class="${cls}${rep ? ' rep-ok' : ''}" alt="${esc(alt ?? x.alt ?? nombreDe(x))}" src="${esc(x.url)}"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}>`;
  };
  // Marco de foto del modelo (span inline-block > span relativo > img absoluta).
  const marco = (x, clsMarco, clsImg = 'object-cover', opts = {}) => (x ? `<span class="inline-block ${clsMarco}"><span class="block relative w-full h-full overflow-hidden">${img(x, `w-full h-full inset-0 absolute ${clsImg}`, opts)}</span></span>` : '');

  // --- Secciones (el número sale por orden de aparición) ---
  const secs = []; // [id, etiqueta del índice]
  const cabecera = (num, rotulo, titulo, texto, boton) => `<div class="flex flex-col gap-6 border-t border-white/10 pt-8 md:flex-row md:items-end md:justify-between"><div class="max-w-2xl"><p class="${K.rot}">${num} <span class="text-ash">/ ${esc(rotulo)}</span></p><h2 class="${K.h2}">${esc(titulo)}</h2>${texto ? `<p class="${K.sub}">${esc(texto)}</p>` : ''}</div>${boton || ''}</div>`;
  const boton = (texto, href) => `<a class="${K.btnBorde}"${href}>${esc(texto)} ↗</a>`;
  const nuevo = (id, etiqueta) => { secs.push([id, etiqueta]); return dos(secs.length); };
  const cta = v.cta || 'Escríbenos por WhatsApp';
  const waInfo = (x) => {
    const n = nombreDe(x);
    const u = n && tel ? waTexto(tel, `Hola, me interesa ${x.articulo || 'el'} ${n.toLowerCase()}. ¿Me das más información?`) : '';
    return u ? ` href="${esc(u)}"${ext}` : waHref;
  };
  const waItem = (it) => { const u = tel ? waTexto(tel, `Hola, me interesa saber más de ${String(it.nombre).toLowerCase()}.`) : ''; return u ? ` href="${esc(u)}"${ext}` : waHref; };

  const partes = [];
  // 01 · Cintas en reproducción → su trabajo (todas sus fotos)
  if (trabajos.length) {
    const tit = T.trabajo || 'Nuestro trabajo';
    const n = nuevo('trabajo', tit);
    const deItem = (x) => items.find((it) => nombreDe(x).toLowerCase().includes(String(it.nombre).toLowerCase().split(' ')[0])) || null;
    const tarjetas = trabajos.map((x, k) => `<a class="group block border border-white/10 bg-obsidian p-2 transition-colors duration-300 hover:border-phosphor/60"${waInfo(x)}><div class="relative aspect-video overflow-hidden bg-black">${img(x, `h-full w-full ${x.captura ? 'object-contain' : 'object-cover'} opacity-60 grayscale transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-100 group-hover:grayscale-0`)}<span class="absolute left-0 top-0 bg-void/90 px-2 py-1 font-body text-[9px] uppercase tracking-[0.3em] text-phosphor">Toma ${dos(k + 1)}</span></div><div class="px-2 pb-2 pt-4"><p class="font-body text-[9px] uppercase tracking-[0.3em] text-ash">${esc(deItem(x)?.nombre || nombre)}</p><h3 class="mt-2 font-display text-base font-bold leading-snug text-static transition-colors group-hover:text-phosphor">${esc(nombreDe(x) || tit)}</h3></div></a>`).join('');
    partes.push(`<section class="px-6 py-20 md:px-14 md:py-28" id="trabajo">${cabecera(n, 'Ahora en pantalla', tit, textos.trabajo_intro || '', boton('Pedir informes', waHref))}<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${tarjetas}</div></section>`);
  }

  // 02 · Series → servicios o productos
  if (items.length) {
    const tit = T.servicios || 'Servicios';
    const n = nuevo('servicios', tit);
    const foto = grande();
    const tarjetas = items.map((it, k) => {
      const tags = [...(it.beneficios || it.etiquetas || [])].filter(Boolean).slice(0, 3);
      const desc = String(it.descripcion || it.descripcion_corta || '').trim();
      const subt = it.descripcion && it.descripcion_corta && it.descripcion_corta !== it.descripcion ? it.descripcion_corta : (it.duracion || it.unidad || '');
      return `<a class="group flex h-full flex-col justify-between border border-white/10 bg-obsidian/60 p-6 transition-all duration-300 hover:border-phosphor/50 hover:bg-obsidian"${waItem(it)}><div><div class="flex items-baseline justify-between font-body text-[9px] uppercase tracking-[0.3em] text-ash"><span class="text-phosphor">${dos(k + 1)}</span><span>${esc(precioDe(it))}</span></div><h3 class="mt-6 font-display text-xl font-extrabold uppercase leading-[1.05] tracking-[-0.01em] text-static transition-colors group-hover:text-phosphor">${esc(it.nombre)}</h3>${subt ? `<p class="mt-1 font-body text-[10px] uppercase tracking-[0.25em] text-ash">${esc(subt)}</p>` : ''}${desc ? `<p class="mt-4 text-sm leading-relaxed text-ash">${esc(desc)}</p>` : ''}</div>${tags.length ? `<div class="mt-6 flex flex-wrap items-center gap-2">${tags.map((t) => `<span class="${K.tag}">${esc(t)}</span>`).join('')}</div>` : ''}</a>`;
    }).join('');
    const lado = foto ? `<div class="relative hidden overflow-hidden border border-white/10 lg:block">${marco(foto, 'relative h-full w-full object-cover opacity-80', 'object-cover', { rep: true })}<div class="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent"></div><div class="absolute bottom-5 left-5"><p class="font-body text-[9px] uppercase tracking-[0.35em] text-phosphor">${esc(neg.ciudad || nombre)}</p><p class="mt-2 font-display text-lg font-extrabold uppercase text-static">${esc(nombreDe(foto) || nombre)}</p></div></div>` : '';
    partes.push(`<section class="border-t border-white/10 bg-obsidian/40 px-6 py-20 md:px-14 md:py-28" id="servicios">${cabecera(n, 'Lo que hacemos', tit, v.subtitulo_servicios || textos.servicios_intro || of.diferenciador || '', boton(textos.servicios_boton || 'Cotizar por WhatsApp', waHref))}<div class="mt-12 grid gap-6${lado ? ' lg:grid-cols-[1fr_1.6fr]' : ''}">${lado}<div class="grid gap-6 sm:grid-cols-2">${tarjetas}</div></div></section>`);
  }

  // 03 · Directorio de máquinas → pasos de trabajo
  const pasos = (of.proceso_pasos || brief.proceso_pasos || []).map((p) => String(p || '').split('\n').map((s) => s.trim()).filter(Boolean)).filter((p) => p[0]);
  if (pasos.length) {
    const tit = textos.proceso || T.proceso || 'Cómo trabajamos';
    const n = nuevo('proceso', tit);
    const filas = pasos.map(([a, ...b], k) => `<div class="group grid gap-4 border-b border-white/10 py-8 transition-colors hover:bg-white/[0.02] md:grid-cols-[64px_1.1fr_1.6fr_auto] md:items-center md:gap-8"><span class="font-body text-[10px] uppercase tracking-[0.3em] text-phosphor/70">${dos(k + 1)}</span><div><h3 class="font-display text-xl font-extrabold uppercase leading-none text-static transition-colors group-hover:text-phosphor">${esc(a)}</h3><p class="mt-2 font-body text-[10px] uppercase tracking-[0.25em] text-ash">Paso ${dos(k + 1)} · ${dos(pasos.length)}</p></div><p class="max-w-xl text-sm leading-relaxed text-ash">${esc(b.join(' '))}</p><div class="flex flex-col gap-3 md:items-end"><a class="font-body text-[9px] uppercase tracking-[0.25em] text-phosphor underline-offset-4 transition-colors hover:underline"${waHref}>Preguntar ▸</a></div></div>`).join('');
    partes.push(`<section class="px-6 py-20 md:px-14 md:py-28" id="proceso">${cabecera(n, 'Paso a paso', tit, textos.proceso_intro || '', boton(cta, waHref))}<div class="mt-10 border-t border-white/10">${filas}</div></section>`);
  }

  // 04 · Noches en el servidor → preguntas frecuentes (foto + lista a dos columnas que se abre en su lugar)
  const faq = (brief.faq || []).filter((x) => x?.pregunta && x?.respuesta);
  if (faq.length) {
    const tit = T.faq || 'Preguntas frecuentes';
    const n = nuevo('faq', tit);
    const foto = grande();
    const lista = faq.map((x, k) => `<li><details class="group border-b border-white/10 py-4"><summary class="flex cursor-pointer list-none items-baseline justify-between gap-4"><span class="font-display text-sm font-bold uppercase leading-tight tracking-tight text-static transition-colors group-hover:text-phosphor">${esc(x.pregunta)}</span><span class="font-body text-[9px] tracking-[0.2em] text-ash">${dos(k + 1)}</span></summary><p class="mt-3 text-sm leading-relaxed text-ash">${esc(x.respuesta)}</p></details></li>`).join('');
    partes.push(`<section class="border-t border-white/10 px-6 py-20 md:px-14 md:py-28" id="faq">${cabecera(n, 'Dudas', tit, '', boton('Pregunta lo que sea', waHref))}<div class="mt-12 grid gap-10${foto ? ' lg:grid-cols-[1.05fr_1.5fr]' : ''}">${foto ? `<div class="relative aspect-[4/3] overflow-hidden border border-white/10">${marco(foto, 'relative h-full w-full opacity-85', 'object-cover', { rep: true })}<div class="absolute inset-0 bg-gradient-to-t from-void via-void/10 to-transparent"></div><p class="absolute bottom-5 left-5 font-body text-[9px] uppercase tracking-[0.32em] text-phosphor">${esc(nombre)} · ${dos(faq.length)} respuestas</p></div>` : ''}<ul class="grid gap-x-10 sm:grid-cols-2">${lista}</ul></div></section>`);
  }

  // 05 · Mods → testimonios (lista) + foto + recuadro con horario
  const tes = testimoniosValidos(brief, mat);
  const resenas = (mat.resenas || []).filter((x) => x?.url);
  const horario = typeof c.horarios === 'string' ? c.horarios : (Array.isArray(c.horarios) ? c.horarios.join(' · ') : '');
  if (tes.length || resenas.length) {
    const tit = T.testimonios || T.resenas || 'Lo que dicen';
    const n = nuevo('testimonios', tit);
    const foto = grande();
    const lista = tes.map((x, k) => `<li><div class="group grid grid-cols-[32px_1fr] items-start gap-4 border-b border-white/10 py-5"><span class="font-body text-[9px] tracking-[0.2em] text-phosphor/70">${dos(k + 1)}</span><span><span class="block font-display text-base font-bold uppercase text-static transition-colors group-hover:text-phosphor">${esc(x.autor || x.nombre || 'Cliente')}</span><span class="mt-1 block text-sm leading-relaxed text-ash">${esc(x.texto)}</span></span></div></li>`).join('');
    const capturas = resenas.map((x) => `<div class="border border-white/10 bg-obsidian p-2">${img(x, 'h-auto w-full object-contain')}</div>`).join('');
    partes.push(`<section class="border-t border-white/10 bg-obsidian/40 px-6 py-20 md:px-14 md:py-28" id="testimonios">${cabecera(n, 'Reseñas', tit, '', conf.link_resenas ? boton('Ver todas', ` href="${esc(conf.link_resenas)}"${ext}`) : '')}<div class="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1.05fr]"><div>${lista ? `<ul>${lista}</ul>` : ''}${capturas ? `<div class="mt-6 grid gap-4 sm:grid-cols-2">${capturas}</div>` : ''}</div><div class="flex flex-col gap-6">${foto ? `<div class="relative aspect-[4/3] overflow-hidden border border-white/10">${marco(foto, 'relative h-full w-full opacity-85', 'object-cover', { rep: true })}<div class="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent"></div><p class="absolute bottom-5 left-5 font-body text-[9px] uppercase tracking-[0.32em] text-phosphor">${esc(neg.ciudad || nombre)}</p></div>` : ''}${horario ? `<div class="border border-white/10 p-5"><p class="font-body text-[9px] uppercase tracking-[0.3em] text-ash">Horario</p><p class="mt-3 text-sm leading-relaxed text-static">${esc(horario)}</p></div>` : ''}</div></div></section>`);
  }

  // 06 · Canales → contacto
  const dir = direccionTexto(brief);
  const mapa = dir ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nombre}, ${dir}`)}` : '';
  const canales = [
    d.wa ? ['WhatsApp', d.tel || 'Escríbenos', 'Te respondemos por mensaje. Cuéntanos qué necesitas.', d.wa] : null,
    ...redesDe(c).map(([red, u]) => [red, red, `Síguenos en ${red}: novedades, trabajos y promociones.`, u]),
    c.email ? ['Correo', c.email, 'Para cotizaciones formales y documentos.', `mailto:${c.email}`] : null,
    mapa ? ['Ubicación', neg.ciudad || 'Visítanos', dir, mapa] : null,
  ].filter(Boolean);
  // El modelo lleva exactamente 4 tarjetas en una fila: WhatsApp y ubicación siempre; el resto por orden hasta llenar 4.
  // Lo que no cabe (otras redes, correo) va en el pie.
  const fijos = canales.filter(([t]) => t === 'WhatsApp' || t === 'Ubicación');
  const enTarjeta = canales.filter((x) => fijos.includes(x) || canales.filter((y) => !fijos.includes(y)).indexOf(x) < 4 - fijos.length).slice(0, 4);
  const fueraTarjeta = canales.filter((x) => !enTarjeta.includes(x));
  canales.length = 0; canales.push(...enTarjeta);
  const titCont = T.contacto || 'Contacto';
  if (canales.length) {
    const n = nuevo('contacto', titCont);
    const tarjetas = canales.map(([tipo, t, txt, u]) => `<a href="${esc(u)}"${/^mailto:/.test(u) ? '' : ext} class="group flex h-full flex-col justify-between border border-white/10 bg-obsidian/60 p-6 transition-colors duration-300 hover:border-phosphor/50 hover:bg-obsidian"><div><p class="font-body text-[9px] uppercase tracking-[0.3em] text-phosphor/80">${esc(tipo)}</p><h3 class="mt-4 font-display text-lg font-extrabold uppercase leading-tight text-static transition-colors group-hover:text-phosphor [overflow-wrap:anywhere]">${esc(t)}</h3><p class="mt-3 text-sm leading-relaxed text-ash">${esc(txt)}</p></div><span class="mt-6 font-body text-[10px] uppercase tracking-[0.3em] text-ash transition-colors group-hover:text-phosphor">Abrir ↗</span></a>`).join('');
    partes.push(`<section class="border-t border-white/10 px-6 py-20 md:px-14 md:py-28" id="contacto">${cabecera(n, 'Canales', titCont, textos.servicios_cierre || 'Escríbenos por el canal que prefieras.', boton(cta, waHref))}<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">${tarjetas}</div></section>`);
  }

  // Manifiesto → sobre nosotros
  const historia = String(textos.sobre || conf.historia_corta || '').trim();
  const persona = [mat.fundador, ...(mat.equipo || [])].find((x) => x?.url);
  const equipoResto = (mat.equipo || []).filter((x) => x?.url && x.url !== persona?.url);
  if (historia || persona) {
    const tit = T.sobre || 'Sobre nosotros';
    secs.push(['sobre', tit]);
    const foto = persona || grande();
    const tags = items.slice(0, 6).map((x) => `<li class="border border-white/10 px-3 py-1.5 font-body text-[9px] uppercase tracking-[0.22em] text-ash">${esc(x.nombre)}</li>`).join('');
    const parrafos = historia.split(/\n{2,}/).filter(Boolean).map((p, k) => `<p class="${k ? 'mt-4' : 'mt-6'} max-w-md text-sm leading-relaxed text-ash">${esc(p.trim())}</p>`).join('');
    const eq = equipoResto.length ? `<div class="mt-8 grid grid-cols-3 gap-2">${equipoResto.map((x) => `<div class="relative aspect-square overflow-hidden border border-white/10">${img(x, 'absolute inset-0 h-full w-full object-cover')}</div>`).join('')}</div>` : '';
    partes.push(`<section class="border-t border-white/10" id="sobre"><div class="grid md:grid-cols-2">${foto ? `<div class="relative min-h-[340px] overflow-hidden border-b border-white/10 md:border-b-0 md:border-r">${marco(foto, 'absolute inset-0 h-full w-full opacity-80', 'object-cover', { rep: !persona })}<div class="absolute inset-0 bg-gradient-to-t from-void/90 via-void/20 to-transparent"></div></div>` : ''}<div class="flex flex-col justify-center px-6 py-16 md:px-14 md:py-24"><p class="${K.rot}">${esc(tit)}</p><h2 class="mt-5 font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-static md:text-5xl">${esc(T.sobre_titulo || 'Esto es')}<br>${esc(nombre)}</h2>${parrafos}${tags ? `<ul class="mt-8 flex flex-wrap gap-2">${tags}</ul>` : ''}${eq}</div></div></section>`);
  }

  // Material que ninguna sección tomó (regla de material completo): fila de tarjetas al final del trabajo.
  const cuerpo0 = partes.join('');
  const faltan = unicas([...(mat.usables || []).filter((u) => u.tipo !== 'logo' && !/logo/.test(u.tipo || '')).flatMap((u) => (u.urls || []).map((url) => ({ url, alt: '' })))])
    .filter((x) => /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(x.url) && !usadas.has(x.url) && x.url !== portada?.url && !cuerpo0.includes(esc(x.url)));
  const videosExtra = (mat.videos || []).filter((x) => x?.url && x.url !== video?.url);
  if (faltan.length || videosExtra.length) {
    const tit = T.galeria || 'Galería';
    const n = nuevo('galeria', tit);
    partes.push(`<section class="border-t border-white/10 px-6 py-20 md:px-14 md:py-28" id="galeria">${cabecera(n, 'Archivo', tit, '', '')}<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${faltan.map((x) => `<div class="group block border border-white/10 bg-obsidian p-2"><div class="relative aspect-video overflow-hidden bg-black">${img(x, 'h-full w-full object-cover opacity-60 grayscale transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-100 group-hover:grayscale-0')}</div></div>`).join('')}${videosExtra.map((x) => { marcar(x); return `<div class="border border-white/10 bg-obsidian p-2"><video class="aspect-video w-full bg-black" src="${esc(x.url)}" controls playsinline preload="metadata"></video></div>`; }).join('')}</div></section>`);
  }

  // --- Portada ---
  const titular = String(v.titular || nombre).trim();
  const palabras = titular.split(/\s+/);
  const h1 = palabras.length > 1 ? `${esc(palabras.slice(0, -1).join(' '))}<br><span class="text-phosphor">${esc(palabras.at(-1))}</span>` : `<span class="text-phosphor">${esc(titular)}</span>`;
  const giro = String(neg.giro || neg.categoria || neg.subtipo || '').trim();
  const estado = [horario ? 'Atendiendo hoy' : 'Señal activa', horario.split(/[·;\n]/)[0] || neg.ciudad || ''].filter(Boolean).join(' · ');
  const logo = mat.logo?.url ? marcar(mat.logo) : null;
  const icono = (cls) => (logo ? `<img src="${esc(logo.url)}" alt="${esc(`Logo de ${nombre}`)}" class="${cls} object-contain">` : `<span class="font-display text-lg font-extrabold uppercase text-phosphor">${esc(nombre.slice(0, 1))}</span>`);
  const redPrincipal = redesDe(c)[0];
  const aliado = d.wa
    ? [`WhatsApp directo`, d.tel ? `${d.tel} ↗` : 'Escríbenos ↗', d.wa]
    : redPrincipal ? [redPrincipal[0], `${redPrincipal[0]} ↗`, redPrincipal[1]] : null;
  const fondo = video
    ? (marcar(video), `<video class="absolute inset-0 h-full w-full object-cover opacity-70" src="${esc(video.url)}" autoplay muted loop playsinline preload="metadata"${portada ? ` poster="${esc(portada.url)}"` : ''}></video>`)
    : portada ? `<span class="inline-block absolute inset-0 h-full w-full opacity-70"><span class="block relative w-full h-full overflow-hidden">${img(portada, 'w-full h-full inset-0 absolute object-cover', { lazy: false, rep: true })}</span></span>` : '';
  if (video && portada) marcar(portada);
  const segunda = items.length ? ['#servicios', `Ver ${String(T.servicios || 'servicios').toLowerCase()}`] : secs[0] ? [`#${secs[0][0]}`, `Ver ${String(secs[0][1]).toLowerCase()}`] : null;
  const hero = `<section class="relative min-h-[88vh] overflow-hidden border-b border-white/10" id="inicio">${fondo}<div class="absolute inset-0 bg-gradient-to-t from-void via-void/75 to-void/25"></div><div class="grid-veil absolute inset-0 opacity-25"></div><div class="relative flex min-h-[88vh] flex-col justify-between px-6 py-12 md:px-14 md:py-16"><div class="flex items-center gap-3 font-body text-[10px] uppercase tracking-[0.35em] text-ash"><span class="h-1.5 w-1.5 animate-pulse bg-phosphor"></span>${esc(estado)}</div><div class="max-w-5xl py-16"><p class="font-body text-[10px] uppercase tracking-[0.42em] text-phosphor">${esc([nombre, giro].filter(Boolean).join(' · '))}</p><h1 class="mt-6 font-display text-[clamp(2.1rem,5.4vw,4.6rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.04em] text-static">${h1}</h1>${v.subtitulo ? `<p class="mt-8 max-w-xl text-sm leading-relaxed text-ash md:text-base">${esc(v.subtitulo)}</p>` : ''}<div class="mt-10 flex flex-wrap gap-3"><a class="inline-flex min-h-[44px] items-center border border-phosphor bg-phosphor px-7 font-body text-[10px] uppercase tracking-[0.3em] text-void transition-colors hover:bg-transparent hover:text-phosphor"${waHref}>${esc(cta)}</a>${segunda ? `<a class="inline-flex min-h-[44px] items-center border border-white/25 px-7 font-body text-[10px] uppercase tracking-[0.3em] text-static transition-colors hover:border-phosphor hover:text-phosphor" href="${segunda[0]}">${esc(segunda[1])}</a>` : ''}</div>${aliado ? `<a href="${esc(aliado[2])}"${ext} class="group mt-10 flex w-full max-w-xl items-center gap-4 border border-phosphor/40 bg-void/70 px-5 py-4 transition-colors hover:border-phosphor hover:bg-void"><span class="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 bg-black">${icono('h-7 w-7')}</span><span class="min-w-0"><span class="block font-body text-[9px] uppercase tracking-[0.35em] text-phosphor">${esc(aliado[0])}</span><span class="mt-1 block font-display text-2xl font-extrabold uppercase leading-none tracking-[-0.02em] text-static transition-colors group-hover:text-phosphor md:text-3xl">${esc(aliado[1])}</span></span></a>` : ''}</div><div class="flex items-end justify-between font-body text-[9px] uppercase tracking-[0.3em] text-white/40"><span>${esc([neg.ciudad, neg.estado].filter(Boolean).join(' · ') || nombre)}</span><span class="hidden md:block">Desciende para continuar</span></div></div></section>`;

  // --- Cinta de palabras ---
  const palabrasCinta = [...new Set([...items.map((x) => x.nombre), ...(of.palabras_clave || []), neg.ciudad].filter(Boolean).map(String))].slice(0, 8);
  while (palabrasCinta.length && palabrasCinta.length < 6) palabrasCinta.push(...palabrasCinta.slice(0, 6 - palabrasCinta.length));
  const cinta = palabrasCinta.length ? `<div class="overflow-hidden border-b border-white/10 bg-obsidian py-4" aria-hidden="true"><div class="marquee-track flex w-max items-center gap-10 whitespace-nowrap">${[...palabrasCinta, ...palabrasCinta].map((w) => `<span class="flex items-center gap-10"><span class="font-body text-[10px] uppercase tracking-[0.35em] text-ash">${esc(w)}</span><span class="h-1 w-1 bg-phosphor"></span></span>`).join('')}</div></div>` : '';

  // --- Índice (columna de escritorio y barra de celular) ---
  const idx = [['inicio', 'Inicio'], ...secs];
  // La columna mide 92 px: como en el modelo, cada entrada lleva una sola palabra corta (el título completo va en la sección).
  const CORTO = { trabajo: 'Trabajo', servicios: 'Servicios', proceso: 'Proceso', faq: 'Dudas', testimonios: 'Reseñas', contacto: 'Contacto', sobre: 'Nosotros', galeria: 'Galería' };
  const corto = (id, n) => (/^\S{1,9}$/.test(String(n).trim()) ? String(n).trim() : CORTO[id] || String(n).split(/\s+/)[0]);
  const emblema = logo
    ? `<span class="inline-block relative h-11 w-11 phosphor-flicker"><span class="block relative w-full h-full overflow-hidden"><img class="w-full h-full inset-0 absolute object-contain" alt="${esc(`Logo de ${nombre}`)}" src="${esc(logo.url)}"></span></span>`
    : `<span class="phosphor-flicker flex h-11 w-11 items-center justify-center border border-phosphor/40 font-display text-xl font-extrabold uppercase text-phosphor">${esc(nombre.slice(0, 1))}</span>`;
  const lateral = `<aside class="fixed left-0 top-0 z-[80] hidden h-screen w-[92px] flex-col justify-between border-r border-white/10 bg-void/90 px-4 py-6 backdrop-blur-sm md:flex"><a class="block" href="#inicio">${emblema}<span class="mt-5 block whitespace-nowrap font-display text-[11px] font-extrabold uppercase tracking-[0.42em] text-static [writing-mode:vertical-rl] max-h-[38vh] overflow-hidden">${esc(nombre)}</span></a><nav class="flex flex-col gap-6">${idx.map(([id, n], k) => `<a class="group block ${k ? 'text-ash' : 'text-phosphor'}" href="#${id}"><span class="block font-body text-[9px] tracking-[0.3em] opacity-60">${dos(k)}</span><span class="mt-1 block font-body text-[10px] uppercase tracking-[0.22em] transition-colors group-hover:text-phosphor">${esc(corto(id, n))}</span></a>`).join('')}</nav><div class="space-y-2 font-body text-[9px] uppercase tracking-[0.25em] text-ash"><p class="flex items-center gap-1.5"><span class="h-1.5 w-1.5 animate-pulse rounded-full bg-phosphor"></span>Señal</p><p class="text-white/25">v.${dos(new Date().getFullYear() % 100)}</p></div></aside>`;
  const barraMovil = `<header class="fixed left-0 top-0 z-[80] flex h-14 w-full items-center justify-between gap-4 border-b border-white/10 bg-void/95 px-4 backdrop-blur md:hidden"><a class="flex shrink-0 items-center gap-2" href="#inicio">${logo ? `<span class="inline-block relative h-7 w-7"><span class="block relative w-full h-full overflow-hidden"><img class="w-full h-full inset-0 absolute object-contain" alt="${esc(`Logo de ${nombre}`)}" src="${esc(logo.url)}"></span></span>` : ''}<span class="font-display text-xs font-extrabold uppercase tracking-[0.35em] text-static">${esc(nombre)}</span></a><nav class="flex min-w-0 items-center gap-4 overflow-x-auto">${idx.map(([id, n], k) => `<a class="shrink-0 font-body text-[10px] uppercase tracking-[0.2em] text-ash transition-colors${k ? '' : ' text-phosphor'}" href="#${id}">${esc(n)}</a>`).join('')}</nav></header>`;

  // --- Pie ---
  const marcas = (mat.logos_extra || []).filter((x) => x?.url).map((x) => img(x, 'h-10 w-auto object-contain opacity-80', { rep: true })).join('');
  const descripcion = String(of.diferenciador || neg.descripcion_redes || v.subtitulo || '').trim();
  const avisoTxt = [dir, horario].filter(Boolean).join(' · ');
  const pie = `<footer class="border-t border-white/10 bg-obsidian"><div class="grid gap-12 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:px-14 md:py-24"><div><p class="${K.rot}">${esc(titCont)}</p><p class="mt-5 max-w-sm font-display text-2xl font-extrabold uppercase leading-tight text-static md:text-3xl">${esc(titular)}</p><p class="mt-2 font-body text-[10px] uppercase tracking-[0.35em] text-phosphor/80">${esc(nombre)}</p>${descripcion ? `<p class="mt-4 max-w-sm text-sm leading-relaxed text-ash">${esc(descripcion)}</p>` : ''}${marcas ? `<div class="mt-6 flex flex-wrap items-center gap-4">${marcas}</div>` : ''}</div><div><p class="font-body text-[10px] uppercase tracking-[0.3em] text-ash">Secciones</p><ul class="mt-5 space-y-3 text-sm">${secs.map(([id, n]) => `<li><a class="text-static transition-colors hover:text-phosphor" href="#${id}">${esc(n)}</a></li>`).join('')}</ul></div><div><p class="font-body text-[10px] uppercase tracking-[0.3em] text-ash">${avisoTxt ? 'Visítanos' : 'Escríbenos'}</p><p class="mt-5 text-sm leading-relaxed text-ash">${esc(avisoTxt || 'Te respondemos por WhatsApp.')}</p>${fueraTarjeta.map(([tipo, t, , u]) => `<a class="mt-3 block text-sm text-static transition-colors hover:text-phosphor [overflow-wrap:anywhere]" href="${esc(u)}"${/^mailto:/.test(u) ? '' : ext}>${esc(tipo === 'Correo' ? t : tipo)}</a>`).join('')}${mapa ? `<a class="mt-4 inline-block font-body text-[9px] uppercase tracking-[0.25em] text-phosphor underline-offset-4 transition-colors hover:underline" href="${esc(mapa)}"${ext}>Cómo llegar ↗</a>` : ''}</div></div><div class="flex flex-col gap-2 border-t border-white/10 px-6 py-6 font-body text-[10px] uppercase tracking-[0.28em] text-white/30 md:flex-row md:items-center md:justify-between md:px-14"><span>© ${new Date().getFullYear()} ${esc(nombre)} · Propuesta ${esc(d.letra || '')}: ${esc(d.titulo || 'Señal')}</span><a class="text-phosphor/70" ${waHref.trim()}>${esc(cta)}</a></div></footer>`;

  const css = CSS_SENAL
    .replace('/*FOSFORO*/', `--ph:${ph};`)
    .replace('/*LETRAS*/', `--font-display:'${par.titulos}', ui-sans-serif, system-ui, sans-serif;--font-body:'${par.cuerpo}', ui-monospace, monospace;`);
  const fuentes = urlFuentes(par);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(titular)} · ${esc(nombre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fuentes}">
<style>${css}</style></head>
<body class="l-senal"><div class="min-h-screen bg-void font-body text-static antialiased"><div aria-hidden="true" class="scanline-veil pointer-events-none fixed inset-0 z-[70] opacity-60 mix-blend-overlay"></div>${lateral}${barraMovil}<div class="md:pl-[92px]"><main class="pt-14 md:pt-0">${hero}${cinta}${partes.join('')}</main>${pie}</div></div>
<span class="etq">Propuesta ${esc(d.letra || '')}</span>
</body></html>`;
  return { html, usadas, fuentes: par, fosforo: ph };
}

/** Paleta que se guarda con la propuesta (para el sitio en vivo y el panel). */
export const paletaSenal = (brief = {}) => ({ bg: '#050505', fg: '#E0E0E0', primary: colorFosforo(brief), muted: '#8B8B8B', banda: '#0A0A0B', tarjeta: '#0A0A0B', borde: 'rgba(255,255,255,.1)' });

/** Para la revisión visual: todo quieto (la cinta y el parpadeo no se mueven) y la columna lateral visible. */
export const CSS_REVISION_SENAL = '.marquee-track,.phosphor-flicker,.animate-pulse{animation:none!important}';
