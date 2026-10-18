import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCartOpen, setSearchOpen, setShopModalOpen } from '../../store';
import { useCart } from '../../hooks/useCart';
import { cn } from '../../lib/format';
import { Icon } from '../ui';

const tabCls = (active) =>
  cn(
    'relative flex flex-col items-center justify-center gap-1 flex-1 h-full select-none active:scale-95 transition-all cursor-pointer',
    active ? 'text-secondary font-bold' : 'text-on-surface-variant font-medium'
  );

function Dot({ n, tone = 'bg-secondary' }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        'absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow-xs ring-1 ring-surface',
        tone
      )}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const { count: cartCount } = useCart();
  const searchOpen = useSelector((s) => s.ui.searchOpen);

  // The product page has its own sticky Flipkart-style dual buy bar.
  if (pathname.startsWith('/product/')) return null;

  const isHome = pathname === '/' && !searchOpen;
  const isShop = (pathname.startsWith('/shop') || ['/all', '/men', '/women', '/universal', '/unisex', '/bags'].includes(pathname)) && !searchOpen;
  const isOffers = pathname === '/offers' && !searchOpen;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center h-13 max-w-lg mx-auto px-1">
        {/* 1. Home */}
        <Link to="/" className={tabCls(isHome)}>
          <Icon name="home" fill={isHome} className="text-[21px]" />
          <span className="text-[9.5px] leading-none">Home</span>
        </Link>

        {/* 2. Search (ALWAYS inside screen on bottom navigation) */}
        <button
          type="button"
          onClick={() => dispatch(setSearchOpen(true))}
          className={tabCls(searchOpen)}
          aria-label="Search"
        >
          <Icon name="search" className="text-[21px]" />
          <span className="text-[9.5px] leading-none">Search</span>
        </button>

        {/* 3. Categories / Shop */}
        <button
          type="button"
          onClick={() => dispatch(setShopModalOpen(true))}
          className={tabCls(isShop)}
          aria-label="Shop Categories"
        >
          <Icon name="grid_view" className="text-[21px]" />
          <span className="text-[9.5px] leading-none">Categories</span>
        </button>

        {/* 4. Offers */}
        <Link to="/offers" className={tabCls(isOffers)}>
          <span className="relative">
            <Icon name="sell" fill={isOffers} className="text-[20px] text-rose-500" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          </span>
          <span className="text-[9.5px] leading-none text-rose-600 dark:text-rose-400 font-bold">Offers</span>
        </Link>

        {/* 5. Bag / Cart */}
        <button
          type="button"
          onClick={() => dispatch(setCartOpen(true))}
          aria-label={`Bag, ${cartCount} items`}
          className={tabCls(false)}
        >
          <span className="relative">
            <Icon name="shopping_bag" className="text-[21px]" />
            <Dot n={cartCount} tone="bg-secondary" />
          </span>
          <span className="text-[9.5px] leading-none">Bag</span>
        </button>
      </div>
    </nav>
  );
}
