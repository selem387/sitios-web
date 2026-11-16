// Opción L "Plataforma" (opciones/plataforma/plataforma_l.js), reconstruida solo a partir de antigravity.google.
// Página completa y propia: no pasa por la plantilla general. Tabla modelo → cliente en LEEME.md de esta carpeta.
// Efecto de mouse configurable (puntos, luz, distorsión o tinta): por cliente (brief.marca.efecto_mouse), por variable
// (OPCION_L_EFECTO) o por giro. Para probar en el navegador: ?efecto=
import { paginaPlataforma, efectoParaBrief, CSS_REVISION_PLATAFORMA } from './plataforma_l.js';

export const opcion = {
  nombre: 'plataforma', letra: 'L', indice: 11, titulo: 'Plataforma',
  propia: true, sinWordPress: true,
  cssRevision: CSS_REVISION_PLATAFORMA,
  completa: ({ brief, mat, textos, v, wa, tel, coloresPropuesta, acento, fijo, letra, titulo }) => paginaPlataforma({
    brief, mat, v, textos, letra,
    colores: fijo?.paleta?.base ? [fijo.paleta.base] : [acento, ...(coloresPropuesta || [])].filter(Boolean),
    efecto: efectoParaBrief(brief), wa, tel, nombreOpcion: titulo,
  }),
};
