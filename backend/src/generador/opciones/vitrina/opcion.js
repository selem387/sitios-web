// Opción Q "Vitrina" (generador/opciones/vitrina/vitrina.js). Página propia, hecha solo a partir de su referencia.
import { paginaVitrina, LETRA_Q, URL_FUENTES_Q } from './vitrina.js';

export const opcion = {
  nombre: 'vitrina', letra: 'Q', indice: 16, titulo: 'Vitrina',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { productos: 4 },
  // Q: negro sobre blanco como la referencia; el color del cliente solo queda guardado para el sitio en vivo.
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base }) => ({ bg: '#FFFFFF', fg: '#000000', primary: base, muted: '#EFEFEF' }),
  propia: true,
  par: () => LETRA_Q,
  urlFuentes: URL_FUENTES_Q,
  pagina: (d, kit) => paginaVitrina({ ...d, redes: kit.redes(d.brief.contacto || {}), direccion: kit.direccionTexto(d.brief) }).html,
};
