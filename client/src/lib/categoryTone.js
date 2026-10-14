// Each kind of product gets a colour taken from what it is usually made of, so shoppers
// can tell luggage, leather goods, keychains etc. apart at a glance. No yellow/amber/gold.
// Class strings are written out in full so Tailwind keeps them.

const TONES = {
  // Hard-shell luggage, trunks, weekenders: travel navy.
  navy: {
    grad: 'from-blue-700 via-sky-500 to-indigo-600',
    tint: 'bg-blue-600/10',
    ring: 'ring-blue-600/40',
    ringOn: 'ring-blue-700',
    solid: 'bg-blue-800 text-white border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    dot: 'bg-blue-700',
    icon: 'luggage',
  },
  // Leather wallets, briefcases, card holders: cognac brown.
  leather: {
    grad: 'from-orange-900 via-orange-600 to-rose-700',
    tint: 'bg-orange-900/10',
    ring: 'ring-orange-800/40',
    ringOn: 'ring-orange-800',
    solid: 'bg-orange-900 text-white border-orange-900',
    text: 'text-orange-900 dark:text-orange-300',
    dot: 'bg-orange-800',
    icon: 'wallet',
  },
  // Keychains and metal hardware: brushed steel.
  steel: {
    grad: 'from-zinc-600 via-zinc-400 to-slate-600',
    tint: 'bg-zinc-500/15',
    ring: 'ring-zinc-500/50',
    ringOn: 'ring-zinc-600',
    solid: 'bg-zinc-700 text-white border-zinc-700',
    text: 'text-zinc-700 dark:text-zinc-300',
    dot: 'bg-zinc-500',
    icon: 'key',
  },
  // Handbags, clutches, totes: wine rose.
  rose: {
    grad: 'from-rose-600 via-pink-500 to-fuchsia-600',
    tint: 'bg-rose-600/10',
    ring: 'ring-rose-600/40',
    ringOn: 'ring-rose-600',
    solid: 'bg-rose-700 text-white border-rose-700',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-600',
    icon: 'shopping_bag',
  },
  // Backpacks and outdoor packs: forest green.
  forest: {
    grad: 'from-green-800 via-emerald-500 to-teal-600',
    tint: 'bg-green-700/10',
    ring: 'ring-green-700/40',
    ringOn: 'ring-green-700',
    solid: 'bg-green-800 text-white border-green-800',
    text: 'text-green-800 dark:text-green-300',
    dot: 'bg-green-700',
    icon: 'backpack',
  },
  // Slings and belt bags: teal nylon.
  teal: {
    grad: 'from-teal-700 via-cyan-500 to-sky-600',
    tint: 'bg-teal-600/10',
    ring: 'ring-teal-600/40',
    ringOn: 'ring-teal-600',
    solid: 'bg-teal-700 text-white border-teal-700',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-600',
    icon: 'styler',
  },
  // Straw, jute, canvas: natural stone.
  straw: {
    grad: 'from-stone-600 via-stone-400 to-orange-700',
    tint: 'bg-stone-500/15',
    ring: 'ring-stone-500/50',
    ringOn: 'ring-stone-600',
    solid: 'bg-stone-600 text-white border-stone-600',
    text: 'text-stone-700 dark:text-stone-300',
    dot: 'bg-stone-500',
    icon: 'beach_access',
  },
  // Bottles, flasks, toiletry kits: water blue.
  water: {
    grad: 'from-sky-600 via-cyan-400 to-blue-600',
    tint: 'bg-sky-500/10',
    ring: 'ring-sky-500/40',
    ringOn: 'ring-sky-600',
    solid: 'bg-sky-700 text-white border-sky-700',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    icon: 'water_drop',
  },
  // Laptop and tech gear: graphite.
  tech: {
    grad: 'from-slate-800 via-slate-500 to-indigo-700',
    tint: 'bg-slate-600/10',
    ring: 'ring-slate-600/40',
    ringOn: 'ring-slate-700',
    solid: 'bg-slate-800 text-white border-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-600',
    icon: 'laptop_mac',
  },
  // Organisers, pouches, comfort: soft violet.
  violet: {
    grad: 'from-violet-700 via-purple-500 to-pink-600',
    tint: 'bg-violet-600/10',
    ring: 'ring-violet-600/40',
    ringOn: 'ring-violet-600',
    solid: 'bg-violet-700 text-white border-violet-700',
    text: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-600',
    icon: 'inventory_2',
  },
  // Eyewear and passport covers: indigo.
  indigo: {
    grad: 'from-indigo-700 via-blue-500 to-violet-600',
    tint: 'bg-indigo-600/10',
    ring: 'ring-indigo-600/40',
    ringOn: 'ring-indigo-600',
    solid: 'bg-indigo-700 text-white border-indigo-700',
    text: 'text-indigo-700 dark:text-indigo-300',
    dot: 'bg-indigo-600',
    icon: 'eyeglasses',
  },
};

// Most specific words first ("laptop bags" is tech, not a generic bag).
const RULES = [
  [/key|fob/, 'steel', 'key'],
  [/luggage tag|tag/, 'navy', 'sell'],
  [/luggage|cabin|trolley|suitcase|trunk|hardshell/, 'navy', 'luggage'],
  [/laptop|tech|sleeve|cable|camera/, 'tech', 'laptop_mac'],
  [/passport/, 'indigo', 'badge'],
  [/eyewear|glasses|sunglass/, 'indigo', 'eyeglasses'],
  [/wallet|card|purse/, 'leather', 'wallet'],
  [/duffle|duffel/, 'leather', 'luggage'],
  [/brief|office|folio|messenger|leather/, 'leather', 'work'],
  [/straw|beach|jute|raffia|wicker|kraft|canvas/, 'straw', 'beach_access'],
  [/hydration|bottle|flask/, 'water', 'water_drop'],
  [/toiletry|dopp|wash/, 'water', 'soap'],
  [/backpack|daypack|rucksack|commuter|waterproof|trail|outdoor/, 'forest', 'backpack'],
  [/sling|belt|waist|crossbody/, 'teal', 'styler'],
  [/hand ?bag|clutch|tote|satchel|shopper|women/, 'rose', 'shopping_bag'],
  [/organi[sz]er|cube|pouch|comfort|pillow|accessor/, 'violet', 'inventory_2'],
  [/travel|weekender|holdall/, 'navy', 'flight'],
  [/bag/, 'rose', 'shopping_bag'],
];

const FALLBACK = ['rose', 'navy', 'forest', 'teal', 'violet', 'indigo', 'leather', 'water'];

/**
 * Colour classes for a category or subcategory.
 * Pass the category object (or its name); returns { tint, ring, solid, text, dot, icon }.
 */
export function categoryTone(cat) {
  const label = (typeof cat === 'string' ? cat : `${cat?.name || ''} ${cat?.slug || ''}`).toLowerCase();
  const hit = RULES.find(([rx]) => rx.test(label));
  if (hit) return { ...TONES[hit[1]], icon: hit[2] };
  // Unknown (admin-made) categories still get a steady colour from their name.
  let h = 0;
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[FALLBACK[h % FALLBACK.length]];
}

/** Tones for the non-category shortcuts (All, Men, Women, Universal, Travel, Accessories, Offers). */
export const TAB_TONES = {
  all: TONES.tech,
  men: TONES.navy,
  women: TONES.rose,
  universal: TONES.teal,
  unisex: TONES.teal,
  'travel-utility': TONES.forest,
  travel: TONES.forest,
  accessories: TONES.leather,
  offers: TONES.forest,
  bags: TONES.leather,
};

/** Tone for a product: its subcategory first, then its top category. */
export function productTone(product) {
  const sub = product?.subcategory?.name ? product.subcategory : null;
  return categoryTone(sub || product?.category || product?.name || '');
}
