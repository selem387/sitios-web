// Página del chat web de prueba. Un solo archivo, sin dependencias externas salvo una fuente de Google.
// opciones por dominio (tabla dominios_cliente, columna datos): {titulo, marca, descripcion}.
const escHtml = (x) => String(x ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function paginaChat({ titulo = 'Ari · IAprop', marca = 'IAprop', descripcion = 'Tu página web profesional en una conversación: contesta unas preguntas y Ari la arma por ti.', url = '' } = {}) {
  const T = escHtml(titulo), M = escHtml(marca), D = escHtml(descripcion);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>${T}</title>
<meta name="description" content="${D}">
<meta property="og:type" content="website"><meta property="og:title" content="${T}"><meta property="og:description" content="${D}"><meta property="og:site_name" content="${M}">${url ? `<meta property="og:url" content="${escHtml(url)}">` : ''}
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${T}"><meta name="twitter:description" content="${D}">
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
.m video{max-width:100%;max-height:360px;border-radius:8px;display:block;margin-top:6px}
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
.prev{display:flex;gap:8px;overflow-x:auto;max-width:760px;margin:0 auto 8px;padding:2px 0 4px}
.prev:empty{display:none}
.mini{position:relative;flex:none;width:72px;height:72px;border-radius:10px;overflow:hidden;border:1px solid var(--linea);background:var(--fondo);display:grid;place-items:center;font-size:12px;color:var(--suave);text-align:center}
.mini img{width:100%;height:100%;object-fit:cover;display:block}
.mini.subiendo img{opacity:.45}.mini.fallo{outline:2px solid var(--peligro)}
.mini .q{position:absolute;top:3px;right:3px;width:24px;height:24px;min-width:24px;min-height:24px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:13px;line-height:1;padding:0}
.mini .est{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:11px;padding:2px 0}
#puerta{position:fixed;inset:0;background:var(--fondo);display:grid;place-items:center;padding:16px}
#puerta form{flex-direction:column;align-items:stretch;background:var(--panel);padding:24px;border-radius:16px;border:1px solid var(--linea);width:100%;max-width:360px;gap:12px}
#puerta input{font:inherit;padding:12px;border-radius:10px;border:1px solid var(--linea);background:var(--fondo);color:var(--tinta)}
#puerta h2{margin:0;font-size:20px}#puerta p{margin:0;color:var(--suave);font-size:14px}
#puerta button{border-radius:10px}
.err{color:var(--peligro);font-size:14px;min-height:1em}
svg{width:22px;height:22px}
#lista{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;justify-content:flex-end;z-index:5}
#lista .caja{background:var(--panel);width:100%;max-width:380px;height:100%;display:flex;flex-direction:column;border-left:1px solid var(--linea)}
#lista .cab{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--linea)}#lista .cab h2{font-size:17px;margin:0;flex:1}
#lista ul{list-style:none;margin:0;padding:8px;overflow-y:auto;flex:1}
#lista li{display:flex;align-items:center;gap:4px}#lista li .abrir{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;text-align:left;border-radius:12px;padding:12px;min-height:56px}
#lista li .abrir:hover{background:var(--fondo)}#lista li .abrir[aria-current=true]{background:var(--fondo);outline:1px solid var(--acento)}
#lista .n{font-weight:600;display:block}#lista .d{font-size:13px;color:var(--suave);display:block;margin-top:2px}
#lista .arch{background:transparent;border:0;font-size:13px;color:var(--suave);padding:8px 10px;min-height:44px;border-radius:10px;flex:none}#lista .arch:hover{background:var(--fondo);color:var(--tinta)}
#lista .ver{background:transparent;border:0;display:block;margin:4px auto 0;font-size:13px;color:var(--suave);padding:8px;text-decoration:underline}
#lista .pie{padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--linea)}#lista .pie button{width:100%;border-radius:10px}
#cliente{font-weight:600;color:var(--tinta)}#cliente:not(:empty)::after{content:' · ';font-weight:400;color:var(--suave)}
</style>
</head>
<body>
<header>
  <div class="avatar" aria-hidden="true">A</div>
  <div><h1>${T}</h1><p><span id="cliente"></span><span id="estado">Tu página web en una conversación</span></p></div>
  <button class="sec" id="paginas" type="button" aria-haspopup="dialog">Mis páginas</button>
</header>
<main id="chat" aria-live="polite"></main>
<footer>
  <div class="prev" id="prev" aria-label="Archivos por enviar"></div>
  <div class="adj" id="adj" aria-live="polite"></div>
  <form id="f">
    <input type="file" id="archivo" accept="image/*,audio/*,video/mp4,video/quicktime,.mov,application/pdf" hidden multiple>
    <button type="button" id="clip" aria-label="Adjuntar foto, video o archivo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg></button>
    <textarea id="t" rows="1" placeholder="Escribe un mensaje" aria-label="Mensaje"></textarea>
    <button type="button" id="mic" aria-label="Grabar nota de voz"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg></button>
    <button class="prim" id="enviar" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
  </form>
</footer>
<div id="lista" hidden role="dialog" aria-modal="true" aria-labelledby="lt">
  <div class="caja">
    <div class="cab"><h2 id="lt">Mis páginas</h2><button type="button" id="cerrar" aria-label="Cerrar">✕</button></div>
    <ul id="lu"></ul>
    <div class="pie"><button class="prim" type="button" id="nueva">+ Empezar otra página</button><button class="ver" type="button" id="verArch" hidden></button></div>
  </div>
</div>
<div id="puerta" hidden>
  <form id="fp">
    <h2>Chat de prueba</h2>
    <p>Escribe el código de acceso que te dio ${M}.</p>
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
// Varias conversaciones por navegador ("Mis páginas"): lista de ids en ari_usuarios; historial y nombre por id.
const valido = (u) => /^web-[a-z0-9-]{8,60}$/.test(String(u || ''));
function usuarios(){ try { const l = JSON.parse(mem.get('ari_usuarios') || '[]'); return Array.isArray(l) ? l.filter(valido) : []; } catch { return []; } }
function recordar(u){ const l = usuarios().filter((x) => x !== u); l.unshift(u); mem.set('ari_usuarios', JSON.stringify(l.slice(0, 50))); }
let usuario = mem.get('ari_usuario');
if (valido(usuario)) {
  recordar(usuario);
  // Migración: antes había un solo historial y un solo nombre.
  if (mem.get('ari_historial') !== null) { mem.set('ari_historial_' + usuario, mem.get('ari_historial')); mem.del('ari_historial'); }
  if (mem.get('ari_nombre') !== null) { mem.set('ari_nombre_' + usuario, mem.get('ari_nombre')); mem.del('ari_nombre'); }
} else usuario = nuevoUsuario();
// Liga para retomar una conversación en otro navegador: /chat?c=web-…
try { const q = new URLSearchParams(location.search).get('c'); if (valido(q)) { usuario = q; mem.set('ari_usuario', q); recordar(q); history.replaceState(null, '', location.pathname); } } catch {}
let pendientes = [], ocupado = false, sondeo = null;

function nuevoUsuario(){ const u = 'web-' + crypto.randomUUID(); mem.set('ari_usuario', u); recordar(u); return u; }
// Nombre del cliente arriba del chat en cuanto lo da (se guarda para recargas).
function ponerNombre(n){ n = String(n || '').trim().slice(0, 40); if (n) mem.set('ari_nombre_' + usuario, n); const el = document.getElementById('cliente'); if (el) el.textContent = n; }
function esc(s){ return String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function formato(s){ return esc(s).replace(/\\*([^*\\n]+)\\*/g,'<b>$1</b>').replace(/(^|\\s)_([^_\\n]+)_/g,'$1<i>$2</i>').replace(/(https?:\\/\\/[^\\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>'); }
function historial(u = usuario){ try { return JSON.parse(mem.get('ari_historial_' + u) || '[]'); } catch { return []; } }
function guardar(item){ const h = historial(); h.push(item); mem.set('ari_historial_' + usuario, JSON.stringify(h.slice(-200))); }
function reparar(x){ if (typeof x !== 'string' || !/[ÃÂ]|ð/.test(x)) return x; try { const b = []; for (const ch of x) { const c = ch.codePointAt(0); if (c > 255) return x; b.push(c); } const r = new TextDecoder('utf-8', { fatal:true }).decode(new Uint8Array(b)); return (r.match(/[ÃÂð]/g) || []).length < (x.match(/[ÃÂð]/g) || []).length ? r : x; } catch { return x; } }
function pintar(item){
  if (item.texto) item.texto = reparar(item.texto);
  const d = document.createElement('div');
  if (item.tipo === 'sis') { d.className = 'sis'; d.textContent = item.texto; }
  else if (item.tipo === 'sitio') { d.className = 'sitio'; d.innerHTML = '<b>Tu página está lista para revisar</b>' + (item.captura ? '<img src="'+esc(item.captura)+'" alt="Vista previa de tu página en celular">' : '') + '<a href="'+esc(item.url)+'" target="_blank" rel="noopener">'+esc(item.url)+'</a>'; }
  else {
    d.className = 'm ' + item.de; d.innerHTML = item.texto ? formato(item.texto) : '';
    for (const m of item.media || []) d.insertAdjacentHTML('beforeend', m.tipo === 'imagen' ? '<img src="'+esc(m.url)+'" alt="">' : m.tipo === 'audio' ? '<audio controls src="'+esc(m.url)+'"></audio>' : m.tipo === 'video' ? '<video controls preload="metadata" playsinline src="'+esc(m.url)+'"></video>' : '<div><a href="'+esc(m.url)+'" target="_blank">Archivo adjunto</a></div>');
  }
  chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
}
function agregar(item){ const h = historial(), u = h[h.length-1]; if (item.tipo === 'sis' && u && u.tipo === 'sis' && u.texto === item.texto) return; guardar(item); pintar(item); }

async function api(ruta, op = {}) {
  const r = await fetch(ruta, { ...op, headers: { ...(op.body && !(op.body instanceof FormData) ? {'content-type':'application/json'} : {}), 'x-chat-codigo': codigo, ...(op.headers||{}) } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { mem.del('ari_codigo'); codigo=''; $('#puerta').hidden = false; throw new Error('codigo'); }
  if (!r.ok) throw new Error(d.message || d.detail || ('Error ' + r.status));
  return d;
}

async function subir(file){ const fd = new FormData(); fd.append('archivo', file); return api('/chat/v1/subir', { method:'POST', body: fd }); }

async function enviar(texto, media = [], opciones = {}, oculto = false) {
  if (ocupado) return; ocupado = true; $('#enviar').disabled = true; $('#paginas').disabled = true;
  if (!oculto && (texto || media.length)) agregar({ de:'yo', texto, media });
  const ind = document.createElement('div'); ind.className='escribiendo'; ind.textContent='Ari está escribiendo…'; chat.appendChild(ind); chat.scrollTop = chat.scrollHeight;
  try {
    const d = await api('/chat/v1/mensajes', { method:'POST', body: JSON.stringify({ usuario_id: usuario, texto, media, ...opciones }) });
    ind.remove();
    for (const r of d.respuestas || []) agregar({ de:'ari', texto: r });
    for (const m of d.media || []) agregar({ de:'ari', texto: m.caption || '', media: [m] });
    iniciarAvisos();
    if ('nombre' in d) ponerNombre(d.nombre);
    if (d.total_pasos) $('#estado').textContent = 'Paso ' + Math.min(d.paso, d.total_pasos) + ' de ' + d.total_pasos;
    if (d.estado === 'completada') { $('#estado').textContent = 'Entrevista terminada'; if (d.generando) agregar({ tipo:'sis', texto:'Estoy armando tu página. Tarda unos minutos; aquí te aviso.' }); iniciarSondeo(); }
  } catch (e) { ind.remove(); if (e.message !== 'codigo') agregar({ tipo:'sis', texto:'No se pudo enviar: ' + e.message }); }
  finally { ocupado = false; $('#enviar').disabled = false; $('#paginas').disabled = false; t.focus(); }
}

// Avisos de Ari que llegan sin que el cliente escriba (pago recibido, dirección conectada).
let sondeoAvisos = null;
// Cada navegador guarda hasta qué aviso vio (ari_aviso_<conversación>), así dos personas con la misma conversación
// abierta reciben los mismos mensajes sin recargar. silencio=true solo pone el cursor al día (historial recién bajado).
async function revisarAvisos(silencio = false){
  if (!codigo || !usuario || ocupado) return;
  const u = usuario, k = 'ari_aviso_' + u, c = mem.get(k);
  try {
    const d = await api('/chat/v1/avisos?usuario_id=' + encodeURIComponent(u) + (silencio ? '&desde=999999999999' : c !== null ? '&desde=' + encodeURIComponent(c) : ''));
    if (u !== usuario) return;
    if (!silencio) for (const a of d.avisos || []) agregar({ de:'ari', texto: a.texto });
    if (typeof d.ultimo === 'number') mem.set(k, String(Math.max(Number(c) || 0, d.ultimo)));
  } catch {}
}
function iniciarAvisos(){
  if (sondeoAvisos) return;
  sondeoAvisos = setInterval(() => { if (!document.hidden) revisarAvisos(); }, 6000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revisarAvisos(); });
}
function iniciarSondeo(){
  if (sondeo || mem.get('ari_sitio_'+usuario)) return;
  sondeo = setInterval(async () => {
    try {
      const s = await api('/chat/v1/sitio?usuario_id=' + encodeURIComponent(usuario));
      if (s.estado === 'listo') { clearInterval(sondeo); sondeo=null; mem.set('ari_sitio_'+usuario,'1'); agregar({ tipo:'sitio', url: s.url_publica, captura: s.captura }); }
      if (s.estado === 'entrevista') { clearInterval(sondeo); sondeo=null; }
    } catch {}
  }, 15000);
}

$('#f').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const texto = t.value.trim(); if (!texto && !pendientes.length) return;
  if (pendientes.some((p) => p.estado === 'subiendo')) { avisoAdj('Espera a que terminen de subir tus archivos.'); return; }
  const media = pendientes.filter((p) => p.estado === 'listo').map((p) => p.res);
  if (!texto && !media.length) return;
  limpiarAdj();
  t.value=''; t.style.height='';
  enviar(texto, media);
});
t.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer:fine)').matches) { e.preventDefault(); $('#f').requestSubmit(); } });
t.addEventListener('input', () => { t.style.height='auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; });
$('#clip').onclick = () => $('#archivo').click();
// Adjuntos: hasta MAX_ADJ por envío, con miniatura y ✕ para quitar antes de enviar. Se suben en paralelo (4 a la vez).
const MAX_ADJ = 18, MAX_MB = 16, MAX_MB_VIDEO = 100; // topes iguales que en chat/index.js
const esVideo = (f) => f.type.startsWith('video/') || /\\.(mov|mp4|m4v)$/i.test(f.name);
const topeMb = (f) => (esVideo(f) ? MAX_MB_VIDEO : MAX_MB);
let idAdj = 0;
function avisoAdj(txt){ const a = $('#adj'); a.textContent = txt; a.style.display = txt ? 'block' : 'none'; }
function limpiarAdj(){ for (const p of pendientes) if (p.local) URL.revokeObjectURL(p.local); pendientes = []; pintarAdj(); }
function resumenAdj(){
  if (!pendientes.length) return avisoAdj('');
  const sub = pendientes.filter((p) => p.estado === 'subiendo').length, mal = pendientes.filter((p) => p.estado === 'error').length;
  const ok = pendientes.length - sub - mal;
  let txt = sub ? 'Subiendo ' + sub + ' de ' + pendientes.length + '…' : ok + ' de ' + MAX_ADJ + ' archivo(s) listo(s) para enviar. Puedes agregar un comentario.';
  if (mal) txt += ' ' + mal + ' no se pudo subir (quítalo con ✕).';
  avisoAdj(txt);
}
function pintarAdj(){
  const cont = $('#prev'); cont.innerHTML = '';
  for (const p of pendientes) {
    const d = document.createElement('div'); d.className = 'mini' + (p.estado === 'subiendo' ? ' subiendo' : '') + (p.estado === 'error' ? ' fallo' : '');
    if (p.local) { const im = document.createElement('img'); im.src = p.local; im.alt = p.file.name; d.appendChild(im); }
    else d.textContent = p.file.type.startsWith('audio/') ? '🎤 Audio' : esVideo(p.file) ? '🎬 Video' : p.file.type === 'application/pdf' ? '📄 PDF' : '📎 Archivo';
    if (p.estado !== 'listo') { const s = document.createElement('span'); s.className = 'est'; s.textContent = p.estado === 'error' ? 'Error' : esVideo(p.file) ? 'Subiendo video…' : 'Subiendo…'; d.appendChild(s); }
    const q = document.createElement('button'); q.type = 'button'; q.className = 'q'; q.textContent = '✕'; q.setAttribute('aria-label', 'Quitar ' + p.file.name);
    q.onclick = () => { if (p.local) URL.revokeObjectURL(p.local); pendientes = pendientes.filter((x) => x !== p); pintarAdj(); };
    d.appendChild(q); cont.appendChild(d);
  }
  resumenAdj();
}
$('#archivo').onchange = async (e) => {
  const todos = [...e.target.files]; e.target.value='';
  const elegidos = todos.filter((f) => f.size <= topeMb(f) * 1024 * 1024), pesados = todos.length - elegidos.length;
  const libres = MAX_ADJ - pendientes.length;
  const files = elegidos.slice(0, Math.max(0, libres));
  const nuevos = files.map((f) => ({ id: ++idAdj, file: f, local: f.type.startsWith('image/') ? URL.createObjectURL(f) : '', estado: 'subiendo', res: null }));
  pendientes.push(...nuevos); pintarAdj();
  if (pesados) avisoAdj((pesados === 1 ? 'Un archivo pesa' : pesados + ' archivos pesan') + ' más de lo permitido (' + MAX_MB_VIDEO + ' MB en video, ' + MAX_MB + ' MB en lo demás) y no se agregó. Manda una versión más corta o más ligera.');
  else if (elegidos.length > files.length) avisoAdj('Puedes mandar hasta ' + MAX_ADJ + ' archivos por mensaje; no agregué ' + (elegidos.length - files.length) + '. Envía estos y luego manda los demás.');
  const cola = [...nuevos];
  const trabajador = async () => {
    for (let p = cola.shift(); p; p = cola.shift()) {
      if (!pendientes.includes(p)) continue; // lo quitaron antes de subir
      try { p.res = await subir(p.file); p.estado = 'listo'; } catch { p.estado = 'error'; }
      if (pendientes.includes(p)) pintarAdj();
    }
  };
  await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]);
  if (elegidos.length > files.length) avisoAdj('Listos ' + pendientes.filter((p) => p.estado === 'listo').length + ' de ' + MAX_ADJ + '. No agregué ' + (elegidos.length - files.length) + ' (máximo ' + MAX_ADJ + ' por mensaje); mándalos en el siguiente.');
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
// Mis páginas
const ESTADOS = { entrevista: 'En entrevista', armando: 'Armando la página', listo: 'Página lista', requiere_revision: 'En revisión', error: 'Con un problema' };
function cerrarLista(){ $('#lista').hidden = true; $('#paginas').focus(); }
// Páginas archivadas: se ocultan de la lista en este navegador (no se borra nada).
function archivadas(){ try { const l = JSON.parse(mem.get('ari_archivadas') || '[]'); return new Set(Array.isArray(l) ? l : []); } catch { return new Set(); } }
function archivar(u, si){ const a = archivadas(); if (si) a.add(u); else a.delete(u); mem.set('ari_archivadas', JSON.stringify([...a])); }
let verArchivadas = false;
let ultimaLista = [];
async function abrirLista(){
  const lu = $('#lu'); lu.innerHTML = '<li class="sis">Cargando…</li>'; $('#lista').hidden = false; $('#cerrar').focus();
  let datos = [];
  try { datos = (await api('/chat/v1/conversaciones?ids=' + encodeURIComponent(usuarios().join(',')))).conversaciones || []; } catch (e) { if (e.message === 'codigo') return cerrarLista(); }
  const vistos = new Set(datos.map((x) => x.usuario_id));
  // Conversaciones recién empezadas que aún no tienen entrevista en el servidor.
  for (const u of usuarios()) if (!vistos.has(u) && (u === usuario || historial(u).length)) datos.push({ usuario_id: u, nombre: mem.get('ari_nombre_' + u) || '', estado: 'entrevista' });
  for (const x of datos) if (x.nombre) mem.set('ari_nombre_' + x.usuario_id, x.nombre);
  ultimaLista = datos;
  pintarLista();
}
function pintarLista(){
  const lu = $('#lu'), arch = archivadas();
  const visibles = ultimaLista.filter((x) => arch.has(x.usuario_id) === verArchivadas);
  const nArch = ultimaLista.filter((x) => arch.has(x.usuario_id)).length;
  lu.innerHTML = '';
  if (!visibles.length) lu.innerHTML = '<li class="sis">' + (verArchivadas ? 'No hay páginas archivadas.' : 'No hay páginas activas.') + '</li>';
  for (const x of visibles) {
    const li = document.createElement('li'), b = document.createElement('button'), ar = document.createElement('button');
    b.type = 'button'; b.className = 'abrir'; if (x.usuario_id === usuario) b.setAttribute('aria-current', 'true');
    const fecha = x.actualizado ? new Date(x.actualizado).toLocaleDateString('es-MX', { day:'numeric', month:'short' }) : 'Nueva';
    const nombre = x.nombre || mem.get('ari_nombre_' + x.usuario_id) || 'Página sin nombre todavía';
    b.innerHTML = '<span class="n">' + esc(nombre) + '</span><span class="d">' + esc((ESTADOS[x.estado] || '') + ' · ' + fecha) + '</span>';
    b.onclick = () => { cerrarLista(); if (x.usuario_id !== usuario) abrir(x.usuario_id); };
    ar.type = 'button'; ar.className = 'arch';
    ar.textContent = verArchivadas ? 'Restaurar' : 'Archivar';
    ar.setAttribute('aria-label', (verArchivadas ? 'Restaurar ' : 'Archivar ') + nombre);
    ar.onclick = () => { archivar(x.usuario_id, !verArchivadas); pintarLista(); };
    li.appendChild(b); li.appendChild(ar); lu.appendChild(li);
  }
  const v = $('#verArch');
  v.hidden = !nArch && !verArchivadas;
  v.textContent = verArchivadas ? '← Volver a mis páginas' : 'Ver archivadas (' + nArch + ')';
}
async function abrir(u, nueva = false){
  if (sondeo) { clearInterval(sondeo); sondeo = null; }
  usuario = u; mem.set('ari_usuario', u); recordar(u);
  limpiarAdj();
  $('#estado').textContent = 'Tu página web en una conversación';
  ponerNombre(mem.get('ari_nombre_' + u) || '');
  let existe = false;
  if (!nueva && !historial().length) {
    // Sin copia en este navegador: traerla del servidor.
    try { const d = await api('/chat/v1/historial?usuario_id=' + encodeURIComponent(u)); existe = Boolean(d.existe); if (d.items?.length) { await revisarAvisos(true); mem.set('ari_historial_' + u, JSON.stringify(d.items)); if (d.items.some((x) => x.tipo === 'sitio')) mem.set('ari_sitio_' + u, '1'); } } catch {}
  }
  arrancar(existe);
}
$('#paginas').onclick = () => { verArchivadas = false; abrirLista(); };
$('#verArch').onclick = () => { verArchivadas = !verArchivadas; pintarLista(); };
$('#cerrar').onclick = cerrarLista;
$('#lista').addEventListener('click', (e) => { if (e.target.id === 'lista') cerrarLista(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#lista').hidden) cerrarLista(); });
$('#nueva').onclick = () => { cerrarLista(); abrir(nuevoUsuario(), true); };
$('#fp').addEventListener('submit', async (e) => {
  e.preventDefault(); codigo = $('#codigo').value.trim(); $('#perr').textContent='';
  try { await api('/chat/v1/sitio?usuario_id=' + encodeURIComponent(usuario)); mem.set('ari_codigo', codigo); $('#puerta').hidden = true; abrir(usuario); }
  catch (err) { $('#perr').textContent = err.message === 'codigo' ? 'Código incorrecto' : err.message; $('#puerta').hidden = false; }
});
function arrancar(existe = false){
  chat.innerHTML=''; const h = historial(); h.forEach(pintar);
  // Saludo solo en conversaciones nuevas; una que ya existe en el servidor (aunque sin mensajes) no se reinicia.
  if (!h.length && !existe) enviar('pagina', [], {}, true);
  else api('/chat/v1/sitio?usuario_id=' + encodeURIComponent(usuario)).then((s) => { if (s.id) iniciarSondeo(); }).catch(() => {});
  if (h.length || existe) { iniciarAvisos(); revisarAvisos(); }
  t.focus();
}
if (!codigo) $('#puerta').hidden = false; else abrir(usuario);
</script>
</body>
</html>`;
}
