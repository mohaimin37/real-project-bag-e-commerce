import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { formatDate, formatDateTime, formatINR, initials } from '../lib/format';
import { countryName } from '../lib/countries';
import { useUser } from '../hooks/useStore';
import { AddressCard } from '../components/AddressForm';
import { Badge, Button, ErrorState, Icon, PageLoader, Stars, StatusBadge, useConfirm } from '../components/ui';
import { Panel } from './kit';

export default function CustomerDetail() {
  const { id } = useParams();
  const me = useUser();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'customer', id], queryFn: () => adminApi.customer(id) });
  const update = useMutation({
    mutationFn: (body) => adminApi.updateCustomer(id, body),
    onSuccess: () => {
      toast.success('Customer updated');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.message),
  });
  if (isLoading) return <PageLoader />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const { customer: c, orders, reviews, stats } = data;
  const self = me?._id === c._id;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center gap-3">
        <Link to="/admin/customers" className="btn-icon" aria-label="Back"><Icon name="arrow_back" /></Link>
        <span className="w-14 h-14 rounded-full bg-secondary text-on-secondary text-headline-sm flex items-center justify-center">{initials(c.name)}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-headline-lg flex items-center gap-2 flex-wrap">{c.name} {c.role === 'admin' && <Badge tone="dark">Admin</Badge>} {!c.isActive && <Badge tone="danger">Blocked</Badge>}</h1>
          <p className="text-body-sm text-on-surface-variant">{c.email} · joined {formatDate(c.createdAt)}</p>
        </div>
        {!self && (
          <div className="flex gap-2">
            <Button
              variant="tonal"
              size="sm"
              icon={c.isActive ? 'block' : 'check_circle'}
              loading={update.isPending}
              onClick={async () => {
                if (!c.isActive || (await confirm({ title: `Block ${c.name}?`, message: 'They will be signed out and unable to log in.', confirmLabel: 'Block' }))) update.mutate({ isActive: !c.isActive });
              }}
            >
              {c.isActive ? 'Block' : 'Unblock'}
            </Button>
            <Button
              variant="tonal"
              size="sm"
              icon="admin_panel_settings"
              onClick={async () => {
                const toAdmin = c.role !== 'admin';
                if (await confirm({ title: toAdmin ? `Make ${c.name} an admin?` : 'Remove admin access?', message: toAdmin ? 'They will get full access to this dashboard.' : '', confirmLabel: 'Confirm', tone: toAdmin ? 'danger' : 'neutral' })) update.mutate({ role: toAdmin ? 'admin' : 'customer' });
              }}
            >
              {c.role === 'admin' ? 'Revoke admin' : 'Make admin'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[
          ['receipt_long', 'Orders', stats.orders],
          ['payments', 'Lifetime value', formatINR(stats.spent)],
          ['public', 'Country', countryName(c.country)],
          ['badge', 'Nationality', countryName(c.nationality)],
        ].map(([icon, k, v]) => (
          <div key={k} className="card p-space-md flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center"><Icon name={icon} /></span>
            <div className="min-w-0"><p className="text-label-lg truncate">{v}</p><p className="text-label-sm font-normal text-outline">{k}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md items-start">
        <Panel className="xl:col-span-2" title="Orders" bodyClassName="px-0">
          {orders.length === 0 ? <p className="px-space-lg text-body-sm text-on-surface-variant">No orders yet.</p> : (
            <table className="w-full text-body-sm">
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-t border-surface-container-high">
                    <td className="px-space-lg py-2.5"><Link to={`/admin/orders/${o.orderId}`} className="text-label-lg hover:text-secondary">{o.orderId}</Link></td>
                    <td className="py-2.5 text-on-surface-variant">{formatDateTime(o.createdAt)}</td>
                    <td className="py-2.5"><StatusBadge status={o.orderStatus} /></td>
                    <td className="px-space-lg py-2.5 text-right text-label-lg">{formatINR(o.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Contact">
          <div className="flex flex-col gap-1 text-body-sm">
            <a href={`mailto:${c.email}`} className="text-secondary hover:underline">{c.email}</a>
            {c.phone?.number && <a href={`tel:${c.phone.dialCode}${c.phone.number.replace(/\s/g, '')}`}>{c.phone.dialCode} {c.phone.number}</a>}
            <p className="text-on-surface-variant">Last login: {c.lastLoginAt ? formatDateTime(c.lastLoginAt) : '—'}</p>
          </div>
        </Panel>
      </div>

      {c.addresses?.length > 0 && (
        <Panel title={`Saved addresses (${c.addresses.length})`}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">{c.addresses.map((a) => <AddressCard key={a._id} address={a} />)}</div>
        </Panel>
      )}

      {reviews.length > 0 && (
        <Panel title="Reviews">
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r._id} className="flex flex-col gap-1 p-space-sm rounded-xl bg-surface-container-low">
                <div className="flex items-center gap-2"><Stars value={r.rating} /><Link to={`/product/${r.product?.slug}`} className="text-label-lg hover:text-secondary">{r.product?.name}</Link></div>
                <p className="text-body-sm text-on-surface-variant">{r.comment}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
