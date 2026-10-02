import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { formatDate, formatINR } from '../lib/format';
import { Badge, Button, EmptyState, Field, Icon, Input, Modal, Pagination, Select, Toggle, useConfirm } from '../components/ui';
import { applyServerErrors } from '../pages/Auth';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

const opt = z.union([z.literal(''), z.coerce.number().min(0)]).optional();
const schema = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9_-]{3,30}$/, 'Use 3–30 letters, numbers, - or _'),
    description: z.string().max(200).optional(),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number().positive('Must be above 0'),
    minOrder: z.coerce.number().min(0),
    maxDiscount: opt,
    usageLimit: opt,
    perUserLimit: z.coerce.number().int().min(0),
    startsAt: z.string().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean(),
  })
  .refine((d) => d.type !== 'percentage' || d.value <= 100, { message: 'Max 100%', path: ['value'] })
  .refine((d) => !d.startsAt || !d.expiresAt || d.startsAt < d.expiresAt, { message: 'Must end after it starts', path: ['expiresAt'] });

// <input type="datetime-local"> wants local time without a zone.
export const toLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function couponState(c) {
  const now = Date.now();
  if (!c.isActive) return ['Inactive', 'neutral'];
  if (c.expiresAt && new Date(c.expiresAt) < now) return ['Expired', 'danger'];
  if (c.startsAt && new Date(c.startsAt) > now) return ['Scheduled', 'amber'];
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return ['Used up', 'danger'];
  return ['Active', 'teal'];
}

function CouponForm({ initial, onDone }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, control, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initial?._id
      ? { ...initial, maxDiscount: initial.maxDiscount ?? '', usageLimit: initial.usageLimit ?? '', startsAt: toLocal(initial.startsAt), expiresAt: toLocal(initial.expiresAt) }
      : { code: '', description: '', type: 'percentage', value: 10, minOrder: 0, maxDiscount: '', usageLimit: '', perUserLimit: 1, startsAt: '', expiresAt: '', isActive: true },
  });
  const type = watch('type');
  const onSubmit = async (v) => {
    const body = { ...v, code: v.code.toUpperCase(), maxDiscount: v.maxDiscount === '' ? null : v.maxDiscount, usageLimit: v.usageLimit === '' ? null : v.usageLimit, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : '', expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : '' };
    try {
      if (initial?._id) await adminApi.updateCoupon(initial._id, body);
      else await adminApi.createCoupon(body);
      toast.success('Coupon saved');
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      onDone();
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.message);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
      <Field label="Code" error={errors.code?.message} required><Input className="uppercase" error={errors.code} {...register('code')} /></Field>
      <Field label="Type">
        <Select {...register('type')}>
          <option value="percentage">Percentage off</option>
          <option value="fixed">Fixed amount off (₹)</option>
        </Select>
      </Field>
      <Field label="Description" className="md:col-span-2" hint="Shown to shoppers"><Input {...register('description')} /></Field>
      <Field label={type === 'percentage' ? 'Discount %' : 'Discount ₹'} error={errors.value?.message} required><Input type="number" step="0.01" error={errors.value} {...register('value')} /></Field>
      <Field label="Minimum order (₹)"><Input type="number" {...register('minOrder')} /></Field>
      {type === 'percentage' && <Field label="Maximum discount (₹)" hint="Blank = no cap"><Input type="number" {...register('maxDiscount')} /></Field>}
      <Field label="Total usage limit" hint="Blank = unlimited"><Input type="number" {...register('usageLimit')} /></Field>
      <Field label="Uses per customer" hint="0 = unlimited"><Input type="number" {...register('perUserLimit')} /></Field>
      <Field label="Starts"><Input type="datetime-local" {...register('startsAt')} /></Field>
      <Field label="Expires" error={errors.expiresAt?.message}><Input type="datetime-local" error={errors.expiresAt} {...register('expiresAt')} /></Field>
      <div className="md:col-span-2 flex items-center justify-between gap-2 pt-2">
        <Controller control={control} name="isActive" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Active" />} />
        <div className="flex gap-2">
          <Button type="button" variant="tonal" onClick={onDone}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Save coupon</Button>
        </div>
      </div>
    </form>
  );
}

export default function Coupons() {
  const [p, set] = useListParams({ page: '1' });
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();
  const confirm = useConfirm();
  const query = useQuery({ queryKey: ['admin', 'coupons', p], queryFn: () => adminApi.coupons(p), placeholderData: keepPreviousData });
  const remove = useMutation({ mutationFn: adminApi.deleteCoupon, onSuccess: () => { toast.success('Coupon deleted'); qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }); } });

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => (
        <div>
          <span className="inline-flex px-2 py-1 rounded-lg border border-dashed border-outline-variant text-label-lg tracking-wider">{c.code}</span>
          <p className="text-label-sm font-normal text-outline mt-1 max-w-[220px] truncate">{c.description}</p>
        </div>
      ),
    },
    { key: 'value', header: 'Discount', render: (c) => <span className="text-label-lg">{c.type === 'percentage' ? `${c.value}%` : formatINR(c.value)}{c.maxDiscount ? <span className="text-label-sm font-normal text-outline"> (max {formatINR(c.maxDiscount)})</span> : null}</span> },
    { key: 'min', header: 'Min. order', render: (c) => (c.minOrder ? formatINR(c.minOrder) : '—') },
    {
      key: 'usage',
      header: 'Usage',
      render: (c) => (
        <div className="min-w-[110px]">
          <p className="text-label-md">{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ''} used</p>
          {c.usageLimit != null && <div className="h-1.5 rounded-full bg-surface-container-high mt-1 overflow-hidden"><div className="h-full bg-secondary" style={{ width: `${Math.min(100, (c.usedCount / c.usageLimit) * 100)}%` }} /></div>}
          <p className="text-label-sm font-normal text-outline">{c.perUserLimit ? `${c.perUserLimit}/customer` : 'Unlimited per customer'}</p>
        </div>
      ),
    },
    { key: 'expires', header: 'Expires', render: (c) => <span className="whitespace-nowrap">{c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</span> },
    { key: 'state', header: 'Status', render: (c) => { const [l, t] = couponState(c); return <Badge tone={t}>{l}</Badge>; } },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn-icon w-8 h-8" aria-label="Edit" onClick={() => setEditing(c)}><Icon name="edit" className="text-[18px]" /></button>
          <button type="button" className="btn-icon w-8 h-8 hover:text-error" aria-label="Delete" onClick={async () => (await confirm({ title: `Delete ${c.code}?`, confirmLabel: 'Delete' })) && remove.mutate(c._id)}><Icon name="delete" className="text-[18px]" /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Coupons" subtitle="Percentage or fixed discounts with minimums, caps, expiry and usage limits." actions={<Button icon="add" onClick={() => setEditing({})}>New coupon</Button>} />
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Search code…" />
        <FilterSelect label="Status" value={p.status} onChange={(v) => set({ status: v })} options={[['', 'All'], ['active', 'Active'], ['inactive', 'Inactive']]} />
      </Toolbar>
      <DataTable columns={columns} rows={query.data?.items || []} loading={query.isLoading} error={query.error} onRetry={query.refetch} onRowClick={setEditing} empty={<EmptyState icon="sell" title="No coupons yet" action={<Button onClick={() => setEditing({})}>Create a coupon</Button>} />} />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? `Edit ${editing.code}` : 'New coupon'} size="lg">
        {editing && <CouponForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
