// Opción S "Tu página de referencia" (diseño aprobado por Sebastián el 18-nov-2026; doc claude/pagina-referencia-plantilla.md).
// Arma la página a partir del plano guardado en brief.marca.plano_ref (reconstrucción de la página que mandó el cliente,
// o una plantilla aprobada de su giro, guardada en la propuesta: brief.marca.propuestas.plano_ref). Sin plano no sale.
export const planoDe = (brief) => brief?.marca?.plano_ref?.plano || brief?.marca?.propuestas?.plano_ref?.plano || null;
import { paginaReferencia } from './referencia.js';

export const opcion = {
  nombre: 'referencia', letra: 'S', indice: 18, titulo: 'Tu página de referencia',
  // Se ve completa con cualquier material: lo que falte lo llenan los elementos ilustrativos.
  requisitos: {},
  apta: ({ brief }) => !!planoDe(brief),
  // Página propia: sigue el orden de la página de referencia y toma los nombres del giro (decisión 1 del 18-nov-2026).
  ordenPropio: true,
  sinWordPress: true,
  completa: ({ brief, mat, textos, v, titulos, wa, tel }) => paginaReferencia({ plano: planoDe(brief), brief, mat, textos, v, titulos, wa, tel, colores: mat.colores || [] }),
};
