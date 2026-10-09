/**
 * Range expansion 4: accessories and travel bags (photos: Unsplash licence, see uploads/seed/CREDITS.md).
 * Same row format as catalogExtra.js:
 * [file, name, subcategory, price, salePrice|null, [colourName, hex, family], capacity, opts]
 * opts.colours adds more colour options, each with its own photo.
 */
import { buildProducts } from './catalogExtra.js';

const ROWS = [
  // ── Accessories ──
  ['passport-wanderlust-blush', 'Wanderlust Printed Passport Cover', 'Passport Holders', 899, null, ['Blush Pink', '#e8b4b8', 'pink'], '', { materials: ['Vegan Leather'], features: ['RFID Blocking Pocket'], purposes: ['travel'], badge: 'Gift Idea', colours: [['Sky Blue', '#7fa8c9', 'blue', 'passport-wanderlust-sky']] }],
  ['passport-atlas', 'Atlas Map Passport Cover', 'Passport Holders', 999, 799, ['Map Print', '#c58a54', 'tan'], '', { materials: ['Printed Vegan Leather'], purposes: ['travel'] }],
  ['passport-heritage', 'Heritage Leather Passport Wallet', 'Passport Holders', 1999, null, ['Dark Brown', '#3b2619', 'brown'], '', { materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['travel', 'business'], badge: 'Handcrafted' }],
  ['tag-navy', 'Leather Luggage Tag', 'Luggage Tags', 599, null, ['Navy', '#1f2f4f', 'navy'], '', { materials: ['Full-Grain Leather'], purposes: ['travel'], badge: 'Under ₹1,000', colours: [['Sky Blue', '#6fa3c7', 'blue', 'tag-sky']] }],
  ['dopp-heritage-brown', 'Heritage Leather Dopp Kit', 'Toiletry Kits', 2999, 2499, ['Dark Brown', '#4a2c1d', 'brown'], '4L', { gender: 'men', materials: ['Full-Grain Leather'], purposes: ['travel'], colours: [['Black', '#151515', 'onyx', 'dopp-heritage-black']] }],
  ['washbag-aqua', 'Aqua Hanging Wash Bag', 'Toiletry Kits', 1499, null, ['Aqua', '#5fb7c4', 'teal'], '5L', { materials: ['Recycled Polyester 600D'], purposes: ['travel'] }],
  ['beltbag-cream', 'Metro Leather Belt Bag', 'Belt Bags', 2499, null, ['Cream', '#ece3d3', 'cream'], '1.5L', { materials: ['Full-Grain Leather'], purposes: ['transit', 'travel'], badge: 'New Season', colours: [['Cherry Red', '#b8323a', 'red', 'beltbag-red'], ['Stone Grey', '#8c8f93', 'grey', 'beltbag-grey']] }],
  ['beltbag-holo', 'Festival Metallic Belt Bag', 'Belt Bags', 1299, 999, ['Iridescent', '#cfd6e6', 'grey'], '1L', { gender: 'women', materials: ['Metallic PU'], purposes: ['travel', 'creative'], colours: [['Magenta', '#b0277d', 'pink', 'beltbag-magenta'], ['Electric Blue', '#2453d6', 'blue', 'beltbag-blue']] }],
  ['keyfob-black', 'Loop Leather Key Fob', 'Keychains', 499, null, ['Black', '#151515', 'onyx'], '', { materials: ['Full-Grain Leather'], purposes: ['transit'], badge: 'Under ₹1,000', colours: [['Chestnut', '#7a4130', 'brown', 'keyfob-brown']] }],
  ['keyset-onyx', 'Onyx Key & Card Set', 'Keychains', 1799, null, ['Black', '#141414', 'onyx'], '', { gender: 'men', materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['work'], badge: 'Gift Set' }],
  ['zippouch-espresso', 'Everyday Leather Zip Pouch', 'Pouches', 1499, null, ['Espresso', '#3a2418', 'brown'], '', { materials: ['Full-Grain Leather'], purposes: ['work', 'travel'], colours: [['Tan', '#b07a45', 'tan', 'zippouch-tan'], ['Chocolate', '#5b3a26', 'brown', 'zippouch-chocolate']] }],
  ['eyecase-white', 'Hard-Shell Eyewear Case', 'Eyewear Cases', 699, null, ['White', '#f2f2f0', 'cream'], '', { materials: ['Moulded Shell', 'Microfibre Lining'], purposes: ['travel', 'work'], extra: ['eyecase-white-2'] }],
  ['eyesleeve-tan', 'Leather Glasses Sleeve', 'Eyewear Cases', 899, null, ['Tan', '#b07a45', 'tan'], '', { materials: ['Vegetable-Tanned Leather'], purposes: ['work'], colours: [['Black', '#151515', 'onyx', 'eyesleeve-black']] }],
  ['sleeve-saddle-tan', 'Saddle Leather Laptop Sleeve 14"', 'Laptop Sleeves', 3499, 2999, ['Saddle Tan', '#a0622f', 'tan'], '', { materials: ['Full-Grain Leather'], features: ['Laptop 14" Sleeve'], purposes: ['work', 'transit'], extra: ['sleeve-saddle-tan-2'], colours: [['Espresso', '#3a2418', 'brown', 'sleeve-saddle-espresso'], ['Cognac', '#9c5528', 'tan', 'sleeve-saddle-cognac']] }],
  ['cardholder-tan', 'Pull-Tab Card Holder', 'Wallets', 899, null, ['Tan', '#b07a45', 'tan'], '', { materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['work', 'transit'], colours: [['Black', '#151515', 'onyx', 'cardholder-black'], ['Red', '#c0392b', 'red', 'cardholder-red']] }],
  ['bifold-tan', 'Heritage Bifold Wallet', 'Wallets', 1699, null, ['Tan', '#b07a45', 'tan'], '', { gender: 'men', materials: ['Full-Grain Leather'], features: ['RFID Blocking Pocket'], purposes: ['work'], colours: [['Brown', '#5b3a26', 'brown', 'bifold-brown']] }],
  ['neckpillow-grey', 'Cloud Memory-Foam Neck Pillow', 'Travel Comfort', 1299, 999, ['Soft Grey', '#a9abad', 'grey'], '', { materials: ['Memory Foam', 'Jersey Cover'], purposes: ['travel'], extra: ['neckpillow-grey-2'] }],
  ['bottle-lilac', 'Insulated Steel Bottle 600ml', 'Hydration', 1199, null, ['Lilac', '#c9b6e4', 'pink'], '600ml', { materials: ['Stainless Steel'], purposes: ['travel', 'transit', 'work'], extra: ['bottle-trio'] }],
  ['cubes-navy-2', 'Packing Cube Set of 4', 'Travel Organisers', 1999, 1599, ['Navy', '#1f2f4f', 'navy'], '', { materials: ['Recycled Ripstop Nylon'], purposes: ['travel'], badge: 'Set of 4' }],

  // ── Travel bags ──
  ['weekender-heritage-cognac', 'Heritage Leather Weekender 40L', 'Travel Bags', 16999, 14499, ['Cognac', '#9c5528', 'tan'], '40L', { materials: ['Full-Grain Leather'], features: ['Shoe Compartment', 'Trolley Pass-Through'], purposes: ['travel', 'business'], badge: 'Handcrafted', colours: [['Mustard', '#c99a3b', 'yellow', 'weekender-heritage-mustard']] }],
  ['weekender-nylon-grey-2', 'Commuter Nylon Weekender 35L', 'Duffle Bags', 3999, null, ['Slate Grey', '#6e7378', 'grey'], '35L', { materials: ['Recycled Ripstop Nylon'], features: ['Shoe Compartment', 'Trolley Pass-Through'], purposes: ['travel', 'transit'] }],
  ['travelpack-forest', 'Nomad Canvas Travel Pack 30L', 'Travel Bags', 5999, null, ['Forest Green', '#3d5a40', 'green'], '30L', { materials: ['Waxed Cotton Canvas', 'Full-Grain Leather'], features: ['Laptop 16" Sleeve'], purposes: ['travel'], colours: [['Olive', '#5d6043', 'olive', 'travelpack-olive']] }],
  ['trekpack-teal', 'Ridge Trekking Pack 45L', 'Travel Bags', 6999, 5999, ['Teal', '#1f6f6b', 'teal'], '45L', { materials: ['Ripstop Nylon'], features: ['IPX5 Waterproof'], purposes: ['travel'], badge: 'Trail Ready', colours: [['Sunflower', '#e2b632', 'yellow', 'trekpack-sun']] }],
  ['checkin-aurora-black', 'Aurora Polycarbonate Check-In 65L', 'Travel Bags', 10999, 8999, ['Gloss Black', '#141414', 'onyx'], '65L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'], colours: [['Sunshine Yellow', '#f2c230', 'yellow', 'checkin-aurora-yellow']] }],
  ['luggage-ivory-trio', 'Ivory 3-Piece Luggage Set', 'Travel Bags', 24999, 19999, ['Ivory', '#ebe4d6', 'cream'], '35L + 65L + 90L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock'], purposes: ['travel'], badge: 'Set of 3' }],
  ['cabin-emerald', 'Emerald Front-Pocket Cabin 38L', 'Cabin Luggage', 9499, null, ['Emerald', '#1f5c4a', 'green'], '38L', { materials: ['Polycarbonate'], features: ['Spinner Wheels', 'TSA Lock', 'Laptop 14" Sleeve'], purposes: ['travel', 'business'], badge: 'New Season', colours: [['Teal', '#2f7d82', 'teal', 'cabin-emerald-teal']] }],
];

export const moreProducts = buildProducts(ROWS, 400);

// New Accessories subcategories (added to the existing "Accessories" category by the seed top-up).
export const moreAccessoryCategories = [
  { name: 'Passport Holders', tagline: 'Covers and travel wallets for your papers', image: 'catalog/passport-wanderlust-blush' },
  { name: 'Luggage Tags', tagline: 'Spot your bag on any carousel', image: 'catalog/tag-navy' },
  { name: 'Toiletry Kits', tagline: 'Dopp kits and hanging wash bags', image: 'catalog/dopp-heritage-brown' },
  { name: 'Belt Bags', tagline: 'Hands-free waist and chest packs', image: 'catalog/beltbag-cream' },
  { name: 'Keychains', tagline: 'Leather key fobs and gift sets', image: 'catalog/keyfob-black' },
  { name: 'Pouches', tagline: 'Zip pouches for the small things', image: 'catalog/zippouch-espresso' },
  { name: 'Eyewear Cases', tagline: 'Hard cases and leather sleeves', image: 'catalog/eyecase-white' },
  { name: 'Laptop Sleeves', tagline: 'Slim leather protection for laptops', image: 'catalog/sleeve-saddle-tan' },
  { name: 'Travel Comfort', tagline: 'Neck pillows for long journeys', image: 'catalog/neckpillow-grey' },
];

// file name → Unsplash photo id (or image path when the id was not available)
export const morePhotoSources = {
  'passport-wanderlust-blush': 'KbtMWr6ysrw', 'passport-wanderlust-sky': 'TAp9HueSlKQ', 'passport-atlas': 'vKTxINZcvbE', 'passport-heritage': 'tucWr6DLZn8',
  'tag-navy': 'LORm00ZIuag', 'tag-sky': 'SBdXPbXEwaI', 'dopp-heritage-brown': 'd26iwbzYSKM', 'dopp-heritage-black': 'xcGSvYOLcwE', 'washbag-aqua': '19O8XO4yfZU',
  'beltbag-cream': 'zgVwk8QZjI0', 'beltbag-red': 'kYQ2uqYm0aY', 'beltbag-grey': 'VDEXsV6F4cw', 'beltbag-holo': 'Yz8VScYQ3-I',
  'beltbag-magenta': '9hx1l-iFSoQ', 'beltbag-blue': 'WnkQ5j8Nrjs', 'keyfob-black': 'fhKAEIZa9b4', 'keyfob-brown': 'V7iQ0hM4xCA', 'keyset-onyx': '6wQTt7tI_Qw',
  'zippouch-espresso': '6YO98iqkKGA', 'zippouch-tan': 'nfAbaVnE9cc', 'zippouch-chocolate': 'D4126KY3M80', 'eyecase-white': 'x6BFZQ_2YEw', 'eyecase-white-2': 'jym62KnsByQ',
  'eyesleeve-tan': 'Qbokpv3WIB0', 'eyesleeve-black': 'pt4yoY9Q-ew', 'neckpillow-grey': '9Iv6_QyjukI', 'neckpillow-grey-2': '365hT8h5pMQ', 'bottle-lilac': 'e0omsarchd4',
  'bottle-trio': '6gLya_-tnP8', 'sleeve-saddle-tan': '6dt0uGaTmoI', 'sleeve-saddle-tan-2': 'k0CZkkuuqt0', 'sleeve-saddle-espresso': 'ZjWTjyBiiVA', 'sleeve-saddle-cognac': '8Z6srMPonq8',
  'cardholder-tan': 'ZUzL86CQojw', 'cardholder-black': 'GMx1KOIeRhs', 'cardholder-red': 'HKw16a5yIEY', 'bifold-tan': 'LBKDJI8Ernw', 'bifold-brown': 'oIlix2slmsI',
  'weekender-heritage-cognac': 'M0g1sV4SEdo', 'weekender-heritage-mustard': 'thIarMEfujc', 'weekender-nylon-grey-2': 'xi0OWUlTfso', 'travelpack-forest': 'O_bhy3TnSYU',
  'travelpack-olive': 'or5CCy0qrPQ', 'trekpack-teal': '9aZ3T1q83CM', 'trekpack-sun': 'UVyOfX3v0Ls', 'checkin-aurora-yellow': 'https://images.unsplash.com/photo-1770199105507-2af7f77a6ee0',
  'checkin-aurora-black': 'GtsIq_mGwFI', 'luggage-ivory-trio': 'nGz8rTToXto', 'cabin-emerald': 'oXk-03LEFsk', 'cabin-emerald-teal': '-ZUHytrj4Ic', 'cubes-navy-2': 'HejqYjjWGOs',
};
