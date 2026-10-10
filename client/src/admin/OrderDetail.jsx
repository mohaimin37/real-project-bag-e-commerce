import { useEffect, useRef, useState } from 'react';
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
    <Panel title="Outbound Alerts & Invoice Logs">
      {notifications.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">No notification recorded for this order yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const cleanRecip = (n.recipient || '').replace(/[^\d]/g, '');
            const waTarget = cleanRecip.length === 10 ? `91${cleanRecip}` : cleanRecip;
            return (
              <div key={n._id} className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn('px-2 py-0.5 rounded-full text-label-sm uppercase font-semibold', tone[n.status])}>{n.status}</span>
                    <span className="text-label-sm font-semibold text-on-surface">
                      {n.type === 'customer_order_approval' ? '👤 Customer WhatsApp Invoice' : n.type === 'customer_invoice' ? '✉️ Customer Email Tax Invoice' : '🛡️ Admin New Order Alert'}
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
                      <a className="btn-tonal btn-sm text-emerald-700 dark:text-emerald-300 font-semibold" href={`https://wa.me/${waTarget || ''}?text=${encodeURIComponent(n.message)}`} target="_blank" rel="noreferrer">
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
      <Modal open={Boolean(view)} onClose={() => setView(null)} title={view?.channel === 'email' ? 'Tax Invoice Email Log' : 'WhatsApp Message Preview'} size="md">
        {view && (
          <div className="flex flex-col gap-space-md">
            {view.channel === 'email' ? (
              <div className="p-space-md rounded-xl bg-surface-container-low text-body-sm max-h-[60vh] overflow-y-auto">
                <p className="font-semibold text-on-surface mb-1">Official Tax Invoice &amp; Bill</p>
                <p className="text-[12px] text-outline mb-3">Recipient: <span className="font-mono text-on-surface">{view.recipient}</span></p>
                <div className="p-3 bg-surface rounded-lg border border-outline-variant/30 text-on-surface text-[13px] whitespace-pre-wrap">
                  {view.message}
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-body-sm p-space-md rounded-xl bg-[#e7fbe6] text-[#111b21] max-h-[60vh] overflow-y-auto">{view.message}</pre>
            )}
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

/** The order's Tax Invoice PDF (same file the customer receives), loaded while `enabled`. */
function useInvoicePdf(order, enabled) {
  const [pdf, setPdf] = useState({ url: '', file: null, loading: false, error: '' });
  const fileName = `WILDTANE_Tax_Invoice_${order.orderId}.pdf`;
  useEffect(() => {
    if (!enabled) return undefined;
    let url = '';
    let cancelled = false;
    setPdf((p) => ({ ...p, loading: true, error: '' }));
    adminApi
      .invoicePdf(order._id)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPdf({ url, file: new File([blob], fileName, { type: 'application/pdf' }), loading: false, error: '' });
      })
      .catch((e) => !cancelled && setPdf({ url: '', file: null, loading: false, error: e.message || 'Could not build the PDF' }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // A status or payment change alters the bill, so updatedAt reloads it.
  }, [order._id, order.updatedAt, enabled, fileName]);
  return { ...pdf, fileName };
}

export const waDigits = (phone) => {
  if (!phone) return '';
  if (typeof phone === 'object') {
    const code = String(phone.dialCode || '').replace(/\D/g, '') || '91';
    const num = String(phone.number || '').replace(/\D/g, '');
    if (!num) return '';
    return num.startsWith(code) ? num : `${code}${num}`;
  }
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  if (d.length === 10) return `91${d}`;
  return d;
};

/**
 * Hands the PDF to WhatsApp from this device when the WhatsApp Cloud API is not set up:
 * the share sheet on phones / supported browsers, otherwise download + open the customer's chat.
 */
async function sharePdfToWhatsApp({ file, url, fileName, caption, phone }) {
  const digits = waDigits(phone);
  if (!digits) {
    toast.error('No WhatsApp phone number found for this user');
    return;
  }
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption, title: fileName });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(caption || '')}`, '_blank', 'noopener');
  toast(`PDF downloaded. Opening WhatsApp for +${digits}…`, { icon: '📎', duration: 6000 });
}

const CHANNEL_TONE = {
  sent: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  logged: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  failed: 'bg-error-container text-on-error-container',
};

function DeliveryResult({ delivery, whatsappAutoSend, onShare }) {
  if (!delivery) return null;
  const { email, whatsapp } = delivery;
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface-container-low">
      {email && (
        <p className="flex items-center gap-2 text-body-sm flex-wrap">
          <Icon name="mail" className="text-[18px] text-sky-600" />
          <span className={cn('px-2 py-0.5 rounded-full text-label-sm font-semibold uppercase', CHANNEL_TONE[email.status])}>{email.status}</span>
          <span>
            {email.status === 'sent' && <>Email with PDF delivered to <b>{email.to}</b></>}
            {email.status === 'logged' && <>Email logged only (SMTP not set up) for <b>{email.to}</b></>}
            {email.status === 'failed' && <>Email to <b>{email.to}</b> failed: {email.error}</>}
          </span>
        </p>
      )}
      {whatsapp && (
        <div className="flex items-center gap-2 text-body-sm flex-wrap">
          <Icon name="chat" className="text-[18px] text-emerald-600" />
          {whatsapp.status === 'sent' ? (
            <>
              <span className={cn('px-2 py-0.5 rounded-full text-label-sm font-semibold uppercase', CHANNEL_TONE.sent)}>sent</span>
              <span>PDF delivered on WhatsApp to <b>{whatsapp.to}</b></span>
            </>
          ) : (
            <>
              <span className={cn('px-2 py-0.5 rounded-full text-label-sm font-semibold uppercase', CHANNEL_TONE[whatsapp.status === 'failed' ? 'failed' : 'logged'])}>
                {whatsapp.status === 'failed' ? 'failed' : 'action needed'}
              </span>
              <span className="flex-1 min-w-[12rem]">
                {whatsapp.status === 'failed' ? `WhatsApp failed: ${whatsapp.error}. ` : !whatsappAutoSend ? 'WhatsApp Business API is not set up. ' : ''}
                Send the PDF from this device:
              </span>
              <Button size="sm" variant="filled" className="bg-emerald-600 hover:bg-emerald-700 text-white" icon="share" onClick={onShare}>
                Share PDF to WhatsApp
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BillInvoiceDispatcher({ order: o, onDispatched, open, onOpenChange }) {
  const signinUserPhone = o.user?.phone?.number
    ? `${o.user.phone.dialCode || '+91'} ${o.user.phone.number}`
    : typeof o.user?.phone === 'string'
      ? o.user.phone
      : '';
  const defaultPhone = signinUserPhone || o.phone || o.shippingAddress?.phone || '';
  const defaultEmail = o.user?.email || o.email || '';

  const [targetEmail, setTargetEmail] = useState(defaultEmail);
  const [targetPhone, setTargetPhone] = useState(defaultPhone);
  const [tab, setTab] = useState('whatsapp');
  const [delivery, setDelivery] = useState(null);
  const frameRef = useRef(null);
  const pending = o.orderStatus === 'Pending';
  const closed = ['Cancelled', 'Returned'].includes(o.orderStatus);

  const pdf = useInvoicePdf(o, open);
  const preview = useQuery({
    queryKey: ['admin', 'invoice-preview', o._id, o.updatedAt],
    queryFn: () => adminApi.invoicePreview(o._id),
    enabled: open,
    staleTime: 60 * 1000,
  });
  const caption = preview.data?.waCaption || '';
  const autoSend = Boolean(preview.data?.whatsappAutoSend);

  useEffect(() => {
    if (open) {
      setDelivery(null);
      setTargetEmail(defaultEmail);
      setTargetPhone(defaultPhone);
    }
  }, [open, o._id, defaultEmail, defaultPhone]);

  const onSent = (res) => {
    toast.success(res.message || 'Tax Invoice PDF sent');
    setDelivery((d) => ({ ...d, ...res.delivery, email: res.delivery.email || d?.email, whatsapp: res.delivery.whatsapp || d?.whatsapp }));
    onDispatched?.();
  };
  const sendEmail = useMutation({
    mutationFn: () => adminApi.approveAndSendInvoice(o._id, { email: targetEmail, phone: false }),
    onSuccess: onSent,
    onError: (e) => toast.error(e.message),
  });

  const share = () => sharePdfToWhatsApp({ ...pdf, caption, phone: targetPhone || defaultPhone });
  const print = () => {
    try {
      frameRef.current.contentWindow.focus();
      frameRef.current.contentWindow.print();
    } catch {
      window.open(pdf.url, '_blank', 'noopener');
    }
  };
  const sizeKb = pdf.file ? Math.max(1, Math.round(pdf.file.size / 1024)) : 0;

  return (
    <Panel title="Tax Invoice (PDF)">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-lg bg-red-600 text-white font-black text-[11px] flex items-center justify-center tracking-wider shrink-0">PDF</span>
          <div>
            <p className="font-semibold text-on-surface break-all">WILDTANE_Tax_Invoice_{o.orderId}.pdf</p>
            <p className="text-body-sm text-on-surface-variant">
              {o.invoiceSentAt ? `Last sent ${formatDateTime(o.invoiceSentAt)}` : 'Not sent yet'} · goes to the customer&rsquo;s email (attachment) and WhatsApp (document)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="tonal" icon="visibility" onClick={() => onOpenChange(true)}>
            Preview bill
          </Button>
          {!closed && (
            <Button variant="filled" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" icon={pending ? 'verified' : 'send'} onClick={() => onOpenChange(true)}>
              {pending ? 'Approve & send PDF' : 'Re-send PDF'}
            </Button>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => onOpenChange(false)} title={`Tax Invoice · #${o.orderId}`} size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 px-space-lg pb-space-lg">
          {/* The actual PDF the customer receives */}
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-label-md text-on-surface-variant">This exact PDF is attached to the email and sent on WhatsApp.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="tonal" icon="print" disabled={!pdf.url} onClick={print}>Print</Button>
                <a className={cn('btn-tonal btn-sm', !pdf.url && 'pointer-events-none opacity-50')} href={pdf.url || undefined} download={pdf.fileName}>
                  <Icon name="download" className="text-[18px]" /> Download
                </a>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-outline-variant/40 bg-surface-container-high h-[46vh] lg:h-[68vh] flex items-center justify-center">
              {pdf.loading && <p className="text-body-sm text-on-surface-variant">Generating PDF…</p>}
              {pdf.error && <p className="text-body-sm text-error p-4 text-center">{pdf.error}</p>}
              {pdf.url && !pdf.loading && (
                <>
                  <iframe ref={frameRef} title={`Tax Invoice ${o.orderId}`} src={pdf.url} className="hidden sm:block w-full h-full bg-white" />
                  <a href={pdf.url} target="_blank" rel="noreferrer" className="sm:hidden btn-tonal">
                    <Icon name="picture_as_pdf" className="text-[18px]" /> Open PDF
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Recipients, message previews and send actions */}
          <div className="flex flex-col gap-3 min-w-0">
            <Field label="WhatsApp number">
              <Input value={targetPhone} onChange={(e) => setTargetPhone(e.target.value)} placeholder="10-digit mobile" className="font-mono" />
            </Field>
            <Field label="Email">
              <Input type="email" value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="customer@example.com" className="font-mono" />
            </Field>

            <div className="flex gap-1 p-1 rounded-xl bg-surface-container-high text-label-md font-semibold">
              {[['whatsapp', 'chat', 'WhatsApp'], ['email', 'mail', 'Email']].map(([key, icon, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg', tab === key ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant')}
                >
                  <Icon name={icon} className="text-[18px]" /> {text}
                </button>
              ))}
            </div>

            {tab === 'whatsapp' ? (
              <div className="rounded-xl p-3 bg-[#efeae2] dark:bg-[#0b141a]">
                <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b] p-1.5 shadow-sm">
                  <div className="flex items-center gap-2.5 rounded-md bg-black/5 dark:bg-black/20 p-2">
                    <span className="w-9 h-10 rounded bg-red-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">PDF</span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">{pdf.fileName}</p>
                      <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">{sizeKb ? `${sizeKb} kB · ` : ''}PDF</p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-snug text-[#111b21] dark:text-[#e9edef] px-1.5 pt-1.5 break-words">
                    {caption ? caption.replace(/\*/g, '') : '…'}
                  </p>
                </div>
                {!preview.isLoading && !autoSend && (
                  <p className="text-[12px] text-on-surface-variant mt-2">
                    WhatsApp Business API is not set up, so after sending you share this PDF from your own WhatsApp (one tap).
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-outline-variant/40 overflow-hidden">
                <div className="p-2.5 text-body-sm bg-surface-container-low">
                  <p className="font-semibold truncate">{preview.data?.email?.subject || '…'}</p>
                  <p className="text-[12px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <Icon name="attach_file" className="text-[14px]" /> {pdf.fileName}
                  </p>
                </div>
                <iframe title="Email preview" sandbox="" srcDoc={preview.data?.email?.html || ''} className="w-full h-64 bg-white" />
              </div>
            )}

            <DeliveryResult delivery={delivery} whatsappAutoSend={autoSend} onShare={share} />

            {!closed && (
              <div className="flex flex-col gap-2.5 pt-1">
                <Button
                  variant="filled"
                  className="bg-sky-700 hover:bg-sky-800 text-white font-bold w-full justify-center"
                  icon={pending ? 'verified' : 'mail'}
                  loading={sendEmail.isPending}
                  disabled={sendEmail.isPending || !targetEmail || !pdf.url}
                  onClick={() => sendEmail.mutate()}
                >
                  {pending ? 'Approve & send PDF to email' : 'Send PDF to email'}
                </Button>
                <Button
                  variant="filled"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full justify-center"
                  icon="chat"
                  disabled={!pdf.url}
                  onClick={share}
                >
                  Share PDF to WhatsApp
                </Button>
                {pending && <p className="text-[12px] text-on-surface-variant">Sending email also approves the order (Pending → Confirmed).</p>}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Panel>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => adminApi.order(id) });
  const order = data?.order;
  const [billPreviewOpen, setBillPreviewOpen] = useState(false);

  // /admin/orders/:id?print=1 (from the orders list) opens the Tax Invoice PDF preview.
  const autoPrint = params.get('print') === '1' && order;
  useEffect(() => {
    if (!autoPrint) return undefined;
    setBillPreviewOpen(true);
    setParams({}, { replace: true });
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

  if (isLoading) return <PageLoader />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  const o = order;
  const a = o.shippingAddress;
  const final = ['Cancelled', 'Returned'].includes(o.orderStatus);

  const signinUserPhone = o.user?.phone?.number
    ? `${o.user.phone.dialCode || '+91'} ${o.user.phone.number}`
    : typeof o.user?.phone === 'string'
      ? o.user.phone
      : '';
  const customerWaNumber = waDigits(signinUserPhone || o.phone || a?.phone);
  const customerWaLink = customerWaNumber ? `https://wa.me/${customerWaNumber}` : null;

  return (
    <>
    <div className="flex flex-col gap-space-md">
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
              onClick={() => setBillPreviewOpen(true)}
            >
              Approve &amp; send PDF
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
          <Button
            icon="receipt_long"
            variant="tonal"
            className="font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
            onClick={() => setBillPreviewOpen(true)}
          >
            Print bill
          </Button>
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
                Check the items, prices and address, then preview the Tax Invoice PDF and send it to <b>{o.email}</b> and WhatsApp <b>{a?.phone || o.phone}</b>.
              </p>
            </div>
          </div>
          <Button
            variant="filled"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-md"
            icon="verified"
            onClick={() => setBillPreviewOpen(true)}
          >
            Preview &amp; approve
          </Button>
        </div>
      ) : (
        <div className="p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-body-sm">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
            <Icon name="verified" className="text-[18px]" />
            <span>
              {o.approvedAt ? `Approved ${formatDateTime(o.approvedAt)}` : 'Approved'}
              {o.invoiceSentAt ? ` · Tax Invoice PDF sent ${formatDateTime(o.invoiceSentAt)}` : ' · Tax Invoice PDF not sent yet'}
            </span>
          </div>
          {!final && (
            <Button size="sm" variant="tonal" icon="send" onClick={() => setBillPreviewOpen(true)}>
              Re-send PDF
            </Button>
          )}
        </div>
      )}

      {/* Tax Invoice PDF: preview, print and send to WhatsApp + email */}
      <BillInvoiceDispatcher order={o} onDispatched={refresh} open={billPreviewOpen} onOpenChange={setBillPreviewOpen} />

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
