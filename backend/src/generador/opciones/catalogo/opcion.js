// Opción O "Catálogo en movimiento" (generador/catalogo.js).
import { parCatalogo, CSS_REVISION_CATALOGO } from '../../catalogo.js';

export const opcion = {
  nombre: 'catalogo', letra: 'O', indice: 14, titulo: 'Catálogo en movimiento',
  propia: true, sinWordPress: true,
  par: (pares) => parCatalogo(pares),
  cssRevision: CSS_REVISION_CATALOGO,
};
