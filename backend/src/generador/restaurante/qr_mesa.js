// QR y tarjetas de mesa para restaurantes (etapa 3, decisión 4 del 19-nov-2026; doc claude/etapa3-restaurantes.md).
// Al publicar el sitio: una imagen del QR de su página del menú con su logo al centro, y un PDF tamaño carta con 4
// tarjetas de mesa (nombre, QR, "Escanea para ver el menú" y la dirección), con sus colores, listas para recortar.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { PDFDocument, rgb } from 'pdf-lib';
import { config } from '../../config.js';
import { svgLogoLetras } from '../ilustrativas.js';
import { contraste } from '../../entrevista/tema.js';

const DIR = path.join(config.dataDir, 'chat'); // se sirve en /chat/archivos/
const urlArchivo = (nombre) => `${config.publicUrl}/chat/archivos/${nombre}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HEX = /^#[0-9a-f]{6}$/i;

/** Colores de las tarjetas a partir de la paleta de su diseño (QR siempre oscuro sobre claro, para que lea bien). */
export function coloresTarjeta(paleta = {}) {
  const fondo = HEX.test(paleta.bg) ? paleta.bg : '#FFFFFF';
  const tinta = HEX.test(paleta.fg) ? paleta.fg : '#111111';
  const acento = HEX.test(paleta.primary || paleta.p) ? (paleta.primary || paleta.p) : tinta;
  const qr = contraste(tinta, '#FFFFFF') >= 7 ? tinta : '#111111';
  return { fondo, tinta: contraste(tinta, fondo) >= 4.5 ? tinta : contraste('#FFFFFF', fondo) > contraste('#111111', fondo) ? '#FFFFFF' : '#111111', acento, qr };
}

/** PNG del QR (lado px) con el logo (o las iniciales) en un recuadro blanco al centro. Corrección de errores alta. */
export async function pngQR(url, { lado = 1200, logo = null, nombre = '', color = '#111111' } = {}) {
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 2, color: { dark: color, light: '#FFFFFF' } });
  const base = await sharp(Buffer.from(svg)).resize(lado, lado).png().toBuffer();
  const caja = Math.round(lado * 0.24), pad = Math.round(caja * 0.1);
  let centro;
  try {
    const logoBuf = logo ? Buffer.from(await (await fetch(logo, { signal: AbortSignal.timeout(15000) })).arrayBuffer()) : Buffer.from(svgLogoLetras(nombre, color));
    centro = await sharp(logoBuf).resize(caja - 2 * pad, caja - 2 * pad, { fit: 'contain', background: '#FFFFFF' }).flatten({ background: '#FFFFFF' }).png().toBuffer();
  } catch { centro = await sharp(Buffer.from(svgLogoLetras(nombre, color))).resize(caja - 2 * pad, caja - 2 * pad).png().toBuffer(); }
  const recuadro = await sharp({ create: { width: caja, height: caja, channels: 4, background: '#FFFFFF' } }).composite([{ input: centro, top: pad, left: pad }]).png().toBuffer();
  const off = Math.round((lado - caja) / 2);
  return sharp(base).composite([{ input: recuadro, top: off, left: off }]).png().toBuffer();
}

/** Una tarjeta de mesa (PNG, 1275×1650 px = 4.25×5.5 in a 300 dpi). */
export async function pngTarjeta({ qr, nombre, url, colores }) {
  const W = 1275, H = 1650, q = 860;
  const dom = String(url).replace(/^https?:\/\//, '').replace(/\/$/, '');
  // La dirección cabe en el ancho de la tarjeta; si es demasiado larga (p. ej. la dirección provisional) no se pone.
  const fzDom = Math.min(40, Math.floor((W - 160) / (dom.length * 0.6)));
  const fz = nombre.length > 22 ? 64 : 84;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${colores.fondo}"/><rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="36" fill="none" stroke="${colores.acento}" stroke-width="6"/>
<text x="${W / 2}" y="230" font-family="DejaVu Serif, serif" font-size="${fz}" font-weight="bold" fill="${colores.tinta}" text-anchor="middle">${esc(nombre)}</text>
<rect x="${(W - q - 60) / 2}" y="${330 - 30}" width="${q + 60}" height="${q + 60}" rx="28" fill="#FFFFFF"/>
<text x="${W / 2}" y="${330 + q + 150}" font-family="DejaVu Sans, sans-serif" font-size="70" font-weight="bold" fill="${colores.tinta}" text-anchor="middle">Escanea para ver el menú</text>
${fzDom >= 26 ? `<text x="${W / 2}" y="${330 + q + 240}" font-family="DejaVu Sans, sans-serif" font-size="${fzDom}" fill="${colores.tinta}" text-anchor="middle" opacity="0.8">${esc(dom)}</text>` : ''}</svg>`;
  const qrBuf = await sharp(qr).resize(q, q).png().toBuffer();
  return sharp(Buffer.from(svg)).composite([{ input: qrBuf, top: 330, left: Math.round((W - q) / 2) }]).png().toBuffer();
}

/** PDF carta con 4 tarjetas iguales (2×2) y líneas de corte. */
export async function pdfTarjetas(tarjeta) {
  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([612, 792]);
  const img = await pdf.embedPng(tarjeta);
  for (const [x, y] of [[0, 396], [306, 396], [0, 0], [306, 0]]) pagina.drawImage(img, { x, y, width: 306, height: 396 });
  const corte = { thickness: 0.5, color: rgb(0.6, 0.6, 0.6), dashArray: [4, 4] };
  pagina.drawLine({ start: { x: 306, y: 0 }, end: { x: 306, y: 792 }, ...corte });
  pagina.drawLine({ start: { x: 0, y: 396 }, end: { x: 612, y: 396 }, ...corte });
  pdf.setTitle('Tarjetas de mesa');
  return Buffer.from(await pdf.save());
}

async function guardar(buf, prefijo, ext) {
  await fs.mkdir(DIR, { recursive: true });
  const nombre = `${prefijo}-${crypto.randomBytes(9).toString('base64url').replace(/_/g, '-')}.${ext}`;
  await fs.writeFile(path.join(DIR, nombre), buf);
  return urlArchivo(nombre);
}

/**
 * Genera y guarda el QR y las tarjetas. → {url_menu, qr, tarjetas} (ligas a los archivos)
 * urlMenu: la página del menú publicada (https://sudominio.com/menu).
 */
export async function crearQrMesa({ urlMenu, nombre = '', logo = null, paleta = {} }) {
  const colores = coloresTarjeta(paleta);
  const qr = await pngQR(urlMenu, { logo, nombre, color: colores.qr });
  const tarjeta = await pngTarjeta({ qr, nombre, url: urlMenu, colores });
  const [qrUrl, pdfUrl] = await Promise.all([guardar(qr, 'qr-menu', 'png'), guardar(await pdfTarjetas(tarjeta), 'tarjetas-mesa', 'pdf')]);
  return { url_menu: urlMenu, qr: qrUrl, tarjetas: pdfUrl };
}
