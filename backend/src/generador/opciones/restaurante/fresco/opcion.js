// Opción C de restaurantes y cafeterías: "Fresca con acento" (etapa 3, parte 1, 18-nov-2026). Movida tal cual desde
// propuestas_html.js: paleta, portada sin slider, portada con slider y orden de secciones. La plantilla común de
// restaurante (generador/restaurante/plantilla.js) pone el resto; el HTML es idéntico al de antes.
export const opcion = {
  nombre: 'fresco', letra: 'C', indice: 2, titulo: 'Fresca con acento', giro: 'restaurante',
  paleta: ({ b, crema, tinta, mezclar }) => ({ bg: crema, fg: tinta, primary: b.acento, accent: b.principal, muted: mezclar(b.claro, b.principal, 0.1), card: mezclar(crema, '#FFFFFF', 0.6) }),
  portada: ({ esc, d, wa, info, heroImgs }) => `<section class="hero h-fresco"><div class="caja"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p></div><div class="vasos">${heroImgs.slice(0, 2).map((u) => `<img src="${esc(u)}" alt="">`).join('')}</div></div><a class="btn ancho"${wa}>${esc(d.textos.cta)}</a></section>`,
  portadaSlider: ({ esc, d, wa, sliderHTML, emp, imgS, txtH, ctasH, infoH, marco }) => `<section class="hero hs hs-caja"><div class="caja"><div class="txt" style="text-align:center">${txtH}${ctasH()}</div>${marco('hs-f')}</div></section>`,
  orden: ({ secDest, secCats, secMenu, secRes, vis }) => [secDest, secRes, secMenu, secCats, vis],
};
