// Mapa del giro "Restaurantes y cafeterías" (etapa 3, aprobado por Sebastián el 18 y 19-nov-2026; doc del proyecto
// claude/etapa3-restaurantes.md). Sus secciones no son las del kit general: son las de la plantilla de restaurante
// (generador/restaurante/plantilla.js). orden: todas las opciones lo siguen. lista: A–F de restaurante (letras propias,
// opciones/restaurante/) y la P (Ficha en movimiento) de respaldo; las opciones nuevas de restaurante entran aquí después
// de las dos aprobaciones de Sebastián. Este archivo es compartido: solo lo cambia el chat designado.
export const SECCIONES_RESTAURANTE = Object.freeze(['destacados', 'menu', 'categorias', 'resenas', 'contacto']);
export const giro = {
  id: 'restaurante',
  porOmision: 'base',
  variantes: {
    base: {
      subtipos: [],
      orden: ['destacados', 'menu', 'categorias', 'resenas', 'contacto'],
      nombres: {},
      lista: ['A', 'B', 'C', 'D', 'E', 'F', 'P'],
    },
  },
};
