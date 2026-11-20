#!/usr/bin/env python3
"""Genera el sitio estático de lemoss.co en ./dist. Uso: python3 build.py"""
import json, os, shutil, html, datetime, pathlib

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"
SITE = "https://lemoss.co"
HOY = datetime.date.today().isoformat()
import hashlib
CSS_V = hashlib.md5((ROOT / "assets" / "site.css").read_bytes()).hexdigest()[:10]
WA = "525527069296"
WA_TXT = "Hola, vengo de lemoss.co y quiero platicar sobre un proyecto."
EMAIL = "contacto@lemoss.co"

SAME_AS = [
    "https://www.linkedin.com/company/lemoss-co/",
    "https://www.facebook.com/lemossco",
    "https://www.instagram.com/lemoss.consulting/",
    "https://www.youtube.com/@lemossco",
    "https://www.tiktok.com/@lemoss.co",
]
PERSONA_SAME_AS = ["https://www.linkedin.com/in/sebasti%C3%A1n-lemos/"]


def wa(texto=WA_TXT):
    from urllib.parse import quote
    return f"https://wa.me/{WA}?text={quote(texto)}"


def e(s):
    return html.escape(s, quote=True)


JS_MEDICION = """(function(){
window.dataLayer=window.dataLayer||[];
document.addEventListener('click',function(ev){
var a=ev.target.closest&&ev.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'',ev2=null;
if(h.indexOf('wa.me/')>-1||h.indexOf('api.whatsapp.com')>-1)ev2='contacto_whatsapp';else if(h.indexOf('mailto:')===0)ev2='contacto_correo';
if(!ev2)return;
var u=a.classList.contains('wa-flot')?'boton_flotante':a.closest('#res')?'diagnostico':a.closest('footer')?'pie':a.closest('header')?'encabezado':'contenido';
dataLayer.push({event:ev2,ubicacion:u});
},true);
})();"""

JS_GLOBAL = """(function(){
var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
var els=document.querySelectorAll('.rv');
if('IntersectionObserver' in window&&!rm){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px'});els.forEach(function(el){io.observe(el)})}else{els.forEach(function(el){el.classList.add('in')})}
var sl=document.querySelector('[data-slider]');if(!sl)return;
var pista=sl.querySelector('.sl-pista'),slides=pista.children,n=slides.length,bars=sl.querySelectorAll('.sl-barras button'),num=sl.querySelector('[data-num]'),i=0,t,DUR=5500;
sl.style.setProperty('--dur',DUR+'ms');
function marcar(k){i=(k+n)%n;bars.forEach(function(b,j){b.setAttribute('aria-current',j===i?'true':'false');b.classList.toggle('vista',j<i);b.style.animation='none';b.offsetWidth;b.style.animation=''});for(var j=0;j<n;j++){slides[j].setAttribute('aria-hidden',j===i?'false':'true');slides[j].querySelectorAll('a').forEach(function(a){a.tabIndex=j===i?0:-1})}if(num)num.textContent=String(i+1).padStart(2,'0')+' / '+String(n).padStart(2,'0')}
function ir(k){marcar(k);pista.scrollTo({left:slides[i].offsetLeft-pista.offsetLeft,behavior:rm?'auto':'smooth'});prog()}
function prog(){clearTimeout(t);if(!rm&&!sl.classList.contains('pausa'))t=setTimeout(function(){ir(i+1)},DUR)}
sl.querySelector('[data-prev]').onclick=function(){ir(i-1)};sl.querySelector('[data-next]').onclick=function(){ir(i+1)};
bars.forEach(function(b,j){b.onclick=function(){ir(j)}});
function pausa(v){sl.classList.toggle('pausa',v);if(v)clearTimeout(t);else prog()}
sl.addEventListener('mouseenter',function(){pausa(true)});sl.addEventListener('mouseleave',function(){pausa(false)});
sl.addEventListener('focusin',function(){pausa(true)});sl.addEventListener('focusout',function(){pausa(false)});
var st;pista.addEventListener('scroll',function(){clearTimeout(st);st=setTimeout(function(){var k=Math.round(pista.scrollLeft/pista.clientWidth);if(k!==i){marcar(k);prog()}},120)},{passive:true});
document.addEventListener('visibilitychange',function(){document.hidden?clearTimeout(t):prog()});
if(rm)sl.classList.add('pausa');marcar(0);prog();
})();"""

# Titular de portada: alterna solo entre los mensajes de .hero-rot; se detiene con el cursor encima y con movimiento reducido
JS_ROT = """(function(){
var r=document.querySelector('[data-rot]');if(!r)return;
var s=r.querySelectorAll('.hr-s'),d=document.querySelectorAll('[data-rot-dots] button'),i=0,t,enc=false,rm=matchMedia('(prefers-reduced-motion: reduce)').matches,DUR=7000;
function prog(){clearTimeout(t);if(!rm&&!enc&&!document.hidden)t=setTimeout(function(){ir(i+1)},DUR)}
function ir(k){i=(k+s.length)%s.length;s.forEach(function(x,j){x.classList.toggle('on',j===i)});d.forEach(function(b,j){b.setAttribute('aria-current',j===i?'true':'false')});prog()}
d.forEach(function(b,j){b.onclick=function(){ir(j)}});
r.addEventListener('mouseenter',function(){enc=true;clearTimeout(t)});r.addEventListener('mouseleave',function(){enc=false;prog()});
document.addEventListener('visibilitychange',prog);
ir(0);
})();"""

GTM_ID = "GTM-WWSJ3Q4P"  # Google Tag Manager, cuenta Lemoss (contacto@lemoss.co)

NAV = [("/servicios/", "Servicios"), ("/casos/", "Casos"), ("/autodiagnostico/", "Diagnóstico gratuito"), ("/blog/", "Blog"), ("/sobre/", "Nosotros")]


def layout(path, title, desc, body, schema=None, og_type="website", extra_head=""):
    url = SITE + path
    nav = "".join(f'<a href="{h}"{" aria-current=\"page\"" if path.startswith(h) else ""}>{t}</a>' for h, t in NAV)
    ld = ""
    for s in (schema or []):
        ld += f'<script type="application/ld+json">{json.dumps(s, ensure_ascii=False)}</script>\n'
    return f"""<!doctype html>
<html lang="es-MX" class="no-js">
<head>
<meta charset="utf-8">
<script>document.documentElement.className="js"</script>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
}})(window,document,'script','dataLayer','{GTM_ID}');</script>
<!-- End Google Tag Manager -->
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#05070d">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Lemoss">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/assets/favicon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/favicon-180.png">
<link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/poppins-bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v={CSS_V}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
{extra_head}{ld}</head>
<body>
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="/" aria-label="Lemoss Consulting, inicio">lemoss<span>.</span></a>
    <nav class="nav" aria-label="Principal">{nav}</nav>
    <a class="btn btn-sm" href="{wa()}" rel="noopener">WhatsApp</a>
    <details class="menu">
      <summary aria-label="Abrir menú">Menú</summary>
      <nav aria-label="Menú móvil">{nav}<a href="{wa()}" rel="noopener">Escríbenos por WhatsApp</a></nav>
    </details>
  </div>
</header>
<main id="contenido">
{body}
</main>
<footer class="pie">
  <div class="wrap pie-in">
    <div>
      <a class="logo" href="/">lemoss<span>.</span></a>
      <p class="muted">Consultoría en estrategia tecnológica por resultados para empresas medianas en México. Sede en Mérida, con atención en CDMX y todo el país.</p>
    </div>
    <div>
      <h2 class="pie-t">Contacto</h2>
      <p><a href="{wa()}" rel="noopener">WhatsApp +52 55 2706 9296</a><br><a href="mailto:{EMAIL}">{EMAIL}</a><br><span class="muted">Lunes a viernes, 9:00 a 18:00 (centro de México)</span></p>
    </div>
    <div>
      <h2 class="pie-t">Marcas</h2>
      <p><a href="https://timewins.ai" rel="noopener">timewins.ai</a><br><a href="https://iaprop.tech" rel="noopener">iaprop.tech</a><br><a href="https://estrategia.dental" rel="noopener">estrategia.dental</a></p>
    </div>
    <div>
      <h2 class="pie-t">Redes</h2>
      <p><a href="{SAME_AS[0]}" rel="noopener">LinkedIn</a><br><a href="{SAME_AS[2]}" rel="noopener">Instagram</a><br><a href="{SAME_AS[1]}" rel="noopener">Facebook</a><br><a href="{SAME_AS[3]}" rel="noopener">YouTube</a></p>
    </div>
  </div>
  <div class="wrap legal"><span>© {datetime.date.today().year} Lemoss</span><a href="/privacidad/">Aviso de privacidad</a><a href="/terminos/">Términos y condiciones</a></div>
</footer>
<script>{JS_MEDICION}</script>
<script>{JS_ROT}</script>
<script>{JS_GLOBAL}</script>
<a class="wa-flot" href="{wa()}" rel="noopener" aria-label="Escribir por WhatsApp"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z"/></svg></a>
</body>
</html>
"""


# ---------- Datos ----------
ORG = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": SITE + "/#lemoss",
    "name": "Lemoss",
    "alternateName": "Lemoss Consulting",
    "url": SITE + "/",
    "logo": SITE + "/assets/lemoss-logo-1024.png",
    "image": SITE + "/assets/og.png",
    "description": "Consultoría en estrategia tecnológica por resultados para empresas medianas en México: hoja de ruta tecnológica, procesos, sistemas, ventas e inteligencia artificial, con diagnóstico sin costo y paquetes de cuota mensual más participación en resultados.",
    "email": EMAIL,
    "telephone": "+52 55 2706 9296",
    "priceRange": "Diagnóstico sin costo; paquetes desde $6,500 MXN al mes más participación en resultados",
    "address": {"@type": "PostalAddress", "addressLocality": "Mérida", "addressRegion": "Yucatán", "addressCountry": "MX"},
    "areaServed": [{"@type": "Country", "name": "México"}, {"@type": "City", "name": "Mérida"}, {"@type": "City", "name": "Ciudad de México"}],
    "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00"}],
    "founder": {"@id": SITE + "/sobre/#sebastian"},
    "sameAs": SAME_AS,
    "knowsAbout": ["Estrategia tecnológica", "Modelos de negocio de servicios tecnológicos", "Transformación digital", "Automatización de procesos", "Inteligencia artificial aplicada a negocios", "CRM y WhatsApp Business API", "Agentes de IA", "Integración de sistemas", "Arquitectura de plataformas"],
}
PERSONA = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": SITE + "/sobre/#sebastian",
    "name": "Sebastián Lemos",
    "jobTitle": "Consultor en estrategia tecnológica",
    "worksFor": {"@id": SITE + "/#lemoss"},
    "url": SITE + "/sobre/",
    "image": SITE + "/assets/lemoss-avatar-800.png",
    "address": {"@type": "PostalAddress", "addressLocality": "Mérida", "addressRegion": "Yucatán", "addressCountry": "MX"},
    "sameAs": PERSONA_SAME_AS,
}
WEBSITE = {"@context": "https://schema.org", "@type": "WebSite", "@id": SITE + "/#web", "url": SITE + "/", "name": "Lemoss", "inLanguage": "es-MX", "publisher": {"@id": SITE + "/#lemoss"}}

ETAPAS = [
    ("Diagnóstico gratuito", "En línea · 5 minutos", "Eliges hasta tres procesos, respondes con rangos y ves al instante cuánto te cuestan hoy, al mes y al año.", "/autodiagnostico/", "Hacer el diagnóstico gratuito"),
    ("Sesión de línea base", "Sin costo", "Revisamos contigo procesos, datos y sistemas, validamos cuánto te cuesta hoy cada proceso y fijamos por escrito una sola métrica y su línea base, firmada por ambas partes.", None, None),
    ("Paquete de resultados", "Cuota mensual + participación · mínimo 3 meses", "Eliges cuánto riesgo compartimos: a menor cuota fija, mayor es nuestra participación en las ventas que generamos y en los costos que reducimos.", "/servicios/#paquetes", "Ver los paquetes"),
]

# Paquetes: (nombre, cuota mensual MXN, % del ahorro, % de comisión B2B, descripción)
PAQUETES = [
    ("Operación", 18000, 10, 3, "La cuota más alta y la participación más baja. Para quien prefiere un costo previsible y quedarse con casi todo el resultado."),
    ("Equilibrio", 12000, 25, 5, "El punto medio entre cuota fija y participación en resultados."),
    ("Socio", 6500, 40, 8, "La cuota más baja y la participación más alta. Lo ofrecemos cuando hay una línea base clara y medible."),
]
MESES_AHORRO = 12  # meses durante los que se cobra la participación en ahorro

# Comisión sobre pedido atribuido en venta al consumidor, por giro: (giro, Operación, Equilibrio, Socio)
GIROS_B2C = [
    ("Moda y accesorios", 4, 6, 9),
    ("Belleza y suplementos", 5, 8, 12),
    ("Hogar y muebles", 3, 5, 8),
    ("Electrónica", 1, 2, 3),
    ("Alimentos y restaurantes", 4, 6, 10),
]
AHORRO_EJEMPLO = 60000  # ahorro mensual del ejemplo de cálculo


def pesos(n):
    return f"${n:,.0f}"

SERVICIOS = [
    ("Estrategia tecnológica y de negocio", "Diagnóstico de cómo la tecnología puede hacer crecer tu negocio: hoja de ruta, prioridades, presupuesto y modelos de negocio de servicios tecnológicos, con el retorno esperado de cada iniciativa.", ["Diagnóstico y hoja de ruta tecnológica", "Modelos de negocio de servicios tecnológicos", "Evaluación y selección de proveedores", "Acompañamiento a dirección"]),
    ("Procesos y operación", "Inventario, pedidos, cotizaciones y reportes que hoy dependen de capturas manuales y hojas de cálculo, rediseñados, conectados y automatizados de punta a punta.", ["Mapeo y rediseño de procesos", "Integración ERP, CRM y hojas de cálculo", "Inventario y ventas automatizados", "Tableros con la información en tiempo real"]),
    ("Sistemas y plataformas", "Cuando lo que necesitas no existe en el mercado, diseñamos la arquitectura y construimos la plataforma: desde sistemas de gestión hasta servicios para entidades financieras.", ["Arquitectura de servicios (PaaS)", "Sistemas de gestión a la medida", "APIs, microservicios y migración a la nube", "Seguridad y manejo responsable de datos"]),
    ("Ventas y atención", "Respuesta inmediata a cada prospecto, calificación automática, seguimiento por WhatsApp y un CRM que se actualiza solo. Tu equipo comercial habla solo con quien está listo para comprar.", ["CRM conectado a WhatsApp Business API", "Lead scoring y asignación automática", "Seguimiento y reactivación de prospectos", "Medición del embudo comercial"]),
    ("Adopción de inteligencia artificial", "Implementación de IA en procesos reales con supervisión humana: agentes, contenido y análisis. Lo hacemos con timewins.ai, nuestra marca especializada en adopción y herramientas de IA.", ["Agentes de IA en WhatsApp y web", "Contenido y comunicación asistidos por IA", "Capacitación de equipos en IA", "Herramientas de timewins.ai"]),
]

CASOS = [
    {"id": "angeles-alatorre", "cliente": "Ángeles Alatorre", "sector": "Inmobiliario", "url": "https://angelesalatorre.com",
     "titulo": "De 2 horas a 5 segundos en responder a cada prospecto",
     "reto": "Los prospectos llegaban por varios canales y la primera respuesta podía tardar horas, justo cuando el interés es más alto.",
     "solucion": "Automatización de punta a punta: calificación de prospectos (lead scoring), CRM y WhatsApp Business API conectados para responder, clasificar y asignar cada contacto al instante.",
     "resultado": "El tiempo de primera respuesta bajó de 2 horas a 5 segundos.", "cifra": "5 s", "cifra_txt": "primera respuesta, antes 2 horas"},
    {"id": "xinhua", "cliente": "Agencia Intiviso para la Agencia de Noticias Xinhua", "sector": "Medios", "url": None,
     "titulo": "Coordinación editorial automatizada para 5 sitios de noticias",
     "reto": "Coordinar la operación editorial de cinco sitios, evaluar notas y producir piezas para redes exigía mucho trabajo manual y repetitivo.",
     "solucion": "Flujo que coordina la operación editorial, evalúa las notas con IA, crea contenido multimedia y publica en redes sociales lo que antes curó y aprobó una persona.",
     "resultado": "Cinco sitios coordinados en un solo flujo, con IA para analizar y producir e intervención humana en cada decisión editorial.", "cifra": "5", "cifra_txt": "sitios de noticias en un solo flujo"},
    {"id": "luz-consulting", "cliente": "Luz Consulting", "sector": "Consultoría y servicios profesionales", "url": "https://luzconsultoria.com.ar/",
     "titulo": "Soluciones de IA para un grupo de consultoras y sus clientes",
     "reto": "Un grupo con empresas de tecnología, recursos humanos y asesoría contable y legal quería ofrecer inteligencia artificial a sus propios clientes.",
     "solucion": "Consultoría para diseñar soluciones de IA para los clientes de Luz Consulting y de sus empresas: Luz Tecnología, Luz Recursos Humanos y Luz Asesoramiento Contable y Legal.",
     "resultado": "Cuatro líneas de negocio con propuestas de IA para sus clientes.", "cifra": "4", "cifra_txt": "empresas del grupo atendidas",
     "contacto": ("Juan Francisco Zurita", "https://www.linkedin.com/in/juanfranciscozurita/"),
     "extra": [("Luz Tecnología", "https://luztecnologia.com.ar/"), ("Luz Recursos Humanos", "https://luzrrhh.com.ar/"), ("Luz Asesoramiento Contable y Legal", "https://luzasesoramientocl.com.ar/")]},
    {"id": "zamiza", "cliente": "Ingeniería Zamiza", "sector": "Industrial y distribución B2B", "url": None,
     "titulo": "Inventario y ventas automatizados de punta a punta",
     "reto": "El inventario y el proceso de ventas dependían de pasos manuales que consumen tiempo y generan errores.",
     "solucion": "Consultoría en automatización de procesos y desarrollo de un sistema de inventario automatizado y de la automatización completa del sistema de ventas.",
     "resultado": "Proyecto en desarrollo.", "cifra": None, "cifra_txt": None, "estado": "En desarrollo"},
    {"id": "tagma", "cliente": "Tagma Academia", "sector": "Educación y capacitación", "url": None,
     "titulo": "Talleres y cursos que se administran solos",
     "reto": "Cada taller implicaba inscribir, atender dudas, cobrar, dar seguimiento y emitir constancias a mano.",
     "solucion": "Sistema de gestión de talleres y cursos con inscripción, atención, comunidad, seguimiento, pago y entrega de certificados automatizados.",
     "resultado": "El ciclo completo de cada curso, de la inscripción al certificado, funciona sin trabajo manual.", "cifra": None, "cifra_txt": None,
     "contacto": ("Gisela Oyanguren", "https://www.linkedin.com/in/gisela-oyanguren-227434148/")},
    {"id": "tecnophone", "cliente": "Grupo Tecnophone", "sector": "Tecnología y servicios financieros", "url": None,
     "titulo": "Plataforma de servicios para entidades financieras",
     "reto": "El grupo buscaba nuevos modelos de negocio de servicios tecnológicos para el sector financiero.",
     "solucion": "Consultoría tecnológica integral, diseño de modelos de negocio de servicios tecnológicos y arquitectura de servicios (Platform as a Service) para entidades financieras.",
     "resultado": "Una arquitectura de plataforma lista para ofrecer servicios a varias entidades financieras.", "cifra": None, "cifra_txt": None,
     "contacto": ("Francisco Velasco", "https://www.linkedin.com/in/francisco-velasco-92563133/")},
]

INDUSTRIAS = [
    ("Distribución industrial y B2B", "Cotizaciones, inventario, pedidos y seguimiento comercial a distribuidores."),
    ("Servicios financieros y cobranza", "Atención, validación y seguimiento de clientes con trazabilidad y control."),
    ("Educación privada y capacitación", "Inscripciones, pagos, seguimiento de alumnos y certificados."),
    ("Salud privada", "Agenda, recordatorios, atención de pacientes y reactivación."),
    ("Medios y marcas", "Producción, aprobación y publicación de contenido en varios canales."),
    ("Inmobiliario", "Respuesta inmediata a prospectos, calificación y CRM. Vertical especializada: iaprop.tech."),
]

FAQ = [
    ("¿Qué significa ser socio de resultados?", "Que antes de empezar acordamos por escrito una métrica y su línea base, y una parte de lo que cobramos depende de lo que logremos: un porcentaje del ahorro comprobado o una comisión sobre los pedidos que generamos. Ganamos cuando tú ganas."),
    ("¿Cuánto cuesta trabajar con Lemoss?", "El diagnóstico gratuito en línea y la sesión de línea base no tienen costo. Después eliges un paquete: una cuota mensual de $6,500 a $18,000 MXN más IVA y una participación en los resultados. A menor cuota, mayor participación. El compromiso mínimo es de tres meses."),
    ("¿Cómo saben qué ventas o ahorros generó Lemoss?", "En ahorro, comparamos el costo real de cada mes contra la línea base firmada antes de empezar. En ventas, solo contamos los pedidos que entran por nuestro agente de WhatsApp, por una liga con seguimiento o con un código. Las ventas que tu equipo cierra por su cuenta no generan comisión."),
    ("¿Cuánto tiempo tarda en verse un resultado?", "El resultado se mide cada mes contra la línea base que fijamos antes de empezar. El compromiso mínimo es de tres meses; después continúas mes a mes."),
    ("¿Para qué tamaño de empresa es?", "Principalmente para empresas medianas, de 20 a 250 colaboradores, con venta consultiva o procesos operativos que hoy dependen de mucho trabajo manual."),
    ("¿Trabajan solo en Mérida?", "No. Nuestra sede está en Mérida y atendemos a empresas de la Ciudad de México y de todo el país de forma remota, con visitas presenciales cuando el proyecto lo requiere."),
    ("¿Tengo que cambiar mis sistemas actuales?", "Normalmente no. Primero conectamos lo que ya usas (CRM, ERP, hojas de cálculo, WhatsApp, correo) y solo proponemos cambiar una herramienta cuando el ahorro lo justifica."),
    ("¿Qué relación tiene Lemoss con timewins.ai?", "timewins.ai es nuestra marca especializada en adopción de inteligencia artificial y en herramientas de IA listas para usar. Lemoss se encarga de la consultoría general en estrategia tecnológica; cuando un proyecto incluye IA, lo implementamos con timewins.ai."),
    ("¿Qué pasa con la información de mi empresa?", "Se usa solo para el proyecto, bajo confidencialidad, con accesos controlados y revisión humana en los procesos críticos. Los detalles están en el aviso de privacidad."),
]


# ---------- Bloques ----------
def cta_final(titulo="¿Platicamos de tu proyecto?", texto="Cuéntanos qué proceso te quita más tiempo o dinero. En una llamada de 30 minutos te decimos si la tecnología puede resolverlo y cómo lo mediríamos."):
    return f"""<section class="sec cta-fin"><div class="wrap"><div class="cta-in rv"><p class="kicker">Siguiente paso</p>
<h2>{titulo}</h2><p class="lead">{texto}</p>
<div class="acciones"><a class="btn" href="{wa()}" rel="noopener">Escríbenos por WhatsApp</a><a class="btn btn-2" href="/autodiagnostico/">Hacer el diagnóstico gratuito</a></div>
</div></div></section>"""


def etapas_html(detalle=False):
    items = ""
    for i, (n, precio, txt, href, link) in enumerate(ETAPAS):
        enlace = f'<p><a href="{href}">{link}</a></p>' if href else ""
        items += f'<li class="card rv"><span class="paso" aria-hidden="true">{i + 1}</span><h3>{n}</h3><p class="precio">{precio}</p><p>{txt}</p>{enlace}</li>'
    return f'<ol class="ruta">{items}</ol>'


def paquetes_html():
    items = ""
    for n, cuota, ahorro, b2b, txt in PAQUETES:
        items += f"""<li class="card rv"><h3>{n}</h3>
<p class="paq-cuota"><strong>{pesos(cuota)}</strong><span>MXN al mes, más IVA</span></p>
<p>{txt}</p>
<ul class="puntos"><li><strong>{ahorro}%</strong> del ahorro comprobado</li><li><strong>{b2b}%</strong> de cada pedido atribuido, en venta a empresas</li><li>Comisión por giro, en venta al consumidor</li></ul></li>"""
    return f'<ul class="paqs">{items}</ul>'


def tabla(cab, filas):
    th = "".join(f'<th scope="col">{c}</th>' for c in cab)
    trs = "".join("<tr>" + f'<th scope="row">{f[0]}</th>' + "".join(f"<td>{c}</td>" for c in f[1:]) + "</tr>" for f in filas)
    return f'<div class="tabla-x rv"><table class="tabla"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>'


def calculo_html():
    nombres = [p[0] for p in PAQUETES]
    ej = []
    for n, cuota, ahorro, _b, _t in PAQUETES:
        part = AHORRO_EJEMPLO * ahorro // 100
        ej.append((n, pesos(cuota), f"{pesos(cuota)} + {pesos(part)} = {pesos(cuota + part)}", pesos(AHORRO_EJEMPLO - cuota - part)))
    t_ahorro = tabla(["Paquete", "Si no hay ahorro pagas", f"Con {pesos(AHORRO_EJEMPLO)} de ahorro pagas", "Te quedan"], ej)
    t_b2b = tabla(["Tipo de venta"] + nombres, [("A otras empresas",) + tuple(f"{p[3]}%" for p in PAQUETES)])
    t_b2c = tabla(["Giro"] + nombres, [(g, f"{a}%", f"{b}%", f"{c}%") for g, a, b, c in GIROS_B2C])
    return f"""
<section class="sec" id="ahorros"><div class="wrap dos">
<div class="rv"><p class="kicker">Reducción de costos</p><h2>Cómo participamos en tus ahorros</h2></div>
<div><ol class="pasos-txt rv">
<li><strong>Línea base.</strong> El costo promedio mensual del proceso antes de empezar. La calculamos contigo en la sesión de línea base y la firmamos ambas partes.</li>
<li><strong>Ahorro del mes.</strong> La línea base menos el costo real de ese mes.</li>
<li><strong>Participación.</strong> El porcentaje de tu paquete sobre ese ahorro, durante {MESES_AHORRO} meses.</li>
</ol>
<p class="muted">Ejemplo con un proceso en el que reducimos {pesos(AHORRO_EJEMPLO)} MXN al mes:</p>
{t_ahorro}
</div>
</div></section>

<section class="sec" id="ventas"><div class="wrap dos">
<div class="rv"><p class="kicker">Más ventas</p><h2>Cómo participamos en tus ventas</h2></div>
<div><p class="rv">Cobramos una comisión sobre cada <strong>pedido atribuido</strong>: un pedido pagado que llegó por un canal que operamos nosotros. Si no hay pedidos, solo pagas la cuota.</p>
{t_b2b}
<p class="muted rv">En venta al consumidor la comisión depende del giro, porque el margen de cada producto es distinto:</p>
{t_b2c}
<h3 class="rv">Qué cuenta como pedido atribuido</h3>
<ul class="puntos rv">
<li><strong>Pedido tomado por el agente en WhatsApp.</strong> Cuando la venta puede cerrarse en el chat: catálogo, recompras y pedidos repetidos.</li>
<li><strong>Liga con seguimiento.</strong> Cuando tu cliente paga en tu tienda o cobro en línea.</li>
<li><strong>Cupón o código.</strong> Cuando la venta se cierra en mostrador, por teléfono o con un vendedor.</li>
</ul>
<p class="muted rv">Las ventas que tu equipo cierra por su cuenta, sin pasar por alguno de estos tres canales, no generan comisión.</p>
</div>
</div></section>"""


def caso_tarjeta(c, completo=False):
    cifra = f'<p class="cifra"><strong>{c["cifra"]}</strong><span>{c["cifra_txt"]}</span></p>' if c.get("cifra") else ""
    estado = f'<p class="estado">{c["estado"]}</p>' if c.get("estado") else ""
    if not completo:
        return f'<article class="caso card rv"><p class="sector">{c["sector"]}</p><h3>{c["titulo"]}</h3><p class="cliente">{c["cliente"]}</p>{cifra}{estado}<p><a class="mas" href="/casos/#{c["id"]}">Ver el caso</a></p></article>'
    link = f' · <a href="{c["url"]}" rel="noopener">{c["url"].replace("https://", "").rstrip("/")}</a>' if c.get("url") else ""
    extra = ""
    if c.get("extra"):
        extra = "<p class='muted'>Empresas del grupo: " + ", ".join(f'<a href="{u}" rel="noopener">{n}</a>' for n, u in c["extra"]) + ".</p>"
    contacto = f'<p class="muted">Referencia: <a href="{c["contacto"][1]}" rel="noopener">{c["contacto"][0]}</a></p>' if c.get("contacto") else ""
    return f"""<article class="caso-largo card rv" id="{c['id']}">
<div class="caso-cab"><p class="sector">{c['sector']}{link}</p><h2>{c['titulo']}</h2><p class="cliente">{c['cliente']}</p>{cifra}{estado}</div>
<dl><dt>Reto</dt><dd>{c['reto']}</dd><dt>Qué hicimos</dt><dd>{c['solucion']}</dd><dt>Resultado</dt><dd>{c['resultado']}</dd></dl>
{extra}{contacto}
</article>"""


def faq_html(items):
    return '<div class="faq">' + "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in items) + "</div>"


def faq_schema(items):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in items]}


def migas(*pares):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate((("Inicio", "/"),) + pares)]}


# ---------- Páginas ----------
# Slider del hero: servicios (s) y modelos de trabajo (m) intercalados
SLIDES = [
    ("s", "Estrategia tecnológica y de negocio", "Hoja de ruta, prioridades y presupuesto con el retorno esperado de cada iniciativa, incluidos nuevos modelos de negocio de servicios tecnológicos.", "Diagnóstico y acompañamiento a dirección", "/servicios/"),
    ("m", "Sesión de línea base", "Revisamos contigo procesos, datos y sistemas, validamos cuánto te cuesta hoy cada proceso y fijamos una métrica con su línea base.", "Sin costo", "/servicios/"),
    ("s", "Procesos y operación", "Inventario, pedidos, cotizaciones y reportes conectados y automatizados de punta a punta, sin capturas manuales.", "ERP, CRM y hojas de cálculo integrados", "/servicios/"),
    ("m", "Paquete Operación", "La cuota más alta y la participación más baja: 10% del ahorro comprobado y 3% de cada pedido atribuido.", "$18,000 MXN al mes", "/servicios/#paquetes"),
    ("s", "Sistemas y plataformas", "Cuando lo que necesitas no existe, diseñamos la arquitectura y construimos la plataforma, de sistemas de gestión a servicios financieros.", "PaaS, APIs y nube", "/servicios/"),
    ("m", "Paquete Equilibrio", "El punto medio entre cuota fija y participación: 25% del ahorro comprobado y 5% de cada pedido atribuido.", "$12,000 MXN al mes", "/servicios/#paquetes"),
    ("s", "Ventas y atención", "Respuesta inmediata a cada prospecto, calificación automática y seguimiento por WhatsApp con un CRM que se actualiza solo.", "De 2 horas a 5 segundos de respuesta", "/casos/#angeles-alatorre"),
    ("m", "Paquete Socio", "La cuota más baja y la participación más alta: 40% del ahorro comprobado y 8% de cada pedido atribuido.", "$6,500 MXN al mes", "/servicios/#paquetes"),
    ("s", "Adopción de inteligencia artificial", "Agentes, contenido y análisis con IA en procesos reales y con supervisión humana, de la mano de timewins.ai.", "Agentes de IA en WhatsApp y web", "/servicios/"),
    ("m", "Resultados que se pueden comprobar", "El ahorro se mide contra una línea base firmada. Las ventas, por los pedidos que entran por nuestro agente, una liga o un código.", "Ganamos cuando tú ganas", "/servicios/#ahorros"),
]

ICONOS = [
    '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>',
    '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>',
    '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
]


def icono(i):
    return f'<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ICONOS[i]}</svg></span>'


def slider_html():
    n = len(SLIDES)
    items = ""
    for i, (tipo, t, d, meta, href) in enumerate(SLIDES):
        tag = '<span class="tag tag-s">Servicio</span>' if tipo == "s" else '<span class="tag tag-m">Modelo de trabajo</span>'
        items += f'<li class="slide" role="group" aria-roledescription="diapositiva" aria-label="{i+1} de {n}">{tag}<h3>{t}</h3><p>{d}</p><div class="meta"><span>{meta}</span><a href="{href}">Ver más</a></div></li>'
    barras = "".join(f'<button type="button" aria-label="Ir a {SLIDES[j][1]}"></button>' for j in range(n))
    flecha = lambda d: f'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{d}"/></svg>'
    return f"""<div class="slider" data-slider role="region" aria-roledescription="carrusel" aria-label="Servicios y modelos de trabajo">
<div class="sl-cab"><strong>Servicios y modelos de trabajo</strong><span data-num>01 / {n:02d}</span></div>
<ul class="sl-pista">{items}</ul>
<div class="sl-pie"><button type="button" class="sl-btn" data-prev aria-label="Anterior">{flecha("M15 18l-6-6 6-6")}</button><div class="sl-barras">{barras}</div><button type="button" class="sl-btn" data-next aria-label="Siguiente">{flecha("M9 18l6-6-6-6")}</button></div>
</div>"""


def home():
    servicios = "".join(f'<li class="card rv">{icono(i)}<h3>{t}</h3><p>{d}</p></li>' for i, (t, d, _) in enumerate(SERVICIOS))
    casos = "".join(caso_tarjeta(c) for c in CASOS[:3])
    inds = "".join(f'<li class="card rv"><strong>{n}</strong><span>{d}</span></li>' for n, d in INDUSTRIAS)
    clientes = "".join(f"<li>{c}</li>" for c in ["Ángeles Alatorre", "Intiviso · Xinhua", "Luz Consulting", "Ingeniería Zamiza", "Tagma Academia", "Grupo Tecnophone"])
    body = f"""
<section class="hero"><div class="wrap hero-in">
<div>
<p class="pill">Lemoss Consulting → Socio de resultados</p>
<div class="hero-rot" data-rot>
<div class="hr-s on"><h1>Crece con menos riesgo y <span class="az">resultados medibles</span></h1><p class="lead lead-xl">Una cuota mínima de operación y participación solo sobre lo que se comprueba.</p></div>
<div class="hr-s"><p class="h1">Vende más, gasta menos, <span class="az">arriesga menos</span></p><p class="lead lead-xl">Una cuota mínima de operación y participación solo sobre lo que se comprueba.</p></div>
<div class="hr-s"><p class="h1">Diagnóstico gratuito y <span class="az">sin compromiso</span></p><p class="lead lead-xl">Medimos cuánto te cuesta hoy cada proceso, antes de que pagues un peso.</p></div>
</div>
<div class="hr-dots" data-rot-dots><button type="button" aria-label="Ver el primer mensaje" aria-current="true"></button><button type="button" aria-label="Ver el segundo mensaje"></button><button type="button" aria-label="Ver el tercer mensaje"></button></div>
<div class="acciones"><a class="btn" href="{wa()}" rel="noopener">Escríbenos por WhatsApp</a><a class="btn btn-2" href="/autodiagnostico/">Diagnóstico gratuito</a></div>
</div>
{slider_html()}
</div></section>

<section class="cifras" aria-label="Resultados"><div class="wrap">
<ul>
<li><strong>5 s</strong><span>primera respuesta a prospectos, antes 2 horas</span></li>
<li><strong>3 meses</strong><span>de compromiso mínimo, después mes a mes</span></li>
<li><strong>$0</strong><span>cuesta el diagnóstico inicial</span></li>
<li><strong>+20 años</strong><span>en tecnología y sistemas críticos</span></li>
</ul>
</div></section>
<div class="wrap clientes"><p>Han trabajado con nosotros</p><ul>{clientes}</ul></div>

<section class="sec"><div class="wrap dos">
<div class="rv"><p class="kicker">Nuestro enfoque</p><h2>El problema rara vez es la herramienta</h2></div>
<div class="rv"><p>La mayoría de los proyectos de tecnología que no dan resultados fallan por otra razón: se eligió un proceso que no estaba listo, nadie midió cuánto costaba antes, o no había un responsable dentro de la empresa.</p>
<p>Por eso trabajamos al revés de lo habitual: primero el costo del problema y la meta, después la herramienta. Y ligamos una parte de lo que cobramos al resultado, para ganar solo cuando tú ganas.</p></div>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Servicios</p><h2>Qué resolvemos</h2></div><a class="mas" href="/servicios/">Ver servicios y precios</a></div>
<ul class="bento">{servicios}</ul>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Cómo trabajamos</p><h2>Tres pasos, y los dos primeros no cuestan</h2></div><p class="lead">Primero medimos cuánto te cuesta hoy el problema. Después eliges cuánto riesgo compartimos.</p></div>
{etapas_html()}
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Paquetes</p><h2>A menor cuota fija, mayor participación</h2></div><a class="mas" href="/servicios/#ahorros">Ver cómo se calcula</a></div>
{paquetes_html()}
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Casos</p><h2>Resultados medidos en proyectos reales</h2></div><a class="mas" href="/casos/">Ver todos los casos</a></div>
<div class="casos">{casos}</div>
</div></section>

<section class="sec"><div class="wrap dos">
<div class="rv"><p class="kicker">Industrias</p><h2>Dónde más rinde</h2><p class="muted">Empresas de 20 a 250 colaboradores con venta consultiva o procesos que dependen de mucho trabajo manual.</p></div>
<ul class="inds">{inds}</ul>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Ecosistema</p><h2>Una familia de marcas</h2></div></div>
<div class="marcas">
<a class="marca card rv" href="https://timewins.ai" rel="noopener"><strong>timewins.ai</strong><span>Adopción de inteligencia artificial y herramientas listas para usar: creador de videos, de sitios web, pautador de anuncios y publicador de redes.</span><em>Visitar →</em></a>
<a class="marca card rv" href="https://iaprop.tech" rel="noopener"><strong>iaprop.tech</strong><span>IA y automatización para inmobiliarias y asesores.</span><em>Visitar →</em></a>
<a class="marca card rv" href="https://estrategia.dental" rel="noopener"><strong>estrategia.dental</strong><span>Captación y atención de pacientes para clínicas dentales.</span><em>Visitar →</em></a>
</div>
</div></section>

<section class="sec"><div class="wrap dos">
<div class="rv"><p class="kicker">Dudas</p><h2>Preguntas frecuentes</h2></div>
{faq_html(FAQ)}
</div></section>
{cta_final()}
"""
    return layout("/", "Lemoss | Consultoría en estrategia tecnológica en México",
                  "Consultoría en estrategia tecnológica por resultados para empresas medianas en México: hoja de ruta, procesos, sistemas, ventas e IA. Sede en Mérida.",
                  body, [ORG, WEBSITE, faq_schema(FAQ)])




def servicios():
    bloques = ""
    for t, d, items in SERVICIOS:
        lis = "".join(f"<li>{x}</li>" for x in items)
        bloques += f'<section class="serv card rv"><h2>{t}</h2><p>{d}</p><ul class="puntos">{lis}</ul></section>'
    criterios = """<ul class="puntos">
<li>La sesión de línea base encontró una cifra clara: sabemos cuánto cuesta o cuánto vende hoy el proceso.</li>
<li>La métrica se puede leer en tus propios sistemas (CRM, ERP, facturación) o en los nuestros.</li>
<li>Hay acceso a los datos necesarios para medirla cada mes.</li>
<li>Las reglas de cálculo quedan firmadas antes de empezar.</li>
</ul>"""
    oferta = {"@context": "https://schema.org", "@type": "OfferCatalog", "name": "Servicios de Lemoss", "itemListElement": [
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Diagnóstico gratuito en línea", "provider": {"@id": SITE + "/#lemoss"}}, "price": "0", "priceCurrency": "MXN"},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Sesión de línea base", "provider": {"@id": SITE + "/#lemoss"}}, "price": 0, "priceCurrency": "MXN"},
    ] + [
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": f"Paquete {n}", "description": f"{txt} Cuota mensual más {ahorro}% del ahorro comprobado y {b2b}% de cada pedido atribuido en venta a empresas.", "provider": {"@id": SITE + "/#lemoss"}},
         "priceSpecification": {"@type": "UnitPriceSpecification", "price": cuota, "priceCurrency": "MXN", "unitText": "mes", "valueAddedTaxIncluded": False}}
        for n, cuota, ahorro, b2b, txt in PAQUETES
    ] + [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": t, "description": d, "provider": {"@id": SITE + "/#lemoss"}}} for t, d, _ in SERVICIOS]}
    body = f"""
<section class="hero hero-sm"><div class="wrap">
<h1>Servicios y precios</h1>
<p class="lead">Cinco áreas donde la tecnología reduce costos o genera ventas de forma medible, y tres paquetes en los que una parte de lo que cobramos depende del resultado.</p>
</div></section>
<section class="sec"><div class="wrap grid-serv">{bloques}</div></section>
<section class="sec"><div class="wrap">
<h2>Cómo trabajamos</h2>
<p class="lead">Tres pasos. Los dos primeros no cuestan y el tercero lo eliges tú.</p>
{etapas_html(True)}
</div></section>
<section class="sec" id="paquetes"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Paquetes</p><h2>A menor cuota fija, mayor participación</h2></div><p class="lead">Precios en pesos mexicanos, más IVA. Compromiso mínimo de tres meses; después, mes a mes.</p></div>
{paquetes_html()}
<p class="muted">La cuota cubre la operación: plataforma, agentes y medición mensual. La pauta publicitaria y los mensajes de WhatsApp los paga cada empresa directamente a su proveedor.</p>
</div></section>
{calculo_html()}
<section class="sec"><div class="wrap dos">
<div><h2>Cuándo ofrecemos el paquete Socio</h2><p class="muted">Es el paquete en el que más riesgo asumimos, así que lo ofrecemos cuando se cumplen estos puntos.</p></div>
{criterios}
</div></section>
{cta_final()}
"""
    return layout("/servicios/", "Servicios y precios de consultoría tecnológica | Lemoss",
                  "Estrategia tecnológica, procesos, sistemas, ventas y adopción de IA. Diagnóstico sin costo y paquetes desde $6,500 MXN al mes más participación en resultados.",
                  body, [ORG, oferta, migas(("Servicios", "/servicios/"))])


def casos():
    body = f"""
<section class="hero hero-sm"><div class="wrap">
<h1>Casos</h1>
<p class="lead">Proyectos reales de ventas, operación, contenido y plataformas. Las cifras son las medidas en cada proyecto; donde no hay cifra, describo el cambio.</p>
</div></section>
<section class="sec"><div class="wrap lista-casos">{"".join(caso_tarjeta(c, True) for c in CASOS)}</div></section>
{cta_final("¿Tu caso se parece a alguno?", "Escríbenos y te contamos cómo lo resolvimos y qué haríamos distinto en tu empresa.")}
"""
    return layout("/casos/", "Casos de tecnología, automatización e IA | Lemoss",
                  "Casos reales: de 2 horas a 5 segundos de respuesta en una inmobiliaria, coordinación editorial con IA para 5 sitios de noticias, plataformas para financieras y más.",
                  body, [ORG, migas(("Casos", "/casos/"))])


# Diagnóstico gratuito: calculadora del costo mensual de cada proceso.
# Las opciones son rangos; el segundo valor es el punto medio que usa la fórmula.
PROCESOS = [
    ("prospectos", "Atender prospectos y clientes nuevos", True),
    ("cotizaciones", "Cotizar y dar seguimiento", True),
    ("cobranza", "Cobranza y facturación", False),
    ("inventario", "Inventario y compras", False),
    ("reportes", "Reportes y captura de datos", False),
    ("soporte", "Soporte y atención posventa", False),
]
CALC_PREGUNTAS = {
    "personas": ("¿Cuántas personas participan?", [("1", 1), ("2 a 3", 2.5), ("4 a 6", 5), ("7 a 10", 8.5), ("Más de 10", 12)]),
    "horas": ("¿Cuántas horas a la semana le dedica cada una?", [("Menos de 5", 3), ("5 a 10", 7.5), ("10 a 20", 15), ("20 a 30", 25), ("Más de 30", 35)]),
    "errores": ("¿Cuántos errores o retrabajos hay al mes?", [("Ninguno o casi ninguno", 0), ("1 a 5", 3), ("6 a 15", 10), ("16 a 30", 23), ("Más de 30", 35)]),
    "costo_error": ("¿Cuánto cuesta corregir cada uno?", [("Menos de $500", 250), ("$500 a $2,000", 1250), ("$2,000 a $5,000", 3500), ("$5,000 a $15,000", 10000), ("Más de $15,000", 20000)]),
    "perdidos": ("¿Cuántos prospectos o solicitudes se quedan sin respuesta o sin seguimiento al mes?", [("Ninguno o casi ninguno", 0), ("1 a 10", 5), ("11 a 30", 20), ("31 a 60", 45), ("Más de 60", 70)]),
    "ticket": ("¿De cuánto es tu venta promedio?", [("Menos de $2,000", 1000), ("$2,000 a $10,000", 6000), ("$10,000 a $50,000", 30000), ("$50,000 a $200,000", 125000), ("Más de $200,000", 250000)]),
    "cierre": ("De cada 10 que sí atiendes, ¿cuántos compran?", [("1", 0.1), ("2 a 3", 0.25), ("4 a 5", 0.45), ("6 o más", 0.65)]),
}
CALC_BASE = ["personas", "horas", "errores", "costo_error"]   # se preguntan en todos los procesos
CALC_VENTAS = ["perdidos", "ticket", "cierre"]                # solo en procesos de venta
CALC_SUELDO = ("¿Cuál es el sueldo mensual promedio de quienes hacen estos procesos?", [("Menos de $10,000", 8000), ("$10,000 a $15,000", 12500), ("$15,000 a $25,000", 20000), ("$25,000 a $40,000", 32500), ("Más de $40,000", 45000)])
# Supuestos de la fórmula; el visitante puede cambiarlos en "Así lo calculamos"
CALC_SUPUESTOS = {"carga": 30, "horas_mes": 190, "margen": 30}
# Qué tan listo está el negocio para fijar una línea base (0 a 2 puntos por pregunta)
CALC_LISTO = [
    ("¿Puedes describir paso a paso cómo se hacen bien estos procesos?", ["No, cada quien lo hace distinto", "Más o menos", "Sí, está claro o documentado"]),
    ("¿Dónde vive la información que usan?", ["En la cabeza de alguien", "En hojas de cálculo o correos", "En un CRM, ERP o base de datos"]),
    ("¿Hay alguien en tu equipo que pueda ser responsable del proyecto?", ["No", "Sí, pero con poco tiempo", "Sí, con tiempo asignado"]),
]
CALC_MAX = 3            # procesos que se pueden medir a la vez
CALC_VECES_CUOTA = 3    # si el costo no rebasa tantas veces la cuota mínima, decimos que un paquete no conviene
DIAG_WEBHOOK = ""       # URL que recibirá cada diagnóstico en JSON; vacío = solo WhatsApp


JS_CALC = r"""(function(){
var C=__CFG__,f=document.getElementById('calc');if(!f)return;
var caja=document.getElementById('calc-procs'),res=document.getElementById('calc-res'),det=document.getElementById('calc-det'),gate=document.getElementById('calc-gate'),err=document.getElementById('calc-err');
var fmt=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
function mxn(n){return fmt.format(Math.round(n/100)*100)}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function campo(nombre,q){var l=el('label','campo'),s=el('select');l.appendChild(el('span',null,q[0]));s.name=nombre;s.required=true;
var o=el('option',null,'Elige una opción');o.value='';s.appendChild(o);
q[1].forEach(function(op,i){var p=el('option',null,op[0]);p.value=i;s.appendChild(p)});l.appendChild(s);return l}
function elegidos(){return [].slice.call(f.querySelectorAll('input[name=proc]:checked')).map(function(c){return c.value})}
function pintar(){var ids=elegidos(),prev={};
[].forEach.call(caja.querySelectorAll('select'),function(s){prev[s.name]=s.value});
caja.textContent='';
C.procesos.forEach(function(p){if(ids.indexOf(p.id)<0)return;
var fs=el('fieldset','calc-proc'),g=el('div','calc-grid');fs.appendChild(el('legend',null,p.nombre));
C.base.concat(p.ventas?C.ventas:[]).forEach(function(k){g.appendChild(campo(p.id+'_'+k,C.preguntas[k]))});
fs.appendChild(g);caja.appendChild(fs)});
[].forEach.call(caja.querySelectorAll('select'),function(s){if(prev[s.name])s.value=prev[s.name]});
[].forEach.call(f.querySelectorAll('input[name=proc]'),function(c){c.disabled=!c.checked&&ids.length>=C.max});
document.getElementById('calc-resto').hidden=!ids.length}
function val(nombre,q){var s=f.querySelector('select[name="'+nombre+'"]');return s&&s.value!==''?q[1][+s.value][1]:null}
function sup(k){var i=document.getElementById('sup-'+k),n=i?parseFloat(i.value):NaN;return isFinite(n)&&n>0?n:C.supuestos[k]}
var ult=null;
function calcular(){var ids=elegidos(),S={carga:sup('carga'),horas_mes:sup('horas_mes'),margen:sup('margen')};
var sueldo=val('sueldo',C.sueldo),hora=sueldo*(1+S.carga/100)/S.horas_mes,filas=[],total=0;
C.procesos.forEach(function(p){if(ids.indexOf(p.id)<0)return;var v={};
C.base.concat(p.ventas?C.ventas:[]).forEach(function(k){v[k]=val(p.id+'_'+k,C.preguntas[k])});
var t=v.personas*v.horas*4.33*hora,e=v.errores*v.costo_error,x=p.ventas?v.perdidos*v.cierre*v.ticket*S.margen/100:0;
filas.push({id:p.id,nombre:p.nombre,tiempo:t,errores:e,ventas:x,total:t+e+x});total+=t+e+x});
filas.sort(function(a,b){return b.total-a.total});
var listo=0;C.listo.forEach(function(_,i){var r=f.querySelector('input[name=listo'+i+']:checked');listo+=r?+r.value:0});
ult={filas:filas,total:total,hora:hora,sueldo:sueldo,S:S,listo:listo};return ult}
function mostrar(){var R=ult;
document.getElementById('r-mes').textContent=mxn(R.total);
document.getElementById('r-anio').textContent=mxn(R.total*12);
document.getElementById('r-diez').textContent=mxn(R.total*.1);
document.getElementById('r-n').textContent=R.filas.length===1?'el proceso que elegiste':'los '+R.filas.length+' procesos que elegiste';
var tb=document.getElementById('r-filas');tb.textContent='';
R.filas.forEach(function(x){var tr=el('tr'),th=el('th',null,x.nombre);th.scope='row';tr.appendChild(th);
[x.tiempo,x.errores,x.ventas,x.total].forEach(function(n){tr.appendChild(el('td',null,mxn(n)))});tb.appendChild(tr)});
document.getElementById('r-hora').textContent=fmt.format(Math.round(R.hora));
var conviene=R.total>=C.minCuota*C.veces;
document.getElementById('r-encaje').textContent=conviene?'Con esta cifra hay espacio para trabajar por resultados. El siguiente paso es la sesión de línea base, sin costo, donde validamos estos números con tus datos reales.':'Con esta cifra, hoy un paquete no te conviene: la cuota se llevaría buena parte de lo que se puede recuperar. Si quieres, lo platicamos por WhatsApp y te orientamos sin costo.';
var max=C.listo.length*2;
document.getElementById('r-listo').textContent=R.listo>=max-1?'Tus procesos están claros, con datos y con un responsable: es el mejor escenario para fijar una línea base que nadie discuta.':R.listo>=max/2?'Vas bien, con un par de huecos por cerrar. Normalmente son documentar cómo se hace bien el proceso o reunir sus datos en un solo lugar.':'Antes de automatizar conviene ordenar: definir cómo se hace bien cada proceso y dónde vive su información. En la sesión te decimos por dónde empezar.'}
function mensaje(n,e){var R=ult,t='Hola, soy '+n+' de '+e+'. Hice el diagnóstico gratuito en lemoss.co. Costo estimado: '+mxn(R.total)+' al mes ('+mxn(R.total*12)+' al año). ';
t+=R.filas.map(function(x){return x.nombre+': '+mxn(x.total)}).join('; ')+'. Quiero agendar mi sesión de línea base.';
return 'https://wa.me/'+C.wa+'?text='+encodeURIComponent(t)}
f.addEventListener('change',function(ev){if(ev.target.name==='proc')pintar()});
f.addEventListener('submit',function(ev){ev.preventDefault();
if(!elegidos().length){err.hidden=false;err.focus();return}err.hidden=true;
if(!f.reportValidity())return;
calcular();mostrar();res.hidden=false;res.scrollIntoView({behavior:'smooth',block:'start'});res.focus({preventScroll:true});
window.dataLayer=window.dataLayer||[];dataLayer.push({event:'diagnostico_completado',costo_mensual:Math.round(ult.total),procesos:ult.filas.length});});
gate.addEventListener('submit',function(ev){ev.preventDefault();if(!gate.reportValidity())return;
var n=gate.nombre.value.trim(),e=gate.empresa.value.trim(),u=mensaje(n,e);
document.getElementById('r-wa').href=u;det.hidden=false;gate.hidden=true;
window.dataLayer=window.dataLayer||[];dataLayer.push({event:'diagnostico_desglose',costo_mensual:Math.round(ult.total),procesos:ult.filas.length});
if(C.webhook){try{fetch(C.webhook,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({nombre:n,empresa:e,total_mensual:Math.round(ult.total),procesos:ult.filas,sueldo:ult.sueldo,supuestos:ult.S,listo:ult.listo,origen:location.href})})}catch(_){}}
window.open(u,'_blank','noopener');det.scrollIntoView({behavior:'smooth',block:'start'})});
[].forEach.call(document.querySelectorAll('[data-sup]'),function(i){i.addEventListener('input',function(){if(!ult)return;calcular();mostrar();
if(!det.hidden)document.getElementById('r-wa').href=mensaje(gate.nombre.value.trim(),gate.empresa.value.trim())})});
pintar();
})();"""


def autodiagnostico():
    checks = "".join(f'<label><input type="checkbox" name="proc" value="{i}"> {n}</label>' for i, n, _v in PROCESOS)
    ops = "".join(f'<option value="{i}">{o}</option>' for i, (o, _v) in enumerate(CALC_SUELDO[1]))
    listo = ""
    for i, (q, resp) in enumerate(CALC_LISTO):
        radios = "".join(f'<label><input type="radio" name="listo{i}" value="{v}" required> {o}</label>' for v, o in enumerate(resp))
        listo += f'<fieldset><legend>{q}</legend>{radios}</fieldset>'
    s = CALC_SUPUESTOS
    cfg = {
        "procesos": [{"id": i, "nombre": n, "ventas": v} for i, n, v in PROCESOS],
        "preguntas": {k: [q, [[o, v] for o, v in r]] for k, (q, r) in CALC_PREGUNTAS.items()},
        "base": CALC_BASE, "ventas": CALC_VENTAS,
        "sueldo": [CALC_SUELDO[0], [[o, v] for o, v in CALC_SUELDO[1]]],
        "listo": [q for q, _r in CALC_LISTO],
        "supuestos": s, "max": CALC_MAX, "minCuota": min(p[1] for p in PAQUETES), "veces": CALC_VECES_CUOTA,
        "wa": WA, "webhook": DIAG_WEBHOOK,
    }
    js = "<script>" + JS_CALC.replace("__CFG__", json.dumps(cfg, ensure_ascii=False)) + "</script>"
    body = f"""
<section class="hero hero-sm"><div class="wrap">
<p class="kicker">Diagnóstico gratuito</p>
<h1>¿Cuánto te cuesta hoy cada proceso?</h1>
<p class="lead">Elige hasta {CALC_MAX} procesos y responde con rangos; no necesitas cifras exactas. Toma unos 5 minutos y el total lo ves al instante.</p>
</div></section>
<section class="sec"><div class="wrap estrecho">
<noscript><p class="resultado">Esta calculadora necesita JavaScript. Si prefieres, <a href="{wa()}" rel="noopener">escríbenos por WhatsApp</a> y la hacemos contigo.</p></noscript>
<form id="calc" class="diag calc" novalidate>
<fieldset><legend><span class="paso" aria-hidden="true">1</span>¿Qué procesos quieres medir? Elige hasta {CALC_MAX}.</legend>{checks}
<p id="calc-err" class="calc-err" hidden tabindex="-1">Elige al menos un proceso para calcular.</p></fieldset>
<div id="calc-resto" hidden>
<div class="calc-cab"><span class="paso" aria-hidden="true">2</span>Cuéntanos de cada proceso</div>
<div id="calc-procs"></div>
<fieldset><legend><span class="paso" aria-hidden="true">3</span>{CALC_SUELDO[0]}</legend>
<label class="campo"><span class="oculto">Sueldo mensual promedio</span><select name="sueldo" required><option value="">Elige una opción</option>{ops}</select></label></fieldset>
<div class="calc-cab"><span class="paso" aria-hidden="true">4</span>Tres preguntas sobre cómo trabajan hoy</div>
{listo}
<button class="btn" type="submit">Calcular mi costo</button>
</div>
</form>

<div id="calc-res" class="resultado calc-res" hidden tabindex="-1" aria-live="polite">
<p class="kicker">Tu resultado</p>
<h2>Hoy <span id="r-n">los procesos que elegiste</span> te cuestan alrededor de</h2>
<p class="calc-total"><span class="calc-costo">Costo</span><strong id="r-mes"></strong><svg class="calc-flecha" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v16m0 0l-7-7m7 7l7-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>al mes</span></p>
<p class="calc-sub">Son <strong id="r-anio"></strong> al año. Cada 10% que se reduzca son <strong id="r-diez"></strong> al mes.</p>
<p class="muted">Es una estimación hecha con tus respuestas. La cifra definitiva se valida con tus datos reales en la sesión de línea base.</p>

<form id="calc-gate" class="calc-gate">
<h3>Ver el desglose por proceso</h3>
<p>Te mostramos cuánto cuesta cada proceso, de dónde sale cada peso y cómo lo calculamos.</p>
<div class="calc-grid">
<label class="campo"><span>Tu nombre</span><input type="text" name="nombre" autocomplete="name" required maxlength="80"></label>
<label class="campo"><span>Tu empresa</span><input type="text" name="empresa" autocomplete="organization" required maxlength="80"></label>
</div>
<button class="btn" type="submit">Ver mi desglose</button>
<p class="muted calc-nota">Al continuar se abre WhatsApp con tu diagnóstico listo para enviárnoslo; así lo recibimos y te respondemos ahí mismo. Consulta el <a href="/privacidad/">aviso de privacidad</a>.</p>
</form>

<div id="calc-det" hidden>
<h3>Desglose por proceso, al mes</h3>
{tabla(["Proceso", "Tiempo del equipo", "Errores y retrabajo", "Ventas que se pierden", "Total"], []).replace("<tbody>", '<tbody id="r-filas">').replace(" rv", "")}
<p id="r-encaje"></p>
<p id="r-listo"></p>
<details class="calc-como"><summary>Así lo calculamos</summary>
<ul class="puntos">
<li><strong>Tiempo del equipo:</strong> personas × horas a la semana × 4.33 semanas × costo por hora. Con tus respuestas, la hora cuesta <strong id="r-hora"></strong>.</li>
<li><strong>Errores y retrabajo:</strong> errores al mes × costo de corregir cada uno.</li>
<li><strong>Ventas que se pierden:</strong> prospectos sin atender × los que suelen comprar × venta promedio × margen.</li>
<li>En cada rango usamos su punto medio.</li>
</ul>
<p class="muted">Puedes cambiar estos supuestos y el resultado se recalcula:</p>
<div class="calc-grid calc-sup">
<label class="campo"><span>Prestaciones e impuestos sobre el sueldo (%)</span><input type="number" id="sup-carga" data-sup value="{s['carga']}" min="0" max="100" step="1" inputmode="decimal"></label>
<label class="campo"><span>Horas trabajadas al mes por persona</span><input type="number" id="sup-horas_mes" data-sup value="{s['horas_mes']}" min="80" max="260" step="1" inputmode="decimal"></label>
<label class="campo"><span>Margen sobre la venta (%)</span><input type="number" id="sup-margen" data-sup value="{s['margen']}" min="1" max="100" step="1" inputmode="decimal"></label>
</div>
</details>
<a id="r-wa" class="btn" href="{wa()}" rel="noopener">Enviar mi diagnóstico y agendar la sesión de línea base</a>
</div>
</div>
</div></section>
"""
    return layout("/autodiagnostico/", "Diagnóstico gratuito: calcula cuánto te cuesta hoy cada proceso | Lemoss",
                  "Calculadora gratuita: elige hasta tres procesos de tu empresa, responde con rangos y conoce cuánto te cuestan hoy al mes y al año en tiempo, errores y ventas perdidas.",
                  body + js, [ORG, migas(("Diagnóstico gratuito", "/autodiagnostico/"))])


def sobre():
    body = f"""
<section class="hero hero-sm"><div class="wrap">
<h1>Nosotros</h1>
<p class="lead">Lemoss es una consultoría en estrategia tecnológica para empresas medianas en México. Trabajas directamente con el consultor que diseña y pone a funcionar tu proyecto, sin intermediarios ni equipos que cambian a mitad del camino.</p>
</div></section>
<section class="sec"><div class="wrap dos">
<div><h2>Experiencia en sistemas críticos</h2></div>
<div>
<p>Lemoss la dirige <strong>Sebastián Lemos</strong>, con más de veinte años en tecnología. Fue director de sistemas y fundó una empresa de servicios de mensajería SMS para bancos, donde se aprende lo que cuesta que un sistema falle cuando de él depende la operación de un cliente.</p>
<p>Hoy aplicamos esa experiencia a la estrategia tecnológica y de negocio de empresas medianas: procesos, sistemas, ventas e inteligencia artificial. La adopción de IA y nuestras herramientas propias las ofrecemos a través de timewins.ai, y tenemos verticales especializadas en iaprop.tech (inmobiliario) y estrategia.dental (salud dental).</p>
<p>Trabajamos desde Mérida con empresas de la Ciudad de México y de todo el país. Nuestra forma de trabajar es simple: medir antes, acordar una meta, probar en pequeño y crecer solo cuando el resultado está a la vista.</p>
<p><a href="{PERSONA_SAME_AS[0]}" rel="noopener">Perfil de Sebastián Lemos en LinkedIn</a></p>
</div>
</div></section>
<section class="sec"><div class="wrap dos">
<div><h2>Con qué trabajamos</h2></div>
<ul class="puntos">
<li>Agentes de IA y modelos de lenguaje (Claude, GPT) aplicados a procesos reales</li>
<li>Automatización con n8n y flujos a la medida</li>
<li>CRM, GoHighLevel y WhatsApp Business API</li>
<li>Bases de datos, APIs e infraestructura propia en la nube</li>
<li>Producción de video y contenido con IA</li>
</ul>
</div></section>
{cta_final()}
"""
    return layout("/sobre/", "Nosotros: consultoría en estrategia tecnológica | Lemoss",
                  "Lemoss, dirigida por Sebastián Lemos, con más de 20 años en tecnología. Consultoría en estrategia tecnológica para empresas medianas en México desde Mérida.",
                  body, [ORG, PERSONA, migas(("Nosotros", "/sobre/"))])


ARTICULOS = [
    {"slug": "5-preguntas-antes-de-automatizar-con-ia", "titulo": "5 preguntas para saber si un proceso vale la pena automatizar con IA",
     "desc": "Antes de pagar cualquier herramienta de IA, revisa volumen, claridad, datos, costo y riesgo del proceso. Una guía práctica para empresas medianas.",
     "fecha": "2026-11-03",
     "cuerpo": """<p>La mayoría de los proyectos de inteligencia artificial que no dan resultados no fallan por la tecnología: fallan porque se eligió un proceso que no estaba listo. Estas cinco preguntas te ayudan a filtrar antes de invertir.</p>
<h2>1. ¿Se repite muchas veces por semana?</h2>
<p>La IA rinde en volumen. Si algo ocurre dos veces al mes, el costo de implementarlo rara vez se recupera. Busca tareas diarias: responder solicitudes, capturar datos, dar seguimiento.</p>
<h2>2. ¿Puedes describir el resultado correcto?</h2>
<p>Si dos personas de tu equipo lo harían distinto, primero estandariza. La IA copia el criterio que le enseñas; no lo inventa.</p>
<h2>3. ¿La información ya está en algún sistema?</h2>
<p>Correos, CRM, hojas de cálculo, WhatsApp. Si los datos viven en la cabeza de una persona, ese es el primer proyecto: sacarlos de ahí.</p>
<h2>4. ¿Sabes cuánto te cuesta hoy?</h2>
<p>Calcula horas al mes por el costo de cada hora, y súmale las ventas que se pierden por responder tarde. Sin esa cifra no podrás saber si la IA funcionó.</p>
<h2>5. ¿Qué pasa si se equivoca?</h2>
<p>Si el riesgo es bajo (clasificar correos, resumir llamadas), automatiza completo. Si es alto (cotizar, cobrar, prometer fechas), que la IA prepare y una persona apruebe.</p>
<h2>Regla práctica</h2>
<p>Con cuatro o cinco respuestas afirmativas tienes un buen candidato para una prueba de 30 días con una meta medible. Con tres, resuelve primero la que falló. Con dos o menos, ordena el proceso antes de pensar en IA.</p>
<p>¿Quieres hacerlo con más detalle? Prueba el <a href="/autodiagnostico/">diagnóstico gratuito, que lo calcula por ti</a>.</p>"""},
    {"slug": "como-medir-si-la-ia-funciona-en-ventas", "titulo": "Cómo saber si la IA le está funcionando a tu equipo comercial",
     "desc": "Cuatro métricas para medir el efecto de la inteligencia artificial en ventas desde la primera semana: tiempo de respuesta, contacto, citas y horas liberadas.",
     "fecha": "2026-11-03",
     "cuerpo": """<p>"Sentimos que va mejor" no es una métrica. Si vas a usar inteligencia artificial en tu área comercial, estas son las cuatro cifras que conviene medir antes y después.</p>
<h2>1. Tiempo de primera respuesta</h2>
<p>Minutos entre que llega un prospecto y alguien le contesta. Es la métrica que más rápido se mueve: en una inmobiliaria pasamos de 2 horas a 5 segundos.</p>
<h2>2. Porcentaje de prospectos contactados</h2>
<p>De cada 100 que llegan, ¿a cuántos se les da seguimiento real? Las fugas más caras suelen estar aquí, no en el cierre.</p>
<h2>3. Tasa de cita o reunión</h2>
<p>De los contactados, ¿cuántos agendan una llamada o visita? Si sube la respuesta pero no las citas, el problema es el mensaje, no la velocidad.</p>
<h2>4. Horas liberadas por vendedor</h2>
<p>Tiempo que el equipo deja de gastar en capturar, copiar y perseguir. Pregunta en qué se usan esas horas: si no van a vender, no hay ganancia.</p>
<h2>Cómo empezar</h2>
<p>Toma hoy una foto de estas cuatro cifras, define cuál quieres mover y cuánto, y revisa a los 30 días contra esa foto, no contra la sensación del equipo. Así medimos en nuestros <a href="/servicios/#paquetes">paquetes de resultados</a>.</p>"""},
    {"slug": "4-errores-al-implementar-ia", "titulo": "4 errores comunes al implementar IA en una empresa mediana (y cómo evitarlos)",
     "desc": "Empezar por la herramienta, automatizar un proceso desordenado, no nombrar responsable y querer todo a la vez. Cómo evitar los errores más comunes con IA.",
     "fecha": "2026-11-03",
     "cuerpo": """<p>Estos son los cuatro errores que más vemos cuando una empresa mediana arranca con inteligencia artificial. Los cuatro se evitan con la misma receta.</p>
<h2>1. Empezar por la herramienta</h2>
<p>"Compramos licencias, ¿ahora qué hacemos con ellas?" Empieza por el problema y su costo; la herramienta se elige al final.</p>
<h2>2. Automatizar un proceso desordenado</h2>
<p>Si el proceso falla con personas, con IA fallará más rápido. Primero ordénalo, después acelera.</p>
<h2>3. No nombrar un responsable</h2>
<p>Un proyecto de IA sin dueño interno se apaga en semanas. Alguien del equipo debe revisar los resultados cada semana.</p>
<h2>4. Querer todo a la vez</h2>
<p>Diez casos de uso en paralelo equivalen a ninguno terminado. Un proceso, una meta, de 30 a 60 días. Si funciona, escalas.</p>
<h2>Lo que sí funciona</h2>
<p>Un problema con costo medible, un proceso claro y un responsable, y una meta pactada antes de crecer. Es la lógica de nuestros <a href="/servicios/#paquetes">paquetes de resultados</a>.</p>"""},
]


def blog_index():
    items = "".join(f'<article class="post"><p class="fecha"><time datetime="{a["fecha"]}">{fecha_es(a["fecha"])}</time></p><h2><a href="/blog/{a["slug"]}/">{a["titulo"]}</a></h2><p>{a["desc"]}</p></article>' for a in sorted(ARTICULOS, key=lambda x: x["fecha"], reverse=True))
    body = f"""
<section class="hero hero-sm"><div class="wrap"><h1>Blog</h1><p class="lead">Guías prácticas para aplicar inteligencia artificial en empresas medianas, sin humo y con números.</p></div></section>
<section class="sec"><div class="wrap estrecho">{items}</div></section>
{cta_final()}"""
    return layout("/blog/", "Blog de IA para empresas | Lemoss", "Guías prácticas para aplicar inteligencia artificial y automatización en empresas medianas de México.", body, [ORG, migas(("Blog", "/blog/"))])


MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def fecha_es(f):
    y, m, d = map(int, f.split("-"))
    return f"{d} de {MESES[m-1]} de {y}"


def articulo(a):
    path = f"/blog/{a['slug']}/"
    sch = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": a["titulo"], "description": a["desc"], "datePublished": a["fecha"], "dateModified": a["fecha"],
           "inLanguage": "es-MX", "mainEntityOfPage": SITE + path, "image": SITE + "/assets/og.png", "author": {"@id": SITE + "/sobre/#sebastian"}, "publisher": {"@id": SITE + "/#lemoss"}}
    body = f"""
<article class="sec art"><div class="wrap estrecho">
<p class="fecha"><a href="/blog/">Blog</a> · <time datetime="{a['fecha']}">{fecha_es(a['fecha'])}</time> · Sebastián Lemos</p>
<h1>{a['titulo']}</h1>
{a['cuerpo']}
</div></article>
{cta_final()}"""
    return layout(path, a["titulo"] + " | Lemoss", a["desc"], body, [sch, PERSONA, ORG, migas(("Blog", "/blog/"), (a["titulo"], path))], og_type="article")


def legal(nombre, src, path, title, desc):
    raw = (ROOT / "legal" / src).read_text()
    cuerpo = raw.split("<main>", 1)[1].split("</main>", 1)[0]
    cuerpo = cuerpo.replace('<a class="back" href="https://lemoss.co/">← Volver a lemoss.co</a>', "")
    cuerpo = cuerpo.replace("https://lemoss.co/privacidad", "/privacidad/").replace("https://lemoss.co/terminos", "/terminos/")
    body = f'<section class="sec art"><div class="wrap estrecho">{cuerpo}</div></section>'
    return layout(path, title, desc, body, [ORG, migas((nombre, path))])


def no_encontrada():
    body = f'<section class="hero hero-sm"><div class="wrap"><h1>Esta página no existe</h1><p class="lead">Puede que el enlace haya cambiado. Vuelve al <a href="/">inicio</a> o escríbenos por <a href="{wa()}">WhatsApp</a>.</p></div></section>'
    return layout("/404", "Página no encontrada | Lemoss", "La página que buscas no existe.", body).replace('<link rel="canonical" href="https://lemoss.co/404">', '<meta name="robots" content="noindex">')


def llms():
    casos = "\n".join(f"- {c['cliente']} ({c['sector']}): {c['titulo']}. {c['resultado']}" for c in CASOS)
    serv = "\n".join(f"- {t}: {d}" for t, d, _ in SERVICIOS)
    etapas = "\n".join(f"{i + 1}. {n} ({p}): {t}" for i, (n, p, t, *_ ) in enumerate(ETAPAS))
    arts = "\n".join(f"- [{a['titulo']}]({SITE}/blog/{a['slug']}/): {a['desc']}" for a in ARTICULOS)
    paqs = "\n".join(f"- {n}: {pesos(cuota)} MXN al mes más IVA, {ahorro}% del ahorro comprobado durante {MESES_AHORRO} meses y {b2b}% de cada pedido atribuido en venta a empresas. {txt}" for n, cuota, ahorro, b2b, txt in PAQUETES)
    giros = "\n".join(f"- {g}: {a}% (Operación), {b}% (Equilibrio), {c}% (Socio)" for g, a, b, c in GIROS_B2C)
    return f"""# Lemoss

> Consultoría en estrategia tecnológica por resultados para empresas medianas (20 a 250 colaboradores) en México. Sede en Mérida, Yucatán; atención en Ciudad de México y todo el país. Dirigida por Sebastián Lemos.

Lemoss (también Lemoss Consulting) se presenta como socio de resultados: aumenta las ventas y reduce los costos de sus clientes con tecnología, y una parte de lo que cobra depende del resultado. Antes de empezar acuerda con cada cliente una métrica y su línea base.

## Servicios
{serv}

## Ruta de trabajo
{etapas}

## Paquetes (compromiso mínimo de tres meses)
{paqs}

## Comisión por pedido atribuido en venta al consumidor, por giro
{giros}

## Cómo se mide
- Ahorro: línea base firmada antes de empezar menos el costo real de cada mes.
- Ventas: pedidos pagados que entran por el agente de WhatsApp, una liga con seguimiento o un código. Las ventas que el equipo del cliente cierra por su cuenta no generan comisión.

## Casos
{casos}

## Marcas relacionadas
- [timewins.ai](https://timewins.ai): marca de Lemoss especializada en adopción de inteligencia artificial y herramientas de IA (creador de videos, creador de sitios web, pautador de anuncios, publicador de redes).
- [iaprop.tech](https://iaprop.tech): IA y automatización para inmobiliarias.
- [estrategia.dental](https://estrategia.dental): captación y atención de pacientes para clínicas dentales.

## Páginas
- [Servicios y precios]({SITE}/servicios/)
- [Casos]({SITE}/casos/)
- [Diagnóstico gratuito]({SITE}/autodiagnostico/)
- [Nosotros]({SITE}/sobre/)
- [Blog]({SITE}/blog/)

## Artículos
{arts}

## Contacto
- WhatsApp: +52 55 2706 9296 (https://wa.me/{WA})
- Correo: {EMAIL}
- Horario: lunes a viernes de 9:00 a 18:00, hora del centro de México
- LinkedIn: {SAME_AS[0]}
"""


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "assets").mkdir(parents=True)
    shutil.copytree(ROOT / "assets", DIST / "assets", dirs_exist_ok=True)
    paginas = {
        "index.html": home(),
        "servicios/index.html": servicios(),
        "casos/index.html": casos(),
        "autodiagnostico/index.html": autodiagnostico(),
        "sobre/index.html": sobre(),
        "blog/index.html": blog_index(),
        "privacidad/index.html": legal("Aviso de privacidad", "privacidad.html", "/privacidad/", "Aviso de privacidad | Lemoss", "Qué datos recaba Lemoss, para qué los usa, cómo protege las cuentas conectadas al Publicador Lemoss y cómo ejercer tus derechos ARCO."),
        "terminos/index.html": legal("Términos y condiciones", "terminos.html", "/terminos/", "Términos y condiciones | Lemoss", "Términos de uso del sitio lemoss.co, de los servicios de consultoría de Lemoss y de la herramienta Publicador Lemoss."),
        "404.html": no_encontrada(),
    }
    for a in ARTICULOS:
        paginas[f"blog/{a['slug']}/index.html"] = articulo(a)
    for ruta, contenido in paginas.items():
        p = DIST / ruta
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(contenido)
    urls = ["/", "/servicios/", "/casos/", "/autodiagnostico/", "/sobre/", "/blog/", "/privacidad/", "/terminos/"] + [f"/blog/{a['slug']}/" for a in ARTICULOS]
    (DIST / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"  <url><loc>{SITE}{u}</loc><lastmod>{HOY}</lastmod></url>\n" for u in urls) + "</urlset>\n")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    (DIST / "llms.txt").write_text(llms())
    shutil.copy(ROOT / "assets" / "favicon.ico", DIST / "favicon.ico")
    print("Páginas:", len(paginas))


if __name__ == "__main__":
    main()
