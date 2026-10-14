import mongoose from 'mongoose';
import ReturnRequest, { RETURN_STATUSES, RETURN_REASONS, CUSTOMER_CANCELLABLE_STATUSES } from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, paginated } from '../utils/helpers.js';
import {
  getReturnPolicyConfig,
  getOrdersWithReturnStatus,
  createReturnExchangeRequest,
  computeOrderReturnEligibility,
  cleanRefundDestination,
  needsRefundDetails,
  missingRefundDestination,
  allowedRefundMethods,
  notifyReturnDecision,
  notifyRefundSent,
  customerCancelRequest,
  customerSetRefundDestination,
} from '../services/return.service.js';
import { changeOrderStatus } from '../services/order.service.js';
import { refundReturnRequest } from '../services/refund.service.js';
import { createReversePickup } from '../services/shipping.service.js';

// ── Public / Customer Endpoints ──────────────────────────────

export const getPolicyInfo = asyncHandler(async (req, res) => {
  const config = await getReturnPolicyConfig();
  res.json({ success: true, ...config, returnReasons: RETURN_REASONS });
});

export const getMyReturnOrders = asyncHandler(async (req, res) => {
  const orders = await getOrdersWithReturnStatus(req.user._id);
  res.json({ success: true, orders });
});

// Signed-in customers look up their own orders; guests must also give the email the order was placed with.
export const getOrderEligibility = asyncHandler(async (req, res) => {
  const id = String(req.params.id).trim();
  const filter = { $or: [{ orderId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])] };
  if (req.user) {
    filter.user = req.user._id;
  } else {
    const email = String(req.query.email || '').trim();
    if (!email) throw ApiError.badRequest('Enter the email address used for this order.');
    filter.email = email.toLowerCase();
  }
  const order = await Order.findOne(filter).lean();
  if (!order) throw ApiError.notFound('Order not found');

  const existingRequests = await ReturnRequest.find({ order: order._id }).select('requestId type status items createdAt requestedAt refund refundMethod refundDetailsSubmittedAt reversePickup').lean();
  const eligibility = computeOrderReturnEligibility(order, existingRequests);
  res.json({ success: true, orderId: order.orderId, eligibility });
});

export const submitRequest = asyncHandler(async (req, res) => {
  const result = await createReturnExchangeRequest(req.user._id, req.body);
  res.status(201).json({ success: true, ...result });
});

/** The customer's own requests, newest first (for the help page's request picker). */
export const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await ReturnRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('requestId orderId type status reason requestedAt createdAt items.productName')
    .lean();
  res.json({ success: true, requests });
});

/**
 * One request for the "Help with this request" page. Scoped to the signed-in customer, so
 * another customer's request id returns 404 (never their data). Admin-only notes are left out.
 */
export const getMyRequest = asyncHandler(async (req, res) => {
  const request = await ReturnRequest.findOne({ requestId: String(req.params.requestId).toUpperCase(), user: req.user._id })
    .select('-adminNotes -statusHistory.changedBy')
    .lean();
  if (!request) throw ApiError.notFound('We couldn’t find that request on your account.');
  // Show only the last 4 digits of a saved bank account.
  const d = request.refundDetails || {};
  request.refundDetails = { upiId: d.upiId || '', bankName: d.bankName || '', accountHolder: d.accountHolder || '', accountLast4: d.accountNumber ? String(d.accountNumber).slice(-4) : '' };
  const order = await Order.findOne({ _id: request.order, user: req.user._id })
    .select('orderId orderStatus createdAt deliveredAt items shippingAddress paymentMethod grandTotal')
    .lean();
  const [policy, settings] = await Promise.all([getReturnPolicyConfig(), Setting.get()]);
  res.json({
    success: true,
    request: { ...request, needsRefundDetails: needsRefundDetails(request), canCancel: CUSTOMER_CANCELLABLE_STATUSES.includes(request.status) && !request.reversePickup?.shipmentId },
    order,
    policy,
    refundMethods: allowedRefundMethods(settings, order),
  });
});

/** Customer withdraws a request that hasn't been picked up yet. */
export const cancelMyRequest = asyncHandler(async (req, res) => {
  const request = await customerCancelRequest(req.user._id, req.params.requestId);
  res.json({ success: true, requestId: request.requestId, status: request.status });
});

/** Refund page: where the customer wants an approved return's money to go. */
export const setMyRefundDestination = asyncHandler(async (req, res) => {
  const request = await customerSetRefundDestination(req.user._id, req.params.requestId, req.body || {});
  res.json({ success: true, requestId: request.requestId, refundMethod: request.refundMethod });
});

// ── Admin Endpoints ──────────────────────────────────────────

export const adminListReturns = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ requestId: rx }, { orderId: rx }, { 'pickupAddress.phone': rx }];
  }

  const [items, total] = await Promise.all([
    ReturnRequest.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReturnRequest.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const adminGetReturn = asyncHandler(async (req, res) => {
  const request = await ReturnRequest.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('order');
  if (!request) throw ApiError.notFound('Return request not found');
  res.json({ success: true, request });
});

export const adminUpdateReturnStatus = asyncHandler(async (req, res) => {
  const { status, note, adminNotes, adminMessage } = req.body;
  if (!RETURN_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');

  const request = await ReturnRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Return request not found');
  if (request.status === 'Cancelled') throw ApiError.badRequest('The customer cancelled this request, so it can’t be changed.');
  if (status === 'Completed' && missingRefundDestination(request, await Order.findById(request.order).select('paymentMethod').lean())) {
    throw ApiError.badRequest('This was a cash-on-delivery order and the customer hasn’t said where to send the refund yet. Add their UPI / bank details under “Where to send the refund” (or wait for them to fill the refund page), then complete it.');
  }
  const previousStatus = request.status;

  request.status = status;
  if (adminNotes !== undefined) request.adminNotes = adminNotes;
  if (adminMessage !== undefined) request.adminMessage = String(adminMessage).slice(0, 1000);
  request.statusHistory.push({
    status,
    note: note || `Status updated to ${status} by admin`,
    changedBy: req.user._id,
    at: new Date(),
  });

  if (status === 'Completed' || status === 'Rejected') {
    request.resolvedAt = new Date();
  }

  await request.save();

  // Keep order's returnExchange summary in sync
  const order = await Order.findById(request.order);
  if (order && status !== previousStatus) {
    notifyReturnDecision(request, order).catch((e) => console.error('[email] return decision failed:', e.message));
  }
  if (order) {
    if (order.returnExchange) {
      order.returnExchange.status = status;
      if (adminMessage !== undefined) {
        order.returnExchange.adminMessage = String(adminMessage).slice(0, 1000);
      }
      order.markModified('returnExchange');
    }
    if (status === 'Completed' && request.type === 'return') {
      // Mark order as Returned, then refund the returned items by the method the customer chose.
      await changeOrderStatus(order, { status: 'Returned', note: `Return request ${request.requestId} completed` }, req.user._id);
      const refunded = await refundReturnRequest(request, order);
      return res.json({ success: true, request: refunded });
    }
    await order.save();
  }

  res.json({ success: true, request });
});

/** Books the doorstep pickup with the shipping provider and stores its real response. */
export const adminSchedulePickup = asyncHandler(async (req, res) => {
  const request = await ReturnRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Return request not found');
  if (['Rejected', 'Completed'].includes(request.status)) throw ApiError.badRequest(`This request is ${request.status.toLowerCase()}`);
  if (request.reversePickup?.shipmentId) throw ApiError.badRequest('A pickup is already booked for this request');
  const order = await Order.findById(request.order);
  try {
    request.reversePickup = await createReversePickup(request, order);
  } catch (err) {
    request.reversePickup = { ...(request.reversePickup?.toObject?.() || {}), provider: 'shiprocket', error: err.message, lastSyncedAt: new Date() };
    await request.save();
    throw ApiError.badRequest(`Pickup could not be booked: ${err.message}`);
  }
  request.status = 'Pickup Scheduled';
  request.statusHistory.push({ status: 'Pickup Scheduled', note: `Doorstep pickup booked with Shiprocket${request.reversePickup.awb ? ` (AWB ${request.reversePickup.awb})` : ''}`, changedBy: req.user._id, at: new Date() });
  await request.save();
  if (order?.returnExchange) {
    order.returnExchange.status = 'Pickup Scheduled';
    order.markModified('returnExchange');
    await order.save();
  }
  res.json({ success: true, request });
});

/** Admin: an order's items and return eligibility, to create a request for the customer. */
export const adminReturnOrderLookup = asyncHandler(async (req, res) => {
  const id = String(req.params.orderId).trim();
  const order = await Order.findOne({ $or: [{ orderId: id.toUpperCase() }, { orderId: id }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])] })
    .select('orderId customerName email phone orderStatus deliveredAt createdAt items paymentMethod paymentStatus grandTotal shippingAddress')
    .lean();
  if (!order) throw ApiError.notFound('No order with that ID.');
  const existing = await ReturnRequest.find({ order: order._id }).select('requestId type status items.productId items.variantId createdAt').lean();
  res.json({ success: true, order, eligibility: computeOrderReturnEligibility(order, existing), existing });
});

/** Admin: create a return or exchange for a customer (e.g. requested on a call or by email). */
export const adminCreateReturn = asyncHandler(async (req, res) => {
  const { overrideWindow, overrideReason, adminNote, ...payload } = req.body || {};
  const result = await createReturnExchangeRequest(null, payload, { byAdmin: true, adminId: req.user._id, overrideWindow: !!overrideWindow, overrideReason, adminNote });
  res.status(201).json({ success: true, ...result });
});

/** Admin: set or correct where the refund goes (UPI / bank / original / wallet) before it is sent. */
export const adminUpdateRefundDestination = asyncHandler(async (req, res) => {
  const request = await ReturnRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Return request not found');
  if (request.refund?.status === 'Processed') throw ApiError.badRequest('This refund has already been sent.');
  if (request.refund?.providerRefundId) throw ApiError.badRequest('A gateway refund is already on its way for this request.');
  const { refundMethod, refundDetails } = cleanRefundDestination(req.body?.refundMethod, req.body?.refundDetails);
  request.refundMethod = refundMethod;
  request.refundDetails = refundDetails;
  request.refundDetailsSubmittedAt = new Date();
  if (request.refund?.status && request.refund.status !== 'None') request.refund.method = refundMethod;
  request.statusHistory.push({ status: request.status, note: `Refund destination set to ${refundMethod} by the team`, changedBy: req.user._id, at: new Date() });
  await request.save();
  res.json({ success: true, request });
});

/**
 * Manual refunds (UPI / bank transfer / COD): the admin confirms the money was sent, with the bank
 * or UPI reference (UTR). Runs once (conditional update), then the customer sees "Refund sent" with
 * that reference on their Returns page and gets an email.
 */
export const adminMarkReturnRefunded = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Return request not found');
  const reference = String(req.body?.reference ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!/^[A-Za-z0-9][A-Za-z0-9 \-/_.]{3,59}$/.test(reference)) {
    throw ApiError.badRequest('Enter the UTR / transaction reference of the transfer (at least 4 letters or numbers), so the customer can match it in their bank app.');
  }
  const request = await ReturnRequest.findOneAndUpdate(
    { _id: req.params.id, type: 'return', 'refund.status': { $in: ['Pending', 'Failed'] }, 'refund.providerRefundId': { $in: [null, ''] } },
    {
      $set: { 'refund.status': 'Processed', 'refund.processedAt': new Date(), 'refund.failureReason': '', 'refund.reference': reference },
      $push: { statusHistory: { status: 'Completed', note: `Refund sent (ref ${reference})`, changedBy: req.user._id, at: new Date() } },
    },
    { returnDocument: 'after' }
  );
  if (!request) throw ApiError.badRequest('There is no pending manual refund on this request (it may already be confirmed).');
  notifyRefundSent(request).catch((e) => console.error('[email] refund sent notice failed:', e.message));
  res.json({ success: true, request });
});
