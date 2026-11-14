# Opción L "Plataforma con efecto de cursor" (14-nov-2026)

Letra L (duodécima). Estructura de página de producto tipo plataforma: portada centrada con tarjeta de acción, marco grande con la **foto real del cliente** (sin video), explorador de funciones con fotos y textos de las diapositivas; el resto de la página es la general. Solo sale con `OPCION_L=1` en el servicio `api` o con `--solo L`; no cambia nada para los clientes actuales.

## Efecto de mouse del fondo (configurable)
| Efecto | Qué hace | Tecnología | Móvil |
|---|---|---|---|
| `puntos` | cuadrícula de puntos que se apartan del cursor | canvas 2D | fondo estático |
| `luz` | resplandor del color de la marca que sigue al cursor | CSS (variables) | fondo estático |
| `distorsion` | la foto de fondo se ondula bajo el cursor | WebGL (shader propio) | foto quieta |
| `tinta` | el cursor deja una estela que se disuelve | canvas 2D | fondo estático |

Orden de elección: `brief.marca.efecto_mouse` (por cliente) → variable `OPCION_L_EFECTO` (para todos) → giro (`EFECTO_POR_GIRO` en `generador/plataforma_l.js`) → `puntos`.
Giros: servicios/educación/genérico = puntos · clínica/oficios = luz · inmobiliaria/turismo = distorsión · tienda = tinta.
Para probar: `/p/<token>/L?efecto=tinta` (también `puntos`, `luz`, `distorsion`).

Reglas: sin JS, con "reducir movimiento" o en táctil/≤700 px no corre ningún efecto; se pausa fuera de pantalla y con la pestaña oculta; DPR máximo 2. `distorsion` necesita una segunda foto distinta; si no hay, cae a `luz`; si WebGL o la foto fallan (CORS), cae a `luz` sin error.

## Código
- `backend/src/generador/plataforma_l.js` — portada, explorador, CSS, JS (sin librerías externas; **no usa GSAP**, no depende de la licencia pendiente de la K).
- `propuestas_general.js` — layout `plataforma`, `conOpcionL()`, `LETRAS = 'ABCDEFGHIJKL'`.
- `herramientas/generar_l.mjs` — igual que generar_k (genera la L a un cliente existente).
- Letras A–L en chat, panel, dominios, revisión visual, correos y elección ("la duodécima", "la 12").
- Pruebas: `test/plataforma_l.test.mjs` (7).

## Verificación
- 7 pruebas nuevas pasan; suite completa 101/105: las 4 que fallan también fallan en la base (correo, SDK y requisito de redes, sin relación).
- Probado en Chrome real (headless): los 4 efectos corren sin errores de consola; sin canvas en móvil táctil ni con reducir movimiento; sin desborde horizontal a 390 px; explorador cambia de foto con el cursor.
- Pendiente: probar con un cliente real y con la revisión visual automática (necesita el servicio de render); no hay versión WordPress de la L (usa la composición de portada, como G–K).
