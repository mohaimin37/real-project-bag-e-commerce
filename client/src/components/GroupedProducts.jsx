import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn, imgUrl, productImage } from '../lib/format';
import { categoryTone } from '../lib/categoryTone';
import { Icon } from './ui';
import { GRID_COLS, ProductCard, ProductCardSkeleton, firstAvailable } from './product';

const AUDIENCE = { men: 'Men’s', women: 'Women’s' };

/** Category title with its audience when the name alone is ambiguous ("Bags" → "Men’s Bags"). */
function titleFor(cat) {
  if (!cat) return 'More';
  const prefix = AUDIENCE[cat.department];
  return prefix && !/men|women/i.test(cat.name) ? `${prefix} ${cat.name}` : cat.name;
}

/**
 * Interactive Product Sliding Bar:
 * Displays whatever items fit on the screen (responsive auto-columns) and slides
 * smoothly to reveal the next/previous items when the user clicks the sliding buttons.
 */
function ProductSlidingBar({ items, comfort, priority = false }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(items.length > 3);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(maxScroll > 10 && el.scrollLeft < maxScroll - 8);
    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (el.scrollLeft / maxScroll) * 100)));
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, items]);

  const slide = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative group/slider-wrap">
      {/* Sliding Button - Left */}
      <button
        type="button"
        disabled={!canLeft}
        onClick={() => slide('left')}
        aria-label="Slide to previous items"
        title="Previous items"
        className={cn(
          "absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border",
          "bg-surface/95 backdrop-blur-md border-surface-container-highest text-on-surface hover:bg-secondary hover:text-on-secondary active:scale-90",
          canLeft
            ? "opacity-95 hover:opacity-100 cursor-pointer hover:scale-105"
            : "opacity-0 pointer-events-none"
        )}
      >
        <Icon name="chevron_left" className="text-[24px] sm:text-[26px]" />
      </button>

      {/* The Sliding Bar Track */}
      <div
        ref={trackRef}
        tabIndex={0}
        aria-label="Products sliding bar"
        className="grid grid-flow-col auto-cols-[calc(84%-8px)] sm:auto-cols-[calc(48%-10px)] md:auto-cols-[calc(33.333%-14px)] lg:auto-cols-[calc(25%-15px)] gap-3.5 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none py-2 px-1 focus-visible:ring-1 focus-visible:ring-secondary rounded-2xl"
      >
        {items.map((p, i) => (
          <div key={p._id} className="snap-start h-full">
            <ProductCard product={p} priority={priority && i < 4} />
          </div>
        ))}
      </div>

      {/* Sliding Button - Right */}
      <button
        type="button"
        disabled={!canRight}
        onClick={() => slide('right')}
        aria-label="Slide to next items"
        title="Next items"
        className={cn(
          "absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border",
          "bg-surface/95 backdrop-blur-md border-surface-container-highest text-on-surface hover:bg-secondary hover:text-on-secondary active:scale-90",
          canRight
            ? "opacity-95 hover:opacity-100 cursor-pointer hover:scale-105"
            : "opacity-0 pointer-events-none"
        )}
      >
        <Icon name="chevron_right" className="text-[24px] sm:text-[26px]" />
      </button>

      {/* Live scroll progress bar */}
      {items.length > 4 && (
        <div className="w-full h-1 bg-surface-container-high/60 rounded-full mt-2.5 overflow-hidden">
          <div
            className="h-full bg-secondary/80 rounded-full transition-all duration-150"
            style={{ width: `${Math.max(12, scrollProgress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Top "Shop by category" circles: one per category with real product photo and live item count.
 * Tapping one selects that category so it comes directly in front.
 */
function CategoryCircles({ groups, activeSlug, onSelectCategory }) {
  const items = groups.map((g) => {
    const name = titleFor(g.cat);
    const first = g.allItems[0];
    const v = firstAvailable(first);
    const raw = v?.images?.[0]?.url || first?.images?.[0]?.url || g.cat?.image?.url;
    return {
      slug: g.slug,
      name,
      count: g.count,
      img: raw ? imgUrl(raw, 160) : productImage(first, v),
      tone: categoryTone(g.cat || { name }),
    };
  });

  if (items.length < 2) return null;

  return (
    <nav aria-label="Shop by category" className="mb-5 rounded-3xl border border-surface-container-high bg-surface-container-lowest/80 shadow-xs px-3 pt-3.5 pb-2.5 md:px-5 md:pt-4">
      <div className="flex items-baseline justify-between gap-2 px-1 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <h2 className="text-[12px] md:text-[13px] font-bold uppercase tracking-[0.14em] text-on-surface">Shop by category</h2>
        </div>
        <span className="text-[11px] text-outline font-medium">{items.length} categories</span>
      </div>
      <ul className="flex gap-3 md:gap-4 overflow-x-auto snap-x scrollbar-none pb-2 -mx-1 px-1 touch-pan-x">
        {items.map((c) => {
          const isActive = activeSlug === c.slug;
          return (
            <li key={c.slug} className="snap-start shrink-0">
              <button
                type="button"
                onClick={() => onSelectCategory(c.slug)}
                className="group flex flex-col items-center gap-1.5 w-[68px] md:w-[84px] active:scale-95 transition-transform"
                title={`${c.name} (${c.count})`}
              >
                <span
                  className={cn(
                    'relative p-[2.5px] rounded-full bg-gradient-to-tr shadow-sm transition-all duration-300',
                    c.tone.grad || 'from-indigo-500 via-violet-500 to-rose-500',
                    isActive ? 'scale-110 ring-2 ring-secondary ring-offset-2 ring-offset-surface' : 'group-hover:scale-105'
                  )}
                >
                  <span className="block rounded-full bg-surface-container-lowest p-[2px]">
                    <img src={c.img} alt="" loading="lazy" decoding="async" className="w-14 h-14 md:w-[70px] md:h-[70px] rounded-full object-cover" />
                  </span>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold leading-5 text-center ring-2 ring-surface-container-lowest', c.tone.solid)}>
                    {c.count}
                  </span>
                </span>
                <span className={cn('text-[11px] md:text-[12px] font-medium leading-tight text-center line-clamp-2 transition-colors', isActive ? 'text-secondary font-bold' : 'text-on-surface-variant group-hover:text-on-surface')}>
                  {c.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function GroupedProducts({ products, bySlug, order, comfort, loadingMore, className, circles, preset }) {
  const location = useLocation();
  const showcaseRef = useRef(null);

  // Determine current department for top navigation
  const isMen = preset === 'men' || location.pathname.startsWith('/men');
  const isWomen = preset === 'women' || location.pathname.startsWith('/women');
  const isUniversal = preset === 'universal' || preset === 'unisex' || location.pathname.startsWith('/universal') || location.pathname.startsWith('/unisex');

  // Build category groups and allItems
  const groups = useMemo(() => {
    const cats = new Map();
    for (const p of products) {
      const catSlug = p.category?.slug || '_other';
      const subSlug = p.subcategory?.slug || '_none';
      if (!cats.has(catSlug)) {
        cats.set(catSlug, {
          slug: catSlug,
          cat: bySlug.get(catSlug) || p.category,
          subs: new Map(),
          count: 0,
        });
      }
      const g = cats.get(catSlug);
      if (!g.subs.has(subSlug)) {
        g.subs.set(subSlug, {
          slug: subSlug,
          sub: bySlug.get(subSlug) || p.subcategory,
          items: [],
        });
      }
      g.subs.get(subSlug).items.push(p);
      g.count += 1;
    }
    const rank = (slug) => (order.has(slug) ? order.get(slug) : Number.MAX_SAFE_INTEGER);
    return [...cats.values()]
      .sort((a, b) => rank(a.slug) - rank(b.slug))
      .map((g) => ({
        ...g,
        subs: [...g.subs.values()].sort((a, b) => (a.slug === '_none') - (b.slug === '_none') || rank(a.slug) - rank(b.slug)),
        allItems: [...g.subs.values()].flatMap((s) => s.items),
      }));
  }, [products, bySlug, order]);

  const totalCount = products.length;

  // Selected Category State: 'all' or specific category slug
  const [activeCatSlug, setActiveCatSlug] = useState('all');
  const [activeSubSlug, setActiveSubSlug] = useState('all');
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'grid'

  // When user clicks a category from side or bubbles: that category comes directly in front!
  const handleSelectCategory = (slug) => {
    setActiveCatSlug(slug);
    setActiveSubSlug('all');
    if (showcaseRef.current) {
      showcaseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentGroup = useMemo(() => {
    if (activeCatSlug === 'all') return null;
    return groups.find((g) => g.slug === activeCatSlug) || groups[0] || null;
  }, [groups, activeCatSlug]);

  const currentDisplayItems = useMemo(() => {
    if (!currentGroup) return [];
    if (activeSubSlug === 'all') return currentGroup.allItems;
    const sub = currentGroup.subs.find((s) => s.slug === activeSubSlug);
    return sub ? sub.items : currentGroup.allItems;
  }, [currentGroup, activeSubSlug]);

  const grid = comfort ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' : GRID_COLS;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* ── Top Department Switcher & Sliding Bar Indicator ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <span className="text-[12px] uppercase tracking-wider font-bold text-outline">Department:</span>
          <div className="inline-flex p-1 rounded-2xl bg-surface-container-high/70 border border-surface-container-highest">
            <Link
              to="/men"
              className={cn(
                'px-3.5 py-1 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all',
                isMen ? 'bg-secondary text-on-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="man" className="text-[16px]" /> Men
            </Link>
            <Link
              to="/women"
              className={cn(
                'px-3.5 py-1 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all',
                isWomen ? 'bg-secondary text-on-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="woman" className="text-[16px]" /> Women
            </Link>
            <Link
              to="/universal"
              className={cn(
                'px-3.5 py-1 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all',
                isUniversal ? 'bg-secondary text-on-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="public" className="text-[16px]" /> Universal
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-outline">
          <Icon name="view_carousel" className="text-[16px] text-secondary" />
          <span>Interactive Sliding Bar &bull; Click arrows to slide items</span>
        </div>
      </div>

      {/* ── Top Category Story Circles (Quick jump) ── */}
      {circles && groups.length > 1 && (
        <CategoryCircles groups={groups} activeSlug={activeCatSlug} onSelectCategory={handleSelectCategory} />
      )}

      {/* ── MOBILE: Horizontal Category Bar (< lg) ── */}
      <div className="lg:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
            <Icon name="category" className="text-[15px] text-secondary" /> Side Categories
          </span>
          {activeCatSlug !== 'all' && (
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              className="text-[11.5px] font-bold text-secondary hover:underline"
            >
              View All Categories
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 touch-pan-x">
          <button
            type="button"
            onClick={() => handleSelectCategory('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all border flex items-center gap-1.5',
              activeCatSlug === 'all'
                ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                : 'bg-surface-container-low border-surface-container-high text-on-surface'
            )}
          >
            <Icon name="grid_view" className="text-[14px]" /> All ({totalCount})
          </button>
          {groups.map((g) => {
            const isActive = activeCatSlug === g.slug;
            return (
              <button
                key={g.slug}
                type="button"
                onClick={() => handleSelectCategory(g.slug)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all border flex items-center gap-1.5 whitespace-nowrap',
                  isActive
                    ? 'bg-secondary text-on-secondary border-secondary shadow-xs scale-102'
                    : 'bg-surface-container-low border-surface-container-high text-on-surface'
                )}
              >
                <span>{titleFor(g.cat)}</span>
                <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-surface-container-high text-outline')}>
                  {g.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP: 2-COLUMN LAYOUT (SIDE CATEGORIES + SLIDING BAR SHOWCASE) ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left Side Categories Option Panel ── */}
        <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col gap-3 sticky top-28 self-start">
          <div className="card p-3.5 sm:p-4 rounded-3xl border border-surface-container-high bg-surface-container-lowest shadow-sm flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <Icon name="category" className="text-[18px]" />
                </span>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-on-surface">Categories</h3>
                  <p className="text-[11px] text-outline">{groups.length} collections</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                {totalCount} items
              </span>
            </div>

            {/* "All Categories" option */}
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all text-[13px]',
                activeCatSlug === 'all'
                  ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                  : 'hover:bg-surface-container-low text-on-surface font-medium'
              )}
            >
              <span
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0',
                  activeCatSlug === 'all' ? 'bg-white/20 text-white' : 'bg-surface-container-high text-secondary'
                )}
              >
                <Icon name="grid_view" />
              </span>
              <span className="flex-1 truncate">All Categories</span>
              <span
                className={cn(
                  'text-[11px] font-mono px-1.5 py-0.5 rounded-md',
                  activeCatSlug === 'all' ? 'bg-white/25 text-white' : 'bg-surface-container-high text-outline'
                )}
              >
                {totalCount}
              </span>
            </button>

            {/* Individual Category options */}
            <div className="flex flex-col gap-1.5 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-none pr-0.5">
              {groups.map((g) => {
                const isActive = activeCatSlug === g.slug;
                const first = g.allItems[0];
                const v = firstAvailable(first);
                const raw = v?.images?.[0]?.url || first?.images?.[0]?.url || g.cat?.image?.url;
                const img = raw ? imgUrl(raw, 100) : productImage(first, v);

                return (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => handleSelectCategory(g.slug)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-2xl text-left transition-all text-[12.5px] group relative',
                      isActive
                        ? 'bg-secondary/15 text-secondary border border-secondary/40 font-bold ring-1 ring-secondary/30 shadow-2xs'
                        : 'hover:bg-surface-container-low text-on-surface font-medium border border-transparent'
                    )}
                  >
                    <span
                      className={cn(
                        'w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-outline-variant/30 bg-surface-container-low flex items-center justify-center',
                        isActive ? 'ring-2 ring-secondary shadow-xs scale-105' : 'group-hover:scale-105 transition-transform'
                      )}
                    >
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="category" className="text-[18px] text-outline" />
                      )}
                    </span>

                    <span className="flex-1 truncate leading-tight">{titleFor(g.cat)}</span>

                    <span
                      className={cn(
                        'text-[10.5px] font-mono px-1.5 py-0.5 rounded-full shrink-0',
                        isActive ? 'bg-secondary text-on-secondary font-black' : 'bg-surface-container-high text-outline'
                      )}
                    >
                      {g.count}
                    </span>

                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 animate-ping" />}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Right Main Area: The Category in Front with Sliding Bar ── */}
        <main ref={showcaseRef} className="flex-1 min-w-0 flex flex-col gap-8 scroll-mt-28">
          {/* CASE A: User clicked a particular category -> that category comes directly in front! */}
          {currentGroup ? (
            <section className="flex flex-col gap-4">
              {/* Category Spotlight Header */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-secondary/10 via-surface-container-low to-surface-container-lowest border border-secondary/25 shadow-xs flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={cn('w-2 h-8 rounded-full', categoryTone(currentGroup.cat).solid)} />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-secondary">
                        {isMen ? 'Men’s Collection' : isWomen ? 'Women’s Collection' : 'Featured Collection'}
                      </span>
                      <h2 className="font-display text-[22px] md:text-[28px] leading-tight text-on-surface">
                        {titleFor(currentGroup.cat)}
                      </h2>
                    </div>
                    <span className="text-[12px] font-mono px-2.5 py-1 rounded-full bg-secondary/15 text-secondary font-bold ml-1">
                      {currentDisplayItems.length} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'slider' ? 'grid' : 'slider')}
                      className="btn-tonal h-9 px-3 text-[12px] font-bold gap-1.5"
                      title={viewMode === 'slider' ? 'Switch to Grid View' : 'Switch to Sliding Bar'}
                    >
                      <Icon name={viewMode === 'slider' ? 'grid_view' : 'view_carousel'} className="text-[17px]" />
                      {viewMode === 'slider' ? 'View as Grid' : 'View as Sliding Bar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectCategory('all')}
                      className="btn-ghost h-9 px-2.5 text-[12px] text-secondary font-bold hover:underline"
                    >
                      All Categories
                    </button>
                  </div>
                </div>

                {/* Subcategories filter chips */}
                {currentGroup.subs.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-container-high/60">
                    <span className="text-[11.5px] font-bold text-outline uppercase tracking-wider mr-1">Types:</span>
                    <button
                      type="button"
                      onClick={() => setActiveSubSlug('all')}
                      className={cn(
                        'h-7 px-3 rounded-full text-[11.5px] font-bold transition-all border',
                        activeSubSlug === 'all'
                          ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                          : 'bg-surface-container-lowest border-surface-container-high text-on-surface hover:bg-surface-container-low'
                      )}
                    >
                      All {currentGroup.cat?.name || ''} ({currentGroup.allItems.length})
                    </button>
                    {currentGroup.subs.map((s) => {
                      const subName = s.slug === '_none' ? 'General' : s.sub?.name || s.slug;
                      const isSubActive = activeSubSlug === s.slug;
                      return (
                        <button
                          key={s.slug}
                          type="button"
                          onClick={() => setActiveSubSlug(s.slug)}
                          className={cn(
                            'h-7 px-3 rounded-full text-[11.5px] font-bold transition-all border',
                            isSubActive
                              ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                              : 'bg-surface-container-lowest border-surface-container-high text-on-surface hover:bg-surface-container-low'
                          )}
                        >
                          {subName} ({s.items.length})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* The Sliding Bar (whatever items fit on screen come, clicking sliding buttons reveals more) */}
              {viewMode === 'slider' ? (
                <ProductSlidingBar items={currentDisplayItems} comfort={comfort} priority={true} />
              ) : (
                <div className={grid}>
                  {currentDisplayItems.map((p, i) => (
                    <ProductCard key={p._id} product={p} priority={i < 6} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* CASE B: "All Categories" active -> every category has its own Sliding Bar with sliding buttons */
            <div className="flex flex-col gap-10">
              {groups.map((g, gi) => (
                <section key={g.slug} id={`cat-${g.slug}`} className="flex flex-col gap-3 scroll-mt-32">
                  <div className="flex items-center justify-between gap-3 pb-1 border-b border-surface-container-high">
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden="true" className={cn('w-1.5 h-6 rounded-full', categoryTone(g.cat).solid)} />
                      <h2 className="font-display text-[20px] md:text-[24px] leading-tight text-on-surface">
                        {titleFor(g.cat)}
                      </h2>
                      <span className="text-[12px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                        {g.count}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectCategory(g.slug)}
                      className="text-[12px] font-bold text-secondary hover:underline inline-flex items-center gap-1 group/btn"
                    >
                      Focus on {titleFor(g.cat)} <Icon name="arrow_forward" className="text-[14px] group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Each category gets its sliding bar with prev/next sliding buttons */}
                  <ProductSlidingBar items={g.allItems} comfort={comfort} priority={gi === 0} />
                </section>
              ))}
            </div>
          )}

          {loadingMore && (
            <div className={cn(grid, 'pt-6')}>
              {Array.from({ length: 4 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
