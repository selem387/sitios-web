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
  // 04-nov-2026: si se define, la IA pasa por el servicio interno ia-gateway de IAprop (Qwen + respaldo OpenRouter).
  anthropicBaseUrl: (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
  openaiApiKey: env.OPENAI_API_KEY || '',
  smtpUrl: env.SMTP_URL || '',
  resendApiKey: env.RESEND_API_KEY || '',
  mailFrom: env.MAIL_FROM || 'no-reply@example.com',
  base44Url: (env.BASE44_URL || 'https://base44.app').replace(/\/$/, ''),
  maxListLimit: Number(env.MAX_LIST_LIMIT || 5000),
  maxUploadMb: Number(env.MAX_UPLOAD_MB || 50),
  // Entrevista web (módulo entrevista/): misma API que creador_video/entrevista.
  entrevistaDb: env.ENTREVISTA_DB || 'web_builder',
  entrevistaApiKey: env.ENTREVISTA_API_KEY || '',
  entrevistaModel: env.ENTREVISTA_MODEL || env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  entrevistaMemoriaModel: env.ENTREVISTA_MEMORIA_MODEL || 'claude-haiku-5-5',
  transcribirUrl: env.TRANSCRIBIR_URL || '',
  transcribirKey: env.TRANSCRIBIR_KEY || '',
  // Publicación en redes (publicador.timewins.ai): URL interna o pública y clave de API (Bearer).
  publicadorUrl: (env.PUBLICADOR_URL || 'https://publicador.timewins.ai').replace(/\/$/, ''),
  publicadorClave: env.PUBLICADOR_API_KEY || '',
  // WordPress suspendido (6-nov-2026): todo sitio nuevo va a la plataforma "app". WORDPRESS_ACTIVO=1 lo reactiva.
  wordpressActivo: /^(1|true|si|sí)$/i.test(env.WORDPRESS_ACTIVO || ''),
  // Generador de sitios WordPress (módulo generador/).
  generadorModel: env.GENERADOR_MODEL || env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
  wpGenUrl: (env.WP_GEN_URL || '').replace(/\/$/, ''),          // sitio principal del Multisite (https://...)
  wpGenKey: env.WP_GEN_KEY || '',                                 // = opción de red iaprop_gen_key
  wpDominioBase: env.WP_DOMINIO_BASE || 'x6jqxs.easypanel.host',  // vista previa: sw-<slug>.<base>
  renderUrl: (env.RENDER_URL || '').replace(/\/$/, ''),
  renderApiKey: env.RENDER_API_KEY || '',
  // Opcional: registrar el dominio de vista previa en Easypanel desde el backend.
  easypanelUrl: (env.EASYPANEL_URL || '').replace(/\/$/, ''),
  easypanelToken: env.EASYPANEL_TOKEN || '',
  wpEasypanelProyecto: env.WP_EASYPANEL_PROYECTO || 'sitios-web',
  wpEasypanelServicio: env.WP_EASYPANEL_SERVICIO || 'wp-plantilla',
  // Códigos de acceso por correo (verificación en la entrevista y login sin contraseña del administrador).
  // Proveedor: GoHighLevel (LC Email). Location y remitente pendientes de definir; sin ellos se usa mail.js (Resend/SMTP) o solo log.
  ghlApiKey: env.GHL_API_KEY || '',                 // token de integración privada de la location
  ghlLocationId: env.GHL_LOCATION_ID || '',
  correoRemitente: env.CORREO_REMITENTE || '',      // p. ej. acceso@mail.<dominio-neutro>
  correoRemitenteNombre: env.CORREO_REMITENTE_NOMBRE || 'Acceso a tu página',
  // Panel del dueño (sitios en vivo). PANEL_SECRET firma las sesiones; ACCESO_URL es el dominio neutro del login con Google
  // (su /acceso/google/callback va registrado en Google Cloud). Sin GOOGLE_CLIENT_ID/SECRET solo se ofrece el código al correo.
  panelSecret: env.PANEL_SECRET || env.ADMIN_TOKEN || env.ENTREVISTA_API_KEY || '',
  accesoUrl: (env.ACCESO_URL || '').replace(/\/$/, ''),
  googleClientId: env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: env.GOOGLE_CLIENT_SECRET || '',
};
