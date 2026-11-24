// Opción S "Tu página de referencia" (diseño aprobado por Sebastián el 18-nov-2026; doc claude/pagina-referencia-plantilla.md).
// Arma la página a partir del plano guardado en brief.marca.plano_ref (reconstrucción de la página que mandó el cliente,
// o una plantilla aprobada de su giro, guardada en la propuesta: brief.marca.propuestas.plano_ref). Sin plano no sale.
export const planoDe = (brief) => brief?.marca?.plano_ref?.plano || brief?.marca?.propuestas?.plano_ref?.plano || null;
import { paginaReferencia } from './referencia.js';

export const opcion = {
  nombre: 'referencia', letra: 'S', indice: 18, titulo: 'Tu página de referencia',
  // Plantilla hecha a partir de un sitio modelo externo: las reglas duras no le aplican (decisión de Sebastián, 24-nov-2026).
  modelo: 'la página de referencia que manda el cliente',
  // Las referencias suelen llevar foto principal, galería y servicios: lo que falte lo llenan los elementos ilustrativos.
  requisitos: { fotoBuena: 1, fotosTrabajo: 4, servicios: 3 },
  apta: ({ brief }) => !!planoDe(brief),
  // Página propia: sigue el orden de la página de referencia y toma los nombres del giro (decisión 1 del 18-nov-2026).
  ordenPropio: true,
  sinWordPress: true,
  completa: ({ brief, mat, textos, v, titulos, wa, tel }) => paginaReferencia({ plano: planoDe(brief), brief, mat, textos, v, titulos, wa, tel, colores: mat.colores || [] }),
};
