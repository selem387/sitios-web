// Opción O "Catálogo en movimiento" (generador/opciones/catalogo/catalogo.js).
import { parCatalogo, CSS_REVISION_CATALOGO } from './catalogo.js';
import { giroCorto } from '../../kit/utiles.js';
import { fraseDe } from '../../kit/utiles.js';
import { portadaCatalogoHTML, bandaFotoHTML, cierreCatalogoHTML, tabsDeServicios, CSS_CATALOGO, JS_CATALOGO } from './catalogo.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'catalogo', letra: 'O', indice: 14, titulo: 'Catálogo en movimiento',
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, tinta }) => ({ bg: '#FFFFFF', fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.6), banda: conContraste(tono(base, 0.2, 0.18, 0.28), '#FFFFFF', 9) }),
  propia: true, sinWordPress: true,
  par: (pares) => parCatalogo(pares),
  cssRevision: CSS_REVISION_CATALOGO,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // O: catálogo en movimiento (generador/opciones/catalogo/catalogo.js). Portada en carrusel con las fotos del slider y sus textos;
    // "Nuestro trabajo" hace de estante deslizable y los servicios van en pestañas. Sin librerías de animación.
    portada: (c) => {
      const { t, usadas, img, neg, heroFoto, cta, poolSl, diapos, enPortada } = c;
      const armar = () => {
        const pasos = poolSl.slice(1).map((foto, k) => ({ foto, titular: diapos[k]?.titular || '', apoyo: diapos[k]?.apoyo || '' }));
        const ct = portadaCatalogoHTML({ heroFoto, pasos, img, kicker: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), titular: t.titular, subtitulo: t.subtitulo, cta: cta() });
        ct.urls.forEach((u) => { enPortada.add(u); usadas.add(u); });
        return ct.html;
      };
      return armar();
    },
    secciones: (c, s) => {
      const { t, brief, img, conf, fotosT, heroFoto, cta, enPortada } = c;
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      // O: banda de foto con una frase del cliente (su historia o diferenciador) y parallax; las fotos pueden repetirse (rep-ok).
      const fotosCt = fotosT.filter((x) => x?.url && !enPortada.has(x.url) && x.url !== heroFoto?.url);
      c.fotosCt = fotosCt; // el cierre usa las mismas
      const bandaCt = () => {
        const frase = fraseDe(t.sobre || conf.historia_corta || '') || fraseDe(brief.oferta?.diferenciador || '') || '';
        return bandaFotoHTML({ foto: fotosCt[1] || null, img, frase, cta: cta() });
      };
      return [secTrabajo, bandaCt, () => tabsDeServicios(secServicios()), secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-hover',
    css: CSS_CATALOGO,
    cierre: (c) => {
      const { d, img, neg, heroFoto, cta } = c;
      return cierreCatalogoHTML({ foto: c.fotosCt[0] || heroFoto, img, titulo: d.nombre, apoyo: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), cta: cta() });
    },
    js: () => JS_CATALOGO,
  },
};
