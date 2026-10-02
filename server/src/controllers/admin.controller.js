import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import { CorporateEnquiry, ContactEnquiry } from '../models/Enquiry.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex, paginated, parsePagination, round2 } from '../utils/helpers.js';
import env from '../config/env.js';

// Orders that count toward revenue.
const REVENUE_MATCH = { orderStatus: { $nin: ['Cancelled', 'Returned'] } };
const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function revenueBetween(from, to) {
  const [row] = await Order.aggregate([
    { $match: { ...REVENUE_MATCH, createdAt: { $gte: from, $lt: to } } },
    { $group: { _id: null, revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
  ]);
  return { revenue: round2(row?.revenue || 0), orders: row?.orders || 0 };
}

const pctChange = (now, prev) => (prev ? round2(((now - prev) / prev) * 100) : now ? 100 : 0);

export const dashboard = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const now = new Date();
  const periodStart = startOfDay(new Date(now.getTime() - (days - 1) * DAY));
  const prevStart = new Date(periodStart.getTime() - days * DAY);

  const [current, previous, newCustomers, prevCustomers, daily, statusBreakdown, recentOrders, lowStock, topProducts, pending, enquiries, notifFailures, totals] =
    await Promise.all([
      revenueBetween(periodStart, now),
      revenueBetween(prevStart, periodStart),
      User.countDocuments({ role: 'customer', createdAt: { $gte: periodStart } }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: prevStart, $lt: periodStart } }),
      Order.aggregate([
        { $match: { ...REVENUE_MATCH, createdAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
            revenue: { $sum: '$grandTotal' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.find().sort({ createdAt: -1 }).limit(6).select('orderId customerName grandTotal orderStatus paymentStatus paymentMethod createdAt items'),
      Product.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] } })
        .select('name slug sku stock lowStockThreshold images variants.name variants.stock variants.sku')
        .sort({ stock: 1 })
        .limit(6),
      Order.aggregate([
        { $match: { ...REVENUE_MATCH, createdAt: { $gte: periodStart } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.productName' },
            image: { $first: '$items.image' },
            units: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.totalPrice' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Order.countDocuments({ orderStatus: 'Pending' }),
      Promise.all([
        CorporateEnquiry.countDocuments({ status: 'new' }),
        ContactEnquiry.countDocuments({ status: 'new' }),
      ]),
      Notification.countDocuments({ status: 'failed' }),
      Promise.all([Product.countDocuments(), User.countDocuments({ role: 'customer' }), Order.countDocuments(), Review.countDocuments()]),
    ]);

  // Fill gaps so the chart has one point per day.
  const byDay = new Map(daily.map((d) => [d._id, d]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(periodStart.getTime() + i * DAY);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const row = byDay.get(key);
    return { date: key, revenue: round2(row?.revenue || 0), orders: row?.orders || 0 };
  });

  const aov = current.orders ? round2(current.revenue / current.orders) : 0;
  const prevAov = previous.orders ? round2(previous.revenue / previous.orders) : 0;

  res.json({
    success: true,
    days,
    kpis: {
      revenue: { value: current.revenue, change: pctChange(current.revenue, previous.revenue) },
      orders: { value: current.orders, change: pctChange(current.orders, previous.orders) },
      aov: { value: aov, change: pctChange(aov, prevAov) },
      customers: { value: newCustomers, change: pctChange(newCustomers, prevCustomers) },
    },
    series,
    statusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
    recentOrders,
    lowStock,
    topProducts,
    alerts: {
      pendingOrders: pending,
      newCorporate: enquiries[0],
      newContact: enquiries[1],
      failedNotifications: notifFailures,
      whatsappConfigured: env.whatsapp.enabled,
      cloudinaryConfigured: env.cloudinary.enabled,
    },
    totals: { products: totals[0], customers: totals[1], orders: totals[2], reviews: totals[3] },
  });
});

export const analytics = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, Number(req.query.days) || 90));
  const since = startOfDay(new Date(Date.now() - (days - 1) * DAY));
  const match = { ...REVENUE_MATCH, createdAt: { $gte: since } };

  const [byCategory, byPayment, byCountry, byWeekday, couponUse, funnel] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'p' } },
      { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'p.subcategory', foreignField: '_id', as: 'c' } },
      { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$c.name', 'Other'] }, revenue: { $sum: '$items.totalPrice' }, units: { $sum: '$items.quantity' } } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$paymentMethod', revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: '$shippingAddress.country', revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: { $dayOfWeek: { date: '$createdAt', timezone: 'Asia/Kolkata' } }, orders: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { ...match, 'coupon.code': { $exists: true, $ne: null } } },
      { $group: { _id: '$coupon.code', orders: { $sum: 1 }, discount: { $sum: '$discount' }, revenue: { $sum: '$grandTotal' } } },
      { $sort: { orders: -1 } },
    ]),
    Order.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
  ]);

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  res.json({
    success: true,
    days,
    byCategory: byCategory.map((r) => ({ name: r._id, revenue: round2(r.revenue), units: r.units })),
    byPayment: byPayment.map((r) => ({ method: r._id, revenue: round2(r.revenue), orders: r.orders })),
    byCountry: byCountry.map((r) => ({ country: r._id, revenue: round2(r.revenue), orders: r.orders })),
    byWeekday: WEEKDAYS.map((name, i) => {
      const row = byWeekday.find((w) => w._id === i + 1);
      return { day: name, orders: row?.orders || 0, revenue: round2(row?.revenue || 0) };
    }),
    coupons: couponUse.map((c) => ({ code: c._id, orders: c.orders, discount: round2(c.discount), revenue: round2(c.revenue) })),
    statusFunnel: funnel.map((f) => ({ status: f._id, count: f.count })),
  });
});

// ── Customers ────────────────────────────────────────────────

export const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'blocked') filter.isActive = false;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { 'phone.number': rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).select('-addresses -recentlyViewed').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  const stats = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, ...REVENUE_MATCH } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$grandTotal' }, lastOrder: { $max: '$createdAt' } } },
  ]);
  const byUser = new Map(stats.map((s) => [s._id.toString(), s]));
  const items = users.map((u) => {
    const s = byUser.get(u._id.toString());
    return { ...u.toJSON(), orders: s?.orders || 0, spent: round2(s?.spent || 0), lastOrder: s?.lastOrder || null };
  });
  res.json({ success: true, ...paginated(items, total, page, limit) });
});

export const getCustomer = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Customer not found');
  const [orders, reviews] = await Promise.all([
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).select('orderId grandTotal orderStatus paymentStatus createdAt'),
    Review.find({ user: user._id }).populate('product', 'name slug').sort({ createdAt: -1 }).limit(10),
  ]);
  const spent = orders.filter((o) => !['Cancelled', 'Returned'].includes(o.orderStatus)).reduce((s, o) => s + o.grandTotal, 0);
  res.json({ success: true, customer: user, orders, reviews, stats: { orders: orders.length, spent: round2(spent) } });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { isActive, role } = req.body;
  if (String(req.params.id) === String(req.user._id) && (isActive === false || role === 'customer')) {
    throw ApiError.badRequest('You cannot deactivate or demote your own admin account');
  }
  const update = {};
  if (typeof isActive === 'boolean') update.isActive = isActive;
  if (['customer', 'admin'].includes(role)) update.role = role;
  const user = await User.findByIdAndUpdate(req.params.id, { ...update, $inc: { tokenVersion: isActive === false ? 1 : 0 } }, { returnDocument: 'after' });
  if (!user) throw ApiError.notFound('Customer not found');
  res.json({ success: true, customer: user });
});

// ── Inventory ────────────────────────────────────────────────

export const inventorySummary = asyncHandler(async (req, res) => {
  const [row] = await Product.aggregate([
    {
      $group: {
        _id: null,
        products: { $sum: 1 },
        units: { $sum: '$stock' },
        value: { $sum: { $multiply: ['$stock', '$finalPrice'] } },
        outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
        lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } },
      },
    },
  ]);
  res.json({
    success: true,
    summary: {
      products: row?.products || 0,
      units: row?.units || 0,
      value: round2(row?.value || 0),
      outOfStock: row?.outOfStock || 0,
      lowStock: row?.lowStock || 0,
    },
  });
});

// ── Notifications log ────────────────────────────────────────

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Notification.find(filter).populate('order', 'orderId').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit), whatsappConfigured: env.whatsapp.enabled, adminNumber: env.whatsapp.adminNumber });
});
