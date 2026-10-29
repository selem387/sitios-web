// Llamadas a Claude (API de Anthropic) para InvokeLLM y ExtractDataFromUploadedFile.
import { config } from './config.js';
import { HttpError, isObject } from './util.js';
import { readOwnFile, mimeFor } from './storage.js';

const TEXT_TYPES = ['text/', 'application/json', 'application/xml', 'text/csv'];

async function fileBlock(url) {
  let buf;
  let mime;
  const own = await readOwnFile(url).catch(() => null);
  if (own) {
    buf = own.buffer;
    mime = own.mime;
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new HttpError(400, `No se pudo descargar ${url} (${res.status})`);
    buf = Buffer.from(await res.arrayBuffer());
    mime = (res.headers.get('content-type') || mimeFor(url)).split(';')[0];
  }
  if (mime.startsWith('image/')) {
    return { type: 'image', source: { type: 'base64', media_type: mime === 'image/jpg' ? 'image/jpeg' : mime, data: buf.toString('base64') } };
  }
  if (mime === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } };
  }
  if (TEXT_TYPES.some((t) => mime.startsWith(t)) || /\.(csv|txt|json|md|xml|html?)$/i.test(url)) {
    return { type: 'text', text: `Contenido del archivo ${url}:\n\n${buf.toString('utf8').slice(0, 200000)}` };
  }
  return { type: 'text', text: `[Archivo adjunto no legible directamente: ${url} (${mime})]` };
}

function normalizeSchema(schema) {
  if (!isObject(schema)) return null;
  if (schema.type === 'object') return schema;
  return { type: 'object', properties: { result: schema }, required: ['result'], __wrapped: true };
}

export async function invokeClaude(tenant, { prompt, response_json_schema, file_urls, add_context_from_internet, system, model }) {
  const apiKey = tenant?.secrets?.ANTHROPIC_API_KEY || config.anthropicApiKey;
  if (!apiKey) throw new HttpError(501, 'InvokeLLM no configurado: falta ANTHROPIC_API_KEY');
  const content = [];
  for (const url of Array.isArray(file_urls) ? file_urls : file_urls ? [file_urls] : []) content.push(await fileBlock(url));
  content.push({ type: 'text', text: String(prompt || '') });

  const schema = normalizeSchema(response_json_schema);
  const tools = [];
  if (add_context_from_internet) tools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 5 });
  if (schema) {
    const { __wrapped, ...clean } = schema;
    tools.push({ name: 'responder', description: 'Entrega la respuesta final con el formato pedido.', input_schema: clean });
  }
  const body = {
    model: model || tenant?.settings?.llm_model || config.anthropicModel,
    max_tokens: 8192,
    messages: [{ role: 'user', content }],
    ...(system ? { system } : {}),
    ...(tools.length ? { tools } : {}),
    ...(schema && !add_context_from_internet ? { tool_choice: { type: 'tool', name: 'responder' } } : {}),
  };
  if (schema && add_context_from_internet) {
    body.system = `${system ? `${system}\n\n` : ''}Cuando tengas la información necesaria, entrega la respuesta final llamando a la herramienta "responder".`;
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new HttpError(502, `Claude: ${json?.error?.message || res.status}`);
  if (schema) {
    const call = (json.content || []).find((b) => b.type === 'tool_use' && b.name === 'responder');
    if (!call) throw new HttpError(502, 'Claude no devolvió la respuesta estructurada');
    return schema.__wrapped ? call.input.result : call.input;
  }
  return (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}
