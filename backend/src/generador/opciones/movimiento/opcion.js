// Opción K "Recorrido en movimiento" (generador/movimiento_k.js).
import { parMovimiento, CSS_REVISION_MOVIMIENTO } from '../../movimiento_k.js';

export const opcion = {
  nombre: 'movimiento', letra: 'K', indice: 10, titulo: 'Recorrido en movimiento',
  propia: true, sinWordPress: true,
  par: (pares) => parMovimiento(pares),
  cssRevision: CSS_REVISION_MOVIMIENTO,
};
