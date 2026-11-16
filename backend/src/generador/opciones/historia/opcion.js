// Opción I "Historia con scroll" (generador/historia.js). Titulares con remates (serif editorial).
import { METRICAS } from '../../tipo_color.js';
import { aptaHistoria, CSS_REVISION_HISTORIA } from '../../historia.js';

export const opcion = {
  nombre: 'historia', letra: 'I', indice: 8, titulo: 'Historia con scroll',
  propia: true, sinWordPress: true,
  par: (pares, i) => pares.find((x) => METRICAS[x.titulos]?.clase === 'serif') || pares[i % pares.length],
  // Solo sale sola si el giro se vende con fotos y hay al menos 4 fotos buenas del cliente.
  apta: ({ brief, mat }) => {
    const buenas = new Set([mat.hero, ...mat.trabajos, ...mat.local, ...mat.equipo, ...(mat.otras || [])].filter((x) => x?.url && !x.captura && x.calidad !== 'regular' && /^(foto|imagen)/.test(x.tipo || 'foto')).map((x) => x.url));
    return aptaHistoria(brief, buenas.size);
  },
  cssRevision: CSS_REVISION_HISTORIA,
};
