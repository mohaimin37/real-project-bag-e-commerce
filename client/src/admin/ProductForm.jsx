import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatINR } from '../lib/format';
import { useCategories } from '../hooks/useStore';
import { Button, ErrorState, Field, Icon, Input, PageLoader, Select, Textarea, Toggle, useConfirm } from '../components/ui';
import { applyServerErrors } from '../pages/Auth';
import { ChipInput, ImageUploader, KeyValueEditor, Panel } from './kit';

const MATERIALS = ['Recycled Cordura® 840D', 'Waterproof Ballistic Nylon', 'Full-Grain Italian Calfskin', 'Vegetable-Tanned Leather', 'Waxed Organic Canvas', 'Bio-Based Vegan Polyurethane', 'Stainless Steel'];
const FEATURES = ['Laptop 16" Sleeve', 'Laptop 14" Sleeve', 'IPX5 Waterproof', 'Trolley Pass-Through', 'RFID Blocking Pocket', 'Fidlock® Magnetic Fasteners', 'Shoe Compartment'];
const PURPOSES = ['work', 'travel', 'transit', 'business', 'creative'];
const FAMILIES = ['navy', 'teal', 'tan', 'onyx', 'olive', 'grey', 'orange', 'brown', 'white', 'red', 'pink', 'blue', 'green'];

const variantSchema = z.object({
  _id: z.string().optional(),
  name: z.string().trim().min(1, 'Required'),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Hex colour'),
  colorFamily: z.string().optional(),
  size: z.string().optional(),
  sku: z.string().trim().min(2, 'Required'),
  stock: z.coerce.number().int().min(0, '≥ 0'),
  images: z.array(z.any()).optional(),
});

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter a product name'),
    slug: z.string().trim().optional(),
    sku: z.string().trim().min(2, 'Enter a base SKU'),
    tagline: z.string().max(80).optional(),
    badge: z.string().max(30).optional(),
    shortDescription: z.string().max(300).optional(),
    description: z.string().max(5000).optional(),
    category: z.string().min(1, 'Choose a category'),
    subcategory: z.string().optional(),
    gender: z.enum(['unisex', 'women', 'men']),
    price: z.coerce.number({ message: 'Enter a price' }).min(0),
    salePrice: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
    capacity: z.string().max(20).optional(),
    lowStockThreshold: z.coerce.number().int().min(0),
    variants: z.array(variantSchema).min(1, 'Add at least one variant'),
    isFeatured: z.boolean(),
    isBestseller: z.boolean(),
    isNewArrival: z.boolean(),
    isVisible: z.boolean(),
  })
  .refine((d) => d.salePrice === '' || d.salePrice === undefined || Number(d.salePrice) < d.price, { message: 'Sale price must be lower than the price', path: ['salePrice'] });

const blank = {
  name: '',
  slug: '',
  sku: '',
  tagline: '',
  badge: '',
  shortDescription: '',
  description: '',
  category: '',
  subcategory: '',
  gender: 'unisex',
  price: '',
  salePrice: '',
  capacity: '',
  lowStockThreshold: 5,
  variants: [{ name: 'Default', colorHex: '#111111', colorFamily: 'onyx', size: '', sku: '', stock: 0, images: [] }],
  isFeatured: false,
  isBestseller: false,
  isNewArrival: false,
  isVisible: true,
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: cats } = useCategories();
  const existing = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => adminApi.product(id), enabled: !isNew, select: (d) => d.product });

  const [images, setImages] = useState([]);
  const [lists, setLists] = useState({ materials: [], features: [], purposes: [], tags: [] });
  const [specs, setSpecs] = useState([]);
  const [faqs, setFaqs] = useState([]);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: blank });
  const { register, control, handleSubmit, watch, reset, setValue, setError, formState: { errors, isDirty } } = form;
  const variants = useFieldArray({ control, name: 'variants' });

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    reset({
      ...blank,
      ...p,
      category: p.category?._id || p.category || '',
      subcategory: p.subcategory?._id || p.subcategory || '',
      salePrice: p.salePrice ?? '',
      variants: p.variants.map((v) => ({ ...v, colorFamily: v.colorFamily || '', size: v.size || '', images: v.images || [] })),
    });
    setImages(p.images || []);
    setLists({ materials: p.materials || [], features: p.features || [], purposes: p.purposes || [], tags: p.tags || [] });
    setSpecs(p.specifications || []);
    setFaqs(p.faqs || []);
  }, [existing.data, reset]);

  const category = watch('category');
  const subOptions = useMemo(() => cats?.find((c) => c._id === category)?.children || [], [cats, category]);
  const price = Number(watch('price')) || 0;
  const sale = Number(watch('salePrice')) || 0;
  const totalStock = (watch('variants') || []).reduce((s, v) => s + (Number(v.stock) || 0), 0);

  const save = useMutation({
    mutationFn: (body) => (isNew ? adminApi.createProduct(body) : adminApi.updateProduct(id, body)),
    onSuccess: (res) => {
      toast.success(isNew ? 'Product created' : 'Product saved');
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product'] });
      if (isNew) navigate(`/admin/products/${res.product._id}`, { replace: true });
      else existing.refetch();
    },
    onError: (err) => {
      applyServerErrors(err, setError);
      toast.error(err.message);
    },
  });

  const onSubmit = (values) => {
    if (!images.length) {
      toast.error('Add at least one product image');
      return;
    }
    save.mutate({
      ...values,
      slug: values.slug || undefined,
      subcategory: values.subcategory || null,
      salePrice: values.salePrice === '' ? null : Number(values.salePrice),
      images: images.map(({ url, publicId, alt }) => ({ url, publicId, alt: alt || values.name })),
      variants: values.variants.map((v) => ({ ...v, _id: v._id || undefined, images: (v.images || []).map(({ url, publicId }) => ({ url, publicId })) })),
      ...lists,
      specifications: specs.filter((s) => s.label && s.value),
      faqs: faqs.filter((f) => f.question && f.answer),
    });
  };

  const remove = useMutation({
    mutationFn: () => adminApi.deleteProduct(id),
    onSuccess: () => {
      toast.success('Product deleted');
      qc.invalidateQueries({ queryKey: ['admin'] });
      navigate('/admin/products', { replace: true });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isNew && existing.isLoading) return <PageLoader />;
  if (!isNew && existing.isError) return <ErrorState error={existing.error} onRetry={existing.refetch} />;

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error('Please fix the highlighted fields'))} noValidate>
      <div className="sticky top-16 z-20 -mx-margin-sm md:-mx-margin px-margin-sm md:px-margin py-3 mb-space-lg bg-surface/90 backdrop-blur border-b border-surface-container-high flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/products" className="btn-icon" aria-label="Back to products"><Icon name="arrow_back" /></Link>
          <div className="min-w-0">
            <h1 className="text-headline-md truncate">{isNew ? 'New product' : watch('name') || 'Edit product'}</h1>
            {!isNew && <p className="text-label-sm font-normal text-outline">/{existing.data?.slug}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <a href={`/product/${existing.data?.slug}`} target="_blank" rel="noreferrer" className="btn-tonal btn-sm"><Icon name="open_in_new" className="text-[18px]" /> View</a>
              <Button type="button" variant="tonal" size="sm" icon="delete" className="text-error" onClick={async () => (await confirm({ title: 'Delete this product?', confirmLabel: 'Delete' })) && remove.mutate()}>Delete</Button>
            </>
          )}
          <Button type="submit" loading={save.isPending} icon="save">{isNew ? 'Create product' : 'Save changes'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md items-start">
        <div className="xl:col-span-2 flex flex-col gap-space-md">
          <Panel title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <Field label="Product name" error={errors.name?.message} required className="md:col-span-2"><Input error={errors.name} {...register('name')} /></Field>
              <Field label="Base SKU" error={errors.sku?.message} required><Input className="uppercase" error={errors.sku} {...register('sku')} /></Field>
              <Field label="URL slug" hint="Leave blank to generate from the name"><Input placeholder="the-apex-commuter-24l" {...register('slug')} /></Field>
              <Field label="Tagline" hint='Shown on cards, e.g. "24L Technical Pack"'><Input {...register('tagline')} /></Field>
              <Field label="Badge" hint="Bestseller, Cabin Approved…"><Input {...register('badge')} /></Field>
              <Field label="Short description" className="md:col-span-2"><Textarea rows={2} maxLength={300} {...register('shortDescription')} /></Field>
              <Field label="Full description" className="md:col-span-2"><Textarea rows={6} {...register('description')} /></Field>
            </div>
          </Panel>

          <Panel title="Images" action={<span className="text-label-sm font-normal text-outline">First image is the cover</span>}>
            <ImageUploader value={images} onChange={setImages} uploader={adminApi.uploadProductImages} />
          </Panel>

          <Panel
            title="Variants & stock"
            action={
              <Button
                type="button"
                variant="tonal"
                size="sm"
                icon="add"
                onClick={() => variants.append({ name: '', colorHex: '#006b5d', colorFamily: '', size: '', sku: `${(watch('sku') || 'SKU').toUpperCase()}-${String(variants.fields.length + 1).padStart(2, '0')}`, stock: 0, images: [] })}
              >
                Add variant
              </Button>
            }
          >
            {errors.variants?.root && <p className="text-label-md text-error mb-2">{errors.variants.root.message}</p>}
            <div className="flex flex-col gap-space-sm">
              {variants.fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-space-sm rounded-xl bg-surface-container-low">
                  <Controller
                    control={control}
                    name={`variants.${i}.colorHex`}
                    render={({ field: f }) => (
                      <label className="col-span-2 sm:col-span-1 relative w-11 h-11 rounded-lg overflow-hidden cursor-pointer ring-1 ring-outline-variant" style={{ background: f.value }} title="Pick colour">
                        <input type="color" value={f.value} onChange={(e) => f.onChange(e.target.value)} className="opacity-0 w-full h-full cursor-pointer" aria-label="Variant colour" />
                      </label>
                    )}
                  />
                  <div className="col-span-10 sm:col-span-3">
                    <Input placeholder="Colour name" error={errors.variants?.[i]?.name} {...register(`variants.${i}.name`)} />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <select className="input" aria-label="Colour family" {...register(`variants.${i}.colorFamily`)}>
                      <option value="">Family</option>
                      {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <Input placeholder="Variant SKU" className="uppercase" error={errors.variants?.[i]?.sku} {...register(`variants.${i}.sku`)} />
                  </div>
                  <div className="col-span-8 sm:col-span-2">
                    <Input type="number" min={0} placeholder="Stock" aria-label="Stock" error={errors.variants?.[i]?.stock} {...register(`variants.${i}.stock`)} />
                  </div>
                  <button type="button" className="col-span-4 sm:col-span-1 btn-icon hover:text-error justify-self-end" disabled={variants.fields.length === 1} onClick={() => variants.remove(i)} aria-label="Remove variant">
                    <Icon name="delete" />
                  </button>
                  <div className="col-span-12">
                    <Controller
                      control={control}
                      name={`variants.${i}.images`}
                      render={({ field: f }) => (
                        <details className="group">
                          <summary className="text-label-md text-secondary cursor-pointer list-none flex items-center gap-1">
                            <Icon name="photo_library" className="text-[16px]" /> Variant photos ({f.value?.length || 0})
                            <Icon name="expand_more" className="text-[16px] group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="pt-2"><ImageUploader value={f.value || []} onChange={f.onChange} uploader={adminApi.uploadProductImages} /></div>
                        </details>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-label-md text-on-surface-variant mt-space-sm">Total stock: <b>{totalStock}</b> units</p>
          </Panel>

          <Panel title="Specifications">
            <KeyValueEditor value={specs} onChange={setSpecs} keyLabel="e.g. Volume" valueLabel="e.g. 24 Liters" />
          </Panel>

          <Panel title="FAQs">
            <KeyValueEditor value={faqs} onChange={setFaqs} keyName="question" valueName="answer" keyLabel="Question" valueLabel="Answer" multiline />
          </Panel>
        </div>

        <div className="flex flex-col gap-space-md xl:sticky xl:top-36">
          <Panel title="Visibility & labels">
            <div className="flex flex-col gap-3">
              {[
                ['isVisible', 'Visible in store'],
                ['isFeatured', 'Featured'],
                ['isBestseller', 'Bestseller'],
                ['isNewArrival', 'New arrival'],
              ].map(([name, label]) => (
                <Controller key={name} control={control} name={name} render={({ field }) => <Toggle checked={field.value} onChange={field.onChange} label={label} />} />
              ))}
            </div>
          </Panel>

          <Panel title="Pricing (INR)">
            <div className="flex flex-col gap-space-md">
              <Field label="Price" error={errors.price?.message} required><Input type="number" min={0} step="1" error={errors.price} {...register('price')} /></Field>
              <Field label="Sale price" error={errors.salePrice?.message} hint="Leave blank for no sale"><Input type="number" min={0} step="1" error={errors.salePrice} {...register('salePrice')} /></Field>
              {sale > 0 && sale < price && (
                <p className="text-label-md text-secondary flex items-center gap-1"><Icon name="sell" className="text-[16px]" /> {Math.round(((price - sale) / price) * 100)}% off · customers save {formatINR(price - sale)}</p>
              )}
              <Field label="Low-stock alert at"><Input type="number" min={0} {...register('lowStockThreshold')} /></Field>
            </div>
          </Panel>

          <Panel title="Organisation">
            <div className="flex flex-col gap-space-md">
              <Field label="Category" error={errors.category?.message} required>
                <Select error={errors.category} {...register('category', { onChange: () => setValue('subcategory', '') })}>
                  <option value="">Choose…</option>
                  {cats?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Subcategory" error={errors.subcategory?.message}>
                <Select disabled={!subOptions.length} {...register('subcategory')}>
                  <option value="">None</option>
                  {subOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Audience">
                <Select {...register('gender')}>
                  <option value="unisex">Unisex</option>
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                </Select>
              </Field>
              <Field label="Capacity"><Input placeholder="24L" {...register('capacity')} /></Field>
            </div>
          </Panel>

          <Panel title="Attributes">
            <div className="flex flex-col gap-space-md">
              <Field label="Materials"><ChipInput value={lists.materials} onChange={(v) => setLists({ ...lists, materials: v })} suggestions={MATERIALS} /></Field>
              <Field label="Technical features"><ChipInput value={lists.features} onChange={(v) => setLists({ ...lists, features: v })} suggestions={FEATURES} /></Field>
              <Field label="Purposes" hint="Powers the homepage purpose tiles">
                <div className="flex flex-wrap gap-1.5">
                  {PURPOSES.map((p) => {
                    const on = lists.purposes.includes(p);
                    return (
                      <button key={p} type="button" onClick={() => setLists({ ...lists, purposes: on ? lists.purposes.filter((x) => x !== p) : [...lists.purposes, p] })} className={cn('chip h-7 capitalize', on ? 'bg-primary text-on-primary' : 'bg-surface-container-low')}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Search tags"><ChipInput value={lists.tags} onChange={(v) => setLists({ ...lists, tags: v.map((t) => t.toLowerCase()) })} /></Field>
            </div>
          </Panel>
          {isDirty && <p className="text-label-md text-on-tertiary-container flex items-center gap-1"><Icon name="edit_note" className="text-[18px]" /> Unsaved changes</p>}
        </div>
      </div>
    </form>
  );
}
