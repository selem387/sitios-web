// Estilo de referencia (7-nov-2026): cuando el cliente manda una página que le gusta, las 6 propuestas nuevas son
// VARIACIONES de ese estilo (no los 6 acomodos de siempre). Se guarda en brief.marca.direccion_ref para que el
// sitio en vivo se arme igual que la propuesta elegida.
//
// "editorial_suave" (tipo fotografía de autor: fotos grandes protagonistas, serif delgada con cursiva,
// menú fino en mayúsculas, neutros cálidos y mucho aire). Nunca copia textos, fotos ni logos de la referencia.

import { corregirPaleta } from './tipo_color.js';

const PAL = {
  marfil: { bg: '#F7F3EE', fg: '#2A2521', primary: '#7A6557', onPrimary: '#FFFFFF', muted: '#6B625B', card: '#FFFFFF', soft: '#EFE8E0', border: '#E2D9CF', tinte: '#F1EAE2', banda: '#7A6557' },
  arena: { bg: '#EFE7DD', fg: '#2B2420', primary: '#6F5B4E', onPrimary: '#FFFFFF', muted: '#675C54', card: '#F8F3ED', soft: '#E6DCD0', border: '#D9CCBE', tinte: '#E9E0D5', banda: '#6F5B4E' },
  noche: { bg: '#1E1B19', fg: '#F3EEE8', primary: '#D2BFAE', onPrimary: '#1E1B19', muted: '#BBB1A8', card: '#262220', soft: '#2A2623', border: '#3A3430', tinte: '#2A2623', banda: '#D2BFAE' },
  blanco: { bg: '#FFFFFF', fg: '#232120', primary: '#86705F', onPrimary: '#FFFFFF', muted: '#66605B', card: '#FAF8F5', soft: '#F4F0EB', border: '#E7E1DA', tinte: '#F6F2ED', banda: '#86705F' },
  rubor: { bg: '#F8F1EE', fg: '#382C29', primary: '#8E6B5E', onPrimary: '#FFFFFF', muted: '#6E5F5A', card: '#FFFFFF', soft: '#F0E5E0', border: '#E5D6CF', tinte: '#F3E9E4', banda: '#8E6B5E' },
  piedra: { bg: '#F2F0EC', fg: '#262524', primary: '#6E675D', onPrimary: '#FFFFFF', muted: '#625E58', card: '#FBFAF8', soft: '#E8E5DF', border: '#DCD8D0', tinte: '#ECE9E3', banda: '#6E675D' },
};

/** Dirección "editorial suave": 6 variaciones (acomodo, letras con cursiva y paleta neutra cálida). */
export function direccionEditorialSuave() {
  return {
    tipo: 'editorial_suave',
    layouts: ['portada', 'portada', 'editorial', 'portada', 'mosaico', 'carta'],
    nombres: ['Retrato a pantalla completa', 'Nocturna', 'Editorial delicada', 'Galería serena', 'Mosaico de sesiones', 'Carta minimal'],
    pares: [
      { titulos: 'Instrument Serif', cuerpo: 'Instrument Sans' },
      { titulos: 'Bodoni Moda', cuerpo: 'Albert Sans' },
      { titulos: 'Newsreader', cuerpo: 'Golos Text' },
      { titulos: 'Spectral', cuerpo: 'Hanken Grotesk' },
      { titulos: 'Instrument Serif', cuerpo: 'Instrument Sans' },
      { titulos: 'Bodoni Moda', cuerpo: 'Hanken Grotesk' },
    ],
    paletas: ['marfil', 'noche', 'arena', 'blanco', 'rubor', 'piedra'],
  };
}

export const esDireccionRef = (d) => d && d.tipo === 'editorial_suave' && Array.isArray(d.layouts) && d.layouts.length === 6;
export const paletaRef = (d, i) => ({ ...corregirPaleta(PAL[d.paletas?.[i]] || PAL.marfil).paleta, familia: 'Neutros cálidos de tu referencia', origen: 'referencia' });

const CSS = `
body.ref{letter-spacing:.003em}
body.ref h1,body.ref h2,body.ref h3{font-weight:400;letter-spacing:-.012em}
body.ref h1{font-size:clamp(40px,6vw,82px);line-height:1.04}
body.ref h1 em,body.ref h2 em{font-style:italic;font-weight:400}
body.ref h2{font-size:clamp(30px,3.8vw,52px);line-height:1.1}
body.ref .barra{border-bottom:0}
body.ref .barra nav a{font-family:var(--fc);font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:400}
body.ref .kicker{font-size:11px;letter-spacing:.26em;text-transform:uppercase;font-weight:400}
body.ref .sub{font-weight:300;max-width:46ch}
body.ref .btn{border-radius:0;letter-spacing:.18em;text-transform:uppercase;font-size:12px;font-weight:400;padding:15px 28px;background:transparent;border:1px solid currentColor;color:inherit;box-shadow:none}
body.ref .btn:hover{background:var(--fg);color:var(--bg)}
body.ref .h-portada .btn:hover{background:#fff;color:#1e1b19}
body.ref .h-portada{min-height:100vh}
body.ref .h-portada h1,body.ref .h-portada .sub,body.ref .h-portada .kicker,body.ref .h-portada p{text-shadow:0 1px 2px rgba(0,0,0,.45),0 2px 22px rgba(0,0,0,.55)}
body.ref .sec{padding-top:clamp(72px,10vw,128px);padding-bottom:clamp(72px,10vw,128px)}
body.ref .galeria{gap:clamp(12px,2vw,26px)}
body.ref .galeria img,body.ref .mos img{border-radius:0}
body.ref .paq,body.ref .arco,body.ref .ovalo,body.ref .marco{border-radius:0}
body.ref footer{letter-spacing:.14em;text-transform:uppercase;font-size:11px}
`;

/** Cursiva en la segunda mitad del titular (solo estilo: el texto del cliente no cambia). */
function cursivaTitular(html) {
  return html.replace(/<h1>([^<]{12,})<\/h1>/, (m, txt) => {
    const w = txt.split(' ');
    if (w.length < 4) return m;
    const k = Math.ceil(w.length * 0.55);
    return `<h1>${w.slice(0, k).join(' ')} <em>${w.slice(k).join(' ')}</em></h1>`;
  });
}

/** Aplica el estilo de referencia a la página armada (fuente cursiva, CSS y clase del body). */
export function aplicarRef(html, par) {
  const fam = (f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital@0;1`;
  const link = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam(par.titulos)}&display=swap">`;
  return cursivaTitular(html)
    .replace('</head>', () => `${link}<style id="ref">${CSS}</style></head>`)
    .replace(/<body class="([^"]*)">/, (m, c) => `<body class="${c} ref">`);
}
