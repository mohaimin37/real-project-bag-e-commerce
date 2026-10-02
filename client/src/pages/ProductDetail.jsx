import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn, discountPercent, formatDate, imgUrl, initials, productImage, timeAgo } from '../lib/format';
import { countryName } from '../lib/countries';
import { pushRecent } from '../store';
import { useCart } from '../hooks/useCart';
import { useConfig, useMoney, useUser } from '../hooks/useStore';
import { ProductCard, Swatches, WishlistButton, firstAvailable } from '../components/product';
import { Badge, Breadcrumbs, Button, CountrySelect, EmptyState, ErrorState, Field, Icon, Img, Input, Modal, Pagination, QuantityStepper, Skeleton, StarInput, Stars, Textarea } from '../components/ui';
import NotFound from './NotFound';
import Seo, { breadcrumbLd, productLd } from '../components/Seo';

const FEATURE_ICON = { 'IPX5 Waterproof': 'water_drop', 'Laptop 16" Sleeve': 'laptop_mac', 'Laptop 14" Sleeve': 'laptop_mac', 'Trolley Pass-Through': 'luggage', 'RFID Blocking Pocket': 'security', 'Fidlock® Magnetic Fasteners': 'adjust', 'Shoe Compartment': 'steps' };

function Gallery({ product, variant }) {
  const images = [...(variant?.images || []), ...product.images.filter((i) => !variant?.images?.some((v) => v.url === i.url))];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => setActive(0), [variant?._id]);
  const current = images[active] || images[0];
  return (
    <div className="flex flex-col gap-space-md">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-container-low shadow-card group">
        <Img src={current?.url} alt={current?.alt || product.name} className="absolute inset-0" loading="eager" fetchPriority="high" w={640} />
        <div className="absolute top-4 left-4 flex flex-col gap-1">
          {product.badge && <Badge tone="dark">{product.badge}</Badge>}
          {discountPercent(product) > 0 && <Badge tone="mint">Save {discountPercent(product)}%</Badge>}
        </div>
        <button type="button" onClick={() => setZoom(true)} aria-label="Zoom image" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container-lowest/85 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
          <Icon name="zoom_in" />
        </button>
        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous image" onClick={() => setActive((active - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-container-lowest/85 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="chevron_left" />
            </button>
            <button type="button" aria-label="Next image" onClick={() => setActive((active + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface-container-lowest/85 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="chevron_right" />
            </button>
          </>
        )}
        {product.capacity && (
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-ink/80 backdrop-blur text-on-ink text-label-sm flex items-center gap-1">
            <Icon name="straighten" className="text-[14px] text-secondary-fixed" /> {product.capacity} capacity
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-space-sm">
          {images.map((img, i) => (
            <button key={img.url} type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} className={cn('aspect-square rounded-lg overflow-hidden ring-2 transition-all', i === active ? 'ring-secondary' : 'ring-transparent opacity-70 hover:opacity-100')}>
              <Img src={img.url} alt="" className="w-full h-full" w={160} />
            </button>
          ))}
        </div>
      )}
      <Modal open={zoom} onClose={() => setZoom(false)} size="xl" title={product.name}>
        <img src={imgUrl(current?.url, 1280)} alt={current?.alt || product.name} className="w-full max-h-[75vh] object-contain rounded-xl bg-surface-container-low" />
      </Modal>
    </div>
  );
}

function DeliveryEstimator({ product }) {
  const { data: config } = useConfig();
  const money = useMoney();
  const [country, setCountry] = useState('IN');
  const [zip, setZip] = useState('');
  const [result, setResult] = useState(null);
  const threshold = config?.freeShippingThreshold || 0;

  const calculate = (e) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9\s-]{3,12}$/.test(zip.trim())) {
      setResult({ error: 'Enter a valid postal code' });
      return;
    }
    const domestic = country === 'IN';
    const methods = (config?.shippingMethods || []).map((m) => {
      const [lo, hi] = (m.eta.match(/\d+/g) || [5, 7]).map(Number);
      const extra = domestic ? 0 : 3;
      const date = new Date();
      let added = 0;
      while (added < (hi || lo) + extra) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0) added += 1;
      }
      const free = m.freeEligible && (product.finalPrice ?? product.price) >= threshold;
      return { ...m, by: date, free };
    });
    setResult({ methods, place: `${zip.trim().toUpperCase()}, ${countryName(country)}` });
  };

  return (
    <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-label-sm uppercase tracking-wider">
          <Icon name="local_shipping" className="text-secondary text-[20px]" /> Doorstep arrival estimator
        </span>
        {threshold > 0 && <span className="text-label-sm text-secondary">Free shipping {money(threshold)}+</span>}
      </div>
      <form onSubmit={calculate} className="flex items-center gap-space-xs">
        <div className="w-36 shrink-0">
          <CountrySelect value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 bg-surface-container-lowest" aria-label="Destination country" />
        </div>
        <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Postal code" className="input h-10 bg-surface-container-lowest" aria-label="Postal code" />
        <button type="submit" className="h-10 px-space-md rounded-lg bg-ink text-on-ink text-label-md whitespace-nowrap hover:bg-primary transition-colors">Calculate</button>
      </form>
      {result?.error && <p className="text-label-md text-error">{result.error}</p>}
      {result?.methods && (
        <div className="flex flex-col gap-1.5 pt-1" aria-live="polite">
          {result.methods.map((m) => (
            <div key={m.code} className="flex items-center gap-2 text-label-md text-on-surface">
              <Icon name="check_circle" className="text-[16px] text-secondary" />
              <span>
                <b>{m.label}</b> — by {m.by.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} to {result.place}
                <span className="text-secondary"> · {m.free ? 'Free' : money(m.price)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const reviewSchema = z.object({
  rating: z.number().min(1, 'Choose a rating'),
  title: z.string().max(120).optional(),
  comment: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(2000),
});

function ReviewForm({ product, eligibility, onDone }) {
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 0, title: '', comment: '' } });
  const mutation = useMutation({
    mutationFn: (values) => api.createReview(product._id, values),
    onSuccess: () => {
      toast.success('Thanks! Your review is live.');
      qc.invalidateQueries({ queryKey: ['reviews', product._id] });
      qc.invalidateQueries({ queryKey: ['review-eligibility', product._id] });
      qc.invalidateQueries({ queryKey: ['product', product.slug] });
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-space-md">
      {eligibility?.verifiedPurchase ? (
        <p className="flex items-center gap-2 text-label-md text-secondary"><Icon name="verified" className="text-[18px]" /> Your review will be marked as a verified purchase.</p>
      ) : (
        <p className="text-body-sm text-on-surface-variant">We couldn't find a delivered order for this item, so your review won't carry the verified badge.</p>
      )}
      <Field label="Your rating" error={errors.rating?.message} required>
        <StarInput value={watch('rating')} onChange={(v) => setValue('rating', v, { shouldValidate: true })} />
      </Field>
      <Field label="Headline" error={errors.title?.message} htmlFor="rv-title">
        <Input id="rv-title" placeholder="Sum it up in a few words" {...register('title')} />
      </Field>
      <Field label="Review" error={errors.comment?.message} required htmlFor="rv-comment">
        <Textarea id="rv-comment" rows={5} placeholder="How has it performed on your commute or travels?" error={errors.comment} {...register('comment')} />
      </Field>
      <Button type="submit" loading={mutation.isPending} className="self-end">Submit review</Button>
    </form>
  );
}

function Reviews({ product, breakdown }) {
  const user = useUser();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [rating, setRating] = useState('');
  const [writing, setWriting] = useState(false);
  const reviews = useQuery({ queryKey: ['reviews', product._id, page, sort, rating], queryFn: () => api.reviews(product._id, { page, sort, rating }) });
  const eligibility = useQuery({ queryKey: ['review-eligibility', product._id], queryFn: () => api.reviewEligibility(product._id), enabled: Boolean(user) });
  const helpful = useMutation({ mutationFn: api.helpful, onSuccess: () => { toast.success('Thanks for the feedback'); reviews.refetch(); } });
  const total = breakdown.reduce((s, b) => s + b.count, 0);

  const startReview = () => {
    if (!user) {
      navigate(`/login?next=/product/${product.slug}%23reviews`);
      return;
    }
    if (eligibility.data && !eligibility.data.canReview) {
      toast('You have already reviewed this product.');
      return;
    }
    setWriting(true);
  };

  return (
    <section id="reviews" className="container-x py-space-xl scroll-mt-32">
      <div className="flex flex-col gap-1 mb-space-lg">
        <span className="eyebrow">Verified community</span>
        <h2 className="text-headline-xl-mobile md:text-headline-xl">Ratings & Reviews</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg">
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="card p-space-lg flex flex-col items-center text-center gap-2">
            <span className="text-[56px] leading-none font-extrabold tracking-tight">{product.ratingAverage ? product.ratingAverage.toFixed(1) : '—'}</span>
            <Stars value={product.ratingAverage} size={22} />
            <span className="text-body-sm text-on-surface-variant">Based on {product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}</span>
            <div className="w-full flex flex-col gap-1.5 pt-space-md">
              {breakdown.map((b) => (
                <button key={b.star} type="button" onClick={() => { setRating(rating === String(b.star) ? '' : String(b.star)); setPage(1); }} className={cn('flex items-center gap-2 text-label-md rounded px-1 py-0.5', rating === String(b.star) && 'bg-surface-container-low')}>
                  <span className="w-6 text-right">{b.star}★</span>
                  <span className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <span className="block h-full bg-on-tertiary-container rounded-full" style={{ width: `${total ? (b.count / total) * 100 : 0}%` }} />
                  </span>
                  <span className="w-8 text-left text-outline">{b.count}</span>
                </button>
              ))}
            </div>
            <Button className="w-full mt-space-md" icon="rate_review" onClick={startReview}>Write a review</Button>
            {!user && <p className="text-label-sm font-normal text-outline">Sign in to share your experience.</p>}
          </div>
        </div>
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-label-lg">{reviews.data?.total ?? '…'} review{reviews.data?.total === 1 ? '' : 's'} {rating && `· ${rating}★ only`}</span>
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="input h-9 w-auto" aria-label="Sort reviews">
              <option value="newest">Newest</option>
              <option value="helpful">Most helpful</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>
          {reviews.isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)
          ) : reviews.isError ? (
            <ErrorState error={reviews.error} onRetry={reviews.refetch} />
          ) : reviews.data.items.length === 0 ? (
            <EmptyState icon="reviews" title="No reviews yet" description="Be the first to tell other travellers how it performs." />
          ) : (
            reviews.data.items.map((r) => (
              <article key={r._id} className="card p-space-lg flex flex-col gap-space-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center text-label-lg">{initials(r.user?.name)}</span>
                    <div>
                      <p className="text-label-lg">{r.user?.name || 'WILDTANE customer'}</p>
                      <p className="text-label-sm font-normal text-outline">{r.user?.country ? `${countryName(r.user.country)} · ` : ''}{timeAgo(r.createdAt)}</p>
                    </div>
                  </div>
                  {r.isVerifiedPurchase && <Badge tone="mint"><Icon name="verified" className="text-[12px]" /> Verified</Badge>}
                </div>
                <Stars value={r.rating} />
                {r.title && <h4 className="text-headline-sm">{r.title}</h4>}
                <p className="text-body-md text-on-surface-variant whitespace-pre-line">{r.comment}</p>
                <button type="button" onClick={() => helpful.mutate(r._id)} disabled={helpful.isPending} className="self-start flex items-center gap-1 text-label-md text-on-surface-variant hover:text-secondary">
                  <Icon name="thumb_up" className="text-[16px]" /> Helpful ({r.helpfulCount})
                </button>
              </article>
            ))
          )}
          <Pagination page={page} pages={reviews.data?.pages} onChange={setPage} />
        </div>
      </div>
      <Modal open={writing} onClose={() => setWriting(false)} title={`Review ${product.name}`}>
        <ReviewForm product={product} eligibility={eligibility.data} onDone={() => setWriting(false)} />
      </Modal>
    </section>
  );
}

function Faq({ faqs }) {
  const [open, setOpen] = useState(0);
  if (!faqs?.length) return null;
  return (
    <section className="max-w-4xl mx-auto px-margin-sm md:px-margin py-space-xl w-full">
      <div className="flex flex-col gap-space-xs text-center mb-space-lg">
        <span className="eyebrow">Questions & answers</span>
        <h2 className="text-headline-lg">Frequently Asked Questions</h2>
      </div>
      <div className="flex flex-col gap-space-sm">
        {faqs.map((f, i) => (
          <div key={f.question} className="card overflow-hidden">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="w-full p-space-md text-left flex items-center justify-between gap-4 hover:bg-surface-container-low transition-colors">
              <span className="text-headline-sm">{f.question}</span>
              <Icon name="expand_more" className={cn('text-outline transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <div className="px-space-md pb-space-md text-body-sm text-on-surface-variant animate-fade-in">{f.answer}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useUser();
  const money = useMoney();
  const { data: config } = useConfig();
  const { add } = useCart();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['product', slug], queryFn: () => api.product(slug) });
  const product = data?.product;
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const ctaRef = useRef(null);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [product?._id, variant]);

  useEffect(() => {
    if (!product) return;
    setVariant(firstAvailable(product));
    setQty(1);
    dispatch(pushRecent(product._id));
    if (user) api.trackView(product._id).catch(() => {});
  }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isError && error?.status === 404) return <NotFound />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !product || !variant) {
    return (
      <div className="container-x py-space-xl grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg">
        <Skeleton className="lg:col-span-7 aspect-square" />
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-24" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  const max = Math.max(1, Math.min(99, variant.stock));
  const soldOut = variant.stock <= 0;
  const fx = (config?.currencies || []).filter((c) => c.code !== money.currency.code && ['USD', 'EUR', 'AED', 'INR'].includes(c.code)).slice(0, 3);
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }];
  if (product.category) crumbs.push({ label: product.category.name, to: `/shop/${product.category.slug}` });
  if (product.subcategory) crumbs.push({ label: product.subcategory.name, to: `/shop/${product.subcategory.slug}` });
  crumbs.push({ label: product.name });

  const addToBag = (then) => add.mutate({ productId: product._id, variantId: variant._id, quantity: qty, openDrawer: !then, silent: Boolean(then) }, { onSuccess: then });

  return (
    <>
      <Seo
        title={`${product.name}${product.subcategory ? ` — ${product.subcategory.name}` : ''}`}
        description={`${product.shortDescription || product.description} ${product.ratingCount ? `Rated ${product.ratingAverage.toFixed(1)}/5. ` : ''}Free shipping, lifetime repairs.`}
        image={product.images?.[0]?.url}
        type="product"
        canonical={`/product/${product.slug}`}
        jsonLd={[productLd(product), breadcrumbLd(crumbs)]}
      />
      <div className="container-x pt-space-md"><Breadcrumbs items={crumbs} /></div>
      <section className="container-x py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        <div className="lg:col-span-7">
          <Gallery product={product} variant={variant} />
          {product.features?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mt-space-md">
              {product.features.slice(0, 4).map((f) => (
                <div key={f} className="p-space-sm rounded-xl bg-surface-container-low flex flex-col items-center text-center gap-1">
                  <Icon name={FEATURE_ICON[f] || 'verified'} className="text-secondary" />
                  <span className="text-label-md">{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-space-md lg:sticky lg:top-32">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-sm uppercase tracking-widest text-secondary">WILDTANE // {product.tagline || product.subcategory?.name}</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-label-sm font-normal">SKU {variant.sku}</span>
            </div>
            <h1 className="text-headline-xl-mobile md:text-headline-lg">{product.name}</h1>
            {product.ratingCount > 0 && (
              <a href="#reviews" className="flex items-center gap-space-sm pt-1 text-label-md hover:text-secondary">
                <Stars value={product.ratingAverage} size={18} />
                <span className="underline decoration-outline-variant">{product.ratingAverage.toFixed(1)} ({product.ratingCount} reviews)</span>
              </a>
            )}
          </div>

          <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-card flex flex-col gap-space-xs">
            <div className="flex items-baseline gap-space-md flex-wrap">
              <span className="text-price-xl">{money(product.finalPrice)}</span>
              {discountPercent(product) > 0 && (
                <>
                  <span className="text-price-md text-outline line-through">{money(product.price)}</span>
                  <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-fixed text-label-sm">Save {discountPercent(product)}% ({money(product.price - product.finalPrice)} off)</span>
                </>
              )}
            </div>
            {fx.length > 0 && (
              <p className="text-label-sm font-normal text-on-surface-variant flex items-center gap-1">
                <Icon name="sync_alt" className="text-[16px] text-outline" />
                ≈ {fx.map((c) => `${c.symbol}${(product.finalPrice * c.rate).toLocaleString('en-US', { maximumFractionDigits: c.rate < 0.1 ? 0 : 2 })}`).join(' / ')}
              </p>
            )}
            {config?.pricesIncludeTax && <p className="text-label-sm font-normal text-outline">Inclusive of {config.taxLabel}. Charged in INR at checkout.</p>}
          </div>

          <div className="flex flex-col gap-space-sm pt-space-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-lg">1. Pick a colour</span>
              {product.isBestseller && <span className="text-label-sm text-secondary">Best seller</span>}
            </div>
            <Swatches variants={product.variants} selected={variant} onSelect={(v) => { setVariant(v); setQty(1); }} withNames />
          </div>

          {product.materials?.length > 0 && (
            <div className="flex flex-wrap gap-space-xs">
              {product.materials.map((m) => (
                <span key={m} className="px-2.5 py-1.5 rounded-lg bg-surface-container-low text-label-md flex items-center gap-1.5">
                  <Icon name="recycling" className="text-[16px] text-secondary" /> {m}
                </span>
              ))}
            </div>
          )}

          <span className="text-label-lg -mb-2">2. How many?</span>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <QuantityStepper value={qty} onChange={setQty} max={max} disabled={soldOut} />
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {!soldOut && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />}
                <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', soldOut ? 'bg-error' : variant.stock <= 5 ? 'bg-on-tertiary-container' : 'bg-secondary')} />
              </span>
              <span className="text-label-md">
                {soldOut ? 'Sold out in this colour' : variant.stock <= 5 ? `Only ${variant.stock} left` : 'In stock'}
                {!soldOut && <span className="font-normal text-on-surface-variant"> — dispatches within 24h</span>}
              </span>
            </div>
          </div>

          <div ref={ctaRef} className="flex flex-col gap-space-sm pt-space-xs">
            <span className="text-label-lg">3. Add it to your bag</span>
            <div className="flex items-center gap-space-sm">
              <Button variant="secondary" icon="shopping_bag" className="flex-1 h-14 text-body-md" disabled={soldOut} loading={add.isPending && !add.variables?.silent} onClick={() => addToBag()}>
                {soldOut ? 'Sold out' : `Add to Bag — ${money(product.finalPrice * qty)}`}
              </Button>
              <WishlistButton product={product} className="w-14 h-14 rounded-lg shadow-card" />
            </div>
            <Button variant="tonal" icon="bolt" className="w-full h-14 text-body-md !bg-inverse-surface !text-inverse-on-surface hover:!bg-primary hover:!text-on-primary" disabled={soldOut} onClick={() => addToBag(() => navigate('/checkout'))}>
              Buy now (go straight to checkout)
            </Button>
          </div>

          <DeliveryEstimator product={product} />

          <div className="grid grid-cols-3 gap-space-xs text-center text-label-sm font-normal text-on-surface-variant">
            {[
              ['verified_user', 'Lifetime Warranty', '/pages/warranty'],
              ['published_with_changes', '30-Day Free Returns', '/pages/returns'],
              ['co2', 'Carbon Neutral', '/sustainability'],
            ].map(([icon, label, to]) => (
              <Link key={label} to={to} className="p-2 rounded-lg bg-surface-container-lowest shadow-card flex flex-col items-center gap-1 hover:text-secondary">
                <Icon name={icon} className="text-[20px] text-secondary" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-surface-container-lowest py-space-xl my-space-lg">
        <div className="container-x">
          <div className="flex flex-col gap-space-xs max-w-3xl mb-space-lg">
            <span className="eyebrow">Engineering dossier</span>
            <h2 className="text-headline-xl-mobile md:text-headline-xl">Architectural Utility. Zero Compromise.</h2>
            <p className="text-body-md text-on-surface-variant whitespace-pre-line">{product.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="p-space-lg rounded-2xl bg-surface-container-low flex flex-col justify-between gap-space-md">
              <div>
                <div className="flex items-center justify-between pb-space-sm">
                  <span className="text-headline-sm">Technical matrix</span>
                  <Icon name="straighten" className="text-secondary" />
                </div>
                <div className="flex flex-col text-body-sm">
                  {(product.specifications?.length ? product.specifications : [{ label: 'Capacity', value: product.capacity || '—' }]).map((s, i) => (
                    <div key={s.label} className={cn('flex justify-between gap-4 py-2 px-3 rounded', i % 2 === 0 && 'bg-surface-container-lowest')}>
                      <span className="text-on-surface-variant">{s.label}</span>
                      <span className="font-semibold text-right">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-space-lg rounded-2xl bg-surface-container-low flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="text-headline-sm">Material provenance</span>
                <Icon name="eco" className="text-secondary" />
              </div>
              <ul className="flex flex-col gap-2">
                {product.materials.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-body-sm"><Icon name="check_circle" className="text-[18px] text-secondary" /> {m}</li>
                ))}
              </ul>
              <p className="text-body-sm text-on-surface-variant">Every material is traceable to certified mills and LWG Gold-rated tanneries.</p>
              <Link to="/sustainability" className="mt-auto text-label-md text-secondary flex items-center gap-1">Our material standards <Icon name="arrow_forward" className="text-[14px]" /></Link>
            </div>
            <div className="p-space-lg rounded-2xl bg-ink text-on-ink flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="text-headline-sm">Lifetime guarantee</span>
                <Icon name="handyman" className="text-secondary-fixed" />
              </div>
              <p className="text-body-sm text-on-ink/75">If any hardware, seam or fastener fails — in year one or year fifteen — we repair or replace it free, including prepaid pickup.</p>
              <Link to="/pages/warranty" className="mt-auto btn bg-white/10 hover:bg-white/20 text-on-ink w-fit">How repairs work</Link>
            </div>
          </div>
        </div>
      </section>

      <Reviews product={product} breakdown={data.ratingBreakdown} />
      <Faq faqs={product.faqs} />

      {data.related?.length > 0 && (
        <section className="w-full bg-surface-container-low py-space-xl">
          <div className="container-x flex flex-col gap-space-lg">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Modular ecosystem</span>
                <h3 className="text-headline-lg">Pair With {product.name.split(' ').slice(0, 3).join(' ')}</h3>
              </div>
              <Link to={`/shop/${product.category?.slug || ''}`} className="text-label-md text-secondary hover:underline flex items-center gap-1 shrink-0">
                Explore all <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {data.related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}
      <p className="sr-only">Last updated {formatDate(product.updatedAt)}</p>

      {/* Mobile: sticky purchase bar once the main button scrolls away. */}
      <div
        className={cn(
          'lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high px-margin-sm pt-3 pb-safe flex items-center gap-3 transition-transform duration-300',
          showBar ? 'translate-y-0' : 'translate-y-full'
        )}
        aria-hidden={!showBar}
      >
        <Img src={productImage(product, variant)} alt="" className="w-11 h-11 rounded-lg shrink-0" w={160} />
        <div className="flex-1 min-w-0">
          <p className="text-label-lg truncate">{product.name}</p>
          <p className="text-label-md font-normal text-on-surface-variant">{money(product.finalPrice)} · {variant.name}</p>
        </div>
        <Button variant="secondary" icon="shopping_bag" className="shrink-0" disabled={soldOut} tabIndex={showBar ? 0 : -1} onClick={() => addToBag()}>
          {soldOut ? 'Sold out' : 'Add'}
        </Button>
      </div>
    </>
  );
}
