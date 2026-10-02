import Coupon from '../models/Coupon.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';

/** Public: active coupons a shopper can see (no usage data). */
export const publicCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  })
    .select('code description type value minOrder maxDiscount expiresAt')
    .sort({ createdAt: -1 })
    .limit(10);
  res.json({ success: true, coupons });
});

export const listCoupons = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.q) filter.code = new RegExp(escapeRegex(String(req.query.q)), 'i');
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  const [items, total] = await Promise.all([
    Coupon.find(filter).select('-usages').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Coupon.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate('usages.user', 'name email').populate('usages.order', 'orderId grandTotal');
  if (!coupon) throw ApiError.notFound('Coupon not found');
  res.json({ success: true, coupon });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  coupon.set(req.body);
  await coupon.save();
  res.json({ success: true, coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  res.json({ success: true });
});
