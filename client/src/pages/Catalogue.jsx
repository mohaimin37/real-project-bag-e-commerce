import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn } from '../lib/format';
import { categoryTone } from '../lib/categoryTone';
import { useCategories } from '../hooks/useStore';
import { ProductCard, ProductCardSkeleton } from '../components/product';
import Seo from '../components/Seo';
import SortMenu from '../components/SortMenu';
import { EmptyState, ErrorState, Icon, Toggle } from '../components/ui';

const SORTS = {
  featured: ['Featured relevance', (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.soldCount - a.soldCount, 'auto_awesome'],
  popular: ['Most popular', (a, b) => b.soldCount - a.soldCount, 'local_fire_department'],
  'price-low': ['Price: low to high', (a, b) => a.finalPrice - b.finalPrice, 'trending_up'],
  'price-high': ['Price: high to low', (a, b) => b.finalPrice - a.finalPrice, 'trending_down'],
  newest: ['Newest', (a, b) => new Date(b.createdAt) - new Date(a.createdAt), 'new_releases'],
};

/** Loads every visible product (page by page) so the whole range can be shown on one screen. */
function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'catalogue-all'],
    queryFn: async () => {
      const all = [];
      for (let page = 1; page <= 20; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await api.products({ page, limit: 48, sort: 'featured' });
        all.push(...res.items);
        if (page >= res.pages) break;
      }
      return all;
    },
    staleTime: 60 * 1000,
  });
}

/** Horizontal, swipeable row of cards with arrow buttons on larger screens. */
function Rail({ products }) {
  const ref = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (el) setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(update, [products]);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <div className="relative group/rail">
      <div ref={ref} onScroll={update} className="flex gap-2 sm:gap-3 md:gap-gutter overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-3 px-3 scroll-px-3 md:mx-0 md:px-0 md:scroll-px-0 pb-2">
        {products.map((p) => (
          <div key={p._id} className="snap-start shrink-0 w-[46%] min-[480px]:w-[45%] md:w-[31%] xl:w-[23.5%]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      {!edges.start && (
        <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className="hidden md:flex absolute -left-4 top-[35%] w-11 h-11 rounded-full bg-surface-container-lowest shadow-lift items-center justify-center hover:scale-105 transition-transform z-10">
          <Icon name="chevron_left" />
        </button>
      )}
      {!edges.end && (
        <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className="hidden md:flex absolute -right-4 top-[35%] w-11 h-11 rounded-full bg-surface-container-lowest shadow-lift items-center justify-center hover:scale-105 transition-transform z-10">
          <Icon name="chevron_right" />
        </button>
      )}
    </div>
  );
}

function Grid({ products }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-gutter">
      {products.map((p) => <ProductCard key={p._id} product={p} />)}
    </div>
  );
}

export default function Catalogue() {
  const { data: products, isLoading, isError, error, refetch } = useAllProducts();
  const { data: categories } = useCategories();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('featured');
  const [inStock, setInStock] = useState(false);
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('wt-catalogue-view') || 'rows';
    } catch {
      return 'rows';
    }
  });
  const [active, setActive] = useState('');

  const chooseView = (v) => {
    setView(v);
    try {
      localStorage.setItem('wt-catalogue-view', v);
    } catch {
      /* ignore */
    }
  };

  // Group: top category → subcategory → products (after search / stock filter / sort).
  const sections = useMemo(() => {
    if (!products || !categories) return [];
    const needle = q.trim().toLowerCase();
    const visible = products
      .filter((p) => !inStock || p.stock > 0)
      .filter((p) => !needle || [p.name, p.tagline, p.subcategory?.name, p.category?.name, ...(p.materials || [])].join(' ').toLowerCase().includes(needle))
      .sort(SORTS[sort][1]);
    return categories
      .map((cat) => {
        const inCat = visible.filter((p) => (p.category?._id || p.category) === cat._id);
        const groups = cat.children
          .map((sub) => ({ sub, items: inCat.filter((p) => (p.subcategory?._id || p.subcategory) === sub._id) }))
          .filter((g) => g.items.length);
        const loose = inCat.filter((p) => !p.subcategory);
        if (loose.length) groups.push({ sub: { _id: `${cat._id}-other`, name: `More ${cat.name}`, slug: cat.slug }, items: loose });
        return { cat, groups, count: inCat.length };
      })
      .filter((s) => s.count);
  }, [products, categories, q, sort, inStock]);
  const total = sections.reduce((n, s) => n + s.count, 0);

  // Highlight the category chip for the section currently in view.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`cat-${s.cat.slug}`)).filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.replace('cat-', ''));
      },
      { rootMargin: '-140px 0px -55% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const jump = (slug) => document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="pb-space-xl">
      <Seo title="Full Catalogue — Every Bag in One Place" description="Browse every WILDTANE bag, backpack, travel piece and accessory on one page, grouped by category." canonical="/catalogue" />

      {/* Header */}
      <section className="bg-surface-container-low">
        <div className="container-x py-space-xl flex flex-col gap-space-md">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Full catalogue</span>
            <h1 className="text-headline-xl-mobile md:text-headline-xl">Every bag, in one place.</h1>
            <p className="text-body-md text-on-surface-variant">
              {isLoading ? 'Loading the range…' : `${total} products across ${sections.length} categories. Tap “Add” on any bag to put it straight in your bag.`}
            </p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-space-sm">
            <label className="relative flex-1 max-w-xl">
              <span className="sr-only">Search the catalogue</span>
              <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalogue, e.g. leather, backpack, wallet" className="input h-12 pl-11 pr-10 text-body-md" />
              {q && (
                <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon w-8 h-8">
                  <Icon name="close" className="text-[18px]" />
                </button>
              )}
            </label>
            <div className="flex items-center gap-space-sm flex-wrap">
              <SortMenu value={sort} onChange={setSort} label="Sort" options={Object.entries(SORTS).map(([k, [label, , icon]]) => [k, label, icon])} className="[&>button]:h-12" />
              <div className="h-12 px-3 rounded-lg bg-surface-container-lowest flex items-center">
                <Toggle checked={inStock} onChange={setInStock} label="In stock" />
              </div>
              <div className="flex p-1 rounded-lg bg-surface-container-lowest h-12" role="tablist" aria-label="Layout">
                {[['rows', 'view_carousel', 'Rows'], ['grid', 'grid_view', 'Grid']].map(([v, icon, label]) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => chooseView(v)} className={cn('flex items-center gap-1.5 px-3 rounded-md text-label-md transition-colors', view === v ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface')}>
                    <Icon name={icon} className="text-[18px]" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky category bar */}
      {sections.length > 0 && (
        <nav aria-label="Catalogue categories" className="sticky top-16 lg:top-[72px] z-30 bg-surface/90 backdrop-blur-xl border-b border-surface-container-high">
          <div className="container-x flex gap-2 overflow-x-auto scrollbar-none py-2.5">
            {sections.map(({ cat, count }) => {
              const tone = categoryTone(cat);
              const on = active === cat.slug;
              return (
                <button key={cat._id} type="button" onClick={() => jump(cat.slug)} aria-current={on ? 'true' : undefined} className={cn('chip h-10 shrink-0 border transition-colors', on ? tone.solid : cn('border-transparent font-semibold', tone.tint, tone.text))}>
                  <Icon name={tone.icon} className="text-[18px]" /> {cat.name} <span className="text-label-sm opacity-75">{count}</span>
                </button>
              );
            })}
            <span className="w-px bg-surface-container-high shrink-0 mx-1" />
            {sections.flatMap(({ groups }) => groups).map(({ sub, items }) => {
              const tone = categoryTone(sub);
              return (
                <button key={sub._id} type="button" onClick={() => document.getElementById(`sub-${sub._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="chip h-10 shrink-0 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low">
                  <span className={cn('w-2 h-2 rounded-full', tone.dot)} /> {sub.name} <span className="text-label-sm text-outline">{items.length}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <div className="container-x pt-space-xl flex flex-col gap-16">
        {isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isLoading || !categories ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ProductCardSkeleton key={i} />)}</div>
        ) : !sections.length ? (
          <EmptyState icon="search_off" title="Nothing matches that search" description="Try a different word, or clear the filters." action={<button type="button" className="btn-primary" onClick={() => { setQ(''); setInStock(false); }}>Show everything</button>} />
        ) : (
          sections.map(({ cat, groups, count }) => (
            <section key={cat._id} id={`cat-${cat.slug}`} className="scroll-mt-36 flex flex-col gap-space-xl">
              <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl p-space-md', categoryTone(cat).tint)}>
                <div className="flex items-center gap-3">
                  <span className={cn('w-12 h-12 shrink-0 rounded-xl flex items-center justify-center', categoryTone(cat).solid)}>
                    <Icon name={categoryTone(cat).icon} className="text-[24px]" />
                  </span>
                  <div>
                    <span className={cn('text-label-sm font-bold uppercase tracking-wide', categoryTone(cat).text)}>{count} product{count === 1 ? '' : 's'}</span>
                    <h2 className="text-headline-lg">{cat.name}</h2>
                    {cat.tagline && <p className="text-body-md text-on-surface-variant">{cat.tagline}</p>}
                  </div>
                </div>
                <Link to={`/shop/${cat.slug}`} className={cn('inline-flex items-center gap-1 text-label-lg font-semibold hover:gap-2 transition-all', categoryTone(cat).text)}>
                  Shop all {cat.name} with filters <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
              </div>
              {groups.map(({ sub, items }) => (
                <div key={sub._id} id={`sub-${sub._id}`} className="scroll-mt-36 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-headline-sm flex items-center gap-2">
                      <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', categoryTone(sub).tint, categoryTone(sub).text)}>
                        <Icon name={categoryTone(sub).icon} className="text-[18px]" />
                      </span>
                      {sub.name}
                      <span className={cn('text-label-sm px-2 py-0.5 rounded-full font-bold', categoryTone(sub).tint, categoryTone(sub).text)}>{items.length}</span>
                    </h3>
                    {sub.slug && (
                      <Link to={`/shop/${sub.slug}`} className="text-label-md text-on-surface-variant hover:text-secondary inline-flex items-center gap-1">
                        See all <Icon name="chevron_right" className="text-[16px]" />
                      </Link>
                    )}
                  </div>
                  {view === 'grid' ? <Grid products={items} /> : <Rail products={items} />}
                </div>
              ))}
            </section>
          ))
        )}
      </div>

      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-primary text-on-primary shadow-lift flex items-center justify-center hover:scale-105 transition-transform">
        <Icon name="arrow_upward" />
      </button>
    </div>
  );
}
