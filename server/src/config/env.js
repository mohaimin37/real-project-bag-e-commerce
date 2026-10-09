import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
  siteUrl: (process.env.SITE_URL || (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0]).replace(/\/$/, ''),
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    cookieName: process.env.COOKIE_NAME || 'wt_token',
  },
  admin: {
    name: process.env.ADMIN_NAME || 'Wildtane Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'wildtane',
  },
  whatsapp: {
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    adminNumber: (process.env.ADMIN_WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'WILDTANE <no-reply@wildtane.com>',
  },
};

// Free Google Gemini key (aistudio.google.com → Get API key) for "Write with AI" in the add-product wizard.
env.gemini = {
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  enabled: Boolean(process.env.GEMINI_API_KEY),
};
env.cloudinary.enabled =Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
env.whatsapp.enabled = Boolean(env.whatsapp.token && env.whatsapp.phoneNumberId && env.whatsapp.adminNumber);
// A login without its password (e.g. Gmail app password not added yet) counts as not configured.
env.smtp.enabled = Boolean(env.smtp.host && (!env.smtp.user || env.smtp.pass));

export default env;
