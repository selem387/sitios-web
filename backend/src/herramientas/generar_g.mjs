// Atajo que se conserva para no romper las instrucciones ya escritas. Equivale a:
//   node src/herramientas/generar_opcion.mjs G "<negocio o id>" [--aplicar]
process.argv.splice(2, 0, 'G');
await import('./generar_opcion.mjs');
