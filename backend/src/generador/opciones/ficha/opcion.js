// Opción P "Ficha en movimiento" (generador/opciones/ficha/ficha.js). Página propia, hecha solo a partir de su referencia.
import { paginaFicha, CSS_REVISION_FICHA } from './ficha.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';

export const opcion = {
  nombre: 'ficha', letra: 'P', indice: 15, titulo: 'Ficha en movimiento',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { producto: true },
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base, papel, tinta }) => { const bg = tono(base, 0.09, 0.14, 0.3); const fg = conContraste('#F4EFE8', bg, 12, '#FFFFFF'); const pr = conContraste(tono(base, 0.66, 0.4, 0.9), bg, 4.6, '#FFFFFF'); return { bg, fg, primary: pr, muted: mezclar(bg, '#FFFFFF', 0.06), banda: mezclar(bg, '#000000', 0.35), crema: mezclar(papel, '#FFFFFF', 0.55), tinta: conContraste(tono(base, 0.12, 0.1, 0.25), mezclar(papel, '#FFFFFF', 0.55), 12) }; },
  // Tema oscuro: tarjetas un poco más claras que el fondo y acento que siempre se lee sobre el fondo.
  temaOscuro: true,
  propia: true,
  par: (pares, i) => pares[0] || pares[i % pares.length],
  pagina: (d, kit) => paginaFicha({ ...d, logoBarra: kit.logoHTML(d.mat.logo, d.pal.bg, d.pal.fg, { alt: d.nombre }), testimonios: kit.testimoniosValidos(d.brief, d.mat), redes: kit.redes(d.brief.contacto || {}), direccion: kit.direccionTexto(d.brief) }),
  cssRevision: CSS_REVISION_FICHA,
  // Abre con la foto principal del cliente (cuando la plantilla general la calcula).
  conFotoPrincipal: true,
};
