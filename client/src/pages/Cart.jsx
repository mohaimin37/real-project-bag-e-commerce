import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { useMoney, useUser } from '../hooks/useStore';
import { useConfirm, Button, EmptyState, Icon, Skeleton } from '../components/ui';
import { CartLine, FreeShippingMeter } from '../components/layout/CartDrawer';
import Seo from '../components/Seo';
import { CoinIcon, EarnLine } from '../components/coins';

export function CouponBox() {
  const user = useUser();
  const { cart, summary, applyCoupon, removeCoupon } = useCart();
  const money = useMoney();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const offers = useQuery({ queryKey: ['public-coupons'], queryFn: api.publicCoupons, select: (d) => d.coupons, staleTime: 5 * 60 * 1000 });

  if (!user) {
    return (
      <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
        <Icon name="sell" className="text-[18px] text-secondary" />
        <span><Link to="/login?next=/cart" className="text-secondary underline">Sign in</Link> to apply coupon codes.</span>
      </p>
    );
  }

  if (summary?.coupon) {
    return (
      <div className="flex items-center justify-between gap-2 p-space-sm rounded-xl bg-secondary-container/50 border border-dashed border-secondary">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="sell" className="text-secondary" />
          <div className="min-w-0">
            <p className="text-label-lg">{summary.coupon.code} applied</p>
            <p className="text-label-sm font-normal text-on-surface-variant truncate">You save {money(summary.coupon.discount)}</p>
          </div>
        </div>
        <button type="button" onClick={() => removeCoupon.mutate()} className="text-label-md text-error hover:underline shrink-0">Remove</button>
      </div>
    );
  }

  const submit = (value) => {
    const c = (value ?? code).trim().toUpperCase();
    if (!c) return;
    setError('');
    applyCoupon.mutate(c, { onSuccess: () => setCode(''), onError: (e) => setError(e.message) });
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo code" className={cn('input h-10 uppercase', error && 'input-error')} aria-label="Promo code" />
        <Button type="submit" variant="primary" size="sm" className="h-10" loading={applyCoupon.isPending}>Apply</Button>
      </form>
      {(error || (cart.couponCode && summary?.couponError)) && <p className="text-label-md text-error">{error || summary.couponError}</p>}
      {offers.data?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {offers.data.slice(0, 3).map((o) => (
            <button key={o.code} type="button" title={o.description} onClick={() => submit(o.code)} className="px-2 py-1 rounded-lg border border-dashed border-outline-variant text-label-sm hover:border-secondary hover:text-secondary">
              {o.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SummaryRows({ summary }) {
  const money = useMoney();
  if (!summary) return null;
  return (
    <div className="flex flex-col gap-2 text-body-sm">
      <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal ({summary.itemCount} item{summary.itemCount === 1 ? '' : 's'})</span><span>{money(summary.subtotal)}</span></div>
      {summary.discount > 0 && <div className="flex justify-between text-secondary"><span>Discount{summary.coupon ? ` (${summary.coupon.code})` : ''}</span><span>−{money(summary.discount)}</span></div>}
      {summary.coins?.used > 0 && (
        <div className="flex justify-between text-success"><span className="flex items-center gap-1"><CoinIcon className="w-3.5 h-3.5" /> Coins ({summary.coins.used})</span><span>−{money(summary.coins.discount)}</span></div>
      )}
      <div className="flex justify-between"><span className="text-on-surface-variant">Shipping · {summary.shippingMethod?.label}</span><span>{summary.shipping ? money(summary.shipping) : <span className="text-secondary">Free</span>}</span></div>
      <div className="flex justify-between"><span className="text-on-surface-variant">{summary.taxLabel}{summary.taxIncluded ? ' (included)' : ''}</span><span>{money(summary.tax)}</span></div>
      <div className="h-px bg-surface-container-high my-1" />
      <div className="flex justify-between items-baseline">
        <span className="text-label-lg">Total</span>
        <span className="text-price-xl">{money(summary.grandTotal)}</span>
      </div>
      {money.isConverted && <p className="text-label-sm font-normal text-outline text-right">Charged as {money.inr(summary.grandTotal)}</p>}
      <EarnLine summary={summary} className="mt-1" />
    </div>
  );
}

export default function Cart() {
  const { items, summary, isLoading, hasIssues, clear, setShipping } = useCart();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const money = useMoney();

  return (
    <div className="container-x py-space-xl">
      <Seo title="Shopping Bag" noindex />
      <div className="flex items-end justify-between gap-4 mb-space-lg">
        <div>
          <span className="eyebrow">Your gear bag</span>
          <h1 className="text-headline-xl-mobile md:text-headline-xl">Shopping Bag</h1>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            className="text-label-md text-error hover:underline"
            onClick={async () => {
              if (await confirm({ title: 'Empty your bag?', message: 'All items will be removed.', confirmLabel: 'Empty bag' })) clear.mutate();
            }}
          >
            Clear bag
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid lg:grid-cols-12 gap-gutter-lg">
          <div className="lg:col-span-8 flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
          <Skeleton className="lg:col-span-4 h-80" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="shopping_bag" title="Your bag is empty" description="Save the essentials you love and they'll wait for you here." action={<Link to="/shop" className="btn-primary">Start shopping</Link>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            {hasIssues && (
              <div className="p-space-md rounded-xl bg-error-container text-on-error-container flex items-center gap-2 text-body-sm" role="alert">
                <Icon name="warning" /> Some items need attention before checkout. Adjust quantities or remove unavailable items.
              </div>
            )}
            {items.map((line) => <CartLine key={line._id} line={line} />)}
            <Link to="/shop" className="text-label-lg text-secondary flex items-center gap-1 w-fit"><Icon name="arrow_back" className="text-[16px]" /> Continue shopping</Link>
          </div>
          <aside className="lg:col-span-4 card p-space-lg flex flex-col gap-space-md lg:sticky lg:top-32">
            <h2 className="text-headline-sm">Order summary</h2>
            <FreeShippingMeter summary={summary} />
            <div className="flex flex-col gap-2">
              <span className="text-label-sm uppercase tracking-wider text-outline">Delivery</span>
              {summary?.shippingMethods?.map((m) => (
                <label key={m.code} className={cn('flex items-center gap-3 p-space-sm rounded-xl cursor-pointer border transition-colors', summary.shippingMethod.code === m.code ? 'border-secondary bg-secondary-container/20' : 'border-surface-container-high hover:bg-surface-container-low')}>
                  <input type="radio" name="ship" className="accent-secondary" checked={summary.shippingMethod.code === m.code} onChange={() => setShipping.mutate(m.code)} />
                  <span className="flex-1">
                    <span className="block text-label-lg">{m.label}</span>
                    <span className="block text-label-sm font-normal text-outline">{m.eta}</span>
                  </span>
                  <span className="text-label-lg">{m.price ? money(m.price) : 'Free'}</span>
                </label>
              ))}
            </div>
            <CouponBox />
            <SummaryRows summary={summary} />
            <Button className="w-full h-12" disabled={hasIssues} iconRight="lock" onClick={() => navigate('/checkout')}>Proceed to Secure Checkout</Button>
            <div className="flex items-center justify-center gap-3 text-label-sm font-normal text-outline">
              <span className="flex items-center gap-1"><Icon name="lock" className="text-[14px]" /> Encrypted</span>
              <span className="flex items-center gap-1"><Icon name="published_with_changes" className="text-[14px]" /> 7-day returns</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
