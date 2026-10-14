import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, timeAgo } from '../lib/format';
import { UPDATE_KINDS } from '../lib/liveUpdates';
import { Badge, Button, EmptyState, ErrorState, Field, Icon, Img, Input, Modal, Select, Skeleton, Textarea, Toggle, useConfirm } from '../components/ui';
import { applyServerErrors } from '../pages/Auth';
import { ImageUploader, PageHeader } from './kit';

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: ['admin', 'updates'] });
  qc.invalidateQueries({ queryKey: ['live-updates'] });
}

function UpdateForm({ initial, onDone }) {
  const qc = useQueryClient();
  const [image, setImage] = useState(initial?.image?.url ? [initial.image] : []);
  const { register, handleSubmit, control, watch, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      title: initial?.title || '',
      body: initial?.body || '',
      kind: initial?.kind || 'news',
      link: initial?.link || '',
      linkLabel: initial?.linkLabel || '',
      pinned: initial?.pinned ?? false,
      isPublished: initial?.isPublished ?? true,
    },
  });
  const onSubmit = async (v) => {
    if (v.title.trim().length < 3) return setError('title', { message: 'Add a headline' });
    const body = { ...v, image: image[0] ? { url: image[0].url, publicId: image[0].publicId } : null };
    try {
      if (initial?._id) await adminApi.updateLiveUpdate(initial._id, body);
      else await adminApi.createLiveUpdate(body);
      toast.success(v.isPublished ? 'Update is live on the store' : 'Saved as hidden');
      invalidate(qc);
      onDone();
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.message);
    }
  };
  const bodyLen = watch('body')?.length || 0;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
      <Field label="Headline" error={errors.title?.message} required className="md:col-span-2">
        <Input error={errors.title} maxLength={140} placeholder="The Apex Commuter in Forest Green just landed" {...register('title')} />
      </Field>
      <Field label="Type">
        <Select {...register('kind')}>
          {Object.entries(UPDATE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </Field>
      <div className="flex items-end gap-space-lg pb-2">
        <Controller control={control} name="pinned" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Pin to top" />} />
        <Controller control={control} name="isPublished" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Visible" />} />
      </div>
      <Field label="Details" hint={`${bodyLen}/1000`} className="md:col-span-2">
        <Textarea rows={4} maxLength={1000} placeholder="A sentence or two for shoppers…" {...register('body')} />
      </Field>
      <Field label="Link" error={errors.link?.message} hint="e.g. /shop/backpacks or https://…"><Input error={errors.link} {...register('link')} /></Field>
      <Field label="Link label"><Input placeholder="Shop now" {...register('linkLabel')} /></Field>
      <Field label="Image (optional)" className="md:col-span-2">
        <ImageUploader value={image} onChange={setImage} multiple={false} folder="updates" />
      </Field>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="button" variant="tonal" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={isSubmitting} icon="send">{initial?._id ? 'Save changes' : 'Post update'}</Button>
      </div>
    </form>
  );
}

export default function LiveUpdates() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'updates'], queryFn: adminApi.liveUpdates, select: (d) => d?.updates || [] });
  const patch = useMutation({
    mutationFn: ({ u, changes }) =>
      adminApi.updateLiveUpdate(u._id, { title: u.title, body: u.body, kind: u.kind, link: u.link, linkLabel: u.linkLabel, image: u.image?.url ? u.image : null, pinned: u.pinned, isPublished: u.isPublished, ...changes }),
    onSuccess: () => invalidate(qc),
    onError: (err) => toast.error(err.message),
  });
  const remove = useMutation({ mutationFn: adminApi.deleteLiveUpdate, onSuccess: () => { toast.success('Update deleted'); invalidate(qc); } });
  const liveCount = data?.filter((u) => u.isPublished).length || 0;

  return (
    <>
      <PageHeader
        title="Live updates"
        subtitle="Short posts that appear instantly on the Journal page and homepage. Shoppers see them within about 15 seconds, with no reload needed."
        actions={<Button icon="add" onClick={() => setEditing({})}>New update</Button>}
      />
      {isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : data.length === 0 ? (
        <EmptyState icon="campaign" title="No updates yet" description="Announce drops, restocks, events and store news." action={<Button onClick={() => setEditing({})}>Post the first update</Button>} />
      ) : (
        <div className="flex flex-col gap-space-sm">
          <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="absolute inset-0 rounded-full bg-secondary animate-ping opacity-60" /><span className="relative h-2 w-2 rounded-full bg-secondary" /></span>
            {liveCount} visible on the storefront · {data.length - liveCount} hidden
          </p>
          {data.map((u) => {
            const kind = UPDATE_KINDS[u.kind] || UPDATE_KINDS.news;
            return (
              <article key={u._id} className={cn('card p-space-md flex gap-space-md items-start', !u.isPublished && 'opacity-60')}>
                {u.image?.url ? (
                  <Img src={u.image.url} alt="" className="w-20 h-20 rounded-lg shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0 text-secondary"><Icon name={kind.icon} /></span>
                )}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={kind.tone}>{kind.label}</Badge>
                    {u.pinned && <Badge tone="dark"><Icon name="push_pin" className="text-[12px]" /> Pinned</Badge>}
                    {!u.isPublished && <Badge>Hidden</Badge>}
                    <span className="text-label-sm font-normal text-outline" title={formatDateTime(u.createdAt)}>{timeAgo(u.createdAt)} · {u.authorName}</span>
                  </div>
                  <h3 className="text-body-md font-semibold">{u.title}</h3>
                  {u.body && <p className="text-body-sm text-on-surface-variant line-clamp-2">{u.body}</p>}
                  {u.link && <p className="text-label-md text-secondary truncate">{u.linkLabel || 'Link'} → {u.link}</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                  <button type="button" className="btn-icon" title={u.pinned ? 'Unpin' : 'Pin to top'} aria-label={u.pinned ? 'Unpin' : 'Pin to top'} onClick={() => patch.mutate({ u, changes: { pinned: !u.pinned } })}>
                    <Icon name="push_pin" fill={u.pinned} />
                  </button>
                  <button type="button" className="btn-icon" title={u.isPublished ? 'Hide' : 'Show'} aria-label={u.isPublished ? 'Hide from store' : 'Show on store'} onClick={() => patch.mutate({ u, changes: { isPublished: !u.isPublished } })}>
                    <Icon name={u.isPublished ? 'visibility' : 'visibility_off'} />
                  </button>
                  <button type="button" className="btn-icon" title="Edit" aria-label="Edit" onClick={() => setEditing(u)}><Icon name="edit" /></button>
                  <button type="button" className="btn-icon text-error" title="Delete" aria-label="Delete" onClick={async () => (await confirm({ title: 'Delete this update?', confirmLabel: 'Delete' })) && remove.mutate(u._id)}>
                    <Icon name="delete" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? 'Edit update' : 'New live update'} size="lg">
        {editing && <UpdateForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
