import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn } from '../lib/format';
import { Badge, Button, ErrorState, Field, Icon, Img, Input, Modal, Select, Skeleton, Textarea, Toggle, useConfirm } from '../components/ui';
import { applyServerErrors } from '../pages/Auth';
import { ImageUploader, PageHeader } from './kit';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter a name'),
  slug: z.string().trim().optional(),
  tagline: z.string().max(160).optional(),
  description: z.string().max(600).optional(),
  parent: z.string().optional(),
  sortOrder: z.coerce.number().int(),
  isActive: z.boolean(),
  showInMenu: z.boolean(),
});

function CategoryForm({ initial, parents, onDone }) {
  const qc = useQueryClient();
  const [image, setImage] = useState(initial?.image?.url ? [initial.image] : []);
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name || '',
      slug: initial?.slug || '',
      tagline: initial?.tagline || '',
      description: initial?.description || '',
      parent: initial?.parent || '',
      sortOrder: initial?.sortOrder ?? 0,
      isActive: initial?.isActive ?? true,
      showInMenu: initial?.showInMenu ?? true,
    },
  });
  const onSubmit = async (values) => {
    const body = { ...values, parent: values.parent || null, slug: values.slug || undefined, image: image[0] ? { url: image[0].url, publicId: image[0].publicId } : null };
    try {
      if (initial?._id) await adminApi.updateCategory(initial._id, body);
      else await adminApi.createCategory(body);
      toast.success('Category saved');
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      onDone();
    } catch (err) {
      applyServerErrors(err, setError);
      toast.error(err.message);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
      <Field label="Name" error={errors.name?.message} required><Input error={errors.name} {...register('name')} /></Field>
      <Field label="Slug" hint="Auto-generated if blank"><Input {...register('slug')} /></Field>
      <Field label="Parent" hint="Leave empty for a top-level category" className="md:col-span-2">
        <Select {...register('parent')}>
          <option value="">— Top-level —</option>
          {parents.filter((p) => p._id !== initial?._id).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Tagline" className="md:col-span-2"><Input {...register('tagline')} /></Field>
      <Field label="Description" className="md:col-span-2"><Textarea rows={3} {...register('description')} /></Field>
      <Field label="Image" className="md:col-span-2"><ImageUploader value={image} onChange={setImage} multiple={false} folder="categories" /></Field>
      <Field label="Sort order"><Input type="number" {...register('sortOrder')} /></Field>
      <div className="flex flex-col gap-2 justify-end pb-2">
        <Controller control={control} name="isActive" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Active" />} />
        <Controller control={control} name="showInMenu" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Show in menu" />} />
      </div>
      <div className="md:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="tonal" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Save category</Button>
      </div>
    </form>
  );
}

export default function Categories() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin-categories'], queryFn: adminApi.categories, select: (d) => d.categories });
  const remove = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      toast.success('Category deleted');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e) => toast.error(e.message, { duration: 6000 }),
  });
  const del = async (c) => {
    if (await confirm({ title: `Delete ${c.name}?`, message: 'Only empty categories without subcategories can be deleted.', confirmLabel: 'Delete' })) remove.mutate(c._id);
  };

  const Row = ({ c, child }) => (
    <div className={cn('flex items-center gap-3 px-space-md py-3', child ? 'pl-12 bg-surface-container-low/50' : '')}>
      {!child && c.children.length > 0 ? (
        <button type="button" className="btn-icon w-7 h-7" onClick={() => setExpanded({ ...expanded, [c._id]: !expanded[c._id] })} aria-label="Toggle subcategories">
          <Icon name="chevron_right" className={cn('transition-transform', expanded[c._id] !== false && 'rotate-90')} />
        </button>
      ) : !child ? <span className="w-7" /> : null}
      <Img src={c.image?.url} alt="" className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-label-lg flex items-center gap-2">{c.name} {!c.isActive && <Badge tone="danger">Hidden</Badge>}</p>
        <p className="text-label-sm font-normal text-outline truncate">/{c.slug} · {c.tagline}</p>
      </div>
      <span className="text-label-md text-on-surface-variant whitespace-nowrap">{c.productCount} products</span>
      {!child && <span className="text-label-md text-outline whitespace-nowrap hidden sm:inline">{c.children.length} sub</span>}
      <div className="flex gap-1">
        {!child && <button type="button" className="btn-icon w-8 h-8" aria-label="Add subcategory" title="Add subcategory" onClick={() => setEditing({ parent: c._id })}><Icon name="add" className="text-[18px]" /></button>}
        <button type="button" className="btn-icon w-8 h-8" aria-label="Edit" onClick={() => setEditing(c)}><Icon name="edit" className="text-[18px]" /></button>
        <button type="button" className="btn-icon w-8 h-8 hover:text-error" aria-label="Delete" onClick={() => del(c)}><Icon name="delete" className="text-[18px]" /></button>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Categories" subtitle="Top-level categories and their subcategories drive navigation and filters." actions={<Button icon="add" onClick={() => setEditing({})}>New category</Button>} />
      {isError ? <ErrorState error={error} onRetry={refetch} /> : (
        <div className="card overflow-hidden divide-y divide-surface-container-high">
          {isLoading
            ? [1, 2, 3].map((i) => <div key={i} className="p-space-md"><Skeleton className="h-10" /></div>)
            : data.map((c) => (
                <div key={c._id}>
                  <Row c={c} />
                  {expanded[c._id] !== false && c.children.map((s) => <Row key={s._id} c={{ ...s, children: [] }} child />)}
                </div>
              ))}
        </div>
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? `Edit ${editing.name}` : editing?.parent ? 'New subcategory' : 'New category'} size="lg">
        {editing && <CategoryForm initial={editing} parents={data || []} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
