import { resolverSubtipo } from '../src/entrevista/subtipo.js';
const arqs = [
 {slug:'clinica', subtipos:{
   medica:{keywords:'clinic, medical', keywords_es:'clínica, consultorio, médico, doctor, pediatra, ginecólogo, consulta, salud, especialista, laboratorio, psicólogo, nutriólogo'},
   dental:{keywords:'dental, practice', keywords_es:'dentista, dental, odontólogo, ortodoncia, brackets, carillas, blanqueamiento, implantes, muelas, limpieza dental'},
   estetica_spa:{keywords:'spa, beauty, salon', keywords_es:'spa, estética, belleza, salón, masaje, facial, skincare, depilación, uñas, botox, cejas, pestañas, barbería'},
   veterinaria:{keywords:'clinic, veterinary', keywords_es:'veterinaria, veterinario, mascotas, perros, gatos, vacunas, estética canina, pet shop'}}},
 {slug:'generico', subtipos:{servicio_b2b:{keywords_es:'empresa, servicios, proveedor'}, servicio_local:{keywords_es:'local, servicio'}}},
];
const casos = [
 [{negocio:{arquetipo:'clinica', giro_texto:'Clínica de blanqueamiento y carillas en Mérida'}}, 'dental','inferido'],
 [{negocio:{arquetipo:'clinica', subtipo:'medica', giro_texto:'consultorio'}}, 'medica','ari'],
 [{negocio:{arquetipo:'clinica', subtipo:'medica', subtipo_confianza:'baja', giro_texto:'Estética canina y vacunas para perros'}}, 'veterinaria','inferido'],
 [{negocio:{arquetipo:'clinica', giro_texto:'Atendemos pacientes'}}, 'medica','default'],
 [{negocio:{arquetipo:'clinica', giro_texto:'xx'}, oferta:{items:[{nombre:'Masajes relajantes'},{nombre:'Depilación láser'}]}}, 'estetica_spa','inferido'],
 [{negocio:{arquetipo:'noexiste', giro_texto:'empresa proveedora'}}, 'servicio_b2b','inferido'],
];
let ok=0; for (const [b,s,f] of casos){ const r=resolverSubtipo(b,arqs); const pass=r.subtipo===s&&r.fuente===f; ok+=pass; console.log(pass?'OK ':'FAIL', b.negocio.giro_texto, '→', r.subtipo, r.fuente, JSON.stringify(r.puntajes)); }
console.log(ok+'/'+casos.length);
