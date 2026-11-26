// Opción "Señal" (generador/opciones/senal/senal.js). Página propia, idéntica a su sitio modelo.
import { paginaSenal, paletaSenal, CSS_REVISION_SENAL } from './senal.js';

export const opcion = {
  // Letra e índice: siguiente libre al 26-nov-2026 (T, 19). Si Sebastián asigna otra desde el chat designado, se cambia aquí.
  nombre: 'senal', letra: 'T', indice: 19, titulo: 'Señal',
  // Plantilla hecha a partir de un sitio modelo externo: las reglas duras no le aplican (decisión de Sebastián, 24-nov-2026).
  modelo: 'https://kaiju-fright-hub.base44.app/',
  // Material con el que se ve completa: portada, 3 tarjetas de trabajo y la foto de servicios.
  requisitos: { fotosTrabajo: 3, servicios: 2 },
  // Página propia (sigue el orden del modelo; toma los nombres del giro y no deja fuera secciones con material).
  ordenPropio: true,
  sinWordPress: true,
  temaOscuro: true,
  completa: ({ brief, mat, textos, v, titulos, wa, tel, letra, titulo }) => {
    const r = paginaSenal({ brief, mat, textos, v, titulos, wa, tel, letra, titulo });
    return { html: r.html, fuentes: r.fuentes, paleta: paletaSenal(brief) };
  },
  cssRevision: CSS_REVISION_SENAL,
};
