import env from '../config/env.js';
import Notification from '../models/Notification.js';
import { formatINR } from '../utils/helpers.js';
import { countryName } from '../utils/countries.js';
import { generateInvoicePdfBuffer, invoiceFileName, getInvoiceToken } from './pdf-invoice.service.js';

export const PAYMENT_LABELS = { cod: 'Cash on Delivery', razorpay: 'Online Payment (Razorpay)', card: 'Card', upi: 'UPI / Net Banking', wallet: 'Wallet' };

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
export function buildOrderMessage(order, lowStockAlerts = []) {
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

  const alertsSection = lowStockAlerts?.length
    ? [
        '',
        '⚠️ *INVENTORY LOW-STOCK ALERTS*',
        ...lowStockAlerts.map(
          (a) => `• ${a.name} (${a.variant}): ONLY ${a.remaining} UNITS LEFT! (Threshold: ${a.threshold})`
        ),
      ]
    : [];

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
    ...alertsSection,
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

/** Short caption sent with the Tax Invoice PDF document on WhatsApp (the bill itself is the PDF). */
export function buildInvoiceCaption(order, settings = {}) {
  const first = String(order.customerName || '').split(' ')[0];
  const token = getInvoiceToken(order);
  const pdfUrl = `${env.siteUrl}/api/orders/${order.orderId}/invoice.pdf?token=${token}`;
  return [
    `Hi ${first}, your ${settings.storeName || 'WILDTANE'} order *#${order.orderId}* is approved ✅`,
    `Your Tax Invoice is attached (PDF) · Total ${formatINR(order.grandTotal)}`,
    `📄 View / Download Tax Invoice (PDF): ${pdfUrl}`,
    `Track: ${env.siteUrl}/account/orders/${order.orderId}`,
  ].join('\n');
}

export function buildWhatsAppChatLink(phone, message) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  const target = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

const graphUrl = (path) => `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/${path}`;

async function postMessage(payload) {
  const res = await fetch(graphUrl('messages'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `WhatsApp API responded ${res.status}`);
  return data?.messages?.[0]?.id;
}

const sendViaCloudApi = (to, body) => postMessage({ to, type: 'text', text: { preview_url: false, body } });

/** Uploads a PDF to WhatsApp media storage and returns its media id. */
async function uploadPdf(buffer, fileName) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), fileName);
  const res = await fetch(graphUrl('media'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.token}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) throw new Error(data?.error?.message || `WhatsApp media upload responded ${res.status}`);
  return data.id;
}

/**
 * Sends the invoice PDF as a WhatsApp document. With WHATSAPP_INVOICE_TEMPLATE set, it uses that approved
 * template (document header), which also reaches customers outside the 24-hour customer-service window.
 */
async function sendInvoiceDocument(to, order, { buffer, fileName, caption }) {
  const mediaId = await uploadPdf(buffer, fileName);
  if (env.whatsapp.invoiceTemplate) {
    return postMessage({
      to,
      type: 'template',
      template: {
        name: env.whatsapp.invoiceTemplate,
        language: { code: env.whatsapp.templateLang },
        components: [
          { type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename: fileName } }] },
          {
            type: 'body',
            parameters: [
              { type: 'text', text: String(order.customerName || 'Customer').split(' ')[0] },
              { type: 'text', text: order.orderId },
              { type: 'text', text: formatINR(order.grandTotal) },
            ],
          },
        ],
      },
    });
  }
  return postMessage({ to, type: 'document', document: { id: mediaId, filename: fileName, caption } });
}

/** The invoice PDF for a notification that carries one (rebuilt from the order, so a resend sends the current bill). */
async function invoiceFor(notification) {
  const [{ default: Order }, { default: Setting }] = await Promise.all([import('../models/Order.js'), import('../models/Setting.js')]);
  const order = await Order.findById(notification.order);
  if (!order) throw new Error('Order for this invoice no longer exists');
  const buffer = await generateInvoicePdfBuffer(order, await Setting.get());
  return { order, buffer, fileName: notification.attachment || invoiceFileName(order) };
}

/** Sends (or re-sends) a stored notification and records the outcome. Never throws. */
export async function deliver(notification, invoice) {
  notification.attempts += 1;
  notification.lastAttemptAt = new Date();
  try {
    const rawRecipient = notification.recipient || env.whatsapp.adminNumber || '';
    const digits = rawRecipient.replace(/[^\d]/g, '');
    const cleanRecipient = digits.length === 10 ? `91${digits}` : digits;
    notification.recipient = cleanRecipient;

    if (env.whatsapp.enabled && cleanRecipient) {
      notification.provider = 'whatsapp_cloud';
      if (notification.attachment) {
        const inv = invoice || (await invoiceFor(notification));
        notification.providerMessageId = await sendInvoiceDocument(cleanRecipient, inv.order, { ...inv, caption: notification.message });
      } else {
        notification.providerMessageId = await sendViaCloudApi(cleanRecipient, notification.message);
      }
      notification.status = 'sent';
      notification.error = undefined;
    } else {
      notification.provider = 'dev_log';
      notification.status = 'logged';
      const file = notification.attachment ? ` [document: ${notification.attachment}]` : '';
      console.log(`\n[whatsapp:dev] Outbound to ${cleanRecipient || 'admin'}${file}:\n${notification.message}\n`);
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
export async function notifyAdminOfOrder(order, lowStockAlerts = []) {
  try {
    const notification = await Notification.create({
      type: 'order_created',
      channel: 'whatsapp',
      order: order._id,
      recipient: env.whatsapp.adminNumber || '',
      message: buildOrderMessage(order, lowStockAlerts),
      provider: env.whatsapp.enabled ? 'whatsapp_cloud' : 'dev_log',
      status: 'pending',
    });
    return await deliver(notification);
  } catch (err) {
    console.error(`[whatsapp] Could not create notification for order ${order.orderId}: ${err.message}`);
    return null;
  }
}

/**
 * Sends the customer their Tax Invoice PDF as a WhatsApp document.
 * Pass `pdf` (a Buffer) to reuse a PDF already generated for the email.
 */
export async function notifyCustomerOfOrderApprovalWhatsApp(order, settings = {}, customPhone = null, pdf = null) {
  try {
    const customerPhone = (customPhone || order.shippingAddress?.phone || order.phone || '').trim();
    const fileName = invoiceFileName(order);
    const notification = await Notification.create({
      type: 'customer_order_approval',
      channel: 'whatsapp',
      order: order._id,
      recipient: customerPhone,
      message: buildInvoiceCaption(order, settings),
      attachment: fileName,
      provider: env.whatsapp.enabled ? 'whatsapp_cloud' : 'dev_log',
      status: 'pending',
    });
    const buffer = env.whatsapp.enabled ? pdf || (await generateInvoicePdfBuffer(order, settings)) : null;
    return await deliver(notification, buffer ? { order, buffer, fileName } : undefined);
  } catch (err) {
    console.error(`[whatsapp] Could not create customer approval notification for order ${order.orderId}: ${err.message}`);
    return null;
  }
}
