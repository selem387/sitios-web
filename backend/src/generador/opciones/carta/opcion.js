// Opción F "Minimalista": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { esc } from '../../kit/utiles.js';
import { filaJustificada } from '../../movimiento.js';
import { mezclar } from '../../../entrevista/tema.js';

export const opcion = {
  nombre: 'carta', letra: 'F', indice: 5, titulo: 'Minimalista',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: {},
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, papel, tinta }) => ({ bg: mezclar(papel, '#FFFFFF', 0.65), fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.5) }),
  base: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // CSS propio (etapa 2, parte 2): portada → con los héroes; galeria → tras las reglas de galería; ancho → dentro de @media (min-width:900px).
    cssBase: {
      portada: `.h-carta{padding-top:36px;padding-bottom:32px}.h-carta h1{max-width:16ch}.h-carta .sub{max-width:46ch}@media (min-width:900px){.h-carta{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);column-gap:clamp(40px,5vw,88px);align-items:end;padding-top:56px;padding-bottom:40px}.h-carta .tit{grid-column:1}.h-carta h1{max-width:none;margin:0;font-size:clamp(52px,5.4vw,88px);line-height:1}.h-carta .lado{grid-column:2;padding-bottom:.35em}.h-carta .lado .sub{max-width:38ch;margin-top:0}.h-carta .lado .btn{margin-top:22px}}body.l-carta .paq{background:none;border:0;border-top:2px solid var(--fg);border-radius:0;padding:18px 0}`,
      galeria: `.g-carta img{border-radius:4px}`,
    },
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
