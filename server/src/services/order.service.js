import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Setting from '../models/Setting.js';
import Notification from '../models/Notification.js';
import { nextSequence } from '../models/Counter.js';
import ApiError from '../utils/ApiError.js';
import { resolveLines, computeTotals } from './cart.service.js';
import { redeemCoupon, releaseCoupon } from './coupon.service.js';
import { moveCoins, reverseOrderCoins } from './coin.service.js';
import { getProvider } from './payment.service.js';
import { notifyAdminOfOrder, notifyCustomerOfOrderApprovalWhatsApp, buildInvoiceCaption, buildWhatsAppChatLink } from './whatsapp.service.js';
import { sendEmail } from './email.service.js';
import { buildInvoiceCoverEmail } from './invoice-email.template.js';
import { generateInvoicePdfBuffer, invoiceFileName } from './pdf-invoice.service.js';
import env from '../config/env.js';

function formatOrderId(seq) {
  const yy = String(new Date().getFullYear()).slice(-2);
  return `WT${yy}-${String(seq).padStart(6, '0')}`;
}

async function resolveAddress(user, { addressId, address, saveAddress }) {
  if (addressId) {
    const saved = user.addresses.id(addressId);
    if (!saved) throw ApiError.badRequest('That saved address no longer exists', [{ field: 'addressId', message: 'Not found' }]);
    return saved.toObject();
  }
  if (saveAddress && user.addresses.length < 10) {
    user.addresses.push({ ...address, isDefault: user.addresses.length === 0 || address.isDefault });
    await user.save();
  }
  return address;
}

/**
 * Creates an order from the user's server cart.
 * Stock decrement, coupon redemption, order insert and cart clear run in one
 * MongoDB transaction, so concurrent buyers can never oversell a variant.
 * The WhatsApp admin alert is sent only after the transaction commits.
 */
export async function placeOrder(userId, payload) {
  const [user, cart, settings] = await Promise.all([
    User.findById(userId),
    Cart.findOne({ user: userId }),
    Setting.get(),
  ]);
  if (!cart || !cart.items.length) throw ApiError.badRequest('Your bag is empty');

  const lines = await resolveLines(cart.items);
  const problems = lines.filter((l) => !l.available || l.issue);
  if (problems.length) {
    throw ApiError.conflict(
      'Some items in your bag changed. Please review your bag before placing the order.',
      problems.map((p) => ({ field: p.variantId, message: `${p.name || 'Item'}: ${p.issue}` }))
    );
  }

  const totals = await computeTotals(lines, {
    userId,
    couponCode: cart.couponCode,
    shippingCode: payload.shippingMethod,
    settings,
    strictCoupon: true,
    coinBalance: user.coins || 0,
    useCoins: cart.useCoins,
  });

  const provider = getProvider(payload.paymentMethod);
  const availability = provider?.isAvailable({ settings, total: totals.grandTotal });
  if (!provider || !availability.available) {
    throw ApiError.badRequest(availability?.reason || 'Choose a valid payment method', [{ field: 'paymentMethod', message: 'Unavailable' }]);
  }

  const address = await resolveAddress(user, payload);
  const { customer } = payload;
  const fullPhone = `${customer.phone.dialCode} ${customer.phone.number}`;
  const addrPhone = address.phone?.number ? `${address.phone.dialCode} ${address.phone.number}` : fullPhone;
  const orderObjectId = new mongoose.Types.ObjectId();

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      for (const line of lines) {
        // Conditional decrement: only succeeds if the variant still has enough stock.
        const result = await Product.updateOne(
          {
            _id: line.productId,
            isVisible: true,
            variants: { $elemMatch: { _id: line.variantId, stock: { $gte: line.quantity } } },
          },
          { $inc: { 'variants.$.stock': -line.quantity, stock: -line.quantity, soldCount: line.quantity } },
          { session }
        );
        if (!result.modifiedCount) {
          throw ApiError.conflict(`${line.name} (${line.variant.name}) just sold out or has fewer units left. Please update your bag.`);
        }
      }

      if (totals.coupon) await redeemCoupon(totals.coupon, userId, orderObjectId, session);

      const seq = await nextSequence('order', session);
      [order] = await Order.create(
        [
          {
            _id: orderObjectId,
            orderId: formatOrderId(seq),
            user: userId,
            customerName: customer.name,
            email: customer.email,
            phone: fullPhone,
            country: customer.country,
            nationality: customer.nationality,
            shippingAddress: {
              fullName: address.fullName,
              phone: addrPhone,
              addressLine1: address.addressLine1,
              addressLine2: address.addressLine2 || '',
              landmark: address.landmark || '',
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country,
            },
            items: lines.map((l) => ({
              productId: l.productId,
              productName: l.name,
              slug: l.slug,
              SKU: l.sku,
              image: l.image,
              variant: { id: l.variant._id, name: l.variant.name, colorHex: l.variant.colorHex, size: l.variant.size },
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              totalPrice: l.lineTotal,
            })),
            subtotal: totals.subtotal,
            discount: totals.discount,
            shipping: totals.shipping,
            tax: totals.tax,
            grandTotal: totals.grandTotal,
            currency: totals.currency,
            coupon: totals.coupon ? { code: totals.coupon.code, type: totals.coupon.type, value: totals.coupon.value } : undefined,
            coinsRedeemed: totals.coins.used,
            coinDiscount: totals.coins.discount,
            coinsEarned: totals.coins.willEarn,
            shippingMethod: { code: totals.shippingMethod.code, label: totals.shippingMethod.label, eta: totals.shippingMethod.eta },
            paymentMethod: provider.code,
            paymentStatus: 'Pending',
            orderStatus: 'Pending',
            statusHistory: [{ status: 'Pending', note: 'Order placed', at: new Date() }],
            customerNote: payload.customerNote,
          },
        ],
        { session }
      );

      // Loyalty coins: spend first (fails if the balance no longer covers it).
      // Note: Coins earned on this order are not credited immediately; they disburse automatically
      // after 1 week of delivery once the 7-day return policy expires.
      if (totals.coins.used > 0) await moveCoins(userId, -totals.coins.used, { type: 'redeemed', order, session, note: `Used on order ${order.orderId}` });

      await Cart.updateOne({ user: userId }, { $set: { items: [], couponCode: null, useCoins: false } }, { session });
    });
  } finally {
    await session.endSession();
  }

  // Payment initiation happens after the order exists. COD simply stays Pending.
  const payment = await provider.initiate(order);
  if (payment.paymentStatus && payment.paymentStatus !== order.paymentStatus) {
    order.paymentStatus = payment.paymentStatus;
    await order.save();
  }

  // Fire-and-forget: notification outcome is logged separately and never affects the order.
  notifyAdminOfOrder(order);

  return order;
}

const CUSTOMER_CANCELLABLE = ['Pending', 'Confirmed'];
const RESTOCK_STATUSES = ['Cancelled', 'Returned'];

async function restoreInventory(order) {
  if (order.inventoryRestored) return;
  for (const item of order.items) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne(
      { _id: item.productId, 'variants._id': item.variant.id },
      { $inc: { 'variants.$.stock': item.quantity, stock: item.quantity, soldCount: -item.quantity } }
    );
  }
  order.inventoryRestored = true;
  if (order.coupon?.code) await releaseCoupon(order.coupon.code, order._id);
  await reverseOrderCoins(order);
  // Rule: If order gets cancelled, coins will not come
  order.coinsEarned = 0;
  order.coinsDisbursed = false;
  order.coinsReversed = true;
}

export async function changeOrderStatus(order, { status, note, trackingNumber, courier, at, notifyCustomer = false }, changedBy) {
  if (order.orderStatus === status && !trackingNumber && !courier) return order;
  if (['Cancelled', 'Returned'].includes(order.orderStatus) && status !== order.orderStatus) {
    throw ApiError.badRequest(`This order is ${order.orderStatus.toLowerCase()} and can no longer change status`);
  }
  const when = at ? new Date(at) : new Date();
  if (when.getTime() > Date.now() + 5 * 60 * 1000) throw ApiError.badRequest('The update time cannot be in the future');
  if (when < order.createdAt) throw ApiError.badRequest('The update time cannot be before the order was placed');
  const statusChanged = status !== order.orderStatus;
  if (statusChanged) {
    order.orderStatus = status;
    if (status === 'Confirmed') {
      order.approvedAt = when;
      order.approvedBy = changedBy;
      order.invoiceSentAt = when;
    }
    order.statusHistory.push({ status, note, changedBy, at: when });
  }
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (courier !== undefined) order.courier = courier;
  if (RESTOCK_STATUSES.includes(status)) await restoreInventory(order);
  if (status === 'Delivered') {
    if (!order.deliveredAt) order.deliveredAt = when;
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Paid';
    }
  }
  await order.save();
  // Fire-and-forget: customer gets Tax Invoice on Confirmation, or status tracking alert
  if (statusChanged && notifyCustomer) {
    if (status === 'Confirmed') {
      Setting.get()
        .then((st) => dispatchInvoice(order, st))
        .catch((e) => console.error('[invoice] dispatch failed:', e.message));
    } else {
      notifyCustomerOfStatus(order, when, note).catch((e) => console.error('[email] status update failed:', e.message));
    }
  }
  return order;
}

/**
 * Emails the Tax Invoice PDF as an attachment with a short covering note.
 * Pass `pdf` (a Buffer) to reuse a PDF already generated for WhatsApp.
 */
export async function sendOrderTaxInvoiceEmail(order, settings, customEmail, pdf = null) {
  const targetEmail = (customEmail || order.email || '').trim();
  if (!targetEmail) return null;
  const currentSettings = settings || (await Setting.get());
  const fileName = invoiceFileName(order);
  const { subject, html, text } = buildInvoiceCoverEmail(order, currentSettings, fileName);

  try {
    // No PDF, no email: the bill is the attachment, so a failure here is reported instead of sending an empty note.
    const content = pdf || (await generateInvoicePdfBuffer(order, currentSettings));
    const outcome = await sendEmail({
      to: targetEmail,
      subject,
      html,
      text,
      attachments: [{ filename: fileName, content, contentType: 'application/pdf' }],
      priority: 'high',
    });

    await Notification.create({
      type: 'customer_invoice',
      channel: 'email',
      order: order._id,
      recipient: targetEmail,
      message: `${subject}\n\n${text}`,
      attachment: fileName,
      provider: outcome?.delivered ? 'smtp' : 'dev_log',
      status: outcome?.delivered ? 'sent' : 'logged',
      providerMessageId: outcome?.messageId,
    }).catch(() => {});

    return outcome;
  } catch (err) {
    console.error(`[email] Tax invoice delivery failed for ${order.orderId}:`, err.message);
    await Notification.create({
      type: 'customer_invoice',
      channel: 'email',
      order: order._id,
      recipient: targetEmail,
      message: `Tax Invoice email failed: ${err.message}`,
      attachment: fileName,
      provider: 'smtp',
      status: 'failed',
      error: err.message,
    }).catch(() => {});
    throw err;
  }
}

/**
 * Generates the Tax Invoice PDF once and sends that same file by email (attachment) and WhatsApp (document).
 * Either channel can be skipped with `email: false` / `phone: false`. Never throws for a failed channel.
 */
export async function dispatchInvoice(order, settings, { email, phone } = {}) {
  const st = settings || (await Setting.get());
  const pdf = await generateInvoicePdfBuffer(order, st);
  const targetEmail = email === false ? '' : (email || order.email || '').trim();
  const targetPhone = phone === false ? '' : (phone || order.shippingAddress?.phone || order.phone || '').trim();

  const [emailRes, waRes] = await Promise.allSettled([
    targetEmail ? sendOrderTaxInvoiceEmail(order, st, targetEmail, pdf) : null,
    targetPhone ? notifyCustomerOfOrderApprovalWhatsApp(order, st, targetPhone, pdf) : null,
  ]);
  const wa = waRes.value;
  const result = {
    email: !targetEmail
      ? null
      : emailRes.status === 'fulfilled'
        ? { to: targetEmail, status: emailRes.value?.delivered ? 'sent' : 'logged' }
        : { to: targetEmail, status: 'failed', error: emailRes.reason?.message },
    whatsapp: !targetPhone ? null : { to: targetPhone, status: wa?.status || 'failed', error: wa?.error },
    fileName: invoiceFileName(order),
    // Only used when the WhatsApp Cloud API is not set up: a chat the admin can attach the PDF to.
    whatsappLink: targetPhone ? buildWhatsAppChatLink(targetPhone, buildInvoiceCaption(order, st)) : '',
  };

  if (result.email?.status !== 'failed' || result.whatsapp?.status === 'sent') {
    order.invoiceSentAt = new Date();
    await order.save().catch(() => {});
  }
  return result;
}

/**
 * Admin approval: a Pending order becomes Confirmed, then the Tax Invoice PDF goes to email and WhatsApp.
 * On an order that is already past Pending it only re-sends the invoice.
 */
export async function approveOrder(order, adminUserId, recipients = {}) {
  if (['Cancelled', 'Returned'].includes(order.orderStatus)) {
    throw ApiError.badRequest(`This order is ${order.orderStatus.toLowerCase()}; its invoice cannot be sent`);
  }
  const settings = await Setting.get();
  const approved = order.orderStatus === 'Pending';
  if (approved) {
    const now = new Date();
    order.orderStatus = 'Confirmed';
    order.approvedAt = now;
    if (adminUserId) order.approvedBy = adminUserId;
    order.statusHistory.push({ status: 'Confirmed', note: 'Approved by admin - Tax Invoice PDF sent to customer', changedBy: adminUserId, at: now });
    await order.save();
  }

  const delivery = await dispatchInvoice(order, settings, recipients);
  const sentTo = [delivery.email?.status !== 'failed' && delivery.email?.to, delivery.whatsapp?.status === 'sent' && 'WhatsApp'].filter(Boolean);
  const message = `${approved ? 'Order approved. ' : ''}${sentTo.length ? `Tax Invoice PDF sent to ${sentTo.join(' and ')}.` : 'Tax Invoice PDF could not be sent.'}`;
  return { order, approved, delivery, whatsappLink: delivery.whatsappLink, message };
}

const STATUS_MESSAGES = {
  Confirmed: 'We have confirmed your order and will start preparing it shortly.',
  Processing: 'Your order is being prepared in our workshop.',
  Packed: 'Your order is packed and waiting for courier pickup.',
  Shipped: 'Your order is on its way.',
  'Out for Delivery': 'Your order is out for delivery today. Please keep your phone handy.',
  Delivered: 'Your order has been delivered. We hope you love it!',
  Cancelled: 'Your order has been cancelled. Any payment made will be refunded to the original method.',
  Returned: 'Your return has been received. Your refund is being processed.',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function notifyCustomerOfStatus(order, when, note) {
  if (!order.email) return;
  const status = order.orderStatus;
  const time = when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const link = `${env.siteUrl}/account/orders/${order.orderId}`;
  const tracking = order.trackingNumber ? `${order.courier ? `${order.courier} · ` : ''}${order.trackingNumber}` : '';
  const lines = [
    `Hi ${order.customerName},`,
    '',
    `${STATUS_MESSAGES[status] || `Your order status is now ${status}.`}`,
    '',
    `Order: ${order.orderId}`,
    `Status: ${status}`,
    `Updated: ${time} IST`,
    tracking ? `Tracking: ${tracking}` : null,
    note ? `Note: ${note}` : null,
    '',
    `Track your order: ${link}`,
  ].filter((l) => l !== null);
  await sendEmail({
    to: order.email,
    subject: `Order ${order.orderId}: ${status}`,
    text: lines.join('\n'),
    html: `<p>Hi ${esc(order.customerName)},</p><p>${esc(STATUS_MESSAGES[status] || `Your order status is now ${status}.`)}</p>
<table style="border-collapse:collapse;font-size:14px">
<tr><td style="padding:4px 12px 4px 0;color:#666">Order</td><td><b>${esc(order.orderId)}</b></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Status</td><td><b>${esc(status)}</b></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#666">Updated</td><td>${esc(time)} IST</td></tr>
${tracking ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Tracking</td><td>${esc(tracking)}</td></tr>` : ''}
${note ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Note</td><td>${esc(note)}</td></tr>` : ''}
</table>
<p><a href="${esc(link)}" style="background:#000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block">Track your order</a></p>`,
  });
}

// Cancellation policy: within 24 hours of placing the order, and never once it has shipped.
export const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function cancelByCustomer(order, userId, reason) {
  if (Date.now() - new Date(order.createdAt).getTime() > CANCEL_WINDOW_MS) {
    throw ApiError.badRequest('Orders can only be cancelled within 24 hours of being placed. Please contact info@wildtane.com for help.');
  }
  if (!CUSTOMER_CANCELLABLE.includes(order.orderStatus)) {
    throw ApiError.badRequest('This order is already being prepared and can no longer be cancelled online. Please contact support.');
  }
  return changeOrderStatus(order, { status: 'Cancelled', note: reason || 'Cancelled by customer' }, userId);
}

/** True when the user has a delivered order containing this product (for verified reviews). */
export async function findVerifiedPurchase(userId, productId) {
  return Order.findOne({ user: userId, orderStatus: 'Delivered', 'items.productId': productId }).select('_id');
}

export async function reviewableProducts(userId) {
  const orders = await Order.find({ user: userId, orderStatus: 'Delivered' }).select('items.productId');
  const ids = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId.toString())))];
  const reviewed = await Review.find({ user: userId, product: { $in: ids } }).select('product');
  const done = new Set(reviewed.map((r) => r.product.toString()));
  return ids.filter((id) => !done.has(id));
}
