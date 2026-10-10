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
  const [threshold, setThreshold] = useState(product.lowStockThreshold || 10);

  useEffect(() => {
    setDraft({});
    setThreshold(product.lowStockThreshold || 10);
  }, [product]);

  const dirtyVariants = Object.keys(draft).length > 0;
  const dirtyThreshold = threshold !== (product.lowStockThreshold || 10);
  const dirty = dirtyVariants || dirtyThreshold;

  const save = useMutation({
    mutationFn: () => {
      const variantsPayload = Object.entries(draft).map(([_id, stock]) => ({ _id, stock: Number(stock) }));
      // If only threshold was changed, supply existing variant stocks
      const finalVariants = variantsPayload.length > 0 
        ? variantsPayload 
        : product.variants.map((v) => ({ _id: v._id, stock: v.stock }));
      return adminApi.updateStock(product._id, finalVariants, threshold);
    },
    onSuccess: () => {
      toast.success(`Inventory updated for ${product.name}`);
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const restockAll = (amount) => {
    const next = { ...draft };
    product.variants.forEach((v) => {
      const current = next[v._id] ?? v.stock;
      next[v._id] = (Number(current) || 0) + amount;
    });
    setDraft(next);
  };

  const totalStock = product.variants.reduce((sum, v) => sum + (draft[v._id] ?? v.stock), 0);

  return (
    <div className="card p-space-md md:p-space-lg flex flex-col gap-space-md border border-surface-container-high/80 hover:border-outline/40 transition-colors">
      {/* Top Product Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
        <div className="flex items-center gap-3 min-w-0">
          <Img src={product.images?.[0]?.url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-surface-container-highest" />
          <div className="min-w-0">
            <Link to={`/admin/products/${product._id}`} className="text-label-lg md:text-title-sm hover:text-secondary truncate block font-bold">
              {product.name}
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-label-sm font-mono text-outline">SKU: {product.sku}</span>
              <span className="text-outline">·</span>
              <StockPill product={{ ...product, stock: totalStock }} />
              <span className="text-outline">·</span>
              <span className="text-label-sm font-semibold text-on-surface">
                Total: <strong className="font-mono">{totalStock}</strong> units
              </span>
            </div>
          </div>
        </div>

        {/* Global Product Actions & Threshold Config */}
        <div className="flex items-center gap-2 flex-wrap sm:self-center">
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-low text-[12px] text-on-surface-variant border border-surface-container-high" title="Set low-stock alert threshold for this product">
            <Icon name="tune" className="text-[15px] text-secondary" />
            <span className="whitespace-nowrap">Alert when ≤</span>
            <input
              type="number"
              min={1}
              max={500}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-12 h-6 px-1 text-center font-bold font-mono rounded bg-surface border border-outline-variant text-[12px]"
            />
          </label>

          <button
            type="button"
            onClick={() => restockAll(10)}
            className="btn-tonal btn-sm text-[12px] py-1 px-2.5 h-8 gap-1 font-semibold"
            title="Add +10 units to every variant"
          >
            <Icon name="add" className="text-[14px]" /> Restock All (+10)
          </button>

          {dirty && (
            <Button variant="tonal" size="sm" className="h-8 py-1 text-[12px]" onClick={() => { setDraft({}); setThreshold(product.lowStockThreshold || 10); }}>
              Reset
            </Button>
          )}

          <Button
            size="sm"
            className="h-8 py-1 text-[12px] px-3 font-bold"
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            Save Stock
          </Button>
        </div>
      </div>

      {/* Variants Inventory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {product.variants.map((v) => {
          const value = draft[v._id] ?? v.stock;
          const numVal = Number(value);
          const isOut = numVal <= 0;
          const isCritical = numVal > 0 && numVal <= 5;
          const isLow = numVal > 5 && numVal <= threshold;
          const isHealthy = numVal > threshold;

          // Health progress bar percentage (scaled against 40 for relative visualization)
          const barPercent = isOut ? 0 : Math.min(100, Math.max(10, Math.round((numVal / Math.max(threshold * 2, 30)) * 100)));

          return (
            <div
              key={v._id}
              className={cn(
                'flex flex-col gap-2 p-3 rounded-2xl border transition-all',
                isOut
                  ? 'bg-rose-500/5 border-rose-500/20'
                  : isCritical
                  ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20'
                  : isLow
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-surface-container-low border-surface-container-high'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full shrink-0 ring-1 ring-outline-variant shadow-xs" style={{ background: v.colorHex }} />
                  <div className="min-w-0 leading-tight">
                    <span className="text-label-md font-bold truncate block">{v.name}</span>
                    <span className="text-[11px] font-mono text-outline truncate block">{v.sku}</span>
                  </div>
                </div>

                {/* Status Badges */}
                {isOut ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                    Out of Stock
                  </span>
                ) : isCritical ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs flex items-center gap-1">
                    🔥 Critical ({numVal})
                  </span>
                ) : isLow ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    ⚡ Low ({numVal})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    ✓ In Stock ({numVal})
                  </span>
                )}
              </div>

              {/* Stock Bar */}
              <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    isOut ? 'w-0' : isCritical ? 'bg-rose-600' : isLow ? 'bg-amber-500' : 'bg-emerald-600'
                  )}
                  style={{ width: `${barPercent}%` }}
                />
              </div>

              {/* Quantity Inputs & Quick Increment Actions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-container-high/60">
                <div className="flex items-center gap-1">
                  {[5, 10, 20, 50].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      title={`Add ${inc} units`}
                      onClick={() => setDraft({ ...draft, [v._id]: (Number(value) || 0) + inc })}
                      className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-surface-container hover:bg-secondary hover:text-on-secondary text-secondary transition-colors cursor-pointer"
                    >
                      +{inc}
                    </button>
                  ))}
                  <button
                    type="button"
                    title="Set stock to 0"
                    onClick={() => setDraft({ ...draft, [v._id]: 0 })}
                    className="px-1.5 py-0.5 rounded text-[10.5px] font-semibold text-outline hover:text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                  >
                    0
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-outline">Qty:</span>
                  <input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) => setDraft({ ...draft, [v._id]: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                    className="input h-8 w-16 text-right font-mono font-bold text-[13px] rounded-lg"
                    aria-label={`Stock for ${v.name}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Inventory() {
  const [p, set] = useListParams({ page: '1' });
  const qc = useQueryClient();
  const summary = useQuery({ queryKey: ['admin', 'inventory-summary'], queryFn: adminApi.inventorySummary, select: (d) => d.summary });
  const list = useQuery({ queryKey: ['admin', 'inventory', p], queryFn: () => adminApi.products({ ...p, sort: p.sort || 'stock-low', limit: 12 }), placeholderData: keepPreviousData });

  const quickRestock = useMutation({
    mutationFn: ({ productId, variantId, currentStock, amount }) => {
      return adminApi.updateStock(productId, [{ _id: variantId, stock: currentStock + amount }]);
    },
    onSuccess: () => {
      toast.success('Quick restock applied!');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const urgentItems = summary.data?.urgentItems || [];

  return (
    <>
      <PageHeader
        title="Stock & Inventory Management"
        subtitle="Manage product variant stock, set automatic low-inventory alert thresholds, and monitor live inventory health."
      />

      {/* Top Urgent Stock Alert Showcase Div */}
      {urgentItems.length > 0 && (
        <div className="mb-space-lg p-space-md md:p-space-lg rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-500/30 ring-1 ring-rose-500/15 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Icon name="warning" className="text-[18px]" />
              </span>
              <div>
                <h3 className="text-label-lg font-bold text-on-surface flex items-center gap-2">
                  Immediate Restock Required
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                    {urgentItems.length} urgent {urgentItems.length === 1 ? 'item' : 'items'}
                  </span>
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  These items have critically low stock or are sold out. Restock now to prevent missed orders.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => set({ stockStatus: 'low' })}
              className="btn-tonal btn-sm text-[12px] font-bold gap-1"
            >
              Filter All Low Stock <Icon name="arrow_forward" className="text-[14px]" />
            </button>
          </div>

          {/* Urgent items horizontal rail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-1">
            {urgentItems.slice(0, 4).map((item) => (
              <div key={item._id} className="p-2.5 rounded-xl bg-surface/90 border border-surface-container-high flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold truncate leading-tight">{item.name}</p>
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      {item.stock === 0 ? 'Out of stock' : `Only ${item.stock} left`}
                    </p>
                  </div>
                </div>
                {item.variants?.[0] && (
                  <button
                    type="button"
                    disabled={quickRestock.isPending}
                    onClick={() => quickRestock.mutate({ productId: item._id, variantId: item.variants[0]._id, currentStock: item.variants[0].stock, amount: 20 })}
                    className="px-2 py-1 rounded-lg bg-secondary text-on-secondary text-[11px] font-bold shrink-0 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    title="Add 20 units to first variant"
                  >
                    +20 Stock
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-md mb-space-lg">
        {summary.isLoading
          ? [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : [
              ['inventory_2', 'Units on Hand', summary.data ? summary.data.units.toLocaleString('en-IN') : '—', '', 'bg-secondary-container text-on-secondary-fixed'],
              ['account_balance', 'Stock Value', summary.data ? formatINR(summary.data.value) : '—', '', 'bg-surface-container-high text-secondary'],
              ['error', 'Out of Stock', summary.data?.outOfStock ?? 0, 'out', 'bg-rose-500/20 text-rose-700 dark:text-rose-300'],
              ['local_fire_department', 'Critical (≤5)', summary.data?.criticalStock ?? 0, 'low', 'bg-rose-600 text-white'],
              ['warning', 'Low Stock', summary.data?.lowStock ?? 0, 'low', 'bg-amber-500/20 text-amber-700 dark:text-amber-300'],
            ].map(([icon, label, value, filter, colorClass]) => (
              <button
                key={label}
                type="button"
                onClick={() => filter && set({ stockStatus: p.stockStatus === filter ? '' : filter })}
                className={cn(
                  'card p-space-md flex items-center gap-3 text-left transition-all',
                  filter && 'hover:-translate-y-0.5 hover:shadow-lift cursor-pointer',
                  p.stockStatus === filter && filter && 'ring-2 ring-secondary'
                )}
              >
                <span className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs', colorClass)}>
                  <Icon name={icon} className="text-[22px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-headline-sm font-bold truncate">{value}</p>
                  <p className="text-label-sm font-normal text-outline truncate">{label}</p>
                </div>
              </button>
            ))}
      </div>

      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search product name or SKU…" />
        <FilterSelect
          label="Stock Status"
          value={p.stockStatus}
          onChange={(v) => set({ stockStatus: v })}
          options={[
            ['', 'All Products'],
            ['low', 'Low Stock (≤ Threshold)'],
            ['out', 'Out of Stock (0 Units)'],
          ]}
        />
      </Toolbar>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="All stock levels healthy"
          description="No products match the selected stock filter."
        />
      ) : (
        <div className="flex flex-col gap-space-md">
          {list.data.items.map((prod) => (
            <StockRow key={prod._id} product={prod} />
          ))}
        </div>
      )}

      <Pagination className="mt-space-md" page={list.data?.page} pages={list.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
