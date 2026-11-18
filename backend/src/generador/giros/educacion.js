// Mapa del giro "Educación" (etapa 2, aprobado por Sebastián el 16-nov-2026; doc del proyecto claude/etapa2-mapa-por-giro-propuesta.md).
// orden: secciones del kit después de la portada (el giro manda en el orden). nombres: títulos de esas secciones.
// lista: opciones en orden de preferencia; al cliente le tocan las primeras 6 (las demás quedan de respaldo).
// Este archivo es compartido: solo lo cambia el chat designado (el de la reorganización), nunca el chat de una opción.
export const giro = {
  id: 'educacion',
  porOmision: 'base',
  variantes: {
    base: {
      subtipos: [],
      orden: ['servicios', 'sobre', 'equipo', 'trabajo', 'proceso', 'resenas', 'video', 'faq', 'contacto'],
      nombres: { servicios: 'Cursos', sobre: 'Quién enseña', equipo: 'Maestros', trabajo: 'Así son las clases', proceso: 'Cómo inscribirte', resenas: 'Alumnos', faq: 'Preguntas frecuentes', contacto: 'Inscríbete' },
      lista: ['B', 'L', 'R', 'A', 'J', 'E', 'D', 'H'],
    },
  },
};
