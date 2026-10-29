// Configuración global leída de variables de entorno.
const env = process.env;

export const config = {
  port: Number(env.PORT || 3000),
  // Conexión con privilegios para crear bases de datos (una por cliente).
  databaseUrl: env.DATABASE_URL || 'postgres://postgres@localhost:5432/postgres',
  controlDb: env.CONTROL_DB || 'sitios_control',
  adminToken: env.ADMIN_TOKEN || '',
  // URL pública del backend; se usa para construir URLs de archivos.
  publicUrl: (env.PUBLIC_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, ''),
  dataDir: env.DATA_DIR || '/data',
  // URL interna con la que las funciones Deno llaman de vuelta a esta API.
  internalUrl: (env.INTERNAL_URL || `http://127.0.0.1:${env.PORT || 3000}`).replace(/\/$/, ''),
  denoBin: env.DENO_BIN || 'deno',
  anthropicApiKey: env.ANTHROPIC_API_KEY || '',
  anthropicModel: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  openaiApiKey: env.OPENAI_API_KEY || '',
  smtpUrl: env.SMTP_URL || '',
  resendApiKey: env.RESEND_API_KEY || '',
  mailFrom: env.MAIL_FROM || 'no-reply@example.com',
  base44Url: (env.BASE44_URL || 'https://base44.app').replace(/\/$/, ''),
  maxListLimit: Number(env.MAX_LIST_LIMIT || 5000),
  maxUploadMb: Number(env.MAX_UPLOAD_MB || 50),
};
