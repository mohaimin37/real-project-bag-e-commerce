import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, formatINR, ORDER_STATUSES, PAYMENT_LABELS } from '../lib/format';
import { countryByCode } from '../lib/countries';
import { EmptyState, Icon, Pagination, StatusBadge } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

export default function Orders() {
  const [p, set] = useListParams({ page: '1' });
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['admin', 'orders', p], queryFn: () => adminApi.orders({ ...p, limit: 15 }), placeholderData: keepPreviousData });

  const columns = [
    {
      key: 'orderId',
      header: 'Order',
      render: (o) => (
        <div className="whitespace-nowrap">
          <p className="text-label-lg">{o.orderId}</p>
          <p className="text-label-sm font-normal text-outline">{formatDateTime(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div className="min-w-[160px]">
          <p className="truncate">{o.customerName}</p>
          <p className="text-label-sm font-normal text-outline truncate">{o.email}</p>
        </div>
      ),
    },
    { key: 'dest', header: 'Ship to', render: (o) => <span className="whitespace-nowrap">{countryByCode(o.shippingAddress.country)?.flag} {o.shippingAddress.city}</span> },
    { key: 'items', header: 'Items', align: 'right', render: (o) => o.items.reduce((n, i) => n + i.quantity, 0) },
    { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="text-label-lg whitespace-nowrap">{formatINR(o.grandTotal)}</span> },
    {
      key: 'payment',
      header: 'Payment',
      render: (o) => (
        <div className="whitespace-nowrap">
          <StatusBadge status={o.paymentStatus} />
          <p className="text-label-sm font-normal text-outline mt-0.5">{PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={o.orderStatus} />
          {o.cancellation?.status === 'Requested' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 animate-pulse">
              <Icon name="hourglass_top" className="text-[12px]" /> Cancel Requested
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'print',
      header: '',
      align: 'right',
      render: (o) => (
        <button
          type="button"
          className="btn-icon"
          title="Print bill"
          aria-label={`Print bill for ${o.orderId}`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/orders/${o.orderId}?print=1`);
          }}
        >
          <Icon name="print" className="text-[20px]" />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Orders" subtitle={query.data ? `${query.data.total} orders` : ' '} />
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-space-md border-b border-surface-container-high">
        {['', ...ORDER_STATUSES].map((s) => (
          <button key={s || 'all'} type="button" onClick={() => set({ status: s, cancellationStatus: '' })} className={cn('px-3 py-2.5 text-label-md whitespace-nowrap border-b-2 -mb-px transition-colors', !p.cancellationStatus && (p.status || '') === s ? 'border-secondary text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface')}>
            {s || 'All orders'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => set({ status: '', cancellationStatus: 'Requested' })}
          className={cn(
            'px-3 py-2.5 text-label-md whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-1.5 font-bold',
            p.cancellationStatus === 'Requested'
              ? 'border-error text-error'
              : 'border-transparent text-error/80 hover:text-error'
          )}
        >
          <Icon name="hourglass_top" className="text-[16px]" />
          Cancellation Requests
        </button>
      </div>
      <Toolbar>
        <SearchBox value={p.q} onChange={(q) => set({ q })} placeholder="Order ID, name, email or phone…" />
        <FilterSelect label="Payment status" value={p.paymentStatus} onChange={(v) => set({ paymentStatus: v })} options={[['', 'Any payment'], ['Pending', 'Pending'], ['Paid', 'Paid'], ['Failed', 'Failed'], ['Refunded', 'Refunded']]} />
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant">From <input type="date" className="input h-10 w-auto" value={p.from || ''} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant">To <input type="date" className="input h-10 w-auto" value={p.to || ''} onChange={(e) => set({ to: e.target.value })} /></label>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.items || []}
        loading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        onRowClick={(o) => navigate(`/admin/orders/${o.orderId}`)}
        empty={<EmptyState icon="receipt_long" title="No orders match" description="Adjust the filters or search." />}
      />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
