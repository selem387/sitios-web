// 6 propuestas por arquetipo (servicios, clínica, inmobiliaria, oficios, educación, turismo, tienda, genérico).
// Restaurante/cafetería sigue con su plantilla de menú (propuestas_html.js).
// REGLA DURA: todo el material del cliente (logo, fotos, su foto, reseñas, catálogos, documentos, video) aparece en
// cada una de las 6. Lo que no cabe en una sección temática va a la galería final; el validador lo confirma.
import { mezclar, contraste } from '../entrevista/tema.js';
import { esPastel } from './materiales.js';
import { waUrl, formatoTel } from './bloques.js';

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
const TITULOS = {
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
function paletaGeneral(layout, colores, pastel, i) {
  const cs = colores.filter((c) => /^#[0-9A-F]{6}$/i.test(c));
  let base, tinte;
  if (pastel) {
    const pas = cs.filter((c) => lum(c) > 0.45 && hsl(c)[1] > 0.12); // sin grises
    tinte = pas[i % Math.max(pas.length, 1)] || '#F2C4CE';
    base = conContraste(tono(tinte, 0.42, 0.22, 0.34), '#FFFFFF', 4.6, tono(tinte, 0.18, 0.25, 0.34));
  } else {
    const oscuros = cs.filter((c) => lum(c) < 0.25);
    base = oscuros[i % Math.max(oscuros.length, 1)] || cs.find((c) => lum(c) < 0.5) || '#3A3330';
    base = conContraste(base, '#FFFFFF', 4.6);
    tinte = cs.find((c) => lum(c) > 0.5) || mezclar(base, '#FFFFFF', 0.82);
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

function redes(c = {}) {
  const r = c.redes || {};
  const url = (v, base) => (!v ? null : /^https?:/i.test(v) ? v : `${base}${String(v).replace(/^@/, '')}`);
  return [['Instagram', url(r.instagram, 'https://instagram.com/')], ['Facebook', url(r.facebook, 'https://facebook.com/')], ['TikTok', url(r.tiktok, 'https://tiktok.com/@')], ['YouTube', url(r.youtube, 'https://youtube.com/@')]].filter((x) => x[1]);
}

/* ---------------- Página ---------------- */
function pagina(d) {
  const { pal: p, f, t, mat, brief } = d;
  const usadas = new Set();
  const img = (x, { cls = '', eager = false, sizes = '' } = {}) => { usadas.add(x.url); return `<img${cls ? ` class="${cls}"` : ''} src="${esc(x.url)}" alt="${esc(x.alt || '')}" loading="${eager ? 'eager' : 'lazy'}"${x.ancho ? ` width="${x.ancho}" height="${x.alto}"` : ''}${sizes}>`; };
  const wa = d.wa ? ` href="${esc(d.wa)}" target="_blank" rel="noopener"` : ' href="#contacto"';
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
  const heroFoto = (d.layout === 'portada' || d.layout === 'logo') ? (mat.hero || fotosT[0]) : (fotosT[0] || mat.hero || mat.fundador);

  const cta = (cls = '') => `<a class="btn ${cls}"${wa}>${esc(t.cta)}</a>`;
  const info = (t.info || []).map((x) => `<li>${esc(x)}</li>`).join('');

  /* --- Héroes --- */
  const heros = {
    portada: () => `<section class="hero h-portada">${heroFoto ? img(heroFoto, { cls: 'fondo', eager: true }) : ''}<div class="velo"></div><div class="wrap in"><p class="kicker">${esc(neg.ciudad ? `${neg.giro_texto || ''} · ${neg.ciudad}` : neg.giro_texto || '')}</p><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}</div></section>`,
    editorial: () => `<section class="hero h-edit wrap"><div class="txt"><p class="kicker">${esc(neg.giro_texto || '')}</p><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}<ul class="info">${info}</ul></div>${heroFoto ? `<figure class="arco">${img(heroFoto, { eager: true })}</figure>` : ''}</section>`,
    mosaico: () => { const m = fotosT.slice(0, 5); return `<section class="hero h-mos wrap"><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}<div class="mos m${m.length}">${m.map((x, k) => img(x, { eager: k < 2 })).join('')}</div></section>`; },
    logo: () => `<section class="hero h-logo wrap">${mat.logo ? logoHTML(mat.logo, p.bg, p.fg, { clase: 'logo-grande', alt: d.nombre }) : `<p class="nombre-grande">${esc(d.nombre)}</p>`}<h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}${heroFoto ? `<figure class="ovalo">${img(heroFoto, { eager: true })}</figure>` : ''}</section>`,
    dostonos: () => `<section class="hero h-dos"><div class="wrap in"><div class="txt"><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta('inv')}</div>${heroFoto ? `<figure class="marco">${img(heroFoto, { eager: true })}</figure>` : ''}</div></section>`,
    carta: () => `<section class="hero h-carta wrap"><p class="kicker">${esc(d.nombre)}</p><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}</section>${fotosT.length ? `<div class="tira" aria-label="Fotos">${fotosT.slice(0, 8).map((x, k) => img(x, { eager: k < 2 })).join('')}</div>` : ''}`,
  };
  const hero = heros[d.layout]();

  /* --- Secciones --- */
  const T = d.titulos;
  const secTrabajo = () => {
    const resto = fotosT.filter((x) => !usadas.has(x.url));
    if (!resto.length) return '';
    return `<section class="sec" id="trabajo"><div class="wrap"><h2>${esc(T.trabajo)}</h2><div class="galeria g-${d.layout}">${resto.map((x) => `<figure>${img(x)}</figure>`).join('')}</div></div></section>`;
  };
  const grupos = agruparOferta(brief.oferta?.items || []);
  const mostrarPrecios = brief.oferta?.mostrar_precios !== false || brief.oferta?.mostrar_paquetes;
  const secServicios = () => {
    if (!grupos.length && !mat.catalogos.length && !mat.documentos.length) return '';
    const cards = grupos.map((g) => `<article class="paq"><h3>${esc(g.nombre)}</h3><ul>${g.opciones.map((o) => `<li><div>${o.nombre ? `<b>${esc(o.nombre)}</b>` : ''}${o.detalle ? `<span>${esc(o.detalle)}</span>` : ''}</div>${mostrarPrecios && o.precio ? `<em>${esc(o.precio)}</em>` : ''}</li>`).join('')}</ul></article>`).join('');
    const cat = mat.catalogos.map((x) => `<a class="catimg" href="${esc(x.url)}" target="_blank" rel="noopener">${img(x)}</a>`).join('');
    const docs = mat.documentos.map((x) => `<a class="doc" href="${esc(x.url)}" target="_blank" rel="noopener">Ver ${esc(/pdf/i.test(x.url) ? 'catálogo (PDF)' : x.alt || 'documento')}</a>`).join('');
    for (const x of mat.documentos) usadas.add(x.url);
    return `<section class="sec" id="servicios"><div class="wrap"><h2>${esc(T.servicios)}</h2>${cards ? `<div class="paqs">${cards}</div>` : ''}${cat ? `<div class="cats">${cat}</div>` : ''}${docs}<div class="centro">${cta()}</div></div></section>`;
  };
  const secSobre = () => {
    const otra = mat.equipo.find((x) => x.tipo === 'foto_fundador' && !usadas.has(x.url));
    // Si su foto ya está en la portada, aquí va otra suya o ninguna (nunca la misma dos veces).
    const foto = mat.fundador && usadas.has(mat.fundador.url) ? (otra || null) : (mat.fundador || otra || null);
    if (!foto && !conf.historia_corta) return '';
    const cifras = (conf.cifras || []).slice(0, 3).map((c) => `<li>${esc(c)}</li>`).join('');
    const cred = (fund.credenciales || []).map((c) => esc(c)).join(' · ');
    return `<section class="sec sobre" id="sobre"><div class="wrap s-in">${foto ? `<figure class="retrato">${img(foto)}</figure>` : ''}<div><h2>${esc(T.sobre)}</h2>${fund.nombre ? `<p class="firma">${esc(fund.nombre)}${fund.rol ? ` · ${esc(fund.rol)}` : ''}</p>` : ''}<p class="historia">${esc(t.sobre || conf.historia_corta || '')}</p>${cred ? `<p class="cred">${cred}</p>` : ''}${cifras ? `<ul class="cifras">${cifras}</ul>` : ''}</div></div></section>`;
  };
  const secEquipo = () => { const eq = mat.equipo.filter((x) => !usadas.has(x.url)); return eq.length ? `<div class="wrap"><div class="galeria g-eq">${eq.map((x) => `<figure>${img(x)}</figure>`).join('')}</div></div>` : ''; };
  const secResenas = () => {
    const tes = (conf.testimonios || []).filter((x) => x.texto);
    if (!tes.length && !mat.resenas.length) return '';
    const limpio = (s) => String(s).replace(/\p{Extended_Pictographic}/gu, '').trim();
    const cards = tes.map((x) => `<blockquote><p>${esc(limpio(x.texto))}</p>${x.nombre ? `<cite>${esc(x.nombre)}</cite>` : ''}</blockquote>`).join('');
    const caps = mat.resenas.map((x) => `<figure>${img(x)}</figure>`).join('');
    return `<section class="sec resenas" id="resenas"><div class="wrap"><h2>${esc(T.resenas)}</h2>${cards ? `<div class="quotes">${cards}</div>` : ''}${caps ? `<div class="capturas">${caps}</div>` : ''}</div></section>`;
  };
  const secProceso = () => { const ps = brief.oferta?.proceso_pasos || []; return ps.length >= 3 ? `<section class="sec"><div class="wrap"><h2>${esc(t.proceso || 'Cómo funciona')}</h2><ol class="pasos">${ps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div></section>` : ''; };
  const secFaq = () => { const fq = (brief.faq || []).filter((x) => x.pregunta && x.respuesta); return fq.length ? `<section class="sec" id="faq"><div class="wrap estrecho"><h2>${esc(T.faq)}</h2>${fq.map((x, k) => `<details${k === 0 ? ' open' : ''}><summary>${esc(x.pregunta)}</summary><p>${esc(x.respuesta)}</p></details>`).join('')}</div></section>` : ''; };
  const secVideo = () => mat.videos.length ? `<section class="sec"><div class="wrap">${mat.videos.map((v) => { usadas.add(v.url); return `<video class="video" src="${esc(v.url)}" controls playsinline preload="metadata"></video>`; }).join('')}</div></section>` : '';
  const secContacto = () => {
    const c = brief.contacto || {};
    const dir = c.direccion && typeof c.direccion === 'object' ? [c.direccion.calle, c.direccion.colonia, c.direccion.ciudad].filter(Boolean).join(', ') : c.direccion;
    const zona = (brief.zona?.cobertura || []).join(' · ');
    const rs = redes(c).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join('');
    return `<section class="sec contacto" id="contacto"><div class="wrap"><h2>${esc(T.contacto)}</h2><div class="datos">${d.tel ? `<p><b>WhatsApp</b><a${wa}>${esc(d.tel)}</a></p>` : ''}${dir ? `<p><b>Dónde</b>${esc(dir)}</p>` : zona ? `<p><b>Dónde</b>${esc(zona)}</p>` : ''}${typeof c.horarios === 'string' ? `<p><b>Horario</b>${esc(c.horarios)}</p>` : ''}${rs ? `<p><b>Redes</b><span class="rs">${rs}</span></p>` : ''}</div>${cta()}</div></section>`;
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
  const galeria = pendientes.length ? `<section class="sec" id="galeria"><div class="wrap"><h2>${esc(T.galeria)}</h2><div class="galeria g-mas">${pendientes.map((x) => `<figure>${img(x)}</figure>`).join('')}</div></div></section>` : '';

  const navs = [['trabajo', T.trabajo], ['servicios', T.servicios], ['sobre', T.sobre], ['contacto', T.contacto]].filter(([id]) => cuerpo.includes(`id="${id}"`));
  const ft = f.titulos, fc = f.cuerpo;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(d.nombre)} · Propuesta ${d.letra}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${esc(d.fuentesUrl)}" rel="stylesheet">
<style>
:root{--bg:${p.bg};--fg:${p.fg};--p:${p.primary};--on:${p.onPrimary};--mut:${p.muted};--card:${p.card};--soft:${p.soft};--bor:${p.border};--tin:${p.tinte};--banda:${p.banda || p.primary};--ft:'${ft}',serif;--fc:'${fc}',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:var(--bg);color:var(--fg);font-family:var(--fc);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}a{color:inherit}
h1,h2,h3{font-family:var(--ft);font-weight:400;line-height:1.06;letter-spacing:-.015em;text-wrap:balance}h1{font-size:clamp(36px,9vw,72px)}h2{font-size:clamp(28px,6.5vw,44px);margin-bottom:22px}h3{font-size:22px}
.wrap{max-width:1140px;margin:0 auto;padding:0 20px}.estrecho{max-width:760px}.centro{text-align:center}
.barra{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--bor)}
.barra .in{display:flex;align-items:center;justify-content:space-between;height:68px}
.logo{height:46px;width:auto;max-width:220px}.logo-placa{display:inline-flex;padding:6px 12px;border-radius:12px}.logo-grande-placa{display:inline-flex;padding:18px 28px;border-radius:22px;margin:0 auto}
.nombre{font-family:var(--ft);font-size:22px}
.barra nav{display:flex;gap:22px;font-size:15px;font-weight:600}.barra nav a{text-decoration:none}
.kicker{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:var(--soft);margin-bottom:14px}
.sub{color:var(--soft);font-size:clamp(17px,4.4vw,20px);margin-top:16px;max-width:38ch}
.btn{display:inline-flex;align-items:center;justify-content:center;background:var(--p);color:var(--on);font-weight:700;text-decoration:none;padding:15px 26px;border-radius:999px;margin-top:24px;min-height:50px}.btn.inv{background:#fff;color:var(--banda)}
.info{list-style:none;display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:22px;font-size:14px;color:var(--soft)}.info li::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--p);margin-right:8px;vertical-align:2px}
.sec{padding:64px 0 8px}section[id]{scroll-margin-top:80px}
/* héroes */
.h-portada{position:relative;min-height:88vh;display:flex;align-items:flex-end;color:#fff;overflow:hidden}.h-portada .fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.h-portada .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.62))}.h-portada .in{position:relative;padding-bottom:56px;width:100%}.h-portada .sub,.h-portada .kicker{color:rgba(255,255,255,.88)}
.h-edit{display:grid;gap:28px;padding-top:36px}.arco{border-radius:999px 999px 24px 24px;overflow:hidden;aspect-ratio:4/5;max-height:620px}.arco img{width:100%;height:100%;object-fit:cover}
.h-mos{padding-top:40px;text-align:left}.mos{display:grid;gap:8px;margin-top:34px;grid-template-columns:repeat(2,1fr)}.mos img{width:100%;height:100%;object-fit:cover;border-radius:14px;aspect-ratio:1}.mos img:first-child{grid-column:span 2;aspect-ratio:16/10}
.h-logo{text-align:center;padding-top:40px;padding-bottom:10px}.h-logo .sub{margin:16px auto 0}.logo-grande{height:auto;width:min(84%,460px);margin:0 auto 26px;display:block}
.nombre-grande{font-family:var(--ft);font-size:44px;margin-bottom:20px}.ovalo{width:min(78%,380px);margin:38px auto 0;border-radius:50%;overflow:hidden;aspect-ratio:3/4;border:8px solid var(--mut)}.ovalo img{width:100%;height:100%;object-fit:cover}
.h-dos{background:var(--banda);color:#fff;padding:42px 0 0;border-radius:0 0 36px 36px}.h-dos .in{display:grid;gap:26px}.h-dos .sub{color:rgba(255,255,255,.86)}.marco{border-radius:24px 24px 0 0;overflow:hidden;aspect-ratio:4/5;max-height:560px;border:10px solid rgba(255,255,255,.14);border-bottom:0}.marco img{width:100%;height:100%;object-fit:cover}
.h-carta{padding-top:60px;padding-bottom:30px;max-width:820px}.tira{display:flex;gap:10px;overflow-x:auto;padding:0 20px 8px;scroll-snap-type:x mandatory;scrollbar-width:none}.tira::-webkit-scrollbar{display:none}.tira img{height:340px;width:auto;max-width:none;border-radius:8px;scroll-snap-align:start;flex:0 0 auto}
/* galerías */
.galeria{columns:2 160px;column-gap:10px}.galeria figure{break-inside:avoid;margin-bottom:10px}.galeria img{width:100%;height:auto;border-radius:12px}
.g-editorial{columns:2 150px}.g-carta img,.g-dostonos img{border-radius:4px}.g-logo img{border-radius:999px 999px 14px 14px}
.g-eq{margin-top:20px}
/* paquetes */
.paqs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.paq{background:var(--card);border:1px solid var(--bor);border-radius:20px;padding:22px}.paq h3{margin-bottom:10px}.paq ul{list-style:none}.paq li{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-top:1px dashed var(--bor)}.paq li:first-child{border-top:0}
.paq li b{display:block;font-size:15px}.paq li span{display:block;color:var(--soft);font-size:14px}.paq li em{font-style:normal;font-weight:800;color:var(--p);white-space:nowrap}
body.l-carta .paq{background:none;border:0;border-top:2px solid var(--fg);border-radius:0;padding:18px 0}body.l-dostonos .paq{border-top:6px solid var(--p)}
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:18px}.catimg img{width:100%;height:auto;border-radius:14px;border:1px solid var(--bor)}
.doc{display:inline-block;margin-top:18px;font-weight:700;text-underline-offset:5px}
/* sobre */
.sobre{background:var(--mut);padding-bottom:64px;margin-top:64px}.s-in{display:grid;gap:28px;align-items:center}.retrato{border-radius:24px;overflow:hidden;max-width:440px}.retrato img{width:100%;height:auto}
.firma{font-weight:700;margin-bottom:10px}.historia{font-size:18px;max-width:58ch}.cred{margin-top:12px;color:var(--soft);font-size:15px}
.cifras{list-style:none;display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}.cifras li{font-family:var(--ft);font-size:22px;padding:10px 16px;border:1px solid var(--bor);border-radius:999px;background:var(--bg)}
/* reseñas */
.quotes{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}blockquote{background:var(--card);border:1px solid var(--bor);border-radius:20px;padding:22px}blockquote p{font-family:var(--ft);font-size:20px;line-height:1.3}blockquote cite{display:block;margin-top:12px;font-style:normal;font-weight:700;font-size:14px;color:var(--soft)}
.capturas{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:18px;align-items:start}.capturas img{width:100%;height:auto;border-radius:14px;border:1px solid var(--bor)}
.pasos{counter-reset:p;list-style:none;display:grid;gap:12px}.pasos li{counter-increment:p;padding-left:52px;position:relative;min-height:40px}.pasos li::before{content:counter(p);position:absolute;left:0;top:-4px;width:38px;height:38px;border-radius:50%;background:var(--p);color:var(--on);display:grid;place-items:center;font-weight:800}
details{border-bottom:1px solid var(--bor);padding:16px 0}summary{font-family:var(--ft);font-size:21px;cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}details p{margin-top:10px;color:var(--soft)}
.video{width:100%;border-radius:18px}
.contacto .datos{display:grid;gap:14px}.datos p{display:flex;flex-direction:column}.datos b{font-family:var(--ft);font-weight:400;font-size:20px}.rs{display:flex;gap:16px;flex-wrap:wrap}.rs a{font-weight:700}
footer{margin-top:64px;padding:26px 20px 92px;border-top:1px solid var(--bor);font-size:14px;color:var(--soft);text-align:center}
.wa{position:fixed;right:16px;bottom:16px;width:58px;height:58px;border-radius:50%;background:#1F7A4C;display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.25);z-index:30}.wa svg{width:30px;height:30px;fill:#fff}
.etq{position:fixed;left:16px;bottom:16px;z-index:30;background:#111;color:#fff;font:700 14px/1 var(--fc);padding:9px 12px;border-radius:999px}
a:focus-visible,summary:focus-visible{outline:3px solid var(--p);outline-offset:3px}
@media (max-width:760px){.barra nav{display:none}}
@media (min-width:900px){.h-portada .velo{background:linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,.15) 70%)}.h-edit{grid-template-columns:1.1fr .9fr;align-items:center;padding-top:64px}.h-dos .in{grid-template-columns:1.1fr .9fr;align-items:end}.mos{grid-template-columns:repeat(4,1fr)}.mos img:first-child{grid-column:span 2;grid-row:span 2;aspect-ratio:auto}
.s-in{grid-template-columns:.8fr 1.2fr}.galeria{columns:3 220px}.g-editorial{columns:4 220px}.contacto .datos{grid-template-columns:repeat(3,1fr)}.tira img{height:460px}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head>
<body class="l-${d.layout}">
<header class="barra"><div class="wrap in">${logoBarra}<nav>${navs.map(([id, n]) => `<a href="#${id}">${esc(n)}</a>`).join('')}</nav></div></header>
<main>${hero}${cuerpo}${galeria}</main>
<footer>© ${new Date().getFullYear()} ${esc(d.nombre)} · Propuesta ${d.letra}: ${esc(NOMBRES_GENERAL[d.layout])}</footer>
<span class="etq">Propuesta ${d.letra}</span>
<a class="wa"${wa} aria-label="Escríbeme por WhatsApp"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7Zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.3c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.7 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.3Z"/></svg></a>
</body></html>`;
  return html;
}

/** Datos de las 6 páginas generales. */
export function paginasGenerales({ brief, mat, textos, pares, urlFuentes, ronda = 0 }) {
  const arq = TITULOS[brief.negocio?.arquetipo] ? brief.negocio.arquetipo : 'generico';
  const titulos = { ...TITULOS[arq], ...(textos.secciones || {}) };
  const colores = [...new Set([...(mat.colores || [])])];
  const pastel = esPastel(brief);
  const c = brief.contacto || {};
  return LAYOUTS_GENERAL.map((layout, i) => {
    const letra = 'ABCDEF'[i];
    const v = textos.variantes?.[i] || textos.variantes?.[0] || {};
    const par = pares[i % pares.length];
    const d = {
      i: i + ronda * 3, letra, layout, nombre: brief.negocio?.nombre || '', brief, mat, titulos,
      pal: paletaGeneral(layout, colores, pastel, i + ronda * 2), f: par, fuentesUrl: urlFuentes([par]),
      t: { titular: v.titular, subtitulo: v.subtitulo, cta: v.cta || 'Escríbeme por WhatsApp', info: (textos.info || []).slice(0, 3), sobre: textos.sobre, proceso: textos.proceso },
      wa: waUrl(c.whatsapp, c.mensaje_whatsapp_inicial), tel: c.whatsapp ? formatoTel(c.whatsapp) : null,
    };
    return { letra, layout, nombre: NOMBRES_GENERAL[layout], html: pagina(d), fuentes: par, paleta: d.pal };
  });
}
