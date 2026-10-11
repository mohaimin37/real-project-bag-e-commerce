import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Setting from '../models/Setting.js';
import Notification from '../models/Notification.js';
import { nextSequence } from '../models/Counter.js';
import GiftCard from '../models/GiftCard.js';
import ApiError from '../utils/ApiError.js';
import { resolveLines, computeTotals } from './cart.service.js';
import { redeemCoupon, releaseCoupon } from './coupon.service.js';
import { moveCoins, reverseOrderCoins } from './coin.service.js';
import { getProvider, verifyRazorpaySignature, createRazorpayOrder } from './payment.service.js';
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
 * Initiates Razorpay checkout order without creating a database order.
 * Validates stock and computes final totals before generating the Razorpay order.
 */
export async function initiateOnlinePayment(userId, payload = {}) {
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
    shippingCode: payload.shippingMethod || cart.shippingMethod || 'standard',
    settings,
    strictCoupon: true,
    coinBalance: user?.coins || 0,
    useCoins: cart.useCoins,
  });

  const provider = getProvider('razorpay');
  const availability = provider?.isAvailable({ settings, total: totals.grandTotal });
  if (!provider || !availability.available) {
    throw ApiError.badRequest(availability?.reason || 'Online payment is currently unavailable');
  }

  let netGrandTotal = totals.grandTotal;
  let giftCardDiscount = 0;
  const gcCodeOnline = payload.giftCardCode || payload.giftCard?.code;
  const gcPinOnline = payload.giftCardPin || payload.giftCard?.pin;
  if (gcCodeOnline) {
    const card = await GiftCard.findOne({ code: gcCodeOnline.trim().toUpperCase(), isActive: true });
    if (card && card.currentBalance > 0 && (!card.expiryDate || new Date(card.expiryDate) > new Date())) {
      if (card.pin && card.pin !== (gcPinOnline || '').trim()) {
        throw ApiError.badRequest('Incorrect gift card PIN.');
      }
      giftCardDiscount = Math.min(card.currentBalance, totals.grandTotal);
      netGrandTotal = Math.max(0, totals.grandTotal - giftCardDiscount);
    }
  }

  const gatewayOrder = netGrandTotal > 0
    ? await createRazorpayOrder({
        amount: netGrandTotal,
        currency: totals.currency || 'INR',
        receipt: `chk_${Date.now().toString(36)}`,
        notes: {
          userId: String(userId),
          customerName: user?.name || '',
          email: user?.email || '',
        },
      })
    : { id: `free_${Date.now()}`, amount: 0, currency: 'INR' };

  return {
    gatewayOrder,
    keyId: env.razorpay.keyId,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
    grandTotal: netGrandTotal,
    giftCardDiscount,
  };
}

async function checkAndNotifyLowStock(order) {
  try {
    const alerts = [];
    for (const it of order.items) {
      const prod = await Product.findById(it.productId).select('name variants stock lowStockThreshold');
      if (!prod) continue;
      const v = prod.variants.id(it.variant?.id);
      const remainingVariantStock = v ? v.stock : prod.stock;
      const threshold = prod.lowStockThreshold || 10;
      if (remainingVariantStock <= 20) {
        alerts.push({
          name: prod.name,
          variant: v?.name || 'Default',
          remaining: remainingVariantStock,
          threshold,
        });
        await Notification.create({
          type: 'low_stock_alert',
          channel: 'whatsapp',
          recipient: env.whatsapp.adminNumber || '',
          message: `⚠️ Low Stock Alert: "${prod.name}" (${v?.name || 'Default'}) has only ${remainingVariantStock} units remaining (Threshold: ${threshold}).`,
          provider: env.whatsapp.enabled ? 'whatsapp_cloud' : 'dev_log',
          status: 'logged',
        });
      }
    }
    return alerts;
  } catch (err) {
    console.error(`[inventory] Error checking low stock for order ${order.orderId}:`, err.message);
    return [];
  }
}

/**
 * Creates an order from the user's server cart.
 * If paymentMethod is online (razorpay), payment must be completed and verified first.
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
    coinBalance: user?.coins || 0,
    useCoins: cart.useCoins,
  });

  let giftCardApplied = null;
  const gcCode = payload.giftCardCode || payload.giftCard?.code;
  const gcPin = payload.giftCardPin || payload.giftCard?.pin;
  if (gcCode) {
    const card = await GiftCard.findOne({ code: gcCode.trim().toUpperCase(), isActive: true });
    if (!card) {
      throw ApiError.badRequest('Invalid gift card code.');
    }
    if (card.expiryDate && new Date(card.expiryDate) <= new Date()) {
      throw ApiError.badRequest('Gift card has expired.');
    }
    if (card.currentBalance <= 0) {
      throw ApiError.badRequest('Gift card balance is ₹0.');
    }
    if (card.pin && card.pin !== (gcPin || '').trim()) {
      throw ApiError.badRequest('Incorrect gift card PIN.');
    }
    const discount = Math.min(card.currentBalance, totals.grandTotal);
    giftCardApplied = { card, discount };
    totals.grandTotal = Math.max(0, totals.grandTotal - discount);
  }

  if (payload.paymentMethod === 'giftcard') {
    if (!giftCardApplied) {
      throw ApiError.badRequest('A valid gift card code is required to pay with gift card.');
    }
    if (totals.grandTotal > 0) {
      throw ApiError.badRequest(`Gift card covers ₹${giftCardApplied.discount}, but ₹${totals.grandTotal} is still due. Please select Online Payment or Cash on Delivery.`);
    }
  }

  const provider = getProvider(payload.paymentMethod);
  const availability = provider?.isAvailable({ settings, total: totals.grandTotal });
  if (!provider || !availability.available) {
    throw ApiError.badRequest(availability?.reason || 'Choose a valid payment method', [{ field: 'paymentMethod', message: 'Unavailable' }]);
  }

  let verifiedPayment = null;
  if (totals.grandTotal === 0 && giftCardApplied) {
    verifiedPayment = {
      paidAt: new Date(),
      method: 'gift_card',
    };
  } else if (payload.paymentMethod === 'razorpay') {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload.paymentDetails || {};
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw ApiError.badRequest('Payment details are required. Complete online payment before placing your order.');
    }
    const valid = verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
    if (!valid) {
      throw ApiError.badRequest('Payment signature verification failed. Order was not placed.');
    }
    verifiedPayment = {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paidAt: new Date(),
    };
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
            paymentStatus: verifiedPayment ? 'Paid' : 'Pending',
            paymentReference: verifiedPayment ? (verifiedPayment.razorpayPaymentId || 'GIFT_CARD') : '',
            paymentDetails: verifiedPayment ? { ...verifiedPayment } : undefined,
            orderStatus: verifiedPayment ? 'Confirmed' : 'Pending',
            giftCard: giftCardApplied ? { code: giftCardApplied.card.code, amount: giftCardApplied.discount } : undefined,
            statusHistory: [
              {
                status: verifiedPayment ? 'Confirmed' : 'Pending',
                note: verifiedPayment ? 'Order placed and payment received online' : 'Order placed (Cash on Delivery)',
                at: new Date(),
              },
            ],
            customerNote: payload.customerNote,
          },
        ],
        { session }
      );

      // Decrement gift card balance and record redemption
      if (giftCardApplied) {
        giftCardApplied.card.currentBalance -= giftCardApplied.discount;
        giftCardApplied.card.redeemedBy.push({
          user: userId,
          order: orderObjectId,
          amount: giftCardApplied.discount,
          redeemedAt: new Date(),
        });
        await giftCardApplied.card.save({ session });
      }

      // Loyalty coins: spend first (fails if the balance no longer covers it).
      // Note: Coins earned on this order are not credited immediately; they disburse automatically
      // after 1 week of delivery once the 7-day return policy expires.
      if (totals.coins.used > 0) await moveCoins(userId, -totals.coins.used, { type: 'redeemed', order, session, note: `Used on order ${order.orderId}` });

      await Cart.updateOne({ user: userId }, { $set: { items: [], couponCode: null, useCoins: false } }, { session });
    });
  } finally {
    await session.endSession();
  }

  const payment = verifiedPayment
    ? { paymentStatus: 'Paid', reference: verifiedPayment.razorpayPaymentId }
    : await provider.initiate(order);

  // Check remaining inventory and alert admin if any purchased item is low in stock
  checkAndNotifyLowStock(order).then((alerts) => {
    notifyAdminOfOrder(order, alerts);
  }).catch((err) => {
    console.error('[notification] notifyAdminOfOrder error:', err);
    notifyAdminOfOrder(order);
  });

  return { order, payment };
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
  Cancelled: 'Your order has been cancelled. Confirmation: Refund will be issued within 5–7 working days to your original payment method.',
  Returned: 'Your return has been received. Your refund is being processed within 5–7 working days.',
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
  const cancelNote = reason
    ? `${reason} (Cancellation confirmed. Refund will be issued within 5–7 working days)`
    : 'Cancelled by customer (Cancellation confirmed. Refund will be issued within 5–7 working days)';

  const updated = await changeOrderStatus(order, { status: 'Cancelled', note: cancelNote, notifyCustomer: true }, userId);

  // Set refund details and update payment status to Refunded if already paid
  if (order.paymentStatus === 'Paid') {
    updated.paymentStatus = 'Refunded';
    updated.refundDetails = {
      status: 'Initiated',
      amount: order.grandTotal,
      eta: '5–7 working days',
      initiatedAt: new Date(),
    };
    await updated.save();
  } else {
    updated.refundDetails = {
      status: 'None (COD/Pending)',
      amount: 0,
      eta: 'No payment made',
      initiatedAt: new Date(),
    };
    await updated.save();
  }

  return updated;
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

function findQuery(idOrOrderId) {
  return mongoose.isValidObjectId(idOrOrderId) ? { _id: idOrOrderId } : { orderId: idOrOrderId };
}

export async function verifyOrderPayment(idOrOrderId, { razorpayOrderId, razorpayPaymentId, razorpaySignature, userId }) {
  const query = findQuery(idOrOrderId);
  if (userId) query.user = userId;

  const order = await Order.findOne(query);
  if (!order) throw ApiError.notFound('Order not found');

  if (order.paymentStatus === 'Paid') {
    return order;
  }

  const valid = verifyRazorpaySignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!valid) {
    throw ApiError.badRequest('Payment verification failed: invalid signature');
  }

  order.paymentStatus = 'Paid';
  order.paymentReference = razorpayPaymentId;
  order.paymentDetails = {
    ...(order.paymentDetails || {}),
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    verifiedAt: new Date(),
  };

  order.statusHistory.push({
    status: order.orderStatus,
    note: `Online payment received via Razorpay (${razorpayPaymentId})`,
    at: new Date(),
  });

  await order.save();
  return order;
}

export async function retryOrderPayment(idOrOrderId, userId) {
  const query = findQuery(idOrOrderId);
  if (userId) query.user = userId;

  const order = await Order.findOne(query);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus === 'Paid') throw ApiError.badRequest('Order is already paid');
  if (['Cancelled', 'Returned'].includes(order.orderStatus)) throw ApiError.badRequest('Order has been cancelled');

  const provider = getProvider(order.paymentMethod);
  if (!provider || typeof provider.initiate !== 'function') {
    throw ApiError.badRequest('Payment method does not support online payment');
  }

  const payment = await provider.initiate(order);
  if (payment.reference) {
    order.paymentReference = payment.reference;
    order.paymentDetails = { gatewayOrder: payment.gatewayOrder };
    await order.save();
  }
  return { order, payment };
}

export async function handleRazorpayWebhook(event) {
  const eventName = event?.event;
  const paymentEntity = event?.payload?.payment?.entity;
  const orderEntity = event?.payload?.order?.entity;

  const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
  const rzpPaymentId = paymentEntity?.id;
  const orderNum = paymentEntity?.notes?.orderNum || orderEntity?.notes?.orderNum;
  const orderDbId = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId;

  const query = {};
  if (orderNum) query.orderId = orderNum;
  else if (orderDbId && mongoose.isValidObjectId(orderDbId)) query._id = orderDbId;
  else if (rzpOrderId) query.paymentReference = rzpOrderId;
  else return { handled: false, reason: 'No order identifier found' };

  const order = await Order.findOne(query);
  if (!order) return { handled: false, reason: 'Order not found' };

  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    if (order.paymentStatus !== 'Paid') {
      order.paymentStatus = 'Paid';
      if (rzpPaymentId) order.paymentReference = rzpPaymentId;
      order.paymentDetails = {
        ...(order.paymentDetails || {}),
        webhookEvent: eventName,
        paymentEntity,
        verifiedAt: new Date(),
      };
      order.statusHistory.push({
        status: order.orderStatus,
        note: `Payment marked Paid via Razorpay Webhook (${eventName})`,
        at: new Date(),
      });
      await order.save();
    }
    return { handled: true, orderId: order.orderId };
  } else if (eventName === 'payment.failed') {
    if (order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Failed';
      order.statusHistory.push({
        status: order.orderStatus,
        note: `Payment failed via Razorpay (${paymentEntity?.error_description || 'failed'})`,
        at: new Date(),
      });
      await order.save();
    }
    return { handled: true, orderId: order.orderId };
  }

  return { handled: true, ignoredEvent: eventName };
}
