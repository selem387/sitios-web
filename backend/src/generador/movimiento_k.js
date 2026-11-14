// Opción K "Recorrido en movimiento" (14-nov-2026): portada tipográfica con titular que sube por línea, foto real del cliente con
// paralaje y banda de texto corrida; el resto de la página es el de la plantilla general y recibe los efectos de efectos_gsap.js
// (titulares por palabra, bloques que entran escalonados, scroll suave). Sin JS o con "reducir movimiento" todo queda quieto y completo.
// Licencia: Sebastián decidió (14-nov-2026) que GSAP se puede usar (no se publica un editor de animaciones; se ofrecen sitios a prospectos de Google Maps).
import { METRICAS } from './tipo_color.js';
import { bandaHTML, conEfectosGsap } from './efectos_gsap.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Letra de la K: Public Sans para títulos y texto (pesos 400–700). */
export const FAMILIA_K = 'Public Sans';
export const parMovimiento = (pares = []) => ({ titulos: FAMILIA_K, cuerpo: FAMILIA_K, estilo: pares[0]?.estilo || 'minimalista', ok: !!METRICAS[FAMILIA_K] || true });

/**
 * Portada de la opción K. heroFoto: foto del cliente (img de la plantilla la pinta). frases: 2 a 4 textos cortos para la banda.
 * → {html, urls}
 */
export function portadaMovimientoHTML({ heroFoto = null, img, kicker = '', titular = '', subtitulo = '', cta = '', frases = [] }) {
  const f = frases.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4);
  const clase = String(titular).length > 56 ? ' h1-l' : String(titular).length > 46 ? ' h1-m' : '';
  const foto = heroFoto ? `<div class="mv-foto fx-paralaje" data-fx="paralaje" data-fx-fuerza="6"><div class="fx-paralaje-in">${img(heroFoto, { cls: 'mv-img rep-ok', eager: true, extra: ' fetchpriority="high" sizes="100vw"' })}</div></div>` : '';
  const html = `<section class="hero h-mov${heroFoto ? '' : ' sin-foto'}" id="inicio"><div class="wrap mv-cab">${kicker ? `<p class="mv-kick">${esc(kicker)}</p>` : ''}<h1 class="mv-tit${clase}" data-fx="titulo" data-fx-split="letras" data-fx-ahora>${esc(titular)}</h1>${subtitulo ? `<p class="sub">${esc(subtitulo)}</p>` : ''}${cta || ''}</div>${foto}${f.length >= 2 ? bandaHTML(f, { dir: -1, vel: 70, clase: 'mv-banda' }) : ''}</section>`;
  return { html, urls: [heroFoto?.url].filter(Boolean) };
}

export const CSS_MOVIMIENTO_K = `
body.l-movimiento{--margen:clamp(20px,5vw,72px);--f-titulo:var(--ft)}
body.l-movimiento h1,body.l-movimiento h2,body.l-movimiento h3{font-weight:500;letter-spacing:-.03em;line-height:1.04}
.h-mov{padding:clamp(96px,14vh,150px) 0 0;overflow:clip}.mv-cab{display:grid;gap:18px}
.mv-kick{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.mv-tit{font-size:clamp(38px,6.6vw,112px);line-height:.96;text-transform:uppercase;max-width:17ch}.mv-tit.h1-m{font-size:clamp(34px,5.8vw,96px)}.mv-tit.h1-l{font-size:clamp(30px,4.9vw,82px)}
.h-mov .sub{max-width:52ch;font-size:clamp(17px,1.4vw,21px)}
.mv-foto{margin:clamp(28px,5vw,64px) var(--margen) 0;border-radius:22px;overflow:hidden;aspect-ratio:16/8;position:relative}.mv-foto .fx-paralaje-in{position:absolute;inset:-6% 0}.mv-img{width:100%;height:100%;object-fit:cover;display:block}
.mv-banda{margin-top:clamp(24px,4vw,48px)}
@media (max-width:700px){.mv-foto{aspect-ratio:4/5;border-radius:16px}}
`;

/** Para la revisión visual: todo visible y quieto aunque los efectos no hayan corrido. */
export const CSS_REVISION_MOVIMIENTO = 'html[data-fx-gsap] [data-fx],html.fx-pre [data-fx]{opacity:1!important;transform:none!important;visibility:visible!important}.fx-banda{overflow:hidden}.fx-apila>*{position:static!important}.fx-horiz{height:auto!important}';

/** Post-proceso de la página K ya armada: efectos en títulos y bloques, con la paleta de la propuesta. */
export const conEfectosK = (html, p = {}) => conEfectosGsap(html, { paleta: { fondo: p.bg, tinta: p.fg, acento: p.accent || p.primary, banda: p.banda } });
