import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { discountLabel, useMyCoupons } from '../components/offers';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { useMoney, useUser } from '../hooks/useStore';
import { useConfirm, Button, EmptyState, Icon, Skeleton } from '../components/ui';
import { CartLine, FreeShippingMeter } from '../components/layout/CartDrawer';
import Seo from '../components/Seo';
import { CoinIcon, EarnLine, UseCoinsCard } from '../components/coins';

export function CouponBox() {
  const user = useUser();
  const navigate = useNavigate();
  const { cart, summary, applyCoupon, removeCoupon } = useCart();
  const money = useMoney();
  const [params, setParams] = useSearchParams();
  const fromOffer = (params.get('coupon') || '').trim().toUpperCase();
  const [code, setCode] = useState(fromOffer);
  const [error, setError] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const offers = useQuery({ queryKey: ['public-coupons'], queryFn: api.publicCoupons, select: (d) => d.coupons, staleTime: 5 * 60 * 1000 });
  const mine = useMyCoupons();
  const myCodes = (mine.data?.mine || []).filter((c) => c.status === 'available');
  const hasItems = (cart?.items?.length || 0) > 0;
  const tried = useRef('');

  const subtotal = summary?.subtotal || 0;
  const activeCoupons = summary?.coupons?.length ? summary.coupons : summary?.coupon ? [summary.coupon] : [];
  const allOffers = offers.data || [];
  const flatOffers = allOffers.filter((c) => c.type === 'fixed');
  const promoOffers = allOffers.filter((c) => c.type !== 'fixed');

  // "Use offer" from My coupons / the Offers page lands here with ?coupon=CODE: apply it once the bag has items.
  useEffect(() => {
    if (!user || !fromOffer || tried.current === fromOffer || activeCoupons.some((c) => c.code === fromOffer)) return;
    if (!hasItems) {
      setError('Add something to your bag and your code will be ready to apply.');
      return;
    }
    tried.current = fromOffer;
    applyCoupon.mutate(fromOffer, {
      onSuccess: () => {
        setCode('');
        setError('');
        const next = new URLSearchParams(params);
        next.delete('coupon');
        setParams(next, { replace: true });
      },
      onError: (e) => setError(e.message),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fromOffer, hasItems]);

  const submit = (value) => {
    const c = (value ?? code).trim().toUpperCase();
    if (!c) return;
    setError('');
    applyCoupon.mutate(c, {
      onSuccess: () => setCode(''),
      onError: (e) => setError(e.message),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 1. Active Coupons Display (Allows up to 2 different kinds at once) */}
      {activeCoupons.length > 0 && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary-container/30 border border-secondary/60 flex flex-col gap-2 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[11.5px] uppercase tracking-wider font-bold text-secondary flex items-center gap-1.5">
              <Icon name="verified" className="text-[16px]" />
              {activeCoupons.length === 2 ? '2 Coupons Applied (Different Kinds)' : '1 Coupon Applied'}
            </span>
            <span className="text-[12px] font-bold text-secondary">
              Total Saved: {money(summary.discount)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {activeCoupons.map((ac) => {
              const kindLabel =
                ac.type === 'fixed'
                  ? 'Flat Option'
                  : ac.type === 'free_shipping'
                  ? 'Free Shipping'
                  : 'Promo Voucher';

              return (
                <div
                  key={ac.code}
                  className="p-2 sm:p-2.5 px-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                      <Icon name="sell" className="text-[14px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-label-sm font-bold text-on-surface truncate flex items-center gap-1.5">
                        <span>{ac.code}</span>
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded font-semibold bg-secondary/10 text-secondary">
                          {kindLabel}
                        </span>
                      </p>
                      <p className="text-[11px] text-on-surface-variant truncate">
                        {ac.type === 'free_shipping' ? 'Free Delivery' : `Saves ${money(ac.discount)}`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCoupon.mutate(ac.code)}
                    disabled={removeCoupon.isPending}
                    className="text-[12px] font-semibold text-error hover:underline shrink-0 p-1 -mr-1"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {activeCoupons.length < 2 && (
            <p className="text-[11px] text-outline mt-0.5 leading-snug">
              Tip: You can apply 1 more coupon of a different kind (e.g. combine Flat Discount + Percentage Voucher)!
            </p>
          )}
        </div>
      )}

      {/* Guest prompt notice */}
      {!user && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <Icon name="local_offer" className="text-secondary text-[16px]" />
            <span>Apply up to 2 different coupon types once signed in.</span>
          </span>
          <Link to="/login?next=/cart" className="text-secondary font-semibold hover:underline shrink-0">Sign in</Link>
        </div>
      )}

      {/* 2. Flat Discount Options (Shopper selects 1 flat option) */}
      {flatOffers.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-label-sm uppercase tracking-wider font-bold text-on-surface flex items-center gap-1.5">
              <Icon name="confirmation_number" className="text-[16px] text-secondary" />
              Flat Discounts <span className="font-normal text-outline text-[11px] sm:text-label-sm">(1 Flat Option)</span>
            </span>
            <span className="text-[10.5px] sm:text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Can combine with Voucher & Coins
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {flatOffers.map((o) => {
              const isSelected = activeCoupons.some((c) => c.code === o.code);
              const isEligible = subtotal >= (o.minOrder || 0);
              const needed = Math.max(0, (o.minOrder || 0) - subtotal);

              return (
                <div
                  key={o.code}
                  className={cn(
                    'p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col justify-between gap-1.5',
                    isSelected
                      ? 'border-secondary bg-secondary-container/30 ring-1 ring-secondary/40 shadow-xs'
                      : isEligible
                      ? 'border-surface-container-high bg-surface-container-lowest hover:border-secondary/60 hover:bg-surface-container-low'
                      : 'border-surface-container-high/60 bg-surface-container-low/30 opacity-75'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#c08a2e]/15 text-[#9a6b1f] dark:text-[#f5d58a]">
                        FLAT ₹{o.value} OFF
                      </span>
                      <p className="font-mono font-bold text-[13px] text-on-surface mt-1">{o.code}</p>
                    </div>
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={() => removeCoupon.mutate(o.code)}
                        disabled={removeCoupon.isPending}
                        className="text-[11px] sm:text-[11.5px] font-bold text-secondary flex items-center gap-0.5 shrink-0 bg-secondary/10 px-2.5 py-1 rounded-full hover:bg-secondary/20 active:scale-95 transition-transform"
                      >
                        <Icon name="check" className="text-[13px]" /> Active (Remove)
                      </button>
                    ) : isEligible ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 text-[12px] px-3 shrink-0 active:scale-95 transition-transform"
                        loading={applyCoupon.isPending}
                        onClick={() => {
                          if (!user) {
                            navigate(`/login?next=${encodeURIComponent(`/cart?coupon=${o.code}`)}`);
                            return;
                          }
                          submit(o.code);
                        }}
                      >
                        Avail
                      </Button>
                    ) : (
                      <span className="text-[11px] text-outline flex items-center gap-0.5 shrink-0">
                        <Icon name="lock" className="text-[13px]" /> Locked
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-on-surface-variant leading-tight">
                    {isEligible
                      ? o.minOrder > 0
                        ? `On orders over ₹${o.minOrder.toLocaleString('en-IN')}`
                        : 'No minimum cart total'
                      : `Add ₹${needed.toLocaleString('en-IN')} more to avail`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Promo Vouchers / Percentage Codes (Can stack with Flat Option!) */}
      {(myCodes.length > 0 || promoOffers.length > 0) && (
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-[11.5px] uppercase tracking-wider font-bold text-on-surface flex items-center gap-1.5">
              <Icon name="sell" className="text-[15px] text-secondary" />
              Promo Vouchers <span className="font-normal text-outline text-[10.5px] sm:text-[11px]">(Different kind — can stack!)</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {myCodes.map((o) => {
              const isSelected = activeCoupons.some((c) => c.code === o.code);
              return (
                <button
                  key={o.code}
                  type="button"
                  title={o.description}
                  onClick={() => (isSelected ? removeCoupon.mutate(o.code) : submit(o.code))}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg border text-label-sm transition-all flex items-center gap-1 min-h-[34px] active:scale-95',
                    isSelected
                      ? 'border-violet-600 bg-violet-500/20 text-violet-800 dark:text-violet-200 font-bold'
                      : 'border-dashed border-violet-500/60 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10'
                  )}
                >
                  <Icon name={isSelected ? 'check' : 'add'} className="text-[13px]" />
                  <span>{o.code} · {discountLabel(o)}</span>
                  <span className="opacity-70 text-[10px]">(personal)</span>
                </button>
              );
            })}
            {promoOffers.map((o) => {
              const isSelected = activeCoupons.some((c) => c.code === o.code);
              return (
                <button
                  key={o.code}
                  type="button"
                  title={o.description}
                  onClick={() => (isSelected ? removeCoupon.mutate(o.code) : submit(o.code))}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg border text-label-sm transition-all flex items-center gap-1 min-h-[34px] active:scale-95',
                    isSelected
                      ? 'border-secondary bg-secondary/20 text-secondary font-bold'
                      : 'border-dashed border-outline-variant hover:border-secondary hover:text-secondary'
                  )}
                >
                  <Icon name={isSelected ? 'check' : 'add'} className="text-[13px]" />
                  <span>{o.code} · {discountLabel(o)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Custom Promo Code input toggle */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowPromoInput((prev) => !prev)}
          className="text-label-sm text-secondary hover:underline flex items-center gap-1 w-fit"
        >
          <Icon name={showPromoInput ? 'expand_less' : 'expand_more'} className="text-[16px]" />
          {showPromoInput ? 'Hide manual code input' : 'Have another code to apply?'}
        </button>

        {showPromoInput && (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2 mt-1">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter promo code"
              className={cn('input h-10 uppercase flex-1', error && 'input-error')}
              aria-label="Promo code"
            />
            <Button type="submit" variant="primary" size="sm" className="h-10 px-4" loading={applyCoupon.isPending}>
              Apply
            </Button>
          </form>
        )}

        {(error || (cart.couponCode && summary?.couponError)) && (
          <p className="text-label-md text-error">{error || summary.couponError}</p>
        )}
      </div>
    </div>
  );
}

export function SummaryRows({ summary }) {
  const money = useMoney();
  if (!summary) return null;
  const activeCoupons = summary.coupons?.length ? summary.coupons : summary.coupon ? [summary.coupon] : [];
  const hasCombinedSavings = summary.discount > 0 || summary.coins?.used > 0;

  return (
    <div className="flex flex-col gap-2 text-body-sm">
      <div className="flex justify-between">
        <span className="text-on-surface-variant">Subtotal ({summary.itemCount} item{summary.itemCount === 1 ? '' : 's'})</span>
        <span>{money(summary.subtotal)}</span>
      </div>

      {/* Each active coupon line item */}
      {activeCoupons.map((ac) => {
        const label =
          ac.type === 'fixed'
            ? `Flat Option (${ac.code})`
            : ac.type === 'free_shipping'
            ? `Free Shipping (${ac.code})`
            : `Voucher (${ac.code})`;

        return (
          <div key={ac.code} className="flex justify-between text-secondary font-medium">
            <span>{label}</span>
            <span>{ac.type === 'free_shipping' ? 'Free' : `−${money(ac.discount)}`}</span>
          </div>
        );
      })}

      {/* WILDTANE Coins line item */}
      {summary.coins?.used > 0 && (
        <div className="flex justify-between text-[#9a6b1f] dark:text-[#f5d58a] font-medium">
          <span className="flex items-center gap-1"><CoinIcon className="w-3.5 h-3.5" /> WILDTANE Coins ({summary.coins.used})</span>
          <span>−{money(summary.coins.discount)}</span>
        </div>
      )}

      {/* Combined celebration callout */}
      {hasCombinedSavings && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[12px] flex flex-wrap items-center justify-between gap-1 font-semibold shadow-xs">
          <span className="flex items-center gap-1.5">
            <Icon name="celebration" className="text-[16px] text-emerald-600 dark:text-emerald-400" />
            {activeCoupons.length > 1
              ? `2 Coupons${summary.coins?.used > 0 ? ' + Coins' : ''} Total Saved`
              : `Total Saved${summary.coins?.used > 0 ? ' (with Coins)' : ''}`}
          </span>
          <span className="text-[13px] font-bold">−{money(summary.discount + (summary.coins?.discount || 0))}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-on-surface-variant">Shipping · {summary.shippingMethod?.label}</span>
        <span>{summary.shipping ? money(summary.shipping) : <span className="text-secondary">Free</span>}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-on-surface-variant">{summary.taxLabel}{summary.taxIncluded ? ' (included)' : ''}</span>
        <span>{money(summary.tax)}</span>
      </div>

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
  const { items, summary, isLoading, hasIssues, clear, setShipping, setUseCoins } = useCart();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const money = useMoney();

  return (
    <div className="container-x py-space-md sm:py-space-xl">
      <Seo title="Shopping Bag" noindex />
      <div className="flex items-end justify-between gap-4 mb-space-md sm:mb-space-lg">
        <div>
          <span className="eyebrow">Your gear bag</span>
          <h1 className="text-headline-xl-mobile md:text-headline-xl">Shopping Bag</h1>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            className="text-label-md text-error hover:underline py-1"
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
          <aside className="lg:col-span-4 card p-3.5 sm:p-space-lg flex flex-col gap-space-md lg:sticky lg:top-32">
            <h2 className="text-headline-sm">Order summary</h2>
            <FreeShippingMeter summary={summary} />
            <div className="flex flex-col gap-2">
              <span className="text-label-sm uppercase tracking-wider text-outline">Delivery</span>
              {summary?.shippingMethods?.map((m) => (
                <label key={m.code} className={cn('flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-space-sm rounded-xl cursor-pointer border transition-colors', summary.shippingMethod.code === m.code ? 'border-secondary bg-secondary-container/20' : 'border-surface-container-high hover:bg-surface-container-low')}>
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
            <UseCoinsCard summary={summary} busy={setUseCoins?.isPending} onToggle={(use) => setUseCoins?.mutate(use)} />
            <SummaryRows summary={summary} />
            <Button className="w-full h-12 text-[14px] sm:text-[15px] font-bold active:scale-[0.99]" disabled={hasIssues} iconRight="lock" onClick={() => navigate('/checkout')}>Proceed to Secure Checkout</Button>
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
