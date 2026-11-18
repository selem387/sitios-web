// Opción C "Mosaico de tu trabajo": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { esc } from '../../kit/utiles.js';
import { mezclar } from '../../../entrevista/tema.js';

export const opcion = {
  nombre: 'mosaico', letra: 'C', indice: 2, titulo: 'Mosaico de tu trabajo',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { fotosTrabajo: 3 },
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, papel, tinta }) => ({ bg: papel, fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.35) }),
  base: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    portada: (c) => {
      const { t, usadas, img, fotosT, cta, poolSl, enPortada, slider } = c;
      const armar = () => { const s = poolSl.length ? slider({ tag: 'div', clase: 'mos-sl sl-marco' }) : ''; const m = fotosT.filter((x) => !usadas.has(x.url)).slice(0, s ? 4 : 5); return `<section class="hero h-mos wrap"><h1>${esc(t.titular)}</h1><p class="sub">${esc(t.subtitulo)}</p>${cta()}<div class="mos m${m.length + (s ? 1 : 0)}${s && m.length < 2 ? ' solo' : ''}">${s}${m.map((x, k) => { enPortada.add(x.url); return img(x, { eager: k < 1, cls: 'rep-ok' }); }).join('')}</div></section>`; };
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      return [secServicios, secTrabajo, secResenas, secSobre, secEquipo, secProceso, secFaq, secVideo, secContacto];
    },
  },
};
