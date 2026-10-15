/**
 * More Wallets and Perfumes (2026-10-14, user request: "add more items in wallet and perfume").
 * Photos: CC0 / public-domain images from rawpixel and StockSnap (found via the Openverse API),
 * checked by eye for logos and brand names, saved to uploads/seed/catalog/ and credited in CREDITS.md.
 * Ratings, reviews and sales start at 0 (nothing invented).
 *
 *   node src/seed/walletsPerfumesMore.js            → DRY RUN (downloads nothing, writes nothing)
 *   node src/seed/walletsPerfumesMore.js --apply    → downloads photos, creates products,
 *                                                      writes backups/wallets-perfumes-more-<time>.json
 *   node src/seed/walletsPerfumesMore.js --undo src/seed/backups/wallets-perfumes-more-<time>.json
 *
 * Needs the Wallets main category (src/seed/walletsCategory.js) and Perfumes (clothingPerfume.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import sharp from 'sharp';
import env from '../config/env.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

const APPLY = process.argv.includes('--apply');
const here = path.dirname(fileURLToPath(import.meta.url));
const photoDir = path.resolve(here, '../../uploads/seed/catalog');
const SKU_RE = /^WT-(WL\d{2}|PF(0[8-9]|1\d))$/;

// [file, photo url, source page, creator, provider]
const PHOTOS = {
  'wl-tan-bifold': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg2Njk5MzMtaW1hZ2Uta3d5b3hqZDEuanBn.jpg', 'https://www.rawpixel.com/image/5947687/free-public-domain-cc0-photo', '', 'rawpixel'],
  'wl-espresso-stitched': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg3NjAyMDAtaW1hZ2Uta3d5b256bnguanBn.jpg', 'https://www.rawpixel.com/image/5945784/free-public-domain-cc0-photo', '', 'rawpixel'],
  'wl-charcoal-coin-pocket': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg5MjczMjYtaW1hZ2Uta3d2eGRidXMuanBn.jpg', 'https://www.rawpixel.com/image/5920849/empty-wallet-free-public-domain-cc0-image', '', 'rawpixel'],
  'wl-black-key-case': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJsZWF0aGVyX2tleV9jYXNlX3dhbGxldC1pbWFnZS1reWNnZmluay5qcGc.jpg', 'https://www.rawpixel.com/image/6057787/free-public-domain-cc0-photo', '', 'rawpixel'],
  'wl-black-coin-pouch': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvcHgxMzU2MTA5LWltYWdlLWt3eXFraHk5LmpwZw.jpg', 'https://www.rawpixel.com/image/5957959/free-public-domain-cc0-photo', '', 'rawpixel'],
  'wl-walnut-pocket': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTA2MjcwMS1pbWFnZS1rd3Z3ZHU5YS5qcGc.jpg', 'https://www.rawpixel.com/image/5914361/image-public-domain-person-money', '', 'rawpixel'],
  'pf-amber-ribbon': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZycGVyZnVtZV9ib3R0bGVfZ2xhc3NfY29zbWV0aWNzXzItaW1hZ2Uta3liZDFsemIuanBn.jpg', 'https://www.rawpixel.com/image/6033978/perfume-free-public-domain-cc0-photo', '', 'rawpixel'],
  'pf-calendula-oil': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTQzMzI2My1pbWFnZS1rd3Z2dXo5OC5qcGc.jpg', 'https://www.rawpixel.com/image/5910756/image-flower-public-domain-nature', '', 'rawpixel'],
  'pf-herb-oil-duo': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTQzMzY1Ny1pbWFnZS1rd3Z2dmNnMi5qcGc.jpg', 'https://www.rawpixel.com/image/5911014/image-flower-public-domain-glass', '', 'rawpixel'],
  'pf-oud-dropper': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMjMzLWltYWdlLmpwZw.jpg', 'https://www.rawpixel.com/image/11515770/dropper-bottle-blank-retro-label', '', 'rawpixel'],
  'pf-saffron-oil': ['https://cdn.stocksnap.io/img-thumbs/960w/GZAJOCOQCW.jpg', 'https://stocksnap.io/photo/cosmetics-care-GZAJOCOQCW', 'Authentic Stock', 'StockSnap'],
};

// [sku, photo, name, subcategory slug, gender, price, sale, colour, hex, family, materials, opts]
const PRODUCTS = [
  ['WT-WL01', 'wl-tan-bifold', 'Classic Tan Leather Bifold', 'bifold-wallets', 'men', 1799, 1499, 'Tan', '#8a5a3c', 'brown', ['Leather'], { lead: 'A slim tan leather bifold', detail: 'Six card slots and a full-length note pocket in smooth leather with a contrast lining.' }],
  ['WT-WL02', 'wl-espresso-stitched', 'Espresso Stitched Bifold', 'bifold-wallets', 'men', 1999, null, 'Espresso Brown', '#4a3024', 'brown', ['Leather'], { lead: 'A hand-stitched leather bifold', detail: 'Pebbled dark-brown leather with tan contrast stitching all round; card slots and a note pocket.' }],
  ['WT-WL03', 'wl-charcoal-coin-pocket', 'Charcoal Coin-Pocket Wallet', 'bifold-wallets', 'men', 1699, null, 'Charcoal', '#4a4a48', 'grey', ['Leather'], { lead: 'A bifold with a snap coin pocket', detail: 'Four card slots, a note pocket and a snap-shut coin pocket, so change stays put.' }],
  ['WT-WL04', 'wl-black-key-case', 'Black Leather Key Case', 'coin-purses', 'unisex', 899, 749, 'Black', '#161616', 'onyx', ['Leather'], { badge: 'Keys & Cards', lead: 'A snap-close key case', detail: 'Keeps keys from scratching your phone; snap fastenings and a clip for the key ring.' }],
  ['WT-WL05', 'wl-black-coin-pouch', 'Black Leather Coin Pouch Wallet', 'coin-purses', 'women', 1099, null, 'Black', '#1b1b1b', 'onyx', ['Leather'], { lead: 'A wallet with a deep coin pouch', detail: 'A wide snap coin pouch beside card slots, in soft black leather.' }],
  ['WT-WL06', 'wl-walnut-pocket', 'Walnut Slim Pocket Wallet', 'slim-wallets', 'unisex', 1399, null, 'Walnut Brown', '#6b3f26', 'brown', ['Leather'], { lead: 'A slim front-pocket wallet', detail: 'Folds notes and a few cards into a thin wallet that sits flat in a trouser pocket.' }],
  ['WT-PF08', 'pf-amber-ribbon', 'Amber Ribbon Eau de Parfum', 'perfumes-eau-de-parfum', 'women', 2799, 2399, 'Amber', '#c8641e', 'orange', ['Eau de Parfum'], { capacity: '50ml', lead: 'A warm amber fragrance', detail: 'Soft amber and vanilla in a sculpted glass bottle with a ribbon-cut pattern.' }],
  ['WT-PF09', 'pf-calendula-oil', 'Calendula Perfume Oil', 'perfumes-attars', 'women', 1199, null, 'Golden', '#e8d27a', 'tan', ['Perfume Oil'], { capacity: '10ml', badge: 'Alcohol-free', lead: 'A light floral perfume oil', detail: 'A bright floral oil in a corked glass vial; a drop on the wrist is enough.' }],
  ['WT-PF10', 'pf-herb-oil-duo', 'Rosemary & Wildflower Oil Duo', 'perfumes-minis', 'unisex', 1299, null, 'Clear', '#d8d3b8', 'cream', ['Perfume Oil'], { capacity: '2 × 8ml', badge: 'Travel Size', lead: 'Two small herbal perfume oils', detail: 'A green rosemary oil and a soft wildflower oil in corked vials that fit any bag.' }],
  ['WT-PF11', 'pf-oud-dropper', 'Oud Attar Dropper', 'perfumes-attars', 'men', 1899, 1599, 'Amber', '#7a4a1e', 'brown', ['Attar'], { capacity: '30ml', badge: 'Alcohol-free', lead: 'A deep, woody attar', detail: 'A rich oud-style attar in an amber glass dropper bottle; apply a few drops to pulse points.' }],
  ['WT-PF12', 'pf-saffron-oil', 'Saffron Amber Perfume Oil', 'perfumes-attars', 'unisex', 1499, null, 'Saffron', '#d9771f', 'orange', ['Perfume Oil'], { capacity: '15ml', badge: 'Alcohol-free', lead: 'A warm saffron perfume oil', detail: 'Saffron and amber in a glass dropper bottle with a gold-tone cap.' }],
];

await mongoose.connect(env.mongoUri);

if (process.argv.includes('--undo')) {
  const file = path.resolve(process.cwd(), process.argv[process.argv.indexOf('--undo') + 1]);
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = await Product.deleteMany({ _id: { $in: b.products.map((x) => x._id) }, sku: { $regex: SKU_RE } });
  console.log(`Deleted ${p.deletedCount} products.`);
  await mongoose.disconnect();
  process.exit(0);
}

const subs = new Map((await Category.find({ slug: { $in: [...new Set(PRODUCTS.map((p) => p[3]))] } }).lean()).map((c) => [c.slug, c]));
const missing = [...new Set(PRODUCTS.map((p) => p[3]))].filter((s) => !subs.has(s));
if (missing.length) throw new Error(`Missing subcategories: ${missing.join(', ')} — run walletsCategory.js / clothingPerfume.js first`);
const noUrl = Object.entries(PHOTOS).filter(([, v]) => !v[0]).map(([k]) => k);
if (noUrl.length) throw new Error(`Photo URLs missing for: ${noUrl.join(', ')}`);

console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${PRODUCTS.length} products`);
for (const p of PRODUCTS) console.log(`  ${(await Product.exists({ sku: p[0] })) ? '=' : '+'} ${p[0]} ${p[2]} → ${p[3]} (${p[4]}, ₹${p[6] || p[5]})`);
if (!APPLY) {
  console.log('\nDRY RUN — nothing downloaded or written. Re-run with --apply.');
  await mongoose.disconnect();
  process.exit(0);
}

// 1. Photos (resized to 1200px, JPEG) + credits.
fs.mkdirSync(photoDir, { recursive: true });
const credits = [];
for (const [file, [url, source, creator, provider]] of Object.entries(PHOTOS)) {
  const dest = path.join(photoDir, `${file}.jpg`);
  if (!fs.existsSync(dest)) {
    const res = await fetch(url, { headers: { 'User-Agent': 'wildtane-catalogue/1.0' } });
    if (!res.ok) throw new Error(`Photo ${file} failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(dest);
    console.log(`  photo ${file}.jpg`);
  }
  credits.push(`| catalog/${file}.jpg | ${source} | ${creator || '—'} (${provider}, CC0) |`);
}
const creditsFile = path.resolve(here, '../../uploads/seed/CREDITS.md');
if (!fs.readFileSync(creditsFile, 'utf8').includes('More Wallets & Perfumes (CC0)')) {
  fs.appendFileSync(creditsFile, `\n\n## More Wallets & Perfumes (CC0)\n\nPublic-domain (CC0) photos from rawpixel and StockSnap, found via openverse.org. No attribution is required; credited as a courtesy.\n\n| File | Source | Creator |\n|---|---|---|\n${credits.join('\n')}\n`);
}

// 2. Products.
const slugify = (s) => s.toLowerCase().replace(/[’'()]/g, '').replace(/&/g, 'and').replace(/×/g, 'x').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const created = { products: [] };
let n = 0;
for (const [sku, photo, name, section, gender, price, sale, colour, hex, family, materials, o] of PRODUCTS) {
  n += 1;
  if (await Product.exists({ sku })) continue;
  const sub = subs.get(section);
  const pic = { url: `/uploads/seed/catalog/${photo}.jpg` };
  let slug = slugify(name);
  for (let k = 2; await Product.exists({ slug }); k += 1) slug = `${slugify(name)}-${k}`;
  const doc = await Product.create({
    name, slug, sku,
    tagline: (o.capacity ? `${o.capacity} ${sub.name.replace(/s$/, '')}` : sub.name.replace(/s$/, '')).slice(0, 80),
    badge: o.badge || 'New',
    shortDescription: `${o.lead} in ${colour.toLowerCase()}. ${o.detail}`.slice(0, 300),
    description: `${name} — ${o.lead.toLowerCase()} made from ${materials.join(' and ').toLowerCase()}. ${o.detail}`,
    category: sub.parent,
    subcategory: sub._id,
    gender,
    price,
    salePrice: sale || null,
    capacity: o.capacity || '',
    images: [{ ...pic, alt: `${name} in ${colour}` }],
    variants: [{ name: colour, colorHex: hex, colorFamily: family, sku: `${sku}-1`, stock: 12 + ((n * 7) % 18), images: [{ ...pic, alt: name }] }],
    materials,
    purposes: ['everyday'],
    tags: [sub.name.toLowerCase(), ...materials.map((m) => m.toLowerCase())],
    specifications: [o.capacity && { label: 'Size', value: o.capacity }, { label: 'Material', value: materials.join(', ') }, { label: 'Colour', value: colour }].filter(Boolean),
    careInstructions: section.startsWith('perfumes') ? 'Store away from direct sunlight and heat. Keep the cap closed.' : 'Wipe with a soft dry cloth. Keep away from water and direct heat.',
    isNewArrival: true,
    isFeatured: false,
    isBestseller: false,
    isVisible: true,
    ratingAverage: 0,
    ratingCount: 0,
    soldCount: 0,
  });
  created.products.push({ _id: String(doc._id), sku, name, slug: doc.slug });
}

fs.mkdirSync(path.join(here, 'backups'), { recursive: true });
const out = path.join(here, 'backups', `wallets-perfumes-more-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(out, JSON.stringify(created, null, 1));
console.log(`\nCreated ${created.products.length} products. Undo: node src/seed/walletsPerfumesMore.js --undo ${path.relative(process.cwd(), out)}`);
await mongoose.disconnect();
process.exit(0);
