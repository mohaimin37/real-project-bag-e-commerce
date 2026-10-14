import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi, api } from '../lib/api';
import { cn, formatINR, imgUrl, productImage } from '../lib/format';
import { Button, Field, Icon, Input, Toggle } from '../components/ui';
import { Panel } from './kit';
import { BUILTIN_SHOWCASE, SHOWCASE_TONES } from '../components/layout/ShopMenuWidget';

// ── Spin wheel ────────────────────────────────────────────────────────

const PRIZE_TYPES = [
  ['fixed', '₹ off'],
  ['percentage', '% off'],
  ['free_shipping', 'Free shipping'],
];
// No yellow / gold on the storefront.
const WHEEL_COLOURS = ['#0284c7', '#7c3aed', '#059669', '#e11d48', '#db2777', '#4f46e5', '#0d9488', '#475569'];

/** Mini preview of the wheel exactly as shoppers will see it (switched-on prizes only). */
function WheelPreview({ slices }) {
  const live = slices.filter((s) => s.isActive !== false);
  if (live.length < 2) return <div className="w-40 h-40 rounded-full border-4 border-dashed border-outline-variant flex items-center justify-center text-center text-label-sm text-outline p-4">Switch on at least 2 prizes</div>;
  const step = 360 / live.length;
  const pt = (deg, r) => [50 + r * Math.cos(((deg - 90) * Math.PI) / 180), 50 + r * Math.sin(((deg - 90) * Math.PI) / 180)];
  return (
    <svg viewBox="0 0 100 100" className="w-40 h-40 rounded-full shadow-lg border-4 border-on-surface/70" role="img" aria-label="Wheel preview">
      {live.map((s, i) => {
        const [x1, y1] = pt(i * step, 50);
        const [x2, y2] = pt((i + 1) * step, 50);
        const mid = i * step + step / 2;
        const [tx, ty] = pt(mid, 31);
        return (
          <g key={i}>
            <path d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={s.color} />
            <text x={tx} y={ty} transform={`rotate(${mid} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="5" fontWeight="800">{(s.short || '').toUpperCase()}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function SpinWheelPanel({ value, onChange }) {
  const v = value || {};
  const slices = v.slices || [];
  const setSlices = (next) => onChange({ ...v, slices: next });
  const update = (i, patch) => setSlices(slices.map((s, x) => (x === i ? { ...s, ...patch } : s)));
  const move = (i, d) => {
    const next = [...slices];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setSlices(next);
  };
  const live = slices.filter((s) => s.isActive !== false && Number(s.weight) > 0);
  const total = live.reduce((n, s) => n + Number(s.weight), 0);
  const chance = (s) => (s.isActive !== false && total > 0 ? Math.round((Number(s.weight) / total) * 100) : 0);

  return (
    <Panel
      title="Spin wheel"
      action={
        <Button size="sm" variant="tonal" icon="add" disabled={slices.length >= 8} onClick={() => setSlices([...slices, { label: 'New prize', short: 'Prize', type: 'fixed', value: 100, minOrder: 0, weight: 10, color: WHEEL_COLOURS[slices.length % WHEEL_COLOURS.length], isActive: true }])}>
          Add prize
        </Button>
      }
    >
      <div className="flex flex-col gap-space-md pt-space-md">
        <div className="flex items-center justify-between gap-4 p-space-md rounded-xl bg-surface-container-low">
          <div className="flex items-center gap-3">
            <Icon name="casino" className="text-secondary" />
            <div>
              <p className="text-label-lg">Daily Spin & Win</p>
              <p className="text-body-sm text-on-surface-variant">Signed-in shoppers spin once a day. Each prize is a personal coupon valid on one order until midnight (IST).</p>
            </div>
          </div>
          <Toggle checked={v.enabled !== false} onChange={(on) => onChange({ ...v, enabled: on })} />
        </div>

        <div className="flex flex-col md:flex-row gap-space-lg items-start">
          <div className="flex flex-col items-center gap-2 shrink-0 mx-auto md:mx-0">
            <WheelPreview slices={slices} />
            <p className="text-label-sm text-outline">Preview</p>
          </div>
          <div className="flex-1 w-full flex flex-col gap-space-sm">
            {slices.map((s, i) => (
              <div key={i} className={cn('grid grid-cols-2 md:grid-cols-12 gap-2 p-space-sm rounded-xl bg-surface-container-low items-end', s.isActive === false && 'opacity-60')}>
                <Field label="Prize name (on the prize card)" className="col-span-2 md:col-span-5"><Input value={s.label} maxLength={60} onChange={(e) => update(i, { label: e.target.value })} /></Field>
                <Field label="On the wheel" hint="Max 12 letters" className="md:col-span-3"><Input value={s.short} maxLength={12} onChange={(e) => update(i, { short: e.target.value })} /></Field>
                <Field label="Type" className="md:col-span-2">
                  <select className="input" value={s.type} onChange={(e) => update(i, { type: e.target.value })}>
                    {PRIZE_TYPES.map(([t, l]) => <option key={t} value={t}>{l}</option>)}
                  </select>
                </Field>
                <Field label={s.type === 'percentage' ? '% off' : '₹ off'} className="md:col-span-2">
                  <Input type="number" min={0} max={s.type === 'percentage' ? 90 : undefined} disabled={s.type === 'free_shipping'} value={s.type === 'free_shipping' ? 0 : s.value} onChange={(e) => update(i, { value: Number(e.target.value) })} />
                </Field>
                <Field label="Min. order ₹" hint="0 = any order" className="md:col-span-3"><Input type="number" min={0} value={s.minOrder || 0} onChange={(e) => update(i, { minOrder: Number(e.target.value) })} /></Field>
                <Field label="Chance weight" hint={`≈ ${chance(s)}% of spins`} className="md:col-span-3"><Input type="number" min={0} max={1000} value={s.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })} /></Field>
                <Field label="Colour" className="md:col-span-3">
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {WHEEL_COLOURS.map((c) => (
                      <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => update(i, { color: c })} className={cn('w-6 h-6 rounded-full ring-offset-2 ring-offset-surface', s.color === c && 'ring-2 ring-on-surface')} style={{ background: c }} />
                    ))}
                  </div>
                </Field>
                <div className="col-span-2 md:col-span-3 flex items-center justify-end gap-1 pb-1">
                  <Toggle checked={s.isActive !== false} onChange={(on) => update(i, { isActive: on })} label={s.isActive !== false ? 'On' : 'Off'} />
                  <button type="button" className="btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><Icon name="arrow_upward" /></button>
                  <button type="button" className="btn-icon" disabled={i === slices.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><Icon name="arrow_downward" /></button>
                  <button type="button" className="btn-icon hover:text-error" onClick={() => setSlices(slices.filter((_, x) => x !== i))} aria-label="Remove prize"><Icon name="delete" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          A bigger weight means the prize comes up more often. Example: weights 35 / 30 / 20 / 15 give roughly 35%, 30%, 20% and 15% of spins. Changes apply from the next spin; prizes already won stay valid.
        </p>
      </div>
    </Panel>
  );
}

// ── Razorpay webhook ─────────────────────────────────────────────────

const WEBHOOK_EVENTS = ['payment.captured', 'order.paid', 'refund.processed', 'refund.failed'];
const WEBHOOK_STATUS = {
  ok: ['check_circle', 'Working', 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'],
  bad_signature: ['error', 'Secret does not match', 'bg-error-container text-on-error-container'],
  error: ['warning', 'Last call failed', 'bg-error-container text-on-error-container'],
};

function CopyRow({ label, value }) {
  return (
    <div className="flex items-center gap-2 p-2 pl-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
      <span className="text-label-sm text-outline shrink-0 w-24">{label}</span>
      <code className="flex-1 min-w-0 text-body-sm break-all">{value}</code>
      <button
        type="button"
        className="btn-tonal btn-sm shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            toast.success('Copied');
          } catch {
            toast(value);
          }
        }}
      >
        <Icon name="content_copy" className="text-[16px]" /> Copy
      </button>
    </div>
  );
}

/**
 * Settings → Integrations: where Razorpay should send webhooks, the signing secret (saved here,
 * never shown again) and whether calls are arriving.
 */
export function RazorpayWebhookPanel({ info, onSaved }) {
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const w = info || {};
  const status = WEBHOOK_STATUS[w.lastStatus];
  const save = async (value) => {
    setBusy(true);
    try {
      await adminApi.updateSettings({ razorpayWebhookSecret: value });
      toast.success(value ? 'Webhook secret saved' : 'Webhook secret removed');
      setSecret('');
      onSaved?.();
    } catch (e) {
      toast.error(e.details?.[0]?.message || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Razorpay webhook">
      <div className="flex flex-col gap-space-md pt-space-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-md', w.secretSet ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-surface-container-high text-on-surface-variant')}>
            <Icon name={w.secretSet ? 'lock' : 'lock_open'} className="text-[16px]" />
            {w.secretSet ? `Secret set${w.secretSource === 'server' ? ' (on the server)' : w.secretHint ? ` (${w.secretHint})` : ''}` : 'No secret yet'}
          </span>
          {status ? (
            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-md', status[2])}>
              <Icon name={status[0]} className="text-[16px]" /> {status[1]}
            </span>
          ) : (
            <span className="text-body-sm text-outline">No webhook received yet</span>
          )}
          {w.lastReceivedAt && <span className="text-body-sm text-on-surface-variant">Last: {w.lastEvent || 'event'} · {new Date(w.lastReceivedAt).toLocaleString('en-IN')}</span>}
        </div>
        {w.lastError && w.lastStatus !== 'ok' && <p className="text-body-sm text-error">{w.lastError}</p>}

        <ol className="list-decimal pl-5 flex flex-col gap-1.5 text-body-sm text-on-surface-variant">
          <li>In the <b>Razorpay Dashboard</b>, open <b>Account & Settings → Webhooks → Add New Webhook</b> (in the same Test / Live mode as your keys).</li>
          <li>Paste the <b>Webhook URL</b> below, type a <b>secret</b> of your choice, and tick the events below.</li>
          <li>Paste the <b>same secret</b> here and press Save. Payment and refund updates then arrive by themselves.</li>
        </ol>
        <CopyRow label="Webhook URL" value={w.url || `${window.location.origin}/api/orders/razorpay/webhook`} />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-label-sm text-outline mr-1">Events:</span>
          {WEBHOOK_EVENTS.map((e) => <code key={e} className="px-2 py-0.5 rounded-md bg-surface-container text-label-sm">{e}</code>)}
        </div>

        {w.secretSource === 'server' ? (
          <p className="text-body-sm text-on-surface-variant">The secret is set in the server environment (RAZORPAY_WEBHOOK_SECRET), which always wins. Change it there.</p>
        ) : (
          <form
            className="flex flex-col sm:flex-row gap-2 sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (secret.trim()) save(secret.trim());
            }}
          >
            <Field label={w.secretSet ? 'Replace the secret' : 'Webhook secret'} hint="Write-only: once saved it is never shown again." className="flex-1">
              <Input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Same secret as in Razorpay" />
            </Field>
            <Button type="submit" loading={busy} disabled={!secret.trim()} icon="save">Save secret</Button>
            {w.secretSet && (
              <button type="button" className="btn-ghost h-10 text-error" disabled={busy} onClick={() => window.confirm('Remove the webhook secret? Razorpay updates will be refused until a new one is saved.') && save('')}>
                Remove
              </button>
            )}
          </form>
        )}
      </div>
    </Panel>
  );
}

// ── Return refund options ─────────────────────────────────────────────

const REFUND_OPTIONS = [
  ['Original Payment Method', 'Original payment', 'Back to the card / UPI / net banking used (online orders only — automatic through Razorpay)'],
  ['UPI', 'UPI ID', 'Customer gives a UPI ID; you send the money and press “I have sent this refund”'],
  ['Bank Transfer', 'Bank account', 'Customer gives account number + IFSC; you send by NEFT / IMPS'],
  ['Store Coins Wallet', 'WILDTANE Wallet', 'Credited instantly to the customer’s wallet when you complete the return'],
];

export function ReturnRefundPanel({ value, onChange }) {
  const on = value?.length ? value : REFUND_OPTIONS.map(([v]) => v);
  const toggle = (m, yes) => {
    const next = yes ? REFUND_OPTIONS.map(([v]) => v).filter((v) => v === m || on.includes(v)) : on.filter((v) => v !== m);
    if (next.length) onChange(next);
  };
  return (
    <Panel title="How customers get money back">
      <div className="flex flex-col gap-space-md pt-space-md">
        <p className="text-body-sm text-on-surface-variant">
          When you <b>approve</b> a return, the customer gets an email and a <b>refund page</b> where they choose one of the options you switch on here and enter their details. You see their answer in <b>Returns</b>. Cash-on-delivery customers never see “Original payment”.
        </p>
        {REFUND_OPTIONS.map(([m, label, hint]) => (
          <div key={m} className="flex items-center justify-between gap-4 p-space-md rounded-xl bg-surface-container-low">
            <div>
              <p className="text-label-lg">{label}</p>
              <p className="text-body-sm text-on-surface-variant">{hint}</p>
            </div>
            <Toggle checked={on.includes(m)} disabled={on.includes(m) && on.length === 1} onChange={(yes) => toggle(m, yes)} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Shop menu ─────────────────────────────────────────────────────────

const TONE_NAMES = Object.keys(SHOWCASE_TONES);
// A fixed list, so every icon is in the production icon font (scripts/iconSubset.mjs keeps only names found in the source).
export const SHOWCASE_ICONS = [
  'category', 'backpack', 'luggage', 'shopping_bag', 'business_center', 'work', 'checkroom', 'watch', 'man', 'woman', 'public',
  'flight_takeoff', 'travel_explore', 'laptop_mac', 'water_drop', 'diamond', 'payments', 'sell', 'local_offer', 'percent', 'redeem',
  'card_giftcard', 'new_releases', 'auto_awesome', 'local_fire_department', 'star', 'favorite', 'bolt', 'style', 'eco', 'spa',
  'verified', 'local_shipping', 'lock', 'support_agent', 'assignment_return', 'child_care',
];

/** Editable list of tiles with up / down / delete. */
function TileList({ title, hint, rows, onChange, max, fields, blank }) {
  const update = (i, patch) => onChange(rows.map((r, x) => (x === i ? { ...r, ...patch } : r)));
  const move = (i, d) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-label-lg">{title}</p>
          {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
        </div>
        <Button size="sm" variant="tonal" icon="add" disabled={rows.length >= max} onClick={() => onChange([...rows, { ...blank }])}>Add</Button>
      </div>
      {rows.length === 0 && <p className="text-body-sm text-outline">None — this section is hidden in the Shop menu.</p>}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 p-space-sm rounded-xl bg-surface-container-low items-end">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} className={f.className}>
              {f.key === 'tone' ? (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {TONE_NAMES.map((t) => (
                    <button key={t} type="button" title={t} aria-label={`Colour ${t}`} onClick={() => update(i, { tone: t })} className={cn('w-6 h-6 rounded-full ring-offset-2 ring-offset-surface', SHOWCASE_TONES[t].dot, r.tone === t && 'ring-2 ring-on-surface')} />
                  ))}
                </div>
              ) : f.key === 'icon' ? (
                <div className="flex items-center gap-2">
                  <Icon name={r.icon || 'help'} className="text-[22px] text-secondary shrink-0" />
                  <select className="input" value={r.icon || ''} onChange={(e) => update(i, { icon: e.target.value })}>
                    <option value="">None</option>
                    {[...new Set([...(r.icon ? [r.icon] : []), ...SHOWCASE_ICONS])].map((ic) => <option key={ic} value={ic}>{ic.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              ) : f.key === 'highlights' ? (
                <Input value={(r.highlights || []).join(', ')} onChange={(e) => update(i, { highlights: e.target.value.split(',').map((x) => x.trimStart()).slice(0, 8) })} placeholder="Briefcases, Wallets" />
              ) : f.key === 'img' ? (
                <ImageField value={r.img || ''} onChange={(img) => update(i, { img })} />
              ) : (
                <Input value={r[f.key] || ''} maxLength={f.max} onChange={(e) => update(i, { [f.key]: e.target.value })} placeholder={f.placeholder} />
              )}
            </Field>
          ))}
          <div className="col-span-2 md:col-span-12 flex justify-end gap-1">
            <button type="button" className="btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><Icon name="arrow_upward" /></button>
            <button type="button" className="btn-icon" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><Icon name="arrow_downward" /></button>
            <button type="button" className="btn-icon hover:text-error" onClick={() => onChange(rows.filter((_, x) => x !== i))} aria-label="Remove"><Icon name="delete" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const { image } = await adminApi.upload(file, 'banners');
      onChange(image.url);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-2">
      {value ? <img src={imgUrl(value, 96)} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" /> : <span className="w-10 h-10 rounded-lg bg-surface-container shrink-0" />}
      <label className={cn('btn-tonal btn-sm cursor-pointer', busy && 'opacity-60 pointer-events-none')}>
        <Icon name="upload" className="text-[16px]" /> {busy ? 'Uploading…' : value ? 'Change' : 'Upload'}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {value && <button type="button" className="btn-icon" onClick={() => onChange('')} aria-label="Remove photo"><Icon name="close" /></button>}
    </div>
  );
}

function SpotlightField({ value, onChange }) {
  const [q, setQ] = useState('');
  const search = useQuery({ queryKey: ['admin', 'spotlight-search', q], queryFn: () => api.products({ q, limit: 6 }), enabled: q.trim().length > 1, staleTime: 30 * 1000 });
  const current = useQuery({ queryKey: ['product', value], queryFn: () => api.product(value), enabled: Boolean(value), retry: false });
  const p = current.data?.product;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label-lg">Our pick (optional)</p>
      <p className="text-body-sm text-on-surface-variant">One product featured in the menu with its real price and rating. Leave empty to hide the box.</p>
      {value && (
        <div className="flex items-center gap-3 p-space-sm rounded-xl bg-surface-container-low">
          {p ? <img src={imgUrl(productImage(p), 96)} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <Icon name="inventory_2" className="text-outline" />}
          <div className="flex-1 min-w-0">
            <p className="text-label-lg">{p?.name || value}</p>
            <p className="text-body-sm text-on-surface-variant">{p ? formatINR(p.finalPrice ?? p.price) : current.isError ? 'Product not found or hidden — it won’t show' : 'Loading…'}</p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => onChange('')}>Remove</button>
        </div>
      )}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a product to feature…" />
      {(search.data?.items || []).length > 0 && (
        <div className="flex flex-col rounded-xl border border-outline-variant/50 divide-y divide-surface-container-high overflow-hidden">
          {search.data.items.map((it) => (
            <button key={it._id} type="button" onClick={() => { onChange(it.slug); setQ(''); }} className="flex items-center gap-3 p-2 text-left hover:bg-surface-container-low">
              <img src={imgUrl(productImage(it), 80)} alt="" className="w-9 h-9 rounded-md object-cover" />
              <span className="flex-1 text-body-sm">{it.name}</span>
              <span className="text-label-sm">{formatINR(it.finalPrice ?? it.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const TILE_FIELDS = [
  { key: 'label', label: 'Title', max: 40, className: 'col-span-2 md:col-span-4' },
  { key: 'sub', label: 'Short text', max: 80, className: 'col-span-2 md:col-span-5' },
  { key: 'badge', label: 'Badge', max: 24, className: 'md:col-span-3' },
  { key: 'to', label: 'Link', max: 200, placeholder: '/shop/backpacks', hint: 'A store page starting with /', className: 'md:col-span-4' },
  { key: 'icon', label: 'Icon', max: 40, className: 'md:col-span-3' },
  { key: 'tone', label: 'Colour', className: 'col-span-2 md:col-span-5' },
];
const DEPT_FIELDS = [...TILE_FIELDS, { key: 'img', label: 'Photo (Departments tab)', className: 'col-span-2 md:col-span-5' }, { key: 'highlights', label: 'Popular styles (comma separated)', className: 'col-span-2 md:col-span-7' }];
const PERK_FIELDS = [
  { key: 'icon', label: 'Icon', max: 40, className: 'md:col-span-3' },
  { key: 'title', label: 'Title', max: 40, className: 'md:col-span-4' },
  { key: 'sub', label: 'Short text', max: 60, className: 'col-span-2 md:col-span-5' },
];
const BLANK_TILE = { label: '', sub: '', badge: '', to: '/shop', icon: '', tone: 'slate' };

/** Removes empty rows and stray spaces before saving. */
export function cleanShowcase(sc) {
  if (!sc?.customized) return null;
  const tile = (r) => ({ label: r.label.trim(), sub: (r.sub || '').trim(), badge: (r.badge || '').trim(), to: (r.to || '').trim(), icon: (r.icon || '').trim(), tone: r.tone || 'slate' });
  const keep = (r) => (r.label || '').trim();
  return {
    customized: true,
    departments: (sc.departments || []).filter(keep).map((r) => ({ ...tile(r), img: r.img || '', highlights: (r.highlights || []).map((h) => h.trim()).filter(Boolean) })),
    budgets: (sc.budgets || []).filter(keep).map(tile),
    trends: (sc.trends || []).filter(keep).map(tile),
    perks: (sc.perks || []).filter((r) => (r.title || '').trim()).map((r) => ({ icon: (r.icon || '').trim(), title: r.title.trim(), sub: (r.sub || '').trim() })),
    spotlightSlug: sc.spotlightSlug || '',
  };
}

export function ShopMenuPanel({ value, onChange }) {
  const custom = value?.customized ? value : null;
  const sc = custom || BUILTIN_SHOWCASE;
  // The first edit copies the built-in content, so the admin always starts from what shoppers see.
  const set = (key, v) => onChange({ ...structuredClone(BUILTIN_SHOWCASE), ...(custom || {}), customized: true, [key]: v });
  return (
    <Panel
      title="Shop menu"
      action={custom && <Button size="sm" variant="tonal" icon="restart_alt" onClick={() => window.confirm('Go back to the built-in Shop menu content? Your changes here are removed when you save.') && onChange(null)}>Use built-in</Button>}
    >
      <div className="flex flex-col gap-space-lg pt-space-md">
        <p className="text-body-sm text-on-surface-variant">
          The full-screen menu that opens from <b>Shop</b> in the header and the bottom bar on phones. {custom ? 'You are using your own content.' : 'Showing the built-in content — change anything below to make it yours.'} Categories in the menu come from <b>Catalogue → Categories</b> automatically (empty ones are hidden).
        </p>
        <TileList title="Departments" hint="Big tiles at the top of the menu" rows={sc.departments} onChange={(v) => set('departments', v)} max={8} fields={DEPT_FIELDS} blank={{ ...BLANK_TILE, img: '', highlights: [] }} />
        <TileList title="Shop by budget" hint="Price-range tiles; link to /shop?minPrice=…&maxPrice=…" rows={sc.budgets} onChange={(v) => set('budgets', v)} max={8} fields={TILE_FIELDS} blank={BLANK_TILE} />
        <TileList title="Trending & quick filters" hint="Chips that jump to a search or filter" rows={sc.trends} onChange={(v) => set('trends', v)} max={12} fields={TILE_FIELDS} blank={BLANK_TILE} />
        <TileList title="Promise strip" hint="Small reassurance boxes at the bottom — keep them true" rows={sc.perks} onChange={(v) => set('perks', v)} max={6} fields={PERK_FIELDS} blank={{ icon: 'verified', title: '', sub: '' }} />
        <SpotlightField value={sc.spotlightSlug || ''} onChange={(slug) => set('spotlightSlug', slug)} />
      </div>
    </Panel>
  );
}
