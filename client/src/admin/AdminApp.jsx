import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { cn, initials } from '../lib/format';
import { toggleTheme } from '../store';
import { useAuthActions } from '../hooks/useAuth';
import { Icon, PageLoader } from '../components/ui';
import NotFound from '../pages/NotFound';
import Dashboard from './Dashboard';
import Seo from '../components/Seo';
import { ADMIN_NAV } from './nav';

const Analytics = lazy(() => import('./Analytics'));
const Reports = lazy(() => import('./Reports'));
const Products = lazy(() => import('./Products'));
const QuickEdit = lazy(() => import('./QuickEdit'));
const ProductForm = lazy(() => import('./ProductForm'));
const Categories = lazy(() => import('./Categories'));
const Orders = lazy(() => import('./Orders'));
const OrderDetail = lazy(() => import('./OrderDetail'));
const Customers = lazy(() => import('./Customers'));
const CustomerDetail = lazy(() => import('./CustomerDetail'));
const Inventory = lazy(() => import('./Inventory'));
const Coupons = lazy(() => import('./Coupons'));
const Reviews = lazy(() => import('./Reviews'));
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
      {open && <div className="fixed inset-0 z-40 bg-ink/50 lg:hidden animate-fade-in" onClick={onClose} />}
      <aside
        className={cn(
          'print:hidden fixed lg:sticky top-0 z-50 h-screen shrink-0 bg-ink text-on-ink flex flex-col transition-all duration-300',
          collapsed ? 'lg:w-[76px]' : 'lg:w-64',
          open ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0'
        )}
      >
        <Link to="/admin" className="h-16 flex items-center gap-2 px-5 shrink-0 border-b border-white/10">
          <img src="/logo.png" alt="" className="h-7 invert" />
          {!collapsed && <span className="text-headline-sm uppercase tracking-tight">WILDTANE</span>}
        </Link>
        <nav className="flex-1 overflow-y-auto scrollbar-none py-space-md px-3 flex flex-col gap-space-md" aria-label="Admin">
          {NAV.map((section) => (
            <div key={section.group} className="flex flex-col gap-0.5">
              {!collapsed && <span className="px-3 pb-1 text-label-sm uppercase tracking-wider text-on-ink/40">{section.group}</span>}
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
                        isActive ? 'bg-white/10 text-white font-semibold' : 'text-on-ink/70 hover:bg-white/5 hover:text-white',
                        collapsed && 'lg:justify-center lg:px-0'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-secondary-fixed-dim" />}
                        <Icon name={icon} fill={isActive} className="text-[20px]" />
                        {!collapsed && <span className="flex-1">{label}</span>}
                        {count > 0 && (
                          <span className={cn('min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center', alertKey === 'failedNotifications' ? 'bg-error text-on-error' : 'bg-secondary-fixed-dim text-on-secondary-fixed', collapsed && 'lg:absolute lg:top-0.5 lg:right-1')}>
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
        <Link to="/" className="m-3 flex items-center gap-3 h-10 px-3 rounded-lg text-body-sm text-on-ink/70 hover:bg-white/5 hover:text-white">
          <Icon name="storefront" className="text-[20px]" /> {!collapsed && 'View storefront'}
        </Link>
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
  return (
    <header className="print:hidden sticky top-0 z-30 h-16 bg-surface/80 backdrop-blur-xl border-b border-surface-container-high flex items-center gap-3 px-margin-sm md:px-margin">
      <button type="button" className="btn-icon lg:hidden" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <button type="button" className="btn-icon hidden lg:inline-flex" onClick={onCollapse} aria-label="Collapse sidebar"><Icon name="dock_to_right" /></button>
      <form
        className="relative flex-1 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/admin/orders?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an order, customer or email…" className="input h-10 pl-10" aria-label="Search orders" />
      </form>
      <div className="flex items-center gap-1 ml-auto">
        <button type="button" className="btn-icon" onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme">
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
        </button>
        <Link to="/admin/products/new" className="btn-primary btn-sm hidden sm:inline-flex"><Icon name="add" className="text-[18px]" /> Product</Link>
        <div className="flex items-center gap-2 pl-2 ml-1 border-l border-surface-container-high">
          <span className="w-9 h-9 rounded-full bg-secondary text-on-secondary text-label-md flex items-center justify-center">{initials(user?.name)}</span>
          <div className="hidden md:block leading-tight">
            <p className="text-label-lg">{user?.name}</p>
            <p className="text-label-sm font-normal text-outline">Administrator</p>
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Sign out"
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
              <Route path="analytics" element={<Analytics />} />
              <Route path="reports" element={<Reports />} />
              <Route path="quick-edit" element={<QuickEdit />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id" element={<ProductForm />} />
              <Route path="categories" element={<Categories />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="reviews" element={<Reviews />} />
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
