// Opción J "Narrativa por capítulos" (generador/narrativa.js).
import { parNarrativa, CSS_REVISION_NARRATIVA } from '../../narrativa.js';
import { giroCorto } from '../../kit/utiles.js';
import { portadaNarrativaHTML, CSS_NARRATIVA, JS_NARRATIVA } from '../../narrativa.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'narrativa', letra: 'J', indice: 9, titulo: 'Narrativa por capítulos',
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte }) => ({ bg: '#FFFFFF', fg: conContraste(tono(base, 0.1, 0.1, 0.25), '#FFFFFF', 15), primary: base, muted: mezclar(tinte, '#FFFFFF', 0.7) }),
  propia: true, sinWordPress: true,
  par: (pares) => parNarrativa(pares),
  cssRevision: CSS_REVISION_NARRATIVA,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // J: portada tipográfica (generador/narrativa.js). Titular enorme, foto a todo lo ancho debajo; si el cliente subió
    // un video, ese video va encima de la foto como fondo vivo y ya no se repite en la sección de video.
    portada: (c) => {
      const { t, mat, usadas, img, neg, heroFoto, cta, enPortada } = c;
      const armar = () => {
        const na = portadaNarrativaHTML({ heroFoto, video: mat.videos?.[0] || null, img, kicker: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), titular: t.titular, subtitulo: t.subtitulo, cta: cta(), info: t.info || [] });
        na.urls.forEach((u) => { enPortada.add(u); usadas.add(u); });
        return na.html;
      };
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      return [secSobre, secTrabajo, secServicios, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-hover',
    css: CSS_NARRATIVA,
    js: () => JS_NARRATIVA,
  },
};
