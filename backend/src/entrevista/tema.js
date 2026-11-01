// Variaciones de estilo para el tema iaprop-base (fork de Ollie, GPL v3) a partir de los datos de diseño
// de web_builder: diseno_estilos[slug] (tipografía + hints) y arquetipos.diseno->subtipos->X (paleta UUPM).
// El generador escribe un styles/colors/<slug>.json y un styles/typography/<slug>.json por sitio; WordPress
// los aplica como variación de estilo sin tocar theme.json ni los patrones.

const SCHEMA = 'https://schemas.wp.org/trunk/theme.json';
const FUENTES_VETADAS = new Set(['inter', 'roboto', 'arial', 'fraunces']);

const hex = (c) => {
  if (!c) return null;
  let s = String(c).trim();
  if (!s.startsWith('#')) s = `#${s}`;
  if (/^#[0-9a-f]{3}$/i.test(s)) s = `#${[...s.slice(1)].map((x) => x + x).join('')}`;
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : null;
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (r, g, b) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
/** Mezcla `a` hacia `b` en proporción t (0..1). */
export const mezclar = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(...A.map((v, i) => v + (B[i] - v) * t)); };
const luminancia = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contraste = (a, b) => { const l1 = luminancia(a), l2 = luminancia(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const esClaro = (h) => luminancia(h) > 0.5;
const slugify = (s) => String(s || 'sitio').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sitio';

/**
 * Paleta UUPM → slugs de Ollie.
 * UUPM: primary, on_primary, secondary, accent, on_accent, background, foreground, card, muted, muted_foreground, border.
 * Ollie: primary, primary-accent, primary-alt, primary-alt-accent, main, main-accent, base, secondary, tertiary, border-light, border-dark.
 */
export function mapearPaleta(paletaUupm = {}, coloresMarca = []) {
  const p = Object.fromEntries(Object.entries(paletaUupm).map(([k, v]) => [k, hex(v)]));
  const marca = (coloresMarca || []).map(hex).filter(Boolean);
  const primary = marca[0] || p.primary || '#1E3A8A';
  const foreground = p.foreground || '#111827';
  const background = p.background || '#FFFFFF';
  // primary-accent: color del cliente si dio dos; si no, el acento UUPM; si choca con primary, un tinte claro del primary.
  let primaryAccent = marca[1] || p.accent || mezclar(primary, '#FFFFFF', 0.8);
  if (primaryAccent === primary) primaryAccent = mezclar(primary, '#FFFFFF', 0.8);
  const primaryAlt = p.secondary || mezclar(primary, '#FFFFFF', 0.6);
  // texto sobre primary-alt: el on_* de UUPM si existe, si no el que contraste
  const primaryAltAccent = p.on_accent && contraste(p.on_accent, primaryAlt) >= 4.5 ? p.on_accent : (esClaro(primaryAlt) ? foreground : '#FFFFFF');
  const palette = [
    ['Brand', 'primary', primary],
    ['Brand Accent', 'primary-accent', primaryAccent],
    ['Brand Alt', 'primary-alt', primaryAlt],
    ['Brand Alt Accent', 'primary-alt-accent', primaryAltAccent],
    ['Contrast', 'main', foreground],
    ['Contrast Accent', 'main-accent', p.muted_foreground || mezclar(foreground, background, 0.45)],
    ['Base', 'base', background],
    ['Base Accent', 'secondary', p.card || '#FFFFFF'],
    ['Tint', 'tertiary', p.muted || mezclar(background, foreground, 0.05)],
    ['Border Base', 'border-light', p.border || mezclar(background, foreground, 0.15)],
    ['Border Contrast', 'border-dark', mezclar(foreground, background, 0.8)], // foreground al 20 %
  ].map(([name, slug, color]) => ({ name, slug, color }));
  const avisos = [];
  const c = Object.fromEntries(palette.map((x) => [x.slug, x.color]));
  if (contraste(c.main, c.base) < 4.5) avisos.push(`Contraste texto/fondo ${contraste(c.main, c.base).toFixed(2)} < 4.5`);
  if (contraste('#FFFFFF', c.primary) < 4.5 && contraste(c.main, c.primary) < 4.5) avisos.push('Ni blanco ni el texto principal contrastan 4.5 sobre primary; revisar color de botones');
  return { palette, avisos };
}

function googleFontsUrl(familias) {
  const fam = [...new Set(familias.filter(Boolean))].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&');
  return `https://fonts.googleapis.com/css2?${fam}&display=swap`;
}
const slugFuente = (f) => slugify(f);

/** Elige la tipografía: estilo.tipografia, pero nunca con cuerpo vetado; si lo es, alternativa del estilo; si no, la del giro. */
const SOLO_MAYUSCULAS = /^(Cinzel|Cinzel Decorative|Trajan|Bebas Neue|Anton)$/i;

export function elegirTipografia(estilo = {}, subtipoDiseno = {}, semilla = 0) {
  const candidatas = [estilo.tipografia, estilo.tipografia_alternativa, subtipoDiseno.tipografia_giro].filter((t) => t && t.titulos && t.cuerpo);
  const validas = candidatas.filter((t) => !FUENTES_VETADAS.has(t.cuerpo.toLowerCase()) && !FUENTES_VETADAS.has(t.titulos.toLowerCase()));
  const lista = validas.length ? validas : candidatas;
  if (!lista.length) return { nombre: 'Predeterminada', titulos: 'DM Serif Display', cuerpo: 'Work Sans', fuente: 'default' };
  const elegida = lista[Math.abs(semilla) % lista.length];
  // Fuentes que solo tienen mayúsculas/versalitas (Cinzel…) vuelven ilegible un H1 largo: se sustituyen.
  const t = SOLO_MAYUSCULAS.test(elegida.titulos) ? { ...elegida, titulos: 'Cormorant Garamond', titulos_original: elegida.titulos } : elegida;
  return { ...t, fuente: elegida === estilo.tipografia ? 'estilo' : elegida === estilo.tipografia_alternativa ? 'alternativa' : 'giro' };
}

/**
 * @param {object} o
 * @param {object} o.estilo          fila de diseno_estilos: {slug, tipografia, tipografia_alternativa, theme_json_hints}
 * @param {object} o.subtipo_diseno  arquetipos.diseno->subtipos->X: {paleta, tipografia_giro}
 * @param {string[]} o.colores_marca hex del cliente (mandan sobre la paleta)
 * @param {string} o.slug_sitio
 * @param {number} [o.semilla]       entero para el sorteo de tipografía (hash de entrevista_id)
 * @returns {{archivos: Record<string, object>, googleFontsUrl: string, tipografia: object, avisos: string[]}}
 */
export function generarVariaciones({ estilo = {}, subtipo_diseno = {}, colores_marca = [], slug_sitio = 'sitio', semilla = 0 }) {
  const slug = slugify(slug_sitio);
  const { palette, avisos } = mapearPaleta(subtipo_diseno.paleta, colores_marca);
  const tipo = elegirTipografia(estilo, subtipo_diseno, semilla);
  const url = googleFontsUrl([tipo.titulos, tipo.cuerpo]);
  const sTit = slugFuente(tipo.titulos), sCue = slugFuente(tipo.cuerpo);
  const fontFamilies = [
    { fontFamily: `"${tipo.cuerpo}", sans-serif`, name: tipo.cuerpo, slug: 'primary', googleFontsUrl: url },
    { fontFamily: `"${tipo.titulos}", serif`, name: tipo.titulos, slug: 'expanded', googleFontsUrl: url },
    { fontFamily: `"${tipo.titulos}", serif`, name: `${tipo.titulos} (condensada)`, slug: 'condensed', googleFontsUrl: url },
    { fontFamily: `"${tipo.cuerpo}", sans-serif`, name: `${tipo.cuerpo} (estrecha)`, slug: 'narrow', googleFontsUrl: url },
    { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', name: 'Monospace', slug: 'monospace' },
  ];
  const colores = { $schema: SCHEMA, version: 3, title: `Colores ${slug}`, settings: { color: { palette } } };
  const tipografia = {
    $schema: SCHEMA, version: 3, title: `Tipografía ${slug}`, slug: `typography-${slug}`,
    styles: {
      typography: { fontFamily: 'var(--wp--preset--font-family--primary)' },
      elements: { heading: { typography: { fontFamily: 'var(--wp--preset--font-family--expanded)', fontWeight: '600' } } },
    },
    settings: { typography: { fontFamilies } },
    // Campo propio (fuera del esquema de WP, el editor lo ignora): el generador debe encolar esta hoja de Google Fonts.
    googleFontsUrl: url,
  };
  return {
    archivos: { [`styles/colors/${slug}.json`]: colores, [`styles/typography/${slug}.json`]: tipografia },
    googleFontsUrl: url, tipografia: tipo, paleta: Object.fromEntries(palette.map((p) => [p.slug, p.color])), avisos,
    _sTit: sTit, _sCue: sCue,
  };
}

const RADIUS = { '0px': '0px', '2px': '2px', '4px': '4px', '8px': '8px', '12px': '12px', '16px': '16px', '24px': '24px' };
const SOMBRA = {
  none: 'none',
  plana: '4px 4px 0 var(--wp--preset--color--main)',
  suave: '0 8px 24px rgba(0,0,0,.08)',
  blanda: '0 10px 30px rgba(0,0,0,.12)',
};
const ESPACIO = { compacto: 0.85, medio: 1, amplio: 1.2, 'muy amplio': 1.45 };

/**
 * Patch de theme.json a partir de theme_json_hints {radius, shadow, spacing, contrast}.
 * Devuelve {styles, settings} para fusionar (merge profundo) sobre el theme.json del tema.
 */
export function generarThemeJsonHints(hints = {}) {
  const radius = RADIUS[hints.radius] || '8px';
  const shadow = SOMBRA[hints.shadow] || 'none';
  const f = ESPACIO[hints.spacing] || 1;
  const base = { small: 20, medium: 30, large: 40, 'x-large': 60, 'xx-large': 100, 'xxx-large': 150 };
  const spacingSizes = Object.entries(base).map(([slug, px]) => ({ name: slug, slug, size: `clamp(${Math.round(px * f * 0.6)}px, ${(px * f / 14).toFixed(2)}vw, ${Math.round(px * f)}px)` }));
  return {
    settings: {
      border: { radiusSizes: [{ name: 'Tema', slug: 'tema', size: radius }] },
      shadow: { presets: [{ name: 'Tema', slug: 'tema', shadow }] },
      spacing: { spacingSizes },
    },
    styles: {
      elements: { button: { border: { radius } }, ...(hints.contrast === 'alto' ? { heading: { typography: { fontWeight: '700' } } } : {}) },
      blocks: { 'core/group': { border: { radius: '0px' } }, 'core/image': { border: { radius } }, 'core/button': { shadow } },
    },
  };
}

export const FUENTES_VETADAS_LISTA = [...FUENTES_VETADAS];
