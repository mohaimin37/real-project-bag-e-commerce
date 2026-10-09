import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import { coinsFor, loyaltyRules } from './coin.service.js';
import { round2 } from '../utils/helpers.js';
import { computeDiscount, validateCoupon } from './coupon.service.js';
import { findVariant, variantImage } from './product.service.js';

export async function getOrCreateCart(userId) {
  // Atomic upsert: parallel requests right after sign-up must not race to create two carts.
  return Cart.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId, items: [] } }, { upsert: true, returnDocument: 'after' });
}

/**
 * Resolves raw cart lines ({product, variantId, quantity}) against live product data.
 * Lines whose product/variant no longer exists are flagged, not silently dropped.
 */
export async function resolveLines(rawItems) {
  const ids = [...new Set(rawItems.map((i) => String(i.product || i.productId)))];
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  return rawItems.map((raw) => {
    const productId = String(raw.product || raw.productId);
    const product = byId.get(productId);
    const variant = product && findVariant(product, raw.variantId);
    const base = { _id: raw._id, productId, variantId: String(raw.variantId), quantity: raw.quantity };
    if (!product || !product.isVisible || !variant) {
      return { ...base, available: false, issue: 'This item is no longer available', lineTotal: 0 };
    }
    const unitPrice = product.finalPrice ?? product.price;
    let issue = null;
    if (variant.stock <= 0) issue = 'Out of stock';
    else if (raw.quantity > variant.stock) issue = `Only ${variant.stock} left in stock`;
    return {
      ...base,
      available: variant.stock > 0,
      issue,
      maxQuantity: Math.min(99, variant.stock),
      name: product.name,
      slug: product.slug,
      sku: variant.sku,
      tagline: product.tagline,
      image: variantImage(product, variant),
      variant: { _id: variant._id, name: variant.name, colorHex: variant.colorHex, size: variant.size },
      unitPrice,
      compareAtPrice: product.price > unitPrice ? product.price : null,
      lineTotal: round2(unitPrice * raw.quantity),
    };
  });
}

/**
 * Totals for a set of resolved lines. Pure apart from coupon lookup.
 * coinBalance + useCoins: loyalty coins the shopper has and whether to spend them on this order.
 */
export async function computeTotals(lines, { userId, couponCode, shippingCode, settings, strictCoupon = false, coinBalance = 0, useCoins = false }) {
  const s = settings || (await Setting.get());
  const billable = lines.filter((l) => l.available && !l.issue);
  const subtotal = round2(billable.reduce((sum, l) => sum + l.lineTotal, 0));
  const itemCount = billable.reduce((n, l) => n + l.quantity, 0);

  let coupon = null;
  let couponError = null;
  let discount = 0;
  if (couponCode && subtotal > 0) {
    try {
      const doc = await validateCoupon(couponCode, userId, subtotal);
      discount = computeDiscount(doc, subtotal);
      coupon = { _id: doc._id, code: doc.code, type: doc.type, value: doc.value, description: doc.description, discount };
    } catch (err) {
      if (strictCoupon) throw err;
      couponError = err.message;
    }
  }

  const afterDiscount = round2(subtotal - discount);
  const methods = s.shippingMethods.map((m) => {
    const free = m.freeEligible && afterDiscount >= s.freeShippingThreshold;
    return { code: m.code, label: m.label, description: m.description, eta: m.eta, basePrice: m.price, price: free ? 0 : m.price, free };
  });
  const method = methods.find((m) => m.code === shippingCode) || methods[0];
  const shipping = subtotal > 0 ? method.price : 0;

  // Loyalty coins work like a discount on the items (never on shipping), up to the store's limit.
  const rules = loyaltyRules(s);
  const maxCoins = rules.enabled ? Math.floor((afterDiscount * rules.maxRedeemPercent) / 100 / rules.rupeesPerCoin) : 0;
  const usableCoins = Math.max(0, Math.min(Math.floor(coinBalance), maxCoins));
  const coinsUsed = useCoins ? usableCoins : 0;
  const coinDiscount = round2(coinsUsed * rules.rupeesPerCoin);
  const itemsPayable = round2(afterDiscount - coinDiscount);

  const rate = s.taxRate / 100;
  const tax = s.pricesIncludeTax ? round2(itemsPayable - itemsPayable / (1 + rate)) : round2(itemsPayable * rate);
  const grandTotal = round2(itemsPayable + shipping + (s.pricesIncludeTax ? 0 : tax));

  return {
    itemCount,
    subtotal,
    discount,
    shipping,
    tax,
    taxLabel: `${s.taxLabel} ${s.taxRate}%`,
    taxIncluded: s.pricesIncludeTax,
    grandTotal,
    coupon,
    couponError,
    coins: {
      enabled: rules.enabled,
      balance: Math.floor(coinBalance),
      usable: usableCoins, // how many could be spent on this order
      used: coinsUsed,
      discount: coinDiscount,
      willEarn: coinsFor(itemsPayable, rules),
      rupeesPerCoin: rules.rupeesPerCoin,
      coinsPer100: rules.coinsPer100,
      maxRedeemPercent: rules.maxRedeemPercent,
    },
    shippingMethod: method,
    shippingMethods: methods,
    freeShippingThreshold: s.freeShippingThreshold,
    amountToFreeShipping: Math.max(0, round2(s.freeShippingThreshold - afterDiscount)),
    currency: s.baseCurrency,
  };
}

export async function buildCartResponse(cart, userId) {
  const [lines, user] = await Promise.all([resolveLines(cart.items), userId ? User.findById(userId).select('coins').lean() : null]);
  const summary = await computeTotals(lines, { userId, couponCode: cart.couponCode, shippingCode: cart.shippingMethod, coinBalance: user?.coins || 0, useCoins: cart.useCoins });
  return { _id: cart._id, items: lines, couponCode: cart.couponCode, shippingMethod: cart.shippingMethod, useCoins: Boolean(cart.useCoins), summary };
}
