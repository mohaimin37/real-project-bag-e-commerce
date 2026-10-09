import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';
import { placeOrder, changeOrderStatus, cancelByCustomer, approveOrder } from '../services/order.service.js';
import { deliver } from '../services/whatsapp.service.js';

function findQuery(idOrOrderId) {
  return mongoose.isValidObjectId(idOrOrderId) ? { _id: idOrOrderId } : { orderId: idOrOrderId };
}

// ── Customer ─────────────────────────────────────────────────

export const createOrder = asyncHandler(async (req, res) => {
  const order = await placeOrder(req.user._id, req.body);
  res.status(201).json({ success: true, order });
});

export const myOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
  const filter = { user: req.user._id };
  // Tabs in "My orders": in progress / delivered / cancelled & returned.
  const groups = {
    active: ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery'],
    delivered: ['Delivered'],
    cancelled: ['Cancelled', 'Returned'],
  };
  if (groups[req.query.group]) filter.orderStatus = { $in: groups[req.query.group] };
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ orderId: rx }, { 'items.productName': rx }];
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const myOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ ...findQuery(req.params.id), user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, order });
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ ...findQuery(req.params.id), user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  await cancelByCustomer(order, req.user._id, String(req.body?.reason || '').slice(0, 300));
  res.json({ success: true, order });
});

// ── Admin ────────────────────────────────────────────────────

export const adminListOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.status) filter.orderStatus = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.user && mongoose.isValidObjectId(req.query.user)) filter.user = req.query.user;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ orderId: rx }, { customerName: rx }, { email: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id))
    .populate('user', 'name email phone createdAt')
    .populate('statusHistory.changedBy', 'name');
  if (!order) throw ApiError.notFound('Order not found');
  const notifications = await Notification.find({ order: order._id }).sort({ createdAt: -1 });
  res.json({ success: true, order, notifications });
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id));
  if (!order) throw ApiError.notFound('Order not found');
  await changeOrderStatus(order, req.body, req.user._id);
  res.json({ success: true, order });
});

export const adminUpdatePayment = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(findQuery(req.params.id), { paymentStatus: req.body.paymentStatus }, { returnDocument: 'after' });
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, order });
});

export const adminResendNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.notificationId);
  if (!notification) throw ApiError.notFound('Notification not found');
  await deliver(notification);
  res.json({ success: true, notification });
});

export const adminApproveOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id));
  if (!order) throw ApiError.notFound('Order not found');
  const result = await approveOrder(order, req.user._id);
  res.json({ success: true, ...result });
});
