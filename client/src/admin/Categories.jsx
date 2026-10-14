import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn } from '../lib/format';
import { Badge, Button, ErrorState, Field, Icon, Img, Input, Modal, Select, Skeleton, Textarea, Toggle, useConfirm } from '../components/ui';
import { applyServerErrors } from '../pages/Auth';
import { ImageUploader, PageHeader, SearchBox, Toolbar } from './kit';

const MAX_DEPTH = 3;
const AUDIENCES = [['all', 'Everyone (unisex / shared)'], ['women', 'Women'], ['men', 'Men'], ['universal', 'Universal']];

const schema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(80),
  slug: z.string().trim().max(100).regex(/^[a-z0-9-]*$/, 'Use lowercase letters, numbers and dashes').optional(),
  tagline: z.string().max(160).optional(),
  description: z.string().max(600).optional(),
  parent: z.string().optional(),
  department: z.enum(['all', 'women', 'men', 'universal']),
  sortOrder: z.coerce.number().int(),
  isActive: z.boolean(),
  showInMenu: z.boolean(),
  showOnHome: z.boolean(),
  isFeatured: z.boolean(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(250).optional(),
  bannerTitle: z.string().max(120).optional(),
  bannerSubtitle: z.string().max(200).optional(),
});

/** Flattens the tree with depth and an indented label for pickers. */
function flatten(tree) {
  const out = [];
  const walk = (nodes, depth, path) => (nodes || []).forEach((n) => {
    out.push({ ...n, depth, path: [...path, n.name] });
    walk(n.children, depth + 1, [...path, n.name]);
  });
  walk(tree, 1, []);
  return out;
}

const descendantIds = (node) => (node?.children || []).flatMap((c) => [c._id, ...descendantIds(c)]);
const subtreeDepth = (node) => (node?.children?.length ? 1 + Math.max(...node.children.map(subtreeDepth)) : 0);

function CategoryForm({ initial, flat, onDone }) {
  const qc = useQueryClient();
  const [image, setImage] = useState(initial?.image?.url ? [initial.image] : []);
  const [banner, setBanner] = useState(initial?.banner?.url ? [{ url: initial.banner.url }] : []);
  const self = flat.find((c) => c._id === initial?._id);
  const parentNode = flat.find((c) => c._id === initial?.parent);
  const { register, handleSubmit, control, setError, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name || '',
      slug: initial?.slug || '',
      tagline: initial?.tagline || '',
      description: initial?.description || '',
      parent: initial?.parent || '',
      department: initial?.department || parentNode?.department || 'all',
      sortOrder: initial?.sortOrder ?? 0,
      isActive: initial?.isActive ?? true,
      showInMenu: initial?.showInMenu ?? true,
      showOnHome: initial?.showOnHome ?? false,
      isFeatured: initial?.isFeatured ?? false,
      metaTitle: initial?.metaTitle || '',
      metaDescription: initial?.metaDescription || '',
      bannerTitle: initial?.banner?.title || '',
      bannerSubtitle: initial?.banner?.subtitle || '',
    },
  });
  // A category can't move under itself or its own children, or deeper than 3 levels.
  const blocked = new Set(self ? [self._id, ...descendantIds(self)] : []);
  const ownDepth = subtreeDepth(self);
  const parentOptions = flat.filter((p) => !blocked.has(p._id) && p.depth + 1 + ownDepth <= MAX_DEPTH);
  const metaTitle = watch('metaTitle') || '';
  const metaDescription = watch('metaDescription') || '';

  const onSubmit = async ({ bannerTitle, bannerSubtitle, ...values }) => {
    const body = {
      ...values,
      parent: values.parent || null,
      slug: values.slug || undefined,
      image: image[0] ? { url: image[0].url, publicId: image[0].publicId } : null,
      banner: { url: banner[0]?.url || '', title: bannerTitle || '', subtitle: bannerSubtitle || '' },
    };
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
      <Field label="Address (slug)" hint="Auto-generated if blank. Must be unique." error={errors.slug?.message}><Input error={errors.slug} {...register('slug')} /></Field>
      <Field label="Parent" hint="Leave empty for a top-level category. Max 3 levels." className="md:col-span-2">
        <Select {...register('parent')}>
          <option value="">— Top-level —</option>
          {parentOptions.map((p) => <option key={p._id} value={p._id}>{'— '.repeat(p.depth - 1)}{p.name}{p.department && p.department !== 'all' ? ` (${p.department})` : ''}</option>)}
        </Select>
      </Field>
      <Field label="Audience" hint="Men / Women categories only appear in that department’s menus">
        <Select {...register('department')}>{AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
      </Field>
      <Field label="Display order" hint="Lower numbers first"><Input type="number" {...register('sortOrder')} /></Field>
      <Field label="Tagline" className="md:col-span-2"><Input {...register('tagline')} /></Field>
      <Field label="Description" className="md:col-span-2"><Textarea rows={3} {...register('description')} /></Field>
      <Field label="Image" className="md:col-span-2"><ImageUploader value={image} onChange={setImage} multiple={false} folder="categories" /></Field>
      <details className="md:col-span-2 rounded-xl border border-surface-container-high p-3">
        <summary className="cursor-pointer text-label-lg">Banner (optional)</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mt-3">
          <Field label="Banner image" className="md:col-span-2"><ImageUploader value={banner} onChange={setBanner} multiple={false} folder="categories" /></Field>
          <Field label="Banner title"><Input {...register('bannerTitle')} /></Field>
          <Field label="Banner subtitle"><Input {...register('bannerSubtitle')} /></Field>
        </div>
      </details>
      <details className="md:col-span-2 rounded-xl border border-surface-container-high p-3">
        <summary className="cursor-pointer text-label-lg">Search engines (SEO)</summary>
        <div className="grid grid-cols-1 gap-space-md mt-3">
          <Field label={`SEO title (${metaTitle.length}/60 recommended)`} hint="Blank = “Buy <name> Online”"><Input maxLength={120} {...register('metaTitle')} /></Field>
          <Field label={`SEO description (${metaDescription.length}/160 recommended)`}><Textarea rows={2} maxLength={250} {...register('metaDescription')} /></Field>
        </div>
      </details>
      <div className="md:col-span-2 grid grid-cols-2 gap-2">
        <Controller control={control} name="isActive" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Active" />} />
        <Controller control={control} name="showInMenu" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Show in menus" />} />
        <Controller control={control} name="showOnHome" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Feature on homepage" />} />
        <Controller control={control} name="isFeatured" render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label="Featured category" />} />
      </div>
      <div className="md:col-span-2 flex justify-between gap-2">
        {initial?.slug ? (
          <a href={`/shop/${initial.slug}`} target="_blank" rel="noreferrer" className="btn-tonal gap-1.5"><Icon name="open_in_new" className="text-[18px]" /> Preview page</a>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="tonal" onClick={onDone}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Save category</Button>
        </div>
      </div>
    </form>
  );
}

function MoveProducts({ from, flat, onDone }) {
  const qc = useQueryClient();
  const [to, setTo] = useState('');
  const move = useMutation({
    mutationFn: () => adminApi.moveCategoryProducts(from._id, to),
    onSuccess: (res) => {
      toast.success(`${res.moved} product${res.moved === 1 ? '' : 's'} moved`);
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="flex flex-col gap-space-md">
      <p className="text-body-sm text-on-surface-variant">
        Moves all {from.productCount} products in <b>{from.name}</b> into another category. Products keep their other categories; nothing is duplicated or deleted.
        Afterwards you can switch <b>{from.name}</b> off or delete it.
      </p>
      <Field label="Move products to">
        <Select value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Choose a category…</option>
          {flat.filter((c) => c._id !== from._id).map((c) => <option key={c._id} value={c._id}>{'— '.repeat(c.depth - 1)}{c.name}{c.department && c.department !== 'all' ? ` (${c.department})` : ''}</option>)}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="tonal" onClick={onDone}>Cancel</Button>
        <Button disabled={!to} loading={move.isPending} onClick={() => move.mutate()}>Move products</Button>
      </div>
    </div>
  );
}

export default function Categories() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [moving, setMoving] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [q, setQ] = useState('');
  const [audience, setAudience] = useState('');
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin-categories'], queryFn: adminApi.categories, select: (d) => d.categories });
  const flat = useMemo(() => flatten(data), [data]);
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
    if (c.productCount > 0) {
      toast.error(`${c.name} still has ${c.productCount} products. Move them first, or switch the category off.`);
      setMoving(c);
      return;
    }
    if (await confirm({ title: `Delete ${c.name}?`, message: 'Only empty categories without subcategories can be deleted.', confirmLabel: 'Delete' })) remove.mutate(c._id);
  };

  const term = q.trim().toLowerCase();
  const matches = (c) => (!term || c.name.toLowerCase().includes(term) || c.slug.includes(term)) && (!audience || c.department === audience || (audience === 'all' && !c.department));
  // While searching or filtering, show matching rows flat (with their path); otherwise the tree.
  const filtering = Boolean(term || audience);
  const rows = filtering
    ? flat.filter(matches)
    : flat.filter((c) => {
        // hidden when any ancestor is collapsed
        let parent = flat.find((p) => p._id === c.parent);
        while (parent) {
          if (collapsed[parent._id]) return false;
          parent = flat.find((p) => p._id === parent.parent);
        }
        return true;
      });

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Up to 3 levels: department → category → subcategory. Products can be listed in several categories (Admin → Products → Extra categories) without being copied."
        actions={<Button icon="add" onClick={() => setEditing({})}>New category</Button>}
      />
      <Toolbar>
        <SearchBox value={q} onChange={setQ} placeholder="Search name or address…" />
        <select className="input h-10 w-auto" value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="Audience">
          <option value="">All audiences</option>
          {AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Toolbar>
      {isError ? <ErrorState error={error} onRetry={refetch} /> : (
        <div className="card overflow-hidden divide-y divide-surface-container-high">
          {isLoading
            ? [1, 2, 3].map((i) => <div key={i} className="p-space-md"><Skeleton className="h-10" /></div>)
            : rows.map((c) => (
                <div key={c._id} className={cn('flex items-center gap-3 px-space-md py-2.5', c.depth > 1 && 'bg-surface-container-low/40')} style={filtering ? undefined : { paddingLeft: `${(c.depth - 1) * 28 + 16}px` }}>
                  {!filtering && c.children?.length > 0 ? (
                    <button type="button" className="btn-icon w-7 h-7" onClick={() => setCollapsed({ ...collapsed, [c._id]: !collapsed[c._id] })} aria-label={collapsed[c._id] ? 'Expand' : 'Collapse'} aria-expanded={!collapsed[c._id]}>
                      <Icon name="chevron_right" className={cn('transition-transform', !collapsed[c._id] && 'rotate-90')} />
                    </button>
                  ) : <span className="w-7 shrink-0" />}
                  <Img src={c.image?.url} alt="" className="w-9 h-9 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg flex items-center gap-1.5 flex-wrap">
                      {filtering && c.path.length > 1 && <span className="text-outline font-normal">{c.path.slice(0, -1).join(' › ')} ›</span>}
                      {c.name}
                      {c.department && c.department !== 'all' && <Badge tone="neutral">{c.department}</Badge>}
                      {!c.isActive && <Badge tone="danger">Off</Badge>}
                      {c.isActive && c.showInMenu === false && <Badge tone="neutral">Not in menu</Badge>}
                      {c.showOnHome && <Badge tone="teal">Homepage</Badge>}
                      {c.isFeatured && <Badge tone="teal">Featured</Badge>}
                    </p>
                    <p className="text-label-sm font-normal text-outline truncate">/shop/{c.slug}</p>
                  </div>
                  <span className={cn('text-label-md whitespace-nowrap', c.productCount ? 'text-on-surface-variant' : 'text-outline')}>{c.productCount} products</span>
                  <div className="flex gap-0.5">
                    {c.depth < MAX_DEPTH && <button type="button" className="btn-icon w-8 h-8" aria-label={`Add subcategory to ${c.name}`} title="Add subcategory" onClick={() => setEditing({ parent: c._id, department: c.department })}><Icon name="add" className="text-[18px]" /></button>}
                    <a className="btn-icon w-8 h-8" href={`/shop/${c.slug}`} target="_blank" rel="noreferrer" aria-label={`Preview ${c.name}`} title="Preview"><Icon name="visibility" className="text-[18px]" /></a>
                    {c.productCount > 0 && <button type="button" className="btn-icon w-8 h-8" aria-label={`Move products out of ${c.name}`} title="Move products" onClick={() => setMoving(c)}><Icon name="drive_file_move" className="text-[18px]" /></button>}
                    <button type="button" className="btn-icon w-8 h-8" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Icon name="edit" className="text-[18px]" /></button>
                    <button type="button" className="btn-icon w-8 h-8 hover:text-error" aria-label={`Delete ${c.name}`} onClick={() => del(c)}><Icon name="delete" className="text-[18px]" /></button>
                  </div>
                </div>
              ))}
          {!isLoading && !rows.length && <p className="p-space-md text-body-sm text-outline">No categories match.</p>}
        </div>
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? `Edit ${editing.name}` : editing?.parent ? 'New subcategory' : 'New category'} size="lg">
        {editing && <CategoryForm initial={editing} flat={flat} onDone={() => setEditing(null)} />}
      </Modal>
      <Modal open={Boolean(moving)} onClose={() => setMoving(null)} title={moving ? `Move products out of ${moving.name}` : ''}>
        {moving && <MoveProducts from={moving} flat={flat} onDone={() => setMoving(null)} />}
      </Modal>
    </>
  );
}
