// Mapa del giro "Tienda" (etapa 2, aprobado por Sebastián el 16-nov-2026; doc del proyecto claude/etapa2-mapa-por-giro-propuesta.md).
// orden: secciones del kit después de la portada (el giro manda en el orden). nombres: títulos de esas secciones.
// lista: opciones en orden de preferencia; al cliente le tocan las primeras 6 (las demás quedan de respaldo).
// Este archivo es compartido: solo lo cambia el chat designado (el de la reorganización), nunca el chat de una opción.
export const giro = {
  id: 'tienda',
  porOmision: 'base',
  variantes: {
    base: {
      subtipos: [],
      orden: ['servicios', 'trabajo', 'sobre', 'resenas', 'video', 'faq', 'contacto'],
      nombres: { servicios: 'Catálogo', trabajo: 'Productos', sobre: 'Nuestra historia', resenas: 'Clientes', faq: 'Envíos y pagos', contacto: 'Pide el tuyo' },
      lista: ['Q', 'O', 'P', 'C', 'A', 'G', 'D', 'E'],
    },
  },
};
