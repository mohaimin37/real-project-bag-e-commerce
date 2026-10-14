import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { cn, formatDate } from '../../lib/format';
import { EmptyState, ErrorState, Icon, Skeleton } from '../../components/ui';
import { CoinIcon } from '../../components/coins';

const STATUS = {
  pending: ['Waiting', 'text-sky-700 dark:text-sky-300 bg-sky-500/10'],
  rewarded: ['Rewarded', 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'],
  rejected: ['Not eligible', 'text-rose-700 dark:text-rose-300 bg-rose-500/10'],
};

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Couldn’t copy — please select and copy it manually');
  }
}

/** Refer & earn: the customer's code and link, the rule, and their referrals. */
export default function Refer() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['my-referrals'], queryFn: api.myReferrals, select: (d) => d.referrals });
  if (isLoading) return <div className="flex flex-col gap-3"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-24" /></div>;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const link = `${window.location.origin}/register?ref=${encodeURIComponent(data.code)}`;
  const when = data.rules.qualifyOn === 'signup' ? 'as soon as your friend creates their account' : 'when your friend’s first order is delivered';
  const share = async () => {
    const payload = { title: 'WILDTANE', text: `Join me on WILDTANE with my code ${data.code}`, url: link };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    copy(link, 'Invite link');
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="card p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"><Icon name="group_add" /></span>
          <div>
            <h2 className="text-headline-sm">Refer a friend</h2>
            <p className="text-body-sm text-on-surface-variant">
              You get <strong className="text-on-surface">{data.rules.referralBonus} coins</strong> {when}. One reward per friend; self-referrals don’t count.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={() => copy(data.code, 'Referral code')} className="flex-1 h-11 px-4 rounded-xl border border-dashed border-outline-variant flex items-center justify-between gap-2 hover:bg-surface-container-low">
            <span className="font-mono font-bold tracking-wider text-[16px]">{data.code}</span>
            <span className="text-label-md text-secondary flex items-center gap-1"><Icon name="content_copy" className="text-[16px]" /> Copy code</span>
          </button>
          <button type="button" onClick={share} className="btn-primary h-11 gap-1.5"><Icon name="share" className="text-[18px]" /> Share invite link</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ['Friends rewarded', data.totals.rewarded],
          ['Waiting to qualify', data.totals.pending],
          ['Coins earned', data.totals.coins],
        ].map(([label, value]) => (
          <div key={label} className="card p-3 text-center">
            <p className="text-[20px] font-bold tabular-nums flex items-center justify-center gap-1">{label === 'Coins earned' && <CoinIcon className="w-4 h-4" />}{value}</p>
            <p className="text-[11.5px] text-on-surface-variant">{label}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-headline-sm">Your referrals</h2>
        {data.referrals.length === 0 ? (
          <EmptyState icon="group" title="No referrals yet" description="Share your code — friends enter it when they create their account." />
        ) : (
          <div className="card divide-y divide-surface-container-high">
            {data.referrals.map((r) => (
              <div key={r._id} className="flex items-center gap-3 p-3.5">
                <Icon name="person" className="text-[22px] text-on-surface-variant shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium">{r.name}</p>
                  <p className="text-[12px] text-on-surface-variant">
                    Joined {formatDate(r.joinedAt)}
                    {r.status === 'rewarded' && r.rewardedAt ? ` · rewarded ${formatDate(r.rewardedAt)}` : ''}
                    {r.status === 'rejected' && r.rejectReason ? ` · ${r.rejectReason}` : ''}
                  </p>
                </div>
                <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', STATUS[r.status]?.[1])}>{STATUS[r.status]?.[0] || r.status}</span>
                {r.status === 'rewarded' && <span className="text-[14px] font-bold text-success tabular-nums">+{r.coins}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
