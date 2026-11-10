// REGLA DURA: todo el material que mandó el cliente (logo, imágenes, su foto, reseñas, catálogos, documentos, video)
// aparece en cada propuesta. completarMaterial() agrega una galería con lo que falte; validarMaterial() confirma.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const contiene = (html, u) => u && (html.includes(u) || html.includes(esc(u)));

/** Lista de assets (y logo) que no aparecen en el HTML. */
export function validarMaterial(html, mat) {
  const faltan = [];
  const logoUrls = [mat.logo?.url, ...Object.values(mat.logo?.tenidos || {})].filter(Boolean);
  if (mat.logo?.url && !logoUrls.some((u) => contiene(html, u))) faltan.push({ clave: 'logo', tipo: 'logo', url: mat.logo.url });
  for (const u of mat.usables || []) {
    if (mat.logo?.url && u.urls.includes(mat.logo.url) && logoUrls.some((x) => contiene(html, x))) continue;
    if (!u.urls.some((x) => contiene(html, x))) faltan.push({ clave: u.clave, tipo: u.tipo, url: u.urls[1] || u.urls[0] });
  }
  return faltan;
}

/** Fotos que aparecen más de una vez (el logo puede ir en barra y portada). REGLA DURA: ninguna foto se repite. */
export function fotosRepetidas(html, mat) {
  const logos = new Set([mat.logo?.url, ...Object.values(mat.logo?.tenidos || {})].filter(Boolean));
  const cuenta = new Map();
  // Las fotos del slider (sl-img) pueden repetirse en "Nuestro trabajo" (10-nov-2026): no cuentan como repetidas.
  for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) { if (/class="[^"]*\b(sl-img|rep-ok)\b/.test(m[0])) continue; const u = m[1].replace(/&amp;/g, '&'); if (!logos.has(u)) cuenta.set(u, (cuenta.get(u) || 0) + 1); }
  return [...cuenta].filter(([, n]) => n > 1).map(([url, n]) => ({ url, veces: n }));
}

/** Inserta antes de </main> una galería con lo que falte (imágenes, video, documentos). Devuelve {html, faltan}. */
export function completarMaterial(html, mat, { titulo = 'Más de nuestro trabajo' } = {}) {
  const faltan = validarMaterial(html, mat).filter((f) => f.tipo !== 'logo');
  if (faltan.length) {
    const items = faltan.map((f) => {
      if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(f.url)) return `<figure><video src="${esc(f.url)}" controls playsinline preload="metadata" style="width:100%;border-radius:12px"></video></figure>`;
      if (/\.(pdf|docx?|xlsx?)(\?|$)/i.test(f.url)) return `<p><a href="${esc(f.url)}" target="_blank" rel="noopener" style="font-weight:700">Ver documento</a></p>`;
      return `<figure style="break-inside:avoid;margin:0 0 10px"><img src="${esc(f.url)}" alt="" loading="lazy" style="width:100%;height:auto;border-radius:12px"></figure>`;
    }).join('');
    const sec = `<section class="sec" id="mas"><div class="wrap"><h2>${esc(titulo)}</h2><div style="columns:2 160px;column-gap:10px">${items}</div></div></section>`;
    html = html.includes('</main>') ? html.replace('</main>', `${sec}</main>`) : html.replace('</body>', `${sec}</body>`);
  }
  return { html, faltan: validarMaterial(html, mat), repetidas: fotosRepetidas(html, mat) };
}
