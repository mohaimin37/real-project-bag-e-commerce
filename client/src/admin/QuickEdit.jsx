import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDate, formatINR, imgUrl } from '../lib/format';
import { Badge, Button, EmptyState, ErrorState, Field, Icon, Input, Modal, Select, Skeleton, Toggle, useConfirm } from '../components/ui';
import { ImageUploader, PageHeader } from './kit';

/* ─────────────────────────── Products ─────────────────────────── */

function useAllAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products', 'quick-all'],
    queryFn: async () => {
      const all = [];
      for (let page = 1; page <= 30; page += 1) {
        // eslint-disable-next-line no-await-in-loop
        const res = await adminApi.products({ page, limit: 100, sort: 'name' });
        all.push(...res.items);
        if (page >= res.pages) break;
      }
      return all;
    },
  });
}

/** Snapshot of the editable fields, so edits can be compared with what's saved. */
const editable = (p) => ({
  price: String(p.price ?? ''),
  salePrice: p.salePrice != null ? String(p.salePrice) : '',
  listing: String(p.subcategory?._id || p.subcategory || p.category?._id || p.category || ''),
  images: p.images || [],
  isVisible: p.isVisible !== false,
  isFeatured: Boolean(p.isFeatured),
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const AUDIENCE = { men: 'Men', women: 'Women', unisex: 'Universal' };
const offPct = (price, sale) => (sale && price && Number(sale) < Number(price) ? Math.round((1 - Number(sale) / Number(price)) * 100) : 0);

function ListingSelect({ value, onChange, tree, className, placeholder }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label="Category">
      {placeholder && <option value="">{placeholder}</option>}
      {tree?.map((cat) => (
        <optgroup key={cat._id} label={cat.name}>
          <option value={cat._id}>{cat.name} (main)</option>
          {cat.children?.map((s) => <option key={s._id} value={s._id}>{cat.name} › {s.name}</option>)}
        </optgroup>
      ))}
    </Select>
  );
}

function ProductRow({ product, draft, onChange, tree, selected, onSelect, onSave, saving, onPhotos }) {
  const d = draft;
  const dirty = !same(d, editable(product));
  const pct = offPct(d.price, d.salePrice);
  const badSale = d.salePrice !== '' && Number(d.salePrice) >= Number(d.price);
  const set = (k) => (v) => onChange({ ...d, [k]: v?.target ? v.target.value : v });
  const cover = d.images[0]?.url;
  return (
    <div className={cn('card p-space-sm grid gap-3 items-center transition-shadow', 'grid-cols-[auto_64px_1fr] lg:grid-cols-[auto_64px_minmax(170px,1.2fr)_minmax(200px,1fr)_110px_215px_auto_auto]', dirty && 'ring-2 ring-secondary/50', !d.isVisible && 'opacity-70')}>
      <input type="checkbox" checked={selected} onChange={onSelect} className="w-5 h-5 rounded accent-secondary" aria-label={`Select ${product.name}`} />
      <button type="button" onClick={onPhotos} className="relative group w-16 h-16 rounded-lg overflow-hidden bg-surface-container-low" aria-label={`Change photos for ${product.name}`}>
        {cover ? <img src={imgUrl(cover)} alt="" className="w-full h-full object-cover" /> : <Icon name="add_photo_alternate" className="text-outline" />}
        <span className="absolute inset-0 bg-ink/60 text-white text-[10px] font-bold flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <Icon name="photo_camera" className="text-[18px]" /> Change
        </span>
        {d.images.length > 1 && <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-ink/70 text-white text-[10px]">{d.images.length}</span>}
      </button>
      <div className="min-w-0">
        <Link to={`/admin/products/${product._id}`} className="text-label-lg hover:text-secondary line-clamp-1">{product.name}</Link>
        <p className="text-label-sm font-normal text-outline truncate">
          {product.sku} · {product.stock} in stock{product.variants?.length > 1 ? ` · ${product.variants.length} colours` : ''}
        </p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {!d.isVisible && <Badge>Hidden</Badge>}
          {pct > 0 && <Badge tone="danger">On sale −{pct}%</Badge>}
          {d.isFeatured && <Badge tone="teal">Featured</Badge>}
        </div>
      </div>

      <div className="col-span-3 lg:col-span-1 grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1.2fr] lg:contents gap-2">
        <ListingSelect value={d.listing} onChange={set('listing')} tree={tree} className="col-span-2 sm:col-span-1 h-10" />
        <label className="relative">
          <span className="sr-only">Price</span>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-body-sm">₹</span>
          <Input inputMode="numeric" value={d.price} onChange={(e) => set('price')(e.target.value.replace(/[^\d.]/g, ''))} className="h-10 pl-7 tabular-nums" aria-label="Price" />
        </label>
        <div className="flex flex-col gap-1">
          <label className="relative">
            <span className="sr-only">Sale price</span>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-body-sm">₹</span>
            <Input inputMode="numeric" placeholder="No sale" value={d.salePrice} error={badSale} onChange={(e) => set('salePrice')(e.target.value.replace(/[^\d.]/g, ''))} className="h-10 pl-7 tabular-nums" aria-label="Sale price" />
          </label>
          <div className="flex gap-1">
            {[10, 20, 30].map((n) => (
              <button key={n} type="button" onClick={() => set('salePrice')(String(Math.round(Number(d.price) * (1 - n / 100))))} className="px-1.5 h-6 rounded text-[11px] font-semibold bg-surface-container-low hover:bg-surface-container-high">−{n}%</button>
            ))}
            {d.salePrice !== '' && <button type="button" onClick={() => set('salePrice')('')} className="px-1.5 h-6 rounded text-[11px] font-semibold text-error hover:bg-error-container">Clear</button>}
          </div>
        </div>
      </div>

      <div className="col-span-3 lg:col-span-1 flex items-center gap-3 lg:flex-col lg:items-start">
        <Toggle checked={d.isVisible} onChange={set('isVisible')} label="Visible" />
        <Toggle checked={d.isFeatured} onChange={set('isFeatured')} label="Featured" />
      </div>
      <div className="col-span-3 lg:col-span-1 flex justify-end">
        <Button size="sm" icon={dirty ? 'save' : 'check'} variant={dirty ? 'primary' : 'tonal'} disabled={!dirty || badSale} loading={saving} onClick={onSave}>
          {dirty ? 'Save' : 'Saved'}
        </Button>
      </div>
    </div>
  );
}

function ProductsTab({ tree }) {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, error, refetch } = useAllAdminProducts();
  const [drafts, setDrafts] = useState({});
  const [selected, setSelected] = useState([]);
  const [photosFor, setPhotosFor] = useState(null);
  const [saving, setSaving] = useState({});
  const [bulk, setBulk] = useState({ percent: '20', listing: '' });
  const q = params.get('q') || '';
  const show = params.get('show') || 'all';
  const inCat = params.get('cat') || '';

  const draftOf = (p) => drafts[p._id] || editable(p);
  const dirtyIds = (data || []).filter((p) => drafts[p._id] && !same(drafts[p._id], editable(p))).map((p) => p._id);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data || []).filter((p) => {
      if (needle && !`${p.name} ${p.sku}`.toLowerCase().includes(needle)) return false;
      if (inCat && String(p.category?._id) !== inCat && String(p.subcategory?._id) !== inCat) return false;
      if (show === 'sale' && !(p.salePrice != null && p.salePrice < p.price)) return false;
      if (show === 'hidden' && p.isVisible !== false) return false;
      if (show === 'featured' && !p.isFeatured) return false;
      if (show === 'nophoto' && p.images?.length) return false;
      return true;
    });
  }, [data, q, show, inCat]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    qc.invalidateQueries({ queryKey: ['products'] }); // storefront lists
    qc.invalidateQueries({ queryKey: ['product'] });
  };

  const save = async (p) => {
    const d = draftOf(p);
    const body = {
      price: Number(d.price),
      salePrice: d.salePrice === '' ? null : Number(d.salePrice),
      listing: d.listing,
      images: d.images.map(({ url, publicId, alt }) => ({ url, ...(publicId ? { publicId } : {}), ...(alt ? { alt } : {}) })),
      isVisible: d.isVisible,
      isFeatured: d.isFeatured,
    };
    setSaving((s) => ({ ...s, [p._id]: true }));
    try {
      const { product } = await adminApi.quickUpdateProduct(p._id, body);
      qc.setQueryData(['admin', 'products', 'quick-all'], (old) => old?.map((x) => (x._id === p._id ? product : x)));
      setDrafts(({ [p._id]: _done, ...rest }) => rest);
      refresh();
      return true;
    } catch (err) {
      toast.error(`${p.name}: ${err.message}`);
      return false;
    } finally {
      setSaving(({ [p._id]: _s, ...rest }) => rest);
    }
  };

  const saveAll = async () => {
    const list = data.filter((p) => dirtyIds.includes(p._id));
    let ok = 0;
    for (const p of list) {
      // eslint-disable-next-line no-await-in-loop
      if (await save(p)) ok += 1;
    }
    if (ok) toast.success(`${ok} product${ok === 1 ? '' : 's'} updated — live for all shoppers`);
  };

  const bulkRun = useMutation({
    mutationFn: (body) => adminApi.bulkUpdateProducts({ ids: selected, ...body }),
    onSuccess: (res, body) => {
      const labels = { sale: `put on sale at ${body.percent}% off`, endSale: 'taken off sale', move: 'moved', show: 'shown in the store', hide: 'hidden from the store', feature: 'featured', unfeature: 'unfeatured', gender: `set to ${AUDIENCE[body.gender]}` };
      toast.success(`${res.updated} product${res.updated === 1 ? '' : 's'} ${labels[body.action]}`);
      setSelected([]);
      setDrafts({});
      refetch();
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r._id));

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="flex flex-col gap-space-md pb-24">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <label className="relative flex-1 max-w-md">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
          <input value={q} onChange={(e) => set('q', e.target.value)} placeholder="Find a product or SKU" className="input h-10 pl-10" aria-label="Search products" />
        </label>
        <ListingSelect value={inCat} onChange={(v) => set('cat', v)} tree={tree} className="h-10 lg:w-64" placeholder="All categories" />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {[['all', 'All'], ['sale', 'On sale'], ['featured', 'Featured'], ['hidden', 'Hidden'], ['nophoto', 'No photo']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => set('show', k === 'all' ? '' : k)} className={cn('chip h-9 shrink-0', show === k ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}>{label}</button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      <div className={cn('card p-space-sm flex flex-wrap items-center gap-2 transition-colors', selected.length ? 'ring-2 ring-secondary/40' : '')}>
        <label className="flex items-center gap-2 px-2 text-label-md">
          <input type="checkbox" className="w-5 h-5 rounded accent-secondary" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((r) => r._id))} aria-label="Select all shown" />
          {selected.length ? `${selected.length} selected` : `Select all ${rows.length}`}
        </label>
        {selected.length > 0 && (
          <>
            <span className="w-px h-6 bg-surface-container-high" />
            <div className="flex items-center gap-1">
              <Input value={bulk.percent} onChange={(e) => setBulk({ ...bulk, percent: e.target.value.replace(/\D/g, '') })} className="h-9 w-16 text-center" aria-label="Percent off" />
              <Button size="sm" variant="secondary" icon="sell" loading={bulkRun.isPending} onClick={() => bulkRun.mutate({ action: 'sale', percent: Number(bulk.percent) })}>% off sale</Button>
            </div>
            <Button size="sm" variant="tonal" onClick={() => bulkRun.mutate({ action: 'endSale' })}>End sale</Button>
            <div className="flex items-center gap-1">
              <ListingSelect value={bulk.listing} onChange={(v) => setBulk({ ...bulk, listing: v })} tree={tree} className="h-9 w-52" placeholder="Move to…" />
              <Button size="sm" variant="tonal" disabled={!bulk.listing} onClick={() => bulkRun.mutate({ action: 'move', listing: bulk.listing })}>Move</Button>
            </div>
            <Button size="sm" variant="tonal" icon="visibility" onClick={() => bulkRun.mutate({ action: 'show' })}>Show</Button>
            <Button size="sm" variant="tonal" icon="visibility_off" onClick={() => bulkRun.mutate({ action: 'hide' })}>Hide</Button>
            <Button size="sm" variant="tonal" icon="star" onClick={() => bulkRun.mutate({ action: 'feature' })}>Feature</Button>
            {/* Decides which section lists the products: /men, /women or /unisex. */}
            <label className="flex items-center gap-1">
              <span className="sr-only">Set audience</span>
              <select
                className="input h-9 w-auto pr-8"
                value=""
                onChange={(e) => e.target.value && bulkRun.mutate({ action: 'gender', gender: e.target.value })}
              >
                <option value="">Set audience…</option>
                {Object.entries(AUDIENCE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <button type="button" className="text-label-md text-on-surface-variant hover:underline ml-auto px-2" onClick={() => setSelected([])}>Clear selection</button>
          </>
        )}
      </div>

      {isLoading ? (
        [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
      ) : rows.length === 0 ? (
        <EmptyState icon="search_off" title="No products match" description="Try another search or filter." />
      ) : (
        rows.map((p) => (
          <ProductRow
            key={p._id}
            product={p}
            draft={draftOf(p)}
            tree={tree}
            onChange={(d) => setDrafts((all) => ({ ...all, [p._id]: d }))}
            selected={selected.includes(p._id)}
            onSelect={() => setSelected((s) => (s.includes(p._id) ? s.filter((x) => x !== p._id) : [...s, p._id]))}
            onSave={async () => (await save(p)) && toast.success(`${p.name} updated — live for all shoppers`)}
            saving={Boolean(saving[p._id])}
            onPhotos={() => setPhotosFor(p)}
          />
        ))
      )}

      {/* Sticky "save all" bar */}
      {dirtyIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-lift animate-pop-in">
          <Icon name="edit_note" />
          <span className="text-label-lg">{dirtyIds.length} unsaved change{dirtyIds.length === 1 ? '' : 's'}</span>
          <button type="button" className="text-label-md opacity-80 hover:opacity-100 px-2" onClick={() => setDrafts({})}>Undo</button>
          <Button size="sm" variant="secondary" icon="save" onClick={saveAll}>Save all</Button>
        </div>
      )}

      <Modal open={Boolean(photosFor)} onClose={() => setPhotosFor(null)} title={photosFor ? `Photos · ${photosFor.name}` : ''} size="lg">
        {photosFor && (
          <div className="flex flex-col gap-space-md">
            <p className="text-body-sm text-on-surface-variant">The first photo is the main one shoppers see. Use the arrows to reorder. Changes are saved when you press Save on the product.</p>
            <ImageUploader
              value={draftOf(photosFor).images}
              onChange={(imgs) => setDrafts((all) => ({ ...all, [photosFor._id]: { ...draftOf(photosFor), images: imgs } }))}
              uploader={adminApi.uploadProductImages}
            />
            <div className="flex justify-end gap-2">
              <Button variant="tonal" onClick={() => setPhotosFor(null)}>Done</Button>
              <Button
                icon="save"
                disabled={!draftOf(photosFor).images.length}
                onClick={async () => {
                  if (await save(photosFor)) {
                    toast.success('Photos saved — live for all shoppers');
                    setPhotosFor(null);
                  }
                }}
              >
                Save photos now
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─────────────────────────── Promo codes ─────────────────────────── */

const blankCoupon = { code: '', type: 'percentage', value: '10', minOrder: '', maxDiscount: '', expiresAt: '', usageLimit: '', perUserLimit: '1', description: '', isActive: true };

function randomCode() {
  const words = ['SAVE', 'BAGS', 'TRAVEL', 'CARRY', 'STYLE', 'FEST'];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(10 + Math.random() * 89)}`;
}

function couponState(c) {
  const now = Date.now();
  if (!c.isActive) return ['Paused', 'neutral'];
  if (c.expiresAt && new Date(c.expiresAt) < now) return ['Expired', 'danger'];
  if (c.startsAt && new Date(c.startsAt) > now) return ['Scheduled', 'amber'];
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return ['Used up', 'danger'];
  return ['Live', 'teal'];
}

function describe(c) {
  // e.g. "15% off orders over ₹15,000 (max ₹5,000 off)"
  const off = c.type === 'percentage' ? `${c.value}% off` : `${formatINR(c.value)} off`;
  const min = Number(c.minOrder) > 0 ? ` orders over ${formatINR(Number(c.minOrder))}` : ' any order';
  const cap = c.type === 'percentage' && Number(c.maxDiscount) > 0 ? ` (max ${formatINR(Number(c.maxDiscount))} off)` : '';
  return `${off}${min}${cap}`;
}

function CouponForm({ initial, onDone }) {
  const qc = useQueryClient();
  const [f, setF] = useState(() => ({
    ...blankCoupon,
    ...(initial
      ? {
          ...initial,
          value: String(initial.value),
          minOrder: initial.minOrder ? String(initial.minOrder) : '',
          maxDiscount: initial.maxDiscount ? String(initial.maxDiscount) : '',
          usageLimit: initial.usageLimit != null ? String(initial.usageLimit) : '',
          perUserLimit: String(initial.perUserLimit ?? 1),
          expiresAt: initial.expiresAt ? initial.expiresAt.slice(0, 10) : '',
        }
      : { code: randomCode() }),
  }));
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const save = useMutation({
    mutationFn: () => {
      const body = {
        code: f.code,
        type: f.type,
        value: Number(f.value),
        minOrder: f.minOrder ? Number(f.minOrder) : 0,
        maxDiscount: f.type === 'percentage' && f.maxDiscount ? Number(f.maxDiscount) : null,
        expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : null,
        startsAt: initial?.startsAt || null,
        usageLimit: f.usageLimit ? Number(f.usageLimit) : null,
        perUserLimit: Number(f.perUserLimit),
        description: f.description || describe({ ...f, value: Number(f.value) }),
        isActive: f.isActive,
      };
      return initial?._id ? adminApi.updateCoupon(initial._id, body) : adminApi.createCoupon(body);
    },
    onSuccess: () => {
      toast.success(initial?._id ? 'Promo code updated' : `Promo code ${f.code.toUpperCase()} is live for all shoppers`);
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      onDone();
    },
    onError: (err) => {
      setErrors(Object.fromEntries((err.details || []).map((d) => [d.field, d.message])));
      toast.error(err.message);
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="flex flex-col gap-space-md" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <Field label="Code shoppers type" error={errors.code} required>
          <div className="flex gap-2">
            <Input value={f.code} onChange={(e) => set('code')(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} maxLength={30} className="font-mono tracking-wider uppercase" error={errors.code} />
            {!initial?._id && <Button type="button" size="sm" variant="tonal" className="h-11 shrink-0" icon="casino" onClick={() => setF({ ...f, code: randomCode() })}>New</Button>}
          </div>
        </Field>
        <Field label="Discount" error={errors.value} required>
          <div className="flex gap-2">
            <div className="flex p-1 rounded-lg bg-surface-container-low shrink-0">
              {[['percentage', '% off'], ['fixed', '₹ off']].map(([v, label]) => (
                <button key={v} type="button" onClick={() => setF({ ...f, type: v })} className={cn('px-3 rounded-md text-label-md', f.type === v ? 'bg-surface-container-lowest shadow-card' : 'text-on-surface-variant')}>{label}</button>
              ))}
            </div>
            <Input inputMode="numeric" value={f.value} onChange={(e) => set('value')(e.target.value.replace(/[^\d.]/g, ''))} error={errors.value} />
          </div>
        </Field>
        <Field label="Minimum order (₹)" hint="Leave empty for any order"><Input inputMode="numeric" value={f.minOrder} onChange={(e) => set('minOrder')(e.target.value.replace(/\D/g, ''))} placeholder="0" /></Field>
        {f.type === 'percentage' && <Field label="Max discount (₹)" hint="Optional cap"><Input inputMode="numeric" value={f.maxDiscount} onChange={(e) => set('maxDiscount')(e.target.value.replace(/\D/g, ''))} placeholder="No cap" /></Field>}
        <Field label="Last day" hint="Leave empty to never expire"><Input type="date" value={f.expiresAt} onChange={set('expiresAt')} min={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Total uses allowed" hint="Leave empty for unlimited"><Input inputMode="numeric" value={f.usageLimit} onChange={(e) => set('usageLimit')(e.target.value.replace(/\D/g, ''))} placeholder="Unlimited" /></Field>
        <Field label="Uses per customer">
          <Select value={f.perUserLimit} onChange={set('perUserLimit')}>
            <option value="1">Once per customer</option>
            <option value="3">Up to 3 times</option>
            <option value="0">Unlimited</option>
          </Select>
        </Field>
        <Field label="Description shown at checkout" className="sm:col-span-2"><Input value={f.description} onChange={set('description')} maxLength={200} placeholder={describe({ ...f, value: Number(f.value) || 0 })} /></Field>
      </div>
      <p className="p-space-sm rounded-lg bg-secondary-container/40 text-body-sm flex items-start gap-2">
        <Icon name="campaign" className="text-secondary" />
        <span><b className="font-mono">{f.code || 'CODE'}</b> gives {describe({ ...f, value: Number(f.value) || 0 })}{f.expiresAt ? ` until ${formatDate(f.expiresAt)}` : ''}. Every shopper can use it at checkout, and live codes are shown there as one-tap chips.</span>
      </p>
      <div className="flex items-center justify-between gap-2">
        <Toggle checked={f.isActive} onChange={set('isActive')} label="Live" />
        <div className="flex gap-2">
          <Button type="button" variant="tonal" onClick={onDone}>Cancel</Button>
          <Button type="submit" icon="check" loading={save.isPending}>{initial?._id ? 'Save code' : 'Create code'}</Button>
        </div>
      </div>
    </form>
  );
}

function PromoTab() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'coupons', 'quick'], queryFn: () => adminApi.coupons({ limit: 100 }), select: (d) => d.items });
  const toggle = useMutation({
    mutationFn: (c) =>
      adminApi.updateCoupon(c._id, {
        code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, maxDiscount: c.maxDiscount, startsAt: c.startsAt, expiresAt: c.expiresAt,
        usageLimit: c.usageLimit, perUserLimit: c.perUserLimit, description: c.description, isActive: !c.isActive,
      }),
    onSuccess: (_, c) => {
      toast.success(c.isActive ? `${c.code} paused` : `${c.code} is live`);
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    },
    onError: (err) => toast.error(err.message),
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteCoupon,
    onSuccess: () => { toast.success('Promo code deleted'); qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }); },
    onError: (err) => toast.error(err.message),
  });

  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
        <button type="button" onClick={() => setEditing({})} className="card p-space-lg min-h-[180px] border-2 border-dashed border-surface-container-high hover:border-secondary flex flex-col items-center justify-center gap-2 text-on-surface-variant hover:text-secondary transition-colors">
          <Icon name="add_circle" className="text-[36px]" />
          <span className="text-label-lg">New promo code</span>
          <span className="text-body-sm">Takes about 10 seconds</span>
        </button>
        {isLoading
          ? [1, 2].map((i) => <Skeleton key={i} className="h-[180px] rounded-xl" />)
          : data.map((c) => {
              const [label, tone] = couponState(c);
              return (
                <article key={c._id} className={cn('card p-space-lg flex flex-col gap-2 relative overflow-hidden', label !== 'Live' && 'opacity-80')}>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      title="Copy code"
                      onClick={async () => { await navigator.clipboard.writeText(c.code); toast.success(`${c.code} copied`); }}
                      className="font-mono text-headline-sm tracking-wider px-2.5 py-1 rounded-lg border-2 border-dashed border-outline-variant hover:border-secondary flex items-center gap-2"
                    >
                      {c.code} <Icon name="content_copy" className="text-[16px] text-outline" />
                    </button>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <p className="text-body-md">{describe(c)}</p>
                  <p className="text-label-sm font-normal text-outline">
                    Used {c.usedCount}{c.usageLimit != null ? ` of ${c.usageLimit}` : ''} times · {c.perUserLimit === 0 ? 'unlimited per customer' : c.perUserLimit === 1 ? 'once per customer' : `${c.perUserLimit}× per customer`}
                    {c.expiresAt ? ` · ends ${formatDate(c.expiresAt)}` : ' · no end date'}
                  </p>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <Toggle checked={c.isActive} onChange={() => toggle.mutate(c)} label={c.isActive ? 'Live' : 'Paused'} />
                    <div className="ml-auto flex gap-1">
                      <button type="button" className="btn-icon" aria-label={`Edit ${c.code}`} onClick={() => setEditing(c)}><Icon name="edit" /></button>
                      <button type="button" className="btn-icon text-error" aria-label={`Delete ${c.code}`} onClick={async () => (await confirm({ title: `Delete ${c.code}?`, message: 'Shoppers will no longer be able to use it.', confirmLabel: 'Delete' })) && remove.mutate(c._id)}><Icon name="delete" /></button>
                    </div>
                  </div>
                </article>
              );
            })}
      </div>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? `Edit ${editing.code}` : 'New promo code'} size="lg">
        {editing && <CouponForm initial={editing._id ? editing : null} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function QuickEdit() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'promo' ? 'promo' : 'products';
  const { data: tree } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories, select: (d) => d.categories });
  return (
    <>
      <PageHeader
        title="Quick edit"
        subtitle="Change photos, prices, sales, categories and promo codes in one place. Saved changes go live for every shopper straight away."
        actions={<Link to="/admin/products/new" className="btn-tonal btn-sm"><Icon name="add" className="text-[18px]" /> New product</Link>}
      />
      <div className="flex gap-1 p-1 rounded-xl bg-surface-container-low w-fit mb-space-md" role="tablist">
        {[['products', 'inventory_2', 'Products, prices & photos'], ['promo', 'confirmation_number', 'Promo codes']].map(([k, icon, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParams(k === 'promo' ? { tab: 'promo' } : {}, { replace: true })} className={cn('flex items-center gap-2 px-4 h-10 rounded-lg text-label-md transition-colors', tab === k ? 'bg-surface-container-lowest shadow-card text-on-surface' : 'text-on-surface-variant hover:text-on-surface')}>
            <Icon name={icon} className="text-[20px]" /> {label}
          </button>
        ))}
      </div>
      {tab === 'products' ? <ProductsTab tree={tree} /> : <PromoTab />}
    </>
  );
}
