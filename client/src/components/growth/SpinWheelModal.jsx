import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useUser } from '../../hooks/useStore';
import { Button, Icon, Modal } from '../ui';

// Shown only until the server sends the admin's prizes (Admin → Settings → Spin wheel).
const FALLBACK_SLICES = [
  { short: '₹50 Off', color: '#0284c7' },
  { short: '10% Off', color: '#7c3aed' },
  { short: '₹150 Off', color: '#059669' },
  { short: 'Free Ship', color: '#e11d48' },
];

/** Point on the wheel (viewBox 0–100) at `deg` clockwise from the top. */
const polar = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};

/** The wheel: N equal slices clockwise from the top, each labelled along its middle. */
function WheelFace({ slices }) {
  const n = slices.length;
  const step = 360 / n;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      {slices.map((s, i) => {
        const [x1, y1] = polar(i * step, 50);
        const [x2, y2] = polar((i + 1) * step, 50);
        const mid = i * step + step / 2;
        const [tx, ty] = polar(mid, 31);
        return (
          <g key={i}>
            <path d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={s.color} stroke="rgba(255,255,255,.35)" strokeWidth="0.4" />
            <text x={tx} y={ty} transform={`rotate(${mid} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={n > 6 ? 4.2 : 5} fontWeight="800" style={{ textTransform: 'uppercase' }}>
              {s.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Spin status for the signed-in shopper (or "sign in required" for guests). Shared by the badge, menus and auto-show. */
export function useSpinStatus() {
  const user = useUser();
  return useQuery({ queryKey: ['spin-status', user?._id || 'guest'], queryFn: api.spinStatus, staleTime: 5 * 60 * 1000 });
}

/** Opens the wheel from anywhere (menus, badge). */
export const openSpinWheel = () => window.dispatchEvent(new Event('open-spin-modal'));

function PrizeCard({ reward }) {
  return (
    <div className="mt-4 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/30 w-full text-center animate-bump">
      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Your prize today</p>
      <p className="text-headline-sm font-black text-on-surface mt-0.5">{reward.label}</p>
      {reward.code && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-surface border border-outline-variant font-mono font-bold text-sm select-all">{reward.code}</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reward.code);
                toast.success('Code copied');
              } catch {
                toast(`Your code: ${reward.code}`);
              }
            }}
            className="btn-tonal btn-sm flex items-center gap-1"
          >
            <Icon name="content_copy" className="text-[14px]" /> Copy
          </button>
        </div>
      )}
      {reward.note && <p className="text-xs text-on-surface-variant mt-2 font-medium">{reward.note}</p>}
      <p className="text-[11px] text-outline mt-1">Enter the code in your bag or at checkout.</p>
    </div>
  );
}

export function SpinWheelModal({ open, onClose }) {
  const qc = useQueryClient();
  const user = useUser();
  const { pathname } = useLocation();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonReward, setWonReward] = useState(null);
  const { data: status } = useSpinStatus();
  const [playedSlices, setPlayedSlices] = useState(null);
  const slices = playedSlices || (status?.slices?.length >= 2 ? status.slices : FALLBACK_SLICES);

  useEffect(() => {
    if (open) setWonReward(null);
  }, [open]);

  const spinMutation = useMutation({
    mutationFn: api.spinPlay,
    onSuccess: (data) => {
      const sliceIdx = data.sliceIndex ?? 0;
      // Draw exactly the wheel the server spun (prizes may have been edited since the page loaded).
      const wheel = data.slices?.length >= 2 ? data.slices : slices;
      if (data.slices?.length >= 2) setPlayedSlices(data.slices);
      const step = 360 / wheel.length;
      // Land the centre of the won slice under the top pointer after 5 turns.
      setRotation(1800 + (360 - (sliceIdx * step + step / 2)));
      setTimeout(() => {
        setSpinning(false);
        setWonReward(data.reward);
        qc.invalidateQueries({ queryKey: ['spin-status'] }); // hides the floating button for today
        toast.success(`You won ${data.reward.label}!`, { icon: '🎉' });
      }, 3500);
    },
    onError: (err) => {
      setSpinning(false);
      qc.invalidateQueries({ queryKey: ['spin-status'] });
      toast.error(err.message || 'Unable to spin right now.');
    },
  });

  const canSpin = Boolean(user && status?.eligible);
  const handleSpin = () => {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setWonReward(null);
    setRotation(0);
    spinMutation.mutate();
  };
  const prize = wonReward || status?.todayReward;

  return (
    <Modal open={open} onClose={() => !spinning && onClose()} title="" size="md">
      <div className="flex flex-col items-center text-center p-2 sm:p-4">
        <div className="mb-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-violet-500/15 text-violet-700 dark:text-violet-300 mb-1">
            <Icon name="casino" className="text-[16px]" /> Daily Spin & Win
          </span>
          <h2 className="text-headline-md font-black text-on-surface">Spin once a day</h2>
          <p className="text-body-sm text-on-surface-variant max-w-sm mt-0.5">
            One spin per day. Your prize is a personal code that works on one order until midnight (IST).
          </p>
        </div>

        <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-3 flex items-center justify-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-3.5 z-20">
            <div className="w-6 h-7 bg-on-surface shadow-md" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
          </div>
          <div
            className="w-full h-full rounded-full border-4 border-on-surface/80 shadow-2xl relative overflow-hidden transition-transform ease-out"
            style={{ transform: `rotate(${rotation}deg)`, transitionDuration: spinning ? '3.5s' : '0s' }}
          >
            <WheelFace slices={slices} />
          </div>
          <button
            type="button"
            onClick={handleSpin}
            disabled={spinning || !canSpin}
            aria-label="Spin the wheel"
            className="absolute z-10 w-16 h-16 rounded-full bg-surface-container-lowest border-4 border-on-surface/80 shadow-xl flex flex-col items-center justify-center font-black text-[12px] text-on-surface hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
          >
            {spinning ? <Icon name="sync" className="animate-spin text-[22px]" /> : <><Icon name="play_arrow" className="text-[18px]" /><span className="leading-none mt-0.5">SPIN</span></>}
          </button>
        </div>

        {prize && <PrizeCard reward={prize} />}

        <div className="mt-4 w-full">
          {!user ? (
            <Link to={`/login?next=${encodeURIComponent(pathname)}`} onClick={onClose} className="btn-primary w-full h-11 font-bold">
              Sign in to spin
            </Link>
          ) : (
            <Button variant="primary" onClick={handleSpin} disabled={spinning || !canSpin} loading={spinning} className="w-full h-11 font-bold text-sm">
              {spinning ? 'Spinning…' : canSpin ? 'Spin the wheel' : 'Come back tomorrow'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Floating button (bottom-left). Shown only while today's spin is still available — it disappears
 * once the shopper has played, and comes back the next day. The wheel is always reachable from the menus.
 */
export function SpinFloatingBadge({ onClick }) {
  const { data: status } = useSpinStatus();
  // Appears once the shopper scrolls past the top of the page, so it never covers the hero's buttons.
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 480);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 480);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!status || status.enabled === false) return null;
  const available = status.eligible || status.signInRequired;
  if (!available || !scrolled) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Spin to win"
      className="fixed bottom-6 left-6 z-40 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-rose-600 text-white font-bold text-xs shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all ring-2 ring-white/20 animate-fade-in"
    >
      <Icon name="casino" className="text-[18px]" />
      <span>Spin & Win</span>
    </button>
  );
}

/**
 * Opens the wheel by itself once per day per device — only while today's spin is still available,
 * a few seconds after the shopper arrives, and never on sign-in or account pages.
 */
export function useDailySpinPrompt(open) {
  const { data: status } = useSpinStatus();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!status || status.enabled === false || !(status.eligible || status.signInRequired)) return undefined;
    if (/^\/(login|register|forgot-password|reset-password|account|checkout|order)/.test(pathname)) return undefined;
    const today = status.day || new Date().toISOString().slice(0, 10);
    let shown = '';
    try {
      shown = localStorage.getItem('wt-spin-prompted') || '';
    } catch {
      return undefined;
    }
    if (shown === today) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem('wt-spin-prompted', today);
      } catch {}
      open();
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.eligible, status?.signInRequired, status?.day, pathname]);
}
