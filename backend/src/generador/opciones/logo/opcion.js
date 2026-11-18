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
    portada: (c) => {
      const { d, p, t, mat, heroFoto, cta, slider } = c;
      const armar = () => `<section class="hero h-logo wrap">${mat.logo ? logoHTML(mat.logo, p.bg, p.fg, { clase: 'logo-grande', alt: d.nombre }) : `<p class="nombre-grande">${esc(d.nombre)}</p>`}<h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}${heroFoto ? slider({ tag: 'figure', clase: 'ovalo sl-marco' }) : ''}</section>`;
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto } = s;
      return [secTrabajo, secSobre, secEquipo, secServicios, secResenas, procCli, secFaq, secVideo, secContacto];
    },
    js: () => JS_LOGO_UNICO,
  },
};
