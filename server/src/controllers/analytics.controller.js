import PageView from '../models/PageView.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { round2 } from '../utils/helpers.js';

const TZ = 'Asia/Kolkata';
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|curl|wget|python|axios|node-fetch/i;
const ID = /^[A-Za-z0-9_-]{8,64}$/;

function deviceOf(ua = '') {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function sourceOf(referrer, host) {
  try {
    const ref = new URL(referrer).hostname.replace(/^www\./, '');
    if (!ref || ref === host) return 'direct';
    if (/google\./.test(ref)) return 'google';
    if (/bing\.|duckduckgo|yahoo\./.test(ref)) return 'other search';
    if (/instagram|facebook|fb\.|t\.co|twitter|x\.com|linkedin|pinterest|youtube|whatsapp/.test(ref)) return ref.split('.').slice(-2, -1)[0];
    return ref.slice(0, 80);
  } catch {
    return 'direct';
  }
}

/** POST /api/track — records one storefront page view. Always answers 204 so tracking never breaks the page. */
export const track = asyncHandler(async (req, res) => {
  res.status(204).end();
  const { visitorId, sessionId, path, referrer, isNew } = req.body || {};
  const ua = req.get('user-agent') || '';
  if (BOT.test(ua) || req.get('dnt') === '1') return;
  if (!ID.test(visitorId || '') || !ID.test(sessionId || '')) return;
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 200 || path.startsWith('/admin')) return;
  const clean = path.split(/[?#]/)[0];
  await PageView.create({
    visitorId,
    sessionId,
    user: req.user?._id || null,
    path: clean,
    productSlug: clean.match(/^\/product\/([^/]+)/)?.[1] || null,
    source: sourceOf(String(referrer || ''), req.hostname),
    device: deviceOf(ua),
    newVisitor: Boolean(isNew),
  }).catch(() => {});
});

const UNITS = { day: { unit: 'day', count: 30 }, week: { unit: 'week', count: 12 }, month: { unit: 'month', count: 12 } };

const IST = 5.5 * 3600e3; // India has no daylight saving, so a fixed offset is exact.

/** Start of the bucket containing `d` in the store timezone, as a Date (week starts Monday). */
function bucketStart(d, unit) {
  const ist = new Date(d.getTime() + IST); // IST wall clock, read through the UTC getters
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth(), day = ist.getUTCDate();
  let start;
  if (unit === 'month') start = Date.UTC(y, m, 1);
  else if (unit === 'week') start = Date.UTC(y, m, day - ((ist.getUTCDay() + 6) % 7));
  else start = Date.UTC(y, m, day);
  return new Date(start - IST);
}
/** Moves a bucket start by n days/weeks/months, doing the calendar maths in IST. */
function shift(d, unit, n) {
  const ist = new Date(d.getTime() + IST);
  if (unit === 'month') ist.setUTCMonth(ist.getUTCMonth() + n);
  else ist.setUTCDate(ist.getUTCDate() + n * (unit === 'week' ? 7 : 1));
  return new Date(ist.getTime() - IST);
}
function label(d, unit) {
  const opts = unit === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' };
  return new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: TZ }).format(d);
}

const VALID = { orderStatus: { $nin: ['Cancelled', 'Returned'] } };

async function series(unit, from, to) {
  const trunc = (field) => ({ $dateTrunc: { date: field, unit, timezone: TZ, ...(unit === 'week' ? { startOfWeek: 'monday' } : {}) } });
  const [views, orders, signups] = await Promise.all([
    PageView.aggregate([
      { $match: { at: { $gte: from, $lt: to } } },
      { $group: { _id: { b: trunc('$at') }, pageViews: { $sum: 1 }, visitors: { $addToSet: '$visitorId' }, sessions: { $addToSet: '$sessionId' }, newVisitors: { $sum: { $cond: ['$newVisitor', 1, 0] } } } },
      { $project: { pageViews: 1, newVisitors: 1, visitors: { $size: '$visitors' }, sessions: { $size: '$sessions' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to }, ...VALID } },
      { $group: { _id: { b: trunc('$createdAt') }, orders: { $sum: 1 }, revenue: { $sum: '$grandTotal' }, items: { $sum: { $sum: '$items.quantity' } } } },
    ]),
    User.aggregate([
      { $match: { role: 'customer', createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: { b: trunc('$createdAt') }, customers: { $sum: 1 } } },
    ]),
  ]);
  const byKey = new Map();
  const put = (rows) => rows.forEach((r) => byKey.set(r._id.b.getTime(), { ...byKey.get(r._id.b.getTime()), ...r }));
  put(views); put(orders); put(signups);
  const started = await trackingStart();
  const out = [];
  for (let d = from; d < to; d = shift(d, unit, 1)) {
    const r = byKey.get(d.getTime()) || {};
    const visitors = r.visitors || 0;
    out.push({
      start: d,
      label: label(d, unit),
      visitors,
      newVisitors: r.newVisitors || 0,
      sessions: r.sessions || 0,
      pageViews: r.pageViews || 0,
      orders: r.orders || 0,
      revenue: round2(r.revenue || 0),
      items: r.items || 0,
      newCustomers: r.customers || 0,
      // Buckets that began before counting started mix tracked visitors with untracked orders.
      conversion: visitors && started && d >= bucketStart(started, unit) && shift(d, unit, 1) > started ? round2(Math.min(100, ((r.orders || 0) / visitors) * 100)) : 0,
    });
  }
  return out;
}

// When visitor counting began. Conversion only compares visitors with orders placed since then;
// otherwise months of older orders divided by a few days of visitors gives nonsense like 900%.
let trackingStartedAt = null;
async function trackingStart() {
  if (!trackingStartedAt) trackingStartedAt = (await PageView.findOne().sort({ at: 1 }).select('at').lean())?.at || null;
  return trackingStartedAt;
}

async function totals(from, to) {
  const started = await trackingStart();
  const tracked = started && started < to ? { $gte: new Date(Math.max(from, started)), $lt: to } : null;
  const [v, o, c, trackedOrders] = await Promise.all([
    PageView.aggregate([{ $match: { at: { $gte: from, $lt: to } } }, { $group: { _id: null, pageViews: { $sum: 1 }, visitors: { $addToSet: '$visitorId' }, sessions: { $addToSet: '$sessionId' } } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: from, $lt: to }, ...VALID } }, { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } }]),
    User.countDocuments({ role: 'customer', createdAt: { $gte: from, $lt: to } }),
    tracked ? Order.countDocuments({ createdAt: tracked, ...VALID }) : 0,
  ]);
  const visitors = v[0]?.visitors.length || 0;
  const orders = o[0]?.orders || 0;
  const revenue = round2(o[0]?.revenue || 0);
  return {
    visitors,
    sessions: v[0]?.sessions.length || 0,
    pageViews: v[0]?.pageViews || 0,
    orders,
    revenue,
    avgOrderValue: orders ? round2(revenue / orders) : 0,
    newCustomers: c,
    conversion: visitors ? round2((trackedOrders / visitors) * 100) : 0,
  };
}

/** GET /api/admin/reports?period=day|week|month — traffic + sales over time, with the previous period for comparison. */
export const reports = asyncHandler(async (req, res) => {
  const { unit, count } = UNITS[req.query.period] || UNITS.day;
  const to = shift(bucketStart(new Date(), unit), unit, 1);
  const from = shift(to, unit, -count);
  const prevFrom = shift(from, unit, -count);
  const range = { at: { $gte: from, $lt: to } };

  const [buckets, current, previous, topPages, topProducts, sources, devices, live, today] = await Promise.all([
    series(unit, from, to),
    totals(from, to),
    totals(prevFrom, from),
    PageView.aggregate([{ $match: range }, { $group: { _id: '$path', views: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } }, { $project: { views: 1, visitors: { $size: '$visitors' } } }, { $sort: { views: -1 } }, { $limit: 10 }]),
    PageView.aggregate([
      { $match: { ...range, productSlug: { $ne: null } } },
      { $group: { _id: '$productSlug', views: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } },
      { $project: { views: 1, visitors: { $size: '$visitors' } } },
      { $sort: { views: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'products', localField: '_id', foreignField: 'slug', as: 'p', pipeline: [{ $project: { name: 1, images: { $slice: ['$images', 1] }, soldCount: 1 } }] } },
      { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
    ]),
    PageView.aggregate([{ $match: range }, { $group: { _id: '$source', visitors: { $addToSet: '$visitorId' } } }, { $project: { visitors: { $size: '$visitors' } } }, { $sort: { visitors: -1 } }, { $limit: 8 }]),
    PageView.aggregate([{ $match: range }, { $group: { _id: '$device', visitors: { $addToSet: '$visitorId' } } }, { $project: { visitors: { $size: '$visitors' } } }]),
    PageView.distinct('visitorId', { at: { $gte: new Date(Date.now() - 5 * 60e3) } }),
    totals(bucketStart(new Date(), 'day'), new Date(Date.now() + 1)),
  ]);

  res.json({
    success: true,
    period: unit,
    from,
    to,
    buckets,
    current,
    previous,
    today,
    liveVisitors: live.length,
    topPages: topPages.map((p) => ({ path: p._id, views: p.views, visitors: p.visitors })),
    topProducts: topProducts.map((p) => ({ slug: p._id, name: p.p?.name || p._id, image: p.p?.images?.[0]?.url, views: p.views, visitors: p.visitors })),
    sources: sources.map((s) => ({ source: s._id, visitors: s.visitors })),
    devices: Object.fromEntries(devices.map((d) => [d._id, d.visitors])),
  });
});
