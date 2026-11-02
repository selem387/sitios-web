// Página del chat web de prueba. Un solo archivo, sin dependencias externas salvo una fuente de Google.
export function paginaChat() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Ari · IAprop</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--fondo:#F4F1EA;--panel:#FFFFFF;--tinta:#1B1F1D;--suave:#5F6762;--linea:#E3DED3;--ari:#FFFFFF;--yo:#1F5E4B;--yo-t:#FFFFFF;--acento:#1F5E4B;--peligro:#9B2C2C}
@media (prefers-color-scheme:dark){:root{--fondo:#121513;--panel:#1A1E1C;--tinta:#ECEFEC;--suave:#A3ABA6;--linea:#2B312E;--ari:#202523;--yo:#2E7D64;--acento:#5FBF9F}}
[hidden]{display:none!important}
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{font-family:Figtree,system-ui,sans-serif;background:var(--fondo);color:var(--tinta);display:flex;flex-direction:column;font-size:16px}
header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--panel);border-bottom:1px solid var(--linea)}
.avatar{width:38px;height:38px;border-radius:50%;background:var(--acento);color:#fff;display:grid;place-items:center;font-weight:700}
header h1{font-size:16px;margin:0;font-weight:600}header p{margin:0;font-size:13px;color:var(--suave)}
header button{margin-left:auto}
main{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;max-width:760px;width:100%;margin:0 auto}
.m{max-width:85%;padding:10px 14px;border-radius:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:0 1px 0 rgba(0,0,0,.04)}
.ari{background:var(--ari);align-self:flex-start;border:1px solid var(--linea);border-top-left-radius:4px}
.yo{background:var(--yo);color:var(--yo-t);align-self:flex-end;border-top-right-radius:4px}
.m img{max-width:100%;border-radius:8px;display:block;margin-top:6px}
.m audio{max-width:100%;margin-top:6px}
.m a{color:inherit}
.sis{align-self:center;font-size:13px;color:var(--suave);text-align:center;max-width:90%}
.sitio{align-self:stretch;background:var(--panel);border:1px solid var(--linea);border-radius:14px;padding:14px}
.sitio img{width:100%;max-width:280px;border-radius:10px;border:1px solid var(--linea);display:block;margin:10px 0}
.escribiendo{align-self:flex-start;color:var(--suave);font-size:14px;padding:4px 6px}
footer{background:var(--panel);border-top:1px solid var(--linea);padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
form{display:flex;gap:8px;align-items:flex-end;max-width:760px;margin:0 auto}
textarea{flex:1;resize:none;border:1px solid var(--linea);border-radius:20px;padding:10px 14px;font:inherit;background:var(--fondo);color:var(--tinta);max-height:140px;min-height:44px}
textarea:focus-visible,button:focus-visible{outline:2px solid var(--acento);outline-offset:2px}
button{font:inherit;border:0;cursor:pointer;border-radius:999px;min-width:44px;min-height:44px;display:grid;place-items:center;background:transparent;color:var(--tinta)}
button.prim{background:var(--acento);color:#fff}
button.sec{border:1px solid var(--linea);padding:0 14px;font-size:14px;min-height:36px}
button:disabled{opacity:.5;cursor:default}
.grabando{background:var(--peligro)!important;color:#fff!important}
.adj{font-size:13px;color:var(--suave);max-width:760px;margin:0 auto 6px;display:none}
#puerta{position:fixed;inset:0;background:var(--fondo);display:grid;place-items:center;padding:16px}
#puerta form{flex-direction:column;align-items:stretch;background:var(--panel);padding:24px;border-radius:16px;border:1px solid var(--linea);width:100%;max-width:360px;gap:12px}
#puerta input{font:inherit;padding:12px;border-radius:10px;border:1px solid var(--linea);background:var(--fondo);color:var(--tinta)}
#puerta h2{margin:0;font-size:20px}#puerta p{margin:0;color:var(--suave);font-size:14px}
#puerta button{border-radius:10px}
.err{color:var(--peligro);font-size:14px;min-height:1em}
svg{width:22px;height:22px}
</style>
</head>
<body>
<header>
  <div class="avatar" aria-hidden="true">A</div>
  <div><h1>Ari · IAprop</h1><p id="estado">Tu página web en una conversación</p></div>
  <button class="sec" id="nueva" type="button">Nueva conversación</button>
</header>
<main id="chat" aria-live="polite"></main>
<footer>
  <div class="adj" id="adj"></div>
  <form id="f">
    <input type="file" id="archivo" accept="image/*,audio/*,application/pdf" hidden multiple>
    <button type="button" id="clip" aria-label="Adjuntar foto o archivo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg></button>
    <textarea id="t" rows="1" placeholder="Escribe un mensaje" aria-label="Mensaje"></textarea>
    <button type="button" id="mic" aria-label="Grabar nota de voz"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg></button>
    <button class="prim" id="enviar" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
  </form>
</footer>
<div id="puerta" hidden>
  <form id="fp">
    <h2>Chat de prueba</h2>
    <p>Escribe el código de acceso que te dio IAprop.</p>
    <input id="codigo" type="password" autocomplete="off" aria-label="Código de acceso">
    <div class="err" id="perr"></div>
    <button class="prim">Entrar</button>
  </form>
</div>
<script>
const $ = (s) => document.querySelector(s);
const chat = $('#chat'), t = $('#t');
const mem = { get(k){ try { return localStorage.getItem(k); } catch { return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch {} }, del(k){ try { localStorage.removeItem(k); } catch {} } };
let codigo = mem.get('ari_codigo') || '';
let usuario = mem.get('ari_usuario') || nuevoUsuario();
let pendientes = [], ocupado = false, sondeo = null;

function nuevoUsuario(){ const u = 'web-' + crypto.randomUUID(); mem.set('ari_usuario', u); mem.del('ari_historial'); return u; }
function esc(s){ return String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function formato(s){ return esc(s).replace(/\\*([^*\\n]+)\\*/g,'<b>$1</b>').replace(/(^|\\s)_([^_\\n]+)_/g,'$1<i>$2</i>').replace(/(https?:\\/\\/[^\\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>'); }
function historial(){ try { return JSON.parse(mem.get('ari_historial') || '[]'); } catch { return []; } }
function guardar(item){ const h = historial(); h.push(item); mem.set('ari_historial', JSON.stringify(h.slice(-200))); }
function pintar(item){
  const d = document.createElement('div');
  if (item.tipo === 'sis') { d.className = 'sis'; d.textContent = item.texto; }
  else if (item.tipo === 'sitio') { d.className = 'sitio'; d.innerHTML = '<b>Tu página está lista para revisar</b>' + (item.captura ? '<img src="'+esc(item.captura)+'" alt="Vista previa de tu página en celular">' : '') + '<a href="'+esc(item.url)+'" target="_blank" rel="noopener">'+esc(item.url)+'</a>'; }
  else {
    d.className = 'm ' + item.de; d.innerHTML = item.texto ? formato(item.texto) : '';
    for (const m of item.media || []) d.insertAdjacentHTML('beforeend', m.tipo === 'imagen' ? '<img src="'+esc(m.url)+'" alt="">' : m.tipo === 'audio' ? '<audio controls src="'+esc(m.url)+'"></audio>' : '<div><a href="'+esc(m.url)+'" target="_blank">Archivo adjunto</a></div>');
  }
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}
function agregar(item){ guardar(item); pintar(item); }

async function api(ruta, op = {}) {
  const r = await fetch(ruta, { ...op, headers: { ...(op.body && !(op.body instanceof FormData) ? {'content-type':'application/json'} : {}), 'x-chat-codigo': codigo, ...(op.headers||{}) } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { mem.del('ari_codigo'); codigo=''; $('#puerta').hidden = false; throw new Error('codigo'); }
  if (!r.ok) throw new Error(d.message || d.detail || ('Error ' + r.status));
  return d;
}

async function subir(file){ const fd = new FormData(); fd.append('archivo', file); return api('/chat/v1/subir', { method:'POST', body: fd }); }

async function enviar(texto, media = [], opciones = {}, oculto = false) {
  if (ocupado) return; ocupado = true; $('#enviar').disabled = true;
  if (!oculto && (texto || media.length)) agregar({ de:'yo', texto, media });
  const ind = document.createElement('div'); ind.className='escribiendo'; ind.textContent='Ari está escribiendo…'; chat.appendChild(ind); chat.scrollTop = chat.scrollHeight;
  try {
    const d = await api('/chat/v1/mensajes', { method:'POST', body: JSON.stringify({ usuario_id: usuario, texto, media, ...opciones }) });
    ind.remove();
    for (const r of d.respuestas || []) agregar({ de:'ari', texto: r });
    if (d.total_pasos) $('#estado').textContent = 'Paso ' + Math.min(d.paso, d.total_pasos) + ' de ' + d.total_pasos;
    if (d.estado === 'completada') { $('#estado').textContent = 'Entrevista terminada'; if (d.generando) agregar({ tipo:'sis', texto:'Estoy armando tu página. Tarda unos minutos; aquí te aviso.' }); iniciarSondeo(); }
  } catch (e) { ind.remove(); if (e.message !== 'codigo') agregar({ tipo:'sis', texto:'No se pudo enviar: ' + e.message }); }
  finally { ocupado = false; $('#enviar').disabled = false; t.focus(); }
}

function iniciarSondeo(){
  if (sondeo || mem.get('ari_sitio_'+usuario)) return;
  sondeo = setInterval(async () => {
    try {
      const s = await api('/chat/v1/sitio?usuario_id=' + encodeURIComponent(usuario));
      if (s.estado === 'listo' || s.estado === 'requiere_revision') { clearInterval(sondeo); sondeo=null; mem.set('ari_sitio_'+usuario,'1'); agregar({ tipo:'sitio', url: s.url_publica, captura: s.captura }); }
      if (s.estado === 'error') { clearInterval(sondeo); sondeo=null; agregar({ tipo:'sis', texto:'Hubo un problema al armar la página; el equipo de IAprop ya lo está revisando.' }); }
    } catch {}
  }, 15000);
}

$('#f').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const texto = t.value.trim(); if (!texto && !pendientes.length) return;
  const media = pendientes; pendientes = []; $('#adj').style.display='none';
  t.value=''; t.style.height='';
  enviar(texto, media);
});
t.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer:fine)').matches) { e.preventDefault(); $('#f').requestSubmit(); } });
t.addEventListener('input', () => { t.style.height='auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; });
$('#clip').onclick = () => $('#archivo').click();
$('#archivo').onchange = async (e) => {
  const files = [...e.target.files].slice(0, 5); e.target.value='';
  $('#adj').style.display='block'; $('#adj').textContent = 'Subiendo ' + files.length + ' archivo(s)…';
  try { for (const f of files) pendientes.push(await subir(f)); $('#adj').textContent = pendientes.length + ' archivo(s) listo(s) para enviar. Puedes agregar un comentario.'; }
  catch (err) { $('#adj').textContent = 'No se pudo subir: ' + err.message; }
};
let rec = null, trozos = [];
$('#mic').onclick = async () => {
  if (rec && rec.state === 'recording') { rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tipo = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    rec = new MediaRecorder(stream, { mimeType: tipo }); trozos = [];
    rec.ondataavailable = (e) => trozos.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((x) => x.stop()); $('#mic').classList.remove('grabando'); $('#mic').setAttribute('aria-label','Grabar nota de voz');
      const blob = new Blob(trozos, { type: tipo });
      try { const m = await subir(new File([blob], 'nota.' + (tipo === 'audio/webm' ? 'webm' : 'm4a'), { type: tipo })); enviar('', [m]); }
      catch (err) { agregar({ tipo:'sis', texto:'No se pudo enviar el audio: ' + err.message }); }
    };
    rec.start(); $('#mic').classList.add('grabando'); $('#mic').setAttribute('aria-label','Detener y enviar');
  } catch { agregar({ tipo:'sis', texto:'No hay permiso para usar el micrófono.' }); }
};
$('#nueva').onclick = () => { if (!confirmarNueva()) return; usuario = nuevoUsuario(); chat.innerHTML=''; $('#estado').textContent='Tu página web en una conversación'; enviar('pagina', [], {}, true); };
function confirmarNueva(){ return historial().length === 0 || window.confirm('¿Empezar una conversación nueva? La actual queda guardada para IAprop.'); }
$('#fp').addEventListener('submit', async (e) => {
  e.preventDefault(); codigo = $('#codigo').value.trim(); $('#perr').textContent='';
  try { await api('/chat/v1/sitio?usuario_id=' + encodeURIComponent(usuario)); mem.set('ari_codigo', codigo); $('#puerta').hidden = true; arrancar(); }
  catch (err) { $('#perr').textContent = err.message === 'codigo' ? 'Código incorrecto' : err.message; $('#puerta').hidden = false; }
});
function arrancar(){
  chat.innerHTML=''; const h = historial(); h.forEach(pintar);
  if (!h.length) enviar('pagina', [], {}, true);
  else api('/chat/v1/sitio?usuario_id=' + encodeURIComponent(usuario)).then((s) => { if (s.id) iniciarSondeo(); }).catch(() => {});
  t.focus();
}
if (!codigo) $('#puerta').hidden = false; else arrancar();
</script>
</body>
</html>`;
}
