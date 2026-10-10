import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCartOpen } from '../../store';
import { useCart } from '../../hooks/useCart';
import { useMoney } from '../../hooks/useStore';
import { Button, Drawer, EmptyState, Icon, Img, QuantityStepper, Skeleton } from '../ui';

export function FreeShippingMeter({ summary }) {
  const money = useMoney();
  if (!summary || !summary.freeShippingThreshold) return null;
  const pct = Math.min(100, ((summary.subtotal - summary.discount) / summary.freeShippingThreshold) * 100);
  const unlocked = summary.amountToFreeShipping <= 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-label-sm">
        <span className="font-semibold">{unlocked ? 'Free shipping unlocked' :`Add ${money(summary.amountToFreeShipping)} for free shipping`}</span>
        <span className={unlocked ? 'text-secondary' : 'text-outline'}>{unlocked ? 'UNLOCKED' : `${Math.round(pct)}%`}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
        <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartLine({ line, compact }) {
  const { updateQty, remove } = useCart();
  const money = useMoney();
  const dispatch = useDispatch();
  return (
    <div className="flex gap-3 bg-surface-container-low p-space-sm rounded-xl">
      <Link to={line.slug ? `/product/${line.slug}` : '#'} onClick={() => dispatch(setCartOpen(false))} className="shrink-0">
        <Img src={line.image} alt={line.name || 'Unavailable item'} className={compact ? 'w-16 h-16 rounded-lg' : 'w-20 h-20 rounded-lg'} />
      </Link>
      <div className="flex flex-col flex-1 min-w-0 justify-between gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-label-lg truncate">{line.name || 'Item unavailable'}</p>
            {line.variant && (
              <p className="text-label-sm font-normal text-outline flex items-center gap-1.5 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: line.variant.colorHex }} /> {line.variant.name}
              </p>
            )}
          </div>
          <span className="text-label-lg shrink-0">{money(line.lineTotal)}</span>
        </div>
        {line.available && !line.issue && line.stock != null && line.stock <= 20 && (
          <p className={cn("text-[11px] font-semibold flex items-center gap-1", line.stock <= 5 ? "text-rose-600 dark:text-rose-400" : line.stock <= 10 ? "text-amber-600 dark:text-amber-400" : "text-amber-700 dark:text-amber-300")}>
            <Icon name="bolt" className="text-[13px]" />
            {line.stock <= 5 ? `Hurry, only ${line.stock} left in stock!` : line.stock <= 10 ? `Only ${line.stock} remaining` : `Low stock: ${line.stock} left`}
          </p>
        )}
        {line.issue && <p className="text-label-md text-error flex items-center gap-1"><Icon name="error" className="text-[14px]" /> {line.issue}</p>}
        <div className="flex items-center justify-between">
          {line.available ? (
            <QuantityStepper size="sm" value={line.quantity} max={line.maxQuantity || 99} onChange={(quantity) => updateQty.mutate({ id: line._id, quantity })} disabled={updateQty.isPending} />
          ) : (
            <span />
          )}
          <button type="button" onClick={() => remove.mutate(line._id)} className="text-label-md text-error hover:underline">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const open = useSelector((s) => s.ui.cartOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, summary, count, isLoading, hasIssues } = useCart();
  const money = useMoney();
  const close = () => dispatch(setCartOpen(false));
  const goto = (to) => {
    close();
    navigate(to);
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title={
        <>
          <Icon name="shopping_bag" className="text-secondary text-[20px]" />
          Your Gear Bag
          {count > 0 && <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-label-sm">{count}</span>}
        </>
      }
      footer={
        items.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface-variant">Subtotal</span>
              <span className="text-price-xl">{money(summary?.subtotal)}</span>
            </div>
            <p className="text-label-sm font-normal text-outline">
              {summary?.taxIncluded ? `Prices include ${summary.taxLabel}. ` : ''}Shipping and coupons calculated at checkout.
            </p>
            <Button className="w-full h-12" disabled={hasIssues} onClick={() => goto('/checkout')} iconRight="arrow_forward">
              Proceed to Secure Checkout
            </Button>
            <Button variant="tonal" className="w-full" onClick={() => goto('/cart')}>
              View full bag
            </Button>
          </div>
        )
      }
    >
      {summary && items.length > 0 && (
        <div className="px-space-lg py-3 bg-surface-container-low/60">
          <FreeShippingMeter summary={summary} />
        </div>
      )}
      <div className="p-space-lg flex flex-col gap-space-md">
        {isLoading ? (
          [1, 2].map((i) => <Skeleton key={i} className="h-24" />)
        ) : items.length === 0 ? (
          <EmptyState
            icon="shopping_bag"
            title="Your bag is empty"
            description="Engineered carry for every journey is one click away."
            action={<Button onClick={() => goto('/shop')} iconRight="arrow_forward">Shop the collection</Button>}
          />
        ) : (
          items.map((line) => <CartLine key={line._id} line={line} compact />)
        )}
      </div>
    </Drawer>
  );
}
