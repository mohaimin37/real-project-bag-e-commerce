import { useConfig } from '../hooks/useStore';

/**
 * Built-in homepage content (desktop + phone) and footer links. The admin edits all of it in
 * Admin → Settings → Homepage / Footer; anything they haven't changed falls back to this.
 *
 * Keep claims here true and checkable (no invented ratings, awards, customer counts or warranties).
 * Tones are colour names from HOME_TONES below — never yellow / gold.
 */

export const DESKTOP_SECTIONS = [
  ['categoryStrip', 'Category circles'],
  ['hero', 'Hero (big intro)'],
  ['continueShopping', 'Recently viewed'],
  ['departments', 'Departments'],
  ['rails', 'Product rows'],
  ['offers', 'Offers rotator'],
  ['spinPromo', 'Spin & Win banner'],
  ['categoryTiles', 'Category tiles'],
  ['allProducts', 'All products grid'],
  ['values', 'Why choose us'],
  ['sustainability', 'Sustainability'],
  ['editorial', 'Journal & standards'],
  ['reviews', 'Customer reviews'],
  ['contact', 'Help & contact'],
  ['about', 'About the store'],
];

export const MOBILE_SECTIONS = [
  ['search', 'Search bar'],
  ['categories', 'Category circles'],
  ['hero', 'Banner slider'],
  ['values', 'Trust strip'],
  ['continueShopping', 'Recently viewed'],
  ['deal', 'Deal of the day'],
  ['departments', 'Departments'],
  ['tabs', 'Quick filter tabs'],
  ['rails', 'Product rows'],
  ['entireStore', 'Entire store'],
  ['assurance', 'Promise banner'],
];

export const HOME_TONES = ['rose', 'indigo', 'sky', 'emerald', 'teal', 'violet', 'pink', 'blue', 'slate'];

export const RAIL_SOURCES = [
  ['featured', 'Featured products'],
  ['newArrivals', 'New arrivals'],
  ['bestSellers', 'Best sellers'],
  ['category', 'A category'],
];

export const BUILTIN_HOMEPAGE = {
  desktop: {
    sections: DESKTOP_SECTIONS.map(([key]) => ({ key, visible: true })),
    hero: {
      badge: 'Architectural Carry',
      title: 'Carry Your World in',
      highlight: 'Color & Craft.',
      text: 'Built for the daily commute, airport security and weekends away — tough fabrics, quality leather and smart compartments.',
      image: '/uploads/seed/terminal-traveler.jpg',
      imageEyebrow: 'Made to travel',
      imageCaption: 'Backpacks, totes and luggage for every kind of journey.',
      ratingText: '',
      ratingSub: '',
      stats: [
        { value: '7-Day', label: 'Easy returns', tone: 'rose' },
        { value: 'COD', label: 'Pay on delivery', tone: 'emerald' },
        { value: 'Free', label: 'Delivery over ₹10,000', tone: 'sky' },
        { value: 'Secure', label: 'UPI & card checkout', tone: 'violet' },
      ],
      buttons: [
        { label: 'Shop Men', to: '/men', icon: 'man', tone: 'indigo' },
        { label: 'Shop Women', to: '/women', icon: 'woman', tone: 'rose' },
        { label: 'Universal', to: '/universal', icon: 'public', tone: 'emerald' },
        { label: 'Travel & Utility', to: '/shop/travel-utility', icon: 'flight_takeoff', tone: 'sky' },
        { label: 'Accessories', to: '/shop/accessories', icon: 'watch', tone: 'pink' },
      ],
    },
    departments: {
      eyebrow: 'Curated Departments',
      title: 'Find The Carry Designed For Your Routine',
      // The first three show as tall cards, the rest as wide cards.
      cards: [
        { to: '/men', label: 'Men', eyebrow: 'Masculine craft', text: 'Briefcases, laptop bags, wallets & weekenders', image: '/uploads/seed/duffle-tan.jpg', tag: 'Office to weekend', tone: 'sky' },
        { to: '/women', label: 'Women', eyebrow: 'Sculptural luxury', text: 'Handbags, work totes, crossbody & clutches', image: '/uploads/seed/tote-teal.jpg', tag: 'Work & evening', tone: 'rose' },
        { to: '/universal', label: 'Universal', eyebrow: 'Made for everyone', text: 'Backpacks, daily carry & travel gear for everyone', image: '/uploads/seed/apex-navy.jpg', tag: 'Everyday carry', tone: 'emerald' },
        { to: '/shop/travel-utility', label: 'Travel & Utility', eyebrow: 'Transit ready', text: 'Cabin spinners, check-in trolleys, duffles & toiletry kits', image: '/uploads/seed/cabin-hardshell.jpg', tag: 'Cabin & check-in', tone: 'blue' },
        { to: '/shop/accessories', label: 'Accessories', eyebrow: 'Small essentials', text: 'Leather wallets, RFID cardholders, passport sleeves & cable folios', image: '/uploads/seed/wallet-onyx.jpg', tag: 'Wallets & organisers', tone: 'pink' },
      ],
    },
    rails: [
      { eyebrow: 'Handpicked', icon: 'diamond', tone: 'indigo', title: 'Featured products', source: 'featured', category: '', link: '/shop?featured=true' },
      { eyebrow: 'Just landed', icon: 'rocket_launch', tone: 'violet', title: 'New arrivals', source: 'newArrivals', category: '', link: '/shop?newArrival=true&sort=newest' },
      { eyebrow: 'Customer favourites', icon: 'favorite', tone: 'rose', title: 'Best sellers', source: 'bestSellers', category: '', link: '/shop?bestseller=true&sort=bestseller' },
      { eyebrow: 'Transit ready', icon: 'flight_takeoff', tone: 'sky', title: 'Travel & Utility', source: 'category', category: 'travel-utility', link: '/shop/travel-utility' },
      { eyebrow: 'Everyday accents', icon: 'watch', tone: 'pink', title: 'Accessories', source: 'category', category: 'accessories', link: '/shop/accessories' },
    ],
    spinPromo: { title: 'Spin the wheel for a daily discount', text: 'One spin a day — win a personal coupon for your next order.', button: 'Spin now' },
    values: {
      eyebrow: 'Our promise',
      title: 'Why choose WILDTANE',
      items: [
        { icon: 'workspace_premium', title: 'Premium Quality', text: 'Sturdy materials, strong stitching and dependable zips and hardware, checked before every bag ships.' },
        { icon: 'auto_awesome', title: 'Stylish Designs', text: 'Clean, modern shapes that look as good at the office as they do on a weekend away.' },
        { icon: 'verified_user', title: 'Secure Shopping', text: 'Encrypted checkout, verified accounts and trusted payment options, including cash on delivery.' },
        { icon: 'local_shipping', title: 'Fast Delivery', text: 'Orders are packed promptly and tracked from our door to yours, with live status in your account.' },
        { icon: 'support_agent', title: 'Customer Support', text: 'Real people ready to help with sizing, orders, returns and anything in between.' },
      ],
    },
    sustainability: {
      badge: 'Conscious choices',
      title: 'Built to last, packed with care',
      text: 'Durable bags you keep for years, and packaging we keep simple. Read how we work on materials, packaging and our community.',
      button: 'Sustainability & CSR',
      to: '/sustainability',
    },
    editorial: {
      eyebrow: 'From the journal',
      title: 'Crafted for the Journey',
      text: 'Packing guides, care tips and the thinking behind our designs.',
      // Press quotes: only add real, published coverage you can link to.
      press: [],
      standards: [
        { icon: 'flight_takeoff', title: 'Cabin-friendly sizes', desc: 'Sizes and dimensions are listed on every product so you can check your airline’s limits.' },
        { icon: 'water_drop', title: 'Weather-ready fabrics', desc: 'Water-resistant fabrics and coated zips on our travel and commuter ranges.' },
        { icon: 'health_and_safety', title: 'Reinforced stitching', desc: 'Stress points are reinforced so straps and handles hold up to daily use.' },
        { icon: 'verified', title: '7-day returns', desc: 'Not right? Return or exchange within 7 days of delivery, with doorstep pickup.' },
      ],
    },
    contact: {
      items: [
        { icon: 'support_agent', title: 'Talk to us', text: 'Questions about a bag or an order?', to: '/contact', cta: 'Contact us', tone: 'sky' },
        { icon: 'corporate_fare', title: 'Corporate & bulk', text: 'Branded bags for teams and events.', to: '/corporate', cta: 'Get a quote', tone: 'indigo' },
        { icon: 'assignment_return', title: 'Easy returns', text: 'Read how returns and replacements work.', to: '/return-policy', cta: 'Return policy', tone: 'emerald' },
      ],
    },
    about: {
      badge: 'Architectural Carry',
      title: 'Bags, Backpacks & Travel Gear by WILDTANE',
      text: 'Shop laptop backpacks, structured leather handbags, totes, cabin luggage, duffles, and accessories for men, women, and everyone. Every order is tracked to your doorstep across India with 7-day returns, cash on delivery, and real customer support.',
    },
  },
  mobile: {
    sections: MOBILE_SECTIONS.map(([key]) => ({ key, visible: true })),
    heroSlides: [
      { title: 'NEW SEASON CARRY', subtitle: 'Backpacks, totes & travel gear', badge: 'JUST IN', tone: 'rose', to: '/shop?newArrival=true&sort=newest', image: '/uploads/seed/terminal-traveler.jpg' },
      { title: 'TECH BACKPACKS', subtitle: 'Padded laptop sleeves • Daily commute', badge: 'POPULAR', tone: 'indigo', to: '/shop/backpacks', image: '/uploads/seed/catalog/trekpack-sun.jpg' },
      { title: 'CABIN & TRAVEL GEAR', subtitle: 'Hardshell spinners & duffles', badge: 'TRAVEL', tone: 'emerald', to: '/shop/cabin-and-check-in-luggage', image: '/uploads/seed/catalog/cabin-emerald-teal.jpg' },
    ],
    deal: { title: 'Top Picks', subtitle: 'Handpicked by our team', link: '/shop?featured=true' },
    values: [
      { icon: 'local_shipping', text: 'Free Delivery' },
      { icon: 'payments', text: 'Cash On Delivery' },
      { icon: 'assignment_return', text: '7-Day Return' },
      { icon: 'lock', text: 'Secure Checkout' },
    ],
    rails: [
      { title: 'Most Loved • Best Sellers', subtitle: 'What other shoppers are buying', source: 'bestSellers', category: '', link: '/shop?bestseller=true' },
      { title: 'Travel & Utility', subtitle: 'Hardshell spinners, duffles & wash kits', source: 'category', category: 'travel-utility', link: '/shop/travel-utility' },
      { title: 'Accessories • Everyday Accents', subtitle: 'Leather wallets, RFID cardholders & cable folios', source: 'category', category: 'accessories', link: '/shop/accessories' },
      { title: 'Just Landed • New In', subtitle: 'The latest additions', source: 'newArrivals', category: '', link: '/shop?newArrival=true' },
    ],
    assurance: { title: 'WILDTANE Promise', text: '7-day returns • Cash on delivery • Real support' },
  },
};

export const BUILTIN_FOOTER = {
  columns: [
    {
      title: 'Shop',
      links: [
        { to: '/men', label: 'Men' },
        { to: '/women', label: 'Women' },
        { to: '/universal', label: 'Universal' },
        { to: '/shop/travel-utility', label: 'Travel & Utility' },
        { to: '/shop/accessories', label: 'Accessories' },
        { to: '/shop?newArrival=true&sort=newest', label: 'New Arrivals' },
        { to: '/shop?bestseller=true&sort=bestseller', label: 'Best Sellers' },
        { to: '/offers', label: 'Offers' },
      ],
    },
    {
      title: 'About',
      links: [
        { to: '/contact', label: 'Contact Us' },
        { to: '/about', label: 'About Us' },
        { to: '/sustainability', label: 'Sustainability & CSR' },
        { to: '/corporate', label: 'Corporate Orders' },
        { to: '/blog', label: 'Journal' },
        { to: '/csr-policy', label: 'CSR Policy' },
      ],
    },
    {
      title: 'Help',
      links: [
        { to: '/track', label: 'Track Order' },
        { to: '/returns-exchange', label: 'Returns & Exchange' },
        { to: '/help#payments', label: 'Payments' },
        { to: '/shipping-policy', label: 'Shipping' },
        { to: '/return-policy#order-cancellation', label: 'Cancellation & Returns' },
        { to: '/faq', label: 'FAQ' },
        { to: '/help', label: 'Help Centre' },
      ],
    },
    {
      title: 'Consumer Policy',
      links: [
        { to: '/return-policy', label: 'Return Policy' },
        { to: '/terms-and-conditions', label: 'Terms of Use' },
        { to: '/privacy-policy', label: 'Privacy' },
        { to: '/privacy-policy#grievance-officer', label: 'Grievance Redressal' },
        { to: '/policies', label: 'All Policies' },
      ],
    },
  ],
};

/** Every built-in section key is kept: new ones (added in a later release) appear at the end, switched on. */
function withAllSections(saved, builtin) {
  if (!Array.isArray(saved) || !saved.length) return builtin;
  const known = new Set(builtin.map((s) => s.key));
  const list = saved.filter((s) => known.has(s.key));
  const have = new Set(list.map((s) => s.key));
  return [...list, ...builtin.filter((s) => !have.has(s.key))];
}

/** Admin values win key by key; anything they never set comes from the built-in content. */
export function mergeHomepage(saved) {
  const out = structuredClone(BUILTIN_HOMEPAGE);
  for (const view of ['desktop', 'mobile']) {
    const s = saved?.[view];
    if (!s || typeof s !== 'object') continue;
    for (const [k, v] of Object.entries(s)) {
      if (v === undefined || v === null) continue;
      if (k === 'sections') out[view].sections = withAllSections(v, out[view].sections);
      else if (Array.isArray(v) || typeof v !== 'object') out[view][k] = v;
      else out[view][k] = { ...out[view][k], ...v };
    }
  }
  return out;
}

export function mergeFooter(saved) {
  return saved?.columns?.length ? { ...BUILTIN_FOOTER, ...saved } : BUILTIN_FOOTER;
}

export function useHomepage() {
  const { data: config } = useConfig();
  return mergeHomepage(config?.homepage);
}

export function useFooterContent() {
  const { data: config } = useConfig();
  return mergeFooter(config?.footer);
}

/** Section switch for a homepage view: `on('hero')`. */
export const sectionOn = (sections, key) => sections.find((s) => s.key === key)?.visible !== false;
