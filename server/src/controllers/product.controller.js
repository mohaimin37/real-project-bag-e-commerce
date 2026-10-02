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
    Product.find(filter).select(PUBLIC_PRODUCT_FIELDS).populate(populateCats).sort(sort).skip(skip).limit(limit),
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
      .select('name slug images price salePrice finalPrice tagline')
      .sort({ soldCount: -1 })
      .limit(6),
    Category.find({ isActive: true, name: rx }).select('name slug parent').limit(4),
  ]);
  res.json({ success: true, products, categories });
});

export const getCollections = asyncHandler(async (req, res) => {
  const base = { isVisible: true };
  const limit = Math.min(12, Number(req.query.limit) || 8);
  const [bestSellers, newArrivals, featured] = await Promise.all([
    Product.find({ ...base, isBestseller: true }).select(PUBLIC_PRODUCT_FIELDS).sort({ soldCount: -1 }).limit(limit),
    Product.find({ ...base, isNewArrival: true }).select(PUBLIC_PRODUCT_FIELDS).sort({ createdAt: -1 }).limit(limit),
    Product.find({ ...base, isFeatured: true }).select(PUBLIC_PRODUCT_FIELDS).sort({ soldCount: -1 }).limit(limit),
  ]);
  res.json({ success: true, bestSellers, newArrivals, featured });
});

export const getProduct = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const query = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
  const product = await Product.findOne({ ...query, isVisible: true }).populate(populateCats);
  if (!product) throw ApiError.notFound('This product is not available');

  const [related, distribution] = await Promise.all([
    Product.find({
      _id: { $ne: product._id },
      isVisible: true,
      $or: [{ subcategory: product.subcategory?._id || null }, { category: product.category?._id }],
    })
      .select(PUBLIC_PRODUCT_FIELDS)
      .sort({ soldCount: -1 })
      .limit(4),
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
    // eslint-disable-next-line no-await-in-loop
    await p.save();
  }
  res.json({ success: true, updated: items.length });
});
