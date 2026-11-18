// Opción R "Manual de servicios" (generador/opciones/manual/manual.js). Página propia: solo toma los datos del cliente.
import { paginaManual, paletaManual, FUENTES_R, CSS_REVISION_MANUAL } from './manual.js';

export const opcion = {
  nombre: 'manual', letra: 'R', indice: 17, titulo: 'Manual de servicios',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { servicios: 3 },
  sinWordPress: true,
  completa: ({ brief, mat, textos, v, titulos, wa, coloresPropuesta, letra, titulo }) => ({
    html: paginaManual({ brief, mat, textos, v, titulos, wa, colores: [...(mat.colores || []), ...(coloresPropuesta || [])], nombreOpcion: titulo, letra }),
    fuentes: { titulos: FUENTES_R.cuerpo, cuerpo: FUENTES_R.cuerpo, estilo: 'minimalista' },
    paleta: paletaManual(mat.colores?.length ? mat.colores : coloresPropuesta || []),
  }),
  cssRevision: CSS_REVISION_MANUAL,
};
