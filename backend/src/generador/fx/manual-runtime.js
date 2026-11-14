/* Opción R (manual de servicios): movimiento tomado de compsych.konpo.co (su cp.min.js, medido el 14-nov-2026).
   Mismos valores que la referencia salvo donde se indica. Sin librerías o con "reducir movimiento" no corre nada. */
(function () {
  var H = document.documentElement;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function iniciar() {
    if (!window.gsap || !window.ScrollTrigger || !window.SplitType) return;
    gsap.registerPlugin(ScrollTrigger);
    var horiz = window.innerWidth > 991 && !!window.Lenis;
    H.classList.add('cp-fx'); if (horiz) H.classList.add('cp-horiz');
    var main = document.querySelector('.cp-main'), pista = document.querySelector('.cp-pista');
    var $ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
    var lerp = function (a, b, t) { return (1 - t) * a + t * b; };
    var ini = function (v, h) { return horiz ? h : v; };

    // ---------- Lenis: horizontal en escritorio (rueda vertical u horizontal), vertical en celular ----------
    var lenis = null, vel = { v: 0 };
    if (window.Lenis) {
      lenis = horiz ? new Lenis({ wrapper: main, content: pista, orientation: 'horizontal', gestureOrientation: 'both', smoothWheel: true, syncTouch: false })
                    : new Lenis({ smoothTouch: false });
      lenis.on('scroll', ScrollTrigger.update);
      lenis.on('scroll', function (e) { vel.v = 0.2 * (e.velocity || 0); });
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    if (horiz) ScrollTrigger.defaults({ scroller: main, horizontal: true });
    $('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('href'), d = id.length > 1 && document.querySelector(id);
        if (d && lenis) { ev.preventDefault(); lenis.scrollTo(d, { offset: horiz ? 0 : -72 }); }
      });
    });
    var partir = function (el, tipos) { return new SplitType(el, { types: tipos, lineClass: 'bp-line', wordClass: 'bp-word', charClass: 'bp-char' }); };

    // ---------- portada (Hero): letras con escala, subrayado, tarjeta que sube, texto por palabras ----------
    var word = document.querySelector('[data-hero-word] [aria-hidden]');
    var tlH = gsap.timeline();
    if (word) { var sw = partir(word, 'words, chars'); tlH.from(sw.chars, { transformOrigin: 'bottom', scale: 0.8, yPercent: 80, x: -10, autoAlpha: 0, ease: 'expo.out', duration: 2, stagger: 0.05, delay: 0.5 }, 0); }
    var mano = document.querySelector('.cp-hero-mano');
    if (mano) {
      tlH.from(mano, { yPercent: 60, autoAlpha: 0, duration: 1.4, ease: 'expo.out' }, 1.1);
      var sub = mano.querySelector('.cp-subraya'); if (sub) tlH.fromTo(sub, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.inOut' }, 1.4);
    }
    var card = document.querySelector('[data-hero-card]');
    if (card) tlH.fromTo(card, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.6, ease: 'expo.out', clearProps: 'all' }, 1.2);
    var lead = document.querySelector('[data-hero-tx] .cp-lead');
    if (lead) { var sl = partir(lead, 'words'); tlH.fromTo(sl.words, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.015, onComplete: function () { sl.revert(); } }, 1.5); }
    var hb = document.querySelector('[data-hero-tx] .cp-btn');
    if (hb) tlH.fromTo(hb, { scale: 1.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1, clearProps: 'all' }, 1.8);
    var heroWm = document.querySelector('.cp-hero-marca');
    if (heroWm) gsap.to(heroWm, { xPercent: ini(0, -18), yPercent: ini(-20, 0), ease: 'none', scrollTrigger: { trigger: '#inicio', start: ini('top top', 'left left'), end: ini('bottom top', 'right left'), scrub: true } });

    // ---------- títulos dobles (DoubleTitle): letras que suben 0.5 s escalonadas 0.02 s y deriva del par ----------
    $('[data-dt]').forEach(function (el) {
      var m = el.querySelector('[data-dt-main]'), c = el.querySelector('[data-dt-clon]');
      var sm = partir(m, 'lines, words, chars'), sc = partir(c, 'lines, words, chars');
      var tl = gsap.timeline({ paused: true });
      tl.fromTo(sm.chars, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, stagger: 0.02 })
        .fromTo(sc.chars, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, stagger: 0.02 }, '<=0');
      ScrollTrigger.create({ trigger: el, start: ini('top bottom-=25%', 'left-=35% right-=30%'), once: true, onEnter: function () { tl.play(); } });
      // La referencia deriva de -35 % a 15 % del ancho del título (horizontal) o del alto (celular); el clon se separa un poco más.
      var a = el.classList.contains('cp-srv-dt') ? -35 : -12, b = el.classList.contains('cp-srv-dt') ? 15 : 8;
      gsap.timeline({ scrollTrigger: { trigger: el, start: ini('top bottom', 'left right'), end: ini('bottom top', 'right left'), scrub: true }, defaults: { ease: 'none' } })
        .fromTo(m, horiz ? { xPercent: a } : { yPercent: a / 4 }, horiz ? { xPercent: b } : { yPercent: b / 4 }, 0)
        .fromTo(c, horiz ? { xPercent: a * 1.2 } : { yPercent: a / 3 }, horiz ? { xPercent: b * 1.2 } : { yPercent: b / 3 }, 0);
    });

    // ---------- textos (Title / palabras) y botones ----------
    $('[data-chars]').forEach(function (el) {
      var s = partir(el, 'words, chars');
      gsap.fromTo(s.chars, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, stagger: 0.02, scrollTrigger: { trigger: el, start: ini('top bottom-=25%', 'left right-=25%'), once: true }, onComplete: function () { s.revert(); } });
    });
    $('[data-words]').forEach(function (el) {
      var s = partir(el, 'words');
      gsap.fromTo(s.words, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.015, scrollTrigger: { trigger: el, start: ini('top bottom-=15%', 'left-=30% right-=30%'), once: true }, onComplete: function () { s.revert(); } });
    });
    $('.cp-sec:not(#inicio) .cp-btn').forEach(function (b) {
      gsap.fromTo(b, { scale: 1.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1, clearProps: 'all', scrollTrigger: { trigger: b, start: ini('top bottom-=10%', 'left right-=10%'), once: true } });
    });

    // ---------- fotos: recorte que se abre (ScaleInset) y foto que se desliza dentro de su marco (ParallaxImage) ----------
    $('[data-inset]').forEach(function (f) {
      var im = f.querySelector('img,video'); if (!im) return;
      var r = parseFloat(getComputedStyle(f).borderTopLeftRadius) || 0;
      gsap.timeline({ scrollTrigger: { trigger: f, start: ini('top top+=85%', 'left left+=85%'), once: true } })
        .fromTo(f, { clipPath: 'inset(20% round ' + r + 'px)' }, { clipPath: 'inset(0% round ' + r + 'px)', duration: 2, ease: 'expo.out', clearProps: 'clipPath' })
        .fromTo(im, { scale: 1.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 2, ease: 'expo.out', clearProps: 'scale,opacity,visibility' }, '<=0');
    });
    if (horiz) $('[data-par] img').forEach(function (im) {
      gsap.fromTo(im, { xPercent: 0 }, { xPercent: -15, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'left right', end: 'right left', scrub: true } });
    });

    // ---------- columnas con deriva propia (como título −200→120 px y texto −350→250 px en la referencia) ----------
    if (horiz) $('[data-px]').forEach(function (el) {
      var p = el.getAttribute('data-px').split(',').map(Number);
      gsap.fromTo(el, { x: p[0] * 0.5 }, { x: p[1] * 0.5, ease: 'none', scrollTrigger: { trigger: el.closest('.cp-sec'), start: 'left right', end: 'right left', scrub: true } });
    });

    // ---------- tarjetas: entran escalonadas ----------
    $('.cp-cards').forEach(function (g) {
      gsap.fromTo(g.querySelectorAll('[data-card]'), horiz ? { xPercent: 40, autoAlpha: 0 } : { yPercent: 20, autoAlpha: 0 }, { xPercent: 0, yPercent: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: g, start: ini('top bottom-=10%', 'left right-=10%'), once: true } });
    });

    // ---------- contacto: barras-píldora que entran desde la derecha y quedan escalonadas ----------
    var barras = $('[data-barra]');
    if (barras.length) {
      var finales = [14, 0, 22, 4, 18, 8, 26, 2];
      if (horiz) gsap.timeline({ scrollTrigger: { trigger: '#contacto', start: 'left right', end: 'left left', scrub: true }, defaults: { ease: 'none' } })
        .fromTo(barras, { xPercent: 100 }, { xPercent: function (i) { return finales[i % finales.length]; }, stagger: 0.06 }, 0);
      else barras.forEach(function (b, i) { gsap.fromTo(b, { xPercent: 100 }, { xPercent: 0, duration: 1.2, ease: 'expo.out', delay: i * 0.05, scrollTrigger: { trigger: b, start: 'top bottom-=5%', once: true } }); });
    }

    // ---------- fondo y colores que cambian con la sección (Background) + regla (ScrollBar) ----------
    var secs = $('.cp-sec'), fondo = document.querySelector('.cp-fondo'), actual = null;
    var regla = horiz ? document.querySelector('.cp-regla') : null, pil = regla && regla.querySelector('.cp-regla-p'), noms = regla ? $('.cp-regla-n li', regla) : [];
    if (regla) {
      var mk = regla.querySelector('.cp-regla-m');
      for (var i = 0; i < 140; i++) { var t = document.createElement('i'); mk.appendChild(t); }
    }
    function medirRegla() {
      if (!regla) return;
      var total = pista.scrollWidth - main.clientWidth, w = regla.clientWidth;
      noms.forEach(function (li) { var s = document.getElementById(li.getAttribute('data-para')); if (s) li.style.left = Math.min(w - 80, (Math.min(s.offsetLeft, total) / total) * (w - 70)) + 'px'; });
      var marcas = $('.cp-regla-m i', regla);
      noms.forEach(function (li) { var k = Math.round(parseFloat(li.style.left) / w * (marcas.length - 1)); if (marcas[k]) marcas[k].className = 'l'; });
    }
    function cambiar(s) {
      if (!s || s === actual) return; actual = s;
      var cs = getComputedStyle(s), v = function (n) { return cs.getPropertyValue(n).trim(); };
      gsap.to(fondo, { '--fondo-a': v('--arriba'), '--fondo-b': v('--abajo'), duration: 0.9, ease: 'power2.out' });
      gsap.to(H, { '--acento': v('--acento'), '--tinta': v('--tinta'), '--arriba': v('--arriba'), '--abajo': v('--abajo'), duration: 0.9, ease: 'power2.out' });
      noms.forEach(function (li) { li.classList.toggle('act', li.getAttribute('data-para') === s.id); });
    }
    function alRecorrer() {
      var c = horiz ? main.clientWidth / 2 : window.innerHeight / 2, mejor = null;
      secs.forEach(function (s) { var r = s.getBoundingClientRect(), a = horiz ? r.left : r.top, b = horiz ? r.right : r.bottom; if (a <= c && b >= c) mejor = s; });
      cambiar(mejor || secs[0]);
      if (pil) { var total = pista.scrollWidth - main.clientWidth; gsap.set(pil, { x: (main.scrollLeft / Math.max(1, total)) * (regla.clientWidth - 70) }); }
    }
    if (lenis) lenis.on('scroll', alRecorrer); else window.addEventListener('scroll', alRecorrer, { passive: true });
    medirRegla(); alRecorrer();
    if (regla) gsap.fromTo(regla, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', delay: 1.6 });
    window.addEventListener('resize', function () { medirRegla(); });

    // ---------- estela de fotos (photo trail): umbral de 80 px, 0.8 s, como la referencia ----------
    var zona = document.querySelector('[data-trail-zona]'), capa = zona && zona.querySelector('.cp-trail');
    var fotos = $('.cp-galeria img').map(function (x) { return x.currentSrc || x.src; }).filter(Boolean);
    if (horiz && capa && fotos.length >= 3 && matchMedia('(hover:hover)').matches) {
      var items = fotos.slice(0, 12).map(function (src) { var d = document.createElement('div'); d.className = 'cp-trail-i'; var im = document.createElement('img'); im.src = src; im.alt = ''; d.appendChild(im); capa.appendChild(d); return d; });
      var pos = { x: 0, y: 0 }, cache = { x: 0, y: 0 }, ult = { x: 0, y: 0 }, k = 0, z = 1, dentro = false;
      zona.addEventListener('mouseenter', function () { dentro = true; });
      zona.addEventListener('mouseleave', function () { dentro = false; });
      zona.addEventListener('mousemove', function (e) { var r = capa.getBoundingClientRect(); pos.x = e.clientX - r.left; pos.y = e.clientY - r.top; });
      gsap.ticker.add(function () {
        cache.x = lerp(cache.x, pos.x, 0.1); cache.y = lerp(cache.y, pos.y, 0.1);
        if (!dentro || Math.hypot(pos.x - ult.x, pos.y - ult.y) <= 80) return;
        ult = { x: pos.x, y: pos.y };
        var it = items[k]; k = (k + 1) % items.length; z++;
        var w = it.offsetWidth, h = it.offsetHeight;
        gsap.killTweensOf(it);
        gsap.timeline().fromTo(it, { opacity: 1, scale: 1, zIndex: z, x: cache.x - w / 2, y: cache.y - h / 2 }, { duration: 0.8, scale: 0.8, ease: 'expo.out', x: pos.x - w / 2, y: pos.y - h / 2 })
          .to(it, { duration: 0.8, ease: 'power1.out', opacity: 0, scale: 0.2 }, 0.4);
      });
    }

    // ---------- galería en giro (WebGL con el shader de la referencia) ----------
    var giro = document.querySelector('.cp-giro');
    if (horiz && giro && fotos.length >= 3) {
      var s3 = document.createElement('script'); s3.src = giro.getAttribute('data-three');
      s3.onload = function () { try { H.classList.add('cp-webgl'); galeria(giro, fotos, vel); ScrollTrigger.create({ trigger: zona, start: 'left 80%', end: 'right 20%', onToggle: function (st) { giro.classList.toggle('vis', st.isActive); } }); } catch (e) { giro.remove(); } };
      document.head.appendChild(s3);
    }
    ScrollTrigger.refresh();
  }

  function galeria(el, imagenes, vel) {
    var T = window.THREE, canvas = el.querySelector('canvas');
    var VS = 'precision highp float;varying vec2 vUv;uniform float uPosition;uniform float uTime;uniform float uSpeed;uniform vec3 distortionAxis;uniform vec3 rotationAxis;uniform float uDistortion;float PI=3.141592653589793238;' +
      'mat4 rotationMatrix(vec3 axis,float angle){axis=normalize(axis);float s=sin(angle);float c=cos(angle);float oc=1.0-c;return mat4(oc*axis.x*axis.x+c,oc*axis.x*axis.y-axis.z*s,oc*axis.z*axis.x+axis.y*s,0.0,oc*axis.x*axis.y+axis.z*s,oc*axis.y*axis.y+c,oc*axis.y*axis.z-axis.x*s,0.0,oc*axis.z*axis.x-axis.y*s,oc*axis.y*axis.z+axis.x*s,oc*axis.z*axis.z+c,0.0,0.0,0.0,0.0,1.0);}' +
      'vec3 rotate(vec3 v,vec3 axis,float angle){mat4 m=rotationMatrix(axis,angle);return(m*vec4(v,1.0)).xyz;}' +
      'float qinticInOut(float t){return t<0.5?16.0*pow(t,5.0):-0.5*abs(pow(2.0*t-2.0,5.0))+1.0;}' +
      'void main(){vUv=uv;float norm=0.5;vec3 newpos=position;float offset=(dot(distortionAxis,position)+norm/2.0)/norm;float localprogress=clamp((fract(uPosition*5.0*0.01)-0.01*uDistortion*offset)/(1.0-0.01*uDistortion),0.0,2.0);localprogress=qinticInOut(localprogress)*PI;newpos=rotate(newpos,rotationAxis,localprogress);gl_Position=projectionMatrix*modelViewMatrix*vec4(newpos,1.0);}';
    var FS = 'precision highp float;uniform vec2 uImageSize;uniform vec2 uPlaneSize;uniform sampler2D tMap;varying vec2 vUv;void main(){vec2 ratio=vec2(min((uPlaneSize.x/uPlaneSize.y)/(uImageSize.x/uImageSize.y),1.0),min((uPlaneSize.y/uPlaneSize.x)/(uImageSize.y/uImageSize.x),1.0));vec2 uv=vec2(vUv.x*ratio.x+(1.0-ratio.x)*0.5,vUv.y*ratio.y+(1.0-ratio.y)*0.5);gl_FragColor=texture2D(tMap,uv);}';
    var renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    var camera = new T.PerspectiveCamera(45, 1, 0.1, 1000); camera.position.z = 20;
    var scene = new T.Scene(), geo = new T.PlaneGeometry(1, 1, 100, 1), screen = {}, viewport = {}, scroll = { current: 0, last: 0 };
    // Dos columnas (a la izquierda y a la derecha del título), como en la referencia.
    var cols = [imagenes.filter(function (_, i) { return i % 2 === 0; }), imagenes.filter(function (_, i) { return i % 2 === 1; })];
    var medias = [];
    cols.forEach(function (lista, col) {
      lista.forEach(function (src, index) {
        var mat = new T.ShaderMaterial({ uniforms: { tMap: { value: null }, uPosition: { value: 0 }, uPlaneSize: { value: [0, 0] }, uImageSize: { value: [1, 1] }, uSpeed: { value: 0 }, rotationAxis: { value: new T.Vector3(0, 1, 0) }, distortionAxis: { value: new T.Vector3(1, 1, 0) }, uDistortion: { value: 3 }, uTime: { value: 0 } }, vertexShader: VS, fragmentShader: FS, side: T.DoubleSide, depthTest: false, depthWrite: false, transparent: true });
        new T.TextureLoader().load(src, function (tx) { tx.minFilter = T.LinearFilter; tx.magFilter = T.LinearFilter; tx.generateMipmaps = false; mat.uniforms.tMap.value = tx; mat.uniforms.uImageSize.value = [tx.image.naturalWidth, tx.image.naturalHeight]; });
        var plane = new T.Mesh(geo, mat); scene.add(plane);
        medias.push({ plane: plane, mat: mat, index: index, n: lista.length, col: col, extra: 0 });
      });
    });
    function medir() {
      screen = { width: el.clientWidth, height: el.clientHeight };
      renderer.setSize(screen.width, screen.height, false);
      camera.aspect = screen.width / screen.height; camera.updateProjectionMatrix();
      var h = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z; viewport = { height: h, width: h * camera.aspect };
      medias.forEach(function (m) {
        var w = Math.min(320, screen.width * 0.17), hp = w * 300 / 320;
        m.plane.scale.x = viewport.width * w / screen.width; m.plane.scale.y = viewport.height * hp / screen.height;
        m.mat.uniforms.uPlaneSize.value = [m.plane.scale.x, m.plane.scale.y];
        m.height = m.plane.scale.y + 0.8; m.heightTotal = m.height * m.n; m.y = m.height * m.index + (m.col ? m.height / 2 : 0);
        var margen = viewport.width * 0.03;
        m.plane.position.x = m.col ? viewport.width / 2 - m.plane.scale.x / 2 - margen : -viewport.width / 2 + m.plane.scale.x / 2 + margen;
      });
    }
    medir(); window.addEventListener('resize', medir);
    var antes = false;
    (function cuadro() {
      // La referencia avanza sola 0.05 por cuadro y suma la velocidad del recorrido.
      scroll.current += 0.05 + 0.1 * vel.v; vel.v *= 0.92;
      var ahora = el.classList.contains('vis'); if (ahora && !antes) medir(); antes = ahora;
      if (ahora) {
        var dir = scroll.current > scroll.last ? 'up' : 'down';
        medias.forEach(function (m) {
          var sentido = m.col ? -1 : 1;
          m.plane.position.y = sentido * (m.y - scroll.current) - m.extra;
          m.mat.uniforms.uPosition.value = (m.plane.position.y + viewport.height) / (2 * viewport.height) * 10 + 5;
          m.mat.uniforms.uTime.value += 0.04;
          var mitad = m.plane.scale.y / 2, l = viewport.height;
          if (m.plane.position.y + mitad < -l) m.extra -= m.heightTotal;
          if (m.plane.position.y - mitad > l) m.extra += m.heightTotal;
        });
        renderer.render(scene, camera);
      }
      scroll.last = scroll.current;
      requestAnimationFrame(cuadro);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
