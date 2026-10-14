import Order from '../models/Order.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Setting from '../models/Setting.js';
import Notification from '../models/Notification.js';
import env from '../config/env.js';
import { refundRazorpayPayment, listRazorpayRefunds } from './payment.service.js';
import { restoreGiftCard } from './giftcard.service.js';
import { moveWallet } from './wallet.service.js';
import { sendEmail } from './email.service.js';

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Worst state across the parts: any failure → Failed, anything still moving → Pending. */
export function overallRefundStatus(parts) {
  if (!parts?.length) return 'Not required';
  if (parts.some((p) => p.status === 'Failed')) return 'Failed';
  if (parts.some((p) => p.status === 'Pending')) return 'Pending';
  return 'Processed';
}

const RZP_STATUS = { processed: 'Processed', pending: 'Pending', created: 'Pending', failed: 'Failed' };

function summarise(order, settings) {
  const parts = order.refundDetails?.parts || [];
  const status = overallRefundStatus(parts);
  order.refundDetails.status = status;
  order.refundDetails.amount = round2(parts.reduce((n, p) => n + (p.amount || 0), 0));
  // The timeframe is only promised while a gateway refund is actually on its way.
  const gatewayPending = parts.some((p) => p.source === 'razorpay' && p.status === 'Pending');
  order.refundDetails.eta = gatewayPending ? settings?.refundEta || '' : '';
  if (status === 'Processed' && !order.refundDetails.processedAt) order.refundDetails.processedAt = new Date();
  const paid = parts.filter((p) => p.status === 'Processed').reduce((n, p) => n + p.amount, 0);
  if (status === 'Processed' && paid > 0) order.paymentStatus = 'Refunded';
  order.markModified('refundDetails');
}

/** Gateway amount actually captured for this order (₹). */
function gatewayAmount(order) {
  const paise = order.paymentDetails?.capturedAmountPaise;
  return paise ? round2(paise / 100) : round2(order.grandTotal);
}

async function refundGateway(order, part) {
  const paymentId = order.paymentDetails?.razorpayPaymentId || (order.paymentReference?.startsWith('pay_') ? order.paymentReference : null);
  if (!paymentId) {
    part.status = 'Failed';
    part.failureReason = 'No captured Razorpay payment found for this order.';
    return;
  }
  try {
    // Before creating a refund, look for one we may already have made (e.g. a retry after a timeout).
    const existing = (await listRazorpayRefunds(paymentId)).find((r) => r.notes?.orderId === order.orderId && r.status !== 'failed');
    const refund =
      existing ||
      (await refundRazorpayPayment(paymentId, {
        amount: part.amount,
        notes: { orderId: order.orderId, reason: 'Order cancelled' },
        receipt: `rf_${order.orderId}`,
      }));
    part.providerRefundId = refund.id;
    part.providerStatus = refund.status;
    part.status = RZP_STATUS[refund.status] || 'Pending';
    if (part.status === 'Processed') part.processedAt = new Date();
  } catch (err) {
    const reason = err?.error?.description || err?.message || 'Refund request was rejected by the payment gateway';
    console.error(`[refund] Razorpay refund failed for ${order.orderId}: ${reason}`);
    part.status = 'Failed';
    part.failureReason = reason;
  }
}

/** What a cancelled order owes the customer: gateway payment + gift card + wallet (₹). */
export function refundOwed(order) {
  const gateway = order.paymentMethod === 'razorpay' && ['Paid', 'Partially Refunded'].includes(order.paymentStatus) ? gatewayAmount(order) : 0;
  return round2(gateway + (order.giftCard?.amount || 0) + (order.walletAmount || 0));
}

/**
 * Refunds everything the customer paid for a cancelled order, once.
 * The order must already be Cancelled. Safe to call again: parts that exist are left alone,
 * except gateway parts in Failed state, which are retried (after checking Razorpay for an earlier refund).
 */
export async function refundCancelledOrder(orderId, { retryFailed = false, notify = false } = {}) {
  // Claim: only one caller at a time may work on this order's refund (a lock older than 2 minutes is stale).
  const stale = new Date(Date.now() - 2 * 60 * 1000);
  const order = await Order.findOneAndUpdate(
    { _id: orderId, orderStatus: 'Cancelled', $or: [{ 'refundDetails.lockedAt': null }, { 'refundDetails.lockedAt': { $lt: stale } }] },
    { $set: { 'refundDetails.lockedAt': new Date() } },
    { returnDocument: 'after' }
  );
  if (!order) return Order.findById(orderId);
  const settings = await Setting.get();
  try {
    order.refundDetails = order.refundDetails || {};
    const parts = order.refundDetails.parts || [];
    const has = (source) => parts.find((p) => p.source === source);

    // 1. Payment gateway (UPI / cards / net banking via Razorpay)
    if (order.paymentMethod === 'razorpay' && ['Paid', 'Partially Refunded', 'Refunded'].includes(order.paymentStatus)) {
      let part = has('razorpay');
      if (!part) {
        parts.push({ source: 'razorpay', amount: gatewayAmount(order), status: 'Pending' });
        part = parts[parts.length - 1];
        await refundGateway(order, part);
      } else if (retryFailed && part.status === 'Failed') {
        part.failureReason = '';
        await refundGateway(order, part);
      }
    }
    // 2. Gift card: balance goes straight back onto the card.
    if (order.giftCard?.amount > 0 && !has('giftcard')) {
      await restoreGiftCard(order);
      parts.push({ source: 'giftcard', amount: round2(order.giftCard.amount), status: 'Processed', processedAt: new Date() });
    }
    // 3. Wallet: credited back to the customer's WILDTANE Wallet.
    if (order.walletAmount > 0 && !has('wallet')) {
      await moveWallet(order.user, order.walletAmount, {
        type: 'order_restore',
        key: `order_restore:${order.orderId}`,
        order,
        description: `Order ${order.orderId} cancelled — wallet amount returned`,
      });
      parts.push({ source: 'wallet', amount: round2(order.walletAmount), status: 'Processed', processedAt: new Date() });
    }

    order.refundDetails.parts = parts;
    if (!order.refundDetails.initiatedAt && parts.length) order.refundDetails.initiatedAt = new Date();
    summarise(order, settings);
  } finally {
    order.refundDetails.lockedAt = undefined;
    await order.save();
  }
  if (notify && order.refundDetails.parts?.length) notifyRefundUpdate(order).catch((e) => console.error('[email] refund update failed:', e.message));
  return order;
}

/**
 * Refund for a completed return. Runs once per request (claimed with a conditional update).
 * - Store Coins Wallet → credited to the WILDTANE Wallet at once.
 * - Original Payment Method on a Razorpay order → gateway refund of the returned items' value.
 * - UPI / Bank Transfer, or a COD order → recorded as Pending for the team to transfer manually;
 *   the admin marks it processed when the money has actually been sent.
 */
export async function refundReturnRequest(request, order) {
  const claimed = await ReturnRequest.findOneAndUpdate(
    { _id: request._id, type: 'return', 'refund.status': { $in: ['None', null] } },
    { $set: { 'refund.status': 'Pending', 'refund.initiatedAt': new Date() } },
    { returnDocument: 'after' }
  );
  if (!claimed) return ReturnRequest.findById(request._id);

  const itemsValue = round2(claimed.items.reduce((n, it) => n + (it.totalPrice || (it.unitPrice || 0) * it.quantity), 0));
  const paidTotal = round2((order.grandTotal || 0) + (order.giftCard?.amount || 0) + (order.walletAmount || 0));
  const amount = Math.min(itemsValue, paidTotal);
  const refund = { status: 'Pending', amount, method: claimed.refundMethod, initiatedAt: claimed.refund.initiatedAt };

  if (claimed.refundMethod === 'Store Coins Wallet') {
    await moveWallet(order.user, amount, { type: 'refund', key: `return_refund:${claimed.requestId}`, order, description: `Refund for return ${claimed.requestId}` });
    Object.assign(refund, { status: 'Processed', processedAt: new Date() });
  } else if (claimed.refundMethod === 'Original Payment Method' && order.paymentMethod === 'razorpay' && order.paymentDetails?.razorpayPaymentId) {
    const gatewayCap = gatewayAmount(order);
    try {
      const r = await refundRazorpayPayment(order.paymentDetails.razorpayPaymentId, {
        amount: Math.min(amount, gatewayCap),
        notes: { orderId: order.orderId, returnId: claimed.requestId },
        receipt: `rf_${claimed.requestId}`,
      });
      Object.assign(refund, { providerRefundId: r.id, status: RZP_STATUS[r.status] || 'Pending' });
      if (refund.status === 'Processed') refund.processedAt = new Date();
    } catch (err) {
      Object.assign(refund, { status: 'Failed', failureReason: err?.error?.description || err.message });
    }
  }
  // Otherwise (UPI / bank transfer / COD): stays Pending until the team records the transfer.
  claimed.refund = refund;
  await claimed.save();
  return claimed;
}

/** Razorpay refund webhooks: refund.processed / refund.failed update the matching part. */
export async function applyRefundWebhook(eventName, refund) {
  if (!refund?.id) return { handled: false, reason: 'No refund entity' };
  const order = await Order.findOne({ 'refundDetails.parts.providerRefundId': refund.id });
  if (!order) {
    // Maybe a return refund.
    const request = await ReturnRequest.findOne({ 'refund.providerRefundId': refund.id });
    if (!request) return { handled: false, reason: 'Refund not linked to an order' };
    request.refund.status = RZP_STATUS[refund.status] || request.refund.status;
    if (request.refund.status === 'Processed') request.refund.processedAt = new Date();
    if (request.refund.status === 'Failed') request.refund.failureReason = refund.error_description || 'Gateway could not complete the refund';
    await request.save();
    return { handled: true, requestId: request.requestId, status: request.refund.status };
  }
  const part = order.refundDetails.parts.find((p) => p.providerRefundId === refund.id);
  const before = part.status;
  part.providerStatus = refund.status;
  part.status = RZP_STATUS[refund.status] || (eventName === 'refund.processed' ? 'Processed' : eventName === 'refund.failed' ? 'Failed' : part.status);
  if (part.status === 'Processed' && !part.processedAt) part.processedAt = new Date();
  if (part.status === 'Failed') part.failureReason = refund.error_description || 'The payment gateway could not complete this refund.';
  summarise(order, await Setting.get());
  await order.save();
  if (before !== part.status) notifyRefundUpdate(order).catch((e) => console.error('[email] refund update failed:', e.message));
  return { handled: true, orderId: order.orderId, status: part.status };
}

const SOURCE_LABEL = { razorpay: 'Original payment method', giftcard: 'Gift card', wallet: 'WILDTANE Wallet' };

/** Plain-language refund lines for emails. */
export function refundLines(order) {
  const parts = order.refundDetails?.parts || [];
  if (!parts.length) return ['No payment was collected for this order, so no refund is needed.'];
  return parts.map((p) => {
    const amount = `₹${p.amount.toLocaleString('en-IN')}`;
    if (p.status === 'Processed') return `${SOURCE_LABEL[p.source]}: ${amount} refunded.`;
    if (p.status === 'Failed') return `${SOURCE_LABEL[p.source]}: ${amount} — the refund could not be completed automatically. Our team will contact you.`;
    return `${SOURCE_LABEL[p.source]}: ${amount} refund initiated${order.refundDetails.eta ? `; expected within ${order.refundDetails.eta}` : ''}.`;
  });
}

async function notifyRefundUpdate(order) {
  if (!order.email) return;
  const lines = refundLines(order);
  const outcome = await sendEmail({
    to: order.email,
    subject: `Refund update for order ${order.orderId}`,
    text: [`Hi ${order.customerName},`, '', ...lines, '', `Order details: ${env.siteUrl}/account/orders/${order.orderId}`].join('\n'),
  });
  await Notification.create({
    type: 'order_status',
    channel: 'email',
    order: order._id,
    recipient: order.email,
    message: `Refund update: ${lines.join(' ')}`,
    provider: outcome?.delivered ? 'smtp' : 'dev_log',
    status: outcome?.delivered ? 'sent' : 'logged',
  }).catch(() => {});
}
