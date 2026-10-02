import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime } from '../lib/format';
import { Button, EmptyState, Icon, Pagination } from '../components/ui';
import { DataTable, FilterSelect, PageHeader, Toolbar, useListParams } from './kit';

const TONE = { sent: 'bg-secondary text-on-secondary', logged: 'bg-tertiary-fixed text-tertiary-container', failed: 'bg-error-container text-on-error-container', pending: 'bg-surface-container-highest' };

export default function Notifications() {
  const [p, set] = useListParams({ page: '1' });
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'notifications', p], queryFn: () => adminApi.notifications(p), placeholderData: keepPreviousData });
  const resend = useMutation({
    mutationFn: adminApi.resendNotification,
    onSuccess: (res) => {
      toast.success(`Status: ${res.notification.status}`);
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const columns = [
    { key: 'order', header: 'Order', render: (n) => (n.order ? <Link to={`/admin/orders/${n.order.orderId}`} className="text-label-lg hover:text-secondary" onClick={(e) => e.stopPropagation()}>{n.order.orderId}</Link> : '—') },
    { key: 'channel', header: 'Channel', render: (n) => <span className="capitalize">{n.channel} · {n.provider === 'dev_log' ? 'dev log' : 'Cloud API'}</span> },
    { key: 'recipient', header: 'Recipient', render: (n) => n.recipient || '—' },
    { key: 'status', header: 'Status', render: (n) => <span className={cn('px-2.5 py-1 rounded-full text-label-sm uppercase', TONE[n.status])}>{n.status}</span> },
    { key: 'attempts', header: 'Attempts', align: 'right', render: (n) => n.attempts },
    { key: 'when', header: 'Last attempt', render: (n) => <span className="whitespace-nowrap">{formatDateTime(n.lastAttemptAt || n.createdAt)}</span> },
    { key: 'error', header: 'Error', render: (n) => <span className="text-error text-label-md line-clamp-2 max-w-[260px]">{n.error}</span> },
    { key: 'a', header: '', align: 'right', render: (n) => <Button size="sm" variant="tonal" icon="send" loading={resend.isPending && resend.variables === n._id} onClick={(e) => { e.stopPropagation(); resend.mutate(n._id); }}>Resend</Button> },
  ];

  return (
    <>
      <PageHeader title="Notifications" subtitle="Delivery log for WhatsApp admin alerts. Orders are never affected by notification failures." />
      {query.data && !query.data.whatsappConfigured && (
        <div className="mb-space-md p-space-md rounded-2xl bg-tertiary-fixed/50 text-tertiary-container flex items-start gap-3 text-body-sm">
          <Icon name="info" />
          <p>WhatsApp Cloud API isn't configured, so alerts are <b>logged</b> to the server console instead of sent. Add <code>WHATSAPP_ACCESS_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code> and <code>ADMIN_WHATSAPP_NUMBER</code> to <code>server/.env</code> and restart. You can still forward any alert with “Open in WhatsApp” on the order page.</p>
        </div>
      )}
      <Toolbar>
        <FilterSelect label="Status" value={p.status} onChange={(v) => set({ status: v })} options={[['', 'All statuses'], ['sent', 'Sent'], ['logged', 'Logged'], ['failed', 'Failed']]} />
      </Toolbar>
      <DataTable columns={columns} rows={query.data?.items || []} loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={<EmptyState icon="notifications" title="No notifications" />} />
      <Pagination className="mt-space-md" page={query.data?.page} pages={query.data?.pages} onChange={(page) => set({ page })} />
    </>
  );
}
