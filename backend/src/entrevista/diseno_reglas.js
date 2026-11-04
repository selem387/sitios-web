// Reglas de diseño que el generador recibe junto con arquetipos.diseno y diseno_estilos.
// Se siembran en la tabla diseno_reglas al arrancar (upsert por clave); editar aquí y redesplegar, o editar la fila.
import { REGLA_TIPO_COLOR } from '../generador/tipo_color.js';
import { REGLA_PALETAS } from '../generador/paletas_giro.js';
import { REGLA_ASESOR } from '../generador/asesor_color.js';

export const VERSION_REGLAS = 'v6-2026-11-04';

export const REGLAS = {
  // REGLA DURA de combinación tipográfica y de color (bibliografía 2026). Se ejecuta en código; esta fila es la referencia para prompts y auditoría.
  tipografia_color: REGLA_TIPO_COLOR,
  // REGLA DURA de paletas por giro, personalidad y estilo.
  paletas_giro: REGLA_PALETAS,
  // REGLA DURA: asesor de color (avisos sustentados a los colores del cliente, tendencias en B7, coherencia letra–paleta).
  asesor_color: REGLA_ASESOR,

  // Clichés de diseño hecho con IA: recursos que aparecen en miles de páginas generadas sin importar el giro. No se usan salvo que el brief los pida por su nombre.
  cliches_ia: {
    descripcion: 'Clichés de diseño hecho con IA. El generador NO los usa salvo que el brief los pida por su nombre.',
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

  // Fotos: lo real convierte más que lo generado (consenso de las guías 2026 para negocios locales).
  politica_fotos: {
    descripcion: 'Qué imágenes van en el sitio y qué puede generar la IA.',
    reglas: [
      'Hero: SIEMPRE foto real del cliente si existe una utilizable (assets con usar=true y calidad != mala); la IA nunca sustituye el local, los productos, al dueño ni al equipo',
      'IA (Higgsfield) solo para fondos abstractos, texturas, iconografía y composiciones sin personas ni lugares reconocibles; nunca personas, nunca "el local"',
      'Si no hay foto real para el hero: hero tipográfico o de color pleno con la paleta, no stock ni IA de personas',
      'Pedir en B8 una foto vertical (9:16) del local o del dueño para el hero móvil; si solo hay horizontales, encuadrar con object-position al sujeto',
      'Fotos reales se sirven en WebP/AVIF con srcset; la del hero sin lazy load y con dimensiones declaradas (evitar CLS)',
      'Fotos borrosas, oscuras o con texto superpuesto se descartan (usar=false) y se avisa al cliente una sola vez',
      'Todas las imágenes con alt descriptivo en español; decorativas con alt vacío',
    ],
  },

  // Densidad visual (dial de Taste v2 adaptado): se infiere del giro y se puede corregir en B7.
  densidad: {
    descripcion: 'Qué tan apretado o aireado es el sitio. marca.densidad = compacta | media | aireada. Ari la infiere por giro y solo pregunta si hay duda.',
    por_defecto: {
      restaurante: 'compacta', tienda: 'compacta', oficios: 'media', clinica: 'media', educacion: 'media',
      inmobiliaria: 'media', turismo: 'aireada', servicios: 'aireada', generico: 'media',
    },
    tokens: {
      compacta: { padding_seccion: '48px', gap: '16px', max_ancho_texto: '72ch', tamano_base: '16px' },
      media: { padding_seccion: '80px', gap: '24px', max_ancho_texto: '65ch', tamano_base: '17px' },
      aireada: { padding_seccion: '128px', gap: '40px', max_ancho_texto: '60ch', tamano_base: '18px' },
    },
  },

  // Guía de estructura de temas de bloques (resumen del skill oficial Automattic/agent-skills wp-block-themes, WP 6.9+).
  wp_block_themes: {
    descripcion: 'Reglas de estructura para todo lo que el generador escriba en el tema de WordPress. Fuente: Automattic/agent-skills (wp-block-themes), WordPress 6.9+.',
    reglas: [
      'theme.json versión 3; separar settings (lo que el editor permite: presets de color, tipografía, espaciado, layout) de styles (apariencia por defecto)',
      'Preferir presets cuando el cliente debe poder elegir en el editor; preferir styles para defaults consistentes sin exponer control',
      'Jerarquía de estilos: core → theme.json → tema hijo → personalizaciones del usuario; una edición en theme.json puede parecer ignorada si el usuario ya personalizó',
      'Plantillas en templates/*.html; partes en parts/*.html SIN subcarpetas; patrones en patterns/*.php registrados por cabecera (Title, Slug, Categories, Inserter)',
      'Variaciones de estilo en styles/*.json; al elegirla, WordPress guarda la selección en la base, así que cambiar el archivo no actualiza lo ya seleccionado: para cambios post-publicación, escribir global-styles vía REST (/wp/v2/global-styles/{id})',
      'WP 6.9: settings.border.radiusSizes para presets de radio; styles.elements.input/select para formularios (borde, color, outline, sombra, espaciado); hover/focus de botones en theme.json sin CSS extra',
      'Mantener estable el marcado de los patrones ya publicados: cambiar nombres de bloques rompe contenido existente; versionar patrones nuevos con slug nuevo',
      'Declarar la versión mínima de WordPress en style.css (Requires at least: 6.9)',
      'Usar solo bloques core (cover, group, columns, buttons, details, gallery, query) salvo módulos propios (iaprop-inmuebles); nada de builders',
      'Validar: theme.json parsea, cada pattern tiene cabecera, templates/index.html existe, parts/header.html y parts/footer.html existen',
    ],
  },
};

// Reglas deterministas de QA tomadas de ibelick/ui-skills (MIT): fixing-motion-performance y fixing-accessibility.
// Se insertan en diseno_checklist con version 'ui-skills-2026-11-01' (complementan las 47 de UUPM).
export const CHECKLIST_UI_SKILLS = [
  // Rendimiento de animación
  ['Animación', 'Mecanismo', 'Animar solo transform y opacity; JS solo cuando la interacción lo exige', 'Animar layout (width/height/top/left) o paint (color, sombra, gradiente) en superficies grandes', 'Critical'],
  ['Animación', 'Scroll', 'Scroll-driven animations (Scroll/View Timeline) con fallback, o IntersectionObserver para visibilidad', 'Leer scrollY/scrollTop o escuchar scroll para animar', 'Critical'],
  ['Animación', 'Loops', 'Toda animación por requestAnimationFrame tiene condición de parada y se pausa fuera de pantalla', 'rAF infinito o animaciones corriendo en secciones no visibles', 'High'],
  ['Animación', 'Medición', 'Medir una vez, agrupar lecturas antes de escrituras (FLIP para cambios de layout)', 'Intercalar lecturas y escrituras de layout en el mismo frame', 'High'],
  ['Animación', 'Variables CSS', 'Animar variables CSS solo con alcance local', 'Animar variables heredadas o usarlas para transform/opacity/posición', 'Medium'],
  ['Animación', 'Capas', 'will-change temporal y puntual; validar promoción de capas', 'Muchas capas promovidas o grandes; will-change permanente', 'Medium'],
  ['Animación', 'Blur', 'Blur solo en efectos cortos de una vez, ≤ 8px, en elementos pequeños', 'Animar blur de forma continua o en superficies grandes', 'Medium'],
  ['Animación', 'Movimiento reducido', 'prefers-reduced-motion desactiva todo movimiento no esencial y muestra el estado final', 'Ignorar prefers-reduced-motion', 'Critical'],
  // Accesibilidad
  ['Accesibilidad', 'Nombres accesibles', 'Todo control interactivo tiene nombre; botones de solo ícono con aria-label; íconos decorativos aria-hidden', 'Botones de ícono sin etiqueta; enlaces "clic aquí"', 'Critical'],
  ['Accesibilidad', 'Teclado', 'Todo lo interactivo es alcanzable con Tab, con foco visible; Escape cierra overlays', 'div/span como botón sin soporte de teclado; tabindex > 0; quitar outline sin reemplazo', 'Critical'],
  ['Accesibilidad', 'Diálogos', 'Modales atrapan el foco, ponen foco inicial dentro y lo devuelven al disparador al cerrar', 'Abrir un modal que desplaza la página o deja el foco detrás', 'Critical'],
  ['Accesibilidad', 'Semántica', 'Elementos nativos (button, a, input, ul/ol/li, th); niveles de encabezado sin saltos', 'Roles ARIA para imitar elementos nativos; saltar de h1 a h3', 'High'],
  ['Accesibilidad', 'Formularios', 'Errores ligados con aria-describedby; requeridos anunciados; aria-invalid en campos inválidos; ayuda asociada al input', 'Error solo visual o solo arriba del formulario; enviar deshabilitado sin explicar por qué', 'High'],
  ['Accesibilidad', 'Anuncios', 'Errores críticos con aria-live; cargas con aria-busy o texto de estado; expandibles con aria-expanded/aria-controls', 'Toast como único aviso de algo crítico', 'Medium'],
  ['Accesibilidad', 'Estados', 'Hover siempre con equivalente de teclado; deshabilitado no solo por color', 'Acciones que solo aparecen al pasar el mouse', 'Medium'],
  ['Accesibilidad', 'Medios', 'alt correcto (descriptivo o vacío si decorativa); subtítulos en video con voz; nada con sonido en autoplay', 'Video con audio en autoplay; imágenes informativas sin alt', 'Medium'],
  // Jerarquía y base (baseline-ui)
  ['Layout', 'Jerarquía', 'Una idea por sección; un solo elemento memorable por pantalla; el resto disciplinado', 'Todo del mismo tamaño y peso; tres cosas compitiendo por atención', 'High'],
  ['Layout', 'Espaciado', 'Escala de espaciado del theme.json en todo el sitio (sin valores sueltos)', 'Márgenes y paddings arbitrarios por sección', 'Medium'],
  ['Tipografía', 'Medida', 'Líneas de 45–75 caracteres; serif con algo más de interlineado', 'Párrafos a todo el ancho en desktop', 'Medium'],
  ['Metadatos', 'SEO/OG', 'title ≤ 60, description con beneficio, og:image 1200×630 por página, canonical, lang="es-MX"', 'Título genérico "Inicio"; sin OG; lang ausente', 'High'],
];

export async function sembrarChecklistUiSkills(q) {
  const v = 'ui-skills-2026-11-01';
  const r = await q(`SELECT count(*)::int AS n FROM diseno_checklist WHERE version = $1`, [v]);
  if (r.rows[0]?.n === CHECKLIST_UI_SKILLS.length) return;
  await q(`DELETE FROM diseno_checklist WHERE version = $1`, [v]);
  for (const [categoria, tema, hacer, evitar, severidad] of CHECKLIST_UI_SKILLS) {
    await q(`INSERT INTO diseno_checklist (categoria, tema, hacer, evitar, severidad, version) VALUES ($1,$2,$3,$4,$5,$6)`, [categoria, tema, hacer, evitar, severidad, v]);
  }
}

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
  await q(`DELETE FROM diseno_reglas WHERE clave = 'tropes_prohibidos'`);
  await q(`CREATE TABLE IF NOT EXISTS diseno_checklist (id serial PRIMARY KEY, categoria text, tema text, hacer text, evitar text, severidad text, version text)`);
  await sembrarChecklistUiSkills(q).catch((e) => console.error('checklist ui-skills', e.message));
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
