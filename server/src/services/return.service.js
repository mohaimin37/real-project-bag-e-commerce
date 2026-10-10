import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Setting from '../models/Setting.js';
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

/**
 * Computes exact return/exchange eligibility and countdown details for an order.
 * Calculates days remaining in a structured, precise hidden manner.
 */
/**
 * Computes exact return/exchange eligibility and countdown details for an order and its specific items.
 * Rules:
 * 1. If an order is cancelled: coins will not come (coinsEarned: 0) and no return/exchange is allowed.
 * 2. Once 7 days are complete for a specific item: no return or exchange can happen.
 */
export function computeOrderReturnEligibility(order, existingRequests = []) {
  const now = Date.now();
  const isDelivered = order.orderStatus === 'Delivered';
  const isCancelled = order.orderStatus === 'Cancelled';
  const deliveryTime = isDelivered ? getOrderDeliveryTime(order) : null;
  const deliveryDate = deliveryTime ? new Date(deliveryTime) : null;

  // Build a set of item keys that have already been requested
  const processedItemsMap = new Set();
  (existingRequests || []).forEach((req) => {
    if (['Requested', 'Approved', 'Pickup Scheduled', 'In Inspection', 'Completed'].includes(req.status)) {
      (req.items || []).forEach((it) => {
        processedItemsMap.add(`${String(it.productId)}_${String(it.variantId || 'default')}`);
      });
    }
  });

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
  const orderBaseEligible = !isExpired && !['Cancelled', 'Returned'].includes(order.orderStatus);

  // Specific item breakdown
  const itemsEligibility = (order.items || []).map((it) => {
    const key = `${String(it.productId)}_${String(it.variant?.id || 'default')}`;
    const alreadyRequested = processedItemsMap.has(key);
    const itemCanReturnOrExchange = orderBaseEligible && !alreadyRequested;

    let reasonNotEligible = null;
    if (isExpired) {
      reasonNotEligible = '7-day policy completed — Once 7 days are complete for a specific item, no return or exchange will happen.';
    } else if (alreadyRequested) {
      reasonNotEligible = 'A return or exchange request is already active for this specific item.';
    } else if (['Cancelled', 'Returned'].includes(order.orderStatus)) {
      reasonNotEligible = `Order is ${order.orderStatus.toLowerCase()}`;
    }

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
 * Fetches user orders formatted with full item detail, countdown, and coin policy status.
 */
export async function getOrdersWithReturnStatus(userId) {
  // First, disburse any coins for delivered orders that have passed the 7-day return policy
  await disburseEligibleOrderCoins(userId).catch((err) => console.error('[coins] Disburse check failed:', err.message));

  // Fetch all orders for this user
  const orders = await Order.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  const orderIds = orders.map((o) => o._id);
  const requests = await ReturnRequest.find({
    order: { $in: orderIds },
    status: { $in: ['Requested', 'Approved', 'Pickup Scheduled', 'In Inspection', 'Completed'] },
  }).lean();

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
      items: o.items.map((it) => ({
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
    };
  });
}

/**
 * Submits a return or exchange request.
 */
export async function createReturnExchangeRequest(userId, payload) {
  const { orderId, type, reason, detailedReason, items, exchangePreference, refundMethod, refundDetails, conditionConfirmed } = payload;

  const order = await Order.findOne({
    $or: [{ orderId }, ...(mongoose.isValidObjectId(orderId) ? [{ _id: orderId }] : [])],
    user: userId,
  });

  if (!order) throw ApiError.notFound('Order not found');

  // Rule 1: If order is cancelled, coin will not come and no return/exchange is allowed
  if (order.orderStatus === 'Cancelled') {
    throw ApiError.badRequest('This order was cancelled. Coins do not apply and cancelled orders cannot be returned or exchanged.');
  }

  if (order.orderStatus !== 'Delivered') {
    throw ApiError.badRequest('Returns and exchanges can only be initiated for delivered orders.');
  }

  const existingRequests = await ReturnRequest.find({
    order: order._id,
    status: { $in: ['Requested', 'Approved', 'Pickup Scheduled', 'In Inspection', 'Completed'] },
  });

  const eligibility = computeOrderReturnEligibility(order, existingRequests);

  // Rule 2: Once 7 days are complete, NO return or exchange will happen
  if (eligibility.isExpired) {
    throw ApiError.badRequest(
      'The 7-day return and exchange policy window for this item has completed. Under WILDTANE policy, once 7 days are complete following delivery, no return or exchange will happen.'
    );
  }

  // Validate items
  const validItems = (items || []).filter((it) => it.quantity > 0);
  if (!validItems.length) {
    throw ApiError.badRequest('Please select at least one item to return or exchange.');
  }

  // Specific item verification
  const processedItemsMap = new Set();
  existingRequests.forEach((req) => {
    (req.items || []).forEach((it) => {
      processedItemsMap.add(`${String(it.productId)}_${String(it.variantId || 'default')}`);
    });
  });

  for (const sel of validItems) {
    const key = `${String(sel.productId)}_${String(sel.variantId || 'default')}`;
    if (processedItemsMap.has(key)) {
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
    refundMethod: type === 'return' ? refundMethod || 'Original Payment Method' : undefined,
    refundDetails: type === 'return' ? refundDetails || {} : {},
    pickupAddress: order.shippingAddress,
    conditionConfirmed: !!conditionConfirmed,
    status: 'Requested',
    statusHistory: [{ status: 'Requested', note: `${type === 'exchange' ? 'Exchange' : 'Return'} request submitted by customer`, at: new Date() }],
  });

  order.returnExchange = {
    requestId,
    type,
    status: 'Requested',
    reason,
    itemsCount: mappedItems.reduce((acc, i) => acc + i.quantity, 0),
    requestedAt: new Date(),
    refundMethod: type === 'return' ? refundMethod : undefined,
    exchangePreference: type === 'exchange' ? exchangePreference : undefined,
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
