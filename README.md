# sitios-web

Reemplazo autoalojado de Base44 en el VPS (Easypanel) + plantilla WordPress inmobiliaria.

## Piezas

| Carpeta | Qué es | Servicio Easypanel |
|---|---|---|
| `backend/` | API multi-app compatible con la API REST de Base44. El SDK oficial `@base44/sdk` funciona sin cambios. Postgres (una base por app), login, archivos, IA (Claude), correo, funciones Deno, tiempo real y automatizaciones. | `sitios-web/api` |
| `templates/frontend-base44/` | Dockerfile + nginx para servir una app exportada de Base44 apuntando a `api`. | `sitios-web/<app>` |
| `wordpress/` | Plugin de inventario inmobiliario y notas de la plantilla WordPress. | `sitios-web/wordpress` |

## Cómo funciona la compatibilidad

Las apps exportadas de Base44 crean el cliente con `serverUrl: ''`, así que llaman a `/api/apps/<appId>/...` en su mismo dominio. El nginx de cada app reenvía `/api`, `/ws-user-apps` y las páginas `/login`, `/register`, `/forgot-password`, `/reset-password` a `api/t/<slug>/...`. No se modifica el código React.

Las funciones backend (`base44/functions/*/entry.ts`) corren en Deno, un proceso por app con sus secretos como variables de entorno. `createClientFromRequest(req)` y `asServiceRole` funcionan porque el backend envía los mismos headers que Base44 (`Base44-App-Id`, `Base44-Api-Url`, `Base44-Service-Authorization`).

## Soportado

- Entidades: `list/filter` (sort, limit, skip, fields, cursor, distinct), `get`, `create`, `update`, `delete`, `deleteMany`, `bulkCreate`, `bulkUpdate`, `updateMany`, `upsert`, `count`, `aggregate`, `subscribe`. Filtros: igualdad, `$in $nin $ne $gt $gte $lt $lte $regex $exists $all $size $not $or $and $nor`.
- RLS del esquema (`rls.read/create/update/delete`, `{{user.*}}`, `user_condition`).
- Auth: email/contraseña, registro con OTP por correo, recuperar contraseña, invitar usuario, `me/updateMe`, Google OAuth (por app), migración perezosa de contraseñas desde Base44 (`settings.base44_fallback_login`).
- Integraciones Core: `UploadFile`, `UploadPublicFile`, `UploadPrivateFile`, `CreateFileSignedUrl`, `InvokeLLM` (Claude, con `response_json_schema`, `file_urls`, búsqueda web), `ExtractDataFromUploadedFile`, `SendEmail` (Resend o SMTP), `GenerateImage` (OpenAI, opcional).
- Funciones Deno, automatizaciones por evento de entidad y cron (`settings.automations`).

Las integraciones Core exigen sesión, salvo las listadas en `settings.public_integrations` (por ejemplo `["InvokeLLM", "UploadFile"]` para formularios públicos).

## Pendiente

Agentes de IA de Base44 (`agents.*`), conectores OAuth de Base44 (`connectors.*`), pagos de Base44 (`payments.*`), `importEntities` (CSV).

## Variables de entorno del backend

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Postgres con permiso para crear bases (`postgres://usuario:clave@sitios-web_db:5432/postgres`) |
| `ADMIN_TOKEN` | Token de la API `/admin` |
| `PUBLIC_URL` | URL pública del backend (para URLs de archivos y Google OAuth) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | InvokeLLM / extracción (se puede definir por app en secrets) |
| `RESEND_API_KEY` o `SMTP_URL`, `MAIL_FROM` | Correo (también por app) |
| `OPENAI_API_KEY` | GenerateImage (opcional) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login con Google (también por app) |

## API de administración

Todas con `Authorization: Bearer $ADMIN_TOKEN`.

| Método y ruta | Uso |
|---|---|
| `POST /admin/tenants` | Crear app `{app_id, slug, name, settings}` (crea su base `app_<slug>`) |
| `GET /admin/tenants/:id` | Estado: esquemas, conteos, funciones, nombres de secretos |
| `PATCH /admin/tenants/:id` | `{name, settings, secrets, replace_secrets}` |
| `PUT /admin/tenants/:id/schemas` | `{schemas: [{name, schema}]}` (formato de `base44/entities/*.jsonc`) |
| `POST /admin/tenants/:id/records/:Entidad` | Importar registros conservando id y fechas |
| `POST /admin/tenants/:id/users` | Importar usuarios |
| `PUT /admin/tenants/:id/app-files` | `{files: {"functions/x/entry.ts": "..."}}` |
| `POST /admin/tenants/:id/files/import` | Descargar archivos de Base44 `{urls: [...]}` → mapa de URLs nuevas |
| `POST /admin/tenants/:id/rewrite-urls` | Reemplazar URLs viejas en los registros `{map}` |
| `POST /admin/tenants/:id/functions/:name/invoke` | Probar una función |

### `settings` por app

```json
{
  "app_url": "https://www.cliente.com",
  "requires_auth": false,
  "base44_fallback_login": true,
  "require_email_verification": true,
  "auth": { "password": true, "allow_signup": true, "google": true },
  "brand": { "name": "Cliente", "color": "#0f766e", "logo_url": "https://..." },
  "mail_from": "hola@cliente.com",
  "timezone": "America/Mexico_City",
  "public_integrations": ["InvokeLLM"],
  "automations": [
    { "type": "entity", "entity": "Workshop", "events": ["create", "update"], "function": "syncWorkshopToPg" },
    { "type": "cron", "cron": "0 8 * * *", "function": "dailyAdminSummary" }
  ]
}
```

## Desarrollo local de una app con vista previa (Claude Desktop)

En el repo de la app:

```bash
VITE_BASE44_APP_ID=<appId> VITE_BASE44_APP_BASE_URL=https://<api>/t/<slug> npm run dev
```

El plugin de Vite de Base44 reenvía `/api/apps` al backend; la vista previa del navegador integrado se actualiza sola al guardar.

## Pruebas

```bash
cd backend && npm install
BASE_URL=http://localhost:3100 ADMIN_TOKEN=... npm test   # usa el SDK oficial contra el servidor
```
