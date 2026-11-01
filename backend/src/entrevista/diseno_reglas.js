// Reglas de diseño que el generador recibe junto con arquetipos.diseno y diseno_estilos.
// Se siembran en la tabla diseno_reglas al arrancar (upsert por clave); editar aquí y redesplegar, o editar la fila.
export const VERSION_REGLAS = 'v1-2026-11-01';

export const REGLAS = {
  // Clichés visuales que delatan diseño generado por IA. No se usan salvo que el brief los pida por su nombre.
  tropes_prohibidos: {
    descripcion: 'Señales de diseño generado por IA. El generador NO las usa salvo que el brief las pida explícitamente.',
    lista: [
      'Fondos con gradientes agresivos o gradiente morado/rosa',
      'Emojis como íconos o viñetas (usar SVG: Lucide/Heroicons/Phosphor)',
      'Contenedores redondeados con borde izquierdo de color de acento',
      'Fuentes trilladas por defecto: Inter, Roboto, Arial, Fraunces',
      'Crema #F4F1EA + serif de alto contraste + acento terracota #D97757',
      'Fondo casi negro + un solo acento verde ácido o bermellón',
      'Layout tipo periódico (líneas finas, radio 0, columnas densas) sin que el contenido lo pida',
      'Kit de cards SaaS: todo en tarjetas idénticas, mismo radio, misma sombra gris rgba(0,0,0,.1)',
      'Eyebrow en MAYÚSCULAS espaciadas sobre cada título',
      'Metadatos unidos con puntos medios (A · B · C) o etiquetas "PALABRA — fragmento"',
      'Flecha → al final de cada botón o enlace',
      'Resaltar una sola palabra del titular en otro color o cursiva',
      'Numerar secciones 01/02/03 cuando el contenido no es una secuencia',
      'Fade-and-slide-up en cada sección y hover en cada card',
      'Ilustraciones dibujadas en SVG en lugar de fotos reales o placeholder honesto',
      'Monospace para etiquetas pequeñas de datos',
      'Casi-negro tintado (#0B0B0B, #111) en lugar de negro o del foreground de la paleta',
    ],
  },

  // Presupuesto de efectos según marca.efectos (el cliente elige en B7.8 conociendo los contras).
  niveles_efectos: {
    descripcion: 'Presupuesto de efectos según marca.efectos. Si el nivel no viene en el brief, aplica "sobrio".',
    sobrio: {
      animaciones: 'solo transiciones en hover/focus (150-250 ms) y una aparición en la primera pantalla',
      parallax: false, scroll_driven: false, video_hero: false, tres_d: false, glass: false,
      peso_js_kb_max: 30, lighthouse_movil_objetivo: 95,
    },
    moderado: {
      animaciones: 'una secuencia orquestada de carga + reveals al scroll con IntersectionObserver, respetando prefers-reduced-motion',
      parallax: 'suave, solo en hero', scroll_driven: 'CSS scroll-driven animations con fallback',
      video_hero: 'muted, con poster, < 2 MB, solo desktop', tres_d: false, glass: 'backdrop-filter solo en la navegación',
      peso_js_kb_max: 80, lighthouse_movil_objetivo: 90,
    },
    espectacular: {
      animaciones: 'libres, pero cada una con prefers-reduced-motion y versión estática',
      parallax: true, scroll_driven: true, video_hero: true,
      tres_d: 'modelo glTF < 3 MB con poster y carga diferida, solo si existe un asset real del cliente',
      glass: true, peso_js_kb_max: 250, lighthouse_movil_objetivo: 75,
      requiere: 'marca.efectos_aceptacion_riesgo = true (el cliente aceptó carga más lenta en celular y posible impacto en posicionamiento)',
      mitigaciones_obligatorias: [
        'El hero pinta sin JS: LCP antes de cargar cualquier efecto',
        'Todo efecto desactivado bajo prefers-reduced-motion',
        'En móvil se degrada automáticamente a "moderado" si el peso JS supera 120 KB',
        'Botón principal y botón de WhatsApp siempre visibles y estáticos',
      ],
    },
  },

  // Para que dos sitios del mismo arquetipo y estilo no salgan iguales.
  sorteo_variacion: {
    descripcion: 'El generador sortea con semilla = hash(entrevista_id) antes de diseñar y registra las decisiones.',
    reglas: [
      'Tipografía: elegir al azar entre tipografia y tipografia_alternativa del estilo y tipografia_giro del subtipo (3 candidatas); nunca Inter/Roboto/Arial como cuerpo',
      'Paleta: si el cliente no dio colores, partir de la paleta del subtipo y rotar el acento entre accent, secondary o un análogo a 30°',
      'Composición del hero: elegir 1 de 3 variantes del layout del estilo (texto a la izquierda, centrado, foto dominante)',
      'Una sola decisión audaz por sitio (tipografía gigante, foto a sangre, color pleno o asimetría); el resto sobrio',
      'Guardar las decisiones en sitios.reporte.sorteo para auditar repetición entre sitios',
    ],
  },
};

export const SCHEMA_REGLAS = `
CREATE TABLE IF NOT EXISTS diseno_reglas (
  clave       text PRIMARY KEY,
  valor       jsonb NOT NULL,
  version     text,
  actualizado timestamptz NOT NULL DEFAULT now()
);`;

/** Siembra/actualiza las reglas. Pasa la función q(sql, params) de db.js. */
export async function sembrarReglas(q) {
  await q(SCHEMA_REGLAS);
  for (const [clave, valor] of Object.entries(REGLAS)) {
    await q(
      `INSERT INTO diseno_reglas (clave, valor, version) VALUES ($1, $2, $3)
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, version = EXCLUDED.version, actualizado = now()
       WHERE diseno_reglas.version IS DISTINCT FROM EXCLUDED.version`,
      [clave, JSON.stringify(valor), VERSION_REGLAS],
    );
  }
}

/** Lee las reglas vigentes (la fila de la base manda sobre este archivo, por si se editó a mano). */
export async function reglasDiseno(q) {
  const r = await q(`SELECT clave, valor FROM diseno_reglas`);
  const out = { ...REGLAS };
  for (const row of r.rows) out[row.clave] = row.valor;
  return out;
}
