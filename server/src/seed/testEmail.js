/**
 * Sends one test email through the SMTP settings in server/.env, to check store emails
 * (password resets, order updates) will arrive.
 *
 *   npm run test:email                 → sends to SMTP_USER
 *   npm run test:email -- you@mail.com → sends to that address
 */
import env from '../config/env.js';
import { sendEmail } from '../services/email.service.js';

const to = process.argv[2] || env.smtp.user;
if (!env.smtp.enabled) {
  console.error('SMTP is not set up yet: fill SMTP_HOST, SMTP_USER and SMTP_PASS in server/.env (for Gmail, SMTP_PASS is a 16-letter App Password).');
  process.exit(1);
}
try {
  await sendEmail({
    to,
    subject: 'WILDTANE test email',
    text: 'This is a test of WILDTANE store emails. If you can read this, password reset links and order updates will reach customers.',
    html: '<p>This is a test of WILDTANE store emails.</p><p>If you can read this, password reset links and order updates will reach customers.</p>',
  });
  console.log(`Sent. Check the inbox (and spam) of ${to}.`);
} catch (err) {
  console.error(`Sending failed: ${err.message}`);
  if (/535|Username and Password not accepted|Invalid login/i.test(err.message)) {
    console.error('Gmail rejected the login. Use an App Password (not your normal password), with 2-Step Verification turned on.');
  }
  process.exit(1);
}
