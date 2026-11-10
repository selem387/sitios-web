// 6 propuestas por arquetipo (servicios, clínica, inmobiliaria, oficios, educación, turismo, tienda, genérico).
// Restaurante/cafetería sigue con su plantilla de menú (propuestas_html.js).
// REGLA DURA: todo el material del cliente (logo, fotos, su foto, reseñas, catálogos, documentos, video) aparece en
// cada una de las 6. Lo que no cabe en una sección temática va a la galería final; el validador lo confirma.
import { corregirPaleta } from './tipo_color.js';
import { esDireccionRef, paletaRef, aplicarRef } from './estilo_ref.js';
import { parPorNombres } from './fuentes.js';
import { coloresParaPropuesta } from './paletas_giro.js';
import { mezclar, contraste } from '../entrevista/tema.js';
import { esPastel, coloresDePalabras } from './materiales.js';
import { waUrl, formatoTel } from './bloques.js';
import { sliderHTML, diapositivasDe, emparejarFotos, CSS_MOVIMIENTO, JS_MOVIMIENTO, efectosDe, filaJustificada, CSS_JUSTIFICADA } from './movimiento.js';
import { enlacesRedes, CSS_REDES } from './iconos_redes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lum = (h) => { const n = parseInt(h.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const sobre = (bg, a = '#FFFFFF', b = '#16120F') => (contraste(a, bg) >= contraste(b, bg) ? a : b);
const hsl = (h) => { let [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H /= 6; } return [H, S, L]; };
const deHsl = (H, S, L) => { const f = (n) => { const k = (n + H * 12) % 12, a = S * Math.min(L, 1 - L); return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`.toUpperCase(); };
// Mismo matiz, saturación mínima y luminosidad dada: oscurecer sin volverse gris.
const tono = (h, L, Smin = 0.32, Smax = 1) => { const [H, S] = hsl(h); return deHsl(H, Math.min(Smax, Math.max(S, Smin)), L); };
const conContraste = (c, bg, min = 4.5, hacia = '#000000') => { let x = c; for (let i = 0; i < 12 && contraste(x, bg) < min; i++) x = mezclar(x, hacia, 0.15); return x; };

export const LAYOUTS_GENERAL = ['portada', 'editorial', 'mosaico', 'logo', 'dostonos', 'carta'];
export const NOMBRES_GENERAL = { portada: 'Foto a pantalla completa', editorial: 'Editorial', mosaico: 'Mosaico de tu trabajo', logo: 'Tu logo al centro', dostonos: 'Dos tonos', carta: 'Minimalista' };

// Títulos por arquetipo (Claude puede reemplazarlos con textos.secciones).
export const TITULOS = {
  servicios: { trabajo: 'Mi trabajo', servicios: 'Paquetes', sobre: 'Sobre mí', resenas: 'Lo que dicen mis clientes', faq: 'Preguntas frecuentes', contacto: 'Hablemos', galeria: 'Más momentos' },
  clinica: { trabajo: 'Resultados', servicios: 'Tratamientos', sobre: 'Quién te atiende', resenas: 'Pacientes', faq: 'Preguntas frecuentes', contacto: 'Agenda tu cita', galeria: 'Nuestro espacio' },
  inmobiliaria: { trabajo: 'Propiedades', servicios: 'Cómo te ayudamos', sobre: 'Quiénes somos', resenas: 'Clientes', faq: 'Preguntas frecuentes', contacto: 'Contáctanos', galeria: 'Más fotos' },
  oficios: { trabajo: 'Trabajos realizados', servicios: 'Servicios', sobre: 'Quién soy', resenas: 'Clientes', faq: 'Preguntas frecuentes', contacto: 'Pide tu servicio', galeria: 'Más trabajos' },
  educacion: { trabajo: 'Así son las clases', servicios: 'Cursos', sobre: 'Quién enseña', resenas: 'Alumnos', faq: 'Preguntas frecuentes', contacto: 'Inscríbete', galeria: 'Más fotos' },
  turismo: { trabajo: 'Conoce el lugar', servicios: 'Experiencias', sobre: 'Quiénes somos', resenas: 'Huéspedes', faq: 'Preguntas frecuentes', contacto: 'Reserva', galeria: 'Galería' },
  tienda: { trabajo: 'Productos', servicios: 'Catálogo', sobre: 'Nuestra historia', resenas: 'Clientes', faq: 'Preguntas frecuentes', contacto: 'Pide el tuyo', galeria: 'Más productos' },
  generico: { trabajo: 'Nuestro trabajo', servicios: 'Servicios', sobre: 'Quiénes somos', resenas: 'Clientes', faq: 'Preguntas frecuentes', contacto: 'Contacto', galeria: 'Galería' },
};

/* ---------------- Paletas ---------------- */
// Pastel: fondo claro del pastel, botón en el mismo tono oscurecido. Si no, base de la marca (como la plantilla de menú).
function paletaGeneral(layout, colores, pastel, i, { acento = null, acentoCta = false } = {}) {
  const cs = colores.filter((c) => /^#[0-9A-F]{6}$/i.test(c));
  let base, tinte;
  if (pastel) {
    const pas = cs.filter((c) => lum(c) > 0.45 && hsl(c)[1] > 0.12); // sin grises
    tinte = pas[i % Math.max(pas.length, 1)] || '#F2C4CE';
    base = conContraste(tono(tinte, 0.42, 0.22, 0.34), '#FFFFFF', 4.6, tono(tinte, 0.18, 0.25, 0.34));
  } else {
    // Paleta del logo (10-nov-2026): cuando hay logo sus colores mandan y las 6 opciones ROTAN el color protagonista
    // entre los colores del logo (60-30-10: neutro derivado del logo / color protagonista / acento del logo).
    // Antes solo rotaban los oscuros (negro y verde azulado en El Rincón del Mayab) y el dorado del logo nunca protagonizaba.
    // Orden de candidatos: cromáticos oscuros tal cual → cromáticos claros profundizados hasta contraste AA con blanco →
    // negro/gris solo como última variante (es tinta, no color de marca, salvo que no haya otro).
    const croma = (c) => { const v = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); return (Math.max(...v) - Math.min(...v)) / 255; };
    const crom = cs.filter((c) => croma(c) > 0.2 && lum(c) > 0.015 && lum(c) < 0.92); // color de verdad (no cremas ni grises)
    const acrom = cs.filter((c) => !crom.includes(c) && lum(c) < 0.25);
    const candidatos = [...crom.filter((c) => lum(c) < 0.25), ...crom.filter((c) => lum(c) >= 0.25), ...acrom];
    const elegido = candidatos[i % Math.max(candidatos.length, 1)] || cs.find((c) => lum(c) < 0.5) || '#3A3330';
    base = conContraste(elegido, '#FFFFFF', 4.6);
    // Tinte: el color claro del logo que NO es el protagonista (o el protagonista aclarado).
    tinte = crom.find((c) => c !== elegido && lum(c) > 0.3) || cs.find((c) => c !== elegido && lum(c) > 0.5) || mezclar(base, '#FFFFFF', 0.82);
  }
  const papel = mezclar(tinte, '#FFFFFF', 0.72);
  const tinta = conContraste(tono(base, 0.17, 0.12, 0.3), papel, 8);
  const p = {
    portada: { bg: mezclar(papel, '#FFFFFF', 0.5), fg: tinta, primary: base, muted: papel },
    editorial: { bg: '#FFFFFF', fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.55) },
    mosaico: { bg: papel, fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.35) },
    logo: { bg: mezclar(tinte, '#FFFFFF', 0.45), fg: tinta, primary: base, muted: '#FFFFFF' },
    dostonos: { bg: '#FFFFFF', fg: tinta, primary: base, muted: papel, banda: conContraste(tono(base, 0.3, 0.2, 0.32), '#FFFFFF', 7) },
    carta: { bg: mezclar(papel, '#FFFFFF', 0.65), fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.5) },
  }[layout];
  p.primary = conContraste(p.primary, p.bg, 4.5);
  p.onPrimary = sobre(p.primary);
  p.soft = conContraste(mezclar(p.fg, p.bg, 0.3), p.bg, 4.6);
  p.border = mezclar(p.fg, p.bg, 0.86);
  p.card = mezclar(p.bg, '#FFFFFF', 0.6);
  p.tinte = tinte;
  // Tercer color (8-nov-2026): acento en el 10 % (viñetas, pasos, líneas) y, en B y E, también en el botón principal.
  // El acento nunca repite el tono del protagonista: si coincide (diferencia < 25°), se usa otro color del logo.
  const difTono = (a, b) => { const d = Math.abs(hsl(a)[0] - hsl(b)[0]); return Math.min(d, 1 - d) * 360; };
  const croma2 = (c) => { const v = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); return (Math.max(...v) - Math.min(...v)) / 255; };
  const distinto = (c) => c && /^#[0-9A-F]{6}$/i.test(c) && croma2(c) > 0.2 && lum(c) < 0.6 && c !== base && difTono(c, base) >= 25;
  const acc = distinto(acento) ? acento : (colores.filter((c) => /^#[0-9A-F]{6}$/i.test(c)).find(distinto) || null);
  if (acc) { p.accent = acc; p.accentUso = 'relleno'; p.acentoCta = !!acentoCta; }
  return p;
}

/* ---------------- Logo con contraste garantizado ---------------- */
// Logo de un solo color que no contrasta con el fondo → se pinta con el color de la tinta (máscara CSS), así se ve siempre.
// Logo a color que no contrasta → placa de color contrario. Devuelve HTML que siempre incluye la URL del logo.
export function logoHTML(logo, bg, fg, { clase = 'logo', alt = '' } = {}) {
  if (!logo?.url) return `<span class="nombre">${esc(alt)}</span>`;
  const claroLogo = logo.tono === 'claro', fondoClaro = lum(bg) > 0.4;
  const choca = claroLogo === fondoClaro;
  const ratio = logo.ancho && logo.alto ? (logo.ancho / logo.alto).toFixed(3) : '3';
  if (choca && logo.mono !== false) {
    const t = logo.tenidos?.[fg];
    if (t) return `<img class="${clase}" src="${esc(t)}" alt="${esc(alt)}">`;
    // Sin versión pintada: la original oscurecida o aclarada con filtro (siempre visible).
    return `<img class="${clase}" src="${esc(logo.url)}" alt="${esc(alt)}" style="filter:brightness(${fondoClaro ? 0 : 100})${fondoClaro ? ' opacity(.85)' : ''}">`;
  }
  if (choca) return `<span class="${clase}-placa" style="background:${fondoClaro ? '#1C1714' : '#FFFFFF'}"><img class="${clase}" src="${esc(logo.url)}" alt="${esc(alt)}"></span>`;
  return `<img class="${clase}" src="${esc(logo.url)}" alt="${esc(alt)}">`;
}

/* ---------------- Datos ---------------- */
// "Smash Cake (Primer Año) - Paquete #1" → grupo "Smash Cake (Primer Año)", opción "Paquete #1".
export function agruparOferta(items = []) {
  const grupos = new Map();
  for (const it of items) {
    const nombre = String(it.nombre || '').trim();
    if (!nombre) continue;
    let g = nombre, op = '';
    // Categoría explícita (la que escribió el cliente, p. ej. "🎂 Smash Cake | Primer Añito"): el nombre queda como opción.
    if (it.grupo && String(it.grupo).trim()) {
      g = String(it.grupo).trim(); op = nombre;
      const k = g.toLowerCase();
      const grupo = grupos.get(k) || { nombre: g, opciones: [] };
      grupo.opciones.push({ nombre: op, precio: it.precio_o_rango || it.precio || '', detalle: it.descripcion_corta || it.descripcion || '', destacado: !!it.destacado });
      grupos.set(k, grupo);
      continue;
    }
    const sinPar = nombre.replace(/\([^)]*\)/g, (x) => x.replace(/[-–]/g, '\u0000'));
    const m = (sinPar.match(/^(.*?)\s+[-–]\s+(.+)$/) || sinPar.match(/^(.*?)\s+(Paquete\s*#?\s*\d+.*)$/i))?.map((x) => x?.replace(/\u0000/g, '-'));
    if (m && m[1].length > 2) { g = m[1].trim(); op = m[2].trim(); }
    const k = g.toLowerCase();
    const grupo = grupos.get(k) || { nombre: g, opciones: [] };
    grupo.opciones.push({ nombre: op || null, precio: it.precio_o_rango || it.precio || '', detalle: it.descripcion_corta || it.descripcion || '', destacado: !!it.destacado });
    grupos.set(k, grupo);
  }
  return [...grupos.values()];
}

/** Giro en una línea legible: su primera frase (antes de ":" ";" o "("), recortada en palabra completa. */
export function giroCorto(giro, max = 48) {
  let t = String(giro || '').split(/[:;(]/)[0].trim();
  if (t.length > max) { t = t.slice(0, max); t = t.slice(0, Math.max(t.lastIndexOf(','), t.lastIndexOf(' '))).replace(/[,\s]+$/, ''); }
  return t;
}

/** Texto largo del cliente: un <p> por párrafo (renglón en blanco), saltos simples respetados y **negritas** del chat como <strong>. */
export function parrafosHTML(texto, clase = '') {
  const ps = String(texto || '').replace(/\r/g, '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const neg = (x) => esc(x).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  return ps.map((x) => `<p${clase ? ` class="${clase}"` : ''}>${neg(x)}</p>`).join('');
}

/** Descripción de un paquete tal cual la escribió el cliente: cada renglón con "- " o "• " va en su propio <li>; los demás, párrafos. */
export function detalleHTML(texto) {
  const lineas = String(texto || '').replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (!lineas.length) return '';
  let html = '', lista = [];
  const cerrar = () => { if (lista.length) { html += `<ul class="inc">${lista.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; lista = []; } };
  for (const l of lineas) {
    const m = l.match(/^[-•*]\s+(.+)$/);
    if (m) lista.push(m[1]);
    else { cerrar(); html += `<span>${esc(l)}</span>`; }
  }
  cerrar();
  return html;
}

export function redes(c = {}) {
  const r = c.redes || {};
  const url = (v, base) => (!v ? null : /^https?:/i.test(v) ? v : `${base}${String(v).replace(/^@/, '')}`);
  return [['Instagram', url(r.instagram, 'https://instagram.com/')], ['Facebook', url(/^\d{6,}$/.test(String(r.facebook || '')) ? `profile.php?id=${r.facebook}` : r.facebook, 'https://facebook.com/')], ['TikTok', url(r.tiktok, 'https://tiktok.com/@')], ['YouTube', url(r.youtube, 'https://youtube.com/@')], ['LinkedIn', url(r.linkedin, 'https://www.linkedin.com/company/')]].filter((x) => x[1]);
}

// Flechas del carrusel de "Nuestro trabajo": avanzan ~80% del ancho visible y se apagan en los extremos.
const JS_CAR_TRABAJO = `<script>(()=>{document.querySelectorAll('#trabajo').forEach(sec=>{const g=sec.querySelector('.g-car'),a=sec.querySelector('.tr-ant'),b=sec.querySelector('.tr-sig');if(!g||!a||!b)return;
const est=()=>{a.disabled=g.scrollLeft<4;b.disabled=g.scrollLeft+g.clientWidth>=g.scrollWidth-4;sec.querySelector('.tr-nav').hidden=g.scrollWidth<=g.clientWidth+4};
a.addEventListener('click',()=>g.scrollBy({left:-g.clientWidth*.8,behavior:'smooth'}));b.addEventListener('click',()=>g.scrollBy({left:g.clientWidth*.8,behavior:'smooth'}));
g.addEventListener('scroll',est,{passive:true});addEventListener('resize',est,{passive:true});addEventListener('load',est);est()})})();</script>`;

// Diseño "Tu logo al centro" (10-nov-2026): el logo grande de la portada y el de la barra no se ven a la vez;
// el de la barra aparece cuando el grande sale de la pantalla.
const JS_LOGO_UNICO = `<script>(()=>{const g=document.querySelector('.h-logo .logo-grande,.h-logo .logo-grande-placa'),b=document.querySelector('.barra');if(!b)return;if(!g||!('IntersectionObserver'in window)){b.classList.add('ver-logo');return;}new IntersectionObserver(([e])=>b.classList.toggle('ver-logo',!e.isIntersecting),{rootMargin:'-70px 0px 0px 0px'}).observe(g);})();</script>`;

/* ---------------- Página ---------------- */
function pagina(d) {
  const { pal: p, f, t, mat, brief } = d;
  const usadas = new Set();
  const img = (x, { cls = '', eager = false, sizes = '', extra = '' } = {}) => { usadas.add(x.url); return `<img${cls ? ` class="${cls}"` : ''} src="${esc(x.url)}" alt="${esc(x.alt || '')}" loading="${eager ? 'eager' : 'lazy'}"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}${sizes}${extra}>`; };
  const wa = d.wa ? ` href="${esc(d.wa)}" target="_blank" rel="noopener"` : ' href="#contacto"';
  // WhatsApp con mensaje sobre una foto concreta (para "+ info" del carrusel de trabajo).
  const waFoto = (x) => {
    if (!d.wa) return ' href="#contacto"';
    try {
      const u0 = new URL(d.wa), tel = (u0.pathname.match(/\d{8,}/) || [u0.searchParams.get('phone') || ''])[0];
      const nombre = (x.nombre || (x.alt || '').split(/[,.;]/)[0] || 'este producto').trim();
      const texto = `Hola, me interesa: ${nombre}. ¿Me das más información?`;
      // api.whatsapp.com/send con app_absent=0 abre el chat directo (app en celular, WhatsApp Web en computadora).
      const u = `https://api.whatsapp.com/send/?phone=${tel}&text=${encodeURIComponent(texto)}&type=phone_number&app_absent=0`;
      return ` href="${esc(u)}" target="_blank" rel="noopener"`;
    } catch { return wa; }
  };
  const figTr = (x) => `<figure>${img(x)}<a class="tr-info"${waFoto(x)} aria-label="Pedir información de ${esc(x.nombre || 'esta foto')} por WhatsApp">+ info</a></figure>`;
  const logoBarra = logoHTML(mat.logo, p.bg, p.fg, { alt: d.nombre });
  const neg = brief.negocio || {}, conf = brief.confianza || {}, fund = conf.fundador || {};

  // Orden de fotos por propuesta: rota para que cada una abra con una imagen distinta.
  // Capturas de pantalla y fotos regulares nunca abren la página: van después (se muestran igual en la galería).
  const buenaFoto = (x) => !x.captura && x.calidad !== 'regular';
  const trabajos = [...mat.trabajos, ...mat.local].filter(buenaFoto);
  const capturasT = [...mat.trabajos, ...mat.local].filter((x) => !buenaFoto(x));
  const rot = (arr, k) => (arr.length ? [...arr.slice(k % arr.length), ...arr.slice(0, k % arr.length)] : []);
  const fotosT = [...rot(trabajos, d.i * 2), ...capturasT];
  // La foto que el cliente eligió para la portada va en las propuestas A y D; las demás abren con su trabajo.
  // En el sitio en vivo, si el dueño eligió la foto de portada desde su panel, esa abre la página en cualquier diseño.
  // Estilo de referencia: varias opciones son "foto a pantalla completa"; solo la A abre con su foto de portada,
  // las demás con otra foto de su trabajo para que no se vean iguales (si el dueño fijó portada, se respeta en todas).
  const variar = d.dref && d.letra !== 'A' && !brief.fotos?.portada_manual;
  const heroBase = !variar && (d.layout === 'portada' || d.layout === 'logo' || (brief.fotos?.portada_manual && mat.hero)) ? (mat.hero || fotosT[0]) : (fotosT[0] || mat.hero || mat.fundador);
  // Si el titular habla de un producto, abre con la foto de ese producto (la eligió la IA de textos por su descripción).
  const fotoTit = !brief.fotos?.portada_manual && t.foto_url ? [mat.hero, ...trabajos].find((x) => x?.url === t.foto_url) : null;
  const heroFoto = fotoTit || heroBase;

  const cta = (cls = '') => `<a class="btn ${cls}"${wa}>${esc(t.cta)}</a>`;
  const info = (t.info || []).map((x) => `<li>${esc(x)}</li>`).join('');

  // Slider de portada (aprobado 6-nov-2026): foto principal + hasta 4 fotos más, cada una con su texto encima.
  // Solo fotos buenas del cliente (o variaciones IA de su foto si dijo que no tiene más); nunca se repiten en el resto del sitio.
  // Mínimo 5 fotos en el slider (10-nov-2026): si las de trabajo no alcanzan, se suman equipo y otras fotos buenas.
  const extraSl = [...mat.equipo, ...(mat.otras || [])].filter((x) => buenaFoto(x) && /^(foto|imagen)/.test(x.tipo || 'foto') && !fotosT.some((y) => y.url === x.url));
  const emp = emparejarFotos({ hero: heroFoto, pool: [...fotosT.filter(buenaFoto), ...extraSl], diapos: diapositivasDe({ diapositivas: t.diapositivas }, brief), items: brief.oferta?.items || [], cta: t.cta });
  const poolSl = emp.fotos, diapos = emp.diapos;
  const enPortada = new Set(); // fotos del mosaico de portada: pueden repetirse en "Nuestro trabajo" como las del slider
  const slider = (o) => sliderHTML({ fotos: poolSl, diapos, img, cta: t.cta, href: wa, nombre: d.nombre, ...o }).html;
  const textoPortada = `<p class="kicker">${esc(neg.ciudad ? `${giroCorto(neg.giro_texto) || ''} · ${neg.ciudad}` : giroCorto(neg.giro_texto) || '')}</p><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}`;

  /* --- Héroes --- */
  const heros = {
    portada: () => (heroFoto ? slider({ tag: 'section', clase: 'hero h-portada', envolver: true, primera: textoPortada })
      : `<section class="hero h-portada"><div class="velo"></div><div class="wrap in">${textoPortada}</div></section>`),
    editorial: () => `<section class="hero h-edit wrap"><div class="txt"><p class="kicker">${esc(giroCorto(neg.giro_texto) || '')}</p><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}<ul class="info">${info}</ul></div>${heroFoto ? slider({ tag: 'figure', clase: 'arco sl-marco' }) : ''}</section>`,
    mosaico: () => { const s = poolSl.length ? slider({ tag: 'div', clase: 'mos-sl sl-marco' }) : ''; const m = fotosT.filter((x) => !usadas.has(x.url)).slice(0, s ? 4 : 5); return `<section class="hero h-mos wrap"><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}<div class="mos m${m.length + (s ? 1 : 0)}${s && m.length < 2 ? ' solo' : ''}">${s}${m.map((x, k) => { enPortada.add(x.url); return img(x, { eager: k < 1, cls: 'rep-ok' }); }).join('')}</div></section>`; },
    logo: () => `<section class="hero h-logo wrap">${mat.logo ? logoHTML(mat.logo, p.bg, p.fg, { clase: 'logo-grande', alt: d.nombre }) : `<p class="nombre-grande">${esc(d.nombre)}</p>`}<h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}${heroFoto ? slider({ tag: 'figure', clase: 'ovalo sl-marco' }) : ''}</section>`,
    dostonos: () => `<section class="hero h-dos"><div class="wrap in"><div class="txt"><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta('inv')}</div>${heroFoto ? slider({ tag: 'figure', clase: 'marco sl-marco' }) : ''}</div></section>`,
    carta: () => { const s = poolSl.length ? `<div class="wrap">${slider({ tag: 'figure', clase: 'sl-carta sl-marco' })}</div>` : ''; const resto = s ? [] : fotosT.filter((x) => !usadas.has(x.url)).slice(0, 8); return `<section class="hero h-carta wrap"><p class="kicker">${esc(d.nombre)}</p><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}</section>${s}${resto.length ? `<div class="wrap">${filaJustificada(resto, img)}</div>` : ''}`; },
  };
  const promo = brief.oferta?.promocion_actual ? `<section class="promo" id="promocion"><div class="wrap"><p><b>Promoción</b> ${esc(brief.oferta.promocion_actual)}</p></div></section>` : '';
  const hero = heros[d.layout]() + promo;

  /* --- Secciones --- */
  const T = d.titulos;
  // "Nuestro trabajo" (10-nov-2026, decisión de Sebastián): lleva SIEMPRE todas las fotos de trabajo, aunque estén en el
  // slider (única excepción a "ninguna foto se repite"), y nunca menos de 5: si faltan, se suman otras fotos del cliente.
  // Solo se excluyen las que ya salieron fuera del slider (filas o mosaicos de la portada) para no duplicarlas.
  const enSlider = new Set(poolSl.map((x) => x.url));
  const secTrabajo = () => {
    const resto = fotosT.filter((x) => !usadas.has(x.url) || enSlider.has(x.url) || enPortada.has(x.url));
    for (const x of [...mat.equipo, ...(mat.otras || []), ...poolSl]) {
      if (resto.length >= 5) break;
      if (x?.url && /^(foto|imagen)/.test(x.tipo || 'foto') && !resto.some((y) => y.url === x.url) && (!usadas.has(x.url) || enSlider.has(x.url) || enPortada.has(x.url))) resto.push(x);
    }
    if (!resto.length) return '';
    // Carrusel horizontal (10-nov-2026, pedido de Sebastián): todas las fotos una al lado de la otra, misma altura, se
    // desliza con el dedo o con las flechas; cada foto lleva "+ info" que abre WhatsApp con la liga de esa foto.
    return `<section class="sec" id="trabajo"><div class="wrap"><div class="tr-cab"><h2>${esc(T.trabajo)}</h2><div class="tr-nav"><button type="button" class="tr-b tr-ant" aria-label="Fotos anteriores">&#8249;</button><button type="button" class="tr-b tr-sig" aria-label="Más fotos">&#8250;</button></div></div><div class="galeria g-car" tabindex="0" aria-label="${esc(T.trabajo)}">${resto.map(figTr).join('')}</div></div></section>`;
  };
  const grupos = agruparOferta(brief.oferta?.items || []);
  const mostrarPrecios = brief.oferta?.mostrar_precios !== false || brief.oferta?.mostrar_paquetes;
  const secServicios = () => {
    if (!grupos.length && !mat.catalogos.length && !mat.documentos.length) return '';
    // Servicios con varios paquetes (y cantidades distintas): título con línea divisoria por servicio
    // y debajo una rejilla con un cuadro por paquete. Si cada servicio es uno solo, un cuadro por servicio.
    const conPaquetes = grupos.some((g) => g.opciones.length > 1);
    const hN = conPaquetes ? 'h4' : 'h3'; // dentro de un servicio con título, cada paquete es un nivel abajo
    const cuadro = (o, titulo = null) => `<article class="paq"><div class="paq-cab">${titulo || o.nombre ? `<${hN}>${esc(titulo || o.nombre)}</${hN}>` : ''}${mostrarPrecios && o.precio ? `<em>${esc(o.precio)}</em>` : ''}</div>${titulo && o.nombre ? `<b class="paq-op">${esc(o.nombre)}</b>` : ''}${o.detalle ? `<div class="paq-det">${detalleHTML(o.detalle)}</div>` : ''}</article>`;
    const cards = conPaquetes
      ? grupos.map((g) => `<div class="paq-grupo"><h3 class="grupo-t">${esc(g.nombre)}</h3><div class="paqs">${g.opciones.map((o) => cuadro(o)).join('')}</div></div>`).join('')
      : grupos.map((g) => (g.opciones.length === 1 ? cuadro(g.opciones[0], g.nombre) : '')).join('');
    const cat = mat.catalogos.map((x) => `<a class="catimg" href="${esc(x.url)}" target="_blank" rel="noopener">${img(x)}</a>`).join('');
    const docs = mat.documentos.map((x) => `<a class="doc" href="${esc(x.url)}" target="_blank" rel="noopener">Ver ${esc(/pdf/i.test(x.url) ? 'catálogo (PDF)' : x.alt || 'documento')}</a>`).join('');
    for (const x of mat.documentos) usadas.add(x.url);
    return `<section class="sec" id="servicios"><div class="wrap"><h2>${esc(T.servicios)}</h2>${cards ? (conPaquetes ? cards : `<div class="paqs">${cards}</div>`) : ''}${cat ? `<div class="cats">${cat}</div>` : ''}${docs}<div class="centro">${cta()}</div></div></section>`;
  };
  const secSobre = () => {
    const otra = mat.equipo.find((x) => x.tipo === 'foto_fundador' && !usadas.has(x.url));
    // Si su foto ya está en la portada, aquí va otra suya o ninguna (nunca la misma dos veces).
    const foto = mat.fundador && usadas.has(mat.fundador.url) ? (otra || null) : (mat.fundador || otra || null);
    if (!foto && !conf.historia_corta) return '';
    const cifras = (conf.cifras || []).slice(0, 3).map((c) => `<li>${esc(c)}</li>`).join('');
    const cred = (fund.credenciales || []).map((c) => esc(c)).join(' · ');
    return `<section class="sec sobre" id="sobre"><div class="wrap s-in${foto ? '' : ' sin-foto'}">${foto ? `<figure class="retrato">${img(foto)}</figure>` : ''}<div><h2>${esc(T.sobre)}</h2>${fund.nombre ? `<p class="firma">${esc(fund.nombre)}${fund.rol ? ` · ${esc(fund.rol)}` : ''}</p>` : ''}<div class="historias">${parrafosHTML(t.sobre || conf.historia_corta || '', 'historia')}</div>${cred ? `<p class="cred">${cred}</p>` : ''}${cifras ? `<ul class="cifras">${cifras}</ul>` : ''}</div></div></section>`;
  };
  const secEquipo = () => { const eq = mat.equipo.filter((x) => !usadas.has(x.url)); return eq.length ? `<div class="wrap"><div class="galeria g-eq">${eq.map((x) => `<figure>${img(x)}</figure>`).join('')}</div></div>` : ''; };
  const secResenas = () => {
    const tes = (conf.testimonios || []).filter((x) => x.texto);
    if (!tes.length && !mat.resenas.length) return '';
    const limpio = (s) => String(s).replace(/\p{Extended_Pictographic}/gu, '').trim();
    const cards = tes.map((x) => `<blockquote><p>${esc(limpio(x.texto))}</p>${x.nombre ? `<cite>${esc(x.nombre)}</cite>` : ''}</blockquote>`).join('');
    const caps = mat.resenas.map((x) => `<figure class="cap">${img(x)}</figure>`).join('');
    // Testimonios y capturas de reseñas en una sola fila a todo el ancho (hasta 4); más de 4 siguen en filas parejas.
    const n = tes.length + mat.resenas.length;
    const fila = `<div class="quotes q${Math.min(n, 4)}">${cards}${caps}</div>`;
    return `<section class="sec resenas" id="resenas"><div class="wrap"><h2>${esc(T.resenas)}</h2>${fila}</div></section>`;
  };
  const secProceso = () => { const ps = brief.oferta?.proceso_pasos || []; return ps.length >= 3 ? `<section class="sec"><div class="wrap"><h2>${esc(t.proceso || 'Cómo funciona')}</h2><ol class="pasos">${ps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div></section>` : ''; };
  const secFaq = () => { const fq = (brief.faq || []).filter((x) => x.pregunta && x.respuesta); return fq.length ? `<section class="sec" id="faq"><div class="wrap"><div class="faq-l"><h2>${esc(T.faq)}</h2>${fq.map((x, k) => `<details${k === 0 ? ' open' : ''}><summary>${esc(x.pregunta)}</summary><p>${esc(x.respuesta)}</p></details>`).join('')}</div></div></section>` : ''; };
  const secVideo = () => mat.videos.length ? `<section class="sec"><div class="wrap">${mat.videos.map((v) => { usadas.add(v.url); return `<video class="video" src="${esc(v.url)}" controls playsinline preload="metadata"></video>`; }).join('')}</div></section>` : '';
  const secContacto = () => {
    const c = brief.contacto || {};
    const dir = c.direccion && typeof c.direccion === 'object' ? [c.direccion.calle, c.direccion.colonia, c.direccion.ciudad].filter(Boolean).join(', ') : c.direccion;
    const zona = (brief.zona?.cobertura || []).join(' · ');
    const rs = enlacesRedes(redes(c));
    return `<section class="sec contacto" id="contacto"><div class="wrap"><h2>${esc(T.contacto)}</h2><div class="datos">${d.tel ? `<p><b>WhatsApp</b><a${wa}>${esc(d.tel)}</a></p>` : ''}${dir ? `<p><b>Dónde</b>${esc(dir)}</p>` : zona ? `<p><b>Dónde</b>${esc(zona)}</p>` : ''}${typeof c.horarios === 'string' ? `<p><b>Horario</b>${esc(c.horarios)}</p>` : ''}${c.email ? `<p><b>Correo</b><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}${rs ? `<p><b>Redes</b><span class="rs">${rs}</span></p>` : ''}</div>${cta()}</div></section>`;
  };

  const ORDEN = {
    portada: [secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto],
    editorial: [secSobre, secTrabajo, secEquipo, secServicios, secResenas, secFaq, secVideo, secContacto],
    mosaico: [secServicios, secTrabajo, secResenas, secSobre, secEquipo, secProceso, secFaq, secVideo, secContacto],
    logo: [secTrabajo, secSobre, secEquipo, secServicios, secResenas, secFaq, secVideo, secContacto],
    dostonos: [secServicios, secTrabajo, secSobre, secEquipo, secResenas, secFaq, secVideo, secContacto],
    carta: [secServicios, secSobre, secEquipo, secResenas, secTrabajo, secFaq, secVideo, secContacto],
  }[d.layout];
  const cuerpo = ORDEN.map((fn) => fn()).join('');
  // Galería final: TODO lo que el cliente mandó y aún no aparece (regla dura). Nada se queda fuera.
  const pendientes = [...mat.trabajos, ...mat.local, ...mat.equipo, mat.fundador, ...mat.resenas, ...mat.catalogos, ...mat.otras, ...mat.menus, ...mat.fotos.filter((x) => !x.recorte)]
    .filter((x) => x && !usadas.has(x.url)).filter((x, k, a) => a.findIndex((y) => y.url === x.url) === k);
  // Galería final (10-nov-2026): una sección titulada "Galería" con 1 o 2 imágenes se ve vacía. Si sobran menos de 3,
  // se suman a la última sección de fotos que ya existe (fila de fotos o galería de trabajo); solo si no hay ninguna,
  // se arma una fila sin título. Con 3 o más sí lleva su sección.
  let galeria = '', cuerpoFinal = cuerpo, heroFinal = hero;
  if (pendientes.length >= 3) galeria = `<section class="sec" id="galeria"><div class="wrap"><h2>${esc(T.galeria)}</h2><div class="galeria g-mas">${pendientes.map((x) => `<figure>${img(x)}</figure>`).join('')}</div></div></section>`;
  else if (pendientes.length) {
    const r = (x) => (x.ancho && x.alto ? Math.min(2.4, Math.max(0.3, x.ancho / x.alto)) : 0.75).toFixed(3);
    const figs = pendientes.map((x) => `<figure style="--r:${r(x)}">${img(x)}</figure>`).join('');
    const enGal = /(<section class="sec" id="trabajo">[\s\S]*?<div class="galeria[^"]*">[\s\S]*?)(<\/div><\/div><\/section>)/;
    if (heroFinal.includes('<div class="just')) heroFinal = heroFinal.replace(/(<div class="just[^"]*">[\s\S]*?)(<\/div><\/div>)(?![\s\S]*<div class="just)/, `$1${figs}$2`);
    else if (enGal.test(cuerpoFinal)) cuerpoFinal = cuerpoFinal.replace(enGal, (m, a, b) => `${a}${pendientes.map((x) => (a.includes('g-car') ? figTr(x) : `<figure>${img(x)}</figure>`)).join('')}${b}`);
    else galeria = `<div class="wrap">${filaJustificada(pendientes, img)}</div>`;
  }
  // Otras versiones del logo (logo sobre fondo, con lema): firma de marca en el pie, nunca como foto de galería.
  const marcaPie = (mat.logos_extra || []).filter((x) => x?.url).map((x) => `<img class="pie-marca" src="${esc(x.url)}" alt="${esc(d.nombre)}" loading="lazy"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}>`).join('');

  const navs = [['trabajo', T.trabajo], ['servicios', T.servicios], ['sobre', T.sobre], ['contacto', T.contacto]].filter(([id]) => cuerpo.includes(`id="${id}"`));
  const ft = f.titulos, fc = f.cuerpo;
  const html = `<!doctype html><html lang="es" class="${efectosDe(d.letra)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(d.nombre)} · Propuesta ${d.letra}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><!-- Tipografías sin bloquear la portada (7-nov-2026): la página se pinta con la letra de respaldo y cambia a la de Google en cuanto llega (display=swap). Lighthouse móvil ≥ 90. --><link rel="preload" as="style" href="${esc(d.fuentesUrl)}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link href="${esc(d.fuentesUrl)}" rel="stylesheet"></noscript>
<style>
:root{--bg:${p.bg};--fg:${p.fg};--p:${p.primary};--on:${p.onPrimary};--mut:${p.muted};--card:${p.card};--soft:${p.soft};--bor:${p.border};--tin:${p.tinte};--banda:${p.banda || p.primary};--acc:${p.accent || p.primary};--on-acc:${p.onAccent || p.onPrimary};--btn:${p.acentoCta && p.accent ? p.accent : p.primary};--on-btn:${p.acentoCta && p.accent ? p.onAccent || p.onPrimary : p.onPrimary};--ft:'${ft}',serif;--fc:'${fc}',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:var(--bg);color:var(--fg);font-family:var(--fc);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}a{color:inherit}
h1,h2,h3{font-family:var(--ft);font-weight:400;line-height:1.06;letter-spacing:-.015em;text-wrap:balance}h1{font-size:clamp(36px,9vw,72px)}h2{font-size:clamp(28px,6.5vw,44px);margin-bottom:22px}h3{font-size:22px}
.wrap{max-width:1140px;margin:0 auto;padding:0 20px}.estrecho{max-width:760px}.faq-l{max-width:820px}.centro{text-align:center}
.barra{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--bor)}
.barra .in{display:flex;align-items:center;justify-content:space-between;height:68px}
.logo{height:46px;width:auto;max-width:220px}.logo-placa{display:inline-flex;padding:6px 12px;border-radius:12px}.logo-grande-placa{display:inline-flex;padding:18px 28px;border-radius:22px;margin:0 auto}
.nombre{font-family:var(--ft);font-size:22px}
.barra nav{display:flex;gap:22px;font-size:15px;font-weight:600}.barra nav a{text-decoration:none}
.kicker{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:var(--soft);margin-bottom:14px}
.sub{color:var(--soft);font-size:clamp(17px,4.4vw,20px);margin-top:16px;max-width:38ch}
.btn{display:inline-flex;align-items:center;justify-content:center;background:var(--btn);color:var(--on-btn);font-weight:700;text-decoration:none;padding:15px 26px;border-radius:999px;margin-top:24px;min-height:50px}.btn.inv{background:#fff;color:var(--banda)}${p.acentoCta && p.accent ? '.btn.inv{background:var(--acc);color:var(--on-acc)}' : ''}
.info{list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:22px;font-size:14px;color:var(--soft)}.info li::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--acc);margin-right:8px;vertical-align:2px}
.sec{padding:64px 0 8px}section[id]{scroll-margin-top:80px}
/* héroes */
.h-portada{position:relative;min-height:88vh;display:flex;align-items:flex-end;color:#fff;overflow:hidden}.h-portada .fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.h-portada .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.62))}.h-portada .in{position:relative;padding-bottom:56px;width:100%}.h-portada .sub,.h-portada .kicker{color:rgba(255,255,255,.88)}
.h-edit{display:grid;gap:28px;padding-top:36px}.arco{border-radius:999px 999px 24px 24px;overflow:hidden;aspect-ratio:4/5;max-height:620px}.arco img{width:100%;height:100%;object-fit:cover}
.h-mos{padding-top:40px;text-align:left}.mos{display:grid;gap:8px;margin-top:34px;grid-template-columns:repeat(2,1fr)}.mos>img{width:100%;height:100%;object-fit:cover;border-radius:14px;aspect-ratio:1}.mos>:first-child{grid-column:span 2;aspect-ratio:16/10}.mos-sl{border-radius:14px}.mos>.mos-sl{aspect-ratio:4/5}.mos.solo{grid-template-columns:1fr!important}.mos.solo>.mos-sl{grid-column:1/-1!important;grid-row:auto!important;aspect-ratio:4/5!important}.mos.solo>img{aspect-ratio:16/10}
.h-logo{text-align:center;padding-top:40px;padding-bottom:10px}.h-logo .sub{margin:16px auto 0}.logo-grande{height:auto;width:min(84%,460px);margin:0 auto 26px;display:block}
.nombre-grande{font-family:var(--ft);font-size:44px;margin-bottom:20px}.ovalo{width:min(78%,380px);margin:38px auto 0;border-radius:50%;overflow:hidden;aspect-ratio:3/4;border:8px solid var(--mut)}.ovalo img{width:100%;height:100%;object-fit:cover}
.h-dos{background:var(--banda);color:#fff;padding:42px 0 clamp(32px,4vw,56px);border-radius:0 0 36px 36px}.h-dos .in{display:grid;gap:26px}.h-dos .txt{padding-bottom:clamp(40px,5vw,72px)}.h-dos .sub{color:rgba(255,255,255,.86)}.marco{border-radius:24px;overflow:hidden;aspect-ratio:4/5;max-height:560px;border:10px solid rgba(255,255,255,.14)}.marco img{width:100%;height:100%;object-fit:cover}
.pie-marcas{display:flex;justify-content:center;gap:16px;margin-bottom:18px}.pie-marca{height:auto;width:auto;max-height:140px;max-width:min(80vw,360px);border-radius:12px;object-fit:contain}body.l-logo .barra .logo,body.l-logo .barra [class$="-placa"]{transition:opacity .3s ease}body.l-logo .barra:not(.ver-logo) .logo,body.l-logo .barra:not(.ver-logo) [class$="-placa"]{opacity:0;pointer-events:none}
.h-carta{padding-top:clamp(56px,8vw,112px);padding-bottom:clamp(28px,4vw,48px)}.h-carta h1{max-width:16ch}.h-carta .sub{max-width:46ch}${CSS_JUSTIFICADA}
/* galerías */
.tr-cab{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.tr-nav{display:flex;gap:8px;margin-bottom:22px}.tr-b{width:46px;height:46px;border-radius:50%;border:1px solid var(--bor);background:var(--card,#fff);color:var(--fg);font-size:26px;line-height:1;cursor:pointer;display:grid;place-items:center}.tr-b:hover{background:var(--fg);color:var(--bg)}.tr-b[disabled]{opacity:.35;cursor:default}
.galeria.g-car{display:flex;columns:auto;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:thin;padding-bottom:10px;overscroll-behavior-x:contain}
.galeria.g-car figure{position:relative;flex:0 0 auto;margin:0;scroll-snap-align:start;border-radius:12px;overflow:hidden;break-inside:auto}.galeria.g-car img{display:block;height:clamp(340px,52vw,520px);width:auto;max-width:none;border-radius:12px}
.tr-info{position:absolute;left:10px;bottom:10px;padding:4px 10px;min-height:28px;font-size:15px;display:inline-flex;align-items:center;border-radius:999px;background:rgba(255,255,255,.94);color:#111;text-decoration:none;font-weight:600;box-shadow:0 3px 10px rgba(0,0,0,.22);transition:transform .2s ease;line-height:1.2}.tr-info:hover{transform:translateY(-2px)}
.galeria{columns:2 160px;column-gap:10px}.galeria figure{break-inside:avoid;margin-bottom:10px}.galeria img{width:100%;height:auto;border-radius:12px}
.g-editorial{columns:2 150px}.g-carta img,.g-dostonos img{border-radius:4px}.g-logo img{border-radius:999px 999px 14px 14px}
.g-eq{margin-top:20px}
/* paquetes */
.paqs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.paq{background:var(--card);border:1px solid var(--bor);border-radius:20px;padding:22px}.paq h3{margin-bottom:10px}.paq ul{list-style:none}.paq li{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px dashed var(--bor)}.paq li:first-child{border-top:0}
.paq li b{display:block;font-size:15px}.paq li span{display:block;color:var(--soft);font-size:14px}.paq li em{font-style:normal;font-weight:800;color:var(--p);white-space:nowrap}.paq li span+span{margin-top:6px}
.paq-grupo+.paq-grupo{margin-top:40px}.grupo-t{display:flex;align-items:center;gap:16px;margin:0 0 18px;font-size:clamp(20px,2.6vw,26px)}.grupo-t::after{content:"";flex:1;height:1px;background:var(--bor)}
.paq-cab{display:flex;justify-content:space-between;align-items:baseline;gap:14px}.paq-cab h3,.paq-cab h4{margin:0;font-size:18px;line-height:1.25}.paq-cab em{font-style:normal;font-weight:800;color:var(--p);white-space:nowrap}
.paq-op{display:block;font-size:15px;margin-top:6px}.paq-det{margin-top:10px}.paq-det span{display:block;color:var(--soft);font-size:14px}.paq-det span+span{margin-top:6px}
.paq-det ul.inc{list-style:disc;padding-left:18px;margin-top:8px;color:var(--soft);font-size:14px}.paq-det ul.inc li{padding:2px 0}p.historia+p.historia{margin-top:14px}
.s-in.sin-foto{grid-template-columns:1fr!important}.sin-foto .historia{max-width:none}
@media (min-width:900px){.sin-foto .historias{columns:2;column-gap:56px}.sin-foto .historias p{break-inside:avoid}}.paq ul.inc{list-style:disc;padding-left:18px;margin-top:6px;color:var(--soft);font-size:14px}.paq ul.inc li{display:list-item;border:0;padding:2px 0}
body.l-carta .paq{background:none;border:0;border-top:2px solid var(--fg);border-radius:0;padding:18px 0}body.l-dostonos .paq{border-top:6px solid var(--acc)}
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:18px}.catimg img{width:100%;height:auto;border-radius:14px;border:1px solid var(--bor)}
.doc{display:inline-block;margin-top:18px;font-weight:700;text-underline-offset:5px}
/* sobre */
.sobre{background:var(--mut);padding-bottom:64px;margin-top:64px}.s-in{display:grid;gap:28px;align-items:center}.retrato{border-radius:24px;overflow:hidden;max-width:440px}.retrato img{width:100%;height:auto}
.firma{font-weight:700;margin-bottom:10px}.historia{font-size:18px;max-width:58ch}.cred{margin-top:12px;color:var(--soft);font-size:15px}
.cifras{list-style:none;display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.cifras li{font-family:var(--ft);font-size:22px;padding:10px 16px;border:1px solid var(--bor);border-radius:999px;background:var(--bg)}
/* reseñas */
.quotes{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}blockquote{background:var(--card);border:1px solid var(--bor);border-radius:20px;padding:22px}blockquote p{font-family:var(--ft);font-size:20px;line-height:1.3}blockquote cite{display:block;margin-top:12px;font-style:normal;font-weight:700;font-size:14px;color:var(--soft)}
.quotes .cap{margin:0}.quotes .cap img{width:100%;height:auto;border-radius:20px;border:1px solid var(--bor);display:block}
@media (min-width:900px){.quotes.q2{grid-template-columns:repeat(2,minmax(0,1fr))}.quotes.q3{grid-template-columns:repeat(3,minmax(0,1fr))}.quotes.q4{grid-template-columns:repeat(4,minmax(0,1fr))}}
.capturas{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:18px;align-items:start}.capturas img{width:100%;height:auto;border-radius:14px;border:1px solid var(--bor)}
.pasos{counter-reset:p;list-style:none;display:grid;gap:12px}.pasos li{counter-increment:p;padding-left:52px;position:relative;min-height:40px}.pasos li::before{content:counter(p);position:absolute;left:0;top:-4px;width:38px;height:38px;border-radius:50%;background:var(--acc);color:var(--on-acc);display:grid;place-items:center;font-weight:800}
details{border-bottom:1px solid var(--bor);padding:16px 0}summary{font-family:var(--ft);font-size:21px;cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}details p{margin-top:10px;color:var(--soft)}
.video{width:100%;border-radius:18px}
.promo{background:var(--p);color:var(--on);padding:16px 0;text-align:center;font-size:17px}.promo b{margin-right:8px;text-transform:uppercase;letter-spacing:.08em;font-size:13px}
.contacto .datos{display:grid;gap:14px}.datos p{display:flex;flex-direction:column}.datos b{font-family:var(--ft);font-weight:400;font-size:20px}${CSS_REDES}
footer{margin-top:64px;padding:26px 20px 92px;border-top:1px solid var(--bor);font-size:14px;color:var(--soft);text-align:center}
.wa{position:fixed;right:16px;bottom:16px;width:58px;height:58px;border-radius:50%;background:#1F7A4C;display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.25);z-index:30}.wa svg{width:30px;height:30px;fill:#fff}
.etq{position:fixed;left:16px;bottom:16px;z-index:30;background:#111;color:#fff;font:700 14px/1 var(--fc);padding:9px 12px;border-radius:999px}
a:focus-visible,summary:focus-visible{outline:3px solid var(--p);outline-offset:3px}
@media (max-width:760px){.barra nav{display:none}}
@media (min-width:900px){.h-portada .velo{background:linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,.15) 70%)}.h-edit{grid-template-columns:1.1fr .9fr;align-items:center;padding-top:64px}.h-dos .in{grid-template-columns:1.1fr .9fr;align-items:end}.mos{grid-template-columns:repeat(4,1fr)}.mos>:first-child{grid-column:span 2;grid-row:span 2;aspect-ratio:auto}.mos-sl{min-height:380px}.mos.solo>.mos-sl{aspect-ratio:16/8!important;min-height:0}.h-portada .sl-d.con-txt::after{background:linear-gradient(90deg,rgba(0,0,0,.66),rgba(0,0,0,.18) 72%)}
.s-in{grid-template-columns:.8fr 1.2fr}.galeria{columns:3 220px}.g-editorial{columns:4 220px}.contacto .datos{grid-template-columns:repeat(3,1fr)}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
${CSS_MOVIMIENTO}
</style></head>
<body class="l-${d.layout}">
<header class="barra"><div class="wrap in">${logoBarra}<nav>${navs.map(([id, n]) => `<a href="#${id}">${esc(n)}</a>`).join('')}</nav></div></header>
<main>${heroFinal}${cuerpoFinal}${galeria}</main>
<footer>${marcaPie ? `<div class="pie-marcas">${marcaPie}</div>` : ''}© ${new Date().getFullYear()} ${esc(d.nombre)} · Propuesta ${d.letra}: ${esc(NOMBRES_GENERAL[d.layout])}</footer>
<span class="etq">Propuesta ${d.letra}</span>${JS_MOVIMIENTO}${JS_CAR_TRABAJO}${d.layout === 'logo' ? JS_LOGO_UNICO : ''}
<a class="wa"${wa} aria-label="Escríbeme por WhatsApp"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.3c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.3Z"/></svg></a>
</body></html>`;
  return html;
}

/** Datos de las 6 páginas generales. */
export function paginasGenerales({ brief, mat, textos, pares, urlFuentes, ronda = 0, cps: cpsDados = null, fijo = null }) {
  const arq = TITULOS[brief.negocio?.arquetipo] ? brief.negocio.arquetipo : 'generico';
  const titulos = { ...TITULOS[arq], ...(textos.secciones || {}) };
  const colores = [...new Set([...(mat.colores || [])])];
  const pastel = esPastel(brief);
  const evitarHex = coloresDePalabras(String(brief.marca?.evitar || '').split(/[,;y]+/));
  const cps = cpsDados || LAYOUTS_GENERAL.map((_, i) => coloresParaPropuesta({ brief, coloresCliente: colores, i, ronda, evitarHex }));
  const c = brief.contacto || {};
  // Estilo de referencia del cliente: 6 variaciones de ese estilo (acomodos, letras y paletas propias).
  const dref = esDireccionRef(brief.marca?.direccion_ref) ? brief.marca.direccion_ref : null;
  const todas = (dref ? dref.layouts : LAYOUTS_GENERAL).map((layout, i) => ({ layout, i })).filter(({ i }) => !fijo || 'ABCDEF'[i] === fijo.letra);
  return todas.map(({ layout, i }) => {
    const letra = 'ABCDEF'[i];
    const v = textos.variantes?.[i] || textos.variantes?.[0] || {};
    const par = fijo?.fuentes || (dref ? parPorNombres(dref.pares[i]) : pares[i % pares.length]);
    const d = {
      i: i + ronda * 3, letra, layout, dref, nombre: brief.negocio?.nombre || '', brief, mat, titulos,
      pal: fijo?.paleta || (dref ? paletaRef(dref, i) : { ...corregirPaleta(paletaGeneral(layout, cps[i].colores, pastel, i + ronda * 2, { acento: cps[i].acento, acentoCta: cps[i].acentoCta })).paleta, familia: cps[i].familia, origen: cps[i].origen }), f: par, fuentesUrl: urlFuentes([par]),
      t: { titular: v.titular, subtitulo: v.subtitulo, foto_url: v.foto_url || null, cta: v.cta || 'Escríbeme por WhatsApp', info: (textos.info || []).slice(0, 3), sobre: textos.sobre, proceso: textos.proceso, diapositivas: textos.diapositivas },
      wa: waUrl(c.whatsapp, c.mensaje_whatsapp_inicial), tel: c.whatsapp ? formatoTel(c.whatsapp) : null,
    };
    const nombre = dref?.nombres?.[i] || NOMBRES_GENERAL[layout];
    let html = pagina(d);
    if (dref) html = aplicarRef(html, par, dref).replace(` · Propuesta ${letra}: ${esc(NOMBRES_GENERAL[layout])}</footer>`, ` · Propuesta ${letra}: ${esc(nombre)}</footer>`);
    return { letra, layout, nombre, html, fuentes: par, paleta: d.pal };
  });
}
