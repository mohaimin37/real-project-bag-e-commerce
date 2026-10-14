import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useUser, useMoney, useConfig } from '../hooks/useStore';
import { cn, formatDate, productImage } from '../lib/format';
import { Icon, Img, Button, Modal, Field, Input, Textarea, Skeleton, ErrorState, StatusBadge } from '../components/ui';
import Seo from '../components/Seo';

const PHONE = '8920550465';
const EMAIL = 'info@wildtane.com';

const RETURN_REASONS = [
  'Manufacturing defect or flaw',
  'Damaged product upon delivery',
  'Wrong product or incorrect size delivered',
  'Significant deviation from website description',
  'Fit or comfort not as expected',
  'Changed mind or style preference',
];

const EXCHANGE_REASONS = [
  'Need a different size (Size too small or tight)',
  'Need a different size (Size too large or loose)',
  'Prefer a different color or variant of this product',
  'Want to upgrade to a different model from catalogue',
  'Received damaged / defective piece (Send fresh replacement)',
  'Fit or ergonomics not as expected',
];

// Old links (?tab=exchange, ?tab=track, /exchange) land on the right tab.
const TAB_ALIASES = { exchange: 'orders', exchanges: 'orders', return: 'orders', returns: 'orders', refund: 'orders', refunds: 'orders', orders: 'orders', track: 'requests', status: 'requests', tracking: 'requests', requests: 'requests' };

/** Badge and sentence for the guest order lookup, matching why the order can or can't be returned. */
function lookupStatus(e = {}) {
  if (e.isCancelled) return { badge: 'Order cancelled', text: 'Cancelled orders can’t be returned or exchanged.' };
  if (e.canReturnOrExchange) return { badge: '7-day window open', text: `${e.daysLeft} day${e.daysLeft === 1 ? '' : 's'} left to return or exchange. Sign in to start a request.` };
  if (!e.isDelivered) return { badge: 'Not delivered yet', text: 'Returns and exchanges open when your order is delivered, for 7 days.' };
  if (e.hasActiveRequest) return { badge: 'Request in progress', text: `A ${e.activeRequest?.type || 'return'} request is already in progress (${e.activeRequest?.status || 'Requested'}).` };
  return { badge: 'Window closed', text: 'The 7-day return and exchange window for this order has ended.' };
}

const METHOD_LABEL = { 'Original Payment Method': 'your original payment method', UPI: 'UPI', 'Bank Transfer': 'bank transfer', 'Store Coins Wallet': 'your WILDTANE Wallet' };

/** "₹2,999 sent to UPI on 14 Oct 2026 · Ref 4321…" — what the team confirmed in the admin. */
function refundSentText(r) {
  const amount = r.refundAmount ? `₹${Number(r.refundAmount).toLocaleString('en-IN')}` : 'Your refund';
  const parts = [`${amount} sent to ${METHOD_LABEL[r.refundMethodUsed] || r.refundMethodUsed || 'you'}${r.refundProcessedAt ? ` on ${formatDate(r.refundProcessedAt)}` : ''}.`];
  if (r.refundReference) parts.push(`Reference: ${r.refundReference}.`);
  if (r.refundMethodUsed !== 'Store Coins Wallet') parts.push('It can take a little time to show in your bank or UPI app.');
  return parts.join(' ');
}

/**
 * What the customer sees for one delivered item, from its latest request:
 * waiting for approval → approved (choose refund method) → pickup → done, or "cannot be returned".
 */
function itemState(elig, request, order) {
  const what = request?.type === 'exchange' ? 'Exchange' : 'Return';
  switch (request?.status) {
    case 'Requested':
      return { tone: 'info', icon: 'hourglass_top', title: `${what} in process`, text: 'Waiting for approval from our team. We usually reply within 1–2 working days.' };
    case 'Approved':
      return { tone: 'good', icon: 'task_alt', title: `${what} approved`, text: request.needsRefundDetails ? 'Tell us how you want your money back so we can send the refund.' : 'We’ll book a doorstep pickup and update you here.' };
    case 'Pickup Scheduled':
      return { tone: 'good', icon: 'local_shipping', title: 'Pickup booked', text: 'Keep the item packed with its tags for the courier.' };
    case 'In Inspection':
      return { tone: 'good', icon: 'search_check', title: 'Item received', text: 'We’re checking the item. Your refund or replacement follows.' };
    case 'Completed':
      return request.type === 'exchange'
        ? { tone: 'done', icon: 'published_with_changes', title: 'Exchanged', text: 'This exchange is complete.' }
        : request.refundStatus === 'Processed'
          ? { tone: 'good', icon: 'task_alt', title: 'Refund sent', text: refundSentText(request) }
          : { tone: 'done', icon: 'currency_rupee', title: 'Returned', text: request.refundStatus === 'Failed' ? 'Your refund needs attention — our team will contact you.' : 'We’ve received the item. Your refund is being sent — you’ll see “Refund sent” here with the reference.' };
    case 'Rejected':
      return { tone: 'bad', icon: 'block', title: 'This item cannot be returned or exchanged', text: 'Our team reviewed the request and could not approve it. Contact us if you have questions.' };
    default:
      if (order?.orderStatus === 'Cancelled') {
        return { tone: 'bad', icon: 'cancel', title: 'Order cancelled', text: 'This order was cancelled and cannot be returned or exchanged.' };
      }
      if (!order?.returnDetails?.isDelivered) {
        return { tone: 'info', icon: 'local_shipping', title: 'Delivery in progress', text: 'Return & exchange option opens for 7 days once this item is delivered.' };
      }
      if (elig?.canReturnOrExchange) return null; // show the Return / Exchange buttons
      return { tone: 'muted', icon: 'lock', title: 'Return window closed', text: 'The 7-day return and exchange window for this item has ended.' };
  }
}

// Box + icon colour per state. Text stays on-surface so it reads in every theme, light or dark.
const TONE = {
  info: { box: 'bg-sky-500/10 border-sky-500/30', icon: 'text-sky-600 dark:text-sky-400' },
  good: { box: 'bg-emerald-500/10 border-emerald-500/30', icon: 'text-emerald-600 dark:text-emerald-400' },
  done: { box: 'bg-surface-container-high border-outline-variant/40', icon: 'text-secondary' },
  bad: { box: 'bg-error/10 border-error/35', icon: 'text-error' },
  muted: { box: 'bg-surface-container-low border-outline-variant/30', icon: 'text-outline' },
};

/** One order item: photo, details and either its request status or the Return / Exchange buttons when time is available. */
function ItemRow({ order, it, elig, onStart, onCancel, cancelling }) {
  const money = useMoney();
  const request = elig?.request && elig.request.status !== 'Cancelled' ? elig.request : null;
  const state = itemState(elig, request, order);
  const daysLeft = elig?.daysLeft || order.returnDetails?.daysLeft || 0;
  const hoursLeft = elig?.hoursLeft || order.returnDetails?.hoursLeft || 0;

  return (
    <div className="flex flex-col gap-3 p-3.5 sm:p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-high hover:border-outline-variant/60 transition-colors">
      <div className="flex items-start gap-3">
        <Img src={it.image} alt={it.productName} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 ring-1 ring-surface-container-highest" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] sm:text-[15px] font-bold leading-snug">{it.productName}</p>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{it.variantName ? `${it.variantName} · ` : ''}Qty {it.quantity}</p>
          <p className="text-[13px] font-semibold mt-0.5">{money(it.totalPrice || it.unitPrice * it.quantity)}</p>
        </div>
      </div>

      {state ? (
        <div className={cn('rounded-xl border p-3 flex flex-col gap-2.5 text-on-surface', TONE[state.tone].box)}>
          <div className="flex items-start gap-2.5">
            <Icon name={state.icon} className={cn('text-[20px] shrink-0 mt-px', TONE[state.tone].icon)} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold leading-snug">{state.title}</p>
              <p className="text-[12px] text-on-surface-variant leading-relaxed mt-0.5">{state.text}</p>
              {request && <p className="text-[11px] text-outline mt-1 font-mono">{request.requestId}</p>}
            </div>
          </div>
          {request && (
            <div className="flex flex-wrap gap-2">
              {request.needsRefundDetails && (
                <Link to={`/returns-exchange/refund/${encodeURIComponent(request.requestId)}`} className="btn-primary h-9 px-3.5 text-[12.5px] gap-1.5">
                  <Icon name="account_balance_wallet" className="text-[17px]" /> Choose how to get your money back
                </Link>
              )}
              {request.type === 'return' && !request.needsRefundDetails && ['Approved', 'Pickup Scheduled', 'In Inspection'].includes(request.status) && request.refundStatus === 'None' && (
                <Link to={`/returns-exchange/refund/${encodeURIComponent(request.requestId)}`} className="btn-tonal h-9 px-3 text-[12px] gap-1.5">
                  <Icon name="edit" className="text-[16px]" /> Refund to: {request.refundMethod}
                </Link>
              )}
              <Link to={`/returns-exchange/help/${encodeURIComponent(request.requestId)}`} className="btn-tonal h-9 px-3 text-[12px] gap-1.5">
                <Icon name="timeline" className="text-[16px]" /> Details
              </Link>
              {request.canCancel && (
                <button type="button" disabled={cancelling} onClick={() => onCancel(request)} className="btn-ghost h-9 px-3 text-[12px] gap-1.5 text-error hover:bg-error/10">
                  <Icon name="close" className="text-[16px]" /> Cancel request
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 pt-1">
          {/* Return Window countdown banner */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[12px]">
            <span className="flex items-center gap-1.5 font-bold">
              <Icon name="timer" className="text-[16px] animate-pulse" />
              Return time available: {daysLeft} day{daysLeft === 1 ? '' : 's'}{hoursLeft > 0 && daysLeft <= 2 ? ` (${hoursLeft}h)` : ''} left
            </span>
            <span className="text-[11px] font-semibold opacity-85">7-day policy</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => onStart(order, 'return', it)}
              className="btn-primary h-10 shrink-0 sm:flex-1 gap-1.5 text-[13px] font-bold shadow-xs hover:shadow-md transition-all"
            >
              <Icon name="assignment_return" className="text-[18px]" /> Return for refund
            </button>
            <button
              type="button"
              onClick={() => onStart(order, 'exchange', it)}
              className="btn-tonal h-10 shrink-0 sm:flex-1 gap-1.5 text-[13px] font-bold"
            >
              <Icon name="published_with_changes" className="text-[18px]" /> Exchange item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onStart, onCancel, cancelling }) {
  const money = useMoney();
  const ret = order.returnDetails || {};
  const elig = ret.itemsEligibility || [];
  const isDelivered = ret.isDelivered || order.orderStatus === 'Delivered';
  const isCancelled = order.orderStatus === 'Cancelled';
  const isInTransit = !isDelivered && !isCancelled;
  const canReturn = ret.canReturnOrExchange;

  return (
    <article className="card p-4 sm:p-5 flex flex-col gap-4 border border-surface-container-high bg-surface-container-low/40">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold font-mono">{order.orderId}</span>
          <StatusBadge status={order.orderStatus} />
          {canReturn && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Return Available ({ret.daysLeft}d left)
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {isDelivered && order.deliveredAt ? (
            <span className="text-on-surface-variant">Delivered {formatDate(order.deliveredAt)}</span>
          ) : (
            <span className="text-on-surface-variant">Ordered {formatDate(order.createdAt)}</span>
          )}
          {ret.isExpired ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold bg-surface-container-high text-on-surface-variant">
              <Icon name="lock" className="text-[14px]" /> 7-day window closed
            </span>
          ) : ret.daysLeft > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <Icon name="timer" className="text-[14px]" /> {ret.daysLeft} day{ret.daysLeft === 1 ? '' : 's'} left
            </span>
          ) : isInTransit ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
              <Icon name="local_shipping" className="text-[14px]" /> Returns open upon delivery
            </span>
          ) : null}
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {order.items.map((it, idx) => (
          <ItemRow key={`${it.productId}-${it.variantId || idx}`} order={order} it={it} elig={elig[idx]} onStart={onStart} onCancel={onCancel} cancelling={cancelling} />
        ))}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-surface-container-high text-[12px] text-on-surface-variant">
        <div className="flex items-center gap-3">
          <span>{order.items.length} item{order.items.length === 1 ? '' : 's'} · Total: <strong className="text-on-surface">{money(order.grandTotal)}</strong></span>
          {order.shippingAddress?.city && (
            <span className="hidden sm:inline">· {order.shippingAddress.city}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isInTransit && (
            <Link to={`/track?orderId=${order.orderId}`} className="font-bold text-secondary hover:underline inline-flex items-center gap-1">
              <Icon name="local_shipping" className="text-[15px]" /> Track shipment
            </Link>
          )}
          <Link to={`/account/orders/${order.orderId}`} className="font-bold text-secondary hover:underline inline-flex items-center gap-0.5">
            Order details <Icon name="chevron_right" className="text-[16px]" />
          </Link>
        </div>
      </footer>
    </article>
  );
}

/** "My requests" tab: every return / exchange the customer has raised. */
function RequestsList({ onGoToOrders }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['returns', 'requests'], queryFn: api.myReturnRequests, select: (d) => d.requests });
  if (isLoading) return <div className="flex flex-col gap-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data.length) {
    return (
      <div className="card p-8 text-center flex flex-col items-center gap-3 border border-surface-container-high">
        <span className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center"><Icon name="assignment_return" className="text-[28px]" /></span>
        <h3 className="text-headline-sm font-bold">No requests yet</h3>
        <p className="text-body-sm text-on-surface-variant max-w-md">When you return or exchange a delivered item, you can follow it here.</p>
        <button type="button" onClick={onGoToOrders} className="btn-primary mt-1">Return or exchange an item</button>
      </div>
    );
  }
  return (
    <div className="card divide-y divide-surface-container-high border border-surface-container-high overflow-hidden">
      {data.map((r) => (
        <Link key={r.requestId} to={`/returns-exchange/help/${r.requestId}`} className="flex items-center gap-3 p-4 hover:bg-surface-container-low transition-colors">
          <span className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
            <Icon name={r.type === 'exchange' ? 'published_with_changes' : 'assignment_return'} className="text-[20px]" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold"><span className="capitalize">{r.type}</span> · <span className="font-mono">{r.requestId}</span></p>
            <p className="text-[12px] text-on-surface-variant">Order {r.orderId} · {formatDate(r.requestedAt || r.createdAt)} · {r.items.map((i) => i.productName).join(', ')}</p>
          </div>
          <StatusBadge status={r.status} />
          <Icon name="chevron_right" className="text-outline hidden sm:block" />
        </Link>
      ))}
    </div>
  );
}

function GuestLookup({ signedIn, phone }) {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return toast.error('Please enter an Order ID');
    if (!signedIn && !email.trim()) return toast.error('Please enter the email used for this order');
    setLoading(true);
    setResult(null);
    try {
      setResult(await api.orderReturnEligibility(orderId.trim(), signedIn ? undefined : email.trim()));
    } catch (err) {
      toast.error(err.message || 'Order not found. Please check your Order ID.');
    } finally {
      setLoading(false);
    }
  };
  const st = result && lookupStatus(result.eligibility);
  return (
    <div className="card p-5 sm:p-6 flex flex-col gap-4 border border-surface-container-high">
      <div>
        <h3 className="text-headline-sm font-bold">Check an order</h3>
        <p className="text-body-sm text-on-surface-variant">Enter your Order ID{signedIn ? '' : ' and the email you ordered with'} to see if it can be returned or exchanged.</p>
      </div>
      <form onSubmit={submit} className={cn('flex flex-col gap-3', signedIn && 'sm:flex-row')}>
        <Input placeholder="e.g. WT26-000042" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="flex-1" aria-label="Order ID" required />
        {!signedIn && <Input type="email" placeholder="Email used for the order" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" aria-label="Email used for the order" required />}
        <Button type="submit" loading={loading} icon="search">Check</Button>
      </form>
      {st && (
        <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold font-mono text-[14px]">{result.orderId}</span>
            <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full', result.eligibility?.canReturnOrExchange ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-surface-container-high text-on-surface-variant')}>{st.badge}</span>
          </div>
          <p className="text-[13px] text-on-surface-variant">{st.text}</p>
          <a href={`tel:${phone}`} className="text-[12px] text-secondary font-bold hover:underline self-start">Need help? Call {phone}</a>
        </div>
      )}
    </div>
  );
}

export default function ReturnsExchange({ defaultTab = 'orders' }) {
  const user = useUser();
  const money = useMoney();
  const { data: config } = useConfig();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const phone = config?.supportPhone || PHONE;
  const email = config?.supportEmail || EMAIL;

  const rawTab = searchParams.get('tab');
  const urlTab = rawTab ? TAB_ALIASES[rawTab.toLowerCase()] || 'orders' : null;
  const [activeTab, setActiveTab] = useState(urlTab || TAB_ALIASES[defaultTab] || 'orders');
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);
  const setTab = (t) => {
    setActiveTab(t);
    const next = new URLSearchParams(searchParams);
    next.set('tab', t);
    setSearchParams(next, { replace: true });
  };

  // All orders for customer order list history with return eligibility details.
  const ordersQuery = useQuery({ queryKey: ['returns', 'my-orders'], queryFn: api.myReturnOrders, enabled: !!user, staleTime: 30 * 1000 });
  const orders = ordersQuery.data?.orders || [];
  const openCount = useMemo(
    () => orders.reduce((n, o) => n + (o.returnDetails?.itemsEligibility || []).filter((e) => ['Requested', 'Approved', 'Pickup Scheduled', 'In Inspection'].includes(e.request?.status)).length, 0),
    [orders]
  );
  const eligibleCount = useMemo(
    () => orders.filter((o) => o.returnDetails?.canReturnOrExchange).length,
    [orders]
  );
  const inTransitCount = useMemo(
    () => orders.filter((o) => !o.returnDetails?.isDelivered && o.orderStatus !== 'Cancelled').length,
    [orders]
  );
  const closedCount = useMemo(
    () => orders.filter((o) => o.returnDetails?.isExpired || o.orderStatus === 'Returned').length,
    [orders]
  );

  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'eligible' | 'in_transit' | 'closed'
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'eligible') return orders.filter((o) => o.returnDetails?.canReturnOrExchange);
    if (orderFilter === 'in_transit') return orders.filter((o) => !o.returnDetails?.isDelivered && o.orderStatus !== 'Cancelled');
    if (orderFilter === 'closed') return orders.filter((o) => o.returnDetails?.isExpired || o.orderStatus === 'Returned');
    return orders;
  }, [orders, orderFilter]);

  const needRefundInfo = useMemo(() => orders.flatMap((o) => (o.returnDetails?.itemsEligibility || []).filter((e) => e.request?.needsRefundDetails).map((e) => e.request)), [orders]);

  // ── Request form ──
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [requestType, setRequestType] = useState('return');
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [detailedReason, setDetailedReason] = useState('');
  const [exchangeMode, setExchangeMode] = useState('variant');
  const [exchangeVariant, setExchangeVariant] = useState('');
  const [exchangeReplacementId, setExchangeReplacementId] = useState('');
  const [conditionConfirmed, setConditionConfirmed] = useState(false);

  const { data: catalogueProducts = [] } = useQuery({
    queryKey: ['exchange-catalogue-products'],
    queryFn: () => api.products({ limit: 40 }),
    select: (d) => (d.items || d.products || []).map((p) => ({ ...p, image: productImage(p), price: p.finalPrice ?? p.salePrice ?? p.price })),
    enabled: !!selectedOrder && requestType === 'exchange' && exchangeMode === 'product',
    staleTime: 60 * 1000,
  });

  const keyOf = (it) => `${it.productId}-${it.variantId || 'default'}`;
  const eligibleAt = (order, idx) => order.returnDetails?.itemsEligibility?.[idx]?.canReturnOrExchange;

  const openModal = (order, type = 'return', onlyItem = null) => {
    setSelectedOrder(order);
    setRequestType(type);
    setReason(type === 'exchange' ? EXCHANGE_REASONS[0] : RETURN_REASONS[0]);
    setDetailedReason('');
    setExchangeMode('variant');
    setExchangeVariant('');
    setExchangeReplacementId('');
    setConditionConfirmed(false);
    const initial = {};
    order.items.forEach((it, idx) => {
      if (eligibleAt(order, idx) && (!onlyItem || keyOf(onlyItem) === keyOf(it))) initial[keyOf(it)] = it.quantity;
    });
    setSelectedItems(initial);
  };

  // Links like /returns-exchange?order=WT26-000042&type=exchange open the form straight away.
  useEffect(() => {
    const id = searchParams.get('order');
    if (!id || !orders.length || selectedOrder) return;
    const found = orders.find((o) => o.orderId === id || o._id === id);
    if (found && found.returnDetails?.canReturnOrExchange) openModal(found, searchParams.get('type') === 'exchange' ? 'exchange' : 'return');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, orders]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['returns'] });
    qc.invalidateQueries({ queryKey: ['orders'] });
  };

  const submitMutation = useMutation({
    mutationFn: (payload) => api.submitReturnExchange(payload),
    onSuccess: () => {
      toast.success(`${requestType === 'exchange' ? 'Exchange' : 'Return'} request sent. We’ll let you know once it’s approved.`);
      setSelectedOrder(null);
      refresh();
    },
    onError: (err) => toast.error(err.message || 'Failed to submit request.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId) => api.cancelReturnRequest(requestId),
    onSuccess: () => {
      toast.success('Request cancelled');
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });
  const onCancel = (request) => {
    if (window.confirm(`Cancel ${request.type} request ${request.requestId}? You can raise a new one while the 7-day window is open.`)) cancelMutation.mutate(request.requestId);
  };

  const { selectedCount, selectedTotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    (selectedOrder?.items || []).forEach((it) => {
      const q = selectedItems[keyOf(it)] || 0;
      count += q;
      total += (it.unitPrice || 0) * q;
    });
    return { selectedCount: count, selectedTotal: total };
  }, [selectedOrder, selectedItems]);

  const replacement = useMemo(
    () => (exchangeMode === 'product' && exchangeReplacementId ? catalogueProducts.find((p) => p._id === exchangeReplacementId) : null),
    [exchangeMode, exchangeReplacementId, catalogueProducts]
  );
  const difference = replacement ? replacement.price * Math.max(1, selectedCount) - selectedTotal : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const items = selectedOrder.items
      .filter((it) => (selectedItems[keyOf(it)] || 0) > 0)
      .map((it) => ({ productId: it.productId, productName: it.productName, variantId: it.variantId, variantName: it.variantName, SKU: it.SKU, image: it.image, quantity: selectedItems[keyOf(it)], unitPrice: it.unitPrice, totalPrice: (it.unitPrice || 0) * selectedItems[keyOf(it)] }));
    if (!items.length) return toast.error('Please select at least one item.');
    if (requestType === 'exchange' && exchangeMode === 'product' && !exchangeReplacementId) return toast.error('Please choose the product you want instead.');
    if (!conditionConfirmed) return toast.error('Please confirm the item is unused with its tags and packaging.');
    submitMutation.mutate({
      orderId: selectedOrder.orderId,
      type: requestType,
      reason,
      detailedReason,
      items,
      exchangePreference:
        requestType === 'exchange'
          ? {
              exchangeType: exchangeMode,
              desiredSizeOrColor: exchangeMode === 'variant' ? exchangeVariant.trim() || 'Same as original' : '',
              desiredItemName: exchangeMode === 'product' && replacement ? replacement.name : items[0]?.productName || '',
              replacementProductId: exchangeMode === 'product' ? exchangeReplacementId : undefined,
              notes: detailedReason.trim(),
              coinCalculation: replacement ? { originalValue: selectedTotal, replacementValue: replacement.price * Math.max(1, selectedCount), difference } : null,
            }
          : undefined,
      conditionConfirmed,
    });
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-16">
      <Seo title="Returns & Exchange | WILDTANE" description="Return or exchange a delivered WILDTANE order within 7 days. Free doorstep pickup, clear status updates and refunds to your UPI, bank account or original payment." />

      {/* ── HEADER ── */}
      <section className="border-b border-surface-container-high bg-gradient-to-b from-secondary/10 via-surface to-surface">
        <div className="container-x max-w-5xl pt-8 pb-6 md:pt-12 md:pb-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2 text-center items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-secondary/15 text-secondary">
              <Icon name="verified" className="text-[16px]" /> 7-day returns · Free doorstep pickup
            </span>
            <h1 className="text-headline-xl md:text-[40px] font-serif font-black tracking-tight leading-tight">Returns & Exchange</h1>
            <p className="text-body-md text-on-surface-variant max-w-xl">Pick a delivered item, tell us why, and we’ll take it from there.</p>
          </div>

          {/* How it works */}
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              ['touch_app', 'Choose an item', 'Only your delivered items are listed'],
              ['task_alt', 'We review it', 'You’ll see “in process” until we approve'],
              ['payments', 'Pickup & refund', 'Choose UPI, bank or another way to be paid'],
            ].map(([icon, title, text], i) => (
              <li key={title} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-surface-container-high">
                <span className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 relative">
                  <Icon name={icon} className="text-[20px]" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface text-on-surface text-[10.5px] font-black flex items-center justify-center ring-1 ring-surface-container-high">{i + 1}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold">{title}</span>
                  <span className="block text-[12px] text-on-surface-variant leading-snug">{text}</span>
                </span>
              </li>
            ))}
          </ol>

          {user && (
            <div className="flex justify-center">
              <div role="tablist" aria-label="Returns sections" className="inline-flex p-1 rounded-2xl bg-surface-container-high/80 border border-surface-container-highest">
                {[
                  ['orders', 'receipt_long', 'My Orders & Returns'],
                  ['requests', 'track_changes', 'My Requests'],
                ].map(([id, icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => setTab(id)}
                    className={cn('px-4 py-2 rounded-xl text-[13px] font-bold flex items-center gap-2 whitespace-nowrap transition-all', activeTab === id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                  >
                    <Icon name={icon} className="text-[17px]" /> {label}
                    {id === 'orders' && eligibleCount > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center animate-pulse">{eligibleCount} eligible</span>}
                    {id === 'requests' && openCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-secondary text-on-secondary text-[11px] font-black flex items-center justify-center">{openCount}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="container-x max-w-5xl mt-6 flex flex-col gap-6">
        {/* Approved returns waiting for refund details: the most important thing on the page. */}
        {user && needRefundInfo.length > 0 && (
          <div className="rounded-2xl p-4 sm:p-5 bg-secondary text-on-secondary flex flex-col sm:flex-row sm:items-center gap-3 shadow-card">
            <Icon name="account_balance_wallet" className="text-[32px] shrink-0" />
            <div className="flex-1">
              <p className="text-[15px] font-bold">Your return is approved — how should we refund you?</p>
              <p className="text-[13px] opacity-90">Add your UPI ID, bank account or choose another option so we can send your money.</p>
            </div>
            <Link to={`/returns-exchange/refund/${encodeURIComponent(needRefundInfo[0].requestId)}`} className="btn h-10 px-4 rounded-xl bg-on-secondary text-secondary font-bold shrink-0">
              Add refund details
            </Link>
          </div>
        )}

        {!user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="card p-6 flex flex-col gap-4 border border-surface-container-high">
              <span className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center"><Icon name="lock" className="text-[24px]" /></span>
              <div>
                <h2 className="text-headline-sm font-bold">Sign in to return or exchange</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">You’ll see your delivered items, how many days are left, and the status of every request.</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/login?redirect=/returns-exchange" className="btn-primary flex-1 text-center">Sign in</Link>
                <Link to="/register?redirect=/returns-exchange" className="btn-tonal flex-1 text-center">Create account</Link>
              </div>
            </div>
            <GuestLookup signedIn={false} phone={phone} />
          </div>
        ) : activeTab === 'requests' ? (
          <RequestsList onGoToOrders={() => setTab('orders')} />
        ) : ordersQuery.isLoading ? (
          <div className="flex flex-col gap-4">{[1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        ) : ordersQuery.isError ? (
          <ErrorState error={ordersQuery.error} onRetry={ordersQuery.refetch} />
        ) : orders.length === 0 ? (
          <div className="card p-8 text-center flex flex-col items-center gap-3 border border-surface-container-high">
            <span className="w-14 h-14 rounded-2xl bg-surface-container-high text-outline flex items-center justify-center"><Icon name="inventory_2" className="text-[28px]" /></span>
            <h2 className="text-headline-sm font-bold">No orders found</h2>
            <p className="text-body-sm text-on-surface-variant max-w-md">You haven’t placed any orders yet. Once your orders arrive, you’ll have a 7-day window to request a return or exchange right here.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              <Link to="/shop" className="btn-primary">Browse the catalogue</Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrderFilter('all')}
                  className={cn('h-8 px-3.5 rounded-full text-[12.5px] font-bold transition-all border', orderFilter === 'all' ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container-low border-surface-container-high text-on-surface-variant hover:text-on-surface')}
                >
                  All Orders ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderFilter('eligible')}
                  className={cn('h-8 px-3.5 rounded-full text-[12.5px] font-bold transition-all border flex items-center gap-1.5', orderFilter === 'eligible' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-surface-container-low border-surface-container-high text-on-surface-variant hover:text-on-surface')}
                >
                  <Icon name="timer" className="text-[15px]" /> Return Available ({eligibleCount})
                </button>
                {inTransitCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderFilter('in_transit')}
                    className={cn('h-8 px-3.5 rounded-full text-[12.5px] font-bold transition-all border flex items-center gap-1.5', orderFilter === 'in_transit' ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-surface-container-low border-surface-container-high text-on-surface-variant hover:text-on-surface')}
                  >
                    <Icon name="local_shipping" className="text-[15px]" /> In Transit ({inTransitCount})
                  </button>
                )}
                {closedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderFilter('closed')}
                    className={cn('h-8 px-3.5 rounded-full text-[12.5px] font-bold transition-all border flex items-center gap-1.5', orderFilter === 'closed' ? 'bg-surface-container-highest text-on-surface border-outline-variant shadow-xs' : 'bg-surface-container-low border-surface-container-high text-on-surface-variant hover:text-on-surface')}
                  >
                    <Icon name="lock" className="text-[15px]" /> Window Closed ({closedCount})
                  </button>
                )}
              </div>
              <button type="button" onClick={() => ordersQuery.refetch()} className="btn-ghost btn-sm gap-1 ml-auto">
                <Icon name="refresh" className="text-[16px]" /> Refresh
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="card p-8 text-center flex flex-col items-center gap-3 border border-surface-container-high">
                <span className="w-14 h-14 rounded-2xl bg-surface-container-high text-outline flex items-center justify-center"><Icon name="filter_list_off" className="text-[28px]" /></span>
                <h3 className="text-headline-sm font-bold">No orders in this filter</h3>
                <p className="text-body-sm text-on-surface-variant max-w-md">There are currently no orders in &ldquo;{orderFilter === 'eligible' ? 'Return Available' : orderFilter === 'in_transit' ? 'In Transit' : 'Window Closed'}&rdquo;.</p>
                <button type="button" onClick={() => setOrderFilter('all')} className="btn-tonal mt-1">Show All Orders</button>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <OrderCard key={order._id} order={order} onStart={openModal} onCancel={onCancel} cancelling={cancelMutation.isPending} />
              ))
            )}
          </div>
        )}

        {user && activeTab === 'requests' && <GuestLookup signedIn phone={phone} />}

        {/* Policy in short */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['event', 'How long do I have?', '7 days from the day your order is delivered. After that the item can’t be returned or exchanged.'],
            ['inventory', 'What condition?', 'Unused, with original tags, packaging and accessories.'],
            ['payments', 'How is the refund sent?', 'Once we approve your return you choose: original payment (for online orders), UPI, bank account or WILDTANE Wallet. Refunds go out after the item passes inspection.'],
            ['savings', 'What about coins?', 'Coins earned on a returned item are removed, and coins you spent on it come back to you.'],
          ].map(([icon, q, a]) => (
            <div key={q} className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high flex gap-3">
              <Icon name={icon} className="text-secondary text-[22px] shrink-0" />
              <div>
                <h3 className="text-[14px] font-bold">{q}</h3>
                <p className="text-[13px] text-on-surface-variant leading-relaxed mt-0.5">{a}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Support */}
        <section className="card p-4 sm:p-5 border border-surface-container-high flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shrink-0"><Icon name="support_agent" className="text-[24px]" /></span>
            <div>
              <p className="text-[15px] font-bold leading-tight">Need help with a return?</p>
              <p className="text-[12px] text-on-surface-variant">{config?.supportHours || 'Mon – Sat, 9:30 AM – 6:30 PM IST'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <a href={`tel:${phone}`} className="btn-primary h-10 px-4 text-[13px] gap-2"><Icon name="call" className="text-[18px]" /> Call {phone}</a>
            <a href={`mailto:${email}?subject=Return%20or%20Exchange`} className="btn-tonal h-10 px-4 text-[13px] gap-2"><Icon name="mail" className="text-[18px]" /> Email</a>
            <a href={`https://wa.me/91${String(phone).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent('Hi WILDTANE, I have a question about a return/exchange.')}`} target="_blank" rel="noopener noreferrer" className="btn-tonal h-10 px-4 text-[13px] gap-2"><Icon name="chat" className="text-[18px]" /> WhatsApp</a>
          </div>
        </section>
      </main>

      {/* ── REQUEST FORM ── */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={requestType === 'exchange' ? 'Exchange an item' : 'Return an item'} size="lg">
        {selectedOrder && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container-high rounded-2xl" role="radiogroup" aria-label="Return or exchange">
              {[
                ['return', 'assignment_return', 'Return for refund'],
                ['exchange', 'published_with_changes', 'Exchange'],
              ].map(([t, icon, label]) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={requestType === t}
                  onClick={() => {
                    setRequestType(t);
                    setReason(t === 'exchange' ? EXCHANGE_REASONS[0] : RETURN_REASONS[0]);
                  }}
                  className={cn('py-2.5 px-3 rounded-xl text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all', requestType === t ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}
                >
                  <Icon name={icon} className="text-[19px]" /> {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-label-md font-bold">Items from order {selectedOrder.orderId}</p>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {selectedOrder.items.map((it, idx) => {
                  const k = keyOf(it);
                  const can = eligibleAt(selectedOrder, idx);
                  const checked = (selectedItems[k] || 0) > 0;
                  return (
                    <label key={k} className={cn('p-3 rounded-xl border flex items-center gap-3 transition-colors', !can ? 'opacity-55 bg-surface-container-high/40 border-outline/20 cursor-not-allowed' : checked ? 'border-secondary bg-secondary/5 cursor-pointer' : 'border-surface-container-high cursor-pointer')}>
                      <input type="checkbox" checked={checked} disabled={!can} onChange={() => setSelectedItems((p) => ({ ...p, [k]: checked ? 0 : it.quantity }))} className="w-4 h-4 rounded" />
                      <Img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold">{it.productName}</span>
                        <span className="block text-[11.5px] text-on-surface-variant">{it.variantName ? `${it.variantName} · ` : ''}Qty {it.quantity}{!can ? ' · not available' : ''}</span>
                      </span>
                      <span className="text-[13px] font-semibold shrink-0">{money(it.unitPrice)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Field label={`Why are you ${requestType === 'exchange' ? 'exchanging' : 'returning'} it?`} required>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="input h-11" required>
                {(requestType === 'exchange' ? EXCHANGE_REASONS : RETURN_REASONS).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            {requestType === 'exchange' ? (
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface-container-low border border-surface-container-high">
                <p className="text-label-md font-bold">What would you like instead?</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    ['variant', 'Same product', 'Another piece, or a different size / colour'],
                    ['replacement', 'Fresh replacement', 'For a damaged or faulty piece'],
                    ['product', 'Different product', 'Pick another item; we adjust the price difference'],
                  ].map(([m, title, text]) => (
                    <button key={m} type="button" onClick={() => setExchangeMode(m)} className={cn('p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all', exchangeMode === m ? 'border-secondary bg-secondary/10 ring-1 ring-secondary/40' : 'border-surface-container-high bg-surface-container-lowest hover:bg-surface-container-low')}>
                      <span className="font-bold text-[13px]">{title}</span>
                      <span className="text-[11.5px] text-on-surface-variant">{text}</span>
                    </button>
                  ))}
                </div>
                {exchangeMode === 'variant' && (
                  <Field label="Different size or colour (optional)" hint="Leave blank for another piece of the same size and colour.">
                    <Input placeholder="e.g. Navy instead of Black" value={exchangeVariant} onChange={(e) => setExchangeVariant(e.target.value)} />
                  </Field>
                )}
                {exchangeMode === 'product' && (
                  <>
                    <Field label="Product you want instead" required>
                      <select value={exchangeReplacementId} onChange={(e) => setExchangeReplacementId(e.target.value)} className="input h-11" required>
                        <option value="">Choose a product…</option>
                        {catalogueProducts.map((p) => <option key={p._id} value={p._id}>{p.name} — {money(p.price)}</option>)}
                      </select>
                    </Field>
                    {replacement && (
                      <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/50 flex items-center gap-3 text-[13px]">
                        <Img src={replacement.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold">{replacement.name}</p>
                          <p className="text-on-surface-variant">
                            {difference > 0 ? `You pay ${money(difference)} more` : difference < 0 ? `We refund the ${money(-difference)} difference` : 'Same price — no difference to pay'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/20 flex items-start gap-2.5 text-[12.5px]">
                <Icon name="info" className="text-secondary text-[18px] shrink-0" />
                <span>Once we approve your return, you’ll choose how to get your money back — UPI, bank account{selectedOrder.paymentMethod !== 'cod' ? ', your original payment' : ''} or WILDTANE Wallet.</span>
              </div>
            )}

            <Field label="Anything else we should know? (optional)">
              <Textarea rows={2} placeholder="e.g. best time for pickup" value={detailedReason} onChange={(e) => setDetailedReason(e.target.value)} maxLength={500} />
            </Field>

            <div className="p-3 rounded-xl bg-surface-container-high/60 text-[12px] flex items-start gap-2.5">
              <Icon name="location_on" className="text-secondary text-[18px] shrink-0" />
              <p className="text-on-surface-variant">
                <b className="text-on-surface">Pickup from: </b>
                {selectedOrder.shippingAddress?.fullName} · {selectedOrder.shippingAddress?.addressLine1}, {selectedOrder.shippingAddress?.city} {selectedOrder.shippingAddress?.postalCode} · {selectedOrder.shippingAddress?.phone}
              </p>
            </div>

            <label className="flex items-start gap-2 text-[12.5px] text-on-surface-variant cursor-pointer select-none">
              <input type="checkbox" checked={conditionConfirmed} onChange={(e) => setConditionConfirmed(e.target.checked)} className="mt-0.5 rounded" />
              <span>The item is <b className="text-on-surface">unused</b> and has its original tags, packaging and accessories.</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-container-high">
              <Button type="button" variant="tonal" onClick={() => setSelectedOrder(null)}>Close</Button>
              <Button type="submit" loading={submitMutation.isPending} disabled={!selectedCount}>
                Send {requestType} request{selectedCount > 1 ? ` (${selectedCount} items)` : ''}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
