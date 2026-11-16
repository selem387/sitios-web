// Ajustes de color comunes (16-nov-2026): los usan la plantilla general y la paleta de cada opción.
import { mezclar, contraste } from '../../entrevista/tema.js';

export const sobre = (bg, a = '#FFFFFF', b = '#16120F') => (contraste(a, bg) >= contraste(b, bg) ? a : b);
export const hsl = (h) => { let [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; S = L > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H /= 6; } return [H, S, L]; };
export const deHsl = (H, S, L) => { const f = (n) => { const k = (n + H * 12) % 12, a = S * Math.min(L, 1 - L); return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return `#${f(0)}${f(8)}${f(4)}`.toUpperCase(); };
// Mismo matiz, saturación mínima y luminosidad dada: oscurecer sin volverse gris.
export const tono = (h, L, Smin = 0.32, Smax = 1) => { const [H, S] = hsl(h); return deHsl(H, Math.min(Smax, Math.max(S, Smin)), L); };
export const conContraste = (c, bg, min = 4.5, hacia = '#000000') => { let x = c; for (let i = 0; i < 12 && contraste(x, bg) < min; i++) x = mezclar(x, hacia, 0.15); return x; };
