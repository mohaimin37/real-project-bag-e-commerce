/**
 * One product per photo: when several visible products show the same main photo, keep one and take
 * the rest off the storefront (user request 2026-10-13: "remove the same image item").
 *
 *   node src/seed/dedupeImages.js            → DRY RUN (read-only): lists what would change
 *   node src/seed/dedupeImages.js --apply    → applies it, writes backups/dedupe-images-<time>.json
 *   node src/seed/dedupeImages.js --undo backups/dedupe-images-<time>.json   → restores everything
 *
 * Which one stays: an original product before a section-fill one (SKU WT-F…), then the one with the
 * most reviews and sales, then the oldest.
 * What happens to the others: section-fill products (WT-F…, added the same day, no orders possible
 * to matter) are deleted — their full documents are saved in the backup so --undo recreates them.
 * Original products are only HIDDEN (isVisible: false), never deleted: they may have orders/reviews.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import env from '../config/env.js';
import Product from '../models/Product.js';

const APPLY = process.argv.includes('--apply');
const here = path.dirname(fileURLToPath(import.meta.url));
const isFill = (p) => /^WT-F\d{3}$/.test(p.sku);

await mongoose.connect(env.mongoUri);

if (process.argv.includes('--undo')) {
  const file = path.resolve(process.cwd(), process.argv[process.argv.indexOf('--undo') + 1]);
  const { hidden, deleted } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const shown = await Product.updateMany({ _id: { $in: hidden.map((h) => h._id) } }, { $set: { isVisible: true } });
  let restored = 0;
  for (const doc of deleted) {
    if (await Product.exists({ _id: doc._id })) continue;
    await Product.collection.insertOne({ ...doc, _id: new mongoose.Types.ObjectId(doc._id), category: new mongoose.Types.ObjectId(doc.category), subcategory: doc.subcategory ? new mongoose.Types.ObjectId(doc.subcategory) : null, categories: (doc.categories || []).map((c) => new mongoose.Types.ObjectId(c)), createdAt: new Date(doc.createdAt), updatedAt: new Date() });
    restored += 1;
  }
  console.log(`Shown again: ${shown.modifiedCount}. Recreated: ${restored}.`);
  await mongoose.disconnect();
  process.exit(0);
}

const products = await Product.find({ isVisible: true }).lean();
const mainPhoto = (p) => p.images?.[0]?.url || p.variants?.[0]?.images?.[0]?.url || '';
const groups = new Map();
for (const p of products) {
  const u = mainPhoto(p);
  if (u) groups.set(u, [...(groups.get(u) || []), p]);
}
// The product each seed photo was taken for (from the catalogue seed files): that one keeps the photo.
const owner = new Map();
for (const f of ['data.js', 'catalogExtra.js', 'catalogMore.js']) {
  const src = fs.readFileSync(path.join(here, f), 'utf8');
  if (f === 'data.js') {
    let last = '';
    for (const m of src.matchAll(/name:\s*'([^']+)'|img\('([a-z0-9-]+)'/g)) {
      if (m[1]) last = m[1];
      else if (!owner.has(m[2])) owner.set(m[2], last);
    }
  } else {
    for (const line of src.split('\n')) {
      const row = line.match(/^\s*\['([a-z0-9-]+)',\s*'([^']+)'/);
      if (!row) continue;
      const [, file, name] = row;
      if (!owner.has(file)) owner.set(file, name);
      for (const c of line.matchAll(/\['[^']+',\s*'#[0-9a-f]{6}',\s*'\w+',\s*'([a-z0-9-]+)'\]/gi)) if (!owner.has(c[1])) owner.set(c[1], name);
      for (const e of line.matchAll(/extra:\s*\[([^\]]*)\]/g)) for (const x of e[1].matchAll(/'([a-z0-9-]+)'/g)) if (!owner.has(x[1])) owner.set(x[1], name);
    }
  }
}
const fileOf = (url) => url.split('/').pop().replace(/\.\w+$/, '');
const isTest = (p) => /test/i.test(p.name) || /TST/i.test(p.sku);
let groupFile = '';
// The section the photo's own product lives in: a product from that section is the honest one to keep.
const allByName = new Map((await Product.find({}).select('name subcategory category').lean()).map((p) => [p.name, p]));
const sectionOf = (p) => String(p?.subcategory || p?.category || '');
const ownerSection = () => sectionOf(allByName.get(owner.get(groupFile)));
const score = (p) => [isTest(p) ? 0 : 1, owner.get(groupFile) === p.name ? 1 : 0, ownerSection() && sectionOf(p) === ownerSection() ? 1 : 0, isFill(p) ? 0 : 1, (p.ratingCount || 0) + (p.soldCount || 0), -new Date(p.createdAt).getTime()];
const better = (a, b) => { const x = score(a); const y = score(b); for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return x[i] > y[i]; return false; };

const toHide = [];
const toDelete = [];
const lines = [];
for (const [url, ps] of groups) {
  if (ps.length < 2) continue;
  groupFile = fileOf(url);
  const keep = ps.reduce((a, b) => (better(b, a) ? b : a));
  const rest = ps.filter((p) => p !== keep);
  for (const p of rest) (isFill(p) ? toDelete : toHide).push(p);
  lines.push(`${url.split('/').pop()}: keep "${keep.name}" · ${rest.map((p) => `${isFill(p) ? 'delete' : 'hide'} "${p.name}"`).join(' · ')}`);
}
console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${lines.length} shared photos · delete ${toDelete.length} new items · hide ${toHide.length} original items\n`);
console.log(lines.join('\n'));
if (!APPLY) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply.');
  await mongoose.disconnect();
  process.exit(0);
}

fs.mkdirSync(path.join(here, 'backups'), { recursive: true });
const out = path.join(here, 'backups', `dedupe-images-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
// Backup first, then write.
fs.writeFileSync(out, JSON.stringify({ hidden: toHide.map((p) => ({ _id: String(p._id), sku: p.sku, name: p.name })), deleted: toDelete }, null, 1));
const hid = await Product.updateMany({ _id: { $in: toHide.map((p) => p._id) } }, { $set: { isVisible: false } });
const del = await Product.deleteMany({ _id: { $in: toDelete.map((p) => p._id) }, sku: { $regex: /^WT-F\d{3}$/ } });
console.log(`\nHidden ${hid.modifiedCount}, deleted ${del.deletedCount}. Undo: node src/seed/dedupeImages.js --undo ${path.relative(process.cwd(), out)}`);
await mongoose.disconnect();
process.exit(0);
