// Opción G "Collage en movimiento" (generador/opciones/collage/collage.js). La arma la plantilla general con su portada de collage.
import { collageHTML, CSS_COLLAGE, JS_COLLAGE } from './collage.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'collage', letra: 'G', indice: 6, titulo: 'Collage en movimiento',
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, tinta }) => ({ bg: '#FFFFFF', fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.6), banda: conContraste(tono(base, 0.24, 0.2, 0.32), '#FFFFFF', 8) }),
  sinWordPress: true,
  // Al generarla a mano se deja correr la cola del MP4 de respaldo antes de salir.
  esperaAlGenerarMs: 90000,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // G: foto de fondo + texto a la izquierda + panel que cambia de acomodo (sin la foto de fondo; hasta 9 fotos).
    portada: (c) => {
      const { d, img, heroFoto, info, fijasSl, poolBase, enPortada, textoPortada } = c;
      const armar = () => {
        const vistas = new Set(heroFoto ? [heroFoto.url] : []);
        const panelF = [...fijasSl, ...poolBase].filter((x) => x?.url && !vistas.has(x.url) && vistas.add(x.url));
        const col = collageHTML({ fotos: panelF, img, nombre: d.nombre });
        col.urls.forEach((u) => enPortada.add(u));
        const fondo = heroFoto ? img(heroFoto, { cls: 'col-fondo rep-ok', eager: true, extra: ' fetchpriority="high" sizes="100vw"' }) + '<div class="col-velo"></div>' : '';
        return `<section class="hero h-col${heroFoto ? '' : ' sin-fondo'}">${fondo}<div class="wrap col-in"><div class="txt">${textoPortada}${info ? `<ul class="info">${info}</ul>` : ''}</div>${col.html}</div></section>`;
      };
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto } = s;
      return [secServicios, secTrabajo, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto];
    },
    css: CSS_COLLAGE,
    js: () => JS_COLLAGE,
  },
};
