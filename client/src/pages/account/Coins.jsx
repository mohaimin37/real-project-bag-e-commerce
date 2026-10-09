import { Link } from 'react-router-dom';
import { cn, formatDateTime } from '../../lib/format';
import { CoinIcon, useMyCoins } from '../../components/coins';
import { EmptyState, ErrorState, Icon, Skeleton } from '../../components/ui';

const TYPE = {
  earned: ['Earned', 'add_circle', 'text-success'],
  redeemed: ['Used', 'shopping_bag', 'text-secondary'],
  refunded: ['Returned to you', 'undo', 'text-success'],
  reversed: ['Removed', 'remove_circle', 'text-error'],
  adjusted: ['Adjusted by WILDTANE', 'tune', 'text-on-surface-variant'],
};

export { useMyCoins };

/** Balance banner used on the account overview and the coins page. */
export function CoinBalanceCard({ coins, link = true }) {
  const r = coins.rules;
  const body = (
    <div className="relative overflow-hidden rounded-2xl p-5 text-[#3a2508] bg-gradient-to-br from-[#f7e1a8] via-[#e9c172] to-[#c9953f] shadow-card">
      <CoinIcon className="absolute -right-6 -bottom-8 w-36 h-36 opacity-25" />
      <div className="relative flex items-center gap-4">
        <CoinIcon className="w-12 h-12 drop-shadow" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wider opacity-75">WILDTANE Coins</p>
          <p className="text-[30px] leading-tight font-bold tabular-nums">{coins.balance.toLocaleString('en-IN')}</p>
          <p className="text-[13px]">Worth ₹{coins.worth.toLocaleString('en-IN')} on your next order</p>
        </div>
        {link && <Icon name="chevron_right" className="text-[24px] opacity-70" />}
      </div>
      {r.enabled && (
        <p className="relative mt-3 text-[12px] opacity-80">
          Earn {r.coinsPer100} coins for every ₹100 you spend · 1 coin = ₹{r.rupeesPerCoin} · use them for up to {r.maxRedeemPercent}% of an order
        </p>
      )}
    </div>
  );
  return link ? <Link to="/account/coins" className="block hover:opacity-95 transition-opacity">{body}</Link> : body;
}

export default function Coins() {
  const { data: coins, isLoading, isError, error, refetch } = useMyCoins();
  if (isLoading) return <div className="flex flex-col gap-3"><Skeleton className="h-36 rounded-2xl" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="flex flex-col gap-space-lg">
      <CoinBalanceCard coins={coins} link={false} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          ['shopping_bag', 'Shop', `Every ₹100 you pay for items earns ${coins.rules.coinsPer100} coins. They're added as soon as you order.`],
          ['redeem', 'Use at checkout', 'Switch on “WILDTANE Coins” at checkout to take them off your next order.'],
          ['undo', 'Cancel or return', 'Coins you used come back to you; coins that order earned are removed.'],
        ].map(([icon, t, d]) => (
          <div key={t} className="card p-3.5 flex flex-col gap-1">
            <Icon name={icon} className="text-secondary text-[22px]" />
            <p className="text-[14px] font-semibold">{t}</p>
            <p className="text-[12px] text-on-surface-variant">{d}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-headline-sm">Coin history</h2>
        {coins.history.length === 0 ? (
          <EmptyState icon="savings" title="No coins yet" description="Place your first order to start earning." action={<Link to="/" className="btn-primary">Start shopping</Link>} />
        ) : (
          <div className="card divide-y divide-surface-container-high">
            {coins.history.map((h) => {
              const [label, icon, tone] = TYPE[h.type] || [h.type, 'circle', ''];
              return (
                <div key={h._id} className="flex items-center gap-3 p-3.5">
                  <Icon name={icon} className={cn('text-[22px] shrink-0', tone)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium">{label}</p>
                    <p className="text-[12px] text-on-surface-variant truncate">
                      {h.orderId ? <Link to={`/account/orders/${h.orderId}`} className="underline">{h.orderId}</Link> : null}
                      {h.orderId && h.note ? ' · ' : ''}
                      {h.note && !h.note.startsWith(`Earned on order`) && !h.note.startsWith('Used on order') ? h.note : ''}
                    </p>
                    <p className="text-[11px] text-outline">{formatDateTime(h.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-[16px] font-bold tabular-nums', h.coins > 0 ? 'text-success' : 'text-on-surface')}>{h.coins > 0 ? '+' : ''}{h.coins}</p>
                    <p className="text-[11px] text-outline">Balance {h.balanceAfter}</p>
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
