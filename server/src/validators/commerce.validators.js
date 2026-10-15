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

export const useCoinsSchema = z.object({ use: z.boolean() });

// Admin: give (+) or take back (−) loyalty coins, with a reason the customer sees in their history.
export const coinAdjustSchema = z.object({
  coins: z.coerce.number().int().refine((n) => n !== 0, 'Enter a number of coins').refine((n) => Math.abs(n) <= 100000, 'Too many coins'),
  note: z.string().trim().min(3, 'Add a short reason').max(200),
});

// Admin wallet adjustment: ₹ amount (+ credit / − debit) with a reason for the audit log.
export const walletAdjustSchema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0, 'Enter an amount').refine((n) => Math.abs(n) <= 100000, 'Amount is too large'),
  type: z.enum(['admin_credit', 'promo']).optional().default('admin_credit'),
  note: z.string().trim().min(3, 'Add a short reason').max(200),
  expiresAt: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable().optional()),
});

export const giftCardIssueSchema = z.object({
  amount: z.coerce.number().positive('Enter an amount above ₹0').max(100000),
  expiryDate: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.date().optional()),
  withPin: z.boolean().optional().default(false),
  note: z.string().trim().max(200).optional().default(''),
});

export const giftCardAdjustSchema = z.object({
  amount: z.coerce.number().optional().default(0),
  isActive: z.boolean().optional(),
  note: z.string().trim().min(3, 'Add a short reason').max(200),
});

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
    // Stored value applied before the payment method. Amounts are always worked out on the server.
    giftCardCode: z.string().trim().max(40).optional(),
    giftCardPin: z.string().trim().max(10).optional(),
    useWallet: z.boolean().optional().default(false),
    paymentDetails: z
      .object({
        razorpayOrderId: z.string().trim().optional(),
        razorpayPaymentId: z.string().trim().optional(),
        razorpaySignature: z.string().trim().optional(),
      })
      .optional(),
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
  // Personal message to the customer with this update (shown on their order page and in the email).
  customerMessage: z.string().trim().max(1000).optional().default(''),
});

/** A message to the customer about their order, sent from the admin order page at any time. */
export const orderMessageSchema = z.object({
  text: z.string().trim().min(2, 'Write a message').max(1000),
  email: z.boolean().optional().default(true),
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
