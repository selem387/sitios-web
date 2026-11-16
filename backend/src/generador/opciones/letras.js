// Patrones para reconocer la letra de una opción en mensajes y ligas. Salen del registro: al agregar una opción
// no hay que tocar ninguna expresión regular del chat, del panel ni de las rutas.
import { LETRAS } from './registro.js';

export { LETRAS };
/** Clase de caracteres con todas las letras válidas, en mayúsculas ("[ABC…]") o minúsculas. */
export const CLASE_MAYUS = `[${LETRAS}]`;
export const CLASE_MINUS = `[${LETRAS.toLowerCase()}]`;
/** ¿Es exactamente una letra de opción en mayúscula? (con {i:true} acepta minúscula) */
const RE_EXACTA = new RegExp(`^${CLASE_MAYUS}$`);
const RE_EXACTA_I = new RegExp(`^${CLASE_MAYUS}$`, 'i');
export const esLetra = (x, { i = false } = {}) => (i ? RE_EXACTA_I : RE_EXACTA).test(String(x ?? ''));
/** Liga de una propuesta: /p/<token>/<LETRA>. Con `captura` devuelve token y letra en grupos. */
export const reLigaPropuesta = ({ captura = false, token = '[A-Za-z0-9]+', borde = true } = {}) =>
  new RegExp(captura ? `\\/p\\/(${token})\\/(${CLASE_MAYUS})${borde ? '\\b' : ''}` : `\\/p\\/${token}\\/${CLASE_MAYUS}${borde ? '\\b' : ''}`);
