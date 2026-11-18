// Reconstrucción automática de una página de referencia (diseño aprobado por Sebastián el 18-nov-2026; doc del proyecto
// claude/pagina-referencia-plantilla.md). Toma capturas de la página que mandó el cliente, le pide a Claude un PLANO
// (bloques de nuestro catálogo, orden, proporciones, letra y colores; nunca código ni textos de la original), arma la
// página con los datos del cliente, la compara contra la referencia y corrige el plano hasta 2 veces.
// Si la página no se deja leer o no se parece lo suficiente → error (Ari sigue con las opciones normales).
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { pedirJSON } from '../entrevista/claude.js';
import { PORTADAS, BLOQUES, FONDOS, PARES, normalizarPlano, paginaReferencia } from './opciones/referencia/referencia.js';

const RENDER = () => (config.renderUrl || '').replace(/\/$/, '');
const PARECIDO_MIN = 3;
// Avisos de cookies y ventanas emergentes de la referencia: no son parte de su diseño.
const CSS_SIN_AVISOS = '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],#onetrust-banner-sdk,#CybotCookiebotDialog,.cc-window,[aria-modal=true]{display:none!important}';

async function render(ruta, cuerpo, ms = 120000) {
  if (!RENDER()) throw new Error('RENDER_URL no configurada');
  const r = await fetch(`${RENDER()}${ruta}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': config.renderApiKey }, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(ms) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`render ${ruta} ${r.status}: ${j.error || ''}`);
  return j;
}

/** Capturas de una página: escritorio en tramos (hasta 5) y la primera pantalla en celular. */
export async function capturasDe(url, { tramos = 5, css = '' } = {}) {
  const [pc, cel] = await Promise.all([
    render('/v1/captura', { url, ancho: 1280, tramos, ...(css ? { css } : {}) }),
    render('/v1/captura', { url, ancho: 390, ...(css ? { css } : {}) }),
  ]);
  return { escritorio: pc.urls || [], celular: cel.url || null };
}

const ESQUEMA = {
  type: 'object',
  properties: {
    legible: { type: 'boolean', description: 'false si las capturas no muestran una página web real (error, inicio de sesión, aviso de cookies que tapa todo, página en blanco).' },
    plano: {
      type: 'object',
      properties: {
        estilo: {
          type: 'object',
          properties: {
            colores: { type: 'object', properties: { fondo: { type: 'string', description: '#RRGGBB del fondo dominante' }, texto: { type: 'string' }, acento: { type: 'string', description: 'color de botones/enlaces destacados' }, alterno: { type: 'string', description: 'fondo de secciones alternas, si hay' }, oscuro: { type: 'string', description: 'fondo de bandas oscuras, si hay' } }, required: ['fondo', 'texto', 'acento'] },
            par: { type: 'integer', description: 'índice del par tipográfico de la lista que más se parece a la letra de la referencia' },
            mayusculas_titulos: { type: 'boolean' }, peso_titulos: { type: 'integer' }, tam_titulos: { enum: ['mediano', 'grande', 'enorme'] },
            radio: { type: 'integer', description: 'radio de esquinas en px (0 = rectas)' }, aire: { enum: ['compacto', 'medio', 'amplio'] }, ancho: { enum: ['estrecho', 'normal', 'amplio'] }, botones: { enum: ['solido', 'contorno', 'pildora'] },
          },
          required: ['colores', 'par'],
        },
        encabezado: { type: 'object', properties: { estilo: { enum: ['solido', 'transparente', 'centrado'] } } },
        portada: { type: 'object', properties: { tipo: { enum: PORTADAS }, alineacion: { enum: ['izquierda', 'centro'] }, alto: { enum: ['pantalla', 'media', 'compacta'] }, foto_lado: { enum: ['izquierda', 'derecha'] }, velo: { type: 'number' }, fondo: { enum: FONDOS } }, required: ['tipo'] },
        secciones: { type: 'array', items: { type: 'object', properties: { tipo: { enum: Object.keys(BLOQUES) }, estilo: { type: 'string' }, columnas: { type: 'integer' }, fondo: { enum: FONDOS } }, required: ['tipo'] } },
        pie: { type: 'object', properties: { estilo: { enum: ['simple', 'oscuro'] } } },
      },
      required: ['estilo', 'portada', 'secciones'],
    },
    parecido: { type: 'integer', minimum: 0, maximum: 5, description: 'Solo al comparar: 1–5 qué tanto se parece la página armada a la referencia en ESTRUCTURA y ESTILO.' },
    notas: { type: 'string' },
  },
  required: ['legible', 'plano'],
};

const CATALOGO_TXT = () => `CATÁLOGO DE PIEZAS (solo puedes usar estas):
- portada.tipo: ${PORTADAS.join(', ')} (foto_completa = foto a todo lo ancho con texto encima; dividida = texto y foto lado a lado; texto_grande = titular enorme con banda de foto abajo; texto_centrado = solo texto; tarjeta = foto de fondo con recuadro de texto; mosaico = texto + varias fotos).
- secciones (en el orden de la referencia; cada tipo una vez, salvo banda_cta): ${Object.entries(BLOQUES).map(([k, v]) => `${k} [${v.join('|')}]`).join('; ')}.
  servicios = lo que ofrece el negocio; trabajo = galería de fotos; sobre = quiénes somos; resenas = testimonios; proceso = pasos; faq = preguntas; banda_cta = franja con frase y botón; contacto = cierre con datos.
- fondo de cada sección: ${FONDOS.join(', ')}.
- estilo.par (letra): ${PARES.map((p, i) => `${i}=${p.titulos}/${p.cuerpo}`).join(', ')}.`;

const SISTEMA = 'Eres directora de arte. Describes la ESTRUCTURA y el ESTILO de una página web como un plano hecho con un catálogo de piezas propias, para reconstruir una página nueva con los datos de otro negocio. Nunca copias textos, imágenes, logos ni código: solo eliges piezas, orden, proporciones, letra y colores que se le parezcan.';

/** Pide el plano de la referencia. */
async function planoInicial({ estudio, capturas }) {
  const contenido = [{ type: 'text', text: `${CATALOGO_TXT()}\n\nESTUDIO MEDIDO DE LA PÁGINA (código): ${JSON.stringify({ tipografia: estudio?.tipografia, colores: estudio?.colores, forma: estudio?.forma, densidad: estudio?.densidad, estructura: estudio?.estructura, modo: estudio?.modo }).slice(0, 3500)}\n\nCapturas de la página de referencia (escritorio de arriba hacia abajo, y celular). Arma el plano que mejor reproduzca su estructura y estilo con el catálogo.` }];
  capturas.escritorio.forEach((u, i) => contenido.push({ type: 'text', text: `Escritorio, tramo ${i + 1}` }, { type: 'image', source: { type: 'url', url: u } }));
  if (capturas.celular) contenido.push({ type: 'text', text: 'Celular, primera pantalla' }, { type: 'image', source: { type: 'url', url: capturas.celular } });
  const r = await pedirJSON({ system: SISTEMA, contenido, schema: ESQUEMA, model: config.anthropicModel, max_tokens: 3000, timeoutMs: 240000 });
  return r.data;
}

/** Compara la página armada contra la referencia y devuelve el plano corregido + parecido. */
async function compararYCorregir({ plano, capturas, propias }) {
  const contenido = [{ type: 'text', text: `${CATALOGO_TXT()}\n\nPLANO ACTUAL: ${JSON.stringify(plano)}\n\nAbajo: primero la página de REFERENCIA, después la página ARMADA con el plano (con los datos de otro negocio: textos y fotos distintos son correctos). Sé estricta: 5 solo si alguien que conoce la referencia la reconocería al instante; 3 si se reconoce el estilo pero el acomodo cambia; 1–2 si parece otra página. Califica "parecido" (1–5) SOLO en estructura y estilo: acomodo de bloques, tipo de portada, proporciones, letra, colores, aire y forma. NO bajes la calificación porque el contenido sea distinto: otros textos, otras fotos, menos fotos o menos secciones son normales (es otro negocio con su propio material). y devuelve el plano corregido para parecerse más (si ya se parece, devuelve el mismo).` }];
  capturas.escritorio.slice(0, 3).forEach((u, i) => contenido.push({ type: 'text', text: `REFERENCIA, escritorio ${i + 1}` }, { type: 'image', source: { type: 'url', url: u } }));
  propias.escritorio.slice(0, 3).forEach((u, i) => contenido.push({ type: 'text', text: `ARMADA, escritorio ${i + 1}` }, { type: 'image', source: { type: 'url', url: u } }));
  if (propias.celular) contenido.push({ type: 'text', text: 'ARMADA, celular' }, { type: 'image', source: { type: 'url', url: propias.celular } });
  const r = await pedirJSON({ system: SISTEMA, contenido, schema: ESQUEMA, model: config.anthropicModel, max_tokens: 3000, timeoutMs: 240000 });
  return r.data;
}

/** Página de prueba con los datos del cliente, servida en /p/<token>/S para capturarla. */
async function paginaDePrueba({ plano, brief, mat, titulos }) {
  const { DIR_PROPUESTAS } = await import('./propuestas_html.js');
  const { waUrl } = await import('./bloques.js');
  const token = `rf${crypto.randomBytes(6).toString('hex')}`;
  const c = brief.contacto || {};
  const v = { titular: brief.negocio?.lema || brief.negocio?.nombre || 'Tu negocio', subtitulo: brief.negocio?.giro_texto || '', cta: 'Escríbenos por WhatsApp' };
  const wa = c.whatsapp ? ` href="${waUrl(c.whatsapp, 'Hola')}" target="_blank" rel="noopener"` : '';
  // Con los mismos elementos ilustrativos que llevará en sus opciones (fotos y ejemplos donde falte).
  let b = brief, m = mat;
  try {
    const il = await import('./ilustrativas.js');
    const { porLetra } = await import('./opciones/registro.js');
    if (il.ilustrativasActivas(brief)) { const relleno = await il.construirRelleno([porLetra('S')], { brief, mat }, await il.dependenciasReales()); if (relleno) ({ brief: b, mat: m } = il.aplicarRelleno(brief, mat, relleno)); }
  } catch (err) { console.warn('[reconstruir] ilustrativas', err.message); }
  const { html } = paginaReferencia({ plano, brief: b, mat: m, textos: {}, v, titulos, wa, colores: mat.colores || [] });
  await fs.mkdir(path.join(DIR_PROPUESTAS, token), { recursive: true });
  await fs.writeFile(path.join(DIR_PROPUESTAS, token, 'S.html'), html);
  return `${config.publicUrl}/p/${token}/S`;
}

/**
 * Reconstruye la referencia para un cliente. → {plano, parecido, capturas, intentos}
 * Lanza error con code 'REFERENCIA_ILEGIBLE' o 'REFERENCIA_SIN_PARECIDO' (decisión 9: Ari sigue sin ella).
 */
export async function reconstruirReferencia(url, { brief = {}, mat = {}, titulos = {}, estudio = null, correcciones = 2, deps = {} } = {}) {
  const capt = deps.capturasDe || capturasDe;
  const estudiar = deps.estudiar || ((u) => render('/v1/estudiar', { url: u }, 90000).catch(() => null));
  const [capturas, est] = await Promise.all([capt(url, { css: CSS_SIN_AVISOS }), estudio ? Promise.resolve(estudio) : estudiar(url)]);
  if (!capturas.escritorio.length) throw Object.assign(new Error('No se pudo capturar la página de referencia'), { code: 'REFERENCIA_ILEGIBLE' });
  const ini = await (deps.planoInicial || planoInicial)({ estudio: est, capturas });
  if (ini.legible === false) throw Object.assign(new Error('La página de referencia no se deja leer'), { code: 'REFERENCIA_ILEGIBLE' });
  let plano = normalizarPlano(ini.plano), parecido = 0, mejor = { plano, parecido: 0, muestra: null };
  for (let k = 0; k <= correcciones; k++) {
    const urlPrueba = await (deps.paginaDePrueba || paginaDePrueba)({ plano, brief, mat, titulos });
    const propias = await capt(urlPrueba, { tramos: 3 });
    const r = await (deps.compararYCorregir || compararYCorregir)({ plano, capturas, propias });
    parecido = Number(r.parecido) || 0;
    if (parecido > mejor.parecido || !mejor.muestra) mejor = { plano, parecido: Math.max(parecido, mejor.parecido), muestra: parecido >= mejor.parecido ? urlPrueba : mejor.muestra };
    if (parecido >= 4 || k === correcciones) break;
    plano = normalizarPlano(r.plano);
  }
  if (mejor.parecido < PARECIDO_MIN) throw Object.assign(new Error(`La reconstrucción no se parece lo suficiente (${mejor.parecido}/5)`), { code: 'REFERENCIA_SIN_PARECIDO', plano: mejor.plano, muestra: mejor.muestra, parecido: mejor.parecido });
  return { plano: mejor.plano, parecido: mejor.parecido, capturas, url, muestra: mejor.muestra };
}
