// Llamadas a Anthropic para la entrevista: JSON forzado vía tool_use, con usage para el log.
import { config } from '../config.js';

export const MODELO_ARI = config.entrevistaModel;
export const MODELO_MEMORIA = config.entrevistaMemoriaModel;

export async function pedirJSON({ system, contenido, schema, model = MODELO_ARI, max_tokens = 2000, timeoutMs = 120000 }) {
  const apiKey = config.anthropicApiKey;
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY');
  const content = typeof contenido === 'string' ? [{ type: 'text', text: contenido }] : contenido;
  // Algunos modelos no aceptan tool_choice forzado: se pide por instrucción y se cae a JSON en texto si hace falta.
  const body = {
    model,
    max_tokens,
    system: `${system}\n\nRESPONDE SIEMPRE llamando a la herramienta "responder" con el JSON pedido. No escribas texto fuera de la herramienta.`,
    messages: [{ role: 'user', content }],
    tools: [{ name: 'responder', description: 'Entrega la respuesta en el formato pedido.', input_schema: schema || { type: 'object' } }],
    tool_choice: { type: 'auto' },
  };
  const t0 = Date.now();
  const res = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Claude: ${json?.error?.message || res.status}`);
  const call = (json.content || []).find((b) => b.type === 'tool_use' && b.name === 'responder');
  let data = call?.input;
  if (!data) {
    const texto = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const m = texto.match(/\{[\s\S]*\}/);
    if (m) { try { data = JSON.parse(m[0]); } catch { /* sigue */ } }
  }
  // A veces la respuesta llega envuelta como texto ({ _texto: "{...}" } desde el gateway, o un solo campo string con el JSON): se desenvuelve.
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const llaves = Object.keys(data);
    const crudo = typeof data._texto === 'string' ? data._texto : (llaves.length === 1 && typeof data[llaves[0]] === 'string' ? data[llaves[0]] : null);
    if (crudo && /^\s*[{[]/.test(crudo)) {
      const m = crudo.match(/\{[\s\S]*\}/);
      if (m) { try { const d = JSON.parse(m[0]); if (d && typeof d === 'object') data = d; } catch { /* sigue */ } }
    }
  }
  if (!data) throw new Error('Claude no devolvió JSON');
  return { data, usage: json.usage || {}, model, duracion_ms: Date.now() - t0 };
}

// Describe una imagen (contenido, calidad, orientación) para `assets.descripcion_ia`.
export async function describirImagen(url) {
  try {
    const r = await pedirJSON({
      model: MODELO_MEMORIA,
      max_tokens: 300,
      system: 'Describes fotos que un emprendedor manda para su página web. Responde en español, breve y útil para un diseñador.',
      contenido: [
        { type: 'image', source: { type: 'url', url } },
        { type: 'text', text: 'Describe la imagen en una frase (qué se ve, si es local, producto, personas, logo), su calidad (buena/regular/mala: nitidez, luz, tamaño) y orientación.' },
      ],
      schema: {
        type: 'object',
        properties: {
          descripcion: { type: 'string' },
          tipo: { type: 'string', enum: ['logo', 'foto_local', 'foto_producto', 'foto_equipo', 'foto_fundador', 'foto_otro', 'documento'] },
          calidad: { type: 'string', enum: ['buena', 'regular', 'mala'] },
          orientacion: { type: 'string', enum: ['horizontal', 'vertical', 'cuadrada'] },
        },
        required: ['descripcion', 'tipo', 'calidad'],
      },
    });
    return r.data;
  } catch {
    return null;
  }
}

// Transcribe audio: Whisper (OpenAI) si hay llave; si no, un servicio externo compatible con
// POST {url} → {texto, duracion} (por ejemplo el `render` de creador_video).
export async function transcribirAudio(url) {
  try {
    if (config.openaiApiKey) {
      const src = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!src.ok) return null;
      const blob = await src.blob();
      const fd = new FormData();
      fd.append('file', blob, 'audio.ogg');
      fd.append('model', 'whisper-1');
      fd.append('language', 'es');
      const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { authorization: `Bearer ${config.openaiApiKey}` }, body: fd, signal: AbortSignal.timeout(180000),
      });
      const j = await r.json().catch(() => ({}));
      return r.ok && j.text ? { texto: j.text, duracion: null } : null;
    }
    if (config.transcribirUrl) {
      const r = await fetch(config.transcribirUrl, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-key': config.transcribirKey }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(180000),
      });
      const j = await r.json().catch(() => ({}));
      return r.ok && j.texto ? j : null;
    }
  } catch { /* sin transcripción */ }
  return null;
}
