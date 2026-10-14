import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Wishlist from '../models/Wishlist.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { issueAuthCookie } from '../middleware/auth.js';
import { uploadFile, deleteFile } from '../services/upload.service.js';
import { PUBLIC_PRODUCT_FIELDS } from '../services/product.service.js';
import CoinTransaction from '../models/CoinTransaction.js';
import Setting from '../models/Setting.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { loyaltyRules, disburseEligibleOrderCoins, getPendingCoinsForUser } from '../services/coin.service.js';
import { walletRules } from '../services/wallet.service.js';
import { referralSummary } from '../services/referral.service.js';

const MAX_ADDRESSES = 10;
const MAX_RECENT = 12;

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  Object.assign(user, req.body);
  await user.save();
  res.json({ success: true, user });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const user = await User.findById(req.user._id);
  const old = user.avatar?.publicId;
  user.avatar = await uploadFile(req.file, 'avatars');
  await user.save();
  if (old) deleteFile(old);
  res.json({ success: true, user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect', [{ field: 'currentPassword', message: 'Incorrect password' }]);
  }
  user.password = req.body.newPassword;
  user.tokenVersion += 1; // sign out other devices
  await user.save();
  issueAuthCookie(res, user, user.tokenVersion);
  res.json({ success: true, message: 'Password updated' });
});

// ── Addresses ────────────────────────────────────────────────

export const listAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, addresses: req.user.addresses });
});

function applyDefault(user, address) {
  if (address.isDefault || user.addresses.length === 1) {
    user.addresses.forEach((a) => {
      a.isDefault = a._id.equals(address._id);
    });
  }
}

export const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.addresses.length >= MAX_ADDRESSES) throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses`);
  user.addresses.push(req.body);
  const added = user.addresses[user.addresses.length - 1];
  applyDefault(user, added);
  await user.save();
  res.status(201).json({ success: true, address: added, addresses: user.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.id);
  if (!address) throw ApiError.notFound('Address not found');
  address.set(req.body);
  applyDefault(user, address);
  if (!user.addresses.some((a) => a.isDefault)) user.addresses[0].isDefault = true;
  await user.save();
  res.json({ success: true, address, addresses: user.addresses });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.id);
  if (!address) throw ApiError.notFound('Address not found');
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true;
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.id);
  if (!address) throw ApiError.notFound('Address not found');
  user.addresses.forEach((a) => {
    a.isDefault = a._id.equals(address._id);
  });
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// ── Recently viewed ──────────────────────────────────────────

export const getRecentlyViewed = asyncHandler(async (req, res) => {
  const ids = (req.user.recentlyViewed || []).map((r) => r.product);
  const products = await Product.find({ _id: { $in: ids }, isVisible: true }).select(PUBLIC_PRODUCT_FIELDS);
  const byId = new Map(products.map((p) => [p._id.toString(), p]));
  res.json({ success: true, products: ids.map((id) => byId.get(id.toString())).filter(Boolean) });
});

export const trackRecentlyViewed = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!mongoose.isValidObjectId(productId)) throw ApiError.badRequest('Invalid product');
  await User.updateOne({ _id: req.user._id }, { $pull: { recentlyViewed: { product: productId } } });
  await User.updateOne(
    { _id: req.user._id },
    { $push: { recentlyViewed: { $each: [{ product: productId, viewedAt: new Date() }], $position: 0, $slice: MAX_RECENT } } }
  );
  res.json({ success: true });
});

// ── Account overview (customer dashboard) ────────────────────

const ACTIVE = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery'];

export const overview = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [counts, active, recent, wishlist, reviews] = await Promise.all([
    Order.aggregate([
      { $match: { user: uid } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          // "Total spent" was removed from the customer overview on request; order totals stay on each order.
          delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $in: ['$orderStatus', ACTIVE] }, 1, 0] } },
          items: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]),
    Order.find({ user: uid, orderStatus: { $in: ACTIVE } })
      .select('orderId orderStatus statusHistory createdAt grandTotal items.productName items.image items.quantity trackingNumber courier shippingMethod')
      .sort({ createdAt: -1 })
      .limit(5),
    Order.find({ user: uid }).select('orderId orderStatus createdAt grandTotal items.productName items.image items.quantity').sort({ createdAt: -1 }).limit(4),
    Wishlist.findOne({ user: uid }).select('products'),
    Review.countDocuments({ user: uid }),
  ]);
  const c = counts[0] || {};
  res.json({
    success: true,
    stats: {
      orders: c.orders || 0,
      delivered: c.delivered || 0,
      active: c.active || 0,
      items: c.items || 0,
      wishlist: wishlist?.products?.length || 0,
      addresses: req.user.addresses?.length || 0,
      reviews,
      memberSince: req.user.createdAt,
    },
    activeOrders: active,
    recentOrders: recent,
  });
});

/** WILDTANE Wallet: ₹ balance, rules and the ledger (the customer's own rows only). */
export const myWallet = asyncHandler(async (req, res) => {
  const [user, settings, history] = await Promise.all([
    User.findById(req.user._id).select('wallet').lean(),
    Setting.get(),
    WalletTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).select('-by -key').lean(),
  ]);
  const rules = walletRules(settings);
  res.json({
    success: true,
    wallet: {
      balance: Math.round((user?.wallet || 0) * 100) / 100,
      rules,
      history,
      totals: {
        refunds: history.filter((h) => ['refund', 'order_restore'].includes(h.type)).reduce((n, h) => n + h.amount, 0),
        promotional: history.filter((h) => h.type === 'promo').reduce((n, h) => n + h.amount, 0),
        referral: history.filter((h) => h.type === 'referral').reduce((n, h) => n + h.amount, 0),
      },
    },
  });
});

/** Refer & earn: the customer's code, rules and the people they referred (first names only). */
export const myReferrals = asyncHandler(async (req, res) => {
  res.json({ success: true, referrals: await referralSummary(req.user._id) });
});

/** Loyalty coins: balance, the store's rules, upcoming pending coins and the latest history. */
export const myCoins = asyncHandler(async (req, res) => {
  // First, automatically disburse any eligible coins for delivered orders past 7 days
  await disburseEligibleOrderCoins(req.user._id).catch(() => {});

  const [user, settings, history, pending] = await Promise.all([
    User.findById(req.user._id).select('coins').lean(),
    Setting.get(),
    CoinTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).select('-by').lean(),
    getPendingCoinsForUser(req.user._id),
  ]);
  const rules = loyaltyRules(settings);
  const balance = user?.coins || 0;
  res.json({
    success: true,
    coins: {
      balance,
      worth: Math.round(balance * rules.rupeesPerCoin * 100) / 100,
      rules,
      history,
      pending: pending.totalPending,
      pendingOrders: pending.pendingOrders,
      disbursementNotice: 'Coins will come into your wallet after 1 week (7 days) of product delivery, once the return policy expires.',
    },
  });
});
