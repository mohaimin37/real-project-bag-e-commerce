import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn, discountPercent, productImage } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { useMoney } from '../hooks/useStore';
import { closeQuickView, openQuickView } from '../store';
import { Badge, Button, Icon, Img, Modal, QuantityStepper, Skeleton, Stars } from './ui';

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
                'flex items-center gap-2 h-11 pl-1.5 pr-3.5 rounded-full border-2 text-label-md transition-all',
                on ? 'border-secondary bg-secondary/10' : 'border-surface-container-high hover:border-outline',
                out && 'opacity-50'
              )}
            >
              <span className="relative w-7 h-7 rounded-full shadow-inner ring-1 ring-black/10" style={{ backgroundColor: v.colorHex }}>
                {on && <Icon name="check" className="absolute inset-0 m-auto text-[16px] text-white mix-blend-difference" />}
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
            "relative rounded-full transition-all shadow-sm after:absolute after:-inset-2 after:content-['']",
            dim,
            selected?._id === v._id ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface-container-lowest scale-110' : 'hover:scale-110',
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
          <span className="text-label-md text-secondary">Save {pct}%</span>
        </>
      )}
    </div>
  );
}

/** Two fixed lines (price, then "was ₹x · save y%" or blank) so cards line up in a grid. */
function CardPrice({ product }) {
  const money = useMoney();
  const pct = discountPercent(product);
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-price-md whitespace-nowrap">{money(product.finalPrice ?? product.price)}</span>
      <span className="text-label-sm font-normal min-h-[16px] whitespace-nowrap truncate">
        {pct > 0 ? (
          <>
            <span className="line-through text-outline">{money(product.price)}</span> <span className="text-secondary font-semibold">Save {pct}%</span>
          </>
        ) : (
          ' '
        )}
      </span>
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
        'w-9 h-9 rounded-full bg-surface-container-lowest/85 backdrop-blur-md flex items-center justify-center shadow-sm transition-all hover:scale-110',
        saved ? 'text-error' : 'text-on-surface hover:text-error',
        className
      )}
    >
      <Icon name="favorite" fill={saved} className="text-[19px]" />
    </button>
  );
}

export function ProductCard({ product, priority }) {
  const [variant, setVariant] = useState(() => firstAvailable(product));
  const { add } = useCart();
  const dispatch = useDispatch();
  const qc = useQueryClient();
  // Warm the product page data on hover/touch so navigation feels instant.
  const prefetch = () => qc.prefetchQuery({ queryKey: ['product', product.slug], queryFn: () => api.product(product.slug), staleTime: 60 * 1000 });
  const image = productImage(product, variant);
  const hover = product.images?.[1]?.url;
  const soldOut = !variant || variant.stock <= 0;
  const lowStock = variant && variant.stock > 0 && variant.stock <= 5;
  const badges = [product.badge || (product.isBestseller ? 'Bestseller' : product.isNewArrival ? 'New Arrival' : '')].filter(Boolean);

  return (
    <article onMouseEnter={prefetch} onTouchStart={prefetch} onFocus={prefetch} className="group h-full flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-card hover:shadow-lift md:hover:-translate-y-1 transition-all duration-300">
      <Link to={`/product/${product.slug}`} className="relative block w-full aspect-square overflow-hidden bg-surface-container-low">
        <Img src={image} alt={product.name} className="absolute inset-0" imgClassName="group-hover:scale-105 transition-transform duration-500" loading={priority ? 'eager' : 'lazy'} />
        {hover && !variant?.images?.length && (
          <Img src={hover} alt="" className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          {badges.map((b) => (
            <Badge key={b} tone={b === 'Bestseller' ? 'dark' : b === 'New Arrival' ? 'teal' : 'neutral'}>
              {b}
            </Badge>
          ))}
          {discountPercent(product) > 0 && <Badge tone="mint">-{discountPercent(product)}%</Badge>}
        </div>
        <WishlistButton product={product} className="absolute top-3 right-3 z-10" />
        <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-between z-10">
          <span className="text-white text-label-md">{product.capacity ? `Vol: ${product.capacity}` : product.tagline}</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              dispatch(openQuickView(product.slug));
            }}
            className="px-2.5 py-1 rounded bg-surface-container-lowest text-on-surface text-label-md hover:bg-surface flex items-center gap-1"
          >
            <Icon name="visibility" className="text-[14px]" /> Quick View
          </button>
        </div>
        {soldOut && (
          <div className="absolute inset-0 bg-surface-container-lowest/50 flex items-center justify-center z-[5]">
            <span className="px-3 py-1 rounded bg-primary text-on-primary text-label-md">Sold out</span>
          </div>
        )}
      </Link>
      <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between text-label-sm">
            <span className="text-outline uppercase truncate">{product.tagline}</span>
            {product.ratingCount > 0 && (
              <span className="flex items-center gap-1 text-on-surface shrink-0">
                <Icon name="star" fill className="text-[14px] text-on-tertiary-container" />
                {product.ratingAverage.toFixed(1)}
                <span className="text-outline font-normal">({product.ratingCount})</span>
              </span>
            )}
          </div>
          {/* Fixed-height rows below keep every card the same size, whatever the content. */}
          <Link to={`/product/${product.slug}`} className="text-headline-sm text-on-surface hover:text-secondary transition-colors line-clamp-2 min-h-[56px]">
            {product.name}
          </Link>
          <div className="flex items-center justify-between gap-2 min-h-[28px]">
            {product.variants?.length > 0 && <Swatches variants={product.variants} selected={variant} onSelect={setVariant} />}
            {lowStock && <span className="text-label-sm text-on-tertiary-container whitespace-nowrap">Only {variant.stock} left</span>}
          </div>
        </div>
        <div className="pt-space-xs flex items-end justify-between gap-2">
          <CardPrice product={product} />
          <button
            type="button"
            disabled={soldOut || add.isPending}
            onClick={() => add.mutate({ productId: product._id, variantId: variant._id, quantity: 1 })}
            className="shrink-0 px-3.5 py-2 rounded-lg bg-primary text-on-primary text-label-md hover:bg-secondary disabled:opacity-40 disabled:hover:bg-primary transition-colors flex items-center gap-1"
            aria-label={`Add ${product.name} (${variant?.name}) to bag`}
          >
            <Icon name="shopping_bag" className="text-[16px]" /> Add
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-space-md flex flex-col gap-space-sm">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading, count = 8, className }) {
  return (
    <div className={cn('grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter-sm md:gap-gutter', className)}>
      {loading ? Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />) : products.map((p, i) => <ProductCard key={p._id} product={p} priority={i < 4} />)}
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
              <span className="eyebrow">WILDTANE {product.tagline}</span>
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
                <span className="text-label-sm text-outline uppercase">Colourway: <span className="text-on-surface normal-case">{variant.name}</span></span>
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
                variant="secondary"
                icon="shopping_bag"
                className="w-full h-12"
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
              <p className="flex items-center justify-center gap-1 text-label-sm text-outline">
                <Icon name="lock" className="text-[14px]" /> Secure encrypted checkout
              </p>
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
