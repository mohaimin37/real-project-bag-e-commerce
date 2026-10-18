import Coupon from '../models/Coupon.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';

/** Public: active coupons a shopper can see (no usage data). */
export const publicCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    owner: null,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  })
    .select('code description type value minOrder maxDiscount expiresAt')
    .sort({ minOrder: 1, value: 1 })
    .limit(30);
  res.json({ success: true, coupons });
});

/**
 * The signed-in shopper's coupons: their personal codes (e.g. Spin & Win prizes, newest first)
 * plus the public offers. Each says whether it can still be used.
 */
export const myCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const fields = 'code description type value minOrder maxDiscount startsAt expiresAt usageLimit usedCount source usages owner';
  const [mine, open] = await Promise.all([
    Coupon.find({ owner: req.user._id }).select(fields).sort({ createdAt: -1 }).limit(30).lean(),
    Coupon.find({
      isActive: true,
      owner: null,
      $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] }],
    })
      .select(fields)
      .sort({ minOrder: 1, value: 1 })
      .limit(30)
      .lean(),
  ]);
  const view = (c) => {
    const used = (c.usages || []).some((u) => String(u.user) === String(req.user._id)) || (c.usageLimit != null && c.usedCount >= c.usageLimit);
    const expired = Boolean(c.expiresAt && c.expiresAt < now);
    return {
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      maxDiscount: c.maxDiscount,
      expiresAt: c.expiresAt,
      source: c.source || (c.owner ? 'personal' : 'store'),
      status: used ? 'used' : expired ? 'expired' : 'available',
    };
  };
  res.json({ success: true, mine: mine.map(view), offers: open.map(view).filter((c) => c.status === 'available') });
});

export const listCoupons = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  // Personal spin-wheel codes are created daily; keep them out of the admin's coupon list.
  const filter = { owner: null };
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
