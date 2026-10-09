import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDate } from '../lib/format';
import { Badge, EmptyState, ErrorState, Icon, Img, Pagination, Skeleton, Stars, Toggle, useConfirm } from '../components/ui';
import { FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

const TABS = [
  ['pending', 'Pending', 'hourglass_top'],
  ['approved', 'Approved', 'check_circle'],
  ['rejected', 'Rejected', 'block'],
  ['hidden', 'Hidden', 'visibility_off'],
  ['all', 'All', 'reviews'], // explicit value: an empty one would fall back to the "pending" default
];
const TONE = { approved: 'teal', pending: 'amber', rejected: 'danger', hidden: 'neutral' };

export default function Reviews() {
  const [p, set] = useListParams({ page: '1', status: 'pending' });
  const qc = useQueryClient();
  const confirm = useConfirm();
  const query = useQuery({ queryKey: ['admin', 'reviews', p], queryFn: () => adminApi.reviews({ ...p, limit: 12 }), placeholderData: keepPreviousData });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    qc.invalidateQueries({ queryKey: ['featured-reviews'] });
  };
  const update = useMutation({
    mutationFn: ({ id, ...body }) => adminApi.updateReview(id, body),
    onSuccess: (_, body) => {
      toast.success(body.showOnHome === true ? 'Now featured on the homepage' : body.showOnHome === false ? 'Removed from the homepage' : `Review ${body.status}`);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteReview,
    onSuccess: () => { toast.success('Review deleted'); refresh(); },
    onError: (e) => toast.error(e.message),
  });
  const counts = query.data?.counts || {};
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="New reviews wait here until you approve them. Only approved reviews are public and count towards product ratings."
      />

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-space-md" role="tablist" aria-label="Review status">
        {TABS.map(([value, label, icon]) => {
          const on = p.status === value;
          const n = value === 'all' ? total : counts[value] || 0;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => set({ status: value, page: '1' })}
              className={cn('chip h-9 shrink-0 gap-1.5', on ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}
            >
              <Icon name={icon} className="text-[16px]" /> {label}
              <span className={cn('min-w-5 h-5 px-1 rounded-full text-[11px] flex items-center justify-center', on ? 'bg-on-primary/15' : value === 'pending' && n ? 'bg-tertiary-fixed text-tertiary-container' : 'bg-surface-container-high')}>{n}</span>
            </button>
          );
        })}
      </div>

      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search review text…" />
        <FilterSelect label="Rating" value={p.rating} onChange={(v) => set({ rating: v })} options={[['', 'Any rating'], ['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']]} />
        <FilterSelect label="Purchase" value={p.verified} onChange={(v) => set({ verified: v })} options={[['', 'Any buyer'], ['true', 'Verified buyers'], ['false', 'Not verified']]} />
        <FilterSelect label="Homepage" value={p.home} onChange={(v) => set({ home: v })} options={[['', 'All reviews'], ['true', 'On homepage']]} />
      </Toolbar>

      {query.isError ? <ErrorState error={query.error} onRetry={query.refetch} /> : query.isLoading ? (
        <div className="grid md:grid-cols-2 gap-space-md">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : query.data.items.length === 0 ? (
        <EmptyState icon="reviews" title={p.status === 'pending' ? 'Nothing waiting for review' : 'No reviews match'} description={p.status === 'pending' ? 'New reviews from customers will appear here.' : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {query.data.items.map((r) => {
            const canFeature = r.status === 'approved' && r.isVerifiedPurchase && r.order;
            const busy = update.isPending && update.variables?.id === r._id;
            return (
              <article key={r._id} className={cn('card surface-card border border-outline-variant/60 p-space-md flex flex-col gap-2', ['hidden', 'rejected'].includes(r.status) && 'opacity-70', r.showOnHome && 'ring-2 ring-secondary')}>
                <div className="flex items-center gap-3">
                  <Img src={r.product?.images?.[0]?.url} alt="" className="w-11 h-11 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${r.product?.slug}`} target="_blank" className="text-label-lg truncate block hover:text-secondary">{r.product?.name || 'Deleted product'}</Link>
                    <p className="text-label-sm font-normal text-outline truncate">{r.user?.name} · {r.user?.email} · {formatDate(r.createdAt)}</p>
                  </div>
                  <Badge tone={TONE[r.status]}>{r.status}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} />
                  {r.isVerifiedPurchase ? (
                    <Badge tone="mint"><Icon name="verified" className="text-[12px]" /> Verified buyer</Badge>
                  ) : (
                    <Badge tone="neutral">Not a verified purchase</Badge>
                  )}
                  {r.order?.orderId && (
                    <Link to={`/admin/orders/${r.order.orderId}`} className="text-label-sm text-secondary hover:underline inline-flex items-center gap-0.5">
                      <Icon name="receipt_long" className="text-[14px]" /> {r.order.orderId}{r.order.orderStatus ? ` · ${r.order.orderStatus}` : ''}
                    </Link>
                  )}
                  {r.showOnHome && <Badge tone="dark"><Icon name="home" className="text-[12px]" /> On homepage</Badge>}
                </div>

                {r.title && <p className="text-label-lg">{r.title}</p>}
                <p className="text-body-sm text-on-surface-variant line-clamp-5 whitespace-pre-line">{r.comment}</p>

                <div className="flex items-center gap-2 pt-2 border-t border-surface-container-high">
                  <span className={cn(!canFeature && 'opacity-50')} title={canFeature ? '' : 'Approve a verified-buyer review to feature it'}>
                    <Toggle checked={Boolean(r.showOnHome)} disabled={!canFeature || busy} onChange={(v) => update.mutate({ id: r._id, showOnHome: v })} label="Show on homepage" />
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-2 mt-auto pt-2 border-t border-surface-container-high">
                  {r.status !== 'approved' && (
                    <button type="button" disabled={busy} onClick={() => update.mutate({ id: r._id, status: 'approved' })} className="text-label-md text-secondary flex items-center gap-1 hover:underline"><Icon name="check" className="text-[16px]" /> Approve</button>
                  )}
                  {r.status !== 'rejected' && (
                    <button type="button" disabled={busy} onClick={() => update.mutate({ id: r._id, status: 'rejected' })} className="text-label-md flex items-center gap-1 hover:underline"><Icon name="block" className="text-[16px]" /> Reject</button>
                  )}
                  {r.status === 'approved' && (
                    <button type="button" disabled={busy} onClick={() => update.mutate({ id: r._id, status: 'hidden' })} className="text-label-md flex items-center gap-1 hover:underline"><Icon name="visibility_off" className="text-[16px]" /> Hide</button>
                  )}
                  <button type="button" onClick={async () => (await confirm({ title: 'Delete this review permanently?', confirmLabel: 'Delete' })) && remove.mutate(r._id)} className="text-label-md text-error flex items-center gap-1 hover:underline ml-auto"><Icon name="delete" className="text-[16px]" /> Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
