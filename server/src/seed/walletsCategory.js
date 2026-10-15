/**
 * Makes Wallets a main category (user request 2026-10-14: "add wallet category … put items in wallet
 * subcategories"), so Men / Women / Universal show a Wallets circle like Bags and Clothing.
 *
 *   node src/seed/walletsCategory.js            → DRY RUN (read-only): lists what would change
 *   node src/seed/walletsCategory.js --apply    → applies it, writes backups/wallets-category-<time>.json first
 *   node src/seed/walletsCategory.js --undo src/seed/backups/wallets-category-<time>.json  → puts everything back
 *
 * What it does:
 *  1. The existing "Wallets" category (slug `wallets`, under Accessories) becomes top-level, so
 *     /shop/wallets keeps working.
 *  2. Its subcategories: Bifold & Trifold, Slim & MagSafe, Card Holders, Coin & Zip, Travel & Passport
 *     (existing ones are renamed / reused, missing ones are created).
 *  3. Every wallet product (now under Accessories › Wallets, plus passport *wallets*) gets
 *     category = Wallets and the matching subcategory, by its name.
 * Nothing is deleted. Passport *covers* stay under Accessories › Passport Holders.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import env from '../config/env.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const APPLY = process.argv.includes('--apply');
const here = path.dirname(fileURLToPath(import.meta.url));
const oid = (v) => (v ? new mongoose.Types.ObjectId(String(v)) : null);

await mongoose.connect(env.mongoUri);

if (process.argv.includes('--undo')) {
  const file = path.resolve(process.cwd(), process.argv[process.argv.indexOf('--undo') + 1]);
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const c of backup.categories) {
    await Category.collection.updateOne({ _id: oid(c._id) }, { $set: { parent: oid(c.parent), name: c.name, level: c.level, sortOrder: c.sortOrder, image: c.image || null, showInMenu: c.showInMenu, tagline: c.tagline || '' } });
  }
  const created = await Category.deleteMany({ _id: { $in: backup.createdCategories.map(oid) } });
  for (const p of backup.products) {
    await Product.collection.updateOne({ _id: oid(p._id) }, { $set: { category: oid(p.category), subcategory: oid(p.subcategory) } });
  }
  console.log(`Restored ${backup.categories.length} categories, removed ${created.deletedCount} created ones, restored ${backup.products.length} products.`);
  await mongoose.disconnect();
  process.exit(0);
}

const wallets = await Category.findOne({ slug: 'wallets' }).lean();
if (!wallets) throw new Error('Category "wallets" not found');

// Subcategories under Wallets: [slug, name, tagline, existing slug to reuse]
const SUBS = [
  ['bifold-wallets', 'Bifold & Trifold Wallets', 'Classic leather wallets with card slots and a note pocket', null],
  ['slim-wallets', 'Slim & MagSafe Wallets', 'Thin, light wallets for front pockets and phones', null],
  ['card-holders', 'Card Holders', 'A few cards and folded notes, nothing more', 'card-holders'],
  ['coin-purses', 'Coin & Zip Wallets', 'Zip-around wallets and coin pouches', 'coin-purses'],
  ['travel-wallets', 'Travel & Passport Wallets', 'Passports, boarding passes and travel cards together', 'travel-wallets'],
];

/** Which subcategory a wallet goes in, from its name. */
function pick(name) {
  const n = name.toLowerCase();
  if (/passport/.test(n)) return 'travel-wallets';
  if (/card (holder|sleeve)|cardholder/.test(n)) return 'card-holders';
  if (/coin|zip/.test(n)) return 'coin-purses';
  if (/bifold|trifold/.test(n)) return 'bifold-wallets';
  if (/slim|magsafe|minimal/.test(n)) return 'slim-wallets';
  return 'bifold-wallets';
}

const passportHolders = await Category.findOne({ slug: 'passport-holders' }).lean();
const products = await Product.find({
  $or: [{ subcategory: wallets._id }, { category: wallets._id }, ...(passportHolders ? [{ subcategory: passportHolders._id, name: /passport wallet/i }] : [])],
}).select('name sku category subcategory isVisible').lean();

const existingSubs = await Category.find({ slug: { $in: SUBS.map((s) => s[0]) } }).lean();
const plan = products.map((p) => ({ p, to: pick(p.name) }));

console.log(`Wallets category: ${wallets.name} (parent ${wallets.parent || 'none'}) → becomes a main category`);
for (const [slug, name] of SUBS) console.log(`  subcategory ${existingSubs.some((c) => c.slug === slug) ? 'reuse ' : 'CREATE'} ${slug} → "${name}"`);
console.log(`\n${products.length} products:`);
for (const { p, to } of plan) console.log(`  ${p.isVisible ? ' ' : '(hidden)'} ${p.name.padEnd(48)} → ${to}`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing changed. Run with --apply to make these changes.');
  await mongoose.disconnect();
  process.exit(0);
}

// Backup first: every category and product this touches, as it is now.
const touchedCats = await Category.find({ _id: { $in: [wallets._id, ...existingSubs.map((c) => c._id)] } }).lean();
const backup = { at: new Date().toISOString(), categories: touchedCats, createdCategories: [], products: products.map((p) => ({ _id: p._id, category: p.category, subcategory: p.subcategory })) };
fs.mkdirSync(path.join(here, 'backups'), { recursive: true });
const file = path.join(here, 'backups', `wallets-category-${backup.at.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(backup, null, 2));

// 1. Wallets → main category, with a real wallet photo if it has none.
const photo = (await Product.findOne({ _id: { $in: products.map((p) => p._id) }, isVisible: true, 'images.0.url': { $exists: true } }).select('images').lean())?.images?.[0]?.url;
await Category.updateOne(
  { _id: wallets._id },
  { $set: { parent: null, level: 1, sortOrder: 15, showInMenu: true, tagline: wallets.tagline || 'Leather wallets, card holders and travel wallets', ...(wallets.image?.url ? {} : photo ? { image: { url: photo } } : {}) } }
);

// 2. Subcategories.
const subIds = {};
for (const [i, [slug, name, tagline]] of SUBS.entries()) {
  const found = existingSubs.find((c) => c.slug === slug);
  if (found) {
    await Category.updateOne({ _id: found._id }, { $set: { parent: wallets._id, name, tagline, level: 2, sortOrder: i, isActive: true } });
    subIds[slug] = found._id;
  } else {
    const c = await Category.create({ slug, name, tagline, parent: wallets._id, level: 2, sortOrder: i, department: 'all' });
    backup.createdCategories.push(c._id);
    subIds[slug] = c._id;
  }
}
fs.writeFileSync(file, JSON.stringify(backup, null, 2)); // now includes the created ids, for --undo

// 3. Products.
for (const { p, to } of plan) {
  await Product.updateOne({ _id: p._id }, { $set: { category: wallets._id, subcategory: subIds[to] } });
}

console.log(`\nDone. Backup: ${path.relative(process.cwd(), file)}`);
console.log(`Undo: node src/seed/walletsCategory.js --undo ${path.relative(process.cwd(), file)}`);
await mongoose.disconnect();
