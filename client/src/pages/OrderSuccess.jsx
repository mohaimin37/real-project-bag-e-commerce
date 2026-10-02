import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateTime, PAYMENT_LABELS } from '../lib/format';
import { countryName } from '../lib/countries';
import { useMoney } from '../hooks/useStore';
import { ErrorState, Icon, Img, PageLoader, StatusBadge } from '../components/ui';
import Seo from '../components/Seo';

export default function OrderSuccess() {
  const { id } = useParams();
  const money = useMoney();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['order', id], queryFn: () => api.myOrder(id), select: (d) => d.order });
  if (isLoading) return <PageLoader />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const o = data;
  const a = o.shippingAddress;
  return (
    <div className="container-x py-space-xl max-w-4xl">
      <Seo title="Order Confirmed" noindex />
      <div className="flex flex-col items-center text-center gap-space-sm mb-space-xl">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-secondary/30 animate-ping" />
          <span className="relative w-20 h-20 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-lift">
            <Icon name="check" className="text-[40px]" />
          </span>
        </div>
        <span className="eyebrow mt-space-md">Order confirmed</span>
        <h1 className="text-headline-xl-mobile md:text-headline-xl">Thank you, {o.customerName.split(' ')[0]}.</h1>
        <p className="text-body-md text-on-surface-variant max-w-lg">
          Your order <strong className="text-on-surface">{o.orderId}</strong> has been received. We've sent the details to {o.email} and our team will confirm it shortly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-lg">
        {[
          ['receipt_long', 'Order', o.orderId, formatDateTime(o.createdAt)],
          ['payments', 'Payment', PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod, `Status: ${o.paymentStatus}`],
          ['local_shipping', 'Delivery', o.shippingMethod?.label, o.shippingMethod?.eta],
        ].map(([icon, k, v, sub]) => (
          <div key={k} className="card p-space-md flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0"><Icon name={icon} /></span>
            <div className="min-w-0">
              <p className="text-label-sm uppercase tracking-wider text-outline">{k}</p>
              <p className="text-label-lg truncate">{v}</p>
              <p className="text-label-sm font-normal text-on-surface-variant">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-space-lg grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm">Items</h2>
            <StatusBadge status={o.orderStatus} />
          </div>
          {o.items.map((it) => (
            <div key={`${it.productId}-${it.variant?.id}`} className="flex gap-3 items-center">
              <Img src={it.image} alt="" className="w-14 h-14 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-label-lg truncate">{it.productName}</p>
                <p className="text-label-sm font-normal text-outline">{it.variant?.name} · Qty {it.quantity}</p>
              </div>
              <span className="text-label-lg">{money(it.totalPrice)}</span>
            </div>
          ))}
          <div className="h-px bg-surface-container-high my-1" />
          <div className="flex flex-col gap-1 text-body-sm">
            <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span>{money(o.subtotal)}</span></div>
            {o.discount > 0 && <div className="flex justify-between text-secondary"><span>Discount {o.coupon?.code && `(${o.coupon.code})`}</span><span>−{money(o.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-on-surface-variant">Shipping</span><span>{o.shipping ? money(o.shipping) : 'Free'}</span></div>
            <div className="flex justify-between"><span className="text-on-surface-variant">Tax</span><span>{money(o.tax)}</span></div>
            <div className="flex justify-between text-headline-sm pt-1"><span>Total</span><span>{money(o.grandTotal)}</span></div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-headline-sm">Delivering to</h2>
          <p className="text-body-sm text-on-surface-variant flex flex-col">
            <span className="text-on-surface font-semibold">{a.fullName}</span>
            <span>{a.addressLine1}{a.addressLine2 && `, ${a.addressLine2}`}</span>
            {a.landmark && <span>Landmark: {a.landmark}</span>}
            <span>{a.city}, {a.state} {a.postalCode}</span>
            <span>{countryName(a.country)}</span>
            <span className="mt-1">{a.phone}</span>
          </p>
          <div className="mt-auto pt-space-md flex flex-col sm:flex-row gap-space-sm">
            <Link to={`/account/orders/${o.orderId}`} className="btn-primary flex-1">Track order</Link>
            <Link to="/shop" className="btn-tonal flex-1">Continue shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
