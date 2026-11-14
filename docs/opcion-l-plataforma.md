# Opción L "Plataforma" (14-nov-2026, reconstruida)

Reconstruida desde cero tomando como modelo **solo antigravity.google** (decisión de Sebastián: nada de ramas anteriores ni de otras opciones). Página completa y propia en `backend/src/generador/plataforma_l.js`; no usa la plantilla general. Sin librerías (CSS y un script propio). Letra L (duodécima, antes `reservada_l`). Sale solo con `OPCION_L=1` en el servicio `api`, o con `node src/herramientas/generar_l.mjs <id> --aplicar`.

## Modelo → cliente
| antigravity.google | Opción L |
|---|---|
| Barra blanca translúcida + aviso con insignia | Logo, secciones, botón WhatsApp + promoción u horario |
| Portada centrada: marca, titular 80 px, botón (tarjeta en celular) | Logo, titular, CTA; tarjeta de contacto en celular |
| Partículas que siguen al mouse | Efecto configurable: puntos, luz, distorsión, tinta |
| Marco negro grande con video y botón play | Video del cliente o sus fotos en secuencia, con pausa |
| Fila de íconos en arco + frase grande | Íconos en arco + frase del negocio (con su foto si mandó una) |
| Explorador de productos (texto / tarjeta) | Diapositivas o grupos de la oferta, cada uno con su foto |
| "Creado para…" + carrusel de casos | Su trabajo: carrusel de fotos con pie y liga a WhatsApp |
| Dos columnas desarrolladores / organizaciones | Agenda por WhatsApp / paquetes y precios |
| Carrusel del blog con miniaturas degradadas | Paquetes con precio, incluye y liga a WhatsApp |
| Tarjeta del boletín con temas en píldoras | Contacto: tema + nombre → abre WhatsApp con el mensaje |
| Bloque negro de descarga con partículas | Bloque final con el CTA |
| Pie con columnas y marca gigante | Secciones, contacto, nombre del negocio a todo lo ancho, redes |

Tipografía: Google Sans Flex (Google Fonts), la misma del modelo. Paleta casi monocroma como el modelo (tinta #121317, gris #45474D, superficie #F8F9FC) teñida levemente con la marca; el color de marca va en efectos y miniaturas.

## Efecto de mouse
Orden: `brief.marca.efecto_mouse` → `OPCION_L_EFECTO` → giro → puntos. Giros: servicios/educación/genérico = puntos; clínica/oficios = luz; inmobiliaria/turismo = distorsión; tienda = tinta. Prueba: `/p/<token>/L?efecto=tinta`. Sin JS, con reducir movimiento o en táctil no se anima (los puntos quedan dibujados quietos). Distorsión cae a luz sin foto, sin WebGL o si la foto falla.

## Verificación
- `test/plataforma_l.test.mjs` (8). Suite: 127/131; las 4 que fallan también fallan en `main`.
- Pruebas de M, N, O y P actualizadas: ya no esperan la L libre.
- Chrome real con los datos de Blanca Banderas: 4 efectos sin errores, sin desborde a 390 px, ninguna foto repetida.
- Pendiente: revisión visual automática (servicio render) y un cliente real en producción. Sin versión WordPress (usa la composición de portada).
