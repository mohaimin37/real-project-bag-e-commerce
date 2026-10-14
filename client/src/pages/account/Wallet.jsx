import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cn, formatDateTime } from '../../lib/format';
import { useMoney } from '../../hooks/useStore';
import { EmptyState, ErrorState, Icon, Skeleton } from '../../components/ui';

const TYPE = {
  refund: ['Refund', 'undo', 'text-success'],
  order_restore: ['Returned from a cancelled order', 'undo', 'text-success'],
  promo: ['Promotional credit', 'redeem', 'text-success'],
  referral: ['Referral credit', 'group_add', 'text-success'],
  admin_credit: ['Credit from WILDTANE', 'add_circle', 'text-success'],
  admin_debit: ['Adjustment by WILDTANE', 'remove_circle', 'text-error'],
  order_debit: ['Used on an order', 'shopping_bag', 'text-on-surface'],
};

export const useMyWallet = () => useQuery({ queryKey: ['my-wallet'], queryFn: api.myWallet, select: (d) => d.wallet, staleTime: 30 * 1000 });

/** WILDTANE Wallet: ₹ credit (refunds, promotions). Separate from loyalty coins, which are points. */
export default function Wallet() {
  const money = useMoney();
  const { data: w, isLoading, isError, error, refetch } = useMyWallet();
  if (isLoading) return <div className="flex flex-col gap-3"><Skeleton className="h-32 rounded-2xl" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="rounded-2xl p-5 bg-on-surface text-surface shadow-card flex items-center gap-4">
        <span className="w-12 h-12 rounded-xl bg-surface/15 flex items-center justify-center shrink-0">
          <Icon name="account_balance_wallet" className="text-[26px]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wider opacity-75">WILDTANE Wallet</p>
          <p className="text-[30px] leading-tight font-bold tabular-nums">{money(w.balance)}</p>
          <p className="text-[13px] opacity-80">
            {w.rules.enabled
              ? `Use it at checkout${w.rules.maxRedeemPercent < 100 ? ` for up to ${w.rules.maxRedeemPercent}% of an order` : ''}.`
              : 'Wallet payments are paused right now.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          ['undo', 'Refunds credited', w.totals.refunds, 'bg-sky-600'],
          ['redeem', 'Promotional credits', w.totals.promotional, 'bg-violet-600'],
          ['group_add', 'Referral credits', w.totals.referral, 'bg-emerald-600'],
        ].map(([icon, label, value, tone]) => (
          <div key={label} className="card p-3.5 flex items-center gap-3">
            <span className={cn('w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0', tone)}><Icon name={icon} className="text-[20px]" /></span>
            <span>
              <span className="block text-[16px] font-bold tabular-nums">{money(value)}</span>
              <span className="block text-[12px] text-on-surface-variant">{label}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-on-surface-variant flex items-start gap-1.5">
        <Icon name="info" className="text-[16px] shrink-0" />
        Wallet money is in rupees and is separate from your <Link to="/account/coins" className="underline">loyalty coins</Link>. Money paid from your wallet comes back here if that order is cancelled. The wallet can’t be topped up directly.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-headline-sm">Wallet history</h2>
        {w.history.length === 0 ? (
          <EmptyState icon="account_balance_wallet" title="No wallet activity yet" description="Refunds you choose to take as wallet credit, and any promotional credits, appear here." />
        ) : (
          <div className="card divide-y divide-surface-container-high">
            {w.history.map((h) => {
              const [label, icon, tone] = TYPE[h.type] || [h.type, 'circle', ''];
              return (
                <div key={h._id} className="flex items-center gap-3 p-3.5">
                  <Icon name={icon} className={cn('text-[22px] shrink-0', tone)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium">{label}</p>
                    <p className="text-[12px] text-on-surface-variant truncate">
                      {h.orderId ? <Link to={`/account/orders/${h.orderId}`} className="underline">{h.orderId}</Link> : null}
                      {h.orderId && h.description ? ' · ' : ''}
                      {h.description}
                    </p>
                    <p className="text-[11px] text-outline">
                      {formatDateTime(h.createdAt)} · {h.status === 'completed' ? 'Completed' : h.status}
                      {h.expiresAt ? ` · expires ${formatDateTime(h.expiresAt)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-[16px] font-bold tabular-nums', h.amount > 0 ? 'text-success' : 'text-on-surface')}>{h.amount > 0 ? '+' : '−'}{money(Math.abs(h.amount))}</p>
                    <p className="text-[11px] text-outline">Balance {money(h.balanceAfter)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
