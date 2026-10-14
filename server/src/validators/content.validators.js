import { z } from 'zod';
import { email, countryCode, boolish, imageUrl } from './common.js';

const imageRef = z.object({ url: imageUrl, publicId: z.string().optional() }).nullable().optional();

export const blogSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().max(100).optional(),
  excerpt: z.string().trim().max(400).optional().default(''),
  content: z.string().min(20, 'Write at least a few sentences').max(100000),
  coverImage: imageRef,
  category: z.string().trim().max(40).optional().default('Journal'),
  tags: z.array(z.string().trim().max(40)).optional().default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  authorName: z.string().trim().max(80).optional(),
});

export const liveUpdateSchema = z.object({
  title: z.string().trim().min(3, 'Add a headline').max(140),
  body: z.string().trim().max(1000).optional().default(''),
  kind: z.enum(['news', 'drop', 'restock', 'event', 'offer']).default('news'),
  // Internal paths only, or absolute http(s) links — never javascript: and friends.
  link: z
    .string()
    .trim()
    .max(300)
    .refine((v) => !v || /^(\/(?!\/)|https?:\/\/)/i.test(v), 'Use a path like /shop or a full https:// link')
    .optional()
    .default(''),
  linkLabel: z.string().trim().max(40).optional().default(''),
  image: imageRef,
  pinned: boolish.optional().default(false),
  isPublished: boolish.optional().default(true),
});

export const bannerSchema = z.object({
  placement: z.enum(['hero', 'promo', 'announcement', 'offers']),
  eyebrow: z.string().trim().max(60).optional().default(''),
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(400).optional().default(''),
  image: imageRef,
  ctaLabel: z.string().trim().max(40).optional().default(''),
  ctaLink: z.string().trim().max(300).optional().default(''),
  couponCode: z.string().trim().max(30).optional().default(''),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: boolish.optional().default(true),
  startsAt: z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullable().optional()),
  endsAt: z.preprocess((v) => (v === '' ? null : v), z.coerce.date().nullable().optional()),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120),
  email,
  phone: z.string().trim().max(30).optional().default(''),
  subject: z.string().trim().min(3, 'Add a subject').max(160),
  orderId: z.string().trim().max(40).optional().default(''),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(3000),
});

// Multipart form (logo file), so numbers arrive as strings.
export const corporateSchema = z.object({
  company: z.string().trim().min(2, 'Enter the company name').max(160),
  contactPerson: z.string().trim().min(2, 'Enter a contact name').max(120),
  email,
  phone: z.string().trim().regex(/^\+?[0-9\s-]{6,20}$/, 'Enter a valid phone number'),
  country: countryCode,
  address: z.string().trim().max(400).optional().default(''),
  productType: z.string().trim().min(2, 'Choose a product type').max(120),
  quantity: z.coerce.number().int().min(10, 'Bulk orders start at 10 units').max(1000000),
  customization: z.string().trim().max(1000).optional().default(''),
  message: z.string().trim().max(2000).optional().default(''),
});

// Homepage customer comments (anyone, moderated) and the admin's "add a customer's comment".
export const commentSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  city: z.string().trim().max(60).optional().default(''),
  rating: z.coerce.number().min(1, 'Choose a star rating').max(5),
  message: z.string().trim().min(10, 'Write at least a few words (10+ characters)').max(600),
});
export const adminCommentSchema = commentSchema.extend({
  sourceNote: z.string().trim().min(2, 'Say where this comment came from (e.g. WhatsApp)').max(120),
});

export const enquiryUpdateSchema = z.object({
  status: z.string().trim().max(20).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

export const subscribeSchema = z.object({ email });

// Must match the theme ids in client/src/theme/themes.js.
const THEME_IDS = ['default', 'luxury', 'modern', 'ocean', 'rose', 'emerald', 'mono', 'reference', 'clear', 'custom'];

// Colour names for Shop menu tiles. Must match SHOWCASE_TONES in client/src/components/layout/ShopMenuWidget.jsx.
const SHOWCASE_TONES = ['sky', 'rose', 'emerald', 'purple', 'blue', 'indigo', 'teal', 'pink', 'slate'];
const storePath = z.string().trim().max(200).regex(/^\/(?!\/)/, 'Use a store link that starts with /, e.g. /shop/bags');
const showcaseTile = z.object({
  label: z.string().trim().min(1, 'Add a title').max(40),
  sub: z.string().trim().max(80).optional().default(''),
  to: storePath,
  icon: z.string().trim().max(40).optional().default(''),
  badge: z.string().trim().max(24).optional().default(''),
  tone: z.enum(SHOWCASE_TONES).optional().default('slate'),
});

/**
 * Homepage / footer content is free-form JSON edited in the admin. It is checked by walking it:
 * plain strings / numbers / booleans only, size limits, and every link must be a store path
 * (`to`, `link`) and every picture a store or https URL (`image`, `img`), so nothing in it can
 * point a shopper at a script or an outside page.
 */
const LINK_KEYS = new Set(['to', 'link']);
const IMAGE_KEYS = new Set(['image', 'img']);
const URL_KEYS = new Set(['url']); // outside pages (e.g. a press article) — https only
function checkContent(value, ctx, path = [], depth = 0) {
  const fail = (message) => ctx.addIssue({ code: 'custom', message, path });
  if (depth > 6) return fail('Too deeply nested');
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return;
  if (typeof value === 'string') {
    const key = path[path.length - 1];
    if (value.length > 600) return fail('Text is too long (600 characters at most)');
    if (LINK_KEYS.has(key) && value && !/^\/(?!\/)/.test(value)) return fail('Use a store link that starts with /, e.g. /shop/bags');
    if (IMAGE_KEYS.has(key) && value && !/^(\/(?!\/)|https:\/\/)/.test(value)) return fail('Use an uploaded picture');
    if (URL_KEYS.has(key) && value && !/^https:\/\/[^\s]+$/.test(value)) return fail('Use a full https:// link');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 30) return fail('Too many items (30 at most)');
    value.forEach((v, i) => checkContent(v, ctx, [...path, i], depth + 1));
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 40) return fail('Too many fields');
    entries.forEach(([k, v]) => checkContent(v, ctx, [...path, k], depth + 1));
    return;
  }
  fail('Unsupported value');
}
const socialUrl = z.string().trim().max(200).refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), 'Use a full https:// link').optional().default('');
const contentBlob = z
  .record(z.string(), z.any())
  .superRefine((v, ctx) => checkContent(v, ctx))
  .nullable()
  .optional();

export const settingsSchema = z.object({
  // Razorpay webhook signing secret ('' removes it). Write-only: never sent back to the browser.
  razorpayWebhookSecret: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === '' || (v.length >= 12 && !/\s/.test(v)), 'Use the exact secret from Razorpay (at least 12 characters, no spaces)')
    .optional(),
  homepage: contentBlob,
  footer: contentBlob,
  storeName: z.string().trim().min(2).max(60).optional(),
  companyName: z.string().trim().max(100).optional(),
  supportEmail: email.optional(),
  supportPhone: z.string().trim().max(30).optional(),
  businessAddress: z.string().trim().max(300).optional(),
  supportHours: z.string().trim().max(120).optional(),
  grievanceOfficer: z
    .object({
      name: z.string().trim().max(80).optional().default(''),
      designation: z.string().trim().max(80).optional().default(''),
      email: z.union([email, z.literal('')]).optional().default(''),
      phone: z.string().trim().max(30).optional().default(''),
    })
    .optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || /^[0-9]{2}[A-Z0-9]{13}$/.test(v), 'GSTIN is 15 characters, e.g. 27ABCDE1234F1Z5')
    .optional(),
  announcement: z.string().trim().max(200).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  taxLabel: z.string().trim().max(20).optional(),
  pricesIncludeTax: z.boolean().optional(),
  freeShippingThreshold: z.coerce.number().min(0).optional(),
  codEnabled: z.boolean().optional(),
  codMaxOrder: z.coerce.number().min(0).optional(),
  loyalty: z
    .object({
      enabled: z.boolean(),
      coinsPer100: z.coerce.number().min(0, 'Use 0 or more').max(100),
      rupeesPerCoin: z.coerce.number().min(0.01, 'A coin must be worth at least ₹0.01').max(100),
      maxRedeemPercent: z.coerce.number().int().min(1).max(100),
      signupBonus: z.coerce.number().int().min(0).max(10000).optional(),
      referralBonus: z.coerce.number().int().min(0).max(10000).optional(),
      referralQualifyOn: z.enum(['signup', 'first_delivery']).optional(),
      maxReferralsPerUser: z.coerce.number().int().min(0).max(10000).optional(),
    })
    .optional(),
  promoRibbon: z
    .array(
      z
        .object({
          label: z.string().trim().min(2, 'Add a label').max(40),
          // Storefront paths only (no external links in the offer strip).
          to: z.string().trim().max(200).regex(/^\/(?!\/)/, 'Use a store link that starts with /, e.g. /offers'),
          icon: z.string().trim().max(40).optional().default(''),
          isActive: z.boolean().optional().default(true),
          startsAt: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable().optional()),
          endsAt: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable().optional()),
        })
        .refine((p) => !p.startsAt || !p.endsAt || p.endsAt > p.startsAt, { message: 'End date must be after the start date', path: ['endsAt'] })
    )
    .max(8)
    .optional(),
  wallet: z
    .object({
      enabled: z.boolean().optional(),
      maxRedeemPercent: z.coerce.number().int().min(1).max(100).optional(),
    })
    .optional(),
  giftCardsEnabled: z.boolean().optional(),
  spinToWin: z
    .object({
      enabled: z.boolean(),
      slices: z
        .array(
          z
            .object({
              label: z.string().trim().min(2, 'Add a prize name').max(60),
              short: z.string().trim().min(1, 'Add the text printed on the wheel').max(12, 'Wheel text: 12 characters at most'),
              type: z.enum(['fixed', 'percentage', 'free_shipping']),
              value: z.coerce.number().min(0).max(100000),
              minOrder: z.coerce.number().min(0).max(10000000).optional().default(0),
              weight: z.coerce.number().min(0).max(1000),
              color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Colour like #0284c7'),
              isActive: z.boolean().optional().default(true),
            })
            .refine((s) => s.type === 'free_shipping' || s.value > 0, { message: 'Give the discount an amount', path: ['value'] })
            .refine((s) => s.type !== 'percentage' || s.value <= 90, { message: 'Percentage prizes can be at most 90%', path: ['value'] })
        )
        .max(8, 'At most 8 prizes')
        .refine((list) => list.filter((s) => s.isActive !== false && s.weight > 0).length >= 2, 'Keep at least 2 prizes switched on with a chance above 0')
        .optional(),
    })
    .optional(),
  returnRefundMethods: z
    .array(z.enum(['Original Payment Method', 'UPI', 'Bank Transfer', 'Store Coins Wallet']))
    .min(1, 'Keep at least one refund option')
    .optional(),
  shopShowcase: z
    .object({
      customized: z.literal(true),
      departments: z.array(showcaseTile.extend({ img: z.string().trim().max(300).optional().default(''), highlights: z.array(z.string().trim().max(40)).max(8).optional().default([]) })).max(8),
      budgets: z.array(showcaseTile).max(8),
      trends: z.array(showcaseTile).max(12),
      perks: z.array(z.object({ icon: z.string().trim().max(40), title: z.string().trim().min(1).max(40), sub: z.string().trim().max(60).optional().default('') })).max(6),
      spotlightSlug: z.string().trim().max(200).optional().default(''),
    })
    .nullable()
    .optional(),
  cancellationRefunds: z.object({ automatic: z.boolean() }).optional(),
  refundEta: z.string().trim().max(60).optional(),
  shippingPackage: z
    .object({
      pickupLocation: z.string().trim().max(60).optional(),
      lengthCm: z.coerce.number().positive().max(300).optional(),
      breadthCm: z.coerce.number().positive().max(300).optional(),
      heightCm: z.coerce.number().positive().max(300).optional(),
      weightKg: z.coerce.number().positive().max(100).optional(),
      autoCreateOnConfirm: z.boolean().optional(),
    })
    .optional(),
  shippingMethods: z
    .array(
      z.object({
        code: z.string().trim().regex(/^[a-z0-9_-]{2,30}$/),
        label: z.string().trim().max(60),
        description: z.string().trim().max(160).optional().default(''),
        eta: z.string().trim().max(60),
        price: z.coerce.number().min(0),
        freeEligible: z.boolean().optional().default(false),
      })
    )
    .min(1)
    .optional(),
  currencies: z
    .array(
      z.object({
        code: z.string().trim().length(3).toUpperCase(),
        symbol: z.string().max(6),
        label: z.string().trim().max(60),
        rate: z.coerce.number().positive(),
      })
    )
    .min(1)
    .optional(),
  appearance: z
    .object({
      defaultTheme: z.enum(THEME_IDS),
      defaultMode: z.enum(['light', 'dark']),
      enabledThemes: z.array(z.enum(THEME_IDS)).min(1, 'Keep at least one theme switched on'),
    })
    .refine((a) => a.enabledThemes.includes(a.defaultTheme), { message: 'The default theme must be switched on', path: ['defaultTheme'] })
    .optional(),
  social: z
    .object({
      instagram: socialUrl,
      facebook: socialUrl,
      linkedin: socialUrl,
    })
    .optional(),
});
