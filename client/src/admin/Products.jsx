import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatINR } from '../lib/format';
import { useCategories } from '../hooks/useStore';
import { Badge, EmptyState, Icon, Img, Pagination, Toggle, useConfirm } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

// Audience decides where a product is listed: /men, /women or /unisex.
const GENDER_LABEL = { men: 'Men', women: 'Women', unisex: 'Unisex' };

export function StockPill({ product }) {
  const s = product.stock;
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-label-md', s === 0 ? 'bg-error-container text-on-error-container' : s <= product.lowStockThreshold ? 'bg-tertiary-fixed text-tertiary-container' : 'bg-secondary-container/60 text-on-secondary-container')}>
      {s === 0 ? 'Out of stock' : `${s} in stock`}
    </span>
  );
}

export default function Products() {
  const [p, set] = useListParams({ page: '1' });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: cats } = useCategories();
  const query = useQuery({ queryKey: ['admin', 'products', p], queryFn: () => adminApi.products({ ...p, limit: 15 }), placeholderData: keepPreviousData });

  const flag = useMutation({
    mutationFn: ({ id, flag: f, value }) => adminApi.productFlag(id, f, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (r) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <Img src={r.images?.[0]?.url} alt="" className="w-11 h-11 rounded-lg shrink-0" />
          <div className="min-w-0">
            <Link to={`/admin/products/${r._id}`} className="text-label-lg hover:text-secondary truncate block" onClick={(e) => e.stopPropagation()}>{r.name}</Link>
            <p className="text-label-sm font-normal text-outline">{r.sku} · {r.variants.length} variant{r.variants.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <span className="text-on-surface-variant whitespace-nowrap">{r.subcategory?.name || r.category?.name}</span> },
    {
      key: 'gender',
      header: 'For',
      render: (r) => <Badge tone={r.gender === 'men' ? 'dark' : r.gender === 'women' ? 'amber' : 'neutral'}>{GENDER_LABEL[r.gender] || 'Unisex'}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (r) => (
        <div className="whitespace-nowrap">
          <span className="text-label-lg">{formatINR(r.finalPrice)}</span>
          {r.finalPrice < r.price && <span className="block text-label-sm font-normal text-outline line-through">{formatINR(r.price)}</span>}
        </div>
      ),
    },
    { key: 'stock', header: 'Stock', render: (r) => <StockPill product={r} /> },
    { key: 'sold', header: 'Sold', align: 'right', render: (r) => r.soldCount },
    {
      key: 'flags',
      header: 'Labels',
      render: (r) => (
        <div className="flex gap-1 flex-wrap max-w-[180px]">
          {r.isFeatured && <Badge tone="dark">Featured</Badge>}
          {r.isBestseller && <Badge tone="teal">Best</Badge>}
          {r.isNewArrival && <Badge tone="mint">New</Badge>}
        </div>
      ),
    },
    {
      key: 'visible',
      header: 'Visible',
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle checked={r.isVisible} onChange={(v) => flag.mutate({ id: r._id, flag: 'isVisible', value: v })} />
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <a href={`/product/${r.slug}`} target="_blank" rel="noreferrer" className="btn-icon w-8 h-8" aria-label="View in store"><Icon name="open_in_new" className="text-[18px]" /></a>
          <Link to={`/admin/products/${r._id}`} className="btn-icon w-8 h-8" aria-label="Edit"><Icon name="edit" className="text-[18px]" /></Link>
          <button
            type="button"
            className="btn-icon w-8 h-8 hover:text-error"
            aria-label="Delete"
            onClick={async () => {
              if (await confirm({ title: `Delete ${r.name}?`, message: 'The product, its images and reviews will be permanently removed. Past orders keep their snapshot.', confirmLabel: 'Delete product' })) remove.mutate(r._id);
            }}
          >
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      ),
    },
  ];

  const catOptions = [['', 'All categories'], ...(cats || []).flatMap((c) => [[c.slug, c.name], ...c.children.map((s) => [s.slug, `— ${s.name}`])])];

  return (
    <>
      <PageHeader title="Products" subtitle={query.data ? `${query.data.total} products in the catalogue` : ' '} actions={<Link to="/admin/products/new" className="btn-primary"><Icon name="add" className="text-[18px]" /> New product</Link>} />
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search name or SKU…" />
        <FilterSelect label="Category" value={p.category} onChange={(v) => set({ category: v })} options={catOptions} />
        <FilterSelect label="For" value={p.gender} onChange={(v) => set({ gender: v })} options={[['', 'All audiences'], ['men', 'Men'], ['women', 'Women'], ['unisex', 'Unisex']]} />
        <FilterSelect label="Visibility" value={p.visibility} onChange={(v) => set({ visibility: v })} options={[['', 'Any visibility'], ['visible', 'Visible'], ['hidden', 'Hidden']]} />
        <FilterSelect label="Stock" value={p.stockStatus} onChange={(v) => set({ stockStatus: v })} options={[['', 'Any stock'], ['low', 'Low stock'], ['out', 'Out of stock']]} />
        <FilterSelect label="Sort" value={p.sort} onChange={(v) => set({ sort: v })} options={[['', 'Newest first'], ['name', 'Name A–Z'], ['bestseller', 'Best selling'], ['price-high', 'Price high–low'], ['stock-low', 'Stock low–high']]} />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.items || []}
        loading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        onRowClick={(r) => navigate(`/admin/products/${r._id}`)}
        empty={<EmptyState icon="inventory_2" title="No products found" description="Try a different search or filter." />}
      />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
