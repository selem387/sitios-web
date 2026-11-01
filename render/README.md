# render — mockups y capturas (Chromium headless)

Servicio del proyecto Easypanel **sitios-web**. Genera las 3 opciones visuales del bloque B7 de la entrevista
(primera pantalla del negocio del cliente por estilo) y capturas de sitios publicados para el QA.

## Endpoints (header `x-api-key: $RENDER_API_KEY` en `/v1/*`)
- `GET /health`
- `POST /v1/mockups` → `{opciones:[{etiqueta, estilo, nombre, url}], ms}`
  Cuerpo: `{comun:{negocio:{nombre,giro_texto,ciudad}, titular, subtitulo, cta, prueba, servicios[], subtipo:{paleta}, colores_marca[], foto_url}, opciones:[{etiqueta:"A", estilo:{slug,tipografia,theme_json_hints}, subtipo?, foto_url?}]}`
  `estilo` = fila de `diseno_estilos`; `subtipo` = `arquetipos.diseno->subtipos->X`.
- `POST /v1/mockup` → uno solo (`?formato=png` devuelve la imagen).
- `POST /v1/mockup/html` → el HTML sin capturar (para ajustar plantillas).
- `POST /v1/captura` `{url, ancho?:390|1280, completa?:bool}` → `{url, nombre, ms}`.
- `POST /v1/auditar` `{url, desktop?, sin_lighthouse?, sin_impeccable?}` → `{lighthouse:{puntajes, metricas, fallos}, impeccable:{hallazgos, resumen}, propio:{checks, captura}, p0[], publicable}`. P0: rendimiento móvil < 75, accesibilidad < 90, sin WhatsApp/teléfono, H1 ≠ 1, Inter/Roboto/Arial visibles.
- `POST /v1/estudiar` `{url}` → dirección de diseño de una liga de referencia (tipografía por rol, fondo/acentos, radio de botones, densidad, secuencia de secciones, hero, versión móvil) + `resumen` en una frase. Inspiración declarada; nunca clona marcado ni copy.
- `GET /files/:nombre.png` → público (nombres no adivinables, se borran a los `RETENCION_DIAS`).

Layouts por estilo: minimalista/tradicional = centrado · elegante/lujo = editorial (foto a sangre) ·
fresco/divertido = bloques · calido = tarjeta · tecnologico = bento. La foto del cliente se incrusta como data URI.

## Variables
`RENDER_API_KEY` (obligatoria) · `PUBLIC_URL` (dominio público, para las URLs de `/files`) · `DATA_DIR=/data` (volumen) ·
`MAX_PARALELO=2` · `RETENCION_DIAS=30` · `PORT=8080`.

## Local
```
npm install && npx playwright install chromium
RENDER_API_KEY=t PUBLIC_URL=http://localhost:8080 DATA_DIR=/tmp/render node src/index.js
```
