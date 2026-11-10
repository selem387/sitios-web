// Comprobaciones OBJETIVAS de una página (sin IA): fotos deformadas o rotas, fotos repetidas en una sección,
// desborde horizontal, textos/botones encimados y botones fuera de la pantalla. Corre en el navegador.
export async function revisarPagina(page) {
  // Fuerza la carga de imágenes diferidas y recorre la página para que todo se pinte.
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 700)); // deja terminar transiciones al volver arriba (p. ej. logo de la barra)
    await Promise.all(Array.from(document.images).map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));
  });
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const prob = [];
    const W = window.innerWidth;
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
    const nombre = (src) => (src || '').split('?')[0].split('/').pop().replace(/[-_]\d{2,4}w(?=\.)/, '');
    const imgs = Array.from(document.images).filter((i) => !i.closest('.etq,.wa,header,.barra') && visible(i));
    for (const i of imgs) {
      if (i.complete && !i.naturalWidth) { prob.push(`foto rota: ${nombre(i.currentSrc || i.src)}`); continue; }
      const fit = getComputedStyle(i).objectFit;
      if (fit === 'cover' || fit === 'contain' || fit === 'scale-down' || !i.naturalWidth) continue;
      const r = i.getBoundingClientRect();
      const nat = i.naturalWidth / i.naturalHeight, ren = r.width / r.height;
      if (Math.abs(ren - nat) / nat > 0.04) prob.push(`foto deformada (${Math.round(ren * 100) / 100} vs ${Math.round(nat * 100) / 100}): ${nombre(i.currentSrc || i.src)}`);
    }
    // Repetidas dentro de una misma sección (ignora fondos difuminados que duplican la foto a propósito).
    for (const sec of document.querySelectorAll('section, .hero, header.hero')) {
      const vistos = new Map();
      for (const i of sec.querySelectorAll('img')) {
        if (!visible(i) || /blur/.test(getComputedStyle(i).filter) || i.getAttribute('aria-hidden') === 'true' || i.closest('[aria-hidden="true"]')) continue;
        const n = nombre(i.currentSrc || i.src);
        if (!n) continue;
        vistos.set(n, (vistos.get(n) || 0) + 1);
      }
      for (const [n, k] of vistos) if (k > 1) prob.push(`foto repetida ${k} veces en #${sec.id || sec.className.split(' ')[0]}: ${n}`);
    }
    if (document.documentElement.scrollWidth > W + 2) prob.push(`desborde horizontal: la página mide ${document.documentElement.scrollWidth}px en una pantalla de ${W}px`);
    // Botones fuera de la pantalla y textos encimados (en lo visible de cada sección).
    const btns = Array.from(document.querySelectorAll('a.btn, button.btn, .btn')).filter((b) => visible(b) && !b.closest('.etq,.wa'));
    for (const b of btns) { const r = b.getBoundingClientRect(); if (r.left < -1 || r.right > W + 1) prob.push(`botón cortado por el borde: "${(b.textContent || '').trim().slice(0, 40)}"`); }
    const txt = Array.from(document.querySelectorAll('h1,h2,h3,p,.btn,.kicker,.sub')).filter((e) => visible(e) && !e.closest('.etq,.wa,footer'));
    for (let a = 0; a < txt.length; a++) {
      for (let b = a + 1; b < txt.length; b++) {
        const x = txt[a], y = txt[b];
        if (x.contains(y) || y.contains(x)) continue;
        const r1 = x.getBoundingClientRect(), r2 = y.getBoundingClientRect();
        const iw = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left), ih = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
        if (iw > 6 && ih > 6 && iw * ih > 0.15 * Math.min(r1.width * r1.height, r2.width * r2.height)) prob.push(`texto encimado: "${(x.textContent || '').trim().slice(0, 30)}" con "${(y.textContent || '').trim().slice(0, 30)}"`);
      }
    }
    // ---- Proporción y alineación (10-nov-2026, caso El Rincón del Mayab) ----
    const px = (e) => parseFloat(getComputedStyle(e).fontSize) || 0;
    const parrafos = Array.from(document.querySelectorAll('main p')).filter((e) => visible(e) && (e.textContent || '').trim().length > 40 && !e.closest('.sl,.etq,.wa,footer,.kicker'));
    const tams = parrafos.map(px).sort((a, b) => a - b);
    // Cuerpo = tamaño del texto base de la página (body). La mediana de párrafos engañaba: subtítulos y textos del
    // slider son más grandes a propósito y hacían ver "chicas" descripciones de tamaño normal.
    const cuerpo = px(document.body) || (tams.length ? tams[Math.floor(tams.length / 2)] : 16);
    // 1) Texto de lectura (descripciones, datos) desproporcionadamente chico frente al cuerpo.
    const lectura = Array.from(document.querySelectorAll('main p, main li, main span, main dd')).filter((e) => visible(e) && !e.children.length && (e.textContent || '').trim().length > 25 && !e.closest('.sl,.etq,.wa,footer,.kicker,.btn,nav,.info'));
    const visible2 = visible;
    // Piso de 20 px (10-nov-2026) para todo texto del sitio; excepciones: contador del slider y etiqueta "Propuesta X".
    const todos = Array.from(document.querySelectorAll('body *')).filter((e) => visible(e) && !e.children.length && (e.textContent || '').trim().length > 1 && !e.closest('.sl-pos,.etq,.sl-b,svg,script,style'));
    const chicos = todos.filter((e) => px(e) < 19.5).concat(lectura.filter((e) => px(e) < cuerpo * 0.86));
    if (chicos.length) prob.push(`texto desproporcionadamente chico: ${Math.round(px(chicos[0]))}px (mínimo 20px; cuerpo ${Math.round(cuerpo)}px) ("${chicos[0].textContent.trim().slice(0, 40)}")`);
    if (W >= 1200) {
      // 2) Titular de portada chico para el ancho de la página.
      const h1 = Array.from(document.querySelectorAll('h1')).find(visible);
      if (h1 && px(h1) < 56) prob.push(`titular de portada chico para computadora: ${Math.round(px(h1))}px (mínimo 56px)`);
      // 3) Bloques fuera de la columna del sitio: la columna es el borde izquierdo más común de los h2 de sección.
      const lefts = Array.from(document.querySelectorAll('main h2')).filter(visible).map((e) => Math.round(e.getBoundingClientRect().left));
      const moda = lefts.sort((a, b) => lefts.filter((x) => x === b).length - lefts.filter((x) => x === a).length)[0];
      if (moda != null) {
        const bloques = Array.from(document.querySelectorAll('main h1, .hero .sub, .galeria, .just, .tira, .paqs, .quotes, .datos')).filter((e) => visible(e) && !e.closest('.sl'));
        for (const e of bloques) {
          const r = e.getBoundingClientRect(), s = getComputedStyle(e);
          const centrado = Math.abs((r.left + r.right) / 2 - W / 2) < 8 && (s.textAlign === 'center' || e.closest('[style*="center"],.h-logo'));
          if (centrado || r.left < 4) continue; // centrado a propósito o a todo el ancho
          if (Math.abs(r.left - moda) > 12) { prob.push(`bloque desalineado con la columna del sitio: ${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} empieza en ${Math.round(r.left)}px y la columna en ${moda}px`); break; }
        }
      }
      // 4) Fila de fotos que deja más de un tercio del ancho vacío.
      for (const g of document.querySelectorAll('.just, .tira')) {
        if (!visible(g)) continue;
        const gr = g.getBoundingClientRect(), ims = Array.from(g.querySelectorAll('img')).filter(visible);
        if (!ims.length) continue;
        const der = Math.max(...ims.map((i) => i.getBoundingClientRect().right));
        if (gr.right - der > gr.width / 3) { prob.push('fila de fotos con más de un tercio del ancho vacío'); break; }
      }
    }
    // 4b) Texto o botón pegado al borde inferior de una sección con fondo propio (sin margen).
    for (const sec of document.querySelectorAll('main section, main .hero')) {
      if (!visible(sec)) continue;
      const cs = getComputedStyle(sec), sr = sec.getBoundingClientRect();
      const conFondo = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' && cs.backgroundColor !== getComputedStyle(document.body).backgroundColor;
      if (!conFondo) continue;
      const pegado = Array.from(sec.querySelectorAll('h1,h2,p,.btn')).filter((e) => visible(e) && !e.closest('.sl')).find((e) => sr.bottom - e.getBoundingClientRect().bottom < 16);
      if (pegado) { prob.push(`texto pegado al borde inferior de su sección: "${(pegado.textContent || '').trim().slice(0, 30)}"`); break; }
    }
    // 4c) Menú y botones con fuente sans de pantalla (regla dura 10-nov-2026).
    const SERIF_O_DISPLAY = /serif|bodoni|petrona|spectral|newsreader|gloock|marcellus|italiana|young serif|instrument serif|gluten|grandstander|chango|bagel|syne|unbounded|mono/i;
    const ui = Array.from(document.querySelectorAll('nav a, .barra a, .btn, button')).filter((e) => visible(e) && (e.textContent || '').trim().length > 2 && !e.closest('.etq,.sl-b'));
    const malUI = ui.find((e) => { const f = getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim(); return SERIF_O_DISPLAY.test(f) && !/sans/i.test(f); });
    if (malUI) prob.push(`menú o botón con fuente no apta para interfaz web: ${getComputedStyle(malUI).fontFamily.split(',')[0]} ("${malUI.textContent.trim().slice(0, 25)}")`);
    // 5) Sección con título y una sola imagen (p. ej. "Galería" con el logo).
    for (const sec of document.querySelectorAll('main section')) {
      const h = sec.querySelector('h2'); if (!h || !visible(h)) continue;
      const ims = Array.from(sec.querySelectorAll('img')).filter(visible);
      const texto = (sec.textContent || '').replace(h.textContent, '').trim();
      if (ims.length === 1 && texto.length < 20 && !sec.querySelector('form,video,iframe')) prob.push(`sección "${h.textContent.trim().slice(0, 30)}" con una sola imagen y nada más`);
    }
    // 6) El logo no se repite en la primera pantalla.
    const vh = window.innerHeight;
    const logosArriba = Array.from(document.querySelectorAll('img')).filter((i) => /\blogo/.test(i.className) && visible(i) && +getComputedStyle(i).opacity > 0.2 && !i.closest('[style*="opacity: 0"]') && i.getBoundingClientRect().top < vh && getComputedStyle(i.closest('.barra,header') || i).opacity > 0.2);
    if (logosArriba.length > 1) prob.push(`el logo aparece ${logosArriba.length} veces en la primera pantalla`);
    // 7) Fotos con franjas negras/lisas (letterbox) arriba y abajo o a los lados.
    const lisa = (ctx, x, y, w, h) => { const d = ctx.getImageData(x, y, w, h).data; let s = 0, s2 = 0, n = d.length / 4; for (let k = 0; k < d.length; k += 4) { const v = (d[k] + d[k + 1] + d[k + 2]) / 3; s += v; s2 += v * v; } const m = s / n; return m < 35 && Math.sqrt(Math.max(0, s2 / n - m * m)) < 4; }; // franja negra (letterbox); un fondo blanco de estudio no cuenta
    for (const i of imgs) {
      if (!i.naturalWidth || /\blogo/.test(i.className) || i.closest('header,.barra,footer')) continue;
      try {
        const w = 120, h = Math.max(2, Math.round(120 * i.naturalHeight / i.naturalWidth)), c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(i, 0, 0, w, h);
        const b = Math.max(2, Math.round(h * 0.03)), bw = Math.max(2, Math.round(w * 0.03));
        if ((lisa(ctx, 0, 0, w, b) && lisa(ctx, 0, h - b, w, b)) || (lisa(ctx, 0, 0, bw, h) && lisa(ctx, w - bw, 0, bw, h))) prob.push(`foto con franjas negras en los bordes: ${nombre(i.currentSrc || i.src)}`);
      } catch { /* imagen de otro dominio: no se puede medir */ }
    }
    const logo = document.querySelector('header img, .barra img');
    const fuente = (sel) => {
      const e = document.querySelector(sel); if (!e) return null;
      const s = getComputedStyle(e); const f = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      return { f, ok: Array.from(document.fonts).some((x) => x.family.replace(/["']/g, '') === f && x.status === 'loaded') || !Array.from(document.fonts).some((x) => x.family.replace(/["']/g, '') === f) };
    };
    const fs = [fuente('h1'), fuente('p')].filter(Boolean);
    for (const c of fs) if (!c.ok) prob.push(`la letra ${c.f} no cargó`);
    const familias = [fs[0]?.f || null, fs[1]?.f || null];
    return { problemas: [...new Set(prob)].slice(0, 20), logo: logo ? (logo.complete && logo.naturalWidth > 0) : null, fuentes: { titulos: familias[0], cuerpo: familias[1] } };
  });
}

// Contraste REAL del texto de la primera pantalla contra lo que tiene detrás (foto o color), medido en píxeles:
// se oculta el texto, se captura su zona y se compara su color con el 85% más desfavorable del fondo (WCAG: 4.5, títulos 3).
export async function revisarContraste(page) {
  const items = await page.evaluate(() => {
    const H = window.innerHeight, W = window.innerWidth;
    const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 8 && r.height > 8 && r.top < H && r.bottom > 0 && r.left < W && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
    const els = Array.from(document.querySelectorAll('h1,h2,.sub,.kicker,.hero p,section p,.btn')).filter((e) => vis(e) && !e.closest('.etq,.wa,header,.barra,footer') && (e.textContent || '').trim().length > 2).slice(0, 14);
    return els.map((e, k) => {
      e.setAttribute('data-rv', k);
      const s = getComputedStyle(e); const r = e.getBoundingClientRect();
      const m = s.color.match(/[\d.]+/g).map(Number);
      const tam = parseFloat(s.fontSize), peso = parseInt(s.fontWeight, 10) || 400;
      return { k, texto: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), color: m.slice(0, 3), alfa: m[3] ?? 1, grande: tam >= 24 || (tam >= 18.6 && peso >= 700), clip: { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(r.width, W - Math.max(0, r.left)), height: Math.min(r.height, H - Math.max(0, r.top)) } };
    });
  });
  if (!items.length) return [];
  const estilo = await page.addStyleTag({ content: '[data-rv],[data-rv] *{color:transparent!important;-webkit-text-stroke:0!important}' });
  await page.waitForTimeout(150);
  const out = [];
  for (const it of items) {
    if (it.clip.width < 8 || it.clip.height < 8) continue;
    const b64 = (await page.screenshot({ clip: it.clip, type: 'png' })).toString('base64');
    const r = await page.evaluate(async ({ b64, it }) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const L = (r, g2, b) => 0.2126 * lin(r) + 0.7152 * lin(g2) + 0.0722 * lin(b);
      const lums = []; for (let i = 0; i < d.length; i += 16) lums.push(L(d[i], d[i + 1], d[i + 2]));
      lums.sort((a, b) => a - b);
      const lt = L(...it.color);
      const q = it.grande ? 0.8 : 0.85;
      const peor = lt > 0.4 ? lums[Math.floor(lums.length * q)] : lums[Math.floor(lums.length * (1 - q))];
      const ratio = (Math.max(lt, peor) + 0.05) / (Math.min(lt, peor) + 0.05);
      return Math.round(ratio * 10) / 10;
    }, { b64, it });
    const minimo = it.grande ? 3 : 4.5;
    if (r < minimo) out.push(`texto con poco contraste (${r}:1, mínimo ${minimo}:1): "${it.texto}"`);
  }
  await estilo.evaluate((n) => n.remove()).catch(() => {});
  return out;
}
