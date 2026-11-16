// Opción A "Foto a pantalla completa": una de las 6 que salen siempre. La arma la plantilla general (generador/propuestas_general.js).
import { mezclar } from '../../../entrevista/tema.js';

export const opcion = {
  nombre: 'portada', letra: 'A', indice: 0, titulo: 'Foto a pantalla completa',
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, papel, tinta }) => ({ bg: mezclar(papel, '#FFFFFF', 0.5), fg: tinta, primary: base, muted: papel }),
  base: true,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
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
