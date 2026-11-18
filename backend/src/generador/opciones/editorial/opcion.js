// Opción B "Editorial": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { esc, giroCorto } from '../../kit/utiles.js';
import { mezclar } from '../../../entrevista/tema.js';

export const opcion = {
  nombre: 'editorial', letra: 'B', indice: 1, titulo: 'Editorial',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { fotoBuena: 1 },
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, tinta }) => ({ bg: '#FFFFFF', fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.55) }),
  base: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    portada: (c) => {
      const { t, neg, heroFoto, cta, info, slider } = c;
      const armar = () => `<section class="hero h-edit wrap"><div class="txt"><p class="kicker">${esc(giroCorto(neg.giro_texto) || '')}</p><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}<ul class="info">${info}</ul></div>${heroFoto ? slider({ tag: 'figure', clase: 'arco sl-marco' }) : ''}</section>`;
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto } = s;
      return [secSobre, secTrabajo, secEquipo, secServicios, secResenas, procCli, secFaq, secVideo, secContacto];
    },
  },
};
