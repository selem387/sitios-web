// Secciones comunes de la plantilla general (16-nov-2026). Cada opción las ordena y puede reemplazar cualquiera por la suya.
// No conocen ninguna opción: reciben el contexto de la página (c) y devuelven HTML.
import { esc, pasoHTML, parrafosHTML, detalleHTML, redes } from './utiles.js';
import { direccionTexto, testimoniosValidos } from '../datos_brief.js';
import { enlacesRedes } from '../iconos_redes.js';

/** c: contexto de la página (ver pagina() en propuestas_general.js). Se llama después de armar la portada. */
export function seccionesComunes(c) {
  const { d, t, mat, brief, usadas, img, wa, figTr, conf, fund, ub, fueraDeGaleria, fotosT, poolSl, enPortada, cta, T, grupos, mostrarPrecios } = c;
  // "Nuestro trabajo" (10-nov-2026, decisión de Sebastián): lleva SIEMPRE todas las fotos de trabajo, aunque estén en el
  // slider (única excepción a "ninguna foto se repite"), y nunca menos de 5: si faltan, se suman otras fotos del cliente.
  // Solo se excluyen las que ya salieron fuera del slider (filas o mosaicos de la portada) para no duplicarlas.
  const enSlider = new Set(poolSl.map((x) => x.url));
  // Fotos de "Nuestro trabajo" (las mismas que usa secTrabajo); una opción puede armar su propia sección con ellas.
  const listaTrabajo = () => {
    const libreT = (x) => !usadas.has(x.url) || enSlider.has(x.url) || enPortada.has(x.url);
    const resto = fotosT.filter(libreT);
    // Las que el cliente pidió aquí entran siempre (aunque sean de equipo u otras), al principio del carrusel.
    for (const x of ub.fotos.filter((y) => ub.trabajo.has(y.url)).reverse()) if (!resto.some((y) => y.url === x.url) && libreT(x)) resto.unshift(x);
    for (const x of [...mat.equipo, ...(mat.otras || []), ...poolSl]) {
      if (resto.length >= 5) break;
      if (x?.url && fueraDeGaleria(x) && /^(foto|imagen)/.test(x.tipo || 'foto') && !resto.some((y) => y.url === x.url) && libreT(x)) resto.push(x);
    }
    return resto;
  };
  const secTrabajo = () => {
    const resto = listaTrabajo();
    if (!resto.length) return '';
    // Carrusel horizontal (10-nov-2026, pedido de Sebastián): todas las fotos una al lado de la otra, misma altura, se
    // desliza con el dedo o con las flechas; cada foto lleva "+ info" que abre WhatsApp con la liga de esa foto.
    return `<section class="sec" id="trabajo"><div class="wrap"><div class="tr-cab"><h2>${esc(T.trabajo)}</h2><div class="tr-nav"><button type="button" class="tr-b tr-ant" aria-label="Fotos anteriores">&#8249;</button><button type="button" class="tr-b tr-sig" aria-label="Más fotos">&#8250;</button></div></div><div class="galeria g-car" tabindex="0" aria-label="${esc(T.trabajo)}">${resto.map(figTr).join('')}</div></div></section>`;
  };
  const secServicios = () => {
    if (!grupos.length && !mat.catalogos.length && !mat.documentos.length) return '';
    // Servicios con varios paquetes (y cantidades distintas): título con línea divisoria por servicio
    // y debajo una rejilla con un cuadro por paquete. Si cada servicio es uno solo, un cuadro por servicio.
    const conPaquetes = grupos.some((g) => g.opciones.length > 1);
    const hN = conPaquetes ? 'h4' : 'h3'; // dentro de un servicio con título, cada paquete es un nivel abajo
    const cuadro = (o, titulo = null) => `<article class="paq"><div class="paq-cab">${titulo || o.nombre ? `<${hN}>${esc(titulo || o.nombre)}</${hN}>` : ''}${mostrarPrecios && o.precio ? `<em>${esc(o.precio)}</em>` : ''}</div>${titulo && o.nombre ? `<b class="paq-op">${esc(o.nombre)}</b>` : ''}${o.detalle ? `<div class="paq-det">${detalleHTML(o.detalle)}</div>` : ''}</article>`;
    const cards = conPaquetes
      ? grupos.map((g) => `<div class="paq-grupo"><h3 class="grupo-t">${esc(g.nombre)}</h3><div class="paqs">${g.opciones.map((o) => cuadro(o)).join('')}</div></div>`).join('')
      : grupos.map((g) => (g.opciones.length === 1 ? cuadro(g.opciones[0], g.nombre) : '')).join('');
    const cat = mat.catalogos.map((x) => `<a class="catimg" href="${esc(x.url)}" target="_blank" rel="noopener">${img(x)}</a>`).join('');
    const docs = mat.documentos.map((x) => `<a class="doc" href="${esc(x.url)}" target="_blank" rel="noopener">Ver ${esc(/pdf/i.test(x.url) ? 'catálogo (PDF)' : x.alt || 'documento')}</a>`).join('');
    for (const x of mat.documentos) usadas.add(x.url);
    // Intro, frase de cierre y texto del botón de esta sección los puede fijar el cliente por chat (10-nov-2026).
    const btnServ = t.servicios_boton ? `<a class="btn"${wa}>${esc(t.servicios_boton)}</a>` : cta();
    return `<section class="sec" id="servicios"><div class="wrap"><h2>${esc(T.servicios)}</h2>${t.servicios_intro ? `<p class="sec-intro">${esc(t.servicios_intro)}</p>` : ''}${cards ? (conPaquetes ? cards : `<div class="paqs">${cards}</div>`) : ''}${cat ? `<div class="cats">${cat}</div>` : ''}${docs}<div class="centro">${t.servicios_cierre ? `<p class="sec-cierre">${esc(t.servicios_cierre)}</p>` : ''}${btnServ}</div></div></section>`;
  };
  const secSobre = () => {
    const otra = mat.equipo.find((x) => x.tipo === 'foto_fundador' && !usadas.has(x.url) && fueraDeGaleria(x));
    // Si su foto ya está en la portada, aquí va otra suya o ninguna (nunca la misma dos veces).
    const fund0 = mat.fundador && fueraDeGaleria(mat.fundador) ? mat.fundador : null;
    const foto = fund0 && usadas.has(fund0.url) ? (otra || null) : (fund0 || otra || null);
    if (!foto && !conf.historia_corta) return '';
    const cifras = (conf.cifras || []).slice(0, 3).map((c) => `<li>${esc(c)}</li>`).join('');
    const cred = (fund.credenciales || []).map((c) => esc(c)).join(' · ');
    return `<section class="sec sobre" id="sobre"><div class="wrap s-in${foto ? '' : ' sin-foto'}">${foto ? `<figure class="retrato">${img(foto)}</figure>` : ''}<div><h2>${esc(T.sobre)}</h2>${fund.nombre ? `<p class="firma">${esc(fund.nombre)}${fund.rol ? ` · ${esc(fund.rol)}` : ''}</p>` : ''}<div class="historias">${parrafosHTML(t.sobre || conf.historia_corta || '', 'historia')}</div>${cred ? `<p class="cred">${cred}</p>` : ''}${cifras ? `<ul class="cifras">${cifras}</ul>` : ''}</div></div></section>`;
  };
  const secEquipo = () => { const eq = mat.equipo.filter((x) => !usadas.has(x.url) && fueraDeGaleria(x) && !ub.trabajo.has(x.url)); return eq.length ? `<div class="wrap"><div class="galeria g-eq">${eq.map((x) => `<figure>${img(x)}</figure>`).join('')}</div></div>` : ''; };
  const secResenas = () => {
    const tes = testimoniosValidos(brief, mat);
    if (!tes.length && !mat.resenas.length) return '';
    const limpio = (s) => String(s).replace(/\p{Extended_Pictographic}/gu, '').trim();
    const cards = tes.map((x) => `<blockquote><p>${esc(limpio(x.texto))}</p>${x.nombre ? `<cite>${esc(x.nombre)}</cite>` : ''}</blockquote>`).join('');
    const caps = mat.resenas.map((x) => `<figure class="cap">${img(x)}</figure>`).join('');
    // Testimonios y capturas de reseñas en una sola fila a todo el ancho (hasta 4); más de 4 siguen en filas parejas.
    const n = tes.length + mat.resenas.length;
    const fila = `<div class="quotes q${Math.min(n, 4)}">${cards}${caps}</div>`;
    return `<section class="sec resenas" id="resenas"><div class="wrap"><h2>${esc(T.resenas)}</h2>${fila}</div></section>`;
  };
  // Cada paso puede traer título y explicación ("Título\nTexto"), como lo escribe el cliente por chat (10-nov-2026).
  const secProceso = () => { const ps = brief.oferta?.proceso_pasos || []; return ps.length >= 3 ? `<section class="sec" id="proceso"><div class="wrap"><h2>${esc(t.proceso || T.proceso || 'Cómo funciona')}</h2>${t.proceso_intro ? `<p class="sec-intro">${esc(t.proceso_intro)}</p>` : ''}<ol class="pasos">${ps.map((x) => `<li>${pasoHTML(x)}</li>`).join('')}</ol></div></section>` : ''; };
  // Si el cliente fijó el título de "Cómo funciona" por chat, la sección aparece en cualquier diseño (10-nov-2026).
  const procCli = () => (t.proceso ? secProceso() : '');
  const secFaq = () => { const fq = (brief.faq || []).filter((x) => x.pregunta && x.respuesta); return fq.length ? `<section class="sec" id="faq"><div class="wrap"><div class="faq-l"><h2>${esc(T.faq)}</h2>${fq.map((x, k) => `<details${k === 0 ? ' open' : ''}><summary>${esc(x.pregunta)}</summary><p>${esc(x.respuesta)}</p></details>`).join('')}</div></div></section>` : ''; };
  const secVideo = () => mat.videos.some((v) => !enPortada.has(v.url)) ? `<section class="sec"><div class="wrap">${mat.videos.filter((v) => !enPortada.has(v.url)).map((v) => { usadas.add(v.url); return `<video class="video" src="${esc(v.url)}" controls playsinline preload="metadata"></video>`; }).join('')}</div></section>` : '';
  const secContacto = () => {
    const c = brief.contacto || {};
    const dir = direccionTexto(brief);
    const zona = (brief.zona?.cobertura || []).join(' · ');
    const rs = enlacesRedes(redes(c));
    return `<section class="sec contacto" id="contacto"><div class="wrap"><h2>${esc(T.contacto)}</h2><div class="datos">${d.tel ? `<p><b>WhatsApp</b><a${wa}>${esc(d.tel)}</a></p>` : ''}${dir ? `<p><b>Dónde</b>${esc(dir)}</p>` : zona ? `<p><b>Dónde</b>${esc(zona)}</p>` : ''}${typeof c.horarios === 'string' ? `<p><b>Horario</b>${esc(c.horarios)}</p>` : ''}${c.email ? `<p><b>Correo</b><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : ''}${rs ? `<p><b>Redes</b><span class="rs">${rs}</span></p>` : ''}</div>${cta()}</div></section>`;
  };

  // Cada sección lleva su id (.seccion) para que el mapa del giro la ponga en su lugar (generador/giros/index.js).
  const id = (seccion, fn) => Object.assign(fn, { seccion });
  return { listaTrabajo, secTrabajo: id('trabajo', secTrabajo), secServicios: id('servicios', secServicios), secSobre: id('sobre', secSobre), secEquipo: id('equipo', secEquipo), secResenas: id('resenas', secResenas), secProceso: id('proceso', secProceso), procCli: id('proceso', procCli), secFaq: id('faq', secFaq), secVideo: id('video', secVideo), secContacto: id('contacto', secContacto) };
}
