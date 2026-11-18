// Mapa del giro "Inmobiliaria" (etapa 2, aprobado por Sebastián el 16-nov-2026; doc del proyecto claude/etapa2-mapa-por-giro-propuesta.md).
// orden: secciones del kit después de la portada (el giro manda en el orden). nombres: títulos de esas secciones.
// lista: opciones en orden de preferencia; al cliente le tocan las primeras 6 (las demás quedan de respaldo).
// Este archivo es compartido: solo lo cambia el chat designado (el de la reorganización), nunca el chat de una opción.
export const giro = {
  id: 'inmobiliaria',
  porOmision: 'base',
  variantes: {
    base: {
      subtipos: [],
      orden: ['trabajo', 'servicios', 'sobre', 'equipo', 'resenas', 'proceso', 'video', 'faq', 'contacto'],
      nombres: { trabajo: 'Propiedades', servicios: 'Cómo te ayudamos', sobre: 'Quiénes somos', equipo: 'Asesores', resenas: 'Clientes', proceso: 'Cómo comprar o rentar con nosotros', faq: 'Preguntas frecuentes', contacto: 'Contáctanos' },
      lista: ['C', 'A', 'G', 'M', 'O', 'K', 'B', 'E', 'D'],
    },
  },
};
