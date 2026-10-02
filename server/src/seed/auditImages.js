// Read-only report: products and colour variants with no photo, plus catalogue counts.
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

await connectDB();
const products = await Product.find().select('name images variants.name variants.images subcategory isVisible').populate('subcategory', 'name').lean();
let noImage = 0;
let variantsNoImage = 0;
for (const p of products) {
  const missing = p.variants.filter((v) => !v.images?.length).map((v) => v.name);
  if (!p.images?.length) noImage += 1;
  variantsNoImage += missing.length;
  if (!p.images?.length || missing.length) console.log(`${p.images?.length ? '' : '[NO PRODUCT IMAGE] '}${p.name} (${p.subcategory?.name}) — colours without photo: ${missing.join(', ') || 'none'}`);
}
const subs = await Category.find({ parent: { $ne: null } }).select('name').lean();
for (const s of subs) {
  const n = products.filter((p) => String(p.subcategory?._id) === String(s._id)).length;
  console.log(`  ${s.name}: ${n} products`);
}
console.log(`\nProducts: ${products.length}, without any image: ${noImage}, colour variants without photo: ${variantsNoImage}`);
await mongoose.disconnect();
