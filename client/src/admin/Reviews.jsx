import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDate } from '../lib/format';
import { Badge, EmptyState, ErrorState, Icon, Img, Pagination, Skeleton, Stars, useConfirm } from '../components/ui';
import { FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

export default function Reviews() {
  const [p, set] = useListParams({ page: '1' });
  const qc = useQueryClient();
  const confirm = useConfirm();
  const query = useQuery({ queryKey: ['admin', 'reviews', p], queryFn: () => adminApi.reviews({ ...p, limit: 12 }), placeholderData: keepPreviousData });
  const status = useMutation({
    mutationFn: ({ id, s }) => adminApi.reviewStatus(id, s),
    onSuccess: () => { toast.success('Review updated'); qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }); },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteReview,
    onSuccess: () => { toast.success('Review deleted'); qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }); },
  });

  return (
    <>
      <PageHeader title="Reviews" subtitle="Hidden reviews are excluded from product ratings." />
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search review text…" />
        <FilterSelect label="Status" value={p.status} onChange={(v) => set({ status: v })} options={[['', 'All statuses'], ['approved', 'Approved'], ['pending', 'Pending'], ['hidden', 'Hidden']]} />
        <FilterSelect label="Rating" value={p.rating} onChange={(v) => set({ rating: v })} options={[['', 'Any rating'], ['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']]} />
      </Toolbar>
      {query.isError ? <ErrorState error={query.error} onRetry={query.refetch} /> : query.isLoading ? (
        <div className="grid md:grid-cols-2 gap-space-md">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : query.data.items.length === 0 ? (
        <EmptyState icon="reviews" title="No reviews match" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {query.data.items.map((r) => (
            <article key={r._id} className={cn('card p-space-md flex flex-col gap-2', r.status === 'hidden' && 'opacity-60')}>
              <div className="flex items-center gap-3">
                <Img src={r.product?.images?.[0]?.url} alt="" className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${r.product?.slug}`} target="_blank" className="text-label-lg truncate block hover:text-secondary">{r.product?.name || 'Deleted product'}</Link>
                  <p className="text-label-sm font-normal text-outline truncate">{r.user?.name} · {r.user?.email} · {formatDate(r.createdAt)}</p>
                </div>
                <Badge tone={r.status === 'approved' ? 'teal' : r.status === 'pending' ? 'amber' : 'neutral'}>{r.status}</Badge>
              </div>
              <div className="flex items-center gap-2"><Stars value={r.rating} />{r.isVerifiedPurchase && <Badge tone="mint">Verified</Badge>}</div>
              {r.title && <p className="text-label-lg">{r.title}</p>}
              <p className="text-body-sm text-on-surface-variant line-clamp-4">{r.comment}</p>
              <div className="flex gap-2 mt-auto pt-2 border-t border-surface-container-high">
                {r.status !== 'approved' && <button type="button" onClick={() => status.mutate({ id: r._id, s: 'approved' })} className="text-label-md text-secondary flex items-center gap-1 hover:underline"><Icon name="check" className="text-[16px]" /> Approve</button>}
                {r.status !== 'hidden' && <button type="button" onClick={() => status.mutate({ id: r._id, s: 'hidden' })} className="text-label-md flex items-center gap-1 hover:underline"><Icon name="visibility_off" className="text-[16px]" /> Hide</button>}
                <button type="button" onClick={async () => (await confirm({ title: 'Delete this review permanently?', confirmLabel: 'Delete' })) && remove.mutate(r._id)} className="text-label-md text-error flex items-center gap-1 hover:underline ml-auto"><Icon name="delete" className="text-[16px]" /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
