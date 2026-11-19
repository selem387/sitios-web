// Opción F de restaurantes y cafeterías: "Minimalista tipo carta" (etapa 3, parte 1, 18-nov-2026). Movida tal cual desde
// propuestas_html.js: paleta, portada sin slider, portada con slider y orden de secciones. La plantilla común de
// restaurante (generador/restaurante/plantilla.js) pone el resto; el HTML es idéntico al de antes.
export const opcion = {
  nombre: 'lista', letra: 'F', indice: 5, titulo: 'Minimalista tipo carta', giro: 'restaurante',
  paleta: ({ b, crema, tinta, mezclar }) => ({ bg: mezclar(crema, '#FFFFFF', 0.5), fg: tinta, primary: b.acento, accent: b.principal, muted: mezclar(b.acento, '#FFFFFF', 0.82), card: '#FFFFFF' }),
  portada: ({ esc, d, wa, info, heroImgs }) => `<section class="hero h-lista"><div class="circulo"><img src="${esc(heroImgs[0])}" alt=""></div><h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><a class="btn ancho"${wa}>${esc(d.textos.cta)}</a></section>`,
  portadaSlider: ({ esc, d, wa, sliderHTML, emp, imgS, txtH, ctasH, infoH, marco }) => `<section class="hero hs hs-carta">${marco('hs-f')}<div class="c-a"><p class="kicker">${esc(d.brief?.negocio?.giro_texto || '')}</p>${txtH}</div><div class="c-b">${ctasH()}${infoH()}</div></section>`,
  orden: ({ secDest, secCats, secMenu, secRes, vis }) => [secMenu, secDest, secRes, vis],
};
