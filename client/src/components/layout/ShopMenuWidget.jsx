import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { setShopModalOpen } from '../../store';
import { useCategories } from '../../hooks/useStore';
import { api } from '../../lib/api';
import { cn, imgUrl } from '../../lib/format';
import { categoryTone } from '../../lib/categoryTone';
import { Icon, Img, Spinner } from '../ui';
import { GRID_COLS, ProductCard, ProductCardSkeleton } from '../product';

// ── 1. Department Personas with Rich Visuals & Badges ──
export const SHOP_DEPARTMENTS = [
  {
    key: 'men',
    label: "Men's Architecture",
    tagline: 'Briefcases, laptop bags, wallets & travel weekenders',
    badge: '1680D & Leather',
    to: '/men',
    img: '/uploads/seed/briefcase-black.jpg',
    icon: 'man',
    gradient: 'from-sky-500/15 via-blue-500/10 to-indigo-600/15',
    border: 'border-sky-500/30 hover:border-sky-500/60',
    accentText: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    highlights: ['Briefcases', 'Laptop Bags', 'Messengers', 'Wallets', 'Weekenders'],
  },
  {
    key: 'women',
    label: "Women's Luxe",
    tagline: 'Sculpted work totes, structured handbags & clutches',
    badge: 'Italian Saffiano',
    to: '/women',
    img: '/uploads/seed/handbag-rose.jpg',
    icon: 'woman',
    gradient: 'from-rose-500/15 via-pink-500/10 to-amber-500/15',
    border: 'border-rose-500/30 hover:border-rose-500/60',
    accentText: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    highlights: ['Luxury Handbags', 'Work Totes', 'Crossbody Slings', 'Clutches', 'Shoulder Bags'],
  },
  {
    key: 'universal',
    label: 'Universal & Commute',
    tagline: 'Aerospace backpacks, tech sleeves & everyday carry',
    badge: 'Airport Friendly',
    to: '/universal',
    img: '/uploads/seed/apex-navy.jpg',
    icon: 'public',
    gradient: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    highlights: ['Tech Backpacks', 'Cabin Luggage', 'Daypacks', 'Laptop Sleeves'],
  },
  {
    key: 'travel',
    label: 'Travel & Utility',
    tagline: 'Hardshell spinners, weekender duffles & organizers',
    badge: 'Hinomoto 360°',
    to: '/shop/travel-utility',
    img: '/uploads/seed/cabin-hardshell.jpg',
    icon: 'flight_takeoff',
    gradient: 'from-amber-500/15 via-orange-500/10 to-yellow-500/15',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    accentText: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    highlights: ['Trolley Luggage', 'Overnight Duffles', 'Packing Cubes', 'Tech Kits'],
  },
  {
    key: 'accessories',
    label: 'Leather & Accessories',
    tagline: 'RFID protection cardholders, leather belts & toiletry kits',
    badge: 'Handcrafted',
    to: '/shop/accessories',
    img: '/uploads/seed/cable-pouch.jpg',
    icon: 'watch',
    gradient: 'from-purple-500/15 via-violet-500/10 to-indigo-500/15',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    accentText: 'text-purple-600 dark:text-purple-400',
    dot: 'bg-purple-500',
    highlights: ['RFID Wallets', 'Passport Wallets', 'Dopp Kits', 'Leather Belts', 'Laptop Sleeves'],
  },
];

// ── 2. Interactive "Shop by Budget" Widget Brackets ──
export const SHOP_BUDGET_WIDGETS = [
  {
    label: 'Under ₹1,499',
    sub: 'Everyday Essentials & Wallets',
    to: '/shop?maxPrice=1499',
    icon: 'payments',
    badge: 'Budget Pick',
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/25 hover:border-emerald-500/60',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    label: '₹1,500 – ₹3,499',
    sub: 'Commuter Daypacks & Slings',
    to: '/shop?minPrice=1500&maxPrice=3499',
    icon: 'backpack',
    badge: 'Most Popular',
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    border: 'border-blue-500/25 hover:border-blue-500/60',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    label: '₹3,500 – ₹7,999',
    sub: 'Executive Briefcases & Duffles',
    to: '/shop?minPrice=3500&maxPrice=7999',
    icon: 'business_center',
    badge: 'Premium Leather',
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    border: 'border-amber-500/25 hover:border-amber-500/60',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  {
    label: '₹8,000+ Luxury',
    sub: 'Aluminum Luggage & Heritage Carry',
    to: '/shop?minPrice=8000',
    icon: 'diamond',
    badge: 'Luxury Reserve',
    gradient: 'from-purple-500/10 via-rose-500/5 to-transparent',
    border: 'border-purple-500/25 hover:border-purple-500/60',
    textColor: 'text-purple-700 dark:text-purple-300',
  },
];

// ── 3. Live Hot Drops & Trend Radar Chips Widget ──
export const SHOP_TREND_RADAR = [
  {
    label: 'Bestsellers',
    sub: 'Most coveted carry',
    icon: 'local_fire_department',
    to: '/shop?bestseller=true&sort=bestseller',
    badge: 'HOT',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 hover:border-rose-500/50',
    pulse: true,
  },
  {
    label: 'New Releases',
    sub: 'Fresh season drops',
    icon: 'auto_awesome',
    to: '/shop?newArrival=true&sort=newest',
    badge: '2026 DROP',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 hover:border-amber-500/50',
  },
  {
    label: 'Up to 50% Off',
    sub: 'Special promotion deals',
    icon: 'sell',
    to: '/offers',
    badge: 'SAVINGS',
    color: 'bg-rose-600/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:border-rose-500/60',
    pulse: true,
  },
  {
    label: '4.5★+ Top Rated',
    sub: 'Commuter verified quality',
    icon: 'star',
    to: '/shop?rating=4.5&sort=highest-rated',
    badge: 'VERIFIED',
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/25 hover:border-yellow-500/50',
  },
  {
    label: 'Waterproof Shield',
    sub: 'Weather-defying fabric',
    icon: 'water_drop',
    to: '/shop?q=Waterproof',
    badge: 'RAIN SAFE',
    color: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25 hover:border-sky-500/50',
  },
  {
    label: 'Fits 16" Laptop',
    sub: 'Padded tech sleeves',
    icon: 'laptop_mac',
    to: '/shop?q=Laptop',
    badge: 'TECH READY',
    color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 hover:border-indigo-500/50',
  },
  {
    label: 'TSA Cabin Luggage',
    sub: 'Airline approved carry-on',
    icon: 'flight_takeoff',
    to: '/shop?q=Cabin',
    badge: 'AIRPORT',
    color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 hover:border-teal-500/50',
  },
];

// ── 4. Curator's Pick / Live Spotlight Widget ──
export const SPOTLIGHT_DROP = {
  title: 'Apex Commuter Backpack 28L',
  category: 'Universal Travel & Commute',
  badge: 'CURATOR’S PICK',
  discount: '42% OFF',
  price: '₹3,499',
  originalPrice: '₹5,999',
  rating: '4.9',
  reviews: '142 reviews',
  img: '/uploads/seed/apex-navy.jpg',
  to: '/shop?q=Apex',
  features: ['180° Clamshell Access', '1680D Ballistic Nylon', 'Luggage Trolley Sleeve'],
};

/**
 * Desktop "Shop" nav button.
 * Clicking it opens the full screen shop showcase directly, without any yellow dot.
 */
export function ShopMegaMenu({ categories }) {
  const dispatch = useDispatch();

  return (
    <button
      type="button"
      onClick={() => dispatch(setShopModalOpen(true))}
      aria-label="Open Full Screen Shop"
      className="h-8 px-3.5 inline-flex items-center gap-1.5 rounded-full text-[13px] font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer whitespace-nowrap select-none"
    >
      <Icon name="grid_view" className="text-[16px] text-secondary" />
      <span>Shop</span>
      <Icon name="expand_more" className="text-[16px] text-outline opacity-70" />
    </button>
  );
}

/**
 * FULL SCREEN SHOP SHOWCASE MODAL
 * Opens when someone clicks "Shop" in desktop header, mobile header, or bottom navigation.
 * Showcases everything (departments, categories, budget brackets, trend radar, spotlight)
 * and has a dedicated "Explore All" tab where ALL products/items appear!
 */
export function ShopDrawerModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = useSelector((s) => s.ui.shopModalOpen);
  const { data: categories } = useCategories();

  // Tabs: 'showcase' (Showcase Everything), 'explore' (Explore All Items), 'departments', 'budget', 'trends'
  const [activeTab, setActiveTab] = useState('showcase');
  const [exploreCategory, setExploreCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  const close = () => dispatch(setShopModalOpen(false));

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKeyDown = (e) => {
        if (e.key === 'Escape') close();
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener('keydown', onKeyDown);
      };
    }
  }, [open]);

  // Query all products for the "Explore All" view
  const productsQuery = useQuery({
    queryKey: ['fullscreen-shop-products', { sort: sortOrder, category: exploreCategory, q: searchQuery, inStock: inStockOnly, onSale: onSaleOnly }],
    queryFn: () => {
      const q = { limit: 48, sort: sortOrder };
      if (exploreCategory) q.category = exploreCategory;
      if (searchQuery) q.q = searchQuery;
      if (inStockOnly) q.inStock = 'true';
      if (onSaleOnly) q.onSale = 'true';
      return api.products(q);
    },
    enabled: open && activeTab === 'explore',
    staleTime: 60 * 1000,
  });

  const productsList = useMemo(() => productsQuery.data?.items || [], [productsQuery.data]);
  const totalProducts = productsQuery.data?.total ?? productsList.length;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="WILDTANE Full Screen Shop"
      className="fixed inset-0 z-[100] flex flex-col bg-surface/98 backdrop-blur-2xl text-on-surface animate-fade-in overflow-hidden"
    >
      {/* ── 1. FULL-SCREEN TOP NAVIGATION HEADER BAR ── */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-surface-container-high/80 shrink-0">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Brand & Title */}
          <Link
            to="/"
            onClick={close}
            className="flex items-center gap-2.5 min-w-0 group hover:opacity-85 transition-opacity cursor-pointer"
            aria-label="Return to WILDTANE Home"
          >
            <span className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Icon name="grid_view" className="text-[20px]" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-serif tracking-[0.14em] font-black text-[15px] sm:text-[17px] text-on-surface uppercase leading-none group-hover:text-secondary transition-colors">
                  WILDTANE
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 uppercase tracking-wider hidden sm:inline-flex">
                  Shop Showcase
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant truncate hidden xs:block mt-0.5">
                Modern Luxury Carry • Architectural Design
              </p>
            </div>
          </Link>

          {/* Tab Navigation Switcher */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30 overflow-x-auto scrollbar-none max-w-[55vw] sm:max-w-none">
            <button
              type="button"
              onClick={() => setActiveTab('showcase')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                activeTab === 'showcase'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="diamond" className="text-[15px] text-secondary" />
              <span>Showcase Everything</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                activeTab === 'explore'
                  ? 'bg-secondary text-on-secondary shadow-md font-black ring-1 ring-secondary/50'
                  : 'text-secondary hover:bg-secondary/10 font-extrabold'
              )}
            >
              <Icon name="explore" className="text-[15px]" />
              <span>Explore All Items</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                activeTab === 'explore' ? 'bg-on-secondary/20 text-on-secondary' : 'bg-secondary/15 text-secondary'
              )}>
                ALL
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('departments')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 hidden md:flex',
                activeTab === 'departments'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="category" className="text-[15px]" />
              <span>Departments</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('budget')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 hidden lg:flex',
                activeTab === 'budget'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="payments" className="text-[15px]" />
              <span>By Budget</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 hidden lg:flex',
                activeTab === 'trends'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="local_fire_department" className="text-[15px] text-rose-500" />
              <span>Trend Radar</span>
            </button>
          </div>

          {/* Right Header Controls: Go to Shop page & Close Modal */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/shop"
              onClick={close}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-all"
            >
              <span>Full Store</span>
              <Icon name="open_in_new" className="text-[14px] text-outline" />
            </Link>

            <button
              type="button"
              onClick={close}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface active:scale-90 transition-transform shadow-2xs"
              aria-label="Close Shop full screen"
              title="Close (Esc)"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. FULL-SCREEN SCROLLABLE CONTENT BODY ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6 w-full max-w-[1920px] mx-auto">
        
        {/* ═════════════════════════════════════════════════════════════════
            TAB A: EXPLORE ALL ITEMS (WHEN TAB ON EXPLORE ALL ITEM SHOULD COME)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'explore' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Explore Banner & Filter Header */}
            <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-secondary/15 via-surface-container-low to-surface-container-lowest border border-secondary/25 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-secondary text-on-secondary text-[11px] font-extrabold uppercase tracking-wider mb-2">
                    <Icon name="explore" className="text-[14px]" /> All Items Catalog
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-on-surface">
                    Explore Every WILDTANE Item
                  </h1>
                  <p className="text-[12.5px] sm:text-[13.5px] text-on-surface-variant max-w-2xl mt-1">
                    Architectural backpacks, full-grain briefcases, sculpted work totes, travel luggage and minimalist accessories.
                  </p>
                </div>

                {/* Instant In-Modal Search Bar */}
                <div className="flex items-center gap-2 w-full md:w-80">
                  <div className="relative flex-1">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter all items..."
                      className="w-full h-10 pl-9 pr-8 rounded-xl bg-surface border border-outline-variant/40 text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/50"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      >
                        <Icon name="close" className="text-[16px]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Quick Filter Pills Strip */}
              <div className="mt-4 pt-3.5 border-t border-outline-variant/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                <button
                  type="button"
                  onClick={() => setExploreCategory('')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-[12px] font-bold shrink-0 transition-all cursor-pointer',
                    !exploreCategory
                      ? 'bg-on-surface text-surface shadow-xs'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  )}
                >
                  All Categories
                </button>
                {(categories || []).map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setExploreCategory(exploreCategory === cat.slug ? '' : cat.slug)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[12px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5',
                      exploreCategory === cat.slug
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', categoryTone(cat).dot)} />
                    <span>{cat.name}</span>
                    {cat.productCount > 0 && (
                      <span className="text-[10px] opacity-75">({cat.productCount})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Sort & Quick Toggles */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="font-bold text-outline uppercase tracking-wider text-[11px] mr-1">Sort:</span>
                  {[
                    ['featured', 'Featured'],
                    ['bestseller', 'Bestsellers'],
                    ['price-low', 'Price: Low to High'],
                    ['price-high', 'Price: High to Low'],
                    ['highest-rated', 'Top Rated'],
                    ['newest', 'Newest'],
                  ].map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSortOrder(val)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap cursor-pointer',
                        sortOrder === val
                          ? 'bg-on-surface text-surface font-bold'
                          : 'bg-surface hover:bg-surface-container text-on-surface-variant'
                      )}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInStockOnly(!inStockOnly)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-[11.5px] font-bold flex items-center gap-1 transition-all',
                      inStockOnly
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-surface border-outline-variant/40 text-on-surface-variant'
                    )}
                  >
                    <Icon name="verified" className="text-[13px]" /> In Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnSaleOnly(!onSaleOnly)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-[11.5px] font-bold flex items-center gap-1 transition-all',
                      onSaleOnly
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-surface border-outline-variant/40 text-on-surface-variant'
                    )}
                  >
                    <Icon name="sell" className="text-[13px]" /> On Sale
                  </button>
                  <span className="text-[11.5px] font-bold text-outline ml-2">
                    {productsQuery.isLoading ? 'Loading...' : `${totalProducts} items found`}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Product Grid */}
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : productsList.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <span className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-3">
                  <Icon name="search_off" className="text-[32px]" />
                </span>
                <h3 className="text-lg font-bold text-on-surface">No products found</h3>
                <p className="text-sm text-outline mt-1 max-w-sm">
                  Try clearing your search query or category filter to explore all available carry pieces.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setExploreCategory('');
                    setInStockOnly(false);
                    setOnSaleOnly(false);
                  }}
                  className="mt-4 btn-primary text-xs px-4 py-2 rounded-xl"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {productsList.map((product) => (
                  <div key={product._id} onClick={close}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Footer link to full shop page */}
            <div className="pt-6 pb-10 text-center border-t border-surface-container-high/60">
              <Link
                to="/shop"
                onClick={close}
                className="btn-primary text-sm px-6 py-3 rounded-2xl inline-flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all"
              >
                <span>View Full Store & Filter Panel</span>
                <Icon name="arrow_forward" className="text-[17px]" />
              </Link>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB B: SHOWCASE EVERYTHING (IN SHOP SHOWCASE EVERYTHING)
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'showcase' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* HERO SHOWCASE BANNER */}
            <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-secondary/15 via-surface-container-low to-surface-container border border-secondary/30 shadow-lg">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-[11px] font-extrabold uppercase tracking-wider mb-3">
                    <Icon name="auto_awesome" className="text-[14px]" /> Full Catalog Showcase
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-on-surface tracking-tight leading-tight">
                    Architectural Carry For Modern Explorers
                  </h1>
                  <p className="mt-2 text-[13px] sm:text-[14.5px] text-on-surface-variant leading-relaxed">
                    Explore handcrafted leather briefcases, all-weather commuting backpacks, structured luxury handbags, and Hinomoto-wheeled cabin luggage.
                  </p>
                </div>

                {/* Instant Action CTA: Tab to Explore All Items! */}
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('explore')}
                    className="btn-primary text-[13.5px] px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer font-bold"
                  >
                    <Icon name="explore" className="text-[18px]" />
                    <span>Tab to Explore All Items</span>
                  </button>
                  <Link
                    to="/shop"
                    onClick={close}
                    className="btn-tonal text-[13px] px-5 py-3.5 rounded-2xl flex items-center justify-center gap-1.5"
                  >
                    <span>Open Shop Page</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>
                </div>
              </div>
            </div>

            {/* WIDGET 1: Curated Departments Grid */}
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                    <Icon name="category" className="text-[15px]" />
                  </span>
                  <h2 className="text-[15px] sm:text-[17px] font-black text-on-surface">
                    Curated Departments
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('departments')}
                  className="text-[12px] font-bold text-secondary hover:underline flex items-center gap-0.5"
                >
                  View All Departments <Icon name="chevron_right" className="text-[14px]" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
                {SHOP_DEPARTMENTS.map((dept) => (
                  <Link
                    key={dept.key}
                    to={dept.to}
                    onClick={close}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border p-3.5 bg-gradient-to-br transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between min-h-[170px]',
                      dept.gradient,
                      dept.border
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs', dept.dot)}>
                          <Icon name={dept.icon} className="text-[20px]" />
                        </span>
                        <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-surface/85 border border-outline-variant/30 text-on-surface">
                          {dept.badge}
                        </span>
                      </div>
                      <h3 className={cn('text-[14px] font-extrabold tracking-tight', dept.accentText)}>
                        {dept.label}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-1 leading-snug">
                        {dept.tagline}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-on-surface">
                      <span>Explore</span>
                      <Icon name="arrow_forward" className="text-[14px] text-outline group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* WIDGET 2: Shop by Budget Strips */}
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Icon name="payments" className="text-[15px]" />
                  </span>
                  <h2 className="text-[15px] sm:text-[17px] font-black text-on-surface">
                    Shop by Budget Brackets
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('budget')}
                  className="text-[12px] font-bold text-secondary hover:underline flex items-center gap-0.5"
                >
                  All Price Bands <Icon name="chevron_right" className="text-[14px]" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SHOP_BUDGET_WIDGETS.map((b) => (
                  <Link
                    key={b.label}
                    to={b.to}
                    onClick={close}
                    className={cn(
                      'p-3.5 rounded-2xl border flex flex-col justify-between transition-all hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br active:scale-98',
                      b.gradient,
                      b.border
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <Icon name={b.icon} className={cn('text-[22px]', b.textColor)} />
                      <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-surface/90 border border-outline-variant/30 text-on-surface">
                        {b.badge}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-[13.5px] font-extrabold text-on-surface">{b.label}</div>
                      <div className="text-[11px] text-on-surface-variant truncate mt-0.5">{b.sub}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* WIDGET 3: Hot Drops & Trend Radar */}
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center">
                    <Icon name="local_fire_department" className="text-[15px]" />
                  </span>
                  <h2 className="text-[15px] sm:text-[17px] font-black text-on-surface">
                    Trend Radar & Fast Filters
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className="text-[12px] font-bold text-secondary hover:underline flex items-center gap-0.5"
                >
                  Explore in Grid <Icon name="chevron_right" className="text-[14px]" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {SHOP_TREND_RADAR.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={close}
                    className={cn(
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[12px] font-bold border transition-all hover:scale-105 active:scale-95 shadow-xs',
                      item.color
                    )}
                  >
                    <Icon name={item.icon} className="text-[16px]" />
                    <span>{item.label}</span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-surface/80 border border-outline-variant/30 font-extrabold">
                      {item.badge}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* WIDGET 4: Visual Categories Grid & Curator Spotlight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Visual Categories Grid */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] sm:text-[16px] font-black text-on-surface flex items-center gap-2">
                    <Icon name="style" className="text-[16px] text-secondary" /> Browse By Category
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {(categories || []).map((cat) => (
                    <Link
                      key={cat._id}
                      to={`/shop/${cat.slug}`}
                      onClick={close}
                      className={cn(
                        'flex items-center gap-2.5 p-2.5 rounded-2xl border border-outline-variant/30 hover:border-secondary/50 transition-all hover:shadow-xs active:scale-95',
                        categoryTone(cat).tint
                      )}
                    >
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', categoryTone(cat).dot)} />
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-[12px] font-bold truncate', categoryTone(cat).text)}>
                          {cat.name}
                        </div>
                        {cat.productCount > 0 && (
                          <div className="text-[10px] text-outline">
                            {cat.productCount} styles
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Curator Spotlight Drop Card */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[15px] sm:text-[16px] font-black text-on-surface flex items-center gap-2">
                    <Icon name="star" className="text-[16px] text-amber-500" /> Curator's Pick
                  </h2>
                </div>
                <div className="p-4 rounded-3xl border border-secondary/30 bg-gradient-to-br from-amber-500/10 via-surface-container-low to-surface-container shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {SPOTLIGHT_DROP.badge}
                    </span>
                    <span className="text-[11px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                      {SPOTLIGHT_DROP.discount}
                    </span>
                  </div>

                  <div className="flex gap-3.5 items-center">
                    <img
                      src={imgUrl(SPOTLIGHT_DROP.img, 140)}
                      alt={SPOTLIGHT_DROP.title}
                      className="w-18 h-18 rounded-2xl object-cover border border-outline-variant/30 shrink-0 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-black text-on-surface leading-snug line-clamp-2">
                        {SPOTLIGHT_DROP.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[14px] font-black text-on-surface">
                          {SPOTLIGHT_DROP.price}
                        </span>
                        <span className="text-[11px] text-outline line-through">
                          {SPOTLIGHT_DROP.originalPrice}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mt-1">
                        <Icon name="star" className="text-[13px] text-amber-500" />
                        <span>{SPOTLIGHT_DROP.rating}</span>
                        <span className="text-outline text-[10px]">({SPOTLIGHT_DROP.reviews})</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={SPOTLIGHT_DROP.to}
                    onClick={close}
                    className="mt-3.5 w-full btn-primary text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>View Spotlight Details</span>
                    <Icon name="arrow_forward" className="text-[13px]" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Micro-Perks Trust Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 pb-6 border-t border-surface-container-high/60">
              {[
                { icon: 'verified', title: '7-Day Home Trial', sub: 'No hassle returns' },
                { icon: 'local_shipping', title: 'Free Express Shipping', sub: 'Orders over ₹10,000' },
                { icon: 'eco', title: '100% Recycled Linings', sub: 'Eco-conscious carry' },
                { icon: 'handshake', title: 'Handcrafted in India', sub: 'Artisan master leather' },
              ].map((perk, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                  <Icon name={perk.icon} className="text-[20px] text-secondary shrink-0" />
                  <div>
                    <div className="text-[11.5px] font-bold text-on-surface">{perk.title}</div>
                    <div className="text-[10px] text-outline">{perk.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB C: DEPARTMENTS TAB
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'departments' && (
          <div className="space-y-4 max-w-5xl mx-auto animate-fade-in pb-10">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Curated Carry Departments</h2>
                <p className="text-xs text-on-surface-variant">Explore collections tailored by lifestyle and use case</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="btn-tonal text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1"
              >
                <Icon name="explore" className="text-[14px]" /> Explore All Items
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SHOP_DEPARTMENTS.map((dept) => (
                <div
                  key={dept.key}
                  className={cn(
                    'p-5 rounded-3xl border bg-gradient-to-br flex flex-col justify-between shadow-xs',
                    dept.gradient,
                    dept.border
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface/80 border border-outline-variant/30 text-on-surface">
                        {dept.badge}
                      </span>
                      <h3 className={cn('text-lg font-black mt-2', dept.accentText)}>{dept.label}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">{dept.tagline}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-black/10">
                      <img src={imgUrl(dept.img, 128)} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                    <div className="text-[11px] font-bold text-outline mb-2">Popular Styles:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {dept.highlights.map((h, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-surface/70 text-[10.5px] font-semibold text-on-surface">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={dept.to}
                    onClick={close}
                    className="mt-4 btn-primary text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>View {dept.label} Collection</span>
                    <Icon name="arrow_forward" className="text-[14px]" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB D: BUDGET EXPLORER TAB
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'budget' && (
          <div className="space-y-4 max-w-4xl mx-auto animate-fade-in pb-10">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Shop By Budget</h2>
                <p className="text-xs text-on-surface-variant">Find the perfect carry within your desired price range</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="btn-tonal text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1"
              >
                <Icon name="explore" className="text-[14px]" /> Explore All Items
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SHOP_BUDGET_WIDGETS.map((b) => (
                <Link
                  key={b.label}
                  to={b.to}
                  onClick={close}
                  className={cn(
                    'p-6 rounded-3xl border flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br',
                    b.gradient,
                    b.border
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-surface/80 flex items-center justify-center shadow-xs">
                      <Icon name={b.icon} className={cn('text-[26px]', b.textColor)} />
                    </span>
                    <span className="text-[10.5px] font-black px-2.5 py-0.5 rounded-full bg-surface border border-outline-variant/30 text-on-surface">
                      {b.badge}
                    </span>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-black text-on-surface">{b.label}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">{b.sub}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold text-secondary">
                    <span>Shop styles in this bracket</span>
                    <Icon name="arrow_forward" className="text-[15px]" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB E: TREND RADAR TAB
           ═════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trends' && (
          <div className="space-y-4 max-w-4xl mx-auto animate-fade-in pb-10">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/60">
              <div>
                <h2 className="text-xl font-bold text-on-surface">Trend Radar & Hot Filters</h2>
                <p className="text-xs text-on-surface-variant">Live collections shaped by traveler demand and commuting requirements</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="btn-tonal text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1"
              >
                <Icon name="explore" className="text-[14px]" /> Explore All Items
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {SHOP_TREND_RADAR.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={close}
                  className={cn(
                    'p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between min-h-[120px]',
                    item.color
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Icon name={item.icon} className="text-[22px]" />
                    <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-surface/80 border border-outline-variant/30 text-on-surface">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-black text-on-surface">{item.label}</h4>
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{item.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
