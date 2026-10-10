/**
 * Tests WhatsApp Cloud API credentials in server/.env by sending a test message.
 *
 *   npm run test:whatsapp                → sends test to ADMIN_WHATSAPP_NUMBER
 *   npm run test:whatsapp -- 919876543210 → sends test to that specific phone number
 */
import env from '../config/env.js';

const targetArg = process.argv[2];
const rawTarget = targetArg || env.whatsapp.adminNumber || '';
const digits = String(rawTarget).replace(/[^\d]/g, '');
const to = digits.length === 10 ? `91${digits}` : digits;

console.log('=== WhatsApp Cloud API Configuration Test ===');
console.log('API Version    :', env.whatsapp.apiVersion);
console.log('Phone Number ID:', env.whatsapp.phoneNumberId || '(missing)');
console.log('Access Token   :', env.whatsapp.token ? `${env.whatsapp.token.slice(0, 10)}...` : '(missing)');
console.log('Admin Number   :', env.whatsapp.adminNumber || '(not set)');
console.log('Target Phone   :', to || '(none)');
console.log('=============================================\n');

if (!env.whatsapp.token || !env.whatsapp.phoneNumberId) {
  console.error('❌ Missing credentials in server/.env:');
  console.error('   Please provide WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.\n');
  process.exit(1);
}

if (!to) {
  console.error('❌ No recipient specified:');
  console.error('   Pass a number: npm run test:whatsapp -- 91XXXXXXXXXX');
  console.error('   Or set ADMIN_WHATSAPP_NUMBER in server/.env\n');
  process.exit(1);
}

const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;

const body = {
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: {
    preview_url: false,
    body: '✅ Hello from WILDTANE! Your WhatsApp Cloud API is connected successfully.',
  },
};

try {
  console.log(`Sending test message to ${to}...`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsapp.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error(`\n❌ WhatsApp API responded with HTTP ${res.status}:`);
    console.error(JSON.stringify(data?.error || data, null, 2));
    if (res.status === 401) {
      console.error('\n👉 Cause: Access Token is invalid or expired.');
    } else if (res.status === 400 && data?.error?.code === 131030) {
      console.error('\n👉 Cause: In test mode, you must add this phone number to your Meta Sandbox Allowed Numbers list first.');
    } else if (res.status === 400 && data?.error?.code === 131047) {
      console.error('\n👉 Cause: Re-engagement window expired. More than 24 hours have passed since the customer last sent a message to this business number.');
    }
    process.exit(1);
  }

  const messageId = data?.messages?.[0]?.id;
  console.log(`\n🎉 Success! Message sent.`);
  console.log(`Message ID: ${messageId}`);
  console.log(`Check WhatsApp on ${to} for the test message.`);
} catch (err) {
  console.error(`\n❌ Request failed: ${err.message}`);
  process.exit(1);
}
