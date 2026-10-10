import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { slugify, round2 } from '../utils/helpers.js';

/**
 * Maps items from "Product Catologue.xlsx" into WILDTANE's product catalog.
 * Creates appropriate subcategories if needed and inserts rich, high-spec products.
 */
export async function seedExcelCatalogue() {
  console.log('Seeding items from Product Catologue.xlsx...');

  // Ensure top-level categories
  let bagsCat = await Category.findOne({ slug: 'bags' });
  if (!bagsCat) {
    bagsCat = await Category.create({ name: 'Bags', slug: 'bags', tagline: 'Signature carry for every day', sortOrder: 0 });
  }

  let travelCat = await Category.findOne({ slug: 'travel-utility' });
  if (!travelCat) {
    travelCat = await Category.create({ name: 'Travel & Utility', slug: 'travel-utility', tagline: 'Engineered for fluid transit', sortOrder: 1 });
  }

  let accessCat = await Category.findOne({ slug: 'accessories' });
  if (!accessCat) {
    accessCat = await Category.create({ name: 'Accessories', slug: 'accessories', tagline: 'Modular ecosystem add-ons', sortOrder: 2 });
  }

  // Helper to ensure subcategory
  const subMap = new Map();
  async function getSub(parent, name, tagline = '') {
    const slug = slugify(name);
    if (subMap.has(slug)) return subMap.get(slug);
    let sub = await Category.findOne({ slug });
    if (!sub) {
      sub = await Category.create({ name, slug, parent: parent._id, tagline: tagline || `WILDTANE luxury ${name.toLowerCase()}` });
    }
    subMap.set(slug, sub);
    return sub;
  }

  // Pre-load common subcategories
  const handbagsSub = await getSub(bagsCat, 'Handbags', 'Sculptural silhouettes in pebble-grain calfskin');
  const shoulderSub = await getSub(bagsCat, 'Shoulder Bags', 'Comfortable drape with ergonomic straps');
  const toteSub = await getSub(bagsCat, 'Tote Bags', 'Structured leather totes');
  const hoboSub = await getSub(bagsCat, 'Hobo Bags', 'Effortless crescent silhouettes in supple leather');
  const crossbodySub = await getSub(bagsCat, 'Crossbody Bags', 'Streamlined hands-free carry');
  const clutchesSub = await getSub(bagsCat, 'Clutches', 'Evening-ready minimal forms');
  const miniBagsSub = await getSub(bagsCat, 'Mini Bags & Wristlets', 'Compact luxury essentials');
  const pouchesSub = await getSub(bagsCat, 'Pouches & Coin Purses', 'Everyday pocket and bag accessories');
  const bucketSub = await getSub(bagsCat, 'Bucket Bags', 'Drawstring cinch bucket silhouettes');
  const eveningSub = await getSub(bagsCat, 'Party & Occasion Bags', 'Glamorous evening bags and minaudières');
  const laptopBagsSub = await getSub(bagsCat, 'Laptop Bags', 'Suspended 16" device sleeves');
  const workToteSub = await getSub(bagsCat, 'Work Totes', 'Dedicated compartments for chargers and folios');
  const organizerBagsSub = await getSub(bagsCat, 'Organizer Bags', 'Multi-slot partitions for neat commuting');
  const quiltedSub = await getSub(bagsCat, 'Quilted & Chain Bags', 'Signature stitching and brass hardware');
  const messengerSub = await getSub(bagsCat, 'Messenger Bags', 'Classic flap-over satchels for daily transit');
  const briefcasesSub = await getSub(bagsCat, 'Office Bags', 'Executive briefcases and folios');
  const casualBackpacksSub = await getSub(bagsCat, 'Backpacks', 'Weatherproof daypacks');
  const duffleSub = await getSub(bagsCat, 'Duffle Bags', 'Long-haul leather and canvas duffles');
  const beltBagsSub = await getSub(bagsCat, 'Belt Bags', 'Hands-free waist and crossbody packs');

  // Travel & Utility subcategories
  const laptopBackpackSub = await getSub(travelCat, 'Laptop Backpacks', 'Padded device protection with airflow back panels');
  const studentBackpackSub = await getSub(travelCat, 'Student Backpacks', 'Multi-pocket campus carry with ergonomic straps');
  const canvasBackpackSub = await getSub(travelCat, 'Canvas Backpacks', 'Waxed heavyweight canvas with genuine leather trim');
  const minimalistBackpackSub = await getSub(travelCat, 'Minimalist Backpacks', 'Clean silhouette technical commuter packs');
  const smartBackpackSub = await getSub(travelCat, 'Smart Backpacks', 'Integrated USB ports and hidden anti-theft compartments');
  const antiTheftBackpackSub = await getSub(travelCat, 'Anti-Theft Backpacks', 'TSA combination locks and slash-resistant fabric');
  const rollingBackpackSub = await getSub(travelCat, 'Rolling Backpacks', 'Smooth inline skate wheels and tuck-away harness');
  const hikingBackpackSub = await getSub(travelCat, 'Hiking Backpacks', 'Ventilated suspension, hydration sleeves and rain covers');
  const vintageBackpackSub = await getSub(travelCat, 'Vintage Backpacks', 'Heritage retro aesthetic with brass buckles');
  const toiletrySub = await getSub(travelCat, 'Toiletry Kits', 'Water-resistant dopp kits');
  const travelPouchSub = await getSub(travelCat, 'Travel Pouches', 'Currency, SIM and passport organizers');

  // Accessories subcategories
  const walletsSub = await getSub(accessCat, 'Wallets', 'Slim RFID-shielded bi-folds, tri-folds and cardholders');
  const beltsSub = await getSub(accessCat, 'Belts', 'Full-grain Italian leather belts with custom alloy buckles');
  const apparelSub = await getSub(accessCat, 'Apparel & T-Shirts', 'Heavyweight combed cotton and breathable linen');
  const perfumeSub = await getSub(accessCat, 'Perfumes & Fragrance', 'Long-lasting handcrafted Eau De Parfum');

  // Products from Product Catologue.xlsx
  const catalogueProducts = [
    // ── WOMENS COLLECTION: Everyday & Fashion Bags
    {
      name: 'WILDTANE Verona Handcrafted Leather Handbag',
      slug: 'verona-handcrafted-leather-handbag',
      sku: 'WT-W-HB-01',
      tagline: 'Sculptural pebble-grain calfskin handbag',
      badge: 'Excel Catalogue',
      shortDescription: 'From our curated Excel catalogue: Handcrafted from full-grain calfskin with rolled leather handles, detachable strap and dual zip compartments.',
      description: '<p>The Verona Handbag exemplifies refined elegance. Featuring an architectural silhouette crafted from hand-selected pebble leather, it fits everyday essentials with room for a 10.9" tablet, cosmetics and wallet.</p>',
      category: bagsCat._id,
      subcategory: handbagsSub._id,
      gender: 'women',
      price: 6999,
      salePrice: 5499,
      images: [
        { url: '/uploads/seed/handbag-teal.jpg', alt: 'Verona Handcrafted Leather Handbag in Teal' },
        { url: '/uploads/seed/handbag-rose.jpg', alt: 'Verona Handbag in Dusty Rose' },
      ],
      variants: [
        { name: 'Lagoon Teal', colorHex: '#1e5f66', colorFamily: 'teal', sku: 'WT-W-HB-01-TL', stock: 25 },
        { name: 'Dusty Rose', colorHex: '#c07b7b', colorFamily: 'rose', sku: 'WT-W-HB-01-RS', stock: 20 },
        { name: 'Onyx Black', colorHex: '#141414', colorFamily: 'onyx', sku: 'WT-W-HB-01-BK', stock: 30 },
      ],
      materials: ['Pebble-Grain Leather', 'Suede Microfiber Lining', 'Gold-Toned Alloy'],
      features: ['Dual Zip Compartments', 'Detachable Shoulder Strap', 'Protective Metal Feet', 'Interior Key Clip'],
      tags: ['hand bag', 'handbag', 'womens', 'catalogue', 'luxury', 'leather'],
      capacity: '8L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 38,
      soldCount: 84,
    },
    {
      name: 'WILDTANE Aria Slouch Shoulder Bag',
      slug: 'aria-slouch-shoulder-bag',
      sku: 'WT-W-SB-01',
      tagline: 'Supple full-grain leather everyday shoulder bag',
      badge: 'Excel Catalogue',
      shortDescription: 'Graceful drape, magnetic closure, and ultra-comfortable wide shoulder strap.',
      description: '<p>Designed for fluid motion from morning to dinner. The Aria Shoulder Bag offers relaxed luxury with an organic silhouette, internal security pocket, and magnetic bridge closure.</p>',
      category: bagsCat._id,
      subcategory: shoulderSub._id,
      gender: 'women',
      price: 5499,
      salePrice: 4299,
      images: [
        { url: '/uploads/seed/handbag-sienna.jpg', alt: 'Aria Shoulder Bag in Sienna' },
        { url: '/uploads/seed/catalog/shoulder-tropic.jpg', alt: 'Aria Shoulder Bag' },
      ],
      variants: [
        { name: 'Sienna Cognac', colorHex: '#8b4513', colorFamily: 'brown', sku: 'WT-W-SB-01-SN', stock: 18 },
        { name: 'Midnight Black', colorHex: '#121212', colorFamily: 'onyx', sku: 'WT-W-SB-01-BK', stock: 22 },
      ],
      materials: ['Glove-Tanned Leather', 'Cotton Canvas Lining'],
      features: ['Magnetic Bridge Closure', 'Wide Ergonomic Strap', 'Hidden Phone Pocket'],
      tags: ['sholder bag', 'shoulder bag', 'womens', 'catalogue', 'everyday'],
      capacity: '7L',
      ratingAverage: 4.8,
      ratingCount: 29,
      soldCount: 65,
    },
    {
      name: 'WILDTANE Allure Everyday Carryall Tote',
      slug: 'allure-everyday-carryall-tote',
      sku: 'WT-W-TB-01',
      tagline: 'Roomy open-top tote with padded 14" device sleeve',
      badge: 'Excel Catalogue',
      shortDescription: 'Reinforced dual shoulder handles, luggage pass-through and secure zippered middle partition.',
      description: '<p>The Allure Tote brings effortless structure to busy days. Woven Italian cotton canvas meets full-grain leather trim with reinforced base corners and dedicated organiser pouches.</p>',
      category: bagsCat._id,
      subcategory: toteSub._id,
      gender: 'women',
      price: 4899,
      salePrice: 3899,
      images: [
        { url: '/uploads/seed/catalog/tote-essential.jpg', alt: 'Allure Everyday Tote' },
        { url: '/uploads/seed/catalog/tote-atelier.jpg', alt: 'Allure Tote Detail' },
      ],
      variants: [
        { name: 'Natural Canvas & Tan', colorHex: '#d2b48c', colorFamily: 'tan', sku: 'WT-W-TB-01-TN', stock: 35 },
        { name: 'Onyx Black', colorHex: '#181818', colorFamily: 'onyx', sku: 'WT-W-TB-01-BK', stock: 28 },
      ],
      materials: ['Heavyweight Cotton Canvas', 'Full-Grain Leather', 'Brass Rivets'],
      features: ['14" Laptop Compartment', 'Luggage Pass-Through Sleeve', 'Water-Resistant Base'],
      tags: ['tote bag', 'tote', 'womens', 'catalogue', 'work tote', 'everyday'],
      capacity: '16L',
      isFeatured: true,
      ratingAverage: 4.7,
      ratingCount: 42,
      soldCount: 110,
    },
    {
      name: 'WILDTANE Luna Crescent Leather Hobo Bag',
      slug: 'luna-crescent-leather-hobo-bag',
      sku: 'WT-W-HB-02',
      tagline: 'Artisanal crescent silhouette with slouchy drape',
      badge: 'Excel Catalogue',
      shortDescription: 'Soft nappa leather hobo bag designed to tuck comfortably under the arm with ample interior volume.',
      description: '<p>The Luna Hobo Bag captures modern bohemian luxury. Its crescent curve is balanced with a sturdy base, thick padded strap, and polished gold zipper.</p>',
      category: bagsCat._id,
      subcategory: hoboSub._id,
      gender: 'women',
      price: 5299,
      salePrice: 4199,
      images: [
        { url: '/uploads/seed/catalog/bucket-soho.jpg', alt: 'Luna Hobo Bag' },
        { url: '/uploads/seed/catalog/bucket-noir.jpg', alt: 'Luna Hobo Bag in Black' },
      ],
      variants: [
        { name: 'Warm Caramel', colorHex: '#af6e4d', colorFamily: 'brown', sku: 'WT-W-HB-02-CR', stock: 16 },
        { name: 'Deep Espresso', colorHex: '#2b1d14', colorFamily: 'brown', sku: 'WT-W-HB-02-ES', stock: 20 },
      ],
      materials: ['Nappa Calfskin', 'Sateen Lining'],
      features: ['Curved Crescent Base', 'Zip Top Closure', 'Interior Card Slots'],
      tags: ['hobo bag', 'hobo', 'womens', 'catalogue'],
      capacity: '9L',
      ratingAverage: 4.8,
      ratingCount: 24,
      soldCount: 52,
    },
    {
      name: 'WILDTANE Amara Compact Crossbody Bag',
      slug: 'amara-compact-crossbody-bag',
      sku: 'WT-W-CB-01',
      tagline: 'Structured boxy crossbody with adjustable guitar strap',
      badge: 'Excel Catalogue',
      shortDescription: 'Scratch-resistant saffiano leather, dual top zips, and interchangeable woven jacquard strap.',
      description: '<p>Built for city wandering. The Amara Crossbody Bag keeps your smartphone, wallet, keys and lip balm neatly organized in twin zip compartments.</p>',
      category: bagsCat._id,
      subcategory: crossbodySub._id,
      gender: 'women',
      price: 3999,
      salePrice: 3199,
      images: [
        { url: '/uploads/seed/crossbody-camera.jpg', alt: 'Amara Crossbody Bag' },
        { url: '/uploads/seed/catalog/crossbody-cloud.jpg', alt: 'Amara Crossbody Cloud' },
      ],
      variants: [
        { name: 'Chalk White', colorHex: '#f0ece1', colorFamily: 'white', sku: 'WT-W-CB-01-WH', stock: 24 },
        { name: 'Midnight Onyx', colorHex: '#161616', colorFamily: 'onyx', sku: 'WT-W-CB-01-BK', stock: 30 },
      ],
      materials: ['Saffiano Leather', 'Woven Jacquard Strap'],
      features: ['Dual Zip Chambers', 'Adjustable Crossbody Strap', 'Exterior Slip Pocket'],
      tags: ['crossbody bag', 'crossbody', 'womens', 'catalogue'],
      capacity: '3.5L',
      ratingAverage: 4.9,
      ratingCount: 51,
      soldCount: 140,
    },

    // ── WOMENS COLLECTION: Small & Compact Bags
    {
      name: 'WILDTANE Celeste Structured Evening Clutch',
      slug: 'celeste-structured-evening-clutch',
      sku: 'WT-W-CL-01',
      tagline: 'Sleek geometric envelope clutch with tuck-away chain',
      badge: 'Excel Catalogue',
      shortDescription: 'Satin gloss finish, magnetic snap, and fine jewelry-grade snake chain strap.',
      description: '<p>The Celeste Clutch provides effortless elegance for galas and dinners. Fits standard smartphones with dedicated mirror pocket and card organizer.</p>',
      category: bagsCat._id,
      subcategory: clutchesSub._id,
      gender: 'women',
      price: 2899,
      salePrice: 2299,
      images: [
        { url: '/uploads/seed/clutch-espresso.jpg', alt: 'Celeste Evening Clutch' },
        { url: '/uploads/seed/clutch-espresso-table.jpg', alt: 'Celeste Clutch Detail' },
      ],
      variants: [
        { name: 'Espresso Brown', colorHex: '#3a2012', colorFamily: 'brown', sku: 'WT-W-CL-01-ES', stock: 20 },
        { name: 'Champagne Gold', colorHex: '#d8c28b', colorFamily: 'tan', sku: 'WT-W-CL-01-GD', stock: 18 },
      ],
      materials: ['Satin Calfskin', 'Gold Snake Chain'],
      features: ['Tuck-Away Chain', 'Internal Mirror Pocket', 'Magnetic Flap Snap'],
      tags: ['clutch', 'evening clutch', 'womens', 'catalogue', 'party'],
      capacity: '1.5L',
      ratingAverage: 4.8,
      ratingCount: 31,
      soldCount: 75,
    },
    {
      name: 'WILDTANE Aura Pebble Zip Leather Wristlet',
      slug: 'aura-pebble-zip-leather-wristlet',
      sku: 'WT-W-WR-01',
      tagline: 'Detachable wrist strap with 6 card slots and phone pocket',
      badge: 'Excel Catalogue',
      shortDescription: 'The perfect grab-and-go companion for coffee runs, airport terminals and errands.',
      description: '<p>Handcrafted from soft pebbled leather with a gold zip around closure, comfortable looped wristlet strap and RFID shield protection.</p>',
      category: bagsCat._id,
      subcategory: miniBagsSub._id,
      gender: 'women',
      price: 1899,
      salePrice: 1499,
      images: [
        { url: '/uploads/seed/catalog/cardholder-red.jpg', alt: 'Aura Zip Wristlet' },
        { url: '/uploads/seed/cardholder-tan.jpg', alt: 'Aura Wristlet Tan' },
      ],
      variants: [
        { name: 'Crimson Red', colorHex: '#991b1b', colorFamily: 'rose', sku: 'WT-W-WR-01-RD', stock: 25 },
        { name: 'Saddle Tan', colorHex: '#b45309', colorFamily: 'tan', sku: 'WT-W-WR-01-TN', stock: 30 },
      ],
      materials: ['Pebbled Leather', 'RFID Shield Lining'],
      features: ['Detachable Wrist Strap', '6 Card Slots', 'Zip Coin Pocket'],
      tags: ['wristlet', 'mini bag', 'womens', 'catalogue'],
      capacity: '0.8L',
      ratingAverage: 4.7,
      ratingCount: 19,
      soldCount: 48,
    },
    {
      name: 'WILDTANE Petite Sculpted Mini Top-Handle Bag',
      slug: 'petite-sculpted-mini-top-handle-bag',
      sku: 'WT-W-MB-01',
      tagline: 'Micro architectural silhouette with flap lock',
      badge: 'Excel Catalogue',
      shortDescription: 'Trend-defining micro bag with structured handle, metal lock and crossbody strap.',
      description: '<p>The Petite Mini Bag turns heads. High fashion proportions with room for cards, keys, lipstick, and airpods.</p>',
      category: bagsCat._id,
      subcategory: miniBagsSub._id,
      gender: 'women',
      price: 3499,
      salePrice: 2799,
      images: [
        { url: '/uploads/seed/catalog/backpack-mini-city.jpg', alt: 'Petite Mini Bag' },
        { url: '/uploads/seed/catalog/chain-chevron-mauve.jpg', alt: 'Petite Mini Bag Detail' },
      ],
      variants: [
        { name: 'Mauve Blossom', colorHex: '#a855f7', colorFamily: 'rose', sku: 'WT-W-MB-01-MV', stock: 15 },
        { name: 'Jet Black', colorHex: '#111111', colorFamily: 'onyx', sku: 'WT-W-MB-01-BK', stock: 25 },
      ],
      materials: ['Structured Calf Leather', 'Polished Brass Hardware'],
      features: ['Removable Crossbody Strap', 'Top Carry Handle', 'Turnlock Clasp'],
      tags: ['mini bag', 'micro bag', 'womens', 'catalogue'],
      capacity: '1.2L',
      ratingAverage: 4.6,
      ratingCount: 22,
      soldCount: 40,
    },
    {
      name: 'WILDTANE Belgravia Kisslock Leather Coin Purse',
      slug: 'belgravia-kisslock-leather-coin-purse',
      sku: 'WT-W-CP-01',
      tagline: 'Vintage-inspired brass kisslock frame coin purse',
      badge: 'Excel Catalogue',
      shortDescription: 'Classic hinged metal frame, supple drum-dyed leather, and soft fabric lining.',
      description: '<p>A timeless pocket treasure. Holds coins, folded cash, tokens, and jewelry securely with a satisfying snap closure.</p>',
      category: bagsCat._id,
      subcategory: pouchesSub._id,
      gender: 'women',
      price: 1199,
      salePrice: 899,
      images: [
        { url: '/uploads/seed/catalog/keyfob-brown.jpg', alt: 'Belgravia Coin Purse' },
        { url: '/uploads/seed/catalog/keyfob-black.jpg', alt: 'Belgravia Coin Purse Black' },
      ],
      variants: [
        { name: 'Chestnut Brown', colorHex: '#78350f', colorFamily: 'brown', sku: 'WT-W-CP-01-BR', stock: 40 },
        { name: 'Midnight Onyx', colorHex: '#121212', colorFamily: 'onyx', sku: 'WT-W-CP-01-BK', stock: 35 },
      ],
      materials: ['Full-Grain Cowhide', 'Antiqued Brass Kisslock'],
      features: ['Dual Compartment Interior', 'Snapping Kisslock Frame'],
      tags: ['coin purse', 'pouch', 'womens', 'catalogue'],
      capacity: '0.4L',
      ratingAverage: 4.9,
      ratingCount: 34,
      soldCount: 92,
    },
    {
      name: 'WILDTANE Dahlia Cinch Drawstring Bucket Bag',
      slug: 'dahlia-cinch-drawstring-bucket-bag',
      sku: 'WT-W-BB-01',
      tagline: 'Sculptural cylindrical base with leather cinch ties',
      badge: 'Excel Catalogue',
      shortDescription: 'Generous bucket chamber, reinforced circular base, and dual handle options.',
      description: '<p>The Dahlia Bucket Bag combines casual ease with bespoke craftsmanship. Cinch it closed for secure transit or wear relaxed across the shoulder.</p>',
      category: bagsCat._id,
      subcategory: bucketSub._id,
      gender: 'women',
      price: 4999,
      salePrice: 3999,
      images: [
        { url: '/uploads/seed/catalog/bucket-olive.jpg', alt: 'Dahlia Bucket Bag Olive' },
        { url: '/uploads/seed/catalog/bucket-noir-2.jpg', alt: 'Dahlia Bucket Bag Noir' },
      ],
      variants: [
        { name: 'Olive Grove', colorHex: '#4d5d34', colorFamily: 'olive', sku: 'WT-W-BB-01-OL', stock: 20 },
        { name: 'Noir Black', colorHex: '#151515', colorFamily: 'onyx', sku: 'WT-W-BB-01-BK', stock: 25 },
      ],
      materials: ['Milled Grain Leather', 'Brass Eyelets'],
      features: ['Drawstring Cinch', 'Reinforced Circular Base', 'Interior Zip Pocket'],
      tags: ['bucket bag', 'bucket', 'womens', 'catalogue'],
      capacity: '6.5L',
      ratingAverage: 4.8,
      ratingCount: 27,
      soldCount: 68,
    },

    // ── WOMENS COLLECTION: Party & Occasion Bags
    {
      name: 'WILDTANE Royale Velvet & Crystal Evening Bag',
      slug: 'royale-velvet-crystal-evening-bag',
      sku: 'WT-W-EV-01',
      tagline: 'Deep velvet evening bag with Austrian crystal embellishments',
      badge: 'Excel Catalogue',
      shortDescription: 'Plush midnight velvet, magnetic flap and removable jewel shoulder chain.',
      description: '<p>Designed for red carpet nights and celebrations. The Royale Evening Bag glints softly under evening lights and holds party essentials comfortably.</p>',
      category: bagsCat._id,
      subcategory: eveningSub._id,
      gender: 'women',
      price: 4499,
      salePrice: 3599,
      images: [
        { url: '/uploads/seed/catalog/chain-chevron.jpg', alt: 'Royale Evening Bag' },
        { url: '/uploads/seed/catalog/chain-chevron-mauve.jpg', alt: 'Royale Evening Bag Detail' },
      ],
      variants: [
        { name: 'Midnight Emerald', colorHex: '#064e3b', colorFamily: 'teal', sku: 'WT-W-EV-01-EM', stock: 15 },
        { name: 'Obsidian Velvet', colorHex: '#0a0a0a', colorFamily: 'onyx', sku: 'WT-W-EV-01-BK', stock: 20 },
      ],
      materials: ['Plush Silk Velvet', 'Austrian Crystals', 'Gold-Plated Chain'],
      features: ['Crystal Clasp', 'Silk Lining', 'Jewelry Drop Chain'],
      tags: ['evening bag', 'party bag', 'box clutch', 'womens', 'catalogue'],
      capacity: '2L',
      ratingAverage: 5.0,
      ratingCount: 16,
      soldCount: 35,
    },
    {
      name: 'WILDTANE Starlight Acrylic Box Clutch',
      slug: 'starlight-acrylic-box-clutch',
      sku: 'WT-W-BC-01',
      tagline: 'Hard-shell pearlized marble acrylic box clutch',
      badge: 'Excel Catalogue',
      shortDescription: 'Architectural hard box frame with clasp lock and gold cable chain.',
      description: '<p>A modern sculptural statement. Hand-poured marble swirls ensure each clutch is one of a kind. Sized for smartphones and cosmetics.</p>',
      category: bagsCat._id,
      subcategory: eveningSub._id,
      gender: 'women',
      price: 3799,
      salePrice: 2999,
      images: [
        { url: '/uploads/seed/catalog/eyecase-white.jpg', alt: 'Starlight Box Clutch' },
        { url: '/uploads/seed/catalog/eyecase-white-2.jpg', alt: 'Starlight Box Clutch Interior' },
      ],
      variants: [
        { name: 'Pearlized White Marble', colorHex: '#fafafa', colorFamily: 'white', sku: 'WT-W-BC-01-MR', stock: 18 },
        { name: 'Smoked Tortoise', colorHex: '#451a03', colorFamily: 'brown', sku: 'WT-W-BC-01-TR', stock: 14 },
      ],
      materials: ['Hand-Poured Acrylic', 'Gold Metal Framework'],
      features: ['Magnetic Box Closure', 'Removable Snake Chain', 'Velvet Protective Lining'],
      tags: ['box clutch', 'clutch', 'minaudiere', 'womens', 'catalogue'],
      capacity: '1.2L',
      ratingAverage: 4.8,
      ratingCount: 19,
      soldCount: 42,
    },
    {
      name: 'WILDTANE Zardozi Handcrafted Silk Potli Bag',
      slug: 'zardozi-handcrafted-silk-potli-bag',
      sku: 'WT-W-PB-01',
      tagline: 'Traditional gold threadwork potli with pearl tassel drawstrings',
      badge: 'Excel Catalogue',
      shortDescription: 'Pure raw silk base embroidered by master artisans with heavy zardozi motifs and beaded wristlet handle.',
      description: '<p>The quintessential wedding and festival accompaniment. Generous ruched pouch fits cash envelopes, smartphone, and makeup touch-ups.</p>',
      category: bagsCat._id,
      subcategory: eveningSub._id,
      gender: 'women',
      price: 2499,
      salePrice: 1999,
      images: [
        { url: '/uploads/seed/catalog/raffia-tassel.jpg', alt: 'Zardozi Silk Potli Bag' },
        { url: '/uploads/seed/catalog/basket-seaside.jpg', alt: 'Potli Detail' },
      ],
      variants: [
        { name: 'Royal Crimson Gold', colorHex: '#881337', colorFamily: 'rose', sku: 'WT-W-PB-01-CR', stock: 30 },
        { name: 'Ivory Brocade', colorHex: '#fef3c7', colorFamily: 'tan', sku: 'WT-W-PB-01-IV', stock: 25 },
      ],
      materials: ['Raw Mulberry Silk', 'Metallic Zardozi Thread', 'Glass Seed Pearls'],
      features: ['Pearl Wristlet Loop', 'Dual Beaded Tassels', 'Secure Drawstring Cinch'],
      tags: ['potli bag', 'potli', 'party bag', 'womens', 'catalogue', 'wedding'],
      capacity: '1.8L',
      ratingAverage: 4.9,
      ratingCount: 28,
      soldCount: 65,
    },

    // ── WOMENS COLLECTION: Office & Utility Bags
    {
      name: 'WILDTANE Chelsea 14-inch Executive Laptop Bag',
      slug: 'chelsea-14-inch-executive-laptop-bag',
      sku: 'WT-W-LB-01',
      tagline: 'Streamlined padded tech bag in saffiano leather',
      badge: 'Excel Catalogue',
      shortDescription: 'Dual top zip, plush 14" laptop sleeve, tablet cradle and trolley sleeve.',
      description: '<p>Tailored for the professional woman. Sleek lines prevent bulk while protecting tech gear, documents, chargers, and personal stationery.</p>',
      category: bagsCat._id,
      subcategory: laptopBagsSub._id,
      gender: 'women',
      price: 6499,
      salePrice: 5199,
      images: [
        { url: '/uploads/seed/catalog/laptop-sterling.jpg', alt: 'Chelsea Laptop Bag' },
        { url: '/uploads/seed/folio-espresso.jpg', alt: 'Chelsea Laptop Bag Folio' },
      ],
      variants: [
        { name: 'Midnight Onyx', colorHex: '#121212', colorFamily: 'onyx', sku: 'WT-W-LB-01-BK', stock: 22 },
        { name: 'Warm Taupe', colorHex: '#a8a29e', colorFamily: 'tan', sku: 'WT-W-LB-01-TP', stock: 18 },
      ],
      materials: ['Saffiano Leather', 'Shock-Absorbing EVA Foam', 'Micro-Felt Lining'],
      features: ['Suspended 14" Laptop Sleeve', 'Luggage Trolley Sleeve', 'Detachable Padded Strap'],
      tags: ['laptop bag', 'laptop bags', 'office bag', 'womens', 'catalogue'],
      capacity: '11L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 35,
      soldCount: 88,
    },
    {
      name: 'WILDTANE Metropolis Multi-Slot Organizer Bag',
      slug: 'metropolis-multi-slot-organizer-bag',
      sku: 'WT-W-OB-01',
      tagline: 'Accordion-fold file and commute organizer bag',
      badge: 'Excel Catalogue',
      shortDescription: 'Three divided main compartments with dedicated slots for notebooks, pens, cards and chargers.',
      description: '<p>Keep every meeting item in its rightful place. Premium leather trim with lightweight ballistic nylon body and magnetic flap closure.</p>',
      category: bagsCat._id,
      subcategory: organizerBagsSub._id,
      gender: 'women',
      price: 4299,
      salePrice: 3499,
      images: [
        { url: '/uploads/seed/catalog/portfolio-atlas.jpg', alt: 'Metropolis Organizer Bag' },
        { url: '/uploads/seed/cable-pouch.jpg', alt: 'Metropolis Organizer Detail' },
      ],
      variants: [
        { name: 'Charcoal Grey', colorHex: '#374151', colorFamily: 'grey', sku: 'WT-W-OB-01-CG', stock: 25 },
        { name: 'Cognac Saddle', colorHex: '#7c2d12', colorFamily: 'brown', sku: 'WT-W-OB-01-CG', stock: 20 },
      ],
      materials: ['Ballistic Nylon', 'Full-Grain Leather Flap', 'Brass Buckle'],
      features: ['Triple Accordion Dividers', 'Pen & Stylus Loops', 'Key Leash Ring'],
      tags: ['organizer bag', 'work tote', 'office bag', 'womens', 'catalogue'],
      capacity: '9L',
      ratingAverage: 4.7,
      ratingCount: 20,
      soldCount: 45,
    },

    // ── WOMENS COLLECTION: Trendy & Special Styles
    {
      name: 'WILDTANE Mayfair Chevron Quilted Flap Bag',
      slug: 'mayfair-chevron-quilted-flap-bag',
      sku: 'WT-W-QB-01',
      tagline: 'Plush chevron quilted lambskin with gold slide chain',
      badge: 'Excel Catalogue',
      shortDescription: 'Signature diamond chevron stitch, double-chain convertible handle, and turnstile lock.',
      description: '<p>An iconic wardrobe centerpiece. The Mayfair Quilted Bag transitions instantly from double-shoulder strap to long single crossbody drape.</p>',
      category: bagsCat._id,
      subcategory: quiltedSub._id,
      gender: 'women',
      price: 4699,
      salePrice: 3799,
      images: [
        { url: '/uploads/seed/catalog/chain-chevron.jpg', alt: 'Mayfair Quilted Bag' },
        { url: '/uploads/seed/catalog/chain-chevron-mauve.jpg', alt: 'Mayfair Quilted Bag Mauve' },
      ],
      variants: [
        { name: 'Caviar Black', colorHex: '#141414', colorFamily: 'onyx', sku: 'WT-W-QB-01-BK', stock: 28 },
        { name: 'Blush Cream', colorHex: '#f5ebe0', colorFamily: 'white', sku: 'WT-W-QB-01-CR', stock: 20 },
      ],
      materials: ['Padded Lambskin', 'Polished Brass Hardware'],
      features: ['Convertible Chain Strap', 'Turnstile Lock', 'Interior Lip Pocket'],
      tags: ['quilted bag', 'chain bag', 'womens', 'catalogue'],
      capacity: '4.5L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 44,
      soldCount: 112,
    },
    {
      name: 'WILDTANE Morph 3-in-1 Backpack Crossbody Bag',
      slug: 'morph-3-in-1-backpack-crossbody-bag',
      sku: 'WT-W-CB-02',
      tagline: 'Convertible straps transform backpack to crossbody or shoulder carry',
      badge: 'Excel Catalogue',
      shortDescription: 'Modular clips allow quick conversion between backpack, crossbody, or sleek tote in seconds.',
      description: '<p>For the dynamic explorer. Water-repellent nylon body trimmed in full-grain leather, featuring anti-theft back zip and side water bottle slips.</p>',
      category: bagsCat._id,
      subcategory: quiltedSub._id,
      gender: 'women',
      price: 5499,
      salePrice: 4399,
      images: [
        { url: '/uploads/seed/catalog/backpack-mini-city.jpg', alt: 'Morph Convertible Bag' },
        { url: '/uploads/seed/catalog/backpack-fulton.jpg', alt: 'Morph Bag Back' },
      ],
      variants: [
        { name: 'Olive Green', colorHex: '#3f4f34', colorFamily: 'olive', sku: 'WT-W-CB-02-OL', stock: 22 },
        { name: 'Obsidian Black', colorHex: '#111111', colorFamily: 'onyx', sku: 'WT-W-CB-02-BK', stock: 26 },
      ],
      materials: ['Water-Repellent Twill', 'Full-Grain Leather Trims'],
      features: ['3-Way Convertible Straps', 'Anti-Theft Hidden Pocket', 'Expandable Gussets'],
      tags: ['convertible bag', 'backpack', 'crossbody bag', 'womens', 'catalogue'],
      capacity: '12L',
      ratingAverage: 4.8,
      ratingCount: 33,
      soldCount: 78,
    },

    // ── WOMENS COLLECTION: Belts, Cloth & Perfumes
    {
      name: 'WILDTANE Classic Slim Dress Belt',
      slug: 'classic-slim-dress-belt',
      sku: 'WT-W-BL-01',
      tagline: '18mm Italian leather belt with polished gold oval buckle',
      badge: 'Excel Catalogue',
      shortDescription: 'Vegetable-tanned leather, hand-burnished edges, and featherweight oval buckle.',
      description: '<p>Flawlessly pairs with tailored trousers, linen skirts, and blazers. Subtle edge stitching guarantees long-lasting resilience.</p>',
      category: accessCat._id,
      subcategory: beltsSub._id,
      gender: 'women',
      price: 1499,
      salePrice: 1199,
      images: [
        { url: '/uploads/seed/catalog/bifold-tan.jpg', alt: 'Classic Slim Belt' },
        { url: '/uploads/seed/catalog/cardholder-tan.jpg', alt: 'Slim Belt Leather' },
      ],
      variants: [
        { name: 'Chestnut Tan', colorHex: '#92400e', colorFamily: 'tan', sku: 'WT-W-BL-01-TN', stock: 35 },
        { name: 'Midnight Black', colorHex: '#131313', colorFamily: 'onyx', sku: 'WT-W-BL-01-BK', stock: 40 },
      ],
      materials: ['Full-Grain Italian Leather', 'Solid Brass Buckle'],
      features: ['Beveled & Burnished Edges', '5 Adjustment Holes', 'Keep Loop'],
      tags: ['belt', 'classic slim belt', 'womens', 'catalogue'],
      ratingAverage: 4.8,
      ratingCount: 25,
      soldCount: 70,
    },
    {
      name: 'WILDTANE Rosa & Amber Blossom Eau De Parfum 50ml',
      slug: 'rosa-amber-blossom-eau-de-parfum-50ml',
      sku: 'WT-W-PF-01',
      tagline: 'Artisanal perfume: Damask rose, warm amber, and pink peppercorn',
      badge: 'Excel Catalogue',
      shortDescription: 'Hand-blended artisanal Eau De Parfum with 20% fragrance oil concentration for 12+ hour longevity.',
      description: '<p>Top notes of fresh Turkish rose and sparkling bergamot melt into a heart of white amber, guaiac wood, and bourbon vanilla.</p>',
      category: accessCat._id,
      subcategory: perfumeSub._id,
      gender: 'women',
      price: 1899,
      salePrice: 1499,
      images: [
        { url: '/uploads/seed/catalog/bottle-lilac.jpg', alt: 'Rosa & Amber Blossom EDP' },
        { url: '/uploads/seed/catalog/bottle-trio.jpg', alt: 'WILDTANE Fragrance Collection' },
      ],
      variants: [
        { name: '50ml Spray Bottle', colorHex: '#c084fc', colorFamily: 'rose', sku: 'WT-W-PF-01-50', stock: 50 },
      ],
      materials: ['Organic Sugarcane Alcohol', 'Fragrance Oils', 'Heavy Glass Flacon'],
      features: ['20% Extrait Concentration', '12+ Hour Wear', 'IFRA Certified Safe'],
      tags: ['perfumes', 'perfume', 'fragrance', 'womens', 'catalogue'],
      ratingAverage: 4.9,
      ratingCount: 38,
      soldCount: 95,
    },

    // ── MENS COLLECTION: Everyday & Casual Bags
    {
      name: 'WILDTANE Vanguard Oxford Canvas Messenger Bag',
      slug: 'vanguard-oxford-canvas-messenger-bag',
      sku: 'WT-M-MB-01',
      tagline: 'Waterproof waxed canvas with quick-release magnetic fidlock buckles',
      badge: 'Excel Catalogue',
      shortDescription: 'Padded 15" laptop cradle, weather flap, multiple organizer pockets and luggage pass-through.',
      description: '<p>The Vanguard Messenger Bag is built for the daily grind. 16oz heavyweight waxed canvas repels rain while oiled leather details age with a handsome patina.</p>',
      category: bagsCat._id,
      subcategory: messengerSub._id,
      gender: 'men',
      price: 5699,
      salePrice: 4599,
      images: [
        { url: '/uploads/seed/catalog/messenger-dalton.jpg', alt: 'Vanguard Oxford Messenger Bag' },
        { url: '/uploads/seed/catalog/messenger-expedition.jpg', alt: 'Vanguard Messenger Canvas' },
      ],
      variants: [
        { name: 'Field Olive', colorHex: '#3f4e34', colorFamily: 'olive', sku: 'WT-M-MB-01-OL', stock: 24 },
        { name: 'Charcoal Black', colorHex: '#1f2937', colorFamily: 'grey', sku: 'WT-M-MB-01-BK', stock: 30 },
      ],
      materials: ['16oz Waxed Cotton Canvas', 'Full-Grain Leather', 'Fidlock Magnetic Buckles'],
      features: ['Padded 15" Laptop Sleeve', 'Luggage Trolley Strap', 'Water-Resistant Flap Closure'],
      tags: ['messenger bag', 'shoulder bag', 'mens', 'catalogue', 'laptop bags'],
      capacity: '14L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 46,
      soldCount: 120,
    },
    {
      name: 'WILDTANE Cambridge Heritage Leather Satchel',
      slug: 'cambridge-heritage-leather-satchel',
      sku: 'WT-M-SB-01',
      tagline: 'Traditional buckle-front satchel with modern magnetic snaps',
      badge: 'Excel Catalogue',
      shortDescription: 'Thick harness leather satchel with dual gussets, tablet sleeve, and reinforced top handle.',
      description: '<p>A classic reimagined. Crafted from 2.2mm pull-up leather that scuffs and self-heals beautifully, making it an heirloom piece for years to come.</p>',
      category: bagsCat._id,
      subcategory: messengerSub._id,
      gender: 'men',
      price: 6499,
      salePrice: 5199,
      images: [
        { url: '/uploads/seed/catalog/satchel-cambridge.jpg', alt: 'Cambridge Leather Satchel' },
        { url: '/uploads/seed/catalog/satchel-heirloom.jpg', alt: 'Cambridge Satchel Detail' },
      ],
      variants: [
        { name: 'Cognac Saddle', colorHex: '#9a3412', colorFamily: 'brown', sku: 'WT-M-SB-01-CG', stock: 18 },
        { name: 'Onyx Black', colorHex: '#111111', colorFamily: 'onyx', sku: 'WT-M-SB-01-BK', stock: 22 },
      ],
      materials: ['Pull-Up Bridle Leather', 'Solid Cast Brass Buckles'],
      features: ['Concealed Magnetic Snaps', 'Dual Interior Dividers', 'Padded Shoulder Pad'],
      tags: ['satchel bag', 'satchel', 'mens', 'catalogue', 'messenger bag'],
      capacity: '11L',
      ratingAverage: 4.8,
      ratingCount: 33,
      soldCount: 74,
    },
    {
      name: 'WILDTANE Trailhead Water-Resistant Belt Bag',
      slug: 'trailhead-water-resistant-belt-bag',
      sku: 'WT-M-BB-01',
      tagline: 'Heavy-duty Cordura ripstop waist pack and cross-body sling',
      badge: 'Excel Catalogue',
      shortDescription: 'Tactical webbing, waterproof YKK Aquaguard zips, key leash, and phone holster.',
      description: '<p>Engineered for high mobility. Wear it across the chest or cinched at the hip during flights, motorcycle rides, or trail exploration.</p>',
      category: bagsCat._id,
      subcategory: beltBagsSub._id,
      gender: 'men',
      price: 2699,
      salePrice: 2099,
      images: [
        { url: '/uploads/seed/catalog/beltbag-grey.jpg', alt: 'Trailhead Belt Bag' },
        { url: '/uploads/seed/catalog/beltbag-blue.jpg', alt: 'Trailhead Belt Bag Blue' },
      ],
      variants: [
        { name: 'Storm Grey', colorHex: '#4b5563', colorFamily: 'grey', sku: 'WT-M-BB-01-GR', stock: 35 },
        { name: 'Navy Blue', colorHex: '#1e3a8a', colorFamily: 'navy', sku: 'WT-M-BB-01-NV', stock: 28 },
      ],
      materials: ['Cordura 500D Nylon', 'YKK Aquaguard Zips', 'Duraflex Quick Buckle'],
      features: ['Waterproof Zippers', 'Breathable Mesh Back', 'Elastic Gear Bungees'],
      tags: ['belt bag', 'waist pack', 'crossbody bag', 'mens', 'catalogue'],
      capacity: '3.5L',
      ratingAverage: 4.7,
      ratingCount: 29,
      soldCount: 85,
    },

    // ── MENS COLLECTION: Business & Office Bags
    {
      name: 'WILDTANE Sterling Full-Grain Leather Briefcase',
      slug: 'sterling-full-grain-leather-briefcase',
      sku: 'WT-M-BC-01',
      tagline: 'Executive lockable leather briefcase for 16" laptops and legal files',
      badge: 'Excel Catalogue',
      shortDescription: 'Double gusset architecture, solid brass combination lock, and suede interior lining.',
      description: '<p>The pinnacle of board-level craftsmanship. The Sterling Briefcase projects confidence and authority while keeping high-value hardware and contracts impeccably protected.</p>',
      category: bagsCat._id,
      subcategory: briefcasesSub._id,
      gender: 'men',
      price: 8999,
      salePrice: 7299,
      images: [
        { url: '/uploads/seed/briefcase-black.jpg', alt: 'Sterling Leather Briefcase in Black' },
        { url: '/uploads/seed/briefcase-cognac.jpg', alt: 'Sterling Briefcase Cognac' },
      ],
      variants: [
        { name: 'Executive Black', colorHex: '#101010', colorFamily: 'onyx', sku: 'WT-M-BC-01-BK', stock: 20 },
        { name: 'Cognac Amber', colorHex: '#78350f', colorFamily: 'brown', sku: 'WT-M-BC-01-CG', stock: 15 },
      ],
      materials: ['Full-Grain Cowhide', 'Solid Brass Key Lock', 'Microfiber Suede'],
      features: ['Dedicated 16" Laptop Pocket', 'Accordion Document Organizer', 'Reinforced Padded Handle'],
      tags: ['breifcase', 'briefcase', 'office bags', 'mens', 'catalogue', 'business'],
      capacity: '15L',
      isFeatured: true,
      ratingAverage: 5.0,
      ratingCount: 42,
      soldCount: 96,
    },
    {
      name: 'WILDTANE Stratus Padded 15.6-inch Laptop Bag',
      slug: 'stratus-padded-15-6-inch-laptop-bag',
      sku: 'WT-M-LB-01',
      tagline: 'Shockproof laptop bag with 360-degree edge bumper protection',
      badge: 'Excel Catalogue',
      shortDescription: 'Dual zip top, front charger accessory pocket, memory foam padding, and detachable shoulder strap.',
      description: '<p>Sleek, lightweight, and engineered to withstand drop impacts. Fits laptops up to 15.6 inches with dedicated tablet pocket and power brick pouch.</p>',
      category: bagsCat._id,
      subcategory: laptopBagsSub._id,
      gender: 'men',
      price: 5399,
      salePrice: 4299,
      images: [
        { url: '/uploads/seed/apex-navy.jpg', alt: 'Stratus Laptop Bag' },
        { url: '/uploads/seed/catalog/laptop-sterling.jpg', alt: 'Stratus Laptop Detail' },
      ],
      variants: [
        { name: 'Midnight Navy', colorHex: '#1e293b', colorFamily: 'navy', sku: 'WT-M-LB-01-NV', stock: 30 },
        { name: 'Stealth Black', colorHex: '#141414', colorFamily: 'onyx', sku: 'WT-M-LB-01-BK', stock: 35 },
      ],
      materials: ['900D Poly Oxford', 'CornerArmor Shock Foam', 'Water-Resistant Coating'],
      features: ['CornerArmor Drop Protection', 'Fleece-Lined Compartment', 'Trolley Passthrough'],
      tags: ['laptop bags', 'laptop bag', 'document bag', 'mens', 'catalogue'],
      capacity: '12L',
      ratingAverage: 4.8,
      ratingCount: 39,
      soldCount: 105,
    },

    // ── MENS COLLECTION: Outdoor & Small Bags
    {
      name: 'WILDTANE Overnighter Heavyweight Rugged Duffel',
      slug: 'overnighter-heavyweight-rugged-duffel',
      sku: 'WT-M-DF-01',
      tagline: 'Waxed canvas duffel with separate ventilated shoe compartment',
      badge: 'Excel Catalogue',
      shortDescription: '45L carry-on approved capacity, heavy brass zippers, reinforced bottom, and wet laundry pouch.',
      description: '<p>Designed for weekend getaways and rugged cross-country trips. The separate zippered bottom compartment isolates sneakers and gym gear from clean garments.</p>',
      category: bagsCat._id,
      subcategory: duffleSub._id,
      gender: 'men',
      price: 5799,
      salePrice: 4699,
      images: [
        { url: '/uploads/seed/catalog/duffel-ranger.jpg', alt: 'Overnighter Rugged Duffel' },
        { url: '/uploads/seed/catalog/duffel-transit.jpg', alt: 'Overnighter Duffel Detail' },
      ],
      variants: [
        { name: 'Ranger Olive', colorHex: '#3b4d2b', colorFamily: 'olive', sku: 'WT-M-DF-01-OL', stock: 25 },
        { name: 'Waxed Tan', colorHex: '#b45309', colorFamily: 'tan', sku: 'WT-M-DF-01-TN', stock: 22 },
      ],
      materials: ['Waxed Heavy Duck Canvas', 'Full-Grain Leather Handles', 'Antiqued Brass Zippers'],
      features: ['Ventilated Shoe Garage', 'TSA Cabin Size Compliant', 'Padded Ergonomic Shoulder Strap'],
      tags: ['duffel bag', 'duffle bag', 'backpack', 'mens', 'catalogue', 'outdoor'],
      capacity: '45L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 52,
      soldCount: 135,
    },
    {
      name: 'WILDTANE Heritage Water-Resistant Dopp Kit Toiletry Bag',
      slug: 'heritage-water-resistant-dopp-kit-toiletry-bag',
      sku: 'WT-M-TP-01',
      tagline: 'Structured wide-mouth shaving and grooming toiletry bag',
      badge: 'Excel Catalogue',
      shortDescription: 'Wipeable waterproof interior lining, framed wire opening that stays open, and toothbrush loops.',
      description: '<p>Never dig blindly for razor or shampoo again. Doctor-bag frame stays wide open on hotel bathroom counters, with spill-proof antimicrobial lining.</p>',
      category: travelCat._id,
      subcategory: toiletrySub._id,
      gender: 'men',
      price: 2299,
      salePrice: 1799,
      images: [
        { url: '/uploads/seed/catalog/pouch-toiletry.jpg', alt: 'Heritage Dopp Kit Toiletry Bag' },
        { url: '/uploads/seed/catalog/dopp-heritage-black.jpg', alt: 'Heritage Dopp Kit Black' },
      ],
      variants: [
        { name: 'Hickory Brown', colorHex: '#602808', colorFamily: 'brown', sku: 'WT-M-TP-01-BR', stock: 40 },
        { name: 'Carbon Black', colorHex: '#181818', colorFamily: 'onyx', sku: 'WT-M-TP-01-BK', stock: 35 },
      ],
      materials: ['Water-Repellent Canvas', 'Wipeable TPU Lining', 'Full-Grain Leather Handle'],
      features: ['Doctor-Bag Wire Stay-Open Frame', 'Leak-Proof Interior Lining', 'Breathable Mesh Pouch'],
      tags: ['toiletry bag', 'travel pouch', 'utility pouch', 'mens', 'catalogue'],
      capacity: '4L',
      ratingAverage: 4.8,
      ratingCount: 31,
      soldCount: 88,
    },

    // ── MENS COLLECTION: Wallets & Belts
    {
      name: 'WILDTANE Executive Full-Grain Bifold Wallet',
      slug: 'executive-full-grain-bifold-wallet',
      sku: 'WT-M-WL-01',
      tagline: 'Slim bifold with 8 card slots, bill divider and RFID shield',
      badge: 'Excel Catalogue',
      shortDescription: 'Hand-burnished Italian calfskin, ultra-slim profile that never bulges in trousers.',
      description: '<p>The consummate classic. Constructed from a single hide with edge-painted seams and certified RFID blocking layer to keep tap-to-pay cards safe from skimmers.</p>',
      category: accessCat._id,
      subcategory: walletsSub._id,
      gender: 'men',
      price: 1499,
      salePrice: 1199,
      images: [
        { url: '/uploads/seed/catalog/bifold-brown.jpg', alt: 'Executive Bifold Wallet' },
        { url: '/uploads/seed/wallet-onyx.jpg', alt: 'Executive Bifold Black' },
      ],
      variants: [
        { name: 'Bourbon Brown', colorHex: '#582b12', colorFamily: 'brown', sku: 'WT-M-WL-01-BR', stock: 50 },
        { name: 'Midnight Onyx', colorHex: '#101010', colorFamily: 'onyx', sku: 'WT-M-WL-01-BK', stock: 45 },
      ],
      materials: ['Full-Grain Calfskin', 'RFID Blocking Mesh'],
      features: ['8 Card Slots', 'Dual Currency Billfold', 'Hidden Receipt Pockets'],
      tags: ['wallet', 'bifold', 'slim', 'card holder', 'mens', 'catalogue'],
      ratingAverage: 4.9,
      ratingCount: 65,
      soldCount: 180,
    },
    {
      name: 'WILDTANE Classic Full-Grain Leather Dress Belt',
      slug: 'classic-full-grain-leather-dress-belt',
      sku: 'WT-M-BL-01',
      tagline: '35mm feather-edge Italian leather belt with brushed steel buckle',
      badge: 'Excel Catalogue',
      shortDescription: 'One-piece cut leather, bevelled edge, hand-painted seams, and hypoallergenic nickel-free buckle.',
      description: '<p>Pairs seamlessly with formal suits, chinos and denim. Built to resist stretching and creasing over years of daily wear.</p>',
      category: accessCat._id,
      subcategory: beltsSub._id,
      gender: 'men',
      price: 1599,
      salePrice: 1299,
      images: [
        { url: '/uploads/seed/catalog/bifold-tan.jpg', alt: 'Classic Dress Belt' },
        { url: '/uploads/seed/cardholder-tan.jpg', alt: 'Leather Texture' },
      ],
      variants: [
        { name: 'Dark Mahogany', colorHex: '#451a03', colorFamily: 'brown', sku: 'WT-M-BL-01-MH', stock: 40 },
        { name: 'Onyx Black', colorHex: '#121212', colorFamily: 'onyx', sku: 'WT-M-BL-01-BK', stock: 45 },
      ],
      materials: ['Full-Grain Cowhide', 'Brushed Stainless Buckle'],
      features: ['Feathered Edge Stitching', '5 Size Holes', 'Stitched Keeper Loop'],
      tags: ['belt', 'classic leather belt', 'formal belt', 'mens', 'catalogue'],
      ratingAverage: 4.8,
      ratingCount: 36,
      soldCount: 95,
    },
    {
      name: 'WILDTANE Smoked Cedar & Vetiver Noir EDP 50ml',
      slug: 'smoked-cedar-vetiver-noir-edp-50ml',
      sku: 'WT-M-PF-01',
      tagline: 'Sophisticated masculine scent: smoked cedarwood, bourbon and Haitian vetiver',
      badge: 'Excel Catalogue',
      shortDescription: 'Woody, warm and subtly spicy Eau De Parfum crafted for the discerning modern gentleman.',
      description: '<p>Opens with crisp bergamot and black cardamom, revealing a rich smoky heart of Virginian cedar and amber, drying down into earthy Haitian vetiver.</p>',
      category: accessCat._id,
      subcategory: perfumeSub._id,
      gender: 'men',
      price: 1899,
      salePrice: 1499,
      images: [
        { url: '/uploads/seed/catalog/bottle-trio.jpg', alt: 'Smoked Cedar EDP' },
        { url: '/uploads/seed/flask.jpg', alt: 'Fragrance Flacon' },
      ],
      variants: [
        { name: '50ml Spray Bottle', colorHex: '#1c1917', colorFamily: 'onyx', sku: 'WT-M-PF-01-50', stock: 45 },
      ],
      materials: ['Organic Perfumer Alcohol', 'Natural Essential Oils', 'Weighted Cap'],
      features: ['20% Extrait Concentration', 'All-Day Sillage', 'Hypoallergenic Formula'],
      tags: ['perfumes', 'perfume', 'fragrance', 'mens', 'catalogue'],
      ratingAverage: 4.9,
      ratingCount: 31,
      soldCount: 82,
    },

    // ── TRAVEL AND UTILITY: All Backpacks from Excel
    {
      name: 'WILDTANE TechnoShield 16-inch Laptop Backpack',
      slug: 'technoshield-16-inch-laptop-backpack',
      sku: 'WT-TU-LB-01',
      tagline: 'Waterproof tech commuter pack with suspended false-bottom laptop sleeve',
      badge: 'Excel Catalogue',
      shortDescription: 'Suspended 16" laptop cradle, waterproof laminated shell, hidden passport sleeve, and magnetic sternum strap.',
      description: '<p>The ultimate commuter companion from our Excel catalogue. Engineered to protect fragile electronics even in hard subway bumps and heavy tropical downpours.</p>',
      category: travelCat._id,
      subcategory: laptopBackpackSub._id,
      gender: 'unisex',
      price: 6899,
      salePrice: 5499,
      images: [
        { url: '/uploads/seed/apex-slate.jpg', alt: 'TechnoShield Laptop Backpack Slate' },
        { url: '/uploads/seed/apex-interior.jpg', alt: 'TechnoShield Interior Org' },
        { url: '/uploads/seed/apex-harness.jpg', alt: 'TechnoShield Ergonomic Harness' },
      ],
      variants: [
        { name: 'Slate Grey', colorHex: '#475569', colorFamily: 'grey', sku: 'WT-TU-LB-01-SL', stock: 30 },
        { name: 'Stealth Black', colorHex: '#0f172a', colorFamily: 'onyx', sku: 'WT-TU-LB-01-BK', stock: 35 },
      ],
      materials: ['Cordura Ballistic 840D', 'High-Density EVA Foam', 'Waterproof YKK Zips'],
      features: ['False-Bottom 16" Laptop Bay', 'Airflow Mesh Back Panel', 'Luggage Trolley Passthrough', 'Fidlock Sternum Clasp'],
      tags: ['laptop backpack', 'smart backpack', 'travel and utility', 'catalogue', 'backpack'],
      capacity: '24L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 58,
      soldCount: 160,
    },
    {
      name: 'WILDTANE Campus Multi-Pocket Student Backpack',
      slug: 'campus-multi-pocket-student-backpack',
      sku: 'WT-TU-SB-01',
      tagline: 'Lightweight ergonomic backpack with dual drink sleeves and 15" padded sleeve',
      badge: 'Excel Catalogue',
      shortDescription: 'Reinforced base, water-resistant 600D ripstop, organizer panel for pens and calculators.',
      description: '<p>Built to endure heavy textbooks, laptops, and campus life. S-curved shoulder straps relieve spinal pressure while reflective accents enhance night safety.</p>',
      category: travelCat._id,
      subcategory: studentBackpackSub._id,
      gender: 'unisex',
      price: 3499,
      salePrice: 2699,
      images: [
        { url: '/uploads/seed/catalog/backpack-hudson.jpg', alt: 'Campus Student Backpack' },
        { url: '/uploads/seed/catalog/backpack-fulton.jpg', alt: 'Campus Backpack Detail' },
      ],
      variants: [
        { name: 'Cobalt Blue', colorHex: '#1d4ed8', colorFamily: 'navy', sku: 'WT-TU-SB-01-BL', stock: 40 },
        { name: 'Forest Moss', colorHex: '#166534', colorFamily: 'olive', sku: 'WT-TU-SB-01-GN', stock: 35 },
      ],
      materials: ['600D Ripstop Polyester', 'Breathable Sponge Mesh'],
      features: ['Dual Expandable Bottle Sleeves', 'Reflective Night Strips', 'Reinforced Base Cushion'],
      tags: ['student backpack', 'backpack', 'travel and utility', 'catalogue'],
      capacity: '22L',
      ratingAverage: 4.7,
      ratingCount: 42,
      soldCount: 115,
    },
    {
      name: 'WILDTANE Heritage Waxed Canvas Rucksack Backpack',
      slug: 'heritage-waxed-canvas-rucksack-backpack',
      sku: 'WT-TU-CB-01',
      tagline: 'Waxed canvas trail rucksack with top leather flap and drawstring',
      badge: 'Excel Catalogue',
      shortDescription: 'Thick 18oz waxed canvas, heavy leather bridle straps, antique brass hardware and side access laptop zipper.',
      description: '<p>Classic alpine aesthetic meets modern utility. The wax develops distinctive creases with every journey, creating a personal road-map on your pack.</p>',
      category: travelCat._id,
      subcategory: canvasBackpackSub._id,
      gender: 'unisex',
      price: 4899,
      salePrice: 3899,
      images: [
        { url: '/uploads/seed/catalog/rucksack-prairie.jpg', alt: 'Heritage Waxed Canvas Rucksack' },
        { url: '/uploads/seed/catalog/pack-alpine.jpg', alt: 'Rucksack Detail' },
      ],
      variants: [
        { name: 'Khaki Sand', colorHex: '#d97706', colorFamily: 'tan', sku: 'WT-TU-CB-01-KH', stock: 25 },
        { name: 'Heritage Olive', colorHex: '#365314', colorFamily: 'olive', sku: 'WT-TU-CB-01-OL', stock: 20 },
      ],
      materials: ['18oz Waxed Duck Canvas', 'Top-Grain Saddle Leather', 'Cast Brass Buckles'],
      features: ['Side-Access Laptop Zip', 'Quick-Release Magnetic Straps', 'Drawcord Storm Flap'],
      tags: ['canvas backpack', 'vintage backpack', 'travel and utility', 'catalogue', 'backpack'],
      capacity: '25L',
      ratingAverage: 4.8,
      ratingCount: 37,
      soldCount: 88,
    },
    {
      name: 'WILDTANE Aero 18L Minimalist Commuter Backpack',
      slug: 'aero-18l-minimalist-commuter-backpack',
      sku: 'WT-TU-MB-01',
      tagline: 'Ultra-clean profile with concealed seams and clamshell opening',
      badge: 'Excel Catalogue',
      shortDescription: 'Zero exterior clutter. Magnetic auto-align flap, quick-access card slot on shoulder strap and 15" tech bay.',
      description: '<p>The purest expression of modern minimalism. Opens flat 180 degrees like a suitcase for effortless packing while maintaining a knife-edge slim profile on crowded transit.</p>',
      category: travelCat._id,
      subcategory: minimalistBackpackSub._id,
      gender: 'unisex',
      price: 4299,
      salePrice: 3399,
      images: [
        { url: '/uploads/seed/daypack-grey.jpg', alt: 'Aero Minimalist Backpack' },
        { url: '/uploads/seed/daypack-navy.jpg', alt: 'Aero Minimalist Navy' },
      ],
      variants: [
        { name: 'Concrete Grey', colorHex: '#64748b', colorFamily: 'grey', sku: 'WT-TU-MB-01-GR', stock: 30 },
        { name: 'Deep Space Black', colorHex: '#09090b', colorFamily: 'onyx', sku: 'WT-TU-MB-01-BK', stock: 35 },
      ],
      materials: ['Water-Repellent Polyurethane-Coated Nylon', 'Thermo-Formed Back Panel'],
      features: ['180° Clamshell Flat Opening', 'Strap Card Pocket for Metro Pass', 'Concealed Water Bottle Pocket'],
      tags: ['minimalist backpack', 'backpack', 'travel and utility', 'catalogue'],
      capacity: '18L',
      ratingAverage: 4.9,
      ratingCount: 48,
      soldCount: 130,
    },
    {
      name: 'WILDTANE CyberTech USB Smart Backpack',
      slug: 'cybertech-usb-smart-backpack',
      sku: 'WT-TU-SB-02',
      tagline: 'Integrated USB-C & USB-A fast-charging ports with power bank bay',
      badge: 'Excel Catalogue',
      shortDescription: 'External waterproof charging dock, headphone routing, TSA luggage strap, and padded 16" tech sleeve.',
      description: '<p>Charge your devices on the move. Connect your power bank inside the designated cable dock and plug your phone directly into the exterior USB-C port while on transit.</p>',
      category: travelCat._id,
      subcategory: smartBackpackSub._id,
      gender: 'unisex',
      price: 7499,
      salePrice: 5999,
      images: [
        { url: '/uploads/seed/catalog/rolltop-ridgeline.jpg', alt: 'CyberTech USB Smart Backpack' },
        { url: '/uploads/seed/apex-side-pocket.jpg', alt: 'Smart Backpack Port Detail' },
      ],
      variants: [
        { name: 'Carbon Black', colorHex: '#18181b', colorFamily: 'onyx', sku: 'WT-TU-SB-02-BK', stock: 30 },
        { name: 'Gunmetal Titanium', colorHex: '#334155', colorFamily: 'grey', sku: 'WT-TU-SB-02-GM', stock: 25 },
      ],
      materials: ['High-Tenacity 1000D Cordura', 'Splashproof Silicone USB Port Guard'],
      features: ['Integrated USB-C + USB-A Dock', 'RFID Shield Secret Passport Pocket', 'Luggage Trolley Attachment'],
      tags: ['smart backpack', 'anti theft backpack', 'laptop backpack', 'travel and utility', 'catalogue'],
      capacity: '26L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 52,
      soldCount: 145,
    },
    {
      name: 'WILDTANE Vault TSA Lock Anti-Theft Backpack',
      slug: 'vault-tsa-lock-anti-theft-backpack',
      sku: 'WT-TU-AT-01',
      tagline: 'TSA combo lock, slash-proof steel mesh lining & hidden zips',
      badge: 'Excel Catalogue',
      shortDescription: 'Zero front-facing zippers. All compartment access is pressed against your back to prevent pickpocketing.',
      description: '<p>Travel with total peace of mind in high-density tourist hotspots. Dual zipper sliders lock into a flush 3-digit TSA combination dial, and inner Kevlar-blend mesh resists razor slashing.</p>',
      category: travelCat._id,
      subcategory: antiTheftBackpackSub._id,
      gender: 'unisex',
      price: 6299,
      salePrice: 4999,
      images: [
        { url: '/uploads/seed/catalog/pack-highland.jpg', alt: 'Vault Anti-Theft Backpack' },
        { url: '/uploads/seed/catalog/cabin-metro.jpg', alt: 'Vault Anti-Theft Security Detail' },
      ],
      variants: [
        { name: 'Stealth Shadow', colorHex: '#171717', colorFamily: 'onyx', sku: 'WT-TU-AT-01-BK', stock: 35 },
        { name: 'Midnight Heather', colorHex: '#374151', colorFamily: 'grey', sku: 'WT-TU-AT-01-HT', stock: 28 },
      ],
      materials: ['Slash-Proof Kevlar-Weave Fabric', 'Integrated Zinc TSA Lock'],
      features: ['Rear Hidden Zippers', 'Integrated TSA Combination Lock', 'Steel Wire Reinforced Strap'],
      tags: ['anti theft backpack', 'backpack', 'smart backpack', 'travel and utility', 'catalogue'],
      capacity: '23L',
      isFeatured: true,
      ratingAverage: 5.0,
      ratingCount: 61,
      soldCount: 175,
    },
    {
      name: 'WILDTANE Voyager 2-in-1 Wheeled Rolling Backpack',
      slug: 'voyager-2-in-1-wheeled-rolling-backpack',
      sku: 'WT-TU-RB-01',
      tagline: 'Smooth silent inline skate wheels with telescoping alloy handle',
      badge: 'Excel Catalogue',
      shortDescription: 'Effortlessly glides through airport concourses or converts to a backpack when tackling stairs with hideaway straps.',
      description: '<p>The ultimate hybrid luggage for multi-modal travel. Features corner wheel guards to prevent dirt on clothes, padded 17" laptop bay, and airline carry-on approved dimensions.</p>',
      category: travelCat._id,
      subcategory: rollingBackpackSub._id,
      gender: 'unisex',
      price: 8499,
      salePrice: 6799,
      images: [
        { url: '/uploads/seed/catalog/cabin-metro.jpg', alt: 'Voyager Rolling Backpack' },
        { url: '/uploads/seed/cabin-hardshell.jpg', alt: 'Voyager Rolling Wheels' },
      ],
      variants: [
        { name: 'Executive Obsidian', colorHex: '#0c0a09', colorFamily: 'onyx', sku: 'WT-TU-RB-01-BK', stock: 20 },
        { name: 'Navy Meridian', colorHex: '#172554', colorFamily: 'navy', sku: 'WT-TU-RB-01-NV', stock: 18 },
      ],
      materials: ['Tear-Resistant Ballistic Nylon', 'Aircraft-Grade Aluminum Handle', 'Polyurethane Inline Skate Wheels'],
      features: ['Telescopic Dual-Pole Alloy Handle', 'Tuck-Away Padded Backpack Straps', 'Wheel Shield Dirt Flap'],
      tags: ['rolling backpack', 'backpack', 'cabin luggage', 'travel and utility', 'catalogue'],
      capacity: '36L',
      ratingAverage: 4.8,
      ratingCount: 39,
      soldCount: 92,
    },
    {
      name: 'WILDTANE Summit 40L Ergonomic Hiking Backpack',
      slug: 'summit-40l-ergonomic-hiking-backpack',
      sku: 'WT-TU-HB-01',
      tagline: 'Internal aluminum frame suspension with rainfly & pole loops',
      badge: 'Excel Catalogue',
      shortDescription: '40L expedition capacity, load-bearing padded hip belt, hydration bladder sleeve, and bottom sleeping pad straps.',
      description: '<p>Conquer mountain trails in total comfort. Ventilated trampoline mesh back panel keeps sweat off your shirt while internal aluminum stays transfer 80% of pack weight directly to your hips.</p>',
      category: travelCat._id,
      subcategory: hikingBackpackSub._id,
      gender: 'unisex',
      price: 5999,
      salePrice: 4799,
      images: [
        { url: '/uploads/seed/catalog/pack-summit.jpg', alt: 'Summit 40L Hiking Backpack' },
        { url: '/uploads/seed/catalog/drypack-coastline.jpg', alt: 'Summit Hiking Weatherproof' },
      ],
      variants: [
        { name: 'Alpine Orange & Slate', colorHex: '#c2410c', colorFamily: 'tan', sku: 'WT-TU-HB-01-OR', stock: 22 },
        { name: 'Pine Forest Green', colorHex: '#14532d', colorFamily: 'olive', sku: 'WT-TU-HB-01-GN', stock: 25 },
      ],
      materials: ['420D Diamond Ripstop Nylon', 'Internal Aluminum Stays', 'YKK Heavy Duty Zips'],
      features: ['Integrated High-Vis Rain Cover', 'Hydration Port & Internal 3L Sleeve', 'Heavy Duty Load Hip Belt'],
      tags: ['hiking backpack', 'backpack', 'travel and utility', 'catalogue', 'outdoor'],
      capacity: '40L',
      isFeatured: true,
      ratingAverage: 4.9,
      ratingCount: 47,
      soldCount: 110,
    },
  ];

  let added = 0;
  let updated = 0;

  for (const item of catalogueProducts) {
    if (item.tagline && item.tagline.length > 80) item.tagline = item.tagline.slice(0, 80);
    const existing = await Product.findOne({ $or: [{ slug: item.slug }, { sku: item.sku }] });
    if (!existing) {
      await Product.create(item);
      added++;
    } else {
      // update category/tags/badge to make sure it is linked to Excel catalogue
      existing.badge = existing.badge || 'Excel Catalogue';
      if (!existing.tags.includes('catalogue')) existing.tags.push('catalogue');
      await existing.save();
      updated++;
    }
  }

  console.log(`Excel Catalogue Sync Complete: Added ${added} new products, Updated ${updated} existing products.`);
}

// Run directly if invoked via node
if (process.argv[1] && process.argv[1].endsWith('seedExcelCatalogue.js')) {
  import('dotenv').then((dotenv) => dotenv.config({ path: './server/.env' })).catch(() => {});
  mongoose.connect(process.env.MONGODB_URI)
    .then(seedExcelCatalogue)
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
