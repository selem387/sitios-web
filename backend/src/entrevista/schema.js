// Esquema de la base `web_builder` (entrevista por WhatsApp → sitio web).
// Se aplica al arrancar con CREATE ... IF NOT EXISTS, así que es seguro repetirlo.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS arquetipos (
  id              serial PRIMARY KEY,
  slug            text UNIQUE NOT NULL,
  nombre          text NOT NULL,
  cta_default     text,
  schema_types    jsonb NOT NULL DEFAULT '[]',
  secciones       jsonb NOT NULL DEFAULT '[]',
  modulos         jsonb NOT NULL DEFAULT '{}',
  diseno          jsonb NOT NULL DEFAULT '{}',
  diseno_version  int NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  creado          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entrevistas (
  id                     uuid PRIMARY KEY,
  usuario_id             text NOT NULL,
  canal                  text,
  callback_url           text,
  metadata               jsonb NOT NULL DEFAULT '{}',
  nombre                 text,
  estado                 text NOT NULL DEFAULT 'en_curso'
    CHECK (estado IN ('en_curso','pausada','completada','generando','publicada','cancelada')),
  bloque_actual          text NOT NULL DEFAULT 'B0',
  arquetipo_slug         text,
  brief                  jsonb NOT NULL DEFAULT '{}',
  pendientes_bloque      jsonb NOT NULL DEFAULT '[]',
  memoria                jsonb NOT NULL DEFAULT '{}',
  memoria_msg_id         int NOT NULL DEFAULT 0,
  memoria_version        int NOT NULL DEFAULT 0,
  memoria_en_curso       boolean NOT NULL DEFAULT false,
  mensajes_cliente       int NOT NULL DEFAULT 0,
  recordatorios_enviados int NOT NULL DEFAULT 0,
  ultimo_contacto        timestamptz NOT NULL DEFAULT now(),
  creado                 timestamptz NOT NULL DEFAULT now(),
  actualizado            timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS entrevistas_usuario_activa_uq
  ON entrevistas (usuario_id) WHERE estado IN ('en_curso','pausada');
CREATE INDEX IF NOT EXISTS entrevistas_estado_contacto_idx ON entrevistas (estado, ultimo_contacto);

CREATE TABLE IF NOT EXISTS mensajes (
  id             serial PRIMARY KEY,
  entrevista_id  uuid NOT NULL REFERENCES entrevistas(id) ON DELETE CASCADE,
  rol            text NOT NULL CHECK (rol IN ('cliente','agente','sistema')),
  tipo           text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','audio','imagen','documento','video','ubicacion')),
  contenido      text,
  transcripcion  text,
  bloque         text,
  creado         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensajes_entrevista_id_idx ON mensajes (entrevista_id, id);

CREATE TABLE IF NOT EXISTS assets (
  id              serial PRIMARY KEY,
  entrevista_id   uuid NOT NULL REFERENCES entrevistas(id) ON DELETE CASCADE,
  mensaje_id      int REFERENCES mensajes(id),
  clave           text NOT NULL,
  tipo            text NOT NULL DEFAULT 'foto_otro',
  url             text NOT NULL,
  mime            text,
  nota            text,
  descripcion_ia  text,
  calidad         text CHECK (calidad IN ('buena','regular','mala')),
  usar            boolean NOT NULL DEFAULT true,
  orden           int,
  creado          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_entrevista_idx ON assets (entrevista_id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS analisis jsonb;

CREATE TABLE IF NOT EXISTS memoria_log (
  id             serial PRIMARY KEY,
  entrevista_id  uuid NOT NULL REFERENCES entrevistas(id) ON DELETE CASCADE,
  version        int NOT NULL,
  memoria        jsonb NOT NULL,
  msg_desde      int,
  msg_hasta      int,
  disparador     text,
  modelo         text,
  tokens_in      int,
  tokens_out     int,
  duracion_ms    int,
  error          text,
  creado         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memoria_log_entrevista_idx ON memoria_log (entrevista_id, version);

CREATE TABLE IF NOT EXISTS eventos (
  id             serial PRIMARY KEY,
  entrevista_id  uuid REFERENCES entrevistas(id) ON DELETE CASCADE,
  tipo           text NOT NULL,
  datos          jsonb NOT NULL DEFAULT '{}',
  creado         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sitios (
  id              serial PRIMARY KEY,
  entrevista_id   uuid NOT NULL REFERENCES entrevistas(id),
  dominio         text UNIQUE,
  blog_id_wp      int,
  estado          text NOT NULL DEFAULT 'pendiente',
  url_publica     text,
  subtipo_resuelto text,
  subtipo_fuente  text,
  lighthouse_json jsonb,
  reporte         jsonb,
  publicado       timestamptz,
  creado          timestamptz NOT NULL DEFAULT now(),
  actualizado     timestamptz NOT NULL DEFAULT now()
);

-- Códigos de verificación del correo del administrador (contacto.email). Solo se guarda el hash del código.
CREATE TABLE IF NOT EXISTS verificaciones_correo (
  id             serial PRIMARY KEY,
  entrevista_id  uuid NOT NULL REFERENCES entrevistas(id) ON DELETE CASCADE,
  email          text NOT NULL,
  codigo_hash    text NOT NULL,
  intentos       int NOT NULL DEFAULT 0,
  entregado      boolean NOT NULL DEFAULT false,
  proveedor      text,
  verificado     timestamptz,
  expira         timestamptz NOT NULL,
  creado         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verificaciones_correo_entrevista_idx ON verificaciones_correo (entrevista_id, id DESC);

INSERT INTO arquetipos (slug, nombre, cta_default, schema_types) VALUES
 ('inmobiliaria','Inmobiliaria','whatsapp_propiedad','["RealEstateAgent","RealEstateListing","FAQPage","BreadcrumbList"]'),
 ('clinica','Clínica / consultorio','agendar_cita','["MedicalClinic","Physician","MedicalProcedure","FAQPage"]'),
 ('restaurante','Restaurante / cafetería / bar','reservar','["Restaurant","Menu","MenuSection","FAQPage"]'),
 ('servicios','Servicios profesionales','cotizar','["ProfessionalService","Service","Person","FAQPage"]'),
 ('tienda','Tienda / productos','pedir_whatsapp','["Store","Product","Offer","FAQPage"]'),
 ('oficios','Oficios y servicios a domicilio','llamar','["LocalBusiness","Service","FAQPage"]'),
 ('educacion','Educación / cursos / coaching','inscribirse','["EducationalOrganization","Course","FAQPage"]'),
 ('turismo','Hospedaje / turismo / experiencias','reservar','["LodgingBusiness","TouristAttraction","Offer","FAQPage"]'),
 ('generico','Genérico','whatsapp','["LocalBusiness","Organization","FAQPage"]')
ON CONFLICT (slug) DO NOTHING;
`;
