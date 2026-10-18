import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter;

function getTransporter() {
  if (!env.smtp.enabled) return null;
  if (!transporter) {
    const isGmail = env.smtp.host === 'smtp.gmail.com' || (env.smtp.user && env.smtp.user.includes('@gmail.com'));
    const options = isGmail
      ? {
          service: 'gmail',
          auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
          connectionTimeout: 8000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        }
      : {
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.port === 465,
          auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
          connectionTimeout: 8000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        };
    transporter = nodemailer.createTransport(options);
  }
  return transporter;
}

let lastCheck = { ok: false, at: 0 };

/**
 * True when SMTP is configured and the server accepted our login recently (cached 5 minutes).
 * Lets security emails (verification codes) fail loudly instead of pretending to send.
 */
export async function emailServiceReady() {
  const t = getTransporter();
  if (!t) return false;
  if (lastCheck.ok && Date.now() - lastCheck.at < 5 * 60 * 1000) return true;
  try {
    await t.verify();
    lastCheck = { ok: true, at: Date.now() };
    return true;
  } catch (err) {
    console.error(`[email] SMTP unavailable: ${err.code || ''} ${err.message}`);
    lastCheck = { ok: false, at: Date.now() };
    return false;
  }
}

/** Sends an email with high delivery priority, or logs to console when SMTP is disabled. */
export async function sendEmail({ to, subject, text, html, attachments, priority = 'high' }) {
  const t = getTransporter();
  if (!t) {
    const attachLog = attachments?.length ? ` [Attached: ${attachments.map((a) => a.filename).join(', ')}]` : '';
    console.log(`\n[email:dev] To: ${to}\nSubject: ${subject}${attachLog}\n${text}\n`);
    return { delivered: false, logged: true };
  }

  const start = Date.now();
  const emailHtml =
    html ||
    (text
      ? `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;"><h2 style="margin:0 0 16px;color:#111;">WILDTANE</h2><p style="white-space:pre-line;font-size:15px;line-height:1.6;color:#333;">${String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p><hr style="border:none;border-top:1px solid #eee;margin:24px 0;" /><p style="font-size:12px;color:#888;margin:0;">WILDTANE Care · info@wildtane.com · +91 8920550465</p></div>`
      : undefined);

  const info = await t.sendMail({
    from: env.smtp.from,
    to,
    replyTo: env.smtp.user || 'info@wildtane.com',
    subject,
    text,
    html: emailHtml,
    attachments,
    priority: priority === 'high' ? 'high' : 'normal',
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      Importance: 'high',
    },
  });

  const duration = Date.now() - start;
  console.log(`[email:sent] Delivered to ${to} in ${duration}ms (Message ID: ${info.messageId})`);
  return { delivered: true, messageId: info.messageId, duration };
}
