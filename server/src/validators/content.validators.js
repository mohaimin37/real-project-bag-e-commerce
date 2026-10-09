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
  placement: z.enum(['hero', 'promo', 'announcement']),
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

export const settingsSchema = z.object({
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
      instagram: z.string().trim().max(200).optional().default(''),
      facebook: z.string().trim().max(200).optional().default(''),
      linkedin: z.string().trim().max(200).optional().default(''),
    })
    .optional(),
});
