# IAprop Base

Tema base de bloques (WordPress 6.9+) para los sitios que genera IAprop.tech. Fork de [Ollie](https://github.com/OllieWP/ollie) (GPL v3, Mike McAlister).

- `patterns/`: patrones genéricos de Ollie (hero, testimonios, FAQ, contacto, equipo, cifras, CTA, headers/footers) + patrones por arquetipo bajo `Categories: iaprop-base/<arquetipo>` y `iaprop-base/comunes`.
- `styles/colors/*.json` y `styles/typography/*.json`: variaciones combinables. El generador escribe una de cada por sitio con `backend/src/entrevista/tema.js`.
- Sin WooCommerce, sin precios, sin plugins requeridos.
