import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import GroupedProducts from '../GroupedProducts';
import { flattenTree } from '../../lib/directory';
import { setShopModalOpen } from '../../store';
import { useCategories, useConfig, useMoney } from '../../hooks/useStore';
import { api } from '../../lib/api';
import { cn, imgUrl, productImage } from '../../lib/format';
import { categoryTone } from '../../lib/categoryTone';
import { Icon } from '../ui';
import { ProductCardSkeleton } from '../product';

/**
 * Colour names the admin picks for Shop menu tiles (Admin → Settings → Shop menu).
 * Must match SHOWCASE_TONES in server/src/validators/content.validators.js. No yellow/gold.
 */
export const SHOWCASE_TONES = {
  sky: { gradient: 'from-sky-500/15 via-blue-500/10 to-indigo-600/15', border: 'border-sky-500/30 hover:border-sky-500/60', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25 hover:border-sky-500/50' },
  rose: { gradient: 'from-rose-500/15 via-pink-500/10 to-rose-500/15', border: 'border-rose-500/30 hover:border-rose-500/60', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 hover:border-rose-500/50' },
  emerald: { gradient: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15', border: 'border-emerald-500/30 hover:border-emerald-500/60', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:border-emerald-500/50' },
  purple: { gradient: 'from-purple-500/15 via-violet-500/10 to-indigo-500/15', border: 'border-purple-500/30 hover:border-purple-500/60', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500', chip: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 hover:border-purple-500/50' },
  blue: { gradient: 'from-blue-500/15 via-blue-500/5 to-transparent', border: 'border-blue-500/25 hover:border-blue-500/60', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 hover:border-blue-500/50' },
  indigo: { gradient: 'from-indigo-500/15 via-indigo-500/5 to-transparent', border: 'border-indigo-500/25 hover:border-indigo-500/60', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500', chip: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 hover:border-indigo-500/50' },
  teal: { gradient: 'from-teal-500/15 via-teal-500/5 to-transparent', border: 'border-teal-500/25 hover:border-teal-500/60', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', chip: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 hover:border-teal-500/50' },
  pink: { gradient: 'from-pink-500/15 via-pink-500/5 to-transparent', border: 'border-pink-500/25 hover:border-pink-500/60', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500', chip: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/25 hover:border-pink-500/50' },
  slate: { gradient: 'from-surface-container-high via-surface-container-low to-transparent', border: 'border-outline-variant/40 hover:border-outline', text: 'text-on-surface', dot: 'bg-on-surface-variant', chip: 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:border-outline' },
};
const tone = (t) => SHOWCASE_TONES[t] || SHOWCASE_TONES.slate;

/**
 * Built-in Shop menu content. Used until the admin customises it in Settings → Shop menu
 * (the admin editor starts from this too).
 */
export const BUILTIN_SHOWCASE = {
  departments: [
    { label: "Men's Architecture", sub: 'Briefcases, laptop bags, wallets & travel weekenders', badge: '1680D & Leather', to: '/men', img: '/uploads/seed/briefcase-black.jpg', icon: 'man', tone: 'sky', highlights: ['Briefcases', 'Laptop Bags', 'Messengers', 'Wallets', 'Weekenders'] },
    { label: "Women's Luxe", sub: 'Sculpted work totes, structured handbags & clutches', badge: 'Italian Saffiano', to: '/women', img: '/uploads/seed/handbag-rose.jpg', icon: 'woman', tone: 'rose', highlights: ['Luxury Handbags', 'Work Totes', 'Crossbody Slings', 'Clutches', 'Shoulder Bags'] },
    { label: 'Universal & Commute', sub: 'Backpacks, tech sleeves & everyday carry', badge: 'Airport Friendly', to: '/universal', img: '/uploads/seed/apex-navy.jpg', icon: 'public', tone: 'emerald', highlights: ['Tech Backpacks', 'Cabin Luggage', 'Daypacks', 'Laptop Sleeves'] },
    { label: 'Travel & Utility', sub: 'Hardshell spinners, weekender duffles & organizers', badge: 'Travel Ready', to: '/shop/travel-utility', img: '/uploads/seed/cabin-hardshell.jpg', icon: 'flight_takeoff', tone: 'pink', highlights: ['Trolley Luggage', 'Overnight Duffles', 'Packing Cubes', 'Tech Kits'] },
    { label: 'Leather & Accessories', sub: 'RFID cardholders, leather belts & toiletry kits', badge: 'Handcrafted', to: '/shop/accessories', img: '/uploads/seed/cable-pouch.jpg', icon: 'watch', tone: 'purple', highlights: ['RFID Wallets', 'Passport Wallets', 'Dopp Kits', 'Leather Belts', 'Laptop Sleeves'] },
  ],
  budgets: [
    { label: 'Under ₹1,499', sub: 'Everyday essentials & wallets', to: '/shop?maxPrice=1499', icon: 'payments', badge: 'Budget Pick', tone: 'emerald' },
    { label: '₹1,500 – ₹3,499', sub: 'Commuter daypacks & slings', to: '/shop?minPrice=1500&maxPrice=3499', icon: 'backpack', badge: 'Most Popular', tone: 'blue' },
    { label: '₹3,500 – ₹7,999', sub: 'Executive briefcases & duffles', to: '/shop?minPrice=3500&maxPrice=7999', icon: 'business_center', badge: 'Premium', tone: 'rose' },
    { label: '₹8,000+', sub: 'Luggage & heritage carry', to: '/shop?minPrice=8000', icon: 'diamond', badge: 'Luxury', tone: 'purple' },
  ],
  trends: [
    { label: 'Bestsellers', sub: 'Most-bought carry', icon: 'local_fire_department', to: '/shop?bestseller=true&sort=bestseller', badge: 'HOT', tone: 'rose' },
    { label: 'New Releases', sub: 'Fresh season drops', icon: 'auto_awesome', to: '/shop?newArrival=true&sort=newest', badge: 'NEW', tone: 'purple' },
    { label: 'On Sale', sub: 'Live price drops', icon: 'sell', to: '/offers', badge: 'SAVINGS', tone: 'pink' },
    { label: '4.5★+ Top Rated', sub: 'Rated by verified buyers', icon: 'star', to: '/shop?rating=4.5&sort=highest-rated', badge: 'RATED', tone: 'indigo' },
    { label: 'Waterproof', sub: 'Weather-ready fabric', icon: 'water_drop', to: '/shop?q=Waterproof', badge: 'RAIN SAFE', tone: 'sky' },
    { label: 'Fits 16" Laptop', sub: 'Padded tech sleeves', icon: 'laptop_mac', to: '/shop?q=Laptop', badge: 'TECH', tone: 'blue' },
    { label: 'Cabin Luggage', sub: 'Carry-on sizes', icon: 'flight_takeoff', to: '/shop?q=Cabin', badge: 'AIRPORT', tone: 'teal' },
  ],
  perks: [
    { icon: 'verified', title: '7-Day Returns', sub: 'From the day of delivery' },
    { icon: 'local_shipping', title: 'Free Shipping', sub: 'On orders over ₹10,000' },
    { icon: 'support_agent', title: 'Real Support', sub: 'Call, email or WhatsApp' },
    { icon: 'lock', title: 'Secure Checkout', sub: 'UPI, cards & COD' },
  ],
  spotlightSlug: '',
};

/** The Shop menu content: the admin's version when they have customised it, else the built-in one. */
export function useShopShowcase() {
  const { data: config } = useConfig();
  const custom = config?.shopShowcase;
  return custom?.customized ? { ...BUILTIN_SHOWCASE, ...custom } : BUILTIN_SHOWCASE;
}

/**
 * Desktop "Shop" nav button.
 * Clicking it opens the full screen shop showcase directly, without any yellow dot.
 */
export function ShopMegaMenu() {
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

/** The admin's pick (Settings → Shop menu → Spotlight product), shown with its real price and rating. */
function Spotlight({ slug, onNavigate }) {
  const money = useMoney();
  const { data, isLoading } = useQuery({ queryKey: ['product', slug], queryFn: () => api.product(slug), enabled: Boolean(slug), staleTime: 60 * 1000 });
  const p = data?.product;
  if (!slug || (!isLoading && !p)) return null;
  if (isLoading) return <div className="h-48 rounded-3xl bg-surface-container-low animate-pulse" />;
  const price = p.finalPrice ?? p.salePrice ?? p.price;
  const off = p.price > price ? Math.round(((p.price - price) / p.price) * 100) : 0;
  return (
    <div className="p-4 rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/10 via-surface-container-low to-surface-container shadow-md flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-secondary bg-secondary/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Our pick</span>
        {off > 0 && <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">{off}% OFF</span>}
      </div>
      <div className="flex gap-3.5 items-center">
        <img src={imgUrl(productImage(p), 160)} alt={p.name} className="w-20 h-20 rounded-2xl object-cover border border-outline-variant/30 shrink-0 shadow-sm" />
        <div className="flex-1 min-w-0">
          <h4 className="text-[13.5px] font-black text-on-surface leading-snug">{p.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[14px] font-black text-on-surface">{money(price)}</span>
            {off > 0 && <span className="text-[11px] text-outline line-through">{money(p.price)}</span>}
          </div>
          {p.ratingCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-bold mt-1">
              <Icon name="star" fill className="text-[13px] text-rose-500" />
              <span>{Number(p.ratingAverage).toFixed(1)}</span>
              <span className="text-outline text-[10px]">({p.ratingCount} review{p.ratingCount === 1 ? '' : 's'})</span>
            </div>
          )}
        </div>
      </div>
      <Link to={`/product/${p.slug}`} onClick={onNavigate} className="w-full btn-primary text-xs py-2 rounded-xl flex items-center justify-center gap-1.5">
        <span>View product</span>
        <Icon name="arrow_forward" className="text-[13px]" />
      </Link>
    </div>
  );
}

function SectionHead({ icon, iconClass, title, action, onAction }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
      <div className="flex items-center gap-2">
        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconClass)}>
          <Icon name={icon} className="text-[16px]" />
        </span>
        <h2 className="text-[15px] sm:text-[17px] font-black text-on-surface">{title}</h2>
      </div>
      {action && (
        <button type="button" onClick={onAction} className="text-[12px] font-bold text-secondary hover:underline flex items-center gap-0.5">
          {action} <Icon name="chevron_right" className="text-[14px]" />
        </button>
      )}
    </div>
  );
}

const TABS = [
  ['showcase', 'diamond', 'Showcase'],
  ['explore', 'explore', 'All Items'],
  ['departments', 'category', 'Departments'],
  ['budget', 'payments', 'By Budget'],
  ['trends', 'local_fire_department', 'Trending'],
];

/**
 * FULL SCREEN SHOP SHOWCASE MODAL
 * Opens when someone clicks "Shop" in desktop header, mobile header, or bottom navigation.
 * Showcases everything (departments, categories, budget brackets, trends, the admin's pick)
 * and has an "All Items" tab where every product appears. All tabs and labels show in full on
 * every screen size (nothing is hidden or cut off on phones).
 */
export function ShopDrawerModal() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.shopModalOpen);
  const { data: categories } = useCategories();
  const showcase = useShopShowcase();

  const [activeTab, setActiveTab] = useState('showcase');
  const [exploreCategory, setExploreCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);

  const close = () => dispatch(setShopModalOpen(false));

  // The overlay is not a page of its own: any navigation (a link inside it, the logo, or the
  // browser's Back/Forward) closes it, so it can never sit on top of a different page.
  const location = useLocation();
  const openedAt = useRef(null);
  useEffect(() => {
    if (!open) {
      openedAt.current = null;
      return;
    }
    if (openedAt.current === null) openedAt.current = location.key;
    else if (openedAt.current !== location.key) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location.key]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // "All Items": every matching product (all pages), grouped by category › subcategory.
  const productsQuery = useInfiniteQuery({
    queryKey: ['fullscreen-shop-products', { sort: sortOrder, category: exploreCategory, q: searchQuery, inStock: inStockOnly, onSale: onSaleOnly }],
    queryFn: ({ pageParam }) => {
      const q = { limit: 48, sort: sortOrder, page: pageParam };
      if (exploreCategory) q.category = exploreCategory;
      if (searchQuery) q.q = searchQuery;
      if (inStockOnly) q.inStock = 'true';
      if (onSaleOnly) q.onSale = 'true';
      return api.products(q);
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    enabled: open && activeTab === 'explore',
    staleTime: 60 * 1000,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = productsQuery;
  useEffect(() => {
    if (open && activeTab === 'explore' && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [open, activeTab, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const productsList = useMemo(() => productsQuery.data?.pages.flatMap((p) => p.items) || [], [productsQuery.data]);
  const totalProducts = productsQuery.data?.pages[0]?.total ?? productsList.length;
  const catMap = useMemo(() => flattenTree(categories), [categories]);
  const catOrder = useMemo(() => new Map([...catMap.keys()].map((slug, i) => [slug, i])), [catMap]);
  const liveCategories = (categories || []).filter((cat) => cat.productCount === undefined || cat.productCount > 0);

  if (!open) return null;

  const { departments, budgets, trends, perks, spotlightSlug } = showcase;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="WILDTANE Full Screen Shop"
      className="fixed inset-0 z-[100] flex flex-col bg-surface text-on-surface animate-fade-in overflow-hidden"
    >
      {/* ── 1. TOP BAR: brand + close on the first row, every tab on the second (scrolls on narrow phones) ── */}
      <header className="sticky top-0 z-30 bg-surface border-b border-surface-container-high/80 shrink-0">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 pt-2.5 pb-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-center justify-between gap-3 lg:contents">
            <Link to="/" onClick={close} className="flex items-center gap-2.5 min-w-0 group hover:opacity-85 transition-opacity lg:order-1" aria-label="Return to WILDTANE Home">
              <span className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                <Icon name="grid_view" className="text-[20px]" />
              </span>
              <span className="font-serif tracking-[0.14em] font-black text-[15px] sm:text-[17px] text-on-surface uppercase leading-none group-hover:text-secondary transition-colors">
                WILDTANE
              </span>
              <span className="hidden min-[400px]:inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 uppercase tracking-wider">Shop</span>
            </Link>

            <div className="flex items-center gap-2 shrink-0 lg:order-3">
              <Link to="/shop" onClick={close} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-all">
                <span>Full Store</span>
                <Icon name="open_in_new" className="text-[14px] text-outline" />
              </Link>
              <button
                type="button"
                onClick={close}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface active:scale-90 transition-transform"
                aria-label="Close Shop full screen"
                title="Close (Esc)"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
          </div>

          {/* Tabs wrap onto a second line on narrow phones, so every tab is always fully visible. */}
          <nav aria-label="Shop sections" className="lg:order-2">
            <div className="flex flex-wrap items-center justify-center gap-1 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30 sm:w-max sm:mx-auto">
              {TABS.map(([id, icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={cn(
                    'grow sm:grow-0 px-3 py-1.5 rounded-xl text-[12.5px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5',
                    activeTab === id ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  )}
                >
                  <Icon name={icon} className="text-[16px]" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* ── 2. SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6 w-full max-w-[1920px] mx-auto">
        {/* ═══ ALL ITEMS ═══ */}
        {activeTab === 'explore' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-secondary/15 via-surface-container-low to-surface-container-lowest border border-secondary/25 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-on-surface">Every WILDTANE item</h1>
                  <p className="text-[12.5px] sm:text-[13.5px] text-on-surface-variant max-w-2xl mt-1">Filter by category, price, stock or sale — everything in the store is here.</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all items…"
                    aria-label="Search all items"
                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-surface border border-outline-variant/40 text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface" aria-label="Clear search">
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Every category, wrapped onto as many lines as needed */}
              <div className="mt-4 pt-3.5 border-t border-outline-variant/30 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExploreCategory('')}
                  className={cn('px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all', !exploreCategory ? 'bg-on-surface text-surface' : 'bg-surface-container-low text-on-surface hover:bg-surface-container')}
                >
                  All Categories
                </button>
                {liveCategories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setExploreCategory(exploreCategory === cat.slug ? '' : cat.slug)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-1.5',
                      exploreCategory === cat.slug ? 'bg-secondary text-on-secondary' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', categoryTone(cat).dot)} />
                    <span>{cat.name}</span>
                    {cat.productCount > 0 && <span className="text-[10px] opacity-75">({cat.productCount})</span>}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                <div className="flex flex-wrap items-center gap-1.5">
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
                      className={cn('px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap', sortOrder === val ? 'bg-on-surface text-surface font-bold' : 'bg-surface hover:bg-surface-container text-on-surface-variant')}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInStockOnly(!inStockOnly)}
                    className={cn('px-2.5 py-1 rounded-lg border text-[11.5px] font-bold flex items-center gap-1 transition-all', inStockOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-surface border-outline-variant/40 text-on-surface-variant')}
                  >
                    <Icon name="verified" className="text-[13px]" /> In Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnSaleOnly(!onSaleOnly)}
                    className={cn('px-2.5 py-1 rounded-lg border text-[11.5px] font-bold flex items-center gap-1 transition-all', onSaleOnly ? 'bg-rose-600 text-white border-rose-600' : 'bg-surface border-outline-variant/40 text-on-surface-variant')}
                  >
                    <Icon name="sell" className="text-[13px]" /> On Sale
                  </button>
                  <span className="text-[11.5px] font-bold text-outline ml-1">{productsQuery.isLoading ? 'Loading…' : `${totalProducts} items`}</span>
                </div>
              </div>
            </div>

            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : productsList.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <span className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-3">
                  <Icon name="search_off" className="text-[32px]" />
                </span>
                <h3 className="text-lg font-bold text-on-surface">No products found</h3>
                <p className="text-sm text-outline mt-1 max-w-sm">Try clearing your search or category filter.</p>
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
                  Reset all filters
                </button>
              </div>
            ) : (
              // Opening a product navigates, which closes this overlay by itself.
              <GroupedProducts products={productsList} bySlug={catMap} order={catOrder} loadingMore={hasNextPage || isFetchingNextPage} />
            )}

            <div className="pt-6 pb-10 text-center border-t border-surface-container-high/60">
              <Link to="/shop" onClick={close} className="btn-primary text-sm px-6 py-3 rounded-2xl inline-flex items-center gap-2 shadow-md">
                <span>Open the full store & filters</span>
                <Icon name="arrow_forward" className="text-[17px]" />
              </Link>
            </div>
          </div>
        )}

        {/* ═══ SHOWCASE ═══ */}
        {activeTab === 'showcase' && (
          <div className="space-y-7 sm:space-y-9 animate-fade-in max-w-7xl mx-auto pb-6">
            <div className="relative overflow-hidden rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-secondary/15 via-surface-container-low to-surface-container border border-secondary/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="max-w-2xl">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-on-surface tracking-tight leading-tight">Find your next carry</h1>
                  <p className="mt-2 text-[13px] sm:text-[14.5px] text-on-surface-variant leading-relaxed">Browse by department, budget or what’s trending — or open every item at once.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                  <button type="button" onClick={() => setActiveTab('explore')} className="btn-primary text-[13.5px] px-6 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md font-bold">
                    <Icon name="explore" className="text-[18px]" />
                    <span>See all items</span>
                  </button>
                  <Link to="/shop" onClick={close} className="btn-tonal text-[13px] px-5 py-3 rounded-2xl flex items-center justify-center gap-1.5">
                    <span>Open shop page</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>
                </div>
              </div>
            </div>

            {departments.length > 0 && (
              <section>
                <SectionHead icon="category" iconClass="bg-secondary/15 text-secondary" title="Departments" action="All departments" onAction={() => setActiveTab('departments')} />
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {departments.map((d) => (
                    <Link
                      key={d.label}
                      to={d.to}
                      onClick={close}
                      className={cn('group rounded-2xl border p-3.5 bg-gradient-to-br transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between gap-3', tone(d.tone).gradient, tone(d.tone).border)}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0', tone(d.tone).dot)}>
                            <Icon name={d.icon || 'category'} className="text-[20px]" />
                          </span>
                          {d.badge && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface/85 border border-outline-variant/30 text-on-surface text-right">{d.badge}</span>}
                        </div>
                        <h3 className={cn('text-[14.5px] font-extrabold tracking-tight', tone(d.tone).text)}>{d.label}</h3>
                        {d.sub && <p className="text-[12px] text-on-surface-variant mt-1 leading-snug">{d.sub}</p>}
                      </div>
                      <div className="pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[12px] font-bold text-on-surface">
                        <span>Explore</span>
                        <Icon name="arrow_forward" className="text-[15px] text-outline group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {budgets.length > 0 && (
              <section>
                <SectionHead icon="payments" iconClass="bg-emerald-500/15 text-emerald-600" title="Shop by budget" action="All price bands" onAction={() => setActiveTab('budget')} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {budgets.map((b) => (
                    <Link key={b.label} to={b.to} onClick={close} className={cn('p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br', tone(b.tone).gradient, tone(b.tone).border)}>
                      <div className="flex items-start justify-between gap-2">
                        <Icon name={b.icon || 'payments'} className={cn('text-[22px] shrink-0', tone(b.tone).text)} />
                        {b.badge && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-surface/90 border border-outline-variant/30 text-on-surface text-right">{b.badge}</span>}
                      </div>
                      <div>
                        <div className="text-[14px] font-extrabold text-on-surface">{b.label}</div>
                        {b.sub && <div className="text-[12px] text-on-surface-variant mt-0.5 leading-snug">{b.sub}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {trends.length > 0 && (
              <section>
                <SectionHead icon="local_fire_department" iconClass="bg-rose-500/15 text-rose-600" title="Trending & quick filters" action="See as cards" onAction={() => setActiveTab('trends')} />
                <div className="flex flex-wrap gap-2">
                  {trends.map((t) => (
                    <Link key={t.label} to={t.to} onClick={close} className={cn('inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[12.5px] font-bold border transition-all hover:-translate-y-0.5', tone(t.tone).chip)}>
                      {t.icon && <Icon name={t.icon} className="text-[16px]" />}
                      <span>{t.label}</span>
                      {t.badge && <span className="text-[10px] px-1.5 rounded-full bg-surface/80 border border-outline-variant/30 font-extrabold">{t.badge}</span>}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className={cn('grid grid-cols-1 gap-5', spotlightSlug && 'lg:grid-cols-3')}>
              <section className={cn(spotlightSlug && 'lg:col-span-2')}>
                <SectionHead icon="style" iconClass="bg-secondary/15 text-secondary" title="Browse by category" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {liveCategories.map((cat) => (
                    <Link
                      key={cat._id}
                      to={`/shop/${cat.slug}`}
                      onClick={close}
                      className={cn('flex items-center gap-2.5 p-2.5 rounded-2xl border border-outline-variant/30 hover:border-secondary/50 transition-all', categoryTone(cat).tint)}
                    >
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', categoryTone(cat).dot)} />
                      <div className="min-w-0 flex-1">
                        <div className={cn('text-[12.5px] font-bold leading-snug break-words', categoryTone(cat).text)}>{cat.name}</div>
                        {cat.productCount > 0 && <div className="text-[10.5px] text-outline">{cat.productCount} styles</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
              {spotlightSlug && (
                <section>
                  <SectionHead icon="star" iconClass="bg-rose-500/15 text-rose-600" title="Our pick" />
                  <Spotlight slug={spotlightSlug} onNavigate={close} />
                </section>
              )}
            </div>

            {perks.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-surface-container-high/60">
                {perks.map((perk) => (
                  <div key={perk.title} className="flex items-center gap-2.5 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                    <Icon name={perk.icon || 'check_circle'} className="text-[20px] text-secondary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-on-surface leading-snug">{perk.title}</div>
                      {perk.sub && <div className="text-[11px] text-outline leading-snug">{perk.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ DEPARTMENTS ═══ */}
        {activeTab === 'departments' && (
          <div className="space-y-4 max-w-5xl mx-auto animate-fade-in pb-10">
            <TabIntro title="Departments" text="Collections by lifestyle and use" onExplore={() => setActiveTab('explore')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((d) => (
                <div key={d.label} className={cn('p-5 rounded-3xl border bg-gradient-to-br flex flex-col justify-between gap-4', tone(d.tone).gradient, tone(d.tone).border)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {d.badge && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface/80 border border-outline-variant/30 text-on-surface">{d.badge}</span>}
                      <h3 className={cn('text-lg font-black mt-2', tone(d.tone).text)}>{d.label}</h3>
                      {d.sub && <p className="text-[13px] text-on-surface-variant mt-1">{d.sub}</p>}
                    </div>
                    {d.img && (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-black/10">
                        <img src={imgUrl(d.img, 128)} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  {d.highlights?.length > 0 && (
                    <div className="pt-3 border-t border-black/5 dark:border-white/5">
                      <div className="text-[11px] font-bold text-outline mb-2">Popular styles</div>
                      <div className="flex flex-wrap gap-1.5">
                        {d.highlights.map((h) => (
                          <span key={h} className="px-2 py-0.5 rounded-lg bg-surface/70 text-[11.5px] font-semibold text-on-surface">{h}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link to={d.to} onClick={close} className="btn-primary text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                    <span>View {d.label}</span>
                    <Icon name="arrow_forward" className="text-[14px]" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ BUDGET ═══ */}
        {activeTab === 'budget' && (
          <div className="space-y-4 max-w-4xl mx-auto animate-fade-in pb-10">
            <TabIntro title="Shop by budget" text="Carry inside the price range you want" onExplore={() => setActiveTab('explore')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {budgets.map((b) => (
                <Link key={b.label} to={b.to} onClick={close} className={cn('p-6 rounded-3xl border flex flex-col justify-between gap-5 transition-all hover:shadow-lg hover:-translate-y-0.5 bg-gradient-to-br', tone(b.tone).gradient, tone(b.tone).border)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-12 h-12 rounded-2xl bg-surface/80 flex items-center justify-center">
                      <Icon name={b.icon || 'payments'} className={cn('text-[26px]', tone(b.tone).text)} />
                    </span>
                    {b.badge && <span className="text-[10.5px] font-black px-2.5 py-0.5 rounded-full bg-surface border border-outline-variant/30 text-on-surface">{b.badge}</span>}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-on-surface">{b.label}</h3>
                    {b.sub && <p className="text-[13px] text-on-surface-variant mt-1">{b.sub}</p>}
                  </div>
                  <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold text-secondary">
                    <span>Shop this range</span>
                    <Icon name="arrow_forward" className="text-[15px]" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TRENDING ═══ */}
        {activeTab === 'trends' && (
          <div className="space-y-4 max-w-4xl mx-auto animate-fade-in pb-10">
            <TabIntro title="Trending & quick filters" text="Jump straight to popular picks" onExplore={() => setActiveTab('explore')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {trends.map((t) => (
                <Link key={t.label} to={t.to} onClick={close} className={cn('p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between gap-4 min-h-[120px]', tone(t.tone).chip)}>
                  <div className="flex items-center justify-between gap-2">
                    <Icon name={t.icon || 'bolt'} className="text-[22px]" />
                    {t.badge && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface/80 border border-outline-variant/30 text-on-surface">{t.badge}</span>}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-black text-on-surface">{t.label}</h4>
                    {t.sub && <p className="text-[12px] text-on-surface-variant mt-0.5">{t.sub}</p>}
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

function TabIntro({ title, text, onExplore }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-surface-container-high/60">
      <div>
        <h2 className="text-xl font-bold text-on-surface">{title}</h2>
        <p className="text-[13px] text-on-surface-variant">{text}</p>
      </div>
      <button type="button" onClick={onExplore} className="btn-tonal text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1">
        <Icon name="explore" className="text-[14px]" /> See all items
      </button>
    </div>
  );
}
