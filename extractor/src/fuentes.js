// Normaliza ligas y convierte lo que devuelven los actores de Apify (o la página pública) a un formato común.
const limpio = (v) => (typeof v === 'string' ? v.trim() : '');
const esUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

/** "@toolatte", "instagram.com/toolatte/", "https://www.instagram.com/toolatte?igsh=x" → URL canónica, o null. */
export function urlInstagram(v) {
  let s = limpio(v);
  if (!s) return null;
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i);
  const u = m ? m[1] : s.replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(u) || ['p', 'reel', 'reels', 'stories', 'explore'].includes(u.toLowerCase())) return null;
  return `https://www.instagram.com/${u}/`;
}
export const usuarioInstagram = (url) => (url || '').match(/instagram\.com\/([^/]+)/i)?.[1] || null;

/** Página de Facebook: acepta /nombre, /profile.php?id=, /people/x/id, m./web./fb.com. */
export function urlFacebook(v) {
  let s = limpio(v);
  if (!s) return null;
  if (!/facebook\.com|fb\.com|fb\.me/i.test(s)) {
    if (/^[A-Za-z0-9.]{3,60}$/.test(s.replace(/^@/, ''))) return `https://www.facebook.com/${s.replace(/^@/, '')}`;
    return null;
  }
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    u.hostname = 'www.facebook.com';
    const id = u.searchParams.get('id');
    if (/profile\.php/i.test(u.pathname) && id) return `https://www.facebook.com/profile.php?id=${id}`;
    const ruta = u.pathname.replace(/\/+$/, '');
    if (!ruta || ruta === '/') return null;
    return `https://www.facebook.com${ruta}`;
  } catch {
    return null;
  }
}

// ---- imágenes dentro de cualquier objeto (las salidas de los actores cambian de forma) ----
const LLAVES_FOTO = /^(displayUrl|image|imageUrl|images|photo|photo_image|uri|url|thumbnail|thumbnailUrl|full_picture|src|media|childPosts|sidecar|attachments|fullPicture)$/i;
export function imagenesDe(obj, out = new Set(), prof = 0) {
  if (!obj || prof > 6) return out;
  if (Array.isArray(obj)) { for (const x of obj) imagenesDe(x, out, prof + 1); return out; }
  if (typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (LLAVES_FOTO.test(k) && esUrl(v) && /(scontent|fbcdn|cdninstagram|\.jpe?g|\.png|\.webp)/i.test(v) && !/\.mp4|video/i.test(v)) out.add(v);
    } else if (LLAVES_FOTO.test(k) || typeof v === 'object') imagenesDe(v, out, prof + 1);
  }
  return out;
}

const textoPost = (p) => limpio(p?.text || p?.caption || p?.message || p?.postText || '').slice(0, 400);

/** Página de Facebook (actor de páginas) → datos del negocio. */
export function deFacebook(p = {}) {
  if (!p || p.error) return null;
  const info = Array.isArray(p.info) ? p.info.filter((x) => typeof x === 'string') : [];
  const redes = {};
  for (const u of [...(p.websites || []), p.website, p.instagram, ...(p.about_me?.urls || [])].filter(esUrl)) {
    if (/instagram\.com/i.test(u)) redes.instagram = urlInstagram(u);
    else if (/tiktok\.com/i.test(u)) redes.tiktok = u;
    else if (/youtube\.com|youtu\.be/i.test(u)) redes.youtube = u;
    else if (/linkedin\.com/i.test(u)) redes.linkedin = u;
  }
  const sitio = [p.website, ...(p.websites || [])].find((u) => u && !/instagram|facebook|tiktok|youtube|linkedin|wa\.me|whatsapp/i.test(u)) || null;
  const wa = [...(p.websites || []), p.whatsapp, p.whatsappNumber].find((u) => /wa\.me|whatsapp/i.test(String(u || '')));
  return {
    nombre: limpio(p.title || p.pageName || p.name) || null,
    categorias: (p.categories || []).filter((c) => c && !/^page$/i.test(c)),
    descripcion: limpio(p.intro || p.about_me?.text || p.about || info.join(' · ')) || null,
    direccion: limpio(p.address) || null,
    telefono: limpio(p.phone) || null,
    whatsapp: wa ? (String(wa).match(/\d{10,15}/)?.[0] || null) : null,
    email: limpio(p.email) || null,
    sitio_web: sitio,
    horarios: limpio(p.business_hours || p.hours || p.openingHours && JSON.stringify(p.openingHours)) || null,
    calificacion: typeof p.ratingOverall === 'number' ? p.ratingOverall : null,
    num_resenas: typeof p.ratingCount === 'number' ? p.ratingCount : null,
    texto_resenas: limpio(p.rating) || null,
    seguidores: p.followers || p.likes || null,
    logo: esUrl(p.profilePictureUrl) ? p.profilePictureUrl : (esUrl(p.profilePhoto) ? p.profilePhoto : null),
    portada: esUrl(p.coverPhotoUrl) ? p.coverPhotoUrl : null,
    url: p.facebookUrl || p.pageUrl || null,
    redes,
  };
}

/** Publicaciones (FB o IG) → [{url, texto, fuente}] sin repetir. */
export function fotosDePosts(posts = [], fuente) {
  const vistas = new Set();
  const out = [];
  for (const p of posts) {
    const t = textoPost(p);
    for (const u of imagenesDe(p)) {
      const llave = u.split('?')[0];
      if (vistas.has(llave)) continue;
      vistas.add(llave);
      out.push({ url: u, texto: t, fuente });
    }
  }
  return out;
}

/** Perfil de Instagram (actor de perfiles) → datos + publicaciones. */
export function deInstagram(p = {}) {
  if (!p || p.error || (!p.username && !p.fullName)) return null;
  const bio = limpio(p.biography);
  return {
    nombre: limpio(p.fullName) || p.username || null,
    usuario: p.username || null,
    categorias: [p.businessCategoryName, p.categoryName].filter(Boolean),
    descripcion: bio || null,
    telefono: limpio(p.businessPhoneNumber || p.publicPhoneNumber) || null,
    email: limpio(p.businessEmail || p.publicEmail) || bio.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] || null,
    direccion: limpio(p.businessAddress?.street_address || p.businessAddressJson?.street_address) || null,
    ciudad: limpio(p.businessAddress?.city_name || p.businessAddressJson?.city_name) || null,
    sitio_web: esUrl(p.externalUrl) && !/linktr\.ee|wa\.me|whatsapp/i.test(p.externalUrl) ? p.externalUrl : null,
    whatsapp: [p.externalUrl, bio].join(' ').match(/wa\.me\/(\d{10,15})/)?.[1] || null,
    seguidores: p.followersCount || null,
    logo: esUrl(p.profilePicUrlHD) ? p.profilePicUrlHD : (esUrl(p.profilePicUrl) ? p.profilePicUrl : null),
    posts: [...(p.latestPosts || []), ...(p.posts || [])],
    url: p.url || (p.username ? `https://www.instagram.com/${p.username}/` : null),
  };
}

/** Respaldo sin Apify: etiquetas og: de la página pública (casi siempre solo nombre, descripción y una imagen). */
export async function dePaginaPublica(url) {
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)', 'accept-language': 'es-MX,es;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return null;
    const html = await r.text();
    const meta = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'));
      return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim() : null;
    };
    const titulo = meta('og:title');
    if (!titulo || /log ?in|inicia sesi[oó]n|iniciar sesi[oó]n/i.test(titulo)) return null;
    return { nombre: titulo.replace(/\s*[|•(@].*$/, '').trim(), descripcion: meta('og:description'), logo: meta('og:image'), url };
  } catch {
    return null;
  }
}
