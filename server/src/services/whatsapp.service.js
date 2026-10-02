import env from '../config/env.js';
import Notification from '../models/Notification.js';
import { formatINR } from '../utils/helpers.js';
import { countryName } from '../utils/countries.js';

const PAYMENT_LABELS = { cod: 'Cash on Delivery', card: 'Card', upi: 'UPI / Net Banking', wallet: 'Wallet' };

export function formatAddress(a) {
  return [
    a.fullName,
    a.addressLine1,
    a.addressLine2,
    a.landmark ? `Landmark: ${a.landmark}` : '',
    `${a.city}, ${a.state} ${a.postalCode}`,
    countryName(a.country),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Plain-text admin alert for a new order (WhatsApp formatting: *bold*). */
export function buildOrderMessage(order) {
  const date = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const items = order.items
    .map((it, i) =>
      [
        `${i + 1}. *${it.productName}*`,
        `   Variant: ${it.variant?.name || '—'}${it.variant?.size ? ` / ${it.variant.size}` : ''}`,
        `   SKU: ${it.SKU}`,
        `   Qty: ${it.quantity} × ${formatINR(it.unitPrice)}`,
        `   Item total: ${formatINR(it.totalPrice)}`,
      ].join('\n')
    )
    .join('\n\n');

  return [
    '*WILDTANE - NEW ORDER*',
    '',
    `*Order ID:* ${order.orderId}`,
    `*Date:* ${date}`,
    '',
    '*CUSTOMER*',
    `Name: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Email: ${order.email}`,
    `Country: ${countryName(order.country)}`,
    `Nationality: ${countryName(order.nationality)}`,
    '',
    '*DELIVERY ADDRESS*',
    formatAddress(order.shippingAddress),
    '',
    '*ITEMS*',
    items,
    '',
    '*ORDER SUMMARY*',
    `Subtotal: ${formatINR(order.subtotal)}`,
    `Discount: -${formatINR(order.discount)}${order.coupon?.code ? ` (${order.coupon.code})` : ''}`,
    `Shipping: ${order.shipping ? formatINR(order.shipping) : 'Free'}`,
    `Tax: ${formatINR(order.tax)}`,
    `*Grand Total: ${formatINR(order.grandTotal)}*`,
    '',
    '*PAYMENT*',
    `Method: ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}`,
    `Status: ${order.paymentStatus}`,
  ].join('\n');
}

async function sendViaCloudApi(to, body) {
  const url = `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body } }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `WhatsApp API responded ${res.status}`);
  return data?.messages?.[0]?.id;
}

/** Sends (or re-sends) a stored notification and records the outcome. Never throws. */
export async function deliver(notification) {
  notification.attempts += 1;
  notification.lastAttemptAt = new Date();
  try {
    if (env.whatsapp.enabled) {
      notification.provider = 'whatsapp_cloud';
      notification.recipient = env.whatsapp.adminNumber;
      notification.providerMessageId = await sendViaCloudApi(env.whatsapp.adminNumber, notification.message);
      notification.status = 'sent';
      notification.error = undefined;
    } else {
      notification.provider = 'dev_log';
      notification.status = 'logged';
      console.log(`\n[whatsapp:dev] WhatsApp API not configured — message logged instead:\n${notification.message}\n`);
    }
  } catch (err) {
    notification.status = 'failed';
    notification.error = err.message;
    console.error(`[whatsapp] Delivery failed for notification ${notification._id}: ${err.message}`);
  }
  await notification.save().catch((e) => console.error('[whatsapp] Could not save notification log', e.message));
  return notification;
}

/** Called after the order is committed. Failures are logged, never propagated to checkout. */
export async function notifyAdminOfOrder(order) {
  try {
    const notification = await Notification.create({
      type: 'order_created',
      channel: 'whatsapp',
      order: order._id,
      recipient: env.whatsapp.adminNumber || '',
      message: buildOrderMessage(order),
      provider: env.whatsapp.enabled ? 'whatsapp_cloud' : 'dev_log',
      status: 'pending',
    });
    return await deliver(notification);
  } catch (err) {
    console.error(`[whatsapp] Could not create notification for order ${order.orderId}: ${err.message}`);
    return null;
  }
}
