// REGLA DURA de paletas por giro, temática y estilo (v1, 4-nov-2026). Doc: proyecto claude.ai claude/paletas-por-giro-2026.md.
//
// Cómo se elige (evidencia, no folclor):
// 1. Ajuste antes que significado: el color funciona cuando es coherente con la personalidad de la marca
//    (Labrecque & Milne, J. Academy of Marketing Science, 2012) y su significado depende del contexto y la cultura
//    (Elliot & Maier, Annual Review of Psychology, 2014; Spence et al., Cognitive Research 2022). No hay "azul = confianza" universal.
// 2. Personalidad → color (Labrecque & Milne): cálidos y saturados para "emocionante"; fríos de saturación media para
//    "competente"; oscuros, poco saturados y de alto contraste para "sofisticado"; claros y cálidos para "sincero/cercano";
//    tierras y verdes profundos para "rudo/aventurero".
// 3. Código del giro para que el cliente lo reconozca + un acento propio para diferenciarse (convención de categoría).
// 4. Restricciones fuertes por giro (p. ej. nada de azul dominante en comida; nada de rojo dominante en salud).
// 5. Tendencias 2026–2027 solo como neutros o acentos, nunca por encima de los colores del cliente:
//    Pantone 2026 Cloud Dancer (blanco cálido); WGSN×Coloro 2026 Transformative Teal y A/W 26-27 (Wax Paper, Cocoa Powder,
//    Fresh Purple, Green Glow); WGSN×Coloro 2027 Luminous Blue y S/S 27 (Energy Orange, Pop Pink, Meadowland Green, Clay).
//    Los hex de Coloro son aproximados (Coloro publica códigos propios, no hex).
// Todo lo que sale de aquí pasa después por corregirPaleta() de tipo_color.js (contraste WCAG 2.2 + APCA, 60-30-10).

import { oklch } from './tipo_color.js';

/** Colores de tendencia 2026–2027 (aprox.). Uso: neutros (n) o acentos (a); nunca texto si son claros. */
export const TENDENCIAS = {
  cloud_dancer: { hex: '#F0EEE9', uso: 'n', fuente: 'Pantone 2026 (11-4201 Cloud Dancer)' },
  wax_paper: { hex: '#F2EAD3', uso: 'n', fuente: 'WGSN×Coloro A/W 26-27' },
  transformative_teal: { hex: '#1F5C63', uso: 'a', fuente: 'WGSN×Coloro Color del año 2026' },
  cocoa_powder: { hex: '#5A3E36', uso: 'a', fuente: 'WGSN×Coloro A/W 26-27' },
  fresh_purple: { hex: '#6B2F86', uso: 'a', fuente: 'WGSN×Coloro A/W 26-27' },
  green_glow: { hex: '#C9E85A', uso: 'a', fuente: 'WGSN×Coloro A/W 26-27 (solo acento sobre oscuro)' },
  luminous_blue: { hex: '#2B4FE0', uso: 'a', fuente: 'WGSN×Coloro Color del año 2027' },
  energy_orange: { hex: '#F26B2A', uso: 'a', fuente: 'WGSN×Coloro S/S 27' },
  pop_pink: { hex: '#F2A6C4', uso: 'a', fuente: 'WGSN×Coloro S/S 27' },
  meadowland_green: { hex: '#6E9E5C', uso: 'a', fuente: 'WGSN×Coloro S/S 27' },
  clay: { hex: '#C48E7C', uso: 'a', fuente: 'WGSN×Coloro S/S 27' },
};

// Dimensiones de personalidad de marca (Aaker 1997; color según Labrecque & Milne 2012).
const DIM = {
  sincera: /cercan|confiabl|honest|familiar|amable|cálid|calid|sencill|human|natural|tradicional|auténtic|autentic|sincer|humilde/i,
  emocionante: /divertid|alegr|atrevid|joven|moderno|energ|dinámic|dinamic|creativ|innovador|fresc|vibrant|audaz|juvenil|original/i,
  competente: /profesional|seri|exper|confiable|segur|eficient|precis|líder|lider|responsab|puntual|técnic|tecnic|sólid|solid/i,
  sofisticada: /elegant|lujo|exclusiv|sofistic|premium|refinad|distingu|glamur|chic|minimal/i,
  ruda: /aventur|fuerte|rud|resistent|outdoor|salvaje|rústic|rustic|valiente/i,
};

// P(nombre, estilos, dimensiones, marca, acento, claro 60 %, oscuro texto, por qué)
const P = (n, e, d, m, a, c, o, por) => ({ n, e, d, m, a, c, o, por });
const T = TENDENCIAS;

/**
 * Familias por subtipo. Cada familia: marca (10 % botón/enlaces), acento, claro (fondo 60 %), oscuro (texto).
 * e = estilos de B5 donde encaja; d = dimensiones de personalidad.
 */
export const PALETAS = {
  inmobiliaria: {
    codigo: 'Azules profundos y verdes azulados (competencia), arena y piedra caliza (hogar, zona), un acento cálido',
    evitar: ['Rojo o naranja dominante (urgencia/presión de venta)', 'Neones', 'Negro total salvo estilo lujo'],
    familias: [
      P('Azul profundo y arena', ['elegante', 'minimalista', 'tradicional'], ['competente', 'sincera'], '#1D3A5F', '#C08A4E', '#F5F1EA', '#14202E', 'Competencia del azul oscuro con calidez de arena; código clásico del giro'),
      P('Teal 2026 y piedra', ['fresco', 'minimalista', 'elegante'], ['competente', 'sofisticada'], T.transformative_teal.hex, '#D08C60', T.cloud_dancer.hex, '#13292C', 'Color del año WGSN 2026 sobre blanco cálido Pantone 2026'),
      P('Verde selva y terracota', ['calido', 'tradicional', 'fresco'], ['sincera', 'ruda'], '#2F5D46', '#C2643F', '#F4EEE4', '#1B2A22', 'Naturaleza y casa; buena para desarrollos campestres y costa'),
      P('Grafito y latón', ['lujo', 'elegante', 'tecnologico'], ['sofisticada', 'competente'], '#23262B', '#B08D57', '#F2F0EC', '#15171A', 'Alto contraste y metal cálido: inmuebles premium'),
      P('Azul luminoso 2027', ['tecnologico', 'fresco', 'divertido'], ['emocionante', 'competente'], T.luminous_blue.hex, '#F2A65A', '#F6F7FB', '#151B33', 'Proptech o agencias jóvenes: azul de tendencia 2027'),
      P('Marino profundo, marfil y oro antiguo', ['elegante', 'lujo', 'tradicional'], ['sofisticada', 'competente'], '#172D4D', '#B58A45', '#F4F1EA', '#0F1C30', 'Dos colores base + un acento que la hace memorable (8-nov-2026): marino y marfil, oro solo en botón y detalles'),
    ],
  },
  medica: {
    codigo: 'Verde azulado clínico pero cálido, azul marino, salvia; mucho blanco cálido',
    evitar: ['Rojo dominante (alarma, sangre)', 'Negro como fondo', 'Saturados agresivos en áreas grandes'],
    familias: [
      P('Teal clínico cálido', ['minimalista', 'fresco', 'elegante'], ['competente', 'sincera'], '#0F6E73', '#E08A6E', '#F4F8F7', '#12302F', 'Teal: preciso y humano a la vez; el giro se alejó del azul-blanco frío'),
      P('Marino y salvia', ['tradicional', 'elegante', 'minimalista'], ['competente'], '#1E3D59', '#7FA38A', '#F6F7F4', '#15202B', 'Especialistas y hospitales: autoridad sin frialdad'),
      P('Salvia y menta suave', ['calido', 'fresco'], ['sincera'], '#4F7C6A', '#E3B26B', '#F5F8F3', '#1D2C26', 'Medicina familiar, nutrición, bienestar'),
      P('Azul luminoso y coral', ['tecnologico', 'divertido'], ['emocionante', 'competente'], '#2647C4', '#F07A62', '#F5F7FC', '#141A33', 'Telemedicina y clínicas modernas'),
    ],
  },
  dental: {
    codigo: 'Aqua y teal frescos, azul marino, menta; blanco limpio',
    evitar: ['Amarillo y café (se asocian a dientes manchados)', 'Rojo dominante', 'Gris frío como fondo (se ve sucio)'],
    familias: [
      P('Aqua y marino', ['fresco', 'minimalista'], ['competente', 'sincera'], '#0B7A88', '#1E3557', '#F2F9FA', '#10283A', 'Frescura y limpieza con autoridad'),
      P('Teal 2026 y coral suave', ['calido', 'fresco', 'divertido'], ['sincera', 'emocionante'], T.transformative_teal.hex, '#EE8E78', T.cloud_dancer.hex, '#13292C', 'Odontopediatría y clínicas cercanas'),
      P('Marino y champaña', ['elegante', 'lujo'], ['sofisticada', 'competente'], '#16294A', '#C9A979', '#F7F6F2', '#0F1B30', 'Estética dental, carillas, implantes'),
      P('Menta y azul luminoso', ['tecnologico', 'divertido'], ['emocionante'], '#2B4FE0', '#4FC1A6', '#F5F8FD', '#131A36', 'Ortodoncia invisible, marcas jóvenes'),
    ],
  },
  estetica_spa: {
    codigo: 'Neutros suaves, rosa empolvado, salvia, arcilla, lavanda digital; baja saturación',
    evitar: ['Primarios saturados', 'Azul eléctrico', 'Negro duro salvo lujo'],
    familias: [
      P('Arcilla y rosa empolvado', ['calido', 'elegante'], ['sincera', 'sofisticada'], '#9A5C4C', T.clay.hex, '#F7F1EC', '#2E1F1B', 'Clay WGSN 2027: cálido, confiable, piel'),
      P('Salvia y lino', ['minimalista', 'fresco'], ['sincera'], '#5E7A63', '#C9A27E', '#F5F3EC', '#20291F', 'Spa natural, masajes, bienestar'),
      P('Ciruela y oro rosa', ['lujo', 'elegante'], ['sofisticada'], '#5B2A45', '#C99A85', '#F6F0EE', '#24121C', 'Medicina estética premium'),
      P('Lavanda y durazno', ['divertido', 'fresco'], ['emocionante', 'sincera'], '#6C4FB8', '#F2A27E', '#F7F4FB', '#211A33', 'Uñas, cejas, belleza joven'),
    ],
  },
  veterinaria: {
    codigo: 'Verdes amables, teal, naranja cálido; tono juguetón pero confiable',
    evitar: ['Rojo dominante', 'Negro como fondo'],
    familias: [
      P('Verde pradera y naranja', ['calido', 'divertido'], ['sincera', 'emocionante'], '#3F7D4E', T.energy_orange.hex, '#F5F6EE', '#1C2A1F', 'Meadowland/Energy Orange 2027: cercanía y energía'),
      P('Teal y mostaza', ['fresco', 'minimalista'], ['competente', 'sincera'], '#13707A', '#E0A93B', '#F3F8F7', '#12292C', 'Hospital veterinario confiable'),
      P('Marino y coral', ['tradicional', 'elegante'], ['competente'], '#1F3B5A', '#EF7D5E', '#F6F6F3', '#141F2C', 'Especialidades y cirugía'),
      P('Olivo, crema y terracota', ['calido', 'divertido', 'tradicional'], ['sincera', 'emocionante'], '#3F5228', '#D8492E', '#F5E8D9', '#1E2614', 'Dos colores base + un acento que la hace memorable (8-nov-2026): alimento y tiendas de mascotas'),
    ],
  },
  restaurante: {
    codigo: 'Cálidos: rojos, naranjas, terracotas, cafés; verde para fresco; cremas',
    evitar: ['Azul o morado dominante en comida', 'Grises fríos como fondo', 'Verde neón en texto'],
    familias: [
      P('Terracota y crema', ['calido', 'tradicional'], ['sincera'], '#B5462D', '#E3A33B', T.wax_paper.hex, '#2B1A14', 'Cálido y artesanal; terracota es tendencia vigente en restaurantes'),
      P('Rojo chile y verde hoja', ['divertido', 'fresco', 'tradicional'], ['emocionante', 'sincera'], '#C1272D', '#2F7A3D', '#FBF5EC', '#2A1513', 'Código de comida mexicana sin caer en bandera'),
      P('Cacao y mostaza', ['elegante', 'calido'], ['sofisticada', 'sincera'], T.cocoa_powder.hex, '#D9A441', '#F6EFE4', '#22160F', 'Cocoa Powder 2026: hecho a mano, bistró'),
      P('Rosa mexicano y naranja', ['divertido'], ['emocionante'], '#D6006F', T.energy_orange.hex, '#FFF5EE', '#2A0F1C', 'Festivo y local; para antojitos, mezcalerías, taquerías modernas'),
      P('Negro carbón y ámbar', ['lujo', 'elegante', 'tecnologico'], ['sofisticada'], '#1E1B18', '#C8892B', '#F4EFE8', '#151210', 'Alta cocina, parrilla, bar'),
      P('Verde olivo y tomate', ['fresco', 'minimalista'], ['sincera', 'emocionante'], '#5B6B2F', '#E2553A', '#F7F4EA', '#1F2412', 'Saludable, mediterráneo, de huerta'),
    ],
  },
  cafeteria_panaderia: {
    codigo: 'Cafés, cremas, caramelo; acentos de matcha, frambuesa o terracota',
    evitar: ['Azul dominante', 'Gris frío', 'Negro puro como fondo'],
    familias: [
      P('Espresso y crema', ['calido', 'tradicional'], ['sincera'], '#5B3A29', '#C98B4B', T.wax_paper.hex, '#24160F', 'Código del café con calidez'),
      P('Matcha y leche', ['fresco', 'minimalista'], ['sincera', 'emocionante'], '#5E7D3A', '#D7A05B', '#F6F3E8', '#1E2614', 'Bebidas frías, matcha, especialidad joven'),
      P('Frambuesa y vainilla', ['divertido', 'fresco'], ['emocionante'], '#B8325A', T.pop_pink.hex, '#FFF6F2', '#2B1019', 'Repostería, postres, pan dulce'),
      P('Cacao y latón', ['elegante', 'lujo'], ['sofisticada'], '#3A2620', '#B89157', '#F3EEE6', '#1C120E', 'Café de especialidad premium'),
      P('Teal y caramelo', ['minimalista', 'tecnologico'], ['competente', 'emocionante'], T.transformative_teal.hex, '#D08A45', T.cloud_dancer.hex, '#13292C', 'Para diferenciarse del café-café; tendencia 2026'),
    ],
  },
  legal: {
    codigo: 'Marino, vino, verde profundo, carbón; acento latón u oro viejo',
    evitar: ['Neones', 'Rosa o amarillo dominante', 'Más de un acento'],
    familias: [
      P('Marino y latón', ['tradicional', 'elegante'], ['competente', 'sofisticada'], '#1B2D4F', '#B08D57', '#F6F4EF', '#121B2C', 'Autoridad clásica'),
      P('Vino y piedra', ['elegante', 'lujo'], ['sofisticada'], '#6B1F2A', '#C2A27A', '#F5F1EC', '#231013', 'Despachos con trayectoria'),
      P('Verde profundo y arena', ['minimalista', 'calido'], ['competente', 'sincera'], '#1F4A3D', '#C99B5E', '#F4F2EB', '#14251F', 'Cercano sin perder seriedad; familiar, laboral'),
      P('Grafito y azul luminoso', ['tecnologico', 'minimalista'], ['competente', 'emocionante'], '#25292F', T.luminous_blue.hex, '#F4F5F7', '#15181C', 'Legaltech, propiedad intelectual, startups'),
    ],
  },
  contador_consultor: {
    codigo: 'Azul y verde (dinero, orden), pizarra; acento claro y único',
    evitar: ['Rojo dominante (pérdidas)', 'Paletas de más de 3 colores'],
    familias: [
      P('Azul pizarra y verde', ['minimalista', 'tradicional'], ['competente'], '#1F4E79', '#2E8B57', '#F5F7F8', '#13263A', 'Orden y crecimiento'),
      P('Teal y ámbar', ['fresco', 'calido'], ['competente', 'sincera'], T.transformative_teal.hex, '#E0A23B', '#F4F7F6', '#13292C', 'Consultoría cercana para PYMES'),
      P('Marino y oro', ['elegante', 'lujo'], ['sofisticada', 'competente'], '#16274A', '#C5A253', '#F6F5F1', '#0F1A30', 'Patrimonio, finanzas personales altas'),
      P('Azul luminoso y menta', ['tecnologico', 'divertido'], ['emocionante', 'competente'], T.luminous_blue.hex, '#3CC39A', '#F5F7FD', '#131A36', 'Contabilidad digital, fintech'),
    ],
  },
  arquitectura_construccion: {
    codigo: 'Concreto, carbón, arcilla, musgo; acento de seguridad en obra',
    evitar: ['Pasteles', 'Morado'],
    familias: [
      P('Concreto y arcilla', ['minimalista', 'elegante'], ['sofisticada', 'competente'], '#2D2D2B', '#B5654A', '#F1EFEB', '#1A1A19', 'Estudio de arquitectura: deja hablar a los proyectos'),
      P('Musgo y piedra caliza', ['calido', 'fresco'], ['sincera', 'ruda'], '#4D5B3A', '#C9A27E', '#F3F1EA', '#1E2416', 'Biofílico; casas de campo y Yucatán'),
      P('Marino y naranja obra', ['tradicional', 'tecnologico'], ['competente', 'ruda'], '#1E3350', T.energy_orange.hex, '#F5F5F3', '#131F30', 'Constructoras: confianza y seguridad'),
      P('Negro y latón', ['lujo'], ['sofisticada'], '#191919', '#A88B5C', '#EFEDE8', '#121212', 'Interiorismo de lujo'),
    ],
  },
  agencia_marketing: {
    codigo: 'Brillos digitales sobre neutro suave; un color audaz que sea la marca',
    evitar: ['Azul corporativo genérico (no diferencia)', 'Gradiente morado-rosa (cliché IA)'],
    familias: [
      P('Púrpura real y caqui', ['divertido', 'tecnologico'], ['emocionante'], '#5B3FA6', '#E85D3F', '#F4EFE6', '#1C1430', 'Tendencia 2026 de brillos digitales sobre base suave'),
      P('Naranja energía y negro', ['divertido', 'fresco'], ['emocionante', 'ruda'], T.energy_orange.hex, '#1A1A1A', '#F6F2EC', '#161412', 'Energy Orange WGSN 2027'),
      P('Azul luminoso y verde manzana', ['tecnologico', 'fresco'], ['emocionante', 'competente'], T.luminous_blue.hex, '#7ED957', '#F5F6FA', '#131833', 'Digital, performance'),
      P('Grafito y verde brillo', ['minimalista', 'tecnologico'], ['sofisticada', 'emocionante'], '#1C1D1F', T.green_glow.hex, '#F2F2EF', '#141516', 'Green Glow 2026 como único acento (sobre oscuro)'),
    ],
  },
  fotografia: {
    codigo: 'Neutros (marfil, grafito, greige); el color lo ponen las fotos; un acento mínimo',
    evitar: ['Fondos de color saturado', 'Más de un acento', 'Marcos de color que compitan con las fotos'],
    familias: [
      P('Marfil y grafito', ['minimalista', 'elegante'], ['sofisticada'], '#2A2A28', '#9C7A5B', T.cloud_dancer.hex, '#1A1A18', 'Galería neutra; Cloud Dancer 2026'),
      P('Greige y arcilla', ['calido', 'fresco'], ['sincera'], '#5A4A42', T.clay.hex, '#F3EFEA', '#221C18', 'Bodas, familia, retrato'),
      P('Negro y champaña', ['lujo', 'elegante'], ['sofisticada'], '#141414', '#C2A57A', '#F2EFEA', '#111111', 'Moda y editorial'),
      P('Grafito y rosa pop', ['divertido', 'tecnologico'], ['emocionante'], '#232325', T.pop_pink.hex, '#F5F3F2', '#151517', 'Fotografía de producto o creadora joven'),
    ],
  },
  general: {
    codigo: 'Según el producto; base neutra para que el catálogo luzca, acento fuerte para comprar',
    evitar: ['Fondos saturados que tiñan las fotos de producto', 'Gris frío en tiendas de comida o regalo'],
    familias: [
      P('Blanco cálido y azul luminoso', ['minimalista', 'tecnologico'], ['competente', 'emocionante'], T.luminous_blue.hex, '#F2A65A', T.cloud_dancer.hex, '#141A30', 'Catálogo limpio, botón visible'),
      P('Arena y verde pradera', ['calido', 'fresco'], ['sincera'], '#3F6E45', '#D9A441', '#F5F1E8', '#1B2A1D', 'Productos naturales, locales, artesanales'),
      P('Crema y rosa mexicano', ['divertido', 'tradicional'], ['emocionante', 'sincera'], '#C8076E', '#F0A23B', '#FFF6EF', '#2A0F1C', 'Regalos, artesanía, papelería'),
      P('Cacao y naranja', ['calido', 'elegante'], ['sincera', 'sofisticada'], T.cocoa_powder.hex, T.energy_orange.hex, '#F6EFE6', '#22160F', 'Ropa, accesorios, cuero'),
      P('Menta, marino y coral', ['fresco', 'divertido', 'tecnologico'], ['emocionante', 'competente'], '#002941', '#FD6E6E', '#CFE8E1', '#0B1A26', 'Dos colores base + un acento que la hace memorable (8-nov-2026): bebidas, deporte, productos frescos'),
      P('Olivo, crema y terracota', ['calido', 'tradicional', 'fresco'], ['sincera', 'ruda'], '#3F5228', '#D8492E', '#F5E8D9', '#1E2614', 'Dos colores base + un acento (8-nov-2026): alimento natural, mascotas, productos de campo'),
    ],
  },
  lujo: {
    codigo: 'Negro o marino muy oscuro, marfil, oro/champaña, esmeralda o vino; pocos colores con precisión',
    evitar: ['Saturados brillantes', 'Más de 3 colores', 'Naranja (se percibe barato)'],
    familias: [
      P('Negro y champaña', ['lujo', 'elegante', 'minimalista'], ['sofisticada'], '#121212', '#C2A57A', '#F3F0EA', '#0F0F0F', 'Lujo clásico: bajo brillo, alto contraste, mucho espacio'),
      P('Esmeralda y oro', ['lujo', 'tradicional'], ['sofisticada'], '#0F4D3A', '#C6A15B', '#F4F1E9', '#0E211A', 'Joyería, relojes'),
      P('Vino y marfil', ['elegante', 'calido'], ['sofisticada', 'sincera'], '#5C1A27', '#C9A27E', '#F6F1EB', '#220C11', 'Vinos, perfumería'),
      P('Marino tinta y plata', ['minimalista', 'tecnologico'], ['sofisticada', 'competente'], '#0F1A2E', '#A9B3BF', '#F4F5F6', '#0C1320', 'Lujo contemporáneo'),
      P('Marino profundo, marfil y oro antiguo', ['lujo', 'elegante', 'tradicional'], ['sofisticada'], '#172D4D', '#B58A45', '#F4F1EA', '#0F1C30', 'Dos colores base + un acento (8-nov-2026): residencial y hospitalidad de lujo'),
    ],
  },
  floreria: {
    codigo: 'Rubor, salvia, verde profundo, ciruela; el color lo aportan las flores',
    evitar: ['Fondos saturados', 'Azul eléctrico'],
    familias: [
      P('Rubor y salvia', ['calido', 'fresco'], ['sincera'], '#7C4A55', '#8FA98A', '#FAF3F1', '#2A1A1E', 'Romántico y natural'),
      P('Verde hoja y crema', ['minimalista', 'tradicional'], ['sincera', 'competente'], '#2E5A3C', '#D9A0A8', '#F6F3EA', '#17261B', 'Florería de jardín, plantas'),
      P('Ciruela y oro', ['elegante', 'lujo'], ['sofisticada'], '#4B1F3C', '#C6A15B', '#F6F0F0', '#1E0C18', 'Arreglos premium, eventos'),
      P('Rosa pop y verde pradera', ['divertido'], ['emocionante'], '#C2185B', T.meadowland_green.hex, '#FFF5F7', '#2A0F1A', 'Envíos, regalos jóvenes'),
    ],
  },
  plomero_electricista: {
    codigo: 'Alta visibilidad: marino o azul con naranja o amarillo de seguridad',
    evitar: ['Pasteles', 'Negro de lujo', 'Paletas tenues (se pierde el botón de llamar)'],
    familias: [
      P('Marino y naranja seguridad', ['tradicional', 'tecnologico'], ['competente', 'ruda'], '#1B3358', T.energy_orange.hex, '#F5F6F7', '#121F33', 'Urgencias: confianza + botón muy visible'),
      P('Azul y amarillo obra', ['fresco', 'divertido'], ['emocionante', 'competente'], '#1F57C3', '#F5C518', '#F6F8FC', '#121D38', 'Electricistas, mantenimiento'),
      P('Grafito y rojo bombero', ['minimalista', 'elegante'], ['competente', 'ruda'], '#26292D', '#D23A2A', '#F4F4F2', '#161819', 'Gas, cerrajería, emergencias'),
      P('Verde técnico y ámbar', ['calido', 'tradicional'], ['sincera', 'competente'], '#2F5F4B', '#E3A12F', '#F4F5F0', '#182A22', 'Instalaciones sustentables, solar'),
    ],
  },
  servicio_local: {
    codigo: 'Frescos y limpios (azul, verde, teal); acento cálido para cercanía',
    evitar: ['Café oscuro en limpieza', 'Negro como fondo'],
    familias: [
      P('Azul limpio y verde', ['fresco', 'minimalista'], ['competente', 'sincera'], '#1C6FB8', '#43A66B', '#F4F8FB', '#112539', 'Limpieza, lavandería'),
      P('Teal y mostaza', ['calido', 'tradicional'], ['sincera'], T.transformative_teal.hex, '#E0A93B', '#F4F7F6', '#13292C', 'Jardinería, mantenimiento del hogar'),
      P('Verde pradera y naranja', ['divertido', 'fresco'], ['emocionante', 'sincera'], '#3E7B4A', T.energy_orange.hex, '#F5F6EE', '#1B291E', 'Fumigación, mascotas, servicios amables'),
      P('Marino y coral', ['elegante', 'tecnologico'], ['competente'], '#1D3150', '#EC7A5C', '#F6F6F4', '#121E30', 'Servicios premium a domicilio'),
    ],
  },
  cursos: {
    codigo: 'Azules y púrpuras (saber), naranja o amarillo para energía; neutro claro',
    evitar: ['Rojo dominante', 'Más de 4 colores'],
    familias: [
      P('Azul luminoso y naranja', ['tecnologico', 'divertido'], ['emocionante', 'competente'], T.luminous_blue.hex, T.energy_orange.hex, '#F5F7FD', '#131A36', 'Cursos en línea, tecnología'),
      P('Púrpura fresco y mostaza', ['fresco', 'divertido'], ['emocionante', 'sofisticada'], T.fresh_purple.hex, '#E2A93B', '#F7F4FA', '#1F1229', 'Fresh Purple 2026: coaching, creatividad'),
      P('Marino y teal', ['tradicional', 'minimalista', 'elegante'], ['competente'], '#1B2E52', '#1F8A8A', '#F5F6F7', '#121C33', 'Diplomados, certificaciones'),
      P('Verde pradera y terracota', ['calido'], ['sincera'], '#3F6E45', '#C2643F', '#F5F2EA', '#1B2A1D', 'Talleres, oficios, cocina'),
    ],
  },
  escuela_app: {
    codigo: 'Brillos amables sobre blanco; colores primarios suavizados para niñez; azul marino para colegios',
    evitar: ['Negro como fondo', 'Neones en texto'],
    familias: [
      P('Azul primario y amarillo', ['divertido', 'fresco'], ['emocionante', 'sincera'], '#2457C5', '#F5C518', '#F7F9FD', '#131E3A', 'Preescolar y primaria'),
      P('Marino y vino', ['tradicional', 'elegante'], ['competente', 'sofisticada'], '#1B2D4F', '#8C2333', '#F6F5F2', '#121B2C', 'Colegios con tradición'),
      P('Verde pradera y coral', ['calido', 'fresco'], ['sincera'], '#3E7B4A', '#EE7F63', '#F6F7F1', '#1B291E', 'Métodos activos, Montessori'),
      P('Púrpura y menta', ['tecnologico', 'divertido'], ['emocionante'], '#5B3FA6', '#3CC39A', '#F7F5FC', '#1C1430', 'Apps educativas'),
    ],
  },
  hotel: {
    codigo: 'Arena, piedra caliza, turquesa de cenote, verde selva, terracota; blanco cálido',
    evitar: ['Neones', 'Gris frío', 'Rojo dominante'],
    familias: [
      P('Piedra caliza y turquesa', ['fresco', 'minimalista'], ['sincera', 'sofisticada'], '#0E7C86', '#C99B6A', '#F6F2EA', '#12292C', 'Cenote y piedra: Yucatán, costa'),
      P('Terracota y verde selva', ['calido', 'tradicional'], ['sincera', 'ruda'], '#B1553A', '#3E6B48', '#F7F0E6', '#2A1810', 'Haciendas, hoteles boutique'),
      P('Arena y oro', ['lujo', 'elegante'], ['sofisticada'], '#3B2F26', '#C2A27A', T.cloud_dancer.hex, '#1C1611', 'Lujo cálido, Cloud Dancer 2026'),
      P('Teal 2026 y coral', ['divertido', 'tecnologico'], ['emocionante'], T.transformative_teal.hex, '#F07A62', '#F5F8F7', '#13292C', 'Hostales, playa, público joven'),
    ],
  },
  tours: {
    codigo: 'Turquesa, verde selva, naranja atardecer, arena; energía al aire libre',
    evitar: ['Negro como fondo', 'Pasteles apagados (restan aventura)'],
    familias: [
      P('Cenote y atardecer', ['fresco', 'divertido'], ['emocionante', 'ruda'], '#0B7A88', T.energy_orange.hex, '#F5F7F4', '#10282C', 'Aventura acuática, cenotes'),
      P('Selva y arena', ['calido', 'tradicional'], ['ruda', 'sincera'], '#2F5D3A', '#D49A4E', '#F5F0E6', '#18261A', 'Ecoturismo, arqueología'),
      P('Marino y amarillo sol', ['tecnologico', 'minimalista'], ['competente', 'emocionante'], '#1B3358', '#F2B705', '#F6F7F8', '#121F33', 'Agencias y traslados'),
      P('Rosa mexicano y turquesa', ['divertido'], ['emocionante'], '#D6006F', '#0E8C99', '#FFF6F1', '#2A0F1C', 'Experiencias culturales, gastronómicas'),
    ],
  },
};
// Alias de subtipos que comparten paleta.
PALETAS.servicio_b2b = PALETAS.contador_consultor;

// Subtipo por defecto de cada arquetipo (mismo orden que subtipo.js).
const DEFAULT_ARQ = { inmobiliaria: 'inmobiliaria', clinica: 'medica', restaurante: 'restaurante', servicios: 'contador_consultor', tienda: 'general', oficios: 'servicio_local', educacion: 'cursos', turismo: 'hotel', generico: 'servicio_b2b' };

/** Dimensiones de personalidad que el cliente expresó (marca.personalidad, B5.3). */
export function dimensionesDe(brief = {}) {
  const txt = [].concat(brief.marca?.personalidad || []).join(' ') + ' ' + String(brief.marca?.tono_textos || '');
  return Object.entries(DIM).filter(([, re]) => re.test(txt)).map(([k]) => k);
}

const distTono = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/** ¿La familia contiene un color que el cliente dijo que NO quiere? (comparación de tono en OKLCH). */
function chocaConEvitar(fam, evitar) {
  return evitar.some((x) => {
    const ox = oklch(x);
    return [fam.m, fam.a].some((c) => { const oc = oklch(c); return ox.c > 0.04 && oc.c > 0.04 && distTono(ox.h, oc.h) < 25; });
  });
}

/**
 * Familias ordenadas por ajuste para un negocio.
 * Puntaje: estilo elegido (B5.4) 3, cada dimensión de personalidad (B5.3) 2; se descartan las que chocan con marca.evitar.
 * @returns {{subtipo:string, codigo:string, evitar:string[], familias:object[]}}
 */
export function paletasPara({ arquetipo, subtipo, estilo, dimensiones = [], evitarHex = [] } = {}) {
  const st = PALETAS[subtipo] ? subtipo : DEFAULT_ARQ[arquetipo] || 'servicio_b2b';
  const g = PALETAS[st];
  const puntuar = (f) => (f.e.includes(estilo) ? 3 : 0) + f.d.filter((d) => dimensiones.includes(d)).length * 2 + (f.e[0] === estilo ? 1 : 0);
  let fams = g.familias.filter((f) => !chocaConEvitar(f, evitarHex));
  if (!fams.length) fams = g.familias;
  fams = fams.map((f, i) => ({ ...f, puntaje: puntuar(f), _i: i })).sort((a, b) => b.puntaje - a.puntaje || a._i - b._i);
  return { subtipo: st, codigo: g.codigo, evitar: g.evitar, familias: fams };
}

const cromatico = (h) => oklch(h).c > 0.04;
const porTono = (fams, hex) => { const h = oklch(hex).h; return [...fams].sort((a, b) => distTono(oklch(a.m).h, h) - distTono(oklch(b.m).h, h)); };
const tonoCercano = (fams, hex) => porTono(fams, hex)[0];

/* ---------- Acento de contraste (8-nov-2026) ----------
 * "Dos colores hacen una web correcta; el tercero, de acento, la hace memorable": base clara + base oscura y un acento
 * de temperatura opuesta (cálido sobre frío: coral sobre marino/menta, oro antiguo sobre marino/marfil, terracota sobre
 * olivo/crema), usado solo en el 10 % (botón principal y detalles), nunca en superficies grandes.
 * En 2 de las 6 propuestas (B y E) el acento es de contraste aunque el estilo pida análogo, para que el cliente vea
 * variedad; las otras 4 conservan el acento de su familia. */
export const PROPUESTAS_CONTRASTE = [1, 4];
const calido = (h) => h < 110 || h >= 345;
/** ¿El acento contrasta con la marca? Marca neutra: basta un acento con color. Si no: temperatura opuesta y ≥ 90° de tono. */
export function esAcentoContraste(marca, acento) {
  const m = oklch(marca), a = oklch(acento);
  if (a.c < 0.09) return false;
  if (m.c <= 0.04) return true;
  return calido(m.h) !== calido(a.h) && distTono(m.h, a.h) >= 90;
}
// Acentos universales (los del ejemplo de referencia + fríos para marcas cálidas).
const ACENTOS_CALIDOS = ['#B58A45', '#D8492E', '#FD6E6E', '#E3A33B'];
const ACENTOS_FRIOS = ['#2F7A3D', '#1F5C63', '#0E8C99', '#4F7C6A'];
/** Restricciones del giro para el acento (es 10 %, pero se evita lo que el giro rechaza). */
function acentoPermitido(st, hex) {
  const { h, c } = oklch(hex);
  if (st === 'lujo') return h >= 60 && h <= 100 && c <= 0.13; // oro/champaña; el naranja se percibe barato
  if (['restaurante', 'cafeteria_panaderia'].includes(st) && h > 220 && h < 310) return false;
  if (['medica', 'dental'].includes(st) && h >= 15 && h <= 30 && c > 0.12) return false;
  if (st === 'dental' && h > 45 && h < 110) return false;
  return true;
}
/**
 * Acento de contraste para una marca: primero los acentos de las familias del giro (por ajuste), luego los universales.
 * Si el acento propio ya contrasta, se conserva.
 */
export function acentoContraste(marca, propio, { familias = [], subtipo, evitarHex = [], semilla = 0 } = {}) {
  if (propio && esAcentoContraste(marca, propio) && acentoPermitido(subtipo, propio)) return propio;
  const frio = oklch(marca).c > 0.04 && calido(oklch(marca).h);
  const evitado = (hex) => chocaConEvitar({ m: hex, a: hex }, evitarHex);
  const cands = [...new Set([...familias.map((f) => f.a), ...(frio ? ACENTOS_FRIOS : ACENTOS_CALIDOS)])]
    .filter((a) => esAcentoContraste(marca, a) && acentoPermitido(subtipo, a) && !evitado(a));
  return cands.length ? cands[semilla % cands.length] : propio;
}

/**
 * Colores de partida para la propuesta i (0..5) de la ronda r.
 * - El cliente dio ≥ 2 colores con color: son suyos, mandan (solo se completan neutros de la familia más cercana).
 * - Dio 1: es la marca; acento y neutros de la familia del giro con tono más cercano.
 * - Dio 0 (o solo blanco/negro): rota entre las familias del giro, ordenadas por ajuste, para que las 6 propuestas varíen.
 * - Propuestas B y E (PROPUESTAS_CONTRASTE): acento de contraste que además va en el botón principal (acentoCta).
 * @returns {{colores:string[], acento:string, acentoCta:boolean, familia:string, origen:'cliente'|'cliente+giro'|'giro', por:string}}
 */
export function coloresParaPropuesta({ brief = {}, coloresCliente = [], i = 0, ronda = 0, evitarHex = [] }) {
  const n = brief.negocio || {};
  const { subtipo, familias } = paletasPara({ arquetipo: n.arquetipo, subtipo: n.subtipo_resuelto || n.subtipo, estilo: brief.marca?.estilo, dimensiones: dimensionesDe(brief), evitarHex });
  const propios = coloresCliente.filter((c) => /^#[0-9A-F]{6}$/i.test(c));
  const conColor = propios.filter(cromatico);
  const contraste = PROPUESTAS_CONTRASTE.includes(i);
  const ctx = { familias, subtipo, evitarHex, semilla: ronda + (i > 2 ? 1 : 0) };
  if (conColor.length >= 2) {
    // Los colores del cliente mandan: solo se usa acento de contraste si uno de SUS colores contrasta con otro.
    const f = tonoCercano(familias, conColor[0]);
    let par = null;
    if (contraste) for (const m of conColor) { const a = conColor.find((x) => x !== m && esAcentoContraste(m, x)); if (a) { par = [m, a]; break; } }
    return { colores: [...propios, f.c], acento: par ? par[1] : conColor[1], acentoCta: !!par, familia: f.n, origen: 'cliente', por: 'Colores del cliente; neutros de la familia más afín' };
  }
  if (conColor.length === 1) {
    const cerca = porTono(familias, conColor[0]).slice(0, 3); const f = cerca[(i + ronda) % cerca.length];
    const acento = contraste ? acentoContraste(conColor[0], f.a, ctx) : f.a;
    return { colores: [conColor[0], f.c, acento, ...propios.filter((c) => c !== conColor[0])], acento, acentoCta: contraste && esAcentoContraste(conColor[0], acento), familia: f.n, origen: 'cliente+giro', por: f.por };
  }
  const f = familias[(i + ronda * 2) % familias.length];
  const acento = contraste ? acentoContraste(f.m, f.a, ctx) : f.a;
  return { colores: [f.m, f.c, acento], acento, acentoCta: contraste && esAcentoContraste(f.m, acento), familia: f.n, origen: 'giro', por: f.por };
}

/** Avisos de ajuste de los colores del cliente con su giro (no los cambia: se le explica a Ari/cliente). */
export function avisosDeGiro({ arquetipo, subtipo, colores = [] }) {
  const st = PALETAS[subtipo] ? subtipo : DEFAULT_ARQ[arquetipo] || 'servicio_b2b';
  const av = [];
  const comida = ['restaurante', 'cafeteria_panaderia'].includes(st);
  const salud = ['medica', 'dental', 'veterinaria'].includes(st);
  for (const c of colores.filter(cromatico)) {
    const { h, l } = oklch(c);
    if (comida && h > 220 && h < 310) av.push(`${c}: azul/morado en comida resta antojo; mejor como acento pequeño`);
    if (salud && h >= 15 && h <= 42 && l < 0.75) av.push(`${c}: rojo en salud se asocia a alarma; mejor como acento pequeño`);
    if (st === 'dental' && h > 45 && h < 110) av.push(`${c}: amarillo/café en dental se asocia a manchas`);
  }
  return av;
}

/** Texto de la regla para diseno_reglas. */
export const REGLA_PALETAS = {
  descripcion: 'REGLA DURA (4-nov-2026): paletas por giro, personalidad y estilo. Se ejecuta en generador/paletas_giro.js; después pasa por la regla de contraste.',
  reglas: [
    'Los colores del cliente mandan; el giro solo completa lo que falte (acento, neutros) y avisa si algo choca con el giro',
    'Elegir por ajuste con la personalidad que dio el cliente (B5.3) y el estilo (B5.4), no por "significados" universales del color',
    'Respetar el código del giro para que se reconozca y diferenciarse con el acento',
    'Restricciones por giro: sin azul/morado dominante en comida; sin rojo dominante en salud; sin amarillo/café en dental; neutros en fotografía y florería (el color lo ponen las fotos)',
    'Tendencias 2026–2027 (Cloud Dancer, Transformative Teal, Cocoa Powder, Luminous Blue, Energy Orange, Clay…) solo como neutros o acentos',
    'Sin colores del cliente: las 6 propuestas recorren distintas familias del giro ordenadas por ajuste; "ninguna me gustó" pasa a las siguientes',
    'Excluir familias con el tono de cualquier color que el cliente dijo que no quiere (marca.evitar)',
    'Dos colores base (neutro claro + oscuro de marca) hacen una web correcta; el tercero, de acento, la hace memorable. En 2 de las 6 propuestas (B y E) el acento es de contraste (temperatura opuesta y ≥ 90° de tono: cálido sobre frío) y va en el botón principal y detalles; nunca en superficies grandes. Con ≥ 2 colores del cliente solo si uno de los suyos contrasta',
  ],
  bibliografia: [
    'Labrecque & Milne (2012), Exciting red and competent blue, Journal of the Academy of Marketing Science',
    'Aaker (1997), Dimensions of Brand Personality, Journal of Marketing Research',
    'Elliot & Maier (2014), Color psychology, Annual Review of Psychology',
    'Spence et al. (2022), revisión sobre color y significado de producto, Cognitive Research: Principles and Implications',
    'Pantone Color of the Year 2026 (Cloud Dancer); WGSN×Coloro Color del año 2026 y 2027 y colores clave A/W 26-27 y S/S 27',
  ],
};
