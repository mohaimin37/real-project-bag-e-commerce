import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { formatDate } from '../lib/format';
import { Badge, EmptyState, Icon, Img, Pagination, useConfirm } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

export default function Blogs() {
  const [p, set] = useListParams({ page: '1' });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const query = useQuery({ queryKey: ['admin', 'blogs', p], queryFn: () => adminApi.blogs(p), placeholderData: keepPreviousData });
  const remove = useMutation({ mutationFn: adminApi.deleteBlog, onSuccess: () => { toast.success('Article deleted'); qc.invalidateQueries({ queryKey: ['admin', 'blogs'] }); qc.invalidateQueries({ queryKey: ['blogs'] }); } });

  const columns = [
    {
      key: 'title',
      header: 'Article',
      render: (b) => (
        <div className="flex items-center gap-3 min-w-[260px]">
          <Img src={b.coverImage?.url} alt="" className="w-16 h-11 rounded-lg shrink-0" />
          <div className="min-w-0">
            <p className="text-label-lg truncate">{b.title}</p>
            <p className="text-label-sm font-normal text-outline">{b.category} · {b.readingMinutes} min · {b.views} views</p>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (b) => <Badge tone={b.status === 'published' ? 'teal' : 'neutral'}>{b.status}</Badge> },
    { key: 'date', header: 'Published', render: (b) => <span className="whitespace-nowrap">{b.publishedAt ? formatDate(b.publishedAt) : '—'}</span> },
    { key: 'updated', header: 'Updated', render: (b) => <span className="whitespace-nowrap text-on-surface-variant">{formatDate(b.updatedAt)}</span> },
    {
      key: 'a',
      header: '',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {b.status === 'published' && <a href={`/blog/${b.slug}`} target="_blank" rel="noreferrer" className="btn-icon w-8 h-8" aria-label="View"><Icon name="open_in_new" className="text-[18px]" /></a>}
          <Link to={`/admin/blogs/${b._id}`} className="btn-icon w-8 h-8" aria-label="Edit"><Icon name="edit" className="text-[18px]" /></Link>
          <button type="button" className="btn-icon w-8 h-8 hover:text-error" aria-label="Delete" onClick={async () => (await confirm({ title: `Delete “${b.title}”?`, confirmLabel: 'Delete' })) && remove.mutate(b._id)}><Icon name="delete" className="text-[18px]" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Blog" subtitle="Journal articles shown on /blog and the homepage." actions={<Link to="/admin/blogs/new" className="btn-primary"><Icon name="edit_square" className="text-[18px]" /> New article</Link>} />
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search titles…" />
        <FilterSelect label="Status" value={p.status} onChange={(v) => set({ status: v })} options={[['', 'All'], ['published', 'Published'], ['draft', 'Drafts']]} />
      </Toolbar>
      <DataTable columns={columns} rows={query.data?.items || []} loading={query.isLoading} error={query.error} onRetry={query.refetch} onRowClick={(b) => navigate(`/admin/blogs/${b._id}`)} empty={<EmptyState icon="article" title="No articles yet" />} />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
