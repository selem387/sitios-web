// Regla dura de tipografía y color (generador/tipo_color.js).
import { validarPar, escalaTipografica, apca, wcag, oklch, aHex, corregirPaleta, auditarPaleta, acentoArmonico, cumple } from '../src/generador/tipo_color.js';
import { CATALOGO, paresTipograficos, urlFuentes } from '../src/generador/fuentes.js';
let ok = 0, n = 0;
const t = (c, m) => { n++; if (c) ok++; console.log(c ? 'OK  ' : 'FAIL', m); };

t(Object.values(CATALOGO).flat().every((p) => validarPar(p).ok), 'todo el catálogo cumple la regla de pares');
t(!validarPar({ titulos: 'Schibsted Grotesk', cuerpo: 'Instrument Sans' }).ok, 'dos grotescas parecidas: rechazado');
t(!validarPar({ titulos: 'Familjen Grotesk', cuerpo: 'Geist Mono' }).ok, 'mono como cuerpo: rechazado');
t(!validarPar({ titulos: 'Gloock', cuerpo: 'Cormorant Garamond' }).ok, 'cuerpo con altura x baja: rechazado');
t(validarPar({ titulos: 'Instrument Serif', cuerpo: 'Instrument Sans' }).ok, 'superfamilia: aceptado');
t(!validarPar({ titulos: 'Fuente Inventada', cuerpo: 'Onest' }).ok, 'fuente sin métricas medidas: rechazada');
t(paresTipograficos('minimalista', {}, 6).length === 6, '6 pares válidos por estilo');
t(!urlFuentes([{ titulos: 'Gloock', cuerpo: 'Onest' }]).includes('Gloock:wght'), 'URL sin pesos inexistentes');
const e = escalaTipografica('lujo', { cuerpo: 'Hanken Grotesk' });
t(e.ratio[1] === 1.414 && e.cuerpo.startsWith('clamp(1rem') && e.interlineado.cuerpo === 1.55, 'escala modular fluida y cuerpo 16→18');
t(Math.abs(apca('#000000', '#FFFFFF') - 106) < 0.5 && Math.abs(apca('#FFFFFF', '#000000') - 107.9) < 0.5, 'APCA de referencia (106 / 107.9)');
t(Math.abs(wcag('#000000', '#FFFFFF') - 21) < 0.01, 'WCAG 21:1');
t(aHex(oklch('#0D7377')) === '#0D7377', 'OKLCH ida y vuelta');
for (const [nombre, pal] of [
  ['rosa medio', { bg: '#CC246C', fg: '#FFF8C8', primary: '#FFF8C8', accent: '#FFE600', card: '#D33A7E', soft: '#F7B5CF' }],
  ['celeste sin contraste', { bg: '#F0F9FF', fg: '#7DD3FC', primary: '#38BDF8', accent: '#0EA5E9', card: '#FFFFFF', soft: '#BAE6FD' }],
  ['amarillo marca', { bg: '#FFFBEA', fg: '#3A3330', primary: '#FFD400', card: '#FFFFFF' }],
]) {
  const r = corregirPaleta(pal);
  t(auditarPaleta(r.paleta).length === 0, `paleta corregida pasa auditoría (${nombre})`);
  t(Math.abs(oklch(r.paleta.primary).h - oklch(pal.primary).h) < 4 || oklch(pal.primary).c < 0.03, `conserva el tono del cliente (${nombre})`);
}
const a = acentoArmonico('#1E3A8A', 'tecnologico');
t(a.armonia === 'complementario' && Math.abs(((oklch(a.hex).h - oklch('#1E3A8A').h + 360) % 360) - 180) < 8, 'acento complementario en OKLCH');
t(cumple('#111111', '#FFFFFF') && !cumple('#888888', '#FFFFFF'), 'umbral de cuerpo (4.5 + Lc 75)');
console.log(`${ok}/${n}`);
if (ok !== n) process.exit(1);
