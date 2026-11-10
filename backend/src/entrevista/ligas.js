// Ligas cortas de pago: https://websites.timewins.ai/pg/<codigo> → redirige a la liga de Stripe.
// Cada liga queda registrada en la tabla ligas_pago con su cliente (entrevista), qué cobra, cuántas veces se abrió
// y, cuando Stripe avisa por el webhook, si se pagó, cuánto, con qué cupón y cuándo.
//   GET /pg/:codigo                         redirige (o avisa si ya está pagada)
//   GET /entrevista/v1/ligas-pago[?entrevista_id=]  registro (X-API-Key)
import crypto from 'node:crypto';
import * as db from './db.js';

const BASE = () => (process.env.LIGAS_BASE || 'https://websites.timewins.ai').replace(/\/$/, '');
const ABC = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let listo = null;
export function migrar() {
  listo ||= db.q(`CREATE TABLE IF NOT EXISTS ligas_pago (
      codigo          text PRIMARY KEY,
      entrevista_id   uuid REFERENCES entrevistas(id) ON DELETE SET NULL,
      tipo            text NOT NULL,              -- pagina | dominio
      referencia      text,                       -- dominios_compras.id para dominios
      destino         text NOT NULL,              -- liga de Stripe
      monto_mxn       numeric,
      descripcion     text,
      estado          text NOT NULL DEFAULT 'pendiente', -- pendiente | pagado | vencida
      aperturas       int NOT NULL DEFAULT 0,
      primera_apertura timestamptz,
      ultima_apertura timestamptz,
      pagado          timestamptz,
      cobrado_mxn     numeric,
      descuento_mxn   numeric,
      cupon           text,
      stripe_session  text,
      payment_intent  text,
      correo_pago     text,
      creado          timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ligas_pago_entrevista_idx ON ligas_pago (entrevista_id, tipo);
    CREATE INDEX IF NOT EXISTS ligas_pago_ref_idx ON ligas_pago (referencia);`).catch((e) => { listo = null; throw e; });
  return listo;
}

/** Código estable para la misma entrevista + tipo + destino (la liga no cambia si Ari la vuelve a mandar). */
function codigoDe(semilla) {
  const h = crypto.createHash('sha256').update(semilla).digest();
  let s = '';
  for (let i = 0; i < 7; i++) s += ABC[h[i] % ABC.length];
  return s;
}

/** Crea (o reutiliza) la liga corta y la devuelve. Síncrona: el registro se guarda en segundo plano. */
export function ligaCorta({ entrevistaId = null, tipo, destino, referencia = null, montoMxn = null, descripcion = null }) {
  if (!destino) return destino;
  const codigo = codigoDe(`${tipo}|${entrevistaId || ''}|${referencia || ''}|${destino}`);
  migrar()
    .then(() => db.q(`INSERT INTO ligas_pago (codigo, entrevista_id, tipo, referencia, destino, monto_mxn, descripcion)
                      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (codigo) DO NOTHING`,
      [codigo, entrevistaId, tipo, referencia, destino, montoMxn, descripcion]))
    .catch((e) => console.error('ligaCorta', e.message));
  return `${BASE()}/pg/${codigo}`;
}

/** Anota en el registro lo que avisa Stripe (pago o vencimiento). Nunca falla el webhook. */
export async function registrarEventoStripe(ev) {
  try {
    await migrar();
    const s = ev?.data?.object || {};
    const ref = String(s.client_reference_id || '');
    const pagina = ref.startsWith('pag_') ? ref.slice(4) : null;
    const compra = !pagina ? (s.metadata?.compra_id || ref || null) : null;
    if (!pagina && !compra) return;
    const donde = pagina ? `entrevista_id=$1 AND tipo='pagina'` : `referencia=$1 AND tipo='dominio'`;
    const pagado = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(ev.type)
      && ['paid', 'no_payment_required'].includes(s.payment_status);
    if (pagado) {
      const descuento = s.total_details?.amount_discount ?? 0;
      const cupon = s.discounts?.[0]?.promotion_code || s.discounts?.[0]?.coupon || (descuento ? 'sí' : null);
      await db.q(`UPDATE ligas_pago SET estado='pagado', pagado=now(), cobrado_mxn=$2, descuento_mxn=$3, cupon=$4, stripe_session=$5,
                  payment_intent=$6, correo_pago=$7 WHERE ${donde} AND estado <> 'pagado'`,
        [pagina || compra, (s.amount_total ?? 0) / 100, descuento / 100, typeof cupon === 'string' ? cupon : null, s.id || null,
          s.payment_intent || null, s.customer_details?.email || null]);
    } else if (ev.type === 'checkout.session.expired' && compra) {
      await db.q(`UPDATE ligas_pago SET estado='vencida' WHERE ${donde} AND estado='pendiente' AND destino LIKE '%' || $2 || '%'`, [compra, s.id || '']);
    }
  } catch (e) { console.error('registrarEventoStripe', e.message); }
}

const paginaSimple = (titulo, texto) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${titulo}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F1EA;color:#1B1F1D;font:16px/1.5 system-ui,sans-serif;padding:16px}main{max-width:420px;background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.06)}h1{font-size:20px;margin:0 0 8px}</style></head>
<body><main><h1>${titulo}</h1><p>${texto}</p></main></body></html>`;

export function registrarRutasLigas(app, { auth, wrap }) {
  app.get('/pg/:codigo', async (c) => {
    const codigo = String(c.req.param('codigo') || '').slice(0, 20);
    try {
      await migrar();
      const r = await db.q(`UPDATE ligas_pago SET aperturas=aperturas+1, primera_apertura=COALESCE(primera_apertura, now()), ultima_apertura=now()
                            WHERE codigo=$1 RETURNING estado, destino`, [codigo]);
      const l = r.rows[0];
      if (!l) return c.html(paginaSimple('Liga no encontrada', 'Revisa que la liga esté completa o pídele a Ari que te la mande de nuevo.'), 404);
      if (l.estado === 'pagado') return c.html(paginaSimple('Este pago ya está hecho ✅', 'Ya quedó registrado. Regresa a la conversación con Ari para seguir.'));
      return c.redirect(l.destino, 302);
    } catch (e) {
      console.error('liga corta', e.message);
      return c.html(paginaSimple('Algo falló', 'Intenta de nuevo en un momento.'), 500);
    }
  });

  app.get('/entrevista/v1/ligas-pago', wrap(async (c) => {
    auth(c);
    await migrar();
    const id = c.req.query('entrevista_id');
    const r = await db.q(`SELECT l.*, e.brief->'negocio'->>'nombre' AS negocio FROM ligas_pago l LEFT JOIN entrevistas e ON e.id=l.entrevista_id
                          ${id ? 'WHERE l.entrevista_id=$1' : ''} ORDER BY l.creado DESC LIMIT 200`, id ? [id] : []);
    return { ligas: r.rows.map((x) => ({ ...x, liga: `${BASE()}/pg/${x.codigo}` })) };
  }));
}
