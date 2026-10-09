import { Link, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCartOpen, setMobileNavOpen } from '../../store';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useUser } from '../../hooks/useStore';
import { cn } from '../../lib/format';
import { Icon } from '../ui';

const tabCls = (active) =>
  cn('relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full select-none active:opacity-60', active ? 'text-on-surface' : 'text-outline');

function Dot({ n }) {
  if (!n) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-secondary text-on-secondary text-[9px] font-bold flex items-center justify-center">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const user = useUser();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();

  // The product page has its own sticky buy bar.
  if (pathname.startsWith('/product/')) return null;

  const tabs = [
    { to: '/', label: 'Home', icon: 'home', active: pathname === '/' || pathname.startsWith('/shop') || ['/offers', '/men', '/women', '/unisex'].includes(pathname) },
    { to: '/wishlist', label: 'Wishlist', icon: 'favorite', active: pathname === '/wishlist', badge: wishCount },
    { to: user ? '/account' : '/login', label: user ? 'Account' : 'Sign in', icon: 'person', active: pathname.startsWith('/account') || pathname === '/login' },
  ];

  return (
    <nav aria-label="Mobile" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest border-t border-surface-container-high pb-safe">
      <div className="flex items-center h-14 max-w-lg mx-auto">
        <Link to={tabs[0].to} className={tabCls(tabs[0].active)}>
          <Icon name="home" fill={tabs[0].active} className="text-[22px]" />
          <span className="text-[10px] font-medium leading-none">Home</span>
        </Link>
        <button type="button" onClick={() => dispatch(setMobileNavOpen(true))} className={tabCls(false)}>
          <Icon name="category" className="text-[22px]" />
          <span className="text-[10px] font-medium leading-none">Categories</span>
        </button>
        {tabs.slice(1).map((tab) => (
          <Link key={tab.label} to={tab.to} className={tabCls(tab.active)}>
            <span className="relative">
              <Icon name={tab.icon} fill={tab.active} className="text-[22px]" />
              <Dot n={tab.badge} />
            </span>
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => dispatch(setCartOpen(true))} aria-label={`Bag, ${cartCount} items`} className={tabCls(false)}>
          <span className="relative">
            <Icon name="shopping_bag" className="text-[22px]" />
            <Dot n={cartCount} />
          </span>
          <span className="text-[10px] font-medium leading-none">Bag</span>
        </button>
      </div>
    </nav>
  );
}
