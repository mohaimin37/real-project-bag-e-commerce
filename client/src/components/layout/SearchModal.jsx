import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { setSearchOpen } from '../../store';
import { useMoney } from '../../hooks/useStore';
import { cn } from '../../lib/format';
import { Icon, Img, Modal, Spinner } from '../ui';

const QUICK = ['Waterproof', 'Laptop', 'Leather', 'Duffle', 'Sling', 'Cabin approved'];

function useDebounced(value, ms = 250) {
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
  const { data, isFetching } = useQuery({ queryKey: ['suggest', term], queryFn: () => api.suggest(term), enabled: open && term.length >= 2 });

  const close = () => dispatch(setSearchOpen(false));
  useEffect(() => {
    if (!open) {
      setQ('');
      setActive(-1);
    }
  }, [open]);

  const products = data?.products || [];
  const categories = data?.categories || [];
  const results = [...products.map((p) => ({ type: 'p', item: p, to: `/product/${p.slug}` })), ...categories.map((c) => ({ type: 'c', item: c, to: `/shop/${c.slug}` }))];

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

  return (
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
          aria-controls="search-results"
          aria-activedescendant={active >= 0 ? `sr-${active}` : undefined}
        />
        {isFetching && <Spinner className="text-secondary" />}
        <button type="button" onClick={close} className="text-label-sm px-2 py-1 rounded bg-surface-container-highest text-on-surface-variant">ESC</button>
      </div>

      <div id="search-results" role="listbox" className="pt-space-md min-h-[200px]">
        {term.length < 2 ? (
          <div className="flex flex-col gap-space-sm">
            <span className="text-label-sm uppercase tracking-wider text-outline">Quick tags</span>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((t) => (
                <button key={t} type="button" onClick={() => go(`/shop?q=${encodeURIComponent(t)}`)} className="chip bg-surface-container-low hover:bg-surface-container-high">
                  {t}
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
                  id={`sr-${i}`}
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
                  id={`sr-${i}`}
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
  );
}
