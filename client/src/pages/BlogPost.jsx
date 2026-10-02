import { Link, useParams } from 'react-router-dom';
import Seo, { articleLd, breadcrumbLd } from '../components/Seo';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { Breadcrumbs, ErrorState, Icon, Img, PageLoader } from '../components/ui';
import NotFound from './NotFound';

export default function BlogPost() {
  const { slug } = useParams();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['blog', slug], queryFn: () => api.blog(slug) });
  if (isLoading) return <PageLoader />;
  if (isError && error.status === 404) return <NotFound />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const { post, related } = data;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: post.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <article className="pb-space-xl">
      <Seo
        title={post.title}
        description={post.excerpt}
        image={post.coverImage?.url}
        type="article"
        canonical={`/blog/${post.slug}`}
        jsonLd={[articleLd(post), breadcrumbLd([{ label: 'Home', to: '/' }, { label: 'Journal', to: '/blog' }, { label: post.title }])]}
      />
      <div className="container-x max-w-3xl pt-space-md flex flex-col gap-space-md">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Journal', to: '/blog' }, { label: post.title }]} />
        <span className="eyebrow mt-space-md">{post.category} · {post.readingMinutes} min read</span>
        <h1 className="text-headline-xl-mobile md:text-headline-xl">{post.title}</h1>
        <p className="text-body-xl text-on-surface-variant">{post.excerpt}</p>
        <div className="flex items-center justify-between gap-4 border-y border-surface-container-high py-space-sm">
          <span className="text-label-md text-on-surface-variant">{post.authorName} · {formatDate(post.publishedAt)}</span>
          <button type="button" onClick={share} className="btn-ghost btn-sm"><Icon name="share" className="text-[18px]" /> Share</button>
        </div>
      </div>
      {post.coverImage?.url && (
        <div className="container-x max-w-5xl my-space-xl">
          <Img w={640} src={post.coverImage.url} alt="" className="aspect-[16/8] rounded-3xl shadow-lift" loading="eager" fetchPriority="high" />
        </div>
      )}
      {/* Content is sanitised on the server (xss whitelist) before storage. */}
      <div className="container-x max-w-3xl prose-wt" dangerouslySetInnerHTML={{ __html: post.content }} />
      {post.tags?.length > 0 && (
        <div className="container-x max-w-3xl flex flex-wrap gap-2 mt-space-lg">
          {post.tags.map((t) => <span key={t} className="chip bg-surface-container-low">#{t}</span>)}
        </div>
      )}
      {related?.length > 0 && (
        <div className="container-x mt-space-xl">
          <h2 className="text-headline-lg mb-space-md">Keep reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {related.map((r) => (
              <Link key={r._id} to={`/blog/${r.slug}`} className="group card overflow-hidden">
                <Img src={r.coverImage?.url} alt="" className="aspect-[16/10]" />
                <div className="p-space-md">
                  <h3 className="text-headline-sm group-hover:text-secondary">{r.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
