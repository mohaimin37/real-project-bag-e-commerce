import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, imgUrl } from '../lib/format';
import { TAB_TONES, categoryTone } from '../lib/categoryTone';
import { useCategories, useConfig, useMoney } from '../hooks/useStore';
import { useCart } from '../hooks/useCart';
import { setCartOpen, setSearchOpen } from '../store';
import { GRID_COLS, ProductCard, ProductCardSkeleton } from '../components/product';
import Seo, { breadcrumbLd, itemListLd } from '../components/Seo';
import { Drawer, ErrorState, Icon, Modal, Spinner, Toggle } from '../components/ui';
import ShopWidgetsBar from '../components/layout/ShopWidgetsBar';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import { BAGS } from '../content/taxonomy';
import { prefersReducedMotion } from '../theme/engine';
import GroupedProducts from '../components/GroupedProducts';
import ClothingCategoryMenu from '../components/layout/ClothingCategoryMenu';
import { OffersCarousel, YourOffersStrip } from '../components/offers';
import { LogoMark } from '../components/Brand';


const PAGE_SIZE = 24;

const SORTS = [
  ['featured', 'Relevance'],
  ['bestseller', 'Popularity'],
  ['price-low', 'Price — Low to High'],
  ['price-high', 'Price — High to Low'],
  ['highest-rated', 'Top rated'],
  ['newest', 'Newest first'],
  ['discount', 'Highest discount'],
];

const LIST_KEYS = ['materials', 'colors', 'features', 'size', 'purpose', 'occasion', 'closure'];
const FILTER_KEYS = [...LIST_KEYS, 'minPrice', 'maxPrice', 'inStock', 'rating', 'onSale', 'gender', 'minDiscount', 'bestseller', 'newArrival', 'laptop', 'waterResistant'];
const DISCOUNT_STEPS = [['10', '10% off or more'], ['25', '25% off or more'], ['40', '40% off or more']];

// Plain-language filter options (values match the API).
const WHO = [['', 'All'], ['men', 'Men'], ['women', 'Women'], ['unisex', 'Universal']];
const USES = [
  ['work', 'Work & office'],
  ['travel', 'Travel'],
  ['transit', 'Daily commute'],
  ['business', 'Meetings'],
  ['creative', 'Studio & hobbies'],
  ['college', 'College'],
  ['gym', 'Gym'],
  ['everyday', 'Everyday'],
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
    gradientBg: 'from-blue-600/15 via-indigo-600/10 to-rose-500/15',
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
      { label: 'Featherlight Weight Balance', icon: 'air' },
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
  gradientBg: 'from-rose-500/15 via-rose-500/10 to-indigo-500/15',
  borderGlow: 'border-rose-500/30',
  accentText: 'text-rose-600 dark:text-rose-400',
  stats: [
    { label: '7-Day Easy Returns', icon: 'verified' },
    { label: 'Cash on Delivery', icon: 'payments' },
    { label: 'Free Delivery over ₹10,000', icon: 'local_shipping' },
    { label: 'Secure Checkout', icon: 'lock' },
  ],
};

// /bags: every bag across Men, Women and Unisex (recommended addition; same hero design as the other departments).
const BAGS_PAGE = {
  title: 'Bags',
  seoTitle: 'Bags for Men & Women — Handbags, Backpacks, Laptop & Travel Bags | WILDTANE',
  description: 'Shop all WILDTANE bags in one place: handbags, totes, backpacks, laptop bags, briefcases, duffels, cabin and travel bags for men, women and everyone.',
  tagline: 'Every WILDTANE bag in one place — browse by type, by who it’s for, or by what you need it for.',
  image: '/uploads/seed/terminal-traveler.jpg',
  eyebrow: 'ALL BAGS • MEN • WOMEN • UNISEX',
  gradientTitle: 'Find The Right Carry',
  tag: 'Men · Women · Unisex',
  gradientBg: 'from-indigo-500/15 via-sky-500/10 to-emerald-500/15',
  borderGlow: 'border-indigo-500/30',
  accentText: 'text-indigo-600 dark:text-indigo-400',
  stats: [
    { label: 'Men, Women & Unisex', icon: 'group' },
    { label: 'Work, College & Travel', icon: 'work' },
    { label: '7-Day Returns', icon: 'published_with_changes' },
    { label: 'Tracked Delivery', icon: 'local_shipping' },
  ],
};

// /new-arrivals and /bestsellers: listings driven by the product flags set in Admin → Products.
const FLAG_PAGES = {
  new: {
    path: '/new-arrivals',
    title: 'New arrivals',
    seoTitle: 'New Arrivals — Latest Bags & Accessories | WILDTANE',
    description: 'The newest WILDTANE bags, backpacks, wallets and travel gear.',
    query: { newArrival: 'true' },
    sort: 'newest',
  },
  bestsellers: {
    path: '/bestsellers',
    title: 'Bestsellers',
    seoTitle: 'Bestsellers — Most-Loved Bags & Accessories | WILDTANE',
    description: 'WILDTANE’s most-bought bags, backpacks, wallets and travel gear.',
    query: { bestseller: 'true' },
    sort: 'bestseller',
  },
};

const DEPARTMENT_NAV = [
  { key: 'shop', label: 'All Products', to: '/shop' },
  { key: 'men', label: 'Men', to: '/men' },
  { key: 'women', label: 'Women', to: '/women' },
  { key: 'bags', label: 'Bags', to: '/bags' },
  { key: 'universal', label: 'Universal', to: '/universal' },
  { key: 'travel', label: 'Travel & Utility', to: '/shop/travel-utility' },
  { key: 'accessories', label: 'Accessories', to: '/shop/accessories' },
  { key: 'offers', label: 'Offers', to: '/offers' },
];

export const DEPARTMENT_SHORTCUTS = {
  bags: [
    { key: 'all', label: 'All Bags', category: '', icon: 'shopping_bag', img: '/uploads/seed/terminal-traveler.jpg' },
    { key: 'backpacks', label: 'Backpacks', category: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg' },
    { key: 'handbags', label: 'Handbags & Totes', category: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-sienna.jpg' },
    { key: 'laptop-bags', label: 'Laptop Bags', category: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
    { key: 'office-bags', label: 'Briefcases', category: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg' },
    { key: 'cabin-luggage', label: 'Cabin Luggage', category: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg' },
    { key: 'duffle-bags', label: 'Travel Duffels', category: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
    { key: 'crossbody-bags', label: 'Crossbody & Slings', category: 'crossbody-bags', icon: 'work', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
    { key: 'clutches', label: 'Clutches', category: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg' },
    { key: 'wallets', label: 'Wallets', category: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
  ],
  men: [
    { key: 'all', label: 'All Men', category: '', icon: 'man', img: '/uploads/seed/briefcase-black.jpg' },
    { key: 'office-bags', label: 'Briefcases', category: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg' },
    { key: 'laptop-bags', label: 'Laptop Bags', category: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
    { key: 'messenger-bags', label: 'Messengers', category: 'messenger-bags', icon: 'backpack', img: '/uploads/seed/catalog/messenger-dalton.jpg' },
    { key: 'wallets', label: 'Wallets', category: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
    { key: 'duffle-bags', label: 'Duffles & Travel', category: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/catalog/duffle-highway.jpg' },
    { key: 'backpacks', label: 'Backpacks', category: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-black.jpg' },
    { key: 'belts', label: 'Belts', category: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
    { key: 't-shirts', label: 'T-Shirts', category: 't-shirts', icon: 'checkroom', img: '/uploads/seed/catalog/tote-cotton.jpg' },
    { key: 'accessories', label: 'All Accessories', category: 'accessories', icon: 'watch', img: '/uploads/seed/catalog/keyset-onyx.jpg' },
  ],
  women: [
    { key: 'all', label: 'All Women', category: '', icon: 'woman', img: '/uploads/seed/handbag-rose.jpg' },
    { key: 'handbags', label: 'Handbags', category: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-sienna.jpg' },
    { key: 'tote-bags', label: 'Totes', category: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/tote-ochre.jpg' },
    { key: 'crossbody-bags', label: 'Crossbody', category: 'crossbody-bags', icon: 'backpack', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
    { key: 'clutches', label: 'Clutches', category: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg' },
    { key: 'shoulder-bags', label: 'Shoulder Bags', category: 'shoulder-bags', icon: 'shopping_bag', img: '/uploads/seed/handbag-rose.jpg' },
    { key: 'beach-straw-bags', label: 'Beach Bags', category: 'beach-straw-bags', icon: 'beach_access', img: '/uploads/seed/catalog/straw-riviera.jpg' },
    { key: 'wallets', label: 'Wallets', category: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-zip.jpg' },
    { key: 'perfumes', label: 'Perfumes', category: 'perfumes', icon: 'local_florist', img: '/uploads/seed/catalog/bottle-lilac.jpg' },
    { key: 'belts', label: 'Belts', category: 'belts', icon: 'styler', img: '/uploads/seed/catalog/beltbag-grey.jpg' },
    { key: 'accessories', label: 'All Accessories', category: 'accessories', icon: 'watch', img: '/uploads/seed/catalog/raffia-tassel.jpg' },
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
    { key: 'passport-holders', label: 'Passport Wallets', category: 'passport-holders', icon: 'badge', img: '/uploads/seed/catalog/passport-atlas.jpg' },
    { key: 'keychains', label: 'Keychains & Fobs', category: 'keychains', icon: 'vpn_key', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
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
              <span className="bg-gradient-to-r from-rose-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">
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

/**
 * Men / Women / Universal: one photo card per main category of the shopper's products (Bags,
 * Clothing, Walletsâ€¦), with a real product photo and item count. Picking one filters the page; its
 * subcategories then appear in the filter panel's "Category" section, as on the Clothing page.
 * Desktop: one even row (wraps if needed). Phones: a swipeable row.
 */
const CARD = 'group relative shrink-0 snap-start w-[112px] sm:w-[128px] md:w-auto aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all duration-300';

function CategoryCircles({ items, activeSlug, onPick, label, total, loading }) {
  // Phones: keep the picked card in view in the swipeable row (horizontal scroll only, never the page).
  const listRef = useRef(null);
  useEffect(() => {
    const ul = listRef.current;
    const card = ul?.querySelector('[aria-pressed="true"]');
    if (!ul || !card || ul.scrollWidth <= ul.clientWidth) return;
    const left = card.offsetLeft - (ul.clientWidth - card.offsetWidth) / 2;
    ul.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeSlug, items.length]);
  const cols = 'md:grid md:grid-cols-4 lg:grid-cols-7';
  const shell = (children) => (
    <nav aria-label={label} className="mb-5 rounded-3xl border border-surface-container-high bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-secondary/5 shadow-xs p-3 md:p-5">
      <div className="flex items-end justify-between gap-2 px-1 pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-secondary">Categories</p>
          <h2 className="font-display text-[19px] md:text-[23px] leading-tight text-on-surface">{label}</h2>
        </div>
        {!loading && <span className="hidden sm:inline text-[11.5px] text-outline font-medium shrink-0">{items.length} categories · {total} items</span>}
      </div>
      {children}
    </nav>
  );
  // Same size while loading, so the products below don't jump when the cards arrive.
  if (loading) {
    return shell(
      <div className={cn('flex gap-2.5 md:gap-3 overflow-hidden', cols)} aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => <div key={i} className={cn(CARD, 'bg-surface-container animate-pulse')} />)}
      </div>
    );
  }
  if (items.length < 2) return null;
  const isAll = !activeSlug;
  return shell(
    <ul ref={listRef} className={cn('flex gap-2.5 md:gap-3 overflow-x-auto md:overflow-visible snap-x scrollbar-none -mx-1 px-1 pb-1 touch-pan-x', cols)}>
      <li className="contents">
        <button
          type="button"
          onClick={() => onPick('')}
          aria-pressed={isAll}
          className={cn(CARD, 'bg-gradient-to-br from-secondary via-secondary/85 to-primary text-on-secondary flex flex-col justify-between p-3', isAll ? 'ring-2 ring-secondary ring-offset-2 ring-offset-surface shadow-lg' : 'opacity-90 hover:opacity-100 hover:-translate-y-0.5 hover:shadow-md')}
        >
          <Icon name="apps" className="text-[30px]" />
          <span>
            <span className="block text-[15px] font-bold leading-tight">All</span>
            <span className="block text-[11.5px] opacity-85">{total} items</span>
          </span>
        </button>
      </li>
      {items.map((c) => {
        const on = activeSlug === c.slug;
        return (
          <li key={c.slug} className="contents">
            <button
              type="button"
              onClick={() => onPick(on ? '' : c.slug)}
              aria-pressed={on}
              title={`${c.name} (${c.count})`}
              className={cn(CARD, 'bg-surface-container', on ? 'ring-2 ring-secondary ring-offset-2 ring-offset-surface shadow-lg' : 'hover:-translate-y-0.5 hover:shadow-md')}
            >
              {c.img ? (
                <img src={imgUrl(c.img, 320)} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-secondary"><Icon name="category" className="text-[34px]" /></span>
              )}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              {on && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow">
                  <Icon name="check" className="text-[16px]" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                <span className="block text-[13.5px] md:text-[14.5px] font-bold leading-tight drop-shadow">{c.name}</span>
                <span className="block text-[11px] text-white/80">{c.count} item{c.count === 1 ? '' : 's'}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
function Filters({ facets, state, flat, activeCategory, lockedGender, lockedFlag, mainCategories }) {
  const { get, getList, update, toggleIn } = state;
  const money = useMoney();
  const [min, setMin] = useState(get('minPrice'));
  const [max, setMax] = useState(get('maxPrice'));
  useEffect(() => {
    setMin(get('minPrice'));
    setMax(get('maxPrice'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.params]);
  // Look the parent up at any depth (not just top level), so a subcategory page keeps its siblings.
  const parentCat = activeCategory?.parentRef || null;
  const subcats = (activeCategory?.children?.some((c) => c.productCount > 0)
    ? activeCategory.children
    : parentCat?.children?.length
      ? parentCat.children
      : null
  )?.filter((c) => c.productCount > 0);
  const listParent = activeCategory?.children?.some((c) => c.productCount > 0) ? activeCategory : parentCat;

  return (
    <div className="flex flex-col">
      {/* Men / Women before a category is picked: the main categories, like Clothing's list. */}
      {lockedGender && !activeCategory && mainCategories?.length > 0 && (
        <Section title="Category">
          <div className="flex flex-col">
            {mainCategories.map((c) => (
              <button key={c.slug} type="button" onClick={() => update({ category: c.slug })} className="flex items-center justify-between py-1.5 text-[13px] hover:text-secondary text-left transition-colors">
                <span>{c.name}</span>
                <span className="text-[11px] text-outline">{c.count}</span>
              </button>
            ))}
          </div>
        </Section>
      )}
      {subcats?.length > 0 && (
        <Section title="Category">
          <div className="flex flex-col">
            {/* Men / Women: back to every category, or from a subcategory up to its main category. */}
            {lockedGender && (
              <button type="button" onClick={() => update({ category: parentCat && listParent === parentCat ? parentCat.slug : '' })} className="flex items-center gap-1 py-1.5 text-[13px] text-on-surface-variant hover:text-secondary text-left">
                <Icon name="chevron_left" className="text-[16px]" /> {parentCat && listParent === parentCat ? `All ${parentCat.name}` : 'All categories'}
              </button>
            )}
            {/* Way back up to the parent, shown while a subcategory is selected. */}
            {!lockedGender && parentCat && listParent === parentCat && (
              <Link to={`/shop/${parentCat.slug}`} className="flex items-center gap-1 py-1.5 text-[13px] text-on-surface-variant hover:text-secondary">
                <Icon name="chevron_left" className="text-[16px]" /> All {parentCat.name}
              </Link>
            )}
            {subcats.map((c) => {
              const isSelected = String(activeCategory?._id) === String(c._id) || activeCategory?.slug === c.slug;
              const targetTo = isSelected && parentCat ? `/shop/${parentCat.slug}` : `/shop/${c.slug}`;
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
                <Link key={c._id} to={targetTo} className={cn('flex items-center justify-between py-1.5 text-[13px] hover:text-secondary', isSelected && 'text-secondary font-semibold')}>
                  <span>{c.name}</span>
                  {c.productCount > 0 && <span className="text-[11px] text-outline">{c.productCount}</span>}
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

      {/* Blueprint filters: Discount, Best Seller, New Arrival — shown only when products qualify. */}
      {DISCOUNT_STEPS.some(([d]) => facets?.discounts?.[d] > 0) && (
        <Section title="Discount">
          <div className="flex flex-wrap gap-1.5">
            {DISCOUNT_STEPS.filter(([d]) => facets.discounts[d] > 0 || get('minDiscount') === d).map(([d, label]) => (
              <Chip key={d} on={get('minDiscount') === d} onClick={() => update({ minDiscount: get('minDiscount') === d ? '' : d })} count={facets.discounts[d]}>{label}</Chip>
            ))}
          </div>
        </Section>
      )}

      {facets?.occasions?.length > 0 && (
        <Section title="Occasion" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {facets.occasions.map((o) => (
              <Chip key={o.value} on={getList('occasion').includes(o.value)} onClick={() => toggleIn('occasion', o.value)} count={o.count}>
                <span className="capitalize">{o.value}</span>
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {facets?.laptop?.length > 0 && (
        <Section title="Fits laptop" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {facets.laptop.map((l) => (
              <Chip key={l.value} on={get('laptop') === String(l.value)} onClick={() => update({ laptop: get('laptop') === String(l.value) ? '' : String(l.value) })} count={l.count}>{l.value}″ & up</Chip>
            ))}
          </div>
        </Section>
      )}

      {facets?.closures?.length > 0 && (
        <Section title="Closure" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {facets.closures.map((c) => (
              <Chip key={c.value} on={getList('closure').includes(c.value)} onClick={() => toggleIn('closure', c.value)} count={c.count}>
                <span className="capitalize">{c.value}</span>
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="Availability">
        <div className="flex flex-col gap-2.5">
          <Toggle checked={get('inStock') === 'true'} onChange={(v) => update({ inStock: v ? 'true' : '' })} label="In stock only" />
          <Toggle checked={get('rating') === '4'} onChange={(v) => update({ rating: v ? '4' : '' })} label="4★ & above" />
          {facets?.onSale > 0 && <Toggle checked={get('onSale') === 'true'} onChange={(v) => update({ onSale: v ? 'true' : '' })} label={`On sale (${facets.onSale})`} />}
          {!lockedFlag && facets?.bestseller > 0 && <Toggle checked={get('bestseller') === 'true'} onChange={(v) => update({ bestseller: v ? 'true' : '' })} label={`Best sellers (${facets.bestseller})`} />}
          {!lockedFlag && facets?.newArrival > 0 && <Toggle checked={get('newArrival') === 'true'} onChange={(v) => update({ newArrival: v ? 'true' : '' })} label={`New arrivals (${facets.newArrival})`} />}
          {facets?.waterResistant > 0 && <Toggle checked={get('waterResistant') === 'true'} onChange={(v) => update({ waterResistant: v ? 'true' : '' })} label={`Water-resistant (${facets.waterResistant})`} />}
        </div>
      </Section>
    </div>
  );
}

/** Round category shortcuts, Flipkart style. Scrolls sideways on phones. */
function CategoryRail({ tree, activeSlug, rootSlug, preset, selectedCategory, onSelectCategory, onNavigate }) {
  const inBranch = (slug) => activeSlug === slug || rootSlug === slug;
  // Travel & Utility and Accessories keep their own rail on every page inside them (e.g. Cabin Luggage),
  // so the subcategory options never disappear once one is chosen.
  const branch = ['travel-utility', 'accessories'].includes(rootSlug) && !preset ? rootSlug : null;
  const isDepartment = ['men', 'women', 'universal', 'unisex'].includes(preset) || Boolean(branch);
  const departmentKey = preset === 'unisex' ? 'universal' : (preset || branch);
  let departmentItems = DEPARTMENT_SHORTCUTS[departmentKey];
  if (branch) {
    // Built from the live category tree (admin-managed), reusing the existing shortcut artwork by slug.
    const root = tree?.find((c) => c.slug === branch);
    const art = new Map(DEPARTMENT_SHORTCUTS[branch].map((s) => [s.category, s]));
    const kids = (root?.children || []).filter((c) => c.productCount > 0);
    if (kids.length) {
      departmentItems = [
        art.get(''),
        ...kids.map((c) => ({
          key: c.slug,
          label: art.get(c.slug)?.label || c.name,
          category: c.slug,
          icon: art.get(c.slug)?.icon || 'category',
          img: art.get(c.slug)?.img || c.image?.url || '',
        })),
      ];
    }
  }

  if (isDepartment && departmentItems?.length) {
    return (
      // Wraps onto more lines instead of scrolling sideways, so every option stays on screen.
      <div className="flex flex-wrap gap-x-2 gap-y-3 sm:gap-x-3 md:gap-x-5 py-2">
        {departmentItems.map((c) => {
          const isSelected = branch
            ? (c.category || branch) === activeSlug
            : (!selectedCategory && c.category === '') || selectedCategory === c.category;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                branch
                  ? onNavigate(`/shop/${c.category || branch}`) // a real page per subcategory, so Back returns to the previous one
                  : onSelectCategory && onSelectCategory(c.category === selectedCategory ? '' : c.category)
              }
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
    { key: 'all', label: 'Explore All', to: '/shop', icon: 'apps', on: (!preset || preset === 'shop') && !activeSlug && !selectedCategory },
    { key: 'men', label: 'Men', to: '/men', icon: 'man', on: preset === 'men' },
    { key: 'women', label: 'Women', to: '/women', icon: 'woman', on: preset === 'women' },
    // A short fixed set that always fits on one screen (phones included); every other category
    // is one tap away inside these pages and in the menus.
    { key: 'bags', label: 'Bags', to: '/bags', icon: 'shopping_bag', tone: TAB_TONES.bags, on: preset === 'bags' },
    { key: 'travel-utility', label: 'Travel', to: '/shop/travel-utility', icon: 'flight_takeoff', tone: TAB_TONES['travel-utility'], on: inBranch('travel-utility') },
    // Soft hyphen: wraps as "Acces-sories" only where a phone is too narrow for one line.
    { key: 'accessories', label: 'Acces­sories', to: '/shop/accessories', icon: 'watch', tone: TAB_TONES.accessories, on: inBranch('accessories') },
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
    <div className="grid grid-cols-7 gap-1 sm:gap-3 md:flex md:justify-start md:gap-5 py-1">
      {items.map((c) => {
        const tone = c.tone || (TAB_TONES && TAB_TONES[c.key]) || (TAB_TONES && TAB_TONES.bags) || (TAB_TONES && TAB_TONES.all) || defaultTone;
        return (
          <Link
            key={c.key}
            to={c.to}
            onClick={() => {
              if (c.key === 'all' && onSelectCategory) onSelectCategory('');
            }}
            className="group flex flex-col items-center gap-1 min-w-0 md:shrink-0 md:w-20"
          >
            <span
              className={cn(
                'w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex items-center justify-center ring-2 transition-all',
                c.on ? cn(tone.ringOn, 'ring-offset-2 ring-offset-surface') : cn(tone.ring, 'group-hover:scale-105'),
                c.img ? tone.tint : c.on ? tone.solid : cn(tone.tint, tone.text)
              )}
            >
              {c.img ? <img src={imgUrl(c.img, 112)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <Icon name={c.icon || 'category'} className="text-[22px]" />}
            </span>
            <span className={cn('text-[10px] sm:text-[11px] leading-tight text-center w-full line-clamp-2 tracking-tight sm:tracking-normal', c.on ? cn('font-bold', tone.text) : 'font-medium text-on-surface-variant')}>{c.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ActiveFilters({ state, onClear, flatCategories, lockedFlag }) {
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
  if (get('minDiscount')) chips.push(['discount', `${get('minDiscount')}% off or more`, () => update({ minDiscount: '' })]);
  if (get('bestseller') && !lockedFlag) chips.push(['bestseller', 'Best sellers', () => update({ bestseller: '' })]);
  if (get('newArrival') && !lockedFlag) chips.push(['new', 'New arrivals', () => update({ newArrival: '' })]);
  if (get('laptop')) chips.push(['laptop', `Fits ${get('laptop')}″ laptop`, () => update({ laptop: '' })]);
  if (get('waterResistant')) chips.push(['water', 'Water-resistant', () => update({ waterResistant: '' })]);
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

/**
 * Product listing used by every shop page.
 * - preset: home | men | women | universal | unisex | offers | bags | new | bestsellers
 * - categoryList / pageTitle / pageDescription / crumbsOverride / canonicalPath: set by nested
 *   directory pages (/women/handbags/tote-bags …) that list one or more categories together.
 * - directoryKey: which department this page belongs to (hides the category rail; the products
 *   below are already divided by category headers).
 */
export default function Shop({ preset, categoryList, pageTitle, pageDescription, crumbsOverride, canonicalPath, directoryKey }) {
  const { category: categorySlug } = useParams();
  const state = useParamState();
  const { get, getList, update, params } = state;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { count: cartCount } = useCart();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [viewDensity, setViewDensity] = useState('compact');
  const { data: tree } = useCategories();
  const { data: config } = useConfig();
  const isHome = preset === 'home';
  const genderPage = GENDER_PAGES[preset];
  // On the homepage the grid shows one page and links to the full shop, so the sections below stay reachable.
  const infinite = !isHome;
  // Home has its own h1 in the intro; everywhere else the listing title is the page's h1.
  const Heading = isHome ? 'h2' : 'h1';

  const flat = useMemo(() => {
    const list = [];
    function walk(nodes, parentRef = null) {
      if (!Array.isArray(nodes)) return;
      for (const n of nodes) {
        const item = { ...n, parentRef };
        list.push(item);
        if (n.children?.length) walk(n.children, item);
      }
    }
    walk(tree);
    return list;
  }, [tree]);

  const selectedCatParam = get('category');
  // Pages that list several categories together (Bags, a directory group) send them as one comma list.
  const listCategory = preset === 'bags' ? BAGS.listing.join(',') : categoryList?.length ? categoryList.join(',') : '';
  const effectiveCategory = categorySlug === 'travel-and-utility'
    ? (selectedCatParam || 'travel-utility')
    : (selectedCatParam || categorySlug || (categoryList?.length === 1 ? categoryList[0] : ''));
  const queryCategory = selectedCatParam || (categoryList?.length > 1 || preset === 'bags' ? listCategory : effectiveCategory);
  const flagPage = FLAG_PAGES[preset];
  const activeCategory = flat.find((c) => c.slug === effectiveCategory);
  const parent = activeCategory?.parentRef || (activeCategory?.parent ? flat.find((c) => String(c._id) === String(activeCategory.parent?._id || activeCategory.parent)) : null);
  // Top of the active category's branch (Cabin Luggage → Travel & Utility).
  let rootCategory = activeCategory;
  while (rootCategory?.parentRef) rootCategory = rootCategory.parentRef;

  // The Men / Women pages show everything for that shopper: their own pieces plus the
  // universal ones that suit everyone (the same rule as the collection counts on the server).
  const pageGender = preset === 'universal' || preset === 'unisex' ? 'unisex' : genderPage ? `${preset},unisex` : undefined;
  const query = useMemo(() => {
    const q = Object.fromEntries(params.entries());
    delete q.page;
    if (queryCategory) q.category = queryCategory;
    if (preset === 'offers') q.onSale = 'true';
    if (genderPage) q.gender = pageGender;
    if (flagPage) {
      Object.assign(q, flagPage.query);
      q.sort = params.get('sort') || flagPage.sort;
    }
    q.sort = q.sort || 'featured';
    // Listing pages show everything, so they load in the largest pages the API allows.
    q.limit = preset === 'home' ? PAGE_SIZE : 120;
    return q;
  }, [params, queryCategory, preset, genderPage, flagPage, pageGender]);

  const products = useInfiniteQuery({
    queryKey: ['products', 'list', query],
    queryFn: ({ pageParam }) => api.products({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
  const gender = genderPage ? pageGender : (get('gender') === 'universal' ? 'unisex' : get('gender'));
  const facets = useQuery({
    queryKey: ['facets', queryCategory, get('q'), gender],
    queryFn: () => api.facets({ category: queryCategory, q: get('q'), gender }),
    select: (d) => d.facets,
    staleTime: 5 * 60 * 1000,
  });

  // Men / Women: the main categories of this shopper's products (Bags, Clothing, Accessories…), counted
  // without the selected category so every circle stays visible while one is picked.
  const isGenderPage = ['men', 'women', 'universal', 'unisex'].includes(preset);
  // "Men’s Wallets" / "Women’s Wallets" / "Universal Wallets"
  const genderLabel = genderPage ? (preset === 'men' || preset === 'women' ? `${genderPage.title}’s` : genderPage.title) : '';
  const productsTopRef = useRef(null);
  const genderFacets = useQuery({
    queryKey: ['facets', 'gender-categories', pageGender],
    queryFn: () => api.facets({ gender: pageGender }),
    select: (d) => d.facets?.categories || [],
    enabled: isGenderPage,
    staleTime: 5 * 60 * 1000,
  });
  const genderCategories = useMemo(
    () =>
      (genderFacets.data || [])
        .map((f) => {
          const c = flat.find((x) => String(x._id) === f.id);
          return c && { slug: c.slug, name: c.name, count: f.count, img: f.img || c.image?.url || '', tone: categoryTone(c) };
        })
        .filter(Boolean),
    [genderFacets.data, flat]
  );

  const items = useMemo(() => products.data?.pages.flatMap((p) => p.items) || [], [products.data]);
  const total = products.data?.pages[0]?.total;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = products;
  const sentinel = useNearViewport(() => infinite && hasNextPage && !isFetchingNextPage && fetchNextPage(), [hasNextPage, isFetchingNextPage, items.length]);

  const activeCount = FILTER_KEYS.reduce((n, k) => n + (LIST_KEYS.includes(k) ? getList(k).length : get(k) ? 1 : 0), 0) + (selectedCatParam ? 1 : 0);
  const clearAll = () => update(Object.fromEntries([...FILTER_KEYS, 'q', 'category'].map((k) => [k, ''])));
  const title = pageTitle && !selectedCatParam
    ? pageTitle
    : flagPage
      ? flagPage.title
      : preset === 'bags' && !selectedCatParam
        ? 'Bags'
        : preset === 'offers'
      ? 'Offers'
      : genderPage && activeCategory
      ? `${genderLabel} ${activeCategory.name}`
      : genderPage?.title ||
        activeCategory?.name ||
        // While the category list is still loading, name the page from its address (never "All products").
        (effectiveCategory && !flat.length ? effectiveCategory.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()) : '') ||
        (get('q') ? `Results for “${get('q')}”` : get('gender') === 'women' ? 'Women' : get('gender') === 'men' ? 'Men' : get('gender') === 'unisex' || get('gender') === 'universal' ? 'Universal' : get('featured') ? 'Featured' : get('bestseller') ? 'Best sellers' : get('newArrival') ? 'New arrivals' : 'All products');
  const description = pageDescription || activeCategory?.tagline || flagPage?.description || 'Modern bags, backpacks and travel gear with tracked delivery and 7-day returns.';
  const setSort = (v) => update({ sort: v === 'featured' ? '' : v });

  const crumbs = useMemo(() => {
    if (crumbsOverride && !selectedCatParam) return crumbsOverride;
    const c = [{ label: 'Home', to: '/' }];
    if (flagPage || preset === 'bags') {
      c.push({ label: title });
      return c;
    }
    if (genderPage) {
      c.push({ label: genderPage.title, to: preset === 'universal' ? '/universal' : `/${preset}` });
    } else if (preset === 'offers') {
      c.push({ label: 'Shop', to: '/shop' });
      c.push({ label: 'Offers' });
      return c;
    } else {
      c.push({ label: 'Shop', to: '/shop' });
    }
    if (activeCategory) {
      const ancestors = [];
      let cur = activeCategory.parentRef;
      while (cur) {
        if (!genderPage || (cur.slug !== preset && cur.department !== preset)) {
          ancestors.unshift(cur);
        }
        cur = cur.parentRef;
      }
      for (const anc of ancestors) {
        c.push({ label: anc.name, to: `/shop/${anc.slug}` });
      }
      c.push({ label: activeCategory.name });
    } else if (get('q')) {
      c.push({ label: `“${get('q')}”` });
    } else if (!genderPage && title && title !== 'All products') {
      c.push({ label: title });
    }
    return c;
  }, [genderPage, preset, activeCategory, get('q'), title, crumbsOverride, selectedCatParam, flagPage]);

  const canonical = canonicalPath
    || (isHome ? '/' : categorySlug ? `/shop/${categorySlug}` : genderPage ? (preset === 'unisex' ? '/universal' : `/${preset}`) : preset === 'offers' ? '/offers' : flagPage ? flagPage.path : preset === 'bags' ? '/bags' : '/shop');
  // Which "Shop by category" directory belongs on this page (landing pages only, not while searching).
  const dirKey = directoryKey
    || (!selectedCatParam && (preset === 'women' || preset === 'men') ? preset : null)
    || (preset === 'bags' && !selectedCatParam ? 'bags' : null)
    || (activeCategory?.slug === 'accessories' ? 'accessories' : activeCategory?.slug === 'travel-utility' ? 'travel' : null);
  // /shop (all products) opens straight onto the products: no banner or department buttons above them.
  const isShopRoot = !preset && !categorySlug && !categoryList;
  // Clothing and Perfumes open like Men/Women: category circles above products grouped by section.
  const circleDept = ['clothing', 'fragrance'].includes(activeCategory?.slug) && !selectedCatParam;
  // Men and Women use the same layout as Clothing: one panel of subcategory circles above products
  // grouped by subcategory (no separate menu banner on top).
  // (Men / Women show main-category circles instead — see CategoryCircles.)
  const showCircles = (preset === 'bags' || circleDept || activeCategory?.slug === 'bags') && !isGenderPage && !get('q');
  const circleLabel = preset === 'men' ? 'Men’s subcategories' : preset === 'women' ? 'Women’s subcategories' : preset === 'universal' || preset === 'unisex' ? 'Universal subcategories' : circleDept && activeCategory ? `${activeCategory.name} subcategories` : 'Bag subcategories';
  const filtered = [...FILTER_KEYS, 'q', 'sort', 'category'].some((k) => get(k));
  const listLd = items.length && !filtered ? [itemListLd(items.slice(0, 24))] : [];

  // Subcategory chips: a parent shows its children; a subcategory shows its siblings (itself selected).
  // Only subcategories with products are listed, so no empty or broken panel appears.
  const ownChildren = (activeCategory?.children || []).filter((c) => c.productCount > 0);
  const chipParent = !genderPage ? (ownChildren.length ? activeCategory : parent) : null;
  const chipList = chipParent ? (chipParent === activeCategory ? ownChildren : (chipParent.children || []).filter((c) => c.productCount > 0)) : [];

  // ── Everything open, divided into category › subcategory sections ──
  // Listing pages load their whole result (filters/sort/search applied) and group it by each
  // product's own category and subcategory. The home page keeps its one-page preview.
  const grouped = false;
  const bySlug = useMemo(() => new Map(flat.map((c) => [c.slug, c])), [flat]);
  const treeOrder = useMemo(() => new Map(flat.map((c, i) => [c.slug, i])), [flat]);
  useEffect(() => {
    if (grouped && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [grouped, hasNextPage, isFetchingNextPage, fetchNextPage]);
  // A later batch can add products to a section higher up, which would shove the page down while
  // the shopper reads. Departments are small (one or two requests), so show them once complete;
  // only very large results render batch by batch.
  const waitForAll = grouped && Boolean(products.data) && hasNextPage && !products.isPlaceholderData && (total ?? 0) <= 360;

  const filters = <Filters facets={facets.data} state={state} flat={flat} activeCategory={activeCategory} lockedGender={Boolean(genderPage)} lockedFlag={Boolean(flagPage)} mainCategories={isGenderPage ? genderCategories : undefined} />;

  return (
    <>
      {!isHome && (
        <Seo
          title={
            pageTitle && !selectedCatParam
              ? `${pageTitle} — WILDTANE`
              : flagPage
                ? flagPage.seoTitle
                : preset === 'bags' && !selectedCatParam
                  ? BAGS_PAGE.seoTitle
                  : genderPage && activeCategory
                    ? `${genderLabel} ${activeCategory.name} — WILDTANE`
                    : genderPage
                      ? genderPage.seoTitle
                      : activeCategory
                        ? activeCategory.metaTitle || `Buy ${activeCategory.name} Online`
                        : title
          }
          description={
            pageDescription
              || (flagPage ? flagPage.description : preset === 'bags' ? BAGS_PAGE.description : genderPage ? genderPage.description : activeCategory?.metaDescription || `${description} Shop ${activeCategory?.name?.toLowerCase() || 'bags'} at WILDTANE.`)
          }
          canonical={canonical}
          image={genderPage?.image || (preset === 'bags' ? BAGS_PAGE.image : undefined)}
          noindex={Boolean(get('q'))}
          jsonLd={[breadcrumbLd(crumbs), ...listLd]}
        />
      )}

      {/* Desktop Department / Collection Hero (Men, Women, Unisex, Offers, or Master Shop) */}
      {!get('q') && (
        <div className="hidden md:block">
          {/* Men / Women / Universal / Bags open straight onto their products (no banner of options). */}
          {genderPage || preset === 'offers' || preset === 'bags' || isShopRoot ? null : !isHome && !categorySlug && !flagPage && !categoryList ? (
            <DepartmentHero page={SHOP_PAGE} current="shop" />
          ) : null}
        </div>
      )}

      {/* Offers page: sliding offer banners, then the shopper's own coupons (Spin & Win prizes…). */}
      {preset === 'offers' && !get('q') && (
        <>
          {/* Full screen width, edge to edge. */}
          <OffersCarousel />
          <div className="container-x pt-4 flex flex-col gap-4">
            <YourOffersStrip />
          </div>
        </>
      )}

      {/* ── UPPER PORTION CATEGORIES AND BELOW SUBCATEGORIES FOR ALL, BAGS, MEN, WOMEN, UNIVERSAL ── */}
      {!get('q') && (
        <ClothingCategoryMenu
          preset={(preset || dirKey) === 'unisex' ? 'universal' : (preset || dirKey || 'all')}
          selectedCategory={selectedCatParam || categorySlug || ''}
          onSelectCategory={(slug) => {
            update({ category: slug });
            productsTopRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
          }}
          totalProductsCount={total ?? items.length}
        />
      )}


      {/* ── MOBILE VIEW (< md): FLIPKART MOBILE SEARCH & FILTER TOP BAR ── */}
      <div className="md:hidden sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant/30 shadow-xs">
        {/* Top Search & Nav Row */}
        <div className="px-2.5 py-2 flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center shrink-0 active:scale-95 transition-transform mr-0.5"
            aria-label="WILDTANE home"
          >
            <LogoMark className="w-7 h-7 drop-shadow-2xs" />
          </Link>
          <button
            type="button"
            onClick={() => {
              if (get('q')) {
                update({ q: '' });
              } else if (location.key !== 'default') {
                // There is an earlier page in this visit to go back to.
                navigate(-1);
              } else if (parent) {
                navigate(`/shop/${parent.slug}`);
              } else {
                navigate('/');
              }
            }}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface active:scale-90 transition-transform shrink-0"
            aria-label="Back"
          >
            <Icon name="arrow_back" className="text-[18px]" />
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
                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
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
            <Icon name="star" className="text-[12px] text-rose-500" /> 4★ & Above
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
        <aside className="hidden lg:block w-60 shrink-0 sticky top-[122px] max-h-[calc(100vh/var(--zoom,1)-138px)] overflow-y-auto scrollbar-none bg-surface-container-lowest rounded-xl px-4 py-1" aria-label="Filters">
          <div className="flex items-center justify-between pt-3 pb-1">
            <span className="text-[14px] font-semibold">Filters</span>
            {activeCount > 0 && (
              <button type="button" onClick={clearAll} className="text-[12px] font-semibold text-secondary">Clear all</button>
            )}
          </div>
          {filters}
        </aside>

        <section className="flex-1 min-w-0 flex flex-col gap-3">
          <Breadcrumbs items={crumbs} className="mb-0" />
          <div className="flex flex-col gap-2">
            <div className={cn('flex items-baseline gap-2 flex-wrap', get('q') && 'hidden md:flex')}>
              <Heading className="font-display text-[22px] md:text-[28px] leading-tight">{title}</Heading>
              {total != null && <span className="text-[12px] text-outline">{total} item{total === 1 ? '' : 's'}</span>}
              {products.isPlaceholderData && <span className="text-[12px] text-outline inline-flex items-center gap-1"><Spinner className="w-3 h-3" /> Updating…</span>}
            </div>
            {activeCategory?.tagline && <p className="-mt-1 text-[13px] text-on-surface-variant max-w-2xl">{activeCategory.tagline}</p>}
            {chipParent && chipList.length > 0 && !dirKey && !circleDept && !isGenderPage && preset !== 'bags' && (
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {/* "All" chip: the parent itself, selected when no subcategory is chosen. */}
                <Link
                  to={`/shop/${chipParent.slug}`}
                  aria-current={activeCategory?._id === chipParent._id ? 'page' : undefined}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors shrink-0 flex items-center gap-1',
                    activeCategory?._id === chipParent._id
                      ? 'bg-on-surface text-surface border-on-surface'
                      : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30 text-on-surface'
                  )}
                >
                  {activeCategory?._id !== chipParent._id && <Icon name="chevron_left" className="text-[14px] -ml-1" />}
                  <span>All {chipParent.name}</span>
                </Link>
                {chipList.map((sub) => {
                  const on = activeCategory?._id === sub._id;
                  return (
                    <Link
                      key={sub._id}
                      to={`/shop/${sub.slug}`}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors shrink-0 flex items-center gap-1',
                        on ? 'bg-on-surface text-surface border-on-surface' : 'bg-surface-container-low hover:bg-surface-container border-outline-variant/30 text-on-surface'
                      )}
                    >
                      <span>{sub.name}</span>
                      <span className={cn('text-[10px] opacity-80', on ? '' : 'text-outline')}>({sub.productCount})</span>
                    </Link>
                  );
                })}
              </div>
            )}

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
            <ActiveFilters state={state} onClear={clearAll} flatCategories={flat} lockedFlag={Boolean(flagPage)} />
          </div>

          <ShopWidgetsBar
            state={state}
            activeCount={activeCount}
            onClear={clearAll}
            total={total}
            viewDensity={viewDensity}
            onViewDensityChange={setViewDensity}
          />

          <div ref={productsTopRef} className="scroll-mt-28" aria-hidden="true" />

          {/* While a new category loads, the current products stay (dimmed) instead of flashing empty. */}
          <div className={cn('transition-opacity duration-300', products.isPlaceholderData && 'opacity-50 pointer-events-none')} aria-busy={products.isPlaceholderData || undefined}>
          {products.isError ? (
            <ErrorState error={products.error} onRetry={products.refetch} />
          ) : products.data && items.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center text-center">
              <span className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline mb-3">
                <Icon name="search_off" className="text-[32px]" />
              </span>
              <h2 className="text-[17px] font-bold text-on-surface">
                {get('q') ? `No results found for “${get('q')}”` : activeCount ? 'No products match your filters' : `Nothing in ${title} yet`}
              </h2>
              <p className="text-[12.5px] text-outline max-w-sm mt-1">
                {get('q')
                  ? 'Please check the spelling or try searching for something broader like Backpack, Tote, or Luggage.'
                  : activeCount
                    ? 'Try removing some filters to see more bags from the collection.'
                    : 'New pieces are on their way. Explore similar styles below or browse the full collection.'}
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
          ) : grouped && products.data && !waitForAll ? (
            <GroupedProducts
              products={items}
              bySlug={bySlug}
              order={treeOrder}
              comfort={viewDensity === 'comfort'}
              loadingMore={hasNextPage || isFetchingNextPage}
              circles={showCircles}
              circleLabel={circleLabel}
              preset={preset}
            />
          ) : (
            <div
              className={cn(
                viewDensity === 'comfort'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
                  : GRID_COLS
              )}
            >
              {!products.data || waitForAll
                ? Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={i} />)
                : items.map((p, i) => <ProductCard key={p._id} product={p} priority={i < 6} />)}
              {isFetchingNextPage && Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={`more-${i}`} />)}
            </div>
          )}
          </div>

          {!grouped && <div ref={sentinel} className="flex justify-center py-4 min-h-[1px]">
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
          </div>}
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
