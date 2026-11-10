// REGLA DURA de tipografía y color (v1, 4-nov-2026). Todo sitio y toda propuesta pasa por aquí antes de publicarse.
// Bibliografía y razonamiento: proyecto claude.ai, doc claude/reglas-tipografia-color-2026.md.
//
// Tipografía: Bringhurst (The Elements of Typographic Style), Lupton (Thinking with Type), Butterick (Practical Typography),
//   Google Fonts Knowledge (pairing within a family/superfamily, x-height), Tim Brown / Utopia (escalas modulares fluidas).
// Color: Albers (Interaction of Color), WCAG 2.2 (norma vigente, 1.4.3 / 1.4.11), APCA (criterio perceptual de apoyo; en 2026
//   es exploratorio y salió del borrador de WCAG 3, por eso nunca sustituye a WCAG 2.2), OKLCH (CSS Color 4), escala de 12
//   pasos de Radix Colors (roles por paso), proporción 60-30-10.
//
// Métricas tipográficas MEDIDAS (no estimadas) de los archivos latin-400 de cada familia (fontkit sobre @fontsource):
//   xh = altura x / em, ancho = avance medio de minúsculas / em, pesos disponibles.

/* ============================== TIPOGRAFÍA ============================== */

// clase: serif | sans | mono | display (decorativa, solo títulos). sub: subclase para medir contraste entre pares.
// rol: 'texto' (apta para cuerpo) | 'titulos' (solo títulos/≥ 24 px). familia: superfamilia (pares de la misma casa armonizan solos).
export const METRICAS = {
  'Young Serif': { clase: 'serif', sub: 'serif-pesada', rol: 'titulos', xh: 0.5, ancho: 0.579, pesos: [400] },
  Gloock: { clase: 'serif', sub: 'didona', rol: 'titulos', xh: 0.508, ancho: 0.526, pesos: [400] },
  'Bodoni Moda': { clase: 'serif', sub: 'didona', rol: 'titulos', xh: 0.46, ancho: 0.533, pesos: [400, 500, 600, 700, 800, 900] },
  'Instrument Serif': { clase: 'serif', sub: 'serif-condensada', rol: 'titulos', xh: 0.51, ancho: 0.392, pesos: [400], familia: 'instrument' },
  Italiana: { clase: 'display', sub: 'elegante-fina', rol: 'titulos', xh: 0.5, ancho: 0.476, pesos: [400], min_px: 32 },
  Marcellus: { clase: 'serif', sub: 'glifica', rol: 'titulos', xh: 0.5, ancho: 0.502, pesos: [400] },
  Newsreader: { clase: 'serif', sub: 'transicional', rol: 'texto', xh: 0.441, ancho: 0.486, pesos: [200, 300, 400, 500, 600, 700, 800] },
  Petrona: { clase: 'serif', sub: 'transicional', rol: 'texto', xh: 0.443, ancho: 0.493, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  Spectral: { clase: 'serif', sub: 'transicional', rol: 'texto', xh: 0.45, ancho: 0.502, pesos: [200, 300, 400, 500, 600, 700, 800] },
  'Cormorant Garamond': { clase: 'serif', sub: 'garalda', rol: 'titulos', xh: 0.386, ancho: 0.441, pesos: [300, 400, 500, 600, 700] },
  'Instrument Sans': { clase: 'sans', sub: 'neogrotesca', rol: 'texto', xh: 0.51, ancho: 0.525, pesos: [400, 500, 600, 700], familia: 'instrument' },
  'Hanken Grotesk': { clase: 'sans', sub: 'grotesca', rol: 'texto', xh: 0.493, ancho: 0.504, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  'Schibsted Grotesk': { clase: 'sans', sub: 'grotesca', rol: 'texto', xh: 0.527, ancho: 0.526, pesos: [400, 500, 600, 700, 800, 900] },
  'Familjen Grotesk': { clase: 'sans', sub: 'grotesca', rol: 'texto', xh: 0.5, ancho: 0.479, pesos: [400, 500, 600, 700] },
  'Golos Text': { clase: 'sans', sub: 'neogrotesca', rol: 'texto', xh: 0.53, ancho: 0.53, pesos: [400, 500, 600, 700, 800, 900] },
  Onest: { clase: 'sans', sub: 'geometrica', rol: 'texto', xh: 0.527, ancho: 0.527, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  'Albert Sans': { clase: 'sans', sub: 'geometrica', rol: 'texto', xh: 0.5, ancho: 0.515, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  'Reddit Sans': { clase: 'sans', sub: 'humanista', rol: 'texto', xh: 0.518, ancho: 0.509, pesos: [200, 300, 400, 500, 600, 700, 800, 900] },
  'Atkinson Hyperlegible': { clase: 'sans', sub: 'humanista', rol: 'texto', xh: 0.496, ancho: 0.483, pesos: [400, 700] },
  Geist: { clase: 'sans', sub: 'neogrotesca', rol: 'texto', xh: 0.53, ancho: 0.534, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900], familia: 'geist' },
  'Geist Mono': { clase: 'mono', sub: 'mono', rol: 'titulos', xh: 0.53, ancho: 0.6, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900], familia: 'geist' },
  Gabarito: { clase: 'sans', sub: 'geometrica-display', rol: 'titulos', xh: 0.488, ancho: 0.491, pesos: [400, 500, 600, 700, 800, 900] },
  'Bricolage Grotesque': { clase: 'sans', sub: 'grotesca-expresiva', rol: 'titulos', xh: 0.517, ancho: 0.533, pesos: [200, 300, 400, 500, 600, 700, 800] },
  'Darker Grotesque': { clase: 'sans', sub: 'grotesca-condensada', rol: 'titulos', xh: 0.406, ancho: 0.399, pesos: [300, 400, 500, 600, 700, 800, 900] },
  Syne: { clase: 'display', sub: 'expresiva-ancha', rol: 'titulos', xh: 0.5, ancho: 0.503, pesos: [400, 500, 600, 700, 800] },
  Unbounded: { clase: 'display', sub: 'geometrica-ancha', rol: 'titulos', xh: 0.566, ancho: 0.688, pesos: [200, 300, 400, 500, 600, 700, 800, 900] },
  'Chakra Petch': { clase: 'display', sub: 'tecnica-cuadrada', rol: 'titulos', xh: 0.498, ancho: 0.511, pesos: [300, 400, 500, 600, 700] },
  'Martian Mono': { clase: 'mono', sub: 'mono', rol: 'titulos', xh: 0.6, ancho: 0.7, pesos: [100, 200, 300, 400, 500, 600, 700, 800] },
  Grandstander: { clase: 'display', sub: 'redondeada-ludica', rol: 'titulos', xh: 0.579, ancho: 0.552, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  Gluten: { clase: 'display', sub: 'ludica-caligrafica', rol: 'titulos', xh: 0.469, ancho: 0.57, pesos: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  'Bagel Fat One': { clase: 'display', sub: 'redondeada-pesada', rol: 'titulos', xh: 0.527, ancho: 0.529, pesos: [400] },
  Chango: { clase: 'display', sub: 'pesada-ancha', rol: 'titulos', xh: 0.509, ancho: 0.766, pesos: [400] },
};

// Personalidad que transmite cada subclase tipográfica (Aaker 1997; Lupton, Thinking with Type: el título lleva la voz).
export const DIM_SUB = {
  didona: ['sofisticada'], 'serif-condensada': ['sofisticada', 'emocionante'], 'elegante-fina': ['sofisticada'], glifica: ['sofisticada', 'competente'],
  garalda: ['sofisticada', 'sincera'], transicional: ['competente', 'sofisticada'], 'serif-pesada': ['sincera', 'emocionante'],
  neogrotesca: ['competente'], grotesca: ['competente', 'sincera'], geometrica: ['competente', 'emocionante'], humanista: ['sincera', 'competente'],
  'geometrica-display': ['emocionante', 'sincera'], 'grotesca-expresiva': ['emocionante', 'sincera'], 'grotesca-condensada': ['ruda', 'emocionante'],
  'expresiva-ancha': ['emocionante', 'sofisticada'], 'geometrica-ancha': ['emocionante', 'competente'], 'tecnica-cuadrada': ['competente', 'emocionante', 'ruda'],
  mono: ['competente'], 'redondeada-ludica': ['emocionante', 'sincera'], 'ludica-caligrafica': ['emocionante', 'sincera'],
  'redondeada-pesada': ['emocionante'], 'pesada-ancha': ['emocionante', 'ruda'],
};
/** Dimensiones de personalidad de un par (manda la letra de títulos; el cuerpo suma). */
export function dimensionesFuente({ titulos, cuerpo } = {}) {
  const t = DIM_SUB[METRICAS[titulos]?.sub] || [], c = DIM_SUB[METRICAS[cuerpo]?.sub] || [];
  return { titulos: t, todas: [...new Set([...t, ...c])] };
}

// Altura x mínima para cuerpo de texto en pantalla a 16–18 px (por debajo se lee pequeño y cansa).
const XH_MIN_CUERPO = { sans: 0.48, serif: 0.44 };

/**
 * Valida un par {titulos, cuerpo} contra la regla dura.
 * Regla: contraste de rol + armonía de proporción. Máximo 2 familias. Cuerpo siempre apto para lectura.
 * @returns {{ok:boolean, errores:string[], avisos:string[], puntaje:number}}
 */
export function validarPar({ titulos, cuerpo } = {}) {
  const errores = [], avisos = [];
  const T = METRICAS[titulos], C = METRICAS[cuerpo];
  if (!T || !C) return { ok: false, errores: [`Sin métricas medidas para ${!T ? titulos : cuerpo}: medir antes de usar`], avisos, puntaje: 0 };
  // 1. El cuerpo debe ser una letra de texto (no decorativa, no mono, con pesos para jerarquía, altura x suficiente).
  if (C.rol !== 'texto') errores.push(`${cuerpo} no es letra de texto (es de ${C.clase === 'mono' ? 'código/etiquetas' : 'títulos'})`);
  if (C.xh < (XH_MIN_CUERPO[C.clase] ?? 0.48)) errores.push(`${cuerpo}: altura x ${C.xh} < ${XH_MIN_CUERPO[C.clase] ?? 0.48} para cuerpo`);
  if (!(C.pesos.includes(400) && C.pesos.some((w) => w >= 600))) errores.push(`${cuerpo} necesita 400 y ≥ 600 para jerarquía`);
  // 2. Misma familia o superfamilia: armonía garantizada (Google Fonts Knowledge, Stocks).
  const mismaCasa = titulos === cuerpo || (T.familia && T.familia === C.familia);
  // 3. Contraste de rol: clase distinta vale 2; subclase 1; ancho claramente distinto 1; decorativa 1. Se pide ≥ 2.
  let puntaje = 0;
  if (!mismaCasa) {
    if (T.clase !== C.clase) puntaje += 2;
    if (T.sub !== C.sub) puntaje += 1;
    if (Math.abs(T.ancho - C.ancho) >= 0.07) puntaje += 1;
    if (T.clase === 'display') puntaje += 1;
    if (puntaje < 2) errores.push(`${titulos} y ${cuerpo} se parecen demasiado (contraste ${puntaje}/2): se lee como error, no como jerarquía`);
    if (T.clase === C.clase && T.sub === C.sub) errores.push(`${titulos} y ${cuerpo} son de la misma subclase (${T.sub})`);
  } else puntaje = 3;
  // 4. Armonía de proporción: alturas x cercanas (diferencia > 0.06 se compensa con font-size-adjust).
  const dx = Math.abs(T.xh - C.xh);
  if (dx > 0.06) avisos.push(`Altura x distinta (${T.xh} vs ${C.xh}): se compensa con font-size-adjust en títulos`);
  // 5. Fuentes de un solo peso o finas: solo en tamaños grandes.
  if (T.min_px) avisos.push(`${titulos} solo a ≥ ${T.min_px}px`);
  return { ok: errores.length === 0, errores, avisos, puntaje };
}

// Ratio de la escala modular por estilo (Tim Brown; Utopia: ratio menor en móvil, mayor en escritorio).
const RATIO = {
  minimalista: [1.2, 1.25], tecnologico: [1.2, 1.25], calido: [1.2, 1.25], fresco: [1.2, 1.25], tradicional: [1.2, 1.25],
  divertido: [1.25, 1.333], elegante: [1.25, 1.333], lujo: [1.25, 1.414],
};
const r3 = (n) => Math.round(n * 1000) / 1000;
/** clamp() fluido entre 360 px y 1240 px (Utopia). */
function fluido(minPx, maxPx, vMin = 360, vMax = 1240) {
  const pend = (maxPx - minPx) / (vMax - vMin);
  const inter = minPx - pend * vMin;
  return `clamp(${r3(minPx / 16)}rem, ${r3(inter / 16)}rem + ${r3(pend * 100)}vw, ${r3(maxPx / 16)}rem)`;
}

/**
 * Escala tipográfica: cuerpo 16→18 px (Butterick: 15–25 px en web), pasos -1..5, interlineado por rol,
 * medida de 45–75 caracteres (65ch de objetivo).
 */
export function escalaTipografica(estilo = 'calido', { cuerpo } = {}) {
  const [rMin, rMax] = RATIO[estilo] || RATIO.calido;
  const C = METRICAS[cuerpo] || {};
  const serifCuerpo = C.clase === 'serif';
  const bMin = serifCuerpo ? 17 : 16, bMax = serifCuerpo ? 19 : 18;
  const paso = (n) => fluido(bMin * rMin ** n, bMax * rMax ** n);
  const h1Paso = rMax > 1.25 ? 4 : 5;
  // Titular de portada = tamaño de exhibición (10-nov-2026, caso El Rincón del Mayab): con ratio 1.25 el paso 5 daba
  // 55 px, chico para una columna de 1100 px. El h1 crece con la pantalla hasta 4.75–5.5 rem en escritorio
  // (≈ 1/14 del ancho de la columna), nunca menos que la escala modular.
  const h1Max = Math.max(bMax * rMax ** h1Paso, rMax > 1.25 ? 88 : 76), h1Min = Math.max(bMin * rMin ** h1Paso, 36);
  // Texto secundario (descripciones de productos, datos, notas): mínimo 90% del cuerpo. Antes quedaba fijo en 14 px
  // con cuerpo de 18 px y se veía desproporcionado.
  const secMin = Math.max(15, Math.round(bMin * 0.94)), secMax = Math.max(16, Math.round(bMax * 0.94));
  return {
    ratio: [rMin, rMax],
    pasos: { '-1': paso(-1), 0: paso(0), 1: paso(1), 2: paso(2), 3: paso(3), 4: paso(4), 5: paso(5) },
    h1: fluido(h1Min, h1Max, 360, 1280), h2: paso(h1Paso - 2), h3: paso(1), cuerpo: paso(0), chico: paso(-1), secundario: fluido(secMin, secMax),
    interlineado: { cuerpo: serifCuerpo ? 1.6 : 1.55, h1: 1.08, h2: 1.15, h3: 1.25 },
    tracking: { h1: '-0.02em', h2: '-0.01em', versalitas: '0.06em' },
    medida: '65ch',
  };
}

/** CSS que se agrega al final de cada página (manda sobre lo anterior). */

/**
 * REGLA DURA (10-nov-2026, Sebastián): menús, botones, etiquetas y formularios siempre con una fuente sans pensada para
 * pantalla (buena legibilidad en tamaños de interfaz). Nunca la serif de texto ni una de exhibición/condensada.
 * Orden: el cuerpo si es sans de texto → el título si es sans de texto (no expresiva/condensada) → una sans de pantalla
 * poco común de la misma familia o de la lista. Así casi nunca se agrega una tercera familia.
 */
export const UI_WEB = ['Instrument Sans', 'Hanken Grotesk', 'Onest', 'Golos Text', 'Albert Sans', 'Schibsted Grotesk', 'Reddit Sans', 'Geist', 'Atkinson Hyperlegible'];
const sansTexto = (f) => { const m = METRICAS[f]; return !!m && m.clase === 'sans' && !/condensada|expresiva/.test(m.sub || '') && (m.xh || 0.5) >= 0.47; };
export function fuenteUI(par = {}) {
  if (sansTexto(par.cuerpo)) return par.cuerpo;
  if (sansTexto(par.titulos) || ['Gabarito', 'Bricolage Grotesque'].includes(par.titulos)) return par.titulos;
  const fam = METRICAS[par.titulos]?.familia;
  return UI_WEB.find((f) => fam && METRICAS[f]?.familia === fam) || UI_WEB[0];
}

export function cssTipografia(par = {}, estilo = 'calido') {
  const e = escalaTipografica(estilo, par);
  const T = METRICAS[par.titulos] || {}, C = METRICAS[par.cuerpo] || {};
  // Diferencia de altura x > 0.06: se reduce a la mitad con font-size-adjust (sin deformar el carácter del título).
  const ajuste = T.xh && C.xh && Math.abs(T.xh - C.xh) > 0.06 ? `font-size-adjust:${r3((T.xh + C.xh) / 2)};` : '';
  return `
/* Regla dura tipografía v1 */
body{font-size:${e.cuerpo};line-height:${e.interlineado.cuerpo};font-kerning:normal;text-rendering:optimizeLegibility}
h1{font-size:${e.h1};line-height:${e.interlineado.h1};letter-spacing:${e.tracking.h1};${ajuste}}
h2{font-size:${e.h2};line-height:${e.interlineado.h2};letter-spacing:${e.tracking.h2};${ajuste}}
h3{line-height:${e.interlineado.h3}}
p,li,blockquote,dd{text-wrap:pretty}p{max-width:${e.medida}}
.precio,em,.cat span,summary span,[class*="precio"],td{font-variant-numeric:tabular-nums lining-nums}
small,.hint{font-size:max(13px,${e.chico})}
/* Proporción del texto (10-nov-2026): ningún texto de lectura por debajo del 90% del cuerpo; títulos de tarjeta en paso 1.
   Los selectores van con body para ganarle a los tamaños fijos en px de cada plantilla. */
body .paq-det span,body .paq-det ul.inc,body .paq ul.inc,body .paq li span,body .paq-op,body .opc .op-d,body .info,body .cred,body .datos p,body .paq li b,body .opc .op-n,body .sl-marco .sl-a{font-size:${e.secundario}}
body .paq-cab h3,body .paq-cab h4,body .paq h3,body .datos b,body .datos strong{font-size:${e.h3}}
body .sub{font-size:${fluido(17, 22)}}
/* Interfaz con fuente sans de pantalla (regla dura 10-nov-2026) */
body nav a,body .barra a,body .menu a,body .menu-btn,body .btn,body button,body .sl-btn,body .wa,body .kicker,body label,body input,body select,body textarea,body .cifras li,body .chip{font-family:"${fuenteUI(par)}",system-ui,-apple-system,"Segoe UI",sans-serif!important}
`;
}

/* ============================== COLOR ============================== */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const norm = (h) => {
  let s = String(h || '').trim(); if (!s.startsWith('#')) s = `#${s}`;
  if (/^#[0-9a-f]{3}$/i.test(s)) s = `#${[...s.slice(1)].map((x) => x + x).join('')}`;
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : null;
};
const hexARgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgbAHex = (r, g, b) => `#${[r, g, b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** hex → {l, c, h} en OKLCH (Ottosson). */
export function oklch(hex) {
  const [r, g, b] = hexARgb(norm(hex)).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}
function oklchARgb({ l, c, h }) {
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
  const L_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * L_ - 3.3077115913 * M_ + 0.2309699292 * S_,
    -1.2684380046 * L_ + 2.6097574011 * M_ - 0.3413193965 * S_,
    -0.0041960863 * L_ - 0.7034186147 * M_ + 1.707614701 * S_,
  ];
}
/** {l,c,h} → hex; si se sale de sRGB reduce croma (conserva tono y luminosidad). */
export function aHex({ l, c, h }) {
  l = clamp01(l);
  let cc = c, rgb = oklchARgb({ l, c: cc, h });
  for (let i = 0; i < 40 && rgb.some((v) => v < -0.0005 || v > 1.0005); i++) { cc *= 0.92; rgb = oklchARgb({ l, c: cc, h }); }
  return rgbAHex(...rgb.map(gam));
}

const lumRel = (hex) => { const [r, g, b] = hexARgb(norm(hex)).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** Contraste WCAG 2.2 (norma vigente). */
export const wcag = (a, b) => { const x = lumRel(a), y = lumRel(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** APCA-W3 0.0.98G-4g: Lc del texto sobre el fondo (valor absoluto). */
export function apca(texto, fondo) {
  const Y = (hex) => { const [r, g, b] = hexARgb(norm(hex)).map((v) => v ** 2.4); let y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b; if (y < 0.022) y += (0.022 - y) ** 1.414; return y; };
  const yt = Y(texto), yb = Y(fondo);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  let s;
  if (yb > yt) { s = (yb ** 0.56 - yt ** 0.57) * 1.14; s = s < 0.1 ? 0 : s - 0.027; } else { s = (yb ** 0.65 - yt ** 0.62) * 1.14; s = s > -0.1 ? 0 : s + 0.027; }
  return Math.abs(s * 100);
}

// Umbrales por uso. WCAG 2.2 es obligatorio; APCA se exige además (Lc 75 cuerpo, 60 texto secundario/botones, 45 títulos grandes).
export const UMBRALES = {
  cuerpo: { wcag: 4.5, lc: 75 },
  secundario: { wcag: 4.5, lc: 60 },
  boton: { wcag: 4.5, lc: 60 },
  titulo_grande: { wcag: 3, lc: 45 },
  componente: { wcag: 3, lc: 30 }, // bordes de campos, íconos con significado, foco (WCAG 1.4.11)
};
export const cumple = (fg, bg, uso = 'cuerpo') => { const u = UMBRALES[uso]; return wcag(fg, bg) >= u.wcag && apca(fg, bg) >= u.lc; };

/**
 * Ajusta SOLO la luminosidad del color (conserva tono y croma: el color sigue siendo "el del cliente")
 * hasta cumplir el uso sobre el fondo. Se aleja del fondo: más oscuro sobre claro, más claro sobre oscuro.
 */
export function ajustarContraste(fg, bg, uso = 'cuerpo') {
  fg = norm(fg); bg = norm(bg);
  if (!fg || !bg || cumple(fg, bg, uso)) return fg;
  const o = oklch(fg), dir = oklch(bg).l > 0.6 ? -1 : 1;
  for (let l = o.l, i = 0; i < 100; i++) {
    l += dir * 0.01;
    const c = aHex({ ...o, l });
    if (cumple(c, bg, uso)) return c;
    if (l <= 0 || l >= 1) break;
  }
  return dir < 0 ? '#000000' : '#FFFFFF';
}
/** Texto sobre un color sólido: blanco o la tinta, el que cumpla mejor; si ninguno, se ajusta el sólido. */
export function textoSobre(solido, tinta = '#111111', uso = 'boton') {
  const op = [norm('#FFFFFF'), norm(tinta)].sort((a, b) => apca(b, solido) - apca(a, solido));
  const ok = op.find((t) => cumple(t, solido, uso));
  if (ok) return { texto: ok, solido };
  const t = op[0], o = oklch(solido), dir = t === '#FFFFFF' ? -1 : 1;
  for (let l = o.l, i = 0; i < 100; i++) { l += dir * 0.01; const s = aHex({ ...o, l }); if (cumple(t, s, uso)) return { texto: t, solido: s }; }
  return { texto: t, solido };
}

/** Neutro teñido con el tono de la marca (fondo 60 %): croma muy bajo, nunca gris muerto ni color saturado. */
export const neutroTenido = (marca, l, c = 0.012) => aHex({ l, c, h: oklch(marca).h });

// Relación de tono del acento según el estilo (cuando el cliente dio un solo color). Grados en OKLCH.
const ARMONIA = { elegante: 'analogo', lujo: 'analogo', minimalista: 'monocromatico', tradicional: 'analogo', calido: 'analogo', fresco: 'complementario-dividido', divertido: 'complementario-dividido', tecnologico: 'complementario' };
/** Acento armónico con la marca: mismo peso perceptual (L y C cercanos), tono según el estilo. */
export function acentoArmonico(marca, estilo = 'calido', semilla = 0) {
  const o = oklch(marca), tipo = ARMONIA[estilo] || 'analogo';
  const giro = { analogo: semilla % 2 ? 30 : -30, monocromatico: 0, complementario: 180, 'complementario-dividido': semilla % 2 ? 150 : 210 }[tipo];
  const l = tipo === 'monocromatico' ? (o.l > 0.55 ? o.l - 0.25 : o.l + 0.25) : o.l;
  return { hex: aHex({ l, c: Math.max(o.c, 0.08), h: (o.h + giro + 360) % 360 }), armonia: tipo };
}

/** Busca la luminosidad más cercana a la original (mismo tono y croma) que cumpla `ok`; null si no existe. */
export function buscarL(hex, ok) {
  const o = oklch(hex);
  const ls = Array.from({ length: 201 }, (_, i) => i / 200).sort((a, b) => Math.abs(a - o.l) - Math.abs(b - o.l));
  for (const l of ls) { const c = Math.abs(l - o.l) < 0.0025 ? norm(hex) : aHex({ ...o, l }); if (ok(c)) return c; }
  return null;
}
const TINTAS = ['#FFFFFF', '#111111'];

/**
 * Corrige una paleta de propuesta {bg, fg, primary, onPrimary, accent?, soft?, muted?, card?} con la regla dura.
 * Resuelve todas las restricciones a la vez moviendo solo la luminosidad (tono y croma del cliente se conservan):
 * - fondo claro con croma ≤ 0.04 (oscuro ≤ 0.08): el color saturado nunca cubre el 60 %;
 * - texto principal: cuerpo (WCAG 4.5 + Lc 75) sobre fondo y tarjeta; si el fondo no lo permite (tono medio), se mueve el fondo;
 * - texto secundario, acento y precios usados como texto: secundario (WCAG 4.5 + Lc 60) sobre fondo y tarjeta;
 * - botón: sólido + texto con WCAG 4.5 + Lc 60.
 */
export function corregirPaleta(pal) {
  const p = { ...pal }, cambios = [];
  const fija = (k, v, por) => { if (v && norm(v) !== norm(p[k])) { cambios.push(`${k}: ${p[k]} → ${v} (${por})`); p[k] = v; } };
  // Modo según la intención de la plantilla: texto más claro que el fondo = modo oscuro.
  const ob = oklch(p.bg), oscuro = oklch(p.fg).l > ob.l, cMax = oscuro ? 0.08 : 0.04;
  // Fondo 60 %: claro (L ≥ 0.9) u oscuro (L ≤ 0.3), nunca tono medio; croma baja; mismo tono.
  const lBg = oscuro ? Math.min(ob.l, 0.3) : Math.max(ob.l, 0.9);
  if (ob.c > cMax || lBg !== ob.l) fija('bg', aHex({ ...ob, l: lBg, c: Math.min(ob.c, cMax) }), oscuro ? 'fondo oscuro: L ≤ 0.3, croma ≤ 0.08' : 'fondo claro: L ≥ 0.9, croma ≤ 0.04');
  const nb = oklch(p.bg);
  for (const sup of ['card', 'muted']) if (p[sup]) {
    const o = oklch(p[sup]);
    const l = oscuro ? Math.min(Math.max(o.l, nb.l + 0.04), nb.l + 0.1) : Math.max(o.l, 0.86);
    if (o.c > cMax + 0.03 || Math.abs(l - o.l) > 0.005) fija(sup, aHex({ ...o, l, c: Math.min(o.c, cMax + 0.03) }), 'superficie 30 %: cerca del fondo, croma baja');
  }
  const sobreTodo = (c, uso, ...fondos) => fondos.every((f) => !f || cumple(c, f, uso));
  // 1. Texto principal.
  let fg = buscarL(p.fg, (c) => sobreTodo(c, 'cuerpo', p.bg, p.card));
  if (!fg && p.card) { const k = buscarL(p.card, (kk) => buscarL(p.fg, (c) => sobreTodo(c, 'cuerpo', p.bg, kk))); if (k) { fija('card', k, 'tarjeta sin contraste posible'); fg = buscarL(p.fg, (c) => sobreTodo(c, 'cuerpo', p.bg, p.card)); } }
  if (!fg) {
    const b = buscarL(p.bg, (bb) => buscarL(p.fg, (c) => cumple(c, bb, 'cuerpo')) !== null);
    fija('bg', b, 'fondo de tono medio: no admite texto legible');
    if (p.card && !buscarL(p.fg, (c) => sobreTodo(c, 'cuerpo', p.bg, p.card))) fija('card', aHex({ ...oklch(p.card), l: oklch(p.bg).l + (oklch(p.bg).l < 0.5 ? 0.06 : 0.02) }), 'tarjeta acompaña al fondo');
    fg = buscarL(p.fg, (c) => sobreTodo(c, 'cuerpo', p.bg, p.card));
  }
  fija('fg', fg, 'texto principal');
  // 2. Texto secundario y acento.
  if (p.soft) fija('soft', buscarL(p.soft, (c) => sobreTodo(c, 'secundario', p.bg, p.card)), 'texto secundario');
  if (p.accent && p.accentUso === 'relleno') {
    // Acento como relleno (botón, viñetas, pasos, líneas; 8-nov-2026): sólido con texto legible encima.
    // Nunca se usa como texto ni como único indicador (el botón se identifica por su texto), así conserva su viveza.
    const tAcc = [...new Set([...TINTAS, norm(p.fg)])];
    fija('accent', buscarL(p.accent, (c) => tAcc.some((t) => cumple(t, c, 'boton'))), 'acento de relleno');
    fija('onAccent', tAcc.filter((t) => cumple(t, p.accent, 'boton')).sort((a, b) => apca(b, p.accent) - apca(a, p.accent))[0], 'texto sobre el acento');
  } else if (p.accent) fija('accent', buscarL(p.accent, (c) => sobreTodo(c, 'secundario', p.bg, p.card)), 'acento usado como texto');
  // 3. Color de marca: botón (sólido + texto) y precios/enlaces (texto sobre fondo y tarjeta).
  const tintas = [...new Set([...TINTAS, norm(p.fg)])];
  const botonOk = (c) => tintas.some((t) => cumple(t, c, 'boton'));
  const prim = buscarL(p.primary, (c) => botonOk(c) && sobreTodo(c, 'secundario', p.bg, p.card)) || buscarL(p.primary, botonOk);
  fija('primary', prim, 'botón y precios');
  fija('onPrimary', tintas.filter((t) => cumple(t, p.primary, 'boton')).sort((a, b) => apca(b, p.primary) - apca(a, p.primary))[0], 'texto del botón');
  return { paleta: p, cambios };
}

/** Auditoría de una paleta final: errores que impiden publicar. */
export function auditarPaleta(p) {
  const e = [];
  const chk = (fg, bg, uso, nombre) => { if (fg && bg && !cumple(fg, bg, uso)) e.push(`${nombre}: WCAG ${wcag(fg, bg).toFixed(2)} / Lc ${apca(fg, bg).toFixed(0)} < ${UMBRALES[uso].wcag} / ${UMBRALES[uso].lc}`); };
  chk(p.fg, p.bg, 'cuerpo', 'texto/fondo'); chk(p.fg, p.card, 'cuerpo', 'texto/tarjeta');
  chk(p.soft, p.bg, 'secundario', 'secundario/fondo'); chk(p.onPrimary, p.primary, 'boton', 'botón');
  if (p.accentUso === 'relleno') { chk(p.onAccent, p.accent, 'boton', 'texto/acento'); }
  else chk(p.accent, p.bg, 'secundario', 'acento/fondo');
  chk(p.primary, p.bg, 'secundario', 'precio/fondo'); chk(p.onBtn, p.btn, 'boton', 'botón de acento');
  return e;
}

/** Texto de la regla para diseno_reglas (lo leen el generador y el prompt). */
export const REGLA_TIPO_COLOR = {
  descripcion: 'REGLA DURA (4-nov-2026): combinación de tipografías y colores. Se aplica en código (generador/tipo_color.js) a cada propuesta y sitio; nada se publica si falla.',
  tipografia: [
    'Máximo 2 familias por sitio (títulos + cuerpo); la tercera solo si es monoespaciada para datos y la pide el contenido',
    'Contraste de rol con armonía de proporción: clase distinta (serif + sans, o decorativa + texto) o la misma superfamilia; nunca dos letras de la misma subclase (dos grotescas, dos geométricas)',
    'Cuerpo: letra de texto con 400 y ≥ 600, altura x ≥ 0.48 (sans) o ≥ 0.44 (serif); nunca decorativa, mono, condensada ni de un solo peso',
    'Alturas x de títulos y cuerpo con diferencia ≤ 0.06; si es mayor, se compensa con font-size-adjust',
    'Letras de exhibición (finas, un solo peso) solo a ≥ 32 px; letras solo-mayúsculas nunca en títulos largos',
    'Cuerpo 16→18 px fluido (serif 17→19), interlineado 1.55 (serif 1.6), medida 45–75 caracteres (objetivo 65ch)',
    'Escala modular fluida (clamp, 360–1240 px): ratio 1.2→1.25 en estilos sobrios, 1.25→1.333 elegante/divertido, 1.25→1.414 lujo',
    'Títulos: interlineado 1.05–1.15, tracking negativo leve (-0.02em) en grandes; versalitas o mayúsculas pequeñas con +0.06em',
    'Precios y cifras con números tabulares; text-wrap balance en títulos y pretty en párrafos',
    'Métricas medidas de cada fuente (no a ojo): toda familia nueva se mide antes de entrar al catálogo',
  ],
  color: [
    'Trabajar en OKLCH: tintes, sombras y acentos se derivan cambiando L y C con el mismo tono; nunca mezclas RGB para derivar estados',
    'Proporción 60-30-10 por roles: 60 % fondo neutro teñido con el tono de la marca (croma ≤ 0.04 claro, ≤ 0.08 oscuro), 30 % superficies y texto, 10 % color de marca en el botón principal, enlaces y lo clave',
    'Un solo color de marca + un acento + neutros; los colores de estado (éxito/error) solo para estados. Dos colores base hacen la web correcta; el acento (10 %) la hace memorable',
    'En 2 de las 6 propuestas (B y E) el acento es de contraste (temperatura opuesta, ≥ 90° de tono: cálido sobre frío) y va en el botón principal, viñetas, pasos y líneas; como relleno debe tener texto legible encima (WCAG 4.5 + Lc 60); nunca se usa como texto',
    'Acento cuando el cliente da un solo color: análogo ±30° (elegante, lujo, cálido, tradicional), monocromático (minimalista), complementario dividido 150°/210° (fresco, divertido), complementario (tecnológico), con el mismo peso perceptual',
    'El tono del cliente es intocable; para cumplir contraste solo se mueve la luminosidad (y la croma si sale de gamut)',
    'Contraste obligatorio WCAG 2.2: 4.5:1 texto, 3:1 títulos grandes y componentes (bordes de campos, foco, íconos con significado)',
    'Además APCA: Lc ≥ 75 cuerpo, ≥ 60 texto secundario y botones, ≥ 45 títulos ≥ 32 px; APCA es apoyo, no sustituye a WCAG 2.2 (en 2026 sigue exploratorio)',
    'Roles por paso al estilo Radix: fondos claros para superficies, pasos medios para bordes, sólido de máxima croma para botones, pasos oscuros para texto',
    'Nunca negro puro ni blanco puro como fondo de modo oscuro; el modo oscuro necesita ~Lc +5 sobre el claro',
    'Una sola superficie grande de color pleno por página (la decisión audaz); el resto, neutros',
  ],
  bibliografia: [
    'Robert Bringhurst, The Elements of Typographic Style (v4.3)',
    'Ellen Lupton, Thinking with Type (3.ª ed.)',
    'Matthew Butterick, Practical Typography (practicaltypography.com)',
    'Google Fonts Knowledge: Pairing typefaces, x-height, superfamilias (Elliot Jay Stocks)',
    'Tim Brown, Flexible Typesetting; Utopia.fyi (escalas fluidas, Trys Mudford y James Gilyead)',
    'Josef Albers, Interaction of Color',
    'W3C WCAG 2.2 (1.4.3, 1.4.6, 1.4.11) y APCA (Andrew Somers, Myndex)',
    'CSS Color Module Level 4 / OKLCH (Björn Ottosson; Evil Martians)',
    'Radix Colors: Understanding the scale',
  ],
};

/**
 * Piso de tamaño de letra (10-nov-2026, pedido de Sebastián): ningún texto del sitio por debajo de 20 px
 * (30% arriba de los 15 px del menú, que eran los textos chicos de la propuesta A). Se aplica al HTML final de propuestas
 * y sitios vivos: cada font-size de las hojas de estilo pasa a max(20px, valor), así lo más grande no cambia y lo chico
 * sube. Excepciones: el contador del slider (1/5) y la etiqueta "Propuesta X" (no son texto del sitio).
 */
export const PISO_TEXTO_PX = 20;
const EXCEPCIONES_PISO = /\.sl-pos|\.etq\b|\.sl-b\b|svg|::?marker|\.ico\b/;
export function conPisoTexto(html, piso = PISO_TEXTO_PX) {
  const ajusta = (decl) => decl.replace(/font-size\s*:\s*([^;}!]+)(!important)?/gi, (m, v, imp) => {
    const val = v.trim();
    if (/^(0|0px|inherit|initial|unset|revert)$/i.test(val) || new RegExp(`^max\\(${piso}px`).test(val)) return m;
    return `font-size:max(${piso}px, ${val})${imp || ''}`;
  });
  return String(html).replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (m, attrs, css) => {
    const nuevo = css.replace(/([^{}]+)\{([^{}]*)\}/g, (r, sel, decl) => (/font-size/i.test(decl) && !EXCEPCIONES_PISO.test(sel) && !/^\s*@/.test(sel) ? `${sel}{${ajusta(decl)}}` : r));
    return `<style${attrs}>${nuevo}</style>`;
  });
}
