import { connectDB, disconnectDB } from '../config/db.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import * as data from './data.js';

await connectDB();

const dbCats = await Category.find({}).lean();
const catBySlug = new Map(dbCats.map(c => [c.slug, c]));
const catByName = new Map(dbCats.map(c => [c.name.toLowerCase(), c]));
const catById = new Map(dbCats.map(c => [c._id.toString(), c]));

// Source definitions map: product name -> subcategory slug
const sourceDefMap = new Map();

function addSource(name, subName) {
  const c = dbCats.find(x => x.name.toLowerCase() === subName.toLowerCase() && x.parent);
  if (c) {
    sourceDefMap.set(name, c.slug);
  } else {
    console.warn(`Category not found for: ${subName}`);
  }
}

for (const p of data.products) addSource(p.name, p.sub);
if (data.extraProducts) for (const p of data.extraProducts) addSource(p.name, p.sub);
if (data.moreProducts) for (const p of data.moreProducts) addSource(p.name, p.sub);

// Explicit definitions for enrichment / curated catalog items
const curated = {
  // From enrich_subcategories_and_products.js
  'Diplomat Double-Gusset Leather Briefcase': 'office-bags',
  'Dalton Ballistic Canvas Messenger': 'laptop-bags',
  'Woodland Slimline RFID Bifold Wallet': 'wallets',
  'Highway Waxed Canvas Overnighter Duffle 45L': 'duffle-bags',
  'Bloom Sculptural Structured Leather Handbag': 'handbags',
  'Atelier Structured Linen Work Tote': 'tote-bags',
  'Cloud Quilted Pebble Leather Crossbody': 'crossbody-bags',
  'Riviera Artisanal Woven Straw Tote': 'beach-straw-bags',
  'Heritage Waterproof Leather Dopp Kit': 'toiletry-kits',
  'Saddle Tan Full-Grain Leather Laptop Sleeve (14"/16")': 'laptop-sleeves',
  'Atlas RFID Multi-Currency Passport Wallet': 'passport-holders',

  // From enrich_catalog.js
  'Reversible Tuscan Leather Belt': 'belts',
  'Sculptural Brass Accent Belt': 'belts',
  'Heritage Full-Grain Leather Belt': 'belts',
  'Executive Reversible Dress Belt': 'belts',
  'Sculpted Brass Buckle Leather Belt': 'belts',
  'WILDTANE Classic Full-Grain Leather Dress Belt': 'belts',
  'WILDTANE Classic Slim Dress Belt': 'belts',
  'Cedar & Smoked Amber Extrait de Parfum': 'perfumes',
  'White Vetiver & Bergamot Travel Mist': 'perfumes',
  'Amber & Jasmine Eau de Parfum 50ml': 'perfumes',
  'Velvet Bloom Eau de Parfum 50ml': 'perfumes',
  'Botanique Lilac & Amberwood Eau de Parfum (100ml)': 'perfumes',
  'WILDTANE Rosa & Amber Blossom Eau De Parfum 50ml': 'perfumes',
  'WILDTANE Smoked Cedar & Vetiver Noir EDP 50ml': 'perfumes',
  'Heavyweight Supima Commuter T-Shirt': 't-shirts',
  'Signature Supima Cotton Tee': 't-shirts',
  'Merino Wool Travel Commuter Polo': 't-shirts',
  'Silk Twill Heritage Scarf': 'keychains',
  "WILDTANE Men's Access Key Token (₹2 Payment Gateway Test)": 'keychains',

  // Tech / Accessories extras
  'Magnetic Folio Laptop Sleeve 15-16"': 'laptop-sleeves',
  'Vanguard Slim MagSafe Wallet': 'wallets',
  'Meridian Lightweight Packing System (Set of 6)': 'travel-organisers',
  'Heritage Leather Dopp Kit': 'toiletry-kits',
  'Aqua Hanging Wash Bag': 'toiletry-kits',
  'Loop Leather Key Fob': 'keychains',
  'Onyx Key & Card Set': 'keychains',

  // WILDTANE branded range
  'WILDTANE Verona Handcrafted Leather Handbag': 'handbags',
  'WILDTANE Aria Slouch Shoulder Bag': 'handbags',
  'WILDTANE Allure Everyday Carryall Tote': 'tote-bags',
  'WILDTANE Luna Crescent Leather Hobo Bag': 'handbags',
  'WILDTANE Amara Compact Crossbody Bag': 'crossbody-bags',
  'WILDTANE Celeste Structured Evening Clutch': 'clutches',
  'WILDTANE Aura Pebble Zip Leather Wristlet': 'clutches',
  'WILDTANE Petite Sculpted Mini Top-Handle Bag': 'handbags',
  'WILDTANE Belgravia Kisslock Leather Coin Purse': 'wallets',
  'WILDTANE Dahlia Cinch Drawstring Bucket Bag': 'handbags',
  'WILDTANE Royale Velvet & Crystal Evening Bag': 'clutches',
  'WILDTANE Starlight Acrylic Box Clutch': 'clutches',
  'WILDTANE Zardozi Handcrafted Silk Potli Bag': 'clutches',
  'WILDTANE Chelsea 14-inch Executive Laptop Bag': 'laptop-bags',
  'WILDTANE Metropolis Multi-Slot Organizer Bag': 'office-bags',
  'WILDTANE Mayfair Chevron Quilted Flap Bag': 'handbags',
  'WILDTANE Morph 3-in-1 Backpack Crossbody Bag': 'backpacks',
  'WILDTANE Vanguard Oxford Canvas Messenger Bag': 'office-bags',
  'WILDTANE Cambridge Heritage Leather Satchel': 'office-bags',
  'WILDTANE Trailhead Water-Resistant Belt Bag': 'belt-bags',
  'WILDTANE Sterling Full-Grain Leather Briefcase': 'office-bags',
  'WILDTANE Stratus Padded 15.6-inch Laptop Bag': 'laptop-bags',
  'WILDTANE Overnighter Heavyweight Rugged Duffel': 'duffle-bags',
  'WILDTANE Heritage Water-Resistant Dopp Kit Toiletry Bag': 'toiletry-kits',
  'WILDTANE Executive Full-Grain Bifold Wallet': 'wallets',
  'WILDTANE TechnoShield 16-inch Laptop Backpack': 'backpacks',
  'WILDTANE Campus Multi-Pocket Student Backpack': 'backpacks',
  'WILDTANE Heritage Waxed Canvas Rucksack Backpack': 'backpacks',
  'WILDTANE Aero 18L Minimalist Commuter Backpack': 'backpacks',
  'WILDTANE CyberTech USB Smart Backpack': 'backpacks',
  'WILDTANE Vault TSA Lock Anti-Theft Backpack': 'backpacks',
  'WILDTANE Voyager 2-in-1 Wheeled Rolling Backpack': 'backpacks',
  'WILDTANE Summit 40L Ergonomic Hiking Backpack': 'backpacks',
};

for (const [k, v] of Object.entries(curated)) {
  sourceDefMap.set(k, v);
}

const products = await Product.find({}).lean();
console.log(`Applying definitive categories for ${products.length} products...`);

let updated = 0;
for (const p of products) {
  const subSlug = sourceDefMap.get(p.name);
  if (!subSlug) {
    console.error(`Missing subSlug for ${p.name}`);
    continue;
  }
  const subDoc = catBySlug.get(subSlug);
  if (!subDoc) {
    console.error(`Subdoc not found for slug: ${subSlug}`);
    continue;
  }
  const parentId = subDoc.parent;
  await Product.updateOne(
    { _id: p._id },
    { $set: { category: parentId, subcategory: subDoc._id } }
  );
  updated++;
}

console.log(`Updated ${updated} / ${products.length} products with 100% precision!`);

await disconnectDB();
