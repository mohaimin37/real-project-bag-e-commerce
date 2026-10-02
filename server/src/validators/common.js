import { z } from 'zod';
import mongoose from 'mongoose';

// Absolute http(s) URL (Cloudinary) or a locally stored upload path.
export const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v) || v.startsWith('/uploads/'), 'Invalid image URL');

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');
export const countryCode = z.string().trim().length(2, 'Select a country').toUpperCase();
export const email = z.email('Enter a valid email').trim().toLowerCase().max(160);

export const phone = z.object({
  dialCode: z.string().trim().regex(/^\+\d{1,4}$/, 'Invalid dial code'),
  number: z
    .string()
    .trim()
    .regex(/^[0-9\s-]{5,16}$/, 'Enter a valid phone number'),
});

export const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const address = z.object({
  label: z.string().trim().max(40).optional().default('Home'),
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(120),
  phone,
  addressLine1: z.string().trim().min(3, 'Enter the street address').max(200),
  addressLine2: z.string().trim().max(200).optional().default(''),
  landmark: z.string().trim().max(120).optional().default(''),
  city: z.string().trim().min(2, 'Enter the city').max(80),
  state: z.string().trim().min(2, 'Enter the state / region').max(80),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9\s-]{3,12}$/, 'Enter a valid postal code'),
  country: countryCode,
  isDefault: z.boolean().optional().default(false),
});

// Accepts "true"/"false" strings from multipart forms as well as real booleans.
export const boolish = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());
export const numberish = z.preprocess((v) => (v === '' || v === null ? undefined : Number(v)), z.number());
