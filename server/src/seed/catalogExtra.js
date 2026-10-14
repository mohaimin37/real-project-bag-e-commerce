/**
 * Range expansion 3: 65 more products (photos: Unsplash licence, see uploads/seed/CREDITS.md).
 * Each row: [file, name, subcategory, price, salePrice|null, [colourName, hex, family], capacity, opts]
 * opts: gender, materials, features, purposes, badge, extra (more photos), colours (more colour options)
 */
const img = (name, alt = '') => ({ url: `/uploads/seed/catalog/${name}.jpg`, alt });

const ROWS = [
  ['card-sleeve-duo', 'Duo Slim Card Sleeve', 'Wallets', 999, null, ['Black', '#151515', 'onyx'], '', { materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['work'], badge: 'Under ₹1,000' }],
  ['shopper-harvest', 'Harvest Leather Shopper', 'Tote Bags', 8999, 7499, ['Tan', '#b07a45', 'tan'], '14L', { gender: 'women', materials: ['Vegetable-Tanned Leather'], purposes: ['work', 'travel'], badge: 'New Season' }],
  ['messenger-dalton', 'Dalton Field Messenger', 'Laptop Bags', 13999, null, ['Dark Brown', '#3b2619', 'brown'], '12L', { gender: 'men', materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'creative'] }],
  ['cabin-skyline', 'Skyline Spinner Cabin 36L', 'Cabin Luggage', 6999, 5499, ['Azure Blue', '#1f6fd1', 'blue'], '36L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'], badge: 'Bestseller' }],
  ['backpack-hudson', 'Hudson Leather Backpack', 'Backpacks', 10999, null, ['Black', '#171717', 'onyx'], '18L', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'travel'], colours: [['Oxblood', '#5b1f24', 'red', 'backpack-hudson']] }],
  ['crossbody-nova', 'Nova Mini Barrel Crossbody', 'Sling Bags', 2999, null, ['Caramel', '#a8642b', 'tan'], '2L', { gender: 'women', materials: ['Vegan Leather'], purposes: ['transit', 'business'] }],
  ['bucket-noir', 'Noir Chain Bucket Bag', 'Handbags', 4499, null, ['Black', '#141414', 'onyx'], '5L', { gender: 'women', materials: ['Cotton Canvas'], purposes: ['business', 'creative'], extra: ['bucket-noir-2'] }],
  ['checkin-meridian', 'Meridian Aluminium Check-In 65L', 'Travel Bags', 32999, null, ['Champagne Silver', '#c9c3b8', 'grey'], '65L', { materials: ['Aircraft-Grade Aluminium'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'], badge: 'Lifetime Shell' }],
  ['rucksack-prairie', 'Prairie Canvas Rucksack 25L', 'Backpacks', 4999, 3999, ['Mustard', '#c99a3b', 'yellow'], '25L', { materials: ['Waxed Cotton Canvas'], purposes: ['travel', 'creative'] }],
  ['wallet-woodland', 'Woodland Trifold Wallet', 'Wallets', 1499, null, ['Brown', '#6b3f23', 'brown'], '', { materials: ['Full-Grain Leather'], purposes: ['work', 'travel'] }],
  ['wallet-executive', 'Executive Black Bifold', 'Wallets', 1299, null, ['Black', '#131313', 'onyx'], '', { gender: 'men', materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['work'] }],
  ['duffel-ranger', 'Ranger Canvas Duffel 40L', 'Duffle Bags', 3999, null, ['Khaki Tan', '#a77b4f', 'tan'], '40L', { materials: ['Cotton Canvas'], features: ['Shoe Compartment'], purposes: ['travel'] }],
  ['cabin-coral', 'Coral Spinner Cabin 38L', 'Cabin Luggage', 7499, null, ['Cherry Red', '#c8333a', 'red'], '38L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'] }],
  ['tote-cotton', 'Everyday Cotton Tote', 'Tote Bags', 999, null, ['Natural White', '#f2efe8', 'cream'], '12L', { materials: ['Organic Cotton'], purposes: ['transit', 'creative'], badge: 'Under ₹1,000' }],
  ['chain-chevron', 'Chevron Chain Shoulder Bag', 'Clutches', 3499, 2999, ['Candy Pink', '#e9a7b5', 'pink'], '2L', { gender: 'women', materials: ['Vegan Leather'], purposes: ['business'], colours: [['Mauve', '#8d6f75', 'pink', 'chain-chevron-mauve']] }],
  ['satchel-heirloom', 'Heirloom Vintage Satchel', 'Handbags', 6499, null, ['Antique Tan', '#a37a55', 'tan'], '6L', { gender: 'women', materials: ['Vintage Leather'], purposes: ['work', 'business'] }],
  ['cabin-metro', 'Metro Graphite Cabin 40L', 'Cabin Luggage', 9999, 8499, ['Graphite', '#3a3d42', 'grey'], '40L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel', 'business'] }],
  ['wallet-zip', 'Pocket Zip Coin Wallet', 'Wallets', 1199, null, ['Brown', '#7a4428', 'brown'], '', { gender: 'women', materials: ['Full-Grain Leather'], purposes: ['transit'] }],
  ['cabin-onyx', 'Onyx Ribbed Cabin 38L', 'Cabin Luggage', 5999, null, ['Black', '#1a1a1a', 'onyx'], '38L', { materials: ['Polycarbonate'], features: ['Spinner Wheels'], purposes: ['travel'] }],
  ['pack-highland', 'Highland Canvas & Leather Pack', 'Backpacks', 8499, null, ['Charcoal', '#3f4246', 'grey'], '20L', { materials: ['Waxed Cotton Canvas', 'Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['travel', 'work'] }],
  ['satchel-cambridge', 'Cambridge Leather Satchel', 'Office Bags', 11999, null, ['Dark Brown', '#4a2c1d', 'brown'], '10L', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'business'] }],
  ['sleeve-felt', 'Felt Laptop Sleeve 14"', 'Tech Briefcases', 1299, null, ['Heather Grey', '#8d9196', 'grey'], '', { materials: ['Wool Felt'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'transit'] }],
  ['tote-atelier', 'Atelier Structured Tote', 'Tote Bags', 7999, null, ['Black', '#141414', 'onyx'], '12L', { gender: 'women', materials: ['Pebble-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'business'] }],
  ['pack-summit', 'Summit Trekking Pack 55L', 'Travel Bags', 7999, 6999, ['Cobalt Blue', '#2d4e9e', 'blue'], '55L', { materials: ['Ripstop Nylon'], purposes: ['travel'], badge: 'Trail Ready' }],
  ['tote-linen', 'Linen Market Tote', 'Tote Bags', 1199, null, ['Sky Grey', '#9fb3bd', 'grey'], '14L', { materials: ['Linen'], purposes: ['transit', 'creative'] }],
  ['straw-riviera', 'Riviera Straw Beach Bag', 'Beach & Straw Bags', 2499, null, ['Natural Straw', '#cfae7b', 'sand'], '15L', { gender: 'women', materials: ['Natural Straw'], purposes: ['travel'] }],
  ['handbag-bloom', 'Bloom Floral Top-Handle', 'Handbags', 5499, null, ['Floral Blush', '#e3b6a2', 'pink'], '6L', { gender: 'women', materials: ['Printed Vegan Leather'], purposes: ['business'] }],
  ['tote-denim', 'Patchwork Denim Tote', 'Tote Bags', 1499, null, ['Indigo', '#3d5a8a', 'navy'], '12L', { materials: ['Upcycled Denim'], purposes: ['transit', 'creative'], badge: 'Eco Pick' }],
  ['laptop-sterling', 'Sterling Leather Laptop Bag 15"', 'Laptop Bags', 9499, null, ['Saddle Tan', '#8e5329', 'tan'], '11L', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'business'] }],
  ['backpack-fulton', 'Fulton Leather Backpack', 'Backpacks', 9999, 8999, ['Chestnut', '#7a4130', 'brown'], '16L', { materials: ['Vintage Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'travel'] }],
  ['handbag-lagoon', 'Lagoon Structured Handbag', 'Handbags', 8999, null, ['Turquoise', '#2bb3b1', 'teal'], '7L', { gender: 'women', materials: ['Smooth Calfskin'], purposes: ['business', 'work'], badge: 'New Season' }],
  ['duffle-highway', 'Highway Leather Duffle 45L', 'Duffle Bags', 15999, null, ['Oxblood Brown', '#5a2a20', 'brown'], '45L', { materials: ['Full-Grain Leather'], features: ['Shoe Compartment'], purposes: ['travel'] }],
  ['rolltop-ridgeline', 'Ridgeline Rolltop 22L', 'Waterproof Commuters', 5999, null, ['Stone Grey', '#7d7f78', 'grey'], '22L', { materials: ['Waterproof Ballistic Nylon'], features: ['IPX5 Waterproof', 'Laptop 14" Sleeve'], purposes: ['transit', 'travel'] }],
  ['duffel-transit', 'Transit Gym Duffel 30L', 'Duffle Bags', 2499, 1999, ['Sage Khaki', '#8d8b76', 'olive'], '30L', { materials: ['Recycled Polyester 600D'], features: ['Shoe Compartment'], purposes: ['transit'] }],
  ['bucket-olive', 'Olive Drawstring Bucket Bag', 'Handbags', 3299, null, ['Olive', '#4f5a3a', 'olive'], '6L', { materials: ['Cotton Canvas'], purposes: ['creative', 'transit'] }],
  ['wallet-saddle', 'Saddle Bifold Wallet', 'Wallets', 1899, 1599, ['Saddle Brown', '#8a4b26', 'brown'], '', { gender: 'men', materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['work'] }],
  ['wicker-capri', 'Capri Wicker Top-Handle', 'Beach & Straw Bags', 3999, null, ['Tangerine', '#d9622b', 'orange'], '6L', { gender: 'women', materials: ['Rattan', 'Vegan Leather'], purposes: ['travel', 'business'] }],
  ['crossbody-cloud', 'Cloud Minimal Crossbody', 'Sling Bags', 2499, null, ['White', '#efefed', 'cream'], '2L', { gender: 'women', materials: ['Vegan Leather'], purposes: ['transit', 'business'] }],
  ['bucket-soho', 'Soho Leather Bucket Bag', 'Handbags', 6999, null, ['Black', '#151515', 'onyx'], '7L', { gender: 'women', materials: ['Smooth Calfskin'], purposes: ['work', 'business'] }],
  ['raffia-tassel', 'Raffia Tassel Crossbody', 'Beach & Straw Bags', 1799, null, ['Natural', '#d9c29b', 'sand'], '3L', { gender: 'women', materials: ['Raffia'], purposes: ['travel'] }],
  ['basket-seaside', 'Seaside Basket Bag', 'Beach & Straw Bags', 1999, null, ['Wheat', '#c9a46b', 'sand'], '10L', { gender: 'women', materials: ['Natural Straw'], purposes: ['travel'] }],
  ['pouch-toiletry', 'Canvas Toiletry Pouch Set', 'Travel Organisers', 1299, null, ['Olive & Peach', '#556148', 'olive'], '', { materials: ['Cotton Canvas'], purposes: ['travel'], badge: 'Set of 3' }],
  ['camera-voyager', 'Voyager Leather Camera Bag', 'Sling Bags', 4999, null, ['Cognac', '#9c5528', 'tan'], '4L', { materials: ['Full-Grain Leather'], purposes: ['creative', 'travel'] }],
  ['tote-stitchline', 'Stitchline Leather Tote', 'Tote Bags', 9499, null, ['Black', '#151515', 'onyx'], '15L', { gender: 'women', materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work'] }],
  ['backpack-mini-city', 'City Mini Backpack', 'Backpacks', 3499, 2999, ['Black', '#161616', 'onyx'], '8L', { gender: 'women', materials: ['Vegan Leather'], purposes: ['transit', 'creative'] }],
  ['checkin-terracotta', 'Terracotta Spinner 45L', 'Travel Bags', 8999, null, ['Rust', '#9b4a3a', 'red'], '45L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'] }],
  ['luggage-set-voyage', 'Voyage 3-Piece Luggage Set', 'Travel Bags', 18999, 14999, ['Royal Blue', '#2f49c4', 'blue'], '35L + 65L + 90L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'], badge: 'Set of 3' }],
  ['messenger-expedition', 'Expedition Canvas Messenger', 'Laptop Bags', 3999, null, ['Heather Grey', '#8a8a86', 'grey'], '10L', { materials: ['Cotton Canvas', 'Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'creative'] }],
  ['utility-ledger', 'Ledger Leather Utility Bag', 'Sling Bags', 3799, null, ['Tan', '#a35c2a', 'tan'], '3L', { materials: ['Full-Grain Leather'], purposes: ['transit', 'travel'] }],
  ['cabin-sunset', 'Sunset Spinner Cabin 35L', 'Cabin Luggage', 6499, null, ['Tangerine', '#ef7a24', 'orange'], '35L', { materials: ['Polycarbonate'], features: ['Spinner Wheels'], purposes: ['travel'] }],
  ['pack-alpine', 'Alpine Explorer Pack 35L', 'Travel Bags', 5499, null, ['Ocean Blue', '#2f4a68', 'navy'], '35L', { materials: ['Ripstop Nylon'], purposes: ['travel'] }],
  ['duffle-bowler', 'Bowler Mini Duffle', 'Handbags', 5999, null, ['Black', '#141414', 'onyx'], '6L', { gender: 'women', materials: ['Pebble-Grain Leather'], purposes: ['business', 'transit'] }],
  ['straw-fiesta', 'Fiesta Fringe Straw Bag', 'Beach & Straw Bags', 2199, null, ['Sea Blue & Straw', '#6f8fa8', 'blue'], '8L', { gender: 'women', materials: ['Natural Straw'], purposes: ['travel'] }],
  ['portfolio-atlas', 'Atlas Leather Portfolio', 'Tech Briefcases', 4999, null, ['Cognac', '#9c5528', 'tan'], '', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'business'] }],
  ['weekender-concord', 'Concord Leather Weekender', 'Duffle Bags', 17999, 15999, ['Cocoa', '#6a3c22', 'brown'], '38L', { materials: ['Full-Grain Leather'], features: ['Laptop 16" Sleeve'], purposes: ['travel', 'business'] }],
  ['satchel-peacock', 'Peacock Grain Satchel', 'Handbags', 6799, null, ['Peacock Teal', '#146e78', 'teal'], '6L', { gender: 'women', materials: ['Pebble-Grain Leather'], purposes: ['work', 'business'] }],
  ['handbag-scarlet', 'Scarlet Top-Handle Bag', 'Handbags', 7499, null, ['Scarlet', '#d2392b', 'red'], '5L', { gender: 'women', materials: ['Smooth Calfskin'], purposes: ['business'], badge: 'Statement' }],
  ['shoulder-tropic', 'Tropic Print Shoulder Bag', 'Handbags', 5999, 4999, ['Tropical Print', '#4c7aa8', 'blue'], '5L', { gender: 'women', materials: ['Printed Vegan Leather'], purposes: ['business', 'travel'] }],
  ['cabin-blush', 'Blush Spinner Cabin 36L', 'Cabin Luggage', 6999, null, ['Blush Pink', '#f0c9c9', 'pink'], '36L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'] }],
  ['drypack-coastline', 'Coastline Dry Pack 30L', 'Waterproof Commuters', 6999, null, ['Black', '#151515', 'onyx'], '30L', { materials: ['Waterproof Ballistic Nylon'], features: ['IPX5 Waterproof', 'Laptop 16" Sleeve'], purposes: ['transit', 'travel'], badge: 'Stormproof' }],
  ['tote-essential', 'Essential Canvas Tote', 'Tote Bags', 1099, null, ['Ecru', '#e6e0d2', 'cream'], '14L', { materials: ['Organic Cotton'], purposes: ['transit'] }],
  ['tote-woven', 'Woven Leather Chain Tote', 'Tote Bags', 11999, null, ['Tan', '#a55a2c', 'tan'], '16L', { gender: 'women', materials: ['Woven Nappa Leather'], purposes: ['work', 'business'], badge: 'Handcrafted' }],
  ['straw-market', 'Market Day Straw Shopper', 'Beach & Straw Bags', 1599, null, ['Straw', '#c8a46e', 'sand'], '18L', { materials: ['Natural Straw'], purposes: ['travel', 'transit'] }],
  ['cabin-sage', 'Sage Hardshell Cabin 38L', 'Cabin Luggage', 7999, null, ['Sage Green', '#9aa88c', 'olive'], '38L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'] }],
  ['handbag-ellington', 'Ellington Leather Handbag', 'Handbags', 12999, 10999, ['Whisky Tan', '#9a5626', 'tan'], '9L', { gender: 'women', materials: ['Full-Grain Italian Calfskin'], purposes: ['work', 'business'], badge: 'Calfskin Series' }],
];

// Short, honest copy per type; the product's own material, capacity and colour fill the details.
export const BLURB = {
  Wallets: ['A slim everyday wallet', 'Card slots, a note pocket and hand-finished edges keep it neat for years.'],
  'Tote Bags': ['An easy-carry tote', 'Long handles sit comfortably on the shoulder and there is room for a laptop, a jumper and lunch.'],
  'Laptop Bags': ['A laptop bag for daily work', 'A padded sleeve protects your laptop and front pockets keep chargers and notes in reach.'],
  'Cabin Luggage': ['A carry-on spinner', 'Four 360° wheels, a telescopic handle and a compression divider make airport days easy.'],
  Backpacks: ['An everyday backpack', 'Padded straps, a laptop sleeve and quick-grab pockets for commutes and weekends.'],
  'Sling Bags': ['A hands-free crossbody', 'Wear it across the body or on the shoulder; the adjustable strap fits all sizes.'],
  Handbags: ['A polished handbag', 'Structured enough to hold its shape, roomy enough for your phone, wallet and keys.'],
  'Travel Bags': ['Built for longer trips', 'Packs a full week with smart organisation and tough, easy-clean materials.'],
  'Duffle Bags': ['A grab-and-go duffle', 'Opens wide for fast packing, with carry handles and a detachable shoulder strap.'],
  'Office Bags': ['A classic work bag', 'Room for documents, a laptop and the day’s essentials, with a timeless look.'],
  'Tech Briefcases': ['Protection for your tech', 'Soft lining and padding keep a laptop or tablet safe in any bag.'],
  'Waterproof Commuters': ['Rain-proof daily carry', 'A water-resistant shell and roll-top keep your things dry on wet commutes.'],
  'Beach & Straw Bags': ['A sunny-day straw bag', 'Lightweight, roomy and made for beaches, markets and holidays.'],
  'Travel Organisers': ['Packing made tidy', 'Keeps toiletries and small essentials sorted inside any bag.'],
  Clutches: ['An evening bag', 'Sized for the essentials, with a chain strap to wear on the shoulder or carry as a clutch.'],
  'Passport Holders': ['A passport cover for every trip', 'Slots for your passport, boarding pass and a card, so travel papers stay together and scuff-free.'],
  'Luggage Tags': ['A luggage tag that stands out', 'A privacy flap hides your address and the strap buckles securely to any handle.'],
  'Toiletry Kits': ['A wash bag that packs flat', 'A wipe-clean lining and inner pockets keep toiletries upright and leaks contained.'],
  'Belt Bags': ['A hands-free belt bag', 'Wear it round the waist or across the chest; room for a phone, cards and keys.'],
  Keychains: ['A small leather key accessory', 'Keeps keys together and easy to find in any bag.'],
  Pouches: ['A zip pouch for the small things', 'Holds chargers, pens, make-up or receipts and slips into any bag.'],
  'Eyewear Cases': ['A case to protect your glasses', 'A soft lining stops scratches and the closure keeps frames from slipping out.'],
  'Laptop Sleeves': ['A slim laptop sleeve', 'A soft lining and snug fit protect your laptop on its own or inside another bag.'],
  'Travel Comfort': ['Comfort for long journeys', 'Supports your neck on flights, trains and road trips, and packs small.'],
  Hydration: ['A reusable bottle', 'Double-wall steel keeps drinks cold for 24 hours or hot for 12.'],
};

/** Turns compact rows into full seed products. Each catalogue file passes its own SKU range. */
export function buildProducts(rows, skuStart) {
  let sku = skuStart;
  return rows.map(([file, name, sub, price, salePrice, [colour, hex, family], capacity, o = {}]) => {
  sku += 1;
  const [lead, detail] = BLURB[sub] || ['A versatile bag', 'Made to be used every day.'];
  const materials = o.materials || [];
  const stock = 8 + ((sku * 37) % 70);
  const colours = [[colour, hex, family, stock, file], ...(o.colours || []).map(([n, h, f, photo], i) => [n, h, f, 5 + ((sku + i) * 13) % 40, photo])];
  const specs = [
    capacity && { label: 'Capacity', value: capacity },
    materials.length && { label: 'Material', value: materials.join(', ') },
    { label: 'Colour', value: colours.map((c) => c[0]).join(' / ') },
  ].filter(Boolean);
  return {
    name,
    sku: `WT-X${sku}`,
    sub,
    gender: o.gender || 'unisex',
    tagline: capacity && !capacity.includes('+') ? `${capacity} ${sub.replace(/s$/, '')}` : sub.replace(/s$/, ''),
    badge: o.badge || '',
    shortDescription: `${lead} in ${colour.toLowerCase()}${materials[0] ? ` ${materials[0].toLowerCase()}` : ''}. ${detail}`,
    description: `${name} is ${lead.toLowerCase()} made from ${materials.length ? materials.join(' and ').toLowerCase() : 'durable materials'}. ${detail} Every WILDTANE piece is backed by our lifetime repair promise.`,
    price,
    ...(salePrice ? { salePrice } : {}),
    capacity: capacity || '',
    images: [img(file, `${name} in ${colour}`), ...(o.extra || []).map((e) => img(e, name))],
    variants: colours,
    materials,
    features: o.features || [],
    purposes: o.purposes || [],
    tags: [sub.toLowerCase(), ...materials.map((m) => m.toLowerCase())],
    specifications: specs,
    isNewArrival: sku % 3 === 0,
    isBestseller: o.badge === 'Bestseller',
    soldCount: 40 + ((sku * 53) % 600),
    photoFolder: 'catalog',
  };
  });
}

export const extraProducts = buildProducts(ROWS, 300);

// file name → Unsplash photo id (for credits and the photo download step)
export const extraPhotoSources = {
  'card-sleeve-duo': '-lN0HnySy7w', 'shopper-harvest': '-qgDzKxrHMg', 'messenger-dalton': '0YUIvKe1d5s', 'cabin-skyline': '166umbWL6Ec',
  'backpack-hudson': '1Frndjy7tkM', 'crossbody-nova': '34mc9TqRznQ', 'bucket-noir': '6XShU8ZtUig', 'bucket-noir-2': 'SgiRogVrTf4',
  'checkin-meridian': '6uWRmqYNxBE', 'rucksack-prairie': '7e-VK6U-3Fs', 'wallet-woodland': '8aWTzz0Vs0Y', 'wallet-executive': '9Huby3g9fN0',
  'duffel-ranger': '9XiN0r2NWSM', 'cabin-coral': '9p9LbIW5uT0', 'tote-cotton': 'AFCo5H6rFEE', 'chain-chevron': 'APNnyM36puU',
  'chain-chevron-mauve': 'se3GNrXjtdQ', 'satchel-heirloom': 'Aqx94H6bi4g', 'cabin-metro': 'Av4dIOkbe9o', 'wallet-zip': 'BGu0J5wCah4',
  'cabin-onyx': 'BJ5gcirJa4Y', 'pack-highland': 'BmH09wAkJa8', 'satchel-cambridge': 'BnG4KWAzt9c', 'sleeve-felt': 'C6KlhrAsgoU',
  'tote-atelier': 'CtOA9wbFAdQ', 'pack-summit': 'D75_5tWZDQ4', 'tote-linen': 'E5M98Nox2JA', 'straw-riviera': 'EaAMe2zpbKU',
  'handbag-bloom': 'HFE2RyC76tw', 'tote-denim': 'MbktGM5IcsE', 'laptop-sterling': 'NqZ2vFqChaw', 'backpack-fulton': 'OFHkPCkhYEY',
  'handbag-lagoon': 'P9EY1oR7PMs', 'duffle-highway': 'PpzBE1hWeGI', 'rolltop-ridgeline': 'TS4eBHeIIq8', 'duffel-transit': 'Tv22sx0mHag',
  'bucket-olive': 'VW90_n-U1A4', 'wallet-saddle': 'Xbjf9nnEQ4s', 'wicker-capri': 'ZT16YkAYueo', 'crossbody-cloud': 'Zha2jqwxzMY',
  'bucket-soho': 'aRTqdeuv_D4', 'raffia-tassel': 'bs7kqVg_YnY', 'basket-seaside': 'c2h87Lj8FEo', 'pouch-toiletry': 'gNN4jwQ-ZuA',
  'camera-voyager': 'hLwkfi3oPp0', 'tote-stitchline': 'iFQhTLUFSv4', 'backpack-mini-city': 'iFelMiWMuO4', 'checkin-terracotta': 'iGXIjzloB2k',
  'luggage-set-voyage': 'ji5XMfO3dXY', 'messenger-expedition': 'kIfPF4dDrF4', 'utility-ledger': 'kTozgN5CQHc', 'cabin-sunset': 'kYSJ1xBi848',
  'pack-alpine': 'l5VCmqQbP_g', 'duffle-bowler': 'lnbuoKz2GlM', 'straw-fiesta': 'mSTb8XaeA00', 'portfolio-atlas': 'mTci4DjWXfU',
  'weekender-concord': 'nMuIXO5EEpM', 'satchel-peacock': 'nvQemFKRBUo', 'handbag-scarlet': 'oCXVxwTFwqE', 'shoulder-tropic': 'ooj5VfXq5o8',
  'cabin-blush': 'q-4fbq8pUO4', 'drypack-coastline': 'q21JALixJNs', 'tote-essential': 'smTDI-z1rlY', 'tote-woven': 'tcVH_BwHtrc',
  'straw-market': 'tr6uUyHOUJ0', 'cabin-sage': 'zQsEp5sRSKY', 'handbag-ellington': 'zxPo13geJ5U',
};
