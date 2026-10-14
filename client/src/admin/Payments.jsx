import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, formatINR } from '../lib/format';
import { EmptyState, Icon, Pagination, Skeleton, StatusBadge } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

const TABS = [
  ['transactions', 'receipt_long', 'Payments'],
  ['customers', 'groups', 'By customer'],
  ['refunds', 'currency_exchange', 'Refunds to send'],
];
const METHOD = { razorpay: 'Online (Razorpay)', cod: 'Cash on delivery', wtwallet: 'Wallet', giftcard: 'Gift card' };

function Copy({ text, label }) {
  if (!text) return null;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 justify-self-start w-fit font-mono text-[12.5px] px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high"
      onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success(`${label} copied`), () => toast.error('Could not copy'))}
      title={`Copy ${label}`}
    >
      {text} <Icon name="content_copy" className="text-[13px] text-outline" />
    </button>
  );
}

/** Where a return refund should go, with copy buttons for the transfer. */
export function PayoutDetails({ method, details = {} }) {
  if (method === 'UPI') return <p className="flex flex-wrap items-center gap-1.5 text-body-sm">UPI <Copy text={details.upiId} label="UPI ID" /></p>;
  if (method === 'Bank Transfer')
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm items-center">
        <span className="text-outline">Name</span><Copy text={details.accountHolder} label="Name" />
        <span className="text-outline">Account</span><Copy text={details.accountNumber} label="Account number" />
        <span className="text-outline">IFSC</span><Copy text={details.ifsc} label="IFSC" />
        {details.bankName && <><span className="text-outline">Bank</span><span>{details.bankName}</span></>}
      </div>
    );
  return <p className="text-body-sm">{method || 'Original payment method'}</p>;
}

function Stat({ icon, label, value, hint, tone }) {
  return (
    <div className="card surface-card border border-outline-variant/60 p-4 flex items-start gap-3">
      <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tone || 'bg-secondary/10 text-secondary')}><Icon name={icon} className="text-[22px]" /></span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-outline font-bold">{label}</p>
        <p className="text-[20px] font-bold leading-tight tabular-nums">{value}</p>
        {hint && <p className="text-[11.5px] text-on-surface-variant">{hint}</p>}
      </div>
    </div>
  );
}

function RefundQueue() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'payments', 'refunds'], queryFn: adminApi.refundQueue, refetchInterval: 60 * 1000 });
  const done = () => { qc.invalidateQueries({ queryKey: ['admin', 'payments'] }); qc.invalidateQueries({ queryKey: ['admin', 'returns'] }); };
  const sent = useMutation({ mutationFn: ({ id, ref }) => adminApi.markReturnRefunded(id, ref), onSuccess: () => { toast.success('Refund recorded as sent'); done(); }, onError: (e) => toast.error(e.message) });
  const send = useMutation({ mutationFn: (id) => adminApi.retryRefund(id), onSuccess: (d) => { toast.success(d.order?.refundDetails?.status === 'Failed' ? 'Refund still failing — see the reason' : 'Refund sent'); done(); }, onError: (e) => toast.error(e.message) });
  if (q.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  const returns = q.data?.returns || [];
  const orders = q.data?.orders || [];
  if (!returns.length && !orders.length) return <EmptyState icon="task_alt" title="Nothing to refund right now" description="Return refunds by UPI or bank transfer, refunds waiting for your approval and failed refunds appear here." />;
  return (
    <div className="flex flex-col gap-3">
      {orders.map((o) => (
        <div key={o._id} className="card surface-card border border-outline-variant/60 p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Cancelled order <Link to={`/admin/orders/${o.orderId}`} className="text-secondary hover:underline">{o.orderId}</Link> · {o.customerName}</p>
            <p className="text-body-sm text-on-surface-variant">{formatINR(o.refundDetails?.amount || 0)} back to the original payment, gift card and wallet · <StatusBadge status={o.refundDetails?.status} /></p>
            {o.refundDetails?.parts?.filter((p) => p.failureReason).map((p, i) => <p key={i} className="text-label-sm text-error">{p.failureReason}</p>)}
          </div>
          {['Awaiting approval', 'Failed'].includes(o.refundDetails?.status) && (
            <button type="button" className="btn-primary h-10 gap-1.5" disabled={send.isPending} onClick={() => send.mutate(o._id)}>
              <Icon name="send_money" className="text-[18px]" /> {o.refundDetails.status === 'Failed' ? 'Retry refund' : 'Refund now'}
            </button>
          )}
        </div>
      ))}
      {returns.map((r) => (
        <div key={r._id} className="card surface-card border border-outline-variant/60 p-4 flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <p className="font-semibold">
              Return <span className="font-mono text-secondary">{r.requestId}</span> · order <Link to={`/admin/orders/${r.orderId}`} className="text-secondary hover:underline">{r.orderId}</Link> · {r.user?.name || 'Customer'}
            </p>
            <p className="text-body-sm text-on-surface-variant">Send <b className="text-on-surface">{formatINR(r.refund?.amount || 0)}</b> · {r.user?.phone || r.user?.email || ''}</p>
            <PayoutDetails method={r.refundMethod} details={r.refundDetails} />
            {r.refund?.failureReason && <p className="text-label-sm text-error">{r.refund.failureReason}</p>}
          </div>
          {!r.refund?.providerRefundId && (
            <button
              type="button"
              className="btn-primary h-10 gap-1.5 shrink-0"
              disabled={sent.isPending}
              onClick={() => {
                const ref = window.prompt(`Only confirm after you have sent ${formatINR(r.refund?.amount || 0)}. UTR / transaction reference (required — the customer sees it):`);
                if (ref !== null && ref.trim().length >= 4) sent.mutate({ id: r._id, ref: ref.trim() });
                else if (ref !== null) toast.error('Enter the UTR / transaction reference (at least 4 characters).');
              }}
            >
              <Icon name="task_alt" className="text-[18px]" /> I have sent it
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Payments() {
  const [tab, setTab] = useState('transactions');
  const [p, set] = useListParams({ page: '1' });
  const filters = { q: p.q, method: p.method, status: p.status, from: p.from, to: p.to };
  const summary = useQuery({ queryKey: ['admin', 'payments', 'summary', filters], queryFn: () => adminApi.paymentsSummary(filters), placeholderData: keepPreviousData });
  const list = useQuery({
    queryKey: ['admin', 'payments', tab, p],
    queryFn: () => (tab === 'customers' ? adminApi.paymentCustomers({ ...p, limit: 25 }) : adminApi.paymentTransactions({ ...p, limit: 25 })),
    enabled: tab !== 'refunds',
    placeholderData: keepPreviousData,
  });
  const s = summary.data?.summary;

  const txColumns = [
    { key: 'order', header: 'Order', render: (o) => <div className="whitespace-nowrap"><Link to={`/admin/orders/${o.orderId}`} className="font-semibold text-secondary hover:underline">{o.orderId}</Link><p className="text-label-sm text-outline">{formatDateTime(o.createdAt)}</p></div> },
    { key: 'customer', header: 'Customer', render: (o) => <div className="min-w-[150px]"><p className="font-medium truncate">{o.customerName}</p><p className="text-label-sm text-outline truncate">{o.phone || o.email}</p></div> },
    { key: 'method', header: 'Method', render: (o) => <div><p className="text-body-sm">{METHOD[o.paymentMethod] || o.paymentMethod}</p>{o.reference && <p className="text-[11px] font-mono text-outline truncate max-w-[160px]">{o.reference}</p>}</div> },
    { key: 'status', header: 'Payment', render: (o) => <StatusBadge status={o.paymentStatus} /> },
    { key: 'total', header: 'Order total', align: 'right', render: (o) => <span className="tabular-nums">{formatINR(o.grandTotal + (o.giftCard?.amount || 0) + (o.walletAmount || 0))}</span> },
    { key: 'paid', header: 'Paid', align: 'right', render: (o) => <b className="tabular-nums">{formatINR(o.paid)}</b> },
    { key: 'refunded', header: 'Refunded', align: 'right', render: (o) => <span className={cn('tabular-nums', o.refunded > 0 ? 'text-error font-semibold' : 'text-outline')}>{o.refunded > 0 ? `−${formatINR(o.refunded)}` : '—'}</span> },
  ];
  const custColumns = [
    { key: 'name', header: 'Customer', render: (c) => <div className="min-w-[160px]">{c._id ? <Link to={`/admin/customers/${c._id}`} className="font-semibold text-secondary hover:underline">{c.name}</Link> : <span className="font-semibold">{c.name}</span>}<p className="text-label-sm text-outline truncate">{c.phone || c.email}</p></div> },
    { key: 'orders', header: 'Orders', align: 'right', render: (c) => c.orders },
    { key: 'paid', header: 'Paid', align: 'right', render: (c) => <b className="tabular-nums">{formatINR(c.paid)}</b> },
    { key: 'refunded', header: 'Refunded', align: 'right', render: (c) => <span className={cn('tabular-nums', c.refunded > 0 ? 'text-error' : 'text-outline')}>{c.refunded > 0 ? `−${formatINR(c.refunded)}` : '—'}</span> },
    { key: 'net', header: 'Net', align: 'right', render: (c) => <b className="tabular-nums">{formatINR(c.net)}</b> },
    { key: 'due', header: 'COD due', align: 'right', render: (c) => <span className="tabular-nums text-on-surface-variant">{c.codDue > 0 ? formatINR(c.codDue) : '—'}</span> },
    { key: 'last', header: 'Last order', render: (c) => <span className="text-label-sm text-outline whitespace-nowrap">{formatDateTime(c.lastOrder)}</span> },
  ];

  return (
    <>
      <PageHeader title="Payments" eyebrow="Sales" subtitle="Who paid how much, what was refunded, and refunds still to send." />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-space-lg">
        {!s ? [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[84px] rounded-xl" />) : (
          <>
            <Stat icon="payments" label="Collected" value={formatINR(s.collected)} hint={`${formatINR(s.online)} online · ${formatINR(s.cod)} COD`} tone="bg-emerald-600/10 text-emerald-700 dark:text-emerald-300" />
            <Stat icon="undo" label="Refunded" value={formatINR(s.refunded)} tone="bg-rose-600/10 text-rose-700 dark:text-rose-300" />
            <Stat icon="account_balance" label="Net" value={formatINR(s.net)} hint={`${s.orders} orders`} />
            <Stat icon="local_shipping" label="COD to collect" value={formatINR(s.codDue)} hint="Open cash-on-delivery orders" tone="bg-sky-600/10 text-sky-700 dark:text-sky-300" />
            <button type="button" onClick={() => setTab('refunds')} className="text-left">
              <Stat icon="currency_exchange" label="Refunds to send" value={s.toSend.count ? formatINR(s.toSend.amount) : '₹0'} hint={s.toSend.count ? `${s.toSend.count} waiting — open the list` : 'All sent'} tone={s.toSend.count ? 'bg-rose-600 text-white' : undefined} />
            </button>
          </>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-space-md border-b border-surface-container-high">
        {TABS.map(([id, icon, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn('inline-flex items-center gap-1.5 px-3 py-2.5 text-label-md whitespace-nowrap border-b-2 -mb-px', tab === id ? 'border-secondary font-bold text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface')}>
            <Icon name={icon} className="text-[18px]" /> {label}
            {id === 'refunds' && s?.toSend?.count > 0 && <span className="ml-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] leading-5 text-center">{s.toSend.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'refunds' ? <RefundQueue /> : (
        <>
          <Toolbar>
            <SearchBox value={p.q} onChange={(q) => set({ q, page: '1' })} placeholder="Order ID, name, phone, email or payment ID…" />
            <FilterSelect label="Method" value={p.method} onChange={(method) => set({ method, page: '1' })} options={[['', 'All methods'], ['razorpay', 'Online (Razorpay)'], ['cod', 'Cash on delivery']]} />
            <FilterSelect label="Payment status" value={p.status} onChange={(status) => set({ status, page: '1' })} options={[['', 'Any status'], ['Paid', 'Paid'], ['Pending', 'Pending'], ['Failed', 'Failed'], ['Refunded', 'Refunded'], ['Partially Refunded', 'Partly refunded']]} />
            <label className="flex items-center gap-1.5 text-label-sm text-outline">From <input type="date" className="input h-10" value={p.from || ''} onChange={(e) => set({ from: e.target.value, page: '1' })} /></label>
            <label className="flex items-center gap-1.5 text-label-sm text-outline">To <input type="date" className="input h-10" value={p.to || ''} onChange={(e) => set({ to: e.target.value, page: '1' })} /></label>
          </Toolbar>
          <DataTable
            columns={tab === 'customers' ? custColumns : txColumns}
            rows={list.data?.items || []}
            loading={list.isLoading}
            error={list.error}
            onRetry={list.refetch}
            empty={<EmptyState icon="payments" title="No payments match" description="Try another search, method or date range." />}
          />
          <Pagination className="mt-space-md" page={list.data?.page} pages={list.data?.pages} onChange={(page) => set({ page: String(page) })} />
        </>
      )}
    </>
  );
}
