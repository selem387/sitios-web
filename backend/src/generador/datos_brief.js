// Datos del brief que usan las dos plantillas (restaurantes y general) y el post-proceso de contacto.

/** Dirección del negocio en una línea. Ari a veces la guarda en negocio.direccion en vez de contacto.direccion
 * (12-nov-2026, caso La Fondita de Celestún: la pidió y la página salió sin ella). */
export function direccionTexto(brief = {}) {
  const d = brief.contacto?.direccion; const n = brief.negocio || {};
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (d && typeof d === 'object') {
    const t = [d.calle, d.colonia, d.cp, d.ciudad || n.ciudad, d.estado || n.estado].filter(Boolean);
    if (d.calle || d.colonia) return t.join(', ');
  }
  if (typeof n.direccion === 'string' && n.direccion.trim()) return n.direccion.trim();
  if (n.direccion && typeof n.direccion === 'object' && (n.direccion.calle || n.direccion.colonia)) return [n.direccion.calle, n.direccion.colonia, n.direccion.cp, n.direccion.ciudad || n.ciudad, n.direccion.estado || n.estado].filter(Boolean).join(', ');
  return '';
}

const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Testimonios en texto que sí son de clientes: sin repetidos, sin preguntas (12-nov-2026: quedó guardado cuatro veces
 * un mensaje de Ari, "¿Me las puedes mandar?", como si fuera reseña) y sin los que ya salen en una captura de reseña. */
export function testimoniosValidos(brief = {}, mat = {}) {
  const enCapturas = (mat.resenas || []).map((x) => norm(x.resena?.texto)).filter(Boolean);
  const vistos = new Set();
  return (brief.confianza?.testimonios || []).filter((x) => {
    const t = norm(x?.texto);
    if (!t || t.length < 8 || /[¿?]/.test(String(x.texto))) return false;
    if (vistos.has(t) || enCapturas.some((c) => c.includes(t) || t.includes(c))) return false;
    vistos.add(t);
    return true;
  });
}

/** Mapa de Google con la dirección (sin clave de API): va en la sección de contacto. */
export function mapaHTML(brief = {}) {
  const dir = direccionTexto(brief);
  if (!dir) return '';
  const q = encodeURIComponent([brief.negocio?.nombre, dir].filter(Boolean).join(', '));
  const titulo = String(`Mapa: cómo llegar a ${brief.negocio?.nombre || 'nuestro local'}`).replace(/[&<>"']/g, '');
  return `<div class="mapa" style="margin-top:22px"><iframe title="${titulo}" src="https://www.google.com/maps?q=${q}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen style="display:block;border:0;width:100%;height:340px;border-radius:18px"></iframe></div>`;
}
