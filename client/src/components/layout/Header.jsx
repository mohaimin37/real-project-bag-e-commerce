import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCartOpen, setCurrency, setMobileNavOpen, setSearchOpen, setThemeOpen, toggleContrast, toggleTheme } from '../../store';
import { useCategories, useConfig, useUser } from '../../hooks/useStore';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuthActions } from '../../hooks/useAuth';
import { cn, imgUrl, initials } from '../../lib/format';
import { categoryTone } from '../../lib/categoryTone';
import { ADMIN_NAV, adminPath } from '../../admin/nav';
import { Drawer, Icon, Img } from '../ui';
import { CoinIcon, useMyCoins } from '../coins';
import { BrandLogo, LogoMark } from '../Brand';
import { prefersReducedMotion } from '../../theme/engine';

export { LogoMark };

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// Main storefront navigation (desktop bar; the side menu repeats it on phones).
export const MAIN_NAV = [
  ['/', 'Home', true],
  ['/men', 'Men'],
  ['/women', 'Women'],
  ['/universal', 'Universal'],
  ['/shop/travel-utility', 'Travel & Utility'],
  ['/shop/accessories', 'Accessories'],
  ['/shop', 'Shop'],
  ['/about', 'About Us'],
];

const SHOP_EDITS = [
  ['/men', 'man', 'Men'],
  ['/women', 'woman', 'Women'],
  ['/universal', 'public', 'Universal'],
  ['/shop/travel-utility', 'flight_takeoff', 'Travel & Utility'],
  ['/shop/accessories', 'watch', 'Accessories'],
  ['/shop?newArrival=true&sort=newest', 'new_releases', 'New arrivals'],
  ['/shop?bestseller=true&sort=bestseller', 'local_fire_department', 'Best sellers'],
  ['/offers', 'sell', 'Offers'],
  ['/catalogue', 'view_carousel', 'Catalogue'],
];
const DISCOVER = [
  ['/about', 'About Us'],
  ['/corporate', 'Corporate bulk'],
  ['/blog', 'Journal'],
  ['/help', 'Help Centre'],
  ['/faq', 'FAQs'],
  ['/contact', 'Contact us'],
  ['/policies', 'Policies'],
];

function CountBadge({ count, tone = 'from-rose-600 to-pink-500' }) {
  if (!count) return null;
  return (
    // Keyed by count so the bump animation replays whenever it changes.
    <span key={count} className={cn('absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-gradient-to-br text-white text-[10px] font-bold ring-2 ring-surface-container-lowest shadow-sm animate-bump', tone)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Thumb({ cat, className }) {
  return cat.image?.url ? (
    <Img src={cat.image.url} alt="" w={80} className={cn('shrink-0 rounded-lg', className)} />
  ) : (
    <span className={cn('shrink-0 rounded-lg flex items-center justify-center', categoryTone(cat).tint, categoryTone(cat).text, className)}>
      <Icon name={categoryTone(cat).icon} className="text-[18px]" />
    </span>
  );
}

function AccountMenu() {
  const user = useUser();
  const coins = useMyCoins();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return undefined;
    const fn = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  if (!user) {
    return (
      <Link to="/login" className="hidden md:inline-flex items-center gap-1.5 h-9 ml-1 px-4 rounded-full text-[13px] font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-500 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all">
        <Icon name="person" className="text-[18px]" /> Sign in
      </Link>
    );
  }
  return (
    <div className="relative hidden md:block" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 h-9 pl-1 pr-2 ml-1 rounded-full ring-1 ring-outline-variant hover:ring-indigo-400 hover:bg-indigo-500/5 transition-all">
        {user.avatar?.url ? (
          <img src={imgUrl(user.avatar.url)} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 text-white text-[11px] font-bold flex items-center justify-center">{initials(user.name)}</span>
        )}
        <span className="text-label-lg max-w-[100px] truncate">{user.name?.split(' ')[0]}</span>
        <Icon name="expand_more" className={cn('text-[18px] text-outline transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-60 bg-surface-container-lowest rounded-xl shadow-lift border border-surface-container-high p-1.5 z-50 animate-pop-in">
          <div className="px-3 py-2 border-b border-surface-container-high mb-1">
            <p className="text-label-lg truncate">{user.name}</p>
            <p className="text-body-sm text-on-surface-variant truncate">{user.email}</p>
          </div>
          <Link to="/account/coins" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container text-body-sm">
            <CoinIcon className="w-[18px] h-[18px]" /> My coins
            <span className="ml-auto font-bold tabular-nums">{coins.data?.balance ?? '…'}</span>
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container text-body-sm text-secondary font-semibold">
              <Icon name="dashboard" className="text-[18px]" /> Admin dashboard
            </Link>
          )}
          {[
            ['/account', 'space_dashboard', 'My account'],
            ['/account/orders', 'receipt_long', 'Orders'],
            ['/account/addresses', 'location_on', 'Addresses'],
            ['/wishlist', 'favorite', 'Wishlist'],
          ].map(([to, icon, label]) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container text-body-sm">
              <Icon name={icon} className="text-[18px] text-on-surface-variant" /> {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              dispatch(setThemeOpen(true));
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container text-body-sm"
          >
            <Icon name="palette" className="text-[18px] text-on-surface-variant" /> Appearance & theme
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container text-body-sm text-error"
          >
            <Icon name="logout" className="text-[18px]" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function CurrencySelect({ className, optionClassName }) {
  const dispatch = useDispatch();
  const { data: config } = useConfig();
  const currency = useSelector((s) => s.ui.currency);
  return (
    <label className={cn('flex items-center gap-1', className)}>
      <span className="sr-only">Display currency</span>
      <Icon name="public" className="text-[16px]" />
      <select value={currency} onChange={(e) => dispatch(setCurrency(e.target.value))} className="bg-transparent py-1 cursor-pointer focus:outline-none">
        {(config?.currencies || [{ code: 'INR', label: 'India (INR ₹)' }]).map((c) => (
          <option key={c.code} value={c.code} className={optionClassName}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SideNav({ categories }) {
  const open = useSelector((s) => s.ui.mobileNavOpen);
  const coins = useMyCoins();
  const theme = useSelector((s) => s.ui.theme);
  const contrast = useSelector((s) => s.ui.contrast);
  const dispatch = useDispatch();
  const user = useUser();
  const [expanded, setExpanded] = useState(null);
  const close = () => dispatch(setMobileNavOpen(false));
  const row = 'flex items-center gap-3 px-5 py-2.5 text-body-sm hover:bg-surface-container transition-colors';
  const heading = 'px-5 pt-5 pb-1 text-[11px] font-semibold text-outline uppercase tracking-wider';

  return (
    <Drawer
      open={open}
      onClose={close}
      side="left"
      width="max-w-xs"
      title={
        <div className="flex items-center gap-2">
          <LogoMark className="w-7 h-7 shrink-0" />
          <h2 className="font-serif tracking-widest font-black text-lg text-on-surface uppercase">WILDTANE</h2>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-2 text-label-md text-on-surface-variant">
          <CurrencySelect className="min-w-0" optionClassName="bg-surface-container-lowest text-on-surface" />
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                close();
                dispatch(setThemeOpen(true));
              }}
              aria-label="Appearance and theme"
              className="btn-icon"
            >
              <Icon name="palette" className="text-[20px]" />
            </button>
            <button type="button" onClick={() => dispatch(toggleTheme())} aria-pressed={theme === 'dark'} aria-label="Toggle dark theme" className="btn-icon">
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="text-[20px]" />
            </button>
            <button type="button" onClick={() => dispatch(toggleContrast())} aria-pressed={contrast === 'high'} aria-label="Toggle high contrast" className={cn('btn-icon', contrast === 'high' && 'text-secondary')}>
              <Icon name="accessibility_new" className="text-[20px]" />
            </button>
          </div>
        </div>
      }
    >
      <nav aria-label="Site" className="pb-4">
        <div className="px-5 pt-4">
          {user ? (
            <Link to="/account" onClick={close} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
              <span className="w-9 h-9 rounded-full bg-secondary text-on-secondary text-label-md flex items-center justify-center">{initials(user.name)}</span>
              <span className="flex flex-col min-w-0 flex-1">
                <span className="text-label-lg truncate">{user.name}</span>
                <span className="text-[12px] text-on-surface-variant flex items-center gap-1">View account · <CoinIcon className="w-3.5 h-3.5" /> {coins.data?.balance ?? 0} coins</span>
              </span>
              <Icon name="chevron_right" className="text-outline" />
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link to="/login" onClick={close} className="btn-primary">Sign in</Link>
              <Link to="/register" onClick={close} className="btn-tonal">Register</Link>
            </div>
          )}
        </div>

        {user?.role === 'admin' && (
          <>
            <p className={cn(heading, 'text-secondary')}>Admin</p>
            {ADMIN_NAV.flatMap((g) => g.items).map(([to, icon, label]) => (
              <Link key={to || 'home'} to={adminPath(to)} onClick={close} className={row}>
                <Icon name={icon} className="text-[18px] text-secondary" /> {label}
              </Link>
            ))}
          </>
        )}

        <p className={heading}>Shop</p>
        <Link to="/" onClick={close} className={row}>
          <Icon name="home" className="text-[18px] text-on-surface-variant" /> Home
        </Link>
        <Link to="/shop" onClick={close} className={row}>
          <Icon name="grid_view" className="text-[18px] text-on-surface-variant" /> All products
        </Link>
        {SHOP_EDITS.map(([to, icon, label]) => (
          <Link key={to} to={to} onClick={close} className={row}>
            <Icon name={icon} className="text-[18px] text-on-surface-variant" /> {label}
          </Link>
        ))}

        <p className={heading}>Categories</p>
        {categories?.map((cat) => {
          const isOpen = expanded === cat._id;
          return (
            <div key={cat._id}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : cat._id)} className={cn(row, 'w-full justify-between')} aria-expanded={isOpen}>
                <span className="flex items-center gap-2.5">
                  <span className={cn('w-2.5 h-2.5 rounded-full', categoryTone(cat).dot)} /> {cat.name}
                </span>
                <Icon name="expand_more" className={cn('text-[18px] text-outline transition-transform duration-200', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="bg-surface-container-low py-1">
                  <Link to={`/shop/${cat.slug}`} onClick={close} className={cn('block px-5 py-2 text-label-lg font-semibold', categoryTone(cat).text)}>
                    Shop all {cat.name}
                  </Link>
                  {cat.children.map((c) => (
                    <Link key={c._id} to={`/shop/${c.slug}`} onClick={close} className="flex items-center gap-3 px-5 py-1.5 text-body-sm">
                      <Thumb cat={c} className="w-8 h-8" />
                      <span className="flex-1">{c.name}</span>
                      {c.productCount > 0 && <span className="text-[11px] text-outline">{c.productCount}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <p className={heading}>More</p>
        <button
          type="button"
          onClick={() => {
            close();
            dispatch(setThemeOpen(true));
          }}
          className={cn(row, 'w-full')}
        >
          <Icon name="palette" className="text-[18px] text-on-surface-variant" /> Appearance & theme
        </button>
        {DISCOVER.map(([to, label]) => (
          <Link key={to} to={to} onClick={close} className={row}>
            {label}
          </Link>
        ))}
      </nav>
    </Drawer>
  );
}

/** Slim gradient strip above the header with one store promise at a time, sliding up every few seconds. */
function PromoStrip() {
  const { data: config } = useConfig();
  const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const messages = [
    config?.freeShippingThreshold > 0 && ['local_shipping', `Free delivery on orders over ${money(config.freeShippingThreshold)}`],
    ['assignment_return', '7-day easy returns'],
    ['payments', 'Cash on delivery available'],
    config?.loyalty?.enabled && ['toll', 'Earn WILDTANE coins on every order'],
  ].filter(Boolean);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion() || messages.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % messages.length), 3500);
    return () => clearInterval(t);
  }, [messages.length]);
  const [icon, text] = messages[i % messages.length];
  return (
    <div className="bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 text-white">
      <p key={i} className="container-x h-8 flex items-center justify-center gap-1.5 text-[12px] font-semibold animate-promo-in" aria-live="polite">
        <Icon name={icon} className="text-[16px]" /> {text}
      </p>
    </div>
  );
}

/** "Shop" mega-menu (desktop): quick links on the left, categories with thumbnails on the right. Opens on hover or click. */
function ShopMenu({ categories }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const { pathname, search } = useLocation();
  useEffect(() => setOpen(false), [pathname, search]);
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };
  const tones = ['text-sky-600', 'text-rose-600', 'text-emerald-600', 'text-violet-600', 'text-fuchsia-600', 'text-indigo-600', 'text-teal-600'];
  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn('h-9 px-3.5 inline-flex items-center gap-0.5 rounded-full text-[13px] font-semibold transition-colors', open ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container')}
      >
        Shop <Icon name="expand_more" className={cn('text-[18px] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-11 w-[640px] grid grid-cols-[200px_1fr] gap-4 p-4 rounded-2xl bg-surface-container-lowest shadow-2xl ring-1 ring-outline-variant z-50 animate-pop-in">
          <div className="flex flex-col gap-0.5 pr-4 border-r border-surface-container-high">
            <Link to="/shop" className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-500 mb-1">
              <Icon name="grid_view" className="text-[18px]" /> All products
            </Link>
            {SHOP_EDITS.map(([to, icon, label], n) => (
              <Link key={to} to={to} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[13px] font-medium hover:bg-surface-container transition-colors">
                <Icon name={icon} className={cn('text-[18px]', tones[n % tones.length])} /> {label}
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 content-start">
            {(categories || []).slice(0, 6).map((cat) => (
              <div key={cat._id} className="flex flex-col gap-1">
                <Link to={`/shop/${cat.slug}`} className={cn('flex items-center gap-2 text-[13px] font-bold hover:underline', categoryTone(cat).text)}>
                  <Thumb cat={cat} className="w-8 h-8" /> {cat.name}
                </Link>
                <div className="flex flex-wrap gap-1 pl-10">
                  {cat.children.slice(0, 4).map((c) => (
                    <Link key={c._id} to={`/shop/${c.slug}`} className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium hover:brightness-95 transition', categoryTone(c).tint, categoryTone(c).text)}>
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SEARCH_HINTS = ['backpacks', 'tote bags', 'laptop bags', 'cabin luggage', 'wallets', 'duffle bags'];

/** Pill search button with modern interactive widgets (voice search mic, rotating hints, keyboard badge). */
function SearchPill({ onOpen, onVoiceOpen }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % SEARCH_HINTS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label="Search products"
      className="group flex-1 md:max-w-xl md:mx-auto flex items-center gap-2 h-10 pl-1.5 pr-2 rounded-full bg-surface-container/80 text-on-surface-variant text-[13px] ring-1 ring-outline-variant/40 hover:ring-secondary/60 hover:bg-surface-container-lowest hover:shadow-lg hover:shadow-secondary/5 transition-all cursor-pointer min-w-0"
    >
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary via-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-xs">
        <Icon name="search" className="text-[17px]" />
      </span>
      <span className="truncate flex-1 min-w-0">
        Search <span key={i} className="inline-block font-semibold text-on-surface animate-promo-in">{SEARCH_HINTS[i]}</span>…
      </span>

      {/* Voice Search Widget Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onVoiceOpen?.();
        }}
        className="w-7 h-7 rounded-full hover:bg-secondary/15 hover:text-secondary text-outline flex items-center justify-center transition-all shrink-0 active:scale-90"
        title="Voice Search"
        aria-label="Voice Search"
      >
        <Icon name="mic" className="text-[17px]" />
      </button>

      <kbd className="hidden lg:inline-flex items-center h-5 px-1.5 text-[10px] rounded-md bg-surface-container-lowest text-outline font-sans ring-1 ring-outline-variant/50 shrink-0">
        {IS_MAC ? '⌘K' : 'Ctrl K'}
      </kbd>
    </div>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const { data: categories } = useCategories();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const isMobileCustomHeader = pathname === '/' || pathname.startsWith('/shop') || ['/men', '/women', '/universal', '/unisex', '/offers'].includes(pathname);

  useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch(setSearchOpen(true));
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [dispatch]);

  // A soft shadow once the page scrolls, so the sticky header lifts off the content.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const fn = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const iconBtn = 'relative inline-flex items-center justify-center w-10 h-10 rounded-full text-on-surface transition-all hover:scale-105 active:scale-95';

  return (
    <>
      <header className={cn('site-header sticky top-0 z-50 w-full transition-shadow duration-300', isMobileCustomHeader && 'hidden md:block', scrolled && 'shadow-[0_6px_24px_-12px_rgb(0_0_0/0.25)]')}>
        <div className="container-x h-16 flex items-center gap-2 md:gap-4">
          <button type="button" className={cn(iconBtn, '-ml-2 hover:bg-surface-container')} aria-label="Open menu" onClick={() => dispatch(setMobileNavOpen(true))}>
            <Icon name="menu" className="text-[22px]" />
          </button>
          <Link to="/" className="flex items-center gap-2 md:gap-2.5 shrink-0" aria-label="WILDTANE home">
            <LogoMark className="w-8 h-8 md:w-9 md:h-9 shrink-0" />
            <h1 className="font-serif tracking-widest font-black text-xl md:text-2xl text-on-surface uppercase select-none">
              WILDTANE
            </h1>
          </Link>

          {/* Pill nav: the current page is a gradient pill; Shop opens the mega-menu. */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5 p-1 rounded-full bg-surface-container/60 shrink-0">
            {MAIN_NAV.filter(([to]) => to !== '/shop').map(([to, label, end]) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'h-8 px-3.5 inline-flex items-center rounded-full text-[13px] font-semibold transition-all',
                    isActive ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-500 shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            <ShopMenu categories={categories} />
          </nav>

          <SearchPill
            onOpen={() => dispatch(setSearchOpen(true))}
            onVoiceOpen={() => dispatch(setSearchOpen({ open: true, voice: true }))}
          />

          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={() => dispatch(setThemeOpen(true))} aria-label="Appearance and theme" title="Appearance & theme" className={cn(iconBtn, 'hidden md:inline-flex hover:bg-violet-500/10 hover:text-violet-600')}>
              <Icon name="palette" className="text-[20px]" />
            </button>
            <Link to="/wishlist" aria-label={`Wishlist, ${wishCount} items`} title="Wishlist" className={cn(iconBtn, 'hidden md:inline-flex hover:bg-rose-500/10 hover:text-rose-600')}>
              <Icon name="favorite" className="text-[21px]" />
              <CountBadge count={wishCount} />
            </Link>
            <button type="button" onClick={() => dispatch(setCartOpen(true))} aria-label={`Bag, ${count} items`} title="Bag" className={cn(iconBtn, 'hover:bg-indigo-500/10 hover:text-indigo-600')}>
              <Icon name="shopping_bag" className="text-[21px]" />
              <CountBadge count={count} tone="from-indigo-600 to-violet-500" />
            </button>
            <AccountMenu />
          </div>
        </div>
      </header>
      <SideNav categories={categories} />
    </>
  );
}
