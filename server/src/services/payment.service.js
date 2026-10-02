/**
 * Payment provider registry. Each provider implements:
 *   code, label, description, icon
 *   isAvailable({ settings, total }) -> { available: boolean, reason?: string }
 *   initiate(order) -> { paymentStatus, reference?, redirectUrl? }
 *
 * To add a gateway (Razorpay, Stripe, PayPal…): implement initiate() to create the
 * gateway order, return its redirect/client data, and add a webhook route that verifies
 * the gateway signature and sets order.paymentStatus = 'Paid'. Card numbers must never
 * touch this server — use the gateway's hosted fields or checkout.
 */

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

const providers = [
  cod,
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
