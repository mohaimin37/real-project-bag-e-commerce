import { z } from 'zod';
import { email, password, phone, countryCode, address } from './common.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email,
  password,
  phone: phone.optional(),
  country: countryCode.optional().default('IN'),
  nationality: countryCode.optional().default('IN'),
  // Without this the validator stripped the code and referrals were never recorded.
  referralCode: z.string().trim().toUpperCase().max(20).regex(/^[A-Z0-9-]*$/, 'Referral codes use letters and numbers only').optional().default(''),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const forgotSchema = z.object({ email });

export const verifyOtpSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit verification code'),
});

export const resetPasswordOtpSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit verification code'),
  password,
});

export const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phone.optional(),
  country: countryCode.optional(),
  nationality: countryCode.optional(),
  birthday: z.coerce.date().optional().nullable(),
  notificationPreferences: z.object({
    orderUpdates: z.boolean().optional(),
    promotions: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
  }).optional(),
});


export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

export const addressSchema = address;
