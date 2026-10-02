import { z } from 'zod';
import { objectId, address, email, phone, countryCode } from './common.js';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../models/Order.js';

export const cartItemSchema = z.object({
  productId: objectId,
  variantId: objectId,
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const cartQtySchema = z.object({ quantity: z.coerce.number().int().min(1).max(99) });

export const cartMergeSchema = z.object({
  items: z.array(cartItemSchema).max(50),
});

export const couponApplySchema = z.object({ code: z.string().trim().min(2).max(30).toUpperCase() });

export const shippingMethodSchema = z.object({ code: z.string().trim().min(2).max(30) });

export const checkoutSchema = z
  .object({
    customer: z.object({
      name: z.string().trim().min(2, 'Enter your full name').max(120),
      email,
      phone,
      country: countryCode,
      nationality: countryCode,
    }),
    // Either an existing saved address id or a full new address.
    addressId: z.string().optional(),
    address: address.optional(),
    saveAddress: z.boolean().optional().default(false),
    shippingMethod: z.string().trim().min(2).max(30).default('standard'),
    paymentMethod: z.string().trim().min(2).max(30),
    customerNote: z.string().trim().max(500).optional().default(''),
  })
  .refine((d) => d.addressId || d.address, { message: 'Choose or enter a delivery address', path: ['address'] });

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional().default(''),
  trackingNumber: z.string().trim().max(60).optional(),
  courier: z.string().trim().max(60).optional(),
  // When the step actually happened (defaults to now). Lets staff log a scan made earlier.
  at: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
  notifyCustomer: z.boolean().optional().default(true),
});

export const paymentStatusSchema = z.object({ paymentStatus: z.enum(PAYMENT_STATUSES) });

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{3,30}$/, 'Use 3–30 letters, numbers, - or _')
      .toUpperCase(),
    description: z.string().trim().max(200).optional().default(''),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().positive('Value must be above 0'),
    minOrder: z.coerce.number().min(0).optional().default(0),
    maxDiscount: z.preprocess((v) => (v === '' ? null : v), z.coerce.number().min(0).nullable().optional()),
    startsAt: z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullable().optional()),
    expiresAt: z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullable().optional()),
    usageLimit: z.preprocess((v) => (v === '' ? null : v), z.coerce.number().int().min(0).nullable().optional()),
    perUserLimit: z.coerce.number().int().min(0).optional().default(1),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => d.type !== 'percentage' || d.value <= 100, {
    message: 'Percentage cannot exceed 100',
    path: ['value'],
  });
