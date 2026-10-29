// Envío de correo: Resend (API) o SMTP. Configurable por app vía secrets.
import nodemailer from 'nodemailer';
import { config } from './config.js';
import { HttpError } from './util.js';

const transports = new Map();

function smtpTransport(url) {
  if (!transports.has(url)) transports.set(url, nodemailer.createTransport(url));
  return transports.get(url);
}

export async function sendMail(tenant, { to, subject, html, text, from_name, reply_to }) {
  const secrets = tenant?.secrets || {};
  const settings = tenant?.settings || {};
  const fromEmail = secrets.MAIL_FROM || settings.mail_from || config.mailFrom;
  const fromName = from_name || settings.mail_from_name || tenant?.name || '';
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const recipients = Array.isArray(to) ? to : String(to || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!recipients.length) throw new HttpError(400, 'Falta el destinatario (to)');

  const resendKey = secrets.RESEND_API_KEY || config.resendApiKey;
  const smtpUrl = secrets.SMTP_URL || config.smtpUrl;

  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: recipients, subject, html, text, reply_to }),
    });
    if (!res.ok) throw new HttpError(502, `Resend respondió ${res.status}: ${await res.text()}`);
    return { success: true };
  }
  if (smtpUrl) {
    await smtpTransport(smtpUrl).sendMail({ from, to: recipients.join(','), subject, html, text, replyTo: reply_to });
    return { success: true };
  }
  // Sin proveedor configurado: se registra en logs para no romper el flujo.
  console.warn(`[mail] Sin proveedor configurado. Correo a ${recipients.join(',')}: ${subject}`);
  return { success: true, delivered: false, reason: 'no_mail_provider' };
}
