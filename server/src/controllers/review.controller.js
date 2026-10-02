import mongoose from 'mongoose';
import Review from '../models/Review.js';
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

/** Tells the product page whether the signed-in user can review and whether it'd be verified. */
export const reviewEligibility = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const [existing, purchase] = await Promise.all([
    Review.findOne({ product: productId, user: req.user._id }),
    findVerifiedPurchase(req.user._id, productId),
  ]);
  res.json({ success: true, canReview: !existing, existingReview: existing, verifiedPurchase: Boolean(purchase) });
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId) || !(await Product.exists({ _id: productId, isVisible: true }))) {
    throw ApiError.notFound('Product not found');
  }
  if (await Review.exists({ product: productId, user: req.user._id })) {
    throw ApiError.conflict('You have already reviewed this product. You can edit your review instead.');
  }
  const purchase = await findVerifiedPurchase(req.user._id, productId);
  const review = await Review.create({
    ...req.body,
    product: productId,
    user: req.user._id,
    order: purchase?._id || null,
    isVerifiedPurchase: Boolean(purchase),
  });
  await recalcRating(productId);
  await review.populate('user', 'name country avatar');
  res.status(201).json({ success: true, review });
});

export const updateMyReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw ApiError.notFound('Review not found');
  review.set(req.body);
  await review.save();
  await recalcRating(review.product);
  res.json({ success: true, review });
});

export const deleteMyReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) throw ApiError.notFound('Review not found');
  await recalcRating(review.product);
  res.json({ success: true });
});

export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } }, { returnDocument: 'after' });
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
  if (req.query.status) filter.status = req.query.status;
  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.q) filter.comment = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name email')
      .populate('product', 'name slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const adminSetReviewStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'pending', 'hidden'].includes(status)) throw ApiError.badRequest('Invalid status');
  const review = await Review.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!review) throw ApiError.notFound('Review not found');
  await recalcRating(review.product);
  res.json({ success: true, review });
});

export const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  await recalcRating(review.product);
  res.json({ success: true });
});
