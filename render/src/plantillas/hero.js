// Primera pantalla (hero + una sección de apoyo) a 390 px, parametrizada por estilo y subtipo.
// Recibe los datos ya resueltos por el backend (diseno_estilos + arquetipos.diseno[subtipo] + brief).
// No consulta la base ni ningún modelo: HTML + CSS determinista para que las 3 opciones sean comparables.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Layout por estilo. Cada uno cambia composición, no solo colores, para que la diferencia se note en el celular.
const LAYOUT = {
  minimalista: 'centrado',
  tradicional: 'centrado',
  elegante: 'editorial',
  lujo: 'editorial',
  fresco: 'bloques',
  divertido: 'bloques',
  calido: 'tarjeta',
  tecnologico: 'bento',
};

const PX = { '0px': '0px', '2px': '2px', '4px': '4px', '8px': '8px', '12px': '12px', '16px': '16px', '24px': '24px' };
const SOMBRA = { none: 'none', plana: '4px 4px 0 var(--fg)', suave: '0 8px 24px rgba(0,0,0,.08)', blanda: '0 10px 30px rgba(0,0,0,.12), inset -2px -2px 8px rgba(0,0,0,.05)' };
const ESPACIO = { compacto: '20px', medio: '28px', amplio: '40px', 'muy amplio': '56px' };

function fuentes(tipografia) {
  const t = tipografia?.titulos || 'DM Sans';
  const c = tipografia?.cuerpo || 'DM Sans';
  const fam = [...new Set([t, c])].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600;700`).join('&');
  return { url: `https://fonts.googleapis.com/css2?${fam}&display=swap`, titulos: t, cuerpo: c };
}

/**
 * @param {object} d
 * @param {{nombre:string, giro_texto:string, ciudad:string}} d.negocio
 * @param {string} d.titular   frase del hero (si falta: nombre + giro + ciudad)
 * @param {string} d.subtitulo diferenciador (opcional)
 * @param {string} d.cta       texto del botón principal
 * @param {string[]} d.servicios  hasta 3 nombres para la sección de apoyo
 * @param {string} d.prueba    señal de confianza ("+12 años", "4.9 ★ en Google")
 * @param {object} d.estilo    fila de diseno_estilos: {slug, tipografia, theme_json_hints}
 * @param {object} d.subtipo   arquetipos.diseno->subtipos->X: {paleta, consideraciones}
 * @param {string[]} d.colores_marca  hex del cliente (mandan sobre la paleta del subtipo)
 * @param {string} d.foto_url  foto real; si falta se usa relleno
 * @param {string} d.etiqueta  "A" | "B" | "C"
 */
export function heroHTML(d) {
  const slug = d.estilo?.slug || 'minimalista';
  const layout = LAYOUT[slug] || 'centrado';
  const h = d.estilo?.theme_json_hints || {};
  const pal = { ...(d.subtipo?.paleta || {}) };
  const marca = (d.colores_marca || []).filter((c) => /^#?[0-9a-f]{6}$/i.test(c)).map((c) => (c.startsWith('#') ? c : `#${c}`));
  if (marca[0]) pal.primary = marca[0];
  if (marca[1]) pal.accent = marca[1];
  const f = fuentes(d.estilo?.tipografia);
  const radius = PX[h.radius] || '8px';
  const sombra = SOMBRA[h.shadow] || 'none';
  const esp = ESPACIO[h.spacing] || '28px';
  const oscuro = layout === 'editorial';
  const bg = oscuro ? (pal.foreground || '#111') : (pal.background || '#fff');
  const fg = oscuro ? '#fff' : (pal.foreground || '#111');
  const titular = d.titular || `${d.negocio?.nombre || 'Tu negocio'}: ${d.negocio?.giro_texto || ''}${d.negocio?.ciudad ? ` en ${d.negocio.ciudad}` : ''}`;
  const servicios = (d.servicios || []).slice(0, 3);
  const relleno = `linear-gradient(135deg, ${pal.secondary || pal.primary || '#888'} 0%, ${pal.primary || '#555'} 100%)`;
  // Foto encima del degradado: si la imagen no carga, se ve el relleno y no un hueco.
  // Producto sin fondo (PNG transparente): se muestra completo sobre un fondo suave, nunca recortado a los lados.
  const foto = d.foto_url ? (d.foto_sin_fondo ? `url('${esc(d.foto_url)}') center bottom/contain no-repeat, ${pal.muted || '#F3EDE3'}` : `url('${esc(d.foto_url)}') center/cover no-repeat, ${relleno}`) : relleno;

  const css = `
  :root{--p:${pal.primary || '#1E3A8A'};--on-p:${pal.on_primary || '#fff'};--acc:${pal.accent || '#B45309'};--on-acc:${pal.on_accent || '#fff'};
    --bg:${bg};--fg:${fg};--card:${pal.card || '#fff'};--muted:${pal.muted || '#eee'};--mutedfg:${pal.muted_foreground || '#555'};--border:${pal.border || '#ddd'};
    --r:${radius};--sh:${sombra};--esp:${esp};--ft:'${f.titulos}',serif;--fc:'${f.cuerpo}',sans-serif}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:390px;height:844px;overflow:hidden;background:var(--bg);color:var(--fg);font-family:var(--fc);font-size:16px;line-height:1.45;-webkit-font-smoothing:antialiased}
  .tag{display:inline-block;vertical-align:middle;margin-right:8px;background:#111;color:#fff;font:700 13px/1 var(--fc);padding:6px 9px;border-radius:999px;letter-spacing:.02em} .editorial .tag{background:#fff;color:#111}
  header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;font-weight:700}
  header span{font-family:var(--ft);display:flex;align-items:center} header img.logo{height:40px;max-width:170px;object-fit:contain;display:block} .editorial header img.logo{background:rgba(255,255,255,.92);border-radius:6px;padding:3px 6px} header i{display:inline-block;width:22px;height:2px;background:currentColor;box-shadow:0 6px 0 currentColor,0 -6px 0 currentColor}
  h1{font-family:var(--ft);font-weight:700;line-height:1.1;letter-spacing:-.01em}
  p.sub{color:var(--mutedfg);margin-top:10px}
  .btn{display:inline-block;background:var(--acc);color:var(--on-acc);font-weight:700;padding:14px 22px;border-radius:var(--r);box-shadow:var(--sh);margin-top:18px}
  .prueba{margin-top:14px;font-size:14px;color:var(--mutedfg)} .prueba b{color:var(--fg)}
  .foto{background:var(--foto)}
  section.apoyo{padding:var(--esp) 20px 0} .apoyo h2{font-family:var(--ft);font-size:20px;margin-bottom:12px}
  .cards{display:grid;gap:10px} .card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;box-shadow:var(--sh);font-weight:600;font-size:15px}
  .wa{position:absolute;right:16px;bottom:16px;width:52px;height:52px;border-radius:50%;background:#25D366;box-shadow:0 6px 18px rgba(0,0,0,.2)}

  /* centrado: mucho aire, texto primero, foto abajo */
  .centrado .hero{padding:var(--esp) 24px 0;text-align:center}
  .centrado h1{font-size:34px}
  .centrado .foto{height:230px;margin:24px 20px 0;border-radius:var(--r)}

  /* editorial: foto a sangre con texto encima, serif grande */
  .editorial{background:var(--bg)} .editorial header{position:absolute;width:100%;color:#fff;z-index:2}
  .editorial .hero{position:relative;height:560px;display:flex;align-items:flex-end;padding:0 22px 28px;color:#fff}
  .editorial .hero::before{content:"";position:absolute;inset:0;background:var(--foto)}
  .editorial .hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.75) 100%)}
  .editorial .hero>div{position:relative;z-index:1} .editorial h1{font-size:40px} .editorial p.sub{color:#eee}
  .editorial .btn{background:#fff;color:#111} .editorial .card{background:transparent;color:#fff;border-color:rgba(255,255,255,.25)} .editorial .apoyo h2{color:#fff} .editorial .prueba{color:#ddd} .editorial .prueba b{color:#fff}

  /* bloques: fondo de color pleno, bordes gruesos, foto en bloque */
  .bloques .hero{background:var(--p);color:var(--on-p);padding:var(--esp) 22px 26px}
  .bloques h1{font-size:36px} .bloques p.sub{color:var(--on-p);opacity:.85}
  .bloques .foto{height:200px;margin:-12px 20px 0;border-radius:var(--r);border:3px solid var(--fg);box-shadow:var(--sh);position:relative;top:20px}
  .bloques .cards{grid-template-columns:1fr 1fr} .bloques .card:first-child{grid-column:1/-1}
  .bloques section.apoyo{padding-top:calc(var(--esp) + 16px)}

  /* tarjeta: foto arriba redondeada, tono cálido */
  .tarjeta .foto{height:300px;margin:0 16px;border-radius:0 0 var(--r) var(--r)}
  .tarjeta .hero{padding:22px 24px 0} .tarjeta h1{font-size:32px}
  .tarjeta .card{border:none;background:var(--muted)}

  /* bento: rejilla de tarjetas de distinto tamaño */
  .bento .hero{padding:16px 16px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .bento .celda{background:var(--card);border-radius:var(--r);padding:14px;box-shadow:var(--sh);border:1px solid var(--border)}
  .bento .celda.t{grid-column:1/-1} .bento h1{font-size:30px}
  .bento .foto{grid-column:1/-1;height:170px;border-radius:var(--r)}
  .bento .celda.n{display:flex;flex-direction:column;justify-content:center;font-weight:700} .bento .celda.n small{font-weight:400;color:var(--mutedfg)}
  .bento .cards{grid-template-columns:1fr 1fr 1fr} .bento .card{font-size:13px;padding:10px}
  `;

  const bloqueHero = {
    centrado: `<section class="hero"><h1>${esc(titular)}</h1>${d.subtitulo ? `<p class="sub">${esc(d.subtitulo)}</p>` : ''}<a class="btn">${esc(d.cta || 'Escríbenos por WhatsApp')}</a>${d.prueba ? `<p class="prueba"><b>${esc(d.prueba)}</b></p>` : ''}</section><div class="foto"></div>`,
    editorial: `<section class="hero"><div><h1>${esc(titular)}</h1>${d.subtitulo ? `<p class="sub">${esc(d.subtitulo)}</p>` : ''}<a class="btn">${esc(d.cta || 'Escríbenos por WhatsApp')}</a>${d.prueba ? `<p class="prueba"><b>${esc(d.prueba)}</b></p>` : ''}</div></section>`,
    bloques: `<section class="hero"><h1>${esc(titular)}</h1>${d.subtitulo ? `<p class="sub">${esc(d.subtitulo)}</p>` : ''}<a class="btn">${esc(d.cta || 'Escríbenos por WhatsApp')}</a></section><div class="foto"></div>`,
    tarjeta: `<div class="foto"></div><section class="hero"><h1>${esc(titular)}</h1>${d.subtitulo ? `<p class="sub">${esc(d.subtitulo)}</p>` : ''}<a class="btn">${esc(d.cta || 'Escríbenos por WhatsApp')}</a>${d.prueba ? `<p class="prueba"><b>${esc(d.prueba)}</b></p>` : ''}</section>`,
    bento: `<section class="hero"><div class="celda t"><h1>${esc(titular)}</h1>${d.subtitulo ? `<p class="sub">${esc(d.subtitulo)}</p>` : ''}</div><div class="foto"></div><div class="celda n">${esc(d.prueba || 'Atención rápida')}<small>${esc(d.negocio?.ciudad || '')}</small></div><div class="celda n"><a class="btn" style="margin:0">${esc(d.cta || 'WhatsApp')}</a></div></section>`,
  }[layout];

  const apoyo = servicios.length
    ? `<section class="apoyo"><h2>${esc(d.titulo_apoyo || 'Lo que ofrecemos')}</h2><div class="cards">${servicios.map((s) => `<div class="card">${esc(s)}</div>`).join('')}</div></section>`
    : '';

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=390"><link rel="stylesheet" href="${f.url}"><style>${css}</style></head>
<body class="${layout}" style="--foto:${foto}">
<header><span>${d.etiqueta ? `<span class="tag">${esc(d.etiqueta)}</span>` : ''}${d.logo_url ? `<img class="logo" src="${esc(d.logo_url)}" alt="${esc(d.negocio?.nombre || '')}">` : esc(d.negocio?.nombre || '')}</span><i></i></header>
${bloqueHero}${apoyo}<div class="wa"></div></body></html>`;
}

export const ESTILOS_CON_LAYOUT = Object.keys(LAYOUT);
