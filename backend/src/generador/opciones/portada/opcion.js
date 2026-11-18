// Opción A "Foto a pantalla completa": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { mezclar } from '../../../entrevista/tema.js';

export const opcion = {
  nombre: 'portada', letra: 'A', indice: 0, titulo: 'Foto a pantalla completa',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { fotoBuena: 1 },
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, papel, tinta }) => ({ bg: mezclar(papel, '#FFFFFF', 0.5), fg: tinta, primary: base, muted: papel }),
  base: true,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // CSS propio (etapa 2, parte 2): portada → con los héroes; galeria → tras las reglas de galería; ancho → dentro de @media (min-width:900px).
    cssBase: {
      portada: `.h-portada{position:relative;min-height:72vh;min-height:calc(100svh - 190px);display:flex;align-items:flex-end;color:#fff;overflow:hidden}.h-portada .fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.h-portada .velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.62))}.h-portada .in{position:relative;padding-bottom:56px;width:100%}.h-portada .sub,.h-portada .kicker{color:rgba(255,255,255,.88)}
`,
      ancho: `.h-portada .velo{background:linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,.15) 70%)}.h-portada .sl-d.con-txt::after{background:linear-gradient(90deg,rgba(0,0,0,.66),rgba(0,0,0,.18) 72%)}`,
    },
    portada: (c) => {
      const { heroFoto, slider, textoPortada } = c;
      const armar = () => (heroFoto ? slider({ tag: 'section', clase: 'hero h-portada', envolver: true, primera: textoPortada })
        : `<section class="hero h-portada"><div class="velo"></div><div class="wrap in">${textoPortada}</div></section>`);
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      return [secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
  },
};
