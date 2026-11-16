// Opción M "Guía en movimiento" (generador/guia.js).
import { parGuia, CSS_REVISION_GUIA } from '../../guia.js';

export const opcion = {
  nombre: 'guia', letra: 'M', indice: 12, titulo: 'Guía en movimiento',
  propia: true, sinWordPress: true,
  par: (pares) => parGuia(pares),
  cssRevision: CSS_REVISION_GUIA,
};
