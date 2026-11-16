// Opción P "Ficha en movimiento" (generador/ficha.js). Página propia, hecha solo a partir de su referencia.
import { paginaFicha, CSS_REVISION_FICHA } from '../../ficha.js';

export const opcion = {
  nombre: 'ficha', letra: 'P', indice: 15, titulo: 'Ficha en movimiento',
  propia: true,
  par: (pares, i) => pares[0] || pares[i % pares.length],
  pagina: (d, kit) => paginaFicha({ ...d, logoBarra: kit.logoHTML(d.mat.logo, d.pal.bg, d.pal.fg, { alt: d.nombre }), testimonios: kit.testimoniosValidos(d.brief, d.mat), redes: kit.redes(d.brief.contacto || {}), direccion: kit.direccionTexto(d.brief) }),
  cssRevision: CSS_REVISION_FICHA,
};
