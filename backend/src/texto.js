// Repara texto con doble codificación ("Â¡Hola AndrÃ©s! ð") — UTF-8 leído como Latin-1/Windows-1252.
// Solo cambia el texto si la reparación produce UTF-8 válido y elimina los rastros; si no, lo deja igual.
const CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
const RASTRO = /[ÃÂ][\u0080-¿Œ-™]|ð[\u0080-¿Œ-™]?|â[\u0080-¿Œ-™]/;
const cuenta = (s) => (s.match(/[ÃÂð]/g) || []).length;

export function repararTexto(s) {
  if (typeof s !== 'string' || !RASTRO.test(s)) return s;
  const bytes = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c <= 0xFF) bytes.push(c);
    else if (CP1252[c] !== undefined) bytes.push(CP1252[c]);
    else return s; // trae caracteres que no vienen de una mala decodificación: no se toca
  }
  try {
    const r = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
    return cuenta(r) < cuenta(s) ? r : s;
  } catch { return s; }
}
