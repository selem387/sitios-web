// Auditoría de un sitio publicado: Lighthouse (móvil) + detector de Impeccable (62 reglas deterministas).
// Ambos corren como procesos hijos con el Chromium de Playwright; ninguno necesita un agente de IA.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const run = promisify(execFile);
const CHROME = process.env.CHROME_PATH || chromium.executablePath();

/** Lighthouse móvil. Devuelve puntajes 0-100 y métricas clave; null si falla. */
export async function lighthouse(url, { desktop = false, timeoutMs = 120000 } = {}) {
  const args = [
    url, '--output=json', '--quiet', '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu',
    '--only-categories=performance,accessibility,best-practices,seo',
    ...(desktop ? ['--preset=desktop'] : ['--form-factor=mobile', '--screenEmulation.mobile']),
  ];
  const env = { ...process.env, CHROME_PATH: CHROME };
  try {
    const { stdout } = await run('lighthouse', args, { env, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
    const r = JSON.parse(stdout);
    const cat = (k) => Math.round((r.categories?.[k]?.score ?? 0) * 100);
    const aud = (k) => r.audits?.[k]?.numericValue ?? null;
    return {
      ok: true,
      puntajes: { rendimiento: cat('performance'), accesibilidad: cat('accessibility'), buenas_practicas: cat('best-practices'), seo: cat('seo') },
      metricas: { lcp_ms: aud('largest-contentful-paint'), inp_ms: aud('interaction-to-next-paint') ?? aud('total-blocking-time'), cls: aud('cumulative-layout-shift'), fcp_ms: aud('first-contentful-paint'), peso_kb: aud('total-byte-weight') ? Math.round(aud('total-byte-weight') / 1024) : null },
      fallos: Object.values(r.audits || {})
        .filter((a) => a.score !== null && a.score < 0.5 && a.scoreDisplayMode === 'binary')
        .slice(0, 25)
        .map((a) => ({ id: a.id, titulo: a.title })),
      lighthouse_version: r.lighthouseVersion,
    };
  } catch (err) {
    return { ok: false, error: String(err.stderr || err.message).slice(0, 500) };
  }
}

/** Impeccable detect sobre una URL (reglas de render: contraste, texto diminuto, patrones de IA, etc.). */
export async function impeccable(url, { timeoutMs = 120000 } = {}) {
  const env = { ...process.env, CHROME_PATH: CHROME, DO_NOT_TRACK: '1', IMPECCABLE_BROWSER: CHROME };
  try {
    const { stdout } = await run('impeccable', ['detect', '--json', '--no-config', url], { env, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, ...normalizarImpeccable(stdout) };
  } catch (err) {
    // Exit code 2 = hubo hallazgos (no es error); 1 = no se pudo escanear.
    if (err.code === 2 && err.stdout) return { ok: true, ...normalizarImpeccable(err.stdout) };
    return { ok: false, error: String(err.stderr || err.message).slice(0, 500) };
  }
}

function normalizarImpeccable(stdout) {
  let data;
  try { data = JSON.parse(stdout); } catch { return { hallazgos: [], crudo: String(stdout).slice(0, 2000) }; }
  // El esquema puede variar entre versiones: aceptamos {findings:[...]} o un arreglo.
  const lista = Array.isArray(data) ? data : data.findings || data.results || data.issues || [];
  const hallazgos = lista.map((f) => ({
    regla: f.rule || f.ruleId || f.id || null,
    severidad: f.severity || f.priority || f.level || null,
    mensaje: f.message || f.title || f.description || null,
    selector: f.selector || f.target || f.element || null,
    valor: f.value ?? null,
  }));
  const porSeveridad = {};
  for (const h of hallazgos) porSeveridad[h.severidad || 'sin'] = (porSeveridad[h.severidad || 'sin'] || 0) + 1;
  return { hallazgos, resumen: porSeveridad, total: hallazgos.length };
}

/** Comprobaciones propias baratas que ni Lighthouse ni Impeccable cubren bien para nuestros sitios. */
export async function checksPropios(page) {
  return page.evaluate(() => {
    const q = (s) => Array.from(document.querySelectorAll(s));
    const texto = document.body.innerText || '';
    const wa = q('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href^="https://wa.link"]');
    const tel = q('a[href^="tel:"]');
    const h1 = q('h1');
    const emojiEnBotones = q('a,button').filter((e) => /\p{Extended_Pictographic}/u.test(e.textContent || '')).length;
    const flechas = q('a,button').filter((e) => /→\s*$/.test((e.textContent || '').trim())).length;
    const fuentes = new Set(q('*').slice(0, 1500).map((e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim()));
    const ld = q('script[type="application/ld+json"]').length;
    const imgsSinAlt = q('img').filter((i) => !i.getAttribute('alt')).length;
    const viewport = document.querySelector('meta[name="viewport"]')?.content || null;
    return {
      whatsapp_links: wa.length, tel_links: tel.length, h1: h1.length, h1_texto: h1[0]?.textContent?.trim().slice(0, 120) || null,
      emoji_en_botones: emojiEnBotones, flechas_en_botones: flechas, fuentes: [...fuentes].slice(0, 8), json_ld_bloques: ld,
      imgs_sin_alt: imgsSinAlt, viewport, palabras: texto.split(/\s+/).length,
      inter_como_fuente: [...fuentes].some((f) => /^(Inter|Roboto|Arial)$/i.test(f)),
    };
  });
}
