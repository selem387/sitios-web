# extractor-redes — datos, logo y fotos desde Facebook e Instagram

Servicio del proyecto Easypanel **sitios-web**. Lo usan la entrevista de Ari (backend) y el scraper de prospectos
(proyecto externo, que arma sitios sin preguntar). La inferencia de estilo va en otro microservicio.

## Endpoints (header `x-api-key: $EXTRACTOR_API_KEY` en `/v1/*`)
- `POST /v1/extracciones` `{facebook?, instagram?, referencia?, max_fotos?=18, captura?=true, forzar?}` → `202 {id, estado}`.
  Acepta ligas o `@usuario`. La misma liga en las últimas 24 h se reutiliza (no se paga dos veces).
- `GET /v1/extracciones/:id` → `{estado: pendiente|procesando|lista|sin_datos|error, resultado, error}`. Tarda 1–3 min.
- `GET /v1/gasto` → gasto del mes (Apify de toda la cuenta + otros registrados) contra el tope.
- `POST /v1/gasto` `{fuente:"google", usd, nota?}` → registra gasto de fuera de Apify (Google Places del scraper).
- `GET /files/<id>/<archivo>` → imágenes rehospedadas (las de Facebook/Instagram caducan).

`resultado`: `negocio{nombre, giro_texto, categorias, descripcion, ciudad, estado, direccion}`,
`contacto{telefono, whatsapp, email, sitio_web, horarios, redes}`, `oferta{servicios[], promocion_actual}`,
`confianza{calificacion, num_resenas, link_resenas}`, `logo`, `portada`, `capturas{facebook, instagram}`,
`fotos[]` (hasta 18: `{url, tipo, calidad, descripcion, orientacion, fuente}`, sin flyers, memes, capturas ni texto encima), `avisos[]`.

## Tope de gasto
`TOPE_USD` (20) es compartido con el scraper de prospectos: uso mensual de la cuenta de Apify + `gasto_scrapers`.
Si no alcanza, solo se lee la página pública (nombre, descripción e imagen).

## Variables
`EXTRACTOR_API_KEY` · `DATABASE_URL` (base `web_builder` del servicio `db`) · `APIFY_TOKEN` · `ANTHROPIC_API_KEY` ·
`PUBLIC_URL=https://extractor.timewins.ai` · `DATA_DIR=/data` (volumen) · `RENDER_URL` + `RENDER_API_KEY` (capturas) ·
`TOPE_USD=20` · opcionales: `EXTRACTOR_MODELO_VISION`, `MAX_PARALELO=2`, `FOTO_LADO_MIN=480`, `MAX_CANDIDATAS=45`.

En el backend: `EXTRACTOR_URL` (interna, `http://sitios-web_extractor-redes:8080`) y `EXTRACTOR_API_KEY`.
