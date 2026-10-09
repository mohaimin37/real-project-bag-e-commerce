import { connectDB, disconnectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

async function main() {
  await connectDB();
  console.log('Enriching catalog categories, products, and gallery images...');

  // 1. Fix missing category images
  const catImageUpdates = [
    { slug: 'bags', img: '/uploads/seed/briefcase-black.jpg', alt: 'WILDTANE Bags' },
    { slug: 'travel-utility', img: '/uploads/seed/cabin-hardshell.jpg', alt: 'WILDTANE Travel & Utility' },
    { slug: 'accessories', img: '/uploads/seed/wallet-onyx.jpg', alt: 'WILDTANE Accessories' },
    { slug: 'belts', img: '/uploads/seed/catalog/keyfob-brown.jpg', alt: 'WILDTANE Handcrafted Belts' },
    { slug: 'perfumes', img: '/uploads/seed/catalog/bottle-lilac.jpg', alt: 'WILDTANE Fine Fragrance' },
    { slug: 't-shirts', img: '/uploads/seed/catalog/tote-cotton.jpg', alt: 'WILDTANE Premium Apparel' },
  ];

  for (const item of catImageUpdates) {
    const res = await Category.updateOne(
      { slug: item.slug },
      { $set: { 'image.url': item.img, 'image.alt': item.alt } }
    );
    console.log(`Updated category image for ${item.slug}: matched ${res.matchedCount}`);
  }

  // Find category map
  const cats = await Category.find({}).lean();
  const catMap = {};
  for (const c of cats) {
    catMap[c.slug] = c;
  }

  // 2. Add extra products with multiple images
  const accessoriesParent = catMap['accessories'];
  const bagsParent = catMap['bags'];
  const travelParent = catMap['travel-utility'];

  const extraItems = [
    // Belts (Men & Women)
    {
      name: 'Reversible Tuscan Leather Belt',
      slug: 'reversible-tuscan-leather-belt',
      sku: 'WT-BLT-TUSC',
      tagline: 'Hand-burnished Italian Full-Grain Leather',
      badge: 'Bestseller',
      shortDescription: 'Dual-sided reversible belt in espresso and cognac vegetable-tanned leather. Features an aerospace titanium buckle that flips seamlessly from workday meetings to evening dinners.',
      category: accessoriesParent._id,
      subcategory: catMap['belts']?._id,
      gender: 'men',
      price: 3499,
      salePrice: 2799,
      finalPrice: 2799,
      images: [
        { url: '/uploads/seed/catalog/keyfob-brown.jpg', alt: 'Tuscan Leather Belt in Cognac' },
        { url: '/uploads/seed/catalog/keyfob-black.jpg', alt: 'Tuscan Leather Belt Reverse in Espresso' },
        { url: '/uploads/seed/catalog/keyset-onyx.jpg', alt: 'Buckle Hardware Detail' },
      ],
      variants: [
        { name: 'Cognac / Espresso', colorHex: '#7a4130', colorFamily: 'brown', sku: 'WT-BLT-TUSC-01', stock: 35, images: [{ url: '/uploads/seed/catalog/keyfob-brown.jpg', alt: 'Tuscan Leather Belt' }] },
        { name: 'Onyx / Slate', colorHex: '#151515', colorFamily: 'onyx', sku: 'WT-BLT-TUSC-02', stock: 28, images: [{ url: '/uploads/seed/catalog/keyfob-black.jpg', alt: 'Tuscan Leather Belt Onyx' }] },
      ],
      materials: ['Full-Grain Leather', 'Titanium Hardware'],
      features: ['Reversible Twist Buckle', 'Hand-Stitched Edge'],
      purposes: ['work', 'transit'],
      capacity: '',
      stock: 63,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
      ratingAverage: 4.8,
      ratingCount: 42,
      soldCount: 620,
    },
    {
      name: 'Sculptural Brass Accent Belt',
      slug: 'sculptural-brass-accent-belt',
      sku: 'WT-BLT-BRSS',
      tagline: 'Cinch Waist Leather Belt with Cast Hardware',
      badge: 'New',
      shortDescription: 'Supple pebble-grain leather belt with an organic sculpted gold-toned brass buckle. Designed to wear at the natural waist over work blazers and flowy linen dresses.',
      category: accessoriesParent._id,
      subcategory: catMap['belts']?._id,
      gender: 'women',
      price: 2899,
      salePrice: 2299,
      finalPrice: 2299,
      images: [
        { url: '/uploads/seed/catalog/beltbag-grey.jpg', alt: 'Sculptural Brass Accent Belt in Stone Grey' },
        { url: '/uploads/seed/catalog/beltbag-cream.jpg', alt: 'Sculptural Brass Accent Belt in Warm Ivory' },
      ],
      variants: [
        { name: 'Warm Ivory', colorHex: '#ece3d3', colorFamily: 'cream', sku: 'WT-BLT-BRSS-01', stock: 25, images: [{ url: '/uploads/seed/catalog/beltbag-cream.jpg', alt: 'Sculptural Belt Ivory' }] },
        { name: 'Stone Grey', colorHex: '#8c8f93', colorFamily: 'grey', sku: 'WT-BLT-BRSS-02', stock: 30, images: [{ url: '/uploads/seed/catalog/beltbag-grey.jpg', alt: 'Sculptural Belt Grey' }] },
      ],
      materials: ['Full-Grain Calfskin', 'Cast Brass'],
      features: ['Hand-Polished Buckle', 'Contoured Silhouette'],
      purposes: ['work', 'creative'],
      capacity: '',
      stock: 55,
      isFeatured: true,
      isBestseller: false,
      isNewArrival: true,
      ratingAverage: 4.9,
      ratingCount: 19,
      soldCount: 310,
    },
    // Perfumes
    {
      name: 'Cedar & Smoked Amber Extrait de Parfum',
      slug: 'cedar-smoked-amber-parfum',
      sku: 'WT-PRF-CDRAMB',
      tagline: '50ml Travel Extrait with Magnetic Cap',
      badge: 'Signature',
      shortDescription: 'Warm Atlas cedarwood layered with resinous amber, cracked cardamom, and sun-baked leather notes. High 28% perfume oil concentration engineered for 12+ hour longevity during long transit flights.',
      category: accessoriesParent._id,
      subcategory: catMap['perfumes']?._id,
      gender: 'men',
      price: 3999,
      salePrice: 3299,
      finalPrice: 3299,
      images: [
        { url: '/uploads/seed/catalog/bottle-lilac.jpg', alt: 'Cedar & Smoked Amber 50ml' },
        { url: '/uploads/seed/catalog/bottle-trio.jpg', alt: 'WILDTANE Fragrance Travel Trio' },
      ],
      variants: [
        { name: '50ml Travel Bottle', colorHex: '#4a2c1d', colorFamily: 'brown', sku: 'WT-PRF-CDRAMB-01', stock: 40, images: [{ url: '/uploads/seed/catalog/bottle-lilac.jpg', alt: 'Cedar Amber Parfum' }] },
      ],
      materials: ['Artisanal French Oils', 'Heavyweight Glass Flask'],
      features: ['Magnetic Closure', 'TSA Carry-On Compliant'],
      purposes: ['travel', 'work'],
      capacity: '50ml',
      stock: 40,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
      ratingAverage: 4.9,
      ratingCount: 56,
      soldCount: 780,
    },
    {
      name: 'White Vetiver & Bergamot Travel Mist',
      slug: 'white-vetiver-bergamot-mist',
      sku: 'WT-PRF-VETBRG',
      tagline: 'Crisp Citrus & Earthy Vetiver 50ml',
      badge: 'New',
      shortDescription: 'Sparkling Calabrian bergamot infused with Haitian vetiver, crushed fig leaves, and airy musk. A refreshing, uplifting scent designed to revive senses during daily commutes.',
      category: accessoriesParent._id,
      subcategory: catMap['perfumes']?._id,
      gender: 'women',
      price: 3499,
      salePrice: 2899,
      finalPrice: 2899,
      images: [
        { url: '/uploads/seed/catalog/bottle-trio.jpg', alt: 'White Vetiver Travel Mist' },
        { url: '/uploads/seed/catalog/bottle-lilac.jpg', alt: 'White Vetiver Bottle in Lilac Case' },
      ],
      variants: [
        { name: '50ml Travel Spray', colorHex: '#c9b6e4', colorFamily: 'pink', sku: 'WT-PRF-VETBRG-01', stock: 35, images: [{ url: '/uploads/seed/catalog/bottle-trio.jpg', alt: 'White Vetiver' }] },
      ],
      materials: ['Organic Essential Oils', 'UV-Shield Glass'],
      features: ['Leak-Proof Atomizer', 'Clean Formulation'],
      purposes: ['travel', 'work'],
      capacity: '50ml',
      stock: 35,
      isFeatured: true,
      isBestseller: false,
      isNewArrival: true,
      ratingAverage: 4.7,
      ratingCount: 31,
      soldCount: 420,
    },
    // Apparel / T-Shirts
    {
      name: 'Heavyweight Supima Commuter T-Shirt',
      slug: 'heavyweight-supima-commuter-tshirt',
      sku: 'WT-APP-SUPM',
      tagline: '260 GSM Pre-Shrunk Long-Staple Cotton',
      badge: 'Essential',
      shortDescription: 'Dense 260 GSM combed Supima cotton with a clean drop-shoulder cut. Engineered with ribbed neck retention that never sags after washing, making it the quintessential travel tee.',
      category: accessoriesParent._id,
      subcategory: catMap['t-shirts']?._id,
      gender: 'men',
      price: 1999,
      salePrice: 1499,
      finalPrice: 1499,
      images: [
        { url: '/uploads/seed/catalog/tote-cotton.jpg', alt: 'Supima Commuter T-Shirt in Oatmeal' },
        { url: '/uploads/seed/catalog/tote-linen.jpg', alt: 'Fabric Weave & Texture Detail' },
      ],
      variants: [
        { name: 'Oatmeal Heather', colorHex: '#ebe4d6', colorFamily: 'cream', sku: 'WT-APP-SUPM-01', stock: 45, images: [{ url: '/uploads/seed/catalog/tote-cotton.jpg', alt: 'Supima Tee Oatmeal' }] },
        { name: 'Pitch Black', colorHex: '#141414', colorFamily: 'onyx', sku: 'WT-APP-SUPM-02', stock: 50, images: [{ url: '/uploads/seed/catalog/tote-denim.jpg', alt: 'Supima Tee Black' }] },
      ],
      materials: ['100% Supima Cotton (260 GSM)'],
      features: ['Anti-Pilling Finish', 'Bound Ribbed Collar'],
      purposes: ['transit', 'travel'],
      capacity: '',
      stock: 95,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
      ratingAverage: 4.8,
      ratingCount: 68,
      soldCount: 910,
    },
    // Laptop Sleeves
    {
      name: 'Magnetic Folio Laptop Sleeve 15-16"',
      slug: 'magnetic-folio-laptop-sleeve-16',
      sku: 'WT-ACC-FOL16',
      tagline: 'Dual Magnetic Catch with Microfiber Lining',
      badge: 'Bestseller',
      shortDescription: 'Sculpted full-grain leather envelope sleeve with invisible neodymium magnetic closures. Padded with high-density EVA shock foam and lined with anti-scratch velour.',
      category: accessoriesParent._id,
      subcategory: catMap['laptop-sleeves']?._id,
      gender: 'unisex',
      price: 3699,
      salePrice: 2999,
      finalPrice: 2999,
      images: [
        { url: '/uploads/seed/catalog/sleeve-saddle-cognac.jpg', alt: 'Magnetic Folio Laptop Sleeve 16"' },
        { url: '/uploads/seed/catalog/sleeve-saddle-espresso.jpg', alt: 'Laptop Sleeve in Deep Espresso' },
        { url: '/uploads/seed/catalog/sleeve-saddle-tan.jpg', alt: 'Laptop Sleeve in Saddle Tan' },
      ],
      variants: [
        { name: 'Cognac', colorHex: '#9c5528', colorFamily: 'tan', sku: 'WT-ACC-FOL16-01', stock: 25, images: [{ url: '/uploads/seed/catalog/sleeve-saddle-cognac.jpg', alt: 'Folio Sleeve Cognac' }] },
        { name: 'Espresso', colorHex: '#3a2418', colorFamily: 'brown', sku: 'WT-ACC-FOL16-02', stock: 30, images: [{ url: '/uploads/seed/catalog/sleeve-saddle-espresso.jpg', alt: 'Folio Sleeve Espresso' }] },
      ],
      materials: ['Full-Grain Leather', 'EVA Foam Cushioning'],
      features: ['16" MacBook Pro Fit', 'Neodymium Magnetic Seal'],
      purposes: ['work', 'transit'],
      capacity: '',
      stock: 55,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
      ratingAverage: 4.9,
      ratingCount: 38,
      soldCount: 540,
    },
    // Wallets
    {
      name: 'Vanguard Slim MagSafe Wallet',
      slug: 'vanguard-slim-magsafe-wallet',
      sku: 'WT-ACC-MGWLT',
      tagline: 'Snap-On MagSafe Cardholder in Pebble Leather',
      badge: 'New',
      shortDescription: 'Ultra-thin cardholder with built-in shielded N52 magnets for secure magnetic attachment to phone cases. Holds up to 3 cards with RFID blocking technology.',
      category: accessoriesParent._id,
      subcategory: catMap['wallets']?._id,
      gender: 'unisex',
      price: 1499,
      salePrice: 1199,
      finalPrice: 1199,
      images: [
        { url: '/uploads/seed/catalog/cardholder-black.jpg', alt: 'Vanguard MagSafe Wallet in Black' },
        { url: '/uploads/seed/catalog/cardholder-red.jpg', alt: 'Vanguard MagSafe Wallet in Crimson' },
        { url: '/uploads/seed/catalog/cardholder-tan.jpg', alt: 'Vanguard MagSafe Wallet in Saddle Tan' },
      ],
      variants: [
        { name: 'Pitch Black', colorHex: '#141414', colorFamily: 'onyx', sku: 'WT-ACC-MGWLT-01', stock: 45, images: [{ url: '/uploads/seed/catalog/cardholder-black.jpg', alt: 'MagSafe Wallet Black' }] },
        { name: 'Crimson', colorHex: '#c0392b', colorFamily: 'red', sku: 'WT-ACC-MGWLT-02', stock: 25, images: [{ url: '/uploads/seed/catalog/cardholder-red.jpg', alt: 'MagSafe Wallet Crimson' }] },
      ],
      materials: ['Full-Grain Calfskin', 'N52 Neodymium Magnets'],
      features: ['RFID Shielded', 'MagSafe Compatible'],
      purposes: ['transit', 'work'],
      capacity: '',
      stock: 70,
      isFeatured: true,
      isBestseller: false,
      isNewArrival: true,
      ratingAverage: 4.7,
      ratingCount: 29,
      soldCount: 430,
    },
    // Travel Gear
    {
      name: 'Meridian Lightweight Packing System (Set of 6)',
      slug: 'meridian-lightweight-packing-system-set',
      sku: 'WT-TRV-PCK6',
      tagline: 'Waterproof Ripstop Organizers for 35L-70L Luggage',
      badge: 'Set of 6',
      shortDescription: 'Ultralight Cordura compression cubes including dedicated shoe bag, laundry pouch, tech cable organizer, and 3 clothing compression modules. Saves 40% luggage volume.',
      category: travelParent._id,
      subcategory: catMap['travel-organisers']?._id,
      gender: 'unisex',
      price: 2999,
      salePrice: 2399,
      finalPrice: 2399,
      images: [
        { url: '/uploads/seed/packing-cube.jpg', alt: 'Compression Packing System in Graphite' },
        { url: '/uploads/seed/catalog/cubes-navy-2.jpg', alt: 'Packing System in Navy Blue' },
        { url: '/uploads/seed/cable-pouch.jpg', alt: 'Included Cable & Accessory Organiser' },
      ],
      variants: [
        { name: 'Graphite', colorHex: '#374151', colorFamily: 'grey', sku: 'WT-TRV-PCK6-01', stock: 50, images: [{ url: '/uploads/seed/packing-cube.jpg', alt: 'Graphite Cubes' }] },
        { name: 'Navy', colorHex: '#1f2f4f', colorFamily: 'navy', sku: 'WT-TRV-PCK6-02', stock: 40, images: [{ url: '/uploads/seed/catalog/cubes-navy-2.jpg', alt: 'Navy Cubes' }] },
      ],
      materials: ['70D Diamond Ripstop Nylon', 'YKK EYL Zippers'],
      features: ['Water-Repellent', 'Double Compression Zip'],
      purposes: ['travel'],
      capacity: '',
      stock: 90,
      isFeatured: true,
      isBestseller: true,
      isNewArrival: false,
      ratingAverage: 4.9,
      ratingCount: 84,
      soldCount: 1150,
    },
  ];

  for (const item of extraItems) {
    if (!item.subcategory) continue;
    const existing = await Product.findOne({ slug: item.slug });
    if (!existing) {
      await Product.create(item);
      console.log(`Created product: ${item.name}`);
    } else {
      await Product.updateOne({ slug: item.slug }, { $set: item });
      console.log(`Updated product: ${item.name}`);
    }
  }

  // 3. Enrich existing products with multiple gallery images if they only have 1
  const singleImageProducts = await Product.find({ 'images.1': { $exists: false } });
  console.log(`Found ${singleImageProducts.length} products with only 1 image to enrich with gallery photos.`);

  // Complementary photos pool
  const galleryComplementPool = [
    '/uploads/seed/apex-interior.jpg',
    '/uploads/seed/apex-harness.jpg',
    '/uploads/seed/apex-side-pocket.jpg',
    '/uploads/seed/apex-trolley-test.jpg',
    '/uploads/seed/cable-pouch-detail.jpg',
    '/uploads/seed/catalog/keyset-onyx.jpg',
    '/uploads/seed/catalog/wallet-woodland.jpg',
    '/uploads/seed/catalog/tote-linen.jpg',
    '/uploads/seed/catalog/briefcase-black.jpg',
  ];

  let enrichedCount = 0;
  for (const p of singleImageProducts) {
    const existingUrl = p.images[0]?.url;
    const newImages = [...p.images];

    // Check if variant has extra image
    if (p.variants && p.variants.length > 1) {
      for (const v of p.variants) {
        if (v.images?.[0]?.url && !newImages.some(img => img.url === v.images[0].url)) {
          newImages.push({ url: v.images[0].url, alt: `${p.name} - ${v.name}` });
        }
      }
    }

    // Add high-resolution detail shot if still only 1 image
    if (newImages.length === 1) {
      const extraPhoto = galleryComplementPool[enrichedCount % galleryComplementPool.length];
      newImages.push({ url: extraPhoto, alt: `${p.name} Internal Compartments & Stitching Detail` });
    }

    await Product.updateOne({ _id: p._id }, { $set: { images: newImages } });
    enrichedCount++;
  }
  console.log(`Enriched ${enrichedCount} products with multiple gallery images.`);

  // 4. Update category product counts
  const allCats = await Category.find({});
  for (const c of allCats) {
    const count = await Product.countDocuments({
      $or: [{ category: c._id }, { subcategory: c._id }],
      isVisible: true,
    });
    await Category.updateOne({ _id: c._id }, { $set: { productCount: count } });
  }
  console.log('Synchronized product counts across all categories.');

  await disconnectDB();
  console.log('Catalog enrichment complete!');
}

main().catch(console.error);
