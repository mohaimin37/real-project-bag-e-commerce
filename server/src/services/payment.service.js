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

const comingSoon = (code, label, description, icon) => ({
  code,
  label,
  description,
  icon,
  isAvailable: () => ({ available: false, reason: 'Coming soon' }),
  async initiate() {
    throw new Error(`${label} is not configured`);
  },
});

const giftcard = {
  code: 'giftcard',
  label: 'Gift Card',
  description: 'Redeem a WILDTANE gift card code at checkout',
  icon: 'card_giftcard',
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

const providers = [
  razorpay,
  cod,
  giftcard,
  comingSoon('card', 'Credit / Debit Card', 'Visa, Mastercard, RuPay, Amex via secure gateway', 'credit_card'),
  comingSoon('upi', 'UPI / Net Banking', 'Google Pay, PhonePe, Paytm and all major banks', 'account_balance'),
  comingSoon('wallet', 'Apple Pay / Google Pay', 'One-tap express wallet checkout', 'contactless'),
];

export function getProvider(code) {
  return providers.find((p) => p.code === code);
}

export function listPaymentMethods(settings, total) {
  return providers.map((p) => ({
    code: p.code,
    label: p.label,
    description: p.description,
    icon: p.icon,
    ...p.isAvailable({ settings, total }),
  }));
}

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!env.razorpay.keySecret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return expectedSignature === razorpaySignature;
}

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret || !rawBody || !signature) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
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

