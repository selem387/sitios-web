// Atajo que se conserva para no romper las instrucciones ya escritas. Equivale a:
//   node src/herramientas/generar_opcion.mjs M "<negocio o id>" [--aplicar]
process.argv.splice(2, 0, 'M');
await import('./generar_opcion.mjs');
