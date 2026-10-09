import env from '../config/env.js';
import Notification from '../models/Notification.js';
import { formatINR } from '../utils/helpers.js';
import { countryName } from '../utils/countries.js';

export const PAYMENT_LABELS = { cod: 'Cash on Delivery', card: 'Card', upi: 'UPI / Net Banking', wallet: 'Wallet' };

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

/** Plain-text customer WhatsApp message sent upon admin order approval with full invoice details. */
export function buildCustomerOrderApprovalMessage(order, settings = {}) {
  const date = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const items = order.items
    .map((it, i) =>
      [
        `${i + 1}. *${it.productName}*`,
        `   Variant: ${it.variant?.name || 'Standard'}${it.variant?.size ? ` / ${it.variant.size}` : ''}`,
        `   SKU: ${it.SKU}`,
        `   Qty: ${it.quantity} × ${formatINR(it.unitPrice)} = ${formatINR(it.totalPrice)}`,
      ].join('\n')
    )
    .join('\n\n');

  const addr = order.shippingAddress;
  const addressText = [
    addr.fullName,
    addr.addressLine1,
    addr.addressLine2,
    addr.landmark ? `Landmark: ${addr.landmark}` : '',
    `${addr.city}, ${addr.state} ${addr.postalCode}`,
    countryName(addr.country),
  ]
    .filter(Boolean)
    .join(', ');

  const invoiceUrl = `${env.siteUrl}/account/orders/${order.orderId}`;
  const registeredAddress = settings.businessAddress || 'Paharganj , New Delhi , 110055';

  return [
    `✅ *ORDER APPROVED & VERIFIED - WILDTANE*`,
    '',
    `Dear *${order.customerName}*,`,
    `Your order *#${order.orderId}* has been verified and approved by WILDTANE administration.`,
    '',
    `*TAX INVOICE DETAILS*`,
    `• Order / Invoice No: *${order.orderId}*`,
    `• Date: ${date} IST`,
    `• Registered Office: ${registeredAddress}`,
    `• GSTIN: ${settings.gstin || '07AAECW3767F1Z4'}`,
    '',
    `*ITEMS ORDERED*`,
    items,
    '',
    `*FINANCIAL BREAKDOWN*`,
    `• Subtotal: ${formatINR(order.subtotal)}`,
    order.discount > 0 ? `• Discount: -${formatINR(order.discount)}` : '',
    order.coinDiscount > 0 ? `• Coins: -${formatINR(order.coinDiscount)}` : '',
    `• Shipping: ${order.shipping ? formatINR(order.shipping) : 'Free'}`,
    `• GST Tax: ${formatINR(order.tax)}`,
    `• *Grand Total: ${formatINR(order.grandTotal)}*`,
    `• Payment: ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod} (${order.paymentStatus})`,
    '',
    `*DELIVERY DESTINATION*`,
    addressText,
    '',
    `📄 *Digital Tax Invoice:*`,
    `View & track live: ${invoiceUrl}`,
    '',
    `A detailed Tax Invoice with company logo has also been dispatched to your email (${order.email}).`,
    '',
    `Need help? Reply here or contact ${settings.supportEmail || 'info@wildtane.com'} · ${settings.supportPhone || '8920550465'}.`,
    `Thank you for choosing WILDTANE!`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWhatsAppChatLink(phone, message) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  const target = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
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
    const rawRecipient = notification.recipient || env.whatsapp.adminNumber || '';
    const digits = rawRecipient.replace(/[^\d]/g, '');
    const cleanRecipient = digits.length === 10 ? `91${digits}` : digits;
    notification.recipient = cleanRecipient;

    if (env.whatsapp.enabled && cleanRecipient) {
      notification.provider = 'whatsapp_cloud';
      notification.providerMessageId = await sendViaCloudApi(cleanRecipient, notification.message);
      notification.status = 'sent';
      notification.error = undefined;
    } else {
      notification.provider = 'dev_log';
      notification.status = 'logged';
      console.log(`\n[whatsapp:dev] Outbound to ${cleanRecipient || 'admin'}:\n${notification.message}\n`);
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

/** Notifies customer via WhatsApp when admin approves the order. */
export async function notifyCustomerOfOrderApprovalWhatsApp(order, settings = {}) {
  try {
    const customerPhone = order.shippingAddress?.phone || order.phone || '';
    const message = buildCustomerOrderApprovalMessage(order, settings);
    const notification = await Notification.create({
      type: 'customer_order_approval',
      channel: 'whatsapp',
      order: order._id,
      recipient: customerPhone,
      message,
      provider: env.whatsapp.enabled ? 'whatsapp_cloud' : 'dev_log',
      status: 'pending',
    });
    return await deliver(notification);
  } catch (err) {
    console.error(`[whatsapp] Could not create customer approval notification for order ${order.orderId}: ${err.message}`);
    return null;
  }
}
