// Opción S "Tu página de referencia" (diseño aprobado por Sebastián el 18-nov-2026; doc del proyecto
// claude/pagina-referencia-plantilla.md). Reconstruye la ESTRUCTURA y el ESTILO de una página que le gusta al cliente a
// partir de un PLANO (JSON) que escribe Claude mirando capturas de esa página: qué bloques lleva, en qué orden, con qué
// proporciones, letra y colores. Nunca usa código, textos, imágenes ni marca de la página original: todo lo arma este
// archivo con nuestras piezas y los datos del cliente. El mismo plano sirve como plantilla para otros clientes del giro.
import { esc, logoHTML, agruparOferta, redes } from '../../kit/utiles.js';
import { direccionTexto, testimoniosValidos } from '../../datos_brief.js';
import { enlacesRedes, CSS_REDES } from '../../iconos_redes.js';
import { CATALOGO, urlFuentes } from '../../fuentes.js';
import { wcag, ajustarContraste, textoSobre, oklch, aHex } from '../../tipo_color.js';

// ---------------- catálogo de piezas del plano ----------------
export const PORTADAS = ['foto_completa', 'dividida', 'texto_grande', 'texto_centrado', 'tarjeta', 'mosaico'];
export const BLOQUES = {
  servicios: ['tarjetas', 'lista', 'filas'],
  trabajo: ['cuadricula', 'mosaico', 'carrusel', 'banda'],
  sobre: ['foto_texto', 'texto_centrado', 'cita'],
  resenas: ['tarjetas', 'cita_grande'],
  proceso: ['pasos', 'linea'],
  faq: ['acordeon'],
  banda_cta: ['acento', 'oscuro'],
  contacto: ['dividido', 'centrado'],
};
export const FONDOS = ['base', 'alterno', 'oscuro', 'acento'];
/** Pares tipográficos permitidos (catálogo propio; el plano elige uno por índice). */
export const PARES = (() => { const v = new Set(), out = []; for (const [estilo, ps] of Object.entries(CATALOGO)) for (const p of ps) { const k = `${p.titulos}|${p.cuerpo}`; if (!v.has(k)) { v.add(k); out.push({ ...p, estilo }); } } return out; })();

const HEX = /^#[0-9a-f]{6}$/i;
const uno = (x, lista, def) => (lista.includes(x) ? x : def);
const num = (x, min, max, def) => (Number.isFinite(+x) ? Math.min(max, Math.max(min, +x)) : def);

/** Normaliza un plano: todo lo desconocido toma un valor seguro. Nunca falla. */
export function normalizarPlano(p0 = {}) {
  const p = p0 || {};
  const e = p.estilo || {};
  const col = e.colores || {};
  const secs = (Array.isArray(p.secciones) ? p.secciones : []).map((s) => (BLOQUES[s?.tipo] ? { tipo: s.tipo, estilo: uno(s.estilo, BLOQUES[s.tipo], BLOQUES[s.tipo][0]), columnas: num(s.columnas, 1, 4, 3), fondo: uno(s.fondo, FONDOS, 'base') } : null)).filter(Boolean);
  const vistos = new Set();
  return {
    v: 1,
    estilo: {
      colores: { fondo: HEX.test(col.fondo) ? col.fondo : '#FAF8F5', texto: HEX.test(col.texto) ? col.texto : '#1A1A1A', acento: HEX.test(col.acento) ? col.acento : '#1F4E79', alterno: HEX.test(col.alterno) ? col.alterno : null, oscuro: HEX.test(col.oscuro) ? col.oscuro : null },
      par: num(e.par, 0, PARES.length - 1, 0),
      mayusculas_titulos: !!e.mayusculas_titulos,
      peso_titulos: num(e.peso_titulos, 300, 800, 500),
      tam_titulos: uno(e.tam_titulos, ['mediano', 'grande', 'enorme'], 'grande'),
      radio: num(e.radio, 0, 40, 8),
      aire: uno(e.aire, ['compacto', 'medio', 'amplio'], 'medio'),
      ancho: uno(e.ancho, ['estrecho', 'normal', 'amplio'], 'normal'),
      botones: uno(e.botones, ['solido', 'contorno', 'pildora'], 'solido'),
    },
    encabezado: { estilo: uno(p.encabezado?.estilo, ['solido', 'transparente', 'centrado'], 'solido') },
    portada: {
      tipo: uno(p.portada?.tipo, PORTADAS, 'dividida'),
      alineacion: uno(p.portada?.alineacion, ['izquierda', 'centro'], 'izquierda'),
      alto: uno(p.portada?.alto, ['pantalla', 'media', 'compacta'], 'media'),
      foto_lado: uno(p.portada?.foto_lado, ['izquierda', 'derecha'], 'derecha'),
      velo: num(p.portada?.velo, 0, 0.75, 0.35),
      fondo: uno(p.portada?.fondo, FONDOS, 'base'),
    },
    secciones: secs.filter((s) => (vistos.has(s.tipo) && s.tipo !== 'banda_cta' ? false : (vistos.add(s.tipo), true))),
    pie: { estilo: uno(p.pie?.estilo, ['simple', 'oscuro'], 'simple') },
  };
}

// ---------------- colores ----------------
/**
 * Paleta de la página: fondo, texto y superficies de la referencia (el plano); el acento se acomoda al logo del cliente
 * si tiene colores (decisión 10 del 18-nov-2026), conservando la luminosidad del acento de la referencia. Contraste
 * siempre con las reglas duras (ajustarContraste).
 */
export function paletaPlano(plano, coloresCliente = []) {
  const c = plano.estilo.colores;
  const fondo = c.fondo;
  const oscuroFondo = wcag('#FFFFFF', fondo) > wcag('#111111', fondo);
  const texto = ajustarContraste(c.texto, fondo, 'cuerpo');
  let acento = c.acento;
  const marca = (coloresCliente || []).find((x) => HEX.test(x) && oklch(x).c > 0.04);
  if (marca) { const r = oklch(acento), m = oklch(marca); acento = aHex({ l: r.l, c: Math.max(m.c, 0.06), h: m.h }); }
  const sobre = textoSobre(acento, '#111111', 'boton');
  acento = sobre.solido;
  const acentoTxt = ajustarContraste(acento, fondo, 'secundario');
  const alterno = c.alterno || aHex({ ...oklch(fondo), l: Math.max(0, Math.min(1, oklch(fondo).l + (oscuroFondo ? 0.05 : -0.035))) });
  const oscuro = c.oscuro || (oscuroFondo ? aHex({ ...oklch(fondo), l: Math.max(0, oklch(fondo).l - 0.06) }) : aHex({ l: 0.22, c: 0.02, h: oklch(acento).h }));
  return {
    fondo, texto, acento, acentoTxt, alterno, oscuro,
    sobreAcento: sobre.texto,
    sobreOscuro: wcag('#FFFFFF', oscuro) >= wcag('#111111', oscuro) ? '#FFFFFF' : '#111111',
    textoAlterno: ajustarContraste(texto, alterno, 'cuerpo'),
    suave: ajustarContraste(aHex({ ...oklch(texto), l: oklch(texto).l + (oscuroFondo ? -0.18 : 0.22) }), fondo, 'cuerpo'),
  };
}

// ---------------- página ----------------
const AIRE = { compacto: 'clamp(48px,7vw,80px)', medio: 'clamp(64px,9vw,112px)', amplio: 'clamp(80px,12vw,160px)' };
const ANCHO = { estrecho: '980px', normal: '1180px', amplio: '1360px' };
const TAM = { mediano: 'clamp(36px,5vw,58px)', grande: 'clamp(42px,6.4vw,84px)', enorme: 'clamp(48px,8.6vw,124px)' };

function figura(f, { clase = '', ratio = '4/3', lazy = true } = {}) {
  if (!f?.url) return '';
  return `<figure class="fg ${clase}" style="aspect-ratio:${ratio}"><img src="${esc(f.url)}" alt="${esc(f.alt || '')}"${f.ancho ? ` width="${f.ancho}" height="${f.alto}"` : ''}${lazy ? ' loading="lazy" decoding="async"' : ''}></figure>`;
}

/**
 * Arma la página completa. ctx: {plano, brief, mat, textos, v, titulos, wa, tel, colores, letra, titulo}
 * → {html, fuentes, paleta}
 */
export function paginaReferencia({ plano: p0, brief = {}, mat = {}, textos = {}, v = {}, titulos = {}, wa = '', tel = null, colores = [] }) {
  const plano = normalizarPlano(p0);
  const E = plano.estilo, P = plano.portada;
  const pal = paletaPlano(plano, colores);
  const par = PARES[E.par];
  const nombre = brief.negocio?.nombre || '';
  const c = brief.contacto || {};
  const usadas = new Set();
  const usar = (f) => { if (f?.url) usadas.add(f.url); return f; };
  const libres = () => [...(mat.trabajos || []), ...(mat.local || []), ...(mat.otras || [])].filter((f) => f?.url && !usadas.has(f.url) && /^(foto|imagen)/.test(f.tipo || 'foto'));
  const T = (k, def) => titulos[k] || def;
  const cta = (txt = v.cta || 'Escríbenos por WhatsApp', clase = '') => `<a class="btn ${clase}"${wa}>${esc(txt)}</a>`;
  const grupos = agruparOferta(brief.oferta?.items || []);
  const items = grupos.flatMap((g) => g.opciones.map((o) => ({ ...o, descripcion: o.detalle, nombre: o.nombre || g.nombre })));
  const tes = testimoniosValidos(brief, mat);
  const faq = (brief.faq || []).filter((x) => x.pregunta && x.respuesta);
  const pasos = brief.oferta?.proceso_pasos || [];
  const sobreTxt = textos.sobre || brief.confianza?.historia_corta || '';
  const fondoSec = (f) => ({ base: '', alterno: ' f-alt', oscuro: ' f-osc', acento: ' f-acc' }[f] || '');

  // Portada
  const hero = usar(mat.hero || libres()[0]);
  const texto = `<div class="h-txt">${v.kicker ? `<p class="kick">${esc(v.kicker)}</p>` : ''}<h1>${esc(v.titular || nombre)}</h1>${v.subtitulo ? `<p class="sub">${esc(v.subtitulo)}</p>` : ''}<div class="h-cta">${cta()}</div></div>`;
  let portada;
  if (P.tipo === 'foto_completa' && hero) portada = `<section class="hero h-full a-${P.alineacion}" id="inicio">${figura(hero, { clase: 'h-fondo', ratio: 'auto', lazy: false })}<div class="velo"></div><div class="wrap">${texto}</div></section>`;
  else if (P.tipo === 'tarjeta' && hero) portada = `<section class="hero h-tarjeta" id="inicio">${figura(hero, { clase: 'h-fondo', ratio: 'auto', lazy: false })}<div class="wrap"><div class="tarjeta">${texto}</div></div></section>`;
  else if (P.tipo === 'mosaico' && hero) { const extra = libres().slice(0, 2).map(usar); portada = `<section class="hero h-mos${fondoSec(P.fondo)}" id="inicio"><div class="wrap h-grid">${texto}<div class="mos m${1 + extra.length}">${figura(hero, { ratio: 'auto', lazy: false })}${extra.map((f) => figura(f, { ratio: 'auto' })).join('')}</div></div></section>`; }
  else if (P.tipo === 'texto_grande') portada = `<section class="hero h-grande a-${P.alineacion}${fondoSec(P.fondo)}" id="inicio"><div class="wrap">${texto}</div>${hero ? `<div class="wrap">${figura(hero, { clase: 'banda', ratio: '21/9', lazy: false })}</div>` : ''}</section>`;
  else if (P.tipo === 'texto_centrado' || !hero) portada = `<section class="hero h-centro${fondoSec(P.fondo)}" id="inicio"><div class="wrap">${texto}</div></section>`;
  else portada = `<section class="hero h-div lado-${P.foto_lado}${fondoSec(P.fondo)}" id="inicio"><div class="wrap h-grid">${texto}${figura(hero, { ratio: '4/5', lazy: false })}</div></section>`;

  // Bloques
  const sec = (id, f, cuerpo, extra = '') => `<section class="sec${fondoSec(f)}${extra}" id="${id}"><div class="wrap">${cuerpo}</div></section>`;
  const B = {
    servicios: (s) => {
      if (!items.length) return '';
      const precio = (o) => (o.precio ? `<em class="precio">${esc(o.precio)}</em>` : '');
      const lista = s.estilo === 'lista'
        ? `<ul class="s-lista">${items.map((o) => `<li><div><h3>${esc(o.nombre)}</h3>${o.descripcion ? `<p>${esc(o.descripcion)}</p>` : ''}</div>${precio(o)}</li>`).join('')}</ul>`
        : s.estilo === 'filas'
          ? `<div class="s-filas">${items.map((o, k) => `<article><span class="n">${String(k + 1).padStart(2, '0')}</span><h3>${esc(o.nombre)}</h3><p>${esc(o.descripcion || '')}</p>${precio(o)}</article>`).join('')}</div>`
          : `<div class="s-tarjetas c${Math.min(s.columnas, items.length > 1 ? 4 : 1)}">${items.map((o) => `<article class="card"><h3>${esc(o.nombre)}</h3>${o.descripcion ? `<p>${esc(o.descripcion)}</p>` : ''}${precio(o)}</article>`).join('')}</div>`;
      return sec('servicios', s.fondo, `<h2>${esc(T('servicios', 'Servicios'))}</h2>${textos.servicios_intro ? `<p class="intro">${esc(textos.servicios_intro)}</p>` : ''}${lista}<div class="pie-sec">${cta(textos.servicios_boton || undefined)}</div>`);
    },
    trabajo: (s) => {
      const fotos = libres().map(usar);
      if (!fotos.length) return '';
      const cuerpo = s.estilo === 'carrusel'
        ? `<div class="carr">${fotos.map((f) => figura(f, { ratio: '4/5' })).join('')}</div>`
        : s.estilo === 'banda'
          ? `<div class="banda-f">${fotos.slice(0, 4).map((f) => figura(f, { ratio: '3/4' })).join('')}</div>${fotos.length > 4 ? `<div class="g c3">${fotos.slice(4).map((f) => figura(f)).join('')}</div>` : ''}`
          : s.estilo === 'mosaico'
            ? `<div class="g-mos">${fotos.map((f, k) => figura(f, { ratio: 'auto', clase: k === 0 && fotos.length > 2 ? 'grande' : '' })).join('')}</div>`
            : `<div class="g c${Math.min(s.columnas, 4)}">${fotos.map((f) => figura(f)).join('')}</div>`;
      return sec('trabajo', s.fondo, `<h2>${esc(T('trabajo', 'Nuestro trabajo'))}</h2>${cuerpo}`);
    },
    sobre: (s) => {
      const foto = usar(mat.fundador && !usadas.has(mat.fundador.url) ? mat.fundador : null);
      if (!sobreTxt && !foto) return '';
      const parr = String(sobreTxt).split(/\n+/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('');
      if (s.estilo === 'cita') return sec('sobre', s.fondo, `<h2>${esc(T('sobre', 'Quiénes somos'))}</h2><blockquote class="cita">${parr}</blockquote>`);
      if (s.estilo === 'texto_centrado' || !foto) return sec('sobre', s.fondo, `<div class="centro"><h2>${esc(T('sobre', 'Quiénes somos'))}</h2>${parr}</div>`);
      return sec('sobre', s.fondo, `<div class="dos">${figura(foto, { ratio: '4/5' })}<div><h2>${esc(T('sobre', 'Quiénes somos'))}</h2>${parr}</div></div>`);
    },
    resenas: (s) => {
      if (!tes.length) return '';
      if (s.estilo === 'cita_grande') return sec('resenas', s.fondo, `<h2 class="vh">${esc(T('resenas', 'Clientes'))}</h2><figure class="cita-g"><blockquote>${esc(tes[0].texto)}</blockquote>${tes[0].nombre ? `<figcaption>${esc(tes[0].nombre)}</figcaption>` : ''}</figure>${tes.length > 1 ? `<div class="s-tarjetas c3">${tes.slice(1).map((x) => `<blockquote class="card"><p>${esc(x.texto)}</p>${x.nombre ? `<cite>${esc(x.nombre)}</cite>` : ''}</blockquote>`).join('')}</div>` : ''}`);
      return sec('resenas', s.fondo, `<h2>${esc(T('resenas', 'Clientes'))}</h2><div class="s-tarjetas c${Math.min(3, tes.length)}">${tes.map((x) => `<blockquote class="card"><p>${esc(x.texto)}</p>${x.nombre ? `<cite>${esc(x.nombre)}</cite>` : ''}</blockquote>`).join('')}</div>`);
    },
    proceso: (s) => {
      if (pasos.length < 3) return '';
      const p = (x) => { const [a, ...b] = String(x).split('\n'); return `<h3>${esc(a)}</h3>${b.length ? `<p>${esc(b.join(' '))}</p>` : ''}`; };
      return sec('proceso', s.fondo, `<h2>${esc(textos.proceso || T('proceso', 'Cómo funciona'))}</h2><ol class="${s.estilo === 'linea' ? 'linea' : 'pasos'}">${pasos.map((x) => `<li>${p(x)}</li>`).join('')}</ol>`);
    },
    faq: (s) => (faq.length ? sec('faq', s.fondo, `<h2>${esc(T('faq', 'Preguntas frecuentes'))}</h2><div class="faq">${faq.map((x, k) => `<details${k ? '' : ' open'}><summary>${esc(x.pregunta)}</summary><p>${esc(x.respuesta)}</p></details>`).join('')}</div>`) : ''),
    banda_cta: (s) => `<section class="sec banda-cta ${s.estilo === 'oscuro' ? 'f-osc' : 'f-acc'}"><div class="wrap"><p class="frase">${esc(v.subtitulo || v.titular || nombre)}</p>${cta(undefined, 'inv')}</div></section>`,
    contacto: (s) => {
      const dir = direccionTexto(brief);
      const datos = [c.whatsapp ? `<li><span>WhatsApp</span><a${wa}>${esc(tel || c.whatsapp)}</a></li>` : '', c.email ? `<li><span>Correo</span><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : '', dir ? `<li><span>Dirección</span>${esc(dir)}</li>` : '', c.horario ? `<li><span>Horario</span>${esc(c.horario)}</li>` : ''].join('');
      const rs = enlacesRedes(redes(c));
      return sec('contacto', s.fondo, `<div class="${s.estilo === 'centrado' ? 'centro' : 'dos ct'}"><div><h2>${esc(T('contacto', 'Contacto'))}</h2><p class="sub">${esc(v.subtitulo || '')}</p>${cta()}</div><div><ul class="datos">${datos}</ul>${rs ? `<div class="rs">${rs}</div>` : ''}</div></div>`);
    },
  };
  // Orden de la referencia; las secciones con material que el plano no trae entran antes de contacto (criterio 2).
  const orden = plano.secciones.length ? [...plano.secciones] : [{ tipo: 'servicios', estilo: 'tarjetas', columnas: 3, fondo: 'base' }, { tipo: 'trabajo', estilo: 'cuadricula', columnas: 3, fondo: 'alterno' }, { tipo: 'sobre', estilo: 'foto_texto', fondo: 'base' }];
  for (const t of ['servicios', 'trabajo', 'sobre', 'resenas', 'proceso', 'faq']) if (!orden.some((s) => s.tipo === t)) { const k = t !== 'faq' && orden.some((s) => s.tipo === 'faq') ? orden.findIndex((s) => s.tipo === 'faq') : orden.findIndex((s) => s.tipo === 'contacto'); const s = { tipo: t, estilo: BLOQUES[t][0], columnas: 3, fondo: 'base' }; if (k >= 0) orden.splice(k, 0, s); else orden.push(s); }
  if (!orden.some((s) => s.tipo === 'contacto')) orden.push({ tipo: 'contacto', estilo: 'dividido', fondo: 'oscuro' });
  const cuerpo = orden.map((s) => B[s.tipo](s)).join('');

  // Encabezado y pie
  const navIds = orden.map((s) => s.tipo).filter((t) => t !== 'banda_cta' && t !== 'contacto' && cuerpo.includes(`id="${t}"`) && String(T(t, t)).length <= 22).slice(0, 4);
  const nav = navIds.map((t) => `<a href="#${t}">${esc(T(t, t))}</a>`).join('');
  const marca = mat.logo?.url ? logoHTML(mat.logo, pal.fondo, pal.texto, { alt: nombre }) : `<span class="nombre">${esc(nombre)}</span>`;
  const transp = plano.encabezado.estilo === 'transparente' && /h-full|h-tarjeta/.test(portada);
  const encabezado = `<header class="cab e-${plano.encabezado.estilo}${transp ? ' sobre-foto' : ''}"><div class="wrap cab-in"><a class="marca" href="#inicio">${marca}</a><nav>${nav}</nav>${cta('Contacto', 'chico')}</div></header>`;
  const pie = `<footer class="pie ${plano.pie.estilo === 'oscuro' ? 'f-osc' : ''}"><div class="wrap"><p>© ${new Date().getFullYear()} ${esc(nombre)}</p></div></footer>`;

  const tit = E.mayusculas_titulos ? 'text-transform:uppercase;letter-spacing:.04em;' : '';
  const rad = `${E.radio}px`;
  const boton = E.botones === 'pildora' ? '999px' : rad;
  const css = `:root{--bg:${pal.fondo};--fg:${pal.texto};--suave:${pal.suave};--acc:${pal.acento};--acc-t:${pal.acentoTxt};--sobre-acc:${pal.sobreAcento};--alt:${pal.alterno};--alt-fg:${pal.textoAlterno};--osc:${pal.oscuro};--sobre-osc:${pal.sobreOscuro};--rad:${rad};--aire:${AIRE[E.aire]};--ancho:${ANCHO[E.ancho]}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--fg);font-family:'${par.cuerpo}',system-ui,sans-serif;font-size:18px;line-height:1.6}
img{display:block;max-width:100%}a{color:inherit}h1,h2,h3{font-family:'${par.titulos}',serif;font-weight:${E.peso_titulos};line-height:1.1;margin:0 0 .5em;${tit}}h1{font-size:${TAM[E.tam_titulos]}}h2{font-size:clamp(30px,4vw,52px)}h3{font-size:22px;font-family:'${par.cuerpo}',sans-serif;text-transform:none;letter-spacing:0;font-weight:600}
.wrap{width:min(100% - 40px,var(--ancho));margin:0 auto}.sec{padding:var(--aire) 0}.f-alt{background:var(--alt);color:var(--alt-fg)}.f-osc{background:var(--osc);color:var(--sobre-osc)}.f-acc{background:var(--acc);color:var(--sobre-acc)}
.btn{display:inline-block;padding:14px 26px;border-radius:${boton};font-weight:600;text-decoration:none;${E.botones === 'contorno' ? 'border:2px solid var(--acc-t);color:var(--acc-t);background:transparent' : 'background:var(--acc);color:var(--sobre-acc);border:2px solid var(--acc)'}}.btn.chico{padding:9px 18px;font-size:16px}.f-acc .btn,.btn.inv.f-acc{background:var(--sobre-acc);color:var(--acc);border-color:var(--sobre-acc)}.f-osc .btn{border-color:var(--acc)}
.fg{margin:0;overflow:hidden;border-radius:var(--rad);background:var(--alt)}.fg img{width:100%;height:100%;object-fit:cover}
.cab{position:sticky;top:0;z-index:20;background:var(--bg);border-bottom:1px solid color-mix(in srgb,var(--fg) 12%,transparent)}.cab-in{display:flex;align-items:center;gap:24px;min-height:72px}.cab nav{display:flex;gap:22px;margin-left:auto;font-size:16px}.cab nav a{text-decoration:none;white-space:nowrap}.marca{text-decoration:none;font-weight:700;font-family:'${par.titulos}',serif;font-size:22px}.marca .logo{max-height:48px;width:auto}
.e-centrado .cab-in{flex-wrap:wrap;justify-content:center}.e-centrado nav{margin:0}.cab.sobre-foto{position:absolute;left:0;right:0;background:transparent;border:0;color:#fff}.cab.sobre-foto .btn{background:#fff;color:#111;border-color:#fff}
.hero{position:relative}.h-txt .sub{font-size:clamp(18px,2vw,22px);color:var(--suave);max-width:40ch}.kick{text-transform:uppercase;letter-spacing:.12em;font-size:15px;color:var(--acc-t);margin:0 0 14px}.h-cta{margin-top:28px}
.h-full,.h-tarjeta{min-height:${P.alto === 'pantalla' ? '92vh' : P.alto === 'media' ? '72vh' : '56vh'};display:flex;align-items:flex-end;overflow:hidden}.h-fondo{position:absolute;inset:0;border-radius:0}.h-full .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,${(P.velo * 0.4).toFixed(2)}),rgba(0,0,0,${P.velo}))}.h-full .wrap{position:relative;padding:120px 0 72px;color:#fff}.h-full .sub,.h-full .kick{color:rgba(255,255,255,.9)}.h-full h1{color:#fff;max-width:16ch}.h-full .btn{background:#fff;color:#111;border-color:#fff}.a-centro .h-txt{text-align:center;margin:0 auto}.a-centro h1,.a-centro .sub{margin-left:auto;margin-right:auto}
.h-tarjeta .wrap{position:relative;padding:120px 0 56px}.tarjeta{background:var(--bg);color:var(--fg);padding:clamp(28px,4vw,52px);border-radius:var(--rad);max-width:620px}
.h-div,.h-mos,.h-centro,.h-grande{padding:clamp(48px,8vw,104px) 0}.h-grid{display:grid;gap:clamp(28px,5vw,64px);align-items:center}.h-centro .h-txt{text-align:center;max-width:30ch;margin:0 auto}.h-centro .sub{margin:0 auto}.h-grande .banda{margin-top:clamp(32px,5vw,64px)}.h-grande h1{max-width:18ch}.h-grande.a-centro h1{margin:0 auto .5em}
.mos{display:grid;gap:12px;grid-template-columns:1fr 1fr;grid-auto-rows:180px}.mos .fg:first-child{grid-row:span 2}.mos.m1{grid-template-columns:1fr;grid-auto-rows:360px}.mos.m1 .fg{grid-row:auto}
.intro{max-width:60ch;color:var(--suave)}.pie-sec{margin-top:36px}
.s-tarjetas{display:grid;gap:20px}.card{background:var(--bg);color:var(--fg);border:1px solid color-mix(in srgb,var(--fg) 14%,transparent);border-radius:var(--rad);padding:28px;margin:0}.f-alt .card{background:var(--bg)}.card p{margin:0 0 10px}.card cite{font-style:normal;font-weight:600}
.precio{font-style:normal;font-weight:700;color:var(--acc-t)}.f-osc .precio,.f-acc .precio{color:inherit}
.s-lista{list-style:none;margin:0;padding:0}.s-lista li{display:flex;gap:24px;justify-content:space-between;align-items:baseline;padding:22px 0;border-bottom:1px solid color-mix(in srgb,currentColor 20%,transparent)}.s-lista p{margin:0;color:inherit;opacity:.85}
.s-filas article{display:grid;grid-template-columns:64px 1fr;gap:4px 20px;padding:26px 0;border-top:1px solid color-mix(in srgb,currentColor 20%,transparent)}.s-filas .n{grid-row:span 3;font-family:'${par.titulos}',serif;font-size:28px;color:var(--acc-t)}.s-filas p{margin:0}
.g{display:grid;gap:14px}.g-mos{display:grid;gap:14px;grid-template-columns:1fr 1fr;grid-auto-rows:170px;grid-auto-flow:dense}.g-mos .grande{grid-column:span 2;grid-row:span 2}.carr{display:grid;grid-auto-flow:column;grid-auto-columns:min(78%,340px);gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}.carr .fg{scroll-snap-align:start}.banda-f{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:14px}
.dos{display:grid;gap:clamp(28px,5vw,64px);align-items:center}.centro{text-align:center;max-width:62ch;margin:0 auto}.cita{font-family:'${par.titulos}',serif;font-size:clamp(22px,2.6vw,32px);line-height:1.35;margin:0;max-width:40ch}
.cita-g{margin:0 0 40px;text-align:center}.cita-g blockquote{font-family:'${par.titulos}',serif;font-size:clamp(26px,3.4vw,44px);line-height:1.25;margin:0 auto 16px;max-width:30ch}.cita-g figcaption{font-weight:600}
.pasos{list-style:none;padding:0;margin:0;display:grid;gap:20px;counter-reset:p}.pasos li{counter-increment:p;padding:26px;border-radius:var(--rad);border:1px solid color-mix(in srgb,currentColor 18%,transparent)}.pasos li::before{content:counter(p,decimal-leading-zero);display:block;font-family:'${par.titulos}',serif;font-size:30px;color:var(--acc-t);margin-bottom:8px}.f-osc .pasos li::before,.f-acc .pasos li::before{color:inherit}
.linea{list-style:none;padding:0 0 0 28px;margin:0;border-left:2px solid var(--acc)}.linea li{position:relative;padding:0 0 28px 8px}.linea li::before{content:'';position:absolute;left:-37px;top:6px;width:16px;height:16px;border-radius:50%;background:var(--acc)}.linea p,.pasos p{margin:0}
.faq details{border-bottom:1px solid color-mix(in srgb,currentColor 20%,transparent);padding:18px 0}.faq summary{cursor:pointer;font-weight:600}.faq p{margin:10px 0 0}
.banda-cta .wrap{display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between}.banda-cta .frase{font-family:'${par.titulos}',serif;font-size:clamp(24px,3vw,38px);margin:0;max-width:30ch;${tit}}
.datos{list-style:none;padding:0;margin:0}.datos li{padding:12px 0;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}.datos span{display:block;font-size:15px;opacity:.75}.ct .sub{color:inherit;opacity:.85}.rs{margin-top:18px;--p:var(--fg);--on:var(--bg)}.f-osc .rs{--p:var(--sobre-osc);--on:var(--osc)}.f-acc .rs{--p:var(--sobre-acc);--on:var(--acc)}
.pie{padding:28px 0;font-size:16px}.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(min-width:900px){.h-div .h-grid{grid-template-columns:1.05fr .95fr}.h-div.lado-izquierda .h-grid>.fg{order:-1}.h-mos .h-grid{grid-template-columns:1fr 1fr}.mos{grid-auto-rows:220px}.s-tarjetas.c2{grid-template-columns:repeat(2,1fr)}.s-tarjetas.c3{grid-template-columns:repeat(3,1fr)}.s-tarjetas.c4{grid-template-columns:repeat(4,1fr)}.g.c2{grid-template-columns:repeat(2,1fr)}.g.c3{grid-template-columns:repeat(3,1fr)}.g.c4{grid-template-columns:repeat(4,1fr)}.g-mos{grid-template-columns:repeat(4,1fr);grid-auto-rows:230px}.banda-f{grid-template-columns:repeat(4,1fr)}.dos{grid-template-columns:1fr 1fr}.pasos{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}}
@media(max-width:899px){.cab nav{display:none}.cab .btn.chico{margin-left:auto}}
${CSS_REDES}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nombre)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(urlFuentes([par]))}"><style>${css}</style></head><body>${encabezado}<main>${portada}${cuerpo}</main>${pie}</body></html>`;
  return { html, fuentes: { titulos: par.titulos, cuerpo: par.cuerpo, estilo: par.estilo }, paleta: { bg: pal.fondo, fg: pal.texto, acc: pal.acento, mut: pal.alterno } };
}
