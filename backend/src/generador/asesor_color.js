// Asesor de color (v1, 4-nov-2026). Tres trabajos:
// 1. Evaluar los colores que da el cliente contra la evidencia y avisar con sugerencias concretas (sus colores mandan).
// 2. Ofrecer en B7 las tendencias 2026–2027 de fuentes serias, ya combinadas con su giro, personalidad y letras.
// 3. Coherencia letra–paleta: que la personalidad de la tipografía y la de los colores digan lo mismo.
//
// Evidencia (ver doc claude/asesor-color-2026.md):
// - Ajuste color–personalidad de marca y efecto de saturación/luminosidad: Labrecque & Milne (2012, JAMS).
// - Color en contexto, sin significados universales: Elliot & Maier (2014, Annual Review of Psychology).
// - Saturación aumenta tamaño/peso percibido y la intensidad: Hagtvedt & Brasel (2017, Journal of Consumer Research).
// - Adecuación a la categoría y la cultura: Spence et al. (2022, Cognitive Research).
// - Vibración de complementarios saturados de igual valor: Albers, Interaction of Color.
// - Daltonismo (~8 % de hombres con deficiencia rojo-verde): distinguir por luminosidad, no solo por tono (WCAG 1.4.1).
// - Contraste: WCAG 2.2 (1.4.3, 1.4.11) + APCA de apoyo.
// - Tendencias: WGSN×Coloro Color del año 2026 Transformative Teal y A/W 26-27; 2027 Luminous Blue y S/S 27; Pantone 2026 Cloud Dancer.

import { oklch, aHex, cumple, wcag, buscarL, dimensionesFuente, METRICAS } from './tipo_color.js';
import { paletasPara, dimensionesDe, avisosDeGiro, TENDENCIAS } from './paletas_giro.js';

const cromatico = (h) => oklch(h).c > 0.04;
const distTono = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const esHex = (c) => /^#[0-9A-F]{6}$/i.test(c);

/** Nombre simple del color para hablar con el cliente. */
export function nombreColor(hex) {
  const { l, c, h } = oklch(hex);
  if (c < 0.03) return l > 0.9 ? 'blanco' : l < 0.25 ? 'negro' : 'gris';
  const t = l > 0.8 ? ' claro' : l < 0.4 ? ' oscuro' : '';
  if (c < 0.1 && h >= 20 && h < 70 && l > 0.45 && l < 0.8) return 'arcilla';
  if (c < 0.1 && h >= 70 && h < 110 && l >= 0.6) return l > 0.88 ? 'crema' : 'arena';
  const base = h < 15 || h >= 345 ? 'rosa fuerte' : h < 42 ? 'rojo' : h < 70 ? (l < 0.55 ? 'café' : 'naranja') : h < 105 ? (l < 0.55 ? 'café dorado' : 'amarillo') : h < 150 ? 'verde' : h < 228 ? 'verde azulado' : h < 278 ? 'azul' : h < 322 ? 'morado' : 'rosa';
  return base + t;
}

/** Personalidad que transmiten unos colores (Labrecque & Milne: tono + saturación + luminosidad). */
export function dimensionesPaleta(colores = []) {
  const cs = colores.filter(esHex);
  const d = new Set();
  const cr = cs.filter(cromatico);
  const marca = cr[0] ? oklch(cr[0]) : null;
  const hayNegro = cs.some((x) => { const o = oklch(x); return o.c < 0.05 && o.l < 0.32; });
  const hayOro = cr.some((x) => { const o = oklch(x); return o.h > 65 && o.h < 100 && o.c > 0.05 && o.c < 0.13 && o.l > 0.55 && o.l < 0.8; });
  if (hayNegro && (hayOro || cr.length <= 1)) d.add('sofisticada');
  if (!marca) { d.add(hayNegro ? 'sofisticada' : 'competente'); return [...d]; }
  const { l, c, h } = marca;
  const calido = h < 100 || h > 330;
  if (c >= 0.15) d.add('emocionante');
  if (c >= 0.15 && !calido) d.add('competente');
  if (c < 0.15 && h >= 180 && h < 290) d.add('competente');
  if (l < 0.42 && c < 0.12) d.add('sofisticada');
  if (hayOro && l < 0.45) d.add('sofisticada'); // oscuro + metal: lujo (Labrecque & Milne: baja luminosidad = sofisticación)
  if ((h >= 290 || h < 10) && c < 0.15) d.add('sofisticada');
  if (calido && c >= 0.04 && c < 0.16 && l >= 0.35) d.add('sincera');
  if (h >= 30 && h < 140 && c < 0.11 && l < 0.5) d.add('ruda');
  if (h >= 120 && h < 180) { d.add('sincera'); if (c < 0.15) d.add('competente'); }
  return [...d];
}

/**
 * Coherencia entre un par tipográfico y una paleta: 0 = incoherente (no se combina), más alto = mejor.
 * La letra de títulos lleva la voz (Lupton); debe compartir al menos una dimensión con la paleta,
 * y hay choques que se prohíben aunque compartan alguna.
 */
export function coherenciaFuentePaleta(par, colores) {
  const f = dimensionesFuente(par), p = dimensionesPaleta(colores);
  const sub = METRICAS[par.titulos]?.sub || '';
  const marca = colores.filter(esHex).find(cromatico);
  const sat = marca ? oklch(marca).c : 0;
  const motivos = [];
  if (['didona', 'elegante-fina', 'glifica'].includes(sub) && sat >= 0.2 && !p.includes('sofisticada')) motivos.push('letra de alta elegancia con colores muy saturados y juguetones');
  if (/ludica|redondeada|pesada-ancha/.test(sub) && p.includes('sofisticada') && !p.includes('emocionante')) motivos.push('letra juguetona con paleta sobria y de lujo');
  if (['mono', 'tecnica-cuadrada'].includes(sub) && p.includes('ruda') && !p.includes('competente')) motivos.push('letra técnica con paleta rústica');
  const comunes = f.titulos.filter((x) => p.includes(x)).length * 2 + f.todas.filter((x) => p.includes(x)).length;
  if (!f.titulos.some((x) => p.includes(x)) && !f.todas.some((x) => p.includes(x))) motivos.push('la letra y los colores transmiten personalidades distintas');
  return { puntaje: motivos.length ? 0 : comunes, motivos, fuente: f.titulos, paleta: p };
}

/**
 * Asigna a cada paleta (una por propuesta) el par tipográfico más coherente, sin repetir títulos.
 * candidatos: pares en orden de preferencia. Devuelve un par por paleta.
 */
export function asignarFuentes(paletas, candidatos) {
  const usados = new Set();
  return paletas.map((colores, i) => {
    const libres = candidatos.filter((p) => !usados.has(p.titulos));
    const pool = libres.length ? libres : candidatos;
    const evaluados = pool.map((p, k) => ({ p, k, c: coherenciaFuentePaleta(p, colores) }));
    evaluados.sort((a, b) => b.c.puntaje - a.c.puntaje || a.k - b.k);
    // Preferencia por el orden original si empata: se mantiene la variedad que ya traía el catálogo.
    const elegido = evaluados[0];
    usados.add(elegido.p.titulos);
    return { ...elegido.p, coherencia: elegido.c };
  });
}

/**
 * Evalúa los colores del cliente. No los cambia: devuelve hallazgos con explicación simple, razón y sugerencias.
 * @returns {{hallazgos: Array<{tipo, colores, mensaje_cliente, por_que, fuente, sugerencias: Array<{hex, nombre, motivo}>}>, corregidos: string[]|null}}
 */
export function evaluarColoresCliente({ brief = {}, colores = [] }) {
  const n = brief.negocio || {};
  const st = n.subtipo_resuelto || n.subtipo;
  const cs = [...new Set(colores.filter(esHex).map((c) => c.toUpperCase()))];
  const cr = cs.filter(cromatico);
  const hallazgos = [];
  const corr = new Map(); // color original → sugerido
  const { familias } = paletasPara({ arquetipo: n.arquetipo, subtipo: st, estilo: brief.marca?.estilo, dimensiones: dimensionesDe(brief) });
  const sug = (hex, motivo) => ({ hex, nombre: nombreColor(hex), motivo });

  // 1. Choque con el giro (convención de categoría; Spence et al. 2022).
  for (const a of avisosDeGiro({ arquetipo: n.arquetipo, subtipo: st, colores: cr })) {
    const hex = a.slice(0, 7);
    const alt = familias[0];
    if (!corr.has(hex)) corr.set(hex, alt.m);
    hallazgos.push({
      tipo: 'giro', colores: [hex],
      mensaje_cliente: `El ${nombreColor(hex)} en tu giro suele jugar en contra: ${a.split(': ')[1]}. Lo podemos dejar como detalle pequeño y usar de color principal un ${nombreColor(alt.m)}.`,
      por_que: 'Los clientes leen el color según lo que esperan del tipo de negocio; un color fuera de código se reconoce peor (adecuación a la categoría).',
      fuente: 'Spence et al. 2022, Cognitive Research; Elliot & Maier 2014',
      sugerencias: [sug(alt.m, `color principal de la combinación "${alt.n}"`), sug(hex, 'tu color, como acento pequeño (botón o detalle)')],
    });
  }

  // 2. Ajuste con la personalidad que dijo (Labrecque & Milne 2012: saturación y luminosidad amplifican rasgos).
  const quiere = dimensionesDe(brief);
  const transmite = dimensionesPaleta(cs);
  if (quiere.length && cr.length && !quiere.some((d) => transmite.includes(d))) {
    const o = oklch(cr[0]);
    let nuevo = null, que = '';
    if (quiere.includes('sofisticada')) { nuevo = aHex({ ...o, c: Math.min(o.c, 0.09), l: Math.min(o.l, 0.38) }); que = 'más oscuro y menos chillante'; }
    else if (quiere.includes('competente')) { nuevo = aHex({ ...o, c: Math.min(Math.max(o.c, 0.08), 0.13), l: Math.min(o.l, 0.45) }); que = 'más sobrio y profundo'; }
    else if (quiere.includes('emocionante')) { nuevo = aHex({ ...o, c: Math.max(o.c, 0.17), l: Math.min(Math.max(o.l, 0.55), 0.68) }); que = 'más vivo'; }
    else if (quiere.includes('sincera')) { nuevo = aHex({ ...o, c: Math.min(o.c, 0.12), l: Math.max(o.l, 0.5) }); que = 'más suave'; }
    if (nuevo && nuevo !== cr[0]) {
      corr.set(cr[0], nuevo);
      hallazgos.push({
        tipo: 'personalidad', colores: [cr[0]],
        mensaje_cliente: `Me dijiste que tu negocio es ${[].concat(brief.marca?.personalidad || []).join(', ')}. Tu ${nombreColor(cr[0])} así de intenso transmite algo distinto; el mismo color, ${que}, va mejor con eso.`,
        por_que: 'No cambia el tono, solo su intensidad y luminosidad: la saturación y la claridad son las que más mueven la personalidad que se percibe.',
        fuente: 'Labrecque & Milne 2012, J. Academy of Marketing Science; Hagtvedt & Brasel 2017, J. Consumer Research',
        sugerencias: [sug(nuevo, `tu mismo color, ${que}`)],
      });
    }
  }

  // 3. Legibilidad: color muy claro o neón como color principal (WCAG 2.2).
  for (const c of cr) {
    const o = oklch(c);
    // Solo es problema si ni letra blanca ni letra oscura se leen sobre él (no sirve ni de botón); los claros sirven con letra oscura.
    if (!cumple('#FFFFFF', c, 'boton') && !cumple('#111111', c, 'boton')) {
      const oscuro = buscarL(c, (x) => cumple('#FFFFFF', x, 'boton')) || aHex({ ...o, l: 0.45 });
      // Ajuste pequeño (≤ 0.1 de luminosidad): se hace en automático sin molestar al cliente (corregirPaleta).
      const pequeno = Math.abs(oklch(oscuro).l - o.l) <= 0.1;
      if (!pequeno && !corr.has(c)) corr.set(c, oscuro);
      if (!pequeno) hallazgos.push({
        tipo: 'legibilidad', colores: [c],
        mensaje_cliente: `El ${nombreColor(c)} queda a medio camino: ni letra blanca ni letra negra se leen bien encima en el celular. Para botones usamos el mismo tono un poco más oscuro y el tuyo como fondo o detalle.`,
        por_que: 'Con ese color, ni la letra blanca ni la negra llegan al contraste mínimo de accesibilidad: se lee mal con sol o en pantallas económicas.',
        fuente: 'WCAG 2.2, criterios 1.4.3 y 1.4.11; APCA',
        sugerencias: [sug(oscuro, 'mismo tono, con contraste suficiente para botón'), sug(c, 'tu color, como fondo o detalle')],
      });
    }
    if (o.c > 0.24 && o.l > 0.62) {
      hallazgos.push({
        tipo: 'neon', colores: [c],
        mensaje_cliente: `El ${nombreColor(c)} es muy fosforescente: en superficies grandes cansa la vista. Lo usamos en poquito (un botón o un detalle), que es donde luce.`,
        por_que: 'Los colores muy saturados se perciben más grandes e intensos; en exceso cansan y compiten con el botón principal.',
        fuente: 'Hagtvedt & Brasel 2017; proporción 60-30-10',
        sugerencias: [sug(aHex({ ...o, c: 0.16 }), 'versión menos fosforescente para áreas medianas')],
      });
    }
  }

  // 4. Demasiados colores (carga visual; 60-30-10).
  if (cr.length > 3) {
    const [a, ...resto] = cr;
    const b = resto.sort((x, y) => distTono(oklch(y).h, oklch(a).h) - distTono(oklch(x).h, oklch(a).h))[0];
    hallazgos.push({
      tipo: 'exceso', colores: cr,
      mensaje_cliente: `Son ${cr.length} colores; en una página se ve revuelto y el botón importante deja de resaltar. Te propongo uno principal (${nombreColor(a)}) y uno de acento (${nombreColor(b)}); los demás, como detalles.`,
      por_que: 'Un color dominante, uno de apoyo y un acento dan orden y hacen que el botón principal destaque.',
      fuente: 'Regla 60-30-10; Albers, Interaction of Color',
      sugerencias: [sug(a, 'color principal'), sug(b, 'acento')],
    });
  }

  // 5. Vibración y daltonismo entre pares.
  for (let i = 0; i < cr.length; i++) for (let j = i + 1; j < cr.length; j++) {
    const A = oklch(cr[i]), B = oklch(cr[j]);
    const dt = distTono(A.h, B.h), dl = Math.abs(A.l - B.l);
    if (A.c > 0.15 && B.c > 0.15 && dt > 120 && dl < 0.1) {
      const B2 = aHex({ ...B, l: A.l > 0.5 ? Math.max(0.25, A.l - 0.3) : Math.min(0.9, A.l + 0.3) });
      if (!corr.has(cr[j])) corr.set(cr[j], B2);
      hallazgos.push({
        tipo: 'vibracion', colores: [cr[i], cr[j]],
        mensaje_cliente: `El ${nombreColor(cr[i])} y el ${nombreColor(cr[j])} juntos "vibran": a la vista le cuesta enfocar el borde entre los dos. Si uno es más claro u oscuro que el otro, se ven bien juntos.`,
        por_que: 'Dos colores opuestos, muy intensos y con la misma claridad producen vibración óptica.',
        fuente: 'Josef Albers, Interaction of Color',
        sugerencias: [sug(B2, `el ${nombreColor(cr[j])} con otra claridad`)],
      });
    }
    const rojo = (o) => o.h >= 15 && o.h < 50, verde = (o) => o.h >= 120 && o.h < 170;
    if (((rojo(A) && verde(B)) || (verde(A) && rojo(B))) && dl < 0.15) {
      hallazgos.push({
        tipo: 'daltonismo', colores: [cr[i], cr[j]],
        mensaje_cliente: `Ojo: rojo y verde con la misma claridad se confunden para 1 de cada 12 hombres (daltonismo). Haremos uno bastante más claro que el otro para que todos los distingan.`,
        por_que: 'La deficiencia rojo-verde es común; la diferencia de claridad sí la perciben todos.',
        fuente: 'WCAG 2.2, criterio 1.4.1 (uso del color)',
        sugerencias: [sug(aHex({ ...B, l: Math.min(0.85, Math.max(0.32, A.l > 0.55 ? A.l - 0.25 : A.l + 0.25)) }), `el ${nombreColor(cr[j])} con otra claridad`)],
      });
    }
  }

  const corregidos = corr.size ? cs.map((c) => corr.get(c) || c) : null;
  return { hallazgos, corregidos };
}

/**
 * 3 opciones de paleta para ofrecer en B7 (si el cliente no tiene colores o pide ideas): las familias del giro
 * mejor ajustadas a su estilo y personalidad, priorizando las que usan colores de tendencia 2026–2027,
 * cada una con la letra de títulos coherente con esos colores.
 */
export function opcionesTendencia({ brief = {}, pares = [] }) {
  const n = brief.negocio || {};
  const { familias } = paletasPara({ arquetipo: n.arquetipo, subtipo: n.subtipo_resuelto || n.subtipo, estilo: brief.marca?.estilo, dimensiones: dimensionesDe(brief) });
  const tend = Object.values(TENDENCIAS);
  const deTendencia = (f) => tend.filter((t) => [f.m, f.a, f.c].map((x) => x.toUpperCase()).includes(t.hex.toUpperCase()));
  // Ajuste primero (estilo + personalidad); la tendencia suma, no impone.
  const tres = [...familias].map((f, k) => ({ f, k, s: f.puntaje + (deTendencia(f).length ? 2 : 0) })).sort((a, b) => b.s - a.s || a.k - b.k).slice(0, 3).map((x) => x.f);
  const letras = pares.length ? asignarFuentes(tres.map((f) => [f.m, f.a, f.c]), pares) : [];
  return tres.map((f, i) => ({
    nombre: f.n,
    descripcion: `${nombreColor(f.m)} con ${nombreColor(f.a)} sobre ${nombreColor(f.c)}`,
    colores: { marca: f.m, acento: f.a, fondo: f.c, texto: f.o },
    por_que: f.por,
    tendencia: deTendencia(f).map((t) => t.fuente),
    letra_titulos: letras[i]?.titulos || null,
  }));
}

/** Texto del asesor para el prompt de Ari en B7. */
export function contextoColorParaAri({ brief = {}, coloresCliente = [], pares = [] }) {
  const partes = [];
  const ev = coloresCliente.length ? evaluarColoresCliente({ brief, colores: coloresCliente }) : { hallazgos: [] };
  if (ev.hallazgos.length && !brief.marca?.colores_aviso_aceptado) {
    partes.push(`ASESOR_COLOR (colores que dio el cliente: ${coloresCliente.map((c) => `${nombreColor(c)} ${c}`).join(', ')}):\n${ev.hallazgos.slice(0, 2).map((h) => `- ${h.mensaje_cliente} [razón: ${h.por_que} | fuente: ${h.fuente} | sugerencias: ${h.sugerencias.map((s) => `${s.nombre} ${s.hex} (${s.motivo})`).join('; ')}]`).join('\n')}`);
  }
  const op = opcionesTendencia({ brief, pares });
  partes.push(`TENDENCIAS_PARA_OFRECER (combinaciones de su giro; las marcadas con fuente son tendencia 2026–2027):\n${op.map((o, i) => `${i + 1}. ${o.nombre}: ${o.descripcion}. ${o.por_que}.${o.tendencia.length ? ` Tendencia: ${o.tendencia.join('; ')}.` : ''}${o.letra_titulos ? ` Letra de títulos que combina: ${o.letra_titulos}.` : ''}`).join('\n')}`);
  return partes.join('\n\n');
}

export const REGLA_ASESOR = {
  descripcion: 'REGLA DURA (4-nov-2026): los colores del cliente se evalúan y, si no cumplen las mejores prácticas, Ari avisa con una razón simple y una sugerencia sustentada; el cliente decide. En B7 Ari ofrece tendencias 2026–2027 combinadas con su giro y con letras coherentes.',
  reglas: [
    'Se evalúa: choque con el código del giro, ajuste con la personalidad que dijo (saturación/luminosidad), legibilidad para botón y texto, neón en áreas grandes, más de 3 colores, vibración de opuestos saturados de igual claridad, rojo-verde con igual claridad',
    'Cada aviso lleva: explicación en palabras simples, razón, fuente y al menos una sugerencia en hex con nombre de color',
    'Las sugerencias conservan el tono del cliente siempre que se pueda (solo cambian intensidad o claridad)',
    'Los colores del cliente mandan: si dice que se quedan, se guarda marca.colores_aviso_aceptado=true y no se vuelve a insistir',
    'Si hay hallazgos sin aceptar, la propuesta F se arma con los colores corregidos para que el cliente compare',
    'Tendencias solo de fuentes de pronóstico serias (WGSN×Coloro, Pantone) y sustento académico; nunca listas de blogs como fuente principal',
    'Coherencia letra–paleta: la letra de títulos debe compartir personalidad con la paleta; prohibido didona/fina con colores neón juguetones, letra juguetona con paleta de lujo y letra técnica con paleta rústica',
  ],
  bibliografia: [
    'Labrecque & Milne (2012), Journal of the Academy of Marketing Science',
    'Hagtvedt & Brasel (2017), Color saturation increases perceived product size, Journal of Consumer Research',
    'Elliot & Maier (2014), Annual Review of Psychology',
    'Spence et al. (2022), Cognitive Research: Principles and Implications',
    'Josef Albers, Interaction of Color',
    'W3C WCAG 2.2 (1.4.1, 1.4.3, 1.4.11)',
    'Ellen Lupton, Thinking with Type',
    'WGSN×Coloro Color del año 2026 y 2027; Pantone Color del año 2026',
  ],
};
