// Opción O "Catálogo en movimiento" (opciones/catalogo/catalogo.js), rehecha solo a partir de shop.lululemon.com.
// Barra de anuncio, portada en carrusel, estante de trabajo con pestañas, bloques con parallax, mosaico de categorías y cierre.
import { parCatalogo, CSS_REVISION_CATALOGO } from './catalogo.js';
import { giroCorto, fraseDe } from '../../kit/utiles.js';
import { anuncioHTML, portadaHTML, estanteHTML, bloqueHTML, categoriasHTML, conIdsGrupos, cierreHTML, relacionarFotos, CSS_CATALOGO, JS_CATALOGO } from './catalogo.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

const lineaDe = (neg) => [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · ');

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
    // Portada en carrusel con las fotos del slider y sus textos.
    portada: (c) => {
      const { t, usadas, img, heroFoto, cta, poolSl, diapos, enPortada } = c;
      const pasos = poolSl.slice(1).map((foto, k) => ({ foto, titular: diapos[k]?.titular || '', apoyo: diapos[k]?.apoyo || '' }));
      const ct = portadaHTML({ heroFoto, pasos, img, titular: t.titular, subtitulo: t.subtitulo, cta: cta() });
      ct.urls.forEach((u) => { enPortada.add(u); usadas.add(u); });
      return ct.html;
    },
    // Estante con pestañas, bloque con parallax, mosaico de categorías, servicios completos, segundo bloque y el resto.
    // Los textos de los bloques salen del cliente (su historia o diferenciador); sin texto o sin foto el bloque no sale.
    secciones: (c, s) => {
      const { t, brief, img, conf, fotosT, heroFoto, cta, enPortada, grupos, mostrarPrecios, waFoto, T } = c;
      const { listaTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      const fotosCt = fotosT.filter((x) => x?.url && !enPortada.has(x.url) && x.url !== heroFoto?.url);
      c.fotosCt = fotosCt; // el cierre usa las mismas
      const frases = [fraseDe(t.sobre || conf.historia_corta || ''), fraseDe(brief.oferta?.diferenciador || '')].filter((x, k, a) => x && a.indexOf(x) === k);
      const trabajo = listaTrabajo();
      const rel = relacionarFotos(trabajo, grupos, { precios: mostrarPrecios });
      const estante = () => estanteHTML({ titulo: T.trabajo, fotos: trabajo, rel, grupos, img, attrs: waFoto });
      const bloque = (k) => () => bloqueHTML({ foto: fotosCt[k + 1] || null, img, titular: frases[k] || '', cta: k === 0 ? cta() : '', centro: k === 1 });
      const categorias = () => categoriasHTML({ titulo: 'Elige por categoría', grupos, img, precios: mostrarPrecios, fotoDe: (gi) => { const i = rel.findIndex((r) => r.grupo === gi); return i >= 0 ? trabajo[i] : null; }, ancla: (i) => (grupos.some((g) => g.opciones.length > 1) ? `#g-${i}` : '#servicios') });
      return [estante, bloque(0), categorias, () => conIdsGrupos(secServicios()), bloque(1), secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-hover',
    css: CSS_CATALOGO,
    // Barra de anuncio con botón de cerrar, antes de la barra del sitio.
    antesBarra: (c) => anuncioHTML({ texto: lineaDe(c.neg), cta: c.t.cta, href: c.d.wa || '#contacto', externo: !!c.d.wa }),
    cierre: (c) => cierreHTML({ foto: c.fotosCt[0] || c.heroFoto, img: c.img, titulo: c.d.nombre, apoyo: lineaDe(c.neg), cta: c.cta() }),
    js: () => JS_CATALOGO,
  },
};
