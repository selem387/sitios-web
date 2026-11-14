# Opción K — Recorrido en movimiento (GSAP)

Plantilla con titulares partidos, bandas de texto, cifras animadas, tarjetas apiladas y testimonios en horizontal. 15 giros (`fx/giros.json`), paleta flexible con contraste automático, tipografía Public Sans.

- Componentes reutilizables: `efectos_gsap.js` + `fx/` (`conEfectosGsap(html)` aplica los efectos a cualquier opción; activar con `EFECTOS_GSAP=1`).
- Plantilla: `plantilla_movimiento.js` (`renderPagina(giro)`).
- Pruebas: `backend/test/efectos_gsap.test.mjs`.

**Integración:** letra K, `OPCION_K=1`, `backend/src/herramientas/generar_k.mjs` (mismo uso que generar_j). Foto de portada real del cliente; el resto de la página es la general con efectos (`conEfectosK`).

**Licencia:** GSAP está permitido aquí (decisión de Sebastián, 14-nov-2026): no se publica un editor de animaciones; se ofrecen sitios a prospectos. La licencia solo restringe herramientas visuales de animación sin código que compitan con Webflow (https://gsap.com/standard-license/).
