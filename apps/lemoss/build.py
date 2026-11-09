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

GTM_ID = "GTM-WWSJ3Q4P"  # Google Tag Manager, cuenta Lemoss (contacto@lemoss.co)

NAV = [("/servicios/", "Servicios"), ("/casos/", "Casos"), ("/autodiagnostico/", "Autodiagnóstico"), ("/blog/", "Blog"), ("/sobre/", "Nosotros")]


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
    <a class="logo" href="/" aria-label="Lemoss Consulting, inicio">Lemoss<span>.</span>consulting</a>
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
    "description": "Consultoría en estrategia tecnológica por resultados para empresas medianas en México: hoja de ruta tecnológica, procesos, sistemas, ventas e inteligencia artificial, con diagnóstico, piloto con meta pactada, implementación y operación.",
    "email": EMAIL,
    "telephone": "+52 55 2706 9296",
    "priceRange": "Desde $18,000 MXN",
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
    ("Autodiagnóstico", "Gratis · 10 minutos", "Respondes ocho preguntas sobre tus procesos y sabes de inmediato qué tan listo está un proceso para automatizarse y por dónde conviene empezar.", "/autodiagnostico/", "Hacer el autodiagnóstico"),
    ("Diagnóstico", "Desde $18,000 MXN · se acredita 100%", "Revisamos contigo procesos, datos y sistemas, calculamos cuánto te cuesta hoy cada proceso y te entregamos un plan priorizado con el retorno esperado de cada caso. El monto se descuenta completo si avanzamos al piloto.", None, None),
    ("Piloto con meta pactada", "Desde $45,000 MXN · 30 a 60 días", "Elegimos un proceso, fijamos por escrito una meta medible (por ejemplo tiempo de respuesta, prospectos atendidos o horas ahorradas) y lo ponemos a funcionar con tu equipo real.", None, None),
    ("Implementación", "Proyecto cerrado, honorario + bono o garantía", "Con el piloto probado, escalamos a más procesos o áreas. Tú eliges el modelo: precio cerrado, honorario base más bono por resultado, o garantía de resultado con condiciones por escrito.", None, None),
    ("Operación continua", "Mensualidad", "Monitoreo, ajustes, nuevas automatizaciones y reportes mensuales para que lo implementado siga rindiendo y crezca con tu operación.", None, None),
    ("Socio estratégico", "Participación en resultados", "Para procesos ya probados con una métrica que se puede medir en tus propios sistemas, podemos compartir el resultado en lugar de cobrar honorarios fijos.", None, None),
]

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
    ("¿Qué significa consultoría por resultados?", "Que antes de implementar acordamos por escrito una meta medible, como tiempo de respuesta, prospectos atendidos u horas ahorradas, y el trabajo se evalúa contra esa meta. En etapas avanzadas parte de nuestros honorarios puede depender de alcanzarla."),
    ("¿Cuánto cuesta trabajar con Lemoss?", "El autodiagnóstico es gratis. El diagnóstico empieza en $18,000 MXN más IVA y se acredita al 100% si continuamos. Un piloto con meta pactada empieza en $45,000 MXN más IVA y dura de 30 a 60 días. La implementación se cotiza según el alcance, con precio cerrado, honorario más bono o garantía de resultado."),
    ("¿Cuánto tiempo tarda en verse un resultado?", "El piloto está diseñado para medir un resultado en 30 a 60 días sobre un proceso real de tu empresa."),
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
<div class="acciones"><a class="btn" href="{wa()}" rel="noopener">Escríbenos por WhatsApp</a><a class="btn btn-2" href="/autodiagnostico/">Hacer el autodiagnóstico</a></div>
</div></div></section>"""


def etapas_html(detalle=False):
    items = ""
    for i, (n, precio, txt, href, link) in enumerate(ETAPAS):
        enlace = f'<p><a href="{href}">{link}</a></p>' if href else ""
        items += f'<li class="card rv"><span class="paso" aria-hidden="true">{i}</span><h3>{n}</h3><p class="precio">{precio}</p><p>{txt}</p>{enlace}</li>'
    return f'<ol class="ruta">{items}</ol>'


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
    ("m", "Diagnóstico", "Revisamos procesos, datos y sistemas, calculamos cuánto te cuesta hoy cada proceso y te entregamos un plan priorizado.", "Desde $18,000 MXN · se acredita 100%", "/servicios/"),
    ("s", "Procesos y operación", "Inventario, pedidos, cotizaciones y reportes conectados y automatizados de punta a punta, sin capturas manuales.", "ERP, CRM y hojas de cálculo integrados", "/servicios/"),
    ("m", "Piloto con meta pactada", "Un proceso, una meta medible por escrito y tu equipo real. En 30 a 60 días sabes si funciona.", "Desde $45,000 MXN · 30 a 60 días", "/servicios/"),
    ("s", "Sistemas y plataformas", "Cuando lo que necesitas no existe, diseñamos la arquitectura y construimos la plataforma, de sistemas de gestión a servicios financieros.", "PaaS, APIs y nube", "/servicios/"),
    ("m", "Implementación", "Con el piloto probado escalamos a más procesos. Tú eliges: precio cerrado, honorario más bono o garantía de resultado.", "Proyecto cerrado · bono · garantía", "/servicios/"),
    ("s", "Ventas y atención", "Respuesta inmediata a cada prospecto, calificación automática y seguimiento por WhatsApp con un CRM que se actualiza solo.", "De 2 horas a 5 segundos de respuesta", "/casos/#angeles-alatorre"),
    ("m", "Operación continua", "Monitoreo, ajustes, nuevas automatizaciones y reportes mensuales para que lo implementado siga rindiendo.", "Mensualidad", "/servicios/"),
    ("s", "Adopción de inteligencia artificial", "Agentes, contenido y análisis con IA en procesos reales y con supervisión humana, de la mano de timewins.ai.", "Agentes de IA en WhatsApp y web", "/servicios/"),
    ("m", "Socio estratégico", "En procesos probados y medibles en tus propios sistemas, compartimos el resultado en lugar de cobrar honorarios fijos.", "Participación en resultados", "/servicios/"),
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
<p class="pill">Consultoría estratégica para empresas medianas</p>
<h1>Automatización e IA que se miden en <span class="az">resultados</span></h1>
<p class="lead">Rediseñamos procesos, sistemas y ventas con inteligencia artificial para empresas medianas en México. Antes de empezar acordamos una meta medible y el trabajo se evalúa contra ella.</p>
<div class="acciones"><a class="btn" href="{wa()}" rel="noopener">Escríbenos por WhatsApp</a><a class="btn btn-2" href="/autodiagnostico/">Autodiagnóstico gratis</a></div>
<p class="sello">Sede en Mérida · atención en CDMX y todo México</p>
</div>
{slider_html()}
</div></section>

<section class="cifras" aria-label="Resultados"><div class="wrap">
<ul>
<li><strong>5 s</strong><span>primera respuesta a prospectos, antes 2 horas</span></li>
<li><strong>30–60 días</strong><span>para medir un piloto con meta pactada</span></li>
<li><strong>100%</strong><span>del diagnóstico se acredita si avanzamos</span></li>
<li><strong>+20 años</strong><span>en tecnología y sistemas críticos</span></li>
</ul>
</div></section>
<div class="wrap clientes"><p>Han trabajado con nosotros</p><ul>{clientes}</ul></div>

<section class="sec"><div class="wrap dos">
<div class="rv"><p class="kicker">Nuestro enfoque</p><h2>El problema rara vez es la herramienta</h2></div>
<div class="rv"><p>La mayoría de los proyectos de tecnología que no dan resultados fallan por otra razón: se eligió un proceso que no estaba listo, nadie midió cuánto costaba antes, o no había un responsable dentro de la empresa.</p>
<p>Por eso trabajamos al revés de lo habitual: primero el costo del problema y la meta, después la herramienta. Y avanzamos por etapas, para que solo inviertas más cuando ya viste un resultado.</p></div>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Servicios</p><h2>Qué resolvemos</h2></div><a class="mas" href="/servicios/">Ver servicios y precios</a></div>
<ul class="bento">{servicios}</ul>
</div></section>

<section class="sec"><div class="wrap">
<div class="sec-cab rv"><div><p class="kicker">Modelos de trabajo</p><h2>Una ruta para ganar confianza paso a paso</h2></div><p class="lead">Cada etapa tiene un entregable claro. Si una no te convence, te detienes ahí sin compromiso de seguir.</p></div>
{etapas_html()}
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
<li>El proceso ya pasó por un piloto y su resultado se midió.</li>
<li>La métrica se puede leer en tus propios sistemas (CRM, ERP, facturación), sin depender de mí.</li>
<li>Hay acceso a los datos necesarios para medirla cada mes.</li>
<li>Un plazo mínimo de 12 meses y las reglas de cálculo firmadas antes de empezar.</li>
</ul>"""
    oferta = {"@context": "https://schema.org", "@type": "OfferCatalog", "name": "Servicios de Lemoss", "itemListElement": [
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Autodiagnóstico de procesos", "provider": {"@id": SITE + "/#lemoss"}}, "price": "0", "priceCurrency": "MXN"},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Diagnóstico tecnológico y de procesos", "provider": {"@id": SITE + "/#lemoss"}}, "priceSpecification": {"@type": "PriceSpecification", "minPrice": 18000, "priceCurrency": "MXN", "valueAddedTaxIncluded": False}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Piloto con meta pactada", "provider": {"@id": SITE + "/#lemoss"}}, "priceSpecification": {"@type": "PriceSpecification", "minPrice": 45000, "priceCurrency": "MXN", "valueAddedTaxIncluded": False}},
    ] + [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": t, "description": d, "provider": {"@id": SITE + "/#lemoss"}}} for t, d, _ in SERVICIOS]}
    body = f"""
<section class="hero hero-sm"><div class="wrap">
<h1>Servicios y precios</h1>
<p class="lead">Cinco áreas donde la tecnología ahorra tiempo o genera ventas de forma medible, y una ruta por etapas para que solo inviertas más cuando ya viste un resultado.</p>
</div></section>
<section class="sec"><div class="wrap grid-serv">{bloques}</div></section>
<section class="sec"><div class="wrap">
<h2>Cómo trabajamos</h2>
<p class="lead">Precios de referencia en pesos mexicanos, más IVA. Cada propuesta se firma con su alcance, meta y forma de pago.</p>
{etapas_html(True)}
</div></section>
<section class="sec"><div class="wrap dos">
<div><h2>Criterios para ser socio estratégico</h2><p class="muted">La participación en resultados se ofrece solo cuando se cumplen todos estos puntos.</p></div>
{criterios}
</div></section>
{cta_final()}
"""
    return layout("/servicios/", "Servicios y precios de consultoría tecnológica | Lemoss",
                  "Estrategia tecnológica, procesos, sistemas y plataformas, ventas y adopción de IA. Diagnóstico desde $18,000 MXN y piloto con meta pactada desde $45,000 MXN.",
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


PREGUNTAS = [
    ("¿Cuántas veces a la semana se repite el proceso que quieres mejorar?", ["Menos de 5", "Entre 5 y 50", "Más de 50"]),
    ("¿Puedes describir paso a paso cómo se hace bien?", ["No, cada quien lo hace distinto", "Más o menos", "Sí, está claro o documentado"]),
    ("¿La información que usa ese proceso ya está en algún sistema?", ["Vive en la cabeza de alguien", "En hojas de cálculo o correos", "En un CRM, ERP o base de datos"]),
    ("¿Sabes cuánto te cuesta hoy ese proceso al mes?", ["No tengo idea", "Tengo una idea aproximada", "Sí, lo tengo calculado"]),
    ("¿Qué pasa si la automatización se equivoca una vez?", ["Sería grave (cobros, contratos)", "Molesto pero corregible", "Poco impacto (clasificar, resumir)"]),
    ("¿Hay alguien en tu equipo que pueda ser responsable del proyecto?", ["No", "Sí, pero con poco tiempo", "Sí, con tiempo asignado"]),
    ("¿Qué tan rápido responden hoy a un prospecto o cliente nuevo?", ["Más de un día", "Unas horas", "Menos de una hora"]),
    ("¿Qué tan urgente es resolverlo?", ["Puede esperar", "Este trimestre", "Este mes"]),
]


def autodiagnostico():
    preg = ""
    for i, (q, ops) in enumerate(PREGUNTAS):
        radios = "".join(f'<label><input type="radio" name="p{i}" value="{v}" required> {o}</label>' for v, o in enumerate(ops))
        preg += f'<fieldset><legend><span class="paso" aria-hidden="true">{i+1}</span>{q}</legend>{radios}</fieldset>'
    js = """<script>
(function(){var f=document.getElementById('diag'),r=document.getElementById('res');
f.addEventListener('submit',function(ev){ev.preventDefault();var t=0,n=%d;for(var i=0;i<n;i++){var s=f.querySelector('input[name=p'+i+']:checked');if(!s){f.querySelector('input[name=p'+i+']').focus();return}t+=+s.value}
var pct=Math.round(t/(n*2)*100),h,p;
if(pct>=70){h='Tu proceso está listo para un piloto';p='Tiene volumen, está claro y hay datos. Es el escenario ideal para una prueba de 30 a 60 días con una meta medible.'}
else if(pct>=45){h='Vas bien, con un par de huecos por cerrar';p='Conviene resolver primero las respuestas más bajas (normalmente documentar el proceso o calcular su costo). Un diagnóstico te dice exactamente cuáles.'}
else{h='Primero conviene ordenar el proceso';p='Antes de invertir en tecnología, define cómo se hace bien y dónde vive la información. Te podemos orientar en una llamada sin costo.'}
r.querySelector('h2').textContent=h+' ('+pct+'%%)';r.querySelector('p').textContent=p;
var msg='Hola, hice el autodiagnóstico en lemoss.co y obtuve '+pct+'%%: '+h+'. Quiero platicar.';
r.querySelector('a').href='https://wa.me/%s?text='+encodeURIComponent(msg);r.hidden=false;r.focus();});})();
</script>""" % (len(PREGUNTAS), WA)
    body = f"""
<section class="hero hero-sm"><div class="wrap">
<h1>Autodiagnóstico de procesos</h1>
<p class="lead">Piensa en un proceso concreto de tu empresa (atender prospectos, cotizar, inventario, cobranza) y responde ocho preguntas. Toma 5 minutos y no guardamos tus respuestas.</p>
</div></section>
<section class="sec"><div class="wrap estrecho">
<form id="diag" class="diag">{preg}<button class="btn" type="submit">Ver mi resultado</button></form>
<div id="res" class="resultado" hidden tabindex="-1" aria-live="polite"><h2></h2><p></p><a class="btn" href="{wa()}" rel="noopener">Platicarlo por WhatsApp</a></div>
</div></section>
"""
    return layout("/autodiagnostico/", "Autodiagnóstico gratis: ¿tu proceso está listo para automatizarse? | Lemoss",
                  "Ocho preguntas para saber si un proceso de tu empresa está listo para automatizarse, con o sin inteligencia artificial, y por dónde empezar. Gratis, sin registro.",
                  body + js, [ORG, migas(("Autodiagnóstico", "/autodiagnostico/"))])


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
<p>¿Quieres hacerlo con más detalle? Prueba el <a href="/autodiagnostico/">autodiagnóstico de ocho preguntas</a>.</p>"""},
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
<p>Toma hoy una foto de estas cuatro cifras, define cuál quieres mover y cuánto, y revisa a los 30 días contra esa foto, no contra la sensación del equipo. Así funciona un <a href="/servicios/">piloto con meta pactada</a>.</p>"""},
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
<p>Un problema con costo medible, un proceso claro y un responsable, y una prueba corta con meta pactada antes de crecer. Es exactamente la <a href="/servicios/">ruta por etapas</a> con la que trabajamos.</p>"""},
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
    etapas = "\n".join(f"{i}. {n} ({p}): {t}" for i, (n, p, t, *_ ) in enumerate(ETAPAS))
    arts = "\n".join(f"- [{a['titulo']}]({SITE}/blog/{a['slug']}/): {a['desc']}" for a in ARTICULOS)
    return f"""# Lemoss

> Consultoría en estrategia tecnológica por resultados para empresas medianas (20 a 250 colaboradores) en México. Sede en Mérida, Yucatán; atención en Ciudad de México y todo el país. Dirigida por Sebastián Lemos.

Lemoss (también Lemoss Consulting) acuerda con cada cliente una meta medible antes de implementar y trabaja por etapas, desde un autodiagnóstico gratuito hasta la participación en resultados.

## Servicios
{serv}

## Ruta de trabajo y precios de referencia (MXN, más IVA)
{etapas}

## Casos
{casos}

## Marcas relacionadas
- [timewins.ai](https://timewins.ai): marca de Lemoss especializada en adopción de inteligencia artificial y herramientas de IA (creador de videos, creador de sitios web, pautador de anuncios, publicador de redes).
- [iaprop.tech](https://iaprop.tech): IA y automatización para inmobiliarias.
- [estrategia.dental](https://estrategia.dental): captación y atención de pacientes para clínicas dentales.

## Páginas
- [Servicios y precios]({SITE}/servicios/)
- [Casos]({SITE}/casos/)
- [Autodiagnóstico]({SITE}/autodiagnostico/)
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
