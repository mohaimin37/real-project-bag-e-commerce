import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminApi } from '../lib/api';
import { formatDateTime, formatINR, imgUrl } from '../lib/format';
import { Button, Field, Icon, Input, Modal, Toggle } from '../components/ui';
import { PayoutDetails } from './Payments';

export const REFUND_METHODS = [
  ['Original Payment Method', 'Original payment (card / UPI / net banking used to pay)'],
  ['UPI', 'UPI ID'],
  ['Bank Transfer', 'Bank account (NEFT / IMPS)'],
  ['Store Coins Wallet', 'WILDTANE Wallet (instant)'],
];
const REASONS = [
  'Manufacturing defect or flaw',
  'Damaged product upon delivery',
  'Wrong product or incorrect size delivered',
  'Significant deviation from website description',
  'Fit or comfort not as expected',
  'Changed mind or style preference',
];

/** Refund method + UPI / bank fields. Shared by the create form and the edit box. */
export function RefundDestinationFields({ value, onChange, allowAsk }) {
  const d = value.refundDetails || {};
  const setD = (patch) => onChange({ ...value, refundDetails: { ...d, ...patch } });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Refund to" hint={allowAsk && !value.refundMethod ? 'After you approve, the customer picks UPI / bank / wallet on their refund page' : undefined}>
        <select className="input h-10" value={value.refundMethod} onChange={(e) => onChange({ refundMethod: e.target.value, refundDetails: {} })}>
          {allowAsk && <option value="">Ask the customer (refund page)</option>}
          {REFUND_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      {value.refundMethod === 'UPI' && (
        <Field label="UPI ID" required><Input value={d.upiId || ''} onChange={(e) => setD({ upiId: e.target.value })} placeholder="name@okhdfcbank" /></Field>
      )}
      {value.refundMethod === 'Bank Transfer' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Account holder name" required><Input value={d.accountHolder || ''} onChange={(e) => setD({ accountHolder: e.target.value })} /></Field>
          <Field label="Account number" required><Input inputMode="numeric" value={d.accountNumber || ''} onChange={(e) => setD({ accountNumber: e.target.value.replace(/[^\d]/g, '') })} /></Field>
          <Field label="IFSC" required><Input value={d.ifsc || ''} onChange={(e) => setD({ ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" maxLength={11} /></Field>
          <Field label="Bank name"><Input value={d.bankName || ''} onChange={(e) => setD({ bankName: e.target.value })} /></Field>
        </div>
      )}
    </div>
  );
}

/** Where the money goes back, with copy buttons, and an Edit form (e.g. details given on a call). */
export function RefundDestinationBox({ request, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ refundMethod: request.refundMethod || 'Original Payment Method', refundDetails: request.refundDetails || {} });
  const save = useMutation({
    mutationFn: () => adminApi.updateRefundDestination(request._id, v),
    onSuccess: (d) => { toast.success('Refund details saved'); setEditing(false); onUpdated(d.request); },
    onError: (e) => toast.error(e.message),
  });
  const locked = request.refund?.status === 'Processed' || !!request.refund?.providerRefundId;
  return (
    <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-label-lg font-bold flex items-center gap-1.5"><Icon name="account_balance_wallet" className="text-[20px] text-secondary" /> {request.type === 'exchange' ? 'Refund details (if the exchange isn’t possible)' : 'Where to send the refund'}</h4>
        {!locked && !editing && <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}><Icon name="edit" className="text-[16px]" /> Edit</button>}
      </div>
      {request.type === 'return' && !request.refundDetailsSubmittedAt && !editing && (
        <p className="text-body-sm px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant flex items-start gap-2">
          <Icon name="hourglass_top" className="text-[18px] shrink-0" />
          {request.status === 'Requested'
            ? 'After you approve, the customer is asked how they want their money back.'
            : ['Approved', 'Pickup Scheduled', 'In Inspection'].includes(request.status)
              ? 'Waiting for the customer to choose on their refund page. If they tell you by phone, press Edit and fill it in.'
              : 'The customer didn’t choose a refund method.'}
        </p>
      )}
      {editing ? (
        <div className="flex flex-col gap-3">
          <RefundDestinationFields value={v} onChange={setV} />
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
          </div>
        </div>
      ) : (request.refundDetailsSubmittedAt || request.type === 'exchange' || request.refundMethod !== 'Original Payment Method') ? (
        <PayoutDetails method={request.refundMethod} details={request.refundDetails} />
      ) : null}
    </div>
  );
}

/** Create a return or exchange for a customer (e.g. asked on a call or by email). */
export function CreateReturnModal({ open, onClose, onCreated }) {
  const qc = useQueryClient();
  const [orderId, setOrderId] = useState('');
  const [found, setFound] = useState(null);
  const [form, setForm] = useState({ type: 'return', reason: REASONS[0], detailedReason: '', qty: {}, refundMethod: '', refundDetails: {}, exchangeNote: '', override: false, overrideReason: '', adminNote: '' });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const reset = () => { setOrderId(''); setFound(null); setForm((f) => ({ ...f, qty: {}, detailedReason: '', exchangeNote: '', override: false, overrideReason: '', adminNote: '' })); };

  const lookup = useMutation({ mutationFn: () => adminApi.returnOrderLookup(orderId.trim()), onSuccess: (d) => { setFound(d); set({ qty: {} }); }, onError: (e) => { setFound(null); toast.error(e.message); } });
  const create = useMutation({
    mutationFn: () => {
      const items = (found.order.items || [])
        .map((it, i) => ({ productId: it.productId, variantId: it.variant?.id, productName: it.productName, quantity: Number(form.qty[i] || 0) }))
        .filter((it) => it.quantity > 0);
      if (!items.length) throw new Error('Choose at least one item and a quantity.');
      return adminApi.createReturn({
        orderId: found.order.orderId,
        type: form.type,
        reason: form.reason,
        detailedReason: form.detailedReason,
        items,
        exchangePreference: form.type === 'exchange' ? { exchangeType: 'variant', desiredSizeOrColor: form.exchangeNote, notes: form.exchangeNote } : undefined,
        refundMethod: form.refundMethod || undefined,
        refundDetails: form.refundMethod ? form.refundDetails : undefined,
        overrideWindow: form.override,
        overrideReason: form.overrideReason,
        adminNote: form.adminNote,
      });
    },
    onSuccess: (d) => {
      toast.success(`Request ${d.returnRequest?.requestId || ''} created`);
      qc.invalidateQueries({ queryKey: ['admin', 'returns'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      reset();
      onCreated?.();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const o = found?.order;
  const el = found?.eligibility || {};
  const delivered = o?.orderStatus === 'Delivered';
  const canCreate = o && delivered && (!el.isExpired || (form.override && form.overrideReason.trim().length > 2));

  return (
    <Modal open={open} onClose={onClose} title="Create a return or exchange" size="lg">
      <div className="flex flex-col gap-4">
        <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); if (orderId.trim()) lookup.mutate(); }}>
          <Field label="Order ID" className="flex-1"><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="WT26-000123" autoFocus /></Field>
          <Button type="submit" variant="tonal" loading={lookup.isPending} icon="search">Find order</Button>
        </form>

        {o && (
          <>
            <div className="p-3 rounded-xl bg-surface-container-low text-body-sm flex flex-wrap gap-x-4 gap-y-1">
              <b>{o.customerName}</b><span>{o.phone}</span><span>{o.email}</span>
              <span>Status: <b>{o.orderStatus}</b></span>
              {o.deliveredAt && <span>Delivered {formatDateTime(o.deliveredAt)}</span>}
              <span>{formatINR(o.grandTotal)} · {o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online'}</span>
            </div>
            {!delivered && <p className="text-body-sm text-error">Returns and exchanges can only be created for delivered orders.</p>}
            {delivered && el.isExpired && (
              <div className="p-3 rounded-xl border border-error/40 bg-error-container/30 flex flex-col gap-2">
                <p className="text-body-sm">The 7-day return window for this order has ended.</p>
                <Toggle checked={form.override} onChange={(v) => set({ override: v })} label="Make an exception" />
                {form.override && <Input value={form.overrideReason} onChange={(e) => set({ overrideReason: e.target.value })} placeholder="Why (kept in the request history)" />}
              </div>
            )}

            <div className="flex gap-2">
              {['return', 'exchange'].map((t) => (
                <button key={t} type="button" onClick={() => set({ type: t })} className={form.type === t ? 'btn-primary h-10 capitalize' : 'btn-tonal h-10 capitalize'}>{t}</button>
              ))}
            </div>

            <div className="border border-surface-container-high rounded-xl divide-y divide-surface-container-high">
              {o.items.map((it, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  {it.image && <img src={imgUrl(it.image, 96)} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold truncate">{it.productName}</p>
                    <p className="text-[12px] text-outline">{it.variant?.name || ''} · bought {it.quantity} × {formatINR(it.unitPrice)}</p>
                  </div>
                  <select className="input h-9 w-20" value={form.qty[i] || 0} onChange={(e) => set({ qty: { ...form.qty, [i]: e.target.value } })} aria-label={`Quantity of ${it.productName}`}>
                    {Array.from({ length: it.quantity + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Reason"><select className="input h-10" value={form.reason} onChange={(e) => set({ reason: e.target.value })}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
              {form.type === 'exchange' && <Field label="Exchange for (size / colour / item)"><Input value={form.exchangeNote} onChange={(e) => set({ exchangeNote: e.target.value })} /></Field>}
            </div>
            <Field label="Customer’s words (shown in the request)"><Input value={form.detailedReason} onChange={(e) => set({ detailedReason: e.target.value })} /></Field>
            <RefundDestinationFields allowAsk value={{ refundMethod: form.refundMethod, refundDetails: form.refundDetails }} onChange={(v) => set(v)} />
            <Field label="Internal note (private)"><Input value={form.adminNote} onChange={(e) => set({ adminNote: e.target.value })} placeholder="e.g. Customer called on 12 Oct" /></Field>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <Button disabled={!canCreate} loading={create.isPending} onClick={() => create.mutate()} icon="add">Create {form.type}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
