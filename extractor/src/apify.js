// Apify (cuenta selem387): actores oficiales para páginas de Facebook, publicaciones y fotos de Facebook y perfiles de Instagram.
// El tope mensual (TOPE_USD, por omisión 20) es compartido con el scraper de prospectos de Google Maps:
// gasto = uso del mes de la cuenta de Apify (todo lo que corre en ella) + gasto de Google registrado en gasto_scrapers.
const TOKEN = process.env.APIFY_TOKEN || '';
const API = 'https://api.apify.com/v2';

export const ACTORES = {
  fbPagina: process.env.APIFY_ACTOR_FB_PAGINA || 'apify~facebook-pages-scraper',
  fbPosts: process.env.APIFY_ACTOR_FB_POSTS || 'apify~facebook-posts-scraper',
  // Las publicaciones solo traen miniaturas (y nada de los álbumes); este actor trae cada foto en tamaño completo.
  fbFotos: process.env.APIFY_ACTOR_FB_FOTOS || 'apify~facebook-photos-scraper',
  igPerfil: process.env.APIFY_ACTOR_IG_PERFIL || 'apify~instagram-profile-scraper',
};
// Costo estimado por corrida (USD), para no arrancar una extracción que rebasaría el tope.
export const COSTO_ESTIMADO = { fbPagina: 0.02, fbPosts: 0.08, fbFotos: 0.05, igPerfil: 0.03 };

export const hayApify = () => !!TOKEN;

/** Corre un actor y devuelve los items del dataset (o [] si falla o se pasa del tiempo). */
export async function correr(actor, input, { timeoutS = 150, memoriaMb = 1024 } = {}) {
  if (!TOKEN) return { items: [], error: 'sin APIFY_TOKEN' };
  const url = `${API}/acts/${actor}/run-sync-get-dataset-items?timeout=${timeoutS}&memory=${memoriaMb}&clean=true`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout((timeoutS + 30) * 1000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { items: [], error: `Apify ${actor} ${r.status}: ${j?.error?.message || ''}`.trim() };
    return { items: Array.isArray(j) ? j : [] };
  } catch (err) {
    return { items: [], error: `Apify ${actor}: ${err.message}` };
  }
}

/** Uso del ciclo actual de la cuenta de Apify en USD (null si no se pudo leer). */
export async function usoMensualUsd() {
  if (!TOKEN) return null;
  try {
    const r = await fetch(`${API}/users/me/usage/monthly`, { headers: { authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    const d = j?.data || {};
    const v = d.totalUsageCreditsUsdAfterVolumeDiscount ?? d.totalUsageCreditsUsdBeforeVolumeDiscount;
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}
