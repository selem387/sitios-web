// Opción N "Avance en el espacio" (generador/opciones/avance/avance.js).
import { parAvance, CSS_REVISION_AVANCE } from './avance.js';
import { esc, giroCorto, agruparOferta, redes } from '../../kit/utiles.js';
import { portadaN, franjaN, vitrinaN, avanceN, tarjetasN, prensaN, contactoN, datosDe, fraseResaltada, CSS_AVANCE, JS_AVANCE, URL_MONO_N } from './avance.js';
import { direccionTexto, testimoniosValidos } from '../../datos_brief.js';
import { enlacesRedes } from '../../iconos_redes.js';

export const opcion = {
  nombre: 'avance', letra: 'N', indice: 13, titulo: 'Avance en el espacio',
  // N: neutros de la referencia (crema, grafito, arena); el acento es el color del cliente.
  // Colores de la opción a partir de los del cliente (la plantilla general completa el resto de la paleta).
  paleta: ({ base }) => ({ bg: '#FDFCF4', fg: '#2A2C2F', primary: base, muted: '#ECE8E3', banda: '#2A2C2F' }),
  propia: true, sinWordPress: true,
  par: (pares) => parAvance(pares),
  cssRevision: CSS_REVISION_AVANCE,
  // Abre con la foto principal del cliente.
  conFotoPrincipal: true,
  // Cómo se arma con la plantilla general (propuestas_general.js, función pagina): c es el contexto de la página.
  plantilla: {
    // N (vastspace.com): fotos del slider a pantalla completa con fundido, pausa y titular abajo a la izquierda.
    portada: (c) => {
      const { t, mat, usadas, img, heroFoto, cta, poolSl, enPortada } = c;
      const armar = () => {
        // Si la foto principal es la de la fundadora, va en "Sobre mí" y la portada usa las fotos de trabajo.
        const otras = poolSl.filter((x) => x?.url && x.url !== heroFoto?.url);
        const fP = heroFoto && (heroFoto.tipo === 'foto_fundador' || heroFoto.url === mat.fundador?.url) && otras.length ? otras : [heroFoto, ...otras];
        const n = portadaN({ fotos: fP, img, titular: t.titular, subtitulo: t.subtitulo, cta: cta(), verMas: '#trabajo' });
        n.urls.forEach((u) => { enPortada.add(u); usadas.add(u); });
        return n.html;
      };
      return armar();
    },
    secciones: (c, s) => {
      const { d, t, mat, brief, usadas, img, wa, neg, conf, fueraDeGaleria, fotosT, cta, enPortada, T } = c;
      const { secSobre, secEquipo, secProceso, secFaq, secVideo } = s;
      // N: secciones propias (generador/opciones/avance/avance.js). Solo datos reales; si falta el dato, la sección no aparece.
      const libreVx = (x) => x?.url && !usadas.has(x.url) && !enPortada.has(x.url);
      const franjaVx = () => franjaN(fraseResaltada(t.sobre || conf.historia_corta || brief.oferta?.diferenciador || ''));
      const vitrinaVx = () => {
        const rec = (mat.fotos || []).find((x) => x.recorte && libreVx(x));
        const foto = rec || fotosT.find(libreVx) || null;
        return vitrinaN({ foto, img, recorte: !!rec, nombre: d.nombre, etiqueta: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), apoyo: brief.oferta?.diferenciador || '', datos: datosDe(conf.cifras), href: '#servicios' });
      };
      const avanceVx = () => avanceN({ titulo: T.trabajo, img, nota: [giroCorto(neg.giro_texto), neg.ciudad].filter(Boolean).join(' · '), fotos: fotosT.filter(libreVx).map((foto) => ({ foto, texto: '' })) }).html;
      const tarjetasVx = () => {
        const ver = brief.oferta?.mostrar_precios !== false || brief.oferta?.mostrar_paquetes;
        const items = agruparOferta(brief.oferta?.items || []).flatMap((g) => g.opciones.map((o) => ({ meta: [String(g.nombre).replace(/\p{Extended_Pictographic}|\uFE0F/gu, '').trim(), ...(ver && o.precio ? [o.precio] : [])].filter((x, k, a) => x && a.indexOf(x) === k), titulo: o.nombre || g.nombre, texto: String(o.detalle || '').split(/\n\s*\n/)[0].trim() })));
        const sobra = [...mat.local, ...(mat.otras || []), ...mat.trabajos].filter((x) => libreVx(x) && fueraDeGaleria(x));
        items.forEach((it, k) => { if (sobra[k]) it.foto = sobra[k]; });
        return tarjetasN({ titulo: T.servicios, items, img, cta: cta() });
      };
      const prensaVx = () => {
        const limpio = (x) => String(x).replace(/\p{Extended_Pictographic}/gu, '').trim();
        const citas = testimoniosValidos(brief, mat).map((x) => ({ texto: limpio(x.texto), autor: x.nombre || '' }));
        const nombres = [...new Set([...(conf.premios || []), ...(conf.certificaciones || [])].map((x) => String(x || '').trim()).filter(Boolean))];
        return prensaN({ titulo: T.resenas, citas, nombres, tituloNombres: 'Reconocimientos' });
      };
      const contactoVx = () => {
        const c = brief.contacto || {};
        const dir = direccionTexto(brief) || (brief.zona?.cobertura || []).join(' · ');
        const rs = enlacesRedes(redes(c));
        return contactoN({ titulo: T.contacto, cta: cta(), columnas: [
          { titulo: 'WhatsApp', html: d.tel ? `<a${wa}>${esc(d.tel)}</a>` : '' },
          { titulo: 'Dónde', html: dir ? `<span>${esc(dir)}</span>` : '' },
          { titulo: 'Horario', html: typeof c.horarios === 'string' ? `<span>${esc(c.horarios)}</span>` : '' },
          { titulo: 'Correo', html: c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '' },
          { titulo: 'Redes', html: rs ? `<span class="rs">${rs}</span>` : '' },
        ] });
      };
      return [franjaVx, vitrinaVx, avanceVx, tarjetasVx, secSobre, secEquipo, prensaVx, secProceso, secFaq, secVideo, contactoVx];
    },
    claseHtml: 'fx-hover',
    css: CSS_AVANCE,
    // N: letra mono de etiquetas (Geist Mono) y script propio (GSAP + ScrollTrigger + Lenis, como la referencia).
    final: (html) => html.replace('</head>', `<link rel="stylesheet" href="${URL_MONO_N}"></head>`).replace(/<\/body>(?![\s\S]*<\/body>)/, `${JS_AVANCE}</body>`),
  },
};
