import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, initials, timeAgo } from '../lib/format';
import { Button, Icon, Img, Stars } from '../components/ui';
import { BrandLogoFull } from '../components/Brand';
import BrandValues from '../components/BrandValues';
import Seo, { breadcrumbLd, organizationLd } from '../components/Seo';
import { useConfig } from '../hooks/useStore';
import { AVATAR_GRADIENTS, WriteReviewModal } from '../components/CustomerReviews';

const TAGLINE = 'Crafted to carry, built to last.';

const STORY_PARAGRAPHS = [
  'WILDTANE was born out of a simple, shared frustration: bags that looked sleek in photos but fell apart after three rainy commutes, or rugged bags that survived anything but felt heavy, clumsy, and dull in business meetings.',
  'We believed modern travelers shouldn’t have to choose between luxury craftsmanship and daily durability. So every WILDTANE piece starts from human ergonomics—how your shoulders feel after five hours on your feet, how effortlessly a laptop slides out at airport security, and how resilient the fabric remains when caught in an Indian monsoon.',
  'From our workshop to your everyday routine, we select high-tensile 1680D ballistic weaves, vegetable-tanned full-grain leathers, Japanese YKK hardware, and 100% recycled ocean-plastic linings. Beautifully designed, engineered to carry, and backed by service you can trust.',
];

const COLORFUL_PILLARS = [
  {
    icon: 'architecture',
    title: 'Architectural Durability',
    badge: '1680D Ballistic Nylon',
    gradient: 'from-rose-500/15 via-orange-500/5 to-transparent',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-500 dark:text-rose-400',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    description: 'Reinforced bar-tack stress points, Japanese YKK smooth-glide zippers, and water-repellent weaves engineered to endure 25 kg loads day in and day out.',
  },
  {
    icon: 'nature_people',
    title: 'Conscious Sustainability',
    badge: '100% Recycled Linings',
    gradient: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    description: 'Inner linings made entirely from post-consumer recycled PET bottles. Ethically sourced vegetable-tanned leathers and zero single-use plastic packaging.',
  },
  {
    icon: 'flight_takeoff',
    title: 'Airport & Commute Ergonomics',
    badge: '180° TSA Clamshell',
    gradient: 'from-sky-500/15 via-indigo-500/5 to-transparent',
    border: 'border-sky-500/30',
    iconColor: 'text-sky-500 dark:text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    description: 'Suspended tech cradles keep 16” laptops safe from hard table drops. Hidden passport stash pockets and luggage pass-through handles make travel frictionless.',
  },
  {
    icon: 'verified_user',
    title: 'Unconditional Customer Care',
    badge: '7-Day Doorstep Trial',
    gradient: 'from-rose-500/15 via-pink-500/5 to-transparent',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-500 dark:text-rose-400',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    description: 'Experience your bag at home with a 7-day no-questions return window, tracked courier delivery across 24,000+ pincodes in India, and human concierge support.',
  },
];

const MILESTONES = [
  {
    number: '01',
    step: 'Conceived in Bengaluru',
    desc: 'Prototyped and tested on crowded metro coaches and monsoon downpours.',
    accent: 'text-rose-500',
    glow: 'bg-rose-500/10',
  },
  {
    number: '02',
    step: 'Made for Travel',
    desc: 'Cabin-friendly sizes, with dimensions listed on every product so you can check your airline.',
    accent: 'text-sky-500',
    glow: 'bg-sky-500/10',
  },
  {
    number: '03',
    step: 'Delivered Across India',
    desc: 'Tracked delivery to your door, with cash on delivery and 7-day returns.',
    accent: 'text-emerald-500',
    glow: 'bg-emerald-500/10',
  },
  {
    number: '04',
    step: 'Fair Direct Pricing',
    desc: 'Cutting out luxury distributor markups so you get premier materials at honest value.',
    accent: 'text-rose-500',
    glow: 'bg-rose-500/10',
  },
];

export default function About() {
  const { data: config } = useConfig();
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'About Us' }];

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [filterRating, setFilterRating] = useState('all'); // 'all' | '5' | '4.5' | '4'
  const [visibleCount, setVisibleCount] = useState(9);

  // Fetch approved comments / reviews from backend API
  const { data: commentsData } = useQuery({
    queryKey: ['comments'],
    queryFn: () => api.comments(100),
    staleTime: 60 * 1000,
  });

  const allReviews = commentsData?.comments || [];
  // Only real, approved comments count: no made-up average.
  const hasRealReviews = Boolean(commentsData?.comments?.length && commentsData?.average);
  const avgRating = hasRealReviews ? Number(commentsData.average).toFixed(1) : '';
  const totalCount = commentsData?.count || allReviews.length;

  // Filter reviews by rating point category
  const filteredReviews = useMemo(() => {
    if (filterRating === 'all') return allReviews;
    if (filterRating === '5') return allReviews.filter((r) => Number(r.rating) >= 5.0);
    if (filterRating === '4.5') return allReviews.filter((r) => Number(r.rating) >= 4.5 && Number(r.rating) < 5.0);
    if (filterRating === '4') return allReviews.filter((r) => Number(r.rating) >= 4.0 && Number(r.rating) < 4.5);
    return allReviews;
  }, [allReviews, filterRating]);

  // Rating points distribution
  const count5 = allReviews.filter((r) => Number(r.rating) >= 4.9).length;
  const count4 = allReviews.filter((r) => Number(r.rating) >= 4.0 && Number(r.rating) < 4.9).length;
  const countBelow = allReviews.filter((r) => Number(r.rating) < 4.0).length;

  const pct5 = Math.round((count5 / (allReviews.length || 1)) * 100);
  const pct4 = Math.round((count4 / (allReviews.length || 1)) * 100);
  const pctBelow = Math.round((countBelow / (allReviews.length || 1)) * 100);

  return (
    <>
      <Seo
        title="About Us — Colorful Story, Craftsmanship & Customer Reviews"
        description="Meet WILDTANE: architectural bags, laptop backpacks, and travel gear crafted in India. Explore our colorful journey, brand values, and customer comments."
        canonical="/about"
        image="/brand/logo-full.jpg"
        jsonLd={[breadcrumbLd(crumbs), { ...organizationLd(config), slogan: TAGLINE }]}
      />

      {/* ── 1. COLORFUL LUMINOUS HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-500/10 via-rose-500/10 to-indigo-600/15 border-b border-surface-container-high py-12 md:py-24">
        {/* Soft Glowing Ambient Orbs */}
        <div aria-hidden="true" className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute top-1/2 -right-20 w-96 h-96 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative container-x grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
          {/* Hero Content */}
          <div className="flex flex-col gap-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 self-center lg:self-start px-3.5 py-1.5 rounded-full bg-surface/80 backdrop-blur-md ring-1 ring-secondary/30 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-secondary">
                Architectural Carry • Handcrafted in India
              </span>
            </div>

            <h1 className="font-display text-[38px] sm:text-[48px] md:text-[60px] leading-[1.08] tracking-tight text-on-surface">
              Carry Your World in{' '}
              <span className="bg-gradient-to-r from-rose-500 via-rose-500 to-indigo-600 bg-clip-text text-transparent">
                Color & Craft.
              </span>
            </h1>

            <p className="text-[17px] md:text-[20px] font-medium text-on-surface/80">
              {TAGLINE}
            </p>

            <p className="text-[14px] md:text-[15.5px] leading-relaxed text-on-surface-variant max-w-xl mx-auto lg:mx-0">
              Designed for daily commuters, flight hoppers, and restless creators. We blend heavy-duty aerospace nylon, vegetable-tanned leather, and intuitive ergonomics into bags made to outlast every trend.
            </p>

            {/* Colorful Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/25 flex flex-col items-center lg:items-start">
                <span className="text-[18px] md:text-[22px] font-extrabold text-rose-700 dark:text-rose-300">COD</span>
                <span className="text-[11px] font-semibold text-on-surface-variant">Pay on delivery</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25 flex flex-col items-center lg:items-start">
                <span className="text-[18px] md:text-[22px] font-extrabold text-emerald-700 dark:text-emerald-300">{hasRealReviews ? `${avgRating}★` : 'Secure'}</span>
                <span className="text-[11px] font-semibold text-on-surface-variant">{hasRealReviews ? `${totalCount} Reviews` : 'UPI & card checkout'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/25 flex flex-col items-center lg:items-start">
                <span className="text-[18px] md:text-[22px] font-extrabold text-sky-700 dark:text-sky-300">Free</span>
                <span className="text-[11px] font-semibold text-on-surface-variant">Delivery over ₹10,000</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/25 flex flex-col items-center lg:items-start">
                <span className="text-[18px] md:text-[22px] font-extrabold text-rose-700 dark:text-rose-300">7-Day</span>
                <span className="text-[11px] font-semibold text-on-surface-variant">Easy returns</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-3">
              <Link to="/catalogue" className="btn bg-gradient-to-r from-rose-600 via-rose-600 to-indigo-600 text-white font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all">
                Explore The Catalogue
              </Link>
              <a
                href="#customer-reviews"
                className="btn bg-surface/90 backdrop-blur-md ring-1 ring-surface-container-high text-on-surface hover:bg-surface-container transition-all"
              >
                <Icon name="reviews" className="text-secondary text-[18px]" />
                Customer Comments ({totalCount})
              </a>
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="btn border border-secondary/40 text-secondary hover:bg-secondary/10 transition-all font-semibold"
              >
                <Icon name="rate_review" className="text-[18px]" />
                Leave A Comment
              </button>
            </div>
          </div>

          {/* Hero Visual Collage */}
          <div className="relative flex justify-center items-center">
            <div className="relative w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/20 dark:ring-white/10 group">
              <Img
                src="/uploads/seed/terminal-traveler.jpg"
                alt="WILDTANE commuter carrying backpack through airport terminal"
                w={700}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">Made to travel</span>
                <p className="text-[15px] font-semibold leading-snug">Designed for daily commutes and weekend trips.</p>
              </div>
            </div>

            {/* Floating Leather Accent Badge */}
            <div className="absolute -bottom-6 -left-4 sm:-left-8 w-44 sm:w-48 aspect-square rounded-2xl overflow-hidden ring-4 ring-surface shadow-lift bg-surface">
              <Img
                src="/uploads/seed/handbag-teal.jpg"
                alt="WILDTANE emerald teal leather handbag"
                w={300}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold">
                Emerald Full-Grain
              </span>
            </div>

            {/* Floating Rating Pill — only with real, approved comments */}
            {hasRealReviews && <div className="absolute -top-4 -right-2 sm:-right-6 px-4 py-2.5 rounded-2xl bg-surface/95 backdrop-blur-md ring-1 ring-surface-container-high shadow-lift flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[14px]">
                ★
              </span>
              <div className="flex flex-col">
                <span className="text-[13px] font-extrabold text-on-surface">{avgRating} / 5.0 Rating</span>
                <span className="text-[11px] text-on-surface-variant">From {totalCount} customer comments</span>
              </div>
            </div>}
          </div>
        </div>
      </section>

      {/* Breadcrumb Navigation */}
      <div className="container-x py-3.5 border-b border-surface-container-high">
        <nav aria-label="Breadcrumbs" className="text-[12px] text-on-surface-variant flex items-center gap-1.5">
          <Link to="/" className="hover:text-secondary transition-colors">Home</Link>
          <Icon name="chevron_right" className="text-[14px] text-outline" />
          <span aria-current="page" className="text-on-surface font-semibold">About Us</span>
        </nav>
      </div>

      {/* ── 2. OUR COLORFUL STORY & DESIGN PHILOSOPHY ── */}
      <section className="container-x py-14 md:py-20 grid lg:grid-cols-2 gap-10 md:gap-16 items-center" aria-labelledby="story-heading">
        <div className="flex flex-col gap-5">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11.5px] font-bold uppercase tracking-wider">
            <Icon name="history_edu" className="text-[14px]" /> Our Story
          </div>
          <h2 id="story-heading" className="font-display text-[30px] md:text-[42px] leading-tight text-on-surface">
            Bags Born for the Way <span className="text-secondary">You Actually Move</span>
          </h2>
          {STORY_PARAGRAPHS.map((p, idx) => (
            <p key={idx} className="text-[15px] md:text-[16px] leading-relaxed text-on-surface-variant">
              {p}
            </p>
          ))}

          {/* Pull Quote */}
          <div className="mt-2 p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-rose-500/10 to-indigo-500/10 border-l-4 border-secondary text-on-surface">
            <p className="font-serif italic text-[16px] md:text-[17px] leading-snug">
              “We don’t believe in fragile luxury that you are afraid to set on a wet cafe floor. A great bag should look exquisite in a boardroom and tough enough for a monsoonal trek.”
            </p>
            <span className="block text-[12px] font-bold text-secondary uppercase tracking-wider mt-2.5">
              — The WILDTANE Design Studio
            </span>
          </div>
        </div>

        {/* Gallery Visual Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-lift ring-1 ring-surface-container-high group">
              <Img
                src="/uploads/seed/hero-traveler.jpg"
                alt="Traveler with backpack in nature"
                w={480}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest ring-1 ring-surface-container-high text-center">
              <span className="font-display text-[26px] font-bold text-rose-600 dark:text-rose-400">1680D</span>
              <p className="text-[12px] text-on-surface-variant mt-0.5">Ballistic High-Tensile Weave</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-surface-container-lowest ring-1 ring-surface-container-high text-center">
              <span className="font-display text-[26px] font-bold text-emerald-600 dark:text-emerald-400">0%</span>
              <p className="text-[12px] text-on-surface-variant mt-0.5">Virgin Plastic Linings</p>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[4/5] shadow-lift ring-1 ring-surface-container-high group">
              <Img
                src="/uploads/seed/catalog/trekpack-teal.jpg"
                alt="WILDTANE teal trek pack"
                w={480}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. FOUR COLORFUL BRAND PILLARS ── */}
      <section className="bg-surface-container-low border-y border-surface-container-high py-14 md:py-20" aria-labelledby="pillars-heading">
        <div className="container-x flex flex-col gap-10">
          <div className="max-w-2xl flex flex-col gap-2.5">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[11.5px] font-bold uppercase tracking-wider">
              <Icon name="verified" className="text-[14px]" /> Core Commitments
            </div>
            <h2 id="pillars-heading" className="font-display text-[30px] md:text-[40px] leading-tight text-on-surface">
              Engineered With Purpose, Styled With Color
            </h2>
            <p className="text-[15px] leading-relaxed text-on-surface-variant">
              Every curve, zipper tooth, and seam is tested to give you bags that outlive expectations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {COLORFUL_PILLARS.map((p) => (
              <div
                key={p.title}
                className={cn(
                  'relative flex flex-col gap-3.5 p-6 rounded-3xl bg-surface bg-gradient-to-br ring-1 transition-all duration-300 hover:shadow-lift hover:-translate-y-1',
                  p.gradient,
                  p.border
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn('w-12 h-12 rounded-2xl bg-surface flex items-center justify-center ring-1 ring-surface-container-high shadow-sm', p.iconColor)}>
                    <Icon name={p.icon} className="text-[26px]" />
                  </div>
                  <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', p.badgeBg)}>
                    {p.badge}
                  </span>
                </div>
                <h3 className="text-[17px] font-bold text-on-surface">{p.title}</h3>
                <p className="text-[13.5px] leading-relaxed text-on-surface-variant">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. CUSTOMER REVIEWS & COMMENTS HUB ── */}
      <section id="customer-reviews" className="container-x py-14 md:py-24 scroll-mt-20" aria-label="Customer Comments and Reviews">
        {/* Section Title & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-surface-container-high">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11.5px] font-bold uppercase tracking-wider">
              <Icon name="favorite" className="text-[14px]" /> Customer Love & Feedback
            </div>
            <h2 className="font-display text-[30px] md:text-[42px] leading-tight text-on-surface">
              What Our Customers Say & Review Points
            </h2>
            <p className="text-[15px] leading-relaxed text-on-surface-variant">
              Honest thoughts, ratings, and field notes from people who carry WILDTANE across daily office commutes, express trains, and long-haul flights.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="filled"
              icon="rate_review"
              onClick={() => setReviewModalOpen(true)}
              className="bg-secondary text-on-secondary shadow-md font-semibold text-[13.5px]"
            >
              Write A Customer Review
            </Button>
          </div>
        </div>

        {/* ── Customer Rating Points Summary Card (only with real, approved comments) ── */}
        {hasRealReviews && <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-indigo-500/10 ring-1 ring-secondary/20 shadow-sm mb-10 items-center">
          {/* Big Score Block */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-6 text-center sm:text-left">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex flex-col items-center justify-center shadow-lg shrink-0">
              <span className="text-[34px] font-extrabold leading-none">{avgRating}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">out of 5.0</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <Stars value={Number(avgRating)} size={20} />
                <span className="text-[14px] font-bold text-on-surface ml-1">{avgRating} Rating Points</span>
              </div>
              <p className="text-[14px] font-semibold text-on-surface">
                Based on <span className="text-secondary">{totalCount} customer comments</span>
              </p>
            </div>
          </div>

          {/* Points Breakdown Bars */}
          <div className="flex flex-col gap-2.5 pt-4 lg:pt-0 lg:border-l lg:border-surface-container-high lg:pl-8">
            <div className="flex items-center gap-3 text-[13px]">
              <span className="w-24 font-semibold text-on-surface shrink-0">5.0 Stars</span>
              <div className="flex-1 h-3 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-700" style={{ width: `${pct5}%` }} />
              </div>
              <span className="w-12 text-right font-bold text-on-surface-variant">{pct5}%</span>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <span className="w-24 font-semibold text-on-surface shrink-0">4.0–4.9 Stars</span>
              <div className="flex-1 h-3 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${pct4}%` }} />
              </div>
              <span className="w-12 text-right font-bold text-on-surface-variant">{pct4}%</span>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <span className="w-24 font-semibold text-on-surface shrink-0">Below 4.0</span>
              <div className="flex-1 h-3 rounded-full bg-surface-container-high overflow-hidden">
                <div className="h-full bg-rose-400 rounded-full transition-all duration-700" style={{ width: `${pctBelow}%` }} />
              </div>
              <span className="w-12 text-right font-bold text-on-surface-variant">{pctBelow}%</span>
            </div>
          </div>
        </div>}

        {/* ── Rating Points Filter Tabs ── */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="text-[12.5px] font-bold text-on-surface-variant mr-1">Filter by Points:</span>
          {[
            { id: 'all', label: `All Comments (${allReviews.length})` },
            { id: '5', label: `★ 5.0 Stars (${count5})` },
            { id: '4.5', label: '★ 4.5–4.9 Stars' },
            { id: '4', label: '★ 4.0–4.4 Stars' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilterRating(tab.id);
                setVisibleCount(9);
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all',
                filterRating === tab.id
                  ? 'bg-secondary text-on-secondary shadow-sm scale-105'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Customer Comments Grid ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReviews.slice(0, visibleCount).map((r, i) => (
            <div
              key={r._id || i}
              className="group relative flex flex-col justify-between p-6 rounded-3xl bg-surface-container-lowest ring-1 ring-surface-container-high hover:ring-secondary/50 hover:shadow-lift transition-all duration-300"
            >
              <div className="flex flex-col gap-3.5">
                {/* Header: Star points + Verified Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Stars value={r.rating} size={15} />
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[12px] font-bold">
                      {Number(r.rating).toFixed(1)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <Icon name="verified" className="text-[12px]" /> Verified
                  </span>
                </div>

                {/* Comment Text */}
                <p className="text-[13.5px] md:text-[14px] leading-relaxed text-on-surface font-serif italic">
                  “{r.message}”
                </p>
              </div>

              {/* Author & City footer */}
              <div className="mt-5 pt-3.5 border-t border-surface-container-high flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      'w-9 h-9 rounded-full bg-gradient-to-tr text-white text-[12px] font-bold flex items-center justify-center shrink-0 shadow-sm',
                      AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                    )}
                  >
                    {initials(r.name)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13.5px] font-bold text-on-surface truncate">{r.name}</span>
                    <span className="text-[11.5px] text-on-surface-variant truncate">
                      {r.city ? `${r.city} • ` : ''}{timeAgo(r.createdAt)}
                    </span>
                  </div>
                </div>
                <Icon name="format_quote" className="text-[20px] text-secondary/40 group-hover:text-secondary transition-colors" />
              </div>
            </div>
          ))}
        </div>

        {/* Show More Reviews Toggle */}
        {filteredReviews.length > visibleCount && (
          <div className="flex justify-center pt-10">
            <Button
              type="button"
              variant="tonal"
              icon="expand_more"
              onClick={() => setVisibleCount((prev) => prev + 9)}
              className="text-[13.5px] font-semibold px-6 py-2.5 rounded-full"
            >
              Load More Customer Comments ({filteredReviews.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </section>

      {/* ── 5. MILESTONES & JOURNEY ── */}
      <section className="bg-surface-container-low border-t border-surface-container-high py-14 md:py-20" aria-labelledby="milestones-heading">
        <div className="container-x flex flex-col gap-10">
          <div className="max-w-2xl flex flex-col gap-2">
            <span className="eyebrow text-secondary">The Journey So Far</span>
            <h2 id="milestones-heading" className="font-display text-[28px] md:text-[38px] leading-tight text-on-surface">
              From Local Studio to Global Terminals
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MILESTONES.map((m) => (
              <div key={m.number} className="relative p-6 rounded-3xl bg-surface ring-1 ring-surface-container-high flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                <span className={cn('text-[38px] font-black font-display leading-none', m.accent)}>
                  {m.number}
                </span>
                <h3 className="text-[16px] font-bold text-on-surface">{m.step}</h3>
                <p className="text-[13px] leading-relaxed text-on-surface-variant">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Values component */}
      <BrandValues className="py-12 md:py-16" title="Why Shoppers Choose Us" eyebrow="The WILDTANE Standard" />

      {/* Official Corporate Entity & Registration Details */}
      <section className="container-x pb-12">
        <div className="card p-6 md:p-8 border border-surface-container-high bg-surface-container-lowest/80 backdrop-blur-sm rounded-3xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Brand Name</span>
            <h2 className="font-serif tracking-widest font-black text-xl text-on-surface uppercase">WILDTANE</h2>
            <p className="text-[13px] text-on-surface-variant">Architectural Carry & Travel Gear</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Company Name</span>
            <h3 className="font-bold text-[15px] text-on-surface uppercase tracking-wide">WILDTANE PRIVATE LIMITED</h3>
            <p className="text-[13px] text-on-surface-variant">Incorporated in India</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Registered Address</span>
            <address className="not-italic text-[13px] text-on-surface-variant leading-relaxed">
              Paharganj , New Delhi , 110055
            </address>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Legal & Contact</span>
            <p className="text-[13px] text-on-surface">GSTIN: <span className="font-mono font-bold text-secondary">07AAECW3767F1Z4</span></p>
            <p className="text-[13px] text-on-surface">Phone: <a href="tel:8920550465" className="font-semibold text-secondary hover:underline">8920550465</a></p>
          </div>
        </div>
      </section>

      {/* ── 6. COLORFUL CLOSING CALL TO ACTION ── */}
      <section className="container-x pb-14 md:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-rose-600 to-indigo-700 text-white p-8 md:p-14 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Subtle Ambient Texture */}
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />

          <div className="relative flex flex-col gap-3 max-w-xl">
            <span className="text-[11px] font-bold uppercase tracking-widest text-rose-200">
              Ready for your next journey?
            </span>
            <h2 className="font-display text-[30px] md:text-[42px] leading-tight text-white font-bold">
              Find the Bag That Fits Your Daily Rhythm.
            </h2>
            <p className="text-[15px] leading-relaxed text-white/90">
              Enjoy 7-day home trials, tracked doorstep delivery across India, and architectural carry built for life.
            </p>
          </div>

          <div className="relative flex flex-wrap gap-3">
            <Link to="/men" className="btn bg-white text-zinc-950 font-bold hover:bg-rose-100 shadow-md">
              Shop Men
            </Link>
            <Link to="/women" className="btn bg-rose-400 text-zinc-950 font-bold hover:bg-rose-300 shadow-md">
              Shop Women
            </Link>
            <button
              type="button"
              onClick={() => setReviewModalOpen(true)}
              className="btn border border-white/40 text-white hover:bg-white/10 font-medium"
            >
              Share Review
            </button>
            <Link to="/contact" className="btn border border-white/30 text-white hover:bg-white/10 font-medium">
              Contact Concierge
            </Link>
          </div>
        </div>
      </section>

      {/* Shared Write Review Modal */}
      <WriteReviewModal open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} />
    </>
  );
}
