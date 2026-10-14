import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

dotenv.config();

/**
 * Builds the complete multi-level Men's & Women's category tree in MongoDB
 * as specified in Section 1 of the specification, while preserving existing categories
 * and mapping all existing products seamlessly.
 */
export async function seedTaxonomy() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }

  console.log('[Taxonomy] Connected to MongoDB. Seeding multi-level taxonomy...');

  // Helper to upsert a category
  async function upsertCategory({ name, slug, department, level, parent = null, icon = '', tagline = '', description = '', sortOrder = 0 }) {
    let cat = await Category.findOne({ slug });
    if (!cat) {
      cat = await Category.create({
        name,
        slug,
        department,
        level,
        parent: parent ? parent._id : null,
        icon,
        tagline: tagline || `${name} by WILDTANE`,
        description: description || `Handcrafted architectural ${name.toLowerCase()} built for lifetime durability.`,
        sortOrder,
        isActive: true,
        showInMenu: true,
      });
      console.log(`  + Created [L${level} ${department}] ${name} (${slug})`);
    } else {
      cat.name = name;
      cat.department = department;
      cat.level = level;
      if (parent) cat.parent = parent._id;
      if (icon) cat.icon = icon;
      cat.sortOrder = sortOrder;
      cat.isActive = true;
      cat.showInMenu = true;
      await cat.save();
    }
    return cat;
  }

  // ══════════════════════════════════════════════════════════════
  // A. MEN'S TAXONOMY
  // ══════════════════════════════════════════════════════════════

  // 1. Men's Bags
  const menBags = await upsertCategory({
    name: 'Bags',
    slug: 'men-bags',
    department: 'men',
    level: 1,
    icon: 'business_center',
    sortOrder: 1,
  });

  // 1.1 Laptop Bags
  const menLaptopBags = await upsertCategory({
    name: 'Laptop Bags',
    slug: 'men-laptop-bags',
    department: 'men',
    level: 2,
    parent: menBags,
    icon: 'laptop_mac',
    sortOrder: 1,
  });
  const menLaptopSub = [
    ['Slim Laptop Bags', 'men-slim-laptop-bags'],
    ['Executive Laptop Bags', 'men-executive-laptop-bags'],
    ['Business Laptop Bags', 'men-business-laptop-bags'],
    ['Laptop Backpacks', 'men-laptop-backpacks'],
    ['Waterproof Laptop Bags', 'men-waterproof-laptop-bags'],
    ['Laptop Sleeves', 'men-laptop-sleeves'],
  ];
  for (let i = 0; i < menLaptopSub.length; i++) {
    const [name, slug] = menLaptopSub[i];
    await upsertCategory({ name, slug, department: 'men', level: 3, parent: menLaptopBags, sortOrder: i + 1 });
  }

  // 1.2 Backpacks
  const menBackpacks = await upsertCategory({
    name: 'Backpacks',
    slug: 'men-backpacks',
    department: 'men',
    level: 2,
    parent: menBags,
    icon: 'backpack',
    sortOrder: 2,
  });
  const menBackpackSub = [
    ['Casual Backpacks', 'men-casual-backpacks'],
    ['Travel Backpacks', 'men-travel-backpacks'],
    ['Office Backpacks', 'men-office-backpacks'],
    ['College Backpacks', 'men-college-backpacks'],
    ['Anti-Theft Backpacks', 'men-anti-theft-backpacks'],
    ['Hiking Backpacks', 'men-hiking-backpacks'],
  ];
  for (let i = 0; i < menBackpackSub.length; i++) {
    const [name, slug] = menBackpackSub[i];
    await upsertCategory({ name, slug, department: 'men', level: 3, parent: menBackpacks, sortOrder: i + 1 });
  }

  // 1.3 Travel Bags
  const menTravelBags = await upsertCategory({
    name: 'Travel Bags',
    slug: 'men-travel-bags',
    department: 'men',
    level: 2,
    parent: menBags,
    icon: 'flight_takeoff',
    sortOrder: 3,
  });
  const menTravelSub = [
    ['Duffle Bags', 'men-duffle-bags'],
    ['Weekender Bags', 'men-weekender-bags'],
    ['Cabin Bags', 'men-cabin-bags'],
    ['Trolley Bags', 'men-trolley-bags'],
    ['Garment Bags', 'men-garment-bags'],
    ['Travel Organizers', 'men-travel-organizers'],
  ];
  for (let i = 0; i < menTravelSub.length; i++) {
    const [name, slug] = menTravelSub[i];
    await upsertCategory({ name, slug, department: 'men', level: 3, parent: menTravelBags, sortOrder: i + 1 });
  }

  // 1.4 Office Bags
  const menOfficeBags = await upsertCategory({
    name: 'Office Bags',
    slug: 'men-office-bags',
    department: 'men',
    level: 2,
    parent: menBags,
    icon: 'work',
    sortOrder: 4,
  });
  const menOfficeSub = [
    ['Messenger Bags', 'men-messenger-bags'],
    ['Briefcases', 'men-briefcases'],
    ['Document Bags', 'men-document-bags'],
    ['Portfolio Bags', 'men-portfolio-bags'],
    ['Crossbody Office Bags', 'men-crossbody-office-bags'],
  ];
  for (let i = 0; i < menOfficeSub.length; i++) {
    const [name, slug] = menOfficeSub[i];
    await upsertCategory({ name, slug, department: 'men', level: 3, parent: menOfficeBags, sortOrder: i + 1 });
  }

  // 1.5 Other Men's Bags
  const menOtherBags = [
    ['Sling Bags', 'men-sling-bags'],
    ['Gym Bags', 'men-gym-bags'],
    ['Waist Bags', 'men-waist-bags'],
    ['Tote Bags', 'men-tote-bags'],
    ['Crossbody Bags', 'men-crossbody-bags'],
  ];
  for (let i = 0; i < menOtherBags.length; i++) {
    const [name, slug] = menOtherBags[i];
    await upsertCategory({ name, slug, department: 'men', level: 2, parent: menBags, sortOrder: i + 5 });
  }

  // 2. Men's Wallets
  const menWallets = await upsertCategory({
    name: 'Wallets',
    slug: 'men-wallets',
    department: 'men',
    level: 1,
    icon: 'account_balance_wallet',
    sortOrder: 2,
  });
  const menWalletSub = [
    ['Bifold Wallets', 'men-bifold-wallets'],
    ['Trifold Wallets', 'men-trifold-wallets'],
    ['Slim Wallets', 'men-slim-wallets'],
    ['Minimalist Wallets', 'men-minimalist-wallets'],
    ['Card Holders', 'men-card-holders'],
    ['Coin Purses', 'men-coin-purses'],
    ['Zipper Wallets', 'men-zipper-wallets'],
    ['Travel Wallets', 'men-travel-wallets'],
    ['Passport Wallets', 'men-passport-wallets'],
    ['RFID-Blocking Wallets', 'men-rfid-blocking-wallets'],
  ];
  for (let i = 0; i < menWalletSub.length; i++) {
    const [name, slug] = menWalletSub[i];
    await upsertCategory({ name, slug, department: 'men', level: 2, parent: menWallets, sortOrder: i + 1 });
  }

  // 3. Men's Belts
  const menBelts = await upsertCategory({
    name: 'Belts',
    slug: 'men-belts',
    department: 'men',
    level: 1,
    icon: 'tune',
    sortOrder: 3,
  });
  const menBeltsSub = [
    ['Formal Belts', 'men-formal-belts'],
    ['Casual Belts', 'men-casual-belts'],
    ['Reversible Belts', 'men-reversible-belts'],
    ['Leather Belts', 'men-leather-belts'],
    ['Webbing Belts', 'men-webbing-belts'],
  ];
  for (let i = 0; i < menBeltsSub.length; i++) {
    const [name, slug] = menBeltsSub[i];
    await upsertCategory({ name, slug, department: 'men', level: 2, parent: menBelts, sortOrder: i + 1 });
  }

  // 4. Men's Accessories
  const menAccessories = await upsertCategory({
    name: 'Accessories',
    slug: 'men-accessories',
    department: 'men',
    level: 1,
    icon: 'watch',
    sortOrder: 4,
  });
  const menAccSub = [
    ['Keychains', 'men-keychains'],
    ['Passport Holders', 'men-passport-holders'],
    ['Luggage Tags', 'men-luggage-tags'],
    ['Toiletry Bags', 'men-toiletry-bags'],
    ['Tech Organizers', 'men-tech-organizers'],
    ['Sunglass Cases', 'men-sunglass-cases'],
    ['Pouches', 'men-pouches'],
    ['Gift Sets', 'men-gift-sets'],
  ];
  for (let i = 0; i < menAccSub.length; i++) {
    const [name, slug] = menAccSub[i];
    await upsertCategory({ name, slug, department: 'men', level: 2, parent: menAccessories, sortOrder: i + 1 });
  }

  // ══════════════════════════════════════════════════════════════
  // B. WOMEN'S TAXONOMY
  // ══════════════════════════════════════════════════════════════

  // 1. Handbags and Purses
  const womenHandbags = await upsertCategory({
    name: 'Handbags and Purses',
    slug: 'women-handbags-purses',
    department: 'women',
    level: 1,
    icon: 'shopping_bag',
    sortOrder: 1,
  });
  const womenHandbagsSub = [
    ['Tote Bags', 'women-tote-bags'],
    ['Shoulder Bags', 'women-shoulder-bags'],
    ['Sling Bags', 'women-sling-bags'],
    ['Crossbody Bags', 'women-crossbody-bags'],
    ['Clutches', 'women-clutches'],
    ['Evening Purses', 'women-evening-purses'],
    ['Mini Bags', 'women-mini-bags'],
    ['Hobo Bags', 'women-hobo-bags'],
    ['Satchel Bags', 'women-satchel-bags'],
    ['Bucket Bags', 'women-bucket-bags'],
    ['Top-Handle Bags', 'women-top-handle-bags'],
    ['Quilted Bags', 'women-quilted-bags'],
    ['Chain Bags', 'women-chain-bags'],
    ['Wristlet Purses', 'women-wristlet-purses'],
    ['Wallets and Purses', 'women-wallets-purses'],
    ['Party Bags', 'women-party-bags'],
  ];
  for (let i = 0; i < womenHandbagsSub.length; i++) {
    const [name, slug] = womenHandbagsSub[i];
    await upsertCategory({ name, slug, department: 'women', level: 2, parent: womenHandbags, sortOrder: i + 1 });
  }

  // 2. Women's Backpacks
  const womenBackpacks = await upsertCategory({
    name: 'Backpacks',
    slug: 'women-backpacks',
    department: 'women',
    level: 1,
    icon: 'backpack',
    sortOrder: 2,
  });
  const womenBackpackSub = [
    ['Mini Backpacks', 'women-mini-backpacks'],
    ['Casual Backpacks', 'women-casual-backpacks'],
    ['College Backpacks', 'women-college-backpacks'],
    ['Travel Backpacks', 'women-travel-backpacks'],
    ['Office Backpacks', 'women-office-backpacks'],
  ];
  for (let i = 0; i < womenBackpackSub.length; i++) {
    const [name, slug] = womenBackpackSub[i];
    await upsertCategory({ name, slug, department: 'women', level: 2, parent: womenBackpacks, sortOrder: i + 1 });
  }

  // 3. Women's Travel Bags
  const womenTravelBags = await upsertCategory({
    name: 'Travel Bags',
    slug: 'women-travel-bags',
    department: 'women',
    level: 1,
    icon: 'flight_takeoff',
    sortOrder: 3,
  });
  const womenTravelSub = [
    ['Duffle Bags', 'women-duffle-bags'],
    ['Weekender Bags', 'women-weekender-bags'],
    ['Cabin Bags', 'women-cabin-bags'],
    ['Trolley Bags', 'women-trolley-bags'],
    ['Makeup Travel Bags', 'women-makeup-travel-bags'],
    ['Jewelry Organizers', 'women-jewelry-organizers'],
  ];
  for (let i = 0; i < womenTravelSub.length; i++) {
    const [name, slug] = womenTravelSub[i];
    await upsertCategory({ name, slug, department: 'women', level: 2, parent: womenTravelBags, sortOrder: i + 1 });
  }

  // 4. Women's Wallets
  const womenWallets = await upsertCategory({
    name: 'Wallets',
    slug: 'women-wallets',
    department: 'women',
    level: 1,
    icon: 'account_balance_wallet',
    sortOrder: 4,
  });
  const womenWalletSub = [
    ['Long Wallets', 'women-long-wallets'],
    ['Compact Wallets', 'women-compact-wallets'],
    ['Card Holders', 'women-card-holders'],
    ['Coin Purses', 'women-coin-purses'],
    ['Zipper Wallets', 'women-zipper-wallets'],
    ['Travel Wallets', 'women-travel-wallets'],
  ];
  for (let i = 0; i < womenWalletSub.length; i++) {
    const [name, slug] = womenWalletSub[i];
    await upsertCategory({ name, slug, department: 'women', level: 2, parent: womenWallets, sortOrder: i + 1 });
  }

  // 5. Women's Laptop and Office Bags
  const womenOfficeBags = await upsertCategory({
    name: 'Laptop and Office Bags',
    slug: 'women-laptop-office-bags',
    department: 'women',
    level: 1,
    icon: 'laptop_mac',
    sortOrder: 5,
  });
  const womenOfficeSub = [
    ["Women's Laptop Bags", 'women-laptop-bags'],
    ['Office Tote Bags', 'women-office-totes'],
    ['Executive Bags', 'women-executive-bags'],
    ['Laptop Sleeves', 'women-laptop-sleeves'],
    ['Work Backpacks', 'women-work-backpacks'],
  ];
  for (let i = 0; i < womenOfficeSub.length; i++) {
    const [name, slug] = womenOfficeSub[i];
    await upsertCategory({ name, slug, department: 'women', level: 2, parent: womenOfficeBags, sortOrder: i + 1 });
  }

  // 6. Women's Accessories
  const womenAccessories = await upsertCategory({
    name: 'Accessories',
    slug: 'women-accessories',
    department: 'women',
    level: 1,
    icon: 'style',
    sortOrder: 6,
  });
  const womenAccSub = [
    ['Makeup Pouches', 'women-makeup-pouches'],
    ['Cosmetic Bags', 'women-cosmetic-bags'],
    ['Jewelry Pouches', 'women-jewelry-pouches'],
    ['Keychains', 'women-keychains'],
    ['Passport Holders', 'women-passport-holders'],
    ['Gift Sets', 'women-gift-sets'],
  ];
  for (let i = 0; i < womenAccSub.length; i++) {
    const [name, slug] = womenAccSub[i];
    await upsertCategory({ name, slug, department: 'women', level: 2, parent: womenAccessories, sortOrder: i + 1 });
  }

  // ══════════════════════════════════════════════════════════════
  // C. SMART MAPPING OF EXISTING PRODUCTS TO THE NEW TAXONOMY
  // ══════════════════════════════════════════════════════════════
  console.log('[Taxonomy] Mapping existing products into new multi-level categories...');

  const allCategories = await Category.find({}).lean();
  const catBySlug = new Map(allCategories.map((c) => [c.slug, c]));
  const products = await Product.find({}).populate('category subcategory');

  let updatedCount = 0;

  for (const p of products) {
    const nameLower = (p.name || '').toLowerCase();
    const tagLower = (p.tags || []).map((t) => t.toLowerCase()).join(' ');
    const descLower = (p.description || '').toLowerCase();
    const haystack = `${nameLower} ${tagLower} ${descLower}`;

    const assignedCats = new Set();
    // Keep existing category and subcategory
    if (p.category) assignedCats.add(String(p.category._id || p.category));
    if (p.subcategory) assignedCats.add(String(p.subcategory._id || p.subcategory));

    const isMen = p.gender === 'men' || haystack.includes('men') || haystack.includes('gentleman');
    const isWomen = p.gender === 'women' || haystack.includes('women') || haystack.includes('handbag') || haystack.includes('tote');

    // Men's mappings
    if (isMen || p.gender === 'unisex') {
      if (haystack.includes('laptop') || haystack.includes('briefcase')) {
        const cat = catBySlug.get('men-laptop-bags');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('men-executive-laptop-bags');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('backpack')) {
        const cat = catBySlug.get('men-backpacks');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get(haystack.includes('travel') ? 'men-travel-backpacks' : 'men-office-backpacks');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('duffle') || haystack.includes('cabin') || haystack.includes('luggage') || haystack.includes('travel')) {
        const cat = catBySlug.get('men-travel-bags');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get(haystack.includes('duffle') ? 'men-duffle-bags' : 'men-cabin-bags');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('wallet') || haystack.includes('cardholder')) {
        const cat = catBySlug.get('men-wallets');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('men-bifold-wallets') || catBySlug.get('men-slim-wallets');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('belt')) {
        const cat = catBySlug.get('men-belts');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('men-leather-belts');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('keychain') || haystack.includes('passport') || haystack.includes('toiletry') || haystack.includes('organizer')) {
        const cat = catBySlug.get('men-accessories');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('men-tech-organizers') || catBySlug.get('men-toiletry-bags');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('sling')) {
        const cat = catBySlug.get('men-sling-bags');
        if (cat) assignedCats.add(String(cat._id));
      }
    }

    // Women's mappings
    if (isWomen || p.gender === 'unisex') {
      if (haystack.includes('handbag') || haystack.includes('tote') || haystack.includes('clutch') || haystack.includes('satchel')) {
        const cat = catBySlug.get('women-handbags-purses');
        if (cat) assignedCats.add(String(cat._id));
        let sub = catBySlug.get('women-tote-bags');
        if (haystack.includes('clutch')) sub = catBySlug.get('women-clutches');
        else if (haystack.includes('sling')) sub = catBySlug.get('women-sling-bags');
        else if (haystack.includes('shoulder')) sub = catBySlug.get('women-shoulder-bags');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('backpack')) {
        const cat = catBySlug.get('women-backpacks');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('women-casual-backpacks');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('duffle') || haystack.includes('travel') || haystack.includes('cabin')) {
        const cat = catBySlug.get('women-travel-bags');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('women-weekender-bags');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('wallet') || haystack.includes('purse')) {
        const cat = catBySlug.get('women-wallets');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('women-long-wallets') || catBySlug.get('women-compact-wallets');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('laptop') && (isWomen || p.gender === 'unisex')) {
        const cat = catBySlug.get('women-laptop-office-bags');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('women-office-totes');
        if (sub) assignedCats.add(String(sub._id));
      }
      if (haystack.includes('cosmetic') || haystack.includes('pouch') || haystack.includes('jewelry')) {
        const cat = catBySlug.get('women-accessories');
        if (cat) assignedCats.add(String(cat._id));
        const sub = catBySlug.get('women-cosmetic-bags');
        if (sub) assignedCats.add(String(sub._id));
      }
    }

    p.categories = Array.from(assignedCats).map((id) => new mongoose.Types.ObjectId(id));
    await p.save();
    updatedCount++;
  }

  console.log(`[Taxonomy] Complete! ${updatedCount} products updated with multi-level category associations.`);
}

// Direct execution when run via CLI
if (process.argv[1]?.endsWith('seed_taxonomy.js')) {
  seedTaxonomy()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Taxonomy Error]', err);
      process.exit(1);
    });
}
