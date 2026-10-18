import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { cn } from '../lib/format';
import { useConfig, useUser } from '../hooks/useStore';
import { Icon, Toggle } from './ui';

/** Small brass coin used wherever loyalty coins appear. */
export function CoinIcon({ className }) {
  return (
    // Default size only when the caller doesn't set one (cn doesn't merge conflicting classes).
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('inline-block shrink-0', !/\bw-/.test(className || '') && 'w-4 h-4', className)}>
      <defs>
        <linearGradient id="wt-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d58a" />
          <stop offset="1" stopColor="#c08a2e" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#wt-coin)" stroke="#9a6b1f" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="#9a6b1f" strokeOpacity=".45" strokeWidth="1" />
      <path d="M7.2 9.2l1.9 5.6 2.9-4.3 2.9 4.3 1.9-5.6" fill="none" stroke="#7a5214" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The signed-in shopper's coin balance and history (refreshed after orders and cancellations). */
export function useMyCoins() {
  const user = useUser();
  return useQuery({ queryKey: ['my-coins'], queryFn: api.myCoins, select: (d) => d.coins, staleTime: 30 * 1000, enabled: Boolean(user) });
}

/** Store loyalty rules from the public config (safe defaults while loading). */
export function useLoyalty() {
  const { data: config } = useConfig();
  return config?.loyalty || { enabled: true, coinsPer100: 5, rupeesPerCoin: 1, maxRedeemPercent: 50 };
}

/** "Earn N coins" line for a price (product page). */
export function EarnCoins({ amount, className }) {
  const rules = useLoyalty();
  const coins = rules.enabled ? Math.floor(amount / 100) * rules.coinsPer100 : 0;
  if (!coins) return null;
  return (
    <p className={cn('inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant', className)}>
      <CoinIcon /> Earn <b className="text-on-surface">{coins} WILDTANE Coins</b> on this purchase
    </p>
  );
}

/** Line under order totals: what this order earns. Guests are invited to sign in. */
export function EarnLine({ summary, className }) {
  const user = useUser();
  const c = summary?.coins;
  if (!c?.enabled || !c.willEarn) return null;
  return (
    <p className={cn('flex items-center gap-1.5 text-[12px] px-2.5 py-2 rounded-lg bg-[#c08a2e]/10 text-on-surface', className)}>
      <CoinIcon />
      {user ? (
        <span>You'll earn <b>{c.willEarn} coins</b> with this order — use them next time.</span>
      ) : (
        <span><Link to="/login?next=/cart" className="font-semibold underline">Sign in</Link> to earn <b>{c.willEarn} coins</b> with this order.</span>
      )}
    </p>
  );
}

/**
 * Checkout card: shows the balance and lets the shopper spend coins on this order.
 * summary.coins comes from the server, so the total shown always matches what is charged.
 */
export function UseCoinsCard({ summary, onToggle, busy }) {
  const user = useUser();
  const c = summary?.coins;
  if (!c?.enabled) return null;
  const value = (n) => `₹${(n * c.rupeesPerCoin).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const has = c.balance > 0;

  if (!user) {
    return (
      <div className="rounded-2xl p-3 sm:p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 border border-surface-container-high bg-surface-container-lowest">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full bg-[#c08a2e]/15 flex items-center justify-center shrink-0"><CoinIcon className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-on-surface">WILDTANE Coins</p>
            <p className="text-[11.5px] text-on-surface-variant leading-tight">Sign in to redeem coins alongside your flat discount.</p>
          </div>
        </div>
        <Link to="/login?next=/cart" className="text-label-sm font-semibold text-secondary hover:underline shrink-0">Sign in</Link>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl p-3 sm:p-3.5 flex flex-col gap-2.5 border transition-all', c.used ? 'border-[#c08a2e] bg-[#c08a2e]/10 shadow-sm' : 'border-surface-container-high bg-surface-container-lowest')}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#c08a2e]/20 flex items-center justify-center shrink-0"><CoinIcon className="w-5 h-5 sm:w-6 sm:h-6" /></span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] sm:text-[14px] font-semibold text-on-surface">WILDTANE Coins</p>
            {c.used > 0 && <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#c08a2e] text-white">Redeemed</span>}
          </div>
          <p className="text-[11.5px] sm:text-[12px] text-on-surface-variant truncate">
            {has ? <>Balance <b className="text-on-surface">{c.balance} coins</b> · worth {value(c.balance)}</> : 'You have 0 coins in your wallet'}
          </p>
        </div>
        {has && c.usable > 0 && (
          <div className="shrink-0 ml-1">
            <Toggle checked={Boolean(c.used)} disabled={busy} onChange={onToggle} label={<span className="sr-only">Use coins</span>} />
          </div>
        )}
      </div>
      {has && c.usable > 0 && (
        <p className={cn('text-[11.5px] sm:text-[12px] flex items-center gap-1 leading-snug', c.used ? 'text-success font-semibold' : 'text-on-surface-variant')}>
          <Icon name={c.used ? 'check_circle' : 'savings'} className="text-[16px] shrink-0" />
          <span>{c.used ? `${c.used} coins applied — you save ${value(c.used)}` : `Redeem ${c.usable} coins to save ${value(c.usable)} on this order`}</span>
        </p>
      )}
      {has && c.usable < c.balance && (
        <p className="text-[10.5px] sm:text-[11px] text-outline">Coins can pay up to {c.maxRedeemPercent}% of the item total.</p>
      )}
      {summary?.coupon && c.used > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-[11.5px] font-semibold text-[#8b6118] dark:text-[#f3d489] bg-[#c08a2e]/15 px-2.5 py-1 rounded-md">
          <Icon name="verified" className="text-[14px] shrink-0" /> Applied together with Flat Discount ({summary.coupon.code})
        </div>
      )}
      {c.willEarn > 0 && (
        <p className="text-[11.5px] sm:text-[12px] text-on-surface-variant flex items-center gap-1">
          <Icon name="add_circle" className="text-[16px] text-[#c08a2e] shrink-0" /> This order earns <b className="text-on-surface">{c.willEarn} coins</b> ({c.coinsPer100} for every ₹100)
        </p>
      )}
    </div>
  );
}
