// Mapa del giro "Servicios profesionales" (etapa 2, aprobado por Sebastián el 16-nov-2026; doc del proyecto claude/etapa2-mapa-por-giro-propuesta.md).
// orden: secciones del kit después de la portada (el giro manda en el orden). nombres: títulos de esas secciones.
// lista: opciones en orden de preferencia; al cliente le tocan las primeras 6 (las demás quedan de respaldo).
// Este archivo es compartido: solo lo cambia el chat designado (el de la reorganización), nunca el chat de una opción.
export const giro = {
  id: 'servicios',
  porOmision: 'profesionales',
  variantes: {
    profesionales: {
      subtipos: ['legal', 'contador_consultor'],
      orden: ['servicios', 'sobre', 'equipo', 'proceso', 'resenas', 'trabajo', 'video', 'faq', 'contacto'],
      nombres: { servicios: 'Cómo te ayudamos', sobre: 'Quién te atiende', equipo: 'Equipo', proceso: 'Cómo trabajamos', resenas: 'Clientes', trabajo: 'Nuestro espacio', faq: 'Preguntas frecuentes', contacto: 'Agenda una consulta' },
      lista: ['R', 'F', 'B', 'L', 'H', 'J', 'E', 'A', 'D', 'K', 'N'],
    },
    // Agencias y estudios creativos (24-nov-2026, caso Intiviso Lab: a una agencia de marketing le tocaba la lista sobria
    // de abogados y contadores). Primero las opciones con movimiento y narrativa, las de referencias premiadas.
    creativos: {
      subtipos: ['agencia_marketing'],
      // Sin subtipo asignado todavía (se resuelve al cierre de la entrevista), se reconoce por el giro que dijo el cliente.
      detectar: /marketing|mercadotecnia|publicidad|agencia|branding|contenidos?|creativ|dise[nñ]o gr[aá]fico|audiovisual|producci[oó]n de (video|contenido)|podcast|redes sociales|social media/i,
      orden: ['servicios', 'trabajo', 'proceso', 'sobre', 'equipo', 'resenas', 'video', 'faq', 'contacto'],
      nombres: { servicios: 'Lo que hacemos', trabajo: 'Proyectos', proceso: 'Cómo trabajamos', sobre: 'Quiénes somos', equipo: 'Equipo', resenas: 'Clientes', faq: 'Preguntas frecuentes', contacto: 'Cotiza tu proyecto' },
      lista: ['K', 'N', 'J', 'M', 'R', 'I', 'H', 'L', 'G', 'C', 'B', 'A', 'E'],
    },
    visual: {
      subtipos: ['fotografia'],
      orden: ['trabajo', 'servicios', 'sobre', 'equipo', 'resenas', 'proceso', 'video', 'faq', 'contacto'],
      nombres: { trabajo: 'Portafolio', servicios: 'Paquetes', sobre: 'Sobre mí', equipo: 'Equipo', resenas: 'Clientes', proceso: 'Cómo trabajamos', faq: 'Preguntas frecuentes', contacto: 'Hablemos' },
      lista: ['C', 'G', 'M', 'A', 'I', 'H', 'K', 'B', 'E', 'D'],
    },
    proyectos: {
      subtipos: ['arquitectura_construccion'],
      orden: ['trabajo', 'servicios', 'sobre', 'equipo', 'resenas', 'proceso', 'video', 'faq', 'contacto'],
      nombres: { trabajo: 'Proyectos', servicios: 'Paquetes', sobre: 'Sobre mí', equipo: 'Equipo', resenas: 'Clientes', proceso: 'Cómo trabajamos', faq: 'Preguntas frecuentes', contacto: 'Hablemos' },
      lista: ['C', 'G', 'M', 'A', 'I', 'H', 'K', 'B', 'E', 'D'],
    },
  },
};
