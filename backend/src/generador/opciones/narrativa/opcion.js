// Opción J "Narrativa por capítulos" (generador/narrativa.js).
import { parNarrativa, CSS_REVISION_NARRATIVA } from '../../narrativa.js';

export const opcion = {
  nombre: 'narrativa', letra: 'J', indice: 9, titulo: 'Narrativa por capítulos',
  propia: true, sinWordPress: true,
  par: (pares) => parNarrativa(pares),
  cssRevision: CSS_REVISION_NARRATIVA,
};
