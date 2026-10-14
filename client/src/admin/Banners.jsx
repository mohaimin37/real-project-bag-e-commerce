import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime } from '../lib/format';
import { Badge, Button, EmptyState, ErrorState, Field, Icon, Img, Input, Modal, Select, Skeleton, Textarea, Toggle, useConfirm } from '../components/ui';
import { applyServerErrors } from '../pages/Auth';
import { ImageUploader, PageHeader } from './kit';
import { toLocal } from './Coupons';

const PLACEMENTS = { hero: 'Homepage hero', promo: 'Promo banner (countdown)', announcement: 'Announcement', offers: 'Offers page slider (shows 4–5 at once, auto-slides)' };

function BannerForm({ initial, onDone }) {
  const qc = useQueryClient();
  const [image, setImage] = useState(initial?.image?.url ? [initial.image] : []);
  const { register, handleSubmit, control, watch, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      placement: initial?.placement || 'promo',
      eyebrow: initial?.eyebrow || '',
      title: initial?.title || '',
      subtitle: initial?.subtitle || '',
      ctaLabel: initial?.ctaLabel || '',
      ctaLink: initial?.ctaLink || '',
      couponCode: initial?.couponCode || '',
      sortOrder: initial?.sortOrder ?? 0,
      isActive: initial?.isActive ?? true,
      startsAt: toLocal(initial?.startsAt),
      endsAt: toLocal(initial?.endsAt),
    },
  });
  const onSubmit = async (v) => {
    if (v.title.trim().length < 2) {
      setError('title', { message: 'Add a title' });
      return;
    }
    const body = { ...v, image: image[0] ? { url: image[0].url, publicId: image[0].publicId } : null, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : '', endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : '' };
    try {
      if (initial?._id) await adminApi.updateBanner(initial._id, body);
      else await adminApi.createBanner(body);
      toast.success('Banner saved');
      qc.invalidateQueries({ queryKey: ['admin', 'banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      onDone();
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.message);
    }
  };
  const placement = watch('placement');
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
      <Field label="Placement" className="md:col-span-2">
        <Select {...register('placement')}>{Object.entries(PLACEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      </Field>
      <Field label="Eyebrow"><Input {...register('eyebrow')} placeholder="Limited Seasonal Allocation" /></Field>
      <Field label="Title" error={errors.title?.message} required><Input error={errors.title} {...register('title')} /></Field>
      <Field label="Subtitle" className="md:col-span-2"><Textarea rows={3} {...register('subtitle')} /></Field>
      {placement === 'offers' && (
        <p className="md:col-span-2 text-body-sm text-on-surface-variant">
          Every active “Offers page slider” banner becomes one colourful slide at the top of <a href="/offers" target="_blank" rel="noreferrer" className="underline">/offers</a> (add 4–5). Set the dates to run a sale for a limited time — it disappears by itself afterwards.
          Until you add any, the page shows built-in slides (Sale, Spin & Win, New arrivals, Bestsellers, Free shipping).
        </p>
      )}
      {(placement === 'hero' || placement === 'offers') && <Field label="Image" className="md:col-span-2"><ImageUploader value={image} onChange={setImage} multiple={false} folder="banners" /></Field>}
      <Field label="Button label"><Input {...register('ctaLabel')} placeholder="Shop the offer" /></Field>
      <Field label="Button link" hint="e.g. /shop?onSale=true"><Input {...register('ctaLink')} /></Field>
      {(placement === 'promo' || placement === 'offers') && <Field label="Coupon code" hint="Optional — shown on the banner"><Input className="uppercase" {...register('couponCode')} /></Field>}
      <Field label="Sort order"><Input type="number" {...register('sortOrder')} /></Field>
      <Field label="Starts"><Input type="datetime-local" {...register('startsAt')} /></Field>
      <Field label="Ends" hint={placement === 'promo' ? 'Drives the countdown timer' : ''}><Input type="datetime-local" {...register('endsAt')} /></Field>
      <div className="md:col-span-2 flex items-center justify-between pt-2">
        <Controller control={control} name="isActive" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Active" />} />
        <div className="flex gap-2">
          <Button type="button" variant="tonal" onClick={onDone}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Save banner</Button>
        </div>
      </div>
    </form>
  );
}

export default function Banners() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'banners'], queryFn: adminApi.banners, select: (d) => d?.banners || [] });
  const remove = useMutation({ mutationFn: adminApi.deleteBanner, onSuccess: () => { toast.success('Banner deleted'); qc.invalidateQueries({ queryKey: ['admin', 'banners'] }); qc.invalidateQueries({ queryKey: ['banners'] }); } });
  const now = Date.now();
  const live = (b) => b.isActive && (!b.startsAt || new Date(b.startsAt) <= now) && (!b.endsAt || new Date(b.endsAt) >= now);

  return (
    <>
      <PageHeader title="Banners" subtitle="The live hero and promo banners power the homepage. The first active one per placement is shown." actions={<Button icon="add" onClick={() => setEditing({})}>New banner</Button>} />
      {isError ? <ErrorState error={error} onRetry={refetch} /> : isLoading ? <Skeleton className="h-64 rounded-xl" /> : data.length === 0 ? (
        <EmptyState icon="view_carousel" title="No banners" action={<Button onClick={() => setEditing({})}>Create banner</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
          {data.map((b) => (
            <article key={b._id} className="card overflow-hidden flex flex-col">
              <div className={cn('relative h-36 flex items-end p-space-md', !b.image?.url && 'bg-gradient-to-r from-ink to-[#28313c]')}>
                {b.image?.url && <><Img src={b.image.url} alt="" className="absolute inset-0" /><div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" /></>}
                <div className="relative text-white">
                  {b.eyebrow && <p className="text-label-sm uppercase tracking-wider text-secondary-fixed">{b.eyebrow}</p>}
                  <p className="text-headline-sm line-clamp-2">{b.title}</p>
                </div>
                <span className="absolute top-3 right-3"><Badge tone={live(b) ? 'teal' : 'neutral'}>{live(b) ? 'Live' : b.isActive ? 'Scheduled' : 'Off'}</Badge></span>
              </div>
              <div className="p-space-md flex flex-col gap-1 flex-1">
                <p className="text-label-sm uppercase tracking-wider text-outline">{PLACEMENTS[b.placement]}</p>
                {b.couponCode && <p className="text-body-sm">Code: <b>{b.couponCode}</b></p>}
                {b.endsAt && <p className="text-label-md font-normal text-on-surface-variant flex items-center gap-1"><Icon name="timer" className="text-[16px]" /> Ends {formatDateTime(b.endsAt)}</p>}
                <div className="flex gap-2 mt-auto pt-space-sm">
                  <Button size="sm" variant="tonal" icon="edit" onClick={() => setEditing(b)}>Edit</Button>
                  <Button size="sm" variant="tonal" icon="delete" className="text-error" onClick={async () => (await confirm({ title: 'Delete this banner?', confirmLabel: 'Delete' })) && remove.mutate(b._id)}>Delete</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? 'Edit banner' : 'New banner'} size="lg">
        {editing && <BannerForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
