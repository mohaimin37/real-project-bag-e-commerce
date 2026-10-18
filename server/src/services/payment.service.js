import crypto from 'crypto';
import Razorpay from 'razorpay';
import env from '../config/env.js';

let razorpayClient = null;
function getRazorpay() {
  if (!razorpayClient && env.razorpay.enabled) {
    razorpayClient = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return razorpayClient;
}

const razorpay = {
  code: 'razorpay',
  label: 'Pay Online',
  description: 'UPI (GPay, PhonePe, Paytm), Credit / Debit Card, Net Banking & Wallets',
  icon: 'credit_card',
  isAvailable({ settings }) {
    if (settings?.razorpayEnabled === false) {
      return { available: false, reason: 'Online payment is currently unavailable' };
    }
    if (!env.razorpay.enabled) {
      return { available: false, reason: 'Online payment is being configured' };
    }
    return { available: true };
  },
  async initiate(order) {
    const rzp = getRazorpay();
    if (!rzp) throw new Error('Razorpay is not configured');

    const amountInPaise = Math.round(Number(order.grandTotal) * 100);
    const options = {
      amount: amountInPaise,
      currency: order.currency || 'INR',
      receipt: order.orderId,
      notes: {
        orderId: order._id ? order._id.toString() : '',
        orderNum: order.orderId,
        email: order.email || '',
        customerName: order.customerName || '',
      },
    };

    const gatewayOrder = await rzp.orders.create(options);
    return {
      paymentStatus: 'Pending',
      reference: gatewayOrder.id,
      gatewayOrder,
      keyId: env.razorpay.keyId,
    };
  },
};

const cod = {
  code: 'cod',
  label: 'Cash on Delivery',
  description: 'Pay in cash or UPI to the courier when your order arrives',
  icon: 'payments',
  isAvailable({ settings, total }) {
    if (!settings.codEnabled) return { available: false, reason: 'Cash on Delivery is currently unavailable' };
    if (settings.codMaxOrder && total > settings.codMaxOrder) {
      return { available: false, reason: `Cash on Delivery is available for orders up to ₹${settings.codMaxOrder.toLocaleString('en-IN')}` };
    }
    return { available: true };
  },
  async initiate() {
    return { paymentStatus: 'Pending' };
  },
};

const giftcard = {
  code: 'giftcard',
  label: 'Gift Card',
  description: 'Redeem a WILDTANE gift card code at checkout',
  icon: 'card_giftcard',
  // Applied at checkout alongside any method (its own section), so it is not listed as a separate choice.
  hidden: true,
  isAvailable({ settings }) {
    if (settings?.giftCardsEnabled === false) {
      return { available: false, reason: 'Gift cards are currently unavailable' };
    }
    return { available: true };
  },
  async initiate() {
    return { paymentStatus: 'Pending' };
  },
};

// Used when the WILDTANE Wallet alone covers an order. Not offered as a choice: the wallet is a toggle at checkout.
const wtwallet = {
  code: 'wtwallet',
  label: 'WILDTANE Wallet',
  description: 'Paid from your WILDTANE Wallet balance',
  icon: 'account_balance_wallet',
  hidden: true,
  isAvailable({ settings }) {
    return settings?.wallet?.enabled === false ? { available: false, reason: 'Wallet payments are currently unavailable' } : { available: true };
  },
  async initiate() {
    return { paymentStatus: 'Pending' };
  },
};

const providers = [
  razorpay,
  cod,
  giftcard,
  wtwallet,
];

export function getProvider(code) {
  return providers.find((p) => p.code === code);
}

export function listPaymentMethods(settings, total) {
  return providers.filter((p) => !p.hidden).map((p) => ({
    code: p.code,
    label: p.label,
    description: p.description,
    icon: p.icon,
    ...p.isAvailable({ settings, total }),
  }));
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!env.razorpay.keySecret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return safeEqual(expectedSignature, razorpaySignature);
}

/** `secret`: the env secret by default; the webhook handler passes the admin-saved one when env has none. */
export function verifyRazorpayWebhookSignature(rawBody, signature, secret = env.razorpay.webhookSecret) {
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return safeEqual(expected, signature);
}

/**
 * The signature only proves Razorpay saw *a* payment for that gateway order. This also checks the
 * payment belongs to the order, was captured/authorised, and paid exactly `expectedAmount` (₹).
 */
export async function confirmRazorpayPayment({ razorpayOrderId, razorpayPaymentId }, expectedAmount) {
  const rzp = getRazorpay();
  if (!rzp) return { ok: false, reason: 'Online payment is not configured.' };
  let payment;
  try {
    payment = await rzp.payments.fetch(razorpayPaymentId);
  } catch (err) {
    return { ok: false, reason: err?.error?.description || 'The payment could not be checked with Razorpay.', gatewayError: true };
  }
  const expectedPaise = Math.round(Number(expectedAmount) * 100);
  if (payment.order_id !== razorpayOrderId) return { ok: false, reason: 'Payment does not belong to this checkout.', payment };
  if (!['captured', 'authorized'].includes(payment.status)) return { ok: false, reason: `Payment is ${payment.status}.`, payment };
  if (Number(payment.amount) !== expectedPaise) return { ok: false, reason: 'The amount paid does not match your order total.', payment };
  // An authorized payment is only a hold: Razorpay releases it after a few days unless it is captured.
  if (payment.status === 'authorized') {
    try {
      payment = await rzp.payments.capture(razorpayPaymentId, payment.amount, payment.currency || 'INR');
    } catch (err) {
      // Already captured by the account's auto-capture setting in the meantime is fine.
      const again = await rzp.payments.fetch(razorpayPaymentId).catch(() => null);
      if (again?.status !== 'captured') return { ok: false, reason: err?.error?.description || 'The payment could not be captured.', payment };
      payment = again;
    }
  }
  return { ok: true, payment };
}

/**
 * Money was taken but the order could not be created (stock ran out, amount mismatch…):
 * give it straight back. Returns the refund, or null if it could not be issued (logged for staff).
 */
export async function refundUnusedPayment(payment, reason) {
  if (!payment?.id || payment.status !== 'captured') return null;
  try {
    return await refundRazorpayPayment(payment.id, { amount: Number(payment.amount) / 100, notes: { reason: String(reason).slice(0, 200) }, receipt: `void_${payment.id}`.slice(0, 40) });
  } catch (err) {
    console.error(`[payment] Could not refund unused payment ${payment.id}: ${err?.error?.description || err.message}`);
    return null;
  }
}

/** Creates a gateway refund. `amount` in ₹. Razorpay returns { id, status: pending|processed|failed, … }. */
export async function refundRazorpayPayment(paymentId, { amount, notes = {}, receipt }) {
  const rzp = getRazorpay();
  if (!rzp) throw new Error('Razorpay is not configured');
  return rzp.payments.refund(paymentId, { amount: Math.round(Number(amount) * 100), speed: 'normal', notes, receipt });
}

/** Refunds already made against a payment (used to avoid refunding twice after a retry). */
export async function listRazorpayRefunds(paymentId) {
  const rzp = getRazorpay();
  if (!rzp) return [];
  const res = await rzp.payments.fetchMultipleRefund(paymentId, { count: 100 });
  return res?.items || [];
}

export async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const rzp = getRazorpay();
  if (!rzp) throw new Error('Razorpay is not configured');
  const amountInPaise = Math.round(Number(amount) * 100);
  return rzp.orders.create({
    amount: amountInPaise,
    currency,
    receipt: receipt || `chk_${Date.now().toString(36)}`,
    notes,
  });
}

