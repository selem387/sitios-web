// Mapa del giro "Oficios" (etapa 2, aprobado por Sebastián el 16-nov-2026; doc del proyecto claude/etapa2-mapa-por-giro-propuesta.md).
// orden: secciones del kit después de la portada (el giro manda en el orden). nombres: títulos de esas secciones.
// lista: opciones en orden de preferencia; al cliente le tocan las primeras 6 (las demás quedan de respaldo).
// Este archivo es compartido: solo lo cambia el chat designado (el de la reorganización), nunca el chat de una opción.
export const giro = {
  id: 'oficios',
  porOmision: 'base',
  variantes: {
    base: {
      subtipos: [],
      orden: ['servicios', 'trabajo', 'resenas', 'sobre', 'equipo', 'proceso', 'faq', 'contacto'],
      nombres: { servicios: 'Servicios', trabajo: 'Trabajos realizados', resenas: 'Clientes', sobre: 'Quién soy', equipo: 'Equipo', proceso: 'Cómo pedir tu servicio', faq: 'Preguntas frecuentes', contacto: 'Pide tu servicio' },
      lista: ['C', 'A', 'E', 'D', 'G', 'F', 'K'],
    },
  },
};
