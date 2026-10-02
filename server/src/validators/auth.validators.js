import { z } from 'zod';
import { email, password, phone, countryCode, address } from './common.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email,
  password,
  phone: phone.optional(),
  country: countryCode.optional().default('IN'),
  nationality: countryCode.optional().default('IN'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phone.optional(),
  country: countryCode.optional(),
  nationality: countryCode.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
});

export const addressSchema = address;
