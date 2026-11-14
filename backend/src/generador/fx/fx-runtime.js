/* Runtime de efectos (generador/efectos_gsap.js). Usa GSAP + ScrollTrigger + SplitType + Lenis si están cargados;
   si alguna falta (red lenta, bloqueo) el contenido se queda quieto y completo. API por atributos:
   data-fx="titulo"    partir y subir por palabras (data-fx-split="letras" para letras, data-fx-ahora para no esperar el scroll)
   data-fx="palabras"  párrafo que se enciende palabra por palabra con el desplazamiento
   data-fx="banda"     banda de texto que corre sola y se acelera con el scroll (data-fx-dir="-1|1", data-fx-vel="60")
   data-fx="revela"    entra con desvanecido y subida (data-fx-hijos="selector" para escalonar hijos)
   data-fx="paralaje"  la imagen interior (.fx-paralaje-in) se desplaza más lento que la página (data-fx-fuerza="8")
   data-fx="zoom"      el hijo se acerca o aleja con el scroll (data-fx-de="1.25")
   data-fx="cifra"     contador (data-valor, data-prefijo, data-sufijo)
   data-fx="horizontal" sección fijada que recorre su pista de lado a lado (solo ≥ 900 px)
   data-fx="apila"     tarjetas que se apilan al bajar
   data-fx="linea"     línea que se dibuja con el scroll (data-fx-eje="y" para vertical)
   data-fx="abre"|"secuencia"|"cierre"  opción M: foto que se abre con el scroll, recorrido fijo de fotos y cierre que crece (ver generador/guia.js) */
(function () {
  'use strict';
  var W = window, D = document, H = D.documentElement;
  var reduce = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $$ = function (s, r) { return [].slice.call((r || D).querySelectorAll(s)); };
  var num = function (v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; };

  /* ---------- color (contraste automático para cualquier paleta) ---------- */
  function hex2rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(c) { return '#' + c.map(function (x) { return ('0' + Math.round(Math.max(0, Math.min(255, x))).toString(16)).slice(-2); }).join(''); }
  function lum(c) { var a = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; }
  function ratio(a, b) { var x = lum(hex2rgb(a)), y = lum(hex2rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function mezcla(a, b, t) { var x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function sobre(bg) { return ratio(bg, '#ffffff') >= ratio(bg, '#111111') ? '#ffffff' : '#111111'; }
  function legible(color, fondo, min, hacia) { var c = color, t = 0; while (ratio(c, fondo) < min && t < 1) { t += 0.05; c = mezcla(color, hacia, t); } return c; }
  /* acento apto para botones y fichas rellenas: si el texto blanco o negro no alcanza 4.5:1 sobre el acento, se oscurece o aclara lo justo */
  function botonDe(acento) { var t = sobre(acento), h = t === '#ffffff' ? '#000000' : '#ffffff', c = acento, i = 0; while (ratio(c, t) < 4.5 && i < 20) { i++; c = mezcla(acento, h, i * 0.05); } return c; }
  function calcularTema(p) {
    var fondo = p.fondo, tinta = p.tinta;
    if (ratio(tinta, fondo) < 7) tinta = lum(hex2rgb(fondo)) > 0.5 ? '#111111' : '#f5f5f5';
    var acento = p.acento;
    var banda = p.banda || mezcla(tinta, acento, 0.22);
    var sb = sobre(banda);
    return {
      '--fondo': fondo, '--tinta': tinta, '--acento': acento,
      '--acento-txt': legible(acento, fondo, 4.5, tinta),
      '--sobre-acento': sobre(acento), '--boton': botonDe(acento), '--sobre-boton': sobre(botonDe(acento)),
      '--banda': banda, '--sobre-banda': sb,
      '--acento-sobre-banda': legible(acento, banda, 4.5, sb),
      '--sobre-tinta': sobre(tinta),
      '--suave': mezcla(fondo, tinta, 0.06),
      '--linea': mezcla(fondo, tinta, 0.2)
    };
  }
  function tema(p, raiz) { var v = calcularTema(p), el = (raiz || H).style; for (var k in v) el.setProperty(k, v[k]); return v; }

  /* ---------- núcleo ---------- */
  var lenis = null, rehacer = [], empuje = 0, tickers = [], mms = [], resizeListo = false;
  function addTick(f) { W.gsap.ticker.add(f); tickers.push(f); }
  var listos = function () { return W.gsap && W.ScrollTrigger; };

  function partir(el, tipos) { return W.SplitType ? new W.SplitType(el, { types: tipos, tagName: 'span' }) : null; }

  function titulo(el) {
    var letras = el.getAttribute('data-fx-split') === 'letras', ahora = el.hasAttribute('data-fx-ahora'), sp = null, tw = null;
    function armar(animar) {
      sp = partir(el, letras ? 'lines,words,chars' : 'lines,words');
      el.classList.add('fx-dividido');
      if (!animar) return;
      var obj = sp ? (letras ? sp.chars : sp.words) : el;
      var cfg = sp ? { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: letras ? 0.018 : 0.07 } : { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out' };
      if (ahora) cfg.delay = num(el.getAttribute('data-fx-retraso'), 0.15);
      else cfg.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
      tw = W.gsap.from(obj, cfg);
    }
    armar(true);
    rehacer.push(function () { if (tw) { if (tw.scrollTrigger) tw.scrollTrigger.kill(); tw.kill(); tw = null; } if (sp) sp.revert(); armar(false); });
  }

  function palabras(el) {
    var sp = null, tw = null;
    function armar() {
      sp = partir(el, 'lines,words');
      el.classList.add('fx-dividido');
      if (!sp) return;
      tw = W.gsap.fromTo(sp.words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: true } });
    }
    armar();
    rehacer.push(function () { if (tw) { if (tw.scrollTrigger) tw.scrollTrigger.kill(); tw.kill(); } if (sp) sp.revert(); armar(); });
  }

  function banda(el) {
    var pista = el.querySelector('.fx-banda-pista'), grupo = pista && pista.querySelector('.fx-banda-grupo');
    if (!pista || !grupo) return;
    var orig = grupo.innerHTML, dir = num(el.getAttribute('data-fx-dir'), -1) < 0 ? -1 : 1, vel = num(el.getAttribute('data-fx-vel'), 60), x = 0, gw = 0, visible = true;
    function construir() {
      pista.innerHTML = '';
      var g = D.createElement('div'); g.className = 'fx-banda-grupo'; g.innerHTML = orig; pista.appendChild(g);
      var n = 0; while (g.scrollWidth < W.innerWidth * 1.1 && n < 14) { g.innerHTML += orig; n++; }
      var c = g.cloneNode(true); c.setAttribute('aria-hidden', 'true'); pista.appendChild(c);
      gw = g.getBoundingClientRect().width; x = dir < 0 ? 0 : -gw;
    }
    construir();
    addTick(function (t, dt) {
      if (!visible || !gw) return;
      x += dir * (vel + empuje) * dt / 1000;
      if (x <= -gw) x += gw; else if (x > 0) x -= gw;
      pista.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });
    W.ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: function (s) { visible = s.isActive; } });
    rehacer.push(construir);
  }

  function revela(el) {
    var sel = el.getAttribute('data-fx-hijos'), obj = sel ? $$(sel, el) : [el];
    if (!obj.length) return;
    W.gsap.from(obj, { y: 38, opacity: 0, duration: 0.95, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      onComplete: function () { W.gsap.set(obj, { clearProps: 'transform,opacity,visibility' }); } });
  }

  function paralaje(el) {
    var inner = el.querySelector('.fx-paralaje-in'); if (!inner) return;
    var f = num(el.getAttribute('data-fx-fuerza'), 8);
    W.gsap.fromTo(inner, { yPercent: -f }, { yPercent: f, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function zoom(el) {
    var hijo = el.firstElementChild; if (!hijo) return;
    W.gsap.fromTo(hijo, { scale: num(el.getAttribute('data-fx-de'), 1.25) }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'center center', scrub: true } });
  }

  function cifra(el) {
    var fin = num(el.getAttribute('data-valor'), NaN); if (isNaN(fin)) return;
    var pre = el.getAttribute('data-prefijo') || '', suf = el.getAttribute('data-sufijo') || '', orig = el.textContent, o = { v: 0 };
    var fmt = function (n) { return Math.round(n).toLocaleString('es-MX'); };
    el.textContent = pre + '0' + suf;
    W.gsap.to(o, { v: fin, duration: 1.7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: function () { el.textContent = pre + fmt(o.v) + suf; }, onComplete: function () { el.textContent = orig; } });
  }

  function horizontal(el) {
    var pista = el.querySelector('.fx-horiz-pista'), prog = el.querySelector('.fx-horiz-prog>i'); if (!pista) return;
    var mm = W.gsap.matchMedia(); mms.push(mm);
    mm.add('(min-width: 900px)', function () {
      var dist = function () { return Math.max(0, pista.scrollWidth - W.innerWidth); };
      W.gsap.to(pista, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: el, pin: true, scrub: 0.7, start: 'top top', end: function () { return '+=' + dist(); }, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (s) { if (prog) prog.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')'; } } });
    });
  }

  function apila(el) {
    var cs = [].slice.call(el.children); if (cs.length < 2) return;
    cs.forEach(function (c, i) { c.style.setProperty('--i', i); });
    cs.forEach(function (c, i) {
      if (i === cs.length - 1) return;
      W.gsap.to(c, { scale: 0.94, opacity: 0.55, ease: 'none', scrollTrigger: { trigger: cs[i + 1], start: 'top 90%', end: 'top ' + (92 + (i + 1) * 16) + 'px', scrub: true } });
    });
  }

  function linea(el) {
    var y = el.getAttribute('data-fx-eje') === 'y', ref = el.closest('[data-fx-ref]') || el;
    var de = {}, a = {}; de[y ? 'scaleY' : 'scaleX'] = 0; a[y ? 'scaleY' : 'scaleX'] = 1; a.ease = 'none';
    a.scrollTrigger = { trigger: ref, start: 'top 72%', end: 'bottom 55%', scrub: true };
    if (y) el.style.transformOrigin = 'center top';
    W.gsap.fromTo(el, de, a);
  }


  /* ---- opción M (guía en movimiento): foto que se abre, recorrido de fotos y cierre que crece ---- */
  function abre(el) {
    var foto = el.querySelector('.gu-abre-foto'), im = foto && foto.querySelector('img'); if (!foto) return;
    el.classList.add('gu-pin');
    var movil = W.innerWidth < 700;
    W.gsap.fromTo(foto, { clipPath: movil ? 'inset(6% 4% 6% 4% round 16px)' : 'inset(14% 12% 14% 12% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'top top', scrub: true } });
    if (im) W.gsap.fromTo(im, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom bottom', scrub: true } });
  }

  function secuencia(el) {
    var ps = $$('.gu-p', el), cont = el.querySelector('.gu-cont b'), prog = el.querySelector('.gu-prog>i'); if (ps.length < 2) return;
    el.classList.add('gu-pin');
    var tl = W.gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: function (s) {
        if (prog) prog.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')';
        if (cont) { var k = Math.min(ps.length, 1 + Math.round(s.progress * (ps.length - 1))); cont.textContent = ('0' + k).slice(-2); }
      } } });
    ps.forEach(function (p, i) {
      var im = p.querySelector('img'), cap = p.querySelector('figcaption');
      if (i > 0) {
        tl.fromTo(p, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 }, i - 1);
        if (im) tl.fromTo(im, { scale: 1.2 }, { scale: 1, duration: 1 }, i - 1);
        if (cap) tl.fromTo(cap, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, i - 0.45);
      }
    });
    tl.to({}, { duration: 0.4 });
  }

  function cierre(el) {
    var foto = el.querySelector('.gu-cierre-foto'), im = foto && foto.querySelector('img'); if (!foto) return;
    el.classList.add('gu-pin');
    W.gsap.fromTo(foto, { clipPath: 'inset(16% 12% 16% 12% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'top top', scrub: true } });
    if (im) W.gsap.fromTo(im, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom bottom', scrub: true } });
  }

  var ACCIONES = { abre: abre, secuencia: secuencia, cierre: cierre, titulo: titulo, palabras: palabras, banda: banda, revela: revela, paralaje: paralaje, zoom: zoom, cifra: cifra, horizontal: horizontal, apila: apila, linea: linea };

  function construirTodo() {
    $$('[data-fx]').forEach(function (el) {
      var f = ACCIONES[el.getAttribute('data-fx')];
      if (f) { try { f(el); } catch (e) { if (W.console) console.warn('fx:', e); } }
    });
    /* empuje de las bandas según la velocidad de desplazamiento (decae solo) */
    W.ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { empuje = Math.min(700, Math.abs(s.getVelocity()) * 0.22); } });
    addTick(function () { empuje *= 0.93; });
    if (resizeListo) return; resizeListo = true;
    var w0 = W.innerWidth, t = null;
    W.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (W.innerWidth === w0) return; w0 = W.innerWidth; rehacer.forEach(function (f) { try { f(); } catch (e) {} }); W.ScrollTrigger.refresh(); }, 250);
    });
  }

  /* cambia el contenido de la página (p. ej. otro giro) y vuelve a armar los efectos */
  function limpiar() {
    W.ScrollTrigger.getAll().forEach(function (t) { t.kill(true); });
    mms.forEach(function (m) { m.revert(); }); mms = [];
    tickers.forEach(function (f) { W.gsap.ticker.remove(f); }); tickers = [];
    rehacer = []; W.gsap.globalTimeline.clear();
  }
  function reiniciar() { if (reduce || !listos()) return; limpiar(); construirTodo(); W.ScrollTrigger.refresh(); if (lenis) lenis.scrollTo(0, { immediate: true }); }

  function iniciarLenis() {
    if (!W.Lenis || H.hasAttribute('data-fx-sin-lenis')) return;
    lenis = new W.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', W.ScrollTrigger.update);
    W.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    W.gsap.ticker.lagSmoothing(0);
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var t = D.querySelector(id); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { offset: -(num(getComputedStyle(H).getPropertyValue('--alto-barra'), 72)) });
    });
  }

  function iniciar() {
    if (H.__fxListo) return; H.__fxListo = true;
    if (reduce || !listos()) { H.classList.remove('fx-pre'); return; }
    W.gsap.registerPlugin(W.ScrollTrigger);
    iniciarLenis();
    var ok = function () { construirTodo(); H.classList.remove('fx-pre'); W.ScrollTrigger.refresh(); };
    (D.fonts && D.fonts.ready ? D.fonts.ready : Promise.resolve()).then(ok, ok);
  }

  W.FX = { iniciar: iniciar, tema: tema, calcularTema: calcularTema, reiniciar: reiniciar, refrescar: function () { if (W.ScrollTrigger) W.ScrollTrigger.refresh(); }, lenis: function () { return lenis; } };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
