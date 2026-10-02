import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn } from '../lib/format';
import { useCategories, useMoney } from '../hooks/useStore';
import { ProductGrid } from '../components/product';
import SortMenu from '../components/SortMenu';
import Seo, { breadcrumbLd, itemListLd } from '../components/Seo';
import { Breadcrumbs, Drawer, EmptyState, ErrorState, Icon, Pagination, Toggle } from '../components/ui';

const SORTS = [
  ['featured', 'Featured relevance', 'auto_awesome'],
  ['bestseller', 'Best selling', 'local_fire_department'],
  ['price-low', 'Price: low to high', 'trending_up'],
  ['price-high', 'Price: high to low', 'trending_down'],
  ['highest-rated', 'Highest rated', 'star'],
  ['newest', 'Newest drops', 'new_releases'],
];

const QUICK_TAGS = [
  { label: 'Waterproof', icon: 'water_drop', key: 'features', value: 'IPX5 Waterproof' },
  { label: 'Laptop 16"', icon: 'laptop_mac', key: 'features', value: 'Laptop 16" Sleeve' },
  { label: 'Cabin approved', icon: 'flight_takeoff', key: 'q', value: 'cabin approved' },
  { label: 'Italian leather', key: 'materials', value: 'Full-Grain Italian Calfskin' },
  { label: 'Recycled Cordura', key: 'materials', value: 'Recycled Cordura® 840D' },
];

const LIST_KEYS = ['materials', 'colors', 'features', 'size', 'purpose'];
const FILTER_KEYS = [...LIST_KEYS, 'minPrice', 'maxPrice', 'inStock', 'rating', 'onSale', 'gender'];

// Plain-language filter options (values match the API).
const WHO = [['', 'Everyone', 'groups'], ['women', 'Women', 'woman'], ['men', 'Men', 'man']];
const USES = [
  ['work', 'Work & office', 'business_center'],
  ['travel', 'Travel & trips', 'flight'],
  ['transit', 'Daily commute', 'directions_subway'],
  ['business', 'Meetings & events', 'event'],
  ['creative', 'Studio & hobbies', 'palette'],
];
const SIZES = [
  ['small', 'Small', 'Wallets, clutches, slings'],
  ['medium', 'Medium', 'Everyday backpacks & totes'],
  ['large', 'Large', 'Weekenders, duffles, luggage'],
];
const PRICE_BANDS = [
  ['0', '', '5000', 'Under ₹5,000'],
  ['5000', '5000', '10000', '₹5,000 – ₹10,000'],
  ['10000', '10000', '20000', '₹10,000 – ₹20,000'],
  ['20000', '20000', '', 'Over ₹20,000'],
];

function Chip({ on, onClick, icon, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn('chip h-10 border text-label-md', on ? 'bg-primary text-on-primary border-primary' : 'border-surface-container-high hover:bg-surface-container-low')}
    >
      {icon && <Icon name={on ? 'check' : icon} className="text-[18px]" />}
      {children}
      {count != null && <span className={cn('text-label-sm', on ? 'opacity-80' : 'text-outline')}>{count}</span>}
    </button>
  );
}
const FEATURE_ICONS = { 'Laptop 16" Sleeve': 'devices', 'IPX5 Waterproof': 'water_drop', 'Trolley Pass-Through': 'luggage', 'RFID Blocking Pocket': 'security', 'Fidlock® Magnetic Fasteners': 'link' };

function useParamState() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const getList = (k) => (params.get(k) ? params.get(k).split(',') : []);
  const update = (changes, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: false });
  };
  const toggleIn = (k, value) => {
    const list = getList(k);
    update({ [k]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });
  };
  return { params, get, getList, update, toggleIn };
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-space-sm">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center justify-between" aria-expanded={open}>
        <span className="text-label-sm uppercase tracking-wider text-outline">{title}</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[16px] text-outline" />
      </button>
      {open && children}
    </div>
  );
}

function Filters({ facets, state, categoryTree, activeCategory }) {
  const { get, getList, update, toggleIn } = state;
  const money = useMoney();
  const [min, setMin] = useState(get('minPrice'));
  const [max, setMax] = useState(get('maxPrice'));
  useEffect(() => {
    setMin(get('minPrice'));
    setMax(get('maxPrice'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.params]);
  const activeCount = FILTER_KEYS.reduce((n, k) => n + (LIST_KEYS.includes(k) ? getList(k).length : get(k) ? 1 : 0), 0);
  const subcats = activeCategory?.children?.length ? activeCategory.children : activeCategory?.parent ? categoryTree?.find((c) => c._id === activeCategory.parent)?.children : null;

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <Icon name="filter_list" className="text-[20px] text-secondary" />
          <span className="text-headline-sm">Filters</span>
        </div>
        {activeCount > 0 && (
          <button type="button" className="text-label-sm text-secondary hover:underline" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])))}>
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {subcats?.length > 0 && (
        <FilterSection title="Category">
          <div className="flex flex-col gap-1">
            {subcats.map((c) => (
              <Link key={c._id} to={`/shop/${c.slug}`} className={cn('flex items-center justify-between py-1 text-body-sm hover:text-secondary', activeCategory?._id === c._id && 'text-secondary font-semibold')}>
                {c.name}
                <span className="text-label-sm text-outline">{c.productCount}</span>
              </Link>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Who is it for?">
        <div className="flex flex-wrap gap-2">
          {WHO.map(([value, label, icon]) => (
            <Chip key={label} icon={icon} on={get('gender') === value} onClick={() => update({ gender: value })}>{label}</Chip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="What will you use it for?">
        <div className="flex flex-wrap gap-2">
          {USES.filter(([value]) => facets?.purposes?.[value] || getList('purpose').includes(value)).map(([value, label, icon]) => (
            <Chip key={value} icon={icon} on={getList('purpose').includes(value)} onClick={() => toggleIn('purpose', value)} count={facets?.purposes?.[value]}>{label}</Chip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Size">
        <div className="flex flex-col gap-1.5">
          {SIZES.map(([value, label, hint]) => {
            const on = getList('size').includes(value);
            const count = facets?.sizes?.[value] || 0;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                disabled={!count && !on}
                onClick={() => toggleIn('size', value)}
                className={cn('flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors disabled:opacity-40', on ? 'border-secondary bg-secondary/10' : 'border-surface-container-high hover:bg-surface-container-low')}
              >
                <Icon name="shopping_bag" className={cn('text-secondary', value === 'small' ? 'text-[16px]' : value === 'medium' ? 'text-[22px]' : 'text-[28px]')} />
                <span className="flex-1">
                  <span className="block text-label-lg">{label}</span>
                  <span className="block text-label-sm font-normal text-outline">{hint}</span>
                </span>
                <span className="text-label-sm text-outline">{count}</span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Price">
        <div className="flex flex-wrap gap-2">
          {PRICE_BANDS.map(([key, lo, hi, label]) => {
            const on = get('minPrice') === lo && get('maxPrice') === hi && (lo || hi);
            return (
              <Chip key={key} on={Boolean(on)} onClick={() => update(on ? { minPrice: '', maxPrice: '' } : { minPrice: lo, maxPrice: hi })} count={facets?.priceBands?.[key] || 0}>
                {label}
              </Chip>
            );
          })}
        </div>
        {facets?.onSale > 0 && (
          <Toggle checked={get('onSale') === 'true'} onChange={(v) => update({ onSale: v ? 'true' : '' })} label={`On sale only (${facets.onSale})`} />
        )}
      </FilterSection>
      <div className="h-px bg-surface-container-high" />

      {facets?.materials?.length > 0 && (
        <FilterSection title="Material" defaultOpen={false}>
          <div className="flex flex-col gap-space-xs">
            {facets.materials.map((m) => (
              <label key={m.value} className="flex items-center gap-space-sm py-1 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded accent-secondary" checked={getList('materials').includes(m.value)} onChange={() => toggleIn('materials', m.value)} />
                <span className="text-body-sm group-hover:text-secondary flex-1">{m.value}</span>
                <span className="text-label-sm text-outline">{String(m.count).padStart(2, '0')}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}
      <div className="h-px bg-surface-container-high" />

      <FilterSection title={`Exact price range (${money.currency.code})`} defaultOpen={false}>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice: min, maxPrice: max });
          }}
        >
          {facets?.price?.max > 0 && (
            <input
              type="range"
              min={Math.floor(facets.price.min)}
              max={Math.ceil(facets.price.max)}
              step={100}
              value={max || Math.ceil(facets.price.max)}
              onChange={(e) => setMax(e.target.value)}
              onMouseUp={() => update({ minPrice: min, maxPrice: max })}
              onTouchEnd={() => update({ minPrice: min, maxPrice: max })}
              className="w-full accent-secondary h-1.5 cursor-pointer"
              aria-label="Maximum price"
            />
          )}
          <div className="flex items-center gap-2">
            <input className="input h-10 min-w-0" inputMode="numeric" placeholder="Min ₹" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} aria-label="Minimum price (INR)" />
            <span className="text-outline">–</span>
            <input className="input h-10 min-w-0" inputMode="numeric" placeholder="Max ₹" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} aria-label="Maximum price (INR)" />
            <button type="submit" className="btn-icon shrink-0 bg-surface-container-low" aria-label="Apply price"><Icon name="check" /></button>
          </div>
          {facets?.price?.max > 0 && (
            <p className="text-label-sm font-normal text-outline">Bags here cost ₹{Math.floor(facets.price.min).toLocaleString('en-IN')} – ₹{Math.ceil(facets.price.max).toLocaleString('en-IN')}</p>
          )}
          {money.isConverted && <p className="text-label-sm font-normal text-outline">Price filter uses INR (store currency).</p>}
        </form>
      </FilterSection>
      <div className="h-px bg-surface-container-high" />

      {facets?.colors?.length > 0 && (
        <FilterSection title="Colour">
          <div className="grid grid-cols-4 gap-space-sm">
            {facets.colors.map((c) => {
              const on = getList('colors').includes(c.value);
              return (
                <button key={c.value} type="button" onClick={() => toggleIn('colors', c.value)} aria-pressed={on} aria-label={`Colour ${c.value}`} className="group flex flex-col items-center gap-1">
                  <span className={cn('w-8 h-8 rounded-full shadow-sm transition-transform group-hover:scale-110 flex items-center justify-center', on && 'ring-2 ring-offset-2 ring-secondary ring-offset-surface-container-lowest')} style={{ background: c.hex }}>
                    {on && <Icon name="check" className="text-[16px] text-white mix-blend-difference" />}
                  </span>
                  <span className="text-label-sm font-normal capitalize">{c.value}</span>
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}
      <div className="h-px bg-surface-container-high" />

      {facets?.features?.length > 0 && (
        <FilterSection title="Features" defaultOpen={false}>
          <div className="flex flex-col gap-space-xs">
            {facets.features.map((f) => (
              <label key={f.value} className="flex items-center gap-space-sm py-1 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded accent-secondary" checked={getList('features').includes(f.value)} onChange={() => toggleIn('features', f.value)} />
                <span className="text-body-sm group-hover:text-secondary flex-1">{f.value}</span>
                <Icon name={FEATURE_ICONS[f.value] || 'check_circle'} className="text-[16px] text-outline" />
              </label>
            ))}
          </div>
        </FilterSection>
      )}
      <div className="h-px bg-surface-container-high" />

      <div className="flex flex-col gap-space-sm">
        <Toggle checked={get('inStock') === 'true'} onChange={(v) => update({ inStock: v ? 'true' : '' })} label="In stock only" />
        <Toggle checked={get('rating') === '4'} onChange={(v) => update({ rating: v ? '4' : '' })} label="Rated 4★ and above" />
      </div>

      <div className="mt-space-sm p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
        <div className="flex items-center gap-1 text-secondary text-label-sm">
          <Icon name="verified" className="text-[18px]" /> WILDTANE GUARANTEE
        </div>
        <p className="text-body-sm text-on-surface-variant">Every bag is backed by our repair-or-replace lifetime commitment.</p>
        <Link to="/pages/warranty" className="text-label-sm hover:text-secondary pt-1 flex items-center gap-1">
          Explore circular programme <Icon name="arrow_forward" className="text-[14px]" />
        </Link>
      </div>
    </div>
  );
}

export default function Shop({ preset }) {
  const { category: categorySlug } = useParams();
  const state = useParamState();
  const { get, getList, update, params } = state;
  const [showFilters, setShowFilters] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [search, setSearch] = useState(get('q'));
  const { data: tree } = useCategories();

  useEffect(() => setSearch(get('q')), [params]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== get('q')) update({ q: search });
    }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const flat = useMemo(() => (tree || []).flatMap((c) => [c, ...c.children]), [tree]);
  const activeCategory = flat.find((c) => c.slug === categorySlug);
  const parent = activeCategory?.parent ? flat.find((c) => c._id === activeCategory.parent) : null;

  const query = useMemo(() => {
    const q = Object.fromEntries(params.entries());
    if (categorySlug) q.category = categorySlug;
    if (preset === 'offers') q.onSale = 'true';
    q.sort = q.sort || 'featured';
    q.limit = 12;
    return q;
  }, [params, categorySlug, preset]);

  const products = useQuery({ queryKey: ['products', query], queryFn: () => api.products(query), placeholderData: keepPreviousData });
  const facets = useQuery({
    queryKey: ['facets', categorySlug, get('q'), get('gender')],
    queryFn: () => api.facets({ category: categorySlug, q: get('q'), gender: get('gender') }),
    select: (d) => d.facets,
    staleTime: 60 * 1000,
  });

  const activeCount = FILTER_KEYS.reduce((n, k) => n + (LIST_KEYS.includes(k) ? getList(k).length : get(k) ? 1 : 0), 0);
  const title = preset === 'offers' ? 'Offers & Archive' : activeCategory?.name || (get('gender') === 'women' ? "Women's Collection" : get('bestseller') ? 'Best Sellers' : get('newArrival') ? 'New Arrivals' : get('q') ? `Results for “${get('q')}”` : 'Everyday & Travel Bags');
  const description = activeCategory?.tagline || (preset === 'offers' ? 'Limited reductions on archived colourways and last-season silhouettes.' : 'Engineered carry gear developed with waterproof laminated weaves, recycled ballistics and anatomic load dispersion.');
  const data = products.data;
  const page = Number(get('page')) || 1;
  const shown = data ? Math.min(data.total, (page - 1) * data.limit + data.items.length) : 0;

  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }];
  if (parent) crumbs.push({ label: parent.name, to: `/shop/${parent.slug}` });
  crumbs.push({ label: title });

  const filters = <Filters facets={facets.data} state={state} categoryTree={tree} activeCategory={activeCategory} />;

  const canonical = categorySlug ? `/shop/${categorySlug}` : preset === 'offers' ? '/offers' : '/shop';
  const filtered = [...FILTER_KEYS, 'q', 'sort', 'page'].some((k) => get(k));

  return (
    <>
      <Seo
        title={activeCategory ? `Buy ${activeCategory.name} Online` : title}
        description={`${description} Shop ${activeCategory?.name?.toLowerCase() || 'bags'} at WILDTANE with free carbon-neutral shipping and lifetime repairs.`}
        canonical={canonical}
        noindex={Boolean(get('q'))}
        jsonLd={[breadcrumbLd(crumbs), ...(data?.items?.length && !filtered ? [itemListLd(data.items)] : [])]}
      />
      <section className="w-full bg-surface-container-lowest">
        <div className="container-x py-space-md flex flex-col gap-space-md">
          <Breadcrumbs items={crumbs} />
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-sm">
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-fixed text-label-sm uppercase tracking-wider">Modular Architecture Series</span>
                <span className="text-label-sm font-normal text-outline">• Series 04</span>
              </div>
              <h1 className="text-headline-xl-mobile md:text-headline-xl">{title}</h1>
              <p className="text-body-md text-on-surface-variant max-w-2xl">
                {description} {data && <>Showing {data.total} handcrafted product{data.total === 1 ? '' : 's'}.</>}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-space-md bg-surface-container-low p-space-sm rounded-xl self-start lg:self-auto">
              {[
                ['Certified', '100% Recycled'],
                ['Warranty', 'Lifetime Guarantee'],
                ['Dispatch', '24h Express'],
              ].map(([k, v], i) => (
                <div key={k} className="flex items-center gap-space-md">
                  {i > 0 && <div className="w-px h-8 bg-surface-container-highest" />}
                  <div className="flex flex-col px-space-sm">
                    <span className="text-label-sm text-outline uppercase">{k}</span>
                    <span className={cn('text-headline-sm', i === 1 && 'text-secondary')}>{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-space-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
            <div className="relative flex-1 max-w-md">
              <label className="sr-only" htmlFor="catalog-search">Search the catalogue</label>
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
              <input id="catalog-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Cordura, duffle, 24L, waterproof..." className="input pl-10" />
            </div>
            <div className="flex flex-wrap items-center gap-space-sm justify-between md:justify-end">
              <button
                type="button"
                onClick={() => (window.matchMedia('(min-width: 1024px)').matches ? setShowFilters((s) => !s) : setMobileFilters(true))}
                aria-expanded={showFilters}
                className="btn-primary"
              >
                <Icon name="tune" className="text-[18px]" /> Filters
                {activeCount > 0 && <span className="ml-1 px-1.5 rounded-full bg-secondary text-on-secondary text-label-sm">{activeCount}</span>}
              </button>
              <SortMenu value={query.sort} options={SORTS} onChange={(v) => update({ sort: v === 'featured' ? '' : v })} />
            </div>
          </div>

          <div className="flex items-center gap-space-xs overflow-x-auto pb-1 scrollbar-none">
            <span className="text-label-sm text-outline uppercase tracking-wider whitespace-nowrap mr-2">Quick tags:</span>
            <button
              type="button"
              onClick={() => update({ features: '', materials: '', q: '', colors: '' })}
              className={cn('chip', !activeCount && !get('q') ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}
            >
              All essentials
            </button>
            {QUICK_TAGS.map((t) => {
              const on = t.key === 'q' ? get('q') === t.value : getList(t.key).includes(t.value);
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => (t.key === 'q' ? update({ q: on ? '' : t.value }) : state.toggleIn(t.key, t.value))}
                  className={cn('chip', on ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}
                  aria-pressed={on}
                >
                  {t.icon && <Icon name={t.icon} className={cn('text-[14px]', !on && 'text-secondary')} />} {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container-x py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
          {showFilters && (
            <aside className="hidden lg:flex lg:col-span-3 flex-col lg:sticky lg:top-32 card p-space-lg max-h-[calc(100vh-9rem)] overflow-y-auto scrollbar-none" aria-label="Filters">
              {filters}
            </aside>
          )}
          <section className={cn('flex flex-col gap-space-xl', showFilters ? 'lg:col-span-9' : 'lg:col-span-12')}>
            {products.isError ? (
              <ErrorState error={products.error} onRetry={products.refetch} />
            ) : data && data.items.length === 0 ? (
              <EmptyState
                icon="search_off"
                title="No gear matches those filters"
                description="Try removing a filter or searching for something broader."
                action={
                  <button type="button" className="btn-primary" onClick={() => update(Object.fromEntries([...FILTER_KEYS, 'q', 'purpose', 'gender'].map((k) => [k, ''])))}>
                    Clear filters
                  </button>
                }
              />
            ) : (
              <div className={cn('transition-opacity', products.isPlaceholderData && 'opacity-60')}>
                <ProductGrid products={data?.items || []} loading={!data} count={6} className={showFilters ? 'lg:grid-cols-2 xl:grid-cols-3' : ''} />
              </div>
            )}
            {data && data.total > 0 && (
              <div className="flex flex-col items-center gap-space-md pt-space-md">
                <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                  <span className="text-label-md text-on-surface-variant">Showing {shown} of {data.total} products</span>
                  <div className="w-full h-1 rounded-full bg-surface-container-high overflow-hidden">
                    <div className="h-full bg-secondary transition-all" style={{ width: `${(shown / data.total) * 100}%` }} />
                  </div>
                </div>
                <Pagination
                  page={data.page}
                  pages={data.pages}
                  onChange={(p) => {
                    update({ page: p }, { resetPage: false });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <Drawer open={mobileFilters} onClose={() => setMobileFilters(false)} side="left" title="Filters" width="max-w-sm" footer={<button type="button" className="btn-primary w-full" onClick={() => setMobileFilters(false)}>Show {data?.total ?? ''} results</button>}>
        <div className="p-space-lg">{filters}</div>
      </Drawer>
    </>
  );
}
