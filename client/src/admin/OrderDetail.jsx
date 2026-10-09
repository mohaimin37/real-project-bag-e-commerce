import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { cn, formatDateTime, formatINR, PAYMENT_LABELS, timeAgo } from '../lib/format';
import { countryName } from '../lib/countries';
import OrderTimeline from '../components/OrderTimeline';
import { Button, ErrorState, Field, Icon, Img, Input, Modal, PageLoader, StatusBadge, Textarea, Toggle, useConfirm } from '../components/ui';
import { Panel } from './kit';

function WhatsAppLog({ notifications, onResent }) {
  const [view, setView] = useState(null);
  const resend = useMutation({
    mutationFn: adminApi.resendNotification,
    onSuccess: (res) => {
      toast.success(res.notification.status === 'sent' ? 'WhatsApp alert sent' : res.notification.status === 'logged' ? 'Logged (WhatsApp API not configured)' : 'Delivery failed again');
      onResent();
    },
    onError: (e) => toast.error(e.message),
  });
  const tone = { sent: 'bg-secondary text-on-secondary', logged: 'bg-tertiary-fixed text-tertiary-container', failed: 'bg-error-container text-on-error-container', pending: 'bg-surface-container-highest' };
  return (
    <Panel title="Outbound Alerts & WhatsApp Logs">
      {notifications.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">No notification recorded for this order yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const isCustomer = n.type === 'customer_order_approval' || n.type === 'customer_invoice';
            const cleanRecip = (n.recipient || '').replace(/[^\d]/g, '');
            const waTarget = cleanRecip.length === 10 ? `91${cleanRecip}` : cleanRecip;
            return (
              <div key={n._id} className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('px-2 py-0.5 rounded-full text-label-sm uppercase', tone[n.status])}>{n.status}</span>
                    <span className="text-label-sm font-semibold text-on-surface">
                      {n.type === 'customer_order_approval' ? '👤 Customer WhatsApp Invoice' : n.type === 'customer_invoice' ? '✉️ Customer Email Invoice' : '🛡️ Admin New Order Alert'}
                    </span>
                  </div>
                  <span className="text-label-sm font-normal text-outline">
                    {n.provider === 'dev_log' ? 'Dev log' : n.provider === 'smtp' ? 'SMTP' : 'Cloud API'} · {n.attempts} attempt{n.attempts === 1 ? '' : 's'} · {timeAgo(n.lastAttemptAt || n.createdAt)}
                  </span>
                </div>
                {n.recipient && (
                  <p className="text-[12px] text-outline">
                    Recipient: <span className="font-mono font-medium text-on-surface">{n.recipient}</span>
                  </p>
                )}
                {n.error && <p className="text-label-md text-error">{n.error}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="tonal" icon="visibility" onClick={() => setView(n)}>Preview</Button>
                  {n.channel === 'whatsapp' && (
                    <>
                      <Button size="sm" variant="tonal" icon="send" loading={resend.isPending} onClick={() => resend.mutate(n._id)}>Resend</Button>
                      <a className="btn-tonal btn-sm text-emerald-700 dark:text-emerald-300" href={`https://wa.me/${waTarget || ''}?text=${encodeURIComponent(n.message)}`} target="_blank" rel="noreferrer">
                        <Icon name="chat" className="text-[18px]" /> Open in WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={Boolean(view)} onClose={() => setView(null)} title="WhatsApp message" size="md">
        {view && (
          <div className="flex flex-col gap-space-md">
            <pre className="whitespace-pre-wrap font-sans text-body-sm p-space-md rounded-xl bg-[#e7fbe6] text-[#111b21] max-h-[60vh] overflow-y-auto">{view.message}</pre>
            <Button
              variant="tonal"
              icon="content_copy"
              onClick={async () => {
                await navigator.clipboard.writeText(view.message);
                toast.success('Message copied');
              }}
            >
              Copy message
            </Button>
          </div>
        )}
      </Modal>
    </Panel>
  );
}

// Fulfilment steps an admin moves an order through, in order.
const STEPS = [
  ['Confirmed', 'task_alt'],
  ['Processing', 'precision_manufacturing'],
  ['Packed', 'inventory_2'],
  ['Shipped', 'local_shipping'],
  ['Out for Delivery', 'two_wheeler'],
  ['Delivered', 'home'],
];
const STEP_NAMES = STEPS.map(([s]) => s);

/** Date → value for <input type="datetime-local"> in the browser's timezone. */
const toLocalInput = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

function StatusUpdater({ order: o, onSaved }) {
  const confirm = useConfirm();
  const currentIdx = STEP_NAMES.indexOf(o.orderStatus);
  const nextStep = STEP_NAMES[currentIdx + 1] || (o.orderStatus === 'Pending' ? 'Confirmed' : '');
  const blank = () => ({ status: nextStep || o.orderStatus, at: toLocalInput(), note: '', trackingNumber: o.trackingNumber || '', courier: o.courier || '', notifyCustomer: true });
  const [form, setForm] = useState(blank);
  const [key, setKey] = useState(o.updatedAt);
  if (key !== o.updatedAt) {
    // The order changed (saved or refetched): start the next update fresh.
    setKey(o.updatedAt);
    setForm(blank());
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });
  const lastAt = (s) => [...(o.statusHistory || [])].reverse().find((h) => h.status === s)?.at;

  const save = useMutation({
    mutationFn: (body) => adminApi.orderStatus(o._id, body),
    onSuccess: (_, body) => {
      toast.success(body.status === o.orderStatus ? 'Tracking details saved' : `Marked as ${body.status}${body.notifyCustomer ? ' · customer notified' : ''}`);
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = async (e) => {
    e.preventDefault();
    if (['Cancelled', 'Returned'].includes(form.status)) {
      const ok = await confirm({ title: `Mark as ${form.status}?`, message: 'Stock will be returned to inventory and any coupon use released. This status is final.', confirmLabel: `Mark ${form.status}` });
      if (!ok) return;
    }
    save.mutate({ ...form, at: form.at ? new Date(form.at).toISOString() : undefined });
  };

  const showTracking = ['Shipped', 'Out for Delivery', 'Delivered'].includes(form.status) || o.trackingNumber;
  return (
    <form onSubmit={submit} className="flex flex-col gap-space-md">
      <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="New status">
        {STEPS.map(([s, icon], i) => {
          const done = i <= currentIdx;
          const at = lastAt(s);
          const selected = form.status === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setForm({ ...form, status: s })}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all',
                selected ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/20' : 'border-surface-container-high hover:bg-surface-container-low',
                done && !selected && 'opacity-70'
              )}
            >
              <span className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', done ? 'bg-secondary text-on-secondary' : selected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-outline')}>
                <Icon name={done ? 'check' : icon} className="text-[18px]" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-label-lg">{s}</span>
                <span className="block text-label-sm font-normal text-outline">
                  {at ? formatDateTime(at) : s === nextStep ? 'Next step' : 'Not yet'}
                </span>
              </span>
              {s === o.orderStatus && <span className="text-label-sm uppercase tracking-wider text-secondary">Current</span>}
            </button>
          );
        })}
      </div>

      <Field label="Date & time of this update" hint="Defaults to now. Change it to log a step that happened earlier.">
        <div className="flex gap-2">
          <Input type="datetime-local" value={form.at} max={toLocalInput()} onChange={set('at')} required />
          <Button type="button" size="sm" variant="tonal" className="h-11 shrink-0" onClick={() => setForm({ ...form, at: toLocalInput() })}>Now</Button>
        </div>
      </Field>
      {showTracking && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Courier"><Input value={form.courier} onChange={set('courier')} placeholder="Blue Dart" /></Field>
          <Field label="Tracking #"><Input value={form.trackingNumber} onChange={set('trackingNumber')} /></Field>
        </div>
      )}
      <Field label="Note for customer & timeline"><Textarea rows={2} value={form.note} onChange={set('note')} placeholder="e.g. Handed to courier at 4 pm" /></Field>
      <Toggle checked={form.notifyCustomer} onChange={(v) => setForm({ ...form, notifyCustomer: v })} label={`Email the customer (${o.email})`} />
      <Button type="submit" loading={save.isPending} icon="update">
        {form.status === o.orderStatus ? 'Save tracking details' : `Mark as ${form.status}`}
      </Button>

      <details className="text-body-sm">
        <summary className="cursor-pointer text-on-surface-variant hover:text-on-surface">Cancel or return this order…</summary>
        <div className="flex gap-2 mt-2">
          {['Cancelled', 'Returned'].map((s) => (
            <button key={s} type="button" onClick={() => setForm({ ...form, status: s })} className={cn('chip h-9 border', form.status === s ? 'bg-error text-on-error border-error' : 'border-surface-container-high hover:bg-surface-container-low')}>
              {s === 'Cancelled' ? 'Cancel order' : 'Mark returned'}
            </button>
          ))}
        </div>
      </details>
    </form>
  );
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} Hundred ${words(n % 100)}`.trim();
  for (const [size, name] of [[1e7, 'Crore'], [1e5, 'Lakh'], [1e3, 'Thousand']]) {
    if (n >= size) return `${words(Math.floor(n / size))} ${name} ${words(n % size)}`.trim();
  }
  return '';
}
/** 12499.5 → "Rupees Twelve Thousand Four Hundred Ninety Nine and Fifty Paise Only" (Indian numbering). */
function amountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  return `Rupees ${words(rupees) || 'Zero'}${paise ? ` and ${words(paise)} Paise` : ''} Only`;
}

/** Print-only customer bill. Hidden on screen; replaces the page when printing. */
function Invoice({ order: o, settings: st }) {
  const a = o.shippingAddress;
  const cell = 'py-2 px-2 border-b border-gray-300 align-top';
  return (
    <div className="hidden print:block text-black bg-white text-[12px] leading-snug">
      <div className="flex justify-between items-start gap-6 pb-4 border-b-2 border-black">
        <div>
          <img src="/brand/logo-horizontal-gold.png" alt="WILDTANE" className="h-9 w-auto mb-1.5" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <p className="text-[20px] font-extrabold tracking-tight uppercase">{st?.companyName || st?.storeName || 'WILDTANE'}</p>
          {st?.businessAddress && <p className="whitespace-pre-line max-w-xs">{st.businessAddress}</p>}
          <p>{[st?.supportEmail, st?.supportPhone].filter(Boolean).join(' · ')}</p>
          {st?.gstin && <p className="font-semibold">GSTIN: {st.gstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold uppercase tracking-wide">{st?.gstin ? 'Tax Invoice' : 'Invoice'}</p>
          <p>Invoice no: <b>{o.orderId}</b></p>
          <p>Order date: {formatDateTime(o.createdAt)}</p>
          <p>Printed: {formatDateTime(new Date())}</p>
          <p>Payment: {PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod} ({o.paymentStatus})</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 py-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-600 font-bold mb-1">Bill to</p>
          <p className="font-semibold">{o.customerName}</p>
          <p>{o.email}</p>
          <p>{o.phone}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-600 font-bold mb-1">Ship to</p>
          <p className="font-semibold">{a.fullName}</p>
          <p>{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}</p>
          {a.landmark && <p>Landmark: {a.landmark}</p>}
          <p>{a.city}, {a.state} {a.postalCode}, {countryName(a.country)}</p>
          <p>{a.phone}</p>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left bg-gray-100">
            <th className={cn(cell, 'w-8')}>#</th>
            <th className={cell}>Item</th>
            <th className={cn(cell, 'text-right w-12')}>Qty</th>
            <th className={cn(cell, 'text-right w-24')}>Unit price</th>
            <th className={cn(cell, 'text-right w-28')}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((it, i) => (
            <tr key={`${it.productId}-${it.variant?.id}`} className="break-inside-avoid">
              <td className={cell}>{i + 1}</td>
              <td className={cell}>
                <p className="font-semibold">{it.productName}</p>
                <p className="text-gray-600">{it.variant?.name}{it.variant?.size ? ` · ${it.variant.size}` : ''} · SKU {it.SKU}</p>
              </td>
              <td className={cn(cell, 'text-right')}>{it.quantity}</td>
              <td className={cn(cell, 'text-right')}>{formatINR(it.unitPrice)}</td>
              <td className={cn(cell, 'text-right')}>{formatINR(it.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between gap-6 pt-3 break-inside-avoid">
        <p className="max-w-sm pt-1"><span className="text-gray-600">Amount in words:</span><br /><b>{amountInWords(o.grandTotal)}</b></p>
        <table className="w-64 border-collapse">
          <tbody>
            <tr><td className="py-0.5">Subtotal</td><td className="py-0.5 text-right">{formatINR(o.subtotal)}</td></tr>
            {o.discount > 0 && <tr><td className="py-0.5">Discount{o.coupon?.code ? ` (${o.coupon.code})` : ''}</td><td className="py-0.5 text-right">−{formatINR(o.discount)}</td></tr>}
            {o.coinDiscount > 0 && <tr><td className="py-0.5">WILDTANE Coins ({o.coinsRedeemed})</td><td className="py-0.5 text-right">−{formatINR(o.coinDiscount)}</td></tr>}
            <tr><td className="py-0.5">Shipping{o.shippingMethod?.label ? ` (${o.shippingMethod.label})` : ''}</td><td className="py-0.5 text-right">{formatINR(o.shipping)}</td></tr>
            <tr><td className="py-0.5 text-gray-600">{st?.taxLabel || 'GST'}{st?.taxRate ? ` @ ${st.taxRate}%` : ''}{st?.pricesIncludeTax !== false ? ' (included)' : ''}</td><td className="py-0.5 text-right text-gray-600">{formatINR(o.tax)}</td></tr>
            <tr className="border-t-2 border-black text-[14px] font-bold"><td className="pt-1.5">Grand total</td><td className="pt-1.5 text-right">{formatINR(o.grandTotal)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-10 pt-3 border-t border-gray-300 flex justify-between text-[10px] text-gray-600">
        <p>Thank you for shopping with {st?.storeName || 'WILDTANE'}. This is a computer-generated invoice and needs no signature.</p>
        <p>Order status: {o.orderStatus}</p>
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => adminApi.order(id) });
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings, select: (d) => d.settings, staleTime: 5 * 60 * 1000 });
  const order = data?.order;

  // /admin/orders/:id?print=1 (from the orders list) opens the print dialog once everything has loaded.
  const autoPrint = params.get('print') === '1' && order && !settings.isLoading;
  useEffect(() => {
    if (!autoPrint) return undefined;
    const t = setTimeout(() => {
      window.print();
      setParams({}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [autoPrint, setParams]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin'] });
  };
  const payment = useMutation({
    mutationFn: (s) => adminApi.orderPayment(order._id, s),
    onSuccess: () => {
      toast.success('Payment status updated');
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveOrder(order._id),
    onSuccess: (res) => {
      toast.success(res.message || 'Order approved! Tax Invoice dispatched to customer email & WhatsApp.');
      refresh();
      if (res.whatsappLink) {
        window.open(res.whatsappLink, '_blank');
      }
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <PageLoader />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const o = order;
  const a = o.shippingAddress;
  const final = ['Cancelled', 'Returned'].includes(o.orderStatus);

  const customerPhoneRaw = (a?.phone || o.phone || '').replace(/[^\d]/g, '');
  const customerWaNumber = customerPhoneRaw.length === 10 ? `91${customerPhoneRaw}` : customerPhoneRaw;
  const quickWaText = `✅ *ORDER APPROVED & VERIFIED - WILDTANE*

Dear *${o.customerName}*,
Your order *#${o.orderId}* has been verified and approved by WILDTANE admin.

*TAX INVOICE DETAILS:*
• Order ID: *${o.orderId}*
• Registered Office: Paharganj , New Delhi , 110055
• Grand Total: ${formatINR(o.grandTotal)}
• Payment: ${PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod} (${o.paymentStatus})

📄 *View Live Digital Tax Invoice:*
${window.location.origin}/account/orders/${o.orderId}

A formal Tax Invoice with company logo has also been dispatched to your email (${o.email}).
Need help? Contact info@wildtane.com / 8920550465.
Thank you for choosing WILDTANE!`;
  const customerWaLink = customerWaNumber ? `https://wa.me/${customerWaNumber}?text=${encodeURIComponent(quickWaText)}` : null;

  return (
    <>
    <Invoice order={o} settings={settings.data} />
    <div className="flex flex-col gap-space-md print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/orders" className="btn-icon" aria-label="Back to orders"><Icon name="arrow_back" /></Link>
          <div>
            <h1 className="text-headline-lg flex items-center gap-3 flex-wrap">{o.orderId} <StatusBadge status={o.orderStatus} /></h1>
            <p className="text-body-sm text-on-surface-variant">Placed {formatDateTime(o.createdAt)} · updated {timeAgo(o.updatedAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {o.orderStatus === 'Pending' && (
            <Button
              variant="filled"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              icon="verified"
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              Approve &amp; Send Invoice
            </Button>
          )}
          {customerWaLink && (
            <a
              href={customerWaLink}
              target="_blank"
              rel="noreferrer"
              className="btn-tonal flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold"
            >
              <Icon name="chat" className="text-[18px]" /> WhatsApp Customer
            </a>
          )}
          <Button icon="print" onClick={() => window.print()}>Print bill</Button>
        </div>
      </div>

      {o.orderStatus === 'Pending' ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Icon name="pending_actions" className="text-[22px]" />
            </span>
            <div>
              <h3 className="font-bold text-label-lg text-on-surface">Order Awaiting Admin Approval</h3>
              <p className="text-body-sm text-on-surface-variant">
                Verify items, pricing and address. When ready, click below to approve and dispatch the official Tax Invoice with company logo to <b>{o.email}</b> and WhatsApp <b>{o.phone}</b>.
              </p>
            </div>
          </div>
          <Button
            variant="filled"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-md"
            icon="verified"
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate()}
          >
            Approve Order &amp; Dispatch Invoice
          </Button>
        </div>
      ) : (
        <div className="p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-body-sm">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
            <Icon name="verified" className="text-[18px]" />
            <span>Admin Approved · Official Tax Invoice dispatched to email &amp; WhatsApp {o.approvedAt ? `(${formatDateTime(o.approvedAt)})` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="tonal"
              icon="send"
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              Re-send Tax Invoice
            </Button>
            {customerWaLink && (
              <a
                href={customerWaLink}
                target="_blank"
                rel="noreferrer"
                className="btn-tonal btn-sm text-emerald-700 dark:text-emerald-300"
              >
                <Icon name="chat" className="text-[16px]" /> Open WhatsApp Chat
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md items-start">
        <div className="xl:col-span-2 flex flex-col gap-space-md">
          <Panel title={`Items (${o.items.reduce((n, i) => n + i.quantity, 0)})`}>
            <div className="flex flex-col divide-y divide-surface-container-high">
              {o.items.map((it) => (
                <div key={`${it.productId}-${it.variant?.id}`} className="flex items-center gap-3 py-3">
                  <Img src={it.image} alt="" className="w-14 h-14 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/admin/products/${it.productId}`} className="text-label-lg hover:text-secondary">{it.productName}</Link>
                    <p className="text-label-sm font-normal text-outline flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: it.variant?.colorHex }} /> {it.variant?.name} · SKU {it.SKU}
                    </p>
                  </div>
                  <span className="text-body-sm text-on-surface-variant whitespace-nowrap">{it.quantity} × {formatINR(it.unitPrice)}</span>
                  <span className="text-label-lg w-24 text-right">{formatINR(it.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="mt-space-md ml-auto w-full sm:w-72 flex flex-col gap-1 text-body-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">Subtotal</span><span>{formatINR(o.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Discount {o.coupon?.code && `(${o.coupon.code})`}</span><span>−{formatINR(o.discount)}</span></div>
              {o.coinDiscount > 0 && <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>Coins used ({o.coinsRedeemed})</span><span>−{formatINR(o.coinDiscount)}</span></div>}
              <div className="flex justify-between"><span className="text-on-surface-variant">Shipping · {o.shippingMethod?.label}</span><span>{formatINR(o.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Tax</span><span>{formatINR(o.tax)}</span></div>
              <div className="flex justify-between text-headline-sm pt-1 border-t border-surface-container-high mt-1"><span>Grand total</span><span>{formatINR(o.grandTotal)}</span></div>
              {o.coinsEarned > 0 && <p className="text-[12px] text-on-surface-variant">Customer earned {o.coinsEarned} coins{['Cancelled', 'Returned'].includes(o.orderStatus) ? ' (removed after cancellation/return)' : ''}</p>}
            </div>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Panel title="Customer">
              <div className="flex flex-col gap-1 text-body-sm">
                <p className="text-label-lg">{o.customerName}</p>
                <a href={`mailto:${o.email}`} className="text-secondary hover:underline">{o.email}</a>
                <a href={`tel:${o.phone.replace(/\s/g, '')}`} className="hover:text-secondary">{o.phone}</a>
                <p className="text-on-surface-variant">Country: {countryName(o.country)}</p>
                <p className="text-on-surface-variant">Nationality: {countryName(o.nationality)}</p>
                {o.user?._id && <Link to={`/admin/customers/${o.user._id}`} className="text-label-md text-secondary hover:underline mt-1 print:hidden">View customer profile →</Link>}
              </div>
            </Panel>
            <Panel title="Delivery address">
              <div className="flex flex-col gap-0.5 text-body-sm text-on-surface-variant">
                <p className="text-label-lg text-on-surface">{a.fullName}</p>
                <p>{a.addressLine1}</p>
                {a.addressLine2 && <p>{a.addressLine2}</p>}
                {a.landmark && <p>Landmark: {a.landmark}</p>}
                <p>{a.city}, {a.state} {a.postalCode}</p>
                <p>{countryName(a.country)}</p>
                <p className="mt-1">{a.phone}</p>
              </div>
            </Panel>
          </div>
          {o.customerNote && <Panel title="Customer note"><p className="text-body-sm whitespace-pre-line">{o.customerNote}</p></Panel>}
          <div className="print:hidden"><WhatsAppLog notifications={data.notifications} onResent={refetch} /></div>
        </div>

        <div className="flex flex-col gap-space-md xl:sticky xl:top-20 print:hidden">
          <Panel title="Update status">
            {final ? (
              <p className="text-body-sm text-on-surface-variant">This order is {o.orderStatus.toLowerCase()}. Inventory {o.inventoryRestored ? 'has been restored' : 'was not changed'}.</p>
            ) : (
              <StatusUpdater order={o} onSaved={refresh} />
            )}
          </Panel>
          <Panel title="Payment">
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between text-body-sm">
                <span>{PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}</span>
                <StatusBadge status={o.paymentStatus} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Pending', 'Paid', 'Failed', 'Refunded'].map((s) => (
                  <button key={s} type="button" disabled={s === o.paymentStatus || payment.isPending} onClick={() => payment.mutate(s)} className={cn('chip h-8', s === o.paymentStatus ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high')}>
                    {s}
                  </button>
                ))}
              </div>
              {o.paymentMethod === 'cod' && <p className="text-label-sm font-normal text-outline">COD orders are marked paid automatically when delivered.</p>}
            </div>
          </Panel>
          <Panel title="Timeline"><OrderTimeline order={o} /></Panel>
        </div>
      </div>
    </div>
    </>
  );
}
