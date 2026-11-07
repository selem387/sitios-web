# Tendencias de efectos para imágenes y video — noviembre 2026

Se repasa cada mes con una tarea programada (día 2 de cada mes, 8:43 hora de Ciudad de México). Cada repaso agrega una sección nueva arriba con fecha, lo que cambió y qué se propuso en el código (pull request para aprobar).

## Hallazgos (6-nov-2026)
- Animaciones ligadas al scroll con CSS (scroll-driven, `animation-timeline: view()`): ya funcionan en Chrome 115+, Firefox 133+ y Safari 18.2+; reemplazan JavaScript de scroll. Safari tiene detalles con `animation-range`.
- Revelados al hacer scroll y máscaras (clip-path, formas orgánicas) siguen en tendencia para contenedores de fotos.
- Transiciones fluidas entre escenas (acercamientos continuos, "match cuts", morphing) en motion design.
- Texturas táctiles: grano, tipografía con textura, "cyberbrutalismo" controlado; vidrio esmerilado usado con mesura.
- Tipografía cinética: titulares que cambian o entran en secuencia para presentar varios beneficios.
- Profundidad espacial: paralaje y transformaciones 3D al pasar el cursor, con mesura en celular.
- 3D interactivo y WebGL: solo como punto focal y con carga diferida (no se adopta por peso).
- Precauciones: backdrop-filter y paralaje complejo afectan Core Web Vitals en Android; video de portada sin optimizar retrasa el LCP; siempre alternativa con prefers-reduced-motion.

## Aplicado en las propuestas (commit b529c07, archivo backend/src/generador/movimiento.js)
Combinación distinta por propuesta (efectosDe):
- A: transición con acercamiento + grano + revelado con máscara
- B: transición cortina + aparición con acercamiento + color al pasar el cursor
- C: transición con acercamiento + profundidad al hacer scroll + texto en secuencia
- D: transición cortina + revelado con máscara + texto en secuencia
- E: transición con acercamiento + grano + profundidad + color al pasar el cursor
- F: transición cortina + aparición con acercamiento + texto en secuencia
Lighthouse móvil en prueba: 97 (A) y 99 (B); accesibilidad 100.

## Descartado por ahora
- 3D/WebGL en portada (peso y LCP), backdrop-filter amplio, scroll-jacking.

## Fuentes
- https://studiomeyer.io/en/blog/webdesign-trends-2026
- https://store.muz.li/articles/landing-page-design-trends-2026
- https://lummi.ai/blog/animation-trends-2026
- https://line25.com/articles/web-design-trends-2026/
- https://blog.codercops.com/blog/css-view-transitions-scroll-animations-2026
- https://www.jacobtyler.com/blog/tag/page-speed/
