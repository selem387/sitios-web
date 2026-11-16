// Opción M "Guía en movimiento" (generador/guia.js).
import { parGuia, CSS_REVISION_GUIA } from '../../guia.js';
import { giroCorto } from '../../kit/utiles.js';
import { fraseDe } from '../../historia.js';
import { conEfectosK } from '../../movimiento_k.js';
import { escenaGuiaHTML, cierreGuiaHTML, indiceGuiaHTML, CSS_GUIA, JS_GUIA } from '../../guia.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'guia', letra: 'M', indice: 12, titulo: 'Guía en movimiento',
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, papel, tinta }) => ({ bg: mezclar(papel, '#FFFFFF', 0.82), fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.6), banda: conContraste(tono(base, 0.2, 0.18, 0.28), '#FFFFFF', 9) }),
  propia: true, sinWordPress: true,
  par: (pares) => parGuia(pares),
  cssRevision: CSS_REVISION_GUIA,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // M: guía en movimiento (generador/guia.js). Portada que se abre, recorrido fijo con las fotos del slider y sus textos,
    // frase que se enciende y (al final de la página) cierre que crece. Todas las fotos pueden repetirse en "Nuestro trabajo".
    portada: (c) => {
      const { d, t, brief, usadas, img, neg, conf, heroFoto, cta, poolSl, diapos, enPortada } = c;
      const armar = () => {
        const pasos = poolSl.slice(1).map((foto, k) => ({ foto, titular: diapos[k]?.titular || '', apoyo: diapos[k]?.apoyo || '' }));
        const giro = giroCorto(neg.giro_texto) || '';
        const frases = [...diapos.map((x) => x?.titular).filter(Boolean), giro, neg.ciudad].filter(Boolean);
        const frase = fraseDe(t.sobre || conf.historia_corta || '') || fraseDe(brief.oferta?.diferenciador || '') || '';
        const gu = escenaGuiaHTML({ heroFoto, pasos, frases: frases.length >= 2 ? frases : [d.nombre, ...frases], frase, img, kicker: [giro, neg.ciudad].filter(Boolean).join(' · '), titular: t.titular, subtitulo: t.subtitulo, cta: cta() });
        gu.urls.forEach((u) => { enPortada.add(u); usadas.add(u); });
        return gu.html;
      };
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      return [secSobre, secTrabajo, secServicios, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-hover',
    css: CSS_GUIA,
    trasBarra: (c, { navs }) => indiceGuiaHTML(navs),
    cierre: (c) => {
      const { d, img, neg, fotosT, heroFoto, cta, enPortada } = c;
      return cierreGuiaHTML({ foto: fotosT.find((x) => x?.url && !enPortada.has(x.url)) || heroFoto, img, titulo: d.nombre, apoyo: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), cta: cta() });
    },
    js: () => JS_GUIA,
    final: (html, c) => conEfectosK(html, c.p),
  },
};
