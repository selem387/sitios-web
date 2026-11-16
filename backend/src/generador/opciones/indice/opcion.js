// Opción H "Recorrido con índice" (generador/indice.js). Titulares en letra sin remates.
import { METRICAS } from '../../tipo_color.js';

export const opcion = {
  nombre: 'indice', letra: 'H', indice: 7, titulo: 'Recorrido con índice',
  propia: true, sinWordPress: true,
  par: (pares, i) => pares.find((x) => METRICAS[x.titulos]?.clase === 'sans') || pares[i % pares.length],
  // Se mide con la portada quieta y los titulares ya puestos, no a medio recorrido.
  cssRevision: '.ix-escena{height:auto!important}.ix-escena .h-indice{position:relative!important;top:0!important;height:auto!important;min-height:min(100svh,920px)!important;padding:120px 0 220px!important}.ix-banda,.ix-tunel,.ix-lema,.ix-tj-marco,.ix-flot{display:none!important}.ix-escena .ix-ficha{display:grid!important}.ix-escena .ix-txt{padding-bottom:0!important}.ix-pw>span,.ix-desliza,.h-indice h1{transform:none!important}',
};
