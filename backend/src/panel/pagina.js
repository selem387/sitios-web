// Pantalla del panel del dueño: acceso sin contraseña y edición de todo el contenido de su página.
// Sin marca de la empresa: solo el nombre del negocio. Celular primero.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function paginaPanel({ base = '', negocio = '', google = false } = {}) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Administrar ${esc(negocio || 'mi página')}</title>
<style>
:root{--bg:#F6F5F2;--card:#FFFFFF;--fg:#1C1B19;--soft:#5F5B54;--bor:#E2DFD8;--p:#1F5F4A;--on:#FFFFFF;--ok:#1F7A4C;--bad:#B3261E;--foco:#2F6FDE;--r:14px}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1E1E1C;--fg:#F1EFEA;--soft:#B5B0A6;--bor:#34332F;--p:#5FC2A0;--on:#0E1F19;--ok:#6FD49E;--bad:#FF8A80}}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.w{max-width:760px;margin:0 auto;padding:16px 16px 80px}
h1{font-size:24px;line-height:1.2;letter-spacing:-.01em}h2{font-size:18px}
.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--bor)}
.top .w{display:flex;align-items:center;gap:12px;padding-top:12px;padding-bottom:12px}.top b{flex:1;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
a{color:var(--p)}.lnk{font-weight:600;text-decoration:none;white-space:nowrap}
.card{background:var(--card);border:1px solid var(--bor);border-radius:var(--r);margin-top:14px}
details.card>summary{list-style:none;cursor:pointer;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:650;font-size:17px;min-height:56px}
details.card>summary::-webkit-details-marker{display:none}details.card>summary::after{content:"";width:9px;height:9px;border-right:2px solid var(--soft);border-bottom:2px solid var(--soft);transform:rotate(45deg);transition:transform .15s;flex:0 0 auto}
details[open].card>summary::after{transform:rotate(-135deg)}.sumtxt small{display:block;font-weight:400;color:var(--soft);font-size:14px}
.cuerpo{padding:0 18px 18px}
label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}label .op{font-weight:400;color:var(--soft)}
input[type=text],input[type=email],input[type=tel],input[type=url],textarea,select{width:100%;font:inherit;color:var(--fg);background:var(--bg);border:1px solid var(--bor);border-radius:10px;padding:12px;min-height:48px}
textarea{min-height:96px;resize:vertical}input:focus-visible,textarea:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--foco);outline-offset:2px}
.check{display:flex;align-items:center;gap:10px;font-weight:500;margin-top:12px}.check input{width:22px;height:22px;accent-color:var(--p)}
button{font:inherit;font-weight:650;border-radius:999px;border:1px solid transparent;padding:12px 20px;min-height:48px;cursor:pointer}
.btn{background:var(--p);color:var(--on)}.btn:disabled{opacity:.55;cursor:default}.sec2{background:transparent;color:var(--fg);border-color:var(--bor)}
.mini{min-height:40px;padding:8px 14px;font-size:14px}.ico{min-width:40px;min-height:40px;padding:0;display:inline-grid;place-items:center}
.fila{border:1px solid var(--bor);border-radius:12px;padding:4px 14px 14px;margin-top:12px;background:var(--bg)}
.fila .acc{display:flex;gap:6px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}
.pie{display:flex;align-items:center;gap:14px;margin-top:18px;flex-wrap:wrap}.msg{font-size:15px}.msg.ok{color:var(--ok)}.msg.bad{color:var(--bad)}
.fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:14px}
.foto{border:1px solid var(--bor);border-radius:12px;overflow:hidden;background:var(--bg);display:flex;flex-direction:column}.foto img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#ddd}
.foto.off img{opacity:.35;filter:grayscale(1)}.foto.es-logo img{object-fit:contain;background:#fff;padding:10px}.foto .acc{padding:8px;display:grid;gap:6px}.foto .etq{font-size:12px;color:var(--soft);padding:6px 8px 0}
.tag{display:inline-block;font-size:12px;font-weight:700;background:var(--p);color:var(--on);border-radius:999px;padding:2px 8px;margin:6px 8px 0}
.subir{display:grid;gap:10px;margin-top:16px;padding:14px;border:1px dashed var(--bor);border-radius:12px}
.login{max-width:420px;margin:8vh auto 0}.login p{color:var(--soft);margin-top:8px}.login .btn,.login .sec2{width:100%;margin-top:14px}
.o{display:flex;align-items:center;gap:12px;color:var(--soft);margin:20px 0 4px;font-size:14px}.o::before,.o::after{content:"";flex:1;border-top:1px solid var(--bor)}
.g{display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;color:var(--fg);border:1px solid var(--bor);border-radius:999px;min-height:48px;font-weight:650;margin-top:10px;background:var(--card)}
.oculto{display:none!important}.ayuda{color:var(--soft);font-size:14px;margin-top:6px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body>
<div id="acceso" class="w oculto"><div class="login">
  <h1>Administra tu página</h1>
  <p>${esc(negocio)}</p>
  <form id="f-correo">
    <label for="email">Tu correo</label>
    <input id="email" type="email" autocomplete="email" inputmode="email" required>
    <p class="ayuda" id="pista"></p>
    <button class="btn" type="submit">Mandarme un código</button>
  </form>
  <form id="f-codigo" class="oculto">
    <label for="codigo">Código de 6 números</label>
    <input id="codigo" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required>
    <p class="ayuda">Te lo mandamos a tu correo. Revisa también spam o promociones. Vence en 10 minutos.</p>
    <button class="btn" type="submit">Entrar</button>
    <button class="sec2" type="button" id="otro">Mandarme otro código</button>
  </form>
  ${google ? `<div class="o">o</div><a class="g" href="${esc(base)}/admin/google"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar con Google</a>` : ''}
  <p class="msg" id="m-acceso" role="status" aria-live="polite"></p>
</div></div>

<div id="panel" class="oculto">
  <div class="top"><div class="w"><b>${esc(negocio)}</b><a class="lnk" id="ver" target="_blank" rel="noopener">Ver mi página</a><button class="sec2 mini" id="salir" type="button">Salir</button></div></div>
  <div class="w"><p class="ayuda">Lo que guardes aparece en tu página al momento. Toca una sección para editarla.</p><div id="secciones"></div></div>
</div>

<script>
(function(){
var BASE=${JSON.stringify(base)};var API=BASE+'/admin/api';
function $(s,r){return (r||document).querySelector(s)}
function el(t,a,h){var e=document.createElement(t);if(a)for(var k in a){if(k==='class')e.className=a[k];else if(k==='text')e.textContent=a[k];else e.setAttribute(k,a[k])}if(h)h.forEach(function(x){if(x)e.appendChild(typeof x==='string'?document.createTextNode(x):x)});return e}
function api(m,u,b,form){var o={method:m,headers:{'x-panel':'1'},credentials:'same-origin'};if(form){o.body=form}else if(b!==undefined){o.headers['content-type']='application/json';o.body=JSON.stringify(b)}
 return fetch(API+u,o).then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(r.status===401&&u!=='/entrar'){mostrarAcceso();throw new Error(j.error||'Vuelve a entrar')}if(!r.ok)throw new Error(j.error||'No se pudo guardar');return j})})}
function aviso(n,t,ok){n.textContent=t;n.className='msg '+(ok?'ok':'bad')}

/* ---------- Acceso ---------- */
var correo='';
function mostrarAcceso(){$('#panel').classList.add('oculto');$('#acceso').classList.remove('oculto')}
$('#f-correo').onsubmit=function(ev){ev.preventDefault();correo=$('#email').value.trim();var b=ev.target.querySelector('button');b.disabled=true;
 api('POST','/codigo',{email:correo}).then(function(){$('#f-correo').classList.add('oculto');$('#f-codigo').classList.remove('oculto');aviso($('#m-acceso'),'Si ese correo administra esta página, ya te llegó un código.',true);$('#codigo').focus()})
 .catch(function(e){aviso($('#m-acceso'),e.message,false)}).finally(function(){b.disabled=false})};
$('#otro').onclick=function(){$('#f-codigo').classList.add('oculto');$('#f-correo').classList.remove('oculto');$('#m-acceso').textContent=''};
$('#f-codigo').onsubmit=function(ev){ev.preventDefault();var b=ev.target.querySelector('button');b.disabled=true;
 api('POST','/entrar',{email:correo,codigo:$('#codigo').value}).then(cargar).catch(function(e){aviso($('#m-acceso'),e.message,false)}).finally(function(){b.disabled=false})};
$('#salir').onclick=function(){api('POST','/salir',{}).finally(function(){location.reload()})};
if(/error=google/.test(location.search))aviso($('#m-acceso'),'No se pudo entrar con Google. Pide un código a tu correo.',false);

/* ---------- Editor ---------- */
var C={},FOTOS=[];
var TIPOS={logo:'Logo',foto_local:'Tu local o espacio',foto_trabajo:'Tu trabajo',foto_producto:'Producto',foto_equipo:'Tu equipo',foto_fundador:'Tú',menu:'Menú',catalogo:'Catálogo'};
function campo(def,val,on){var id='c'+Math.random().toString(36).slice(2,9);var inp;
 if(def.t==='check'){inp=el('input',{type:'checkbox',id:id});inp.checked=!!val;inp.onchange=function(){on(inp.checked)};return el('label',{class:'check',for:id},[inp,def.l])}
 inp=def.t==='area'?el('textarea',{id:id}):el('input',{type:def.t||'text',id:id});inp.value=val==null?'':val;if(def.ph)inp.placeholder=def.ph;if(def.max)inp.maxLength=def.max;if(def.im)inp.inputMode=def.im;
 inp.oninput=function(){on(inp.value)};return el('div',null,[el('label',{for:id},[def.l,def.op?el('span',{class:'op',text:' (opcional)'}):null]),inp])}
function listaEd(cont,items,defs,nuevo,etq){cont.innerHTML='';items.forEach(function(it,i){var f=el('div',{class:'fila'});defs.forEach(function(d){f.appendChild(campo(d,it[d.k],function(v){it[d.k]=v}))});
 var up=el('button',{type:'button',class:'sec2 ico',"aria-label":'Subir'},['↑']),dn=el('button',{type:'button',class:'sec2 ico',"aria-label":'Bajar'},['↓']),rm=el('button',{type:'button',class:'sec2 mini'},['Quitar']);
 up.disabled=i===0;dn.disabled=i===items.length-1;up.onclick=function(){items.splice(i-1,0,items.splice(i,1)[0]);listaEd(cont,items,defs,nuevo,etq)};dn.onclick=function(){items.splice(i+1,0,items.splice(i,1)[0]);listaEd(cont,items,defs,nuevo,etq)};
 rm.onclick=function(){if(confirm('¿Quitar '+(it[defs[0].k]||etq)+'?')){items.splice(i,1);listaEd(cont,items,defs,nuevo,etq)}};f.appendChild(el('div',{class:'acc'},[up,dn,rm]));cont.appendChild(f)});
 var add=el('button',{type:'button',class:'sec2 mini'},['+ Agregar '+etq]);add.onclick=function(){items.push(nuevo());listaEd(cont,items,defs,nuevo,etq);var fs=cont.querySelectorAll('.fila');var u=fs[fs.length-1];if(u)u.querySelector('input,textarea').focus()};cont.appendChild(el('div',{class:'pie'},[add]))}
function seccion(id,titulo,sub,construir,guardar){var cuerpo=el('div',{class:'cuerpo'});var msg=el('span',{class:'msg',role:'status',"aria-live":'polite'});var b=el('button',{type:'button',class:'btn'},['Guardar']);
 b.onclick=function(){b.disabled=true;msg.textContent='Guardando…';msg.className='msg';api('PUT','/contenido/'+id,guardar()).then(function(r){C[id]=r.contenido;aviso(msg,'Guardado. Ya se ve en tu página.',true)}).catch(function(e){aviso(msg,e.message,false)}).finally(function(){b.disabled=false})};
 construir(cuerpo);cuerpo.appendChild(el('div',{class:'pie'},[b,msg]));
 return el('details',{class:'card',id:'s-'+id},[el('summary',null,[el('span',{class:'sumtxt'},[titulo,sub?el('small',{text:sub}):null])]),cuerpo])}

function pintar(){var S=$('#secciones');S.innerHTML='';var k=C;
 if(k.es_menu){var ms=JSON.parse(JSON.stringify(k.menu.secciones||[]));S.appendChild(seccion('menu','Menú y precios','Secciones, platillos y bebidas',function(c){var cont=el('div');c.appendChild(cont);
   function pinta(){cont.innerHTML='';ms.forEach(function(s,i){var f=el('div',{class:'fila'});f.appendChild(campo({l:'Nombre de la sección',ph:'Ej. Bebidas calientes'},s.seccion,function(v){s.seccion=v}));var it=el('div');f.appendChild(it);
     listaEd(it,s.items,[{k:'nombre',l:'Nombre'},{k:'precio',l:'Precio',ph:'$55',op:1},{k:'descripcion',l:'Descripción',op:1}],function(){return{nombre:'',precio:'',descripcion:''}},'platillo');
     var rm=el('button',{type:'button',class:'sec2 mini'},['Quitar sección']);rm.onclick=function(){if(confirm('¿Quitar la sección '+(s.seccion||'')+'?')){ms.splice(i,1);pinta()}};f.appendChild(el('div',{class:'acc'},[rm]));cont.appendChild(f)});
     var add=el('button',{type:'button',class:'sec2 mini'},['+ Agregar sección']);add.onclick=function(){ms.push({seccion:'',items:[{nombre:'',precio:'',descripcion:''}]});pinta()};cont.appendChild(el('div',{class:'pie'},[add]))}pinta()},function(){return{secciones:ms}}))}
 else{var of=JSON.parse(JSON.stringify(k.oferta));S.appendChild(seccion('oferta','Productos, servicios y precios','Del más importante al menos importante',function(c){c.appendChild(campo({t:'check',l:'Mostrar precios en mi página'},of.mostrar_precios,function(v){of.mostrar_precios=v}));var cont=el('div');c.appendChild(cont);
   listaEd(cont,of.items,[{k:'nombre',l:'Nombre'},{k:'descripcion_corta',l:'Descripción corta',t:'area',op:1,max:220},{k:'precio_o_rango',l:'Precio',ph:'$1,200 o desde $800',op:1},{k:'destacado',l:'Destacarlo',t:'check'}],function(){return{nombre:'',descripcion_corta:'',precio_o_rango:'',destacado:false}},'producto o servicio')},function(){return of}))}
 var pr={texto:k.promocion.texto};S.appendChild(seccion('promocion','Promoción','Se muestra arriba en tu página; déjala vacía para quitarla',function(c){c.appendChild(campo({l:'Texto de la promoción',ph:'Ej. 2x1 en cafés de lunes a miércoles',max:200,op:1},pr.texto,function(v){pr.texto=v}))},function(){return pr}));
 var ct=JSON.parse(JSON.stringify(k.contacto));S.appendChild(seccion('contacto','Horarios y contacto',null,function(c){[{k:'horarios',l:'Horarios',t:'area',ph:'Lunes a viernes de 9 a 19 h'},{k:'whatsapp',l:'WhatsApp',t:'tel',im:'tel',ph:'9991234567'},{k:'telefono',l:'Teléfono',t:'tel',im:'tel',op:1},{k:'email',l:'Correo que se muestra en tu página',t:'email',op:1},{k:'direccion',l:'Dirección',op:1},{k:'google_maps_url',l:'Liga de Google Maps',t:'url',op:1},{k:'mensaje_whatsapp_inicial',l:'Mensaje que aparece listo al escribirte por WhatsApp',op:1}].forEach(function(d){c.appendChild(campo(d,ct[d.k],function(v){ct[d.k]=v}))});
   c.appendChild(el('p',{class:'ayuda',text:'Cambiar el correo de tu página no cambia el correo con el que entras a administrarla.'}))},function(){return ct}));
 var rd=JSON.parse(JSON.stringify(k.redes||{}));S.appendChild(seccion('redes','Redes sociales','Tu usuario o la liga de tu perfil',function(c){[['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],['youtube','YouTube'],['linkedin','LinkedIn']].forEach(function(r){c.appendChild(campo({l:r[1],op:1,ph:'@tunegocio'},rd[r[0]],function(v){rd[r[0]]=v}))})},function(){return rd}));
 S.appendChild(fotosSec());
 var po=JSON.parse(JSON.stringify(k.portada));S.appendChild(seccion('portada','Textos de la primera pantalla','Lo primero que ve la gente',function(c){c.appendChild(campo({l:'Título',max:90},po.titular,function(v){po.titular=v}));c.appendChild(campo({l:'Frase debajo del título',t:'area',max:200},po.subtitulo,function(v){po.subtitulo=v}));c.appendChild(campo({l:'Texto del botón',max:30,ph:'Escríbeme por WhatsApp'},po.cta,function(v){po.cta=v}))},function(){return po}));
 var hi={texto:k.historia.texto};S.appendChild(seccion('historia','Tu historia','Quién eres y cómo empezó tu negocio',function(c){c.appendChild(campo({l:'Historia',t:'area',max:1200},hi.texto,function(v){hi.texto=v}))},function(){return hi}));
 var fq=JSON.parse(JSON.stringify(k.faq));S.appendChild(seccion('faq','Preguntas frecuentes',null,function(c){var cont=el('div');c.appendChild(cont);listaEd(cont,fq.items,[{k:'pregunta',l:'Pregunta'},{k:'respuesta',l:'Respuesta',t:'area'}],function(){return{pregunta:'',respuesta:''}},'pregunta')},function(){return fq}));
 var ts=JSON.parse(JSON.stringify(k.testimonios));S.appendChild(seccion('testimonios','Lo que dicen tus clientes',null,function(c){var cont=el('div');c.appendChild(cont);listaEd(cont,ts.items,[{k:'texto',l:'Comentario',t:'area'},{k:'nombre',l:'Nombre',op:1},{k:'fuente',l:'Dónde lo dijo',op:1,ph:'Google, Facebook…'}],function(){return{texto:'',nombre:'',fuente:''}},'comentario')},function(){return ts}))}

function fotosSec(){var cuerpo=el('div',{class:'cuerpo'});var grid=el('div',{class:'fotos'});var msg=el('p',{class:'msg',role:'status',"aria-live":'polite'});
 function pinta(){grid.innerHTML='';FOTOS.forEach(function(f){var c=el('div',{class:'foto'+(f.usar?'':' off')+(f.tipo==='logo'?' es-logo':'')});c.appendChild(el('img',{src:f.url,alt:f.descripcion||TIPOS[f.tipo]||'Foto',loading:'lazy'}));
   if(f.portada)c.appendChild(el('span',{class:'tag',text:'Portada'}));c.appendChild(el('span',{class:'etq',text:(TIPOS[f.tipo]||'Foto')+(f.usar?'':' · oculta')}));
   var acc=el('div',{class:'acc'});var t=el('button',{type:'button',class:'sec2 mini'},[f.usar?'Ocultar':'Mostrar']);t.onclick=function(){cambia(f.id,{usar:!f.usar})};acc.appendChild(t);
   if(!C.es_menu&&f.tipo!=='logo'&&!f.portada){var p=el('button',{type:'button',class:'sec2 mini'},['Usar de portada']);p.onclick=function(){cambia(f.id,{portada:true})};acc.appendChild(p)}c.appendChild(acc);grid.appendChild(c)})}
 function cambia(id,b){msg.textContent='Guardando…';msg.className='msg';api('PATCH','/fotos/'+id,b).then(function(r){FOTOS=r.fotos;pinta();aviso(msg,'Listo. Ya se ve en tu página.',true)}).catch(function(e){aviso(msg,e.message,false)})}
 var sel=el('select',{id:'tipo-foto'});Object.keys(TIPOS).forEach(function(k){sel.appendChild(el('option',{value:k,text:TIPOS[k]}))});sel.value='foto_trabajo';
 var arch=el('input',{type:'file',accept:'image/jpeg,image/png,image/webp',id:'archivo'});var sb=el('button',{type:'button',class:'btn'},['Subir foto']);
 sb.onclick=function(){if(!arch.files[0]){aviso(msg,'Elige una foto primero',false);return}var fd=new FormData();fd.append('archivo',arch.files[0]);fd.append('tipo',sel.value);sb.disabled=true;msg.textContent='Subiendo y acomodando tu foto… puede tardar unos segundos';msg.className='msg';
   api('POST','/fotos',undefined,fd).then(function(r){FOTOS=r.fotos;pinta();arch.value='';aviso(msg,sel.value==='logo'?'Logo cambiado. Ya se ve en tu página.':'Foto agregada. Ya se ve en tu página.',true)}).catch(function(e){aviso(msg,e.message,false)}).finally(function(){sb.disabled=false})};
 cuerpo.appendChild(el('p',{class:'ayuda',text:'Oculta las que ya no quieras mostrar o elige cuál va en la portada. Para cambiar tu logo, sube el nuevo y elige "Logo".'}));cuerpo.appendChild(grid);
 cuerpo.appendChild(el('div',{class:'subir'},[el('label',{for:'archivo',text:'Agregar una foto'}),arch,el('label',{for:'tipo-foto',text:'¿Qué es?'}),sel,sb]));cuerpo.appendChild(msg);pinta();
 return el('details',{class:'card',id:'s-fotos'},[el('summary',null,[el('span',{class:'sumtxt'},['Fotos y logo',el('small',{text:'Agrega, oculta o elige la de portada'})])]),cuerpo])}

function cargar(){return api('GET','/contenido').then(function(r){C=r.contenido;FOTOS=r.fotos;$('#ver').href=r.sitio;$('#acceso').classList.add('oculto');$('#panel').classList.remove('oculto');pintar();history.replaceState(null,'',BASE+'/admin')})}
api('GET','/yo').then(function(r){if(r.sesion)return cargar();$('#pista').textContent='Entra con el correo que diste al crear tu página ('+r.pista+').';mostrarAcceso()}).catch(function(){mostrarAcceso()});
})();
</script></body></html>`;
}
