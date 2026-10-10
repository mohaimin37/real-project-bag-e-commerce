import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, discountPercent, productImage } from '../lib/format';
import { useCategories, useMoney } from '../hooks/useStore';
import { Button, Field, Icon, Img, Input, Modal, Select, Spinner, Textarea, Toggle, useConfirm } from '../components/ui';
import { ProductCard, Swatches } from '../components/product';
import { ChipInput, ImageUploader, KeyValueEditor } from './kit';
import AskAI, { parseReply } from './AskAI';

/*
 * Guided "Add product": 4 short steps with suggestions from similar products, a live preview of the
 * shop card the whole time, and a final full preview. Nothing reaches the store until "Publish".
 * The work-in-progress is kept in this browser (localStorage) so leaving the page loses nothing.
 */

const DRAFT_KEY = 'wt-admin-product-draft';
const STEPS = [
  ['photo_camera', 'Photos & name'],
  ['sell', 'Price & category'],
  ['description', 'Description'],
  ['palette', 'Colours & stock'],
  ['visibility', 'Preview & publish'],
];
const BADGES = ['New', 'Bestseller', 'Limited Edition', 'Cabin Approved', 'Gift Pick'];
const PURPOSES = ['work', 'travel', 'transit', 'business', 'creative'];
const COLOUR_PRESETS = [
  ['Onyx Black', '#17171a', 'onyx'], ['Midnight Navy', '#1b263b', 'navy'], ['Cognac', '#96582c', 'brown'], ['Tan', '#b8875a', 'tan'],
  ['Olive', '#5b5f3a', 'olive'], ['Slate Grey', '#6b6e74', 'grey'], ['Ivory', '#f4f1ea', 'white'], ['Burgundy', '#5e1a24', 'red'],
];

const blank = () => ({
  name: '', images: [], category: '', subcategory: '', gender: 'unisex', price: '', salePrice: '', sku: '',
  tagline: '', badge: 'New', shortDescription: '', description: '', capacity: '',
  materials: [], features: [], purposes: [], tags: [], specifications: [], faqs: [],
  variants: [], isNewArrival: true, isFeatured: false, isBestseller: false,
  lowStockThreshold: 10,
});

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return saved?.p ? saved : null;
  } catch {
    return null;
  }
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Small clickable "use this" pill. */
function Pick({ children, onClick, active, icon = 'auto_awesome' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 min-h-7 px-2.5 py-1 rounded-full text-[12px] text-left transition-colors',
        active ? 'bg-secondary text-on-secondary' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
      )}
    >
      {icon && <Icon name={active ? 'check' : icon} className="text-[14px] shrink-0" />}
      {children}
    </button>
  );
}

function Hint({ children }) {
  return <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-on-surface-variant">{children}</div>;
}

function Card({ title, sub, children }) {
  return (
    <section className="card surface-card border border-outline-variant/60 p-space-md flex flex-col gap-space-md">
      {title && (
        <div>
          <h2 className="text-headline-sm">{title}</h2>
          {sub && <p className="text-body-sm text-on-surface-variant mt-0.5">{sub}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

const toNum = (v) => (v === '' || v == null ? 0 : Number(v));

function generateSmartSku(prod) {
  const code = (prod?.name || 'PRD').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'BAG';
  const num = Math.floor(100 + Math.random() * 900);
  return `WT-${code}-${num}`;
}

export default function ProductWizard() {
  const qc = useQueryClient();
  const money = useMoney();
  const confirm = useConfirm();
  const { data: cats } = useCategories();
  const draft = useMemo(loadDraft, []);
  const [p, setP] = useState(() => ({ ...blank(), ...draft?.p }));
  const [step, setStep] = useState(draft?.step || 0);
  const [filled, setFilled] = useState(!!draft?.filled);
  const [errors, setErrors] = useState({});
  const [published, setPublished] = useState(null);
  const [big, setBig] = useState(false); // full-size live preview
  const set = (patch) => {
    setP((cur) => ({ ...cur, ...patch }));
    // Editing a field clears its error message.
    setErrors((e) => {
      const keys = Object.keys(patch).flatMap((k) => (k === 'variants' ? ['variants', ...Object.keys(e).filter((x) => /^v\d/.test(x))] : [k]));
      return keys.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e;
    });
  };

  useEffect(() => {
    try {
      if (published) localStorage.removeItem(DRAFT_KEY);
      else if (p.name || p.images.length) localStorage.setItem(DRAFT_KEY, JSON.stringify({ p, step, filled }));
    } catch {
      /* storage blocked: the wizard still works, it just won't survive a reload */
    }
  }, [p, step, filled, published]);

  const name = useDebounced(p.name.trim(), 500);
  const sugg = useQuery({
    queryKey: ['admin', 'product-suggest', name],
    queryFn: () => adminApi.suggestProduct(name),
    enabled: name.length >= 3,
    staleTime: 5 * 60 * 1000,
    select: (d) => d.suggestion,
  });
  const s = name.length >= 3 ? sugg.data : null;

  const subOptions = useMemo(() => cats?.find((c) => c._id === p.category)?.children || [], [cats, p.category]);
  const catName = cats?.find((c) => c._id === p.category)?.name;
  const subName = subOptions.find((c) => c._id === p.subcategory)?.name;

  // ChatGPT / Gemini research: what the prompt knows, and how a pasted answer lands in the form.
  const aiContext = { name: p.name, category: catName, subcategory: subName, price: toNum(p.price) || null, priceRange: s?.price };
  const applyAI = ({ colours, price, ...fields }) => {
    const patch = { ...fields };
    // Keep a price the admin already typed; the AI's is only a fallback.
    if (price && !toNum(p.price)) patch.price = price;
    if (colours) patch.variants = colours.map((c) => ({ ...c, stock: p.variants.find((v) => v.name === c.name)?.stock ?? 10 }));
    set(patch);
    // Whatever the AI didn't cover (category, SKU, capacity…) still comes from the catalogue suggestions.
    setP(withSuggestions);
    setFilled(true);
  };

  // Free in-app AI (Gemini on the server): looks at the photos + name and fills the whole product.
  const aiOn = useQuery({ queryKey: ['admin', 'ai-status'], queryFn: adminApi.aiStatus, select: (d) => d.enabled, staleTime: 10 * 60 * 1000 });
  const [aiHelp, setAiHelp] = useState(false);
  const aiWrite = useMutation({
    mutationFn: (images) =>
      adminApi.aiWriteProduct({ name: p.name.trim(), images: (images || p.images).map((i) => i.url), price: toNum(p.price) || null, priceRange: s?.price }),
    onSuccess: (res) => {
      const l = res.listing || {};
      const fields = parseReply(JSON.stringify(l)) || {};
      if (!p.name.trim() && typeof l.name === 'string' && l.name.trim()) fields.name = l.name.trim().slice(0, 140);
      if (res.category) Object.assign(fields, { category: res.category._id, subcategory: res.subcategory?._id || '' });
      if (typeof l.capacity === 'string' && l.capacity.trim()) fields.capacity = l.capacity.trim().slice(0, 20);
      if (['unisex', 'women', 'men'].includes(l.gender)) fields.gender = l.gender;
      applyAI(fields);
      toast.success(`AI filled everything${res.usedPhotos ? ' from your photo' : ''}. Check the steps and change anything you like.`, { duration: 5000 });
    },
    onError: (err) => toast.error(err.message),
  });
  // Auto-suggest: once a name gives catalogue suggestions, a missing product code is filled in.
  useEffect(() => {
    if (s?.sku && !p.sku) setP((cur) => (cur.sku ? cur : { ...cur, sku: s.sku }));
  }, [s?.sku, p.sku]);
  // A rewrite replaces the text, so ask first if the admin may have edited it.
  const runAI = async () => {
    if (filled && !(await confirm({ title: 'Rewrite with AI?', message: 'The AI will replace the descriptions, details and colours with a fresh version. Your photos, name and price stay.', confirmLabel: 'Rewrite' }))) return;
    aiWrite.mutate();
  };
  // First photo in and nothing written yet: let the AI do the work straight away. Run from an effect, not
  // the upload callback: that callback was created before the upload (maybe before the AI status loaded).
  const autoAI = useRef(false);
  const onPhotos = (images) => {
    if (!p.images.length && images.length > 0) autoAI.current = true;
    set({ images });
  };
  useEffect(() => {
    if (!autoAI.current || !p.images.length || aiOn.data === undefined) return;
    autoAI.current = false;
    if (aiOn.data && !filled && !aiWrite.isPending) aiWrite.mutate(p.images);
  }, [p.images, aiOn.data, filled, aiWrite]);

  /** Fills every empty field from the suggestions (never overwrites what the admin typed). */
  const withSuggestions = (cur) =>
    !s
      ? cur
      : {
      ...cur,
      category: cur.category || s.category?._id || '',
      subcategory: cur.category ? cur.subcategory : s.subcategory?._id || '',
      price: cur.price || s.price?.suggested || '',
      sku: cur.sku || s.sku,
      capacity: cur.capacity || s.capacity,
      tagline: cur.tagline || s.taglines[0] || '',
      shortDescription: cur.shortDescription || s.shortDescriptions[0] || '',
      description: cur.description || s.descriptions[0] || '',
      materials: cur.materials.length ? cur.materials : s.materials,
      features: cur.features.length ? cur.features : s.features,
      purposes: cur.purposes.length ? cur.purposes : s.purposes,
      tags: cur.tags.length ? cur.tags : s.tags,
      specifications: cur.specifications.length ? cur.specifications : s.specifications,
      variants: cur.variants.length ? cur.variants : s.colours.map((c) => ({ ...c, stock: 10 })),
    };
  const fillAll = () => {
    if (!s) return;
    setP(withSuggestions);
    setFilled(true);
    toast.success('Filled in from similar products. Change anything you like.');
  };

  const variants = p.variants.length ? p.variants : [{ name: 'Default', colorHex: '#17171a', colorFamily: 'onyx', stock: 10 }];
  const preview = {
    _id: 'preview',
    slug: 'preview',
    name: p.name || 'Your product name',
    tagline: p.tagline,
    badge: p.badge,
    images: p.images,
    price: toNum(p.price),
    salePrice: toNum(p.salePrice) || null,
    finalPrice: toNum(p.salePrice) && toNum(p.salePrice) < toNum(p.price) ? toNum(p.salePrice) : toNum(p.price),
    variants: variants.map((v, i) => ({ ...v, _id: `v${i}`, stock: toNum(v.stock) })),
    ratingCount: 0,
    isNewArrival: p.isNewArrival,
    isBestseller: p.isBestseller,
  };

  // ── Validation per step ──
  const check = (upTo, d = p) => {
    const e = {};
    if (upTo >= 0) {
      if (d.name.trim().length < 2) e.name = 'Give the product a name';
      if (!d.images.length) e.images = 'Add at least one photo (the first one is the cover)';
    }
    if (upTo >= 1) {
      if (!d.category) e.category = 'Choose where it goes in the store';
      if (!(toNum(d.price) > 0)) e.price = 'Enter the price';
      if (d.salePrice !== '' && toNum(d.salePrice) >= toNum(d.price)) e.salePrice = 'Sale price must be lower than the price';
      if ((d.sku || '').trim().length < 2) e.sku = 'Enter a product code';
    }
    if (upTo >= 3) {
      if (!d.variants.length) e.variants = 'Add at least one colour';
      d.variants.forEach((v, i) => {
        if (!v.name.trim()) e[`v${i}`] = 'Name this colour';
      });
    }
    setErrors(e);
    return e;
  };
  const firstBadStep = (e) => (e.name || e.images ? 0 : e.category || e.price || e.salePrice || e.sku ? 1 : e.variants || Object.keys(e).some((k) => /^v\d/.test(k)) ? 3 : -1);

  const go = (to) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (to < step) {
      setErrors({});
      setStep(to);
      return;
    }
    // Leaving step 1 for the first time: pre-fill the rest so the admin only has to review.
    const autoFill = step === 0 && !filled && !!s;
    const next = autoFill ? withSuggestions(p) : p;
    const bad = firstBadStep(check(Math.min(to - 1, 3), next));
    if (bad !== -1 && bad < to) {
      // Something earlier is missing: stop there with the fields highlighted.
      if (bad !== step) setStep(bad);
      toast.error('Please fill the highlighted fields');
      return;
    }
    if (autoFill) {
      setP(next);
      setFilled(true);
      toast.success('We filled the next steps from similar products. Just check them.');
    }
    setErrors({});
    setStep(to);
  };

  /** Final check before publishing; jumps to the first step that still needs something. */
  const ready = () => {
    const bad = firstBadStep(check(3));
    if (bad === -1) return true;
    toast.error('Something is missing, taking you there');
    setStep(bad);
    return false;
  };

  const publish = useMutation({
    mutationFn: (visible) => {
      const sku = p.sku.trim().toUpperCase();
      return adminApi.createProduct({
        name: p.name.trim(),
        sku,
        tagline: p.tagline,
        badge: p.badge,
        shortDescription: p.shortDescription,
        description: p.description,
        category: p.category,
        subcategory: p.subcategory || null,
        gender: p.gender,
        price: toNum(p.price),
        salePrice: p.salePrice === '' ? null : toNum(p.salePrice),
        capacity: p.capacity,
        images: p.images.map(({ url, publicId }) => ({ url, publicId, alt: p.name.trim() })),
        variants: p.variants.map((v, i) => ({ name: v.name.trim(), colorHex: v.colorHex, colorFamily: v.colorFamily || '', size: '', sku: `${sku}-${String(i + 1).padStart(2, '0')}`, stock: toNum(v.stock), images: [] })),
        materials: p.materials,
        features: p.features,
        purposes: p.purposes,
        tags: p.tags,
        specifications: p.specifications.filter((x) => x.label && x.value),
        faqs: (p.faqs || []).filter((x) => x.question && x.answer),
        isVisible: visible,
        isNewArrival: p.isNewArrival,
        isFeatured: p.isFeatured,
        isBestseller: p.isBestseller,
      });
    },
    onSuccess: (res, visible) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setPublished({ ...res.product, visible });
      toast.success(visible ? 'Published! It is live in the store.' : 'Saved as hidden. Shoppers can’t see it yet.');
    },
    onError: (err) => {
      const field = err.errors?.[0]?.field;
      if (field === 'sku' || /sku/i.test(err.message)) {
        setErrors({ sku: 'This code is already used. Try another one.' });
        setStep(1);
      }
      toast.error(err.message);
    },
  });

  const startOver = async () => {
    if (!(await confirm({ title: 'Start over?', message: 'This clears everything you entered for this product.', confirmLabel: 'Clear' }))) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setP(blank());
    setStep(0);
    setFilled(false);
    setErrors({});
    setPublished(null);
  };

  if (published) {
    return (
      <div className="max-w-xl mx-auto text-center py-space-xl flex flex-col items-center gap-space-md">
        <span className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Icon name="check" className="text-[36px]" /></span>
        <h1 className="text-headline-md">{published.visible ? 'Your product is live' : 'Saved (hidden from shoppers)'}</h1>
        <p className="text-body-md text-on-surface-variant">
          <b>{published.name}</b> {published.visible ? 'now shows in the store grid and search.' : 'is saved but hidden. Turn on “Visible in store” when you’re ready.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {published.visible && <a href={`/product/${published.slug}`} target="_blank" rel="noreferrer" className="btn-primary"><Icon name="open_in_new" className="text-[18px]" /> View in store</a>}
          <Link to={`/admin/products/${published._id}`} className="btn-tonal"><Icon name="edit" className="text-[18px]" /> Edit more details</Link>
          <Button variant="tonal" icon="add" onClick={() => { setP(blank()); setStep(0); setFilled(false); setPublished(null); }}>Add another</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header + steps */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-space-md">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/admin/products" className="btn-icon" aria-label="Back to products"><Icon name="arrow_back" /></Link>
          <div className="min-w-0">
            <h1 className="text-headline-md truncate">Add a product</h1>
            <p className="text-body-sm text-on-surface-variant">Nothing goes live until you press <b>Publish</b> on the last step. Your work is saved as you type.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(p.name || p.images.length > 0) && <Button variant="ghost" size="sm" icon="restart_alt" onClick={startOver}>Start over</Button>}
          <Link to="/admin/products/new/advanced" className="btn-ghost btn-sm"><Icon name="tune" className="text-[18px]" /> Full form</Link>
        </div>
      </div>

      <ol className="flex gap-1.5 mb-space-lg overflow-x-auto scrollbar-none" aria-label="Steps">
        {STEPS.map(([icon, label], i) => (
          <li key={label} className="flex-1 min-w-[120px]">
            <button
              type="button"
              onClick={() => (i < step ? go(i) : i > step && go(i))}
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-xl text-left text-[12px] font-semibold border transition-colors',
                i === step ? 'border-secondary bg-secondary/10 text-secondary' : i < step ? 'border-transparent bg-surface-container-low text-on-surface' : 'border-transparent text-outline hover:bg-surface-container-low'
              )}
            >
              <span className={cn('w-6 h-6 shrink-0 rounded-full flex items-center justify-center', i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-secondary text-on-secondary' : 'bg-surface-container text-outline')}>
                <Icon name={i < step ? 'check' : icon} className="text-[14px]" />
              </span>
              <span className="leading-tight">{i + 1}. {label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step < 4 ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-space-md items-start">
          <div className="flex flex-col gap-space-md min-w-0">
            {step === 0 && (
              <>
                <Card
                  title="Add photos"
                  sub={aiOn.data
                    ? 'Start here. Drop a photo and the AI fills in the rest for you. The first photo is the cover in the shop.'
                    : 'Drag photos in or click to choose. The first photo is the cover in the shop. Square photos on a plain background look best.'}
                >
                  <ImageUploader value={p.images} onChange={onPhotos} uploader={adminApi.uploadProductImages} />
                  {errors.images && <p className="text-label-md text-error" role="alert">{errors.images}</p>}
                  <AIWriterBox
                    enabled={aiOn.data}
                    loading={aiWrite.isPending}
                    canRun={p.images.length > 0 || p.name.trim().length >= 3}
                    hasPhoto={p.images.length > 0}
                    filled={filled}
                    onRun={runAI}
                    onHelp={() => setAiHelp(true)}
                  />
                </Card>
                <Card
                  title="Product name"
                  sub={aiOn.data
                    ? 'The AI writes this from your photo. Change it if you like, or type one yourself (e.g. “Urban Black Leather Backpack 22L”).'
                    : 'Type the name the way shoppers would say it. Include colour or size if you like (e.g. “Urban Black Leather Backpack 22L”).'}
                >
                  <Field label="Product name" error={errors.name} required>
                    <Input value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Weekender Leather Duffle" error={errors.name} maxLength={140} />
                  </Field>
                  <SuggestBanner s={s} loading={sugg.isFetching && name.length >= 3} typed={p.name.trim().length} filled={filled} onFill={() => fillAll()} />
                  {aiOn.data ? (
                    <details className="group">
                      <summary className="cursor-pointer list-none inline-flex items-center gap-1 text-[12px] text-outline hover:text-secondary">
                        <Icon name="expand_more" className="text-[16px] transition-transform group-open:rotate-180" /> Other ways: ask ChatGPT or Gemini in a new tab
                      </summary>
                      <div className="mt-2"><AskAI context={aiContext} onApply={applyAI} /></div>
                    </details>
                  ) : (
                    <AskAI context={aiContext} onApply={applyAI} />
                  )}
                </Card>
                <AISetupModal open={aiHelp} onClose={() => setAiHelp(false)} />
              </>
            )}

            {step === 1 && (
              <>
                <Card title="Where does it go in the store?">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <Field label="Category" error={errors.category} required>
                      <Select value={p.category} error={errors.category} onChange={(e) => set({ category: e.target.value, subcategory: '' })}>
                        <option value="">Choose…</option>
                        {cats?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="Type">
                      <Select value={p.subcategory} disabled={!subOptions.length} onChange={(e) => set({ subcategory: e.target.value })}>
                        <option value="">None</option>
                        {subOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {s?.subcategory && (s.subcategory._id !== p.subcategory || s.category?._id !== p.category) && (
                    <Hint>Suggested: <Pick onClick={() => set({ category: s.category._id, subcategory: s.subcategory._id })}>{s.category?.name} › {s.subcategory.name}</Pick></Hint>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <Field label="Made for">
                      <div className="flex gap-1.5">
                        {[['men', 'Men'], ['women', 'Women'], ['unisex', 'Universal']].map(([v, l]) => (
                          <Pick key={v} icon={null} active={p.gender === v} onClick={() => set({ gender: v })}>{l}</Pick>
                        ))}
                      </div>
                    </Field>
                    <Field label="Size / capacity" hint="Optional, e.g. 24L">
                      <Input value={p.capacity} onChange={(e) => set({ capacity: e.target.value })} placeholder="24L" maxLength={20} />
                    </Field>
                  </div>
                </Card>

                <Card title="Price (₹)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <Field label="Price" error={errors.price} required>
                      <Input type="number" min={0} inputMode="numeric" value={p.price} error={errors.price} onChange={(e) => set({ price: e.target.value })} placeholder="2999" />
                    </Field>
                    <Field label="Sale price" error={errors.salePrice} hint="Optional. Leave blank for no sale.">
                      <Input type="number" min={0} inputMode="numeric" value={p.salePrice} error={errors.salePrice} onChange={(e) => set({ salePrice: e.target.value })} />
                    </Field>
                  </div>
                  {s?.price && (
                    <Hint>
                      Similar products sell for <b>{money.inr(s.price.min)}–{money.inr(s.price.max)}</b>.
                      <Pick active={toNum(p.price) === s.price.suggested} onClick={() => set({ price: s.price.suggested })}>Use {money.inr(s.price.suggested)}</Pick>
                    </Hint>
                  )}
                  {toNum(p.price) > 0 && (
                    <Hint>
                      Quick sale:
                      {[10, 20, 30].map((pct) => {
                        const v = Math.round(toNum(p.price) * (1 - pct / 100));
                        return <Pick key={pct} icon="sell" active={toNum(p.salePrice) === v} onClick={() => set({ salePrice: v })}>{pct}% off</Pick>;
                      })}
                      {p.salePrice !== '' && <Pick icon="close" onClick={() => set({ salePrice: '' })}>No sale</Pick>}
                    </Hint>
                  )}
                </Card>

                <Card title="Product code (SKU)" sub="Your own stock code. We made one for you, so you can leave it.">
                  <Field error={errors.sku}>
                    <div className="flex items-center gap-2">
                      <Input className="uppercase flex-1" value={p.sku} error={errors.sku} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} placeholder="WT-BKP-22" maxLength={40} />
                      <Button type="button" variant="tonal" size="sm" icon="auto_awesome" onClick={() => set({ sku: generateSmartSku(p) })}>
                        Generate SKU
                      </Button>
                    </div>
                  </Field>
                  {s?.sku && s.sku !== p.sku && <Hint>Suggested: <Pick onClick={() => set({ sku: s.sku })}>{s.sku}</Pick></Hint>}
                </Card>
              </>
            )}

            {step === 2 && (
              <>
                {aiOn.data ? (
                  <AIWriterBox enabled loading={aiWrite.isPending} canRun hasPhoto={p.images.length > 0} filled={filled} onRun={runAI} />
                ) : (
                  <AskAI compact context={aiContext} onApply={applyAI} />
                )}
                <Card title="Short line on the card" sub="A few words under the name, e.g. “24L Laptop Backpack”.">
                  <Input value={p.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={80} />
                  {s?.taglines?.length > 0 && <Hint>Ideas: {s.taglines.map((t) => <Pick key={t} active={p.tagline === t} onClick={() => set({ tagline: t })}>{t}</Pick>)}</Hint>}
                  <Field label="Label on the photo">
                    <div className="flex flex-wrap gap-1.5">
                      <Pick icon={null} active={!p.badge} onClick={() => set({ badge: '' })}>None</Pick>
                      {BADGES.map((b) => <Pick key={b} icon={null} active={p.badge === b} onClick={() => set({ badge: b })}>{b}</Pick>)}
                    </div>
                  </Field>
                </Card>

                <Card title="Description">
                  <Field label="Summary (1–2 lines)">
                    <Textarea rows={2} maxLength={300} value={p.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} />
                  </Field>
                  {s?.shortDescriptions?.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {s.shortDescriptions.map((t, i) => <Pick key={i} active={p.shortDescription === t} onClick={() => set({ shortDescription: t })}>Option {i + 1}: {t}</Pick>)}
                    </div>
                  )}
                  <Field label="Full description">
                    <Textarea rows={6} maxLength={5000} value={p.description} onChange={(e) => set({ description: e.target.value })} />
                  </Field>
                  {s?.descriptions?.length > 0 && (
                    <Hint>
                      Ready-made text:
                      {s.descriptions.map((t, i) => <Pick key={i} active={p.description === t} onClick={() => set({ description: t })}>Version {i + 1}</Pick>)}
                    </Hint>
                  )}
                </Card>

                <Card title="Details shoppers filter by" sub="Tap a suggestion to add it.">
                  <ListField label="Materials" value={p.materials} onChange={(materials) => set({ materials })} ideas={s?.materials} />
                  <ListField label="Features" value={p.features} onChange={(features) => set({ features })} ideas={s?.features} />
                  <Field label="Good for">
                    <div className="flex flex-wrap gap-1.5">
                      {PURPOSES.map((x) => {
                        const on = p.purposes.includes(x);
                        return <Pick key={x} icon={on ? 'check' : 'add'} active={on} onClick={() => set({ purposes: on ? p.purposes.filter((y) => y !== x) : [...p.purposes, x] })}><span className="capitalize">{x}</span></Pick>;
                      })}
                    </div>
                  </Field>
                  <ListField label="Search words" value={p.tags} onChange={(tags) => set({ tags: tags.map((t) => t.toLowerCase()) })} ideas={s?.tags} />
                </Card>

                <Card title="Specifications" sub="Optional. Shown as a table on the product page. Rows left blank are skipped.">
                  <KeyValueEditor value={p.specifications} onChange={(specifications) => set({ specifications })} keyLabel="e.g. Weight" valueLabel="e.g. 1.1 kg" />
                </Card>

                <Card title="FAQs" sub="Optional. Questions shoppers often ask. The AI answer can fill these for you.">
                  <KeyValueEditor value={p.faqs || []} onChange={(faqs) => set({ faqs })} keyName="question" valueName="answer" keyLabel="Question" valueLabel="Answer" multiline />
                </Card>
              </>
            )}

            {step === 3 && (
              <Card title="Colours & stock" sub="Add each colour you sell and how many you have. Shoppers pick the colour on the product page.">
                {errors.variants && <p className="text-label-md text-error" role="alert">{errors.variants}</p>}
                <div className="flex flex-col gap-2">
                  {p.variants.map((v, i) => {
                    const upd = (patch) => set({ variants: p.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                    return (
                      <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-surface-container-low">
                        <label className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden cursor-pointer ring-1 ring-outline-variant" style={{ background: v.colorHex }} title="Pick colour">
                          <input type="color" value={v.colorHex} onChange={(e) => upd({ colorHex: e.target.value })} className="opacity-0 w-full h-full cursor-pointer" aria-label="Colour" />
                        </label>
                        <Input className="flex-1 min-w-[140px]" placeholder="Colour name" value={v.name} error={errors[`v${i}`]} onChange={(e) => upd({ name: e.target.value })} maxLength={60} />
                        <div className="flex items-center gap-1">
                          <button type="button" className="btn-icon" onClick={() => upd({ stock: Math.max(0, toNum(v.stock) - 1) })} aria-label="Less stock"><Icon name="remove" /></button>
                          <Input type="number" min={0} className="w-16 text-center" aria-label="Stock" value={v.stock} onChange={(e) => upd({ stock: e.target.value })} />
                          <button type="button" className="btn-icon" onClick={() => upd({ stock: toNum(v.stock) + 1 })} aria-label="More stock"><Icon name="add" /></button>
                          <div className="flex items-center gap-0.5 ml-1">
                            {[10, 20, 50].map((qty) => (
                              <button
                                key={qty}
                                type="button"
                                title={`Set stock to ${qty}`}
                                onClick={() => upd({ stock: qty })}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-container hover:bg-surface-container-high text-secondary cursor-pointer"
                              >
                                {qty}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button type="button" className="btn-icon hover:text-error" onClick={() => set({ variants: p.variants.filter((_, j) => j !== i) })} aria-label="Remove colour"><Icon name="delete" /></button>
                      </div>
                    );
                  })}
                </div>
                <Hint>
                  Add a colour:
                  {[...(s?.colours || []).map((c) => [c.name, c.colorHex, c.colorFamily]), ...COLOUR_PRESETS]
                    .filter(([n], i, all) => all.findIndex(([m]) => m === n) === i && !p.variants.some((v) => v.name === n))
                    .slice(0, 10)
                    .map(([n, hex, fam]) => (
                      <button key={n} type="button" onClick={() => set({ variants: [...p.variants, { name: n, colorHex: hex, colorFamily: fam, stock: 10 }] })} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-[12px]">
                        <span className="w-5 h-5 rounded-full ring-1 ring-black/10" style={{ background: hex }} /> {n}
                      </button>
                    ))}
                  <button type="button" onClick={() => set({ variants: [...p.variants, { name: '', colorHex: '#96582c', colorFamily: '', stock: 10 }] })} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-dashed border-outline text-[12px]">
                    <Icon name="add" className="text-[14px]" /> Custom
                  </button>
                </Hint>
                <div className="mt-2 pt-3 border-t border-surface-container-high flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-label-md font-semibold">Low-stock Alert Threshold:</span>
                    <p className="text-[12px] text-on-surface-variant">Notify admin and alert customers when inventory drops to this amount or lower.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 20].map((th) => (
                      <Pick key={th} icon={null} active={p.lowStockThreshold === th} onClick={() => set({ lowStockThreshold: th })}>
                        {th} units
                      </Pick>
                    ))}
                    <Input
                      type="number"
                      min={1}
                      value={p.lowStockThreshold || 10}
                      onChange={(e) => set({ lowStockThreshold: Number(e.target.value) || 10 })}
                      className="w-16 h-8 text-center text-[12px]"
                      aria-label="Custom threshold"
                    />
                  </div>
                </div>
                <p className="text-body-sm text-on-surface-variant">Total stock: <b>{p.variants.reduce((n, v) => n + toNum(v.stock), 0)}</b></p>
              </Card>
            )}
          </div>

          {/* Live preview, always visible */}
          <aside className="lg:sticky lg:top-20 flex flex-col gap-2">
            <p className="text-label-sm uppercase tracking-wide text-outline flex items-center gap-1"><Icon name="visibility" className="text-[16px]" /> Live preview · as shoppers see it</p>
            {/* A div, not a <button>: the card inside has its own (inert) buttons. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setBig(true)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setBig(true))}
              aria-label="Open the full preview"
              className="group relative max-w-[260px] w-full mx-auto lg:mx-0 text-left rounded-2xl cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <div inert className="pointer-events-none">
                <ProductCard product={preview} preview priority />
              </div>
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-on-surface/80 text-surface text-[11px] font-semibold shadow-lift transition-transform group-hover:scale-105">
                <Icon name="open_in_full" className="text-[14px]" /> Tap to enlarge
              </span>
            </div>
            <p className="text-[12px] text-outline">{p.images.length ? 'Tap the card to see the full product page with everything you’ve filled in.' : 'Add a photo to see it on the card. Tap the card for the full page.'}</p>
          </aside>
        </div>
      ) : (
        <FinalPreview p={p} set={set} preview={preview} similar={s?.similar || []} catName={catName} subName={subName} onEdit={go} />
      )}

      {/* Full-size live preview: everything filled so far; "add" markers jump to the right step. */}
      <Modal open={big} onClose={() => setBig(false)} size="xl" title="Live preview">
        <div className="px-3 sm:px-space-lg pb-space-lg flex flex-col gap-space-md">
          <p className="text-[12px] text-on-surface-variant flex items-center gap-1">
            <Icon name="info" className="text-[14px]" /> This is how the product page will look. Dashed boxes are still empty. Tap one to fill it.
          </p>
          <ProductPagePreview p={p} preview={preview} catName={catName} subName={subName} onEdit={(to) => { setBig(false); go(to); }} />
          <div className="border-t border-surface-container-high pt-space-md">
            <p className="text-label-sm uppercase tracking-wide text-outline mb-2">In the shop grid</p>
            <div inert className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="ring-2 ring-secondary rounded-2xl"><ProductCard product={preview} preview /></div>
              {(s?.similar || []).slice(0, 2).map((x) => <div key={x._id} className="opacity-60 hidden sm:block"><ProductCard product={x} preview /></div>)}
            </div>
          </div>
        </div>
      </Modal>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-30 mt-space-lg -mx-margin-sm md:-mx-margin -mb-space-lg bg-surface/95 border-t border-surface-container-high">
        <div className="px-margin-sm md:px-margin py-3 flex items-center justify-between gap-2">
          <Button variant="tonal" icon="arrow_back" disabled={step === 0} onClick={() => go(step - 1)}>Back</Button>
          <span className="hidden sm:block text-[12px] text-outline">Step {step + 1} of {STEPS.length}</span>
          {step < 4 && <Button variant="ghost" icon="visibility" onClick={() => setBig(true)} className="ml-auto sm:ml-0">Preview</Button>}
          {step < 4 ? (
            <Button iconRight="arrow_forward" onClick={() => go(step + 1)}>{step === 3 ? 'Final check' : 'Next'}</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="tonal"
                icon="visibility_off"
                loading={publish.isPending && publish.variables === false}
                disabled={publish.isPending}
                onClick={() => ready() && publish.mutate(false)}
              >
                <span className="hidden sm:inline">Save hidden</span>
              </Button>
              <Button
                icon="rocket_launch"
                loading={publish.isPending && publish.variables === true}
                disabled={publish.isPending}
                onClick={() => ready() && publish.mutate(true)}
              >
                Publish to store
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The one-click free AI writer (Gemini through our server). */
function AIWriterBox({ enabled, loading, canRun, hasPhoto, filled, onRun, onHelp }) {
  if (enabled === undefined) return null;
  return (
    <div className="rounded-xl p-3 sm:p-4 bg-gradient-to-br from-secondary/15 via-secondary/5 to-transparent ring-1 ring-secondary/25 flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="w-10 h-10 shrink-0 rounded-full bg-secondary text-on-secondary flex items-center justify-center">
        {loading ? <Spinner className="w-5 h-5" /> : <Icon name="auto_awesome" className="text-[22px]" />}
      </span>
      <div className="flex-1 text-[13px]">
        <p className="font-semibold">
          {loading ? (hasPhoto ? 'AI is looking at your photo…' : 'AI is writing…') : enabled ? 'Let AI fill everything (free)' : 'Free AI writer is off'}
        </p>
        <p className="text-on-surface-variant">
          {loading
            ? 'This takes about 10 seconds. You can keep typing.'
            : enabled
              ? 'It reads your photo and fills the name, category, price, description, colours, specs and FAQs. You check it before anything goes live.'
              : 'Turn it on once (2 minutes, free Google key). Until then, use the suggestions or the ChatGPT / Gemini buttons above.'}
        </p>
      </div>
      {enabled ? (
        <Button type="button" icon={filled ? 'refresh' : 'auto_fix_high'} loading={loading} disabled={!canRun} onClick={onRun} title={canRun ? undefined : 'Add a photo or a name first'}>
          {filled ? 'Rewrite with AI' : 'Write with AI'}
        </Button>
      ) : (
        <Button type="button" variant="tonal" icon="bolt" onClick={onHelp}>Turn on free AI</Button>
      )}
    </div>
  );
}

/** Plain steps for getting the free Gemini key (it lives only in server/.env, never in the browser). */
function AISetupModal({ open, onClose }) {
  const steps = [
    <>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-secondary underline">aistudio.google.com/apikey</a> and sign in with any Google account.</>,
    <>Press <b>Create API key</b> and copy it. It’s free and needs no card.</>,
    <>
      <b>Live site (Netlify):</b> open your site on app.netlify.com → <b>Project configuration → Environment variables</b> → add <code className="px-1 rounded bg-surface-container">GEMINI_API_KEY</code> with your key, then <b>Deploys → Trigger deploy</b>.
      <br />
      <b>On your computer:</b> add the line <code className="px-1 rounded bg-surface-container">GEMINI_API_KEY=your-key</code> to <code className="px-1 rounded bg-surface-container">server/.env</code> and restart the server.
    </>,
    <>The <b>Write with AI</b> button turns on here.</>,
  ];
  return (
    <Modal open={open} onClose={onClose} title="Turn on the free AI writer" size="md">
      <div className="px-space-lg pb-space-lg flex flex-col gap-3 text-body-sm">
        <ol className="flex flex-col gap-2.5">
          {steps.map((x, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="w-6 h-6 shrink-0 rounded-full bg-secondary text-on-secondary text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
              <span>{x}</span>
            </li>
          ))}
        </ol>
        <p className="text-[12px] text-outline">The free plan allows about a thousand products a day. The key stays on your server. Shoppers and the browser never see it.</p>
      </div>
    </Modal>
  );
}

function SuggestBanner({ s, loading, typed, filled, onFill }) {
  if (typed < 3) {
    return <p className="text-[12px] text-outline flex items-center gap-1"><Icon name="auto_awesome" className="text-[14px]" /> Type a name and we’ll suggest the category, price, description and colours.</p>;
  }
  if (loading && !s) return <p className="text-[12px] text-outline flex items-center gap-2"><Spinner className="w-3 h-3" /> Looking at similar products…</p>;
  if (!s) return null;
  return (
    <div className="p-3 rounded-xl bg-secondary/10 flex flex-col sm:flex-row sm:items-center gap-3">
      <Icon name="auto_awesome" className="text-[22px] text-secondary hidden sm:block" />
      <div className="flex-1 text-[13px]">
        <p className="font-semibold">
          {s.subcategory ? `Looks like ${/^[aeiou]/i.test(s.subcategory.name) ? 'an' : 'a'} ${s.subcategory.name.replace(/ies$/, 'y').replace(/s$/, '').toLowerCase()}` : 'Suggestions ready'}
          {s.price && ` · around ${s.price.suggested.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`}
        </p>
        <p className="text-on-surface-variant">
          {filled ? 'Filled in. You can change anything in the next steps.' : `Based on ${s.similar.length || 'your'} similar product${s.similar.length === 1 ? '' : 's'}. We can fill in the rest for you.`}
        </p>
      </div>
      {!filled && <Button size="sm" icon="auto_fix_high" onClick={onFill}>Fill everything for me</Button>}
    </div>
  );
}

function ListField({ label, value, onChange, ideas = [] }) {
  const left = ideas.filter((x) => !value.includes(x));
  return (
    <Field label={label}>
      <ChipInput value={value} onChange={onChange} suggestions={ideas} />
      {left.length > 0 && <Hint>{left.map((x) => <Pick key={x} icon="add" onClick={() => onChange([...value, x])}>{x}</Pick>)}</Hint>}
    </Field>
  );
}

/** Placeholder for a field that's still empty, with a jump to the step where it's filled. */
function Missing({ children, step, onEdit }) {
  return (
    <button type="button" onClick={() => onEdit?.(step)} className="self-start inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-outline-variant text-[12px] text-outline hover:text-secondary hover:border-secondary">
      <Icon name="add" className="text-[14px]" /> {children}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2 border-t border-surface-container-high pt-3">
      <p className="text-label-sm uppercase tracking-wide text-outline">{title}</p>
      {children}
    </div>
  );
}

/** The product page as shoppers will see it, with every field from the wizard (empty ones marked). */
function ProductPagePreview({ p, preview, catName, subName, onEdit }) {
  const money = useMoney();
  const [vi, setVi] = useState(0);
  const [img, setImg] = useState(0);
  const variant = preview.variants[Math.min(vi, preview.variants.length - 1)];
  const pct = discountPercent(preview);
  const gallery = p.images;
  const specs = p.specifications.filter((x) => x.label && x.value);
  const faqs = (p.faqs || []).filter((x) => x.question && x.answer);
  const stock = toNum(variant?.stock);
  const audience = { unisex: 'Universal', women: 'Women', men: 'Men' }[p.gender];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
      <div className="flex flex-col gap-2 md:sticky md:top-16 self-start w-full">
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-container-low">
          {gallery.length ? (
            <Img src={gallery[Math.min(img, gallery.length - 1)]?.url || productImage(preview, variant)} alt={p.name} w={960} className="absolute inset-0" />
          ) : (
            <button type="button" onClick={() => onEdit?.(0)} className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-outline hover:text-secondary">
              <Icon name="add_photo_alternate" className="text-[40px]" /> <span className="text-[13px]">No photo yet</span>
            </button>
          )}
          {p.badge && <span className="absolute top-3 left-3 px-2 py-1 rounded bg-surface-container-lowest/90 text-[11px] font-semibold">{p.badge}</span>}
          {gallery.length > 1 && <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-[11px]">{Math.min(img, gallery.length - 1) + 1} / {gallery.length}</span>}
        </div>
        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {gallery.map((g, i) => (
              <button key={g.url} type="button" onClick={() => setImg(i)} className={cn('w-16 h-16 shrink-0 rounded-lg overflow-hidden ring-2', i === img ? 'ring-secondary' : 'ring-transparent')}>
                <Img src={g.url} w={160} className="w-full h-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <p className="text-[12px] text-outline flex items-center gap-1 flex-wrap">
          Home <Icon name="chevron_right" className="text-[14px]" />
          {catName ? catName : <Missing step={1} onEdit={onEdit}>Category</Missing>}
          {subName && <><Icon name="chevron_right" className="text-[14px]" /> {subName}</>}
        </p>
        {p.tagline ? <p className="text-label-md uppercase tracking-wide text-secondary">{p.tagline}</p> : <Missing step={2} onEdit={onEdit}>Short line</Missing>}
        <h2 className="text-headline-md">{p.name || 'Your product name'}</h2>
        {toNum(p.price) > 0 ? (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-price-xl">{money(preview.finalPrice)}</span>
            {pct > 0 && (
              <>
                <span className="text-body-sm line-through text-outline">{money(preview.price)}</span>
                <span className="text-label-md text-emerald-700 dark:text-emerald-400">{pct}% off · save {money(preview.price - preview.finalPrice)}</span>
              </>
            )}
          </div>
        ) : (
          <Missing step={1} onEdit={onEdit}>Price</Missing>
        )}
        {p.shortDescription ? <p className="text-body-md text-on-surface-variant">{p.shortDescription}</p> : <Missing step={2} onEdit={onEdit}>Summary</Missing>}

        <div className="flex flex-wrap gap-1.5 text-[12px]">
          {p.capacity && <span className="chip h-7 bg-surface-container-low"><Icon name="straighten" className="text-[14px]" /> {p.capacity}</span>}
          <span className="chip h-7 bg-surface-container-low"><Icon name="group" className="text-[14px]" /> {audience}</span>
          {p.purposes.map((x) => <span key={x} className="chip h-7 bg-surface-container-low capitalize">{x}</span>)}
        </div>

        <div>
          <p className="text-label-md mb-2">Colour: <b>{variant?.name}</b> <span className={cn('ml-1 text-[12px]', stock > 0 ? (stock <= 5 ? 'text-amber-600' : 'text-emerald-600') : 'text-error')}>{stock > 0 ? (stock <= 5 ? `Only ${stock} left` : `${stock} in stock`) : 'Out of stock'}</span></p>
          {p.variants.length ? (
            <Swatches variants={preview.variants} selected={variant} onSelect={(v) => setVi(preview.variants.indexOf(v))} withNames />
          ) : (
            <Missing step={3} onEdit={onEdit}>Colours & stock</Missing>
          )}
        </div>
        <div inert>
          <span className="btn-primary w-full justify-center"><Icon name="shopping_bag" className="text-[18px]" /> Add to bag</span>
        </div>

        <Section title="Description">
          {p.description ? <p className="text-body-sm whitespace-pre-line">{p.description}</p> : <Missing step={2} onEdit={onEdit}>Full description</Missing>}
        </Section>
        <Section title="Materials & features">
          {p.materials.length + p.features.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {p.materials.map((x) => <span key={x} className="chip h-7 bg-surface-container-low text-[12px]"><Icon name="texture" className="text-[14px]" /> {x}</span>)}
              {p.features.map((x) => <span key={x} className="chip h-7 bg-surface-container-low text-[12px]"><Icon name="check" className="text-[14px]" /> {x}</span>)}
            </div>
          ) : (
            <Missing step={2} onEdit={onEdit}>Materials / features</Missing>
          )}
        </Section>
        <Section title="Specifications">
          {specs.length ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-body-sm">
              {specs.map((x) => (
                <div key={x.label} className="contents">
                  <dt className="text-on-surface-variant">{x.label}</dt>
                  <dd>{x.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Missing step={2} onEdit={onEdit}>Specifications</Missing>
          )}
        </Section>
        <Section title="FAQs">
          {faqs.length ? (
            faqs.map((f) => (
              <details key={f.question} className="group rounded-lg bg-surface-container-low px-3 py-2">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-body-sm font-semibold">
                  {f.question} <Icon name="expand_more" className="text-[18px] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-body-sm text-on-surface-variant mt-1">{f.answer}</p>
              </details>
            ))
          ) : (
            <Missing step={2} onEdit={onEdit}>FAQs</Missing>
          )}
        </Section>
        <Section title="Behind the scenes (shoppers don’t see this)">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
            <span className="text-outline">Product code</span><span>{p.sku || '—'}</span>
            <span className="text-outline">Total stock</span><span>{p.variants.reduce((n, v) => n + toNum(v.stock), 0)}</span>
            <span className="text-outline">Search words</span><span>{p.tags.length ? p.tags.join(', ') : '—'}</span>
            <span className="text-outline">Shows in</span><span>{[p.isNewArrival && 'New arrivals', p.isFeatured && 'Featured', p.isBestseller && 'Bestsellers'].filter(Boolean).join(', ') || 'Shop only'}</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

function FinalPreview({ p, set, preview, similar, catName, subName, onEdit }) {
  const stock = p.variants.reduce((n, v) => n + toNum(v.stock), 0);
  const checks = [
    [p.images.length >= 2, `${p.images.length} photo${p.images.length === 1 ? '' : 's'}`, 'More photos (back, inside, worn) help people buy', 0],
    [!!p.shortDescription, 'Summary written', 'Add a 1–2 line summary', 2],
    [!!p.description, 'Full description written', 'Add a full description', 2],
    [stock > 0, `${stock} in stock`, 'Stock is 0, so it will show “Out of stock”', 3],
    [p.tags.length > 0, 'Search words added', 'Add search words so people can find it', 2],
  ];

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="p-3 rounded-xl bg-amber-500/10 text-[13px] flex items-start gap-2">
        <Icon name="info" className="text-[18px] text-amber-600 shrink-0" />
        <span>This is a <b>preview only</b>. Shoppers can’t see it yet. Check everything, then press <b>Publish to store</b> below. Use <b>Save hidden</b> to keep it saved but off the store.</span>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-space-md items-start">
        <div className="card p-space-md">
          <p className="text-label-sm uppercase tracking-wide text-outline mb-2">1 · In the shop grid{catName ? ` (${catName}${subName ? ` › ${subName}` : ''})` : ''}</p>
          <div inert className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            <div className="relative">
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold whitespace-nowrap">YOUR NEW PRODUCT</span>
              <div className="ring-2 ring-secondary rounded-2xl h-full"><ProductCard product={preview} preview priority /></div>
            </div>
            {similar.slice(0, 2).map((x) => <div key={x._id} className="opacity-60"><ProductCard product={x} preview /></div>)}
          </div>
        </div>

        <div className="card p-space-md flex flex-col gap-2">
          <p className="text-label-sm uppercase tracking-wide text-outline">Checklist</p>
          {checks.map(([ok, good, bad, to]) => (
            <button key={good} type="button" onClick={() => !ok && onEdit(to)} className={cn('flex items-start gap-2 text-left text-[13px]', !ok && 'hover:underline')}>
              <Icon name={ok ? 'check_circle' : 'error'} fill className={cn('text-[18px] shrink-0', ok ? 'text-emerald-600' : 'text-amber-600')} />
              {ok ? good : bad}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-space-md">
        <p className="text-label-sm uppercase tracking-wide text-outline mb-3">2 · On the product page</p>
        <ProductPagePreview p={p} preview={preview} catName={catName} subName={subName} onEdit={onEdit} />
      </section>

      <section className="card p-space-md flex flex-col gap-3">
        <p className="text-label-sm uppercase tracking-wide text-outline">3 · Where else it shows (optional)</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <FlagToggle p={p} set={set} name="isNewArrival" label="New arrivals" />
          <FlagToggle p={p} set={set} name="isFeatured" label="Featured on home" />
          <FlagToggle p={p} set={set} name="isBestseller" label="Bestseller" />
        </div>
      </section>
    </div>
  );
}

function FlagToggle({ p, set, name, label }) {
  return <Toggle checked={!!p[name]} onChange={(v) => set({ [name]: v })} label={label} />;
}
