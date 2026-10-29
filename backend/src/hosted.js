// Páginas de acceso alojadas (login, registro, recuperar contraseña), login con
// Google y logout. Equivalen a las páginas que Base44 sirve en /login.
import { SignJWT, jwtVerify } from 'jose';
import { signUserToken, findUserByEmail, createUser, userToRecord } from './authcore.js';
import { config } from './config.js';
import { HttpError } from './util.js';
import { getTenant } from './tenants.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function googleCreds(tenant) {
  const id = tenant.secrets.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const secret = tenant.secrets.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

export function loginPageHtml(tenant) {
  const brand = tenant.settings.brand || {};
  const color = /^#[0-9a-fA-F]{3,8}$/.test(brand.color || '') ? brand.color : '#111827';
  const google = Boolean(googleCreds(tenant)) && tenant.settings.auth?.google !== false;
  const allowSignup = tenant.settings.auth?.allow_signup !== false;
  const title = esc(brand.name || tenant.name);
  const logo = brand.logo_url ? `<img src="${esc(brand.logo_url)}" alt="" style="max-height:56px;margin:0 auto 12px;display:block">` : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Acceso</title>
<style>
:root{--c:${color}}*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;color:#18181b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:#fff;width:100%;max-width:400px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.08);padding:28px}
h1{font-size:20px;margin:0 0 4px;text-align:center}p.sub{margin:0 0 20px;text-align:center;color:#71717a;font-size:14px}
label{display:block;font-size:13px;margin:12px 0 4px;color:#3f3f46}input{width:100%;padding:11px 12px;border:1px solid #d4d4d8;border-radius:9px;font-size:15px}
input:focus{outline:2px solid var(--c);border-color:transparent}button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:9px;background:var(--c);color:#fff;font-size:15px;font-weight:600;cursor:pointer}
button.alt{background:#fff;color:#18181b;border:1px solid #d4d4d8;margin-top:10px}button:disabled{opacity:.6}
.links{margin-top:16px;text-align:center;font-size:14px}.links a{color:var(--c);text-decoration:none;margin:0 6px}
.msg{margin-top:14px;font-size:14px;padding:10px;border-radius:8px;display:none}.err{background:#fef2f2;color:#991b1b;display:block}.ok{background:#f0fdf4;color:#166534;display:block}
.hidden{display:none}
</style></head><body><main class="card">${logo}
<h1 id="t">${title}</h1><p class="sub" id="s"></p>
<form id="f"></form><div id="m" class="msg"></div><div class="links" id="l"></div></main>
<script>
const APP_ID=${JSON.stringify(tenant.app_id)},GOOGLE=${google},SIGNUP=${allowSignup};
const P=location.pathname,base=P.replace(/\\/(login|register|forgot-password|reset-password)\\/?$/,'');
const qs=new URLSearchParams(location.search);
const from=qs.get('from_url')||qs.get('returnTo')||(location.origin+(base.startsWith('/t/')?'/':base||'/'));
const api=(p,b)=>fetch(base+'/api/apps/'+APP_ID+p,{method:'POST',headers:{'Content-Type':'application/json','X-App-Id':APP_ID},body:JSON.stringify(b)}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.message||'Error'),{data:j});return j});
const $=id=>document.getElementById(id),f=$('f'),m=$('m');
const show=(t,ok)=>{m.textContent=t;m.className='msg '+(ok?'ok':'err')};
const go=t=>{const u=new URL(from,location.origin);u.searchParams.set('access_token',t);location.href=u.toString()};
const link=(h,t)=>'<a href="'+base+h+location.search+'">'+t+'</a>';
const input=(n,l,t='text',a='')=>'<label for="'+n+'">'+l+'</label><input id="'+n+'" name="'+n+'" type="'+t+'" required '+a+'>';
function view(){
 const v=(P.match(/(register|forgot-password|reset-password)\\/?$/)||['','login'])[1];
 m.className='msg';
 if(v==='login'){$('s').textContent='Inicia sesión';f.innerHTML=input('email','Correo','email','autocomplete="email"')+input('password','Contraseña','password','autocomplete="current-password"')+'<button>Entrar</button>'+(GOOGLE?'<button type="button" class="alt" id="g">Continuar con Google</button>':'');
  $('l').innerHTML=link('/forgot-password','¿Olvidaste tu contraseña?')+(SIGNUP?link('/register','Crear cuenta'):'');
  if(GOOGLE)$('g').onclick=()=>location.href=base+'/api/apps/auth/login?app_id='+APP_ID+'&from_url='+encodeURIComponent(from);
  f.onsubmit=async e=>{e.preventDefault();try{const r=await api('/auth/login',{email:f.email.value,password:f.password.value});go(r.access_token)}catch(x){if(x.data&&x.data.extra_data&&x.data.extra_data.reason==='email_not_verified'){otp(f.email.value)}else show(x.message)}}}
 if(v==='register'){$('s').textContent='Crea tu cuenta';f.innerHTML=input('full_name','Nombre')+input('email','Correo','email')+input('password','Contraseña (mínimo 8)','password','minlength="8"')+'<button>Registrarme</button>';
  $('l').innerHTML=link('/login','Ya tengo cuenta');
  f.onsubmit=async e=>{e.preventDefault();try{await api('/auth/register',{email:f.email.value,password:f.password.value,full_name:f.full_name.value});otp(f.email.value)}catch(x){show(x.message)}}}
 if(v==='forgot-password'){$('s').textContent='Te enviaremos un enlace';f.innerHTML=input('email','Correo','email')+'<button>Enviar enlace</button>';
  $('l').innerHTML=link('/login','Volver');
  f.onsubmit=async e=>{e.preventDefault();try{await api('/auth/reset-password-request',{email:f.email.value});show('Si el correo existe, te enviamos un enlace.',true)}catch(x){show(x.message)}}}
 if(v==='reset-password'){$('s').textContent='Nueva contraseña';f.innerHTML=input('password','Nueva contraseña (mínimo 8)','password','minlength="8"')+'<button>Guardar</button>';
  $('l').innerHTML=link('/login','Volver');
  f.onsubmit=async e=>{e.preventDefault();try{await api('/auth/reset-password',{reset_token:qs.get('token'),new_password:f.password.value});show('Contraseña actualizada. Ya puedes iniciar sesión.',true)}catch(x){show(x.message)}}}
}
function otp(email){$('s').textContent='Te enviamos un código a '+email;f.innerHTML=input('code','Código de 6 dígitos','text','inputmode="numeric" maxlength="6"')+'<button>Verificar</button><button type="button" class="alt" id="r">Reenviar código</button>';
 $('r').onclick=()=>api('/auth/resend-otp',{email}).then(()=>show('Código reenviado',true));
 f.onsubmit=async e=>{e.preventDefault();try{const r=await api('/auth/verify-otp',{email,otp_code:f.code.value});go(r.access_token)}catch(x){show(x.message)}}}
view();
</script></body></html>`;
}

const stateKey = () => new TextEncoder().encode(config.adminToken || 'sitios-web-state');

export function registerHostedRoutes(app, ctx, resolveTenant) {
  for (const p of ['/login', '/register', '/forgot-password', '/reset-password']) {
    app.get(p, async (c) => {
      const tenant = await resolveTenant(c, c.req.query('app_id'));
      if (!tenant) return c.text('App no identificada', 400);
      return c.html(loginPageHtml(tenant));
    });
  }

  app.get('/api/apps/auth/logout', (c) => c.redirect(c.req.query('from_url') || '/'));

  // Inicio de login con Google (el SDK llama /api/apps/auth/login?app_id=..&from_url=..).
  app.get('/api/apps/auth/login', async (c) => {
    const tenant = await getTenant(c.req.query('app_id'));
    const creds = googleCreds(tenant);
    const fromUrl = c.req.query('from_url') || '/';
    if (!creds) {
      const u = new URL(fromUrl, config.publicUrl);
      return c.redirect(`${u.origin}/login?error=google_no_configurado&from_url=${encodeURIComponent(fromUrl)}`);
    }
    const state = await new SignJWT({ app_id: tenant.app_id, from_url: fromUrl })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m')
      .sign(stateKey());
    const params = new URLSearchParams({
      client_id: creds.id,
      redirect_uri: `${config.publicUrl}/api/apps/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get('/api/apps/auth/google/callback', async (c) => {
    let payload;
    try {
      ({ payload } = await jwtVerify(c.req.query('state') || '', stateKey()));
    } catch {
      throw new HttpError(400, 'Estado OAuth inválido o vencido');
    }
    const tenant = await getTenant(payload.app_id);
    const creds = googleCreds(tenant);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: c.req.query('code') || '',
        client_id: creds.id,
        client_secret: creds.secret,
        redirect_uri: `${config.publicUrl}/api/apps/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new HttpError(400, `Google: ${tokens.error_description || tokens.error}`);
    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json();
    if (!info.email || info.email_verified === false) throw new HttpError(400, 'Google no devolvió un correo verificado');
    let user = await findUserByEmail(tenant, info.email);
    let isNew = false;
    if (!user) {
      if (tenant.settings.auth?.allow_signup === false) throw new HttpError(403, 'El registro está deshabilitado');
      user = await createUser(tenant, { email: info.email, full_name: info.name, is_verified: true });
      isNew = true;
    } else if (!user.is_verified) {
      const r = await tenant.pool.query('UPDATE users SET is_verified = true WHERE id = $1 RETURNING *', [user.id]);
      user = r.rows[0];
    }
    const token = await signUserToken(tenant, user);
    const dest = new URL(payload.from_url, config.publicUrl);
    dest.searchParams.set('access_token', token);
    if (isNew) dest.searchParams.set('is_new_user', 'true');
    return c.redirect(dest.toString());
  });
}

export { userToRecord };
