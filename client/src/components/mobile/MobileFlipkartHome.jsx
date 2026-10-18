import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { cn, discountPercent, imgUrl, productImage } from '../../lib/format';
import { useCategories, useMoney } from '../../hooks/useStore';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { setCartOpen, setSearchOpen, setShopModalOpen } from '../../store';
import { Icon, Img, Skeleton } from '../ui';
import { LogoMark } from '../Brand';
import { CoinIcon, useMyCoins } from '../coins';
import ContinueShopping from '../ContinueShopping';
import { sectionOn, useHomepage } from '../../content/homepage';
import { useRailProducts } from '../../hooks/useRailProducts';

// ── 1. Flipkart-style Top Header & Live Rotating Search Bar ──
const SEARCH_HINTS = [
  'laptop backpacks',
  'leather handbags',
  'travel duffles',
  'office briefcases',
  'RFID wallets',
  'cabin trolley bags',
];

const QUICK_CHIPS = [
  { label: '🔥 Steal Deals', to: '/offers', highlight: true },
  { label: 'Backpacks', to: '/shop/backpacks' },
  { label: 'Laptop Bags', to: '/shop?q=Laptop' },
  { label: 'Handbags', to: '/shop/handbags-and-totes' },
  { label: 'Travel Duffles', to: '/shop/travel-utility' },
  { label: 'Under ₹1,499', to: '/shop?maxPrice=1499' },
  { label: '4.5★ Rated', to: '/shop?rating=4.5' },
  { label: 'Wallets & Belts', to: '/shop/accessories' },
  { label: 'Returns & Exchange', to: '/returns-exchange' },
];

function MobileTopSearchHeader() {
  const dispatch = useDispatch();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const coins = useMyCoins();
  const [hintIdx, setHintIdx] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setHintIdx((prev) => (prev + 1) % SEARCH_HINTS.length);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={cn(
        'bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-50 transition-all duration-200 w-full max-w-full px-2.5',
        scrolled ? 'py-1.5 shadow-md bg-surface-container-lowest/98 backdrop-blur-md' : 'pt-2 pb-1.5 shadow-xs'
      )}
    >
      {/* When scrolled down: Clean compact sticky bar that keeps the search option ALWAYS inside the screen */}
      {scrolled ? (
        <div className="flex items-center gap-2 w-full animate-fade-in">
          {/* Logo Mark */}
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="shrink-0 active:scale-95 transition-transform"
            aria-label="WILDTANE home"
          >
            <LogoMark className="w-7 h-7 drop-shadow-xs" />
          </Link>

          {/* Flipkart Sticky Search Input Option */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => dispatch(setSearchOpen(true))}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch(setSearchOpen(true))}
            className="flex-1 h-9 px-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center gap-2 text-on-surface shadow-2xs active:bg-surface-container cursor-pointer min-w-0"
          >
            <Icon name="search" className="text-[17px] text-secondary shrink-0" />
            <span className="flex-1 min-w-0 text-[12px] truncate text-on-surface-variant font-medium">
              Search{' '}
              <strong key={hintIdx} className="font-semibold text-on-surface animate-fade-in inline-block">
                {SEARCH_HINTS[hintIdx]}
              </strong>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(setSearchOpen({ open: true, voice: true }));
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-outline hover:text-on-surface shrink-0"
              aria-label="Voice search"
            >
              <Icon name="mic" className="text-[15px] text-secondary" />
            </button>
          </div>

          {/* Quick Wishlist & Cart Counters */}
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to="/wishlist"
              className="relative w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface active:scale-90 shadow-2xs"
              aria-label="Wishlist"
            >
              <Icon name="favorite" className="text-[16px] text-rose-500" />
              {wishCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-600 text-white text-[8.5px] font-black flex items-center justify-center shadow-xs">
                  {wishCount > 9 ? '9+' : wishCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => dispatch(setCartOpen(true))}
              className="relative w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface active:scale-90 shadow-2xs"
              aria-label="Cart"
            >
              <Icon name="shopping_bag" className="text-[16px]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-on-surface text-surface text-[8.5px] font-black flex items-center justify-center shadow-xs">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* When at top: Full Brand Row + Search Bar + Non-overflowing Wrapped Search Option Chips */
        <>
          {/* Top Bar: Brand Logo & Name + Coins + Wishlist + Cart */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <Link to="/" className="flex items-center gap-2 shrink-0 active:opacity-85" aria-label="WILDTANE home">
              <LogoMark className="w-8 h-8 shrink-0 drop-shadow-xs" />
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-serif tracking-widest font-black text-[18px] text-on-surface uppercase leading-none">
                  WILDTANE
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-500 dark:text-amber-400 flex items-center gap-0.5 mt-0.5">
                  <span>✦</span> LUXURY STORE
                </span>
              </div>
            </Link>

            {/* Right Actions: Coins Pill + Wishlist + Bag */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                to="/account/coins"
                className="h-8 px-2 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400 active:scale-95 transition-all shadow-2xs"
                aria-label="Coins balance"
              >
                <CoinIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{coins?.data?.balance ?? 0}</span>
              </Link>

              <Link
                to="/wishlist"
                className="relative w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface active:scale-90 transition-all shadow-2xs"
                aria-label="Wishlist"
              >
                <Icon name="favorite" className="text-[17px] text-rose-500" />
                {wishCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs ring-1 ring-surface animate-pop-in">
                    {wishCount > 9 ? '9+' : wishCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => dispatch(setCartOpen(true))}
                className="relative w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface active:scale-90 transition-all shadow-2xs"
                aria-label="Cart"
              >
                <Icon name="shopping_bag" className="text-[17px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-on-surface text-surface text-[9px] font-black flex items-center justify-center shadow-xs ring-1 ring-surface animate-pop-in">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Flipkart-style Prominent Search Bar */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => dispatch(setSearchOpen(true))}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch(setSearchOpen(true))}
            className="w-full h-10 px-3 rounded-xl bg-surface-container/70 border border-outline-variant/40 hover:border-secondary flex items-center gap-2 text-on-surface shadow-2xs active:bg-surface-container cursor-pointer transition-all"
          >
            <Icon name="search" className="text-[18px] text-secondary shrink-0" />
            <span className="flex-1 min-w-0 text-[12.5px] truncate text-on-surface-variant font-medium">
              Search for{' '}
              <strong key={hintIdx} className="font-semibold text-on-surface animate-fade-in inline-block">
                {SEARCH_HINTS[hintIdx]}
              </strong>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(setSearchOpen({ open: true, voice: true }));
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface active:scale-90 shrink-0"
              aria-label="Voice search"
            >
              <Icon name="mic" className="text-[16px] text-secondary" />
            </button>
          </div>

          {/* Search Options: Wrapped so they ALWAYS come INSIDE screen and never go outside */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-0.5 w-full">
            {QUICK_CHIPS.map((chip) => (
              <Link
                key={chip.label}
                to={chip.to}
                className={cn(
                  'h-6.5 px-2.5 rounded-full text-[11px] font-bold flex items-center gap-1 border active:scale-95 transition-all shadow-2xs max-w-full truncate',
                  chip.highlight
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-secondary/50'
                )}
              >
                <span className="truncate">{chip.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── 2. Flipkart-style Category Story Circles ──
const FALLBACK_CATEGORIES = [
  { name: 'Top Offers', icon: 'sell', to: '/offers', color: 'from-rose-500 via-pink-500 to-rose-600' },
  { name: 'Backpacks', icon: 'backpack', to: '/shop/backpacks', color: 'from-indigo-500 to-blue-500', img: '/uploads/seed/catalog/trekpack-sun.jpg' },
  { name: 'Laptop Bags', icon: 'laptop_mac', to: '/shop?q=Laptop', color: 'from-sky-500 to-cyan-500', img: '/uploads/seed/briefcase-chestnut.jpg' },
  { name: 'Handbags', icon: 'shopping_bag', to: '/shop/handbags-and-totes', color: 'from-pink-500 to-rose-500', img: '/uploads/seed/tote-teal.jpg' },
  { name: 'Travel Duffles', icon: 'flight_takeoff', to: '/shop/travel-utility', color: 'from-amber-500 to-orange-500', img: '/uploads/seed/cabin-hardshell.jpg' },
  { name: 'Office Bags', icon: 'work', to: '/shop/briefcases', color: 'from-emerald-500 to-teal-500', img: '/uploads/seed/apex-navy.jpg' },
  { name: 'Wallets & Belts', icon: 'wallet', to: '/shop/accessories', color: 'from-purple-500 to-violet-500', img: '/uploads/seed/wallet-onyx.jpg' },
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
        { name: 'Top Offers', icon: 'sell', to: '/offers', color: 'from-rose-500 via-pink-500 to-rose-600' },
        ...cats.map((c, i) => ({
          name: c.name,
          to: `/shop/${c.slug}`,
          img: c.image?.url,
          color: ['from-indigo-500 to-blue-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-violet-500 to-purple-500', 'from-cyan-500 to-sky-500'][i % 5],
        })),
        { name: 'New Drops', icon: 'new_releases', to: '/shop?newArrival=true', color: 'from-fuchsia-500 to-rose-500' },
      ]
    : FALLBACK_CATEGORIES;

  return (
    <div className="bg-surface-container-lowest border-b border-outline-variant/30 py-2 overflow-x-auto snap-x scrollbar-none w-full max-w-full touch-pan-x">
      <div className="flex gap-2.5 px-2.5 min-w-max items-center">
        {displayList.map((item, idx) => (
          <Link
            key={idx}
            to={item.to}
            className="flex flex-col items-center gap-1 w-[58px] snap-start text-center group active:scale-95 transition-transform"
          >
            <div className={cn('w-[48px] h-[48px] rounded-full p-[2px] bg-gradient-to-tr shadow-2xs relative', item.color)}>
              <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-low flex items-center justify-center">
                {item.img ? (
                  <Img src={item.img} alt={item.name} w={100} className="w-full h-full object-cover" />
                ) : (
                  <Icon name={item.icon} className="text-[20px] text-white" />
                )}
              </div>
            </div>
            <span className="text-[10px] font-bold text-on-surface line-clamp-1 leading-tight tracking-tight">
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── 3. Flipkart-style Auto-Rotating Hero Banner with Touch Swiping ──
function MobileHeroBanner({ slides: given }) {
  const [active, setActive] = useState(0);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);
  const slides = given?.length ? given : [
    {
      title: 'Architectural Laptop Backpacks',
      subtitle: 'Waterproof 16" Sleeve • Handcrafted Leather',
      badge: 'FLAT 40% OFF',
      image: '/uploads/seed/catalog/trekpack-sun.jpg',
      to: '/shop/backpacks',
    },
    {
      title: 'Cabin & Travel Trolleys',
      subtitle: 'Ultra-light Hardshell • 360° Silent Spinners',
      badge: 'STEAL DEAL',
      image: '/uploads/seed/cabin-hardshell.jpg',
      to: '/shop/travel-utility',
    },
  ];
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return undefined;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % count);
    }, 4000);
    return () => clearInterval(timer);
  }, [count]);

  const handleTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > 50) {
      setActive((prev) => (prev + 1) % count);
    } else if (distance < -50) {
      setActive((prev) => (prev - 1 + count) % count);
    }
    touchStart.current = 0;
    touchEnd.current = 0;
  };

  if (!count) return null;
  const slide = slides[active % count];

  return (
    <div
      className="p-2 w-full max-w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Link
        to={slide.to || '/shop'}
        className="relative block w-full aspect-[2.15/1] rounded-2xl overflow-hidden shadow-xs active:scale-[0.99] transition-all border border-outline-variant/30"
      >
        <Img
          src={slide.image}
          alt={slide.title}
          w={640}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />

        <div className="absolute inset-0 p-3 flex flex-col justify-center items-start text-white max-w-[75%]">
          <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white mb-1 shadow-xs">
            {slide.badge || 'SPECIAL OFFER'}
          </span>
          <h2 className="text-[15px] font-black leading-tight tracking-tight drop-shadow-sm font-sans uppercase">
            {slide.title}
          </h2>
          <p className="text-[10px] font-medium text-white/90 line-clamp-1 mt-0.5">
            {slide.subtitle}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-black text-rose-300 bg-black/40 px-2 py-0.5 rounded-full border border-rose-300/30">
            SHOP NOW <Icon name="arrow_forward" className="text-[11px]" />
          </span>
        </div>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-2 right-2.5 flex items-center gap-1 z-10">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                active % count === idx ? 'w-4 bg-white shadow' : 'w-1.5 bg-white/50'
              )}
            />
          ))}
        </div>
      </Link>
    </div>
  );
}

// ── 4. Decreased Size, Child-Friendly Flipkart Mobile Product Card ──
export function MobileProductCard({ product }) {
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
          toast.success(`Added ${product.name} to bag!`, { icon: '🛍️' });
          setTimeout(() => setAdded(false), 1600);
        },
      }
    );
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden flex flex-col relative group active:scale-[0.98] transition-all shadow-2xs">
      {/* Product Image */}
      <Link to={`/product/${product.slug}`} className="relative block aspect-square bg-surface-container-low overflow-hidden">
        <Img
          src={productImage(product, variant)}
          alt={product.name}
          w={280}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount Badge on Image */}
        {pct > 0 && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black tracking-tight leading-none shadow-xs">
            {pct}% OFF
          </span>
        )}

        {/* Quick Wishlist Toggle */}
        <button
          type="button"
          aria-label="Wishlist"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle.mutate(product);
          }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-surface-container-lowest/90 backdrop-blur-xs flex items-center justify-center shadow-xs active:scale-75 transition-transform"
        >
          <Icon
            name="favorite"
            fill={saved}
            className={cn('text-[13px]', saved ? 'text-rose-600' : 'text-outline')}
          />
        </button>

        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 py-0.5 bg-black/80 text-white text-[9px] font-bold text-center">
            Out of Stock
          </span>
        )}
      </Link>

      {/* Product Details (Decreased size & compact spacing) */}
      <div className="p-2 flex flex-col flex-1 justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8.5px] font-black uppercase tracking-wider text-secondary truncate">
              {product.category?.name || 'WILDTANE'}
            </span>
            <span className="text-[8px] font-extrabold text-rose-600 dark:text-rose-400 shrink-0">
              ⚡Assured
            </span>
          </div>

          <Link
            to={`/product/${product.slug}`}
            className="text-[11px] font-semibold text-on-surface line-clamp-2 leading-[13.5px] min-h-[27px] hover:text-secondary block"
          >
            {product.name}
          </Link>
        </div>

        {/* Star Rating Badge */}
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-700 text-white text-[8px] font-bold leading-none">
            {(product.ratingAverage || 4.5).toFixed(1)} <Icon name="star" fill className="text-[7.5px]" />
          </span>
          <span className="text-[8px] text-outline font-medium">
            ({product.ratingCount || 28})
          </span>
          <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-semibold ml-auto">
            Free Delivery
          </span>
        </div>

        {/* Price Row + Child-Friendly "+ ADD" Button */}
        <div className="pt-1 border-t border-outline-variant/15 flex items-center justify-between gap-1 mt-auto">
          <div className="flex flex-col leading-none">
            <span className="text-[12.5px] font-black text-on-surface tracking-tight">
              {money(product.finalPrice ?? product.price)}
            </span>
            {pct > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8.5px] text-outline line-through leading-none">
                  {money(product.price)}
                </span>
                <span className="text-[8.5px] font-bold text-emerald-600 leading-none">
                  {pct}% off
                </span>
              </div>
            )}
          </div>

          {/* Child-Friendly "+ ADD" Button */}
          <button
            type="button"
            disabled={soldOut || add.isPending}
            onClick={handleQuickAdd}
            aria-label={`Add ${product.name} to bag`}
            className={cn(
              'h-6 px-2.5 rounded-full text-[10px] font-black tracking-tight flex items-center gap-0.5 shadow-2xs active:scale-85 transition-all disabled:opacity-40 select-none border shrink-0',
              added
                ? 'bg-emerald-600 text-white border-emerald-600 animate-pop'
                : 'bg-surface-container-high border-outline-variant/60 text-secondary active:bg-secondary active:text-white'
            )}
          >
            <Icon name={added ? 'check' : 'add'} className="text-[11px]" />
            <span>{added ? 'ADDED' : 'ADD'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 5. Flipkart Deals of the Day (Live Countdown Timer + 2-Col Grid) ──
function MobileDealOfTheDay({ products, content }) {
  const dealProducts = (products || []).slice(0, 4);

  // Live Countdown Timer (Flipkart style!)
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 15 });
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');

  if (products === undefined) {
    return (
      <div className="p-2 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }
  if (!dealProducts.length) return null;

  return (
    <section className="px-2 py-1.5 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden shadow-2xs">
        {/* Header Bar with Live Timer */}
        <div className="px-3 py-2 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent flex items-center justify-between border-b border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Icon name="bolt" className="text-[16px]" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-black tracking-tight text-on-surface uppercase">
                  {content?.title || 'Deals of the Day'}
                </span>
                <span className="text-[9.5px] font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                  ⏰ {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
                </span>
              </div>
              <span className="text-[9.5px] text-outline font-medium">
                {content?.subtitle || 'Lowest price guaranteed on top bags'}
              </span>
            </div>
          </div>

          <Link
            to={content?.link || '/offers'}
            className="text-[11px] font-bold text-secondary flex items-center gap-0.5 active:scale-95 shrink-0"
          >
            VIEW ALL <Icon name="chevron_right" className="text-[15px]" />
          </Link>
        </div>

        {/* 2-Column Decreased Size Cards */}
        <div className="p-2 grid grid-cols-2 gap-2">
          {dealProducts.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 6. Flipkart Budget Store ("Under ₹999 / Under ₹1,499 / Under ₹2,499") ──
function MobileBudgetStore() {
  const budgets = [
    {
      title: 'Under ₹999',
      subtitle: 'Wallets, Belts & Slings',
      discount: 'UP TO 50% OFF',
      color: 'from-amber-600 to-rose-600',
      to: '/shop?maxPrice=999',
      icon: 'wallet',
    },
    {
      title: 'Under ₹1,499',
      subtitle: 'Daily Laptop Backpacks',
      discount: 'BEST VALUE',
      color: 'from-indigo-600 to-sky-600',
      to: '/shop?maxPrice=1499',
      icon: 'backpack',
    },
    {
      title: 'Under ₹2,499',
      subtitle: 'Office & Handcrafted Totes',
      discount: 'HOT DEALS',
      color: 'from-emerald-600 to-teal-600',
      to: '/shop?maxPrice=2499',
      icon: 'work',
    },
    {
      title: 'Under ₹3,999',
      subtitle: 'Cabin Luggage & Duffles',
      discount: 'TRAVEL PICKS',
      color: 'from-purple-600 to-pink-600',
      to: '/shop?maxPrice=3999',
      icon: 'luggage',
    },
  ];

  return (
    <section className="px-2 py-1.5 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div>
            <h3 className="text-[12.5px] font-black text-on-surface tracking-tight uppercase flex items-center gap-1.5">
              <span>🏷️</span> Budget Store
            </h3>
            <span className="text-[9.5px] text-outline font-medium">
              Pick your budget • Shop verified quality
            </span>
          </div>
          <Link to="/shop" className="text-[10.5px] font-bold text-secondary flex items-center gap-0.5">
            Explore <Icon name="chevron_right" className="text-[14px]" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {budgets.map((b) => (
            <Link
              key={b.title}
              to={b.to}
              className={cn(
                'rounded-xl p-2.5 bg-gradient-to-br text-white flex flex-col justify-between aspect-[1.8/1] shadow-2xs active:scale-[0.97] transition-all relative overflow-hidden',
                b.color
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-wider bg-black/30 px-1.5 py-0.5 rounded-full border border-white/20">
                  {b.discount}
                </span>
                <Icon name={b.icon} className="text-[18px] opacity-85" />
              </div>

              <div>
                <span className="text-[14px] font-black leading-tight block drop-shadow-xs">
                  {b.title}
                </span>
                <span className="text-[9.5px] font-semibold text-white/90 line-clamp-1 block">
                  {b.subtitle}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 7. Flipkart Interactive Category Tab Filter (Instant 2-Col Switch) ──
function MobileInteractiveTabShowcase({ allProducts }) {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All', 'Backpacks', 'Laptop Bags', 'Handbags', 'Travel Duffles', 'Wallets'];

  const filtered = useMemo(() => {
    if (!allProducts || !allProducts.length) return [];
    if (activeTab === 'All') return allProducts.slice(0, 4);
    const slugMap = {
      Backpacks: 'backpack',
      'Laptop Bags': 'laptop',
      Handbags: 'tote',
      'Travel Duffles': 'travel',
      Wallets: 'wallet',
    };
    const key = slugMap[activeTab] || activeTab.toLowerCase();
    const matches = allProducts.filter(
      (p) =>
        (p.category?.name && p.category.name.toLowerCase().includes(key)) ||
        (p.category?.slug && p.category.slug.toLowerCase().includes(key)) ||
        p.name.toLowerCase().includes(key)
    );
    return matches.length >= 2 ? matches.slice(0, 4) : allProducts.slice(0, 4);
  }, [allProducts, activeTab]);

  if (!filtered.length) return null;

  return (
    <section className="px-2 py-1.5 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between px-0.5 mb-2">
          <div>
            <h3 className="text-[12.5px] font-black text-on-surface tracking-tight uppercase">
              Trending Collections
            </h3>
            <span className="text-[9.5px] text-outline font-medium">
              Tap to view items instantly
            </span>
          </div>
          <Link to="/shop" className="text-[10.5px] font-bold text-secondary flex items-center gap-0.5">
            Shop All <Icon name="chevron_right" className="text-[14px]" />
          </Link>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2 pt-0.5 snap-x touch-pan-x">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1 rounded-full text-[10.5px] font-bold shrink-0 snap-start transition-all border select-none',
                activeTab === tab
                  ? 'bg-secondary text-on-secondary border-secondary shadow-xs scale-102'
                  : 'bg-surface-container-low text-on-surface border-outline-variant/30'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 2 Items Per Row Compact Grid */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {filtered.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 8. Flipkart-style Quick Trust Value Strip ──
function MobileValueStrip() {
  const items = [
    { icon: 'verified', title: '100% Genuine', sub: 'Original Craft' },
    { icon: 'assignment_return', title: '7 Days Return', sub: 'Easy Exchange' },
    { icon: 'local_shipping', title: 'Free Delivery', sub: 'All Over India' },
    { icon: 'lock', title: 'Secure UPI', sub: 'Safe Payments' },
  ];

  return (
    <div className="px-2 py-1 w-full max-w-full">
      <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center gap-0.5">
            <Icon name={item.icon} className="text-[17px] text-secondary" />
            <span className="text-[8.5px] font-bold text-on-surface leading-tight line-clamp-1">
              {item.title}
            </span>
            <span className="text-[7.5px] text-outline line-clamp-1 leading-none">
              {item.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 9. Generic 2-Column Section Grid (Bestsellers & Rails) ──
function Mobile3ColSection({ title, subtitle, link = '/shop', products }) {
  const items = (products || []).slice(0, 4);
  if (!items.length) return null;

  return (
    <section className="px-2 py-1.5 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between px-0.5 mb-2">
          <div className="flex flex-col">
            <h3 className="text-[12.5px] font-black text-on-surface tracking-tight uppercase">
              {title}
            </h3>
            {subtitle && (
              <span className="text-[9.5px] text-outline font-medium">
                {subtitle}
              </span>
            )}
          </div>
          <Link
            to={link}
            className="text-[10.5px] font-bold text-secondary flex items-center gap-0.5 active:scale-95"
          >
            See All <Icon name="chevron_right" className="text-[14px]" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {items.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 10. Complete Store Catalog Section with "Filter & Sort" Button ──
function MobileEntireStoreSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'mobile-all-feed'],
    queryFn: () => api.products({ limit: 8, sort: 'featured' }),
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.items || [];
  if (!products.length && !isLoading) return null;

  return (
    <section className="px-2 py-1.5 w-full max-w-full">
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 p-2.5 shadow-2xs">
        <div className="flex items-center justify-between px-0.5 mb-2">
          <div className="flex flex-col">
            <h3 className="text-[12.5px] font-black text-on-surface tracking-tight uppercase">
              All Bags & Travel Gear
            </h3>
            <span className="text-[9.5px] text-outline font-medium">
              Explore our full collection
            </span>
          </div>
          <Link
            to="/shop"
            className="text-[10.5px] font-bold text-secondary flex items-center gap-0.5 active:scale-95"
          >
            Filter & Sort <Icon name="tune" className="text-[14px]" />
          </Link>
        </div>

        {/* 2 Items Per Row Grid */}
        <div className="grid grid-cols-2 gap-2">
          {products.map((p) => (
            <MobileProductCard key={p._id} product={p} />
          ))}
        </div>

        <div className="pt-2.5 pb-0.5 flex justify-center">
          <Link
            to="/shop"
            className="w-full py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface font-black text-[12px] flex items-center justify-center gap-1.5 active:bg-surface-container transition-colors shadow-2xs"
          >
            Browse All {data?.total || '60+'} Products <Icon name="arrow_forward" className="text-[14px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── 11. Flipkart-style Clean Mobile Footer Accordion & Trust Info ──
function MobileStoreFooter() {
  const [openSection, setOpenSection] = useState(null);

  const toggle = (sec) => {
    setOpenSection((prev) => (prev === sec ? null : sec));
  };

  return (
    <footer className="mt-4 px-2 pb-6 flex flex-col gap-2.5 text-on-surface">
      {/* Official WILDTANE App Banner (PWA + Direct APK Download) */}
      <div className="rounded-2xl p-3 bg-gradient-to-br from-secondary/15 via-surface-container-low to-surface-container-high border border-secondary/35 shadow-2xs">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center font-black shadow-xs shrink-0">
            <Icon name="install_mobile" className="text-[22px]" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-black tracking-tight text-on-surface flex items-center gap-1.5">
              Official WILDTANE App <span className="text-[8.5px] bg-secondary/20 text-secondary px-1.5 py-0.2 rounded font-black tracking-wider uppercase">Android</span>
            </h4>
            <p className="text-[10px] text-outline font-medium line-clamp-1">
              Shop faster with offline mode & 1-tap checkout
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('wt-open-install-app'))}
            className="h-9 px-2 rounded-xl bg-secondary text-on-secondary font-black text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-transform"
          >
            <Icon name="bolt" className="text-[15px]" /> 1-Tap Install
          </button>
          <a
            href="/wildtane.apk"
            download="wildtane.apk"
            className="h-9 px-2 rounded-xl bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-transform"
          >
            <Icon name="download" className="text-[15px]" /> Download .APK
          </a>
        </div>
        <div className="mt-2 text-center">
          <Link to="/download" className="text-[10.5px] text-secondary font-bold hover:underline">
            View App Details, Features & Install Guide →
          </Link>
        </div>
      </div>

      {/* 1-Tap Help Buttons: WhatsApp & Phone Support */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href="https://wa.me/918920550465"
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-3 rounded-xl bg-emerald-600 text-white font-bold text-[11.5px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
        >
          <Icon name="chat" className="text-[16px]" /> WhatsApp Help
        </a>
        <a
          href="tel:8920550465"
          className="h-10 px-3 rounded-xl bg-surface-container-high border border-outline-variant/50 text-on-surface font-bold text-[11.5px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
        >
          <Icon name="call" className="text-[16px] text-secondary" /> Call Support
        </a>
      </div>

      {/* Clean Collapsible Navigation Pills */}
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden divide-y divide-outline-variant/20 shadow-2xs">
        {/* Help & Support */}
        <div>
          <button
            type="button"
            onClick={() => toggle('help')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-[12px] font-bold text-on-surface text-left"
          >
            <span>Customer Care & Order Tracking</span>
            <Icon name={openSection === 'help' ? 'expand_less' : 'expand_more'} className="text-[18px] text-outline" />
          </button>
          {openSection === 'help' && (
            <div className="px-3.5 pb-3 flex flex-col gap-2 text-[11px] text-on-surface-variant animate-fade-in">
              <Link to="/track" className="hover:text-secondary">Track Your Order</Link>
              <Link to="/returns-exchange" className="hover:text-secondary">7-Day Returns & Exchange</Link>
              <Link to="/shipping-policy" className="hover:text-secondary">Shipping & Tracked Delivery</Link>
              <Link to="/faq" className="hover:text-secondary">Frequently Asked Questions</Link>
            </div>
          )}
        </div>

        {/* Policies */}
        <div>
          <button
            type="button"
            onClick={() => toggle('policies')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-[12px] font-bold text-on-surface text-left"
          >
            <span>Policies & Legal Information</span>
            <Icon name={openSection === 'policies' ? 'expand_less' : 'expand_more'} className="text-[18px] text-outline" />
          </button>
          {openSection === 'policies' && (
            <div className="px-3.5 pb-3 flex flex-col gap-2 text-[11px] text-on-surface-variant animate-fade-in">
              <Link to="/privacy-policy" className="hover:text-secondary">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-secondary">Terms & Conditions</Link>
              <Link to="/return-policy" className="hover:text-secondary">Return & Refund Policy</Link>
              <p className="text-[10px] text-outline mt-1">GSTIN: 07AAECW3767F1Z4</p>
            </div>
          )}
        </div>

        {/* About Wildtane */}
        <div>
          <button
            type="button"
            onClick={() => toggle('about')}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-[12px] font-bold text-on-surface text-left"
          >
            <span>About WILDTANE Private Limited</span>
            <Icon name={openSection === 'about' ? 'expand_less' : 'expand_more'} className="text-[18px] text-outline" />
          </button>
          {openSection === 'about' && (
            <div className="px-3.5 pb-3 flex flex-col gap-1.5 text-[11px] text-on-surface-variant animate-fade-in">
              <p>Handcrafted luxury bags, backpacks and cabin travel gear engineered in New Delhi, India.</p>
              <Link to="/about" className="font-bold text-secondary mt-1">Read Our Story →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Copyright */}
      <div className="text-center py-2 text-[10px] text-outline">
        <p>© {new Date().getFullYear()} WILDTANE PRIVATE LIMITED. All rights reserved.</p>
        <p className="text-[9px] mt-0.5">Paharganj, New Delhi, 110055 • Made in India</p>
      </div>
    </footer>
  );
}

// ── Master Flipkart Mobile Home Component ──
function MobileRail({ rail }) {
  const { products } = useRailProducts(rail, 6);
  return <Mobile3ColSection title={rail.title} subtitle={rail.subtitle} link={rail.link || '/shop'} products={products} />;
}

export default function MobileFlipkartHome() {
  const hp = useHomepage();
  const m = hp.mobile;
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: api.collections,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full max-w-full flex flex-col pb-24 bg-surface">
      {/* 1. Header with Brand, Plus Pill, Coins, Wishlist, Cart & Search */}
      <MobileTopSearchHeader />

      {/* 2. Flipkart Category Story Circles */}
      <MobileCategoryCircles />

      {/* 3. Hero Banner Carousel */}
      <MobileHeroBanner slides={m.heroSlides} />

      {/* 4. Trust Strip */}
      <MobileValueStrip />

      {/* 5. Continue Shopping / Recently Viewed */}
      <ContinueShopping compact className="py-1" />

      {/* 6. Flipkart Deal of the Day (Timer + Decreased Size 2-Col Grid) */}
      <MobileDealOfTheDay
        products={collections ? collections.featured || [] : undefined}
        content={m.deal}
      />

      {/* 7. Flipkart Budget Store (Under ₹999, ₹1,499...) */}
      <MobileBudgetStore />

      {/* 8. Interactive Tab Filter */}
      <MobileInteractiveTabShowcase
        allProducts={collections?.featured || collections?.bestSellers}
      />

      {/* 9. Configured Rails */}
      {(m.rails || []).map((r, i) => (
        <MobileRail key={`${i}-${r.source}-${r.category}`} rail={r} />
      ))}

      {/* 10. Entire Store Catalog */}
      <MobileEntireStoreSection />

      {/* 11. Clean Flipkart-Style Mobile Footer */}
      <MobileStoreFooter />
    </div>
  );
}
