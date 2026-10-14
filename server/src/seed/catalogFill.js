/**
 * Range expansion 5 (2026-10-13): brings the visible sections to at least 10 products.
 * The user chose to reuse the store's own photos: every row names the photo it uses (a file in
 * uploads/seed/…), each photo was checked by eye to show that kind of product, and the product is
 * named after what the photo shows. The variant colour is taken from the product that already uses
 * the photo, so the listing and the picture always agree. Ratings and sales start at 0.
 *
 * Belts, Perfumes, T-Shirts and Travel Comfort are NOT filled: the store has no photo that shows
 * those products (their current listings use unrelated photos), so new items would be misleading.
 *
 * Row: [photo, name, section slug, price, salePrice|null, capacity, opts]
 *   opts.also   – extra section slugs (men/women sections) the product is listed in as well
 *   opts.gender – men | women | unisex (default unisex)
 */
export const FILL_ROWS = [
  // ── Bags › Laptop Bags (+2) ──
  ['messenger-expedition', 'Field Canvas Laptop Messenger 15"', 'laptop-bags', 4999, 4299, '14L', { materials: ['Waxed Cotton Canvas', 'Full-Grain Leather'], features: ['Laptop 15" Sleeve'], purposes: ['work', 'college'] }],
  ['laptop-sterling', 'Two-Tone Leather Laptop Bag 15"', 'laptop-bags', 6999, null, '12L', { gender: 'men', materials: ['Full-Grain Leather'], features: ['Laptop 15" Sleeve'], purposes: ['work', 'business'] }],

  // ── Bags › Crossbody Bags (+8) ──
  ['crossbody-camera', 'Boxy Leather Crossbody', 'crossbody-bags', 3499, null, '2L', { gender: 'women', materials: ['Full-Grain Leather'], purposes: ['everyday'] }],
  ['crossbody-cloud', 'Soft Leather Crossbody', 'crossbody-bags', 3299, 2799, '2L', { gender: 'women', materials: ['Soft Nappa Leather'], purposes: ['everyday'] }],
  ['crossbody-nova', 'Barrel Leather Crossbody', 'crossbody-bags', 3799, null, '2L', { gender: 'women', materials: ['Full-Grain Leather'], purposes: ['everyday', 'travel'] }],
  ['metro-camera-crossbody-tan', 'Compact Camera Crossbody', 'crossbody-bags', 2999, null, '2.5L', { materials: ['Full-Grain Leather'], purposes: ['travel', 'creative'] }],
  ['metro-camera-crossbody-navy', 'Everyday Camera Crossbody', 'crossbody-bags', 2999, 2499, '2.5L', { materials: ['Full-Grain Leather'], purposes: ['travel', 'everyday'] }],
  ['crossbody-dune', 'Mini Barrel Crossbody', 'crossbody-bags', 2799, null, '1.5L', { gender: 'women', materials: ['Vegan Leather'], purposes: ['everyday'] }],
  ['dune-barrel-crossbody-chocolate', 'Half-Moon Crossbody', 'crossbody-bags', 2999, null, '1.5L', { gender: 'women', materials: ['Vegan Leather'], purposes: ['everyday'], badge: 'New Season' }],
  ['camera-voyager', 'Voyager Leather Crossbody', 'crossbody-bags', 4499, null, '4L', { materials: ['Full-Grain Leather'], purposes: ['travel', 'creative'] }],

  // ── Bags › Sling Bags (+4, men) ──
  ['sling-black', 'Tech Chest Sling 5L', 'sling-bags', 2499, 1999, '5L', { gender: 'men', also: ['men-sling-bags'], materials: ['Ballistic Nylon'], purposes: ['transit', 'travel'] }],
  ['utility-ledger', 'Leather Utility Sling', 'sling-bags', 3999, null, '4L', { gender: 'men', also: ['men-sling-bags'], materials: ['Full-Grain Leather'], purposes: ['everyday', 'travel'] }],
  ['sling-sand', 'Canvas Utility Sling', 'sling-bags', 1799, null, '5L', { gender: 'men', also: ['men-sling-bags'], materials: ['Cotton Canvas'], purposes: ['travel', 'everyday'] }],
  ['volt-modular-sling-6l-concrete-grey', 'Commuter Sling 7L', 'sling-bags', 2999, null, '7L', { gender: 'men', also: ['men-sling-bags'], materials: ['Recycled Polyester 600D'], purposes: ['transit', 'work'] }],

  // ── Bags › Duffle Bags (+2, men) ──
  ['duffle-tan', 'Classic Leather Duffle 45L', 'duffle-bags', 13999, 11999, '45L', { gender: 'men', also: ['men-duffle-bags'], materials: ['Full-Grain Leather'], features: ['Shoe Compartment'], purposes: ['travel', 'business'], badge: 'Handcrafted' }],
  ['duffel-transit', 'Gym & Weekend Duffle 40L', 'duffle-bags', 3499, null, '40L', { gender: 'men', also: ['men-duffle-bags'], materials: ['Cotton Canvas'], features: ['Shoe Compartment'], purposes: ['gym', 'travel'] }],

  // ── Bags › Clutches (+5, women) ──
  ['chain-chevron', 'Chevron Chain Clutch', 'clutches', 2999, null, '', { gender: 'women', also: ['women-clutches'], materials: ['Vegan Leather'], purposes: ['party'] }],
  ['chain-chevron-mauve', 'Chain Shoulder Clutch', 'clutches', 2999, 2499, '', { gender: 'women', also: ['women-clutches'], materials: ['Vegan Leather'], purposes: ['party', 'everyday'] }],
  ['clutch-espresso', 'Envelope Leather Clutch', 'clutches', 2999, null, '', { gender: 'women', also: ['women-clutches'], materials: ['Full-Grain Leather'], purposes: ['party', 'work'] }],
  ['clutch-espresso-table', 'Slim Zip Clutch', 'clutches', 2499, null, '', { gender: 'women', also: ['women-clutches'], materials: ['Full-Grain Leather'], purposes: ['party', 'work'] }],
  ['soiree-leather-zip-clutch-ivory', 'Structured Zip Clutch', 'clutches', 3299, null, '', { gender: 'women', also: ['women-clutches'], materials: ['Full-Grain Leather'], purposes: ['party'], badge: 'Wedding Edit' }],

  // ── Bags › Beach & Straw Bags (+3) ──
  ['straw-market', 'Seaside Straw Tote', 'beach-straw-bags', 1999, null, '20L', { gender: 'women', materials: ['Natural Straw'], purposes: ['travel'] }],
  ['basket-seaside', 'Round Rattan Basket Bag', 'beach-straw-bags', 2499, null, '6L', { gender: 'women', materials: ['Rattan'], purposes: ['travel', 'everyday'] }],
  ['straw-fiesta', 'Pom-Pom Straw Beach Bag', 'beach-straw-bags', 1799, null, '12L', { gender: 'women', materials: ['Natural Straw'], purposes: ['travel'] }],

  // ── Travel & Utility › Tech Briefcases (+6) ──
  ['oxford-twin-buckle-briefcase-black', 'Executive Leather Briefcase', 'tech-briefcases', 9999, 8499, '12L', { gender: 'men', materials: ['Full-Grain Leather'], features: ['Laptop 15" Sleeve'], purposes: ['work', 'business'] }],
  ['briefcase-oxford', 'Vintage Satchel Briefcase', 'tech-briefcases', 7999, null, '12L', { gender: 'men', materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work'] }],
  ['jute-laptop-brief-14-indigo', 'Slim Document Briefcase', 'tech-briefcases', 3999, 3499, '8L', { materials: ['Jute', 'Leather Trim'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'business'] }],
  ['brief-jute', 'Jute Laptop Brief 14"', 'tech-briefcases', 3499, null, '8L', { materials: ['Jute', 'Leather Trim'], features: ['Laptop 14" Sleeve'], purposes: ['work'], badge: 'Eco' }],
  ['portfolio-atlas', 'Leather Laptop Portfolio', 'tech-briefcases', 4999, null, '', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'business'] }],
  ['messenger-leather', 'Heritage Messenger Briefcase', 'tech-briefcases', 8999, 7499, '14L', { gender: 'men', materials: ['Full-Grain Leather'], features: ['Laptop 15" Sleeve'], purposes: ['work', 'business'], badge: 'Handcrafted' }],

  // ── Travel & Utility › Daypacks (+8) ──
  ['daypack-grey', 'Canvas City Daypack 18L', 'daypacks', 2499, null, '18L', { materials: ['Cotton Canvas'], features: ['Laptop 14" Sleeve'], purposes: ['college', 'everyday'] }],
  ['heather-canvas-daypack-16l-sand', 'Urban Daypack 16L', 'daypacks', 2299, null, '16L', { materials: ['Cotton Canvas'], purposes: ['everyday'] }],
  ['daypack-navy', 'Campus Daypack 22L', 'daypacks', 2299, 1999, '22L', { materials: ['Recycled Polyester 600D'], features: ['Laptop 15" Sleeve'], purposes: ['college'] }],
  ['metro-everyday-daypack-18l-charcoal', 'Minimal Everyday Daypack 18L', 'daypacks', 2699, null, '18L', { materials: ['Recycled Polyester 600D'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'everyday'] }],
  ['backpack-fulton', 'Heritage Leather Daypack', 'daypacks', 8999, 7499, '15L', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'everyday'], badge: 'Handcrafted' }],
  ['rucksack-prairie', 'Prairie Canvas Rucksack 20L', 'daypacks', 3299, null, '20L', { materials: ['Waxed Cotton Canvas'], purposes: ['travel', 'everyday'] }],
  ['pack-alpine', 'Trail Hiking Daypack 25L', 'daypacks', 3999, null, '25L', { materials: ['Ripstop Nylon'], purposes: ['travel'], badge: 'Trail Ready' }],
  ['pack-highland', 'Highland Canvas Daypack 20L', 'daypacks', 3499, null, '20L', { materials: ['Cotton Canvas', 'Leather Trim'], purposes: ['travel', 'everyday'] }],

  // ── Travel & Utility › Waterproof Commuters (+7) ──
  ['drypack-coastline', 'Storm Roll-Top Commuter 25L', 'waterproof-commuters', 4499, 3999, '25L', { materials: ['TPU-Coated Nylon'], features: ['IPX5 Waterproof', 'Laptop 16" Sleeve'], purposes: ['transit', 'work'] }],
  ['rolltop-ridgeline', 'Ridgeline Roll-Top Pack 25L', 'waterproof-commuters', 3999, null, '25L', { materials: ['TPU-Coated Polyester'], features: ['IPX5 Waterproof'], purposes: ['travel', 'transit'] }],
  ['pack-trailhead', 'Weatherproof Trail Pack 28L', 'waterproof-commuters', 4299, null, '28L', { materials: ['Coated Ripstop Nylon'], features: ['IPX5 Waterproof'], purposes: ['travel'] }],
  ['trailhead-weatherproof-pack-28l-forest-green', 'Rainproof Commuter Pack 28L', 'waterproof-commuters', 4299, 3799, '28L', { materials: ['Coated Ripstop Nylon'], features: ['IPX5 Waterproof', 'Laptop 15" Sleeve'], purposes: ['transit', 'work'] }],
  ['trailhead-weatherproof-pack-28l-black', 'Monsoon Commuter Pack 28L', 'waterproof-commuters', 4299, null, '28L', { materials: ['Coated Ripstop Nylon'], features: ['IPX5 Waterproof', 'Laptop 15" Sleeve'], purposes: ['transit'] }],
  ['apex-slate', 'Rainproof Tech Backpack 22L', 'waterproof-commuters', 4999, null, '22L', { materials: ['Coated Ballistic Nylon'], features: ['IPX5 Waterproof', 'Laptop 15" Sleeve'], purposes: ['work', 'transit'] }],
  ['pack-summit', 'Summit Weatherproof Pack 30L', 'waterproof-commuters', 4799, null, '30L', { materials: ['Coated Ripstop Nylon'], features: ['IPX5 Waterproof'], purposes: ['travel'] }],

  // ── Travel & Utility › Travel Organisers (+5) ──
  ['cubes-navy-2', 'Compression Packing Cubes (3)', 'travel-organisers', 1799, 1499, '', { materials: ['Ripstop Nylon'], purposes: ['travel'], badge: 'Set of 3' }],
  ['cable-pouch', 'Cable & Charger Organiser', 'travel-organisers', 999, null, '', { materials: ['Recycled Polyester'], purposes: ['travel', 'work'] }],
  ['cable-pouch-detail', 'Electronics Organiser Board', 'travel-organisers', 1299, null, '', { materials: ['Recycled Polyester', 'Elastic Loops'], purposes: ['travel', 'work'] }],
  ['packing-cube', 'Packing Cube Medium', 'travel-organisers', 699, null, '', { materials: ['Ripstop Nylon'], purposes: ['travel'], badge: 'Under ₹1,000' }],
  ['pouch-toiletry', 'Toiletry Travel Organiser', 'travel-organisers', 1199, null, '', { materials: ['Recycled Polyester'], purposes: ['travel'] }],

  // ── Accessories › Luggage Tags (+9; the store has two tag photos) ──
  ['tag-navy', 'Classic Leather Luggage Tag', 'luggage-tags', 599, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['tag-sky', 'Bright Leather Luggage Tag', 'luggage-tags', 599, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['tag-navy', 'Privacy-Flap Luggage Tag', 'luggage-tags', 649, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['tag-sky', 'Buckle Strap Luggage Tag', 'luggage-tags', 649, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['tag-navy', 'Luggage Tag Pair', 'luggage-tags', 999, 849, '', { materials: ['Full-Grain Leather'], purposes: ['travel'], badge: 'Set of 2' }],
  ['tag-sky', 'Family Luggage Tag Set (4)', 'luggage-tags', 1799, 1499, '', { materials: ['Full-Grain Leather'], purposes: ['travel'], badge: 'Set of 4' }],
  ['tag-navy', 'Monogram-Ready Luggage Tag', 'luggage-tags', 699, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel'], badge: 'Gift Idea' }],
  ['tag-sky', 'Slim Leather Bag Tag', 'luggage-tags', 549, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['tag-navy', 'Business Card Luggage Tag', 'luggage-tags', 599, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel', 'business'] }],

  // ── Accessories › Laptop Sleeves (+7) ──
  ['sleeve-felt', 'Wool Felt Laptop Sleeve 13"', 'laptop-sleeves', 1499, null, '', { materials: ['Wool Felt'], features: ['Laptop 13" Sleeve'], purposes: ['work', 'college'] }],
  ['folio-espresso', 'Leather Laptop Folio 14"', 'laptop-sleeves', 3299, 2799, '', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'business'] }],
  ['vanguard-executive-laptop-folio-14-onyx-black', 'Slim Laptop Folio 14"', 'laptop-sleeves', 2999, null, '', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work'] }],
  ['sleeve-saddle-tan', 'Leather Laptop Sleeve 13"', 'laptop-sleeves', 2999, null, '', { materials: ['Full-Grain Leather'], features: ['Laptop 13" Sleeve'], purposes: ['work', 'transit'] }],
  ['sleeve-saddle-espresso', 'Zip Leather Laptop Case 14"', 'laptop-sleeves', 3499, null, '', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work'] }],
  ['sleeve-saddle-cognac', 'Padded Leather Laptop Sleeve 15"', 'laptop-sleeves', 3699, 3199, '', { materials: ['Full-Grain Leather'], features: ['Laptop 15" Sleeve'], purposes: ['work', 'business'] }],
  ['sleeve-saddle-tan-2', 'Leather Tablet Sleeve 11"', 'laptop-sleeves', 1999, null, '', { materials: ['Full-Grain Leather'], purposes: ['work', 'travel'] }],

  // ── Accessories › Belt Bags (+7) ──
  ['beltbag-grey', 'Everyday Nylon Belt Bag', 'belt-bags', 1299, null, '1.5L', { materials: ['Recycled Nylon'], purposes: ['travel', 'transit'] }],
  ['beltbag-cream', 'Leather Hip Pack', 'belt-bags', 2799, 2399, '1L', { materials: ['Full-Grain Leather'], purposes: ['travel', 'everyday'] }],
  ['beltbag-red', 'Mini Leather Belt Bag', 'belt-bags', 1999, null, '0.8L', { gender: 'women', materials: ['Full-Grain Leather'], purposes: ['everyday'] }],
  ['beltbag-holo', 'Iridescent Belt Bag', 'belt-bags', 1199, null, '1L', { gender: 'women', materials: ['Metallic PU'], purposes: ['party', 'travel'] }],
  ['beltbag-magenta', 'Metallic Waist Bag', 'belt-bags', 1199, 999, '1L', { gender: 'women', materials: ['Metallic PU'], purposes: ['party'] }],
  ['beltbag-blue', 'Gloss Chest & Waist Pack', 'belt-bags', 1299, null, '1L', { materials: ['Metallic PU'], purposes: ['travel', 'party'] }],
  ['beltbag-grey', 'Sport Waist Pack', 'belt-bags', 999, null, '1L', { materials: ['Ripstop Nylon'], purposes: ['gym', 'travel'], badge: 'Under ₹1,000' }],

  // ── Accessories › Toiletry Kits (+6) ──
  ['pouch-toiletry', 'Canvas Dopp Kit', 'toiletry-kits', 1499, null, '4L', { gender: 'men', materials: ['Waxed Canvas', 'Leather Trim'], purposes: ['travel'] }],
  ['washbag-aqua', 'Hanging Toiletry Organiser', 'toiletry-kits', 1799, 1499, '5L', { materials: ['Recycled Polyester'], purposes: ['travel'] }],
  ['dopp-heritage-black', 'Leather Wash Bag', 'toiletry-kits', 2499, null, '4L', { gender: 'men', materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['dopp-heritage-brown', 'Large Leather Dopp Kit', 'toiletry-kits', 2999, null, '5L', { gender: 'men', materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['washbag-aqua', 'Shimmer Wash Bag', 'toiletry-kits', 1299, null, '4L', { gender: 'women', materials: ['Recycled Polyester'], purposes: ['travel'] }],
  ['pouch-toiletry', 'Boxy Toiletry Case', 'toiletry-kits', 1299, null, '5L', { materials: ['Waxed Canvas'], purposes: ['travel'] }],

  // ── Accessories › Passport Holders (+6) ──
  ['passport-heritage', 'Slim Leather Passport Cover', 'passport-holders', 1199, null, '', { materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['travel'] }],
  ['passport-heritage', 'Leather Passport Wallet', 'passport-holders', 1699, 1499, '', { materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['travel', 'business'] }],
  ['passport-atlas', 'Mountain Print Passport Cover', 'passport-holders', 899, null, '', { materials: ['Printed Vegan Leather'], purposes: ['travel'] }],
  ['passport-wanderlust-blush', 'Bon Voyage Passport Cover', 'passport-holders', 899, null, '', { materials: ['Printed Vegan Leather'], purposes: ['travel'], badge: 'Gift Idea' }],
  ['passport-wanderlust-sky', 'Adventure Print Passport Cover', 'passport-holders', 899, null, '', { materials: ['Printed Vegan Leather'], purposes: ['travel'] }],
  ['passport-atlas', 'Explorer Print Passport Cover', 'passport-holders', 949, null, '', { materials: ['Printed Vegan Leather'], purposes: ['travel'] }],

  // ── Accessories › Keychains (+6) ──
  ['keyfob-black', 'Slim Leather Key Ring', 'keychains', 449, null, '', { materials: ['Full-Grain Leather'], purposes: ['everyday'], badge: 'Under ₹500' }],
  ['keyfob-brown', 'Wristlet Key Strap', 'keychains', 599, null, '', { materials: ['Full-Grain Leather'], purposes: ['everyday'] }],
  ['keyset-onyx', 'Key & Coin Pouch Set', 'keychains', 1499, 1299, '', { gender: 'men', materials: ['Full-Grain Leather'], purposes: ['everyday'], badge: 'Gift Set' }],
  ['keyfob-black', 'Brass Ring Key Fob', 'keychains', 499, null, '', { materials: ['Full-Grain Leather', 'Solid Brass'], purposes: ['everyday'], badge: 'Under ₹500' }],
  ['keyfob-brown', 'Leather Key Loop', 'keychains', 449, null, '', { materials: ['Full-Grain Leather'], purposes: ['everyday'], badge: 'Under ₹500' }],
  ['keyset-onyx', 'Compact Key Organiser', 'keychains', 999, null, '', { gender: 'men', materials: ['Full-Grain Leather'], purposes: ['everyday'] }],

  // ── Accessories › Pouches (+9; 3 also in Women › Cosmetic Bags) ──
  ['zippouch-tan', 'Leather Make-Up Pouch', 'pouches', 1199, null, '', { gender: 'women', also: ['women-cosmetic-bags'], materials: ['Full-Grain Leather'], purposes: ['travel', 'everyday'] }],
  ['zippouch-chocolate', 'Leather Cosmetic Bag', 'pouches', 1299, null, '', { gender: 'women', also: ['women-cosmetic-bags'], materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['zippouch-espresso', 'Leather Vanity Pouch', 'pouches', 1499, 1299, '', { gender: 'women', also: ['women-cosmetic-bags'], materials: ['Full-Grain Leather'], purposes: ['travel'] }],
  ['zippouch-espresso', 'Tech Accessories Pouch', 'pouches', 1099, null, '', { materials: ['Full-Grain Leather'], purposes: ['work', 'travel'] }],
  ['zippouch-tan', 'Leather Pencil Pouch', 'pouches', 699, null, '', { materials: ['Full-Grain Leather'], purposes: ['college', 'work'] }],
  ['zippouch-chocolate', 'Leather Coin Pouch', 'pouches', 599, null, '', { materials: ['Full-Grain Leather'], purposes: ['everyday'] }],
  ['zippouch-espresso', 'Large Flat Zip Pouch', 'pouches', 1299, null, '', { materials: ['Full-Grain Leather'], purposes: ['work', 'travel'] }],
  ['zippouch-tan', 'Receipt & Card Pouch', 'pouches', 799, null, '', { materials: ['Full-Grain Leather'], purposes: ['everyday', 'business'] }],
  ['zippouch-chocolate', 'Charger Pouch', 'pouches', 899, null, '', { materials: ['Full-Grain Leather'], purposes: ['travel', 'work'] }],

  // ── Accessories › Eyewear Cases (+8; the store has four case photos) ──
  ['eyecase-white', 'Sunglasses Hard Case', 'eyewear-cases', 649, null, '', { materials: ['Moulded Shell', 'Microfibre Lining'], purposes: ['travel'] }],
  ['eyecase-white-2', 'Clamshell Glasses Case', 'eyewear-cases', 599, null, '', { materials: ['Moulded Shell', 'Microfibre Lining'], purposes: ['everyday'] }],
  ['eyesleeve-tan', 'Leather Reading Glasses Sleeve', 'eyewear-cases', 899, null, '', { materials: ['Vegetable-Tanned Leather'], purposes: ['work'] }],
  ['eyesleeve-black', 'Slim Glasses Sleeve', 'eyewear-cases', 899, null, '', { materials: ['Vegetable-Tanned Leather'], purposes: ['work', 'everyday'] }],
  ['eyecase-white', 'Travel Glasses Case', 'eyewear-cases', 699, null, '', { materials: ['Moulded Shell', 'Microfibre Lining'], purposes: ['travel'] }],
  ['eyecase-white-2', 'Spectacle Case with Cloth', 'eyewear-cases', 649, null, '', { materials: ['Moulded Shell', 'Microfibre Cloth'], purposes: ['everyday'], badge: 'Cloth Included' }],
  ['eyesleeve-tan', 'Pocket Glasses Sleeve', 'eyewear-cases', 799, null, '', { materials: ['Vegetable-Tanned Leather'], purposes: ['everyday'] }],
  ['eyesleeve-black', 'Leather Sunglasses Sleeve', 'eyewear-cases', 949, null, '', { materials: ['Vegetable-Tanned Leather'], purposes: ['travel'] }],

  // ── Accessories › Hydration (+8; the store has four bottle photos) ──
  ['flask', 'Insulated Steel Bottle 750ml', 'hydration', 1299, null, '750ml', { materials: ['Stainless Steel'], purposes: ['travel', 'gym', 'work'] }],
  ['flask-sage', 'Insulated Bottle 500ml', 'hydration', 999, null, '500ml', { materials: ['Stainless Steel'], purposes: ['work', 'college'] }],
  ['bottle-lilac', 'Insulated Bottle 600ml', 'hydration', 1099, null, '600ml', { materials: ['Stainless Steel'], purposes: ['work', 'college'] }],
  ['bottle-trio', 'Insulated Bottle Trio', 'hydration', 2999, 2499, '3 × 500ml', { materials: ['Stainless Steel'], purposes: ['travel', 'work'], badge: 'Set of 3' }],
  ['flask', 'Steel Sports Bottle 1L', 'hydration', 1499, null, '1L', { materials: ['Stainless Steel'], purposes: ['gym', 'travel'] }],
  ['flask-sage', 'Big Insulated Bottle 1L', 'hydration', 1599, null, '1L', { materials: ['Stainless Steel'], purposes: ['travel', 'gym'] }],
  ['bottle-lilac', 'Desk Bottle 500ml', 'hydration', 899, null, '500ml', { materials: ['Stainless Steel'], purposes: ['work'], badge: 'Under ₹1,000' }],
  ['bottle-trio', 'Kids & Grown-Ups Bottle 400ml', 'hydration', 799, null, '400ml', { materials: ['Stainless Steel'], purposes: ['college', 'everyday'] }],

  // ── Men › Travel Backpacks (+2) ──
  ['apex-slate', 'Carry-On Travel Backpack 40L', 'backpacks', 6999, 5999, '40L', { gender: 'men', also: ['men-travel-backpacks'], materials: ['Ballistic Nylon'], features: ['Laptop 16" Sleeve'], purposes: ['travel'], badge: 'Cabin Size' }],
  ['backpack-hudson', 'Weekender Travel Backpack 35L', 'backpacks', 5499, null, '35L', { gender: 'men', also: ['men-travel-backpacks'], materials: ['Recycled Polyester 600D'], features: ['Laptop 16" Sleeve'], purposes: ['travel'] }],
];

// Honest one-line copy for sections that had none in catalogExtra's BLURB.
export const FILL_BLURB = {
  'Crossbody Bags': ['A hands-free crossbody bag', 'An adjustable strap lets you wear it across the body or on the shoulder, with room for a phone, wallet and keys.'],
  Daypacks: ['A light daypack', 'Sized for a day out: padded straps, a main compartment and quick-grab pockets.'],
};
