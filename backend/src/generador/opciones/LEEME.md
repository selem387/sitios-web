# Opciones de diseño

Cada opción de diseño vive en su propia carpeta dentro de este directorio. El registro (`registro.js`) las carga solas:
agregar una opción no requiere editar ningún archivo fuera de su carpeta.

## Agregar una opción

1. Crear la carpeta `backend/src/generador/opciones/<nombre>/` (el nombre interno, en minúsculas: `plataforma`, `vitrina`).
2. Dentro, un archivo `opcion.js` que exporte `opcion` (el contrato completo está al inicio de `registro.js`).
   Una opción nueva arma su página completa con `pagina(d, kit)` o `completa(ctx)`.
3. Su generador, su CSS, su script de movimiento y sus pruebas (`*.test.mjs`) van en esa misma carpeta.
4. La rama se llama `opcion/<nombre>`. La verificación automática rechaza el PR si toca archivos fuera de la carpeta.

## Reglas

- **Letra e índice**: los asigna Sebastián desde el chat designado (siguiente libre). El chat de la opción trabaja solo
  con el nombre interno. Una letra ya entregada a clientes no se cambia nunca.
- **Nada compartido se edita desde el chat de una opción**: plantilla general, kit, mapas por giro, reglas y letras se
  cambian solo desde el chat designado. Si la opción necesita algo de ahí, se reporta.
- **Una opción en el repositorio no le sale a ningún cliente por sí sola**: se genera a mano con
  `node src/herramientas/generar_opcion.mjs <letra o nombre> "<negocio o id>" [--aplicar]`.
- Las letras no se escriben a mano en ningún archivo: usar `letras.js` (patrones) o `registro.js` (tablas).

Decisiones completas: documento del proyecto `claude/reorganizacion-generadores-2026-11-15.md`.
