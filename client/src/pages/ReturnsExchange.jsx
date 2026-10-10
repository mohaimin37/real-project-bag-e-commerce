import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useUser, useMoney, useConfig } from '../hooks/useStore';
import { cn, formatDate, formatDateTime, productImage } from '../lib/format';
import { Icon, Img, Button, Modal, Field, Input, Textarea, Skeleton, ErrorState, StatusBadge } from '../components/ui';
import { CoinIcon, useMyCoins } from '../components/coins';
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

// The old "exchange" tab was merged into "return"; its links (and /exchange) land there.
const TAB_ALIASES = { exchange: 'return', exchanges: 'return', return: 'return', returns: 'return', refund: 'return', refunds: 'return', track: 'track', status: 'track', tracking: 'track' };

/** Badge and sentence for the order lookup result, matching why the order can or can't be returned. */
function lookupStatus(e = {}) {
  if (e.isCancelled) return { badge: 'Order Cancelled', text: 'If an order gets cancelled, coin rewards will not come and returns or exchanges are not permitted.' };
  if (e.canReturnOrExchange) return { badge: '7-Day Window Active', text: `${e.daysLeft} day${e.daysLeft === 1 ? '' : 's'} remaining to return or exchange.` };
  if (!e.isDelivered) return { badge: 'Not Delivered Yet', text: 'Returns and exchanges open once your order is delivered, for 7 days.' };
  if (e.hasActiveRequest) return { badge: 'Request In Progress', text: `A ${e.activeRequest?.type || 'return'} request is already in progress (${e.activeRequest?.status || 'Requested'}).` };
  if (e.isExpired) return { badge: '7-Day Window Completed', text: 'Once 7 days are complete for a specific item, no return or exchange will happen.' };
  return { badge: 'Window Closed', text: 'Once 7 days are complete for an item, no return or exchange will happen.' };
}

// ── WIDGETS ────────────────────────────────────────────────────

function TrackRequestsWidget({ activeRequests, phone, onOpenExchange }) {
  if (!activeRequests || activeRequests.length === 0) {
    return (
      <div className="card p-8 text-center flex flex-col items-center gap-3 bg-surface-container-lowest border border-surface-container-high">
        <span className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
          <Icon name="local_shipping" className="text-[28px]" />
        </span>
        <h3 className="text-headline-sm font-bold">No Active Return or Exchange Requests</h3>
        <p className="text-body-sm text-on-surface-variant max-w-md">
          You currently don't have any ongoing return or exchange dispatches. Delivered orders within their 7-day window can be returned or exchanged from the Return & Exchange tab.
        </p>
        <button type="button" onClick={onOpenExchange} className="btn-primary mt-2 flex items-center gap-2">
          <Icon name="assignment_return" className="text-[18px]" />
          Go to Return & Exchange
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
        <div>
          <h3 className="text-headline-sm font-serif font-bold text-on-surface">Active Return & Exchange Requests</h3>
          <p className="text-body-sm text-on-surface-variant">Live reverse logistics, approval stages and courier dispatch tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {activeRequests.map(({ order, request }) => (
          <div key={order._id} className="card p-5 bg-surface-container-lowest border-2 border-teal-500/25 shadow-card flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-3">
                <span className="text-[16px] font-bold font-mono text-on-surface">{order.orderId}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                  {request.type === 'exchange' ? 'Exchange Request' : 'Return Request'}
                </span>
                <span className="text-[12px] text-on-surface-variant">
                  Reference: <strong>{request.requestId}</strong>
                </span>
              </div>
              <StatusBadge status={request.status || 'Requested'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-surface-container-low">
                <span className="text-[11px] uppercase font-bold text-outline">Reason</span>
                <p className="text-[13px] font-semibold text-on-surface mt-0.5">{request.reason}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <span className="text-[11px] uppercase font-bold text-outline">Requested On</span>
                <p className="text-[13px] font-semibold text-on-surface mt-0.5">{formatDate(request.requestedAt)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low">
                <span className="text-[11px] uppercase font-bold text-outline">Pickup Location</span>
                <p className="text-[13px] font-semibold text-on-surface mt-0.5 truncate">{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-surface-container-high">
              <Link to={`/account/orders/${order.orderId}`} className="text-[12.5px] font-bold text-secondary hover:underline flex items-center gap-1">
                View Full Order Details <Icon name="chevron_right" className="text-[16px]" />
              </Link>
              <a href={`tel:${phone}`} className="text-[12px] font-bold text-outline hover:text-secondary flex items-center gap-1">
                <Icon name="support_agent" className="text-[15px]" /> Help with this request
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReturnsExchange({ defaultTab = 'return' }) {
  const user = useUser();
  const money = useMoney();
  const { data: config } = useConfig();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const phone = config?.supportPhone || PHONE;
  const email = config?.supportEmail || EMAIL;

  // Accept common spellings (?tab=returns, ?tab=refund) and fall back to Exchange, so a stray link never shows a blank page.
  const rawTab = searchParams.get('tab');
  const urlTab = rawTab ? (TAB_ALIASES[rawTab.toLowerCase()] || 'return') : null;
  const [activeTab, setActiveTab] = useState(urlTab || TAB_ALIASES[defaultTab] || 'return');

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const setTab = (t) => {
    setActiveTab(t);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', t);
    setSearchParams(newParams, { replace: true });
  };

  // Live customer coins wallet
  const myCoinsQuery = useMyCoins();
  const walletCoins = myCoinsQuery.data?.balance || 0;

  // Catalogue products for exchange selection
  const { data: catalogueProducts = [] } = useQuery({
    queryKey: ['exchange-catalogue-products'],
    queryFn: () => api.products({ limit: 40 }),
    // Flatten what the widgets show: image URL, category name and the price the customer actually pays.
    select: (d) =>
      (d.items || d.products || []).map((p) => ({
        ...p,
        image: productImage(p),
        categoryName: p.category?.name || 'Luxury',
        price: p.finalPrice ?? p.salePrice ?? p.price,
      })),
    staleTime: 60 * 1000,
  });

  // Selected order for the return/exchange modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [requestType, setRequestType] = useState('exchange'); // 'return' | 'exchange'
  const [selectedItems, setSelectedItems] = useState({}); // { [productId-variantId]: quantity }
  const [reason, setReason] = useState(EXCHANGE_REASONS[0]);
  const [detailedReason, setDetailedReason] = useState('');

  // Exchange specific states (Big App Experience)
  const [exchangeMode, setExchangeMode] = useState('variant'); // 'variant' (same product swap) | 'product' (catalogue upgrade/different item) | 'replacement' (defective piece)
  const [exchangeVariant, setExchangeVariant] = useState('');
  const [exchangeReplacementId, setExchangeReplacementId] = useState('');
  const [exchangeNote, setExchangeNote] = useState('');
  const [useCoinsOnDifference, setUseCoinsOnDifference] = useState(true);

  // Return specific states
  const [refundMethod, setRefundMethod] = useState('Original Payment Method');
  const [upiId, setUpiId] = useState('');
  const [conditionConfirmed, setConditionConfirmed] = useState(true);

  // Guest order lookup state
  const [guestOrderId, setGuestOrderId] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestResult, setGuestResult] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);

  // Fetch logged in user's orders with return status & hidden countdown calculation
  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErr,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['returns', 'my-orders'],
    queryFn: api.myReturnOrders,
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const orders = ordersData?.orders || [];

  // Filter delivered vs others
  const deliveredOrders = useMemo(() => orders.filter((o) => o.orderStatus === 'Delivered'), [orders]);
  const otherOrders = useMemo(() => orders.filter((o) => o.orderStatus !== 'Delivered'), [orders]);

  // Active return/exchange requests
  const activeRequests = useMemo(() => {
    return orders
      .filter((o) => o.returnDetails?.hasActiveRequest)
      .map((o) => ({ order: o, request: o.returnDetails.activeRequest }));
  }, [orders]);

  const openModal = (order, type = 'exchange', preselectedReplacement = null) => {
    if (order.orderStatus === 'Cancelled') {
      toast.error('Order is cancelled. Returns or exchanges are not permitted.');
      return;
    }
    if (order.returnDetails?.isExpired) {
      toast.error('Once 7 days are complete for a specific item, no return or exchange will happen.');
      return;
    }
    setSelectedOrder(order);
    setRequestType(type);
    setReason(type === 'exchange' ? EXCHANGE_REASONS[0] : RETURN_REASONS[0]);
    setDetailedReason('');
    setExchangeMode(preselectedReplacement ? 'product' : 'variant');
    setExchangeVariant('');
    setExchangeReplacementId(preselectedReplacement?._id || '');
    setExchangeNote('');
    setUseCoinsOnDifference(true);
    setRefundMethod('Original Payment Method');
    setUpiId('');
    setConditionConfirmed(true);

    // Default select eligible items only (excluding items where 7 days completed or already requested)
    const initialItems = {};
    const itemsElig = order.returnDetails?.itemsEligibility || [];
    order.items.forEach((it) => {
      const match = itemsElig.find(
        (ie) => String(ie.productId) === String(it.productId) && (!it.variantId || String(ie.variantId) === String(it.variantId))
      );
      const isElig = match ? match.canReturn : !order.returnDetails?.isExpired;
      if (isElig) {
        const key = `${it.productId}-${it.variantId || 'default'}`;
        initialItems[key] = it.quantity;
      }
    });
    setSelectedItems(initialItems);
  };

  // Auto-open modal if navigated with query params ?order=...&type=...
  useEffect(() => {
    const orderIdParam = searchParams.get('order');
    const typeParam = searchParams.get('type') || 'exchange';
    if (orderIdParam && orders.length > 0 && !selectedOrder) {
      const found = orders.find((o) => o.orderId === orderIdParam || o._id === orderIdParam);
      if (found) {
        openModal(found, typeParam);
      }
    }
  }, [searchParams, orders, selectedOrder]);

  // Mutation to submit Return / Exchange
  const submitMutation = useMutation({
    mutationFn: (payload) => api.submitReturnExchange(payload),
    onSuccess: () => {
      toast.success(`${requestType === 'exchange' ? 'Exchange' : 'Return'} request submitted successfully!`);
      setSelectedOrder(null);
      qc.invalidateQueries({ queryKey: ['returns', 'my-orders'] });
      qc.invalidateQueries({ queryKey: ['my-coins'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit request.');
    },
  });

  // 1. Calculate selected original items total and quantities
  const { selectedItemsCount, selectedOriginalTotal } = useMemo(() => {
    if (!selectedOrder) return { selectedItemsCount: 0, selectedOriginalTotal: 0 };
    let count = 0;
    let total = 0;
    selectedOrder.items.forEach((it) => {
      const key = `${it.productId}-${it.variantId || 'default'}`;
      const qty = selectedItems[key] || 0;
      if (qty > 0) {
        count += qty;
        total += (it.unitPrice || 0) * qty;
      }
    });
    return { selectedItemsCount: count, selectedOriginalTotal: total };
  }, [selectedOrder, selectedItems]);

  // 2. Selected replacement product (if exchangeMode === 'product')
  const selectedReplacementProduct = useMemo(() => {
    if (exchangeMode !== 'product' || !exchangeReplacementId) return null;
    return catalogueProducts.find((p) => p._id === exchangeReplacementId || p.slug === exchangeReplacementId);
  }, [exchangeMode, exchangeReplacementId, catalogueProducts]);

  // 3. Complete Exchange Coin & Difference Calculation (All coin calculations in mind)
  const exchangeCalc = useMemo(() => {
    if (requestType !== 'exchange' || !selectedOrder) return null;

    let replacementTotal = selectedOriginalTotal;
    if (exchangeMode === 'product' && selectedReplacementProduct) {
      const repUnitPrice = selectedReplacementProduct.salePrice || selectedReplacementProduct.price || 0;
      replacementTotal = repUnitPrice * Math.max(1, selectedItemsCount);
    }

    const grossDifference = replacementTotal - selectedOriginalTotal;
    const isUpgrade = grossDifference > 0;
    const isDowngrade = grossDifference < 0;
    const isSameValue = grossDifference === 0;

    const maxCoinsApplicable = isUpgrade ? Math.min(walletCoins, grossDifference) : 0;
    const coinsApplied = (isUpgrade && useCoinsOnDifference) ? maxCoinsApplicable : 0;
    const netPayable = isUpgrade ? Math.max(0, grossDifference - coinsApplied) : 0;

    const excessRefund = isDowngrade ? Math.abs(grossDifference) : 0;
    const excessCoinsBonus = Math.round(excessRefund * 1.05); // +5% bonus store credit reward

    return {
      originalValue: selectedOriginalTotal,
      replacementValue: replacementTotal,
      grossDifference,
      isUpgrade,
      isDowngrade,
      isSameValue,
      coinsApplied,
      maxCoinsApplicable,
      netPayable,
      excessRefund,
      excessCoinsBonus,
      loyaltyCoinsRule: 'Coins will disburse 1 week (7 days) after delivery of the replacement product',
    };
  }, [requestType, selectedOrder, selectedOriginalTotal, selectedItemsCount, exchangeMode, selectedReplacementProduct, walletCoins, useCoinsOnDifference]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!conditionConfirmed) {
      toast.error('Please confirm the product is unused with original tags intact.');
      return;
    }

    const itemsPayload = [];
    selectedOrder.items.forEach((it) => {
      const key = `${it.productId}-${it.variantId || 'default'}`;
      const qty = selectedItems[key] || 0;
      if (qty > 0) {
        itemsPayload.push({
          productId: it.productId,
          productName: it.productName,
          variantId: it.variantId,
          variantName: it.variantName,
          SKU: it.SKU,
          image: it.image,
          quantity: qty,
          unitPrice: it.unitPrice,
          totalPrice: (it.unitPrice || 0) * qty,
        });
      }
    });

    if (!itemsPayload.length) {
      toast.error('Please select at least one item to return or exchange.');
      return;
    }

    if (requestType === 'exchange') {
      if (exchangeMode === 'product' && !exchangeReplacementId) {
        toast.error('Please select a replacement product from the catalogue.');
        return;
      }
    }

    if (requestType === 'return' && refundMethod === 'UPI' && !upiId.trim()) {
      toast.error('Please enter your UPI ID for refund processing.');
      return;
    }

    const exchangePreference = requestType === 'exchange' ? {
      exchangeType: exchangeMode,
      desiredSizeOrColor: exchangeMode === 'variant' ? exchangeVariant.trim() || 'Same as original' : '',
      desiredItemName: exchangeMode === 'product' && selectedReplacementProduct ? selectedReplacementProduct.name : (selectedOrder.items[0]?.productName || ''),
      replacementProductId: exchangeMode === 'product' ? exchangeReplacementId : undefined,
      notes: exchangeNote.trim(),
      coinCalculation: exchangeCalc,
    } : undefined;

    submitMutation.mutate({
      orderId: selectedOrder.orderId,
      type: requestType,
      reason,
      detailedReason,
      items: itemsPayload,
      exchangePreference,
      refundMethod: requestType === 'return' ? refundMethod : undefined,
      refundDetails: requestType === 'return' && refundMethod === 'UPI' ? { upiId } : undefined,
      conditionConfirmed,
    });
  };

  const handleGuestLookup = async (e) => {
    e.preventDefault();
    if (!guestOrderId.trim()) {
      toast.error('Please enter an Order ID');
      return;
    }
    if (!user && !guestEmail.trim()) {
      toast.error('Please enter the email used for this order');
      return;
    }
    setGuestLoading(true);
    setGuestResult(null);
    try {
      const res = await api.orderReturnEligibility(guestOrderId.trim(), user ? undefined : guestEmail.trim());
      setGuestResult(res);
    } catch (err) {
      toast.error(err.message || 'Order not found. Please check your Order ID.');
    } finally {
      setGuestLoading(false);
    }
  };

  const renderOrdersBlock = (mode = 'exchange') => {
    if (!user) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="card p-6 flex flex-col gap-4 bg-surface-container-lowest border border-surface-container-high shadow-xs">
            <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="lock" className="text-[24px]" />
            </span>
            <div>
              <h3 className="text-headline-sm font-bold">Sign in to manage your orders</h3>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Access your delivered orders with live 7-day countdown badges, coin calculation offsets, and 1-tap doorstep exchange or return requests.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Link to="/login?redirect=/exchange" className="btn-primary flex-1 text-center">
                Sign in
              </Link>
              <Link to="/register?redirect=/exchange" className="btn-tonal flex-1 text-center">
                Create account
              </Link>
            </div>
          </div>

          <div className="card p-6 flex flex-col gap-4 bg-surface-container-lowest border border-surface-container-high shadow-xs">
            <div>
              <span className="eyebrow">Guest Lookup</span>
              <h3 className="text-headline-sm font-bold mt-0.5">Check Order 7-Day Window</h3>
              <p className="text-body-sm text-on-surface-variant">
                Enter your Order ID (e.g. WT26-000042) and the email you ordered with to see return & exchange eligibility and time left.
              </p>
            </div>

            <form onSubmit={handleGuestLookup} className="flex flex-col gap-3">
              <Field label="Order ID">
                <Input
                  placeholder="e.g. WT26-000042"
                  value={guestOrderId}
                  onChange={(e) => setGuestOrderId(e.target.value)}
                  required
                />
              </Field>
              <Field label="Email used for the order">
                <Input type="email" placeholder="you@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required />
              </Field>
              <Button type="submit" loading={guestLoading} icon="search">
                Check Eligibility
              </Button>
            </form>

            {guestResult && (
              <div className="p-4 rounded-xl bg-surface-container-high border border-surface-container-highest flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[14px]">{guestResult.orderId}</span>
                  <span
                    className={cn(
                      'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                      guestResult.eligibility?.canReturnOrExchange
                        ? 'bg-success/15 text-success'
                        : 'bg-outline/20 text-on-surface-variant'
                    )}
                  >
                    {lookupStatus(guestResult.eligibility).badge}
                  </span>
                </div>
                {guestResult.eligibility?.canReturnOrExchange ? (
                  <p className="text-[13px] text-success font-semibold flex items-center gap-1.5">
                    <Icon name="timer" className="text-[16px]" />
                    {lookupStatus(guestResult.eligibility).text}
                  </p>
                ) : (
                  <p className="text-[12px] text-on-surface-variant">{lookupStatus(guestResult.eligibility).text}</p>
                )}
                <div className="pt-2 border-t border-outline/20 flex justify-between items-center text-[12px]">
                  <span className="text-on-surface-variant">Need assistance?</span>
                  <a href={`tel:${phone}`} className="text-secondary font-bold hover:underline">
                    Call {phone}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (ordersLoading) {
      return (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      );
    }

    if (ordersError) {
      return <ErrorState error={ordersErr} onRetry={refetchOrders} />;
    }

    if (orders.length === 0) {
      return (
        <div className="card p-8 text-center flex flex-col items-center gap-3 bg-surface-container-lowest border border-surface-container-high">
          <span className="w-14 h-14 rounded-2xl bg-surface-container-high text-outline flex items-center justify-center">
            <Icon name="receipt_long" className="text-[28px]" />
          </span>
          <h3 className="text-headline-sm font-bold">No orders found</h3>
          <p className="text-body-sm text-on-surface-variant max-w-md">
            Once you purchase a bag or gear from WILDTANE, your delivered items and 7-day return timelines will appear here.
          </p>
          <Link to="/shop" className="btn-primary mt-2">
            Browse Shop
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        {/* Delivered Orders List (Eligible / Expired) */}
        {deliveredOrders.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg uppercase tracking-wider text-outline flex items-center gap-2">
                <Icon name="check_circle" className="text-success text-[18px]" /> Delivered Orders ({deliveredOrders.length})
              </h3>
              <button
                type="button"
                onClick={() => refetchOrders()}
                className="btn-tonal text-[12px] h-8 px-2.5 flex items-center gap-1"
              >
                <Icon name="refresh" className="text-[15px]" /> Refresh
              </button>
            </div>

            {deliveredOrders.map((order) => {
              const ret = order.returnDetails || {};
              const hasActiveReq = ret.hasActiveRequest;
              const activeReq = ret.activeRequest;
              const canAct = ret.canReturnOrExchange;
              const isExpired = ret.isExpired;

              return (
                <div
                  key={order._id}
                  className="card p-4 sm:p-5 flex flex-col gap-4 hover:border-secondary/30 transition-colors shadow-sm bg-surface-container-lowest border border-surface-container-high"
                >
                  {/* Top Header: Order ID, Delivery Date, Countdown Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-high pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-title-md font-bold font-mono text-on-surface">{order.orderId}</span>
                      <StatusBadge status={order.orderStatus} />
                      <span className="text-body-sm text-on-surface-variant">
                        Delivered: {order.deliveredAt ? formatDate(order.deliveredAt) : 'Recently'}
                      </span>
                    </div>

                    {/* ── TIME LEFT BADGE / STATUS CHIP ── */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasActiveReq ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          <Icon name="sync" className="text-[15px] animate-spin" />
                          {activeReq?.type === 'exchange' ? 'Exchange' : 'Return'} {activeReq?.status || 'In Progress'}
                        </span>
                      ) : canAct ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm animate-pulse">
                          <Icon name="timer" className="text-[16px]" />
                          ⏱ {ret.daysLeft} {ret.daysLeft === 1 ? 'day' : 'days'} left to return or exchange
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-surface-container-highest text-on-surface-variant border border-outline/20">
                          <Icon name="lock" className="text-[14px]" /> 7-day window completed · Final Sale
                        </span>
                      ) : null}

                      {/* Coin Disbursement Status Badge */}
                      {order.orderStatus === 'Cancelled' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                          <CoinIcon className="w-3.5 h-3.5" />
                          Cancelled · 0 Coins Credited
                        </span>
                      ) : order.coinsEarned > 0 ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                            order.coinsDisbursed
                              ? 'bg-amber-400/20 text-[#a16207] dark:text-[#fde047]'
                              : 'bg-surface-container-high text-on-surface-variant'
                          )}
                        >
                          <CoinIcon className="w-3.5 h-3.5" />
                          {order.coinsDisbursed
                            ? `+${order.coinsEarned} Coins Disbursed`
                            : `+${order.coinsEarned} Coins Pending`}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Order Items List with item-level 7-day completion and return eligibility */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {order.items.map((it, idx) => {
                      const itemElig = ret.itemsEligibility?.find(
                        (ie) => String(ie.productId) === String(it.productId) && (!it.variantId || String(ie.variantId) === String(it.variantId))
                      );
                      const isItemExpired = itemElig?.isExpired || isExpired;
                      const isItemRequested = itemElig?.alreadyRequested;

                      return (
                        <div
                          key={`${it.productId}-${it.variantId || idx}`}
                          className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3 border border-surface-container-high/60"
                        >
                          <Img
                            src={it.image}
                            alt={it.productName}
                            className="w-16 h-16 rounded-lg object-cover shrink-0 ring-1 ring-surface-container-highest"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold truncate">{it.productName}</p>
                            <p className="text-[12px] text-on-surface-variant">
                              {it.variantName ? `${it.variantName} · ` : ''}Qty: {it.quantity}
                            </p>
                            <p className="text-[12px] font-semibold text-secondary">
                              {money(it.totalPrice || it.unitPrice * it.quantity)}
                            </p>
                            {isItemExpired ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-outline bg-surface-container-highest/80 px-2 py-0.5 rounded-md mt-1">
                                <Icon name="lock" className="text-[12px]" /> 7 days complete · Final sale (No return/exchange)
                              </span>
                            ) : isItemRequested ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md mt-1">
                                ⏳ Return/exchange in progress
                              </span>
                            ) : canAct ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md mt-1">
                                ✓ 7-day window active ({ret.daysLeft || 7}d left)
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Bar & Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-surface-container-high">
                    <div className="text-[12px] text-on-surface-variant">
                      Total paid: <strong className="text-on-surface">{money(order.grandTotal)}</strong> · Shipped to{' '}
                      {order.shippingAddress?.city}, {order.shippingAddress?.postalCode}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {canAct && (
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                          {mode === 'exchange' ? (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                icon="published_with_changes"
                                className="w-full sm:w-auto justify-center font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs"
                                onClick={() => openModal(order, 'exchange')}
                              >
                                Exchange (Receive Another Unit of Same Product - 7 Days)
                              </Button>
                              <Button
                                size="sm"
                                variant="tonal"
                                icon="assignment_return"
                                className="w-full sm:w-auto justify-center font-semibold border border-outline-variant/60"
                                onClick={() => openModal(order, 'return')}
                              >
                                Return for Refund (7-Day Policy)
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="tonal"
                                icon="assignment_return"
                                className="w-full sm:w-auto justify-center font-semibold border border-outline-variant/60"
                                onClick={() => openModal(order, 'return')}
                              >
                                Return for Refund (7-Day Policy)
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                icon="published_with_changes"
                                className="w-full sm:w-auto justify-center font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs"
                                onClick={() => openModal(order, 'exchange')}
                              >
                                Exchange (Receive Another Unit of Same Product - 7 Days)
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {hasActiveReq && (
                        <Link
                          to={`/account/orders/${order.orderId}`}
                          className="btn-tonal text-[12px] h-8 px-3 flex items-center gap-1"
                        >
                          Track Request Status <Icon name="chevron_right" className="text-[16px]" />
                        </Link>
                      )}

                      {isExpired && (
                        <span className="text-[12px] text-outline flex items-center gap-1">
                          <Icon name="lock" className="text-outline text-[16px]" /> 7-day window complete for item(s) · No return or exchange · Coins disbursed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* In Transit / Recent Orders */}
        {otherOrders.length > 0 && (
          <div className="flex flex-col gap-4 mt-2">
            <h3 className="text-label-lg uppercase tracking-wider text-outline flex items-center gap-2">
              <Icon name="local_shipping" className="text-secondary text-[18px]" /> Active Orders (In Transit) ({otherOrders.length})
            </h3>

            {otherOrders.map((order) => (
              <div
                key={order._id}
                className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-low/50"
              >
                <div className="flex items-center gap-3">
                  <Img
                    src={order.items[0]?.image}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-[14px]">{order.orderId}</span>
                      <StatusBadge status={order.orderStatus} />
                    </div>
                    <p className="text-[12px] text-on-surface-variant mt-0.5">
                      {order.items.map((i) => i.productName).join(', ')}
                    </p>
                    {order.orderStatus === 'Cancelled' ? (
                      <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                        🚫 Order cancelled — coins will not come and no return or exchange will happen.
                      </p>
                    ) : (
                      <p className="text-[11px] text-outline">
                        7-day return/exchange window activates on delivery day.
                      </p>
                    )}
                  </div>
                </div>

                <Link to={`/account/orders/${order.orderId}`} className="btn-tonal text-[12px] h-8 px-3 shrink-0">
                  Track Delivery
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFaqSection = () => (
    <section className="card p-6 mt-4 flex flex-col gap-6 bg-surface-container-lowest border border-surface-container-high">
      <div>
        <span className="eyebrow">Comprehensive Guide</span>
        <h2 className="text-headline-sm mt-1">Frequently Asked Questions on Returns & Exchanges</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-body-sm">
        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
          <h4 className="font-bold text-[14px] flex items-center gap-2 text-on-surface">
            <Icon name="published_with_changes" className="text-secondary" /> What do I receive in exchange?
          </h4>
          <p className="text-on-surface-variant text-[13px] leading-relaxed">
            In exchange, you receive another unit of the same product if eligible under our 7-day policy. Our courier delivers an identical hand-inspected replacement unit or your preferred size/color variation with ₹0 delivery charges. You can also upgrade to any bag across our catalogue using WILDTANE coins.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
          <h4 className="font-bold text-[14px] flex items-center gap-2 text-on-surface">
            <Icon name="event" className="text-secondary" /> How is the 7-day period calculated?
          </h4>
          <p className="text-on-surface-variant text-[13px] leading-relaxed">
            The 7-day period starts from the precise moment the delivery courier marks your parcel as "Delivered". Our system calculates the exact hours and days left, displaying an active countdown badge on your order.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
          <h4 className="font-bold text-[14px] flex items-center gap-2 text-on-surface">
            <Icon name="savings" className="text-secondary" /> What happens to coins if an order is cancelled?
          </h4>
          <p className="text-on-surface-variant text-[13px] leading-relaxed">
            <strong>If an order gets cancelled, coin rewards will not come.</strong> Pending coins for that order are cancelled and zeroed out. Any coins redeemed at checkout are promptly refunded back to your wallet balance.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
          <h4 className="font-bold text-[14px] flex items-center gap-2 text-on-surface">
            <Icon name="event" className="text-secondary" /> What happens once 7 days are complete for a specific item?
          </h4>
          <p className="text-on-surface-variant text-[13px] leading-relaxed">
            Once 7 days are complete following delivery for a specific item, <strong>no return or exchange will happen</strong> (item is final sale). At that moment, the reserved loyalty coins for that item permanently disburse into your active wallet balance!
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
          <h4 className="font-bold text-[14px] flex items-center gap-2 text-on-surface">
            <Icon name="local_shipping" className="text-secondary" /> How does doorstep pickup work?
          </h4>
          <p className="text-on-surface-variant text-[13px] leading-relaxed">
            Once approved, a reverse pickup courier partner is assigned to collect the parcel from your delivery address within 24 to 48 hours. Please ensure tags are intact and items are packed in the original box.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1.5">
          <h4 className="font-bold text-[14px] flex items-center gap-2 text-on-surface">
            <Icon name="headset_mic" className="text-secondary" /> How can I speak to a care executive?
          </h4>
          <p className="text-on-surface-variant text-[13px] leading-relaxed">
            You can call our dedicated customer care desk directly at <a href={`tel:${phone}`} className="font-bold text-secondary hover:underline">{phone}</a> or email <a href={`mailto:${email}`} className="font-bold text-secondary hover:underline">{email}</a>.
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-16">
      <Seo
        title="Returns & Exchange Portal | WILDTANE"
        description="Initiate hassle-free 7-day returns or exchanges. Free doorstep pickup, transparent status tracking, customer care helpline and instant coin disbursements."
      />

      {/* ── DYNAMIC HERO BANNER ────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-high/60 via-surface-container-low/40 to-surface pt-10 pb-8 md:pt-14 md:pb-10 border-b border-surface-container-high">
        <div className="container-x max-w-5xl">
          <div className="flex flex-col items-center text-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[12px] font-bold border transition-colors',
                activeTab === 'track'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  : 'bg-secondary/15 text-secondary border-secondary/30'
              )}
            >
              <Icon
                name={activeTab === 'track' ? 'track_changes' : 'verified'}
                className="text-[16px]"
              />
              {activeTab === 'track'
                ? 'Live Request Progress & Courier Dispatch Tracker'
                : '7-Day 100% Full Refund Policy · Doorstep Pickup'}
            </span>

            <h1 className="text-headline-xl md:text-[42px] font-serif font-black tracking-tight leading-tight">
              {activeTab === 'track'
                ? 'Track Returns & Exchanges'
                : 'Return & Exchange Portal'}
            </h1>

            <p className="text-body-md text-on-surface-variant max-w-2xl">
              {activeTab === 'track'
                ? 'Check real-time status of your pickup, reverse logistics verification, replacement dispatch, and coin disbursement.'
                : 'Changed your mind or need a different size? Request an exchange or return within 7 days from delivery. In exchange you receive another unit of the same product if eligible, or a 100% full refund.'}
            </p>

            {/* TAB SELECTOR CHIPS */}
            <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-surface-container-high/90 border border-surface-container-highest shadow-inner mt-4 w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setTab('return')}
                className={cn(
                  'px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 whitespace-nowrap',
                  activeTab === 'return'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                )}
              >
                <Icon name="assignment_return" className="text-[17px]" />
                <span>Return & Exchange</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('track')}
                className={cn(
                  'px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 whitespace-nowrap',
                  activeTab === 'track'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                )}
              >
                <Icon name="track_changes" className="text-[17px]" />
                <span>Track Status</span>
                {activeRequests.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[11px] font-black flex items-center justify-center">
                    {activeRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              ['local_shipping', '7 Days from Delivery', 'Counted automatically from courier drop-off'],
              ['published_with_changes', 'Seamless Exchange', 'Swap sizes or styles with zero hassle'],
              ['currency_rupee', '100% Full Refund', 'Original payment method or bank/UPI transfer'],
              ['savings', 'WILDTANE Coins Credit', 'Coins disburse into wallet 1 week after delivery'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="card p-3.5 flex flex-col gap-1 items-center text-center bg-surface-container-low/60">
                <span className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mb-1">
                  <Icon name={icon} className="text-[20px]" />
                </span>
                <p className="text-[13px] font-bold leading-tight">{title}</p>
                <p className="text-[11px] text-on-surface-variant leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUSTOMER CARE HELPLINE & EMAIL BAR ───────────────────── */}
      <section className="container-x max-w-5xl -mt-6 relative z-10">
        <div className="card p-4 sm:p-5 shadow-card bg-surface-container-lowest border-2 border-secondary/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-sm">
              <Icon name="support_agent" className="text-[28px]" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-secondary">Customer Care & Grievance Helpline</p>
              <h2 className="text-[17px] font-bold leading-tight">Need assistance with your return or exchange?</h2>
              <p className="text-[12px] text-on-surface-variant">
                WILDTANE Support Team is here to help · Mon – Sat: 9:30 AM – 6:30 PM IST
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center w-full md:w-auto">
            {/* Phone Call Button */}
            <a
              href={`tel:${phone}`}
              className="btn btn-primary h-11 px-4 text-[13px] font-semibold flex items-center gap-2 shadow-sm"
            >
              <Icon name="call" className="text-[18px]" />
              <span>Call {phone}</span>
            </a>

            {/* Email Support Button */}
            <a
              href={`mailto:${email}?subject=Return%20or%20Exchange%20Inquiry`}
              className="btn btn-tonal h-11 px-4 text-[13px] font-semibold flex items-center gap-2 border border-surface-container-high"
            >
              <Icon name="mail" className="text-[18px]" />
              <span>{email}</span>
            </a>

            {/* WhatsApp Link */}
            <a
              href={`https://wa.me/91${phone}?text=Hi%20WILDTANE%20Care%2C%20I%20have%20a%20question%20regarding%20my%20order%20return%2Fexchange.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] dark:text-[#25D366] h-11 px-3.5 text-[13px] font-semibold flex items-center gap-1.5"
            >
              <Icon name="chat" className="text-[18px]" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ACCORDING TO ACTIVE TAB ───────────────── */}
      <main className="container-x max-w-5xl mt-8">
        {activeTab === 'return' && (
          <div className="flex flex-col gap-8">
            {/* Cancellation, Coins & 7-Day Window Policy Notice */}
            <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 text-[#3a2508] bg-gradient-to-r from-[#fae7b9] via-[#f1cb7d] to-[#d4a04b] shadow-card flex flex-col sm:flex-row items-center gap-4">
              <CoinIcon className="w-12 h-12 shrink-0 drop-shadow" />
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-[15px] font-bold uppercase tracking-wide">
                  Order Cancellation, Coin Rules & 7-Day Item Window Policy
                </h3>
                <p className="text-[13px] mt-0.5 leading-relaxed opacity-90">
                  <strong>If an order gets cancelled, coin rewards will not come.</strong> Once 7 days are complete following delivery for a specific item, <strong>no return or exchange will happen</strong> (marked as Final Sale), and earned coins permanently disburse into your active wallet balance!
                </p>
              </div>
              <Link
                to="/account/coins"
                className="shrink-0 px-4 py-2 rounded-xl bg-[#261705] text-[#fae7b9] hover:bg-[#1a0f03] text-[12px] font-bold transition-colors whitespace-nowrap shadow-sm"
              >
                Check My Coins Wallet →
              </Link>
            </div>

            {/* Delivered Orders Station */}
            <div className="flex flex-col gap-4">
              <div className="border-b border-surface-container-high pb-3">
                <span className="eyebrow text-secondary">Step 1: Choose Your Order</span>
                <h3 className="text-headline-sm font-serif font-bold text-on-surface">
                  Delivered Orders for Return or Exchange (7-Day Window)
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Return any bag within 7 days of delivery for a 100% full refund to original payment or UPI. Exchange option is also available directly below.
                </p>
              </div>

              {renderOrdersBlock('return')}
            </div>

            {/* FAQ section */}
            {renderFaqSection()}
          </div>
        )}

        {activeTab === 'track' && (
          <div className="flex flex-col gap-8">
            <TrackRequestsWidget
              activeRequests={activeRequests}
              phone={phone}
              onOpenExchange={() => setTab('return')}
            />

            {/* Guest Order Checker */}
            <div className="card p-6 flex flex-col gap-4 bg-surface-container-lowest border border-surface-container-high">
              <div>
                <span className="eyebrow">Quick Status Lookup</span>
                <h3 className="text-headline-sm font-bold mt-0.5">Lookup Any Order Return / Exchange Window</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Enter your Order ID (e.g. WT26-000042) to check return eligibility, courier pickup status and remaining hours.
                </p>
              </div>

              <form onSubmit={handleGuestLookup} className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <Input
                  placeholder="e.g. WT26-000042"
                  value={guestOrderId}
                  onChange={(e) => setGuestOrderId(e.target.value)}
                  className="flex-1"
                  required
                />
                {!user && (
                  <Input type="email" placeholder="Email used for the order" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="flex-1" required />
                )}
                <Button type="submit" loading={guestLoading} icon="search">
                  Check Status
                </Button>
              </form>

              {guestResult && (
                <div className="p-4 rounded-xl bg-surface-container-high border border-surface-container-highest flex flex-col gap-2 max-w-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[14px]">{guestResult.orderId}</span>
                    <span
                      className={cn(
                        'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                        guestResult.eligibility?.canReturnOrExchange
                          ? 'bg-success/15 text-success'
                          : 'bg-outline/20 text-on-surface-variant'
                      )}
                    >
                      {lookupStatus(guestResult.eligibility).badge}
                    </span>
                  </div>
                  {guestResult.eligibility?.canReturnOrExchange ? (
                    <p className="text-[13px] text-success font-semibold flex items-center gap-1.5">
                      <Icon name="timer" className="text-[16px]" />
                      {lookupStatus(guestResult.eligibility).text}
                    </p>
                  ) : (
                    <p className="text-[12px] text-on-surface-variant">{lookupStatus(guestResult.eligibility).text}</p>
                  )}
                  <div className="pt-2 border-t border-outline/20 flex justify-between items-center text-[12px]">
                    <span className="text-on-surface-variant">Assistance required?</span>
                    <a href={`tel:${phone}`} className="text-secondary font-bold hover:underline">
                      Call {phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── INTERACTIVE RETURN / EXCHANGE MODAL ────────────────── */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={requestType === 'exchange' ? 'Exchange Product' : 'Return Product for Refund'}
        size="lg"
      >
        {selectedOrder && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Type selector toggle: Return first, Exchange directly below return */}
            <div className="flex flex-col gap-2 p-1.5 bg-surface-container-high rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setRequestType('return');
                  setReason(RETURN_REASONS[0]);
                }}
                className={cn(
                  'w-full py-2.5 px-4 rounded-xl text-[13.5px] font-bold transition-all flex items-center justify-between',
                  requestType === 'return'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60'
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon name="assignment_return" className="text-[19px]" /> 1. Return Product for Refund
                </span>
                <span className="text-[11px] font-semibold opacity-85 bg-white/20 px-2 py-0.5 rounded-full">
                  7-Day Doorstep Policy
                </span>
              </button>

              {/* Exchange option placed directly below return */}
              <button
                type="button"
                onClick={() => {
                  setRequestType('exchange');
                  setReason(EXCHANGE_REASONS[0]);
                }}
                className={cn(
                  'w-full py-2.5 px-4 rounded-xl text-[13.5px] font-bold transition-all flex items-center justify-between',
                  requestType === 'exchange'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60'
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon name="published_with_changes" className="text-[19px]" /> 2. Exchange Product (Swap Variant or Model)
                </span>
                <span className="text-[11px] font-semibold opacity-85 bg-white/20 px-2 py-0.5 rounded-full">
                  7-Day Doorstep Policy
                </span>
              </button>
            </div>

            {/* Select items to return/exchange */}
            <div className="flex flex-col gap-2">
              <label className="text-label-md font-bold">
                Select items from Order {selectedOrder.orderId} to {requestType === 'exchange' ? 'exchange' : 'return'}:
              </label>
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto scrollbar-none pr-1">
                {selectedOrder.items.map((it) => {
                  const key = `${it.productId}-${it.variantId || 'default'}`;
                  const itemsElig = selectedOrder.returnDetails?.itemsEligibility || [];
                  const match = itemsElig.find(
                    (ie) => String(ie.productId) === String(it.productId) && (!it.variantId || String(ie.variantId) === String(it.variantId))
                  );
                  const isItemExpired = match?.isExpired || selectedOrder.returnDetails?.isExpired;
                  const isAlreadyRequested = match?.alreadyRequested;
                  const isItemDisabled = isItemExpired || isAlreadyRequested || selectedOrder.orderStatus === 'Cancelled';
                  const selectedQty = selectedItems[key] || 0;
                  const isChecked = selectedQty > 0;

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        if (isItemDisabled) return;
                        setSelectedItems((prev) => ({
                          ...prev,
                          [key]: isChecked ? 0 : it.quantity,
                        }));
                      }}
                      className={cn(
                        'p-3 rounded-xl border flex items-center gap-3 transition-colors',
                        isItemDisabled
                          ? 'opacity-60 bg-surface-container-high/40 border-outline/20 cursor-not-allowed'
                          : isChecked
                          ? 'border-secondary bg-secondary/5 cursor-pointer'
                          : 'border-surface-container-high bg-surface-container-lowest cursor-pointer'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isItemDisabled}
                        onChange={() => {}} // Handled by container onClick
                        className="w-4 h-4 rounded text-secondary disabled:opacity-50"
                      />
                      <Img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate">{it.productName}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {it.variantName ? `${it.variantName} · ` : ''}SKU: {it.SKU}
                        </p>
                        {isItemExpired && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                            🔒 7 days complete · No return or exchange
                          </span>
                        )}
                        {isAlreadyRequested && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                            ⏳ Return/exchange already requested
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] font-semibold text-secondary shrink-0">
                        {money(it.unitPrice)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reason selector */}
            <Field label={`Reason for ${requestType === 'exchange' ? 'exchange' : 'return'}`} required>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input h-11"
                required
              >
                {(requestType === 'exchange' ? EXCHANGE_REASONS : RETURN_REASONS).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            {/* BIG-APP EXCHANGE FEATURE & FULL COIN CALCULATION */}
            {requestType === 'exchange' ? (
              <div className="flex flex-col gap-4 p-4 rounded-2xl bg-surface-container-low/80 border border-teal-500/30">
                <div>
                  <label className="text-label-md font-bold text-on-surface flex items-center gap-1.5 mb-2">
                    <Icon name="swap_horiz" className="text-teal-600 dark:text-teal-400 text-[18px]" /> Choose Exchange Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setExchangeMode('variant')}
                      className={cn(
                        'p-3 rounded-xl border text-left flex flex-col gap-1 transition-all',
                        exchangeMode === 'variant'
                          ? 'border-teal-500 bg-teal-500/10 text-on-surface ring-1 ring-teal-500/50'
                          : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                      )}
                    >
                      <span className="font-bold text-[13px]">📦 Receive Another Unit (Same Product)</span>
                      <span className="text-[11px] opacity-80">Size/color swap or fresh piece · Free (₹0)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExchangeMode('product')}
                      className={cn(
                        'p-3 rounded-xl border text-left flex flex-col gap-1 transition-all',
                        exchangeMode === 'product'
                          ? 'border-teal-500 bg-teal-500/10 text-on-surface ring-1 ring-teal-500/50'
                          : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                      )}
                    >
                      <span className="font-bold text-[13px]">🔄 Different Product Model</span>
                      <span className="text-[11px] opacity-80">Pick from Catalogue · Difference adjusted with Coins</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExchangeMode('replacement')}
                      className={cn(
                        'p-3 rounded-xl border text-left flex flex-col gap-1 transition-all',
                        exchangeMode === 'replacement'
                          ? 'border-teal-500 bg-teal-500/10 text-on-surface ring-1 ring-teal-500/50'
                          : 'border-surface-container-high bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low'
                      )}
                    >
                      <span className="font-bold text-[13px]">🛡️ Damaged Piece Replacement</span>
                      <span className="text-[11px] opacity-80">Fresh New Pristine Unit · ₹0 Difference</span>
                    </button>
                  </div>

                  {/* Policy banner inside exchange modal */}
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-start gap-2.5 text-[12px] text-teal-900 dark:text-teal-200 mt-2">
                    <Icon name="verified" className="text-[17px] text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <span><strong>Exchange Policy Guarantee:</strong> In exchange, you receive another unit of the same product if eligible. Doorstep courier delivers your new piece and collects the original parcel in a single visit.</span>
                  </div>
                </div>

                {/* Sub-inputs depending on exchange mode */}
                {exchangeMode === 'variant' && (
                  <Field label="Different size or colour (optional)" hint="Leave blank to receive another unit of the same product, same size and colour.">
                    <Input
                      placeholder="e.g. Navy Blue instead of Black"
                      value={exchangeVariant}
                      onChange={(e) => setExchangeVariant(e.target.value)}
                    />
                  </Field>
                )}

                {exchangeMode === 'product' && (
                  <div className="flex flex-col gap-3">
                    <Field label="Select Replacement Product from WILDTANE Catalogue" required>
                      <select
                        value={exchangeReplacementId}
                        onChange={(e) => setExchangeReplacementId(e.target.value)}
                        className="input h-11"
                        required
                      >
                        <option value="">-- Choose a product from catalogue --</option>
                        {catalogueProducts.map((p) => {
                          const pPrice = p.salePrice || p.price || 0;
                          return (
                            <option key={p._id} value={p._id}>
                              {p.name} — {money(pPrice)} {p.category?.name ? `(${p.category.name})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </Field>

                    {selectedReplacementProduct && (
                      <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center gap-3">
                        <Img
                          src={selectedReplacementProduct.images?.[0]?.url || selectedReplacementProduct.image}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-on-surface truncate">{selectedReplacementProduct.name}</p>
                          <p className="text-[12px] font-semibold text-secondary">
                            Price: {money(selectedReplacementProduct.salePrice || selectedReplacementProduct.price)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {exchangeMode === 'replacement' && (
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[12px] text-teal-800 dark:text-teal-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <Icon name="verified" className="text-[16px]" /> Free Doorstep Replacement Guaranteed
                    </p>
                    <p className="mt-0.5 opacity-90">
                      Our courier will deliver a fresh, brand-new replacement unit of the exact same product and collect the defective piece simultaneously.
                    </p>
                  </div>
                )}

                {/* DYNAMIC COIN CALCULATION ENGINE BREAKDOWN CARD */}
                {exchangeCalc && (
                  <div className="p-4 rounded-xl bg-surface-container-lowest border border-amber-500/40 shadow-xs flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <CoinIcon className="w-4 h-4" /> Exchange Price &amp; Coin Calculation
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200">
                        Wallet Balance: {walletCoins} Coins
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Original Item(s) Value:</span>
                        <span className="font-semibold">{money(exchangeCalc.originalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Replacement Product Value:</span>
                        <span className="font-semibold">{money(exchangeCalc.replacementValue)}</span>
                      </div>

                      {/* If Upgrade: Gross difference + Coin redemption option */}
                      {exchangeCalc.isUpgrade && (
                        <>
                          <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold pt-1 border-t border-surface-container-high">
                            <span>Price Difference (Upgrade):</span>
                            <span>+{money(exchangeCalc.grossDifference)}</span>
                          </div>

                          {walletCoins > 0 ? (
                            <label className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 cursor-pointer mt-1 select-none">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={useCoinsOnDifference}
                                  onChange={(e) => setUseCoinsOnDifference(e.target.checked)}
                                  className="rounded text-amber-600"
                                />
                                <span className="text-[12px] font-bold text-on-surface">
                                  Use available WILDTANE Coins for extra discount
                                </span>
                              </div>
                              <span className="text-[12px] font-extrabold text-emerald-700 dark:text-emerald-400">
                                −{money(exchangeCalc.coinsApplied)}
                              </span>
                            </label>
                          ) : null}

                          <div className="flex justify-between text-[14px] font-black pt-1 border-t border-surface-container-high">
                            <span>Net Payable at Doorstep / Delivery:</span>
                            <span className="text-primary font-sans">{money(exchangeCalc.netPayable)}</span>
                          </div>
                        </>
                      )}

                      {/* If Downgrade: Excess refund directly to Coins */}
                      {exchangeCalc.isDowngrade && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex flex-col gap-1 mt-1">
                          <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                            <span>Excess Amount Refundable:</span>
                            <span>{money(exchangeCalc.excessRefund)}</span>
                          </div>
                          <p className="text-[11.5px] text-on-surface-variant">
                            ✨ Excess of {money(exchangeCalc.excessRefund)} will be credited instantly as <strong>{exchangeCalc.excessCoinsBonus} WILDTANE Store Coins</strong> (+5% bonus store credit!) into your wallet upon exchange.
                          </p>
                        </div>
                      )}

                      {/* If Same Value */}
                      {exchangeCalc.isSameValue && (
                        <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-300 pt-1 border-t border-surface-container-high">
                          <span>Price Difference:</span>
                          <span>₹0 (100% Free Doorstep Swap)</span>
                        </div>
                      )}
                    </div>

                    {/* Loyalty coins disbursement rule notice */}
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11.5px] text-on-surface-variant">
                      <CoinIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Loyalty Coins Rule:</strong> Loyalty coins earned on this order ({selectedOrder.coinsEarned || 0} coins) will be credited into your wallet <strong>1 week (7 days) after delivery</strong> of the replacement product, once the 7-day exchange window completes.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Return specific: Refund Method */
              <div className="flex flex-col gap-3">
                <Field label="Refund Destination Preference">
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="input h-11"
                  >
                    <option value="Original Payment Method">Original Payment Method (Card/Netbanking/UPI)</option>
                    <option value="UPI">UPI ID Transfer (Instant Doorstep Settlement)</option>
                    <option value="Store Coins Wallet">Instant WILDTANE Store Coins (+5% Bonus Coins)</option>
                    <option value="Bank Transfer">Bank Account NEFT</option>
                  </select>
                </Field>

                {refundMethod === 'UPI' && (
                  <Field label="Your UPI ID" required>
                    <Input
                      placeholder="e.g. yourname@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                    />
                  </Field>
                )}

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11.5px] text-on-surface-variant">
                  <CoinIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>Coin Adjustment on Return:</strong> Coins used originally will be restored to your wallet upon return approval. Any reserved loyalty coins earned on this purchase will be cancelled.
                  </span>
                </div>
              </div>
            )}

            {/* Comments / Details */}
            <Field label="Additional notes or instructions (Optional)">
              <Textarea
                rows={2}
                placeholder="Mention any specific instructions for reverse courier pickup or exchange preferences..."
                value={detailedReason}
                onChange={(e) => setDetailedReason(e.target.value)}
                maxLength={500}
              />
            </Field>

            {/* Doorstep Pickup Address preview */}
            <div className="p-3 rounded-xl bg-surface-container-high/60 text-[12px] flex items-start gap-2.5">
              <Icon name="location_on" className="text-secondary text-[18px] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-on-surface">Doorstep Pickup &amp; Exchange Delivery Address:</p>
                <p className="text-on-surface-variant">
                  {selectedOrder.shippingAddress?.fullName} · {selectedOrder.shippingAddress?.addressLine1},{' '}
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.postalCode} · Phone:{' '}
                  {selectedOrder.shippingAddress?.phone}
                </p>
              </div>
            </div>

            {/* Condition agreement checkbox */}
            <label className="flex items-start gap-2 text-[12px] text-on-surface-variant cursor-pointer select-none">
              <input
                type="checkbox"
                checked={conditionConfirmed}
                onChange={(e) => setConditionConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-secondary"
                required
              />
              <span>
                I confirm the product is <strong>unused, undamaged, and unwashed</strong> with all original brand tags,
                packaging and invoices intact as per WILDTANE 7-day policy guidelines.
              </span>
            </label>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-container-high">
              <Button type="button" variant="tonal" onClick={() => setSelectedOrder(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitMutation.isPending}
                className={requestType === 'exchange' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold' : ''}
              >
                Submit {requestType === 'exchange' ? 'Exchange (7-Day Policy)' : 'Return (7-Day Policy)'} Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
