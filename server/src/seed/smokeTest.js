/**
 * End-to-end API smoke test against the configured database.
 * Starts the app on a random port, runs the main customer + admin workflows,
 * then removes everything it created and restores stock.
 *
 *   npm run test:api
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import { connectDB } from '../config/db.js';
import app from '../app.js';
import User from '../models/User.js';
import PageView from '../models/PageView.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Review from '../models/Review.js';
import Wishlist from '../models/Wishlist.js';
import Notification from '../models/Notification.js';
import Coupon from '../models/Coupon.js';
import { ContactEnquiry, CorporateEnquiry, Subscriber } from '../models/Enquiry.js';

let base;
let passed = 0;
let failed = 0;
const created = { users: [], orders: [], emails: [] };

function check(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

class Client {
  constructor() {
    this.cookie = '';
  }

  async req(method, path, body, { form } = {}) {
    const headers = { Origin: env.clientUrls[0] };
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + path, { method, headers, body: payload });
    const set = res.headers.getSetCookie?.() || [];
    const auth = set.find((c) => c.startsWith(`${env.jwt.cookieName}=`));
    if (auth) this.cookie = auth.split(';')[0];
    const json = await res.json().catch(() => ({}));
    return { ...json, status: res.status };
  }

  /** GET returning the raw body (for files such as the invoice PDF). */
  async raw(path) {
    const res = await fetch(base + path, { headers: { Origin: env.clientUrls[0], ...(this.cookie ? { Cookie: this.cookie } : {}) } });
    return { status: res.status, type: res.headers.get('content-type') || '', body: Buffer.from(await res.arrayBuffer()) };
  }
}

const rand = () => Math.random().toString(36).slice(2, 8);
const address = {
  label: 'Office',
  fullName: 'Smoke Tester',
  phone: { dialCode: '+91', number: '98765 43210' },
  addressLine1: '221 Residency Road',
  addressLine2: 'Suite 4',
  landmark: 'Near Metro',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560025',
  country: 'IN',
};
const customer = (email) => ({
  name: 'Smoke Tester',
  email,
  phone: { dialCode: '+91', number: '98765 43210' },
  country: 'IN',
  nationality: 'IN',
});

async function registerClient() {
  const c = new Client();
  const email = `smoke-${rand()}@test.wildtane.dev`;
  created.emails.push(email);
  const r = await c.req('POST', '/api/auth/register', { name: 'Smoke Tester', email, password: 'Smoke12345' });
  if (r.user) created.users.push(r.user._id);
  c.email = email;
  return { c, r };
}

async function run() {
  console.log('\nPublic catalogue');
  const health = await new Client().req('GET', '/api/health');
  check('health', health.status === 200);
  const pub = new Client();
  const cfg = await pub.req('GET', '/api/config');
  check('config has currencies + COD', cfg.config?.currencies?.length > 1 && cfg.config.paymentMethods.some((m) => m.code === 'cod' && m.available));
  const cats = await pub.req('GET', '/api/categories');
  check('category tree with children', cats.categories?.some((c) => c.children?.length));
  const list = await pub.req('GET', '/api/products?sort=price-low&limit=5');
  check('product list sorted by price', list.items?.length === 5 && list.items[0].finalPrice <= list.items[4].finalPrice);
  const filtered = await pub.req('GET', '/api/products?colors=teal&category=bags');
  check('colour + category filter', filtered.items?.length > 0 && filtered.items.every((p) => p.variants.some((v) => v.colorFamily === 'teal')));
  const facets = await pub.req('GET', '/api/products/facets');
  check('facets', facets.facets?.materials?.length > 0 && facets.facets.colors.length > 0);
  const sug = await pub.req('GET', '/api/products/suggest?q=apex');
  check('autocomplete', sug.products?.[0]?.name?.includes('Apex'));
  const cols = await pub.req('GET', '/api/products/collections');
  check('collections', cols.bestSellers?.length > 0 && cols.newArrivals?.length > 0);
  const pd = await pub.req('GET', '/api/products/the-apex-commuter-24l');
  check('product detail + rating breakdown', pd.product?.variants?.length === 3 && pd.ratingBreakdown?.length === 5);
  const quote = await pub.req('POST', '/api/cart/quote', {
    items: [{ productId: pd.product._id, variantId: pd.product.variants[0]._id, quantity: 2 }],
  });
  check('guest cart quote', quote.cart?.summary?.subtotal === pd.product.finalPrice * 2);

  console.log('\nAuth');
  const { c: user, r: reg } = await registerClient();
  check('register sets cookie', reg.status === 201 && user.cookie);
  const dup = await new Client().req('POST', '/api/auth/register', { name: 'X Y', email: user.email, password: 'Smoke12345' });
  check('duplicate email rejected', dup.status === 409);
  const weak = await new Client().req('POST', '/api/auth/register', { name: 'X Y', email: `w${rand()}@t.dev`, password: 'short' });
  check('weak password rejected', weak.status === 400);
  const me = await user.req('GET', '/api/auth/me');
  check('me', me.user?.email === user.email);
  const inj = await new Client().req('POST', '/api/auth/login', { email: { $gt: '' }, password: 'x' });
  check('NoSQL injection in login rejected', inj.status === 400);
  const fp = await new Client().req('POST', '/api/auth/forgot-password', { email: user.email });
  check('forgot password', fp.status === 200);
  const unauth = await new Client().req('GET', '/api/cart');
  check('cart requires auth', unauth.status === 401);

  console.log('\nAccount');
  const addr = await user.req('POST', '/api/users/me/addresses', address);
  check('add address (auto default)', addr.status === 201 && addr.address.isDefault);
  const prof = await user.req('PATCH', '/api/users/me', { country: 'AE', nationality: 'IN', phone: { dialCode: '+971', number: '50 111 2222' } });
  check('update profile', prof.user?.country === 'AE');
  await user.req('POST', `/api/users/me/recently-viewed/${pd.product._id}`);
  const rv = await user.req('GET', '/api/users/me/recently-viewed');
  check('recently viewed', rv.products?.[0]?._id === pd.product._id);
  const wl = await user.req('POST', `/api/wishlist/${pd.product._id}`);
  check('wishlist add', wl.wishlist?.ids?.includes(pd.product._id));

  console.log('\nCart & checkout');
  const variant = pd.product.variants[0];
  const stockBefore = (await Product.findById(pd.product._id)).variants.id(variant._id).stock;
  let cart = await user.req('POST', '/api/cart/items', { productId: pd.product._id, variantId: variant._id, quantity: 1 });
  check('add to cart', cart.cart?.items?.length === 1);
  const itemId = cart.cart.items[0]._id;
  cart = await user.req('PATCH', `/api/cart/items/${itemId}`, { quantity: 2 });
  check('change quantity', cart.cart?.items[0].quantity === 2);
  const tooMany = await user.req('PATCH', `/api/cart/items/${itemId}`, { quantity: 99 });
  check('cannot exceed stock', tooMany.status === 400);
  cart = await user.req('PATCH', `/api/cart/items/${itemId}/variant`, { variantId: pd.product.variants[1]._id });
  check('switch variant', cart.cart?.items[0].variant._id === pd.product.variants[1]._id);
  cart = await user.req('PATCH', `/api/cart/items/${itemId}/variant`, { variantId: variant._id });
  const badCoupon = await user.req('POST', '/api/cart/coupon', { code: 'NOPE123' });
  check('invalid coupon rejected', badCoupon.status === 400);
  cart = await user.req('POST', '/api/cart/coupon', { code: 'WELCOME10' });
  check('coupon applied', cart.cart?.summary?.discount > 0);
  const express = await user.req('PUT', '/api/cart/shipping', { code: 'express' });
  check('express delivery no longer offered', express.status >= 400 || express.cart?.shippingMethod !== 'express');
  cart = await user.req('PUT', '/api/cart/shipping', { code: 'standard' });
  const s = cart.cart.summary;
  check('standard delivery free above the threshold', s.shippingMethods?.length === 1 && s.shipping === 0);
  check('totals add up', Math.abs(s.subtotal - s.discount + s.shipping + (s.taxIncluded ? 0 : s.tax) - s.grandTotal) < 0.01);
  const pm = await user.req('GET', '/api/cart/payment-methods');
  check('payment methods', pm.methods?.find((m) => m.code === 'cod')?.available && !pm.methods.find((m) => m.code === 'card').available);
  const badPay = await user.req('POST', '/api/orders', { customer: customer(user.email), addressId: addr.address._id, shippingMethod: 'standard', paymentMethod: 'card' });
  check('unavailable payment rejected', badPay.status === 400);

  const placed = await user.req('POST', '/api/orders', {
    customer: customer(user.email),
    addressId: addr.address._id,
    shippingMethod: 'standard',
    paymentMethod: 'cod',
  });
  check('order placed', placed.status === 201 && /^WT\d{2}-\d{6}$/.test(placed.order?.orderId), JSON.stringify(placed).slice(0, 300));
  if (placed.order) created.orders.push(placed.order._id);
  const o = placed.order || {};
  check('order stored in MongoDB with all fields', Boolean(await Order.exists({ _id: o._id, 'items.0.SKU': { $exists: true }, 'shippingAddress.postalCode': '560025', nationality: 'IN' })));
  check('order total matches cart', o.grandTotal === s.grandTotal && o.coupon?.code === 'WELCOME10');
  const stockAfter = (await Product.findById(pd.product._id)).variants.id(variant._id).stock;
  check('inventory decremented', stockAfter === stockBefore - 2, `${stockBefore} -> ${stockAfter}`);
  const emptied = await user.req('GET', '/api/cart');
  check('cart cleared after order', emptied.cart?.items?.length === 0 && !emptied.cart.couponCode);
  await new Promise((r) => setTimeout(r, 800));
  const notif = await Notification.findOne({ order: o._id });
  check('WhatsApp notification logged separately', notif && ['logged', 'sent', 'failed'].includes(notif.status) && notif.message.includes('WILDTANE - NEW ORDER'));
  const reuse = await user.req('POST', '/api/cart/items', { productId: pd.product._id, variantId: variant._id, quantity: 1 });
  const reuseCoupon = await user.req('POST', '/api/cart/coupon', { code: 'WELCOME10' });
  check('per-user coupon limit enforced', reuse.status === 201 && reuseCoupon.status === 400);
  await user.req('DELETE', '/api/cart');
  const mine = await user.req('GET', '/api/orders');
  check('my orders', mine.items?.length === 1);
  const activeTab = await user.req('GET', '/api/orders?group=active');
  const deliveredTab = await user.req('GET', '/api/orders?group=delivered');
  check('my orders tabs (on the way / delivered)', activeTab.items?.length === 1 && deliveredTab.items?.length === 0);
  const ov = await user.req('GET', '/api/users/me/overview');
  check('account overview', ov.stats?.orders === 1 && ov.stats.active === 1 && ov.activeOrders?.length === 1);

  // Anonymous visit counting + catalogue filters
  const vid = `smokevisitor${rand()}`;
  const tr = await new Client().req('POST', '/api/track', { visitorId: vid, sessionId: `smokesession${rand()}`, path: '/product/the-apex-commuter-24l', isNew: true });
  const trBad = await new Client().req('POST', '/api/track', { visitorId: 'x', sessionId: 'y', path: 'javascript:alert(1)' });
  await new Promise((r) => setTimeout(r, 300));
  check('page view recorded (and bad input ignored)', tr.status === 204 && trBad.status === 204 && (await PageView.countDocuments({ visitorId: vid })) === 1);
  const sized = await new Client().req('GET', '/api/products?size=large&limit=48');
  check('size filter', sized.items?.length > 0 && sized.items.every((p) => p.capacity));
  const fac = await new Client().req('GET', '/api/products/facets');
  check('facets include size, price bands, on sale', fac.facets?.sizes?.small > 0 && fac.facets.priceBands && typeof fac.facets.onSale === 'number');

  const sections = await Promise.all(['men', 'women', 'unisex'].map((g) => new Client().req('GET', `/api/products?gender=${g}&limit=48`)));
  check('men / women / unisex sections list only their own products', sections.every((r, i) => r.items?.length > 0 && r.items.every((p) => p.gender === ['men', 'women', 'unisex'][i])));

  console.log('\nConcurrency');
  const raceProduct = await Product.findOne({ slug: 'technical-cable-organizer' });
  const raceVariant = raceProduct.variants[0];
  const originalRaceStock = raceVariant.stock;
  await Product.updateOne({ _id: raceProduct._id, 'variants._id': raceVariant._id }, { $set: { 'variants.$.stock': 1, stock: 1 } });
  const buyers = await Promise.all([registerClient(), registerClient(), registerClient()]);
  for (const { c } of buyers) {
    // eslint-disable-next-line no-await-in-loop
    await c.req('POST', '/api/cart/items', { productId: raceProduct._id, variantId: raceVariant._id, quantity: 1 });
  }
  const results = await Promise.all(
    buyers.map(({ c }) =>
      c.req('POST', '/api/orders', { customer: customer(c.email), address, shippingMethod: 'standard', paymentMethod: 'cod' })
    )
  );
  results.filter((r) => r.order).forEach((r) => created.orders.push(r.order._id));
  const wins = results.filter((r) => r.status === 201).length;
  check('only one of three simultaneous buyers gets the last unit', wins === 1, results.map((r) => r.status).join(','));
  const finalRace = (await Product.findById(raceProduct._id)).variants.id(raceVariant._id).stock;
  check('stock never negative', finalRace === 0, `stock=${finalRace}`);

  console.log('\nReviews');
  const rev = await user.req('POST', `/api/reviews/product/${pd.product._id}`, { rating: 5, title: 'Smoke', comment: 'Smoke test review content here.' });
  check('review blocked before the product is delivered', rev.status === 403);
  const elig = await user.req('GET', `/api/reviews/product/${pd.product._id}/eligibility`);
  check('eligibility says not purchased', elig.canReview === false && elig.reason === 'not-purchased');
  const anonRev = await new Client().req('POST', `/api/reviews/product/${pd.product._id}`, { rating: 5, comment: 'Should not be allowed' });
  check('anonymous review blocked', anonRev.status === 401);
  // The race winner's order is marked delivered, which makes them a verified buyer.
  const winnerIdx = results.findIndex((r) => r.status === 201);
  const reviewer = buyers[winnerIdx]?.c;
  await Order.updateOne({ _id: results[winnerIdx]?.order?._id }, { orderStatus: 'Delivered' });
  const vrev = await reviewer.req('POST', `/api/reviews/product/${raceProduct._id}`, { rating: 5, title: 'Smoke', comment: 'Smoke test review from a verified buyer.', isVerifiedPurchase: false, status: 'approved' });
  check('verified buyer review saved as pending (client fields ignored)', vrev.status === 201 && vrev.review.isVerifiedPurchase === true && vrev.review.status === 'pending' && String(vrev.review.order) === String(results[winnerIdx].order._id));
  const publicBefore = await new Client().req('GET', `/api/reviews/product/${raceProduct._id}?limit=30`);
  check('pending review not public', !publicBefore.items?.some((r) => r._id === vrev.review?._id));

  console.log('\nForms');
  const contact = await new Client().req('POST', '/api/contact', { name: 'Smoke', email: 'smoke@test.wildtane.dev', subject: 'Test', message: 'Hello from the smoke test <script>alert(1)</script>' });
  check('contact stored', contact.status === 201);
  const stored = await ContactEnquiry.findById(contact.id);
  check('XSS stripped from input', stored && !stored.message.includes('<script>'));
  const form = new FormData();
  Object.entries({ company: 'Smoke Corp', contactPerson: 'Smoke', email: 'smoke@test.wildtane.dev', phone: '+91 98765 43210', country: 'IN', productType: 'Backpacks', quantity: '120', customization: 'Logo embossing' }).forEach(([k, v]) => form.append(k, v));
  form.append('logo', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'logo.png');
  const corp = await new Client().req('POST', '/api/corporate', undefined, { form });
  check('corporate enquiry with logo', corp.status === 201, JSON.stringify(corp));
  const sub = await new Client().req('POST', '/api/newsletter', { email: 'smoke@test.wildtane.dev' });
  check('newsletter', sub.status === 201);

  console.log('\nAdmin');
  const forbidden = await user.req('GET', '/api/admin/dashboard');
  check('customer blocked from admin', forbidden.status === 403);
  const admin = new Client();
  const custAtPortal = await new Client().req('POST', '/api/auth/admin/login', { email: user.email, password: 'Smoke12345' });
  check('customer rejected at admin portal login', custAtPortal.status === 403);
  const adminAtStore = await new Client().req('POST', '/api/auth/login', { email: env.admin.email, password: env.admin.password });
  check('admin can use the single store sign-in', adminAtStore.user?.role === 'admin');
  const al = await admin.req('POST', '/api/auth/admin/login', { email: env.admin.email, password: env.admin.password });
  check('admin portal login', al.user?.role === 'admin');

  const homeTry = await admin.req('PATCH', `/api/admin/reviews/${vrev.review?._id}`, { showOnHome: true });
  check('pending review cannot go on the homepage', homeTry.status === 400);
  const approve = await admin.req('PATCH', `/api/admin/reviews/${vrev.review?._id}`, { status: 'approved', showOnHome: true });
  check('admin approves + features review', approve.review?.status === 'approved' && approve.review.showOnHome === true);
  const featured = await new Client().req('GET', '/api/reviews/featured?limit=12');
  const feat = featured.reviews?.find((r) => r._id === vrev.review?._id);
  check('featured review public, verified, no email', feat?.isVerifiedPurchase && feat.author?.name && !JSON.stringify(featured).includes(reviewer.email));
  const reject = await admin.req('PATCH', `/api/admin/reviews/${vrev.review?._id}`, { status: 'rejected' });
  check('rejecting removes it from the homepage', reject.review?.status === 'rejected' && reject.review.showOnHome === false);
  const custModerate = await user.req('PATCH', `/api/admin/reviews/${vrev.review?._id}`, { status: 'approved' });
  check('customer cannot moderate reviews', custModerate.status === 403);

  const lockEmail = `smoke-${rand()}@test.wildtane.dev`;
  created.emails.push(lockEmail);
  await new Client().req('POST', '/api/auth/register', { name: 'Lock Tester', email: lockEmail, password: 'Smoke12345' });
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Client().req('POST', '/api/auth/login', { email: lockEmail, password: 'wrong-pass-1' });
  }
  const locked = await new Client().req('POST', '/api/auth/login', { email: lockEmail, password: 'Smoke12345' });
  check('account locks after 5 failed sign-ins', locked.status === 429);

  const lu = await admin.req('POST', '/api/admin/updates', { title: 'Smoke test update', body: '<script>alert(1)</script>Hello', kind: 'drop', link: '/shop' });
  check('admin posts live update', lu.update?._id && !lu.update.body.includes('<script'));
  const badLink = await admin.req('POST', '/api/admin/updates', { title: 'Bad link update', link: 'javascript:alert(1)' });
  check('live update rejects javascript: links', badLink.status === 400);
  const feed = await new Client().req('GET', '/api/updates');
  check('live update visible in public feed', feed.updates?.some((u) => u._id === lu.update?._id));
  await admin.req('PUT', `/api/admin/updates/${lu.update?._id}`, { title: 'Smoke test update', isPublished: false });
  const feed2 = await new Client().req('GET', '/api/updates');
  check('hidden update leaves public feed', !feed2.updates?.some((u) => u._id === lu.update?._id));
  const cantPost = await user.req('POST', '/api/admin/updates', { title: 'Customer update' });
  check('customer cannot post live updates', cantPost.status === 403);
  const delLu = await admin.req('DELETE', `/api/admin/updates/${lu.update?._id}`);
  check('admin deletes live update', delLu.success === true);
  const dash = await admin.req('GET', '/api/admin/dashboard');
  check('dashboard KPIs + series', dash.kpis?.revenue && dash.series?.length === 30);
  const rep = await admin.req('GET', '/api/admin/reports?period=week');
  check('reports (weekly visitors + sales)', rep.buckets?.length === 12 && rep.current?.visitors >= 1 && rep.topProducts?.some((p) => p.slug === 'the-apex-commuter-24l'));
  const repMonth = await admin.req('GET', '/api/admin/reports?period=month');
  check('reports (monthly)', repMonth.buckets?.length === 12 && repMonth.current?.revenue > 0);
  const repDenied = await user.req('GET', '/api/admin/reports');
  check('customer blocked from reports', repDenied.status === 403);
  const an = await admin.req('GET', '/api/admin/analytics');
  check('analytics', Array.isArray(an.byCategory) && an.byWeekday?.length === 7);
  const adOrder = await admin.req('GET', `/api/admin/orders/${o.orderId}`);
  check('admin order detail + notifications', adOrder.order?.orderId === o.orderId && adOrder.notifications?.length >= 1);
  // Tax Invoice PDF: preview, access control, approve → PDF by email + WhatsApp
  const invPrev = await admin.req('GET', `/api/admin/orders/${o._id}/invoice-preview`);
  check('invoice preview (caption + covering email)', invPrev.fileName === `WILDTANE_Tax_Invoice_${o.orderId}.pdf` && invPrev.waCaption?.includes(o.orderId) && Boolean(invPrev.email?.html));
  const adminPdf = await admin.raw(`/api/admin/orders/${o._id}/invoice.pdf`);
  check('admin invoice PDF', adminPdf.status === 200 && adminPdf.type.includes('application/pdf') && adminPdf.body.subarray(0, 4).toString() === '%PDF');
  const ownPdf = await user.raw(`/api/orders/${o.orderId}/invoice.pdf`);
  check('customer downloads own invoice PDF', ownPdf.status === 200 && ownPdf.body.subarray(0, 4).toString() === '%PDF');
  const anonPdf = await new Client().raw(`/api/orders/${o.orderId}/invoice.pdf`);
  const { c: stranger } = await registerClient();
  const otherPdf = await stranger.raw(`/api/orders/${o.orderId}/invoice.pdf`);
  check('invoice PDF hidden from guests and other customers', anonPdf.status === 401 && otherPdf.status === 404);
  const appr = await admin.req('POST', `/api/admin/orders/${o._id}/approve-and-send`, {});
  check(
    'approve sends PDF to email + WhatsApp',
    appr.approved === true && appr.order?.orderStatus === 'Confirmed' && ['sent', 'logged'].includes(appr.delivery?.email?.status) && ['sent', 'logged'].includes(appr.delivery?.whatsapp?.status),
    JSON.stringify(appr.delivery || appr).slice(0, 300)
  );
  const invLogs = await Notification.find({ order: o._id, attachment: `WILDTANE_Tax_Invoice_${o.orderId}.pdf` });
  check('invoice email + WhatsApp logged with the PDF', invLogs.some((n) => n.channel === 'email') && invLogs.some((n) => n.channel === 'whatsapp'));
  const st1 = await admin.req('PATCH', `/api/admin/orders/${o._id}/status`, { status: 'Confirmed', note: 'Verified by phone' });
  check('status → Confirmed', st1.order?.orderStatus === 'Confirmed' && st1.order.statusHistory.length === 2);
  const future = await admin.req('PATCH', `/api/admin/orders/${o._id}/status`, { status: 'Processing', at: new Date(Date.now() + 3600e3).toISOString() });
  check('status time in the future rejected', future.status === 400);
  // A moment between placing the order and now (earlier than placement is rejected).
  const packedAt = new Date((Date.parse(o.createdAt) + Date.now()) / 2).toISOString();
  const st1b = await admin.req('PATCH', `/api/admin/orders/${o._id}/status`, { status: 'Packed', at: packedAt, courier: 'Blue Dart', trackingNumber: 'BD123', notifyCustomer: true });
  const packedEntry = st1b.order?.statusHistory?.at(-1);
  check('status saved with chosen time + tracking', packedEntry?.status === 'Packed' && new Date(packedEntry.at).toISOString() === packedAt && st1b.order.trackingNumber === 'BD123');
  const st2 = await admin.req('PATCH', `/api/admin/orders/${o._id}/status`, { status: 'Cancelled' });
  const restored = (await Product.findById(pd.product._id)).variants.id(variant._id).stock;
  check('cancel restores inventory', st2.order?.inventoryRestored && restored === stockBefore, `${restored} vs ${stockBefore}`);
  const st3 = await admin.req('PATCH', `/api/admin/orders/${o._id}/status`, { status: 'Shipped' });
  check('cancelled order is final', st3.status === 400);
  const newCoupon = await admin.req('POST', '/api/admin/coupons', { code: `SMK${rand().toUpperCase()}`, type: 'percentage', value: 120 });
  check('coupon validation (>100%) rejected', newCoupon.status === 400);
  const cust = await admin.req('GET', '/api/admin/customers?q=smoke');
  check('customers search', cust.items?.length >= 1);
  const inv = await admin.req('GET', '/api/admin/inventory/summary');
  check('inventory summary', inv.summary?.products > 0);

  // Quick edit + bulk actions (restored afterwards)
  const qp = await Product.findById(pd.product._id).lean();
  const qe = await admin.req('PATCH', `/api/admin/products/${qp._id}/quick`, { price: qp.price + 1000, salePrice: qp.price, isFeatured: true });
  const live = await new Client().req('GET', `/api/products/${qp.slug}`);
  check('quick edit price + sale goes live', qe.product?.finalPrice === qp.price && live.product?.finalPrice === qp.price && live.product?.price === qp.price + 1000);
  const qeBad = await admin.req('PATCH', `/api/admin/products/${qp._id}/quick`, { salePrice: qp.price + 5000 });
  check('quick edit rejects sale above price', qeBad.status === 400);
  const otherSub = await Category.findOne({ parent: { $ne: null }, _id: { $ne: qp.subcategory } });
  const moved = await admin.req('PATCH', `/api/admin/products/${qp._id}/quick`, { listing: String(otherSub._id) });
  check('quick edit moves category', String(moved.product?.subcategory?._id) === String(otherSub._id) && String(moved.product?.category?._id) === String(otherSub.parent));
  const bs = await admin.req('POST', '/api/admin/products/bulk', { ids: [String(qp._id)], action: 'sale', percent: 25 });
  const afterSale = await Product.findById(qp._id).lean();
  check('bulk 25% sale', bs.updated === 1 && afterSale.salePrice === Math.round((qp.price + 1000) * 0.75));
  const custBulk = await user.req('POST', '/api/admin/products/bulk', { ids: [String(qp._id)], action: 'hide' });
  check('customer blocked from bulk edit', custBulk.status === 403);
  await Product.updateOne({ _id: qp._id }, { price: qp.price, salePrice: qp.salePrice ?? null, finalPrice: qp.finalPrice, isFeatured: qp.isFeatured, category: qp.category, subcategory: qp.subcategory, sizeGroup: qp.sizeGroup });
  const delCat = await admin.req('DELETE', `/api/admin/categories/${pd.product.category._id}`);
  check('cannot delete category in use', delCat.status === 409);

  await Product.updateOne({ _id: raceProduct._id, 'variants._id': raceVariant._id }, { $set: { 'variants.$.stock': originalRaceStock, stock: originalRaceStock } });
}

async function cleanup() {
  const orders = await Order.find({ _id: { $in: created.orders } });
  for (const order of orders) {
    if (!order.inventoryRestored && !['Cancelled', 'Returned'].includes(order.orderStatus)) {
      for (const it of order.items) {
        // eslint-disable-next-line no-await-in-loop
        await Product.updateOne({ _id: it.productId, 'variants._id': it.variant.id }, { $inc: { 'variants.$.stock': it.quantity, stock: it.quantity, soldCount: -it.quantity } });
      }
    }
  }
  const users = await User.find({ email: { $in: created.emails } }).select('_id');
  const ids = users.map((u) => u._id);
  await Promise.all([
    Order.deleteMany({ _id: { $in: created.orders } }),
    Notification.deleteMany({ order: { $in: created.orders } }),
    Coupon.updateMany({}, { $pull: { usages: { order: { $in: created.orders } } } }),
    Cart.deleteMany({ user: { $in: ids } }),
    Wishlist.deleteMany({ user: { $in: ids } }),
    Review.deleteMany({ user: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
    ContactEnquiry.deleteMany({ email: 'smoke@test.wildtane.dev' }),
    CorporateEnquiry.deleteMany({ email: 'smoke@test.wildtane.dev' }),
    Subscriber.deleteMany({ email: 'smoke@test.wildtane.dev' }),
    PageView.deleteMany({ visitorId: /^smokevisitor/ }),
  ]);
  // Re-sync coupon usage counters after removing test redemptions.
  const coupons = await Coupon.find();
  for (const c of coupons) {
    c.usedCount = c.usages.length;
    // eslint-disable-next-line no-await-in-loop
    await c.save();
  }
  const { recalcRating } = await import('../controllers/review.controller.js');
  const apex = await Product.findOne({ slug: 'the-apex-commuter-24l' });
  if (apex) await recalcRating(apex._id);
}

await connectDB();
const server = app.listen(0);
base = `http://127.0.0.1:${server.address().port}`;
try {
  await run();
} catch (err) {
  failed += 1;
  console.error('Smoke test crashed:', err);
} finally {
  await cleanup().catch((e) => console.error('Cleanup error:', e.message));
  server.close();
  await mongoose.disconnect();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
