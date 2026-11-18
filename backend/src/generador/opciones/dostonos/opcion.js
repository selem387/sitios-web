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
    // CSS propio (etapa 2, parte 2): portada → con los héroes; galeria → tras las reglas de galería; ancho → dentro de @media (min-width:900px).
    cssBase: {
      portada: `.h-dos{background:var(--banda);color:#fff;padding:42px 0 clamp(32px,4vw,56px);border-radius:0 0 36px 36px}.h-dos .in{display:grid;gap:26px}.h-dos .txt{padding-bottom:clamp(40px,5vw,72px)}.h-dos .sub{color:rgba(255,255,255,.86)}.marco{border-radius:24px;overflow:hidden;aspect-ratio:4/5;max-height:560px;border:10px solid rgba(255,255,255,.14)}.marco img{width:100%;height:100%;object-fit:cover}
body.l-dostonos .paq{border-top:6px solid var(--acc)}`,
      galeria: `.g-dostonos img{border-radius:4px}`,
      ancho: `.h-dos .in{grid-template-columns:1.1fr .9fr;align-items:end}`,
    },
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
