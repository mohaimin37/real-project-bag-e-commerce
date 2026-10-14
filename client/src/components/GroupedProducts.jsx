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
 * Top Story Circles: displays subcategory options with real product photo and live item count.
 * Tapping one selects that subcategory so it comes directly in front.
 */
function SubcategoryCircles({ items, activeSlug, onSelectSubcategory, label = 'Bag Subcategories' }) {
  if (items.length < 2) return null;

  return (
    <nav aria-label={label} className="mb-5 rounded-3xl border border-surface-container-high bg-surface-container-lowest/80 shadow-xs px-3 pt-3.5 pb-2.5 md:px-5 md:pt-4">
      <div className="flex items-baseline justify-between gap-2 px-1 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <h2 className="text-[12px] md:text-[13px] font-bold uppercase tracking-[0.14em] text-on-surface">{label}</h2>
        </div>
        <span className="text-[11px] text-outline font-medium">{items.length} subcategories</span>
      </div>
      <ul className="flex gap-3 md:gap-4 overflow-x-auto snap-x scrollbar-none pb-2 -mx-1 px-1 touch-pan-x">
        {items.map((c) => {
          const isActive = activeSlug === c.slug;
          return (
            <li key={c.slug} className="snap-start shrink-0">
              <button
                type="button"
                onClick={() => onSelectSubcategory(c.slug)}
                className="group flex flex-col items-center gap-1.5 w-[68px] md:w-[84px] active:scale-95 transition-transform cursor-pointer"
                title={`${c.name} (${c.count})`}
              >
                <span
                  className={cn(
                    'relative p-[2.5px] rounded-full bg-gradient-to-tr shadow-sm transition-all duration-300',
                    c.tone?.grad || 'from-indigo-500 via-rose-500 to-amber-500',
                    isActive ? 'scale-110 ring-2 ring-secondary ring-offset-2 ring-offset-surface' : 'group-hover:scale-105'
                  )}
                >
                  <span className="block rounded-full bg-surface-container-lowest p-[2px]">
                    <img src={c.img} alt="" loading="lazy" decoding="async" className="w-14 h-14 md:w-[70px] md:h-[70px] rounded-full object-cover" />
                  </span>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold leading-5 text-center ring-2 ring-surface-container-lowest', c.tone?.solid || 'bg-secondary text-on-secondary')}>
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
  const isBags = preset === 'bags' || location.pathname.startsWith('/bags');
  const isMen = preset === 'men' || location.pathname.startsWith('/men');
  const isWomen = preset === 'women' || location.pathname.startsWith('/women');
  const isUniversal = preset === 'universal' || preset === 'unisex' || location.pathname.startsWith('/universal') || location.pathname.startsWith('/unisex');

  // 1. EXTRACT SUBCATEGORIES (Backpacks, Handbags, Tote Bags, Laptop Bags, Office Bags, Sling Bags, Duffle Bags, Travel Bags, Clutches, etc.)
  const subcategoryGroups = useMemo(() => {
    const map = new Map();

    for (const p of products) {
      // Determine subcategory
      const sub = p.subcategory;
      let subSlug = sub?.slug;
      let subName = sub?.name;

      if (!subSlug) {
        // Fallback: if category is not "bags", use category name
        if (p.category?.slug && p.category.slug !== 'bags') {
          subSlug = p.category.slug;
          subName = p.category.name;
        } else {
          subSlug = '_other';
          subName = 'Other Carry';
        }
      }

      if (!map.has(subSlug)) {
        const subData = bySlug?.get(subSlug) || sub || { name: subName, slug: subSlug };
        map.set(subSlug, {
          slug: subSlug,
          name: subName,
          sub: subData,
          tagline: subData?.tagline || sub?.tagline || '',
          tone: categoryTone(subData || { name: subName }),
          items: [],
          count: 0,
        });
      }

      const entry = map.get(subSlug);
      entry.items.push(p);
      entry.count += 1;
    }

    const rank = (slug) => (order?.has(slug) ? order.get(slug) : Number.MAX_SAFE_INTEGER);

    return [...map.values()]
      .map((entry) => {
        const first = entry.items[0];
        const v = firstAvailable(first);
        const raw = v?.images?.[0]?.url || first?.images?.[0]?.url || entry.sub?.image?.url;
        const img = raw ? imgUrl(raw, 160) : productImage(first, v);
        return {
          ...entry,
          img,
        };
      })
      .sort((a, b) => {
        const rankA = rank(a.slug);
        const rankB = rank(b.slug);
        if (rankA !== rankB && rankA !== Number.MAX_SAFE_INTEGER && rankB !== Number.MAX_SAFE_INTEGER) {
          return rankA - rankB;
        }
        return b.count - a.count; // largest subcategory collections first
      });
  }, [products, bySlug, order]);

  // 2. EXTRACT TOP-LEVEL CATEGORIES (Bags, Accessories, Clothing, Perfumes, etc.)
  const categoryGroups = useMemo(() => {
    const cats = new Map();
    for (const p of products) {
      const catSlug = p.category?.slug || '_other';
      if (!cats.has(catSlug)) {
        cats.set(catSlug, {
          slug: catSlug,
          cat: bySlug?.get(catSlug) || p.category || { name: catSlug, slug: catSlug },
          items: [],
          count: 0,
        });
      }
      const g = cats.get(catSlug);
      g.items.push(p);
      g.count += 1;
    }
    const rank = (slug) => (order?.has(slug) ? order.get(slug) : Number.MAX_SAFE_INTEGER);
    return [...cats.values()]
      .sort((a, b) => rank(a.slug) - rank(b.slug))
      .map((g) => {
        const first = g.items[0];
        const v = firstAvailable(first);
        const raw = v?.images?.[0]?.url || first?.images?.[0]?.url || g.cat?.image?.url;
        return {
          ...g,
          name: titleFor(g.cat),
          img: raw ? imgUrl(raw, 160) : productImage(first, v),
          tone: categoryTone(g.cat || { name: g.name }),
        };
      });
  }, [products, bySlug, order]);

  const totalCount = products.length;

  // Viewing mode: Subcategories vs Main Categories (Defaults to Subcategories whenever subcategories are available!)
  const [panelMode, setPanelMode] = useState('subcategories'); // 'subcategories' | 'categories'
  const [activeSubSlug, setActiveSubSlug] = useState('all');
  const [activeCatSlug, setActiveCatSlug] = useState('all');
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'grid'

  // When user clicks a subcategory from side, circles or mobile pills: that subcategory comes directly in front!
  const handleSelectSubcategory = (slug) => {
    setActiveSubSlug(slug);
    if (showcaseRef.current) {
      showcaseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectCategory = (slug) => {
    setActiveCatSlug(slug);
    if (showcaseRef.current) {
      showcaseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // The active Subcategory in front
  const currentSubGroup = useMemo(() => {
    if (activeSubSlug === 'all') return null;
    return subcategoryGroups.find((s) => s.slug === activeSubSlug) || null;
  }, [subcategoryGroups, activeSubSlug]);

  // The active Category in front (if category mode)
  const currentCatGroup = useMemo(() => {
    if (activeCatSlug === 'all') return null;
    return categoryGroups.find((c) => c.slug === activeCatSlug) || null;
  }, [categoryGroups, activeCatSlug]);

  const grid = comfort ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' : GRID_COLS;

  const isSubcategoryMode = panelMode === 'subcategories' || subcategoryGroups.length > 1;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* ── Top Department Switcher & Sliding Bar Indicator ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <span className="text-[12px] uppercase tracking-wider font-bold text-outline">Department:</span>
          <div className="inline-flex p-1 rounded-2xl bg-surface-container-high/70 border border-surface-container-highest">
            <Link
              to="/bags"
              className={cn(
                'px-3.5 py-1 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all',
                isBags ? 'bg-secondary text-on-secondary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Icon name="shopping_bag" className="text-[16px]" /> Bags
            </Link>
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

      {/* ── Top Story Circles (Quick jump into any Bag Subcategory) ── */}
      {circles && subcategoryGroups.length > 1 && (
        <SubcategoryCircles
          items={subcategoryGroups}
          activeSlug={activeSubSlug}
          onSelectSubcategory={handleSelectSubcategory}
          label={isBags ? 'Bag Subcategories' : isMen ? 'Men’s Bag Subcategories' : isWomen ? 'Women’s Bag Subcategories' : 'Bag Subcategories'}
        />
      )}

      {/* ── MOBILE: Horizontal Subcategories Bar (< lg) ── */}
      <div className="lg:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
            <Icon name="shopping_bag" className="text-[15px] text-secondary" /> Bag Subcategories
          </span>
          {activeSubSlug !== 'all' && (
            <button
              type="button"
              onClick={() => handleSelectSubcategory('all')}
              className="text-[11.5px] font-bold text-secondary hover:underline cursor-pointer"
            >
              View All Subcategories
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 touch-pan-x">
          <button
            type="button"
            onClick={() => handleSelectSubcategory('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer',
              activeSubSlug === 'all'
                ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                : 'bg-surface-container-low border-surface-container-high text-on-surface'
            )}
          >
            <Icon name="grid_view" className="text-[14px]" /> All Subcategories ({totalCount})
          </button>
          {subcategoryGroups.map((s) => {
            const isActive = activeSubSlug === s.slug;
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => handleSelectSubcategory(s.slug)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all border flex items-center gap-1.5 whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-secondary text-on-secondary border-secondary shadow-xs scale-102'
                    : 'bg-surface-container-low border-surface-container-high text-on-surface'
                )}
              >
                <span>{s.name}</span>
                <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full', isActive ? 'bg-white/20 text-white' : 'bg-surface-container-high text-outline')}>
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP: 2-COLUMN LAYOUT (SIDE SUBCATEGORIES + SLIDING BAR SHOWCASE) ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left Side Subcategories Option Panel ── */}
        <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col gap-3 sticky top-28 self-start">
          <div className="card p-3.5 sm:p-4 rounded-3xl border border-surface-container-high bg-surface-container-lowest shadow-sm flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <Icon name="shopping_bag" className="text-[18px]" />
                </span>
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-on-surface">Subcategories</h3>
                  <p className="text-[11px] text-outline">{subcategoryGroups.length} bag types</p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                {totalCount} items
              </span>
            </div>

            {/* If there are multiple top-level categories, provide tab toggle */}
            {categoryGroups.length > 1 && !isBags && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container-low border border-surface-container-high text-[11.5px] font-bold">
                <button
                  type="button"
                  onClick={() => setPanelMode('subcategories')}
                  className={cn(
                    'py-1 rounded-lg text-center transition-all cursor-pointer',
                    panelMode === 'subcategories' ? 'bg-surface text-secondary shadow-xs' : 'text-outline hover:text-on-surface'
                  )}
                >
                  Bag Types
                </button>
                <button
                  type="button"
                  onClick={() => setPanelMode('categories')}
                  className={cn(
                    'py-1 rounded-lg text-center transition-all cursor-pointer',
                    panelMode === 'categories' ? 'bg-surface text-secondary shadow-xs' : 'text-outline hover:text-on-surface'
                  )}
                >
                  Categories
                </button>
              </div>
            )}

            {/* "All Bag Subcategories" option */}
            <button
              type="button"
              onClick={() => {
                if (panelMode === 'subcategories') {
                  handleSelectSubcategory('all');
                } else {
                  handleSelectCategory('all');
                }
              }}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all text-[13px] cursor-pointer',
                (panelMode === 'subcategories' ? activeSubSlug === 'all' : activeCatSlug === 'all')
                  ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                  : 'hover:bg-surface-container-low text-on-surface font-medium'
              )}
            >
              <span
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0',
                  (panelMode === 'subcategories' ? activeSubSlug === 'all' : activeCatSlug === 'all')
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-container-high text-secondary'
                )}
              >
                <Icon name="grid_view" />
              </span>
              <span className="flex-1 truncate">
                {panelMode === 'subcategories' ? 'All Bag Subcategories' : 'All Categories'}
              </span>
              <span
                className={cn(
                  'text-[11px] font-mono px-1.5 py-0.5 rounded-md',
                  (panelMode === 'subcategories' ? activeSubSlug === 'all' : activeCatSlug === 'all')
                    ? 'bg-white/25 text-white'
                    : 'bg-surface-container-high text-outline'
                )}
              >
                {totalCount}
              </span>
            </button>

            {/* Individual Subcategory options (Backpacks, Handbags, Tote Bags, Laptop Bags, Office Bags, Sling Bags, Duffle Bags, Travel Bags, Clutches, etc.) */}
            <div className="flex flex-col gap-1.5 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-none pr-0.5">
              {panelMode === 'subcategories' ? (
                subcategoryGroups.map((s) => {
                  const isActive = activeSubSlug === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => handleSelectSubcategory(s.slug)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-2xl text-left transition-all text-[12.5px] group relative cursor-pointer',
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
                        {s.img ? (
                          <img src={s.img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="shopping_bag" className="text-[18px] text-outline" />
                        )}
                      </span>

                      <span className="flex-1 truncate leading-tight">{s.name}</span>

                      <span
                        className={cn(
                          'text-[10.5px] font-mono px-1.5 py-0.5 rounded-full shrink-0',
                          isActive ? 'bg-secondary text-on-secondary font-black' : 'bg-surface-container-high text-outline'
                        )}
                      >
                        {s.count}
                      </span>

                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 animate-ping" />}
                    </button>
                  );
                })
              ) : (
                categoryGroups.map((g) => {
                  const isActive = activeCatSlug === g.slug;
                  return (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => handleSelectCategory(g.slug)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-2xl text-left transition-all text-[12.5px] group relative cursor-pointer',
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
                        {g.img ? (
                          <img src={g.img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="category" className="text-[18px] text-outline" />
                        )}
                      </span>

                      <span className="flex-1 truncate leading-tight">{g.name}</span>

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
                })
              )}
            </div>
          </div>
        </aside>

        {/* ── Right Main Area: The Selected Subcategory in Front with Sliding Bar ── */}
        <main ref={showcaseRef} className="flex-1 min-w-0 flex flex-col gap-8 scroll-mt-28">
          {/* CASE A: User clicked a particular SUBCATEGORY (e.g. Backpacks, Handbags, Tote Bags...) -> that subcategory comes directly in front! */}
          {currentSubGroup ? (
            <section className="flex flex-col gap-4">
              {/* Subcategory Spotlight Header */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-secondary/10 via-surface-container-low to-surface-container-lowest border border-secondary/25 shadow-xs flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={cn('w-2 h-8 rounded-full', currentSubGroup.tone?.solid || 'bg-secondary')} />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                        <Icon name="shopping_bag" className="text-[14px]" /> Bag Subcategory
                      </span>
                      <h2 className="font-display text-[22px] md:text-[28px] leading-tight text-on-surface">
                        {currentSubGroup.name}
                      </h2>
                      {currentSubGroup.tagline && (
                        <p className="text-[12.5px] text-outline mt-0.5 max-w-xl">
                          {currentSubGroup.tagline}
                        </p>
                      )}
                    </div>
                    <span className="text-[12px] font-mono px-2.5 py-1 rounded-full bg-secondary/15 text-secondary font-bold ml-1">
                      {currentSubGroup.items.length} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'slider' ? 'grid' : 'slider')}
                      className="btn-tonal h-9 px-3 text-[12px] font-bold gap-1.5 cursor-pointer"
                      title={viewMode === 'slider' ? 'Switch to Grid View' : 'Switch to Sliding Bar'}
                    >
                      <Icon name={viewMode === 'slider' ? 'grid_view' : 'view_carousel'} className="text-[17px]" />
                      {viewMode === 'slider' ? 'View as Grid' : 'View as Sliding Bar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSubcategory('all')}
                      className="btn-ghost h-9 px-2.5 text-[12px] text-secondary font-bold hover:underline cursor-pointer"
                    >
                      All Subcategories
                    </button>
                  </div>
                </div>
              </div>

              {/* The Sliding Bar (whatever items fit on screen come, clicking sliding buttons reveals more) */}
              {viewMode === 'slider' ? (
                <ProductSlidingBar items={currentSubGroup.items} comfort={comfort} priority={true} />
              ) : (
                <div className={grid}>
                  {currentSubGroup.items.map((p, i) => (
                    <ProductCard key={p._id} product={p} priority={i < 6} />
                  ))}
                </div>
              )}
            </section>
          ) : currentCatGroup ? (
            /* CASE B: User clicked a particular top-level Category */
            <section className="flex flex-col gap-4">
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-secondary/10 via-surface-container-low to-surface-container-lowest border border-secondary/25 shadow-xs flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className={cn('w-2 h-8 rounded-full', currentCatGroup.tone?.solid || 'bg-secondary')} />
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-secondary">
                        Collection Showcase
                      </span>
                      <h2 className="font-display text-[22px] md:text-[28px] leading-tight text-on-surface">
                        {currentCatGroup.name}
                      </h2>
                    </div>
                    <span className="text-[12px] font-mono px-2.5 py-1 rounded-full bg-secondary/15 text-secondary font-bold ml-1">
                      {currentCatGroup.items.length} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'slider' ? 'grid' : 'slider')}
                      className="btn-tonal h-9 px-3 text-[12px] font-bold gap-1.5 cursor-pointer"
                    >
                      <Icon name={viewMode === 'slider' ? 'grid_view' : 'view_carousel'} className="text-[17px]" />
                      {viewMode === 'slider' ? 'View as Grid' : 'View as Sliding Bar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectCategory('all')}
                      className="btn-ghost h-9 px-2.5 text-[12px] text-secondary font-bold hover:underline cursor-pointer"
                    >
                      All Categories
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'slider' ? (
                <ProductSlidingBar items={currentCatGroup.items} comfort={comfort} priority={true} />
              ) : (
                <div className={grid}>
                  {currentCatGroup.items.map((p, i) => (
                    <ProductCard key={p._id} product={p} priority={i < 6} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            /* CASE C: "All Subcategories" active -> every subcategory (Backpacks, Totes, Laptop Bags...) has its own Sliding Bar with sliding buttons */
            <div className="flex flex-col gap-10">
              {subcategoryGroups.map((s, si) => (
                <section key={s.slug} id={`sub-${s.slug}`} className="flex flex-col gap-3 scroll-mt-32">
                  <div className="flex items-center justify-between gap-3 pb-1 border-b border-surface-container-high">
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden="true" className={cn('w-1.5 h-6 rounded-full', s.tone?.solid || 'bg-secondary')} />
                      <h2 className="font-display text-[20px] md:text-[24px] leading-tight text-on-surface">
                        {s.name}
                      </h2>
                      <span className="text-[12px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                        {s.count}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectSubcategory(s.slug)}
                      className="text-[12px] font-bold text-secondary hover:underline inline-flex items-center gap-1 group/btn cursor-pointer"
                    >
                      Focus on {s.name} <Icon name="arrow_forward" className="text-[14px] group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Each subcategory gets its sliding bar with prev/next sliding buttons */}
                  <ProductSlidingBar items={s.items} comfort={comfort} priority={si === 0} />
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
