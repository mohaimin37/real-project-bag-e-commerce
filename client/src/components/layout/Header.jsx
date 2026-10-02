import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCartOpen, setCurrency, setMobileNavOpen, setSearchOpen, toggleContrast, toggleTheme } from '../../store';
import { useCategories, useConfig, useUser } from '../../hooks/useStore';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuthActions } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { cn, imgUrl, initials } from '../../lib/format';
import { adminApi, api } from '../../lib/api';
import { ADMIN_NAV, adminPath } from '../../admin/nav';
import { Drawer, Icon, Img } from '../ui';

/** Admin alert counts (new orders, enquiries, failed alerts). Shares the admin dashboard's cache. */
function useAdminAlerts(isAdmin) {
  return useQuery({ queryKey: ['admin', 'dashboard', 30], queryFn: () => adminApi.dashboard(30), select: (d) => d.alerts, enabled: isAdmin, staleTime: 60 * 1000 });
}

function AlertCount({ n }) {
  if (!n) return null;
  return <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold flex items-center justify-center">{n}</span>;
}

/** Every admin section in one panel, grouped like the admin sidebar. */
function AdminPanel({ alerts }) {
  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Admin</span>
          <p className="text-body-sm text-on-surface-variant">Everything for running the store, one click away. You're already signed in.</p>
        </div>
        <Link to="/admin" className="btn-secondary btn-sm"><Icon name="space_dashboard" className="text-[18px]" /> Open admin dashboard</Link>
      </div>
      <div className="grid grid-cols-5 gap-gutter">
        {ADMIN_NAV.map((section) => (
          <div key={section.group} className="flex flex-col gap-0.5">
            <span className="text-label-sm text-outline uppercase tracking-wider mb-space-xs">{section.group}</span>
            {section.items.map(([to, icon, label, alertKey]) => (
              <Link key={to || 'home'} to={adminPath(to)} className="flex items-center gap-2.5 p-2 -mx-2 rounded-lg text-body-sm hover:bg-surface-container-low hover:text-secondary transition-colors">
                <Icon name={icon} className="text-[20px] text-on-surface-variant" />
                <span className="flex-1">{label}</span>
                <AlertCount n={alertKey ? alerts?.[alertKey] : 0} />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Slim bar across the top of the store for admins: quick links + "edit this product". */
function AdminBar({ alerts }) {
  const { pathname } = useLocation();
  const slug = pathname.match(/^\/product\/([^/]+)/)?.[1];
  const { data: product } = useQuery({ queryKey: ['product', slug], queryFn: () => api.product(slug), enabled: Boolean(slug), select: (d) => d.product, staleTime: 60 * 1000 });
  const pending = alerts?.pendingOrders || 0;
  const link = 'flex items-center gap-1.5 px-2.5 h-7 rounded-md whitespace-nowrap hover:bg-white/15 transition-colors';
  return (
    <div className="w-full bg-secondary text-on-secondary text-label-md">
      <div className="container-x h-10 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <span className="flex items-center gap-1.5 font-bold pr-2 mr-1 border-r border-white/25 shrink-0">
          <Icon name="admin_panel_settings" className="text-[18px]" /> Admin mode
        </span>
        <Link to="/admin" className={link}><Icon name="space_dashboard" className="text-[16px]" /> Dashboard</Link>
        <Link to="/admin/orders" className={link}>
          <Icon name="receipt_long" className="text-[16px]" /> Orders
          {pending > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-on-secondary text-secondary text-[10px] font-bold flex items-center justify-center">{pending}</span>}
        </Link>
        <Link to="/admin/quick-edit" className={link}><Icon name="bolt" className="text-[16px]" /> Quick edit</Link>
        <Link to="/admin/products/new" className={link}><Icon name="add_box" className="text-[16px]" /> Add product</Link>
        <Link to="/admin/reports" className={link}><Icon name="query_stats" className="text-[16px]" /> Reports</Link>
        <Link to="/admin/updates" className={cn(link, 'hidden md:flex')}><Icon name="campaign" className="text-[16px]" /> Live updates</Link>
        <Link to="/admin/quick-edit?tab=promo" className={cn(link, 'hidden md:flex')}><Icon name="confirmation_number" className="text-[16px]" /> Promo codes</Link>
        {product?._id && (
          <Link to={`/admin/products/${product._id}`} className="ml-auto flex items-center gap-1.5 px-3 h-7 rounded-md bg-on-secondary text-secondary font-semibold whitespace-nowrap hover:opacity-90">
            <Icon name="edit" className="text-[16px]" /> Edit this product
          </Link>
        )}
      </div>
    </div>
  );
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const SHOP_EDITS = [
  ['/catalogue', 'view_carousel', 'Full catalogue', 'Every bag on one page'],
  ['/shop?newArrival=true&sort=newest', 'new_releases', 'New arrivals', 'Fresh off the line'],
  ['/shop?bestseller=true&sort=bestseller', 'local_fire_department', 'Best sellers', 'Most-carried pieces'],
  ['/shop?featured=true', 'trending_up', 'Trending', 'Collections in demand'],
  ['/offers', 'sell', 'Offers & archive', 'Limited-time pricing'],
];
const DISCOVER = [
  ['/shop?gender=women', 'Women'],
  ['/corporate', 'Corporate bulk'],
  ['/sustainability', 'Sustainability'],
  ['/blog', 'Journal'],
  ['/contact', 'Contact'],
];

// Underline grows from the left on hover and stays for the active section.
const navItem = cn(
  'relative h-full flex items-center gap-0.5 text-label-lg whitespace-nowrap transition-colors',
  'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-secondary after:origin-left after:transition-transform after:duration-300'
);
const navCls = (active) => cn(navItem, active ? 'text-on-surface after:scale-x-100' : 'text-on-surface-variant hover:text-on-surface after:scale-x-0 hover:after:scale-x-100');

function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M11 10V7.5a5 5 0 0 1 10 0V10" fill="none" stroke="#F2B632" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="3" y="9" width="26" height="21" rx="6" fill="#14A38B" />
      <rect x="5.6" y="11.6" width="20.8" height="15.8" rx="4" fill="#141B2C" />
      <path d="M16 15.5v8M12 19.5h8" stroke="#14A38B" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function CountBadge({ count, tone = 'bg-secondary text-on-secondary' }) {
  if (!count) return null;
  return (
    // Keyed by count so the bump animation replays whenever it changes.
    <span key={count} className={cn('absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-surface-container-lowest animate-bump', tone)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Thumb({ cat, className }) {
  return cat.image?.url ? (
    <Img src={cat.image.url} alt="" className={cn('shrink-0 rounded-lg', className)} />
  ) : (
    <span className={cn('shrink-0 rounded-lg bg-surface-container-low flex items-center justify-center text-outline', className)}>
      <Icon name="category" className="text-[20px]" />
    </span>
  );
}

/** Desktop nav item whose panel spans the full width of the header bar. */
function MegaItem({ id, label, to, active, open, onOpen, onClose, children }) {
  return (
    <div
      className="h-full flex items-center"
      onMouseEnter={() => onOpen(id)}
      onMouseLeave={() => onClose()}
      onFocus={() => onOpen(id, true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && onClose(true)}
      onKeyDown={(e) => e.key === 'Escape' && onClose(true)}
    >
      <Link to={to} className={navCls(active || open)} aria-haspopup="true" aria-expanded={open}>
        {label}
        <Icon name="expand_more" className={cn('text-[18px] transition-transform duration-200', open && 'rotate-180')} />
      </Link>
      <div
        className={cn(
          'absolute inset-x-0 top-full z-10 bg-surface-container-lowest border-t border-surface-container-high shadow-lift transition-all duration-200',
          open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'
        )}
      >
        <div className="container-x py-space-xl">{children}</div>
      </div>
    </div>
  );
}

function ShopPanel({ categories }) {
  const promo = categories?.flatMap((c) => c.children).find((c) => c.image?.url);
  return (
    <div className="grid grid-cols-12 gap-gutter-lg">
      <div className="col-span-4 xl:col-span-3 flex flex-col gap-1">
        <span className="text-label-sm text-outline uppercase tracking-wider mb-space-sm">Shop the edit</span>
        {SHOP_EDITS.map(([to, icon, label, note]) => (
          <Link key={to} to={to} className="group/i flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-surface-container-low transition-colors">
            <span className="w-10 h-10 shrink-0 rounded-lg bg-surface-container-low group-hover/i:bg-secondary group-hover/i:text-on-secondary flex items-center justify-center text-secondary transition-colors">
              <Icon name={icon} className="text-[20px]" />
            </span>
            <span className="flex flex-col">
              <span className="text-label-lg text-on-surface">{label}</span>
              <span className="text-body-sm text-on-surface-variant">{note}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="col-span-4 xl:col-span-3 flex flex-col gap-1">
        <span className="text-label-sm text-outline uppercase tracking-wider mb-space-sm">Categories</span>
        {categories?.map((c) => (
          <Link key={c._id} to={`/shop/${c.slug}`} className="flex flex-col p-2 -mx-2 rounded-xl hover:bg-surface-container-low transition-colors">
            <span className="flex items-center justify-between text-label-lg text-on-surface">
              {c.name}
              <span className="text-label-sm text-outline">{c.productCount}</span>
            </span>
            <span className="text-body-sm text-on-surface-variant truncate">{c.tagline}</span>
          </Link>
        ))}
        <Link to="/shop" className="mt-auto inline-flex items-center gap-1 text-label-md text-secondary hover:gap-2 transition-all pt-space-sm">
          View all products <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>
      <div className="hidden xl:flex col-span-2 flex-col gap-1">
        <span className="text-label-sm text-outline uppercase tracking-wider mb-space-sm">Discover</span>
        {DISCOVER.map(([to, label]) => (
          <Link key={to} to={to} className="py-1.5 text-body-sm text-on-surface-variant hover:text-secondary transition-colors">
            {label}
          </Link>
        ))}
      </div>
      <PromoCard
        className="col-span-4"
        image={promo?.image?.url}
        eyebrow="New season"
        title="Built for fluid transit"
        to="/shop?newArrival=true&sort=newest"
        cta="Shop new arrivals"
      />
    </div>
  );
}

function CategoryPanel({ cat }) {
  const feature = cat.children.find((c) => c.image?.url);
  return (
    <div className="grid grid-cols-12 gap-gutter-lg">
      <div className="col-span-8 flex flex-col gap-space-md">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">{cat.name}</span>
            <p className="text-body-sm text-on-surface-variant">{cat.tagline}</p>
          </div>
          <Link to={`/shop/${cat.slug}`} className="inline-flex items-center gap-1 text-label-md text-secondary hover:gap-2 transition-all whitespace-nowrap">
            Shop all {cat.name} <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </div>
        <div className={cn('grid gap-1', cat.children.length > 4 ? 'grid-cols-2 xl:grid-cols-3' : 'grid-cols-2')}>
          {cat.children.map((c) => (
            <Link key={c._id} to={`/shop/${c.slug}`} className="group/i flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-low transition-colors min-w-0">
              <Thumb cat={c} className="w-12 h-12" />
              <span className="flex flex-col min-w-0">
                <span className="flex items-center gap-2 text-label-lg text-on-surface group-hover/i:text-secondary transition-colors">
                  <span className="truncate">{c.name}</span>
                  {c.productCount > 0 && <span className="text-label-sm text-outline">{c.productCount}</span>}
                </span>
                <span className="text-body-sm text-on-surface-variant truncate">{c.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <PromoCard className="col-span-4" image={feature?.image?.url} eyebrow="Featured" title={feature?.name || cat.name} to={`/shop/${(feature || cat).slug}`} cta="Explore" />
    </div>
  );
}

function PromoCard({ image, eyebrow, title, to, cta, className }) {
  return (
    <Link to={to} className={cn('group/p relative min-h-[220px] rounded-2xl overflow-hidden bg-ink text-white', className)}>
      {image && <Img src={image} alt="" className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover/p:scale-105" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-space-lg flex flex-col gap-1">
        <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">{eyebrow}</span>
        <span className="text-headline-sm">{title}</span>
        <span className="inline-flex items-center gap-1 text-label-md text-white/80 group-hover/p:text-white group-hover/p:gap-2 transition-all">
          {cta} <Icon name="arrow_forward" className="text-[16px]" />
        </span>
      </div>
    </Link>
  );
}

function AccountMenu() {
  const user = useUser();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    const fn = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  if (!user) {
    return (
      <Link to="/login" className="btn-icon" aria-label="Sign in">
        <Icon name="person" />
      </Link>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className={cn('rounded-full ring-2 ring-offset-2 ring-offset-surface-container-lowest transition-shadow focus-visible:ring-secondary', open ? 'ring-secondary' : 'ring-transparent hover:ring-outline-variant')}
      >
        {user.avatar?.url ? (
          <img src={imgUrl(user.avatar.url)} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-secondary text-on-secondary text-label-md flex items-center justify-center">{initials(user.name)}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 bg-surface-container-lowest rounded-xl shadow-lift border border-surface-container-high p-2 z-50 animate-pop-in">
          <div className="px-3 py-2 border-b border-surface-container-high mb-1">
            <p className="text-label-lg truncate">{user.name}</p>
            <p className="text-body-sm text-on-surface-variant truncate">{user.email}</p>
          </div>
          {user.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-low text-body-sm text-secondary font-semibold">
              <Icon name="dashboard" className="text-[20px]" /> Admin dashboard
            </Link>
          )}
          {[
            ['/account', 'space_dashboard', 'My account'],
            ['/account/orders', 'receipt_long', 'My orders'],
            ['/account/profile', 'person', 'Profile'],
            ['/account/addresses', 'location_on', 'Addresses'],
            ['/wishlist', 'favorite', 'Wishlist'],
          ].map(([to, icon, label]) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-low text-body-sm">
              <Icon name={icon} className="text-[20px] text-on-surface-variant" /> {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-low text-body-sm text-error"
          >
            <Icon name="logout" className="text-[20px]" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function CurrencySelect({ className, optionClassName }) {
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

function MobileNav({ categories }) {
  const open = useSelector((s) => s.ui.mobileNavOpen);
  const theme = useSelector((s) => s.ui.theme);
  const contrast = useSelector((s) => s.ui.contrast);
  const dispatch = useDispatch();
  const user = useUser();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const [expanded, setExpanded] = useState(null);
  const close = () => dispatch(setMobileNavOpen(false));
  const row = 'flex items-center gap-3 px-space-lg py-3 text-body-md hover:bg-surface-container-low transition-colors';
  const heading = 'px-space-lg pt-space-lg pb-space-xs text-label-sm text-outline uppercase tracking-wider';
  const tile = 'relative flex flex-col items-center gap-1 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-label-md transition-colors';

  return (
    <Drawer
      open={open}
      onClose={close}
      side="left"
      width="max-w-sm"
      title={
        <span className="flex items-center gap-2 tracking-tight uppercase">
          <LogoMark className="w-7 h-7" /> WILDTANE
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-2 text-label-md text-on-surface-variant">
          <CurrencySelect className="min-w-0" optionClassName="bg-surface-container-lowest text-on-surface" />
          <div className="flex items-center gap-1 shrink-0">
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
      <nav aria-label="Mobile" className="pb-space-md">
        <div className="p-space-lg pb-0 flex flex-col gap-space-md">
          <button
            type="button"
            onClick={() => {
              close();
              dispatch(setSearchOpen(true));
            }}
            className="flex items-center gap-space-sm h-11 px-space-md rounded-lg bg-surface-container-low text-on-surface-variant text-body-sm"
          >
            <Icon name="search" className="text-[20px]" /> Search bags & gear
          </button>

          {user ? (
            <Link to="/account" onClick={close} className="flex items-center gap-3 p-3 rounded-xl border border-surface-container-high hover:bg-surface-container-low transition-colors">
              {user.avatar?.url ? (
                <img src={imgUrl(user.avatar.url)} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-secondary text-on-secondary text-label-lg flex items-center justify-center">{initials(user.name)}</span>
              )}
              <span className="flex flex-col min-w-0 flex-1">
                <span className="text-label-lg truncate">{user.name}</span>
                <span className="text-body-sm text-on-surface-variant">View account</span>
              </span>
              <Icon name="chevron_right" className="text-outline" />
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-space-sm">
              <Link to="/login" onClick={close} className="btn-primary">Sign in</Link>
              <Link to="/register" onClick={close} className="btn-tonal">Register</Link>
            </div>
          )}

          <div className="grid grid-cols-3 gap-space-sm">
            <Link to={user ? '/account/orders' : '/login'} onClick={close} className={tile}>
              <Icon name="receipt_long" /> Orders
            </Link>
            <Link to="/wishlist" onClick={close} className={tile}>
              <Icon name="favorite" /> Wishlist
              <CountBadge count={wishCount} tone="bg-primary text-on-primary" />
            </Link>
            <button
              type="button"
              onClick={() => {
                close();
                dispatch(setCartOpen(true));
              }}
              className={tile}
            >
              <Icon name="shopping_bag" /> Bag
              <CountBadge count={count} />
            </button>
          </div>
        </div>

        {user?.role === 'admin' && (
          <>
            <p className={cn(heading, 'text-secondary')}>Admin</p>
            <div className="grid grid-cols-2 gap-1.5 px-space-lg">
              {ADMIN_NAV.flatMap((g) => g.items).map(([to, icon, label]) => (
                <Link key={to || 'home'} to={adminPath(to)} onClick={close} className="flex items-center gap-2 px-3 h-11 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-label-md">
                  <Icon name={icon} className="text-[18px] text-secondary" /> {label}
                </Link>
              ))}
            </div>
          </>
        )}

        <p className={heading}>Shop</p>
        <Link to="/shop" onClick={close} className={row}>
          <Icon name="grid_view" className="text-[20px] text-on-surface-variant" /> All products
        </Link>
        {SHOP_EDITS.map(([to, icon, label]) => (
          <Link key={to} to={to} onClick={close} className={row}>
            <Icon name={icon} className="text-[20px] text-on-surface-variant" /> {label}
          </Link>
        ))}

        <p className={heading}>Categories</p>
        {categories?.map((cat) => {
          const isOpen = expanded === cat._id;
          return (
            <div key={cat._id}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : cat._id)} className={cn(row, 'w-full justify-between')} aria-expanded={isOpen}>
                <span className="flex flex-col items-start">
                  <span>{cat.name}</span>
                  <span className="text-body-sm text-on-surface-variant">{cat.tagline}</span>
                </span>
                <Icon name="expand_more" className={cn('transition-transform duration-300', isOpen && 'rotate-180')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                  <div className="bg-surface-container-low py-2">
                    <Link to={`/shop/${cat.slug}`} onClick={close} tabIndex={isOpen ? 0 : -1} className="block px-space-lg py-2 text-label-lg text-secondary">
                      Shop all {cat.name}
                    </Link>
                    {cat.children.map((c) => (
                      <Link key={c._id} to={`/shop/${c.slug}`} onClick={close} tabIndex={isOpen ? 0 : -1} className="flex items-center gap-3 px-space-lg py-2 text-body-sm">
                        <Thumb cat={c} className="w-9 h-9" />
                        <span className="flex-1">{c.name}</span>
                        {c.productCount > 0 && <span className="text-label-sm text-outline">{c.productCount}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <p className={heading}>Discover</p>
        {DISCOVER.map(([to, label]) => (
          <Link key={to} to={to} onClick={close} className={row}>
            {label}
          </Link>
        ))}
      </nav>
    </Drawer>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const { data: config } = useConfig();
  const { data: categories } = useCategories();
  const theme = useSelector((s) => s.ui.theme);
  const contrast = useSelector((s) => s.ui.contrast);
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { pathname, search } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Mega menu with hover intent: a short delay before opening from rest and
  // before closing, so diagonal mouse paths don't flicker panels.
  const [menu, setMenu] = useState(null);
  const timer = useRef();
  const openMenu = (id, now) => {
    clearTimeout(timer.current);
    if (now || menu) setMenu(id);
    else timer.current = setTimeout(() => setMenu(id), 90);
  };
  const closeMenu = (now) => {
    clearTimeout(timer.current);
    if (now) setMenu(null);
    else timer.current = setTimeout(() => setMenu(null), 160);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const [seenLoc, setSeenLoc] = useState(pathname + search);
  if (seenLoc !== pathname + search) {
    setSeenLoc(pathname + search);
    setMenu(null);
  }

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

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

  const isAdmin = useUser()?.role === 'admin';
  const { data: adminAlerts } = useAdminAlerts(isAdmin);
  const isWomen = pathname === '/shop' && new URLSearchParams(search).get('gender') === 'women';
  const catActive = (cat) => pathname === `/shop/${cat.slug}` || cat.children.some((c) => pathname === `/shop/${c.slug}`);

  return (
    <>
      {isAdmin && <AdminBar alerts={adminAlerts} />}
      {/* Announcement & preferences bar — scrolls away; only the main bar stays pinned. */}
      <div className="w-full bg-ink text-on-ink/80 text-label-sm">
        <div className="container-x flex items-center justify-center md:justify-between h-9 gap-4">
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-secondary-fixed-dim animate-ping opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-secondary-fixed-dim" />
            </span>
            <span className="truncate tracking-wide">{config?.announcement || 'Complimentary carbon-neutral shipping on qualifying orders'}</span>
          </div>
          <div className="hidden md:flex items-center gap-space-md shrink-0">
            <Link to="/contact" className="hover:text-on-ink transition-colors">Help</Link>
            <span className="h-3 w-px bg-on-ink/30" />
            <CurrencySelect optionClassName="bg-ink text-on-ink" />
            <span className="h-3 w-px bg-on-ink/30" />
            <button type="button" onClick={() => dispatch(toggleTheme())} aria-pressed={theme === 'dark'} className="flex items-center gap-1 hover:text-on-ink transition-colors">
              <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="text-[16px]" />
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button type="button" onClick={() => dispatch(toggleContrast())} aria-pressed={contrast === 'high'} className={cn('flex items-center gap-1 hover:text-on-ink transition-colors', contrast === 'high' && 'text-secondary-fixed')}>
              <Icon name="accessibility_new" className="text-[16px]" />
              Contrast
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 left-0 w-full z-50">
        <div
          className={cn(
            'relative h-16 lg:h-[72px] w-full bg-surface-container-lowest/85 backdrop-blur-xl backdrop-saturate-150 border-b transition-[box-shadow,border-color] duration-300',
            scrolled || menu ? 'border-surface-container-high shadow-[0_4px_20px_rgba(0,0,0,0.06)]' : 'border-transparent'
          )}
        >
          {/* Dims the page while a mega menu is open. */}
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-x-0 top-full h-screen bg-ink/25 backdrop-blur-[2px] pointer-events-none transition-opacity duration-200',
              menu ? 'opacity-100' : 'opacity-0'
            )}
          />
          <div className="container-x h-full flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <button type="button" className="btn-icon lg:hidden -ml-2" aria-label="Open menu" onClick={() => dispatch(setMobileNavOpen(true))}>
                <Icon name="menu" />
              </button>
              <Link to="/" className="group flex items-center gap-2" aria-label="WILDTANE home">
                <LogoMark className="w-7 h-7 lg:w-8 lg:h-8 transition-transform duration-300 group-hover:-rotate-6" />
                <span className="text-label-lg min-[360px]:text-headline-sm uppercase tracking-tight font-extrabold">WILDTANE</span>
              </Link>
            </div>

            <nav aria-label="Primary" className="hidden lg:flex flex-1 justify-center items-center gap-5 xl:gap-space-lg h-full">
              <MegaItem id="shop" label="Shop" to="/shop" active={pathname === '/shop' && !isWomen} open={menu === 'shop'} onOpen={openMenu} onClose={closeMenu}>
                <ShopPanel categories={categories} />
              </MegaItem>
              <Link to="/catalogue" className={navCls(pathname === '/catalogue')}>Catalogue</Link>
              {categories?.map((cat) => (
                <MegaItem key={cat._id} id={cat._id} label={cat.name} to={`/shop/${cat.slug}`} active={catActive(cat)} open={menu === cat._id} onOpen={openMenu} onClose={closeMenu}>
                  <CategoryPanel cat={cat} />
                </MegaItem>
              ))}
              <Link to="/shop?gender=women" className={cn(navCls(isWomen), isAdmin ? 'hidden' : 'hidden xl:flex')}>Women</Link>
              <Link to="/offers" className={cn(navCls(pathname === '/offers'), 'text-secondary hover:text-secondary', isAdmin && 'hidden xl:flex')}>Offers</Link>
              {isAdmin && (
                <MegaItem
                  id="admin"
                  label={
                    <span className="flex items-center gap-1 text-secondary">
                      <Icon name="admin_panel_settings" className="text-[18px]" /> Admin
                      {adminAlerts?.pendingOrders > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-on-secondary text-[10px] font-bold flex items-center justify-center">{adminAlerts.pendingOrders}</span>}
                    </span>
                  }
                  to="/admin"
                  active={false}
                  open={menu === 'admin'}
                  onOpen={openMenu}
                  onClose={closeMenu}
                >
                  <AdminPanel alerts={adminAlerts} />
                </MegaItem>
              )}
            </nav>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => dispatch(setSearchOpen(true))}
                aria-label="Search catalogue"
                className={cn(
                  'group flex items-center gap-space-sm h-10 w-10 justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors whitespace-nowrap',
                  // Full search pill on wide screens; admins keep the compact icon to make room for the Admin menu.
                  !isAdmin && 'xl:w-auto xl:justify-start xl:pl-space-md xl:pr-1.5 xl:rounded-full xl:bg-surface-container-low xl:border xl:border-surface-container-high'
                )}
              >
                <Icon name="search" className="text-[22px] xl:text-[20px]" />
                <span className={cn('text-body-sm hidden pr-2', !isAdmin && 'xl:inline')}>Search</span>
                <kbd className={cn('hidden items-center h-7 px-2 text-label-sm rounded-full bg-surface-container-lowest border border-surface-container-high text-outline', !isAdmin && 'xl:inline-flex')}>
                  {IS_MAC ? '⌘K' : 'Ctrl K'}
                </kbd>
              </button>
              <Link to="/wishlist" aria-label={`Wishlist, ${wishCount} items`} className="relative btn-icon !hidden min-[360px]:!inline-flex">
                <Icon name="favorite" />
                <CountBadge count={wishCount} tone="bg-primary text-on-primary" />
              </Link>
              <button type="button" onClick={() => dispatch(setCartOpen(true))} aria-label={`Bag, ${count} items`} className="relative btn-icon">
                <Icon name="shopping_bag" />
                <CountBadge count={count} />
              </button>
              <div className="ml-1 sm:ml-2"><AccountMenu /></div>
            </div>
          </div>
        </div>
        <MobileNav categories={categories} />
      </header>
    </>
  );
}
