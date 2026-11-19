// Opción E de restaurantes y cafeterías: "Dos tonos" (etapa 3, parte 1, 18-nov-2026). Movida tal cual desde
// propuestas_html.js: paleta, portada sin slider, portada con slider y orden de secciones. La plantilla común de
// restaurante (generador/restaurante/plantilla.js) pone el resto; el HTML es idéntico al de antes.
export const opcion = {
  nombre: 'dostonos', letra: 'E', indice: 4, titulo: 'Dos tonos', giro: 'restaurante',
  paleta: ({ b, crema, tinta, mezclar }) => ({ bg: crema, fg: tinta, primary: b.principal, accent: b.acento, muted: mezclar(b.principal, '#000000', 0.1), card: '#FFFFFF' }),
  portada: ({ esc, d, wa, info, heroImgs }) => `<section class="hero h-dos"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><a class="btn inv"${wa}>${esc(d.textos.cta)}</a></div><div class="vasos">${heroImgs.slice(0, 2).map((u) => `<img src="${esc(u)}" alt="">`).join('')}</div></section>`,
  portadaSlider: ({ esc, d, wa, sliderHTML, emp, imgS, txtH, ctasH, infoH, marco }) => `<section class="hero hs hs-banda"><div class="banda"><div class="txt">${txtH}${ctasH('inv')}</div></div>${marco('hs-f')}</section>`,
  orden: ({ secDest, secCats, secMenu, secRes, vis }) => [secRes, secCats, secDest, secMenu, vis],
};
