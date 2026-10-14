import crypto from 'crypto';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { moveWallet } from '../services/wallet.service.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { CorporateEnquiry, ContactEnquiry, Subscriber } from '../models/Enquiry.js';
import Wishlist from '../models/Wishlist.js';
import Cart from '../models/Cart.js';
import CoinTransaction from '../models/CoinTransaction.js';
import ReturnRequest from '../models/ReturnRequest.js';
import { moveCoins } from '../services/coin.service.js';
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

  const [current, previous, newCustomers, prevCustomers, daily, statusBreakdown, recentOrders, lowStock, topProducts, pending, enquiries, notifFailures, totals, pendingReturns, lowStockCount] =
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
        Review.countDocuments({ status: 'pending' }),
        Comment.countDocuments({ status: 'pending' }),
      ]),
      Notification.countDocuments({ status: 'failed' }),
      Promise.all([Product.countDocuments(), User.countDocuments({ role: 'customer' }), Order.countDocuments(), Review.countDocuments()]),
      ReturnRequest.countDocuments({ status: { $in: ['Requested', 'Approved', 'Picked Up', 'Processing'] } }),
      Product.countDocuments({ $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
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
      pendingReturns: pendingReturns || 0,
      // Return refunds to send by hand + cancelled orders whose refund is held or failed.
      refundsToSend:
        (await ReturnRequest.countDocuments({ 'refund.status': { $in: ['Pending', 'Failed'] }, 'refund.providerRefundId': { $in: [null, ''] } })) +
        (await Order.countDocuments({ orderStatus: 'Cancelled', 'refundDetails.status': { $in: ['Awaiting approval', 'Failed'] } })),
      lowStock: lowStockCount || 0,
      newCorporate: enquiries[0],
      newContact: enquiries[1],
      pendingReviews: enquiries[2],
      pendingComments: enquiries[3],
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
  const [orders, reviews, coinHistory] = await Promise.all([
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20).select('orderId grandTotal orderStatus paymentStatus createdAt'),
    Review.find({ user: user._id }).populate('product', 'name slug').sort({ createdAt: -1 }).limit(10),
    CoinTransaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(30).populate('by', 'name').lean(),
  ]);
  const spent = orders.filter((o) => !['Cancelled', 'Returned'].includes(o.orderStatus)).reduce((s, o) => s + o.grandTotal, 0);
  res.json({ success: true, customer: user, orders, reviews, coinHistory, stats: { orders: orders.length, spent: round2(spent) } });
});

/**
 * Customer board: one card per person with everything they have given or done —
 * profile, orders, messages (contact + corporate), reviews, wishlist, cart, newsletter
 * and a short activity timeline. People who messaged without an account come back as guests.
 * Sorted by most recent activity. Built for small/medium stores (up to 1,000 accounts scanned).
 */
export const customerBoard = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 24, maxLimit: 60 });
  const filter = { role: 'customer' };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { 'phone.number': rx }];
  }
  const users = await User.find(filter)
    .select('name email phone country avatar isActive createdAt lastLoginAt addresses recentlyViewed coins')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  const ids = users.map((u) => u._id);
  const emails = users.map((u) => u.email);
  const msgFilter = (extra = {}) => ({ $or: [{ user: { $in: ids } }, { email: { $in: emails } }], ...extra });

  const [orders, contacts, corporate, reviews, wishlists, carts, subs] = await Promise.all([
    Order.find({ user: { $in: ids } }).select('user orderId grandTotal orderStatus createdAt items').sort({ createdAt: -1 }).lean(),
    ContactEnquiry.find(msgFilter()).select('user email name subject message status createdAt orderId').sort({ createdAt: -1 }).lean(),
    CorporateEnquiry.find(msgFilter()).select('user email company productType quantity message status createdAt').sort({ createdAt: -1 }).lean(),
    Review.find({ user: { $in: ids } }).select('user product rating title comment status createdAt').populate('product', 'name slug').sort({ createdAt: -1 }).lean(),
    Wishlist.find({ user: { $in: ids } }).select('user products').lean(),
    Cart.find({ user: { $in: ids } }).select('user items updatedAt').populate('items.product', 'name finalPrice').lean(),
    Subscriber.find({ email: { $in: emails } }).select('email createdAt').lean(),
  ]);

  const group = (rows, keyOf) => rows.reduce((m, r) => m.set(keyOf(r), [...(m.get(keyOf(r)) || []), r]), new Map());
  const byUser = (rows) => group(rows, (r) => String(r.user));
  const emailToId = new Map(users.map((u) => [u.email, String(u._id)]));
  const msgOwner = (m) => (m.user ? String(m.user) : emailToId.get(m.email));
  const ordersBy = byUser(orders);
  const reviewsBy = byUser(reviews);
  const contactsBy = group(contacts, msgOwner);
  const corporateBy = group(corporate, msgOwner);
  const wishBy = new Map(wishlists.map((w) => [String(w.user), w.products.length]));
  const cartBy = new Map(carts.map((c) => [String(c.user), c]));
  const subscribed = new Map(subs.map((s) => [s.email, s.createdAt]));
  const OPEN = ['new', 'read'];
  const PAID_OUT = ['Cancelled', 'Returned'];

  let cards = users.map((u) => {
    const id = String(u._id);
    const o = ordersBy.get(id) || [];
    const msgs = [
      ...(contactsBy.get(id) || []).map((m) => ({ _id: m._id, kind: 'contact', title: m.subject, text: m.message, status: m.status, at: m.createdAt, orderId: m.orderId || '' })),
      ...(corporateBy.get(id) || []).map((m) => ({ _id: m._id, kind: 'corporate', title: `${m.company} · ${m.quantity} × ${m.productType}`, text: m.message, status: m.status, at: m.createdAt })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at));
    const r = reviewsBy.get(id) || [];
    const cart = cartBy.get(id);
    const cartItems = (cart?.items || []).filter((i) => i.product);
    const cartUnits = cartItems.reduce((s, i) => s + i.quantity, 0);
    const def = u.addresses?.find((a) => a.isDefault) || u.addresses?.[0];
    const activity = [
      { type: 'joined', text: 'Created an account', at: u.createdAt },
      ...(u.lastLoginAt ? [{ type: 'login', text: 'Signed in', at: u.lastLoginAt }] : []),
      ...o.slice(0, 3).map((x) => ({ type: 'order', text: `Ordered ${x.orderId} · ${x.orderStatus}`, at: x.createdAt })),
      ...msgs.slice(0, 3).map((m) => ({ type: 'message', text: `${m.kind === 'corporate' ? 'Bulk enquiry' : 'Message'}: ${m.title}`, at: m.at })),
      ...r.slice(0, 2).map((x) => ({ type: 'review', text: `Reviewed ${x.product?.name || 'a product'} · ${x.rating}★`, at: x.createdAt })),
      ...(cart?.updatedAt && cartUnits ? [{ type: 'cart', text: `Bag updated (${cartUnits} item${cartUnits === 1 ? '' : 's'})`, at: cart.updatedAt }] : []),
    ].sort((a, b) => new Date(b.at) - new Date(a.at));
    const valid = o.filter((x) => !PAID_OUT.includes(x.orderStatus));
    return {
      _id: id,
      name: u.name,
      email: u.email,
      phone: u.phone?.number ? `${u.phone.dialCode} ${u.phone.number}` : '',
      country: u.country,
      avatar: u.avatar?.url || '',
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
      address: def ? { city: def.city, state: def.state, postalCode: def.postalCode, country: def.country } : null,
      addressCount: u.addresses?.length || 0,
      orders: {
        count: o.length,
        spent: round2(valid.reduce((s, x) => s + x.grandTotal, 0)),
        open: o.filter((x) => !['Delivered', ...PAID_OUT].includes(x.orderStatus)).length,
        latest: o[0] ? { orderId: o[0].orderId, status: o[0].orderStatus, total: o[0].grandTotal, at: o[0].createdAt, items: o[0].items?.length || 0 } : null,
      },
      messages: { count: msgs.length, unread: msgs.filter((m) => m.status === 'new').length, open: msgs.filter((m) => OPEN.includes(m.status)).length, latest: msgs.slice(0, 2) },
      reviews: { count: r.length, latest: r[0] ? { rating: r[0].rating, product: r[0].product?.name || '', slug: r[0].product?.slug || '', text: r[0].comment, status: r[0].status } : null },
      wishlist: wishBy.get(id) || 0,
      coins: u.coins || 0,
      cart: { items: cartUnits, value: round2(cartItems.reduce((s, i) => s + i.quantity * (i.product.finalPrice || 0), 0)), names: cartItems.slice(0, 3).map((i) => i.product.name) },
      viewed: u.recentlyViewed?.length || 0,
      subscribedAt: subscribed.get(u.email) || null,
      activity: activity.slice(0, 5),
      lastActive: activity[0]?.at || u.createdAt,
    };
  });

  const show = req.query.show;
  if (show === 'unread') cards = cards.filter((c) => c.messages.unread > 0);
  if (show === 'orders') cards = cards.filter((c) => c.orders.count > 0);
  if (show === 'open-orders') cards = cards.filter((c) => c.orders.open > 0);
  if (show === 'cart') cards = cards.filter((c) => c.cart.items > 0 && c.orders.open === 0);
  if (show === 'blocked') cards = cards.filter((c) => !c.isActive);
  cards.sort((a, b) => b.messages.unread - a.messages.unread || new Date(b.lastActive) - new Date(a.lastActive));

  // Guests: messages from emails that don't belong to an account.
  const known = new Set(emails);
  const guestFilter = { user: null, email: { $nin: [...known] } };
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    guestFilter.$or = [{ email: rx }, { name: rx }, { contactPerson: rx }];
  }
  const [gContacts, gCorporate] = await Promise.all([
    ContactEnquiry.find(guestFilter).select('email name phone subject message status createdAt').sort({ createdAt: -1 }).limit(300).lean(),
    CorporateEnquiry.find({ ...guestFilter, ...(guestFilter.$or ? { $or: guestFilter.$or.filter((c) => !('name' in c)) } : {}) })
      .select('email contactPerson phone company productType quantity message status createdAt')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean(),
  ]);
  const guestMap = new Map();
  const addGuest = (email, name, phone, msg) => {
    const g = guestMap.get(email) || { email, name, phone, messages: [] };
    g.name ||= name;
    g.phone ||= phone;
    g.messages.push(msg);
    guestMap.set(email, g);
  };
  gContacts.forEach((m) => addGuest(m.email, m.name, m.phone, { _id: m._id, kind: 'contact', title: m.subject, text: m.message, status: m.status, at: m.createdAt }));
  gCorporate.forEach((m) => addGuest(m.email, m.contactPerson, m.phone, { _id: m._id, kind: 'corporate', title: `${m.company} · ${m.quantity} × ${m.productType}`, text: m.message, status: m.status, at: m.createdAt }));
  let guests = [...guestMap.values()].map((g) => {
    const msgs = g.messages.sort((a, b) => new Date(b.at) - new Date(a.at));
    return { ...g, messages: { count: msgs.length, unread: msgs.filter((m) => m.status === 'new').length, latest: msgs.slice(0, 2) }, lastActive: msgs[0].at };
  });
  if (show === 'unread') guests = guests.filter((g) => g.messages.unread > 0);
  if (['orders', 'open-orders', 'cart', 'blocked'].includes(show)) guests = [];
  guests.sort((a, b) => b.messages.unread - a.messages.unread || new Date(b.lastActive) - new Date(a.lastActive));

  const summary = {
    customers: users.length,
    unreadMessages: cards.reduce((s, c) => s + c.messages.unread, 0) + guests.reduce((s, g) => s + g.messages.unread, 0),
    openOrders: cards.reduce((s, c) => s + c.orders.open, 0),
    abandonedCarts: cards.filter((c) => c.cart.items > 0 && c.orders.open === 0).length,
    guests: guests.length,
  };
  const start = (page - 1) * limit;
  res.json({ success: true, summary, guests: page === 1 ? guests.slice(0, 30) : [], ...paginated(cards.slice(start, start + limit), cards.length, page, limit) });
});

/** Admin gives (+) or takes back (−) loyalty coins; the reason shows in the customer's coin history. */
export const adjustCustomerCoins = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const user = await User.findById(req.params.id).select('coins');
  if (!user) throw ApiError.notFound('Customer not found');
  const { coins, note } = req.body;
  if (coins < 0 && user.coins < -coins) throw ApiError.badRequest(`They only have ${user.coins} coins`, [{ field: 'coins', message: `Max ${user.coins}` }]);
  const tx = await moveCoins(user._id, coins, { type: 'adjusted', note, by: req.user._id });
  res.json({ success: true, balance: tx.balanceAfter, transaction: tx });
});

/** Admin wallet credit/debit. Every change is a ledger row naming the admin (audit trail). */
export const adjustCustomerWallet = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const user = await User.findById(req.params.id).select('wallet');
  if (!user) throw ApiError.notFound('Customer not found');
  const { amount, type, note, expiresAt } = req.body;
  if (amount < 0 && (user.wallet || 0) < -amount) throw ApiError.badRequest(`Their wallet only has ₹${user.wallet || 0}`, [{ field: 'amount', message: `Max ₹${user.wallet || 0}` }]);
  const tx = await moveWallet(user._id, amount, {
    type: amount < 0 ? 'admin_debit' : type,
    key: `admin:${req.user._id}:${user._id}:${Date.now()}:${crypto.randomUUID()}`,
    description: note,
    by: req.user._id,
    expiresAt: amount > 0 ? expiresAt : null,
  });
  res.json({ success: true, balance: tx.balanceAfter, transaction: tx });
});

export const customerWalletLedger = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const items = await WalletTransaction.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(200).populate('by', 'name').lean();
  res.json({ success: true, items });
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
        criticalStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', 5] }] }, 1, 0] } },
        lowStock: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } },
      },
    },
  ]);

  const urgentItems = await Product.find({
    $or: [{ stock: 0 }, { stock: { $lte: 20 } }],
  })
    .select('name slug stock lowStockThreshold variants finalPrice images')
    .sort({ stock: 1 })
    .limit(10)
    .lean();

  res.json({
    success: true,
    summary: {
      products: row?.products || 0,
      units: row?.units || 0,
      value: round2(row?.value || 0),
      outOfStock: row?.outOfStock || 0,
      criticalStock: row?.criticalStock || 0,
      lowStock: row?.lowStock || 0,
      urgentItems: urgentItems.map((p) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        stock: p.stock,
        threshold: p.lowStockThreshold || 10,
        finalPrice: p.finalPrice,
        image: p.images?.[0]?.url,
        variants: p.variants.map((v) => ({ _id: v._id, name: v.name, stock: v.stock })),
      })),
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
