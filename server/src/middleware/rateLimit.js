import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const message = { success: false, message: 'Too many requests. Please wait a moment and try again.' };

// General API limit. Skipped in development, where every request arrives from the
// Vite proxy's single IP. Login and form limits below always apply.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !env.isProd,
  message,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !env.isProd,
  message,
});

// Stricter: the admin portal sign-in is the most valuable target for password guessing.
export const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

// Page-view beacons: generous (fast browsing), but stops floods from skewing reports.
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

export const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});
