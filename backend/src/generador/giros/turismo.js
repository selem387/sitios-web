// Mapa del giro "Turismo" (etapa 2, aprobado por Sebastián el 16-nov-2026; doc del proyecto claude/etapa2-mapa-por-giro-propuesta.md).
// orden: secciones del kit después de la portada (el giro manda en el orden). nombres: títulos de esas secciones.
// lista: opciones en orden de preferencia; al cliente le tocan las primeras 6 (las demás quedan de respaldo).
// Este archivo es compartido: solo lo cambia el chat designado (el de la reorganización), nunca el chat de una opción.
export const giro = {
  id: 'turismo',
  porOmision: 'tours',
  variantes: {
    hotel: {
      subtipos: ['hotel'],
      orden: ['trabajo', 'servicios', 'resenas', 'sobre', 'video', 'faq', 'contacto'],
      nombres: { trabajo: 'Conoce el lugar', servicios: 'Habitaciones', resenas: 'Huéspedes', sobre: 'Quiénes somos', faq: 'Preguntas frecuentes', contacto: 'Reserva' },
      lista: ['A', 'I', 'G', 'M', 'C', 'N', 'K', 'B'],
    },
    tours: {
      subtipos: ['tours'],
      orden: ['servicios', 'trabajo', 'resenas', 'sobre', 'equipo', 'video', 'faq', 'contacto'],
      nombres: { servicios: 'Experiencias', trabajo: 'Galería', resenas: 'Viajeros', sobre: 'Quiénes somos', equipo: 'Guías', faq: 'Preguntas frecuentes', contacto: 'Reserva' },
      lista: ['A', 'I', 'G', 'M', 'C', 'N', 'K', 'B'],
    },
  },
};
