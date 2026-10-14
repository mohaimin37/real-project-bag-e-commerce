import Order from '../models/Order.js';
import ReturnRequest from '../models/ReturnRequest.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parsePagination, paginated } from '../utils/helpers.js';

/**
 * Admin → Payments: who paid how much, what was refunded and what still has to be sent.
 *
 * Amounts per order (₹):
 * - paid: what the customer actually handed over — the online/COD payment once it is Paid (or later
 *   refunded), plus anything paid by gift card or WILDTANE Wallet.
 * - refunded: processed refund parts of a cancelled order + processed refunds of its returns.
 */
const PAID_STATES = ['Paid', 'Partially Refunded', 'Refunded'];

const paidExpr = {
  $add: [
    { $cond: [{ $in: ['$paymentStatus', PAID_STATES] }, { $ifNull: ['$grandTotal', 0] }, 0] },
    { $ifNull: ['$giftCard.amount', 0] },
    { $ifNull: ['$walletAmount', 0] },
  ],
};
const orderRefundedExpr = {
  $reduce: {
    input: { $ifNull: ['$refundDetails.parts', []] },
    initialValue: 0,
    in: { $add: ['$$value', { $cond: [{ $eq: ['$$this.status', 'Processed'] }, '$$this.amount', 0] }] },
  },
};

function orderFilter(q) {
  const f = {};
  if (q.method) f.paymentMethod = q.method;
  if (q.status) f.paymentStatus = q.status;
  if (q.from || q.to) {
    f.createdAt = {};
    if (q.from) f.createdAt.$gte = new Date(q.from);
    if (q.to) f.createdAt.$lte = new Date(`${q.to}T23:59:59.999Z`);
  }
  if (q.q) {
    const rx = new RegExp(String(q.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = [{ orderId: rx }, { customerName: rx }, { email: rx }, { phone: rx }, { paymentReference: rx }, { 'paymentDetails.razorpayPaymentId': rx }];
  }
  return f;
}

/** Processed return refunds per order id. */
async function returnRefundsByOrder(orderIds) {
  if (!orderIds.length) return new Map();
  const rows = await ReturnRequest.aggregate([
    { $match: { order: { $in: orderIds }, 'refund.status': 'Processed' } },
    { $group: { _id: '$order', amount: { $sum: '$refund.amount' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.amount]));
}

export const summary = asyncHandler(async (req, res) => {
  const match = orderFilter(req.query);
  const [o] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        collected: { $sum: paidExpr },
        online: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentMethod', 'razorpay'] }, { $in: ['$paymentStatus', PAID_STATES] }] }, '$grandTotal', 0] } },
        cod: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentMethod', 'cod'] }, { $in: ['$paymentStatus', PAID_STATES] }] }, '$grandTotal', 0] } },
        codDue: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentMethod', 'cod'] }, { $eq: ['$paymentStatus', 'Pending'] }, { $ne: ['$orderStatus', 'Cancelled'] }] }, '$grandTotal', 0] } },
        refundedOrders: { $sum: orderRefundedExpr },
        failed: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Failed'] }, 1, 0] } },
      },
    },
  ]);
  const ret = await ReturnRequest.aggregate([
    { $match: { 'refund.status': { $in: ['Processed', 'Pending', 'Failed'] } } },
    { $group: { _id: '$refund.status', amount: { $sum: '$refund.amount' }, n: { $sum: 1 } } },
  ]);
  const r = Object.fromEntries(ret.map((x) => [x._id, x]));
  const held = await Order.aggregate([
    { $match: { orderStatus: 'Cancelled', 'refundDetails.status': { $in: ['Awaiting approval', 'Failed'] } } },
    { $group: { _id: null, amount: { $sum: '$refundDetails.amount' }, n: { $sum: 1 } } },
  ]);
  const s = o || { orders: 0, collected: 0, online: 0, cod: 0, codDue: 0, refundedOrders: 0, failed: 0 };
  const refunded = s.refundedOrders + (r.Processed?.amount || 0);
  res.json({
    success: true,
    summary: {
      orders: s.orders,
      collected: s.collected,
      online: s.online,
      cod: s.cod,
      codDue: s.codDue,
      refunded,
      net: s.collected - refunded,
      failedPayments: s.failed,
      toSend: {
        count: (r.Pending?.n || 0) + (r.Failed?.n || 0) + (held[0]?.n || 0),
        amount: (r.Pending?.amount || 0) + (r.Failed?.amount || 0) + (held[0]?.amount || 0),
      },
    },
  });
});

/** Every order with what was paid, how, and what was refunded. */
export const transactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const match = orderFilter(req.query);
  const [items, total] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          orderId: 1, customerName: 1, email: 1, phone: 1, user: 1, createdAt: 1, orderStatus: 1,
          paymentMethod: 1, paymentStatus: 1, grandTotal: 1, walletAmount: 1, 'giftCard.amount': 1,
          reference: { $ifNull: ['$paymentDetails.razorpayPaymentId', '$paymentReference'] },
          refundStatus: '$refundDetails.status',
          paid: paidExpr,
          refunded: orderRefundedExpr,
        },
      },
    ]),
    Order.countDocuments(match),
  ]);
  const ret = await returnRefundsByOrder(items.map((i) => i._id));
  for (const i of items) i.refunded += ret.get(String(i._id)) || 0;
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

/** Per customer: orders, total paid, refunded and net. */
export const byCustomer = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const match = orderFilter(req.query);
  const base = [
    { $match: match },
    {
      $group: {
        _id: '$user',
        name: { $last: '$customerName' },
        email: { $last: '$email' },
        phone: { $last: '$phone' },
        orders: { $sum: 1 },
        paid: { $sum: paidExpr },
        refundedOrders: { $sum: orderRefundedExpr },
        codDue: { $sum: { $cond: [{ $and: [{ $eq: ['$paymentMethod', 'cod'] }, { $eq: ['$paymentStatus', 'Pending'] }, { $ne: ['$orderStatus', 'Cancelled'] }] }, '$grandTotal', 0] } },
        lastOrder: { $max: '$createdAt' },
        orderIds: { $push: '$_id' },
      },
    },
  ];
  const [rows, count] = await Promise.all([
    Order.aggregate([...base, { $sort: { paid: -1, lastOrder: -1 } }, { $skip: skip }, { $limit: limit }]),
    Order.aggregate([...base, { $count: 'n' }]),
  ]);
  const ret = await returnRefundsByOrder(rows.flatMap((r) => r.orderIds));
  const items = rows.map(({ orderIds, refundedOrders, ...r }) => {
    const refunded = refundedOrders + orderIds.reduce((n, id) => n + (ret.get(String(id)) || 0), 0);
    return { ...r, refunded, net: r.paid - refunded };
  });
  res.json({ success: true, ...paginated(items, count[0]?.n || 0, page, limit) });
});

/**
 * Refunds the team still has to send: return refunds by UPI / bank / COD (with the customer's
 * payout details), failed gateway refunds, and cancelled orders awaiting approval.
 */
export const refundQueue = asyncHandler(async (req, res) => {
  const [returns, orders] = await Promise.all([
    ReturnRequest.find({ 'refund.status': { $in: ['Pending', 'Failed'] } })
      .populate('user', 'name email phone')
      .sort({ 'refund.initiatedAt': 1 })
      .select('requestId orderId user type refund refundMethod refundDetails status createdAt')
      .lean(),
    Order.find({ orderStatus: 'Cancelled', 'refundDetails.status': { $in: ['Awaiting approval', 'Failed', 'Pending'] } })
      .sort({ updatedAt: 1 })
      .select('orderId customerName email phone paymentMethod grandTotal refundDetails cancellation updatedAt')
      .lean(),
  ]);
  res.json({
    success: true,
    returns: returns.map((r) => ({ ...r, kind: 'return' })),
    orders: orders.map((o) => ({ ...o, kind: 'order' })),
  });
});

