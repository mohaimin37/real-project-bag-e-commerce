import { sendEmail } from './src/services/email.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing email delivery to syedanas19072002@gmail.com...');
  try {
    const res = await sendEmail({
      to: 'syedanas19072002@gmail.com',
      subject: 'WILDTANE Test OTP Verification',
      text: 'Your test OTP code is: 123456',
      html: '<p>Your test OTP code is: <b>123456</b></p>',
    });
    console.log('Result:', res);
  } catch (err) {
    console.error('Email error:', err);
  }
  process.exit(0);
}

test();
