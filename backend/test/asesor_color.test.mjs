// Asesor de color (generador/asesor_color.js).
import { evaluarColoresCliente, opcionesTendencia, coherenciaFuentePaleta, asignarFuentes, dimensionesPaleta, nombreColor, contextoColorParaAri } from '../src/generador/asesor_color.js';
import { paresTipograficos } from '../src/generador/fuentes.js';
let ok = 0, n = 0;
const t = (c, m) => { n++; if (c) ok++; console.log(c ? 'OK  ' : 'FAIL', m); };
const B = (sub, arq, extra = {}) => ({ negocio: { arquetipo: arq, subtipo_resuelto: sub }, marca: { ...extra } });

const r1 = evaluarColoresCliente({ brief: B('restaurante', 'restaurante'), colores: ['#2B4FE0'] });
t(r1.hallazgos.some((h) => h.tipo === 'giro') && r1.corregidos?.length === 1, 'azul en comida: aviso + color sugerido');
const r2 = evaluarColoresCliente({ brief: B('lujo', 'tienda', { personalidad: ['elegante', 'exclusivo'] }), colores: ['#FF2D87'] });
t(r2.hallazgos.some((h) => h.tipo === 'personalidad'), 'neón con personalidad elegante: aviso de personalidad');
t(r2.hallazgos.every((h) => h.mensaje_cliente && h.por_que && h.fuente && h.sugerencias.length && h.sugerencias.every((s) => /^#[0-9A-F]{6}$/i.test(s.hex))), 'cada aviso trae mensaje, razón, fuente y sugerencia en hex');
t(evaluarColoresCliente({ brief: B('general', 'tienda'), colores: ['#D62828', '#2A9D3F'] }).hallazgos.some((h) => h.tipo === 'daltonismo'), 'rojo-verde de igual claridad: aviso de daltonismo');
t(evaluarColoresCliente({ brief: B('agencia_marketing', 'servicios'), colores: ['#FF0000', '#00FF66', '#2B4FE0', '#FFE600'] }).hallazgos.some((h) => h.tipo === 'exceso'), 'más de 3 colores: aviso');
t(evaluarColoresCliente({ brief: B('legal', 'servicios', { personalidad: ['serio'] }), colores: ['#1B2D4F', '#B08D57'] }).hallazgos.length === 0, 'colores correctos: sin avisos');
t(nombreColor('#2B4FE0') === 'azul' && nombreColor('#0B7A88') === 'verde azulado' && nombreColor('#C48E7C') === 'arcilla', 'nombres de color en español simple');
t(dimensionesPaleta(['#121212', '#C2A57A', '#F3F0EA']).includes('sofisticada'), 'negro + champaña = sofisticada');
t(coherenciaFuentePaleta({ titulos: 'Grandstander', cuerpo: 'Onest' }, ['#121212', '#C2A57A', '#F3F0EA']).puntaje === 0, 'letra juguetona con paleta de lujo: incoherente');
t(coherenciaFuentePaleta({ titulos: 'Bodoni Moda', cuerpo: 'Hanken Grotesk' }, ['#121212', '#C2A57A', '#F3F0EA']).puntaje > 0, 'didona con paleta de lujo: coherente');
const pares = paresTipograficos('divertido', {}, 18);
const asig = asignarFuentes([['#121212', '#C2A57A', '#F3F0EA'], ['#D6006F', '#F26B2A', '#FFF5EE']], pares);
t(asig.every((p) => p.coherencia.puntaje > 0) && asig[0].titulos !== asig[1].titulos, 'asignación coherente y sin repetir títulos');
const op = opcionesTendencia({ brief: B('cafeteria_panaderia', 'restaurante', { estilo: 'fresco' }), pares: paresTipograficos('fresco', {}, 18) });
t(op.length === 3 && op.some((o) => o.tendencia.length) && op.every((o) => o.letra_titulos), '3 opciones para B7, con tendencia y letra coherente');
t(/TENDENCIAS_PARA_OFRECER/.test(contextoColorParaAri({ brief: B('dental', 'clinica'), coloresCliente: [], pares })), 'contexto para Ari en B7');
console.log(`${ok}/${n}`);
if (ok !== n) process.exit(1);
