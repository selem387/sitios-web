// Redes sociales del negocio: las 5 que pide Ari en B9.4 y las que faltan para ofrecer crearlas al final.
export const REDES = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin'];
export const NOMBRE_RED = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn' };

const limpio = (v) => String(v || '').trim();

// Usuario sin @ ni URL: "https://instagram.com/toolattemid/" → "toolattemid".
export function usuarioDeRed(valor) {
  let v = limpio(valor);
  if (!v) return null;
  v = v.replace(/^https?:\/\/(www\.|m\.|web\.)?[^/]+\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
  v = v.replace(/^(company|in|c|user|channel)\//i, '').replace(/^@/, '');
  return v || null;
}

export function normalizarRedes(redes) {
  const out = {};
  for (const r of REDES) {
    const u = usuarioDeRed(redes?.[r]);
    if (u) out[r] = u;
  }
  return out;
}

export const redesFaltantes = (brief) => REDES.filter((r) => !usuarioDeRed(brief?.contacto?.redes?.[r]));
export const listaNombres = (redes) => {
  const n = redes.map((r) => NOMBRE_RED[r] || r);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n.at(-1)}` : n[0] || '';
};
