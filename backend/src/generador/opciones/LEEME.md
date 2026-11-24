# Opciones de diseño

Cada opción de diseño vive en su propia carpeta dentro de este directorio. El registro (`registro.js`) las carga solas:
agregar una opción no requiere editar ningún archivo fuera de su carpeta.

## Agregar una opción

1. Crear la carpeta `backend/src/generador/opciones/<nombre>/` (el nombre interno, en minúsculas: `plataforma`, `vitrina`).
2. Dentro, un archivo `opcion.js` que exporte `opcion` (el contrato completo está al inicio de `registro.js`).
3. Su generador, su CSS, su script de movimiento y sus pruebas (`*.test.mjs`) van en esa misma carpeta.
4. La rama se llama `opcion/<nombre>`. La verificación automática rechaza el PR si toca archivos fuera de la carpeta.

## Criterios que toda opción debe cumplir (aprobados por Sebastián, 16 y 18-nov-2026)

Las pruebas de `backend/test/criterios.test.mjs` vigilan los que se pueden medir; una opción que no los cumple no pasa
la verificación de GitHub.

1. **Secciones y orden del giro.** Usa las secciones del kit (`backend/src/generador/kit/secciones.js`) en el orden y
   con los nombres del mapa del giro del cliente (`backend/src/generador/giros/<giro>.js`). La plantilla general las
   ordena sola con ese mapa. Puede intercalar piezas propias entre secciones, sin reemplazar ni mover ninguna; si una
   pieza propia es su versión de una sección del kit, se marca con `comoSeccion('<sección>', fn)` para que viaje con
   ella. *(Prueba: el orden de las secciones sigue el mapa en todos los giros.)*
2. **Página propia (excepción).** Si la opción arma su página entera (`pagina`, `completa` o
   `plantilla.paginaCompleta`), sigue su propio orden, pero toma los nombres del giro y no deja fuera ninguna sección
   para la que el cliente tiene material. La excepción la aprueba Sebastián y se declara con `ordenPropio: true` en su
   `opcion.js`. *(Prueba: toda página propia declara `ordenPropio`.)*
3. **Requisitos declarados.** `requisitos` en su `opcion.js`: cuánto material necesita para verse completa
   (`fotosTrabajo`, `fotoBuena`, `fotosTotal`, `logo`, `servicios`, `grupos`, `productos`, `producto`, `secciones`),
   verificado generándola con material real recortado. Sin esa declaración no entra a ninguna lista.
   *(Prueba: toda opción declara requisitos con claves conocidas.)*
4. **Elementos ilustrativos.** Debe verse bien cuando el material que le falta se llena con elementos ilustrativos
   (`backend/src/generador/ilustrativas.js`): fotos con la marca "Imagen ilustrativa", servicios o productos "Ejemplo
   ilustrativo" sin precio, logo hecho con las letras del nombre. Nunca desplazan material del cliente, nunca llevan
   precio ni un texto que las presente como trabajo del cliente. *(Prueba: con material mínimo, cada giro recibe las
   primeras 6 de su lista sin que ninguna falle.)*
5. **Entrada a las listas por giro.** Después de las dos aprobaciones de Sebastián (1ª: demo de diseño con datos
   inventados; 2ª: la misma opción generada con los datos de un cliente real) se decide en qué giros entra y en qué
   lugar. Las listas (`backend/src/generador/giros/<giro>.js`) son compartidas: solo las cambia el chat designado, nunca
   el chat de una opción.
6. **Reglas duras** (color, tipografía, fotos del cliente, todo visible sin JavaScript, etc.) sin excepción; las de
   diseño, solo con excepción declarada y aprobada. **Excepción (Sebastián, 24-nov-2026): las reglas duras no aplican a
   las plantillas**, es decir, a las opciones hechas a partir de un sitio modelo externo (H, I, J, K, L, M, N, O, P, Q, R
   y S). Se declaran con `modelo: '<sitio>'` en su `opcion.js`; la revisión visual solo las detiene por fallas técnicas
   (fotos que no cargan o deformadas, página que se sale de la pantalla, botones cortados, franjas negras, letras que no
   cargan) y no les aplica correcciones de estilo. Las reglas siguen aplicando a las opciones propias (hoy la G).
7. **Librerías** solo desde el propio servidor (`backend/src/generador/librerias.js`), con versión fija; nunca desde un
   CDN. *(Prueba: ningún archivo de una opción carga de un CDN.)*
8. **CSS en su carpeta.** Todo el CSS de la opción va en su carpeta: `plantilla.css` (al final del `<style>`) o
   `plantilla.cssBase` (`portada`, `galeria`, `ancho`) si necesita un lugar fijo del `<style>` general. Ninguna página
   lleva CSS de otra opción. *(Prueba: el CSS de cada opción solo sale en su página.)*

## Reglas de trabajo

- **Letra e índice**: los asigna Sebastián desde el chat designado (siguiente libre). El chat de la opción trabaja solo
  con el nombre interno. Una letra ya entregada a clientes no se cambia nunca.
- **Nada compartido se edita desde el chat de una opción**: plantilla general, kit, mapas y listas por giro, reglas y
  letras se cambian solo desde el chat designado. Si la opción necesita algo de ahí, se reporta.
- **Una opción en el repositorio no le sale a ningún cliente por sí sola**: sale cuando entra a la lista de un giro
  (criterio 5); antes se genera a mano con
  `node src/herramientas/generar_opcion.mjs <letra o nombre> "<negocio o id>" [--aplicar]`.
- Las letras no se escriben a mano en ningún archivo: usar `letras.js` (patrones) o `registro.js` (tablas).
- Una opción no importa nada de la carpeta de otra opción (una prueba lo vigila). Lo que sirva a varias va en
  `backend/src/generador/kit/`.

Decisiones completas: documentos del proyecto `claude/reorganizacion-generadores-2026-11-15.md`,
`claude/etapa2-mapa-por-giro-propuesta.md` y `claude/material-faltante-imagenes-ilustrativas.md`.
