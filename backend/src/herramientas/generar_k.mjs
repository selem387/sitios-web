// Atajo que se conserva para no romper las instrucciones ya escritas. Equivale a:
//   node src/herramientas/generar_opcion.mjs K "<negocio o id>" [--aplicar]
process.argv.splice(2, 0, 'K');
await import('./generar_opcion.mjs');
