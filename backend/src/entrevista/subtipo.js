// Resolución robusta del subtipo de negocio (capa 2) y lectura de los datos de diseño.
// Capa 1: Ari asigna negocio.subtipo en B1 (validado en agente.js contra arquetipos.diseno).
// Capa 2: si viene null o con subtipo_confianza = "baja", se infiere por keywords_es/keywords
//         contra giro_texto + nombres de la oferta. Si nada coincide, default por arquetipo.
import { q } from './db.js';

export const DEFAULT_SUBTIPO = {
  inmobiliaria: 'inmobiliaria', clinica: 'medica', restaurante: 'restaurante', servicios: 'contador_consultor',
  tienda: 'general', oficios: 'servicio_local', educacion: 'cursos', turismo: 'hotel', generico: 'servicio_b2b',
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const tokens = (s) => norm(s).split(/[^a-z0-9ñ]+/).filter((t) => t.length > 2);
const stem = (t) => t.replace(/(es|s)$/, '');

/** Texto del brief que describe el giro: giro_texto + nombre del negocio + nombres de la oferta + personalidad. */
export function textoGiro(brief = {}) {
  const n = brief.negocio || {};
  const items = Array.isArray(brief.oferta?.items) ? brief.oferta.items.map((i) => `${i?.nombre || ''} ${i?.descripcion_corta || ''}`) : [];
  return [n.giro_texto, n.nombre, ...items, brief.cliente_ideal?.problema_que_resuelves].filter(Boolean).join(' ');
}

/** Puntaje de un subtipo contra un texto: coincidencias de keywords_es (peso 2) y keywords en inglés (peso 1). */
export function puntuar(sub, texto) {
  const t = texto;
  const ts = new Set(tokens(t).map(stem));
  let p = 0;
  const contar = (lista, peso) => {
    for (const kw of String(lista || '').split(',').map((k) => norm(k).trim()).filter(Boolean)) {
      if (kw.includes(' ')) { if (t.includes(kw)) p += peso * 2; continue; } // frase completa vale doble
      if (ts.has(stem(kw))) p += peso;
    }
  };
  contar(sub.keywords_es, 2);
  contar(sub.keywords, 1);
  return p;
}

/**
 * @param {object} brief  brief de la entrevista
 * @param {Array}  arquetipos  filas de db.arquetipos(): {slug, subtipos:{<slug>:{keywords, keywords_es,...}}}
 * @returns {{arquetipo:string, subtipo:string, fuente:'ari'|'inferido'|'default', puntajes:object}}
 */
export function resolverSubtipo(brief = {}, arquetipos = []) {
  const n = brief.negocio || {};
  let arquetipo = arquetipos.some((a) => a.slug === n.arquetipo) ? n.arquetipo : 'generico';
  const arq = arquetipos.find((a) => a.slug === arquetipo) || {};
  const subs = arq.subtipos || {};
  const texto = norm(textoGiro(brief));

  if (n.subtipo && n.subtipo in subs && n.subtipo_confianza !== 'baja') {
    return { arquetipo, subtipo: n.subtipo, fuente: 'ari', puntajes: {} };
  }
  const puntajes = Object.fromEntries(Object.entries(subs).map(([k, v]) => [k, puntuar(v, texto)]));
  const [mejor, pts] = Object.entries(puntajes).sort((a, b) => b[1] - a[1])[0] || [];
  if (mejor && pts > 0) {
    // Si Ari propuso un subtipo con confianza baja y empata con el mejor, se respeta a Ari.
    if (n.subtipo && puntajes[n.subtipo] === pts) return { arquetipo, subtipo: n.subtipo, fuente: 'ari', puntajes };
    return { arquetipo, subtipo: mejor, fuente: 'inferido', puntajes };
  }
  const def = DEFAULT_SUBTIPO[arquetipo] in subs ? DEFAULT_SUBTIPO[arquetipo] : Object.keys(subs)[0] || null;
  return { arquetipo, subtipo: def, fuente: 'default', puntajes };
}

/**
 * Datos de diseño para el generador: subtipo + estilo + checklist.
 * Precedencia la aplica el prompt del generador (brief > estilo > subtipo > checklist).
 */
export async function datosDiseno({ arquetipo, subtipo, estilo }) {
  const r = await q(
    `SELECT a.diseno->'subtipos'->$2 AS subtipo_diseno,
            a.diseno_version,
            to_jsonb(e.*) AS estilo,
            (SELECT jsonb_agg(c ORDER BY c.id) FROM diseno_checklist c WHERE c.version = 'uupm-2026-10-31') AS checklist
     FROM arquetipos a
     LEFT JOIN diseno_estilos e ON e.slug = $3
     WHERE a.slug = $1`,
    [arquetipo, subtipo, estilo || null],
  );
  const row = r.rows[0] || {};
  const sd = row.subtipo_diseno || null;
  const est = row.estilo || null;
  // Inter como cuerpo es un "tell" de diseño IA: preferir la alternativa cuando aparece.
  const tipografia = est?.tipografia?.cuerpo === 'Inter' && est?.tipografia_alternativa ? est.tipografia_alternativa : est?.tipografia || sd?.tipografia_giro || null;
  return {
    arquetipo, subtipo, estilo: estilo || null, version: row.diseno_version || null,
    subtipo_diseno: sd, estilo_diseno: est, tipografia_recomendada: tipografia,
    checklist: row.checklist || [],
  };
}
