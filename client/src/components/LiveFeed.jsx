import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, formatDateTime, timeAgo } from '../lib/format';
import { LIVE_POLL_MS, UPDATE_KINDS } from '../lib/liveUpdates';
import { Icon, Img, Skeleton } from './ui';

export function useLiveUpdates(limit = 12) {
  return useQuery({
    queryKey: ['live-updates', limit],
    queryFn: () => api.liveUpdates(limit),
    select: (d) => d.updates,
    refetchInterval: LIVE_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inset-0 rounded-full bg-error animate-ping opacity-70" />
      <span className="relative h-2.5 w-2.5 rounded-full bg-error" />
    </span>
  );
}

function UpdateLink({ u, className, children }) {
  if (!u.link) return <div className={className}>{children}</div>;
  return /^https?:\/\//i.test(u.link) ? (
    <a href={u.link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link to={u.link} className={className}>{children}</Link>
  );
}

/** Live feed of admin-posted updates. New arrivals since the first load get highlighted. */
export default function LiveFeed({ limit = 12, compact = false, className }) {
  const { data, isLoading } = useLiveUpdates(limit);
  // Ids present on first load; anything that arrives later is highlighted as new.
  const [seen, setSeen] = useState(null);
  if (data && !seen) setSeen(new Set(data.map((u) => u._id)));
  const isNew = (u) => seen && !seen.has(u._id);

  if (isLoading) return <Skeleton className={cn('h-48 rounded-2xl', className)} />;
  if (!data?.length) return null;
  const items = compact ? data.slice(0, 3) : data;

  return (
    <section className={cn('card p-space-lg flex flex-col gap-space-md', className)} aria-label="Live updates">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-headline-sm">
          <LiveDot /> Live updates
        </h2>
        <span className="text-label-sm font-normal text-outline">Updates automatically</span>
      </div>
      <ol className="relative flex flex-col gap-space-md before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-surface-container-high" aria-live="polite">
        {items.map((u) => {
          const kind = UPDATE_KINDS[u.kind] || UPDATE_KINDS.news;
          return (
            <li key={u._id} className={cn('relative flex gap-space-md', isNew(u) && 'animate-pop-in')}>
              <span className={cn('relative z-[1] w-10 h-10 shrink-0 rounded-full flex items-center justify-center ring-4 ring-surface-container-lowest', u.pinned ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-secondary')}>
                <Icon name={u.pinned ? 'push_pin' : kind.icon} className="text-[18px]" />
              </span>
              <UpdateLink u={u} className={cn('group flex-1 min-w-0 flex flex-col gap-1 rounded-xl -m-2 p-2 transition-colors', u.link && 'hover:bg-surface-container-low', isNew(u) && 'bg-secondary/10')}>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-label-sm">
                  <span className="uppercase tracking-wider text-secondary">{kind.label}</span>
                  <time dateTime={u.createdAt} title={formatDateTime(u.createdAt)} className="font-normal text-outline">{timeAgo(u.createdAt)}</time>
                  {isNew(u) && <span className="px-1.5 rounded bg-error text-on-error">New</span>}
                </span>
                <span className="text-label-lg text-on-surface group-hover:text-secondary transition-colors">{u.title}</span>
                {!compact && u.body && <span className="text-body-sm text-on-surface-variant">{u.body}</span>}
                {!compact && u.image?.url && <Img src={u.image.url} alt="" className="mt-1 aspect-[16/9] rounded-xl max-w-md" />}
                {u.link && (
                  <span className="inline-flex items-center gap-1 text-label-md text-secondary">
                    {u.linkLabel || 'Learn more'} <Icon name="arrow_forward" className="text-[16px]" />
                  </span>
                )}
              </UpdateLink>
            </li>
          );
        })}
      </ol>
      {compact && (
        <Link to="/blog#live" className="self-start inline-flex items-center gap-1 text-label-md hover:text-secondary">
          See all updates <Icon name="arrow_forward" className="text-[16px]" />
        </Link>
      )}
    </section>
  );
}
