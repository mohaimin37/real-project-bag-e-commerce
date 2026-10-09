/**
 * Seeds the WILDTANE catalogue, demo content and an admin account.
 *
 *   npm run seed         → seeds only if the database has no products
 *   npm run seed:fresh   → WIPES catalogue/orders/demo data first, then seeds
 *
 * The admin account (ADMIN_EMAIL) is created or updated, never deleted.
 */
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import env from '../config/env.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Banner from '../models/Banner.js';
import Blog from '../models/Blog.js';
import LiveUpdate from '../models/LiveUpdate.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Notification from '../models/Notification.js';
import Counter from '../models/Counter.js';
import Setting from '../models/Setting.js';
import { CorporateEnquiry, ContactEnquiry, Subscriber } from '../models/Enquiry.js';
import { slugify, round2 } from '../utils/helpers.js';
import * as data from './data.js';
import { sizeFromCapacity } from '../models/Product.js';

// { variantSku: 'variants/file-name' } — written by tools/variantPhotos.mjs; optional.
let variantPhotos = {};
try {
  variantPhotos = JSON.parse(readFileSync(new URL('./variantPhotos.json', import.meta.url), 'utf8'));
} catch {
  /* no generated colour photos yet */
}

const fresh = process.argv.includes('--fresh');
const DAY = 24 * 60 * 60 * 1000;

function pick(arr, i) {
  return arr[i % arr.length];
}

async function wipe() {
  console.log('Wiping catalogue, orders and demo data…');
  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    Banner.deleteMany({}),
    Blog.deleteMany({}),
    LiveUpdate.deleteMany({}),
    Review.deleteMany({}),
    Order.deleteMany({}),
    Cart.deleteMany({}),
    Wishlist.deleteMany({}),
    Notification.deleteMany({}),
    Counter.deleteMany({}),
    CorporateEnquiry.deleteMany({}),
    ContactEnquiry.deleteMany({}),
    Subscriber.deleteMany({}),
    User.deleteMany({ role: 'customer', email: { $in: data.demoCustomers.map((c) => c.email) } }),
  ]);
}

async function ensureAdmin() {
  if (!env.admin.email || !env.admin.password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account');
    return null;
  }
  let admin = await User.findOne({ email: env.admin.email.toLowerCase() });
  if (!admin) {
    admin = await User.create({ name: env.admin.name, email: env.admin.email, password: env.admin.password, role: 'admin' });
    console.log(`Admin created: ${admin.email}`);
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
    console.log(`Existing user promoted to admin: ${admin.email}`);
  } else {
    console.log(`Admin exists: ${admin.email}`);
  }
  return admin;
}

async function seedCategories() {
  const subByName = new Map();
  let order = 0;
  for (const top of data.categories) {
    // eslint-disable-next-line no-await-in-loop
    const parent = await Category.create({ name: top.name, slug: slugify(top.name), tagline: top.tagline, sortOrder: order++ });
    let childOrder = 0;
    for (const child of top.children) {
      // eslint-disable-next-line no-await-in-loop
      const sub = await Category.create({
        name: child.name,
        slug: slugify(child.name),
        tagline: child.tagline,
        parent: parent._id,
        sortOrder: childOrder++,
        image: child.image ? { url: `/uploads/seed/${child.image}.jpg` } : undefined,
      });
      subByName.set(child.name, sub);
    }
  }
  console.log(`Categories: ${await Category.countDocuments()}`);
  return subByName;
}

async function seedProducts(subByName, list = data.products) {
  const created = [];
  let i = 0;
  for (const p of list) {
    const sub = subByName.get(p.sub);
    const variants = p.variants.map(([name, colorHex, colorFamily, stock, image], vi) => {
      const sku = `${p.sku}-${String(vi + 1).padStart(2, '0')}`;
      const photo = image ? `${p.photoFolder ? `${p.photoFolder}/` : ''}${image}` : variantPhotos[sku];
      return { name, colorHex, colorFamily, stock, sku, images: photo ? [{ url: `/uploads/seed/${photo}.jpg`, alt: `${p.name} in ${name}` }] : [] };
    });
    // eslint-disable-next-line no-await-in-loop
    const product = await Product.create({
      ...p,
      slug: slugify(p.name),
      category: sub.parent,
      subcategory: sub._id,
      variants,
      lowStockThreshold: 5,
      // Stagger creation dates so "Newest" sorting is meaningful.
      createdAt: new Date(Date.now() - (list.length - i) * 3 * DAY),
    });
    created.push(product);
    i += 1;
  }
  console.log(`Products: ${created.length}`);
  return created;
}

async function seedCustomers() {
  const users = [];
  for (const c of data.demoCustomers) {
    // eslint-disable-next-line no-await-in-loop
    const user = await User.create({
      name: c.name,
      email: c.email,
      password: 'Demo@12345',
      country: c.country,
      nationality: c.nationality,
      phone: { dialCode: c.dial, number: c.phone },
      addresses: [
        {
          label: 'Home',
          fullName: c.name,
          phone: { dialCode: c.dial, number: c.phone },
          addressLine1: '12 Marine Residency, Tower B',
          addressLine2: 'Flat 1402',
          landmark: 'Opposite City Park',
          city: c.city,
          state: c.state,
          postalCode: c.postalCode,
          country: c.country,
          isDefault: true,
        },
      ],
    });
    users.push(user);
  }
  console.log(`Demo customers: ${users.length} (password Demo@12345)`);
  return users;
}

/** Historical orders so the dashboard and analytics have something to show. Stock is not touched. */
async function seedOrders(users, products, admin) {
  const statuses = ['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Processing', 'Confirmed', 'Pending', 'Delivered', 'Cancelled', 'Out for Delivery'];
  const orders = [];
  for (let n = 0; n < 36; n += 1) {
    const user = pick(users, n);
    const items = [pick(products, n * 3), pick(products, n * 5 + 2)]
      .filter((p, idx, arr) => arr.findIndex((x) => x._id.equals(p._id)) === idx)
      .slice(0, n % 3 === 0 ? 2 : 1)
      .map((p, k) => {
        const v = p.variants[(n + k) % p.variants.length];
        const qty = 1 + ((n + k) % 2);
        return {
          productId: p._id,
          productName: p.name,
          slug: p.slug,
          SKU: v.sku,
          image: v.images[0]?.url || p.images[0]?.url,
          variant: { id: v._id, name: v.name, colorHex: v.colorHex, size: v.size },
          quantity: qty,
          unitPrice: p.finalPrice,
          totalPrice: round2(p.finalPrice * qty),
        };
      });
    const subtotal = round2(items.reduce((s, it) => s + it.totalPrice, 0));
    const discount = n % 6 === 0 ? Math.min(2000, round2(subtotal * 0.1)) : 0;
    const shipping = subtotal - discount >= 10000 ? 0 : 199;
    const tax = round2((subtotal - discount) - (subtotal - discount) / 1.18);
    const createdAt = new Date(Date.now() - (n * 1.6 + 0.3) * DAY);
    const status = pick(statuses, n);
    const addr = user.addresses[0];
    orders.push({
      orderId: `WT${String(createdAt.getFullYear()).slice(-2)}-${String(n + 1).padStart(6, '0')}`,
      user: user._id,
      customerName: user.name,
      email: user.email,
      phone: `${user.phone.dialCode} ${user.phone.number}`,
      country: user.country,
      nationality: user.nationality,
      shippingAddress: {
        fullName: addr.fullName,
        phone: `${addr.phone.dialCode} ${addr.phone.number}`,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        landmark: addr.landmark,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
      },
      items,
      subtotal,
      discount,
      shipping,
      tax,
      grandTotal: round2(subtotal - discount + shipping),
      coupon: discount ? { code: 'WELCOME10', type: 'percentage', value: 10 } : undefined,
      shippingMethod: { code: 'standard', label: 'Carbon-Neutral Standard', eta: '5–7 business days' },
      paymentMethod: 'cod',
      paymentStatus: status === 'Delivered' ? 'Paid' : 'Pending',
      orderStatus: status,
      statusHistory: [
        { status: 'Pending', note: 'Order placed', at: createdAt },
        ...(status !== 'Pending' ? [{ status, note: 'Updated by admin', changedBy: admin?._id, at: new Date(createdAt.getTime() + DAY) }] : []),
      ],
      inventoryRestored: status === 'Cancelled',
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Order.insertMany(orders, { timestamps: false });
  await Counter.findOneAndUpdate({ _id: 'order' }, { seq: orders.length }, { upsert: true });
  console.log(`Sample orders: ${orders.length}`);
  return Order.find({ orderStatus: 'Delivered' });
}

async function seedReviews(delivered, products) {
  const seen = new Set();
  let count = 0;
  for (const order of delivered) {
    for (const item of order.items) {
      const key = `${order.user}-${item.productId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = pick(data.reviewTexts, count);
      // eslint-disable-next-line no-await-in-loop
      await Review.create({
        product: item.productId,
        user: order.user,
        order: order._id,
        rating: t.rating,
        title: t.title,
        comment: t.comment,
        isVerifiedPurchase: true,
        status: 'approved', // demo data: shown on product pages, never picked for the homepage
        helpfulCount: count % 7,
        createdAt: new Date(order.createdAt.getTime() + 5 * DAY),
      });
      count += 1;
    }
  }
  // Recompute product rating aggregates from the real reviews.
  for (const p of products) {
    // eslint-disable-next-line no-await-in-loop
    const [s] = await Review.aggregate([
      { $match: { product: p._id, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
    ]);
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ _id: p._id }, { ratingAverage: s ? round2(s.avg) : 0, ratingCount: s ? s.n : 0 });
  }
  console.log(`Reviews: ${count}`);
}

async function seedContent(admin) {
  await Coupon.insertMany(data.coupons);
  await Banner.insertMany(data.banners(new Date()));
  for (const b of data.blogs) {
    // eslint-disable-next-line no-await-in-loop
    await Blog.create({
      title: b.title,
      slug: slugify(b.title),
      excerpt: b.excerpt,
      content: b.content,
      category: b.category,
      tags: b.tags,
      coverImage: { url: `/uploads/seed/${b.cover}.jpg` },
      status: 'published',
      author: admin?._id,
      authorName: 'WILDTANE Editorial',
    });
  }
  await Setting.get();
  console.log(`Coupons: ${data.coupons.length}, banners: 2, blog posts: ${data.blogs.length}`);
}

async function seedLiveUpdates(admin) {
  if (await LiveUpdate.exists({})) return;
  await LiveUpdate.insertMany(
    data.liveUpdates.map(({ minutesAgo, ...u }) => {
      const at = new Date(Date.now() - minutesAgo * 60 * 1000);
      return { ...u, author: admin?._id, authorName: admin?.name || 'WILDTANE', createdAt: at, updatedAt: at };
    }),
    { timestamps: false }
  );
  console.log(`Live updates: ${data.liveUpdates.length}`);
}

/**
 * Adds catalogue items, posts and category photos that are missing from an existing
 * database. Never deletes or overwrites anything an admin has edited.
 */
async function topUp(admin) {
  const subByName = new Map();
  for (const top of data.categories) {
    // eslint-disable-next-line no-await-in-loop
    const parent = await Category.findOne({ slug: slugify(top.name), parent: null });
    for (const [i, child] of top.children.entries()) {
      // eslint-disable-next-line no-await-in-loop
      let sub = await Category.findOne({ slug: slugify(child.name) });
      if (!sub && parent) {
        // New subcategory added to the seed data since the store was first seeded.
        // eslint-disable-next-line no-await-in-loop
        sub = await Category.create({ name: child.name, slug: slugify(child.name), tagline: child.tagline, parent: parent._id, sortOrder: i, image: child.image ? { url: `/uploads/seed/${child.image}.jpg` } : undefined });
        console.log(`Subcategory added: ${child.name}`);
      }
      if (!sub) continue;
      subByName.set(child.name, sub);
      if (child.image && !sub.image?.url) {
        sub.image = { url: `/uploads/seed/${child.image}.jpg` };
        // eslint-disable-next-line no-await-in-loop
        await sub.save();
      }
    }
  }
  const existing = new Set((await Product.find().select('slug').lean()).map((p) => p.slug));
  const missing = data.products.filter((p) => !existing.has(slugify(p.name)) && subByName.has(p.sub));
  if (missing.length) await seedProducts(subByName, missing);
  console.log(`New products added: ${missing.length}`);

  // Derived "size group" for older products saved before the field existed.
  const sized = await Product.find().select('capacity sizeGroup').lean();
  const sizeOps = sized
    .filter((p) => p.sizeGroup !== sizeFromCapacity(p.capacity))
    .map((p) => ({ updateOne: { filter: { _id: p._id }, update: { sizeGroup: sizeFromCapacity(p.capacity) } } }));
  if (sizeOps.length) await Product.bulkWrite(sizeOps);
  console.log(`Size groups set: ${sizeOps.length}`);

  // Photos for colour options that had none (generated by the variant photo tool).
  let photoCount = 0;
  for (const [sku, file] of Object.entries(variantPhotos)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await Product.updateOne(
      { variants: { $elemMatch: { sku, 'images.0': { $exists: false } } } },
      { $set: { 'variants.$.images': [{ url: `/uploads/seed/${file}.jpg`, alt: '' }] } }
    );
    photoCount += r.modifiedCount;
  }
  console.log(`Colour photos added: ${photoCount}`);

  const posts = new Set((await Blog.find().select('slug').lean()).map((b) => b.slug));
  const newPosts = data.blogs.filter((b) => !posts.has(slugify(b.title)));
  for (const [i, b] of newPosts.entries()) {
    // eslint-disable-next-line no-await-in-loop
    await Blog.create({
      title: b.title,
      slug: slugify(b.title),
      excerpt: b.excerpt,
      content: b.content,
      category: b.category,
      tags: b.tags,
      coverImage: { url: `/uploads/seed/${b.cover}.jpg` },
      status: 'published',
      publishedAt: new Date(Date.now() - (newPosts.length - i) * DAY),
      author: admin?._id,
      authorName: 'WILDTANE Editorial',
    });
  }
  console.log(`New blog posts added: ${newPosts.length}`);
  await seedLiveUpdates(admin);
}

async function main() {
  await connectDB();
  if (fresh) await wipe();
  else if (await Product.exists({})) {
    console.log('Store already seeded. Adding anything new from the seed data (nothing is deleted)…');
    await topUp(await ensureAdmin());
    console.log('\nTop-up complete. Run `npm run seed:fresh` to wipe and reseed instead.');
    return;
  }
  const admin = await ensureAdmin();
  const subs = await seedCategories();
  const products = await seedProducts(subs);
  const customers = await seedCustomers();
  const delivered = await seedOrders(customers, products, admin);
  await seedReviews(delivered, products);
  await seedContent(admin);
  await seedLiveUpdates(admin);
  console.log('\nSeed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
