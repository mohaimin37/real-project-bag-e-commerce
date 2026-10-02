import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
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

/** Totals for a set of resolved lines. Pure apart from coupon lookup. */
export async function computeTotals(lines, { userId, couponCode, shippingCode, settings, strictCoupon = false }) {
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

  const rate = s.taxRate / 100;
  const tax = s.pricesIncludeTax ? round2(afterDiscount - afterDiscount / (1 + rate)) : round2(afterDiscount * rate);
  const grandTotal = round2(afterDiscount + shipping + (s.pricesIncludeTax ? 0 : tax));

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
    shippingMethod: method,
    shippingMethods: methods,
    freeShippingThreshold: s.freeShippingThreshold,
    amountToFreeShipping: Math.max(0, round2(s.freeShippingThreshold - afterDiscount)),
    currency: s.baseCurrency,
  };
}

export async function buildCartResponse(cart, userId) {
  const lines = await resolveLines(cart.items);
  const summary = await computeTotals(lines, { userId, couponCode: cart.couponCode, shippingCode: cart.shippingMethod });
  return { _id: cart._id, items: lines, couponCode: cart.couponCode, shippingMethod: cart.shippingMethod, summary };
}
