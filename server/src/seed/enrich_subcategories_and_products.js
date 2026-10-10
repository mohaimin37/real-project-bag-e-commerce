import { connectDB, disconnectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

async function seed() {
  await connectDB();
  console.log('Seeding & enriching subcategories and products...');

  // 1. Get or ensure top-level categories
  const topBags = await Category.findOneAndUpdate(
    { slug: 'bags' },
    { $set: { name: 'Bags', slug: 'bags', tagline: 'Architectural luxury carry & daily essentials', 'image.url': '/uploads/seed/briefcase-black.jpg', parent: null, isActive: true, showInMenu: true, sortOrder: 1 } },
    { upsert: true, new: true }
  );

  const topTravel = await Category.findOneAndUpdate(
    { slug: 'travel-utility' },
    { $set: { name: 'Travel & Utility', slug: 'travel-utility', tagline: 'Hardshell luggage, backpacks & travel gear', 'image.url': '/uploads/seed/cabin-hardshell.jpg', parent: null, isActive: true, showInMenu: true, sortOrder: 2 } },
    { upsert: true, new: true }
  );

  const topAccessories = await Category.findOneAndUpdate(
    { slug: 'accessories' },
    { $set: { name: 'Accessories', slug: 'accessories', tagline: 'Wallets, belts, fragrance & leather small goods', 'image.url': '/uploads/seed/wallet-onyx.jpg', parent: null, isActive: true, showInMenu: true, sortOrder: 3 } },
    { upsert: true, new: true }
  );

  // 2. Define subcategory catalog
  const subcategoryDefs = [
    // Under Bags
    { name: 'Office Bags', slug: 'office-bags', parent: topBags._id, tagline: 'Executive leather briefcases & meeting bags', img: '/uploads/seed/briefcase-oxford.jpg', sort: 1 },
    { name: 'Laptop Bags', slug: 'laptop-bags', parent: topBags._id, tagline: 'Padded commuter laptop bags & messengers', img: '/uploads/seed/catalog/laptop-sterling.jpg', sort: 2 },
    { name: 'Handbags', slug: 'handbags', parent: topBags._id, tagline: 'Sculptural leather handbags for every occasion', img: '/uploads/seed/handbag-rose.jpg', sort: 3 },
    { name: 'Tote Bags', slug: 'tote-bags', parent: topBags._id, tagline: 'Spacious daily work totes & shoppers', img: '/uploads/seed/tote-teal.jpg', sort: 4 },
    { name: 'Crossbody Bags', slug: 'crossbody-bags', parent: topBags._id, tagline: 'Hands-free compact slings & crossbody carry', img: '/uploads/seed/catalog/crossbody-cloud.jpg', sort: 5 },
    { name: 'Sling Bags', slug: 'sling-bags', parent: topBags._id, tagline: 'Ergonomic urban slings & chest packs', img: '/uploads/seed/sling-black.jpg', sort: 6 },
    { name: 'Backpacks', slug: 'backpacks', parent: topBags._id, tagline: 'Commuter and travel backpacks with tech sleeves', img: '/uploads/seed/backpack-terracotta.jpg', sort: 7 },
    { name: 'Duffle Bags', slug: 'duffle-bags', parent: topBags._id, tagline: 'Overnight weekender duffles & gym bags', img: '/uploads/seed/duffle-tan.jpg', sort: 8 },
    { name: 'Clutches', slug: 'clutches', parent: topBags._id, tagline: 'Evening leather clutches & sleek wristlets', img: '/uploads/seed/clutch-espresso.jpg', sort: 9 },
    { name: 'Beach & Straw Bags', slug: 'beach-straw-bags', parent: topBags._id, tagline: 'Artisanal woven raffia & straw totes', img: '/uploads/seed/catalog/straw-riviera.jpg', sort: 10 },
    
    // Under Accessories
    { name: 'Wallets', slug: 'wallets', parent: topAccessories._id, tagline: 'RFID bifold wallets, cardholders & coin purses', img: '/uploads/seed/catalog/wallet-woodland.jpg', sort: 1 },
    { name: 'Belts', slug: 'belts', parent: topAccessories._id, tagline: 'Handcrafted full-grain leather belts with brass buckles', img: '/uploads/seed/catalog/keyfob-brown.jpg', sort: 2 },
    { name: 'Perfumes & Fragrance', slug: 'perfumes', parent: topAccessories._id, tagline: 'Artisanal botanical Eau de Parfum & fine fragrance', img: '/uploads/seed/catalog/bottle-lilac.jpg', sort: 3 },
    { name: 'Laptop Sleeves', slug: 'laptop-sleeves', parent: topAccessories._id, tagline: 'Ultra-slim leather & felt protective sleeves', img: '/uploads/seed/catalog/sleeve-saddle-tan.jpg', sort: 4 },
    { name: 'Toiletry Kits & Dopp Kits', slug: 'toiletry-kits', parent: topAccessories._id, tagline: 'Water-resistant travel dopp kits & washbags', img: '/uploads/seed/catalog/dopp-heritage-brown.jpg', sort: 5 },
    { name: 'Passport Holders', slug: 'passport-holders', parent: topAccessories._id, tagline: 'RFID travel wallets & passport organisers', img: '/uploads/seed/catalog/passport-atlas.jpg', sort: 6 },
    { name: 'Keychains & Keyfobs', slug: 'keychains', parent: topAccessories._id, tagline: 'Solid brass keyrings & full-grain key fobs', img: '/uploads/seed/catalog/keyfob-black.jpg', sort: 7 },
    { name: 'Eyewear Cases', slug: 'eyewear-cases', parent: topAccessories._id, tagline: 'Hard-shell structured leather sunglass cases', img: '/uploads/seed/catalog/eyecase-white.jpg', sort: 8 },
    { name: 'Hydration', slug: 'hydration', parent: topAccessories._id, tagline: 'Double-walled insulated drinkware & bottles', img: '/uploads/seed/catalog/bottle-trio.jpg', sort: 9 },
    { name: 'Apparel & T-Shirts', slug: 't-shirts', parent: topAccessories._id, tagline: 'Heavyweight Supima commuter cotton tees', img: '/uploads/seed/catalog/tote-cotton.jpg', sort: 10 },

    // Under Travel & Utility
    { name: 'Cabin Luggage', slug: 'cabin-luggage', parent: topTravel._id, tagline: 'Aviation-grade 360° Hinomoto spinner suitcases', img: '/uploads/seed/cabin-aluminium.jpg', sort: 1 },
    { name: 'Tech Briefcases', slug: 'tech-briefcases', parent: topTravel._id, tagline: 'Waterproof ballistic briefcases with clamshell access', img: '/uploads/seed/briefcase-black.jpg', sort: 2 },
    { name: 'Daypacks', slug: 'daypacks', parent: topTravel._id, tagline: 'Featherlight packable daypacks for day trips', img: '/uploads/seed/daypack-navy.jpg', sort: 3 },
    { name: 'Waterproof Commuters', slug: 'waterproof-commuters', parent: topTravel._id, tagline: 'IPX5 stormproof rolltop commuter packs', img: '/uploads/seed/pack-trailhead.jpg', sort: 4 },
    { name: 'Travel Organisers', slug: 'travel-organisers', parent: topTravel._id, tagline: 'Compression packing cubes & tech cable pouches', img: '/uploads/seed/packing-cube.jpg', sort: 5 },
  ];

  const subMap = {};
  for (const s of subcategoryDefs) {
    const doc = await Category.findOneAndUpdate(
      { slug: s.slug },
      { $set: { name: s.name, slug: s.slug, parent: s.parent, tagline: s.tagline, 'image.url': s.img, isActive: true, showInMenu: true, sortOrder: s.sort } },
      { upsert: true, new: true }
    );
    subMap[s.slug] = doc;
  }
  console.log(`Verified ${Object.keys(subMap).length} subcategories.`);

  // 3. New rich items for Men, Women, and Accessories with realistic stock (low stock alerts included)
  const newProducts = [
    // ── MEN: Office Bags / Briefcases
    {
      name: 'Diplomat Double-Gusset Leather Briefcase',
      slug: 'diplomat-double-gusset-leather-briefcase',
      sku: 'WT-BRIEF-DIPLO',
      tagline: 'Hand-burnished Italian bridle leather for boardroom excellence',
      badge: 'Bestseller',
      shortDescription: 'Constructed from vegetable-tanned bridle leather with twin accordion compartments, dedicated 16-inch padded laptop cradle, and solid antiqued brass push-lock closure.',
      category: topBags._id,
      subcategory: subMap['office-bags']._id,
      gender: 'men',
      price: 18999,
      salePrice: 15999,
      finalPrice: 15999,
      images: [
        { url: '/uploads/seed/briefcase-oxford.jpg', alt: 'Diplomat Leather Briefcase in Oxford Tan' },
        { url: '/uploads/seed/briefcase-black.jpg', alt: 'Diplomat Briefcase Rear & Trolley Strap' },
        { url: '/uploads/seed/briefcase-cognac.jpg', alt: 'Internal Gusset Detail' },
      ],
      variants: [
        { name: 'Oxford Tan', colorHex: '#9c5a32', colorFamily: 'tan', sku: 'WT-BRIEF-DIPLO-01', stock: 4, images: [{ url: '/uploads/seed/briefcase-oxford.jpg' }] },
        { name: 'Stealth Onyx', colorHex: '#121212', colorFamily: 'onyx', sku: 'WT-BRIEF-DIPLO-02', stock: 8, images: [{ url: '/uploads/seed/briefcase-black.jpg' }] },
      ],
      materials: ['Full-Grain Bridle Leather', 'Solid Antiqued Brass Hardware', 'Herringbone Twill Lining'],
      features: ['Dedicated 16" Laptop Compartment', 'Trolley Pass-Through Sleeve', 'Detachable Ergonomic Shoulder Strap', 'Document Organizer'],
      purposes: ['work', 'business'],
      capacity: '18L',
      stock: 12,
      lowStockThreshold: 10,
      isFeatured: true,
      isBestseller: true,
      ratingAverage: 4.9,
      ratingCount: 38,
      soldCount: 412,
    },
    // ── MEN: Laptop Messenger
    {
      name: 'Dalton Ballistic Canvas Messenger',
      slug: 'dalton-ballistic-canvas-messenger',
      sku: 'WT-MES-DALTON',
      tagline: 'Weatherproof 1680D nylon with magnetic Fidlock closure',
      badge: 'Commuter Choice',
      shortDescription: 'The ultimate daily commuter messenger bag. Features water-repellent 1680D ballistic nylon, quick-access Fidlock magnetic buckles, and waterproof zip pockets.',
      category: topBags._id,
      subcategory: subMap['laptop-bags']._id,
      gender: 'men',
      price: 8499,
      salePrice: 6999,
      finalPrice: 6999,
      images: [
        { url: '/uploads/seed/catalog/messenger-dalton.jpg', alt: 'Dalton Canvas Messenger Front' },
        { url: '/uploads/seed/catalog/laptop-sterling.jpg', alt: 'Laptop Sleeve Pocket' },
      ],
      variants: [
        { name: 'Storm Grey', colorHex: '#4a4d52', colorFamily: 'grey', sku: 'WT-MES-DALTON-01', stock: 6, images: [{ url: '/uploads/seed/catalog/messenger-dalton.jpg' }] },
        { name: 'Midnight Navy', colorHex: '#162238', colorFamily: 'navy', sku: 'WT-MES-DALTON-02', stock: 15, images: [{ url: '/uploads/seed/catalog/laptop-sterling.jpg' }] },
      ],
      materials: ['1680D Ballistic Cordura', 'Fidlock Magnetic Hardware', 'YKK Aquaguard Zips'],
      features: ['15.6" Suspended Tech Sleeve', 'Quick-Adjust Shoulder Strap', 'Hidden Passport Pocket'],
      purposes: ['transit', 'work'],
      capacity: '14L',
      stock: 21,
      lowStockThreshold: 10,
      isFeatured: false,
      isBestseller: true,
      ratingAverage: 4.7,
      ratingCount: 54,
      soldCount: 520,
    },
    // ── MEN: Leather Wallet
    {
      name: 'Woodland Slimline RFID Bifold Wallet',
      slug: 'woodland-slimline-rfid-bifold-wallet',
      sku: 'WT-WAL-WOOD',
      tagline: 'Ultra-thin profile holding 10+ cards with RFID protection',
      badge: 'Popular',
      shortDescription: 'Precision crafted from hand-waxed vegetable tanned leather with an integrated RFID blocking mesh to protect sensitive contactless cards.',
      category: topAccessories._id,
      subcategory: subMap['wallets']._id,
      gender: 'men',
      price: 2499,
      salePrice: 1899,
      finalPrice: 1899,
      images: [
        { url: '/uploads/seed/catalog/wallet-woodland.jpg', alt: 'Woodland Slimline Bifold' },
        { url: '/uploads/seed/catalog/wallet-zip.jpg', alt: 'Wallet Interior Card Slots' },
      ],
      variants: [
        { name: 'Saddle Tan', colorHex: '#a06535', colorFamily: 'tan', sku: 'WT-WAL-WOOD-01', stock: 5, images: [{ url: '/uploads/seed/catalog/wallet-woodland.jpg' }] },
        { name: 'Espresso Brown', colorHex: '#3b251a', colorFamily: 'brown', sku: 'WT-WAL-WOOD-02', stock: 18, images: [{ url: '/uploads/seed/catalog/wallet-woodland.jpg' }] },
      ],
      materials: ['Full-Grain Vegetable-Tanned Leather', 'RFID Shield Fabric'],
      features: ['8 Card Slots + 2 Hidden Pockets', 'Full-Length Currency Divider', 'Quick-Draw Thumb Slot'],
      purposes: ['transit', 'work'],
      capacity: '',
      stock: 23,
      lowStockThreshold: 10,
      isFeatured: true,
      isBestseller: true,
      ratingAverage: 4.8,
      ratingCount: 92,
      soldCount: 1100,
    },
    // ── MEN: Weekender Duffle
    {
      name: 'Highway Heritage Leather Weekender Duffle',
      slug: 'highway-heritage-leather-weekender-duffle',
      sku: 'WT-DUF-HIGHWAY',
      tagline: 'Generous 42L overnight holdall with ventilated shoe tunnel',
      badge: 'Cabin Approved',
      shortDescription: 'Rugged yet refined travel holdall built with oil-waxed full-grain leather, reinforced base feet, heavy-duty brass zips, and an isolated side compartment for footwear.',
      category: topBags._id,
      subcategory: subMap['duffle-bags']._id,
      gender: 'men',
      price: 14999,
      salePrice: 12499,
      finalPrice: 12499,
      images: [
        { url: '/uploads/seed/catalog/duffle-highway.jpg', alt: 'Highway Heritage Weekender Duffle' },
        { url: '/uploads/seed/duffle-tan.jpg', alt: 'Side View & Luggage Tag' },
      ],
      variants: [
        { name: 'Heritage Tan', colorHex: '#aa7041', colorFamily: 'tan', sku: 'WT-DUF-HIGHWAY-01', stock: 3, images: [{ url: '/uploads/seed/catalog/duffle-highway.jpg' }] },
        { name: 'Vintage Havana', colorHex: '#4d2e1c', colorFamily: 'brown', sku: 'WT-DUF-HIGHWAY-02', stock: 7, images: [{ url: '/uploads/seed/duffle-tan.jpg' }] },
      ],
      materials: ['Waxed Full-Grain Leather', 'Solid Cast Brass Hardware', 'Tear-Proof Cotton Canvas Lining'],
      features: ['Separate Shoe / Laundry Tunnel', 'TSA Cabin Size Approved', 'Reinforced Padded Handles'],
      purposes: ['travel'],
      capacity: '42L',
      stock: 10,
      lowStockThreshold: 10,
      isFeatured: true,
      isBestseller: true,
      ratingAverage: 4.9,
      ratingCount: 46,
      soldCount: 380,
    },

    // ── WOMEN: Luxury Handbags
    {
      name: 'Bloom Sculptural Structured Leather Handbag',
      slug: 'bloom-sculptural-structured-leather-handbag',
      sku: 'WT-HB-BLOOM',
      tagline: 'Architectural silhouette with custom gold-finished hardware',
      badge: 'New Arrival',
      shortDescription: 'A showstopping top-handle handbag featuring firm calfskin construction that never loses its form, a signature curved flap, and convertible crossbody strap.',
      category: topBags._id,
      subcategory: subMap['handbags']._id,
      gender: 'women',
      price: 12999,
      salePrice: 10499,
      finalPrice: 10499,
      images: [
        { url: '/uploads/seed/catalog/handbag-bloom.jpg', alt: 'Bloom Sculptural Handbag Front' },
        { url: '/uploads/seed/handbag-rose.jpg', alt: 'Top-Handle & Clasp Detail' },
      ],
      variants: [
        { name: 'Rose Petal', colorHex: '#c77884', colorFamily: 'pink', sku: 'WT-HB-BLOOM-01', stock: 5, images: [{ url: '/uploads/seed/catalog/handbag-bloom.jpg' }] },
        { name: 'Classic Ecru', colorHex: '#e8e2d5', colorFamily: 'white', sku: 'WT-HB-BLOOM-02', stock: 9, images: [{ url: '/uploads/seed/handbag-rose.jpg' }] },
      ],
      materials: ['Structured Calfskin Leather', '14k Brushed Gold Hardware', 'Microfiber Suede Lining'],
      features: ['Magnetic Flap Lock', 'Interior Zip Divider', 'Detachable Crossbody Strap'],
      purposes: ['creative', 'business'],
      capacity: '8L',
      stock: 14,
      lowStockThreshold: 10,
      isFeatured: true,
      isNewArrival: true,
      ratingAverage: 4.9,
      ratingCount: 29,
      soldCount: 280,
    },
    // ── WOMEN: Work Tote
    {
      name: 'Atelier Structured Professional Work Tote',
      slug: 'atelier-structured-professional-work-tote',
      sku: 'WT-TOTE-ATELIER',
      tagline: 'Featherlight carry fitting a 15" laptop without slumping',
      badge: 'Bestseller',
      shortDescription: 'Engineered for ambitious professionals: reinforced base studs, a central padded tech sleeve, magnetic key leash, and water-bottle holder.',
      category: topBags._id,
      subcategory: subMap['tote-bags']._id,
      gender: 'women',
      price: 9999,
      salePrice: 7999,
      finalPrice: 7999,
      images: [
        { url: '/uploads/seed/catalog/tote-atelier.jpg', alt: 'Atelier Work Tote in Muted Ochre' },
        { url: '/uploads/seed/tote-teal.jpg', alt: 'Interior Organization Compartments' },
      ],
      variants: [
        { name: 'Muted Ochre', colorHex: '#c49348', colorFamily: 'tan', sku: 'WT-TOTE-ATELIER-01', stock: 4, images: [{ url: '/uploads/seed/catalog/tote-atelier.jpg' }] },
        { name: 'Teal Lagoon', colorHex: '#256d6d', colorFamily: 'teal', sku: 'WT-TOTE-ATELIER-02', stock: 12, images: [{ url: '/uploads/seed/tote-teal.jpg' }] },
      ],
      materials: ['Lightweight Saffiano Leather', 'Gold-Tone Metal Zips', 'Spill-Proof Twill Lining'],
      features: ['15" Padded Laptop Sleeve', 'Key Leash Carabiner', 'Luggage Trolley Sleeve'],
      purposes: ['work', 'transit'],
      capacity: '16L',
      stock: 16,
      lowStockThreshold: 10,
      isFeatured: true,
      isBestseller: true,
      ratingAverage: 4.8,
      ratingCount: 65,
      soldCount: 840,
    },
    // ── WOMEN: Crossbody / Slings
    {
      name: 'Cloud Quilted Pebble Leather Crossbody',
      slug: 'cloud-quilted-pebble-leather-crossbody',
      sku: 'WT-SLG-CLOUD',
      tagline: 'Ultra-soft quilted Nappa leather with adjustable guitar strap',
      badge: 'Trend Pick',
      shortDescription: 'Plush cloud-stitched leather sling bag that transitions effortlessly from day exploring to evening events. Compact yet spacious enough for phone, wallet, cosmetics and keys.',
      category: topBags._id,
      subcategory: subMap['crossbody-bags']._id,
      gender: 'women',
      price: 5999,
      salePrice: 4699,
      finalPrice: 4699,
      images: [
        { url: '/uploads/seed/catalog/crossbody-cloud.jpg', alt: 'Cloud Quilted Crossbody Front' },
        { url: '/uploads/seed/catalog/crossbody-nova.jpg', alt: 'Guitar Strap & Zip Puller' },
      ],
      variants: [
        { name: 'Alabaster White', colorHex: '#f0ece1', colorFamily: 'white', sku: 'WT-SLG-CLOUD-01', stock: 6, images: [{ url: '/uploads/seed/catalog/crossbody-cloud.jpg' }] },
        { name: 'Blush Mauve', colorHex: '#b57984', colorFamily: 'pink', sku: 'WT-SLG-CLOUD-02', stock: 11, images: [{ url: '/uploads/seed/catalog/crossbody-nova.jpg' }] },
      ],
      materials: ['Pebble Grain Nappa Leather', 'Champagne Gold Hardware', 'Woven Jacquard Strap'],
      features: ['Dual Zip Compartments', 'Hidden Back Phone Pocket', 'Lightweight 380g Build'],
      purposes: ['creative', 'transit'],
      capacity: '4L',
      stock: 17,
      lowStockThreshold: 10,
      isFeatured: true,
      isNewArrival: true,
      ratingAverage: 4.7,
      ratingCount: 33,
      soldCount: 390,
    },
    // ── WOMEN: Straw & Beach
    {
      name: 'Riviera Artisanal Woven Straw Tote',
      slug: 'riviera-artisanal-woven-straw-tote',
      sku: 'WT-STR-RIVIERA',
      tagline: 'Hand-braided natural raffia with smooth leather trims',
      badge: 'Resort Collection',
      shortDescription: 'Hand-woven by master artisans using sustainable natural raffia, finished with hand-burnished tan leather handles and a secure drawstring linen inner pouch.',
      category: topBags._id,
      subcategory: subMap['beach-straw-bags']._id,
      gender: 'women',
      price: 6499,
      salePrice: 4999,
      finalPrice: 4999,
      images: [
        { url: '/uploads/seed/catalog/straw-riviera.jpg', alt: 'Riviera Straw Market Tote' },
        { url: '/uploads/seed/catalog/raffia-tassel.jpg', alt: 'Tassel Charm and Leather Handle' },
      ],
      variants: [
        { name: 'Natural Honey', colorHex: '#d8b26e', colorFamily: 'tan', sku: 'WT-STR-RIVIERA-01', stock: 4, images: [{ url: '/uploads/seed/catalog/straw-riviera.jpg' }] },
      ],
      materials: ['Madagascar Natural Raffia', 'Full-Grain Saddle Leather', 'Organic Linen Pouch'],
      features: ['Drawstring Linen Lining', 'Reinforced Flat Leather Base', 'Handcrafted Charm'],
      purposes: ['travel'],
      capacity: '20L',
      stock: 4,
      lowStockThreshold: 10,
      isFeatured: false,
      isNewArrival: false,
      ratingAverage: 4.8,
      ratingCount: 19,
      soldCount: 140,
    },

    // ── ALL ACCESSORIES: Fine Fragrance
    {
      name: 'Botanique Lilac & Amberwood Eau de Parfum (100ml)',
      slug: 'botanique-lilac-amberwood-eau-de-parfum-100ml',
      sku: 'WT-FRG-LILAC',
      tagline: 'Artisanal woody floral fragrance with 18% oil concentration',
      badge: 'Bestseller',
      shortDescription: 'Distilled in Grasse, France. Opening notes of frosted lilac and Italian bergamot melt into a heart of crushed violet leaves, grounded by smoked cedar and warm amberwood.',
      category: topAccessories._id,
      subcategory: subMap['perfumes']._id,
      gender: 'unisex',
      price: 4999,
      salePrice: 3899,
      finalPrice: 3899,
      images: [
        { url: '/uploads/seed/catalog/bottle-lilac.jpg', alt: 'Botanique Lilac 100ml Glass Flacon' },
        { url: '/uploads/seed/catalog/bottle-trio.jpg', alt: 'Fragrance Discovery Set' },
      ],
      variants: [
        { name: '100ml Flacon', colorHex: '#b298dc', colorFamily: 'blue', sku: 'WT-FRG-LILAC-100', stock: 8, images: [{ url: '/uploads/seed/catalog/bottle-lilac.jpg' }] },
      ],
      materials: ['Fine Perfumery Alcohol', '18% Essential Oil Extract', 'Magnetic Heavy Cap'],
      features: ['12+ Hours Longevity', 'IFRA Certified Safe', 'Cruelty Free & Vegan'],
      purposes: ['creative', 'business'],
      capacity: '',
      stock: 8,
      lowStockThreshold: 10,
      isFeatured: true,
      isBestseller: true,
      ratingAverage: 4.9,
      ratingCount: 88,
      soldCount: 950,
    },
    // ── ALL ACCESSORIES: Leather Dopp Kit / Toiletry Kit
    {
      name: 'Heritage Waterproof Leather Dopp Kit',
      slug: 'heritage-waterproof-leather-dopp-kit',
      sku: 'WT-DOPP-HERIT',
      tagline: 'Spill-resistant wipe-clean washbag with wide doctor-bag opening',
      badge: 'Essential',
      shortDescription: 'Features a structured framed zipper that stays open on bathroom countertops, antimicrobial water-resistant inner lining, and toothbrush loop organizers.',
      category: topAccessories._id,
      subcategory: subMap['toiletry-kits']._id,
      gender: 'unisex',
      price: 3799,
      salePrice: 2999,
      finalPrice: 2999,
      images: [
        { url: '/uploads/seed/catalog/dopp-heritage-brown.jpg', alt: 'Heritage Leather Dopp Kit Front' },
        { url: '/uploads/seed/catalog/dopp-heritage-black.jpg', alt: 'Black Leather Finish' },
      ],
      variants: [
        { name: 'Heritage Brown', colorHex: '#522f1d', colorFamily: 'brown', sku: 'WT-DOPP-HERIT-01', stock: 5, images: [{ url: '/uploads/seed/catalog/dopp-heritage-brown.jpg' }] },
        { name: 'Onyx Black', colorHex: '#181818', colorFamily: 'onyx', sku: 'WT-DOPP-HERIT-02', stock: 14, images: [{ url: '/uploads/seed/catalog/dopp-heritage-black.jpg' }] },
      ],
      materials: ['Waxed Leather Exterior', 'Water-Repellent Poly Lining', 'Antiqued Brass Zippers'],
      features: ['Stay-Open Wire Frame', 'Waterproof Base Liner', 'Side Grab Handle'],
      purposes: ['travel'],
      capacity: '5L',
      stock: 19,
      lowStockThreshold: 10,
      isFeatured: false,
      isBestseller: true,
      ratingAverage: 4.8,
      ratingCount: 41,
      soldCount: 460,
    },
    // ── ALL ACCESSORIES: Laptop Sleeves
    {
      name: 'Saddle Tan Full-Grain Leather Laptop Sleeve (14"/16")',
      slug: 'saddle-tan-full-grain-leather-laptop-sleeve',
      sku: 'WT-SLV-SADDLE',
      tagline: 'Plush velvet microfiber interior with magnetic snap flap',
      badge: 'Staff Pick',
      shortDescription: 'Precision contoured for MacBook Pro and slim ultra-portables. Constructed with seamless single-piece cowhide and shock-absorbing neoprene core.',
      category: topAccessories._id,
      subcategory: subMap['laptop-sleeves']._id,
      gender: 'unisex',
      price: 3499,
      salePrice: 2699,
      finalPrice: 2699,
      images: [
        { url: '/uploads/seed/catalog/sleeve-saddle-tan.jpg', alt: 'Saddle Tan Laptop Sleeve' },
        { url: '/uploads/seed/catalog/sleeve-saddle-espresso.jpg', alt: 'Espresso Color Option' },
      ],
      variants: [
        { name: 'Saddle Tan 14"', colorHex: '#af723e', colorFamily: 'tan', size: '14"', sku: 'WT-SLV-SADDLE-14', stock: 7, images: [{ url: '/uploads/seed/catalog/sleeve-saddle-tan.jpg' }] },
        { name: 'Saddle Tan 16"', colorHex: '#af723e', colorFamily: 'tan', size: '16"', sku: 'WT-SLV-SADDLE-16', stock: 9, images: [{ url: '/uploads/seed/catalog/sleeve-saddle-tan.jpg' }] },
        { name: 'Espresso 14"', colorHex: '#3a2318', colorFamily: 'brown', size: '14"', sku: 'WT-SLV-SADDLE-E14', stock: 4, images: [{ url: '/uploads/seed/catalog/sleeve-saddle-espresso.jpg' }] },
      ],
      materials: ['Full-Grain Cowhide Leather', 'High-Density Neoprene Shield', 'Velvet Microfiber Lining'],
      features: ['Concealed Magnetic Flap', 'Anti-Scratch Interior', 'Slim 1.5cm Profile'],
      purposes: ['work', 'transit'],
      capacity: '',
      stock: 20,
      lowStockThreshold: 10,
      isFeatured: true,
      isBestseller: true,
      ratingAverage: 4.9,
      ratingCount: 71,
      soldCount: 810,
    },
    // ── ALL ACCESSORIES: Passport Holder
    {
      name: 'Atlas RFID Multi-Currency Passport Wallet',
      slug: 'atlas-rfid-multi-currency-passport-wallet',
      sku: 'WT-ACC-PASS',
      tagline: 'Boarding pass slot, SIM card pin slot & dual passport sleeves',
      badge: 'Travel Must-Have',
      shortDescription: 'Keep international journey credentials in one secure location. Fits two passports, folded boarding passes, international notes and credit cards.',
      category: topAccessories._id,
      subcategory: subMap['passport-holders']._id,
      gender: 'unisex',
      price: 2199,
      salePrice: 1699,
      finalPrice: 1699,
      images: [
        { url: '/uploads/seed/catalog/passport-atlas.jpg', alt: 'Atlas Passport Wallet in Navy' },
        { url: '/uploads/seed/catalog/passport-heritage.jpg', alt: 'Heritage Leather Option' },
      ],
      variants: [
        { name: 'Aviation Navy', colorHex: '#142038', colorFamily: 'navy', sku: 'WT-ACC-PASS-01', stock: 6, images: [{ url: '/uploads/seed/catalog/passport-atlas.jpg' }] },
        { name: 'Heritage Tan', colorHex: '#ab7040', colorFamily: 'tan', sku: 'WT-ACC-PASS-02', stock: 12, images: [{ url: '/uploads/seed/catalog/passport-heritage.jpg' }] },
      ],
      materials: ['Saffiano Leather', 'Certified RFID Shield', 'Gold Stamped Foil Logo'],
      features: ['Dual Passport Pockets', 'SIM Ejector Pin Sleeve', 'Pen Loop Holder'],
      purposes: ['travel'],
      capacity: '',
      stock: 18,
      lowStockThreshold: 10,
      isFeatured: false,
      isBestseller: true,
      ratingAverage: 4.8,
      ratingCount: 52,
      soldCount: 640,
    },
  ];

  for (const item of newProducts) {
    const res = await Product.findOneAndUpdate(
      { slug: item.slug },
      { $set: item },
      { upsert: true, new: true }
    );
    console.log(`Upserted: ${res.name} (Stock: ${res.stock}, Subcategory: ${item.subcategory})`);
  }

  console.log(`Successfully seeded ${newProducts.length} new items across Men, Women, and Accessories!`);
  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
