import mongoose from 'mongoose';
import ReturnRequest, { RETURN_STATUSES, RETURN_REASONS } from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, paginated } from '../utils/helpers.js';
import {
  getReturnPolicyConfig,
  getOrdersWithReturnStatus,
  createReturnExchangeRequest,
  computeOrderReturnEligibility,
} from '../services/return.service.js';
import { changeOrderStatus } from '../services/order.service.js';

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

  const existingRequests = await ReturnRequest.find({
    order: order._id,
    status: { $in: ['Requested', 'Approved', 'Pickup Scheduled', 'In Inspection', 'Completed'] },
  }).lean();
  const eligibility = computeOrderReturnEligibility(order, existingRequests);
  res.json({ success: true, orderId: order.orderId, eligibility });
});

export const submitRequest = asyncHandler(async (req, res) => {
  const result = await createReturnExchangeRequest(req.user._id, req.body);
  res.status(201).json({ success: true, ...result });
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
  const { status, note, adminNotes } = req.body;
  if (!RETURN_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');

  const request = await ReturnRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound('Return request not found');

  request.status = status;
  if (adminNotes !== undefined) request.adminNotes = adminNotes;
  request.statusHistory.push({
    status,
    note: note || `Status updated to ${status} by admin`,
    changedBy: req.user._id,
    at: new Date(),
  });

  if (status === 'Completed') {
    request.resolvedAt = new Date();
  }

  await request.save();

  // Keep order's returnExchange summary in sync
  const order = await Order.findById(request.order);
  if (order) {
    if (order.returnExchange) {
      order.returnExchange.status = status;
      order.markModified('returnExchange');
    }
    if (status === 'Completed' && request.type === 'return') {
      // Mark order as Returned
      await changeOrderStatus(order, { status: 'Returned', note: `Return request ${request.requestId} completed` }, req.user._id);
    } else {
      await order.save();
    }
  }

  res.json({ success: true, request });
});
