// Opción D "Tu logo al centro": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { esc, logoHTML, JS_LOGO_UNICO } from '../../kit/utiles.js';
import { mezclar } from '../../../entrevista/tema.js';

export const opcion = {
  nombre: 'logo', letra: 'D', indice: 3, titulo: 'Tu logo al centro',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { logo: true },
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, tinta }) => ({ bg: mezclar(tinte, '#FFFFFF', 0.45), fg: tinta, primary: base, muted: '#FFFFFF' }),
  base: true,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // CSS propio (etapa 2, parte 2): portada → con los héroes; galeria → tras las reglas de galería; ancho → dentro de @media (min-width:900px).
    cssBase: {
      portada: `.h-logo{text-align:center;padding-top:40px;padding-bottom:10px}.h-logo .sub{margin:16px auto 0}.logo-grande{height:auto;width:min(84%,460px);margin:0 auto 26px;display:block}.logo-grande.logo-letras{width:min(46%,200px)}
.nombre-grande{font-family:var(--ft);font-size:44px;margin-bottom:20px}.ovalo{width:min(78%,380px);margin:38px auto 0;border-radius:50%;overflow:hidden;aspect-ratio:3/4;border:8px solid var(--mut)}.ovalo img{width:100%;height:100%;object-fit:cover}
body.l-logo .barra .logo,body.l-logo .barra [class$="-placa"]{transition:opacity .3s ease}body.l-logo .barra:not(.ver-logo) .logo,body.l-logo .barra:not(.ver-logo) [class$="-placa"]{opacity:0;pointer-events:none}`,
      galeria: `.g-logo img{border-radius:999px 999px 14px 14px}`,
    },
    portada: (c) => {
      const { d, p, t, mat, heroFoto, cta, slider } = c;
      const armar = () => `<section class="hero h-logo wrap">${mat.logo ? logoHTML(mat.logo, p.bg, p.fg, { clase: 'logo-grande', alt: d.nombre }) : mat.logoLetras?.url ? `<img class="logo-grande logo-letras" src="${esc(mat.logoLetras.url)}" alt="${esc(d.nombre)}" width="${mat.logoLetras.ancho}" height="${mat.logoLetras.alto}">` : `<p class="nombre-grande">${esc(d.nombre)}</p>`}<h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}${heroFoto ? slider({ tag: 'figure', clase: 'ovalo sl-marco' }) : ''}</section>`;
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto } = s;
      return [secTrabajo, secSobre, secEquipo, secServicios, secResenas, procCli, secFaq, secVideo, secContacto];
    },
    js: () => JS_LOGO_UNICO,
  },
};
