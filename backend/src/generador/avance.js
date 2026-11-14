// Opción N "Cifras y avance" (14-nov-2026, pedido de Sebastián a partir de vastspace.com; se tomó la lógica de diseño —portada
// con foto a pantalla completa y zoom lento, bloque de cifras en rejilla de etiqueta y valor, serie de fotos con aire— no el
// contenido ni la marca). Medido en el navegador el 14-nov-2026: la referencia es Webflow sin GSAP, Lenis ni Three.js; su
// portada es un video MP4 en bucle con foto de respaldo. Aquí el video se cambia por la foto principal del cliente.
// Qué la distingue:
// - Portada: foto a pantalla completa con zoom lento (solo transform), titular grande y, si hay cifras, un dato destacado.
// - Cifras clave: rejilla de etiqueta y valor con las cifras que el cliente dio ("15 años de experiencia" → 15 / años de experiencia).
// - Reconocimientos: premios y certificaciones del cliente en lista. Sin datos reales no hay sección (nada se inventa).
// - "Nuestro trabajo" se ve como serie de fotos con esquinas redondeadas y acercamiento suave al pasar el cursor.
// Técnica: CSS nativo, sin librerías ni JS. Con "reducir movimiento" la portada queda quieta y completa.
import { METRICAS } from './tipo_color.js';
import { COMUNES as COMUNES_TITULOS } from './fuentes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MAX_CIFRAS = 6;
export const MAX_RECONOCIMIENTOS = 6;
/** Grotescas con 400, 500 y 700 que no son letras comunes (orden de preferencia; distinto al de la M y la O). */
export const GROTESCAS_N = ['Familjen Grotesk', 'Hanken Grotesk', 'Instrument Sans', 'Albert Sans', 'Schibsted Grotesk'];

/** Letra de la N: una sola grotesca; la del estilo del cliente si trae una apta, si no la primera. */
export function parAvance(pares = []) {
  const usadas = pares.flatMap((p) => [p.titulos, p.cuerpo]);
  const apta = (f) => GROTESCAS_N.includes(f) && METRICAS[f]?.pesos?.includes(700) && !COMUNES_TITULOS.has(String(f).toLowerCase());
  const fam = usadas.find(apta) || GROTESCAS_N.find(apta) || GROTESCAS_N[0];
  return { titulos: fam, cuerpo: fam, estilo: pares[0]?.estilo || 'minimalista' };
}

const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Convierte las cifras del cliente ("15 años de experiencia", "Más de 500 clientes", "98% de satisfacción") en
 * pares {valor, etiqueta}. Descarta las que no traen número o no traen texto que las explique. Con menos de 2 → [].
 */
export function cifrasDe(lista = []) {
  const out = [];
  for (const c of Array.isArray(lista) ? lista : []) {
    const s = String(c ?? '').replace(/\s+/g, ' ').trim();
    const m = s.match(/^(m[aá]s de\s+|\+\s*)?(\$?\d[\d.,]*\s?(?:%|\+|k|mil|m²|m2)?)\s*(?:[-:·–—]\s*)?(.*)$/i);
    if (!m) continue;
    const etiqueta = m[3].trim();
    if (!etiqueta) continue;
    const valor = `${m[1] ? '+' : ''}${m[2].replace(/\s+/g, ' ').trim()}`;
    if (!out.some((x) => x.valor === valor && x.etiqueta.toLowerCase() === etiqueta.toLowerCase())) out.push({ valor, etiqueta: capital(etiqueta) });
    if (out.length >= MAX_CIFRAS) break;
  }
  return out.length >= 2 ? out : [];
}

/** Premios y certificaciones reales del cliente, sin repetidos. */
export function reconocimientosDe(confianza = {}) {
  const lista = [...(confianza.premios || []), ...(confianza.certificaciones || [])]
    .map((x) => String(x ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  return [...new Set(lista)].slice(0, MAX_RECONOCIMIENTOS);
}

/**
 * Portada de la opción N: foto a pantalla completa con zoom lento. heroFoto lleva el único h1.
 * dato: {valor, etiqueta} opcional (abajo a la derecha). img(x, {cls, eager, sizes, extra}) es el de la plantilla.
 */
export function portadaAvanceHTML({ heroFoto = null, img, kicker = '', titular = '', subtitulo = '', cta = '', ctaSec = '', dato = null }) {
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 46 ? ' h1-m' : '';
  const foto = heroFoto ? `<figure class="av-fig">${img(heroFoto, { cls: 'av-img rep-ok', eager: true, extra: ' fetchpriority="high"', sizes: ' sizes="100vw"' })}</figure>` : '';
  const bots = cta || ctaSec ? `<div class="av-bots">${cta || ''}${ctaSec || ''}</div>` : '';
  const d = dato?.valor ? `<p class="av-dato"><span>${esc(dato.etiqueta)}</span><b>${esc(dato.valor)}</b></p>` : '';
  const html = `<section class="hero h-avance${heroFoto ? '' : ' sin-foto'}" id="inicio">${foto}<div class="wrap av-txt">${kicker ? `<p class="av-kick">${esc(kicker)}</p>` : ''}<h1 class="av-h${clase}">${esc(titular)}</h1>${subtitulo ? `<p class="av-sub">${esc(subtitulo)}</p>` : ''}${bots}</div>${d}</section>`;
  return { html, urls: heroFoto?.url ? [heroFoto.url] : [] };
}

/** Rejilla de cifras (etiqueta arriba, valor grande). Sin 2 o más cifras válidas no hay sección. */
export function cifrasAvanceHTML(cifras = []) {
  if (!cifras.length) return '';
  const celdas = cifras.map((c) => `<div class="av-c"><span>${esc(c.etiqueta)}</span><b>${esc(c.valor)}</b></div>`).join('');
  return `<section class="sec av-cifras" id="cifras" aria-label="Cifras"><div class="wrap"><div class="av-gr av-n${Math.min(cifras.length, 6)}">${celdas}</div></div></section>`;
}

/** Lista de reconocimientos. Sin premios ni certificaciones del cliente no hay sección. */
export function reconocimientosHTML(items = [], titulo = 'Reconocimientos') {
  if (!items.length) return '';
  return `<section class="sec av-rec" id="reconocimientos"><div class="wrap"><h2>${esc(titulo)}</h2><ul class="av-lista">${items.map((x, k) => `<li><span class="av-num">${String(k + 1).padStart(2, '0')}</span><strong>${esc(x)}</strong></li>`).join('')}</ul></div></section>`;
}

export const CSS_AVANCE = `
body.l-avance{--margen:clamp(20px,5vw,72px)}
body.l-avance h1,body.l-avance h2,body.l-avance h3{font-weight:600;letter-spacing:-.03em;line-height:1.04}
.h-avance{position:relative;overflow:clip;isolation:isolate;display:grid;grid-template-columns:minmax(0,1fr);align-items:end;min-height:clamp(520px,84svh,820px);color:#fff;background:var(--banda);padding:0}
.av-fig{position:absolute;inset:0;margin:0;z-index:-2;overflow:hidden}
.av-img{width:100%;height:100%;object-fit:cover;display:block;transform-origin:62% 55%;animation:av-kb 26s ease-in-out infinite alternate}
@keyframes av-kb{from{transform:scale(1)}to{transform:scale(1.12) translate(-1.2%,-1%)}}
.h-avance::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,rgba(0,0,0,.7),rgba(0,0,0,.08) 62%,rgba(0,0,0,.32));pointer-events:none}
.av-txt{position:relative;width:100%;display:grid;gap:14px;justify-items:start;padding-top:clamp(96px,14vw,168px);padding-bottom:clamp(40px,6vw,80px)}
.av-kick{font-size:13px;letter-spacing:.14em;text-transform:uppercase;opacity:.92;margin:0}
.av-h{font-size:clamp(38px,7vw,104px);line-height:.98;max-width:14ch;margin:0;text-transform:none}.av-h.h1-m{font-size:clamp(32px,5.8vw,88px)}.av-h.h1-l{font-size:clamp(28px,5vw,76px)}
.av-sub{max-width:46ch;font-size:clamp(16px,1.5vw,20px);opacity:.96;margin:0}
.av-bots{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:10px}
.av-dato{position:absolute;right:var(--margen);bottom:clamp(28px,5vw,64px);margin:0;text-align:right;display:grid;gap:2px}
.av-dato span{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85}.av-dato b{font-size:clamp(26px,3vw,40px);font-weight:600;letter-spacing:-.02em}
/* cifras: etiqueta arriba, valor grande, líneas finas entre celdas */
.av-cifras{background:var(--banda);color:#fff;padding:clamp(36px,6vw,72px) 0}
.av-gr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.22)}
.av-n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.av-c{display:flex;flex-direction:column;gap:10px;padding:24px 24px 24px 0;border-bottom:1px solid rgba(255,255,255,.22)}
.av-c:not(:nth-child(3n+1)){padding-left:24px;border-left:1px solid rgba(255,255,255,.22)}
.av-n2 .av-c:not(:nth-child(3n+1)){padding-left:0;border-left:0}.av-n2 .av-c:nth-child(2n){padding-left:24px;border-left:1px solid rgba(255,255,255,.22)}
.av-c span{font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.82}
.av-c b{font-size:clamp(30px,4vw,56px);font-weight:600;letter-spacing:-.025em;line-height:1;font-variant-numeric:tabular-nums}
/* serie de fotos: "Nuestro trabajo" */
body.l-avance .galeria figure{border-radius:16px;overflow:hidden}
body.l-avance .galeria figure img{transition:transform .8s cubic-bezier(.2,.7,.2,1)}
@media (hover:hover){body.l-avance .galeria figure:hover img{transform:scale(1.05)}}
/* reconocimientos */
.av-lista{list-style:none;margin:0;padding:0;border-top:1px solid var(--bor)}
.av-lista li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:18px;align-items:baseline;padding:20px 0;border-bottom:1px solid var(--bor)}
.av-num{font-variant-numeric:tabular-nums;color:var(--mut);font-size:15px}.av-lista strong{font-size:clamp(18px,2vw,26px);font-weight:600;letter-spacing:-.01em}
@media (max-width:760px){
.av-gr,.av-n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.av-c,.av-c:not(:nth-child(3n+1)),.av-n2 .av-c:not(:nth-child(3n+1)){padding:20px 14px 20px 0;border-left:0}
.av-c:nth-child(2n),.av-n2 .av-c:nth-child(2n){padding-left:18px;border-left:1px solid rgba(255,255,255,.22)}
.av-dato{display:none}
}
@media (prefers-reduced-motion:reduce){.av-img{animation:none}body.l-avance .galeria figure img{transition:none}}
`;

/** Para la revisión visual: mide la página quieta (sin zoom en la portada ni en las fotos). */
export const CSS_REVISION_AVANCE = '.av-img{animation:none!important;transform:none!important}body.l-avance .galeria figure img{transition:none!important;transform:none!important}';
