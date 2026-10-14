import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ProductCard, useProductsByIds } from './product';
import { Icon } from './ui';
import { cn } from '../lib/format';

/**
 * "Continue shopping": the products this shopper looked at recently, in a swipeable row.
 * Kept in this browser (works signed in or not); nothing is shown on a first visit.
 */
export default function ContinueShopping({ className, compact }) {
  const ids = useSelector((s) => s.guestLists?.recent || []);
  const signedIn = useSelector((s) => Boolean(s.auth.user));
  const { data: products } = useProductsByIds(ids.slice(0, 10));
  if (!products?.length) return null;

  return (
    <section aria-labelledby="continue-shopping" className={cn('w-full', className)}>
      <div className={cn(compact ? 'px-2' : 'container-x', 'flex flex-col gap-2.5')}>
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 id="continue-shopping" className={cn('flex items-center gap-2 font-black text-on-surface tracking-tight', compact ? 'text-[13px] uppercase' : 'text-headline-sm')}>
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs">
              <Icon name="history" className="text-[16px]" />
            </span>
            Continue shopping
          </h2>
          {signedIn && (
            <Link to="/account/recent" className="text-[12px] font-bold text-secondary inline-flex items-center gap-0.5">
              See all <Icon name="chevron_right" className="text-[16px]" />
            </Link>
          )}
        </div>
        <div className="flex gap-2.5 md:gap-3 overflow-x-auto snap-x scrollbar-none pb-1 -mx-1 px-1">
          {products.map((p) => (
            <div key={p._id} className="snap-start shrink-0 w-[42vw] max-w-[200px] md:w-56 md:max-w-none">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
