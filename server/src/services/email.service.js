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

/** Sends an email with high delivery priority, or logs to console when SMTP is disabled. */
export async function sendEmail({ to, subject, text, html, priority = 'high' }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false, logged: true };
  }

  const start = Date.now();
  const info = await t.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
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
