// Atajo que se conserva para no romper las instrucciones ya escritas. Equivale a:
//   node src/herramientas/generar_opcion.mjs P "<negocio o id>" [--aplicar]
process.argv.splice(2, 0, 'P');
await import('./generar_opcion.mjs');
