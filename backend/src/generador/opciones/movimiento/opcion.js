// Opción K "Recorrido en movimiento" (generador/opciones/movimiento/movimiento_k.js).
import { parMovimiento, CSS_REVISION_MOVIMIENTO } from './movimiento_k.js';
import { giroCorto } from '../../kit/utiles.js';
import { portadaMovimientoHTML, conEfectosK, CSS_MOVIMIENTO_K } from './movimiento_k.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'movimiento', letra: 'K', indice: 10, titulo: 'Recorrido en movimiento',
  // Plantilla hecha a partir de un sitio modelo externo: las reglas duras no le aplican (decisión de Sebastián, 24-nov-2026).
  modelo: 'https://endingtheviolence.com/',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { fotoBuena: 1 },
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, papel, tinta }) => ({ bg: mezclar(papel, '#FFFFFF', 0.7), fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.6), banda: conContraste(tono(base, 0.22, 0.2, 0.3), '#FFFFFF', 8) }),
  propia: true, sinWordPress: true,
  par: (pares) => parMovimiento(pares),
  cssRevision: CSS_REVISION_MOVIMIENTO,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // K: portada en movimiento (generador/opciones/movimiento/movimiento_k.js). Titular por letras, foto del cliente con paralaje y banda de texto
    // con los textos reales de las diapositivas (si no hay, con el giro y la ciudad). Los efectos del resto se añaden al final.
    portada: (c) => {
      const { d, t, usadas, img, neg, heroFoto, cta, diapos, enPortada } = c;
      const armar = () => {
        const frases = [...diapos.map((x) => x?.titular).filter(Boolean), giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean);
        const mv = portadaMovimientoHTML({ heroFoto, img, kicker: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), titular: t.titular, subtitulo: t.subtitulo, cta: cta(), frases: frases.length >= 2 ? frases : [d.nombre, ...frases] });
        mv.urls.forEach((u) => { enPortada.add(u); usadas.add(u); });
        return mv.html;
      };
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      return [secSobre, secTrabajo, secServicios, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-hover',
    css: CSS_MOVIMIENTO_K,
    final: (html, c) => conEfectosK(html, c.p),
  },
};
