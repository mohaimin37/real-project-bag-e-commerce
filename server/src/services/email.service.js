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
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
          connectionTimeout: 8000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        }
      : {
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.port === 465,
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
          connectionTimeout: 8000,
          greetingTimeout: 5000,
          socketTimeout: 10000,
        };
    transporter = nodemailer.createTransport(options);
  }
  return transporter;
}

/** Sends an email, or prints it to the console when SMTP is not configured. */
export async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false, logged: true };
  }
  await t.sendMail({ from: env.smtp.from, to, subject, text, html });
  return { delivered: true };
}
