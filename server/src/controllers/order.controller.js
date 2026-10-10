import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import Setting from '../models/Setting.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination } from '../utils/helpers.js';
import {
  placeOrder,
  initiateOnlinePayment,
  changeOrderStatus,
  cancelByCustomer,
  approveOrder,
  dispatchInvoice,
  verifyOrderPayment,
  retryOrderPayment,
  handleRazorpayWebhook,
} from '../services/order.service.js';
import { verifyRazorpayWebhookSignature } from '../services/payment.service.js';
import { deliver, buildInvoiceCaption } from '../services/whatsapp.service.js';
import { buildInvoiceCoverEmail } from '../services/invoice-email.template.js';
import { generateInvoicePdfBuffer, invoiceFileName, getInvoiceToken } from '../services/pdf-invoice.service.js';
import env from '../config/env.js';

function findQuery(idOrOrderId) {
  return mongoose.isValidObjectId(idOrOrderId) ? { _id: idOrOrderId } : { orderId: idOrOrderId };
}

// ── Customer ─────────────────────────────────────────────────

export const initiatePayment = asyncHandler(async (req, res) => {
  const result = await initiateOnlinePayment(req.user._id, req.body);
  res.json({ success: true, ...result });
});

export const createOrder = asyncHandler(async (req, res) => {
  const result = await placeOrder(req.user._id, req.body);
  const order = result.order || result;
  const payment = result.payment || null;
  res.status(201).json({ success: true, order, payment });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const order = await verifyOrderPayment(req.params.id, {
    razorpayOrderId: req.body.razorpayOrderId,
    razorpayPaymentId: req.body.razorpayPaymentId,
    razorpaySignature: req.body.razorpaySignature,
    userId: req.user._id,
  });
  res.json({ success: true, order });
});

export const retryPayment = asyncHandler(async (req, res) => {
  const { order, payment } = await retryOrderPayment(req.params.id, req.user._id);
  res.json({ success: true, order, payment });
});

export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (env.razorpay.webhookSecret && signature) {
    const raw = req.rawBody || JSON.stringify(req.body);
    const valid = verifyRazorpayWebhookSignature(raw, signature);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
  }
  const result = await handleRazorpayWebhook(req.body);
  res.json({ success: true, result });
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

/** Recipients the admin typed in the dispatch dialog (blank → the order's own email / phone). */
const recipientsFrom = (body = {}) => ({
  email: body.email === false ? false : String(body.email || '').trim() || undefined,
  phone: body.phone === false ? false : String(body.phone || '').trim() || undefined,
});

/** Approve (Pending → Confirmed) and send the Tax Invoice PDF to the customer's email and WhatsApp. */
export const adminApproveOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id));
  if (!order) throw ApiError.notFound('Order not found');
  const result = await approveOrder(order, req.user._id, recipientsFrom(req.body));
  res.json({ success: true, ...result });
});

/** Sends only the email with the Tax Invoice PDF attached. */
export const adminSendInvoiceEmail = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id));
  if (!order) throw ApiError.notFound('Order not found');
  const { email = order.email } = recipientsFrom(req.body);
  if (!email) throw ApiError.badRequest('Please enter the customer email address');
  const delivery = await dispatchInvoice(order, await Setting.get(), { email, phone: false });
  if (delivery.email.status === 'failed') throw ApiError.badRequest(`Email could not be sent: ${delivery.email.error}`);
  res.json({ success: true, message: `Tax Invoice PDF emailed to ${email}`, delivery });
});

/** Sends only the WhatsApp document with the Tax Invoice PDF. */
export const adminSendInvoiceWhatsApp = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id));
  if (!order) throw ApiError.notFound('Order not found');
  const { phone = order.shippingAddress?.phone || order.phone } = recipientsFrom(req.body);
  if (!phone) throw ApiError.badRequest('Please enter the customer WhatsApp number');
  const delivery = await dispatchInvoice(order, await Setting.get(), { email: false, phone });
  const sent = delivery.whatsapp.status === 'sent';
  res.json({
    success: true,
    message: sent ? `Tax Invoice PDF sent on WhatsApp to ${phone}` : 'WhatsApp API is not set up - share the PDF from this device',
    delivery,
    whatsappLink: delivery.whatsappLink,
  });
});

/** What the admin preview dialog shows next to the PDF: the WhatsApp caption and the covering email. */
export const adminGetInvoicePreview = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id));
  if (!order) throw ApiError.notFound('Order not found');
  const settings = await Setting.get();
  const fileName = invoiceFileName(order);
  const { subject, html } = buildInvoiceCoverEmail(order, settings, fileName);
  res.json({
    success: true,
    orderId: order.orderId,
    fileName,
    customerEmail: order.email,
    customerPhone: order.shippingAddress?.phone || order.phone || '',
    waCaption: buildInvoiceCaption(order, settings),
    email: { subject, html },
    // false → there is no WhatsApp Cloud API, so the admin shares the PDF from their own WhatsApp.
    whatsappAutoSend: env.whatsapp.enabled,
  });
});

async function sendPdf(res, order, disposition) {
  const pdf = await generateInvoicePdfBuffer(order, await Setting.get());
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${invoiceFileName(order)}"`);
  res.setHeader('Content-Length', pdf.length);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(pdf);
}

/** Customer's own Tax Invoice PDF (signed in, token link from WhatsApp/Email, or admins). */
export const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const token = req.query.token;
  if (token) {
    const order = await Order.findOne(findQuery(req.params.id));
    if (!order) throw ApiError.notFound('Order not found');
    if (token !== getInvoiceToken(order)) {
      throw ApiError.unauthorized('Invalid or expired invoice link');
    }
    return await sendPdf(res, order, req.query.download ? 'attachment' : 'inline');
  }

  if (!req.user) throw ApiError.unauthorized();
  const owner = req.user.role === 'admin' ? {} : { user: req.user._id };
  const order = await Order.findOne({ ...findQuery(req.params.id), ...owner });
  if (!order) throw ApiError.notFound('Order not found');
  await sendPdf(res, order, req.query.download ? 'attachment' : 'inline');
});

/** Admin Tax Invoice PDF: shown in the preview dialog (?download=1 saves it instead). */
export const adminDownloadInvoicePdf = asyncHandler(async (req, res) => {
  const order = await Order.findOne(findQuery(req.params.id));
  if (!order) throw ApiError.notFound('Order not found');
  await sendPdf(res, order, req.query.download ? 'attachment' : 'inline');
});
