// Opción H "Recorrido con índice" (generador/opciones/indice/indice.js). Titulares en letra sin remates.
import { METRICAS } from '../../tipo_color.js';
import { giroCorto, logoHTML } from '../../kit/utiles.js';
import { escenaIndiceHTML, navIndiceHTML, monogramaHTML, CSS_INDICE, JS_INDICE } from './indice.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'indice', letra: 'H', indice: 7, titulo: 'Recorrido con índice',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { fotosTotal: 3, secciones: 4 },
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, tinta }) => ({ bg: '#FFFFFF', fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.6), banda: conContraste(tono(base, 0.24, 0.2, 0.32), '#FFFFFF', 8) }),
  propia: true, sinWordPress: true,
  par: (pares, i) => pares.find((x) => METRICAS[x.titulos]?.clase === 'sans') || pares[i % pares.length],
  // Se mide con la portada quieta y los titulares ya puestos, no a medio recorrido.
  cssRevision: '.ix-escena{height:auto!important}.ix-escena .h-indice{position:relative!important;top:0!important;height:auto!important;min-height:min(100svh,920px)!important;padding:120px 0 220px!important}.ix-banda,.ix-tunel,.ix-lema,.ix-tj-marco,.ix-flot{display:none!important}.ix-escena .ix-ficha{display:grid!important}.ix-escena .ix-txt{padding-bottom:0!important}.ix-pw>span,.ix-desliza,.h-indice h1{transform:none!important}',
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // H: portada con recorrido (generador/opciones/indice/indice.js). Foto de fondo y hasta 3 fotos en el túnel; todas pueden repetirse
    // en "Nuestro trabajo". El lema sale del primer texto de diapositiva real del brief (diferenciador, oferta, prueba o visión).
    portada: (c) => {
      const { d, t, mat, img, neg, heroFoto, cta, fijasSl, poolBase, diapos, enPortada } = c;
      const armar = () => {
        const vistas = new Set(heroFoto ? [heroFoto.url] : []);
        const tunel = [...fijasSl, ...poolBase].filter((x) => x?.url && !vistas.has(x.url) && vistas.add(x.url));
        const dp = diapos.find((x) => x?.titular) || null;
        const giro = giroCorto(neg.giro_texto) || '';
        const esc0 = escenaIndiceHTML({ heroFoto, tunel, img, kicker: [giro, neg.ciudad].filter(Boolean).join(' · '), titular: t.titular, subtitulo: t.subtitulo, cta: cta(), info: t.info || [],
          lema: dp?.titular || d.nombre, apoyo: dp ? dp.apoyo : giro, logo: mat.logo ? logoHTML(mat.logo, '#141414', '#FFFFFF', { alt: d.nombre }) : '', nombre: d.nombre });
        esc0.urls.forEach((u) => enPortada.add(u));
        return esc0.html;
      };
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      return [secSobre, secTrabajo, secServicios, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-zoom fx-hover',
    css: CSS_INDICE,
    trasBarra: (c, { contenido }) => {
      const { t, T } = c;
      // H: el índice lateral lista "Inicio" y cada sección que sí existe, en el orden de la página.
      const ETQ_IX = { sobre: T.sobre, trabajo: T.trabajo, servicios: T.servicios, resenas: T.resenas, proceso: t.proceso || 'Cómo funciona', faq: T.faq, galeria: T.galeria, contacto: T.contacto };
      const seccionesIx = [...contenido.matchAll(/<section[^>]*\bid="([a-z]+)"/g)].map((m) => [m[1], ETQ_IX[m[1]]]).filter((x) => x[1]);
      return navIndiceHTML(seccionesIx);
    },
    js: (c) => monogramaHTML({ logoUrl: c.mat.logo?.url, nombre: c.d.nombre }) + JS_INDICE,
  },
};
