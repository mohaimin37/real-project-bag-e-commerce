import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useMoney, useUser } from '../hooks/useStore';
import { cn } from '../lib/format';
import { Button, EmptyState, ErrorState, Field, Icon, Img, Input, Skeleton, StatusBadge } from '../components/ui';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Seo from '../components/Seo';

const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Shown in the order the team enabled them (Admin → Settings → Returns).
const OPTIONS = {
  UPI: { label: 'UPI ID', hint: 'Fastest — straight to your UPI app (GPay, PhonePe, Paytm…)', icon: 'qr_code_2' },
  'Bank Transfer': { label: 'Bank account', hint: 'NEFT / IMPS to your savings or current account', icon: 'account_balance' },
  'Original Payment Method': { label: 'Original payment', hint: 'Back to the card / UPI / net banking you paid with', icon: 'credit_card' },
  'Store Coins Wallet': { label: 'WILDTANE Wallet', hint: 'Instant credit to spend on your next order', icon: 'account_balance_wallet' },
};
const OPEN = ['Approved', 'Pickup Scheduled', 'In Inspection'];

/** Same rules as the server, so mistakes show before sending. */
function problem(method, upiId, bank) {
  if (method === 'UPI' && !UPI_RE.test(upiId.trim())) return 'Please enter a valid UPI ID, like yourname@okhdfcbank.';
  if (method === 'Bank Transfer') {
    if (bank.accountHolder.trim().length < 2) return 'Please enter the account holder’s name.';
    if (!/^\d{9,18}$/.test(bank.accountNumber)) return 'Please enter a valid bank account number (9 to 18 digits).';
    if (bank.accountNumber !== bank.confirmNumber) return 'The two account numbers don’t match.';
    if (!IFSC_RE.test(bank.ifsc)) return 'Please enter a valid IFSC code, like HDFC0001234.';
  }
  return '';
}

/**
 * /returns-exchange/refund/:requestId — after the team approves a return, the customer chooses how
 * the money comes back (UPI, bank account, original payment or wallet) and gives the details.
 */
export default function ReturnRefund() {
  const { requestId } = useParams();
  const user = useUser();
  const money = useMoney();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['returns', 'request', requestId],
    queryFn: () => api.myReturnRequest(requestId),
    enabled: Boolean(user && requestId),
    retry: (n, e) => e?.status !== 404 && n < 2,
  });
  const r = data?.request;
  const methods = data?.refundMethods || [];

  const [method, setMethod] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState({ accountHolder: '', accountNumber: '', confirmNumber: '', ifsc: '', bankName: '' });
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!r) return;
    setMethod(methods.includes(r.refundMethod) && r.refundDetailsSubmittedAt ? r.refundMethod : methods[0] || '');
    setUpiId(r.refundDetails?.upiId || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.requestId, r?.refundMethod]);

  const save = useMutation({
    mutationFn: () =>
      api.setReturnRefund(requestId, {
        refundMethod: method,
        refundDetails: method === 'UPI' ? { upiId: upiId.trim() } : method === 'Bank Transfer' ? { accountHolder: bank.accountHolder, accountNumber: bank.accountNumber, ifsc: bank.ifsc, bankName: bank.bankName } : {},
      }),
    onSuccess: () => {
      toast.success('Thanks! We’ll send your refund this way.');
      qc.invalidateQueries({ queryKey: ['returns'] });
      setEditing(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e) => {
    e.preventDefault();
    const p = problem(method, upiId, bank);
    if (p) return toast.error(p);
    save.mutate();
  };

  const items = r?.items || [];
  const value = items.reduce((n, it) => n + (it.totalPrice || 0), 0);
  const open = r && r.type === 'return' && OPEN.includes(r.status) && (!r.refund?.status || r.refund.status === 'None');
  const submitted = !!r?.refundDetailsSubmittedAt;
  const showForm = open && (!submitted || editing);
  const setB = (patch) => setBank((b) => ({ ...b, ...patch }));

  return (
    <div className="container-x max-w-3xl py-space-xl flex flex-col gap-space-lg">
      <Seo title="Choose how to get your refund" noindex />
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Returns & Exchange', to: '/returns-exchange' }, { label: 'Refund details' }]} />

      <div className="flex flex-col gap-1">
        <span className="eyebrow">Returns & Exchange</span>
        <h1 className="text-headline-xl-mobile md:text-headline-lg">How would you like your money back?</h1>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>
      ) : isError ? (
        error?.status === 404 ? (
          <EmptyState icon="search_off" title="We couldn’t find that request" description="It may belong to a different account. Your own requests are on the Returns & Exchange page." action={<Link to="/returns-exchange?tab=requests" className="btn-primary">See my requests</Link>} />
        ) : (
          <ErrorState error={error} onRetry={refetch} />
        )
      ) : r ? (
        <>
          {/* The return this refund is for */}
          <section className="card p-4 sm:p-5 flex flex-col gap-3 border border-surface-container-high">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-label-sm uppercase tracking-wider text-outline">Return {r.requestId}</p>
                <p className="text-body-sm text-on-surface-variant">Order <Link to={`/account/orders/${r.orderId}`} className="underline">{r.orderId}</Link></p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            {items.map((it) => (
              <div key={`${it.productId}-${it.variantId}`} className="flex items-center gap-3">
                <Img src={it.image} alt="" className="w-12 h-12 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-label-lg">{it.productName}</p>
                  <p className="text-label-sm font-normal text-outline">{it.variantName ? `${it.variantName} · ` : ''}Qty {it.quantity}</p>
                </div>
                {it.totalPrice > 0 && <span className="text-label-lg">{money(it.totalPrice)}</span>}
              </div>
            ))}
            {value > 0 && <p className="text-body-sm pt-2 border-t border-surface-container-high">Refund for these items: <b>{money(value)}</b> <span className="text-outline">(the amount actually paid for them, sent after the item passes inspection)</span></p>}
          </section>

          {r.type !== 'return' ? (
            <Notice icon="info" title="This is an exchange" text="Exchanges don’t need refund details. We’ll send your replacement after the pickup." />
          ) : r.status === 'Requested' ? (
            <Notice icon="hourglass_top" title="Your return is still in process" text="We’ll ask for your refund details as soon as our team approves the return. You’ll get an email too." />
          ) : r.status === 'Rejected' ? (
            <Notice icon="block" tone="bad" title="This item cannot be returned or exchanged" text="Our team could not approve this return, so there is no refund to send. Contact support if you have questions." />
          ) : r.status === 'Cancelled' ? (
            <Notice icon="cancel" title="You cancelled this return" text="Nothing more to do here." />
          ) : !open ? (
            <Notice
              icon="payments"
              title={r.refund?.status === 'Processed' ? 'Your refund has been sent' : 'Your refund has started'}
              text={`${r.refund?.amount ? `${money(r.refund.amount)} ` : ''}to ${r.refund?.method || r.refundMethod}${r.refund?.status === 'Processed' && r.refund?.reference ? ` · Reference ${r.refund.reference}` : ''}. ${r.refund?.status === 'Processed' ? 'It can take a little time to show in your bank or UPI app.' : 'You’ll see the transaction reference here once it is sent.'}`}
            />
          ) : showForm ? (
            <form onSubmit={submit} className="card p-4 sm:p-6 flex flex-col gap-5 border border-secondary/30">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0"><Icon name="task_alt" className="text-[22px]" /></span>
                <div>
                  <p className="text-[15px] font-bold">Your return is approved</p>
                  <p className="text-body-sm text-on-surface-variant">Choose where we should send the refund. Only our refunds team sees these details.</p>
                </div>
              </div>

              <div role="radiogroup" aria-label="Refund method" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {methods.map((m) => (
                  <label key={m} className={cn('flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors', method === m ? 'border-secondary bg-secondary/5 ring-1 ring-secondary' : 'border-outline-variant/50 hover:border-outline')}>
                    <input type="radio" name="refund-method" value={m} checked={method === m} onChange={() => setMethod(m)} className="mt-1" />
                    <Icon name={OPTIONS[m]?.icon || 'payments'} className="text-[22px] text-secondary shrink-0" />
                    <span className="flex flex-col">
                      <span className="text-body-sm font-semibold">{OPTIONS[m]?.label || m}</span>
                      <span className="text-[12px] text-on-surface-variant">{OPTIONS[m]?.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {method === 'UPI' && (
                <Field label="Your UPI ID" required error={upiId.length > 3 && !UPI_RE.test(upiId.trim()) ? 'That doesn’t look like a UPI ID (name@bank).' : undefined}>
                  <Input placeholder="yourname@okhdfcbank" value={upiId} onChange={(e) => setUpiId(e.target.value.replace(/\s/g, ''))} autoComplete="off" />
                </Field>
              )}
              {method === 'Bank Transfer' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Account holder name" required className="sm:col-span-2"><Input value={bank.accountHolder} onChange={(e) => setB({ accountHolder: e.target.value })} autoComplete="name" /></Field>
                  <Field label="Account number" required><Input inputMode="numeric" value={bank.accountNumber} onChange={(e) => setB({ accountNumber: e.target.value.replace(/\D/g, '').slice(0, 18) })} autoComplete="off" /></Field>
                  <Field label="Re-enter account number" required error={bank.confirmNumber && bank.confirmNumber !== bank.accountNumber ? 'Doesn’t match' : undefined}>
                    <Input inputMode="numeric" value={bank.confirmNumber} onChange={(e) => setB({ confirmNumber: e.target.value.replace(/\D/g, '').slice(0, 18) })} autoComplete="off" onPaste={(e) => e.preventDefault()} />
                  </Field>
                  <Field label="IFSC code" required error={bank.ifsc.length === 11 && !IFSC_RE.test(bank.ifsc) ? 'IFSC is 11 characters, like HDFC0001234.' : undefined}>
                    <Input value={bank.ifsc} maxLength={11} onChange={(e) => setB({ ifsc: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="HDFC0001234" autoComplete="off" />
                  </Field>
                  <Field label="Bank name"><Input value={bank.bankName} onChange={(e) => setB({ bankName: e.target.value })} placeholder="e.g. HDFC Bank" /></Field>
                </div>
              )}
              {method === 'Store Coins Wallet' && <p className="text-body-sm text-on-surface-variant">The refund is added to your WILDTANE Wallet once the item passes inspection. You can use it on any order.</p>}
              {method === 'Original Payment Method' && <p className="text-body-sm text-on-surface-variant">We send it back to the card, UPI or net banking account you paid with. Banks usually take a few working days to show it.</p>}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-surface-container-high">
                {submitted && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Keep current details</button>}
                <Button type="submit" loading={save.isPending} icon="check" disabled={!method}>Save refund details</Button>
              </div>
              <p className="text-[12px] text-outline flex items-center gap-1.5"><Icon name="lock" className="text-[14px]" /> Your details are used only to send this refund.</p>
            </form>
          ) : (
            <section className="card p-4 sm:p-5 flex flex-col gap-3 border border-secondary/30">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0"><Icon name={OPTIONS[r.refundMethod]?.icon || 'payments'} className="text-[22px]" /></span>
                <div className="flex-1">
                  <p className="text-[15px] font-bold">We’ll refund you by {OPTIONS[r.refundMethod]?.label || r.refundMethod}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {r.refundMethod === 'UPI' && r.refundDetails?.upiId}
                    {r.refundMethod === 'Bank Transfer' && `${r.refundDetails?.accountHolder || ''} · account ending ${r.refundDetails?.accountLast4 || '••••'}${r.refundDetails?.bankName ? ` · ${r.refundDetails.bankName}` : ''}`}
                    {['Original Payment Method', 'Store Coins Wallet'].includes(r.refundMethod) && OPTIONS[r.refundMethod]?.hint}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-tonal h-9 gap-1.5" onClick={() => setEditing(true)}><Icon name="edit" className="text-[16px]" /> Change</button>
                <button type="button" className="btn-primary h-9 gap-1.5" onClick={() => navigate('/returns-exchange')}>Done</button>
              </div>
            </section>
          )}

          <Link to={`/returns-exchange/help/${encodeURIComponent(r.requestId)}`} className="text-body-sm text-secondary font-semibold hover:underline self-start inline-flex items-center gap-1">
            <Icon name="timeline" className="text-[18px]" /> Request details & help
          </Link>
        </>
      ) : null}
    </div>
  );
}

function Notice({ icon, title, text, tone }) {
  return (
    <section className={cn('card p-5 flex items-start gap-3 border', tone === 'bad' ? 'border-error/30 bg-error-container/40' : 'border-surface-container-high')}>
      <Icon name={icon} className={cn('text-[26px] shrink-0', tone === 'bad' ? 'text-error' : 'text-secondary')} />
      <div>
        <p className="text-[15px] font-bold">{title}</p>
        <p className="text-body-sm text-on-surface-variant mt-0.5">{text}</p>
      </div>
    </section>
  );
}
