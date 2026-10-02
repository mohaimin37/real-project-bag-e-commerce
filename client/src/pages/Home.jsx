import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn, formatDate } from '../lib/format';
import { openQuickView } from '../store';
import { useConfig, useUser } from '../hooks/useStore';
import Seo, { itemListLd, organizationLd, websiteLd } from '../components/Seo';
import { ProductCard, ProductCardSkeleton, useProductsByIds } from '../components/product';
import { Icon, Img, Skeleton } from '../components/ui';
import LiveFeed, { useLiveUpdates } from '../components/LiveFeed';

const PURPOSES = [
  { key: 'work', icon: 'business_center', title: 'Work & Executive', text: 'Slim silhouettes & documents' },
  { key: 'travel', icon: 'travel_explore', title: 'Travel & Weekend', text: 'Max capacity 35L – 55L' },
  { key: 'transit', icon: 'directions_subway', title: 'Daily Transit', text: 'Urban weather-sealed packs' },
  { key: 'business', icon: 'meeting_room', title: 'Business Summit', text: 'Briefcases & padfolios' },
  { key: 'creative', icon: 'camera', title: 'Creative Studio', text: 'Camera inserts & cable bays' },
];

const SPECS = [
  { icon: 'flight_takeoff', title: 'Cabin Friendly', text: 'Precise dimensions slide smoothly beneath seats or into compact regional overhead bins.' },
  { icon: 'laptop_mac', title: 'Suspended 16" Cradle', text: 'Impact-absorbing neoprene hammock protects your laptop even during high drops.' },
  { icon: 'shield', title: 'Ripstop 1000D Weave', text: 'Hydrophobic coated ballistic yarn repels torrential monsoons and abrasive scuffs.' },
  { icon: 'sync_alt', title: 'Luggage Pass-Through', text: 'Heavy-gauge integrated rear strap locks the bag firmly over rolling suitcase handles.' },
];

const PILLARS = [
  { icon: 'recycling', title: '100% Recycled Nylon', text: 'Extracted from reclaimed post-industrial fishing nets and industrial plastic yarn, lowering carbon output by 58%.', foot: 'Traceable GRS Certified' },
  { icon: 'cruelty_free', title: 'Vegetable-Tanned Hide', text: 'LWG Gold-rated tanneries using natural tree bark and mimosa extracts. Free from heavy metal chrome.', foot: 'LWG Gold Rated' },
  { icon: 'handshake', title: 'Ethical Fair Facilities', text: 'Crafted by master artisans in ISO-14001 compliant workshops with transparent living wages and solar tooling.', foot: 'Fair Trade Audited' },
  { icon: 'construction', title: 'Free Lifetime Repairs', text: 'If a zipper jams or a stitch loosens after 15 years, our repair partners will fix it free.', foot: 'Zero Obsolescence Guarantee' },
];

function SectionHead({ eyebrow, title, children, center }) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-end justify-between gap-4 mb-space-lg', center && 'md:flex-col md:items-center text-center')}>
      <div className="flex flex-col gap-1">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="text-headline-xl-mobile md:text-headline-xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function useCountdown(endsAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  return {
    done: diff === 0,
    parts: [
      ['Days', Math.floor(diff / 86400000)],
      ['Hours', Math.floor(diff / 3600000) % 24],
      ['Mins', Math.floor(diff / 60000) % 60],
      ['Secs', Math.floor(diff / 1000) % 60],
    ],
  };
}

function PromoBanner({ banner }) {
  const { parts, done } = useCountdown(banner.endsAt || Date.now() + 86400000);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(banner.couponCode);
      toast.success(`Code ${banner.couponCode} copied`);
    } catch {
      toast(`Use code ${banner.couponCode} at checkout`);
    }
  };
  return (
    <section className="w-full py-space-xl bg-surface" id="offers">
      <div className="container-x">
        <div className="relative rounded-3xl bg-gradient-to-r from-ink via-[#28313c] to-ink text-on-ink p-space-lg sm:p-space-xl lg:p-14 overflow-hidden shadow-lift">
          <div className="absolute -right-10 -top-10 w-96 h-96 bg-secondary/25 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-space-xl">
            <div className="flex flex-col gap-space-sm max-w-xl">
              {banner.eyebrow && <span className="px-3 py-1 rounded bg-secondary text-on-secondary text-label-sm uppercase w-fit tracking-wider">{banner.eyebrow}</span>}
              <h2 className="text-headline-xl-mobile md:text-headline-xl">{banner.title}</h2>
              <p className="text-body-md text-on-ink/75">{banner.subtitle}</p>
              {banner.couponCode && (
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button type="button" onClick={copy} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-secondary-fixed-dim/60 text-secondary-fixed-dim text-label-lg hover:bg-white/5">
                    <Icon name="content_copy" className="text-[16px]" /> {banner.couponCode}
                  </button>
                  <span className="text-label-sm font-normal text-on-ink/60">Tap to copy · apply at checkout</span>
                </div>
              )}
            </div>
            {banner.endsAt && (
              <div className="flex flex-col items-center gap-space-md p-space-lg rounded-2xl bg-white/5 backdrop-blur-md text-center w-full sm:w-auto">
                <span className="text-label-sm uppercase tracking-wider text-on-ink/70">{done ? 'Offer ended' : 'Drop closes in'}</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  {parts.map(([label, v], i) => (
                    <div key={label} className="flex items-center gap-2 sm:gap-3">
                      {i > 0 && <span className="text-headline-md text-secondary-fixed-dim">:</span>}
                      <div className="flex flex-col items-center bg-ink/80 px-3 py-2 rounded-lg min-w-[56px]">
                        <span className={cn('text-headline-lg tabular-nums', label === 'Secs' && 'text-secondary-fixed-dim')}>{String(v).padStart(2, '0')}</span>
                        <span className="text-label-sm font-normal text-on-ink/50">{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {banner.ctaLink && (
                  <Link to={banner.ctaLink} className="w-full py-3 rounded-lg bg-secondary hover:bg-secondary-fixed hover:text-on-secondary-fixed text-on-secondary text-label-lg transition-colors shadow">
                    {banner.ctaLabel || 'Shop the offer'}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Carousel({ products, loading }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <>
      <div className="flex items-center gap-2 absolute right-0 top-2">
        <button type="button" aria-label="Previous" onClick={() => scroll(-1)} className="w-10 h-10 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center">
          <Icon name="chevron_left" />
        </button>
        <button type="button" aria-label="Next" onClick={() => scroll(1)} className="w-10 h-10 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center">
          <Icon name="chevron_right" />
        </button>
      </div>
      <div ref={ref} className="flex gap-gutter-sm md:gap-gutter overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 -mx-1 px-1">
        {(loading ? Array.from({ length: 4 }) : products).map((p, i) => (
          <div key={p?._id || i} className="snap-start shrink-0 w-[78%] min-[480px]:w-[46%] lg:w-[calc(25%-18px)] flex">
            {loading ? <div className="w-full"><ProductCardSkeleton /></div> : <div className="w-full flex [&>article]:w-full"><ProductCard product={p} /></div>}
          </div>
        ))}
      </div>
    </>
  );
}

function RecentlyViewed() {
  const user = useUser();
  const guestIds = useSelector((s) => s.guestLists.recent);
  const server = useQuery({ queryKey: ['recently-viewed'], queryFn: api.recentlyViewed, enabled: Boolean(user), select: (d) => d.products });
  const guest = useProductsByIds(user ? [] : guestIds);
  const products = (user ? server.data : guest.data) || [];
  if (products.length < 2) return null;
  return (
    <section className="w-full py-space-xl bg-surface">
      <div className="container-x relative">
        <SectionHead eyebrow="Picked up where you left off" title="Recently Viewed." />
        <Carousel products={products.slice(0, 8)} />
      </div>
    </section>
  );
}

export default function Home() {
  const dispatch = useDispatch();
  const { data: config } = useConfig();
  const collections = useQuery({ queryKey: ['collections'], queryFn: api.collections });
  const banners = useQuery({ queryKey: ['banners'], queryFn: api.banners, select: (d) => d.banners });
  const facets = useQuery({ queryKey: ['facets', 'all'], queryFn: () => api.facets(), select: (d) => d.facets });
  const posts = useQuery({ queryKey: ['blogs', 'home'], queryFn: () => api.blogs({ limit: 3 }) });
  const hasUpdates = useLiveUpdates().data?.length > 0;

  const hero = banners.data?.find((b) => b.placement === 'hero');
  const promo = banners.data?.find((b) => b.placement === 'promo');
  const best = collections.data?.bestSellers || [];
  const featured = collections.data?.featured?.[0] || best[0];
  const ratingCount = best.reduce((s, p) => s + p.ratingCount, 0);
  const ratingAvg = ratingCount ? best.reduce((s, p) => s + p.ratingAverage * p.ratingCount, 0) / ratingCount : 0;

  return (
    <div className="flex flex-col w-full">
      <Seo jsonLd={[organizationLd(config), websiteLd(), ...(best.length ? [itemListLd(best)] : [])]} />
      {/* Trust micro-bar */}
      <section className="w-full bg-surface-container-high py-2">
        <div className="container-x flex flex-wrap items-center justify-between gap-2 text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-space-sm">
            <span className="flex h-2 w-2 rounded-full bg-secondary" />
            <span className="uppercase tracking-wider text-on-surface">Global Architecture Drop 04</span>
            <span className="hidden sm:inline text-outline">•</span>
            <span className="hidden sm:inline font-normal">Certified B-Corp craftsmanship & carbon-neutral dispatch</span>
          </div>
          <Link to="/offers" className="hover:text-secondary underline underline-offset-4">Explore launch offers</Link>
        </div>
      </section>

      {/* Hero */}
      <section className="relative w-full bg-surface overflow-hidden py-space-xl lg:py-24">
        <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-center">
          <div className="lg:col-span-6 flex flex-col justify-center gap-space-lg z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-secondary w-fit shadow-sm">
              <Icon name="flight_takeoff" className="text-[18px]" />
              <span className="text-label-sm uppercase tracking-wider">{hero?.eyebrow || 'Engineered For Fluid Transit'}</span>
            </div>
            <div className="flex flex-col gap-space-sm">
              <h1 className="text-display-hero-mobile md:text-display-hero uppercase">
                Carry Your <br />
                <span className="text-secondary">World.</span>
              </h1>
              <p className="text-body-xl text-on-surface-variant max-w-xl">
                {hero?.subtitle ||
                  'Architectural utility reimagined with recycled ballistic nylon, vegetable-tanned Italian leather and modular magnetic mechanics.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-space-md pt-2">
              <Link to={hero?.ctaLink || '/shop'} className="btn-primary h-12 px-space-xl">
                {hero?.ctaLabel || 'Shop Collection'} <Icon name="arrow_forward" className="text-[18px]" />
              </Link>
              <Link to="/shop?bestseller=true&sort=bestseller" className="btn-tonal h-12">
                Explore Best Sellers <Icon name="north_east" className="text-[18px]" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-space-sm pt-space-md">
              <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-card flex flex-col gap-1">
                <div className="flex items-center gap-1 text-on-tertiary-container">
                  <Icon name="star" fill className="text-[16px]" />
                  <span className="text-label-md text-on-surface">{ratingAvg ? `${ratingAvg.toFixed(1)} / 5` : '—'}</span>
                </div>
                <span className="text-label-sm font-normal text-on-surface-variant">{ratingCount ? `${ratingCount}+ verified reviews` : 'Verified reviews'}</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-card flex flex-col gap-1">
                <div className="flex items-center gap-1 text-secondary">
                  <Icon name="eco" className="text-[16px]" />
                  <span className="text-label-md text-on-surface">100% Carbon</span>
                </div>
                <span className="text-label-sm font-normal text-on-surface-variant">Neutral shipping</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-card flex flex-col gap-1">
                <div className="flex items-center gap-1 text-secondary">
                  <Icon name="handyman" className="text-[16px]" />
                  <span className="text-label-md text-on-surface">Lifetime</span>
                </div>
                <span className="text-label-sm font-normal text-on-surface-variant">Warranty & free repair</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="relative w-full h-[420px] sm:h-[540px] rounded-2xl overflow-hidden shadow-lift bg-surface-container">
              <Img src={hero?.image?.url || '/uploads/seed/hero-traveler.jpg'} w={640} fetchPriority="high" alt="Executive traveller with a WILDTANE leather duffle in an airport terminal" className="absolute inset-0" loading="eager" />
              {featured && (
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 p-space-md rounded-xl bg-surface-container-lowest/90 backdrop-blur-md shadow-lift flex items-center justify-between gap-3">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center">
                      <Icon name="luggage" className="text-[20px]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-label-sm uppercase tracking-wider text-secondary">Featured Field Gear</span>
                      <span className="text-label-lg sm:text-headline-sm truncate">{featured.name}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => dispatch(openQuickView(featured.slug))} className="shrink-0 px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md hover:bg-secondary transition-colors">
                    Quick View
                  </button>
                </div>
              )}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3 py-1.5 rounded-full bg-ink/80 backdrop-blur text-on-ink text-label-sm flex items-center gap-1 shadow-md">
                <Icon name="airline_seat_recline_extra" className="text-[14px] text-secondary-fixed" /> IATA Overhead Compliant
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category bento */}
      <section className="w-full py-space-xl bg-surface-container-low">
        <div className="container-x">
          <SectionHead eyebrow="Catalogue Index" title="Find Your Everyday Essential.">
            <p className="text-body-md text-on-surface-variant max-w-md">Structured geometries calibrated to protect digital instruments, garments and personal artifacts across borders.</p>
          </SectionHead>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            {[
              { span: 'md:col-span-7 h-[320px] md:h-[380px]', to: '/shop/handbags', img: 'cat-handbag-teal', eyebrow: 'Signature Series', title: 'Architectural Handbags', text: 'Sculptural silhouettes tailored in pebble-grain calfskin with brushed brass hardware.' },
              { span: 'md:col-span-5 h-[320px] md:h-[380px]', to: '/shop/backpacks', img: 'apex-navy', eyebrow: 'Daily Utility', title: 'Laptop & Work Packs', text: 'Suspended 16" device sleeves with weatherproof AquaGuard zippers.' },
              { span: 'md:col-span-4 h-[300px] md:h-[320px]', to: '/shop/duffle-bags', img: 'duffle-tan', eyebrow: 'Long Haul', title: 'Weekend Duffles', small: true },
            ].map((c) => (
              <Link key={c.title} to={c.to} className={cn('group relative rounded-2xl overflow-hidden shadow-card flex flex-col justify-end p-space-lg', c.span)}>
                <Img src={`/uploads/seed/${c.img}.jpg`} alt="" className="absolute inset-0" imgClassName="transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                <div className="relative z-10 flex items-end justify-between gap-4 text-white">
                  <div className="flex flex-col">
                    <span className="text-label-sm uppercase tracking-wider text-secondary-container">{c.eyebrow}</span>
                    <h3 className={c.small ? 'text-headline-md' : 'text-headline-lg'}>{c.title}</h3>
                    {c.text && <p className="text-body-sm text-white/80 max-w-sm mt-1">{c.text}</p>}
                  </div>
                  <span className="w-12 h-12 shrink-0 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center shadow-md group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                    <Icon name="arrow_forward" className="text-[20px]" />
                  </span>
                </div>
              </Link>
            ))}
            <Link to="/shop/wallets" className="group md:col-span-4 h-[300px] md:h-[320px] rounded-2xl bg-surface-container-lowest shadow-card flex flex-col justify-between p-space-lg">
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-1 rounded bg-surface-container text-label-sm uppercase text-secondary">RFID Shielded</span>
                <Icon name="account_balance_wallet" className="text-outline text-[28px]" />
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-label-sm text-outline uppercase tracking-wider">Modular EDC</span>
                  <h4 className="text-headline-md">Wallets & Clutches</h4>
                  <p className="text-body-sm text-on-surface-variant mt-1">Slim aerograde aluminium and magnetic bi-folds.</p>
                </div>
                <span className="w-10 h-10 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all">
                  <Icon name="arrow_forward" className="text-[18px]" />
                </span>
              </div>
            </Link>
            <Link to="/corporate" className="group md:col-span-4 h-[300px] md:h-[320px] rounded-2xl bg-ink text-on-ink flex flex-col justify-between p-space-lg shadow-card">
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-1 rounded bg-white/10 text-label-sm uppercase text-secondary-fixed">Ultra-Mobility</span>
                <Icon name="work" className="text-secondary-fixed text-[28px]" />
              </div>
              <div className="flex flex-col gap-2">
                <h4 className="text-headline-md">Slings & Corporate Cases</h4>
                <p className="text-body-sm text-on-ink/75">Streamlined cross-body utility and bespoke corporate volume suites.</p>
                <span className="pt-2 flex items-center gap-space-sm text-secondary-fixed text-label-md group-hover:gap-3 transition-all">
                  View B2B specifications <Icon name="arrow_right_alt" className="text-[16px]" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Best sellers */}
      <section className="w-full py-space-xl bg-surface" id="best-sellers">
        <div className="container-x relative">
          <SectionHead eyebrow="Verified Standards" title="Curated Best Sellers." />
          <Carousel products={best} loading={collections.isLoading} />
        </div>
      </section>

      {/* Built for the journey */}
      <section className="w-full py-space-xl lg:py-20 bg-ink text-on-ink relative overflow-hidden">
        <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-center">
          <div className="lg:col-span-6 relative rounded-2xl overflow-hidden shadow-2xl h-[340px] sm:h-[460px]">
            <Img w={640} src="/uploads/seed/terminal-traveler.jpg" alt="Traveller walking through an airport gate with WILDTANE luggage" className="absolute inset-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
              <span className="p-2 rounded-lg bg-secondary text-on-secondary"><Icon name="verified_user" /></span>
              <div className="flex flex-col">
                <span className="text-headline-sm">Tested on 140+ Airlines</span>
                <span className="text-label-sm font-normal text-on-ink/70">Compliant with FAA, EASA and IATA carry-on envelopes</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 flex flex-col gap-space-md">
            <div className="flex flex-col gap-1">
              <span className="text-label-sm uppercase tracking-wider text-secondary-fixed font-bold">Field Engineering Standards</span>
              <h2 className="text-headline-xl-mobile md:text-headline-xl">Built for the Journey.</h2>
              <p className="text-body-md text-on-ink/70 mt-1">Every detail is stress-tested in aeronautical labs and extreme humidity chambers to survive a million transit miles without seam fatigue.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-2">
              {SPECS.map((s) => (
                <div key={s.title} className="p-space-md rounded-xl bg-white/5 backdrop-blur border border-white/5 flex flex-col gap-2 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-secondary text-on-secondary flex items-center justify-center"><Icon name={s.icon} className="text-[20px]" /></div>
                  <h4 className="text-headline-sm">{s.title}</h4>
                  <p className="text-body-sm text-on-ink/70">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Shop by purpose */}
      <section className="w-full py-space-xl bg-surface-container-low">
        <div className="container-x">
          <div className="flex flex-col gap-1 mb-space-lg text-center items-center">
            <span className="eyebrow">Curated Use-Cases</span>
            <h2 className="text-headline-xl-mobile md:text-headline-xl">Engineered by Purpose.</h2>
            <p className="text-body-md text-on-surface-variant max-w-xl">Select your operational mode to find the right balance of volume, quick access and executive presentation.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-space-md">
            {PURPOSES.map((p, i) => (
              <Link
                key={p.key}
                to={`/shop?purpose=${p.key}`}
                className={cn('group flex flex-col p-space-lg rounded-2xl bg-surface-container-lowest hover:bg-primary hover:text-on-primary shadow-card hover:shadow-lift hover:-translate-y-1 transition-all duration-300', i === 4 && 'col-span-2 md:col-span-1')}
              >
                <Icon name={p.icon} className="text-[32px] text-secondary group-hover:text-secondary-fixed-dim transition-colors" />
                <span className="text-headline-sm mt-4">{p.title}</span>
                <span className="text-body-sm text-on-surface-variant group-hover:text-on-primary/70 mt-1">{p.text}</span>
                <span className="mt-4 flex items-center gap-1 text-label-sm text-secondary group-hover:text-secondary-fixed-dim">
                  {facets.data ? `Explore ${String(facets.data.purposes?.[p.key] || 0).padStart(2, '0')} models` : 'Explore models'}
                  <Icon name="arrow_forward" className="text-[14px]" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {promo && <PromoBanner banner={promo} />}

      {/* New arrivals */}
      <section className="w-full py-space-xl bg-surface">
        <div className="container-x">
          <SectionHead eyebrow="Fresh Off The Bench" title="New Arrivals.">
            <Link to="/shop?newArrival=true&sort=newest" className="text-label-lg text-secondary flex items-center gap-1 hover:gap-2 transition-all">
              View all <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </SectionHead>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-gutter-sm md:gap-gutter">
            {collections.isLoading
              ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
              : (collections.data?.newArrivals || []).slice(0, 4).map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      </section>

      <RecentlyViewed />

      {/* Sustainability manifesto */}
      <section className="w-full py-space-xl bg-surface-container-low">
        <div className="container-x">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-space-lg">
            <div className="flex flex-col gap-1">
              <span className="eyebrow">Circular Lifecycle</span>
              <h2 className="text-headline-xl-mobile md:text-headline-xl">Built for Decades, Not Seasons.</h2>
            </div>
            <Link to="/sustainability" className="inline-flex items-center gap-2 px-3 py-1 rounded bg-secondary-container text-on-secondary-fixed text-label-sm w-fit">
              <Icon name="all_inclusive" className="text-[16px]" /> Zero Landfill Mandate
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {PILLARS.map((p) => (
              <div key={p.title} className="p-space-lg rounded-2xl bg-surface-container-lowest shadow-card flex flex-col justify-between h-full">
                <div className="flex flex-col gap-2">
                  <Icon name={p.icon} className="text-secondary text-[32px]" />
                  <h4 className="text-headline-sm">{p.title}</h4>
                  <p className="text-body-sm text-on-surface-variant">{p.text}</p>
                </div>
                <span className="text-label-sm text-outline pt-4">{p.foot}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journal */}
      <section className="w-full py-space-xl bg-surface">
        <div className="container-x">
          <SectionHead eyebrow="The Journal" title="Field Notes & Guides.">
            <Link to="/blog" className="text-label-lg text-secondary flex items-center gap-1 hover:gap-2 transition-all">
              Read the journal <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </SectionHead>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {hasUpdates && <LiveFeed compact className="md:order-last" />}
            {posts.isLoading
              ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-80" />)
              : posts.data?.items?.slice(0, hasUpdates ? 2 : 3).map((post) => (
                  <Link key={post._id} to={`/blog/${post.slug}`} className="group card overflow-hidden flex flex-col hover:shadow-lift transition-shadow">
                    <Img src={post.coverImage?.url} alt="" className="aspect-[16/10]" imgClassName="group-hover:scale-105 transition-transform duration-500" />
                    <div className="p-space-lg flex flex-col gap-2">
                      <span className="eyebrow">{post.category} · {post.readingMinutes} min read</span>
                      <h3 className="text-headline-sm group-hover:text-secondary transition-colors">{post.title}</h3>
                      <p className="text-body-sm text-on-surface-variant line-clamp-2">{post.excerpt}</p>
                      <span className="text-label-sm font-normal text-outline">{formatDate(post.publishedAt)}</span>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}
