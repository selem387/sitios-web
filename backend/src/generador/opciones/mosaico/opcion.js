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
    // CSS propio (etapa 2, parte 2): portada → con los héroes; galeria → tras las reglas de galería; ancho → dentro de @media (min-width:900px).
    cssBase: {
      portada: `.h-mos{padding-top:40px;text-align:left}.mos{display:grid;gap:8px;margin-top:34px;grid-template-columns:repeat(2,1fr)}.mos>img{width:100%;height:100%;object-fit:cover;border-radius:14px;aspect-ratio:1}.mos>:first-child{grid-column:span 2;aspect-ratio:16/10}.mos-sl{border-radius:14px}.mos>.mos-sl{aspect-ratio:4/5}.mos.solo{grid-template-columns:1fr!important}.mos.solo>.mos-sl{grid-column:1/-1!important;grid-row:auto!important;aspect-ratio:4/5!important}.mos.solo>img{aspect-ratio:16/10}
`,
      ancho: `.mos{grid-template-columns:repeat(4,1fr)}.mos>:first-child{grid-column:span 2;grid-row:span 2;aspect-ratio:auto}.mos-sl{min-height:380px}.mos.solo>.mos-sl{aspect-ratio:16/8!important;min-height:0}`,
    },
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
