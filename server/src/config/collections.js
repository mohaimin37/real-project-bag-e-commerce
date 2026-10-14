/**
 * Curated collections (separate from the category tree). Each is a saved product filter over real
 * product data — purpose, occasion, tags or flags — never a hand-picked list. A collection is only
 * shown when it matches at least one visible product, so nothing is advertised that can't be bought.
 *
 * Source: the "Collections" lists in the WILDTANE category-architecture brief (recommended additions,
 * not part of the original blueprint PDF). To fill one, tag products in Admin → Products
 * (purposes / occasions / tags) — no code change needed.
 *
 * `audiences`: which landing pages show it ('women', 'men', or both). `query`: catalogue query params.
 */
export const COLLECTIONS = [
  { key: 'everyday', label: 'Everyday Essentials', audiences: ['women', 'men'], query: { purpose: 'everyday' } },
  { key: 'office', label: 'Office & Workwear', audiences: ['women'], query: { purpose: 'work' } },
  { key: 'office-essentials', label: 'Office Essentials', audiences: ['men'], query: { purpose: 'work' } },
  { key: 'business', label: 'Business Professional', audiences: ['men'], query: { purpose: 'business' } },
  { key: 'casual', label: 'Casual Outings', audiences: ['women'], query: { occasion: 'casual' } },
  { key: 'party', label: 'Party & Evening', audiences: ['women'], query: { occasion: 'party' } },
  { key: 'festive', label: 'Wedding & Festive', audiences: ['women'], query: { occasion: 'wedding,festive' } },
  { key: 'college', label: 'College Essentials', audiences: ['men', 'women'], query: { purpose: 'college' } },
  { key: 'travel', label: 'Travel Essentials', audiences: ['women', 'men'], query: { purpose: 'travel' } },
  { key: 'gym', label: 'Gym & Fitness', audiences: ['men'], query: { purpose: 'gym' } },
  { key: 'commute', label: 'Everyday Carry', audiences: ['men'], query: { purpose: 'transit' } },
  { key: 'minimalist', label: 'Minimalist Collection', audiences: ['women', 'men'], query: { tag: 'minimalist' } },
  { key: 'premium', label: 'Premium Collection', audiences: ['women', 'men'], query: { tag: 'premium' } },
  { key: 'new', label: 'New Arrivals', audiences: ['women', 'men'], query: { newArrival: 'true', sort: 'newest' } },
  { key: 'bestsellers', label: 'Bestsellers', audiences: ['women', 'men'], query: { bestseller: 'true', sort: 'bestseller' } },
  { key: 'sale', label: 'Sale', audiences: ['women', 'men'], query: { onSale: 'true', sort: 'discount' } },
];
