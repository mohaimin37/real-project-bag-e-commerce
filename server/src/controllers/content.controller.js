import Blog from '../models/Blog.js';
import Banner from '../models/Banner.js';
import LiveUpdate from '../models/LiveUpdate.js';
import Setting from '../models/Setting.js';
import { loyaltyRules } from '../services/coin.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';
import { uniqueSlug } from '../services/product.service.js';
import { uploadFile, deleteFile } from '../services/upload.service.js';
import { listPaymentMethods } from '../services/payment.service.js';

// ── Blog (public) ────────────────────────────────────────────

export const listPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 9, maxLimit: 30 });
  const filter = { status: 'published' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.tag) filter.tags = String(req.query.tag).toLowerCase();
  if (req.query.q) filter.title = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
  const [items, total, categories] = await Promise.all([
    Blog.find(filter).select('-content').sort({ publishedAt: -1 }).skip(skip).limit(limit),
    Blog.countDocuments(filter),
    Blog.distinct('category', { status: 'published' }),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit), categories });
});

export const getPost = asyncHandler(async (req, res) => {
  // Link-preview fetches from the Netlify edge function aren't real reads, so they don't count as views.
  const filter = { slug: req.params.slug, status: 'published' };
  const post = req.get('x-seo-preview') ? await Blog.findOne(filter) : await Blog.findOneAndUpdate(filter, { $inc: { views: 1 } }, { returnDocument: 'after' });
  if (!post) throw ApiError.notFound('Article not found');
  const related = await Blog.find({ status: 'published', _id: { $ne: post._id }, category: post.category })
    .select('-content')
    .sort({ publishedAt: -1 })
    .limit(3);
  res.json({ success: true, post, related });
});

// ── Blog (admin) ─────────────────────────────────────────────

export const adminListPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.title = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
  const [items, total] = await Promise.all([
    Blog.find(filter).select('-content').sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Blog.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const adminGetPost = asyncHandler(async (req, res) => {
  const post = await Blog.findById(req.params.id);
  if (!post) throw ApiError.notFound('Article not found');
  res.json({ success: true, post });
});

export const createPost = asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Blog, req.body.slug || req.body.title);
  const post = await Blog.create({
    ...req.body,
    slug,
    author: req.user._id,
    authorName: req.body.authorName || req.user.name,
  });
  res.status(201).json({ success: true, post });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await Blog.findById(req.params.id);
  if (!post) throw ApiError.notFound('Article not found');
  const oldCover = post.coverImage?.publicId;
  const slug = req.body.slug && req.body.slug !== post.slug ? await uniqueSlug(Blog, req.body.slug, post._id) : post.slug;
  post.set({ ...req.body, slug });
  if (req.body.status === 'draft') post.publishedAt = null;
  await post.save();
  if (oldCover && oldCover !== post.coverImage?.publicId) deleteFile(oldCover);
  res.json({ success: true, post });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await Blog.findByIdAndDelete(req.params.id);
  if (!post) throw ApiError.notFound('Article not found');
  deleteFile(post.coverImage?.publicId);
  res.json({ success: true });
});

// ── Live updates ─────────────────────────────────────────────

export const listUpdates = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
  const updates = await LiveUpdate.find({ isPublished: true }).select('-author').sort({ pinned: -1, createdAt: -1 }).limit(limit).lean();
  // Short cache so the storefront's polling stays cheap while still feeling live.
  res.set('Cache-Control', 'public, max-age=10');
  res.json({ success: true, updates });
});

export const adminListUpdates = asyncHandler(async (req, res) => {
  const updates = await LiveUpdate.find().sort({ pinned: -1, createdAt: -1 }).limit(200);
  res.json({ success: true, updates });
});

export const createUpdate = asyncHandler(async (req, res) => {
  const update = await LiveUpdate.create({ ...req.body, author: req.user._id, authorName: req.user.name });
  res.status(201).json({ success: true, update });
});

export const updateUpdate = asyncHandler(async (req, res) => {
  const update = await LiveUpdate.findById(req.params.id);
  if (!update) throw ApiError.notFound('Update not found');
  const oldImage = update.image?.publicId;
  update.set(req.body);
  await update.save();
  if (oldImage && oldImage !== update.image?.publicId) deleteFile(oldImage);
  res.json({ success: true, update });
});

export const deleteUpdate = asyncHandler(async (req, res) => {
  const update = await LiveUpdate.findByIdAndDelete(req.params.id);
  if (!update) throw ApiError.notFound('Update not found');
  deleteFile(update.image?.publicId);
  res.json({ success: true });
});

// ── Banners ──────────────────────────────────────────────────

export const activeBanners = asyncHandler(async (req, res) => {
  const now = new Date();
  const banners = await Banner.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  }).sort({ placement: 1, sortOrder: 1 });
  res.json({ success: true, banners });
});

export const adminListBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort({ placement: 1, sortOrder: 1, createdAt: -1 });
  res.json({ success: true, banners });
});

export const createBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  res.status(201).json({ success: true, banner });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  const oldImage = banner.image?.publicId;
  banner.set(req.body);
  await banner.save();
  if (oldImage && oldImage !== banner.image?.publicId) deleteFile(oldImage);
  res.json({ success: true, banner });
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  deleteFile(banner.image?.publicId);
  res.json({ success: true });
});

// ── Generic admin image upload (blog covers, banners, categories) ──

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const folder = ['blog', 'banners', 'categories', 'updates'].includes(req.query.folder) ? req.query.folder : 'misc';
  const image = await uploadFile(req.file, folder);
  res.status(201).json({ success: true, image });
});

// ── Store settings ───────────────────────────────────────────

/** Public storefront config: currencies, shipping, tax display, payment options. */
export const publicConfig = asyncHandler(async (req, res) => {
  const s = await Setting.get();
  res.json({
    success: true,
    config: {
      storeName: s.storeName || 'WILDTANE',
      companyName: s.companyName || 'WILDTANE PRIVATE LIMITED',
      supportEmail: s.supportEmail || 'info@wildtane.com',
      supportPhone: s.supportPhone || '8920550465',
      businessAddress: s.businessAddress || 'A 370 Amar Puri Nabi Karim, Paharganj, New Delhi-110055', // public business details for the policy pages (also printed on bills)
      gstin: s.gstin || '07AAECW3767F1Z4',
      supportHours: s.supportHours,
      grievanceOfficer: {
        name: s.grievanceOfficer?.name || '',
        designation: s.grievanceOfficer?.designation || 'Grievance Officer',
        email: s.grievanceOfficer?.email || s.supportEmail,
        phone: s.grievanceOfficer?.phone || '',
      },
      announcement: s.announcement,
      baseCurrency: s.baseCurrency,
      currencies: s.currencies,
      taxRate: s.taxRate,
      taxLabel: s.taxLabel,
      pricesIncludeTax: s.pricesIncludeTax,
      freeShippingThreshold: s.freeShippingThreshold,
      loyalty: loyaltyRules(s),
      shippingMethods: s.shippingMethods,
      paymentMethods: listPaymentMethods(s, 0),
      social: s.social,
      appearance: {
        defaultTheme: s.appearance?.defaultTheme || 'default',
        defaultMode: s.appearance?.defaultMode || 'dark',
        enabledThemes: s.appearance?.enabledThemes?.length ? s.appearance.enabledThemes : undefined,
      },
    },
  });
});

export const getSettings = asyncHandler(async (req, res) => {
  res.json({ success: true, settings: await Setting.get() });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.get();
  settings.set(req.body);
  await settings.save();
  res.json({ success: true, settings });
});
