import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { setSearchOpen } from '../../store';
import { useMoney } from '../../hooks/useStore';
import { cn } from '../../lib/format';
import { Icon, Img, Modal, Spinner } from '../ui';

const TRENDING_SEARCHES = [
  { text: 'Laptop Backpacks', icon: 'backpack' },
  { text: 'Cabin Trolley', icon: 'luggage' },
  { text: 'Leather Totes', icon: 'shopping_bag' },
  { text: 'Travel Duffles', icon: 'work' },
  { text: 'Wallets & Cardholders', icon: 'wallet' },
  { text: 'Waterproof Bags', icon: 'water_drop' },
  { text: 'Mega Sale Drops', icon: 'sell' },
];

function useDebounced(value, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SearchModal() {
  const open = useSelector((s) => s.ui.searchOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const money = useMoney();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const term = useDebounced(q.trim());

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', term],
    queryFn: () => api.suggest(term),
    enabled: open && term.length >= 2,
  });

  const close = () => dispatch(setSearchOpen(false));

  useEffect(() => {
    if (!open) {
      setQ('');
      setActive(-1);
    }
  }, [open]);

  // Lock body scroll on mobile when full screen search is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const products = data?.products || [];
  const categories = data?.categories || [];
  const results = [
    ...products.map((p) => ({ type: 'p', item: p, to: `/product/${p.slug}` })),
    ...categories.map((c) => ({ type: 'c', item: c, to: `/shop/${c.slug}` })),
  ];

  const go = (to) => {
    close();
    navigate(to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && results[active]) go(results[active].to);
      else if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* ── MOBILE VIEW (< md): FLIPKART FULL-SCREEN SEARCH APP EXPERIENCE ── */}
      <div className="md:hidden fixed inset-0 z-[100] bg-surface flex flex-col animate-fade-in">
        {/* Flipkart Mobile Search Top Bar */}
        <div className="px-3 py-2 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center gap-2 shadow-xs">
          <button
            type="button"
            onClick={close}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface active:scale-90 transition-transform shrink-0"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search for Bags, Backpacks, Luggage..."
              className="w-full h-10 pl-3 pr-9 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:border-secondary transition-colors"
              aria-label="Search"
            />
            {q.length > 0 ? (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2.5 w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-outline active:scale-90"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            ) : (
              <Icon name="mic" className="absolute right-2.5 text-[18px] text-outline pointer-events-none" />
            )}
          </div>

          {q.trim() && (
            <button
              type="button"
              onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)}
              className="px-2.5 py-1.5 rounded-lg bg-secondary text-on-secondary text-[12px] font-bold shrink-0 active:scale-95"
            >
              Search
            </button>
          )}
        </div>

        {/* Mobile Search Results Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none flex flex-col">
          {term.length < 2 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-outline flex items-center gap-1">
                  <Icon name="trending_up" className="text-[15px] text-secondary" /> Popular on WILDTANE
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_SEARCHES.map((t) => (
                  <button
                    key={t.text}
                    type="button"
                    onClick={() => go(`/shop?q=${encodeURIComponent(t.text)}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-[12px] font-semibold text-on-surface active:bg-surface-container transition-colors shadow-xs"
                  >
                    <Icon name={t.icon} className="text-[15px] text-secondary" />
                    <span>{t.text}</span>
                  </button>
                ))}
              </div>

              {/* Flipkart-Style Value Banner */}
              <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border border-outline-variant/20 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Icon name="bolt" className="text-[18px]" />
                </span>
                <div className="flex flex-col">
                  <span className="text-[12px] font-black text-on-surface">Explore Mega Festive Offers</span>
                  <span className="text-[10px] text-outline">Up to 50% off on premium travel carry</span>
                </div>
              </div>
            </div>
          ) : isFetching ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-outline">
              <Spinner className="text-secondary" />
              <span className="text-[12px]">Searching collections...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-2">
              <span className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                <Icon name="search_off" className="text-[24px]" />
              </span>
              <p className="text-[15px] font-bold text-on-surface">No matches for “{term}”</p>
              <p className="text-[12px] text-outline max-w-xs">
                Try searching for 'Backpack', 'Duffle', 'Tote', or 'Cabin'.
              </p>
              <button
                type="button"
                onClick={() => go('/shop')}
                className="mt-2 px-4 py-2 rounded-xl bg-secondary text-on-secondary text-[12px] font-bold shadow-xs active:scale-95"
              >
                Browse All Bags
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-outline-variant/20">
              {results.map((r, i) =>
                r.type === 'p' ? (
                  <button
                    key={r.item._id}
                    type="button"
                    onClick={() => go(r.to)}
                    className="flex items-center gap-3 py-2.5 text-left active:bg-surface-container-low transition-colors"
                  >
                    <Img
                      src={r.item.images?.[0]?.url}
                      alt={r.item.name}
                      w={120}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-surface-container-low border border-outline-variant/20"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-bold text-on-surface line-clamp-1 block">
                        {r.item.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-700 text-white text-[9px] font-bold">
                          {(r.item.ratingAverage || 4.6).toFixed(1)} <Icon name="star" fill className="text-[8px]" />
                        </span>
                        <span className="text-[10px] text-outline font-medium truncate">
                          {r.item.category?.name || 'Bags'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[12.5px] font-black text-on-surface block">
                        {money(r.item.finalPrice ?? r.item.price)}
                      </span>
                      <span className="text-[8.5px] font-bold text-emerald-600 block">
                        Free Delivery
                      </span>
                    </div>
                    <Icon name="chevron_right" className="text-[16px] text-outline" />
                  </button>
                ) : (
                  <button
                    key={r.item._id}
                    type="button"
                    onClick={() => go(r.to)}
                    className="flex items-center gap-3 py-2.5 text-left active:bg-surface-container-low transition-colors"
                  >
                    <span className="w-10 h-10 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                      <Icon name="category" className="text-[20px]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12.5px] font-bold text-on-surface block">
                        {r.item.name}
                      </span>
                      <span className="text-[10px] text-outline">Category</span>
                    </div>
                    <Icon name="chevron_right" className="text-[16px] text-outline" />
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Sticky Mobile Search Action Pill */}
        {q.trim() && (
          <div className="p-2.5 bg-surface-container-lowest border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)}
              className="w-full h-11 rounded-xl bg-secondary text-on-secondary font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
            >
              See all results for “{q.trim()}” <Icon name="arrow_forward" className="text-[16px]" />
            </button>
          </div>
        )}
      </div>

      {/* ── LAPTOP & DESKTOP VIEW (>= md): ORIGINAL DESKTOP MODAL INTACT ── */}
      <div className="hidden md:block">
        <Modal open={open} onClose={close} size="lg" hideClose className="sm:mt-[-10vh]">
          <div className="flex items-center gap-3 border-b border-surface-container-high pb-space-md -mt-1">
            <Icon name="search" className="text-outline" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search Cordura, duffle, 24L, waterproof..."
              className="flex-1 bg-transparent text-body-xl focus:outline-none placeholder:text-outline"
              aria-label="Search products"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results-desktop"
              aria-activedescendant={active >= 0 ? `sr-desk-${active}` : undefined}
            />
            {isFetching && <Spinner className="text-secondary" />}
            <button type="button" onClick={close} className="text-label-sm px-2 py-1 rounded bg-surface-container-highest text-on-surface-variant">ESC</button>
          </div>

          <div id="search-results-desktop" role="listbox" className="pt-space-md min-h-[200px]">
            {term.length < 2 ? (
              <div className="flex flex-col gap-space-sm">
                <span className="text-label-sm uppercase tracking-wider text-outline">Quick tags</span>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((t) => (
                    <button key={t.text} type="button" onClick={() => go(`/shop?q=${encodeURIComponent(t.text)}`)} className="chip bg-surface-container-low hover:bg-surface-container-high">
                      {t.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : !isFetching && results.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-headline-sm">No matches for “{term}”</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Try a material, a size like 24L, or a category.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {products.length > 0 && <span className="text-label-sm uppercase tracking-wider text-outline mb-1">Products</span>}
                {results.map((r, i) =>
                  r.type === 'p' ? (
                    <button
                      key={r.item._id}
                      id={`sr-desk-${i}`}
                      role="option"
                      aria-selected={active === i}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.to)}
                      className={cn('flex items-center gap-3 p-2 rounded-lg text-left', active === i ? 'bg-surface-container-low' : '')}
                    >
                      <Img src={r.item.images?.[0]?.url} alt="" className="w-12 h-12 rounded-lg shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-label-lg truncate">{r.item.name}</span>
                        <span className="block text-label-sm text-outline uppercase">{r.item.tagline}</span>
                      </span>
                      <span className="text-price-md">{money(r.item.finalPrice)}</span>
                    </button>
                  ) : (
                    <button
                      key={r.item._id}
                      id={`sr-desk-${i}`}
                      role="option"
                      aria-selected={active === i}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.to)}
                      className={cn('flex items-center gap-3 p-2 rounded-lg text-left', active === i ? 'bg-surface-container-low' : '')}
                    >
                      <span className="w-12 h-12 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center"><Icon name="category" /></span>
                      <span className="text-label-lg">{r.item.name}</span>
                      <span className="ml-auto text-label-sm text-outline">Category</span>
                    </button>
                  )
                )}
                {q.trim() && (
                  <button type="button" onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)} className="mt-2 flex items-center gap-2 p-2 text-label-lg text-secondary hover:underline">
                    See all results for “{q.trim()}” <Icon name="arrow_forward" className="text-[16px]" />
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </>
  );
}
