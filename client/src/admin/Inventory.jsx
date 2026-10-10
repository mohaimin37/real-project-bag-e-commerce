import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatINR } from '../lib/format';
import { Button, EmptyState, ErrorState, Icon, Img, Pagination, Skeleton } from '../components/ui';
import { FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';
import { StockPill } from './Products';

function StockRow({ product }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({});
  useEffect(() => setDraft({}), [product]);
  const dirty = Object.keys(draft).length > 0;
  const save = useMutation({
    mutationFn: () => adminApi.updateStock(product._id, Object.entries(draft).map(([_id, stock]) => ({ _id, stock: Number(stock) }))),
    onSuccess: () => {
      toast.success(`Stock updated for ${product.name}`);
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="card p-space-md flex flex-col lg:flex-row lg:items-center gap-space-md">
      <div className="flex items-center gap-3 lg:w-72 shrink-0">
        <Img src={product.images?.[0]?.url} alt="" className="w-12 h-12 rounded-lg shrink-0" />
        <div className="min-w-0">
          <Link to={`/admin/products/${product._id}`} className="text-label-lg hover:text-secondary truncate block">{product.name}</Link>
          <div className="flex items-center gap-2 mt-0.5"><StockPill product={product} /></div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {product.variants.map((v) => {
          const value = draft[v._id] ?? v.stock;
          const low = Number(value) <= product.lowStockThreshold;
          return (
            <label key={v._id} className={cn('flex items-center gap-2 p-2 rounded-xl', low ? 'bg-tertiary-fixed/40' : 'bg-surface-container-low')}>
              <span className="w-5 h-5 rounded-full shrink-0 ring-1 ring-outline-variant" style={{ background: v.colorHex }} />
              <span className="flex-1 min-w-0">
                <span className="block text-label-md truncate">{v.name}</span>
                <span className="block text-label-sm font-normal text-outline truncate">{v.sku}</span>
              </span>
              <input
                type="number"
                min={0}
                value={value}
                onChange={(e) => setDraft({ ...draft, [v._id]: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="input h-9 w-20 text-right tabular-nums"
                aria-label={`Stock for ${v.name}`}
              />
            </label>
          );
        })}
      </div>
      <div className="flex gap-2 lg:w-40 justify-end">
        {dirty && <Button variant="tonal" size="sm" onClick={() => setDraft({})}>Reset</Button>}
        <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [p, set] = useListParams({ page: '1' });
  const summary = useQuery({ queryKey: ['admin', 'inventory-summary'], queryFn: adminApi.inventorySummary, select: (d) => d.summary });
  const list = useQuery({ queryKey: ['admin', 'inventory', p], queryFn: () => adminApi.products({ ...p, sort: p.sort || 'stock-low', limit: 10 }), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock is tracked per variant and reduced automatically when orders are placed." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
        {summary.isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : [
              // A failed summary shows dashes instead of crashing the page; the list below has its own retry.
              ['inventory_2', 'Units on hand', summary.data ? summary.data.units.toLocaleString('en-IN') : '—', ''],
              ['account_balance', 'Stock value', summary.data ? formatINR(summary.data.value) : '—', ''],
              ['warning', 'Low stock', summary.data?.lowStock ?? '—', 'low'],
              ['remove_shopping_cart', 'Out of stock', summary.data?.outOfStock ?? '—', 'out'],
            ].map(([icon, label, value, filter]) => (
              <button key={label} type="button" onClick={() => filter && set({ stockStatus: p.stockStatus === filter ? '' : filter })} className={cn('card p-space-md flex items-center gap-3 text-left transition-all', filter && 'hover:-translate-y-0.5 hover:shadow-lift', p.stockStatus === filter && filter && 'ring-2 ring-secondary')}>
                <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center', filter === 'out' ? 'bg-error-container text-on-error-container' : filter === 'low' ? 'bg-tertiary-fixed text-tertiary-container' : 'bg-secondary-container text-on-secondary-fixed')}><Icon name={icon} /></span>
                <div><p className="text-headline-sm">{value}</p><p className="text-label-sm font-normal text-outline">{label}</p></div>
              </button>
            ))}
      </div>
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search product or SKU…" />
        <FilterSelect label="Stock" value={p.stockStatus} onChange={(v) => set({ stockStatus: v })} options={[['', 'All products'], ['low', 'Low stock'], ['out', 'Out of stock']]} />
      </Toolbar>
      {list.isError ? <ErrorState error={list.error} onRetry={list.refetch} /> : list.isLoading ? (
        <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="check_circle" title="Nothing to restock" description="No products match this filter." />
      ) : (
        <div className="flex flex-col gap-space-sm">{list.data.items.map((prod) => <StockRow key={prod._id} product={prod} />)}</div>
      )}
      <Pagination className="mt-space-md" page={list.data?.page} pages={list.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
