// Estudio de un sitio de referencia que el cliente manda en B7.5 ("esta página me gusta").
// Sigue el contrato de ui-skills/create-design-md y Hallmark: extrae DIRECCIÓN (tipografía, color ancla,
// radios, densidad, estructura de secciones), nunca marcado ni copy. El generador usa esto como inspiración
// declarada, junto con cliches_ia, y respeta marca.evitar.

const COLOR_RE = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/;
const hex = (c) => '#' + [c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();

export async function estudiarSitio(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
  const desktop = await extraer(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const movil = await extraer(page, true);
  const titulo = await page.title();
  return {
    url, titulo,
    tipografia: desktop.tipografia,
    colores: desktop.colores,
    forma: desktop.forma,
    densidad: desktop.densidad,
    estructura: desktop.estructura,
    movil: { columnas_hero: movil.estructura.hero?.columnas ?? null, menu_hamburguesa: movil.hamburguesa, cta_visible_arriba: movil.ctaArriba },
    modo: desktop.colores.fondo_luminancia < 0.3 ? 'oscuro' : 'claro',
    resumen: resumir(desktop, movil),
    aviso: 'Dirección extraída de un sitio ajeno: inspiración, no copia. No reutilizar textos, logos, imágenes ni marcado.',
  };
}

async function extraer(page, esMovil = false) {
  return page.evaluate((esMovil) => {
    const COLOR_RE = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/;
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const todos = Array.from(document.querySelectorAll('body *')).filter(vis).slice(0, 4000);
    const parse = (c) => { const m = COLOR_RE.exec(c); if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return null; return { r: +m[1], g: +m[2], b: +m[3] }; };
    const lum = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const hexOf = (c) => '#' + [c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Tipografía: familias por rol, ponderadas por área de texto.
    const fam = (el) => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim();
    const peso = {}; const titulos = {}; const cuerpo = {};
    for (const el of todos) {
      const t = (el.childNodes.length && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) ? el : null;
      if (!t) continue;
      const r = el.getBoundingClientRect(); const area = r.width * r.height; const f = fam(el);
      const tag = el.tagName;
      if (/^H[1-3]$/.test(tag)) titulos[f] = (titulos[f] || 0) + area; else cuerpo[f] = (cuerpo[f] || 0) + area;
      peso[f] = (peso[f] || 0) + area;
    }
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const h1 = document.querySelector('h1');
    const h1cs = h1 ? getComputedStyle(h1) : null;
    const bodycs = getComputedStyle(document.body);

    // Colores: fondo del body, fondos de secciones, color de botones/enlaces (acento).
    const fondo = parse(bodycs.backgroundColor) || { r: 255, g: 255, b: 255 };
    const fondos = {}; const acentos = {}; const textos = {};
    for (const el of todos) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const bg = parse(cs.backgroundColor);
      if (bg && r.width * r.height > 20000) { const h = hexOf(bg); fondos[h] = (fondos[h] || 0) + r.width * r.height; }
      if (/^(A|BUTTON)$/.test(el.tagName) || cs.cursor === 'pointer') {
        const b = parse(cs.backgroundColor); const c = parse(cs.color);
        if (b && lum(b) < 0.95 && lum(b) > 0.05) { const h = hexOf(b); acentos[h] = (acentos[h] || 0) + 1; }
        else if (c) { const h = hexOf(c); acentos[h] = (acentos[h] || 0) + 0.3; }
      }
      const c = parse(cs.color); if (c && el.textContent.trim()) { const h = hexOf(c); textos[h] = (textos[h] || 0) + 1; }
    }
    const ordena = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

    // Forma: radios y sombras de botones y cards.
    const radios = {}; let conSombra = 0, cardsN = 0;
    for (const el of todos) {
      const cs = getComputedStyle(el);
      if (/^(A|BUTTON)$/.test(el.tagName) && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') { const r = parseInt(cs.borderTopLeftRadius) || 0; radios[r] = (radios[r] || 0) + 1; }
      const rect = el.getBoundingClientRect();
      if (rect.width > 200 && rect.height > 120 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== bodycs.backgroundColor) { cardsN++; if (cs.boxShadow && cs.boxShadow !== 'none') conSombra++; }
    }
    const radioBoton = Object.entries(radios).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Densidad: padding vertical medio de secciones directas de main/body y tamaño base.
    // Secciones = bloques de nivel superior con altura razonable (ni wrappers de página entera ni elementos diminutos).
    const vhAll = innerHeight;
    const candidatos = Array.from(document.querySelectorAll('section, header, footer, main > *, body > *, body > div > *, #__next > *, #root > *, .wp-site-blocks > *'));
    const secciones = candidatos.filter((s) => { if (!vis(s)) return false; const h = s.getBoundingClientRect().height; return h >= 120 && h <= vhAll * 2.2 && !s.querySelector('section:not(:scope)') || (vis(s) && /^(HEADER|FOOTER)$/.test(s.tagName)); })
      .filter((s, i, arr) => !arr.some((o) => o !== s && o.contains(s) && o.getBoundingClientRect().height <= vhAll * 2.2)).slice(0, 30);
    const pads = secciones.map((s) => { const cs = getComputedStyle(s); return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0); }).filter((p) => p > 0);
    const padMedio = pads.length ? Math.round(pads.reduce((a, b) => a + b, 0) / pads.length) : null;
    const baseFs = parseFloat(bodycs.fontSize) || 16;

    // Estructura: hero y tipos de sección por heurística de contenido.
    const vh = innerHeight;
    const hero = secciones.filter((s) => !/^(HEADER|FOOTER)$/.test(s.tagName)).find((s) => s.getBoundingClientRect().top < vh * 0.6 && s.getBoundingClientRect().height > vh * 0.4) || null;
    const tipo = (s) => {
      const t = (s.innerText || '').toLowerCase(); const imgs = s.querySelectorAll('img, video, picture').length; const btns = s.querySelectorAll('a,button').length;
      if (s === hero) return 'hero';
      if (/faq|preguntas|pregunta/.test(t) || s.querySelectorAll('details').length) return 'faq';
      if (/opini|reseñ|testimon|clientes dicen|review/.test(t)) return 'testimonios';
      if (/precio|\$|mxn|desde/.test(t) && btns) return 'precios';
      if (/contacto|whatsapp|llám|escríb|ubicaci|horario/.test(t)) return 'contacto';
      if (imgs >= 4) return 'galeria';
      if (s.tagName === 'HEADER') return 'header'; if (s.tagName === 'FOOTER') return 'footer';
      return 'contenido';
    };
    const orden = secciones.map(tipo);
    const heroInfo = hero ? { altura_vh: Math.round(hero.getBoundingClientRect().height / vh * 100), tiene_imagen: !!hero.querySelector('img,video,picture') || getComputedStyle(hero).backgroundImage !== 'none', columnas: hero.querySelectorAll(':scope > * > *').length >= 2 ? 2 : 1, alineacion: getComputedStyle(hero.querySelector('h1') || hero).textAlign } : null;
    const nav = document.querySelector('header nav, nav');
    const hamburguesa = !!(nav && Array.from(nav.querySelectorAll('button')).some((b) => /menu|menú|abrir/i.test(b.getAttribute('aria-label') || b.textContent || '')));
    const ctaArriba = Array.from(document.querySelectorAll('a,button')).some((b) => { const r = b.getBoundingClientRect(); return r.top < vh && r.top >= 0 && getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)'; });

    return {
      tipografia: { titulos: top(titulos) || top(peso), cuerpo: top(cuerpo) || top(peso), h1_px: h1cs ? Math.round(parseFloat(h1cs.fontSize)) : null, h1_peso: h1cs?.fontWeight || null, h1_tracking: h1cs?.letterSpacing || null, base_px: Math.round(baseFs), mayusculas_en_titulos: h1cs?.textTransform === 'uppercase' },
      colores: { fondo: hexOf(fondo), fondo_luminancia: +lum(fondo).toFixed(2), fondos_secciones: ordena(fondos, 4), acentos: ordena(acentos, 3), texto: ordena(textos, 2) },
      forma: { radio_boton_px: radioBoton != null ? Number(radioBoton) : null, cards_con_sombra: cardsN ? +(conSombra / cardsN).toFixed(2) : null },
      densidad: { padding_seccion_px: padMedio, nivel: padMedio == null ? null : padMedio > 160 ? 'aireada' : padMedio > 90 ? 'media' : 'compacta' },
      estructura: { orden, hero: heroInfo, secciones: orden.length },
      hamburguesa, ctaArriba,
    };
  }, esMovil);
}

function resumir(d, m) {
  const t = d.tipografia, c = d.colores, f = d.forma;
  const partes = [];
  partes.push(`${c.fondo_luminancia < 0.3 ? 'Fondo oscuro' : 'Fondo claro'} (${c.fondo}) con acento ${c.acentos[0] || 'sin acento claro'}.`);
  partes.push(`Títulos en ${t.titulos || '?'} ${t.h1_px ? `a ${t.h1_px}px` : ''}${t.mayusculas_en_titulos ? ', en mayúsculas' : ''}; cuerpo en ${t.cuerpo || '?'} ${t.base_px}px.`);
  if (f.radio_boton_px != null) partes.push(`Botones con radio ${f.radio_boton_px}px${f.cards_con_sombra != null ? `, ${Math.round(f.cards_con_sombra * 100)}% de cards con sombra` : ''}.`);
  if (d.densidad.nivel) partes.push(`Densidad ${d.densidad.nivel} (≈${d.densidad.padding_seccion_px}px por sección).`);
  if (d.estructura.hero) partes.push(`Hero de ${d.estructura.hero.altura_vh}vh, ${d.estructura.hero.tiene_imagen ? 'con imagen' : 'solo texto'}, ${d.estructura.hero.columnas} columna(s), alineado ${d.estructura.hero.alineacion}.`);
  partes.push(`Secuencia: ${d.estructura.orden.join(' → ')}.`);
  return partes.join(' ');
}
