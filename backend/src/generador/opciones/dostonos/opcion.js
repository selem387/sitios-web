// Opción E "Dos tonos": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { esc } from '../../kit/utiles.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'dostonos', letra: 'E', indice: 4, titulo: 'Dos tonos',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: {},
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, papel, tinta }) => ({ bg: '#FFFFFF', fg: tinta, primary: base, muted: papel, banda: conContraste(tono(base, 0.3, 0.2, 0.32), '#FFFFFF', 7) }),
  base: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    portada: (c) => {
      const { t, heroFoto, cta, slider } = c;
      const armar = () => `<section class="hero h-dos"><div class="wrap in"><div class="txt"><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta('inv')}</div>${heroFoto ? slider({ tag: 'figure', clase: 'marco sl-marco' }) : ''}</div></section>`;
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto } = s;
      return [secServicios, secTrabajo, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto];
    },
  },
};
