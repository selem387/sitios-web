// Llamada mínima a Claude con salida JSON forzada por herramienta.
const KEY = process.env.ANTHROPIC_API_KEY || '';
const BASE = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
export const MODELO_VISION = process.env.EXTRACTOR_MODELO_VISION || 'claude-haiku-5-5';
export const MODELO_TEXTO = process.env.EXTRACTOR_MODELO_TEXTO || 'claude-haiku-5-5';

export const hayClaude = () => !!KEY;

// El gateway de IA a veces entrega arreglos/objetos del esquema como texto JSON ("[{...}]"): se convierten de vuelta.
function normalizar(v, prof = 0) {
  if (prof > 6) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) {
      try { return normalizar(JSON.parse(t), prof + 1); } catch { return v; }
    }
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => normalizar(x, prof + 1));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalizar(x, prof + 1)]));
  return v;
}

export async function pedirJSON({ system, contenido, schema, model = MODELO_TEXTO, max_tokens = 2000, timeoutMs = 120000 }) {
  if (!KEY) throw new Error('Falta ANTHROPIC_API_KEY');
  const res = await fetch(`${BASE}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens,
      system: `${system}\n\nResponde SIEMPRE llamando a la herramienta "responder".`,
      messages: [{ role: 'user', content: typeof contenido === 'string' ? [{ type: 'text', text: contenido }] : contenido }],
      tools: [{ name: 'responder', description: 'Entrega la respuesta.', input_schema: schema }],
      tool_choice: { type: 'tool', name: 'responder' },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Claude: ${j?.error?.message || res.status}`);
  const call = (j.content || []).find((b) => b.type === 'tool_use');
  if (!call?.input) throw new Error('Claude no devolvió JSON');
  return normalizar(call.input);
}
