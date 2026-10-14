import crypto from 'crypto';
import mongoose from 'mongoose';
import SpinReward from '../models/SpinReward.js';
import BackInStockAlert from '../models/BackInStockAlert.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Setting from '../models/Setting.js';
import { moveCoins } from '../services/coin.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

// The wheel resets at midnight India time; every prize is a personal code that expires the same midnight.
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

function istDay(now = Date.now()) {
  const start = Math.floor((now + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return { key: new Date(start + IST_OFFSET_MS).toISOString().slice(0, 10), start: new Date(start), end: new Date(start + DAY_MS - 1) };
}

/**
 * The prizes on the wheel (Admin → Settings → Spin wheel), switched-on ones only, in the order the
 * client draws them clockwise from the top. `index` is the slice's position on that wheel.
 */
async function spinSlices() {
  const s = await Setting.get();
  return (s.spinToWin?.slices || [])
    .filter((x) => x.isActive !== false && x.label && x.type)
    .map((x, index) => ({
      index,
      label: x.label,
      short: x.short || x.label.slice(0, 12),
      color: x.color || '#0284c7',
      weight: Math.max(0, Number(x.weight) || 0),
      coupon: { type: x.type, value: x.type === 'free_shipping' ? 0 : Number(x.value) || 0, minOrder: Number(x.minOrder) || 0 },
    }));
}
const publicSlices = (slices) => slices.map(({ index, label, short, color }) => ({ index, label, short, color }));

const rewardView = (spin) => ({
  label: spin.label,
  code: spin.couponCode,
  expiresAt: spin.expiresAt,
  note: 'Valid on one order until 11:59 PM tonight (IST).',
});

/** Whether the signed-in shopper can spin today, or today's prize if they already did. */
const spinEnabled = async () => (await Setting.get()).spinToWin?.enabled !== false;

export const getSpinStatus = asyncHandler(async (req, res) => {
  // Admin → Settings → Spin & Win can switch the wheel off for everyone.
  if (!(await spinEnabled())) return res.json({ success: true, enabled: false, eligible: false });
  const day = istDay();
  const slices = publicSlices(await spinSlices());
  if (slices.length < 2) return res.json({ success: true, enabled: false, eligible: false });
  if (!req.user) return res.json({ success: true, eligible: false, signInRequired: true, day: day.key, slices });
  const today = await SpinReward.findOne({ user: req.user._id, day: day.key }).lean();
  res.json({
    success: true,
    slices,
    eligible: !today,
    day: day.key,
    nextAvailableAt: today ? new Date(day.end.getTime() + 1) : null,
    todayReward: today ? rewardView(today) : null,
  });
});

/** One server-decided spin per customer per IST day. */
export const spinWheel = asyncHandler(async (req, res) => {
  // Prizes are personal codes, so a spin needs an account (the route allows guests to reach this).
  if (!req.user) throw ApiError.unauthorized('Sign in to spin — your prize code is saved to your account.');
  if (!(await spinEnabled())) throw ApiError.badRequest('Spin & Win is not available right now.');
  const userId = req.user._id;
  const day = istDay();

  const slices = await spinSlices();
  const totalWeight = slices.reduce((sum, s) => sum + s.weight, 0);
  if (slices.length < 2 || totalWeight <= 0) throw ApiError.badRequest('Spin & Win is not available right now.');
  let random = Math.random() * totalWeight;
  let selected = slices.find((s) => s.weight > 0);
  for (const slice of slices) {
    if (random < slice.weight) {
      selected = slice;
      break;
    }
    random -= slice.weight;
  }

  // Claim today's spin first (upsert), so two quick clicks can't win twice.
  const claim = await SpinReward.findOneAndUpdate(
    { user: userId, day: day.key },
    {
      $setOnInsert: {
        user: userId,
        day: day.key,
        rewardType: selected.coupon.type === 'free_shipping' ? 'free_shipping' : 'coupon',
        rewardValue: selected.coupon.value,
        label: selected.label,
        expiresAt: day.end,
      },
    },
    { upsert: true, returnDocument: 'after', includeResultMetadata: true }
  );
  if (claim.lastErrorObject?.updatedExisting) {
    throw ApiError.badRequest('You have already spun the wheel today. Come back after midnight for a new spin!');
  }
  const spin = claim.value;

  let code = '';
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = `SPIN${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`;
    try {
      await Coupon.create({
        ...selected.coupon,
        code: candidate,
        description: `Spin & Win: ${selected.label} (today only)`,
        owner: userId,
        source: 'spin',
        startsAt: day.start,
        expiresAt: day.end,
        usageLimit: 1,
        perUserLimit: 1,
        isActive: true,
      });
      code = candidate;
    } catch (err) {
      if (err.code !== 11000) {
        await SpinReward.deleteOne({ _id: spin._id }); // let them spin again rather than lose the prize
        throw err;
      }
    }
  }
  if (!code) {
    await SpinReward.deleteOne({ _id: spin._id });
    throw ApiError.conflict('Could not create your prize code. Please spin again.');
  }
  spin.couponCode = code;
  await SpinReward.updateOne({ _id: spin._id }, { couponCode: code });

  res.json({ success: true, sliceIndex: selected.index, slices: publicSlices(slices), reward: rewardView(spin) });
});

/** Register email or phone for back-in-stock notification */
export const registerBackInStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { email, phone, variantId } = req.body;

  if (!email || !email.includes('@')) {
    throw ApiError.badRequest('Please provide a valid email address');
  }

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await BackInStockAlert.findOne({
    product: productId,
    email: email.toLowerCase().trim(),
    isNotified: false,
  });

  if (!existing) {
    await BackInStockAlert.create({
      product: productId,
      variantId: variantId ? new mongoose.Types.ObjectId(variantId) : null,
      email: email.toLowerCase().trim(),
      phone: (phone || '').trim(),
    });
  }

  res.json({
    success: true,
    message: `We will notify you at ${email} as soon as ${product.name} is restocked!`,
  });
});

/** Indian PIN Code delivery estimator */
export const estimatePincode = asyncHandler(async (req, res) => {
  const pincode = String(req.query.pincode || req.params.pincode || '').trim();

  if (!/^\d{6}$/.test(pincode)) {
    throw ApiError.badRequest('Please enter a valid 6-digit Indian PIN code');
  }

  const settings = await Setting.get();
  const firstDigit = pincode.charAt(0);

  // Metro zones starting with 1 (Delhi/NCR), 4 (Mumbai/Maharashtra), 5 (Karnataka/Bangalore), 6 (Tamil Nadu/Chennai), 7 (Kolkata)
  const isMetro = ['1', '4', '5', '6', '7'].includes(firstDigit);
  const etaDays = isMetro ? '2–4 business days' : '4–6 business days';
  const courierPartner = isMetro ? 'BlueDart Express / Delhivery Express' : 'Delhivery Surface / Trackon';

  res.json({
    success: true,
    pincode,
    serviceable: true,
    eta: etaDays,
    courier: courierPartner,
    codAvailable: true,
    doorstepReturnEligible: true,
    freeShippingThreshold: settings.freeShippingThreshold || 10000,
    shippingFee: 199,
    message: `Express delivery to PIN ${pincode} available in ${etaDays}.`,
  });
});

/** Public order tracker with authentication validation */
export const trackOrderPublic = asyncHandler(async (req, res) => {
  const orderId = String(req.query.orderId || req.body.orderId || '').trim().toUpperCase();
  const phoneOrEmail = String(req.query.verify || req.body.verify || '').trim().toLowerCase();

  if (!orderId) {
    throw ApiError.badRequest('Please enter a valid Order ID (e.g. WT26-000123)');
  }

  const order = await Order.findOne({ orderId }).lean();
  if (!order) {
    throw ApiError.notFound(`No order found matching #${orderId}. Please check the order number.`);
  }

  // Security verification: require matching phone number or email if not admin or authenticated owner
  if (req.user && (req.user.role === 'admin' || String(req.user._id) === String(order.user))) {
    // Authorized directly
  } else {
    if (!phoneOrEmail) {
      throw ApiError.badRequest('Please provide the phone number or email address registered with this order to verify identity.');
    }
    const cleanPhone = phoneOrEmail.replace(/\D/g, '');
    const orderPhoneClean = (order.phone || '').replace(/\D/g, '');
    const emailMatch = (order.email || '').toLowerCase() === phoneOrEmail;
    const phoneMatch = cleanPhone.length >= 8 && orderPhoneClean.includes(cleanPhone);

    if (!emailMatch && !phoneMatch) {
      throw ApiError.forbidden('Verification failed. The phone number or email does not match this order.');
    }
  }

  res.json({
    success: true,
    order: {
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      courier: order.courier || 'BlueDart Express',
      trackingNumber: order.trackingNumber || 'Pending Dispatch',
      shippingAddress: {
        city: order.shippingAddress?.city,
        state: order.shippingAddress?.state,
        postalCode: order.shippingAddress?.postalCode,
      },
      itemCount: order.items?.length || 0,
      items: (order.items || []).map((it) => ({
        productName: it.productName,
        variant: it.variant?.name,
        quantity: it.quantity,
        image: it.image,
      })),
      statusHistory: order.statusHistory || [],
      refundDetails: order.refundDetails,
    },
  });
});
