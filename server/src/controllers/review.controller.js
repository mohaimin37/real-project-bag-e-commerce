import mongoose from 'mongoose';
import Review, { REVIEW_STATUSES } from '../models/Review.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination, round2 } from '../utils/helpers.js';
import { findVerifiedPurchase } from '../services/order.service.js';

export async function recalcRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { ratingAverage: stats ? round2(stats.avg) : 0, ratingCount: stats ? stats.count : 0 }
  );
}

const SORT = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
  helpful: { helpfulCount: -1, createdAt: -1 },
};

export const productReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 6, maxLimit: 30 });
  if (!mongoose.isValidObjectId(req.params.productId)) throw ApiError.badRequest('Invalid product');
  const filter = { product: req.params.productId, status: 'approved' };
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.verified === 'true') filter.isVerifiedPurchase = true;
  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name country avatar')
      .sort(SORT[req.query.sort] || SORT.newest)
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

/** Homepage "What our customers say": approved, verified-purchase reviews an admin chose to feature. */
export const featuredReviews = asyncHandler(async (req, res) => {
  const limit = Math.min(15, Math.max(1, Number(req.query.limit) || 6));
  const reviews = await Review.find({ status: 'approved', isVerifiedPurchase: true, order: { $ne: null }, showOnHome: true })
    .select('rating title comment createdAt isVerifiedPurchase user product')
    .populate('user', 'name avatar')
    .populate({ path: 'product', select: 'name slug images', match: { isVisible: true } })
    .sort({ rating: -1, updatedAt: -1 })
    .limit(limit)
    .lean();
  // Only the first name and last initial are shown publicly.
  const items = reviews.map((r) => {
    const [first, ...rest] = String(r.user?.name || 'Customer').trim().split(/\s+/);
    const last = rest.pop();
    return {
      _id: r._id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      createdAt: r.createdAt,
      isVerifiedPurchase: true,
      author: { name: last ? `${first} ${last[0]}.` : first, avatar: r.user?.avatar?.url || null },
      product: r.product ? { name: r.product.name, slug: r.product.slug, image: r.product.images?.[0]?.url || null } : null,
    };
  });
  res.json({ success: true, reviews: items });
});

const NOT_PURCHASED = 'Only customers who have received this product can review it.';

/** Tells the product page whether the signed-in user can review (only after a delivered purchase). */
export const reviewEligibility = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) throw ApiError.badRequest('Invalid product');
  const [existing, purchase] = await Promise.all([
    Review.findOne({ product: productId, user: req.user._id }),
    findVerifiedPurchase(req.user._id, productId),
  ]);
  res.json({
    success: true,
    canReview: !existing && Boolean(purchase),
    existingReview: existing,
    verifiedPurchase: Boolean(purchase),
    reason: existing ? 'already-reviewed' : purchase ? null : 'not-purchased',
    message: existing ? null : purchase ? null : NOT_PURCHASED,
  });
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId) || !(await Product.exists({ _id: productId, isVisible: true }))) {
    throw ApiError.notFound('Product not found');
  }
  if (await Review.exists({ product: productId, user: req.user._id })) {
    throw ApiError.conflict('You have already reviewed this product. You can edit your review instead.');
  }
  // The purchase check happens here, on the server: the client can't claim "verified".
  const purchase = await findVerifiedPurchase(req.user._id, productId);
  if (!purchase) throw ApiError.forbidden(NOT_PURCHASED);
  const { rating, title, comment } = req.body;
  const review = await Review.create({
    rating,
    title,
    comment,
    product: productId,
    user: req.user._id,
    order: purchase._id,
    isVerifiedPurchase: true,
    status: 'pending',
  });
  await review.populate('user', 'name country avatar');
  res.status(201).json({ success: true, review, message: 'Thanks! Your review will appear once our team has checked it.' });
});

export const updateMyReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw ApiError.notFound('Review not found');
  const { rating, title, comment } = req.body;
  // Edited text goes back to moderation and off the homepage.
  review.set({ rating, title, comment, status: 'pending', showOnHome: false });
  await review.save();
  await recalcRating(review.product);
  res.json({ success: true, review, message: 'Your changes will appear once our team has checked them.' });
});

export const deleteMyReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) throw ApiError.notFound('Review not found');
  await recalcRating(review.product);
  res.json({ success: true });
});

export const markHelpful = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Review not found');
  const review = await Review.findOneAndUpdate({ _id: req.params.id, status: 'approved' }, { $inc: { helpfulCount: 1 } }, { returnDocument: 'after' });
  if (!review) throw ApiError.notFound('Review not found');
  res.json({ success: true, helpfulCount: review.helpfulCount });
});

export const myReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id }).populate('product', 'name slug images').sort({ createdAt: -1 });
  res.json({ success: true, reviews });
});

// ── Admin ────────────────────────────────────────────────────

export const adminListReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (REVIEW_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.verified === 'true') filter.isVerifiedPurchase = true;
  if (req.query.verified === 'false') filter.isVerifiedPurchase = false;
  if (req.query.home === 'true') filter.showOnHome = true;
  if (req.query.q) filter.comment = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
  const [items, total, counts] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name email')
      .populate('product', 'name slug images')
      .populate('order', 'orderId orderStatus createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
    Review.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json({ success: true, ...paginated(items, total, page, limit), counts: byStatus });
});

/** Approve / reject / hide a review, and choose whether it is featured on the homepage. */
export const adminSetReviewStatus = asyncHandler(async (req, res) => {
  const { status, showOnHome } = req.body;
  if (status !== undefined && !REVIEW_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
  if (showOnHome !== undefined && typeof showOnHome !== 'boolean') throw ApiError.badRequest('Invalid homepage setting');
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Review not found');
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  if (status !== undefined) review.status = status;
  if (showOnHome !== undefined) review.showOnHome = showOnHome;
  if (review.showOnHome && (review.status !== 'approved' || !review.isVerifiedPurchase || !review.order)) {
    if (showOnHome) throw ApiError.badRequest('Only approved reviews from verified buyers can be shown on the homepage.');
    review.showOnHome = false; // un-approving a featured review takes it off the homepage
  }
  await review.save();
  await recalcRating(review.product);
  res.json({ success: true, review });
});

export const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  await recalcRating(review.product);
  res.json({ success: true });
});
