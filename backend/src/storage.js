// Almacenamiento de archivos en disco (volumen persistente) con URLs públicas
// y URLs firmadas para archivos privados.
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { HttpError, newId } from './util.js';

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.avif': 'image/avif', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.csv': 'text/csv',
  '.txt': 'text/plain', '.json': 'application/json', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword', '.zip': 'application/zip', '.ico': 'image/x-icon',
};

export const mimeFor = (name) => MIME[path.extname(String(name || '')).toLowerCase()] || 'application/octet-stream';

function safeName(name) {
  const ext = path.extname(String(name || '')).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  const base = path.basename(String(name || 'file'), path.extname(String(name || ''))).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'file';
  return `${base}${ext}`;
}

const filesRoot = () => path.join(config.dataDir, 'files');

export async function saveBuffer(tenant, buffer, originalName, { isPrivate = false, mime, originalUrl } = {}) {
  const id = newId();
  const rel = path.join(tenant.app_id, isPrivate ? 'private' : 'public', `${id}_${safeName(originalName)}`);
  const abs = path.join(filesRoot(), rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buffer);
  await tenant.pool.query(
    'INSERT INTO files (id, path, mime, size, is_private, original_url) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, rel, mime || mimeFor(originalName), buffer.length, isPrivate, originalUrl || null]
  );
  return { id, rel, url: `${config.publicUrl}/files/${rel.split(path.sep).join('/')}`, uri: `private://${rel.split(path.sep).join('/')}` };
}

export async function saveUpload(tenant, file, opts = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new HttpError(400, 'Falta el archivo (file)');
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > config.maxUploadMb * 1024 * 1024) throw new HttpError(413, `Archivo mayor a ${config.maxUploadMb} MB`);
  return saveBuffer(tenant, buf, file.name, { ...opts, mime: file.type || undefined });
}

function signature(tenant, rel, expires) {
  return crypto.createHmac('sha256', tenant.jwt_secret).update(`${rel}:${expires}`).digest('hex').slice(0, 32);
}

export function signedUrl(tenant, uri, expiresIn = 300) {
  const rel = String(uri).replace(/^private:\/\//, '');
  if (!rel.startsWith(`${tenant.app_id}/private/`)) throw new HttpError(400, 'file_uri inválido');
  const expires = Math.floor(Date.now() / 1000) + Number(expiresIn || 300);
  return `${config.publicUrl}/files/${rel}?expires=${expires}&sig=${signature(tenant, rel, expires)}`;
}

export function resolveFilePath(rel) {
  const abs = path.normalize(path.join(filesRoot(), rel));
  if (!abs.startsWith(filesRoot())) throw new HttpError(400, 'Ruta inválida');
  return abs;
}

export function checkPrivateAccess(tenant, rel, expires, sig) {
  if (!expires || !sig || Number(expires) < Date.now() / 1000) return false;
  return signature(tenant, rel, Number(expires)) === sig;
}

export async function streamFile(abs) {
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat || !stat.isFile()) throw new HttpError(404, 'Archivo no encontrado');
  return { stream: createReadStream(abs), size: stat.size, mime: mimeFor(abs) };
}

// Lee un archivo propio a partir de su URL pública (para enviarlo a la IA sin descargarlo por red).
export async function readOwnFile(url) {
  const prefix = `${config.publicUrl}/files/`;
  if (!String(url).startsWith(prefix)) return null;
  const rel = decodeURIComponent(String(url).slice(prefix.length).split('?')[0]);
  const abs = resolveFilePath(rel);
  return { buffer: await fs.readFile(abs), mime: mimeFor(abs) };
}
