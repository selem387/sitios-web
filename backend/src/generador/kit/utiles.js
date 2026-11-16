// Piezas comunes para armar páginas (16-nov-2026): las usan la plantilla general, las secciones del kit y las opciones.
// No conocen ninguna opción en particular.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const lum = (h) => { const n = parseInt(h.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

/* ---------------- Logo con contraste garantizado ---------------- */
// Logo de un solo color que no contrasta con el fondo → se pinta con el color de la tinta (máscara CSS), así se ve siempre.
// Logo a color que no contrasta → placa de color contrario. Devuelve HTML que siempre incluye la URL del logo.
/** true si el logo es un sello relleno (más de 60% de su caja es opaco): trae su propio fondo y no se entinta. */
export function logoLleno(logo) {
  if (!logo?.opaco || !logo.ancho || !logo.alto) return false;
  const r = logo.ancho / logo.alto; // tonoLogo mide sobre una versión que cabe en 96x96
  const area = r >= 1 ? 96 * (96 / r) : (96 * r) * 96;
  return logo.opaco / area > 0.6;
}
export function logoHTML(logo, bg, fg, { clase = 'logo', alt = '' } = {}) {
  if (!logo?.url) return `<span class="nombre">${esc(alt)}</span>`;
  const claroLogo = logo.tono === 'claro', fondoClaro = lum(bg) > 0.4;
  const choca = claroLogo === fondoClaro;
  const ratio = logo.ancho && logo.alto ? (logo.ancho / logo.alto).toFixed(3) : '3';
  // Logo tipo sello (círculo o cuadro relleno, con su propio fondo): se muestra tal cual. Pintarlo de un color o
  // oscurecerlo lo deja como una mancha (12-nov-2026, La Fondita de Celestún: el logo salía como un círculo negro).
  if (logoLleno(logo)) return `<img class="${clase}" src="${esc(logo.url)}" alt="${esc(alt)}">`;
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
/** Paso del proceso: "Título\nExplicación" (o {titulo, texto}) → título en negritas y explicación debajo. */
export function pasoHTML(x) {
  const o = typeof x === 'object' && x ? { a: x.titulo || '', b: x.texto || '' } : (() => { const [a, ...r] = String(x || '').split('\n'); return { a, b: r.join(' ').trim() }; })();
  return o.b ? `<b class="paso-t">${esc(o.a.trim())}</b><span class="paso-d">${esc(o.b)}</span>` : esc(o.a.trim());
}

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

// Diseño "Tu logo al centro" (10-nov-2026): el logo grande de la portada y el de la barra no se ven a la vez;
// el de la barra aparece cuando el grande sale de la pantalla.
export const JS_LOGO_UNICO = `<script>(()=>{const g=document.querySelector('.h-logo .logo-grande,.h-logo .logo-grande-placa'),b=document.querySelector('.barra');if(!b)return;if(!g||!('IntersectionObserver'in window)){b.classList.add('ver-logo');return;}new IntersectionObserver(([e])=>b.classList.toggle('ver-logo',!e.isIntersecting),{rootMargin:'-70px 0px 0px 0px'}).observe(g);})();</script>`;
