import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cn, discountPercent, imgUrl, productImage } from '../../lib/format';
import { useCategories, useMoney } from '../../hooks/useStore';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { setCartOpen, setSearchOpen } from '../../store';
import { Icon, Img } from '../ui';

// ── 1. Flipkart-style Top Header & Search Bar ──
const SEARCH_SUGGESTIONS = [
  'Bags, Backpacks, Luggage...',
  'Leather Laptop Sleeves...',
  'Cabin Trolleys & Duffles...',
  'Handcrafted Leather Totes...',
  'Waterproof Travel Packs...',
];

function MobileTopSearchHeader() {
  const dispatch = useDispatch();
  const { count: cartCount } = useCart();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-40 shadow-xs px-2.5 py-2">
      {/* Brand & Assured Top Row */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <Link to="/" className="flex items-center gap-1.5 active:opacity-80">
          <span className="font-serif tracking-wider font-bold text-[17px] text-on-surface uppercase">
            WILDTANE
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[8.5px] font-black uppercase tracking-tight shadow-xs">
            <Icon name="bolt" className="text-[10px]" /> Assured
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/offers"
            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200/50 flex items-center gap-1 active:scale-95"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            50% OFF
          </Link>
          <button
            type="button"
            onClick={() => dispatch(setCartOpen(true))}
            className="relative w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface active:scale-90"
            aria-label="Cart"
          >
            <Icon name="shopping_bag" className="text-[19px]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-secondary text-on-secondary text-[9px] font-black flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Flipkart-Style Search Input Pill */}
      <button
        type="button"
        onClick={() => dispatch(setSearchOpen(true))}
        className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between text-on-surface-variant text-[12.5px] active:bg-surface-container transition-colors shadow-xs"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon name="search" className="text-[18px] text-secondary shrink-0" />
          <span className="text-outline text-[12px] truncate transition-opacity duration-300">
            Search for {SEARCH_SUGGESTIONS[index]}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-outline">
          <Icon name="mic" className="text-[17px]" />
          <Icon name="photo_camera" className="text-[17px]" />
        </div>
      </button>
    </div>
  );
}

// ── 2. Flipkart-style Category Story Circles ──
const FALLBACK_CATEGORIES = [
  { name: 'Offers', icon: 'sell', to: '/offers', color: 'from-rose-500 via-pink-500 to-amber-500' },
  { name: 'Universal', icon: 'public', to: '/universal', color: 'from-emerald-500 to-teal-500', img: '/uploads/seed/apex-navy.jpg' },
  { name: 'Travel', icon: 'flight_takeoff', to: '/shop/travel-utility', color: 'from-cyan-500 to-blue-500', img: '/uploads/seed/cabin-hardshell.jpg' },
  { name: 'Accessories', icon: 'watch', to: '/shop/accessories', color: 'from-amber-500 to-orange-500', img: '/uploads/seed/wallet-onyx.jpg' },
  { name: 'Backpacks', icon: 'backpack', to: '/shop/backpacks', color: 'from-indigo-500 to-blue-500', img: '/uploads/seed/catalog/trekpack-sun.jpg' },
  { name: 'Handbags', icon: 'shopping_bag', to: '/shop/handbags-and-totes', color: 'from-pink-500 to-rose-500', img: '/uploads/seed/tote-teal.jpg' },
  { name: 'New Drops', icon: 'new_releases', to: '/shop?newArrival=true', color: 'from-fuchsia-500 to-rose-500' },
];

function MobileCategoryCircles() {
  const { data: tree } = useCategories();
  const cats = (tree || [])
    .flatMap((c) => c.children || [])
    .filter((c) => c.image?.url && c.productCount > 0)
    .slice(0, 8);

  const displayList = cats.length > 0
    ? [
        { name: 'Offers', icon: 'sell', to: '/offers', color: 'from-rose-500 via-pink-500 to-amber-500' },
        ...cats.map((c, i) => ({
          name: c.name,
          to: `/shop/${c.slug}`,
          img: c.image?.url,
          color: ['from-indigo-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-violet-500 to-purple-500', 'from-cyan-500 to-sky-500'][i % 5],
        })),
        { name: 'New In', icon: 'new_releases', to: '/shop?newArrival=true', color: 'from-fuchsia-500 to-rose-500' },
      ]
    : FALLBACK_CATEGORIES;

  return (
    <div className="bg-surface-container-lowest border-b border-outline-variant/30 py-2.5 overflow-x-auto snap-x scrollbar-none w-full max-w-full touch-pan-x">
      <div className="flex gap-3 px-3 min-w-max items-center">
        {displayList.map((item, idx) => (
          <Link
            key={idx}
            to={item.to}
            className="flex flex-col items-center gap-1.5 w-[64px] snap-start text-center group active:scale-95 transition-transform"
          >
            <div className={cn('w-[52px] h-[52px] rounded-full p-[2px] bg-gradient-to-tr shadow-xs relative', item.color)}>
              {idx === 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
              )}
              <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-low flex items-center justify-center">
                {item.img ? (
                  <Img src={item.img} alt={item.name} w={110} className="w-full h-full object-cover" />
                ) : (
                  <Icon name={item.icon} className="text-[24px] text-white" />
                )}
              </div>
            </div>
            <span className="text-[10.5px] font-semibold text-on-surface line-clamp-1 leading-tight tracking-tight">
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── 3. Flipkart-style Auto-Rotating Hero Banner ──
const HERO_SLIDES = [
  {
    title: 'MEGA FESTIVE DROP',
    subtitle: 'Up to 50% Off • Handcrafted Carry',
    badge: 'LIMITED TIME',
    tagColor: 'bg-rose-500',
    to: '/offers',
    image: '/uploads/seed/terminal-traveler.jpg',
  },
  {
    title: 'TECH BACKPACKS',
    subtitle: 'TSA Ready • 100% Waterproof Ballistic',
    badge: 'TOP RATED',
    tagColor: 'bg-indigo-600',
    to: '/shop/backpacks',
    image: '/uploads/seed/catalog/trekpack-sun.jpg',
  },
  {
    title: 'CABIN & TRAVEL GEAR',
    subtitle: 'Hardshell Polycarbonate • Lifetime Warranty',
    badge: 'TRENDING',
    tagColor: 'bg-emerald-600',
    to: '/shop/cabin-and-check-in-luggage',
    image: '/uploads/seed/catalog/cabin-emerald-teal.jpg',
  },
];

function MobileHeroBanner() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[active];

  return (
    <div className="p-2 w-full max-w-full">
      <Link
        to={slide.to}
        className="relative block w-full aspect-[2.1/1] rounded-2xl overflow-hidden shadow-sm active:opacity-95 transition-all border border-outline-variant/30"
      >
        <Img
          src={slide.image}
          alt={slide.title}
          w={640}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

        <div className="absolute inset-0 p-3 flex flex-col justify-center items-start text-white max-w-[72%]">
          <span className={cn('text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white mb-1 shadow', slide.tagColor)}>
            {slide.badge}
          </span>
          <h2 className="text-[16px] font-black leading-tight tracking-tight drop-shadow-sm font-sans uppercase">
            {slide.title}
          </h2>
          <p className="text-[10.5px] font-medium text-white/90 line-clamp-1 mt-0.5">
            {slide.subtitle}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
            Shop Now <Icon name="arrow_forward" className="text-[12px]" />
          </span>
        </div>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-2 right-2.5 flex items-center gap-1.5 z-10">
          {HERO_SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                active === idx ? 'w-4 bg-white shadow' : 'w-1.5 bg-white/50'
              )}
            />
          ))}
        </div>
      </Link>
    </div>
  );
}

// ── 4. Flipkart-style Quick Trust Value Strip ──
function MobileValueStrip() {
  return (
    <div className="px-2 py-0.5 w-full max-w-full">
      <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center">
        {[
          { icon: 'local_shipping', text: 'Free Delivery' },
          { icon: 'payments', text: 'Cash On Delivery' },
          { icon: 'assignment_return', text: '7-Day Return' },
          { icon: 'verified_user', text: '100% Original' },
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center gap-0.5">
            <Icon name={item.icon} className="text-[17px] text-secondary" />
            <span className="text-[9px] font-semibold text-on-surface leading-tight line-clamp-1">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5. Modern 2-Column Mobile Product Card (Spacious, Clear & Touch-Friendly) ──
function MobileProductCard({ product }) {
  const money = useMoney();
  const { has, toggle } = useWishlist();
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const saved = has(product._id);
  const pct = discountPercent(product);
  const variant = product.variants?.[0];
  const soldOut = !variant || variant.stock <= 0;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut || add.isPending || !variant) return;
    add.mutate(
      { productId: product._id, variantId: variant._id, quantity: 1 },
      {
        onSuccess: () => {
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        },
      }
    );
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden flex flex-col relative group active:scale-[0.98] transition-all shadow-xs">
      {/* Product Image Area */}
      <Link to={`/product/${product.slug}`} className="relative block aspect-square bg-surface-container-low overflow-hidden">
        <Img
          src={productImage(product, variant)}
          alt={product.name}
          w={320}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount Badge */}
        {pct > 0 && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9.5px] font-black tracking-tight leading-none shadow-xs">
            {pct}% OFF
          </span>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          aria-label="Wishlist"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle.mutate(product);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs flex items-center justify-center shadow-xs active:scale-75 transition-transform"
        >
          <Icon
            name="favorite"
            fill={saved}
            className={cn('text-[14px]', saved ? 'text-error' : 'text-outline')}
          />
        </button>

        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 py-1 bg-black/75 text-white text-[9.5px] font-bold text-center">
            Out of Stock
          </span>
        )}
      </Link>

      {/* Product Details with Compact, Clean Layout */}
      <div className="p-2 sm:p-2.5 flex flex-col flex-1 justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-secondary line-clamp-1 block">
            {product.category?.name || 'WILDTANE'}
          </span>
          <Link
            to={`/product/${product.slug}`}
            className="text-[11.5px] sm:text-[12.5px] font-semibold text-on-surface line-clamp-2 leading-[15px] min-h-[30px] hover:text-secondary block"
          >
            {product.name}
          </Link>
        </div>

        {/* Rating Badge + Assured */}
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[8.5px] sm:text-[9px] font-bold leading-none">
            {(product.ratingAverage || 4.6).toFixed(1)} <Icon name="star" fill className="text-[8px]" />
          </span>
          <span className="text-[8.5px] sm:text-[9px] text-outline font-medium">
            ({product.ratingCount || 34})
          </span>
          <span className="text-[8.5px] sm:text-[9px] font-black text-amber-600 dark:text-amber-400 ml-auto">
            ⚡Assured
          </span>
        </div>

        {/* Price on left, Real Price, % off, Free Delivery on right side + Quick Add Button */}
        <div className="mt-auto pt-0.5 flex items-center justify-between gap-1">
          <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0 min-w-0">
            {/* Actual Price */}
            <span className="text-[12.5px] sm:text-[14px] font-extrabold text-on-surface leading-none tracking-tight whitespace-nowrap">
              {money(product.finalPrice ?? product.price)}
            </span>
            {/* Real Price on right side */}
            {pct > 0 && (
              <span className="text-[9px] sm:text-[10px] text-outline line-through leading-none whitespace-nowrap">
                {money(product.price)}
              </span>
            )}
            {/* Percentage Off on right side */}
            {pct > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 leading-none whitespace-nowrap">
                {pct}% off
              </span>
            )}
            {/* Free Delivery on right side */}
            <span className="text-[8px] sm:text-[9px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap leading-none">
              Free Delivery
            </span>
          </div>

          {/* Quick Add Button */}
          <button
            type="button"
            disabled={soldOut || add.isPending}
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to bag`}
            className={cn(
              'w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs active:scale-80 transition-all disabled:opacity-40',
              added ? 'bg-emerald-600 animate-pop' : 'bg-secondary hover:bg-secondary/90'
            )}
          >
            <Icon name={added ? 'check' : 'add'} className="text-[14px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 6. Deal of the Day (2-Column Grid + Countdown Timer) ──
function MobileDealOfTheDay({ products }) {
  const [timeLeft, setTimeLeft] = useState({ h: 14, m: 28, s: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: 59, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return { h: 14, m: 0, s: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dealProducts = (products || []).slice(0, 4);
  if (!dealProducts.length) return null;

  return (
    <section className="px-2 py-2 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden shadow-xs">
        {/* Deal Header */}
        <div className="px-3 py-2.5 bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent flex items-center justify-between border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Icon name="bolt" className="text-[18px]" />
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-black tracking-tight text-on-surface uppercase">
                Deal of the Day
              </span>
              <div className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 dark:text-amber-400">
                <Icon name="timer" className="text-[12px]" />
                <span>
                  {String(timeLeft.h).padStart(2, '0')}h : {String(timeLeft.m).padStart(2, '0')}m : {String(timeLeft.s).padStart(2, '0')}s
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/offers"
            className="text-[11.5px] font-bold text-secondary flex items-center gap-0.5 active:scale-95"
          >
            VIEW ALL <Icon name="chevron_right" className="text-[16px]" />
          </Link>
        </div>

        {/* 2 Items Per Row Grid */}
        <div className="p-2.5 grid grid-cols-2 gap-2.5">
          {dealProducts.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 7. Visual Curated Departments Showcase (Men, Women, Universal, Travel, Accessories) ──
function Mobile3DepartmentRow() {
  const departments = [
    { name: 'Men', tag: 'Masculine Craft', image: '/uploads/seed/duffle-tan.jpg', to: '/men' },
    { name: 'Women', tag: 'Sculptural Luxury', image: '/uploads/seed/tote-teal.jpg', to: '/women' },
    { name: 'Universal', tag: 'For Everyone', image: '/uploads/seed/apex-navy.jpg', to: '/universal' },
    { name: 'Travel & Utility', tag: 'Flight Ready', image: '/uploads/seed/cabin-hardshell.jpg', to: '/shop/travel-utility' },
    { name: 'Accessories', tag: 'Everyday Carry', image: '/uploads/seed/wallet-onyx.jpg', to: '/shop/accessories' },
  ];

  return (
    <div className="px-2 py-1.5 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-xs">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-[13px] font-black text-on-surface tracking-tight uppercase">
            Curated Departments
          </h3>
          <Link to="/shop" className="text-[11px] font-bold text-secondary flex items-center gap-0.5">
            Explore All <Icon name="chevron_right" className="text-[15px]" />
          </Link>
        </div>

        {/* 5 Departments in a Smooth Scrolling Snap Strip */}
        <div className="flex gap-2.5 overflow-x-auto snap-x scrollbar-none pb-1">
          {departments.map((dept, idx) => (
            <Link
              key={idx}
              to={dept.to}
              className="relative rounded-2xl overflow-hidden aspect-[3/4] w-[115px] shrink-0 snap-start border border-outline-variant/20 group active:scale-[0.97] transition-transform"
            >
              <Img src={dept.image} alt={dept.name} w={240} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <span className="text-[11px] font-bold line-clamp-1 leading-tight">{dept.name}</span>
                <span className="text-[9px] font-semibold text-amber-300 block leading-tight mt-0.5 truncate">{dept.tag}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 8. Interactive Filter Chip Switcher (Instant 2-Col Switch) ──
function MobileInteractiveTabShowcase({ allProducts }) {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Universal', 'Travel & Utility', 'Accessories', 'Backpacks', 'Handbags'];

  const filtered = useMemo(() => {
    if (!allProducts || !allProducts.length) return [];
    if (activeTab === 'All') return allProducts.slice(0, 4);
    const slugMap = {
      Universal: 'unisex',
      'Travel & Utility': 'travel',
      Accessories: 'accessories',
      Backpacks: 'backpack',
      Handbags: 'tote',
    };
    const key = slugMap[activeTab] || activeTab.toLowerCase();
    const matches = allProducts.filter(
      (p) =>
        (p.gender === 'unisex' && key === 'unisex') ||
        (p.category?.name && p.category.name.toLowerCase().includes(key)) ||
        (p.category?.slug && p.category.slug.toLowerCase().includes(key)) ||
        p.name.toLowerCase().includes(key)
    );
    return matches.length >= 2 ? matches.slice(0, 4) : allProducts.slice(0, 4);
  }, [allProducts, activeTab]);

  if (!filtered.length) return null;

  return (
    <section className="px-2 py-2 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-xs">
        <div className="flex items-center justify-between px-1 mb-2">
          <div>
            <h3 className="text-[13px] font-black text-on-surface tracking-tight uppercase">
              Trending Collections
            </h3>
            <span className="text-[10px] text-outline font-medium">
              Tap a category to filter instantly
            </span>
          </div>
          <Link to="/shop" className="text-[11px] font-bold text-secondary flex items-center gap-0.5">
            Shop All <Icon name="chevron_right" className="text-[15px]" />
          </Link>
        </div>

        {/* Interactive Chip Switcher */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2.5 pt-0.5 snap-x">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 snap-start transition-all border',
                activeTab === tab
                  ? 'bg-secondary text-on-secondary border-secondary shadow-xs scale-102'
                  : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-outline'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 2 Items Per Row Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {filtered.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 9. Generic 2-Column Mobile Section Grid (Bestsellers & New In) ──
function Mobile3ColSection({ title, subtitle, link = '/shop', products }) {
  const items = (products || []).slice(0, 4);
  if (!items.length) return null;

  return (
    <section className="px-2 py-2 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-xs">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex flex-col">
            <h3 className="text-[13px] font-black text-on-surface tracking-tight uppercase">
              {title}
            </h3>
            {subtitle && (
              <span className="text-[10px] text-outline font-medium">
                {subtitle}
              </span>
            )}
          </div>
          <Link
            to={link}
            className="text-[11px] font-bold text-secondary flex items-center gap-0.5 active:scale-95"
          >
            See All <Icon name="chevron_right" className="text-[15px]" />
          </Link>
        </div>

        {/* 2 Items Per Row */}
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 10. Entire Store Catalog Showcase (Browse Items in 2-Col Grid) ──
function MobileEntireStoreSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'mobile-all-feed'],
    queryFn: () => api.products({ limit: 8, sort: 'featured' }),
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.items || [];
  if (!products.length && !isLoading) return null;

  return (
    <section className="px-2 py-2 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-xs">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex flex-col">
            <h3 className="text-[13px] font-black text-on-surface tracking-tight uppercase">
              All Bags & Backpacks
            </h3>
            <span className="text-[10px] text-outline font-medium">
              Explore the complete collection
            </span>
          </div>
          <Link
            to="/shop"
            className="text-[11px] font-bold text-secondary flex items-center gap-0.5 active:scale-95"
          >
            Filter & Sort <Icon name="tune" className="text-[15px]" />
          </Link>
        </div>

        {/* 2 Items Per Row Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {products.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>

        <div className="pt-3 pb-1 flex justify-center">
          <Link
            to="/shop"
            className="w-full py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-bold text-[12.5px] flex items-center justify-center gap-1.5 active:bg-surface-container transition-colors shadow-xs"
          >
            View Complete Catalog ({data?.total || '60+'} items) <Icon name="arrow_forward" className="text-[15px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Master Flipkart Mobile Home View ──
export default function MobileFlipkartHome() {
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: api.collections,
    staleTime: 5 * 60 * 1000,
  });
  const { data: travelData } = useQuery({
    queryKey: ['products', 'mobile-travel-rail'],
    queryFn: () => api.products({ category: 'travel-utility', limit: 6 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: accessoriesData } = useQuery({
    queryKey: ['products', 'mobile-accessories-rail'],
    queryFn: () => api.products({ category: 'accessories', limit: 6 }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full max-w-full overflow-x-clip flex flex-col pb-36 bg-surface">
      {/* 1. Flipkart-style Top Mobile Header & Cycling Search Pill */}
      <MobileTopSearchHeader />

      {/* 2. Horizontal Story Categories Circles */}
      <MobileCategoryCircles />

      {/* 3. Hero Promo Banner Slider */}
      <MobileHeroBanner />

      {/* 4. Flipkart Quick Trust Badges Strip */}
      <MobileValueStrip />

      {/* 5. Deal of the Day (3 Items Per Row + Live Timer) */}
      <MobileDealOfTheDay products={collections?.featured} />

      {/* 6. Curated Departments Showcase (Men, Women, Universal, Travel, Accessories) */}
      <Mobile3DepartmentRow />

      {/* 7. Interactive Filter Chip Switcher (3 Items Per Row) */}
      <MobileInteractiveTabShowcase allProducts={collections?.featured || collections?.bestSellers} />

      {/* 8. Most Loved • Bestsellers (3 Items Per Row) */}
      <Mobile3ColSection
        title="Most Loved • Best Sellers"
        subtitle="Trusted by 50,000+ daily commuters"
        link="/shop?bestseller=true"
        products={collections?.bestSellers}
      />

      {/* 9. Travel & Utility Section (3 Items Per Row) */}
      <Mobile3ColSection
        title="Travel & Utility • Transit Ready"
        subtitle="Hardshell spinners, duffles & wash kits"
        link="/shop/travel-utility"
        products={travelData?.items}
      />

      {/* 10. Accessories Section (3 Items Per Row) */}
      <Mobile3ColSection
        title="Accessories • Everyday Accents"
        subtitle="Leather wallets, RFID cardholders & cable folios"
        link="/shop/accessories"
        products={accessoriesData?.items}
      />

      {/* 11. Just Landed • New Drops (3 Items Per Row) */}
      <Mobile3ColSection
        title="Just Landed • New In"
        subtitle="Engineered for your journeys"
        link="/shop?newArrival=true"
        products={collections?.newArrivals}
      />

      {/* 12. Complete Store Catalog (3 Items Per Row) */}
      <MobileEntireStoreSection />

      {/* 11. Flipkart Assured Guarantee Banner */}
      <div className="p-3 mx-2 my-2 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-surface-container-lowest to-surface-container-low border border-outline-variant/30 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 text-secondary">
          <Icon name="verified" className="text-[22px]" />
        </span>
        <div className="flex flex-col">
          <span className="text-[12px] font-black text-on-surface">WILDTANE Assured Guarantee</span>
          <span className="text-[9.5px] text-outline">100% Genuine Materials • 5-Year Craftsmanship Warranty</span>
        </div>
      </div>
    </div>
  );
}
