// Catálogo de tipografías poco comunes (Google Fonts) por estilo.
// REGLA DURA v1 (4-nov-2026): cada par pasa validarPar() de tipo_color.js (contraste de rol, altura x, cuerpo legible, máx. 2 familias).
// Regla de Sebastián: nunca tipografías comunes; siempre poco comunes y acordes al estilo y personalidad del cliente.
// d = 1 si el título es "de exhibición" (muy decorado): se evita cuando el cliente pidió letras sencillas.
import { METRICAS, validarPar } from './tipo_color.js';

export const COMUNES = new Set(['inter', 'roboto', 'arial', 'helvetica', 'open sans', 'montserrat', 'poppins', 'lato', 'raleway', 'playfair display', 'lora',
  'nunito', 'josefin sans', 'cinzel', 'oswald', 'dm sans', 'dm serif display', 'work sans', 'source sans pro', 'source sans 3', 'merriweather', 'pt sans', 'pt serif',
  'noto sans', 'noto serif', 'ubuntu', 'mulish', 'rubik', 'quicksand', 'manrope', 'space grotesk', 'outfit', 'jost', 'figtree', 'cormorant', 'cormorant garamond', 'libre baskerville', 'mona sans']);

const C = (titulos, cuerpo, d = 0) => ({ titulos, cuerpo, d });
export const CATALOGO = {
  calido: [C('Young Serif', 'Instrument Sans'), C('Bricolage Grotesque', 'Newsreader'), C('Gabarito', 'Petrona'), C('Grandstander', 'Onest', 1), C('Petrona', 'Schibsted Grotesk'), C('Gluten', 'Reddit Sans', 1)],
  fresco: [C('Unbounded', 'Golos Text'), C('Syne', 'Instrument Sans'), C('Familjen Grotesk', 'Spectral'), C('Bricolage Grotesque', 'Petrona'), C('Darker Grotesque', 'Hanken Grotesk'), C('Gabarito', 'Newsreader')],
  elegante: [C('Gloock', 'Hanken Grotesk'), C('Instrument Serif', 'Instrument Sans'), C('Bodoni Moda', 'Albert Sans'), C('Italiana', 'Schibsted Grotesk', 1), C('Newsreader', 'Golos Text'), C('Marcellus', 'Onest')],
  minimalista: [C('Instrument Serif', 'Instrument Sans'), C('Geist', 'Geist'), C('Newsreader', 'Hanken Grotesk'), C('Schibsted Grotesk', 'Spectral'), C('Familjen Grotesk', 'Newsreader'), C('Albert Sans', 'Petrona')],
  lujo: [C('Bodoni Moda', 'Hanken Grotesk'), C('Italiana', 'Albert Sans', 1), C('Gloock', 'Instrument Sans'), C('Marcellus', 'Golos Text'), C('Instrument Serif', 'Schibsted Grotesk'), C('Newsreader', 'Onest')],
  tecnologico: [C('Unbounded', 'Geist'), C('Chakra Petch', 'Onest'), C('Martian Mono', 'Instrument Sans', 1), C('Geist Mono', 'Geist'), C('Syne', 'Reddit Sans'), C('Unbounded', 'Atkinson Hyperlegible')],
  tradicional: [C('Young Serif', 'Golos Text'), C('Spectral', 'Hanken Grotesk'), C('Petrona', 'Instrument Sans'), C('Newsreader', 'Albert Sans'), C('Gloock', 'Onest'), C('Marcellus', 'Reddit Sans')],
  divertido: [C('Grandstander', 'Onest', 1), C('Gluten', 'Golos Text', 1), C('Bagel Fat One', 'Instrument Sans', 1), C('Gabarito', 'Spectral'), C('Chango', 'Hanken Grotesk', 1), C('Bricolage Grotesque', 'Petrona')],
};
const VECINOS = { calido: ['tradicional', 'divertido', 'fresco'], fresco: ['divertido', 'minimalista', 'calido'], elegante: ['lujo', 'minimalista', 'tradicional'],
  minimalista: ['elegante', 'fresco', 'tecnologico'], lujo: ['elegante', 'minimalista'], tecnologico: ['minimalista', 'fresco'], tradicional: ['calido', 'elegante'], divertido: ['fresco', 'calido'] };

/** 6 pares distintos para el estilo del cliente (completa con estilos vecinos), respetando "letras sencillas". */
export function paresTipograficos(estilo = 'calido', brief = {}, n = 6) {
  const sencillas = /letras? (muy )?(elaborad|rebuscad|complicad|adornad)|tipograf[ií]a sencilla|letra sencilla/i.test(String(brief?.marca?.evitar || '') + ' ' + String(brief?.marca?.referencias_que_gusta || ''));
  const orden = [estilo, ...(VECINOS[estilo] || []), ...Object.keys(CATALOGO)];
  const out = [], vistos = new Set(), titulos = new Set();
  for (const e of orden) for (const p of CATALOGO[e] || []) {
    const k = `${p.titulos}|${p.cuerpo}`;
    if (vistos.has(k) || titulos.has(p.titulos) || (sencillas && p.d) || COMUNES.has(p.titulos.toLowerCase()) || COMUNES.has(p.cuerpo.toLowerCase())) continue;
    if (!validarPar(p).ok) continue; // regla dura de combinación tipográfica
    vistos.add(k); titulos.add(p.titulos); out.push({ ...p, estilo: e });
    if (out.length === n) return out;
  }
  return out;
}

// Familias con un solo peso: pedirles 500-700 hace fallar toda la hoja de Google Fonts.
const SOLO_400 = new Set(['Young Serif', 'Gloock', 'Italiana', 'Bagel Fat One', 'Chango', 'Instrument Serif', 'Marcellus', 'Atkinson Hyperlegible']);
const pesosDe = (f) => {
  const m = METRICAS[f]?.pesos;
  if (m) { const w = [400, 500, 600, 700].filter((x) => m.includes(x)); return w.length > 1 ? `:wght@${w.join(';')}` : ''; }
  return SOLO_400.has(f) ? (f === 'Atkinson Hyperlegible' ? ':wght@400;700' : '') : ':wght@400;500;600;700';
};
/** Par tipográfico completo (con métricas del catálogo) a partir de los nombres guardados en la opción elegida. */
export function parPorNombres({ titulos, cuerpo, estilo } = {}) {
  for (const [e, ps] of Object.entries(CATALOGO)) {
    const p = ps.find((x) => x.titulos === titulos && x.cuerpo === cuerpo);
    if (p) return { ...p, estilo: estilo || e };
  }
  return { titulos, cuerpo, estilo: estilo || 'calido' };
}

export const urlFuentes = (pares) => {
  const fams = [...new Set(pares.flatMap((p) => [p.titulos, p.cuerpo]))];
  const q = fams.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}${pesosDe(f)}`);
  return `https://fonts.googleapis.com/css2?${q.join('&')}&display=swap`;
};
