import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import Coupon from '../models/Coupon.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getOrCreateCart, buildCartResponse, resolveLines, computeTotals } from '../services/cart.service.js';
import { findVariant } from '../services/product.service.js';
import { validateCoupon } from '../services/coupon.service.js';
import { listPaymentMethods } from '../services/payment.service.js';

const MAX_LINES = 50;

async function assertPurchasable(productId, variantId, quantity) {
  const product = await Product.findById(productId);
  const variant = product && findVariant(product, variantId);
  if (!product || !product.isVisible || !variant) throw ApiError.notFound('This item is no longer available');
  if (variant.stock <= 0) throw ApiError.badRequest(`${product.name} (${variant.name}) is out of stock`);
  if (quantity > variant.stock) throw ApiError.badRequest(`Only ${variant.stock} of ${product.name} (${variant.name}) left in stock`);
  return { product, variant };
}

async function respond(res, cart, userId, status = 200) {
  res.status(status).json({ success: true, cart: await buildCartResponse(cart, userId) });
}

export const getCart = asyncHandler(async (req, res) => {
  await respond(res, await getOrCreateCart(req.user._id), req.user._id);
});

export const addItem = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((i) => i.product.toString() === productId && i.variantId.toString() === variantId);
  const nextQty = (existing?.quantity || 0) + quantity;
  await assertPurchasable(productId, variantId, nextQty);
  if (existing) existing.quantity = nextQty;
  else {
    if (cart.items.length >= MAX_LINES) throw ApiError.badRequest('Your bag is full');
    cart.items.push({ product: productId, variantId, quantity });
  }
  await cart.save();
  await respond(res, cart, req.user._id, 201);
});

export const updateItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Item not found in your bag');
  await assertPurchasable(item.product, item.variantId, req.body.quantity);
  item.quantity = req.body.quantity;
  await cart.save();
  await respond(res, cart, req.user._id);
});

// Switch the variant (e.g. colour) of an existing line.
export const changeItemVariant = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Item not found in your bag');
  const { variantId } = req.body;
  await assertPurchasable(item.product, variantId, item.quantity);
  const duplicate = cart.items.find((i) => !i._id.equals(item._id) && i.product.equals(item.product) && i.variantId.toString() === variantId);
  if (duplicate) {
    duplicate.quantity = Math.min(99, duplicate.quantity + item.quantity);
    item.deleteOne();
  } else {
    item.variantId = variantId;
  }
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const removeItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (item) item.deleteOne();
  if (!cart.items.length) {
    cart.couponCode = null;
    cart.couponCodes = [];
  }
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  cart.couponCode = null;
  cart.couponCodes = [];
  await cart.save();
  await respond(res, cart, req.user._id);
});

/** Merges a guest (localStorage) bag into the account bag after sign-in. */
export const mergeCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  for (const incoming of req.body.items) {
    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findById(incoming.productId);
    const variant = product && product.isVisible && findVariant(product, incoming.variantId);
    if (!variant || variant.stock <= 0) continue;
    const existing = cart.items.find((i) => i.product.toString() === incoming.productId && i.variantId.toString() === incoming.variantId);
    const qty = Math.min(variant.stock, 99, (existing?.quantity || 0) + incoming.quantity);
    if (existing) existing.quantity = qty;
    else if (cart.items.length < MAX_LINES) cart.items.push({ product: incoming.productId, variantId: incoming.variantId, quantity: qty });
  }
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  if (!cart.items.length) throw ApiError.badRequest('Add something to your bag first');
  const lines = await resolveLines(cart.items);
  const subtotal = lines.filter((l) => l.available && !l.issue).reduce((s, l) => s + l.lineTotal, 0);
  const targetCode = String(req.body.code).trim().toUpperCase();
  const newCoupon = await validateCoupon(targetCode, req.user._id, subtotal);

  let currentCodes = cart.couponCodes?.length ? cart.couponCodes : cart.couponCode ? [cart.couponCode] : [];
  currentCodes = currentCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean);

  if (currentCodes.includes(targetCode)) {
    await respond(res, cart, req.user._id);
    return;
  }

  // Look up existing coupons to inspect their kinds ('fixed', 'percentage', 'free_shipping')
  const existingDocs = currentCodes.length ? await Coupon.find({ code: { $in: currentCodes }, isActive: true }) : [];

  // Rule: Two DIFFERENT kinds of coupon can be applied at once!
  // If an existing coupon has the SAME kind as newCoupon, the new coupon replaces it.
  const differentKinds = existingDocs.filter((d) => d.type !== newCoupon.type);

  // Keep at most 1 different kind doc plus the new one (max 2 total)
  const updated = differentKinds.slice(-1).map((d) => d.code);
  updated.push(targetCode);

  cart.couponCodes = updated;
  cart.couponCode = updated[0] || null;
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const codeToRemove = (req.body?.code || req.query?.code || '').trim().toUpperCase();
  if (codeToRemove) {
    let currentCodes = cart.couponCodes?.length ? cart.couponCodes : cart.couponCode ? [cart.couponCode] : [];
    cart.couponCodes = currentCodes.filter((c) => c !== codeToRemove);
    cart.couponCode = cart.couponCodes[0] || null;
  } else {
    cart.couponCodes = [];
    cart.couponCode = null;
  }
  await cart.save();
  await respond(res, cart, req.user._id);
});

export const setShippingMethod = asyncHandler(async (req, res) => {
  const settings = await Setting.get();
  if (!settings.shippingMethods.some((m) => m.code === req.body.code)) throw ApiError.badRequest('Unknown shipping method');
  const cart = await getOrCreateCart(req.user._id);
  cart.shippingMethod = req.body.code;
  await cart.save();
  await respond(res, cart, req.user._id);
});

/** Turns "use my loyalty coins" on or off for this checkout. */
export const setUseCoins = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.useCoins = req.body.use;
  await cart.save();
  await respond(res, cart, req.user._id);
});

/** Prices a guest bag held in the browser, so guests see real totals too. */
export const quoteGuestCart = asyncHandler(async (req, res) => {
  const raw = req.body.items.map((i) => ({ product: i.productId, variantId: i.variantId, quantity: i.quantity }));
  const lines = await resolveLines(raw);
  const summary = await computeTotals(lines, { shippingCode: req.body.shippingMethod });
  res.json({ success: true, cart: { items: lines, couponCode: null, summary } });
});

export const paymentMethods = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const { summary } = await buildCartResponse(cart, req.user._id);
  const settings = await Setting.get();
  res.json({ success: true, methods: listPaymentMethods(settings, summary.grandTotal) });
});
