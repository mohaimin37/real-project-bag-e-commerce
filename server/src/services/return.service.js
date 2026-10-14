import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ReturnRequest, { ITEM_HOLDING_STATUSES, CUSTOMER_CANCELLABLE_STATUSES, REFUND_DETAILS_OPEN_STATUSES } from '../models/ReturnRequest.js';
import Setting from '../models/Setting.js';
import env from '../config/env.js';
import Notification from '../models/Notification.js';
import { nextSequence } from '../models/Counter.js';
import ApiError from '../utils/ApiError.js';
import { disburseEligibleOrderCoins, getOrderDeliveryTime, RETURN_WINDOW_DAYS, RETURN_WINDOW_MS } from './coin.service.js';
import { sendEmail } from './email.service.js';

export const CUSTOMER_CARE = {
  phone: '8920550465',
  phoneDisplay: '+91 8920550465',
  email: 'info@wildtane.com',
  whatsapp: '8920550465',
  hours: 'Mon – Sat: 9:30 AM – 6:30 PM IST',
  companyName: 'WILDTANE PRIVATE LIMITED',
  address: 'A 370 Amar Puri Nabi Karim, Paharganj, New Delhi-110055',
  gstin: '07AAECW3767F1Z4',
};

const itemKey = (productId, variantId) => `${String(productId)}_${String(variantId || 'default')}`;

/** What the customer sees about one request on their order list (no admin notes, no bank numbers). */
function requestSummary(req) {
  return {
    _id: req._id,
    requestId: req.requestId,
    type: req.type,
    status: req.status,
    requestedAt: req.requestedAt || req.createdAt,
    refundMethod: req.refundMethod,
    refundStatus: req.refund?.status || 'None',
    refundAmount: req.refund?.amount || 0,
    refundMethodUsed: req.refund?.method || req.refundMethod,
    refundProcessedAt: req.refund?.processedAt || null,
    refundReference: req.refund?.reference || '',
    // Approved return still waiting for the customer to say where the money goes.
    needsRefundDetails: needsRefundDetails(req),
    canCancel: CUSTOMER_CANCELLABLE_STATUSES.includes(req.status) && !req.reversePickup?.shipmentId,
    adminMessage: req.adminMessage || '',
  };
}

/**
 * Once a return is approved, the customer is asked where the money should go (refund page),
 * until they answer or the team fills it in for them.
 */
export function needsRefundDetails(req) {
  if (req.type !== 'return' || !REFUND_DETAILS_OPEN_STATUSES.includes(req.status)) return false;
  if (req.refund?.status && req.refund.status !== 'None') return false;
  return !req.refundDetailsSubmittedAt;
}

/**
 * The refund can't be sent "back to the original payment" for a cash-on-delivery order, so a COD
 * return can't be completed until UPI / bank / wallet details are known.
 */
export function missingRefundDestination(req, order) {
  if (req.type !== 'return') return false;
  const paidOnline = order?.paymentMethod && order.paymentMethod !== 'cod';
  return !paidOnline && req.refundMethod === 'Original Payment Method';
}

/** Latest request per item (newest first), so a cancelled-then-re-requested item shows the new one. */
function latestRequestByItem(requests = []) {
  const map = new Map();
  [...requests]
    .sort((a, b) => new Date(b.createdAt || b.requestedAt || 0) - new Date(a.createdAt || a.requestedAt || 0))
    .forEach((req) => (req.items || []).forEach((it) => {
      const k = itemKey(it.productId, it.variantId);
      if (!map.has(k)) map.set(k, req);
    }));
  return map;
}

/**
 * Computes exact return/exchange eligibility and countdown details for an order and its specific items.
 * Rules:
 * 1. If an order is cancelled: coins will not come (coinsEarned: 0) and no return/exchange is allowed.
 * 2. Once 7 days are complete for a specific item: no return or exchange can happen.
 * 3. An item with an open, completed or rejected request can't be requested again
 *    (a request the customer cancelled frees the item).
 * `existingRequests` may hold requests in any status.
 */
export function computeOrderReturnEligibility(order, existingRequests = []) {
  const now = Date.now();
  const isCancelled = order.orderStatus === 'Cancelled';
  // A completed return turns the order "Returned"; it still shows, with its items' outcome.
  const isDelivered = ['Delivered', 'Returned'].includes(order.orderStatus);
  const deliveryTime = isDelivered ? getOrderDeliveryTime(order) : null;
  const deliveryDate = deliveryTime ? new Date(deliveryTime) : null;

  const latest = latestRequestByItem(existingRequests);
  const holding = (k) => {
    const req = latest.get(k);
    return req && ITEM_HOLDING_STATUSES.includes(req.status) ? req : null;
  };

  if (isCancelled) {
    return {
      isDelivered: false,
      deliveredAt: null,
      returnWindowDays: RETURN_WINDOW_DAYS,
      deadline: null,
      daysLeft: 0,
      hoursLeft: 0,
      msRemaining: 0,
      isExpired: true,
      isCancelled: true,
      canReturnOrExchange: false,
      reasonNotEligible: 'Order was cancelled — coins will not come and returns/exchanges are not permitted.',
      coinsDisbursed: false,
      coinsEarned: 0,
      coinsDisburseAt: null,
      itemsEligibility: (order.items || []).map((it) => ({
        productId: it.productId,
        variantId: it.variant?.id,
        productName: it.productName,
        canReturnOrExchange: false,
        isExpired: true,
        reasonNotEligible: 'Order was cancelled — 0 coins credited. Returns/exchanges not permitted.',
      })),
    };
  }

  if (!isDelivered || !deliveryTime) {
    return {
      isDelivered: false,
      deliveredAt: null,
      returnWindowDays: RETURN_WINDOW_DAYS,
      deadline: null,
      daysLeft: 0,
      hoursLeft: 0,
      msRemaining: 0,
      isExpired: false,
      canReturnOrExchange: false,
      reasonNotEligible: 'Product has not been delivered yet. Return & exchange window opens for 7 days upon delivery.',
      coinsDisbursed: !!order.coinsDisbursed,
      coinsEarned: order.coinsEarned || 0,
      coinsDisburseAt: null,
      itemsEligibility: (order.items || []).map((it) => ({
        productId: it.productId,
        variantId: it.variant?.id,
        productName: it.productName,
        canReturnOrExchange: false,
        isExpired: false,
        reasonNotEligible: 'Item has not been delivered yet.',
      })),
    };
  }

  const deadlineMs = deliveryTime + RETURN_WINDOW_MS;
  const deadline = new Date(deadlineMs);
  const msRemaining = Math.max(0, deadlineMs - now);
  const isExpired = msRemaining <= 0;
  const daysLeft = isExpired ? 0 : Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  const hoursLeft = isExpired ? 0 : Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  const hasActiveOrderRequest = !!order.returnExchange && ['Requested', 'Approved', 'Pickup Scheduled', 'In Inspection'].includes(order.returnExchange.status);
  const orderBaseEligible = !isExpired && order.orderStatus === 'Delivered';

  // Specific item breakdown
  const itemsEligibility = (order.items || []).map((it) => {
    const key = itemKey(it.productId, it.variant?.id);
    const held = holding(key);
    const alreadyRequested = !!held;
    const itemCanReturnOrExchange = orderBaseEligible && !alreadyRequested;

    let reasonNotEligible = null;
    if (held?.status === 'Rejected') {
      reasonNotEligible = 'This item cannot be returned or exchanged.';
    } else if (alreadyRequested) {
      reasonNotEligible = 'A return or exchange request already exists for this item.';
    } else if (isExpired) {
      reasonNotEligible = '7-day policy completed — Once 7 days are complete for a specific item, no return or exchange will happen.';
    } else if (order.orderStatus !== 'Delivered') {
      reasonNotEligible = `Order is ${order.orderStatus.toLowerCase()}`;
    }
    const latestReq = latest.get(key);

    return {
      productId: it.productId,
      variantId: it.variant?.id,
      productName: it.productName,
      SKU: it.SKU,
      image: it.image,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      totalPrice: it.totalPrice,
      isExpired,
      alreadyRequested,
      canReturnOrExchange: itemCanReturnOrExchange,
      reasonNotEligible,
      // The newest request for this item (any status), for the customer's status line.
      request: latestReq ? requestSummary(latestReq) : null,
      deadline,
      daysLeft,
      hoursLeft,
    };
  });

  const anyItemCanReturnOrExchange = itemsEligibility.some((it) => it.canReturnOrExchange);

  return {
    isDelivered: true,
    deliveredAt: deliveryDate,
    returnWindowDays: RETURN_WINDOW_DAYS,
    deadline,
    daysLeft,
    hoursLeft,
    msRemaining,
    isExpired,
    canReturnOrExchange: anyItemCanReturnOrExchange,
    hasActiveRequest: hasActiveOrderRequest,
    activeRequest: order.returnExchange || null,
    reasonNotEligible: isExpired
      ? '7-day policy window completed — Once 7 days are complete for a specific item, no return or exchange will happen.'
      : null,
    coinsEarned: order.coinsEarned || 0,
    coinsDisbursed: !!order.coinsDisbursed,
    coinsDisburseAt: deadline,
    itemsEligibility,
  };
}

/**
 * The customer's delivered orders (and orders already returned), with item detail, countdown,
 * coin policy status and each item's latest return / exchange request. Orders still on their
 * way (or cancelled) are not listed: only delivered items can be returned.
 */
export async function getOrdersWithReturnStatus(userId) {
  // First, disburse any coins for delivered orders that have passed the 7-day return policy
  await disburseEligibleOrderCoins(userId).catch((err) => console.error('[coins] Disburse check failed:', err.message));

  // Customer's order list history (newest first).
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('orderId orderStatus paymentStatus paymentMethod grandTotal currency createdAt deliveredAt statusHistory updatedAt items shippingAddress coinsEarned coinsDisbursed returnExchange trackingNumber courier')
    .lean();

  const orderIds = orders.map((o) => o._id);
  const requests = await ReturnRequest.find({ order: { $in: orderIds } })
    .select('-adminNotes -statusHistory -refundDetails')
    .lean();

  const requestsByOrder = {};
  requests.forEach((r) => {
    const oId = String(r.order);
    if (!requestsByOrder[oId]) requestsByOrder[oId] = [];
    requestsByOrder[oId].push(r);
  });

  return orders.map((o) => {
    const eligibility = computeOrderReturnEligibility(o, requestsByOrder[String(o._id)] || []);
    return {
      _id: o._id,
      orderId: o.orderId,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      grandTotal: o.grandTotal,
      currency: o.currency || 'INR',
      createdAt: o.createdAt,
      deliveredAt: eligibility.deliveredAt,
      items: (o.items || []).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        variantId: it.variant?.id,
        variantName: it.variant?.name,
        SKU: it.SKU,
        image: it.image,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      shippingAddress: o.shippingAddress,
      coinsEarned: o.coinsEarned || 0,
      coinsDisbursed: !!o.coinsDisbursed,
      returnDetails: eligibility,
      trackingNumber: o.trackingNumber || '',
      courier: o.courier || '',
    };
  });
}

const REFUND_METHODS = ['Original Payment Method', 'UPI', 'Bank Transfer', 'Store Coins Wallet'];
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Where the money goes back. Returns refund to it; exchanges keep it in case the exchange
 * can't be completed (out of stock etc.) and the team refunds instead.
 */
export function cleanRefundDestination(method, details = {}) {
  const m = REFUND_METHODS.includes(method) ? method : 'Original Payment Method';
  const s = (v, max = 80) => String(v || '').trim().slice(0, max);
  if (m === 'UPI') {
    const upiId = s(details.upiId, 120).replace(/\s+/g, '');
    if (!UPI_RE.test(upiId)) throw ApiError.badRequest('Please enter a valid UPI ID, like yourname@okhdfcbank.');
    return { refundMethod: m, refundDetails: { upiId } };
  }
  if (m === 'Bank Transfer') {
    const accountHolder = s(details.accountHolder);
    const accountNumber = s(details.accountNumber, 30).replace(/\s+/g, '');
    const ifsc = s(details.ifsc, 11).toUpperCase().replace(/\s+/g, '');
    const bankName = s(details.bankName);
    if (accountHolder.length < 2) throw ApiError.badRequest('Please enter the account holder’s name as it appears on the bank account.');
    if (!/^\d{9,18}$/.test(accountNumber)) throw ApiError.badRequest('Please enter a valid bank account number (9 to 18 digits).');
    if (!IFSC_RE.test(ifsc)) throw ApiError.badRequest('Please enter a valid IFSC code, like HDFC0001234.');
    return { refundMethod: m, refundDetails: { accountHolder, accountNumber, ifsc, bankName } };
  }
  return { refundMethod: m, refundDetails: {} };
}

/**
 * Submits a return or exchange request.
 * opts.byAdmin: created by the team for the customer (e.g. on a phone call). The order is looked up
 * without the customer filter and the 7-day window may be overridden with a reason.
 */
export async function createReturnExchangeRequest(userId, payload, opts = {}) {
  const { orderId, type, reason, detailedReason, items, exchangePreference, refundMethod, refundDetails, conditionConfirmed } = payload;
  if (!['return', 'exchange'].includes(type)) throw ApiError.badRequest('Choose return or exchange.');
  if (!reason || !String(reason).trim()) throw ApiError.badRequest('Please choose a reason.');
  // Customers say where the money goes after the return is approved (refund page). The team may
  // already know it when creating a request for a customer.
  const destinationGiven = !!refundMethod;
  const destination = destinationGiven ? cleanRefundDestination(refundMethod, refundDetails) : { refundMethod: 'Original Payment Method', refundDetails: {} };

  const order = await Order.findOne({
    $or: [{ orderId }, ...(mongoose.isValidObjectId(orderId) ? [{ _id: orderId }] : [])],
    ...(opts.byAdmin ? {} : { user: userId }),
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (opts.byAdmin) userId = order.user;

  // Rule 1: If order is cancelled, coin will not come and no return/exchange is allowed
  if (order.orderStatus === 'Cancelled') {
    throw ApiError.badRequest('This order was cancelled. Coins do not apply and cancelled orders cannot be returned or exchanged.');
  }

  if (order.orderStatus !== 'Delivered') {
    throw ApiError.badRequest('Returns and exchanges can only be initiated for delivered orders.');
  }

  const existingRequests = await ReturnRequest.find({ order: order._id }).select('status items createdAt requestedAt').lean();

  const eligibility = computeOrderReturnEligibility(order, existingRequests);

  // Rule 2: Once 7 days are complete, NO return or exchange will happen (the team may override with a reason).
  if (eligibility.isExpired && !(opts.byAdmin && opts.overrideWindow)) {
    throw ApiError.badRequest(
      'The 7-day return and exchange policy window for this item has completed. Under WILDTANE policy, once 7 days are complete following delivery, no return or exchange will happen.'
    );
  }

  // Validate items
  const validItems = (items || []).filter((it) => it.quantity > 0);
  if (!validItems.length) {
    throw ApiError.badRequest('Please select at least one item to return or exchange.');
  }

  // Specific item verification: open, completed or rejected requests hold the item.
  const latest = latestRequestByItem(existingRequests);
  for (const sel of validItems) {
    const held = latest.get(itemKey(sel.productId, sel.variantId));
    if (held?.status === 'Rejected' && !opts.byAdmin) {
      throw ApiError.badRequest(`${sel.productName || 'This item'} cannot be returned or exchanged.`);
    }
    if (held && ITEM_HOLDING_STATUSES.includes(held.status) && held.status !== 'Rejected') {
      throw ApiError.badRequest(
        `A return or exchange request has already been submitted for ${sel.productName || 'this specific item'}. Each specific item can only be returned or exchanged once.`
      );
    }
  }

  const seq = await nextSequence('return');
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = type === 'exchange' ? 'EXC' : 'RET';
  const requestId = `${prefix}${yy}-${String(seq).padStart(6, '0')}`;

  const mappedItems = validItems.map((sel) => {
    const orig = order.items.find(
      (i) => i.productId.toString() === String(sel.productId) && (!sel.variantId || String(i.variant?.id) === String(sel.variantId))
    );
    return {
      productId: sel.productId,
      productName: orig?.productName || sel.productName || 'Product',
      variantId: sel.variantId || orig?.variant?.id,
      variantName: orig?.variant?.name || sel.variantName || '',
      SKU: orig?.SKU || sel.SKU || '',
      image: orig?.image || sel.image || '',
      quantity: sel.quantity,
      unitPrice: orig?.unitPrice || 0,
      totalPrice: (orig?.unitPrice || 0) * sel.quantity,
    };
  });

  const returnReq = await ReturnRequest.create({
    requestId,
    order: order._id,
    orderId: order.orderId,
    user: userId,
    type,
    reason,
    detailedReason: detailedReason || '',
    items: mappedItems,
    exchangePreference: type === 'exchange' ? exchangePreference || {} : {},
    ...destination,
    refundDetailsSubmittedAt: destinationGiven ? new Date() : undefined,
    pickupAddress: order.shippingAddress,
    conditionConfirmed: !!conditionConfirmed || !!opts.byAdmin,
    status: 'Requested',
    statusHistory: [{
      status: 'Requested',
      note: opts.byAdmin
        ? `${type === 'exchange' ? 'Exchange' : 'Return'} created by the WILDTANE team${opts.overrideWindow && eligibility.isExpired ? ` (7-day window overridden: ${opts.overrideReason || 'no reason given'})` : ''}`
        : `${type === 'exchange' ? 'Exchange' : 'Return'} request submitted by customer`,
      changedBy: opts.byAdmin ? opts.adminId : undefined,
      at: new Date(),
    }],
    adminNotes: opts.byAdmin && opts.adminNote ? String(opts.adminNote).slice(0, 1000) : '',
  });

  order.returnExchange = {
    requestId,
    type,
    status: 'Requested',
    reason,
    itemsCount: mappedItems.reduce((acc, i) => acc + i.quantity, 0),
    requestedAt: new Date(),
    refundMethod: destination.refundMethod,
    exchangePreference: type === 'exchange' ? exchangePreference : undefined,
    adminMessage: '',
  };

  await order.save();

  // Send email alert to customer
  const settings = await Setting.get();
  const phone = settings.supportPhone || CUSTOMER_CARE.phone;
  const email = settings.supportEmail || CUSTOMER_CARE.email;

  if (order.email) {
    sendEmail({
      to: order.email,
      subject: `${type === 'exchange' ? 'Exchange' : 'Return'} Request Received - ${requestId} [WILDTANE]`,
      text: `Hi ${order.customerName},\n\nWe have received your ${type} request for Order ${order.orderId} (Reference: ${requestId}).\n\nOur quality care team will review your request within 24-48 business hours and coordinate doorstep courier pickup.\n\nNeed help? Call us at ${phone} or email ${email}.\n\nThank you,\nWILDTANE Private Limited`,
    }).catch((e) => console.error('[email] Return request confirmation failed:', e.message));
  }

  await Notification.create({
    type: 'order_status',
    channel: 'email',
    order: order._id,
    recipient: order.email,
    message: `${type === 'exchange' ? 'Exchange' : 'Return'} request ${requestId} created for order ${order.orderId}`,
    status: 'logged',
  }).catch(() => {});

  return { returnRequest: returnReq, order };
}

export const ALL_REFUND_METHODS = REFUND_METHODS;

/**
 * Refund methods the customer may pick for this order: the ones the team switched on
 * (Admin → Settings → Returns), minus "original payment" for cash-on-delivery orders.
 */
export function allowedRefundMethods(settings, order) {
  const on = settings?.returnRefundMethods?.length ? settings.returnRefundMethods : REFUND_METHODS;
  const paidOnline = order?.paymentMethod && order.paymentMethod !== 'cod';
  const list = REFUND_METHODS.filter((m) => on.includes(m) && (paidOnline || m !== 'Original Payment Method'));
  // Never leave a customer with no way to be paid.
  return list.length ? list : paidOnline ? ['Original Payment Method'] : ['UPI', 'Bank Transfer'];
}

const requestLink = (r) => `${env.siteUrl}/returns-exchange/refund/${encodeURIComponent(r.requestId)}`;

/** Emails the customer when the team approves or rejects their request (never blocks the update). */
export async function notifyReturnDecision(request, order) {
  if (!order?.email || !['Approved', 'Rejected'].includes(request.status)) return;
  const what = request.type === 'exchange' ? 'exchange' : 'return';
  const name = order.customerName || 'there';
  const lines =
    request.status === 'Approved'
      ? [
          `Good news — your ${what} request ${request.requestId} for order ${order.orderId} is approved.`,
          ...(request.type === 'return' && !request.refundDetailsSubmittedAt
            ? ['', 'Please tell us how you would like your money back (UPI, bank account or another option):', requestLink(request)]
            : []),
          '',
          ...(request.adminMessage ? [`Message from WILDTANE: "${request.adminMessage}"`, ''] : []),
          'We will arrange the doorstep pickup and keep you posted.',
        ]
      : [
          `We’re sorry — your ${what} request ${request.requestId} for order ${order.orderId} was not approved, so this item cannot be returned or exchanged.`,
          '',
          ...(request.adminMessage ? [`Message from WILDTANE: "${request.adminMessage}"`, ''] : []),
          'If you have questions, reply to this email or call our support team.',
        ];
  const outcome = await sendEmail({
    to: order.email,
    subject: `Your ${what} request ${request.requestId} was ${request.status === 'Approved' ? 'approved' : 'not approved'} [WILDTANE]`,
    text: [`Hi ${name},`, '', ...lines, '', 'WILDTANE'].join('\n'),
  });
  await Notification.create({
    type: 'order_status',
    channel: 'email',
    order: order._id,
    recipient: order.email,
    message: `${request.requestId} ${request.status.toLowerCase()} — customer emailed`,
    provider: outcome?.delivered ? 'smtp' : 'dev_log',
    status: outcome?.delivered ? 'sent' : 'logged',
  }).catch(() => {});
}

/** Tells the customer their return refund has been sent, with the amount, method and reference. */
export async function notifyRefundSent(request) {
  const order = await Order.findById(request.order).select('orderId email customerName').lean();
  if (!order?.email) return;
  const amount = `₹${Number(request.refund?.amount || 0).toLocaleString('en-IN')}`;
  const lines = [
    `Hi ${order.customerName || 'there'},`,
    '',
    `Your refund of ${amount} for return ${request.requestId} (order ${order.orderId}) has been sent by ${request.refund?.method || request.refundMethod}.`,
    request.refund?.reference ? `Transaction reference: ${request.refund.reference}` : '',
    'It can take a little time to show in your bank or UPI app.',
    '',
    `Details: ${env.siteUrl}/returns-exchange/help/${encodeURIComponent(request.requestId)}`,
    '',
    'WILDTANE',
  ].filter((l) => l !== '');
  const outcome = await sendEmail({ to: order.email, subject: `Refund sent for return ${request.requestId} [WILDTANE]`, text: lines.join('\n') });
  await Notification.create({
    type: 'order_status',
    channel: 'email',
    order: request.order,
    recipient: order.email,
    message: `Refund ${amount} for ${request.requestId} sent — customer emailed`,
    provider: outcome?.delivered ? 'smtp' : 'dev_log',
    status: outcome?.delivered ? 'sent' : 'logged',
  }).catch(() => {});
}

const findOwnRequest = async (userId, requestId) => {
  const request = await ReturnRequest.findOne({ requestId: String(requestId).toUpperCase(), user: userId });
  if (!request) throw ApiError.notFound('We couldn’t find that request on your account.');
  return request;
};

/** Keeps the order's one-line summary of its latest request in step. */
async function syncOrderSummary(request) {
  const order = await Order.findById(request.order);
  if (order?.returnExchange?.requestId === request.requestId) {
    order.returnExchange.status = request.status;
    order.markModified('returnExchange');
    await order.save();
  }
  return order;
}

/** The customer withdraws their own request (before the pickup is booked). The item can be requested again. */
export async function customerCancelRequest(userId, requestId) {
  const request = await findOwnRequest(userId, requestId);
  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(request.status) || request.reversePickup?.shipmentId) {
    throw ApiError.badRequest(`This request is ${request.status.toLowerCase()} and can no longer be cancelled. Please contact support.`);
  }
  request.status = 'Cancelled';
  request.resolvedAt = new Date();
  request.statusHistory.push({ status: 'Cancelled', note: 'Cancelled by the customer', changedBy: userId, at: new Date() });
  await request.save();
  await syncOrderSummary(request);
  return request;
}

/** The refund page: the customer says where an approved return's money should go. */
export async function customerSetRefundDestination(userId, requestId, body = {}) {
  const request = await findOwnRequest(userId, requestId);
  if (request.type !== 'return') throw ApiError.badRequest('Refund details are only needed for returns.');
  if (!REFUND_DETAILS_OPEN_STATUSES.includes(request.status)) {
    throw ApiError.badRequest(
      request.status === 'Requested'
        ? 'Your return is still waiting for approval. You can add refund details once it is approved.'
        : `This return is ${request.status.toLowerCase()}, so refund details can’t be changed here. Please contact support.`
    );
  }
  if (request.refund?.status && request.refund.status !== 'None') throw ApiError.badRequest('Your refund has already started, so these details can’t be changed. Please contact support.');
  const [settings, order] = await Promise.all([Setting.get(), Order.findById(request.order).select('paymentMethod').lean()]);
  const allowed = allowedRefundMethods(settings, order);
  if (!allowed.includes(body.refundMethod)) throw ApiError.badRequest('Please choose one of the refund options shown.');
  const { refundMethod, refundDetails } = cleanRefundDestination(body.refundMethod, body.refundDetails);
  const changed = Boolean(request.refundDetailsSubmittedAt);
  request.refundMethod = refundMethod;
  request.refundDetails = refundDetails;
  request.refundDetailsSubmittedAt = new Date();
  request.statusHistory.push({ status: request.status, note: `Customer ${changed ? 'changed' : 'chose'} refund method: ${refundMethod}`, changedBy: userId, at: new Date() });
  await request.save();
  // Safety net against a taken-over account quietly redirecting a refund: the account owner is told
  // every time the destination is set or changed.
  const owner = await Order.findById(request.order).select('email customerName orderId').lean();
  if (owner?.email) {
    const where = refundMethod === 'UPI' ? `UPI ${refundDetails.upiId}` : refundMethod === 'Bank Transfer' ? `bank account ending ${String(refundDetails.accountNumber).slice(-4)}` : refundMethod;
    sendEmail({
      to: owner.email,
      subject: `Refund details ${changed ? 'changed' : 'saved'} for return ${request.requestId} [WILDTANE]`,
      text: `Hi ${owner.customerName || 'there'},\n\nThe refund for return ${request.requestId} (order ${owner.orderId}) will be sent to: ${where}.\n\nIf you did not do this, reply to this email or call us straight away.\n\nWILDTANE`,
    }).catch((e) => console.error('[email] refund details notice failed:', e.message));
  }
  return request;
}

/**
 * Returns customer care info & policy configuration.
 */
export async function getReturnPolicyConfig() {
  const settings = await Setting.get();
  return {
    policyWindowDays: RETURN_WINDOW_DAYS,
    company: settings.companyName || CUSTOMER_CARE.companyName,
    registeredAddress: settings.businessAddress || CUSTOMER_CARE.address,
    gstin: CUSTOMER_CARE.gstin,
    supportPhone: settings.supportPhone || CUSTOMER_CARE.phone,
    supportEmail: settings.supportEmail || CUSTOMER_CARE.email,
    supportWhatsapp: settings.supportPhone || CUSTOMER_CARE.whatsapp,
    workingHours: CUSTOMER_CARE.hours,
    coinDisbursementNotice: 'If an order gets cancelled, coin rewards will not come. Once 7 days are complete for a specific item, no return or exchange will happen and coins permanently disburse into your wallet.',
  };
}
