/**
 * Fills the visible sections to at least 10 products (rows in catalogFill.js).
 *
 *   node src/seed/fillSections.js            → DRY RUN (read-only): prints the plan per section
 *   node src/seed/fillSections.js --apply    → creates the products, writes backups/fill-sections-<time>.json
 *   node src/seed/fillSections.js --undo backups/fill-sections-<time>.json   → deletes exactly those products
 *
 * Each row names a store photo (checked by eye); the colour is taken from the product that already
 * uses that photo, so listing and picture agree. Ratings and sales start at 0 (nothing invented).
 * Idempotent: rows whose SKU already exists are skipped. SKUs: WT-F001…
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import env from '../config/env.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { FILL_ROWS, FILL_BLURB } from './catalogFill.js';
import { BLURB } from './catalogExtra.js';

const APPLY = process.argv.includes('--apply');
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(here, '../..');
const SKU_RE = /^WT-F\d{3}$/;

await mongoose.connect(env.mongoUri);

if (process.argv.includes('--undo')) {
  const file = path.resolve(process.cwd(), process.argv[process.argv.indexOf('--undo') + 1]);
  const { created } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const res = await Product.deleteMany({ _id: { $in: created.map((c) => c._id) }, sku: { $regex: SKU_RE } });
  console.log(`Deleted ${res.deletedCount} of ${created.length} products listed in ${path.basename(file)}.`);
  await mongoose.disconnect();
  process.exit(0);
}

const cats = await Category.find({}).lean();
const byId = new Map(cats.map((c) => [String(c._id), c]));
const bySlug = new Map(cats.map((c) => [c.slug, c]));
const rootOf = (c) => { let x = c; while (x?.parent) x = byId.get(String(x.parent)); return x; };
const sectionFilter = (c) => ({ isVisible: true, $or: [{ category: c._id }, { subcategory: c._id }, { categories: c._id }, { productType: c._id }] });
const slugify = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/["″]/g, '-inch').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Photo file name → the image and the colour it shows (from the product that already uses it).
const photos = new Map();
for (const p of await Product.find({ sku: { $not: SKU_RE } }).select('images variants').lean()) {
  const add = (url, v) => {
    const key = url?.split('/').pop().replace(/\.\w+$/, '');
    if (key && !photos.has(key)) photos.set(key, { url, colour: v?.name, hex: v?.colorHex, family: v?.colorFamily });
  };
  for (const v of p.variants || []) for (const im of v.images || []) add(im.url, v);
  for (const im of p.images || []) add(im.url, p.variants?.[0]);
}

const blurbKey = { keychains: 'Keychains', 'toiletry-kits': 'Toiletry Kits', 'crossbody-bags': 'Crossbody Bags', daypacks: 'Daypacks', backpacks: 'Backpacks' };
const plan = [];
const problems = [];
let n = 0;
for (const [photo, name, sectionSlug, price, salePrice, capacity, o = {}] of FILL_ROWS) {
  n += 1;
  const sku = `WT-F${String(n).padStart(3, '0')}`;
  const section = bySlug.get(sectionSlug);
  const also = (o.also || []).map((s) => bySlug.get(s));
  const pic = photos.get(photo);
  if (!section) { problems.push(`${sku}: section "${sectionSlug}" not found`); continue; }
  if (also.some((a) => !a)) { problems.push(`${sku}: an "also" section was not found (${o.also})`); continue; }
  if (!pic) { problems.push(`${sku}: photo "${photo}" is not used by any product`); continue; }
  if (!fs.existsSync(path.join(uploadsRoot, pic.url))) { problems.push(`${sku}: photo file missing on disk (${pic.url})`); continue; }
  const colour = pic.colour || 'Classic';
  const [lead, detail] = FILL_BLURB[blurbKey[sectionSlug]] || BLURB[blurbKey[sectionSlug]] || BLURB[section.name] || FILL_BLURB[section.name] || ['A versatile everyday piece', 'Made to be used every day.'];
  const materials = o.materials || [];
  const stock = 15 + ((n * 37) % 26); // 15–40
  const root = rootOf(section);
  const type = section.name.replace(/ & .*$/, '').replace(/s$/, '');
  plan.push({
    section: sectionSlug,
    doc: {
      name,
      slug: slugify(name),
      sku,
      tagline: (capacity && !capacity.includes('×') ? `${capacity} ${type}` : type).slice(0, 80),
      badge: o.badge || 'New',
      shortDescription: `${lead} in ${colour.toLowerCase()}${materials[0] ? ` ${materials[0].toLowerCase()}` : ''}. ${detail}`.slice(0, 300),
      description: `${name} is ${lead.toLowerCase()} made from ${materials.length ? materials.join(' and ').toLowerCase() : 'durable materials'}. ${detail} Every WILDTANE piece is backed by our lifetime repair promise.`,
      category: root._id,
      subcategory: String(section._id) === String(root._id) ? null : section._id,
      categories: also.map((a) => a._id),
      gender: o.gender || 'unisex',
      price,
      salePrice: salePrice || null,
      capacity: capacity || '',
      images: [{ url: pic.url, alt: `${name} in ${colour}` }],
      variants: [{ name: colour, colorHex: pic.hex || '#111111', colorFamily: pic.family || '', sku: `${sku}-1`, stock, images: [{ url: pic.url, alt: name }] }],
      materials,
      features: o.features || [],
      purposes: o.purposes || [],
      tags: [section.name.toLowerCase(), ...materials.map((m) => m.toLowerCase())],
      specifications: [capacity && { label: 'Capacity', value: capacity }, materials.length && { label: 'Material', value: materials.join(', ') }, { label: 'Colour', value: colour }].filter(Boolean),
      isNewArrival: true,
      isFeatured: false,
      isBestseller: false,
      isVisible: true,
      ratingAverage: 0,
      ratingCount: 0,
      soldCount: 0,
    },
  });
}

console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${plan.length} products, ${problems.length} problems\n`);
const sectionSlugs = [...new Set(FILL_ROWS.flatMap((r) => [r[2], ...((r[6] || {}).also || [])]))];
for (const s of sectionSlugs) {
  const c = bySlug.get(s);
  if (!c) continue;
  const before = await Product.countDocuments({ ...sectionFilter(c), sku: { $not: SKU_RE } });
  const add = plan.filter((p) => p.section === s || p.doc.categories.some((id) => String(id) === String(c._id))).length;
  console.log(`  ${String(before).padStart(3)} → ${String(before + add).padStart(3)}  ${s}`);
}
if (problems.length) console.log(`\nProblems:\n  ${problems.join('\n  ')}`);
fs.mkdirSync(path.join(here, 'backups'), { recursive: true });
if (!APPLY) {
  fs.writeFileSync(path.join(here, 'backups', 'fill-sections-plan.json'), JSON.stringify(plan.map((p) => ({ sku: p.doc.sku, name: p.doc.name, section: p.section, colour: p.doc.variants[0].name, photo: p.doc.images[0].url, price: p.doc.price, gender: p.doc.gender })), null, 1));
  console.log('\nDRY RUN — nothing written. Plan saved to backups/fill-sections-plan.json. Re-run with --apply.');
  await mongoose.disconnect();
  process.exit(0);
}
if (problems.length) { console.log('Fix the problems first; nothing was written.'); await mongoose.disconnect(); process.exit(1); }

const created = [];
const skipped = [];
for (const p of plan) {
  if (await Product.exists({ sku: p.doc.sku })) { skipped.push(p.doc.sku); continue; }
  let slug = p.doc.slug;
  for (let k = 2; await Product.exists({ slug }); k += 1) slug = `${p.doc.slug}-${k}`;
  const doc = await Product.create({ ...p.doc, slug });
  created.push({ _id: String(doc._id), sku: doc.sku, name: doc.name, slug: doc.slug });
}
const out = path.join(here, 'backups', `fill-sections-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(out, JSON.stringify({ created, skipped }, null, 1));
console.log(`\nCreated ${created.length}, skipped ${skipped.length} (already there). Undo list: ${path.relative(process.cwd(), out)}`);
await mongoose.disconnect();
process.exit(0);
