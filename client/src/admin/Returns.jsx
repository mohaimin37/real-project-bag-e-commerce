import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, formatINR, imgUrl } from '../lib/format';
import { EmptyState, Icon, Modal, Pagination, Spinner, StatusBadge } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';
import { CreateReturnModal, RefundDestinationBox } from './ReturnTools';

const STATUS_TABS = [
  { id: '', label: 'All requests' },
  { id: 'Requested', label: 'Requested' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Pickup Scheduled', label: 'Pickup scheduled' },
  { id: 'In Inspection', label: 'In inspection' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Rejected', label: 'Rejected' },
  { id: 'Cancelled', label: 'Cancelled by customer' },
];

/** The decision a request needs. Admin can say YES (Confirm) or NO (Reject) with a custom message. */
function DecisionBar({ request: r, busy, onDecide }) {
  const [adminMessage, setAdminMessage] = useState(r.adminMessage || '');

  if (r.status !== 'Requested') {
    return (
      <div
        className={cn(
          'p-4 rounded-2xl border flex flex-col gap-2.5',
          ['Approved', 'Pickup Scheduled', 'In Inspection', 'Completed'].includes(r.status)
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-rose-500/40 bg-rose-500/5'
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon
              name={r.status === 'Rejected' ? 'cancel' : 'check_circle'}
              className={cn('text-[20px]', r.status === 'Rejected' ? 'text-rose-600' : 'text-emerald-600')}
            />
            <h4 className="text-label-lg font-bold">
              {r.status === 'Rejected' ? 'Return Rejected by Admin' : 'Return Confirmed / Approved'}
            </h4>
          </div>
          <span className="text-[11.5px] font-mono px-2 py-0.5 rounded bg-surface-container text-outline">
            Customer-visible status
          </span>
        </div>
        {r.adminMessage ? (
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px]">
            <span className="font-bold text-outline text-[11px] block uppercase tracking-wider mb-1 flex items-center gap-1">
              <Icon name="chat" className="text-[14px] text-secondary" /> Admin Message to Customer:
            </span>
            <p className="text-on-surface font-semibold italic">"{r.adminMessage}"</p>
          </div>
        ) : (
          <p className="text-[12px] text-outline italic">No custom message sent to customer.</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl border-2 border-secondary/40 bg-secondary/5 flex flex-col gap-3 shadow-xs">
      <div>
        <h4 className="text-label-lg font-bold flex items-center gap-2 text-on-surface">
          <span className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
            <Icon name="gavel" className="text-[19px]" />
          </span>
          Admin Decision: Confirm (YES) or Reject (NO) this {r.type}?
        </h4>
        <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
          The customer currently sees <b>“Return is in progress”</b>. Once you confirm, the customer will see <b>“Return Confirmed”</b> along with whatever message you enter below (e.g. <i>"Return this item when it reaches to you"</i>, or empty message). If rejected, the customer sees <b>“Return Rejected”</b>.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-bold text-on-surface flex items-center justify-between">
          <span>Message to Customer:</span>
          <span className="text-[11px] font-normal text-outline">Displayed in customer's order return history</span>
        </label>
        <textarea
          className="input w-full py-2 px-3 text-[13px] rounded-xl"
          rows={2}
          value={adminMessage}
          onChange={(e) => setAdminMessage(e.target.value)}
          placeholder="e.g. Return this item when it reaches to you / Keep tags intact for pickup..."
          maxLength={500}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide('Approved', adminMessage)}
          className="btn-primary h-10 px-5 gap-2 font-bold shadow-sm"
        >
          <Icon name="check_circle" className="text-[18px]" />
          Confirm Return (Say YES)
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Reject this return request? The customer will see that the return has been rejected.')) {
              onDecide('Rejected', adminMessage);
            }
          }}
          className="btn-tonal h-10 px-5 gap-2 text-error font-bold border border-error/30 hover:bg-error/10"
        >
          <Icon name="block" className="text-[18px]" />
          Reject Return (Say NO)
        </button>
      </div>
    </div>
  );
}

/** Doorstep pickup (Shiprocket) and the refund for a completed return. */
function ReturnLogistics({ request: r, onUpdated }) {
  const shipping = useQuery({ queryKey: ['admin', 'shipping-status'], queryFn: adminApi.shippingStatus, staleTime: 5 * 60 * 1000 });
  const pickup = useMutation({ mutationFn: () => adminApi.schedulePickup(r._id), onSuccess: (d) => { toast.success('Doorstep pickup booked'); onUpdated(d.request); }, onError: (e) => toast.error(e.message) });
  const [utr, setUtr] = useState('');
  const paid = useMutation({
    mutationFn: (ref) => adminApi.markReturnRefunded(r._id, ref),
    onSuccess: (d) => { toast.success('Refund confirmed — the customer can see it now'); setUtr(''); onUpdated(d.request); },
    onError: (e) => toast.error(e.message),
  });
  const rp = r.reversePickup || {};
  const refund = r.refund || {};
  const manual = refund.status && ['Pending', 'Failed'].includes(refund.status) && !refund.providerRefundId;
  return (
    <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-2 text-body-sm">
      <h4 className="text-label-lg font-bold flex items-center gap-1.5"><Icon name="local_shipping" className="text-[20px] text-secondary" /> Pickup & refund</h4>
      {rp.shipmentId || rp.awb ? (
        <p>Pickup booked{rp.courier ? ` with ${rp.courier}` : ''}{rp.awb ? ` · AWB ${rp.awb}` : ''}{rp.status ? ` · ${rp.status}` : ''}</p>
      ) : shipping.data?.configured ? (
        !['Rejected', 'Completed'].includes(r.status) && (
          <button type="button" className="btn-tonal h-9 self-start gap-1.5" disabled={pickup.isPending} onClick={() => pickup.mutate()}>
            <Icon name="local_shipping" className="text-[18px]" /> Book doorstep pickup (Shiprocket)
          </button>
        )
      ) : (
        <p className="text-on-surface-variant">No shipping provider connected — arrange the pickup with your courier and note the AWB in the internal note.</p>
      )}
      {rp.error && <p className="text-label-sm text-error">Last provider error: {rp.error}</p>}
      {r.type === 'return' && (
        <p>
          Refund: <b>{refund.status && refund.status !== 'None' ? refund.status : 'Starts when you mark the request Completed'}</b>
          {refund.amount ? ` · ${formatINR(refund.amount)}` : ''} · {refund.method || r.refundMethod}
          {refund.providerRefundId ? ` · Razorpay ${refund.providerRefundId}` : ''}
        </p>
      )}
      {refund.failureReason && <p className="text-label-sm text-error">{refund.failureReason}</p>}
      {refund.status === 'Processed' && (
        <p className="p-2.5 rounded-lg bg-emerald-500/10 text-on-surface flex items-start gap-2">
          <Icon name="task_alt" className="text-[18px] text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Refund completed{refund.processedAt ? ` on ${formatDateTime(refund.processedAt)}` : ''}{refund.reference ? ` · ref ${refund.reference}` : ''}. The customer sees this on their Returns page.</span>
        </p>
      )}
      {manual && (
        <form
          className="mt-1 p-3 rounded-xl border border-secondary/40 bg-secondary/5 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (window.confirm(`Confirm you have sent ${formatINR(refund.amount || 0)} by ${refund.method || r.refundMethod}? The customer will be told the refund is complete.`)) paid.mutate(utr.trim());
          }}
        >
          <p className="font-semibold">Send {formatINR(refund.amount || 0)} by {refund.method || r.refundMethod}, then confirm here</p>
          <p className="text-label-sm text-on-surface-variant">Use the UPI ID / bank account shown under “Where to send the refund”. After you confirm, the customer sees “Refund sent” with this reference and gets an email.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="input h-10 flex-1" value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={60} placeholder="UTR / transaction reference (required)" aria-label="UTR or transaction reference" />
            <button type="submit" className="btn-primary h-10 gap-1.5" disabled={paid.isPending || utr.trim().length < 4}>
              <Icon name="task_alt" className="text-[18px]" /> Confirm refund completed
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Returns() {
  const [p, set] = useListParams({ page: '1' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [creating, setCreating] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '', adminNotes: '' });
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'returns', p],
    queryFn: () => adminApi.returns({ ...p, limit: 15 }),
    placeholderData: keepPreviousData,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => adminApi.updateReturnStatus(id, body),
    onSuccess: (data) => {
      toast.success(`Request ${data.request?.requestId || ''} is now ${data.request?.status || statusUpdate.status}`);
      setStatusUpdate((prev) => ({ ...prev, status: data.request?.status || prev.status, note: '' }));
      qc.invalidateQueries({ queryKey: ['admin', 'returns'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setSelectedRequest((prev) => (prev ? { ...prev, ...data.request } : null));
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update status');
    },
  });

  const openDetails = (req) => {
    setSelectedRequest(req);
    setStatusUpdate({
      status: req.status,
      note: '',
      adminMessage: req.adminMessage || '',
      adminNotes: req.adminNotes || '',
    });
  };

  const decide = (status, adminMsg) => {
    updateMutation.mutate({
      id: selectedRequest._id,
      body: {
        status,
        note: adminMsg?.trim() || (status === 'Approved' ? 'Return Confirmed by Admin' : 'Return Request Rejected by Admin'),
        adminMessage: adminMsg?.trim() || '',
        adminNotes: statusUpdate.adminNotes,
      },
    });
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    updateMutation.mutate({
      id: selectedRequest._id,
      body: {
        status: statusUpdate.status,
        note: statusUpdate.note || `Status marked as ${statusUpdate.status} by Admin`,
        adminMessage: statusUpdate.adminMessage !== undefined ? statusUpdate.adminMessage : (selectedRequest.adminMessage || ''),
        adminNotes: statusUpdate.adminNotes,
      },
    });
  };

  const columns = [
    {
      key: 'requestId',
      header: 'Request',
      render: (r) => (
        <div className="whitespace-nowrap">
          <p className="text-label-lg font-bold text-secondary font-mono">{r.requestId}</p>
          <p className="text-label-sm font-normal text-outline">{formatDateTime(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'orderId',
      header: 'Order',
      render: (r) => (
        <div className="whitespace-nowrap">
          <Link
            to={`/admin/orders/${r.orderId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-label-md font-semibold text-secondary hover:underline flex items-center gap-1"
          >
            {r.orderId}
            <Icon name="open_in_new" className="text-[14px]" />
          </Link>
          <span className="text-[11px] text-outline">7-Day Policy</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-bold uppercase tracking-wider',
            r.type === 'exchange'
              ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/30'
          )}
        >
          <Icon name={r.type === 'exchange' ? 'sync_alt' : 'assignment_return'} className="text-[14px]" />
          {r.type}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div className="min-w-[150px]">
          <p className="font-medium text-body-sm truncate">{r.user?.name || 'Customer'}</p>
          <p className="text-label-sm text-outline truncate">{r.pickupAddress?.phone || r.user?.phone || r.user?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <div className="max-w-[200px]">
          <p className="text-body-sm font-medium truncate">{r.reason}</p>
          <p className="text-[11px] text-outline truncate">{r.detailedReason || 'No remarks'}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (r) => (
        <span className="text-label-md font-semibold">
          {r.items?.reduce((n, i) => n + (i.quantity || 1), 0) || 0} unit(s)
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={r.status} />
          {r.status === 'Requested' && <span className="text-[11px] font-semibold text-secondary">Needs your decision</span>}
          {r.type === 'return' && ['Approved', 'Pickup Scheduled', 'In Inspection'].includes(r.status) && !r.refundDetailsSubmittedAt && (!r.refund?.status || r.refund.status === 'None') && (
            <span className="text-[11px] text-outline">Waiting for refund details</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openDetails(r);
          }}
          className="btn-tonal btn-sm text-[12px] h-8 px-2.5 gap-1"
        >
          Manage <Icon name="chevron_right" className="text-[16px]" />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Returns & Exchanges"
        subtitle={query.data ? `${query.data.total} requests found • 7-day post-delivery policy enforcement` : ' '}
        eyebrow="Customer Concierge"
        actions={<button type="button" className="btn-primary h-10 gap-1.5" onClick={() => setCreating(true)}><Icon name="add" className="text-[18px]" /> Create return / exchange</button>}
      />
      <CreateReturnModal open={creating} onClose={() => setCreating(false)} />

      {/* Status Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-space-md border-b border-surface-container-high">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id || 'all'}
            type="button"
            onClick={() => set({ status: tab.id, page: '1' })}
            className={cn(
              'px-3 py-2.5 text-label-md whitespace-nowrap border-b-2 -mb-px transition-colors',
              (p.status || '') === tab.id
                ? 'border-secondary text-on-surface font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Toolbar>
        <SearchBox
          value={p.q}
          onChange={(q) => set({ q, page: '1' })}
          placeholder="Search Request ID, Order ID, or Phone…"
        />
        <FilterSelect
          label="Request type"
          value={p.type}
          onChange={(type) => set({ type, page: '1' })}
          options={[
            ['', 'All types'],
            ['return', 'Return only'],
            ['exchange', 'Exchange only'],
          ]}
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={query.data?.items || []}
        loading={query.isLoading}
        error={query.error}
        onRetry={query.refetch}
        onRowClick={openDetails}
        empty={
          <EmptyState
            icon="assignment_return"
            title="No return requests found"
            description="When customers initiate returns or exchanges within their 7-day window, they will show up here."
          />
        }
      />

      <Pagination
        className="mt-space-md"
        page={query.data?.page}
        pages={query.data?.pages}
        onChange={(page) => set({ page })}
      />

      {/* Details & Management Modal */}
      {selectedRequest && (
        <Modal
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Request #${selectedRequest.requestId}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Top Bar Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low border border-surface-container-high">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-label-sm font-bold uppercase tracking-wider',
                      selectedRequest.type === 'exchange'
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
                    )}
                  >
                    {selectedRequest.type}
                  </span>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <p className="text-body-sm text-outline mt-1">
                  Raised on {formatDateTime(selectedRequest.createdAt)}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-outline block uppercase tracking-wider">Associated Order</span>
                <Link
                  to={`/admin/orders/${selectedRequest.orderId}`}
                  className="text-label-lg font-bold text-secondary hover:underline inline-flex items-center gap-1"
                >
                  {selectedRequest.orderId}
                  <Icon name="launch" className="text-[16px]" />
                </Link>
              </div>
            </div>

            {/* Customer & Pickup Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-container/40 border border-outline-variant/60">
                <h4 className="text-label-md font-bold text-secondary flex items-center gap-1.5 mb-2">
                  <Icon name="person" className="text-[18px]" /> Customer Info
                </h4>
                <p className="text-body-sm font-medium">{selectedRequest.user?.name || 'Customer'}</p>
                <p className="text-label-sm text-outline">{selectedRequest.user?.email || '—'}</p>
                <p className="text-label-sm text-outline font-mono mt-0.5">{selectedRequest.pickupAddress?.phone || selectedRequest.user?.phone || '—'}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container/40 border border-outline-variant/60">
                <h4 className="text-label-md font-bold text-secondary flex items-center gap-1.5 mb-2">
                  <Icon name="pin_drop" className="text-[18px]" /> Pickup Address
                </h4>
                {selectedRequest.pickupAddress ? (
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    {[selectedRequest.pickupAddress.fullName, selectedRequest.pickupAddress.addressLine1, selectedRequest.pickupAddress.addressLine2].filter(Boolean).join(', ')}, {selectedRequest.pickupAddress.city},{' '}
                    {selectedRequest.pickupAddress.state} - {selectedRequest.pickupAddress.postalCode}
                  </p>
                ) : (
                  <p className="text-body-sm text-outline">Standard delivery address on order file</p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="border border-surface-container-high rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-container-high/40 border-b border-surface-container-high">
                <h4 className="text-label-md font-bold">Items to Return / Exchange</h4>
              </div>
              <div className="divide-y divide-surface-container-high">
                {selectedRequest.items?.map((it, idx) => (
                  <div key={idx} className="p-3.5 flex items-center gap-3">
                    {it.image && (
                      <img
                        src={imgUrl(it.image)}
                        alt={it.productName}
                        className="w-14 h-14 object-cover rounded-lg border border-surface-container-high shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-semibold truncate">{it.productName}</p>
                      <p className="text-[12px] text-outline">
                        SKU: {it.SKU || 'N/A'} {it.variantName ? `· ${it.variantName}` : ''}
                      </p>
                      <p className="text-label-sm text-secondary font-medium mt-0.5">
                        Qty: {it.quantity || 1} {it.unitPrice ? `· ${formatINR(it.unitPrice)} each` : ''}
                      </p>
                    </div>
                    {it.itemCondition && (
                      <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-medium text-outline">
                        {it.itemCondition}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reason & Preferences */}
            <div className="p-4 rounded-xl bg-surface-container/30 border border-surface-container-high space-y-3">
              <div>
                <span className="text-[11px] text-outline uppercase tracking-wider block font-bold">Customer Reason</span>
                <p className="text-body-md font-medium text-on-surface mt-0.5">{selectedRequest.reason}</p>
                {selectedRequest.detailedReason && (
                  <p className="text-body-sm text-on-surface-variant italic mt-1 bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/40">
                    "{selectedRequest.detailedReason}"
                  </p>
                )}
              </div>

              {selectedRequest.type === 'exchange' && selectedRequest.exchangePreference && (
                <div className="pt-2 border-t border-surface-container-high">
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 uppercase tracking-wider block font-bold">
                    Exchange Requested For
                  </span>
                  <p className="text-body-sm text-on-surface font-medium mt-0.5">
                    {selectedRequest.exchangePreference.desiredItemName || 'Item replacement'}{' '}
                    {selectedRequest.exchangePreference.desiredSizeOrColor ? `(${selectedRequest.exchangePreference.desiredSizeOrColor})` : ''}
                  </p>
                  {selectedRequest.exchangePreference.notes && (
                    <p className="text-body-sm text-outline mt-0.5">
                      Notes: {selectedRequest.exchangePreference.notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            <DecisionBar key={`d-${selectedRequest._id}`} request={selectedRequest} busy={updateMutation.isPending} onDecide={decide} />

            {selectedRequest.status === 'Cancelled' && (
              <p className="p-3 rounded-xl bg-surface-container-low text-body-sm flex items-center gap-2"><Icon name="cancel" className="text-[18px] text-outline" /> The customer cancelled this request. Nothing more to do.</p>
            )}

            <RefundDestinationBox key={selectedRequest._id} request={selectedRequest} onUpdated={(r) => { setSelectedRequest((prev) => ({ ...prev, ...r })); qc.invalidateQueries({ queryKey: ['admin', 'returns'] }); }} />

            <ReturnLogistics request={selectedRequest} onUpdated={(r) => { setSelectedRequest((prev) => ({ ...prev, ...r })); qc.invalidateQueries({ queryKey: ['admin', 'returns'] }); }} />

            {/* Admin Status Action Form */}
            {selectedRequest.status !== 'Cancelled' && (
            <form onSubmit={handleStatusSubmit} className="p-4 rounded-xl bg-surface-container-highest/60 border border-secondary/20 space-y-4">
              <h4 className="text-label-lg font-bold flex items-center gap-1.5 text-secondary">
                <Icon name="admin_panel_settings" className="text-[20px]" /> Update Status & Logistics
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-label-sm text-outline block mb-1">Status Step</label>
                  <select
                    className="select h-10 w-full"
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Requested">Requested (pending review)</option>
                    <option value="Approved">Approved</option>
                    <option value="Pickup Scheduled">Pickup scheduled</option>
                    <option value="In Inspection">In inspection (item received)</option>
                    <option value="Completed">Completed (return refunds start automatically)</option>
                    <option value="Rejected">Rejected (does not meet policy)</option>
                  </select>
                </div>

                <div>
                  <label className="text-label-sm text-outline block mb-1">Status Note (Customer visible in history)</label>
                  <input
                    type="text"
                    className="input h-10 w-full"
                    placeholder="e.g. Pickup scheduled via Delhivery on Friday"
                    value={statusUpdate.note}
                    onChange={(e) => setStatusUpdate((prev) => ({ ...prev, note: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-label-sm text-outline block mb-1">
                  Message to Customer (displayed in customer's order return section)
                </label>
                <input
                  type="text"
                  className="input h-10 w-full"
                  placeholder="e.g. Return this item when it reaches to you / Keep dust bag ready"
                  value={statusUpdate.adminMessage || ''}
                  onChange={(e) => setStatusUpdate((prev) => ({ ...prev, adminMessage: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-label-sm text-outline block mb-1">Internal Admin Note (Private)</label>
                <textarea
                  className="input w-full py-2"
                  rows={2}
                  placeholder="Internal logistics tracking, courier AWB #, QC notes..."
                  value={statusUpdate.adminNotes}
                  onChange={(e) => setStatusUpdate((prev) => ({ ...prev, adminNotes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary h-10 px-5 gap-2 text-label-md shadow-sm"
                >
                  {updateMutation.isPending ? <Spinner className="w-4 h-4" /> : <Icon name="check" className="text-[18px]" />}
                  Save Status
                </button>
              </div>
            </form>
            )}

            {/* Timeline */}
            {selectedRequest.statusHistory?.length > 0 && (
              <div>
                <h4 className="text-label-md font-bold mb-3 text-outline uppercase tracking-wider">Status History</h4>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                  {selectedRequest.statusHistory.map((sh, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-surface" />
                      <div className="flex items-center gap-2">
                        <span className="text-label-md font-bold">{sh.status}</span>
                        <span className="text-[11px] text-outline">{formatDateTime(sh.at)}</span>
                      </div>
                      {sh.note && <p className="text-body-sm text-on-surface-variant mt-0.5">{sh.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
