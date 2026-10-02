import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, formatDate } from '../lib/format';
import Seo from '../components/Seo';
import LiveFeed from '../components/LiveFeed';
import { EmptyState, ErrorState, Img, Pagination, Skeleton } from '../components/ui';

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const category = params.get('category') || '';
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['blogs', page, category], queryFn: () => api.blogs({ page, category }), placeholderData: keepPreviousData });
  const [lead, ...rest] = data?.items || [];
  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  return (
    <div className="container-x py-space-xl">
      <Seo title="The Journal — Travel Guides, Leather Care & Stories" description="Packing guides, leather care routines and stories from the WILDTANE workshop on building bags that last decades." canonical="/blog" />
      <div className="flex flex-col gap-1 mb-space-lg">
        <span className="eyebrow">The Journal</span>
        <h1 className="text-headline-xl-mobile md:text-headline-xl">Field Notes, Care Guides & Stories.</h1>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none mb-space-lg">
        {['', ...(data?.categories || [])].map((c) => (
          <button key={c || 'all'} type="button" onClick={() => set({ category: c, page: '' })} className={cn('chip', category === c ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}>
            {c || 'All stories'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
      <div className="lg:col-span-8 min-w-0">
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-gutter">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-80" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !lead ? (
        <EmptyState icon="article" title="No stories yet" description="New field notes are on the way." />
      ) : (
        <div className="flex flex-col gap-gutter-lg">
          {page === 1 && (
            <Link to={`/blog/${lead.slug}`} className="group flex flex-col card overflow-hidden hover:shadow-lift transition-shadow">
              <Img w={640} src={lead.coverImage?.url} alt="" className="aspect-[16/8]" imgClassName="group-hover:scale-105 transition-transform duration-700" />
              <div className="p-space-lg lg:p-space-xl flex flex-col justify-center gap-space-sm">
                <span className="eyebrow">{lead.category} · {lead.readingMinutes} min read</span>
                <h2 className="text-headline-lg group-hover:text-secondary transition-colors">{lead.title}</h2>
                <p className="text-body-md text-on-surface-variant">{lead.excerpt}</p>
                <span className="text-label-sm font-normal text-outline">{lead.authorName} · {formatDate(lead.publishedAt)}</span>
              </div>
            </Link>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {(page === 1 ? rest : data.items).map((post) => (
              <Link key={post._id} to={`/blog/${post.slug}`} className="group card overflow-hidden flex flex-col hover:shadow-lift transition-shadow">
                <Img src={post.coverImage?.url} alt="" className="aspect-[16/10]" imgClassName="group-hover:scale-105 transition-transform duration-500" />
                <div className="p-space-lg flex flex-col gap-2">
                  <span className="eyebrow">{post.category} · {post.readingMinutes} min</span>
                  <h3 className="text-headline-sm group-hover:text-secondary transition-colors">{post.title}</h3>
                  <p className="text-body-sm text-on-surface-variant line-clamp-2">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={(p) => set({ page: String(p) })} />
        </div>
      )}
      </div>
      <aside id="live" className="lg:col-span-4 lg:sticky lg:top-28 scroll-mt-28">
        <LiveFeed />
      </aside>
      </div>
    </div>
  );
}
