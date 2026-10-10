import { Component, lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import SearchModal from './components/layout/SearchModal';
import BottomNav from './components/layout/BottomNav';
import ScrollToTopFab from './components/layout/ScrollToTopFab';
import InstallAppBanner from './components/layout/InstallAppBanner';
import { ShopDrawerModal } from './components/layout/ShopMenuWidget';
import { QuickViewModal } from './components/product';
import ThemeDrawer from './components/theme/ThemePanel';
import { PageLoader } from './components/ui';
import { usePageTracking } from './hooks/usePageTracking';

import Home from './pages/Home';
// Home (the product grid) loads with the app; other pages load when first visited (smaller first download).
import Shop from './pages/Shop';
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/Auth').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/Auth').then((m) => ({ default: m.ResetPassword })));
import NotFound, { Unauthorized } from './pages/NotFound';

const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Account = lazy(() => import('./pages/account/Account'));
const Blog = lazy(() => import('./pages/Blog'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Contact = lazy(() => import('./pages/Contact'));
const Corporate = lazy(() => import('./pages/Corporate'));
const About = lazy(() => import('./pages/About'));
const Policy = lazy(() => import('./pages/Policy'));
const PoliciesIndex = lazy(() => import('./pages/Policy').then((m) => ({ default: m.PoliciesIndex })));
const HelpCentre = lazy(() => import('./pages/Help'));
const FaqPage = lazy(() => import('./pages/Help').then((m) => ({ default: m.FaqPage })));
const ReturnsExchange = lazy(() => import('./pages/ReturnsExchange'));

// Policy pages live at short, readable URLs; older addresses redirect so saved links keep working.
const POLICY_SLUGS = ['return-policy', 'shipping-policy', 'privacy-policy', 'terms-and-conditions', 'csr-policy'];
const LEGACY_PAGES = {
  returns: '/returns-exchange',
  'return-exchange': '/returns-exchange',
  exchanges: '/returns-exchange',
  'pages/returns': '/returns-exchange',
  // Refunds and cancellations are sections of the Return, Refund & Exchange Policy.
  'refund-policy': '/return-policy#refund-policy',
  'cancellation-policy': '/return-policy#order-cancellation',
  'pages/shipping': '/shipping-policy',
  'pages/privacy': '/privacy-policy',
  'pages/terms': '/terms-and-conditions',
  'pages/warranty': '/return-policy',
  'pages/compliance': '/policies',
  sustainability: '/csr-policy',
};
const AdminApp = lazy(() => import('./admin/AdminApp'));
const AdminLogin = lazy(() => import('./admin/AdminLogin'));

function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    // Back/forward (POP) keeps the browser's restored position; new pages start at the top.
    // Braces matter: newer browsers return a Promise from scrollTo, which React would treat as a cleanup.
    if (navType !== 'POP') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, navType]);
  return null;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    // Navigating away from a crashed page clears the error.
    if (this.state.error && prev.pathname !== this.props.pathname) this.setState({ error: null });
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="text-headline-lg">Something went wrong on this page.</h1>
        <p className="text-body-md text-on-surface-variant max-w-md">Please reload. If it keeps happening, contact our care team.</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          <a href="/" className="btn-tonal">Go home</a>
        </div>
      </div>
    );
  }
}

function StoreLayout() {
  const { pathname } = useLocation();
  usePageTracking();
  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] btn-primary">
        Skip to content
      </a>
      <Header />
      <InstallAppBanner />
      <main id="main" className="flex-1 w-full max-w-full overflow-x-clip">
        <Suspense fallback={<PageLoader />}>
          {/* Keyed by path so each page fades in on navigation. */}
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
      <ScrollToTopFab />
      <CartDrawer />
      <SearchModal />
      <ShopDrawerModal />
      <QuickViewModal />
      <ThemeDrawer />
    </div>
  );
}

/** Waits for the session check, then requires sign-in (and optionally a role). */
function RequireAuth({ role, children }) {
  const { user, status } = useSelector((s) => s.auth);
  const location = useLocation();
  if (status !== 'ready') return <PageLoader />;
  const next = encodeURIComponent(location.pathname + location.search);
  if (!user) return <Navigate to={`${role === 'admin' ? '/admin/login' : '/login'}?next=${next}`} replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to={`/admin/login?next=${next}`} replace />;
  if (role && user.role !== role) return <Navigate to="/unauthorized" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, status } = useSelector((s) => s.auth);
  const location = useLocation();
  if (status !== 'ready') return <PageLoader />;
  if (user) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={next && next.startsWith('/') ? next : user.role === 'admin' ? '/admin' : '/account'} replace />;
  }
  return children;
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary pathname={pathname}>
      <ScrollToTop />
      <Routes>
        <Route
          path="/admin/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RequireAuth role="admin">
              <Suspense fallback={<PageLoader />}>
                <AdminApp />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <Checkout />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:category" element={<Shop />} />
          <Route path="men" element={<Shop key="men" preset="men" />} />
          <Route path="women" element={<Shop key="women" preset="women" />} />
          <Route path="universal" element={<Shop key="universal" preset="universal" />} />
          <Route path="unisex" element={<Shop key="unisex" preset="unisex" />} />
          <Route path="offers" element={<Shop preset="offers" />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="product/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="order/:id/success" element={<RequireAuth><OrderSuccess /></RequireAuth>} />
          <Route path="account/*" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password/:token" element={<ResetPassword />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="contact" element={<Contact />} />
          <Route path="corporate" element={<Corporate />} />
          <Route path="about" element={<About />} />
          <Route path="returns-exchange" element={<ReturnsExchange />} />
          <Route path="exchange" element={<ReturnsExchange defaultTab="exchange" />} />
          <Route path="exchanges" element={<ReturnsExchange defaultTab="exchange" />} />
          <Route path="policies" element={<PoliciesIndex />} />
          <Route path="help" element={<HelpCentre />} />
          <Route path="faq" element={<FaqPage />} />
          {POLICY_SLUGS.map((slug) => (
            <Route key={slug} path={slug} element={<Policy slug={slug} />} />
          ))}
          {Object.entries(LEGACY_PAGES).map(([path, to]) => (
            <Route key={path} path={path} element={<Navigate to={to} replace />} />
          ))}
          <Route path="unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
