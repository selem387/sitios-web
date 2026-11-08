// Comprobaciones OBJETIVAS de una página (sin IA): fotos deformadas o rotas, fotos repetidas en una sección,
// desborde horizontal, textos/botones encimados y botones fuera de la pantalla. Corre en el navegador.
export async function revisarPagina(page) {
  // Fuerza la carga de imágenes diferidas y recorre la página para que todo se pinte.
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
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
