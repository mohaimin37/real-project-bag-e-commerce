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
  UPI: { label: 'UPI ID & Scanner', hint: 'Fastest — UPI ID or upload scanner QR code (GPay, PhonePe, Paytm)', icon: 'qr_code_2' },
  'Bank Transfer': { label: 'Bank account', hint: 'NEFT / IMPS to your savings or current account', icon: 'account_balance' },
  'Original Payment Method': { label: 'Original payment', hint: 'Back to the card / UPI / net banking you paid with', icon: 'credit_card' },
  'Store Coins Wallet': { label: 'WILDTANE Wallet', hint: 'Instant credit to spend on your next order', icon: 'account_balance_wallet' },
};
const OPEN = ['Approved', 'Pickup Scheduled', 'In Inspection'];

/** Same rules as the server, so mistakes show before sending. */
function problem(method, upiId, qrCodeImage, bank) {
  if (method === 'UPI' || method === 'UPI QR Scanner') {
    if (!UPI_RE.test(upiId.trim()) && !qrCodeImage) {
      return 'Please enter a valid UPI ID (e.g. yourname@okhdfcbank) or upload your QR scanner image.';
    }
  }
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
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [bank, setBank] = useState({ accountHolder: '', accountNumber: '', confirmNumber: '', ifsc: '', bankName: '' });
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!r) return;
    setMethod(methods.includes(r.refundMethod) && r.refundDetailsSubmittedAt ? r.refundMethod : methods[0] || '');
    setUpiId(r.refundDetails?.upiId || '');
    setQrCodeImage(r.refundDetails?.qrCodeImage || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.requestId, r?.refundMethod]);

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image (PNG or JPG).');
    if (file.size > 5 * 1024 * 1024) return toast.error('Scanner image must be under 5MB.');
    const reader = new FileReader();
    reader.onload = () => {
      setQrCodeImage(reader.result);
      toast.success('QR Scanner image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const save = useMutation({
    mutationFn: () =>
      api.setReturnRefund(requestId, {
        refundMethod: method,
        refundDetails:
          method === 'UPI' || method === 'UPI QR Scanner'
            ? { upiId: upiId.trim(), qrCodeImage }
            : method === 'Bank Transfer'
              ? { accountHolder: bank.accountHolder, accountNumber: bank.accountNumber, ifsc: bank.ifsc, bankName: bank.bankName }
              : {},
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
    const p = problem(method, upiId, qrCodeImage, bank);
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
    <div className="container-x max-w-3xl py-space-md sm:py-space-xl flex flex-col gap-space-md sm:gap-space-lg">
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
          <section className="card p-3.5 sm:p-5 flex flex-col gap-3 border border-surface-container-high">
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
                  <p className="text-label-lg truncate">{it.productName}</p>
                  <p className="text-label-sm font-normal text-outline">{it.variantName ? `${it.variantName} · ` : ''}Qty {it.quantity}</p>
                </div>
                {it.totalPrice > 0 && <span className="text-label-lg shrink-0">{money(it.totalPrice)}</span>}
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
            <form onSubmit={submit} className="card p-3.5 sm:p-6 flex flex-col gap-4 sm:gap-5 border border-secondary/30">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0"><Icon name="task_alt" className="text-[22px]" /></span>
                <div>
                  <p className="text-[15px] font-bold">Your return is approved</p>
                  <p className="text-body-sm text-on-surface-variant">Choose where we should send the refund. Only our refunds team sees these details.</p>
                </div>
              </div>

              <div role="radiogroup" aria-label="Refund method" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {methods.map((m) => (
                  <label key={m} className={cn('flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-colors', method === m ? 'border-secondary bg-secondary/5 ring-1 ring-secondary' : 'border-outline-variant/50 hover:border-outline')}>
                    <input type="radio" name="refund-method" value={m} checked={method === m} onChange={() => setMethod(m)} className="mt-1" />
                    <Icon name={OPTIONS[m]?.icon || 'payments'} className="text-[22px] text-secondary shrink-0" />
                    <span className="flex flex-col">
                      <span className="text-body-sm font-semibold">{OPTIONS[m]?.label || m}</span>
                      <span className="text-[12px] text-on-surface-variant">{OPTIONS[m]?.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {(method === 'UPI' || method === 'UPI QR Scanner') && (
                <div className="flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-4 rounded-xl bg-surface-container-low border border-secondary/20">
                  <Field label="Your UPI ID" hint="e.g. phone-number@paytm or yourname@okhdfcbank">
                    <Input placeholder="yourname@okhdfcbank" value={upiId} onChange={(e) => setUpiId(e.target.value.replace(/\s/g, ''))} autoComplete="off" />
                  </Field>

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-surface-container-high" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline">OR / ALSO</span>
                    <span className="h-px flex-1 bg-surface-container-high" />
                  </div>

                  <Field label="Upload QR Scanner Screenshot" hint="Screenshot of your QR code from GPay, PhonePe, or Paytm">
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border-2 border-dashed border-secondary/40 hover:border-secondary bg-surface-container-lowest cursor-pointer transition-colors text-center">
                        <Icon name="crop_free" className="text-[32px] text-secondary mb-1" />
                        <span className="text-label-md font-bold text-on-surface">Choose QR Code / Scanner Image</span>
                        <span className="text-[11.5px] text-outline mt-0.5">PNG or JPG, up to 5MB</span>
                        <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                      </label>

                      {qrCodeImage && (
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <img src={qrCodeImage} alt="QR Scanner preview" className="w-16 h-16 object-contain rounded-lg bg-white p-1 shadow-xs shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-label-md font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <Icon name="check_circle" className="text-[16px]" /> QR Scanner Attached
                            </p>
                            <p className="text-[11.5px] text-outline">Our refund team will scan this code to pay you.</p>
                          </div>
                          <button type="button" onClick={() => setQrCodeImage('')} className="btn-ghost btn-sm text-error shrink-0">
                            <Icon name="delete" className="text-[18px]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Field>
                </div>
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

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-surface-container-high">
                {submitted && <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setEditing(false)}>Keep current details</button>}
                <Button type="submit" className="w-full sm:w-auto h-11" loading={save.isPending} icon="check" disabled={!method}>Save refund details</Button>
              </div>
              <p className="text-[12px] text-outline flex items-center gap-1.5"><Icon name="lock" className="text-[14px]" /> Your details are used only to send this refund.</p>
            </form>
          ) : (
            <section className="card p-3.5 sm:p-5 flex flex-col gap-3 border border-secondary/30">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0"><Icon name={OPTIONS[r.refundMethod]?.icon || 'payments'} className="text-[22px]" /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold">We’ll refund you by {OPTIONS[r.refundMethod]?.label || r.refundMethod}</p>
                  <div className="text-body-sm text-on-surface-variant mt-1 flex flex-col gap-2">
                    {(r.refundMethod === 'UPI' || r.refundMethod === 'UPI QR Scanner') && (
                      <div className="flex flex-col gap-1.5">
                        {r.refundDetails?.upiId && <p className="break-all">UPI ID: <strong className="text-on-surface font-mono">{r.refundDetails.upiId}</strong></p>}
                        {r.refundDetails?.qrCodeImage && (
                          <div className="flex items-center gap-2 mt-1">
                            <img src={r.refundDetails.qrCodeImage} alt="QR Scanner" className="w-20 h-20 object-contain rounded-lg border border-secondary/30 bg-white p-1 shrink-0" />
                            <span className="text-[12px] text-secondary font-semibold">QR Scanner image saved for refund</span>
                          </div>
                        )}
                      </div>
                    )}
                    {r.refundMethod === 'Bank Transfer' && (
                      <p className="break-words">{r.refundDetails?.accountHolder || ''} · account ending {r.refundDetails?.accountNumber?.slice(-4) || '••••'}{r.refundDetails?.bankName ? ` · ${r.refundDetails.bankName}` : ''}</p>
                    )}
                    {['Original Payment Method', 'Store Coins Wallet'].includes(r.refundMethod) && <p>{OPTIONS[r.refundMethod]?.hint}</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-tonal h-10 px-4 gap-1.5 flex-1 sm:flex-none justify-center" onClick={() => setEditing(true)}><Icon name="edit" className="text-[16px]" /> Change</button>
                <button type="button" className="btn-primary h-10 px-4 gap-1.5 flex-1 sm:flex-none justify-center" onClick={() => navigate('/returns-exchange')}>Done</button>
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
