// Integraciones Core de Base44: archivos, IA, correo e imágenes.
import { saveUpload, saveBuffer, signedUrl } from './storage.js';
import { invokeClaude } from './llm.js';
import { sendMail } from './mail.js';
import { config } from './config.js';
import { HttpError } from './util.js';

async function readPayload(c) {
  const type = c.req.header('content-type') || '';
  if (type.includes('multipart/form-data')) {
    const form = await c.req.parseBody({ all: true });
    const out = {};
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'string') {
        try {
          out[k] = JSON.parse(v);
        } catch {
          out[k] = v;
        }
      } else out[k] = v;
    }
    return out;
  }
  return (await c.req.json().catch(() => ({}))) || {};
}

async function generateImage(tenant, { prompt }) {
  const key = tenant.secrets.OPENAI_API_KEY || config.openaiApiKey;
  if (!key) throw new HttpError(501, 'GenerateImage no configurado: falta OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: tenant.settings.image_model || 'gpt-image-1', prompt, size: '1024x1024' }),
  });
  const json = await res.json();
  if (!res.ok) throw new HttpError(502, `OpenAI: ${json?.error?.message || res.status}`);
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) return { url: json.data?.[0]?.url };
  const saved = await saveBuffer(tenant, Buffer.from(b64, 'base64'), 'imagen.png', { mime: 'image/png' });
  return { url: saved.url };
}

export const CORE = {
  async UploadFile(tenant, p) {
    const saved = await saveUpload(tenant, p.file);
    return { file_url: saved.url };
  },
  async UploadPublicFile(tenant, p) {
    const saved = await saveUpload(tenant, p.file);
    return { file_url: saved.url };
  },
  async UploadPrivateFile(tenant, p) {
    const saved = await saveUpload(tenant, p.file, { isPrivate: true });
    return { file_uri: saved.uri };
  },
  async CreateFileSignedUrl(tenant, p) {
    return { signed_url: signedUrl(tenant, p.file_uri, p.expires_in) };
  },
  async InvokeLLM(tenant, p) {
    return invokeClaude(tenant, p);
  },
  async SendEmail(tenant, p) {
    await sendMail(tenant, { to: p.to, subject: p.subject, html: p.body, from_name: p.from_name });
    return {};
  },
  async ExtractDataFromUploadedFile(tenant, p) {
    try {
      const output = await invokeClaude(tenant, {
        prompt:
          'Extrae los datos del archivo adjunto siguiendo exactamente el esquema JSON indicado. ' +
          'Si el archivo contiene varios elementos, devuélvelos todos. No inventes datos.',
        file_urls: [p.file_url],
        response_json_schema: p.json_schema,
      });
      return { status: 'success', details: null, output };
    } catch (e) {
      return { status: 'error', details: e.message, output: null };
    }
  },
  async GenerateImage(tenant, p) {
    return generateImage(tenant, p);
  },
  async SendSMS() {
    throw new HttpError(501, 'SendSMS no está disponible; usa WhatsApp vía n8n/YCloud');
  },
};

export function registerIntegrationRoutes(app, ctx) {
  app.post('/api/apps/:appId/integration-endpoints/Core/:name', ctx(async (c, { tenant, caller }) => {
    const name = c.req.param('name');
    const fn = CORE[name];
    if (!fn) throw new HttpError(404, `Integración Core no soportada: ${name}`);
    // Sin sesión solo se permiten las integraciones listadas en settings.public_integrations
    // (evita que cualquiera use la app como almacenamiento gratis o gaste créditos de IA).
    const allowed = tenant.settings.public_integrations || [];
    if (caller.kind === 'anon' && !allowed.includes(name) && !allowed.includes('*')) {
      throw new HttpError(401, 'Authentication required', { reason: 'auth_required' });
    }
    return fn(tenant, await readPayload(c));
  }, { rawBody: true }));

  app.post('/api/apps/:appId/integration-endpoints/installable/:pkg/integration-endpoints/:name', ctx(async (c) => {
    throw new HttpError(501, `Integración instalable no soportada: ${c.req.param('pkg')}/${c.req.param('name')}`);
  }));
}
