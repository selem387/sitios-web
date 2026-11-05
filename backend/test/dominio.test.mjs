// Dirección de la página: precio, detección de proveedor, WHOIS/RDAP, Stripe, búsqueda de opciones y guías.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { calcular } from '../src/dominio/precio.js';
import { partes, proveedorPorNs, proveedorPorRegistrador, leerWhois, leerRdap, limpiarDominio, esDominio } from '../src/dominio/registrador.js';
import { formulario, verificarWebhook } from '../src/dominio/stripe.js';
import { monto, precioUnAnio } from '../src/dominio/godaddy.js';
import { BASE } from '../src/dominio/guias.js';
import { tocaDominio, dominioEnCurso, quiereRetomar } from '../src/entrevista/dominio.js';

const P = { tolerancia: 0.03, pct: 0.036, fijo: 3, iva: 0.16 };

test('precio: costo sin margen + tolerancia TC + comisión Stripe; IAprop recibe al menos el neto', () => {
  const r = calcular({ costo: 11.99, moneda: 'USD', tc: 18.5, params: P });
  assert.equal(r.tc_aplicado, Number((18.5 * 1.03).toFixed(4)));
  const recibe = r.total_mxn - (r.total_mxn * P.pct * (1 + P.iva) + P.fijo * (1 + P.iva));
  assert.ok(recibe >= r.neto_mxn - 0.01, `recibe ${recibe} < neto ${r.neto_mxn}`);
  assert.ok(recibe - r.neto_mxn < 1.05, 'no cobra de más (solo el redondeo al peso)');
  assert.equal(r.total_centavos, r.total_mxn * 100);
  assert.ok(Number.isInteger(r.total_mxn));
});

test('precio: si GoDaddy cobra en pesos no hay tolerancia cambiaria', () => {
  const r = calcular({ costo: 250, moneda: 'MXN', tc: 1, params: P });
  assert.equal(r.tc_aplicado, 1);
  assert.equal(r.neto_mxn, 250);
});

test('dominio: limpieza, validación y zona registrable', () => {
  assert.equal(limpiarDominio(' https://www.Toolatte.cafe/menu '), 'toolatte.cafe');
  assert.ok(esDominio('toolatte.cafe'));
  assert.ok(!esDominio('toolatte'));
  assert.deepEqual(partes('clinica.com.mx'), { zona: 'clinica.com.mx', nombre: '@', tld: 'com.mx' });
  assert.deepEqual(partes('weber.lemoss.co'), { zona: 'lemoss.co', nombre: 'weber', tld: 'co' });
});

test('proveedor por nameservers y por registrador', () => {
  assert.equal(proveedorPorNs(['ns51.domaincontrol.com', 'ns52.domaincontrol.com']), 'godaddy');
  assert.equal(proveedorPorNs(['ada.ns.cloudflare.com']), 'cloudflare');
  assert.equal(proveedorPorNs(['ns1.dns-parking.com']), 'hostinger');
  assert.equal(proveedorPorNs(['dns1.registrar-servers.com']), 'namecheap');
  assert.equal(proveedorPorNs(['ns11.wixdns.net']), 'wix');
  assert.equal(proveedorPorNs(['ns1.miservidor.com']), null);
  assert.equal(proveedorPorRegistrador('GoDaddy.com, LLC'), 'godaddy');
  assert.equal(proveedorPorRegistrador('Squarespace Domains II LLC'), 'squarespace');
  assert.equal(proveedorPorRegistrador('Akky Online Solutions, S.A. de C.V.'), 'akky');
});

test('WHOIS: registrado, libre y nameservers', () => {
  const t = 'Domain Name: EJEMPLO.MX\nRegistrar: Akky Online Solutions, S.A. de C.V.\nExpiration Date: 2027-03-01\nName Servers:\n   DNS: ns1.akky.mx\n   DNS: ns2.akky.mx\n';
  const r = leerWhois(t);
  assert.equal(r.registrado, true);
  assert.match(r.registrador, /Akky/);
  assert.deepEqual(r.ns, ['ns1.akky.mx', 'ns2.akky.mx']);
  assert.equal(leerWhois('No match for "LIBRE123.COM".').registrado, false);
});

test('RDAP: registrador, IANA ID, nameservers y vencimiento', () => {
  const d = {
    entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['version', {}, 'text', '4.0'], ['fn', {}, 'text', 'GoDaddy.com, LLC']]], publicIds: [{ type: 'IANA Registrar ID', identifier: '146' }] }],
    nameservers: [{ ldhName: 'NS51.DOMAINCONTROL.COM' }],
    events: [{ eventAction: 'expiration', eventDate: '2027-11-01T00:00:00Z' }],
  };
  const r = leerRdap(d);
  assert.equal(r.registrador, 'GoDaddy.com, LLC');
  assert.equal(r.registrador_iana, '146');
  assert.deepEqual(r.ns, ['ns51.domaincontrol.com']);
  assert.equal(r.vence, '2027-11-01T00:00:00Z');
});

test('GoDaddy: SimpleMoney y precio del primer año', () => {
  assert.equal(monto({ currencyCode: 'USD', value: 1199 }), 11.99);
  const p = precioUnAnio([{ term: 'YEAR', period: 2, price: { currencyCode: 'USD', value: 3098 } }, { term: 'YEAR', period: 1, price: { currencyCode: 'USD', value: 1199 }, renewalPrice: { currencyCode: 'USD', value: 2299 } }]);
  assert.deepEqual(p, { monto: 11.99, moneda: 'USD', renovacion: 22.99 });
});

test('Stripe: formulario anidado y firma del webhook', () => {
  const f = formulario({ a: 1, line_items: [{ price_data: { currency: 'mxn' } }], metadata: { compra_id: 'x' } }).toString();
  assert.match(f, /line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=mxn/);
  assert.match(f, /metadata%5Bcompra_id%5D=x/);
  const secreto = 'whsec_prueba';
  const cuerpo = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secreto).update(`${t}.${cuerpo}`).digest('hex');
  assert.equal(verificarWebhook(cuerpo, `t=${t},v1=${v1}`, secreto).type, 'checkout.session.completed');
  assert.throws(() => verificarWebhook(cuerpo, `t=${t},v1=${'0'.repeat(64)}`, secreto), /inválida/);
  assert.throws(() => verificarWebhook(cuerpo, `t=${t - 1000},v1=${v1}`, secreto), /vencida/);
});

test('guías: todas las curadas llevan {IP} y el paso de www', () => {
  for (const [slug, pasos] of Object.entries(BASE)) {
    assert.ok(pasos.some((p) => p.includes('{IP}')), slug);
    assert.ok(pasos.includes('{WWW}'), slug);
  }
});

test('flujo: cuándo arranca, cuándo bloquea a Ari y cuándo se retoma', () => {
  assert.equal(tocaDominio({ tecnico: { tiene_dominio: true, dominio: 'toolatte.cafe' } }), true);
  assert.equal(tocaDominio({ tecnico: { tiene_dominio: true, dominio: 'toolatte' } }), false);
  assert.equal(tocaDominio({ tecnico: { tiene_dominio: false, dominio_deseado: 'toolatte' } }), true);
  assert.equal(tocaDominio({ tecnico: { tiene_dominio: false, dominio_deseado: 'x', quiere_dominio: false } }), false);
  assert.equal(tocaDominio({ tecnico: { tiene_dominio: true, dominio: 'a.com', dominio_flujo: { estado: 'opciones' } } }), false);
  assert.equal(dominioEnCurso({ tecnico: { dominio_flujo: { estado: 'opciones' } } }), true);
  assert.equal(dominioEnCurso({ tecnico: { dominio_flujo: { estado: 'lista' } } }), false);
  assert.equal(quiereRetomar({ tecnico: { dominio_flujo: { estado: 'pospuesto' } } }, 'quiero comprar dirección'), true);
  assert.equal(quiereRetomar({ tecnico: { dominio_flujo: { estado: 'pospuesto' } } }, 'mi dirección es calle 60'), false);
});
