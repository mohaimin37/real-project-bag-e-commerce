import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { cn, initials } from '../lib/format';
import { setThemeOpen, toggleTheme } from '../store';
import ThemeDrawer from '../components/theme/ThemePanel';
import { useAuthActions } from '../hooks/useAuth';
import { Icon, PageLoader } from '../components/ui';
import { LogoMark } from '../components/Brand';
import NotFound from '../pages/NotFound';
import Dashboard from './Dashboard';
import Guide from './Guide';
import Seo from '../components/Seo';
import { ADMIN_NAV } from './nav';

const Analytics = lazy(() => import('./Analytics'));
const Reports = lazy(() => import('./Reports'));
const Products = lazy(() => import('./Products'));
const QuickEdit = lazy(() => import('./QuickEdit'));
const ProductForm = lazy(() => import('./ProductForm'));
const ProductWizard = lazy(() => import('./ProductWizard'));
const Categories = lazy(() => import('./Categories'));
const Orders = lazy(() => import('./Orders'));
const OrderDetail = lazy(() => import('./OrderDetail'));
const Returns = lazy(() => import('./Returns'));
const Customers = lazy(() => import('./Customers'));
const CustomerDetail = lazy(() => import('./CustomerDetail'));
const Inventory = lazy(() => import('./Inventory'));
const Coupons = lazy(() => import('./Coupons'));
const Reviews = lazy(() => import('./Reviews'));
const Comments = lazy(() => import('./Comments'));
const Enquiries = lazy(() => import('./Enquiries'));
const Blogs = lazy(() => import('./Blogs'));
const BlogForm = lazy(() => import('./BlogForm'));
const Banners = lazy(() => import('./Banners'));
const LiveUpdates = lazy(() => import('./LiveUpdates'));
const Settings = lazy(() => import('./Settings'));
const Notifications = lazy(() => import('./Notifications'));
// Sidebar sections; the full list lives in nav.js (also used by the storefront Admin menu).
const NAV = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter(([to]) => to !== 'products/new') }));

function Sidebar({ open, onClose, collapsed }) {
  const alerts = useQuery({ queryKey: ['admin', 'dashboard', 30], queryFn: () => adminApi.dashboard(30), select: (d) => d.alerts, staleTime: 60 * 1000 });
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in" onClick={onClose} />}
      <aside
        className={cn(
          'print:hidden fixed lg:sticky top-0 z-50 h-screen shrink-0 bg-surface-container-lowest text-on-surface border-r border-surface-container-high flex flex-col transition-all duration-300 shadow-sm',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
          open ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'
        )}
      >
        <Link to="/admin" aria-label="WILDTANE admin home" className={cn('h-16 flex items-center px-5 shrink-0 border-b border-surface-container-high', collapsed && 'lg:justify-center lg:px-0')}>
          <div className={cn('flex items-center gap-2.5', collapsed && 'lg:hidden')}>
            <LogoMark className="w-8 h-8 shrink-0" tone="auto" />
            <h1 className="font-serif tracking-widest font-black text-xl text-on-surface uppercase select-none">
              WILDTANE
            </h1>
          </div>
          {collapsed && <LogoMark className="hidden lg:block w-9 h-9" tone="auto" />}
        </Link>
        <nav className="flex-1 overflow-y-auto scrollbar-none py-space-md px-3 flex flex-col gap-space-md" aria-label="Admin">
          {/* The most common job, pinned at the top with a one-line hint of how it works. */}
          <NavLink
            to="/admin/products/new"
            onClick={onClose}
            title={collapsed ? 'Add a product' : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl bg-primary text-on-primary shadow-sm transition-all hover:opacity-95 active:scale-[0.98]',
                collapsed ? 'lg:justify-center h-11 lg:px-0 px-3' : 'p-3',
                isActive && 'ring-2 ring-secondary'
              )
            }
          >
            <span className="w-8 h-8 shrink-0 rounded-full bg-secondary text-on-secondary flex items-center justify-center">
              <Icon name="add" className="text-[20px]" />
            </span>
            <span className={cn('flex-1 min-w-0', collapsed && 'lg:hidden')}>
              <span className="block text-body-sm font-bold leading-tight">Add a product</span>
              <span className="block text-[11px] leading-snug opacity-80">Photo → AI fills it → preview → publish</span>
            </span>
          </NavLink>
          {NAV.map((section) => (
            <div key={section.group} className="flex flex-col gap-0.5">
              {!collapsed && <span className="px-3 pb-1 text-label-sm uppercase tracking-wider text-outline font-bold">{section.group}</span>}
              {section.items.map(([to, icon, label, alertKey]) => {
                const count = alertKey ? alerts.data?.[alertKey] : 0;
                return (
                  <NavLink
                    key={to}
                    to={to ? `/admin/${to}` : '/admin'}
                    end={to === ''}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 h-10 px-3 rounded-lg text-body-sm transition-colors',
                        isActive
                          ? 'bg-secondary/10 text-secondary font-semibold ring-1 ring-secondary/25'
                          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                        collapsed && 'lg:justify-center lg:px-0'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-secondary" />}
                        <Icon name={icon} fill={isActive} className={cn('text-[20px]', isActive ? 'text-secondary' : 'text-outline')} />
                        {!collapsed && <span className="flex-1">{label}</span>}
                        {count > 0 && (
                          <span className={cn('min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center', alertKey === 'failedNotifications' ? 'bg-error text-on-error' : 'bg-secondary text-on-secondary', collapsed && 'lg:absolute lg:top-0.5 lg:right-1')}>
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-container-high flex flex-col gap-1">
          <Link to="/" className="flex items-center gap-3 h-10 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
            <Icon name="storefront" className="text-[20px] text-secondary" /> {!collapsed && 'View storefront'}
          </Link>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenu, onCollapse }) {
  const user = useSelector((s) => s.auth.user);
  const theme = useSelector((s) => s.ui.theme);
  const dispatch = useDispatch();
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  return (
    <header className="print:hidden sticky top-0 z-30 h-16 site-header flex items-center gap-3 px-margin-sm md:px-margin border-b border-surface-container-high">
      <button type="button" className="btn-icon lg:hidden" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <button type="button" className="btn-icon hidden lg:inline-flex" onClick={onCollapse} aria-label="Collapse sidebar"><Icon name="dock_to_right" /></button>
      {/* Phones: search is an icon that opens a full-width bar, so the top bar never gets squashed. */}
      <button type="button" className="btn-icon sm:hidden" onClick={() => setSearching(true)} aria-label="Search orders"><Icon name="search" /></button>
      <form
        className={cn(
          'relative flex-1 max-w-md',
          searching ? 'absolute inset-x-0 top-0 h-16 z-10 max-w-none flex items-center gap-2 px-margin-sm bg-surface' : 'hidden sm:block'
        )}
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/admin/orders?q=${encodeURIComponent(q.trim())}`);
          setSearching(false);
        }}
      >
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
          <input autoFocus={searching} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an order, customer or email…" className="input h-10 pl-10 bg-surface-container/60 focus:bg-surface-container-lowest" aria-label="Search orders" />
        </div>
        {searching && <button type="button" className="btn-icon" onClick={() => setSearching(false)} aria-label="Close search"><Icon name="close" /></button>}
      </form>
      <div className="flex items-center gap-1.5 ml-auto">
        <Link to="/" className="btn-tonal btn-sm gap-1.5" title="Go to the store home page">
          <Icon name="storefront" className="text-[18px] text-secondary" /> <span className="hidden sm:inline">Storefront</span>
        </Link>
        <button type="button" className="btn-icon" onClick={() => dispatch(toggleTheme())} aria-label="Toggle dark mode" title="Toggle dark mode">
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
        </button>
        <button type="button" className="btn-icon hidden sm:inline-flex" onClick={() => dispatch(setThemeOpen(true))} aria-label="Appearance and theme" title="Appearance & theme">
          <Icon name="palette" />
        </button>
        <Link to="/admin/products/new" className="btn-primary btn-sm px-2.5 sm:px-3 gap-1.5" title="Add a product" aria-label="Add a product">
          <Icon name="add" className="text-[18px]" /> <span className="hidden sm:inline">Add product</span>
        </Link>
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-surface-container-high">
          <span className="w-9 h-9 rounded-full bg-secondary text-on-secondary text-label-md flex items-center justify-center font-bold shadow-sm">{initials(user?.name)}</span>
          <div className="hidden md:block leading-tight">
            <p className="text-label-lg font-bold">{user?.name}</p>
            <p className="text-label-sm font-normal text-secondary">Administrator</p>
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              await logout();
              navigate('/admin/login');
            }}
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default function AdminApp() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('wt-admin-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="min-h-screen flex bg-surface print:bg-white print:min-h-0">
      <Seo title="Admin" noindex />
      <ThemeDrawer />
      <Sidebar open={open} onClose={() => setOpen(false)} collapsed={collapsed} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          onMenu={() => setOpen(true)}
          onCollapse={() =>
            setCollapsed((c) => {
              try {
                localStorage.setItem('wt-admin-collapsed', c ? '0' : '1');
              } catch {
                /* ignore */
              }
              return !c;
            })
          }
        />
        <main className="flex-1 px-margin-sm md:px-margin py-space-lg max-w-[1500px] w-full mx-auto">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="guide" element={<Guide />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="reports" element={<Reports />} />
              <Route path="quick-edit" element={<QuickEdit />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductWizard />} />
              <Route path="products/new/advanced" element={<ProductForm />} />
              <Route path="products/:id" element={<ProductForm />} />
              <Route path="categories" element={<Categories />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="returns" element={<Returns />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="comments" element={<Comments />} />
              <Route path="enquiries/:kind" element={<Enquiries />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="blogs" element={<Blogs />} />
              <Route path="blogs/new" element={<BlogForm />} />
              <Route path="blogs/:id" element={<BlogForm />} />
              <Route path="updates" element={<LiveUpdates />} />
              <Route path="banners" element={<Banners />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
