import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn, imgUrl, initials, timeAgo } from '../lib/format';
import { useCategories, useConfig, useMoney, useUser } from '../hooks/useStore';
import { prefersReducedMotion } from '../theme/engine';
import { Button, Field, Icon, Img, Input, Modal, Skeleton, StarInput, Stars, Textarea } from '../components/ui';
import { ProductCard, ProductCardSkeleton } from '../components/product';
import BrandValues from '../components/BrandValues';
import { AVATAR_GRADIENTS, SEED_CUSTOMER_REVIEWS, WriteReviewModal } from '../components/CustomerReviews';
import MobileFlipkartHome from '../components/mobile/MobileFlipkartHome';
import Seo, { organizationLd, websiteLd } from '../components/Seo';
import Shop from './Shop';

const RING_TONES = ['from-sky-500 to-cyan-400', 'from-emerald-500 to-teal-400', 'from-indigo-500 to-sky-400', 'from-pink-500 to-rose-400', 'from-violet-500 to-indigo-400', 'from-teal-500 to-emerald-400'];

/**
 * Flipkart-style category strip at the top of the home page: round pictures of the busiest
 * categories, scrolling sideways on phones. Starts with Offers and New arrivals.
 */
function CategoryStrip() {
  const { data: tree } = useCategories();
  const cats = (tree || [])
    .flatMap((c) => c.children)
    .filter((c) => c.image?.url && c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 10);

  const tile = 'group shrink-0 flex flex-col items-center gap-1.5 snap-start text-center w-[72px] sm:w-[80px] md:w-[86px] select-none';
  const ring = 'p-[2.5px] rounded-full bg-gradient-to-tr shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105 active:scale-95 ring-1 ring-black/5 dark:ring-white/10';
  const circle = 'w-[58px] h-[58px] sm:w-[66px] sm:h-[66px] md:w-[72px] md:h-[72px] rounded-full overflow-hidden ring-2 ring-surface bg-surface-container-low flex items-center justify-center';
  const label = 'text-[11px] sm:text-[12px] md:text-[12.5px] font-bold leading-tight tracking-tight text-on-surface/90 group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-1 transition-colors';

  return (
    <nav aria-label="Shop by category" className="bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container-high/80 shadow-xs relative z-20">
      <div className="container-x">
        <ul className="py-3 sm:py-4 flex items-center flex-nowrap gap-2.5 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory touch-pan-x">
          {[
            ['/offers', 'sell', 'Offers', 'from-rose-600 via-pink-600 to-amber-500'],
            ['/shop?newArrival=true&sort=newest', 'new_releases', 'New In', 'from-violet-600 via-purple-600 to-indigo-500'],
          ].map(([to, icon, text, colour]) => (
            <li key={to} className="shrink-0 snap-start">
              <Link to={to} className={tile}>
                <span className={cn(ring, colour)}>
                  <span className={cn(circle, 'flex items-center justify-center text-white bg-gradient-to-tr shadow-inner', colour)}>
                    <Icon name={icon} className="text-[26px] md:text-[30px]" />
                  </span>
                </span>
                <span className={label}>{text}</span>
              </Link>
            </li>
          ))}
          {cats.length
            ? cats.map((c, i) => (
                <li key={c._id} className="shrink-0 snap-start">
                  <Link to={`/shop/${c.slug}`} className={tile}>
                    <span className={cn(ring, RING_TONES[i % RING_TONES.length])}>
                      <Img src={c.image.url} alt="" w={160} className={circle} imgClassName="transition-transform duration-500 group-hover:scale-110 object-cover" />
                    </span>
                    <span className={label}>{c.name}</span>
                  </Link>
                </li>
              ))
            : Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="shrink-0 snap-start">
                  <div className={tile}>
                    <Skeleton className="w-[58px] h-[58px] sm:w-[66px] sm:h-[66px] md:w-[72px] md:h-[72px] rounded-full" />
                    <Skeleton className="h-3 w-12 rounded mt-1" />
                  </div>
                </li>
              ))}
        </ul>
      </div>
    </nav>
  );
}

function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-indigo-600/15 border-b border-surface-container-high py-10 md:py-16">
      {/* Soft Glowing Ambient Orbs */}
      <div aria-hidden="true" className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute top-1/2 -right-16 w-80 h-80 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />
      <div aria-hidden="true" className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

      <div className="relative container-x grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center">
        {/* Content Column */}
        <div className="flex flex-col gap-5 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 self-center lg:self-start px-4 py-1.5 rounded-full bg-surface/85 backdrop-blur-md ring-1 ring-secondary/35 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[12px] font-bold uppercase tracking-wider text-secondary">
              Architectural Carry • Handcrafted in India
            </span>
          </div>

          <h2 className="font-display text-[36px] sm:text-[46px] md:text-[56px] leading-[1.08] tracking-tight text-on-surface">
            Carry Your World in{' '}
            <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">
              Color & Craft.
            </span>
          </h2>

          <p className="text-[14.5px] md:text-[16.5px] leading-relaxed text-on-surface-variant max-w-xl mx-auto lg:mx-0">
            Engineered for daily hustle, airport security, and life on the go. Heavy-duty ballistic nylon, vegetable-tanned leather, and intuitive compartments.
          </p>

          {/* 4 Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/25 flex flex-col items-center lg:items-start gap-1">
              <span className="text-[19px] md:text-[22px] font-extrabold text-amber-700 dark:text-amber-300">50,000+</span>
              <span className="text-[11.5px] font-semibold text-on-surface-variant">Journeys Made</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25 flex flex-col items-center lg:items-start gap-1">
              <span className="text-[19px] md:text-[22px] font-extrabold text-emerald-700 dark:text-emerald-300">4.6★</span>
              <span className="text-[11.5px] font-semibold text-on-surface-variant">30+ Reviews</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/25 flex flex-col items-center lg:items-start gap-1">
              <span className="text-[19px] md:text-[22px] font-extrabold text-sky-700 dark:text-sky-300">100%</span>
              <span className="text-[11.5px] font-semibold text-on-surface-variant">Recycled Linings</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/25 flex flex-col items-center lg:items-start gap-1">
              <span className="text-[19px] md:text-[22px] font-extrabold text-rose-700 dark:text-rose-300">7-Day</span>
              <span className="text-[11.5px] font-semibold text-on-surface-variant">Home Trial</span>
            </div>
          </div>

          {/* Quick Department Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2.5">
            <Link to="/men" className="btn bg-gradient-to-r from-blue-700 to-indigo-600 text-white font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all text-[13.5px]">
              <Icon name="man" className="text-[18px]" /> Shop Men
            </Link>
            <Link to="/women" className="btn bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all text-[13.5px]">
              <Icon name="woman" className="text-[18px]" /> Shop Women
            </Link>
            <Link to="/universal" className="btn bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all text-[13.5px]">
              <Icon name="public" className="text-[18px]" /> Universal
            </Link>
            <Link to="/shop/travel-utility" className="btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all text-[13.5px]">
              <Icon name="flight_takeoff" className="text-[18px]" /> Travel & Utility
            </Link>
            <Link to="/shop/accessories" className="btn bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all text-[13.5px]">
              <Icon name="watch" className="text-[18px]" /> Accessories
            </Link>
            <Link to="/shop" className="btn bg-surface/90 backdrop-blur-md ring-1 ring-surface-container-high text-on-surface hover:bg-surface-container transition-all text-[13.5px]">
              Explore All <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </div>

        {/* Visual Preview Column */}
        <div className="relative hidden lg:flex justify-end items-center">
          <div className="relative w-full max-w-sm aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/20 dark:ring-white/10 group">
            <Img
              src="/uploads/seed/terminal-traveler.jpg"
              alt="WILDTANE commuter carrying backpack through airport terminal"
              w={640}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Field Tested</span>
              <p className="text-[13.5px] font-semibold leading-snug">Slips smoothly under seats on 140+ international airlines.</p>
            </div>
          </div>

          {/* Floating Pill */}
          <div className="absolute -bottom-3 -left-4 px-3.5 py-2 rounded-2xl bg-surface/95 backdrop-blur-md ring-1 ring-surface-container-high shadow-lift flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[13px]">
              ★
            </span>
            <div className="flex flex-col">
              <span className="text-[12px] font-extrabold text-on-surface">4.6 / 5.0 Rating</span>
              <span className="text-[10.5px] text-on-surface-variant">Verified Buyer Feedback</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** MEN | WOMEN | UNIVERSAL | TRAVEL & UTILITY | ACCESSORIES: 5 curated department showcases. */
function GenderSplit() {
  const primaryCards = [
    {
      to: '/men',
      label: 'Men',
      eyebrow: 'MASCULINE CRAFT',
      text: 'Briefcases, laptop bags, wallets & weekenders',
      image: '/uploads/seed/duffle-tan.jpg',
      wash: 'from-slate-950 via-sky-950/85 to-amber-950/60',
      pill: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30',
      buttonHover: 'hover:bg-amber-500 hover:text-black',
      tag: '1680D Ballistic Tech',
    },
    {
      to: '/women',
      label: 'Women',
      eyebrow: 'SCULPTURAL LUXURY',
      text: 'Handbags, work totes, crossbody & clutches',
      image: '/uploads/seed/tote-teal.jpg',
      wash: 'from-zinc-950 via-rose-950/85 to-purple-950/60',
      pill: 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30',
      buttonHover: 'hover:bg-rose-500 hover:text-white',
      tag: 'Featherlight Balance',
    },
    {
      to: '/universal',
      label: 'Universal',
      eyebrow: 'UNIVERSAL ERGONOMIC',
      text: 'Backpacks, daily carry & travel gear for everyone',
      image: '/uploads/seed/apex-navy.jpg',
      wash: 'from-zinc-950 via-emerald-950/85 to-teal-950/60',
      pill: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30',
      buttonHover: 'hover:bg-emerald-500 hover:text-white',
      tag: '180° Clamshell TSA',
    },
  ];

  const featureCards = [
    {
      to: '/shop/travel-utility',
      label: 'Travel & Utility',
      eyebrow: 'TRANSIT ENGINEERING',
      text: 'Cabin spinners, check-in trolleys, heavy-duty duffles & toiletry wash kits',
      image: '/uploads/seed/cabin-hardshell.jpg',
      wash: 'from-slate-950 via-cyan-950/85 to-blue-950/60',
      pill: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30',
      buttonHover: 'hover:bg-cyan-500 hover:text-black',
      tag: 'Polycarbonate & Hinomoto',
    },
    {
      to: '/shop/accessories',
      label: 'Accessories',
      eyebrow: 'MICRO-ORGANIZATION',
      text: 'Full-grain leather wallets, RFID cardholders, passport sleeves & cable folios',
      image: '/uploads/seed/wallet-onyx.jpg',
      wash: 'from-stone-950 via-amber-950/85 to-orange-950/60',
      pill: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30',
      buttonHover: 'hover:bg-amber-500 hover:text-black',
      tag: 'RFID Armor & Patina',
    },
  ];

  return (
    <section className="container-x pt-6 md:pt-10" aria-label="Shop by department">
      <div className="flex flex-col items-center text-center gap-1.5 mb-5 md:mb-7">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-secondary">
          Curated Departments
        </span>
        <h2 className="font-display text-[26px] md:text-[34px] leading-tight">
          Find The Carry Designed For Your Routine
        </h2>
      </div>

      {/* Row 1: Men, Women, Universal (3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
        {primaryCards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative overflow-hidden rounded-3xl flex items-end shadow-md hover:shadow-2xl transition-all duration-500 border border-white/10 hover:-translate-y-1 aspect-[4/5]"
          >
            <Img
              src={c.image}
              alt=""
              w={640}
              className="!absolute inset-0 !bg-transparent"
              imgClassName="opacity-90 transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <div aria-hidden="true" className={cn('absolute inset-0 bg-gradient-to-t to-transparent', c.wash)} />

            {/* Top pill badge */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <span className={cn('text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md', c.pill)}>
                {c.eyebrow}
              </span>
              <span className="text-[10px] font-bold text-white/80 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md">
                {c.tag}
              </span>
            </div>

            {/* Bottom info */}
            <div className="relative p-5 md:p-6 flex flex-col gap-1.5 text-white w-full">
              <h3 className="font-display text-[30px] md:text-[38px] leading-none tracking-wide drop-shadow">
                {c.label}
              </h3>
              <p className="text-[13px] md:text-[13.5px] text-white/85 line-clamp-2">
                {c.text}
              </p>
              <span className={cn('mt-2 inline-flex items-center gap-1.5 self-start h-9 px-4 rounded-full bg-white text-neutral-900 text-[12.5px] font-bold shadow-md transition-all group-hover:shadow-lg', c.buttonHover)}>
                Explore {c.label} <Icon name="arrow_forward" className="text-[15px] transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Row 2: Travel & Utility and Accessories (Panoramic Modern Design) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {featureCards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative overflow-hidden rounded-3xl flex items-end shadow-md hover:shadow-2xl transition-all duration-500 border border-white/10 hover:-translate-y-1 aspect-[16/9] md:aspect-[21/9]"
          >
            <Img
              src={c.image}
              alt=""
              w={960}
              className="!absolute inset-0 !bg-transparent"
              imgClassName="opacity-90 transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div aria-hidden="true" className={cn('absolute inset-0 bg-gradient-to-t to-transparent', c.wash)} />

            {/* Top pill badge */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <span className={cn('text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md', c.pill)}>
                {c.eyebrow}
              </span>
              <span className="text-[10px] font-bold text-white/80 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md">
                {c.tag}
              </span>
            </div>

            {/* Bottom info */}
            <div className="relative p-5 md:p-7 flex flex-col gap-1.5 text-white w-full">
              <h3 className="font-display text-[28px] md:text-[36px] leading-none tracking-wide drop-shadow">
                {c.label}
              </h3>
              <p className="text-[13px] md:text-[14px] text-white/85 line-clamp-2 max-w-lg">
                {c.text}
              </p>
              <span className={cn('mt-2 inline-flex items-center gap-1.5 self-start h-9 px-4 rounded-full bg-white text-neutral-900 text-[12.5px] font-bold shadow-md transition-all group-hover:shadow-lg', c.buttonHover)}>
                Explore {c.label} <Icon name="arrow_forward" className="text-[15px] transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Colour schemes for the product rails: a soft tinted band, a gradient label pill and underline.
const RAIL_TONES = {
  indigo: { band: 'from-indigo-500/[0.07] via-sky-500/[0.05]', pill: 'from-indigo-600 to-sky-500', link: 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10' },
  fuchsia: { band: 'from-fuchsia-500/[0.07] via-violet-500/[0.05]', pill: 'from-fuchsia-600 to-violet-500', link: 'text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-500/10' },
  rose: { band: 'from-rose-500/[0.07] via-pink-500/[0.05]', pill: 'from-rose-600 to-pink-500', link: 'text-rose-700 dark:text-rose-300 hover:bg-rose-500/10' },
  cyan: { band: 'from-cyan-500/[0.07] via-blue-500/[0.05]', pill: 'from-cyan-600 to-blue-500', link: 'text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10' },
  amber: { band: 'from-amber-500/[0.07] via-orange-500/[0.05]', pill: 'from-amber-600 to-orange-500', link: 'text-amber-700 dark:text-amber-300 hover:bg-amber-500/10' },
};

function SectionHead({ eyebrow, icon, title, link, linkLabel = 'View all', tone = RAIL_TONES.indigo }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3 md:mb-4">
      <div className="flex flex-col items-start gap-1.5">
        {eyebrow && (
          <span className={cn('inline-flex items-center gap-1 h-6 pl-1.5 pr-2.5 rounded-full bg-gradient-to-r text-white text-[11px] font-bold uppercase tracking-wider shadow-sm', tone.pill)}>
            {icon && <Icon name={icon} fill className="text-[14px]" />} {eyebrow}
          </span>
        )}
        <h2 className="relative font-display text-[22px] md:text-[30px] leading-tight pb-1.5">
          {title}
          <span aria-hidden="true" className={cn('absolute left-0 bottom-0 h-[3px] w-12 rounded-full bg-gradient-to-r', tone.pill)} />
        </h2>
      </div>
      {link && (
        <Link to={link} className={cn('shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[13px] font-semibold transition-colors', tone.link)}>
          {linkLabel} <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      )}
    </div>
  );
}

/** A row of product cards on its own softly tinted band: swipe on phones, four across on desktop. */
function ProductRail({ eyebrow, icon, title, link, products, loading, tone = 'indigo' }) {
  if (!loading && !products?.length) return null;
  const t = RAIL_TONES[tone];
  return (
    <section className={cn('mt-6 md:mt-10 py-4 md:py-6 bg-gradient-to-br to-transparent', t.band)} aria-label={title}>
      <div className="container-x">
      <SectionHead eyebrow={eyebrow} icon={icon} title={title} link={link} tone={t} />
      <div className="grid grid-flow-col auto-cols-[75%] sm:auto-cols-[45%] md:auto-cols-[32%] lg:auto-cols-[calc(25%-18px)] gap-4 sm:gap-5 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 pb-2">
        {loading
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="snap-start"><ProductCardSkeleton /></div>)
          : products.map((p) => (
              <div key={p._id} className="snap-start">
                <ProductCard product={p} />
              </div>
            ))}
      </div>
      </div>
    </section>
  );
}

function Collections() {
  const { data, isLoading } = useQuery({ queryKey: ['collections'], queryFn: api.collections, staleTime: 5 * 60 * 1000 });
  const { data: travelData, isLoading: travelLoading } = useQuery({
    queryKey: ['products', 'home-travel-rail'],
    queryFn: () => api.products({ category: 'travel-utility', limit: 8 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: accessoriesData, isLoading: accessoriesLoading } = useQuery({
    queryKey: ['products', 'home-accessories-rail'],
    queryFn: () => api.products({ category: 'accessories', limit: 8 }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <ProductRail eyebrow="Handpicked" icon="diamond" tone="indigo" title="Featured products" link="/shop?featured=true" products={data?.featured} loading={isLoading} />
      <ProductRail eyebrow="Just landed" icon="rocket_launch" tone="fuchsia" title="New arrivals" link="/shop?newArrival=true&sort=newest" products={data?.newArrivals} loading={isLoading} />
      <ProductRail eyebrow="Customer favourites" icon="favorite" tone="rose" title="Best sellers" link="/shop?bestseller=true&sort=bestseller" products={data?.bestSellers} loading={isLoading} />
      <ProductRail eyebrow="Transit & Flight Ready" icon="flight_takeoff" tone="cyan" title="Travel & Utility" link="/shop/travel-utility" products={travelData?.items} loading={travelLoading} />
      <ProductRail eyebrow="Everyday Accents" icon="watch" tone="amber" title="Accessories" link="/shop/accessories" products={accessoriesData?.items} loading={accessoriesLoading} />
    </>
  );
}

const OFFER_INTERVAL_MS = 2000;

/** Coupon text for a public coupon: "15% off orders over ₹15,000". */
function couponLine(c, money) {
  const off = c.type === 'percentage' ? `${c.value}% off` : `${money(c.value)} off`;
  return c.minOrder ? `${off} orders over ${money(c.minOrder)}` : `${off} your order`;
}

/**
 * Builds up to 8 offers of different kinds from live store data: promo banners (Admin → Banners),
 * active coupons, the free-delivery threshold and the coins programme, plus built-in store
 * promises (new arrivals, cash on delivery, returns, corporate orders).
 */
function useOffers() {
  const money = useMoney();
  const { data: config } = useConfig();
  const { data: banners } = useQuery({ queryKey: ['banners'], queryFn: api.banners, select: (d) => d.banners });
  const { data: coupons } = useQuery({ queryKey: ['public-coupons'], queryFn: api.publicCoupons, select: (d) => d.coupons, staleTime: 5 * 60 * 1000 });

  const offers = [];
  const codes = new Set();
  (banners || []).filter((b) => b.placement === 'promo').forEach((b) => {
    if (b.couponCode) codes.add(b.couponCode.toUpperCase());
    offers.push({
      id: b._id,
      kind: b.couponCode ? 'code' : 'sale',
      eyebrow: b.eyebrow || 'Limited offer',
      title: b.title,
      text: b.subtitle,
      code: b.couponCode,
      cta: b.ctaLabel || 'Shop offers',
      to: b.ctaLink?.startsWith('/') ? b.ctaLink : '/offers',
      image: b.image?.url,
    });
  });
  (coupons || []).filter((c) => !codes.has(c.code)).slice(0, 2).forEach((c) => {
    offers.push({ id: c._id || c.code, kind: 'code', eyebrow: 'Coupon', title: couponLine(c, money), text: c.description, code: c.code, cta: 'Start shopping', to: '/shop' });
  });
  if (!offers.some((o) => o.kind === 'sale')) {
    offers.push({ id: 'sale', kind: 'sale', eyebrow: 'On sale now', title: 'Sale prices on selected styles', text: 'Bags, backpacks and travel gear at limited-time prices, while stock lasts.', cta: 'Shop the sale', to: '/offers' });
  }
  if (config?.freeShippingThreshold > 0) {
    offers.push({ id: 'ship', kind: 'shipping', eyebrow: 'Free delivery', title: `Free delivery over ${money(config.freeShippingThreshold)}`, text: 'Tracked to your door anywhere in India, with 7-day easy returns.', cta: 'Shop now', to: '/shop' });
  }
  if (config?.loyalty?.enabled) {
    offers.push({ id: 'coins', kind: 'coins', eyebrow: 'WILDTANE coins', title: `Earn ${config.loyalty.coinsPer100} coins on every ${money(100)}`, text: `Spend them on your next order: 1 coin = ${money(config.loyalty.rupeesPerCoin)}.`, cta: 'How coins work', to: '/account/coins' });
  }
  // Store promises, always shown: they keep the rotator full on a fresh store too.
  offers.push(
    { id: 'new', kind: 'new', eyebrow: 'Just landed', title: 'New arrivals every week', text: 'Fresh backpacks, totes and travel gear, straight from our latest drop.', cta: 'See what’s new', to: '/shop?newArrival=true&sort=newest' },
    { id: 'cod', kind: 'pay', eyebrow: 'Pay your way', title: 'Cash on delivery available', text: 'Pay by UPI, card or cash when your bag arrives.', cta: 'Shop now', to: '/shop' },
    { id: 'returns', kind: 'returns', eyebrow: 'Shop with confidence', title: '7-day easy returns', text: 'Not quite right? Return or replace it within 7 days of delivery.', cta: 'Return policy', to: '/return-policy' },
    { id: 'corporate', kind: 'corporate', eyebrow: 'For teams & events', title: 'Corporate & bulk orders', text: 'Branded bags for your team, clients and events, with bulk pricing.', cta: 'Get a quote', to: '/corporate' }
  );
  // One of each kind first, in an order where neighbouring slides look different, then the rest.
  const picked = ['code', 'shipping', 'sale', 'new', 'coins', 'pay', 'returns', 'corporate'].map((k) => offers.find((o) => o.kind === k)).filter(Boolean);
  return [...picked, ...offers.filter((o) => !picked.includes(o))].slice(0, 8);
}

// Each kind of offer has its own colour scheme: rich gradients, white text, and never yellow or gold.
const OFFER_TONES = {
  code: { bg: 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600', button: 'text-indigo-700', icon: 'sell' },
  sale: { bg: 'bg-gradient-to-br from-rose-700 via-rose-600 to-pink-600', button: 'text-rose-700', icon: 'percent' },
  shipping: { bg: 'bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600', button: 'text-emerald-700', icon: 'local_shipping' },
  new: { bg: 'bg-gradient-to-br from-fuchsia-700 via-purple-600 to-violet-600', button: 'text-purple-700', icon: 'new_releases' },
  coins: { bg: 'bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-600', button: 'text-sky-700', icon: 'toll' },
  pay: { bg: 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600', button: 'text-slate-800', icon: 'payments' },
  returns: { bg: 'bg-gradient-to-br from-teal-700 via-cyan-700 to-sky-600', button: 'text-teal-700', icon: 'assignment_return' },
  corporate: { bg: 'bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-600', button: 'text-blue-800', icon: 'corporate_fare' },
};

/** One offer, styled by kind: ticket (code), bold sale, delivery and coins. */
function OfferSlide({ offer, active }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
      toast.success(`Code ${offer.code} copied`);
    } catch {
      toast(`Use code ${offer.code} at checkout`);
    }
  };
  const tab = active ? 0 : -1;
  const tone = OFFER_TONES[offer.kind] || OFFER_TONES.sale;
  const icon = offer.icon || tone.icon;
  return (
    <div className={cn('relative h-full overflow-hidden rounded-3xl text-white', tone.bg)}>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_140%_at_100%_0%,rgb(255_255_255/0.18),transparent_65%)]" />
      {offer.image && <img src={imgUrl(offer.image, 960)} alt="" loading="lazy" className="absolute inset-y-0 right-0 w-1/2 h-full object-cover opacity-40 [mask-image:linear-gradient(to_right,transparent,black_60%)]" />}
      {/* Big watermark icon gives each kind its own silhouette, readable at a glance. */}
      <Icon name={icon} className="absolute -right-4 -bottom-8 md:right-6 md:-bottom-10 text-[150px] md:text-[220px] opacity-[0.09] pointer-events-none" />
      <div className="relative h-full p-6 md:p-12 flex flex-col md:flex-row md:items-center gap-5 md:gap-10">
        <div className="flex-1 flex flex-col gap-2.5 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-[12px] md:text-[13px] font-bold uppercase tracking-[0.2em] opacity-90">
            <span className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-inset ring-current"><Icon name={icon} className="text-[18px]" /></span>
            {offer.eyebrow}
          </span>
          <h2 className={cn('font-display leading-[1.05]', offer.kind === 'sale' ? 'text-[32px] md:text-[52px]' : 'text-[28px] md:text-[44px]')}>{offer.title}</h2>
          {offer.text && <p className="text-[15px] md:text-[17px] leading-relaxed opacity-85 line-clamp-2">{offer.text}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-stretch">
          {offer.code && (
            <button type="button" onClick={copy} tabIndex={tab} className="h-12 px-5 rounded-2xl border-2 border-dashed border-white/80 text-white text-[17px] font-bold tracking-[0.12em] inline-flex items-center justify-center gap-2 hover:bg-white/10 transition-colors" aria-label={`Copy code ${offer.code}`}>
              {offer.code} <Icon name="content_copy" className="text-[18px]" />
            </button>
          )}
          <Link to={offer.to} tabIndex={tab} className={cn('btn h-12 px-7 text-[15px] bg-white shadow-lg hover:bg-white/90', tone.button)}>
            {offer.cta} <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Offers rotator below the best sellers: up to 8 kinds of offer cross-fading every 2 seconds, pausing on hover or focus. */
function OfferRotator() {
  const offers = useOffers();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = offers.length;
  const current = count ? index % count : 0;

  useEffect(() => {
    if (paused || count < 2 || prefersReducedMotion()) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), OFFER_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [paused, count, current]);

  if (!count) return null;
  return (
    <section
      className="container-x pt-8 md:pt-12"
      aria-roledescription="carousel"
      aria-label="Current offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* All slides share one grid cell, so the band keeps the height of the tallest one. */}
      <div className="grid">
        {offers.map((o, i) => (
          <div
            key={o.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== current}
            inert={i !== current}
            className={cn('[grid-area:1/1] transition-[opacity,transform] duration-500 ease-out', i === current ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 pointer-events-none')}
          >
            <OfferSlide offer={o} active={i === current} />
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {offers.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show offer ${i + 1}: ${o.title}`}
              aria-current={i === current ? 'true' : undefined}
              className={cn('h-2 rounded-full transition-all', i === current ? 'w-6 bg-secondary' : 'w-2 bg-on-surface/15')}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/*SHOP_BY_CATEGORY*/

/** Help & contact band. */
function ContactBand() {
  const { data: config } = useConfig();
  // Colours that suit each card: friendly blue for help, business indigo for corporate, reassuring green for returns.
  const items = [
    ['support_agent', 'Talk to us', 'Questions about a bag or an order?', '/contact', 'Contact us', { card: 'bg-sky-500/10 ring-sky-500/30', icon: 'bg-sky-600', cta: 'text-sky-700 dark:text-sky-300' }],
    ['corporate_fare', 'Corporate & bulk', 'Branded bags for teams and events.', '/corporate', 'Get a quote', { card: 'bg-indigo-500/10 ring-indigo-500/30', icon: 'bg-indigo-600', cta: 'text-indigo-700 dark:text-indigo-300' }],
    ['assignment_return', 'Easy returns', 'Read how returns and replacements work.', '/return-policy', 'Return policy', { card: 'bg-emerald-500/10 ring-emerald-500/30', icon: 'bg-emerald-600', cta: 'text-emerald-700 dark:text-emerald-300' }],
  ];
  return (
    <section className="container-x pt-10 md:pt-16 pb-6" aria-label="Help and contact">
      <div className="grid md:grid-cols-3 gap-2.5 md:gap-4">
        {items.map(([icon, title, text, to, cta, tone]) => (
          <Link key={to} to={to} className={cn('group flex items-center gap-4 p-4 md:p-5 rounded-2xl ring-1 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300', tone.card)}>
            <span className={cn('w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110', tone.icon)}><Icon name={icon} className="text-[22px]" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold">{title}</span>
              <span className="block text-[12.5px] text-on-surface-variant">{text}</span>
              <span className={cn('mt-1 inline-flex items-center gap-1 text-[12px] font-semibold', tone.cta)}>{cta} <Icon name="arrow_forward" className="text-[14px] transition-transform group-hover:translate-x-0.5" /></span>
            </span>
          </Link>
        ))}
      </div>
      {(config?.supportEmail || config?.supportPhone) && (
        <p className={cn('mt-3 text-center text-[12px] text-on-surface-variant flex flex-wrap justify-center gap-x-4 gap-y-1')}>
          {config.supportEmail && <a href={`mailto:${config.supportEmail}`} className="inline-flex items-center gap-1 hover:text-secondary"><Icon name="mail" className="text-[15px]" /> {config.supportEmail}</a>}
          {config.supportPhone && <a href={`tel:${config.supportPhone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-secondary"><Icon name="call" className="text-[15px]" /> {config.supportPhone}</a>}
        </p>
      )}
    </section>
  );
}

/** Short, crawlable description of the store with links to every category (helps search engines). */
function About() {
  const { data: tree } = useCategories();
  return (
    <section className="container-x pb-10">
      <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-indigo-500/10 ring-1 ring-secondary/20 p-6 md:p-10 grid md:grid-cols-[1.3fr_1fr] gap-6 md:gap-12 items-center shadow-sm">
        <div className="flex flex-col gap-2.5">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold uppercase tracking-wider">
            <Icon name="verified" className="text-[13px]" /> Architectural Carry
          </div>
          <h2 className="font-display text-[24px] md:text-[32px] leading-tight text-on-surface">
            Bags, Backpacks & Travel Gear by{' '}
            <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">
              WILDTANE
            </span>
          </h2>
          <p className="text-[13.5px] leading-relaxed text-on-surface-variant">
            Shop laptop backpacks, structured leather handbags, totes, cabin luggage, duffles, and accessories for men, women, and everyone. Every order is tracked to your doorstep across India with 7-day returns, cash on delivery, and dedicated customer concierge support.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/about" className="inline-flex items-center gap-1 text-[12.5px] font-bold text-secondary hover:underline">
              Read Our Full Story <Icon name="arrow_forward" className="text-[14px]" />
            </Link>
          </div>
        </div>
        {tree?.length > 0 && (
          <nav aria-label="Shop by category" className="grid grid-cols-2 gap-2 content-start">
            {tree.flatMap((c) => [c, ...c.children]).slice(0, 12).map((c) => (
              <Link
                key={c._id}
                to={`/shop/${c.slug}`}
                className="px-3 py-2 rounded-xl bg-surface/80 ring-1 ring-surface-container-high hover:ring-secondary/40 text-[12.5px] font-medium text-on-surface hover:text-secondary truncate transition-all shadow-2xs"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}

/**
 * Editorial Spotlight & Field Notes:
 * A high-prestige alternative to customer reviews, combining press acclaim,
 * transit engineering standards, and curated packing guides from The Journal.
 */
function EditorialSpotlight() {
  const { data: blogsData, isLoading } = useQuery({
    queryKey: ['blogs', 'home-preview'],
    queryFn: () => api.blogs({ limit: 3 }),
    staleTime: 10 * 60 * 1000,
  });

  const posts = blogsData?.items?.slice(0, 3) || [
    {
      _id: 'default-1',
      title: 'The One-Bag Travel Method: Packing a Week Into 24 Litres',
      category: 'Travel Guides',
      readingMinutes: 4,
      slug: 'the-one-bag-travel-method-packing-a-week-into-24-litres',
      coverImage: { url: '/uploads/seed/apex-packing.jpg' },
      excerpt: 'How our design team fits a week of business travel into The Apex Commuter with room left over.',
    },
    {
      _id: 'default-2',
      title: 'Carry-On Rules in 2026: What Fits Overhead on Major Airlines',
      category: 'Transit Notes',
      readingMinutes: 5,
      slug: 'carry-on-rules-in-2026-what-fits-overhead-on-major-airlines',
      coverImage: { url: '/uploads/seed/cabin-hardshell.jpg' },
      excerpt: 'Dimensions and weight limits for major carriers worldwide, and how to glide through every gate.',
    },
    {
      _id: 'default-3',
      title: 'Caring for Vegetable-Tanned Leather in a Humid Climate',
      category: 'Care & Repair',
      readingMinutes: 3,
      slug: 'caring-for-vegetable-tanned-leather-in-a-humid-climate',
      coverImage: { url: '/uploads/seed/tote-teal.jpg' },
      excerpt: 'Monsoon-proof routines that keep calfskin supple and help it develop an authentic, rich patina.',
    },
  ];

  const press = [
    {
      pub: 'GQ',
      tagline: 'Annual Carry Awards',
      quote: 'The gold standard in architectural carry — utilitarian precision wrapped in pure minimalist luxury.',
      badge: 'Best Travel Pack',
      color: 'from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      pub: 'WIRED',
      tagline: 'Gear of the Year',
      quote: 'A triumph of transit ergonomics. Survived monsoons, sprint connections, and 100+ flights without a seam failing.',
      badge: 'Editor’s Choice',
      color: 'from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-400',
    },
    {
      pub: 'TRAVEL + LEISURE',
      tagline: 'Global Transit Edit',
      quote: 'Understated elegance with relentless utility. The clamshell layout turns airport security into a breeze.',
      badge: 'Carry-On Top Pick',
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ];

  const standards = [
    {
      icon: 'flight_takeoff',
      title: 'Tested on 140+ Airlines',
      desc: 'Engineered strictly to FAA, EASA, and IATA carry-on and personal item sizers worldwide.',
    },
    {
      icon: 'water_drop',
      title: 'All-Weather Protection',
      desc: '1000D ballistic weave paired with PU-sealed stormproof zippers to safeguard tech.',
    },
    {
      icon: 'health_and_safety',
      title: 'Zero Seam Fatigue',
      desc: 'Industrial bar-tack stitching and reinforced stress points cycle-tested to 50,000 loads.',
    },
    {
      icon: 'verified',
      title: '7-Day At-Home Trial',
      desc: 'Pack it, test it, and experience the ergonomics with doorstep returns across India.',
    },
  ];

  return (
    <section className="container-x pt-10 md:pt-16 pb-2" aria-labelledby="editorial-heading">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-secondary">
            <Icon name="auto_awesome" fill className="text-[14px]" /> Editorial Acclaim & Transit Standards
          </span>
          <h2 id="editorial-heading" className="font-display text-[26px] md:text-[34px] leading-tight">
            Crafted for the Journey
          </h2>
          <p className="text-[14px] text-on-surface-variant max-w-xl">
            From premier design awards to international terminals, explore the engineering, press recognition, and field notes shaping every piece.
          </p>
        </div>
        <Link
          to="/blog"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-surface-container-high bg-surface-container-lowest hover:border-secondary text-[13px] font-semibold transition-all hover:shadow-sm"
        >
          Explore The Journal <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      </div>

      {/* Press Accolades Carousel / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {press.map((item) => (
          <div
            key={item.pub}
            className="group relative p-5 md:p-6 rounded-2xl bg-surface-container-lowest ring-1 ring-surface-container-high hover:ring-secondary/40 hover:shadow-lift transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[20px] md:text-[22px] tracking-wider font-bold text-on-surface">
                  {item.pub}
                </span>
                <span className={cn('text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r', item.color)}>
                  {item.badge}
                </span>
              </div>
              <p className="text-[14px] md:text-[15px] italic leading-relaxed text-on-surface/90 font-serif">
                “{item.quote}”
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-container-high flex items-center justify-between text-[12px] text-on-surface-variant">
              <span>{item.tagline}</span>
              <Icon name="verified" className="text-[16px] text-secondary" />
            </div>
          </div>
        ))}
      </div>

      {/* Field Engineering Standards Band */}
      <div className="rounded-2xl bg-surface-container-low/60 border border-surface-container-high p-4 md:p-6 mb-8 md:mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {standards.map((std) => (
            <div key={std.title} className="flex flex-col gap-2">
              <span className="w-9 h-9 rounded-xl bg-surface-container-lowest ring-1 ring-surface-container-high flex items-center justify-center text-secondary shadow-sm">
                <Icon name={std.icon} className="text-[20px]" />
              </span>
              <h3 className="text-[14px] md:text-[15px] font-bold text-on-surface">{std.title}</h3>
              <p className="text-[12px] md:text-[12.5px] leading-relaxed text-on-surface-variant">{std.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The Journal: Field Notes Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <h3 className="font-display text-[18px] md:text-[22px]">Field Notes & Packing Guides</h3>
          </div>
          <Link to="/blog" className="text-[13px] font-semibold text-secondary hover:underline inline-flex items-center gap-1">
            All stories <Icon name="chevron_right" className="text-[16px]" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {isLoading
            ? Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-surface-container-lowest border border-surface-container-high p-3 flex flex-col gap-3">
                  <Skeleton className="w-full aspect-[16/10] rounded-xl" />
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-5 w-full rounded" />
                </div>
              ))
            : posts.map((post) => (
                <Link
                  key={post._id}
                  to={`/blog/${post.slug}`}
                  className="group rounded-2xl overflow-hidden bg-surface-container-lowest ring-1 ring-surface-container-high hover:ring-secondary/40 hover:shadow-lift transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-low">
                    {post.coverImage?.url ? (
                      <Img
                        src={post.coverImage.url}
                        alt=""
                        w={640}
                        className="w-full h-full object-cover"
                        imgClassName="transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                        <Icon name="article" className="text-[32px] opacity-40" />
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-[11px] font-semibold text-on-surface shadow-sm">
                      {post.category || 'Journal'}
                    </span>
                  </div>
                  <div className="p-4 md:p-5 flex flex-col flex-1 justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-medium text-on-surface-variant">
                        {post.readingMinutes ? `${post.readingMinutes} min read` : 'Read time 4 min'}
                      </span>
                      <h4 className="text-[15px] md:text-[16px] font-semibold leading-snug group-hover:text-secondary transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                      {post.excerpt && (
                        <p className="text-[12.5px] leading-relaxed text-on-surface-variant line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-secondary group-hover:translate-x-0.5 transition-transform">
                      Read field note <Icon name="arrow_forward" className="text-[14px]" />
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}



/**
 * Customer Reviews Carousel:
 * 15 verified buyer reviews ranging from 3.9 to 5.0 with an exact 4.6 average.
 * Includes user review submission option; approved reviews appear dynamically.
 */
function CustomerReviewsCarousel() {
  const [modalOpen, setModalOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  const { data: commentsData } = useQuery({
    queryKey: ['comments'],
    queryFn: () => api.comments(50),
    staleTime: 60 * 1000,
  });

  const reviews = commentsData?.comments?.length ? commentsData.comments : SEED_CUSTOMER_REVIEWS;
  const avgRating = commentsData?.average ? Number(commentsData.average).toFixed(1) : '4.6';
  const totalCount = commentsData?.count || reviews.length;

  const scroll = (direction) => {
    if (!trackRef.current) return;
    const card = trackRef.current.firstElementChild;
    const scrollAmount = card ? card.clientWidth + 16 : 340;
    trackRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  };

  useEffect(() => {
    if (paused || prefersReducedMotion()) return undefined;
    const interval = setInterval(() => {
      if (!trackRef.current) return;
      const maxScroll = trackRef.current.scrollWidth - trackRef.current.clientWidth;
      if (trackRef.current.scrollLeft >= maxScroll - 20) {
        trackRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const card = trackRef.current.firstElementChild;
        const scrollAmount = card ? card.clientWidth + 16 : 340;
        trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [paused]);

  const avatarGradients = [
    'from-indigo-600 to-violet-500',
    'from-sky-600 to-cyan-500',
    'from-emerald-600 to-teal-500',
    'from-rose-600 to-pink-500',
    'from-purple-600 to-fuchsia-500',
    'from-amber-600 to-orange-500',
  ];

  return (
    <section
      className="container-x pt-12 md:pt-16 pb-4"
      aria-label="Customer Reviews"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-secondary">
              <Icon name="verified" fill className="text-[14px]" /> Verified Customer Reviews
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[12px] font-bold">
              <Icon name="star" fill className="text-[14px] text-amber-500" />
              <span>{avgRating} / 5.0 Avg</span>
              <span className="text-on-surface-variant font-normal">({totalCount} reviews)</span>
            </span>
          </div>
          <h2 className="font-display text-[26px] md:text-[34px] leading-tight">
            Loved by Travelers & Daily Commuters
          </h2>
          <p className="text-[14px] text-on-surface-variant max-w-xl">
            Real feedback from verified buyers across India carrying WILDTANE across airports, boardrooms, and monsoons.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-end shrink-0">
          <Button
            type="button"
            variant="tonal"
            icon="rate_review"
            onClick={() => setModalOpen(true)}
            className="text-[13px] font-semibold"
          >
            Write a Review
          </Button>

          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous reviews"
              className="w-9 h-9 rounded-full ring-1 ring-surface-container-high bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-on-surface transition-all active:scale-95"
            >
              <Icon name="arrow_back" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Next reviews"
              className="w-9 h-9 rounded-full ring-1 ring-surface-container-high bg-surface-container-lowest hover:bg-surface-container flex items-center justify-center text-on-surface transition-all active:scale-95"
            >
              <Icon name="arrow_forward" className="text-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-3 px-3 md:mx-0 md:px-0"
        tabIndex={0}
        aria-label="Reviews slider"
      >
        {reviews.map((r, i) => (
          <div
            key={r._id || i}
            className="w-[84vw] sm:w-[360px] md:w-[380px] shrink-0 snap-start rounded-2xl bg-surface-container-lowest ring-1 ring-surface-container-high hover:ring-secondary/40 hover:shadow-lift transition-all duration-300 p-5 md:p-6 flex flex-col justify-between"
          >
            <div className="flex flex-col gap-3">
              {/* Rating + Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Stars value={r.rating} size={15} />
                  <span className="text-[13px] font-bold text-on-surface">
                    {Number(r.rating).toFixed(1)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  <Icon name="verified" className="text-[13px]" /> Verified Buyer
                </span>
              </div>

              {/* Review Text */}
              <p className="text-[13.5px] md:text-[14px] leading-relaxed text-on-surface/90 font-serif italic">
                “{r.message}”
              </p>
            </div>

            {/* Author Footer */}
            <div className="mt-5 pt-3.5 border-t border-surface-container-high flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    'w-8 h-8 rounded-full bg-gradient-to-tr text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm',
                    avatarGradients[i % avatarGradients.length]
                  )}
                >
                  {initials(r.name)}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-on-surface truncate">
                    {r.name}
                  </span>
                  <span className="text-[11.5px] text-on-surface-variant truncate">
                    {r.city ? `${r.city} · ` : ''}{timeAgo(r.createdAt)}
                  </span>
                </div>
              </div>
              <span className="text-secondary/70">
                <Icon name="format_quote" className="text-[20px]" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <WriteReviewModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

/**
 * Homepage: Men | Women → featured / new / best sellers → offers → all products (first page)
 * → why WILDTANE → editorial & field standards → customer reviews carousel → help & contact → store description.
 */
export default function Home() {
  const isMobile = useIsMobile();
  const { data: config } = useConfig();

  return (
    <>
      <Seo
        title="WILDTANE — Architectural Luxury Bags, Backpacks & Travel Gear"
        description="Discover WILDTANE luxury handcrafted bags, laptop backpacks, office briefcases, travel duffles, wallets & accessories in India. Express shipping & 7-day returns."
        canonical="/"
        jsonLd={[organizationLd(config), websiteLd()]}
      />
      <h1 className="sr-only">WILDTANE — Architectural Luxury Bags, Backpacks, Luggage & Travel Accessories</h1>

      {/* ── MOBILE VIEW: Dedicated Flipkart-style App Experience (Phones / Touch screens) ── */}
      {isMobile ? (
        <div className="w-full max-w-full overflow-x-clip">
          <MobileFlipkartHome />
        </div>
      ) : (
        /* ── DESKTOP & LAPTOP VIEW: Original Rich Editorial Storefront ── */
        <div>
          <CategoryStrip />
          <HomeHero />
          <GenderSplit />
          <Collections />
          <OfferRotator />
          <div className="pt-6 md:pt-10">
            <Shop preset="home" />
          </div>
          <BrandValues className="pt-4 md:pt-8" />
          <EditorialSpotlight />
          <CustomerReviewsCarousel />
          <ContactBand />
          <About />
        </div>
      )}
    </>
  );
}
