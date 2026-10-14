import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useConfig, useMoney, useUser } from '../hooks/useStore';
import { cn, formatDate, formatDateTime } from '../lib/format';
import { EmptyState, ErrorState, Icon, Img, Skeleton, StatusBadge } from '../components/ui';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Seo from '../components/Seo';

const STEPS = ['Requested', 'Approved', 'Pickup Scheduled', 'In Inspection', 'Completed'];
const NEXT_STEP = {
  Requested: 'Your request is in process. Our team reviews it, usually within 1–2 working days.',
  Approved: 'Your request is approved. We will book a doorstep pickup and share the details here.',
  'Pickup Scheduled': 'A courier pickup is booked. Keep the item packed with its tags and accessories.',
  'In Inspection': 'We have received the item and are inspecting it.',
  Completed: 'This request is complete.',
  Rejected: 'This item cannot be returned or exchanged. Contact us if you have questions.',
  Cancelled: 'You cancelled this request.',
};
const REFUND_TEXT = { Pending: 'Refund in progress', Processed: 'Refund sent', Failed: 'Refund needs assistance' };

function SupportCard({ phone, email, subject }) {
  const digits = String(phone || '').replace(/\D/g, '');
  const wa = digits.length === 10 ? `91${digits}` : digits;
  return (
    <section className="card p-space-lg flex flex-col gap-3">
      <h2 className="text-headline-sm">Contact support</h2>
      <p className="text-body-sm text-on-surface-variant">Mention your request reference so we can help faster.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {phone && (
          <a href={`tel:${phone}`} className="btn-tonal h-11 gap-2"><Icon name="call" className="text-[18px]" /> Call {phone}</a>
        )}
        {email && (
          <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} className="btn-tonal h-11 gap-2"><Icon name="mail" className="text-[18px]" /> Email us</a>
        )}
        {wa && (
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(subject)}`} target="_blank" rel="noopener noreferrer" className="btn-tonal h-11 gap-2">
            <Icon name="chat" className="text-[18px]" /> WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}

/** /returns-exchange/help — pick one of your requests (or see that there are none). */
function RequestPicker({ config }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['returns', 'requests'], queryFn: api.myReturnRequests, select: (d) => d.requests });
  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data.length) {
    return (
      <div className="flex flex-col gap-space-lg">
        <EmptyState
          icon="assignment_return"
          title="You have no return or exchange requests"
          description="Delivered orders can be returned or exchanged within 7 days of delivery from the Returns & Exchange page."
          action={<Link to="/returns-exchange" className="btn-primary">Go to Returns & Exchange</Link>}
        />
        <SupportCard phone={config?.supportPhone} email={config?.supportEmail} subject="Help with a return or exchange" />
      </div>
    );
  }
  return (
    <div className="card divide-y divide-surface-container-high">
      {data.map((r) => (
        <Link key={r.requestId} to={`/returns-exchange/help/${r.requestId}`} className="flex items-center gap-3 p-space-md hover:bg-surface-container-low">
          <Icon name={r.type === 'exchange' ? 'published_with_changes' : 'assignment_return'} className="text-secondary" />
          <div className="flex-1 min-w-0">
            <p className="text-label-lg font-mono">{r.requestId}</p>
            <p className="text-label-sm font-normal text-outline truncate">Order {r.orderId} · {formatDate(r.requestedAt || r.createdAt)} · {r.items.map((i) => i.productName).join(', ')}</p>
          </div>
          <StatusBadge status={r.status} />
          <Icon name="chevron_right" className="text-outline" />
        </Link>
      ))}
    </div>
  );
}

export default function ReturnHelp() {
  const { requestId } = useParams();
  const user = useUser();
  const money = useMoney();
  const { data: config } = useConfig();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['returns', 'request', requestId],
    queryFn: () => api.myReturnRequest(requestId),
    enabled: Boolean(user && requestId),
    retry: (n, e) => e?.status !== 404 && n < 2,
  });
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.cancelReturnRequest(requestId),
    onSuccess: () => {
      toast.success('Request cancelled');
      qc.invalidateQueries({ queryKey: ['returns'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Returns & Exchange', to: '/returns-exchange' },
    { label: requestId ? `Help · ${requestId}` : 'Help' },
  ];
  const r = data?.request;
  const o = data?.order;
  const policy = data?.policy || {};
  const phone = policy.supportPhone || config?.supportPhone;
  const email = policy.supportEmail || config?.supportEmail;
  const stepIdx = r ? STEPS.indexOf(r.status) : -1;

  return (
    <div className="container-x max-w-4xl py-space-xl flex flex-col gap-space-lg">
      <Seo title="Help with your return or exchange" noindex />
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-col gap-1">
        <span className="eyebrow">Returns & Exchange</span>
        <h1 className="text-headline-xl-mobile md:text-headline-lg">Help with your request</h1>
      </div>

      {!requestId ? (
        <RequestPicker config={config} />
      ) : isLoading ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>
      ) : isError ? (
        error?.status === 404 ? (
          <div className="flex flex-col gap-space-lg">
            <EmptyState
              icon="search_off"
              title="We couldn’t find that request"
              description="It may belong to a different account, or the reference may be mistyped. Your own requests are listed on the help page."
              action={<Link to="/returns-exchange/help" className="btn-primary">See my requests</Link>}
            />
            <SupportCard phone={config?.supportPhone} email={config?.supportEmail} subject={`Help with request ${requestId}`} />
          </div>
        ) : (
          <>
            <ErrorState error={{ message: error?.message || 'This page could not load. Please try again.' }} onRetry={refetch} />
            <SupportCard phone={config?.supportPhone} email={config?.supportEmail} subject={`Help with request ${requestId}`} />
          </>
        )
      ) : (
        <>
          <section className="card p-space-lg flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-label-sm uppercase tracking-wider text-outline">{r.type === 'exchange' ? 'Exchange request' : 'Return request'}</p>
                <p className="text-headline-sm font-mono">{r.requestId}</p>
                <p className="text-body-sm text-on-surface-variant">
                  Order <Link to={`/account/orders/${r.orderId}`} className="underline">{r.orderId}</Link> · requested {formatDateTime(r.requestedAt || r.createdAt)}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>

            {!['Rejected', 'Cancelled'].includes(r.status) && (
              <ol className="grid grid-cols-5 gap-1" aria-label="Request progress">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex flex-col gap-1">
                    <span className={cn('h-1.5 rounded-full', i <= stepIdx ? 'bg-secondary' : 'bg-surface-container-high')} />
                    <span className={cn('text-[10.5px] leading-tight', i === stepIdx ? 'font-semibold text-on-surface' : 'text-outline')}>{s}</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-body-sm flex items-start gap-2"><Icon name="info" className="text-secondary text-[18px] shrink-0" /> {NEXT_STEP[r.status] || ''}</p>
            {(r.needsRefundDetails || r.canCancel) && (
              <div className="flex flex-wrap gap-2">
                {r.needsRefundDetails && (
                  <Link to={`/returns-exchange/refund/${encodeURIComponent(r.requestId)}`} className="btn-primary h-10 gap-1.5">
                    <Icon name="account_balance_wallet" className="text-[18px]" /> Choose how to get your money back
                  </Link>
                )}
                {r.canCancel && (
                  <button type="button" disabled={cancel.isPending} onClick={() => window.confirm(`Cancel ${r.type} request ${r.requestId}?`) && cancel.mutate()} className="btn-ghost h-10 gap-1.5 text-error hover:bg-error/10">
                    <Icon name="close" className="text-[18px]" /> Cancel request
                  </button>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-space-md text-body-sm">
              <div>
                <p className="text-label-sm uppercase tracking-wider text-outline mb-1">Reason</p>
                <p>{r.reason}</p>
                {r.detailedReason && <p className="text-on-surface-variant mt-1">{r.detailedReason}</p>}
              </div>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-outline mb-1">Doorstep pickup</p>
                {r.reversePickup?.shipmentId || r.reversePickup?.awb ? (
                  <p>
                    Booked{r.reversePickup.courier ? ` with ${r.reversePickup.courier}` : ''}
                    {r.reversePickup.awb ? ` · AWB ${r.reversePickup.awb}` : ''}
                    {r.reversePickup.status ? ` · ${r.reversePickup.status}` : ''}
                  </p>
                ) : (
                  <p className="text-on-surface-variant">Not booked yet. We arrange it after approval.</p>
                )}
                {r.pickupAddress?.addressLine1 && (
                  <p className="text-on-surface-variant mt-1">{r.pickupAddress.addressLine1}, {r.pickupAddress.city} {r.pickupAddress.postalCode}</p>
                )}
              </div>
              {r.type === 'return' && (
                <div>
                  <p className="text-label-sm uppercase tracking-wider text-outline mb-1">Refund</p>
                  <p>
                    {r.refund?.status && r.refund.status !== 'None'
                      ? `${REFUND_TEXT[r.refund.status] || r.refund.status} · ${money(r.refund.amount)} to ${r.refund.method || r.refundMethod}${r.refund.status === 'Processed' && r.refund.processedAt ? ` on ${formatDate(r.refund.processedAt)}` : ''}${r.refund.status === 'Processed' && r.refund.reference ? ` · Ref ${r.refund.reference}` : ''}`
                      : r.refundDetailsSubmittedAt
                        ? `To ${r.refundMethod} after inspection`
                        : r.status === 'Requested'
                          ? 'You’ll choose how to be refunded once the return is approved'
                          : 'Waiting for your refund details'}
                  </p>
                  {r.refundDetailsSubmittedAt && ['Approved', 'Pickup Scheduled', 'In Inspection'].includes(r.status) && (!r.refund?.status || r.refund.status === 'None') && (
                    <Link to={`/returns-exchange/refund/${encodeURIComponent(r.requestId)}`} className="text-secondary font-semibold hover:underline">Change refund details</Link>
                  )}
                </div>
              )}
              {r.type === 'exchange' && (r.exchangePreference?.desiredSizeOrColor || r.exchangePreference?.desiredItemName) && (
                <div>
                  <p className="text-label-sm uppercase tracking-wider text-outline mb-1">You asked for</p>
                  <p>{[r.exchangePreference.desiredItemName, r.exchangePreference.desiredSizeOrColor].filter(Boolean).join(' · ')}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {r.items.map((it) => (
                <div key={`${it.productId}-${it.variantId}`} className="flex items-center gap-3">
                  <Img src={it.image} alt="" className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg truncate">{it.productName}</p>
                    <p className="text-label-sm font-normal text-outline">{it.variantName ? `${it.variantName} · ` : ''}Qty {it.quantity}</p>
                  </div>
                  {it.totalPrice > 0 && <span className="text-label-lg">{money(it.totalPrice)}</span>}
                </div>
              ))}
            </div>

            {r.statusHistory?.length > 0 && (
              <details className="text-body-sm">
                <summary className="cursor-pointer text-secondary font-semibold">Request history</summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {[...r.statusHistory].reverse().map((h, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-outline shrink-0 w-36">{formatDateTime(h.at)}</span>
                      <span><b>{h.status}</b>{h.note ? ` — ${h.note}` : ''}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="card p-space-lg flex flex-col gap-2 text-body-sm">
            <h2 className="text-headline-sm">How returns and exchanges work</h2>
            <ul className="list-disc pl-5 text-on-surface-variant flex flex-col gap-1">
              <li>Requests can be raised within {policy.policyWindowDays || 7} days of delivery.</li>
              <li>Keep the item unused, with tags, packaging and any accessories, ready for pickup.</li>
              <li>Once approved, we book a doorstep pickup where available and show its details on this page.</li>
              <li>Refunds are issued after the returned item passes inspection, to the refund method you chose. See the <Link to="/return-policy" className="underline">Return, Refund & Exchange Policy</Link>.</li>
            </ul>
            {policy.workingHours && <p className="text-outline">Support hours: {policy.workingHours}</p>}
          </section>

          <SupportCard phone={phone} email={email} subject={`Help with ${r.type} request ${r.requestId} (order ${r.orderId})`} />
          {o && <p className="text-label-sm font-normal text-outline">Order placed {formatDate(o.createdAt)}{o.deliveredAt ? ` · delivered ${formatDate(o.deliveredAt)}` : ''}</p>}
        </>
      )}
    </div>
  );
}
