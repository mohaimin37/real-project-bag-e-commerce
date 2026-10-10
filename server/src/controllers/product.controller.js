import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';
import {
  PUBLIC_PRODUCT_FIELDS,
  SORTS,
  buildProductFilter,
  getFacets,
  uniqueSlug,
} from '../services/product.service.js';
import { uploadMany, deleteFile } from '../services/upload.service.js';
import { writeListing } from '../services/ai.service.js';
import env from '../config/env.js';

const populateCats = [
  { path: 'category', select: 'name slug' },
  { path: 'subcategory', select: 'name slug' },
];

// ── Public ───────────────────────────────────────────────────

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 12, maxLimit: 48 });
  const filter = await buildProductFilter(req.query);
  const sort = SORTS[req.query.sort] || SORTS.featured;
  const [items, total] = await Promise.all([
    Product.find(filter).select(PUBLIC_PRODUCT_FIELDS).populate(populateCats).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const productFacets = asyncHandler(async (req, res) => {
  // Facets reflect the category/search scope, not the other active filters, so options don't vanish.
  const scope = await buildProductFilter({ q: req.query.q, category: req.query.category, gender: req.query.gender });
  res.json({ success: true, facets: await getFacets(scope) });
});

export const suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ success: true, products: [], categories: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const [products, categories] = await Promise.all([
    Product.find({ isVisible: true, $or: [{ name: rx }, { tags: rx }, { tagline: rx }, { materials: rx }] })
      .select('name slug images price salePrice finalPrice tagline ratingAverage ratingCount category isBestseller')
      .populate('category', 'name slug')
      .sort({ soldCount: -1 })
      .limit(8)
      .lean(),
    Category.find({ isActive: true, name: rx }).select('name slug parent image').limit(6).lean(),
  ]);
  res.json({ success: true, products, categories });
});

export const getCollections = asyncHandler(async (req, res) => {
  const base = { isVisible: true };
  const limit = Math.min(12, Number(req.query.limit) || 8);
  const [bestSellers, newArrivals, featured] = await Promise.all([
    Product.find({ ...base, isBestseller: true }).select(PUBLIC_PRODUCT_FIELDS).sort({ soldCount: -1 }).limit(limit).lean(),
    Product.find({ ...base, isNewArrival: true }).select(PUBLIC_PRODUCT_FIELDS).sort({ createdAt: -1 }).limit(limit).lean(),
    Product.find({ ...base, isFeatured: true }).select(PUBLIC_PRODUCT_FIELDS).sort({ soldCount: -1 }).limit(limit).lean(),
  ]);
  res.json({ success: true, bestSellers, newArrivals, featured });
});

export const getProduct = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const query = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
  const product = await Product.findOne({ ...query, isVisible: true }).populate(populateCats).lean();
  if (!product) throw ApiError.notFound('This product is not available');

  const [related, distribution] = await Promise.all([
    Product.find({
      _id: { $ne: product._id },
      isVisible: true,
      $or: [{ subcategory: product.subcategory?._id || null }, { category: product.category?._id }],
    })
      .select(PUBLIC_PRODUCT_FIELDS)
      .sort({ soldCount: -1 })
      .limit(4)
      .lean(),
    Review.aggregate([
      { $match: { product: product._id, status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: distribution.find((d) => d._id === star)?.count || 0,
  }));
  res.json({ success: true, product, related, ratingBreakdown });
});

export const getProductsByIds = asyncHandler(async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .filter((id) => mongoose.isValidObjectId(id))
    .slice(0, 50);
  const products = await Product.find({ _id: { $in: ids }, isVisible: true }).select(PUBLIC_PRODUCT_FIELDS);
  res.json({ success: true, products });
});

// ── Admin ────────────────────────────────────────────────────

export const adminListProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = await buildProductFilter(req.query, { admin: true });
  const sort = SORTS[req.query.sort] || { createdAt: -1 };
  const [items, total] = await Promise.all([
    Product.find(filter).populate(populateCats).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(populateCats);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, product });
});

async function assertCategories(body) {
  const cat = await Category.findById(body.category);
  if (!cat) throw ApiError.badRequest('Choose a valid category', [{ field: 'category', message: 'Not found' }]);
  if (body.subcategory) {
    const sub = await Category.findById(body.subcategory);
    if (!sub || String(sub.parent) !== String(cat._id)) {
      throw ApiError.badRequest('Subcategory must belong to the chosen category', [{ field: 'subcategory', message: 'Mismatch' }]);
    }
  }
}

function assertUniqueVariantSkus(variants) {
  const skus = variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) throw ApiError.badRequest('Each variant needs a unique SKU');
}

export const createProduct = asyncHandler(async (req, res) => {
  await assertCategories(req.body);
  assertUniqueVariantSkus(req.body.variants);
  const slug = await uniqueSlug(Product, req.body.slug || req.body.name);
  const product = await Product.create({ ...req.body, slug, subcategory: req.body.subcategory || null });
  res.status(201).json({ success: true, product });
});

// ── Add-product wizard suggestions ───────────────────────────
// No AI service: everything is inferred from the name and from similar products already in the catalogue.

// Words that point at a subcategory even when they don't appear in its name.
const CATEGORY_HINTS = {
  backpack: 'Backpacks', rucksack: 'Backpacks', daypack: 'Daypacks', tote: 'Tote Bags', shopper: 'Tote Bags',
  duffel: 'Duffle Bags', duffle: 'Duffle Bags', weekender: 'Duffle Bags', holdall: 'Duffle Bags', handbag: 'Handbags', purse: 'Handbags',
  satchel: 'Handbags', hobo: 'Handbags', clutch: 'Clutches', wallet: 'Wallets', cardholder: 'Wallets', sling: 'Sling Bags',
  crossbody: 'Sling Bags', messenger: 'Office Bags', laptop: 'Laptop Bags', briefcase: 'Tech Briefcases', office: 'Office Bags',
  suitcase: 'Cabin Luggage', trolley: 'Cabin Luggage', luggage: 'Cabin Luggage', cabin: 'Cabin Luggage', carry: 'Cabin Luggage',
  beach: 'Beach & Straw Bags', straw: 'Beach & Straw Bags', jute: 'Beach & Straw Bags', organiser: 'Travel Organisers',
  organizer: 'Travel Organisers', cube: 'Travel Organisers', bottle: 'Hydration', flask: 'Hydration', tumbler: 'Hydration',
  passport: 'Passport Holders', tag: 'Luggage Tags', toiletry: 'Toiletry Kits', dopp: 'Toiletry Kits', washbag: 'Toiletry Kits',
  belt: 'Belt Bags', bum: 'Belt Bags', fanny: 'Belt Bags', waist: 'Belt Bags', keychain: 'Keychains', keyring: 'Keychains',
  pouch: 'Pouches', eyewear: 'Eyewear Cases', sunglass: 'Eyewear Cases', glasses: 'Eyewear Cases', sleeve: 'Laptop Sleeves',
  pillow: 'Travel Comfort', eyemask: 'Travel Comfort', waterproof: 'Waterproof Commuters', commuter: 'Waterproof Commuters',
};

const COLOURS = [
  ['black', '#17171a', 'onyx'], ['onyx', '#17171a', 'onyx'], ['charcoal', '#36373b', 'grey'], ['grey', '#8a8a8f', 'grey'], ['gray', '#8a8a8f', 'grey'],
  ['navy', '#1b263b', 'navy'], ['blue', '#2f5d9b', 'blue'], ['teal', '#1f6f6b', 'teal'], ['green', '#3c6e47', 'green'], ['olive', '#5b5f3a', 'olive'],
  ['khaki', '#a39c7a', 'olive'], ['tan', '#b8875a', 'tan'], ['camel', '#c19a6b', 'tan'], ['beige', '#d8c3a5', 'tan'], ['cognac', '#96582c', 'brown'],
  ['brown', '#6b4428', 'brown'], ['chocolate', '#4a2c1d', 'brown'], ['white', '#f4f1ea', 'white'], ['cream', '#efe6d2', 'white'], ['ivory', '#f6f1e3', 'white'],
  ['red', '#a3242b', 'red'], ['maroon', '#5e1a24', 'red'], ['burgundy', '#5e1a24', 'red'], ['pink', '#e3a1b4', 'pink'], ['blush', '#e8b9b0', 'pink'],
  ['orange', '#d96b27', 'orange'], ['mustard', '#c99a2e', 'orange'], ['yellow', '#e2b93b', 'orange'],
];

const stem = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(es|s)$/, '');
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function topValues(lists, n) {
  const counts = new Map();
  lists.flat().filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v);
}

/** A tidy shop price near `n`: 1,999 / 2,499 / 3,999… */
function shopPrice(n) {
  if (!n) return 0;
  if (n < 1000) return Math.max(99, Math.round(n / 50) * 50 - 1);
  return Math.round(n / 500) * 500 - 1;
}

async function suggestSku(name, capacity) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2 && w !== 'THE');
  const core = (words[0] || 'NEW').replace(/[AEIOU]/g, '').slice(0, 3).padEnd(3, 'X');
  const num = capacity.match(/\d+/)?.[0] || '';
  const base = `WT-${core}${num ? `-${num}` : ''}`;
  for (let i = 0; i < 50; i += 1) {
    const sku = i === 0 ? base : `${base}-${String(i + 1).padStart(2, '0')}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await Product.exists({ $or: [{ sku }, { 'variants.sku': { $regex: `^${escapeRegex(sku)}-` } }] }))) return sku;
  }
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export const suggestProductDetails = asyncHandler(async (req, res) => {
  const name = String(req.query.name || '').trim().slice(0, 140);
  if (name.length < 2) return res.json({ success: true, suggestion: null });

  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && w !== 'the' && w !== 'and');
  const stems = [...new Set(words.map(stem))];
  const capacity = name.match(/(\d+(?:\.\d+)?)\s*(l|litre|liter|ltr)s?\b/i)?.[1];
  const cats = await Category.find({ isActive: true }).select('name parent').lean();
  const subs = cats.filter((c) => c.parent);

  // 1. Category: words in the name vs subcategory names, plus the hint list.
  const score = new Map();
  const bump = (id, by) => score.set(String(id), (score.get(String(id)) || 0) + by);
  for (const sub of subs) {
    const subStems = sub.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && w !== 'bag').map(stem);
    if (subStems.some((s) => stems.includes(s))) bump(sub._id, 3);
  }
  for (const s of stems) {
    const hinted = CATEGORY_HINTS[s] || CATEGORY_HINTS[`${s}s`];
    const sub = hinted && subs.find((c) => c.name === hinted);
    if (sub) bump(sub._id, 2);
  }

  // 2. Similar products: share words with the name (name or tags).
  const rx = stems.filter((s) => s.length > 2).map((s) => new RegExp(escapeRegex(s), 'i'));
  let similar = rx.length
    ? await Product.find({ $or: [...rx.map((r) => ({ name: r })), ...rx.map((r) => ({ tags: r }))] }).populate(populateCats).limit(60).lean()
    : [];
  const overlap = (p) => stems.filter((s) => p.name.toLowerCase().includes(s) || p.tags?.some((t) => t.includes(s))).length;
  similar = similar.map((p) => ({ p, o: overlap(p) })).sort((a, b) => b.o - a.o || b.p.soldCount - a.p.soldCount).map((x) => x.p);
  similar.slice(0, 10).forEach((p) => p.subcategory && bump(p.subcategory._id, 1));

  const bestId = [...score.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const sub = subs.find((c) => String(c._id) === bestId);
  const parentId = sub ? String(sub.parent) : similar[0]?.category?._id && String(similar[0].category._id);
  const category = cats.find((c) => String(c._id) === parentId);

  // Prefer products from the same subcategory when comparing prices and attributes.
  if (sub) {
    const same = similar.filter((p) => String(p.subcategory?._id) === String(sub._id));
    const extra = same.length >= 4 ? [] : await Product.find({ subcategory: sub._id, _id: { $nin: same.map((p) => p._id) } }).populate(populateCats).sort({ soldCount: -1 }).limit(8 - same.length).lean();
    similar = [...same, ...extra, ...similar.filter((p) => !same.includes(p))];
  }
  const peers = similar.slice(0, 8);

  // 3. Price from peers.
  const prices = peers.map((p) => p.price).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  const price = prices.length
    ? { suggested: shopPrice(median), min: prices[0], max: prices[prices.length - 1], basedOn: prices.length }
    : null;

  // 4. Attributes most common among peers.
  const materials = topValues(peers.map((p) => p.materials || []), 3);
  // One feature per kind (no "Laptop 14" Sleeve" next to "Laptop 16" Sleeve").
  const features = topValues(peers.map((p) => p.features || []), 8).filter((f, i, all) => all.findIndex((g) => g.split(' ')[0] === f.split(' ')[0]) === i).slice(0, 4);
  const purposes = topValues(peers.map((p) => p.purposes || []), 2);
  const tags = [...words.filter((w) => !/^\d/.test(w)), ...topValues(peers.map((p) => p.tags || []), 4)]
    .filter((t, i, all) => all.findIndex((u) => stem(u) === stem(t)) === i)
    .slice(0, 8);
  const specLabels = topValues(peers.map((p) => (p.specifications || []).map((s) => s.label)), 5);

  // 5. Colours named in the product name, else the colours similar products sell in.
  const named = COLOURS.filter(([word]) => words.includes(word));
  const colours = (named.length
    ? named.map(([word, hex, family]) => ({ name: titleCase(word), colorHex: hex, colorFamily: family }))
    : topValues(peers.map((p) => (p.variants || []).map((v) => JSON.stringify({ name: v.name, colorHex: v.colorHex, colorFamily: v.colorFamily }))), 3).map((s) => JSON.parse(s))
  ).slice(0, 3);
  if (!colours.length) colours.push({ name: 'Onyx Black', colorHex: '#17171a', colorFamily: 'onyx' });

  // 6. Copy: a few taglines and descriptions to pick from.
  const cap = capacity ? `${capacity}L` : '';
  const kind = (sub?.name || category?.name || 'Bag').replace(/ies$/, 'y').replace(/s$/, '');
  const mat = materials[0]?.toLowerCase();
  const use = purposes.length ? purposes.join(' and ') : 'everyday';
  const feat = features.slice(0, 2).map((f) => (/^[A-Z]{2,}/.test(f) ? f : f.charAt(0).toLowerCase() + f.slice(1))).join(' and ');
  const short = name.replace(/^the\s+/i, '');
  const taglines = [...new Set([cap ? `${cap} ${kind}` : kind, `${titleCase(use.split(' and ')[0])} ${kind}`, mat ? `${titleCase(materials[0].split(' ').slice(-1)[0])} ${kind}` : `Everyday ${kind}`])]
    .map((t) => t.slice(0, 80));
  const shortDescriptions = [
    `${mat ? `${titleCase(mat)} ` : ''}${kind.toLowerCase()} built for ${use} use${feat ? `, with ${feat}` : ''}.`,
    `A clean, durable ${kind.toLowerCase()}${cap ? ` with ${cap} of space` : ''} that keeps your essentials organised.`,
  ].map((t) => t.charAt(0).toUpperCase() + t.slice(1, 300));
  const descriptions = [
    `The ${short} is made for ${use} days. ${mat ? `It's crafted from ${mat}` : 'It is made from hard-wearing materials'}${feat ? ` and comes with ${feat}` : ''}, so it stays organised and looks sharp from morning to night.${cap ? ` With ${cap} of space, it fits a full day's essentials.` : ''}\n\nEvery seam, zip and pocket is chosen to last, and it's backed by the WILDTANE quality promise.`,
    `Meet the ${short}: a ${kind.toLowerCase()} that keeps things simple. Smart pockets keep small items in reach, ${mat ? `the ${mat} body handles daily wear` : 'the durable body handles daily wear'}, and the clean design works for ${use}.\n\nLight to carry, easy to love, built for years of use.`,
  ];

  res.json({
    success: true,
    suggestion: {
      category: category ? { _id: category._id, name: category.name } : null,
      subcategory: sub ? { _id: sub._id, name: sub.name } : null,
      sku: await suggestSku(name, cap),
      capacity: cap,
      price,
      taglines,
      shortDescriptions,
      descriptions,
      materials,
      features,
      purposes,
      tags,
      colours,
      specifications: specLabels
        .filter((label, i, all) => !/^volume$/i.test(label) || !all.some((l) => /^capacity$/i.test(l))) // one size row, not two
        .map((label) => ({
          label,
          value: /volume|capacity/i.test(label) && cap ? `${capacity} Litres`
            : /^materials?$/i.test(label) ? materials[0] || ''
            : /^colou?rs?$/i.test(label) ? colours.map((c) => c.name).join(', ')
            : '',
        })),
      similar: peers.slice(0, 4).map((p) => ({ ...p, finalPrice: p.finalPrice ?? p.price })),
    },
  });
});

export const aiStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, enabled: env.gemini.enabled });
});

/** "Write with AI": Gemini looks at the photos + name and returns a full listing. */
export const aiWriteProduct = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 140);
  const imageUrls = (Array.isArray(req.body.images) ? req.body.images : []).filter((u) => typeof u === 'string').slice(0, 3);
  const price = Number(req.body.price) || null;
  const range = req.body.priceRange;
  const priceRange = range && Number(range.min) && Number(range.max) ? { min: Number(range.min), max: Number(range.max) } : null;

  const cats = await Category.find({ isActive: true }).select('name parent').lean();
  const subs = cats.filter((c) => c.parent);
  const { listing, model, usedPhotos } = await writeListing({ name, price, priceRange, subcategories: subs.map((c) => c.name), imageUrls });

  // The store name in every product name is noise ("WILDTANE Travel Backpack").
  if (typeof listing.name === 'string') listing.name = listing.name.replace(/^\s*wildtane\s+/i, '').trim();
  const sub = subs.find((c) => c.name.toLowerCase() === String(listing.type || '').toLowerCase().trim());
  const parent = sub && cats.find((c) => String(c._id) === String(sub.parent));
  res.json({
    success: true,
    listing,
    category: parent ? { _id: parent._id, name: parent.name } : null,
    subcategory: sub ? { _id: sub._id, name: sub.name } : null,
    model,
    usedPhotos,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  await assertCategories(req.body);
  assertUniqueVariantSkus(req.body.variants);

  const removedImages = product.images.filter((img) => img.publicId && !req.body.images.some((n) => n.url === img.url));
  const slug = req.body.slug && req.body.slug !== product.slug ? await uniqueSlug(Product, req.body.slug, product._id) : product.slug;

  product.set({ ...req.body, slug, subcategory: req.body.subcategory || null });
  await product.save();
  removedImages.forEach((img) => deleteFile(img.publicId));
  res.json({ success: true, product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  product.images.forEach((img) => deleteFile(img.publicId));
  await Review.deleteMany({ product: product._id });
  res.json({ success: true });
});

export const uploadProductImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Choose at least one image');
  const images = await uploadMany(req.files, 'products');
  res.status(201).json({ success: true, images });
});

export const updateStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  for (const { _id, stock } of req.body.variants) {
    const variant = product.variants.id(_id);
    if (variant) variant.stock = stock;
  }
  if (req.body.lowStockThreshold !== undefined) {
    product.lowStockThreshold = Number(req.body.lowStockThreshold);
  }
  await product.save();
  res.json({ success: true, product });
});

export const toggleProductFlag = asyncHandler(async (req, res) => {
  const allowed = ['isVisible', 'isFeatured', 'isBestseller', 'isNewArrival'];
  const { flag, value } = req.body;
  if (!allowed.includes(flag) || typeof value !== 'boolean') throw ApiError.badRequest('Invalid flag');
  const product = await Product.findByIdAndUpdate(req.params.id, { [flag]: value }, { returnDocument: 'after' });
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, product });
});

// ── Admin quick edit & bulk actions ──────────────────────────

/** Resolves a "listing" id (subcategory or top-level category) to { category, subcategory }. */
async function resolveListing(id) {
  const cat = await Category.findById(id).select('parent');
  if (!cat) throw ApiError.badRequest('Choose a valid category', [{ field: 'listing', message: 'Not found' }]);
  return cat.parent ? { category: cat.parent, subcategory: cat._id } : { category: cat._id, subcategory: null };
}

export const quickUpdateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const { listing, ...fields } = req.body;
  const price = fields.price ?? product.price;
  const sale = fields.salePrice === undefined ? product.salePrice : fields.salePrice;
  if (sale != null && sale >= price) {
    throw ApiError.badRequest('Sale price must be lower than the regular price', [{ field: 'salePrice', message: 'Must be below the price' }]);
  }
  if (listing) Object.assign(fields, await resolveListing(listing));
  const removed = fields.images ? product.images.filter((img) => img.publicId && !fields.images.some((n) => n.url === img.url)) : [];
  product.set(fields);
  await product.save(); // recomputes final price, stock and size group
  removed.forEach((img) => deleteFile(img.publicId));
  await product.populate(populateCats);
  res.json({ success: true, product });
});

export const bulkUpdateProducts = asyncHandler(async (req, res) => {
  const { ids, action, percent, listing } = req.body;
  const target = action === 'move' ? await resolveListing(listing) : null;
  const items = await Product.find({ _id: { $in: ids } });
  for (const p of items) {
    if (action === 'sale') p.salePrice = Math.max(1, Math.round(p.price * (1 - percent / 100)));
    if (action === 'endSale') p.salePrice = null;
    if (action === 'move') p.set(target);
    if (action === 'show' || action === 'hide') p.isVisible = action === 'show';
    if (action === 'feature' || action === 'unfeature') p.isFeatured = action === 'feature';
    if (action === 'gender') p.gender = req.body.gender;
    // eslint-disable-next-line no-await-in-loop
    await p.save();
  }
  res.json({ success: true, updated: items.length });
});
