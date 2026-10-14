import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, formatDateTime, imgUrl } from '../lib/format';
import { useConfig, useUser } from '../hooks/useStore';
import { prefersReducedMotion } from '../theme/engine';
import { openSpinWheel, useSpinStatus } from './growth/SpinWheelModal';
import { EmptyState, Icon, Skeleton } from './ui';

/** The shopper's coupons: personal codes (Spin & Win prizes) + public offers. */
export function useMyCoupons() {
  const user = useUser();
  return useQuery({ queryKey: ['my-coupons', user?._id], queryFn: api.myCoupons, enabled: Boolean(user), staleTime: 60 * 1000 });
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
export const discountLabel = (c) => (c.type === 'free_shipping' ? 'Free shipping' : c.type === 'percentage' ? `${c.value}% off` : `${inr(c.value)} off`);

function validity(c) {
  if (c.status === 'used') return 'Already used';
  if (c.status === 'expired') return `Expired ${formatDateTime(c.expiresAt)}`;
  if (!c.expiresAt) return 'No expiry date';
  const end = new Date(c.expiresAt);
  const sameDay = end.toDateString() === new Date().toDateString();
  return sameDay ? `Valid until ${end.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} today` : `Valid until ${formatDateTime(end)}`;
}

const TONES = ['from-violet-600 to-indigo-600', 'from-rose-600 to-pink-600', 'from-emerald-600 to-teal-600', 'from-sky-600 to-blue-600'];

/** One coupon as a ticket: discount, terms, validity, and a "Use offer" button that applies it in the bag. */
export function CouponCard({ coupon, index = 0 }) {
  const navigate = useNavigate();
  const usable = coupon.status === 'available';
  return (
    <div className={cn('relative flex rounded-2xl overflow-hidden border border-surface-container-high bg-surface-container-lowest', !usable && 'opacity-60')}>
      <div className={cn('w-24 sm:w-28 shrink-0 bg-gradient-to-br text-white flex flex-col items-center justify-center text-center px-2 py-3', TONES[index % TONES.length])}>
        <span className="text-[18px] sm:text-[20px] font-black leading-tight">{discountLabel(coupon)}</span>
        {coupon.source === 'spin' && <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-90">Spin & Win</span>}
      </div>
      {/* Ticket notches */}
      <span aria-hidden="true" className="absolute left-24 sm:left-28 -top-2 w-4 h-4 -ml-2 rounded-full bg-surface" />
      <span aria-hidden="true" className="absolute left-24 sm:left-28 -bottom-2 w-4 h-4 -ml-2 rounded-full bg-surface" />
      <div className="flex-1 min-w-0 p-3 flex flex-col gap-1">
        <p className="font-mono font-bold tracking-wider text-[14px]">{coupon.code}</p>
        <p className="text-[12px] text-on-surface-variant line-clamp-2">
          {coupon.description || discountLabel(coupon)}
          {coupon.minOrder > 0 ? ` · on orders over ${inr(coupon.minOrder)}` : ''}
          {coupon.type === 'percentage' && coupon.maxDiscount ? ` · up to ${inr(coupon.maxDiscount)}` : ''}
        </p>
        <p className={cn('text-[11px]', usable ? 'text-on-surface-variant' : 'text-outline')}>{validity(coupon)}</p>
        <div className="mt-auto pt-1">
          {usable ? (
            <button type="button" onClick={() => navigate(`/cart?coupon=${encodeURIComponent(coupon.code)}`)} className="btn-primary btn-sm h-8">
              Use offer <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">{coupon.status}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Account → My coupons. */
export function MyCouponsPanel() {
  const { data, isLoading } = useMyCoupons();
  const { data: spin } = useSpinStatus();
  if (isLoading) return <div className="grid sm:grid-cols-2 gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  const mine = data?.mine || [];
  const offers = data?.offers || [];
  return (
    <div className="flex flex-col gap-space-lg">
      {spin?.eligible && (
        <button type="button" onClick={openSpinWheel} className="card p-4 flex items-center gap-3 text-left hover:shadow-lift transition-shadow">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-rose-600 text-white flex items-center justify-center shrink-0"><Icon name="casino" /></span>
          <span className="flex-1">
            <span className="block text-label-lg">Today’s spin is waiting</span>
            <span className="block text-[12px] text-on-surface-variant">Spin once a day — your prize appears here.</span>
          </span>
          <Icon name="chevron_right" className="text-outline" />
        </button>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="text-headline-sm">Your codes</h2>
        {mine.length ? (
          <div className="grid sm:grid-cols-2 gap-3">{mine.map((c, i) => <CouponCard key={c.code} coupon={c} index={i} />)}</div>
        ) : (
          <EmptyState icon="confirmation_number" title="No personal codes yet" description="Spin & Win prizes and other codes made just for you appear here." />
        )}
      </section>
      {offers.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-headline-sm">Store offers</h2>
          <div className="grid sm:grid-cols-2 gap-3">{offers.map((c, i) => <CouponCard key={c.code} coupon={c} index={i + mine.length} />)}</div>
        </section>
      )}
    </div>
  );
}

/** Top of the Offers page: the shopper's usable codes (or a nudge to spin / sign in). */
export function YourOffersStrip() {
  const user = useUser();
  const { data } = useMyCoupons();
  const { data: spin } = useSpinStatus();
  const usable = [...(data?.mine || []), ...(data?.offers || [])].filter((c) => c.status === 'available');
  if (!user) {
    return (
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <Icon name="confirmation_number" className="text-violet-600 dark:text-violet-400" />
        <p className="flex-1 text-body-sm">Sign in to see your coupons and spin the daily wheel for a personal code.</p>
        <Link to="/login?next=/offers" className="btn-primary btn-sm">Sign in</Link>
      </div>
    );
  }
  if (!usable.length && !spin?.eligible) return null;
  return (
    <section aria-label="Your offers" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[20px]">Your offers</h2>
        <Link to="/account/coupons" className="text-[12px] font-semibold text-secondary hover:underline">My coupons</Link>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {spin?.eligible && (
          <button type="button" onClick={openSpinWheel} className="rounded-2xl p-4 flex items-center gap-3 text-left text-white bg-gradient-to-br from-violet-600 to-rose-600 hover:brightness-110 transition">
            <Icon name="casino" className="text-[28px]" />
            <span>
              <span className="block font-bold">Spin today’s wheel</span>
              <span className="block text-[12px] opacity-90">One spin a day for a personal code</span>
            </span>
          </button>
        )}
        {usable.slice(0, 5).map((c, i) => <CouponCard key={c.code} coupon={c} index={i} />)}
      </div>
    </section>
  );
}

/**
 * 4–5 colourful sliding banners. Admin → Banners ("Offers page" placement) controls them; until some
 * are added, built-in slides link to real pages and use only facts from the store settings.
 */
export function OffersCarousel() {
  const { data: config } = useConfig();
  const { data: banners } = useQuery({ queryKey: ['banners'], queryFn: api.banners, select: (d) => d.banners, staleTime: 5 * 60 * 1000 });
  const custom = (banners || []).filter((b) => b.placement === 'offers');
  const threshold = config?.freeShippingThreshold;
  const slides = custom.length
    ? custom.map((b) => ({ key: b._id, eyebrow: b.eyebrow, title: b.title, text: b.subtitle, cta: b.ctaLabel || 'Shop now', to: b.ctaLink || '/offers', image: b.image?.url, code: b.couponCode }))
    : [
        { key: 'sale', eyebrow: 'On sale now', title: 'Every discounted piece in one place', text: 'Sorted by the biggest saving first.', cta: 'Shop the sale', to: '/offers?sort=discount' },
        { key: 'spin', eyebrow: 'Daily Spin & Win', title: 'One spin a day, one personal code', text: 'Your prize is saved to your account and shown in My coupons.', cta: 'Spin the wheel', action: openSpinWheel },
        { key: 'new', eyebrow: 'Just in', title: 'New arrivals', text: 'The latest bags, backpacks and travel gear.', cta: 'See what’s new', to: '/new-arrivals' },
        { key: 'best', eyebrow: 'Most loved', title: 'Bestsellers', text: 'The pieces customers come back for.', cta: 'Shop bestsellers', to: '/bestsellers' },
        threshold ? { key: 'ship', eyebrow: 'Delivery', title: `Free shipping over ${inr(threshold)}`, text: 'Tracked delivery across India.', cta: 'Start shopping', to: '/shop' } : null,
      ].filter(Boolean);
  const gradients = ['from-violet-700 via-fuchsia-600 to-rose-500', 'from-indigo-700 via-violet-600 to-purple-500', 'from-emerald-700 via-teal-600 to-cyan-500', 'from-rose-700 via-pink-600 to-fuchsia-500', 'from-sky-700 via-blue-600 to-indigo-500'];

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const n = slides.length;
  useEffect(() => {
    if (paused || n < 2 || prefersReducedMotion()) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), 2000);
    return () => clearInterval(t);
  }, [paused, n]);
  if (!n) return null;
  const go = (k) => setI(((k % n) + n) % n);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers"
      className="relative overflow-hidden w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <div className="flex transition-transform duration-[400ms] ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, k) => (
          <div
            key={s.key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${k + 1} of ${n}`}
            aria-hidden={k !== i}
            className={cn('relative w-full shrink-0 min-h-[280px] sm:min-h-[320px] md:min-h-[400px] bg-gradient-to-br text-white p-7 pb-12 md:py-14 md:px-20 flex items-center', gradients[k % gradients.length])}
          >
            {s.image && <img src={imgUrl(s.image, 1200)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay" loading={k === 0 ? 'eager' : 'lazy'} />}
            <div aria-hidden="true" className="absolute -right-12 -top-12 w-72 h-72 md:w-96 md:h-96 rounded-full bg-white/10" />
            <div aria-hidden="true" className="absolute right-28 -bottom-20 w-52 h-52 md:w-64 md:h-64 rounded-full bg-white/10" />
            <div className="relative max-w-2xl flex flex-col gap-2.5 md:gap-3">
              {s.eyebrow && <span className="text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.18em] opacity-90">{s.eyebrow}</span>}
              <h2 className="font-display text-[32px] sm:text-[38px] md:text-[52px] leading-[1.08]">{s.title}</h2>
              {s.text && <p className="text-[14px] md:text-[18px] opacity-90 max-w-xl">{s.text}</p>}
              {s.code && <p className="text-[13px] md:text-[14px]">Code <span className="font-mono font-bold px-2 py-0.5 rounded bg-white/20">{s.code}</span></p>}
              <div className="pt-2">
                {s.action ? (
                  <button type="button" tabIndex={k === i ? 0 : -1} onClick={s.action} className="inline-flex items-center gap-1.5 h-11 md:h-12 px-6 rounded-full bg-white text-zinc-900 text-[14px] md:text-[15px] font-semibold hover:bg-white/90 shadow-lg">
                    {s.cta} <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                ) : (
                  <Link to={s.to} tabIndex={k === i ? 0 : -1} className="inline-flex items-center gap-1.5 h-11 md:h-12 px-6 rounded-full bg-white text-zinc-900 text-[14px] md:text-[15px] font-semibold hover:bg-white/90 shadow-lg">
                    {s.cta} <Icon name="arrow_forward" className="text-[18px]" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button type="button" aria-label="Previous offer" onClick={() => go(i - 1)} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center"><Icon name="chevron_left" /></button>
          <button type="button" aria-label="Next offer" onClick={() => go(i + 1)} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center"><Icon name="chevron_right" /></button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
            {slides.map((s, k) => (
              <button key={s.key} type="button" aria-label={`Show offer ${k + 1}`} aria-current={k === i} onClick={() => go(k)} className={cn('h-1.5 rounded-full transition-all', k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/50')} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
