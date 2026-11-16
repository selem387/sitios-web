// Opción F "Minimalista": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { esc } from '../../kit/utiles.js';
import { filaJustificada } from '../../movimiento.js';
import { mezclar } from '../../../entrevista/tema.js';

export const opcion = {
  nombre: 'carta', letra: 'F', indice: 5, titulo: 'Minimalista',
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, papel, tinta }) => ({ bg: mezclar(papel, '#FFFFFF', 0.65), fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.5) }),
  base: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    portada: (c) => {
      const { d, t, usadas, img, fotosT, cta, poolSl, slider } = c;
      const armar = () => { const s = poolSl.length ? `<div class="wrap">${slider({ tag: 'figure', clase: 'sl-carta sl-marco' })}</div>` : ''; const resto = s ? [] : fotosT.filter((x) => !usadas.has(x.url)).slice(0, 8); return `<section class="hero h-carta wrap"><div class="tit"><p class="kicker">${esc(d.nombre)}</p><h1>${esc(t.titular)}</h1></div><div class="lado"><p class="sub">${esc(t.subtitulo)}</p>${cta()}</div></section>${s}${resto.length ? `<div class="wrap">${filaJustificada(resto, img)}</div>` : ''}`; };
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto } = s;
      return [secServicios, secSobre, secEquipo, secResenas, secTrabajo, procCli, secFaq, secVideo, secContacto];
    },
  },
};
