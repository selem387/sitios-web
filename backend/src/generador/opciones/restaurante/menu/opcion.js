// Opción B de restaurantes y cafeterías: "Tu menú al frente" (etapa 3, parte 1, 18-nov-2026). Movida tal cual desde
// propuestas_html.js: paleta, portada sin slider, portada con slider y orden de secciones. La plantilla común de
// restaurante (generador/restaurante/plantilla.js) pone el resto; el HTML es idéntico al de antes.
export const opcion = {
  nombre: 'menu', letra: 'B', indice: 1, titulo: 'Tu menú al frente', giro: 'restaurante',
  paleta: ({ b, crema, tinta, mezclar }) => ({ bg: mezclar(b.principal, '#000000', 0.2), fg: crema, primary: crema, accent: b.acento, muted: mezclar(b.principal, '#000000', 0.05), card: mezclar(b.principal, '#FFFFFF', 0.08) }),
  portada: ({ esc, d, wa, info, heroImgs }) => `<section class="hero h-menu"><div class="txt"><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><a class="btn"${wa}>${esc(d.textos.cta)}</a></div><div class="vasos">${heroImgs.slice(0, 3).map((u, k) => `<img class="${k === 1 ? 'c' : ''}" src="${esc(u)}" alt="">`).join('')}</div></section>`,
  portadaSlider: ({ esc, d, wa, sliderHTML, emp, imgS, txtH, ctasH, infoH, marco }) => `<section class="hero hs hs-lado"><div class="txt">${txtH}${ctasH()}${infoH()}</div>${marco('hs-f')}</section>`,
  orden: ({ secDest, secCats, secMenu, secRes, vis }) => [secMenu, secDest, secCats, secRes, vis],
};
