import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatINR } from '../lib/format';
import { setAdminEdit } from '../store';
import { Button, Drawer, ErrorState, Icon, Input, Select, Skeleton, Stars, Toggle } from '../components/ui';
import { ImageUploader } from './kit';

/** Editable copy of a product, as strings so inputs can be half-typed. */
const toDraft = (p) => ({
  name: p.name || '',
  tagline: p.tagline || '',
  badge: p.badge || '',
  price: String(p.price ?? ''),
  salePrice: p.salePrice != null ? String(p.salePrice) : '',
  listing: String(p.subcategory?._id || p.subcategory || p.category?._id || p.category || ''),
  images: p.images || [],
  isVisible: p.isVisible !== false,
  isFeatured: Boolean(p.isFeatured),
  isBestseller: Boolean(p.isBestseller),
  isNewArrival: Boolean(p.isNewArrival),
  stock: Object.fromEntries((p.variants || []).map((v) => [v._id, String(v.stock)])),
});
const QUICK_KEYS = ['name', 'tagline', 'badge', 'price', 'salePrice', 'listing', 'images', 'isVisible', 'isFeatured', 'isBestseller', 'isNewArrival'];
const differs = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

function Step({ n, title, hint, children }) {
  return (
    <section className="flex flex-col gap-2.5 py-4 border-b border-surface-container-high last:border-0">
      <div className="flex items-start gap-2.5">
        <span className="w-5 h-5 mt-px shrink-0 rounded-full bg-secondary text-on-secondary text-[11px] font-bold flex items-center justify-center">{n}</span>
        <div>
          <h3 className="text-[14px] font-semibold leading-5">{title}</h3>
          {hint && <p className="text-[12px] text-on-surface-variant">{hint}</p>}
        </div>
      </div>
      <div className="pl-7">{children}</div>
    </section>
  );
}

function Editor({ id, onClose }) {
  const qc = useQueryClient();
  const product = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => adminApi.product(id), select: (d) => d.product });
  const { data: tree } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminApi.categories, select: (d) => d.categories });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product.data) setDraft(toDraft(product.data));
  }, [product.data]);

  if (product.isError) return <ErrorState error={product.error} onRetry={product.refetch} />;
  if (!draft || !product.data) {
    return (
      <div className="p-5 flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const p = product.data;
  const saved = toDraft(p);
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v?.target ? v.target.value : v }));
  const money = (k) => (e) => set(k)(e.target.value.replace(/[^\d.]/g, ''));
  const price = Number(draft.price) || 0;
  const sale = draft.salePrice === '' ? null : Number(draft.salePrice);
  const badSale = sale != null && sale >= price;
  const quickChanged = QUICK_KEYS.filter((k) => differs(draft[k], saved[k]));
  const stockChanged = p.variants.filter((v) => draft.stock[v._id] !== saved.stock[v._id]);
  const dirty = quickChanged.length > 0 || stockChanged.length > 0;

  const save = async () => {
    if (badSale) return toast.error('Sale price must be lower than the regular price');
    if (!draft.images.length) return toast.error('Keep at least one photo');
    setSaving(true);
    try {
      if (quickChanged.length) {
        const body = {};
        quickChanged.forEach((k) => {
          if (k === 'price') body.price = price;
          else if (k === 'salePrice') body.salePrice = sale;
          else if (k === 'images') body.images = draft.images.map(({ url, publicId, alt }) => ({ url, ...(publicId ? { publicId } : {}), ...(alt ? { alt } : {}) }));
          else body[k] = draft[k];
        });
        await adminApi.quickUpdateProduct(id, body);
      }
      if (stockChanged.length) {
        await adminApi.updateStock(id, stockChanged.map((v) => ({ _id: v._id, stock: Math.max(0, parseInt(draft.stock[v._id], 10) || 0) })));
      }
      ['admin', 'products', 'product', 'collections', 'facets'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${draft.name} updated — shoppers see it now`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5">
        <div className="flex items-center gap-2 mt-4 p-2.5 rounded-xl bg-secondary/10 text-[12px] text-on-surface">
          <Icon name="info" className="text-[18px] text-secondary shrink-0" />
          <span>Change anything below, then press <b>Save</b>. It goes live for every shopper instantly.</span>
        </div>

        <Step n={1} title="Photos" hint="The first photo is the one shown in the product grid. Drag in new photos or use the arrows to reorder.">
          <ImageUploader value={draft.images} onChange={set('images')} uploader={adminApi.uploadProductImages} />
        </Step>

        <Step n={2} title="Name & labels" hint="Name is shown on the card. Badge is the small tag on the photo (e.g. Bestseller).">
          <div className="flex flex-col gap-2">
            <Input value={draft.name} onChange={set('name')} placeholder="Product name" aria-label="Product name" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={draft.tagline} onChange={set('tagline')} placeholder="Tagline, e.g. 24L Pack" aria-label="Tagline" />
              <Input value={draft.badge} onChange={set('badge')} placeholder="Badge, e.g. New" aria-label="Badge" />
            </div>
          </div>
        </Step>

        <Step n={3} title="Price (rate)" hint="Regular price, plus an optional sale price. Leave the sale price empty for no discount.">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[12px] text-on-surface-variant">
              Regular price ₹
              <Input inputMode="numeric" value={draft.price} onChange={money('price')} className="tabular-nums" />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-on-surface-variant">
              Sale price ₹
              <Input inputMode="numeric" value={draft.salePrice} onChange={money('salePrice')} placeholder="No sale" error={badSale} className="tabular-nums" />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[10, 20, 30, 50].map((n) => (
              <button key={n} type="button" onClick={() => set('salePrice')(String(Math.round(price * (1 - n / 100))))} className="h-7 px-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-[12px] font-semibold">
                {n}% off
              </button>
            ))}
            {draft.salePrice !== '' && (
              <button type="button" onClick={() => set('salePrice')('')} className="h-7 px-2.5 rounded-full text-[12px] font-semibold text-error hover:bg-error-container">
                Remove sale
              </button>
            )}
          </div>
          <p className={cn('mt-2 text-[12px]', badSale ? 'text-error' : 'text-on-surface-variant')}>
            {badSale ? 'Sale price must be lower than the regular price.' : sale != null && price ? `Shoppers pay ${formatINR(sale)} (${Math.round((1 - sale / price) * 100)}% off ${formatINR(price)})` : `Shoppers pay ${formatINR(price)}`}
          </p>
        </Step>

        <Step n={4} title="Stock" hint="How many of each colour you have. 0 shows “Out of stock”. Orders reduce this automatically.">
          <div className="flex flex-col gap-1.5">
            {p.variants.map((v) => {
              const n = parseInt(draft.stock[v._id], 10) || 0;
              const bump = (d) => setDraft((x) => ({ ...x, stock: { ...x.stock, [v._id]: String(Math.max(0, n + d)) } }));
              return (
                <div key={v._id} className="flex items-center gap-2 p-1.5 pl-2.5 rounded-lg bg-surface-container-low">
                  <span className="w-4 h-4 rounded-full ring-1 ring-black/10 shrink-0" style={{ background: v.colorHex }} />
                  <span className="flex-1 min-w-0 text-[13px] truncate">{v.name}</span>
                  <button type="button" onClick={() => bump(-1)} className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center" aria-label={`One less ${v.name}`}><Icon name="remove" className="text-[18px]" /></button>
                  <input
                    inputMode="numeric"
                    value={draft.stock[v._id]}
                    onChange={(e) => setDraft((x) => ({ ...x, stock: { ...x.stock, [v._id]: e.target.value.replace(/\D/g, '') } }))}
                    className={cn('input h-8 w-16 text-center tabular-nums px-1', n === 0 && 'text-error')}
                    aria-label={`Stock for ${v.name}`}
                  />
                  <button type="button" onClick={() => bump(1)} className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center" aria-label={`One more ${v.name}`}><Icon name="add" className="text-[18px]" /></button>
                </div>
              );
            })}
          </div>
          <Link to={`/admin/products/${id}`} onClick={onClose} className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-secondary">
            Add or remove a colour in the full editor <Icon name="arrow_forward" className="text-[14px]" />
          </Link>
        </Step>

        <Step n={5} title="Where it shows" hint="Hide removes it from the store without deleting it. Labels put it in those lists.">
          <div className="flex flex-col gap-2.5">
            <Toggle checked={draft.isVisible} onChange={set('isVisible')} label={draft.isVisible ? 'Visible in the store' : 'Hidden from shoppers'} />
            <Toggle checked={draft.isFeatured} onChange={set('isFeatured')} label="Featured (shown first under Relevance)" />
            <Toggle checked={draft.isBestseller} onChange={set('isBestseller')} label="Bestseller label" />
            <Toggle checked={draft.isNewArrival} onChange={set('isNewArrival')} label="New arrival label" />
          </div>
        </Step>

        <Step n={6} title="Category" hint="Which category page this product is listed under.">
          <Select value={draft.listing} onChange={set('listing')} aria-label="Category">
            {tree?.map((cat) => (
              <optgroup key={cat._id} label={cat.name}>
                <option value={cat._id}>{cat.name} (main)</option>
                {cat.children?.map((s) => <option key={s._id} value={s._id}>{cat.name} › {s.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </Step>

        <Step n={7} title="Ratings & reviews" hint="Ratings come from real customer reviews. You can approve, hide or delete reviews; hidden ones don't count.">
          <div className="flex items-center gap-2 text-[13px]">
            <Stars value={p.ratingAverage || 0} size={16} />
            {p.ratingCount ? `${p.ratingAverage.toFixed(1)} from ${p.ratingCount} review${p.ratingCount === 1 ? '' : 's'}` : 'No reviews yet'}
          </div>
          <Link to="/admin/reviews" onClick={onClose} className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-secondary">
            Manage reviews <Icon name="arrow_forward" className="text-[14px]" />
          </Link>
        </Step>
      </div>

      <div className="shrink-0 border-t border-surface-container-high px-5 py-3 pb-safe flex items-center gap-2 bg-surface-container-lowest">
        <Link to={`/admin/products/${id}`} onClick={onClose} className="btn-tonal btn-sm">
          <Icon name="open_in_full" className="text-[16px]" /> Full editor
        </Link>
        <span className="flex-1 text-right text-[12px] text-outline">{dirty ? `${quickChanged.length + stockChanged.length} change${quickChanged.length + stockChanged.length === 1 ? '' : 's'}` : 'No changes'}</span>
        <Button icon="save" disabled={!dirty || badSale} loading={saving} onClick={save}>Save</Button>
      </div>
    </div>
  );
}

/** Right-hand drawer an admin opens from any product card in the store. */
export default function StoreEditPanel() {
  const id = useSelector((s) => s.ui.adminEdit);
  const dispatch = useDispatch();
  const close = () => dispatch(setAdminEdit(null));
  return (
    <Drawer open={Boolean(id)} onClose={close} side="right" width="max-w-md" title={<span className="flex items-center gap-2"><Icon name="edit" className="text-secondary" /> Edit product</span>}>
      {id && <Editor key={id} id={id} onClose={close} />}
    </Drawer>
  );
}
