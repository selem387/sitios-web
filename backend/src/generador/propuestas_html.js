// 6 propuestas de diseño como páginas HTML navegables (cada una con su liga), con los materiales reales del cliente:
// logo, productos sin fondo, precios y secciones de su menú, imágenes de su menú, contacto. Responsive (celular primero).
// Cada propuesta cambia composición, paleta y tipografía (poco común, acorde al estilo del cliente).
import { conImagenesOptimizadas } from '../imagenes.js';
import { conMenuMovil, conContacto } from './movil.js';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { enlacesRedes, CSS_REDES } from './iconos_redes.js';
import { config } from '../config.js';
import { mezclar, contraste } from '../entrevista/tema.js';
import { paresTipograficos, urlFuentes } from './fuentes.js';
import { corregirPaleta, auditarPaleta, cssTipografia, textoSobre, conPisoTexto, fuenteUI } from './tipo_color.js';
import { coloresParaPropuesta, avisosDeGiro } from './paletas_giro.js';
import { evaluarColoresCliente, asignarFuentes } from './asesor_color.js';
import { coloresDePalabras, logoTenido } from './materiales.js';
import { CSS_MOVIMIENTO, JS_MOVIMIENTO, sliderHTML, diapositivasDe, emparejarFotos, efectosDe, conSrcset } from './movimiento.js';
import { waUrl, formatoTel } from './bloques.js';
import { paginaFicha } from './opciones/ficha/ficha.js';
import { resolverMapa, esLegado, elegirLetras } from './giros/index.js';
import { esDireccionRef } from './estilo_ref.js';
import { logoLleno, JS_LOGO_UNICO, paginasGenerales, logoHTML, redes, urlsPorUbicacion, conOpcionP, conOpcionG, conOpcionH, conOpcionI, conOpcionJ, conOpcionK, conOpcionL, conOpcionM } from './propuestas_general.js';
import { completarMaterial } from './validar_material.js';
import { direccionTexto, testimoniosValidos } from './datos_brief.js';
import { indiceDeLetra, porLetra } from './opciones/registro.js';
import { paginasRestaurante } from './restaurante/plantilla.js';
import { refrescarAprobadas, aprobadasDe, listaConPlantillas } from './plantillas_ref.js';
import { ilustrativasActivas, RELLENABLES, construirRelleno, dependenciasReales, aplicarRelleno, conCredito } from './ilustrativas.js';

// Regla dura de tipografía: la escala, el interlineado y la medida se agregan al final del CSS (mandan sobre la plantilla).
const conReglaTipo = (html, par, estilo) => {
  let h = html.replace('</style>', `${cssTipografia(par, estilo)}</style>`);
  // Fuente de interfaz que no viene en el par: se carga aparte (pesos de botón y menú).
  const ui = fuenteUI(par);
  if (ui !== par.titulos && ui !== par.cuerpo) h = h.replace('</head>', `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(ui).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap"></head>`);
  return h;
};

export const DIR_PROPUESTAS = path.join(config.dataDir, 'propuestas');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/**
 * Crea las 6 propuestas y las guarda como HTML. Devuelve [{letra, layout, nombre, url, fuentes, paleta}].
 * @param {object} brief
 * @param {object} mat     procesarMateriales(...)
 * @param {object} textos  {variantes:[{titular, subtitulo, cta}], info:[], destacados, categorias, visita}
 */
export async function crearPropuestasHTML(brief, mat, textos, { token = crypto.randomBytes(9).toString('base64url').replace(/[_-]/g, 'x'), ronda = 0, mapa = null, depsIlustrativas = null } = {}) {
  const r = await renderPropuestas(brief, mat, textos, { ronda, mapa, depsIlustrativas });
  await fs.mkdir(path.join(DIR_PROPUESTAS, token), { recursive: true });
  const opciones = [];
  for (const pg of r.paginas) {
    await fs.writeFile(path.join(DIR_PROPUESTAS, token, `${pg.letra}.html`), pg.html);
    opciones.push({ letra: pg.letra, layout: pg.layout, nombre: pg.nombre, url: `${config.publicUrl}/p/${token}/${pg.letra}`, fuentes: pg.fuentes, paleta: pg.paleta });
  }
  return { token, opciones, avisos_color: r.avisos_color, asesor: r.asesor, mapa: r.mapa, relleno: r.relleno || null, plano_ref: r.plano_ref || null };
}

/**
 * Arma el HTML de las propuestas sin escribirlo. Con fijo = {letra, fuentes, paleta} arma solo esa letra con la
 * tipografía y paleta que el cliente eligió (sitio en vivo): no valida material ni color para no tumbar el sitio.
 * mapa (etapa 2, generador/giros/): 'nuevo' para propuestas desde cero (mapa del giro de hoy); sin él, el guardado en
 * la propuesta o, si no hay, el de antes de la etapa 2 (LEGADO). Con mapa nuevo, las opciones salen de la lista del giro
 * y, si una falla al armarse, entra la siguiente de la lista.
 * → {paginas:[{letra, layout, nombre, html, fuentes, paleta}], avisos_color, asesor, faltan, mapa}
 */
export async function renderPropuestas(brief, mat, textos, { ronda = 0, fijo = null, solo = null, mapa: mapaPedido = null, depsIlustrativas = null } = {}) {
  let mapa = resolverMapa(brief, mapaPedido);
  const faltanTodas = [];
  // Cada ronda ("ninguna me gustó") usa otras tipografías y otro orden de color/fotos.
  const estilo = brief.marca?.estilo || 'calido';
  const todosPares = paresTipograficos(estilo, brief, 18);
  const candidatos = [...todosPares.slice((ronda * 6) % todosPares.length), ...todosPares].filter((p, k, a) => a.findIndex((x) => x.titulos === p.titulos && x.cuerpo === p.cuerpo) === k);
  // Colores por propuesta (regla de paletas por giro) + asesor: si los colores del cliente tienen hallazgos sin aceptar,
  // la propuesta F se arma con los colores sugeridos para que pueda comparar.
  const coloresCliente = [...new Set([...coloresDePalabras(brief.marca?.colores || []), ...(mat.colores || [])])];
  const evitarHex = coloresDePalabras(String(brief.marca?.evitar || '').split(/[,;y]+/));
  const asesor = evaluarColoresCliente({ brief, colores: coloresCliente });
  const cps = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => coloresParaPropuesta({ brief, coloresCliente, i, ronda, evitarHex }));
  if (asesor.corregidos && !brief.marca?.colores_aviso_aceptado) cps[5] = { ...coloresParaPropuesta({ brief, coloresCliente: asesor.corregidos, i: 5, ronda, evitarHex }), origen: 'sugerencia', familia: 'Tus colores con el ajuste sugerido' };
  // Regla de coherencia letra–paleta: cada paleta recibe el par tipográfico que transmite la misma personalidad.
  const pares = asignarFuentes(cps.map((c) => c.colores), candidatos);
  if (brief.negocio?.arquetipo !== 'restaurante') {
    // Logo de un color: versión pintada con la tinta de cada propuesta (contraste garantizado sobre fondos claros u oscuros).
    // Etapa 2: con mapa nuevo (y sin estilo de referencia ni letra pedida), las opciones salen de la lista del giro.
    const conLista = !esLegado(mapa) && !fijo && !solo && !esDireccionRef(brief.marca?.direccion_ref);
    // Página de referencia (opción S, 18-nov-2026): la reconstrucción del cliente va primero + las 5 primeras de su lista.
    // Sin reconstrucción propia, una plantilla aprobada de su giro entra en el lugar que Sebastián le dio o al final.
    let plano_ref = brief.marca?.propuestas?.plano_ref || null;
    const propia = !!brief.marca?.plano_ref?.plano;
    if (conLista && mapaPedido === 'nuevo') {
      plano_ref = null;
      if (!propia) {
        await refrescarAprobadas().catch(() => {});
        const { lista, plantilla } = listaConPlantillas(mapa.lista, brief.negocio?.arquetipo || 'generico', aprobadasDe(brief.negocio?.arquetipo || 'generico'));
        if (plantilla) { plano_ref = { plano: plantilla.plano, plantilla_id: plantilla.id, origen: 'plantilla' }; mapa = { ...mapa, lista }; }
      }
      if (plano_ref) brief = { ...brief, marca: { ...(brief.marca || {}), propuestas: { ...(brief.marca?.propuestas || {}), plano_ref } } };
    }
    const primeroS = (e) => (conLista && propia ? { ...e, letras: ['S', ...e.letras.filter((l) => l !== 'S')].slice(0, 6), respaldo: [...e.letras.filter((l) => l !== 'S').slice(5), ...e.respaldo.filter((l) => l !== 'S')] } : e);
    let eleccion = conLista ? primeroS(elegirLetras(mapa, { brief, mat, textos, porLetra })) : null;
    // Elementos ilustrativos (etapa 2, parte 3): en propuestas desde cero salen las primeras 6 de la lista del giro y lo
    // que les falte se llena (fotos de Pixabay con marca, ejemplos sin precio, logo con letras). El relleno se guarda en
    // la propuesta; los cambios, el sitio en vivo y el rediseño lo vuelven a aplicar (solo lo que siga faltando).
    let relleno = brief.marca?.propuestas?.relleno || null;
    if (conLista && mapaPedido === 'nuevo' && ilustrativasActivas(brief)) {
      const conRelleno = primeroS(elegirLetras(mapa, { brief, mat, textos, porLetra, rellenables: RELLENABLES }));
      try {
        relleno = await construirRelleno(conRelleno.letras.map(porLetra), { brief, mat, textos }, depsIlustrativas || await dependenciasReales());
        eleccion = conRelleno;
      } catch (err) { console.warn('[propuestas] ilustrativas:', err.message); relleno = null; }
    }
    if (relleno) ({ brief, mat } = aplicarRelleno(brief, mat, relleno));
    let matP = mat;
    const armar = async (letras) => {
      let pags = paginasGenerales({ brief, mat: matP, textos, pares, urlFuentes, ronda, cps, fijo, solo, mapa, letras });
      if (matP.logo?.url && matP.logo.mono !== false && !logoLleno(matP.logo)) {
        const tenidos = { ...(matP.logo.tenidos || {}) };
        for (const pg of pags) for (const hex of [pg.paleta.fg, '#FFFFFF']) if (!tenidos[hex]) tenidos[hex] = await logoTenido(matP.logo, hex).catch(() => null);
        matP = { ...matP, logo: { ...matP.logo, tenidos: Object.fromEntries(Object.entries(tenidos).filter(([, v]) => v)) } };
        pags = paginasGenerales({ brief, mat: matP, textos, pares, urlFuentes, ronda, cps, fijo, solo, mapa, letras });
      }
      return pags;
    };
    const procesar = async (pg) => {
      const errColor = fijo ? [] : auditarPaleta(pg.paleta);
      if (errColor.length) throw new Error(`Propuesta ${pg.letra} no cumple la regla de color: ${errColor.join('; ')}`);
      const { html, faltan, repetidas } = completarMaterial(conReglaTipo(pg.html, pg.fuentes, fijo?.fuentes?.estilo || estilo), matP);
      if (faltan.length && !fijo) throw new Error(`Propuesta ${pg.letra} sin material del cliente: ${faltan.map((f) => f.clave).join(', ')}`);
      if (repetidas.length && !fijo) throw new Error(`Propuesta ${pg.letra} con fotos repetidas: ${repetidas.map((f) => f.url.split('/').pop()).join(', ')}`);
      faltanTodas.push(...faltan);
      return { letra: pg.letra, layout: pg.layout, nombre: pg.nombre, html: conCredito(conPisoTexto(await conImagenesOptimizadas(conContacto(conMenuMovil(html), brief)))), fuentes: pg.fuentes, paleta: pg.paleta };
    };
    const out = [];
    if (!conLista) {
      for (const pg of await armar(null)) out.push(await procesar(pg));
    } else {
      // Si una opción falla (regla de color, material, error), entra la siguiente de la lista del giro.
      const fallidas = [];
      const pendientes = [...eleccion.respaldo];
      let tanda = eleccion.letras;
      while (tanda.length) {
        let pags = [];
        try { pags = await armar(tanda); } catch (err) {
          // Falló el armado de la tanda: se prueba letra por letra para aislar la que falla.
          for (const l of tanda) { try { pags.push(...(await armar([l]))); } catch (e2) { fallidas.push({ letra: l, error: e2.message }); } }
        }
        for (const pg of pags) {
          try { out.push(await procesar(pg)); } catch (err) { fallidas.push({ letra: pg.letra, error: err.message }); }
        }
        tanda = pendientes.splice(0, 6 - out.length).filter((l) => !out.some((o) => o.letra === l));
        if (out.length >= 6) break;
      }
      if (fallidas.length) console.warn('[propuestas] opciones que no se armaron y se reemplazaron:', fallidas.map((f) => `${f.letra}: ${f.error}`).join(' | '));
      if (!out.length) throw new Error(`Ninguna opción se pudo armar: ${fallidas.map((f) => `${f.letra}: ${f.error}`).join(' | ')}`);
    }
    return { mapa, relleno, plano_ref, paginas: out, faltan: faltanTodas, avisos_color: avisosDeGiro({ arquetipo: brief.negocio?.arquetipo, subtipo: brief.negocio?.subtipo_resuelto || brief.negocio?.subtipo, colores: coloresCliente }), asesor };
  }
  // Restaurantes y cafeterías (etapa 3): plantilla común + una carpeta por opción (opciones/restaurante/<nombre>/).
  // Elementos ilustrativos también en restaurantes (etapa 3, decisión 6 del 19-nov-2026): solo en propuestas desde cero;
  // después se reaplica el relleno guardado (solo lo que siga faltando).
  let rellenoR = brief.marca?.propuestas?.relleno || null;
  if (mapaPedido === 'nuevo' && ilustrativasActivas(brief)) {
    rellenoR = await construirRelleno([], { brief, mat, textos }, depsIlustrativas || await dependenciasReales()).catch((err) => { console.warn('[propuestas] ilustrativas restaurante:', err.message); return null; });
  }
  if (rellenoR) ({ brief, mat } = aplicarRelleno(brief, mat, rellenoR));
  const { paginas: out0, colores } = await paginasRestaurante({ brief, mat, textos, fijo, solo, cps, pares, estilo, coloresCliente, conReglaTipo, faltanTodas, mapa });
  const out = out0.map((pg) => ({ ...pg, html: conCredito(pg.html) }));
  return { mapa, relleno: rellenoR, paginas: out, faltan: faltanTodas, avisos_color: avisosDeGiro({ arquetipo: brief.negocio?.arquetipo, subtipo: brief.negocio?.subtipo_resuelto || brief.negocio?.subtipo, colores }), asesor };
}

/** Textos de las 6 propuestas con Claude (JSON en texto). Solo datos reales del brief y del menú. */
/** Fotos que pueden ir en la portada, numeradas para que la IA elija la que corresponde a cada texto. */
export function catalogoFotos(mat = {}) {
  const vistas = new Set();
  return [mat.hero, ...(mat.trabajos || []), ...(mat.local || []), ...(mat.fotos || []).filter((x) => !x.sin_fondo && x.tipo !== 'foto_producto')]
    .filter((x) => x?.url && !x.captura && x.calidad !== 'regular' && !vistas.has(x.url) && vistas.add(x.url)).slice(0, 24)
    .map((x, k) => ({ id: `F${k + 1}`, url: x.url, descripcion: String(x.alt || '').slice(0, 160), tipo: x.tipo || '' }));
}

export async function textosPropuestas(brief, mat, { mapa: mapaPedido = null } = {}) {
  const menu = brief.negocio?.arquetipo === 'restaurante';
  // Etapa 2: con mapa nuevo, un texto por cada letra que puede salir de la lista del giro (cada opción usa el de su índice).
  const mapa = mapaPedido ? resolverMapa(brief, mapaPedido) : null;
  const conLista = mapa && !esLegado(mapa) && !esDireccionRef(brief.marca?.direccion_ref);
  const cat = catalogoFotos(mat);
  const enfoques = menu ? 'producto, antojo, rapidez/pickup, ubicación, variedad del menú, experiencia'
    : 'el resultado que se lleva el cliente, la especialidad más fuerte, la experiencia/años, la zona, la variedad de servicios o paquetes, el trato personal';
  const nVar = menu ? 6 : conLista ? Math.max(6, ...[...mapa.lista, 'E', 'F', 'A', 'B', 'C', 'D'].map((l) => (porLetra(l)?.indice ?? -1) + 1)) : conOpcionM() ? 13 : conOpcionL() ? 12 : conOpcionK() ? 11 : conOpcionJ() ? 10 : conOpcionI() ? 9 : conOpcionH() ? 8 : conOpcionG() ? 7 : 6; // G (collage), H (recorrido con índice) I (historia con scroll), J (narrativa) K (movimiento) y M (guía) solo en la plantilla general
  const prompt = `Escribe los textos de ${nVar} propuestas de página de inicio para este negocio mexicano (giro: ${brief.negocio?.giro_texto || brief.negocio?.arquetipo || ''}). Español de México, trato "${brief?.marca?.tono_textos === 'usted' ? 'usted' : 'tú'}", ${brief.negocio?.tamano === 'solo_tu' ? 'en primera persona del singular (es una sola persona), ' : ''}sin emojis, sin frases genéricas de IA, sin inventar datos (nada de años, clientes, premios ni promociones que no estén abajo). Cada titular con un enfoque distinto (${enfoques}).
Además, "diapositivas": los textos que van encima de las fotos 2 a 5 del slider de la portada (la foto 1 usa el titular de cada propuesta). En este orden y solo si el brief trae el dato real: diferenciador (oferta.diferenciador: lo que lo distingue de la competencia o su ventaja injusta), oferta (servicio o producto estrella, o la promoción vigente), prueba (cifra, años, certificación o reseña real del brief), vision (su historia o visión). Si un dato no está en el brief, omite esa diapositiva; nunca inventes. Cada una: una sola idea, beneficio antes que característica, titular de 3 a 8 palabras.
Fotos del cliente (cada una con su descripción hecha por IA): ${JSON.stringify(cat.map(({ id, descripcion, tipo }) => ({ id, descripcion, tipo })))}
Regla de fotos: en cada variante y en cada diapositiva pon "foto" con el id de la foto que muestra EXACTAMENTE lo que dice ese texto. Si el texto habla de un producto o servicio (p. ej. smash cake, newborn, maternidad, un platillo), la foto debe ser de ese mismo producto o servicio; nunca la de otro. Si el texto es general (años, visión, trato, zona), elige una foto general que no muestre un producto distinto al que mencionan otros textos. Si ninguna foto corresponde, deja "foto":"". Procura que las ${nVar} variantes abran con fotos distintas cuando el texto lo permita.
Brief: ${JSON.stringify({ negocio: brief.negocio, oferta: brief.oferta, cliente_ideal: brief.cliente_ideal, confianza: { historia_corta: brief.confianza?.historia_corta, cifras: brief.confianza?.cifras }, marca: { personalidad: brief.marca?.personalidad, evitar: brief.marca?.evitar, comentarios_del_cliente: brief.marca?.referencias_que_gusta }, zona: brief.zona, contacto: { ciudad: brief.contacto?.direccion?.ciudad, horarios: brief.contacto?.horarios } })}
${menu ? `Menú real (resumen): ${JSON.stringify((mat.menu_texto || []).map((s) => ({ seccion: s.seccion, items: (s.items || []).slice(0, 6).map((i) => `${i.nombre} ${i.precio || ''}`) })))}` : ''}
Responde SOLO JSON: {"variantes":[{"titular":"≤ 55 caracteres","subtitulo":"≤ 120 caracteres","cta":"≤ 22 caracteres, abre WhatsApp","foto":"F#"} ×${nVar}],"info":["3 datos cortos y reales (≤ 30 caracteres) p. ej. modalidad, zona, entrega"],"diapositivas":[{"tipo":"diferenciador|oferta|prueba|vision","titular":"3 a 8 palabras, ≤ 50 caracteres","apoyo":"≤ 90 caracteres o vacío","cta":"≤ 22 caracteres o vacío","foto":"F#"}],"destacados":"título ≤ 22","categorias":"título ≤ 22","visita":"título ≤ 22"${menu ? '' : ',"secciones":{"trabajo":"≤ 22","servicios":"≤ 22","sobre":"≤ 22","resenas":"≤ 30","faq":"≤ 24","contacto":"≤ 22","galeria":"≤ 22"},"sobre":"la historia real del brief, pulida, ≤ 380 caracteres, sin agregar datos"'}}`;
  const res = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
    method: 'POST', headers: { 'x-api-key': config.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: config.generadorModel || config.anthropicModel, max_tokens: 3800, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(120000),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Claude: ${j?.error?.message || res.status}`);
  const t = (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('');
  const d = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  const limpio = (s) => String(s || '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s*→\s*/g, ' ').trim();
  const urlDe = (id) => cat.find((f) => f.id === String(id || '').trim())?.url || null;
  d.variantes = (d.variantes || []).map((v) => ({ titular: limpio(v.titular), subtitulo: limpio(v.subtitulo), cta: limpio(v.cta), foto_url: urlDe(v.foto) }));
  d.diapositivas = (Array.isArray(d.diapositivas) ? d.diapositivas : []).map((x) => ({ tipo: limpio(x?.tipo), titular: limpio(x?.titular), apoyo: limpio(x?.apoyo), cta: limpio(x?.cta), foto_url: urlDe(x?.foto) })).filter((x) => x.titular && x.titular.length <= 60).slice(0, 4);
  if (d.sobre) d.sobre = limpio(d.sobre);
  // Con mapa nuevo los nombres de las secciones son los del giro; en textos.secciones solo quedan los que pida el cliente.
  if (mapa && !esLegado(mapa)) delete d.secciones;
  return d;
}
