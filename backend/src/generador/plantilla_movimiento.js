// Plantilla "Recorrido en movimiento" (opción I): el HTML sale de un objeto `g` con la forma de cada giro de giros.json.
// En el generador, `g` se arma con el brief del cliente (nombre, textos, servicios, fotos); aquí solo vive lo visual y la estructura.
// Los efectos se activan con atributos data-fx (ver fx-runtime.js); sin JS la página queda completa y quieta.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const partes = (s) => String(s || '').split('✦').map((x) => x.trim()).filter(Boolean);
const TESTIMONIOS = [
  ['María', 'Me explicaron cada paso con paciencia. Por primera vez sentí que alguien entendía lo que estaba viviendo.'],
  ['Anónimo', 'Respondieron rápido y siempre me dijeron la verdad, incluso cuando no era lo que quería escuchar.'],
  ['Luis', 'Pasé de sentirme perdido a tener un plan claro. Recomiendo su trabajo sin dudarlo.'],
  ['Anónimo', 'Un trato humano y profesional de principio a fin.'],
];
const REDES = [
  ['Facebook', '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5z"/>'],
  ['Instagram', '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2"/>'],
  ['TikTok', '<path d="M14 3h3a5 5 0 0 0 4 4v3a8 8 0 0 1-4-1.2V15a6 6 0 1 1-6-6v3.2A2.8 2.8 0 1 0 14 15z"/>'],
  ['YouTube', '<rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9.2l5 2.8-5 2.8z"/>'],
  ['LinkedIn', '<path d="M5 9h3.4v10H5zM6.7 4.2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10.5 9h3.2v1.4c.5-.9 1.7-1.7 3.3-1.7 3.2 0 3.9 2.1 3.9 4.8V19h-3.4v-4.7c0-1.2 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5V19h-3.5z"/>'],
];

function retrato(nombre) {
  return `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="500" class="r-fondo"/><circle cx="290" cy="130" r="130" class="r-sol"/><circle cx="200" cy="215" r="58" class="r-cuerpo"/><path d="M78 520c0-104 50-170 122-170s122 66 122 170z" class="r-cuerpo"/></svg><span class="slot">Foto: ${esc(nombre)}</span>`;
}

export function renderPagina(g, o = {}) {
  const tel = String(o.whatsapp || '529990000000').replace(/\D/g, '');
  const wa = (t) => `https://wa.me/${tel}?text=${encodeURIComponent(t)}`;
  const holaGeneral = `Hola, me gustaría información. Los vi en su sitio de ${g.marca}.`;
  const bandaHTML = (txt, dir, clase = '', vel = 60) => `<div class="fx-banda ${clase}" data-fx="banda" data-fx-dir="${dir}" data-fx-vel="${vel}" role="presentation"><div class="fx-banda-pista"><div class="fx-banda-grupo">${partes(txt).map((x) => `<span>${esc(x)}</span>`).join('')}</div></div></div>`;
  const cifrasV = [[12, '+'], [600, '+'], [24, '']];

  const barra = `<a class="marca" href="#inicio">${esc(g.marca)}</a>
<nav class="menu" id="menu" aria-label="Principal"><a href="#inicio">Inicio</a><a href="#nosotras">Nosotros</a><a href="#servicios">Servicios</a><a href="#proceso">Proceso</a><a href="#contacto">Contacto</a></nav>
<a class="btn btn-sm" href="${wa(holaGeneral)}" target="_blank" rel="noopener">WhatsApp</a>
<button class="burger" type="button" aria-expanded="false" aria-controls="menu">Menú</button>`;

  const main = `
<section class="hero" id="inicio">
  <div class="hero-arte fx-paralaje" data-fx="paralaje" data-fx-fuerza="6" aria-hidden="true"><div class="fx-paralaje-in">
    <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="hg" cx=".72" cy=".28" r=".6"><stop offset="0" style="stop-color:var(--acento);stop-opacity:.6"/><stop offset="1" style="stop-color:var(--banda);stop-opacity:0"/></radialGradient></defs>
    <rect width="800" height="900" fill="url(#hg)"/>
    <g fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="2"><path d="M60 900V470a190 190 0 0 1 380 0V900"/><path d="M120 900V480a130 130 0 0 1 260 0V900"/><path d="M180 900V490a70 70 0 0 1 140 0V900"/><path d="M470 900V560a150 150 0 0 1 300 0V900"/><path d="M520 900V570a100 100 0 0 1 200 0V900"/></g></svg>
  </div></div>
  <div class="hero-txt">
    <p class="kicker" data-fx="revela">${esc(g.kicker)}</p>
    <h1 class="${g.titular.length > 56 ? 'h1-l' : g.titular.length > 46 ? 'h1-m' : ''}" data-fx="titulo" data-fx-split="letras" data-fx-ahora>${esc(g.titular)}</h1>
    <p class="sub" data-fx="revela">${esc(g.subtitulo)}</p>
    <div class="ctas" data-fx="revela" data-fx-hijos="a"><a class="btn btn-lleno" href="#contacto">${esc(g.cta)}</a><a class="btn" href="${wa(holaGeneral)}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a></div>
  </div>
</section>
${bandaHTML(g.bandas[0], -1, '', 70)}
<section class="sec mision" id="mision"><p class="etq" data-fx="revela">Quiénes somos</p><p class="mision-txt" data-fx="palabras">${esc(g.mision)}</p></section>
<section class="sec equipo" id="nosotras">
  <h2 data-fx="titulo">${esc(g.equipoTitulo)}</h2>
  <div class="perfiles" data-fx="revela" data-fx-hijos=".perfil">
    ${g.perfiles.map((p) => `<article class="perfil fx-tarjeta"><div class="retrato fx-paralaje" data-fx="paralaje" data-fx-fuerza="7"><div class="fx-paralaje-in">${retrato(p.n)}</div></div><div class="perfil-txt"><h3>${esc(p.n)}</h3><p class="rol">${esc(p.r)}</p><p>${esc(p.b)}</p><a class="btn" href="${wa(`Hola ${p.n}, me gustaría una consulta.`)}" target="_blank" rel="noopener">Conocer más</a></div></article>`).join('')}
  </div>
</section>
${bandaHTML(g.bandas[1], 1, 'fx-banda--contorno', 55)}
<section class="sec prensa" aria-label="Medios y reconocimientos"><p class="etq">Medios y reconocimientos · datos de ejemplo</p>${bandaHTML('Diario del Sureste ✦ Radio Península ✦ Revista Yucatán Hoy ✦ Foro Profesional MX', -1, 'fx-banda--suave', 40)}</section>
<section class="testi fx-horiz" id="testimonios" data-fx="horizontal">
  <div class="testi-cab"><h2 data-fx="titulo">Lo que dicen quienes confiaron en nosotros</h2></div>
  <div class="fx-horiz-pista">
    ${TESTIMONIOS.map(([n, t], i) => `<blockquote class="cita fx-tarjeta"><p>“${esc(t)}”</p><footer><span class="ini" aria-hidden="true">${esc(n[0])}</span><span><b>${esc(n)}</b><small>${esc(g.roles[i % g.roles.length])}</small></span></footer></blockquote>`).join('')}
  </div>
  <div class="fx-horiz-prog" aria-hidden="true"><i></i></div>
</section>
<section class="sec servicios" id="servicios">
  <h2 data-fx="titulo">Cómo podemos ayudarte</h2>
  <div class="pila" data-fx="apila">
    ${g.servicios.map((s, i) => `<article class="serv serv-${i + 1}"><span class="num" aria-hidden="true">0${i + 1}</span><div class="serv-cuerpo"><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p><ul>${s.p.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><a class="btn" href="${wa(`Hola, me interesa: ${s.t}.`)}" target="_blank" rel="noopener">Consultar este servicio</a></div></article>`).join('')}
  </div>
</section>
<section class="sec proceso" id="proceso" data-fx-ref>
  <h2 data-fx="titulo">Así empieza</h2>
  <div class="linea-base" aria-hidden="true"><i data-fx="linea"></i></div>
  <ol class="pasos" data-fx="revela" data-fx-hijos="li">
    ${g.pasos.map((p, i) => `<li class="fx-tarjeta"><span class="n">${i + 1}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></li>`).join('')}
  </ol>
</section>
<section class="cifras" aria-label="Cifras de ejemplo"><div data-fx="revela" data-fx-hijos=".cifra">
  ${g.cifras.map((c, i) => `<div class="cifra"><strong data-fx="cifra" data-valor="${cifrasV[i][0]}" data-sufijo="${cifrasV[i][1]}">${cifrasV[i][0]}${cifrasV[i][1]}</strong><span>${esc(c)}</span></div>`).join('')}
</div><p class="nota">Cifras de ejemplo: en el sitio real salen de los datos del cliente.</p></section>
<section class="sec contacto" id="contacto">
  <h2 data-fx="titulo">${esc(g.form.label)}</h2>
  <p class="intro" data-fx="revela">Consulta inicial gratuita y confidencial. Te respondemos en menos de 24 horas.</p>
  <div class="contacto-grid">
    <div class="datos" data-fx="revela" data-fx-hijos="p,a,.mapa">
      <p><b>Dirección</b><br>Calle 00 #000 por 00 y 00, Centro, Mérida, Yucatán</p>
      <p><b>Horario</b><br>Lunes a viernes, 9:00 a 18:00</p>
      <div class="mapa" role="img" aria-label="Aquí va el mapa de Google Maps de la dirección"><span>Mapa de Google Maps de la dirección</span></div>
      <a class="btn" href="https://www.google.com/maps/search/?api=1&query=M%C3%A9rida%20Yucat%C3%A1n" target="_blank" rel="noopener">Abrir en Google Maps</a>
    </div>
    <form class="form" id="form" novalidate>
      <div class="dos"><label>Nombre<input name="nombre" autocomplete="given-name" required></label><label>Apellido<input name="apellido" autocomplete="family-name" required></label></div>
      <div class="dos"><label>Teléfono<input name="tel" type="tel" autocomplete="tel" required></label><label>Correo<input name="correo" type="email" autocomplete="email" required></label></div>
      <label>${esc(g.form.label)}<textarea name="msg" rows="5" required></textarea></label>
      <button class="btn btn-lleno" type="submit">${esc(g.form.boton)}</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>`;

  const pie = `<div class="pie-in"><div><p class="pie-marca">${esc(g.marca)}</p><p>${esc(g.kicker)}</p></div>
<ul class="redes" aria-label="Redes sociales">${REDES.map(([n, d]) => `<li><a class="btn-red" href="#" aria-label="${n}" title="${n}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${d}</svg></a></li>`).join('')}</ul></div>
<p class="pie-nota">Sitio de demostración de la plantilla en movimiento · textos y cifras de ejemplo.</p>`;

  return { barra, main, pie };
}
