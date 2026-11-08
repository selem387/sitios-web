// Estilo de referencia: cuando el cliente manda una página que le gusta, las 6 propuestas nuevas son VARIACIONES de
// ese estilo (no los 6 acomodos de siempre). Se guarda en brief.marca.direccion_ref para que el sitio en vivo se arme
// igual que la propuesta elegida.
//
// 5 estilos base (8-nov-2026) + ajuste fino con el estudio de la referencia (servicio render):
//   radio de botones, peso y mayúsculas de títulos, aire entre secciones, altura de portada y color de acento.
// Letras siempre del catálogo (poco comunes) y paletas que pasan la regla de color. Nunca copia textos, fotos ni logos.

import { corregirPaleta, auditarPaleta } from './tipo_color.js';
import { contraste, mezclar } from '../entrevista/tema.js';

const P = (bg, fg, primary, onPrimary, muted, card, soft, border) => ({ bg, fg, primary, onPrimary, muted, card, soft, border, tinte: soft, banda: primary });

// Paletas del estilo original (se conservan por nombre para direcciones ya guardadas).
const PAL = {
  marfil: P('#F7F3EE', '#2A2521', '#7A6557', '#FFFFFF', '#6B625B', '#FFFFFF', '#EFE8E0', '#E2D9CF'),
  arena: P('#EFE7DD', '#2B2420', '#6F5B4E', '#FFFFFF', '#675C54', '#F8F3ED', '#E6DCD0', '#D9CCBE'),
  noche: P('#1E1B19', '#F3EEE8', '#D2BFAE', '#1E1B19', '#BBB1A8', '#262220', '#2A2623', '#3A3430'),
  blanco: P('#FFFFFF', '#232120', '#86705F', '#FFFFFF', '#66605B', '#FAF8F5', '#F4F0EB', '#E7E1DA'),
  rubor: P('#F8F1EE', '#382C29', '#8E6B5E', '#FFFFFF', '#6E5F5A', '#FFFFFF', '#F0E5E0', '#E5D6CF'),
  piedra: P('#F2F0EC', '#262524', '#6E675D', '#FFFFFF', '#625E58', '#FBFAF8', '#E8E5DF', '#DCD8D0'),
};

const BASE_SOMBRA = 'body.ref .h-portada h1,body.ref .h-portada .sub,body.ref .h-portada .kicker,body.ref .h-portada p{text-shadow:0 1px 2px rgba(0,0,0,.45),0 2px 22px rgba(0,0,0,.55)}';

export const PRESETS = {
  editorial_suave: {
    descripcion: 'fotografía de autor, moda, bodas, spa: fotos grandes protagonistas, serif delgada con cursiva, menú fino en mayúsculas, neutros cálidos, mucho aire',
    layouts: ['portada', 'portada', 'editorial', 'portada', 'mosaico', 'carta'],
    nombres: ['Retrato a pantalla completa', 'Nocturna', 'Editorial delicada', 'Galería serena', 'Mosaico de sesiones', 'Carta minimal'],
    pares: [['Instrument Serif', 'Instrument Sans'], ['Bodoni Moda', 'Albert Sans'], ['Newsreader', 'Golos Text'], ['Spectral', 'Hanken Grotesk'], ['Instrument Serif', 'Instrument Sans'], ['Bodoni Moda', 'Hanken Grotesk']],
    paletas: [PAL.marfil, PAL.noche, PAL.arena, PAL.blanco, PAL.rubor, PAL.piedra],
    cursiva: true, resalte: 'cursiva', delgada: true, radio: 0, peso: 300, aire: 'aireada', heroAlto: true,
    css: `body.ref .barra nav a{font-family:var(--fc);font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:400}
body.ref .kicker{font-size:11px;letter-spacing:.26em;text-transform:uppercase;font-weight:400}
body.ref .sub{font-weight:300;max-width:46ch}
body.ref .btn{letter-spacing:.18em;text-transform:uppercase;font-size:12px;font-weight:400;padding:15px 28px;background:transparent;border:1px solid currentColor;color:inherit;box-shadow:none}
body.ref .btn:hover{background:var(--fg);color:var(--bg)}
body.ref .h-portada .btn:hover{background:#fff;color:#1e1b19}
body.ref footer{letter-spacing:.14em;text-transform:uppercase;font-size:11px}`,
  },
  moderno_limpio: {
    descripcion: 'consultorios, despachos, tecnología, servicios profesionales: sans geométrica firme, mucho blanco, bloques ordenados, un acento sobrio',
    layouts: ['portada', 'editorial', 'carta', 'mosaico', 'portada', 'editorial'],
    nombres: ['Portada limpia', 'Columnas claras', 'Carta directa', 'Rejilla de trabajos', 'Foto y dato', 'Editorial moderna'],
    pares: [['Geist', 'Geist'], ['Schibsted Grotesk', 'Spectral'], ['Familjen Grotesk', 'Newsreader'], ['Albert Sans', 'Petrona'], ['Unbounded', 'Geist'], ['Newsreader', 'Hanken Grotesk']],
    paletas: [
      P('#FFFFFF', '#14171C', '#1F4FD8', '#FFFFFF', '#5A6270', '#F6F7F9', '#EEF1F5', '#E2E6EC'),
      P('#F7F8F6', '#161A17', '#2F6B4F', '#FFFFFF', '#59615B', '#FFFFFF', '#ECEFEB', '#DDE2DC'),
      P('#FFFFFF', '#111111', '#111111', '#FFFFFF', '#5F5F5F', '#F5F5F5', '#EFEFEF', '#E3E3E3'),
      P('#F4F6FA', '#121826', '#3B4CCA', '#FFFFFF', '#566074', '#FFFFFF', '#E9EDF5', '#D9DFEB'),
      P('#0F1216', '#EEF1F5', '#7AA2FF', '#0F1216', '#A9B1BE', '#171B21', '#1C2129', '#2A303A'),
      P('#FBFBF9', '#1A1A18', '#C2410C', '#FFFFFF', '#5E5E58', '#FFFFFF', '#F1F0EC', '#E4E2DC'),
    ],
    cursiva: false, delgada: false, radio: 8, peso: 600, aire: 'media', heroAlto: false,
    css: `body.ref h1,body.ref h2{letter-spacing:-.025em}
body.ref .barra nav a{font-size:14px;font-weight:500}
body.ref .kicker{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:var(--p)}
body.ref .btn{font-weight:600;padding:14px 24px;background:var(--p);color:var(--on);border:0}
body.ref .galeria img,body.ref .mos img{border-radius:12px}`,
  },
  colorido: {
    descripcion: 'cafeterías, repostería, niños, eventos, marcas jóvenes: letras con personalidad, colores vivos, botones redondos, energía',
    layouts: ['portada', 'mosaico', 'editorial', 'carta', 'portada', 'mosaico'],
    nombres: ['Portada con color', 'Mosaico alegre', 'Editorial vibrante', 'Carta con chispa', 'Foto y color', 'Collage'],
    pares: [['Bricolage Grotesque', 'Petrona'], ['Gabarito', 'Spectral'], ['Syne', 'Instrument Sans'], ['Unbounded', 'Golos Text'], ['Familjen Grotesk', 'Spectral'], ['Darker Grotesque', 'Hanken Grotesk']],
    paletas: [
      P('#FFF6EC', '#2A1A12', '#C2410C', '#FFFFFF', '#6B5546', '#FFFFFF', '#FFE9D2', '#F6D6B8'),
      P('#F4F1FF', '#1B1640', '#4338CA', '#FFFFFF', '#5B5680', '#FFFFFF', '#E7E2FF', '#D6CEFF'),
      P('#F0FAF5', '#10291E', '#0F7A52', '#FFFFFF', '#4E6B5E', '#FFFFFF', '#DDF3E8', '#C6E9D7'),
      P('#FFF0F6', '#3A0E22', '#BE185D', '#FFFFFF', '#7A4A5E', '#FFFFFF', '#FFE0EC', '#F8C9DB'),
      P('#FFF9E0', '#2A2306', '#1F1F1F', '#FFE45C', '#5E5636', '#FFFFFF', '#FFF0A8', '#EEDF8A'),
      P('#EEFBFB', '#0B2A2D', '#0E7490', '#FFFFFF', '#4B6B6E', '#FFFFFF', '#D5F3F4', '#BDE8EA'),
    ],
    cursiva: false, delgada: false, radio: 999, peso: 700, aire: 'media', heroAlto: false,
    css: `body.ref h1,body.ref h2{letter-spacing:-.02em}
body.ref .barra nav a{font-size:15px;font-weight:600}
body.ref .kicker{font-size:13px;font-weight:700;color:var(--p)}
body.ref .btn{font-weight:700;padding:15px 28px;background:var(--p);color:var(--on);border:0;box-shadow:0 6px 0 rgba(0,0,0,.12)}
body.ref .galeria img,body.ref .mos img{border-radius:20px}
body.ref .paq{border-radius:20px}
body.ref .kicker{display:inline-block;background:var(--p);color:var(--on)!important;padding:6px 14px;border-radius:999px;text-shadow:none}
body.ref main>section.sec:nth-of-type(even){background:var(--soft)}
body.ref h1 mark,body.ref h2 mark{background:linear-gradient(transparent 58%,color-mix(in srgb,var(--p) 38%,transparent) 58%);color:inherit;padding:0 .08em}
body.ref .h-portada h1 mark{background:linear-gradient(transparent 62%,color-mix(in srgb,var(--p) 75%,transparent) 62%)}`,
    resalte: 'marca',
  },
  calido_rustico: {
    descripcion: 'restaurantes, cafés de especialidad, panaderías, artesanía, hospedaje: serif cálida, tonos tierra, texturas suaves, cercanía',
    layouts: ['portada', 'editorial', 'mosaico', 'carta', 'portada', 'editorial'],
    nombres: ['Mesa a pantalla completa', 'Editorial de casa', 'Mosaico del lugar', 'Carta cálida', 'Portada de temporada', 'Historia del oficio'],
    pares: [['Young Serif', 'Instrument Sans'], ['Petrona', 'Schibsted Grotesk'], ['Gabarito', 'Petrona'], ['Young Serif', 'Golos Text'], ['Spectral', 'Hanken Grotesk'], ['Bricolage Grotesque', 'Newsreader']],
    paletas: [
      P('#F6EEE4', '#2B1D14', '#9A4A2B', '#FFFFFF', '#6E5747', '#FFFAF4', '#EEDFCF', '#E2CFBB'),
      P('#F3F0E6', '#22251A', '#56632F', '#FFFFFF', '#5E6150', '#FBF9F2', '#E7E3D3', '#D9D4BF'),
      P('#F7F0E8', '#2A1C14', '#6B4430', '#FFFFFF', '#6C5A4E', '#FFFBF6', '#EDE1D3', '#E0D0BE'),
      P('#2A201B', '#F5EBDD', '#D9A066', '#2A201B', '#CDBBA6', '#332822', '#3A2E27', '#4A3C33'),
      P('#FBF5E6', '#2A2210', '#7A5C14', '#FFFFFF', '#6A5E44', '#FFFDF6', '#F2E7C8', '#E6D8AF'),
      P('#FAF3EE', '#2C1814', '#933B2C', '#FFFFFF', '#6F5650', '#FFFFFF', '#F1E2DA', '#E5CFC4'),
    ],
    cursiva: false, delgada: false, radio: 6, peso: 400, aire: 'media', heroAlto: true,
    css: `body.ref .barra nav a{font-size:14px;font-weight:500;letter-spacing:.02em}
body.ref .kicker{font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--p)}
body.ref .btn{font-weight:600;padding:14px 26px;background:var(--p);color:var(--on);border:0}
body.ref .galeria img,body.ref .mos img{border-radius:6px}`,
  },
  lujo_oscuro: {
    descripcion: 'joyería, hoteles boutique, autos, bienes raíces de lujo, alta cocina: fondo oscuro, dorados discretos, serif de alto contraste, mayúsculas espaciadas',
    layouts: ['portada', 'portada', 'editorial', 'carta', 'mosaico', 'portada'],
    nombres: ['Noche dorada', 'Portada de gala', 'Editorial de lujo', 'Carta reservada', 'Galería privada', 'Contraste claro'],
    pares: [['Bodoni Moda', 'Hanken Grotesk'], ['Gloock', 'Instrument Sans'], ['Marcellus', 'Golos Text'], ['Instrument Serif', 'Schibsted Grotesk'], ['Newsreader', 'Onest'], ['Bodoni Moda', 'Albert Sans']],
    paletas: [
      P('#0F0E0D', '#F2EDE4', '#C8A96A', '#0F0E0D', '#B5AC9E', '#171514', '#1C1A18', '#2C2925'),
      P('#111418', '#EEF0F2', '#B9A27A', '#111418', '#A9AFB6', '#181C21', '#1D2228', '#2C323A'),
      P('#15110F', '#F3ECE3', '#D4B483', '#15110F', '#BDB2A5', '#1D1815', '#231D19', '#352C26'),
      P('#0E1110', '#ECEFEC', '#BFA36F', '#0E1110', '#A7AEA9', '#161A18', '#1B201E', '#2A302D'),
      P('#1A1717', '#F4EEE8', '#E0C9A6', '#1A1717', '#BDB3AB', '#221E1E', '#282323', '#3A3333'),
      P('#F5F1EA', '#141210', '#8C6D3F', '#FFFFFF', '#5F5850', '#FFFFFF', '#ECE6DC', '#DED6C9'),
    ],
    cursiva: true, resalte: 'cursiva', delgada: false, radio: 0, peso: 400, aire: 'aireada', heroAlto: true, mayus: false,
    css: `body.ref .barra nav a{font-size:11px;letter-spacing:.24em;text-transform:uppercase;font-weight:400}
body.ref .kicker{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--p)}
body.ref .btn{letter-spacing:.2em;text-transform:uppercase;font-size:12px;font-weight:500;padding:15px 30px;background:transparent;border:1px solid var(--p);color:var(--p)}
body.ref .btn:hover{background:var(--p);color:var(--on)}
body.ref footer{letter-spacing:.16em;text-transform:uppercase;font-size:11px}`,
  },
};

export const LISTA_PRESETS = Object.entries(PRESETS).map(([k, v]) => `${k}: ${v.descripcion}`).join('\n');

/** Color de acento de la referencia (el más saturado que no sea casi blanco/negro). */
function acentoDe(estudio) {
  const hex = [...(estudio?.colores?.acentos || []), ...(estudio?.colores?.fondos_secciones || [])].filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const sat = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1)); };
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return (r + g + b) / 765; };
  return hex.filter((h) => lum(h) > 0.12 && lum(h) < 0.88 && sat(h) > 0.08).sort((a, b) => sat(b) - sat(a))[0] || null;
}

/** Aplica el acento de la referencia a una paleta si cumple contraste y la regla de color; si no, la deja igual. */
function conAcento(p, acento) {
  if (!acento) return p;
  const oscuro = contraste('#FFFFFF', p.bg) > contraste('#000000', p.bg);
  // Se conserva el tono de la referencia y se oscurece (o aclara en fondos oscuros) lo mínimo para que se lea.
  for (let t = 0; t <= 0.6; t += 0.05) {
    const c = t ? mezclar(acento, oscuro ? '#FFFFFF' : '#000000', t) : acento;
    if (contraste(c, p.bg) < 3) continue;
    const onP = contraste('#FFFFFF', c) >= 4.5 ? '#FFFFFF' : (contraste('#111111', c) >= 4.5 ? '#111111' : null);
    if (!onP) continue;
    const q = { ...p, primary: c, onPrimary: onP, banda: c };
    if (!auditarPaleta(corregirPaleta(q).paleta).length) return q;
  }
  return p;
}

/**
 * Dirección completa: estilo base + ajustes del estudio de la referencia.
 * @param {string} preset clave de PRESETS
 * @param {object} estudio resultado de estudiarReferencias (primer elemento sin error)
 */
export function construirDireccion(preset = 'editorial_suave', estudio = null) {
  const b = PRESETS[preset] || PRESETS.editorial_suave;
  const t = estudio?.tipografia || {};
  const pesoRef = parseInt(t.h1_peso, 10);
  const ajustes = {
    radio: Number.isFinite(estudio?.forma?.radio_boton_px) ? Math.min(999, Math.max(0, estudio.forma.radio_boton_px)) : b.radio,
    peso: Number.isFinite(pesoRef) && pesoRef >= 300 && pesoRef <= 800 ? Math.round(pesoRef / 100) * 100 : b.peso,
    mayus: t.mayusculas_en_titulos === true,
    aire: estudio?.densidad === 'aireada' ? 'aireada' : estudio?.densidad === 'compacta' && b.aire !== 'aireada' ? 'compacta' : b.aire,
    heroAlto: Number.isFinite(estudio?.hero?.altura_vh) ? estudio.hero.altura_vh >= 85 : b.heroAlto,
  };
  // El acento de la referencia entra en las 3 primeras (las otras 3 conservan el del estilo para dar variedad).
  const acento = acentoDe(estudio);
  // Si la referencia es oscura, las opciones oscuras van primero.
  const paletas = b.paletas.map((p, i) => (i < 3 ? conAcento(p, acento) : p));
  return {
    tipo: preset, layouts: [...b.layouts], nombres: [...b.nombres],
    pares: b.pares.map(([titulos, cuerpo]) => ({ titulos, cuerpo })),
    paletas, ajustes, acento: acento || null, modo: estudio?.modo || null,
  };
}

/** Compatibilidad: dirección editorial sin estudio. */
export const direccionEditorialSuave = () => construirDireccion('editorial_suave', null);

export const esDireccionRef = (d) => !!(d && PRESETS[d.tipo] && Array.isArray(d.layouts) && d.layouts.length === 6);

export function paletaRef(d, i) {
  const p = d.paletas?.[i];
  const base = typeof p === 'string' ? (PAL[p] || PAL.marfil) : (p || PAL.marfil);
  return { ...corregirPaleta(base).paleta, familia: d.acento ? 'Colores de tu referencia' : 'Paleta del estilo de tu referencia', origen: 'referencia' };
}

function cssDe(d) {
  const b = PRESETS[d.tipo] || PRESETS.editorial_suave;
  const a = d.ajustes || { radio: b.radio, peso: b.peso, aire: b.aire, heroAlto: b.heroAlto };
  const pad = a.aire === 'aireada' ? 'clamp(72px,10vw,128px)' : a.aire === 'compacta' ? 'clamp(48px,6vw,72px)' : 'clamp(60px,8vw,100px)';
  return `
body.ref{letter-spacing:.003em}
body.ref h1,body.ref h2,body.ref h3{font-weight:${a.peso};letter-spacing:-.012em}
body.ref h1{font-size:clamp(40px,6vw,82px);line-height:1.04${a.mayus ? ';text-transform:uppercase;letter-spacing:.04em' : ''}}
body.ref h1 em,body.ref h2 em{font-style:italic;font-weight:${a.peso}}
body.ref h2{font-size:clamp(30px,3.8vw,52px);line-height:1.1}
body.ref .barra{border-bottom:0}
body.ref .btn{border-radius:${a.radio}px}
body.ref .sec{padding-top:${pad};padding-bottom:${pad}}
body.ref .galeria{gap:clamp(12px,2vw,26px)}
${a.radio === 0 ? 'body.ref .galeria img,body.ref .mos img,body.ref .paq,body.ref .arco,body.ref .ovalo,body.ref .marco{border-radius:0}' : ''}
${a.heroAlto ? 'body.ref .h-portada{min-height:100vh}' : ''}
${BASE_SOMBRA}
${b.css}`;
}

/** Cursiva en la segunda mitad del titular (solo estilo: el texto del cliente no cambia). */
function resaltarTitular(html, tag = 'em') {
  return html.replace(/<h1>([^<]{12,})<\/h1>/, (m, txt) => {
    const w = txt.split(' ');
    if (w.length < 4) return m;
    const k = Math.ceil(w.length * 0.55);
    return `<h1>${w.slice(0, k).join(' ')} <${tag}>${w.slice(k).join(' ')}</${tag}></h1>`;
  });
}

/** Aplica el estilo de referencia a la página armada (letras extra, CSS y clase del body). */
export function aplicarRef(html, par, d = { tipo: 'editorial_suave' }) {
  const b = PRESETS[d.tipo] || PRESETS.editorial_suave;
  const peso = d.ajustes?.peso ?? b.peso;
  // Cursiva y pesos que pide el estilo, cuando la letra los tiene (Google Fonts variables).
  const VARIABLES = new Set(['Newsreader', 'Spectral', 'Fraunces', 'Literata', 'Petrona', 'Bricolage Grotesque', 'Schibsted Grotesk', 'Familjen Grotesk', 'Albert Sans', 'Geist', 'Gabarito', 'Syne', 'Unbounded', 'Darker Grotesque']);
  const ITALICA = new Set(['Instrument Serif', 'Bodoni Moda', 'Newsreader', 'Spectral', 'Petrona', 'Albert Sans', 'Fraunces', 'Literata']);
  const nombre = encodeURIComponent(par.titulos).replace(/%20/g, '+');
  const pesos = [...new Set([400, peso])].sort((x, y) => x - y);
  const ital = ITALICA.has(par.titulos);
  const eje = VARIABLES.has(par.titulos)
    ? (ital ? `ital,wght@${[...pesos.map((w) => `0,${w}`), ...pesos.map((w) => `1,${w}`)].join(';')}` : `wght@${pesos.join(';')}`)
    : (ital ? 'ital@0;1' : null);
  const link = eje ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${nombre}:${eje}&display=swap">` : '';
  const conCursiva = b.resalte === 'cursiva' && ITALICA.has(par.titulos) ? resaltarTitular(html, 'em') : b.resalte === 'marca' ? resaltarTitular(html, 'mark') : html;
  return conCursiva
    .replace('</head>', () => `${link}<style id="ref">${cssDe(d)}</style></head>`)
    .replace(/<body class="([^"]*)">/, (m, c) => `<body class="${c} ref ref-${d.tipo}">`);
}
