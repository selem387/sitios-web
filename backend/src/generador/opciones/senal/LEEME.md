# Opción "Señal" (T)

Plantilla idéntica a su sitio modelo https://kaiju-fright-hub.base44.app/ (26-nov-2026).

- `senal.js`: arma la página con las mismas clases del modelo (Tailwind ya compilado) y los datos del cliente.
- `senal.css.js`: CSS del modelo reducido a las clases que usa `senal.js`. El verde va en `var(--ph)` y las letras en
  `--font-display` / `--font-body`.
- `modelo.css`: CSS compilado completo del modelo, tal como se descargó (fuente para regenerar `senal.css.js`).

## Si se agregan clases nuevas en `senal.js`

Volver a reducir `modelo.css` con PurgeCSS 6 tomando `senal.js` como contenido (extractor de clases con
`[A-Za-z0-9_\-:\/\[\]\.%(),#!>&=]`), cambiar `rgb(0 255 65/…)` y `#00ff41xx` por `var(--ph)` / `color-mix(…)`, quitar
`--font-heading/--font-body/--font-display` y conservar el bloque `:root{/*FOSFORO*//*LETRAS*/}` y los extras del final
(`.etq`, `summary`, `grid-cols-3`, `max-h-[38vh]`, `[overflow-wrap:anywhere]`, reducir movimiento). La prueba
`senal.test.mjs` revisa que el verde no quede fijo en el CSS.
