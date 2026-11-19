// Opción D de restaurantes y cafeterías: "Tu logo al centro" (etapa 3, parte 1, 18-nov-2026). Movida tal cual desde
// propuestas_html.js: paleta, portada sin slider, portada con slider y orden de secciones. La plantilla común de
// restaurante (generador/restaurante/plantilla.js) pone el resto; el HTML es idéntico al de antes.
export const opcion = {
  nombre: 'mascota', letra: 'D', indice: 3, titulo: 'Tu logo al centro', giro: 'restaurante',
  paleta: ({ b, crema, tinta, mezclar }) => ({ bg: crema, fg: tinta, primary: b.principal, accent: b.acento, muted: mezclar(crema, b.principal, 0.1), card: '#FFFFFF' }),
  portada: ({ esc, d, wa, info, heroImgs }) => `<section class="hero h-masc">${d.logo ? `<img class="logo-grande" src="${esc(d.logo)}" alt="${esc(d.nombre)}">` : ''}<h1>${esc(d.textos.titular)}</h1><p class="sub">${esc(d.textos.subtitulo)}</p><div class="trio">${heroImgs.slice(0, 3).map((u, i) => `<img class="${i === 1 ? 'c' : ''}" src="${esc(u)}" alt="">`).join('')}</div><a class="btn ancho"${wa}>${esc(d.textos.cta)}</a><ul class="info centro">${info}</ul></section>`,
  portadaSlider: ({ esc, d, wa, sliderHTML, emp, imgS, txtH, ctasH, infoH, marco }) => `<section class="hero hs hs-arco h-logo">${d.logo ? `<img class="logo-grande" src="${esc(d.logo)}" alt="${esc(d.nombre)}">` : ''}${txtH}${marco('hs-f')}${ctasH()}${infoH('centro')}</section>`,
  orden: ({ secDest, secCats, secMenu, secRes, vis }) => [secCats, secDest, secMenu, secRes, vis],
};
