// Opción I "Historia con scroll" (generador/opciones/historia/historia.js). Titulares con remates (serif editorial).
import { METRICAS } from '../../tipo_color.js';
import { aptaHistoria, CSS_REVISION_HISTORIA } from './historia.js';
import { logoHTML, redes } from '../../kit/utiles.js';
import { paginaHistoria } from './historia.js';
import { direccionTexto, testimoniosValidos } from '../../datos_brief.js';
import { enlacesRedes } from '../../iconos_redes.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'historia', letra: 'I', indice: 8, titulo: 'Historia con scroll',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: {},
  // Página propia con el orden de su referencia (excepción aprobada el 16-nov-2026): del giro solo toma los nombres.
  ordenPropio: true,
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, tinte, papel, tinta }) => ({ bg: mezclar(papel, '#F6F1E8', 0.6), fg: tinta, primary: base, muted: mezclar(tinte, '#FFFFFF', 0.5), banda: conContraste(tono(base, 0.2, 0.18, 0.3), '#FFFFFF', 9) }),
  propia: true, sinWordPress: true,
  par: (pares, i) => pares.find((x) => METRICAS[x.titulos]?.clase === 'serif') || pares[i % pares.length],
  // Solo sale sola si el giro se vende con fotos y hay al menos 4 fotos buenas del cliente.
  apta: ({ brief, mat }) => {
    const buenas = new Set([mat.hero, ...mat.trabajos, ...mat.local, ...mat.equipo, ...(mat.otras || [])].filter((x) => x?.url && !x.captura && x.calidad !== 'regular' && /^(foto|imagen)/.test(x.tipo || 'foto')).map((x) => x.url));
    return aptaHistoria(brief, buenas.size);
  },
  cssRevision: CSS_REVISION_HISTORIA,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // I: página propia completa (generador/opciones/historia/historia.js, reconstruida desde savor.it): aquí no se arma héroe.
    portada: (c) => {
      const armar = () => '';
      return armar();
    },
    secciones: (c, s) => {
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto } = s;
      return [secServicios, secTrabajo, secSobre, secEquipo, secResenas, procCli, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-zoom',
    // I (14-nov-2026): página completa propia hecha solo a partir de savor.it; de aquí solo toma los datos del cliente.
    paginaCompleta: (c, { ft, fc }) => {
      const { d, p, t, mat, brief, img, wa, fueraDeGaleria, buenaFoto, fotosT, heroFoto, extraSl, poolSl, diapos, T, grupos, mostrarPrecios } = c;
      const c0 = brief.contacto || {};
      const fund0 = mat.fundador && fueraDeGaleria(mat.fundador) ? mat.fundador : mat.equipo.find((x) => x.tipo === 'foto_fundador' && fueraDeGaleria(x)) || null;
      const pasosHs = poolSl.slice(1).map((foto, k) => ({ foto, titular: diapos[k]?.titular || '', apoyo: diapos[k]?.apoyo || '' }));
      const enRelato = new Set(pasosHs.slice(0, 4).map((x) => x.foto.url));
      const vistasHs = new Set([heroFoto?.url, fund0?.url].filter(Boolean));
      const trabajoHs = [...fotosT, ...extraSl, ...mat.equipo, ...poolSl].filter((x) => x?.url && fueraDeGaleria(x) && /^(foto|imagen)/.test(x.tipo || 'foto') && !vistasHs.has(x.url) && vistasHs.add(x.url))
        .map((x) => (enRelato.has(x.url) ? { ...x, rep: true } : x));
      const anchas = trabajoHs.filter((x) => buenaFoto(x) && (x.ancho || 0) >= (x.alto || 0) && (x.ancho || 0) >= 1200).sort((a0, b0) => (b0.ancho || 0) - (a0.ancho || 0));
      const fotoBanda = anchas.find((x) => !enRelato.has(x.url)) || anchas[0] || heroFoto;
      const redesHs = enlacesRedes(redes(c0));
      return paginaHistoria({
        nombre: d.nombre, letra: d.letra, p, ft, fc, t, T, brief, img, wa, heroFoto, pasos: pasosHs, trabajo: trabajoHs, retrato: fund0,
        videos: mat.videos, catalogos: mat.catalogos, documentos: mat.documentos, resenasCap: mat.resenas, testimonios: testimoniosValidos(brief, mat),
        grupos, mostrarPrecios, faq: (brief.faq || []).filter((q) => q.pregunta && q.respuesta),
        datos: { whatsapp: d.tel, donde: direccionTexto(brief) || (brief.zona?.cobertura || []).join(' · '), horario: typeof c0.horarios === 'string' ? c0.horarios : '', correo: c0.email || '' },
        redesHTML: redesHs ? `<div class="redes">${redesHs}</div>` : '',
        logoClaro: logoHTML(mat.logo, '#141414', '#FFFFFF', { alt: d.nombre }), logoOscuro: logoHTML(mat.logo, p.bg, p.fg, { alt: d.nombre }),
        logoPie: logoHTML(mat.logo, p.bg, p.fg, { alt: d.nombre, clase: 'logo-pie' }), fotoBanda,
      });
    },
  },
};
