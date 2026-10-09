import { z } from 'zod';
import { objectId, boolish, imageUrl } from './common.js';

// Accepts a real array or a JSON-encoded array string (multipart forms).
const jsonArray = (inner, { min, message } = {}) =>
  z.preprocess(
    (v) => {
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      }
      return v;
    },
    min ? z.array(inner).min(min, message) : z.array(inner)
  );

const image = z.object({ url: imageUrl, publicId: z.string().optional(), alt: z.string().max(160).optional() });

const variant = z.object({
  _id: objectId.optional(),
  name: z.string().trim().min(1, 'Variant name is required').max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1a2b3c')
    .default('#111111'),
  colorFamily: z.string().trim().max(30).toLowerCase().optional().default(''),
  size: z.string().trim().max(20).optional().default(''),
  sku: z.string().trim().min(2, 'Variant SKU is required').max(40).toUpperCase(),
  stock: z.coerce.number().int().min(0),
  images: z.array(image).optional().default([]),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().max(100).optional(),
  sku: z.string().trim().min(2).max(40).toUpperCase(),
  tagline: z.string().trim().max(80).optional().default(''),
  badge: z.string().trim().max(30).optional().default(''),
  shortDescription: z.string().trim().max(300).optional().default(''),
  description: z.string().trim().max(5000).optional().default(''),
  category: objectId,
  subcategory: objectId.nullable().optional(),
  gender: z.enum(['unisex', 'women', 'men']).optional().default('unisex'),
  price: z.coerce.number().min(0),
  salePrice: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().min(0).nullable()),
  images: jsonArray(image).optional().default([]),
  variants: jsonArray(variant, { min: 1, message: 'Add at least one variant' }),
  materials: jsonArray(z.string().trim().max(60)).optional().default([]),
  features: jsonArray(z.string().trim().max(60)).optional().default([]),
  purposes: jsonArray(z.string().trim().max(40)).optional().default([]),
  tags: jsonArray(z.string().trim().max(40)).optional().default([]),
  capacity: z.string().trim().max(20).optional().default(''),
  specifications: jsonArray(z.object({ label: z.string().max(60), value: z.string().max(200) })).optional().default([]),
  faqs: jsonArray(z.object({ question: z.string().max(200), answer: z.string().max(1000) })).optional().default([]),
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(5),
  isFeatured: boolish.optional().default(false),
  isBestseller: boolish.optional().default(false),
  isNewArrival: boolish.optional().default(false),
  isVisible: boolish.optional().default(true),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(100).optional(),
  tagline: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().max(600).optional().default(''),
  image: z.object({ url: imageUrl, publicId: z.string().optional() }).nullable().optional(),
  parent: objectId.nullable().optional(),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: boolish.optional().default(true),
  showInMenu: boolish.optional().default(true),
});

export const stockUpdateSchema = z.object({
  variants: z.array(z.object({ _id: objectId, stock: z.coerce.number().int().min(0) })).min(1),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a rating').max(5),
  title: z.string().trim().max(120).optional().default(''),
  comment: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(2000),
});

// Admin "Quick edit": change a few fields without resending the whole product.
export const quickProductSchema = z
  .object({
    price: z.coerce.number().min(0).max(10000000).optional(),
    salePrice: z.preprocess((v) => (v === '' ? null : v), z.coerce.number().min(0).nullable().optional()),
    // Pick where it's listed: a subcategory (its parent becomes the category) or a top-level category.
    listing: objectId.optional(),
    images: z.array(image).min(1, 'Keep at least one photo').max(15).optional(),
    isVisible: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isBestseller: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    gender: z.enum(['unisex', 'women', 'men']).optional(),
    name: z.string().trim().min(2, 'Enter a product name').max(120).optional(),
    tagline: z.string().trim().max(80).optional(),
    badge: z.string().trim().max(30).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Nothing to update');

export const bulkProductSchema = z
  .object({
    ids: z.array(objectId).min(1, 'Select at least one product').max(500),
    action: z.enum(['sale', 'endSale', 'move', 'show', 'hide', 'feature', 'unfeature', 'gender']),
    percent: z.coerce.number().min(1).max(90).optional(),
    listing: objectId.optional(),
    gender: z.enum(['unisex', 'women', 'men']).optional(),
  })
  .refine((d) => d.action !== 'gender' || d.gender, { message: 'Choose who it is for', path: ['gender'] })
  .refine((d) => d.action !== 'sale' || d.percent, { message: 'Enter the % off', path: ['percent'] })
  .refine((d) => d.action !== 'move' || d.listing, { message: 'Choose where to move them', path: ['listing'] });
