import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { formatDate, formatDateTime, formatINR, initials } from '../lib/format';
import { countryName } from '../lib/countries';
import { useUser } from '../hooks/useStore';
import { AddressCard } from '../components/AddressForm';
import { Badge, Button, ErrorState, Icon, Input, Modal, PageLoader, Stars, StatusBadge, Textarea, useConfirm } from '../components/ui';
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

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: 'Message from WILDTANE Customer Care', message: '' });
  const sendEmail = useMutation({
    mutationFn: (body) => adminApi.sendCustomerEmail(id, body),
    onSuccess: (res) => {
      toast.success(res.message || 'Email sent successfully from info@wildtane.com');
      setEmailModalOpen(false);
      setEmailForm((prev) => ({ ...prev, message: '' }));
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <PageLoader />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const { customer: c, orders = [], reviews = [], stats = {}, coinHistory = [], payments = [] } = data;
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
        <div className="flex gap-2 w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none flex-wrap">
          <Button
            variant="tonal"
            size="sm"
            icon="mail"
            className="h-9 gap-1.5"
            onClick={() => {
              setEmailForm({ to: c.email || '', subject: 'Message from WILDTANE Customer Care', message: '' });
              setEmailModalOpen(true);
            }}
          >
            Send Email
          </Button>
          <Link
            to={`/admin/chat?q=${encodeURIComponent(c.email || c.name)}`}
            className="btn-tonal btn-sm gap-1.5 h-9"
          >
            <Icon name="chat" className="text-[17px] text-secondary" /> Customer Chat
          </Link>
          {!self && (
            <>
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
            </>
          )}
        </div>
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

      <PaymentHistoryPanel payments={payments} stats={stats} />
      <CoinsPanel customer={c} history={coinHistory} />
      <WalletPanel customer={c} />
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

      <Modal open={emailModalOpen} onClose={() => setEmailModalOpen(false)} title={`Send Email to ${c.name}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendEmail.mutate(emailForm);
          }}
          className="flex flex-col gap-4 p-space-md"
        >
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low text-label-sm text-outline">
            <Icon name="verified_user" className="text-secondary text-[18px]" />
            <span>Sending directly from authenticated mailbox <b>info@wildtane.com</b></span>
          </div>
          <div>
            <label className="block text-label-sm uppercase tracking-wider text-outline mb-1">To Email</label>
            <Input
              type="email"
              required
              value={emailForm.to}
              onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="block text-label-sm uppercase tracking-wider text-outline mb-1">Subject</label>
            <Input
              type="text"
              required
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              placeholder="Email subject line"
            />
          </div>
          <div>
            <label className="block text-label-sm uppercase tracking-wider text-outline mb-1">Message</label>
            <Textarea
              rows={5}
              required
              value={emailForm.message}
              onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
              placeholder="Write your email to the customer…"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="tonal" type="button" onClick={() => setEmailModalOpen(false)}>Cancel</Button>
            <Button variant="filled" type="submit" icon="send" loading={sendEmail.isPending} disabled={!emailForm.to || !emailForm.message.trim()}>
              Send Email
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const COIN_LABEL = { earned: 'Earned', redeemed: 'Used', refunded: 'Returned', reversed: 'Removed', adjusted: 'Adjusted', bonus: 'Bonus' };

const WALLET_LABEL = { refund: 'Refund', order_restore: 'Order cancelled', promo: 'Promo credit', referral: 'Referral', admin_credit: 'Admin credit', admin_debit: 'Admin debit', order_debit: 'Used on order' };

/** WILDTANE Wallet (₹): balance, ledger and an audited credit/debit form. No top-ups without payment. */
function WalletPanel({ customer }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [promo, setPromo] = useState(false);
  const ledger = useQuery({ queryKey: ['admin', 'customer-wallet', customer._id], queryFn: () => adminApi.customerWallet(customer._id), select: (d) => d.items });
  const adjust = useMutation({
    mutationFn: (sign) => adminApi.adjustWallet(customer._id, { amount: sign * Math.abs(Number(amount) || 0), note, type: promo ? 'promo' : 'admin_credit' }),
    onSuccess: (res, sign) => {
      toast.success(`${sign > 0 ? 'Credited' : 'Debited'} ${formatINR(Math.abs(Number(amount)))} · new balance ${formatINR(res.balance)}`);
      setAmount('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e.details?.[0]?.message || e.message),
  });
  const ready = Number(amount) > 0 && note.trim().length >= 3;
  return (
    <Panel title={<span className="flex items-center gap-2"><Icon name="account_balance_wallet" className="text-[20px]" /> WILDTANE Wallet · {formatINR(customer.wallet || 0)}</span>}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        <div className="flex flex-col gap-2 p-space-md rounded-xl bg-surface-container-low">
          <p className="text-label-lg">Credit or debit the wallet (₹)</p>
          <p className="text-body-sm text-on-surface-variant">For goodwill credits or corrections. Each change is logged with your name and the reason, and shows in the customer’s wallet history.</p>
          <div className="flex gap-2">
            <Input inputMode="decimal" placeholder="₹" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className="w-28" aria-label="Amount in rupees" />
            <Input placeholder="Reason" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} aria-label="Reason" />
          </div>
          <label className="flex items-center gap-2 text-body-sm"><input type="checkbox" className="accent-primary" checked={promo} onChange={(e) => setPromo(e.target.checked)} /> Label credit as a promotional credit</label>
          <div className="flex gap-2">
            <Button size="sm" icon="add" disabled={!ready} loading={adjust.isPending && adjust.variables === 1} onClick={() => adjust.mutate(1)}>Credit</Button>
            <Button size="sm" variant="tonal" icon="remove" disabled={!ready || !customer.wallet} loading={adjust.isPending && adjust.variables === -1} onClick={() => adjust.mutate(-1)}>Debit</Button>
          </div>
        </div>
        <div className="flex flex-col max-h-72 overflow-y-auto">
          {!ledger.data?.length ? (
            <p className="text-body-sm text-on-surface-variant">No wallet activity yet.</p>
          ) : (
            ledger.data.map((h) => (
              <div key={h._id} className="flex items-center gap-3 py-2 border-b border-surface-container-high last:border-0 text-body-sm">
                <span className="w-24 shrink-0 text-label-md">{WALLET_LABEL[h.type] || h.type}</span>
                <span className="flex-1 min-w-0 truncate text-on-surface-variant">
                  {h.orderId ? <Link to={`/admin/orders/${h.orderId}`} className="text-secondary hover:underline">{h.orderId} </Link> : null}
                  {h.description}{h.by?.name ? ` — ${h.by.name}` : ''}
                  <span className="block text-label-sm font-normal text-outline">{formatDateTime(h.createdAt)}</span>
                </span>
                <span className={h.amount > 0 ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-bold'}>{h.amount > 0 ? '+' : ''}{formatINR(h.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}

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

/** Individual user payment history: payments, methods (UPI/Razorpay/COD/Wallet), amounts and refunds. */
function PaymentHistoryPanel({ payments = [], stats = {} }) {
  return (
    <Panel
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <span className="flex items-center gap-2">
            <Icon name="paid" className="text-[20px] text-secondary" /> Payment History ({payments.length})
          </span>
          <span className="text-[12px] font-normal text-on-surface-variant flex items-center gap-2">
            <span>
              Total Collected: <b className="text-on-surface font-semibold">{formatINR(stats.totalPaid || stats.spent || 0)}</b>
            </span>
            {stats.totalRefunded > 0 && (
              <span className="text-error font-medium">({formatINR(stats.totalRefunded)} refunded)</span>
            )}
          </span>
        </div>
      }
      bodyClassName="px-0"
    >
      {payments.length === 0 ? (
        <p className="px-space-lg text-body-sm text-on-surface-variant">No payments recorded for this customer yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm text-left">
            <thead>
              <tr className="border-b border-surface-container-high text-[11px] font-bold text-outline uppercase tracking-wider">
                <th className="px-3 sm:px-space-lg py-2.5">Date & Order</th>
                <th className="py-2.5">Method / Gateway</th>
                <th className="py-2.5">Payment Ref / UPI</th>
                <th className="py-2.5">Status</th>
                <th className="px-3 sm:px-space-lg py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {payments.map((p) => (
                <tr key={p._id || p.orderId} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-3 sm:px-space-lg py-3">
                    <Link to={`/admin/orders/${p.orderId}`} className="font-semibold text-secondary hover:underline">
                      {p.orderId}
                    </Link>
                    <span className="block text-[11px] text-outline">{formatDateTime(p.paidAt || p.date)}</span>
                  </td>
                  <td className="py-3">
                    <span className="font-medium text-on-surface">{p.gateway}</span>
                    <span className="block text-[10.5px] text-outline font-mono uppercase">{p.paymentMethod}</span>
                  </td>
                  <td className="py-3">
                    {p.reference ? (
                      <span className="font-mono text-[11.5px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant select-all">
                        {p.reference}
                      </span>
                    ) : (
                      <span className="text-[12px] text-outline">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={p.paymentStatus} />
                    {p.refundedAmount > 0 && (
                      <span className="block text-[10.5px] text-error mt-0.5">
                        Refunded: {formatINR(p.refundedAmount)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 sm:px-space-lg py-3 text-right">
                    <span className="font-bold tabular-nums text-label-lg">
                      {formatINR(p.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

