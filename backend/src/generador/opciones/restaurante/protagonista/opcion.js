// Opción A de restaurantes y cafeterías: "Producto protagonista" (etapa 3, parte 1, 18-nov-2026). Movida tal cual desde
// propuestas_html.js: paleta, portada sin slider, portada con slider y orden de secciones. La plantilla común de
// restaurante (generador/restaurante/plantilla.js) pone el resto; el HTML es idéntico al de antes.
export const opcion = {
  nombre: 'protagonista', letra: 'A', indice: 0, titulo: 'Producto protagonista', giro: 'restaurante',
  paleta: ({ b, crema, tinta, mezclar }) => ({ bg: crema, fg: tinta, primary: b.principal, accent: b.acento, muted: mezclar(crema, b.principal, 0.08), card: '#FFFFFF' }),
  portada: ({ esc, d, wa, info, heroImgs }) => `<section class="hero h-prot"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><div class="ctas"><a class="btn"${wa}>${esc(d.textos.cta)}</a><a class="lnk" href="#menu">Ver menú</a></div><ul class="info">${info}</ul></div><div class="vis1"><img src="${esc(heroImgs[0])}" alt=""></div></section>`,
  portadaSlider: ({ esc, d, wa, sliderHTML, emp, imgS, txtH, ctasH, infoH, marco }) => sliderHTML({
      fotos: emp.fotos, diapos: emp.diapos, img: imgS, cta: d.textos.cta, href: wa, tag: 'section', clase: 'hero h-sl', nombre: d.nombre,
      primera: `${txtH}${ctasH()}`,
    }).html,
  orden: ({ secDest, secCats, secMenu, secRes, vis }) => [secDest, secCats, secMenu, secRes, vis],
};
