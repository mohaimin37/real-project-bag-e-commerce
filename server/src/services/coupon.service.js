import Coupon from '../models/Coupon.js';
import ApiError from '../utils/ApiError.js';
import { formatINR, round2 } from '../utils/helpers.js';

export function computeDiscount(coupon, subtotal) {
  // Free-shipping coupons take nothing off the items; computeTotals zeroes the delivery charge instead.
  if (coupon.type === 'free_shipping') return 0;
  let discount = coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.type === 'percentage' && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return round2(Math.min(discount, subtotal));
}

/**
 * Validates a coupon for a user and subtotal. Throws ApiError with a
 * customer-friendly message when it can't be used.
 */
export async function validateCoupon(code, userId, subtotal) {
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  const now = new Date();
  if (!coupon || !coupon.isActive) throw ApiError.badRequest('This coupon code is not valid');
  if (coupon.owner && (!userId || coupon.owner.toString() !== userId.toString())) {
    throw ApiError.badRequest('This coupon code is not valid');
  }
  if (coupon.startsAt && coupon.startsAt > now) throw ApiError.badRequest('This coupon is not active yet');
  if (coupon.expiresAt && coupon.expiresAt < now) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit');
  }
  if (subtotal < coupon.minOrder) {
    throw ApiError.badRequest(`Add ${formatINR(coupon.minOrder - subtotal)} more to use this coupon (minimum ${formatINR(coupon.minOrder)})`);
  }
  if (userId && coupon.perUserLimit > 0) {
    const used = coupon.usages.filter((u) => u.user?.toString() === userId.toString()).length;
    if (used >= coupon.perUserLimit) throw ApiError.badRequest('You have already used this coupon');
  }
  return coupon;
}

/** Atomically records a redemption; fails if the global limit was hit concurrently. */
export async function redeemCoupon(coupon, userId, orderId, session) {
  const result = await Coupon.updateOne(
    {
      _id: coupon._id,
      isActive: true,
      $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
    },
    { $inc: { usedCount: 1 }, $push: { usages: { user: userId, order: orderId, usedAt: new Date() } } },
    { session }
  );
  if (!result.modifiedCount) throw ApiError.conflict('This coupon just reached its usage limit. Remove it and try again.');
}

export async function releaseCoupon(code, orderId) {
  if (!code) return;
  await Coupon.updateOne(
    { code, 'usages.order': orderId },
    { $inc: { usedCount: -1 }, $pull: { usages: { order: orderId } } }
  );
}
