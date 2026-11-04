# lemoss.co

Sitio estático de Lemoss. El contenido y las páginas viven en `build.py`; los estilos en `assets/site.css`.

- Generar localmente: `python3 build.py` (sale en `dist/`).
- Despliegue: servicio Easypanel `sitios-web/lemoss` (Dockerfile en esta carpeta, construye y sirve con nginx).
- Agregar un artículo: añadir un elemento a `ARTICULOS` en `build.py` y redesplegar.
