import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn, formatDateTime, imgUrl } from '../lib/format';
import { Button, ErrorState, Field, Icon, Img, Input, Skeleton } from '../components/ui';
import OrderTimeline from '../components/OrderTimeline';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Seo from '../components/Seo';

export default function TrackOrder() {
  const [params, setParams] = useSearchParams();
  const initialOrderId = params.get('orderId') || '';
  const initialVerify = params.get('verify') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [verify, setVerify] = useState(initialVerify);
  const [orderData, setOrderData] = useState(null);

  const trackMutation = useMutation({
    mutationFn: (body) => api.trackOrderPublic(body),
    onSuccess: (res) => {
      if (res?.order) {
        setOrderData(res.order);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Could not find order. Please verify order ID and contact details.');
    },
  });

  useEffect(() => {
    if (initialOrderId && initialVerify) {
      trackMutation.mutate({ orderId: initialOrderId, verify: initialVerify });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanId = orderId.trim().toUpperCase();
    const cleanVerify = verify.trim();
    if (!cleanId) {
      toast.error('Please enter an Order ID');
      return;
    }
    if (!cleanVerify) {
      toast.error('Please enter the registered phone or email');
      return;
    }
    setParams({ orderId: cleanId, verify: cleanVerify });
    trackMutation.mutate({ orderId: cleanId, verify: cleanVerify });
  };

  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Help', to: '/help' },
    { label: 'Track Order' },
  ];

  return (
    <div className="container-x py-space-lg max-w-4xl min-h-[70vh]">
      <Seo
        title="Track Order — WILDTANE"
        description="Real-time shipment tracking for your WILDTANE carry order. Check delivery dates, courier details and fulfillment status."
        canonical="/track"
      />
      <Breadcrumbs items={crumbs} className="mb-4" />

      <div className="text-center max-w-xl mx-auto mb-space-xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary mb-2">
          <Icon name="local_shipping" className="text-[16px]" /> Live Shipment Radar
        </span>
        <h1 className="text-display-sm font-black text-on-surface">Track Your Order</h1>
        <p className="text-body-md text-on-surface-variant mt-1.5">
          Enter your order reference ID and registered phone number or email to see live shipment milestones.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="card p-5 sm:p-7 max-w-2xl mx-auto mb-space-xl shadow-md border border-outline-variant/30 bg-surface-container-lowest">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Field label="Order ID" hint="e.g. WT26-000162">
              <Input
                placeholder="WT26-XXXXXX"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                autoCapitalize="characters"
                required
              />
            </Field>
          </div>
          <div className="flex-1 w-full">
            <Field label="Phone or Email" hint="As placed during checkout">
              <Input
                placeholder="9876543210 or name@domain.com"
                value={verify}
                onChange={(e) => setVerify(e.target.value)}
                required
              />
            </Field>
          </div>
          <Button
            type="submit"
            variant="primary"
            icon="search"
            loading={trackMutation.isPending}
            className="w-full sm:w-auto h-11 px-6 font-bold"
          >
            Track
          </Button>
        </form>
      </div>

      {/* Loading State */}
      {trackMutation.isPending && (
        <div className="card p-6 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {/* Error State */}
      {trackMutation.isError && (
        <div className="max-w-2xl mx-auto mb-8">
          <ErrorState
            error={trackMutation.error}
            onRetry={() => trackMutation.mutate({ orderId, verify })}
          />
        </div>
      )}

      {/* Tracking Result View */}
      {orderData && (
        <div className="card p-6 sm:p-8 max-w-2xl mx-auto shadow-lg border border-outline-variant/40 bg-surface-container-lowest space-y-6 animate-fade-in">
          {/* Header Summary Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-surface-container-high">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-headline-sm font-black text-on-surface">Order #{orderData.orderId}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-secondary/15 text-secondary">
                  {orderData.orderStatus}
                </span>
              </div>
              <p className="text-label-sm text-outline mt-0.5">
                Placed on {formatDateTime(orderData.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-on-surface-variant font-medium">Payment:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-high text-on-surface">
                {orderData.paymentMethod?.toUpperCase()} ({orderData.paymentStatus})
              </span>
            </div>
          </div>

          {/* Courier Details Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
                <Icon name="local_shipping" className="text-[20px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Courier Partner</p>
                <p className="text-label-lg font-bold text-on-surface truncate">{orderData.courier || 'BlueDart / Delhivery'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                <Icon name="tag" className="text-[20px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Tracking Number (AWB)</p>
                <div className="flex items-center gap-2">
                  <p className="text-label-lg font-bold text-on-surface truncate">{orderData.trackingNumber || 'Pending Dispatch'}</p>
                  {orderData.trackingNumber && orderData.trackingNumber !== 'Pending Dispatch' && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(orderData.trackingNumber);
                        toast.success('AWB copied to clipboard');
                      }}
                      className="text-secondary hover:underline text-xs flex items-center"
                      title="Copy AWB"
                    >
                      <Icon name="content_copy" className="text-[14px]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Destination */}
          {orderData.shippingAddress && (
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <Icon name="location_on" className="text-[16px] text-secondary" />
              <span>
                Shipping to <strong>{orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.postalCode}</strong>
              </span>
            </div>
          )}

          {/* Timeline Milestones */}
          <div className="pt-2">
            <h3 className="text-label-lg font-bold text-on-surface mb-4">Milestone Progress</h3>
            <OrderTimeline order={orderData} />
          </div>

          {/* Items Summary */}
          {orderData.items?.length > 0 && (
            <div className="pt-4 border-t border-surface-container-high">
              <h3 className="text-label-lg font-bold text-on-surface mb-3">Items in this Package ({orderData.itemCount})</h3>
              <div className="divide-y divide-surface-container-high">
                {orderData.items.map((it, idx) => (
                  <div key={idx} className="py-2.5 flex items-center gap-3">
                    {it.image && (
                      <Img src={it.image} alt={it.productName} className="w-12 h-12 rounded-lg shrink-0 object-cover" w={80} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-label-md font-bold text-on-surface truncate">{it.productName}</p>
                      {it.variant && <p className="text-[11px] text-outline">Variant: {it.variant}</p>}
                    </div>
                    <span className="text-label-sm font-bold text-on-surface shrink-0">Qty: {it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action links */}
          <div className="pt-4 border-t border-surface-container-high flex flex-wrap items-center justify-between gap-3 text-body-sm">
            <Link to="/returns-exchange" className="text-secondary hover:underline flex items-center gap-1 font-semibold">
              <Icon name="assignment_return" className="text-[16px]" /> Need to exchange or return?
            </Link>
            <Link to="/help" className="text-on-surface-variant hover:text-secondary flex items-center gap-1">
              <Icon name="help_outline" className="text-[16px]" /> Help Centre & Support
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
