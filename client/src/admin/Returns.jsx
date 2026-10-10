import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, formatINR, imgUrl } from '../lib/format';
import { EmptyState, Icon, Modal, Pagination, Spinner, StatusBadge } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, SearchBox, Toolbar, useListParams } from './kit';

const STATUS_TABS = [
  { id: '', label: 'All requests' },
  { id: 'Requested', label: 'Requested' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Picked Up', label: 'Picked Up' },
  { id: 'Processing', label: 'Processing' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Rejected', label: 'Rejected' },
];

export default function Returns() {
  const [p, set] = useListParams({ page: '1' });
  const [selectedRequest, setSelectedRequest] = useState(null);
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
      toast.success(`Request ${data.request?.requestId || ''} updated to ${statusUpdate.status}`);
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
      adminNotes: req.adminNotes || '',
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
          <p className="text-[11px] text-outline truncate">{r.customerComments || 'No remarks'}</p>
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
      render: (r) => <StatusBadge status={r.status} />,
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
      />

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
                    {selectedRequest.pickupAddress.street}, {selectedRequest.pickupAddress.city},{' '}
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
                        SKU: {it.sku || 'N/A'} {it.variantName ? `· ${it.variantName}` : ''}
                      </p>
                      <p className="text-label-sm text-secondary font-medium mt-0.5">
                        Qty: {it.quantity || 1} {it.price ? `· ${formatINR(it.price)}` : ''}
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
                {selectedRequest.customerComments && (
                  <p className="text-body-sm text-on-surface-variant italic mt-1 bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/40">
                    "{selectedRequest.customerComments}"
                  </p>
                )}
              </div>

              {selectedRequest.type === 'exchange' && selectedRequest.exchangePreference && (
                <div className="pt-2 border-t border-surface-container-high">
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 uppercase tracking-wider block font-bold">
                    Exchange Requested For
                  </span>
                  <p className="text-body-sm text-on-surface font-medium mt-0.5">
                    {selectedRequest.exchangePreference.replacementProductName || 'Item Replacement'}{' '}
                    {selectedRequest.exchangePreference.replacementColor ? `(${selectedRequest.exchangePreference.replacementColor})` : ''}
                  </p>
                  {selectedRequest.exchangePreference.replacementNotes && (
                    <p className="text-body-sm text-outline mt-0.5">
                      Notes: {selectedRequest.exchangePreference.replacementNotes}
                    </p>
                  )}
                </div>
              )}

              {selectedRequest.type === 'return' && selectedRequest.refundDestination && (
                <div className="pt-2 border-t border-surface-container-high">
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 uppercase tracking-wider block font-bold">
                    Refund Payout Destination
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-label-sm font-semibold uppercase px-2 py-0.5 rounded bg-surface-container">
                      {selectedRequest.refundDestination.method || 'UPI / Bank'}
                    </span>
                    {selectedRequest.refundDestination.upiId && (
                      <span className="text-body-sm font-mono font-medium">
                        UPI: {selectedRequest.refundDestination.upiId}
                      </span>
                    )}
                    {selectedRequest.refundDestination.accountNumber && (
                      <span className="text-body-sm font-mono text-outline">
                        A/C: {selectedRequest.refundDestination.accountNumber} ({selectedRequest.refundDestination.ifsc})
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Status Action Form */}
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
                    <option value="Requested">Requested (Pending review)</option>
                    <option value="Approved">Approved (Doorstep pickup assigned)</option>
                    <option value="Picked Up">Picked Up (In transit to warehouse)</option>
                    <option value="Processing">Processing (Under inspection)</option>
                    <option value="Completed">Completed (Refund paid / Exchange dispatched)</option>
                    <option value="Rejected">Rejected (Does not meet policy)</option>
                    <option value="Cancelled">Cancelled (By customer/admin)</option>
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
