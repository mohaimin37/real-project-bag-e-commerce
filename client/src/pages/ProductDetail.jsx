import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
import { ProductCard, Swatches, WishlistButton, firstAvailable, isSized, useProductsByIds } from '../components/product';
import { Badge, Breadcrumbs, Button, CountrySelect, EmptyState, ErrorState, Field, Icon, Img, Input, Modal, Pagination, QuantityStepper, Skeleton, StarInput, Stars, Textarea } from '../components/ui';
import NotFound from './NotFound';
import Seo, { breadcrumbLd, faqPageLd, productLd } from '../components/Seo';
import { EarnCoins } from '../components/coins';
import { BackInStockModal } from '../components/growth/BackInStockModal';

const FEATURE_ICON = { 'IPX5 Waterproof': 'water_drop', 'Laptop 16" Sleeve': 'laptop_mac', 'Laptop 14" Sleeve': 'laptop_mac', 'Trolley Pass-Through': 'luggage', 'RFID Blocking Pocket': 'security', 'Fidlock® Magnetic Fasteners': 'adjust', 'Shoe Compartment': 'steps' };

function Gallery({ product, variant }) {
  const images = [...(variant?.images || []), ...product.images.filter((i) => !variant?.images?.some((v) => v.url === i.url))];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => setActive(0), [variant?._id]);
  const current = images[active] || images[0];
  return (
    <div className="flex flex-col gap-2.5 sm:gap-space-md">
      <div className="relative aspect-[4/3] sm:aspect-square max-h-[300px] sm:max-h-[460px] lg:max-h-none lg:aspect-square rounded-xl overflow-hidden bg-surface-container-lowest group">
        <Img
          src={current?.url}
          alt={current?.alt || product.name}
          className="absolute inset-0"
          imgClassName="w-full h-full object-contain p-2 md:p-0 md:object-cover"
          loading="eager"
          fetchPriority="high"
          w={640}
        />
        <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 flex flex-col gap-1 z-10">
          {product.badge && <Badge tone="dark" className="text-[10px] sm:text-label-sm">{product.badge}</Badge>}
          {discountPercent(product) > 0 && <span className="px-1.5 py-0.5 rounded bg-success text-on-success text-[10px] font-bold">{discountPercent(product)}% OFF</span>}
        </div>
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="Zoom image"
          className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-lowest/90 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Icon name="zoom_in" className="text-[18px] sm:text-[22px]" />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => setActive((active - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-lowest/90 flex items-center justify-center opacity-75 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
            >
              <Icon name="chevron_left" className="text-[18px] sm:text-[22px]" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => setActive((active + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-lowest/90 flex items-center justify-center opacity-75 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
            >
              <Icon name="chevron_right" className="text-[18px] sm:text-[22px]" />
            </button>
          </>
        )}
        {product.capacity && (
          <div className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/60 text-white text-[10px] sm:text-label-sm flex items-center gap-1 z-10">
            <Icon name="straighten" className="text-[12px] sm:text-[14px] text-secondary-fixed" /> {product.capacity} capacity
          </div>
        )}
        {images.length > 1 && (
          <div className="sm:hidden absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold z-10">
            {active + 1} / {images.length}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-6 sm:gap-space-sm">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              className={cn(
                'w-14 h-14 sm:w-auto sm:aspect-square shrink-0 rounded-lg overflow-hidden ring-2 transition-all',
                i === active ? 'ring-secondary' : 'ring-transparent opacity-70 hover:opacity-100'
              )}
            >
              <Img src={img.url} alt="" className="w-full h-full" imgClassName="object-contain sm:object-cover" w={160} />
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
    onSuccess: (res) => {
      // New reviews are checked by the team before they appear.
      toast.success(res.message || 'Thanks! Your review will appear once it has been checked.');
      qc.invalidateQueries({ queryKey: ['reviews', product._id] });
      qc.invalidateQueries({ queryKey: ['review-eligibility', product._id] });
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-space-md">
      {eligibility?.verifiedPurchase && (
        <p className="flex items-center gap-2 text-label-md text-secondary"><Icon name="verified" className="text-[18px]" /> You bought this item, so your review will show a Verified Buyer badge.</p>
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
      toast(
        eligibility.data.reason === 'not-purchased'
          ? 'Only customers who have received this product can review it.'
          : eligibility.data.existingReview?.status === 'approved'
            ? 'You have already reviewed this product.'
            : 'Thanks, your review is waiting to be checked by our team.'
      );
      return;
    }
    setWriting(true);
  };

  return (
    <section id="reviews" className="container-x py-space-xl scroll-mt-32">
      <div className="flex flex-col gap-1 mb-space-lg">
        
        <h2 className="text-headline-md">Ratings & Reviews</h2>
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
            <p className="text-label-sm font-normal text-outline">
              {!user ? 'Sign in to share your experience. ' : ''}Reviews come from customers who received this product and are checked before they appear.
            </p>
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
                  {r.isVerifiedPurchase && <Badge tone="mint"><Icon name="verified" className="text-[12px]" /> Verified Buyer</Badge>}
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
        <h2 className="text-headline-md">Frequently Asked Questions</h2>
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

function StockShowcaseBox({ variant }) {
  if (!variant) return null;
  const stock = Number(variant.stock || 0);
  const soldOut = stock <= 0;
  const isCritical = !soldOut && stock <= 5;
  const isLow = !soldOut && stock > 5 && stock <= 10;
  const isNotice = !soldOut && stock > 10 && stock <= 20;

  // Visual meter percentage scaled against 25 units
  const barPercent = soldOut ? 0 : Math.min(100, Math.max(12, Math.round((stock / 25) * 100)));

  return (
    <div
      className={cn(
        'rounded-2xl p-3.5 sm:p-4 transition-all duration-300 border shadow-xs flex flex-col gap-2.5 my-1.5',
        soldOut
          ? 'bg-surface-container-high/40 border-outline-variant/60'
          : isCritical
          ? 'bg-rose-500/10 dark:bg-rose-950/25 border-rose-500/35 ring-1 ring-rose-500/20'
          : isLow
          ? 'bg-rose-500/10 dark:bg-rose-950/25 border-rose-500/35 ring-1 ring-rose-500/20'
          : isNotice
          ? 'bg-rose-500/5 dark:bg-rose-950/15 border-rose-500/20'
          : 'bg-emerald-500/5 dark:bg-emerald-950/15 border-emerald-500/20'
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {!soldOut && (isCritical || isLow) && (
              <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isCritical ? 'bg-rose-500' : 'bg-rose-500')} />
            )}
            <span
              className={cn(
                'relative inline-flex rounded-full h-3 w-3 shadow-xs',
                soldOut
                  ? 'bg-error'
                  : isCritical
                  ? 'bg-rose-600'
                  : isLow
                  ? 'bg-rose-500'
                  : isNotice
                  ? 'bg-rose-400'
                  : 'bg-emerald-600'
              )}
            />
          </span>

          <span className="text-[13px] sm:text-[14px] font-bold">
            {soldOut ? (
              <span className="text-error font-semibold">Sold out in this colour</span>
            ) : isCritical ? (
              <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1">
                🔥 CRITICAL STOCK: Only {stock} {stock === 1 ? 'item' : 'items'} left!
              </span>
            ) : isLow ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                ⚡ HIGH DEMAND: Only {stock} units left in stock!
              </span>
            ) : isNotice ? (
              <span className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
                ⏱ Low Inventory: Only {stock} available
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                ✓ In Stock & Ready to Dispatch
              </span>
            )}
          </span>
        </div>

        {!soldOut && (
          <span
            className={cn(
              'text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs',
              isCritical
                ? 'bg-rose-600 text-white border-rose-700'
                : isLow
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-surface-container-lowest text-on-surface border-surface-container-highest'
            )}
          >
            {stock} in stock
          </span>
        )}
      </div>

      {!soldOut && (
        <div className="flex flex-col gap-1">
          <div className="w-full h-2 rounded-full bg-surface-container-highest/60 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                isCritical
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 animate-pulse'
                  : isLow
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                  : isNotice
                  ? 'bg-gradient-to-r from-rose-400 to-pink-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
              )}
              style={{ width: `${barPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-outline font-medium">
            <span>Stock meter</span>
            <span>{isCritical ? 'Order now before sold out' : isLow ? 'High order volume today' : 'Dispatches within 24–48 hours'}</span>
          </div>
        </div>
      )}

      {/* Shopper live activity pulse div */}
      <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between gap-2 text-[11px] sm:text-[11.5px] text-on-surface-variant flex-wrap">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon name="visibility" className="text-[15px] text-secondary" />
          <span><strong>6 people</strong> viewing this bag right now</span>
        </span>
        <span className="flex items-center gap-1 text-secondary font-medium">
          <Icon name="verified_user" className="text-[13px]" /> 7-Day Returns
        </span>
      </div>
    </div>
  );
}

function FrequentlyBoughtTogether({ product, companion, onAddBundle, isPending }) {
  const money = useMoney();
  if (!companion) return null;
  const bundleTotal = (product.finalPrice || product.price) + (companion.finalPrice || companion.price);
  const bundleDiscount = Math.round(bundleTotal * 0.05); // 5% bundle savings
  const finalBundlePrice = bundleTotal - bundleDiscount;

  return (
    <section className="w-full py-6 bg-surface-container-low/40 rounded-3xl border border-outline-variant/30 my-6">
      <div className="container-x">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Icon name="auto_awesome" className="text-[18px]" />
          </span>
          <h3 className="text-headline-sm font-black text-on-surface">Frequently Bought Together</h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
            Save 5% Extra
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs max-w-xs">
              <Img src={product.images?.[0]?.url} alt={product.name} className="w-16 h-16 rounded-xl shrink-0 object-cover" w={80} />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">This item</span>
                <p className="text-label-md font-bold text-on-surface truncate">{product.name}</p>
                <p className="text-label-md font-black text-on-surface">{money(product.finalPrice || product.price)}</p>
              </div>
            </div>

            <span className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-outline font-bold text-lg shrink-0">
              +
            </span>

            <Link to={`/product/${companion.slug}`} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs max-w-xs hover:border-secondary transition-all">
              <Img src={companion.images?.[0]?.url} alt={companion.name} className="w-16 h-16 rounded-xl shrink-0 object-cover" w={80} />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Matching Carry</span>
                <p className="text-label-md font-bold text-on-surface truncate">{companion.name}</p>
                <p className="text-label-md font-black text-on-surface">{money(companion.finalPrice || companion.price)}</p>
              </div>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 text-right w-full lg:w-auto">
            <div>
              <div className="text-label-sm text-outline">
                Combined price: <span className="line-through">{money(bundleTotal)}</span>
              </div>
              <div className="text-headline-sm font-black text-on-surface">
                Bundle Price: <span className="text-success">{money(finalBundlePrice)}</span>
              </div>
            </div>
            <Button
              variant="primary"
              icon="add_shopping_cart"
              loading={isPending}
              onClick={() => onAddBundle(companion)}
              className="w-full sm:w-auto font-bold"
            >
              Add Both to Bag
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentlyViewedSection({ currentId }) {
  const recentIds = useSelector((s) => s.guestLists?.recent || []);
  const filteredIds = useMemo(() => recentIds.filter((id) => id !== currentId).slice(0, 4), [recentIds, currentId]);
  const { data: products } = useProductsByIds(filteredIds);

  if (!products || products.length === 0) return null;

  return (
    <section className="w-full py-8 border-t border-surface-container-high">
      <div className="container-x flex flex-col gap-space-md">
        <div className="flex items-center gap-2">
          <Icon name="history" className="text-secondary text-[22px]" />
          <h3 className="text-headline-md font-black text-on-surface">Recently Viewed by You</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Copies text, falling back to a hidden textarea where the Clipboard API isn't allowed (e.g. plain http). */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/**
 * Shares the product's clean public URL (no query string, ids or tokens): the native share sheet
 * where the device has one, otherwise a copied link.
 */
async function shareProduct(product) {
  const url = `${window.location.origin}/product/${encodeURIComponent(product.slug)}`;
  const text = [product.tagline, product.shortDescription].filter(Boolean).join(' — ').slice(0, 160) || `${product.name} at WILDTANE`;
  const data = { title: `${product.name} — WILDTANE`, text, url };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // the shopper closed the share sheet
    }
  }
  if (await copyText(url)) toast.success('Product link copied');
  else toast.error(`Couldn’t copy automatically. Link: ${url}`, { duration: 8000 });
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
  const [showBackInStock, setShowBackInStock] = useState(false);
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
        <Skeleton className="lg:col-span-5 aspect-square" />
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-24" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>
    );
  }

  const max = Math.max(1, Math.min(99, Number(variant?.stock ?? 0)));
  const soldOut = Number(variant?.stock ?? 0) <= 0;
  const fx = (config?.currencies || []).filter((c) => c.code !== money.currency.code && ['USD', 'EUR', 'AED', 'INR'].includes(c.code)).slice(0, 3);
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }];
  if (product.category) crumbs.push({ label: product.category.name, to: `/shop/${product.category.slug}` });
  if (product.subcategory) crumbs.push({ label: product.subcategory.name, to: `/shop/${product.subcategory.slug}` });
  crumbs.push({ label: product.name });

  const addToBag = (then) => add.mutate({ productId: product._id, variantId: variant._id, quantity: qty, openDrawer: !then, silent: Boolean(then) }, { onSuccess: then });

  const addBundle = (companion) => {
    addToBag();
    const compVariant = firstAvailable(companion);
    if (compVariant) {
      add.mutate({
        productId: companion._id,
        variantId: compVariant._id,
        quantity: 1,
        openDrawer: true,
      });
      toast.success('Bundle added to bag with 5% extra savings!', { icon: '🛍️' });
    }
  };

  return (
    <>
      <Seo
        title={product.seoTitle || `${product.name}${product.subcategory ? ` — ${product.subcategory.name}` : ''}`}
        description={product.seoDescription || `${product.shortDescription || product.description} ${product.ratingCount ? `Rated ${product.ratingAverage.toFixed(1)}/5. ` : ''}Tracked delivery and 7-day returns.`}
        image={product.images?.[0]?.url}
        type="product"
        canonical={`/product/${product.slug}`}
        jsonLd={[
          productLd(product),
          breadcrumbLd(crumbs),
          ...(product.faqs?.length ? [faqPageLd(product.faqs)] : []),
        ]}
      />
      <div className="container-x pt-space-md"><Breadcrumbs items={crumbs} /></div>
      <section className="container-x py-space-lg grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        <div className="lg:col-span-5">
          <Gallery product={product} variant={variant} />
          {product.features?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {product.features.slice(0, 4).map((f) => (
                <div key={f} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-surface-container text-[12px]">
                  <Icon name={FEATURE_ICON[f] || 'verified'} className="text-[15px] text-secondary" />
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col gap-space-md lg:sticky lg:top-20">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-outline">{product.tagline || product.subcategory?.name}</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-label-sm font-normal">SKU {variant.sku}</span>
            </div>
            <h1 className="text-[24px] leading-tight md:text-[32px]">{product.name}</h1>
            {product.ratingCount > 0 && (
              <a href="#reviews" className="flex items-center gap-space-sm pt-1 text-label-md hover:text-secondary">
                <Stars value={product.ratingAverage} size={18} />
                <span className="underline decoration-outline-variant">{product.ratingAverage.toFixed(1)} ({product.ratingCount} reviews)</span>
              </a>
            )}
          </div>

          <div className="flex flex-col gap-space-xs">
            <div className="flex items-baseline gap-space-md flex-wrap">
              <span className="text-price-xl">{money(product.finalPrice)}</span>
              {discountPercent(product) > 0 && (
                <>
                  <span className="text-price-md text-outline line-through">{money(product.price)}</span>
                  <span className="text-label-lg text-success">{discountPercent(product)}% off</span>
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
            <EarnCoins amount={product.finalPrice * qty} className="mt-1" />
          </div>

          <div className="flex flex-col gap-space-sm pt-space-xs">
            <div className="flex items-center justify-between">
              <span className="text-label-lg">
                {isSized(product.variants) ? 'Size' : 'Colour'}: <span className="font-normal text-on-surface-variant">{isSized(product.variants) ? variant.size : variant.name}</span>
              </span>
              {product.isBestseller && <span className="text-label-sm text-secondary">Best seller</span>}
            </div>
            <Swatches variants={product.variants} selected={variant} onSelect={(v) => { setVariant(v); setQty(1); }} withNames />
          </div>

          {product.materials?.length > 0 && (
            <div className="flex flex-wrap gap-space-xs">
              {product.materials.map((m) => (
                <span key={m} className="px-2.5 py-1.5 rounded-lg bg-surface-container-low text-label-md flex items-center gap-1.5">
                  <Icon name="texture" className="text-[16px] text-secondary" /> {m}
                </span>
              ))}
            </div>
          )}

          {/* Dedicated Stock Management & Live Notification Urgency Div */}
          <StockShowcaseBox variant={variant} />

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-label-lg">Select Quantity</span>
            <QuantityStepper value={qty} onChange={setQty} max={max} disabled={soldOut} />
          </div>

          <div ref={ctaRef} className="flex flex-col gap-space-sm pt-space-xs">
            <div className="flex items-center gap-space-sm">
              <Button variant="primary" icon="shopping_bag" className="flex-1 h-12" disabled={soldOut} loading={add.isPending && !add.variables?.silent} onClick={() => addToBag()}>
                {soldOut ? 'Sold out' : `Add to Bag — ${money(product.finalPrice * qty)}`}
              </Button>
              <WishlistButton product={product} className="w-12 h-12 rounded-lg border border-surface-container-high" />
              <button
                type="button"
                onClick={() => shareProduct(product)}
                aria-label="Share this product"
                title="Share product with friends"
                className="w-12 h-12 rounded-lg border border-surface-container-high flex items-center justify-center text-on-surface hover:text-secondary hover:bg-surface-container transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
              >
                <Icon name="share" className="text-[20px]" />
              </button>
            </div>
            {soldOut ? (
              <Button
                type="button"
                variant="tonal"
                icon="notifications_active"
                className="w-full h-12 border border-secondary/40 text-secondary font-bold"
                onClick={() => setShowBackInStock(true)}
              >
                Notify Me When Back in Stock
              </Button>
            ) : (
              <Button variant="secondary" icon="bolt" className="w-full h-12" onClick={() => addToBag(() => navigate('/checkout'))}>
                Buy now
              </Button>
            )}
          </div>

          <DeliveryEstimator product={product} />

          <div className="grid grid-cols-3 gap-space-xs text-center text-label-sm font-normal text-on-surface-variant">
            {[
              ['local_shipping', 'Tracked Delivery', '/shipping-policy'],
              ['published_with_changes', '7-Day Returns', '/return-policy'],
              ['lock', 'Secure Checkout', '/privacy-policy'],
            ].map(([icon, label, to]) => (
              <Link key={label} to={to} className="p-2 rounded-lg bg-surface-container-lowest shadow-card flex flex-col items-center gap-1 hover:text-secondary">
                <Icon name={icon} className="text-[20px] text-secondary" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-surface-container-lowest py-8 my-4">
        <div className="container-x">
          <div className="flex flex-col gap-space-xs max-w-3xl mb-space-lg">
            
            <h2 className="text-headline-md">Product details</h2>
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
                <span className="text-headline-sm">Materials</span>
                <Icon name="texture" className="text-secondary" />
              </div>
              <ul className="flex flex-col gap-2">
                {product.materials.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-body-sm"><Icon name="check_circle" className="text-[18px] text-secondary" /> {m}</li>
                ))}
              </ul>
            </div>
            <div className="p-space-lg rounded-2xl bg-ink text-on-ink flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="text-headline-sm">Returns & exchange</span>
                <Icon name="published_with_changes" className="text-secondary-fixed" />
              </div>
              <p className="text-body-sm text-on-ink/75">Defective, damaged, wrong or not as described? Raise a return within 7 days of delivery. One exchange per order, subject to availability. For damage claims, record an unboxing video and tell us within 24 hours.</p>
              <Link to="/return-policy" className="mt-auto btn bg-white/10 hover:bg-white/20 text-on-ink w-fit">Return, refund & exchange policy</Link>
            </div>
          </div>
        </div>
      </section>

      <Reviews product={product} breakdown={data.ratingBreakdown} />
      <Faq faqs={product.faqs} />

      {data.related?.[0] && (
        <FrequentlyBoughtTogether
          product={product}
          companion={data.related[0]}
          onAddBundle={addBundle}
          isPending={add.isPending}
        />
      )}

      {data.related?.length > 0 && (
        <section className="w-full py-6">
          <div className="container-x flex flex-col gap-space-lg">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-headline-md">You may also like</h3>
              </div>
              <Link to={`/shop/${product.category?.slug || ''}`} className="text-label-md text-secondary hover:underline flex items-center gap-1 shrink-0">
                Explore all <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {data.related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewedSection currentId={product._id} />

      <p className="sr-only">Last updated {formatDate(product.updatedAt)}</p>

      {/* Spacer to prevent mobile/tablet sticky buy bar from covering page/footer content */}
      <div className="h-16 lg:hidden" aria-hidden="true" />

      {/* Mobile: Flipkart-style sticky dual action bar */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-surface-container-lowest border-t border-surface-container-high px-3 py-2 pb-safe flex items-center gap-2"
      >
        <Link to="/" aria-label="Go to home" className="w-11 h-11 rounded-lg shrink-0 border border-surface-container-high flex flex-col items-center justify-center text-on-surface-variant">
          <Icon name="home" className="text-[20px]" />
          <span className="text-[9px] font-semibold leading-none">Home</span>
        </Link>
        <WishlistButton product={product} className="w-11 h-11 rounded-lg shrink-0 border border-surface-container-high" />
        <Button
          variant="tonal"
          className="flex-1 h-11 px-2 whitespace-nowrap text-xs min-[380px]:text-label-md font-semibold bg-surface-container-low hover:bg-surface-container text-on-surface"
          disabled={soldOut}
          loading={add.isPending && !add.variables?.silent}
          onClick={() => addToBag()}
        >
          {soldOut ? 'Sold out' : 'Add to Bag'}
        </Button>
        {soldOut ? (
          <Button
            variant="tonal"
            icon="notifications_active"
            className="flex-1 h-11 text-xs min-[380px]:text-label-md font-semibold border border-secondary/40 text-secondary"
            onClick={() => setShowBackInStock(true)}
          >
            Notify Me
          </Button>
        ) : (
          <Button
            variant="primary"
            icon="bolt"
            className="flex-1 h-11 text-xs min-[380px]:text-label-md font-semibold"
            disabled={soldOut}
            onClick={() => addToBag(() => navigate('/checkout'))}
          >
            Buy Now
          </Button>
        )}
      </div>

      <BackInStockModal
        open={showBackInStock}
        onClose={() => setShowBackInStock(false)}
        product={product}
        variant={variant}
      />
    </>
  );
}
