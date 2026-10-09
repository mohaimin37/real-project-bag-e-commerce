import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDate } from '../lib/format';
import { Badge, Button, EmptyState, ErrorState, Field, Icon, Input, Modal, Pagination, Skeleton, StarInput, Stars, Textarea, useConfirm } from '../components/ui';
import { PageHeader, SearchBox, Toolbar, useListParams } from './kit';

const TABS = [
  ['pending', 'Pending', 'hourglass_top'],
  ['approved', 'Approved', 'check_circle'],
  ['rejected', 'Rejected', 'block'],
  ['all', 'All', 'forum'], // explicit value: an empty one would fall back to the "pending" default
];
const TONE = { approved: 'teal', pending: 'amber', rejected: 'danger' };
const EMPTY = { name: '', city: '', rating: 0, message: '', sourceNote: '' };

/** Enter real feedback a customer gave you elsewhere (WhatsApp, phone, in store). It is shown straight away. */
function AddCommentForm({ onDone }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });
  const create = useMutation({
    mutationFn: adminApi.createComment,
    onSuccess: () => {
      toast.success('Comment added to the homepage');
      onDone();
    },
    onError: (e) => {
      toast.error(e.message);
      setErrors(Object.fromEntries((e.details || []).map((d) => [d.field, d.message])));
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate(form);
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <p className="text-body-sm text-on-surface-variant -mt-2">
        Only enter what a real customer actually told you, in their words. Say where it came from: it's shown in small print under the comment.
      </p>
      <Field label="Rating they gave" error={errors.rating} required>
        <StarInput value={form.rating} onChange={set('rating')} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Customer's name" error={errors.name} required htmlFor="ac-name">
          <Input id="ac-name" value={form.name} onChange={set('name')} maxLength={60} placeholder="e.g. Priya S." error={errors.name} />
        </Field>
        <Field label="City" hint="Optional" htmlFor="ac-city">
          <Input id="ac-city" value={form.city} onChange={set('city')} maxLength={60} />
        </Field>
      </div>
      <Field label="Their comment" error={errors.message} required htmlFor="ac-msg">
        <Textarea id="ac-msg" value={form.message} onChange={set('message')} maxLength={600} rows={4} error={errors.message} />
      </Field>
      <Field label="Where did it come from?" error={errors.sourceNote} required hint="Shown publicly, e.g. “Shared on WhatsApp” or “Told us in store”" htmlFor="ac-src">
        <Input id="ac-src" value={form.sourceNote} onChange={set('sourceNote')} maxLength={120} placeholder="Shared on WhatsApp" error={errors.sourceNote} />
      </Field>
      <Button type="submit" loading={create.isPending} icon="add_comment" className="self-end">Add comment</Button>
    </form>
  );
}

export default function Comments() {
  const [p, set] = useListParams({ page: '1', status: 'pending' });
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const query = useQuery({ queryKey: ['admin', 'comments', p], queryFn: () => adminApi.comments({ ...p, status: p.status === 'all' ? '' : p.status, limit: 12 }), placeholderData: keepPreviousData });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
    qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    qc.invalidateQueries({ queryKey: ['comments'] });
  };
  const update = useMutation({
    mutationFn: ({ id, status }) => adminApi.commentStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(status === 'approved' ? 'Approved: now showing on the homepage' : `Comment ${status}`);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteComment,
    onSuccess: () => {
      toast.success('Comment deleted');
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const counts = query.data?.counts || {};
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <>
      <PageHeader
        title="Comments"
        subtitle="Customer comments and feedback submitted across the store. Approve, reject, or manage verified customer feedback."
        actions={<Button icon="add_comment" onClick={() => setAdding(true)}>Add a customer's comment</Button>}
      />

      <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-space-md" role="tablist" aria-label="Comment status">
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
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search comment text…" />
      </Toolbar>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : query.isLoading ? (
        <div className="grid md:grid-cols-2 gap-space-md">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon="forum"
          title={p.status === 'pending' ? 'Nothing waiting for approval' : 'No comments here'}
          description={p.status === 'pending' ? 'New comments from the homepage will appear here.' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {query.data.items.map((c) => {
            const busy = update.isPending && update.variables?.id === c._id;
            return (
              <article key={c._id} className={cn('card surface-card border border-outline-variant/60 p-space-md flex flex-col gap-2', c.status === 'rejected' && 'opacity-70')}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg truncate">{c.name}{c.city && <span className="font-normal text-on-surface-variant">, {c.city}</span>}</p>
                    <p className="text-label-sm font-normal text-outline truncate">
                      {formatDate(c.createdAt)} · {c.source === 'admin' ? `Added by admin · ${c.sourceNote}` : c.user ? `Signed in: ${c.user.email}` : 'From the homepage'}
                    </p>
                  </div>
                  <Badge tone={TONE[c.status]}>{c.status}</Badge>
                </div>
                <Stars value={c.rating} />
                <p className="text-body-sm text-on-surface-variant line-clamp-5 whitespace-pre-line">{c.message}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-2 mt-auto pt-2 border-t border-surface-container-high">
                  {c.status !== 'approved' && (
                    <button type="button" disabled={busy} onClick={() => update.mutate({ id: c._id, status: 'approved' })} className="text-label-md text-secondary flex items-center gap-1 hover:underline">
                      <Icon name="check" className="text-[16px]" /> Approve
                    </button>
                  )}
                  {c.status !== 'rejected' && (
                    <button type="button" disabled={busy} onClick={() => update.mutate({ id: c._id, status: 'rejected' })} className="text-label-md flex items-center gap-1 hover:underline">
                      <Icon name="block" className="text-[16px]" /> {c.status === 'approved' ? 'Remove from homepage' : 'Reject'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => (await confirm({ title: 'Delete this comment permanently?', confirmLabel: 'Delete' })) && remove.mutate(c._id)}
                    className="text-label-md text-error flex items-center gap-1 hover:underline ml-auto"
                  >
                    <Icon name="delete" className="text-[16px]" /> Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a customer's comment">
        <AddCommentForm
          onDone={() => {
            setAdding(false);
            refresh();
          }}
        />
      </Modal>
    </>
  );
}
