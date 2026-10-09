import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, discountPercent, productImage } from '../lib/format';
import { productTone } from '../lib/categoryTone';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { useMoney } from '../hooks/useStore';
import { closeQuickView } from '../store';
import { Button, Icon, Img, Modal, QuantityStepper, Skeleton, Stars } from './ui';

export const firstAvailable = (p) => p.variants?.find((v) => v.stock > 0) || p.variants?.[0];

export function Swatches({ variants, selected, onSelect, size = 'sm', withNames = false }) {
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-10 h-10';
  if (withNames) {
    // Big, labelled colour buttons: easy to tap and no need to guess colour names.
    return (
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
        {variants.map((v) => {
          const on = selected?._id === v._id;
          const out = v.stock <= 0;
          return (
            <button
              key={v._id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(v)}
              className={cn(
                'flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full border text-label-md transition-colors',
                on ? 'border-on-surface bg-surface-container' : 'border-surface-container-high hover:border-outline',
                out && 'opacity-50'
              )}
            >
              <span className="relative w-6 h-6 rounded-full ring-1 ring-black/10" style={{ backgroundColor: v.colorHex }}>
                {on && <Icon name="check" className="absolute inset-0 m-auto text-[14px] text-white mix-blend-difference" />}
              </span>
              {v.name}
              {out && <span className="text-label-sm text-error">Sold out</span>}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className={cn('flex items-center flex-wrap', size === 'sm' ? 'gap-2.5' : 'gap-3')} role="radiogroup" aria-label="Colour">
      {variants.map((v) => (
        <button
          key={v._id}
          type="button"
          role="radio"
          aria-checked={selected?._id === v._id}
          aria-label={`${v.name}${v.stock <= 0 ? ' (sold out)' : ''}`}
          title={v.name}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(v);
          }}
          className={cn(
            // The ::after pseudo-element enlarges the tap target without changing the visual size.
            "relative rounded-full transition-transform ring-1 ring-black/10 after:absolute after:-inset-2 after:content-['']",
            dim,
            selected?._id === v._id ? 'ring-2 ring-offset-2 ring-on-surface ring-offset-surface-container-lowest' : 'hover:scale-110',
            v.stock <= 0 && 'opacity-40'
          )}
          style={{ backgroundColor: v.colorHex }}
        >
          {v.stock <= 0 && size !== 'sm' && <span className="absolute inset-0 flex items-center justify-center"><span className="w-full h-px bg-white rotate-45" /></span>}
        </button>
      ))}
    </div>
  );
}

export function Price({ product, className, size = 'md' }) {
  const money = useMoney();
  const pct = discountPercent(product);
  return (
    <div className={cn('flex items-baseline gap-2 flex-wrap', className)}>
      <span className={size === 'xl' ? 'text-price-xl' : 'text-price-md'}>{money(product.finalPrice ?? product.price)}</span>
      {pct > 0 && (
        <>
          <span className="text-body-sm line-through text-outline">{money(product.price)}</span>
          <span className="text-label-md text-success">{pct}% off</span>
        </>
      )}
    </div>
  );
}

export function WishlistButton({ product, className }) {
  const { has, toggle } = useWishlist();
  const saved = has(product._id);
  return (
    <button
      type="button"
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      aria-pressed={saved}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate(product);
      }}
      className={cn(
        // Callers may pass their own size (cn doesn't merge conflicting classes, so only add the default when none is given).
        !/\bw-\d/.test(className || '') && 'w-8 h-8 rounded-full',
        'bg-surface-container-lowest/90 flex items-center justify-center shadow-card transition-transform active:scale-90',
        saved ? 'text-error' : 'text-outline hover:text-error',
        className
      )}
    >
      <Icon name="favorite" fill={saved} className="text-[13px] sm:text-[17px]" />
    </button>
  );
}

// Badge colours by label; anything else (admin-set badges) gets indigo.
const BADGE_TONES = { Bestseller: 'from-rose-600 to-pink-500', New: 'from-violet-600 to-fuchsia-500', Sale: 'from-emerald-600 to-teal-500' };

/** Compact listing card: image, name, rating, price. Tap anywhere to open the product. */
export function ProductCard({ product, priority }) {
  const money = useMoney();
  const { add } = useCart();
  const qc = useQueryClient();
  // Brief tick + pop on the bag button after adding, so the tap feels rewarding.
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return undefined;
    const t = setTimeout(() => setAdded(false), 1400);
    return () => clearTimeout(t);
  }, [added]);
  const variant = firstAvailable(product);
  // Warm the product page data on hover/focus so navigation feels instant (not on touch: that fires while scrolling).
  const prefetch = () => qc.prefetchQuery({ queryKey: ['product', product.slug], queryFn: () => api.product(product.slug), staleTime: 60 * 1000 });
  const soldOut = !variant || variant.stock <= 0;
  const pct = discountPercent(product);
  const badge = product.badge || (product.isBestseller ? 'Bestseller' : product.isNewArrival ? 'New' : '');
  const colours = product.variants?.length || 0;
  const tone = productTone(product);
  const kind = product.subcategory?.name || product.category?.name;

  return (
    <article
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className="surface-card cv-auto group relative flex flex-col h-full bg-surface-container-lowest rounded-2xl overflow-hidden"
    >
      <div className="relative">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-surface-container-low" aria-label={product.name}>
        <Img
          src={productImage(product, variant)}
          alt={product.name}
          w={480}
          className="absolute inset-0"
          imgClassName="md:group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          loading={priority ? 'eager' : 'lazy'}
        />
        <span className="absolute top-2 left-2 md:top-3 md:left-3 flex flex-col items-start gap-1">
          {badge && (
            <span className={cn('px-1.5 py-1 md:px-2 rounded-full bg-gradient-to-r text-white text-[10px] md:text-[11px] font-bold leading-none tracking-wide shadow-sm', BADGE_TONES[badge] || 'from-indigo-600 to-sky-500')}>
              {badge}
            </span>
          )}
          {pct > 0 && !soldOut && (
            <span className="px-1.5 py-0.5 md:px-2 md:py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-[9px] md:text-[11px] font-bold leading-none shadow-sm">−{pct}%</span>
          )}
        </span>
        {!soldOut && variant.stock <= 5 && (
          <span className="absolute inset-x-0 bottom-0 py-0.5 md:py-1 bg-gradient-to-r from-rose-600/90 to-pink-500/90 text-white text-[9px] md:text-[11px] font-bold text-center">
            Only {variant.stock} left
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 py-0.5 md:py-1 bg-on-surface/70 text-surface-container-lowest text-[10px] md:text-[11px] font-semibold text-center">Out of stock</span>
        )}
      </Link>
      </div>
      <WishlistButton product={product} className="absolute top-1 right-1 w-6 h-6 sm:w-8 sm:h-8" />

      <div className="flex flex-col gap-0.5 sm:gap-1 md:gap-1.5 p-1 sm:p-2.5 md:p-4 flex-1">
        {kind && (
          <span className={cn('inline-flex items-center gap-1 self-start max-w-full px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full text-[7.5px] sm:text-[9.5px] md:text-[11px] font-bold uppercase tracking-wide leading-none', tone.tint, tone.text)}>
            <span className={cn('w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0', tone.dot)} />
            <span className="truncate">{kind}</span>
          </span>
        )}
        <Link to={`/product/${product.slug}`} className="text-[10px] leading-[13px] sm:text-[13px] sm:leading-[18px] md:text-[16px] md:leading-[22px] text-on-surface line-clamp-2 min-h-[26px] sm:min-h-[36px] md:min-h-[44px] hover:text-secondary font-medium">
          {product.name}
        </Link>
        <div className="flex items-center gap-1 min-h-[15px] sm:min-h-[16px]">
          {product.ratingCount > 0 ? (
            <>
              <span className="inline-flex items-center gap-0.5 px-1 md:px-1.5 h-[14px] sm:h-[17px] md:h-5 rounded bg-emerald-700 text-white text-[8px] sm:text-[10px] md:text-[12px] font-bold leading-none">
                {product.ratingAverage.toFixed(1)}
                <Icon name="star" fill className="text-[7.5px] sm:text-[10px]" />
              </span>
              <span className="text-[8px] sm:text-[11px] md:text-[12px] text-outline">({product.ratingCount})</span>
            </>
          ) : null}
          {(product.ratingAverage >= 4 || product.isBestseller) && (
            <span className="inline-flex items-center text-[7.5px] sm:text-[9px] font-black text-amber-600 dark:text-amber-400 tracking-tight ml-auto sm:ml-0">
              ⚡Assured
            </span>
          )}
          {colours > 1 && <span className="ml-auto hidden sm:inline text-[11px] md:text-[12px] text-outline">{colours} colours</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-1 pt-0.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-1.5 min-w-0">
            <span className="text-[11px] sm:text-[14px] md:text-[19px] font-bold text-on-surface whitespace-nowrap">{money(product.finalPrice ?? product.price)}</span>
            {pct > 0 && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-[8px] sm:text-[11px] md:text-[13px] text-outline line-through whitespace-nowrap">{money(product.price)}</span>
                <span className="text-[8px] sm:text-[11px] md:text-[13px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{pct}% off</span>
              </div>
            )}
            <span className="text-[7.5px] sm:text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 block -mt-0.5">
              Free Delivery
            </span>
          </div>
          <button
            type="button"
            disabled={soldOut || add.isPending}
            onClick={() => add.mutate({ productId: product._id, variantId: variant._id, quantity: 1 }, { onSuccess: () => setAdded(true) })}
            aria-label={`Add ${product.name} to bag`}
            className={cn(
              'shrink-0 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full text-white flex items-center justify-center shadow-xs transition-all hover:shadow-md hover:scale-105 active:scale-90 disabled:opacity-30 disabled:pointer-events-none bg-gradient-to-br',
              added ? 'from-emerald-500 to-teal-500 animate-pop' : 'from-indigo-600 to-violet-500'
            )}
          >
            <Icon name={added ? 'check' : 'add'} className="text-[13px] sm:text-[17px]" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl sm:rounded-2xl overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-1.5 sm:p-2.5 flex flex-col gap-1 sm:gap-1.5">
        <Skeleton className="h-3 sm:h-3.5 w-11/12" />
        <Skeleton className="h-3 sm:h-3.5 w-2/3" />
        <Skeleton className="h-2.5 sm:h-3 w-1/3" />
        <Skeleton className="h-3.5 sm:h-4 w-1/2 mt-1" />
      </div>
    </div>
  );
}

/** Responsive product grid: 3 columns on mobile, 3 on tablets/laptops, 4 on desktop/office monitors. */
export const GRID_COLS = 'grid grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2.5 md:gap-3.5';

export function ProductGrid({ products, loading, count = 8, className }) {
  return (
    <div className={cn(GRID_COLS, className)}>
      {loading
        ? Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)
        : products.map((p, i) => <ProductCard key={p._id} product={p} priority={i < 4} />)}
    </div>
  );
}

export function QuickViewModal() {
  const slug = useSelector((s) => s.ui.quickView);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { add } = useCart();
  const { data, isLoading } = useQuery({ queryKey: ['product', slug], queryFn: () => api.product(slug), enabled: Boolean(slug) });
  const product = data?.product;
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) {
      setVariant(firstAvailable(product));
      setQty(1);
    }
  }, [product]);

  const close = () => dispatch(closeQuickView());
  const max = Math.max(1, Math.min(99, variant?.stock || 1));

  return (
    <Modal open={Boolean(slug)} onClose={close} size="lg" hideClose>
      {isLoading || !product || !variant ? (
        <div className="grid md:grid-cols-2 gap-gutter">
          <Skeleton className="aspect-square" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-7 w-1/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col md:flex-row gap-gutter">
          <button type="button" aria-label="Close" onClick={close} className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high">
            <Icon name="close" className="text-[18px]" />
          </button>
          <Img src={productImage(product, variant)} alt={product.name} className="w-full md:w-1/2 aspect-square rounded-xl" />
          <div className="w-full md:w-1/2 flex flex-col justify-between gap-space-md">
            <div className="flex flex-col gap-2">
              <span className="text-label-sm text-outline uppercase">{product.tagline}</span>
              <h3 className="text-headline-lg">{product.name}</h3>
              {product.ratingCount > 0 && (
                <div className="flex items-center gap-2 text-label-md">
                  <Stars value={product.ratingAverage} />
                  {product.ratingAverage.toFixed(1)} ({product.ratingCount} reviews)
                </div>
              )}
              <Price product={product} size="xl" />
              <p className="text-body-sm text-on-surface-variant mt-1">{product.shortDescription}</p>
              <div className="flex flex-col gap-2 mt-3">
                <span className="text-label-sm text-outline uppercase">Colour: <span className="text-on-surface normal-case">{variant.name}</span></span>
                <Swatches variants={product.variants} selected={variant} onSelect={setVariant} size="md" />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <QuantityStepper value={qty} onChange={setQty} max={max} disabled={variant.stock <= 0} />
                <span className={cn('text-label-md', variant.stock > 0 ? 'text-secondary' : 'text-error')}>
                  {variant.stock > 5 ? 'In stock' : variant.stock > 0 ? `Only ${variant.stock} left` : 'Sold out'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                icon="shopping_bag"
                className="w-full h-11"
                disabled={variant.stock <= 0}
                loading={add.isPending}
                onClick={() => add.mutate({ productId: product._id, variantId: variant._id, quantity: qty }, { onSuccess: close })}
              >
                Add to Bag
              </Button>
              <Button
                variant="tonal"
                className="w-full"
                iconRight="arrow_forward"
                onClick={() => {
                  close();
                  navigate(`/product/${product.slug}`);
                }}
              >
                View full details
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function useProductsByIds(ids) {
  const key = useMemo(() => ids.join(','), [ids]);
  return useQuery({
    queryKey: ['products-by-ids', key],
    queryFn: () => api.productsByIds(ids),
    enabled: ids.length > 0,
    select: (d) => ids.map((id) => d.products.find((p) => p._id === id)).filter(Boolean),
  });
}
