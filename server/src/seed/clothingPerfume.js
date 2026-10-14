/**
 * Two new departments: Clothing and Perfumes (2026-10-13, user request), with products.
 * Photos: CC0 / public-domain images from StockSnap and rawpixel (found via the Openverse API),
 * checked by eye for logos and brand names, saved to uploads/seed/catalog/ and credited in CREDITS.md.
 *
 *   node src/seed/clothingPerfume.js            → DRY RUN (downloads nothing, writes nothing)
 *   node src/seed/clothingPerfume.js --apply    → downloads photos, creates categories + products,
 *                                                  writes backups/clothing-perfume-<time>.json
 *   node src/seed/clothingPerfume.js --undo backups/clothing-perfume-<time>.json
 *
 * Clothing has sizes (S–XL) as variants of one colour; ratings and sales start at 0.
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
const SKU_RE = /^WT-(CL|PF)\d{2}$/;

// Departments and their sections. [slug, name, tagline, icon]
const DEPARTMENTS = [
  {
    slug: 'clothing', name: 'Clothing', tagline: 'Everyday clothes to wear with your bags', icon: 'checkroom',
    children: [
      ['clothing-t-shirts', 'T-Shirts', 'Soft cotton tees for every day', 'apparel'],
      ['clothing-shirts', 'Shirts', 'Oxford, denim and flannel shirts', 'checkroom'],
      ['clothing-jackets', 'Jackets', 'Denim, quilted and tailored layers', 'styler'],
      ['clothing-knitwear', 'Knitwear & Hoodies', 'Warm knits and easy hoodies', 'checkroom'],
      ['clothing-jeans', 'Jeans', 'Classic denim that lasts', 'apparel'],
      ['clothing-dresses', 'Dresses', 'Easy dresses for warm days', 'apparel'],
    ],
  },
  {
    slug: 'fragrance', name: 'Perfumes', tagline: 'Fragrances and perfume oils', icon: 'local_florist',
    children: [
      ['perfumes-eau-de-parfum', 'Eau de Parfum', 'Long-lasting everyday scents', 'local_florist'],
      ['perfumes-attars', 'Attars & Perfume Oils', 'Alcohol-free oils that stay close to the skin', 'water_drop'],
      ['perfumes-minis', 'Minis & Travel Sizes', 'Small bottles for your bag', 'luggage'],
    ],
  },
];

// [file, photo url, source page, creator, provider]
const PHOTOS = {
  'pf-oils-amber-green': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZyYm90dGxlc19hbGNvaG9sX2Zvcm1fdGhyZWUtaW1hZ2Uta3liYzBmb2ouanBn.jpg', 'https://www.rawpixel.com/image/6027555/perfume-bottles-free-public-domain-cc0-photo', '', 'rawpixel'],
  'pf-oil-cork-floral': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4MTQzMzY2NS1pbWFnZS1rd3Z2dnR3OC5qcGc.jpg', 'https://www.rawpixel.com/image/5910911/image-flower-public-domain-floral', '', 'rawpixel'],
  'pf-edp-trio': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHg2MTE1MzUtaW1hZ2Uta3d2eG51ZHUuanBn.jpg', 'https://www.rawpixel.com/image/5922636/photo-image-public-domain-wooden-table', '', 'rawpixel'],
  'pf-edp-amber-blossom': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2ZycGVyZnVtZV9ib3R0bGVfZ2xhc3NfY29zbWV0aWNzXzctaW1hZ2Uta3liYXdzMTYuanBn.jpg', 'https://www.rawpixel.com/image/6020133/photo-image-public-domain-white-flower-free', '', 'rawpixel'],
  'pf-edp-violet-bloom': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJwZXJmdW1lX2JvdHRsZV9nbGFzc19jb3NtZXRpY3MtaW1hZ2Uta3liZDBpdGkuanBn.jpg', 'https://www.rawpixel.com/image/6033727/photo-image-flower-public-domain-plant', '', 'rawpixel'],
  'pf-mini-teal': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA3L21pYTE5NjQyLWltYWdlLmpwZw.jpg', 'https://www.rawpixel.com/image/7475778/perfume-bottle', '', 'rawpixel'],
  'pf-mini-cobalt': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA4L2xyL21pYTE5NjQzLWltYWdlLmpwZw.jpg', 'https://www.rawpixel.com/image/7656646/photo-image-vintage-art-public-domain', '', 'rawpixel'],
  'cl-tees-rail': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvdXB3azYxODQzMDM4LXdpa2ltZWRpYS1pbWFnZS1rb3dwb3lmZy5qcGc.jpg', 'https://www.rawpixel.com/image/3301357/free-photo-image-t-shirt-shirt-color-clothes-hanging', '', 'rawpixel'],
  'cl-tees-stack': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTA0L2JzMjQyLWltYWdlLmpwZw.jpg', 'https://www.rawpixel.com/image/11515803/stack-folded-t-shirts', '', 'rawpixel'],
  'cl-tee-white-hanger': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL2JzMzYzLWltYWdlLWt3dnluY28yLmpwZw.jpg', 'https://www.rawpixel.com/image/5928383/photo-image-public-domain-t-shirt-free', '', 'rawpixel'],
  'cl-shirt-stripe': ['https://cdn.stocksnap.io/img-thumbs/960w/XSIAE0X9G9.jpg', 'https://stocksnap.io/photo/suitcase-shirt-XSIAE0X9G9', 'Angelina Litvin', 'StockSnap'],
  'cl-shirt-denim': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvZnJzaGlydHNfdGhpbmdzX3RvcF92aWV3LWltYWdlLWt5YmNzb2xmLmpwZw.jpg', 'https://www.rawpixel.com/image/6032758/demin-shirt-free-public-domain-cc0-photo', '', 'rawpixel'],
  'cl-shirt-flannel': ['https://cdn.stocksnap.io/img-thumbs/960w/381E9A13D0.jpg', 'https://stocksnap.io/photo/plaid-shirt-381E9A13D0', 'Daria Nepriakhina', 'StockSnap'],
  'cl-jacket-corduroy': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTAyL2xhY21hMjE0NTAxLWltYWdlLmpwZw.jpg', 'https://www.rawpixel.com/image/11800499/mans-shooting-jacket-and-vest', 'LACMA (public domain)', 'rawpixel'],
  'cl-jacket-puffer': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvZnJlZXJhbmdlcGV4ZWxzMDE1NDUtaW1hZ2Uta3d2d3pjemIuanBn.jpg', 'https://www.rawpixel.com/image/5918315/down-jacket-free-public-domain-cc0-photo', '', 'rawpixel'],
  'cl-blazer-navy': ['https://cdn.stocksnap.io/img-thumbs/960w/J18ZCO3IPA.jpg', 'https://stocksnap.io/photo/suit-jacket-J18ZCO3IPA', 'Olu Eletu', 'StockSnap'],
  'cl-jacket-denim-light': ['https://cdn.stocksnap.io/img-thumbs/960w/UMLWILXWPK.jpg', 'https://stocksnap.io/photo/blue-denim-UMLWILXWPK', 'Benjamin Voros', 'StockSnap'],
  'cl-overshirt-denim': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL2xyL3NtaXRoc25ubWFhaGMyMDA3MzU2MTAwMS1pbWFnZS5qcGc.jpg', 'https://www.rawpixel.com/image/8849885/denim-jacket-designed-arthur-mcgee', 'Smithsonian NMAAHC (CC0)', 'rawpixel'],
  'cl-knit-chunky': ['https://cdn.stocksnap.io/img-thumbs/960w/OA0AFM3HYZ.jpg', 'https://stocksnap.io/photo/clothes-sweaters-OA0AFM3HYZ', 'Michal Kulesza', 'StockSnap'],
  'cl-knit-puff-sleeve': ['https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTExL2xyL21ldDE1NTc5MS1pbWFnZS5qcGc.jpg', 'https://www.rawpixel.com/image/12850726/sweater', 'The Met (CC0)', 'rawpixel'],
  'cl-hoodie-pink': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvdXB3azYxODIwNjQ3LXdpa2ltZWRpYS1pbWFnZS1rb3dsMm10ei5qcGc.jpg', 'https://www.rawpixel.com/image/3292744/free-photo-image-apparel-banister-blossom', '', 'rawpixel'],
  'cl-jeans-classic': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvcHgxMzQ5NDUwLWltYWdlLWt3dncxaW5nLmpwZw.jpg', 'https://www.rawpixel.com/image/5912112/image-public-domain-blue-fashion', '', 'rawpixel'],
  'cl-jeans-straight': ['https://cdn.stocksnap.io/img-thumbs/960w/BCRQWOTPWM.jpg', 'https://stocksnap.io/photo/blue-jeans-BCRQWOTPWM', 'Seacoast Sage', 'StockSnap'],
  'cl-dress-floral': ['https://cdn.stocksnap.io/img-thumbs/960w/KDQ60E3BPD.jpg', 'https://stocksnap.io/photo/woman-dress-KDQ60E3BPD', 'Valeria Boltneva', 'StockSnap'],
  'cl-dress-sundress': ['https://cdn.stocksnap.io/img-thumbs/960w/7HIJXYHAC3.jpg', 'https://stocksnap.io/photo/girl-dress-7HIJXYHAC3', 'Matt Moloney', 'StockSnap'],
  'cl-dress-white': ['https://cdn.stocksnap.io/img-thumbs/960w/OO6YBBXJAB.jpg', 'https://stocksnap.io/photo/woman-dress-OO6YBBXJAB', 'Matt Bango', 'StockSnap'],
};

const SIZES = ['S', 'M', 'L', 'XL'];
// [sku, photo, name, section, gender, price, sale, colour, hex, family, materials, opts]
const PRODUCTS = [
  // Clothing
  ['WT-CL01', 'cl-tees-rail', 'Everyday Crew-Neck Tee', 'clothing-t-shirts', 'unisex', 799, null, 'Assorted', '#c0392b', 'red', ['100% Cotton'], { sized: true, badge: 'Many colours', lead: 'A soft everyday tee', detail: 'Breathable combed cotton with a classic crew neck; easy to wear on its own or under a jacket.' }],
  ['WT-CL02', 'cl-tees-stack', 'Essential Cotton Tee (Pack of 3)', 'clothing-t-shirts', 'unisex', 1799, 1499, 'Mixed', '#2b3a55', 'navy', ['100% Cotton'], { sized: true, badge: 'Pack of 3', lead: 'Three everyday tees', detail: 'Pre-washed cotton that keeps its shape; a three-pack for the week.' }],
  ['WT-CL03', 'cl-tee-white-hanger', 'Heavyweight White Tee', 'clothing-t-shirts', 'men', 999, null, 'White', '#f5f5f3', 'cream', ['Heavyweight Cotton'], { sized: true, lead: 'A heavyweight white tee', detail: 'Dense 220 GSM cotton that drapes well and is not see-through.' }],
  ['WT-CL04', 'cl-shirt-stripe', 'Striped Oxford Shirt', 'clothing-shirts', 'men', 1899, 1599, 'Blue Stripe', '#3f5d8a', 'blue', ['Cotton Oxford'], { sized: true, lead: 'A crisp striped shirt', detail: 'Cotton oxford with a button-down collar; smart for work, relaxed with the sleeves rolled.' }],
  ['WT-CL05', 'cl-shirt-denim', 'Washed Denim Shirt', 'clothing-shirts', 'unisex', 2199, null, 'Indigo', '#24365c', 'navy', ['Cotton Denim'], { sized: true, lead: 'A washed denim shirt', detail: 'Soft-washed denim with two chest pockets; wear it buttoned or open as a light layer.' }],
  ['WT-CL06', 'cl-shirt-flannel', 'Check Flannel Shirt', 'clothing-shirts', 'unisex', 1699, null, 'Red Check', '#a8323a', 'red', ['Brushed Cotton Flannel'], { sized: true, lead: 'A warm flannel shirt', detail: 'Brushed cotton flannel in a classic check; warm on cool evenings and road trips.' }],
  ['WT-CL07', 'cl-jacket-corduroy', 'Corduroy Field Jacket', 'clothing-jackets', 'men', 4999, 4299, 'Forest Green', '#3d4a3a', 'green', ['Cotton Corduroy'], { sized: true, badge: 'New Season', lead: 'A corduroy field jacket', detail: 'Soft cotton corduroy with patch pockets; a smart layer for cooler days.' }],
  ['WT-CL08', 'cl-jacket-puffer', 'Quilted Puffer Jacket', 'clothing-jackets', 'unisex', 5499, null, 'Black', '#151515', 'onyx', ['Recycled Nylon Shell', 'Polyester Fill'], { sized: true, lead: 'A warm quilted puffer', detail: 'Light, packable and windproof, with a full-length zip; made for travel days.' }],
  ['WT-CL09', 'cl-blazer-navy', 'Tailored Navy Blazer', 'clothing-jackets', 'men', 6999, 5999, 'Navy', '#1f2f4f', 'navy', ['Wool Blend'], { sized: true, lead: 'A tailored navy blazer', detail: 'A sharp single-breasted cut in a wool blend; pairs with jeans or trousers.' }],
  ['WT-CL10', 'cl-jacket-denim-light', 'Light-Wash Denim Jacket', 'clothing-jackets', 'unisex', 3499, null, 'Light Blue', '#8fb3d9', 'blue', ['Cotton Denim'], { sized: true, lead: 'A light-wash denim jacket', detail: 'A classic trucker jacket in soft light-wash denim with button chest pockets.' }],
  ['WT-CL11', 'cl-overshirt-denim', 'Short-Sleeve Denim Overshirt', 'clothing-jackets', 'unisex', 2799, null, 'Mid Blue', '#4a6a8f', 'blue', ['Cotton Denim'], { sized: true, lead: 'A short-sleeve denim overshirt', detail: 'An easy summer layer with an open collar and two patch pockets.' }],
  ['WT-CL12', 'cl-knit-chunky', 'Chunky Knit Pullover', 'clothing-knitwear', 'unisex', 2999, 2499, 'Charcoal', '#3b3d40', 'grey', ['Wool Blend Knit'], { sized: true, lead: 'A chunky knit pullover', detail: 'A thick, cosy knit with ribbed cuffs and hem for cold mornings.' }],
  ['WT-CL13', 'cl-knit-puff-sleeve', 'Puff-Sleeve Knit Sweater', 'clothing-knitwear', 'women', 3299, null, 'Cream', '#ece3d3', 'cream', ['Cotton Knit'], { sized: true, lead: 'A puff-sleeve knit sweater', detail: 'A fitted waffle-knit body with full puff sleeves and a high neck.' }],
  ['WT-CL14', 'cl-hoodie-pink', 'Soft Fleece Hoodie', 'clothing-knitwear', 'unisex', 2299, null, 'Pink', '#e8a4b4', 'pink', ['Cotton Fleece'], { sized: true, lead: 'A soft fleece hoodie', detail: 'Brushed fleece inside, a roomy hood and a kangaroo pocket.' }],
  ['WT-CL15', 'cl-jeans-classic', 'Classic Blue Jeans', 'clothing-jeans', 'unisex', 2499, null, 'Mid Blue', '#3f6fa8', 'blue', ['Cotton Denim'], { sized: true, lead: 'Classic five-pocket jeans', detail: 'Sturdy cotton denim with a little stretch for all-day comfort.' }],
  ['WT-CL16', 'cl-jeans-straight', 'Straight-Fit Dark Jeans', 'clothing-jeans', 'men', 2799, 2399, 'Dark Blue', '#26375a', 'navy', ['Cotton Denim'], { sized: true, lead: 'Straight-fit dark jeans', detail: 'A clean straight leg in a dark rinse that dresses up or down.' }],
  ['WT-CL17', 'cl-dress-floral', 'Floral Print Midi Dress', 'clothing-dresses', 'women', 2999, null, 'Navy Floral', '#1f2f4f', 'navy', ['Viscose'], { sized: true, lead: 'A floral midi dress', detail: 'A light, flowing print with short sleeves; easy for day trips and dinners.' }],
  ['WT-CL18', 'cl-dress-sundress', 'Strappy Sundress', 'clothing-dresses', 'women', 2499, 1999, 'Orange', '#e0662f', 'orange', ['Cotton Blend'], { sized: true, lead: 'A strappy sundress', detail: 'Thin adjustable straps and a breezy skirt for hot days.' }],
  ['WT-CL19', 'cl-dress-white', 'White Off-Shoulder Dress', 'clothing-dresses', 'women', 3499, null, 'White', '#f5f5f3', 'cream', ['Cotton Voile'], { sized: true, badge: 'New Season', lead: 'An off-shoulder white dress', detail: 'Airy cotton voile with puff sleeves and a tiered skirt.' }],
  // Perfumes
  ['WT-PF01', 'pf-edp-trio', 'Signature Eau de Parfum Trio', 'perfumes-eau-de-parfum', 'unisex', 3499, 2999, 'Trio', '#d9b48f', 'tan', ['Eau de Parfum'], { capacity: '3 × 30ml', badge: 'Gift Set', lead: 'Three everyday fragrances', detail: 'A fresh, a warm and an aquatic scent in sculpted glass bottles.' }],
  ['WT-PF02', 'pf-edp-amber-blossom', 'Amber Blossom Eau de Parfum', 'perfumes-eau-de-parfum', 'women', 2499, null, 'Amber', '#d9772f', 'orange', ['Eau de Parfum'], { capacity: '50ml', lead: 'A warm floral fragrance', detail: 'Orange blossom over a soft amber base; long-lasting on skin and fabric.' }],
  ['WT-PF03', 'pf-edp-violet-bloom', 'Violet Bloom Eau de Parfum', 'perfumes-eau-de-parfum', 'women', 2499, 2199, 'Violet', '#a07cc5', 'pink', ['Eau de Parfum'], { capacity: '50ml', lead: 'A soft violet fragrance', detail: 'Violet and white florals with a clean musk finish.' }],
  ['WT-PF04', 'pf-oils-amber-green', 'Amber & Vetiver Perfume Oil Duo', 'perfumes-attars', 'men', 1999, null, 'Amber / Green', '#9a4a1c', 'brown', ['Perfume Oil'], { capacity: '2 × 12ml', badge: 'Alcohol-free', lead: 'Two alcohol-free perfume oils', detail: 'A warm amber and a green vetiver oil; a drop on the wrist lasts all day.' }],
  ['WT-PF05', 'pf-oil-cork-floral', 'Wildflower Perfume Oil', 'perfumes-attars', 'women', 1299, null, 'Golden', '#e2c26b', 'tan', ['Perfume Oil'], { capacity: '12ml', badge: 'Alcohol-free', lead: 'A light floral perfume oil', detail: 'Fresh wildflower notes in a corked glass vial; gentle on skin.' }],
  ['WT-PF06', 'pf-mini-teal', 'Aqua Travel Mini', 'perfumes-minis', 'unisex', 699, null, 'Teal', '#1f7f8f', 'teal', ['Eau de Toilette'], { capacity: '15ml', badge: 'Cabin Size', lead: 'A pocket-size fresh fragrance', detail: 'A crisp aquatic scent in a cabin-friendly bottle for your bag.' }],
  ['WT-PF07', 'pf-mini-cobalt', 'Midnight Cobalt Travel Mini', 'perfumes-minis', 'men', 699, null, 'Cobalt Blue', '#24409a', 'blue', ['Eau de Toilette'], { capacity: '15ml', badge: 'Cabin Size', lead: 'A pocket-size woody fragrance', detail: 'Cedar and dark spice in a small cobalt glass bottle.' }],
];

await mongoose.connect(env.mongoUri);

if (process.argv.includes('--undo')) {
  const file = path.resolve(process.cwd(), process.argv[process.argv.indexOf('--undo') + 1]);
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = await Product.deleteMany({ _id: { $in: b.products.map((x) => x._id) }, sku: { $regex: SKU_RE } });
  const c = await Category.deleteMany({ _id: { $in: b.categories.map((x) => x._id) } });
  console.log(`Deleted ${p.deletedCount} products and ${c.deletedCount} categories.`);
  await mongoose.disconnect();
  process.exit(0);
}

const existingTop = await Category.find({ parent: null }).select('sortOrder').lean();
let sortOrder = Math.max(0, ...existingTop.map((c) => c.sortOrder || 0)) + 1;
const plan = { categories: [], products: [] };
for (const d of DEPARTMENTS) {
  const top = await Category.findOne({ slug: d.slug }).lean();
  plan.categories.push({ slug: d.slug, exists: Boolean(top) });
  for (const [slug] of d.children) plan.categories.push({ slug, exists: Boolean(await Category.exists({ slug })) });
}
for (const p of PRODUCTS) plan.products.push({ sku: p[0], name: p[2], section: p[3], exists: Boolean(await Product.exists({ sku: p[0] })) });
console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — categories: ${plan.categories.filter((c) => !c.exists).length} new · products: ${plan.products.filter((p) => !p.exists).length} new`);
for (const c of plan.categories) console.log(`  ${c.exists ? '=' : '+'} category ${c.slug}`);
for (const p of plan.products) console.log(`  ${p.exists ? '=' : '+'} ${p.sku} ${p.name} → ${p.section}`);
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
const creditText = fs.readFileSync(creditsFile, 'utf8');
if (!creditText.includes('Clothing & Perfumes (CC0)')) {
  fs.appendFileSync(creditsFile, `\n\n## Clothing & Perfumes (CC0)\n\nPublic-domain (CC0) photos from StockSnap and rawpixel, found via openverse.org. No attribution is required; credited as a courtesy.\n\n| File | Source | Creator |\n|---|---|---|\n${credits.join('\n')}\n`);
}

// 2. Categories.
const created = { categories: [], products: [] };
const img = (file) => ({ url: `/uploads/seed/catalog/${file}.jpg` });
const firstPhoto = (section) => PRODUCTS.find((p) => p[3] === section)?.[1];
const bySlug = new Map();
for (const d of DEPARTMENTS) {
  let top = await Category.findOne({ slug: d.slug });
  if (!top) {
    top = await Category.create({ name: d.name, slug: d.slug, tagline: d.tagline, icon: d.icon, image: img(firstPhoto(d.children[0][0])), parent: null, department: 'all', level: 1, sortOrder: sortOrder++, isActive: true, showInMenu: true, showOnHome: true });
    created.categories.push({ _id: String(top._id), slug: top.slug });
  }
  bySlug.set(d.slug, top);
  let i = 0;
  for (const [slug, name, tagline, icon] of d.children) {
    let c = await Category.findOne({ slug });
    if (!c) {
      c = await Category.create({ name, slug, tagline, icon, image: img(firstPhoto(slug)), parent: top._id, department: 'all', level: 2, sortOrder: i, isActive: true, showInMenu: true });
      created.categories.push({ _id: String(c._id), slug });
    }
    bySlug.set(slug, c);
    i += 1;
  }
}

// 3. Products.
const slugify = (s) => s.toLowerCase().replace(/[’'()]/g, '').replace(/&/g, 'and').replace(/×/g, 'x').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let n = 0;
for (const [sku, photo, name, section, gender, price, sale, colour, hex, family, materials, o] of PRODUCTS) {
  n += 1;
  if (await Product.exists({ sku })) continue;
  const sub = bySlug.get(section);
  const top = DEPARTMENTS.find((d) => d.children.some((c) => c[0] === section));
  const pic = img(photo);
  const stockFor = (k) => 6 + ((n * 7 + k * 5) % 15);
  const variants = o.sized
    ? SIZES.map((size, k) => ({ name: `${colour} / ${size}`, colorHex: hex, colorFamily: family, size, sku: `${sku}-${size}`, stock: stockFor(k), images: [{ ...pic, alt: name }] }))
    : [{ name: colour, colorHex: hex, colorFamily: family, sku: `${sku}-1`, stock: 15 + ((n * 11) % 20), images: [{ ...pic, alt: name }] }];
  let slug = slugify(name);
  for (let k = 2; await Product.exists({ slug }); k += 1) slug = `${slugify(name)}-${k}`;
  const doc = await Product.create({
    name, slug, sku,
    tagline: (o.capacity ? `${o.capacity} ${sub.name.replace(/s$/, '')}` : sub.name.replace(/s$/, '')).slice(0, 80),
    badge: o.badge || 'New',
    shortDescription: `${o.lead} in ${colour.toLowerCase()}. ${o.detail}`.slice(0, 300),
    description: `${name} — ${o.lead.toLowerCase()} made from ${materials.join(' and ').toLowerCase()}. ${o.detail}${o.sized ? ' Available in S, M, L and XL; see the size guide or ask us for measurements.' : ''}`,
    category: bySlug.get(top.slug)._id,
    subcategory: sub._id,
    gender,
    price,
    salePrice: sale || null,
    capacity: o.capacity || '',
    images: [{ ...pic, alt: `${name} in ${colour}` }],
    variants,
    materials,
    purposes: ['everyday'],
    tags: [sub.name.toLowerCase(), top.name.toLowerCase(), ...materials.map((m) => m.toLowerCase())],
    specifications: [o.capacity && { label: 'Size', value: o.capacity }, o.sized && { label: 'Sizes', value: SIZES.join(', ') }, { label: 'Material', value: materials.join(', ') }, { label: 'Colour', value: colour }].filter(Boolean),
    careInstructions: o.sized ? 'Machine wash cold inside out with similar colours. Do not bleach. Dry in shade.' : 'Store away from direct sunlight and heat. Keep the cap closed.',
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
const out = path.join(here, 'backups', `clothing-perfume-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(out, JSON.stringify(created, null, 1));
console.log(`\nCreated ${created.categories.length} categories and ${created.products.length} products. Undo: node src/seed/clothingPerfume.js --undo ${path.relative(process.cwd(), out)}`);
await mongoose.disconnect();
process.exit(0);
