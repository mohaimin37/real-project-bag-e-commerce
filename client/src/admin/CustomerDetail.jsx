import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { formatDate, formatDateTime, formatINR, initials } from '../lib/format';
import { countryName } from '../lib/countries';
import { useUser } from '../hooks/useStore';
import { AddressCard } from '../components/AddressForm';
import { Badge, Button, ErrorState, Icon, Input, PageLoader, Stars, StatusBadge, useConfirm } from '../components/ui';
import { CoinIcon } from '../components/coins';
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
  const { customer: c, orders, reviews, stats, coinHistory = [] } = data;
  const self = me?._id === c._id;

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin/customers" className="btn-icon" aria-label="Back"><Icon name="arrow_back" /></Link>
        <span className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-full bg-secondary text-on-secondary text-headline-sm flex items-center justify-center">{initials(c.name)}</span>
        <div className="flex-1 min-w-[180px]">
          <h1 className="text-headline-md sm:text-headline-lg flex items-center gap-2 flex-wrap break-words">{c.name} {c.role === 'admin' && <Badge tone="dark">Admin</Badge>} {!c.isActive && <Badge tone="danger">Blocked</Badge>}</h1>
          <p className="text-body-sm text-on-surface-variant break-all">{c.email} · joined {formatDate(c.createdAt)}</p>
        </div>
        {!self && (
          <div className="flex gap-2 w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-space-md">
        {[
          ['receipt_long', 'Orders', stats.orders],
          ['payments', 'Lifetime value', formatINR(stats.spent)],
          ['public', 'Country', countryName(c.country)],
          ['badge', 'Nationality', countryName(c.nationality)],
          ['savings', 'Coin balance', `${c.coins || 0} coins`],
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
                    <td className="px-3 sm:px-space-lg py-2.5">
                      <Link to={`/admin/orders/${o.orderId}`} className="text-label-lg hover:text-secondary">{o.orderId}</Link>
                      {/* Phones: the date sits under the order number instead of in its own column. */}
                      <span className="block sm:hidden text-[11px] text-outline">{formatDateTime(o.createdAt)}</span>
                    </td>
                    <td className="hidden sm:table-cell py-2.5 text-on-surface-variant">{formatDateTime(o.createdAt)}</td>
                    <td className="py-2.5"><StatusBadge status={o.orderStatus} /></td>
                    <td className="px-3 sm:px-space-lg py-2.5 text-right text-label-lg whitespace-nowrap">{formatINR(o.grandTotal)}</td>
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

      <CoinsPanel customer={c} history={coinHistory} />
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

const COIN_LABEL = { earned: 'Earned', redeemed: 'Used', refunded: 'Returned', reversed: 'Removed', adjusted: 'Adjusted' };

/** Coin balance, history and a quick "give / take back" form. */
function CoinsPanel({ customer, history }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const adjust = useMutation({
    mutationFn: (sign) => adminApi.adjustCoins(customer._id, { coins: sign * Math.abs(parseInt(amount, 10) || 0), note }),
    onSuccess: (res, sign) => {
      toast.success(`${sign > 0 ? 'Gave' : 'Took back'} ${Math.abs(parseInt(amount, 10))} coins · new balance ${res.balance}`);
      setAmount('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.details?.[0]?.message || e.message),
  });
  const ready = Number(amount) > 0 && note.trim().length >= 3;
  return (
    <Panel title={<span className="flex items-center gap-2"><CoinIcon className="w-5 h-5" /> WILDTANE Coins · {customer.coins || 0}</span>}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <div className="flex flex-col gap-2 p-space-md rounded-xl bg-surface-container-low">
          <p className="text-label-lg">Give or take back coins</p>
          <p className="text-body-sm text-on-surface-variant">Use this for goodwill, a delayed delivery or correcting a mistake. The reason appears in the customer's coin history.</p>
          <div className="flex gap-2">
            <Input inputMode="numeric" placeholder="Coins" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} className="w-28" aria-label="Number of coins" />
            <Input placeholder="Reason, e.g. Sorry for the late delivery" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} aria-label="Reason" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" icon="add" disabled={!ready} loading={adjust.isPending && adjust.variables === 1} onClick={() => adjust.mutate(1)}>Give coins</Button>
            <Button size="sm" variant="tonal" icon="remove" disabled={!ready || !customer.coins} loading={adjust.isPending && adjust.variables === -1} onClick={() => adjust.mutate(-1)}>Take back</Button>
          </div>
        </div>
        <div className="flex flex-col max-h-72 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No coin activity yet.</p>
          ) : (
            history.map((h) => (
              <div key={h._id} className="flex items-center gap-3 py-2 border-b border-surface-container-high last:border-0 text-body-sm">
                <span className="w-20 shrink-0 text-label-md">{COIN_LABEL[h.type] || h.type}</span>
                <span className="flex-1 min-w-0 truncate text-on-surface-variant">
                  {h.orderId ? <Link to={`/admin/orders/${h.orderId}`} className="text-secondary hover:underline">{h.orderId}</Link> : null}
                  {h.type === 'adjusted' ? `${h.note}${h.by?.name ? ` — ${h.by.name}` : ''}` : ''}
                  <span className="block text-label-sm font-normal text-outline">{formatDateTime(h.createdAt)}</span>
                </span>
                <span className={h.coins > 0 ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold'}>{h.coins > 0 ? '+' : ''}{h.coins}</span>
                <span className="w-14 text-right text-label-sm font-normal text-outline">= {h.balanceAfter}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
