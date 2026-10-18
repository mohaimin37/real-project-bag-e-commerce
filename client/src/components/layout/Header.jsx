import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { setCartOpen, setChatOpen, setCurrency, setMobileNavOpen, setSearchOpen, setShopModalOpen, setThemeOpen, toggleContrast, toggleTheme } from '../../store';
import { api } from '../../lib/api';
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
import { useDirectory } from '../../lib/directory';
import { openSpinWheel, useSpinStatus } from '../growth/SpinWheelModal';
import { DIRECTORIES } from '../../content/taxonomy';
export { LogoMark };

// Main storefront navigation (desktop bar; the side menu repeats it on phones).
export const MAIN_NAV = [
  ['/', 'Home', true],
  ['/all', 'All'],
  ['/men', 'Men'],
  ['/women', 'Women'],
  ['/bags', 'Bags'],
  ['/universal', 'Universal'],
  ['/shop/travel-utility', 'Travel & Utility'],
  ['/shop/accessories', 'Accessories'],
  ['/shop/clothing', 'Clothing'],
  ['/shop/fragrance', 'Perfumes'],
  ['/shop', 'Shop'],
  ['/returns-exchange', 'Returns & Exchange'],
  ['/help', 'Help & Live Chat'],
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
  ['/track', 'local_shipping', 'Track Order'],
  ['/returns-exchange', 'assignment_return', 'Returns & Exchange'],
];
const DISCOVER = [
  ['/track', 'Track Order'],
  ['/about', 'About Us'],
  ['/sustainability', 'Sustainability & CSR'],
  ['/returns-exchange', 'Returns & Exchange'],
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

/** "Spin & Win" menu entry: always available here, even after the floating button hides for the day. */
function SpinMenuItem({ className, onPick }) {
  const { data: status } = useSpinStatus();
  if (status?.enabled === false) return null;
  const played = status && !status.eligible && !status.signInRequired;
  return (
    <button
      type="button"
      onClick={() => {
        onPick?.();
        openSpinWheel();
      }}
      className={className}
    >
      <Icon name="casino" className="text-[18px] text-violet-600 dark:text-violet-400" /> Spin & Win
      <span className={cn('ml-auto text-[11px]', played ? 'text-outline' : 'text-violet-700 dark:text-violet-300 font-semibold')}>
        {played ? 'Played today' : 'Spin today'}
      </span>
    </button>
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
      <Link to="/login" className="hidden md:inline-flex items-center gap-1.5 h-10 ml-1 px-4 rounded-full text-[13px] font-semibold text-white bg-gradient-to-r from-rose-600 via-rose-700 to-stone-900 shadow-md ring-1 ring-rose-400/30 hover:shadow-lg hover:scale-[1.03] transition-all">
        <Icon name="person" className="text-[18px]" /> Sign in
      </Link>
    );
  }
  return (
    <div className="relative hidden md:block" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu" className="flex items-center gap-2 h-10 pl-1.5 pr-3 ml-1 rounded-full ring-1 ring-outline-variant/40 hover:ring-rose-500/50 hover:bg-rose-500/5 transition-all shadow-2xs">
        {user.avatar?.url ? (
          <img src={imgUrl(user.avatar.url)} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-600 via-rose-700 to-stone-900 text-rose-200 text-[11px] font-bold flex items-center justify-center shadow-xs">{initials(user.name)}</span>
        )}
        <span className="text-label-lg max-w-[110px] truncate font-medium">{user.name?.split(' ')[0]}</span>
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
          <SpinMenuItem className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container text-body-sm" onPick={() => setOpen(false)} />
          {user.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container text-body-sm text-secondary font-semibold">
              <Icon name="dashboard" className="text-[18px]" /> Admin dashboard
            </Link>
          )}
          {[
            ['/account', 'space_dashboard', 'My account'],
            ['/account/orders', 'receipt_long', 'Orders'],
            ['/returns-exchange', 'assignment_return', 'Returns & Exchange'],
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

/** Phone menu: one department (Women, Men, Bags…) that expands into its groups and categories. */
function DirectoryAccordion({ dir, open, onToggle, onNavigate, row }) {
  const { sections, bySlug, isLoading } = useDirectory(dir.key, open);
  const [openGroup, setOpenGroup] = useState(null);
  const groups = (sections || []).flatMap((s) => s.groups);
  return (
    <div>
      <button type="button" onClick={onToggle} className={cn(row, 'w-full justify-between')} aria-expanded={open}>
        <span className="flex items-center gap-2.5">
          <span className={cn('w-2.5 h-2.5 rounded-full', categoryTone({ name: dir.label }).dot)} /> {dir.label}
        </span>
        <Icon name="expand_more" className={cn('text-[18px] text-outline transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="bg-surface-container-low py-1 animate-fade-in">
          <Link to={dir.path} onClick={onNavigate} className="block px-5 py-2 text-label-lg font-semibold text-secondary">Shop all {dir.label}</Link>
          {isLoading && <p className="px-5 py-2 text-body-sm text-outline">Loading…</p>}
          {groups.map((g) => {
            const gOpen = openGroup === g.key;
            return (
              <div key={g.key}>
                <button type="button" onClick={() => setOpenGroup(gOpen ? null : g.key)} aria-expanded={gOpen} className="w-full flex items-center justify-between px-5 py-2 text-body-sm font-medium">
                  <span>{g.label} <span className="text-[11px] text-outline">{g.count}</span></span>
                  <Icon name="expand_more" className={cn('text-[16px] text-outline transition-transform', gOpen && 'rotate-180')} />
                </button>
                {gOpen && (
                  <div className="pb-1">
                    {g.items.map((i) => (
                      <Link key={i.slug} to={i.to} onClick={onNavigate} className="flex items-center gap-3 px-7 py-1.5 text-body-sm">
                        <Thumb cat={bySlug.get(i.slug) || { name: i.label, slug: i.slug }} className="w-7 h-7" />
                        <span className="flex-1">{i.label}</span>
                        <span className="text-[11px] text-outline">{i.count}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
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

          <div className="mt-3">
            <Link
              to="/returns-exchange"
              onClick={close}
              className="flex items-center gap-3 p-3 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-800 dark:text-teal-200 hover:bg-teal-500/20 active:scale-[0.99] transition-all shadow-xs"
            >
              <span className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Icon name="assignment_return" className="text-[19px]" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold leading-tight">Returns & Exchange</span>
                <span className="block text-[11px] opacity-80">7-Day doorstep pickup · Coin rewards</span>
              </div>
              <Icon name="chevron_right" className="text-[18px] opacity-70" />
            </Link>
          </div>

          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                close();
                dispatch(setChatOpen(true));
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/25 text-on-surface hover:bg-secondary/20 active:scale-[0.99] transition-all shadow-xs text-left"
            >
              <span className="w-8 h-8 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                <Icon name="chat" className="text-[19px]" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold leading-tight">Live Support Chat</span>
                <span className="block text-[11px] text-outline">Chat with team · Orders & refunds</span>
              </div>
              <Icon name="chevron_right" className="text-[18px] opacity-70" />
            </button>
          </div>
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
        <div className="px-5 pb-2">
          <button
            type="button"
            onClick={() => {
              close();
              dispatch(setShopModalOpen(true));
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-indigo-500/15 border border-secondary/35 text-on-surface shadow-xs active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-secondary text-on-secondary flex items-center justify-center font-bold shadow-xs">
                <Icon name="grid_view" className="text-[18px]" />
              </span>
              <div className="text-left">
                <div className="text-[13px] font-bold leading-tight flex items-center gap-1.5">
                  Shop Modern Widgets <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                </div>
                <div className="text-[10.5px] text-on-surface-variant">Budget, trends & collections</div>
              </div>
            </div>
            <Icon name="chevron_right" className="text-secondary text-[20px]" />
          </button>
        </div>
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
        {Object.values(DIRECTORIES).map((dir) => (
          <DirectoryAccordion key={dir.key} dir={dir} open={expanded === dir.key} onToggle={() => setExpanded(expanded === dir.key ? null : dir.key)} onNavigate={close} row={row} />
        ))}

        <p className={heading}>Download App</p>
        <Link
          to="/download"
          onClick={close}
          className={cn(row, 'font-bold text-secondary')}
        >
          <Icon name="android" className="text-[20px] text-emerald-600" />
          <span className="flex-1">Download Android App (.apk)</span>
          <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black px-2 py-0.5 rounded-full">v1.0 APK</span>
        </Link>

        <p className={heading}>More</p>
        <SpinMenuItem className={cn(row, 'w-full')} onPick={close} />
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

/** "Shop" option nav button (desktop): opens the full-screen shop experience showcase directly on click. */
function ShopMenu() {
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

const SEARCH_HINTS = ['backpacks', 'tote bags', 'laptop bags', 'cabin luggage', 'wallets', 'duffle bags'];

/** Search bar with modern widgets: rotating hints, an Offers chip and voice search. */
export function SearchPill({ onOpen, onVoiceOpen, className }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % SEARCH_HINTS.length), 2200);
    return () => clearInterval(t);
  }, []);
  const widget = 'w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-all shrink-0 active:scale-90';
  return (
    <div
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      role="button"
      tabIndex={0}
      aria-label="Search products"
      className={cn(
        'group min-w-0 flex items-center gap-2 h-11 pl-1.5 pr-1.5 rounded-2xl bg-surface-container/80 hover:bg-surface-container-lowest text-[13px] ring-1 ring-outline-variant/40 hover:ring-outline-variant hover:shadow-md transition-all cursor-pointer',
        className
      )}
    >
      <span className="w-8 h-8 rounded-xl bg-on-surface text-surface flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
        <Icon name="search" className="text-[18px]" />
      </span>
      <span className="flex-1 truncate min-w-0 text-on-surface-variant">
        Search <span key={i} className="inline-block font-semibold text-on-surface animate-promo-in">{SEARCH_HINTS[i]}</span>
      </span>

      <Link
        to="/offers"
        onClick={(e) => e.stopPropagation()}
        className="hidden sm:inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/25 hover:bg-rose-500/15 shrink-0"
      >
        <Icon name="sell" className="text-[14px]" /> Offers
      </Link>
      <span className="hidden sm:block w-px h-5 bg-outline-variant/60 shrink-0" aria-hidden="true" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onVoiceOpen?.();
        }}
        className={widget}
        title="Voice search"
        aria-label="Voice search"
      >
        <Icon name="mic" className="text-[18px]" />
      </button>
    </div>
  );
}



/**
 * Offers strip above the header. Everything comes from Admin → Settings: the announcement text,
 * the signup bonus amount, and the offer links (the server only sends switched-on links inside
 * their start/end dates). Nothing here is hard-coded, so it can't advertise an offer that isn't live.
 */
function PromoRibbon() {
  const { data: config } = useConfig();
  const links = config?.promoRibbon || [];
  const bonus = config?.loyalty?.enabled !== false ? config?.loyalty?.signupBonus : 0;
  const text = [config?.announcement, bonus > 0 ? `${bonus} welcome coins when you create an account` : ''].filter(Boolean).join(' • ');
  const shell = 'bg-gradient-to-r from-slate-950 via-rose-950 to-slate-950 text-rose-100 border-b border-rose-400/20 text-[11px] sm:text-[12px] py-1.5 px-3 select-none relative z-50';
  // Until the store settings arrive, keep the ribbon's height so the page doesn't jump down.
  if (!config) return <div className={shell} aria-hidden="true"><div className="h-6" /></div>;
  if (!text && !links.length) return null;
  return (
    <div className={shell}>
      <div className="w-full max-w-[1920px] mx-auto flex items-center justify-center gap-2.5 min-w-0">
        {text && <span className="hidden md:block font-medium text-rose-50/90 truncate min-w-0">{text}</span>}
        {links.length > 0 && (
          <nav aria-label="Offers" className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 max-w-full">
            {links.map((p) => (
              <Link
                key={`${p.label}-${p.to}`}
                to={p.to}
                className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full font-bold whitespace-nowrap text-white bg-white/10 border border-white/20 hover:bg-rose-500/30 hover:border-rose-300/40 transition-colors"
              >
                {p.icon && <Icon name={p.icon} className="text-[13px]" />}
                {p.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const { data: categories } = useCategories();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const coins = useMyCoins();
  const chatQuery = useQuery({
    queryKey: ['chat', 'unreadCustomer'],
    queryFn: () => api.activeChat(),
    select: (d) => d?.thread?.unreadCustomer || 0,
    refetchInterval: 12000,
  });
  const unreadChat = chatQuery.data || 0;
  // Shop listing pages draw their own compact header on phones.
  const isMobileCustomHeader =
    pathname === '/' ||
    pathname.startsWith('/shop') ||
    ['/all', '/men', '/women', '/universal', '/unisex', '/offers', '/bags', '/new-arrivals', '/bestsellers'].includes(pathname) ||
    /^\/(women|men|bags|accessories|travel-utility)\/[^/]+/.test(pathname);

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

  const openSearch = () => dispatch(setSearchOpen(true));
  const openVoice = () => dispatch(setSearchOpen({ open: true, voice: true }));
  const navItem = 'h-8 px-3.5 inline-flex items-center rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap';
  const navActive = 'text-surface bg-on-surface shadow-sm';
  const navIdle = 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container';
  const iconBtn = 'relative inline-flex items-center justify-center w-10 h-10 rounded-full text-on-surface transition-all hover:scale-105 active:scale-95';

  return (
    <>
      <PromoRibbon />

      <header className={cn('site-header sticky top-0 z-50 w-full transition-shadow duration-300 bg-surface/95 backdrop-blur-md border-b border-surface-container-high/60', isMobileCustomHeader && 'hidden md:block', scrolled && 'shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)]')}>
        <div className="w-full max-w-[1920px] mx-auto px-2.5 sm:px-4 md:px-5 lg:px-6 h-14 md:h-[68px] flex items-center justify-between gap-1.5 sm:gap-2.5 md:gap-3.5">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 min-w-0">
            <button type="button" className={cn(iconBtn, '-ml-1 md:hidden hover:bg-surface-container shrink-0')} aria-label="Open menu" onClick={() => dispatch(setMobileNavOpen(true))}>
              <Icon name="menu" className="text-[22px]" />
            </button>
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 group active:scale-95 transition-transform" aria-label="WILDTANE home">
              <LogoMark className="w-7 h-7 sm:w-9 sm:h-9 shrink-0 drop-shadow-sm group-hover:scale-105 transition-transform" />
              <div className="flex flex-col min-w-0">
                <span className="font-serif tracking-[0.12em] sm:tracking-[0.16em] font-black text-[17px] sm:text-xl md:text-[21px] text-on-surface uppercase select-none leading-none">
                  WILDTANE
                </span>
                <span className="text-[8.5px] uppercase tracking-[0.22em] font-bold text-outline opacity-75 leading-tight hidden xs:block">
                  Luxury Carry
                </span>
              </div>
            </Link>
          </div>

          {/* Search sits inline on tablets and up; phones get it as a full-width second row below. */}
          <SearchPill onOpen={openSearch} onVoiceOpen={openVoice} className="hidden md:flex flex-1 max-w-2xl mx-4" />

          {/* Right actions: wishlist and cart always fit; theme and account join from tablet width. */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0">
            {/* Theme Palette Toggle */}
            <button
              type="button"
              onClick={() => dispatch(setThemeOpen(true))}
              aria-label="Appearance and theme"
              title="Appearance & theme"
              className="relative items-center justify-center w-10 h-10 rounded-full text-on-surface hover:bg-surface-container ring-1 ring-outline-variant/30 transition-all hover:scale-105 active:scale-95 shadow-2xs hidden md:inline-flex"
            >
              <Icon name="palette" className="text-[19px] sm:text-[20px]" />
            </button>

            {/* Wallet (Coins Balance) Badge (Requirement 15) */}
            <Link
              to="/account/coins"
              aria-label={`Wallet balance, ${coins?.data?.balance ?? 0} coins`}
              title="WILDTANE Wallet & Reward Coins"
              className="relative inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-full text-on-surface hover:bg-rose-500/10 ring-1 ring-rose-500/30 hover:ring-rose-500/60 transition-all hover:scale-105 active:scale-95 shadow-2xs group"
            >
              <CoinIcon className="w-4 h-4 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[12px] sm:text-[13px] font-black text-rose-700 dark:text-rose-300 tabular-nums">
                {coins?.data?.balance ?? 0}
              </span>
              <span className="text-[10px] uppercase font-bold text-outline opacity-75 hidden xs:inline">
                Coins
              </span>
            </Link>

            {/* Heart (Wishlist) Icon */}
            <Link
              to="/wishlist"
              aria-label={`Wishlist, ${wishCount} items`}
              title="Wishlist"
              className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-on-surface hover:text-rose-600 hover:bg-rose-500/10 ring-1 ring-outline-variant/35 hover:ring-rose-400/50 transition-all hover:scale-105 active:scale-95 shadow-2xs group"
            >
              <Icon name="favorite" className="text-[20px] sm:text-[21px] transition-transform group-hover:scale-110 text-rose-500/90" />
              {wishCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md ring-2 ring-surface animate-pop-in">
                  {wishCount}
                </span>
              )}
            </Link>

            {/* Live Support Chat Button */}
            <button
              type="button"
              onClick={() => dispatch(setChatOpen(true))}
              aria-label="Live Support Chat"
              title="Live Support Chat"
              className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-on-surface hover:text-secondary hover:bg-secondary/10 ring-1 ring-outline-variant/35 hover:ring-secondary/50 transition-all hover:scale-105 active:scale-95 shadow-2xs group"
            >
              <Icon name="chat" className="text-[20px] sm:text-[21px] transition-transform group-hover:scale-110 text-secondary" />
              {unreadChat > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-rose-600 text-white shadow-md ring-2 ring-surface animate-pop-in">
                  {unreadChat}
                </span>
              )}
            </button>

            {/* Shopping Bag Cart Icon with Count Badge */}
            <button
              type="button"
              onClick={() => dispatch(setCartOpen(true))}
              aria-label={`Bag, ${count} items`}
              title="Shopping Cart"
              className="relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full text-on-surface hover:bg-surface-container ring-1 ring-outline-variant/35 transition-all hover:scale-105 active:scale-95 shadow-2xs group"
            >
              <Icon name="shopping_bag" className="text-[20px] sm:text-[21px] transition-transform group-hover:scale-110" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-on-surface text-surface shadow-md ring-2 ring-surface animate-pop-in">
                  {count}
                </span>
              )}
            </button>

            {/* Account Menu / Sign In */}
            <AccountMenu />
          </div>
        </div>
        <div className="md:hidden px-2.5 sm:px-4 pb-2">
          <SearchPill onOpen={openSearch} onVoiceOpen={openVoice} className="w-full" />
        </div>
        {/* Every main menu option on its own row: centred on desktop (Shop opens the mega-menu), swipeable on phones. */}
        <nav aria-label="Main" className="relative border-t border-surface-container-high/60">
          <div className="hidden md:flex items-center justify-center flex-wrap gap-1 max-w-[1920px] mx-auto px-4 lg:px-6 py-1.5">
            {MAIN_NAV.map(([to, label, end]) =>
              to === '/shop' ? (
                <ShopMenu key={to} categories={categories} />
              ) : (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(navItem, isActive ? navActive : navIdle)}>
                  {label}
                </NavLink>
              )
            )}
          </div>
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none px-2.5 sm:px-4 py-1.5">
            {MAIN_NAV.map(([to, label, end]) =>
              to === '/shop' ? (
                <button
                  key={to}
                  type="button"
                  onClick={() => dispatch(setShopModalOpen(true))}
                  className={cn(
                    navItem,
                    'shrink-0 bg-surface-container text-on-surface font-bold flex items-center gap-1.5 border border-secondary/35 shadow-xs active:scale-95'
                  )}
                  aria-label="Open Full Screen Shop"
                >
                  <Icon name="grid_view" className="text-[14px] text-secondary" />
                  <span>Shop</span>
                </button>
              ) : (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(navItem, 'shrink-0', isActive ? navActive : 'bg-surface-container text-on-surface-variant')}>
                  {label}
                </NavLink>
              )
            )}
          </div>
        </nav>
      </header>
      <SideNav categories={categories} />
    </>
  );
}
