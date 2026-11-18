// Mapa del giro "Clínica" (etapa 2, aprobado por Sebastián el 16-nov-2026; doc del proyecto claude/etapa2-mapa-por-giro-propuesta.md).
// orden: secciones del kit después de la portada (el giro manda en el orden). nombres: títulos de esas secciones.
// lista: opciones en orden de preferencia; al cliente le tocan las primeras 6 (las demás quedan de respaldo).
// Este archivo es compartido: solo lo cambia el chat designado (el de la reorganización), nunca el chat de una opción.
export const giro = {
  id: 'clinica',
  porOmision: 'resultados',
  variantes: {
    resultados: {
      subtipos: ['dental', 'estetica_spa'],
      orden: ['servicios', 'sobre', 'equipo', 'trabajo', 'resenas', 'proceso', 'video', 'faq', 'contacto'],
      nombres: { servicios: 'Tratamientos', sobre: 'Quién te atiende', equipo: 'Equipo', trabajo: 'Resultados', resenas: 'Pacientes', proceso: 'Tu primera cita', faq: 'Preguntas frecuentes', contacto: 'Agenda tu cita' },
      lista: ['A', 'R', 'B', 'L', 'E', 'F', 'D', 'K', 'H'],
    },
    espacio: {
      subtipos: ['medica', 'veterinaria'],
      orden: ['servicios', 'sobre', 'equipo', 'trabajo', 'resenas', 'proceso', 'video', 'faq', 'contacto'],
      nombres: { servicios: 'Tratamientos', sobre: 'Quién te atiende', equipo: 'Equipo', trabajo: 'Nuestro espacio', resenas: 'Pacientes', proceso: 'Tu primera cita', faq: 'Preguntas frecuentes', contacto: 'Agenda tu cita' },
      lista: ['A', 'R', 'B', 'L', 'E', 'F', 'D', 'K', 'H'],
    },
  },
};
