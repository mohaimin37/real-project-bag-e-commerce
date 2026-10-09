import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, imgUrl } from '../lib/format';
import { TAB_TONES, categoryTone } from '../lib/categoryTone';
import { useCategories, useConfig, useMoney } from '../hooks/useStore';
import { useCart } from '../hooks/useCart';
import { setCartOpen, setSearchOpen } from '../store';
import { GRID_COLS, ProductCard, ProductCardSkeleton } from '../components/product';
import Seo, { breadcrumbLd, itemListLd, organizationLd, websiteLd } from '../components/Seo';
import { Drawer, EmptyState, ErrorState, Icon, Modal, Spinner, Toggle } from '../components/ui';

const PAGE_SIZE = 24;

const SORTS = [
  ['featured', 'Relevance'],
  ['bestseller', 'Popularity'],
  ['price-low', 'Price — Low to High'],
  ['price-high', 'Price — High to Low'],
  ['highest-rated', 'Top rated'],
  ['newest', 'Newest first'],
];

const LIST_KEYS = ['materials', 'colors', 'features', 'size', 'purpose'];
const FILTER_KEYS = [...LIST_KEYS, 'minPrice', 'maxPrice', 'inStock', 'rating', 'onSale', 'gender'];

// Plain-language filter options (values match the API).
const WHO = [['', 'All'], ['men', 'Men'], ['women', 'Women'], ['unisex', 'Universal']];
const USES = [
  ['work', 'Work & office'],
  ['travel', 'Travel'],
  ['transit', 'Daily commute'],
  ['business', 'Meetings'],
  ['creative', 'Studio & hobbies'],
];
const SIZES = [
  ['small', 'Small'],
  ['medium', 'Medium'],
  ['large', 'Large'],
];
const PRICE_BANDS = [
  ['0', '', '5000', 'Under ₹5,000'],
  ['5000', '5000', '10000', '₹5,000 – ₹10,000'],
  ['10000', '10000', '20000', '₹10,000 – ₹20,000'],
  ['20000', '20000', '', 'Over ₹20,000'],
];

function Chip({ on, onClick, children, count, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-medium border transition-colors disabled:opacity-40',
        on ? 'bg-on-surface text-surface-container-lowest border-on-surface' : 'bg-surface-container-lowest border-surface-container-high hover:border-outline'
      )}
    >
      {on && <Icon name="check" className="text-[14px]" />}
      {children}
      {count != null && <span className={cn('text-[11px]', on ? 'opacity-70' : 'text-outline')}>{count}</span>}
    </button>
  );
}

function useParamState() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const getList = (k) => (params.get(k) ? params.get(k).split(',') : []);
  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    next.delete('page');
    setParams(next, { replace: true });
  };
  const toggleIn = (k, value) => {
    const list = getList(k);
    update({ [k]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });
  };
  return { params, get, getList, update, toggleIn };
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-3 border-b border-surface-container-high last:border-0">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between" aria-expanded={open}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{title}</span>
        <Icon name="expand_more" className={cn('text-[18px] text-outline transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pt-2.5">{children}</div>}
    </div>
  );
}

// /men, /women, /unisex, /shop, and /offers: colorful hero section with live stats, badges, and department switchers.
const GENDER_PAGES = {
  men: {
    title: 'Men',
    seoTitle: "Men's Bags — Briefcases, Laptop Bags, Wallets & Weekenders",
    description: "Shop men's bags at WILDTANE: briefcases, laptop bags, messengers, wallets and leather weekenders. Durable, modern designs with secure checkout.",
    tagline: 'Briefcases, laptop bags, wallets and weekenders built for relentless daily use and travel.',
    image: '/uploads/seed/briefcase-black.jpg',
    eyebrow: 'MASCULINE ARCHITECTURE • BUILT FOR OFFICE & TRANSIT',
    gradientTitle: 'Engineered For The Grind',
    tag: 'Full-Grain Leather & 1680D',
    gradientBg: 'from-blue-600/15 via-indigo-600/10 to-amber-500/15',
    borderGlow: 'border-blue-500/30',
    accentText: 'text-sky-600 dark:text-sky-400',
    stats: [
      { label: '1680D Ballistic Nylon', icon: 'shield' },
      { label: 'Fits Up to 16" Laptops', icon: 'laptop' },
      { label: '4.6★ Rated by Commuters', icon: 'star' },
      { label: '7-Day Home Trial', icon: 'verified' },
    ],
  },
  women: {
    title: 'Women',
    seoTitle: "Women's Bags — Handbags, Totes, Crossbody & Clutches",
    description: "Shop women's bags at WILDTANE: handbags, totes, crossbody and shoulder bags, clutches and straw bags. Modern designs with secure checkout.",
    tagline: 'Sculptural leather handbags, featherlight daily work totes, and versatile crossbody slings.',
    image: '/uploads/seed/handbag-teal.jpg',
    eyebrow: 'SCULPTURAL LUXURY • STRUCTURED LEATHER & WORK TOTES',
    gradientTitle: 'Everyday Elegance In Motion',
    tag: 'Emerald Full-Grain & Lightweight',
    gradientBg: 'from-rose-500/15 via-pink-500/10 to-purple-500/15',
    borderGlow: 'border-rose-500/30',
    accentText: 'text-rose-600 dark:text-rose-400',
    stats: [
      { label: 'Featherlight Weight Balance', icon: 'feather' },
      { label: 'Structured Base Never Slumps', icon: 'aspect_ratio' },
      { label: 'Suspended Tech Sleeves', icon: 'laptop' },
      { label: '4.6★ Loved Across India', icon: 'star' },
    ],
  },
  universal: {
    title: 'Universal',
    seoTitle: 'Universal Bags — Backpacks, Luggage & Travel Gear for Everyone',
    description: 'Shop universal bags at WILDTANE: backpacks, cabin luggage, duffles, slings and travel accessories designed for everyone.',
    tagline: 'Aerospace-inspired backpacks, 360° spinner cabin luggage, and travel gear designed for everyone.',
    image: '/uploads/seed/apex-navy.jpg',
    eyebrow: 'UNIVERSAL ERGONOMICS • BACKPACKS & LUGGAGE FOR ALL',
    gradientTitle: 'Travel Gear For Everyone',
    tag: '100% Recycled Ocean Linings',
    gradientBg: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15',
    borderGlow: 'border-emerald-500/30',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    stats: [
      { label: '180° Airport Clamshell', icon: 'flight_takeoff' },
      { label: '100% Recycled Linings', icon: 'eco' },
      { label: 'Silent 360° Hinomoto Wheels', icon: 'radio_button_checked' },
      { label: 'TSA Carry-On Compliant', icon: 'verified' },
    ],
  },
  unisex: {
    title: 'Universal',
    seoTitle: 'Universal Bags — Backpacks, Luggage & Travel Gear for Everyone',
    description: 'Shop universal bags at WILDTANE: backpacks, cabin luggage, duffles, slings and travel accessories designed for everyone.',
    tagline: 'Aerospace-inspired backpacks, 360° spinner cabin luggage, and travel gear designed for everyone.',
    image: '/uploads/seed/apex-navy.jpg',
    eyebrow: 'UNIVERSAL ERGONOMICS • BACKPACKS & LUGGAGE FOR ALL',
    gradientTitle: 'Travel Gear For Everyone',
    tag: '100% Recycled Ocean Linings',
    gradientBg: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15',
    borderGlow: 'border-emerald-500/30',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    stats: [
      { label: '180° Airport Clamshell', icon: 'flight_takeoff' },
      { label: '100% Recycled Linings', icon: 'eco' },
      { label: 'Silent 360° Hinomoto Wheels', icon: 'radio_button_checked' },
      { label: 'TSA Carry-On Compliant', icon: 'verified' },
    ],
  },
};

const SHOP_PAGE = {
  title: 'All Products',
  seoTitle: 'Shop All Bags & Luggage — Backpacks, Totes & Travel Gear | WILDTANE',
  description: 'Explore the full WILDTANE collection: laptop backpacks, luxury handbags, work totes, weekender duffles and cabin luggage.',
  tagline: 'Architectural carry engineered for commuters, frequent flyers, and modern explorers.',
  image: '/uploads/seed/terminal-traveler.jpg',
  eyebrow: 'COMPLETE CATALOGUE • ARCHITECTURAL CARRY',
  gradientTitle: 'Carry Your World In Color',
  tag: 'Handcrafted in India',
  gradientBg: 'from-amber-500/15 via-rose-500/10 to-indigo-500/15',
  borderGlow: 'border-amber-500/30',
  accentText: 'text-amber-600 dark:text-amber-400',
  stats: [
    { label: '50,000+ Journeys Made', icon: 'flight_takeoff' },
    { label: '4.6★ Rating Points', icon: 'star' },
    { label: '100% Recycled Linings', icon: 'eco' },
    { label: '7-Day Home Trial', icon: 'verified' },
  ],
};

const OFFERS_PAGE = {
  title: 'Special Offers',
  seoTitle: 'Special Offers & Bag Deals — Limited Time Savings | WILDTANE',
  description: 'Limited-time discounts on architectural bags, travel duffles, and tech backpacks with 7-day returns.',
  tagline: 'Limited-edition discounts on premium backpacks, leather totes, and travel bundles.',
  image: '/uploads/seed/catalog/trekpack-sun.jpg',
  eyebrow: 'EXCLUSIVE PROMOTIONS • LIMITED QUANTITY',
  gradientTitle: 'Premium Craft At Unmatched Value',
  tag: 'Limited Time Savings',
  gradientBg: 'from-rose-500/15 via-amber-500/10 to-violet-500/15',
  borderGlow: 'border-rose-500/30',
  accentText: 'text-rose-600 dark:text-rose-400',
  stats: [
    { label: 'Up to 30% Off Selected Styles', icon: 'percent' },
    { label: 'Free Delivery Over ₹10,000', icon: 'local_shipping' },
    { label: 'Genuine 7-Day Returns', icon: 'verified' },
    { label: 'Earn WILDTANE Coins', icon: 'toll' },
  ],
};

const DEPARTMENT_NAV = [
  { key: 'shop', label: 'All Products', to: '/shop' },
  { key: 'men', label: 'Men', to: '/men' },
  { key: 'women', label: 'Women', to: '/women' },
  { key: 'universal', label: 'Universal', to: '/universal' },
  { key: 'travel', label: 'Travel & Utility', to: '/shop/travel-utility' },
  { key: 'accessories', label: 'Accessories', to: '/shop/accessories' },
  { key: 'offers', label: 'Offers', to: '/offers' },
];

export const DEPARTMENT_SHORTCUTS = {
  men: [
    { key: 'all', label: 'All Men', category: '', icon: 'man', img: '/uploads/seed/briefcase-black.jpg' },
    { key: 'wallets', label: 'Wallets', category: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
    { key: 'bags', label: 'Bags', category: 'bags', icon: 'shopping_bag', img: '/uploads/seed/briefcase-cognac.jpg' },
    { key: 'belts', label: 'Belts', category: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
    { key: 't-shirts', label: 'T-Shirts', category: 't-shirts', icon: 'checkroom', img: '/uploads/seed/catalog/tote-cotton.jpg' },
    { key: 'laptop-bags', label: 'Laptop Bags', category: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
    { key: 'office-bags', label: 'Briefcases', category: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg' },
    { key: 'sling-bags', label: 'Messengers', category: 'sling-bags', icon: 'backpack', img: '/uploads/seed/catalog/messenger-dalton.jpg' },
    { key: 'duffle-bags', label: 'Duffles & Travel', category: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/catalog/duffle-highway.jpg' },
    { key: 'accessories', label: 'Accessories', category: 'accessories', icon: 'watch', img: '/uploads/seed/catalog/keyset-onyx.jpg' },
  ],
  women: [
    { key: 'all', label: 'All Women', category: '', icon: 'woman', img: '/uploads/seed/handbag-rose.jpg' },
    { key: 'handbags', label: 'Handbags', category: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-sienna.jpg' },
    { key: 'tote-bags', label: 'Totes', category: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/tote-ochre.jpg' },
    { key: 'sling-bags', label: 'Crossbody', category: 'sling-bags', icon: 'backpack', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
    { key: 'clutches', label: 'Clutches', category: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg' },
    { key: 'wallets', label: 'Wallets', category: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-zip.jpg' },
    { key: 'perfumes', label: 'Perfumes', category: 'perfumes', icon: 'local_florist', img: '/uploads/seed/catalog/bottle-lilac.jpg' },
    { key: 'belts', label: 'Belts', category: 'belts', icon: 'styler', img: '/uploads/seed/catalog/beltbag-grey.jpg' },
    { key: 'beach-straw-bags', label: 'Beach Bags', category: 'beach-straw-bags', icon: 'beach_access', img: '/uploads/seed/catalog/straw-riviera.jpg' },
    { key: 'accessories', label: 'Accessories', category: 'accessories', icon: 'watch', img: '/uploads/seed/catalog/raffia-tassel.jpg' },
  ],
  universal: [
    { key: 'all', label: 'All Universal', category: '', icon: 'public', img: '/uploads/seed/apex-navy.jpg' },
    { key: 'backpacks', label: 'Backpacks', category: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg' },
    { key: 'cabin-luggage', label: 'Cabin Luggage', category: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg' },
    { key: 'duffle-bags', label: 'Travel Duffles', category: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
    { key: 'laptop-sleeves', label: 'Laptop Sleeves', category: 'laptop-sleeves', icon: 'laptop', img: '/uploads/seed/catalog/sleeve-saddle-tan.jpg' },
    { key: 'daypacks', label: 'Daypacks', category: 'daypacks', icon: 'hiking', img: '/uploads/seed/daypack-navy.jpg' },
    { key: 'accessories', label: 'Accessories', category: 'accessories', icon: 'watch', img: '/uploads/seed/cable-pouch.jpg' },
  ],
  'travel-utility': [
    { key: 'all', label: 'All Travel', category: '', icon: 'flight_takeoff', img: '/uploads/seed/cabin-hardshell.jpg' },
    { key: 'cabin-luggage', label: 'Cabin Luggage', category: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg' },
    { key: 'tech-briefcases', label: 'Tech Briefcases', category: 'tech-briefcases', icon: 'business_center', img: '/uploads/seed/briefcase-black.jpg' },
    { key: 'waterproof-commuters', label: 'Waterproof', category: 'waterproof-commuters', icon: 'water_drop', img: '/uploads/seed/pack-trailhead.jpg' },
    { key: 'daypacks', label: 'Daypacks', category: 'daypacks', icon: 'hiking', img: '/uploads/seed/daypack-grey.jpg' },
    { key: 'travel-organisers', label: 'Organizers', category: 'travel-organisers', icon: 'inventory_2', img: '/uploads/seed/packing-cube.jpg' },
  ],
  accessories: [
    { key: 'all', label: 'All Accessories', category: '', icon: 'watch', img: '/uploads/seed/cable-pouch.jpg' },
    { key: 'wallets', label: 'Wallets', category: 'wallets', icon: 'wallet', img: '/uploads/seed/cardholder-tan.jpg' },
    { key: 'belts', label: 'Belts', category: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
    { key: 'perfumes', label: 'Perfumes', category: 'perfumes', icon: 'local_florist', img: '/uploads/seed/catalog/bottle-lilac.jpg' },
    { key: 'laptop-sleeves', label: 'Laptop Sleeves', category: 'laptop-sleeves', icon: 'laptop', img: '/uploads/seed/catalog/sleeve-saddle-tan.jpg' },
    { key: 'toiletry-kits', label: 'Dopp Kits', category: 'toiletry-kits', icon: 'sanitizer', img: '/uploads/seed/catalog/dopp-heritage-brown.jpg' },
    { key: 'belt-bags', label: 'Belt Bags', category: 'belt-bags', icon: 'backpack', img: '/uploads/seed/catalog/beltbag-cream.jpg' },
    { key: 'luggage-tags', label: 'Luggage Tags', category: 'luggage-tags', icon: 'label', img: '/uploads/seed/catalog/tag-navy.jpg' },
  ],
};
DEPARTMENT_SHORTCUTS.unisex = DEPARTMENT_SHORTCUTS.universal;

function DepartmentHero({ page, current, onSelectCategory, selectedCategory }) {
  const departmentKey = current === 'unisex' ? 'universal' : current;
  const shortcuts = DEPARTMENT_SHORTCUTS[departmentKey] || [];

  return (
    <div className="container-x pt-3 md:pt-5">
      <section
        className={cn(
          'relative overflow-hidden rounded-3xl bg-gradient-to-br border p-6 md:p-10 shadow-sm transition-all',
          page.gradientBg,
          page.borderGlow
        )}
      >
        {/* Soft Glowing Ambient Orbs */}
        <div aria-hidden="true" className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid md:grid-cols-[1.2fr_0.8fr] gap-6 md:gap-10 items-center">
          {/* Content Column */}
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-surface/80 backdrop-blur-md ring-1 ring-secondary/25 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                {page.eyebrow}
              </span>
            </div>

            <h1 className="font-display text-[28px] sm:text-[36px] md:text-[44px] leading-[1.12] text-on-surface">
              {page.title}:{' '}
              <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">
                {page.gradientTitle}
              </span>
            </h1>

            <p className="text-[14px] md:text-[15.5px] leading-relaxed text-on-surface-variant max-w-xl">
              {page.tagline}
            </p>

            {/* Colorful Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {page.stats.map((s, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded-xl bg-surface/75 backdrop-blur-sm ring-1 ring-surface-container-high flex items-center gap-1.5"
                >
                  <Icon name={s.icon} className={cn('text-[15px] shrink-0', page.accentText)} />
                  <span className="text-[11.5px] font-bold text-on-surface truncate">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Curated Category Shortcuts for this Department (Direct 1-Click Filter) */}
            {shortcuts.length > 0 && onSelectCategory && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Explore {page.title} Collections:
                  </span>
                  {selectedCategory && (
                    <button
                      type="button"
                      onClick={() => onSelectCategory('')}
                      className="text-[11px] font-semibold text-secondary hover:underline cursor-pointer"
                    >
                      (Clear filter)
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {shortcuts.map((sc) => {
                    const isSelected = (!selectedCategory && sc.category === '') || selectedCategory === sc.category;
                    return (
                      <button
                        key={sc.key}
                        type="button"
                        onClick={() => onSelectCategory(sc.category === selectedCategory ? '' : sc.category)}
                        className={cn(
                          'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition-all shadow-xs active:scale-95 cursor-pointer',
                          isSelected
                            ? 'bg-secondary text-on-secondary shadow-sm scale-102 ring-2 ring-secondary/30'
                            : 'bg-surface/85 backdrop-blur-md ring-1 ring-surface-container-high text-on-surface hover:bg-surface-container hover:scale-102'
                        )}
                      >
                        <Icon name={sc.icon} className="text-[15px]" />
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Secondary Department Switcher */}
            <div className="flex flex-wrap items-center gap-1 pt-1 opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-[11px] font-medium text-on-surface-variant mr-1">Other departments:</span>
              {DEPARTMENT_NAV.filter((d) => d.key !== current).map((dep) => (
                <Link
                  key={dep.key}
                  to={dep.to}
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-on-surface-variant hover:text-secondary px-2 py-0.5 rounded-full hover:bg-surface/60 transition-colors"
                >
                  {dep.label} <Icon name="chevron_right" className="text-[12px]" />
                </Link>
              ))}
            </div>
          </div>

          {/* Visual Preview Column */}
          <div className="relative hidden md:flex justify-end items-center">
            <div className="relative w-full max-w-[340px] aspect-[4/3] rounded-2xl overflow-hidden shadow-lift ring-2 ring-surface group">
              <img
                src={imgUrl(page.image, 640)}
                alt={page.title}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-bold">
                {page.tag}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Filters({ facets, state, categoryTree, activeCategory, lockedGender }) {
  const { get, getList, update, toggleIn } = state;
  const money = useMoney();
  const [min, setMin] = useState(get('minPrice'));
  const [max, setMax] = useState(get('maxPrice'));
  useEffect(() => {
    setMin(get('minPrice'));
    setMax(get('maxPrice'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.params]);
  const subcats = activeCategory?.children?.length ? activeCategory.children : activeCategory?.parent ? categoryTree?.find((c) => c._id === activeCategory.parent)?.children : null;

  return (
    <div className="flex flex-col">
      {subcats?.length > 0 && (
        <Section title="Category">
          <div className="flex flex-col">
            {subcats.map((c) => {
              const isSelected = activeCategory?._id === c._id || activeCategory?.slug === c.slug;
              return lockedGender ? (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => update({ category: isSelected ? '' : c.slug })}
                  className={cn('flex items-center justify-between py-1.5 text-[13px] hover:text-secondary text-left transition-colors cursor-pointer', isSelected && 'text-secondary font-semibold')}
                >
                  <span>{c.name}</span>
                  {c.productCount > 0 && <span className="text-[11px] text-outline">{c.productCount}</span>}
                </button>
              ) : (
                <Link key={c._id} to={`/shop/${c.slug}`} className={cn('flex items-center justify-between py-1.5 text-[13px] hover:text-secondary', isSelected && 'text-secondary font-semibold')}>
                  <span>{c.name}</span>
                  <span className="text-[11px] text-outline">{c.productCount}</span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Price">
        <div className="flex flex-wrap gap-1.5">
          {PRICE_BANDS.map(([key, lo, hi, label]) => {
            const on = get('minPrice') === lo && get('maxPrice') === hi && (lo || hi);
            return (
              <Chip key={key} on={Boolean(on)} onClick={() => update(on ? { minPrice: '', maxPrice: '' } : { minPrice: lo, maxPrice: hi })}>
                {label}
              </Chip>
            );
          })}
        </div>
        <form
          className="flex items-center gap-1.5 mt-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice: min, maxPrice: max });
          }}
        >
          <input className="input h-9 min-w-0" inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} aria-label="Minimum price (INR)" />
          <span className="text-outline">–</span>
          <input className="input h-9 min-w-0" inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} aria-label="Maximum price (INR)" />
          <button type="submit" className="h-9 px-3 shrink-0 rounded-lg bg-on-surface text-surface-container-lowest text-[12px] font-semibold">Go</button>
        </form>
        {money.isConverted && <p className="text-[11px] text-outline mt-1.5">Price filter uses INR.</p>}
      </Section>

      {!lockedGender && (
        <Section title="For">
          <div className="flex flex-wrap gap-1.5">
            {WHO.map(([value, label]) => (
              <Chip key={label} on={get('gender') === value} onClick={() => update({ gender: value })}>{label}</Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="Use">
        <div className="flex flex-wrap gap-1.5">
          {USES.filter(([value]) => facets?.purposes?.[value] || getList('purpose').includes(value)).map(([value, label]) => (
            <Chip key={value} on={getList('purpose').includes(value)} onClick={() => toggleIn('purpose', value)} count={facets?.purposes?.[value]}>{label}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Size">
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map(([value, label]) => {
            const on = getList('size').includes(value);
            const count = facets?.sizes?.[value] || 0;
            return <Chip key={value} on={on} disabled={!count && !on} onClick={() => toggleIn('size', value)} count={count}>{label}</Chip>;
          })}
        </div>
      </Section>

      {facets?.colors?.length > 0 && (
        <Section title="Colour">
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((c) => {
              const on = getList('colors').includes(c.value);
              return (
                <button key={c.value} type="button" onClick={() => toggleIn('colors', c.value)} aria-pressed={on} aria-label={`Colour ${c.value}`} title={c.value} className={cn('w-7 h-7 rounded-full ring-1 ring-black/10 flex items-center justify-center', on && 'ring-2 ring-offset-2 ring-on-surface ring-offset-surface-container-lowest')} style={{ background: c.hex }}>
                  {on && <Icon name="check" className="text-[14px] text-white mix-blend-difference" />}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {facets?.materials?.length > 0 && (
        <Section title="Material" defaultOpen={false}>
          {facets.materials.map((m) => (
            <label key={m.value} className="flex items-center gap-2 py-1 cursor-pointer text-[13px]">
              <input type="checkbox" className="w-4 h-4 rounded accent-secondary" checked={getList('materials').includes(m.value)} onChange={() => toggleIn('materials', m.value)} />
              <span className="flex-1">{m.value}</span>
              <span className="text-[11px] text-outline">{m.count}</span>
            </label>
          ))}
        </Section>
      )}

      {facets?.features?.length > 0 && (
        <Section title="Features" defaultOpen={false}>
          {facets.features.map((f) => (
            <label key={f.value} className="flex items-center gap-2 py-1 cursor-pointer text-[13px]">
              <input type="checkbox" className="w-4 h-4 rounded accent-secondary" checked={getList('features').includes(f.value)} onChange={() => toggleIn('features', f.value)} />
              <span className="flex-1">{f.value}</span>
            </label>
          ))}
        </Section>
      )}

      <Section title="Availability">
        <div className="flex flex-col gap-2.5">
          <Toggle checked={get('inStock') === 'true'} onChange={(v) => update({ inStock: v ? 'true' : '' })} label="In stock only" />
          <Toggle checked={get('rating') === '4'} onChange={(v) => update({ rating: v ? '4' : '' })} label="4★ & above" />
          {facets?.onSale > 0 && <Toggle checked={get('onSale') === 'true'} onChange={(v) => update({ onSale: v ? 'true' : '' })} label={`On sale (${facets.onSale})`} />}
        </div>
      </Section>
    </div>
  );
}

/** Round category shortcuts, Flipkart style. Scrolls sideways on phones. */
function CategoryRail({ tree, activeSlug, preset, selectedCategory, onSelectCategory }) {
  const isDepartment = ['men', 'women', 'universal', 'unisex'].includes(preset) || ['travel-utility', 'accessories'].includes(activeSlug);
  const departmentKey = preset === 'unisex' ? 'universal' : (preset || activeSlug);
  const departmentItems = DEPARTMENT_SHORTCUTS[departmentKey];

  if (isDepartment && departmentItems?.length) {
    return (
      <div className="flex gap-3 md:gap-5 overflow-x-auto scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 py-2">
        {departmentItems.map((c) => {
          const isSelected = (!selectedCategory && c.category === '') || selectedCategory === c.category;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectCategory && onSelectCategory(c.category === selectedCategory ? '' : c.category)}
              className="group flex flex-col items-center gap-1.5 shrink-0 w-16 md:w-20 cursor-pointer active:scale-95 transition-transform"
              title={`View ${c.label}`}
            >
              <span
                className={cn(
                  'w-13 h-13 md:w-16 md:h-16 rounded-2xl overflow-hidden flex items-center justify-center ring-2 transition-all shadow-xs',
                  isSelected
                    ? 'ring-secondary ring-offset-2 ring-offset-surface scale-105 shadow-md bg-secondary text-on-secondary'
                    : 'ring-outline-variant/30 group-hover:scale-105 group-hover:ring-secondary/50 bg-surface-container-low text-on-surface'
                )}
              >
                {c.img ? (
                  <img src={imgUrl(c.img, 128)} alt={c.label} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                ) : (
                  <Icon name={c.icon || 'category'} className="text-[24px]" />
                )}
              </span>
              <span className={cn('text-[11px] md:text-[12px] leading-tight text-center w-full truncate', isSelected ? 'font-bold text-secondary' : 'font-medium text-on-surface-variant')}>
                {c.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  const items = [
    { key: 'all', label: 'All', to: '/', icon: 'apps', on: preset === 'home' || (!activeSlug && !['offers', 'men', 'women', 'universal', 'unisex'].includes(preset)) },
    { key: 'men', label: 'Men', to: '/men', icon: 'man', on: preset === 'men' },
    { key: 'women', label: 'Women', to: '/women', icon: 'woman', on: preset === 'women' },
    { key: 'universal', label: 'Universal', to: '/universal', icon: 'public', tone: TAB_TONES.universal, on: preset === 'universal' || preset === 'unisex' },
    { key: 'travel-utility', label: 'Travel', to: '/shop/travel-utility', icon: 'flight_takeoff', tone: TAB_TONES['travel-utility'], on: activeSlug === 'travel-utility' },
    { key: 'accessories', label: 'Accessories', to: '/shop/accessories', icon: 'watch', tone: TAB_TONES.accessories, on: activeSlug === 'accessories' },
    ...(tree || []).filter((c) => !['travel-utility', 'accessories'].includes(c.slug)).map((c) => ({
      key: c._id,
      label: c.name,
      to: `/shop/${c.slug}`,
      tone: categoryTone(c),
      img: c.image?.url || c.children?.find((x) => x.image?.url)?.image?.url,
      on: activeSlug === c.slug || c.children?.some((x) => x.slug === activeSlug),
    })),
    { key: 'offers', label: 'Offers', to: '/offers', icon: 'sell', tone: TAB_TONES.offers, on: preset === 'offers' },
  ];
  const defaultTone = {
    tint: 'bg-zinc-500/10',
    ring: 'ring-zinc-500/40',
    ringOn: 'ring-zinc-600',
    solid: 'bg-zinc-700 text-white',
    text: 'text-zinc-700 dark:text-zinc-300',
    dot: 'bg-zinc-500',
    icon: 'category',
  };
  return (
    <div className="flex gap-3 md:gap-5 overflow-x-auto scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 py-1">
      {items.map((c) => {
        const tone = c.tone || (TAB_TONES && TAB_TONES[c.key]) || (TAB_TONES && TAB_TONES.bags) || (TAB_TONES && TAB_TONES.all) || defaultTone;
        return (
          <Link key={c.key} to={c.to} className="group flex flex-col items-center gap-1 shrink-0 w-14 md:w-16">
            <span
              className={cn(
                'w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex items-center justify-center ring-2 transition-all',
                c.on ? cn(tone.ringOn, 'ring-offset-2 ring-offset-surface') : cn(tone.ring, 'group-hover:scale-105'),
                c.img ? tone.tint : c.on ? tone.solid : cn(tone.tint, tone.text)
              )}
            >
              {c.img ? <img src={imgUrl(c.img, 112)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Icon name={c.icon || 'category'} className="text-[22px]" />}
            </span>
            <span className={cn('text-[11px] leading-tight text-center w-full truncate', c.on ? cn('font-bold', tone.text) : 'font-medium text-on-surface-variant')}>{c.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ActiveFilters({ state, onClear, flatCategories }) {
  const { get, getList, update, toggleIn } = state;
  const chips = [];
  LIST_KEYS.forEach((k) => getList(k).forEach((v) => chips.push([`${k}:${v}`, v, () => toggleIn(k, v)])));
  if (get('category')) {
    const catObj = flatCategories?.find((c) => c.slug === get('category'));
    chips.push(['category', `Category: ${catObj?.name || get('category')}`, () => update({ category: '' })]);
  }
  if (get('gender')) chips.push(['gender', { women: 'Women', men: 'Men', unisex: 'Universal', universal: 'Universal' }[get('gender')] || get('gender'), () => update({ gender: '' })]);
  if (get('minPrice') || get('maxPrice')) chips.push(['price', `₹${get('minPrice') || 0} – ${get('maxPrice') ? `₹${get('maxPrice')}` : 'any'}`, () => update({ minPrice: '', maxPrice: '' })]);
  if (get('inStock')) chips.push(['stock', 'In stock', () => update({ inStock: '' })]);
  if (get('rating')) chips.push(['rating', '4★ & above', () => update({ rating: '' })]);
  if (get('onSale')) chips.push(['sale', 'On sale', () => update({ onSale: '' })]);
  if (get('q')) chips.push(['q', `“${get('q')}”`, () => update({ q: '' })]);
  if (!chips.length) return null;
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
      {chips.map(([key, label, remove]) => (
        <button key={key} type="button" onClick={remove} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-surface-container-lowest border border-surface-container-high text-[12px] whitespace-nowrap capitalize hover:border-outline cursor-pointer">
          {label} <Icon name="close" className="text-[14px] text-outline" />
        </button>
      ))}
      <button type="button" onClick={onClear} className="h-7 px-2 text-[12px] font-semibold text-secondary whitespace-nowrap cursor-pointer">Clear all</button>
    </div>
  );
}

/** Calls onHit when the element scrolls within ~1 screen of the viewport. */
function useNearViewport(onHit, deps) {
  const ref = useRef(null);
  const cb = useRef(onHit);
  cb.current = onHit;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && cb.current(), { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export default function Shop({ preset }) {
  const { category: categorySlug } = useParams();
  const state = useParamState();
  const { get, getList, update, params } = state;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { count: cartCount } = useCart();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const { data: tree } = useCategories();
  const { data: config } = useConfig();
  const isHome = preset === 'home';
  const genderPage = GENDER_PAGES[preset];
  // On the homepage the grid shows one page and links to the full shop, so the sections below stay reachable.
  const infinite = !isHome;
  // Home has its own h1 in the intro; everywhere else the listing title is the page's h1.
  const Heading = isHome ? 'h2' : 'h1';

  const flat = useMemo(() => (tree || []).flatMap((c) => [c, ...c.children]), [tree]);
  const selectedCatParam = get('category');
  const effectiveCategory = categorySlug === 'travel-and-utility'
    ? (selectedCatParam || 'travel-utility')
    : (selectedCatParam || categorySlug);
  const activeCategory = flat.find((c) => c.slug === effectiveCategory);
  const parent = activeCategory?.parent ? flat.find((c) => c._id === activeCategory.parent) : null;

  const query = useMemo(() => {
    const q = Object.fromEntries(params.entries());
    delete q.page;
    if (effectiveCategory) q.category = effectiveCategory;
    if (preset === 'offers') q.onSale = 'true';
    if (genderPage) q.gender = preset === 'universal' ? 'unisex' : preset;
    q.sort = q.sort || 'featured';
    q.limit = PAGE_SIZE;
    return q;
  }, [params, effectiveCategory, preset, genderPage]);

  const products = useInfiniteQuery({
    queryKey: ['products', 'list', query],
    queryFn: ({ pageParam }) => api.products({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
  const gender = genderPage ? (preset === 'universal' ? 'unisex' : preset) : (get('gender') === 'universal' ? 'unisex' : get('gender'));
  const facets = useQuery({
    queryKey: ['facets', effectiveCategory, get('q'), gender],
    queryFn: () => api.facets({ category: effectiveCategory, q: get('q'), gender }),
    select: (d) => d.facets,
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo(() => products.data?.pages.flatMap((p) => p.items) || [], [products.data]);
  const total = products.data?.pages[0]?.total;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = products;
  const sentinel = useNearViewport(() => infinite && hasNextPage && !isFetchingNextPage && fetchNextPage(), [hasNextPage, isFetchingNextPage, items.length]);

  const activeCount = FILTER_KEYS.reduce((n, k) => n + (LIST_KEYS.includes(k) ? getList(k).length : get(k) ? 1 : 0), 0) + (selectedCatParam ? 1 : 0);
  const clearAll = () => update(Object.fromEntries([...FILTER_KEYS, 'q', 'category'].map((k) => [k, ''])));
  const title =
    preset === 'offers'
      ? 'Offers'
      : genderPage && activeCategory
      ? `${genderPage.title}’s ${activeCategory.name}`
      : genderPage?.title ||
        activeCategory?.name ||
        (get('q') ? `Results for “${get('q')}”` : get('gender') === 'women' ? 'Women' : get('gender') === 'men' ? 'Men' : get('gender') === 'unisex' || get('gender') === 'universal' ? 'Universal' : get('featured') ? 'Featured' : get('bestseller') ? 'Best sellers' : get('newArrival') ? 'New arrivals' : 'All products');
  const description = activeCategory?.tagline || 'Modern bags, backpacks and travel gear with tracked delivery and 7-day returns.';
  const setSort = (v) => update({ sort: v === 'featured' ? '' : v });

  const crumbs = [{ label: 'Home', to: '/' }];
  if (genderPage) {
    crumbs.push({ label: genderPage.title, to: preset === 'universal' ? '/universal' : `/${preset}` });
    if (activeCategory) crumbs.push({ label: activeCategory.name });
  } else {
    crumbs.push({ label: 'Shop', to: '/shop' });
    if (parent) crumbs.push({ label: parent.name, to: `/shop/${parent.slug}` });
    crumbs.push({ label: title });
  }
  const canonical = isHome ? '/' : categorySlug ? `/shop/${categorySlug}` : genderPage ? (preset === 'unisex' ? '/universal' : `/${preset}`) : preset === 'offers' ? '/offers' : '/shop';
  const filtered = [...FILTER_KEYS, 'q', 'sort', 'category'].some((k) => get(k));
  const listLd = items.length && !filtered ? [itemListLd(items.slice(0, 24))] : [];

  const filters = <Filters facets={facets.data} state={state} categoryTree={tree} activeCategory={activeCategory} lockedGender={Boolean(genderPage)} />;

  return (
    <>
      {!isHome && (
        <Seo
          title={genderPage && activeCategory ? `${genderPage.title}’s ${activeCategory.name} — WILDTANE` : genderPage ? genderPage.seoTitle : activeCategory ? `Buy ${activeCategory.name} Online` : title}
          description={genderPage ? genderPage.description : `${description} Shop ${activeCategory?.name?.toLowerCase() || 'bags'} at WILDTANE.`}
          canonical={canonical}
          image={genderPage?.image}
          noindex={Boolean(get('q'))}
          jsonLd={[breadcrumbLd(crumbs), ...listLd]}
        />
      )}

      {/* Desktop Department / Collection Hero (Men, Women, Unisex, Offers, or Master Shop) */}
      {!get('q') && (
        <div className="hidden md:block">
          {genderPage ? (
            <DepartmentHero
              page={genderPage}
              current={preset}
              selectedCategory={selectedCatParam}
              onSelectCategory={(c) => update({ category: c })}
            />
          ) : preset === 'offers' ? (
            <DepartmentHero page={OFFERS_PAGE} current="offers" />
          ) : !isHome && !categorySlug ? (
            <DepartmentHero page={SHOP_PAGE} current="shop" />
          ) : null}
        </div>
      )}

      {/* Category Rail (hidden when searching so results appear at the top) */}
      {!get('q') && (
        <div className="container-x pt-2 md:pt-4">
          <CategoryRail
            tree={tree}
            activeSlug={effectiveCategory}
            preset={preset}
            selectedCategory={selectedCatParam}
            onSelectCategory={(c) => update({ category: c })}
          />
        </div>
      )}

      {/* ── MOBILE VIEW (< md): FLIPKART MOBILE SEARCH & FILTER TOP BAR ── */}
      <div className="md:hidden sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant/30 shadow-xs">
        {/* Top Search & Nav Row */}
        <div className="px-2.5 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (get('q')) {
                update({ q: '' });
              } else if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface active:scale-90 transition-transform shrink-0"
            aria-label="Back"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>

          {/* Flipkart Interactive Search Pill */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => dispatch(setSearchOpen(true))}
            className="flex-1 h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between text-on-surface text-[12.5px] cursor-pointer shadow-xs active:bg-surface-container transition-colors"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Icon name="search" className="text-[18px] text-secondary shrink-0" />
              <span className="truncate font-medium text-[12.5px]">
                {get('q') ? (
                  <span className="text-on-surface font-bold">"{get('q')}"</span>
                ) : activeCategory ? (
                  `Search in ${activeCategory.name}...`
                ) : genderPage ? (
                  `Search in ${genderPage.title}...`
                ) : (
                  <span className="text-outline">Search Bags, Backpacks, Luggage...</span>
                )}
              </span>
            </div>
            {get('q') ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  update({ q: '' });
                }}
                className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-outline active:scale-90 shrink-0"
                aria-label="Clear query"
              >
                <Icon name="close" className="text-[13px]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(setSearchOpen({ open: true, voice: true }));
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-secondary active:scale-90 shrink-0"
                aria-label="Voice Search"
                title="Voice Search"
              >
                <Icon name="mic" className="text-[17px]" />
              </button>
            )}
          </div>

          {/* Cart Icon with Live Badge */}
          <button
            type="button"
            onClick={() => dispatch(setCartOpen(true))}
            className="relative w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface active:scale-90 transition-transform shrink-0"
            aria-label="Shopping Cart"
          >
            <Icon name="shopping_bag" className="text-[20px]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-secondary text-on-secondary text-[9px] font-black flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Sticky Sort & Filter Row */}
        <div className="grid grid-cols-2 divide-x divide-outline-variant/30 border-t border-outline-variant/20 h-10 text-[12.5px] font-bold">
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            className="flex items-center justify-center gap-1.5 active:bg-surface-container transition-colors"
          >
            <Icon name="swap_vert" className="text-[17px]" /> Sort
            {query.sort !== 'featured' && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileFilters(true)}
            className="flex items-center justify-center gap-1.5 active:bg-surface-container transition-colors"
          >
            <Icon name="tune" className="text-[17px]" /> Filter
            {activeCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-secondary text-on-secondary text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Flipkart Quick Filter Pill Strip on Mobile */}
        <div className="bg-surface-container-lowest border-t border-outline-variant/20 px-2.5 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1.5 touch-pan-x">
          <button
            type="button"
            onClick={() => {
              if (get('rating') === '4' && get('inStock') === 'true') {
                update({ rating: '', inStock: '' });
              } else {
                update({ rating: '4', inStock: 'true' });
              }
            }}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 transition-all border flex items-center gap-1',
              get('rating') === '4' && get('inStock') === 'true'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
            )}
          >
            <Icon name="bolt" className="text-[12px]" /> Assured
          </button>
          <button
            type="button"
            onClick={() => update({ onSale: get('onSale') ? '' : 'true' })}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 transition-all border flex items-center gap-1',
              get('onSale') ? 'bg-secondary text-on-secondary border-secondary shadow-xs' : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
            )}
          >
            <Icon name="local_offer" className="text-[12px]" /> On Sale
          </button>
          <button
            type="button"
            onClick={() => update({ rating: get('rating') === '4' ? '' : '4' })}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 transition-all border flex items-center gap-1',
              get('rating') === '4' ? 'bg-secondary text-on-secondary border-secondary shadow-xs' : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
            )}
          >
            <Icon name="star" className="text-[12px] text-amber-500" /> 4★ & Above
          </button>
          <button
            type="button"
            onClick={() => update({ inStock: get('inStock') ? '' : 'true' })}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 transition-all border flex items-center gap-1',
              get('inStock') ? 'bg-secondary text-on-secondary border-secondary shadow-xs' : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
            )}
          >
            <Icon name="verified" className="text-[12px] text-emerald-600" /> In Stock
          </button>
          <button
            type="button"
            onClick={() => update({ maxPrice: get('maxPrice') === '5000' ? '' : '5000' })}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 transition-all border flex items-center gap-1',
              get('maxPrice') === '5000' ? 'bg-secondary text-on-secondary border-secondary shadow-xs' : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
            )}
          >
            Under ₹5,000
          </button>
          <button
            type="button"
            onClick={() => update({ maxPrice: get('maxPrice') === '10000' ? '' : '10000' })}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 transition-all border flex items-center gap-1',
              get('maxPrice') === '10000' ? 'bg-secondary text-on-secondary border-secondary shadow-xs' : 'bg-surface-container-low border-outline-variant/40 text-on-surface'
            )}
          >
            Under ₹10,000
          </button>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="px-2.5 py-1 rounded-full text-[10.5px] font-bold shrink-0 bg-surface-container border border-outline-variant/40 text-secondary"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Flipkart Mobile Search Result Header */}
      {get('q') && (
        <div className="md:hidden mx-2.5 mt-2 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <Icon name="search" className="text-[17px] text-secondary shrink-0" />
            <span className="text-[12px] text-on-surface truncate">
              Showing results for <strong className="text-secondary font-bold">"{get('q')}"</strong>
              <span className="text-outline ml-1">({total ?? items.length})</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => update({ q: '' })}
            className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-outline active:scale-90 shrink-0"
            aria-label="Clear search"
          >
            <Icon name="close" className="text-[14px]" />
          </button>
        </div>
      )}

      <div className="container-x py-2 md:py-4 flex gap-4 items-start">
        <aside className="hidden lg:block w-60 shrink-0 sticky top-[72px] max-h-[calc(100vh/var(--zoom,1)-88px)] overflow-y-auto scrollbar-none bg-surface-container-lowest rounded-xl px-4 py-1" aria-label="Filters">
          <div className="flex items-center justify-between pt-3 pb-1">
            <span className="text-[14px] font-semibold">Filters</span>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="text-[12px] font-semibold text-secondary">Clear all</button>
            )}
          </div>
          {filters}
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className={cn('flex items-baseline gap-2 flex-wrap', get('q') && 'hidden md:flex')}>
              <Heading className="font-display text-[22px] md:text-[28px] leading-tight">{title}</Heading>
              {total != null && <span className="text-[12px] text-outline">{total} item{total === 1 ? '' : 's'}</span>}
            </div>
            {activeCategory?.tagline && <p className="-mt-1 text-[13px] text-on-surface-variant max-w-2xl">{activeCategory.tagline}</p>}
            <div className="hidden lg:flex items-center gap-1 text-[13px] overflow-x-auto scrollbar-none">
              <span className="font-semibold mr-2 whitespace-nowrap">Sort by</span>
              {SORTS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSort(v)}
                  className={cn('h-8 px-3 rounded-full whitespace-nowrap transition-colors', query.sort === v ? 'bg-on-surface text-surface-container-lowest font-semibold' : 'text-on-surface-variant hover:bg-surface-container-lowest')}
                >
                  {label}
                </button>
              ))}
            </div>
            <ActiveFilters state={state} onClear={clearAll} flatCategories={flat} />
          </div>

          {products.isError ? (
            <ErrorState error={products.error} onRetry={products.refetch} />
          ) : products.data && items.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center text-center">
              <span className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-3">
                <Icon name="search_off" className="text-[32px]" />
              </span>
              <h2 className="text-[17px] font-bold text-on-surface">
                {get('q') ? `No results found for “${get('q')}”` : 'No products match your filters'}
              </h2>
              <p className="text-[12.5px] text-outline max-w-sm mt-1">
                {get('q')
                  ? 'Please check the spelling or try searching for something broader like Backpack, Tote, or Luggage.'
                  : 'Try removing some filters to see more bags from the collection.'}
              </p>
              
              {/* Popular Category Chips */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-xs">
                {['Backpacks', 'Cabin Luggage', 'Handbags', 'Duffles', 'Wallets'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => update({ q: cat.toLowerCase() })}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-[11.5px] font-semibold text-on-surface hover:bg-surface-container active:scale-95 transition-all"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={clearAll}
                className="mt-5 btn-primary text-[13px] px-5 py-2.5 rounded-xl"
              >
                Explore All Products
              </button>
            </div>
          ) : (
            <div className={cn(GRID_COLS, 'transition-opacity', products.isPlaceholderData && 'opacity-60')}>
              {!products.data
                ? Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={i} />)
                : items.map((p, i) => <ProductCard key={p._id} product={p} priority={i < 6} />)}
              {isFetchingNextPage && Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={`more-${i}`} />)}
            </div>
          )}

          <div ref={sentinel} className="flex justify-center py-4 min-h-[1px]">
            {!infinite && items.length > 0 ? (
              <Link to={`/shop${params.toString() ? `?${params.toString()}` : ''}`} className="btn-primary">
                View all {total ?? ''} products <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
            ) : hasNextPage ? (
              <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="btn-tonal btn-sm">
                {isFetchingNextPage ? <Spinner /> : 'Load more'}
              </button>
            ) : items.length > 0 ? (
              <span className="text-[12px] text-outline">You've seen all {total} products</span>
            ) : null}
          </div>
        </section>
      </div>

      <Drawer
        open={mobileFilters}
        onClose={() => setMobileFilters(false)}
        side="right"
        title="Filters"
        width="max-w-sm"
        footer={
          <div className="flex gap-2">
            <button type="button" className="btn-tonal flex-1" onClick={clearAll} disabled={!activeCount}>Clear</button>
            <button type="button" className="btn-primary flex-[2]" onClick={() => setMobileFilters(false)}>Show {total ?? ''} results</button>
          </div>
        }
      >
        <div className="px-5 py-1">{filters}</div>
      </Drawer>

      <Modal open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by" size="sm">
        <div className="flex flex-col -mx-2">
          {SORTS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setSort(v);
                setSortOpen(false);
              }}
              className="flex items-center justify-between px-2 h-11 rounded-lg text-[14px] hover:bg-surface-container"
            >
              <span className={cn(query.sort === v && 'font-semibold')}>{label}</span>
              <span className={cn('w-4 h-4 rounded-full border-2', query.sort === v ? 'border-secondary bg-secondary shadow-[inset_0_0_0_2px_rgb(var(--c-surface-container-lowest))]' : 'border-outline-variant')} />
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
