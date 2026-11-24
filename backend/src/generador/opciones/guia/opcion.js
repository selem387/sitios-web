// Opción M "Guía en movimiento" (opciones/guia/guia.js), reconstruida solo a partir de brand.docusign.com.
// Anillo 3D de tarjetas con las fotos del cliente, forma con fotos que cambian ("Sobre"), filas de palabras,
// bloque de color y bloque final hacia WhatsApp. GSAP + ScrollTrigger + Lenis desde CDN, con su runtime propio.
import { parGuia, CSS_REVISION_GUIA, anilloGuiaHTML, formaGuiaHTML, apiladasGuiaHTML, colorGuiaHTML, siguienteGuiaHTML, menuGuiaHTML, CSS_GUIA, JS_GUIA, HEAD_GUIA } from './guia.js';
import { esc, giroCorto, logoHTML } from '../../kit/utiles.js';
import { mezclar } from '../../../entrevista/tema.js';
import { tono, conContraste } from '../../kit/color.js';
import { comoSeccion } from '../../giros/index.js';

const frasesDe = (txt) => String(txt || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=\S)/).filter(Boolean);
// Lista que gira en la tarjeta de frase: los grupos de servicios (si hay 3 o más) o los titulares de las diapositivas.
const listaDe = ({ grupos, diapos }) => (grupos.length >= 3 ? grupos.map((g) => g.nombre) : diapos.map((x) => x?.titular)).filter(Boolean);

export const opcion = {
  nombre: 'guia', letra: 'M', indice: 12, titulo: 'Guía en movimiento',
  // Plantilla hecha a partir de un sitio modelo externo: las reglas duras no le aplican (decisión de Sebastián, 24-nov-2026).
  modelo: 'https://brand.docusign.com/',
  // Material con el que se ve completa (verificado el 17 y 18-nov-2026; doc claude/etapa2-mapa-por-giro-propuesta.md).
  requisitos: { fotosTotal: 3 },
  // Como el modelo: portada casi negra con el color de la marca, interiores en tono crudo y bloque claro del color de la marca.
  paleta: ({ base, papel, tinta }) => ({ bg: mezclar(papel, '#F8F3F0', 0.65), fg: tinta, primary: base, muted: mezclar(base, '#FFFFFF', 0.74), banda: conContraste(tono(base, 0.1, 0.55, 1), '#FFFFFF', 13) }),
  propia: true, sinWordPress: true,
  par: (pares) => parGuia(pares),
  cssRevision: CSS_REVISION_GUIA,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // Anillo con todas las fotos de trabajo (pueden repetirse en "Nuestro trabajo"). Las tarjetas llevan a las secciones,
    // así que el anillo se arma al final (final), cuando ya se conocen; aquí solo se reservan sus fotos.
    portada: (c) => {
      const { mat, usadas, heroFoto, poolSl, fotosT, buenaFoto, enPortada } = c;
      const vistos = new Set();
      const tarjetas = [heroFoto, ...poolSl, ...fotosT.filter(buenaFoto)].filter((x) => x?.url && !vistos.has(x.url) && vistos.add(x.url)).slice(0, 22);
      tarjetas.forEach((x) => { enPortada.add(x.url); usadas.add(x.url); });
      const video = mat.videos?.[0] || null;
      if (video) { enPortada.add(video.url); usadas.add(video.url); }
      c.guM = { tarjetas, video };
      return '<!--GU-ANILLO-->';
    },
    // "Sobre" con la forma del modelo (fotos del dueño, equipo u otras que no estén en la portada; si no hay, el de siempre),
    // filas de palabras con lo que distingue al negocio y bloque de color con su diferenciador.
    secciones: (c, s) => {
      const { t, mat, brief, usadas, img, conf, fund, fueraDeGaleria, T } = c;
      const { secTrabajo, secServicios, secSobre, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto } = s;
      const libres = () => [mat.fundador, ...mat.equipo, ...(mat.otras || [])].filter((x, k, a) => x?.url && fueraDeGaleria(x) && /^(foto|imagen)/.test(x.tipo || 'foto') && !usadas.has(x.url) && a.findIndex((y) => y?.url === x.url) === k);
      const forma = comoSeccion('sobre', () => {
        const fotos = libres().slice(0, 6);
        if (!fotos.length) return secSobre();
        const fr = frasesDe(t.sobre || conf.historia_corta || '');
        const mitad = Math.ceil(fr.length / 2);
        const cred = (fund.credenciales || []).map((x) => esc(x)).join(' · ');
        const cifras = (conf.cifras || []).slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('');
        const extra = `${fund.nombre ? `<p class="firma"><b>${esc(fund.nombre)}</b>${fund.rol ? ` · ${esc(fund.rol)}` : ''}</p>` : ''}${cred ? `<p class="cred">${cred}</p>` : ''}${cifras ? `<ul class="cifras">${cifras}</ul>` : ''}`;
        return formaGuiaHTML({ fotos, titulo: T.sobre, textoA: fr.slice(0, mitad).join(' '), textoB: fr.slice(mitad).join(' '), extra, img });
      });
      const apiladas = () => apiladasGuiaHTML({ titulo: 'Lo que nos distingue', palabras: (t.info?.length >= 2 ? t.info : listaDe(c)).slice(0, 4) });
      const color = () => {
        const fr = frasesDe(brief.oferta?.diferenciador || '');
        const a = fr[0] || t.subtitulo || '';
        const b = fr.slice(1).join(' ') || (fr[0] ? t.subtitulo : '');
        const l = libres();
        return colorGuiaHTML({ fraseA: a, fraseB: b !== a ? b : '', foto: l[0] || null, pops: l.slice(1, 3), img });
      };
      return [forma, apiladas, secTrabajo, secServicios, color, secEquipo, secResenas, secProceso, secFaq, secVideo, secContacto];
    },
    claseHtml: 'fx-hover',
    css: CSS_GUIA,
    head: () => HEAD_GUIA,
    // Dos logos: claro sobre la portada oscura y oscuro sobre los interiores.
    logo: (c) => `<span class="logo-claro">${c.logoBarra}</span><span class="logo-osc">${logoHTML(c.mat.logo, c.p.banda, '#FFFFFF', { alt: c.d.nombre })}</span>`,
    trasBarra: (c, { navs }) => menuGuiaHTML(navs, c.cta()),
    cierre: (c) => siguienteGuiaHTML({ numero: String(c.navs.length + 1).padStart(2, '0'), texto: c.t.cta, href: c.wa }),
    js: () => JS_GUIA,
    final: (html, c) => {
      const { d, t, neg, grupos, cta, img, navs, guM } = c;
      return html.replace('<!--GU-ANILLO-->', anilloGuiaHTML({ tarjetas: guM.tarjetas, destinos: navs, frase: grupos.length >= 3 ? 'Te ayudamos con' : d.nombre, lista: listaDe(c), titular: t.titular, subtitulo: t.subtitulo, kicker: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), cta: cta(), video: guM.video, img }));
    },
  },
};
