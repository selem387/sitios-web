// Opción N "Avance en el espacio" (generador/avance.js).
import { parAvance, CSS_REVISION_AVANCE } from '../../avance.js';

export const opcion = {
  nombre: 'avance', letra: 'N', indice: 13, titulo: 'Avance en el espacio',
  propia: true, sinWordPress: true,
  par: (pares) => parAvance(pares),
  cssRevision: CSS_REVISION_AVANCE,
};
